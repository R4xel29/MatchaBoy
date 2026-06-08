import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { createDokuCheckoutSession } from '@/lib/doku'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    const requestHeaders = new Headers(req.headers);
    const host = requestHeaders.get('x-forwarded-host') || requestHeaders.get('host') || 'localhost:3000';
    const protocol = requestHeaders.get('x-forwarded-proto') || 'http';
    const appUrl = `${protocol}://${host}`;
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

    if (order.paymentMethod !== 'DOKU' && order.paymentMethod !== 'QRIS') {
      return NextResponse.json({ error: 'Pesanan ini tidak menggunakan metode pembayaran DOKU atau QRIS.' }, { status: 400 })
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

    // 3. Create fresh Doku checkout session or MCP QRIS
    const isQrisPayment = order.paymentMethod?.toUpperCase() === 'QRIS'
    const channelMatch = order.notes?.match(/\[CHANNEL:\s*([^\]]+)\]/)
    const isQrisChannel = channelMatch?.[1]?.toUpperCase() === 'QRIS' || isQrisPayment
    
    let paymentUrl: string | null = null
    let paymentQrContent: string | null = null

    if (isQrisChannel) {
      try {
        const { createDokuMcpQrisPayment } = await import('@/lib/doku')
        console.log('[REPAY QRIS] Attempting to generate QRIS via DOKU MCP Server...')
        const mcpResult = await createDokuMcpQrisPayment({
          clientId: paymentSettings.dokuClientId,
          sharedKey: paymentSettings.dokuSharedKey,
          isSandbox: paymentSettings.dokuSandbox,
        }, {
          invoiceNumber: id,
          amount: secureTotal,
          postalCode: '67215'
        })

        if (mcpResult.qrContent) {
          paymentQrContent = mcpResult.qrContent
          console.log('[REPAY QRIS] Dynamic QRIS generated successfully via DOKU MCP.')
        } else {
          console.warn('[REPAY QRIS] DOKU MCP generation failed. Error:', mcpResult.error)
        }
      } catch (mcpError) {
        console.error('[REPAY QRIS MCP ERROR]', mcpError)
      }
    }

    if (!paymentQrContent) {
      console.log('[REPAY] Falling back to Hosted Checkout V1...')
      const callbackUrl = `${appUrl}/orders/${id}`
      const notificationUrl = `${appUrl}/api/payment/doku-webhook`
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
        paymentChannel: isQrisChannel ? 'QRIS' : undefined,
      })

      if (dokuResult.error) {
        throw new Error(`DOKU Error: ${dokuResult.error}`)
      }
      paymentUrl = dokuResult.url
    }

    // 4. Save payment details back to the order
    await prisma.order.update({
      where: { id },
      data: { 
        paymentUrl,
        paymentQrContent,
      }
    })

    return NextResponse.json({ success: true, paymentUrl, paymentQrContent })
  } catch (error: any) {
    console.error('[API ORDER REPAY ERROR]', error)
    return NextResponse.json({ error: error.message || 'Gagal meregenerasi pembayaran' }, { status: 500 })
  }
}
