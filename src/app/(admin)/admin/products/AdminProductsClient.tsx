'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { formatRupiah } from '@/lib/utils';
import { Search, Plus, Edit2, Trash2, Power, PowerOff, X, Save, Loader2 } from 'lucide-react';

interface CategoryItem {
  id: string;
  name: string;
  slug: string;
}

interface ProductItem {
  id: string;
  name: string;
  description: string;
  price: number;
  image: string | null;
  badge: string | null;
  categoryId: string;
  category: CategoryItem;
}

interface Props {
  initialProducts: ProductItem[];
  categories: CategoryItem[];
}

export default function AdminProductsClient({ initialProducts, categories }: Props) {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [isUpdating, setIsUpdating] = useState(false);

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<ProductItem | null>(null);
  const [formData, setFormData] = useState({ name: '', description: '', price: '', categoryId: '', image: '' });
  const [saving, setSaving] = useState(false);

  // Delete confirm state
  const [deleteTarget, setDeleteTarget] = useState<ProductItem | null>(null);

  const filteredProducts = initialProducts.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase());
    const matchesCat = selectedCategory === 'all' || p.categoryId === selectedCategory;
    return matchesSearch && matchesCat;
  });

  const toggleAvailability = async (productId: string, currentBadge: string | null) => {
    setIsUpdating(true);
    try {
      const newBadge = currentBadge === 'sold-out' ? null : 'sold-out';
      const res = await fetch(`/api/admin/products/${productId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ badge: newBadge })
      });
      if (!res.ok) throw new Error('Failed');
      router.refresh();
    } catch { alert('Error updating product status'); }
    finally { setIsUpdating(false); }
  };

  // Open modal for Add or Edit
  const openModal = (product?: ProductItem) => {
    if (product) {
      setEditingProduct(product);
      setFormData({
        name: product.name,
        description: product.description,
        price: product.price.toString(),
        categoryId: product.categoryId,
        image: product.image || '',
      });
    } else {
      setEditingProduct(null);
      setFormData({ name: '', description: '', price: '', categoryId: categories[0]?.id || '', image: '' });
    }
    setShowModal(true);
  };

  const closeModal = () => { setShowModal(false); setEditingProduct(null); };

  const handleSave = async () => {
    if (!formData.name || !formData.description || !formData.price || !formData.categoryId) {
      alert('Please fill all required fields');
      return;
    }
    setSaving(true);
    try {
      const url = editingProduct
        ? `/api/admin/products/${editingProduct.id}`
        : '/api/admin/products';
      const method = editingProduct ? 'PATCH' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          price: Number(formData.price),
        }),
      });

      if (!res.ok) throw new Error('Failed');
      closeModal();
      router.refresh();
    } catch { alert('Error saving product'); }
    finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      const res = await fetch(`/api/admin/products/${deleteTarget.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed');
      setDeleteTarget(null);
      router.refresh();
    } catch { alert('Error deleting product'); }
  };

  return (
    <>
      <div className="bg-white rounded-2xl border border-border/50 shadow-sm overflow-hidden">
        {/* Filters */}
        <div className="p-4 border-b border-border/50 flex flex-col sm:flex-row gap-4 justify-between items-center">
          <div className="flex-1 flex gap-4 w-full">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text" placeholder="Search products..."
                value={search} onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 text-sm border border-border bg-card rounded-xl focus:outline-none focus:ring-2 focus:ring-matcha-500/30 transition-all"
              />
            </div>
            <select value={selectedCategory} onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-4 py-2 text-sm border border-border bg-card rounded-xl focus:outline-none focus:ring-2 focus:ring-matcha-500/30 outline-none">
              <option value="all">All Categories</option>
              {categories.map(c => (<option key={c.id} value={c.id}>{c.name}</option>))}
            </select>
          </div>
          <button onClick={() => openModal()}
            className="flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-xl gradient-matcha text-white hover:opacity-90 transition-opacity whitespace-nowrap">
            <Plus className="w-4 h-4" /> Add Product
          </button>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-muted-foreground bg-muted/30 uppercase border-b border-border/50">
              <tr>
                <th className="px-6 py-4 font-medium">Product</th>
                <th className="px-6 py-4 font-medium">Category</th>
                <th className="px-6 py-4 font-medium">Price</th>
                <th className="px-6 py-4 font-medium">Status</th>
                <th className="px-6 py-4 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {filteredProducts.map((product) => {
                const isSoldOut = product.badge === 'sold-out';
                return (
                  <tr key={product.id} className={`hover:bg-muted/30 transition-colors ${isSoldOut ? 'opacity-75' : ''}`}>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-muted overflow-hidden flex-shrink-0">
                          {product.image
                            ? <img src={product.image} alt={product.name} className="w-full h-full object-cover" />
                            : <div className="w-full h-full gradient-matcha opacity-20" />}
                        </div>
                        <div>
                          <div className="font-semibold text-foreground">{product.name}</div>
                          <div className="text-xs text-muted-foreground truncate max-w-[200px]">{product.description}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-matcha-50 text-matcha-700 border border-matcha-200">
                        {product.category.name}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-medium">{formatRupiah(product.price)}</td>
                    <td className="px-6 py-4">
                      <button onClick={() => toggleAvailability(product.id, product.badge)} disabled={isUpdating}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-bold uppercase tracking-wider transition-colors border
                          ${isSoldOut ? 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100' : 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'}`}>
                        {isSoldOut ? <PowerOff className="w-3 h-3" /> : <Power className="w-3 h-3" />}
                        {isSoldOut ? 'Sold Out' : 'Available'}
                      </button>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        <button onClick={() => openModal(product)}
                          className="p-2 text-muted-foreground hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button onClick={() => setDeleteTarget(product)}
                          className="p-2 text-muted-foreground hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {filteredProducts.length === 0 && (
            <div className="p-12 text-center text-muted-foreground/70">
              <Search className="w-12 h-12 mx-auto mb-3 opacity-20" />
              <p>No products found.</p>
            </div>
          )}
        </div>
      </div>

      {/* ─── Add/Edit Modal ─── */}
      {showModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border/50">
              <h3 className="text-lg font-bold font-heading">{editingProduct ? 'Edit Product' : 'Add New Product'}</h3>
              <button onClick={closeModal} className="p-1 hover:bg-muted rounded-lg"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground mb-1 block">Product Name *</label>
                <input value={formData.name} onChange={e => setFormData(p => ({ ...p, name: e.target.value }))}
                  className="w-full px-4 py-2.5 text-sm border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-matcha-500/30" />
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground mb-1 block">Description *</label>
                <textarea value={formData.description} onChange={e => setFormData(p => ({ ...p, description: e.target.value }))} rows={3}
                  className="w-full px-4 py-2.5 text-sm border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-matcha-500/30 resize-none" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground mb-1 block">Price (Rp) *</label>
                  <input type="number" value={formData.price} onChange={e => setFormData(p => ({ ...p, price: e.target.value }))}
                    className="w-full px-4 py-2.5 text-sm border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-matcha-500/30" />
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground mb-1 block">Category *</label>
                  <select value={formData.categoryId} onChange={e => setFormData(p => ({ ...p, categoryId: e.target.value }))}
                    className="w-full px-4 py-2.5 text-sm border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-matcha-500/30">
                    {categories.map(c => (<option key={c.id} value={c.id}>{c.name}</option>))}
                  </select>
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground mb-1 block">Image URL</label>
                <input value={formData.image} onChange={e => setFormData(p => ({ ...p, image: e.target.value }))}
                  placeholder="https://example.com/image.jpg"
                  className="w-full px-4 py-2.5 text-sm border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-matcha-500/30" />
              </div>
            </div>
            <div className="px-6 py-4 border-t border-border/50 flex justify-end gap-3">
              <button onClick={closeModal} className="px-4 py-2 text-sm font-medium rounded-xl border border-border hover:bg-muted transition-colors">Cancel</button>
              <button onClick={handleSave} disabled={saving}
                className="px-5 py-2 text-sm font-semibold rounded-xl gradient-matcha text-white hover:opacity-90 transition-opacity flex items-center gap-2 disabled:opacity-50">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                {saving ? 'Saving...' : 'Save Product'}
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
            <h3 className="text-lg font-bold mb-2">Delete Product?</h3>
            <p className="text-sm text-muted-foreground mb-6">
              Are you sure you want to delete <strong>{deleteTarget.name}</strong>? This action cannot be undone.
            </p>
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
