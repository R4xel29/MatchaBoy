import { prisma } from '@/lib/prisma';
import AdminOrdersClient from './AdminOrdersClient';

export const revalidate = 0; // Always fetch fresh orders

export default async function AdminOrdersPage() {
  const orders = await prisma.order.findMany({
    orderBy: {
      createdAt: 'desc',
    },
    include: {
      items: {
        include: {
          product: true,
        },
      },
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold font-heading">Order Management</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Track and update all incoming customer orders.
          </p>
        </div>
      </div>

      <AdminOrdersClient initialOrders={orders} />
    </div>
  );
}
