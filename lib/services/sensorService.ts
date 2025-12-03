import { createClient } from "@/lib/supabase/client"

// Shape returned to the AI assistant
export interface SensorData {
  id: string
  created_at: string
  temperature: number | null
  humidity: number | null
  soil_moisture: number | null
  light_intensity: number | null
  user_id: string
  plant_id: string
}

// Use existing sensor_readings table
export async function getLatestSensorData(userId: string): Promise<SensorData | null> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from("sensor_readings")
    .select("id, user_id, plant_id, temperature, humidity, soil_moisture, light, timestamp")
    .eq("user_id", userId)
    .order("timestamp", { ascending: false })
    .limit(1)

  if (error) {
    console.error("Error fetching sensor data (sensor_readings):", error)
    return null
  }

  if (!data || data.length === 0) return null

  const row = data[0]

  // Map DB fields to the shape used by the AI assistant
  return {
    id: row.id,
    user_id: row.user_id,
    plant_id: row.plant_id,
    created_at: row.timestamp,
    temperature: row.temperature ?? null,
    humidity: row.humidity ?? null,
    soil_moisture: row.soil_moisture ?? null,
    light_intensity: row.light ?? null,
  }
}

// Derive a human-readable plant type from the user's plants
export async function getPlantType(userId: string): Promise<string | null> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from("plants")
    .select("name")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(1)
    .single()

  if (error) {
    console.error("Error fetching plant type (plants):", error)
    return null
  }

  return data?.name || null
}
