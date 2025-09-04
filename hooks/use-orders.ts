// hooks/use-orders.ts
"use client"

import { useState, useCallback, useEffect, useRef, useMemo } from "react"
import { useToast } from "@/hooks/use-toast"
import { useLanguage } from "@/contexts/language-context"
import type { OrderStatus } from "@/lib/types"

// Types
export interface MinimalOrderData {
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
  // Computed fields from API
  totalItems: number
  firstProduct: any
  hasMultipleProducts: boolean
}

interface FullOrderData extends MinimalOrderData {
  statusHistory: {
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
  shipments: {
    id: string
    trackingNumber: string
    status: string
    agency: {
      id: string
      name: string
    }
    createdAt: string
  }[]
  subtotal: number
}

type TimeRange = "2weeks" | "1month" | "all"

interface OrdersFilters {
  search?: string
  phoneSearch?: string
  status?: string
  date?: string
  timeRange?: TimeRange
  page?: number
  limit?: number
}

interface OrdersPagination {
  page: number
  limit: number
  total: number
  pages: number
}

interface BulkOrderAction {
  orderIds: string[]
  action: "delete" | "updateStatus" | "export"
  status?: OrderStatus
}

// Cache structure
interface OrdersCache {
  orders: MinimalOrderData[]
  pagination: OrdersPagination
  filters: OrdersFilters
  timestamp: number
  fullOrders: { [key: string]: { data: FullOrderData; timestamp: number } }
}

// Cache TTL constants (in milliseconds)
const CACHE_TTL = {
  RECENT_ORDERS: 5 * 60 * 1000, // 5 minutes
  SEARCH_RESULTS: 2 * 60 * 1000, // 2 minutes  
  FULL_ORDER: 10 * 60 * 1000, // 10 minutes
  BACKGROUND_REFRESH: 30 * 1000 // 30 seconds for background refresh
}

export function useOrders() {
  const { toast } = useToast()
  const { t } = useLanguage()
  
  // State
  const [orders, setOrders] = useState<MinimalOrderData[]>([])
  const [loading, setLoading] = useState(true)
  const [backgroundLoading, setBackgroundLoading] = useState(false)
  const [pagination, setPagination] = useState<OrdersPagination>({
    page: 1,
    limit: 20,
    total: 0,
    pages: 0
  })
  const [filters, setFilters] = useState<OrdersFilters>({
    page: 1,
    limit: 20,
    timeRange: "2weeks" // Default to last 2 weeks
  })

  // Cache
  const cacheRef = useRef<{ [key: string]: OrdersCache }>({})
  const searchTimeoutRef = useRef<NodeJS.Timeout>()
  const initialLoadRef = useRef(false)

  // Generate cache key
  const getCacheKey = useCallback((filters: OrdersFilters) => {
    const { search, phoneSearch, status, timeRange, page, limit } = filters
    return `${timeRange || '2weeks'}_${status || 'all'}_${search || ''}_${phoneSearch || ''}_${page || 1}_${limit || 20}`
  }, [])

  // Check if cache is valid
  const isCacheValid = useCallback((cacheEntry: OrdersCache | undefined, ttl: number = CACHE_TTL.RECENT_ORDERS) => {
    if (!cacheEntry) return false
    return (Date.now() - cacheEntry.timestamp) < ttl
  }, [])

  // Get cached data
  const getCachedData = useCallback((filters: OrdersFilters) => {
    const cacheKey = getCacheKey(filters)
    const cached = cacheRef.current[cacheKey]
    
    if (isCacheValid(cached)) {
      return cached
    }
    return null
  }, [getCacheKey, isCacheValid])

  // Set cached data
  const setCachedData = useCallback((filters: OrdersFilters, data: Omit<OrdersCache, 'timestamp' | 'fullOrders'>) => {
    const cacheKey = getCacheKey(filters)
    const existing = cacheRef.current[cacheKey]
    
    cacheRef.current[cacheKey] = {
      ...data,
      timestamp: Date.now(),
      fullOrders: existing?.fullOrders || {}
    }
  }, [getCacheKey])

  // Fetch orders from API
  const fetchOrders = useCallback(async (
    customFilters?: OrdersFilters, 
    options: { background?: boolean; skipCache?: boolean } = {}
  ) => {
    const currentFilters = customFilters || filters
    const { background = false, skipCache = false } = options

    // Check cache first (unless skipCache is true)
    if (!skipCache) {
      const cached = getCachedData(currentFilters)
      if (cached) {
        console.log("📦 Using cached orders data")
        setOrders(cached.orders)
        setPagination(cached.pagination)
        
        // If not background, we're done
        if (!background) {
          setLoading(false)
          return { success: true, fromCache: true }
        }
      }
    }

    // Set appropriate loading state
    if (background) {
      setBackgroundLoading(true)
    } else if (!getCachedData(currentFilters)) {
      setLoading(true)
    }
    
    try {
      const searchParams = new URLSearchParams()
      
      // Build query parameters
      if (currentFilters.timeRange) {
        searchParams.append('timeRange', currentFilters.timeRange)
      }
      
      if (currentFilters.search?.trim()) {
        searchParams.append('search', currentFilters.search.trim())
      }
      
      if (currentFilters.phoneSearch?.trim()) {
        if (currentFilters.search?.trim()) {
          searchParams.set('search', `${currentFilters.search.trim()} ${currentFilters.phoneSearch.trim()}`)
        } else {
          searchParams.append('search', currentFilters.phoneSearch.trim())
        }
      }
      
      if (currentFilters.status && currentFilters.status !== 'all') {
        searchParams.append('status', currentFilters.status)
      }
      
      searchParams.append('page', (currentFilters.page || 1).toString())
      searchParams.append('limit', (currentFilters.limit || 20).toString())

      const response = await fetch(`/api/orders/recent?${searchParams}`)
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch orders')
      }

      const newOrders = data.orders || []
      const newPagination = data.pagination || {
        page: 1,
        limit: 20,
        total: 0,
        pages: 0
      }

      // Update state
      setOrders(newOrders)
      setPagination(newPagination)
      
      // Cache the results
      setCachedData(currentFilters, {
        orders: newOrders,
        pagination: newPagination,
        filters: currentFilters
      })
      
      console.log(`✅ Fetched ${newOrders.length} orders (${background ? 'background' : 'foreground'})`)
      
      return { success: true, fromCache: false }
      
    } catch (error) {
      console.error('Failed to fetch orders:', error)
      
      // Only show toast if not background refresh
      if (!background) {
        toast({
          title: t("error"),
          description: t("failedToLoadOrders"),
          variant: "destructive",
        })
      }
      
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
    } finally {
      setLoading(false)
      setBackgroundLoading(false)
    }
  }, [filters, getCachedData, setCachedData, toast, t])

