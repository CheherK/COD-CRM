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
    const limit = Number.parseInt(searchParams.get("limit") || "10")

    // Build where clause
    let whereClause: any = {}

    // Filter by status
    if (status && status !== "all") {
      whereClause.status = status
    }

    // Search filter
    if (search) {
      whereClause.OR = [
        {
          customerName: {
            contains: search,
            mode: 'insensitive'
          }
        },
        {
          customerPhone1: {
            contains: search
          }
        },
        {
          customerEmail: {
            contains: search,
            mode: 'insensitive'
          }
        },
        {
          id: {
            contains: search
          }
        }
      ]
    }

    // Role-based filtering
    if (user.role === "STAFF") {
      whereClause.assignedToId = user.id
    }

    // Get total count for pagination
    const totalCount = await prisma.order.count({ where: whereClause })

    // Get orders with pagination
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
                imageUrl: true
              }
            }
          }
        },
        assignedTo: {
          select: {
            id: true,
            username: true,
            firstName: true,
            lastName: true
          }
        },
        statusHistory: {
          orderBy: {
            createdAt: 'desc'
          },
          take: 5,
          include: {
            user: {
              select: {
                id: true,
                username: true,
                firstName: true,
                lastName: true
              }
            }
          }
        },
        shipments: {
          include: {
            agency: {
              select: {
                id: true,
                name: true
              }
            }
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      skip: (page - 1) * limit,
      take: limit
    })

    // Format orders for response
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
      assignedTo: order.assignedTo,
      items: order.items.map(item => ({
        id: item.id,
        quantity: item.quantity,
        price: Number(item.price),
        product: item.product,
        productId: item.productId
      })),
      statusHistory: order.statusHistory,
      shipments: order.shipments.map(shipment => ({
        id: shipment.id,
        trackingNumber: shipment.trackingNumber,
        status: shipment.status,
        agency: shipment.agency,
        createdAt: shipment.createdAt
      }))
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

export async function POST(request: NextRequest) {
  try {
    console.log("=== CREATE ORDER API CALLED ===")

    const token = request.cookies.get("auth-token")?.value

    if (!token) {
      return NextResponse.json({ error: "No token provided" }, { status: 401 })
    }

    const user = verifyToken(token)

    if (!user) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 })
    }

    const orderData = await request.json()
    console.log("Creating order for customer:", orderData.customerName)

    // Validate required fields
    if (!orderData.customerName || !orderData.customerPhone1 || !orderData.customerAddress) {
      return NextResponse.json({ error: "Customer name, phone, and address are required" }, { status: 400 })
    }

    // Validate items
    const items = orderData.items || []
    if (items.length === 0) {
      return NextResponse.json({ error: "At least one item is required" }, { status: 400 })
    }

    // Calculate total from items
    const itemsTotal = items.reduce((sum: number, item: any) => sum + (item.price * item.quantity), 0)
    const deliveryPrice = orderData.deliveryPrice || 0
    const totalAmount = itemsTotal + deliveryPrice

    // Create order with items in a transaction
    const newOrder = await prisma.$transaction(async (tx) => {
      // Create the order
      const order = await tx.order.create({
        data: {
          customerName: orderData.customerName,
          customerPhone1: orderData.customerPhone1,
          customerPhone2: orderData.customerPhone2 || null,
          customerEmail: orderData.customerEmail || null,
          customerAddress: orderData.customerAddress,
          customerCity: orderData.customerCity || "",
          status: orderData.status || "PENDING",
          deliveryCompany: orderData.deliveryCompany || null,
          total: totalAmount,
          deliveryPrice: deliveryPrice > 0 ? deliveryPrice : null,
          notes: orderData.notes || null,
          assignedToId: orderData.assignedToId || user.id,
        }
      })

      // Create order items
      for (const item of items) {
        await tx.orderItem.create({
          data: {
            orderId: order.id,
            productId: item.productId,
            quantity: item.quantity,
            price: item.price
          }
        })
      }

      // Create initial status history entry
      await tx.orderStatusHistory.create({
        data: {
          orderId: order.id,
          status: order.status,
          notes: "Order created",
          userId: user.id
        }
      })

      // Log activity
      await tx.activity.create({
        data: {
          type: "ORDER_CREATED",
          description: `Order ${order.id} created for ${orderData.customerName}`,
          userId: user.id,
          metadata: {
            orderId: order.id,
            customerName: orderData.customerName,
            total: totalAmount
          },
          ipAddress: request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "127.0.0.1",
          userAgent: request.headers.get("user-agent") || "unknown"
        }
      })

      return order
    })

    // Fetch the complete order with relations
    const completeOrder = await prisma.order.findUnique({
      where: { id: newOrder.id },
      include: {
        items: {
          include: {
            product: true
          }
        },
        assignedTo: {
          select: {
            id: true,
            username: true,
            firstName: true,
            lastName: true
          }
        },
        statusHistory: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
                firstName: true,
                lastName: true
              }
            }
          }
        }
      }
    })

    console.log("✅ Order created:", newOrder.id)

    return NextResponse.json({
      success: true,
      order: completeOrder,
      message: "Order created successfully"
    }, { status: 201 })

  } catch (error) {
    console.error("❌ Create order API error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}