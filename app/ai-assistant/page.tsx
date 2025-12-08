"use client"

import type React from "react"
import { useState, useRef, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { getLatestSensorData, getPlantType } from "@/lib/services/sensorService"
import type { AQISummary } from "@/lib/services/aqiService"
import { mapAQIFromPayload } from "@/lib/services/aqiService"
import { getSimpleForecast, getWateringAdvice } from "@/lib/services/weatherService"
import Navbar from "@/components/navbar"
import { Send, Sparkles, Trash2, X, Paperclip, Camera, ImageIcon } from "lucide-react"

interface Message {
  role: "user" | "ai"
  content: string
  timestamp: Date
  image?: string
}

export default function AIAssistant() {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "ai",
      content:
        "Hello! I'm Blossom AI, your personal botanist. 🌿\n\nI can help you with:\n• Plant disease detection from photos\n• Care recommendations and schedules\n• Species identification\n• Real-time sensor analysis\n\nAsk me anything or upload a photo to check for diseases!",
      timestamp: new Date(),
    },
  ])
  const [input, setInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [selectedImage, setSelectedImage] = useState<string | null>(null)
  const [showUploadMenu, setShowUploadMenu] = useState(false)
  const [sensorData, setSensorData] = useState<any>(null)
  const [plantType, setPlantType] = useState<string>('your plant')
  const [userId, setUserId] = useState<string | null>(null)
  const [aqiSummary, setAqiSummary] = useState<AQISummary | null>(null)
  const [wateringAdvice, setWateringAdvice] = useState<string | null>(null)
  const chatContainerRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const cameraInputRef = useRef<HTMLInputElement>(null)
  const weatherFetchedRef = useRef<boolean>(false)

  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight
    }
  }, [messages])

  // Fetch sensor data and plant type when component mounts
  useEffect(() => {
    const fetchData = async () => {
      try {
        const supabase = createClient()
        const { data: { session } } = await supabase.auth.getSession()
        const uid = session?.user.id

        if (uid) {
          setUserId(uid)

          const [latestSensor, currentPlantType, chatResult] = await Promise.all([
            getLatestSensorData(uid),
            getPlantType(uid),
            supabase
              .from('chat_messages')
              .select('*')
              .eq('user_id', uid)
              .order('created_at', { ascending: true }),
          ])

          setSensorData(latestSensor)
          if (currentPlantType) setPlantType(currentPlantType)

          if (chatResult.data && chatResult.data.length > 0) {
            const historyMessages: Message[] = chatResult.data.map((row: any) => ({
              role: row.role === 'user' ? 'user' : 'ai',
              content: row.content ?? '',
              timestamp: row.created_at ? new Date(row.created_at) : new Date(),
              image: row.image ?? undefined,
            }))

            setMessages((prev) => {
              // keep initial welcome message, then append history
              const welcome = prev[0]
              return [welcome, ...historyMessages]
            })
          }

          // Fetch AQI context (same WAQI token as dashboard)
          try {
            const token = process.env.NEXT_PUBLIC_AQI_TOKEN
            if (token) {
              const res = await fetch(`https://api.waqi.info/feed/here/?token=${token}`)
              if (res.ok) {
                const json = await res.json()
                const summary = mapAQIFromPayload(json)
                if (summary) setAqiSummary(summary)
              }
            }
          } catch (error) {
            console.error("Error fetching AQI for AI assistant:", error)
          }

          // Fetch one-time weather-based watering advice if we have sensor data
          try {
            if (latestSensor && typeof window !== "undefined" && "geolocation" in navigator && !weatherFetchedRef.current) {
              const soilPercent: number | null =
                typeof latestSensor.soil_moisture === "number" ? 100 - ((latestSensor.soil_moisture / 4095) * 100) : null

              if (soilPercent != null) {
                navigator.geolocation.getCurrentPosition(
                  async (pos) => {
                    try {
                      weatherFetchedRef.current = true
                      const forecast = await getSimpleForecast(pos.coords.latitude, pos.coords.longitude)
                      const advice = getWateringAdvice(soilPercent, forecast)
                      if (advice) setWateringAdvice(advice)
                    } catch (err) {
                      console.error("Error fetching weather advice for AI assistant:", err)
                    }
                  },
                  (err) => {
                    console.warn("Geolocation error for AI assistant weather advice:", err)
                  },
                  { enableHighAccuracy: false, timeout: 5000 },
                )
              }
            }
          } catch (error) {
            console.error("Error initializing weather advice for AI assistant:", error)
          }
        }
      } catch (error) {
        console.error('Error fetching initial data:', error)
      }
    }
    fetchData()
  }, [])

  const callGeminiAPI = async (userMessage: string, imageBase64?: string) => {
    const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY
    if (!apiKey) {
      console.error("Gemini API key is not set in NEXT_PUBLIC_GEMINI_API_KEY")
      throw new Error("Gemini API key is missing")
    }

    const { GoogleGenerativeAI } = require("@google/generative-ai")
    const genAI = new GoogleGenerativeAI(apiKey)
    const model = genAI.getGenerativeModel({ 
      model: "gemini-2.0-flash-exp",
      generationConfig: {
        maxOutputTokens: 1000,
        temperature: 0.7,
      },
    })

    // Enhanced system prompt with sensor, plant, AQI and weather context
    let systemPrompt = `You are Blossom AI, a friendly and knowledgeable plant care assistant. You're helping a user take care of their ${plantType}.

Current Plant Context:`

    // Add sensor data to context if available
    if (sensorData) {
      systemPrompt += `\n- Current Temperature: ${sensorData.temperature}°C
- Humidity: ${sensorData.humidity}%
- Soil Moisture: ${sensorData.soil_moisture !== null ? (100 - ((sensorData.soil_moisture / 4095) * 100)).toFixed(1) : 'N/A'}%
- Light Intensity: ${sensorData.light_intensity} lux`
    }

    if (aqiSummary) {
      systemPrompt += `\n- Outdoor AQI near the user: ${aqiSummary.aqi} (${aqiSummary.category}) in ${aqiSummary.city}`
    }

    if (wateringAdvice) {
      systemPrompt += `\n- Recent watering advice based on soil and weather: ${wateringAdvice}`
    }

    systemPrompt += `\n\nGuidelines:
1. Be concise and to the point
2. Avoid using asterisks or markdown formatting
3. Adjust answer length based on the question
4. For plant care questions, consider the current sensor readings, AQI context, and watering advice provided
5. If analyzing a plant issue, be specific about possible causes and solutions
6. Use emojis naturally and sparingly
7. If asked about sensor data, explain what the values mean for the plant
8. For general plant care, provide specific advice for ${plantType} when possible`

    try {
      if (imageBase64) {
        const imagePart = {
          inlineData: {
            data: imageBase64.split(",")[1],
            mimeType: "image/jpeg",
          },
        }
        const result = await model.generateContent([systemPrompt + "\n\nUser question: " + userMessage, imagePart])
        return result.response.text()
      } else {
        const result = await model.generateContent(systemPrompt + "\n\nUser question: " + userMessage)
        return result.response.text()
      }
    } catch (error: any) {
      console.error("Gemini API Error:", error)
      throw new Error("Failed to get AI response. Please try again.")
    }
  }

  const handleSendMessage = async () => {
    if ((!input.trim() && !selectedImage) || isLoading) return

    const supabase = createClient()

    const userMessage: Message = {
      role: "user",
      content: input,
      timestamp: new Date(),
      image: selectedImage || undefined,
    }

    setMessages((prev) => [...prev, userMessage])
    const currentInput = input
    const currentImage = selectedImage
    setInput("")
    setSelectedImage(null)
    setIsLoading(true)

    try {
      // Persist user message if authenticated
      if (userId) {
        try {
          await supabase.from('chat_messages').insert({
            role: 'user',
            content: currentInput,
            image: currentImage,
            user_id: userId,
          })
        } catch (e) {
          console.error('Error saving user chat message:', e)
        }
      }

      const aiResponseText = await callGeminiAPI(currentInput, currentImage || undefined)
      const aiResponse: Message = {
        role: "ai",
        content: aiResponseText,
        timestamp: new Date(),
      }
      setMessages((prev) => [...prev, aiResponse])

      // Persist AI response if authenticated
      if (userId) {
        try {
          await supabase.from('chat_messages').insert({
            role: 'ai',
            content: aiResponseText,
            user_id: userId,
          })
        } catch (e) {
          console.error('Error saving AI chat message:', e)
        }
      }
    } catch (error: any) {
      const errorMessage: Message = {
        role: "ai",
        content: `⚠️ Sorry, I encountered an error. Please try again in a moment.`,
        timestamp: new Date(),
      }
      setMessages((prev) => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
    }
  }

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onloadend = () => {
        setSelectedImage(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
    setShowUploadMenu(false)
  }

  const quickQuestions = ["🩺 Is my plant healthy?", "💧 Watering schedule?", "🍂 Yellow leaves?", "☀️ Light needs?"]

  const clearChat = async () => {
    const supabase = createClient()

    if (userId) {
      const { error } = await supabase
        .from('chat_messages')
        .delete()
        .eq('user_id', userId)

      if (error) {
        console.error('Error clearing chat history:', error)
      }
    }

    setMessages([
      {
        role: "ai",
        content:
          "Hello! I'm Blossom AI, your personal botanist. 🌿\n\nI can help you with:\n• Plant disease detection from photos\n• Care recommendations and schedules\n• Species identification\n• Real-time sensor analysis\n\nAsk me anything or upload a photo to check for diseases!",
        timestamp: new Date(),
      },
    ])
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />

      <div className="flex h-[calc(100vh-64px)] bg-slate-50">
        <div className="w-full max-w-4xl mx-auto flex flex-col h-full shadow-2xl bg-white">
          {/* Header */}
          <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-gradient-to-r from-green-50 to-blue-50">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gradient-to-tr from-green-400 to-blue-500 rounded-full flex items-center justify-center text-white shadow-lg">
                <Sparkles size={24} />
              </div>
              <div>
                <h2 className="font-bold text-slate-900 text-lg">Blossom AI</h2>
                <p className="text-xs text-slate-500">Powered by Gemini 2.0 Flash • Online ✓</p>
              </div>
            </div>
            <button
              onClick={clearChat}
              className="text-slate-400 hover:text-red-500 text-sm flex items-center gap-1 transition-colors px-3 py-2 hover:bg-red-50 rounded-lg"
            >
              <Trash2 size={16} />
              Clear
            </button>
          </div>

          {/* Chat Messages */}
          <div ref={chatContainerRef} className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/50">
            {messages.map((message, index) => (
              <div
                key={index}
                className={`flex gap-4 ${message.role === "user" ? "flex-row-reverse" : ""} max-w-[85%] ${
                  message.role === "user" ? "ml-auto" : ""
                }`}
              >
                {message.role === "ai" && (
                  <div className="w-10 h-10 bg-gradient-to-tr from-green-400 to-blue-500 rounded-full flex-shrink-0 flex items-center justify-center text-white text-sm font-bold shadow-lg">
                    AI
                  </div>
                )}
                <div
                  className={`${
                    message.role === "user"
                      ? "bg-gradient-to-r from-green-600 to-blue-600 text-white rounded-2xl rounded-tr-none shadow-lg"
                      : "bg-white border border-slate-200 rounded-2xl rounded-tl-none shadow-sm"
                  } p-4`}
                >
                  {message.image && (
                    <img
                      src={message.image || "/placeholder.svg"}
                      alt="Uploaded"
                      className="w-full rounded-xl mb-3 max-h-64 object-cover"
                    />
                  )}
                  <p
                    className={`text-sm leading-relaxed whitespace-pre-line ${
                      message.role === "user" ? "text-white" : "text-slate-700"
                    }`}
                  >
                    {message.content}
                  </p>
                  <p className={`text-xs mt-2 ${message.role === "user" ? "text-green-100" : "text-slate-400"}`}>
                    {message.timestamp.toLocaleTimeString()}
                  </p>
                </div>
                {message.role === "user" && (
                  <div className="w-10 h-10 bg-slate-700 rounded-full flex-shrink-0 flex items-center justify-center text-white text-sm font-bold shadow-lg">
                    U
                  </div>
                )}
              </div>
            ))}
            {isLoading && (
              <div className="flex gap-4 max-w-[85%]">
                <div className="w-10 h-10 bg-gradient-to-tr from-green-400 to-blue-500 rounded-full flex-shrink-0 flex items-center justify-center text-white text-sm font-bold shadow-lg">
                  AI
                </div>
                <div className="bg-white border border-slate-200 p-4 rounded-2xl rounded-tl-none shadow-sm">
                  <div className="flex gap-2">
                    <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce"></div>
                    <div
                      className="w-2 h-2 bg-slate-400 rounded-full animate-bounce"
                      style={{ animationDelay: "0.2s" }}
                    ></div>
                    <div
                      className="w-2 h-2 bg-slate-400 rounded-full animate-bounce"
                      style={{ animationDelay: "0.4s" }}
                    ></div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Input Area */}
          <div className="p-4 bg-white border-t border-slate-100">
            {/* Quick Questions */}
            <div className="flex gap-2 mb-3 overflow-x-auto pb-2">
              {quickQuestions.map((question, index) => (
                <button
                  key={index}
                  onClick={() => setInput(question.substring(2))}
                  className="whitespace-nowrap px-3 py-1.5 bg-slate-100 hover:bg-slate-200 rounded-full text-xs text-slate-600 transition-colors"
                >
                  {question}
                </button>
              ))}
            </div>

            {/* Image Preview */}
            {selectedImage && (
              <div className="mb-3 relative inline-block">
                <img
                  src={selectedImage || "/placeholder.svg"}
                  alt="Preview"
                  className="h-20 rounded-lg border-2 border-green-500"
                />
                <button
                  onClick={() => setSelectedImage(null)}
                  className="absolute -top-2 -right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600"
                >
                  <X size={14} />
                </button>
              </div>
            )}

            {/* Input Controls */}
            <div className="flex gap-2">
              <input type="file" ref={fileInputRef} accept="image/*" onChange={handleImageUpload} className="hidden" />
              <input
                type="file"
                ref={cameraInputRef}
                accept="image/*"
                capture="environment"
                onChange={handleImageUpload}
                className="hidden"
              />

              {/* Upload Menu Button */}
              <div className="relative">
                <button
                  onClick={() => setShowUploadMenu(!showUploadMenu)}
                  className="p-3 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
                >
                  <Paperclip size={20} />
                </button>

                {showUploadMenu && (
                  <div className="absolute bottom-full left-0 mb-2 bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden min-w-[200px] z-50">
                    <button
                      onClick={() => cameraInputRef.current?.click()}
                      className="w-full px-4 py-3 text-left text-sm hover:bg-slate-50 flex items-center gap-3"
                    >
                      <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                        <Camera className="text-blue-600" size={16} />
                      </div>
                      <div>
                        <p className="font-medium text-slate-900">Take Photo</p>
                        <p className="text-xs text-slate-500">Use camera</p>
                      </div>
                    </button>
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="w-full px-4 py-3 text-left text-sm hover:bg-slate-50 flex items-center gap-3 border-t border-slate-100"
                    >
                      <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                        <ImageIcon className="text-green-600" size={16} />
                      </div>
                      <div>
                        <p className="font-medium text-slate-900">Choose File</p>
                        <p className="text-xs text-slate-500">From gallery</p>
                      </div>
                    </button>
                  </div>
                )}
              </div>

              {/* Text Input */}
              <div className="flex-1 relative">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyPress={(e) => e.key === "Enter" && handleSendMessage()}
                  placeholder="Ask about your plant..."
                  className="w-full pl-4 pr-12 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500/50 focus:border-green-500"
                />
                <button
                  onClick={handleSendMessage}
                  disabled={(!input.trim() && !selectedImage) || isLoading}
                  className="absolute right-2 top-2 p-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Send size={18} />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
