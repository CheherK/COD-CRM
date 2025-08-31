// app/api/delivery/agencies/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth-server'
import { deliveryRegistry } from '@/lib/delivery/agency-registry'

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const token = request.cookies.get('auth-token')?.value
    if (!token) {
      return NextResponse.json({ error: 'No token provided' }, { status: 401 })
    }

    const user = verifyToken(token)
    if (!user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    await deliveryRegistry.ensureInitialized()

    const agency = deliveryRegistry.getAgency(params.id)
    const config = deliveryRegistry.getAgencyConfig(params.id)

    if (!agency || !config) {
      return NextResponse.json({ error: 'Agency not found' }, { status: 404 })
    }

    return NextResponse.json({
      agency: {
        id: agency.id,
        name: agency.name,
        enabled: config.enabled,
        supportedRegions: agency.supportedRegions,
        credentialsType: config.credentials.type,
        // Only return sensitive data to admins
        ...(user.role === 'ADMIN' && {
          credentialsUsername: config.credentials.username,
          credentialsEmail: config.credentials.email,
        }),
      },
    })
  } catch (error) {
    console.error('Get agency error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const token = request.cookies.get('auth-token')?.value
    if (!token) {
      return NextResponse.json({ error: 'No token provided' }, { status: 401 })
    }

    const user = verifyToken(token)
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const updates = await request.json()

    await deliveryRegistry.ensureInitialized()
    await deliveryRegistry.updateAgencyConfig(params.id, updates)

    return NextResponse.json({ success: true, message: 'Agency updated successfully' })
  } catch (error) {
    console.error('Update agency error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}