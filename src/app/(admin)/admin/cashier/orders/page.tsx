import { prisma } from '@/lib/prisma';
import CashierOrdersClient from './CashierOrdersClient';
import { cleanupOldPaymentProofs } from '@/lib/order-utils';

export const revalidate = 0;

export default async function AdminCashierOrdersPage() {
  // Background cleanup of old payment proofs
  cleanupOldPaymentProofs().catch(err => console.error('[Background Cleanup Error]', err));

  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const orders = await prisma.order.findMany({
    where: {
      OR: [
        { createdAt: { gte: startOfDay } },
        {
          status: {
            in: ['PENDING', 'PENDING_PAYMENT', 'PREPARING', 'READY', 'ASSIGNED', 'TO_STORE', 'PICKED_UP', 'ON_DELIVERY']
          }
        }
      ]
    },
    include: {
      items: { include: { product: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  const storeSettings = await prisma.storeSettings.findFirst();

  const mappedOrders = orders.map((o) => ({
    id: o.id,
    customerName: o.customerName,
    customerPhone: o.customerPhone,
    orderType: o.orderType,
    tableNumber: o.tableNumber,
    address: o.address,
    paymentMethod: o.paymentMethod,
    total: o.total,
    status: o.status,
    notes: o.notes,
    source: o.source,
    createdAt: o.createdAt.toISOString(),
    paymentProofUrl: o.paymentProofUrl,
    pickupDate: o.pickupDate ? o.pickupDate.toISOString() : null,
    pickupTime: o.pickupTime,
    queueNumber: o.queueNumber,
    items: o.items.map((item) => ({
      id: item.id,
      qty: item.qty,
      price: item.price,
      modifiers: item.modifiers,
      product: { name: item.product.name, image: item.product.image },
    })),
  }));

  return <CashierOrdersClient 
    initialOrders={mappedOrders} 
    storeLat={storeSettings?.storeLat || -6.2088}
    storeLng={storeSettings?.storeLng || 106.8456}
    initialPickupAlarmLeadTime={storeSettings?.pickupAlarmLeadTime ?? 30}
  />;
}
