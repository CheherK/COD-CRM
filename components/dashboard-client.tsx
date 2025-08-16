"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ShoppingCart, Users, TrendingUp, Package } from "lucide-react"
import { ActivityFeed } from "@/components/activity-feed"
import { useLanguage } from "@/contexts/language-context"

export function DashboardClient() {
  const { t } = useLanguage()

  const stats = [
    {
      title: t("totalOrders"),
      value: "1,234",
      description: `+20.1% ${t("fromLastMonth")}`,
      icon: ShoppingCart,
      color: "text-blue-600",
    },
    {
      title: t("pendingOrders"),
      value: "89",
      description: t("awaitingConfirmation"),
      icon: Package,
      color: "text-yellow-600",
    },
    {
      title: t("teamMembers"),
      value: "12",
      description: t("activeStaffMembers"),
      icon: Users,
      color: "text-green-600",
    },
    {
      title: t("revenue"),
      value: "$45,231",
      description: `+15% ${t("fromLastMonth")}`,
      icon: TrendingUp,
      color: "text-purple-600",
    },
  ]

  const recentOrders = [
    { id: "ORD-001", customer: "John Doe", status: "PENDING", total: "$125.00" },
    { id: "ORD-002", customer: "Jane Smith", status: "CONFIRMED", total: "$89.50" },
    { id: "ORD-003", customer: "Mike Johnson", status: "DELIVERED", total: "$234.75" },
    { id: "ORD-004", customer: "Sarah Wilson", status: "ATTEMPT", total: "$156.25" },
  ]

  const getStatusColor = (status: string) => {
    switch (status) {
      case "PENDING":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300"
      case "CONFIRMED":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300"
      case "DELIVERED":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300"
      case "ATTEMPT":
        return "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300"
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300"
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case "PENDING":
        return t("pending")
      case "CONFIRMED":
        return t("confirmed")
      case "DELIVERED":
        return t("delivered")
      case "ATTEMPT":
        return t("attempt")
      default:
        return status
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{t("dashboard")}</h1>
        <p className="text-gray-600 dark:text-gray-400">
          {t("welcomeBack")} {t("hereWhatHappeningWithOrders")}
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => (
          <Card key={index}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
              <stat.icon className={`h-4 w-4 ${stat.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              <p className="text-xs text-muted-foreground">{stat.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Orders */}
        <Card>
          <CardHeader>
            <CardTitle>{t("recentOrders")}</CardTitle>
            <CardDescription>{t("latestOrdersFromStore")}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentOrders.map((order) => (
                <div key={order.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center space-x-4">
                    <div>
                      <p className="font-medium">{order.id}</p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">{order.customer}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-4">
                    <Badge className={getStatusColor(order.status)}>{getStatusText(order.status)}</Badge>
                    <p className="font-medium">{order.total}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Activity Feed */}
        <ActivityFeed limit={8} title={t("systemActivity")} />
      </div>
    </div>
  )
}
