import { type NextRequest, NextResponse } from "next/server"
import { authenticateUser, generateToken } from "@/lib/auth-server"
import { logAuthActivity } from "@/lib/activity-logger"

export async function POST(request: NextRequest) {
  try {
    console.log("=== LOGIN API CALLED ===")

    const body = await request.json()
    const { username, password } = body

    if (!username || !password) {
      return NextResponse.json({ error: "Username and password are required" }, { status: 400 })
    }

    // Authenticate user
    const user = await authenticateUser(username, password)

    if (!user) {
      console.log("❌ Authentication failed for:", username)

      // Log failed login attempt
      await logAuthActivity("LOGIN_FAILED", `Failed login attempt for username: ${username}`, request, undefined, {
        username,
        reason: "invalid_credentials",
      })

      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 })
    }

    // Generate JWT token
    const token = generateToken(user)

    // Log successful login
    await logAuthActivity("LOGIN", `User ${username} logged in successfully`, request, user.id, {
      loginMethod: "password",
      userAgent: request.headers.get("user-agent"),
    })

    // Remove password from response
    // @ts-expect-error
    const { password: _, ...safeUser } = user

    // Set HTTP-only cookie
    const response = NextResponse.json({
      success: true,
      user: safeUser,
      message: "Login successful",
    })

    response.cookies.set("auth-token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 24 * 60 * 60, // 24 hours
      path: "/",
    })

    console.log("✅ Login successful for:", username)
    return response
  } catch (error) {
    console.error("❌ Login API error:", error)

    // Log system error
    try {
      await logAuthActivity(
        "LOGIN_FAILED",
        `Login system error: ${error instanceof Error ? error.message : "Unknown error"}`,
        request,
        undefined,
        { error: error instanceof Error ? error.message : String(error) },
      )
    } catch (logError) {
      console.error("Failed to log login error:", logError)
    }

    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
