// app/api/delivery/shipments/route.ts
// Updated to handle Order -> DeliveryShipment creation with proper field mapping

import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth-server';
import { deliveryService } from '@/lib/delivery/delivery-service';
import prisma from '@/lib/prisma';
import type { DeliveryOrder } from '@/lib/delivery/types';

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('auth-token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'No token provided' }, { status: 401 });
    }

    const user = verifyToken(token);
    if (!user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const orderId = searchParams.get('orderId');
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : undefined;

    let shipments;
    if (orderId) {
      shipments = await deliveryService.getShipmentsByOrderId(orderId);
    } else {
      shipments = await deliveryService.getAllShipments(limit);
    }

    return NextResponse.json({ success: true, shipments });
  } catch (error) {
    console.error('Get shipments error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get('auth-token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'No token provided' }, { status: 401 });
    }

    const user = verifyToken(token);
    if (!user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const { orderId, agencyId } = await request.json();

    if (!orderId || !agencyId) {
      return NextResponse.json({ error: 'Missing orderId or agencyId' }, { status: 400 });
    }

    // Fetch the order from database
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        items: {
          include: {
            product: true
          }
        }
      }
    });

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    // Check if order is CONFIRMED (only confirmed orders can be shipped)
    if (order.status !== 'CONFIRMED') {
      return NextResponse.json({ 
        error: `Cannot ship order with status ${order.status}. Order must be CONFIRMED.` 
      }, { status: 400 });
    }

    // Transform Order to DeliveryOrder format
    const deliveryOrder: DeliveryOrder = {
      customerName: order.customerName,
      customerPhone: order.customerPhone1, // Use primary phone
      customerPhone2: order.customerPhone2 || undefined,
      customerCity: order.customerCity,
      customerAddress: order.customerAddress,
      productName: order.items.map(item => 
        `${item.product.name} (x${item.quantity})`
      ).join(', '),
      price: Number(order.total),
      notes: order.notes || undefined,
    };

    // Create shipment
    const result = await deliveryService.createShipment(
      orderId, 
      agencyId, 
      deliveryOrder, 
      request, 
      user.id
    );

    return NextResponse.json(result);
  } catch (error) {
    console.error('Create shipment error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}