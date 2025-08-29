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
      // Get active shipments
      const activeShipments = await prisma.deliveryShipment.findMany({
        where: {
          status: {
            in: ['PENDING', 'CONFIRMED', 'PICKED_UP', 'IN_TRANSIT', 'OUT_FOR_DELIVERY'],
          },
        },
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
            console.warn(`⚠️ Failed to sync ${shipment.trackingNumber}`)
          }

          // Rate limiting
          await new Promise((resolve) => setTimeout(resolve, 500))
        } catch (error) {
          result.errors++
          console.error(`❌ Error syncing ${shipment.trackingNumber}:`, error)
        }
      }

      result.duration = Date.now() - startTime
      console.log(`✅ Sync completed: ${result.processed} processed, ${result.updated} updated, ${result.errors} errors`)

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

  public getStatus(): {
    isRunning: boolean
    lastSync: Date | null
  } {
    return {
      isRunning: this.isRunning,
      lastSync: this.lastSync,
    }
  }
}

// Export singleton instance
export const deliverySyncService = DeliverySyncService.getInstance()