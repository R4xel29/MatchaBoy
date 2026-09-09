'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  Coins,
  Receipt,
  Plus,
  RefreshCw,
  Layers,
  Trash2,
} from 'lucide-react';
import { formatRupiah } from '@/lib/utils';
import { useToast } from '@/components/ui/Toast';
import {
  InjectCapitalModal,
  CapitalInjectionItem,
} from '@/components/admin/finances/InjectCapitalModal';
import {
  LedgerTransaction,
  FinanceSummary,
  TabType,
  RangeType,
} from './_components/types';
import { FinanceSummaryCards } from './_components/FinanceSummaryCards';
import { FinanceFilters } from './_components/FinanceFilters';
import { MutasiTable } from './_components/MutasiTable';
import { CapitalInjectionsTable } from './_components/CapitalInjectionsTable';

interface Props {
  initialSummary: FinanceSummary;
  initialLedger: LedgerTransaction[];
  initialInjections: CapitalInjectionItem[];
}

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

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const query = new URLSearchParams();
      if (range !== 'all') query.set('range', range);
      if (methodFilter !== 'ALL') query.set('method', methodFilter);
      if (typeFilter !== 'ALL') query.set('type', typeFilter);

      const [summaryRes, ledgerRes, injectionsRes] = await Promise.all([
        fetch(`/api/admin/finances?${query.toString()}`),
        fetch(`/api/admin/finances?ledger=true&${query.toString()}`),
        fetch('/api/admin/capital-injections'),
      ]);

      if (summaryRes.ok) {
        const data = await summaryRes.json();
        setSummary(data.summary || initialSummary);
      }

      if (ledgerRes.ok) {
        const data = await ledgerRes.json();
        setLedger(data.ledger || []);
      }

      if (injectionsRes.ok) {
        const data = await injectionsRes.json();
        setInjections(data.injections || []);
      }
    } catch {
      showToast('Gagal memuat data mutasi keuangan', 'error');
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
      <div className="bg-white rounded-3xl border border-slate-150/80 p-5 sm:p-6 shadow-xs flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
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
            href="/admin/finances/expenses"
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

      {/* 2. Real-time Balance Cards */}
      <FinanceSummaryCards summary={summary} />

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
          <FinanceFilters
            search={search}
            onSearchChange={setSearch}
            range={range}
            onRangeChange={setRange}
            methodFilter={methodFilter}
            onMethodFilterChange={setMethodFilter}
            typeFilter={typeFilter}
            onTypeFilterChange={setTypeFilter}
            onPrintLedger={printLedger}
          />
          <MutasiTable ledger={filteredLedger} />
        </div>
      )}

      {/* TAB 2: DAFTAR SUNTIKAN MODAL OWNER */}
      {activeTab === 'CAPITAL' && (
        <CapitalInjectionsTable
          injections={injections}
          onAddNew={() => {
            setEditingInjection(null);
            setShowInjectModal(true);
          }}
          onEdit={(inj) => {
            setEditingInjection(inj);
            setShowInjectModal(true);
          }}
          onDelete={setDeleteTarget}
        />
      )}

      {/* Delete Confirmation Dialog */}
      {deleteTarget && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
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
                className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                Batal
              </button>
              <button
                onClick={handleDeleteInjection}
                className="px-4 py-2 rounded-xl bg-rose-600 text-white text-xs font-bold hover:bg-rose-700 shadow-md shadow-rose-600/20 cursor-pointer"
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
