import { prisma } from '@/lib/prisma';
import { formatRupiah } from '@/lib/utils';
import Link from 'next/link';
import {
  TrendingUp,
  Package,
  ShoppingCart,
  Users,
  ArrowUpRight,
  Clock
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
      gradient: 'from-emerald-500 to-teal-600',
      iconBg: 'bg-emerald-500/10',
      iconColor: 'text-emerald-600',
    },
    {
      title: 'Total Orders',
      value: totalOrders.toString(),
      subtitle: 'All time',
      icon: ShoppingCart,
      gradient: 'from-blue-500 to-indigo-600',
      iconBg: 'bg-blue-500/10',
      iconColor: 'text-blue-600',
    },
    {
      title: 'Active Products',
      value: activeProducts.toString(),
      subtitle: `${soldOutProducts} sold out`,
      icon: Package,
      gradient: 'from-violet-500 to-purple-600',
      iconBg: 'bg-violet-500/10',
      iconColor: 'text-violet-600',
    },
    {
      title: 'Customers',
      value: totalCustomers.toString(),
      subtitle: 'Registered users',
      icon: Users,
      gradient: 'from-amber-500 to-orange-600',
      iconBg: 'bg-amber-500/10',
      iconColor: 'text-amber-600',
    }
  ];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-bold font-heading text-foreground">Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Overview of your store performance</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {STATS.map((stat) => (
          <div key={stat.title} className="group relative p-4 sm:p-5 rounded-2xl bg-white border border-border/40 shadow-[0_1px_3px_rgba(0,0,0,0.04)] hover:shadow-md hover:border-border/60 transition-all duration-300">
            <div className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl ${stat.iconBg} flex items-center justify-center mb-3`}>
              <stat.icon className={`w-4 h-4 sm:w-5 sm:h-5 ${stat.iconColor}`} />
            </div>
            <p className="text-[11px] sm:text-xs font-medium text-muted-foreground uppercase tracking-wider">{stat.title}</p>
            <h3 className="text-lg sm:text-xl font-bold text-foreground mt-0.5 tracking-tight">{stat.value}</h3>
            <p className="text-[10px] sm:text-[11px] text-muted-foreground/70 mt-1">{stat.subtitle}</p>
          </div>
        ))}
      </div>

      {/* Recent Orders */}
      <div>
        <div className="flex justify-between items-center mb-3">
          <h2 className="text-base sm:text-lg font-bold font-heading text-foreground">Recent Orders</h2>
          <Link href="/admin/orders" className="text-xs font-semibold text-matcha-600 hover:text-matcha-700 flex items-center gap-1 transition-colors">
            View all <ArrowUpRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="bg-white border border-border/40 rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.04)] overflow-hidden">
          {/* Desktop Table */}
          <div className="hidden sm:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/40">
                  <th className="px-5 py-3.5 text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Order ID</th>
                  <th className="px-5 py-3.5 text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Customer</th>
                  <th className="px-5 py-3.5 text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Total</th>
                  <th className="px-5 py-3.5 text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Status</th>
                  <th className="px-5 py-3.5 text-right text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/30">
                {recentOrders.length === 0 ? (
                  <tr><td colSpan={5} className="px-5 py-10 text-center text-sm text-muted-foreground">No orders yet</td></tr>
                ) : (
                  recentOrders.map((order: any) => (
                    <tr key={order.id} className="group hover:bg-muted/20 transition-colors">
                      <td className="px-5 py-3.5">
                        <Link href={`/admin/orders/${order.id}`} className="font-mono text-xs font-bold text-matcha-700 hover:text-matcha-800 hover:underline underline-offset-2">
                          #{order.id.slice(0, 8).toUpperCase()}
                        </Link>
                      </td>
                      <td className="px-5 py-3.5">
                        <p className="font-medium text-foreground text-[13px]">{order.customerName}</p>
                        <p className="text-[11px] text-muted-foreground">{order.customerPhone}</p>
                      </td>
                      <td className="px-5 py-3.5 font-semibold text-[13px]">{formatRupiah(order.total)}</td>
                      <td className="px-5 py-3.5">
                        <span className={`inline-flex px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider
                          ${order.status === 'DELIVERED' ? 'bg-emerald-50 text-emerald-700' :
                            order.status === 'ON_DELIVERY' ? 'bg-blue-50 text-blue-700' :
                            order.status === 'ASSIGNED' ? 'bg-amber-50 text-amber-700' :
                            'bg-slate-100 text-slate-600'
                          }`}>
                          {order.status.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-right text-xs text-muted-foreground">
                        {new Date(order.createdAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards */}
          <div className="sm:hidden divide-y divide-border/30">
            {recentOrders.length === 0 ? (
              <div className="px-4 py-10 text-center text-sm text-muted-foreground">No orders yet</div>
            ) : (
              recentOrders.map((order: any) => (
                <Link key={order.id} href={`/admin/orders/${order.id}`} className="block px-4 py-3.5 hover:bg-muted/20 transition-colors">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-mono text-xs font-bold text-matcha-700">#{order.id.slice(0, 8).toUpperCase()}</span>
                    <span className={`px-2 py-0.5 rounded-md text-[9px] font-bold uppercase
                      ${order.status === 'DELIVERED' ? 'bg-emerald-50 text-emerald-700' :
                        order.status === 'ASSIGNED' ? 'bg-amber-50 text-amber-700' :
                        'bg-blue-50 text-blue-700'}`}>
                      {order.status.replace('_', ' ')}
                    </span>
                  </div>
                  <p className="text-[13px] font-medium text-foreground">{order.customerName}</p>
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {new Date(order.createdAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}
                    </span>
                    <span className="text-[13px] font-bold">{formatRupiah(order.total)}</span>
                  </div>
                </Link>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
