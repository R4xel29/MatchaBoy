'use client';

import { Coins, ArrowDownRight, ArrowUpRight, Banknote, QrCode } from 'lucide-react';
import { formatRupiah } from '@/lib/utils';
import { Pagination } from '@/components/ui/Pagination';
import { LedgerTransaction } from './types';

interface Props {
  ledger: LedgerTransaction[];
  currentPage?: number;
  pageSize?: number;
  totalItems?: number;
  pageSizeOptions?: number[];
  onPageChange?: (page: number) => void;
  onPageSizeChange?: (pageSize: number) => void;
}

export function MutasiTable({
  ledger,
  currentPage = 1,
  pageSize = 20,
  totalItems,
  pageSizeOptions,
  onPageChange,
  onPageSizeChange,
}: Props) {
  const totalPages = totalItems !== undefined ? Math.ceil(totalItems / pageSize) || 1 : 1;
  return (
    <div className="bg-white border border-slate-150/80 rounded-3xl shadow-xs overflow-hidden overflow-x-auto">
      <table className="w-full text-sm text-left">
        <thead>
          <tr className="border-b border-slate-150 bg-slate-50/80 text-[11px] font-extrabold text-slate-500 uppercase tracking-wider">
            <th className="px-5 py-3.5">Tanggal & Waktu</th>
            <th className="px-5 py-3.5">Jenis Transaksi</th>
            <th className="px-5 py-3.5">Keterangan / Detail</th>
            <th className="px-5 py-3.5">Metode</th>
            <th className="px-5 py-3.5 text-right">Uang Masuk</th>
            <th className="px-5 py-3.5 text-right">Uang Keluar</th>
            <th className="px-5 py-3.5 text-right">Saldo Berjalan</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {ledger.length === 0 ? (
            <tr>
              <td colSpan={7} className="py-12 text-center text-slate-400">
                <Coins className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <p className="text-xs font-bold text-slate-600">Tidak ada transaksi ditemukan</p>
                <p className="text-[11px] text-slate-400 mt-0.5">Coba ubah filter atau rentang tanggal.</p>
              </td>
            </tr>
          ) : (
            ledger.map((item) => {
              const isIncome = item.inflow > 0;
              const isOutflow = item.outflow > 0;

              return (
                <tr key={item.id} className="hover:bg-slate-50/70 transition-colors">
                  {/* 1. Date & Time */}
                  <td className="px-5 py-3.5 text-xs text-slate-500 font-medium whitespace-nowrap">
                    {new Date(item.date).toLocaleString('id-ID', {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </td>

                  {/* 2. Type Badge */}
                  <td className="px-5 py-3.5 whitespace-nowrap">
                    {item.type === 'ORDER_INCOME' && (
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-50 text-emerald-700 border border-emerald-200 inline-flex items-center gap-1">
                        <ArrowDownRight className="w-3 h-3 text-emerald-600" /> Penjualan Menu
                      </span>
                    )}
                    {item.type === 'CAPITAL_INJECTION' && (
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-blue-50 text-blue-700 border border-blue-200 inline-flex items-center gap-1">
                        <Coins className="w-3 h-3 text-blue-600" /> Suntik Modal
                      </span>
                    )}
                    {item.type === 'CAPITAL_WITHDRAWAL' && (
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-50 text-amber-700 border border-amber-200 inline-flex items-center gap-1">
                        <ArrowUpRight className="w-3 h-3 text-amber-600" /> Tarik Modal
                      </span>
                    )}
                    {item.type === 'EXPENSE' && (
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-rose-50 text-rose-700 border border-rose-200 inline-flex items-center gap-1">
                        <ArrowUpRight className="w-3 h-3 text-rose-600" /> Pengeluaran
                      </span>
                    )}
                  </td>

                  {/* 3. Description & Category */}
                  <td className="px-5 py-3.5">
                    <div className="flex flex-col">
                      <span className="font-bold text-slate-900 text-xs sm:text-sm">
                        {item.title}
                      </span>
                      <span className="text-[11px] text-slate-400">
                        {item.category} {item.notes && `• ${item.notes}`}
                      </span>
                    </div>
                  </td>

                  {/* 4. Payment Method */}
                  <td className="px-5 py-3.5 whitespace-nowrap">
                    {item.paymentMethod === 'CASH' ? (
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-amber-50 text-amber-800 border border-amber-200 inline-flex items-center gap-1">
                        <Banknote className="w-3 h-3 text-amber-600" /> Tunai (Cash)
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-sky-50 text-sky-800 border border-sky-200 inline-flex items-center gap-1">
                        <QrCode className="w-3 h-3 text-sky-600" /> QRIS Bank
                      </span>
                    )}
                  </td>

                  {/* 5. Inflow */}
                  <td className="px-5 py-3.5 text-right font-extrabold text-xs whitespace-nowrap">
                    {isIncome ? (
                      <span className="text-emerald-600 font-black">
                        + {formatRupiah(item.inflow)}
                      </span>
                    ) : (
                      <span className="text-slate-300">-</span>
                    )}
                  </td>

                  {/* 6. Outflow */}
                  <td className="px-5 py-3.5 text-right font-extrabold text-xs whitespace-nowrap">
                    {isOutflow ? (
                      <span className="text-rose-600 font-black">
                        - {formatRupiah(item.outflow)}
                      </span>
                    ) : (
                      <span className="text-slate-300">-</span>
                    )}
                  </td>

                  {/* 7. Running Balance */}
                  <td className="px-5 py-3.5 text-right font-black text-xs text-slate-900 whitespace-nowrap">
                    {formatRupiah(item.runningTotalBalance || 0)}
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>

      {totalItems !== undefined && onPageChange && (
        <div className="p-4 border-t border-slate-150 bg-slate-50/50">
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={totalItems}
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
