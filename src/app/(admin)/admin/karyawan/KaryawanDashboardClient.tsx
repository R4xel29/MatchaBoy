'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { 
  Coffee, 
  Receipt, 
  ClipboardCheck, 
  Clock, 
  Sparkles, 
  ChefHat, 
  Archive, 
  TrendingUp, 
  UserCheck, 
  Bell, 
  Play, 
  CheckCircle2, 
  AlertTriangle, 
  Layers, 
  Coins, 
  LogOut, 
  Plus, 
  RefreshCw, 
  Printer, 
  ExternalLink,
  ChevronRight,
  ShieldCheck,
  Store,
  DollarSign,
  Utensils,
  Calendar,
  X,
  ArrowRight,
  SlidersHorizontal,
  Flame
} from 'lucide-react';
import { formatRupiah, cn } from '@/lib/utils';
import { formatOrderCardModifiers } from '@/lib/receipt-modifiers';
import { useToast } from '@/components/ui/Toast';

export interface ShiftData {
  id: string;
  cashierId: string;
  openedAt: string;
  closedAt: string | null;
  openingCash: number;
  closingCash: number | null;
  totalOrders: number;
  totalRevenue: number;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ShiftReconciliation {
  openingCash: number;
  cashIn: number;
  qrisIn: number;
  otherIn: number;
  cashOut: number;
  expectedCash: number;
  totalOrders: number;
  totalRevenue: number;
  expensesList?: Array<{ id: string; name: string; amount: number; date: string }>;
}

export interface OrderItemData {
  id: string;
  productId: string;
  qty: number;
  price: number;
  modifiers?: string | null;
  product: {
    name: string;
    category?: { name: string } | null;
  };
}

export interface LiveOrderData {
  id: string;
  dailyOrderNumber?: number | null;
  queueNumber?: string | null;
  customerName: string;
  customerPhone: string;
  orderType: string;
  tableNumber?: string | null;
  notes?: string | null;
  total: number;
  paymentMethod: string;
  status: string;
  createdAt: string;
  items: OrderItemData[];
}

export interface SopTemplateData {
  id: string;
  category: string;
  jobdeskCode: string;
  title: string;
  description: string | null;
  isPhotoRequired: boolean;
  sortOrder: number;
  isActive: boolean;
}

export interface SopSubmissionData {
  id: string;
  shiftType: string;
  jobdeskCode: string | null;
  status: string;
  createdAt: string;
  items: Array<{
    id: string;
    templateItemId: string | null;
    label: string;
    isChecked: boolean;
  }>;
}

export interface IngredientData {
  id: string;
  name: string;
  stock: number;
  unit: string;
}

export interface ActiveStaffData {
  id: string;
  openedAt: string;
  cashier: {
    id: string;
    name: string | null;
    image: string | null;
    jobdeskCode?: string | null;
  };
}

export interface KaryawanInitialData {
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
    jobdeskCode?: string | null;
  };
  activeShift: ShiftData | null;
  reconciliation: ShiftReconciliation | null;
  recentShifts: ShiftData[];
  liveOrders: LiveOrderData[];
  sopTemplates: SopTemplateData[];
  userTodaySubmissions: SopSubmissionData[];
  criticalIngredients: IngredientData[];
  activeStaff: ActiveStaffData[];
  storeSettings?: {
    storeName?: string | null;
    openTime?: string | null;
    closeTime?: string | null;
    storeAddress?: string | null;
  } | null;
  activePromo?: {
    title?: string | null;
    linkUrl?: string | null;
  } | null;
  allJobdesks?: Array<{ code: string; name: string }>;
}

