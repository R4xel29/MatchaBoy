import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { processOrderCompletion } from '@/lib/loyalty-utils'

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const session = await auth()

    // Verify order exists and is in a confirmable state
    const order = await prisma.order.findUnique({
      where: { id },
      select: { userId: true, status: true, paymentMethod: true, source: true }
    });

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    const isSpmb = order.source === 'SPMB';

    if (!isSpmb) {
      if (!session?.user?.id) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }

      if (order.userId !== session.user.id) {
        return NextResponse.json({ error: 'Order not found or forbidden' }, { status: 403 })
      }

      if (order.paymentMethod === 'COD') {
        return NextResponse.json({ error: 'Pesanan COD hanya dapat diselesaikan oleh kurir demi keamanan transaksi.' }, { status: 400 })
      }

      if (order.status !== 'ON_DELIVERY' && order.status !== 'DELIVERED') {
        return NextResponse.json({ error: 'Order cannot be confirmed at this status' }, { status: 400 })
      }
    } else {
      // For SPMB: allow guests to confirm if status is any active stage
      const allowedSpmbStatuses = ['PENDING', 'PENDING_PAYMENT', 'PREPARING', 'READY', 'ASSIGNED', 'TO_STORE', 'PICKED_UP', 'ON_DELIVERY', 'DELIVERED'];
      if (!allowedSpmbStatuses.includes(order.status)) {
        return NextResponse.json({ error: 'Order cannot be confirmed at this status' }, { status: 400 })
      }
    }

    // Update status to COMPLETED
    const updated = await prisma.order.update({
      where: { id },
      data: { status: 'COMPLETED' }
    });

    // Award points
    try {
      await processOrderCompletion(id);
    } catch (err) {
      console.error('Failed to process order completion:', err);
    }

    return NextResponse.json(updated)
  } catch (error) {
    console.error('Confirm order error:', error)
    return NextResponse.json({ error: 'Failed to confirm order' }, { status: 500 })
  }
}
