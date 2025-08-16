import { type NextRequest, NextResponse } from "next/server"
import { verifyToken } from "@/lib/auth-server"
import prisma from "@/lib/prisma"
import { logOrderActivity } from "@/lib/activity-logger"

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

    // Get all orders (in a real app, you'd filter by user permissions)
    const allOrders = await prisma.getAllOrders()

    // Apply filters
    let filteredOrders = allOrders

    if (status && status !== "all") {
      filteredOrders = filteredOrders.filter((order) => order.status === status)
    }

    if (search) {
      filteredOrders = filteredOrders.filter(
        (order) => order.customerName.toLowerCase().includes(search.toLowerCase()) || order.id.includes(search),
      )
    }

    // Apply pagination
    const startIndex = (page - 1) * limit
    const paginatedOrders = filteredOrders.slice(startIndex, startIndex + limit)

    console.log("✅ Retrieved", paginatedOrders.length, "orders")

    return NextResponse.json({
      orders: paginatedOrders,
      pagination: {
        page,
        limit,
        total: filteredOrders.length,
        pages: Math.ceil(filteredOrders.length / limit),
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
    if (!orderData.customerName || !orderData.customerPhone || !orderData.customerAddress) {
      return NextResponse.json({ error: "Customer name, phone, and address are required" }, { status: 400 })
    }

    // Calculate total from items
    const items = orderData.items || []
    const itemsTotal = items.reduce((sum: number, item: any) => sum + item.price * item.quantity, 0)
    const deliveryPrice = orderData.deliveryPrice || 0
    const totalAmount = itemsTotal + deliveryPrice

    // Create order
    const newOrder = await prisma.createOrder({
      customerName: orderData.customerName,
      customerEmail: orderData.customerEmail || "",
      customerPhone: orderData.customerPhone,
      items: items.map((item: any) => ({
        id: `item-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        productName: item.productId, // In a real app, you'd look up the product name
        quantity: item.quantity,
        price: item.price,
        total: item.price * item.quantity,
      })),
      status: orderData.status || "PENDING",
      totalAmount,
      shippingAddress: orderData.customerAddress,
      notes: orderData.privateNote || "",
      createdBy: user.id,
    })

    // Log order creation
    await logOrderActivity(
      "ORDER_CREATED",
      `Order ${newOrder.id} created for ${orderData.customerName}`,
      request,
      user.id,
      newOrder.id,
    )

    console.log("✅ Order created:", newOrder.id)

    return NextResponse.json(
      {
        order: newOrder,
        id: newOrder.id,
        customerName: newOrder.customerName,
        customerEmail: newOrder.customerEmail,
        customerPhone: newOrder.customerPhone,
        customerAddress: newOrder.shippingAddress,
        customerCity: orderData.customerCity || "",
        status: newOrder.status,
        deliveryCompany: orderData.deliveryCompany,
        deliveryPrice: deliveryPrice,
        deliveryCost: orderData.deliveryCost || 0,
        privateNote: newOrder.notes,
        attemptCount: orderData.attemptCount || 0,
        total: totalAmount,
        items: newOrder.items,
        createdAt: newOrder.createdAt,
        updatedAt: newOrder.updatedAt,
      },
      { status: 201 },
    )
  } catch (error) {
    console.error("❌ Create order API error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
