import { prisma } from '@/lib/prisma';
import AdminOrdersClient from './AdminOrdersClient';
import { cleanupUnconfirmedSpmbOrders } from '@/lib/order-utils';

export const revalidate = 0;

interface PageProps {
  searchParams: Promise<{ page?: string; search?: string; status?: string }>;
}

export default async function AdminOrdersPage({ searchParams }: PageProps) {
  // Clean up old unconfirmed SPMB orders
  await cleanupUnconfirmedSpmbOrders().catch(err => console.error('[Background Cleanup Error]', err));

  const params = await searchParams;
  const page = Math.max(1, Number(params?.page) || 1);
  const pageSize = 15;
  const searchQuery = params?.search?.trim() || '';
  const statusFilter = params?.status || '';

  const where: any = {
    NOT: {
      source: 'SPMB',
      customerPhone: { startsWith: 'SPMB-PENDING' },
    },
  };

  if (statusFilter) {
    where.status = statusFilter;
  }

  if (searchQuery) {
    where.OR = [
      { id: { contains: searchQuery, mode: 'insensitive' } },
      { customerName: { contains: searchQuery, mode: 'insensitive' } },
      { customerPhone: { contains: searchQuery, mode: 'insensitive' } },
    ];
  }

  const [totalOrders, orders] = await Promise.all([
    prisma.order.count({ where }),
    prisma.order.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: { items: { include: { product: true } } },
    }),
  ]);

  const totalPages = Math.ceil(totalOrders / pageSize) || 1;

  const mappedOrders = orders.map((o) => ({
    id: o.id,
    customerName: o.customerName,
    customerPhone: o.customerPhone,
    address: o.address,
    orderType: o.orderType,
    paymentMethod: o.paymentMethod,
    total: o.total,
    subtotal: o.subtotal,
    deliveryFee: o.deliveryFee,
    voucherCode: o.voucherCode,
    hasTumbler: o.hasTumbler,
    queueNumber: o.queueNumber,
    tableNumber: o.tableNumber,
    pointsEarned: o.pointsEarned,
    status: o.status,
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
        price: item.product.price,
      },
    })),
  }));

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold font-heading text-stone-900">Semua Pesanan</h1>
        <p className="text-xs sm:text-sm text-stone-500 mt-0.5">Kelola seluruh alur transaksi pesanan, cetak struk kasir & tiket dapur, serta pantau status pelanggan</p>
      </div>
      <AdminOrdersClient 
        initialOrders={mappedOrders} 
        currentPage={page}
        totalPages={totalPages}
        totalOrders={totalOrders}
        pageSize={pageSize}
      />
    </div>
  );
}
