"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Textarea } from "@/components/ui/textarea"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Badge } from "@/components/ui/badge"
import { Save, List, Trash2, Package, Plus, AlertCircle, Truck, ExternalLink, Loader2 } from "lucide-react"
import type { OrderStatus } from "@/lib/types"
import { useToast } from "@/hooks/use-toast"
import { useAuth } from "@/contexts/auth-context"
import { useLanguage } from "@/contexts/language-context"
import { cn } from "@/lib/utils"
import { DeliveryShipment, DeliveryStatusEnum } from "@/lib/delivery/types";

interface OrderSidebarProps {
  open: boolean
  onClose: () => void
  mode: "add" | "edit"
  order?: any
  onSave: () => void
}

interface ValidationErrors {
  customerName?: string
  customerPhone?: string
  customerAddress?: string
  products?: string
}

interface DeliveryAgency {
  id: string
  name: string
  supportedRegions: string[]
  enabled: boolean
  configured: boolean
}

interface Product {
  id: string
  name: string
  nameEn: string
  nameFr: string
  price: number
  imageUrl?: string
}

interface OrderItem {
  id?: string
  productId: string
  quantity: number
  price: number
  product?: Product
}

interface OrderFormData {
  id?: string
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
  items: OrderItem[]
}

const tunisianCities = [
  "Tunis", "Sfax", "Sousse", "Kairouan", "Bizerte", "Gabès", "Ariana", 
  "Gafsa", "Monastir", "Ben Arous", "Kasserine", "Medenine", "Nabeul", "Tataouine"
]

const defaultOrderData: OrderFormData = {
  customerName: "",
  customerPhone1: "",
  customerPhone2: "",
  customerEmail: "",
  customerAddress: "",
  customerCity: "Tunis",
  status: "PENDING",
  deliveryCompany: "",
  total: 0,
  deliveryPrice: 7,
  notes: "",
  attemptCount: 0,
  items: []
}

