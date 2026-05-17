import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { processOrderCompletion } from '@/lib/loyalty-utils'

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { status } = await req.json()

    if (!status) {
      return NextResponse.json({ error: 'Status is required' }, { status: 400 })
    }

    // If driver marks as DELIVERED, we treat it as COMPLETED to award points
    const finalStatus = status === 'DELIVERED' ? 'COMPLETED' : status;

    // Update order status and verify it belongs to this driver
    const updateResult = await prisma.order.updateMany({
      where: { 
        id,
        driver: { id: session.user.id }
      },
      data: {
        status: finalStatus,
      },
    })

    if (updateResult.count === 0) {
      return NextResponse.json({ error: 'Order not found or unauthorized' }, { status: 404 })
    }

    // Award points if order is completed
    if (finalStatus === 'COMPLETED') {
      try {
        await processOrderCompletion(id);
      } catch (err) {
        console.error('Failed to process order completion:', err);
      }
    }

    return NextResponse.json({ success: true, status: finalStatus })
  } catch (error) {
    console.error('Update driver order status error:', error)
    return NextResponse.json({ error: 'Failed to update status' }, { status: 500 })
  }
}
