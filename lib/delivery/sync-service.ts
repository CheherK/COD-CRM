// lib/delivery/sync-service.ts
import { deliveryService } from './delivery-service'
import prisma from '@/lib/prisma'
import type { SyncResult } from './types'

export class DeliverySyncService {
  private static instance: DeliverySyncService
  private isRunning = false
  private lastSync: Date | null = null

  private constructor() {}

  public static getInstance(): DeliverySyncService {
    if (!DeliverySyncService.instance) {
      DeliverySyncService.instance = new DeliverySyncService()
    }
    return DeliverySyncService.instance
  }

  public async syncAllShipments(): Promise<SyncResult> {
    if (this.isRunning) {
      throw new Error('Sync already in progress')
    }

    console.log('🔄 Starting shipment sync with order status updates...')

    const startTime = Date.now()
    this.isRunning = true
    this.lastSync = new Date()

    const result: SyncResult = {
      processed: 0,
      updated: 0,
      errors: 0,
      duration: 0,
    }

    try {
      // Get active shipments (not yet delivered or returned)
      const activeShipments = await prisma.deliveryShipment.findMany({
        where: {
          status: {
            in: ['UPLOADED', 'DEPOSIT', 'IN_TRANSIT'], // Only sync active statuses
          },
        },
        include: {
          order: true // Include order for status comparison
        },
        orderBy: {
          lastStatusUpdate: 'asc', // Sync oldest first
        }
      })

      console.log(`📦 Found ${activeShipments.length} active shipments`)
      result.processed = activeShipments.length

      for (const shipment of activeShipments) {
        try {
          const oldShipmentStatus = shipment.status
          const oldOrderStatus = shipment.order.status
          
          // Track the shipment (this will update both shipment and order status)
          const trackingResult = await deliveryService.trackShipment(shipment.id)

          if (trackingResult.success && trackingResult.status) {
            const newShipmentStatus = trackingResult.status.status

            if (oldShipmentStatus !== newShipmentStatus) {
              result.updated++
              console.log(`📝 ${shipment.trackingNumber}: Shipment ${oldShipmentStatus} → ${newShipmentStatus}, Order ${oldOrderStatus} → ${newShipmentStatus}`)
            }
          } else {
            result.errors++
            console.warn(`⚠️ Failed to sync ${shipment.trackingNumber}: ${trackingResult.error}`)
          }

        } catch (error) {
          result.errors++
          console.error(`❌ Error syncing ${shipment.trackingNumber}:`, error)
        }

        // Rate limiting - 1 second between requests to avoid overwhelming APIs
        await new Promise((resolve) => setTimeout(resolve, 1000))
      }

      result.duration = Date.now() - startTime
      console.log(`✅ Sync completed: ${result.processed} processed, ${result.updated} updated, ${result.errors} errors in ${result.duration}ms`)

      return result
    } catch (error) {
      result.duration = Date.now() - startTime
      console.error('❌ Sync failed:', error)
      throw error
    } finally {
      this.isRunning = false
    }
  }

