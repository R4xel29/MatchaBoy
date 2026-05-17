'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Edit2, Trash2, X, Save, Loader2, FolderOpen, Package } from 'lucide-react';

interface CategoryWithCount { id: string; name: string; slug: string; _count: { products: number }; }
interface Props { initialCategories: CategoryWithCount[]; }

export default function AdminCategoriesClient({ initialCategories }: Props) {
  const router = useRouter();
  const [showModal, setShowModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState<CategoryWithCount | null>(null);
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<CategoryWithCount | null>(null);
  const [deleteError, setDeleteError] = useState('');

  const openModal = (cat?: CategoryWithCount) => {
    setEditingCategory(cat || null);
    setName(cat?.name || '');
    setShowModal(true);
  };

  const closeModal = () => { setShowModal(false); setEditingCategory(null); setName(''); };

  const handleSave = async () => {
    if (!name.trim()) { alert('Category name is required'); return; }
    setSaving(true);
    try {
      const url = editingCategory ? `/api/admin/categories/${editingCategory.id}` : '/api/admin/categories';
      const res = await fetch(url, { method: editingCategory ? 'PATCH' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: name.trim() }) });
      if (!res.ok) throw new Error('Failed');
      closeModal(); router.refresh();
    } catch { alert('Error saving category'); }
    finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleteError('');
    try {
      const res = await fetch(`/api/admin/categories/${deleteTarget.id}`, { method: 'DELETE' });
      if (res.status === 409) { const data = await res.json(); setDeleteError(data.error); return; }
      if (!res.ok) throw new Error('Failed');
      setDeleteTarget(null); router.refresh();
    } catch { alert('Error deleting category'); }
  };

  return (
    <>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-muted-foreground">{initialCategories.length} categories</p>
        <button onClick={() => openModal()}
          className="flex items-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-xl gradient-brand text-white hover:opacity-90 transition-all shadow-md shadow-brand-700/15 active:scale-[0.98]">
          <Plus className="w-4 h-4" /> Add Category
        </button>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {initialCategories.map(cat => (
          <div key={cat.id} className="group p-4 rounded-2xl bg-white border border-border/40 shadow-[0_1px_2px_rgba(0,0,0,0.03)] hover:shadow-md hover:border-border/60 transition-all duration-300">
            <div className="flex items-start justify-between mb-3">
              <div className="w-10 h-10 rounded-xl bg-brand-500/10 flex items-center justify-center">
                <FolderOpen className="w-5 h-5 text-brand-600" />
              </div>
              <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={() => openModal(cat)} className="p-1.5 hover:bg-blue-50 rounded-lg text-muted-foreground hover:text-blue-600 transition-colors">
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
                <button onClick={() => { setDeleteTarget(cat); setDeleteError(''); }} className="p-1.5 hover:bg-rose-50 rounded-lg text-muted-foreground hover:text-rose-600 transition-colors">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
            <h3 className="font-semibold text-foreground text-[14px]">{cat.name}</h3>
            <p className="text-[11px] text-muted-foreground mt-1 flex items-center gap-1">
              <Package className="w-3 h-3" /> {cat._count.products} products
            </p>
          </div>
        ))}
      </div>

      {initialCategories.length === 0 && (
        <div className="py-16 text-center text-muted-foreground/50 bg-white rounded-2xl border border-border/40 mt-3">
          <FolderOpen className="w-10 h-10 mx-auto mb-2 opacity-30" />
          <p className="text-sm">No categories yet</p>
        </div>
      )}

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" onClick={closeModal}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-border/30">
              <h3 className="text-base font-bold font-heading">{editingCategory ? 'Edit Category' : 'New Category'}</h3>
              <button onClick={closeModal} className="p-1 hover:bg-muted rounded-lg"><X className="w-5 h-5 text-muted-foreground" /></button>
            </div>
            <div className="p-6">
              <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block mb-1.5">Category Name *</label>
              <input value={name} onChange={e => setName(e.target.value)} autoFocus onKeyDown={e => e.key === 'Enter' && handleSave()} placeholder="e.g. Seasonal Specials"
                className="w-full px-3.5 py-2.5 text-sm bg-muted/30 border border-border/40 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:bg-white transition-all" />
            </div>
            <div className="px-6 py-4 border-t border-border/30 flex justify-end gap-2 bg-muted/10">
              <button onClick={closeModal} className="px-4 py-2 text-sm font-medium rounded-xl hover:bg-muted transition-colors">Cancel</button>
              <button onClick={handleSave} disabled={saving}
                className="px-5 py-2 text-sm font-semibold rounded-xl gradient-brand text-white hover:opacity-90 transition-all flex items-center gap-2 disabled:opacity-50 shadow-md shadow-brand-700/15">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                {saving ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirm */}
      {deleteTarget && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" onClick={() => setDeleteTarget(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 text-center" onClick={e => e.stopPropagation()}>
            <div className="w-12 h-12 rounded-2xl bg-rose-50 flex items-center justify-center mx-auto mb-4">
              <Trash2 className="w-5 h-5 text-rose-500" />
            </div>
            <h3 className="text-base font-bold mb-1">Delete Category?</h3>
            <p className="text-sm text-muted-foreground mb-4"><strong>{deleteTarget.name}</strong> will be permanently removed.</p>
            {deleteError && <p className="text-xs text-rose-600 bg-rose-50 rounded-lg px-3 py-2 mb-4">{deleteError}</p>}
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
