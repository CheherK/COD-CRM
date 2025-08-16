import { deliveryRegistry } from "./agency-registry"
import { logOrderActivity } from "../activity-logger"
import { prismaClient } from "../prisma"
import type { DeliveryOrder, DeliveryOrderResponse, DeliveryTrackingResponse, DeliveryShipment } from "./types"
import type { NextRequest } from "next/server"

export class DeliveryService {
  private static instance: DeliveryService

  private constructor() {}

  public static getInstance(): DeliveryService {
    if (!DeliveryService.instance) {
      DeliveryService.instance = new DeliveryService()
    }
    return DeliveryService.instance
  }

  async createShipment(
    orderId: string,
    agencyId: string,
    order: DeliveryOrder,
    request: NextRequest,
    userId?: string,
  ): Promise<DeliveryOrderResponse> {
    console.log(`🚚 Creating shipment for order ${orderId} with agency ${agencyId}`)

    try {
      // Get agency and config
      const agency = deliveryRegistry.getAgency(agencyId)
      const config = deliveryRegistry.getAgencyConfig(agencyId)

      if (!agency || !config) {
        return {
          success: false,
          error: "Agency not found",
          errorDetails: `Delivery agency ${agencyId} is not registered`,
        }
      }

      if (!config.enabled) {
        return {
          success: false,
          error: "Agency disabled",
          errorDetails: `Delivery agency ${agencyId} is currently disabled`,
        }
      }

      // Validate order
      const validation = agency.validateOrder(order)
      if (!validation.valid) {
        return {
          success: false,
          error: "Order validation failed",
          errorDetails: validation.errors.join(", "),
        }
      }

      // Check if agency supports the region
      if (!agency.supportedRegions.includes(order.governorate)) {
        return {
          success: false,
          error: "Unsupported region",
          errorDetails: `Agency ${agency.name} does not support ${order.governorate}`,
        }
      }

      // Create order with agency
      const result = await agency.createOrder(order, config.credentials)

      if (result.success && result.trackingNumber) {
        // Save shipment to database
        const shipment = await prismaClient.deliveryShipment.create({
          data: {
            orderId,
            agencyId,
            trackingNumber: result.trackingNumber,
            barcode: result.barcode,
            status: "PENDING",
            printUrl: result.printUrl,
            metadata: {
              customerName: order.customerName,
              governorate: order.governorate,
              city: order.city,
              price: order.price,
            },
          },
        })

        // Log initial status
        await prismaClient.deliveryStatusLog.create({
          data: {
            shipmentId: shipment.id,
            status: "PENDING",
            message: "Shipment created",
            timestamp: new Date(),
            source: "api",
          },
        })

        // Log activity
        await logOrderActivity(
          "ORDER_SHIPPED",
          `Order ${orderId} shipped via ${agency.name} - Tracking: ${result.trackingNumber}`,
          request,
          userId,
          orderId,
          {
            agencyId,
            agencyName: agency.name,
            trackingNumber: result.trackingNumber,
            shipmentId: shipment.id,
          },
        )

        console.log(`✅ Shipment created successfully: ${result.trackingNumber}`)
      }

      return result
    } catch (error) {
      console.error(`❌ Failed to create shipment for order ${orderId}:`, error)
      return {
        success: false,
        error: "Service error",
        errorDetails: error instanceof Error ? error.message : "Unknown error",
      }
    }
  }

  async trackShipment(shipmentId: string): Promise<DeliveryTrackingResponse> {
    console.log(`🔍 Tracking shipment ${shipmentId}`)

    try {
      // Get shipment from database
      const shipment = await prismaClient.deliveryShipment.findUnique({
        where: { id: shipmentId },
      })

      if (!shipment) {
        return {
          success: false,
          error: "Shipment not found",
          errorDetails: `Shipment ${shipmentId} does not exist`,
        }
      }

      // Get agency and config
      const agency = deliveryRegistry.getAgency(shipment.agencyId)
      const config = deliveryRegistry.getAgencyConfig(shipment.agencyId)

      if (!agency || !config) {
        return {
          success: false,
          error: "Agency not found",
          errorDetails: `Delivery agency ${shipment.agencyId} is not registered`,
        }
      }

      // Get status from agency
      const result = await agency.getOrderStatus(shipment.trackingNumber, config.credentials)

      if (result.success && result.status) {
        // Update shipment status if changed
        if (result.status.status !== shipment.status) {
          await prismaClient.deliveryShipment.update({
            where: { id: shipmentId },
            data: {
              status: result.status.status,
              lastStatusUpdate: new Date(),
            },
          })

          // Log status change
          await prismaClient.deliveryStatusLog.create({
            data: {
              shipmentId,
              status: result.status.status,
              statusCode: result.status.statusCode,
              message: result.status.message,
              timestamp: new Date(),
              source: "api",
            },
          })

          console.log(`📝 Updated shipment ${shipmentId} status to ${result.status.status}`)
        }
      }

      return result
    } catch (error) {
      console.error(`❌ Failed to track shipment ${shipmentId}:`, error)
      return {
        success: false,
        error: "Service error",
        errorDetails: error instanceof Error ? error.message : "Unknown error",
      }
    }
  }

