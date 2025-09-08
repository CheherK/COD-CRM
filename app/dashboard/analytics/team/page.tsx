
"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { 
  Calendar as CalendarIcon, 
  CheckCircle, 
  XCircle, 
  Package, 
  Phone, 
  RefreshCw, 
  Users,
  TrendingUp,
  Activity as ActivityIcon,
  PhoneCall,
  Ban,
  Trash2,
  CheckCheck,
  Clock
} from "lucide-react"
import { format } from "date-fns"
import { cn } from "@/lib/utils"
import type { DateRange } from "react-day-picker"

interface TeamMember {
  user: {
    id: string
    name: string
    username: string
    email: string
    joinedAt: string
  }
  metrics: {
    totalOrders: number
    completedOrders: number
    processingOrders: number
    confirmedOrders: number
    rejectedOrders: number
    deletedOrders: number
    totalCallAttempts: number
    ordersWithAttempts: number
    callSuccessRate: number
    completionRate: number
    revenue: number
    recentActivities: number
    statusBreakdown: Record<string, number>
  }
}

interface TeamSummary {
  totalMembers: number
  totalOrders: number
  totalCompletedOrders: number
  totalConfirmedOrders: number
  totalRejectedOrders: number
  totalDeletedOrders: number
  totalCallAttempts: number
  totalOrdersWithAttempts: number
  totalRevenue: number
  averageCompletionRate: number
  averageCallSuccessRate: number
  topPerformer: TeamMember | null
}

interface Activity {
  id: string
  type: string
  description: string
  user: {
    id: string
    username: string
    firstName?: string
    lastName?: string
  } | null
  createdAt: string
  metadata?: any
}

interface ActivityStats {
  total: number
  byType: Array<{
    type: string
    count: number
  }>
  recent: Activity[]
  trend: Array<{
    date: string
    activities: number
  }>
}

interface TeamAnalytics {
  teamStats: TeamMember[]
  teamSummary: TeamSummary
  activities: ActivityStats
  lastUpdated: string
}

const STORAGE_KEY = "team_analytics_data"
const STORAGE_EXPIRY_KEY = "team_analytics_expiry"

