import { type NextRequest, NextResponse } from "next/server"
import { verifyToken } from "@/lib/auth-server"
import prisma from "@/lib/prisma"

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

    // Validate required fields
    if (!profileData.firstName || !profileData.lastName || !profileData.email) {
      return NextResponse.json({ error: "First name, last name, and email are required" }, { status: 400 })
    }

    // Check if email is already taken by another user
    if (profileData.email !== user.email) {
      const existingUser = await prisma.user.findFirst({
        where: {
          email: profileData.email,
          id: { not: user.id }
        }
      })
      if (existingUser) {
        return NextResponse.json({ error: "Email is already taken" }, { status: 400 })
      }
    }

    // Update user profile in transaction
    const updatedUser = await prisma.$transaction(async (tx) => {
      const updated = await tx.user.update({
        where: { id: user.id },
        data: {
          firstName: profileData.firstName,
          lastName: profileData.lastName,
          email: profileData.email,
          phone: profileData.phone || null,
          username: profileData.username || user.username,
        },
        select: {
          id: true,
          username: true,
          email: true,
          firstName: true,
          lastName: true,
          phone: true,
          role: true,
          status: true,
          createdAt: true,
          updatedAt: true
        }
      })

      // Log profile update
      await tx.activity.create({
        data: {
          type: "PROFILE_UPDATED",
          description: `Profile updated by ${user.username}`,
          userId: user.id,
          metadata: {
            changes: profileData
          },
          ipAddress: request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "127.0.0.1",
          userAgent: request.headers.get("user-agent") || "unknown"
        }
      })

      return updated
    })

    console.log("✅ Profile updated successfully")
    return NextResponse.json({ 
      success: true,
      user: updatedUser,
      message: "Profile updated successfully"
    })
  } catch (error) {
    console.error("❌ Update profile API error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
