import { type NextRequest, NextResponse } from "next/server"
import { verifyToken } from "@/lib/auth-server"
import prisma from "@/lib/prisma"
import { logOrderActivity } from "@/lib/activity-logger"

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    console.log("=== GET ORDER BY ID API CALLED ===")

    const token = request.cookies.get("auth-token")?.value

    if (!token) {
      return NextResponse.json({ error: "No token provided" }, { status: 401 })
    }

    const user = verifyToken(token)

    if (!user) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 })
    }

    const order = await prisma.findOrderById(params.id)

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 })
    }

    console.log("✅ Order retrieved:", order.id)

    return NextResponse.json({ order })
  } catch (error) {
    console.error("❌ Get order by ID API error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    console.log("=== UPDATE ORDER API CALLED ===")

    const token = request.cookies.get("auth-token")?.value

    if (!token) {
      return NextResponse.json({ error: "No token provided" }, { status: 401 })
    }

    const user = verifyToken(token)

    if (!user) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 })
    }

    const order = await prisma.findOrderById(params.id)

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 })
    }

    const updateData = await request.json()
    console.log("Updating order:", order.id)

    // Calculate new total if items are updated
    const items = updateData.items || order.items
    const itemsTotal = items.reduce((sum: number, item: any) => sum + item.price * item.quantity, 0)
    const deliveryPrice = updateData.deliveryPrice || 0
    const totalAmount = itemsTotal + deliveryPrice

    // Prepare update data
    const orderUpdateData = {
      customerName: updateData.customerName || order.customerName,
      customerEmail: updateData.customerEmail || order.customerEmail,
      customerPhone: updateData.customerPhone || order.customerPhone,
      status: updateData.status || order.status,
      totalAmount,
      shippingAddress: updateData.customerAddress || order.shippingAddress,
      notes: updateData.privateNote || order.notes,
      items: items.map((item: any, index: number) => ({
        id: item.id || `item-${Date.now()}-${index}`,
        productName: item.productId || item.productName,
        quantity: item.quantity,
        price: item.price,
        total: item.price * item.quantity,
      })),
    }

    const updatedOrder = await prisma.updateOrder(params.id, orderUpdateData)

    if (!updatedOrder) {
      return NextResponse.json({ error: "Failed to update order" }, { status: 500 })
    }

    // Log order update
    await logOrderActivity("ORDER_UPDATED", `Order ${order.id} updated by ${user.username}`, request, user.id, order.id)

    console.log("✅ Order updated:", updatedOrder.id)

    return NextResponse.json({
      order: updatedOrder,
      id: updatedOrder.id,
      customerName: updatedOrder.customerName,
      customerEmail: updatedOrder.customerEmail,
      customerPhone: updatedOrder.customerPhone,
      customerAddress: updatedOrder.shippingAddress,
      customerCity: updateData.customerCity || "",
      status: updatedOrder.status,
      deliveryCompany: updateData.deliveryCompany,
      deliveryPrice: deliveryPrice,
      deliveryCost: updateData.deliveryCost || 0,
      privateNote: updatedOrder.notes,
      attemptCount: updateData.attemptCount || 0,
      total: totalAmount,
      items: updatedOrder.items,
      createdAt: updatedOrder.createdAt,
      updatedAt: updatedOrder.updatedAt,
    })
  } catch (error) {
    console.error("❌ Update order API error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    console.log("=== DELETE ORDER API CALLED ===")

    const token = request.cookies.get("auth-token")?.value

    if (!token) {
      return NextResponse.json({ error: "No token provided" }, { status: 401 })
    }

    const user = verifyToken(token)

    if (!user || user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }

    const order = await prisma.findOrderById(params.id)

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 })
    }

    const success = await prisma.deleteOrder(params.id)

    if (!success) {
      return NextResponse.json({ error: "Failed to delete order" }, { status: 500 })
    }

    // Log order deletion
    await logOrderActivity("ORDER_DELETED", `Order ${order.id} deleted by ${user.username}`, request, user.id, order.id)

    console.log("✅ Order deleted:", order.id)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("❌ Delete order API error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
