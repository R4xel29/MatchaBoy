import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { checkDokuMcpQrisPaymentStatus } from '@/lib/doku';
import { processOrderCompletion } from '@/lib/loyalty-utils';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const invoiceNumber = body.invoiceNumber;
    const orderId = body.orderId;

    if (!invoiceNumber && !orderId) {
      return NextResponse.json({ error: 'Invoice number atau Order ID wajib diisi' }, { status: 400 });
    }

    // 1. Check order status in DB first
    let order = await prisma.order.findFirst({
      where: {
        OR: [
          invoiceNumber ? { id: invoiceNumber } : {},
          orderId ? { id: orderId } : {},
          invoiceNumber ? { paymentProofUrl: invoiceNumber } : {},
        ],
      },
    });

    if (order && (order.status !== 'PENDING_PAYMENT' || order.paymentProofUrl === '/verified-webhook.svg')) {
      return NextResponse.json({
        paid: true,
        orderId: order.id,
        status: order.status,
        customerName: order.customerName,
        totalPayable: order.total,
      });
    }

    // 2. Check DOKU MCP Status API
    const paymentSettings = await prisma.paymentSettings.findFirst();

    let isPaid = false;

    if (paymentSettings?.dokuEnabled && paymentSettings.dokuClientId && paymentSettings.dokuSharedKey && invoiceNumber) {
      const dokuResult = await checkDokuMcpQrisPaymentStatus(
        {
          clientId: paymentSettings.dokuClientId,
          sharedKey: paymentSettings.dokuSharedKey,
          isSandbox: paymentSettings.dokuSandbox ?? true,
        },
        { invoiceNumber }
      );

      if (dokuResult.paid) {
        isPaid = true;
      }
    }

    // 3. If paid, update the order to PENDING (Pesanan Diterima) in DB
    if (isPaid && order && order.status === 'PENDING_PAYMENT') {
      order = await prisma.order.update({
        where: { id: order.id },
        data: {
          status: 'PENDING',
          paymentProofUrl: '/verified-cashier-qris.svg',
        },
      });

      return NextResponse.json({
        paid: true,
        orderId: order.id,
        status: 'PENDING',
        customerName: order.customerName,
        totalPayable: order.total,
      });
    }

    return NextResponse.json({
      paid: isPaid,
      status: isPaid ? (order?.status || 'PENDING') : 'PENDING_PAYMENT',
    });
  } catch (error: any) {
    console.error('[DOKU QRIS STATUS CHECK ERROR]', error);
    return NextResponse.json({ paid: false, error: error.message }, { status: 500 });
  }
}
