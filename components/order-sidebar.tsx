"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Textarea } from "@/components/ui/textarea"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Save, List, Trash2, Package, Plus, AlertCircle, Truck, ExternalLink } from "lucide-react"
import type { OrderData, OrderStatus, OrderProduct } from "@/lib/types"
import { useToast } from "@/hooks/use-toast"
import { useAuth } from "@/contexts/auth-context"
import { useLanguage } from "@/contexts/language-context"
import { cn } from "@/lib/utils"

interface OrderSidebarProps {
  open: boolean
  onClose: () => void
  mode: "add" | "edit"
  order?: OrderData | null
  onSave: (order: OrderData) => void
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

const availableProducts = [
  { id: "prod-1", name: "Wireless Headphones", price: 56 },
  { id: "prod-2", name: "Smart Watch", price: 120 },
  { id: "prod-3", name: "Laptop Stand", price: 45 },
  { id: "prod-4", name: "Phone Case", price: 25 },
]

const tunisianCities = [
  "Tunis",
  "Sfax",
  "Sousse",
  "Kairouan",
  "Bizerte",
  "Gabès",
  "Ariana",
  "Gafsa",
  "Monastir",
  "Ben Arous",
  "Kasserine",
  "Medenine",
  "Nabeul",
  "Tataouine",
  "Beja",
  "Jendouba",
  "Mahdia",
  "Sidi Bouzid",
  "Siliana",
  "Manouba",
  "Kef",
  "Tozeur",
  "Kebili",
  "Zaghouan",
]

const defaultOrderData: OrderData = {
  products: [],
  customer: {
    name: "",
    email: "",
    phone: "",
    phone2: "",
    address: "",
    city: "Tunis",
  },
  delivery: null,
  status: "PENDING",
  deliveryCost: 0,
  deliveryPrice: 7,
  total: "0TND",
  privateNote: "",
}

export function OrderSidebar({ open, onClose, mode, order, onSave }: OrderSidebarProps) {
  const { t } = useLanguage()
  const [orderData, setOrderData] = useState<OrderData>(defaultOrderData)
  const [selectedProduct, setSelectedProduct] = useState("")
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState<ValidationErrors>({})
  const [deliveryAgencies, setDeliveryAgencies] = useState<DeliveryAgency[]>([])
  const [selectedDeliveryAgency, setSelectedDeliveryAgency] = useState<string>("defaultAgency")
  const [isCreatingShipment, setIsCreatingShipment] = useState(false)
  const [shipmentInfo, setShipmentInfo] = useState<{
    trackingNumber?: string
    printUrl?: string
    agencyName?: string
  } | null>(null)
  const { toast } = useToast()
  const { user } = useAuth()

  // Load delivery agencies on component mount
  useEffect(() => {
    loadDeliveryAgencies()
  }, [])

  useEffect(() => {
    if (mode === "edit" && order) {
      console.log("[OrderSidebar] Loading order for edit:", order)
      // Convert API format to frontend format
      const convertedOrder: OrderData = {
        id: order.id,
        products: (order.products || []).map((product) => ({
          id: product.id,
          name: product.name,
          thumbnail: product.thumbnail || "/placeholder.svg?height=40&width=40",
          quantity: product.quantity || 1,
          unitPrice: product.unitPrice || 0,
          total: product.total || 0,
          attributes: product.attributes || "",
        })),
        customer: {
          name: order.customer?.name || "",
          email: order.customer?.email || "",
          phone: order.customer?.phone || "",
          phone2: order.customer?.phone2 || "",
          address: order.customer?.address || "",
          city: order.customer?.city || "Tunis",
        },
        delivery: order.delivery,
        status: order.status,
        deliveryCost: order.deliveryCost || 0,
        deliveryPrice: order.deliveryPrice || 7,
        total: order.total,
        privateNote: order.privateNote || "",
        attemptNumber: order.attemptNumber,
        date: order.date,
      }
      setOrderData(convertedOrder)
      setSelectedDeliveryAgency(order.delivery || "defaultAgency")
    } else {
      setOrderData(defaultOrderData)
      setSelectedDeliveryAgency("defaultAgency")
    }
    setErrors({})
    setShipmentInfo(null)
  }, [mode, order, open])

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
        if (!orderData.products || orderData.products.length === 0) {
          newErrors.products = t("atLeastOneProductRequired")
        } else {
          delete newErrors.products
        }
        break
    }

