"use client"

import { useState, useEffect, useMemo, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Switch } from "@/components/ui/switch"
import { Calendar } from "@/components/ui/calendar"
import { DateRange } from "react-day-picker"
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
import { Search, Plus, Eye, Edit, Trash2, Filter, CalendarIcon, Package, Download, ChevronDown, X, Phone, Loader2 } from "lucide-react"
import { format } from "date-fns"
import type { OrderStatus, Product } from "@/lib/types"
import { useToast } from "@/hooks/use-toast"
import { OrderSidebar } from "@/components/order-sidebar"
import { OrderViewDialog } from "@/components/order-view-dialog"
import { Label } from "@/components/ui/label"
import { useLanguage } from "@/contexts/language-context"
import { useOrders } from "@/hooks/use-orders"
import { PhoneFilter } from "@/components/phone-filter"
import { Skeleton } from "@/components/ui/skeleton"
import { DeliveryStatusEnum } from "@/lib/delivery/types"
import { ProductHover } from "@/components/product-hover";

// API Types
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
  totalItems: number
  firstProduct: any
  hasMultipleProducts: boolean
}

interface DeliveryAgency {
  id: string
  name: string
  enabled: boolean
  configured: boolean
}

interface BulkOrderAction {
  orderIds: string[]
  action: "delete" | "updateStatus" | "export"
  status?: OrderStatus
}

const tunisianCities = [
  "Tunis", "Sfax", "Sousse", "Kairouan", "Bizerte", "Gabès", "Ariana",
  "Gafsa", "Monastir", "Ben Arous", "Kasserine", "Medenine", "Nabeul", "Tataouine"
]

