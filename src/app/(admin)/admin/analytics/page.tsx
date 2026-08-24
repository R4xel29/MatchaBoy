'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Image from 'next/image';
import { 
  TrendingUp, 
  ShoppingBag, 
  DollarSign, 
  Users, 
  ArrowUpRight, 
  ArrowDownRight, 
  RefreshCw, 
  Calendar, 
  BarChart3, 
  PieChart, 
  Layers,
  Sparkles,
  CreditCard,
  Store,
  Clock,
  Flame,
  CheckCircle2,
  AlertCircle,
  XCircle,
  Percent,
  CupSoda,
  Award
} from 'lucide-react';
import { formatRupiah } from '@/lib/utils';

type Range = 'today' | 'week' | 'month' | 'all';

const RANGE_LABELS: Record<Range, { label: string; periodText: string }> = {
  today: { label: 'Hari Ini', periodText: 'vs Kemarin' },
  week: { label: '7 Hari Terakhir', periodText: 'vs 7 Hari Sebelumnya' },
  month: { label: 'Bulan Ini', periodText: 'vs Bulan Lalu' },
  all: { label: 'Semua Waktu', periodText: 'Akumulasi Data' },
};

interface TopProduct {
  id: string;
  name: string;
  image: string | null;
  qty: number;
  revenue: number;
  categoryName: string;
}

interface TimelinePoint {
  label: string;
  revenue: number;
  orders: number;
}

interface AnalyticsData {
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
  statusDistribution: {
    PENDING: number;
    PREPARING: number;
    READY: number;
    COMPLETED: number;
    CANCELLED: number;
  };
  categoryRevenue: Array<{
    name: string;
    value: number;
    count: number;
    percentage: number;
  }>;
  topProducts: TopProduct[];
  timeline: TimelinePoint[];
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
  updatedAt?: string;
}

