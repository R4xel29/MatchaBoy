'use client';

import { Search, Printer, Banknote, QrCode, ArrowDownRight, Coins, ArrowUpRight } from 'lucide-react';
import { RangeType } from './types';

interface Props {
  search: string;
  onSearchChange: (value: string) => void;
  range: RangeType;
  onRangeChange: (range: RangeType) => void;
  methodFilter: 'ALL' | 'CASH' | 'QRIS';
  onMethodFilterChange: (method: 'ALL' | 'CASH' | 'QRIS') => void;
  typeFilter: 'ALL' | 'INCOME' | 'CAPITAL' | 'EXPENSE';
  onTypeFilterChange: (type: 'ALL' | 'INCOME' | 'CAPITAL' | 'EXPENSE') => void;
  onPrintLedger: () => void;
}

export function FinanceFilters({
  search,
  onSearchChange,
  range,
  onRangeChange,
  methodFilter,
  onMethodFilterChange,
  typeFilter,
  onTypeFilterChange,
  onPrintLedger,
}: Props) {
  return (
    <div className="bg-white rounded-3xl p-4 border border-slate-150/80 shadow-xs space-y-3">
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
        {/* Search input */}
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Cari transaksi, order, atau catatan..."
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
          />
        </div>

        {/* Range Selector */}
        <div className="flex items-center gap-1.5 flex-wrap w-full sm:w-auto justify-end">
          {(['all', 'today', 'week', 'month'] as RangeType[]).map((r) => (
            <button
              key={r}
              onClick={() => onRangeChange(r)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                range === r
                  ? 'bg-orange-500 text-white shadow-xs font-extrabold'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {r === 'all'
                ? 'Semua Waktu'
                : r === 'today'
                ? 'Hari Ini'
                : r === 'week'
                ? '7 Hari'
                : 'Bulan Ini'}
            </button>
          ))}

          <button
            onClick={onPrintLedger}
            className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 border border-slate-200 transition-colors cursor-pointer"
            title="Cetak Buku Kas"
          >
            <Printer className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Sub Filters (Method & Type) - Lucide Icons Compliant */}
      <div className="flex items-center gap-3 flex-wrap pt-2 border-t border-slate-100 text-xs">
        {/* Payment Method Pills */}
        <div className="flex items-center gap-1">
          <span className="text-slate-400 font-bold mr-1">Metode:</span>
          {(['ALL', 'CASH', 'QRIS'] as const).map((m) => (
            <button
              key={m}
              onClick={() => onMethodFilterChange(m)}
              className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                methodFilter === m
                  ? 'bg-slate-800 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {m === 'ALL' && <span>Semua Metode</span>}
              {m === 'CASH' && (
                <>
                  <Banknote className="w-3.5 h-3.5 text-amber-500" />
                  <span>Tunai (Cash)</span>
                </>
              )}
              {m === 'QRIS' && (
                <>
                  <QrCode className="w-3.5 h-3.5 text-sky-400" />
                  <span>QRIS</span>
                </>
              )}
            </button>
          ))}
        </div>

        {/* Type Pills */}
        <div className="flex items-center gap-1">
          <span className="text-slate-400 font-bold mr-1">Jenis:</span>
          {(['ALL', 'INCOME', 'CAPITAL', 'EXPENSE'] as const).map((t) => (
            <button
              key={t}
              onClick={() => onTypeFilterChange(t)}
              className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                typeFilter === t
                  ? 'bg-slate-800 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {t === 'ALL' && <span>Semua Jenis</span>}
              {t === 'INCOME' && (
                <>
                  <ArrowDownRight className="w-3.5 h-3.5 text-emerald-500" />
                  <span>Penjualan</span>
                </>
              )}
              {t === 'CAPITAL' && (
                <>
                  <Coins className="w-3.5 h-3.5 text-blue-400" />
                  <span>Suntik Modal</span>
                </>
              )}
              {t === 'EXPENSE' && (
                <>
                  <ArrowUpRight className="w-3.5 h-3.5 text-rose-400" />
                  <span>Pengeluaran</span>
                </>
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
