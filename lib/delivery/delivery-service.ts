// lib/delivery/delivery-service.ts
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
        // Save to database - shipment starts as UPLOADED status
        const shipment = await prisma.deliveryShipment.create({
          data: {
            orderId,
            agencyId,
            trackingNumber: result.trackingNumber,
            barcode: result.barcode,
            status: 'UPLOADED', // Initial status is always UPLOADED
            lastStatusUpdate: new Date(),
            printUrl: result.printUrl,
            metadata: {
              customerName: order.customerName,
              customerCity: order.customerCity,
              customerAddress: order.customerAddress,
              phone: order.customerPhone,
              price: order.price,
              productName: order.productName,
              notes: order.notes,
            },
          },
        });

        // Log initial status
        await prisma.deliveryStatusLog.create({
          data: {
            shipmentId: shipment.id,
            status: 'UPLOADED',
            message: 'Shipment created and uploaded to agency',
            timestamp: new Date(),
            source: 'api',
          },
        });

        // Update Order status to reflect that it's now with delivery agency
        // This is where we bridge Order workflow to Delivery workflow
        await prisma.order.update({
          where: { id: orderId },
          data: {
            // Order keeps its status (CONFIRMED) but we track delivery separately
            updatedAt: new Date(),
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

          // If delivered or returned, we could optionally update order status
          // but typically orders stay CONFIRMED while delivery status changes
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
      // @ts-expect-error
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
      // @ts-expect-error
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
      // @ts-expect-error
      customerName: shipment.metadata.customerName as string,
      // @ts-expect-error
      customerPhone: shipment.metadata.phone as string,
      // @ts-expect-error
      customerCity: shipment.metadata.customerCity as string, // Updated field name
      // @ts-expect-error
      customerAddress: shipment.metadata.customerAddress as string, // Updated field name
      // @ts-expect-error
      productName: shipment.metadata.productName as string,
      // @ts-expect-error
      price: shipment.metadata.price as number,
      // @ts-expect-error
      notes: shipment.metadata.notes as string,
    };

    return this.createShipment(shipment.orderId, shipment.agencyId, order, request, userId);
  }

  async deleteShipment(shipmentId: string): Promise<boolean> {
    try {
      // Soft delete by updating status to RETURNED
      await prisma.deliveryShipment.update({
        where: { id: shipmentId },
        data: { 
          status: 'RETURNED',
          lastStatusUpdate: new Date()
        },
      });
      return true;
    } catch (error) {
      console.error(`❌ Failed to delete shipment ${shipmentId}:`, error);
      return false;
    }
  }

  async bulkUpdateShipmentStatus(
    shipmentIds: string[],
    newStatus: 'UPLOADED' | 'DEPOSIT' | 'IN_TRANSIT' | 'DELIVERED' | 'RETURNED',
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