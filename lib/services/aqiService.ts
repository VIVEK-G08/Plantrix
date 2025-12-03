import type { PostgrestSingleResponse } from "@supabase/supabase-js"
import { createClient } from "@/lib/supabase/client"

export interface AQISummary {
  aqi: number
  category: "Good" | "Moderate" | "Unhealthy" | "Very Unhealthy" | "Hazardous"
  city: string
  dominentpol?: string
  pm25?: number
  pm10?: number
  updatedAt: string
}

export function categorizeAQI(aqi: number): AQISummary["category"] {
  if (aqi <= 50) return "Good"
  if (aqi <= 100) return "Moderate"
  if (aqi <= 150) return "Unhealthy"
  if (aqi <= 200) return "Very Unhealthy"
  return "Hazardous"
}

// TODO: In a full implementation you might have an aqi_readings table. For now this
// helper just maps a live API payload or stored JSON into AQISummary.
export function mapAQIFromPayload(payload: any): AQISummary | null {
  if (!payload || !payload.data) return null
  const d = payload.data
  const aqi = typeof d.aqi === "number" ? d.aqi : Number(d.aqi)
  if (!Number.isFinite(aqi)) return null

  const pm25 = d.iaqi?.pm25?.v
  const pm10 = d.iaqi?.pm10?.v

  return {
    aqi,
    category: categorizeAQI(aqi),
    city: d.city?.name ?? "Unknown",
    dominentpol: d.dominentpol,
    pm25: typeof pm25 === "number" ? pm25 : undefined,
    pm10: typeof pm10 === "number" ? pm10 : undefined,
    updatedAt: d.time?.iso ?? new Date().toISOString(),
  }
}

// Placeholder for future DB-backed AQI history if you add an aqi_readings table.
export async function getLatestAQIForUser(_userId: string): Promise<AQISummary | null> {
  // For now, dashboard can supply a payload directly to mapAQIFromPayload,
  // or you can later store AQI responses in Supabase and read them here.
  return null
}
