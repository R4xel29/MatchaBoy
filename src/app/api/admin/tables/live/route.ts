import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';

// GET /api/admin/tables/live — Fetch all tables with real-time active order details
export async function GET() {
  try {
    const session = await auth();
    // Allow ADMIN or CASHIER roles
    if (!session || (session.user.role !== 'ADMIN' && session.user.role !== 'CASHIER')) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    // 1. Fetch all dining tables
    const tables = await prisma.diningTable.findMany({
      orderBy: { number: 'asc' },
    });

    // 2. Fetch all active Dine-In orders
    const activeOrders = await prisma.order.findMany({
      where: {
        orderType: 'DINE_IN',
        status: { in: ['PENDING', 'PENDING_PAYMENT', 'PREPARING', 'READY'] },
        tableNumber: { not: null },
      },
      include: {
        items: {
          include: {
            product: {
              select: {
                name: true,
                image: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // 3. Map orders to corresponding tables
    const enrichedTables = tables.map((t) => {
      // Find orders matching this table number
      const matchingOrders = activeOrders.filter(
        (o) => o.tableNumber && o.tableNumber.trim() === t.number.trim()
      );

      const primaryOrder = matchingOrders[0] || null;

      let liveStatus = t.status;
      if (primaryOrder) {
        if (primaryOrder.status === 'READY') {
          liveStatus = 'READY';
        } else if (primaryOrder.status === 'PREPARING' || primaryOrder.status === 'PENDING') {
          liveStatus = 'OCCUPIED';
        } else if (primaryOrder.status === 'PENDING_PAYMENT') {
          liveStatus = 'BILLING';
        }
      }

      return {
        ...t,
        liveStatus,
        activeOrders: matchingOrders.map((o) => ({
          id: o.id,
          customerName: o.customerName,
          customerPhone: o.customerPhone,
          status: o.status,
          total: o.total,
          paymentMethod: o.paymentMethod,
          createdAt: o.createdAt.toISOString(),
          notes: o.notes,
          items: o.items.map((it) => ({
            id: it.id,
            qty: it.qty,
            price: it.price,
            productName: it.product.name,
            modifiers: it.modifiers,
          })),
        })),
        primaryOrder: primaryOrder
          ? {
              id: primaryOrder.id,
              customerName: primaryOrder.customerName,
              customerPhone: primaryOrder.customerPhone,
              status: primaryOrder.status,
              total: primaryOrder.total,
              paymentMethod: primaryOrder.paymentMethod,
              createdAt: primaryOrder.createdAt.toISOString(),
              notes: primaryOrder.notes,
              items: primaryOrder.items.map((it) => ({
                id: it.id,
                qty: it.qty,
                price: it.price,
                productName: it.product.name,
                modifiers: it.modifiers,
              })),
            }
          : null,
      };
    });

    return NextResponse.json({
      success: true,
      tables: enrichedTables,
      totalTables: tables.length,
      occupiedTables: enrichedTables.filter((t) => t.primaryOrder !== null).length,
    });
  } catch (error) {
    console.error('Error fetching live tables:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
