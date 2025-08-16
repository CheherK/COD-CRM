import { type NextRequest, NextResponse } from "next/server"
import { verifyToken } from "@/lib/auth-server"
import prisma from "@/lib/prisma"
import { logOrderActivity } from "@/lib/activity-logger"

export async function POST(request: NextRequest) {
  try {
    console.log("=== BULK ORDER ACTION API CALLED ===")

    const token = request.cookies.get("auth-token")?.value

    if (!token) {
      return NextResponse.json({ error: "No token provided" }, { status: 401 })
    }

    const user = verifyToken(token)

    if (!user) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 })
    }

    const { orderIds, action, status } = await request.json()

    if (!orderIds || !Array.isArray(orderIds) || orderIds.length === 0) {
      return NextResponse.json({ error: "Order IDs are required" }, { status: 400 })
    }

    if (!action) {
      return NextResponse.json({ error: "Action is required" }, { status: 400 })
    }

    console.log(`Performing bulk action: ${action} on ${orderIds.length} orders`)

    const result: any = { success: true }

    switch (action) {
      case "delete":
        if (user.role !== "ADMIN") {
          return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
        }

        let deletedCount = 0
        for (const orderId of orderIds) {
          const success = await prisma.deleteOrder(orderId)
          if (success) deletedCount++
        }

        await logOrderActivity(
          "ORDERS_BULK_DELETED",
          `${deletedCount} orders bulk deleted by ${user.username}`,
          request,
          user.id,
        )

        result.deletedCount = deletedCount
        break

      case "updateStatus":
        if (!status) {
          return NextResponse.json({ error: "Status is required for update action" }, { status: 400 })
        }

        let updatedCount = 0
        for (const orderId of orderIds) {
          const updated = await prisma.updateOrder(orderId, { status })
          if (updated) updatedCount++
        }

        await logOrderActivity(
          "ORDERS_BULK_UPDATED",
          `${updatedCount} orders status updated to ${status} by ${user.username}`,
          request,
          user.id,
        )

        result.updatedCount = updatedCount
        break

      case "export":
        // Get orders for export
        const orders = []
        for (const orderId of orderIds) {
          const order = await prisma.findOrderById(orderId)
          if (order) orders.push(order)
        }

        // Create CSV content
        const csvHeaders = "ID,Customer Name,Customer Email,Customer Phone,Status,Total Amount,Created At\n"
        const csvRows = orders
          .map(
            (order) =>
              `${order.id},"${order.customerName}","${order.customerEmail}","${order.customerPhone}","${order.status}",${order.totalAmount},"${order.createdAt}"`,
          )
          .join("\n")
        const csvContent = csvHeaders + csvRows

        await logOrderActivity(
          "ORDERS_EXPORTED",
          `${orders.length} orders exported by ${user.username}`,
          request,
          user.id,
        )

        return new NextResponse(csvContent, {
          headers: {
            "Content-Type": "text/csv",
            "Content-Disposition": "attachment; filename=orders-export.csv",
          },
        })

      default:
        return NextResponse.json({ error: "Invalid action" }, { status: 400 })
    }

    console.log(`✅ Bulk action ${action} completed`)
    return NextResponse.json(result)
  } catch (error) {
    console.error("❌ Bulk order action API error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
