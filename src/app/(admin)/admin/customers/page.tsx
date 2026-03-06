import { prisma } from '@/lib/prisma';
import { Users } from 'lucide-react';

export const revalidate = 0;

export default async function AdminCustomersPage() {
  const customers = await prisma.user.findMany({
    where: { role: 'CUSTOMER' },
    orderBy: { createdAt: 'desc' },
    include: {
      _count: { select: { orders: true } },
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold font-heading">Customer Management</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {customers.length} registered customers
        </p>
      </div>

      <div className="bg-white rounded-2xl border border-border/50 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-muted-foreground bg-muted/30 uppercase border-b border-border/50">
              <tr>
                <th className="px-6 py-4 font-medium">Customer</th>
                <th className="px-6 py-4 font-medium">Email</th>
                <th className="px-6 py-4 font-medium">Phone</th>
                <th className="px-6 py-4 font-medium text-center">Orders</th>
                <th className="px-6 py-4 font-medium text-right">Joined</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {customers.length === 0 ? (
                <tr><td colSpan={5} className="px-6 py-12 text-center text-muted-foreground">
                  <Users className="w-10 h-10 mx-auto mb-3 opacity-20" />
                  No customers registered yet.
                </td></tr>
              ) : (
                customers.map((customer: any) => (
                  <tr key={customer.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-matcha-50 flex items-center justify-center text-matcha-700 font-bold text-sm">
                          {(customer.name || 'U')[0].toUpperCase()}
                        </div>
                        <span className="font-medium text-foreground">{customer.name || 'Unknown'}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-muted-foreground">{customer.email || '-'}</td>
                    <td className="px-6 py-4 text-muted-foreground">{customer.phone || '-'}</td>
                    <td className="px-6 py-4 text-center">
                      <span className="inline-flex items-center justify-center min-w-[28px] px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 text-xs font-bold border border-blue-200">
                        {customer._count.orders}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right text-muted-foreground text-xs">
                      {new Date(customer.createdAt).toLocaleDateString('id-ID', {
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
  );
}