export default function KaryawanDashboardClient({
  initialData,
}: {
  initialData: KaryawanInitialData;
}) {
  const router = useRouter();
  const { showToast } = useToast();

  // State data
  const [data, setData] = useState<KaryawanInitialData>(initialData);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [currentTime, setCurrentTime] = useState<Date | null>(null);

  // Filter tabs for Live Orders
  const [orderFilter, setOrderFilter] = useState<'ALL' | 'PENDING' | 'PREPARING' | 'READY'>('ALL');
  const [updatingOrderId, setUpdatingOrderId] = useState<string | null>(null);

  // Modal states
  const [isShiftOpenModalOpen, setIsShiftOpenModalOpen] = useState(false);
  const [isShiftCloseModalOpen, setIsShiftCloseModalOpen] = useState(false);

  // Form states for Open Shift
  const [openShiftCash, setOpenShiftCash] = useState('100000');
  const [openShiftNotes, setOpenShiftNotes] = useState('');
  const [isSubmittingShift, setIsSubmittingShift] = useState(false);

  // Form states for Close Shift
  const [closeActualCash, setCloseActualCash] = useState('');
  const [closeShiftNotes, setCloseShiftNotes] = useState('');

  // Shift timer
  const [shiftDuration, setShiftDuration] = useState('00:00:00');

  // Clock effect
  useEffect(() => {
    setCurrentTime(new Date());
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Live Shift Duration Effect
  useEffect(() => {
    if (!data.activeShift?.openedAt) {
      setShiftDuration('00:00:00');
      return;
    }

    const updateDuration = () => {
      const start = new Date(data.activeShift!.openedAt).getTime();
      const now = Date.now();
      const diff = Math.max(0, Math.floor((now - start) / 1000));

      const hours = Math.floor(diff / 3600);
      const minutes = Math.floor((diff % 3600) / 60);
      const seconds = diff % 60;

      const pad = (n: number) => n.toString().padStart(2, '0');
      setShiftDuration(`${pad(hours)}:${pad(minutes)}:${pad(seconds)}`);
    };

    updateDuration();
    const interval = setInterval(updateDuration, 1000);
    return () => clearInterval(interval);
  }, [data.activeShift]);

  // Refresh data from API
  const refreshData = useCallback(async (quiet = false) => {
    if (!quiet) setIsRefreshing(true);
    try {
      const res = await fetch('/api/admin/karyawan', { cache: 'no-store' });
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data) {
          setData((prev) => ({
            ...prev,
            ...json.data,
            allJobdesks: prev.allJobdesks,
          }));
        }
      }
    } catch (err) {
      console.error('Error refreshing karyawan data:', err);
    } finally {
      if (!quiet) setIsRefreshing(false);
    }
  }, []);

  // Periodic polling for kitchen queue & shift every 15 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      refreshData(true);
    }, 15000);
    return () => clearInterval(interval);
  }, [refreshData]);

  // Order status advancement (PENDING -> PREPARING -> READY -> COMPLETED)
  const advanceOrderStatus = async (orderId: string, currentStatus: string) => {
    let nextStatus = 'PREPARING';
    if (currentStatus === 'PENDING') nextStatus = 'PREPARING';
    else if (currentStatus === 'PREPARING') nextStatus = 'READY';
    else if (currentStatus === 'READY') nextStatus = 'COMPLETED';

    setUpdatingOrderId(orderId);
    try {
      const res = await fetch(`/api/admin/orders/${orderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus }),
      });

      if (!res.ok) throw new Error('Gagal memperbarui status');

      // Optimistic update
      setData((prev) => ({
        ...prev,
        liveOrders: prev.liveOrders
          .map((o) => (o.id === orderId ? { ...o, status: nextStatus } : o))
          .filter((o) => nextStatus !== 'COMPLETED' || o.id !== orderId),
      }));

      const statusLabels: Record<string, string> = {
        PREPARING: 'Sedang diseduh / dimasak',
        READY: 'Pesanan siap disajikan',
        COMPLETED: 'Pesanan telah selesai',
      };

      showToast(`Status pesanan: ${statusLabels[nextStatus] || nextStatus}`, 'success');
      refreshData(true);
    } catch {
      showToast('Gagal mengubah status pesanan. Coba lagi.', 'error');
    } finally {
      setUpdatingOrderId(null);
    }
  };

  // Open Shift Handler
  const handleOpenShift = async (e: React.FormEvent) => {
    e.preventDefault();
    const openingVal = parseInt(openShiftCash.replace(/[^0-9]/g, '')) || 0;
    setIsSubmittingShift(true);
    try {
      const res = await fetch('/api/cashier/shift', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          openingCash: openingVal,
          notes: openShiftNotes.trim() || null,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Gagal membuka shift');
      }

      showToast('Shift berhasil dibuka! Selamat bertugas di Arum Seduh.', 'success');
      setIsShiftOpenModalOpen(false);
      setOpenShiftNotes('');
      await refreshData();
    } catch (err: any) {
      showToast(err.message || 'Terjadi kesalahan saat membuka shift', 'error');
    } finally {
      setIsSubmittingShift(false);
    }
  };

  // Close Shift Handler
  const handleCloseShift = async (e: React.FormEvent) => {
    e.preventDefault();
    const actualCashVal = parseInt(closeActualCash.replace(/[^0-9]/g, '')) || 0;
    setIsSubmittingShift(true);
    try {
      const res = await fetch('/api/cashier/shift', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          actualCash: actualCashVal,
          notes: closeShiftNotes.trim() || '',
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Gagal menutup shift');
      }

      showToast('Shift berhasil ditutup dan direkonsiliasi.', 'success');
      setIsShiftCloseModalOpen(false);
      setCloseActualCash('');
      setCloseShiftNotes('');
      await refreshData();
    } catch (err: any) {
      showToast(err.message || 'Gagal menutup shift', 'error');
    } finally {
      setIsSubmittingShift(false);
    }
  };

  // Filtered Orders
  const filteredOrders = useMemo(() => {
    if (orderFilter === 'ALL') return data.liveOrders;
    return data.liveOrders.filter((o) => o.status === orderFilter);
  }, [data.liveOrders, orderFilter]);

  // Order Counts
  const orderCounts = useMemo(() => {
    const counts = { ALL: data.liveOrders.length, PENDING: 0, PREPARING: 0, READY: 0 };
    data.liveOrders.forEach((o) => {
      if (o.status === 'PENDING') counts.PENDING++;
      else if (o.status === 'PREPARING') counts.PREPARING++;
      else if (o.status === 'READY') counts.READY++;
    });
    return counts;
  }, [data.liveOrders]);

  // SOP Summary calculation
  const sopStats = useMemo(() => {
    const userJobdesk = data.user.jobdeskCode || 'GENERAL';
    // Templates matching user's jobdesk or GENERAL
    const relevantTemplates = data.sopTemplates.filter(
      (t) => t.jobdeskCode === userJobdesk || t.jobdeskCode === 'GENERAL'
    );

    // Get all checked template ids from today's submissions
    const checkedTemplateIds = new Set<string>();
    data.userTodaySubmissions.forEach((sub) => {
      sub.items.forEach((item) => {
        if (item.isChecked && item.templateItemId) {
          checkedTemplateIds.add(item.templateItemId);
        }
      });
    });

    const totalCount = relevantTemplates.length;
    const completedCount = relevantTemplates.filter((t) => checkedTemplateIds.has(t.id)).length;
    const percentage = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 100;

    return {
      totalCount,
      completedCount,
      percentage,
      templates: relevantTemplates,
      checkedTemplateIds,
    };
  }, [data.sopTemplates, data.userTodaySubmissions, data.user.jobdeskCode]);

  // Jobdesk label helper
  const jobdeskDisplay = useMemo(() => {
    if (data.user.jobdeskCode) {
      const found = data.allJobdesks?.find((j) => j.code === data.user.jobdeskCode);
      if (found) return found.name;
      return data.user.jobdeskCode.replace('_', ' ');
    }
    return 'Staf Karyawan';
  }, [data.user.jobdeskCode, data.allJobdesks]);

  return (
    <div className="space-y-6 pb-12">
      {/* ------------------------------------------------------------- */}
      {/* 1. TOP HEADER & SHIFT STATUS BANNER                           */}
      {/* ------------------------------------------------------------- */}
      <div className="bg-white rounded-2xl p-5 sm:p-6 shadow-sm border border-orange-100/80 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-gradient-to-bl from-orange-400/10 via-amber-200/10 to-transparent rounded-full blur-2xl -mr-20 -mt-20 pointer-events-none" />

        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5 relative z-10">
          {/* Staff Info */}
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-orange-500 to-amber-500 p-0.5 shadow-md shadow-orange-500/20 shrink-0">
              <div className="w-full h-full bg-white rounded-[14px] flex items-center justify-center text-orange-600 font-bold text-xl">
                {data.user.name.charAt(0).toUpperCase()}
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl sm:text-2xl font-black text-slate-800 tracking-tight">
                  Halo, {data.user.name}!
                </h1>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-orange-50 text-orange-700 border border-orange-200/70">
                  <Coffee className="w-3.5 h-3.5 text-orange-500" />
                  {jobdeskDisplay}
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                Dashboard Operasional Karyawan • Arum Seduh Outlet
              </p>
            </div>
          </div>

          {/* Clock & Refresh Actions */}
          <div className="flex items-center gap-3 self-start lg:self-center flex-wrap">
            <div className="px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center gap-2 text-slate-700">
              <Clock className="w-4 h-4 text-orange-500 shrink-0" />
              <div className="text-xs font-medium">
                <span className="font-semibold text-slate-800">
                  {currentTime ? currentTime.toLocaleTimeString('id-ID') : '--:--:--'} WIB
                </span>
                <span className="text-slate-400 mx-1.5">•</span>
                <span className="text-slate-600">
                  {currentTime
                    ? currentTime.toLocaleDateString('id-ID', {
                        weekday: 'short',
                        day: 'numeric',
                        month: 'short',
                      })
                    : '...'}
                </span>
              </div>
            </div>

            <button
              onClick={() => refreshData(false)}
              disabled={isRefreshing}
              className="p-2.5 rounded-xl bg-orange-50 hover:bg-orange-100 text-orange-600 border border-orange-200/80 transition-colors disabled:opacity-50"
              title="Perbarui Data"
            >
              <RefreshCw className={cn('w-4 h-4', isRefreshing && 'animate-spin')} />
            </button>
          </div>
        </div>

        {/* Shift Live Card Banner */}
        <div className="mt-5 pt-5 border-t border-slate-100">
          {data.activeShift ? (
            <div className="bg-gradient-to-r from-emerald-500/10 via-teal-500/5 to-transparent p-4 rounded-xl border border-emerald-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="relative flex items-center justify-center">
                  <span className="w-3 h-3 rounded-full bg-emerald-500 animate-ping absolute" />
                  <span className="w-3 h-3 rounded-full bg-emerald-500 relative" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-emerald-800 bg-emerald-100/80 px-2 py-0.5 rounded-md">
                      Shift Sedang Berjalan
                    </span>
                    <span className="text-xs text-slate-500">
                      Buka: {new Date(data.activeShift.openedAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} WIB
                    </span>
                  </div>
                  <div className="text-sm font-semibold text-slate-700 mt-1 flex items-center gap-2">
                    <span>Durasi Kerja:</span>
                    <span className="font-mono text-base font-black text-emerald-700 bg-white px-2 py-0.5 rounded border border-emerald-200 shadow-sm">
                      {shiftDuration}
                    </span>
                    <span className="text-xs text-slate-400">
                      (Kas Awal: {formatRupiah(data.activeShift.openingCash)})
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2.5">
                <Link
                  href="/admin/cashier"
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white text-xs font-bold shadow-sm shadow-orange-500/20 transition-all flex items-center gap-1.5"
                >
                  <Store className="w-3.5 h-3.5" />
                  Buka Kasir (POS)
                </Link>
                <button
                  onClick={() => {
                    setCloseActualCash(data.reconciliation ? String(data.reconciliation.expectedCash) : '');
                    setIsShiftCloseModalOpen(true);
                  }}
                  className="px-4 py-2 rounded-xl bg-white hover:bg-rose-50 text-rose-700 border border-rose-200 text-xs font-bold shadow-sm transition-all flex items-center gap-1.5"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  Tutup Shift
                </button>
              </div>
            </div>
          ) : (
            <div className="bg-amber-50/80 p-4 rounded-xl border border-amber-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-amber-100 flex items-center justify-center text-amber-700 shrink-0">
                  <Clock className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-amber-900">Belum Ada Shift Kasir Aktif</h4>
                  <p className="text-xs text-amber-700 mt-0.5">
                    Buka shift sebelum melayani transaksi kasir dan mencatat kas masuk di outlet.
                  </p>
                </div>
              </div>

              <button
                onClick={() => setIsShiftOpenModalOpen(true)}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white text-xs font-bold shadow-md shadow-orange-500/20 transition-all flex items-center justify-center gap-2 shrink-0"
              >
                <Play className="w-3.5 h-3.5" />
                Buka Shift Sekarang
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* 2. SHIFT KPI CARDS                                            */}
      {/* ------------------------------------------------------------- */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Card 1: Orders in Shift */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 shadow-sm border border-orange-100/60">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Pesanan Shift</span>
            <div className="p-2 rounded-xl bg-orange-50 text-orange-600">
              <Receipt className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2.5">
            <span className="text-2xl font-black text-slate-800">
              {data.reconciliation ? data.reconciliation.totalOrders : 0}
            </span>
            <span className="text-xs text-slate-400 ml-1.5">transaksi</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Selesai pada sesi shift aktif</p>
        </div>

        {/* Card 2: Revenue Shift */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 shadow-sm border border-orange-100/60">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Omset Shift</span>
            <div className="p-2 rounded-xl bg-amber-50 text-amber-600">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2.5">
            <span className="text-xl sm:text-2xl font-black text-slate-800">
              {data.reconciliation ? formatRupiah(data.reconciliation.totalRevenue) : 'Rp 0'}
            </span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            {data.reconciliation
              ? `Tunai: ${formatRupiah(data.reconciliation.cashIn)} • QRIS: ${formatRupiah(data.reconciliation.qrisIn)}`
              : 'Menunggu transaksi shift'}
          </p>
        </div>

        {/* Card 3: Cash in Drawer */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 shadow-sm border border-orange-100/60">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Uang Laci (Seharusnya)</span>
            <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600">
              <Coins className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2.5">
            <span className="text-xl sm:text-2xl font-black text-emerald-700">
              {data.reconciliation ? formatRupiah(data.reconciliation.expectedCash) : 'Rp 0'}
            </span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Modal Awal + Kas Masuk - Kas Keluar</p>
        </div>

        {/* Card 4: Petty Cash Out */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 shadow-sm border border-orange-100/60">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Kas Kecil Keluar</span>
            <div className="p-2 rounded-xl bg-rose-50 text-rose-600">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2.5">
            <span className="text-xl sm:text-2xl font-black text-slate-800">
              {data.reconciliation ? formatRupiah(data.reconciliation.cashOut) : 'Rp 0'}
            </span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Pengeluaran laci kasir hari ini</p>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* 3. QUICK ACTIONS GRID                                         */}
      {/* ------------------------------------------------------------- */}
      <div className="bg-white rounded-2xl p-5 shadow-sm border border-orange-100/80">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3.5 flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-orange-500" />
          Akses Cepat Karyawan
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <Link
            href="/admin/cashier"
            className="p-3.5 rounded-xl bg-orange-50/60 hover:bg-orange-100/80 border border-orange-200/80 transition-all text-center flex flex-col items-center group"
          >
            <div className="w-10 h-10 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 text-white flex items-center justify-center shadow-sm shadow-orange-500/20 group-hover:scale-105 transition-transform mb-2">
              <Store className="w-5 h-5" />
            </div>
            <span className="text-xs font-bold text-slate-800">Kasir POS</span>
            <span className="text-[10px] text-slate-400 mt-0.5">Input Transaksi</span>
          </Link>

          <Link
            href="/admin/orders"
            className="p-3.5 rounded-xl bg-amber-50/60 hover:bg-amber-100/80 border border-amber-200/80 transition-all text-center flex flex-col items-center group"
          >
            <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center shadow-sm shadow-amber-500/20 group-hover:scale-105 transition-transform mb-2">
              <ChefHat className="w-5 h-5" />
            </div>
            <span className="text-xs font-bold text-slate-800">Antrean Dapur</span>
            <span className="text-[10px] text-slate-400 mt-0.5">Semua Pesanan</span>
          </Link>

          <Link
            href="/admin/inspections"
            className="p-3.5 rounded-xl bg-slate-50 hover:bg-slate-100/80 border border-slate-200 transition-all text-center flex flex-col items-center group"
          >
            <div className="w-10 h-10 rounded-xl bg-slate-800 text-white flex items-center justify-center shadow-sm group-hover:scale-105 transition-transform mb-2">
              <ClipboardCheck className="w-5 h-5" />
            </div>
            <span className="text-xs font-bold text-slate-800">Checklist SOP</span>
            <span className="text-[10px] text-slate-400 mt-0.5">Audit & Form</span>
          </Link>

          <Link
            href="/admin/inventory"
            className="p-3.5 rounded-xl bg-slate-50 hover:bg-slate-100/80 border border-slate-200 transition-all text-center flex flex-col items-center group"
          >
            <div className="w-10 h-10 rounded-xl bg-slate-700 text-white flex items-center justify-center shadow-sm group-hover:scale-105 transition-transform mb-2">
              <Archive className="w-5 h-5" />
            </div>
            <span className="text-xs font-bold text-slate-800">Stok Bahan</span>
            <span className="text-[10px] text-slate-400 mt-0.5">Gudang & Bar</span>
          </Link>

          <Link
            href="/admin/finances/expenses"
            className="p-3.5 rounded-xl bg-slate-50 hover:bg-slate-100/80 border border-slate-200 transition-all text-center flex flex-col items-center group"
          >
            <div className="w-10 h-10 rounded-xl bg-rose-500 text-white flex items-center justify-center shadow-sm shadow-rose-500/20 group-hover:scale-105 transition-transform mb-2">
              <Coins className="w-5 h-5" />
            </div>
            <span className="text-xs font-bold text-slate-800">Kas Kecil</span>
            <span className="text-[10px] text-slate-400 mt-0.5">Catat Beban</span>
          </Link>

          <Link
            href="/admin/cashier/add-points"
            className="p-3.5 rounded-xl bg-slate-50 hover:bg-slate-100/80 border border-slate-200 transition-all text-center flex flex-col items-center group"
          >
            <div className="w-10 h-10 rounded-xl bg-indigo-500 text-white flex items-center justify-center shadow-sm shadow-indigo-500/20 group-hover:scale-105 transition-transform mb-2">
              <Sparkles className="w-5 h-5" />
            </div>
            <span className="text-xs font-bold text-slate-800">Tambah Poin</span>
            <span className="text-[10px] text-slate-400 mt-0.5">Loyalitas Member</span>
          </Link>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* 4. MAIN WORKSPACE: LIVE KITCHEN QUEUE & RIGHT SIDEBAR         */}
      {/* ------------------------------------------------------------- */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* LEFT 2 COLUMNS: LIVE KITCHEN / BARISTA QUEUE */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-orange-100/80">
            {/* Header & Filter Tabs */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-orange-50 text-orange-600">
                  <Utensils className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-slate-800 tracking-tight">
                    Antrean Masak & Seduh Dapur
                  </h3>
                  <p className="text-xs text-slate-400">
                    Siklus pesanan: Menunggu Masak → Sedang Diseduh → Siap Saji
                  </p>
                </div>
              </div>

              {/* Status Tabs */}
              <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-100 text-xs self-start sm:self-auto overflow-x-auto max-w-full">
                <button
                  onClick={() => setOrderFilter('ALL')}
                  className={cn(
                    'px-2.5 py-1.5 rounded-lg font-bold transition-all shrink-0',
                    orderFilter === 'ALL'
                      ? 'bg-white text-slate-800 shadow-sm'
                      : 'text-slate-500 hover:text-slate-800'
                  )}
                >
                  Semua ({orderCounts.ALL})
                </button>
                <button
                  onClick={() => setOrderFilter('PENDING')}
                  className={cn(
                    'px-2.5 py-1.5 rounded-lg font-bold transition-all shrink-0',
                    orderFilter === 'PENDING'
                      ? 'bg-orange-500 text-white shadow-sm'
                      : 'text-slate-500 hover:text-slate-800'
                  )}
                >
                  Menunggu ({orderCounts.PENDING})
                </button>
                <button
                  onClick={() => setOrderFilter('PREPARING')}
                  className={cn(
                    'px-2.5 py-1.5 rounded-lg font-bold transition-all shrink-0',
                    orderFilter === 'PREPARING'
                      ? 'bg-amber-500 text-white shadow-sm'
                      : 'text-slate-500 hover:text-slate-800'
                  )}
                >
                  Diseduh ({orderCounts.PREPARING})
                </button>
                <button
                  onClick={() => setOrderFilter('READY')}
                  className={cn(
                    'px-2.5 py-1.5 rounded-lg font-bold transition-all shrink-0',
                    orderFilter === 'READY'
                      ? 'bg-emerald-500 text-white shadow-sm'
                      : 'text-slate-500 hover:text-slate-800'
                  )}
                >
                  Siap Saji ({orderCounts.READY})
                </button>
              </div>
            </div>

            {/* Orders List */}
            <div className="pt-4 space-y-3">
              {filteredOrders.length === 0 ? (
                <div className="py-12 text-center text-slate-400">
                  <CheckCircle2 className="w-10 h-10 mx-auto text-emerald-400 mb-2 opacity-80" />
                  <p className="text-sm font-semibold text-slate-600">Tidak ada antrean pesanan pada tab ini</p>
                  <p className="text-xs text-slate-400 mt-0.5">Semua pesanan selesai atau sedang menunggu pesanan baru masuk.</p>
                </div>
              ) : (
                filteredOrders.map((order) => {
                  const orderDate = new Date(order.createdAt);
                  const waitMinutes = Math.floor((Date.now() - orderDate.getTime()) / 60000);

                  return (
                    <div
                      key={order.id}
                      className={cn(
                        'p-4 rounded-xl border transition-all relative overflow-hidden',
                        order.status === 'PENDING' && 'bg-orange-50/40 border-orange-200/80',
                        order.status === 'PREPARING' && 'bg-amber-50/40 border-amber-200/80',
                        order.status === 'READY' && 'bg-emerald-50/40 border-emerald-200/80'
                      )}
                    >
                      {/* Top Row: Identifier, Table, Time */}
                      <div className="flex items-center justify-between gap-2 flex-wrap mb-2.5">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono font-black text-sm text-slate-800 bg-white px-2 py-0.5 rounded border shadow-sm">
                            {order.queueNumber ? `#${order.queueNumber}` : `#${order.id.slice(-5).toUpperCase()}`}
                          </span>
                          <span className="font-bold text-sm text-slate-800">{order.customerName}</span>
                          {order.tableNumber && (
                            <span className="text-xs font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-md">
                              Meja {order.tableNumber}
                            </span>
                          )}
                          <span className="text-[11px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                            {order.orderType === 'DINE_IN' ? 'Dine In' : 'Take Away'}
                          </span>
                        </div>

                        <div className="flex items-center gap-2 text-xs text-slate-500">
                          <span className="flex items-center gap-1 font-medium">
                            <Clock className="w-3.5 h-3.5 text-slate-400" />
                            {waitMinutes} mnt lalu
                          </span>
                          <span
                            className={cn(
                              'px-2 py-0.5 rounded-full text-[11px] font-black uppercase tracking-wider',
                              order.status === 'PENDING' && 'bg-orange-100 text-orange-700',
                              order.status === 'PREPARING' && 'bg-amber-100 text-amber-700',
                              order.status === 'READY' && 'bg-emerald-100 text-emerald-700'
                            )}
                          >
                            {order.status === 'PENDING' && 'Menunggu Masak'}
                            {order.status === 'PREPARING' && 'Sedang Diseduh'}
                            {order.status === 'READY' && 'Siap Saji'}
                          </span>
                        </div>
                      </div>

                      {/* Items List */}
                      <div className="space-y-1.5 my-3 pl-1 border-l-2 border-slate-200">
                        {order.items.map((item) => {
                          const { tags } = formatOrderCardModifiers(
                            item.modifiers,
                            item.product?.name
                          );

                          return (
                            <div key={item.id} className="text-xs text-slate-700 flex items-start gap-2">
                              <span className="font-bold text-orange-600 shrink-0">{item.qty}x</span>
                              <div>
                                <span className="font-semibold text-slate-800">{item.product?.name}</span>
                                {tags && tags.length > 0 && (
                                  <div className="flex items-center gap-1 flex-wrap mt-0.5">
                                    {tags.map((t, idx) => (
                                      <span
                                        key={idx}
                                        className="text-[10px] font-medium bg-white text-slate-600 px-1.5 py-0.5 rounded border border-slate-200 shadow-2xs"
                                      >
                                        {t}
                                      </span>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}

                        {order.notes && (
                          <p className="text-[11px] text-amber-800 bg-amber-50 p-1.5 rounded mt-1.5 italic">
                            Catatan: {order.notes}
                          </p>
                        )}
                      </div>

                      {/* Action Button Row */}
                      <div className="flex items-center justify-between pt-2 border-t border-slate-200/60 mt-2">
                        <span className="text-xs font-bold text-slate-600">
                          Total: {formatRupiah(order.total)} • <span className="text-slate-400">{order.paymentMethod}</span>
                        </span>

                        <div className="flex items-center gap-2">
                          {order.status === 'PENDING' && (
                            <button
                              onClick={() => advanceOrderStatus(order.id, 'PENDING')}
                              disabled={updatingOrderId === order.id}
                              className="px-3 py-1.5 rounded-lg bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm shadow-orange-500/20 disabled:opacity-50"
                            >
                              <Play className="w-3.5 h-3.5" />
                              Mulai Seduh / Masak
                            </button>
                          )}

                          {order.status === 'PREPARING' && (
                            <button
                              onClick={() => advanceOrderStatus(order.id, 'PREPARING')}
                              disabled={updatingOrderId === order.id}
                              className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm shadow-amber-500/20 disabled:opacity-50"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              Pesanan Siap Saji
                            </button>
                          )}

                          {order.status === 'READY' && (
                            <button
                              onClick={() => advanceOrderStatus(order.id, 'READY')}
                              disabled={updatingOrderId === order.id}
                              className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm shadow-emerald-600/20 disabled:opacity-50"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              Selesaikan / Diambil
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* RIGHT 1 COLUMN: SOP, CRITICAL STOCK & OUTLET NOTICE */}
        <div className="space-y-6">
          {/* 1. SOP Operasional Card */}
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-orange-100/80">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-orange-50 text-orange-600">
                  <ClipboardCheck className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-bold text-sm text-slate-800">SOP Operasional</h4>
                  <p className="text-[11px] text-slate-400">Tugas {jobdeskDisplay}</p>
                </div>
              </div>
              <span className="text-xs font-black text-orange-600 bg-orange-50 px-2 py-0.5 rounded-md">
                {sopStats.percentage}%
              </span>
            </div>

            {/* Progress Bar */}
            <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden mb-3">
              <div
                className="h-full bg-gradient-to-r from-orange-500 to-amber-500 transition-all duration-500"
                style={{ width: `${sopStats.percentage}%` }}
              />
            </div>
            <p className="text-xs text-slate-500 mb-3">
              {sopStats.completedCount} dari {sopStats.totalCount} tugas SOP hari ini selesai
            </p>

            {/* List of 4 sample tasks */}
            <div className="space-y-2">
              {sopStats.templates.slice(0, 4).map((t) => {
                const isDone = sopStats.checkedTemplateIds.has(t.id);
                return (
                  <div
                    key={t.id}
                    className={cn(
                      'p-2.5 rounded-xl border text-xs flex items-start gap-2 transition-colors',
                      isDone
                        ? 'bg-emerald-50/50 border-emerald-200/80 text-emerald-800'
                        : 'bg-slate-50 border-slate-200/80 text-slate-700'
                    )}
                  >
                    <CheckCircle2
                      className={cn(
                        'w-4 h-4 shrink-0 mt-0.5',
                        isDone ? 'text-emerald-600' : 'text-slate-300'
                      )}
                    />
                    <div className="flex-1 min-w-0">
                      <p className={cn('font-medium leading-tight', isDone && 'line-through text-slate-400')}>
                        {t.title}
                      </p>
                      <span className="text-[10px] text-slate-400 uppercase font-semibold">
                        {t.category}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            <Link
              href="/admin/inspections"
              className="mt-4 w-full py-2 px-3 rounded-xl bg-slate-50 hover:bg-orange-50 text-orange-600 hover:text-orange-700 border border-orange-200/60 text-xs font-bold transition-all flex items-center justify-center gap-1.5"
            >
              <span>Isi Checklist SOP Lengkap</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {/* 2. Critical Ingredients Alert Card */}
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-orange-100/80">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-rose-50 text-rose-600">
                  <AlertTriangle className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-bold text-sm text-slate-800">Bahan Baku Menipis</h4>
                  <p className="text-[11px] text-slate-400">Peringatan restock gudang</p>
                </div>
              </div>
              <span className="text-xs font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-md">
                {data.criticalIngredients.length} Bahan
              </span>
            </div>

            {data.criticalIngredients.length === 0 ? (
              <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Semua stok bahan baku saat ini berada dalam batas aman.</span>
              </div>
            ) : (
              <div className="space-y-2">
                {data.criticalIngredients.map((ing) => (
                  <div
                    key={ing.id}
                    className="p-2.5 rounded-xl bg-rose-50/50 border border-rose-200/80 flex items-center justify-between text-xs"
                  >
                    <div>
                      <p className="font-semibold text-slate-800">{ing.name}</p>
                      <p className="text-[10px] text-rose-600 font-medium">Segera restock</p>
                    </div>
                    <span className="font-bold text-rose-700 bg-white px-2 py-0.5 rounded border border-rose-200 shadow-2xs">
                      {ing.stock} {ing.unit}
                    </span>
                  </div>
                ))}
              </div>
            )}

            <Link
              href="/admin/inventory"
              className="mt-4 w-full py-2 px-3 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 text-xs font-bold transition-all flex items-center justify-center gap-1.5"
            >
              <Archive className="w-3.5 h-3.5 text-slate-500" />
              <span>Buka Inventaris Gudang</span>
            </Link>
          </div>

          {/* 3. Outlet Standard & Bulletin Board */}
          <div className="bg-gradient-to-br from-orange-500/5 via-amber-500/5 to-transparent rounded-2xl p-5 border border-orange-200/80">
            <h4 className="text-xs font-bold uppercase tracking-wider text-orange-700 mb-2 flex items-center gap-1.5">
              <Store className="w-3.5 h-3.5 text-orange-500" />
              Standar Pelayanan Arum Seduh
            </h4>
            <div className="bg-white/90 backdrop-blur-sm p-3.5 rounded-xl border border-orange-100 text-xs text-slate-700 space-y-2">
              <p className="font-medium text-slate-800 italic">
                &ldquo;Selamat datang di Arum Seduh! Mau aroma teh segar atau seduhan kopi hari ini?&rdquo;
              </p>
              <div className="pt-2 border-t border-slate-100 text-[11px] text-slate-500 space-y-1">
                <p>• Selalu tanyakan opsi es dan gula (contoh: <em>Normal Ice → Biasa</em>).</p>
                <p>• Pisahkan struk makanan dari modifier minuman.</p>
                <p>• Informasikan promo aktif Arum Seduh sebelum pembayaran.</p>
              </div>
            </div>

            {/* Active Store Promo */}
            {data.activePromo && (
              <div className="bg-amber-50/90 p-3 rounded-xl border border-amber-200 text-xs text-amber-900 mt-3 space-y-0.5">
                <span className="font-bold text-amber-800 block">Promo Berjalan: {data.activePromo.title}</span>
                <p className="text-[11px] text-amber-700">Tawarkan promo spesial ini ke pelanggan di kasir Arum Seduh.</p>
              </div>
            )}

            {/* Active Co-workers On Duty */}
            {data.activeStaff.length > 0 && (
              <div className="mt-4 pt-3 border-t border-orange-100">
                <span className="text-[11px] font-bold text-slate-600 block mb-2 flex items-center gap-1.5">
                  <UserCheck className="w-3.5 h-3.5 text-emerald-600" />
                  Rekan Kerja Bertugas ({data.activeStaff.length}):
                </span>
                <div className="flex items-center gap-2 flex-wrap">
                  {data.activeStaff.map((staff) => (
                    <div
                      key={staff.id}
                      className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-xs flex items-center gap-1.5 shadow-2xs"
                    >
                      <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                      <span className="font-medium text-slate-700">{staff.cashier.name || 'Staf'}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* 5. MODAL BUKA SHIFT KASIR                                     */}
      {/* ------------------------------------------------------------- */}
      {isShiftOpenModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl border border-orange-100 overflow-hidden">
            <div className="px-6 py-4 bg-gradient-to-r from-orange-500 to-amber-500 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-white/20 backdrop-blur-md">
                  <Play className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="font-bold text-base tracking-tight">Buka Shift Kasir & Outlet</h3>
                  <p className="text-xs text-orange-100">Awali sesi operasional Arum Seduh</p>
                </div>
              </div>
              <button
                onClick={() => setIsShiftOpenModalOpen(false)}
                disabled={isSubmittingShift}
                className="p-1 rounded-lg hover:bg-white/20 text-white/80 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleOpenShift} className="p-6 space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                  <Coins className="w-3.5 h-3.5 text-orange-500" />
                  Kas Awal / Modal Uang di Laci (Rp)
                </label>
                <input
                  type="number"
                  value={openShiftCash}
                  onChange={(e) => setOpenShiftCash(e.target.value)}
                  placeholder="Contoh: 100000"
                  required
                  min="0"
                  step="1000"
                  disabled={isSubmittingShift}
                  className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 font-semibold text-slate-800"
                />
                <p className="text-[11px] text-slate-400">
                  Pratinjau: {formatRupiah(openShiftCash || 0)}
                </p>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700">
                  Catatan Pembukaan Shift (Opsional)
                </label>
                <textarea
                  value={openShiftNotes}
                  onChange={(e) => setOpenShiftNotes(e.target.value)}
                  rows={2}
                  placeholder="Contoh: Shift pagi barista & kasir, uang kembalian pecahan 5rb dan 10rb lengkap."
                  disabled={isSubmittingShift}
                  className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 text-slate-800"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setIsShiftOpenModalOpen(false)}
                  disabled={isSubmittingShift}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingShift}
                  className="px-5 py-2 text-xs font-bold bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white rounded-xl shadow-md shadow-orange-500/20 transition-all disabled:opacity-50"
                >
                  {isSubmittingShift ? 'Membuka Shift...' : 'Konfirmasi Buka Shift'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* 6. MODAL TUTUP SHIFT KASIR (REKONSILIASI KAS)                 */}
      {/* ------------------------------------------------------------- */}
      {isShiftCloseModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl border border-orange-100 overflow-hidden">
            <div className="px-6 py-4 bg-gradient-to-r from-rose-500 to-amber-500 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-white/20 backdrop-blur-md">
                  <LogOut className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="font-bold text-base tracking-tight">Tutup & Rekonsiliasi Shift</h3>
                  <p className="text-xs text-rose-100">Perhitungan uang fisik kasir Arum Seduh</p>
                </div>
              </div>
              <button
                onClick={() => setIsShiftCloseModalOpen(false)}
                disabled={isSubmittingShift}
                className="p-1 rounded-lg hover:bg-white/20 text-white/80 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCloseShift} className="p-6 space-y-4">
              {/* Shift Stats Grid */}
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 grid grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-slate-400 block">Modal Kas Awal:</span>
                  <span className="font-bold text-slate-800">
                    {data.activeShift ? formatRupiah(data.activeShift.openingCash) : 'Rp 0'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block">Tunai Masuk:</span>
                  <span className="font-bold text-emerald-600">
                    +{data.reconciliation ? formatRupiah(data.reconciliation.cashIn) : 'Rp 0'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block">Kas Kecil Keluar:</span>
                  <span className="font-bold text-rose-600">
                    -{data.reconciliation ? formatRupiah(data.reconciliation.cashOut) : 'Rp 0'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block">Omset QRIS / Non-Tunai:</span>
                  <span className="font-bold text-blue-600">
                    {data.reconciliation ? formatRupiah(data.reconciliation.qrisIn) : 'Rp 0'}
                  </span>
                </div>
              </div>

              {/* Expected Cash in Drawer */}
              <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-between">
                <div>
                  <span className="text-xs font-semibold text-amber-900 block">
                    Uang Fisik Seharusnya di Laci:
                  </span>
                  <span className="text-base font-black text-amber-900">
                    {data.reconciliation ? formatRupiah(data.reconciliation.expectedCash) : 'Rp 0'}
                  </span>
                </div>
                <Coins className="w-6 h-6 text-amber-600" />
              </div>

              {/* Actual Cash Input */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                  <Receipt className="w-3.5 h-3.5 text-orange-500" />
                  Uang Fisik Aktual di Laci Kasir (Hasil Hitung Manual)
                </label>
                <input
                  type="number"
                  value={closeActualCash}
                  onChange={(e) => setCloseActualCash(e.target.value)}
                  placeholder="Masukkan jumlah uang fisik di laci"
                  required
                  min="0"
                  step="1000"
                  disabled={isSubmittingShift}
                  className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 font-semibold text-slate-800"
                />

                {/* Live Variance Calculation */}
                {closeActualCash && data.reconciliation && (
                  <div className="pt-1">
                    {(() => {
                      const actual = parseInt(closeActualCash.replace(/[^0-9]/g, '')) || 0;
                      const expected = data.reconciliation.expectedCash;
                      const variance = actual - expected;

                      if (variance === 0) {
                        return (
                          <span className="text-xs font-bold text-emerald-600 flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            Selisih Pas (Rp 0). Cocok 100%!
                          </span>
                        );
                      } else if (variance > 0) {
                        return (
                          <span className="text-xs font-bold text-blue-600 flex items-center gap-1">
                            <Sparkles className="w-3.5 h-3.5" />
                            Kas Lebih: +{formatRupiah(variance)}
                          </span>
                        );
                      } else {
                        return (
                          <span className="text-xs font-bold text-rose-600 flex items-center gap-1">
                            <AlertTriangle className="w-3.5 h-3.5" />
                            Kas Kurang: -{formatRupiah(Math.abs(variance))}
                          </span>
                        );
                      }
                    })()}
                  </div>
                )}
              </div>

              {/* Notes */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700">
                  Catatan Penutupan Shift (Opsional)
                </label>
                <textarea
                  value={closeShiftNotes}
                  onChange={(e) => setCloseShiftNotes(e.target.value)}
                  rows={2}
                  placeholder="Contoh: Tutup shift lancar, setoran diserahkan ke brankas."
                  disabled={isSubmittingShift}
                  className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 text-slate-800"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setIsShiftCloseModalOpen(false)}
                  disabled={isSubmittingShift}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingShift}
                  className="px-5 py-2 text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white rounded-xl shadow-md shadow-rose-600/20 transition-all disabled:opacity-50"
                >
                  {isSubmittingShift ? 'Menutup Shift...' : 'Konfirmasi Tutup Shift'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
