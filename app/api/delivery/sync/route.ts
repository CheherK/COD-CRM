import { type NextRequest, NextResponse } from "next/server"
import { extractUserFromRequest } from "@/lib/auth-server"
import { DeliverySyncService } from "@/lib/delivery/sync-service"
import { logSystemActivity } from "@/lib/activity-logger"

export async function POST(request: NextRequest) {
  try {
    console.log("=== DELIVERY SYNC API CALLED ===")

    const user = await extractUserFromRequest(request)

    if (!user || user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }

    console.log("🔄 Starting manual delivery sync...")

    const syncService = new DeliverySyncService()
    const syncResults = await syncService.syncAllShipments()

    // Log activity
    await logSystemActivity(
      "DELIVERY_MANUAL_SYNC",
      `Manual delivery sync completed: ${syncResults.processed} processed, ${syncResults.updated} updated, ${syncResults.errors} errors`,
      request,
      user.id,
      syncResults,
    )

    console.log("✅ Manual sync completed:", syncResults)

    return NextResponse.json({
      success: true,
      syncResults,
      message: "Sync completed successfully",
    })
  } catch (error) {
    console.error("❌ Delivery sync API error:", error)

    // Log error
    try {
      const user = await extractUserFromRequest(request)
      if (user) {
        await logSystemActivity(
          "DELIVERY_SYNC_ERROR",
          `Manual delivery sync failed: ${error instanceof Error ? error.message : "Unknown error"}`,
          request,
          user.id,
          { error: error instanceof Error ? error.message : String(error) },
        )
      }
    } catch (logError) {
      console.error("Failed to log sync error:", logError)
    }

    return NextResponse.json(
      {
        success: false,
        error: "Sync failed",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const user = await extractUserFromRequest(request)

    if (!user || user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }

    const syncService = new DeliverySyncService()
    const status = syncService.getStatus()

    return NextResponse.json({
      success: true,
      status,
    })
  } catch (error) {
    console.error("❌ Get sync status error:", error)
    return NextResponse.json({ error: "Failed to get sync status" }, { status: 500 })
  }
}
