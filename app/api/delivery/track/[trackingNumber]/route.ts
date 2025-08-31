// app/api/delivery/track/[trackingNumber]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth-server'
import { deliveryService } from '@/lib/delivery/delivery-service'

export async function GET(request: NextRequest, { params }: { params: { trackingNumber: string } }) {
  try {
    const token = request.cookies.get('auth-token')?.value
    if (!token) {
      return NextResponse.json({ error: 'No token provided' }, { status: 401 })
    }

    const user = verifyToken(token)
    if (!user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    const result = await deliveryService.trackShipmentByTrackingNumber(params.trackingNumber)

    return NextResponse.json(result)
  } catch (error) {
    console.error('Track shipment error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}