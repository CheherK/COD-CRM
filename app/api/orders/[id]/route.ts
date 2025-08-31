import { type NextRequest, NextResponse } from "next/server"
import { verifyToken } from "@/lib/auth-server"
import prisma from "@/lib/prisma"

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

    const order = await prisma.order.findUnique({
      where: { id: params.id },
      include: {
        items: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                nameEn: true,
                nameFr: true,
                price: true,
                imageUrl: true
              }
            }
          }
        },
        confirmedBy: {
          select: {
            id: true,
            username: true,
            firstName: true,
            lastName: true,
            email: true
          }
        },
        statusHistory: {
          orderBy: {
            createdAt: 'desc'
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
          }
        },
        shipments: {
          include: {
            agency: {
              select: {
                id: true,
                name: true
              }
            },
            statusLogs: {
              orderBy: {
                timestamp: 'desc'
              },
              take: 10
            }
          }
        }
      }
    })

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 })
    }

    // Format the order response
    const formattedOrder = {
      id: order.id,
      customerName: order.customerName,
      customerPhone1: order.customerPhone1,
      customerPhone2: order.customerPhone2,
      customerEmail: order.customerEmail,
      customerAddress: order.customerAddress,
      customerCity: order.customerCity,
      status: order.status,
      deliveryCompany: order.deliveryCompany,
      total: Number(order.total),
      deliveryPrice: order.deliveryPrice ? Number(order.deliveryPrice) : null,
      notes: order.notes,
      attemptCount: order.attemptCount,
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
      confirmedBy: order.confirmedBy,
      items: order.items.map(item => ({
        id: item.id,
        quantity: item.quantity,
        price: Number(item.price),
        total: Number(item.price) * item.quantity,
        product: item.product,
        productId: item.productId
      })),
      statusHistory: order.statusHistory,
      shipments: order.shipments.map(shipment => ({
        id: shipment.id,
        trackingNumber: shipment.trackingNumber,
        barcode: shipment.barcode,
        status: shipment.status,
        lastStatusUpdate: shipment.lastStatusUpdate,
        agency: shipment.agency,
        statusLogs: shipment.statusLogs,
        createdAt: shipment.createdAt,
        updatedAt: shipment.updatedAt
      }))
    }

    console.log("✅ Order retrieved:", order.id)

    return NextResponse.json({ order: formattedOrder })
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

    const order = await prisma.order.findUnique({
      where: { id: params.id },
      include: {
        items: true
      }
    })

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 })
    }

    const updateData = await request.json()
    console.log("Updating order:", order.id)

    // Track what changed for status history
    const oldStatus = order.status
    const newStatus = updateData.status || order.status

    // Handle attempt count for ATTEMPT statuses
    let attemptCount = order.attemptCount
    if (newStatus.startsWith('ATTEMPT_')) {
      const attemptNum = parseInt(newStatus.split('_')[1])
      attemptCount = Math.max(attemptCount, attemptNum)
    }

    // Calculate new total if items are updated
    let totalAmount = Number(order.total)
    if (updateData.items) {
      const itemsTotal = updateData.items.reduce((sum: number, item: any) => 
        sum + (item.price * item.quantity), 0
      )
      const deliveryPrice = updateData.deliveryPrice || 0
      totalAmount = itemsTotal + deliveryPrice
    }

    // Update order in a transaction
    const updatedOrder = await prisma.$transaction(async (tx) => {
      // Update the order
      const updated = await tx.order.update({
        where: { id: params.id },
        data: {
          customerName: updateData.customerName || order.customerName,
          customerPhone1: updateData.customerPhone1 || order.customerPhone1,
          customerPhone2: updateData.customerPhone2 !== undefined ? updateData.customerPhone2 : order.customerPhone2,
          customerEmail: updateData.customerEmail !== undefined ? updateData.customerEmail : order.customerEmail,
          customerAddress: updateData.customerAddress || order.customerAddress,
          customerCity: updateData.customerCity || order.customerCity,
          status: newStatus,
          deliveryCompany: updateData.deliveryCompany !== undefined ? updateData.deliveryCompany : order.deliveryCompany,
          total: totalAmount,
          deliveryPrice: updateData.deliveryPrice !== undefined 
            ? (updateData.deliveryPrice > 0 ? updateData.deliveryPrice : null)
            : order.deliveryPrice,
          notes: updateData.notes !== undefined ? updateData.notes : order.notes,
          attemptCount: attemptCount,
          confirmedById: updateData.confirmedByID || order.confirmedById
        }
      })

      // Update items if provided
      if (updateData.items) {
        // Delete existing items
        await tx.orderItem.deleteMany({
          where: { orderId: params.id }
        })

        // Create new items
        for (const item of updateData.items) {
          await tx.orderItem.create({
            data: {
              orderId: params.id,
              productId: item.productId,
              quantity: item.quantity,
              price: item.price
            }
          })
        }
      }

      // Add status history if status changed or if there's a status note
      if (oldStatus !== newStatus || updateData.statusNote) {
        const statusNote = updateData.statusNote || `Status changed from ${oldStatus} to ${newStatus}`
        
        await tx.orderStatusHistory.create({
          data: {
            orderId: params.id,
            status: newStatus,
            notes: statusNote,
            userId: user.id
          }
        })
      }

      // Create shipment if status changed to UPLOADED and delivery company is selected
      if (oldStatus !== newStatus && 
          newStatus === "UPLOADED" && 
          updateData.deliveryCompany) {
        try {
          // This would integrate with delivery service
          console.log(`Creating shipment for order ${params.id} with ${updateData.deliveryCompany}`)
          
          // For now, we'll just add a note in status history
          await tx.orderStatusHistory.create({
            data: {
              orderId: params.id,
              status: newStatus,
              notes: `Shipment created with ${updateData.deliveryCompany}`,
              userId: user.id
            }
          })
        } catch (error) {
          console.error("Failed to create shipment:", error)
          // Don't fail the whole transaction
        }
      }

      // Log activity
      await tx.activity.create({
        data: {
          type: "ORDER_UPDATED",
          description: `Order ${params.id} updated by ${user.username}`,
          userId: user.id,
          metadata: {
            orderId: params.id,
            changes: updateData,
            oldStatus: oldStatus,
            newStatus: newStatus
          },
          ipAddress: request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "127.0.0.1",
          userAgent: request.headers.get("user-agent") || "unknown"
        }
      })

      return updated
    })

    // Fetch complete updated order
    const completeOrder = await prisma.order.findUnique({
      where: { id: params.id },
      include: {
        items: {
          include: {
            product: true
          }
        },
        confirmedBy: {
          select: {
            id: true,
            username: true,
            firstName: true,
            lastName: true
          }
        },
        statusHistory: {
          orderBy: {
            createdAt: 'desc'
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
          }
        }
      }
    })

    console.log("✅ Order updated:", updatedOrder.id)

    return NextResponse.json({
      success: true,
      order: completeOrder,
      message: "Order updated successfully"
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

    const order = await prisma.order.findUnique({
      where: { id: params.id }
    })

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 })
    }

    // Delete order in transaction (cascade will handle related records)
    await prisma.$transaction(async (tx) => {
      // Log activity before deletion
      await tx.activity.create({
        data: {
          type: "ORDER_DELETED",
          description: `Order ${params.id} deleted by ${user.username}`,
          userId: user.id,
          metadata: {
            orderId: params.id,
            customerName: order.customerName,
            status: order.status,
            total: Number(order.total)
          },
          ipAddress: request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "127.0.0.1",
          userAgent: request.headers.get("user-agent") || "unknown"
        }
      })

      // Delete the order (cascade deletes related records)
      await tx.order.delete({
        where: { id: params.id }
      })
    })

    console.log("✅ Order deleted:", order.id)

    return NextResponse.json({ 
      success: true,
      message: "Order deleted successfully"
    })
  } catch (error) {
    console.error("❌ Delete order API error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}