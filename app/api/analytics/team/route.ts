// app/api/analytics/team/route.ts
import { type NextRequest, NextResponse } from "next/server"
import { verifyToken } from "@/lib/auth-server"
import prisma from "@/lib/prisma"

export async function GET(request: NextRequest) {
  try {
    console.log("=== GET TEAM ANALYTICS API CALLED ===")

    const token = request.cookies.get("auth-token")?.value

    if (!token) {
      return NextResponse.json({ error: "No token provided" }, { status: 401 })
    }

    const user = verifyToken(token)

    if (!user || user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }

    // Get team performance data
    const users = await prisma.user.findMany({
      where: { 
        role: "STAFF", 
        status: "ENABLED" 
      },
      select: {
        id: true,
        username: true,
        firstName: true,
        lastName: true,
        email: true,
        createdAt: true
      }
    })

    const teamStats = await Promise.all(
      users.map(async (teamUser) => {
        // Total orders confirmed by this user
        const totalOrders = await prisma.order.count({
          where: { confirmedById: teamUser.id },
        })

        // Completed orders (DELIVERED status)
        const completedOrders = await prisma.order.count({
          where: { 
            confirmedById: teamUser.id,
            shipments: {
              some: {
                status: "DELIVERED"
              }
            }
          },
        })

        // Processing orders (CONFIRMED, UPLOADED, DEPOSIT, IN_TRANSIT)
        const processingOrders = await prisma.order.count({
          where: { 
            confirmedById: teamUser.id,
            OR: [
              { status: { in: ["CONFIRMED", "UPLOADED"] } },
              {
                shipments: {
                  some: {
                    status: { in: ["DEPOSIT", "IN_TRANSIT"] }
                  }
                }
              }
            ]
          },
        })

        // CALL TRACKING: Count call attempts based on attemptCount field
        const callAttempts = await prisma.order.aggregate({
          _sum: { attemptCount: true },
          where: { 
            confirmedById: teamUser.id,
            // Only count orders that had attempts (attemptCount > 0)
            attemptCount: { gt: 0 }
          },
        })

        // Count orders that went from PENDING to any attempt status
        const ordersWithAttempts = await prisma.order.count({
          where: { 
            confirmedById: teamUser.id,
            attemptCount: { gt: 0 }
          },
        })

        // REJECTED orders by this staff member
        const rejectedOrders = await prisma.order.count({
          where: { 
            confirmedById: teamUser.id,
            status: "REJECTED"
          },
        })

        // DELETED orders by this staff member (check status history for who marked it as deleted)
        const deletedOrdersCount = await prisma.orderStatusHistory.count({
          where: {
            userId: teamUser.id,
            status: "DELETED"
          }
        })

        // CONFIRMED orders (successfully confirmed after attempts)
        const confirmedOrders = await prisma.order.count({
          where: { 
            confirmedById: teamUser.id,
            status: { in: ["CONFIRMED", "UPLOADED", "DEPOSIT", "IN_TRANSIT", "DELIVERED"] }
          },
        })

        // Calculate revenue from delivered orders
        const revenueResult = await prisma.order.aggregate({
          _sum: { total: true },
          where: { 
            confirmedById: teamUser.id,
            shipments: {
              some: {
                status: "DELIVERED"
              }
            }
          },
        })

        // Get recent activities count (last 30 days)
        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
        const recentActivities = await prisma.activity.count({
          where: {
            userId: teamUser.id,
            createdAt: {
              gte: thirtyDaysAgo
            }
          }
        })

        // Get order status breakdown for this user
        const ordersByStatus = await prisma.order.groupBy({
          by: ['status'],
          _count: { status: true },
          where: { confirmedById: teamUser.id }
        })

        const statusBreakdown = ordersByStatus.reduce((acc, item) => {
          acc[item.status] = item._count.status
          return acc
        }, {} as Record<string, number>)

        // Calculate call success rate (confirmed orders / total attempts made)
        const totalCallAttempts = Number(callAttempts._sum.attemptCount) || 0
        const callSuccessRate = totalCallAttempts > 0 
          ? Math.round((confirmedOrders / ordersWithAttempts) * 100 * 100) / 100 
          : 0

        // Calculate overall completion rate (delivered / total orders)
        const completionRate = totalOrders > 0 
          ? Math.round((completedOrders / totalOrders) * 100 * 100) / 100 
          : 0

        return {
          user: {
            id: teamUser.id,
            name: `${teamUser.firstName || ''} ${teamUser.lastName || ''}`.trim() || teamUser.username,
            username: teamUser.username,
            email: teamUser.email,
            joinedAt: teamUser.createdAt
          },
          metrics: {
            totalOrders,
            completedOrders,
            processingOrders,
            confirmedOrders,
            rejectedOrders,
            deletedOrders: deletedOrdersCount,
            
            // Call tracking metrics
            totalCallAttempts,
            ordersWithAttempts,
            callSuccessRate,
            
            // Existing metrics
            completionRate,
            revenue: Number(revenueResult._sum.total) || 0,
            recentActivities,
            statusBreakdown
          },
        }
      }),
    )

    // Get overall team activity data
    const totalActivities = await prisma.activity.count()
    
    const activitiesByType = await prisma.activity.groupBy({
      by: ['type'],
      _count: { type: true },
      orderBy: {
        _count: { type: 'desc' }
      },
      take: 10
    })

    // Get recent team activities
    const recentActivities = await prisma.activity.findMany({
      where: { 
        userId: { not: null },
        type: { in: ["ORDER_CREATED", "ORDER_UPDATED", "ORDER_STATUS_CHANGED", "USER_LOGIN"] }
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            firstName: true,
            lastName: true
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 20
    })

    // Calculate team performance summary with call tracking
    const teamSummary = {
      totalMembers: users.length,
      totalOrders: teamStats.reduce((sum, member) => sum + member.metrics.totalOrders, 0),
      totalCompletedOrders: teamStats.reduce((sum, member) => sum + member.metrics.completedOrders, 0),
      totalConfirmedOrders: teamStats.reduce((sum, member) => sum + member.metrics.confirmedOrders, 0),
      totalRejectedOrders: teamStats.reduce((sum, member) => sum + member.metrics.rejectedOrders, 0),
      totalDeletedOrders: teamStats.reduce((sum, member) => sum + member.metrics.deletedOrders, 0),
      totalCallAttempts: teamStats.reduce((sum, member) => sum + member.metrics.totalCallAttempts, 0),
      totalOrdersWithAttempts: teamStats.reduce((sum, member) => sum + member.metrics.ordersWithAttempts, 0),
      totalRevenue: teamStats.reduce((sum, member) => sum + member.metrics.revenue, 0),
      averageCompletionRate: teamStats.length > 0 
        ? Math.round((teamStats.reduce((sum, member) => sum + member.metrics.completionRate, 0) / teamStats.length) * 100) / 100 
        : 0,
      averageCallSuccessRate: teamStats.length > 0
        ? Math.round((teamStats.reduce((sum, member) => sum + member.metrics.callSuccessRate, 0) / teamStats.length) * 100) / 100
        : 0,
      topPerformer: teamStats.sort((a, b) => b.metrics.completedOrders - a.metrics.completedOrders)[0] || null
    }

    // Get daily activity trends (last 14 days)
    const fourteenDaysAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000)
    const dailyActivities = await prisma.activity.findMany({
      where: {
        createdAt: {
          gte: fourteenDaysAgo
        },
        userId: { not: null }
      },
      select: {
        createdAt: true,
        type: true
      }
    })

    // Group by day
    const dailyTrends: { [key: string]: number } = {}
    dailyActivities.forEach(activity => {
      const day = activity.createdAt.toISOString().split('T')[0]
      dailyTrends[day] = (dailyTrends[day] || 0) + 1
    })

    const activityTrend = Object.entries(dailyTrends).map(([date, count]) => ({
      date,
      activities: count
    })).sort((a, b) => a.date.localeCompare(b.date))

    console.log("✅ Team analytics retrieved with call tracking")

    const response = {
      teamStats,
      teamSummary,
      activities: {
        total: totalActivities,
        byType: activitiesByType.map(item => ({
          type: item.type,
          count: item._count.type
        })),
        recent: recentActivities.map(activity => ({
          id: activity.id,
          type: activity.type,
          description: activity.description,
          user: activity.user,
          createdAt: activity.createdAt,
          metadata: activity.metadata
        })),
        trend: activityTrend
      },
      lastUpdated: new Date().toISOString()
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error("❌ Get team analytics API error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}