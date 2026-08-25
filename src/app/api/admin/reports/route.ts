import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';

export const revalidate = 0;

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id || !['ADMIN', 'CASHIER'].includes(session.user.role || '')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

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
        items: {
          include: {
            product: {
              include: {
                productIngredients: {
                  include: {
                    ingredient: true,
                  },
                },
              },
            },
          },
        },
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

  let totalCogs = 0;

  const mappedOrders = orders.map((o) => {
    let orderCogs = 0;
    const items = o.items.map((item) => {
      let itemUnitCogs = 0;
      if (item.product?.productIngredients) {
        item.product.productIngredients.forEach((pi) => {
          itemUnitCogs += Math.round(pi.quantity * (pi.ingredient?.costPerUnit || 0));
        });
      }
      const itemTotalCogs = itemUnitCogs * item.qty;
      orderCogs += itemTotalCogs;

      return {
        qty: item.qty,
        price: item.price,
        cogs: itemUnitCogs,
        productName: item.product?.name || 'Menu',
      };
    });

    totalCogs += orderCogs;
    const grossProfit = o.total - orderCogs;

    return {
      id: o.id,
      customerName: o.customerName,
      customerPhone: o.customerPhone,
      orderType: o.orderType,
      source: (o as any).source || 'POS',
      paymentMethod: o.paymentMethod,
      subtotal: o.subtotal,
      deliveryFee: o.deliveryFee,
      total: o.total,
      cogs: orderCogs,
      grossProfit,
      status: o.status,
      createdAt: o.createdAt.toISOString(),
      items,
    };
  });

  const totalRevenue = aggregate._sum.total || 0;
  const totalGrossProfit = totalRevenue - totalCogs;
  const grossProfitMargin = totalRevenue > 0 ? Math.round((totalGrossProfit / totalRevenue) * 100) : 0;

  return NextResponse.json({
    orders: mappedOrders,
    summary: {
      totalRevenue,
      totalDeliveryFees: aggregate._sum.deliveryFee || 0,
      totalCogs,
      totalGrossProfit,
      grossProfitMargin,
      orderCount: aggregate._count,
      avgOrderValue: Math.round(aggregate._avg.total || 0),
    },
  });
}
