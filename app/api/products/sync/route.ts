// app/api/products/sync/route.ts
import { type NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth-server";
import prisma from "@/lib/prisma";

// Helper function to fetch products from Shopify
async function fetchShopifyProducts(limit = 250, pageInfo?: string) {
  const shopifyStore = process.env.SHOPIFY_STORE;
  const shopifyToken = process.env.SHOPIFY_ACCESS_TOKEN;
  
  if (!shopifyStore || !shopifyToken) {
    throw new Error('Shopify credentials not configured');
  }

  const url = new URL(`https://${shopifyStore}.myshopify.com/admin/api/2024-01/products.json`);
  url.searchParams.set('limit', limit.toString());
  if (pageInfo) {
    url.searchParams.set('page_info', pageInfo);
  }

  const response = await fetch(url.toString(), {
    headers: {
      'X-Shopify-Access-Token': shopifyToken,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`Shopify API error: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  
  // Parse pagination info from Link header
  const linkHeader = response.headers.get('Link');
  const nextPageInfo = parseLinkHeader(linkHeader)?.next;
  
  return {
    products: data.products,
    nextPageInfo,
  };
}

function parseLinkHeader(header: string | null) {
  if (!header) return null;
  
  const links: Record<string, string> = {};
  const parts = header.split(',');
  
  parts.forEach(part => {
    const section = part.split(';');
    if (section.length !== 2) return;
    
    const url = section[0].replace(/<(.*)>/, '$1').trim();
    const rel = section[1].replace(/rel="(.*)"/, '$1').trim();
    const pageInfo = new URL(url).searchParams.get('page_info');
    
    if (pageInfo) {
      links[rel] = pageInfo;
    }
  });
  
  return links;
}

// Helper function to transform Shopify product to our format
function transformShopifyProduct(shopifyProduct: any) {
  const firstVariant = shopifyProduct.variants?.[0];
  const firstImage = shopifyProduct.images?.[0];
  
  return {
    shopifyId: shopifyProduct.id.toString(),
    name: shopifyProduct.title,
    nameEn: shopifyProduct.title, // You might want to extract from metafields
    nameFr: shopifyProduct.title, // You might want to extract from metafields
    price: parseFloat(firstVariant?.price || '0'),
    imageUrl: firstImage?.src || null,
    isActive: shopifyProduct.status === 'active',
  };
}

// Helper function to upsert product in database
async function upsertProduct(productData: any, userId: string, userAgent: string, ipAddress: string) {
  return await prisma.$transaction(async (tx) => {
    const product = await tx.product.upsert({
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

    // Log activity only for new products
    const isNewProduct = !await tx.product.findUnique({
      where: { shopifyId: productData.shopifyId }
    });

    if (isNewProduct) {
      await tx.activity.create({
        data: {
          type: "PRODUCT_SYNCED",
          description: `Product "${productData.name}" synced from Shopify`,
          userId,
          metadata: {
            productId: product.id,
            shopifyId: productData.shopifyId,
            source: 'shopify_sync'
          },
          ipAddress,
          userAgent,
        }
      });
    }

    return product;
  });
}

// GET: Fetch sync status and statistics
export async function GET(request: NextRequest) {
  try {
    console.log("=== GET SYNC STATUS API CALLED ===");

    const token = request.cookies.get("auth-token")?.value;
    if (!token) {
      return NextResponse.json({ error: "No token provided" }, { status: 401 });
    }

    const user = verifyToken(token);
    if (!user) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    // Get sync statistics
    const totalProducts = await prisma.product.count();
    const activeProducts = await prisma.product.count({
      where: { isActive: true }
    });
    const syncedFromShopify = await prisma.product.count({
      where: { shopifyId: { not: "" } }
    });

    // Get last sync activity
    const lastSyncActivity = await prisma.activity.findFirst({
      where: { type: "PRODUCT_SYNCED" },
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json({
      success: true,
      stats: {
        totalProducts,
        activeProducts,
        syncedFromShopify,
        lastSync: lastSyncActivity?.createdAt || null,
      },
    });
  } catch (error) {
    console.error("❌ Get sync status error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST: Manual sync of all Shopify products
export async function POST(request: NextRequest) {
  try {
    console.log("=== MANUAL PRODUCT SYNC API CALLED ===");

    const token = request.cookies.get("auth-token")?.value;
    if (!token) {
      return NextResponse.json({ error: "No token provided" }, { status: 401 });
    }

    const user = verifyToken(token);
    if (!user || user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized - Admin access required" }, { status: 403 });
    }

    const userAgent = request.headers.get("user-agent") || "unknown";
    const ipAddress = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "127.0.0.1";

    let syncedCount = 0;
    let errorCount = 0;
    let nextPageInfo: string | undefined;
    const errors: string[] = [];

    console.log("🔄 Starting Shopify product sync...");

    do {
      try {
        const { products, nextPageInfo: nextPage } = await fetchShopifyProducts(50, nextPageInfo);
        nextPageInfo = nextPage;

        for (const shopifyProduct of products) {
          try {
            const productData = transformShopifyProduct(shopifyProduct);
            await upsertProduct(productData, user.id, userAgent, ipAddress);
            syncedCount++;
            console.log(`✅ Synced: ${productData.name}`);
          } catch (productError) {
            errorCount++;
            const errorMessage = `Error syncing product ${shopifyProduct.id}: ${productError}`;
            console.error("❌", errorMessage);
            errors.push(errorMessage);
          }
        }

        // Add small delay to respect rate limits
        if (nextPageInfo) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      } catch (fetchError) {
        console.error("❌ Error fetching products page:", fetchError);
        errors.push(`Fetch error: ${fetchError}`);
        break;
      }
    } while (nextPageInfo);

    // Log sync completion
    await prisma.activity.create({
      data: {
        type: "BULK_PRODUCT_SYNC",
        description: `Bulk product sync completed. Synced: ${syncedCount}, Errors: ${errorCount}`,
        userId: user.id,
        metadata: {
          syncedCount,
          errorCount,
          errors: errors.slice(0, 10), // Limit error logs
        },
        ipAddress,
        userAgent,
      }
    });

    console.log(`✅ Sync completed: ${syncedCount} products synced, ${errorCount} errors`);

    return NextResponse.json({
      success: true,
      message: "Product sync completed",
      results: {
        syncedCount,
        errorCount,
        errors: errors.slice(0, 5), // Return first 5 errors only
      }
    });

  } catch (error) {
    console.error("❌ Manual sync API error:", error);
    return NextResponse.json({ 
      error: "Sync failed", 
      details: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 });
  }
}