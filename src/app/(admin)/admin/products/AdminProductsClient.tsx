'use client';

import { useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { formatRupiah } from '@/lib/utils';
import {
  Search, Plus, Edit2, Trash2, Power, PowerOff, X, Save, Loader2,
  ImageIcon, Upload, Snowflake, CandyCane, CirclePlus, CircleMinus
} from 'lucide-react';

// ── Types ──
interface CategoryItem { id: string; name: string; slug: string; }
interface ProductItem {
  id: string; name: string; description: string; price: number;
  image: string | null; badge: string | null; categoryId: string;
  category: CategoryItem; modifiers: string | null;
}
interface Props { initialProducts: ProductItem[]; categories: CategoryItem[]; }

interface AddOnItem { id: string; name: string; price: number; }
interface ModifiersData {
  iceLevel?: string[];
  sugarLevel?: string[];
  addOns?: AddOnItem[];
}

const ALL_ICE_LEVELS = ['Normal Ice', 'Less Ice', 'No Ice'];
const ALL_SUGAR_LEVELS = ['Normal Sugar', 'Less Sugar'];

// ── WebP Compression Utility ──
function compressToWebP(file: File, maxSize = 800, quality = 0.8): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      let w = img.width, h = img.height;
      if (w > maxSize || h > maxSize) {
        const ratio = Math.min(maxSize / w, maxSize / h);
        w = Math.round(w * ratio);
        h = Math.round(h * ratio);
      }
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      if (!ctx) { reject(new Error('Canvas not supported')); return; }
      ctx.drawImage(img, 0, 0, w, h);
      canvas.toBlob(
        (blob) => blob ? resolve(blob) : reject(new Error('Compression failed')),
        'image/webp',
        quality
      );
    };
    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = URL.createObjectURL(file);
  });
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
  const [deleteTarget, setDeleteTarget] = useState<ProductItem | null>(null);

  // Image upload state
  const [uploading, setUploading] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Modifier state
  const [modIce, setModIce] = useState<string[]>([]);
  const [modSugar, setModSugar] = useState<string[]>([]);
  const [modAddOns, setModAddOns] = useState<AddOnItem[]>([]);
  const [newAddOnName, setNewAddOnName] = useState('');
  const [newAddOnPrice, setNewAddOnPrice] = useState('');

  const filteredProducts = initialProducts.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase());
    const matchesCat = selectedCategory === 'all' || p.categoryId === selectedCategory;
    return matchesSearch && matchesCat;
  });

  const toggleAvailability = async (productId: string, currentBadge: string | null) => {
    setIsUpdating(true);
    try {
      await fetch(`/api/admin/products/${productId}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ badge: currentBadge === 'sold-out' ? null : 'sold-out' })
      });
      router.refresh();
    } catch { alert('Error updating product'); }
    finally { setIsUpdating(false); }
  };

  const openModal = (product?: ProductItem) => {
    if (product) {
      setEditingProduct(product);
      setFormData({
        name: product.name, description: product.description,
        price: product.price.toString(), categoryId: product.categoryId,
        image: product.image || ''
      });
      setImagePreview(product.image || null);

      // Parse modifiers
      const mods: ModifiersData = product.modifiers ? JSON.parse(product.modifiers) : {};
      setModIce(mods.iceLevel || []);
      setModSugar(mods.sugarLevel || []);
      setModAddOns(mods.addOns || []);
    } else {
      setEditingProduct(null);
      setFormData({ name: '', description: '', price: '', categoryId: categories[0]?.id || '', image: '' });
      setImagePreview(null);
      setModIce([]);
      setModSugar([]);
      setModAddOns([]);
    }
    setNewAddOnName('');
    setNewAddOnPrice('');
    setShowModal(true);
  };

  const closeModal = () => { setShowModal(false); setEditingProduct(null); };

  // ── Image Upload ──
  const handleImageSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      // 1. Compress to WebP on client
      const webpBlob = await compressToWebP(file, 800, 0.8);

      // 2. Preview
      setImagePreview(URL.createObjectURL(webpBlob));

      // 3. Upload to server
      const fd = new FormData();
      fd.append('file', new File([webpBlob], file.name.replace(/\.[^.]+$/, '.webp'), { type: 'image/webp' }));

      const res = await fetch('/api/admin/upload', { method: 'POST', body: fd });
      if (!res.ok) { const err = await res.json(); throw new Error(err.error || 'Upload failed'); }

      const { url } = await res.json();
      setFormData(p => ({ ...p, image: url }));
    } catch (err: any) {
      alert('Image upload failed: ' + err.message);
      setImagePreview(null);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }, []);

  // ── Modifier Helpers ──
  const toggleIce = (level: string) => setModIce(prev => prev.includes(level) ? prev.filter(l => l !== level) : [...prev, level]);
  const toggleSugar = (level: string) => setModSugar(prev => prev.includes(level) ? prev.filter(l => l !== level) : [...prev, level]);

  const addAddOn = () => {
    if (!newAddOnName.trim() || !newAddOnPrice) return;
    const id = newAddOnName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    setModAddOns(prev => [...prev, { id, name: newAddOnName.trim(), price: Number(newAddOnPrice) }]);
    setNewAddOnName('');
    setNewAddOnPrice('');
  };

  const removeAddOn = (id: string) => setModAddOns(prev => prev.filter(a => a.id !== id));

  // ── Save ──
  const handleSave = async () => {
    if (!formData.name || !formData.description || !formData.price || !formData.categoryId) { alert('Fill all required fields'); return; }
    setSaving(true);

    const modifiers: ModifiersData = {};
    if (modIce.length > 0) modifiers.iceLevel = modIce;
    if (modSugar.length > 0) modifiers.sugarLevel = modSugar;
    if (modAddOns.length > 0) modifiers.addOns = modAddOns;

    const hasModifiers = Object.keys(modifiers).length > 0;

    try {
      const url = editingProduct ? `/api/admin/products/${editingProduct.id}` : '/api/admin/products';
      const res = await fetch(url, {
        method: editingProduct ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          price: Number(formData.price),
          modifiers: hasModifiers ? modifiers : null,
        }),
      });
      if (!res.ok) throw new Error('Failed');
      closeModal(); router.refresh();
    } catch { alert('Error saving product'); }
    finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      const res = await fetch(`/api/admin/products/${deleteTarget.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed');
      setDeleteTarget(null); router.refresh();
    } catch { alert('Error deleting product'); }
  };

  const getModifierSummary = (modStr: string | null): string => {
    if (!modStr) return '—';
    try {
      const m: ModifiersData = JSON.parse(modStr);
      const parts: string[] = [];
      if (m.iceLevel?.length) parts.push(`Ice (${m.iceLevel.length})`);
      if (m.sugarLevel?.length) parts.push(`Sugar (${m.sugarLevel.length})`);
      if (m.addOns?.length) parts.push(`${m.addOns.length} add-ons`);
      return parts.join(', ') || '—';
    } catch { return '—'; }
  };

  return (
    <>
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/50" />
          <input type="text" placeholder="Search products..." value={search} onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 text-sm bg-white border border-border/40 rounded-xl focus:outline-none focus:ring-2 focus:ring-matcha-500/20 focus:border-matcha-400 transition-all shadow-[0_1px_2px_rgba(0,0,0,0.04)]" />
        </div>
        <div className="flex gap-2">
          <select value={selectedCategory} onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-3 py-2.5 text-sm bg-white border border-border/40 rounded-xl focus:outline-none focus:ring-2 focus:ring-matcha-500/20 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
            <option value="all">All Categories</option>
            {categories.map(c => (<option key={c.id} value={c.id}>{c.name}</option>))}
          </select>
          <button onClick={() => openModal()}
            className="flex items-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-xl gradient-matcha text-white hover:opacity-90 transition-all shadow-md shadow-matcha-700/15 active:scale-[0.98] whitespace-nowrap">
            <Plus className="w-4 h-4" /> Add
          </button>
        </div>
      </div>

      {/* Desktop Table */}
      <div className="hidden md:block bg-white border border-border/40 rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.04)] overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border/40">
              <th className="px-5 py-3.5 text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Product</th>
              <th className="px-5 py-3.5 text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Category</th>
              <th className="px-5 py-3.5 text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Price</th>
              <th className="px-5 py-3.5 text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Modifiers</th>
              <th className="px-5 py-3.5 text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Status</th>
              <th className="px-5 py-3.5 text-right text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/30">
            {filteredProducts.map((product) => {
              const isSoldOut = product.badge === 'sold-out';
              return (
                <tr key={product.id} className={`group hover:bg-muted/20 transition-colors ${isSoldOut ? 'opacity-60' : ''}`}>
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-muted/50 overflow-hidden flex-shrink-0 border border-border/20">
                        {product.image ? <img src={product.image} alt={product.name} className="w-full h-full object-cover" />
                          : <div className="w-full h-full flex items-center justify-center"><ImageIcon className="w-4 h-4 text-muted-foreground/30" /></div>}
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-foreground text-[13px] truncate">{product.name}</p>
                        <p className="text-[11px] text-muted-foreground truncate max-w-[180px]">{product.description}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-3">
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-matcha-50 text-matcha-700">{product.category.name}</span>
                  </td>
                  <td className="px-5 py-3 font-semibold text-[13px]">{formatRupiah(product.price)}</td>
                  <td className="px-5 py-3 text-[11px] text-muted-foreground">{getModifierSummary(product.modifiers)}</td>
                  <td className="px-5 py-3">
                    <button onClick={() => toggleAvailability(product.id, product.badge)} disabled={isUpdating}
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all
                        ${isSoldOut ? 'bg-rose-50 text-rose-600 hover:bg-rose-100' : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100'}`}>
                      {isSoldOut ? <PowerOff className="w-3 h-3" /> : <Power className="w-3 h-3" />}
                      {isSoldOut ? 'Sold Out' : 'Available'}
                    </button>
                  </td>
                  <td className="px-5 py-3 text-right">
                    <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => openModal(product)} className="p-1.5 hover:bg-blue-50 rounded-lg text-muted-foreground hover:text-blue-600 transition-colors"><Edit2 className="w-3.5 h-3.5" /></button>
                      <button onClick={() => setDeleteTarget(product)} className="p-1.5 hover:bg-rose-50 rounded-lg text-muted-foreground hover:text-rose-600 transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {filteredProducts.length === 0 && (
          <div className="py-12 text-center text-muted-foreground/50">
            <ImageIcon className="w-10 h-10 mx-auto mb-2 opacity-30" /><p className="text-sm">No products found</p>
          </div>
        )}
      </div>

      {/* Mobile Cards */}
      <div className="md:hidden space-y-3">
        {filteredProducts.length === 0 ? (
          <div className="py-12 text-center text-muted-foreground/50 bg-white rounded-2xl border border-border/40">
            <ImageIcon className="w-10 h-10 mx-auto mb-2 opacity-30" /><p className="text-sm">No products found</p>
          </div>
        ) : filteredProducts.map((product) => {
          const isSoldOut = product.badge === 'sold-out';
          return (
            <div key={product.id} className={`bg-white rounded-2xl border border-border/40 p-4 shadow-[0_1px_2px_rgba(0,0,0,0.03)] ${isSoldOut ? 'opacity-60' : ''}`}>
              <div className="flex items-start gap-3">
                <div className="w-14 h-14 rounded-xl bg-muted/50 overflow-hidden flex-shrink-0 border border-border/20">
                  {product.image ? <img src={product.image} alt={product.name} className="w-full h-full object-cover" />
                    : <div className="w-full h-full flex items-center justify-center"><ImageIcon className="w-5 h-5 text-muted-foreground/30" /></div>}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-foreground text-[13px]">{product.name}</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-1">{product.description}</p>
                  <div className="flex items-center gap-2 mt-1.5">
                    <span className="font-bold text-sm">{formatRupiah(product.price)}</span>
                    <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase bg-matcha-50 text-matcha-700">{product.category.name}</span>
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-1">{getModifierSummary(product.modifiers)}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 mt-3 pt-3 border-t border-border/30">
                <button onClick={() => toggleAvailability(product.id, product.badge)} disabled={isUpdating}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-[11px] font-bold uppercase transition-all
                    ${isSoldOut ? 'bg-rose-50 text-rose-600' : 'bg-emerald-50 text-emerald-600'}`}>
                  {isSoldOut ? <PowerOff className="w-3 h-3" /> : <Power className="w-3 h-3" />}
                  {isSoldOut ? 'Sold Out' : 'Available'}
                </button>
                <button onClick={() => openModal(product)} className="p-2 hover:bg-blue-50 rounded-lg text-muted-foreground hover:text-blue-600 transition-colors"><Edit2 className="w-4 h-4" /></button>
                <button onClick={() => setDeleteTarget(product)} className="p-2 hover:bg-rose-50 rounded-lg text-muted-foreground hover:text-rose-600 transition-colors"><Trash2 className="w-4 h-4" /></button>
              </div>
            </div>
          );
        })}
      </div>

      {/* ═══════ Add/Edit Modal ═══════ */}
      {showModal && (
        <div className="fixed inset-0 z-[60] flex items-start justify-center bg-black/40 backdrop-blur-sm p-4 overflow-y-auto" onClick={closeModal}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl my-8 overflow-hidden" onClick={e => e.stopPropagation()}>
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-border/30 sticky top-0 bg-white z-10">
              <h3 className="text-base font-bold font-heading">{editingProduct ? 'Edit Product' : 'New Product'}</h3>
              <button onClick={closeModal} className="p-1 hover:bg-muted rounded-lg"><X className="w-5 h-5 text-muted-foreground" /></button>
            </div>

            <div className="p-6 space-y-5 max-h-[70vh] overflow-y-auto">
              {/* ── Image Upload ── */}
              <div>
                <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block mb-2">Product Image</label>
                {imagePreview || formData.image ? (
                  <div className="relative group">
                    <img src={imagePreview || formData.image} alt="Preview" className="w-full aspect-[16/10] object-cover rounded-xl border border-border/30" />
                    <div className="absolute inset-0 bg-black/40 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                      <button type="button" onClick={() => fileInputRef.current?.click()}
                        className="px-3 py-2 bg-white rounded-lg text-xs font-semibold hover:bg-white/90 transition-colors">
                        Change
                      </button>
                      <button type="button" onClick={() => { setImagePreview(null); setFormData(p => ({ ...p, image: '' })); }}
                        className="px-3 py-2 bg-rose-500 text-white rounded-lg text-xs font-semibold hover:bg-rose-600 transition-colors">
                        Remove
                      </button>
                    </div>
                  </div>
                ) : (
                  <button type="button" onClick={() => fileInputRef.current?.click()}
                    className="w-full aspect-[16/10] rounded-xl border-2 border-dashed border-border/50 hover:border-matcha-400 bg-muted/20 hover:bg-matcha-50/30 transition-all flex flex-col items-center justify-center gap-2 cursor-pointer">
                    {uploading ? (
                      <><Loader2 className="w-6 h-6 text-matcha-500 animate-spin" /><span className="text-xs text-muted-foreground">Compressing & uploading...</span></>
                    ) : (
                      <><Upload className="w-6 h-6 text-muted-foreground/40" /><span className="text-xs text-muted-foreground">Click to upload — Auto WebP</span></>
                    )}
                  </button>
                )}
                <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageSelect} className="hidden" />
                <p className="text-[10px] text-muted-foreground mt-1.5">Images are auto-compressed to WebP (max 800px, 80% quality)</p>
              </div>

              {/* ── Basic Info ── */}
              <div>
                <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block mb-1.5">Product Name *</label>
                <input value={formData.name} onChange={e => setFormData(p => ({ ...p, name: e.target.value }))}
                  className="w-full px-3.5 py-2.5 text-sm bg-muted/30 border border-border/40 rounded-xl focus:outline-none focus:ring-2 focus:ring-matcha-500/20 focus:bg-white transition-all" />
              </div>
              <div>
                <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block mb-1.5">Description *</label>
                <textarea value={formData.description} onChange={e => setFormData(p => ({ ...p, description: e.target.value }))} rows={2}
                  className="w-full px-3.5 py-2.5 text-sm bg-muted/30 border border-border/40 rounded-xl focus:outline-none focus:ring-2 focus:ring-matcha-500/20 focus:bg-white transition-all resize-none" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block mb-1.5">Price (Rp) *</label>
                  <input type="number" value={formData.price} onChange={e => setFormData(p => ({ ...p, price: e.target.value }))}
                    className="w-full px-3.5 py-2.5 text-sm bg-muted/30 border border-border/40 rounded-xl focus:outline-none focus:ring-2 focus:ring-matcha-500/20 focus:bg-white transition-all" />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block mb-1.5">Category *</label>
                  <select value={formData.categoryId} onChange={e => setFormData(p => ({ ...p, categoryId: e.target.value }))}
                    className="w-full px-3.5 py-2.5 text-sm bg-muted/30 border border-border/40 rounded-xl focus:outline-none focus:ring-2 focus:ring-matcha-500/20 focus:bg-white transition-all">
                    {categories.map(c => (<option key={c.id} value={c.id}>{c.name}</option>))}
                  </select>
                </div>
              </div>

              {/* ── Modifiers Section ── */}
              <div className="pt-4 border-t border-border/30">
                <h4 className="text-xs font-bold text-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
                  <Snowflake className="w-3.5 h-3.5 text-matcha-600" /> Product Modifiers
                </h4>
                <p className="text-[10px] text-muted-foreground mb-3">Select which customization options are available for this product</p>

                {/* Ice Level */}
                <div className="mb-3">
                  <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider block mb-2">❄️ Ice Level</label>
                  <div className="flex flex-wrap gap-2">
                    {ALL_ICE_LEVELS.map(level => (
                      <button key={level} type="button" onClick={() => toggleIce(level)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all border
                          ${modIce.includes(level)
                            ? 'bg-matcha-600 text-white border-matcha-600 shadow-sm'
                            : 'bg-muted/30 text-muted-foreground border-border/40 hover:border-matcha-400'}`}>
                        {level}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Sugar Level */}
                <div className="mb-3">
                  <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider block mb-2">🍬 Sugar Level</label>
                  <div className="flex flex-wrap gap-2">
                    {ALL_SUGAR_LEVELS.map(level => (
                      <button key={level} type="button" onClick={() => toggleSugar(level)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all border
                          ${modSugar.includes(level)
                            ? 'bg-matcha-600 text-white border-matcha-600 shadow-sm'
                            : 'bg-muted/30 text-muted-foreground border-border/40 hover:border-matcha-400'}`}>
                        {level}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Add-Ons */}
                <div>
                  <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider block mb-2">🧁 Add-Ons</label>
                  {modAddOns.length > 0 && (
                    <div className="space-y-1.5 mb-2">
                      {modAddOns.map(addon => (
                        <div key={addon.id} className="flex items-center justify-between px-3 py-2 rounded-lg bg-muted/20 border border-border/30">
                          <span className="text-xs font-medium text-foreground">{addon.name}</span>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-matcha-600 font-medium">+{formatRupiah(addon.price)}</span>
                            <button type="button" onClick={() => removeAddOn(addon.id)}
                              className="p-0.5 hover:bg-rose-50 rounded text-muted-foreground hover:text-rose-500 transition-colors">
                              <CircleMinus className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="flex gap-2">
                    <input value={newAddOnName} onChange={e => setNewAddOnName(e.target.value)} placeholder="Add-on name"
                      onKeyDown={e => e.key === 'Enter' && addAddOn()}
                      className="flex-1 px-3 py-2 text-xs bg-muted/30 border border-border/40 rounded-lg focus:outline-none focus:ring-2 focus:ring-matcha-500/20 focus:bg-white transition-all" />
                    <input type="number" value={newAddOnPrice} onChange={e => setNewAddOnPrice(e.target.value)} placeholder="Price"
                      onKeyDown={e => e.key === 'Enter' && addAddOn()}
                      className="w-24 px-3 py-2 text-xs bg-muted/30 border border-border/40 rounded-lg focus:outline-none focus:ring-2 focus:ring-matcha-500/20 focus:bg-white transition-all" />
                    <button type="button" onClick={addAddOn}
                      className="p-2 rounded-lg bg-matcha-50 text-matcha-600 hover:bg-matcha-100 transition-colors">
                      <CirclePlus className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-border/30 flex justify-end gap-2 bg-muted/10 sticky bottom-0">
              <button onClick={closeModal} className="px-4 py-2 text-sm font-medium rounded-xl hover:bg-muted transition-colors">Cancel</button>
              <button onClick={handleSave} disabled={saving || uploading}
                className="px-5 py-2 text-sm font-semibold rounded-xl gradient-matcha text-white hover:opacity-90 transition-all flex items-center gap-2 disabled:opacity-50 shadow-md shadow-matcha-700/15">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                {saving ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══════ Delete Confirm ═══════ */}
      {deleteTarget && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" onClick={() => setDeleteTarget(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 text-center" onClick={e => e.stopPropagation()}>
            <div className="w-12 h-12 rounded-2xl bg-rose-50 flex items-center justify-center mx-auto mb-4">
              <Trash2 className="w-5 h-5 text-rose-500" />
            </div>
            <h3 className="text-base font-bold mb-1">Delete Product?</h3>
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
