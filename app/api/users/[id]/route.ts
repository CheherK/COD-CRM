import { type NextRequest, NextResponse } from "next/server"
import { verifyToken } from "@/lib/auth-server"
import prisma from "@/lib/prisma"

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    console.log("=== GET USER BY ID API CALLED ===")

    const token = request.cookies.get("auth-token")?.value

    if (!token) {
      return NextResponse.json({ error: "No token provided" }, { status: 401 })
    }

    const currentUser = verifyToken(token)

    if (!currentUser) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 })
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
        _count: {
          select: {
            orders: true,
            activities: true
          }
        }
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

    const token = request.cookies.get("auth-token")?.value

    if (!token) {
      return NextResponse.json({ error: "No token provided" }, { status: 401 })
    }

    const currentUser = verifyToken(token)

    if (!currentUser) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 })
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
              OR: [
                username ? { username } : {},
                email ? { email } : {}
              ].filter(obj => Object.keys(obj).length > 0),
            },
          ],
        },
      })

      if (conflictUser) {
        return NextResponse.json({ 
          error: conflictUser.username === username 
            ? "Username already exists" 
            : "Email already exists" 
        }, { status: 400 })
      }
    }

    // Validate role if provided (only admins can change roles)
    if (role !== undefined) {
      if (currentUser.role !== "ADMIN") {
        return NextResponse.json({ error: "Only admins can change user roles" }, { status: 403 })
      }
      if (!["ADMIN", "STAFF"].includes(role)) {
        return NextResponse.json({ error: "Invalid role. Must be ADMIN or STAFF" }, { status: 400 })
      }
    }

    // Validate status if provided (only admins can change status)
    if (status !== undefined) {
      if (currentUser.role !== "ADMIN") {
        return NextResponse.json({ error: "Only admins can change user status" }, { status: 403 })
      }
      if (!["ENABLED", "DISABLED"].includes(status)) {
        return NextResponse.json({ error: "Invalid status. Must be ENABLED or DISABLED" }, { status: 400 })
      }
    }

    // Prepare update data (only include provided fields)
    const updateData: any = {}
    if (username !== undefined) updateData.username = username
    if (email !== undefined) updateData.email = email
    if (firstName !== undefined) updateData.firstName = firstName || null
    if (lastName !== undefined) updateData.lastName = lastName || null
    if (phone !== undefined) updateData.phone = phone || null
    if (role !== undefined) updateData.role = role
    if (status !== undefined) updateData.status = status

    // Update user in transaction
    const updatedUser = await prisma.$transaction(async (tx) => {
      const updated = await tx.user.update({
        where: { id: params.id },
        data: updateData,
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

      // Log activity
      await tx.activity.create({
        data: {
          type: "USER_UPDATED",
          description: `User ${updated.username} updated by ${currentUser.username}`,
          userId: currentUser.id,
          metadata: {
            targetUserId: params.id,
            changes: updateData,
            updatedBy: currentUser.username
          },
          ipAddress: request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "127.0.0.1",
          userAgent: request.headers.get("user-agent") || "unknown"
        }
      })

      return updated
    })

    console.log("✅ User updated:", updatedUser.username)

    return NextResponse.json({ 
      success: true, 
      user: updatedUser,
      message: "User updated successfully"
    })
  } catch (error) {
    console.error("❌ Update user API error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    console.log("=== DELETE USER API CALLED ===")

    const token = request.cookies.get("auth-token")?.value

    if (!token) {
      return NextResponse.json({ error: "No token provided" }, { status: 401 })
    }

    const currentUser = verifyToken(token)

    if (!currentUser || currentUser.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized - Admin access required" }, { status: 403 })
    }

    // Prevent admin from deleting themselves
    if (currentUser.id === params.id) {
      return NextResponse.json({ error: "Cannot delete your own account" }, { status: 400 })
    }

    const user = await prisma.user.findUnique({
      where: { id: params.id },
      include: {
        _count: {
          select: {
            orders: true,
            activities: true
          }
        }
      }
    })

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    // Check if user has assigned orders
    if (user._count.orders > 0) {
      return NextResponse.json({ 
        error: "Cannot delete user with assigned orders. Please reassign orders first or disable the user instead.",
        assignedOrders: user._count.orders 
      }, { status: 409 })
    }

    // Soft delete by setting status to DISABLED (recommended)
    // Or hard delete if explicitly requested
    const { searchParams } = new URL(request.url)
    const hardDelete = searchParams.get("hard") === "true"

    await prisma.$transaction(async (tx) => {
      if (hardDelete) {
        // Hard delete - remove the user completely
        await tx.user.delete({
          where: { id: params.id }
        })
      } else {
        // Soft delete - disable the user
        await tx.user.update({
          where: { id: params.id },
          data: { status: "DISABLED" }
        })
      }

      // Log activity
      await tx.activity.create({
        data: {
          type: hardDelete ? "USER_DELETED" : "USER_DISABLED",
          description: `User ${user.username} ${hardDelete ? 'deleted' : 'disabled'} by ${currentUser.username}`,
          userId: currentUser.id,
          metadata: {
            targetUserId: params.id,
            targetUsername: user.username,
            deletionType: hardDelete ? 'hard' : 'soft'
          },
          ipAddress: request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "127.0.0.1",
          userAgent: request.headers.get("user-agent") || "unknown"
        }
      })
    })

    console.log(`✅ User ${hardDelete ? 'deleted' : 'disabled'}:`, user.username)
    
    return NextResponse.json({ 
      success: true,
      message: `User ${hardDelete ? 'deleted' : 'disabled'} successfully`
    })
  } catch (error) {
    console.error("❌ Delete user API error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}