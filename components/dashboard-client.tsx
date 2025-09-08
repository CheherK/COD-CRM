"use client"

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { 
  Package, 
  Users, 
  ShoppingCart, 
  TrendingUp, 
  Clock, 
  CheckCircle, 
  XCircle, 
  Truck,
  RefreshCw,
  AlertCircle,
  Calendar,
  CalendarDays,
  CalendarRange
} from "lucide-react"
import { ActivityFeed } from "@/components/activity-feed"
import { useLanguage } from "@/contexts/language-context"
import { useAuth } from '@/contexts/auth-context';
import { useRouter } from 'next/navigation';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';

interface ChartDataPoint {
  date: string
  day: string
  orders: number
  revenue: number
}

interface DashboardStats {
  orders: {
    total: number
    pending: number
    abandoned: number
    attempted: number
    confirmed: number
    uploaded: number
    deleted: number
    rejected: number
    archived: number
    deposit: number
    inTransit: number
    delivered: number
    returned: number
    deliveryRate: number
    returnRate: number
    completionRate: number
  }
  revenue: {
    total: number
    daily: number
    weekly: number
    monthly: number
  }
  orderCounts: {
    daily: number
    weekly: number
    monthly: number
  }
  chartData: ChartDataPoint[]
  users?: {
    total: number
    active: number
    disabled: number
    admins: number
    staff: number
  }
  products?: {
    total: number
    active: number
    inactive: number
  }
  delivery?: {
    totalShipments: number
    activeShipments: number
    completedShipments: number
    totalAgencies: number
    enabledAgencies: number
  }
  activity: {
    recent: number
  }
}

interface UserInfo {
  id: string
  username: string
  role: string
}

interface RecentOrder {
  id: string
  customerName: string
  status: string
  total: number | string
  createdAt: string
}