    setErrors(newErrors)
  }

  const handleStatusChange = (status: OrderStatus) => {
    setOrderData((prev) => ({
      ...prev,
      status,
      attemptNumber: status === "ATTEMPT" ? prev.attemptNumber || 1 : undefined,
    }))
  }

  const handleAttemptNumberChange = (attemptNumber: number) => {
    setOrderData((prev) => ({
      ...prev,
      attemptNumber,
    }))
  }

  const handleCustomerChange = (field: keyof typeof orderData.customer, value: string) => {
    setOrderData((prev) => ({
      ...prev,
      customer: {
        ...prev.customer,
        [field]: value,
      },
    }))

    // Validate immediately
    if (field === "name") {
      validateField("customerName", value)
    } else if (field === "phone") {
      validateField("customerPhone", value)
    } else if (field === "address") {
      validateField("customerAddress", value)
    }
  }

  const handleDeliveryAgencyChange = async (agencyId: string) => {
    setSelectedDeliveryAgency(agencyId)
    setOrderData((prev) => ({
      ...prev,
      delivery: agencyId || null,
    }))

    // If this is an edit mode and we have a saved order, create shipment immediately
    if (mode === "edit" && orderData.id && agencyId) {
      await createShipment(agencyId)
    }
  }

  const createShipment = async (agencyId: string) => {
    if (!orderData.id) return

    setIsCreatingShipment(true)
    try {
      const agency = deliveryAgencies.find((a) => a.id === agencyId)
      if (!agency) {
        throw new Error("Selected delivery agency not found")
      }

      if (!agency.enabled || !agency.configured) {
        toast({
          title: t("error"),
          description: `Delivery agency ${agency.name} is not properly configured`,
          variant: "destructive",
        })
        return
      }

      // Prepare delivery order data
      const deliveryOrder = {
        customerName: orderData.customer.name,
        governorate: orderData.customer.city, // Map city to governorate for now
        city: orderData.customer.city,
        address: orderData.customer.address,
        phone: orderData.customer.phone,
        phone2: orderData.customer.phone2,
        productName: orderData.products.map((p) => p.name).join(", "),
        price: orderData.products.reduce((sum, p) => sum + p.total, 0),
        comment: orderData.privateNote,
        isExchange: false,
      }

      const response = await fetch("/api/delivery/shipments", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          orderId: orderData.id,
          agencyId,
          order: deliveryOrder,
        }),
      })

      const result = await response.json()

      if (result.success) {
        setShipmentInfo({
          trackingNumber: result.trackingNumber,
          printUrl: result.printUrl,
          agencyName: agency.name,
        })

        toast({
          title: t("success"),
          description: `Shipment created successfully with ${agency.name}. Tracking: ${result.trackingNumber}`,
        })
      } else {
        throw new Error(result.errorDetails || result.error || "Failed to create shipment")
      }
    } catch (error) {
      console.error("Failed to create shipment:", error)
      toast({
        title: t("error"),
        description: `Failed to create shipment: ${error instanceof Error ? error.message : "Unknown error"}`,
        variant: "destructive",
      })
    } finally {
      setIsCreatingShipment(false)
    }
  }

  const handleProductQuantityChange = (productId: string, quantity: number) => {
    setOrderData((prev) => ({
      ...prev,
      products: (prev.products || []).map((product) =>
        product.id === productId ? { ...product, quantity, total: (product.unitPrice || 0) * quantity } : product,
      ),
    }))
    calculateTotals()
  }

  const handleAddProduct = () => {
    if (!selectedProduct) return

    const product = availableProducts.find((p) => p.id === selectedProduct)
    if (!product) return

    const newProduct: OrderProduct = {
      id: product.id,
      name: product.name,
      thumbnail: "/placeholder.svg?height=40&width=40",
      quantity: 1,
      unitPrice: product.price,
      total: product.price,
      attributes: "",
    }

    setOrderData((prev) => ({
      ...prev,
      products: [...prev.products, newProduct],
    }))
    setSelectedProduct("")
    calculateTotals()
    validateField("products", true)
  }

  const handleRemoveProduct = (productId: string) => {
    setOrderData((prev) => {
      const newProducts = (prev.products || []).filter((p) => p.id !== productId)
      validateField("products", newProducts.length > 0)
      return {
        ...prev,
        products: newProducts,
      }
    })
    calculateTotals()
  }

  const calculateTotals = () => {
    setTimeout(() => {
      setOrderData((prev) => {
        const subtotal = (prev.products || []).reduce((sum, product) => sum + (product.total || 0), 0)
        const finalTotal = subtotal + (prev.deliveryPrice || 0)
        return {
          ...prev,
          total: `${finalTotal}TND`,
        }
      })
    }, 0)
  }

  const handleDeliveryPriceChange = (price: number) => {
    setOrderData((prev) => ({
      ...prev,
      deliveryPrice: price,
    }))
    calculateTotals()
  }

  const handleSave = async () => {
    // Validate all fields before saving
    validateField("customerName", orderData.customer?.name)
    validateField("customerPhone", orderData.customer?.phone)
    validateField("customerAddress", orderData.customer?.address)
    validateField("products", orderData.products?.length > 0)

    // Check if there are any errors
    const hasErrors =
      Object.keys(errors).length > 0 ||
      !orderData.customer?.name ||
      !orderData.customer?.phone ||
      !orderData.customer?.address ||
      !orderData.products?.length

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
      console.log("[OrderSidebar] Saving order:", orderData)

      // Prepare API payload
      const payload = {
        customerName: orderData.customer.name,
        customerEmail: orderData.customer.email,
        customerPhone: orderData.customer.phone,
        customerPhone2: orderData.customer.phone2,
        customerAddress: orderData.customer.address,
        customerCity: orderData.customer.city,
        status: orderData.status,
        deliveryCompany: orderData.delivery,
        deliveryPrice: orderData.deliveryPrice,
        deliveryCost: orderData.deliveryCost,
        privateNote: orderData.privateNote,
        attemptCount: orderData.attemptNumber || 0,
        items: orderData.products.map((product) => ({
          productId: product.id,
          quantity: product.quantity,
          price: product.unitPrice,
          attributes: product.attributes,
        })),
      }

      console.log("[OrderSidebar] API payload:", payload)

      // API call
      const url = mode === "add" ? "/api/orders" : `/api/orders/${orderData.id}`
      const method = mode === "add" ? "POST" : "PUT"

      // Prepare headers with user context
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      }

      // Add user ID to headers for activity logging
      if (user?.id) {
        headers["x-user-id"] = user.id
      }

      const response = await fetch(url, {
        method,
        headers,
        body: JSON.stringify(payload),
      })

      if (response.ok) {
        const savedOrder = await response.json()
        console.log("[OrderSidebar] Order saved successfully:", savedOrder)

        // Convert API response back to frontend format
        const convertedSavedOrder: OrderData = {
          id: savedOrder.id,
          products: (savedOrder.items || []).map((item: any) => ({
            id: item.productId,
            name: item.product?.name || `Product ${item.productId}`,
            thumbnail: item.product?.imageUrl || "/placeholder.svg?height=40&width=40",
            quantity: item.quantity,
            unitPrice: item.price,
            total: item.price * item.quantity,
            attributes: item.attributes,
          })),
          customer: {
            name: savedOrder.customerName,
            email: savedOrder.customerEmail,
            phone: savedOrder.customerPhone,
            phone2: savedOrder.customerPhone2,
            address: savedOrder.customerAddress,
            city: savedOrder.customerCity,
          },
          delivery: savedOrder.deliveryCompany,
          status: savedOrder.status,
          deliveryCost: savedOrder.deliveryCost,
          deliveryPrice: savedOrder.deliveryPrice,
          total: `${savedOrder.total}TND`,
          privateNote: savedOrder.privateNote,
          attemptNumber: savedOrder.attemptCount > 0 ? savedOrder.attemptCount : undefined,
          date: new Date(savedOrder.updatedAt).toLocaleString(),
        }

        // If a delivery agency was selected and this is a new order, create shipment
        if (selectedDeliveryAgency && mode === "add") {
          await createShipment(selectedDeliveryAgency)
        }

        onSave(convertedSavedOrder)
      } else {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to save order")
      }
    } catch (error) {
      console.error("[OrderSidebar] Error saving order:", error)
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
      (agency) => agency.enabled && agency.configured && agency.supportedRegions.includes(orderData.customer.city),
    )
  }

  const subtotal = (orderData.products || []).reduce((sum, product) => sum + (product.total || 0), 0)

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
                <Save className="h-4 w-4 mr-2" />
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
                  <Select value={orderData.status} onValueChange={handleStatusChange}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="PENDING">{t("pending")}</SelectItem>
                      <SelectItem value="CONFIRMED">{t("confirmed")}</SelectItem>
                      <SelectItem value="ATTEMPT">{t("attempt")}</SelectItem>
                      <SelectItem value="DELIVERED">{t("delivered")}</SelectItem>
                      <SelectItem value="REJECTED">{t("rejected")}</SelectItem>
                      <SelectItem value="RETURNED">{t("returned")}</SelectItem>
                      <SelectItem value="UPLOADED">{t("uploaded")}</SelectItem>
                      <SelectItem value="DEPOSIT">{t("deposit")}</SelectItem>
                      <SelectItem value="IN_TRANSIT">{t("inTransit")}</SelectItem>
                      <SelectItem value="ABANDONED">{t("abandoned")}</SelectItem>
                      <SelectItem value="DELETED">{t("deleted")}</SelectItem>
                      <SelectItem value="ARCHIVED">{t("archived")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {orderData.status === "ATTEMPT" && (
                  <div className="w-32">
                    <Label htmlFor="attemptNumber">{t("attemptNumber")}</Label>
                    <Input
                      id="attemptNumber"
                      type="number"
                      min="1"
                      max="99"
                      value={orderData.attemptNumber || 1}
                      onChange={(e) => handleAttemptNumberChange(Number.parseInt(e.target.value) || 1)}
                    />
                  </div>
                )}
              </div>

              {/* Delivery Agency Selection */}
              <div>
                <Label htmlFor="deliveryAgency" className="flex items-center gap-2">
                  <Truck className="h-4 w-4" />
                  {t("deliveryCompany")}
                </Label>
                <Select
                  value={selectedDeliveryAgency}
                  onValueChange={handleDeliveryAgencyChange}
                  disabled={isCreatingShipment}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t("selectDeliveryAgency")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="defaultAgency">{t("noDeliveryAgency")}</SelectItem>
                    {getAvailableAgencies().map((agency) => (
                      <SelectItem key={agency.id} value={agency.id}>
                        {agency.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {isCreatingShipment && <p className="text-sm text-muted-foreground mt-1">{t("creatingShipment")}...</p>}
              </div>

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
                value={orderData.privateNote}
                onChange={(e) => setOrderData((prev) => ({ ...prev, privateNote: e.target.value }))}
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
                  value={orderData.customer.name}
                  onChange={(e) => handleCustomerChange("name", e.target.value)}
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
                  value={orderData.customer.email}
                  onChange={(e) => handleCustomerChange("email", e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="customerPhone">{t("customerPhone")} *</Label>
                <Input
                  id="customerPhone"
                  value={orderData.customer.phone}
                  onChange={(e) => handleCustomerChange("phone", e.target.value)}
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
                  value={orderData.customer.phone2 || ""}
                  onChange={(e) => handleCustomerChange("phone2", e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="customerAddress">{t("customerAddress")} *</Label>
                <Textarea
                  id="customerAddress"
                  value={orderData.customer.address}
                  onChange={(e) => handleCustomerChange("address", e.target.value)}
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
                <Select value={orderData.customer.city} onValueChange={(value) => handleCustomerChange("city", value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {tunisianCities.map((city) => (
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
                    {availableProducts.map((product) => (
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
              {orderData.products.length > 0 && (
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
                        {orderData.products.map((product) => (
                          <TableRow key={product.id}>
                            <TableCell>
                              <div className="flex items-center space-x-2">
                                <div className="w-8 h-8 bg-purple-600 rounded flex items-center justify-center">
                                  <Package className="h-4 w-4 text-white" />
                                </div>
                                <span className="text-sm">{product.name}</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Input
                                type="number"
                                min="1"
                                value={product.quantity}
                                onChange={(e) =>
                                  handleProductQuantityChange(product.id, Number.parseInt(e.target.value) || 1)
                                }
                                className="w-16"
                              />
                            </TableCell>
                            <TableCell>{product.unitPrice}TND</TableCell>
                            <TableCell className="font-medium">{product.total}TND</TableCell>
                            <TableCell>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleRemoveProduct(product.id)}
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
                <Label>{t("deliveryCost")}:</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={orderData.deliveryCost}
                  onChange={(e) =>
                    setOrderData((prev) => ({ ...prev, deliveryCost: Number.parseFloat(e.target.value) || 0 }))
                  }
                  className="w-24 text-right"
                />
              </div>
              <div className="flex justify-between items-center">
                <Label>{t("deliveryPrice")}:</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={orderData.deliveryPrice}
                  onChange={(e) => handleDeliveryPriceChange(Number.parseFloat(e.target.value) || 0)}
                  className="w-24 text-right"
                />
              </div>
              <div className="border-t pt-4">
                <div className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-lg">
                  <div className="flex justify-between items-center text-lg font-bold text-purple-600 dark:text-purple-400">
                    <span>{t("total")}:</span>
                    <span>{subtotal + orderData.deliveryPrice}TND</span>
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
