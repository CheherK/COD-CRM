import { type NextRequest, NextResponse } from "next/server"
import { verifyToken } from "@/lib/auth-server"
import prisma from "@/lib/prisma"

export async function GET(request: NextRequest) {
  try {
    console.log("=== GET ACTIVITY STATS API CALLED ===")

    const token = request.cookies.get("auth-token")?.value

    if (!token) {
      return NextResponse.json({ error: "No token provided" }, { status: 401 })
    }

    const user = verifyToken(token)

    if (!user) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 })
    }

    console.log(`📊 Fetching activity stats for user: ${user.username} (${user.role})`)

    // Get activity statistics
    const stats = await prisma.getActivityStats()

    console.log(`✅ Retrieved activity stats:`, stats)

    return NextResponse.json({
      success: true,
      stats,
    })
  } catch (error) {
    console.error("❌ Get activity stats API error:", error)
    return NextResponse.json(
      {
        error: "Failed to load activity statistics",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
