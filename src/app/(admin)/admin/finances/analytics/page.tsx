'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { 
  BarChart3, 
  RefreshCw, 
} from 'lucide-react';
import { Range, AnalyticsData, RANGE_LABELS } from './_components/types';
import { AnalyticsKpiCards } from './_components/AnalyticsKpiCards';
import { AnalyticsTimelineChart } from './_components/AnalyticsTimelineChart';
import { TopProductsRankTable } from './_components/TopProductsRankTable';
import { DistributionBreakdown } from './_components/DistributionBreakdown';

export default function AdminAnalyticsPage() {
  const router = useRouter();
  const { status } = useSession();
  const [range, setRange] = useState<Range>('today');
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [autoRefresh] = useState(true);
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

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto pb-10">
      {/* Top Header Section */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 bg-white p-5 rounded-3xl border border-slate-150/80 shadow-xs">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center text-white shadow-md shadow-orange-500/20 shrink-0">
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
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all duration-200 cursor-pointer ${
                  range === key
                    ? 'bg-white text-orange-600 shadow-xs font-extrabold'
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
            className="p-2.5 rounded-xl bg-slate-100 hover:bg-orange-50 text-slate-600 hover:text-orange-600 border border-slate-200/70 transition-all duration-200 active:scale-95 cursor-pointer"
            title="Segarkan Data Sekarang"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-orange-600' : ''}`} />
          </button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <AnalyticsKpiCards kpis={kpis} range={range} />

      {/* Graphs & Timeline Section */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <AnalyticsTimelineChart
          timeline={timeline}
          range={range}
          totalRevenue={kpis.totalRevenue}
          totalOrders={kpis.totalOrders}
        />
        <DistributionBreakdown
          categoryRevenue={categoryRev}
          paymentMethods={paymentMethods}
          orderTypes={orderTypes}
          statusDistribution={statusDist}
          totalOrders={kpis.totalOrders}
        />
      </div>

      {/* Top Products Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <TopProductsRankTable topProducts={topProducts} />
      </div>
    </div>
  );
}
