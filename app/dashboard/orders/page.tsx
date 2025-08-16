"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Switch } from "@/components/ui/switch"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Search, Plus, Eye, Edit, Trash2, Filter, CalendarIcon, Package, Download, ChevronDown, X } from "lucide-react"
import { format } from "date-fns"
import type { OrderData, OrderStatus, BulkOrderAction } from "@/lib/types"
import { useToast } from "@/hooks/use-toast"
import { OrderSidebar } from "@/components/order-sidebar"
import { OrderViewDialog } from "@/components/order-view-dialog"
import { Label } from "@/components/ui/label"
import { useLanguage } from "@/contexts/language-context"

// Sample data
const sampleOrders: OrderData[] = [
  {
    id: 2,
    products: [
      {
        id: "prod-1",
        name: "Wireless Headphones",
        thumbnail: "/placeholder.svg?height=40&width=40",
        quantity: 1,
        unitPrice: 56,
        total: 56,
      },
    ],
    customer: {
      name: "Ahmed",
      email: "ahmed@example.com",
      phone: "+216123456789",
      address: "123 Main St",
      city: "Tunis",
    },
    date: "Jul 21, 2025, 1:21 AM",
    delivery: "FastDelivery",
    status: "CONFIRMED",
    deliveryCost: 0,
    deliveryPrice: 7,
    total: "56TND",
  },
  {
    id: 1,
    products: [
      {
        id: "prod-2",
        name: "Smart Watch",
        thumbnail: "/placeholder.svg?height=40&width=40",
        quantity: 1,
        unitPrice: 2,
        total: 2,
      },
    ],
    customer: {
      name: "Karim",
      email: "karim@example.com",
      phone: "+216987654321",
      address: "456 Oak Ave",
      city: "Sfax",
    },
    date: "Jul 21, 2025, 1:19 AM",
    delivery: "QuickShip",
    status: "ATTEMPT",
    attemptNumber: 13,
    deliveryCost: 0,
    deliveryPrice: 7,
    total: "2TND",
  },
  {
    id: 3,
    products: [
      {
        id: "prod-3",
        name: "Laptop Stand",
        thumbnail: "/placeholder.svg?height=40&width=40",
        quantity: 2,
        unitPrice: 45,
        total: 90,
      },
    ],
    customer: {
      name: "Sara",
      email: "sara@example.com",
      phone: "+216555666777",
      address: "789 Pine St",
      city: "Sousse",
    },
    date: "Jul 20, 2025, 3:45 PM",
    delivery: "FastDelivery",
    status: "ABANDONED",
    deliveryCost: 5,
    deliveryPrice: 10,
    total: "90TND",
  },
  {
    id: 4,
    products: [
      {
        id: "prod-4",
        name: "Phone Case",
        thumbnail: "/placeholder.svg?height=40&width=40",
        quantity: 1,
        unitPrice: 25,
        total: 25,
      },
    ],
    customer: {
      name: "Omar",
      email: "omar@example.com",
      phone: "+216444555666",
      address: "321 Elm St",
      city: "Monastir",
    },
    date: "Jul 19, 2025, 2:30 PM",
    delivery: "ExpressPost",
    status: "DELETED",
    deliveryCost: 3,
    deliveryPrice: 8,
    total: "25TND",
  },
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
]

const deliveryCompanies = ["FastDelivery", "QuickShip", "ExpressPost", "RapidTransport", "SpeedyCourier"]

const availableProducts = [
  "Wireless Headphones",
  "Smart Watch",
  "Laptop Stand",
  "Phone Case",
  "Bluetooth Speaker",
  "Tablet",
]

