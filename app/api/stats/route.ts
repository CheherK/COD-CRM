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
    const abandonedOrders = await prisma.order.count({ 
      where: { ...orderWhereClause, status: "ABANDONED" } 
    })
    const attemptedOrders = await prisma.order.count({ 
      where: { ...orderWhereClause, status: "ATTEMPTED" } 
    })
    const confirmedOrders = await prisma.order.count({ 
      where: { ...orderWhereClause, status: "CONFIRMED" } 
    })
    const uploadedOrders = await prisma.order.count({ 
      where: { ...orderWhereClause, status: "UPLOADED" } 
    })
    const deletedOrders = await prisma.order.count({ 
      where: { ...orderWhereClause, status: "DELETED" } 
    })
    const rejectedOrders = await prisma.order.count({ 
      where: { ...orderWhereClause, status: "REJECTED" } 
    })
    const archivedOrders = await prisma.order.count({ 
      where: { ...orderWhereClause, status: "ARCHIVED" } 
    })

    // Get delivery status counts
    const depositOrders = await prisma.deliveryShipment.count({ where: { status: "DEPOSIT" } })
    const inTransitOrders = await prisma.deliveryShipment.count({ where: { status: "IN_TRANSIT" } })
    const deliveredOrders = await prisma.deliveryShipment.count({ where: { status: "DELIVERED" } })
    const returnedOrders = await prisma.deliveryShipment.count({ where: { status: "RETURNED" } })

    // Get revenue from delivered orders (using DeliveryShipment status)
    const totalRevenueResult = await prisma.order.aggregate({
      _sum: { total: true },
      where: {
        ...orderWhereClause,
        shipments: {
          some: {
            status: "DELIVERED"
          }
        }
      },
    })

    // Get time-based revenue and order counts
    const now = new Date()
    
    // Today
    const todayStart = new Date(now)
    todayStart.setHours(0, 0, 0, 0)
    const todayEnd = new Date(now)
    todayEnd.setHours(23, 59, 59, 999)

    // This week (Monday to Sunday)
    const weekStart = new Date(now)
    const dayOfWeek = now.getDay()
    const daysToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek
    weekStart.setDate(now.getDate() + daysToMonday)
    weekStart.setHours(0, 0, 0, 0)

    // This month
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    monthStart.setHours(0, 0, 0, 0)

    // Previous 2 weeks for chart data
    const twoWeeksAgo = new Date(now)
    twoWeeksAgo.setDate(now.getDate() - 14)
    twoWeeksAgo.setHours(0, 0, 0, 0)

    // Daily revenue and order counts for today
    const dailyRevenueResult = await prisma.order.aggregate({
      _sum: { total: true },
      _count: true,
      where: {
        ...orderWhereClause,
        createdAt: { gte: todayStart, lte: todayEnd }
      },
    })

    // Weekly revenue and order counts
    const weeklyRevenueResult = await prisma.order.aggregate({
      _sum: { total: true },
      _count: true,
      where: {
        ...orderWhereClause,
        createdAt: { gte: weekStart }
      },
    })

    // Monthly revenue and order counts
    const monthlyRevenueResult = await prisma.order.aggregate({
      _sum: { total: true },
      _count: true,
      where: {
        ...orderWhereClause,
        createdAt: { gte: monthStart }
      },
    })

    // Get daily order data for the past 2 weeks
    const dailyOrdersData = await prisma.order.groupBy({
      by: ['createdAt'],
      _count: {
        id: true
      },
      _sum: {
        total: true
      },
      where: {
        ...orderWhereClause,
        createdAt: { gte: twoWeeksAgo }
      },
      orderBy: {
        createdAt: 'asc'
      }
    })

    // Process daily data into chart format
    const chartData = []
    for (let i = 0; i < 14; i++) {
      const date = new Date(twoWeeksAgo)
      date.setDate(twoWeeksAgo.getDate() + i)
      
      const dayStart = new Date(date)
      dayStart.setHours(0, 0, 0, 0)
      const dayEnd = new Date(date)
      dayEnd.setHours(23, 59, 59, 999)
      
      // Get orders for this specific day
      const dayOrders = await prisma.order.aggregate({
        _count: true,
        _sum: { total: true },
        where: {
          ...orderWhereClause,
          createdAt: { gte: dayStart, lte: dayEnd }
        }
      })
      
      chartData.push({
        date: date.toISOString().split('T')[0],
        day: date.toLocaleDateString('en-US', { weekday: 'short' }),
        orders: dayOrders._count || 0,
        revenue: Number(dayOrders._sum.total) || 0
      })
    }

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
            in: ["UPLOADED", "DEPOSIT", "IN_TRANSIT"]
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
    const completionRate = totalOrders > 0 ? Math.round(((deliveredOrders + depositOrders + inTransitOrders) / totalOrders) * 100 * 100) / 100 : 0

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
        abandoned: abandonedOrders,
        attempted: attemptedOrders,
        confirmed: confirmedOrders,
        uploaded: uploadedOrders,
        deleted: deletedOrders,
        rejected: rejectedOrders,
        archived: archivedOrders,
        deposit: depositOrders,
        inTransit: inTransitOrders,
        delivered: deliveredOrders,
        returned: returnedOrders,
        deliveryRate,
        returnRate,
        completionRate
      },
      revenue: {
        total: Number(totalRevenueResult._sum.total) || 0,
        daily: Number(dailyRevenueResult._sum.total) || 0,
        weekly: Number(weeklyRevenueResult._sum.total) || 0,
        monthly: Number(monthlyRevenueResult._sum.total) || 0,
      },
      orderCounts: {
        daily: dailyRevenueResult._count || 0,
        weekly: weeklyRevenueResult._count || 0,
        monthly: monthlyRevenueResult._count || 0,
      },
      chartData,
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