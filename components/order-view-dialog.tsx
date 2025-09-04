"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Package, User, MapPin, Phone, Mail, Globe, Monitor, Calendar, MessageSquare, Loader2 } from "lucide-react"
import type { OrderStatus } from "@/lib/types"

interface OrderData {
  id: string
  customerName: string
  customerPhone1: string
  customerPhone2?: string
  customerEmail?: string
  customerAddress: string
  customerCity: string
  status: OrderStatus
  deliveryCompany?: string
  total: number
  deliveryPrice?: number
  notes?: string
  attemptCount: number
  createdAt: string
  updatedAt: string
  confirmedBy?: {
    id: string
    username: string
    firstName?: string
    lastName?: string
  }
  items: {
    id: string
    quantity: number
    price: number
    product: {
      id: string
      name: string
      nameEn: string
      nameFr: string
      imageUrl?: string
    }
    productId: string
  }[]
  statusHistory?: {
    id: string
    status: OrderStatus
    notes?: string
    createdAt: string
    user?: {
      id: string
      username: string
      firstName?: string
      lastName?: string
    }
  }[]
  shipments?: {
    id: string
    trackingNumber: string
    status: string
    agency: {
      id: string
      name: string
    }
    createdAt: string
  }[]
  subtotal?: number
}

interface OrderViewDialogProps {
  open: boolean
  onClose: () => void
  orderId: string | null
}

