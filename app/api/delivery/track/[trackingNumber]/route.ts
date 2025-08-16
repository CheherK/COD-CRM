import { type NextRequest, NextResponse } from "next/server"
import { verifyToken } from "@/lib/auth-server"
import { deliveryService } from "@/lib/delivery/delivery-service"

export async function GET(request: NextRequest, { params }: { params: { trackingNumber: string } }) {
  try {
    console.log("=== TRACK SHIPMENT API CALLED ===")

    const token = request.cookies.get("auth-token")?.value

    if (!token) {
      return NextResponse.json({ error: "No token provided" }, { status: 401 })
    }

    const user = verifyToken(token)

    if (!user) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 })
    }

    const trackingNumber = params.trackingNumber

    if (!trackingNumber) {
      return NextResponse.json({ error: "Tracking number is required" }, { status: 400 })
    }

    // Track shipment by tracking number
    const result = await deliveryService.trackShipmentByTrackingNumber(trackingNumber)

    console.log("✅ Tracking result:", result.success)

    if (result.success) {
      return NextResponse.json({
        success: true,
        status: result.status,
        message: "Shipment tracked successfully",
      })
    } else {
      return NextResponse.json(
        {
          success: false,
          error: result.error,
          details: result.errorDetails,
        },
        { status: 404 },
      )
    }
  } catch (error) {
    console.error("❌ Track shipment API error:", error)
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
