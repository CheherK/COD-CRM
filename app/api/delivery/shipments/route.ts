import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth-server';
import { deliveryService } from '@/lib/delivery/delivery-service';

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

    const { orderId, agencyId, order } = await request.json();

    if (!orderId || !agencyId || !order) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const result = await deliveryService.createShipment(orderId, agencyId, order, request, user.id);

    return NextResponse.json(result);
  } catch (error) {
    console.error('Create shipment error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
