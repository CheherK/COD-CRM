"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Input } from "@/components/ui/input"
import { CalendarIcon, Package, Truck, RefreshCw, Search } from "lucide-react"
import { format } from "date-fns"
import { cn } from "@/lib/utils"
import type { DateRange } from "react-day-picker"
import { useLanguage } from "@/contexts/language-context"

interface DeliveryAnalytics {
  statusCards: {
    deposit: {
      count: number
      expectedProfit: number
      totalValue: number
    }
    inTransit: {
      count: number
      expectedProfit: number
      totalValue: number
    }
    delivered: {
      count: number
      profit: number
      payment: number
    }
    returned: {
      count: number
      loss: number
    }
  }
  analytics: {
    averageDeliveryTime: any
    deliveryPerformance: any
    ordersPerformance: {
      totalOrders: number
    }
  }
  regionalData: Array<{
    region: string
    percentage: number
    color: string
  }>
  deliveryCompanies: string[]
}

export default function DeliveryStatisticsPage() {
  const { t } = useLanguage()
  const [analytics, setAnalytics] = useState<DeliveryAnalytics | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedCompany, setSelectedCompany] = useState("all")
  const [dateRange, setDateRange] = useState<DateRange | undefined>()
  const [regionSearch, setRegionSearch] = useState("")

  const fetchAnalytics = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      params.append("company", selectedCompany)
      if (dateRange?.from) params.append("startDate", dateRange.from.toISOString())
      if (dateRange?.to) params.append("endDate", dateRange.to.toISOString())

      const response = await fetch(`/api/analytics/delivery?${params}`, {
        headers: {
          "x-user-id": "current-user-id", // This would come from auth context
        },
      })

      if (response.ok) {
        const data = await response.json()
        setAnalytics(data)
      }
    } catch (error) {
      console.error("Failed to fetch delivery analytics:", error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAnalytics()
  }, [selectedCompany, dateRange])

  const CircularChart = ({ label, hasData = false }: { label: string; hasData?: boolean }) => (
    <div className="flex flex-col items-center justify-center h-32">
      <div className="w-20 h-20 rounded-full border-8 border-blue-200 flex items-center justify-center">
        <div className="text-center">
          {hasData ? <div className="text-xs font-medium">Data</div> : <Truck className="h-8 w-8 text-blue-400" />}
        </div>
      </div>
      <p className="text-sm text-muted-foreground mt-2">{label}</p>
      {!hasData && <p className="text-xs text-muted-foreground">{t("noDataAvailable")}</p>}
    </div>
  )

  if (loading) {
    return (
      <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
        <div className="flex items-center justify-between space-y-2">
          <h2 className="text-3xl font-bold tracking-tight">{t("deliveryStatistics")}</h2>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{t("loading")}...</CardTitle>
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

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      {/* Header */}
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">{t("deliveryStatistics")}</h2>
        <Button onClick={fetchAnalytics} variant="outline" size="sm">
          <RefreshCw className="h-4 w-4 mr-2" />
          {t("refresh")}
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <Select value={selectedCompany} onValueChange={setSelectedCompany}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder={t("allDeliveryCompanies")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("allDeliveryCompanies")}</SelectItem>
            {analytics?.deliveryCompanies.map((company) => (
              <SelectItem key={company} value={company}>
                {company}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Popover>
          <PopoverTrigger asChild>
            <Button
              id="date"
              variant="outline"
              className={cn("w-[300px] justify-start text-left font-normal", !dateRange && "text-muted-foreground")}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {dateRange?.from ? (
                dateRange.to ? (
                  <>
                    {format(dateRange.from, "LLL dd, y")} - {format(dateRange.to, "LLL dd, y")}
                  </>
                ) : (
                  format(dateRange.from, "LLL dd, y")
                )
              ) : (
                <span>{t("selectPickupDates")}</span>
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

      {/* Status Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="border-purple-200 bg-purple-50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-purple-800">{t("ordersInDeposit")}</CardTitle>
            <Package className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-900">
              {analytics?.statusCards.deposit.count || 0} {t("orders")}
            </div>
            <div className="text-xs text-purple-700 mt-1">
              {t("expectedProfit")}: {analytics?.statusCards.deposit.expectedProfit || 0} TND
            </div>
            <div className="text-xs text-purple-700">
              {t("totalValue")}: {analytics?.statusCards.deposit.totalValue || 0} TND
            </div>
          </CardContent>
        </Card>

        <Card className="border-blue-200 bg-blue-50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-blue-800">{t("inTransit")}</CardTitle>
            <Truck className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-900">
              {analytics?.statusCards.inTransit.count || 0} {t("orders")}
            </div>
            <div className="text-xs text-blue-700 mt-1">
              {t("expectedProfit")}: {analytics?.statusCards.inTransit.expectedProfit || 0} TND
            </div>
            <div className="text-xs text-blue-700">
              {t("totalValue")}: {analytics?.statusCards.inTransit.totalValue || 0} TND
            </div>
          </CardContent>
        </Card>

        <Card className="border-green-200 bg-green-50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-green-800">{t("deliveredOrders")}</CardTitle>
            <Package className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-900">
              {analytics?.statusCards.delivered.count || 0} {t("orders")}
            </div>
            <div className="text-xs text-green-700 mt-1">
              {t("profit")}: {analytics?.statusCards.delivered.profit || 0} TND
            </div>
            <div className="text-xs text-green-700">
              {t("payment")}: {analytics?.statusCards.delivered.payment || 0} TND
            </div>
          </CardContent>
        </Card>

        <Card className="border-red-200 bg-red-50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-red-800">{t("returnedOrders")}</CardTitle>
            <Package className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-900">
              {analytics?.statusCards.returned.count || 0} {t("orders")}
            </div>
            <div className="text-xs text-red-700 mt-1">
              {t("loss")}: {analytics?.statusCards.returned.loss || 0} TND
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Right Side Widget and Bottom Charts */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-center">{t("averageDeliveryTime")}</CardTitle>
          </CardHeader>
          <CardContent>
            <CircularChart label={t("averageDeliveryTime")} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-center">{t("deliveryPerformance")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-center h-32">
              <div className="text-center text-muted-foreground">
                <div className="w-20 h-20 rounded-full bg-purple-100 flex items-center justify-center mx-auto mb-2">
                  <Truck className="h-8 w-8 text-purple-400" />
                </div>
                <p className="text-sm">{t("noDataAvailable")}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-center">{t("ordersPerformance")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-center h-32">
              <div className="text-center">
                <div className="text-3xl font-bold text-muted-foreground">
                  {analytics?.analytics.ordersPerformance.totalOrders || 0}
                </div>
                <p className="text-sm text-muted-foreground">{t("orders")}</p>
                <div className="text-xs text-muted-foreground mt-1">{t("scale")}: 0-6</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Regional Map Section */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>{t("regionalDistribution")}</CardTitle>
            <CardDescription>{t("tunisiaDeliveryRegions")}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Mock Tunisia Map */}
              <div className="h-64 bg-gray-100 rounded-lg flex items-center justify-center relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-purple-200 to-purple-400 opacity-60"></div>
                <div className="relative z-10 text-center">
                  <div className="text-lg font-semibold text-purple-800">{t("tunisia")}</div>
                  <div className="text-sm text-purple-700">{t("tunisiaRegionalCoverageMap")}</div>
                </div>
              </div>

              {/* Legend */}
              <div className="space-y-2">
                <h4 className="font-medium">{t("coveragePercentage")}</h4>
                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-2">
                    <div className="w-4 h-4 bg-purple-600 rounded"></div>
                    <span className="text-sm">{"< 100%"}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-4 h-4 bg-purple-400 rounded"></div>
                    <span className="text-sm">{"< 80%"}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-4 h-4 bg-purple-200 rounded"></div>
                    <span className="text-sm">{"< 60%"}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-4 h-4 bg-purple-100 rounded"></div>
                    <span className="text-sm">{"< 20%"}</span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t("regionalSearch")}</CardTitle>
            <CardDescription>{t("searchDeliveryRegions")}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder={t("searchByRegion")}
                  value={regionSearch}
                  onChange={(e) => setRegionSearch(e.target.value)}
                  className="pl-8"
                />
              </div>

              <div className="space-y-2">
                {analytics?.regionalData
                  .filter((region) => region.region.toLowerCase().includes(regionSearch.toLowerCase()))
                  .map((region) => (
                    <div key={region.region} className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
                      <div className="flex items-center space-x-2">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: region.color }}></div>
                        <span className="font-medium">{region.region}</span>
                      </div>
                      <span className="text-sm text-muted-foreground">{region.percentage}%</span>
                    </div>
                  )) || (
                  <div className="text-center text-muted-foreground py-8">
                    <Package className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">{t("noRegionsFound")}</p>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
