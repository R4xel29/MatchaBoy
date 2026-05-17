import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { processOrderCompletion } from '@/lib/loyalty-utils'
import { deductStockForOrder } from '@/lib/inventory-utils'
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
    const { status } = body

    // Status whitelist validation — prevent injection of invalid statuses
    if (!status || !VALID_STATUSES.includes(status)) {
      return NextResponse.json({ error: 'Status tidak valid' }, { status: 400 })
    }

    // Fetch existing order for audit trail
    const existingOrder = await prisma.order.findUnique({
      where: { id },
      select: { id: true, status: true, customerName: true, userId: true }
    })

    if (!existingOrder) {
      return NextResponse.json({ error: 'Pesanan tidak ditemukan' }, { status: 404 })
    }

    // Update order status
    const order = await prisma.order.update({
      where: { id },
      data: { status }
    })

    // Audit trail — log who changed what
    await logAdminAction({
      userId: session.user.id,
      action: 'UPDATE',
      entity: 'ORDER',
      entityId: id,
      details: `[Kasir] Mengubah status pesanan #${id.slice(-6).toUpperCase()} (${existingOrder.customerName}) dari ${existingOrder.status} menjadi ${status}`
    })

    // Stock deduction when order starts being prepared
    if (status === 'PREPARING') {
      deductStockForOrder(id).catch(err =>
        console.error('Stock deduction error (non-blocking):', err)
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
