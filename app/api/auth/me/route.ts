import { type NextRequest, NextResponse } from "next/server"
import { extractUserFromRequest } from "@/lib/auth-server"

export async function GET(request: NextRequest) {
  try {
    console.log("=== GET CURRENT USER API CALLED ===")

    const user = await extractUserFromRequest(request)

    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
    }

    // Remove password from response
    const { password: _, ...safeUser } = user

    console.log("✅ Current user retrieved:", user.username)
    return NextResponse.json({
      success: true,
      user: safeUser,
    })
  } catch (error) {
    console.error("❌ Get current user API error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
