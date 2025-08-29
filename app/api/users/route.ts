import { type NextRequest, NextResponse } from "next/server"
import { verifyToken } from "@/lib/auth-server"
import prisma from "@/lib/prisma"
import bcrypt from "bcryptjs"

export async function GET(request: NextRequest) {
  try {
    console.log("=== GET USERS API CALLED ===")

    const token = request.cookies.get("auth-token")?.value

    if (!token) {
      console.log("❌ No token provided")
      return NextResponse.json({ error: "No token provided" }, { status: 401 })
    }

    const user = verifyToken(token)

    if (!user) {
      console.log("❌ Invalid token")
      return NextResponse.json({ error: "Invalid token" }, { status: 401 })
    }

    // Only admins can get all users
    if (user.role !== "ADMIN") {
      console.log("❌ User not admin:", user.username)
      return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const status = searchParams.get("status")
    const role = searchParams.get("role")
    const search = searchParams.get("search")

    // Build where clause
    let whereClause: any = {}

    if (status && status !== "all") {
      whereClause.status = status
    }

    if (role && role !== "all") {
      whereClause.role = role
    }

    if (search) {
      whereClause.OR = [
        {
          username: {
            contains: search,
            mode: 'insensitive'
          }
        },
        {
          email: {
            contains: search,
            mode: 'insensitive'
          }
        },
        {
          firstName: {
            contains: search,
            mode: 'insensitive'
          }
        },
        {
          lastName: {
            contains: search,
            mode: 'insensitive'
          }
        }
      ]
    }

    const users = await prisma.user.findMany({
      where: whereClause,
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
        _count: {
          select: {
            orders: true,
            activities: true
          }
        }
      },
    })

    console.log("✅ Retrieved", users.length, "users for admin:", user.username)

    return NextResponse.json({
      success: true,
      users,
      total: users.length
    })
  } catch (error) {
    console.error("❌ Get users API error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    console.log("=== CREATE USER API CALLED ===")

    const token = request.cookies.get("auth-token")?.value

    if (!token) {
      return NextResponse.json({ error: "No token provided" }, { status: 401 })
    }

    const user = verifyToken(token)

    if (!user) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 })
    }

    // Only admins can create users
    if (user.role !== "ADMIN") {
      return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 })
    }

    const body = await request.json()
    const { username, email, password, firstName, lastName, phone, role = "STAFF" } = body

    // Validate required fields
    if (!username || !email || !password) {
      return NextResponse.json({ error: "Username, email, and password are required" }, { status: 400 })
    }

    // Validate password strength
    if (password.length < 6) {
      return NextResponse.json({ error: "Password must be at least 6 characters long" }, { status: 400 })
    }

    // Validate role
    if (!["ADMIN", "STAFF"].includes(role)) {
      return NextResponse.json({ error: "Invalid role. Must be ADMIN or STAFF" }, { status: 400 })
    }

    // Check if user already exists
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [
          { username },
          { email }
        ],
      },
    })

    if (existingUser) {
      return NextResponse.json({ 
        error: existingUser.username === username 
          ? "Username already exists" 
          : "Email already exists" 
      }, { status: 400 })
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12)

    // Create user in transaction
    const newUser = await prisma.$transaction(async (tx) => {
      // Create the user
      const createdUser = await tx.user.create({
        data: {
          username,
          email,
          password: hashedPassword,
          firstName: firstName || null,
          lastName: lastName || null,
          phone: phone || null,
          role: role as "ADMIN" | "STAFF",
          status: "ENABLED"
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

      // Log activity
      await tx.activity.create({
        data: {
          type: "USER_CREATED",
          description: `User ${username} created by ${user.username}`,
          userId: user.id,
          metadata: {
            createdUserId: createdUser.id,
            createdUsername: username,
            role: role
          },
          ipAddress: request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "127.0.0.1",
          userAgent: request.headers.get("user-agent") || "unknown"
        }
      })

      return createdUser
    })

    console.log("✅ User created successfully:", newUser.username)

    return NextResponse.json({
      success: true,
      user: newUser,
      message: "User created successfully"
    }, { status: 201 })

  } catch (error) {
    console.error("❌ Create user API error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}