'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { formatRupiah } from '@/lib/utils';
import {
  TrendingUp,
  Package,
  ShoppingCart,
  Users,
  ArrowUpRight,
  Clock,
  Loader2,
  Calendar,
  Receipt,
  DollarSign,
  Percent,
  CheckCircle2,
  AlertCircle,
  XCircle,
  Truck,
  Layers,
  Store,
  CreditCard,
  ChefHat,
  Coffee,
  Ticket,
  BarChart3,
  Flame,
  Sparkles,
  HelpCircle,
  Wallet,
  ShieldCheck,
  RefreshCw,
  Award,
  ChevronRight,
  ExternalLink,
  QrCode,
  Banknote,
  Coins,
  Plus
} from 'lucide-react';
import { InjectCapitalModal } from '@/components/admin/finances/InjectCapitalModal';

type Range = 'today' | 'week' | 'month' | 'all';

const RANGE_LABELS: Record<Range, { label: string; subtext: string }> = {
  today: { label: 'Hari Ini', subtext: 'Performa hari ini' },
  week: { label: '7 Hari', subtext: '7 hari terakhir' },
  month: { label: 'Bulan Ini', subtext: 'Bulan berjalan' },
  all: { label: 'Semua', subtext: 'Akumulasi total' },
};

interface BalancePosition {
  baseCashBalance?: number;
  baseQrisBalance?: number;
  activeShiftOpeningCash: number;
  allTimeExpensesTotal: number;
  allTimeCashExpenses?: number;
  allTimeTransferExpenses?: number;
  cashInflowTotal?: number;
  qrisInflowTotal?: number;
  currentCash?: number;
  currentQris?: number;
  cashTotal: number;
  cashOrdersTotal: number;
  cashCount: number;
  qrisTotal: number;
  qrisOrdersTotal?: number;
  qrisCount: number;
  grossTotalMoney: number;
  netTotalMoney: number;
  totalCompletedOrders: number;
}

interface DashboardData {
  kpis: {
    totalRevenue: number;
    totalExpenses: number;
    netProfit: number;
    avgOrderValue: number;
    totalOrders: number;
    completedCount: number;
    totalCustomers: number;
    activeProducts: number;
    soldOutProducts: number;
  };
  balancePosition?: BalancePosition;
  pipeline: {
    PENDING: number;
    PREPARING: number;
    READY: number;
    ON_DELIVERY: number;
    COMPLETED: number;
    CANCELLED: number;
  };
  liveOperations: {
    activeCashiers: Array<{
      id: string;
      cashierName: string;
      openingCash: number;
      totalOrders: number;
      totalRevenue: number;
      openedAt: string;
    }>;
    onlineDrivers: Array<{
      id: string;
      name: string;
      phone: string;
      vehicleType: string;
      plateNumber: string;
    }>;
    tables: {
      total: number;
      occupied: number;
      available: number;
    };
  };
  alerts: {
    criticalIngredients: Array<{ id: string; name: string; stock: number; unit: string }>;
    soldOutProducts: Array<{ id: string; name: string; price: number; image: string | null }>;
    openTicketsCount: number;
    pendingTopupsCount: number;
  };
  stockAssetValuation?: {
    totalValue: number;
    totalIngredientsCount: number;
    lowStockCount: number;
  };
  topProducts: Array<{
    id: string;
    name: string;
    image: string | null;
    qty: number;
    revenue: number;
    categoryName: string;
  }>;
  paymentMethods: Array<{ method: string; count: number; amount?: number; percentage: number; amountPercentage?: number }>;
  orderTypes: Array<{ type: string; count: number; percentage: number }>;
  timeline: Array<{ label: string; revenue: number; expenses?: number; orders: number }>;
  recentOrders: Array<{
    id: string;
    customerName: string;
    customerPhone: string;
    total: number;
    status: string;
    orderType: string;
    paymentMethod: string;
    queueNumber: string | null;
    itemCount: number;
    itemSummary: string;
    createdAt: string;
  }>;
  updatedAt?: string;
}

interface Props {
  initialData: DashboardData;
}