  async trackShipmentByTrackingNumber(trackingNumber: string): Promise<DeliveryTrackingResponse> {
    console.log(`🔍 Tracking shipment by tracking number ${trackingNumber}`)

    try {
      // Get shipment from database
      const shipment = await prismaClient.deliveryShipment.findUnique({
        where: { trackingNumber },
      })

      if (!shipment) {
        return {
          success: false,
          error: "Shipment not found",
          errorDetails: `Shipment with tracking number ${trackingNumber} does not exist`,
        }
      }

      return this.trackShipment(shipment.id)
    } catch (error) {
      console.error(`❌ Failed to track shipment by tracking number ${trackingNumber}:`, error)
      return {
        success: false,
        error: "Service error",
        errorDetails: error instanceof Error ? error.message : "Unknown error",
      }
    }
  }

  async getShipmentHistory(shipmentId: string): Promise<DeliveryTrackingResponse> {
    console.log(`📋 Getting shipment history for ${shipmentId}`)

    try {
      // Get shipment from database
      const shipment = await prismaClient.deliveryShipment.findUnique({
        where: { id: shipmentId },
      })

      if (!shipment) {
        return {
          success: false,
          error: "Shipment not found",
          errorDetails: `Shipment ${shipmentId} does not exist`,
        }
      }

      // Get agency and config
      const agency = deliveryRegistry.getAgency(shipment.agencyId)
      const config = deliveryRegistry.getAgencyConfig(shipment.agencyId)

      if (!agency || !config) {
        return {
          success: false,
          error: "Agency not found",
          errorDetails: `Delivery agency ${shipment.agencyId} is not registered`,
        }
      }

      // Get history from agency
      const result = await agency.getOrderHistory(shipment.trackingNumber, config.credentials)

      if (result.success && result.status?.history) {
        // Update local status logs with any new entries
        const existingLogs = await prismaClient.deliveryStatusLog.findMany({
          where: { shipmentId },
          orderBy: { timestamp: "desc" },
        })

        for (const historyItem of result.status.history) {
          // Check if this status change already exists
          const exists = existingLogs.some(
            (log) =>
              log.status === historyItem.status &&
              Math.abs(log.timestamp.getTime() - historyItem.date.getTime()) < 60000, // Within 1 minute
          )

          if (!exists) {
            await prismaClient.deliveryStatusLog.create({
              data: {
                shipmentId,
                status: historyItem.status,
                message: historyItem.message,
                timestamp: historyItem.date,
                source: "api",
              },
            })
          }
        }

        // Update shipment with latest status
        const latestStatus = result.status.history[0]
        if (latestStatus && latestStatus.status !== shipment.status) {
          await prismaClient.deliveryShipment.update({
            where: { id: shipmentId },
            data: {
              status: latestStatus.status,
              lastStatusUpdate: latestStatus.date,
            },
          })
        }
      }

      return result
    } catch (error) {
      console.error(`❌ Failed to get shipment history for ${shipmentId}:`, error)
      return {
        success: false,
        error: "Service error",
        errorDetails: error instanceof Error ? error.message : "Unknown error",
      }
    }
  }

  async syncAllShipments(): Promise<void> {
    console.log("🔄 Starting shipment sync process")

    try {
      const activeShipments = await prismaClient.deliveryShipment.findMany({
        where: {
          status: {
            in: ["PENDING", "CONFIRMED", "PICKED_UP", "IN_TRANSIT", "OUT_FOR_DELIVERY"],
          },
        },
      })

      console.log(`Found ${activeShipments.length} active shipments to sync`)

      for (const shipment of activeShipments) {
        try {
          await this.trackShipment(shipment.id)
          // Add small delay to avoid overwhelming APIs
          await new Promise((resolve) => setTimeout(resolve, 1000))
        } catch (error) {
          console.error(`Failed to sync shipment ${shipment.id}:`, error)
        }
      }

      console.log("✅ Shipment sync completed")
    } catch (error) {
      console.error("❌ Shipment sync failed:", error)
    }
  }

  async getShipmentsByOrderId(orderId: string): Promise<DeliveryShipment[]> {
    try {
      const shipments = await prismaClient.deliveryShipment.findMany({
        where: { orderId },
      })
      return shipments
    } catch (error) {
      console.error(`❌ Failed to get shipments for order ${orderId}:`, error)
      return []
    }
  }

