import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { processOrderCompletion } from '@/lib/loyalty-utils'
import { getDeliveryPin } from '@/lib/delivery-utils'

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const session = await auth()
    if (!session?.user?.id || !['DRIVER', 'ADMIN'].includes(session.user.role || '')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { status, pin } = await req.json()

    if (!status) {
      return NextResponse.json({ error: 'Status is required' }, { status: 400 })
    }

    // Verify order details and check driver assignment
    const order = await prisma.order.findUnique({
      where: { id },
      select: { paymentMethod: true, driverId: true }
    })

    if (!order || order.driverId !== session.user.id) {
      return NextResponse.json({ error: 'Order not found or unauthorized' }, { status: 404 })
    }

    // If driver marks as DELIVERED, validate PIN for COD payment method
    if (status === 'DELIVERED' && order.paymentMethod === 'COD') {
      const expectedPin = getDeliveryPin(id)
      if (pin !== expectedPin) {
        return NextResponse.json({ error: 'PIN verifikasi salah! Silakan minta PIN yang tertera pada aplikasi konsumen.' }, { status: 400 })
      }
    }

    // If driver marks as DELIVERED, we treat it as COMPLETED to award points
    const finalStatus = status === 'DELIVERED' ? 'COMPLETED' : status;

    // Update order status
    await prisma.order.update({
      where: { id },
      data: {
        status: finalStatus,
      },
    })

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

