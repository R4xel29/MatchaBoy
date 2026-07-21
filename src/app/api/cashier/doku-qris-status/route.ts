import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { checkDokuMcpQrisPaymentStatus } from '@/lib/doku';
import { processOrderCompletion } from '@/lib/loyalty-utils';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const invoiceNumber = body.invoiceNumber;
    const orderId = body.orderId;
    const isSimulateSuccess = body.simulateSuccess === true;

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

    if (order && order.status === 'COMPLETED') {
      return NextResponse.json({
        paid: true,
        orderId: order.id,
        status: 'COMPLETED',
        customerName: order.customerName,
        totalPayable: order.total,
      });
    }

    // 2. Check DOKU MCP Status API or Simulation
    const paymentSettings = await prisma.paymentSettings.findFirst();

    let isPaid = isSimulateSuccess;

    if (!isPaid && paymentSettings?.dokuEnabled && paymentSettings.dokuClientId && paymentSettings.dokuSharedKey && invoiceNumber) {
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

    // 3. If paid, complete the order automatically in DB & execute loyalty completion
    if (isPaid && order && order.status !== 'COMPLETED') {
      order = await prisma.order.update({
        where: { id: order.id },
        data: { status: 'COMPLETED' },
      });

      // Award loyalty points automatically if user is attached
      try {
        await processOrderCompletion(order.id);
      } catch (err) {
        console.error('Failed to process loyalty completion for QRIS order:', err);
      }

      return NextResponse.json({
        paid: true,
        orderId: order.id,
        status: 'COMPLETED',
        customerName: order.customerName,
        totalPayable: order.total,
      });
    }

    return NextResponse.json({
      paid: isPaid,
      status: isPaid ? 'COMPLETED' : 'PENDING',
    });
  } catch (error: any) {
    console.error('[DOKU QRIS STATUS CHECK ERROR]', error);
    return NextResponse.json({ paid: false, error: error.message }, { status: 500 });
  }
}
