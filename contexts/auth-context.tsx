"use client"

import type React from "react"
import { createContext, useContext, useEffect, useState } from "react"
import type { AuthUser } from "@/lib/types"

interface LoginCredentials {
  username: string
  password: string
}

interface AuthContextType {
  user: AuthUser | null
  login: (credentials: LoginCredentials) => Promise<boolean>
  logout: () => Promise<void>
  loading: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)

  // Check for existing session on mount
  useEffect(() => {
    checkAuthStatus()
  }, [])

  const checkAuthStatus = async () => {
    try {
      console.log("🔍 Checking auth status...")

      const response = await fetch("/api/auth/me", {
        method: "GET",
        credentials: "include",
      })

      if (response.ok) {
        const data = await response.json()
        if (data.user) {
          console.log("✅ User session restored:", data.user.username)
          setUser(data.user)
        }
      } else {
        console.log("❌ No valid session found")
        setUser(null)
      }
    } catch (error) {
      console.error("❌ Error checking auth status:", error)
      setUser(null)
    } finally {
      setLoading(false)
    }
  }

  const login = async (credentials: LoginCredentials): Promise<boolean> => {
    try {
      console.log("🔐 AuthContext: Attempting login for:", credentials.username)

      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify(credentials),
      })

      console.log("📡 AuthContext: Login response status:", response.status)

      if (!response.ok) {
        console.log("❌ AuthContext: Login failed with status:", response.status)
        return false
      }

      const data = await response.json()
      console.log("📦 AuthContext: Login response data:", data)

      if (data.success && data.user) {
        console.log("✅ AuthContext: Login successful for:", data.user.username)
        console.log("✅ AuthContext: User state updated:", data.user)
        setUser(data.user)
        return true
      } else {
        console.log("❌ AuthContext: Login failed:", data.error)
        return false
      }
    } catch (error) {
      console.error("❌ AuthContext: Login error:", error)
      return false
    }
  }

  const logout = async (): Promise<void> => {
    try {
      console.log("🔓 AuthContext: Logging out user:", user?.username)

      await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "include",
      })

      console.log("✅ AuthContext: Logout API called")
    } catch (error) {
      console.error("❌ AuthContext: Logout error:", error)
    } finally {
      setUser(null)
      console.log("🔄 AuthContext: User state cleared")
    }
  }

  return <AuthContext.Provider value={{ user, login, logout, loading }}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
