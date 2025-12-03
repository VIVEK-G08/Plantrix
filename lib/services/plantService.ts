import { createClient } from "@/lib/supabase/client"

// This matches your existing `plants` table
export interface PlantType {
  id: string
  user_id: string
  name: string
  species: string | null
  image_url: string | null
  device_id: string | null
  device_name: string | null
  notes: string | null
  added_date: string
  created_at: string
  updated_at: string
}

export type CreatePlantType = {
  user_id: string
  name: string
  species?: string | null
  image_url?: string | null
  device_id?: string | null
  device_name?: string | null
  notes?: string | null
}

export async function getPlantTypes(userId: string): Promise<PlantType[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from("plants")
    .select("*")
    .eq("user_id", userId)
    .order("name", { ascending: true })

  if (error) {
    console.error("Error fetching plant types (plants table):", error)
    return []
  }

  return data || []
}

export async function savePlantType(plantType: CreatePlantType): Promise<PlantType | null> {
  const supabase = createClient()

  if (!plantType.user_id || !plantType.name) {
    console.error("Invalid plant data: missing user_id or name", plantType)
    return null
  }

  const { data, error } = await supabase
    .from("plants")
    .insert([plantType])
    .select()
    .single()

  if (error) {
    console.error("Error saving plant (plants table):", error)
    return null
  }

  return data
}

// For now, don't persist selected plant type; just succeed so UI works
export async function updateUserPlantType(userId: string, plantTypeId: string): Promise<boolean> {
  console.log("updateUserPlantType stub called", { userId, plantTypeId })
  return true
}

export async function getUserPlantType(userId: string): Promise<PlantType | null> {
  console.log("getUserPlantType stub called", { userId })
  return null
}
