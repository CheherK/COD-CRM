"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ActivityFeed } from "./activity-feed"
import { Activity, TrendingUp, Users, Package, Shield, BarChart3, Calendar, Clock } from "lucide-react"
import { useAuth } from "@/contexts/auth-context"
import { useLanguage } from "@/contexts/language-context"

interface ActivityStats {
  total: number
  today: number
  thisWeek: number
  thisMonth: number
  byType: Record<string, number>
}

export function ActivityDashboard() {
  const { t } = useLanguage()
  const { user } = useAuth()
  const [stats, setStats] = useState<ActivityStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadStats = async () => {
    if (user?.role !== "ADMIN") return

    try {
      setError(null)
      const response = await fetch("/api/activities/stats", {
        credentials: "include",
      })

      if (response.ok) {
        const data = await response.json()
        if (data.success) {
          setStats(data.stats)
        }
      } else {
        setError("Failed to load activity statistics")
      }
    } catch (error) {
      console.error("Error loading activity stats:", error)
      setError("Network error while loading statistics")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadStats()
  }, [user])

  const getActivityTypeIcon = (type: string) => {
    switch (type) {
      case "LOGIN":
      case "LOGOUT":
      case "LOGIN_FAILED":
        return <Shield className="h-4 w-4" />
      case "ORDER_CREATED":
      case "ORDER_UPDATED":
      case "ORDER_DELETED":
        return <Package className="h-4 w-4" />
      case "USER_CREATED":
      case "USER_UPDATED":
      case "USER_DELETED":
        return <Users className="h-4 w-4" />
      default:
        return <Activity className="h-4 w-4" />
    }
  }

  const getActivityTypeColor = (type: string) => {
    switch (type) {
      case "LOGIN":
        return "text-green-600"
      case "LOGOUT":
        return "text-gray-600"
      case "LOGIN_FAILED":
        return "text-red-600"
      case "ORDER_CREATED":
        return "text-blue-600"
      case "ORDER_UPDATED":
        return "text-yellow-600"
      case "ORDER_DELETED":
        return "text-red-600"
      case "USER_CREATED":
        return "text-green-600"
      case "USER_UPDATED":
        return "text-purple-600"
      case "USER_DELETED":
        return "text-red-600"
      default:
        return "text-gray-600"
    }
  }

  if (user?.role !== "ADMIN") {
    return (
      <div className="space-y-6">
        <ActivityFeed userId={user?.id} title={t("myActivity")} limit={20} />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Statistics Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t("totalActivities") || "Total Activities"}</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t("todayActivities") || "Today"}</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.today}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t("thisWeek") || "This Week"}</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.thisWeek}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t("thisMonth") || "This Month"}</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.thisMonth}</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Activity Types Breakdown */}
      {stats && Object.keys(stats.byType).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              {t("activityByType") || "Activity by Type"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {Object.entries(stats.byType)
                .sort(([, a], [, b]) => b - a)
                .map(([type, count]) => (
                  <div key={type} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-2">
                      <div className={getActivityTypeColor(type)}>{getActivityTypeIcon(type)}</div>
                      <span className="text-sm font-medium">{type.replace(/_/g, " ")}</span>
                    </div>
                    <Badge variant="secondary">{count}</Badge>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Activity Feeds */}
      <Tabs defaultValue="all" className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="all">{t("allActivities") || "All"}</TabsTrigger>
          <TabsTrigger value="auth">{t("authentication") || "Auth"}</TabsTrigger>
          <TabsTrigger value="orders">{t("orders") || "Orders"}</TabsTrigger>
          <TabsTrigger value="users">{t("users") || "Users"}</TabsTrigger>
          <TabsTrigger value="system">{t("system") || "System"}</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="space-y-4">
          <ActivityFeed title={t("allActivities") || "All Activities"} limit={25} />
        </TabsContent>

        <TabsContent value="auth" className="space-y-4">
          <ActivityFeed title={t("authenticationActivities") || "Authentication Activities"} type="LOGIN" limit={20} />
        </TabsContent>

        <TabsContent value="orders" className="space-y-4">
          <ActivityFeed title={t("orderActivities") || "Order Activities"} type="ORDER_CREATED" limit={20} />
        </TabsContent>

        <TabsContent value="users" className="space-y-4">
          <ActivityFeed title={t("userActivities") || "User Management Activities"} type="USER_CREATED" limit={20} />
        </TabsContent>

        <TabsContent value="system" className="space-y-4">
          <ActivityFeed title={t("systemActivities") || "System Activities"} type="SYSTEM" limit={20} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
