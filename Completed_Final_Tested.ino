/*
 * ============================================
 * PLANTRIX ESP32 - BLE SENSOR BROADCASTER
 * ============================================
 * This firmware converts the ESP32 into a BLE Peripheral
 * that broadcasts plant sensor data to connected devices.
 * 
 * Architecture: ESP32 (BLE Server) --> Website (BLE Client)
 * No WiFi required on ESP32 - Website handles internet/AI
 * ============================================
 */

#include <BLEDevice.h>
#include <BLEServer.h>
#include <BLEUtils.h>
#include <BLE2902.h>
#include <Wire.h>
#include <DHT.h>

// ============================================
// BLE CONFIGURATION
// ============================================
#define SERVICE_UUID        "4fafc201-1fb5-459e-8fcc-c5c9c331914b"
#define CHARACTERISTIC_UUID "beb5483e-36e1-4688-b7f5-ea07361b26a8"
#define DEVICE_NAME         "Plantrix_ESP32"

// ============================================
// SENSOR PINS
// ============================================
#define DHTPIN 13
#define DHTTYPE DHT22
#define SOIL_PIN 35
#define TSL2561_ADDR 0x39

// LED Pins for status indication
#define RED_LED_PIN 2
#define BLUE_LED_PIN 15
#define GREEN_LED_PIN 5

// ============================================
// TIMING CONFIGURATION
// ============================================
#define SENSOR_READ_INTERVAL 2000  // Read sensors every 2 seconds
#define NOTIFY_INTERVAL 2000       // Send BLE notification every 2 seconds

// ============================================
// GLOBAL OBJECTS
// ============================================
DHT dht(DHTPIN, DHTTYPE);

BLEServer* pServer = NULL;
BLECharacteristic* pCharacteristic = NULL;
BLEDescriptor* pDescriptor = NULL;

bool deviceConnected = false;
bool oldDeviceConnected = false;
unsigned long lastSensorRead = 0;
unsigned long lastNotify = 0;

// Current sensor values
int soilValue = 0;
float humidity = 0;
float temperature = 0;
float lux = 0;
String currentStatus = "GREEN";

// ============================================
// BLE SERVER CALLBACKS
// ============================================
class MyServerCallbacks : public BLEServerCallbacks {
  void onConnect(BLEServer* pServer) {
    deviceConnected = true;
    Serial.println("📱 Client connected!");
    // Flash blue LED to indicate connection
    digitalWrite(BLUE_LED_PIN, HIGH);
    delay(200);
    digitalWrite(BLUE_LED_PIN, LOW);
  }

  void onDisconnect(BLEServer* pServer) {
    deviceConnected = false;
    Serial.println("📱 Client disconnected!");
    // Flash red LED to indicate disconnection
    digitalWrite(RED_LED_PIN, HIGH);
    delay(200);
    digitalWrite(RED_LED_PIN, LOW);
  }
};

// ============================================
// LED CONTROL
// ============================================
void setLEDs(bool red, bool blue, bool green) {
  digitalWrite(RED_LED_PIN, red ? HIGH : LOW);
  digitalWrite(BLUE_LED_PIN, blue ? HIGH : LOW);
  digitalWrite(GREEN_LED_PIN, green ? HIGH : LOW);
}

void blinkLED(int pin, int times, int delayMs) {
  for (int i = 0; i < times; i++) {
    digitalWrite(pin, HIGH);
    delay(delayMs);
    digitalWrite(pin, LOW);
    delay(delayMs);
  }
}

// ============================================
// TSL2561 LIGHT SENSOR FUNCTIONS
// ============================================
void tsl2561_init() {
  Wire.begin(21, 22);
  delay(100);
  
  // Power on the sensor
  Wire.beginTransmission(TSL2561_ADDR);
  Wire.write(0x80 | 0x00);  // Command register
  Wire.write(0x03);          // Power ON
  Wire.endTransmission();
  delay(100);
  
  // Set timing register (101ms integration, 1x gain)
  Wire.beginTransmission(TSL2561_ADDR);
  Wire.write(0x80 | 0x01);  // Timing register
  Wire.write(0x12);          // 101ms, 1x gain
  Wire.endTransmission();
  delay(500);
}

uint16_t readChannel(uint8_t reg) {
  Wire.beginTransmission(TSL2561_ADDR);
  Wire.write(0x80 | reg);
  Wire.endTransmission();
  
  Wire.requestFrom(TSL2561_ADDR, 2);
  if (Wire.available() >= 2) {
    uint16_t data = Wire.read();
    data |= (Wire.read() << 8);
    return data;
  }
  return 0;
}

