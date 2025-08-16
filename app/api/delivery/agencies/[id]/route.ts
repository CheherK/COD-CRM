import { type NextRequest, NextResponse } from "next/server"
import { verifyToken } from "@/lib/auth-server"
import { deliveryRegistry } from "@/lib/delivery/agency-registry"
import prisma from "@/lib/prisma"

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    console.log("=== GET DELIVERY AGENCY API CALLED ===", params.id)

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

    // Get agency from database
    const dbAgency = await prisma.deliveryAgency.findUnique({
      where: { id: params.id },
    })

    if (!dbAgency) {
      return NextResponse.json({ error: "Agency not found" }, { status: 404 })
    }

    // Get agency implementation
    const agency = deliveryRegistry.getAgency(params.id)

    if (!agency) {
      return NextResponse.json({ error: "Agency implementation not found" }, { status: 404 })
    }

    const result = {
      id: dbAgency.id,
      name: dbAgency.name,
      enabled: dbAgency.enabled,
      credentialsType: dbAgency.credentialsType,
      credentialsUsername: dbAgency.credentialsUsername,
      credentialsEmail: dbAgency.credentialsEmail,
      credentialsPassword: user.role === "ADMIN" ? dbAgency.credentialsPassword : undefined,
      credentialsApiKey: user.role === "ADMIN" ? dbAgency.credentialsApiKey : undefined,
      settings: dbAgency.settings,
      webhookUrl: dbAgency.webhookUrl,
      pollingInterval: dbAgency.pollingInterval,
      supportedRegions: agency.supportedRegions,
      createdAt: dbAgency.createdAt,
      updatedAt: dbAgency.updatedAt,
    }

    console.log("✅ Retrieved delivery agency:", result.name)

    return NextResponse.json({ agency: result })
  } catch (error) {
    console.error("❌ Get delivery agency API error:", error)
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    console.log("=== UPDATE DELIVERY AGENCY API CALLED ===", params.id)

    const token = request.cookies.get("auth-token")?.value

    if (!token) {
      return NextResponse.json({ error: "No token provided" }, { status: 401 })
    }

    const user = verifyToken(token)

    if (!user || user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized - Admin access required" }, { status: 403 })
    }

    const body = await request.json()

    // Ensure registry is initialized
    await deliveryRegistry.ensureInitialized()

    // Validate agency exists
    const existingAgency = await prisma.deliveryAgency.findUnique({
      where: { id: params.id },
    })

    if (!existingAgency) {
      return NextResponse.json({ error: "Agency not found" }, { status: 404 })
    }

    // Prepare update data
    const updateData: any = {}

    if (typeof body.enabled === "boolean") {
      updateData.enabled = body.enabled
    }

    if (body.credentialsUsername !== undefined) {
      updateData.credentialsUsername = body.credentialsUsername || null
    }

    if (body.credentialsEmail !== undefined) {
      updateData.credentialsEmail = body.credentialsEmail || null
    }

    if (body.credentialsPassword !== undefined) {
      updateData.credentialsPassword = body.credentialsPassword || null
    }

    if (body.credentialsApiKey !== undefined) {
      updateData.credentialsApiKey = body.credentialsApiKey || null
    }

    if (body.settings !== undefined) {
      updateData.settings = body.settings
    }

    if (body.webhookUrl !== undefined) {
      updateData.webhookUrl = body.webhookUrl || null
    }

    if (typeof body.pollingInterval === "number") {
      updateData.pollingInterval = body.pollingInterval
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: "No valid fields to update" }, { status: 400 })
    }

    // Update in database
    const updatedAgency = await prisma.deliveryAgency.update({
      where: { id: params.id },
      data: updateData,
    })

    // Update in registry
    const config = deliveryRegistry.getAgencyConfig(params.id)
    if (config) {
      await deliveryRegistry.updateAgencyConfig(params.id, {
        enabled: updatedAgency.enabled,
        credentials: {
          type: updatedAgency.credentialsType,
          username: updatedAgency.credentialsUsername || undefined,
          email: updatedAgency.credentialsEmail || undefined,
          password: updatedAgency.credentialsPassword || undefined,
          apiKey: updatedAgency.credentialsApiKey || undefined,
        },
        settings: updatedAgency.settings || {},
        webhookUrl: updatedAgency.webhookUrl || undefined,
        pollingInterval: updatedAgency.pollingInterval,
      })
    }

    console.log("✅ Updated delivery agency:", updatedAgency.name)

    // Return updated agency (without sensitive data)
    const result = {
      id: updatedAgency.id,
      name: updatedAgency.name,
      enabled: updatedAgency.enabled,
      credentialsType: updatedAgency.credentialsType,
      credentialsUsername: updatedAgency.credentialsUsername,
      credentialsEmail: updatedAgency.credentialsEmail,
      settings: updatedAgency.settings,
      webhookUrl: updatedAgency.webhookUrl,
      pollingInterval: updatedAgency.pollingInterval,
      createdAt: updatedAgency.createdAt,
      updatedAt: updatedAgency.updatedAt,
    }

    return NextResponse.json({
      success: true,
      message: "Agency updated successfully",
      agency: result,
    })
  } catch (error) {
    console.error("❌ Update delivery agency API error:", error)
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    console.log("=== DELETE DELIVERY AGENCY API CALLED ===", params.id)

    const token = request.cookies.get("auth-token")?.value

    if (!token) {
      return NextResponse.json({ error: "No token provided" }, { status: 401 })
    }

    const user = verifyToken(token)

    if (!user || user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized - Admin access required" }, { status: 403 })
    }

    // Check if agency exists
    const existingAgency = await prisma.deliveryAgency.findUnique({
      where: { id: params.id },
    })

    if (!existingAgency) {
      return NextResponse.json({ error: "Agency not found" }, { status: 404 })
    }

    // Check if agency has active shipments
    const activeShipments = await prisma.deliveryShipment.findMany({
      where: {
        agencyId: params.id,
        status: {
          in: ["PENDING", "CONFIRMED", "PICKED_UP", "IN_TRANSIT", "OUT_FOR_DELIVERY"],
        },
      },
    })

    if (activeShipments.length > 0) {
      return NextResponse.json(
        {
          error: "Cannot delete agency with active shipments",
          activeShipments: activeShipments.length,
        },
        { status: 409 },
      )
    }

    // Soft delete by disabling the agency
    const updatedAgency = await prisma.deliveryAgency.update({
      where: { id: params.id },
      data: {
        enabled: false,
        credentialsUsername: null,
        credentialsEmail: null,
        credentialsPassword: null,
        credentialsApiKey: null,
      },
    })

    console.log("✅ Deleted (disabled) delivery agency:", updatedAgency.name)

    return NextResponse.json({
      success: true,
      message: "Agency deleted successfully",
    })
  } catch (error) {
    console.error("❌ Delete delivery agency API error:", error)
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
