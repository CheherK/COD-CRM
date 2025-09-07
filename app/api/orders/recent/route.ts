// app/api/orders/recent/route.ts
import { type NextRequest, NextResponse } from "next/server"
import { verifyToken } from "@/lib/auth-server"
import prisma from "@/lib/prisma"

export async function GET(request: NextRequest) {
  try {
    console.log("=== GET RECENT ORDERS API CALLED ===")

    const token = request.cookies.get("auth-token")?.value
    if (!token) {
      return NextResponse.json({ error: "No token provided" }, { status: 401 })
    }

    const user = verifyToken(token)
    if (!user) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const timeRange = searchParams.get("timeRange") || "2weeks"
    const status = searchParams.get("status")
    const search = searchParams.get("search")
    const page = Number.parseInt(searchParams.get("page") || "1")
    const limit = Math.min(Number.parseInt(searchParams.get("limit") || "20"), 100) // Cap at 100
    const product = searchParams.get("product")
    const city = searchParams.get("city")
    const deliveryAgency = searchParams.get("deliveryAgency")

    // Build date filter with better performance
    let dateFilter: any = {}
    const now = new Date()

    switch (timeRange) {
      case "2weeks":
        dateFilter = { gte: new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000) }
        break
      case "1month":
        dateFilter = { gte: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000) }
        break
      case "3months":
        dateFilter = { gte: new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000) }
        break
      case "all":
        break
    }

    // Build optimized where clause
    let whereClause: any = {}

    if (Object.keys(dateFilter).length > 0) {
      whereClause.createdAt = dateFilter
    }

    // Status filter - use index
    if (status && status !== "all") {
      whereClause.status = status
    }

    // Optimized search with specific field targeting
    if (search) {
      const searchTerm = search.trim()
      // Check if it looks like a phone number
      const phoneRegex = /^\+?[\d\s\-\(\)]+$/
      
      if (phoneRegex.test(searchTerm)) {
        // Phone-optimized search
        whereClause.OR = [
          { customerPhone1: { contains: searchTerm.replace(/\D/g, ''), mode: "insensitive" } },
          { customerPhone2: { contains: searchTerm.replace(/\D/g, ''), mode: "insensitive" } }
        ]
      } else {
        // General search
        whereClause.OR = [
          { customerName: { contains: searchTerm, mode: "insensitive" } },
          { customerPhone1: { contains: searchTerm, mode: "insensitive" } },
          { id: { contains: searchTerm, mode: "insensitive" } },
          // Product search - more efficient with nested query
          {
            items: {
              some: {
                product: {
                  OR: [
                    { name: { contains: searchTerm, mode: "insensitive" } },
                    { nameEn: { contains: searchTerm, mode: "insensitive" } },
                    { nameFr: { contains: searchTerm, mode: "insensitive" } },
                  ],
                },
              },
            },
          },
        ]
      }
    }

    // Advanced filters with better performance
    if (product && product !== "__all__") {
      whereClause.items = {
        some: {
          productId: product === "__search__" ? undefined : product
        }
      }
    }

    if (city && city !== "__all__") {
      whereClause.customerCity = { equals: city } // Use equals for better index usage
    }

    if (deliveryAgency && deliveryAgency !== "__all__") {
      whereClause.shipments = {
        some: {
          agencyId: deliveryAgency === "__search__" ? undefined : deliveryAgency
        }
      }
    }

    // Use transaction for consistency and performance
    const [totalCount, orders] = await prisma.$transaction([
      // Count query - optimized
      prisma.order.count({ where: whereClause }),
      
      // Main query - optimized with selective includes
      prisma.order.findMany({
        where: whereClause,
        select: {
          id: true,
          customerName: true,
          customerPhone1: true,
          customerPhone2: true,
          customerEmail: true,
          customerAddress: true,
          customerCity: true,
          status: true,
          deliveryCompany: true,
          total: true,
          deliveryPrice: true,
          notes: true,
          attemptCount: true,
          createdAt: true,
          updatedAt: true,
          confirmedById: true,
          // Optimized includes
          confirmedBy: {
            select: {
              id: true,
              username: true,
              firstName: true,
              lastName: true,
            },
          },
          items: {
            select: {
              id: true,
              quantity: true,
              price: true,
              productId: true,
              product: {
                select: {
                  id: true,
                  name: true,
                  nameEn: true,
                  nameFr: true,
                  imageUrl: true,
                },
              },
            },
          },
          shipments: {
            select: {
              id: true,
              trackingNumber: true,
              status: true,
              createdAt: true,
              agency: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
        },
        orderBy: [
          { createdAt: "desc" },
          { id: "desc" }
        ],
        skip: (page - 1) * limit,
        take: limit,
      })
    ])

    // Optimize response formatting
    const formattedOrders = orders.map((order) => {
      const totalItems = order.items.reduce((sum, item) => sum + item.quantity, 0)
      const firstProduct = order.items[0]?.product || null
      
      return {
        id: order.id,
        customerName: order.customerName,
        customerPhone1: order.customerPhone1,
        customerPhone2: order.customerPhone2,
        customerEmail: order.customerEmail,
        customerAddress: order.customerAddress,
        customerCity: order.customerCity,
        status: order.status,
        deliveryCompany: order.deliveryCompany,
        total: Number(order.total),
        deliveryPrice: order.deliveryPrice ? Number(order.deliveryPrice) : null,
        notes: order.notes,
        attemptCount: order.attemptCount,
        createdAt: order.createdAt,
        updatedAt: order.updatedAt,
        confirmedBy: order.confirmedBy,
        items: order.items.map((item) => ({
          id: item.id,
          quantity: item.quantity,
          price: Number(item.price),
          product: item.product,
          productId: item.productId,
        })),
        shipments: order.shipments,
        // Computed fields
        totalItems,
        firstProduct,
        hasMultipleProducts: order.items.length > 1,
      }
    })

    console.log(`✅ Retrieved ${formattedOrders.length} orders for ${timeRange}`)

    // Add cache headers for better performance
    const response = NextResponse.json({
      orders: formattedOrders,
      pagination: {
        page,
        limit,
        total: totalCount,
        pages: Math.ceil(totalCount / limit),
      },
      metadata: {
        timeRange,
        totalInRange: totalCount,
        cacheTimestamp: new Date().toISOString(),
      },
    })

    // Cache for 30 seconds for recent orders
    // response.headers.set('Cache-Control', 's-maxage=30, stale-while-revalidate=60')
    
    return response

  } catch (error) {
    console.error("❌ Get recent orders API error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
