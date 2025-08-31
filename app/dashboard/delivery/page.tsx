"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Truck,
  Settings,
  RefreshCw,
  CheckCircle,
  XCircle,
  AlertCircle,
  Eye,
  EyeOff,
  TestTube,
  Activity,
  BarChart3,
  Package,
  Clock,
} from "lucide-react"
import { AuthGuard } from "@/components/auth-guard"
import { useToast } from "@/hooks/use-toast"
import { useLanguage } from "@/contexts/language-context"

interface DeliveryAgency {
  id: string
  name: string
  enabled: boolean
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
  status: 'UPLOADED' | 'DEPOSIT' | 'IN_TRANSIT' | 'DELIVERED' | 'RETURNED' // Updated to match enum
  lastStatusUpdate: string
  printUrl?: string
  metadata?: Record<string, any>
  createdAt: string
  updatedAt: string
}

interface SyncResult {
  processed: number
  updated: number
  errors: number
  duration: number
}

function DeliveryManagementContent() {
  const { t } = useLanguage()
  const { toast } = useToast()

  const [agencies, setAgencies] = useState<DeliveryAgency[]>([])
  const [shipments, setShipments] = useState<DeliveryShipment[]>([])
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [testing, setTesting] = useState<string | null>(null)
  const [editingAgency, setEditingAgency] = useState<DeliveryAgency | null>(null)
  const [showCredentials, setShowCredentials] = useState<Record<string, boolean>>({})
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [selectedShipments, setSelectedShipments] = useState<string[]>([])
  const [bulkActionLoading, setBulkActionLoading] = useState(false)

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

  const handleAgencyToggle = async (agencyId: string, enabled: boolean) => {
    try {
      const response = await fetch(`/api/delivery/agencies/${agencyId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ enabled }),
      })

      if (response.ok) {
        setAgencies(agencies.map((agency) => (agency.id === agencyId ? { ...agency, enabled } : agency)))

        toast({
          title: t("success"),
          description: enabled ? t("agencyEnabled") : t("agencyDisabled"),
        })
      } else {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to update agency")
      }
    } catch (error) {
      toast({
        title: t("error"),
        description: t("failedToUpdateAgency"),
        variant: "destructive",
      })
    }
  }

  const handleTestConnection = async (agencyId: string) => {
    try {
      setTesting(agencyId)

      console.log("Testing connection for agency:", agencyId);

      const response = await fetch("/api/delivery/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ agencyId }),
      })

      const result = await response.json()

      if (result.success) {
        toast({
          title: t("success"),
          description: t("connectionTestSuccessful"),
        })
      } else {
        toast({
          title: t("error"),
          description: result.error || t("connectionTestFailed"),
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: t("error"),
        description: t("connectionTestFailed"),
        variant: "destructive",
      })
    } finally {
      setTesting(null)
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

  const handleEditAgency = (agency: DeliveryAgency) => {
    setEditingAgency({ ...agency })
    setIsEditDialogOpen(true)
  }

  const handleSaveAgency = async () => {
    console.log("Saving agency:", editingAgency)
    if (!editingAgency) return

    try {
      const response = await fetch(`/api/delivery/agencies/${editingAgency.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          enabled: editingAgency.enabled,
          credentialsUsername: editingAgency.credentialsUsername,
          credentialsEmail: editingAgency.credentialsEmail,
          credentialsPassword: editingAgency.credentialsPassword,
          credentialsApiKey: editingAgency.credentialsApiKey,
          settings: editingAgency.settings,
          pollingInterval: editingAgency.pollingInterval,
        }),
      })

      if (response.ok) {
        // Reload agencies after update
        await loadData()
        setIsEditDialogOpen(false)
        setEditingAgency(null)

        toast({
          title: t("success"),
          description: t("agencyUpdatedSuccessfully"),
        })
      } else {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to update agency")
      }
    } catch (error) {
      toast({
        title: t("error"),
        description: t("failedToUpdateAgency"),
        variant: "destructive",
      })
    }
  }

  // Updated status badge mapping to match DeliveryStatus enum
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
        {t(`deliveryStatus.${status}`) || status}
      </Badge>
    )
  }

  const toggleCredentialVisibility = (agencyId: string) => {
    setShowCredentials((prev) => ({
      ...prev,
      [agencyId]: !prev[agencyId],
    }))
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

  // Fixed bulk status update to use correct endpoint and statuses
  const handleBulkStatusUpdate = async (newStatus: 'UPLOADED' | 'DEPOSIT' | 'IN_TRANSIT' | 'DELIVERED' | 'RETURNED') => {
    if (selectedShipments.length === 0) return

    try {
      setBulkActionLoading(true)

      // Use the delivery service bulk update method
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

        // Reload data and clear selection
        await loadData()
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
        await loadData()
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

      <Tabs defaultValue="agencies" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="agencies" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            {t("agencies")}
          </TabsTrigger>
          <TabsTrigger value="shipments" className="flex items-center gap-2">
            <Truck className="h-4 w-4" />
            {t("shipments")}
          </TabsTrigger>
          <TabsTrigger value="analytics" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            {t("analytics")}
          </TabsTrigger>
        </TabsList>

        {/* Agencies Tab */}
        <TabsContent value="agencies">
          <div className="grid gap-6">
            {agencies.map((agency) => (
              <Card key={agency.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Truck className="h-6 w-6 text-purple-600" />
                      <div>
                        <CardTitle>{agency.name}</CardTitle>
                        <CardDescription>
                          {t("lastSync")}: {agency.lastSync ? new Date(agency.lastSync).toLocaleString() : t("never")}
                        </CardDescription>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Switch
                        checked={agency.enabled}
                        onCheckedChange={(enabled) => handleAgencyToggle(agency.id, enabled)}
                      />
                      <Badge variant={agency.enabled ? "default" : "secondary"}>
                        {agency.enabled ? t("enabled") : t("disabled")}
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label className="text-sm font-medium">{t("credentialsType")}</Label>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {agency?.credentialsType?.replace("_", " ").toUpperCase() || t("undefined")}
                      </p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium">{t("pollingInterval")}</Label>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {agency.pollingInterval} {t("seconds")}
                      </p>
                    </div>
                    {agency.credentialsUsername && (
                      <div>
                        <Label className="text-sm font-medium">{t("username")}</Label>
                        <div className="flex items-center gap-2">
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            {showCredentials[agency.id] ? agency.credentialsUsername : "••••••••"}
                          </p>
                          <Button variant="ghost" size="sm" onClick={() => toggleCredentialVisibility(agency.id)}>
                            {showCredentials[agency.id] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </Button>
                        </div>
                      </div>
                    )}
                    {agency.settings?.supportedRegions && (
                      <div className="md:col-span-2">
                        <Label className="text-sm font-medium">{t("supportedRegions")}</Label>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {agency.settings.supportedRegions.slice(0, 5).map((region: string) => (
                            <Badge key={region} variant="outline" className="text-xs">
                              {region}
                            </Badge>
                          ))}
                          {agency.settings.supportedRegions.length > 5 && (
                            <Badge variant="outline" className="text-xs">
                              +{agency.settings.supportedRegions.length - 5} {t("more")}
                            </Badge>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="flex gap-2 mt-4">
                    <Button variant="outline" size="sm" onClick={() => handleEditAgency(agency)}>
                      <Settings className="h-4 w-4 mr-2" />
                      {t("configure")}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleTestConnection(agency.id)}
                      disabled={testing === agency.id || !agency.enabled}
                    >
                      <TestTube className={`h-4 w-4 mr-2 ${testing === agency.id ? "animate-spin" : ""}`} />
                      {testing === agency.id ? t("testing") : t("testConnection")}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Shipments Tab */}
        <TabsContent value="shipments">
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
                                onClick={() => window.open(`/dashboard/orders/${shipment.orderId}`, "_blank")}
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
          </Card>
        </TabsContent>

        {/* Analytics Tab - Updated to use correct status filtering */}
        <TabsContent value="analytics">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{t("totalShipments")}</CardTitle>
                <Truck className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{shipments.length}</div>
                <p className="text-xs text-muted-foreground">{t("allTimeTotal")}</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{t("activeShipments")}</CardTitle>
                <Activity className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {shipments.filter((s) => ["UPLOADED", "DEPOSIT", "IN_TRANSIT"].includes(s.status)).length}
                </div>
                <p className="text-xs text-muted-foreground">{t("inTransitOrPending")}</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{t("deliveredShipments")}</CardTitle>
                <CheckCircle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{shipments.filter((s) => s.status === "DELIVERED").length}</div>
                <p className="text-xs text-muted-foreground">{t("successfulDeliveries")}</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{t("enabledAgencies")}</CardTitle>
                <Settings className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{agencies.filter((a) => a.enabled).length}</div>
                <p className="text-xs text-muted-foreground">
                  {t("outOf")} {agencies.length} {t("total")}
                </p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Edit Agency Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t("configureAgency")}</DialogTitle>
            <DialogDescription>{t("updateAgencyCredentialsSettings")}</DialogDescription>
          </DialogHeader>

          {editingAgency && (
            <div className="grid gap-6 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="agency-name">{t("agencyName")}</Label>
                  <Input id="agency-name" value={editingAgency.name} disabled className="bg-gray-50" />
                </div>
                <div>
                  <Label htmlFor="polling-interval">
                    {t("pollingInterval")} ({t("seconds")})
                  </Label>
                  <Input
                    id="polling-interval"
                    type="number"
                    value={editingAgency.pollingInterval}
                    onChange={(e) =>
                      setEditingAgency({
                        ...editingAgency,
                        pollingInterval: Number.parseInt(e.target.value) || 300,
                      })
                    }
                  />
                </div>
              </div>

              {editingAgency.credentialsType === "username_password" && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="username">{t("username")}</Label>
                    <Input
                      id="username"
                      value={editingAgency.credentialsUsername || ""}
                      onChange={(e) =>
                        setEditingAgency({
                          ...editingAgency,
                          credentialsUsername: e.target.value,
                        })
                      }
                    />
                  </div>
                  <div>
                    <Label htmlFor="password">{t("password")}</Label>
                    <Input
                      id="password"
                      type="password"
                      value={editingAgency.credentialsPassword || ""}
                      onChange={(e) =>
                        setEditingAgency({
                          ...editingAgency,
                          credentialsPassword: e.target.value,
                        })
                      }
                    />
                  </div>
                </div>
              )}

              {editingAgency.credentialsType === "email_password" && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="email">{t("email")}</Label>
                    <Input
                      id="email"
                      type="email"
                      value={editingAgency.credentialsEmail || ""}
                      onChange={(e) =>
                        setEditingAgency({
                          ...editingAgency,
                          credentialsEmail: e.target.value,
                        })
                      }
                    />
                  </div>
                  <div>
                    <Label htmlFor="password">{t("password")}</Label>
                    <Input
                      id="password"
                      type="password"
                      value={editingAgency.credentialsPassword || ""}
                      onChange={(e) =>
                        setEditingAgency({
                          ...editingAgency,
                          credentialsPassword: e.target.value,
                        })
                      }
                    />
                  </div>
                </div>
              )}

              {editingAgency.credentialsType === "api_key" && (
                <div>
                  <Label htmlFor="api-key">{t("apiKey")}</Label>
                  <Input
                    id="api-key"
                    type="password"
                    value={editingAgency.credentialsApiKey || ""}
                    onChange={(e) =>
                      setEditingAgency({
                        ...editingAgency,
                        credentialsApiKey: e.target.value,
                      })
                    }
                  />
                </div>
              )}

              <div className="flex items-center space-x-2">
                <Switch
                  id="auto-sync"
                  checked={editingAgency.settings?.autoSync !== false}
                  onCheckedChange={(checked) =>
                    setEditingAgency({
                      ...editingAgency,
                      settings: {
                        ...editingAgency.settings,
                        autoSync: checked,
                      },
                    })
                  }
                />
                <Label htmlFor="auto-sync">{t("enableAutoSync")}</Label>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              {t("cancel")}
            </Button>
            <Button onClick={handleSaveAgency} className="bg-purple-600 hover:bg-purple-700">
              {t("saveChanges")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
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