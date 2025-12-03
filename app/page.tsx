"use client"

import type React from "react"
import { useEffect } from "react"
import Link from "next/link"
import {
  Droplets,
  Thermometer,
  Sun,
  Wind,
  Brain,
  Wifi,
  BatteryCharging,
  Bell,
  Smartphone,
  Settings,
  BarChart3,
} from "lucide-react"
import Image from "next/image"
import Navbar from "@/components/navbar"
import Footer from "@/components/footer"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"

export default function Home() {
  useEffect(() => {
    const observerOptions = {
      threshold: 0.1,
      rootMargin: "0px 0px -100px 0px",
    }

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("animate-fade-in-up")
        }
      })
    }, observerOptions)

    document.querySelectorAll(".scroll-animate").forEach((el) => observer.observe(el))

    return () => observer.disconnect()
  }, [])

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <Navbar />

      {/* Hero Section */}
      <section className="relative overflow-hidden pt-20 pb-28 lg:pt-32 lg:pb-40 bg-gradient-to-br from-green-50 via-white to-blue-50">
        <div className="absolute top-0 right-0 -z-10 opacity-20 translate-x-1/3 -translate-y-1/3">
          <div className="w-[800px] h-[800px] bg-green-400 rounded-full blur-3xl animate-pulse"></div>
        </div>
        <div className="absolute bottom-0 left-0 -z-10 opacity-20 -translate-x-1/3 translate-y-1/3">
          <div className="w-[600px] h-[600px] bg-blue-400 rounded-full blur-3xl animate-pulse"></div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Left: Title and Text */}
            <div className="animate-fade-in-up">
              <div className="inline-flex items-center px-4 py-2 rounded-full bg-green-100 border border-green-200 text-green-700 text-sm font-medium mb-8">
                <span className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse"></span>
                Now with AI Vision Support
              </div>
              <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold text-slate-900 tracking-tight mb-6 leading-tight">
                Smart Plant Care with{" "}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-green-600 to-blue-600">
                  AI & IoT
                </span>
              </h1>
              <p className="text-xl text-slate-600 mb-8 leading-relaxed">
                Monitor your indoor plants with real-time sensors for soil moisture, temperature, light, and humidity.
                Get personalized AI-powered care recommendations to keep your plants thriving.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 mb-12">
                <Link
                  href="/auth"
                  className="px-8 py-4 rounded-xl bg-green-600 text-white font-semibold shadow-lg shadow-green-500/30 hover:bg-green-700 hover:shadow-green-500/40 transition-all transform hover:-translate-y-1 text-center"
                >
                  Get Started Free
                </Link>
                <button className="px-8 py-4 rounded-xl bg-white text-slate-700 border-2 border-slate-200 font-semibold hover:bg-slate-50 transition-all flex items-center justify-center gap-2">
                  <span>Watch Demo</span>
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M6.3 2.841A1.5 1.5 0 004 4.11V15.89a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z" />
                  </svg>
                </button>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-6">
                <div>
                  <div className="text-3xl font-bold text-green-600">2+</div>
                  <div className="text-sm text-slate-600">Months Battery</div>
                </div>
                <div>
                  <div className="text-3xl font-bold text-green-600">4</div>
                  <div className="text-sm text-slate-600">Sensor Types</div>
                </div>
                <div>
                  <div className="text-3xl font-bold text-green-600">24/7</div>
                  <div className="text-sm text-slate-600">Monitoring</div>
                </div>
              </div>
            </div>

            {/* Right: Device Image */}
            <div className="relative animate-fade-in-up animation-delay-200">
              <div className="relative w-full h-[600px] rounded-2xl overflow-hidden shadow-2xl bg-slate-100">
                <Image
                  src="/images/device.jpg"
                  alt="PlantCare IoT Device"
                  fill
                  className="object-contain p-4"
                  priority
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16 scroll-animate opacity-0">
            <h2 className="text-4xl font-bold text-slate-900 mb-4">How It Works</h2>
            <p className="text-xl text-slate-600 max-w-3xl mx-auto">
              Get started with PlantCare AI in three simple steps. Our intuitive system makes plant monitoring
              effortless.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {/* Step 1 */}
            <div className="relative bg-white p-8 rounded-2xl shadow-lg border border-slate-100 hover:shadow-xl transition-all scroll-animate opacity-0">
              <div className="absolute -top-4 -right-4 w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold text-xl shadow-lg">
                01
              </div>
              <div className="w-16 h-16 bg-green-100 rounded-xl flex items-center justify-center mb-6">
                <Settings className="text-green-600" size={32} />
              </div>
              <h3 className="text-2xl font-bold text-slate-900 mb-4">Setup Device</h3>
              <p className="text-slate-600 leading-relaxed">
                Place the solar-powered IoT device in your plant pot. The device automatically calibrates sensors and
                begins monitoring.
              </p>
            </div>

            {/* Step 2 */}
            <div className="relative bg-white p-8 rounded-2xl shadow-lg border border-slate-100 hover:shadow-xl transition-all scroll-animate opacity-0">
              <div className="absolute -top-4 -right-4 w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold text-xl shadow-lg">
                02
              </div>
              <div className="w-16 h-16 bg-green-100 rounded-xl flex items-center justify-center mb-6">
                <Smartphone className="text-green-600" size={32} />
              </div>
              <h3 className="text-2xl font-bold text-slate-900 mb-4">Connect App</h3>
              <p className="text-slate-600 leading-relaxed">
                Pair your device via Bluetooth and add your plant details. Our AI identifies the species and sets
                optimal care parameters.
              </p>
            </div>

            {/* Step 3 */}
            <div className="relative bg-white p-8 rounded-2xl shadow-lg border border-slate-100 hover:shadow-xl transition-all scroll-animate opacity-0">
              <div className="absolute -top-4 -right-4 w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold text-xl shadow-lg">
                03
              </div>
              <div className="w-16 h-16 bg-green-100 rounded-xl flex items-center justify-center mb-6">
                <BarChart3 className="text-green-600" size={32} />
              </div>
              <h3 className="text-2xl font-bold text-slate-900 mb-4">Monitor & Care</h3>
              <p className="text-slate-600 leading-relaxed">
                Receive real-time data, personalized recommendations, and alerts. Track your plant's health progress
                over time.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Advanced Features Section */}
      <section className="py-20 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16 scroll-animate opacity-0">
            <h2 className="text-4xl font-bold text-slate-900 mb-4">Advanced Features for Plant Care</h2>
            <p className="text-xl text-slate-600 max-w-3xl mx-auto">
              Our IoT-enabled system combines cutting-edge sensors with AI technology to provide comprehensive plant
              monitoring and care recommendations.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Feature Cards */}
            <div className="scroll-animate opacity-0">
              <FeatureCard
                icon={<Droplets className="text-blue-600" size={24} />}
                title="Soil Moisture Monitoring"
                description="Real-time soil moisture detection with VWC percentage and color-coded LED indicators."
                bgColor="bg-blue-50"
              />
            </div>
            <div className="scroll-animate opacity-0">
              <FeatureCard
                icon={<Thermometer className="text-orange-600" size={24} />}
                title="Temperature Tracking"
                description="Precise temperature monitoring with species-specific optimal range recommendations."
                bgColor="bg-orange-50"
              />
            </div>
            <div className="scroll-animate opacity-0">
              <FeatureCard
                icon={<Sun className="text-yellow-600" size={24} />}
                title="Light Measurement"
                description="PAR (Photosynthetically Active Radiation) measurement for optimal plant growth."
                bgColor="bg-yellow-50"
              />
            </div>
            <div className="scroll-animate opacity-0">
              <FeatureCard
                icon={<Wind className="text-cyan-600" size={24} />}
                title="Humidity Sensing"
                description="Air moisture level monitoring to prevent fungal diseases and optimize growth."
                bgColor="bg-cyan-50"
              />
            </div>
            <div className="scroll-animate opacity-0">
              <FeatureCard
                icon={<Brain className="text-purple-600" size={24} />}
                title="AI Plant Identification"
                description="Advanced AI algorithms identify plant species from photos and provide personalized care."
                bgColor="bg-purple-50"
              />
            </div>
            <div className="scroll-animate opacity-0">
              <FeatureCard
                icon={<Wifi className="text-green-600" size={24} />}
                title="Mobile Connectivity"
                description="Bluetooth connectivity for real-time data sync without requiring Wi-Fi connection."
                bgColor="bg-green-50"
              />
            </div>
            <div className="scroll-animate opacity-0">
              <FeatureCard
                icon={<BatteryCharging className="text-red-600" size={24} />}
                title="2+ Month Battery"
                description="Solar-powered operation with ultra-low power consumption for extended battery life."
                bgColor="bg-red-50"
              />
            </div>
            <div className="scroll-animate opacity-0">
              <FeatureCard
                icon={<Bell className="text-indigo-600" size={24} />}
                title="Real-time Alerts"
                description="Instant notifications for watering needs, temperature changes, and care recommendations."
                bgColor="bg-indigo-50"
              />
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-20 bg-white">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16 scroll-animate opacity-0">
            <h2 className="text-4xl font-bold text-slate-900 mb-4">Frequently Asked Questions</h2>
            <p className="text-xl text-slate-600">Everything you need to know about PlantCare AI</p>
          </div>

          <Accordion type="single" collapsible className="space-y-4 scroll-animate opacity-0">
            <AccordionItem value="item-1" className="bg-slate-50 rounded-xl border border-slate-200 px-6">
              <AccordionTrigger className="text-left font-semibold hover:no-underline">
                How accurate are the sensor readings?
              </AccordionTrigger>
              <AccordionContent className="text-slate-600">
                Our sensors provide highly accurate readings with ±2% accuracy for soil moisture, ±0.5°C for
                temperature, and ±3% for humidity. The system is calibrated for various soil types and plant species.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-2" className="bg-slate-50 rounded-xl border border-slate-200 px-6">
              <AccordionTrigger className="text-left font-semibold hover:no-underline">
                How long does the battery last?
              </AccordionTrigger>
              <AccordionContent className="text-slate-600">
                With solar charging, the device can last 12+ months on a single charge. The solar panel continuously
                recharges during daylight hours, ensuring uninterrupted operation.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-3" className="bg-slate-50 rounded-xl border border-slate-200 px-6">
              <AccordionTrigger className="text-left font-semibold hover:no-underline">
                Do I need Wi-Fi for the device to work?
              </AccordionTrigger>
              <AccordionContent className="text-slate-600">
                No, the device uses Bluetooth connectivity to sync with your smartphone. It works completely offline and
                doesn't require a Wi-Fi connection.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-4" className="bg-slate-50 rounded-xl border border-slate-200 px-6">
              <AccordionTrigger className="text-left font-semibold hover:no-underline">
                Can it identify any plant species?
              </AccordionTrigger>
              <AccordionContent className="text-slate-600">
                Our AI can identify over 10,000 common plant species with 85%+ accuracy. Simply upload a photo and the
                system will recognize the plant and provide specific care instructions.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-5" className="bg-slate-50 rounded-xl border border-slate-200 px-6">
              <AccordionTrigger className="text-left font-semibold hover:no-underline">
                Is the device waterproof?
              </AccordionTrigger>
              <AccordionContent className="text-slate-600">
                Yes, the device is IP65 rated, making it splash-proof and safe for use in plant pots. However, it should
                not be fully submerged in water.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-6" className="bg-slate-50 rounded-xl border border-slate-200 px-6">
              <AccordionTrigger className="text-left font-semibold hover:no-underline">
                How many plants can I monitor?
              </AccordionTrigger>
              <AccordionContent className="text-slate-600">
                You can monitor unlimited plants with our app. Each device monitors one plant, and you can add as many
                devices as you need to your account.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-7" className="bg-slate-50 rounded-xl border border-slate-200 px-6">
              <AccordionTrigger className="text-left font-semibold hover:no-underline">
                What happens if my plant needs immediate attention?
              </AccordionTrigger>
              <AccordionContent className="text-slate-600">
                The app sends instant push notifications when sensor readings indicate critical conditions like
                extremely dry soil or temperature extremes. You'll receive actionable recommendations immediately.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-8" className="bg-slate-50 rounded-xl border border-slate-200 px-6">
              <AccordionTrigger className="text-left font-semibold hover:no-underline">
                Is there a subscription fee?
              </AccordionTrigger>
              <AccordionContent className="text-slate-600">
                No! PlantCare AI is completely free to use. All features including AI analysis, real-time monitoring,
                and unlimited plant tracking are included at no cost.
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>
      </section>

      <Footer />
    </div>
  )
}

function FeatureCard({
  icon,
  title,
  description,
  bgColor,
}: { icon: React.ReactNode; title: string; description: string; bgColor: string }) {
  return (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 hover:shadow-lg transition-all group">
      <div
        className={`w-12 h-12 ${bgColor} rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}
      >
        {icon}
      </div>
      <h3 className="text-lg font-bold text-slate-900 mb-2">{title}</h3>
      <p className="text-slate-600 text-sm leading-relaxed">{description}</p>
    </div>
  )
}
