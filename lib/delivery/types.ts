// Core delivery system types and interfaces

export interface DeliveryCredentials {
  type: "username_password" | "email_password" | "api_key"
  username?: string
  email?: string
  password?: string
  apiKey?: string
  additionalParams?: Record<string, any>
}

export interface DeliveryAddress {
  name: string
  governorate: string
  city: string
  address: string
  phone: string
  phone2?: string
}

export interface DeliveryOrder {
  customerName: string
  governorate: string
  city: string
  address: string
  phone: string
  phone2?: string
  productName: string
  price: number
  comment?: string
  isExchange?: boolean
}

export interface DeliveryOrderResponse {
  success: boolean
  trackingNumber?: string
  barcode?: string
  printUrl?: string
  error?: string
  errorDetails?: string
}

export interface DeliveryStatus {
  trackingNumber: string
  status: string
  statusCode?: number
  message: string
  lastUpdated: Date
  history?: DeliveryStatusHistory[]
}

export interface DeliveryStatusHistory {
  status: string
  statusCode?: number
  message: string
  date: Date
}

export interface DeliveryTrackingResponse {
  success: boolean
  status?: DeliveryStatus
  error?: string
  errorDetails?: string
}

// Base interface that all delivery agencies must implement
export interface IDeliveryAgency {
  readonly name: string
  readonly id: string
  readonly supportedRegions: string[]

  // Authentication
  authenticate(credentials: DeliveryCredentials): Promise<boolean>

  // Order management
  createOrder(order: DeliveryOrder, credentials: DeliveryCredentials): Promise<DeliveryOrderResponse>

  // Tracking
  getOrderStatus(trackingNumber: string, credentials: DeliveryCredentials): Promise<DeliveryTrackingResponse>
  getOrderHistory(trackingNumber: string, credentials: DeliveryCredentials): Promise<DeliveryTrackingResponse>

  // Status mapping
  mapStatusToStandard(agencyStatus: string | number): string

  // Validation
  validateOrder(order: DeliveryOrder): { valid: boolean; errors: string[] }
  validateCredentials(credentials: DeliveryCredentials): { valid: boolean; errors: string[] }
}

// Standard status codes used across all agencies
export enum StandardDeliveryStatus {
  PENDING = "PENDING",
  CONFIRMED = "CONFIRMED",
  PICKED_UP = "PICKED_UP",
  IN_TRANSIT = "IN_TRANSIT",
  OUT_FOR_DELIVERY = "OUT_FOR_DELIVERY",
  DELIVERED = "DELIVERED",
  FAILED_DELIVERY = "FAILED_DELIVERY",
  RETURNED = "RETURNED",
  CANCELLED = "CANCELLED",
  LOST = "LOST",
}

// Configuration for each agency
export interface DeliveryAgencyConfig {
  id: string
  name: string
  enabled: boolean
  credentials: DeliveryCredentials
  settings: Record<string, any>
  webhookUrl?: string
  pollingInterval?: number // in minutes
}

// Database models
export interface DeliveryShipment {
  id: string
  orderId: string
  agencyId: string
  trackingNumber: string
  barcode?: string
  status: string
  lastStatusUpdate: Date
  printUrl?: string
  metadata?: Record<string, any>
  createdAt: Date
  updatedAt: Date
}

export interface DeliveryStatusLog {
  id: string
  shipmentId: string
  status: string
  statusCode?: number
  message: string
  timestamp: Date
  source: "api" | "webhook" | "manual"
  rawData?: Record<string, any>
}