  // Fetch full order details - Using existing endpoint
  const fetchFullOrder = useCallback(async (orderId: string): Promise<FullOrderData | null> => {
    const cacheKey = getCacheKey(filters)
    const cache = cacheRef.current[cacheKey]
    
    // Check if we have cached full order data
    if (cache?.fullOrders[orderId] && isCacheValid(cache.fullOrders[orderId], CACHE_TTL.FULL_ORDER)) {
      console.log(`📦 Using cached full order data for ${orderId}`)
      return cache.fullOrders[orderId].data
    }

    try {
      const response = await fetch(`/api/orders/${orderId}`)
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch order details')
      }

      const fullOrder = data.order

      // Cache the full order data
      if (cache) {
        cache.fullOrders[orderId] = {
          data: fullOrder,
          timestamp: Date.now()
        }
      }

      console.log(`✅ Fetched full order details for ${orderId}`)
      return fullOrder

    } catch (error) {
      console.error('Failed to fetch full order details:', error)
      toast({
        title: t("error"),
        description: t("failedToLoadOrderDetails"),
        variant: "destructive",
      })
      return null
    }
  }, [filters, getCacheKey, isCacheValid, toast, t])

  // Debounced search
  const debouncedSearch = useCallback((searchFilters: Partial<OrdersFilters>) => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current)
    }

    searchTimeoutRef.current = setTimeout(() => {
      const updatedFilters = { ...filters, ...searchFilters, page: 1 }
      setFilters(updatedFilters)
      fetchOrders(updatedFilters)
    }, 300) // 300ms debounce
  }, [filters, fetchOrders])

  // Update filters with smart caching
  const updateFilters = useCallback((newFilters: Partial<OrdersFilters>) => {
    // Handle search with debouncing
    if (newFilters.search !== undefined || newFilters.phoneSearch !== undefined) {
      debouncedSearch(newFilters)
      return
    }

    // For other filters, update immediately
    const updatedFilters = { ...filters, ...newFilters }
    
    // Reset to page 1 when filters change (except for page changes)
    if (!newFilters.page) {
      updatedFilters.page = 1
    }
    
    setFilters(updatedFilters)
    
    // Check cache first, then fetch if needed
    const cached = getCachedData(updatedFilters)
    if (cached) {
      setOrders(cached.orders)
      setPagination(cached.pagination)
    } else {
      fetchOrders(updatedFilters)
    }
  }, [filters, debouncedSearch, getCachedData, fetchOrders])

  // Background refresh for current data
  const backgroundRefresh = useCallback(() => {
    if (!backgroundLoading && orders.length > 0) {
      fetchOrders(filters, { background: true })
    }
  }, [filters, backgroundLoading, orders.length, fetchOrders])

  // Bulk actions
  const performBulkAction = useCallback(async (action: BulkOrderAction) => {
    try {
      const response = await fetch('/api/orders/bulk', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(action),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Bulk action failed')
      }

      // Handle different action types
      if (action.action === 'export') {
        // Handle file download
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `orders-export-${new Date().toISOString().split('T')[0]}.csv`
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)
        
        toast({
          title: t("success"),
          description: t("ordersExportedSuccessfully"),
        })
      } else {
        // Clear cache and refresh orders after other actions
        cacheRef.current = {}
        await fetchOrders(filters, { skipCache: true })
        
        const actionMessages = {
          delete: t("ordersDeletedSuccessfully"),
          updateStatus: t("ordersStatusUpdatedSuccessfully")
        }
        
        toast({
          title: t("success"),
          description: `${action.orderIds.length} ${actionMessages[action.action]}`,
        })
      }

      return { success: true }
    } catch (error) {
      console.error('Bulk action failed:', error)
      toast({
        title: t("error"),
        description: error instanceof Error ? error.message : t("failedToPerformBulkAction"),
        variant: "destructive",
      })
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
    }
  }, [filters, fetchOrders, toast, t])

  // Delete single order
  const deleteOrder = useCallback(async (orderId: string) => {
    return performBulkAction({
      orderIds: [orderId],
      action: "delete"
    })
  }, [performBulkAction])

  // Helper functions
  const getOrdersByStatus = useCallback((status?: OrderStatus) => {
    if (!status) {
      return orders.filter(order => !["ABANDONED", "DELETED", "ARCHIVED"].includes(order.status))
    }
    return orders.filter(order => order.status === status)
  }, [orders])

  const getStatusCounts = useMemo(() => {
    const counts = {
      total: orders.length,
      pending: 0,
      confirmed: 0,
      rejected: 0,
      abandoned: 0,
      deleted: 0,
      archived: 0
    }

    orders.forEach(order => {
      switch (order.status) {
        case 'PENDING':
          counts.pending++
          break
        case 'CONFIRMED':
          counts.confirmed++
          break
        case 'REJECTED':
          counts.rejected++
          break
        case 'ABANDONED':
          counts.abandoned++
          break
        case 'DELETED':
          counts.deleted++
          break
        case 'ARCHIVED':
          counts.archived++
          break
      }
    })

    return counts
  }, [orders])

  // Pagination helpers
  const goToPage = useCallback((page: number) => {
    updateFilters({ page })
  }, [updateFilters])

  // Initial load and background refresh setup
  useEffect(() => {
    if (!initialLoadRef.current) {
      initialLoadRef.current = true
      fetchOrders()
    }
  }, [fetchOrders])

  // Set up background refresh interval
  useEffect(() => {
    const interval = setInterval(backgroundRefresh, CACHE_TTL.BACKGROUND_REFRESH)
    return () => clearInterval(interval)
  }, [backgroundRefresh])

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current)
      }
    }
  }, [])

  return {
    // Data
    orders,
    loading,
    backgroundLoading,
    pagination,
    filters,

    // Actions
    fetchOrders,
    fetchFullOrder,
    updateFilters,
    performBulkAction,
    deleteOrder,

    // Helpers
    getOrdersByStatus,
    getStatusCounts,
    goToPage,

    // Cache utilities
    clearCache: () => { cacheRef.current = {} },
    refreshData: () => fetchOrders(filters, { skipCache: true })
  }
}
      