export default function OrdersPage() {
  const { t } = useMemo(() => useLanguage(), [])
  const { toast } = useToast()

  // Use the orders hook
  const {
    orders,
    loading,
    backgroundLoading,
    pagination,
    filters,
    updateFilters,
    updateDateRange,
    performBulkAction,
    deleteOrder,
    clearFilters,
    clearAdvancedFilters,
    getOrdersByStatus,
    getStatusCounts,
    goToPage,
    refreshData
  } = useOrders()

  // Additional state for products and delivery agencies
  const [products, setProducts] = useState<Product[]>([])
  const [deliveryAgencies, setDeliveryAgencies] = useState<DeliveryAgency[]>([])
  const [recentPhoneNumbers, setRecentPhoneNumbers] = useState<string[]>([])
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined)
  const [showAllOrders, setShowAllOrders] = useState(false)
  const [advancedFilterOpen, setAdvancedFilterOpen] = useState(false)
  const [selectedOrders, setSelectedOrders] = useState<string[]>([])
  const [activeTab, setActiveTab] = useState("orders")
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [sidebarMode, setSidebarMode] = useState<"add" | "edit">("add")
  const [selectedOrder, setSelectedOrder] = useState<OrderData | null>(null)
  const [viewDialogOpen, setViewDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [orderToDelete, setOrderToDelete] = useState<OrderData | null>(null)

    // Get counts for tabs from the hook
  const statusCounts = getStatusCounts

  // Track last applied date range to prevent unnecessary updates
  const lastAppliedDateRange = useRef<{ startDate: string | null; endDate: string | null }>({ startDate: null, endDate: null })

  // Fetch initial data for products and agencies
  useEffect(() => {
    Promise.all([
      fetchProducts(),
      fetchDeliveryAgencies(),
    ])
  }, [])

  // Update recent phone numbers when orders change
  useEffect(() => {
    if (orders.length > 0) {
      const phoneNumbers = orders
        .flatMap(order => [order.customerPhone1, order.customerPhone2])
        .filter((phone): phone is string => Boolean(phone))
        .filter((phone, index, arr) => arr.indexOf(phone) === index)
        .slice(0, 10)

      setRecentPhoneNumbers(prev => {
        // Only update if the phone numbers have changed to avoid unnecessary re-renders
        if (JSON.stringify(prev) !== JSON.stringify(phoneNumbers)) {
          return phoneNumbers
        }
        return prev
      })
    }
  }, [orders])

  // Handle date range changes
  useEffect(() => {
    if (dateRange?.from) {
      const startDate = format(dateRange.from, 'yyyy-MM-dd')
      const endDate = dateRange.to ? format(dateRange.to, 'yyyy-MM-dd') : startDate

      // Only call updateDateRange if the dates have changed
      if (
        startDate !== lastAppliedDateRange.current.startDate ||
        endDate !== lastAppliedDateRange.current.endDate
      ) {
        lastAppliedDateRange.current = { startDate, endDate }
        updateDateRange(startDate, endDate)
      }
    }
  }, [dateRange, updateDateRange])

  const fetchProducts = async () => {
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

  const fetchDeliveryAgencies = async () => {
    try {
      const response = await fetch('/api/delivery/agencies')
      const data = await response.json()

      if (response.ok) {
        setDeliveryAgencies(data.agencies || [])
      }
    } catch (error) {
      console.error('Failed to fetch delivery agencies:', error)
    }
  }

  const getStatusBadgeColor = (status: OrderStatus | DeliveryStatusEnum, attemptCount?: number) => {
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
      case "DEPOSIT":
        return "bg-cyan-50 text-cyan-700 border-cyan-200 dark:bg-cyan-900/20 dark:text-cyan-300 dark:border-cyan-800"
      case "IN_TRANSIT":
        return "bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-900/20 dark:text-orange-300 dark:border-orange-800"
      case "DELIVERED":
        return "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-300 dark:border-emerald-800"
      case "RETURNED":
        return "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-900/20 dark:text-rose-300 dark:border-rose-800"
      default:
        if (status.startsWith('ATTEMPT_')) {
          return "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-300 dark:border-amber-800"
        }
        return "bg-gray-50 text-gray-700 border-gray-200 dark:bg-gray-900/20 dark:text-gray-300 dark:border-gray-800"
    }
  }

  const getStatusDisplayText = (status: OrderStatus | DeliveryStatusEnum, attemptCount?: number) => {
    let statusText = ""
    switch (status) {
      case "PENDING":
        statusText = t("pending")
        break
      case "ATTEMPTED":
        statusText = t("attempted") + (attemptCount ? ` (${attemptCount})` : '')
        break
      case "CONFIRMED":
        statusText = t("confirmed")
        break
      case "REJECTED":
        statusText = t("rejected")
        break
      case "ABANDONED":
        statusText = t("abandoned")
        break
      case "DELETED":
        statusText = t("deleted")
        break
      case "ARCHIVED":
        statusText = t("archived")
        break
      case "UPLOADED":
        statusText = t("uploaded")
        break
      case "DEPOSIT":
        statusText = t("deposit")
        break
      case "IN_TRANSIT":
        statusText = t("inTransit")
        break
      case "DELIVERED":
        statusText = t("delivered")
        break
      case "RETURNED":
        statusText = t("returned")
        break
      default:
        statusText = status
    }
    return statusText
  }

  const getOrdersByTab = (tab: string) => {
    if (showAllOrders) {
      return orders
    }
    switch (tab) {
      case "abandoned":
        return getOrdersByStatus("ABANDONED")
      case "deleted":
        return getOrdersByStatus("DELETED")
      case "archived":
        return getOrdersByStatus("ARCHIVED")
      default:
        return getOrdersByStatus()
    }
  }

  const handleSelectOrder = (orderId: string) => {
    setSelectedOrders(prev =>
      prev.includes(orderId)
        ? prev.filter(id => id !== orderId)
        : [...prev, orderId]
    )
  }

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const orderIds = getOrdersByTab(activeTab).map(order => order.id)
      setSelectedOrders(orderIds)
    } else {
      setSelectedOrders([])
    }
  }

  const handleBulkAction = async (action: BulkOrderAction) => {
    const result = await performBulkAction(action)
    if (result.success) {
      setSelectedOrders([])
    }
  }

  const handleDeleteOrder = async (order: OrderData) => {
    setOrderToDelete(order)
    setDeleteDialogOpen(true)
  }

  const confirmDeleteOrder = async () => {
    if (!orderToDelete) return
    const result = await deleteOrder(orderToDelete.id)

    if (result.success) {
      toast({
        title: t("success"),
        description: t("orderDeletedSuccessfully"),
      })
    }

    setDeleteDialogOpen(false)
    setOrderToDelete(null)
  }

  const handleViewOrder = (order: OrderData) => {
    setSelectedOrder(order)
    setViewDialogOpen(true)
  }

  const handleEditOrder = (order: OrderData) => {
    setSidebarMode("edit")
    setSelectedOrder(order)
    setSidebarOpen(true)
  }

  const handleAddOrder = () => {
    setSidebarMode("add")
    setSelectedOrder(null)
    setSidebarOpen(true)
  }

  const handleOrderSaved = async () => {
    setSidebarOpen(false)
    await refreshData()
    toast({
      title: t("success"),
      description: sidebarMode === "add" ? t("orderCreatedSuccessfully") : t("orderUpdatedSuccessfully"),
    })
  }

  const clearAllFilters = () => {
    clearFilters()
    setDateRange(undefined)
    lastAppliedDateRange.current = { startDate: null, endDate: null }
  }

  const hasAdvancedFilters = filters.product || filters.city || filters.deliveryAgency

  const TableSkeleton = () => (
    <>
      {Array.from({ length: 10 }).map((_, index) => (
        <TableRow key={index}>
          <TableCell><Skeleton className="h-4 w-4" /></TableCell>
          <TableCell><Skeleton className="h-4 w-16" /></TableCell>
          <TableCell><Skeleton className="h-12 w-32" /></TableCell>
          <TableCell><Skeleton className="h-4 w-24" /></TableCell>
          <TableCell><Skeleton className="h-4 w-16" /></TableCell>
          <TableCell><Skeleton className="h-4 w-16" /></TableCell>
          <TableCell><Skeleton className="h-4 w-16" /></TableCell>
          <TableCell><Skeleton className="h-4 w-20" /></TableCell>
          <TableCell><Skeleton className="h-4 w-16" /></TableCell>
          <TableCell><Skeleton className="h-4 w-16" /></TableCell>
          <TableCell><Skeleton className="h-8 w-24" /></TableCell>
        </TableRow>
      ))}
    </>
  )

  return (
    <div className="space-y-6 p-6 bg-white dark:bg-gray-900 min-h-screen max-w-full overflow-hidden">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{t("orders")}</h1>
          <p className="text-gray-600 dark:text-gray-400">{t("manageTrackAllOrders")}</p>
        </div>
        <Button onClick={handleAddOrder} className="bg-purple-600 hover:bg-purple-700 text-white">
          <Plus className="h-4 w-4 mr-2" />
          {t("addOrder")}
        </Button>
      </div>

      {backgroundLoading && (
        <div className="fixed top-4 right-4 z-50">
          <div className="flex items-center bg-white dark:bg-gray-800 shadow-md rounded-md px-3 py-2 text-sm">
            <Loader2 className="h-4 w-4 animate-spin text-purple-600 mr-2" />
            {t("updatingOrders")}
          </div>
        </div>
      )}

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
                onClick={() => handleBulkAction({ orderIds: selectedOrders, action: "delete" })}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                {t("deleteSelected")}
              </Button>
              <Select
                onValueChange={(status) =>
                  handleBulkAction({
                    orderIds: selectedOrders,
                    action: "updateStatus",
                    status: status as OrderStatus,
                  })
                }
              >
                <SelectTrigger className="w-48">
                  <SelectValue placeholder={t("updateStatus")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PENDING">{t("pending")}</SelectItem>
                  <SelectItem value="CONFIRMED">{t("confirmed")}</SelectItem>
                  <SelectItem value="REJECTED">{t("rejected")}</SelectItem>
                  <SelectItem value="ARCHIVED">{t("archived")}</SelectItem>
                </SelectContent>
              </Select>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleBulkAction({ orderIds: selectedOrders, action: "export" })}
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
            {t("abandoned")} ({statusCounts.abandoned})
          </TabsTrigger>
          <TabsTrigger value="deleted" className="data-[state=active]:bg-white dark:data-[state=active]:bg-gray-800">
            {t("deleted")} ({statusCounts.deleted})
          </TabsTrigger>
          <TabsTrigger value="archived" className="data-[state=active]:bg-white dark:data-[state=active]:bg-gray-800">
            {t("archived")} ({statusCounts.archived})
          </TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="space-y-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-col lg:flex-row gap-4 items-center mb-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    placeholder={`${t("searchByNameOrId")}...`}
                    value={filters.search || ""}
                    onChange={(e) => updateFilters({ search: e.target.value })}
                    className="pl-10"
                  />
                </div>
                <div className="relative flex-1">
                  <PhoneFilter
                    value={filters.phoneSearch || ""}
                    onChange={(value) => updateFilters({ phoneSearch: value })}
                    suggestions={recentPhoneNumbers}
                    placeholder={t("searchByPhone")}
                  />
                </div>
                <Select
                  value={filters.status || "all"}
                  onValueChange={(status) => updateFilters({ status })}
                >
                  <SelectTrigger className="w-full lg:w-48">
                    <SelectValue placeholder={t("status")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t("allStatus")}</SelectItem>
                    <SelectItem value="PENDING">{t("pending")}</SelectItem>
                    <SelectItem value="CONFIRMED">{t("confirmed")}</SelectItem>
                    <SelectItem value="REJECTED">{t("rejected")}</SelectItem>
                    <SelectItem value="ABANDONED">{t("abandoned")}</SelectItem>
                    <SelectItem value="ARCHIVED">{t("archived")}</SelectItem>
                  </SelectContent>
                </Select>
                <div className="flex items-center space-x-2">
                  <Switch id="all-orders" checked={showAllOrders} onCheckedChange={setShowAllOrders} />
                  <label htmlFor="all-orders" className="text-sm font-medium">
                    {t("allOrders")}
                  </label>
                </div>
              </div>
              <div className="flex flex-col lg:flex-row gap-4 items-center">
                <Select
                  value={filters.timeRange || "2weeks"}
                  onValueChange={(timeRange) => updateFilters({ timeRange: timeRange as any })}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder={t("timeRange")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="2weeks">{t("last2Weeks")}</SelectItem>
                    <SelectItem value="1month">{t("lastMonth")}</SelectItem>
                    <SelectItem value="all">{t("allOrders")}</SelectItem>
                  </SelectContent>
                </Select>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full justify-start text-left font-normal bg-transparent"
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
                <div className="relative">
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
                            <Select
                              value={filters.product || "__all__"}
                              onValueChange={(value) => updateFilters({ product: value === "__all__" ? undefined : value })}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder={t("allProducts")} />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="__all__">{t("allProducts")}</SelectItem>
                                {products.map((product) => (
                                  <SelectItem key={product.id} value={product.name}>
                                    <div className="flex items-center justify-center">
                                      <div className="w-6 h-6 bg-purple-600 rounded flex items-center justify-center mr-1">
                                        {product.imageUrl ? (
                                          <img
                                            src={product.imageUrl}
                                            alt={product.name}
                                            className="w-6 h-6 rounded object-cover"
                                          />
                                        ) : (
                                          <Package className="h-3 w-3 text-white" />
                                        )}
                                      </div>
                                      {product.name}
                                    </div>
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Label htmlFor="cityFilter">{t("city")}</Label>
                            <Select
                              value={filters.city || "__all__"}
                              onValueChange={(value) => updateFilters({ city: value === "__all__" ? undefined : value })}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder={t("allCities")} />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="__all__">{t("allCities")}</SelectItem>
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
                            <Select
                              value={filters.deliveryAgency || "__all__"}
                              onValueChange={(value) => updateFilters({ deliveryAgency: value === "__all__" ? undefined : value })}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder={t("allAgencies")} />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="__all__">{t("allAgencies")}</SelectItem>
                                {deliveryAgencies.filter(a => a.enabled && a.configured).map((agency) => (
                                  <SelectItem key={agency.id} value={agency.name}>
                                    {agency.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </CardContent>
                      </Card>
                    </CollapsibleContent>
                  </Collapsible>
                </div>
                <Button onClick={clearAllFilters}>
                  <X className="h-4 w-4 mr-2" />
                  {t("clearFilters")}
                </Button>
              </div>
            </CardContent>
          </Card>

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
                      <TableHead className="w-20">{t("id")}</TableHead>
                      <TableHead className="w-48">{t("products")}</TableHead>
                      <TableHead className="w-32">{t("customer")}</TableHead>
                      <TableHead className="w-28">{t("phone")}</TableHead>
                      <TableHead className="w-24">{t("city")}</TableHead>
                      <TableHead className="w-24">{t("date")}</TableHead>
                      <TableHead className="w-28">{t("delivery")}</TableHead>
                      <TableHead className="w-24">{t("status")}</TableHead>
                      <TableHead className="w-20">{t("total")}</TableHead>
                      <TableHead className="w-32">{t("actions")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      <TableSkeleton />
                    ) : (
                      getOrdersByTab(activeTab).map((order) => (
                        <TableRow key={order.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                          <TableCell>
                            <Checkbox
                              checked={selectedOrders.includes(order.id)}
                              onCheckedChange={() => handleSelectOrder(order.id)}
                            />
                          </TableCell>
                          <TableCell className="font-medium">#{order.id.slice(-8)}</TableCell>
                          <TableCell>
                            <ProductHover items={order.items} />
                          </TableCell>
                          <TableCell className="max-w-32 truncate">{order.customerName}</TableCell>
                          <TableCell className="max-w-28">
                            <div className="text-sm">
                              <div className="truncate">{order.customerPhone1}</div>
                              {order.customerPhone2 && (
                                <div className="text-xs text-gray-500 truncate">{order.customerPhone2}</div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-sm text-gray-600 dark:text-gray-400 max-w-24 truncate">
                            {order.customerCity}
                          </TableCell>
                          <TableCell className="text-sm text-gray-600 dark:text-gray-400 max-w-24">
                            {format(new Date(order.createdAt), 'MMM dd')}
                          </TableCell>
                          <TableCell className="max-w-28 truncate">
                            {order.deliveryCompany || "-"}
                          </TableCell>
                          <TableCell>
                            <Badge className={`border ${getStatusBadgeColor(order.status, order.attemptCount)} text-center text-xs whitespace-nowrap`}>
                              {getStatusDisplayText(order.status, order.attemptCount)}
                            </Badge>
                          </TableCell>
                          <TableCell className="font-medium text-sm">
                            {order.total.toFixed(2)} TND
                          </TableCell>
                          <TableCell>
                            <div className="flex space-x-1">
                              <Button variant="ghost" size="sm" onClick={() => handleViewOrder(order)} className="h-8 w-8 p-0">
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="sm" onClick={() => handleEditOrder(order)} className="h-8 w-8 p-0">
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-red-600 hover:text-red-700 h-8 w-8 p-0"
                                onClick={() => handleDeleteOrder(order)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
                {!loading && getOrdersByTab(activeTab).length === 0 && (
                  <div className="text-center py-8">
                    <p className="text-gray-500 dark:text-gray-400">
                      {activeTab === "orders" ? t("noOrdersFound") : `${t("no")} ${t(activeTab)} ${t("ordersFound")}`}
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {pagination.pages > 1 && (
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div className="text-sm text-gray-700 dark:text-gray-300">
                    {t("showing")} {((pagination.page - 1) * pagination.limit) + 1} - {Math.min(pagination.page * pagination.limit, pagination.total)} {t("of")} {pagination.total} {t("orders")}
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => goToPage(pagination.page - 1)}
                      disabled={pagination.page <= 1}
                    >
                      {t("previous")}
                    </Button>
                    <span className="text-sm">
                      {t("page")} {pagination.page} {t("of")} {pagination.pages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => goToPage(pagination.page + 1)}
                      disabled={pagination.page >= pagination.pages}
                    >
                      {t("next")}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      <OrderSidebar
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        mode={sidebarMode}
        order={selectedOrder}
        onSave={handleOrderSaved}
      />

      <OrderViewDialog
        open={viewDialogOpen}
        onClose={() => setViewDialogOpen(false)}
        orderId={selectedOrder?.id || null}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("areYouSure")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("thisActionCannotBeUndone")} {t("orderWillBeDeleted")} #{orderToDelete?.id.slice(-8)}.
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