import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const settings = await prisma.storeSettings.findFirst()

    if (!settings) {
      // Return defaults
      return NextResponse.json({
        openTime: '08:00',
        closeTime: '21:00',
        pickupSlotInterval: 5,
      })
    }

    return NextResponse.json({
      id: settings.id,
      openTime: settings.openTime,
      closeTime: settings.closeTime,
      pickupSlotInterval: settings.pickupSlotInterval,
    })
  } catch {
    return NextResponse.json({
      openTime: '08:00',
      closeTime: '21:00',
      pickupSlotInterval: 5,
    })
  }
}

export async function PUT(req: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check admin role
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true },
    })
    if (user?.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Admin only' }, { status: 403 })
    }

    const body = await req.json()
    const existing = await prisma.storeSettings.findFirst()

    if (existing) {
      const updated = await prisma.storeSettings.update({
        where: { id: existing.id },
        data: {
          openTime: body.openTime || existing.openTime,
          closeTime: body.closeTime || existing.closeTime,
          pickupSlotInterval: body.pickupSlotInterval ?? existing.pickupSlotInterval,
        },
      })
      return NextResponse.json(updated)
    } else {
      const created = await prisma.storeSettings.create({
        data: {
          openTime: body.openTime || '08:00',
          closeTime: body.closeTime || '21:00',
          pickupSlotInterval: body.pickupSlotInterval ?? 5,
        },
      })
      return NextResponse.json(created)
    }
  } catch (error) {
    console.error('Store settings error:', error)
    return NextResponse.json({ error: 'Failed to update' }, { status: 500 })
  }
}
