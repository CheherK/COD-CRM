// app/api/webhooks/shopify/products/route.ts
import { type NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import crypto from 'crypto';

// Helper function to verify webhook signature
function verifyWebhook(body: string, signature: string, secret: string): boolean {
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(body, 'utf8')
    .digest('base64');
  
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );
}

// Helper function to transform Shopify product
function transformShopifyProduct(shopifyProduct: any) {
  const firstVariant = shopifyProduct.variants?.[0];
  const firstImage = shopifyProduct.images?.[0];
  
  return {
    shopifyId: shopifyProduct.id.toString(),
    name: shopifyProduct.title,
    nameEn: shopifyProduct.title,
    nameFr: shopifyProduct.title,
    price: parseFloat(firstVariant?.price || '0'),
    imageUrl: firstImage?.src || null,
    isActive: shopifyProduct.status === 'active',
  };
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const signature = request.headers.get('x-shopify-hmac-sha256');
    const topic = request.headers.get('x-shopify-topic');
    const webhookSecret = process.env.SHOPIFY_WEBHOOK_SECRET;

    console.log(`=== SHOPIFY WEBHOOK: ${topic} ===`);

    if (!signature || !webhookSecret) {
      console.error("❌ Missing webhook signature or secret");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify webhook signature
    if (!verifyWebhook(body, signature, webhookSecret)) {
      console.error("❌ Invalid webhook signature");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const shopifyProduct = JSON.parse(body);

    switch (topic) {
      case 'products/create':
      case 'products/update':
        await handleProductCreateOrUpdate(shopifyProduct, topic);
        break;
      
      case 'products/delete':
        await handleProductDelete(shopifyProduct);
        break;
      
      default:
        console.log(`ℹ️ Unhandled webhook topic: ${topic}`);
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error("❌ Webhook processing error:", error);
    return NextResponse.json({ error: "Webhook processing failed" }, { status: 500 });
  }
}

async function handleProductCreateOrUpdate(shopifyProduct: any, action: string) {
  try {
    const productData = transformShopifyProduct(shopifyProduct);
    
    const product = await prisma.product.upsert({
      where: { shopifyId: productData.shopifyId },
      update: {
        ...productData,
        updatedAt: new Date(),
      },
      create: {
        ...productData,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });

    // Log activity
    await prisma.activity.create({
      data: {
        type: action === 'products/create' ? "PRODUCT_CREATED" : "PRODUCT_UPDATED",
        description: `Product "${productData.name}" ${action === 'products/create' ? 'created' : 'updated'} via Shopify webhook`,
        userId: "system", // System user for webhooks
        metadata: {
          productId: product.id,
          shopifyId: productData.shopifyId,
          source: 'shopify_webhook',
          action,
        },
        ipAddress: "shopify",
        userAgent: "shopify-webhook",
      }
    });

    console.log(`✅ Product ${action}: ${productData.name} (${productData.shopifyId})`);
  } catch (error) {
    console.error(`❌ Error handling ${action}:`, error);
    throw error;
  }
}

async function handleProductDelete(shopifyProduct: any) {
  try {
    const shopifyId = shopifyProduct.id.toString();
    
    // Soft delete by setting isActive to false instead of hard delete
    // This preserves order history and references
    const product = await prisma.product.update({
      where: { shopifyId },
      data: { 
        isActive: false,
        updatedAt: new Date(),
      },
    });

    // Log activity
    await prisma.activity.create({
      data: {
        type: "PRODUCT_DELETED",
        description: `Product "${product.name}" deactivated via Shopify webhook`,
        userId: "system",
        metadata: {
          productId: product.id,
          shopifyId,
          source: 'shopify_webhook',
          action: 'products/delete',
        },
        ipAddress: "shopify",
        userAgent: "shopify-webhook",
      }
    });

    console.log(`✅ Product deactivated: ${product.name} (${shopifyId})`);
  } catch (error: any) {
    if (error.code === 'P2025') {
      console.log(`ℹ️ Product not found for deletion: ${shopifyProduct.id}`);
    } else {
      console.error("❌ Error handling product deletion:", error);
      throw error;
    }
  }
}