'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { formatRupiah } from '@/lib/utils';
import { useToast } from '@/components/ui/Toast';
import {
  Search, Plus, Edit2, Trash2, Power, PowerOff, X, Save, Loader2,
  ImageIcon, Upload, Snowflake, CandyCane, CirclePlus, CircleMinus, History
} from 'lucide-react';

// ── Types ──
interface CategoryItem { id: string; name: string; slug: string; }
interface ProductItem {
  id: string; name: string; description: string; price: number;
  image: string | null; badge: string | null; categoryId: string;
  category: CategoryItem; modifiers: string | null;
}
interface IngredientItem { id: string; name: string; unit: string; costPerUnit: number; }
interface Props { initialProducts: ProductItem[]; categories: CategoryItem[]; ingredients: IngredientItem[]; }

interface AddOnItem { id: string; name: string; price: number; }
interface ModifiersData {
  iceLevel?: string[];
  sugarLevel?: string[];
  addOns?: AddOnItem[];
  isBundle?: boolean;
  bundleGroups?: any[];
  freeShipping?: boolean;
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

export default function AdminProductsClient({ initialProducts, categories, ingredients }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const categoryParam = searchParams.get('category');
  const { showToast } = useToast();
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [isUpdating, setIsUpdating] = useState(false);
  const [activeTab, setActiveTab] = useState<'products' | 'combos'>('products');

  useEffect(() => {
    if (categoryParam) {
      setSelectedCategory(categoryParam);
    }
  }, [categoryParam]);

  // Checkbox Selection & Bulk Actions
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  useEffect(() => {
    setSelectedIds([]);
  }, [activeTab, selectedCategory, search]);

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]);
  };

  const toggleSelectAll = () => {
    const visibleIds = filteredProducts.map(p => p.id);
    const allSelected = visibleIds.every(id => selectedIds.includes(id));
    if (allSelected) {
      setSelectedIds(prev => prev.filter(id => !visibleIds.includes(id)));
    } else {
      setSelectedIds(prev => {
        const next = [...prev];
        visibleIds.forEach(id => {
          if (!next.includes(id)) next.push(id);
        });
        return next;
      });
    }
  };

  const handleBulkAction = async (action: 'delete' | 'availability' | 'category', value?: any) => {
    if (selectedIds.length === 0) return;
    
    if (action === 'delete') {
      if (!confirm(`Apakah Anda yakin ingin menghapus/mengarsipkan ${selectedIds.length} produk terpilih?`)) {
        return;
      }
    }

    setIsUpdating(true);
    try {
      const res = await fetch('/api/admin/products/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: selectedIds, action, value })
      });
      const data = await res.json();
      if (res.ok) {
        showToast(data.message || 'Bulk action berhasil dijalankan', 'success');
        setSelectedIds([]);
        router.refresh();
      } else {
        throw new Error(data.error || 'Bulk action gagal');
      }
    } catch (err: any) {
      showToast(err.message || 'Gagal memproses bulk action', 'error');
    } finally {
      setIsUpdating(false);
    }
  };

  // Visual Product Selector Modal
  const [activeGroupIdForPicker, setActiveGroupIdForPicker] = useState<string | null>(null);
  const [pickerSearch, setPickerSearch] = useState('');
  const [pickerCategory, setPickerCategory] = useState('all');

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

  // Image cropping states
  const [cropImageSrc, setCropImageSrc] = useState<string | null>(null);
  const [cropZoom, setCropZoom] = useState(1);
  const [cropOffset, setCropOffset] = useState({ x: 0, y: 0 });
  const [isCropperDragging, setIsCropperDragging] = useState(false);
  const cropperDragStart = useRef({ x: 0, y: 0 });
  const cropperViewportRef = useRef<HTMLDivElement>(null);
  const cropperImgRef = useRef<HTMLImageElement>(null);

  // Modifier state
  const [modIce, setModIce] = useState<string[]>([]);
  const [modSugar, setModSugar] = useState<string[]>([]);
  const [modAddOns, setModAddOns] = useState<AddOnItem[]>([]);
  const [newAddOnName, setNewAddOnName] = useState('');
  const [newAddOnPrice, setNewAddOnPrice] = useState('');

  // Bundle / Combo state
  const [isBundle, setIsBundle] = useState<boolean>(false);
  const [bundleGroups, setBundleGroups] = useState<any[]>([]);
  const [freeShipping, setFreeShipping] = useState<boolean>(false);

  // Discount Pricing Calculator state
  const [discountType, setDiscountType] = useState<'fixed' | 'nominal' | 'percent'>('fixed');
  const [discountValue, setDiscountValue] = useState<string>('');

  const getRegularTotalPrice = useCallback(() => {
    let total = 0;
    bundleGroups.forEach(group => {
      if (group.options.length > 0) {
        const firstOpt = group.options[0];
        const prod = initialProducts.find(p => p.id === firstOpt.productId);
        if (prod) {
          total += prod.price * (group.selectCount || 1);
        }
      }
    });
    return total;
  }, [bundleGroups, initialProducts]);

  const handleDiscountTypeChange = (type: 'fixed' | 'nominal' | 'percent') => {
    setDiscountType(type);
    setDiscountValue('');
    if (type === 'fixed') {
      // Just keep current price
    } else {
      // Set to regular price initially
      setFormData(prev => ({ ...prev, price: getRegularTotalPrice().toString() }));
    }
  };

  const handleDiscountValueChange = (val: string) => {
    setDiscountValue(val);
    const regularTotal = getRegularTotalPrice();
    if (discountType === 'percent') {
      const pct = Number(val || 0);
      const finalPrice = Math.max(0, regularTotal * (1 - pct / 100));
      setFormData(prev => ({ ...prev, price: Math.round(finalPrice).toString() }));
    } else if (discountType === 'nominal') {
      const nom = Number(val || 0);
      const finalPrice = Math.max(0, regularTotal - nom);
      setFormData(prev => ({ ...prev, price: Math.round(finalPrice).toString() }));
    }
  };

  // Automatically sync price if discount is active and regular total changes
  useEffect(() => {
    if (discountType === 'fixed') return;
    const regularTotal = getRegularTotalPrice();
    if (discountType === 'percent') {
      const pct = Number(discountValue || 0);
      const finalPrice = Math.max(0, regularTotal * (1 - pct / 100));
      setFormData(prev => ({ ...prev, price: Math.round(finalPrice).toString() }));
    } else if (discountType === 'nominal') {
      const nom = Number(discountValue || 0);
      const finalPrice = Math.max(0, regularTotal - nom);
      setFormData(prev => ({ ...prev, price: Math.round(finalPrice).toString() }));
    }
  }, [bundleGroups, discountType, discountValue, getRegularTotalPrice]);

  // Bundle helper functions
  const addBundleGroup = () => {
    const id = 'group_' + Math.random().toString(36).substr(2, 9);
    setBundleGroups(prev => [...prev, { id, name: 'Group Pilihan Baru', selectCount: 1, options: [] }]);
  };

  const removeBundleGroup = (id: string) => {
    setBundleGroups(prev => prev.filter(g => g.id !== id));
  };

  const updateGroupName = (id: string, name: string) => {
    setBundleGroups(prev => prev.map(g => g.id === id ? { ...g, name } : g));
  };

  const addOptionToGroup = (groupId: string, productId: string) => {
    if (!productId) return;
    const prod = initialProducts.find(p => p.id === productId);
    if (!prod) return;

    setBundleGroups(prev => prev.map(g => {
      if (g.id !== groupId) return g;
      const alreadyHas = g.options.some((o: any) => o.productId === productId);
      if (alreadyHas) return g;
      return {
        ...g,
        options: [...g.options, { productId, name: prod.name, priceAdjustment: 0 }]
      };
    }));
  };

  const removeOptionFromGroup = (groupId: string, productId: string) => {
    setBundleGroups(prev => prev.map(g => {
      if (g.id !== groupId) return g;
      return {
        ...g,
        options: g.options.filter((o: any) => o.productId !== productId)
      };
    }));
  };

  const updateOptionPrice = (groupId: string, productId: string, priceAdjustment: number) => {
    setBundleGroups(prev => prev.map(g => {
      if (g.id !== groupId) return g;
      return {
        ...g,
        options: g.options.map((o: any) => o.productId === productId ? { ...o, priceAdjustment } : o)
      };
    }));
  };

  // Recipe state
  const [showRecipeModal, setShowRecipeModal] = useState(false);
  const [recipeProduct, setRecipeProduct] = useState<ProductItem | null>(null);
  const [recipeItems, setRecipeItems] = useState<{ ingredientId: string; quantity: string }[]>([]);
  const [loadingRecipe, setLoadingRecipe] = useState(false);
  const [savingRecipe, setSavingRecipe] = useState(false);

  const isProductBundle = (product: ProductItem): boolean => {
    if (!product.modifiers) return false;
    try {
      const parsed = JSON.parse(product.modifiers);
      return !!parsed.isBundle;
    } catch {
      return false;
    }
  };

  const filteredProducts = initialProducts.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase());
    const isCombo = isProductBundle(p);

    if (activeTab === 'combos') {
      if (!isCombo) return false;
    } else {
      if (isCombo) return false;
    }

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
    } catch { showToast('Gagal memperbarui produk', 'error'); }
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
      setIsBundle(mods.isBundle || false);
      setBundleGroups(mods.bundleGroups || []);
      setFreeShipping(mods.freeShipping || false);
      setDiscountType('fixed');
      setDiscountValue('');
    } else {
      setEditingProduct(null);
      setFormData({ name: '', description: '', price: '', categoryId: categories[0]?.id || '', image: '' });
      setImagePreview(null);
      setModIce([]);
      setModSugar([]);
      setModAddOns([]);
      setIsBundle(activeTab === 'combos');
      setBundleGroups([]);
      setFreeShipping(false);
      setDiscountType('fixed');
      setDiscountValue('');
    }
    setNewAddOnName('');
    setNewAddOnPrice('');
    setShowModal(true);
  };

  const closeModal = () => { setShowModal(false); setEditingProduct(null); };

  // ── Image Upload & Cropping handlers ──
  const handleImageSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      setCropImageSrc(reader.result as string);
      setCropZoom(1);
      setCropOffset({ x: 0, y: 0 });
    };
    reader.readAsDataURL(file);
  }, []);

  const handleCropperMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsCropperDragging(true);
    cropperDragStart.current = { x: e.clientX - cropOffset.x, y: e.clientY - cropOffset.y };
  };

  const handleCropperMouseMove = useCallback((e: MouseEvent) => {
    if (!isCropperDragging) return;
    setCropOffset({
      x: e.clientX - cropperDragStart.current.x,
      y: e.clientY - cropperDragStart.current.y
    });
  }, [isCropperDragging, cropOffset.x, cropOffset.y]);

  const handleCropperMouseUp = useCallback(() => {
    setIsCropperDragging(false);
  }, []);

  const handleCropperTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length !== 1) return;
    setIsCropperDragging(true);
    const touch = e.touches[0];
    cropperDragStart.current = { x: touch.clientX - cropOffset.x, y: touch.clientY - cropOffset.y };
  };

  const handleCropperTouchMove = useCallback((e: TouchEvent) => {
    if (!isCropperDragging || e.touches.length !== 1) return;
    const touch = e.touches[0];
    setCropOffset({
      x: touch.clientX - cropperDragStart.current.x,
      y: touch.clientY - cropperDragStart.current.y
    });
  }, [isCropperDragging, cropOffset.x, cropOffset.y]);

  const handleCropperTouchEnd = useCallback(() => {
    setIsCropperDragging(false);
  }, []);

  // Attach global window event handlers for smooth dragging when mouse/finger leaves the viewport container
  useEffect(() => {
    if (isCropperDragging) {
      window.addEventListener('mousemove', handleCropperMouseMove);
      window.addEventListener('mouseup', handleCropperMouseUp);
      window.addEventListener('touchmove', handleCropperTouchMove);
      window.addEventListener('touchend', handleCropperTouchEnd);
    }
    return () => {
      window.removeEventListener('mousemove', handleCropperMouseMove);
      window.removeEventListener('mouseup', handleCropperMouseUp);
      window.removeEventListener('touchmove', handleCropperTouchMove);
      window.removeEventListener('touchend', handleCropperTouchEnd);
    };
  }, [isCropperDragging, handleCropperMouseMove, handleCropperMouseUp, handleCropperTouchMove, handleCropperTouchEnd]);

  const handleCropConfirm = async () => {
    if (!cropperViewportRef.current || !cropperImgRef.current) return;
    setUploading(true);
    try {
      const rectV = cropperViewportRef.current.getBoundingClientRect();
      const rectI = cropperImgRef.current.getBoundingClientRect();

      const canvas = document.createElement('canvas');
      canvas.width = 800;
      canvas.height = 500; // 16:10 aspect ratio
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Canvas not supported');

      // Fill background as white (in case image is smaller than container)
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const canvasScale = 800 / rectV.width;
      const x = (rectI.left - rectV.left) * canvasScale;
      const y = (rectI.top - rectV.top) * canvasScale;
      const w = rectI.width * canvasScale;
      const h = rectI.height * canvasScale;

      ctx.drawImage(cropperImgRef.current, x, y, w, h);

      // Export to WebP blob
      const webpBlob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob(
          (blob) => blob ? resolve(blob) : reject(new Error('Cropping failed')),
          'image/webp',
          0.8
        );
      });

      // Show locally immediately
      setImagePreview(URL.createObjectURL(webpBlob));

      // Upload to server
      const fd = new FormData();
      fd.append('file', new File([webpBlob], 'cropped-product.webp', { type: 'image/webp' }));

      const res = await fetch('/api/admin/upload', { method: 'POST', body: fd });
      if (!res.ok) { const err = await res.json(); throw new Error(err.error || 'Upload failed'); }

      const { url } = await res.json();
      setFormData(p => ({ ...p, image: url }));
      setCropImageSrc(null);
    } catch (err: any) {
      showToast('Gagal memotong/mengupload gambar: ' + err.message, 'error');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

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

  // ── Recipe Helpers ──
  const openRecipeModal = async (product: ProductItem) => {
    setRecipeProduct(product);
    setRecipeItems([]);
    setLoadingRecipe(true);
    setShowRecipeModal(true);
    try {
      const res = await fetch(`/api/admin/products/${product.id}/recipe`);
      if (res.ok) {
        const data = await res.json();
        setRecipeItems(data.map((item: any) => ({
          ingredientId: item.ingredientId,
          quantity: item.quantity.toString()
        })));
      }
    } catch (err) {
      console.error('Error fetching recipe:', err);
    } finally {
      setLoadingRecipe(false);
    }
  };

  const addRecipeItem = () => setRecipeItems(prev => [...prev, { ingredientId: ingredients[0]?.id || '', quantity: '1' }]);
  const removeRecipeItem = (index: number) => setRecipeItems(prev => prev.filter((_, i) => i !== index));
  const updateRecipeItem = (index: number, field: string, value: string) => {
    setRecipeItems(prev => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  };

  const handleSaveRecipe = async () => {
    if (!recipeProduct) return;
    setSavingRecipe(true);
    try {
      const res = await fetch(`/api/admin/products/${recipeProduct.id}/recipe`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ingredients: recipeItems }),
      });
      if (!res.ok) throw new Error('Failed to save recipe');
      setShowRecipeModal(false);
      router.refresh();
    } catch (err) {
      showToast('Gagal menyimpan resep', 'error');
    } finally {
      setSavingRecipe(false);
    }
  };

  // ── Save ──
  const handleSave = async () => {
    if (!formData.name || !formData.description || !formData.price || !formData.categoryId) { showToast('Harap isi semua kolom wajib', 'error'); return; }
    setSaving(true);

    const modifiers: ModifiersData = {};
    if (isBundle) {
      modifiers.isBundle = true;
      modifiers.bundleGroups = bundleGroups;
      modifiers.freeShipping = freeShipping;
    } else {
      if (modIce.length > 0) modifiers.iceLevel = modIce;
      if (modSugar.length > 0) modifiers.sugarLevel = modSugar;
      if (modAddOns.length > 0) modifiers.addOns = modAddOns;
    }

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
    } catch { showToast('Gagal menyimpan produk', 'error'); }
    finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      const res = await fetch(`/api/admin/products/${deleteTarget.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed');
      setDeleteTarget(null); router.refresh();
    } catch { showToast('Gagal menghapus produk', 'error'); }
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
      {/* Premium Tab Navigation */}
      <div className="flex gap-2 border-b border-border/30 pb-3 mb-5">
        <button
          onClick={() => { setActiveTab('products'); setSelectedCategory('all'); }}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold uppercase tracking-wider rounded-xl transition-all ${
            activeTab === 'products'
              ? 'bg-brand-600 text-white shadow-md shadow-brand-700/10'
              : 'bg-white hover:bg-muted/30 text-muted-foreground border border-border/20 shadow-sm'
          }`}
        >
          🍔 Semua Produk ({initialProducts.filter(p => !isProductBundle(p)).length})
        </button>
        <button
          onClick={() => { setActiveTab('combos'); setSelectedCategory('all'); }}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold uppercase tracking-wider rounded-xl transition-all ${
            activeTab === 'combos'
              ? 'bg-brand-600 text-white shadow-md shadow-brand-700/10'
              : 'bg-white hover:bg-muted/30 text-muted-foreground border border-border/20 shadow-sm'
          }`}
        >
          📦 Paket Combo & Promo ({initialProducts.filter(p => isProductBundle(p)).length})
        </button>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/50" />
          <input type="text" placeholder={activeTab === 'combos' ? "Cari paket combo / promo..." : "Cari produk..."} value={search} onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 text-sm bg-white border border-border/40 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-400 transition-all shadow-[0_1px_2px_rgba(0,0,0,0.04)]" />
        </div>
        <div className="flex gap-2">
          {activeTab !== 'combos' && (
            <select value={selectedCategory} onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-3 py-2.5 text-sm bg-white border border-border/40 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
              <option value="all">All Categories</option>
              {categories.map(c => (<option key={c.id} value={c.id}>{c.name}</option>))}
            </select>
          )}
          <button onClick={() => openModal()}
            className="flex items-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-xl gradient-brand text-white hover:opacity-90 transition-all shadow-md shadow-brand-700/15 active:scale-[0.98] whitespace-nowrap">
            <Plus className="w-4 h-4" /> {activeTab === 'combos' ? 'Tambah Combo' : 'Add'}
          </button>
        </div>
      </div>

      {/* Bulk Action Bar */}
      {selectedIds.length > 0 && (
        <div className="mb-4 flex flex-col md:flex-row items-center justify-between gap-3 p-4 bg-brand-50 border border-brand-200 rounded-2xl animate-in slide-in-from-top-2 duration-300">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-brand-600 animate-pulse" />
            <span className="text-xs font-bold text-brand-800">{selectedIds.length} produk terpilih</span>
          </div>
          <div className="flex flex-wrap gap-2 items-center">
            <button
              type="button"
              onClick={() => handleBulkAction('availability', 'available')}
              disabled={isUpdating}
              className="px-3 py-1.5 bg-white border border-brand-200 text-brand-700 hover:bg-brand-50 text-[10px] font-bold rounded-lg transition-all shadow-sm"
            >
              Set Available
            </button>
            <button
              type="button"
              onClick={() => handleBulkAction('availability', 'sold-out')}
              disabled={isUpdating}
              className="px-3 py-1.5 bg-white border border-brand-200 text-brand-750 hover:bg-brand-50 text-[10px] font-bold rounded-lg transition-all shadow-sm"
            >
              Set Sold Out
            </button>
            <select
              onChange={(e) => {
                if (e.target.value) {
                  handleBulkAction('category', e.target.value);
                  e.target.value = '';
                }
              }}
              disabled={isUpdating}
              className="px-3 py-1.5 bg-white border border-brand-200 text-brand-750 hover:bg-brand-50 text-[10px] font-bold rounded-lg transition-all outline-none shadow-sm cursor-pointer"
            >
              <option value="">Pindahkan Kategori...</option>
              {categories.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => handleBulkAction('delete')}
              disabled={isUpdating}
              className="px-3 py-1.5 bg-rose-650 hover:bg-rose-700 text-white text-[10px] font-bold rounded-lg transition-all flex items-center gap-1 shadow-sm"
            >
              <Trash2 className="w-3 h-3" /> Hapus / Arsip
            </button>
          </div>
        </div>
      )}

      {/* Desktop Table */}
      <div className="hidden md:block bg-white border border-border/40 rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.04)] overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border/40">
              <th className="w-10 px-5 py-3.5 text-left">
                <input 
                  type="checkbox" 
                  checked={filteredProducts.length > 0 && filteredProducts.map(p => p.id).every(id => selectedIds.includes(id))}
                  onChange={toggleSelectAll}
                  className="rounded border-border text-brand-650 focus:ring-brand-500/20 w-4 h-4 cursor-pointer"
                />
              </th>
              <th className="px-5 py-3.5 text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Product</th>
              <th className="px-5 py-3.5 text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Category</th>
              <th className="px-5 py-3.5 text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Price</th>
              <th className="px-5 py-3.5 text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Modifiers</th>
              <th className="px-5 py-3.5 text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Status</th>
              <th className="px-5 py-3.5 text-right text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">HPP / Recipe</th>
              <th className="px-5 py-3.5 text-right text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/30">
            {filteredProducts.map((product) => {
              const isSoldOut = product.badge === 'sold-out';
              return (
                <tr key={product.id} className={`group hover:bg-muted/20 transition-colors ${isSoldOut ? 'opacity-60' : ''}`}>
                  <td className="w-10 px-5 py-3">
                    <input 
                      type="checkbox" 
                      checked={selectedIds.includes(product.id)}
                      onChange={() => toggleSelect(product.id)}
                      className="rounded border-border text-brand-650 focus:ring-brand-500/20 w-4 h-4 cursor-pointer"
                    />
                  </td>
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
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-brand-50 text-brand-700">{product.category.name}</span>
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
                    <button onClick={() => openRecipeModal(product)} className="text-[10px] font-bold text-brand-600 hover:underline flex items-center gap-1 justify-end">
                      <History className="w-3 h-3" /> Recipe
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
            <div key={product.id} className={`bg-white rounded-2xl border border-border/40 p-4 shadow-[0_1px_2px_rgba(0,0,0,0.03)] relative ${isSoldOut ? 'opacity-60' : ''}`}>
              <div className="absolute top-4 right-4 z-10">
                <input 
                  type="checkbox" 
                  checked={selectedIds.includes(product.id)}
                  onChange={() => toggleSelect(product.id)}
                  className="rounded border-border text-brand-650 focus:ring-brand-500/20 w-4 h-4 cursor-pointer"
                />
              </div>
              <div className="flex items-start gap-3 pr-6">
                <div className="w-14 h-14 rounded-xl bg-muted/50 overflow-hidden flex-shrink-0 border border-border/20">
                  {product.image ? <img src={product.image} alt={product.name} className="w-full h-full object-cover" />
                    : <div className="w-full h-full flex items-center justify-center"><ImageIcon className="w-5 h-5 text-muted-foreground/30" /></div>}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-foreground text-[13px]">{product.name}</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-1">{product.description}</p>
                  <div className="flex items-center gap-2 mt-1.5">
                    <span className="font-bold text-sm">{formatRupiah(product.price)}</span>
                    <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase bg-brand-50 text-brand-700">{product.category.name}</span>
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
              <h3 className="text-base font-bold font-heading">
                {editingProduct 
                  ? (isBundle ? 'Edit Paket Combo / Bundle' : 'Edit Product') 
                  : (activeTab === 'combos' ? 'Tambah Paket Combo / Bundle' : 'New Product')
                }
              </h3>
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
                    className="w-full aspect-[16/10] rounded-xl border-2 border-dashed border-border/50 hover:border-brand-400 bg-muted/20 hover:bg-brand-50/30 transition-all flex flex-col items-center justify-center gap-2 cursor-pointer">
                    {uploading ? (
                      <><Loader2 className="w-6 h-6 text-brand-500 animate-spin" /><span className="text-xs text-muted-foreground">Compressing & uploading...</span></>
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
                  className="w-full px-3.5 py-2.5 text-sm bg-muted/30 border border-border/40 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:bg-white transition-all" />
              </div>
              <div>
                <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block mb-1.5">Description *</label>
                <textarea value={formData.description} onChange={e => setFormData(p => ({ ...p, description: e.target.value }))} rows={2}
                  className="w-full px-3.5 py-2.5 text-sm bg-muted/30 border border-border/40 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:bg-white transition-all resize-none" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block mb-1.5">Price (Rp) *</label>
                  <input type="number" value={formData.price} onChange={e => setFormData(p => ({ ...p, price: e.target.value }))}
                    className="w-full px-3.5 py-2.5 text-sm bg-muted/30 border border-border/40 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:bg-white transition-all" />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block mb-1.5">Category *</label>
                  <select value={formData.categoryId} onChange={e => setFormData(p => ({ ...p, categoryId: e.target.value }))}
                    className="w-full px-3.5 py-2.5 text-sm bg-muted/30 border border-border/40 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:bg-white transition-all">
                    {categories.map(c => (<option key={c.id} value={c.id}>{c.name}</option>))}
                  </select>
                </div>
              </div>

              {/* ── Combo / Bundle Toggle ── */}
              <div className="pt-4 border-t border-border/30">
                <div className="flex items-center justify-between p-3.5 rounded-xl border border-border/30 bg-muted/10 mb-4">
                  <div>
                    <h4 className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-2">
                      📦 Produk Combo / Bundle?
                    </h4>
                    <p className="text-[10px] text-muted-foreground mt-0.5">Tipe produk ini terdiri dari pilihan produk-produk lain (e.g. 3 Roti Discount 15%)</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsBundle(!isBundle)}
                    className={`w-10 h-6 rounded-full transition-colors relative shrink-0 ${isBundle ? 'bg-brand-600' : 'bg-gray-200'}`}
                  >
                    <div className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-all ${isBundle ? 'left-[18px]' : 'left-0.5'}`} />
                  </button>
                </div>
              </div>

              {isBundle ? (
                /* ── Bundle Configurator ── */
                <div className="space-y-4">
                  {/* 💰 Premium Ringkasan Harga & Diskon Combo */}
                  <div className="p-4 rounded-2xl border border-brand-100 bg-brand-50/30 space-y-3">
                    <h5 className="text-[11px] font-bold text-brand-800 uppercase tracking-wider flex items-center gap-1.5">
                      💰 Kalkulator Diskon & Harga Combo
                    </h5>
                    
                    <div className="grid grid-cols-2 gap-3 text-xs bg-white p-3 rounded-xl border border-border/20 shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
                      <div>
                        <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Total Harga Asli</p>
                        <p className="text-base font-extrabold text-foreground mt-0.5">
                          {formatRupiah(getRegularTotalPrice())}
                        </p>
                        <p className="text-[9px] text-muted-foreground/80 mt-1 leading-normal">Sum harga menu pertama di setiap kelompok pilihan</p>
                      </div>
                      <div className="border-l border-border/30 pl-3">
                        <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Harga Paket Sekarang</p>
                        <p className="text-base font-extrabold text-brand-600 mt-0.5">
                          {formatRupiah(Number(formData.price || 0))}
                        </p>
                        {getRegularTotalPrice() > Number(formData.price || 0) && (
                          <p className="text-[9px] font-bold text-emerald-600 mt-1 flex items-center gap-0.5">
                            🎉 Hemat {formatRupiah(getRegularTotalPrice() - Number(formData.price || 0))} ({Math.round(((getRegularTotalPrice() - Number(formData.price || 0)) / getRegularTotalPrice()) * 100)}%)
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Tipe input diskon */}
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-brand-700 uppercase tracking-wider block">Metode Penentuan Harga Paket</label>
                      <div className="grid grid-cols-3 gap-1.5 bg-muted/20 p-1 rounded-xl border border-border/10">
                        <button
                          type="button"
                          onClick={() => handleDiscountTypeChange('fixed')}
                          className={`py-1.5 rounded-lg text-[10px] font-bold transition-all ${
                            discountType === 'fixed'
                              ? 'bg-white text-brand-700 shadow-sm border border-border/10'
                              : 'text-muted-foreground hover:text-foreground'
                          }`}
                        >
                          Manual (Input Harga)
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDiscountTypeChange('nominal')}
                          className={`py-1.5 rounded-lg text-[10px] font-bold transition-all ${
                            discountType === 'nominal'
                              ? 'bg-white text-brand-700 shadow-sm border border-border/10'
                              : 'text-muted-foreground hover:text-foreground'
                          }`}
                        >
                          Potongan Nominal (Rp)
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDiscountTypeChange('percent')}
                          className={`py-1.5 rounded-lg text-[10px] font-bold transition-all ${
                            discountType === 'percent'
                              ? 'bg-white text-brand-700 shadow-sm border border-border/10'
                              : 'text-muted-foreground hover:text-foreground'
                          }`}
                        >
                          Persentase (%)
                        </button>
                      </div>
                    </div>

                    {/* Input Nilai Diskon */}
                    {discountType !== 'fixed' && (
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-brand-700 uppercase tracking-wider block">
                          {discountType === 'percent' ? 'Masukkan Persen Diskon (%)' : 'Masukkan Nominal Potongan (Rp)'}
                        </label>
                        <div className="relative">
                          <input
                            type="number"
                            value={discountValue}
                            onChange={(e) => handleDiscountValueChange(e.target.value)}
                            placeholder={discountType === 'percent' ? 'e.g. 15' : 'e.g. 5000'}
                            className="w-full px-3 py-2 text-xs bg-white border border-border/40 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                          />
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-muted-foreground">
                            {discountType === 'percent' ? '%' : 'Rp'}
                          </span>
                        </div>
                      </div>
                    )}

                    {/* 🚚 Gratis Ongkir Toggle */}
                    <div className="pt-3 border-t border-border/20 flex items-center justify-between">
                      <div>
                        <p className="text-[10px] font-bold text-brand-700 uppercase tracking-wider flex items-center gap-1">
                          🚚 Gratis Ongkir untuk Paket Ini?
                        </p>
                        <p className="text-[9px] text-muted-foreground leading-normal mt-0.5">
                          Pelanggan mendapat gratis ongkir otomatis jika membeli paket combo ini
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setFreeShipping(!freeShipping)}
                        className={`w-9 h-5 rounded-full transition-colors relative shrink-0 ${freeShipping ? 'bg-emerald-500' : 'bg-gray-200'}`}
                      >
                        <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-all ${freeShipping ? 'left-[18px]' : 'left-0.5'}`} />
                      </button>
                    </div>
                  </div>

                  <div className="flex justify-between items-center pt-2">
                    <h4 className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-2">
                      🛠️ Pengaturan Kelompok Pilihan (Groups)
                    </h4>
                    <button type="button" onClick={addBundleGroup}
                      className="px-3 py-1.5 rounded-lg bg-brand-50 text-brand-700 hover:bg-brand-100 text-[10px] font-bold transition-all">
                      + Tambah Group
                    </button>
                  </div>

                  {bundleGroups.length === 0 ? (
                    <p className="text-xs text-muted-foreground italic text-center py-4 bg-muted/15 rounded-xl border border-dashed border-border/30">Belum ada kelompok pilihan. Klik "+ Tambah Group" di atas.</p>
                  ) : (
                    <div className="space-y-3.5">
                      {bundleGroups.map((group) => (
                        <div key={group.id} className="p-4 rounded-xl border border-border/40 bg-muted/5 relative">
                          <div className="flex justify-between items-center gap-2 mb-3">
                            <input
                              type="text"
                              value={group.name}
                              onChange={(e) => updateGroupName(group.id, e.target.value)}
                              placeholder="Nama Group (e.g., Food 1)"
                              className="font-bold text-xs text-foreground bg-transparent border-b border-border/40 focus:border-brand-500 focus:outline-none flex-1 pb-0.5"
                            />
                            <button
                              type="button"
                              onClick={() => removeBundleGroup(group.id)}
                              className="p-1 hover:bg-rose-50 text-rose-500 rounded-lg transition-colors"
                              title="Hapus Group"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>

                           {/* Options in group (Visual with Thumbnail Images) */}
                           <div className="space-y-1.5 mb-3">
                             {group.options.map((opt: any) => {
                               const optProd = initialProducts.find(p => p.id === opt.productId);
                               return (
                                 <div key={opt.productId} className="flex items-center justify-between p-2 rounded-xl bg-white border border-border/20 shadow-[0_1px_2px_rgba(0,0,0,0.02)] text-xs gap-3">
                                   <div className="flex items-center gap-2.5 min-w-0">
                                     <div className="w-8 h-8 rounded-lg bg-muted/50 overflow-hidden flex-shrink-0 border border-border/10">
                                       {optProd?.image ? (
                                         <img src={optProd.image} alt={opt.name} className="w-full h-full object-cover" />
                                       ) : (
                                         <div className="w-full h-full flex items-center justify-center bg-brand-50"><ImageIcon className="w-3.5 h-3.5 text-brand-300" /></div>
                                       )}
                                     </div>
                                     <span className="font-semibold text-foreground truncate">{opt.name}</span>
                                   </div>
                                   <div className="flex items-center gap-2 shrink-0">
                                     <span className="text-[10px] font-medium text-muted-foreground">Harga Extra:</span>
                                     <div className="relative">
                                       <span className="absolute left-1.5 top-1/2 -translate-y-1/2 text-[9px] font-bold text-muted-foreground">Rp</span>
                                       <input
                                         type="number"
                                         value={opt.priceAdjustment || 0}
                                         onChange={(e) => updateOptionPrice(group.id, opt.productId, Number(e.target.value))}
                                         className="w-16 pl-5 pr-1.5 py-0.5 border border-border/40 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500/20 text-right font-semibold text-[11px]"
                                       />
                                     </div>
                                     <button
                                       type="button"
                                       onClick={() => removeOptionFromGroup(group.id, opt.productId)}
                                       className="p-1 text-muted-foreground hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-colors"
                                     >
                                       <CircleMinus className="w-4 h-4" />
                                     </button>
                                   </div>
                                 </div>
                               );
                             })}
                           </div>

                           {/* Add option row (Visual Product Picker Modal Trigger & Quick select combo) */}
                           <div className="flex flex-col sm:flex-row gap-2">
                             <button
                               type="button"
                               onClick={() => {
                                 setActiveGroupIdForPicker(group.id);
                                 setPickerSearch('');
                                 setPickerCategory('all');
                               }}
                               className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-[11px] font-bold text-brand-700 bg-brand-50 hover:bg-brand-100 rounded-xl border border-brand-200/30 transition-all active:scale-[0.98]"
                             >
                               <Plus className="w-3.5 h-3.5" /> Pilih Makan / Minum (Visual)
                             </button>
                             <span className="text-[10px] text-muted-foreground self-center">atau</span>
                             <select
                               defaultValue=""
                               onChange={(e) => {
                                 if (e.target.value) {
                                   addOptionToGroup(group.id, e.target.value);
                                   e.target.value = ""; // Reset
                                 }
                               }}
                               className="flex-1 max-w-[200px] px-2.5 py-2 text-[10px] font-semibold bg-white border border-border/30 rounded-xl focus:outline-none"
                             >
                               <option value="" disabled>Cepat Tambah...</option>
                               {initialProducts
                                 .filter(p => p.id !== editingProduct?.id) // Prevent self-referencing
                                 .map(p => (
                                   <option key={p.id} value={p.id}>{p.name} ({formatRupiah(p.price)})</option>
                                 ))
                               }
                             </select>
                           </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                /* ── Standard Modifiers ── */
                <div className="space-y-4">
                  <h4 className="text-xs font-bold text-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
                    <Snowflake className="w-3.5 h-3.5 text-brand-600" /> Product Modifiers
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
                              ? 'bg-brand-600 text-white border-brand-600 shadow-sm'
                              : 'bg-muted/30 text-muted-foreground border-border/40 hover:border-brand-400'}`}>
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
                              ? 'bg-brand-600 text-white border-brand-600 shadow-sm'
                              : 'bg-muted/30 text-muted-foreground border-border/40 hover:border-brand-400'}`}>
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
                              <span className="text-xs text-brand-600 font-medium">+{formatRupiah(addon.price)}</span>
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
                        className="flex-1 px-3 py-2 text-xs bg-muted/30 border border-border/40 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:bg-white transition-all" />
                      <input type="number" value={newAddOnPrice} onChange={e => setNewAddOnPrice(e.target.value)} placeholder="Price"
                        onKeyDown={e => e.key === 'Enter' && addAddOn()}
                        className="w-24 px-3 py-2 text-xs bg-muted/30 border border-border/40 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:bg-white transition-all" />
                      <button type="button" onClick={addAddOn}
                        className="p-2 rounded-lg bg-brand-50 text-brand-600 hover:bg-brand-100 transition-colors">
                        <CirclePlus className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-border/30 flex justify-end gap-2 bg-muted/10 sticky bottom-0">
              <button onClick={closeModal} className="px-4 py-2 text-sm font-medium rounded-xl hover:bg-muted transition-colors">Cancel</button>
              <button onClick={handleSave} disabled={saving || uploading}
                className="px-5 py-2 text-sm font-semibold rounded-xl gradient-brand text-white hover:opacity-90 transition-all flex items-center gap-2 disabled:opacity-50 shadow-md shadow-brand-700/15">
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

      {/* ═══════ Recipe Modal ═══════ */}
      {showRecipeModal && recipeProduct && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border/30">
              <div>
                <h3 className="text-base font-bold font-heading">Product Recipe</h3>
                <p className="text-[11px] text-muted-foreground">Manage ingredients for <strong>{recipeProduct.name}</strong></p>
              </div>
              <button onClick={() => setShowRecipeModal(false)} className="p-1 hover:bg-muted rounded-lg"><X className="w-5 h-5 text-muted-foreground" /></button>
            </div>
            <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
              {loadingRecipe ? (
                <div className="py-12 flex flex-col items-center justify-center gap-3">
                  <Loader2 className="w-8 h-8 animate-spin text-brand-500" />
                  <p className="text-sm text-muted-foreground">Loading recipe...</p>
                </div>
              ) : (
                <>
                  <div className="space-y-3">
                    {recipeItems.map((item, index) => {
                      const selectedIng = ingredients.find(i => i.id === item.ingredientId);
                      return (
                        <div key={index} className="flex gap-2 items-end bg-muted/20 p-3 rounded-xl border border-border/30 group">
                          <div className="flex-1">
                            <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1 block">Ingredient</label>
                            <select 
                              value={item.ingredientId} 
                              onChange={(e) => updateRecipeItem(index, 'ingredientId', e.target.value)}
                              className="w-full px-2 py-1.5 text-xs bg-white border border-border/40 rounded-lg"
                            >
                              {ingredients.map(ing => <option key={ing.id} value={ing.id}>{ing.name} ({ing.unit})</option>)}
                            </select>
                          </div>
                          <div className="w-24">
                            <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1 block">Qty ({selectedIng?.unit || '-'})</label>
                            <input 
                              type="number" 
                              value={item.quantity} 
                              onChange={(e) => updateRecipeItem(index, 'quantity', e.target.value)}
                              className="w-full px-2 py-1.5 text-xs bg-white border border-border/40 rounded-lg"
                            />
                          </div>
                          <div className="w-24">
                            <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1 block">Cost</label>
                            <div className="px-2 py-1.5 text-[11px] font-semibold text-emerald-700">
                              {formatRupiah((selectedIng?.costPerUnit || 0) * parseFloat(item.quantity || '0'))}
                            </div>
                          </div>
                          <button onClick={() => removeRecipeItem(index)} className="p-2 text-rose-500 hover:bg-rose-50 rounded-lg transition-colors">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                  <button onClick={addRecipeItem} className="w-full py-2 border-2 border-dashed border-border/40 rounded-xl text-xs font-bold text-muted-foreground hover:border-brand-400 hover:text-brand-600 transition-all flex items-center justify-center gap-2">
                    <Plus className="w-4 h-4" /> Add Ingredient
                  </button>

                  <div className="mt-6 p-4 bg-brand-50 rounded-2xl border border-brand-100 flex justify-between items-center">
                    <div>
                      <p className="text-[10px] font-bold text-brand-700 uppercase tracking-wider">Total HPP per Serving</p>
                      <p className="text-xl font-bold text-brand-900">
                        {formatRupiah(recipeItems.reduce((acc, item) => {
                          const ing = ingredients.find(i => i.id === item.ingredientId);
                          return acc + (ing?.costPerUnit || 0) * parseFloat(item.quantity || '0');
                        }, 0))}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Sale Price</p>
                      <p className="text-lg font-bold text-foreground">{formatRupiah(recipeProduct.price)}</p>
                    </div>
                  </div>
                </>
              )}
            </div>
            <div className="px-6 py-4 border-t border-border/30 flex justify-end gap-2 bg-muted/10">
              <button onClick={() => setShowRecipeModal(false)} className="px-4 py-2 text-sm font-medium rounded-xl hover:bg-muted transition-colors">Cancel</button>
              <button onClick={handleSaveRecipe} disabled={savingRecipe || loadingRecipe}
                className="px-5 py-2 text-sm font-semibold rounded-xl gradient-brand text-white hover:opacity-90 transition-all flex items-center gap-2 disabled:opacity-50">
                {savingRecipe ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Save Recipe
              </button>
            </div>
          </div>
        </div>
      )}
      {/* ═══════ Searchable Visual Product Picker Modal ═══════ */}
      {activeGroupIdForPicker && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={() => setActiveGroupIdForPicker(null)}>
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden animate-scale-up" onClick={e => e.stopPropagation()}>
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-border/30 bg-muted/5 sticky top-0 z-10">
              <div>
                <h3 className="text-sm font-bold font-heading text-foreground flex items-center gap-2">
                  ✨ Pilih Pilihan Menu Combo
                </h3>
                <p className="text-[10px] text-muted-foreground mt-0.5">Pilih produk makanan atau minuman yang ingin ditambahkan ke kelompok pilihan ini.</p>
              </div>
              <button onClick={() => setActiveGroupIdForPicker(null)} className="p-1.5 hover:bg-muted rounded-xl transition-all"><X className="w-5 h-5 text-muted-foreground" /></button>
            </div>

            {/* Content Filters & Toolbar */}
            <div className="p-5 border-b border-border/20 bg-muted/5 space-y-3">
              <div className="flex flex-col sm:flex-row gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/45" />
                  <input
                    type="text"
                    placeholder="Cari nama makan / minum..."
                    value={pickerSearch}
                    onChange={(e) => setPickerSearch(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 text-xs bg-white border border-border/40 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 transition-all shadow-[0_1px_2px_rgba(0,0,0,0.02)]"
                  />
                </div>
                <select
                  value={pickerCategory}
                  onChange={(e) => setPickerCategory(e.target.value)}
                  className="px-3 py-2 text-xs bg-white border border-border/40 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 shadow-[0_1px_2px_rgba(0,0,0,0.02)]"
                >
                  <option value="all">Semua Kategori</option>
                  {categories.map(c => (<option key={c.id} value={c.id}>{c.name}</option>))}
                </select>
              </div>
            </div>

            {/* Products Grid */}
            <div className="p-5 max-h-[50vh] overflow-y-auto bg-gray-50/50">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3.5">
                {initialProducts
                  .filter(p => {
                    if (p.id === editingProduct?.id) return false; // Prevent self-referencing
                    const matchesSearch = p.name.toLowerCase().includes(pickerSearch.toLowerCase());
                    const matchesCat = pickerCategory === 'all' || p.categoryId === pickerCategory;
                    return matchesSearch && matchesCat;
                  })
                  .map((p) => {
                    const group = bundleGroups.find(g => g.id === activeGroupIdForPicker);
                    const isSelected = group?.options.some((o: any) => o.productId === p.id);

                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => {
                          if (isSelected) {
                            removeOptionFromGroup(activeGroupIdForPicker, p.id);
                          } else {
                            addOptionToGroup(activeGroupIdForPicker, p.id);
                          }
                        }}
                        className={`flex flex-col text-left rounded-2xl border bg-white overflow-hidden transition-all duration-300 group shadow-sm active:scale-[0.98] ${
                          isSelected
                            ? 'border-brand-500 ring-2 ring-brand-500/20 hover:border-brand-600'
                            : 'border-border/30 hover:border-brand-400 hover:shadow-md'
                        }`}
                      >
                        {/* Product Image */}
                        <div className="w-full aspect-[4/3] bg-muted/30 overflow-hidden relative border-b border-border/10 shrink-0">
                          {p.image ? (
                            <img src={p.image} alt={p.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center bg-brand-50/50"><ImageIcon className="w-6 h-6 text-brand-200" /></div>
                          )}
                          {isSelected && (
                            <div className="absolute top-2 right-2 bg-brand-600 text-white rounded-full p-1 shadow-md">
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                              </svg>
                            </div>
                          )}
                        </div>

                        {/* Product Info */}
                        <div className="p-3 flex-1 flex flex-col justify-between">
                          <div>
                            <p className="font-semibold text-foreground text-xs line-clamp-1 group-hover:text-brand-600 transition-colors">{p.name}</p>
                            <p className="text-[10px] text-muted-foreground truncate mt-0.5">{p.category.name}</p>
                          </div>
                          <p className="text-[11px] font-bold text-brand-600 mt-2">{formatRupiah(p.price)}</p>
                        </div>
                      </button>
                    );
                  })}
              </div>

              {initialProducts.filter(p => {
                if (p.id === editingProduct?.id) return false;
                const matchesSearch = p.name.toLowerCase().includes(pickerSearch.toLowerCase());
                const matchesCat = pickerCategory === 'all' || p.categoryId === pickerCategory;
                return matchesSearch && matchesCat;
              }).length === 0 && (
                <div className="py-12 text-center text-muted-foreground/45">
                  <ImageIcon className="w-10 h-10 mx-auto mb-2 opacity-30" />
                  <p className="text-xs">Tidak ada menu ditemukan</p>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-border/20 flex justify-between items-center bg-muted/5 sticky bottom-0">
              <span className="text-[10px] font-medium text-muted-foreground">
                Terpilih: {bundleGroups.find(g => g.id === activeGroupIdForPicker)?.options.length || 0} menu
              </span>
              <button
                type="button"
                onClick={() => setActiveGroupIdForPicker(null)}
                className="px-5 py-2 text-xs font-bold rounded-xl gradient-brand text-white hover:opacity-90 transition-all shadow-md active:scale-[0.98]"
              >
                Selesai
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══════ Image Cropper Modal ═══════ */}
      {cropImageSrc && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/60 backdrop-blur-md p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden border border-border/10 flex flex-col max-h-[90vh]">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-border/30 sticky top-0 bg-white z-10">
              <div>
                <h3 className="text-sm font-bold font-heading text-foreground">
                  ✂️ Sesuaikan Gambar Produk
                </h3>
                <p className="text-[10px] text-muted-foreground mt-0.5">Geser gambar dan gunakan slider untuk zoom agar pas di bingkai 16:10.</p>
              </div>
              <button onClick={() => setCropImageSrc(null)} className="p-1.5 hover:bg-muted rounded-xl transition-all">
                <X className="w-5 h-5 text-muted-foreground" />
              </button>
            </div>

            {/* Viewport container */}
            <div className="p-6 flex-1 flex flex-col items-center justify-center bg-muted/10 overflow-y-auto">
              <div 
                ref={cropperViewportRef}
                className="relative w-full max-w-[420px] aspect-[16/10] overflow-hidden bg-zinc-950 border border-border/40 rounded-2xl cursor-move touch-none select-none shadow-inner"
                onMouseDown={handleCropperMouseDown}
                onTouchStart={handleCropperTouchStart}
              >
                <img
                  ref={cropperImgRef}
                  src={cropImageSrc}
                  alt="To Crop"
                  className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 max-w-none max-h-none pointer-events-none select-none transition-transform duration-75 origin-center"
                  style={{
                    transform: `translate(calc(-50% + ${cropOffset.x}px), calc(-50% + ${cropOffset.y}px)) scale(${cropZoom})`,
                  }}
                />

                {/* Grid Overlay */}
                <div className="absolute inset-0 pointer-events-none border border-white/20">
                  <div className="absolute inset-x-0 top-1/3 border-b border-dashed border-white/30" />
                  <div className="absolute inset-x-0 top-2/3 border-b border-dashed border-white/30" />
                  <div className="absolute inset-y-0 left-1/3 border-r border-dashed border-white/30" />
                  <div className="absolute inset-y-0 left-2/3 border-r border-dashed border-white/30" />
                </div>
              </div>

              {/* Zoom controls */}
              <div className="w-full max-w-[420px] flex items-center gap-3 mt-5 px-1">
                <CircleMinus className="w-4 h-4 text-muted-foreground" />
                <input
                  type="range"
                  min="1"
                  max="3"
                  step="0.02"
                  value={cropZoom}
                  onChange={(e) => setCropZoom(parseFloat(e.target.value))}
                  className="flex-1 accent-brand-600 h-1 bg-muted rounded-lg appearance-none cursor-pointer"
                />
                <CirclePlus className="w-4 h-4 text-muted-foreground" />
                <span className="text-xs font-bold text-muted-foreground w-10 text-right">
                  {Math.round(cropZoom * 100)}%
                </span>
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-border/20 flex justify-end gap-2 bg-muted/5 sticky bottom-0">
              <button 
                type="button"
                onClick={() => { setCropZoom(1); setCropOffset({ x: 0, y: 0 }); }}
                className="px-4 py-2 text-xs font-medium rounded-xl hover:bg-muted transition-colors mr-auto"
              >
                Reset
              </button>
              <button 
                type="button"
                onClick={() => setCropImageSrc(null)} 
                className="px-4 py-2 text-xs font-medium rounded-xl hover:bg-muted transition-colors"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleCropConfirm}
                disabled={uploading}
                className="px-5 py-2 text-xs font-bold rounded-xl gradient-brand text-white hover:opacity-90 transition-all flex items-center gap-1.5 disabled:opacity-50 shadow-md active:scale-[0.98]"
              >
                {uploading ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Memproses...
                  </>
                ) : (
                  'Terapkan'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