export function DashboardClient() {
  const { t } = useLanguage()
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [user, setUser] = useState<UserInfo | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [recentOrders, setRecentOrders] = useState<RecentOrder[]>([])
  const { user: currentUser } = useAuth()
  const router = useRouter()

  // Load data from localStorage on component mount
  useEffect(() => {
    if (currentUser?.role !== 'ADMIN') {
      router.push('/dashboard/orders')
      return
    }

    const savedStats = localStorage.getItem('dashboard-stats')
    const savedUser = localStorage.getItem('dashboard-user')
    const savedRecentOrders = localStorage.getItem('dashboard-recent-orders')
    
    if (savedStats) setStats(JSON.parse(savedStats))
    if (savedUser) setUser(JSON.parse(savedUser))
    if (savedRecentOrders) setRecentOrders(JSON.parse(savedRecentOrders))
  }, [])

  const fetchStats = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const response = await fetch('/api/stats')
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      
      const data = await response.json()
      
      if (data.success) {
        setStats(data.stats)
        setUser(data.user)
        
        // Save to localStorage
        localStorage.setItem('dashboard-stats', JSON.stringify(data.stats))
        localStorage.setItem('dashboard-user', JSON.stringify(data.user))
      } else {
        throw new Error(data.error || 'Failed to fetch stats')
      }
    } catch (error) {
      console.error('Failed to fetch dashboard stats:', error)
      setError(error instanceof Error ? error.message : 'Failed to load dashboard')
    } finally {
      setLoading(false)
    }
  }

  const fetchRecentOrders = async () => {
    try {
      const response = await fetch('/api/orders?limit=5&sortBy=createdAt&sortOrder=desc')
      if (response.ok) {
        const data = await response.json()
        if (data.success) {
          setRecentOrders(data.orders || [])
          localStorage.setItem('dashboard-recent-orders', JSON.stringify(data.orders || []))
        }
      }
    } catch (error) {
      console.error('Failed to fetch recent orders:', error)
    }
  }

  const handleRefresh = () => {
    fetchStats()
    fetchRecentOrders()
  }

  const getStatusColor = (status: string) => {
    switch (status.toUpperCase()) {
      case "PENDING":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300"
      case "CONFIRMED":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300"
      case "UPLOADED":
        return "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300"
      case "IN_TRANSIT":
        return "bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-300"
      case "DELIVERED":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300"
      case "RETURNED":
        return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300"
      case "REJECTED":
        return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300"
      case "ARCHIVED":
        return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300"
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300"
    }
  }

  const getStatusText = (status: string) => {
    switch (status.toUpperCase()) {
      case "PENDING": return t("pending") || "Pending"
      case "CONFIRMED": return t("confirmed") || "Confirmed"
      case "UPLOADED": return t("uploaded") || "Uploaded"
      case "IN_TRANSIT": return t("inTransit") || "In Transit"
      case "DELIVERED": return t("delivered") || "Delivered"
      case "RETURNED": return t("returned") || "Returned"
      case "REJECTED": return t("rejected") || "Rejected"
      case "ARCHIVED": return t("archived") || "Archived"
      default: return status
    }
  }

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white dark:bg-gray-800 p-4 border rounded-lg shadow-lg">
          <p className="font-medium">{`Date: ${label}`}</p>
          <p className="text-blue-600">{`Orders: ${payload[0]?.value || 0}`}</p>
          <p className="text-green-600">{`Revenue: ${payload[1]?.value?.toFixed(2) || 0} TND`}</p>
        </div>
      );
    }
    return null;
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{t("dashboard") || "Dashboard"}</h1>
          <p className="text-gray-600 dark:text-gray-400">{t("loading") || "Loading..."}...</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(6)].map((_, i) => (
            <Card key={i}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  <div className="h-4 w-24 bg-muted animate-pulse rounded"></div>
                </CardTitle>
                <div className="h-4 w-4 bg-muted animate-pulse rounded"></div>
              </CardHeader>
              <CardContent>
                <div className="h-8 w-16 bg-muted animate-pulse rounded"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{t("dashboard") || "Dashboard"}</h1>
            <p className="text-gray-600 dark:text-gray-400">{t("welcomeBack") || "Welcome back"}!</p>
          </div>
          <Button onClick={handleRefresh} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            {t("retry") || "Retry"}
          </Button>
        </div>
        <Card className="border-red-200">
          <CardContent className="flex items-center space-x-2 pt-6">
            <AlertCircle className="h-5 w-5 text-red-500" />
            <span className="text-red-700">{error}</span>
          </CardContent>
        </Card>
      </div>
    )
  }

  const isAdmin = user?.role === 'ADMIN'

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{t("dashboard") || "Dashboard"}</h1>
          <p className="text-gray-600 dark:text-gray-400">
            {t("welcomeBack") || "Welcome back"}, {user?.username}! {t("hereWhatHappeningWithOrders") || "Here's what's happening with your orders today."}
          </p>
        </div>
        <Button onClick={handleRefresh} variant="outline" size="sm">
          <RefreshCw className="h-4 w-4 mr-2" />
          {t("refresh") || "Refresh"}
        </Button>
      </div>

      {/* Time-based Revenue Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t("ordersToday") || "Orders Today"}</CardTitle>
            <Calendar className="h-4 w-4 text-emerald-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.revenue.daily.toFixed(2) || 0} TND</div>
            <p className="text-xs text-muted-foreground">
              {stats?.orderCounts?.daily || 0} {t("orders") || "orders"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t("ordersThisWeek") || "Orders This Week"}</CardTitle>
            <CalendarDays className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.revenue.weekly.toFixed(2) || 0} TND</div>
            <p className="text-xs text-muted-foreground">
              {stats?.orderCounts?.weekly || 0} {t("orders") || "orders"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t("ordersThisMonth") || "Orders This Month"}</CardTitle>
            <CalendarRange className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.revenue.monthly.toFixed(2) || 0} TND</div>
            <p className="text-xs text-muted-foreground">
              {stats?.orderCounts?.monthly || 0} {t("orders") || "orders"}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t("totalOrders") || "Total Orders"}</CardTitle>
            <Package className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.orders.total || 0}</div>
            <p className="text-xs text-muted-foreground">
              {stats?.orders.completionRate || 0}% {t("completionRate") || "completion rate"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t("pendingOrders") || "Pending Orders"}</CardTitle>
            <Clock className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.orders.pending || 0}</div>
            <p className="text-xs text-muted-foreground">
              {t("awaitingConfirmation") || "Awaiting confirmation"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t("deliveredOrders") || "Delivered Orders"}</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.orders.delivered || 0}</div>
            <p className="text-xs text-muted-foreground">
              {stats?.orders.deliveryRate || 0}% {t("deliveryRate") || "delivery rate"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t("totalRevenue") || "Total Revenue"}</CardTitle>
            <TrendingUp className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.revenue.total.toFixed(2) || 0} TND</div>
            <p className="text-xs text-muted-foreground">
              {t("fromDeliveredOrders") || "From delivered orders"}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Daily Orders Chart - Full Width */}
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-blue-600" />
            {t("dailyOrdersTrend") || "Daily Orders Trend - Last 2 Weeks"}
          </CardTitle>
          <CardDescription>{t("ordersAndRevenueByDay") || "Daily orders count and revenue for the past 14 days"}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={stats?.chartData || []}
                margin={{
                  top: 5,
                  right: 30,
                  left: 20,
                  bottom: 5,
                }}
              >
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis 
                  dataKey="day" 
                  tick={{ fontSize: 12 }}
                  className="text-muted-foreground"
                />
                <YAxis 
                  yAxisId="orders"
                  orientation="left"
                  tick={{ fontSize: 12 }}
                  className="text-muted-foreground"
                />
                <YAxis 
                  yAxisId="revenue"
                  orientation="right"
                  tick={{ fontSize: 12 }}
                  className="text-muted-foreground"
                />
                <Tooltip content={<CustomTooltip />} />
                <Line
                  yAxisId="orders"
                  type="monotone"
                  dataKey="orders"
                  stroke="#3b82f6"
                  strokeWidth={3}
                  dot={{ fill: '#3b82f6', strokeWidth: 2, r: 4 }}
                  activeDot={{ r: 6, stroke: '#3b82f6', strokeWidth: 2, fill: '#ffffff' }}
                />
                <Line
                  yAxisId="revenue"
                  type="monotone"
                  dataKey="revenue"
                  stroke="#10b981"
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  dot={{ fill: '#10b981', strokeWidth: 2, r: 3 }}
                  activeDot={{ r: 5, stroke: '#10b981', strokeWidth: 2, fill: '#ffffff' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Additional Stats for Admins */}
      {isAdmin && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {stats?.users && (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{t("teamMembers") || "Team Members"}</CardTitle>
                <Users className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.users.total}</div>
                <p className="text-xs text-muted-foreground">
                  {stats.users.active} {t("active") || "active"} • {stats.users.admins} {t("admins") || "admins"}
                </p>
              </CardContent>
            </Card>
          )}

          {stats?.products && (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{t("products") || "Products"}</CardTitle>
                <ShoppingCart className="h-4 w-4 text-orange-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.products.total}</div>
                <p className="text-xs text-muted-foreground">
                  {stats.products.active} {t("active") || "active"} • {stats.products.inactive} {t("inactive") || "inactive"}
                </p>
              </CardContent>
            </Card>
          )}

          {stats?.delivery && (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{t("deliveryAgencies") || "Delivery Agencies"}</CardTitle>
                <Truck className="h-4 w-4 text-blue-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.delivery.totalAgencies}</div>
                <p className="text-xs text-muted-foreground">
                  {stats.delivery.enabledAgencies} {t("enabled") || "enabled"} • {stats.delivery.activeShipments} {t("activeShipments") || "active shipments"}
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Order Status Overview */}
      <Card>
        <CardHeader>
          <CardTitle>{t("orderStatusOverview") || "Order Status Overview"}</CardTitle>
          <CardDescription>{t("currentOrderDistribution") || "Current order distribution across all statuses"}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-4 border rounded-lg">
              <div className="text-2xl font-bold text-yellow-600">{stats?.orders.pending || 0}</div>
              <p className="text-sm text-muted-foreground">{t("pending") || "Pending"}</p>
            </div>
            <div className="text-center p-4 border rounded-lg">
              <div className="text-2xl font-bold text-blue-600">{stats?.orders.confirmed || 0}</div>
              <p className="text-sm text-muted-foreground">{t("confirmed") || "Confirmed"}</p>
            </div>
            <div className="text-center p-4 border rounded-lg">
              <div className="text-2xl font-bold text-indigo-600">{stats?.orders.inTransit || 0}</div>
              <p className="text-sm text-muted-foreground">{t("inTransit") || "In Transit"}</p>
            </div>
            <div className="text-center p-4 border rounded-lg">
              <div className="text-2xl font-bold text-green-600">{stats?.orders.delivered || 0}</div>
              <p className="text-sm text-muted-foreground">{t("delivered") || "Delivered"}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Recent Orders and Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Orders */}
        <Card>
          <CardHeader>
            <CardTitle>{t("recentOrders") || "Recent Orders"}</CardTitle>
            <CardDescription>{t("latestOrdersFromStore") || "Latest orders from your store"}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentOrders.length > 0 ? (
                recentOrders.map((order) => (
                  <div key={order.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center space-x-4">
                      <div>
                        <p className="font-medium">{order.id.substring(0, 8)}</p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">{order.customerName}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-4">
                      <Badge className={getStatusColor(order.status)}>{getStatusText(order.status)}</Badge>
                      <p className="font-medium">{Number(order.total).toFixed(2)} TND</p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Package className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>{t("noRecentOrders") || "No recent orders found"}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Activity Feed */}
        <ActivityFeed limit={8} title={t("systemActivity") || "System Activity"} />
      </div>
    </div>
  )
}