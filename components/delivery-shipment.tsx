"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  Truck,
  RefreshCw,
  CheckCircle,
  Package,
  Eye,
  Printer,
  RotateCcw,
  ArrowUpCircle,
  Clock,
  AlertCircle,
  Info,
  Search,
  Filter,
  Download,
  ChevronDown,
  ChevronUp
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { useLanguage } from "@/contexts/language-context"
import { OrderViewDialog } from "./order-view-dialog"

// Table components - using basic HTML table structure
const Table = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => <table className={`w-full ${className}`}>{children}</table>
const TableHeader = ({ children }: { children: React.ReactNode }) => <thead className="bg-gray-50">{children}</thead>
const TableBody = ({ children }: { children: React.ReactNode }) => <tbody>{children}</tbody>
const TableRow = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => <tr className={`border-b ${className}`}>{children}</tr>
const TableHead = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => <th className={`p-3 text-left text-sm font-medium text-gray-700 ${className}`}>{children}</th>
const TableCell = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => <td className={`p-3 text-sm ${className}`}>{children}</td>

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
  const [trackingLoading, setTrackingLoading] = useState<string[]>([])
  const [syncLoading, setSyncLoading] = useState(false)
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [filterAgency, setFilterAgency] = useState<string>('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [showFilters, setShowFilters] = useState(false)
  const [sortBy, setSortBy] = useState<'date' | 'status' | 'agency'>('date')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      UPLOADED: { 
        color: "bg-blue-100 text-blue-800 border-blue-200", 
        icon: ArrowUpCircle,
        description: "Order uploaded to delivery agency"
      },
      DEPOSIT: { 
        color: "bg-purple-100 text-purple-800 border-purple-200", 
        icon: Package,
        description: "Package picked up by agency"
      },
      IN_TRANSIT: { 
        color: "bg-orange-100 text-orange-800 border-orange-200", 
        icon: Truck,
        description: "Package is being delivered"
      },
      DELIVERED: { 
        color: "bg-green-100 text-green-800 border-green-200", 
        icon: CheckCircle,
        description: "Package delivered successfully"
      },
      RETURNED: { 
        color: "bg-red-100 text-red-800 border-red-200", 
        icon: RotateCcw,
        description: "Package returned - delivery failed"
      },
    }

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.UPLOADED
    const Icon = config.icon

    return (
      <div className="flex items-center gap-2">
        <Badge className={`${config.color} border flex items-center gap-1`}>
          <Icon className="h-3 w-3" />
          {status}
        </Badge>
      </div>
    )
  }

  const getStatusDescription = (status: string) => {
    const descriptions = {
      UPLOADED: "Package uploaded to delivery agency - still in your inventory",
      DEPOSIT: "Package picked up by delivery agency - now in their possession",
      IN_TRANSIT: "Package is out for delivery",
      DELIVERED: "Package successfully delivered to customer",
      RETURNED: "Delivery failed - package returned to sender"
    }
    return descriptions[status as keyof typeof descriptions] || ""
  }

  const getStatusStats = () => {
    const stats = {
      UPLOADED: 0,
      DEPOSIT: 0,
      IN_TRANSIT: 0,
      DELIVERED: 0,
      RETURNED: 0,
      total: filteredShipments.length
    }

    filteredShipments.forEach(shipment => {
      stats[shipment.status]++
    })

    return stats
  }

  // Filter and sort shipments
  const filteredShipments = shipments
    .filter(shipment => {
      const matchesStatus = filterStatus === 'all' || shipment.status === filterStatus
      const matchesAgency = filterAgency === 'all' || shipment.agencyId === filterAgency
      const matchesSearch = !searchTerm || 
        shipment.trackingNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        shipment.orderId.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (shipment.metadata?.customerName as string)?.toLowerCase().includes(searchTerm.toLowerCase())
      
      return matchesStatus && matchesAgency && matchesSearch
    })
    .sort((a, b) => {
      let comparison = 0
      
      switch (sortBy) {
        case 'date':
          comparison = new Date(a.lastStatusUpdate).getTime() - new Date(b.lastStatusUpdate).getTime()
          break
        case 'status':
          comparison = a.status.localeCompare(b.status)
          break
        case 'agency':
          const agencyA = agencies.find(ag => ag.id === a.agencyId)?.name || a.agencyId
          const agencyB = agencies.find(ag => ag.id === b.agencyId)?.name || b.agencyId
          comparison = agencyA.localeCompare(agencyB)
          break
      }
      
      return sortOrder === 'asc' ? comparison : -comparison
    })

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
      setSelectedShipments(filteredShipments.map((s) => s.id))
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
          title: "Success",
          description: `Updated ${result.updated} shipments and orders to ${newStatus}`,
        })

        onDataChange()
        setSelectedShipments([])
      } else {
        throw new Error(result.error || "Bulk update failed")
      }
    } catch (error) {
      toast({
        title: "Error",
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
          title: "Success",
          description: `Shipment retry successful. New tracking: ${result.trackingNumber}`,
        })
        onDataChange()
      } else {
        throw new Error(result.errorDetails || result.error)
      }
    } catch (error) {
      toast({
        title: "Error",
        description: `Failed to retry shipment: ${error instanceof Error ? error.message : "Unknown error"}`,
        variant: "destructive",
      })
    }
  }

  const handleTrackSingleShipment = async (shipmentId: string) => {
    try {
      setTrackingLoading([...trackingLoading, shipmentId])

      const shipment = shipments.find(s => s.id === shipmentId)
      if (!shipment) return

      const response = await fetch(`/api/delivery/track/${shipment.trackingNumber}`, {
        method: "GET",
        credentials: "include",
      })

      const result = await response.json()

      if (result.success) {
        toast({
          title: "Success",
          description: `Tracking updated for ${shipment.trackingNumber}`,
        })
        onDataChange() // Refresh data to show updated status
      } else {
        throw new Error(result.error || "Tracking failed")
      }
    } catch (error) {
      toast({
        title: "Error",
        description: `Failed to track shipment: ${error instanceof Error ? error.message : "Unknown error"}`,
        variant: "destructive",
      })
    } finally {
      setTrackingLoading(trackingLoading.filter(id => id !== shipmentId))
    }
  }

  const handleSyncAll = async () => {
    try {
      setSyncLoading(true)
      
      const response = await fetch('/api/delivery/sync', {
        method: 'POST',
        credentials: 'include',
      })

      const result = await response.json()

      if (result.success) {
        toast({
          title: "Sync Completed",
          description: result.message || `Updated ${result.syncResults?.updated || 0} shipments`,
        })
        onDataChange()
      } else {
        throw new Error(result.error || 'Sync failed')
      }
    } catch (error) {
      toast({
        title: "Sync Failed",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      })
    } finally {
      setSyncLoading(false)
    }
  }

  const exportShipments = () => {
    const csvContent = [
      ['Tracking Number', 'Order ID', 'Agency', 'Status', 'Customer', 'Last Update'],
      ...filteredShipments.map(shipment => [
        shipment.trackingNumber,
        shipment.orderId,
        agencies.find(a => a.id === shipment.agencyId)?.name || shipment.agencyId,
        shipment.status,
        (shipment.metadata?.customerName as string) || '',
        new Date(shipment.lastStatusUpdate).toLocaleString()
      ])
    ]
    
    const csv = csvContent.map(row => row.join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `shipments-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)
    
    toast({
      title: "Export Complete",
      description: `Exported ${filteredShipments.length} shipments`,
    })
  }

  const canRetry = (status: string) => {
    return !["DELIVERED"].includes(status)
  }

  const canTrack = (status: string) => {
    return !["DELIVERED", "RETURNED"].includes(status)
  }

  const stats = getStatusStats()

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Truck className="h-5 w-5" />
              Delivery Shipments
            </CardTitle>
            <CardDescription>
              {filteredShipments.length} of {shipments.length} shipments - Orders and shipments sync automatically
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={exportShipments}
              className="text-gray-700 border-gray-300"
            >
              <Download className="h-4 w-4 mr-1" />
              Export
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleSyncAll}
              disabled={syncLoading}
              className="text-blue-700 border-blue-300"
            >
              {syncLoading ? (
                <Clock className="h-4 w-4 mr-1 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4 mr-1" />
              )}
              Sync All
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* Info Alert about Status Synchronization */}
        <Alert className="mb-4 border-blue-200 bg-blue-50">
          <Info className="h-4 w-4 text-blue-600" />
          <AlertDescription className="text-blue-800">
            <strong>Status Sync:</strong> When shipment status updates, the corresponding order status updates automatically. 
            Use "Track" to get latest status from delivery agencies or "Sync All" to update all active shipments.
          </AlertDescription>
        </Alert>

        {/* Status Stats */}
        <div className="grid grid-cols-2 md:grid-cols-6 gap-2 mb-4">
          <div className="text-center p-2 bg-gray-50 rounded">
            <div className="text-lg font-semibold">{stats.total}</div>
            <div className="text-xs text-gray-600">Total</div>
          </div>
          <div className="text-center p-2 bg-blue-50 rounded">
            <div className="text-lg font-semibold text-blue-700">{stats.UPLOADED}</div>
            <div className="text-xs text-blue-600">Uploaded</div>
          </div>
          <div className="text-center p-2 bg-purple-50 rounded">
            <div className="text-lg font-semibold text-purple-700">{stats.DEPOSIT}</div>
            <div className="text-xs text-purple-600">Picked Up</div>
          </div>
          <div className="text-center p-2 bg-orange-50 rounded">
            <div className="text-lg font-semibold text-orange-700">{stats.IN_TRANSIT}</div>
            <div className="text-xs text-orange-600">In Transit</div>
          </div>
          <div className="text-center p-2 bg-green-50 rounded">
            <div className="text-lg font-semibold text-green-700">{stats.DELIVERED}</div>
            <div className="text-xs text-green-600">Delivered</div>
          </div>
          <div className="text-center p-2 bg-red-50 rounded">
            <div className="text-lg font-semibold text-red-700">{stats.RETURNED}</div>
            <div className="text-xs text-red-600">Returned</div>
          </div>
        </div>

        {/* Filters and Search */}
        <div className="mb-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 flex-1">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search tracking, order ID, or customer..."
                  className="pl-10 pr-4 py-2 border rounded-md w-full text-sm"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowFilters(!showFilters)}
                className="flex items-center gap-1"
              >
                <Filter className="h-4 w-4" />
                Filters
                {showFilters ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </Button>
            </div>
          </div>

          {showFilters && (
            <div className="flex flex-wrap items-center gap-4 p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium">Status:</label>
                <select
                  className="px-3 py-1 border rounded text-sm"
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                >
                  <option value="all">All Statuses</option>
                  <option value="UPLOADED">Uploaded</option>
                  <option value="DEPOSIT">Picked Up</option>
                  <option value="IN_TRANSIT">In Transit</option>
                  <option value="DELIVERED">Delivered</option>
                  <option value="RETURNED">Returned</option>
                </select>
              </div>
              
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium">Agency:</label>
                <select
                  className="px-3 py-1 border rounded text-sm"
                  value={filterAgency}
                  onChange={(e) => setFilterAgency(e.target.value)}
                >
                  <option value="all">All Agencies</option>
                  {agencies.map(agency => (
                    <option key={agency.id} value={agency.id}>{agency.name}</option>
                  ))}
                </select>
              </div>
              
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium">Sort:</label>
                <select
                  className="px-3 py-1 border rounded text-sm"
                  value={`${sortBy}-${sortOrder}`}
                  onChange={(e) => {
                    const [by, order] = e.target.value.split('-')
                    setSortBy(by as any)
                    setSortOrder(order as any)
                  }}
                >
                  <option value="date-desc">Latest First</option>
                  <option value="date-asc">Oldest First</option>
                  <option value="status-asc">Status A-Z</option>
                  <option value="status-desc">Status Z-A</option>
                  <option value="agency-asc">Agency A-Z</option>
                  <option value="agency-desc">Agency Z-A</option>
                </select>
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setFilterStatus('all')
                  setFilterAgency('all')
                  setSearchTerm('')
                  setSortBy('date')
                  setSortOrder('desc')
                }}
              >
                Clear Filters
              </Button>
            </div>
          )}
        </div>

        {/* Bulk Actions Bar */}
        {selectedShipments.length > 0 && (
          <div className="flex items-center gap-2 mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
            <span className="text-sm font-medium text-blue-800 dark:text-blue-200">
              {selectedShipments.length} shipments selected
            </span>
            <div className="flex gap-2 ml-auto">
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleBulkStatusUpdate("DEPOSIT")}
                disabled={bulkActionLoading}
                className="text-purple-700 border-purple-300 hover:bg-purple-50"
              >
                <Package className="h-3 w-3 mr-1" />
                Mark as Picked Up
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleBulkStatusUpdate("IN_TRANSIT")}
                disabled={bulkActionLoading}
                className="text-orange-700 border-orange-300 hover:bg-orange-50"
              >
                <Truck className="h-3 w-3 mr-1" />
                Mark In Transit
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleBulkStatusUpdate("DELIVERED")}
                disabled={bulkActionLoading}
                className="text-green-700 border-green-300 hover:bg-green-50"
              >
                <CheckCircle className="h-3 w-3 mr-1" />
                Mark Delivered
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleBulkStatusUpdate("RETURNED")}
                disabled={bulkActionLoading}
                className="text-red-700 border-red-300 hover:bg-red-50"
              >
                <RotateCcw className="h-3 w-3 mr-1" />
                Mark Returned
              </Button>
              <Button 
                size="sm" 
                variant="outline" 
                onClick={() => setSelectedShipments([])}
              >
                Clear Selection
              </Button>
            </div>
          </div>
        )}

        {/* Shipments Table */}
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">
                  <input
                    type="checkbox"
                    checked={selectedShipments.length === filteredShipments.length && filteredShipments.length > 0}
                    onChange={(e) => handleSelectAllShipments(e.target.checked)}
                    className="rounded"
                  />
                </TableHead>
                <TableHead>Tracking Number</TableHead>
                <TableHead>Order ID</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Agency</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Last Update</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredShipments.map((shipment) => {
                const agency = agencies.find((a) => a.id === shipment.agencyId)
                const isTracking = trackingLoading.includes(shipment.id)
                const customerName = shipment.metadata?.customerName as string || 'N/A'
                
                return (
                  <TableRow key={shipment.id} className="hover:bg-gray-50">
                    <TableCell>
                      <input
                        type="checkbox"
                        checked={selectedShipments.includes(shipment.id)}
                        onChange={(e) => handleShipmentSelection(shipment.id, e.target.checked)}
                        className="rounded"
                      />
                    </TableCell>
                    <TableCell>
                      <div className="font-mono text-sm">
                        {shipment.trackingNumber}
                        {shipment.barcode && (
                          <div className="text-xs text-gray-500 mt-1">
                            Barcode: {shipment.barcode}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="link"
                        className="p-0 h-auto text-blue-600 hover:text-blue-800"
                        onClick={() => handleOrderView(shipment.orderId)}
                      >
                        {shipment.orderId}
                      </Button>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        {customerName}
                        {shipment.metadata?.customerCity && (
                          <div className="text-xs text-gray-500">
                            {shipment.metadata.customerCity as string}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {agency?.name || shipment.agencyId}
                        {!agency?.enabled && (
                          <Badge variant="outline" className="text-red-600 border-red-300">
                            Disabled
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        {getStatusBadge(shipment.status)}
                        <div className="text-xs text-gray-500">
                          {getStatusDescription(shipment.status)}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        {new Date(shipment.lastStatusUpdate).toLocaleString()}
                        <div className="text-xs text-gray-500 mt-1">
                          Created: {new Date(shipment.createdAt).toLocaleDateString()}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {/* Track Button */}
                        {canTrack(shipment.status) && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleTrackSingleShipment(shipment.id)}
                            disabled={isTracking}
                            className="text-blue-700 border-blue-300 hover:bg-blue-50"
                          >
                            {isTracking ? (
                              <Clock className="h-3 w-3 mr-1 animate-spin" />
                            ) : (
                              <RefreshCw className="h-3 w-3 mr-1" />
                            )}
                            Track
                          </Button>
                        )}

                        {/* Print Label */}
                        {shipment.printUrl && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => window.open(shipment.printUrl, "_blank")}
                            className="text-gray-700 border-gray-300 hover:bg-gray-50"
                          >
                            <Printer className="h-3 w-3 mr-1" />
                            Print
                          </Button>
                        )}

                        {/* View Order */}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleOrderView(shipment.orderId)}
                          className="text-green-700 border-green-300 hover:bg-green-50"
                        >
                          <Eye className="h-3 w-3 mr-1" />
                          View
                        </Button>

                        {/* Retry Shipment */}
                        {canRetry(shipment.status) && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleRetryShipment(shipment.id)}
                            className="text-orange-700 border-orange-300 hover:bg-orange-50"
                          >
                            <RotateCcw className="h-3 w-3 mr-1" />
                            Retry
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>

        {/* Empty State */}
        {filteredShipments.length === 0 && shipments.length > 0 && (
          <div className="text-center py-8 text-gray-500">
            <Search className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No shipments match your filters</p>
            <p className="text-sm">Try adjusting your search or filter criteria</p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setFilterStatus('all')
                setFilterAgency('all')
                setSearchTerm('')
              }}
              className="mt-2"
            >
              Clear All Filters
            </Button>
          </div>
        )}

        {shipments.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            <Truck className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No shipments found</p>
            <p className="text-sm">Shipments will appear here when orders are sent to delivery agencies</p>
          </div>
        )}
      </CardContent>

      {/* Order View Dialog */}
      <OrderViewDialog
        open={viewDialogOpen}
        onClose={() => setViewDialogOpen(false)}
        orderId={selectedOrderId || null}
      />
    </Card>
  )
}