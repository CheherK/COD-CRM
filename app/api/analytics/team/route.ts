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
        const totalOrders = await prisma.order.count({
          where: { confirmedById: teamUser.id },
        })

        const completedOrders = await prisma.order.count({
          where: { 
            confirmedById: teamUser.id, 
            status: "DELIVERED" 
          },
        })

        const processingOrders = await prisma.order.count({
          where: { 
            confirmedById: teamUser.id, 
            status: { in: ["PROCESSING", "SHIPPED", "IN_TRANSIT"] }
          },
        })

        // Calculate revenue from completed orders
        const revenueResult = await prisma.order.aggregate({
          _sum: { total: true },
          where: { 
            confirmedById: teamUser.id, 
            status: "DELIVERED" 
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

        // Get order status breakdown
        const ordersByStatus = await prisma.order.groupBy({
          by: ['status'],
          _count: { status: true },
          where: { confirmedById: teamUser.id }
        })

        const statusBreakdown = ordersByStatus.reduce((acc, item) => {
          acc[item.status] = item._count.status
          return acc
        }, {} as Record<string, number>)

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
            completionRate: totalOrders > 0 ? Math.round((completedOrders / totalOrders) * 100 * 100) / 100 : 0,
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

    // Calculate team performance summary
    const teamSummary = {
      totalMembers: users.length,
      totalOrders: teamStats.reduce((sum, member) => sum + member.metrics.totalOrders, 0),
      totalCompletedOrders: teamStats.reduce((sum, member) => sum + member.metrics.completedOrders, 0),
      totalRevenue: teamStats.reduce((sum, member) => sum + member.metrics.revenue, 0),
      averageCompletionRate: teamStats.length > 0 
        ? Math.round((teamStats.reduce((sum, member) => sum + member.metrics.completionRate, 0) / teamStats.length) * 100) / 100 
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

    console.log("✅ Team analytics retrieved")

    return NextResponse.json({
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
      }
    })
  } catch (error) {
    console.error("❌ Get team analytics API error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}