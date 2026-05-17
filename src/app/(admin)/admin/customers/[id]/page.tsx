import { prisma } from '@/lib/prisma';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { 
  ChevronLeft, 
  User, 
  Mail, 
  Phone, 
  Calendar, 
  Clock, 
  Ticket, 
  ShoppingBag, 
  ShieldCheck, 
  History,
  Link2,
  Trophy,
  Smartphone
} from 'lucide-react';
import { format } from 'date-fns';
import { id as localeId } from 'date-fns/locale';
import CustomerActions from './customer-actions';

export const revalidate = 0;

interface PageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function CustomerDetailPage({ params }: PageProps) {
  const { id } = await params;

  const customer = await prisma.user.findUnique({
    where: { id },
    include: {
      accounts: true,
      vouchers: {
        orderBy: { createdAt: 'desc' }
      },
      orders: {
        take: 10,
        orderBy: { createdAt: 'desc' },
        include: { _count: { select: { items: true } } }
      },
      sessions: {
        take: 5,
        orderBy: { expires: 'desc' }
      },
      activityLogs: {
        where: { action: 'LOGIN' },
        take: 10,
        orderBy: { createdAt: 'desc' }
      },
      pointHistory: {
        take: 5,
        orderBy: { createdAt: 'desc' }
      }
    }
  });

