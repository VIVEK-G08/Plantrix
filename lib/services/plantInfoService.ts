export type PlantInfo = {
  lowLightFriendly: boolean
  airPurifying: boolean
  petSafe: boolean
  aromatic: boolean
  sunlightRaw: string[]
  wateringRaw: string | null
  toxicityRaw: string | null
  description: string | null
}

export async function fetchPlantInfoByName(name: string): Promise<PlantInfo | null> {
  try {
    const apiKey = process.env.NEXT_PUBLIC_PERENUAL_API_KEY
    if (!apiKey) {
      console.error("Perenual API key is not set in NEXT_PUBLIC_PERENUAL_API_KEY")
      return null
    }

    const url = `https://perenual.com/api/species-list?key=${apiKey}&q=${encodeURIComponent(name)}`
    const res = await fetch(url)
    if (!res.ok) {
      console.error("Perenual species-list request failed", await res.text())
      return null
    }

    const data = await res.json()
    const first = Array.isArray(data?.data) ? data.data[0] : null
    if (!first) return null

    const sunlight: string[] = Array.isArray(first?.sunlight) ? first.sunlight : []

    const lowLightFriendly = sunlight.some((s) =>
      typeof s === "string" && /shade|low light|indirect/i.test(s)
    )

    const airPurifying = Boolean(first?.air_purifying ?? false)

    const petSafe = first?.poisonous_to_pets === false || first?.poisonous_to_pets === "no"

    const aromatic = Boolean(first?.fragrance || first?.fragrant)

    const wateringRaw: string | null =
      typeof first?.watering === "string" ? first.watering : null

    const toxicityRaw: string | null =
      typeof first?.poisonous_to_pets === "string"
        ? first.poisonous_to_pets
        : typeof first?.poisonous_to_humans === "string"
        ? first.poisonous_to_humans
        : null

    const description: string | null =
      typeof first?.description === "string" && first.description.trim().length > 0
        ? first.description.trim()
        : null

    return {
      lowLightFriendly,
      airPurifying,
      petSafe,
      aromatic,
      sunlightRaw: sunlight,
      wateringRaw,
      toxicityRaw,
      description,
    }
  } catch (error) {
    console.error("Error fetching Perenual plant info:", error)
    return null
  }
}
