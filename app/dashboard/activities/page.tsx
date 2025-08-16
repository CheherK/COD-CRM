"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Activity,
  RefreshCw,
  Search,
  Filter,
  Calendar,
  User,
  Package,
  Shield,
  Settings,
  Eye,
  Download,
} from "lucide-react"
import { AuthGuard } from "@/components/auth-guard"
import { ActivityFeed } from "@/components/activity-feed"
import { useLanguage } from "@/contexts/language-context"
import { useAuth } from "@/contexts/auth-context"
import { useToast } from "@/hooks/use-toast"
import type { UserActivity } from "@/lib/types"

function ActivitiesPageContent() {
  const { t } = useLanguage()
  const { user } = useAuth()
  const { toast } = useToast()

  const [activities, setActivities] = useState<UserActivity[]>([])
  const [filteredActivities, setFilteredActivities] = useState<UserActivity[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [filterType, setFilterType] = useState("all")
  const [filterUser, setFilterUser] = useState("all")
  const [dateRange, setDateRange] = useState("all")
  const [stats, setStats] = useState({
    total: 0,
    today: 0,
    thisWeek: 0,
    thisMonth: 0,
    byType: {} as Record<string, number>,
  })

  useEffect(() => {
    loadActivities()
    loadStats()
  }, [])

  useEffect(() => {
    filterActivities()
  }, [activities, searchTerm, filterType, filterUser, dateRange])

  const loadActivities = async () => {
    try {
      setLoading(true)
      const response = await fetch("/api/activities?limit=200", {
        credentials: "include",
      })

      if (response.ok) {
        const data = await response.json()
        if (data.success && Array.isArray(data.activities)) {
          setActivities(data.activities)
        } else {
          setActivities([])
        }
      } else {
        throw new Error("Failed to load activities")
      }
    } catch (error) {
      console.error("Error loading activities:", error)
      toast({
        title: t("error"),
        description: t("failedToLoadActivities"),
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const loadStats = async () => {
    try {
      const response = await fetch("/api/activities/stats", {
        credentials: "include",
      })

      if (response.ok) {
        const data = await response.json()
        setStats(data.stats || stats)
      }
    } catch (error) {
      console.error("Error loading activity stats:", error)
    }
  }

  const filterActivities = () => {
    let filtered = [...activities]

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(
        (activity) =>
          activity.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
          activity.type.toLowerCase().includes(searchTerm.toLowerCase()) ||
          activity.user?.username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          activity.user?.firstName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          activity.user?.lastName?.toLowerCase().includes(searchTerm.toLowerCase()),
      )
    }

    // Type filter
    if (filterType !== "all") {
      filtered = filtered.filter((activity) => activity.type === filterType)
    }

    // User filter (admin only)
    if (filterUser !== "all" && user?.role === "ADMIN") {
      filtered = filtered.filter((activity) => activity.userId === filterUser)
    }

    // Date range filter
    const now = new Date()
    if (dateRange !== "all") {
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
      const thisWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
      const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1)

      filtered = filtered.filter((activity) => {
        const activityDate = new Date(activity.createdAt || activity.timestamp)
        switch (dateRange) {
          case "today":
            return activityDate >= today
          case "week":
            return activityDate >= thisWeek
          case "month":
            return activityDate >= thisMonth
          default:
            return true
        }
      })
    }

    setFilteredActivities(filtered)
  }

  const exportActivities = async () => {
    try {
      const csvContent = [
        ["Date", "Type", "Description", "User", "IP Address"].join(","),
        ...filteredActivities.map((activity) =>
          [
            new Date(activity.createdAt || activity.timestamp).toISOString(),
            activity.type,
            `"${activity.description.replace(/"/g, '""')}"`,
            activity.user ? `${activity.user.firstName} ${activity.user.lastName} (${activity.user.username})` : "",
            activity.ipAddress || "",
          ].join(","),
        ),
      ].join("\n")

      const blob = new Blob([csvContent], { type: "text/csv" })
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.href = url
      link.download = `activities-${new Date().toISOString().split("T")[0]}.csv`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)

      toast({
        title: t("success"),
        description: t("activitiesExportedSuccessfully"),
      })
    } catch (error) {
      console.error("Error exporting activities:", error)
      toast({
        title: t("error"),
        description: t("failedToExportActivities"),
        variant: "destructive",
      })
    }
  }

  const getActivityIcon = (type: string) => {
    switch (type) {
      case "LOGIN":
      case "LOGOUT":
      case "LOGIN_FAILED":
        return <Shield className="h-5 w-5" />
      case "ORDER_CREATED":
      case "ORDER_UPDATED":
      case "ORDER_DELETED":
      case "ORDERS_BULK_DELETED":
      case "ORDERS_BULK_UPDATED":
      case "ORDERS_EXPORTED":
        return <Package className="h-5 w-5" />
      case "USER_CREATED":
      case "CREATE_USER":
      case "USER_UPDATED":
      case "USER_DELETED":
      case "PROFILE_UPDATED":
        return <User className="h-5 w-5" />
      case "PASSWORD_CHANGED":
      case "SETTINGS_UPDATED":
        return <Settings className="h-5 w-5" />
      default:
        return <Activity className="h-5 w-5" />
    }
  }

  const getUniqueUsers = () => {
    const users = activities
      .filter((activity) => activity.user)
      .reduce((acc: any[], activity) => {
        const existing = acc.find((u) => u.id === activity.user!.id)
        if (!existing) {
          acc.push(activity.user!)
        }
        return acc
      }, [])
    return users
  }

  const getActivityTypes = () => {
    const types = [...new Set(activities.map((activity) => activity.type))]
    return types.sort()
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-purple-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{t("activityManagement")}</h1>
          <p className="text-gray-600 dark:text-gray-400">{t("viewAndAnalyzeSystemActivity")}</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={exportActivities} variant="outline">
            <Download className="h-4 w-4 mr-2" />
            {t("exportActivities")}
          </Button>
          <Button onClick={loadActivities} variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" />
            {t("refresh")}
          </Button>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t("totalActivities")}</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground">{t("allTimeTotal")}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t("todayActivities")}</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.today}</div>
            <p className="text-xs text-muted-foreground">{t("activitiesToday")}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t("weeklyActivities")}</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.thisWeek}</div>
            <p className="text-xs text-muted-foreground">{t("activitiesThisWeek")}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t("monthlyActivities")}</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.thisMonth}</div>
            <p className="text-xs text-muted-foreground">{t("activitiesThisMonth")}</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            {t("filters")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">{t("search")}</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder={t("searchActivities")}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">{t("activityType")}</label>
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger>
                  <SelectValue placeholder={t("selectType")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("allTypes")}</SelectItem>
                  {getActivityTypes().map((type) => (
                    <SelectItem key={type} value={type}>
                      {t(`activityTypes.${type}`) || type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {user?.role === "ADMIN" && (
              <div className="space-y-2">
                <label className="text-sm font-medium">{t("user")}</label>
                <Select value={filterUser} onValueChange={setFilterUser}>
                  <SelectTrigger>
                    <SelectValue placeholder={t("selectUser")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t("allUsers")}</SelectItem>
                    {getUniqueUsers().map((user) => (
                      <SelectItem key={user.id} value={user.id}>
                        {user.firstName} {user.lastName} ({user.username})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-2">
              <label className="text-sm font-medium">{t("dateRange")}</label>
              <Select value={dateRange} onValueChange={setDateRange}>
                <SelectTrigger>
                  <SelectValue placeholder={t("selectDateRange")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("allTime")}</SelectItem>
                  <SelectItem value="today">{t("today")}</SelectItem>
                  <SelectItem value="week">{t("thisWeek")}</SelectItem>
                  <SelectItem value="month">{t("thisMonth")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="list" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="list" className="flex items-center gap-2">
            <Activity className="h-4 w-4" />
            {t("activityList")}
          </TabsTrigger>
          <TabsTrigger value="summary" className="flex items-center gap-2">
            <Eye className="h-4 w-4" />
            {t("summary")}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="list">
          <Card>
            <CardHeader>
              <CardTitle>{t("activityLog")}</CardTitle>
              <CardDescription>
                {filteredActivities.length} {t("activitiesFound")} ({activities.length} {t("total")})
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4 max-h-96 overflow-y-auto">
                {filteredActivities.length === 0 ? (
                  <div className="text-center py-8">
                    <Activity className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500">{t("noActivitiesFound")}</p>
                  </div>
                ) : (
                  filteredActivities.map((activity) => (
                    <div
                      key={activity.id}
                      className="flex items-start space-x-4 p-4 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                    >
                      <div className="flex-shrink-0 mt-1">{getActivityIcon(activity.type)}</div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline">{t(`activityTypes.${activity.type}`) || activity.type}</Badge>
                            {activity.user && (
                              <span className="text-sm text-gray-600 dark:text-gray-400">
                                by {activity.user.firstName} {activity.user.lastName} (@{activity.user.username})
                              </span>
                            )}
                          </div>
                          <span className="text-xs text-gray-500">
                            {new Date(activity.createdAt || activity.timestamp).toLocaleString()}
                          </span>
                        </div>
                        <p className="text-sm text-gray-700 dark:text-gray-300 mb-2">{activity.description}</p>
                        {(activity.ipAddress || activity.metadata) && (
                          <div className="flex items-center gap-4 text-xs text-gray-500">
                            {activity.ipAddress && <span>IP: {activity.ipAddress}</span>}
                            {activity.metadata && Object.keys(activity.metadata).length > 0 && (
                              <span>
                                {Object.entries(activity.metadata)
                                  .filter(([key, value]) => value && key !== "orderId" && key !== "targetUserId")
                                  .map(([key, value]) => `${key}: ${value}`)
                                  .join(", ")}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="summary">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>{t("activityTypeBreakdown")}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {Object.entries(stats.byType)
                    .sort(([, a], [, b]) => b - a)
                    .map(([type, count]) => (
                      <div key={type} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {getActivityIcon(type)}
                          <span className="text-sm font-medium">{t(`activityTypes.${type}`) || type}</span>
                        </div>
                        <Badge variant="secondary">{count}</Badge>
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>

            <ActivityFeed title={t("recentActivity")} limit={10} showRefresh={false} className="h-fit" />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}

export default function ActivitiesPage() {
  return (
    <AuthGuard>
      <ActivitiesPageContent />
    </AuthGuard>
  )
}
