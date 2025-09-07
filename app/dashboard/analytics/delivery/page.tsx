"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Badge } from "@/components/ui/badge"
import { 
  Calendar as CalendarIcon, 
  Package, 
  Truck, 
  RefreshCw, 
  TrendingUp,
  Clock,
  CheckCircle,
  XCircle,
  Upload
} from "lucide-react"
import { format } from "date-fns"
import { cn } from "@/lib/utils"
import type { DateRange } from "react-day-picker"

interface DeliveryMetrics {
  totalOrders: number
  deliveredOrders: number
  shippedOrders: number
  inTransitOrders: number
  returnedOrders: number
  deliveryRate: number
  shippingRate: number
  returnRate: number
  avgDeliveryTime: number
  totalShipments: number
  activeShipments: number
}

interface OrderStatus {
  status: string
  count: number
  color: string
}

interface AgencyStats {
  agencyId: string
  agencyName: string
  enabled: boolean
  shipmentCount: number
}

interface MonthlyTrend {
  month: string
  deliveries: number
}

interface RecentDelivery {
  id: string
  customerName: string
  status: string
  total: number
  updatedAt: string
  createdAt: string
}

interface DeliveryAnalytics {
  metrics: DeliveryMetrics
  charts: {
    ordersByStatus: OrderStatus[]
    agencyStats: AgencyStats[]
    monthlyTrend: MonthlyTrend[]
  }
  recentDeliveries: RecentDelivery[]
}

const getStatusColor = (status: string) => {
  switch (status.toUpperCase()) {
    case 'PENDING': return 'bg-yellow-500'
    case 'CONFIRMED': return 'bg-blue-500'
    case 'UPLOADED': return 'bg-purple-500'
    case 'IN_TRANSIT': return 'bg-indigo-500'
    case 'SHIPPED': return 'bg-cyan-500'
    case 'DELIVERED': return 'bg-green-500'
    case 'RETURNED': return 'bg-red-500'
    default: return 'bg-gray-500'
  }
}

const getStatusIcon = (status: string) => {
  switch (status.toUpperCase()) {
    case 'PENDING': return <Clock className="h-4 w-4" />
    case 'CONFIRMED': return <CheckCircle className="h-4 w-4" />
    case 'UPLOADED': return <Upload className="h-4 w-4" />
    case 'IN_TRANSIT': return <Truck className="h-4 w-4" />
    case 'SHIPPED': return <Truck className="h-4 w-4" />
    case 'DELIVERED': return <CheckCircle className="h-4 w-4" />
    case 'RETURNED': return <XCircle className="h-4 w-4" />
    default: return <Package className="h-4 w-4" />
  }
}

