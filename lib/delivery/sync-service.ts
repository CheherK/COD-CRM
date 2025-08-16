import { deliveryService } from "./delivery-service"

export interface SyncResult {
  processed: number
  updated: number
  errors: number
  duration: number
  details: string[]
}

export class DeliverySyncService {
  private static instance: DeliverySyncService
  private isRunning = false
  private lastSync: Date | null = null
  private syncInterval: NodeJS.Timeout | null = null

  private constructor() {}

  public static getInstance(): DeliverySyncService {
    if (!DeliverySyncService.instance) {
      DeliverySyncService.instance = new DeliverySyncService()
    }
    return DeliverySyncService.instance
  }

  public async syncAllShipments(): Promise<SyncResult> {
    if (this.isRunning) {
      throw new Error("Sync already in progress")
    }

    console.log("🔄 Starting delivery sync process...")

    const startTime = Date.now()
    this.isRunning = true
    this.lastSync = new Date()

    const result: SyncResult = {
      processed: 0,
      updated: 0,
      errors: 0,
      duration: 0,
      details: [],
    }

    try {
      // Get all active shipments
      const activeShipments = await deliveryService.getShipmentsByOrderId("")

      // Filter for active statuses only
      const shipmentsToSync = activeShipments.filter((shipment) =>
        ["PENDING", "CONFIRMED", "PICKED_UP", "IN_TRANSIT", "OUT_FOR_DELIVERY"].includes(shipment.status),
      )

      console.log(`Found ${shipmentsToSync.length} active shipments to sync`)
      result.processed = shipmentsToSync.length

      for (const shipment of shipmentsToSync) {
        try {
          console.log(`🔍 Syncing shipment ${shipment.id} (${shipment.trackingNumber})`)

          const trackingResult = await deliveryService.trackShipment(shipment.id)

          if (trackingResult.success && trackingResult.status) {
            const oldStatus = shipment.status
            const newStatus = trackingResult.status.status

            if (oldStatus !== newStatus) {
              result.updated++
              result.details.push(`Shipment ${shipment.trackingNumber}: ${oldStatus} → ${newStatus}`)
              console.log(`📝 Updated shipment ${shipment.trackingNumber}: ${oldStatus} → ${newStatus}`)
            } else {
              result.details.push(`Shipment ${shipment.trackingNumber}: No status change (${oldStatus})`)
            }
          } else {
            result.errors++
            result.details.push(`Shipment ${shipment.trackingNumber}: ${trackingResult.error || "Unknown error"}`)
            console.warn(`⚠️ Failed to sync shipment ${shipment.trackingNumber}:`, trackingResult.error)
          }

          // Add small delay to avoid overwhelming APIs
          await new Promise((resolve) => setTimeout(resolve, 500))
        } catch (error) {
          result.errors++
          const errorMessage = error instanceof Error ? error.message : "Unknown error"
          result.details.push(`Shipment ${shipment.trackingNumber}: ${errorMessage}`)
          console.error(`❌ Error syncing shipment ${shipment.trackingNumber}:`, error)
        }
      }

      result.duration = Date.now() - startTime

      console.log(
        `✅ Sync completed: ${result.processed} processed, ${result.updated} updated, ${result.errors} errors in ${result.duration}ms`,
      )

      return result
    } catch (error) {
      result.errors++
      result.duration = Date.now() - startTime
      console.error("❌ Sync process failed:", error)
      throw error
    } finally {
      this.isRunning = false
    }
  }

  public async syncSingleShipment(shipmentId: string): Promise<{ success: boolean; error?: string }> {
    console.log(`🔍 Syncing single shipment: ${shipmentId}`)

    try {
      const result = await deliveryService.trackShipment(shipmentId)

      if (result.success) {
        console.log(`✅ Single shipment sync successful: ${shipmentId}`)
        return { success: true }
      } else {
        console.log(`❌ Single shipment sync failed: ${shipmentId}`, result.error)
        return { success: false, error: result.error }
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error"
      console.error(`❌ Single shipment sync error for ${shipmentId}:`, error)
      return { success: false, error: errorMessage }
    }
  }

  public startAutoSync(intervalMinutes = 30): void {
    if (this.syncInterval) {
      this.stopAutoSync()
    }

    console.log(`🔄 Starting auto-sync with ${intervalMinutes} minute interval`)

    this.syncInterval = setInterval(
      async () => {
        try {
          console.log("🔄 Running scheduled sync...")
          await this.syncAllShipments()
        } catch (error) {
          console.error("❌ Scheduled sync failed:", error)
        }
      },
      intervalMinutes * 60 * 1000,
    )
  }

  public stopAutoSync(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval)
      this.syncInterval = null
      console.log("⏹️ Auto-sync stopped")
    }
  }

  public getStatus(): {
    isRunning: boolean
    lastSync: Date | null
    autoSyncEnabled: boolean
  } {
    return {
      isRunning: this.isRunning,
      lastSync: this.lastSync,
      autoSyncEnabled: this.syncInterval !== null,
    }
  }

  public async syncByAgency(agencyId: string): Promise<SyncResult> {
    console.log(`🔄 Starting sync for agency: ${agencyId}`)

    const startTime = Date.now()
    const result: SyncResult = {
      processed: 0,
      updated: 0,
      errors: 0,
      duration: 0,
      details: [],
    }

    try {
      // Get all active shipments for this agency
      const activeShipments = await deliveryService.getAllShipments()
      const agencyShipments = activeShipments.filter(
        (shipment) =>
          shipment.agencyId === agencyId &&
          ["PENDING", "CONFIRMED", "PICKED_UP", "IN_TRANSIT", "OUT_FOR_DELIVERY"].includes(shipment.status),
      )

      console.log(`Found ${agencyShipments.length} active shipments for agency ${agencyId}`)
      result.processed = agencyShipments.length

      for (const shipment of agencyShipments) {
        try {
          const trackingResult = await deliveryService.trackShipment(shipment.id)

          if (trackingResult.success && trackingResult.status) {
            const oldStatus = shipment.status
            const newStatus = trackingResult.status.status

            if (oldStatus !== newStatus) {
              result.updated++
              result.details.push(`${shipment.trackingNumber}: ${oldStatus} → ${newStatus}`)
            }
          } else {
            result.errors++
            result.details.push(`${shipment.trackingNumber}: ${trackingResult.error || "Unknown error"}`)
          }

          // Delay between requests
          await new Promise((resolve) => setTimeout(resolve, 1000))
        } catch (error) {
          result.errors++
          const errorMessage = error instanceof Error ? error.message : "Unknown error"
          result.details.push(`${shipment.trackingNumber}: ${errorMessage}`)
        }
      }

      result.duration = Date.now() - startTime
      console.log(`✅ Agency sync completed for ${agencyId}:`, result)

      return result
    } catch (error) {
      result.errors++
      result.duration = Date.now() - startTime
      console.error(`❌ Agency sync failed for ${agencyId}:`, error)
      throw error
    }
  }
}

export const deliverySyncService = DeliverySyncService.getInstance()
