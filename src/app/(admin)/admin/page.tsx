import { prisma } from '@/lib/prisma';
import { formatRupiah } from '@/lib/utils';
import Link from 'next/link';
import {
  TrendingUp,
  Package,
  ShoppingCart,
  Users
} from 'lucide-react';

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
    prisma.order.count(),
    prisma.product.count(),
    prisma.user.count({ where: { role: 'CUSTOMER' } }),
    prisma.order.aggregate({
      _sum: { total: true },
      where: { status: { in: ['DELIVERED', 'ON_DELIVERY'] } }
    }),
    prisma.order.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      include: { items: { include: { product: true } } }
    }),
    prisma.product.count({ where: { badge: 'sold-out' } })
  ]);

  const totalRevenue = revenueResult._sum.total || 0;
  const activeProducts = totalProducts - soldOutProducts;

  const STATS = [
    {
      title: 'Total Revenue',
      value: formatRupiah(totalRevenue),
      subtitle: `From ${totalOrders} orders`,
      icon: TrendingUp,
      color: 'text-emerald-600',
      bg: 'bg-emerald-50'
    },
    {
      title: 'Total Orders',
      value: totalOrders.toString(),
      subtitle: 'All time',
      icon: ShoppingCart,
      color: 'text-blue-600',
      bg: 'bg-blue-50'
    },
    {
      title: 'Active Products',
      value: activeProducts.toString(),
      subtitle: `${soldOutProducts} sold out`,
      icon: Package,
      color: 'text-purple-600',
      bg: 'bg-purple-50'
    },
    {
      title: 'Customers',
      value: totalCustomers.toString(),
      subtitle: 'Registered users',
      icon: Users,
      color: 'text-orange-600',
      bg: 'bg-orange-50'
    }
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold font-heading">Dashboard Overview</h1>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {STATS.map((stat) => (
          <div key={stat.title} className="p-5 rounded-2xl bg-white border border-border/50 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <div className={`w-10 h-10 rounded-xl ${stat.bg} flex items-center justify-center`}>
                <stat.icon className={`w-5 h-5 ${stat.color}`} />
              </div>
            </div>
            <p className="text-xs text-muted-foreground font-medium mb-0.5">{stat.title}</p>
            <h3 className="text-xl font-bold text-foreground">{stat.value}</h3>
            <p className="text-[11px] text-muted-foreground mt-1">{stat.subtitle}</p>
          </div>
        ))}
      </div>

      {/* Recent Orders */}
      <div className="mt-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-bold font-heading">Recent Orders</h2>
          <Link href="/admin/orders" className="text-sm font-medium text-matcha-600 hover:underline">
            View all →
          </Link>
        </div>

        <div className="bg-white border border-border/50 rounded-2xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-muted-foreground bg-muted/30 uppercase border-b border-border/50">
                <tr>
                  <th className="px-6 py-4 font-medium">Order ID</th>
                  <th className="px-6 py-4 font-medium">Customer</th>
                  <th className="px-6 py-4 font-medium">Total</th>
                  <th className="px-6 py-4 font-medium">Status</th>
                  <th className="px-6 py-4 text-right font-medium">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {recentOrders.length === 0 ? (
                  <tr><td colSpan={5} className="px-6 py-8 text-center text-muted-foreground">No recent orders.</td></tr>
                ) : (
                  recentOrders.map((order: any) => (
                    <tr key={order.id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-6 py-4">
                        <Link href={`/admin/orders/${order.id}`} className="font-mono font-medium text-matcha-700 hover:underline">
                          {order.id.slice(0, 8).toUpperCase()}
                        </Link>
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-medium text-foreground">{order.customerName}</div>
                        <div className="text-xs text-muted-foreground">{order.customerPhone}</div>
                      </td>
                      <td className="px-6 py-4 font-medium">{formatRupiah(order.total)}</td>
                      <td className="px-6 py-4">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider
                          ${order.status === 'DELIVERED' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                            order.status === 'ASSIGNED' ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                            'bg-blue-50 text-blue-700 border border-blue-200'
                          }`}>
                          {order.status.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right text-muted-foreground">
                        {new Date(order.createdAt).toLocaleDateString('id-ID', {
                          day: 'numeric', month: 'short', year: 'numeric'
                        })}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
