import { type NextRequest, NextResponse } from "next/server"
import { verifyToken } from "@/lib/auth-server"
import { deliveryService } from "@/lib/delivery/delivery-service"
import { logOrderActivity } from "@/lib/activity-logger"

export async function GET(request: NextRequest) {
  try {
    console.log("=== GET SHIPMENTS API CALLED ===")

    const token = request.cookies.get("auth-token")?.value

    if (!token) {
      return NextResponse.json({ error: "No token provided" }, { status: 401 })
    }

    const user = verifyToken(token)

    if (!user) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const limitParam = searchParams.get("limit")
    const orderIdParam = searchParams.get("orderId")
    const agencyIdParam = searchParams.get("agencyId")
    const statusParam = searchParams.get("status")

    const limit = limitParam ? Number.parseInt(limitParam, 10) : undefined

    console.log("📦 Fetching shipments with params:", {
      limit,
      orderId: orderIdParam,
      agencyId: agencyIdParam,
      status: statusParam,
    })

    let shipments

    if (orderIdParam) {
      shipments = await deliveryService.getShipmentsByOrderId(orderIdParam)
    } else {
      shipments = await deliveryService.getAllShipments(limit)
    }

    // Apply additional filters
    if (agencyIdParam) {
      shipments = shipments.filter((s) => s.agencyId === agencyIdParam)
    }

    if (statusParam) {
      shipments = shipments.filter((s) => s.status === statusParam)
    }

    console.log(`✅ Retrieved ${shipments.length} shipments`)

    return NextResponse.json({
      success: true,
      shipments,
      total: shipments.length,
    })
  } catch (error) {
    console.error("❌ Get shipments API error:", error)
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    console.log("=== CREATE SHIPMENT API CALLED ===")

    const token = request.cookies.get("auth-token")?.value

    if (!token) {
      return NextResponse.json({ error: "No token provided" }, { status: 401 })
    }

    const user = verifyToken(token)

    if (!user) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 })
    }

    const body = await request.json()
    const { orderId, agencyId, order } = body

    if (!orderId || !agencyId || !order) {
      return NextResponse.json({ error: "Missing required fields: orderId, agencyId, order" }, { status: 400 })
    }

    console.log("🚚 Creating shipment for order:", orderId, "with agency:", agencyId)

    const result = await deliveryService.createShipment(orderId, agencyId, order, request, user.id)

    if (result.success) {
      console.log("✅ Shipment created successfully:", result.trackingNumber)
      return NextResponse.json(result)
    } else {
      console.log("❌ Shipment creation failed:", result.error)
      return NextResponse.json(result, { status: 400 })
    }
  } catch (error) {
    console.error("❌ Create shipment API error:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Internal server error",
        errorDetails: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    console.log("=== BULK UPDATE SHIPMENTS API CALLED ===")

    const token = request.cookies.get("auth-token")?.value

    if (!token) {
      return NextResponse.json({ error: "No token provided" }, { status: 401 })
    }

    const user = verifyToken(token)

    if (!user || user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized - Admin access required" }, { status: 403 })
    }

    const body = await request.json()
    const { shipmentIds, status } = body

    if (!shipmentIds || !Array.isArray(shipmentIds) || !status) {
      return NextResponse.json({ error: "Missing required fields: shipmentIds (array), status" }, { status: 400 })
    }

    console.log("📦 Bulk updating shipments:", shipmentIds, "to status:", status)

    const result = await deliveryService.bulkUpdateShipmentStatus(shipmentIds, status, request, user.id)

    console.log("✅ Bulk update completed:", result)

    return NextResponse.json({
      success: result.success,
      message: `Updated ${result.updated} shipments`,
      ...result,
    })
  } catch (error) {
    console.error("❌ Bulk update shipments API error:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    console.log("=== DELETE SHIPMENT API CALLED ===")

    const token = request.cookies.get("auth-token")?.value

    if (!token) {
      return NextResponse.json({ error: "No token provided" }, { status: 401 })
    }

    const user = verifyToken(token)

    if (!user || user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized - Admin access required" }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const shipmentId = searchParams.get("id")

    if (!shipmentId) {
      return NextResponse.json({ error: "Shipment ID is required" }, { status: 400 })
    }

    console.log("🗑️ Deleting shipment:", shipmentId)

    const success = await deliveryService.deleteShipment(shipmentId)

    if (success) {
      // Log activity
      await logOrderActivity("SHIPMENT_DELETED", `Deleted shipment ${shipmentId}`, request, user.id, undefined, {
        shipmentId,
      })

      return NextResponse.json({
        success: true,
        message: "Shipment deleted successfully",
      })
    } else {
      return NextResponse.json({ error: "Shipment not found or could not be deleted" }, { status: 404 })
    }
  } catch (error) {
    console.error("❌ Delete shipment API error:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
