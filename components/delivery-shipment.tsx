"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import {
  Truck,
  RefreshCw,
  CheckCircle,
  Package,
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { useLanguage } from "@/contexts/language-context"
import { OrderViewDialog } from "./order-view-dialog";

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

interface DeliveryShipmentsProps {
  shipments: DeliveryShipment[]
  agencies: DeliveryAgency[]
  onDataChange: () => void
}

export function DeliveryShipments({ shipments, agencies, onDataChange }: DeliveryShipmentsProps) {
  const { t } = useLanguage()
  const { toast } = useToast()

  const [selectedShipments, setSelectedShipments] = useState<string[]>([])
  const [bulkActionLoading, setBulkActionLoading] = useState(false)
  const [viewDialogOpen, setViewDialogOpen] = useState(false)
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null)

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      UPLOADED: { color: "bg-blue-100 text-blue-800", icon: Package },
      DEPOSIT: { color: "bg-purple-100 text-purple-800", icon: Truck },
      IN_TRANSIT: { color: "bg-orange-100 text-orange-800", icon: Truck },
      DELIVERED: { color: "bg-green-100 text-green-800", icon: CheckCircle },
      RETURNED: { color: "bg-red-100 text-red-800", icon: RefreshCw },
    }

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.UPLOADED
    const Icon = config.icon

    return (
      <Badge className={config.color}>
        <Icon className="h-3 w-3 mr-1" />
        {t(`${status}`) || status}
      </Badge>
    )
  }

  const handleOrderView = (orderId: string) => {
    setSelectedOrderId(orderId)
    setViewDialogOpen(true)
  }
  const handleShipmentSelection = (shipmentId: string, selected: boolean) => {
    if (selected) {
      setSelectedShipments([...selectedShipments, shipmentId])
    } else {
      setSelectedShipments(selectedShipments.filter((id) => id !== shipmentId))
    }
  }

  const handleSelectAllShipments = (selected: boolean) => {
    if (selected) {
      setSelectedShipments(shipments.map((s) => s.id))
    } else {
      setSelectedShipments([])
    }
  }

  const handleBulkStatusUpdate = async (newStatus: 'UPLOADED' | 'DEPOSIT' | 'IN_TRANSIT' | 'DELIVERED' | 'RETURNED') => {
    if (selectedShipments.length === 0) return

    try {
      setBulkActionLoading(true)

      const response = await fetch("/api/delivery/shipments/bulk", {
        method: "PUT", 
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          shipmentIds: selectedShipments,
          newStatus: newStatus,
        }),
      })

      const result = await response.json()

      if (result.success) {
        toast({
          title: t("success"),
          description: `Updated ${result.updated} shipments to ${newStatus}`,
        })

        onDataChange()
        setSelectedShipments([])
      } else {
        throw new Error(result.error || "Bulk update failed")
      }
    } catch (error) {
      toast({
        title: t("error"),
        description: `Failed to update shipments: ${error instanceof Error ? error.message : "Unknown error"}`,
        variant: "destructive",
      })
    } finally {
      setBulkActionLoading(false)
    }
  }

  const handleRetryShipment = async (shipmentId: string) => {
    try {
      const response = await fetch(`/api/delivery/shipments/${shipmentId}/retry`, {
        method: "POST",
        credentials: "include",
      })

      const result = await response.json()

      if (result.success) {
        toast({
          title: t("success"),
          description: `Shipment retry successful. New tracking: ${result.trackingNumber}`,
        })
        onDataChange()
      } else {
        throw new Error(result.errorDetails || result.error)
      }
    } catch (error) {
      toast({
        title: t("error"),
        description: `Failed to retry shipment: ${error instanceof Error ? error.message : "Unknown error"}`,
        variant: "destructive",
      })
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("recentShipments")}</CardTitle>
        <CardDescription>
          {shipments.length} {t("shipmentsFound")}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {selectedShipments.length > 0 && (
          <div className="flex items-center gap-2 mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
            <span className="text-sm font-medium text-blue-800 dark:text-blue-200">
              {selectedShipments.length} {t("shipmentsSelected")}
            </span>
            <div className="flex gap-2 ml-auto">
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleBulkStatusUpdate("DELIVERED")}
                disabled={bulkActionLoading}
              >
                {t("markAsDelivered")}
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleBulkStatusUpdate("RETURNED")}
                disabled={bulkActionLoading}
              >
                {t("markAsReturned")}
              </Button>
              <Button size="sm" variant="outline" onClick={() => setSelectedShipments([])}>
                {t("clearSelection")}
              </Button>
            </div>
          </div>
        )}
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">
                  <input
                    type="checkbox"
                    checked={selectedShipments.length === shipments.length && shipments.length > 0}
                    onChange={(e) => handleSelectAllShipments(e.target.checked)}
                    className="rounded"
                  />
                </TableHead>
                <TableHead>{t("trackingNumber")}</TableHead>
                <TableHead>{t("orderId")}</TableHead>
                <TableHead>{t("agency")}</TableHead>
                <TableHead>{t("status")}</TableHead>
                <TableHead>{t("lastUpdate")}</TableHead>
                <TableHead>{t("actions")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {shipments.map((shipment) => {
                const agency = agencies.find((a) => a.id === shipment.agencyId)
                return (
                  <TableRow key={shipment.id}>
                    <TableCell>
                      <input
                        type="checkbox"
                        checked={selectedShipments.includes(shipment.id)}
                        onChange={(e) => handleShipmentSelection(shipment.id, e.target.checked)}
                        className="rounded"
                      />
                    </TableCell>
                    <TableCell className="font-mono">{shipment.trackingNumber}</TableCell>
                    <TableCell>{shipment.orderId}</TableCell>
                    <TableCell>{agency?.name || shipment.agencyId}</TableCell>
                    <TableCell>{getStatusBadge(shipment.status)}</TableCell>
                    <TableCell>{new Date(shipment.lastStatusUpdate).toLocaleString()}</TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        {shipment.printUrl && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => window.open(shipment.printUrl, "_blank")}
                          >
                            {t("print")}
                          </Button>
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleOrderView(shipment.orderId)}
                        >
                          {t("viewOrder")}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleRetryShipment(shipment.id)}
                          disabled={shipment.status === "DELIVERED" || shipment.status === "RETURNED"}
                        >
                          {t("retry")}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
      </CardContent>
      <OrderViewDialog
        open={viewDialogOpen}
        onClose={() => setViewDialogOpen(false)}
        orderId={selectedOrderId || null}
      />
    </Card>
  )
}