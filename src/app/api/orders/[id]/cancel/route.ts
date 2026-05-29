import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { restoreStockForOrder } from '@/lib/inventory-utils'

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

    let reason = 'Dibatalkan oleh Pelanggan';
    try {
      const body = await req.json();
      if (body.reason) {
        reason = body.reason;
      }
    } catch {
      // Body may be empty or not JSON
    }

    // Proceed to cancel
    const updatedOrder = await prisma.$transaction(async (tx) => {
      // 1. Update status
      const updated = await tx.order.update({
        where: { id },
        data: { 
          status: 'CANCELLED',
          cancelReason: reason,
          notes: order.notes
            ? `${order.notes}\n[Batal] ${reason}`
            : `[Batal] ${reason}`
        }
      })

      // 2. Restore points if any
      const pointHistories = await tx.pointHistory.findMany({
        where: {
          orderId: id,
          amount: { lt: 0 } // Negative points (redeemed)
        }
      })

      for (const ph of pointHistories) {
        const refundAmount = Math.abs(ph.amount)
        if (order.userId) {
          await tx.user.update({
            where: { id: order.userId },
            data: { points: { increment: refundAmount } }
          })
          await tx.pointHistory.create({
            data: {
              userId: order.userId,
              amount: refundAmount,
              type: 'ADMIN_ADJUST',
              description: `Pengembalian ${refundAmount} poin karena pesanan #${id.slice(0, 8).toUpperCase()} dibatalkan oleh Pelanggan`,
              orderId: id
            }
          })
        }
      }

      // 3. Restore used voucher if any
      if (order.voucherCode) {
        const voucher = await tx.voucher.findUnique({
          where: { code: order.voucherCode }
        })
        if (voucher && voucher.isUsed) {
          await tx.voucher.update({
            where: { id: voucher.id },
            data: {
              isUsed: false,
              usedAt: null
            }
          })
        }
      }

      return updated
    })

    // Restore stock if order cancellation is successful
    restoreStockForOrder(id).catch(err =>
      console.error('Stock restoration error (non-blocking):', err)
    )

    // Log the action
    await prisma.activityLog.create({
      data: {
        userId: session.user.id,
        action: 'CANCEL',
        entity: 'ORDER',
        entityId: id,
        details: `User cancelled COD order: ${reason}`
      }
    })

    return NextResponse.json({ success: true, order: updatedOrder })
  } catch (error) {
    console.error('Cancel order error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
