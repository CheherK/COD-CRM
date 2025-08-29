import { deliveryRegistry } from './agency-registry';
import { logOrderActivity } from '@/lib/activity-logger';
import prisma from '@/lib/prisma';
import type {
  DeliveryOrder,
  DeliveryOrderResponse,
  DeliveryTrackingResponse,
  DeliveryShipment,
  SyncResult
} from './types';
import type { NextRequest } from 'next/server';

export class DeliveryService {
  private static instance: DeliveryService;

  private constructor() { }

  public static getInstance(): DeliveryService {
    if (!DeliveryService.instance) {
      DeliveryService.instance = new DeliveryService();
    }
    return DeliveryService.instance;
  }

  async createShipment(
    orderId: string,
    agencyId: string,
    order: DeliveryOrder,
    request: NextRequest,
    userId?: string,
  ): Promise<DeliveryOrderResponse> {
    console.log(`🚚 Creating shipment for order ${orderId} via ${agencyId}`);

    try {
      await deliveryRegistry.ensureInitialized();

      const agency = deliveryRegistry.getAgency(agencyId);
      const config = deliveryRegistry.getAgencyConfig(agencyId);

      if (!agency || !config) {
        return { success: false, error: 'Agency not found' };
      }

      if (!config.enabled) {
        return { success: false, error: 'Agency is disabled' };
      }

      // Create order with agency
      const result = await agency.createOrder(order, config.credentials);

      if (result.success && result.trackingNumber) {
        // Save to database
        const shipment = await prisma.deliveryShipment.create({
          data: {
            orderId,
            agencyId,
            trackingNumber: result.trackingNumber,
            barcode: result.barcode,
            status: 'PENDING',
            lastStatusUpdate: new Date(),
            printUrl: result.printUrl,
            metadata: {
              customerName: order.customerName,
              governorate: order.governorate,
              city: order.city,
              phone: order.customerPhone,
              price: order.price,
            },
          },
        });

        // Log status
        await prisma.deliveryStatusLog.create({
          data: {
            shipmentId: shipment.id,
            status: 'PENDING',
            message: 'Shipment created',
            timestamp: new Date(),
            source: 'api',
          },
        });

        // Log activity
        await logOrderActivity(
          'ORDER_SHIPPED',
          `Order shipped via ${agency.name} - Tracking: ${result.trackingNumber}`,
          request,
          userId,
          orderId,
          {
            agencyId,
            agencyName: agency.name,
            trackingNumber: result.trackingNumber,
          },
        );

        console.log(`✅ Shipment created: ${result.trackingNumber}`);
      }

      return result;
    } catch (error) {
      console.error(`❌ Failed to create shipment:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  async trackShipment(shipmentId: string): Promise<DeliveryTrackingResponse> {
    console.log(`🔍 Tracking shipment ${shipmentId}`);

    try {
      const shipment = await prisma.deliveryShipment.findUnique({
        where: { id: shipmentId },
      });

      if (!shipment) {
        return { success: false, error: 'Shipment not found' };
      }

      const agency = deliveryRegistry.getAgency(shipment.agencyId);
      const config = deliveryRegistry.getAgencyConfig(shipment.agencyId);

      if (!agency || !config) {
        return { success: false, error: 'Agency not found' };
      }

      const result = await agency.trackOrder(shipment.trackingNumber, config.credentials);

      if (result.success && result.status) {
        // Update shipment if status changed
        if (result.status.status !== shipment.status) {
          await prisma.deliveryShipment.update({
            where: { id: shipmentId },
            data: {
              status: result.status.status,
              lastStatusUpdate: new Date(),
            },
          });

          // Log status change
          await prisma.deliveryStatusLog.create({
            data: {
              shipmentId,
              status: result.status.status,
              message: result.status.message,
              timestamp: new Date(),
              source: 'api',
            },
          });

          console.log(`📝 Status updated: ${shipment.status} → ${result.status.status}`);
        }
      }

      return result;
    } catch (error) {
      console.error(`❌ Failed to track shipment:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  async trackShipmentByTrackingNumber(trackingNumber: string): Promise<DeliveryTrackingResponse> {
    const shipment = await prisma.deliveryShipment.findFirst({
      where: { trackingNumber },
    });

    if (!shipment) {
      return { success: false, error: 'Shipment not found' };
    }

    return this.trackShipment(shipment.id);
  }

  async getShipmentsByOrderId(orderId: string): Promise<DeliveryShipment[]> {
    try {
      const shipments = await prisma.deliveryShipment.findMany({
        where: { orderId },
        orderBy: { createdAt: 'desc' },
      });
      return shipments;
    } catch (error) {
      console.error(`❌ Failed to get shipments for order ${orderId}:`, error);
      return [];
    }
  }

  async getAllShipments(limit?: number): Promise<DeliveryShipment[]> {
    try {
      const shipments = await prisma.deliveryShipment.findMany({
        ...(limit && { take: limit }),
        orderBy: { createdAt: 'desc' },
      });
      return shipments;
    } catch (error) {
      console.error('❌ Failed to get shipments:', error);
      return [];
    }
  }

  async retryShipment(
    shipmentId: string,
    request: NextRequest,
    userId?: string,
  ): Promise<DeliveryOrderResponse> {
    const shipment = await prisma.deliveryShipment.findUnique({
      where: { id: shipmentId },
    });

    if (!shipment?.metadata) {
      return { success: false, error: 'Shipment not found or missing data' };
    }

    // Reconstruct order from metadata
    const order: DeliveryOrder = {
      customerName: shipment.metadata.customerName as string,
      customerPhone: shipment.metadata.phone as string,
      governorate: shipment.metadata.governorate as string,
      city: shipment.metadata.city as string,
      address: shipment.metadata.address as string,
      productName: shipment.metadata.productName as string,
      price: shipment.metadata.price as number,
      notes: shipment.metadata.notes as string,
    };

    return this.createShipment(shipment.orderId, shipment.agencyId, order, request, userId);
  }

  async deleteShipment(shipmentId: string): Promise<boolean> {
    try {
      // Soft delete by updating status
      await prisma.deliveryShipment.update({
        where: { id: shipmentId },
        data: { status: 'CANCELLED' },
      });
      return true;
    } catch (error) {
      console.error(`❌ Failed to delete shipment ${shipmentId}:`, error);
      return false;
    }
  }

  async bulkUpdateShipmentStatus(
    shipmentIds: string[],
    newStatus: string,
    request: NextRequest,
    userId?: string,
  ): Promise<{ success: boolean; updated: number; errors: string[]; }> {
    const errors: string[] = [];
    let updated = 0;

    for (const shipmentId of shipmentIds) {
      try {
        await prisma.deliveryShipment.update({
          where: { id: shipmentId },
          data: {
            status: newStatus,
            lastStatusUpdate: new Date(),
          },
        });

        // Log status change
        await prisma.deliveryStatusLog.create({
          data: {
            shipmentId,
            status: newStatus,
            message: `Bulk update to ${newStatus}`,
            timestamp: new Date(),
            source: 'manual',
          },
        });

        updated++;
      } catch (error) {
        errors.push(`${shipmentId}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    // Log activity
    if (userId) {
      await logOrderActivity(
        'SHIPMENTS_BULK_UPDATED',
        `Bulk updated ${updated} shipments to ${newStatus}`,
        request,
        userId,
        undefined,
        { shipmentIds, newStatus, updated, errors: errors.length },
      );
    }

    return { success: errors.length === 0, updated, errors };
  }
}

// Export singleton instance
export const deliveryService = DeliveryService.getInstance();