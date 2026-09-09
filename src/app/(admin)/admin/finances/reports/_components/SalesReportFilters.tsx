'use client';

import { Filter, Calendar, Search } from 'lucide-react';

interface Props {
  dateRange: 'today' | 'week' | 'month' | 'custom';
  setDateRange: (range: 'today' | 'week' | 'month' | 'custom') => void;
  startDate: string;
  setStartDate: (date: string) => void;
  endDate: string;
  setEndDate: (date: string) => void;
  search: string;
  setSearch: (search: string) => void;
  typeFilter: string;
  setTypeFilter: (type: string) => void;
  sourceFilter: string;
  setSourceFilter: (source: string) => void;
}

export function SalesReportFilters({
  dateRange,
  setDateRange,
  startDate,
  setStartDate,
  endDate,
  setEndDate,
  search,
  setSearch,
  typeFilter,
  setTypeFilter,
  sourceFilter,
  setSourceFilter,
}: Props) {
  return (
    <div className="bg-white rounded-3xl border border-slate-150/80 p-4 sm:p-5 shadow-xs space-y-3">
      <div className="flex items-center gap-2 mb-1">
        <Filter className="w-4 h-4 text-slate-400" />
        <p className="text-xs font-extrabold text-slate-500 uppercase tracking-wider">Filter Periode & Sumber</p>
      </div>

      {/* Date range quick selectors */}
      <div className="flex gap-2 flex-wrap text-xs font-bold">
        {(['today', 'week', 'month', 'custom'] as const).map((r) => (
          <button
            key={r}
            onClick={() => setDateRange(r)}
            className={`px-3.5 py-1.5 rounded-xl transition-all cursor-pointer ${
              dateRange === r
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            {r === 'today' ? 'Hari Ini' : r === 'week' ? '7 Hari Terakhir' : r === 'month' ? 'Bulan Ini' : 'Kustom Tanggal'}
          </button>
        ))}
      </div>

      {/* Custom date inputs */}
      {dateRange === 'custom' && (
        <div className="flex gap-3 items-center pt-1">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-slate-400" />
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="px-3 py-2 text-xs font-bold bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/20"
            />
          </div>
          <span className="text-xs text-slate-400 font-bold">s/d</span>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="px-3 py-2 text-xs font-bold bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/20"
          />
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-3 pt-1">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Cari nama pelanggan, no telp, atau ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:bg-white transition-all"
          />
        </div>
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="px-3 py-2.5 text-xs sm:text-sm font-semibold bg-slate-50 border border-slate-200 rounded-2xl"
        >
          <option value="ALL">Semua Tipe Pesanan</option>
          <option value="PICKUP">Pickup</option>
          <option value="DINE_IN">Dine In</option>
          <option value="DELIVERY">Delivery</option>
        </select>
        <select
          value={sourceFilter}
          onChange={(e) => setSourceFilter(e.target.value)}
          className="px-3 py-2.5 text-xs sm:text-sm font-semibold bg-slate-50 border border-slate-200 rounded-2xl"
        >
          <option value="ALL">Semua Sumber Pesanan</option>
          <option value="POS">Kasir (POS)</option>
          <option value="SPMB">Online / SPMB</option>
        </select>
      </div>
    </div>
  );
}
