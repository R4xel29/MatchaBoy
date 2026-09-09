'use client';

import { useState } from 'react';
import { TrendingUp } from 'lucide-react';
import { formatRupiah } from '@/lib/utils';
import { TimelinePoint, Range } from './types';

interface Props {
  timeline: TimelinePoint[];
  range: Range;
  totalRevenue: number;
  totalOrders: number;
}

export function AnalyticsTimelineChart({
  timeline,
  range,
  totalRevenue,
  totalOrders,
}: Props) {
  const [activeMetric, setActiveMetric] = useState<'revenue' | 'orders'>('revenue');
  const [hoveredPoint, setHoveredPoint] = useState<TimelinePoint | null>(null);

  // SVG dimensions
  const svgWidth = 600;
  const svgHeight = 220;
  const padding = 25;
  const chartWidth = svgWidth - padding * 2;
  const chartHeight = svgHeight - padding * 2;

  const maxVal = Math.max(...timeline.map(t => (activeMetric === 'revenue' ? t.revenue : t.orders)), 1);

  const points = timeline.map((item, idx) => {
    const x = padding + (idx / Math.max(timeline.length - 1, 1)) * chartWidth;
    const val = activeMetric === 'revenue' ? item.revenue : item.orders;
    const y = svgHeight - padding - (val / maxVal) * chartHeight;
    return { ...item, x, y, val };
  });

  const linePath = points.reduce((acc, curr, idx) => {
    return idx === 0 ? `M ${curr.x} ${curr.y}` : `${acc} L ${curr.x} ${curr.y}`;
  }, '');

  return (
    <div className="lg:col-span-8 bg-white border border-slate-150/80 rounded-3xl p-6 shadow-xs flex flex-col justify-between space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h3 className="font-heading font-extrabold text-base text-slate-900 tracking-tight flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-orange-600" /> Tren Performa Penjualan
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            {range === 'today' ? 'Distribusi transaksi per jam hari ini' : 'Fluktuasi pendapatan dan volume pesanan'}
          </p>
        </div>

        {/* Metric Toggle */}
        <div className="flex items-center p-1 rounded-xl bg-slate-100 border border-slate-200/80 self-start sm:self-auto">
          <button
            onClick={() => setActiveMetric('revenue')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeMetric === 'revenue'
                ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Pendapatan (Rp)
          </button>
          <button
            onClick={() => setActiveMetric('orders')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeMetric === 'orders'
                ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Pesanan (Qty)
          </button>
        </div>
      </div>

      {/* Interactive SVG Chart */}
      <div className="w-full h-64 relative bg-gradient-to-b from-orange-50/30 to-transparent rounded-2xl p-3 border border-slate-100 flex items-center justify-center">
        {timeline.length === 0 ? (
          <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">Belum ada transaksi di rentang waktu ini</span>
        ) : (
          <svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} className="w-full h-full overflow-visible">
            <defs>
              <linearGradient id="arumAreaGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#f97316" stopOpacity="0.35" />
                <stop offset="100%" stopColor="#f59e0b" stopOpacity="0.0" />
              </linearGradient>
            </defs>

            {/* Grid Lines */}
            {[0, 0.25, 0.5, 0.75, 1].map((ratio, idx) => {
              const y = padding + ratio * chartHeight;
              return (
                <line 
                  key={idx} 
                  x1={padding} 
                  y1={y} 
                  x2={svgWidth - padding} 
                  y2={y} 
                  stroke="#f1f5f9" 
                  strokeWidth="1" 
                  strokeDasharray="4 4" 
                />
              );
            })}

            {/* Area Fill */}
            {points.length > 0 && (
              <path 
                d={`${linePath} L ${points[points.length - 1].x} ${svgHeight - padding} L ${points[0].x} ${svgHeight - padding} Z`}
                fill="url(#arumAreaGrad)"
              />
            )}

            {/* Main Stroke Line */}
            {points.length > 0 && (
              <path 
                d={linePath} 
                fill="none" 
                stroke="#ea580c" 
                strokeWidth="3.5" 
                strokeLinecap="round" 
                strokeLinejoin="round" 
              />
            )}

            {/* Data Points */}
            {points.map((p, idx) => (
              <g 
                key={idx} 
                className="cursor-pointer group/dot"
                onMouseEnter={() => setHoveredPoint(p)}
                onMouseLeave={() => setHoveredPoint(null)}
              >
                <circle 
                  cx={p.x} 
                  cy={p.y} 
                  r="5" 
                  fill="#FFFFFF" 
                  stroke="#ea580c" 
                  strokeWidth="3" 
                  className="transition-transform duration-200 group-hover/dot:scale-150"
                />
                
                {/* X-axis Label */}
                <text 
                  x={p.x} 
                  y={svgHeight - 10} 
                  textAnchor="middle" 
                  className="text-[10px] font-bold fill-slate-500 tracking-tight"
                >
                  {p.label}
                </text>

                {/* Point Tooltip */}
                <text 
                  x={p.x} 
                  y={p.y - 12} 
                  textAnchor="middle" 
                  className="text-[10px] font-extrabold fill-slate-900 opacity-0 group-hover/dot:opacity-100 transition-opacity"
                >
                  {activeMetric === 'revenue' ? formatRupiah(p.revenue) : `${p.orders} order`}
                </text>
              </g>
            ))}
          </svg>
        )}
      </div>

      {/* Bottom Info Bar for Chart */}
      <div className="flex items-center justify-between text-xs text-slate-500 border-t border-slate-100 pt-3">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-orange-500" />
          <span className="font-semibold text-slate-700">
            {activeMetric === 'revenue' ? 'Total Pendapatan Terpilih:' : 'Total Volume Terpilih:'}
          </span>
          <span className="font-extrabold text-orange-600">
            {activeMetric === 'revenue' ? formatRupiah(totalRevenue) : `${totalOrders} Transaksi`}
          </span>
        </div>
        <span className="text-[11px] text-slate-400 font-medium">Arahkan kursor ke titik grafik untuk detail</span>
      </div>
    </div>
  );
}
