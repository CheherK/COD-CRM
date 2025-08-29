# Shopify Product Sync Integration Guide

## Overview
This guide will help you integrate your custom CRM with Shopify to automatically sync products using both initial bulk sync and real-time webhooks.

## Prerequisites
- Next.js application with Prisma
- Shopify store with admin access
- The provided API routes and product page

## Step 1: Create Shopify Private App

1. **Go to your Shopify Admin**
   - Navigate to `Settings` > `Apps and sales channels`
   - Click `Develop apps` > `Create an app`

2. **Configure App Permissions**
   - Go to `Configuration` tab
   - Under `Admin API access scopes`, enable:
     - `read_products`
     - `write_products` (if you want to update products from CRM)

3. **Install the App**
   - Click `Install app`
   - Copy the `Admin API access token`

## Step 2: Environment Variables

Add these to your `.env.local` file:

```env
# Shopify Configuration
SHOPIFY_STORE=your-store-name  # Just the store name, not the full URL
SHOPIFY_ACCESS_TOKEN=shpat_xxxxxxxxxxxxx  # Admin API access token
SHOPIFY_WEBHOOK_SECRET=your-webhook-secret  # Generate a random secret
```

## Step 3: Set Up Webhooks

1. **In Shopify Admin**, go to `Settings` > `Notifications`
2. **Scroll down to Webhooks** and add these endpoints:

### Product Create Webhook
- **Event**: `Product creation`
- **URL**: `https://yourdomain.com/api/webhooks/shopify/products`
- **Format**: `JSON`

### Product Update Webhook
- **Event**: `Product update`
- **URL**: `https://yourdomain.com/api/webhooks/shopify/products`
- **Format**: `JSON`

### Product Delete Webhook
- **Event**: `Product deletion`
- **URL**: `https://yourdomain.com/api/webhooks/shopify/products`
- **Format**: `JSON`

## Step 4: File Structure

Create these files in your Next.js project:

```
app/
├── api/
│   ├── products/
│   │   ├── route.ts (your existing file)
│   │   └── sync/
│   │       └── route.ts (new sync endpoint)
│   └── webhooks/
│       └── shopify/
│           └── products/
│               └── route.ts (webhook handler)
├── products/
│   └── page.tsx (products page)
```

## Step 5: Update Prisma Schema (if needed)

Make sure your Product model has these fields:

```prisma
model Product {
  id          String @id @default(cuid())
  shopifyId   String @unique  // Shopify product ID for sync
  name        String
  nameEn      String
  nameFr      String
  price       Decimal
  imageUrl    String?
  isActive    Boolean @default(true)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  orderItems  OrderItem[]

  @@map("products")
}

model Activity {
  id          String   @id @default(cuid())
  type        String
  description String
  userId      String
  metadata    Json?
  ipAddress   String
  userAgent   String
  createdAt   DateTime @default(now())

  @@map("activities")
}
```

## Step 6: Initial Setup and Testing

1. **Run Database Migration**
   ```bash
   npx prisma db push
   ```

2. **Test the Sync Endpoint**
   - Go to your products page: `https://yourdomain.com/products`
   - Click "Sync from Shopify" button
   - Check console logs for sync progress

3. **Test Webhooks**
   - Create/update a product in Shopify admin
   - Check your database to see if it synced automatically
   - Check activity logs for webhook events

## Step 7: Production Considerations

### Rate Limiting
- Shopify has a rate limit of 2 calls per second
- The sync includes delays to respect these limits

### Error Handling
- Failed syncs are logged in the Activity table
- Webhook failures should be monitored

### Monitoring
- Set up logging for webhook events
- Monitor sync completion and errors
- Consider adding retry logic for failed webhooks

## Step 8: Advanced Features (Optional)

### Scheduled Sync
Create a cron job to sync products periodically:

```typescript
// app/api/cron/sync-products/route.ts
export async function GET(request: NextRequest) {
  // Verify cron secret
  if (request.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Trigger sync
  // ... sync logic
}
```

### Multi-language Support
Extract product translations from Shopify metafields:

```typescript
function transformShopifyProduct(shopifyProduct: any) {
  // Extract translations from metafields
  const nameEn = shopifyProduct.metafields?.find(m => m.key === 'name_en')?.value || shopifyProduct.title;
  const nameFr = shopifyProduct.metafields?.find(m => m.key === 'name_fr')?.value || shopifyProduct.title;
  
  return {
    shopifyId: shopifyProduct.id.toString(),
    name: shopifyProduct.title,
    nameEn,
    nameFr,
    // ...
  };
}
```

## Troubleshooting

### Common Issues

1. **Webhook not receiving data**
   - Check webhook URL is publicly accessible
   - Verify webhook secret matches
   - Check Shopify webhook logs

2. **Sync fails with authentication error**
   - Verify access token is correct
   - Check app permissions include `read_products`

3. **Rate limit errors**
   - Reduce batch size in sync
   - Increase delay between requests

### Debug Mode
Add debug logging:

```typescript
// Enable debug mode
const DEBUG = process.env.NODE_ENV === 'development';

if (DEBUG) {
  console.log('Shopify product data:', shopifyProduct);
}
```

## Security Notes

- Keep your Shopify access token secure
- Use HTTPS for webhook endpoints
- Validate webhook signatures
- Store webhook secret safely
- Consider IP allowlisting for webhooks

## Testing Webhooks Locally

Use ngrok to test webhooks locally:

```bash
# Install ngrok
npm install -g ngrok

# Expose local server
ngrok http 3000

# Use the ngrok URL for webhooks
# https://abc123.ngrok.io/api/webhooks/shopify/products
```

## Summary

After following this guide, you'll have:
- ✅ Initial bulk sync of all Shopify products
- ✅ Real-time sync via webhooks
- ✅ Product management page
- ✅ Error handling and logging
- ✅ Rate limit compliance

Your CRM will now stay synchronized with your Shopify store automatically!