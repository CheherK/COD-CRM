import { type NextRequest, NextResponse } from "next/server"
import { verifyToken } from "@/lib/auth-server"
import prisma from "@/lib/prisma"

export async function GET(request: NextRequest) {
  try {
    console.log("=== GET STATS API CALLED ===")

    const token = request.cookies.get("auth-token")?.value

    if (!token) {
      return NextResponse.json({ error: "No token provided" }, { status: 401 })
    }

    const user = verifyToken(token)

    if (!user) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 })
    }

    let orderWhereClause: any = {}

    // Get order statistics
    const totalOrders = await prisma.order.count({ where: orderWhereClause })
    const pendingOrders = await prisma.order.count({ 
      where: { ...orderWhereClause, status: "PENDING" } 
    })
    const confirmedOrders = await prisma.order.count({ 
      where: { ...orderWhereClause, status: "CONFIRMED" } 
    })
    const processingOrders = await prisma.order.count({ 
      where: { ...orderWhereClause, status: "PROCESSING" } 
    })
    const shippedOrders = await prisma.order.count({ 
      where: { ...orderWhereClause, status: "SHIPPED" } 
    })
    const deliveredOrders = await prisma.order.count({ 
      where: { ...orderWhereClause, status: "DELIVERED" } 
    })
    const returnedOrders = await prisma.order.count({ 
      where: { ...orderWhereClause, status: "RETURNED" } 
    })
    const cancelledOrders = await prisma.order.count({ 
      where: { ...orderWhereClause, status: "CANCELLED" } 
    })
    const inTransitOrders = await prisma.order.count({ 
      where: { ...orderWhereClause, status: "IN_TRANSIT" } 
    })
    const uploadedOrders = await prisma.order.count({ 
      where: { ...orderWhereClause, status: "UPLOADED" } 
    })

    // Get revenue statistics (only from delivered orders)
    const totalRevenueResult = await prisma.order.aggregate({
      _sum: { total: true },
      where: { 
        ...orderWhereClause, 
        status: { in: ["DELIVERED", "SHIPPED"] } 
      },
    })

    // Get monthly revenue (current month)
    const currentMonthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1)
    const monthlyRevenueResult = await prisma.order.aggregate({
      _sum: { total: true },
      where: {
        ...orderWhereClause,
        status: { in: ["DELIVERED", "SHIPPED"] },
        createdAt: { gte: currentMonthStart },
      },
    })

    // Get weekly revenue (last 7 days)
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    const weeklyRevenueResult = await prisma.order.aggregate({
      _sum: { total: true },
      where: {
        ...orderWhereClause,
        status: { in: ["DELIVERED", "SHIPPED"] },
        createdAt: { gte: weekAgo },
      },
    })

    // Get daily revenue (today)
    const todayStart = new Date()
    todayStart.setHours(0, 0, 0, 0)
    const dailyRevenueResult = await prisma.order.aggregate({
      _sum: { total: true },
      where: {
        ...orderWhereClause,
        status: { in: ["DELIVERED", "SHIPPED"] },
        createdAt: { gte: todayStart },
      },
    })

    // Get user statistics (admin only)
    let userStats = null
    if (user.role === "ADMIN") {
      const totalUsers = await prisma.user.count()
      const activeUsers = await prisma.user.count({ where: { status: "ENABLED" } })
      const disabledUsers = await prisma.user.count({ where: { status: "DISABLED" } })
      const adminUsers = await prisma.user.count({ where: { role: "ADMIN" } })
      const staffUsers = await prisma.user.count({ where: { role: "STAFF" } })

      userStats = {
        total: totalUsers,
        active: activeUsers,
        disabled: disabledUsers,
        admins: adminUsers,
        staff: staffUsers,
      }
    }

    // Get product statistics (admin only)
    let productStats = null
    if (user.role === "ADMIN") {
      const totalProducts = await prisma.product.count()
      const activeProducts = await prisma.product.count({ where: { isActive: true } })
      const inactiveProducts = await prisma.product.count({ where: { isActive: false } })

      productStats = {
        total: totalProducts,
        active: activeProducts,
        inactive: inactiveProducts,
      }
    }

    // Get delivery statistics
    let deliveryStats = null
    if (user.role === "ADMIN") {
      const totalShipments = await prisma.deliveryShipment.count()
      const activeShipments = await prisma.deliveryShipment.count({
        where: {
          status: {
            in: ["PENDING", "CONFIRMED", "PICKED_UP", "IN_TRANSIT", "OUT_FOR_DELIVERY"]
          }
        }
      })
      const completedShipments = await prisma.deliveryShipment.count({
        where: {
          status: "DELIVERED"
        }
      })

      const totalAgencies = await prisma.deliveryAgency.count()
      const enabledAgencies = await prisma.deliveryAgency.count({ where: { enabled: true } })

      deliveryStats = {
        totalShipments,
        activeShipments,
        completedShipments,
        totalAgencies,
        enabledAgencies
      }
    }

    // Calculate rates and percentages
    const deliveryRate = totalOrders > 0 ? Math.round((deliveredOrders / totalOrders) * 100 * 100) / 100 : 0
    const returnRate = totalOrders > 0 ? Math.round((returnedOrders / totalOrders) * 100 * 100) / 100 : 0
    const completionRate = totalOrders > 0 ? Math.round(((deliveredOrders + shippedOrders) / totalOrders) * 100 * 100) / 100 : 0

    // Get recent activity count (last 24 hours)
    let recentActivityCount = 0
    if (user.role === "ADMIN") {
      const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000)
      recentActivityCount = await prisma.activity.count({
        where: {
          createdAt: { gte: dayAgo }
        }
      })
    } else {
      const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000)
      recentActivityCount = await prisma.activity.count({
        where: {
          userId: user.id,
          createdAt: { gte: dayAgo }
        }
      })
    }

    const stats = {
      orders: {
        total: totalOrders,
        pending: pendingOrders,
        confirmed: confirmedOrders,
        processing: processingOrders,
        uploaded: uploadedOrders,
        inTransit: inTransitOrders,
        shipped: shippedOrders,
        delivered: deliveredOrders,
        returned: returnedOrders,
        cancelled: cancelledOrders,
        deliveryRate,
        returnRate,
        completionRate
      },
      revenue: {
        total: Number(totalRevenueResult._sum.total) || 0,
        monthly: Number(monthlyRevenueResult._sum.total) || 0,
        weekly: Number(weeklyRevenueResult._sum.total) || 0,
        daily: Number(dailyRevenueResult._sum.total) || 0,
      },
      users: userStats,
      products: productStats,
      delivery: deliveryStats,
      activity: {
        recent: recentActivityCount
      }
    }

    console.log("✅ Stats retrieved for user:", user.username)

    return NextResponse.json({ 
      success: true,
      stats,
      user: {
        id: user.id,
        username: user.username,
        role: user.role
      }
    })
  } catch (error) {
    console.error("❌ Get stats API error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}