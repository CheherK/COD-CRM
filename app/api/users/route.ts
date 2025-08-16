import { type NextRequest, NextResponse } from "next/server"
import { extractUserFromRequest, createUser } from "@/lib/auth-server"
import { logUserActivity } from "@/lib/activity-logger"
import prisma from "@/lib/prisma"

export async function GET(request: NextRequest) {
  try {
    console.log("=== GET USERS API CALLED ===")

    const currentUser = await extractUserFromRequest(request)

    if (!currentUser) {
      console.log("❌ No valid user found in request")
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Only admins can get all users
    if (currentUser.role !== "ADMIN") {
      console.log("❌ User not admin:", currentUser.username)
      return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 })
    }

    const users = await prisma.user.findMany({
      where: { status: "ENABLED" },
      orderBy: { createdAt: "desc" },
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

    console.log("✅ Retrieved", users.length, "users for admin:", currentUser.username)

    return NextResponse.json({
      success: true,
      users,
    })
  } catch (error) {
    console.error("❌ Get users API error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    console.log("=== CREATE USER API CALLED ===")

    const currentUser = await extractUserFromRequest(request)

    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Only admins can create users
    if (currentUser.role !== "ADMIN") {
      return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 })
    }

    const body = await request.json()
    const { username, email, password, firstName, lastName, phone, role = "STAFF" } = body

    // Validate required fields
    if (!username || !email || !password) {
      return NextResponse.json({ error: "Username, email, and password are required" }, { status: 400 })
    }

    // Check if user already exists
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [{ username }, { email }],
      },
    })

    if (existingUser) {
      return NextResponse.json({ error: "User with this username or email already exists" }, { status: 400 })
    }

    // Create user
    const newUser = await createUser({
      username,
      email,
      password,
      firstName,
      lastName,
      phone,
      role: role as "ADMIN" | "STAFF",
    })

    // Log activity
    await logUserActivity("CREATE_USER", `Created new user: ${newUser.username}`, request, currentUser.id, {
      createdUserId: newUser.id,
    })

    console.log("✅ User created successfully:", newUser.username)

    // Remove password from response
    const { password: _, ...safeUser } = newUser

    return NextResponse.json({
      success: true,
      user: safeUser,
    })
  } catch (error) {
    console.error("❌ Create user API error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