export default function AdminAnalyticsPage() {
  const router = useRouter();
  const { status } = useSession();
  const [range, setRange] = useState<Range>('today');
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [activeMetric, setActiveMetric] = useState<'revenue' | 'orders'>('revenue');
  const [hoveredPoint, setHoveredPoint] = useState<TimelinePoint | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [lastFetchedTime, setLastFetchedTime] = useState<string>('');

  const fetchAnalytics = useCallback(async (isBackground = false) => {
    if (!isBackground) setLoading(true);
    try {
      const res = await fetch(`/api/admin/analytics?range=${range}&_t=${Date.now()}`, {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache',
        },
      });
      if (res.ok) {
        const d = await res.json();
        setData(d);
        const timeStr = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        setLastFetchedTime(timeStr);
      }
    } catch (err) {
      console.error('Failed to fetch analytics:', err);
    } finally {
      if (!isBackground) setLoading(false);
    }
  }, [range]);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
      return;
    }
    fetchAnalytics();
  }, [range, status, fetchAnalytics, router]);

  // Auto-refresh timer every 30s
  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(() => {
      fetchAnalytics(true);
    }, 30000);
    return () => clearInterval(interval);
  }, [autoRefresh, fetchAnalytics]);

  if (loading && !data) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[460px] space-y-4">
        <div className="w-12 h-12 rounded-2xl bg-orange-50 border border-orange-200 flex items-center justify-center">
          <RefreshCw className="w-6 h-6 animate-spin text-orange-600" />
        </div>
        <div className="text-center">
          <p className="text-sm font-bold text-slate-800 tracking-wide">Memuat Analitik Arum Seduh...</p>
          <p className="text-xs text-slate-400 mt-0.5">Menghitung performa penjualan & KPI real-time</p>
        </div>
      </div>
    );
  }

  const kpis = data?.kpis || {
    totalRevenue: 0,
    totalOrders: 0,
    avgOrderValue: 0,
    totalCustomers: 0,
    completedCount: 0,
    revenueGrowth: 0,
    ordersGrowth: 0,
    aovGrowth: 0,
  };
  const statusDist = data?.statusDistribution || { PENDING: 0, PREPARING: 0, READY: 0, COMPLETED: 0, CANCELLED: 0 };
  const categoryRev = data?.categoryRevenue || [];
  const topProducts = data?.topProducts || [];
  const timeline = data?.timeline || [];
  const paymentMethods = data?.paymentMethods || [];
  const orderTypes = data?.orderTypes || [];

  // SVG Line/Area Graph calculations
  const maxRevenue = Math.max(...timeline.map((t) => t.revenue), 1000);
  const maxOrders = Math.max(...timeline.map((t) => t.orders), 5);
  const currentMax = activeMetric === 'revenue' ? maxRevenue : maxOrders;

  const svgWidth = 600;
  const svgHeight = 220;
  const padding = 35;
  const chartWidth = svgWidth - padding * 2;
  const chartHeight = svgHeight - padding * 2;

  const points = timeline.map((p, index) => {
    const x = padding + (index / (timeline.length - 1 || 1)) * chartWidth;
    const val = activeMetric === 'revenue' ? p.revenue : p.orders;
    const y = svgHeight - padding - (val / currentMax) * chartHeight;
    return { x, y, ...p };
  });

  const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');

  // Donut chart colors (Warm Arum Seduh Theme)
  const donutColors = [
    '#f97316', // orange-500
    '#f59e0b', // amber-500
    '#d97706', // amber-600
    '#ea580c', // orange-600
    '#fb923c', // orange-400
    '#94a3b8', // slate-400
  ];

  let currentAngle = 0;

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto pb-10">
      
      {/* Top Header Section */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 bg-white p-5 rounded-3xl border border-slate-150/80 shadow-sm">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center text-white shadow-md shadow-orange-500/20 flex-shrink-0">
            <BarChart3 className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl sm:text-2xl font-heading font-extrabold text-slate-900 tracking-tight">
                Analisis & KPI Toko
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-orange-50 text-orange-700 border border-orange-200/80">
                Arum Seduh Hub
              </span>
            </div>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Dashboard performa omset, transaksi, dan popularitas menu secara real-time
            </p>
          </div>
        </div>

        {/* Range Selectors & Live Refresh */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Live Indicator */}
          <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200/80 text-[11px] font-semibold text-slate-600">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Update: {lastFetchedTime || 'Baru saja'}</span>
          </div>

          <div className="flex items-center p-1 rounded-2xl bg-slate-100 border border-slate-200/70 shadow-inner">
            {(Object.keys(RANGE_LABELS) as Range[]).map((key) => (
              <button
                key={key}
                onClick={() => setRange(key)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all duration-200 ${
                  range === key
                    ? 'bg-white text-orange-600 shadow-sm font-extrabold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {RANGE_LABELS[key].label}
              </button>
            ))}
          </div>

          {/* Refresh Button */}
          <button 
            onClick={() => fetchAnalytics(false)}
            className="p-2.5 rounded-xl bg-slate-100 hover:bg-orange-50 text-slate-600 hover:text-orange-600 border border-slate-200/70 transition-all duration-200 active:scale-95"
            title="Segarkan Data Sekarang"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-orange-600' : ''}`} />
          </button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Total Pendapatan */}
        <div className="bg-white border border-slate-100 rounded-3xl p-5 shadow-sm space-y-3 relative overflow-hidden group hover:border-orange-300 hover:shadow-md transition-all duration-300">
          <div className="flex justify-between items-start">
            <div className="w-10 h-10 rounded-2xl bg-orange-50 border border-orange-100 flex items-center justify-center text-orange-600 shadow-sm">
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
        <div className="bg-white border border-slate-100 rounded-3xl p-5 shadow-sm space-y-3 relative overflow-hidden group hover:border-amber-300 hover:shadow-md transition-all duration-300">
          <div className="flex justify-between items-start">
            <div className="w-10 h-10 rounded-2xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600 shadow-sm">
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
        <div className="bg-white border border-slate-100 rounded-3xl p-5 shadow-sm space-y-3 relative overflow-hidden group hover:border-orange-300 hover:shadow-md transition-all duration-300">
          <div className="flex justify-between items-start">
            <div className="w-10 h-10 rounded-2xl bg-orange-50 border border-orange-100 flex items-center justify-center text-orange-600 shadow-sm">
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
        <div className="bg-white border border-slate-100 rounded-3xl p-5 shadow-sm space-y-3 relative overflow-hidden group hover:border-amber-300 hover:shadow-md transition-all duration-300">
          <div className="flex justify-between items-start">
            <div className="w-10 h-10 rounded-2xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600 shadow-sm">
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

      {/* Main Graphs & Breakdown Section */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Timeline Line/Area Chart */}
        <div className="lg:col-span-8 bg-white border border-slate-150/80 rounded-3xl p-6 shadow-sm flex flex-col justify-between space-y-6">
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
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  activeMetric === 'revenue'
                    ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Pendapatan (Rp)
              </button>
              <button
                onClick={() => setActiveMetric('orders')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  activeMetric === 'orders'
                    ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-sm'
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
                <path 
                  d={`${linePath} L ${points[points.length - 1].x} ${svgHeight - padding} L ${points[0].x} ${svgHeight - padding} Z`}
                  fill="url(#arumAreaGrad)"
                />

                {/* Main Stroke Line */}
                <path 
                  d={linePath} 
                  fill="none" 
                  stroke="#ea580c" 
                  strokeWidth="3.5" 
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />

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
                {activeMetric === 'revenue' ? formatRupiah(kpis.totalRevenue) : `${kpis.totalOrders} Transaksi`}
              </span>
            </div>
            <span className="text-[11px] text-slate-400 font-medium">Arahkan kursor ke titik grafik untuk detail</span>
          </div>
        </div>

        {/* Kategori Terlaris (Donut & Share) */}
        <div className="lg:col-span-4 bg-white border border-slate-150/80 rounded-3xl p-6 shadow-sm flex flex-col justify-between space-y-5">
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
                {categoryRev.map((cat, idx) => {
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
                  {categoryRev[0]?.percentage || 0}%
                </span>
                <span className="text-[10px] text-slate-500 font-semibold truncate max-w-[80px] mt-0.5">
                  {categoryRev[0]?.name || '-'}
                </span>
              </div>
            </div>

            {/* Category Breakdown List */}
            <div className="w-full space-y-2 max-h-[160px] overflow-y-auto pr-1">
              {categoryRev.length === 0 ? (
                <p className="text-center text-xs text-slate-400 py-3 font-medium">Belum ada data kategori</p>
              ) : (
                categoryRev.map((cat, idx) => (
                  <div key={cat.name} className="flex justify-between items-center text-xs p-2 rounded-xl hover:bg-slate-50 transition-colors">
                    <div className="flex items-center gap-2 min-w-0">
                      <div 
                        className="w-2.5 h-2.5 rounded-full flex-shrink-0" 
                        style={{ backgroundColor: donutColors[idx % donutColors.length] }} 
                      />
                      <span className="font-bold text-slate-800 truncate">{cat.name}</span>
                    </div>
                    <div className="text-right flex items-center gap-2 flex-shrink-0">
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

      </div>

      {/* Bottom Grid: Top Products & Order Channels & Statuses */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Top 5 Menu Paling Laris */}
        <div className="lg:col-span-6 bg-white border border-slate-150/80 rounded-3xl p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-heading font-extrabold text-base text-slate-900 tracking-tight flex items-center gap-2">
              <Flame className="w-4 h-4 text-orange-500" /> 5 Menu Terlaris (Best Seller)
            </h3>
            <span className="text-xs font-bold text-orange-600 bg-orange-50 px-2.5 py-1 rounded-full border border-orange-150">
              Paling Populer
            </span>
          </div>

          <div className="space-y-2.5">
            {topProducts.length === 0 ? (
              <p className="text-center text-xs text-slate-400 py-8 font-medium">Belum ada data penjualan produk</p>
            ) : (
              topProducts.map((prod, index) => (
                <div key={prod.id} className="flex items-center justify-between p-3 rounded-2xl bg-slate-50/70 border border-slate-100 hover:bg-orange-50/50 hover:border-orange-200/80 transition-all duration-200">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`w-7 h-7 rounded-xl flex items-center justify-center text-xs font-black shadow-sm ${
                      index === 0 
                        ? 'bg-amber-500 text-white' 
                        : index === 1 
                        ? 'bg-slate-300 text-slate-800' 
                        : index === 2 
                        ? 'bg-amber-700 text-white' 
                        : 'bg-slate-100 text-slate-600'
                    }`}>
                      {index + 1}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-slate-900 truncate">{prod.name}</p>
                      <p className="text-[10px] text-slate-400 font-semibold uppercase">{prod.categoryName}</p>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-xs font-extrabold text-orange-600">{prod.qty} Cups</p>
                    <p className="text-[10px] text-slate-500 font-medium">{formatRupiah(prod.revenue)}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Metode Pembayaran & Tipe Pesanan */}
        <div className="lg:col-span-6 bg-white border border-slate-150/80 rounded-3xl p-6 shadow-sm flex flex-col justify-between space-y-4">
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
      <div className="bg-white border border-slate-150/80 rounded-3xl p-6 shadow-sm text-left">
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
            <h4 className="text-2xl font-black text-slate-900">{statusDist.PENDING}</h4>
            <div className="w-full bg-amber-100 h-1.5 rounded-full overflow-hidden">
              <div className="bg-amber-500 h-full rounded-full" style={{ width: `${Math.min(100, (statusDist.PENDING / (kpis.totalOrders || 1)) * 100)}%` }} />
            </div>
          </div>

          {/* Diseduh / Preparing */}
          <div className="border border-orange-200/80 rounded-2xl p-4 space-y-2 bg-orange-50/40">
            <div className="flex items-center justify-between text-orange-700">
              <span className="text-[10px] font-black uppercase tracking-wider">Diseduh</span>
              <CupSoda className="w-4 h-4" />
            </div>
            <h4 className="text-2xl font-black text-slate-900">{statusDist.PREPARING}</h4>
            <div className="w-full bg-orange-150 h-1.5 rounded-full overflow-hidden">
              <div className="bg-orange-500 h-full rounded-full" style={{ width: `${Math.min(100, (statusDist.PREPARING / (kpis.totalOrders || 1)) * 100)}%` }} />
            </div>
          </div>

          {/* Siap / Ready */}
          <div className="border border-blue-200/80 rounded-2xl p-4 space-y-2 bg-blue-50/40">
            <div className="flex items-center justify-between text-blue-700">
              <span className="text-[10px] font-black uppercase tracking-wider">Siap Ambil</span>
              <CheckCircle2 className="w-4 h-4" />
            </div>
            <h4 className="text-2xl font-black text-slate-900">{statusDist.READY}</h4>
            <div className="w-full bg-blue-100 h-1.5 rounded-full overflow-hidden">
              <div className="bg-blue-500 h-full rounded-full" style={{ width: `${Math.min(100, (statusDist.READY / (kpis.totalOrders || 1)) * 100)}%` }} />
            </div>
          </div>

          {/* Selesai / Completed */}
          <div className="border border-emerald-200/80 rounded-2xl p-4 space-y-2 bg-emerald-50/40">
            <div className="flex items-center justify-between text-emerald-700">
              <span className="text-[10px] font-black uppercase tracking-wider">Selesai</span>
              <Award className="w-4 h-4" />
            </div>
            <h4 className="text-2xl font-black text-slate-900">{statusDist.COMPLETED}</h4>
            <div className="w-full bg-emerald-100 h-1.5 rounded-full overflow-hidden">
              <div className="bg-emerald-500 h-full rounded-full" style={{ width: `${Math.min(100, (statusDist.COMPLETED / (kpis.totalOrders || 1)) * 100)}%` }} />
            </div>
          </div>

          {/* Dibatalkan / Cancelled */}
          <div className="border border-rose-200/80 rounded-2xl p-4 space-y-2 bg-rose-50/40 col-span-2 md:col-span-1">
            <div className="flex items-center justify-between text-rose-700">
              <span className="text-[10px] font-black uppercase tracking-wider">Batal</span>
              <XCircle className="w-4 h-4" />
            </div>
            <h4 className="text-2xl font-black text-slate-900">{statusDist.CANCELLED}</h4>
            <div className="w-full bg-rose-100 h-1.5 rounded-full overflow-hidden">
              <div className="bg-rose-500 h-full rounded-full" style={{ width: `${Math.min(100, (statusDist.CANCELLED / (kpis.totalOrders || 1)) * 100)}%` }} />
            </div>
          </div>

        </div>
      </div>

    </div>
  );
}
