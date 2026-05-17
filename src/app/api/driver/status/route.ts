import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'

export async function PUT(req: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true },
    })

    if (user?.role !== 'DRIVER') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { isOnline } = await req.json()

    // Fetch existing profile to check status
    const existingProfile = await prisma.driverProfile.findUnique({
      where: { userId: session.user.id }
    })

    if (isOnline && existingProfile && existingProfile.status !== 'APPROVED') {
      return NextResponse.json({ error: `Cannot go online. Account status is ${existingProfile.status}` }, { status: 403 })
    }

    // Upsert driver profile just in case it doesn't exist
    const profile = await prisma.driverProfile.upsert({
      where: { userId: session.user.id },
      create: {
        userId: session.user.id,
        isOnline,
        shiftStart: isOnline ? new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : null,
      },
      update: {
        isOnline,
        shiftEnd: !isOnline ? new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : null,
      }
    })

    return NextResponse.json(profile)
  } catch (error) {
    console.error('Update driver status error:', error)
    return NextResponse.json({ error: 'Failed to update status' }, { status: 500 })
  }
}