export default function OrdersPage() {
  const { t } = useLanguage()
  const [orders, setOrders] = useState<OrderData[]>(sampleOrders)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [selectedOrders, setSelectedOrders] = useState<number[]>([])
  const [showAllOrders, setShowAllOrders] = useState(false)
  const [dateRange, setDateRange] = useState<{ from?: Date; to?: Date }>({})
  const [activeTab, setActiveTab] = useState("orders")
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [sidebarMode, setSidebarMode] = useState<"add" | "edit">("add")
  const [selectedOrder, setSelectedOrder] = useState<OrderData | null>(null)
  const [viewDialogOpen, setViewDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [orderToDelete, setOrderToDelete] = useState<OrderData | null>(null)
  const [advancedFilterOpen, setAdvancedFilterOpen] = useState(false)

  // Advanced filter states
  const [productFilter, setProductFilter] = useState("")
  const [cityFilter, setCityFilter] = useState("")
  const [deliveryFilter, setDeliveryFilter] = useState("")

  const { toast } = useToast()

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
      return `${t("attempt")} ${attemptNumber}`
    }

    switch (status) {
      case "PENDING":
        return t("pending")
      case "CONFIRMED":
        return t("confirmed")
      case "DELIVERED":
        return t("delivered")
      case "REJECTED":
        return t("rejected")
      case "RETURNED":
        return t("returned")
      case "UPLOADED":
        return t("uploaded")
      case "DEPOSIT":
        return t("deposit")
      case "IN_TRANSIT":
        return t("inTransit")
      case "ABANDONED":
        return t("abandoned")
      case "DELETED":
        return t("deleted")
      case "ARCHIVED":
        return t("archived")
      default:
        return status
    }
  }

  const filteredOrders = orders.filter((order) => {
    const matchesSearch =
      (order.customer?.name || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (order.id?.toString() || "").includes(searchTerm)

    const matchesStatus = statusFilter === "all" || order.status === statusFilter

    const matchesProduct =
      !productFilter ||
      (order.products || []).some((product) => product.name.toLowerCase().includes(productFilter.toLowerCase()))

    const matchesCity = !cityFilter || (order.customer?.city || "").toLowerCase().includes(cityFilter.toLowerCase())

    const matchesDelivery =
      !deliveryFilter || (order.delivery || "").toLowerCase().includes(deliveryFilter.toLowerCase())

    return matchesSearch && matchesStatus && matchesProduct && matchesCity && matchesDelivery
  })

  const getOrdersByTab = (tab: string) => {
    if (showAllOrders) {
      return filteredOrders // Show all orders when switch is on
    }

    switch (tab) {
      case "abandoned":
        return filteredOrders.filter((order) => order.status === "ABANDONED")
      case "deleted":
        return filteredOrders.filter((order) => order.status === "DELETED")
      case "archived":
        return filteredOrders.filter((order) => order.status === "ARCHIVED")
      default:
        return filteredOrders.filter((order) => !["ABANDONED", "DELETED", "ARCHIVED"].includes(order.status))
    }
  }

  const handleSelectOrder = (orderId: number) => {
    if (!orderId) return
    setSelectedOrders((prev) => (prev.includes(orderId) ? prev.filter((id) => id !== orderId) : [...prev, orderId]))
  }

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const orderIds = getOrdersByTab(activeTab)
        .map((order) => order.id)
        .filter(Boolean) as number[]
      setSelectedOrders(orderIds)
    } else {
      setSelectedOrders([])
    }
  }

  const handleAddOrder = () => {
    setSidebarMode("add")
    setSelectedOrder(null)
    setSidebarOpen(true)
  }

  const handleEditOrder = (order: OrderData) => {
    setSidebarMode("edit")
    setSelectedOrder(order)
    setSidebarOpen(true)
  }

  const handleViewOrder = (order: OrderData) => {
    setSelectedOrder(order)
    setViewDialogOpen(true)
  }

  const handleDeleteOrder = (order: OrderData) => {
    setOrderToDelete(order)
    setDeleteDialogOpen(true)
  }

  const confirmDeleteOrder = async () => {
    if (!orderToDelete) return

    try {
      // API call to delete order
      const response = await fetch(`/api/orders/${orderToDelete.id}`, {
        method: "DELETE",
      })

      if (response.ok) {
        // Move order to deleted status instead of removing it
        setOrders(
          orders.map((order) =>
            order.id === orderToDelete.id ? { ...order, status: "DELETED" as OrderStatus } : order,
          ),
        )
        toast({
          title: t("success"),
          description: t("orderMovedToDeletedSection"),
        })
      } else {
        throw new Error("Failed to delete order")
      }
    } catch (error) {
      toast({
        title: t("error"),
        description: t("failedToDeleteOrder"),
        variant: "destructive",
      })
    } finally {
      setDeleteDialogOpen(false)
      setOrderToDelete(null)
    }
  }

  const handleBulkAction = async (action: BulkOrderAction) => {
    try {
      const response = await fetch("/api/orders/bulk", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(action),
      })

      if (response.ok) {
        if (action.action === "delete") {
          // Move orders to deleted status instead of removing them
          setOrders(
            orders.map((order) =>
              action.orderIds.includes(order.id!.toString()) ? { ...order, status: "DELETED" as OrderStatus } : order,
            ),
          )
          toast({
            title: t("success"),
            description: `${action.orderIds.length} ${t("ordersMovedToDeletedSection")}`,
          })
        } else if (action.action === "updateStatus" && action.status) {
          setOrders(
            orders.map((order) =>
              action.orderIds.includes(order.id!.toString()) ? { ...order, status: action.status! } : order,
            ),
          )
          toast({
            title: t("success"),
            description: `${action.orderIds.length} ${t("ordersUpdatedSuccessfully")}`,
          })
        } else if (action.action === "export") {
          const blob = await response.blob()
          const url = window.URL.createObjectURL(blob)
          const a = document.createElement("a")
          a.href = url
          a.download = "orders-export.csv"
          document.body.appendChild(a)
          a.click()
          window.URL.revokeObjectURL(url)
          document.body.removeChild(a)
          toast({
            title: t("success"),
            description: t("ordersExportedSuccessfully"),
          })
        }
        setSelectedOrders([])
      } else {
        throw new Error("Bulk action failed")
      }
    } catch (error) {
      toast({
        title: t("error"),
        description: t("failedToPerformBulkAction"),
        variant: "destructive",
      })
    }
  }

  const handleOrderSaved = (savedOrder: OrderData) => {
    if (sidebarMode === "add") {
      setOrders([...orders, { ...savedOrder, id: Date.now() }])
      toast({
        title: t("success"),
        description: t("orderCreatedSuccessfully"),
      })
    } else {
      setOrders(orders.map((order) => (order.id === savedOrder.id ? savedOrder : order)))
      toast({
        title: t("success"),
        description: t("orderUpdatedSuccessfully"),
      })
    }
    setSidebarOpen(false)
  }

  const clearAdvancedFilters = () => {
    setProductFilter("")
    setCityFilter("")
    setDeliveryFilter("")
  }

  const hasAdvancedFilters = productFilter || cityFilter || deliveryFilter

  const abandonedCount = orders.filter((order) => order.status === "ABANDONED").length
  const deletedCount = orders.filter((order) => order.status === "DELETED").length
  const archivedCount = orders.filter((order) => order.status === "ARCHIVED").length

  if (!orders || orders.length === 0) {
    return (
      <div className="space-y-6 bg-white dark:bg-gray-800 min-h-screen">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{t("orders")}</h1>
            <p className="text-gray-600 dark:text-gray-400">{t("manageTrackAllOrders")}</p>
          </div>
          <Button onClick={handleAddOrder} className="bg-purple-600 hover:bg-purple-700 text-white">
            <Plus className="h-4 w-4 mr-2" />
            {t("addOrder")} +
          </Button>
        </div>
        <Card>
          <CardContent className="p-8 text-center">
            <p className="text-gray-500">{t("noOrdersFound")}</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6 bg-white dark:bg-gray-800 min-h-screen">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{t("orders")}</h1>
          <p className="text-gray-600 dark:text-gray-400">{t("manageTrackAllOrders")}</p>
        </div>
        <Button onClick={handleAddOrder} className="bg-purple-600 hover:bg-purple-700 text-white">
          <Plus className="h-4 w-4 mr-2" />
          {t("addOrder")} +
        </Button>
      </div>

      {/* Bulk Actions */}
      {selectedOrders.length > 0 && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <span className="text-sm font-medium">
                {selectedOrders.length} {t("ordersSelected")}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleBulkAction({ orderIds: selectedOrders.map(String), action: "delete" })}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                {t("deleteSelected")}
              </Button>
              <Select
                onValueChange={(status) =>
                  handleBulkAction({
                    orderIds: selectedOrders.map(String),
                    action: "updateStatus",
                    status: status as OrderStatus,
                  })
                }
              >
                <SelectTrigger className="w-48">
                  <SelectValue placeholder={t("updateStatus")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="CONFIRMED">{t("confirmed")}</SelectItem>
                  <SelectItem value="DELIVERED">{t("delivered")}</SelectItem>
                  <SelectItem value="REJECTED">{t("rejected")}</SelectItem>
                  <SelectItem value="ARCHIVED">{t("archived")}</SelectItem>
                </SelectContent>
              </Select>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleBulkAction({ orderIds: selectedOrders.map(String), action: "export" })}
              >
                <Download className="h-4 w-4 mr-2" />
                {t("exportSelected")}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4 bg-gray-100 dark:bg-gray-700">
          <TabsTrigger value="orders" className="data-[state=active]:bg-white dark:data-[state=active]:bg-gray-800">
            {t("orders")}
          </TabsTrigger>
          <TabsTrigger value="abandoned" className="data-[state=active]:bg-white dark:data-[state=active]:bg-gray-800">
            {t("abandoned")} ({abandonedCount})
          </TabsTrigger>
          <TabsTrigger value="deleted" className="data-[state=active]:bg-white dark:data-[state=active]:bg-gray-800">
            {t("deleted")} ({deletedCount})
          </TabsTrigger>
          <TabsTrigger value="archived" className="data-[state=active]:bg-white dark:data-[state=active]:bg-gray-800">
            {t("archived")} ({archivedCount})
          </TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="space-y-4">
          {/* Filters */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-col lg:flex-row gap-4 items-center">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    placeholder={`${t("search")}...`}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>

                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-full lg:w-48">
                    <SelectValue placeholder={t("status")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t("allStatus")}</SelectItem>
                    <SelectItem value="PENDING">{t("pending")}</SelectItem>
                    <SelectItem value="CONFIRMED">{t("confirmed")}</SelectItem>
                    <SelectItem value="ATTEMPT">{t("attempt")}</SelectItem>
                    <SelectItem value="DELIVERED">{t("delivered")}</SelectItem>
                    <SelectItem value="ABANDONED">{t("abandoned")}</SelectItem>
                  </SelectContent>
                </Select>

                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full lg:w-64 justify-start text-left font-normal bg-transparent"
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {dateRange?.from ? (
                        dateRange.to ? (
                          <>
                            {format(dateRange.from, "LLL dd, y")} - {format(dateRange.to, "LLL dd, y")}
                          </>
                        ) : (
                          format(dateRange.from, "LLL dd, y")
                        )
                      ) : (
                        <span>{t("pickDateRange")}</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      initialFocus
                      mode="range"
                      defaultMonth={dateRange?.from}
                      selected={dateRange}
                      onSelect={setDateRange}
                      numberOfMonths={2}
                    />
                  </PopoverContent>
                </Popover>

                <Collapsible open={advancedFilterOpen} onOpenChange={setAdvancedFilterOpen}>
                  <CollapsibleTrigger asChild>
                    <Button variant="outline" className="relative bg-transparent">
                      <Filter className="h-4 w-4 mr-2" />
                      {t("advancedFilter")}
                      <ChevronDown className="h-4 w-4 ml-2" />
                      {hasAdvancedFilters && (
                        <div className="absolute -top-1 -right-1 w-3 h-3 bg-purple-600 rounded-full" />
                      )}
                    </Button>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="absolute z-10 mt-2 right-0">
                    <Card className="w-80 shadow-lg">
                      <CardContent className="p-4 space-y-4">
                        <div className="flex items-center justify-between">
                          <h4 className="font-medium">{t("advancedFilter")}</h4>
                          {hasAdvancedFilters && (
                            <Button variant="ghost" size="sm" onClick={clearAdvancedFilters}>
                              <X className="h-4 w-4 mr-1" />
                              {t("clear")}
                            </Button>
                          )}
                        </div>

                        <div>
                          <Label htmlFor="productFilter">{t("product")}</Label>
                          <Select value={productFilter} onValueChange={setProductFilter}>
                            <SelectTrigger>
                              <SelectValue placeholder={t("allProducts")} />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="all">{t("allProducts")}</SelectItem>
                              {availableProducts.map((product) => (
                                <SelectItem key={product} value={product}>
                                  {product}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div>
                          <Label htmlFor="cityFilter">{t("city")}</Label>
                          <Select value={cityFilter} onValueChange={setCityFilter}>
                            <SelectTrigger>
                              <SelectValue placeholder={t("allCities")} />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="all">{t("allCities")}</SelectItem>
                              {tunisianCities.map((city) => (
                                <SelectItem key={city} value={city}>
                                  {city}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div>
                          <Label htmlFor="deliveryFilter">{t("deliveryAgency")}</Label>
                          <Select value={deliveryFilter} onValueChange={setDeliveryFilter}>
                            <SelectTrigger>
                              <SelectValue placeholder={t("allAgencies")} />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="all">{t("allAgencies")}</SelectItem>
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
                  </CollapsibleContent>
                </Collapsible>

                <div className="flex items-center space-x-2">
                  <Switch id="all-orders" checked={showAllOrders} onCheckedChange={setShowAllOrders} />
                  <label htmlFor="all-orders" className="text-sm font-medium">
                    {t("allOrders")}
                  </label>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Orders Table */}
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-b">
                      <TableHead className="w-12">
                        <Checkbox
                          checked={
                            selectedOrders.length === getOrdersByTab(activeTab).length &&
                            getOrdersByTab(activeTab).length > 0
                          }
                          onCheckedChange={handleSelectAll}
                        />
                      </TableHead>
                      <TableHead>{t("id")}</TableHead>
                      <TableHead>{t("products")}</TableHead>
                      <TableHead>{t("customer")}</TableHead>
                      <TableHead>{t("city")}</TableHead>
                      <TableHead>{t("date")}</TableHead>
                      <TableHead>{t("delivery")}</TableHead>
                      <TableHead>{t("status")}</TableHead>
                      <TableHead>{t("total")}</TableHead>
                      <TableHead>{t("actions")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {getOrdersByTab(activeTab).map((order) => (
                      <TableRow key={order.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                        <TableCell>
                          <Checkbox
                            checked={selectedOrders.includes(order.id!)}
                            onCheckedChange={() => handleSelectOrder(order.id!)}
                          />
                        </TableCell>
                        <TableCell className="font-medium">{order.id}</TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            <div className="w-10 h-10 bg-purple-600 rounded flex items-center justify-center">
                              <Package className="h-5 w-5 text-white" />
                            </div>
                            <div>
                              <div className="text-sm font-medium">{order.products?.[0]?.name || "N/A"}</div>
                              <div className="text-xs text-gray-500">×{order.products?.[0]?.quantity || 0}</div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>{order.customer?.name || "N/A"}</TableCell>
                        <TableCell className="text-sm text-gray-600 dark:text-gray-400">
                          {order.customer?.city || "N/A"}
                        </TableCell>
                        <TableCell className="text-sm text-gray-600 dark:text-gray-400">
                          {order.date || "N/A"}
                        </TableCell>
                        <TableCell>{order.delivery || "-"}</TableCell>
                        <TableCell>
                          <Badge className={getStatusBadgeColor(order.status, order.attemptNumber)}>
                            {getStatusDisplayText(order.status, order.attemptNumber)}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-medium">{order.total}</TableCell>
                        <TableCell>
                          <div className="flex space-x-2">
                            <Button variant="ghost" size="sm" onClick={() => handleViewOrder(order)}>
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => handleEditOrder(order)}>
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-red-600 hover:text-red-700"
                              onClick={() => handleDeleteOrder(order)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Order Sidebar */}
      <OrderSidebar
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        mode={sidebarMode}
        order={selectedOrder}
        onSave={handleOrderSaved}
      />

      {/* View Order Dialog */}
      <OrderViewDialog open={viewDialogOpen} onClose={() => setViewDialogOpen(false)} order={selectedOrder} />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("areYouSure")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("moveOrderToDeletedSection")} #{orderToDelete?.id}.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteOrder} className="bg-red-600 hover:bg-red-700">
              {t("delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
