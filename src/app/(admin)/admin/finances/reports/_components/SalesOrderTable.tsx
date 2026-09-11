'use client';

import { Loader2, Package } from 'lucide-react';
import { formatRupiah } from '@/lib/utils';
import { Pagination } from '@/components/ui/Pagination';
import { OrderReport } from './types';

interface Props {
  orders: OrderReport[];
  loading: boolean;
  currentPage?: number;
  pageSize?: number;
  pageSizeOptions?: number[];
  onPageChange?: (page: number) => void;
  onPageSizeChange?: (pageSize: number) => void;
}

export function SalesOrderTable({
  orders,
  loading,
  currentPage = 1,
  pageSize = 20,
  pageSizeOptions,
  onPageChange,
  onPageSizeChange,
}: Props) {
  const totalPages = Math.ceil(orders.length / pageSize) || 1;
  const paginatedOrders = onPageChange
    ? orders.slice((currentPage - 1) * pageSize, currentPage * pageSize)
    : orders;
  if (loading) {
    return (
      <div className="bg-white rounded-3xl border border-slate-150/80 shadow-xs flex items-center justify-center py-16">
        <Loader2 className="w-6 h-6 animate-spin text-orange-600" />
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div className="bg-white rounded-3xl border border-slate-150/80 shadow-xs py-16 text-center text-slate-400">
        <Package className="w-10 h-10 mx-auto mb-2 opacity-30" />
        <p className="text-xs font-bold">Tidak ada data pesanan untuk periode ini</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-3xl border border-slate-150/80 shadow-xs overflow-hidden overflow-x-auto">
      <table className="w-full text-sm text-left">
        <thead>
          <tr className="border-b border-slate-150 bg-slate-50/70">
            <th className="px-4 py-3.5 text-[10px] font-extrabold uppercase tracking-wider text-slate-500">ID</th>
            <th className="px-4 py-3.5 text-[10px] font-extrabold uppercase tracking-wider text-slate-500">Tanggal</th>
            <th className="px-4 py-3.5 text-[10px] font-extrabold uppercase tracking-wider text-slate-500">Pelanggan</th>
            <th className="px-4 py-3.5 text-[10px] font-extrabold uppercase tracking-wider text-slate-500">Tipe</th>
            <th className="px-4 py-3.5 text-[10px] font-extrabold uppercase tracking-wider text-slate-500">Bayar</th>
            <th className="px-4 py-3.5 text-[10px] font-extrabold uppercase tracking-wider text-slate-500">Items</th>
            <th className="px-4 py-3.5 text-right text-[10px] font-extrabold uppercase tracking-wider text-slate-500">Omset</th>
            <th className="px-4 py-3.5 text-right text-[10px] font-extrabold uppercase tracking-wider text-slate-500">HPP Bahan</th>
            <th className="px-4 py-3.5 text-right text-[10px] font-extrabold uppercase tracking-wider text-slate-500">Laba Kotor</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {paginatedOrders.map((order) => (
            <tr key={order.id} className="hover:bg-slate-50/70 transition-colors">
              <td className="px-4 py-3 font-mono text-xs font-bold text-orange-700">#{order.id.slice(0, 8).toUpperCase()}</td>
              <td className="px-4 py-3 text-xs text-slate-500 whitespace-nowrap">
                {new Date(order.createdAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}
                <br />
                <span className="text-[10px] text-slate-400">{new Date(order.createdAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</span>
              </td>
              <td className="px-4 py-3">
                <p className="text-xs font-bold text-slate-900">{order.customerName}</p>
                <p className="text-[10px] text-slate-400">{order.customerPhone}</p>
              </td>
              <td className="px-4 py-3 whitespace-nowrap">
                <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase ${
                  order.orderType === 'PICKUP' ? 'bg-purple-50 text-purple-700' :
                  order.orderType === 'DINE_IN' ? 'bg-amber-50 text-amber-700' : 'bg-sky-50 text-sky-700'
                }`}>
                  {order.orderType}
                </span>
              </td>
              <td className="px-4 py-3 text-xs text-slate-500 font-semibold">{order.paymentMethod}</td>
              <td className="px-4 py-3 text-xs text-slate-600 max-w-[200px] truncate">
                {order.items.map(i => `${i.qty}× ${i.productName}`).join(', ')}
              </td>
              <td className="px-4 py-3 text-right font-black text-xs text-slate-900">{formatRupiah(order.total)}</td>
              <td className="px-4 py-3 text-right font-bold text-xs text-slate-500">{formatRupiah(order.cogs || 0)}</td>
              <td className="px-4 py-3 text-right font-black text-xs text-emerald-600">{formatRupiah(order.grossProfit || 0)}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="bg-slate-50 border-t border-slate-200">
            <td colSpan={6} className="px-4 py-3 text-xs font-extrabold text-slate-600 uppercase">
              TOTAL ({orders.length} transaksi)
            </td>
            <td className="px-4 py-3 text-right font-black text-sm text-slate-900">
              {formatRupiah(orders.reduce((s, o) => s + o.total, 0))}
            </td>
            <td className="px-4 py-3 text-right font-bold text-xs text-slate-600">
              {formatRupiah(orders.reduce((s, o) => s + (o.cogs || 0), 0))}
            </td>
            <td className="px-4 py-3 text-right font-black text-sm text-emerald-600">
              {formatRupiah(orders.reduce((s, o) => s + (o.grossProfit || 0), 0))}
            </td>
          </tr>
        </tfoot>
      </table>

      {orders.length > 0 && onPageChange && (
        <div className="p-4 border-t border-slate-150 bg-slate-50/50">
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={orders.length}
            pageSize={pageSize}
            pageSizeOptions={pageSizeOptions}
            onPageSizeChange={onPageSizeChange}
            onPageChange={onPageChange}
          />
        </div>
      )}
    </div>
  );
}
