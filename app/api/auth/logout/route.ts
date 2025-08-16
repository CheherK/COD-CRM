import { type NextRequest, NextResponse } from "next/server"
import { extractUserFromRequest } from "@/lib/auth-server"
import { logAuthActivity } from "@/lib/activity-logger"

export async function POST(request: NextRequest) {
  try {
    console.log("=== LOGOUT API CALLED ===")

    const user = await extractUserFromRequest(request)

    if (user) {
      // Log logout activity
      await logAuthActivity("LOGOUT", `User ${user.username} logged out`, request, user.id, {
        logoutTime: new Date().toISOString(),
        userAgent: request.headers.get("user-agent"),
      })
      console.log("✅ Logout successful for:", user.username)
    } else {
      // Log anonymous logout attempt
      await logAuthActivity("LOGOUT", "Anonymous logout attempt (no valid session)", request, undefined, {
        reason: "no_valid_session",
      })
    }

    // Clear the auth cookie
    const response = NextResponse.json({
      success: true,
      message: "Logout successful",
    })

    response.cookies.set("auth-token", "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 0,
      path: "/",
    })

    return response
  } catch (error) {
    console.error("❌ Logout API error:", error)

    // Log system error
    try {
      await logAuthActivity(
        "LOGOUT",
        `Logout system error: ${error instanceof Error ? error.message : "Unknown error"}`,
        request,
        undefined,
        { error: error instanceof Error ? error.message : String(error) },
      )
    } catch (logError) {
      console.error("Failed to log logout error:", logError)
    }

    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
