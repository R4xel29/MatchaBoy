import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'

export async function PUT(req: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id || !['DRIVER', 'ADMIN'].includes(session.user.role || '')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { lat, lng } = await req.json()

    if (lat === undefined || lng === undefined) {
      return NextResponse.json({ error: 'Missing coordinates' }, { status: 400 })
    }

    // Upsert to handle if profile doesn't exist
    await prisma.driverProfile.upsert({
      where: { userId: session.user.id },
      create: {
        userId: session.user.id,
        lastLat: lat,
        lastLng: lng,
        lastLocationUpdate: new Date(),
      },
      update: {
        lastLat: lat,
        lastLng: lng,
        lastLocationUpdate: new Date(),
      }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Update location error:', error)
    return NextResponse.json({ error: 'Failed to update location' }, { status: 500 })
  }
}
