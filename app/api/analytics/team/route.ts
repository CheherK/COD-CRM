import { type NextRequest, NextResponse } from "next/server"
import { verifyToken } from "@/lib/auth-server"
import { mockPrisma } from "@/lib/prisma"

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
    const users = await mockPrisma.user.findMany({
      where: { role: "STAFF", status: "ENABLED" },
    })

    const teamStats = await Promise.all(
      users.map(async (teamUser) => {
        const totalOrders = await mockPrisma.order.count({
          where: { assignedTo: teamUser.id },
        })

        const completedOrders = await mockPrisma.order.count({
          where: { assignedTo: teamUser.id, status: "DELIVERED" },
        })

        const revenue = await mockPrisma.order.aggregate({
          _sum: { totalAmount: true },
          where: { assignedTo: teamUser.id, status: "DELIVERED" },
        })

        return {
          user: {
            id: teamUser.id,
            name: `${teamUser.firstName} ${teamUser.lastName}`,
            username: teamUser.username,
          },
          metrics: {
            totalOrders,
            completedOrders,
            completionRate: totalOrders > 0 ? (completedOrders / totalOrders) * 100 : 0,
            revenue: revenue._sum.totalAmount || 0,
          },
        }
      }),
    )

    // Get activity data
    const activities = await mockPrisma.activity.findMany({
      where: { type: { in: ["ORDER", "USER"] } },
      orderBy: { createdAt: "desc" },
      take: 100,
    })

    console.log("✅ Team analytics retrieved")

    return NextResponse.json({
      teamStats,
      activities,
    })
  } catch (error) {
    console.error("❌ Get team analytics API error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
