'use client';

import { DollarSign, ShoppingBag, Percent, Users, Sparkles, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { formatRupiah } from '@/lib/utils';
import { Range, RANGE_LABELS } from './types';

interface Props {
  kpis: {
    totalRevenue: number;
    totalOrders: number;
    avgOrderValue: number;
    totalCustomers: number;
    completedCount: number;
    revenueGrowth: number;
    ordersGrowth: number;
    aovGrowth: number;
  };
  range: Range;
}

export function AnalyticsKpiCards({ kpis, range }: Props) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* Total Pendapatan */}
      <div className="bg-white border border-slate-100 rounded-3xl p-5 shadow-xs space-y-3 relative overflow-hidden group hover:border-orange-300 hover:shadow-md transition-all duration-300">
        <div className="flex justify-between items-start">
          <div className="w-10 h-10 rounded-2xl bg-orange-50 border border-orange-100 flex items-center justify-center text-orange-600 shadow-xs">
            <DollarSign className="w-5 h-5" />
          </div>
          {range !== 'all' && (
            <span className={`flex items-center gap-1 text-[10px] font-extrabold px-2.5 py-1 rounded-full leading-none border ${
              kpis.revenueGrowth >= 0 
                ? 'text-emerald-700 bg-emerald-50 border-emerald-200' 
                : 'text-rose-700 bg-rose-50 border-rose-200'
            }`}>
              {kpis.revenueGrowth >= 0 ? <ArrowUpRight className="w-3 h-3 stroke-[2.5]" /> : <ArrowDownRight className="w-3 h-3 stroke-[2.5]" />}
              {Math.abs(kpis.revenueGrowth)}%
            </span>
          )}
        </div>
        <div>
          <span className="text-[11px] font-bold uppercase text-slate-400 tracking-wider">Total Pendapatan</span>
          <h3 className="text-2xl font-black text-slate-900 mt-1 tracking-tight">
            {formatRupiah(kpis.totalRevenue)}
          </h3>
          <p className="text-[11px] text-slate-500 font-medium mt-1 flex items-center gap-1">
            <span>{kpis.completedCount} pesanan selesai</span>
            <span className="text-slate-300">•</span>
            <span className="text-slate-400">{RANGE_LABELS[range].periodText}</span>
          </p>
        </div>
      </div>

      {/* Volume Pesanan */}
      <div className="bg-white border border-slate-100 rounded-3xl p-5 shadow-xs space-y-3 relative overflow-hidden group hover:border-amber-300 hover:shadow-md transition-all duration-300">
        <div className="flex justify-between items-start">
          <div className="w-10 h-10 rounded-2xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600 shadow-xs">
            <ShoppingBag className="w-5 h-5" />
          </div>
          {range !== 'all' && (
            <span className={`flex items-center gap-1 text-[10px] font-extrabold px-2.5 py-1 rounded-full leading-none border ${
              kpis.ordersGrowth >= 0 
                ? 'text-emerald-700 bg-emerald-50 border-emerald-200' 
                : 'text-rose-700 bg-rose-50 border-rose-200'
            }`}>
              {kpis.ordersGrowth >= 0 ? <ArrowUpRight className="w-3 h-3 stroke-[2.5]" /> : <ArrowDownRight className="w-3 h-3 stroke-[2.5]" />}
              {Math.abs(kpis.ordersGrowth)}%
            </span>
          )}
        </div>
        <div>
          <span className="text-[11px] font-bold uppercase text-slate-400 tracking-wider">Volume Transaksi</span>
          <h3 className="text-2xl font-black text-slate-900 mt-1 tracking-tight">
            {kpis.totalOrders} <span className="text-sm font-semibold text-slate-400">Order</span>
          </h3>
          <p className="text-[11px] text-slate-500 font-medium mt-1 flex items-center gap-1">
            <span>{kpis.completedCount} sukses</span>
            <span className="text-slate-300">•</span>
            <span className="text-slate-400">{RANGE_LABELS[range].periodText}</span>
          </p>
        </div>
      </div>

      {/* Rata-rata Transaksi (AOV) */}
      <div className="bg-white border border-slate-100 rounded-3xl p-5 shadow-xs space-y-3 relative overflow-hidden group hover:border-orange-300 hover:shadow-md transition-all duration-300">
        <div className="flex justify-between items-start">
          <div className="w-10 h-10 rounded-2xl bg-orange-50 border border-orange-100 flex items-center justify-center text-orange-600 shadow-xs">
            <Percent className="w-5 h-5" />
          </div>
          {range !== 'all' && (
            <span className={`flex items-center gap-1 text-[10px] font-extrabold px-2.5 py-1 rounded-full leading-none border ${
              kpis.aovGrowth >= 0 
                ? 'text-emerald-700 bg-emerald-50 border-emerald-200' 
                : 'text-rose-700 bg-rose-50 border-rose-200'
            }`}>
              {kpis.aovGrowth >= 0 ? <ArrowUpRight className="w-3 h-3 stroke-[2.5]" /> : <ArrowDownRight className="w-3 h-3 stroke-[2.5]" />}
              {Math.abs(kpis.aovGrowth)}%
            </span>
          )}
        </div>
        <div>
          <span className="text-[11px] font-bold uppercase text-slate-400 tracking-wider">Rata-Rata Order (AOV)</span>
          <h3 className="text-2xl font-black text-slate-900 mt-1 tracking-tight">
            {formatRupiah(kpis.avgOrderValue)}
          </h3>
          <p className="text-[11px] text-slate-500 font-medium mt-1">
            Rerata nominal belanja per pelanggan
          </p>
        </div>
      </div>

      {/* Total Pelanggan */}
      <div className="bg-white border border-slate-100 rounded-3xl p-5 shadow-xs space-y-3 relative overflow-hidden group hover:border-amber-300 hover:shadow-md transition-all duration-300">
        <div className="flex justify-between items-start">
          <div className="w-10 h-10 rounded-2xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600 shadow-xs">
            <Users className="w-5 h-5" />
          </div>
          <span className="flex items-center gap-1 text-[10px] font-extrabold px-2.5 py-1 rounded-full leading-none bg-orange-50 text-orange-700 border border-orange-200">
            <Sparkles className="w-3 h-3" /> Member
          </span>
        </div>
        <div>
          <span className="text-[11px] font-bold uppercase text-slate-400 tracking-wider">Pelanggan Terdaftar</span>
          <h3 className="text-2xl font-black text-slate-900 mt-1 tracking-tight">
            {kpis.totalCustomers} <span className="text-sm font-semibold text-slate-400">User</span>
          </h3>
          <p className="text-[11px] text-slate-500 font-medium mt-1">
            Customer di database Arum Seduh
          </p>
        </div>
      </div>
    </div>
  );
}