export default function TeamAnalyticsPage() {
  const [analytics, setAnalytics] = useState<TeamAnalytics | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedMember, setSelectedMember] = useState("all")
  const [dateRange, setDateRange] = useState<DateRange | undefined>()
  const [lastFetchTime, setLastFetchTime] = useState<string | null>(null)

  // Load data from localStorage on component mount
  useEffect(() => {
    loadFromStorage()
  }, [])

  const loadFromStorage = () => {
    try {
      const storedData = localStorage.getItem(STORAGE_KEY)
      const storedExpiry = localStorage.getItem(STORAGE_EXPIRY_KEY)
      
      if (storedData && storedExpiry) {
        const expiryTime = new Date(storedExpiry)
        const now = new Date()
        
        // Check if data is still fresh (less than 1 hour old)
        if (now < expiryTime) {
          const parsedData = JSON.parse(storedData)
          setAnalytics(parsedData)
          setLastFetchTime(parsedData.lastUpdated)
          console.log("✅ Loaded team analytics from localStorage")
          return
        } else {
          // Data expired, clear storage
          localStorage.removeItem(STORAGE_KEY)
          localStorage.removeItem(STORAGE_EXPIRY_KEY)
        }
      }
      
      // No valid cached data, fetch new data
      fetchAnalytics()
    } catch (error) {
      console.error("Failed to load from localStorage:", error)
      fetchAnalytics()
    }
  }

  const saveToStorage = (data: TeamAnalytics) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
      // Set expiry to 1 hour from now
      const expiry = new Date(Date.now() + 60 * 60 * 1000)
      localStorage.setItem(STORAGE_EXPIRY_KEY, expiry.toISOString())
      console.log("✅ Saved team analytics to localStorage")
    } catch (error) {
      console.error("Failed to save to localStorage:", error)
    }
  }

  const fetchAnalytics = async () => {
    try {
      setLoading(true)
      setError(null)
      
      console.log("🔄 Fetching fresh team analytics...")
      const response = await fetch('/api/analytics/team', {
        cache: 'no-cache',
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      })
      
      if (!response.ok) {
        if (response.status === 403) {
          throw new Error('You need admin privileges to view team analytics')
        }
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      
      const data = await response.json()
      setAnalytics(data)
      setLastFetchTime(data.lastUpdated)
      
      // Save to localStorage
      saveToStorage(data)
      
      console.log("✅ Fresh team analytics fetched and saved")
    } catch (error) {
      console.error("Failed to fetch team analytics:", error)
      setError(error instanceof Error ? error.message : 'Failed to load team analytics')
    } finally {
      setLoading(false)
    }
  }

  const handleRefresh = () => {
    // Clear localStorage and fetch fresh data
    localStorage.removeItem(STORAGE_KEY)
    localStorage.removeItem(STORAGE_EXPIRY_KEY)
    fetchAnalytics()
  }

  if (!analytics && loading) {
    return (
      <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
        <div className="flex items-center justify-between space-y-2">
          <h2 className="text-3xl font-bold tracking-tight">Team Analytics</h2>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-6">
          {[...Array(6)].map((_, i) => (
            <Card key={i}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  <div className="h-4 w-24 bg-muted animate-pulse rounded"></div>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-8 bg-muted animate-pulse rounded"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  if (error && !analytics) {
    return (
      <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
        <div className="flex items-center justify-between space-y-2">
          <h2 className="text-3xl font-bold tracking-tight">Team Analytics</h2>
          <Button onClick={handleRefresh} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Retry
          </Button>
        </div>
        <Card className="border-red-200">
          <CardContent className="flex items-center space-x-2 pt-6">
            <XCircle className="h-5 w-5 text-red-500" />
            <span className="text-red-700">{error}</span>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      {/* Header */}
      <div className="flex items-center justify-between space-y-2">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Team Analytics</h2>
          <p className="text-muted-foreground">
            Monitor team performance and call activity
            {lastFetchTime && (
              <span className="ml-2 text-xs">
                • Last updated: {format(new Date(lastFetchTime), "MMM dd, HH:mm")}
              </span>
            )}
          </p>
        </div>
        <div className="flex items-center space-x-2">
          {analytics && !loading && (
            <Badge variant="outline" className="text-xs">
              Cached Data
            </Badge>
          )}
          <Button 
            onClick={handleRefresh} 
            variant="outline" 
            size="sm"
            disabled={loading}
          >
            <RefreshCw className={cn("h-4 w-4 mr-2", loading && "animate-spin")} />
            {loading ? "Refreshing..." : "Refresh"}
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <Select value={selectedMember} onValueChange={setSelectedMember}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="All Team Members" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Team Members</SelectItem>
            {analytics?.teamStats.map((member) => (
              <SelectItem key={member.user.id} value={member.user.id}>
                {member.user.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Popover>
          <PopoverTrigger asChild>
            <Button
              id="date"
              variant="outline"
              className={cn(
                "w-[300px] justify-start text-left font-normal",
                !dateRange && "text-muted-foreground"
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {dateRange?.from ? (
                dateRange.to ? (
                  <>
                    {format(dateRange.from, "LLL dd, y")} -{" "}
                    {format(dateRange.to, "LLL dd, y")}
                  </>
                ) : (
                  format(dateRange.from, "LLL dd, y")
                )
              ) : (
                <span>Select date range</span>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              initialFocus
              mode="range"
              defaultMonth={dateRange?.from}
              selected={dateRange}
              onSelect={setDateRange}
              numberOfMonths={2}
            />
          </PopoverContent>
        </Popover>
      </div>

      {/* Team Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Team Members</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics?.teamSummary.totalMembers || 0}</div>
            <p className="text-xs text-muted-foreground">
              Active staff members
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Calls</CardTitle>
            <PhoneCall className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics?.teamSummary.totalCallAttempts || 0}</div>
            <p className="text-xs text-muted-foreground">
              {analytics?.teamSummary.totalOrdersWithAttempts || 0} orders called
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Confirmed Orders</CardTitle>
            <CheckCheck className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics?.teamSummary.totalConfirmedOrders || 0}</div>
            <p className="text-xs text-muted-foreground">
              {analytics?.teamSummary.averageCallSuccessRate.toFixed(1) || 0}% call success
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Rejected Orders</CardTitle>
            <Ban className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics?.teamSummary.totalRejectedOrders || 0}</div>
            <p className="text-xs text-muted-foreground">
              Client rejected
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Delivered Orders</CardTitle>
            <Package className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics?.teamSummary.totalCompletedOrders || 0}</div>
            <p className="text-xs text-muted-foreground">
              Successfully delivered
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Team Revenue</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics?.teamSummary.totalRevenue.toFixed(2) || 0} TND</div>
            <p className="text-xs text-muted-foreground">
              {analytics?.teamSummary.averageCompletionRate.toFixed(1) || 0}% completion
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Top Performer */}
      {analytics?.teamSummary.topPerformer && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-green-600" />
              Top Performer
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold">{analytics.teamSummary.topPerformer.user.name}</h3>
                <p className="text-sm text-muted-foreground">@{analytics.teamSummary.topPerformer.user.username}</p>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-green-600">
                  {analytics.teamSummary.topPerformer.metrics.completedOrders}
                </div>
                <p className="text-xs text-muted-foreground">delivered orders</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Call Performance Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <PhoneCall className="h-5 w-5" />
            Call Performance Summary
          </CardTitle>
          <CardDescription>Overall team call statistics and success rates</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="text-center p-4 border rounded-lg">
              <div className="text-3xl font-bold text-blue-600 mb-2">
                {analytics?.teamSummary.totalCallAttempts || 0}
              </div>
              <p className="text-sm font-medium mb-1">Total Call Attempts</p>
              <p className="text-xs text-muted-foreground">
                Across {analytics?.teamSummary.totalOrdersWithAttempts || 0} orders
              </p>
            </div>
            
            <div className="text-center p-4 border rounded-lg">
              <div className="text-3xl font-bold text-green-600 mb-2">
                {analytics?.teamSummary.averageCallSuccessRate.toFixed(1) || 0}%
              </div>
              <p className="text-sm font-medium mb-1">Average Success Rate</p>
              <p className="text-xs text-muted-foreground">
                Calls leading to confirmation
              </p>
            </div>
            
            <div className="text-center p-4 border rounded-lg">
              <div className="text-3xl font-bold text-orange-600 mb-2">
                {analytics?.teamSummary.totalCallAttempts && analytics?.teamSummary.totalCallAttempts > 0 
                  ? (analytics.teamSummary.totalCallAttempts / analytics.teamSummary.totalOrdersWithAttempts).toFixed(1)
                  : '0'
                }
              </div>
              <p className="text-sm font-medium mb-1">Avg Calls Per Order</p>
              <p className="text-xs text-muted-foreground">
                Average attempts before resolution
              </p>
            </div>
          </div>

          {/* Team Call Distribution */}
          <div className="mt-6">
            <h4 className="text-sm font-medium mb-3">Call Distribution by Team Member</h4>
            <div className="space-y-2">
              {analytics?.teamStats
                .sort((a, b) => b.metrics.totalCallAttempts - a.metrics.totalCallAttempts)
                .map((member) => {
                  const maxCalls = Math.max(...(analytics?.teamStats.map(m => m.metrics.totalCallAttempts) || [1]))
                  const percentage = maxCalls > 0 ? (member.metrics.totalCallAttempts / maxCalls) * 100 : 0
                  
                  return (
                    <div key={member.user.id} className="flex items-center space-x-3">
                      <div className="w-24 text-sm font-medium truncate">
                        {member.user.name}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center space-x-2">
                          <div className="flex-1 bg-gray-200 rounded-full h-2">
                            <div
                              className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                          <div className="text-sm text-muted-foreground w-12 text-right">
                            {member.metrics.totalCallAttempts}
                          </div>
                        </div>
                      </div>
                      <div className="text-xs text-muted-foreground w-16 text-right">
                        {member.metrics.callSuccessRate.toFixed(1)}%
                      </div>
                    </div>
                  )
                })}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Team Members Performance */}
      <Card>
        <CardHeader>
          <CardTitle>Team Members Performance</CardTitle>
          <CardDescription>Individual team member statistics including call tracking</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {analytics?.teamStats.map((member) => (
              <div key={member.user.id} className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h4 className="font-medium">{member.user.name}</h4>
                    <p className="text-sm text-muted-foreground">@{member.user.username}</p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Badge variant={member.metrics.callSuccessRate > 60 ? "default" : "secondary"}>
                      {member.metrics.callSuccessRate.toFixed(1)}% call success
                    </Badge>
                    <Badge variant={member.metrics.completionRate > 70 ? "default" : "secondary"}>
                      {member.metrics.completionRate.toFixed(1)}% completion
                    </Badge>
                  </div>
                </div>

                {/* Call Performance Metrics */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4 p-3 bg-blue-50 rounded-lg">
                  <div className="text-center">
                    <div className="text-lg font-bold text-blue-600 flex items-center justify-center gap-1">
                      <PhoneCall className="h-4 w-4" />
                      {member.metrics.totalCallAttempts}
                    </div>
                    <p className="text-xs text-muted-foreground">Total Calls</p>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-bold text-green-600 flex items-center justify-center gap-1">
                      <CheckCheck className="h-4 w-4" />
                      {member.metrics.confirmedOrders}
                    </div>
                    <p className="text-xs text-muted-foreground">Confirmed</p>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-bold text-red-600 flex items-center justify-center gap-1">
                      <Ban className="h-4 w-4" />
                      {member.metrics.rejectedOrders}
                    </div>
                    <p className="text-xs text-muted-foreground">Rejected</p>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-bold text-gray-600 flex items-center justify-center gap-1">
                      <Trash2 className="h-4 w-4" />
                      {member.metrics.deletedOrders}
                    </div>
                    <p className="text-xs text-muted-foreground">Deleted</p>
                  </div>
                </div>
                
                {/* Order Performance Metrics */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                  <div className="text-center">
                    <div className="text-lg font-bold text-slate-600">{member.metrics.totalOrders}</div>
                    <p className="text-xs text-muted-foreground">Total Orders</p>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-bold text-purple-600">{member.metrics.completedOrders}</div>
                    <p className="text-xs text-muted-foreground">Delivered</p>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-bold text-orange-600">{member.metrics.processingOrders}</div>
                    <p className="text-xs text-muted-foreground">Processing</p>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-bold text-green-700">{member.metrics.revenue.toFixed(2)} TND</div>
                    <p className="text-xs text-muted-foreground">Revenue</p>
                  </div>
                </div>

                {/* Progress Bars */}
                <div className="space-y-3">
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>Call Success Rate</span>
                      <span>{member.metrics.callSuccessRate.toFixed(1)}%</span>
                    </div>
                    <Progress value={member.metrics.callSuccessRate} className="h-2" />
                  </div>
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>Delivery Completion Rate</span>
                      <span>{member.metrics.completionRate.toFixed(1)}%</span>
                    </div>
                    <Progress value={member.metrics.completionRate} className="h-2" />
                  </div>
                </div>

                {member.metrics.recentActivities > 0 && (
                  <div className="mt-4 pt-3 border-t">
                    <p className="text-sm text-muted-foreground">
                      <ActivityIcon className="h-4 w-4 inline mr-1" />
                      {member.metrics.recentActivities} activities in the last 30 days
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Recent Activities */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Team Activities</CardTitle>
          <CardDescription>Latest actions performed by team members</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {analytics?.activities.recent.slice(0, 10).map((activity) => (
              <div key={activity.id} className="flex items-start space-x-3 p-3 border rounded-lg">
                <div className="flex-shrink-0">
                  {activity.type === 'ORDER_CREATED' && <Package className="h-4 w-4 text-blue-500" />}
                  {activity.type === 'ORDER_UPDATED' && <Package className="h-4 w-4 text-orange-500" />}
                  {activity.type === 'ORDER_STATUS_CHANGED' && <CheckCircle className="h-4 w-4 text-green-500" />}
                  {activity.type === 'USER_LOGIN' && <Users className="h-4 w-4 text-purple-500" />}
                  {!['ORDER_CREATED', 'ORDER_UPDATED', 'ORDER_STATUS_CHANGED', 'USER_LOGIN'].includes(activity.type) && 
                    <ActivityIcon className="h-4 w-4 text-gray-500" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium truncate">
                      {activity.user ? 
                        `${activity.user.firstName && activity.user.lastName ? 
                          `${activity.user.firstName} ${activity.user.lastName}` : 
                          activity.user.username}` : 
                        'System'}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(activity.createdAt), "MMM dd, HH:mm")}
                    </p>
                  </div>
                  <p className="text-sm text-muted-foreground">{activity.description}</p>
                  <Badge variant="outline" className="text-xs mt-1">
                    {activity.type.replace(/_/g, ' ').toLowerCase()}
                  </Badge>
                </div>
              </div>
            ))}
            
            {!analytics?.activities.recent.length && (
              <div className="text-center py-8 text-muted-foreground">
                <ActivityIcon className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No recent activities found</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Activity Statistics */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Activity Types</CardTitle>
            <CardDescription>Distribution of team activities</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {analytics?.activities.byType.slice(0, 8).map((activityType, index) => {
                const colors = [
                  'bg-blue-500', 'bg-green-500', 'bg-purple-500', 'bg-orange-500',
                  'bg-red-500', 'bg-pink-500', 'bg-indigo-500', 'bg-yellow-500'
                ]
                return (
                  <div key={activityType.type} className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <div className={`w-3 h-3 rounded-full ${colors[index % colors.length]}`}></div>
                      <span className="text-sm font-medium capitalize">
                        {activityType.type.replace(/_/g, ' ').toLowerCase()}
                      </span>
                    </div>
                    <span className="text-sm text-muted-foreground">{activityType.count}</span>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Activity Trend</CardTitle>
            <CardDescription>Daily team activity over the last 14 days</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[200px] w-full">
              <div className="flex items-end justify-between h-full space-x-1">
                {analytics?.activities.trend.map((day, index) => (
                  <div key={day.date} className="flex flex-col items-center space-y-1 flex-1">
                    <div className="flex flex-col items-center space-y-1 h-full justify-end">
                      <div
                        className="w-full bg-blue-500 rounded-t min-w-[8px]"
                        style={{ 
                          height: `${Math.max((day.activities / Math.max(...analytics.activities.trend.map(d => d.activities))) * 100, day.activities > 0 ? 5 : 0)}%`,
                          minHeight: day.activities > 0 ? "4px" : "0"
                        }}
                      />
                    </div>
                    <div className="text-xs text-muted-foreground text-center rotate-45 origin-bottom-left mt-2">
                      {format(new Date(day.date), "MM/dd")}
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex justify-center mt-4">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-blue-500 rounded"></div>
                  <span className="text-sm text-muted-foreground">Daily Activities</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}