import type { NextRequest } from "next/server"
import prisma from "./prisma"

export interface ActivityLogEntry {
  type: string
  description: string
  userId?: string
  metadata?: Record<string, any>
  ipAddress?: string
  userAgent?: string
}

class ActivityLogger {
  private static instance: ActivityLogger

  private constructor() {}

  public static getInstance(): ActivityLogger {
    if (!ActivityLogger.instance) {
      ActivityLogger.instance = new ActivityLogger()
    }
    return ActivityLogger.instance
  }

  private extractRequestContext(request: NextRequest): { ipAddress?: string; userAgent?: string } {
    try {
      const ipAddress =
        request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
        request.headers.get("x-real-ip") ||
        request.headers.get("cf-connecting-ip") ||
        request.ip ||
        "127.0.0.1"

      const userAgent = request.headers.get("user-agent") || "unknown"

      return { ipAddress, userAgent }
    } catch (error) {
      console.warn("⚠️ Could not extract request context:", error)
      return { ipAddress: "127.0.0.1", userAgent: "unknown" }
    }
  }

  public async logActivity(
    type: string,
    description: string,
    request: NextRequest,
    userId?: string,
    metadata?: Record<string, any>,
  ): Promise<void> {
    try {
      const context = this.extractRequestContext(request)

      const activity = await prisma.createActivity({
        type,
        description,
        userId,
        metadata: metadata || {},
        ipAddress: context.ipAddress,
        userAgent: context.userAgent,
      })

      console.log(`📝 Activity logged: ${type} - ${description} (User: ${userId || "system"})`)
      return activity
    } catch (error) {
      console.error("❌ Failed to log activity:", error)
      // Don't throw error to avoid breaking main application flow
    }
  }

  // Convenience methods for common activity types
  public async logUserActivity(
    type: string,
    description: string,
    request: NextRequest,
    userId?: string,
    metadata?: Record<string, any>,
  ): Promise<void> {
    return this.logActivity(type, description, request, userId, metadata)
  }

  public async logOrderActivity(
    type: string,
    description: string,
    request: NextRequest,
    userId?: string,
    orderId?: string,
    metadata?: Record<string, any>,
  ): Promise<void> {
    const enhancedMetadata = { ...metadata, orderId }
    return this.logActivity(type, description, request, userId, enhancedMetadata)
  }

  public async logSystemActivity(
    type: string,
    description: string,
    request: NextRequest,
    metadata?: Record<string, any>,
  ): Promise<void> {
    return this.logActivity(type, description, request, undefined, metadata)
  }

  // New method for authentication activities
  public async logAuthActivity(
    type: "LOGIN" | "LOGOUT" | "LOGIN_FAILED" | "PASSWORD_CHANGED",
    description: string,
    request: NextRequest,
    userId?: string,
    metadata?: Record<string, any>,
  ): Promise<void> {
    return this.logActivity(type, description, request, userId, metadata)
  }

  // New method for admin activities
  public async logAdminActivity(
    type: string,
    description: string,
    request: NextRequest,
    adminUserId: string,
    targetUserId?: string,
    metadata?: Record<string, any>,
  ): Promise<void> {
    const enhancedMetadata = { ...metadata, targetUserId, adminAction: true }
    return this.logActivity(type, description, request, adminUserId, enhancedMetadata)
  }
}

// Export singleton instance and convenience functions
const activityLogger = ActivityLogger.getInstance()

export const logUserActivity = activityLogger.logUserActivity.bind(activityLogger)
export const logOrderActivity = activityLogger.logOrderActivity.bind(activityLogger)
export const logSystemActivity = activityLogger.logSystemActivity.bind(activityLogger)
export const logAuthActivity = activityLogger.logAuthActivity.bind(activityLogger)
export const logAdminActivity = activityLogger.logAdminActivity.bind(activityLogger)

export default activityLogger
