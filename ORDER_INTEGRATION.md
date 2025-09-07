# Shopify Orders Sync Integration Guide

## Overview
This guide will help you integrate your custom CRM with Shopify to automatically sync orders, including pending and abandoned ones created via the EasySell COD Form & Upsells app (formerly Easy Order Form). The app bypasses the standard Shopify checkout for Cash on Delivery (COD) orders, creates Draft Orders for submitted forms (which appear in Shopify's "Orders > Drafts" section), and exports both pending (submitted) and abandoned (incomplete) orders to Google Sheets. Pending orders may convert to full Orders in Shopify upon confirmation or payment, appearing in the main "Orders" sidebar.

Your existing product integration (via webhooks) ensures products are synced, so we'll leverage Shopify IDs to link products to order items correctly.

We'll cover two methods:
1. **Direct Integration with Shopify Webhooks** (Recommended): Real-time, efficient, and consistent with your product sync. Use Shopify webhooks for `draft_orders/create` (for pending/abandoned drafts) and `orders/create` (for confirmed orders).
2. **Integration via Google Sheets Scripts**: Use Google Apps Script to detect new rows in the exported sheets and POST them to your CRM's API. This is a fallback if the app's behavior doesn't fully trigger Shopify webhooks for abandoned orders.

### Best Method Recommendation
- **Direct Shopify Webhooks**: This is the best approach for real-time synchronization, scalability, and reliability. It avoids dependencies on Google Sheets and aligns with your existing product webhooks. The EasySell app likely creates Draft Orders for form submissions (pending), and incomplete forms may not create drafts but are exported as abandoned to sheets. For full coverage, combine with sheet integration for abandoned if needed. However, test webhooks first—`draft_orders/create` should capture most cases, and you can map statuses based on payload (e.g., 'open' drafts as PENDING, incomplete as ABANDONED via tags or notes).
- Use the sheet method only if webhooks miss abandoned orders or for quick setup without updating your Prisma schema.

### Linking Products to Orders
In both methods:
- Shopify payloads (webhooks or sheet exports) include line items with `product_id` and `variant_id`.
- Your CRM's `Product` model has `shopifyId` (stringified Shopify product ID).
- When creating an `OrderItem`:
  - Query your CRM's database for the `Product` where `shopifyId` matches the line item's `product_id`.
  - If no match, log an error (product not synced yet) or fallback to creating a placeholder item.
- Handle quantities, prices, and variants directly from the payload (e.g., price from line item, quantity from line item).

Update your Prisma schema to add a `shopifyId` field to the `Order` model for idempotency (prevent duplicates):
```prisma
model Order {
  // ... existing fields
  shopifyId     String?   @unique // Add this for Shopify order/draft ID
  // ...
}
```
Run `npx prisma db push` after updating.

## Prerequisites
- Next.js app with Prisma (as in your setup).
- Shopify store with admin access and the EasySell app installed.
- Existing product integration (webhooks and sync).
- Shopify Admin API access token with scopes: `read_orders`, `write_orders`, `read_draft_orders`, `write_draft_orders`, `read_checkouts`.
- For sheet method: Access to the Google Sheet exported by EasySell (tables: "orders" for pending, "easycell_abondandes" for abandoned).
- Environment variables (add to `.env.local`):
  ```
  SHOPIFY_STORE=your-store-name
  SHOPIFY_ACCESS_TOKEN=shpat_xxxxxxxxxxxxx
  SHOPIFY_WEBHOOK_SECRET=your-webhook-secret  # Same as for products
  ```

## Method 1: Direct Integration with Shopify Webhooks (Recommended)

### Step 1: Set Up Webhooks in Shopify
1. In Shopify Admin: `Settings > Notifications > Webhooks`.
2. Create these webhooks (Format: JSON):
   - **Event**: `Draft order creation` → URL: `https://yourdomain.com/api/webhooks/shopify/orders`
     - Captures new form submissions (likely as Draft Orders). Map to `PENDING` or `ABANDONED` based on status ('open' = PENDING; use tags/notes for ABANDONED if incomplete).
   - **Event**: `Draft order update` → URL: Same as above.
     - For status changes (e.g., invoice sent, completed).
   - **Event**: `Order creation` → URL: Same as above.
     - For when drafts convert to full orders (confirmed/pending payment).
   - **Event**: `Order update` → URL: Same as above.
     - For updates like status changes.

### Step 2: Create Webhook Handler
Create `app/api/webhooks/shopify/orders/route.ts` (similar to your products webhook):

```typescript
import { type NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import crypto from 'crypto';

// Verify webhook signature (same as products)
function verifyWebhook(body: string, signature: string, secret: string): boolean {
  const expectedSignature = crypto.createHmac('sha256', secret).update(body, 'utf8').digest('base64');
  return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature));
}

// Transform Shopify order/draft to CRM Order
function transformShopifyOrder(shopifyData: any, isDraft: boolean) {
  const lineItems = shopifyData.line_items || [];
  const customer = shopifyData.customer || shopifyData.billing_address || {};
  const shippingAddress = shopifyData.shipping_address || {};

  // Map status: Customize based on your flow
  let status = 'PENDING';
  if (isDraft) {
    if (shopifyData.status === 'open') status = 'PENDING'; // Submitted but pending confirmation
    // If tagged as abandoned or incomplete (check app-specific tags), set 'ABANDONED'
    if (shopifyData.tags?.includes('abandoned')) status = 'ABANDONED';
  } else if (shopifyData.financial_status === 'pending') {
    status = 'PENDING';
  }

  return {
    shopifyId: shopifyData.id.toString(),
    customerName: `${customer.first_name || ''} ${customer.last_name || ''}`.trim() || 'Unknown',
    customerPhone1: customer.phone || shopifyData.phone || '',
    customerPhone2: null, // Map if available
    customerEmail: customer.email || shopifyData.email || null,
    customerAddress: `${shippingAddress.address1 || ''} ${shippingAddress.address2 || ''}`.trim(),
    customerCity: shippingAddress.city || '',
    status,
    total: parseFloat(shopifyData.total_price || '0'),
    deliveryPrice: parseFloat(shopifyData.shipping_lines?.[0]?.price || '0'),
    notes: shopifyData.note || '',
    items: lineItems.map((item: any) => ({
      productShopifyId: item.product_id?.toString() || null, // For linking
      quantity: item.quantity,
      price: parseFloat(item.price || '0'),
    })),
  };
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const signature = request.headers.get('x-shopify-hmac-sha256');
    const topic = request.headers.get('x-shopify-topic');
    const webhookSecret = process.env.SHOPIFY_WEBHOOK_SECRET;

    if (!signature || !webhookSecret || !verifyWebhook(body, signature, webhookSecret)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const shopifyData = JSON.parse(body);
    const isDraft = topic.includes('draft_orders');
    const transformed = transformShopifyOrder(shopifyData, isDraft);

    // Check for duplicate by shopifyId
    const existingOrder = await prisma.order.findUnique({ where: { shopifyId: transformed.shopifyId } });
    if (existingOrder) {
      // Update existing order (simplified; expand as needed)
      await prisma.order.update({
        where: { shopifyId: transformed.shopifyId },
        data: {
          status: transformed.status,
          total: transformed.total,
          // Update other fields...
        },
      });
      console.log(`✅ Order updated: ${transformed.shopifyId}`);
      return NextResponse.json({ success: true });
    }

    // Create new order in transaction
    const newOrder = await prisma.$transaction(async (tx) => {
      const order = await tx.order.create({
        data: {
          shopifyId: transformed.shopifyId,
          customerName: transformed.customerName,
          customerPhone1: transformed.customerPhone1,
          customerPhone2: transformed.customerPhone2,
          customerEmail: transformed.customerEmail,
          customerAddress: transformed.customerAddress,
          customerCity: transformed.customerCity,
          status: transformed.status,
          total: transformed.total,
          deliveryPrice: transformed.deliveryPrice,
          notes: transformed.notes,
          // confirmedById: 'system', // Or map to a system user
        },
      });

      // Create items and link products
      for (const item of transformed.items) {
        if (item.productShopifyId) {
          const product = await tx.product.findUnique({ where: { shopifyId: item.productShopifyId } });
          if (product) {
            await tx.orderItem.create({
              data: {
                orderId: order.id,
                productId: product.id,
                quantity: item.quantity,
                price: item.price,
              },
            });
          } else {
            // Log missing product
            console.warn(`Product not found for shopifyId: ${item.productShopifyId}`);
          }
        }
      }

      // Initial status history
      await tx.orderStatusHistory.create({
        data: {
          orderId: order.id,
          status: order.status,
          notes: "Order synced from Shopify",
          userId: "system", // System user
        },
      });

      // Log activity
      await tx.activity.create({
        data: {
          type: "ORDER_CREATED",
          description: `Order ${order.id} synced from Shopify (${isDraft ? 'draft' : 'order'})`,
          userId: "system",
          metadata: { shopifyId: transformed.shopifyId, source: 'shopify_webhook', topic },
          ipAddress: "shopify",
          userAgent: "shopify-webhook",
        },
      });

      return order;
    });

    console.log(`✅ Order created: ${newOrder.id}`);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("❌ Order webhook error:", error);
    return NextResponse.json({ error: "Webhook processing failed" }, { status: 500 });
  }
}
```

### Step 3: Initial Bulk Sync (Optional)
Create an endpoint like `app/api/orders/sync/route.ts` (similar to products sync) to fetch existing orders/drafts via Shopify GraphQL API and create them in your CRM. Use batches to respect rate limits.

### Step 4: Testing
- Submit a form in your store via EasySell.
- Check if webhook fires and order appears in CRM with correct status and linked products.
- Test updates and conversions from draft to order.

## Method 2: Integration via Google Sheets Scripts

### Step 1: Set Up Google Apps Script
1. Open your Google Sheet (with "orders" for pending, "easycell_abondandes" for abandoned).
2. Go to `Extensions > Apps Script`.
3. Create a script to detect new rows (use `onEdit` trigger) and POST to your CRM's `/api/orders` endpoint.

Example script:
```javascript
function onEdit(e) {
  const sheet = e.source.getActiveSheet();
  const sheetName = sheet.getName();
  if (sheetName !== 'orders' && sheetName !== 'easycell_abondandes') return;

  const row = e.range.getRow();
  if (row < 2) return; // Skip header

  const data = sheet.getRange(row, 1, 1, sheet.getLastColumn()).getValues()[0];
  // Map columns based on your sheet (e.g., data[0] = Order ID, data[1] = Product Name & Variant, etc.)
  const orderData = {
    customerName: data[2] || 'Unknown', // First Name
    customerPhone1: data[7] || '', // Phone
    customerAddress: data[8] || '', // Address 1
    customerCity: '', // Map if available
    status: sheetName === 'orders' ? 'PENDING' : 'ABANDONED',
    total: parseFloat(data[6]) || 0, // Total Price
    items: [{ // Parse products; assume single item for simplicity
      productName: data[1], // Product Name & Variant (use to query CRM Product by name or shopifyId if exported)
      quantity: 1, // Assume or parse
      price: parseFloat(data[6]),
    }],
    // Add other fields
  };

  // Link products: Query your CRM API for product ID by name (or export shopifyId to sheet if possible)
  // For simplicity, assume you POST with productName and handle linking in CRM API.

  const url = 'https://yourdomain.com/api/orders'; // Your POST endpoint
  const options = {
    method: 'post',
    contentType: 'application/json',
    headers: { Authorization: 'Bearer YOUR_API_TOKEN' }, // Secure with token
    payload: JSON.stringify(orderData),
  };

  UrlFetchApp.fetch(url, options);
}
```
4. Set up trigger: `Edit > Current project's triggers > Add Trigger` (Event: On edit).

### Step 2: Update CRM API to Handle Sheet Data
In your `app/api/orders/route.ts` POST handler:
- Add logic to query products by name (if shopifyId not in sheet) or enhance sheet export to include product shopifyId.
- Set `shopifyId` if available in sheet; otherwise, generate or skip for duplicates.

### Step 3: Testing
- Add a test row to the sheet.
- Verify order creates in CRM with correct status and product links.

## Production Considerations
- **Idempotency**: Use `shopifyId` or a unique sheet ID to avoid duplicates.
- **Error Handling**: Log failures in Activities table; add retries.
- **Rate Limits**: Respect Shopify/Google limits.
- **Security**: Use API tokens for sheet-to-CRM POSTs; validate webhooks.
- **Monitoring**: Track syncs in Activities; alert on failures.

## Troubleshooting
- **Webhooks not firing**: Check Shopify logs; ensure URL is public.
- **Missing abandoned**: If not in drafts, use sheet method.
- **Product linking fails**: Ensure products are synced; add fallback logging.
- **Local Testing**: Use ngrok for webhooks.

After setup, your CRM will auto-create orders from Shopify/EasySell, with products linked via shopifyId!