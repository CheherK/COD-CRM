import type {
  IDeliveryAgency,
  DeliveryCredentials,
  DeliveryOrder,
  DeliveryOrderResponse,
  DeliveryTrackingResponse,
} from "./types"

export abstract class BaseDeliveryAgency implements IDeliveryAgency {
  abstract readonly name: string
  abstract readonly id: string
  abstract readonly supportedRegions: string[]

  // Abstract methods that must be implemented by each agency
  abstract authenticate(credentials: DeliveryCredentials): Promise<boolean>
  abstract createOrder(order: DeliveryOrder, credentials: DeliveryCredentials): Promise<DeliveryOrderResponse>
  abstract getOrderStatus(trackingNumber: string, credentials: DeliveryCredentials): Promise<DeliveryTrackingResponse>
  abstract getOrderHistory(trackingNumber: string, credentials: DeliveryCredentials): Promise<DeliveryTrackingResponse>
  abstract mapStatusToStandard(agencyStatus: string | number): string
  abstract testConnection(): Promise<{ success: boolean; error?: string; details?: any }>

  // Common validation methods with default implementations
  validateCredentials(credentials: DeliveryCredentials): { valid: boolean; errors: string[] } {
    const errors: string[] = []

    switch (credentials.type) {
      case "username_password":
        if (!credentials.username) errors.push("Username is required")
        if (!credentials.password) errors.push("Password is required")
        break
      case "email_password":
        if (!credentials.email) errors.push("Email is required")
        if (!credentials.password) errors.push("Password is required")
        break
      case "api_key":
        if (!credentials.apiKey) errors.push("API key is required")
        break
      default:
        errors.push("Invalid credential type")
    }

    return { valid: errors.length === 0, errors }
  }

  validateOrder(order: DeliveryOrder): { valid: boolean; errors: string[] } {
    const errors: string[] = []

    if (!order.customerName?.trim()) errors.push("Customer name is required")
    if (!order.governorate?.trim()) errors.push("Governorate is required")
    if (!order.city?.trim()) errors.push("City is required")
    if (!order.address?.trim()) errors.push("Address is required")
    if (!order.phone?.trim()) errors.push("Phone number is required")
    if (!order.productName?.trim()) errors.push("Product name is required")
    if (!order.price || order.price <= 0) errors.push("Valid price is required")

    // Validate phone number format (basic validation)
    if (order.phone && !/^\+?[\d\s-()]+$/.test(order.phone)) {
      errors.push("Invalid phone number format")
    }

    return { valid: errors.length === 0, errors }
  }

  // Helper method for making HTTP requests
  protected async makeRequest(url: string, options: RequestInit = {}): Promise<Response> {
    const defaultOptions: RequestInit = {
      headers: {
        "Content-Type": "application/json",
        "User-Agent": "CRM-Delivery-System/1.0",
      },
      timeout: 30000, // 30 seconds timeout
    }

    const mergedOptions = {
      ...defaultOptions,
      ...options,
      headers: {
        ...defaultOptions.headers,
        ...options.headers,
      },
    }

    try {
      const response = await fetch(url, mergedOptions)
      return response
    } catch (error) {
      console.error(`Request failed for ${this.name}:`, error)
      throw new Error(`Network error: ${error instanceof Error ? error.message : "Unknown error"}`)
    }
  }

  // Helper method for logging
  protected log(level: "info" | "warn" | "error", message: string, data?: any) {
    const timestamp = new Date().toISOString()
    const logMessage = `[${timestamp}] [${this.name}] ${message}`

    switch (level) {
      case "info":
        console.log(logMessage, data || "")
        break
      case "warn":
        console.warn(logMessage, data || "")
        break
      case "error":
        console.error(logMessage, data || "")
        break
    }
  }
}
