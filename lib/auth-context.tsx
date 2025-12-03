"use client"

import type React from "react"
import { createContext, useContext, useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import type { User } from "@supabase/supabase-js"

type AuthContextType = {
  isLoggedIn: boolean
  user: User | null
  userEmail: string | null
  login: (email: string, password: string) => Promise<void>
  loginWithGoogle: () => Promise<void>
  loginDemo: () => void
  logout: () => Promise<void>
  isDemo: boolean
  isLoading: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isDemo, setIsDemo] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    const checkSession = async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession()
        setUser(session?.user ?? null)
        console.log("[v0] Session check:", session ? "User logged in" : "No session")
      } catch (error) {
        console.error("[v0] Error checking session:", error)
      }

      // Check for demo mode
      const demoMode = localStorage.getItem("plantcare_demo")
      if (demoMode === "true") {
        setIsDemo(true)
      }

      setIsLoading(false)
    }

    checkSession()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      console.log("[v0] Auth state changed:", event)
      setUser(session?.user ?? null)

      if (event === "SIGNED_IN" && session) {
        setIsDemo(false)
        localStorage.removeItem("plantcare_demo")
      }
    })

    return () => subscription.unsubscribe()
  }, [supabase])

  const login = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })
    if (error) throw error
    setUser(data.user)
    setIsDemo(false)
    localStorage.removeItem("plantcare_demo")
  }

  const loginWithGoogle = async () => {
    console.log("[v0] Starting Google OAuth login...")
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/dashboard`,
        queryParams: {
          access_type: "offline",
          prompt: "consent",
        },
      },
    })
    if (error) {
      console.error("[v0] Google OAuth error:", error)
      throw error
    }
    console.log("[v0] Google OAuth redirect initiated")
  }

  const loginDemo = () => {
    setIsDemo(true)
    localStorage.setItem("plantcare_demo", "true")
  }

  const logout = async () => {
    await supabase.auth.signOut()
    setUser(null)
    setIsDemo(false)
    localStorage.removeItem("plantcare_demo")
  }

  return (
    <AuthContext.Provider
      value={{
        isLoggedIn: !!user || isDemo,
        user,
        userEmail: user?.email ?? (isDemo ? "demo@plantcare.ai" : null),
        login,
        loginWithGoogle,
        loginDemo,
        logout,
        isDemo,
        isLoading,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider")
  }
  return context
}
