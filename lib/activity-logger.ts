// lib/activity-logger.ts
import { NextRequest } from "next/server"
import prisma from "./prisma"

interface ActivityMetadata {
  [key: string]: any
}

export async function logActivity(
  type: string,
  description: string,
  request: NextRequest,
  userId?: string,
  metadata?: ActivityMetadata
): Promise<void> {
  try {
    await prisma.activity.create({
      data: {
        type,
        description,
        userId: userId || null,
        metadata: metadata || {},
        ipAddress: getIpAddress(request),
        userAgent: request.headers.get("user-agent") || "unknown",
      }
    })
  } catch (error) {
    console.error("Failed to log activity:", error)
    // Don't throw error to prevent breaking the main operation
  }
}

export async function logAuthActivity(
  type: string,
  description: string,
  request: NextRequest,
  userId?: string,
  metadata?: ActivityMetadata
): Promise<void> {
  await logActivity(`AUTH_${type}`, description, request, userId, metadata)
}

export async function logUserActivity(
  type: string,
  description: string,
  request: NextRequest,
  userId?: string,
  metadata?: ActivityMetadata
): Promise<void> {
  await logActivity(`USER_${type}`, description, request, userId, metadata)
}

export async function logOrderActivity(
  type: string,
  description: string,
  request: NextRequest,
  userId?: string,
  orderId?: string,
  metadata?: ActivityMetadata
): Promise<void> {
  const activityMetadata = {
    ...metadata,
    ...(orderId && { orderId })
  }
  await logActivity(`ORDER_${type}`, description, request, userId, activityMetadata)
}

export async function logSystemActivity(
  type: string,
  description: string,
  request: NextRequest,
  userId?: string,
  metadata?: ActivityMetadata
): Promise<void> {
  await logActivity(`SYSTEM_${type}`, description, request, userId, metadata)
}

export async function logDeliveryActivity(
  type: string,
  description: string,
  request: NextRequest,
  userId?: string,
  metadata?: ActivityMetadata
): Promise<void> {
  await logActivity(`DELIVERY_${type}`, description, request, userId, metadata)
}

export function getIpAddress(request: NextRequest): string {
  // Try multiple headers for IP address (common in reverse proxy setups)
  const forwarded = request.headers.get("x-forwarded-for")
  if (forwarded) {
    return forwarded.split(',')[0].trim()
  }

  const realIp = request.headers.get("x-real-ip")
  if (realIp) {
    return realIp
  }

  const cfConnectingIp = request.headers.get("cf-connecting-ip")
  if (cfConnectingIp) {
    return cfConnectingIp
  }

  return "127.0.0.1"
}