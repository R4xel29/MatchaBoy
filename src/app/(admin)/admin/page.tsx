import { prisma } from '@/lib/prisma';
import AdminDashboardClient from './AdminDashboardClient';

export const revalidate = 0;

export default async function AdminDashboardPage() {
  const [
    totalOrders,
    totalProducts,
    totalCustomers,
    revenueResult,
    recentOrders,
    soldOutProducts
  ] = await Promise.all([
    prisma.order.count({
      where: {
        NOT: {
          source: 'SPMB',
          customerPhone: { startsWith: 'SPMB-PENDING' }
        }
      }
    }),
    prisma.product.count(),
    prisma.user.count({ where: { role: 'CUSTOMER' } }),
    prisma.order.aggregate({
      _sum: { total: true },
      where: {
        status: { in: ['DELIVERED', 'ON_DELIVERY', 'COMPLETED'] },
        NOT: {
          source: 'SPMB',
          customerPhone: { startsWith: 'SPMB-PENDING' }
        }
      }
    }),
    prisma.order.findMany({
      take: 5,
      where: {
        NOT: {
          source: 'SPMB',
          customerPhone: { startsWith: 'SPMB-PENDING' }
        }
      },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        customerName: true,
        customerPhone: true,
        total: true,
        status: true,
        createdAt: true,
      }
    }),
    prisma.product.count({ where: { badge: 'sold-out' } })
  ]);

  const totalRevenue = revenueResult._sum.total || 0;
  const activeProducts = totalProducts - soldOutProducts;

  return (
    <AdminDashboardClient
      initialData={{
        totalOrders,
        totalRevenue,
        totalCustomers,
        recentOrders: recentOrders.map((o: any) => ({
          ...o,
          createdAt: o.createdAt.toISOString(),
        })),
      }}
      activeProducts={activeProducts}
      soldOutProducts={soldOutProducts}
    />
  );
}
