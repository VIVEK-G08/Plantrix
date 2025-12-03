export type SimpleForecast = {
  willRainNext24h: boolean
  willRainNext3d: boolean
}

export async function getSimpleForecast(lat: number, lon: number): Promise<SimpleForecast | null> {
  try {
    const apiKey = process.env.NEXT_PUBLIC_TOMORROW_API_KEY
    if (!apiKey) {
      console.error("Tomorrow.io API key is not set in NEXT_PUBLIC_TOMORROW_API_KEY")
      return null
    }

    const url = `https://api.tomorrow.io/v4/weather/forecast?location=${lat},${lon}&timesteps=1d&apikey=${apiKey}`
    const res = await fetch(url)
    if (!res.ok) {
      if (res.status === 429) {
        // Rate limit hit – fail silently so UI just falls back to soil-only advice
        console.warn("Tomorrow.io forecast rate limit reached (429)")
        return null
      }

      console.error("Tomorrow.io forecast request failed", res.status, await res.text())
      return null
    }

    const data = await res.json()
    const daily = data?.timelines?.daily ?? []
    const next3 = daily.slice(0, 3)

    if (!next3.length) return null

    const getRainFlag = (entry: any) => {
      const v = entry?.values
      const intensity = v?.precipitationIntensityAvg ?? v?.precipitationIntensity ?? 0
      return intensity > 0
    }

    const willRainNext24h = getRainFlag(next3[0])
    const willRainNext3d = next3.some(getRainFlag)

    return { willRainNext24h, willRainNext3d }
  } catch (error) {
    console.error("Error fetching Tomorrow.io forecast:", error)
    return null
  }
}

export function getWateringAdvice(soilPercent: number | null, forecast: SimpleForecast | null): string | null {
  if (soilPercent == null) return null

  // Basic heuristic: combine current moisture with near-future rain
  if (!forecast) {
    if (soilPercent < 30) return "My soil feels quite dry. Please water me soon."
    if (soilPercent > 70) return "I'm already very wet. Let's hold off on watering for now."
    return "Moisture looks okay for now. Check again later today."
  }

  const { willRainNext24h, willRainNext3d } = forecast

  if (soilPercent < 30 && !willRainNext3d) {
    return "I'm quite dry and there's no rain coming soon. Please water me today or tomorrow."
  }

  if (soilPercent < 40 && willRainNext24h) {
    return "I'm a bit dry, but rain is coming soon. You can wait and let the rain help me."
  }

  if (soilPercent >= 40 && soilPercent <= 70 && willRainNext3d) {
    return "My moisture is comfortable and rain is on the way. Let's skip watering for now."
  }

  if (soilPercent > 70) {
    return "I'm already quite wet. Please don't add more water yet."
  }

  return "My moisture and weather both look okay. No need to water right now."
}
