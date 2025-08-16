import { type NextRequest, NextResponse } from "next/server"
import { verifyToken } from "@/lib/auth-server"
import prisma from "@/lib/prisma"
import { logUserActivity } from "@/lib/activity-logger"

export async function PUT(request: NextRequest) {
  try {
    console.log("=== UPDATE PROFILE API CALLED ===")

    const token = request.cookies.get("auth-token")?.value

    if (!token) {
      return NextResponse.json({ error: "No token provided" }, { status: 401 })
    }

    const user = verifyToken(token)

    if (!user) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 })
    }

    const profileData = await request.json()
    console.log("Updating profile for user:", user.username)

    // Validate required fields
    if (!profileData.firstName || !profileData.lastName || !profileData.email) {
      return NextResponse.json({ error: "First name, last name, and email are required" }, { status: 400 })
    }

    // Check if email is already taken by another user
    if (profileData.email !== user.email) {
      const existingUser = await prisma.findUserByEmail(profileData.email)
      if (existingUser && existingUser.id !== user.id) {
        return NextResponse.json({ error: "Email is already taken" }, { status: 400 })
      }
    }

    // Update user profile
    const updatedUser = await prisma.updateUser(user.id, {
      firstName: profileData.firstName,
      lastName: profileData.lastName,
      email: profileData.email,
      phone: profileData.phone,
      username: profileData.username || user.username,
    })

    if (!updatedUser) {
      return NextResponse.json({ error: "Failed to update profile" }, { status: 500 })
    }

    // Log profile update
    await logUserActivity("PROFILE_UPDATED", `Profile updated by ${user.username}`, request, user.id, {
      changes: profileData,
    })

    // Remove password from response
    const { password, ...safeUser } = updatedUser

    console.log("✅ Profile updated successfully")
    return NextResponse.json({ user: safeUser })
  } catch (error) {
    console.error("❌ Update profile API error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
