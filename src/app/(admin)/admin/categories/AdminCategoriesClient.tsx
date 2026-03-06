'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Edit2, Trash2, X, Save, Loader2, FolderOpen, Package } from 'lucide-react';

interface CategoryWithCount {
  id: string;
  name: string;
  slug: string;
  _count: { products: number };
}

interface Props {
  initialCategories: CategoryWithCount[];
}

export default function AdminCategoriesClient({ initialCategories }: Props) {
  const router = useRouter();

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState<CategoryWithCount | null>(null);
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);

  // Delete state
  const [deleteTarget, setDeleteTarget] = useState<CategoryWithCount | null>(null);
  const [deleteError, setDeleteError] = useState('');

  const openModal = (cat?: CategoryWithCount) => {
    if (cat) {
      setEditingCategory(cat);
      setName(cat.name);
    } else {
      setEditingCategory(null);
      setName('');
    }
    setShowModal(true);
  };

  const closeModal = () => { setShowModal(false); setEditingCategory(null); setName(''); };

  const handleSave = async () => {
    if (!name.trim()) { alert('Category name is required'); return; }
    setSaving(true);
    try {
      const url = editingCategory
        ? `/api/admin/categories/${editingCategory.id}`
        : '/api/admin/categories';
      const method = editingCategory ? 'PATCH' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim() }),
      });
      if (!res.ok) throw new Error('Failed');
      closeModal();
      router.refresh();
    } catch { alert('Error saving category'); }
    finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleteError('');
    try {
      const res = await fetch(`/api/admin/categories/${deleteTarget.id}`, { method: 'DELETE' });
      if (res.status === 409) {
        const data = await res.json();
        setDeleteError(data.error);
        return;
      }
      if (!res.ok) throw new Error('Failed');
      setDeleteTarget(null);
      router.refresh();
    } catch { alert('Error deleting category'); }
  };

  return (
    <>
      <div className="bg-white rounded-2xl border border-border/50 shadow-sm overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-border/50 flex justify-between items-center">
          <p className="text-sm text-muted-foreground">{initialCategories.length} categories</p>
          <button onClick={() => openModal()}
            className="flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-xl gradient-matcha text-white hover:opacity-90 transition-opacity">
            <Plus className="w-4 h-4" /> Add Category
          </button>
        </div>

        {/* Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
          {initialCategories.map(cat => (
            <div key={cat.id} className="p-4 rounded-xl border border-border/50 hover:shadow-md transition-shadow bg-card group">
              <div className="flex items-start justify-between mb-3">
                <div className="w-10 h-10 rounded-lg bg-matcha-50 flex items-center justify-center">
                  <FolderOpen className="w-5 h-5 text-matcha-600" />
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => openModal(cat)} className="p-1.5 hover:bg-blue-50 rounded-lg text-muted-foreground hover:text-blue-600 transition-colors">
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => { setDeleteTarget(cat); setDeleteError(''); }}
                    className="p-1.5 hover:bg-rose-50 rounded-lg text-muted-foreground hover:text-rose-600 transition-colors">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
              <h3 className="font-semibold text-foreground">{cat.name}</h3>
              <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                <Package className="w-3 h-3" /> {cat._count.products} products
              </p>
            </div>
          ))}
        </div>

        {initialCategories.length === 0 && (
          <div className="p-12 text-center text-muted-foreground/70">
            <FolderOpen className="w-12 h-12 mx-auto mb-3 opacity-20" />
            <p>No categories yet. Add your first category.</p>
          </div>
        )}
      </div>

      {/* ─── Add/Edit Modal ─── */}
      {showModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border/50">
              <h3 className="text-lg font-bold font-heading">{editingCategory ? 'Edit Category' : 'Add Category'}</h3>
              <button onClick={closeModal} className="p-1 hover:bg-muted rounded-lg"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-6">
              <label className="text-sm font-medium text-muted-foreground mb-1 block">Category Name *</label>
              <input value={name} onChange={e => setName(e.target.value)}
                placeholder="e.g. Seasonal Specials"
                autoFocus
                onKeyDown={e => e.key === 'Enter' && handleSave()}
                className="w-full px-4 py-2.5 text-sm border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-matcha-500/30" />
            </div>
            <div className="px-6 py-4 border-t border-border/50 flex justify-end gap-3">
              <button onClick={closeModal} className="px-4 py-2 text-sm font-medium rounded-xl border border-border hover:bg-muted transition-colors">Cancel</button>
              <button onClick={handleSave} disabled={saving}
                className="px-5 py-2 text-sm font-semibold rounded-xl gradient-matcha text-white hover:opacity-90 transition-opacity flex items-center gap-2 disabled:opacity-50">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                {saving ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Delete Confirm Modal ─── */}
      {deleteTarget && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 text-center">
            <div className="w-12 h-12 rounded-full bg-rose-50 flex items-center justify-center mx-auto mb-4">
              <Trash2 className="w-6 h-6 text-rose-600" />
            </div>
            <h3 className="text-lg font-bold mb-2">Delete Category?</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Delete <strong>{deleteTarget.name}</strong>? This cannot be undone.
            </p>
            {deleteError && (
              <p className="text-sm text-rose-600 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2 mb-4">{deleteError}</p>
            )}
            <div className="flex gap-3">
              <button onClick={() => setDeleteTarget(null)}
                className="flex-1 px-4 py-2.5 text-sm font-medium rounded-xl border border-border hover:bg-muted transition-colors">Cancel</button>
              <button onClick={handleDelete}
                className="flex-1 px-4 py-2.5 text-sm font-semibold rounded-xl bg-rose-600 text-white hover:bg-rose-700 transition-colors">Delete</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
