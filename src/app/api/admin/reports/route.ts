import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const revalidate = 0;

export async function GET(req: NextRequest) {
  const startDate = req.nextUrl.searchParams.get('startDate');
  const endDate = req.nextUrl.searchParams.get('endDate');
  const type = req.nextUrl.searchParams.get('type') || 'ALL';
  const source = req.nextUrl.searchParams.get('source') || 'ALL';

  // Build date filter
  const dateFilter: any = {};
  if (startDate) {
    dateFilter.gte = new Date(startDate + 'T00:00:00');
  }
  if (endDate) {
    dateFilter.lte = new Date(endDate + 'T23:59:59');
  }

  const where: any = {};
  if (Object.keys(dateFilter).length > 0) where.createdAt = dateFilter;
  if (type !== 'ALL') where.orderType = type;
  if (source !== 'ALL') where.source = source;
  // Only include completed/delivered orders in reports
  where.status = { in: ['COMPLETED', 'DELIVERED'] };

  const [orders, aggregate] = await Promise.all([
    prisma.order.findMany({
      where,
      include: {
        items: { include: { product: true } },
        user: { select: { name: true, email: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 500,
    }),
    prisma.order.aggregate({
      where,
      _sum: { total: true, deliveryFee: true },
      _count: true,
      _avg: { total: true },
    }),
  ]);

  const mappedOrders = orders.map((o) => ({
    id: o.id,
    customerName: o.customerName,
    customerPhone: o.customerPhone,
    orderType: o.orderType,
    source: (o as any).source || 'POS',
    paymentMethod: o.paymentMethod,
    subtotal: o.subtotal,
    deliveryFee: o.deliveryFee,
    total: o.total,
    status: o.status,
    createdAt: o.createdAt.toISOString(),
    items: o.items.map((item) => ({
      qty: item.qty,
      price: item.price,
      productName: item.product.name,
    })),
  }));

  return NextResponse.json({
    orders: mappedOrders,
    summary: {
      totalRevenue: aggregate._sum.total || 0,
      totalDeliveryFees: aggregate._sum.deliveryFee || 0,
      orderCount: aggregate._count,
      avgOrderValue: Math.round(aggregate._avg.total || 0),
    },
  });
}
