import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const revalidate = 0;

export async function GET() {
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const count = await prisma.order.count({
    where: {
      createdAt: { gte: startOfDay },
      status: { in: ['PENDING', 'PENDING_PAYMENT', 'PREPARING', 'READY', 'ASSIGNED'] },
    },
  });

  return NextResponse.json({ count });
}
