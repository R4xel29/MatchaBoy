'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  TrendingUp,
  TrendingDown,
  Coins,
  Banknote,
  QrCode,
  Receipt,
  Plus,
  Search,
  Calendar,
  Filter,
  RefreshCw,
  Edit2,
  Trash2,
  Printer,
  FileSpreadsheet,
  Layers,
  ArrowUpRight,
  ArrowDownRight,
  CheckCircle2,
  Sparkles,
  Sliders,
  DollarSign,
  Package,
  Store,
  Wallet,
} from 'lucide-react';
import { formatRupiah } from '@/lib/utils';
import { useToast } from '@/components/ui/Toast';
import {
  InjectCapitalModal,
  CapitalInjectionItem,
} from '@/components/admin/finances/InjectCapitalModal';

export interface LedgerTransaction {
  id: string;
  date: string;
  type: 'ORDER_INCOME' | 'CAPITAL_INJECTION' | 'CAPITAL_WITHDRAWAL' | 'EXPENSE';
  title: string;
  category: string;
  paymentMethod: 'CASH' | 'QRIS';
  inflow: number;
  outflow: number;
  netChange: number;
  runningCashBalance?: number;
  runningQrisBalance?: number;
  runningTotalBalance?: number;
  notes?: string | null;
  customerName?: string | null;
  orderNumber?: string | null;
}

export interface FinanceSummary {
  currentCash: number;
  currentQris: number;
  netTotalMoney: number;
  grossTotalMoney: number;
  totalCashInflow: number;
  totalQrisInflow: number;
  totalCashOutflow: number;
  totalQrisOutflow: number;
  totalExpensesSum: number;
  totalTransactionsCount: number;
}

interface Props {
  initialSummary: FinanceSummary;
  initialLedger: LedgerTransaction[];
  initialInjections: CapitalInjectionItem[];
}

type TabType = 'MUTASI' | 'CAPITAL' | 'SUMMARY';
type RangeType = 'all' | 'today' | 'week' | 'month';

