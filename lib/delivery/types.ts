// Core delivery system types and interfaces
export interface DeliveryCredentials {
  type: 'username_password' | 'email_password' | 'api_key';
  username?: string;
  email?: string;
  password?: string;
  apiKey?: string;
}

export interface DeliveryOrder {
  customerName: string;
  customerPhone: string;
  customerPhone2?: string;
  governorate: string;
  city: string;
  address: string;
  productName: string;
  price: number;
  notes?: string;
}

export interface DeliveryOrderResponse {
  success: boolean;
  trackingNumber?: string;
  barcode?: string;
  printUrl?: string;
  error?: string;
}

export interface DeliveryStatus {
  trackingNumber: string;
  status: string;
  message: string;
  lastUpdated: Date;
  history?: DeliveryStatusHistory[];
}

export interface DeliveryStatusHistory {
  status: string;
  message: string;
  date: Date;
}

export interface DeliveryTrackingResponse {
  success: boolean;
  status?: DeliveryStatus;
  error?: string;
}

// Base interface for delivery agencies
export interface IDeliveryAgency {
  readonly id: string;
  readonly name: string;
  readonly supportedRegions: string[];

  createOrder(order: DeliveryOrder, credentials: DeliveryCredentials): Promise<DeliveryOrderResponse>;
  trackOrder(trackingNumber: string, credentials: DeliveryCredentials): Promise<DeliveryTrackingResponse>;
  testConnection(credentials: DeliveryCredentials): Promise<{ success: boolean; error?: string; }>;
}

// Standard status mapping
export const STANDARD_STATUSES = {
  PENDING: 'PENDING',
  CONFIRMED: 'CONFIRMED',
  PICKED_UP: 'PICKED_UP',
  IN_TRANSIT: 'IN_TRANSIT',
  OUT_FOR_DELIVERY: 'OUT_FOR_DELIVERY',
  DELIVERED: 'DELIVERED',
  FAILED: 'FAILED',
  RETURNED: 'RETURNED',
  CANCELLED: 'CANCELLED'
} as const;

export type StandardStatus = typeof STANDARD_STATUSES[keyof typeof STANDARD_STATUSES];

// Database models (matching Prisma schema)
export interface DeliveryShipment {
  id: string;
  orderId: string;
  agencyId: string;
  trackingNumber: string;
  barcode?: string;
  status: string;
  lastStatusUpdate: Date;
  printUrl?: string;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export interface DeliveryAgencyConfig {
  id: string;
  name: string;
  enabled: boolean;
  credentials: DeliveryCredentials;
  settings?: Record<string, any>;
}

export interface SyncResult {
  processed: number;
  updated: number;
  errors: number;
  duration: number;
}