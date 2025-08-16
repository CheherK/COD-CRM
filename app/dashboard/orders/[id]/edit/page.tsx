"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Textarea } from "@/components/ui/textarea"
import { Save, List, Trash2, Package } from "lucide-react"
import { useParams, useRouter } from "next/navigation"
import type { OrderData, OrderStatus, OrderProduct } from "@/lib/types"
import { useToast } from "@/hooks/use-toast"
import { useLanguage } from "@/contexts/language-context"

// Sample data - in real app this would come from API
const sampleOrder: OrderData = {
  id: 2,
  products: [
    {
      id: "prod-1",
      name: "Wireless Headphones",
      thumbnail: "/placeholder.svg?height=40&width=40",
      quantity: 1,
      unitPrice: 56,
      total: 56,
      attributes: "Color: Black, Size: Medium",
    },
  ],
  customer: {
    name: "Ahmed Ben Ali",
    email: "ahmed@example.com",
    phone: "+216123456789",
    phone2: "+216987654321",
    address: "123 Main Street, Apartment 4B",
    city: "Tunis",
  },
  date: "Jul 21, 2025, 1:21 AM",
  delivery: null,
  status: "CONFIRMED",
  deliveryCost: 0,
  deliveryPrice: 7,
  total: "56TND",
  privateNote: "",
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

const deliveryCompanies = ["FastDelivery", "QuickShip", "ExpressPost", "RapidTransport", "SpeedyCourier"]

export default function EditOrderPage() {
  const { t } = useLanguage()
  const params = useParams()
  const router = useRouter()
  const { toast } = useToast()
  const orderId = params.id as string

  const [orderData, setOrderData] = useState<OrderData>(sampleOrder)
  const [selectedProduct, setSelectedProduct] = useState("")

  useEffect(() => {
    // In real app, fetch order data by ID
    console.log("Loading order:", orderId)
  }, [orderId])

  const handleStatusChange = (status: OrderStatus) => {
    setOrderData((prev) => ({
      ...prev,
      status,
      // Reset attempt number if not ATTEMPT status
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
  }

  const handleProductQuantityChange = (productId: string, quantity: number) => {
    setOrderData((prev) => ({
      ...prev,
      products: prev.products.map((product) =>
        product.id === productId ? { ...product, quantity, total: product.unitPrice * quantity } : product,
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
  }

  const handleRemoveProduct = (productId: string) => {
    setOrderData((prev) => ({
      ...prev,
      products: prev.products.filter((p) => p.id !== productId),
    }))
    calculateTotals()
  }

  const calculateTotals = () => {
    setTimeout(() => {
      setOrderData((prev) => {
        const subtotal = prev.products.reduce((sum, product) => sum + product.total, 0)
        const finalTotal = subtotal + prev.deliveryPrice
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

  const handleSave = () => {
    // In real app, save to API
    toast({
      title: t("success"),
      description: t("orderUpdatedSuccessfully"),
    })
  }

  const subtotal = orderData.products.reduce((sum, product) => sum + product.total, 0)

  return (
    <div className="space-y-6 bg-white dark:bg-gray-800 min-h-screen p-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          {t("editOrder")} n°{orderId}
        </h1>
        <Button onClick={handleSave} className="bg-purple-600 hover:bg-purple-700 text-white">
          <Save className="h-4 w-4 mr-2" />
          {t("save")}
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column */}
        <div className="space-y-6">
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

              <div>
                <Label htmlFor="deliveryCompany">{t("deliveryCompany")}</Label>
                <Select
                  value={orderData.deliveryCompany || ""}
                  onValueChange={(value) => setOrderData((prev) => ({ ...prev, deliveryCompany: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="-" />
                  </SelectTrigger>
                  <SelectContent>
                    {deliveryCompanies.map((company) => (
                      <SelectItem key={company} value={company}>
                        {company}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Private Note */}
          <Card>
            <CardHeader>
              <CardTitle>{t("addPrivateNote")}</CardTitle>
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
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="customerName">{t("customerName")}</Label>
                    <Input
                      id="customerName"
                      value={orderData.customer.name}
                      onChange={(e) => handleCustomerChange("name", e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="customerPhone">{t("customerPhone")}</Label>
                    <Input
                      id="customerPhone"
                      value={orderData.customer.phone}
                      onChange={(e) => handleCustomerChange("phone", e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="customerAddress">{t("customerAddress")}</Label>
                    <Textarea
                      id="customerAddress"
                      value={orderData.customer.address}
                      onChange={(e) => handleCustomerChange("address", e.target.value)}
                      className="min-h-[80px]"
                    />
                  </div>
                </div>
                <div className="space-y-4">
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
                    <Label htmlFor="customerPhone2">{t("phone2")}</Label>
                    <Input
                      id="customerPhone2"
                      value={orderData.customer.phone2 || ""}
                      onChange={(e) => handleCustomerChange("phone2", e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="customerCity">{t("customerCity")}</Label>
                    <Select
                      value={orderData.customer.city}
                      onValueChange={(value) => handleCustomerChange("city", value)}
                    >
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
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          {/* Product Section */}
          <Card>
            <CardHeader>
              <CardTitle>{t("selectProduct")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Select value={selectedProduct} onValueChange={setSelectedProduct}>
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder={t("products")} />
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
                  {t("add")}
                </Button>
              </div>

              {/* Orders Summary Table */}
              <div>
                <h4 className="font-medium mb-3">{t("orderSummary")}</h4>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t("product")}</TableHead>
                      <TableHead>{t("id")}</TableHead>
                      <TableHead>{t("quantity")}</TableHead>
                      <TableHead>{t("attributes")}</TableHead>
                      <TableHead>{t("unitPrice")}</TableHead>
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
                        <TableCell className="text-sm text-gray-500">{product.id}</TableCell>
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
                        <TableCell className="text-sm text-gray-500">{product.attributes || "-"}</TableCell>
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
      </div>
    </div>
  )
}