bool testTSLConnection() {
  Wire.beginTransmission(TSL2561_ADDR);
  Wire.write(0x80 | 0x0A);  // ID register
  Wire.endTransmission();
  
  Wire.requestFrom(TSL2561_ADDR, 1);
  if (Wire.available()) {
    uint8_t id = Wire.read();
    Serial.printf("💡 TSL2561 ID: 0x%02X\n", id);
    return (id == 0x50 || id == 0x39 || id == 0x49);
  }
  return false;
}

float calculateLux(uint16_t ch0, uint16_t ch1) {
  if (ch0 == 0) return 0;
  
  float ratio = (ch1 == 0) ? 0 : ((float)ch1 / (float)ch0);
  float luxValue = 0;
  
  if (ratio <= 0.50) {
    luxValue = 0.0304 * ch0 - 0.062 * ch0 * pow(ratio, 1.4);
  } else if (ratio <= 0.61) {
    luxValue = 0.0224 * ch0 - 0.031 * ch1;
  } else if (ratio <= 0.80) {
    luxValue = 0.0128 * ch0 - 0.0153 * ch1;
  } else if (ratio <= 1.30) {
    luxValue = 0.00146 * ch0 - 0.00112 * ch1;
  } else {
    luxValue = 0;
  }
  
  return luxValue < 0 ? 0 : luxValue;
}

// ============================================
// SENSOR READING FUNCTION
// ============================================
void readSensors() {
  // Read soil moisture (analog)
  soilValue = analogRead(SOIL_PIN);
  
  // Read DHT22
  float h = dht.readHumidity();
  float t = dht.readTemperature();
  
  // Validate DHT readings
  if (!isnan(h)) humidity = h;
  if (!isnan(t)) temperature = t;
  
  // Read TSL2561 light sensor
  uint16_t ch0 = readChannel(0x0C);  // Visible + IR
  uint16_t ch1 = readChannel(0x0E);  // IR only
  lux = calculateLux(ch0, ch1);
  
  // Determine plant status
  int criticalCount = 0;
  int warningCount = 0;
  
  // Soil evaluation
  if (soilValue < 850) warningCount++;       // Too wet
  else if (soilValue > 2600) criticalCount++; // Too dry
  
  // Humidity evaluation
  if (humidity == 0) criticalCount++;
  else if (humidity > 85) warningCount++;
  else if (humidity < 50) criticalCount++;
  
  // Temperature evaluation
  if (temperature == 0) criticalCount++;
  else if (temperature > 36) criticalCount++;
  else if (temperature < 16) criticalCount++;
  
  // Light evaluation
  if (lux > 1200) warningCount++;
  else if (lux < 60) criticalCount++;
  
  // Calculate overall status
  int goodParams = 4 - criticalCount - warningCount;
  
  if (criticalCount >= 3 || (criticalCount >= 2 && warningCount >= 1)) {
    currentStatus = "RED";
    setLEDs(true, false, false);
  } else if (goodParams >= 3) {
    currentStatus = "GREEN";
    setLEDs(false, false, true);
  } else {
    currentStatus = "BLUE";
    setLEDs(false, true, false);
  }
}

// ============================================
// BUILD JSON PAYLOAD
// ============================================
String buildSensorJSON() {
  // Keep JSON compact for BLE transmission (max ~512 bytes recommended)
  String json = "{";
  json += "\"soil\":" + String(soilValue) + ",";
  json += "\"temp\":" + String(temperature, 1) + ",";
  json += "\"hum\":" + String(humidity, 1) + ",";
  json += "\"lux\":" + String(lux, 0) + ",";
  json += "\"status\":\"" + currentStatus + "\",";
  json += "\"ts\":" + String(millis() / 1000);
  json += "}";
  return json;
}

// ============================================
// SEND BLE NOTIFICATION
// ============================================
void sendBLENotification() {
  if (deviceConnected && pCharacteristic != NULL) {
    String jsonData = buildSensorJSON();
    
    // Set characteristic value
    pCharacteristic->setValue(jsonData.c_str());
    
    // Send notification
    pCharacteristic->notify();
    
    Serial.println("📤 BLE Notification sent: " + jsonData);
  }
}

