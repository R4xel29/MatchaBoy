import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { processOrderCompletion } from '@/lib/loyalty-utils'
import { deductStockForOrder, restoreStockForOrder } from '@/lib/inventory-utils'
import { logAdminAction } from '@/lib/admin-logger'

const VALID_STATUSES = [
  'PENDING', 'PENDING_PAYMENT', 'PREPARING', 'READY', 'COMPLETED',
  'ASSIGNED', 'TO_STORE', 'PICKED_UP', 'ON_DELIVERY', 'DELIVERED', 'CANCELLED'
]

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()

    if (!session?.user || (session.user.role !== 'CASHIER' && session.user.role !== 'ADMIN')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const body = await req.json()
    const { status, reason } = body

    // Status whitelist validation — prevent injection of invalid statuses
    if (!status || !VALID_STATUSES.includes(status)) {
      return NextResponse.json({ error: 'Status tidak valid' }, { status: 400 })
    }

    // Fetch existing order for audit trail
    const existingOrder = await prisma.order.findUnique({
      where: { id },
      select: { id: true, status: true, customerName: true, userId: true, notes: true, voucherCode: true }
    })

    if (!existingOrder) {
      return NextResponse.json({ error: 'Pesanan tidak ditemukan' }, { status: 404 })
    }

    // Update order status (with point/voucher refund if cancelled)
    const order = await prisma.$transaction(async (tx) => {
      // 1. Update status
      const updated = await tx.order.update({
        where: { id },
        data: {
          status,
          cancelReason: status === 'CANCELLED' && reason ? reason : undefined,
          notes: status === 'CANCELLED' && reason
            ? (existingOrder.notes ? `${existingOrder.notes}\n[Batal] ${reason}` : `[Batal] ${reason}`)
            : existingOrder.notes
        }
      })

      if (status === 'CANCELLED') {
        // 2. Restore points if any
        const pointHistories = await tx.pointHistory.findMany({
          where: {
            orderId: id,
            amount: { lt: 0 } // Negative points (redeemed)
          }
        })

        for (const ph of pointHistories) {
          const refundAmount = Math.abs(ph.amount)
          if (existingOrder.userId) {
            await tx.user.update({
              where: { id: existingOrder.userId },
              data: { points: { increment: refundAmount } }
            })
            await tx.pointHistory.create({
              data: {
                userId: existingOrder.userId,
                amount: refundAmount,
                type: 'ADMIN_ADJUST',
                description: `Pengembalian ${refundAmount} poin karena pesanan #${id.slice(0, 8).toUpperCase()} dibatalkan kasir`,
                orderId: id
              }
            })
          }
        }

        // 3. Restore used voucher if any
        if (existingOrder.voucherCode) {
          const voucher = await tx.voucher.findUnique({
            where: { code: existingOrder.voucherCode }
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
      }

      return updated
    })

    // Audit trail — log who changed what
    await logAdminAction({
      userId: session.user.id,
      action: 'UPDATE',
      entity: 'ORDER',
      entityId: id,
      details: `[Kasir] Mengubah status pesanan #${id.slice(-6).toUpperCase()} (${existingOrder.customerName}) dari ${existingOrder.status} menjadi ${status}${status === 'CANCELLED' && reason ? ` (Alasan: ${reason})` : ''}`
    })

    // Stock deduction when order starts being prepared
    if (status === 'PREPARING') {
      deductStockForOrder(id).catch(err =>
        console.error('Stock deduction error (non-blocking):', err)
      )
    }

    // Restore stock if cancelled
    if (status === 'CANCELLED') {
      restoreStockForOrder(id).catch(err =>
        console.error('Stock restoration error (non-blocking):', err)
      )
    }

    // Loyalty points + notification when order is completed/delivered
    let loyaltyResult = null
    if (status === 'COMPLETED' || status === 'DELIVERED') {
      try {
        loyaltyResult = await processOrderCompletion(id)

        // Send notification to user
        if (existingOrder.userId) {
          try {
            const { sendTemplatedNotification, sendNotification } = await import('@/lib/notification-service')

            const sent = await sendTemplatedNotification({
              userId: existingOrder.userId,
              trigger: 'ORDER_COMPLETED',
              variables: {
                name: existingOrder.customerName,
                orderNo: id.slice(0, 8).toUpperCase(),
                points: String(loyaltyResult?.cups || 0),
              },
              linkUrl: `/orders/${id}`,
            })

            if (!sent) {
              await sendNotification({
                userId: existingOrder.userId,
                type: 'order',
                title: 'Pesanan Selesai! 🎉',
                message: `Pesanan #${id.slice(0, 8).toUpperCase()} telah selesai. Kamu mendapat ${loyaltyResult?.cups || 0} poin!`,
                linkUrl: `/orders/${id}`,
              })
            }
          } catch (notifErr) {
            console.error('Notification error (non-blocking):', notifErr)
          }
        }
      } catch (err) {
        console.error('Loyalty processing error (non-blocking):', err)
      }
    }

    return NextResponse.json({ success: true, order, loyaltyResult })
  } catch (error) {
    console.error('Update order error:', error)
    return NextResponse.json({ error: 'Gagal memperbarui pesanan' }, { status: 500 })
  }
}