  public async syncSingleShipment(shipmentId: string): Promise<{ success: boolean; error?: string; statusChanged?: boolean }> {
    try {
      // Get current shipment and order status
      const shipment = await prisma.deliveryShipment.findUnique({
        where: { id: shipmentId },
        include: { order: true }
      })

      if (!shipment) {
        return { success: false, error: 'Shipment not found' }
      }

      const oldStatus = shipment.status
      const result = await deliveryService.trackShipment(shipmentId)
      
      if (result.success && result.status) {
        const statusChanged = oldStatus !== result.status.status
        console.log(`📝 Single sync ${shipment.trackingNumber}: ${statusChanged ? `${oldStatus} → ${result.status.status}` : 'No change'}`)
        
        return { 
          success: true, 
          statusChanged,
          error: undefined
        }
      } else {
        return { success: false, error: result.error }
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  }

  public async syncShipmentsByStatus(
    status: 'UPLOADED' | 'DEPOSIT' | 'IN_TRANSIT'
  ): Promise<SyncResult> {
    if (this.isRunning) {
      throw new Error('Sync already in progress')
    }

    console.log(`🔄 Starting sync for ${status} shipments with order updates...`)

    const startTime = Date.now()
    this.isRunning = true

    const result: SyncResult = {
      processed: 0,
      updated: 0,
      errors: 0,
      duration: 0,
    }

    try {
      const shipments = await prisma.deliveryShipment.findMany({
        where: { status },
        include: { order: true },
        orderBy: { lastStatusUpdate: 'asc' }
      })

      console.log(`📦 Found ${shipments.length} shipments with status ${status}`)
      result.processed = shipments.length

      for (const shipment of shipments) {
        try {
          const oldShipmentStatus = shipment.status
          const oldOrderStatus = shipment.order.status
          
          const trackingResult = await deliveryService.trackShipment(shipment.id)

          if (trackingResult.success && trackingResult.status) {
            const newStatus = trackingResult.status.status

            if (oldShipmentStatus !== newStatus) {
              result.updated++
              console.log(`📝 ${shipment.trackingNumber}: Shipment ${oldShipmentStatus} → ${newStatus}, Order ${oldOrderStatus} → ${newStatus}`)
            }
          } else {
            result.errors++
          }
        } catch (error) {
          result.errors++
          console.error(`❌ Error syncing ${shipment.trackingNumber}:`, error)
        }

        // Rate limiting
        await new Promise((resolve) => setTimeout(resolve, 1000))
      }

      result.duration = Date.now() - startTime
      return result
    } catch (error) {
      result.duration = Date.now() - startTime
      console.error('❌ Status-based sync failed:', error)
      throw error
    } finally {
      this.isRunning = false
    }
  }

  public getStatus(): {
    isRunning: boolean
    lastSync: Date | null
  } {
    return {
      isRunning: this.isRunning,
      lastSync: this.lastSync,
    }
  }

  public async getStaleShipments(hoursOld: number = 2): Promise<any[]> {
    const cutoffTime = new Date(Date.now() - (hoursOld * 60 * 60 * 1000))
    
    return prisma.deliveryShipment.findMany({
      where: {
        status: {
          in: ['UPLOADED', 'DEPOSIT', 'IN_TRANSIT']
        },
        lastStatusUpdate: {
          lt: cutoffTime
        }
      },
      include: {
        order: {
          select: {
            id: true,
            status: true,
            customerName: true
          }
        }
      },
      orderBy: {
        lastStatusUpdate: 'asc'
      }
    })
  }

  // New method to sync and return detailed results
  public async syncWithDetails(): Promise<{
    result: SyncResult
    shipmentUpdates: Array<{
      trackingNumber: string
      orderId: string
      oldShipmentStatus: string
      newShipmentStatus: string
      oldOrderStatus: string
      newOrderStatus: string
    }>
  }> {
    const shipmentUpdates: Array<{
      trackingNumber: string
      orderId: string
      oldShipmentStatus: string
      newShipmentStatus: string
      oldOrderStatus: string
      newOrderStatus: string
    }> = []

    if (this.isRunning) {
      throw new Error('Sync already in progress')
    }

    console.log('🔄 Starting detailed sync...')

    const startTime = Date.now()
    this.isRunning = true
    this.lastSync = new Date()

    const result: SyncResult = {
      processed: 0,
      updated: 0,
      errors: 0,
      duration: 0,
    }

    try {
      const activeShipments = await prisma.deliveryShipment.findMany({
        where: {
          status: {
            in: ['UPLOADED', 'DEPOSIT', 'IN_TRANSIT'],
          },
        },
        include: {
          order: true
        },
        orderBy: {
          lastStatusUpdate: 'asc',
        }
      })

      result.processed = activeShipments.length

      for (const shipment of activeShipments) {
        try {
          const oldShipmentStatus = shipment.status
          const oldOrderStatus = shipment.order.status
          
          const trackingResult = await deliveryService.trackShipment(shipment.id)

          if (trackingResult.success && trackingResult.status) {
            const newShipmentStatus = trackingResult.status.status

            if (oldShipmentStatus !== newShipmentStatus) {
              result.updated++
              
              // Record the update details
              shipmentUpdates.push({
                trackingNumber: shipment.trackingNumber,
                orderId: shipment.orderId,
                oldShipmentStatus,
                newShipmentStatus,
                oldOrderStatus,
                newOrderStatus: newShipmentStatus // Order status matches delivery status
              })
            }
          } else {
            result.errors++
          }

        } catch (error) {
          result.errors++
          console.error(`❌ Error syncing ${shipment.trackingNumber}:`, error)
        }

        await new Promise((resolve) => setTimeout(resolve, 1000))
      }

      result.duration = Date.now() - startTime
      return { result, shipmentUpdates }
      
    } catch (error) {
      result.duration = Date.now() - startTime
      console.error('❌ Detailed sync failed:', error)
      throw error
    } finally {
      this.isRunning = false
    }
  }
}

// Export singleton instance
export const deliverySyncService = DeliverySyncService.getInstance()