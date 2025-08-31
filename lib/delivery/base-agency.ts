// lib/delivery/base-agency.ts
// Updated to properly map agency statuses to delivery statuses

import type {
  IDeliveryAgency,
  DeliveryCredentials,
  DeliveryOrder,
  DeliveryOrderResponse,
  DeliveryTrackingResponse,
  DeliveryStatusEnum
} from './types'

export abstract class BaseDeliveryAgency implements IDeliveryAgency {
  abstract readonly id: string
  abstract readonly name: string
  abstract readonly supportedRegions: string[]
  abstract readonly credentialsType: DeliveryCredentials['type']

  // Core methods that must be implemented
  abstract createOrder(order: DeliveryOrder, credentials: DeliveryCredentials): Promise<DeliveryOrderResponse>
  abstract trackOrder(trackingNumber: string, credentials: DeliveryCredentials): Promise<DeliveryTrackingResponse>
  abstract testConnection(credentials: DeliveryCredentials): Promise<{ success: boolean; error?: string }>
  
  // Status mapping - each agency implements their own mapping logic
  protected abstract mapAgencyStatusToDeliveryStatus(agencyStatus: string | number): DeliveryStatusEnum

  // Status mapping helper - agencies can override this for complex mappings
  protected getStatusMappingTable(): Record<string | number, DeliveryStatusEnum> {
    // Default mapping - agencies should override this
    return {
      'pending': 'UPLOADED',
      'confirmed': 'UPLOADED', 
      'picked_up': 'DEPOSIT',
      'in_transit': 'IN_TRANSIT',
      'out_for_delivery': 'IN_TRANSIT',
      'delivered': 'DELIVERED',
      'failed': 'RETURNED',
      'returned': 'RETURNED',
      'cancelled': 'RETURNED'
    };
  }

  // Common validation methods
  protected validateCredentials(credentials: DeliveryCredentials): { valid: boolean; errors: string[] } {
    const errors: string[] = []

    switch (credentials.type) {
      case 'username_password':
        if (!credentials.username?.trim()) errors.push('Username is required')
        if (!credentials.password?.trim()) errors.push('Password is required')
        break
      case 'email_password':
        if (!credentials.email?.trim()) errors.push('Email is required')
        if (!credentials.password?.trim()) errors.push('Password is required')
        break
      case 'api_key':
        if (!credentials.apiKey?.trim()) errors.push('API key is required')
        break
      default:
        errors.push('Invalid credential type')
    }

    return { valid: errors.length === 0, errors }
  }

  protected validateOrder(order: DeliveryOrder): { valid: boolean; errors: string[] } {
    const errors: string[] = []

    if (!order.customerName?.trim()) errors.push('Customer name is required')
    if (!order.customerPhone?.trim()) errors.push('Customer phone is required')
    if (!order.customerCity?.trim()) errors.push('Customer city is required') // Updated field name
    if (!order.customerAddress?.trim()) errors.push('Customer address is required') // Updated field name
    if (!order.productName?.trim()) errors.push('Product name is required')
    if (!order.price || order.price <= 0) errors.push('Valid price is required')

    // Basic phone validation
    const phoneRegex = /^[\d\s+()-]+$/
    if (order.customerPhone && !phoneRegex.test(order.customerPhone)) {
      errors.push('Invalid phone number format')
    }

    // Check supported regions - using customerCity now
    if (order.customerCity && !this.supportedRegions.includes(order.customerCity)) {
      errors.push(`City ${order.customerCity} is not supported by ${this.name}`)
    }

    return { valid: errors.length === 0, errors }
  }

  // HTTP request helper
  protected async makeRequest(url: string, options: RequestInit = {}): Promise<Response> {
    const defaultOptions: RequestInit = {
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'CRM-Delivery-System/1.0',
      },
      // 30 second timeout
      signal: AbortSignal.timeout(30000),
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
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          throw new Error('Request timeout')
        }
        throw new Error(`Network error: ${error.message}`)
      }
      throw new Error('Unknown network error')
    }
  }

  // Logging helper
  protected log(level: 'info' | 'warn' | 'error', message: string, data?: any) {
    const prefix = `[${this.name}]`
    const timestamp = new Date().toISOString()
    
    switch (level) {
      case 'info':
        console.log(`${timestamp} ${prefix} ${message}`, data ? JSON.stringify(data, null, 2) : '')
        break
      case 'warn':
        console.warn(`${timestamp} ${prefix} ${message}`, data ? JSON.stringify(data, null, 2) : '')
        break
      case 'error':
        console.error(`${timestamp} ${prefix} ${message}`, data || '')
        break
    }
  }
}