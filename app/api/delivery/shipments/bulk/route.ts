// app/api/delivery/shipments/bulk/routs.ts
import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth-server';
import { deliveryService } from '@/lib/delivery/delivery-service';

export async function PUT(request: NextRequest) {
  try {
    const token = request.cookies.get('auth-token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'No token provided' }, { status: 401 });
    }

    const user = verifyToken(token);
    if (!user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    // Only admins can do bulk updates
    if (user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { shipmentIds, newStatus } = await request.json();

    if (!shipmentIds || !Array.isArray(shipmentIds) || shipmentIds.length === 0) {
      return NextResponse.json({ error: 'Invalid shipment IDs' }, { status: 400 });
    }

    if (!newStatus || !['UPLOADED', 'DEPOSIT', 'IN_TRANSIT', 'DELIVERED', 'RETURNED'].includes(newStatus)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
    }

    const result = await deliveryService.bulkUpdateShipmentStatus(
      shipmentIds,
      newStatus,
      request,
      user.id
    );

    return NextResponse.json(result);
  } catch (error) {
    console.error('Bulk update shipments error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}