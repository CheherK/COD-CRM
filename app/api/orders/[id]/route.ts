import { type NextRequest, NextResponse } from "next/server"
import { verifyToken } from "@/lib/auth-server"
import prisma from "@/lib/prisma"
import { OrderItem } from "@prisma/client";

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    console.log("=== GET FULL ORDER DETAILS API CALLED ===")

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
      select: {
        id: true,
        customerName: true,
        customerPhone1: true,
        customerPhone2: true,
        customerEmail: true,
        customerAddress: true,
        customerCity: true,
        status: true,
        deliveryCompany: true,
        total: true,
        deliveryPrice: true,
        notes: true,
        attemptCount: true,
        createdAt: true,
        updatedAt: true,
        confirmedBy: {
          select: {
            id: true,
            username: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        items: {
          select: {
            id: true,
            quantity: true,
            price: true,
            productId: true,
            product: {
              select: {
                id: true,
                name: true,
                nameEn: true,
                nameFr: true,
                price: true,
                imageUrl: true,
              },
            },
          },
        },
        statusHistory: {
          orderBy: {
            createdAt: 'asc',
          },
          select: {
            id: true,
            status: true,
            notes: true,
            createdAt: true,
            user: {
              select: {
                id: true,
                username: true,
                firstName: true,
                lastName: true,
              },
            },
          },
        },
        shipments: {
          select: {
            id: true,
            trackingNumber: true,
            barcode: true,
            status: true,
            lastStatusUpdate: true,
            printUrl: true,
            createdAt: true,
            updatedAt: true,
            agency: {
              select: {
                id: true,
                name: true,
              },
            },
            statusLogs: {
              orderBy: {
                timestamp: 'desc',
              },
              take: 10,
              select: {
                id: true,
                status: true,
                statusCode: true,
                message: true,
                timestamp: true,
                source: true,
              },
            },
          },
        },
      },
    })

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 })
    }

    // Efficient response formatting
    const subtotal = order.items.reduce((sum, item) => sum + (Number(item.price) * item.quantity), 0)
    const totalItems = order.items.reduce((sum, item) => sum + item.quantity, 0)

    const formattedOrder = {
      ...order,
      total: Number(order.total),
      deliveryPrice: order.deliveryPrice ? Number(order.deliveryPrice) : null,
      items: order.items.map(item => ({
        ...item,
        price: Number(item.price),
        total: Number(item.price) * item.quantity,
      })),
      // Computed fields
      subtotal,
      totalItems,
      firstProduct: order.items[0]?.product || null,
      hasMultipleProducts: order.items.length > 1,
    }

    const response = NextResponse.json({ 
      order: formattedOrder,
      success: true 
    })

    // Cache individual orders for longer
    // response.headers.set('Cache-Control', 's-maxage=300, stale-while-revalidate=600')
    
    return response

  } catch (error) {
    console.error("❌ Get full order details API error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    console.log("=== UPDATE ORDER API CALLED ===")
    const startTime = Date.now()

    const token = request.cookies.get("auth-token")?.value

    if (!token) {
      return NextResponse.json({ error: "No token provided" }, { status: 401 })
    }

    const user = verifyToken(token)

    if (!user) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 })
    }

    const updateData = await request.json()
    console.log("Updating order:", params.id)

    // OPTIMIZATION 1: Single query to get current order with minimal data
    const currentOrder = await prisma.order.findUnique({
      where: { id: params.id },
      select: {
        id: true,
        status: true,
        total: true,
        deliveryPrice: true,
        deliveryCompany: true,
        customerName: true,
        customerPhone1: true,
        customerPhone2: true,
        customerEmail: true,
        customerAddress: true,
        customerCity: true,
        notes: true,
        attemptCount: true,
        confirmedById: true,
        items: {
          select: {
            id: true,
            productId: true,
            quantity: true,
            price: true
          }
        }
      }
    })

    if (!currentOrder) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 })
    }

    // OPTIMIZATION 2: Pre-calculate all changes before transaction
    const oldStatus = currentOrder.status
    const newStatus = updateData.status || currentOrder.status
    const statusChanged = oldStatus !== newStatus

    // Calculate new total efficiently
    let totalAmount = Number(currentOrder.total)
    let itemsChanged = false
    
    if (updateData.items) {
      itemsChanged = true
      const itemsTotal = updateData.items.reduce((sum: number, item: any) => 
        sum + (item.price * item.quantity), 0
      )
      const deliveryPrice = updateData.deliveryPrice || 0
      totalAmount = itemsTotal + deliveryPrice
    }

    // OPTIMIZATION 3: Prepare all transaction operations
    const transactionOperations = []
    
    // Order update data
    const orderUpdateData: any = {}
    
    // Only include fields that are actually changing
    if (updateData.customerName !== undefined && updateData.customerName !== currentOrder.customerName) {
      orderUpdateData.customerName = updateData.customerName
    }
    if (updateData.customerPhone1 !== undefined && updateData.customerPhone1 !== currentOrder.customerPhone1) {
      orderUpdateData.customerPhone1 = updateData.customerPhone1
    }
    if (updateData.customerPhone2 !== undefined && updateData.customerPhone2 !== currentOrder.customerPhone2) {
      orderUpdateData.customerPhone2 = updateData.customerPhone2
    }
    if (updateData.customerEmail !== undefined && updateData.customerEmail !== currentOrder.customerEmail) {
      orderUpdateData.customerEmail = updateData.customerEmail
    }
    if (updateData.customerAddress !== undefined && updateData.customerAddress !== currentOrder.customerAddress) {
      orderUpdateData.customerAddress = updateData.customerAddress
    }
    if (updateData.customerCity !== undefined && updateData.customerCity !== currentOrder.customerCity) {
      orderUpdateData.customerCity = updateData.customerCity
    }
    if (statusChanged) {
      orderUpdateData.status = newStatus
    }
    if (updateData.deliveryCompany !== undefined && updateData.deliveryCompany !== currentOrder.deliveryCompany) {
      orderUpdateData.deliveryCompany = updateData.deliveryCompany
    }
    if (totalAmount !== Number(currentOrder.total)) {
      orderUpdateData.total = totalAmount
    }
    if (updateData.deliveryPrice !== undefined) {
      orderUpdateData.deliveryPrice = updateData.deliveryPrice > 0 ? updateData.deliveryPrice : null
    }
    if (updateData.notes !== undefined && updateData.notes !== currentOrder.notes) {
      orderUpdateData.notes = updateData.notes
    }
    if (updateData.attemptCount !== undefined && updateData.attemptCount !== currentOrder.attemptCount) {
      orderUpdateData.attemptCount = updateData.attemptCount
    }
    if (updateData.confirmedByID !== undefined && updateData.confirmedByID !== currentOrder.confirmedById) {
      orderUpdateData.confirmedById = updateData.confirmedByID
    }

    // Always update updatedAt
    orderUpdateData.updatedAt = new Date()

    // OPTIMIZATION 4: Optimized transaction with minimal operations
    const updatedOrder = await prisma.$transaction(async (tx) => {
      const operations = []

      // 1. Update order only if there are changes
      if (Object.keys(orderUpdateData).length > 1) { // > 1 because updatedAt is always included
        operations.push(
          tx.order.update({
            where: { id: params.id },
            data: orderUpdateData,
            select: { id: true, status: true, updatedAt: true } // Minimal select
          })
        )
      }

      // 2. Handle items update more efficiently
      if (itemsChanged && updateData.items) {
        // OPTIMIZATION: Instead of delete all + recreate, do a smart diff
        const currentItemsMap = new Map(
          currentOrder.items.map(item => [`${item.productId}`, item])
        )
        const newItemsMap = new Map<string, OrderItem>(
          updateData.items.map((item: OrderItem) => [`${item.productId}`, item])
        )

        // Find items to delete, update, and create
        const toDelete: string[] = []
        const toUpdate: any[] = []
        const toCreate: any[] = []

        // Check existing items
        for (const [productId, currentItem] of currentItemsMap) {
          const newItem = newItemsMap.get(productId)
          if (!newItem) {
            toDelete.push(currentItem.id)
          } else if (
            currentItem.quantity !== newItem.quantity || 
            currentItem.price.toString() !== newItem.price.toString()
          ) {
            toUpdate.push({
              id: currentItem.id,
              quantity: newItem.quantity,
              price: newItem.price
            })
          }
        }

        // Check for new items
        for (const [productId, newItem] of newItemsMap) {
          if (!currentItemsMap.has(productId)) {
            toCreate.push({
              orderId: params.id,
              productId: newItem.productId,
              quantity: newItem.quantity,
              price: newItem.price
            })
          }
        }

        // Execute item operations
        if (toDelete.length > 0) {
          operations.push(
            tx.orderItem.deleteMany({
              where: { id: { in: toDelete } }
            })
          )
        }

        // Batch updates
        for (const item of toUpdate) {
          operations.push(
            tx.orderItem.update({
              where: { id: item.id },
              data: {
                quantity: item.quantity,
                price: item.price
              }
            })
          )
        }

        // Batch creates
        if (toCreate.length > 0) {
          operations.push(
            tx.orderItem.createMany({
              data: toCreate
            })
          )
        }
      }

      // 3. Add status history only if needed
      if (statusChanged || updateData.statusNote) {
        const statusNote = updateData.statusNote || `Status changed from ${oldStatus} to ${newStatus}`
        operations.push(
          tx.orderStatusHistory.create({
            data: {
              orderId: params.id,
              status: newStatus,
              notes: statusNote,
              userId: user.id
            },
            select: { id: true } // Minimal select
          })
        )
      }

      // 4. Handle shipment creation for UPLOADED status
      if (statusChanged && 
          newStatus === "UPLOADED" && 
          updateData.deliveryCompany) {
        // Add shipment creation logic here if needed
        // For now, just log it
        console.log(`Creating shipment for order ${params.id} with ${updateData.deliveryCompany}`)
      }

      // 5. Log activity efficiently
      operations.push(
        tx.activity.create({
          data: {
            type: "ORDER_UPDATED",
            description: `Order ${params.id} updated`,
            userId: user.id,
            metadata: {
              orderId: params.id,
              hasStatusChange: statusChanged,
              hasItemsChange: itemsChanged,
              newStatus: statusChanged ? newStatus : undefined
            },
            ipAddress: request.headers.get("x-forwarded-for") || "127.0.0.1",
            userAgent: request.headers.get("user-agent") || "unknown"
          },
          select: { id: true } // Minimal select
        })
      )

      // Execute all operations
      await Promise.all(operations)

      return { success: true }
    })

    // OPTIMIZATION 5: Return minimal response - avoid fetching complete order
    const queryTime = Date.now() - startTime
    console.log(`✅ Order updated: ${params.id} in ${queryTime}ms`)

    return NextResponse.json({
      success: true,
      message: "Order updated successfully",
      orderId: params.id,
      performance: {
        queryTime,
        itemsChanged,
        statusChanged
      }
    })

  } catch (error) {
    const queryTime = Date.now() - Date.now()
    console.error(`❌ Update order API error (${queryTime}ms):`, error)
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