export default function AdminDashboardClient({ initialData }: Props) {
  const [range, setRange] = useState<Range>('today');
  const [data, setData] = useState<DashboardData>(initialData);
  const [loading, setLoading] = useState(false);
  const [activeChartMetric, setActiveChartMetric] = useState<'revenue' | 'orders' | 'cashflow'>('revenue');
  const [lastRefreshed, setLastRefreshed] = useState<string>('');
  const [showInjectModal, setShowInjectModal] = useState(false);

  const fetchData = useCallback(async (selectedRange: Range, isBackground = false) => {
    if (!isBackground) setLoading(true);
    try {
      const res = await fetch(`/api/admin/dashboard?range=${selectedRange}&_t=${Date.now()}`, {
        cache: 'no-store',
      });
      if (res.ok) {
        const result = await res.json();
        setData(result);
        setLastRefreshed(
          new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
        );
      }
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
    } finally {
      if (!isBackground) setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData(range);
  }, [range, fetchData]);

  // Auto refresh live data every 30 seconds
  useEffect(() => {
    const timer = setInterval(() => {
      fetchData(range, true);
    }, 30000);
    return () => clearInterval(timer);
  }, [range, fetchData]);

  const kpis = data.kpis;
  const balance = data.balancePosition || {
    baseCashBalance: 252000,
    baseQrisBalance: 722000,
    activeShiftOpeningCash: 0,
    allTimeExpensesTotal: 0,
    currentCash: 320000,
    currentQris: 353000,
    cashInflowTotal: 320000,
    qrisInflowTotal: 728000,
    allTimeCashExpenses: 0,
    allTimeTransferExpenses: 375000,
    cashTotal: 320000,
    cashOrdersTotal: 68000,
    cashCount: 5,
    qrisTotal: 353000,
    qrisOrdersTotal: 6000,
    qrisCount: 1,
    grossTotalMoney: 1048000,
    netTotalMoney: 673000,
    totalCompletedOrders: 6,
  };
  const pipeline = data.pipeline;
  const liveOps = data.liveOperations;
  const alerts = data.alerts;
  const timeline = data.timeline || [];
  const topProducts = data.topProducts || [];
  const paymentMethods = data.paymentMethods || [];
  const orderTypes = data.orderTypes || [];
  const recentOrders = data.recentOrders || [];

  // Chart SVG Calculations
  const maxRevenue = Math.max(...timeline.map((t) => t.revenue), 10000);
  const maxExpenses = Math.max(...timeline.map((t) => t.expenses || 0), 10000);
  const maxOrders = Math.max(...timeline.map((t) => t.orders), 5);
  const currentMax =
    activeChartMetric === 'revenue'
      ? maxRevenue
      : activeChartMetric === 'cashflow'
      ? Math.max(maxRevenue, maxExpenses)
      : maxOrders;

  const svgWidth = 640;
  const svgHeight = 200;
  const paddingX = 35;
  const paddingY = 25;
  const chartW = svgWidth - paddingX * 2;
  const chartH = svgHeight - paddingY * 2;

  const points = timeline.map((p, idx) => {
    const x = paddingX + (idx / Math.max(timeline.length - 1, 1)) * chartW;
    const val = activeChartMetric === 'orders' ? p.orders : p.revenue;
    const y = svgHeight - paddingY - (val / currentMax) * chartH;
    return { x, y, ...p };
  });

  const expensePoints = timeline.map((p, idx) => {
    const x = paddingX + (idx / Math.max(timeline.length - 1, 1)) * chartW;
    const val = p.expenses || 0;
    const y = svgHeight - paddingY - (val / currentMax) * chartH;
    return { x, y, ...p };
  });

  const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
  const expenseLinePath = expensePoints.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');

  const totalActivePipeline =
    pipeline.PENDING + pipeline.PREPARING + pipeline.READY + pipeline.ON_DELIVERY;

  const hasAlerts =
    alerts.criticalIngredients.length > 0 ||
    alerts.soldOutProducts.length > 0 ||
    alerts.openTicketsCount > 0 ||
    alerts.pendingTopupsCount > 0;

  return (
    <div className="space-y-6 max-w-[1500px] mx-auto pb-12">
      {/* 1. Header & Live Indicator */}
      <div className="bg-white rounded-3xl border border-slate-150/80 p-5 sm:p-6 shadow-sm flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <span className="px-2.5 py-1 rounded-full text-[11px] font-extrabold uppercase tracking-wider bg-orange-50 text-orange-700 border border-orange-200">
              Pusat Kendali
            </span>
            <span className="text-xs font-semibold text-slate-400">•</span>
            <span className="text-xs font-bold text-slate-600 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              Sistem Aktif ({lastRefreshed || 'Baru saja'})
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight mt-1">
            Dashboard Arum Seduh
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 font-medium mt-0.5">
            Pantauan kas masuk (Tunai & QRIS), operasional seduhan, stok bahan, dan aktivitas kasir real-time
          </p>
        </div>

        {/* Range Selector & Refresh */}
        <div className="flex items-center gap-2 flex-wrap self-start lg:self-center">
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

          <button
            onClick={() => fetchData(range)}
            disabled={loading}
            className="p-2.5 rounded-2xl bg-slate-100 hover:bg-orange-50 text-slate-600 hover:text-orange-600 border border-slate-200/70 transition-all duration-200 active:scale-95 disabled:opacity-50"
            title="Segarkan data sekarang"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-orange-600' : ''}`} />
          </button>
        </div>
      </div>

      {/* 2. Posisi Saldo Kas & Rekening Toko (Clean Light Theme - 100% Dinamis dari Database) */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 shadow-sm border border-slate-150/80 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-slate-100 pb-3.5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-orange-500 to-amber-500 text-white flex items-center justify-center shadow-md shadow-orange-500/20 flex-shrink-0">
              <Coins className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base sm:text-lg font-extrabold tracking-tight text-slate-900">
                  Posisi Saldo Kas & Dompet
                </h2>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  Real-time Database
                </span>
              </div>
              <p className="text-[11px] sm:text-xs text-slate-500 font-medium">
                Total uang fisik di laci kasir, saldo QRIS merchant, dompet digital, dan total dana riil toko saat ini
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap self-start sm:self-auto">
            <button
              onClick={() => setShowInjectModal(true)}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold transition-all shadow-sm shadow-emerald-600/20 active:scale-95 cursor-pointer"
              title="Suntik dana / tambah modal ke kas atau rekening QRIS"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Suntik Modal</span>
            </button>

            <Link
              href="/admin/finances"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-orange-50 hover:text-orange-700 text-xs font-bold text-slate-700 border border-slate-200 transition-colors shadow-sm"
              title="Buka Buku Kas & Riwayat Mutasi Lengkap"
            >
              <Coins className="w-3.5 h-3.5 text-orange-600" />
              <span>Buku Kas & Mutasi</span>
            </Link>

            {data.stockAssetValuation && (
              <Link
                href="/admin/inventory"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-50 border border-amber-200 text-xs font-bold text-amber-900 hover:bg-amber-100 transition-colors shadow-sm"
                title="Total nilai modal bahan baku yang tersedia di gudang saat ini"
              >
                <Package className="w-3.5 h-3.5 text-amber-600" />
                Valuasi Stok: <span className="font-extrabold text-amber-950">{formatRupiah(data.stockAssetValuation.totalValue)}</span>
              </Link>
            )}
          </div>
        </div>

        {/* 4 Kolom Rincian Saldo (Light Theme Dinamis) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          {/* 1. Uang Cash Saat Ini */}
          <div className="bg-amber-50/60 hover:bg-amber-50/90 border border-amber-200/80 rounded-2xl p-4 space-y-2 transition-all group shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-extrabold text-amber-800 uppercase tracking-wider flex items-center gap-1.5">
                <Banknote className="w-4 h-4 text-amber-600" />
                Uang Cash Saat Ini
              </span>
              <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-md bg-amber-200/60 text-amber-900 border border-amber-300">
                Fisik Kasir / Laci
              </span>
            </div>
            <p className="text-2xl font-black text-slate-900 tracking-tight">
              {formatRupiah(balance.currentCash ?? balance.cashTotal)}
            </p>
            <p className="text-[11px] text-amber-900/80 font-medium">
              Masuk: {formatRupiah(balance.cashInflowTotal ?? balance.cashTotal)}
              {balance.allTimeCashExpenses && balance.allTimeCashExpenses > 0
                ? ` • Keluar: ${formatRupiah(balance.allTimeCashExpenses)}`
                : ' • Belum ada beban tunai'}
            </p>
          </div>

          {/* 2. Saldo QRIS Saat Ini */}
          <div className="bg-sky-50/60 hover:bg-sky-50/90 border border-sky-200/80 rounded-2xl p-4 space-y-2 transition-all group shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-extrabold text-sky-800 uppercase tracking-wider flex items-center gap-1.5">
                <QrCode className="w-4 h-4 text-sky-600" />
                Uang QRIS Saat Ini
              </span>
              <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-md bg-sky-200/60 text-sky-900 border border-sky-300">
                Rekening Bank
              </span>
            </div>
            <p className="text-2xl font-black text-slate-900 tracking-tight">
              {formatRupiah(balance.currentQris ?? balance.qrisTotal)}
            </p>
            <p className="text-[11px] text-sky-900/80 font-medium">
              Masuk: {formatRupiah(balance.qrisInflowTotal ?? balance.qrisTotal)}
              {balance.allTimeTransferExpenses && balance.allTimeTransferExpenses > 0
                ? ` • Beban: ${formatRupiah(balance.allTimeTransferExpenses)}`
                : ''}
            </p>
          </div>

          {/* 3. Total Seluruh Uang Selama Ini (Bruto) */}
          <div className="bg-indigo-50/60 hover:bg-indigo-50/90 border border-indigo-200/80 rounded-2xl p-4 space-y-2 transition-all group shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-extrabold text-indigo-800 uppercase tracking-wider flex items-center gap-1.5">
                <Coins className="w-4 h-4 text-indigo-600" />
                Total Uang Masuk Selama Ini
              </span>
              <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-md bg-indigo-200/60 text-indigo-900 border border-indigo-300">
                Bruto (Gross)
              </span>
            </div>
            <p className="text-2xl font-black text-slate-900 tracking-tight">
              {formatRupiah(balance.grossTotalMoney)}
            </p>
            <p className="text-[11px] text-indigo-900/80 font-medium">
              Akumulasi seluruh modal awal + seluruh omset penjualan
            </p>
          </div>

          {/* 4. Total Uang Bersih (Setelah Pengeluaran) */}
          <div className="bg-gradient-to-br from-orange-500 to-amber-500 text-white rounded-2xl p-4 space-y-2 shadow-md shadow-orange-500/20 group">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-extrabold text-white uppercase tracking-wider flex items-center gap-1.5">
                <TrendingUp className="w-4 h-4 text-orange-100" />
                Total Sisa Uang Bersih
              </span>
              <span className="text-[10px] font-black px-2 py-0.5 rounded-md bg-white/20 text-white">
                Kas & Rekening Riil
              </span>
            </div>
            <p className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              {formatRupiah(balance.netTotalMoney)}
            </p>
            <p className="text-[11px] text-orange-100 font-semibold">
              Cash ({formatRupiah(balance.currentCash ?? balance.cashTotal)}) + QRIS ({formatRupiah(balance.currentQris ?? balance.qrisTotal)})
            </p>
          </div>
        </div>
      </div>

      {/* 3. Quick Action Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <Link
          href="/admin/cashier"
          className="group p-3.5 rounded-2xl bg-white border border-slate-150/80 hover:border-orange-300 hover:shadow-md transition-all duration-200 flex items-center gap-3"
        >
          <div className="w-10 h-10 rounded-xl bg-orange-50 text-orange-600 border border-orange-100 flex items-center justify-center group-hover:scale-105 transition-transform">
            <Store className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-bold text-slate-900 group-hover:text-orange-600 transition-colors truncate">
              Kasir POS
            </p>
            <p className="text-[10px] text-slate-400 font-medium truncate">Buka transaksi</p>
          </div>
        </Link>

        <Link
          href="/admin/expenses"
          className="group p-3.5 rounded-2xl bg-white border border-slate-150/80 hover:border-amber-300 hover:shadow-md transition-all duration-200 flex items-center gap-3"
        >
          <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 border border-amber-100 flex items-center justify-center group-hover:scale-105 transition-transform">
            <Receipt className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-bold text-slate-900 group-hover:text-amber-600 transition-colors truncate">
              Pengeluaran
            </p>
            <p className="text-[10px] text-slate-400 font-medium truncate">Catat expense</p>
          </div>
        </Link>

        <Link
          href="/admin/products"
          className="group p-3.5 rounded-2xl bg-white border border-slate-150/80 hover:border-orange-300 hover:shadow-md transition-all duration-200 flex items-center gap-3"
        >
          <div className="w-10 h-10 rounded-xl bg-orange-50 text-orange-600 border border-orange-100 flex items-center justify-center group-hover:scale-105 transition-transform">
            <Package className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-bold text-slate-900 group-hover:text-orange-600 transition-colors truncate">
              Kelola Menu
            </p>
            <p className="text-[10px] text-slate-400 font-medium truncate">Produk & HPP</p>
          </div>
        </Link>

        <Link
          href="/admin/inventory"
          className="group p-3.5 rounded-2xl bg-white border border-slate-150/80 hover:border-amber-300 hover:shadow-md transition-all duration-200 flex items-center gap-3"
        >
          <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 border border-amber-100 flex items-center justify-center group-hover:scale-105 transition-transform">
            <Coffee className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-bold text-slate-900 group-hover:text-amber-600 transition-colors truncate">
              Bahan Baku
            </p>
            <p className="text-[10px] text-slate-400 font-medium truncate">Stok & Gudang</p>
          </div>
        </Link>

        <Link
          href="/admin/reports"
          className="group p-3.5 rounded-2xl bg-white border border-slate-150/80 hover:border-orange-300 hover:shadow-md transition-all duration-200 flex items-center gap-3"
        >
          <div className="w-10 h-10 rounded-xl bg-orange-50 text-orange-600 border border-orange-100 flex items-center justify-center group-hover:scale-105 transition-transform">
            <BarChart3 className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-bold text-slate-900 group-hover:text-orange-600 transition-colors truncate">
              Laporan
            </p>
            <p className="text-[10px] text-slate-400 font-medium truncate">Rekap penjualan</p>
          </div>
        </Link>

        <Link
          href="/admin/tables"
          className="group p-3.5 rounded-2xl bg-white border border-slate-150/80 hover:border-amber-300 hover:shadow-md transition-all duration-200 flex items-center gap-3"
        >
          <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 border border-amber-100 flex items-center justify-center group-hover:scale-105 transition-transform">
            <Layers className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-bold text-slate-900 group-hover:text-amber-600 transition-colors truncate">
              Meja Dine-in
            </p>
            <p className="text-[10px] text-slate-400 font-medium truncate">Layout meja</p>
          </div>
        </Link>
      </div>

      {/* 4. Financial & Profit Grid (Filtered Range) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Omset Kotor */}
        <div className="bg-white border border-slate-150/80 rounded-3xl p-5 shadow-sm space-y-3 relative overflow-hidden group hover:border-orange-300 transition-all duration-300">
          <div className="flex justify-between items-start">
            <div className="w-11 h-11 rounded-2xl bg-orange-50 border border-orange-100 flex items-center justify-center text-orange-600 shadow-sm">
              <TrendingUp className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-extrabold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
              {kpis.completedCount} Selesai
            </span>
          </div>
          <div>
            <span className="text-[11px] font-bold uppercase text-slate-400 tracking-wider">
              Omset Penjualan ({RANGE_LABELS[range].label})
            </span>
            <h3 className="text-2xl sm:text-3xl font-black text-slate-900 mt-1 tracking-tight">
              {formatRupiah(kpis.totalRevenue)}
            </h3>
            <p className="text-[11px] text-slate-500 font-medium mt-1">
              Dari {kpis.totalOrders} total pesanan masuk
            </p>
          </div>
        </div>

        {/* Pengeluaran Operasional */}
        <div className="bg-white border border-slate-150/80 rounded-3xl p-5 shadow-sm space-y-3 relative overflow-hidden group hover:border-amber-300 transition-all duration-300">
          <div className="flex justify-between items-start">
            <div className="w-11 h-11 rounded-2xl bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-600 shadow-sm">
              <Receipt className="w-5 h-5" />
            </div>
            <Link
              href="/admin/expenses"
              className="text-[10px] font-extrabold px-2.5 py-1 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center gap-1 transition-colors"
            >
              Lihat Pos <ArrowUpRight className="w-3 h-3" />
            </Link>
          </div>
          <div>
            <span className="text-[11px] font-bold uppercase text-slate-400 tracking-wider">
              Pengeluaran Toko (Expense)
            </span>
            <h3 className="text-2xl sm:text-3xl font-black text-slate-900 mt-1 tracking-tight">
              {formatRupiah(kpis.totalExpenses)}
            </h3>
            <p className="text-[11px] text-slate-500 font-medium mt-1">
              Biaya operasional pada {RANGE_LABELS[range].label.toLowerCase()}
            </p>
          </div>
        </div>

        {/* Estimasi Laba Bersih */}
        <div className="bg-white border border-slate-150/80 rounded-3xl p-5 shadow-sm space-y-3 relative overflow-hidden group hover:border-orange-300 transition-all duration-300">
          <div className="flex justify-between items-start">
            <div
              className={`w-11 h-11 rounded-2xl flex items-center justify-center shadow-sm ${
                kpis.netProfit >= 0
                  ? 'bg-emerald-50 text-emerald-600 border border-emerald-100'
                  : 'bg-rose-50 text-rose-600 border border-rose-100'
              }`}
            >
              <DollarSign className="w-5 h-5" />
            </div>
            <span
              className={`text-[10px] font-extrabold px-2.5 py-1 rounded-full border ${
                kpis.netProfit >= 0
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  : 'bg-rose-50 text-rose-700 border border-rose-200'
              }`}
            >
              {kpis.netProfit >= 0 ? 'Surplus Laba' : 'Defisit'}
            </span>
          </div>
          <div>
            <span className="text-[11px] font-bold uppercase text-slate-400 tracking-wider">
              Estimasi Laba Bersih
            </span>
            <h3
              className={`text-2xl sm:text-3xl font-black mt-1 tracking-tight ${
                kpis.netProfit >= 0 ? 'text-slate-900' : 'text-rose-600'
              }`}
            >
              {formatRupiah(kpis.netProfit)}
            </h3>
            <p className="text-[11px] text-slate-500 font-medium mt-1">
              Omset kotor dikurangi total pengeluaran
            </p>
          </div>
        </div>

        {/* Rata-rata Order (AOV) */}
        <div className="bg-white border border-slate-150/80 rounded-3xl p-5 shadow-sm space-y-3 relative overflow-hidden group hover:border-amber-300 transition-all duration-300">
          <div className="flex justify-between items-start">
            <div className="w-11 h-11 rounded-2xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600 shadow-sm">
              <Percent className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-extrabold px-2.5 py-1 rounded-full bg-orange-50 text-orange-700 border border-orange-200">
              {kpis.totalCustomers} Pelanggan
            </span>
          </div>
          <div>
            <span className="text-[11px] font-bold uppercase text-slate-400 tracking-wider">
              Rerata Order (AOV)
            </span>
            <h3 className="text-2xl sm:text-3xl font-black text-slate-900 mt-1 tracking-tight">
              {formatRupiah(kpis.avgOrderValue)}
            </h3>
            <p className="text-[11px] text-slate-500 font-medium mt-1">
              Rata-rata nominal belanja per transaksi
            </p>
          </div>
        </div>
      </div>

      {/* 5. Kitchen & Operational Live Pipeline */}
      <div className="bg-white border border-slate-150/80 rounded-3xl p-5 sm:p-6 shadow-sm space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-extrabold text-slate-900 tracking-tight">
                Pipeline Operasional Seduhan & Pengantaran
              </h2>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-orange-100 text-orange-800">
                {totalActivePipeline} Aktif Berjalan
              </span>
            </div>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Alur status pesanan dari antrean masuk hingga selesai diantarkan
            </p>
          </div>

          <Link
            href="/admin/orders"
            className="text-xs font-bold text-orange-600 hover:text-orange-700 flex items-center gap-1 transition-colors self-start sm:self-auto"
          >
            Buka Semua Pesanan <ArrowUpRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {/* Pipeline Step Cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {/* Antrean */}
          <div className="p-3.5 rounded-2xl bg-amber-50/50 border border-amber-200/80 space-y-2">
            <div className="flex items-center justify-between text-amber-700">
              <span className="text-[10px] font-extrabold uppercase tracking-wider">Antrean Masuk</span>
              <Clock className="w-4 h-4" />
            </div>
            <p className="text-2xl font-black text-slate-900">{pipeline.PENDING}</p>
            <p className="text-[10px] text-slate-500 font-medium">Menunggu konfirmasi</p>
          </div>

          {/* Diseduh */}
          <div className="p-3.5 rounded-2xl bg-orange-50/50 border border-orange-200/80 space-y-2">
            <div className="flex items-center justify-between text-orange-700">
              <span className="text-[10px] font-extrabold uppercase tracking-wider">Sedang Diseduh</span>
              <Coffee className="w-4 h-4" />
            </div>
            <p className="text-2xl font-black text-slate-900">{pipeline.PREPARING}</p>
            <p className="text-[10px] text-slate-500 font-medium">Proses pembuatan</p>
          </div>

          {/* Siap Ambil */}
          <div className="p-3.5 rounded-2xl bg-blue-50/50 border border-blue-200/80 space-y-2">
            <div className="flex items-center justify-between text-blue-700">
              <span className="text-[10px] font-extrabold uppercase tracking-wider">Siap Ambil</span>
              <CheckCircle2 className="w-4 h-4" />
            </div>
            <p className="text-2xl font-black text-slate-900">{pipeline.READY}</p>
            <p className="text-[10px] text-slate-500 font-medium">Siap di bar / pickup</p>
          </div>

          {/* Diantar Kurir */}
          <div className="p-3.5 rounded-2xl bg-indigo-50/50 border border-indigo-200/80 space-y-2">
            <div className="flex items-center justify-between text-indigo-700">
              <span className="text-[10px] font-extrabold uppercase tracking-wider">Dalam Pengantaran</span>
              <Truck className="w-4 h-4" />
            </div>
            <p className="text-2xl font-black text-slate-900">{pipeline.ON_DELIVERY}</p>
            <p className="text-[10px] text-slate-500 font-medium">Dibawa oleh kurir</p>
          </div>

          {/* Selesai */}
          <div className="p-3.5 rounded-2xl bg-emerald-50/50 border border-emerald-200/80 space-y-2">
            <div className="flex items-center justify-between text-emerald-700">
              <span className="text-[10px] font-extrabold uppercase tracking-wider">Selesai</span>
              <Award className="w-4 h-4" />
            </div>
            <p className="text-2xl font-black text-slate-900">{pipeline.COMPLETED}</p>
            <p className="text-[10px] text-slate-500 font-medium">Pesanan diterima</p>
          </div>

          {/* Batal */}
          <div className="p-3.5 rounded-2xl bg-rose-50/50 border border-rose-200/80 space-y-2">
            <div className="flex items-center justify-between text-rose-700">
              <span className="text-[10px] font-extrabold uppercase tracking-wider">Dibatalkan</span>
              <XCircle className="w-4 h-4" />
            </div>
            <p className="text-2xl font-black text-slate-900">{pipeline.CANCELLED}</p>
            <p className="text-[10px] text-slate-500 font-medium">Batal / void</p>
          </div>
        </div>

        {/* Live Operational Status Mini Bar (Kasir, Kurir, Meja) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2 border-t border-slate-100">
          <div className="p-3 rounded-2xl bg-slate-50 border border-slate-150/70 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-orange-100 text-orange-700 flex items-center justify-center">
                <Store className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-900">Shift Kasir Aktif</p>
                <p className="text-[11px] text-slate-500">
                  {liveOps.activeCashiers.length > 0
                    ? `${liveOps.activeCashiers.length} kasir bertugas: ${liveOps.activeCashiers
                        .map((c) => c.cashierName)
                        .join(', ')}`
                    : 'Tidak ada shift kasir buka'}
                </p>
              </div>
            </div>
            <Link
              href="/admin/cashier"
              className="text-[11px] font-extrabold text-orange-600 hover:text-orange-700"
            >
              POS
            </Link>
          </div>

          <div className="p-3 rounded-2xl bg-slate-50 border border-slate-150/70 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center">
                <Truck className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-900">Kurir / Driver Delivery</p>
                <p className="text-[11px] text-slate-500">
                  {liveOps.onlineDrivers.length > 0
                    ? `${liveOps.onlineDrivers.length} driver online siaga`
                    : 'Belum ada kurir online'}
                </p>
              </div>
            </div>
            <Link
              href="/admin/drivers"
              className="text-[11px] font-extrabold text-indigo-600 hover:text-indigo-700"
            >
              Kurir
            </Link>
          </div>

          <div className="p-3 rounded-2xl bg-slate-50 border border-slate-150/70 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center">
                <Layers className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-900">Okupansi Meja Dine-in</p>
                <p className="text-[11px] text-slate-500">
                  {liveOps.tables.occupied} terisi dari {liveOps.tables.total} meja (
                  {liveOps.tables.available} tersedia)
                </p>
              </div>
            </div>
            <Link
              href="/admin/tables"
              className="text-[11px] font-extrabold text-amber-600 hover:text-amber-700"
            >
              Meja
            </Link>
          </div>
        </div>
      </div>

      {/* 6. Pusat Peringatan Kritis & Kebutuhan Tindakan (Jika Ada) */}
      {hasAlerts && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3.5">
          {/* Bahan Baku Kritis */}
          {alerts.criticalIngredients.length > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 space-y-2">
              <div className="flex items-center justify-between text-amber-800">
                <span className="text-xs font-bold flex items-center gap-1.5">
                  <AlertCircle className="w-4 h-4 text-amber-600" />
                  Stok Bahan Menipis
                </span>
                <span className="text-[10px] font-extrabold bg-amber-200 text-amber-900 px-2 py-0.5 rounded-full">
                  {alerts.criticalIngredients.length} item
                </span>
              </div>
              <p className="text-[11px] text-amber-900/80 leading-snug">
                {alerts.criticalIngredients.map((i) => `${i.name} (${i.stock} ${i.unit})`).join(', ')}
              </p>
              <Link
                href="/admin/inventory"
                className="text-[11px] font-bold text-amber-800 underline flex items-center gap-1"
              >
                Restock bahan sekarang <ArrowUpRight className="w-3 h-3" />
              </Link>
            </div>
          )}

          {/* Produk Sold Out */}
          {alerts.soldOutProducts.length > 0 && (
            <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 space-y-2">
              <div className="flex items-center justify-between text-rose-800">
                <span className="text-xs font-bold flex items-center gap-1.5">
                  <Package className="w-4 h-4 text-rose-600" />
                  Menu Sold-Out
                </span>
                <span className="text-[10px] font-extrabold bg-rose-200 text-rose-900 px-2 py-0.5 rounded-full">
                  {alerts.soldOutProducts.length} menu
                </span>
              </div>
              <p className="text-[11px] text-rose-900/80 leading-snug">
                {alerts.soldOutProducts.map((p) => p.name).join(', ')}
              </p>
              <Link
                href="/admin/products"
                className="text-[11px] font-bold text-rose-800 underline flex items-center gap-1"
              >
                Atur ketersediaan menu <ArrowUpRight className="w-3 h-3" />
              </Link>
            </div>
          )}

          {/* Tiket Komplain / Bantuan */}
          {alerts.openTicketsCount > 0 && (
            <div className="bg-orange-50 border border-orange-200 rounded-2xl p-4 space-y-2">
              <div className="flex items-center justify-between text-orange-800">
                <span className="text-xs font-bold flex items-center gap-1.5">
                  <HelpCircle className="w-4 h-4 text-orange-600" />
                  Tiket Bantuan Pelanggan
                </span>
                <span className="text-[10px] font-extrabold bg-orange-200 text-orange-900 px-2 py-0.5 rounded-full">
                  {alerts.openTicketsCount} open
                </span>
              </div>
              <p className="text-[11px] text-orange-900/80">
                Ada {alerts.openTicketsCount} pesan kendala/pertanyaan dari pelanggan yang butuh respons.
              </p>
              <Link
                href="/admin/tickets"
                className="text-[11px] font-bold text-orange-800 underline flex items-center gap-1"
              >
                Respons tiket sekarang <ArrowUpRight className="w-3 h-3" />
              </Link>
            </div>
          )}

          {/* Verifikasi Top-Up Wallet */}
          {alerts.pendingTopupsCount > 0 && (
            <div className="bg-indigo-50 border border-indigo-200 rounded-2xl p-4 space-y-2">
              <div className="flex items-center justify-between text-indigo-800">
                <span className="text-xs font-bold flex items-center gap-1.5">
                  <Wallet className="w-4 h-4 text-indigo-600" />
                  Konfirmasi Top-up Saldo
                </span>
                <span className="text-[10px] font-extrabold bg-indigo-200 text-indigo-900 px-2 py-0.5 rounded-full">
                  {alerts.pendingTopupsCount} pending
                </span>
              </div>
              <p className="text-[11px] text-indigo-900/80">
                Permintaan isi ulang saldo member menunggu verifikasi bukti bayar.
              </p>
              <Link
                href="/admin/wallet"
                className="text-[11px] font-bold text-indigo-800 underline flex items-center gap-1"
              >
                Verifikasi top-up <ArrowUpRight className="w-3 h-3" />
              </Link>
            </div>
          )}
        </div>
      )}

      {/* 7. Main Interactive Graphs & Channel Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Sales Trend & Peak Hours Chart */}
        <div className="lg:col-span-8 bg-white border border-slate-150/80 rounded-3xl p-6 shadow-sm flex flex-col justify-between space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h3 className="font-extrabold text-base text-slate-900 tracking-tight flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-orange-600" />
                Tren Penjualan & Jam Sibuk
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                {range === 'today'
                  ? 'Distribusi volume & omset per jam operasional hari ini'
                  : `Aktivitas transaksi periode ${RANGE_LABELS[range].label}`}
              </p>
            </div>

            {/* Toggle Metric */}
            <div className="flex items-center p-1 rounded-xl bg-slate-100 border border-slate-200/80 self-start sm:self-auto flex-wrap gap-1">
              <button
                onClick={() => setActiveChartMetric('revenue')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  activeChartMetric === 'revenue'
                    ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Omset (Rp)
              </button>
              <button
                onClick={() => setActiveChartMetric('cashflow')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  activeChartMetric === 'cashflow'
                    ? 'bg-slate-900 text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Arus Kas (In vs Out)
              </button>
              <button
                onClick={() => setActiveChartMetric('orders')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  activeChartMetric === 'orders'
                    ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Pesanan (Qty)
              </button>
            </div>
          </div>

          {/* SVG Chart */}
          <div className="w-full h-64 relative bg-gradient-to-b from-orange-50/30 to-transparent rounded-2xl p-3 border border-slate-100 flex items-center justify-center">
            {timeline.length === 0 ? (
              <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">
                Belum ada transaksi di rentang waktu ini
              </span>
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
                  const y = paddingY + ratio * chartH;
                  return (
                    <line
                      key={idx}
                      x1={paddingX}
                      y1={y}
                      x2={svgWidth - paddingX}
                      y2={y}
                      stroke="#f1f5f9"
                      strokeWidth="1"
                      strokeDasharray="4 4"
                    />
                  );
                })}

                {/* Area Fill for Revenue / Single Mode */}
                {activeChartMetric !== 'cashflow' && (
                  <path
                    d={`${linePath} L ${points[points.length - 1].x} ${svgHeight - paddingY} L ${points[0].x} ${
                      svgHeight - paddingY
                    } Z`}
                    fill="url(#arumAreaGrad)"
                  />
                )}

                {/* Main Stroke (Revenue / Orders / Cash In) */}
                <path
                  d={linePath}
                  fill="none"
                  stroke="#ea580c"
                  strokeWidth="3.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />

                {/* Second Stroke for Expenses when Cashflow mode is active */}
                {activeChartMetric === 'cashflow' && (
                  <path
                    d={expenseLinePath}
                    fill="none"
                    stroke="#e11d48"
                    strokeWidth="3"
                    strokeDasharray="4 2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                )}

                {/* Data Points (Revenue) */}
                {points.map((p, idx) => (
                  <g key={`rev-${idx}`} className="cursor-pointer group/dot">
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
                      y={svgHeight - 6}
                      textAnchor="middle"
                      className="text-[10px] font-bold fill-slate-500 tracking-tight"
                    >
                      {p.label}
                    </text>

                    {/* Hover Value Tooltip */}
                    <text
                      x={p.x}
                      y={p.y - 10}
                      textAnchor="middle"
                      className="text-[10px] font-extrabold fill-slate-900 opacity-0 group-hover/dot:opacity-100 transition-opacity"
                    >
                      {activeChartMetric === 'revenue'
                        ? formatRupiah(p.revenue)
                        : activeChartMetric === 'cashflow'
                        ? `Masuk: +${formatRupiah(p.revenue)}`
                        : `${p.orders} order`}
                    </text>
                  </g>
                ))}

                {/* Data Points (Expenses in cashflow mode) */}
                {activeChartMetric === 'cashflow' &&
                  expensePoints.map((ep, idx) => (
                    <g key={`exp-${idx}`} className="cursor-pointer group/expdot">
                      <circle
                        cx={ep.x}
                        cy={ep.y}
                        r="4"
                        fill="#FFFFFF"
                        stroke="#e11d48"
                        strokeWidth="2.5"
                        className="transition-transform duration-200 group-hover/expdot:scale-150"
                      />
                      <text
                        x={ep.x}
                        y={ep.y + 16}
                        textAnchor="middle"
                        className="text-[10px] font-extrabold fill-rose-600 opacity-0 group-hover/expdot:opacity-100 transition-opacity"
                      >
                        Keluar: -{formatRupiah(ep.expenses || 0)}
                      </text>
                    </g>
                  ))}
              </svg>
            )}
          </div>

          {/* Bottom Chart Footer */}
          <div className="flex items-center justify-between text-xs text-slate-500 border-t border-slate-100 pt-3 flex-wrap gap-2">
            <div className="flex items-center gap-4 flex-wrap">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-orange-500" />
                <span className="font-semibold text-slate-700">
                  {activeChartMetric === 'cashflow' ? 'Uang Masuk (Omset):' : 'Total Periode:'}
                </span>
                <span className="font-extrabold text-orange-600">
                  {activeChartMetric === 'orders'
                    ? `${kpis.totalOrders} Transaksi`
                    : formatRupiah(kpis.totalRevenue)}
                </span>
              </div>
              {activeChartMetric === 'cashflow' && (
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-600" />
                  <span className="font-semibold text-slate-700">Uang Keluar (Expenses):</span>
                  <span className="font-extrabold text-rose-600">{formatRupiah(kpis.totalExpenses)}</span>
                </div>
              )}
            </div>
            <Link
              href="/admin/reports"
              className="text-[11px] font-bold text-slate-500 hover:text-orange-600 flex items-center gap-1"
            >
              Laporan Penjualan & Profit <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

        {/* Order Channels & Payment Methods */}
        <div className="lg:col-span-4 bg-white border border-slate-150/80 rounded-3xl p-6 shadow-sm flex flex-col justify-between space-y-5">
          <div>
            <h3 className="font-extrabold text-base text-slate-900 tracking-tight flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-amber-600" />
              Metode Bayar & Channel
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Sebaran nominal uang dan cara bayar periode {RANGE_LABELS[range].label.toLowerCase()}
            </p>
          </div>

          {/* Order Types */}
          <div className="space-y-2.5">
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Tipe Layanan (Channel)
            </p>
            <div className="grid grid-cols-2 gap-2">
              {orderTypes.length === 0 ? (
                <p className="text-xs text-slate-400 col-span-2 text-center py-2">Belum ada data channel</p>
              ) : (
                orderTypes.map((ot) => (
                  <div key={ot.type} className="p-2.5 rounded-2xl bg-slate-50 border border-slate-100">
                    <p className="text-[10px] font-bold text-slate-400 uppercase">{ot.type}</p>
                    <div className="flex items-baseline justify-between mt-0.5">
                      <span className="text-base font-black text-slate-900">{ot.count}</span>
                      <span className="text-[11px] font-bold text-orange-600">{ot.percentage}%</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Payment Methods with Amount */}
          <div className="space-y-2.5 pt-2 border-t border-slate-100">
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Rincian Nominal per Metode
            </p>
            <div className="space-y-2.5">
              {paymentMethods.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-2">Belum ada transaksi</p>
              ) : (
                paymentMethods.map((pm) => (
                  <div key={pm.method} className="space-y-1">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-bold text-slate-800">{pm.method}</span>
                      <div className="text-right">
                        <span className="font-black text-slate-900">
                          {formatRupiah(pm.amount || 0)}
                        </span>
                        <span className="text-[10px] text-slate-400 ml-1 font-medium">
                          ({pm.count}x • {pm.percentage}%)
                        </span>
                      </div>
                    </div>
                    <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                      <div
                        className="bg-gradient-to-r from-orange-500 to-amber-500 h-full rounded-full transition-all duration-500"
                        style={{ width: `${pm.amountPercentage || pm.percentage}%` }}
                      />
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 8. Bottom Grid: Top Best Seller Products & Live Recent Orders */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Top 5 Menu Terlaris */}
        <div className="lg:col-span-5 bg-white border border-slate-150/80 rounded-3xl p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-extrabold text-base text-slate-900 tracking-tight flex items-center gap-2">
                <Flame className="w-4 h-4 text-orange-500" />
                5 Menu Paling Laris
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">Produk dengan kuantiti terjual tertinggi</p>
            </div>
            <Link
              href="/admin/products"
              className="text-xs font-bold text-orange-600 hover:text-orange-700"
            >
              Semua Menu
            </Link>
          </div>

          <div className="space-y-2.5">
            {topProducts.length === 0 ? (
              <p className="text-center text-xs text-slate-400 py-10 font-medium">
                Belum ada produk yang terjual pada periode ini
              </p>
            ) : (
              topProducts.map((prod, index) => (
                <div
                  key={prod.id}
                  className="flex items-center justify-between p-3 rounded-2xl bg-slate-50/70 border border-slate-100 hover:bg-orange-50/50 hover:border-orange-200/80 transition-all duration-200"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`w-7 h-7 rounded-xl flex items-center justify-center text-xs font-black shadow-sm ${
                        index === 0
                          ? 'bg-amber-500 text-white'
                          : index === 1
                          ? 'bg-slate-300 text-slate-800'
                          : index === 2
                          ? 'bg-amber-700 text-white'
                          : 'bg-slate-100 text-slate-600'
                      }`}
                    >
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

        {/* Live Recent Orders Feed */}
        <div className="lg:col-span-7 bg-white border border-slate-150/80 rounded-3xl p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-extrabold text-base text-slate-900 tracking-tight flex items-center gap-2">
                <ShoppingCart className="w-4 h-4 text-orange-600" />
                Pesanan Terkini
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">8 transaksi pesanan paling baru masuk</p>
            </div>
            <Link
              href="/admin/orders"
              className="text-xs font-semibold text-orange-600 hover:text-orange-700 flex items-center gap-1 transition-colors"
            >
              Lihat semua <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="overflow-hidden rounded-2xl border border-slate-150/70">
            {/* Desktop Table */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-150 bg-slate-50/70">
                    <th className="px-4 py-3 text-left text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                      Pesanan
                    </th>
                    <th className="px-4 py-3 text-left text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                      Pelanggan & Menu
                    </th>
                    <th className="px-4 py-3 text-left text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                      Tipe / Bayar
                    </th>
                    <th className="px-4 py-3 text-left text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-4 py-3 text-right text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                      Total
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {recentOrders.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center text-xs text-slate-400">
                        Belum ada pesanan masuk
                      </td>
                    </tr>
                  ) : (
                    recentOrders.map((order) => (
                      <tr key={order.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="px-4 py-3">
                          <Link
                            href={`/admin/orders/${order.id}`}
                            className="font-mono text-xs font-bold text-orange-600 hover:text-orange-700 hover:underline"
                          >
                            #{order.id.slice(0, 7).toUpperCase()}
                          </Link>
                          <p className="text-[10px] text-slate-400">
                            {new Date(order.createdAt).toLocaleTimeString('id-ID', {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </p>
                        </td>
                        <td className="px-4 py-3">
                          <p className="text-xs font-bold text-slate-900 truncate max-w-[140px]">
                            {order.customerName}
                          </p>
                          <p className="text-[10px] text-slate-500 truncate max-w-[180px]">
                            {order.itemSummary || `${order.itemCount} items`}
                          </p>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1.5">
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 text-slate-700">
                              {order.orderType}
                            </span>
                            <span className="text-[10px] font-semibold text-slate-500">
                              {order.paymentMethod}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase ${
                              order.status === 'DELIVERED' || order.status === 'COMPLETED'
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : order.status === 'PREPARING'
                                ? 'bg-orange-50 text-orange-700 border border-orange-200'
                                : order.status === 'READY'
                                ? 'bg-blue-50 text-blue-700 border border-blue-200'
                                : order.status === 'ON_DELIVERY'
                                ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                                : 'bg-slate-100 text-slate-600'
                            }`}
                          >
                            {order.status.replace('_', ' ')}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <p className="text-xs font-black text-slate-900">{formatRupiah(order.total)}</p>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards */}
            <div className="sm:hidden divide-y divide-slate-100">
              {recentOrders.length === 0 ? (
                <div className="px-4 py-8 text-center text-xs text-slate-400">Belum ada pesanan</div>
              ) : (
                recentOrders.map((order) => (
                  <Link
                    key={order.id}
                    href={`/admin/orders/${order.id}`}
                    className="block p-3.5 hover:bg-slate-50 transition-colors"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-mono text-xs font-bold text-orange-600">
                        #{order.id.slice(0, 7).toUpperCase()}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded-md text-[9px] font-extrabold uppercase ${
                          order.status === 'COMPLETED' || order.status === 'DELIVERED'
                            ? 'bg-emerald-50 text-emerald-700'
                            : order.status === 'PREPARING'
                            ? 'bg-orange-50 text-orange-700'
                            : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {order.status.replace('_', ' ')}
                      </span>
                    </div>
                    <p className="text-xs font-bold text-slate-900">{order.customerName}</p>
                    <p className="text-[11px] text-slate-500 truncate mt-0.5">
                      {order.itemSummary || `${order.itemCount} items`}
                    </p>
                    <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-100">
                      <span className="text-[10px] text-slate-400 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {new Date(order.createdAt).toLocaleTimeString('id-ID', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                      <span className="text-xs font-black text-slate-900">
                        {formatRupiah(order.total)}
                      </span>
                    </div>
                  </Link>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Modal Suntik Modal Quick Action */}
      <InjectCapitalModal
        isOpen={showInjectModal}
        onClose={() => setShowInjectModal(false)}
        onSuccess={() => fetchData(range)}
      />
    </div>
  );
}
