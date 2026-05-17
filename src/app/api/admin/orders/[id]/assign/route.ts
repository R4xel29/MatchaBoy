import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true },
    })

    if (user?.role !== 'ADMIN' && user?.role !== 'CASHIER') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { driverId } = await req.json()

    if (!driverId) {
      return NextResponse.json({ error: 'Driver ID is required' }, { status: 400 })
    }

    const order = await prisma.order.update({
      where: { id },
      data: {
        driver: { connect: { id: driverId } },
        status: 'ASSIGNED',
      },
    })

    return NextResponse.json(order)
  } catch (error) {
    console.error('Assign driver error:', error)
    return NextResponse.json({ error: 'Failed to assign driver' }, { status: 500 })
  }
}
