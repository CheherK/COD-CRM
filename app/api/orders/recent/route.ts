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
    const timeRange = searchParams.get("timeRange") || "2weeks" // 2weeks, 1month, all
    const status = searchParams.get("status")
    const search = searchParams.get("search")
    const page = Number.parseInt(searchParams.get("page") || "1")
    const limit = Number.parseInt(searchParams.get("limit") || "20")

    // Build date filter based on time range
    let dateFilter = {}
    const now = new Date()
    
    switch (timeRange) {
      case "2weeks":
        const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000)
        dateFilter = { gte: twoWeeksAgo }
        break
      case "1month":
        const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
        dateFilter = { gte: oneMonthAgo }
        break
      case "all":
        // No date filter for all orders
        break
    }

    // Build where clause
    let whereClause: any = {}
    
    if (Object.keys(dateFilter).length > 0) {
      whereClause.createdAt = dateFilter
    }

    // Filter by status
    if (status && status !== "all") {
      whereClause.status = status
    }

    // Enhanced search filter
    if (search) {
      whereClause.OR = [
        // Search by phone numbers (primary priority)
        {
          customerPhone1: {
            contains: search,
            mode: 'insensitive'
          }
        },
        {
          customerPhone2: {
            contains: search,
            mode: 'insensitive'
          }
        },
        // Search by customer name
        {
          customerName: {
            contains: search,
            mode: 'insensitive'
          }
        },
        // Search by order ID
        {
          id: {
            contains: search,
            mode: 'insensitive'
          }
        },
        // Search by product name through items relation
        {
          items: {
            some: {
              product: {
                OR: [
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
                  }
                ]
              }
            }
          }
        }
      ]
    }

    // Get total count for pagination
    const totalCount = await prisma.order.count({ where: whereClause })

    // Get orders with minimal data for list view - optimized query
    const orders = await prisma.order.findMany({
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
        confirmedBy: {
          select: {
            id: true,
            username: true,
            firstName: true,
            lastName: true
          }
        },
        // Minimal items data for list view
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
                imageUrl: true
              }
            }
          }
        }
      },
      orderBy: [
        { createdAt: 'desc' },
        { id: 'desc' }  // Secondary sort for consistency
      ],
      skip: (page - 1) * limit,
      take: limit
    })

    // Format orders for response with computed fields
    const formattedOrders = orders.map(order => ({
      ...order,
      total: Number(order.total),
      deliveryPrice: order.deliveryPrice ? Number(order.deliveryPrice) : null,
      items: order.items.map(item => ({
        ...item,
        price: Number(item.price)
      })),
      // Add computed fields for list view
      totalItems: order.items.reduce((sum, item) => sum + item.quantity, 0),
      firstProduct: order.items[0]?.product || null,
      hasMultipleProducts: order.items.length > 1
    }))

    console.log(`✅ Retrieved ${formattedOrders.length} orders for ${timeRange}`)

    return NextResponse.json({
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
        cacheTimestamp: new Date().toISOString()
      }
    })
  } catch (error) {
    console.error("❌ Get recent orders API error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}