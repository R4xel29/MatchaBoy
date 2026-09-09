'use client';

import { Banknote, QrCode, Receipt, TrendingUp } from 'lucide-react';
import { formatRupiah } from '@/lib/utils';
import { BalanceInfo } from './types';

interface Props {
  balanceInfo?: BalanceInfo;
  totalExpenses: number;
  totalAmountSum: number;
}

export function ExpenseBalanceCards({
  balanceInfo,
  totalExpenses,
  totalAmountSum,
}: Props) {
  if (!balanceInfo) return null;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 mb-6">
      {/* 1. Uang Cash Saat Ini */}
      <div className="bg-white border border-slate-150/80 rounded-3xl p-4 shadow-xs space-y-1.5">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-extrabold text-amber-800 uppercase tracking-wider flex items-center gap-1.5">
            <Banknote className="w-4 h-4 text-amber-600" />
            Uang Cash Saat Ini
          </span>
          <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-md bg-amber-100 text-amber-900 border border-amber-200">
            Fisik / Laci
          </span>
        </div>
        <p className="text-2xl font-black text-slate-900 tracking-tight">
          {formatRupiah(balanceInfo.currentCash)}
        </p>
        <p className="text-[11px] text-slate-500 font-medium">
          Masuk: {formatRupiah(balanceInfo.cashInflowTotal)} • Beban: {formatRupiah(balanceInfo.allTimeCashExpenses)}
        </p>
      </div>

      {/* 2. Uang QRIS Saat Ini */}
      <div className="bg-white border border-slate-150/80 rounded-3xl p-4 shadow-xs space-y-1.5">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-extrabold text-sky-800 uppercase tracking-wider flex items-center gap-1.5">
            <QrCode className="w-4 h-4 text-sky-600" />
            Uang QRIS Saat Ini
          </span>
          <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-md bg-sky-100 text-sky-900 border border-sky-200">
            Rekening Bank
          </span>
        </div>
        <p className="text-2xl font-black text-slate-900 tracking-tight">
          {formatRupiah(balanceInfo.currentQris)}
        </p>
        <p className="text-[11px] text-slate-500 font-medium">
          Masuk: {formatRupiah(balanceInfo.qrisInflowTotal)} • Beban: {formatRupiah(balanceInfo.allTimeTransferExpenses)}
        </p>
      </div>

      {/* 3. Total Seluruh Pengeluaran */}
      <div className="bg-white border border-slate-150/80 rounded-3xl p-4 shadow-xs space-y-1.5">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-extrabold text-rose-800 uppercase tracking-wider flex items-center gap-1.5">
            <Receipt className="w-4 h-4 text-rose-600" />
            Total Beban Pengeluaran
          </span>
          <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-md bg-rose-100 text-rose-900 border border-rose-200">
            Akumulasi
          </span>
        </div>
        <p className="text-2xl font-black text-rose-600 tracking-tight">
          {formatRupiah(totalAmountSum)}
        </p>
        <p className="text-[11px] text-slate-500 font-medium">
          Total {totalExpenses} transaksi pengeluaran tercatat
        </p>
      </div>

      {/* 4. Total Sisa Uang Bersih */}
      <div className="bg-gradient-to-br from-orange-500 to-amber-500 text-white rounded-3xl p-4 shadow-md shadow-orange-500/20 space-y-1.5">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-extrabold text-white uppercase tracking-wider flex items-center gap-1.5">
            <TrendingUp className="w-4 h-4 text-orange-100" />
            Total Sisa Uang Bersih
          </span>
          <span className="text-[10px] font-black px-2 py-0.5 rounded-md bg-white/20 text-white">
            Kas Riil
          </span>
        </div>
        <p className="text-2xl font-black text-white tracking-tight">
          {formatRupiah(balanceInfo.netTotalMoney)}
        </p>
        <p className="text-[11px] text-orange-100 font-semibold">
          Cash ({formatRupiah(balanceInfo.currentCash)}) + QRIS ({formatRupiah(balanceInfo.currentQris)})
        </p>
      </div>
    </div>
  );
}
