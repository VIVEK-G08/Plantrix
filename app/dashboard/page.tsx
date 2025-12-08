"use client"

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { 
  getPlantTypes, 
  savePlantType, 
  updateUserPlantType, 
  getUserPlantType, 
  type PlantType 
} from '@/lib/services/plantService';
import Navbar from '@/components/navbar';
import AuthGate from '@/components/auth-gate';
import { 
  Plus, 
  RefreshCw, 
  Bluetooth, 
  BluetoothConnected, 
  Camera, 
  AlertCircle, 
  Download, 
  Upload, 
  X 
} from 'lucide-react';
import { BluetoothService, type SensorData } from '@/lib/bluetooth';
import { bluetoothServiceSingleton } from "@/lib/bluetoothSingleton";
import type { AQISummary } from "@/lib/services/aqiService";
import { mapAQIFromPayload } from "@/lib/services/aqiService";
import { Line } from 'react-chartjs-2';
import { getSimpleForecast, getWateringAdvice } from "@/lib/services/weatherService";
import { fetchPlantInfoByName, type PlantInfo } from "@/lib/services/plantInfoService";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from "chart.js"

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler)

interface Plant {
  id: string
  name: string
  species: string
  image: string
  addedDate: Date
}

interface Reading {
  timestamp: Date
  soil: number
  humidity: number
  temp: number
  light: number
}


