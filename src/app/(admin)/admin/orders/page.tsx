import { prisma } from '@/lib/prisma';
import AdminOrdersClient from './AdminOrdersClient';

export const revalidate = 0;

export default async function AdminOrdersPage() {
  const orders = await prisma.order.findMany({
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
    createdAt: o.createdAt.toISOString(),
    paymentProofUrl: o.paymentProofUrl,
    items: o.items.map((item) => ({
      id: item.id,
      qty: item.qty,
      price: item.price,
      product: {
        name: item.product.name,
        image: item.product.image,
      },
    })),
  }));

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold font-heading text-foreground">Orders</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Track and manage customer orders</p>
      </div>
      <AdminOrdersClient initialOrders={mappedOrders} />
    </div>
  );
}
