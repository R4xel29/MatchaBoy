import { prisma } from '@/lib/prisma';
import KitchenDisplayClient, { KitchenOrder } from './KitchenDisplayClient';

export const revalidate = 0;
export const dynamic = 'force-dynamic';

export default async function KitchenPage() {
  const orders = await prisma.order.findMany({
    where: {
      status: { in: ['PENDING', 'PREPARING', 'READY'] },
      NOT: {
        source: 'SPMB',
        customerPhone: { startsWith: 'SPMB-PENDING' },
      },
    },
    orderBy: { createdAt: 'asc' }, // Kitchen view shows oldest pending orders first
    include: {
      items: {
        include: {
          product: true,
        },
      },
    },
  });

  const formattedOrders: KitchenOrder[] = orders.map((o) => ({
    id: o.id,
    customerName: o.customerName,
    customerPhone: o.customerPhone,
    address: o.address,
    tableNumber: o.tableNumber,
    orderType: o.orderType,
    source: o.source,
    status: o.status,
    total: o.total,
    notes: o.notes,
    queueNumber: o.queueNumber,
    createdAt: o.createdAt.toISOString(),
    items: o.items.map((item) => ({
      id: item.id,
      qty: item.qty,
      price: item.price,
      modifiers: item.modifiers,
      product: {
        id: item.product.id,
        name: item.product.name,
        image: item.product.image,
      },
    })),
  }));

  return <KitchenDisplayClient initialOrders={formattedOrders} />;
}
