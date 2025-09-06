"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Truck,
  Settings,
  CheckCircle,
  Activity,
} from "lucide-react"
import { useLanguage } from "@/contexts/language-context"

interface DeliveryAgency {
  id: string
  name: string
  enabled: boolean
  supportedRegions: string[]
  credentialsType: "username_password" | "email_password" | "api_key"
  credentialsUsername?: string
  credentialsEmail?: string
  credentialsPassword?: string
  credentialsApiKey?: string
  settings: Record<string, any>
  webhookUrl?: string
  pollingInterval: number
  lastSync?: string
  createdAt: string
  updatedAt: string
}

interface DeliveryShipment {
  id: string
  orderId: string
  agencyId: string
  trackingNumber: string
  barcode?: string
  status: 'UPLOADED' | 'DEPOSIT' | 'IN_TRANSIT' | 'DELIVERED' | 'RETURNED' 
  lastStatusUpdate: string
  printUrl?: string
  metadata?: Record<string, any>
  createdAt: string
  updatedAt: string
}

interface DeliveryAnalyticsProps {
  shipments: DeliveryShipment[]
  agencies: DeliveryAgency[]
}

export function DeliveryAnalytics({ shipments, agencies }: DeliveryAnalyticsProps) {
  const { t } = useLanguage()

  const totalShipments = shipments.length
  const activeShipments = shipments.filter((s) => ["UPLOADED", "DEPOSIT", "IN_TRANSIT"].includes(s.status)).length
  const deliveredShipments = shipments.filter((s) => s.status === "DELIVERED").length
  const enabledAgencies = agencies.filter((a) => a.enabled).length
  const totalAgencies = agencies.length

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">{t("totalShipments")}</CardTitle>
          <Truck className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{totalShipments}</div>
          <p className="text-xs text-muted-foreground">{t("allTimeTotal")}</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">{t("activeShipments")}</CardTitle>
          <Activity className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{activeShipments}</div>
          <p className="text-xs text-muted-foreground">{t("inTransitOrPending")}</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">{t("deliveredShipments")}</CardTitle>
          <CheckCircle className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{deliveredShipments}</div>
          <p className="text-xs text-muted-foreground">{t("successfulDeliveries")}</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">{t("enabledAgencies")}</CardTitle>
          <Settings className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{enabledAgencies}</div>
          <p className="text-xs text-muted-foreground">
            {t("outOf")} {totalAgencies} {t("total")}
          </p>
        </CardContent>
      </Card>
    </div>
  )
}