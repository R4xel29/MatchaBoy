'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { formatRupiah } from '@/lib/utils';
import { useToast } from '@/components/ui/Toast';
import {
  Search, Plus, Edit2, Trash2, X, Save, Loader2,
  Receipt, Calendar, Tag, FileText, Filter, Wallet, ArrowUpRight,
  Banknote, QrCode, Coins, TrendingUp
} from 'lucide-react';
import { UrlPagination } from '@/components/ui/UrlPagination';
import { InjectCapitalModal } from '@/components/admin/finances/InjectCapitalModal';

interface Expense {
  id: string;
  name: string;
  amount: number;
  category: string;
  date: Date;
  notes: string | null;
}

interface BalanceInfo {
  currentCash: number;
  currentQris: number;
  grossTotalMoney: number;
  netTotalMoney: number;
  cashInflowTotal: number;
  qrisInflowTotal: number;
  allTimeCashExpenses: number;
  allTimeTransferExpenses: number;
}

interface Props {
  initialExpenses: Expense[];
  currentPage?: number;
  totalPages?: number;
  totalExpenses?: number;
  totalAmountSum?: number;
  pageSize?: number;
  balanceInfo?: BalanceInfo;
}

const CATEGORIES = [
  { value: 'RAW_MATERIAL', label: 'Bahan Baku / Restock', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  { value: 'DAILY_OPS', label: 'Operasional Harian (Es/Gas/Galon/Cup)', color: 'bg-amber-50 text-amber-700 border-amber-200' },
  { value: 'UTILITIES', label: 'Listrik, Air & Wifi', color: 'bg-sky-50 text-sky-700 border-sky-200' },
  { value: 'SALARY', label: 'Gaji & Uang Makan', color: 'bg-violet-50 text-violet-700 border-violet-200' },
  { value: 'RENT', label: 'Sewa Tempat Kedai', color: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
  { value: 'MAINTENANCE', label: 'Maintenance / Servis Alat', color: 'bg-orange-50 text-orange-700 border-orange-200' },
  { value: 'MARKETING', label: 'Marketing & Promosi', color: 'bg-pink-50 text-pink-700 border-pink-200' },
  { value: 'SUPPLIES', label: 'Perlengkapan & Kebersihan', color: 'bg-teal-50 text-teal-700 border-teal-200' },
  { value: 'OTHER', label: 'Lain-lain', color: 'bg-slate-100 text-slate-700 border-slate-200' }
];

export default function ExpensesClient({ 
  initialExpenses,
  currentPage = 1,
  totalPages = 1,
  totalExpenses = 0,
  totalAmountSum = 0,
  pageSize = 15,
  balanceInfo
}: Props) {
  const router = useRouter();
  const { showToast } = useToast();
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [saving, setSaving] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Expense | null>(null);
  const [showInjectModal, setShowInjectModal] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    amount: '',
    category: 'DAILY_OPS',
    date: new Date().toISOString().split('T')[0],
    notes: '',
    source: 'CASH_DRAWER'
  });

  const filteredExpenses = initialExpenses.filter(e => {
    const matchSearch = e.name.toLowerCase().includes(search.toLowerCase()) ||
      e.category.toLowerCase().includes(search.toLowerCase()) ||
      (e.notes && e.notes.toLowerCase().includes(search.toLowerCase()));
    const matchCategory = selectedCategory === 'ALL' || e.category.toUpperCase() === selectedCategory.toUpperCase();
    return matchSearch && matchCategory;
  });

  const openModal = (expense?: Expense) => {
    if (expense) {
      setEditingExpense(expense);
      setFormData({
        name: expense.name,
        amount: expense.amount.toString(),
        category: expense.category,
        date: new Date(expense.date).toISOString().split('T')[0],
        notes: expense.notes || '',
        source: expense.notes?.includes('Transfer') ? 'BANK_TRANSFER' : 'CASH_DRAWER'
      });
    } else {
      setEditingExpense(null);
      setFormData({
        name: '',
        amount: '',
        category: 'DAILY_OPS',
        date: new Date().toISOString().split('T')[0],
        notes: '',
        source: 'CASH_DRAWER'
      });
    }
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!formData.name || !formData.amount) {
      showToast('Nama dan Jumlah pengeluaran wajib diisi', 'error');
      return;
    }
    setSaving(true);
    try {
      const url = editingExpense ? `/api/admin/expenses/${editingExpense.id}` : '/api/admin/expenses';
      const sourceNote = formData.source === 'CASH_DRAWER' ? '[Kas Laci/Tunai]' : '[Transfer Bank]';
      const cleanNotes = formData.notes.replace(/\[Kas Laci\/Tunai\]|\[Transfer Bank\]/g, '').trim();
      const combinedNotes = cleanNotes ? `${cleanNotes} ${sourceNote}` : sourceNote;

      const res = await fetch(url, {
        method: editingExpense ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          notes: combinedNotes
        }),
      });
      if (!res.ok) throw new Error('Failed to save');
      setShowModal(false);
      router.refresh();
      showToast('Pengeluaran berhasil disimpan', 'success');
    } catch (err) {
      showToast('Gagal menyimpan pengeluaran', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      const res = await fetch(`/api/admin/expenses/${deleteTarget.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete');
      setDeleteTarget(null);
      router.refresh();
      showToast('Pengeluaran dihapus', 'success');
    } catch (err) {
      showToast('Gagal menghapus pengeluaran', 'error');
    }
  };

  const getCategoryBadge = (catVal: string) => {
    const found = CATEGORIES.find(c => c.value === catVal.toUpperCase());
    if (found) {
      return (
        <span className={`px-2.5 py-0.5 rounded-md text-[10px] font-extrabold uppercase tracking-wider border ${found.color}`}>
          {found.label}
        </span>
      );
    }
    return (
      <span className="px-2.5 py-0.5 rounded-md text-[10px] font-extrabold uppercase tracking-wider bg-slate-100 text-slate-700 border border-slate-200">
        {catVal}
      </span>
    );
  };

  return (
    <>
      {/* 1. Header Summary Card */}
      <div className="bg-white border border-slate-150/80 rounded-3xl p-5 sm:p-6 shadow-sm mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <span className="px-2.5 py-1 rounded-full text-[11px] font-extrabold uppercase tracking-wider bg-rose-50 text-rose-700 border border-rose-200">
            Biaya Operasional Toko
          </span>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight mt-1">
            Daftar Pengeluaran (Expenses)
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 font-medium">
            Total tercatat {totalExpenses} transaksi pengeluaran senilai <strong className="text-rose-600 font-extrabold">{formatRupiah(totalAmountSum)}</strong>
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap self-start sm:self-auto">
          <button
            onClick={() => setShowInjectModal(true)}
            className="flex items-center justify-center gap-1.5 px-4 py-2.5 text-xs sm:text-sm font-extrabold rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white transition-all shadow-md shadow-emerald-600/20 active:scale-95 whitespace-nowrap cursor-pointer"
          >
            <Plus className="w-4 h-4" /> Suntik Modal
          </button>

          <Link
            href="/admin/finances"
            className="flex items-center justify-center gap-1.5 px-4 py-2.5 text-xs sm:text-sm font-extrabold rounded-2xl bg-slate-100 hover:bg-orange-50 hover:text-orange-700 text-slate-700 border border-slate-200 transition-colors whitespace-nowrap"
          >
            <Coins className="w-4 h-4 text-orange-600" /> Buku Kas
          </Link>

          <button 
            onClick={() => openModal()}
            className="flex items-center justify-center gap-2 px-5 py-2.5 text-xs sm:text-sm font-extrabold rounded-2xl bg-gradient-to-r from-orange-500 to-amber-500 text-white hover:opacity-95 transition-all shadow-md shadow-orange-500/20 active:scale-95 whitespace-nowrap cursor-pointer"
          >
            <Plus className="w-4 h-4" /> Catat Pengeluaran
          </button>
        </div>
      </div>

      {/* Saldo Kas & Rekening Real-Time */}
      {balanceInfo && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 mb-6">
          {/* 1. Uang Cash Saat Ini */}
          <div className="bg-white border border-slate-150/80 rounded-3xl p-4 shadow-sm space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-extrabold text-amber-800 uppercase tracking-wider flex items-center gap-1.5">
                <Banknote className="w-4 h-4 text-amber-600" />
                Uang Cash Saat Ini
              </span>
              <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-md bg-amber-100 text-amber-900 border border-amber-200">
                Fisik / Laci
              </span>
            </div>
            <p className="text-2xl font-black text-slate-900 tracking-tight">
              {formatRupiah(balanceInfo.currentCash)}
            </p>
            <p className="text-[11px] text-slate-500 font-medium">
              Masuk: {formatRupiah(balanceInfo.cashInflowTotal)} • Beban: {formatRupiah(balanceInfo.allTimeCashExpenses)}
            </p>
          </div>

          {/* 2. Uang QRIS Saat Ini */}
          <div className="bg-white border border-slate-150/80 rounded-3xl p-4 shadow-sm space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-extrabold text-sky-800 uppercase tracking-wider flex items-center gap-1.5">
                <QrCode className="w-4 h-4 text-sky-600" />
                Uang QRIS Saat Ini
              </span>
              <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-md bg-sky-100 text-sky-900 border border-sky-200">
                Rekening Bank
              </span>
            </div>
            <p className="text-2xl font-black text-slate-900 tracking-tight">
              {formatRupiah(balanceInfo.currentQris)}
            </p>
            <p className="text-[11px] text-slate-500 font-medium">
              Masuk: {formatRupiah(balanceInfo.qrisInflowTotal)} • Beban: {formatRupiah(balanceInfo.allTimeTransferExpenses)}
            </p>
          </div>

          {/* 3. Total Seluruh Pengeluaran */}
          <div className="bg-white border border-slate-150/80 rounded-3xl p-4 shadow-sm space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-extrabold text-rose-800 uppercase tracking-wider flex items-center gap-1.5">
                <Receipt className="w-4 h-4 text-rose-600" />
                Total Beban Pengeluaran
              </span>
              <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-md bg-rose-100 text-rose-900 border border-rose-200">
                Akumulasi
              </span>
            </div>
            <p className="text-2xl font-black text-rose-600 tracking-tight">
              {formatRupiah(totalAmountSum)}
            </p>
            <p className="text-[11px] text-slate-500 font-medium">
              Total {totalExpenses} transaksi pengeluaran tercatat
            </p>
          </div>

          {/* 4. Total Sisa Uang Bersih */}
          <div className="bg-gradient-to-br from-orange-500 to-amber-500 text-white rounded-3xl p-4 shadow-md shadow-orange-500/20 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-extrabold text-white uppercase tracking-wider flex items-center gap-1.5">
                <TrendingUp className="w-4 h-4 text-orange-100" />
                Total Sisa Uang Bersih
              </span>
              <span className="text-[10px] font-black px-2 py-0.5 rounded-md bg-white/20 text-white">
                Kas Riil
              </span>
            </div>
            <p className="text-2xl font-black text-white tracking-tight">
              {formatRupiah(balanceInfo.netTotalMoney)}
            </p>
            <p className="text-[11px] text-orange-100 font-semibold">
              Cash ({formatRupiah(balanceInfo.currentCash)}) + QRIS ({formatRupiah(balanceInfo.currentQris)})
            </p>
          </div>
        </div>
      )}

      {/* 2. Toolbar & Category Filter */}
      <div className="space-y-3 mb-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input 
              type="text" 
              placeholder="Cari pengeluaran atau catatan..." 
              value={search} 
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 text-xs sm:text-sm bg-white border border-slate-200/80 rounded-2xl focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-400 transition-all shadow-sm" 
            />
          </div>
        </div>

        {/* Quick Category Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
          <button
            onClick={() => setSelectedCategory('ALL')}
            className={`px-3 py-1.5 rounded-xl font-bold transition-all whitespace-nowrap ${
              selectedCategory === 'ALL'
                ? 'bg-slate-900 text-white shadow-sm'
                : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            Semua Kategori
          </button>
          {CATEGORIES.map(c => (
            <button
              key={c.value}
              onClick={() => setSelectedCategory(c.value)}
              className={`px-3 py-1.5 rounded-xl font-bold transition-all whitespace-nowrap ${
                selectedCategory === c.value
                  ? 'bg-orange-600 text-white shadow-sm'
                  : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>
      </div>

      {/* 3. Table */}
      <div className="bg-white border border-slate-150/80 rounded-3xl shadow-sm overflow-hidden overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead>
            <tr className="border-b border-slate-150 bg-slate-50/70">
              <th className="px-5 py-3.5 text-[11px] font-extrabold text-slate-500 uppercase tracking-wider">Tanggal</th>
              <th className="px-5 py-3.5 text-[11px] font-extrabold text-slate-500 uppercase tracking-wider">Nama Pengeluaran</th>
              <th className="px-5 py-3.5 text-[11px] font-extrabold text-slate-500 uppercase tracking-wider">Kategori</th>
              <th className="px-5 py-3.5 text-[11px] font-extrabold text-slate-500 uppercase tracking-wider">Nominal</th>
              <th className="px-5 py-3.5 text-right text-[11px] font-extrabold text-slate-500 uppercase tracking-wider">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredExpenses.map((exp) => (
              <tr key={exp.id} className="group hover:bg-slate-50/70 transition-colors">
                <td className="px-5 py-3 text-slate-500 font-medium text-xs whitespace-nowrap">
                  {new Date(exp.date).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}
                </td>
                <td className="px-5 py-3">
                  <div className="flex flex-col">
                    <span className="font-bold text-slate-900 text-xs sm:text-sm">{exp.name}</span>
                    {exp.notes && <span className="text-[11px] text-slate-400 line-clamp-1">{exp.notes}</span>}
                  </div>
                </td>
                <td className="px-5 py-3 whitespace-nowrap">
                  {getCategoryBadge(exp.category)}
                </td>
                <td className="px-5 py-3 font-black text-rose-600 text-xs sm:text-sm whitespace-nowrap">
                  {formatRupiah(exp.amount)}
                </td>
                <td className="px-5 py-3 text-right whitespace-nowrap">
                  <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button 
                      onClick={() => openModal(exp)} 
                      className="p-1.5 hover:bg-blue-50 rounded-xl text-blue-600 transition-colors"
                      title="Edit"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => setDeleteTarget(exp)} 
                      className="p-1.5 hover:bg-rose-50 rounded-xl text-rose-600 transition-colors"
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filteredExpenses.length === 0 && (
          <div className="py-12 text-center text-slate-400">
            <Receipt className="w-10 h-10 mx-auto mb-2 opacity-30 text-slate-400" />
            <p className="text-xs font-semibold">Tidak ada pengeluaran yang ditemukan</p>
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-4 flex justify-center">
          <UrlPagination totalPages={totalPages} currentPage={currentPage} />
        </div>
      )}

      {/* 4. Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden border border-slate-150">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/70">
              <h3 className="text-base font-extrabold text-slate-900">
                {editingExpense ? 'Edit Pengeluaran' : 'Catat Pengeluaran Baru'}
              </h3>
              <button onClick={() => setShowModal(false)} className="p-1 hover:bg-slate-200/50 rounded-xl text-slate-400">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider block mb-1.5">Nama Pengeluaran *</label>
                <div className="relative">
                  <Tag className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input 
                    type="text" 
                    value={formData.name} 
                    onChange={e => setFormData(p => ({ ...p, name: e.target.value }))}
                    className="w-full pl-10 pr-4 py-2.5 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:bg-white transition-all" 
                    placeholder="e.g. Beli Es Batu, Gas LPG, Sewa Ruko"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider block mb-1.5">Nominal (Rp) *</label>
                  <input 
                    type="number"
                    value={formData.amount} 
                    onChange={e => setFormData(p => ({ ...p, amount: e.target.value }))}
                    className="w-full px-3.5 py-2.5 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:bg-white transition-all font-bold" 
                    placeholder="0"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider block mb-1.5">Kategori</label>
                  <select 
                    value={formData.category} 
                    onChange={e => setFormData(p => ({ ...p, category: e.target.value }))}
                    className="w-full px-3.5 py-2.5 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:bg-white transition-all font-semibold"
                  >
                    {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                  </select>
                </div>
              </div>

              {/* Sumber Pembayaran */}
              <div>
                <label className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider block mb-1.5">Sumber Kas Pembiayaan</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setFormData(p => ({ ...p, source: 'CASH_DRAWER' }))}
                    className={`px-3 py-2 text-xs font-bold rounded-xl border transition-all ${
                      formData.source === 'CASH_DRAWER'
                        ? 'bg-amber-100 border-amber-300 text-amber-900 shadow-sm'
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    Kas Laci (Tunai)
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData(p => ({ ...p, source: 'BANK_TRANSFER' }))}
                    className={`px-3 py-2 text-xs font-bold rounded-xl border transition-all ${
                      formData.source === 'BANK_TRANSFER'
                        ? 'bg-sky-100 border-sky-300 text-sky-900 shadow-sm'
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    Transfer Bank / Rekening
                  </button>
                </div>
              </div>

              <div>
                <label className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider block mb-1.5">Tanggal</label>
                <div className="relative">
                  <Calendar className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input 
                    type="date" 
                    value={formData.date} 
                    onChange={e => setFormData(p => ({ ...p, date: e.target.value }))}
                    className="w-full pl-10 pr-4 py-2.5 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:bg-white transition-all font-semibold" 
                  />
                </div>
              </div>
              <div>
                <label className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider block mb-1.5">Catatan Tambahan (Opsional)</label>
                <textarea 
                  value={formData.notes} 
                  onChange={e => setFormData(p => ({ ...p, notes: e.target.value }))}
                  rows={2}
                  className="w-full px-3.5 py-2.5 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:bg-white transition-all resize-none"
                  placeholder="Keterangan toko / suplier / PIC..."
                />
              </div>
            </div>
            <div className="px-6 py-4 border-t border-slate-100 flex justify-end gap-2 bg-slate-50/70">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 text-xs sm:text-sm font-bold text-slate-600 rounded-2xl hover:bg-slate-200/50 transition-colors">Batal</button>
              <button onClick={handleSave} disabled={saving}
                className="px-5 py-2 text-xs sm:text-sm font-extrabold rounded-2xl bg-gradient-to-r from-orange-500 to-amber-500 text-white hover:opacity-95 transition-all flex items-center gap-2 disabled:opacity-50 shadow-md shadow-orange-500/20">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Simpan
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 5. Delete Confirm */}
      {deleteTarget && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm p-6 text-center border border-slate-150">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 flex items-center justify-center mx-auto mb-4 text-rose-600">
              <Trash2 className="w-5 h-5" />
            </div>
            <h3 className="text-base font-extrabold mb-1 text-slate-900">Hapus Pengeluaran?</h3>
            <p className="text-xs text-slate-500 mb-5"><strong>{deleteTarget.name}</strong> ({formatRupiah(deleteTarget.amount)}) akan dihapus permanen dari sistem.</p>
            <div className="flex gap-2">
              <button onClick={() => setDeleteTarget(null)} className="flex-1 px-4 py-2.5 text-xs font-bold rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors">Batal</button>
              <button onClick={handleDelete} className="flex-1 px-4 py-2.5 text-xs font-extrabold rounded-2xl bg-rose-600 hover:bg-rose-700 text-white transition-colors">Hapus</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Suntik Modal Quick Action */}
      <InjectCapitalModal
        isOpen={showInjectModal}
        onClose={() => setShowInjectModal(false)}
        onSuccess={() => router.refresh()}
      />
    </>
  );
}
