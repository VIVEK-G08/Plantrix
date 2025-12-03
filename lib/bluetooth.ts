"use client"

// Bluetooth Service Configuration
export const BLE_CONFIG = {
  SERVICE_UUID: "4fafc201-1fb5-459e-8fcc-c5c9c331914b",
  CHARACTERISTIC_UUID: "beb5483e-36e1-4688-b7f5-ea07361b26a8",
  DEVICE_NAME: "Plantrix_ESP32",
}

export interface SensorData {
  soil: number
  temp: number
  hum: number
  lux: number
  status: "GREEN" | "BLUE" | "RED"
}

export class BluetoothService {
  private device: BluetoothDevice | null = null
  private characteristic: BluetoothRemoteGATTCharacteristic | null = null
  public isConnected = false
  private onDataCallback: ((data: SensorData) => void) | null = null
  private onDisconnectCallback: (() => void) | null = null

  async connect(): Promise<void> {
    try {
      // Request BLE device
      this.device = await navigator.bluetooth.requestDevice({
        filters: [{ services: [BLE_CONFIG.SERVICE_UUID] }, { name: BLE_CONFIG.DEVICE_NAME }],
        optionalServices: [BLE_CONFIG.SERVICE_UUID],
      })

      // Connect to GATT server
      const server = await this.device.gatt!.connect()

      // Get service
      const service = await server.getPrimaryService(BLE_CONFIG.SERVICE_UUID)

      // Get characteristic
      this.characteristic = await service.getCharacteristic(BLE_CONFIG.CHARACTERISTIC_UUID)

      // Start notifications
      await this.characteristic.startNotifications()
      this.characteristic.addEventListener("characteristicvaluechanged", this.handleData.bind(this))

      // Handle disconnection
      this.device.addEventListener("gattserverdisconnected", this.handleDisconnect.bind(this))

      this.isConnected = true
      console.log("✅ BLE Connected to:", this.device.name)
    } catch (error) {
      console.error("BLE Connection Error:", error)
      throw error
    }
  }

  disconnect(): void {
    if (this.device && this.device.gatt?.connected) {
      this.device.gatt.disconnect()
    }
    this.handleDisconnect()
  }

  private handleData(event: Event): void {
    try {
      const value = (event.target as BluetoothRemoteGATTCharacteristic).value
      const decoder = new TextDecoder("utf-8")
      const jsonStr = decoder.decode(value!)
      const data: SensorData = JSON.parse(jsonStr)

      if (this.onDataCallback) {
        this.onDataCallback(data)
      }
    } catch (error) {
      console.error("Error parsing BLE data:", error)
    }
  }

  private handleDisconnect(): void {
    this.isConnected = false
    this.characteristic = null
    if (this.onDisconnectCallback) {
      this.onDisconnectCallback()
    }
  }

  onData(callback: (data: SensorData) => void): void {
    this.onDataCallback = callback
  }

  onDisconnect(callback: () => void): void {
    this.onDisconnectCallback = callback
  }

  static isSupported(): boolean {
    return typeof navigator !== "undefined" && "bluetooth" in navigator
  }
}
