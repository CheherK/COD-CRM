// app/api/delivery/sync/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth-server'
import { deliverySyncService } from '@/lib/delivery/sync-service'
import { logSystemActivity } from '@/lib/activity-logger'

export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get('auth-token')?.value
    if (!token) {
      return NextResponse.json({ error: 'No token provided' }, { status: 401 })
    }

    const user = verifyToken(token)
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    console.log('🔄 Starting manual sync...')

    const syncResults = await deliverySyncService.syncAllShipments()

    // Log activity
    await logSystemActivity(
      'DELIVERY_MANUAL_SYNC',
      `Manual sync: ${syncResults.processed} processed, ${syncResults.updated} updated`,
      request,
      user.id,
      syncResults,
    )

    return NextResponse.json({
      success: true,
      syncResults,
      message: 'Sync completed successfully',
    })
  } catch (error) {
    console.error('Sync error:', error)
    return NextResponse.json({ error: 'Sync failed' }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('auth-token')?.value
    if (!token) {
      return NextResponse.json({ error: 'No token provided' }, { status: 401 })
    }

    const user = verifyToken(token)
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const status = deliverySyncService.getStatus()
    return NextResponse.json({ success: true, status })
  } catch (error) {
    console.error('Get sync status error:', error)
    return NextResponse.json({ error: 'Failed to get sync status' }, { status: 500 })
  }
}