'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { formatRupiah } from '@/lib/utils';
import { useToast } from '@/components/ui/Toast';
import {
  Search, Plus, Edit2, Trash2, X, Save, Loader2,
  Receipt, Calendar, Tag, FileText
} from 'lucide-react';

interface Expense {
  id: string;
  name: string;
  amount: number;
  category: string;
  date: Date;
  notes: string | null;
}

interface Props {
  initialExpenses: Expense[];
}

const CATEGORIES = [
  { value: 'RENT', label: 'Rent / Sewa' },
  { value: 'UTILITIES', label: 'Utilities (Elec/Water)' },
  { value: 'SALARY', label: 'Salary / Gaji' },
  { value: 'MARKETING', label: 'Marketing' },
  { value: 'SUPPLIES', label: 'Supplies / Office' },
  { value: 'OTHER', label: 'Other' }
];

export default function ExpensesClient({ initialExpenses }: Props) {
  const router = useRouter();
  const { showToast } = useToast();
  const [search, setSearch] = useState('');
  const [saving, setSaving] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Expense | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    amount: '',
    category: 'OTHER',
    date: new Date().toISOString().split('T')[0],
    notes: ''
  });

  const filteredExpenses = initialExpenses.filter(e =>
    e.name.toLowerCase().includes(search.toLowerCase()) ||
    e.category.toLowerCase().includes(search.toLowerCase())
  );

  const openModal = (expense?: Expense) => {
    if (expense) {
      setEditingExpense(expense);
      setFormData({
        name: expense.name,
        amount: expense.amount.toString(),
        category: expense.category,
        date: new Date(expense.date).toISOString().split('T')[0],
        notes: expense.notes || ''
      });
    } else {
      setEditingExpense(null);
      setFormData({
        name: '',
        amount: '',
        category: 'OTHER',
        date: new Date().toISOString().split('T')[0],
        notes: ''
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
      const res = await fetch(url, {
        method: editingExpense ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      if (!res.ok) throw new Error('Failed to save');
      setShowModal(false);
      router.refresh();
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
    } catch (err) {
      showToast('Gagal menghapus pengeluaran', 'error');
    }
  };

  return (
    <>
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/50" />
          <input 
            type="text" 
            placeholder="Search expenses..." 
            value={search} 
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 text-sm bg-white border border-border/40 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-400 transition-all shadow-sm" 
          />
        </div>
        <button 
          onClick={() => openModal()}
          className="flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-xl gradient-brand text-white hover:opacity-90 transition-all shadow-md active:scale-[0.98] whitespace-nowrap"
        >
          <Plus className="w-4 h-4" /> Add Expense
        </button>
      </div>

      {/* Table */}
      <div className="bg-white border border-border/40 rounded-2xl shadow-sm overflow-hidden overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead>
            <tr className="border-b border-border/40 bg-muted/20">
              <th className="px-5 py-3.5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Date</th>
              <th className="px-5 py-3.5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Expense Name</th>
              <th className="px-5 py-3.5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Category</th>
              <th className="px-5 py-3.5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Amount</th>
              <th className="px-5 py-3.5 text-right text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/30">
            {filteredExpenses.map((exp) => (
              <tr key={exp.id} className="group hover:bg-muted/10 transition-colors">
                <td className="px-5 py-3 text-muted-foreground font-medium">
                  {new Date(exp.date).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}
                </td>
                <td className="px-5 py-3">
                  <div className="flex flex-col">
                    <span className="font-semibold text-foreground">{exp.name}</span>
                    {exp.notes && <span className="text-[10px] text-muted-foreground line-clamp-1">{exp.notes}</span>}
                  </div>
                </td>
                <td className="px-5 py-3">
                  <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-700">
                    {exp.category}
                  </span>
                </td>
                <td className="px-5 py-3 font-bold text-rose-600">
                  {formatRupiah(exp.amount)}
                </td>
                <td className="px-5 py-3 text-right">
                  <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button 
                      onClick={() => openModal(exp)} 
                      className="p-1.5 hover:bg-blue-50 rounded-lg text-blue-600 transition-colors"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => setDeleteTarget(exp)} 
                      className="p-1.5 hover:bg-rose-50 rounded-lg text-rose-600 transition-colors"
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
          <div className="py-12 text-center text-muted-foreground/50">
            <Receipt className="w-10 h-10 mx-auto mb-2 opacity-30" />
            <p className="text-sm">No expenses recorded</p>
          </div>
        )}
      </div>

      {/* Total Summary */}
      <div className="mt-4 p-4 bg-rose-50 rounded-2xl border border-rose-100 flex justify-between items-center">
        <div>
          <p className="text-[10px] font-bold text-rose-700 uppercase tracking-wider">Total Expenses (Selected List)</p>
          <p className="text-xl font-bold text-rose-900">
            {formatRupiah(filteredExpenses.reduce((acc, curr) => acc + curr.amount, 0))}
          </p>
        </div>
        <Receipt className="w-8 h-8 text-rose-200" />
      </div>

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border/30">
              <h3 className="text-base font-bold font-heading">{editingExpense ? 'Edit Expense' : 'New Expense'}</h3>
              <button onClick={() => setShowModal(false)} className="p-1 hover:bg-muted rounded-lg"><X className="w-5 h-5 text-muted-foreground" /></button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block mb-1.5">Expense Name / Item *</label>
                <div className="relative">
                  <FileText className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/30" />
                  <input 
                    value={formData.name} 
                    onChange={e => setFormData(p => ({ ...p, name: e.target.value }))}
                    className="w-full pl-10 pr-4 py-2.5 text-sm bg-muted/30 border border-border/40 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:bg-white transition-all" 
                    placeholder="e.g. Listrik Mei, Sewa Ruko"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block mb-1.5">Amount (Rp) *</label>
                  <input 
                    type="number"
                    value={formData.amount} 
                    onChange={e => setFormData(p => ({ ...p, amount: e.target.value }))}
                    className="w-full px-3.5 py-2.5 text-sm bg-muted/30 border border-border/40 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:bg-white transition-all" 
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block mb-1.5">Category</label>
                  <select 
                    value={formData.category} 
                    onChange={e => setFormData(p => ({ ...p, category: e.target.value }))}
                    className="w-full px-3.5 py-2.5 text-sm bg-muted/30 border border-border/40 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:bg-white transition-all"
                  >
                    {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block mb-1.5">Date</label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/30" />
                  <input 
                    type="date"
                    value={formData.date} 
                    onChange={e => setFormData(p => ({ ...p, date: e.target.value }))}
                    className="w-full pl-10 pr-4 py-2.5 text-sm bg-muted/30 border border-border/40 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:bg-white transition-all" 
                  />
                </div>
              </div>
              <div>
                <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block mb-1.5">Notes (Optional)</label>
                <textarea 
                  value={formData.notes} 
                  onChange={e => setFormData(p => ({ ...p, notes: e.target.value }))}
                  rows={2}
                  className="w-full px-3.5 py-2.5 text-sm bg-muted/30 border border-border/40 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:bg-white transition-all resize-none"
                  placeholder="Additional details..."
                />
              </div>
            </div>
            <div className="px-6 py-4 border-t border-border/30 flex justify-end gap-2 bg-muted/10">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 text-sm font-medium rounded-xl hover:bg-muted transition-colors">Cancel</button>
              <button onClick={handleSave} disabled={saving}
                className="px-5 py-2 text-sm font-semibold rounded-xl gradient-brand text-white hover:opacity-90 transition-all flex items-center gap-2 disabled:opacity-50">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Save Expense
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirm */}
      {deleteTarget && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 text-center">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 flex items-center justify-center mx-auto mb-4">
              <Trash2 className="w-5 h-5 text-rose-500" />
            </div>
            <h3 className="text-base font-bold mb-1">Delete Expense?</h3>
            <p className="text-sm text-muted-foreground mb-5"><strong>{deleteTarget.name}</strong> will be permanently removed.</p>
            <div className="flex gap-2">
              <button onClick={() => setDeleteTarget(null)} className="flex-1 px-4 py-2.5 text-sm font-medium rounded-xl hover:bg-muted transition-colors">Cancel</button>
              <button onClick={handleDelete} className="flex-1 px-4 py-2.5 text-sm font-semibold rounded-xl bg-rose-600 text-white hover:bg-rose-700 transition-colors">Delete</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
