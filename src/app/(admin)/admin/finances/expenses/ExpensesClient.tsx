'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { formatRupiah } from '@/lib/utils';
import { useToast } from '@/components/ui/Toast';
import {
  Plus,
  Trash2,
  Receipt,
  Coins,
} from 'lucide-react';
import { UrlPagination } from '@/components/ui/UrlPagination';
import { InjectCapitalModal } from '@/components/admin/finances/InjectCapitalModal';
import {
  Expense,
  BalanceInfo,
  ExpenseFormData,
} from './_components/types';
import { ExpenseBalanceCards } from './_components/ExpenseBalanceCards';
import { ExpenseFilters } from './_components/ExpenseFilters';
import { ExpenseTable } from './_components/ExpenseTable';
import { ExpenseFormModal } from './_components/ExpenseFormModal';

interface Props {
  initialExpenses: Expense[];
  currentPage?: number;
  totalPages?: number;
  totalExpenses?: number;
  totalAmountSum?: number;
  pageSize?: number;
  balanceInfo?: BalanceInfo;
}

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

  const [formData, setFormData] = useState<ExpenseFormData>({
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
        method: editingExpense ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          amount: Number(formData.amount),
          category: formData.category,
          date: new Date(formData.date).toISOString(),
          notes: combinedNotes,
        })
      });

      if (!res.ok) throw new Error();
      showToast(editingExpense ? 'Pengeluaran diperbarui' : 'Pengeluaran dicatat', 'success');
      setShowModal(false);
      router.refresh();
    } catch {
      showToast('Gagal menyimpan pengeluaran', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      const res = await fetch(`/api/admin/expenses/${deleteTarget.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error();
      showToast('Pengeluaran berhasil dihapus', 'success');
      setDeleteTarget(null);
      router.refresh();
    } catch {
      showToast('Gagal menghapus pengeluaran', 'error');
    }
  };

  return (
    <>
      {/* 1. Header Workspace */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 bg-white p-6 rounded-3xl border border-slate-150/80 shadow-xs">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-2 rounded-xl bg-rose-50 text-rose-600 border border-rose-100">
              <Receipt className="w-5 h-5" />
            </span>
            <span className="text-xs font-extrabold uppercase tracking-wider text-rose-700 bg-rose-50/80 px-2.5 py-0.5 rounded-full border border-rose-200">
              Arus Kas Keluar
            </span>
          </div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900">
            Pengeluaran & Kas Kecil
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Catat beban belanja harian, bahan baku, es batu, dan operasional kedai Arum Seduh.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
          <button
            onClick={() => setShowInjectModal(true)}
            className="flex items-center justify-center gap-1.5 px-4 py-2.5 text-xs sm:text-sm font-extrabold rounded-2xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 transition-colors whitespace-nowrap cursor-pointer"
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
            <Plus className="w-4 h-4" /> Catat Manual
          </button>
        </div>
      </div>

      {/* Saldo Kas & Rekening Real-Time */}
      <ExpenseBalanceCards
        balanceInfo={balanceInfo}
        totalExpenses={totalExpenses}
        totalAmountSum={totalAmountSum}
      />

      {/* Toolbar & Category Filter */}
      <ExpenseFilters
        search={search}
        onSearchChange={setSearch}
        selectedCategory={selectedCategory}
        onSelectCategory={setSelectedCategory}
      />

      {/* Table */}
      <ExpenseTable
        expenses={filteredExpenses}
        onEdit={openModal}
        onDelete={setDeleteTarget}
      />

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-4 flex justify-center">
          <UrlPagination totalPages={totalPages} currentPage={currentPage} />
        </div>
      )}

      {/* Add/Edit Modal */}
      <ExpenseFormModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        isEditing={Boolean(editingExpense)}
        formData={formData}
        setFormData={setFormData}
        onSave={handleSave}
        isSaving={saving}
      />

      {/* Delete Confirm */}
      {deleteTarget && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm p-6 text-center border border-slate-150">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 flex items-center justify-center mx-auto mb-4 text-rose-600">
              <Trash2 className="w-5 h-5" />
            </div>
            <h3 className="text-base font-extrabold mb-1 text-slate-900">Hapus Pengeluaran?</h3>
            <p className="text-xs text-slate-500 mb-5"><strong>{deleteTarget.name}</strong> ({formatRupiah(deleteTarget.amount)}) akan dihapus permanen dari sistem.</p>
            <div className="flex gap-2">
              <button onClick={() => setDeleteTarget(null)} className="flex-1 px-4 py-2.5 text-xs font-bold rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer">Batal</button>
              <button onClick={handleDelete} className="flex-1 px-4 py-2.5 text-xs font-extrabold rounded-2xl bg-rose-600 hover:bg-rose-700 text-white transition-colors cursor-pointer">Hapus</button>
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