export function OrderViewDialog({ open, onClose, orderId }: OrderViewDialogProps) {
  const [activeTab, setActiveTab] = useState("summary")
  const [order, setOrder] = useState<OrderData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Fetch full order details when orderId changes
  useEffect(() => {
    if (orderId && open) {
      fetchOrderDetails(orderId)
    } else {
      setOrder(null)
      setError(null)
    }
  }, [orderId, open])

  const fetchOrderDetails = async (id: string) => {
    setLoading(true)
    setError(null)
    
    try {
      const response = await fetch(`/api/orders/${id}`)
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch order details')
      }

      setOrder(data.order)
    } catch (err) {
      console.error('Failed to fetch order details:', err)
      setError(err instanceof Error ? err.message : 'Failed to load order details')
    } finally {
      setLoading(false)
    }
  }

  const getStatusBadgeColor = (status: OrderStatus) => {
    switch (status) {
      case "CONFIRMED":
        return "bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-300 dark:border-green-800"
      case "PENDING":
        return "bg-yellow-50 text-yellow-700 border-yellow-200 dark:bg-yellow-900/20 dark:text-yellow-300 dark:border-yellow-800"
      case "REJECTED":
        return "bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-300 dark:border-red-800"
      case "DELETED":
        return "bg-gray-50 text-gray-700 border-gray-200 dark:bg-gray-900/20 dark:text-gray-300 dark:border-gray-800"
      case "ABANDONED":
        return "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-900/20 dark:text-purple-300 dark:border-purple-800"
      case "ARCHIVED":
        return "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-300 dark:border-blue-800"
      case "UPLOADED":
        return "bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-900/20 dark:text-indigo-300 dark:border-indigo-800"
      case "ATTEMPTED":
        return "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-300 dark:border-amber-800"
      default:
        return "bg-gray-50 text-gray-700 border-gray-200 dark:bg-gray-900/20 dark:text-gray-300 dark:border-gray-800"
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    })
  }

  const formatStatus = (status: OrderStatus) => {
    return status.charAt(0) + status.slice(1).toLowerCase().replace('_', ' ')
  }

  const getUserDisplayName = (user: any) => {
    if (!user) return 'System'
    if (user.firstName || user.lastName) {
      return `${user.firstName || ''} ${user.lastName || ''}`.trim()
    }
    return user.username || 'Unknown User'
  }

  if (!open) return null

  if (loading) {
    return (
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl">
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin" />
            <span className="ml-2">Loading order details...</span>
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  if (error) {
    return (
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl">
          <div className="flex items-center justify-center py-8 text-red-600">
            <span>Error: {error}</span>
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  if (!order) {
    return (
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl">
          <div className="flex items-center justify-center py-8">
            <span>No order data available</span>
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  const subtotal = order.subtotal || order.items.reduce((sum, item) => sum + (item.price * item.quantity), 0)

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] flex flex-col">
        <DialogHeader className="pb-4">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-xl font-semibold">
              Order Details
            </DialogTitle>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">#{order.id.slice(-8).toUpperCase()}</span>
            </div>
          </div>
        </DialogHeader>

        <div className="flex flex-1 overflow-hidden">
          {/* Left Panel - Order & Customer Details */}
          <div className="w-1/3 pr-6 space-y-6 overflow-y-auto">
            {/* Order Information */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Order #{order.id.slice(-6).toUpperCase()}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Date Added</span>
                    <p className="font-medium">{formatDate(order.createdAt)}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Delivery Company</span>
                    <p className="font-medium">{order.deliveryCompany || '-'}</p>
                  </div>
                  <div className="col-span-2">
                    <span className="text-muted-foreground">Status</span>
                    <div className="mt-1">
                      <Badge className={`text-xs ${getStatusBadgeColor(order.status)}`}>
                        {order.status === "ATTEMPTED" && order.attemptCount > 0 
                          ? `Attempt ${order.attemptCount}` 
                          : formatStatus(order.status)
                        }
                      </Badge>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Customer Details */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Customer Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Name</span>
                    <p className="font-medium">{order.customerName || '-'}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Phone Number</span>
                    <p className="font-medium">{order.customerPhone1}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">IP</span>
                    <p className="font-medium">102.170.171.75</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Device</span>
                    <p className="font-medium">Chrome on Windows</p>
                  </div>
                  <div className="col-span-2">
                    <span className="text-muted-foreground">Address</span>
                    <p className="font-medium">{order.customerAddress || '-'}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">City</span>
                    <p className="font-medium">{order.customerCity || '-'}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Panel - Tabs */}
          <div className="w-2/3 pl-6 border-l flex flex-col overflow-hidden">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
              <TabsList className="grid w-full grid-cols-2 shrink-0">
                <TabsTrigger value="summary">Summary</TabsTrigger>
                <TabsTrigger value="history">History</TabsTrigger>
              </TabsList>
              
              <TabsContent value="summary" className="flex-1 mt-6 pr-2 space-y-4 overflow-y-auto">
                {/* Products Table */}
                <div>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Product</TableHead>
                        <TableHead>Option</TableHead>
                        <TableHead>Quantity</TableHead>
                        <TableHead>Unit Price</TableHead>
                        <TableHead>Total</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {order.items.map((item, index) => (
                        <TableRow key={item.id || index}>
                          <TableCell>
                            <div className="flex items-center space-x-3">
                              <div className="w-10 h-10 bg-purple-600 rounded flex items-center justify-center flex-shrink-0">
                                {item.product?.imageUrl ? (
                                  <img 
                                    src={item.product.imageUrl} 
                                    alt={item.product.name}
                                    className="w-10 h-10 rounded object-cover"
                                  />
                                ) : (
                                  <Package className="h-5 w-5 text-white" />
                                )}
                              </div>
                              <span className="font-medium">{item.product?.name || "Product"}</span>
                            </div>
                          </TableCell>
                          <TableCell>-</TableCell>
                          <TableCell>{item.quantity}</TableCell>
                          <TableCell>{item.price.toFixed(2)}TND</TableCell>
                          <TableCell className="font-medium">{(item.price * item.quantity).toFixed(2)}TND</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {/* Order Summary */}
                <div className="border-t pt-4">
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>Subtotal:</span>
                      <span>{subtotal.toFixed(2)}TND</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Delivery:</span>
                      <span>{(order.deliveryPrice || 0).toFixed(2)}TND</span>
                    </div>
                    <div className="flex justify-between font-bold text-lg border-t pt-2">
                      <span>Total:</span>
                      <span>{order.total.toFixed(2)}TND</span>
                    </div>
                  </div>
                </div>

                {/* Private Notes */}
                {order.notes && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm flex items-center gap-2">
                        <MessageSquare className="h-4 w-4" />
                        Private Notes
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground">{order.notes}</p>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              <TabsContent value="history" className="flex-1 mt-6 overflow-y-auto">
                <div className="space-y-4">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Comment</TableHead>
                        <TableHead>Action by</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {/* Order status history */}
                      {order.statusHistory && order.statusHistory.length > 0 ? (
                        order.statusHistory.map((history) => (
                          <TableRow key={history.id}>
                            <TableCell className="text-sm">
                              {formatDate(history.createdAt)}
                            </TableCell>
                            <TableCell>
                              {history.notes || '-'}
                            </TableCell>
                            <TableCell>
                              {getUserDisplayName(history.user)}
                            </TableCell>
                            <TableCell>
                              <Badge className={`text-xs ${getStatusBadgeColor(history.status)}`}>
                                {history.status === "ATTEMPTED" && order.attemptCount > 0 
                                  ? `Attempt ${order.attemptCount}` 
                                  : formatStatus(history.status)
                                }
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))
                      ) : (
                        // Fallback: show basic order creation and current status
                        <>
                          <TableRow>
                            <TableCell className="text-sm">{formatDate(order.createdAt)}</TableCell>
                            <TableCell>Order created</TableCell>
                            <TableCell>Customer</TableCell>
                            <TableCell>
                              <Badge className="bg-yellow-50 text-yellow-700 border-yellow-200">
                                Pending
                              </Badge>
                            </TableCell>
                          </TableRow>
                          {order.status !== 'PENDING' && (
                            <TableRow>
                              <TableCell className="text-sm">{formatDate(order.updatedAt)}</TableCell>
                              <TableCell>Status updated</TableCell>
                              <TableCell>
                                {getUserDisplayName(order.confirmedBy)}
                              </TableCell>
                              <TableCell>
                                <Badge className={`text-xs ${getStatusBadgeColor(order.status)}`}>
                                  {order.status === "ATTEMPTED" && order.attemptCount > 0 
                                    ? `Attempt ${order.attemptCount}` 
                                    : formatStatus(order.status)
                                  }
                                </Badge>
                              </TableCell>
                            </TableRow>
                          )}
                        </>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}