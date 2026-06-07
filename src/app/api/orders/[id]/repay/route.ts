import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { createDokuCheckoutSession, generateQrisString } from '@/lib/doku'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    // 1. Fetch the order
    const order = await prisma.order.findUnique({
      where: { id },
      include: { items: { include: { product: true } } }
    })

    if (!order) {
      return NextResponse.json({ error: 'Pesanan tidak ditemukan' }, { status: 404 })
    }

    // Security check: only order owner can repay
    if (order.userId !== session.user.id && session.user.role === 'CUSTOMER') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    if (order.paymentMethod !== 'DOKU') {
      return NextResponse.json({ error: 'Pesanan ini tidak menggunakan metode pembayaran DOKU.' }, { status: 400 })
    }

    // Only allow repaying if order is pending or has been cancelled (timeout/failed)
    if (order.status !== 'PENDING_PAYMENT' && order.status !== 'CANCELLED') {
      return NextResponse.json({ error: 'Pesanan ini sudah diproses atau telah selesai.' }, { status: 400 })
    }

    // Fetch payment settings
    const paymentSettings = await prisma.paymentSettings.findFirst()
    if (!paymentSettings || !paymentSettings.dokuEnabled || !paymentSettings.dokuClientId || !paymentSettings.dokuSharedKey) {
      return NextResponse.json({ error: 'Metode pembayaran DOKU sedang tidak aktif.' }, { status: 400 })
    }

    const secureTotal = order.total
    const newExpiredAt = new Date(Date.now() + 15 * 60 * 1000) // 15 minutes from now

    // 2. Perform interactive transaction to lock vouchers and points if they were previously cancelled
    const result = await prisma.$transaction(async (tx) => {
      // If it was cancelled, we need to mark it back to PENDING_PAYMENT and re-deduct points/vouchers
      if (order.status === 'CANCELLED') {
        // Find if this order previously had points deducted
        const originalPointRedeem = await tx.pointHistory.findFirst({
          where: {
            orderId: id,
            amount: { lt: 0 }
          }
        })

        if (originalPointRedeem) {
          const pointsToReDeduct = Math.abs(originalPointRedeem.amount)
          
          // Fetch current user points to check if they have enough points
          const user = await tx.user.findUnique({
            where: { id: order.userId || '' },
            select: { points: true }
          })

          if (!user || user.points < pointsToReDeduct) {
            throw new Error(`Poin Anda tidak mencukupi untuk mengulang pemesanan (${pointsToReDeduct} poin diperlukan).`)
          }

          // Deduct points again
          await tx.user.update({
            where: { id: order.userId || '' },
            data: { points: { decrement: pointsToReDeduct } }
          })

          // Create a new negative point history entry
          await tx.pointHistory.create({
            data: {
              userId: order.userId || '',
              amount: -pointsToReDeduct,
              type: 'ORDER_REDEEM',
              description: `Poin digunakan kembali untuk pembayaran ulang pesanan #${id.slice(0, 8).toUpperCase()}`,
              orderId: id
            }
          })
        }

        // Lock voucher again if order had a voucher
        if (order.voucherCode) {
          const voucher = await tx.voucher.findUnique({
            where: { code: order.voucherCode }
          })

          if (voucher) {
            if (voucher.isUsed) {
              throw new Error('Voucher Anda telah digunakan pada transaksi lain.')
            }

            await tx.voucher.update({
              where: { id: voucher.id },
              data: {
                isUsed: true,
                usedAt: new Date()
              }
            })
          }
        }
      }

      // Update order status and new expiration time
      const updated = await tx.order.update({
        where: { id },
        data: {
          status: 'PENDING_PAYMENT',
          paymentExpiredAt: newExpiredAt,
          notes: order.notes 
            ? `${order.notes}\n[Sistem] Sesi pembayaran di-regenerasi.`
            : '[Sistem] Sesi pembayaran di-regenerasi.'
        }
      })

      return updated
    })

    // 3. Create fresh Doku checkout session or SNAP QRIS
    const channelMatch = order.notes?.match(/\[CHANNEL:\s*([^\]]+)\]/)
    const isQrisChannel = channelMatch?.[1]?.toUpperCase() === 'QRIS'
    
    let paymentUrl: string | null = null
    let paymentQrContent: string | null = null

    if (isQrisChannel) {
      try {
        const { generateQrisString } = await import('@/lib/doku')
        paymentQrContent = generateQrisString(secureTotal, id, paymentSettings.qrisNmid || undefined)
      } catch (snapError: any) {
        console.warn('[DOKU SNAP QRIS REPAY FAILED, FALLING BACK TO HOSTED CHECKOUT]', snapError)
        const callbackUrl = `${process.env.AUTH_URL || 'http://localhost:3000'}/orders/${id}`
        const notificationUrl = `${process.env.AUTH_URL || 'http://localhost:3000'}/api/payment/doku-webhook`
        const dokuResult = await createDokuCheckoutSession({
          clientId: paymentSettings.dokuClientId,
          sharedKey: paymentSettings.dokuSharedKey,
          isSandbox: paymentSettings.dokuSandbox,
        }, {
          invoiceNumber: id,
          amount: secureTotal,
          customerName: order.customerName,
          customerPhone: order.customerPhone,
          customerEmail: session.user.email || 'arumseduh@gmail.com',
          callbackUrl,
          notificationUrl,
        })

        if (dokuResult.error) {
          throw new Error(`DOKU Error: ${dokuResult.error}`)
        }
        paymentUrl = dokuResult.url
      }
    } else {
      const callbackUrl = `${process.env.AUTH_URL || 'http://localhost:3000'}/orders/${id}`
      const notificationUrl = `${process.env.AUTH_URL || 'http://localhost:3000'}/api/payment/doku-webhook`
      const dokuResult = await createDokuCheckoutSession({
        clientId: paymentSettings.dokuClientId,
        sharedKey: paymentSettings.dokuSharedKey,
        isSandbox: paymentSettings.dokuSandbox,
      }, {
        invoiceNumber: id,
        amount: secureTotal,
        customerName: order.customerName,
        customerPhone: order.customerPhone,
        customerEmail: session.user.email || 'arumseduh@gmail.com',
        callbackUrl,
        notificationUrl,
      })

      if (dokuResult.error) {
        throw new Error(`DOKU Error: ${dokuResult.error}`)
      }
      paymentUrl = dokuResult.url
    }

    // 4. Save both payment URL and QRIS content back to the order
    await prisma.order.update({
      where: { id },
      data: { 
        paymentUrl,
        paymentQrContent
      }
    })

    return NextResponse.json({ success: true, paymentUrl })
  } catch (error: any) {
    console.error('[API ORDER REPAY ERROR]', error)
    return NextResponse.json({ error: error.message || 'Gagal meregenerasi pembayaran' }, { status: 500 })
  }
}
