import { type NextRequest, NextResponse } from "next/server"
import { verifyToken } from "@/lib/auth-server"
import { mockPrisma } from "@/lib/prisma"

export async function GET(request: NextRequest) {
  try {
    console.log("=== GET DELIVERY ANALYTICS API CALLED ===")

    const token = request.cookies.get("auth-token")?.value

    if (!token) {
      return NextResponse.json({ error: "No token provided" }, { status: 401 })
    }

    const user = verifyToken(token)

    if (!user) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 })
    }

    // Get delivery performance metrics
    const totalOrders = await mockPrisma.order.count()
    const shippedOrders = await mockPrisma.order.count({ where: { status: "SHIPPED" } })
    const deliveredOrders = await mockPrisma.order.count({ where: { status: "DELIVERED" } })
    const pendingOrders = await mockPrisma.order.count({ where: { status: "PENDING" } })
    const processingOrders = await mockPrisma.order.count({ where: { status: "PROCESSING" } })

    // Calculate delivery rates
    const deliveryRate = totalOrders > 0 ? (deliveredOrders / totalOrders) * 100 : 0
    const shippingRate = totalOrders > 0 ? (shippedOrders / totalOrders) * 100 : 0

    // Get orders by status for charts
    const ordersByStatus = [
      { status: "PENDING", count: pendingOrders, color: "#f59e0b" },
      { status: "PROCESSING", count: processingOrders, color: "#3b82f6" },
      { status: "SHIPPED", count: shippedOrders, color: "#8b5cf6" },
      { status: "DELIVERED", count: deliveredOrders, color: "#10b981" },
    ]

    // Get recent delivery activities
    const recentDeliveries = await mockPrisma.order.findMany({
      where: { status: { in: ["SHIPPED", "DELIVERED"] } },
      orderBy: { updatedAt: "desc" },
      take: 10,
    })

    // Calculate average delivery time (mock data)
    const avgDeliveryTime = 3.5 // days

    const analytics = {
      metrics: {
        totalOrders,
        deliveredOrders,
        shippedOrders,
        deliveryRate: Math.round(deliveryRate * 100) / 100,
        shippingRate: Math.round(shippingRate * 100) / 100,
        avgDeliveryTime,
      },
      charts: {
        ordersByStatus,
      },
      recentDeliveries: recentDeliveries.map((order) => ({
        id: order.id,
        orderNumber: order.orderNumber,
        customerName: order.customerName,
        status: order.status,
        updatedAt: order.updatedAt,
      })),
    }

    console.log("✅ Delivery analytics retrieved")

    return NextResponse.json({ analytics })
  } catch (error) {
    console.error("❌ Get delivery analytics API error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
