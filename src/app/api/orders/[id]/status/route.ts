import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { expireOrder } from '@/lib/order-utils';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  // Auto-expire order if past payment deadline
  await expireOrder(id);
  
  const order = await prisma.order.findUnique({
    where: { id },
    select: {
      id: true,
      status: true,
      cancelReason: true,
      updatedAt: true,
      orderType: true,
      pickupTime: true,
      pickupDate: true,
      paymentMethod: true,
      paymentProofUrl: true,
      paymentQrContent: true,
      paymentExpiredAt: true,
      paymentUrl: true,
      total: true,
      subtotal: true,
      customerName: true,
    },
  });

  if (!order) {
    return NextResponse.json({ error: 'Order not found' }, { status: 404 });
  }

  return NextResponse.json({
    id: order.id,
    status: order.status,
    cancelReason: order.cancelReason,
    updatedAt: order.updatedAt.toISOString(),
    orderType: order.orderType,
    pickupTime: order.pickupTime,
    pickupDate: order.pickupDate?.toISOString(),
    paymentMethod: order.paymentMethod,
    hasPaymentProof: !!order.paymentProofUrl,
    paymentQrContent: order.paymentQrContent,
    paymentExpiredAt: order.paymentExpiredAt?.toISOString(),
    paymentUrl: order.paymentUrl,
    total: order.total,
    subtotal: order.subtotal,
    customerName: order.customerName,
  });
}
