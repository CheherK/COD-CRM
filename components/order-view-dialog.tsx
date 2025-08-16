"use client"

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Package, User, MapPin, Phone, Mail } from "lucide-react"
import type { OrderData, OrderStatus } from "@/lib/types"

interface OrderViewDialogProps {
  open: boolean
  onClose: () => void
  order: OrderData | null
}

export function OrderViewDialog({ open, onClose, order }: OrderViewDialogProps) {
  if (!order) return null

  const getStatusBadgeColor = (status: OrderStatus, attemptNumber?: number) => {
    switch (status) {
      case "CONFIRMED":
      case "DELIVERED":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300"
      case "ATTEMPT":
        return "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300"
      case "DELETED":
      case "REJECTED":
      case "RETURNED":
        return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300"
      case "UPLOADED":
      case "DEPOSIT":
      case "IN_TRANSIT":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300"
      case "ABANDONED":
        return "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300"
      case "PENDING":
      case "ARCHIVED":
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300"
    }
  }

  const getStatusDisplayText = (status: OrderStatus, attemptNumber?: number) => {
    if (status === "ATTEMPT" && attemptNumber) {
      return `Attempt ${attemptNumber}`
    }
    return status.charAt(0) + status.slice(1).toLowerCase()
  }

  const subtotal = (order.products || []).reduce((sum, product) => sum + (product.total || 0), 0)

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>Order Details - #{order.id || "N/A"}</span>
            <Badge className={getStatusBadgeColor(order.status, order.attemptNumber)}>
              {getStatusDisplayText(order.status, order.attemptNumber)}
            </Badge>
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column */}
          <div className="space-y-6">
            {/* Order Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="h-5 w-5" />
                  Order Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Order ID:</span>
                  <span className="font-medium">#{order.id || "N/A"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Date:</span>
                  <span className="font-medium">{order.date || "N/A"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Status:</span>
                  <Badge className={getStatusBadgeColor(order.status, order.attemptNumber)}>
                    {getStatusDisplayText(order.status, order.attemptNumber)}
                  </Badge>
                </div>
                {order.delivery && (
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Delivery Company:</span>
                    <span className="font-medium">{order.delivery}</span>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Customer Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Customer Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-gray-400" />
                  <span className="font-medium">{order.customer?.name || "N/A"}</span>
                </div>
                {order.customer?.email && (
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-gray-400" />
                    <span>{order.customer.email}</span>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-gray-400" />
                  <span>{order.customer?.phone || "N/A"}</span>
                </div>
                {order.customer?.phone2 && (
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-gray-400" />
                    <span>{order.customer.phone2} (Secondary)</span>
                  </div>
                )}
                <div className="flex items-start gap-2">
                  <MapPin className="h-4 w-4 text-gray-400 mt-0.5" />
                  <div>
                    <div>{order.customer?.address || "N/A"}</div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">{order.customer?.city || "N/A"}</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Private Note */}
            {order.privateNote && (
              <Card>
                <CardHeader>
                  <CardTitle>Private Note</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm">{order.privateNote}</p>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Right Column */}
          <div className="space-y-6">
            {/* Products */}
            <Card>
              <CardHeader>
                <CardTitle>Products</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Product</TableHead>
                      <TableHead>Qty</TableHead>
                      <TableHead>Price</TableHead>
                      <TableHead>Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(order.products || []).map((product) => (
                      <TableRow key={product.id}>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            <div className="w-8 h-8 bg-purple-600 rounded flex items-center justify-center">
                              <Package className="h-4 w-4 text-white" />
                            </div>
                            <div>
                              <div className="font-medium text-sm">{product.name || "N/A"}</div>
                              {product.attributes && <div className="text-xs text-gray-500">{product.attributes}</div>}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>{product.quantity || 0}</TableCell>
                        <TableCell>{product.unitPrice || 0}TND</TableCell>
                        <TableCell className="font-medium">{product.total || 0}TND</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            {/* Pricing Summary */}
            <Card>
              <CardHeader>
                <CardTitle>Order Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between">
                  <span>Subtotal:</span>
                  <span>{subtotal}TND</span>
                </div>
                <div className="flex justify-between">
                  <span>Delivery Cost:</span>
                  <span>{order.deliveryCost || 0}TND</span>
                </div>
                <div className="flex justify-between">
                  <span>Delivery Price:</span>
                  <span>{order.deliveryPrice || 0}TND</span>
                </div>
                <div className="border-t pt-3">
                  <div className="flex justify-between items-center text-lg font-bold text-purple-600 dark:text-purple-400">
                    <span>Total:</span>
                    <span>{subtotal + (order.deliveryPrice || 0)}TND</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
