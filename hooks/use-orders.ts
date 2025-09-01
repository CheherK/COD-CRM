// hooks/use-orders.ts
"use client"

import { useState, useCallback, useEffect, useRef } from "react"
import { useToast } from "@/hooks/use-toast"
import { useLanguage } from "@/contexts/language-context"
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
}

interface OrdersFilters {
  search?: string
  phoneSearch?: string
  status?: string
  date?: string
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

export function useOrders() {
  const { toast } = useToast()
  const { t } = useLanguage()
  const initialLoadRef = useRef(false)

  // State
  const [orders, setOrders] = useState<OrderData[]>([])
  const [loading, setLoading] = useState(true)
  const [pagination, setPagination] = useState<OrdersPagination>({
    page: 1,
    limit: 20,
    total: 0,
    pages: 0
  })
  const [filters, setFilters] = useState<OrdersFilters>({
    page: 1,
    limit: 20
  })

  // Fetch orders from API - removed filters dependency
  const fetchOrders = useCallback(async (customFilters?: OrdersFilters) => {
      setLoading(true)
      
      try {
        const searchParams = new URLSearchParams()
        const currentFilters = customFilters || filters
        
        // Build query parameters
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
        
        if (currentFilters.date) {
          searchParams.append('date', currentFilters.date)
        }
        
        searchParams.append('page', (currentFilters.page || 1).toString())
        searchParams.append('limit', (currentFilters.limit || 20).toString())

        const response = await fetch(`/api/orders?${searchParams}`)
        const data = await response.json()

        if (!response.ok) {
          throw new Error(data.error || 'Failed to fetch orders')
        }

        setOrders(data.orders || [])
        setPagination(data.pagination || {
          page: 1,
          limit: 20,
          total: 0,
          pages: 0
        })
        
      } catch (error) {
        console.error('Failed to fetch orders:', error)
        toast({
          title: t("error"),
          description: t("failedToLoadOrders"),
          variant: "destructive",
        })
      } finally {
        setLoading(false)
      }
    }, [filters])

  // Update filters and refetch
  const updateFilters = useCallback((newFilters: Partial<OrdersFilters>) => {
    const updatedFilters = { ...filters, ...newFilters }
    
    // Reset to page 1 when filters change (except for page changes)
    if (!newFilters.page) {
      updatedFilters.page = 1
    }
    
    // Only update if filters have actually changed
    if (JSON.stringify(updatedFilters) !== JSON.stringify(filters)) {
      setFilters(updatedFilters)
      fetchOrders(updatedFilters)
    }
  }, [filters, fetchOrders])

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
        // Refresh orders after other actions
        await fetchOrders(filters)
        
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

  // Update order status
  const updateOrderStatus = useCallback(async (orderIds: string[], status: OrderStatus) => {
    return performBulkAction({
      orderIds,
      action: "updateStatus",
      status
    })
  }, [performBulkAction])

  // Export orders
  const exportOrders = useCallback(async (orderIds: string[]) => {
    return performBulkAction({
      orderIds,
      action: "export"
    })
  }, [performBulkAction])

  // Get orders by status for tabs
  const getOrdersByStatus = useCallback((status?: OrderStatus) => {
    if (!status) {
      return orders.filter(order => !["ABANDONED", "DELETED", "ARCHIVED"].includes(order.status))
    }
    return orders.filter(order => order.status === status)
  }, [orders])

  // Get status counts
  const getStatusCounts = useCallback(() => {
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

  // Search helpers
  const searchByPhone = useCallback((phone: string) => {
    updateFilters({ phoneSearch: phone, search: undefined })
  }, [updateFilters])

  const searchByText = useCallback((text: string) => {
    updateFilters({ search: text, phoneSearch: undefined })
  }, [updateFilters])

  const clearSearch = useCallback(() => {
    updateFilters({ search: undefined, phoneSearch: undefined })
  }, [updateFilters])

  // Pagination helpers - fixed to use current filters
  const goToPage = useCallback((page: number) => {
    const updatedFilters = { ...filters, page }
    setFilters(updatedFilters)
    fetchOrders(updatedFilters)
  }, [filters, fetchOrders])

  const nextPage = useCallback(() => {
    if (pagination.page < pagination.pages) {
      goToPage(pagination.page + 1)
    }
  }, [pagination, goToPage])

  const previousPage = useCallback(() => {
    if (pagination.page > 1) {
      goToPage(pagination.page - 1)
    }
  }, [pagination, goToPage])

  // Initial load - only run once
  useEffect(() => {
    if (!initialLoadRef.current) {
      initialLoadRef.current = true
      fetchOrders()
    }
  }, [fetchOrders])

  return {
    // Data
    orders,
    loading,
    pagination,
    filters,

    // Actions
    fetchOrders,
    updateFilters,
    performBulkAction,
    deleteOrder,
    updateOrderStatus,
    exportOrders,
    setPagination,

    // Helpers
    getOrdersByStatus,
    getStatusCounts,
    searchByPhone,
    searchByText,
    clearSearch,
    goToPage,
    nextPage,
    previousPage
  }
}