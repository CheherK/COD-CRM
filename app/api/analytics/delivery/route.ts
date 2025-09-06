import { type NextRequest, NextResponse } from "next/server"
import { verifyToken } from "@/lib/auth-server"
import prisma from "@/lib/prisma"

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
    const totalOrders = await prisma.order.count()
    
    // Get delivery status counts from DeliveryShipment
    const uploadedOrders = await prisma.deliveryShipment.count({ where: { status: "UPLOADED" } })
    const depositOrders = await prisma.deliveryShipment.count({ where: { status: "DEPOSIT" } })
    const inTransitOrders = await prisma.deliveryShipment.count({ where: { status: "IN_TRANSIT" } })
    const deliveredOrders = await prisma.deliveryShipment.count({ where: { status: "DELIVERED" } })
    const returnedOrders = await prisma.deliveryShipment.count({ where: { status: "RETURNED" } })

    // Calculate delivery rates
    const deliveryRate = totalOrders > 0 ? (deliveredOrders / totalOrders) * 100 : 0
    const shippingRate = totalOrders > 0 ? ((uploadedOrders + depositOrders + inTransitOrders) / totalOrders) * 100 : 0
    const returnRate = totalOrders > 0 ? (returnedOrders / totalOrders) * 100 : 0

    // Get orders by status for charts
    const ordersByStatus = [
      { status: "UPLOADED", count: uploadedOrders, color: "#8b5cf6" },
      { status: "DEPOSIT", count: depositOrders, color: "#6366f1" },
      { status: "IN_TRANSIT", count: inTransitOrders, color: "#06b6d4" },
      { status: "DELIVERED", count: deliveredOrders, color: "#10b981" },
      { status: "RETURNED", count: returnedOrders, color: "#ef4444" },
    ].filter(item => item.count > 0) // Only show statuses with orders

    // Get recent delivery activities
    const recentDeliveries = await prisma.deliveryShipment.findMany({
      where: { status: { in: ["UPLOADED", "DEPOSIT", "IN_TRANSIT", "DELIVERED", "RETURNED"] } },
      include: {
        order: {
          select: {
            id: true,
            customerName: true,
            total: true,
            updatedAt: true,
            createdAt: true
          }
        }
      },
      orderBy: { updatedAt: "desc" },
      take: 10,
    })

    // Get delivery shipments analytics
    const totalShipments = await prisma.deliveryShipment.count()
    const activeShipments = await prisma.deliveryShipment.count({
      where: {
        status: {
          in: ["UPLOADED", "DEPOSIT", "IN_TRANSIT"]
        }
      }
    })

    // Get shipments by agency
    const shipmentsByAgency = await prisma.deliveryShipment.groupBy({
      by: ['agencyId'],
      _count: {
        id: true
      },
      orderBy: {
        _count: {
          id: 'desc'
        }
      }
    })

    // Get agency details
    const agencyIds = shipmentsByAgency.map(item => item.agencyId)
    const agencies = await prisma.deliveryAgency.findMany({
      where: {
        id: {
          in: agencyIds
        }
      },
      select: {
        id: true,
        name: true,
        enabled: true
      }
    })

    // Combine agency data with shipment counts
    const agencyStats = shipmentsByAgency.map(item => {
      const agency = agencies.find(a => a.id === item.agencyId)
      return {
        agencyId: item.agencyId,
        agencyName: agency?.name || 'Unknown Agency',
        enabled: agency?.enabled || false,
        shipmentCount: item._count.id
      }
    })

    // Calculate average delivery time (for delivered orders)
    const deliveredShipments = await prisma.deliveryShipment.findMany({
      where: { status: "DELIVERED" },
      select: {
        createdAt: true,
        updatedAt: true
      }
    })
    
    let totalDeliveryTime = 0
    deliveredShipments.forEach(shipment => {
      const deliveryTime = shipment.updatedAt.getTime() - shipment.createdAt.getTime()
      totalDeliveryTime += deliveryTime
    })
    
    const avgDeliveryTime = deliveredShipments.length > 0 
      ? Math.round((totalDeliveryTime / deliveredShipments.length) / (1000 * 60 * 60 * 24) * 10) / 10 
      : 0

    // Get monthly delivery trends (last 6 months)
    const sixMonthsAgo = new Date()
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6)
    
    const monthlyDeliveries = await prisma.deliveryShipment.findMany({
      where: {
        status: "DELIVERED",
        updatedAt: {
          gte: sixMonthsAgo
        }
      },
      select: {
        updatedAt: true
      }
    })

    // Group by month
    const monthlyStats: { [key: string]: number } = {}
    monthlyDeliveries.forEach(shipment => {
      const month = shipment.updatedAt.toISOString().substring(0, 7) // YYYY-MM format
      monthlyStats[month] = (monthlyStats[month] || 0) + 1
    })

    const monthlyTrend = Object.entries(monthlyStats).map(([month, count]) => ({
      month,
      deliveries: count
    })).sort((a, b) => a.month.localeCompare(b.month))

    const analytics = {
      metrics: {
        totalOrders,
        deliveredOrders,
        uploadedOrders,
        depositOrders,
        inTransitOrders,
        returnedOrders,
        deliveryRate: Math.round(deliveryRate * 100) / 100,
        shippingRate: Math.round(shippingRate * 100) / 100,
        returnRate: Math.round(returnRate * 100) / 100,
        avgDeliveryTime,
        totalShipments,
        activeShipments
      },
      charts: {
        ordersByStatus,
        agencyStats,
        monthlyTrend
      },
      recentDeliveries: recentDeliveries.map((shipment) => ({
        id: shipment.order.id,
        customerName: shipment.order.customerName,
        status: shipment.status,
        total: shipment.order.total,
        updatedAt: shipment.updatedAt,
        createdAt: shipment.createdAt
      })),
    }

    console.log("✅ Delivery analytics retrieved")

    return NextResponse.json({ analytics })
  } catch (error) {
    console.error("❌ Get delivery analytics API error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}