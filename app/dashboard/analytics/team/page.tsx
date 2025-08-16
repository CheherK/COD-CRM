"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Progress } from "@/components/ui/progress"
import { CalendarIcon, CheckCircle, XCircle, Package, Phone, RefreshCw } from "lucide-react"
import { format } from "date-fns"
import { cn } from "@/lib/utils"
import type { DateRange } from "react-day-picker"
import { useLanguage } from "@/contexts/language-context"

interface TeamAnalytics {
  metrics: {
    confirmedOrders: number
    rejectedOrders: number
    createdOrders: number
    callAttempts: number
  }
  performance: {
    confirmationRate: string
  }
  analytics: {
    averageConfirmationTime: string
    averageTimeToFirstAttempt: string
    rejectionReasons: any
  }
  dailyPerformance: Array<{
    date: string
    confirmed: number
    attempts: number
  }>
  teamMembers: Array<{
    id: string
    username: string
    firstName?: string
    lastName?: string
  }>
}

export default function TeamStatisticsPage() {
  const { t } = useLanguage()
  const [analytics, setAnalytics] = useState<TeamAnalytics | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedTeam, setSelectedTeam] = useState("all")
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: new Date(2025, 7, 3), // Aug 03, 2025
    to: new Date(2025, 7, 10), // Aug 10, 2025
  })

  const fetchAnalytics = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      params.append("team", selectedTeam)
      if (dateRange?.from) params.append("startDate", dateRange.from.toISOString())
      if (dateRange?.to) params.append("endDate", dateRange.to.toISOString())

      const response = await fetch(`/api/analytics/team?${params}`, {
        headers: {
          "x-user-id": "current-user-id", // This would come from auth context
        },
      })

      if (response.ok) {
        const data = await response.json()
        setAnalytics(data)
      }
    } catch (error) {
      console.error("Failed to fetch team analytics:", error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAnalytics()
  }, [selectedTeam, dateRange])

  const CircularChart = ({ value, label, colors }: { value: string; label: string; colors: string[] }) => (
    <div className="flex flex-col items-center justify-center h-32">
      <div
        className={`w-20 h-20 rounded-full border-8 border-gradient-to-r ${colors[0]} flex items-center justify-center`}
      >
        <div className="text-center">
          <div className="text-xs font-medium">{value}</div>
        </div>
      </div>
      <p className="text-sm text-muted-foreground mt-2">{label}</p>
    </div>
  )

  if (loading) {
    return (
      <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
        <div className="flex items-center justify-between space-y-2">
          <h2 className="text-3xl font-bold tracking-tight">{t("teamStatistics")}</h2>
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
        <h2 className="text-3xl font-bold tracking-tight">{t("teamStatistics")}</h2>
        <Button onClick={fetchAnalytics} variant="outline" size="sm">
          <RefreshCw className="h-4 w-4 mr-2" />
          {t("refresh")}
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <Select value={selectedTeam} onValueChange={setSelectedTeam}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder={t("allOfTheTeam")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("allOfTheTeam")}</SelectItem>
            {analytics?.teamMembers.map((member) => (
              <SelectItem key={member.id} value={member.id}>
                {member.firstName && member.lastName ? `${member.firstName} ${member.lastName}` : member.username}
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
                <span>{t("selectActivityDates")}</span>
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

      {/* Metric Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="border-green-200 bg-green-50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-green-800">{t("confirmedOrders")}</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-900">{analytics?.metrics.confirmedOrders || 0}</div>
          </CardContent>
        </Card>

        <Card className="border-red-200 bg-red-50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-red-800">{t("rejectedOrders")}</CardTitle>
            <XCircle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-900">{analytics?.metrics.rejectedOrders || 0}</div>
          </CardContent>
        </Card>

        <Card className="border-purple-200 bg-purple-50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-purple-800">{t("createdOrders")}</CardTitle>
            <Package className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-900">{analytics?.metrics.createdOrders || 0}</div>
          </CardContent>
        </Card>

        <Card className="border-orange-200 bg-orange-50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-orange-800">{t("callAttempts")}</CardTitle>
            <Phone className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-900">{analytics?.metrics.callAttempts || 0}</div>
          </CardContent>
        </Card>
      </div>

      {/* Team Performance Bar */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Phone className="h-5 w-5 text-green-600" />
            {t("teamPerformance")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Progress value={Number.parseFloat(analytics?.performance.confirmationRate || "0")} className="h-3" />
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">{t("confirmed")}</span>
              <span className="font-medium">{analytics?.performance.confirmationRate || "0"}%</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Analytics Section */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-center">{t("averageConfirmationTime")}</CardTitle>
          </CardHeader>
          <CardContent>
            <CircularChart
              value={analytics?.analytics.averageConfirmationTime || "0h 0m 0s"}
              label={t("averageConfirmationTime")}
              colors={["border-blue-500", "border-green-500"]}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-center">{t("rejectionReasons")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-center h-32">
              <div className="text-center text-muted-foreground">
                <Package className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">{t("noDataAvailable")}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-center">{t("averageTimeToFirstAttempt")}</CardTitle>
          </CardHeader>
          <CardContent>
            <CircularChart
              value={analytics?.analytics.averageTimeToFirstAttempt || "0h 0m 0s"}
              label={t("averageTimeToFirstAttempt")}
              colors={["border-purple-500", "border-orange-500"]}
            />
          </CardContent>
        </Card>
      </div>

      {/* Daily Performance Chart */}
      <Card>
        <CardHeader>
          <CardTitle>{t("dayByDayPerformance")}</CardTitle>
          <CardDescription>{t("dailyConfirmationStatistics")}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] w-full">
            <div className="flex items-end justify-between h-full space-x-2">
              {analytics?.dailyPerformance.map((day, index) => (
                <div key={day.date} className="flex flex-col items-center space-y-2 flex-1">
                  <div className="flex flex-col items-center space-y-1 h-full justify-end">
                    <div
                      className="w-full bg-green-500 rounded-t"
                      style={{ height: `${(day.confirmed / 3) * 100}%`, minHeight: day.confirmed > 0 ? "8px" : "0" }}
                    />
                    <div
                      className="w-full bg-orange-500 rounded-t"
                      style={{ height: `${(day.attempts / 5) * 100}%`, minHeight: day.attempts > 0 ? "8px" : "0" }}
                    />
                  </div>
                  <div className="text-xs text-muted-foreground text-center">
                    {format(new Date(day.date), "MMM dd")}
                  </div>
                </div>
              ))}
            </div>
            <div className="flex justify-center space-x-4 mt-4">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-green-500 rounded"></div>
                <span className="text-sm text-muted-foreground">{t("confirmed")}</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-orange-500 rounded"></div>
                <span className="text-sm text-muted-foreground">{t("attempts")}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
