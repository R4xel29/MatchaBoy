import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { awardPointsForOrder } from '@/lib/notification-service'

export async function POST(req: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { orderId, userId } = body

    if (!orderId || !userId) {
      return NextResponse.json({ error: 'orderId and userId required' }, { status: 400 })
    }

    // Link order to customer
    const order = await prisma.order.update({
      where: { id: orderId },
      data: { userId },
    })

    // Award points
    const result = await awardPointsForOrder(orderId)

    return NextResponse.json({
      success: true,
      pointsEarned: result?.pointsEarned || 0,
      newTotal: result?.newTotal || 0,
    })
  } catch (error) {
    console.error('Award points error:', error)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
