"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Settings,
  RefreshCw,
  Truck,
  BarChart3,
} from "lucide-react"
import { AuthGuard } from "@/components/auth-guard"
import { useToast } from "@/hooks/use-toast"
import { useLanguage } from "@/contexts/language-context"
import { DeliveryAgencies } from "@/components/delivery-agencies";
import { DeliveryAnalytics } from "@/components/delivery-analytics";
import { DeliveryShipments } from "@/components/delivery-shipment";

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

function DeliveryManagementContent() {
  const { t } = useLanguage()
  const { toast } = useToast()

  const [agencies, setAgencies] = useState<DeliveryAgency[]>([])
  const [shipments, setShipments] = useState<DeliveryShipment[]>([])
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      setLoading(true)

      // Load agencies
      const agenciesResponse = await fetch("/api/delivery/agencies", {
        credentials: "include",
      })

      if (agenciesResponse.ok) {
        const agenciesData = await agenciesResponse.json()
        setAgencies(agenciesData.agencies || [])
      }

      // Load recent shipments
      const shipmentsResponse = await fetch("/api/delivery/shipments?limit=50", {
        credentials: "include",
      })

      if (shipmentsResponse.ok) {
        const shipmentsData = await shipmentsResponse.json()
        setShipments(shipmentsData.shipments || [])
      }
    } catch (error) {
      console.error("Error loading delivery data:", error)
      toast({
        title: t("error"),
        description: t("failedToLoadDeliveryData"),
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleManualSync = async () => {
    try {
      setSyncing(true)

      const response = await fetch("/api/delivery/sync", {
        method: "POST",
        credentials: "include",
      })

      const result = await response.json()

      if (result.success) {
        const { syncResults } = result
        toast({
          title: t("success"),
          description: `${t("syncCompleted")}: ${syncResults.processed} ${t("processed")}, ${syncResults.updated} ${t("updated")}`,
        })

        // Reload shipments to show updates
        await loadData()
      } else {
        throw new Error(result.error)
      }
    } catch (error) {
      toast({
        title: t("error"),
        description: t("syncFailed"),
        variant: "destructive",
      })
    } finally {
      setSyncing(false)
    }
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
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{t("deliveryManagement")}</h1>
          <p className="text-gray-600 dark:text-gray-400">{t("manageDeliveryAgenciesShipments")}</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={handleManualSync} disabled={syncing} variant="outline">
            <RefreshCw className={`h-4 w-4 mr-2 ${syncing ? "animate-spin" : ""}`} />
            {syncing ? t("syncing") : t("syncNow")}
          </Button>
        </div>
      </div>

      <Tabs defaultValue="shipments" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="shipments" className="flex items-center gap-2">
            <Truck className="h-4 w-4" />
            {t("shipments")}
          </TabsTrigger>
          <TabsTrigger value="agencies" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            {t("agencies")}
          </TabsTrigger>
          <TabsTrigger value="analytics" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            {t("analytics")}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="shipments">
          <DeliveryShipments shipments={shipments} agencies={agencies} onDataChange={loadData} />
        </TabsContent>

        <TabsContent value="agencies">
          <DeliveryAgencies agencies={agencies} onDataChange={loadData} />
        </TabsContent>

        <TabsContent value="analytics">
          <DeliveryAnalytics shipments={shipments} agencies={agencies} />
        </TabsContent>
      </Tabs>
    </div>
  )
}

export default function DeliveryManagementPage() {
  return (
    <AuthGuard requireAdmin={true}>
      <DeliveryManagementContent />
    </AuthGuard>
  )
}