# CRM Integrations Guide

This guide provides comprehensive instructions for integrating external systems with our CRM, including Google Sheets (Easy Sell COD forms) and Shopify. These integrations enable automatic order synchronization and real-time data updates.

## Table of Contents

1. [Google Sheets Integration](#google-sheets-integration)
2. [Shopify Integration](#shopify-integration)
3. [Security Considerations](#security-considerations)
4. [Troubleshooting](#troubleshooting)
5. [Monitoring & Maintenance](#monitoring--maintenance)

---

## Google Sheets Integration

### Overview

This integration allows automatic synchronization of orders from Google Sheets (Easy Sell COD forms) to your CRM system. When a new row is added to your Google Sheet, it will automatically create an order in the CRM.

### Prerequisites

- Google account with access to Google Sheets
- Google Apps Script access
- CRM system with API access
- Basic understanding of JavaScript (optional but helpful)

### Step 1: Prepare Your Google Sheet

1. **Open your Google Sheet** containing the Easy Sell COD form responses
2. **Ensure your sheet has the following columns** (adjust column names as needed):
   - Customer Name
   - Customer Email
   - Customer Phone
   - Product Name
   - Quantity
   - Price
   - Shipping Address
   - Notes (optional)

3. **Add a status column** to track sync status:
   - Add a new column called "CRM Status"
   - This will help track which orders have been synced

### Step 2: Set Up Google Apps Script

1. **Open Google Apps Script**:
   - Go to [script.google.com](https://script.google.com)
   - Click "New Project"
   - Name your project "CRM Order Sync"

2. **Replace the default code** with the following script:

\`\`\`javascript
// CRM Integration Configuration
const CRM_CONFIG = {
  baseUrl: 'https://your-crm-domain.com', // Replace with your CRM URL
  apiKey: 'your-api-key', // Replace with your API key
  endpoint: '/api/orders',
  authHeader: 'Bearer your-jwt-token' // Replace with your auth token
};

// Google Sheet Configuration
const SHEET_CONFIG = {
  sheetName: 'Form Responses 1', // Adjust sheet name as needed
  startRow: 2, // Data starts from row 2 (assuming row 1 has headers)
  columns: {
    customerName: 1,    // Column A
    customerEmail: 2,   // Column B
    customerPhone: 3,   // Column C
    productName: 4,     // Column D
    quantity: 5,        // Column E
    price: 6,           // Column F
    shippingAddress: 7, // Column G
    notes: 8,           // Column H
    crmStatus: 9        // Column I (for tracking sync status)
  }
};

/**
 * Main function to sync new orders to CRM
 */
function syncOrdersToCRM() {
  try {
    console.log('Starting CRM sync process...');
    
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_CONFIG.sheetName);
    if (!sheet) {
      throw new Error(`Sheet "${SHEET_CONFIG.sheetName}" not found`);
    }
    
    const lastRow = sheet.getLastRow();
    const dataRange = sheet.getRange(SHEET_CONFIG.startRow, 1, lastRow - SHEET_CONFIG.startRow + 1, Object.keys(SHEET_CONFIG.columns).length);
    const data = dataRange.getValues();
    
    let syncedCount = 0;
    let errorCount = 0;
    
    for (let i = 0; i < data.length; i++) {
      const rowIndex = i + SHEET_CONFIG.startRow;
      const row = data[i];
      
      // Skip if already synced
      const crmStatus = row[SHEET_CONFIG.columns.crmStatus - 1];
      if (crmStatus === 'SYNCED' || crmStatus === 'ERROR') {
        continue;
      }
      
      try {
        const orderData = parseRowToOrder(row);
        const result = createOrderInCRM(orderData);
        
        if (result.success) {
          // Mark as synced
          sheet.getRange(rowIndex, SHEET_CONFIG.columns.crmStatus).setValue('SYNCED');
          sheet.getRange(rowIndex, SHEET_CONFIG.columns.crmStatus + 1).setValue(result.orderId);
          syncedCount++;
          console.log(`Order synced successfully: Row ${rowIndex}`);
        } else {
          throw new Error(result.error || 'Unknown error');
        }
        
      } catch (error) {
        console.error(`Error syncing row ${rowIndex}:`, error);
        sheet.getRange(rowIndex, SHEET_CONFIG.columns.crmStatus).setValue('ERROR');
        sheet.getRange(rowIndex, SHEET_CONFIG.columns.crmStatus + 1).setValue(error.message);
        errorCount++;
      }
      
      // Add delay to avoid rate limiting
      Utilities.sleep(1000);
    }
    
    console.log(`Sync completed: ${syncedCount} orders synced, ${errorCount} errors`);
    
    // Send notification email if there were errors
    if (errorCount > 0) {
      sendErrorNotification(errorCount);
    }
    
  } catch (error) {
    console.error('Fatal error in sync process:', error);
    sendErrorNotification(0, error.message);
  }
}

/**
 * Parse a spreadsheet row into order data
 */
function parseRowToOrder(row) {
  const customerName = row[SHEET_CONFIG.columns.customerName - 1];
  const customerEmail = row[SHEET_CONFIG.columns.customerEmail - 1];
  const customerPhone = row[SHEET_CONFIG.columns.customerPhone - 1];
  const productName = row[SHEET_CONFIG.columns.productName - 1];
  const quantity = parseInt(row[SHEET_CONFIG.columns.quantity - 1]) || 1;
  const price = parseFloat(row[SHEET_CONFIG.columns.price - 1]) || 0;
  const shippingAddress = row[SHEET_CONFIG.columns.shippingAddress - 1];
  const notes = row[SHEET_CONFIG.columns.notes - 1] || '';
  
  // Validate required fields
  if (!customerName || !customerEmail || !productName) {
    throw new Error('Missing required fields: Customer Name, Email, or Product Name');
  }
  
  return {
    customerName: customerName.toString().trim(),
    customerEmail: customerEmail.toString().trim(),
    customerPhone: customerPhone ? customerPhone.toString().trim() : '',
    items: [{
      productName: productName.toString().trim(),
      quantity: quantity,
      price: price,
      total: quantity * price
    }],
    totalAmount: quantity * price,
    shippingAddress: shippingAddress ? shippingAddress.toString().trim() : '',
    notes: notes.toString().trim(),
    status: 'PENDING',
    source: 'Google Sheets'
  };
}

/**
 * Create order in CRM via API
 */
function createOrderInCRM(orderData) {
  try {
    const response = UrlFetchApp.fetch(`${CRM_CONFIG.baseUrl}${CRM_CONFIG.endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': CRM_CONFIG.authHeader
      },
      payload: JSON.stringify(orderData)
    });
    
    const responseData = JSON.parse(response.getContentText());
    
    if (response.getResponseCode() === 200 || response.getResponseCode() === 201) {
      return {
        success: true,
        orderId: responseData.order?.id || 'Unknown',
        data: responseData
      };
    } else {
      return {
        success: false,
        error: responseData.error || `HTTP ${response.getResponseCode()}`
      };
    }
    
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Send error notification email
 */
function sendErrorNotification(errorCount, fatalError = null) {
  const email = Session.getActiveUser().getEmail();
  const subject = 'CRM Sync Error Notification';
  
  let body = 'CRM Order Sync encountered errors:\n\n';
  
  if (fatalError) {
    body += `Fatal Error: ${fatalError}\n\n`;
  }
  
  if (errorCount > 0) {
    body += `${errorCount} orders failed to sync. Please check the Google Sheet for details.\n\n`;
  }
  
  body += `Timestamp: ${new Date().toISOString()}\n`;
  body += `Sheet: ${SpreadsheetApp.getActiveSpreadsheet().getName()}`;
  
  GmailApp.sendEmail(email, subject, body);
}

/**
 * Set up automatic triggers
 */
function setupTriggers() {
  // Delete existing triggers
  const triggers = ScriptApp.getProjectTriggers();
  triggers.forEach(trigger => ScriptApp.deleteTrigger(trigger));
  
  // Create new triggers
  
  // 1. Time-based trigger (every 5 minutes)
  ScriptApp.newTrigger('syncOrdersToCRM')
    .timeBased()
    .everyMinutes(5)
    .create();
  
  // 2. Form submit trigger (if using Google Forms)
  const sheet = SpreadsheetApp.getActiveSpreadsheet();
  ScriptApp.newTrigger('onFormSubmit')
    .forSpreadsheet(sheet)
    .onFormSubmit()
    .create();
  
  console.log('Triggers set up successfully');
}

/**
 * Handle form submit events
 */
function onFormSubmit(e) {
  console.log('Form submitted, triggering sync...');
  
  // Wait a moment for the data to be written to the sheet
  Utilities.sleep(2000);
  
  // Sync only the latest row
  syncLatestOrder();
}

/**
 * Sync only the latest order (for form submit trigger)
 */
function syncLatestOrder() {
  try {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_CONFIG.sheetName);
    const lastRow = sheet.getLastRow();
    
    if (lastRow < SHEET_CONFIG.startRow) {
      console.log('No data to sync');
      return;
    }
    
    const row = sheet.getRange(lastRow, 1, 1, Object.keys(SHEET_CONFIG.columns).length).getValues()[0];
    const crmStatus = row[SHEET_CONFIG.columns.crmStatus - 1];
    
    // Skip if already synced
    if (crmStatus === 'SYNCED' || crmStatus === 'ERROR') {
      console.log('Latest order already processed');
      return;
    }
    
    const orderData = parseRowToOrder(row);
    const result = createOrderInCRM(orderData);
    
    if (result.success) {
      sheet.getRange(lastRow, SHEET_CONFIG.columns.crmStatus).setValue('SYNCED');
      sheet.getRange(lastRow, SHEET_CONFIG.columns.crmStatus + 1).setValue(result.orderId);
      console.log('Latest order synced successfully');
    } else {
      sheet.getRange(lastRow, SHEET_CONFIG.columns.crmStatus).setValue('ERROR');
      sheet.getRange(lastRow, SHEET_CONFIG.columns.crmStatus + 1).setValue(result.error);
      console.error('Error syncing latest order:', result.error);
    }
    
  } catch (error) {
    console.error('Error in syncLatestOrder:', error);
  }
}

/**
 * Test function to verify configuration
 */
function testConfiguration() {
  console.log('Testing CRM connection...');
  
  const testOrder = {
    customerName: 'Test Customer',
    customerEmail: 'test@example.com',
    customerPhone: '+1234567890',
    items: [{
      productName: 'Test Product',
      quantity: 1,
      price: 10.00,
      total: 10.00
    }],
    totalAmount: 10.00,
    shippingAddress: 'Test Address',
    notes: 'Test order from Google Sheets integration',
    status: 'PENDING',
    source: 'Google Sheets Test'
  };
  
  const result = createOrderInCRM(testOrder);
  
  if (result.success) {
    console.log('✅ Test successful! CRM connection is working.');
    console.log('Test Order ID:', result.orderId);
  } else {
    console.error('❌ Test failed:', result.error);
  }
}
\`\`\`

### Step 3: Configure the Script

1. **Update Configuration Variables**:
   - Replace `your-crm-domain.com` with your actual CRM URL
   - Replace `your-api-key` and `your-jwt-token` with your actual credentials
   - Adjust column mappings in `SHEET_CONFIG` to match your sheet structure

2. **Test the Configuration**:
   - Run the `testConfiguration()` function
   - Check the logs to ensure the connection works

### Step 4: Set Up Triggers

1. **Run the Setup Function**:
   - In the Apps Script editor, run `setupTriggers()`
   - This creates automatic triggers for syncing

2. **Grant Permissions**:
   - Google will ask for permissions to access your sheets and send emails
   - Review and accept the required permissions

### Step 5: Test the Integration

1. **Add a test row** to your Google Sheet
2. **Wait 5 minutes** or run `syncOrdersToCRM()` manually
3. **Check your CRM** to verify the order was created
4. **Verify the status** in the Google Sheet shows "SYNCED"

---

## Shopify Integration

### Overview

This integration connects your Shopify store directly to the CRM using webhooks for real-time order synchronization. When a new order is placed in Shopify, it's automatically created in your CRM.

### Prerequisites

- Shopify store with admin access
- CRM system with webhook support
- Basic understanding of webhooks and APIs

### Method 1: Webhook Integration (Recommended)

#### Step 1: Set Up Webhook Endpoint in CRM

First, create a webhook endpoint in your CRM to receive Shopify orders:

\`\`\`typescript
// app/api/webhooks/shopify/orders/route.ts
import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import prisma from '@/lib/prisma'
import { logSystemActivity } from '@/lib/activity-logger'

const SHOPIFY_WEBHOOK_SECRET = process.env.SHOPIFY_WEBHOOK_SECRET!

export async function POST(request: NextRequest) {
  try {
    console.log('🛍️ Shopify webhook received')
    
    // Verify webhook authenticity
    const body = await request.text()
    const hmacHeader = request.headers.get('x-shopify-hmac-sha256')
    
    if (!verifyShopifyWebhook(body, hmacHeader)) {
      console.error('❌ Invalid Shopify webhook signature')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const orderData = JSON.parse(body)
    console.log('📦 Processing Shopify order:', orderData.order_number)
    
    // Transform Shopify order to CRM format
    const crmOrder = transformShopifyOrder(orderData)
    
    // Create order in CRM
    const newOrder = await prisma.createOrder(crmOrder)
    
    // Log activity
    await logSystemActivity(
      'SHOPIFY_ORDER_IMPORTED',
      `Order ${orderData.order_number} imported from Shopify`,
      request,
      {
        shopifyOrderId: orderData.id,
        orderNumber: orderData.order_number,
        crmOrderId: newOrder.id
      }
    )
    
    console.log('✅ Shopify order imported successfully:', newOrder.id)
    
    return NextResponse.json({ 
      success: true, 
      orderId: newOrder.id,
      message: 'Order imported successfully'
    })
    
  } catch (error) {
    console.error('❌ Shopify webhook error:', error)
    
    // Log error
    try {
      await logSystemActivity(
        'SHOPIFY_WEBHOOK_ERROR',
        `Shopify webhook processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        request,
        { error: error instanceof Error ? error.message : String(error) }
      )
    } catch (logError) {
      console.error('Failed to log webhook error:', logError)
    }
    
    return NextResponse.json({ 
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

/**
 * Verify Shopify webhook signature
 */
function verifyShopifyWebhook(body: string, hmacHeader: string | null): boolean {
  if (!hmacHeader || !SHOPIFY_WEBHOOK_SECRET) {
    return false
  }
  
  const calculatedHmac = crypto
    .createHmac('sha256', SHOPIFY_WEBHOOK_SECRET)
    .update(body, 'utf8')
    .digest('base64')
  
  return crypto.timingSafeEqual(
    Buffer.from(calculatedHmac),
    Buffer.from(hmacHeader)
  )
}

/**
 * Transform Shopify order data to CRM format
 */
function transformShopifyOrder(shopifyOrder: any) {
  const customer = shopifyOrder.customer || {}
  const shippingAddress = shopifyOrder.shipping_address || {}
  const billingAddress = shopifyOrder.billing_address || {}
  
  // Use shipping address, fallback to billing address
  const address = shippingAddress.address1 || billingAddress.address1 || ''
  const city = shippingAddress.city || billingAddress.city || ''
  const province = shippingAddress.province || billingAddress.province || ''
  const zip = shippingAddress.zip || billingAddress.zip || ''
  const country = shippingAddress.country || billingAddress.country || ''
  
  const fullAddress = [address, city, province, zip, country]
    .filter(Boolean)
    .join(', ')
  
  // Transform line items
  const items = shopifyOrder.line_items.map((item: any) => ({
    id: `shopify-${item.id}`,
    productName: item.name,
    quantity: item.quantity,
    price: parseFloat(item.price),
    total: parseFloat(item.price) * item.quantity
  }))
  
  // Map Shopify status to CRM status
  const statusMapping: Record<string, string> = {
    'pending': 'PENDING',
    'authorized': 'PENDING',
    'partially_paid': 'PROCESSING',
    'paid': 'PROCESSING',
    'partially_refunded': 'PROCESSING',
    'refunded': 'CANCELLED',
    'voided': 'CANCELLED'
  }
  
  return {
    customerName: `${customer.first_name || ''} ${customer.last_name || ''}`.trim() || 'Shopify Customer',
    customerEmail: customer.email || shopifyOrder.email || '',
    customerPhone: customer.phone || shippingAddress.phone || billingAddress.phone || '',
    items,
    status: statusMapping[shopifyOrder.financial_status] || 'PENDING',
    totalAmount: parseFloat(shopifyOrder.total_price),
    shippingAddress: fullAddress,
    notes: `Shopify Order #${shopifyOrder.order_number}\nPayment Status: ${shopifyOrder.financial_status}\nFulfillment Status: ${shopifyOrder.fulfillment_status || 'unfulfilled'}`,
    createdBy: 'shopify-webhook',
    metadata: {
      shopifyOrderId: shopifyOrder.id,
      orderNumber: shopifyOrder.order_number,
      financialStatus: shopifyOrder.financial_status,
      fulfillmentStatus: shopifyOrder.fulfillment_status,
      tags: shopifyOrder.tags,
      source: 'Shopify'
    }
  }
}
\`\`\`

#### Step 2: Configure Shopify Webhook

1. **Access Shopify Admin**:
   - Go to your Shopify admin panel
   - Navigate to Settings → Notifications

2. **Create Webhook**:
   - Scroll down to "Webhooks" section
   - Click "Create webhook"
   - Set the following:
     - **Event**: Order creation
     - **Format**: JSON
     - **URL**: `https://your-crm-domain.com/api/webhooks/shopify/orders`
     - **API Version**: Latest (2023-10 or newer)

3. **Set Webhook Secret**:
   - In your CRM environment variables, add:
     \`\`\`env
     SHOPIFY_WEBHOOK_SECRET=your-webhook-secret-key
     \`\`\`

#### Step 3: Test the Integration

1. **Place a test order** in your Shopify store
2. **Check your CRM** to verify the order appears
3. **Review webhook logs** in Shopify admin
4. **Check CRM activity logs** for import confirmation

### Method 2: API Polling Integration

For stores that prefer scheduled synchronization over real-time webhooks:

\`\`\`typescript
// lib/integrations/shopify-sync.ts
import { ShopifyApi } from '@shopify/shopify-api'

export class ShopifySync {
  private api: ShopifyApi
  private lastSyncTime: Date
  
  constructor(shopDomain: string, accessToken: string) {
    this.api = new ShopifyApi({
      shop: shopDomain,
      accessToken: accessToken
    })
    this.lastSyncTime = new Date(Date.now() - 24 * 60 * 60 * 1000) // 24 hours ago
  }
  
  async syncOrders(): Promise<void> {
    try {
      console.log('🔄 Starting Shopify order sync...')
      
      const orders = await this.api.rest.Order.all({
        session: this.session,
        created_at_min: this.lastSyncTime.toISOString(),
        status: 'any',
        limit: 250
      })
      
      console.log(`📦 Found ${orders.data.length} orders to sync`)
      
      for (const order of orders.data) {
        await this.processOrder(order)
      }
      
      this.lastSyncTime = new Date()
      console.log('✅ Shopify sync completed')
      
    } catch (error) {
      console.error('❌ Shopify sync error:', error)
      throw error
    }
  }
  
  private async processOrder(shopifyOrder: any): Promise<void> {
    // Check if order already exists
    const existingOrder = await prisma.findOrderByMetadata('shopifyOrderId', shopifyOrder.id)
    
    if (existingOrder) {
      console.log(`Order ${shopifyOrder.order_number} already exists, skipping`)
      return
    }
    
    // Transform and create order
    const crmOrder = this.transformOrder(shopifyOrder)
    await prisma.createOrder(crmOrder)
    
    console.log(`✅ Order ${shopifyOrder.order_number} synced`)
  }
}

// Usage in a scheduled job
export async function runShopifySync() {
  const sync = new ShopifySync(
    process.env.SHOPIFY_SHOP_DOMAIN!,
    process.env.SHOPIFY_ACCESS_TOKEN!
  )
  
  await sync.syncOrders()
}
\`\`\`

### Method 3: Shopify App Integration

For advanced features and better integration:

1. **Create Shopify App**:
   - Go to Shopify Partners dashboard
   - Create a new app
   - Set up OAuth flow

2. **Implement OAuth Flow**:
\`\`\`typescript
// app/api/auth/shopify/route.ts
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const shop = searchParams.get('shop')
  const code = searchParams.get('code')
  
  if (!shop || !code) {
    return NextResponse.json({ error: 'Missing parameters' }, { status: 400 })
  }
  
  try {
    // Exchange code for access token
    const tokenResponse = await fetch(`https://${shop}/admin/oauth/access_token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: process.env.SHOPIFY_API_KEY,
        client_secret: process.env.SHOPIFY_API_SECRET,
        code
      })
    })
    
    const { access_token } = await tokenResponse.json()
    
    // Store access token securely
    await storeShopifyCredentials(shop, access_token)
    
    return NextResponse.redirect('/dashboard/integrations?shopify=connected')
    
  } catch (error) {
    console.error('Shopify OAuth error:', error)
    return NextResponse.json({ error: 'OAuth failed' }, { status: 500 })
  }
}
\`\`\`

---

## Security Considerations

### API Security

1. **Use HTTPS**: Always use secure connections
2. **Validate Webhooks**: Verify webhook signatures
3. **Rate Limiting**: Implement rate limiting on endpoints
4. **Authentication**: Use proper authentication tokens
5. **Input Validation**: Validate all incoming data

### Data Protection

1. **Encrypt Credentials**: Store API keys and tokens securely
2. **Audit Logging**: Log all integration activities
3. **Access Control**: Restrict integration access to authorized users
4. **Data Minimization**: Only sync necessary data

### Environment Variables

\`\`\`env
# Google Sheets Integration
GOOGLE_SHEETS_API_KEY=your-google-api-key
GOOGLE_SERVICE_ACCOUNT_EMAIL=your-service-account@project.iam.gserviceaccount.com

# Shopify Integration
SHOPIFY_API_KEY=your-shopify-api-key
SHOPIFY_API_SECRET=your-shopify-api-secret
SHOPIFY_WEBHOOK_SECRET=your-webhook-secret
SHOPIFY_ACCESS_TOKEN=your-access-token
SHOPIFY_SHOP_DOMAIN=your-shop.myshopify.com

# CRM API
CRM_API_BASE_URL=https://your-crm-domain.com
CRM_API_KEY=your-crm-api-key
\`\`\`

---

## Troubleshooting

### Common Issues

#### Google Sheets Integration

**Issue**: Script execution fails with permission errors
- **Solution**: Re-authorize the script and grant all required permissions

**Issue**: Orders not syncing automatically
- **Solution**: Check trigger configuration and ensure triggers are active

**Issue**: Duplicate orders being created
- **Solution**: Verify the CRM Status column is being updated correctly

#### Shopify Integration

**Issue**: Webhook not receiving data
- **Solution**: 
  - Verify webhook URL is accessible
  - Check Shopify webhook logs
  - Ensure webhook secret matches

**Issue**: Order data missing or incorrect
- **Solution**: Review the data transformation logic and field mappings

**Issue**: Authentication failures
- **Solution**: Verify API credentials and permissions

### Debug Mode

Enable detailed logging by setting:
\`\`\`env
DEBUG_INTEGRATIONS=true
\`\`\`

### Testing Endpoints

Create test endpoints for debugging:

\`\`\`typescript
// app/api/test/integration/route.ts
export async function POST(request: NextRequest) {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Not available in production' }, { status: 403 })
  }
  
  const body = await request.json()
  console.log('Test integration data:', body)
  
  // Process test data
  return NextResponse.json({ success: true, received: body })
}
\`\`\`

---

## Monitoring & Maintenance

### Health Checks

Implement health check endpoints:

\`\`\`typescript
// app/api/health/integrations/route.ts
export async function GET() {
  const health = {
    shopify: await checkShopifyConnection(),
    googleSheets: await checkGoogleSheetsAccess(),
    database: await checkDatabaseConnection(),
    timestamp: new Date().toISOString()
  }
  
  return NextResponse.json(health)
}
\`\`\`

### Monitoring Dashboard

Create an admin dashboard to monitor integrations:

1. **Integration Status**: Show active/inactive integrations
2. **Sync Statistics**: Display sync success rates and error counts
3. **Recent Activity**: Show recent integration activities
4. **Error Logs**: Display integration errors and warnings

### Maintenance Tasks

1. **Regular Testing**: Test integrations monthly
2. **Credential Rotation**: Update API keys and tokens regularly
3. **Log Cleanup**: Archive old integration logs
4. **Performance Monitoring**: Monitor sync performance and optimize as needed

### Alerts and Notifications

Set up alerts for:
- Integration failures
- High error rates
- Sync delays
- Authentication issues

---

## Support and Resources

### Documentation Links
- [Google Apps Script Documentation](https://developers.google.com/apps-script)
- [Shopify Webhook Documentation](https://shopify.dev/docs/admin-api/rest/reference/events/webhook)
- [Shopify API Documentation](https://shopify.dev/docs/admin-api)

### Contact Information
- **Technical Support**: tech-support@your-company.com
- **Integration Issues**: integrations@your-company.com

---

**Last Updated**: January 2025  
**Version**: 1.0.0  
**Maintainer**: CRM Development Team