export default function FinancesClient({
  initialSummary,
  initialLedger,
  initialInjections,
}: Props) {
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState<TabType>('MUTASI');
  const [summary, setSummary] = useState<FinanceSummary>(initialSummary);
  const [ledger, setLedger] = useState<LedgerTransaction[]>(initialLedger);
  const [injections, setInjections] = useState<CapitalInjectionItem[]>(initialInjections);
  const [loading, setLoading] = useState(false);

  // Filters
  const [search, setSearch] = useState('');
  const [range, setRange] = useState<RangeType>('all');
  const [methodFilter, setMethodFilter] = useState<'ALL' | 'CASH' | 'QRIS'>('ALL');
  const [typeFilter, setTypeFilter] = useState<'ALL' | 'INCOME' | 'CAPITAL' | 'EXPENSE'>('ALL');

  // Modal State
  const [showInjectModal, setShowInjectModal] = useState(false);
  const [editingInjection, setEditingInjection] = useState<CapitalInjectionItem | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<CapitalInjectionItem | null>(null);

  // Fetch / Refresh Data
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const query = new URLSearchParams({
        range,
        method: methodFilter,
        type: typeFilter,
      });

      const [financesRes, injectionsRes] = await Promise.all([
        fetch(`/api/admin/finances?${query.toString()}`),
        fetch('/api/admin/capital-injections'),
      ]);

      if (financesRes.ok) {
        const finData = await financesRes.json();
        setLedger(finData.ledger || []);
        setSummary(finData.summary || initialSummary);
      }

      if (injectionsRes.ok) {
        const injData = await injectionsRes.json();
        setInjections(injData.items || []);
      }
    } catch (err) {
      console.error('Error fetching finance data:', err);
      showToast('Gagal memperbarui data keuangan', 'error');
    } finally {
      setLoading(false);
    }
  }, [range, methodFilter, typeFilter, initialSummary, showToast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Client-side search filtering
  const filteredLedger = ledger.filter((item) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      item.title.toLowerCase().includes(q) ||
      item.category.toLowerCase().includes(q) ||
      (item.notes && item.notes.toLowerCase().includes(q)) ||
      (item.customerName && item.customerName.toLowerCase().includes(q)) ||
      (item.orderNumber && item.orderNumber.toLowerCase().includes(q))
    );
  });

  // Handle Delete Capital Injection
  const handleDeleteInjection = async () => {
    if (!deleteTarget) return;
    try {
      const res = await fetch(`/api/admin/capital-injections/${deleteTarget.id}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error();
      showToast('Suntikan modal berhasil dihapus', 'success');
      setDeleteTarget(null);
      fetchData();
    } catch {
      showToast('Gagal menghapus data modal', 'error');
    }
  };

  const printLedger = () => {
    window.print();
  };

  return (
    <div className="space-y-6 max-w-[1500px] mx-auto pb-12">
      {/* 1. Header & Live Indicator */}
      <div className="bg-white rounded-3xl border border-slate-150/80 p-5 sm:p-6 shadow-sm flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <span className="px-2.5 py-1 rounded-full text-[11px] font-extrabold uppercase tracking-wider bg-orange-50 text-orange-700 border border-orange-200">
              Manajemen Keuangan & Kas
            </span>
            <span className="text-xs font-semibold text-slate-400">•</span>
            <span className="text-xs font-bold text-slate-600 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              Sistem Buku Kas Terpadu
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight mt-1">
            Buku Kas & Mutasi Saldo
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 font-medium mt-0.5">
            Kelola suntik dana modal, pantau mutasi uang kas fisik & QRIS, serta riwayat seluruh arus dana toko
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap self-start lg:self-center">
          <button
            onClick={() => {
              setEditingInjection(null);
              setShowInjectModal(true);
            }}
            className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white text-xs sm:text-sm font-extrabold shadow-md shadow-emerald-600/20 active:scale-95 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Suntik / Tambah Modal</span>
          </button>

          <Link
            href="/admin/expenses"
            className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-slate-100 hover:bg-orange-50 hover:text-orange-700 text-slate-700 text-xs sm:text-sm font-extrabold border border-slate-200/80 active:scale-95 transition-all"
          >
            <Receipt className="w-4 h-4 text-orange-600" />
            <span>Catat Pengeluaran</span>
          </Link>

          <button
            onClick={fetchData}
            disabled={loading}
            className="p-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-600 border border-slate-200 transition-all cursor-pointer"
            title="Segarkan Data"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-orange-600' : ''}`} />
          </button>
        </div>
      </div>

      {/* 2. Real-time Balance Cards (Light Modern Theme) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* 1. Uang Cash Saat Ini */}
        <div className="bg-white border border-slate-150/80 rounded-3xl p-5 shadow-sm space-y-2 hover:border-amber-300 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-extrabold text-amber-800 uppercase tracking-wider flex items-center gap-1.5">
              <Banknote className="w-4 h-4 text-amber-600" />
              Uang Cash Saat Ini
            </span>
            <span className="text-[10px] font-extrabold px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-200">
              Fisik / Laci
            </span>
          </div>
          <p className="text-3xl font-black text-slate-900 tracking-tight">
            {formatRupiah(summary.currentCash)}
          </p>
          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500 font-medium">
            <span>Masuk: <strong className="text-emerald-600">{formatRupiah(summary.totalCashInflow)}</strong></span>
            <span>Keluar: <strong className="text-rose-600">{formatRupiah(summary.totalCashOutflow)}</strong></span>
          </div>
        </div>

        {/* 2. Uang QRIS Saat Ini */}
        <div className="bg-white border border-slate-150/80 rounded-3xl p-5 shadow-sm space-y-2 hover:border-sky-300 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-extrabold text-sky-800 uppercase tracking-wider flex items-center gap-1.5">
              <QrCode className="w-4 h-4 text-sky-600" />
              Uang QRIS Saat Ini
            </span>
            <span className="text-[10px] font-extrabold px-2.5 py-0.5 rounded-full bg-sky-100 text-sky-900 border border-sky-200">
              Rekening Bank
            </span>
          </div>
          <p className="text-3xl font-black text-slate-900 tracking-tight">
            {formatRupiah(summary.currentQris)}
          </p>
          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500 font-medium">
            <span>Masuk: <strong className="text-emerald-600">{formatRupiah(summary.totalQrisInflow)}</strong></span>
            <span>Beban: <strong className="text-rose-600">{formatRupiah(summary.totalQrisOutflow)}</strong></span>
          </div>
        </div>

        {/* 3. Total Uang Masuk Selama Ini (Bruto) */}
        <div className="bg-white border border-slate-150/80 rounded-3xl p-5 shadow-sm space-y-2 hover:border-indigo-300 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-extrabold text-indigo-800 uppercase tracking-wider flex items-center gap-1.5">
              <Coins className="w-4 h-4 text-indigo-600" />
              Total Uang Masuk
            </span>
            <span className="text-[10px] font-extrabold px-2.5 py-0.5 rounded-full bg-indigo-100 text-indigo-900 border border-indigo-200">
              Bruto (Gross)
            </span>
          </div>
          <p className="text-3xl font-black text-slate-900 tracking-tight">
            {formatRupiah(summary.grossTotalMoney)}
          </p>
          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500 font-medium">
            <span>Beban Keluar: <strong className="text-rose-600">{formatRupiah(summary.totalExpensesSum)}</strong></span>
          </div>
        </div>

        {/* 4. Total Sisa Uang Bersih Toko */}
        <div className="bg-gradient-to-br from-orange-500 to-amber-500 text-white rounded-3xl p-5 shadow-md shadow-orange-500/20 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-extrabold text-white uppercase tracking-wider flex items-center gap-1.5">
              <TrendingUp className="w-4 h-4 text-orange-100" />
              Total Sisa Uang Bersih
            </span>
            <span className="text-[10px] font-black px-2.5 py-0.5 rounded-full bg-white/20 text-white">
              Dana Riil
            </span>
          </div>
          <p className="text-3xl font-black text-white tracking-tight">
            {formatRupiah(summary.netTotalMoney)}
          </p>
          <p className="text-[11px] text-orange-100 font-semibold pt-2 border-t border-white/20">
            Cash ({formatRupiah(summary.currentCash)}) + QRIS ({formatRupiah(summary.currentQris)})
          </p>
        </div>
      </div>

      {/* 3. Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
        <button
          onClick={() => setActiveTab('MUTASI')}
          className={`px-4 py-2 rounded-2xl text-xs sm:text-sm font-extrabold transition-all cursor-pointer flex items-center gap-2 ${
            activeTab === 'MUTASI'
              ? 'bg-slate-900 text-white shadow-md'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>Buku Kas & Riwayat Mutasi ({filteredLedger.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('CAPITAL')}
          className={`px-4 py-2 rounded-2xl text-xs sm:text-sm font-extrabold transition-all cursor-pointer flex items-center gap-2 ${
            activeTab === 'CAPITAL'
              ? 'bg-slate-900 text-white shadow-md'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Coins className="w-4 h-4 text-amber-400" />
          <span>Suntikan Modal & Saldo ({injections.length})</span>
        </button>
      </div>

      {/* TAB 1: BUKU KAS & RIWAYAT MUTASI LENGKAP */}
      {activeTab === 'MUTASI' && (
        <div className="space-y-4">
          {/* Filters Bar */}
          <div className="bg-white rounded-3xl p-4 border border-slate-150/80 shadow-sm space-y-3">
            <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
              {/* Search input */}
              <div className="relative w-full sm:w-80">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Cari transaksi, order, atau catatan..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                />
              </div>

              {/* Range Selector */}
              <div className="flex items-center gap-1.5 flex-wrap w-full sm:w-auto justify-end">
                {(['all', 'today', 'week', 'month'] as RangeType[]).map((r) => (
                  <button
                    key={r}
                    onClick={() => setRange(r)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      range === r
                        ? 'bg-orange-500 text-white shadow-sm font-extrabold'
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
                  onClick={printLedger}
                  className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 border border-slate-200 transition-colors cursor-pointer"
                  title="Cetak Buku Kas"
                >
                  <Printer className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Sub Filters (Method & Type) */}
            <div className="flex items-center gap-3 flex-wrap pt-2 border-t border-slate-100 text-xs">
              {/* Payment Method Pills */}
              <div className="flex items-center gap-1">
                <span className="text-slate-400 font-bold mr-1">Metode:</span>
                {(['ALL', 'CASH', 'QRIS'] as const).map((m) => (
                  <button
                    key={m}
                    onClick={() => setMethodFilter(m)}
                    className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                      methodFilter === m
                        ? 'bg-slate-800 text-white'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {m === 'ALL' ? 'Semua Metode' : m === 'CASH' ? '💵 Tunai (Cash)' : '📱 QRIS'}
                  </button>
                ))}
              </div>

              {/* Type Pills */}
              <div className="flex items-center gap-1">
                <span className="text-slate-400 font-bold mr-1">Jenis:</span>
                {(['ALL', 'INCOME', 'CAPITAL', 'EXPENSE'] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => setTypeFilter(t)}
                    className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                      typeFilter === t
                        ? 'bg-slate-800 text-white'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {t === 'ALL'
                      ? 'Semua Jenis'
                      : t === 'INCOME'
                      ? '🟢 Penjualan'
                      : t === 'CAPITAL'
                      ? '🔵 Suntik Modal'
                      : '🔴 Pengeluaran'}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Ledger Table */}
          <div className="bg-white border border-slate-150/80 rounded-3xl shadow-sm overflow-hidden overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead>
                <tr className="border-b border-slate-150 bg-slate-50/80 text-[11px] font-extrabold text-slate-500 uppercase tracking-wider">
                  <th className="px-5 py-3.5">Tanggal & Waktu</th>
                  <th className="px-5 py-3.5">Jenis Transaksi</th>
                  <th className="px-5 py-3.5">Keterangan / Detail</th>
                  <th className="px-5 py-3.5">Metode</th>
                  <th className="px-5 py-3.5 text-right">Uang Masuk</th>
                  <th className="px-5 py-3.5 text-right">Uang Keluar</th>
                  <th className="px-5 py-3.5 text-right">Saldo Berjalan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredLedger.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-400">
                      <Coins className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                      <p className="text-xs font-bold text-slate-600">Tidak ada transaksi ditemukan</p>
                      <p className="text-[11px] text-slate-400 mt-0.5">Coba ubah filter atau rentang tanggal.</p>
                    </td>
                  </tr>
                ) : (
                  filteredLedger.map((item) => {
                    const isIncome = item.inflow > 0;
                    const isOutflow = item.outflow > 0;
                    const isCapital = item.type.includes('CAPITAL');

                    return (
                      <tr key={item.id} className="hover:bg-slate-50/70 transition-colors">
                        {/* 1. Date & Time */}
                        <td className="px-5 py-3.5 text-xs text-slate-500 font-medium whitespace-nowrap">
                          {new Date(item.date).toLocaleString('id-ID', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </td>

                        {/* 2. Type Badge */}
                        <td className="px-5 py-3.5 whitespace-nowrap">
                          {item.type === 'ORDER_INCOME' && (
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-50 text-emerald-700 border border-emerald-200 inline-flex items-center gap-1">
                              <ArrowDownRight className="w-3 h-3 text-emerald-600" /> Penjualan Menu
                            </span>
                          )}
                          {item.type === 'CAPITAL_INJECTION' && (
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-blue-50 text-blue-700 border border-blue-200 inline-flex items-center gap-1">
                              <Coins className="w-3 h-3 text-blue-600" /> Suntik Modal
                            </span>
                          )}
                          {item.type === 'CAPITAL_WITHDRAWAL' && (
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-50 text-amber-700 border border-amber-200 inline-flex items-center gap-1">
                              <ArrowUpRight className="w-3 h-3 text-amber-600" /> Tarik Modal
                            </span>
                          )}
                          {item.type === 'EXPENSE' && (
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-rose-50 text-rose-700 border border-rose-200 inline-flex items-center gap-1">
                              <ArrowUpRight className="w-3 h-3 text-rose-600" /> Pengeluaran
                            </span>
                          )}
                        </td>

                        {/* 3. Description & Category */}
                        <td className="px-5 py-3.5">
                          <div className="flex flex-col">
                            <span className="font-bold text-slate-900 text-xs sm:text-sm">
                              {item.title}
                            </span>
                            <span className="text-[11px] text-slate-400">
                              {item.category} {item.notes && `• ${item.notes}`}
                            </span>
                          </div>
                        </td>

                        {/* 4. Payment Method */}
                        <td className="px-5 py-3.5 whitespace-nowrap">
                          {item.paymentMethod === 'CASH' ? (
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-amber-50 text-amber-800 border border-amber-200 inline-flex items-center gap-1">
                              <Banknote className="w-3 h-3 text-amber-600" /> Tunai (Cash)
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-sky-50 text-sky-800 border border-sky-200 inline-flex items-center gap-1">
                              <QrCode className="w-3 h-3 text-sky-600" /> QRIS Bank
                            </span>
                          )}
                        </td>

                        {/* 5. Inflow */}
                        <td className="px-5 py-3.5 text-right font-extrabold text-xs whitespace-nowrap">
                          {isIncome ? (
                            <span className="text-emerald-600 font-black">
                              + {formatRupiah(item.inflow)}
                            </span>
                          ) : (
                            <span className="text-slate-300">-</span>
                          )}
                        </td>

                        {/* 6. Outflow */}
                        <td className="px-5 py-3.5 text-right font-extrabold text-xs whitespace-nowrap">
                          {isOutflow ? (
                            <span className="text-rose-600 font-black">
                              - {formatRupiah(item.outflow)}
                            </span>
                          ) : (
                            <span className="text-slate-300">-</span>
                          )}
                        </td>

                        {/* 7. Running Balance */}
                        <td className="px-5 py-3.5 text-right font-black text-xs text-slate-900 whitespace-nowrap">
                          {formatRupiah(item.runningTotalBalance || 0)}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: DAFTAR SUNTIKAN MODAL OWNER */}
      {activeTab === 'CAPITAL' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-extrabold text-slate-900">
                Riwayat Suntikan Modal & Penyesuaian Dana
              </h3>
              <p className="text-xs text-slate-500">
                Daftar modal awal kas fisik, modal rekening QRIS, dan suntikan dana tambahan oleh owner
              </p>
            </div>

            <button
              onClick={() => {
                setEditingInjection(null);
                setShowInjectModal(true);
              }}
              className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white text-xs font-extrabold shadow-md shadow-emerald-600/20 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Suntik Modal Baru</span>
            </button>
          </div>

          <div className="bg-white border border-slate-150/80 rounded-3xl shadow-sm overflow-hidden overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead>
                <tr className="border-b border-slate-150 bg-slate-50/80 text-[11px] font-extrabold text-slate-500 uppercase tracking-wider">
                  <th className="px-5 py-3.5">Tanggal</th>
                  <th className="px-5 py-3.5">Nama Transaksi</th>
                  <th className="px-5 py-3.5">Target Saldo</th>
                  <th className="px-5 py-3.5">Kategori</th>
                  <th className="px-5 py-3.5 text-right">Nominal</th>
                  <th className="px-5 py-3.5 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {injections.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-10 text-center text-slate-400">
                      Belum ada data suntikan modal.
                    </td>
                  </tr>
                ) : (
                  injections.map((inj) => (
                    <tr key={inj.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="px-5 py-3.5 text-xs text-slate-500 font-medium whitespace-nowrap">
                        {new Date(inj.date).toLocaleDateString('id-ID', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex flex-col">
                          <span className="font-bold text-slate-900 text-xs sm:text-sm">
                            {inj.name}
                          </span>
                          {inj.notes && (
                            <span className="text-[11px] text-slate-400">{inj.notes}</span>
                          )}
                        </div>
                      </td>
                      <td className="px-5 py-3.5 whitespace-nowrap">
                        {inj.paymentMethod === 'CASH' ? (
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-amber-50 text-amber-800 border border-amber-200">
                            💵 Kas Tunai (Laci)
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-sky-50 text-sky-800 border border-sky-200">
                            📱 QRIS (Rekening)
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-3.5 text-xs text-slate-600 font-medium whitespace-nowrap">
                        {inj.category === 'INITIAL_BALANCE'
                          ? 'Modal Awal'
                          : inj.category === 'OWNER_LOAN'
                          ? 'Talangan Owner'
                          : inj.category === 'WITHDRAWAL'
                          ? 'Penarikan Modal / Prive'
                          : 'Suntikan Modal'}
                      </td>
                      <td className="px-5 py-3.5 text-right font-black text-xs whitespace-nowrap">
                        <span
                          className={inj.amount >= 0 ? 'text-emerald-600' : 'text-rose-600'}
                        >
                          {inj.amount >= 0 ? '+ ' : '- '}
                          {formatRupiah(Math.abs(inj.amount))}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => {
                              setEditingInjection(inj);
                              setShowInjectModal(true);
                            }}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-orange-600 hover:bg-orange-50 transition-colors cursor-pointer"
                            title="Edit"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setDeleteTarget(inj)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                            title="Hapus"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      {deleteTarget && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl border border-slate-200 text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>
            <div>
              <h4 className="font-bold text-base text-slate-900">Hapus Suntikan Modal?</h4>
              <p className="text-xs text-slate-500 mt-1">
                Apakah Anda yakin ingin menghapus <strong>&ldquo;{deleteTarget.name}&rdquo;</strong> ({formatRupiah(deleteTarget.amount)})? Saldo kas akan berkurang sesuai nominal ini.
              </p>
            </div>
            <div className="flex items-center gap-2 justify-center pt-2">
              <button
                onClick={() => setDeleteTarget(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-100"
              >
                Batal
              </button>
              <button
                onClick={handleDeleteInjection}
                className="px-4 py-2 rounded-xl bg-rose-600 text-white text-xs font-bold hover:bg-rose-700 shadow-md shadow-rose-600/20"
              >
                Hapus Sekarang
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Inject Capital */}
      <InjectCapitalModal
        isOpen={showInjectModal}
        onClose={() => {
          setShowInjectModal(false);
          setEditingInjection(null);
        }}
        onSuccess={fetchData}
        initialData={editingInjection}
      />
    </div>
  );
}
