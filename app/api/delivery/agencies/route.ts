import { type NextRequest, NextResponse } from "next/server"
import { verifyToken } from "@/lib/auth-server"
import { deliveryRegistry } from "@/lib/delivery/agency-registry"

export async function GET(request: NextRequest) {
  try {
    console.log("=== GET DELIVERY AGENCIES API CALLED ===")

    const token = request.cookies.get("auth-token")?.value

    if (!token) {
      return NextResponse.json({ error: "No token provided" }, { status: 401 })
    }

    const user = verifyToken(token)

    if (!user) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 })
    }

    // Ensure registry is initialized
    await deliveryRegistry.ensureInitialized()

    // Get all agencies with their configs
    const agencies = deliveryRegistry.getAllAgencies().map((agency) => {
      const config = deliveryRegistry.getAgencyConfig(agency.id)
      return {
        id: agency.id,
        name: agency.name,
        supportedRegions: agency.supportedRegions,
        enabled: config?.enabled || false,
        configured: config?.credentials
          ? !!(config.credentials.username || config.credentials.email || config.credentials.apiKey)
          : false,
        credentialsType: config?.credentials?.type || "username_password",
      }
    })

    console.log("✅ Retrieved delivery agencies:", agencies.length)

    return NextResponse.json({ agencies })
  } catch (error) {
    console.error("❌ Get delivery agencies API error:", error)
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    console.log("=== UPDATE DELIVERY AGENCY CONFIG API CALLED ===")

    const token = request.cookies.get("auth-token")?.value

    if (!token) {
      return NextResponse.json({ error: "No token provided" }, { status: 401 })
    }

    const user = verifyToken(token)

    if (!user || user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized - Admin access required" }, { status: 403 })
    }

    const body = await request.json()
    const { agencyId, config } = body

    if (!agencyId || !config) {
      return NextResponse.json({ error: "Agency ID and config are required" }, { status: 400 })
    }

    // Ensure registry is initialized
    await deliveryRegistry.ensureInitialized()

    // Validate agency exists
    const agency = deliveryRegistry.getAgency(agencyId)
    if (!agency) {
      return NextResponse.json({ error: "Agency not found" }, { status: 404 })
    }

    // Validate config structure
    if (config.credentials && !config.credentials.type) {
      return NextResponse.json({ error: "Credentials type is required" }, { status: 400 })
    }

    // Update agency config
    await deliveryRegistry.updateAgencyConfig(agencyId, config)

    console.log("✅ Updated delivery agency config:", agencyId)

    return NextResponse.json({ success: true, message: "Agency configuration updated successfully" })
  } catch (error) {
    console.error("❌ Update delivery agency config API error:", error)
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
