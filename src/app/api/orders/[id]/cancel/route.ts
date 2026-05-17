import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params;

    const order = await prisma.order.findUnique({
      where: { id },
    })

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    // Only the user who placed the order can cancel it (or an admin, but let's restrict to user for now)
    if (order.userId !== session.user.id && session.user.role === 'CUSTOMER') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Check payment method
    if (order.paymentMethod !== 'COD') {
      return NextResponse.json({ error: 'Only COD orders can be cancelled' }, { status: 400 })
    }

    // Check order status
    if (order.status !== 'PENDING' && order.status !== 'PENDING_PAYMENT') {
      return NextResponse.json({ error: 'Order is no longer pending and cannot be cancelled' }, { status: 400 })
    }

    // Check time limit
    const settings = await prisma.storeSettings.findFirst()
    const timeLimitMinutes = settings?.cancellationTimeLimit ?? 15

    if (timeLimitMinutes <= 0) {
      return NextResponse.json({ error: 'Cancellation is disabled' }, { status: 400 })
    }

    const orderTime = new Date(order.createdAt).getTime()
    const now = new Date().getTime()
    const diffMinutes = (now - orderTime) / (1000 * 60)

    if (diffMinutes > timeLimitMinutes) {
      return NextResponse.json({ error: `Cancellation time limit of ${timeLimitMinutes} minutes has passed` }, { status: 400 })
    }

    // Proceed to cancel
    const updatedOrder = await prisma.order.update({
      where: { id },
      data: { status: 'CANCELLED' }
    })

    // Log the action
    await prisma.activityLog.create({
      data: {
        userId: session.user.id,
        action: 'CANCEL',
        entity: 'ORDER',
        entityId: id,
        details: 'User cancelled COD order within time limit'
      }
    })

    return NextResponse.json({ success: true, order: updatedOrder })
  } catch (error) {
    console.error('Cancel order error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
