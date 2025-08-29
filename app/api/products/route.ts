import { type NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth-server";
import prisma from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    console.log("=== GET PRODUCTS API CALLED ===");

    const token = request.cookies.get("auth-token")?.value;

    if (!token) {
      return NextResponse.json({ error: "No token provided" }, { status: 401 });
    }

    const user = verifyToken(token);

    if (!user) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search");
    const isActive = searchParams.get("active");
    const page = Number.parseInt(searchParams.get("page") || "1");
    const limit = Number.parseInt(searchParams.get("limit") || "20");

    // Build where clause
    let whereClause: any = {};

    if (isActive !== null && isActive !== "all") {
      whereClause.isActive = isActive === "true";
    }

    if (search) {
      whereClause.OR = [
        {
          name: {
            contains: search,
            mode: 'insensitive'
          }
        },
        {
          nameEn: {
            contains: search,
            mode: 'insensitive'
          }
        },
        {
          nameFr: {
            contains: search,
            mode: 'insensitive'
          }
        },
        {
          shopifyId: {
            contains: search
          }
        }
      ];
    }

    // Get total count for pagination
    const totalCount = await prisma.product.count({ where: whereClause });

    // Get products with pagination
    const products = await prisma.product.findMany({
      where: whereClause,
      orderBy: {
        createdAt: 'desc'
      },
      skip: (page - 1) * limit,
      take: limit,
      include: {
        _count: {
          select: {
            orderItems: true
          }
        }
      }
    });

    // Format products for response
    const formattedProducts = products.map(product => ({
      id: product.id,
      shopifyId: product.shopifyId,
      name: product.name,
      nameEn: product.nameEn,
      nameFr: product.nameFr,
      price: Number(product.price),
      imageUrl: product.imageUrl,
      isActive: product.isActive,
      orderCount: product._count.orderItems,
      createdAt: product.createdAt,
      updatedAt: product.updatedAt
    }));

    console.log("✅ Retrieved", formattedProducts.length, "products");

    return NextResponse.json({
      success: true,
      products: formattedProducts,
      pagination: {
        page,
        limit,
        total: totalCount,
        pages: Math.ceil(totalCount / limit),
      },
    });
  } catch (error) {
    console.error("❌ Get products API error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    console.log("=== CREATE PRODUCT API CALLED ===");

    const token = request.cookies.get("auth-token")?.value;

    if (!token) {
      return NextResponse.json({ error: "No token provided" }, { status: 401 });
    }

    const user = verifyToken(token);

    if (!user || user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized - Admin access required" }, { status: 403 });
    }

    const productData = await request.json();
    const { shopifyId, name, nameEn, nameFr, price, imageUrl, isActive = true } = productData;

    // Validate required fields
    if (!shopifyId || !name || !nameEn || !nameFr || !price) {
      return NextResponse.json({
        error: "Shopify ID, name, English name, French name, and price are required"
      }, { status: 400 });
    }

    // Validate price
    if (isNaN(price) || price < 0) {
      return NextResponse.json({ error: "Price must be a valid positive number" }, { status: 400 });
    }

    // Check if shopifyId already exists
    const existingProduct = await prisma.product.findUnique({
      where: { shopifyId }
    });

    if (existingProduct) {
      return NextResponse.json({ error: "Product with this Shopify ID already exists" }, { status: 400 });
    }

    // Create product in transaction
    const newProduct = await prisma.$transaction(async (tx) => {
      const product = await tx.product.create({
        data: {
          shopifyId,
          name,
          nameEn,
          nameFr,
          price,
          imageUrl: imageUrl || null,
          isActive
        }
      });

      // Log activity
      await tx.activity.create({
        data: {
          type: "PRODUCT_CREATED",
          description: `Product "${name}" created by ${user.username}`,
          userId: user.id,
          metadata: {
            productId: product.id,
            shopifyId,
            name
          },
          ipAddress: request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "127.0.0.1",
          userAgent: request.headers.get("user-agent") || "unknown"
        }
      });

      return product;
    });

    console.log("✅ Product created:", newProduct.id);

    return NextResponse.json({
      success: true,
      product: {
        ...newProduct,
        price: Number(newProduct.price)
      },
      message: "Product created successfully"
    }, { status: 201 });

  } catch (error) {
    console.error("❌ Create product API error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}