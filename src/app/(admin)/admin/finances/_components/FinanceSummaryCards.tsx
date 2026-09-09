'use client';

import { Banknote, QrCode, Coins, TrendingUp } from 'lucide-react';
import { formatRupiah } from '@/lib/utils';
import { FinanceSummary } from './types';

interface Props {
  summary: FinanceSummary;
}

export function FinanceSummaryCards({ summary }: Props) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
      {/* 1. Uang Cash Saat Ini */}
      <div className="bg-white border border-slate-150/80 rounded-3xl p-5 shadow-xs space-y-2 hover:border-amber-300 transition-all">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-extrabold text-amber-800 uppercase tracking-wider flex items-center gap-1.5">
            <Banknote className="w-4 h-4 text-amber-600" />
            Uang Cash Saat Ini
          </span>
          <span className="text-[10px] font-extrabold px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-200">
            Fisik / Laci
          </span>
        </div>
        <p className="text-3xl font-black text-slate-900 tracking-tight">
          {formatRupiah(summary.currentCash)}
        </p>
        <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500 font-medium">
          <span>Masuk: <strong className="text-emerald-600">{formatRupiah(summary.totalCashInflow)}</strong></span>
          <span>Keluar: <strong className="text-rose-600">{formatRupiah(summary.totalCashOutflow)}</strong></span>
        </div>
      </div>

      {/* 2. Uang QRIS Saat Ini */}
      <div className="bg-white border border-slate-150/80 rounded-3xl p-5 shadow-xs space-y-2 hover:border-sky-300 transition-all">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-extrabold text-sky-800 uppercase tracking-wider flex items-center gap-1.5">
            <QrCode className="w-4 h-4 text-sky-600" />
            Uang QRIS Saat Ini
          </span>
          <span className="text-[10px] font-extrabold px-2.5 py-0.5 rounded-full bg-sky-100 text-sky-900 border border-sky-200">
            Rekening Bank
          </span>
        </div>
        <p className="text-3xl font-black text-slate-900 tracking-tight">
          {formatRupiah(summary.currentQris)}
        </p>
        <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500 font-medium">
          <span>Masuk: <strong className="text-emerald-600">{formatRupiah(summary.totalQrisInflow)}</strong></span>
          <span>Beban: <strong className="text-rose-600">{formatRupiah(summary.totalQrisOutflow)}</strong></span>
        </div>
      </div>

      {/* 3. Total Uang Masuk Selama Ini (Bruto) */}
      <div className="bg-white border border-slate-150/80 rounded-3xl p-5 shadow-xs space-y-2 hover:border-indigo-300 transition-all">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-extrabold text-indigo-800 uppercase tracking-wider flex items-center gap-1.5">
            <Coins className="w-4 h-4 text-indigo-600" />
            Total Uang Masuk
          </span>
          <span className="text-[10px] font-extrabold px-2.5 py-0.5 rounded-full bg-indigo-100 text-indigo-900 border border-indigo-200">
            Bruto (Gross)
          </span>
        </div>
        <p className="text-3xl font-black text-slate-900 tracking-tight">
          {formatRupiah(summary.grossTotalMoney)}
        </p>
        <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500 font-medium">
          <span>Beban Keluar: <strong className="text-rose-600">{formatRupiah(summary.totalExpensesSum)}</strong></span>
        </div>
      </div>

      {/* 4. Total Sisa Uang Bersih Toko */}
      <div className="bg-gradient-to-br from-orange-500 to-amber-500 text-white rounded-3xl p-5 shadow-md shadow-orange-500/20 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-extrabold text-white uppercase tracking-wider flex items-center gap-1.5">
            <TrendingUp className="w-4 h-4 text-orange-100" />
            Total Sisa Uang Bersih
          </span>
          <span className="text-[10px] font-black px-2.5 py-0.5 rounded-full bg-white/20 text-white">
            Dana Riil
          </span>
        </div>
        <p className="text-3xl font-black text-white tracking-tight">
          {formatRupiah(summary.netTotalMoney)}
        </p>
        <p className="text-[11px] text-orange-100 font-semibold pt-2 border-t border-white/20">
          Cash ({formatRupiah(summary.currentCash)}) + QRIS ({formatRupiah(summary.currentQris)})
        </p>
      </div>
    </div>
  );
}
