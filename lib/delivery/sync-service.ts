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

    console.log('🔄 Starting shipment sync...')

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
        orderBy: {
          lastStatusUpdate: 'asc', // Sync oldest first
        }
      })

      console.log(`📦 Found ${activeShipments.length} active shipments`)
      result.processed = activeShipments.length

      for (const shipment of activeShipments) {
        try {
          const oldStatus = shipment.status
          const trackingResult = await deliveryService.trackShipment(shipment.id)

          if (trackingResult.success && trackingResult.status) {
            const newStatus = trackingResult.status.status

            if (oldStatus !== newStatus) {
              result.updated++
              console.log(`📝 ${shipment.trackingNumber}: ${oldStatus} → ${newStatus}`)
            }
          } else {
            result.errors++
            console.warn(`⚠️ Failed to sync ${shipment.trackingNumber}: ${trackingResult.error}`)
          }

        } catch (error) {
          result.errors++
          console.error(`❌ Error syncing ${shipment.trackingNumber}:`, error)
        }

        // Rate limiting - 500ms between requests
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

  public async syncSingleShipment(shipmentId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const result = await deliveryService.trackShipment(shipmentId)
      return { success: result.success, error: result.error }
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

    console.log(`🔄 Starting sync for ${status} shipments...`)

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
        orderBy: { lastStatusUpdate: 'asc' }
      })

      console.log(`📦 Found ${shipments.length} shipments with status ${status}`)
      result.processed = shipments.length

      for (const shipment of shipments) {
        try {
          const oldStatus = shipment.status
          const trackingResult = await deliveryService.trackShipment(shipment.id)

          if (trackingResult.success && trackingResult.status) {
            const newStatus = trackingResult.status.status

            if (oldStatus !== newStatus) {
              result.updated++
              console.log(`📝 ${shipment.trackingNumber}: ${oldStatus} → ${newStatus}`)
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
      orderBy: {
        lastStatusUpdate: 'asc'
      }
    })
  }
}

// Export singleton instance
export const deliverySyncService = DeliverySyncService.getInstance()