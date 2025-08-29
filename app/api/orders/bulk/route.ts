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

    const { orderIds, action, status, assignedToId } = await request.json()

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

        const { count: deletedCount } = await prisma.order.deleteMany({
          where: {
            id: { in: orderIds }
          }
        })

        await logOrderActivity(
          "BULK_DELETED",
          `${deletedCount} orders bulk deleted by ${user.username}`,
          request,
          user.id,
          undefined,
          { orderIds, deletedCount }
        )

        result.deletedCount = deletedCount
        break

      case "updateStatus":
        if (!status) {
          return NextResponse.json({ error: "Status is required for update action" }, { status: 400 })
        }

        const { count: updatedCount } = await prisma.order.updateMany({
          where: {
            id: { in: orderIds }
          },
          data: { status }
        })

        // Create status history entries for bulk update
        await prisma.orderStatusHistory.createMany({
          data: orderIds.map(orderId => ({
            orderId,
            status,
            notes: `Bulk status update to ${status}`,
            userId: user.id
          }))
        })

        await logOrderActivity(
          "BULK_STATUS_UPDATED",
          `${updatedCount} orders status updated to ${status} by ${user.username}`,
          request,
          user.id,
          undefined,
          { orderIds, status, updatedCount }
        )

        result.updatedCount = updatedCount
        break

      case "assign":
        if (!assignedToId) {
          return NextResponse.json({ error: "Assigned user ID is required for assign action" }, { status: 400 })
        }

        // Verify the assigned user exists
        const assignedUser = await prisma.user.findUnique({
          where: { id: assignedToId },
          select: { id: true, username: true }
        })

        if (!assignedUser) {
          return NextResponse.json({ error: "Assigned user not found" }, { status: 404 })
        }

        const { count: assignedCount } = await prisma.order.updateMany({
          where: {
            id: { in: orderIds }
          },
          data: { assignedToId }
        })

        await logOrderActivity(
          "BULK_ASSIGNED",
          `${assignedCount} orders assigned to ${assignedUser.username} by ${user.username}`,
          request,
          user.id,
          undefined,
          { orderIds, assignedToId, assignedCount }
        )

        result.assignedCount = assignedCount
        break

      case "export":
        // Get orders for export
        const orders = await prisma.order.findMany({
          where: {
            id: { in: orderIds }
          },
          include: {
            items: {
              include: {
                product: {
                  select: {
                    name: true
                  }
                }
              }
            }
          }
        })

        // Create CSV content
        const csvHeaders = "ID,Customer Name,Customer Phone,Customer Email,Status,Total,Items,Created At\n"
        const csvRows = orders
          .map((order) => {
            const itemsText = order.items.map(item => 
              `${item.product?.name || 'Unknown'} (${item.quantity}x)`
            ).join('; ')
            
            return `${order.id},"${order.customerName}","${order.customerPhone1}","${order.customerEmail || ''}","${order.status}",${order.total},"${itemsText}","${order.createdAt.toISOString()}"`
          })
          .join("\n")
        const csvContent = csvHeaders + csvRows

        await logOrderActivity(
          "BULK_EXPORTED",
          `${orders.length} orders exported by ${user.username}`,
          request,
          user.id,
          undefined,
          { orderIds, exportedCount: orders.length }
        )

        return new NextResponse(csvContent, {
          headers: {
            "Content-Type": "text/csv",
            "Content-Disposition": `attachment; filename=orders-export-${new Date().toISOString().split('T')[0]}.csv`,
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
