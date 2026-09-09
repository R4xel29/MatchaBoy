'use client';

import { PieChart, CreditCard, Layers, Clock, CupSoda, CheckCircle2, Award, XCircle } from 'lucide-react';
import { formatRupiah } from '@/lib/utils';

interface Props {
  categoryRevenue: Array<{
    name: string;
    value: number;
    count: number;
    percentage: number;
  }>;
  paymentMethods: Array<{
    method: string;
    count: number;
    percentage: number;
  }>;
  orderTypes: Array<{
    type: string;
    count: number;
    percentage: number;
  }>;
  statusDistribution: {
    PENDING: number;
    PREPARING: number;
    READY: number;
    COMPLETED: number;
    CANCELLED: number;
  };
  totalOrders: number;
}

export function DistributionBreakdown({
  categoryRevenue,
  paymentMethods,
  orderTypes,
  statusDistribution,
  totalOrders,
}: Props) {
  const donutColors = ['#f97316', '#f59e0b', '#10b981', '#06b6d4', '#6366f1', '#ec4899'];
  let currentAngle = 0;

  return (
    <>
      {/* Category Breakdown & Payment Methods Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Kategori Terlaris (Donut & Share) */}
        <div className="lg:col-span-6 bg-white border border-slate-150/80 rounded-3xl p-6 shadow-xs flex flex-col justify-between space-y-5">
          <div>
            <h3 className="font-heading font-extrabold text-base text-slate-900 tracking-tight flex items-center gap-2">
              <PieChart className="w-4 h-4 text-amber-600" /> Kontribusi Kategori
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Porsi kontribusi pendapatan per kategori menu
            </p>
          </div>

          {/* Donut Graphic */}
          <div className="flex flex-col items-center justify-center space-y-4">
            <div className="relative w-36 h-36 flex items-center justify-center">
              <svg viewBox="0 0 100 100" className="w-full h-full transform -rotate-90">
                <circle 
                  cx="50" 
                  cy="50" 
                  r="38" 
                  className="stroke-slate-100" 
                  strokeWidth="10" 
                  fill="none" 
                />
                {categoryRevenue.map((cat, idx) => {
                  const percentage = cat.percentage;
                  const strokeDash = `${percentage} ${100 - percentage}`;
                  const strokeOffset = 100 - currentAngle;
                  currentAngle += percentage;

                  return (
                    <circle 
                      key={cat.name}
                      cx="50" 
                      cy="50" 
                      r="38" 
                      stroke={donutColors[idx % donutColors.length]} 
                      strokeWidth="11" 
                      fill="none" 
                      strokeDasharray={strokeDash}
                      strokeDashoffset={strokeOffset}
                      strokeLinecap="round" 
                    />
                  );
                })}
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                <span className="text-[9px] font-bold uppercase text-slate-400 tracking-wider">Top Share</span>
                <span className="text-lg font-black text-orange-600 leading-none">
                  {categoryRevenue[0]?.percentage || 0}%
                </span>
                <span className="text-[10px] text-slate-500 font-semibold truncate max-w-[80px] mt-0.5">
                  {categoryRevenue[0]?.name || '-'}
                </span>
              </div>
            </div>

            {/* Category Breakdown List */}
            <div className="w-full space-y-2 max-h-[160px] overflow-y-auto pr-1">
              {categoryRevenue.length === 0 ? (
                <p className="text-center text-xs text-slate-400 py-3 font-medium">Belum ada data kategori</p>
              ) : (
                categoryRevenue.map((cat, idx) => (
                  <div key={cat.name} className="flex justify-between items-center text-xs p-2 rounded-xl hover:bg-slate-50 transition-colors">
                    <div className="flex items-center gap-2 min-w-0">
                      <div 
                        className="w-2.5 h-2.5 rounded-full shrink-0" 
                        style={{ backgroundColor: donutColors[idx % donutColors.length] }} 
                      />
                      <span className="font-bold text-slate-800 truncate">{cat.name}</span>
                    </div>
                    <div className="text-right flex items-center gap-2 shrink-0">
                      <span className="text-[11px] text-slate-500">{formatRupiah(cat.value)}</span>
                      <span className="font-extrabold text-slate-900 bg-slate-100 px-2 py-0.5 rounded-lg text-[10px]">
                        {cat.percentage}%
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Metode Pembayaran & Tipe Pesanan */}
        <div className="lg:col-span-6 bg-white border border-slate-150/80 rounded-3xl p-6 shadow-xs flex flex-col justify-between space-y-4">
          <div>
            <h3 className="font-heading font-extrabold text-base text-slate-900 tracking-tight flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-amber-600" /> Metode Bayar & Tipe Layanan
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Distribusi cara pembayaran dan channel pemesanan
            </p>
          </div>

          {/* Payment Methods Progress Bars */}
          <div className="space-y-3">
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Metode Pembayaran</p>
            <div className="space-y-2">
              {paymentMethods.map((pm) => (
                <div key={pm.method} className="space-y-1">
                  <div className="flex justify-between text-xs font-bold text-slate-700">
                    <span>{pm.method}</span>
                    <span>{pm.count} transaksi ({pm.percentage}%)</span>
                  </div>
                  <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                    <div 
                      className="bg-gradient-to-r from-orange-500 to-amber-500 h-full rounded-full transition-all duration-500" 
                      style={{ width: `${pm.percentage}%` }} 
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Order Types */}
          <div className="space-y-2 pt-2 border-t border-slate-100">
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Tipe Pesanan (Channel)</p>
            <div className="grid grid-cols-3 gap-2">
              {orderTypes.map((ot) => (
                <div key={ot.type} className="p-3 rounded-2xl bg-slate-50 border border-slate-100 text-center space-y-1">
                  <p className="text-[10px] font-bold uppercase text-slate-400">{ot.type}</p>
                  <p className="text-base font-black text-slate-900">{ot.count}</p>
                  <p className="text-[10px] font-bold text-orange-600">{ot.percentage}%</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Order Status Distribution Pipeline */}
      <div className="bg-white border border-slate-150/80 rounded-3xl p-6 shadow-xs text-left">
        <div className="space-y-0.5 mb-5">
          <h3 className="font-heading font-extrabold text-base text-slate-900 tracking-tight flex items-center gap-2">
            <Layers className="w-4 h-4 text-orange-500" /> Pipeline Status Pesanan
          </h3>
          <p className="text-xs text-slate-500">
            Sebaran kondisi seluruh pesanan yang masuk pada rentang waktu ini
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-3.5">
          {/* Antrean / Pending */}
          <div className="border border-amber-200/80 rounded-2xl p-4 space-y-2 bg-amber-50/40">
            <div className="flex items-center justify-between text-amber-700">
              <span className="text-[10px] font-black uppercase tracking-wider">Antrean</span>
              <Clock className="w-4 h-4" />
            </div>
            <h4 className="text-2xl font-black text-slate-900">{statusDistribution.PENDING}</h4>
            <div className="w-full bg-amber-100 h-1.5 rounded-full overflow-hidden">
              <div className="bg-amber-500 h-full rounded-full" style={{ width: `${Math.min(100, (statusDistribution.PENDING / (totalOrders || 1)) * 100)}%` }} />
            </div>
          </div>

          {/* Diseduh / Preparing */}
          <div className="border border-orange-200/80 rounded-2xl p-4 space-y-2 bg-orange-50/40">
            <div className="flex items-center justify-between text-orange-700">
              <span className="text-[10px] font-black uppercase tracking-wider">Diseduh</span>
              <CupSoda className="w-4 h-4" />
            </div>
            <h4 className="text-2xl font-black text-slate-900">{statusDistribution.PREPARING}</h4>
            <div className="w-full bg-orange-150 h-1.5 rounded-full overflow-hidden">
              <div className="bg-orange-500 h-full rounded-full" style={{ width: `${Math.min(100, (statusDistribution.PREPARING / (totalOrders || 1)) * 100)}%` }} />
            </div>
          </div>

          {/* Siap / Ready */}
          <div className="border border-blue-200/80 rounded-2xl p-4 space-y-2 bg-blue-50/40">
            <div className="flex items-center justify-between text-blue-700">
              <span className="text-[10px] font-black uppercase tracking-wider">Siap Ambil</span>
              <CheckCircle2 className="w-4 h-4" />
            </div>
            <h4 className="text-2xl font-black text-slate-900">{statusDistribution.READY}</h4>
            <div className="w-full bg-blue-100 h-1.5 rounded-full overflow-hidden">
              <div className="bg-blue-500 h-full rounded-full" style={{ width: `${Math.min(100, (statusDistribution.READY / (totalOrders || 1)) * 100)}%` }} />
            </div>
          </div>

          {/* Selesai / Completed */}
          <div className="border border-emerald-200/80 rounded-2xl p-4 space-y-2 bg-emerald-50/40">
            <div className="flex items-center justify-between text-emerald-700">
              <span className="text-[10px] font-black uppercase tracking-wider">Selesai</span>
              <Award className="w-4 h-4" />
            </div>
            <h4 className="text-2xl font-black text-slate-900">{statusDistribution.COMPLETED}</h4>
            <div className="w-full bg-emerald-100 h-1.5 rounded-full overflow-hidden">
              <div className="bg-emerald-500 h-full rounded-full" style={{ width: `${Math.min(100, (statusDistribution.COMPLETED / (totalOrders || 1)) * 100)}%` }} />
            </div>
          </div>

          {/* Dibatalkan / Cancelled */}
          <div className="border border-rose-200/80 rounded-2xl p-4 space-y-2 bg-rose-50/40 col-span-2 md:col-span-1">
            <div className="flex items-center justify-between text-rose-700">
              <span className="text-[10px] font-black uppercase tracking-wider">Batal</span>
              <XCircle className="w-4 h-4" />
            </div>
            <h4 className="text-2xl font-black text-slate-900">{statusDistribution.CANCELLED}</h4>
            <div className="w-full bg-rose-100 h-1.5 rounded-full overflow-hidden">
              <div className="bg-rose-500 h-full rounded-full" style={{ width: `${Math.min(100, (statusDistribution.CANCELLED / (totalOrders || 1)) * 100)}%` }} />
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
