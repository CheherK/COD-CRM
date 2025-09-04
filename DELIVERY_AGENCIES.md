# Delivery Agencies Integration Guide

This comprehensive guide covers the complete delivery agencies feature implementation in the CRM system, including architecture, configuration, usage, and maintenance.

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Database Schema](#database-schema)
4. [API Documentation](#api-documentation)
5. [Usage Guide](#usage-guide)
6. [Configuration](#configuration)
7. [Best Delivery Integration](#best-delivery-integration)
8. [Adding New Delivery Agencies](#adding-new-delivery-agencies)
9. [Background Synchronization](#background-synchronization)
10. [Error Handling](#error-handling)
11. [Security Considerations](#security-considerations)
12. [Performance Optimization](#performance-optimization)
13. [Monitoring and Analytics](#monitoring-and-analytics)
14. [Troubleshooting](#troubleshooting)
15. [Future Enhancements](#future-enhancements)

---

## Overview

The Delivery Agencies feature provides a comprehensive solution for integrating multiple delivery services into the CRM system. It enables automatic shipment creation, real-time tracking, and centralized management of all delivery operations.

### Key Features

- **Multi-Agency Support**: Integrate with multiple delivery agencies simultaneously
- **Automatic Shipment Creation**: Orders are automatically pushed to selected delivery agencies
- **Real-Time Tracking**: Continuous synchronization of shipment statuses
- **Centralized Management**: Single interface for managing all delivery operations
- **Flexible Configuration**: Easy setup and configuration of agency credentials
- **Comprehensive Logging**: Complete audit trail of all delivery activities
- **Error Handling**: Robust error handling with retry mechanisms
- **Multilingual Support**: Full internationalization support

### Currently Supported Agencies

- **Best Delivery**: Complete SOAP API integration with pickup creation and tracking
- **Extensible Architecture**: Easy to add new agencies

---

## Architecture

### Design Patterns

The delivery system follows several key design patterns:

1. **Interface Segregation**: `IDeliveryAgency` interface defines the contract
2. **Abstract Factory**: `BaseDeliveryAgency` provides common functionality
3. **Registry Pattern**: `DeliveryAgencyRegistry` manages agency instances
4. **Service Layer**: `DeliveryService` handles business logic
5. **Repository Pattern**: Database operations abstracted through Prisma

### File Structure

```plaintext
lib/delivery/
├── types.ts                 # Type definitions and interfaces
├── base-agency.ts          # Abstract base class for agencies
├── agency-registry.ts      # Registry for managing agencies
├── delivery-service.ts     # Main service layer
├── sync-service.ts         # Background synchronization
└── agencies/
    └── best-delivery.ts    # Best Delivery implementation

app/api/delivery/
├── agencies/
│   └── route.ts           # Agency management endpoints
├── shipments/
│   └── route.ts           # Shipment operations
├── track/
│   └── [trackingNumber]/
│       └── route.ts       # Tracking endpoints
└── sync/
    └── route.ts           # Synchronization endpoints
```

---

## Database Schema

### Core Tables

#### delivery_agencies

```sql
CREATE TABLE delivery_agencies (
  id VARCHAR(50) PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  enabled BOOLEAN DEFAULT false,
  credentials_type ENUM('username_password', 'email_password', 'api_key') NOT NULL,
  credentials_username VARCHAR(100),
  credentials_email VARCHAR(100),
  credentials_password VARCHAR(255),
  credentials_api_key VARCHAR(255),
  settings JSON,
  webhook_url VARCHAR(500),
  polling_interval INTEGER DEFAULT 300,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  INDEX idx_enabled (enabled),
  INDEX idx_updated_at (updated_at)
);
```

#### delivery_shipments

```sql
CREATE TABLE delivery_shipments (
  id VARCHAR(50) PRIMARY KEY,
  order_id VARCHAR(50) NOT NULL,
  agency_id VARCHAR(50) NOT NULL,
  tracking_number VARCHAR(100) NOT NULL UNIQUE,
  barcode VARCHAR(100),
  status VARCHAR(50) NOT NULL,
  last_status_update TIMESTAMP NOT NULL,
  print_url VARCHAR(500),
  metadata JSON,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
  FOREIGN KEY (agency_id) REFERENCES delivery_agencies(id),
  INDEX idx_order_id (order_id),
  INDEX idx_agency_id (agency_id),
  INDEX idx_tracking_number (tracking_number),
  INDEX idx_status (status),
  INDEX idx_last_status_update (last_status_update)
);
```

#### delivery_status_logs

```sql
CREATE TABLE delivery_status_logs (
  id VARCHAR(50) PRIMARY KEY,
  shipment_id VARCHAR(50) NOT NULL,
  status VARCHAR(50) NOT NULL,
  status_code INTEGER,
  message TEXT,
  timestamp TIMESTAMP NOT NULL,
  source ENUM('api', 'webhook', 'manual') DEFAULT 'api',
  raw_data JSON,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (shipment_id) REFERENCES delivery_shipments(id) ON DELETE CASCADE,
  INDEX idx_shipment_id (shipment_id),
  INDEX idx_timestamp (timestamp),
  INDEX idx_status (status)
);
```

---

## API Documentation

### Agency Management

#### GET /api/delivery/agencies

**Purpose**: Retrieve all delivery agencies with their configuration  
**Access**: Admin only

**Response**:

```json
{
  "success": true,
  "agencies": [
    {
      "id": "best-delivery",
      "name": "Best Delivery",
      "enabled": true,
      "credentialsType": "username_password",
      "settings": {
        "autoSync": true,
        "pollingInterval": 300,
        "supportedRegions": ["Tunis", "Sfax", "Sousse"]
      },
      "lastSync": "2025-01-16T10:30:00Z"
    }
  ]
}
```

#### PUT /api/delivery/agencies/:id

**Purpose**: Update agency configuration and credentials  
**Access**: Admin only

**Request Body**:

```json
{
  "enabled": true,
  "credentialsUsername": "your_username",
  "credentialsPassword": "your_password",
  "settings": {
    "autoSync": true,
    "pollingInterval": 300
  }
}
```

### Shipment Operations

#### POST /api/delivery/shipments

**Purpose**: Create a new shipment for an order  
**Access**: Authenticated users

**Request Body**:

```json
{
  "orderId": "order-123",
  "agencyId": "best-delivery"
}
```

**Response**:

```json
{
  "success": true,
  "shipment": {
    "id": "shipment-456",
    "trackingNumber": "BD123456789",
    "barcode": "123456789",
    "status": "pending",
    "printUrl": "https://api.bestdelivery.com/print/123456789"
  }
}
```

#### GET /api/delivery/shipments

**Purpose**: Retrieve shipments with optional filtering  
**Access**: Authenticated users

**Query Parameters**:
- `orderId`: Filter by order ID
- `agencyId`: Filter by agency ID
- `status`: Filter by status
- `limit`: Limit results (default: 50)

### Tracking

#### GET /api/delivery/track/:trackingNumber

**Purpose**: Get detailed tracking information for a shipment  
**Access**: Authenticated users

**Response**:

```json
{
  "success": true,
  "tracking": {
    "trackingNumber": "BD123456789",
    "status": "in_transit",
    "lastUpdate": "2025-01-16T14:30:00Z",
    "history": [
      {
        "status": "pending",
        "message": "Shipment created",
        "timestamp": "2025-01-16T10:00:00Z"
      },
      {
        "status": "picked_up",
        "message": "Package picked up",
        "timestamp": "2025-01-16T12:00:00Z"
      }
    ]
  }
}
```

### Synchronization

#### POST /api/delivery/sync

**Purpose**: Manual sync trigger and sync status  
**Access**: Admin only

**Response**:

```json
{
  "success": true,
  "syncResults": {
    "processed": 25,
    "updated": 12,
    "errors": 0,
    "duration": 1500
  }
}
```

---

## Usage Guide

### For End Users

#### Creating a Shipment

1. Navigate to an order in the CRM
2. Open the order sidebar
3. Select a delivery agency from the dropdown
4. The system automatically creates a shipment
5. Tracking number and print URL are displayed immediately

#### Tracking Orders

- View tracking information directly in the order sidebar
- Real-time status updates are synchronized automatically
- Complete delivery history is maintained

### For Administrators

#### Configuring Agencies

1. Navigate to **Dashboard → Delivery Management**
2. Configure agency credentials and settings
3. Test connections to ensure proper setup
4. Enable/disable agencies as needed

#### Managing Shipments

- View all shipments in the delivery management interface
- Monitor sync status and performance
- Access comprehensive delivery analytics

---

## Configuration

### Environment Variables

```env
# Best Delivery Configuration
BEST_DELIVERY_USERNAME=your_username
BEST_DELIVERY_PASSWORD=your_password
BEST_DELIVERY_ENDPOINT=https://api.bestdelivery.com/soap

# Sync Configuration
DELIVERY_SYNC_INTERVAL=300000
DELIVERY_MAX_RETRIES=3
DELIVERY_TIMEOUT=30000
```

### Agency Configuration Format

```typescript
{
  name: "Best Delivery",
  code: "BEST",
  isActive: true,
  credentials: {
    username: "your_username",
    password: "your_password",
    endpoint: "https://api.bestdelivery.com/soap"
  },
  settings: {
    autoSync: true,
    syncInterval: 300000, // 5 minutes
    maxRetries: 3,
    timeout: 30000,
    supportedRegions: [
      "Ariana", "Béja", "Ben Arous", "Bizerte", "Gabès", "Gafsa",
      "Jendouba", "Kairouan", "Kasserine", "Kébili", "La Manouba",
      "Le Kef", "Mahdia", "Médenine", "Monastir", "Nabeul", "Sfax",
      "Sidi Bouzid", "Siliana", "Sousse", "Tataouine", "Tozeur",
      "Tunis", "Zaghouan"
    ]
  }
}
```

---

## Best Delivery Integration

### SOAP Operations Implemented

#### CreatePickup

Creates new shipments with pickup requests.

**Request Structure**:

```xml
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
  <soap:Body>
    <CreatePickup>
      <username>your_username</username>
      <password>your_password</password>
      <customerName>John Doe</customerName>
      <customerPhone>+216 12 345 678</customerPhone>
      <customerAddress>123 Main St, Tunis</customerAddress>
      <productDescription>Electronics</productDescription>
      <cashOnDelivery>150.00</cashOnDelivery>
    </CreatePickup>
  </soap:Body>
</soap:Envelope>
```

#### TrackShipmentStatus

Gets current status of shipments.

**Request Structure**:

```xml
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
  <soap:Body>
    <TrackShipmentStatus>
      <username>your_username</username>
      <password>your_password</password>
      <trackingNumber>BD123456789</trackingNumber>
    </TrackShipmentStatus>
  </soap:Body>
</soap:Envelope>
```

#### TrackShipment

Gets detailed tracking information.

### Status Mapping

| Best Delivery Status | System Status | Description |
|---------------------|---------------|-------------|
| PENDING | pending | Shipment created, awaiting pickup |
| CONFIRMED | confirmed | Shipment confirmed by agency |
| PICKED_UP | picked_up | Package collected by courier |
| IN_TRANSIT | in_transit | Package in delivery network |
| OUT_FOR_DELIVERY | out_for_delivery | Package out for final delivery |
| DELIVERED | delivered | Package successfully delivered |
| FAILED | failed | Delivery attempt failed |
| RETURNED | returned | Package returned to sender |
| CANCELLED | cancelled | Shipment cancelled |

### Error Handling

- **Authentication Errors**: Invalid credentials handling
- **Network Timeouts**: Retry mechanism with exponential backoff
- **Invalid Data**: Comprehensive validation before API calls
- **Rate Limiting**: Respect API rate limits with queuing

---

## Adding New Delivery Agencies

### Step 1: Create Agency Implementation

```typescript
// lib/delivery/agencies/new-agency.ts
import { BaseDeliveryAgency } from '../base-agency';
import { DeliveryOrder, DeliveryOrderResponse, DeliveryStatus } from '../types';

export class NewAgencyDelivery extends BaseDeliveryAgency {
  protected agencyName = 'New Agency';
  protected agencyCode = 'NEW_AGENCY';

  async createShipment(order: DeliveryOrder): Promise<DeliveryOrderResponse> {
    try {
      // Validate order data
      this.validateOrder(order);
      
      // Prepare API request
      const requestData = this.transformOrderToAgencyFormat(order);
      
      // Make API call
      const response = await this.makeApiCall('/create-shipment', requestData);
      
      // Transform response
      return {
        success: true,
        trackingNumber: response.trackingNumber,
        barcode: response.barcode,
        printUrl: response.printUrl,
        status: this.mapAgencyStatus(response.status),
        agencyResponse: response
      };
      
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        agencyResponse: null
      };
    }
  }

  async trackShipment(trackingNumber: string): Promise<DeliveryStatus> {
    try {
      const response = await this.makeApiCall('/track', { trackingNumber });
      
      return {
        trackingNumber,
        status: this.mapAgencyStatus(response.status),
        lastUpdate: new Date(response.lastUpdate),
        location: response.location,
        message: response.message,
        history: response.history?.map((h: any) => ({
          status: this.mapAgencyStatus(h.status),
          message: h.message,
          timestamp: new Date(h.timestamp),
          location: h.location
        })) || []
      };
      
    } catch (error) {
      throw new Error(`Tracking failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private transformOrderToAgencyFormat(order: DeliveryOrder): any {
    // Transform CRM order format to agency-specific format
    return {
      customerName: order.customerName,
      customerPhone: order.customerPhone,
      customerAddress: order.shippingAddress,
      items: order.items.map(item => ({
        name: item.productName,
        quantity: item.quantity,
        value: item.price
      })),
      totalValue: order.totalAmount,
      notes: order.notes
    };
  }

  private mapAgencyStatus(agencyStatus: string): string {
    const statusMap: Record<string, string> = {
      'created': 'pending',
      'in_progress': 'in_transit',
      'completed': 'delivered',
      'failed': 'failed'
    };
    
    return statusMap[agencyStatus.toLowerCase()] || 'unknown';
  }

  private async makeApiCall(endpoint: string, data: any): Promise<any> {
    const credentials = this.getCredentials();
    
    const response = await fetch(`${credentials.apiUrl}${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${credentials.apiKey}`
      },
      body: JSON.stringify(data)
    });
    
    if (!response.ok) {
      throw new Error(`API call failed: ${response.status} ${response.statusText}`);
    }
    
    return response.json();
  }
}
```

### Step 2: Register Agency

```typescript
// lib/delivery/agency-registry.ts
import { NewAgencyDelivery } from './agencies/new-agency';

// Add to registry initialization
export class DeliveryAgencyRegistry {
  private agencies = new Map<string, typeof BaseDeliveryAgency>();

  constructor() {
    // Register existing agencies
    this.register('best-delivery', BestDeliveryAgency);
    
    // Register new agency
    this.register('new-agency', NewAgencyDelivery);
  }
}
```

### Step 3: Add Database Configuration

```sql
-- Add new agency to database
INSERT INTO delivery_agencies (
  id, name, enabled, credentials_type, settings, polling_interval
) VALUES (
  'new-agency',
  'New Agency',
  false,
  'api_key',
  JSON_OBJECT(
    'autoSync', true,
    'pollingInterval', 300,
    'supportedRegions', JSON_ARRAY('Region1', 'Region2')
  ),
  300
);
```

### Step 4: Add Translations

```typescript
// lib/translations.ts
export const translations = {
  en: {
    // ... existing translations
    'delivery.agency.new_agency': 'New Agency',
    'delivery.status.new_agency.created': 'Created',
    'delivery.status.new_agency.in_progress': 'In Progress',
  },
  fr: {
    // ... existing translations
    'delivery.agency.new_agency': 'Nouvelle Agence',
    'delivery.status.new_agency.created': 'Créé',
    'delivery.status.new_agency.in_progress': 'En Cours',
  }
};
```

---

## Background Synchronization

### Automatic Sync Service

The sync service runs automatically to update shipment statuses:

```typescript
// lib/delivery/sync-service.ts
export class DeliverySyncService {
  private isRunning = false;
  private syncInterval: NodeJS.Timeout | null = null;

  async startAutoSync(): Promise<void> {
    if (this.isRunning) return;
    
    this.isRunning = true;
    console.log('🚀 Starting delivery sync service...');
    
    // Initial sync
    await this.syncAllShipments();
    
    // Schedule recurring sync
    this.syncInterval = setInterval(async () => {
      try {
        await this.syncAllShipments();
      } catch (error) {
        console.error('❌ Sync error:', error);
      }
    }, 5 * 60 * 1000); // 5 minutes
  }

  async syncAllShipments(): Promise<SyncResult> {
    const startTime = Date.now();
    let processed = 0;
    let updated = 0;
    let errors = 0;

    try {
      // Get all active shipments
      const activeShipments = await prisma.getActiveDeliveryShipments();
      
      console.log(`🔄 Syncing ${activeShipments.length} active shipments...`);
      
      for (const shipment of activeShipments) {
        try {
          const agency = registry.getAgency(shipment.agencyId);
          const status = await agency.trackShipment(shipment.trackingNumber);
          
          // Update if status changed
          if (status.status !== shipment.status) {
            await this.updateShipmentStatus(shipment, status);
            updated++;
          }
          
          processed++;
          
        } catch (error) {
          console.error(`❌ Error syncing shipment ${shipment.id}:`, error);
          errors++;
        }
        
        // Rate limiting
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
      
      const duration = Date.now() - startTime;
      console.log(`✅ Sync completed: ${processed} processed, ${updated} updated, ${errors} errors in ${duration}ms`);
      
      return { processed, updated, errors, duration };
      
    } catch (error) {
      console.error('❌ Fatal sync error:', error);
      throw error;
    }
  }
}
```

### Manual Sync

Available through admin interface for immediate synchronization:

```typescript
// app/api/delivery/sync/route.ts
export async function POST(request: NextRequest) {
  try {
    const user = await extractUserFromRequest(request);
    
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }
    
    const syncService = new DeliverySyncService();
    const result = await syncService.syncAllShipments();
    
    // Log activity
    await logSystemActivity(
      'DELIVERY_MANUAL_SYNC',
      `Manual delivery sync completed: ${result.processed} processed, ${result.updated} updated`,
      request,
      user.id,
      result
    );
    
    return NextResponse.json({
      success: true,
      syncResults: result
    });
    
  } catch (error) {
    console.error('❌ Manual sync error:', error);
    return NextResponse.json({ error: 'Sync failed' }, { status: 500 });
  }
}
```

---

## Error Handling

### Common Error Scenarios

#### 1. Invalid Credentials

```typescript
class AuthenticationError extends Error {
  constructor(agency: string) {
    super(`Authentication failed for ${agency}. Please check credentials.`);
    this.name = 'AuthenticationError';
  }
}
```

#### 2. Network Issues

```typescript
class NetworkError extends Error {
  constructor(agency: string, originalError: Error) {
    super(`Network error connecting to ${agency}: ${originalError.message}`);
    this.name = 'NetworkError';
  }
}
```

#### 3. Invalid Orders

```typescript
class ValidationError extends Error {
  constructor(field: string, value: any) {
    super(`Invalid ${field}: ${value}`);
    this.name = 'ValidationError';
  }
}
```

### Error Recovery Strategy

```typescript
export class ErrorRecoveryService {
  private maxRetries = 3;
  private baseDelay = 1000; // 1 second

  async executeWithRetry<T>(
    operation: () => Promise<T>,
    context: string
  ): Promise<T> {
    let lastError: Error;
    
    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error as Error;
        
        if (attempt === this.maxRetries) {
          console.error(`❌ ${context} failed after ${this.maxRetries} attempts:`, error);
          break;
        }
        
        const delay = this.baseDelay * Math.pow(2, attempt - 1); // Exponential backoff
        console.warn(`⚠️ ${context} attempt ${attempt} failed, retrying in ${delay}ms:`, error);
        
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    
    throw lastError!;
  }
}
```

---

## Security Considerations

### Access Control

- Agency configuration restricted to admin users
- Shipment creation requires authentication
- Tracking information protected by user context
- API endpoints secured with proper authorization

### Data Protection

```typescript
// Encrypt sensitive credentials
export class CredentialManager {
  private static encrypt(data: string): string {
    const cipher = crypto.createCipher('aes-256-cbc', process.env.ENCRYPTION_KEY!);
    let encrypted = cipher.update(data, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return encrypted;
  }
  
  private static decrypt(encryptedData: string): string {
    const decipher = crypto.createDecipher('aes-256-cbc', process.env.ENCRYPTION_KEY!);
    let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  }
  
  static storeCredentials(agencyId: string, credentials: any): Promise<void> {
    const encrypted = {
      username: credentials.username ? this.encrypt(credentials.username) : null,
      password: credentials.password ? this.encrypt(credentials.password) : null,
      apiKey: credentials.apiKey ? this.encrypt(credentials.apiKey) : null
    };
    
    return prisma.updateDeliveryAgency(agencyId, {
      credentialsUsername: encrypted.username,
      credentialsPassword: encrypted.password,
      credentialsApiKey: encrypted.apiKey
    });
  }
}
```

### Audit Logging

All delivery operations are logged for security and compliance:

```typescript
await logSystemActivity(
  'DELIVERY_SHIPMENT_CREATED',
  `Shipment created for order ${orderId} via ${agencyId}`,
  request,
  userId,
  {
    orderId,
    agencyId,
    trackingNumber: result.trackingNumber,
    ipAddress: request.headers.get('x-forwarded-for')
  }
);
```

---

## Performance Optimization

### Caching Strategy

```typescript
export class DeliveryCache {
  private cache = new Map<string, { data: any; expiry: number }>();
  private defaultTTL = 5 * 60 * 1000; // 5 minutes

  set(key: string, data: any, ttl: number = this.defaultTTL): void {
    this.cache.set(key, {
      data,
      expiry: Date.now() + ttl
    });
  }

  get(key: string): any | null {
    const item = this.cache.get(key);
    
    if (!item) return null;
    
    if (Date.now() > item.expiry) {
      this.cache.delete(key);
      return null;
    }
    
    return item.data;
  }

  // Cache tracking results
  async getTrackingInfo(trackingNumber: string): Promise<DeliveryStatus | null> {
    const cacheKey = `tracking:${trackingNumber}`;
    const cached = this.get(cacheKey);
    
    if (cached) {
      console.log(`📋 Cache hit for tracking: ${trackingNumber}`);
      return cached;
    }
    
    return null;
  }

  setTrackingInfo(trackingNumber: string, status: DeliveryStatus): void {
    const cacheKey = `tracking:${trackingNumber}`;
    this.set(cacheKey, status, 5 * 60 * 1000); // 5 minutes
  }
}
```

### Database Optimization

```sql
-- Optimize queries with proper indexing
CREATE INDEX idx_delivery_shipments_status_agency ON delivery_shipments(status, agency_id);
CREATE INDEX idx_delivery_shipments_last_update ON delivery_shipments(last_status_update);
CREATE INDEX idx_delivery_status_logs_shipment_timestamp ON delivery_status_logs(shipment_id, timestamp DESC);

-- Partition large tables by date
ALTER TABLE delivery_status_logs 
PARTITION BY RANGE (YEAR(created_at)) (
  PARTITION p2024 VALUES LESS THAN (2025),
  PARTITION p2025 VALUES LESS THAN (2026),
  PARTITION p_future VALUES LESS THAN MAXVALUE
);
```

### Batch Operations

```typescript
export class BatchProcessor {
  async processBatch<T>(
    items: T[],
    processor: (item: T) => Promise<void>,
    batchSize: number = 10
  ): Promise<void> {
    for (let i = 0; i < items.length; i += batchSize) {
      const batch = items.slice(i, i + batchSize);
      
      await Promise.all(
        batch.map(item => processor(item).catch(error => {
          console.error('Batch item processing error:', error);
        }))
      );
      
      // Rate limiting between batches
      if (i + batchSize < items.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
  }
}
```

---

## Monitoring and Analytics

### Key Metrics Tracked

```typescript
export interface DeliveryMetrics {
  totalShipments: number;
  activeShipments: number;
  deliveredShipments: number;
  failedShipments: number;
  averageDeliveryTime: number;
  agencyPerformance: Record<string, {
    totalShipments: number;
    successRate: number;
    averageDeliveryTime: number;
  }>;
  statusDistribution: Record<string, number>;
  syncPerformance: {
    lastSyncTime: Date;
    syncDuration: number;
    syncErrors: number;
  };
}
```

### Analytics Dashboard

```typescript
// app/api/analytics/delivery/route.ts
export async function GET(request: NextRequest) {
  try {
    const user = await extractUserFromRequest(request);
    
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }
    
    const metrics = await generateDeliveryMetrics();
    
    return NextResponse.json({
      success: true,
      metrics
    });
    
  } catch (error) {
    console.error('❌ Analytics error:', error);
    return NextResponse.json({ error: 'Failed to generate analytics' }, { status: 500 });
  }
}

async function generateDeliveryMetrics(): Promise<DeliveryMetrics> {
  const stats = await prisma.getDeliveryStats();
  
  return {
    totalShipments: stats.totalShipments,
    activeShipments: stats.activeShipments,
    deliveredShipments: stats.deliveredShipments,
    pendingShipments: stats.pendingShipments,
    byAgency: stats.byAgency,
    byStatus: stats.byStatus
  };
}
```

### Performance Monitoring

```typescript
export class PerformanceMonitor {
  private metrics = new Map<string, number[]>();

  recordMetric(name: string, value: number): void {
    if (!this.metrics.has(name)) {
      this.metrics.set(name, []);
    }
    
    const values = this.metrics.get(name)!;
    values.push(value);
    
    // Keep only last 100 values
    if (values.length > 100) {
      values.shift();
    }
  }

  getAverageMetric(name: string): number {
    const values = this.metrics.get(name);
    if (!values || values.length === 0) return 0;
    
    return values.reduce((sum, val) => sum + val, 0) / values.length;
  }

  async trackApiCall<T>(
    operation: string,
    apiCall: () => Promise<T>
  ): Promise<T> {
    const startTime = Date.now();
    
    try {
      const result = await apiCall();
      const duration = Date.now() - startTime;
      
      this.recordMetric(`${operation}.duration`, duration);
      this.recordMetric(`${operation}.success`, 1);
      
      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      
      this.recordMetric(`${operation}.duration`, duration);
      this.recordMetric(`${operation}.error`, 1);
      
      throw error;
    }
  }
}
```

---

## Troubleshooting

### Common Issues

#### Shipment Creation Fails

**Symptoms**: Orders not creating shipments when agency is selected

**Diagnosis Steps**:

1. Check agency credentials in admin panel
2. Verify order has all required fields (customer name, phone, address)
3. Check API connectivity and logs
4. Ensure agency is active and configured
5. Review error logs in browser console and server logs

**Solutions**:

```bash
# Check agency status
curl -X GET "https://your-crm-domain.com/api/delivery/agencies" \
  -H "Authorization: Bearer your-token"

# Test agency connection
curl -X POST "https://your-crm-domain.com/api/delivery/test" \
  -H "Content-Type: application/json" \
  -d '{"agencyId": "best-delivery"}'
```

#### Tracking Not Updating

**Symptoms**: Shipment status remains unchanged despite time passing

**Diagnosis Steps**:

1. Verify sync service is running
2. Check agency API status and connectivity
3. Review sync logs for errors
4. Test manual sync operation
5. Verify tracking number format

**Solutions**:

```typescript
// Manual sync for specific shipment
const syncService = new DeliverySyncService();
await syncService.syncShipment('shipment-id');

// Check sync service status
const status = await syncService.getStatus();
console.log('Sync service status:', status);
```

#### Performance Issues

**Symptoms**: Slow shipment creation or tracking updates

**Diagnosis Steps**:

1. Check database query performance
2. Review sync interval settings
3. Monitor API response times
4. Analyze network latency
5. Check server resource usage

**Solutions**:

```sql
-- Optimize database queries
EXPLAIN SELECT * FROM delivery_shipments 
WHERE status IN ('pending', 'in_transit') 
AND last_status_update < DATE_SUB(NOW(), INTERVAL 1 HOUR);

-- Add missing indexes
CREATE INDEX idx_shipments_status_update ON delivery_shipments(status, last_status_update);
```

#### Authentication Errors

**Symptoms**: "Authentication failed" errors in logs

**Diagnosis Steps**:

1. Verify credentials are correct
2. Check if credentials are encrypted properly
3. Test credentials directly with agency API
4. Verify credential format matches agency requirements

**Solutions**:

```typescript
// Test credentials
const testAuth = async (agencyId: string) => {
  const agency = registry.getAgency(agencyId);
  const credentials = await agency.getCredentials();
  
  try {
    await agency.testConnection();
    console.log('✅ Authentication successful');
  } catch (error) {
    console.error('❌ Authentication failed:', error);
  }
};
```

### Debug Mode

Enable detailed logging by setting environment variables:

```env
DEBUG_DELIVERY=true
DEBUG_DELIVERY_API=true
DEBUG_DELIVERY_SYNC=true
```

**Debug Output Example**:

```plaintext
🔍 [DELIVERY] Creating shipment for order: order-123
🔍 [DELIVERY] Agency: best-delivery
🔍 [DELIVERY] Order data: {"customerName":"John Doe","customerPhone":"+216..."}
🔍 [DELIVERY_API] Making SOAP request to: https://api.bestdelivery.com/soap
🔍 [DELIVERY_API] Request XML: <soap:Envelope>...</soap:Envelope>
🔍 [DELIVERY_API] Response received: {"trackingNumber":"BD123456789"}
✅ [DELIVERY] Shipment created successfully: shipment-456
```

### Testing Endpoints

Create test endpoints for debugging:

```typescript
// app/api/test/delivery/route.ts
export async function POST(request: NextRequest) {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Not available in production' }, { status: 403 });
  }
  
  const { agencyId, orderId } = await request.json();
  
  try {
    // Test agency connection
    const agency = registry.getAgency(agencyId);
    await agency.testConnection();
    
    // Test order creation
    if (orderId) {
      const order = await prisma.findOrderById(orderId);
      if (order) {
        const result = await agency.createShipment(transformOrderToDeliveryOrder(order));
        return NextResponse.json({ success: true, result });
      }
    }
    
    return NextResponse.json({ success: true, message: 'Connection test passed' });
    
  } catch (error) {
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
}
```

### Log Analysis

```bash
# Filter delivery-related logs
grep "DELIVERY" /var/log/crm/application.log | tail -100

# Monitor real-time delivery operations
tail -f /var/log/crm/application.log | grep "DELIVERY"

# Check for errors in the last hour
grep "ERROR.*DELIVERY" /var/log/crm/application.log | grep "$(date -d '1 hour ago' '+%Y-%m-%d %H')"
```

---

## Future Enhancements

### Planned Features

#### Multi-package Shipments

Support for orders with multiple packages:

```typescript
interface MultiPackageOrder extends DeliveryOrder {
  packages: Array<{
    id: string;
    items: OrderItem[];
    weight: number;
    dimensions: {
      length: number;
      width: number;
      height: number;
    };
  }>;
}
```

#### Delivery Scheduling

Advanced pickup and delivery scheduling:

```typescript
interface DeliverySchedule {
  pickupDate: Date;
  pickupTimeSlot: {
    start: string; // "09:00"
    end: string;   // "12:00"
  };
  deliveryDate?: Date;
  deliveryTimeSlot?: {
    start: string;
    end: string;
  };
  specialInstructions?: string;
}
```

#### Cost Calculation

Real-time shipping cost estimation:

```typescript
interface ShippingCost {
  baseCost: number;
  weightCost: number;
  distanceCost: number;
  serviceFee: number;
  totalCost: number;
  currency: string;
  estimatedDeliveryTime: {
    min: number; // hours
    max: number; // hours
  };
}
```

#### Label Printing

Direct integration with label printers:

```typescript
interface LabelPrintOptions {
  format: 'PDF' | 'ZPL' | 'EPL';
  size: 'A4' | '4x6' | '4x8';
  copies: number;
  printer?: string; // Printer name/IP
}
```

#### SMS Notifications

Customer notifications via SMS:

```typescript
interface SMSNotification {
  phoneNumber: string;
  message: string;
  template: 'shipment_created' | 'out_for_delivery' | 'delivered';
  variables: Record<string, string>;
}
```

#### Webhook Support

Real-time status updates via webhooks:

```typescript
interface WebhookConfig {
  url: string;
  secret: string;
  events: Array<'shipment_created' | 'status_updated' | 'delivered'>;
  retryPolicy: {
    maxRetries: number;
    backoffMultiplier: number;
  };
}
```

### Additional Agencies

#### DHL Express

```typescript
export class DHLExpressDelivery extends BaseDeliveryAgency {
  protected agencyName = 'DHL Express';
  protected agencyCode = 'DHL_EXPRESS';
  
  // Implementation for DHL Express API
}
```

#### FedEx

```typescript
export class FedExDelivery extends BaseDeliveryAgency {
  protected agencyName = 'FedEx';
  protected agencyCode = 'FEDEX';
  
  // Implementation for FedEx API
}
```

#### UPS

```typescript
export class UPSDelivery extends BaseDeliveryAgency {
  protected agencyName = 'UPS';
  protected agencyCode = 'UPS';
  
  // Implementation for UPS API
}
```

#### Local Courier Services

Framework for integrating local courier services with standardized APIs.

---

## Support

### Documentation

- **API Documentation**: Available in code comments and OpenAPI specification
- **Type Definitions**: Comprehensive TypeScript interfaces for all data structures
- **Error Codes**: Documented error codes and their meanings in base agency class

### Logging

- **Operation Logging**: All delivery operations logged with appropriate levels
- **Activity Integration**: Complete integration with CRM activity logging system
- **Performance Metrics**: Response times and success rates logged for monitoring

### Testing

- **Unit Tests**: Core functionality covered by comprehensive unit tests
- **Integration Tests**: End-to-end testing for agency implementations
- **Mock Services**: Development and testing mock services for all agencies

### Contact Information

- **Technical Support**: cheherkallebi@gmail.com
---

**Last Updated**: August 2025  
**Version**: 1.0.0  
**Maintainer**: CRM Development Team  

**License**: Proprietary - Internal Use Only
```






-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------

# Simplified Delivery System - Key Improvements

## 🎯 Main Simplifications

### 1. **Reduced Type Complexity**
- Simplified interfaces with only essential fields
- Removed unnecessary abstractions and complex type hierarchies
- Clear separation between public interfaces and implementation details

### 2. **Streamlined Architecture**
- Single responsibility for each class
- Removed overcomplicated registry patterns
- Simplified singleton pattern implementation
- Direct database operations without additional abstraction layers

### 3. **Cleaner Agency Interface**
- Reduced to 3 core methods: `createOrder`, `trackOrder`, `testConnection`
- Removed unnecessary validation layers
- Simplified status mapping with clear enum-based approach

## 🔧 Key Changes Made

### Types (`types.ts`)
```typescript
// BEFORE: Multiple complex interfaces with deep nesting
// AFTER: Simple, focused interfaces
interface DeliveryOrder {
  customerName: string
  customerPhone: string
  governorate: string
  city: string
  address: string
  productName: string
  price: number
  notes?: string
}
```

### Base Agency (`base-agency.ts`)
- **Removed**: Complex error handling hierarchies
- **Simplified**: Validation methods with clear error messages
- **Added**: Simple HTTP helper and logging utilities
- **Focus**: Core functionality only

### Registry (`agency-registry.ts`)
- **Removed**: Complex initialization chains and dependency injection
- **Simplified**: Direct database loading and basic configuration management
- **Reduced**: From 15 methods to 8 essential methods

### Service Layer (`delivery-service.ts`)
- **Removed**: Redundant business logic abstractions
- **Simplified**: Direct database operations with Prisma
- **Focused**: Core CRUD operations for shipments
- **Cleaner**: Error handling with simple try-catch blocks

### Sync Service (`sync-service.ts`)
- **Removed**: Complex scheduling and queue management
- **Simplified**: Basic sync with rate limiting
- **Focused**: Essential sync functionality only
- **Cleaner**: Status tracking without over-engineering

## 🚀 Benefits of Simplification

### 1. **Maintainability**
- Fewer abstractions = easier to understand
- Direct code paths = easier debugging
- Simple error handling = faster troubleshooting

### 2. **Performance**
- Reduced object creation and memory overhead
- Direct database queries without ORM complexity
- Fewer method calls in critical paths

### 3. **Reliability**
- Less code = fewer bugs
- Simple logic = more predictable behavior
- Clear error messages = better debugging

### 4. **Developer Experience**
- Easier onboarding for new developers
- Clearer code structure
- Better IDE support with simpler types

## 📋 Implementation Guidelines

### Adding New Agencies
```typescript
class NewAgencyDelivery extends BaseDeliveryAgency {
  readonly id = 'new-agency'
  readonly name = 'New Agency'
  readonly supportedRegions = ['Region1', 'Region2']

  async createOrder(order: DeliveryOrder, credentials: DeliveryCredentials) {
    // Implementation
  }

  async trackOrder(trackingNumber: string, credentials: DeliveryCredentials) {
    // Implementation  
  }

  async testConnection(credentials: DeliveryCredentials) {
    // Implementation
  }

  protected mapAgencyStatus(agencyStatus: string): StandardStatus {
    // Status mapping
  }
}
```

### Usage Pattern
```typescript
// Simple and direct usage
const result = await deliveryService.createShipment(
  orderId, 
  agencyId, 
  order, 
  request, 
  userId
)

if (result.success) {
  console.log('Shipment created:', result.trackingNumber)
} else {
  console.error('Failed:', result.error)
}
```
