import { type NextRequest, NextResponse } from "next/server"
import { extractUserFromRequest, updateUser } from "@/lib/auth-server"
import { logUserActivity } from "@/lib/activity-logger"
import prisma from "@/lib/prisma"

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    console.log("=== GET USER BY ID API CALLED ===")

    const currentUser = await extractUserFromRequest(request)

    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Users can only view their own profile, admins can view any user
    if (currentUser.role !== "ADMIN" && currentUser.id !== params.id) {
      return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 })
    }

    const user = await prisma.user.findUnique({
      where: { id: params.id },
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
        updatedAt: true,
      },
    })

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    console.log("✅ User retrieved:", user.username)
    return NextResponse.json({ success: true, user })
  } catch (error) {
    console.error("❌ Get user by ID API error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    console.log("=== UPDATE USER API CALLED ===")

    const currentUser = await extractUserFromRequest(request)

    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Users can only update their own profile, admins can update any user
    if (currentUser.role !== "ADMIN" && currentUser.id !== params.id) {
      return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 })
    }

    const body = await request.json()
    const { username, email, firstName, lastName, phone, role, status } = body

    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { id: params.id },
    })

    if (!existingUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    // Check for username/email conflicts (excluding current user)
    if (username || email) {
      const conflictUser = await prisma.user.findFirst({
        where: {
          AND: [
            { id: { not: params.id } },
            {
              OR: [username ? { username } : {}, email ? { email } : {}].filter(Boolean),
            },
          ],
        },
      })

      if (conflictUser) {
        return NextResponse.json({ error: "Username or email already exists" }, { status: 400 })
      }
    }

    // Update user
    const updatedUser = await updateUser(params.id, {
      username,
      email,
      firstName,
      lastName,
      phone,
      role,
      status,
    })

    if (!updatedUser) {
      return NextResponse.json({ error: "Failed to update user" }, { status: 500 })
    }

    // Log activity
    await logUserActivity(
      "USER_UPDATED",
      `User ${updatedUser.username} updated by ${currentUser.username}`,
      request,
      currentUser.id,
      { targetUserId: params.id, changes: body },
    )

    console.log("✅ User updated:", updatedUser.username)

    // Remove password from response
    const { password: _, ...safeUser } = updatedUser

    return NextResponse.json({ success: true, user: safeUser })
  } catch (error) {
    console.error("❌ Update user API error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    console.log("=== DELETE USER API CALLED ===")

    const currentUser = await extractUserFromRequest(request)

    if (!currentUser || currentUser.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }

    // Prevent admin from deleting themselves
    if (currentUser.id === params.id) {
      return NextResponse.json({ error: "Cannot delete your own account" }, { status: 400 })
    }

    const user = await prisma.user.findUnique({
      where: { id: params.id },
    })

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    // Soft delete by setting status to DISABLED
    await prisma.user.update({
      where: { id: params.id },
      data: { status: "DISABLED" },
    })

    // Log activity
    await logUserActivity(
      "USER_DELETED",
      `User ${user.username} deleted by ${currentUser.username}`,
      request,
      currentUser.id,
      { targetUserId: params.id },
    )

    console.log("✅ User deleted:", user.username)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("❌ Delete user API error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
