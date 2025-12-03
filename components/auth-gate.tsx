"use client"

import type React from "react"

import { useAuth } from "@/lib/auth-context"
import Link from "next/link"
import { Lock, Sparkles } from "lucide-react"

export default function AuthGate({
  children,
  requireAuth = true,
}: { children: React.ReactNode; requireAuth?: boolean }) {
  const { isLoggedIn } = useAuth()

  if (!requireAuth || isLoggedIn) {
    return <>{children}</>
  }

  return (
    <div className="min-h-[calc(100vh-64px)] bg-gradient-to-br from-green-50 via-white to-blue-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
          <div className="bg-gradient-to-r from-green-500 to-blue-500 p-6 text-white text-center">
            <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Lock size={32} />
            </div>
            <h2 className="text-2xl font-bold mb-2">Authentication Required</h2>
            <p className="text-white/90 text-sm">Please login or signup to access this feature</p>
          </div>

          <div className="p-8">
            <div className="space-y-4 mb-6">
              <div className="flex items-start gap-3 p-4 bg-green-50 rounded-xl border border-green-100">
                <Sparkles className="text-green-600 flex-shrink-0 mt-1" size={20} />
                <div>
                  <p className="text-sm font-semibold text-green-900">Full Access</p>
                  <p className="text-xs text-green-700 mt-1">
                    Connect your devices, monitor plants, and get AI recommendations
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-4 bg-blue-50 rounded-xl border border-blue-100">
                <Sparkles className="text-blue-600 flex-shrink-0 mt-1" size={20} />
                <div>
                  <p className="text-sm font-semibold text-blue-900">Secure & Private</p>
                  <p className="text-xs text-blue-700 mt-1">Your plant data is encrypted and stored securely</p>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <Link
                href="/auth"
                className="block w-full py-3 px-4 bg-gradient-to-r from-green-600 to-blue-600 text-white text-center rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-0.5"
              >
                Login / Sign Up
              </Link>

              <Link
                href="/"
                className="block w-full py-3 px-4 bg-slate-100 text-slate-700 text-center rounded-xl font-medium hover:bg-slate-200 transition-colors"
              >
                Back to Home
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
