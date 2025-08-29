import { type NextRequest, NextResponse } from "next/server"
import { verifyToken } from "@/lib/auth-server"
import prisma from "@/lib/prisma"

export async function GET(request: NextRequest) {
  try {
    console.log("=== GET ACTIVITIES API CALLED ===")

    const token = request.cookies.get("auth-token")?.value

    if (!token) {
      console.log("❌ No auth token provided")
      return NextResponse.json({ error: "No token provided" }, { status: 401 })
    }

    const user = verifyToken(token)

    if (!user) {
      console.log("❌ Invalid token")
      return NextResponse.json({ error: "Invalid token" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const limitParam = searchParams.get("limit")
    const userIdParam = searchParams.get("userId")
    const typeParam = searchParams.get("type")

    const limit = limitParam ? Number.parseInt(limitParam, 10) : 15

    // Validate limit parameter
    if (isNaN(limit) || limit < 1 || limit > 100) {
      return NextResponse.json({ error: "Invalid limit parameter. Must be between 1 and 100." }, { status: 400 })
    }

    console.log(`📊 Fetching activities - User: ${user.username}, Role: ${user.role}, Limit: ${limit}`)

    // Build where clause based on user role and parameters
    let whereClause: any = {}

    // Determine which activities to fetch based on user role and permissions
    if (userIdParam) {
      // Specific user requested
      if (user.role === "STAFF" && userIdParam !== user.id) {
        // Staff can only see their own activities
        return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 })
      }
      whereClause.userId = userIdParam
    } else {
      // No specific user requested
      if (user.role === "STAFF") {
        // Staff can only see their own activities
        whereClause.userId = user.id
      }
      // Admins can see all activities (no userId filter)
    }

    // Add type filter if specified
    if (typeParam) {
      whereClause.type = typeParam
    }

    // Fetch activities from database
    const activities = await prisma.activity.findMany({
      where: whereClause,
      include: {
        user: {
          select: {
            id: true,
            username: true,
            firstName: true,
            lastName: true,
            email: true,
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: limit
    })

    console.log(`✅ Retrieved ${activities.length} activities for user ${user.username}`)

    // Format activities for response
    const formattedActivities = activities.map((activity) => ({
      id: activity.id,
      type: activity.type,
      action: activity.type, // For backward compatibility
      description: activity.description,
      details: activity.description, // For backward compatibility
      userId: activity.userId,
      user: activity.user,
      metadata: activity.metadata || {},
      timestamp: activity.timestamp,
      createdAt: activity.createdAt,
      ipAddress: activity.ipAddress,
      userAgent: activity.userAgent,
    }))

    return NextResponse.json({
      success: true,
      activities: formattedActivities,
      total: formattedActivities.length,
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
      },
    })
  } catch (error) {
    console.error("❌ Get activities API error:", error)

    // Return detailed error in development, generic in production
    const isDevelopment = process.env.NODE_ENV === "development"

    return NextResponse.json(
      {
        error: "Failed to load activities",
        ...(isDevelopment && { details: error instanceof Error ? error.message : String(error) }),
      },
      { status: 500 },
    )
  }
}

// Add POST endpoint for manual activity creation (admin only)
export async function POST(request: NextRequest) {
  try {
    console.log("=== CREATE ACTIVITY API CALLED ===")

    const token = request.cookies.get("auth-token")?.value

    if (!token) {
      return NextResponse.json({ error: "No token provided" }, { status: 401 })
    }

    const user = verifyToken(token)

    if (!user || user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }

    const body = await request.json()
    const { type, description, userId, metadata } = body

    if (!type || !description) {
      return NextResponse.json({ error: "Type and description are required" }, { status: 400 })
    }

    const activity = await prisma.activity.create({
      data: {
        type,
        description,
        userId,
        metadata: metadata || {},
        ipAddress: request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "127.0.0.1",
        userAgent: request.headers.get("user-agent") || "unknown",
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            firstName: true,
            lastName: true,
          }
        }
      }
    })

    console.log(`✅ Manual activity created: ${activity.type}`)

    return NextResponse.json({
      success: true,
      activity: {
        id: activity.id,
        type: activity.type,
        description: activity.description,
        userId: activity.userId,
        user: activity.user,
        metadata: activity.metadata,
        timestamp: activity.timestamp,
        createdAt: activity.createdAt,
      },
    })
  } catch (error) {
    console.error("❌ Create activity API error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}