  if (!customer) {
    notFound();
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-20">
      {/* Header & Back Button */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Link 
            href="/admin/customers" 
            className="p-2.5 rounded-xl border border-border/40 bg-white hover:bg-muted/50 transition-all shadow-sm group"
          >
            <ChevronLeft className="w-5 h-5 text-muted-foreground group-hover:text-foreground transition-colors" />
          </Link>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold font-heading text-foreground">Detail Pelanggan</h1>
            <p className="text-xs sm:text-sm text-muted-foreground">Informasi lengkap profil dan riwayat aktivitas</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Profile Card & Linked Accounts */}
        <div className="lg:col-span-1 space-y-6">
          {/* Main Profile Card */}
          <div className="bg-white rounded-3xl border border-border/40 shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden">
            <div className="h-24 bg-gradient-to-r from-brand-400 to-brand-600"></div>
            <div className="px-6 pb-6 -mt-12 text-center">
              <div className="inline-flex items-center justify-center w-24 h-24 rounded-3xl bg-white p-1 shadow-xl mb-4">
                <div className="w-full h-full rounded-2xl bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center text-white font-bold text-3xl">
                  {(customer.name || 'U')[0].toUpperCase()}
                </div>
              </div>
              <h2 className="text-xl font-bold text-foreground mb-1">{customer.name || 'Unknown'}</h2>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 text-blue-600 text-[11px] font-bold uppercase tracking-wider mb-6">
                <ShieldCheck className="w-3.5 h-3.5" />
                {customer.role}
              </div>

              <div className="grid grid-cols-2 gap-3 mb-6">
                <div className="bg-muted/30 rounded-2xl p-4 text-center">
                  <Trophy className="w-5 h-5 text-yellow-600 mx-auto mb-1.5" />
                  <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-tight">Poin</p>
                  <p className="text-lg font-black text-foreground leading-tight">{customer.points}</p>
                </div>
                <div className="bg-muted/30 rounded-2xl p-4 text-center">
                  <ShoppingBag className="w-5 h-5 text-brand-600 mx-auto mb-1.5" />
                  <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-tight">Orders</p>
                  <p className="text-lg font-black text-foreground leading-tight">{customer.orders.length}</p>
                </div>
              </div>

              <div className="space-y-4 text-left">
                <div className="flex items-center gap-3 p-3 rounded-2xl border border-border/30 bg-gray-50/50">
                  <div className="w-10 h-10 rounded-xl bg-white border border-border/40 flex items-center justify-center shadow-sm">
                    <Mail className="w-4 h-4 text-muted-foreground" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Email</p>
                    <p className="text-[13px] font-medium text-foreground truncate">{customer.email || '-'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 rounded-2xl border border-border/30 bg-gray-50/50">
                  <div className="w-10 h-10 rounded-xl bg-white border border-border/40 flex items-center justify-center shadow-sm">
                    <Smartphone className="w-4 h-4 text-muted-foreground" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">WhatsApp</p>
                    <p className="text-[13px] font-medium text-foreground">{customer.phone || '-'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 rounded-2xl border border-border/30 bg-gray-50/50">
                  <div className="w-10 h-10 rounded-xl bg-white border border-border/40 flex items-center justify-center shadow-sm">
                    <Calendar className="w-4 h-4 text-muted-foreground" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Bergabung</p>
                    <p className="text-[13px] font-medium text-foreground">
                      {format(new Date(customer.createdAt), "d MMMM yyyy", { locale: localeId })}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Danger Zone */}
          <CustomerActions userId={customer.id} userName={customer.name || 'Pelanggan'} />

          {/* Linked Accounts */}
          <div className="bg-white rounded-3xl border border-border/40 shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-6">
            <div className="flex items-center gap-2 mb-6">
              <Link2 className="w-5 h-5 text-brand-600" />
              <h3 className="font-bold text-foreground">Akun Terhubung</h3>
            </div>
            
            <div className="space-y-3">
              {customer.accounts.length === 0 ? (
                <div className="text-center py-6 text-muted-foreground border-2 border-dashed border-border/40 rounded-2xl">
                  <p className="text-sm">Tidak ada akun sosial terhubung</p>
                </div>
              ) : (
                customer.accounts.map((acc) => (
                  <div key={acc.id} className="flex items-center justify-between p-4 rounded-2xl border border-border/30 bg-muted/20">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center shadow-sm capitalize font-bold text-xs">
                        {acc.provider[0]}
                      </div>
                      <div>
                        <p className="text-sm font-bold capitalize text-foreground">{acc.provider}</p>
                        <p className="text-[11px] text-muted-foreground">ID: {acc.providerAccountId.slice(0, 10)}...</p>
                      </div>
                    </div>
                    <div className="px-2 py-1 rounded-md bg-green-50 text-green-600 text-[10px] font-bold">TERKONEKSI</div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Activities, Vouchers, Orders */}
        <div className="lg:col-span-2 space-y-6">
          {/* Riwayat Login & Aktivitas */}
          <div className="bg-white rounded-3xl border border-border/40 shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-6">
            <div className="flex items-center gap-2 mb-6">
              <History className="w-5 h-5 text-brand-600" />
              <h3 className="font-bold text-foreground">Riwayat Login & Aktivitas</h3>
            </div>

            <div className="overflow-x-auto -mx-6 px-6">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border/30">
                    <th className="pb-3 text-left text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Aktivitas</th>
                    <th className="pb-3 text-left text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Detail</th>
                    <th className="pb-3 text-right text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Waktu</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/20">
                  {customer.activityLogs.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="py-10 text-center text-muted-foreground">Belum ada riwayat aktivitas</td>
                    </tr>
                  ) : (
                    customer.activityLogs.map((log) => (
                      <tr key={log.id} className="group">
                        <td className="py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-brand-50 flex items-center justify-center">
                              <Clock className="w-4 h-4 text-brand-600" />
                            </div>
                            <span className="font-bold text-foreground capitalize">{log.action}</span>
                          </div>
                        </td>
                        <td className="py-4 text-muted-foreground">
                          {log.details || 'Berhasil masuk ke sistem'}
                        </td>
                        <td className="py-4 text-right text-xs text-muted-foreground">
                          {format(new Date(log.createdAt), "d MMM, HH:mm", { locale: localeId })}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Penggunaan Voucher */}
          <div className="bg-white rounded-3xl border border-border/40 shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <Ticket className="w-5 h-5 text-brand-600" />
                <h3 className="font-bold text-foreground">Voucher & Hadiah</h3>
              </div>
              <span className="text-[11px] font-bold text-muted-foreground px-2 py-0.5 rounded-full bg-muted">
                {customer.vouchers.length} Total
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {customer.vouchers.length === 0 ? (
                <div className="col-span-full text-center py-10 text-muted-foreground border-2 border-dashed border-border/40 rounded-2xl">
                  Belum memiliki voucher
                </div>
              ) : (
                customer.vouchers.map((voucher) => (
                  <div key={voucher.id} className={`p-4 rounded-2xl border-2 ${voucher.isUsed ? 'border-border/30 bg-muted/10 grayscale' : 'border-brand-100 bg-brand-50/30'}`}>
                    <div className="flex justify-between items-start mb-3">
                      <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center shadow-sm">
                        <Ticket className={`w-5 h-5 ${voucher.isUsed ? 'text-muted-foreground' : 'text-brand-600'}`} />
                      </div>
                      {voucher.isUsed ? (
                        <span className="px-2 py-1 rounded-md bg-gray-200 text-gray-600 text-[9px] font-black uppercase">Sudah Dipakai</span>
                      ) : (
                        <span className="px-2 py-1 rounded-md bg-brand-600 text-white text-[9px] font-black uppercase shadow-sm">Tersedia</span>
                      )}
                    </div>
                    <p className="font-bold text-foreground text-sm mb-1">{voucher.description}</p>
                    <p className="text-[11px] text-muted-foreground mb-3 font-mono">CODE: {voucher.code}</p>
                    <div className="flex items-center justify-between pt-3 border-t border-border/20 text-[10px] text-muted-foreground font-medium">
                      <span>Didapat: {format(new Date(voucher.createdAt), "d MMM yyyy")}</span>
                      {voucher.usedAt && (
                        <span>Pakai: {format(new Date(voucher.usedAt), "d MMM yyyy")}</span>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Recent Orders */}
          <div className="bg-white rounded-3xl border border-border/40 shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-6">
            <div className="flex items-center gap-2 mb-6">
              <ShoppingBag className="w-5 h-5 text-brand-600" />
              <h3 className="font-bold text-foreground">Pesanan Terakhir</h3>
            </div>

            <div className="space-y-4">
              {customer.orders.length === 0 ? (
                <div className="text-center py-10 text-muted-foreground border-2 border-dashed border-border/40 rounded-2xl">
                  Belum ada riwayat pesanan
                </div>
              ) : (
                customer.orders.map((order) => (
                  <Link 
                    key={order.id} 
                    href={`/admin/orders/${order.id}`}
                    className="flex items-center justify-between p-4 rounded-2xl border border-border/30 hover:border-brand-200 hover:bg-brand-50/20 transition-all group"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl bg-muted/40 flex flex-col items-center justify-center group-hover:bg-brand-100/50 transition-colors">
                        <span className="text-[10px] font-bold text-muted-foreground uppercase">{format(new Date(order.createdAt), "MMM")}</span>
                        <span className="text-lg font-black text-foreground leading-none">{format(new Date(order.createdAt), "dd")}</span>
                      </div>
                      <div>
                        <p className="text-sm font-bold text-foreground">#{order.id.slice(-6).toUpperCase()}</p>
                        <p className="text-xs text-muted-foreground">{order._count.items} Items • {order.paymentMethod}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-black text-foreground">Rp {order.total.toLocaleString('id-ID')}</p>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        order.status === 'COMPLETED' ? 'bg-green-100 text-green-700' : 
                        order.status === 'CANCELLED' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'
                      }`}>
                        {order.status}
                      </span>
                    </div>
                  </Link>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