// ============================================
// INITIALIZE BLE
// ============================================
void initBLE() {
  Serial.println("🔵 Initializing BLE...");
  
  // Create BLE Device
  BLEDevice::init(DEVICE_NAME);
  
  // Create BLE Server
  pServer = BLEDevice::createServer();
  pServer->setCallbacks(new MyServerCallbacks());
  
  // Create BLE Service
  BLEService* pService = pServer->createService(SERVICE_UUID);
  
  // Create BLE Characteristic with READ and NOTIFY properties
  pCharacteristic = pService->createCharacteristic(
    CHARACTERISTIC_UUID,
    BLECharacteristic::PROPERTY_READ |
    BLECharacteristic::PROPERTY_NOTIFY
  );
  
  // Create BLE Descriptor (0x2902 for Client Characteristic Configuration)
  pDescriptor = new BLE2902();
  pCharacteristic->addDescriptor(pDescriptor);
  
  // Set initial value
  pCharacteristic->setValue("Waiting for data...");
  
  // Start the service
  pService->start();
  
  // Start advertising
  BLEAdvertising* pAdvertising = BLEDevice::getAdvertising();
  pAdvertising->addServiceUUID(SERVICE_UUID);
  pAdvertising->setScanResponse(true);
  pAdvertising->setMinPreferred(0x06);  // For iPhone compatibility
  pAdvertising->setMinPreferred(0x12);
  BLEDevice::startAdvertising();
  
  Serial.println("✅ BLE Server started!");
  Serial.println("📡 Device name: " + String(DEVICE_NAME));
  Serial.println("🔗 Service UUID: " + String(SERVICE_UUID));
  Serial.println("📝 Characteristic UUID: " + String(CHARACTERISTIC_UUID));
  Serial.println("⏳ Waiting for client connection...");
  
  // Flash green LED to indicate ready
  blinkLED(GREEN_LED_PIN, 3, 200);
}

// ============================================
// SETUP
// ============================================
void setup() {
  Serial.begin(115200);
  delay(1000);
  
  Serial.println("\n");
  Serial.println("╔══════════════════════════════════════════╗");
  Serial.println("║     🌱 PLANTRIX BLE SENSOR v2.0 🌱       ║");
  Serial.println("║     Bluetooth Low Energy Edition         ║");
  Serial.println("╚══════════════════════════════════════════╝");
  Serial.println();
  
  // Initialize LED pins
  pinMode(RED_LED_PIN, OUTPUT);
  pinMode(BLUE_LED_PIN, OUTPUT);
  pinMode(GREEN_LED_PIN, OUTPUT);
  
  // All LEDs off initially
  setLEDs(false, false, false);
  
  // Initialize DHT sensor
  dht.begin();
  Serial.println("✅ DHT22 sensor initialized");
  
  // Initialize TSL2561 light sensor
  tsl2561_init();
  if (testTSLConnection()) {
    Serial.println("✅ TSL2561 light sensor connected");
  } else {
    Serial.println("⚠️ TSL2561 not detected - check wiring!");
    Serial.println("   Expected: SDA=GPIO21, SCL=GPIO22, VCC=3.3V");
  }
  
  // Initialize soil moisture pin
  pinMode(SOIL_PIN, INPUT);
  Serial.println("✅ Soil moisture sensor initialized");
  
  // Initialize BLE
  initBLE();
  
  Serial.println("\n🚀 System ready! Broadcasting sensor data via BLE...\n");
}

// ============================================
// MAIN LOOP
// ============================================
void loop() {
  unsigned long currentMillis = millis();
  
  // Read sensors at defined interval
  if (currentMillis - lastSensorRead >= SENSOR_READ_INTERVAL) {
    lastSensorRead = currentMillis;
    readSensors();
    
    // Print to Serial for debugging
    Serial.println("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    Serial.printf("💧 Soil: %d | ", soilValue);
    Serial.printf("🌡️ Temp: %.1f°C | ", temperature);
    Serial.printf("💨 Hum: %.1f%% | ", humidity);
    Serial.printf("☀️ Lux: %.0f\n", lux);
    Serial.printf("🚦 Status: %s | ", currentStatus.c_str());
    Serial.printf("📱 Connected: %s\n", deviceConnected ? "YES" : "NO");
  }
  
  // Send BLE notification at defined interval
  if (currentMillis - lastNotify >= NOTIFY_INTERVAL) {
    lastNotify = currentMillis;
    
    if (deviceConnected) {
      sendBLENotification();
    }
  }
  
  // Handle reconnection
  // If client disconnected, restart advertising
  if (!deviceConnected && oldDeviceConnected) {
    delay(500);  // Give BLE stack time to be ready
    pServer->startAdvertising();
    Serial.println("📡 Restarting BLE advertising...");
    oldDeviceConnected = deviceConnected;
  }
  
  // If client connected
  if (deviceConnected && !oldDeviceConnected) {
    oldDeviceConnected = deviceConnected;
    Serial.println("🎉 New client connected - starting data stream!");
  }
  
  // Small delay to prevent watchdog issues
  delay(10);
}