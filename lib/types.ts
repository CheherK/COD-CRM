import type { 
  User, 
  Order, 
  Product, 
  Activity, 
  Role, 
  UserStatus, 
  OrderStatus,
  OrderItem as PrismaOrderItem,
  OrderStatusHistory,
  DeliveryShipment,
  DeliveryAgency,
  DeliveryStatus,
  CredentialsType,
  LogSource
} from "@prisma/client"

// Re-export Prisma types
export type { 
  User, 
  Order, 
  Product, 
  Activity, 
  Role, 
  UserStatus, 
  OrderStatus,
  OrderStatusHistory,
  DeliveryShipment,
  DeliveryAgency,
  DeliveryStatus,
  CredentialsType,
  LogSource
}

// Extended types for API responses
export interface AuthUser extends User {
  permissions?: Record<string, boolean>
}

// Order with relations (matches your actual API responses)
export interface OrderWithItems extends Order {
  items: OrderItemWithProduct[]
  confirmedBy?: {
    id: string
    username: string
    firstName?: string
    lastName?: string
  } | null
  statusHistory?: OrderStatusHistoryWithUser[]
  shipments?: ShipmentWithAgency[]
  // Computed fields from API
  totalItems?: number
  firstProduct?: Product | null
  hasMultipleProducts?: boolean
  subtotal?: number
}

// Order item with product relation (matches your actual usage)
export interface OrderItemWithProduct {
  id: string
  quantity: number
  price: number
  productId: string
  product: {
    id: string
    name: string
    nameEn: string
    nameFr: string
    imageUrl?: string
    price?: number
  }
}

// Status history with user relation
export interface OrderStatusHistoryWithUser extends OrderStatusHistory {
  user?: {
    id: string
    username: string
    firstName?: string
    lastName?: string
  } | null
}

// Shipment with agency relation
export interface ShipmentWithAgency extends DeliveryShipment {
  agency: {
    id: string
    name: string
  }
}

// API request/response types
export interface LoginCredentials {
  username: string
  password: string
}

export interface CreateUserData {
  username: string
  email: string
  password: string
  firstName?: string
  lastName?: string
  phone?: string
  role?: Role
}

export interface UpdateProfileData {
  firstName?: string
  lastName?: string
  email?: string
  phone?: string
  username?: string
}

export interface ChangePasswordData {
  currentPassword: string
  newPassword: string
  confirmPassword: string
}

// Updated to match your actual API structure
export interface CreateOrderData {
  customerName: string
  customerPhone1: string // Updated to match schema
  customerPhone2?: string
  customerEmail?: string
  customerAddress: string
  customerCity: string
  status?: OrderStatus
  deliveryCompany?: string
  deliveryPrice?: number
  notes?: string
  attemptCount?: number
  items: {
    productId: string
    quantity: number
    price: number
  }[]
}

// Updated to match your actual API structure
export interface UpdateOrderData {
  customerName?: string
  customerPhone1?: string // Updated to match schema
  customerPhone2?: string
  customerEmail?: string
  customerAddress?: string
  customerCity?: string
  status?: OrderStatus
  deliveryCompany?: string
  deliveryPrice?: number
  notes?: string
  attemptCount?: number
  confirmedByID?: string // Match your API parameter name
  statusNote?: string // For status history notes
  items?: {
    productId: string
    quantity: number
    price: number
  }[]
}

// Context types
export interface AuthContextType {
  user: AuthUser | null
  login: (credentials: LoginCredentials) => Promise<boolean>
  logout: () => Promise<void>
  loading: boolean
}

// Statistics types (updated to match your actual order statuses)
export interface OrderStats {
  total: number
  pending: number
  confirmed: number
  rejected: number
  abandoned: number
  deleted: number
  archived: number
  // Delivery statuses
  uploaded?: number
  deposit?: number
  inTransit?: number
  delivered?: number
  returned?: number
}

export interface UserStats {
  total: number
  admins: number
  staff: number
  enabled: number
  disabled: number
}

// Pagination interface (used in your hooks)
export interface PaginationInfo {
  page: number
  limit: number
  total: number
  pages: number
}

// API Response interfaces
export interface ApiResponse<T = any> {
  success: boolean
  message?: string
  error?: string
  data?: T
}

export interface OrdersApiResponse {
  orders: OrderWithItems[]
  pagination: PaginationInfo
  metadata?: {
    timeRange?: string
    totalInRange?: number
    cacheTimestamp?: string
  }
}

// Bulk action types (used in your hooks)
export interface BulkOrderAction {
  orderIds: string[]
  action: "delete" | "updateStatus" | "export"
  status?: OrderStatus
}

// Hook return types (optional - for better typing)
export interface UseOrdersReturn {
  orders: OrderWithItems[]
  loading: boolean
  backgroundLoading: boolean
  pagination: PaginationInfo
  filters: OrdersFilters
  updateOrder: (orderId: string, updateData: UpdateOrderData, options?: { optimistic?: boolean }) => Promise<{ success: boolean; error?: string; responseTime?: number }>
  fetchOrders: (filters?: OrdersFilters) => Promise<{ success: boolean; fromCache?: boolean; error?: string }>
  performBulkAction: (action: BulkOrderAction) => Promise<{ success: boolean; error?: string }>
  deleteOrder: (orderId: string) => Promise<{ success: boolean; error?: string }>
  clearFilters: () => void
  refreshData: () => Promise<{ success: boolean; error?: string }>
}

// Filter types (used in your hooks)
export type TimeRange = "2weeks" | "1month" | "3months" | "all"

export interface OrdersFilters {
  search?: string
  phoneSearch?: string
  status?: string
  dateFrom?: string
  dateTo?: string
  timeRange?: TimeRange
  page?: number
  limit?: number
  product?: string
  city?: string
  deliveryAgency?: string
}