export function OrderSidebar({ open, onClose, mode, order, onSave }: OrderSidebarProps) {
  const { t } = useLanguage()
  const [orderData, setOrderData] = useState<OrderFormData>(defaultOrderData)
  const [selectedProduct, setSelectedProduct] = useState<string | undefined>(undefined)
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState<ValidationErrors>({})
  const [deliveryAgencies, setDeliveryAgencies] = useState<DeliveryAgency[]>([])
  const [selectedDeliveryAgency, setSelectedDeliveryAgency] = useState<string>("")
  const [isCreatingShipment, setIsCreatingShipment] = useState(false)
  const [shipmentInfo, setShipmentInfo] = useState<any>(null)
  const [products, setProducts] = useState<Product[]>([])
  const { toast } = useToast()
  const { user } = useAuth()

  // Load products and delivery agencies on component mount
  useEffect(() => {
    loadProducts()
    loadDeliveryAgencies()
  }, [])

  // Update form when order changes
  useEffect(() => {
    if (mode === "edit" && order) {
      console.log("Loading order for edit:", order)
      const formattedOrder: OrderFormData = {
        id: order.id,
        customerName: order.customerName,
        customerPhone1: order.customerPhone1,
        customerPhone2: order.customerPhone2 || "",
        customerEmail: order.customerEmail || "",
        customerAddress: order.customerAddress,
        customerCity: order.customerCity,
        status: order.status,
        deliveryCompany: order.deliveryCompany || "",
        total: order.total,
        deliveryPrice: order.deliveryPrice || 7,
        notes: order.notes || "",
        attemptCount: order.attemptCount || 0,
        items: order.items.map((item: any) => ({
          id: item.id,
          productId: item.productId,
          quantity: item.quantity,
          price: item.price,
          product: item.product
        }))
      }
      setOrderData(formattedOrder)
      setSelectedDeliveryAgency(order.deliveryCompany || "")
    } else {
      setOrderData(defaultOrderData)
      setSelectedDeliveryAgency("")
    }
    setErrors({})
    setShipmentInfo(null)
  }, [mode, order, open])

  // Recalculate total when items or delivery price changes
  useEffect(() => {
    const subtotal = orderData.items.reduce((sum, item) => sum + (item.price * item.quantity), 0)
    const deliveryPrice = orderData.deliveryPrice || 0
    const newTotal = subtotal + deliveryPrice
    
    if (newTotal !== orderData.total) {
      setOrderData(prev => ({
        ...prev,
        total: newTotal
      }))
    }
  }, [orderData.items, orderData.deliveryPrice])

  const loadProducts = async () => {
    try {
      const response = await fetch('/api/products?limit=1000')
      const data = await response.json()
      if (response.ok) {
        setProducts(data.products || [])
      }
    } catch (error) {
      console.error('Failed to fetch products:', error)
    }
  }

  const loadDeliveryAgencies = async () => {
    try {
      const response = await fetch("/api/delivery/agencies")
      if (response.ok) {
        const data = await response.json()
        setDeliveryAgencies(data.agencies || [])
      }
    } catch (error) {
      console.error("Failed to load delivery agencies:", error)
    }
  }

  const validateField = (field: keyof ValidationErrors, value: any) => {
    const newErrors = { ...errors }

    switch (field) {
      case "customerName":
        if (!value || value.trim().length < 2) {
          newErrors.customerName = t("customerNameAtLeast2Characters")
        } else {
          delete newErrors.customerName
        }
        break
      case "customerPhone":
        if (!value || value.trim().length < 8) {
          newErrors.customerPhone = t("phoneNumberAtLeast8Characters")
        } else {
          delete newErrors.customerPhone
        }
        break
      case "customerAddress":
        if (!value || value.trim().length < 10) {
          newErrors.customerAddress = t("addressAtLeast10Characters")
        } else {
          delete newErrors.customerAddress
        }
        break
      case "products":
        if (!orderData.items || orderData.items.length === 0) {
          newErrors.products = t("atLeastOneProductRequired")
        } else {
          delete newErrors.products
        }
        break
    }

    setErrors(newErrors)
  }

  const handleCustomerChange = (field: keyof typeof orderData, value: string) => {
    setOrderData(prev => ({
      ...prev,
      [field]: value
    }))

    // Validate immediately
    if (field === "customerName") {
      validateField("customerName", value)
    } else if (field === "customerPhone1") {
      validateField("customerPhone", value)
    } else if (field === "customerAddress") {
      validateField("customerAddress", value)
    }
  }

  const getStatusBadgeColor = (status: OrderStatus | DeliveryStatusEnum) => {
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
      // Delivery statuses (these come from delivery agencies)
      case "DEPOSIT":
        return "bg-cyan-50 text-cyan-700 border-cyan-200 dark:bg-cyan-900/20 dark:text-cyan-300 dark:border-cyan-800"
      case "IN_TRANSIT":
        return "bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-900/20 dark:text-orange-300 dark:border-orange-800"
      case "DELIVERED":
        return "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-300 dark:border-emerald-800"
      case "RETURNED":
        return "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-900/20 dark:text-rose-300 dark:border-rose-800"
      case("ATTEMPTED"):
          return "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-300 dark:border-amber-800"
      default:
        return "bg-gray-50 text-gray-700 border-gray-200 dark:bg-gray-900/20 dark:text-gray-300 dark:border-gray-800"
    }
  }

  const getAvailableStatuses = (currentStatus: OrderStatus, attemptCount?: number) => {
    // Base statuses that are always available for admin flexibility
    const alwaysAvailable = [
      { value: "PENDING", label: t("pending") },
      { value: "ABANDONED", label: t("abandoned") },
      { value: "DELETED", label: t("deleted") },
      { value: "ARCHIVED", label: t("archived") }
    ]

    // Status-specific transitions based on order lifecycle
    const conditionalStatuses = []

    switch (currentStatus) {
      case "PENDING":
        conditionalStatuses.push(
          { value: "CONFIRMED", label: t("confirmed") },
          { value: "REJECTED", label: t("rejected") },
          { value: "ATTEMPTED", label: t("attempted") }
        )
        break

      case "CONFIRMED":
        conditionalStatuses.push(
          { value: "UPLOADED", label: t("uploaded") },
          { value: "REJECTED", label: t("rejected") }
        )
        break

      case "UPLOADED":
        // Once uploaded, only admin can change status manually
        // Delivery statuses are handled by the delivery system
        conditionalStatuses.push(
          { value: "CONFIRMED", label: t("confirmed") } // Allow going back if needed
        )
        break

      case "REJECTED":
        conditionalStatuses.push(
          { value: "PENDING", label: t("pending") },
          { value: "CONFIRMED", label: t("confirmed") }
        )
        break

      default:
        // For attempt statuses
        if (currentStatus === "ATTEMPTED") {
          conditionalStatuses.push(
            { value: "CONFIRMED", label: t("confirmed") },
            { value: "REJECTED", label: t("rejected") }
          )
        } else {
          // For other statuses, allow basic transitions
          conditionalStatuses.push(
            { value: "PENDING", label: t("pending") },
            { value: "CONFIRMED", label: t("confirmed") },
            { value: "REJECTED", label: t("rejected") }
          )
        }
        break
    }

    // Combine and remove duplicates
    const allStatuses = [...alwaysAvailable, ...conditionalStatuses]
    const uniqueStatuses = allStatuses.filter((status, index, self) => 
      index === self.findIndex(s => s.value === status.value)
    )

    return uniqueStatuses.sort((a, b) => {
      // Sort order: current status first, then logical flow order
      if (a.value === currentStatus) return -1
      if (b.value === currentStatus) return 1
      
      const order = ['PENDING', 'ATTEMPTED', 'CONFIRMED', 'UPLOADED', 'REJECTED', 'ABANDONED', 'DELETED', 'ARCHIVED']
      const aIndex = order.indexOf(a.value)
      const bIndex = order.indexOf(b.value)
      
      if (aIndex !== -1 && bIndex !== -1) return aIndex - bIndex
      if (aIndex !== -1) return -1
      if (bIndex !== -1) return 1
      return a.label.localeCompare(b.label)
    })
  }

  const handleStatusChange = (status: OrderStatus) => {
    setOrderData(prev => {
      const newData = { ...prev, status }
      
      // Clear delivery company if status is changed away from CONFIRMED/UPLOADED
      if (status === 'PENDING' || status === 'REJECTED' || status === 'ABANDONED' || status === 'DELETED') {
        newData.deliveryCompany = ""
        setSelectedDeliveryAgency("")
      }
      
      // Reset shipment info if status changes away from UPLOADED
      if (status !== 'UPLOADED') {
        setShipmentInfo(null)
      }
      
      return newData
    })
  }

  const handleDeliveryAgencyChange = (agencyId: string) => {
    setSelectedDeliveryAgency(agencyId)
    const agency = deliveryAgencies.find(a => a.id === agencyId)
    setOrderData(prev => ({
      ...prev,
      deliveryCompany: agency ? agency.name : ""
    }))
  }

  const handleProductQuantityChange = (index: number, quantity: number) => {
    setOrderData(prev => {
      const newItems = [...prev.items]
      newItems[index] = { ...newItems[index], quantity }
      return { ...prev, items: newItems }
    })
  }

  const handleAddProduct = () => {
    if (!selectedProduct) return

    const product = products.find(p => p.id === selectedProduct)
    if (!product) return

    const newItem: OrderItem = {
      productId: product.id,
      quantity: 1,
      price: product.price,
      product
    }

    setOrderData(prev => ({
      ...prev,
      items: [...prev.items, newItem]
    }))
    setSelectedProduct(undefined)
    validateField("products", true)
  }

  const handleRemoveProduct = (index: number) => {
    setOrderData(prev => {
      const newItems = prev.items.filter((_, i) => i !== index)
      return { ...prev, items: newItems }
    })
    validateField("products", orderData.items.length > 1)
  }

  const handleDeliveryPriceChange = (price: number) => {
    setOrderData(prev => ({
      ...prev,
      deliveryPrice: price
    }))
  }

  const createShipment = async () => {
    if (!orderData.id || !selectedDeliveryAgency) return

    setIsCreatingShipment(true)
    try {
      const response = await fetch('/api/delivery/shipments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          orderId: orderData.id,
          agencyId: selectedDeliveryAgency
        }),
      })

      const result = await response.json()

      if (response.ok) {
        setShipmentInfo({
          trackingNumber: result.trackingNumber,
          printUrl: result.printUrl,
          agencyName: orderData.deliveryCompany
        })

        // Update order status to UPLOADED
        setOrderData(prev => ({
          ...prev,
          status: "UPLOADED"
        }))

        toast({
          title: t("success"),
          description: t("shipmentCreatedSuccessfully"),
        })
      } else {
        throw new Error(result.error || "Failed to create shipment")
      }
    } catch (error) {
      console.error("Failed to create shipment:", error)
      toast({
        title: t("error"),
        description: t("failedToCreateShipment"),
        variant: "destructive",
      })
    } finally {
      setIsCreatingShipment(false)
    }
  }

  const handleSave = async () => {
    console.log("Saving order:", orderData)
    // Validate all fields before saving
    validateField("customerName", orderData.customerName)
    validateField("customerPhone", orderData.customerPhone1)
    validateField("customerAddress", orderData.customerAddress)
    validateField("products", orderData.items.length > 0)

    // Check if there are any errors
    const hasErrors = Object.keys(errors).length > 0 || 
                     !orderData.customerName.trim() || 
                     !orderData.customerPhone1.trim() || 
                     !orderData.customerAddress.trim() || 
                     orderData.items.length === 0

    if (hasErrors) {
      toast({
        title: t("validationError"),
        description: t("pleaseFixAllErrorsBeforeSaving"),
        variant: "destructive",
      })
      return
    }

    setLoading(true)
    try {
      // Prepare API payload
      const payload = {
        customerName: orderData.customerName,
        customerPhone1: orderData.customerPhone1,
        customerPhone2: orderData.customerPhone2 || null,
        customerEmail: orderData.customerEmail || null,
        customerAddress: orderData.customerAddress,
        customerCity: orderData.customerCity,
        status: orderData.status,
        deliveryCompany: orderData.deliveryCompany || null,
        deliveryPrice: orderData.deliveryPrice || 0,
        notes: orderData.notes || null,
        attemptCount: orderData.attemptCount,
        items: orderData.items.map(item => ({
          productId: item.productId,
          quantity: item.quantity,
          price: item.price
        }))
      }

      // API call
      const url = mode === "add" ? "/api/orders" : `/api/orders/${orderData.id}`
      const method = mode === "add" ? "POST" : "PUT"

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      })

      if (response.ok) {
        const result = await response.json()
        
        toast({
          title: t("success"),
          description: mode === "add" ? t("orderCreatedSuccessfully") : t("orderUpdatedSuccessfully"),
        })

        // If this is a new order and we have a delivery agency selected, create shipment
        if (mode === "add" && selectedDeliveryAgency && result.order) {
          setOrderData(prev => ({ ...prev, id: result.order.id }))
          await createShipment()
        }

        onSave()
      } else {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to save order")
      }
    } catch (error) {
      console.error("Error saving order:", error)
      toast({
        title: t("error"),
        description: `${t("failedToSaveOrder")}: ${error instanceof Error ? error.message : "Unknown error"}`,
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const getAvailableAgencies = () => {
    return deliveryAgencies.filter(
      agency => agency.enabled && agency.configured
    )
  }

  const subtotal = orderData.items.reduce((sum, item) => sum + (item.price * item.quantity), 0)
  const showAttemptField = orderData.status === "ATTEMPTED"

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent
        side="right"
        className="w-full sm:w-[700px] lg:w-[800px] xl:w-[900px] sm:max-w-[700px] lg:max-w-[800px] xl:max-w-[900px] overflow-y-auto p-0"
      >
        {/* Fixed Header */}
        <div className="sticky top-0 z-10 bg-background border-b px-6 py-4">
          <SheetHeader>
            <div className="flex items-center justify-between">
              <SheetTitle className="text-xl">
                {mode === "add" ? t("addOrder") : `${t("editOrder")} n°${orderData.id}`}
              </SheetTitle>
              <Button onClick={handleSave} disabled={loading} className="bg-purple-600 hover:bg-purple-700 text-white">
                {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                {loading ? t("saving") : t("save")}
              </Button>
            </div>
          </SheetHeader>
        </div>

        {/* Scrollable Content */}
        <div className="px-6 py-6 space-y-6">
          {/* Order Details */}
          <Card>
            <CardHeader>
              <CardTitle>{t("orderDetails")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-4">
                <div className="flex-1">
                  <Label htmlFor="status">{t("status")}</Label>
                  <div className="space-y-2">
                    <Select value={orderData.status} onValueChange={handleStatusChange}>
                      <SelectTrigger>
                        <SelectValue>
                            <Badge
                              className={`border text-xs ${getStatusBadgeColor(orderData.status)}`}
                            >
                              {
                                orderData.status
                              }
                            </Badge>
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {getAvailableStatuses(orderData.status, orderData.attemptCount).map(
                          (status) => (
                            <SelectItem key={status.value} value={status.value}>
                              <div className="flex items-center gap-2">
                                <Badge
                                  className={`border text-xs ${getStatusBadgeColor(
                                    status.value as OrderStatus
                                  )}`}
                                >
                                  {status.label}
                                </Badge>
                              </div>
                            </SelectItem>
                          )
                        )}
                      </SelectContent>
                    </Select>
                    
                    {/* Status flow help text */}
                    <div className="text-xs text-muted-foreground bg-gray-50 dark:bg-gray-800 p-2 rounded">
                      {orderData.status === 'PENDING' && (
                        <p>📞 {t("pendingHelpText")}</p>
                      )}
                      {orderData.status === 'ATTEMPTED' && (
                        <p>🔄 {t("attemptHelpText",)}</p>
                      )}
                      {orderData.status === 'CONFIRMED' && (
                        <p>✅ {t("confirmedHelpText")}</p>
                      )}
                      {orderData.status === 'UPLOADED' && (
                        <p>📦 {t("uploadedHelpText")}</p>
                      )}
                      {orderData.status === 'REJECTED' && (
                        <p>❌ {t("rejectedHelpText")}</p>
                      )}
                      {orderData.status === 'ABANDONED' && (
                        <p>❓ {t("abandonedHelpText")}</p>
                      )}
                    </div>
                  </div>
                </div>

                {showAttemptField && (
                  <div className="w-32">
                    <Label htmlFor="attemptCount">{t("attemptCount")}</Label>
                    <Input
                      id="attemptCount"
                      type="number"
                      min="0"
                      max="99"
                      value={orderData.attemptCount}
                      onChange={(e) => setOrderData(prev => ({
                        ...prev,
                        attemptCount: Number.parseInt(e.target.value) || 0
                      }))}
                    />
                    <div className="text-xs text-muted-foreground mt-1">
                      {t("callAttempts")}
                    </div>
                  </div>
                )}
              </div>

              {/* Delivery Agency Selection - Only show for CONFIRMED orders */}
              {(orderData.status === "CONFIRMED" || orderData.status === "UPLOADED") && (
                <div>
                  <Label htmlFor="deliveryAgency" className="flex items-center gap-2 mb-2">
                    <Truck className="h-4 w-4" />
                    {t("deliveryCompany")}
                  </Label>
                  <Select
                    value={selectedDeliveryAgency}
                    onValueChange={handleDeliveryAgencyChange}
                    disabled={isCreatingShipment || orderData.status === "UPLOADED"}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={t("selectDeliveryAgency")} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="no-agency">{t("noDeliveryAgency")}</SelectItem>
                      {getAvailableAgencies().map((agency) => (
                        <SelectItem key={agency.id} value={agency.id}>
                          {agency.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {isCreatingShipment && <p className="text-sm text-muted-foreground mt-1">{t("creatingShipment")}...</p>}
                  {orderData.status === "UPLOADED" && (
                    <p className="text-sm text-green-600 dark:text-green-400 mt-1">
                      ✅ {t("orderAlreadyUploaded")}
                    </p>
                  )}
                </div>
              )}

              {/* Create Shipment Button */}
              {selectedDeliveryAgency && selectedDeliveryAgency !== "no-agency" && orderData.status === "CONFIRMED" && (
                <Button 
                  onClick={createShipment} 
                  disabled={isCreatingShipment}
                  className="w-full"
                >
                  {isCreatingShipment ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Truck className="h-4 w-4 mr-2" />
                  )}
                  {t("createShipment")}
                </Button>
              )}

              {/* Shipment Information */}
              {shipmentInfo && (
                <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Truck className="h-4 w-4 text-green-600" />
                    <span className="font-medium text-green-800 dark:text-green-200">{t("shipmentCreated")}</span>
                  </div>
                  <div className="space-y-1 text-sm">
                    <p>
                      <strong>{t("agency")}:</strong> {shipmentInfo.agencyName}
                    </p>
                    <p>
                      <strong>{t("trackingNumber")}:</strong> {shipmentInfo.trackingNumber}
                    </p>
                    {shipmentInfo.printUrl && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="mt-2 bg-transparent"
                        onClick={() => window.open(shipmentInfo.printUrl, "_blank")}
                      >
                        <ExternalLink className="h-3 w-3 mr-1" />
                        {t("printLabel")}
                      </Button>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Private Note */}
          <Card>
            <CardHeader>
              <CardTitle>{t("privateNote")}</CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                placeholder={t("addPrivateNote")}
                value={orderData.notes || ""}
                onChange={(e) => setOrderData(prev => ({ ...prev, notes: e.target.value }))}
                className="min-h-[100px]"
              />
            </CardContent>
          </Card>

          {/* Customer Details */}
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>{t("customerDetails")}</CardTitle>
                <Button variant="outline" size="sm">
                  <List className="h-4 w-4 mr-2" />
                  {t("checkOrders")}
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="customerName">{t("customerName")} *</Label>
                <Input
                  id="customerName"
                  value={orderData.customerName}
                  onChange={(e) => handleCustomerChange("customerName", e.target.value)}
                  className={cn(errors.customerName && "border-red-500")}
                  required
                />
                {errors.customerName && (
                  <div className="flex items-center gap-1 mt-1 text-sm text-red-600">
                    <AlertCircle className="h-3 w-3" />
                    {errors.customerName}
                  </div>
                )}
              </div>
              <div>
                <Label htmlFor="customerEmail">{t("customerEmail")}</Label>
                <Input
                  id="customerEmail"
                  type="email"
                  value={orderData.customerEmail || ""}
                  onChange={(e) => handleCustomerChange("customerEmail", e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="customerPhone1">{t("customerPhone")} *</Label>
                <Input
                  id="customerPhone1"
                  value={orderData.customerPhone1}
                  onChange={(e) => handleCustomerChange("customerPhone1", e.target.value)}
                  className={cn(errors.customerPhone && "border-red-500")}
                  required
                />
                {errors.customerPhone && (
                  <div className="flex items-center gap-1 mt-1 text-sm text-red-600">
                    <AlertCircle className="h-3 w-3" />
                    {errors.customerPhone}
                  </div>
                )}
              </div>
              <div>
                <Label htmlFor="customerPhone2">{t("phone2")}</Label>
                <Input
                  id="customerPhone2"
                  value={orderData.customerPhone2 || ""}
                  onChange={(e) => handleCustomerChange("customerPhone2", e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="customerAddress">{t("customerAddress")} *</Label>
                <Textarea
                  id="customerAddress"
                  value={orderData.customerAddress}
                  onChange={(e) => handleCustomerChange("customerAddress", e.target.value)}
                  className={cn("min-h-[80px]", errors.customerAddress && "border-red-500")}
                  required
                />
                {errors.customerAddress && (
                  <div className="flex items-center gap-1 mt-1 text-sm text-red-600">
                    <AlertCircle className="h-3 w-3" />
                    {errors.customerAddress}
                  </div>
                )}
              </div>
              <div>
                <Label htmlFor="customerCity">{t("customerCity")}</Label>
                <Select 
                  value={orderData.customerCity} 
                  onValueChange={(value) => handleCustomerChange("customerCity", value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {tunisianCities.filter((city) => city !== "").map((city) => (
                      <SelectItem key={city} value={city}>
                        {city}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Product Section */}
          <Card>
            <CardHeader>
              <CardTitle>{t("products")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Select value={selectedProduct} onValueChange={setSelectedProduct}>
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder={t("selectAProduct")} />
                  </SelectTrigger>
                  <SelectContent>
                    {products.map((product) => (
                      <SelectItem key={product.id} value={product.id}>
                        {product.name} - {product.price}TND
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button onClick={handleAddProduct} disabled={!selectedProduct}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>

              {errors.products && (
                <div className="flex items-center gap-1 text-sm text-red-600">
                  <AlertCircle className="h-3 w-3" />
                  {errors.products}
                </div>
              )}

              {/* Products Table */}
              {orderData.items.length > 0 && (
                <div>
                  <h4 className="font-medium mb-3">{t("orderSummary")}</h4>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>{t("product")}</TableHead>
                          <TableHead>{t("quantity")}</TableHead>
                          <TableHead>{t("price")}</TableHead>
                          <TableHead>{t("total")}</TableHead>
                          <TableHead>{t("action")}</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {orderData.items.map((item, index) => (
                          <TableRow key={index}>
                            <TableCell>
                              <div className="flex items-center space-x-2">
                                <div className="w-8 h-8 bg-purple-600 rounded flex items-center justify-center">
                                  {item.product?.imageUrl ? (
                                    <img 
                                      src={item.product.imageUrl} 
                                      alt={item.product.name}
                                      className="w-8 h-8 rounded object-cover"
                                    />
                                  ) : (
                                    <Package className="h-4 w-4 text-white" />
                                  )}
                                </div>
                                <span className="text-sm">{item.product?.name || "Product"}</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Input
                                type="number"
                                min="1"
                                value={item.quantity}
                                onChange={(e) =>
                                  handleProductQuantityChange(index, Number.parseInt(e.target.value) || 1)
                                }
                                className="w-16"
                              />
                            </TableCell>
                            <TableCell>{item.price.toFixed(2)}TND</TableCell>
                            <TableCell className="font-medium">{(item.price * item.quantity).toFixed(2)}TND</TableCell>
                            <TableCell>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleRemoveProduct(index)}
                                className="text-red-600 hover:text-red-700"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Pricing Summary */}
          <Card>
            <CardHeader>
              <CardTitle>{t("pricing")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between items-center">
                <Label>{t("subtotal")}:</Label>
                <span className="font-medium">{subtotal.toFixed(2)}TND</span>
              </div>
              <div className="flex justify-between items-center">
                <Label>{t("deliveryPrice")}:</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={orderData.deliveryPrice || 0}
                  onChange={(e) => handleDeliveryPriceChange(Number.parseFloat(e.target.value) || 0)}
                  className="w-24 text-right"
                />
              </div>
              <div className="border-t pt-4">
                <div className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-lg">
                  <div className="flex justify-between items-center text-lg font-bold text-purple-600 dark:text-purple-400">
                    <span>{t("total")}:</span>
                    <span>{orderData.total.toFixed(2)}TND</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </SheetContent>
    </Sheet>
  )
}