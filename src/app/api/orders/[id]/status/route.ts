import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  
  const order = await prisma.order.findUnique({
    where: { id },
    select: {
      status: true,
      updatedAt: true,
      orderType: true,
      pickupTime: true,
      pickupDate: true,
      paymentMethod: true,
      paymentProofUrl: true,
    },
  });

  if (!order) {
    return NextResponse.json({ error: 'Order not found' }, { status: 404 });
  }

  return NextResponse.json({
    status: order.status,
    updatedAt: order.updatedAt.toISOString(),
    orderType: order.orderType,
    pickupTime: order.pickupTime,
    pickupDate: order.pickupDate?.toISOString(),
    paymentMethod: order.paymentMethod,
    hasPaymentProof: !!order.paymentProofUrl,
  });
}
