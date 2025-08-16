import { type NextRequest, NextResponse } from "next/server"
import { verifyToken } from "@/lib/auth-server"
import prisma from "@/lib/prisma"
import { logUserActivity } from "@/lib/activity-logger"
import bcrypt from "bcryptjs"

export async function PUT(request: NextRequest) {
  try {
    console.log("=== CHANGE PASSWORD API CALLED ===")

    const token = request.cookies.get("auth-token")?.value

    if (!token) {
      return NextResponse.json({ error: "No token provided" }, { status: 401 })
    }

    const user = verifyToken(token)

    if (!user) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 })
    }

    const { currentPassword, newPassword, confirmPassword } = await request.json()
    console.log("Changing password for user:", user.username)

    // Validate required fields
    if (!currentPassword || !newPassword || !confirmPassword) {
      return NextResponse.json({ error: "All password fields are required" }, { status: 400 })
    }

    // Validate new password confirmation
    if (newPassword !== confirmPassword) {
      return NextResponse.json({ error: "New password and confirmation do not match" }, { status: 400 })
    }

    // Validate new password strength
    if (newPassword.length < 6) {
      return NextResponse.json({ error: "New password must be at least 6 characters long" }, { status: 400 })
    }

    // Get current user data to verify current password
    const currentUser = await prisma.findUserById(user.id)

    if (!currentUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    // Verify current password
    const isCurrentPasswordValid = await bcrypt.compare(currentPassword, currentUser.password)

    if (!isCurrentPasswordValid) {
      return NextResponse.json({ error: "Current password is incorrect" }, { status: 400 })
    }

    // Hash new password
    const hashedNewPassword = await bcrypt.hash(newPassword, 10)

    // Update password
    const updatedUser = await prisma.updateUser(user.id, {
      password: hashedNewPassword,
    })

    if (!updatedUser) {
      return NextResponse.json({ error: "Failed to update password" }, { status: 500 })
    }

    // Log password change
    await logUserActivity("PASSWORD_CHANGED", `Password changed by ${user.username}`, request, user.id)

    console.log("✅ Password changed successfully")
    return NextResponse.json({ success: true, message: "Password changed successfully" })
  } catch (error) {
    console.error("❌ Change password API error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
