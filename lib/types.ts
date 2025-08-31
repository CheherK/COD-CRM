import type { User, Order, Product, Activity, Role, UserStatus, OrderStatus } from "@prisma/client"

// Re-export Prisma types
export type { User, Order, Product, Activity, Role, UserStatus, OrderStatus }

// Extended types for API responses
export interface AuthUser extends User {
  permissions?: Record<string, boolean>
}

export interface OrderWithItems extends Order {
  items: OrderItem[]
  confirmedBy?: User | null
}

export interface OrderItem {
  id: string
  quantity: number
  price: number
  product: Product
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
}

export interface ChangePasswordData {
  currentPassword: string
  newPassword: string
  confirmPassword: string
}

export interface CreateOrderData {
  customerName: string
  customerPhone: string
  customerEmail?: string
  customerAddress: string
  customerCity: string
  items: {
    productId: string
    quantity: number
    price: number
  }[]
  notes?: string
  deliveryCompany?: string
}

export interface UpdateOrderData {
  customerName?: string
  customerPhone?: string
  customerEmail?: string
  customerAddress?: string
  customerCity?: string
  status?: OrderStatus
  notes?: string
  deliveryCompany?: string
  deliveryPrice?: number
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

// Statistics types
export interface OrderStats {
  total: number
  pending: number
  processing: number
  shipped: number
  delivered: number
  cancelled: number
}

export interface UserStats {
  total: number
  admins: number
  staff: number
  enabled: number
  disabled: number
}
