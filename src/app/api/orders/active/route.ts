import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch the user's active orders (orders that are not completed, delivered, or cancelled)
    const activeOrders = await prisma.order.findMany({
      where: {
        userId: session.user.id,
        status: {
          notIn: ['COMPLETED', 'DELIVERED', 'CANCELLED'],
        },
      },
      select: {
        id: true,
        status: true,
        orderType: true,
        total: true,
        paymentMethod: true,
        paymentUrl: true,
        items: {
          select: {
            qty: true,
            product: {
              select: {
                name: true,
              },
            },
          },
        },
        createdAt: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // Map database shape to match what active popup component expects
    const mappedOrders = activeOrders.map((order: any) => ({
      id: order.id,
      status: order.status,
      orderType: order.orderType,
      total: order.total,
      paymentMethod: order.paymentMethod,
      paymentUrl: order.paymentUrl,
      itemsSummary: order.items.map((item: any) => `${item.qty}x ${item.product.name}`).join(', '),
      createdAt: order.createdAt.toISOString(),
    }));

    return NextResponse.json(mappedOrders);
  } catch (error) {
    console.error('Error fetching active orders:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
