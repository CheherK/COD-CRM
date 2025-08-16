import { type NextRequest, NextResponse } from "next/server"
import { verifyToken } from "@/lib/auth-server"
import { mockPrisma } from "@/lib/prisma"

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

    // Get order statistics
    const totalOrders = await mockPrisma.order.count()
    const pendingOrders = await mockPrisma.order.count({ where: { status: "PENDING" } })
    const processingOrders = await mockPrisma.order.count({ where: { status: "PROCESSING" } })
    const shippedOrders = await mockPrisma.order.count({ where: { status: "SHIPPED" } })
    const deliveredOrders = await mockPrisma.order.count({ where: { status: "DELIVERED" } })

    // Get revenue statistics
    const totalRevenue = await mockPrisma.order.aggregate({
      _sum: { totalAmount: true },
      where: { status: { in: ["DELIVERED", "SHIPPED"] } },
    })

    const monthlyRevenue = await mockPrisma.order.aggregate({
      _sum: { totalAmount: true },
      where: {
        status: { in: ["DELIVERED", "SHIPPED"] },
        createdAt: { gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1) },
      },
    })

    // Get user statistics (admin only)
    let userStats = null
    if (user.role === "ADMIN") {
      const totalUsers = await mockPrisma.user.count()
      const activeUsers = await mockPrisma.user.count({ where: { status: "ENABLED" } })
      const adminUsers = await mockPrisma.user.count({ where: { role: "ADMIN" } })
      const staffUsers = await mockPrisma.user.count({ where: { role: "STAFF" } })

      userStats = {
        total: totalUsers,
        active: activeUsers,
        admins: adminUsers,
        staff: staffUsers,
      }
    }

    const stats = {
      orders: {
        total: totalOrders,
        pending: pendingOrders,
        processing: processingOrders,
        shipped: shippedOrders,
        delivered: deliveredOrders,
      },
      revenue: {
        total: totalRevenue._sum.totalAmount || 0,
        monthly: monthlyRevenue._sum.totalAmount || 0,
      },
      users: userStats,
    }

    console.log("✅ Stats retrieved")

    return NextResponse.json({ stats })
  } catch (error) {
    console.error("❌ Get stats API error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
