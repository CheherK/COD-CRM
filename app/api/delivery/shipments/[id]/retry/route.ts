// app/api/delivery/shipments/[id]/retry/route.ts
import { type NextRequest, NextResponse } from "next/server"
import { verifyToken } from "@/lib/auth-server"
import { deliveryService } from "@/lib/delivery/delivery-service"

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    console.log("=== RETRY SHIPMENT API CALLED ===", params.id)

    const token = request.cookies.get("auth-token")?.value

    if (!token) {
      return NextResponse.json({ error: "No token provided" }, { status: 401 })
    }

    const user = verifyToken(token)

    if (!user) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 })
    }

    console.log("🔄 Retrying shipment:", params.id)

    const result = await deliveryService.retryShipment(params.id, request, user.id)

    if (result.success) {
      console.log("✅ Shipment retry successful:", result.trackingNumber)
      return NextResponse.json(result)
    } else {
      console.log("❌ Shipment retry failed:", result.error)
      return NextResponse.json(result, { status: 400 })
    }
  } catch (error) {
    console.error("❌ Retry shipment API error:", error)
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
