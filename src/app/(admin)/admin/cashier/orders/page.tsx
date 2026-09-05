import { prisma } from '@/lib/prisma';
import CashierOrdersClient from './CashierOrdersClient';
import { cleanupOldPaymentProofs, cleanupUnconfirmedSpmbOrders } from '@/lib/order-utils';

export const revalidate = 0;

export default async function AdminCashierOrdersPage() {
  // Background cleanup of old payment proofs
  cleanupOldPaymentProofs().catch(err => console.error('[Background Cleanup Error]', err));
  
  // Clean up old unconfirmed SPMB orders
  cleanupUnconfirmedSpmbOrders().catch(err => console.error('[Background Cleanup Error]', err));

  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const orders = await prisma.order.findMany({
    where: {
      AND: [
        {
          OR: [
            { createdAt: { gte: startOfDay } },
            {
              status: {
                in: ['PENDING', 'PENDING_PAYMENT', 'PREPARING', 'READY', 'ASSIGNED', 'TO_STORE', 'PICKED_UP', 'ON_DELIVERY']
              }
            }
          ]
        },
        {
          NOT: {
            source: 'SPMB',
            customerPhone: { startsWith: 'SPMB-PENDING' }
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

  const voucherCodes = Array.from(new Set(orders.map(o => o.voucherCode).filter(Boolean))) as string[];
  const voucherTemplates = voucherCodes.length > 0 ? await prisma.voucherTemplate.findMany({
    where: { code: { in: voucherCodes } },
    select: { code: true, title: true }
  }) : [];
  const templateMap = new Map<string, string>(voucherTemplates.map(t => [t.code.toUpperCase(), t.title]));

  const mappedOrders = orders.map((o) => {
    const vCode = o.voucherCode ? o.voucherCode.trim() : null;
    const vTitle = vCode ? (templateMap.get(vCode.toUpperCase()) || null) : null;
    return {
      id: o.id,
      customerName: o.customerName,
      customerPhone: o.customerPhone,
      orderType: o.orderType,
      tableNumber: o.tableNumber,
      address: o.address,
      paymentMethod: o.paymentMethod,
      subtotal: o.subtotal,
      deliveryFee: o.deliveryFee,
      total: o.total,
      voucherCode: o.voucherCode,
      voucherTitle: vTitle,
      hasTumbler: o.hasTumbler,
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
        product: { 
          name: item.product.name, 
          price: item.product.price, 
          image: item.product.image 
        },
      })),
    };
  });

  return <CashierOrdersClient 
    initialOrders={mappedOrders} 
    storeLat={storeSettings?.storeLat || -6.2088}
    storeLng={storeSettings?.storeLng || 106.8456}
    initialPickupAlarmLeadTime={storeSettings?.pickupAlarmLeadTime ?? 30}
    initialAlarmSoundUrl={storeSettings?.alarmSoundUrl || ''}
  />;
}