  async getDeliveryStats(): Promise<{
    totalShipments: number
    activeShipments: number
    deliveredShipments: number
    pendingShipments: number
    byAgency: Record<string, number>
    byStatus: Record<string, number>
  }> {
    try {
      return await prismaClient.getDeliveryStats()
    } catch (error) {
      console.error("❌ Failed to get delivery stats:", error)
      return {
        totalShipments: 0,
        activeShipments: 0,
        deliveredShipments: 0,
        pendingShipments: 0,
        byAgency: {},
        byStatus: {},
      }
    }
  }

  async getAllShipments(limit?: number): Promise<DeliveryShipment[]> {
    console.log("📦 Getting all shipments")

    try {
      const shipments = await prismaClient.deliveryShipment.findMany({
        ...(limit && { take: limit }),
        orderBy: { createdAt: "desc" },
      })

      return shipments
    } catch (error) {
      console.error("❌ Failed to get shipments:", error)
      return []
    }
  }

  async deleteShipment(shipmentId: string): Promise<boolean> {
    console.log(`🗑️ Deleting shipment ${shipmentId}`)

    try {
      const shipment = await prismaClient.deliveryShipment.findUnique({
        where: { id: shipmentId },
      })

      if (!shipment) {
        return false
      }

      // You might want to soft delete instead of hard delete
      // For now, we'll just update the status to indicate deletion
      await prismaClient.deliveryShipment.update({
        where: { id: shipmentId },
        data: {
          status: "CANCELLED",
          updatedAt: new Date(),
        },
      })

      console.log(`✅ Shipment ${shipmentId} deleted (cancelled)`)
      return true
    } catch (error) {
      console.error(`❌ Failed to delete shipment ${shipmentId}:`, error)
      return false
    }
  }

  async retryShipment(shipmentId: string, request: NextRequest, userId?: string): Promise<DeliveryOrderResponse> {
    console.log(`🔄 Retrying shipment ${shipmentId}`)

    try {
      const shipment = await prismaClient.deliveryShipment.findUnique({
        where: { id: shipmentId },
      })

      if (!shipment || !shipment.metadata) {
        return {
          success: false,
          error: "Shipment not found or missing metadata",
        }
      }

      // Reconstruct the original order from metadata
      const order = {
        customerName: shipment.metadata.customerName as string,
        governorate: shipment.metadata.governorate as string,
        city: shipment.metadata.city as string,
        address: shipment.metadata.address as string,
        phone: shipment.metadata.phone as string,
        phone2: shipment.metadata.phone2 as string,
        productName: shipment.metadata.productName as string,
        price: shipment.metadata.price as number,
        comment: shipment.metadata.comment as string,
        isExchange: (shipment.metadata.isExchange as boolean) || false,
      }

      // Create a new shipment
      return this.createShipment(shipment.orderId, shipment.agencyId, order, request, userId)
    } catch (error) {
      console.error(`❌ Failed to retry shipment ${shipmentId}:`, error)
      return {
        success: false,
        error: "Service error",
        errorDetails: error instanceof Error ? error.message : "Unknown error",
      }
    }
  }

  async bulkUpdateShipmentStatus(
    shipmentIds: string[],
    newStatus: string,
    request: NextRequest,
    userId?: string,
  ): Promise<{ success: boolean; updated: number; errors: string[] }> {
    console.log(`📦 Bulk updating ${shipmentIds.length} shipments to status: ${newStatus}`)

    const errors: string[] = []
    let updated = 0

    for (const shipmentId of shipmentIds) {
      try {
        const result = await prismaClient.deliveryShipment.update({
          where: { id: shipmentId },
          data: {
            status: newStatus,
            lastStatusUpdate: new Date(),
            updatedAt: new Date(),
          },
        })

        if (result) {
          updated++

          // Log status change
          await prismaClient.deliveryStatusLog.create({
            data: {
              shipmentId,
              status: newStatus,
              message: `Bulk status update to ${newStatus}`,
              timestamp: new Date(),
              source: "manual",
            },
          })
        }
      } catch (error) {
        console.error(`❌ Failed to update shipment ${shipmentId}:`, error)
        errors.push(`Shipment ${shipmentId}: ${error instanceof Error ? error.message : "Unknown error"}`)
      }
    }

    // Log activity
    if (userId) {
      await logOrderActivity(
        "SHIPMENTS_BULK_UPDATED",
        `Bulk updated ${updated} shipments to status ${newStatus}`,
        request,
        userId,
        undefined,
        {
          shipmentIds,
          newStatus,
          updated,
          errors: errors.length,
        },
      )
    }

    console.log(`✅ Bulk update completed: ${updated} updated, ${errors.length} errors`)

    return {
      success: errors.length === 0,
      updated,
      errors,
    }
  }
}

// Export singleton instance
export const deliveryService = DeliveryService.getInstance()
