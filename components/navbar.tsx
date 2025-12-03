"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { Leaf, Menu, X, Sparkles, LogOut, User } from "lucide-react"
import { useAuth } from "@/lib/auth-context"

export default function Navbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const pathname = usePathname()
  const router = useRouter()
  const { isLoggedIn, userEmail, logout, isDemo } = useAuth()

  const handleLogout = async () => {
    await logout()
    setMobileMenuOpen(false)
    router.push("/")
  }

  return (
    <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-lg shadow-sm border-b border-slate-200/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <Link href="/" className="flex items-center cursor-pointer group">
            <div className="w-10 h-10 bg-green-500 rounded-xl flex items-center justify-center mr-3 shadow-lg shadow-green-500/30 group-hover:shadow-green-500/50 transition-all">
              <Leaf className="text-white" size={24} />
            </div>
            <span className="font-bold text-xl tracking-tight text-slate-800">
              PlantCare<span className="text-green-600">AI</span>
            </span>
          </Link>

          {/* Desktop Menu */}
          <div className="hidden md:flex items-center space-x-8">
            <Link
              href="/"
              className={`text-sm font-medium transition-colors ${
                pathname === "/" ? "text-green-600" : "text-slate-600 hover:text-green-600"
              }`}
            >
              Home
            </Link>
            {isLoggedIn ? (
              <Link
                href="/dashboard"
                className={`text-sm font-medium transition-colors ${
                  pathname === "/dashboard" ? "text-green-600" : "text-slate-600 hover:text-green-600"
                }`}
              >
                Dashboard
              </Link>
            ) : (
              <Link
                href="/auth"
                className="text-sm font-medium text-slate-400 hover:text-green-600 transition-colors"
                title="Login to access Dashboard"
              >
                Dashboard 🔒
              </Link>
            )}
            <Link
              href="/ai-assistant"
              className={`text-sm font-medium transition-colors flex items-center gap-1 ${
                pathname === "/ai-assistant" ? "text-green-600" : "text-slate-600 hover:text-green-600"
              }`}
            >
              <Sparkles size={16} className="text-blue-500" />
              AI Assistant
            </Link>

            {isLoggedIn ? (
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 px-3 py-1.5 bg-green-50 rounded-lg border border-green-100">
                  <User size={14} className="text-green-600" />
                  <span className="text-xs font-medium text-green-700">
                    {isDemo ? "Demo User" : userEmail?.split("@")[0] || "User"}
                  </span>
                </div>
                <button
                  onClick={handleLogout}
                  className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-200 transition-colors flex items-center gap-2"
                >
                  <LogOut size={16} />
                  Logout
                </button>
              </div>
            ) : (
              <Link
                href="/auth"
                className="px-6 py-2 bg-green-600 text-white rounded-lg text-sm font-semibold shadow-lg shadow-green-500/30 hover:bg-green-700 hover:shadow-green-500/40 transition-all"
              >
                Get Started
              </Link>
            )}
          </div>

          {/* Mobile Menu Button */}
          <div className="flex items-center md:hidden">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-md text-slate-600 hover:text-green-600 hover:bg-slate-100"
            >
              {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-white border-b border-slate-200">
          <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
            <Link
              href="/"
              onClick={() => setMobileMenuOpen(false)}
              className="block px-3 py-2 rounded-md text-base font-medium text-slate-700 hover:text-green-600 hover:bg-green-50"
            >
              Home
            </Link>
            {isLoggedIn ? (
              <Link
                href="/dashboard"
                onClick={() => setMobileMenuOpen(false)}
                className="block px-3 py-2 rounded-md text-base font-medium text-slate-700 hover:text-green-600 hover:bg-green-50"
              >
                Dashboard
              </Link>
            ) : (
              <Link
                href="/auth"
                onClick={() => setMobileMenuOpen(false)}
                className="block px-3 py-2 rounded-md text-base font-medium text-slate-400 hover:text-green-600"
                title="Login to access Dashboard"
              >
                Dashboard 🔒
              </Link>
            )}
            <Link
              href="/ai-assistant"
              onClick={() => setMobileMenuOpen(false)}
              className="block px-3 py-2 rounded-md text-base font-medium text-slate-700 hover:text-green-600 hover:bg-green-50"
            >
              AI Assistant
            </Link>
            <div className="pt-4 border-t border-slate-100 mt-2">
              {isLoggedIn ? (
                <>
                  <div className="px-3 py-2 mb-2">
                    <div className="flex items-center gap-2 p-2 bg-green-50 rounded-lg border border-green-100">
                      <User size={14} className="text-green-600" />
                      <span className="text-xs font-medium text-green-700">
                        {isDemo ? "Demo User" : userEmail?.split("@")[0] || "User"}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={handleLogout}
                    className="w-full px-3 py-2 bg-slate-100 text-slate-700 rounded-md text-base font-medium hover:bg-slate-200 flex items-center justify-center gap-2"
                  >
                    <LogOut size={16} />
                    Logout
                  </button>
                </>
              ) : (
                <Link
                  href="/auth"
                  onClick={() => setMobileMenuOpen(false)}
                  className="block w-full px-3 py-2 bg-green-600 text-white text-center rounded-md text-base font-semibold hover:bg-green-700"
                >
                  Get Started
                </Link>
              )}
            </div>
          </div>
        </div>
      )}
    </nav>
  )
}
