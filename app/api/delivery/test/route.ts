// app/api/delivery/test/route.ts
import { type NextRequest, NextResponse } from "next/server"
import { extractUserFromRequest } from "@/lib/auth-server"
import { deliveryRegistry } from "@/lib/delivery/agency-registry"
import { logSystemActivity } from "@/lib/activity-logger"


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
      await deliveryRegistry.ensureInitialized();
      // Get agency instance
      const agency = deliveryRegistry.getAgency(agencyId)
      const config = deliveryRegistry.getAgencyConfig(agencyId)
      const allAgencies = deliveryRegistry.getAllAgencies()

      console.log("🔍 Found agency and config:", { agencyId, agency: agency, config: config, allAgencies: allAgencies })

      if (!agency || !config) {
        return NextResponse.json({ error: "Agency not found, or not configured", agency, "config": config }, { status: 404 })
      }

      // Test connection
      const testResult = await agency.testConnection(config?.credentials)

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
          message: "Connection test successful"
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