export default function Dashboard() {
  const bleService = bluetoothServiceSingleton
  const [isConnected, setIsConnected] = useState(false)
  const [isConnecting, setIsConnecting] = useState(false)
  const [sensorData, setSensorData] = useState<SensorData | null>(null)
  const [history, setHistory] = useState<{ 
    timestamps: string[]; 
    soil: number[]; 
    temp: number[]; 
    hum: number[] 
  }>({
    timestamps: [],
    soil: [],
    temp: [],
    hum: [],
  })
  
  // Plant related state
  // Track the currently selected plant type
  const [selectedPlant, setSelectedPlant] = useState<PlantType | null>(null)
  const [plantTypes, setPlantTypes] = useState<PlantType[]>([])
  const [selectedPlantInfo, setSelectedPlantInfo] = useState<PlantInfo | null>(null)
  const [showPlantForm, setShowPlantForm] = useState(false)
  const [newPlantName, setNewPlantName] = useState("")
  const [newPlantSpecies, setNewPlantSpecies] = useState("")
  const [newPlantImage, setNewPlantImage] = useState<string | null>(null)
  const [showCamera, setShowCamera] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const router = useRouter()

  // UI state
  const [showAddPlant, setShowAddPlant] = useState(false)
  const [plants, setPlants] = useState<Plant[]>([])
  const [recentReadings, setRecentReadings] = useState<Reading[]>([])
  const [userId, setUserId] = useState<string | null>(null)
  const [aqiSummary, setAqiSummary] = useState<AQISummary | null>(null)
  const lastSavedRef = useRef<number>(0)
  const [alertToast, setAlertToast] = useState<string | null>(null)
  const lastAlertRef = useRef<string | null>(null)
  const [weatherAdvice, setWeatherAdvice] = useState<string | null>(null)
  const weatherFetchedRef = useRef<boolean>(false)

  // Plant type handlers
  const handlePlantTypeChange = useCallback(async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const plantTypeId = e.target.value;
    const plantType = plantTypes.find(p => p.id === plantTypeId);
    
    if (plantType) {
      try {
        const supabase = createClient();
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session?.user) {
          setUserId(session.user.id)
          await updateUserPlantType(session.user.id, plantTypeId);
          setSelectedPlant(plantType);

          // Remember selection in localStorage
          if (typeof window !== "undefined") {
            window.localStorage.setItem(
              `plantcare:selectedPlant:${session.user.id}`,
              plantTypeId
            )
          }

          // Enrich with Perenual info (non-blocking)
          fetchPlantInfoByName(plantType.name).then((info) => {
            if (info) setSelectedPlantInfo(info)
          })
        }
      } catch (error) {
        console.error('Error updating plant type:', error);
      }
    }
  }, [plantTypes]);

  const handleAddPlantType = useCallback(async () => {
    if (!newPlantName.trim()) return;
    
    setIsSaving(true);
    
    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session?.user) {
        const newPlant = await savePlantType({
          name: newPlantName.trim(),
          user_id: session.user.id,
          notes: ''
        });
        
        if (newPlant) {
          setPlantTypes(prev => [...prev, newPlant]);
          setSelectedPlant(newPlant);
          setPlants(prev => [
            {
              id: newPlant.id,
              name: newPlant.name,
              species: newPlant.species || "Unknown species",
              image:
                newPlant.image_url ||
                "https://images.unsplash.com/photo-1614594975525-e45190c55d0b?q=80&w=800&auto=format&fit=crop",
              addedDate: new Date(newPlant.added_date || new Date().toISOString()),
            },
            ...prev,
          ])
          setNewPlantName('');
          setShowPlantForm(false);
          await updateUserPlantType(session.user.id, newPlant.id);

          // Remember new plant selection in localStorage
          if (typeof window !== "undefined") {
            window.localStorage.setItem(
              `plantcare:selectedPlant:${session.user.id}`,
              newPlant.id,
            )
          }

          // Fetch enrichment info
          fetchPlantInfoByName(newPlant.name).then((info) => {
            if (info) setSelectedPlantInfo(info)
          })
        } else {
          // Handle case where savePlantType returns null
          console.error('Failed to save plant type');
          // Optionally show user feedback here
        }
      }
    } catch (error) {
      console.error('Error adding plant type:', error);
      // Optionally show user feedback here
    } finally {
      setIsSaving(false);
    }
  }, [newPlantName]);

  useEffect(() => {
    const loadPlantData = async () => {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      
      if (session?.user) {
        try {
          // Load all available plant types
          const types = await getPlantTypes(session.user.id)
          setPlantTypes(types)

          // Load user's selected plant from Supabase or localStorage
          let effectiveSelected: PlantType | null = null

          const userPlantType = await getUserPlantType(session.user.id)
          if (userPlantType) {
            effectiveSelected = userPlantType
          } else if (typeof window !== "undefined") {
            const savedId = window.localStorage.getItem(
              `plantcare:selectedPlant:${session.user.id}`,
            )
            if (savedId) {
              const fromList = types.find((t) => t.id === savedId) || null
              effectiveSelected = fromList
            }
          }

          setSelectedPlant(effectiveSelected)

          if (effectiveSelected) {
            // Fetch enrichment info for restored selection
            fetchPlantInfoByName(effectiveSelected.name).then((info) => {
              if (info) setSelectedPlantInfo(info)
            })
          } else {
            setSelectedPlantInfo(null)
          }

          // Also mirror Supabase plants into sidebar "My Plants" list
          setPlants(
            types.map((t) => ({
              id: t.id,
              name: t.name,
              species: t.species || "Unknown species",
              image:
                t.image_url ||
                "https://images.unsplash.com/photo-1614594975525-e45190c55d0b?q=80&w=800&auto=format&fit=crop",
              addedDate: new Date(t.added_date || new Date().toISOString()),
            })),
          )
        } catch (error) {
          console.error('Error loading plant data:', error)
        }
      }
    }
    
    loadPlantData()
  }, [])

  // Fetch AQI data once (placeholder API call; replace URL with your real AQI endpoint)
  useEffect(() => {
    const fetchAQI = async () => {
      try {
        const token = process.env.NEXT_PUBLIC_AQI_TOKEN
        if (!token) {
          console.error("AQI token not set in NEXT_PUBLIC_AQI_TOKEN")
          return
        }

        const res = await fetch(`https://api.waqi.info/feed/here/?token=${token}`)
        if (!res.ok) return
        const json = await res.json()
        const summary = mapAQIFromPayload(json)
        if (summary) setAqiSummary(summary)
      } catch (error) {
        console.error("Error fetching AQI:", error)
      }
    }

    fetchAQI()
  }, [])

  useEffect(() => {
    if (bleService.isConnected) {
      setIsConnected(true)
    }

    bleService.onData((data) => {
      setSensorData(data)

      // Update history
      const now = new Date().toLocaleTimeString()
      setHistory((prev) => ({
        timestamps: [...prev.timestamps.slice(-19), now],
        soil: [...prev.soil.slice(-19), data.soil],
        temp: [...prev.temp.slice(-19), data.temp],
        hum: [...prev.hum.slice(-19), data.hum],
      }))

      setRecentReadings((prev) => [
        {
          timestamp: new Date(),
          soil: data.soil,
          humidity: data.hum,
          temp: data.temp,
          light: data.lux,
        },
        ...prev.slice(0, 49), // Keep last 50 readings
      ])

      const nowMs = Date.now()
      const tenSeconds = 10_000

      if (userId && nowMs - lastSavedRef.current > tenSeconds) {
        lastSavedRef.current = nowMs
        const supabase = createClient()

        ;(async () => {
          try {
            await supabase
              .from("sensor_readings")
              .insert({
                user_id: userId,
                plant_id: selectedPlant?.id ?? null,
                soil_moisture: data.soil,
                temperature: data.temp,
                humidity: data.hum,
                light: data.lux,
              })
          } catch (error) {
            console.error("Error saving sensor reading:", error)
          }
        })()
      }
    })

    bleService.onDisconnect(() => {
      setIsConnected(false)
      setSensorData(null)
      setHistory({ timestamps: [], soil: [], temp: [], hum: [] })
      setRecentReadings([])
    })
  }, [bleService, userId, selectedPlant])

  // Weather + watering advice using Tomorrow.io and soil percentage
  useEffect(() => {
    if (!sensorData) {
      setWeatherAdvice(null)
      return
    }

    if (typeof window === "undefined" || !("geolocation" in navigator)) {
      return
    }

     // Avoid hitting Tomorrow.io rate limits: fetch forecast only once per session
    if (weatherFetchedRef.current) {
      return
    }

    const soilPercent = getSoilPercent(sensorData.soil)

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          weatherFetchedRef.current = true
          const forecast = await getSimpleForecast(pos.coords.latitude, pos.coords.longitude)
          const advice = getWateringAdvice(soilPercent, forecast)
          setWeatherAdvice(advice)
        } catch (error) {
          console.error("Error computing watering advice:", error)
        }
      },
      (err) => {
        console.warn("Geolocation error for weather advice:", err)
      },
      { enableHighAccuracy: false, timeout: 5000 }
    )
  }, [sensorData])

  // Toast-style smart alerts (WhatsApp-like popups)
  useEffect(() => {
    if (!sensorData) {
      lastAlertRef.current = null
      return
    }

    let message: string | null = null

    if (sensorData.soil > 2600) {
      message = "My soil feels really dry… could you give me some water soon?"
    } else if (sensorData.lux < 60) {
      message = "It's a bit too dark here. A brighter spot would help me grow better."
    } else if (sensorData.status === "GREEN") {
      message = "I'm feeling great right now. Thanks for taking care of me! 🌿"
    }

    if (message && message !== lastAlertRef.current) {
      lastAlertRef.current = message
      setAlertToast(message)

      // Auto-dismiss after a few seconds
      const timer = setTimeout(() => {
        setAlertToast((current) => (current === message ? null : current))
      }, 5000)

      return () => clearTimeout(timer)
    }
  }, [sensorData])

  const handleConnect = async () => {
    if (isConnected) {
      bleService.disconnect()
      setIsConnected(false)
      return
    }

    if (!BluetoothService.isSupported()) {
      alert("Web Bluetooth is not supported in your browser. Please use Chrome, Edge, or Opera.")
      return
    }

    setIsConnecting(true)
    try {
      await bleService.connect()
      setIsConnected(true)
    } catch (error: any) {
      alert("Failed to connect: " + error.message)
    } finally {
      setIsConnecting(false)
    }
  }

  const downloadCSV = () => {
    if (recentReadings.length === 0) {
      alert("No readings to download")
      return
    }

    const headers = ["Timestamp", "Soil", "Humidity (%)", "Temperature (°C)", "Light (lux)"]
    const csvContent = [
      headers.join(","),
      ...recentReadings.map((r) =>
        [r.timestamp.toLocaleString(), r.soil, r.humidity.toFixed(1), r.temp.toFixed(1), Math.round(r.light)].join(","),
      ),
    ].join("\n")

    const blob = new Blob([csvContent], { type: "text/csv" })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `plantcare-readings-${new Date().toISOString().split("T")[0]}.csv`
    a.click()
    window.URL.revokeObjectURL(url)
  }


  const handleAddPlant = () => {
    if (!newPlantName.trim()) {
      alert("Please enter a plant name")
      return
    }

    const newPlant: Plant = {
      id: Date.now().toString(),
      name: newPlantName,
      species: newPlantSpecies || "Unknown species",
      image:
        newPlantImage || "https://images.unsplash.com/photo-1614594975525-e45190c55d0b?q=80&w=800&auto=format&fit=crop",
      addedDate: new Date(),
    }

    setPlants([...plants, newPlant])
    setShowAddPlant(false)
    setNewPlantName("")
    setNewPlantSpecies("")
    setNewPlantImage(null)
  }

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onloadend = () => {
        setNewPlantImage(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  // Convert raw 0-4095 ADC soil value into an approximate moisture percentage
  const getSoilPercent = (raw: number) => {
    const percent = 100 - ((raw / 4095) * 100)
    return Math.round(Math.max(0, Math.min(100, percent)))
  }

  const getSoilStatus = (soilRaw: number) => {
    const moisture = getSoilPercent(soilRaw)
    // <30%: very dry, 30-60%: healthy range, >60%: very wet
    if (moisture < 30) return { label: "DRY", color: "text-red-600", bg: "bg-red-50" }
    if (moisture <= 60) return { label: "HEALTHY", color: "text-green-600", bg: "bg-green-50" }
    return { label: "WET", color: "text-blue-600", bg: "bg-blue-50" }
  }

  const getTempStatus = (temp: number) => {
    if (temp > 36) return { label: "HIGH", color: "text-orange-600", bg: "bg-orange-50" }
    if (temp >= 16) return { label: "OPTIMAL", color: "text-green-600", bg: "bg-green-50" }
    return { label: "LOW", color: "text-cyan-600", bg: "bg-cyan-50" }
  }

  const getHumStatus = (hum: number) => {
    if (hum > 85) return { label: "HIGH", color: "text-amber-600", bg: "bg-amber-50" }
    if (hum >= 50) return { label: "OPTIMAL", color: "text-green-600", bg: "bg-green-50" }
    return { label: "LOW", color: "text-red-600", bg: "bg-red-50" }
  }

  const getLightStatus = (lux: number) => {
    if (lux > 1200) return { label: "HIGH", color: "text-yellow-600", bg: "bg-yellow-50" }
    if (lux >= 60) return { label: "OPTIMAL", color: "text-green-600", bg: "bg-green-50" }
    return { label: "LOW", color: "text-slate-600", bg: "bg-slate-50" }
  }

  const chartData = {
    labels: history.timestamps,
    datasets: [
      {
        label: "Soil Moisture",
        data: history.soil,
        borderColor: "rgb(59, 130, 246)",
        backgroundColor: "rgba(59, 130, 246, 0.1)",
        borderWidth: 2,
        tension: 0.4,
        fill: true,
        pointRadius: 2,
      },
      {
        label: "Temperature",
        data: history.temp,
        borderColor: "rgb(249, 115, 22)",
        backgroundColor: "rgba(249, 115, 22, 0.1)",
        borderWidth: 2,
        tension: 0.4,
        fill: true,
        pointRadius: 2,
      },
      {
        label: "Humidity",
        data: history.hum,
        borderColor: "rgb(6, 182, 212)",
        backgroundColor: "rgba(6, 182, 212, 0.1)",
        borderWidth: 2,
        tension: 0.4,
        fill: true,
        pointRadius: 2,
      },
    ],
  }

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: "top" as const,
        labels: { usePointStyle: true, padding: 15, font: { size: 11 } },
      },
    },
    scales: {
      y: { beginAtZero: false, grid: { color: "#f1f5f9" } },
      x: { display: true, grid: { display: false } },
    },
  }

  const healthScore = sensorData
    ? Math.round(
        (sensorData.soil >= 850 && sensorData.soil <= 2600 ? 25 : 0) +
          (sensorData.hum >= 50 && sensorData.hum <= 85 ? 25 : 0) +
          (sensorData.temp >= 16 && sensorData.temp <= 36 ? 25 : 0) +
          (sensorData.lux >= 60 && sensorData.lux <= 1200 ? 25 : 0),
      )
    : 0

  return (
    <AuthGate>
      <div className="min-h-screen bg-slate-50">
        <Navbar />

        <div className="flex h-[calc(100vh-64px)]">
          <aside className="w-64 bg-white border-r border-slate-200 hidden lg:flex flex-col overflow-y-auto">
            <div className="p-6">
              {/* Connection Status */}
              <div
                className={`p-4 rounded-xl mb-6 border-2 ${isConnected ? "bg-green-50 border-green-200" : "bg-red-50 border-red-200"}`}
              >
                <div className="flex items-center gap-2 mb-2">
                  <div
                    className={`w-3 h-3 rounded-full ${isConnected ? "bg-green-500 animate-pulse" : "bg-red-500"}`}
                  ></div>
                  <span className={`font-semibold text-sm ${isConnected ? "text-green-700" : "text-red-700"}`}>
                    {isConnected ? "Connected" : "Disconnected"}
                  </span>
                </div>
                <p className="text-xs text-slate-600">
                  {isConnected ? 'Connect to "Plant Lifeline" WiFi' : "Connect your device to continue"}
                </p>
              </div>

              <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">Plant Configuration</h2>

              <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100">
                <div className="flex justify-between items-center mb-2">
                  <h3 className="text-sm font-medium text-slate-800">Plant Type</h3>
                  <button 
                    onClick={() => setShowPlantForm(!showPlantForm)}
                    className="text-xs text-green-600 hover:text-green-700"
                  >
                    {showPlantForm ? 'Cancel' : 'Add New'}
                  </button>
                </div>
                
                {showPlantForm ? (
                  <div className="space-y-2">
                    <input
                      type="text"
                      value={newPlantName}
                      onChange={(e) => setNewPlantName(e.target.value)}
                      placeholder="Enter plant name (e.g., Monstera Deliciosa)"
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                    />
                    <button 
                      onClick={handleAddPlantType}
                      disabled={isSaving || !newPlantName.trim()}
                      className="w-full px-3 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isSaving ? 'Saving...' : 'Save Plant Type'}
                    </button>
                  </div>
                ) : (
                  <select
                    value={selectedPlant?.id || ''}
                    onChange={handlePlantTypeChange}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500 bg-white"
                  >
                    <option value="">Select a plant type</option>
                    {plantTypes.map((plant) => (
                      <option key={plant.id} value={plant.id}>
                        {plant.name}
                      </option>
                    ))}
                  </select>
                )}
                
                {selectedPlant && !showPlantForm && (
                  <div className="mt-3 p-3 bg-slate-50 rounded-lg text-sm text-slate-600">
                    <p className="font-medium">{selectedPlant.name}</p>
                    {selectedPlant.notes && (
                      <p className="mt-1 text-slate-500">{selectedPlant.notes}</p>
                    )}

                    {selectedPlantInfo && (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {selectedPlantInfo.lowLightFriendly && (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-[11px] font-medium bg-slate-200 text-slate-700">
                            ☁️ Low light OK
                          </span>
                        )}
                        {selectedPlantInfo.airPurifying && (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-[11px] font-medium bg-emerald-100 text-emerald-700">
                            🌬️ Air purifier
                          </span>
                        )}
                        {selectedPlantInfo.petSafe && (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-[11px] font-medium bg-sky-100 text-sky-700">
                            🐾 Pet safe
                          </span>
                        )}
                        {selectedPlantInfo.aromatic && (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-[11px] font-medium bg-amber-100 text-amber-700">
                            🌸 Good aroma
                          </span>
                        )}
                      </div>
                    )}

                    {selectedPlantInfo && (
                      <div className="mt-3 space-y-1 text-xs text-slate-600">
                        {selectedPlantInfo.description && (
                          <p className="leading-snug line-clamp-3">
                            {selectedPlantInfo.description}
                          </p>
                        )}

                        {(selectedPlantInfo.sunlightRaw.length > 0 || selectedPlantInfo.wateringRaw) && (
                          <p className="leading-snug">
                            {selectedPlantInfo.sunlightRaw.length > 0 && (
                              <>
                                <span className="font-semibold text-slate-700">Light:</span>{" "}
                                {selectedPlantInfo.sunlightRaw.join(", ")}
                              </>
                            )}
                            {selectedPlantInfo.wateringRaw && (
                              <>
                                {selectedPlantInfo.sunlightRaw.length > 0 && " · "}
                                <span className="font-semibold text-slate-700">Water:</span>{" "}
                                {selectedPlantInfo.wateringRaw}
                              </>
                            )}
                          </p>
                        )}

                        {selectedPlantInfo.toxicityRaw && !selectedPlantInfo.petSafe && (
                          <p className="leading-snug text-red-600 flex items-center gap-1">
                            <span>⚠️</span>
                            <span>
                              May be toxic to pets / humans: {selectedPlantInfo.toxicityRaw}
                            </span>
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="space-y-2 mb-4">
                <div className="flex items-center gap-2 p-3 bg-green-50 rounded-lg border border-green-100">
                  <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-white text-xs">🌱</span>
                  </div>
                  <div className="overflow-hidden">
                    <p className="text-sm font-semibold text-slate-900 truncate">
                      {selectedPlant?.name || plants[0]?.name || "No plant selected"}
                    </p>
                    <p className="text-xs text-slate-500">Current Plant</p>
                  </div>
                </div>
              </div>

              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 mt-6">My Plants</h3>
              <div className="space-y-2">
                {plants.map((plant) => (
                  <button
                    key={plant.id}
                    onClick={() => {
                      // Find the full plant type object that matches the plant name
                      const plantType = plantTypes.find(pt => pt.name === plant.name);
                      if (plantType) {
                        setSelectedPlant(plantType);
                      }
                    }}
                    className={`w-full p-3 rounded-lg text-left transition-all ${
                      selectedPlant?.name === plant.name
                        ? "bg-green-50 border border-green-200"
                        : "bg-white border border-slate-100 hover:bg-slate-50"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg overflow-hidden flex-shrink-0 bg-slate-100">
                        <img
                          src={plant.image || "/placeholder.svg"}
                          alt={plant.name}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="overflow-hidden">
                        <p className="text-sm font-semibold text-slate-900 truncate">{plant.name}</p>
                        <p className="text-xs text-slate-500 truncate">{plant.species}</p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>

              <button
                onClick={() => setShowAddPlant(true)}
                className="mt-4 w-full py-2 border border-dashed border-slate-300 rounded-lg text-slate-500 hover:text-green-600 hover:border-green-300 hover:bg-green-50 transition-all flex items-center justify-center gap-2 text-sm font-medium"
              >
                <Plus size={16} /> Add New Plant
              </button>
            </div>

            <div className="mt-auto p-4 border-t border-slate-100">
              <button
                onClick={downloadCSV}
                disabled={recentReadings.length === 0}
                className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm flex items-center justify-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Download size={16} />
                Download CSV
              </button>
              <button className="w-full mt-2 py-2 bg-red-100 hover:bg-red-200 text-red-700 rounded-lg text-sm flex items-center justify-center gap-2 transition-colors">
                Reset Data
              </button>
            </div>
          </aside>

          <main className="flex-1 overflow-y-auto p-4 lg:p-8">
            {/* Bluetooth Connection Section */}
            <div className="mb-8 p-6 bg-white rounded-2xl shadow-sm border border-slate-100">
              <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div
                    className={`w-16 h-16 rounded-2xl flex items-center justify-center text-white text-3xl shadow-lg ${
                      isConnected
                        ? "bg-gradient-to-br from-green-500 to-emerald-600 animate-pulse"
                        : isConnecting
                          ? "bg-gradient-to-br from-blue-500 to-indigo-600"
                          : "bg-gradient-to-br from-slate-400 to-slate-600"
                    }`}
                  >
                    {isConnected ? <BluetoothConnected size={32} /> : <Bluetooth size={32} />}
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-slate-900">Plant Dashboard</h2>
                    <p className="text-slate-500 text-sm">
                      {isConnected
                        ? "Live sensor data from your ESP32 device."
                        : isConnecting
                          ? "Connecting to your device..."
                          : "Connect to your device to start monitoring."}
                    </p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <button
                    className="p-3 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
                    title="Refresh Data"
                  >
                    <RefreshCw size={20} />
                  </button>
                  <button
                    onClick={handleConnect}
                    disabled={isConnecting}
                    className={`px-6 py-3 rounded-xl text-white font-semibold shadow-lg flex items-center gap-2 transition-all ${
                      isConnected
                        ? "bg-gradient-to-r from-red-500 to-pink-600 hover:from-red-600 hover:to-pink-700"
                        : isConnecting
                          ? "bg-gradient-to-r from-blue-500 to-indigo-600 opacity-75 cursor-not-allowed"
                          : "bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700"
                    }`}
                  >
                    {isConnecting ? (
                      <>
                        <RefreshCw size={18} className="animate-spin" />
                        <span>Connecting...</span>
                      </>
                    ) : isConnected ? (
                      <span>Disconnect</span>
                    ) : (
                      <>
                        <Bluetooth size={18} />
                        <span>Connect</span>
                      </>
                    )}
                  </button>
                  <button
                    onClick={() => router.push("/ai-assistant")}
                    className="px-4 py-3 bg-blue-600 text-white rounded-xl font-semibold shadow-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
                  >
                    <span>Ask AI</span>
                  </button>
                </div>
              </div>
            </div>

            {weatherAdvice && (
              <div className="mb-6 bg-white rounded-2xl shadow-sm border border-slate-100 p-4 flex items-start gap-3">
                <div className="mt-1 text-xl">💧</div>
                <div>
                  <h3 className="text-sm font-semibold text-slate-800 mb-1">Watering Advice</h3>
                  <p className="text-sm text-slate-600 leading-snug">{weatherAdvice}</p>
                </div>
              </div>
            )}

            {/* AQI & Tips Section */}
            <div className="mb-8 grid grid-cols-1 lg:grid-cols-3 gap-4">
              <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4 flex flex-col justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-slate-800 mb-1">Air Quality</h3>
                  <p className="text-xs text-slate-500 mb-3">Outdoor air near your plants</p>
                  {aqiSummary ? (
                    <>
                      <div className="flex items-baseline gap-2 mb-1">
                        <span className="text-3xl font-bold text-slate-900">{aqiSummary.aqi}</span>
                        <span className="text-xs px-2 py-1 rounded-full bg-slate-100 text-slate-700 uppercase font-semibold tracking-wider">
                          {aqiSummary.category}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mb-1">{aqiSummary.city}</p>
                      {aqiSummary.dominentpol && (
                        <p className="text-xs text-slate-500">Dominant pollutant: {aqiSummary.dominentpol.toUpperCase()}</p>
                      )}
                    </>
                  ) : (
                    <p className="text-xs text-slate-500">AQI data not configured yet.</p>
                  )}
                </div>
              </div>

              <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-slate-100 p-4">
                <h3 className="text-sm font-semibold text-slate-800 mb-2">Plant Suggestions & Tips</h3>
                <p className="text-xs text-slate-500 mb-3">
                  Suggestions for plants that help with air quality, aroma, insects and skin care.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
                  <div className="p-3 rounded-lg bg-green-50 border border-green-100">
                    <p className="font-semibold text-slate-900 mb-1">Reduce AQI</p>
                    <p className="text-slate-600">Snake plant, Areca palm, Peace lily, Rubber plant.</p>
                  </div>
                  <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-100">
                    <p className="font-semibold text-slate-900 mb-1">Good Aroma</p>
                    <p className="text-slate-600">Jasmine, Lavender, Gardenia, Rosemary.</p>
                  </div>
                  <div className="p-3 rounded-lg bg-amber-50 border border-amber-100">
                    <p className="font-semibold text-slate-900 mb-1">Anti-Insect</p>
                    <p className="text-slate-600">Citronella, Lemongrass, Marigold, Mint.</p>
                  </div>
                  <div className="p-3 rounded-lg bg-sky-50 border border-sky-100">
                    <p className="font-semibold text-slate-900 mb-1">Skin Care Friendly</p>
                    <p className="text-slate-600">Aloe vera, Calendula, Chamomile, Green tea shrub.</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Sensor Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              <SensorCard
                icon="🌱"
                label="Soil Moisture"
                value={sensorData ? `${getSoilPercent(sensorData.soil)}%` : "--"}
                unit={sensorData ? `(ADC: ${sensorData.soil})` : ""}
                progress={sensorData ? getSoilPercent(sensorData.soil) : 0}
                status={sensorData ? getSoilStatus(sensorData.soil) : null}
                color="bg-blue-500"
                ideal="Optimal: 850-2600"
              />

              <SensorCard
                icon="🌡️"
                label="Temperature"
                value={sensorData ? sensorData.temp.toFixed(1) : "--"}
                unit="°C"
                progress={sensorData ? Math.min(100, (sensorData.temp / 50) * 100) : 0}
                status={sensorData ? getTempStatus(sensorData.temp) : null}
                color="bg-orange-500"
                ideal="Ideal: 16-38°C"
              />

              <SensorCard
                icon="💨"
                label="Humidity"
                value={sensorData ? sensorData.hum.toFixed(1) : "--"}
                unit="%"
                progress={sensorData ? sensorData.hum : 0}
                status={sensorData ? getHumStatus(sensorData.hum) : null}
                color="bg-cyan-500"
                ideal="Ideal: 50-85%"
              />

              <SensorCard
                icon="☀️"
                label="Light"
                value={sensorData ? Math.round(sensorData.lux).toString() : "--"}
                unit="lux"
                progress={sensorData ? Math.min(100, (sensorData.lux / 1500) * 100) : 0}
                status={sensorData ? getLightStatus(sensorData.lux) : null}
                color="bg-yellow-500"
                ideal="Optimal: 60-1200"
              />
            </div>

            {/* Charts and Info */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
              {/* Chart Section */}
              <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-slate-100 p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="font-semibold text-slate-900 text-lg">Sensor Trends</h3>
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1">
                      <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                      <span className="text-xs text-slate-600">Soil Moisture</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
                      <span className="text-xs text-slate-600">Temperature</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="w-3 h-3 bg-cyan-500 rounded-full"></div>
                      <span className="text-xs text-slate-600">Humidity</span>
                    </div>
                  </div>
                </div>
                <div className="h-64">
                  <Line data={chartData} options={chartOptions} />
                </div>
                <p className="text-center text-xs text-slate-400 mt-4">{history.timestamps.length} readings</p>
              </div>

              {/* Sidebar Cards */}
              <div className="space-y-6">
                {/* Health Score */}
                <div className="bg-gradient-to-br from-purple-500 via-purple-600 to-purple-700 rounded-2xl p-6 text-white shadow-lg">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                      <span className="text-2xl">🌱</span>
                    </div>
                    <span className="font-semibold">AI Health Score</span>
                  </div>
                  <div className="text-5xl font-bold mb-2">{healthScore}%</div>
                  <p className="text-white/80 text-sm">Based on all sensor readings</p>
                </div>

                {/* Smart Alerts */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6">
                  <h3 className="font-semibold text-slate-900 text-lg mb-4 flex items-center gap-2">
                    <span className="text-xl">🚨</span>
                    Smart Alerts
                  </h3>
                  <div className="space-y-3">
                    {!sensorData ? (
                      <div className="p-4 bg-slate-50 rounded-xl text-slate-500 text-center text-sm flex items-center justify-center gap-2">
                        <AlertCircle size={16} />
                        <span>I'm waiting to hear from your sensors… connect your device to let me speak. 🌱</span>
                      </div>
                    ) : sensorData.status === "GREEN" ? (
                      <div className="p-4 bg-green-50 border-l-4 border-green-500 rounded-r-xl">
                        <p className="font-medium text-green-800 text-sm">I'm feeling great!</p>
                        <p className="text-xs text-green-600 mt-1">Moisture, light and air all feel comfy right now.</p>
                      </div>
                    ) : (
                      <>
                        {sensorData.soil > 2600 && (
                          <div className="p-4 bg-red-50 border-l-4 border-red-500 rounded-r-xl">
                            <p className="font-medium text-red-800 text-sm">My soil feels really dry…</p>
                            <p className="text-xs text-red-600 mt-1">Could you please give me some water soon?</p>
                          </div>
                        )}
                        {sensorData.lux < 60 && (
                          <div className="p-4 bg-yellow-50 border-l-4 border-yellow-500 rounded-r-xl">
                            <p className="font-medium text-yellow-800 text-sm">It's a bit too shady here.</p>
                            <p className="text-xs text-yellow-600 mt-1">Try moving me to a brighter spot so I can photosynthesize better.</p>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="font-semibold text-slate-900 text-lg">Recent Readings</h3>
                <button
                  onClick={downloadCSV}
                  disabled={recentReadings.length === 0}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Download size={16} />
                  Download CSV
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-200">
                      <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Time</th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700 flex items-center gap-1">
                        <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                        Soil
                      </th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">
                        <span className="flex items-center gap-1">
                          <span className="w-2 h-2 bg-cyan-500 rounded-full"></span>
                          Humidity
                        </span>
                      </th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">
                        <span className="flex items-center gap-1">
                          <span className="w-2 h-2 bg-orange-500 rounded-full"></span>
                          Temp
                        </span>
                      </th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">
                        <span className="flex items-center gap-1">
                          <span className="w-2 h-2 bg-yellow-500 rounded-full"></span>
                          Light
                        </span>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentReadings.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="text-center py-8 text-slate-400">
                          No readings yet
                        </td>
                      </tr>
                    ) : (
                      recentReadings.slice(0, 10).map((reading, index) => (
                        <tr key={index} className="border-b border-slate-100 hover:bg-slate-50">
                          <td className="py-3 px-4 text-sm text-slate-600">{reading.timestamp.toLocaleTimeString()}</td>
                          <td className="py-3 px-4 text-sm text-slate-900 font-medium">{reading.soil}</td>
                          <td className="py-3 px-4 text-sm text-slate-900 font-medium">
                            {reading.humidity.toFixed(1)}%
                          </td>
                          <td className="py-3 px-4 text-sm text-slate-900 font-medium">{reading.temp.toFixed(1)}°C</td>
                          <td className="py-3 px-4 text-sm text-slate-900 font-medium">
                            {Math.round(reading.light)} lux
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </main>
        </div>

        {showAddPlant && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6 border-b border-slate-200 flex items-center justify-between">
                <h3 className="text-xl font-bold text-slate-900">Add New Plant</h3>
                <button
                  onClick={() => setShowAddPlant(false)}
                  className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Plant Name *</label>
                  <input
                    type="text"
                    value={newPlantName}
                    onChange={(e) => setNewPlantName(e.target.value)}
                    placeholder="e.g., My Monstera"
                    className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Species (Optional)</label>
                  <input
                    type="text"
                    value={newPlantSpecies}
                    onChange={(e) => setNewPlantSpecies(e.target.value)}
                    placeholder="e.g., Monstera deliciosa"
                    className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Plant Photo</label>
                  {newPlantImage ? (
                    <div className="relative">
                      <img
                        src={newPlantImage || "/placeholder.svg"}
                        alt="Preview"
                        className="w-full h-48 object-cover rounded-xl"
                      />
                      <button
                        onClick={() => setNewPlantImage(null)}
                        className="absolute top-2 right-2 p-2 bg-red-500 text-white rounded-lg hover:bg-red-600"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-3">
                      <label className="flex flex-col items-center justify-center h-32 border-2 border-dashed border-slate-300 rounded-xl cursor-pointer hover:border-green-500 hover:bg-green-50 transition-all">
                        <Camera size={24} className="text-slate-400 mb-2" />
                        <span className="text-sm text-slate-600">Take Photo</span>
                        <input
                          type="file"
                          accept="image/*"
                          capture="environment"
                          onChange={handleImageUpload}
                          className="hidden"
                        />
                      </label>
                      <label className="flex flex-col items-center justify-center h-32 border-2 border-dashed border-slate-300 rounded-xl cursor-pointer hover:border-green-500 hover:bg-green-50 transition-all">
                        <Upload size={24} className="text-slate-400 mb-2" />
                        <span className="text-sm text-slate-600">Upload Photo</span>
                        <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                      </label>
                    </div>
                  )}
                </div>
              </div>

              <div className="p-6 border-t border-slate-200 flex gap-3">
                <button
                  onClick={() => setShowAddPlant(false)}
                  className="flex-1 px-4 py-3 bg-slate-100 text-slate-700 rounded-xl font-medium hover:bg-slate-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddPlant}
                  className="flex-1 px-4 py-3 bg-green-600 text-white rounded-xl font-semibold hover:bg-green-700 transition-colors"
                >
                  Add Plant
                </button>
              </div>
            </div>
          </div>
        )}

        {alertToast && (
          <div className="fixed bottom-4 right-4 z-50 max-w-xs w-full">
            <div className="bg-white shadow-lg rounded-2xl border border-slate-200 p-4 flex items-start gap-3">
              <div className="mt-1 text-xl">🌱</div>
              <div className="flex-1">
                <p className="text-sm text-slate-800 leading-snug">{alertToast}</p>
              </div>
              <button
                onClick={() => setAlertToast(null)}
                className="text-slate-400 hover:text-slate-600 text-xs"
              >
                ✕
              </button>
            </div>
          </div>
        )}
      </div>
    </AuthGate>
  )
}

function SensorCard({
  icon,
  label,
  value,
  unit,
  progress,
  status,
  color,
  ideal,
}: {
  icon: string
  label: string
  value: string
  unit: string
  progress: number
  status: { label: string; color: string; bg: string } | null
  color: string
  ideal: string
}) {
  return (
    <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-100 relative overflow-hidden group hover:shadow-md transition-all">
      <div className="flex items-center gap-3 mb-4">
        <div className="text-3xl">{icon}</div>
        <span className="text-sm font-medium text-slate-500">{label}</span>
      </div>
      <div className="flex items-baseline gap-2 mb-3">
        <span className="text-3xl font-bold text-slate-900">{value}</span>
        <span className="text-sm text-slate-500">{unit}</span>
      </div>
      <div className="w-full bg-slate-100 rounded-full h-2 mb-3">
        <div
          className={`${color} h-2 rounded-full transition-all duration-1000`}
          style={{ width: `${progress}%` }}
        ></div>
      </div>
      <div className="flex items-center justify-between">
        {status && (
          <div className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${status.color} ${status.bg}`}>
            {status.label}
          </div>
        )}
        <span className="text-xs text-slate-400">{ideal}</span>
      </div>
    </div>
  )
}
