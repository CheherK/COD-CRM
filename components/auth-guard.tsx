"use client"

import type React from "react"

import { useAuth } from "@/contexts/auth-context"
import { useRouter } from "next/navigation"
import { useEffect } from "react"
import { isAdmin, hasPermission } from "@/lib/auth"

interface AuthGuardProps {
  children: React.ReactNode
  requireAdmin?: boolean
  requirePermission?: string
}

export function AuthGuard({ children, requireAdmin = false, requirePermission }: AuthGuardProps) {
  const { user, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.push("/login")
        return
      }

      if (requireAdmin && !isAdmin(user)) {
        router.push("/dashboard")
        return
      }

      if (requirePermission && !hasPermission(user, requirePermission)) {
        router.push("/dashboard")
        return
      }
    }
  }, [user, loading, router, requireAdmin, requirePermission])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-t-2 border-b-2 border-purple-600"></div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  if (requireAdmin && !isAdmin(user)) {
    return null
  }

  if (requirePermission && !hasPermission(user, requirePermission)) {
    return null
  }

  return <>{children}</>
}
