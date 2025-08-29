import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth-server'
import { deliveryRegistry } from '@/lib/delivery/agency-registry'

export async function GET(request: NextRequest) {
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

    const agencies = deliveryRegistry.getAllAgencies().map((agency) => {
      const config = deliveryRegistry.getAgencyConfig(agency.id)
      return {
        id: agency.id,
        name: agency.name,
        supportedRegions: agency.supportedRegions,
        enabled: config?.enabled || false,
        configured: !!(config?.credentials?.username || config?.credentials?.email || config?.credentials?.apiKey),
      }
    })

    return NextResponse.json({ agencies })
  } catch (error) {
    console.error('Get agencies error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}