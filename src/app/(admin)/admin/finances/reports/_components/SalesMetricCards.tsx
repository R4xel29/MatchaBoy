'use client';

import { DollarSign, Coins, TrendingUp, ShoppingCart } from 'lucide-react';
import { formatRupiah } from '@/lib/utils';
import { SalesSummary } from './types';

interface Props {
  summary: SalesSummary;
}

export function SalesMetricCards({ summary }: Props) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
      <div className="bg-white rounded-3xl border border-slate-150/80 p-4 sm:p-5 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100">
            <DollarSign className="w-5 h-5" />
          </div>
          <div>
            <p className="text-base sm:text-lg font-black text-slate-900">{formatRupiah(summary.totalRevenue)}</p>
            <p className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider">Total Omset</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-slate-150/80 p-4 sm:p-5 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center border border-amber-100">
            <Coins className="w-5 h-5" />
          </div>
          <div>
            <p className="text-base sm:text-lg font-black text-slate-900">{formatRupiah(summary.totalCogs)}</p>
            <p className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider">HPP (Modal Bahan)</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-slate-150/80 p-4 sm:p-5 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-orange-50 text-orange-600 flex items-center justify-center border border-orange-100">
            <TrendingUp className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <p className="text-base sm:text-lg font-black text-orange-600">{formatRupiah(summary.totalGrossProfit)}</p>
              <span className="text-[10px] font-extrabold px-1.5 py-0.5 rounded-sm bg-orange-100 text-orange-700">
                {summary.grossProfitMargin}%
              </span>
            </div>
            <p className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider">Laba Kotor (Gross)</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-slate-150/80 p-4 sm:p-5 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100">
            <ShoppingCart className="w-5 h-5" />
          </div>
          <div>
            <p className="text-base sm:text-lg font-black text-slate-900">{summary.orderCount} Transaksi</p>
            <p className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider">
              Avg: {formatRupiah(summary.avgOrderValue)}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
