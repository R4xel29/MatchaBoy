import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { cleanupUnconfirmedSpmbOrders } from '@/lib/order-utils';

// Lightweight JSON endpoint for client-side polling (replaces router.refresh)
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user || (session.user.role !== 'ADMIN' && session.user.role !== 'CASHIER')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Clean up old unconfirmed SPMB orders
    await cleanupUnconfirmedSpmbOrders().catch(err => console.error('[Background Cleanup Error]', err));

    const orders = await prisma.order.findMany({
      where: {
        NOT: {
          source: 'SPMB',
          customerPhone: { startsWith: 'SPMB-PENDING' },
        }
      },
      orderBy: { createdAt: 'desc' },
      include: { items: { include: { product: true } } },
    });

    const mappedOrders = orders.map((o) => ({
      id: o.id,
      customerName: o.customerName,
      customerPhone: o.customerPhone,
      address: o.address,
      orderType: o.orderType,
      paymentMethod: o.paymentMethod,
      total: o.total,
      status: o.status,
      cancelReason: o.cancelReason,
      notes: o.notes,
      pickupTime: o.pickupTime,
      source: o.source,
      createdAt: o.createdAt.toISOString(),
      paymentProofUrl: o.paymentProofUrl,
      items: o.items.map((item) => ({
        id: item.id,
        qty: item.qty,
        price: item.price,
        modifiers: item.modifiers,
        product: {
          name: item.product.name,
          image: item.product.image,
        },
      })),
    }));

    return NextResponse.json({ orders: mappedOrders });
  } catch (error) {
    console.error('Admin orders polling error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
