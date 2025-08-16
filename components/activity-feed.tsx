"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { RefreshCw, Activity, User, Package, Settings, Shield, AlertCircle, XCircle } from "lucide-react"
import type { UserActivity } from "@/lib/types"
import { useAuth } from "@/contexts/auth-context"
import { useLanguage } from "@/contexts/language-context"

interface ActivityFeedProps {
  userId?: string
  limit?: number
  showRefresh?: boolean
  title?: string
  type?: string
  className?: string
}

export function ActivityFeed({
  userId,
  limit = 15,
  showRefresh = true,
  title,
  type,
  className = "",
}: ActivityFeedProps) {
  const { t } = useLanguage()
  const [activities, setActivities] = useState<UserActivity[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { user } = useAuth()

  const defaultTitle = title || t("recentActivity")

  const loadActivities = async () => {
    try {
      setError(null)
      const params = new URLSearchParams()

      if (userId) params.append("userId", userId)
      if (limit) params.append("limit", limit.toString())
      if (type) params.append("type", type)

      console.log("🔄 Loading activities with params:", params.toString())

      const response = await fetch(`/api/activities?${params}`, {
        method: "GET",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
      })

      if (response.ok) {
        const data = await response.json()
        console.log("✅ Activities loaded:", data)

        if (data.success && Array.isArray(data.activities)) {
          setActivities(data.activities)
        } else {
          console.warn("⚠️ Unexpected response format:", data)
          setActivities([])
        }
      } else {
        const errorData = await response.json()
        console.error("❌ Failed to load activities:", response.status, errorData)
        setError(errorData.error || `Failed to load activities (${response.status})`)
        setActivities([])
      }
    } catch (error) {
      console.error("❌ Error loading activities:", error)
      setError("Network error while loading activities")
      setActivities([])
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    loadActivities()

    // Set up polling for real-time updates every 30 seconds
    const interval = setInterval(loadActivities, 30000)

    return () => clearInterval(interval)
  }, [userId, limit, type])

  const handleRefresh = async () => {
    setRefreshing(true)
    await loadActivities()
  }

  const getActivityIcon = (action: string) => {
    switch (action) {
      case "LOGIN":
        return <Shield className="h-4 w-4 text-green-600" />
      case "LOGOUT":
        return <Shield className="h-4 w-4 text-gray-600" />
      case "LOGIN_FAILED":
        return <XCircle className="h-4 w-4 text-red-600" />
      case "ORDER_CREATED":
        return <Package className="h-4 w-4 text-blue-600" />
      case "ORDER_UPDATED":
        return <Package className="h-4 w-4 text-yellow-600" />
      case "ORDER_DELETED":
        return <XCircle className="h-4 w-4 text-red-600" />
      case "ORDERS_BULK_DELETED":
      case "BULK_DELETE":
        return <XCircle className="h-4 w-4 text-red-600" />
      case "ORDERS_BULK_UPDATED":
      case "BULK_STATUS_UPDATE":
        return <Package className="h-4 w-4 text-orange-600" />
      case "ORDERS_EXPORTED":
      case "BULK_EXPORT":
        return <Package className="h-4 w-4 text-cyan-600" />
      case "USER_CREATED":
      case "CREATE_USER":
        return <User className="h-4 w-4 text-green-600" />
      case "USER_UPDATED":
        return <User className="h-4 w-4 text-yellow-600" />
      case "USER_DELETED":
        return <XCircle className="h-4 w-4 text-red-600" />
      case "PROFILE_UPDATED":
        return <User className="h-4 w-4 text-blue-600" />
      case "PASSWORD_CHANGED":
        return <Settings className="h-4 w-4 text-orange-600" />
      case "SETTINGS_UPDATED":
        return <Settings className="h-4 w-4 text-blue-600" />
      default:
        return <Activity className="h-4 w-4 text-gray-600" />
    }
  }

  const getActivityColor = (action: string) => {
    switch (action) {
      case "LOGIN":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300"
      case "LOGOUT":
        return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300"
      case "LOGIN_FAILED":
        return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300"
      case "ORDER_CREATED":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300"
      case "ORDER_UPDATED":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300"
      case "ORDER_DELETED":
      case "ORDERS_BULK_DELETED":
      case "BULK_DELETE":
        return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300"
      case "USER_CREATED":
      case "CREATE_USER":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300"
      case "USER_UPDATED":
        return "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300"
      case "USER_DELETED":
        return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300"
      case "PROFILE_UPDATED":
        return "bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-300"
      case "PASSWORD_CHANGED":
        return "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300"
      case "ORDERS_BULK_UPDATED":
      case "BULK_STATUS_UPDATE":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300"
      case "ORDERS_EXPORTED":
      case "BULK_EXPORT":
        return "bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-300"
      case "SETTINGS_UPDATED":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300"
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300"
    }
  }

  const formatDate = (date: Date | string) => {
    const d = new Date(date)
    const now = new Date()
    const diffInMinutes = Math.floor((now.getTime() - d.getTime()) / (1000 * 60))

    if (diffInMinutes < 1) return t("justNow")
    if (diffInMinutes < 60) return `${diffInMinutes} ${t("minutesAgo")}`
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)} ${t("hoursAgo")}`
    if (diffInMinutes < 10080) return `${Math.floor(diffInMinutes / 1440)} ${t("daysAgo")}`

    return d.toLocaleDateString()
  }

  const formatActionText = (action: string) => {
    // Handle specific translations
    const translations: Record<string, string> = {
      LOGIN: t("login"),
      LOGOUT: t("logout"),
      LOGIN_FAILED: t("loginFailed") || "Login Failed",
      ORDER_CREATED: t("orderCreated") || "Order Created",
      ORDER_UPDATED: t("orderUpdated") || "Order Updated",
      ORDER_DELETED: t("orderDeleted") || "Order Deleted",
      ORDERS_BULK_DELETED: t("bulkOrdersDeleted") || "Bulk Orders Deleted",
      ORDERS_BULK_UPDATED: t("bulkOrdersUpdated") || "Bulk Orders Updated",
      ORDERS_EXPORTED: t("ordersExported") || "Orders Exported",
      USER_CREATED: t("userCreated") || "User Created",
      CREATE_USER: t("userCreated") || "User Created",
      USER_UPDATED: t("userUpdated") || "User Updated",
      USER_DELETED: t("userDeleted") || "User Deleted",
      PROFILE_UPDATED: t("profileUpdated") || "Profile Updated",
      PASSWORD_CHANGED: t("passwordChanged") || "Password Changed",
      SETTINGS_UPDATED: t("settingsUpdated") || "Settings Updated",
    }

    return (
      translations[action] ||
      action
        ?.split("_")
        .map((word) => word.charAt(0) + word.slice(1).toLowerCase())
        .join(" ")
    )
  }

  if (loading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            {defaultTitle}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-purple-600"></div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            {defaultTitle}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <AlertCircle className="h-12 w-12 text-red-400 mx-auto mb-4" />
            <p className="text-red-600 mb-4">{error}</p>
            <Button onClick={handleRefresh} variant="outline" size="sm">
              <RefreshCw className="h-4 w-4 mr-2" />
              {t("retry")}
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            {defaultTitle}
            {activities.length > 0 && (
              <Badge variant="secondary" className="ml-2">
                {activities.length}
              </Badge>
            )}
          </CardTitle>
          {showRefresh && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={refreshing}
              className="flex items-center gap-2 bg-transparent"
            >
              <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
              {t("refresh")}
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {activities.length === 0 ? (
          <div className="text-center py-8">
            <Activity className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">{t("noRecentActivity")}</p>
          </div>
        ) : (
          <div className="space-y-4 max-h-96 overflow-y-auto">
            {activities.map((activity) => (
              <div
                key={activity.id}
                className="flex items-start space-x-4 p-3 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                <div className="flex-shrink-0 mt-1">{getActivityIcon(activity.action || activity.type)}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge className={getActivityColor(activity.action || activity.type)}>
                        {formatActionText(activity.action || activity.type)}
                      </Badge>
                      {!userId && activity.user && (
                        <span className="text-sm text-gray-600 dark:text-gray-400">
                          by {activity.user.firstName} {activity.user.lastName} (@{activity.user.username})
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-gray-500 flex-shrink-0">
                      {formatDate(activity.createdAt || activity.timestamp)}
                    </span>
                  </div>
                  <p className="text-sm text-gray-700 dark:text-gray-300 break-words">
                    {activity.details || activity.description}
                  </p>
                  {(activity.ipAddress || activity.metadata) && (
                    <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                      {activity.ipAddress && <span>IP: {activity.ipAddress}</span>}
                      {activity.metadata && Object.keys(activity.metadata).length > 0 && (
                        <span>
                          {Object.entries(activity.metadata)
                            .filter(([key, value]) => key !== "orderId" && key !== "targetUserId" && value)
                            .map(([key, value]) => `${key}: ${value}`)
                            .join(", ")}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
