// lib/delivery/types.ts
// Updated to match Prisma schema and separate order vs delivery status

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
  customerCity: string; // Updated to match schema
  customerAddress: string; // Updated field name
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
  status: DeliveryStatusEnum; // Use the enum from schema
  message: string;
  lastUpdated: Date;
  history?: DeliveryStatusHistory[];
}

export interface DeliveryStatusHistory {
  status: DeliveryStatusEnum;
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
  readonly credentialsType: DeliveryCredentials['type'];

  createOrder(order: DeliveryOrder, credentials: DeliveryCredentials): Promise<DeliveryOrderResponse>;
  trackOrder(trackingNumber: string, credentials: DeliveryCredentials): Promise<DeliveryTrackingResponse>;
  testConnection(credentials: DeliveryCredentials): Promise<{ success: boolean; error?: string; }>;
}

// Delivery status mapping - matches Prisma enum
export const DELIVERY_STATUSES = {
  UPLOADED: 'UPLOADED',
  DEPOSIT: 'DEPOSIT', 
  IN_TRANSIT: 'IN_TRANSIT',
  DELIVERED: 'DELIVERED',
  RETURNED: 'RETURNED'
} as const;

export type DeliveryStatusEnum = typeof DELIVERY_STATUSES[keyof typeof DELIVERY_STATUSES];

// Database models (matching Prisma schema exactly)
export interface DeliveryShipment {
  id: string;
  orderId: string;
  agencyId: string;
  trackingNumber: string;
  barcode?: string;
  status: DeliveryStatusEnum; // Updated to use correct enum
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
  pollingInterval: number;
}

export interface SyncResult {
  processed: number;
  updated: number;
  errors: number;
  duration: number;
}