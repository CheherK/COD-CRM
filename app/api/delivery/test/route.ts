import { type NextRequest, NextResponse } from "next/server"
import { extractUserFromRequest } from "@/lib/auth-server"
import { DeliveryAgencyRegistry } from "@/lib/delivery/agency-registry"
import { logSystemActivity } from "@/lib/activity-logger"

const registry = new DeliveryAgencyRegistry()

export async function POST(request: NextRequest) {
  try {
    console.log("=== DELIVERY TEST API CALLED ===")

    const user = await extractUserFromRequest(request)

    if (!user || user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }

    const { agencyId } = await request.json()

    if (!agencyId) {
      return NextResponse.json({ error: "Agency ID is required" }, { status: 400 })
    }

    console.log("🧪 Testing delivery agency:", agencyId)

    try {
      // Get agency instance
      const agency = registry.getAgency(agencyId)

      if (!agency) {
        return NextResponse.json({ error: "Agency not found" }, { status: 404 })
      }

      // Test connection
      const testResult = await agency.testConnection()

      // Log activity
      await logSystemActivity(
        "DELIVERY_CONNECTION_TEST",
        `Connection test for ${agencyId}: ${testResult.success ? "SUCCESS" : "FAILED"}`,
        request,
        user.id,
        {
          agencyId,
          testResult,
        },
      )

      if (testResult.success) {
        console.log("✅ Connection test successful for:", agencyId)
        return NextResponse.json({
          success: true,
          message: "Connection test successful",
          details: testResult.details,
        })
      } else {
        console.log("❌ Connection test failed for:", agencyId, testResult.error)
        return NextResponse.json({
          success: false,
          error: testResult.error || "Connection test failed",
        })
      }
    } catch (error) {
      console.error("❌ Connection test error:", error)

      // Log error
      await logSystemActivity(
        "DELIVERY_CONNECTION_TEST_ERROR",
        `Connection test error for ${agencyId}: ${error instanceof Error ? error.message : "Unknown error"}`,
        request,
        user.id,
        {
          agencyId,
          error: error instanceof Error ? error.message : String(error),
        },
      )

      return NextResponse.json({
        success: false,
        error: error instanceof Error ? error.message : "Connection test failed",
      })
    }
  } catch (error) {
    console.error("❌ Delivery test API error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