export default function DeliveryAnalyticsPage() {
  const [analytics, setAnalytics] = useState<DeliveryAnalytics | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedAgency, setSelectedAgency] = useState("all")
  const [dateRange, setDateRange] = useState<DateRange | undefined>()

  const fetchAnalytics = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const response = await fetch('/api/analytics/delivery')
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      
      const data = await response.json()
      setAnalytics(data.analytics)
    } catch (error) {
      console.error("Failed to fetch delivery analytics:", error)
      setError(error instanceof Error ? error.message : 'Failed to load delivery analytics')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAnalytics()
  }, [selectedAgency, dateRange])

  if (loading) {
    return (
      <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
        <div className="flex items-center justify-between space-y-2">
          <h2 className="text-3xl font-bold tracking-tight">Delivery Analytics</h2>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
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

  if (error) {
    return (
      <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
        <div className="flex items-center justify-between space-y-2">
          <h2 className="text-3xl font-bold tracking-tight">Delivery Analytics</h2>
          <Button onClick={fetchAnalytics} variant="outline" size="sm">
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
          <h2 className="text-3xl font-bold tracking-tight">Delivery Analytics</h2>
          <p className="text-muted-foreground">
            Monitor delivery performance and shipment statistics
          </p>
        </div>
        <Button onClick={fetchAnalytics} variant="outline" size="sm">
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <Select value={selectedAgency} onValueChange={setSelectedAgency}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="All Delivery Agencies" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Delivery Agencies</SelectItem>
            {analytics?.charts.agencyStats.map((agency) => (
              <SelectItem key={agency.agencyId} value={agency.agencyId}>
                {agency.agencyName}
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

      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Shipments</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics?.metrics.totalShipments || 0}</div>
            <p className="text-xs text-muted-foreground">
              {analytics?.metrics.activeShipments || 0} currently active
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Delivered Orders</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics?.metrics.deliveredOrders || 0}</div>
            <p className="text-xs text-muted-foreground">
              {analytics?.metrics.deliveryRate || 0}% delivery rate
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">In Transit</CardTitle>
            <Truck className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics?.metrics.inTransitOrders || 0}</div>
            <p className="text-xs text-muted-foreground">
              Currently shipping
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Return Rate</CardTitle>
            <XCircle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics?.metrics.returnedOrders || 0}</div>
            <p className="text-xs text-muted-foreground">
              {analytics?.metrics.returnRate || 0}% return rate
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Performance Metrics */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-center">Average Delivery Time</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center justify-center h-32">
              <div className="w-20 h-20 rounded-full border-8 border-blue-200 flex items-center justify-center">
                <div className="text-center">
                  <div className="text-lg font-bold text-blue-600">
                    {analytics?.metrics.avgDeliveryTime || 0}
                  </div>
                  <div className="text-xs text-blue-500">days</div>
                </div>
              </div>
              <p className="text-sm text-muted-foreground mt-2">Average Delivery Time</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-center">Delivery Performance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center justify-center h-32">
              <div className="w-20 h-20 rounded-full border-8 border-green-200 flex items-center justify-center">
                <div className="text-center">
                  <div className="text-lg font-bold text-green-600">
                    {analytics?.metrics.deliveryRate || 0}%
                  </div>
                </div>
              </div>
              <p className="text-sm text-muted-foreground mt-2">Success Rate</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-center">Shipping Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center justify-center h-32">
              <div className="w-20 h-20 rounded-full border-8 border-purple-200 flex items-center justify-center">
                <div className="text-center">
                  <div className="text-lg font-bold text-purple-600">
                    {analytics?.metrics.shippingRate || 0}%
                  </div>
                </div>
              </div>
              <p className="text-sm text-muted-foreground mt-2">Shipping Efficiency</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Order Status Distribution</CardTitle>
            <CardDescription>Current order statuses</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {analytics?.charts.ordersByStatus.map((status) => (
                <div key={status.status} className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div className={`w-3 h-3 rounded-full ${getStatusColor(status.status)}`}></div>
                    <span className="text-sm font-medium capitalize">
                      {status.status.toLowerCase().replace('_', ' ')}
                    </span>
                  </div>
                  <span className="text-sm text-muted-foreground">{status.count}</span>
                </div>
              ))}
              
              {!analytics?.charts.ordersByStatus.length && (
                <div className="text-center py-8 text-muted-foreground">
                  <Package className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No order data available</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Delivery Agencies</CardTitle>
            <CardDescription>Shipments by agency</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {analytics?.charts.agencyStats.map((agency) => (
                <div key={agency.agencyId} className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
                  <div className="flex items-center space-x-2">
                    <Badge variant={agency.enabled ? "default" : "secondary"}>
                      {agency.enabled ? "Active" : "Inactive"}
                    </Badge>
                    <span className="font-medium">{agency.agencyName}</span>
                  </div>
                  <span className="text-sm text-muted-foreground">{agency.shipmentCount} shipments</span>
                </div>
              ))}
              
              {!analytics?.charts.agencyStats.length && (
                <div className="text-center py-8 text-muted-foreground">
                  <Truck className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No agency data available</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Monthly Trend */}
      <Card>
        <CardHeader>
          <CardTitle>Monthly Delivery Trend</CardTitle>
          <CardDescription>Deliveries over the last 6 months</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] w-full">
            {analytics?.charts.monthlyTrend.length ? (
              <div className="flex items-end justify-between h-full space-x-2">
                {analytics.charts.monthlyTrend.map((month, index) => (
                  <div key={month.month} className="flex flex-col items-center space-y-2 flex-1">
                    <div className="flex flex-col items-center space-y-1 h-full justify-end">
                      <div
                        className="w-full bg-blue-500 rounded-t min-w-[20px]"
                        style={{ 
                          height: `${Math.max((month.deliveries / Math.max(...analytics.charts.monthlyTrend.map(m => m.deliveries))) * 100, month.deliveries > 0 ? 10 : 0)}%`,
                          minHeight: month.deliveries > 0 ? "8px" : "0"
                        }}
                      />
                      <div className="text-xs font-medium">{month.deliveries}</div>
                    </div>
                    <div className="text-xs text-muted-foreground text-center">
                      {format(new Date(month.month + '-01'), "MMM yy")}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex items-center justify-center h-full text-muted-foreground">
                <div className="text-center">
                  <TrendingUp className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No trend data available</p>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Recent Deliveries */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Deliveries</CardTitle>
          <CardDescription>Latest delivery activities</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {analytics?.recentDeliveries.slice(0, 10).map((delivery) => (
              <div key={delivery.id} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className="flex-shrink-0">
                    {getStatusIcon(delivery.status)}
                  </div>
                  <div>
                    <p className="text-sm font-medium">{delivery.customerName}</p>
                    <div className="flex items-center space-x-2">
                      <Badge variant="outline" className="text-xs">
                        {delivery.status.toLowerCase().replace('_', ' ')}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {delivery?.total} TND
                      </span>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xs text-muted-foreground">
                    {format(new Date(delivery.updatedAt), "MMM dd, HH:mm")}
                  </p>
                </div>
              </div>
            ))}
            
            {!analytics?.recentDeliveries.length && (
              <div className="text-center py-8 text-muted-foreground">
                <Package className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No recent deliveries found</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}