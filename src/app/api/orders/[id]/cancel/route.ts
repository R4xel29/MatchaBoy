import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { restoreStockForOrder } from '@/lib/inventory-utils'
import { revertVoucherUsage } from '@/lib/discount-utils'

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

    const isStaff = session.user.role === 'ADMIN' || session.user.role === 'CASHIER';

    // Only the user who placed the order can cancel it (unless admin or cashier)
    if (order.userId !== session.user.id && !isStaff) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Check order status
    if (order.status !== 'PENDING' && order.status !== 'PENDING_PAYMENT') {
      return NextResponse.json({ error: 'Pesanan sudah diproses dan tidak dapat dibatalkan' }, { status: 400 })
    }

    // Time limit check for customers (staff can cancel anytime while pending)
    if (!isStaff) {
      const settings = await prisma.storeSettings.findFirst()
      const timeLimitMinutes = settings?.cancellationTimeLimit ?? 15

      if (timeLimitMinutes > 0) {
        const orderTime = new Date(order.createdAt).getTime()
        const now = new Date().getTime()
        const diffMinutes = (now - orderTime) / (1000 * 60)

        // For unpaid QRIS, always allow cancel within expiry; for other orders check time limit
        const isQris = order.paymentMethod === 'QRIS' || order.paymentMethod === 'QRIS_INSTAN';
        if (!isQris && diffMinutes > timeLimitMinutes) {
          return NextResponse.json({ error: `Batas waktu pembatalan (${timeLimitMinutes} menit) telah terlewat` }, { status: 400 })
        }
      }
    }

    let reason = isStaff ? 'Dibatalkan oleh Kasir / Admin' : 'Dibatalkan oleh Pelanggan';
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

      // 1.1 Release dining table if Dine-In
      if (order.tableNumber) {
        await tx.diningTable.updateMany({
          where: { number: order.tableNumber },
          data: { status: 'AVAILABLE', occupiedSeats: 0 }
        })
      }

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
              description: `Pengembalian ${refundAmount} poin karena pesanan #${id.slice(0, 8).toUpperCase()} dibatalkan: ${reason}`,
              orderId: id
            }
          })
        }
      }

      // 3. Restore used voucher or template quota if any
      if (order.voucherCode) {
        await revertVoucherUsage(tx, order.voucherCode);
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
        details: `${isStaff ? 'Staff' : 'User'} cancelled order: ${reason}`
      }
    })

    return NextResponse.json({ success: true, order: updatedOrder })
  } catch (error) {
    console.error('Cancel order error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
