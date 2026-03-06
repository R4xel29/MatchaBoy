import { prisma } from '@/lib/prisma';
import { Users } from 'lucide-react';

export const revalidate = 0;

export default async function AdminCustomersPage() {
  const customers = await prisma.user.findMany({
    where: { role: 'CUSTOMER' },
    orderBy: { createdAt: 'desc' },
    include: { _count: { select: { orders: true } } },
  });

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold font-heading text-foreground">Customers</h1>
        <p className="text-sm text-muted-foreground mt-0.5">{customers.length} registered customers</p>
      </div>

      {/* Desktop Table */}
      <div className="hidden sm:block bg-white border border-border/40 rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.04)] overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border/40">
              <th className="px-5 py-3.5 text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Customer</th>
              <th className="px-5 py-3.5 text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Email</th>
              <th className="px-5 py-3.5 text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Phone</th>
              <th className="px-5 py-3.5 text-center text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Orders</th>
              <th className="px-5 py-3.5 text-right text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Joined</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/30">
            {customers.length === 0 ? (
              <tr><td colSpan={5} className="px-5 py-16 text-center text-muted-foreground/50">
                <Users className="w-10 h-10 mx-auto mb-2 opacity-30" /> No customers yet
              </td></tr>
            ) : (
              customers.map((customer: any) => (
                <tr key={customer.id} className="group hover:bg-muted/20 transition-colors">
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-matcha-400 to-matcha-600 flex items-center justify-center text-white font-bold text-xs shadow-sm">
                        {(customer.name || 'U')[0].toUpperCase()}
                      </div>
                      <span className="font-medium text-foreground text-[13px]">{customer.name || 'Unknown'}</span>
                    </div>
                  </td>
                  <td className="px-5 py-3.5 text-[13px] text-muted-foreground">{customer.email || '-'}</td>
                  <td className="px-5 py-3.5 text-[13px] text-muted-foreground">{customer.phone || '-'}</td>
                  <td className="px-5 py-3.5 text-center">
                    <span className="inline-flex items-center justify-center min-w-[24px] px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 text-[11px] font-bold">
                      {customer._count.orders}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-right text-[12px] text-muted-foreground">
                    {new Date(customer.createdAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile Cards */}
      <div className="sm:hidden space-y-3">
        {customers.length === 0 ? (
          <div className="py-16 text-center text-muted-foreground/50 bg-white rounded-2xl border border-border/40">
            <Users className="w-10 h-10 mx-auto mb-2 opacity-30" /> <p className="text-sm">No customers yet</p>
          </div>
        ) : (
          customers.map((customer: any) => (
            <div key={customer.id} className="bg-white rounded-2xl border border-border/40 p-4 shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-matcha-400 to-matcha-600 flex items-center justify-center text-white font-bold text-sm shadow-sm">
                  {(customer.name || 'U')[0].toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-foreground text-[13px] truncate">{customer.name || 'Unknown'}</p>
                  <p className="text-[11px] text-muted-foreground truncate">{customer.email || '-'}</p>
                </div>
                <span className="px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 text-[11px] font-bold">{customer._count.orders} orders</span>
              </div>
              <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-2 border-t border-border/30">
                <span>{customer.phone || 'No phone'}</span>
                <span>{new Date(customer.createdAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
