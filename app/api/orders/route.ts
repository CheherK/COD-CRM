import { type NextRequest, NextResponse } from "next/server"
import { verifyToken } from "@/lib/auth-server"
import prisma from "@/lib/prisma"

export async function GET(request: NextRequest) {
  try {
    console.log("=== GET ORDERS API CALLED ===")

    const token = request.cookies.get("auth-token")?.value
    if (!token) {
      return NextResponse.json({ error: "No token provided" }, { status: 401 })
    }

    const user = verifyToken(token)
    if (!user) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const status = searchParams.get("status")
    const search = searchParams.get("search")
    const page = Number.parseInt(searchParams.get("page") || "1")
    const limit = Number.parseInt(searchParams.get("limit") || "20")
    const dateFrom = searchParams.get("dateFrom")
    const dateTo = searchParams.get("dateTo")
    const product = searchParams.get("product")
    const city = searchParams.get("city")
    const deliveryAgency = searchParams.get("deliveryAgency")

    // Build where clause
    let whereClause: any = {}

    // Status filter
    if (status && status !== "all") {
      whereClause.status = status
    }

    // Search filter
    if (search) {
      whereClause.OR = [
        { customerPhone1: { contains: search, mode: "insensitive" } },
        { customerPhone2: { contains: search, mode: "insensitive" } },
        { customerName: { contains: search, mode: "insensitive" } },
        { id: { contains: search, mode: "insensitive" } },
        {
          items: {
            some: {
              product: {
                OR: [
                  { name: { contains: search, mode: "insensitive" } },
                  { nameEn: { contains: search, mode: "insensitive" } },
                  { nameFr: { contains: search, mode: "insensitive" } },
                ],
              },
            },
          },
        },
      ]
    }

    // Date range filter
    if (dateFrom || dateTo) {
      whereClause.createdAt = {}
      if (dateFrom) {
        const from = new Date(dateFrom)
        from.setHours(0, 0, 0, 0)
        whereClause.createdAt.gte = from
      }
      if (dateTo) {
        const to = new Date(dateTo)
        to.setHours(23, 59, 59, 999)
        whereClause.createdAt.lte = to
      }
    }

    // Product filter
    if (product && product !== "__all__") {
      whereClause.items = {
        some: {
          product: {
            name: { contains: product, mode: "insensitive" },
          },
        },
      }
    }

    // City filter
    if (city && city !== "__all__") {
      whereClause.customerCity = { contains: city, mode: "insensitive" }
    }

    // Delivery agency filter
    if (deliveryAgency && deliveryAgency !== "__all__") {
      whereClause.shipments = {
        some: {
          agency: {
            name: { contains: deliveryAgency, mode: "insensitive" },
          },
        },
      }
    }

    // Count for pagination
    const totalCount = await prisma.order.count({ where: whereClause })

    // Fetch paginated orders
    const orders = await prisma.order.findMany({
      where: whereClause,
      include: {
        items: {
          include: {
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
        confirmedBy: {
          select: {
            id: true,
            username: true,
            firstName: true,
            lastName: true,
          },
        },
        statusHistory: {
          orderBy: { createdAt: "desc" },
          include: {
            user: {
              select: {
                id: true,
                username: true,
                firstName: true,
                lastName: true,
              },
            },
          },
        },
        shipments: {
          include: {
            agency: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    })

    const formattedOrders = orders.map(order => ({
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
      items: order.items.map(item => ({
        id: item.id,
        quantity: item.quantity,
        price: Number(item.price),
        product: item.product,
        productId: item.productId,
      })),
      statusHistory: order.statusHistory,
      shipments: order.shipments.map(shipment => ({
        id: shipment.id,
        trackingNumber: shipment.trackingNumber,
        status: shipment.status,
        agency: shipment.agency,
        createdAt: shipment.createdAt,
      })),
    }))

    console.log("✅ Retrieved", formattedOrders.length, "orders")

    return NextResponse.json({
      orders: formattedOrders,
      pagination: {
        page,
        limit,
        total: totalCount,
        pages: Math.ceil(totalCount / limit),
      },
    })
  } catch (error) {
    console.error("❌ Get orders API error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
