'use client';

import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Search,
  Plus,
  Download,
  LayoutGrid,
  List,
  Flame,
  CandyCane,
  Package,
  Layers,
  Archive,
  ArchiveRestore,
  RefreshCw,
  Coins,
  AlertTriangle,
  Loader2,
  Trash2,
  CheckSquare,
  TrendingUp,
  CheckCircle2,
  RotateCcw,
  Eye,
  SlidersHorizontal,
  PieChart,
  ShieldCheck,
  Store,
} from 'lucide-react';
import { useToast } from '@/components/ui/Toast';
import { ProductGridTable } from '@/components/admin/products/ProductGridTable';
import { ProductInspectorDrawer } from '@/components/admin/products/ProductInspectorDrawer';
import { ProductFormModal } from '@/components/admin/products/ProductFormModal';
import { ProductTypePickerModal } from '@/components/admin/products/ProductTypePickerModal';
import { ProductQuickPriceModal } from '@/components/admin/products/ProductQuickPriceModal';
import { RecipeHppModal } from '@/components/admin/products/RecipeHppModal';
import { MasterToppingsTab } from '@/components/admin/products/MasterToppingsTab';
import { formatRupiah, getActivePromo } from '@/lib/utils';
import type {
  ProductItem,
  CategoryItem,
  IngredientItem,
  ToppingItem,
  ModifiersData,
} from '@/components/admin/products/types';

interface AdminProductsClientProps {
  initialProducts: ProductItem[];
  categories: CategoryItem[];
  ingredients: IngredientItem[];
}

export default function AdminProductsClient({
  initialProducts,
  categories,
  ingredients,
}: AdminProductsClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const categoryParam = searchParams.get('category');
  const { showToast } = useToast();
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Active Main Tab: Products, Combos, or Toppings
  const [activeTab, setActiveTab] = useState<'products' | 'combos' | 'toppings'>('products');

  // View Mode: 'grid' (Visual Bento) or 'table' (Matriks Tabel)
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');

  // Search & Filters
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<
    'all' | 'available' | 'sold-out' | 'promo' | 'no-recipe' | 'archived'
  >('all');
  const [sortBy, setSortBy] = useState<'name-asc' | 'name-desc' | 'price-asc' | 'price-desc'>('name-asc');

  // Multi-select Checkboxes
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isBulkProcessing, setIsBulkProcessing] = useState(false);

  // Live Inspector Drawer State
  const [inspectedProduct, setInspectedProduct] = useState<ProductItem | null>(null);
  const [isInspectorPinned, setIsInspectorPinned] = useState(false);

  // Modals Controller State
  const [showTypePicker, setShowTypePicker] = useState(false);
  const [showFormModal, setShowFormModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<ProductItem | null>(null);
  const [formProductType, setFormProductType] = useState<'minuman' | 'makanan' | 'combo'>('minuman');

  // Quick Price Modal
  const [quickPriceProduct, setQuickPriceProduct] = useState<ProductItem | null>(null);

  // Recipe Modal
  const [recipeProduct, setRecipeProduct] = useState<ProductItem | null>(null);

  // Master Toppings State
  const [masterToppings, setMasterToppings] = useState<ToppingItem[]>([]);
  const [loadingToppings, setLoadingToppings] = useState(false);

  // Sync category param from URL
  useEffect(() => {
    if (categoryParam) {
      setSelectedCategory(categoryParam);
    }
  }, [categoryParam]);

  // Keyboard shortcut: ⌘K or Ctrl+K to focus search bar
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Fetch Master Toppings
  const fetchToppings = useCallback(async () => {
    setLoadingToppings(true);
    try {
      const res = await fetch('/api/admin/toppings');
      if (res.ok) {
        const data = await res.json();
        setMasterToppings(data);
      }
    } catch (err) {
      console.error('Error fetching toppings:', err);
    } finally {
      setLoadingToppings(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === 'toppings') {
      fetchToppings();
    }
  }, [activeTab, fetchToppings]);

  // Helper check bundle
  const isProductBundle = (p: ProductItem): boolean => {
    if (!p.modifiers) return false;
    try {
      const parsed: ModifiersData =
        typeof p.modifiers === 'string' ? JSON.parse(p.modifiers) : p.modifiers;
      return !!parsed.isBundle;
    } catch {
      return false;
    }
  };

  // Helper check promo
  const isProductOnPromo = (p: ProductItem): boolean => {
    return !!getActivePromo(p);
  };

  // Filtered & Sorted Products
  const filteredProducts = useMemo(() => {
    return initialProducts
      .filter((p) => {
        const isCombo = isProductBundle(p);
        const isArchived = p.badge === 'archived';
        const isSoldOut = p.badge === 'sold-out';
        const onPromo = isProductOnPromo(p);
        const hasRecipe = (p.productIngredients || []).length > 0;

        // 1. Tab filtering
        if (activeTab === 'combos') {
          if (!isCombo) return false;
        } else if (activeTab === 'products') {
          if (isCombo) return false;
        }

        // 2. Status filtering
        if (statusFilter === 'archived') {
          if (!isArchived) return false;
        } else {
          if (isArchived) return false;
          if (statusFilter === 'available' && isSoldOut) return false;
          if (statusFilter === 'sold-out' && !isSoldOut) return false;
          if (statusFilter === 'promo' && !onPromo) return false;
          if (statusFilter === 'no-recipe' && hasRecipe) return false;
        }

        // 3. Category filtering
        if (selectedCategory !== 'all' && p.categoryId !== selectedCategory) {
          return false;
        }

        // 4. Search text
        if (search.trim()) {
          const q = search.toLowerCase();
          const matchesName = p.name.toLowerCase().includes(q);
          const matchesDesc = (p.description || '').toLowerCase().includes(q);
          const matchesCat = p.category?.name?.toLowerCase().includes(q);
          if (!matchesName && !matchesDesc && !matchesCat) return false;
        }

        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'name-asc') return a.name.localeCompare(b.name);
        if (sortBy === 'name-desc') return b.name.localeCompare(a.name);
        if (sortBy === 'price-asc') return a.price - b.price;
        if (sortBy === 'price-desc') return b.price - a.price;
        return 0;
      });
  }, [initialProducts, activeTab, statusFilter, selectedCategory, search, sortBy]);

  // Keep inspectedProduct in sync if list updates
  useEffect(() => {
    if (inspectedProduct) {
      const updated = initialProducts.find((p) => p.id === inspectedProduct.id);
      if (updated) {
        setInspectedProduct(updated);
      }
    }
  }, [initialProducts]);

  // Analytics & Stats Overview for the Quick Intelligence Ribbon
  const stats = useMemo(() => {
    const activeList = initialProducts.filter((p) => p.badge !== 'archived');
    const availableList = activeList.filter((p) => p.badge !== 'sold-out');
    const soldOutCount = activeList.filter((p) => p.badge === 'sold-out').length;
    const promoCount = activeList.filter(isProductOnPromo).length;
    const noRecipeCount = activeList.filter(
      (p) => (p.productIngredients || []).length === 0
    ).length;
    const archivedCount = initialProducts.filter((p) => p.badge === 'archived').length;

    // Total Catalog Value (sum of all active item prices)
    const totalCatalogValue = activeList.reduce((acc, p) => acc + p.price, 0);

    // Average Margin across items with recipe
    let totalMarginSum = 0;
    let itemsWithRecipeCount = 0;

    activeList.forEach((p) => {
      const recipes = p.productIngredients || [];
      if (recipes.length > 0) {
        let hpp = 0;
        recipes.forEach((r) => {
          const ing = r.ingredient || ingredients.find((i) => i.id === r.ingredientId);
          if (ing) {
            hpp += r.quantity * ing.costPerUnit;
          }
        });
        const profit = p.price - hpp;
        const margin = p.price > 0 ? (profit / p.price) * 100 : 0;
        totalMarginSum += margin;
        itemsWithRecipeCount++;
      }
    });

    const avgMargin =
      itemsWithRecipeCount > 0 ? Math.round(totalMarginSum / itemsWithRecipeCount) : 58;

    const catalogHealthPercent =
      activeList.length > 0
        ? Math.round((availableList.length / activeList.length) * 100)
        : 100;

    return {
      total: activeList.length,
      available: availableList.length,
      soldOut: soldOutCount,
      promo: promoCount,
      noRecipe: noRecipeCount,
      archived: archivedCount,
      totalCatalogValue,
      avgMargin,
      catalogHealthPercent,
    };
  }, [initialProducts, ingredients]);

  // Category counts
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { all: 0 };
    const activeList = initialProducts.filter((p) => {
      if (p.badge === 'archived') return false;
      if (activeTab === 'combos') return isProductBundle(p);
      if (activeTab === 'products') return !isProductBundle(p);
      return true;
    });

    counts.all = activeList.length;
    categories.forEach((cat) => {
      counts[cat.id] = activeList.filter((p) => p.categoryId === cat.id).length;
    });
    return counts;
  }, [initialProducts, categories, activeTab]);

  // Checkbox Handlers
  const toggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    const visibleIds = filteredProducts.map((p) => p.id);
    const allSelected = visibleIds.length > 0 && visibleIds.every((id) => selectedIds.includes(id));
    if (allSelected) {
      setSelectedIds((prev) => prev.filter((id) => !visibleIds.includes(id)));
    } else {
      setSelectedIds((prev) => {
        const next = [...prev];
        visibleIds.forEach((id) => {
          if (!next.includes(id)) next.push(id);
        });
        return next;
      });
    }
  };

  // Bulk Actions
  const handleBulkAction = async (action: 'delete' | 'availability' | 'category', value?: any) => {
    if (selectedIds.length === 0) return;
    if (action === 'delete') {
      if (!confirm(`Apakah Anda yakin ingin memproses ${selectedIds.length} produk terpilih?`)) {
        return;
      }
    }

    setIsBulkProcessing(true);
    try {
      const res = await fetch('/api/admin/products/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: selectedIds, action, value }),
      });
      const data = await res.json();
      if (res.ok) {
        showToast(data.message || 'Aksi masal berhasil dijalankan', 'success');
        setSelectedIds([]);
        router.refresh();
      } else {
        throw new Error(data.error || 'Aksi masal gagal');
      }
    } catch (err: any) {
      showToast(err.message || 'Gagal memproses aksi masal', 'error');
    } finally {
      setIsBulkProcessing(false);
    }
  };

  // 1-Click Duplicate Handler
  const handleDuplicateProduct = async (product: ProductItem) => {
    try {
      const res = await fetch(`/api/admin/products/${product.id}/duplicate`, {
        method: 'POST',
      });
      if (!res.ok) throw new Error();
      const newProduct = await res.json();
      showToast(`Produk "${product.name}" berhasil digandakan!`, 'success');
      router.refresh();
      setEditingProduct(newProduct);
      setShowFormModal(true);
    } catch {
      showToast('Gagal menduplikasi produk', 'error');
    }
  };

  // Toggle Availability
  const handleToggleAvailability = async (product: ProductItem) => {
    try {
      const nextBadge = product.badge === 'sold-out' ? null : 'sold-out';
      await fetch(`/api/admin/products/${product.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ badge: nextBadge }),
      });
      showToast(
        nextBadge === 'sold-out'
          ? `Status "${product.name}" diubah ke Habis`
          : `Status "${product.name}" diubah ke Tersedia`,
        'success'
      );
      router.refresh();
    } catch {
      showToast('Gagal memperbarui status ketersediaan', 'error');
    }
  };

  // Toggle Archive
  const handleToggleArchive = async (product: ProductItem) => {
    try {
      const isArchived = product.badge === 'archived';
      await fetch(`/api/admin/products/${product.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ badge: isArchived ? null : 'archived' }),
      });
      showToast(
        isArchived
          ? `Produk "${product.name}" berhasil dipulihkan`
          : `Produk "${product.name}" berhasil diarsipkan`,
        'success'
      );
      router.refresh();
    } catch {
      showToast('Gagal mengarsipkan produk', 'error');
    }
  };

  // Delete Single Product
  const handleDeleteProduct = async (product: ProductItem) => {
    if (!confirm(`Hapus produk "${product.name}"?`)) return;
    try {
      const res = await fetch(`/api/admin/products/${product.id}`, {
        method: 'DELETE',
      });
      const data = await res.json().catch(() => ({}));
      if (data.archived) {
        showToast('Produk diarsipkan karena memiliki riwayat transaksi.', 'info');
      } else {
        showToast('Produk berhasil dihapus secara permanen.', 'success');
      }
      if (inspectedProduct?.id === product.id) {
        setInspectedProduct(null);
      }
      router.refresh();
    } catch {
      showToast('Gagal menghapus produk', 'error');
    }
  };

  // Export CSV
  const handleExportCSV = () => {
    window.open('/api/admin/products/export', '_blank');
  };

  // Add Product Flow
  const handleOpenAddProduct = () => {
    if (activeTab === 'combos') {
      setEditingProduct(null);
      setFormProductType('combo');
      setShowFormModal(true);
    } else {
      setShowTypePicker(true);
    }
  };

  const handleSelectTypeFromPicker = (type: 'minuman' | 'makanan' | 'combo') => {
    setShowTypePicker(false);
    setEditingProduct(null);
    setFormProductType(type);
    setShowFormModal(true);
  };

  return (
    <div className="space-y-6 text-left">
      {/* ── TOP HEADER & WORKSPACE ACTION BAR ── */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Quick View Switcher (Visual Bento vs Matriks Tabel) */}
          <div className="flex items-center bg-slate-100 p-1 rounded-2xl border border-slate-200/80 text-slate-600">
            <button
              type="button"
              onClick={() => setViewMode('grid')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold text-xs transition-all cursor-pointer ${
                viewMode === 'grid'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
              title="Tampilan Bento Cards"
            >
              <LayoutGrid className="w-3.5 h-3.5 text-orange-500" />
              <span>Visual Bento</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('table')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold text-xs transition-all cursor-pointer ${
                viewMode === 'table'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
              title="Tampilan Tabel Matriks"
            >
              <List className="w-3.5 h-3.5 text-slate-600" />
              <span>Matriks Tabel</span>
            </button>
          </div>

          {/* Export CSV Button */}
          <button
            type="button"
            onClick={handleExportCSV}
            className="px-3.5 py-2 rounded-2xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs flex items-center gap-1.5 shadow-xs transition-all cursor-pointer"
            title="Download CSV Katalog Produk"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            <span className="hidden sm:inline">Export CSV</span>
          </button>

          {/* Add Product Button */}
          <button
            type="button"
            onClick={handleOpenAddProduct}
            className="px-4 py-2 rounded-2xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-bold text-xs shadow-glow-orange flex items-center gap-1.5 transition-all cursor-pointer active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>Tambah Menu Baru</span>
          </button>
        </div>
      </div>

      {/* ── QUICK INTELLIGENCE RIBBON (4 Metric Cards from Stitch) ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* Metric 1: Kesehatan Katalog */}
        <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs flex flex-col justify-between group hover:border-orange-200 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Kesehatan Katalog
            </span>
            <span className="w-6 h-6 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <ShieldCheck className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <div>
              <span className="text-2xl font-extrabold tracking-tight text-slate-900">
                {stats.catalogHealthPercent}%
              </span>
              <span className="text-[11px] text-emerald-600 font-semibold ml-1.5">
                ▲ Siap Jual
              </span>
            </div>
            <span className="text-[11px] text-slate-400 font-medium">
              {stats.available}/{stats.total} Siap Order
            </span>
          </div>
          {/* Progress Bar */}
          <div className="w-full bg-slate-100 rounded-full h-1.5 mt-3 overflow-hidden">
            <div
              className="bg-emerald-500 h-1.5 rounded-full transition-all duration-500"
              style={{ width: `${Math.min(100, stats.catalogHealthPercent)}%` }}
            />
          </div>
        </div>

        {/* Metric 2: Total Valuasi Katalog */}
        <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs flex flex-col justify-between group hover:border-orange-200 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Total Valuasi Katalog
            </span>
            <span className="w-6 h-6 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <Coins className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <div>
              <span className="text-xl sm:text-2xl font-extrabold tracking-tight text-slate-900 truncate">
                {formatRupiah(stats.totalCatalogValue)}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-1.5 text-[11px] text-slate-500 mt-3">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
            <span>{stats.total} item aktif terdaftar</span>
          </div>
        </div>

        {/* Metric 3: Rata-rata Margin HPP */}
        <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs flex flex-col justify-between group hover:border-orange-200 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Rata-rata Margin HPP
            </span>
            <span className="w-6 h-6 rounded-lg bg-orange-50 text-orange-600 flex items-center justify-center">
              <PieChart className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <div>
              <span className="text-2xl font-extrabold tracking-tight text-slate-900">
                {stats.avgMargin}%
              </span>
              <span className="text-[11px] text-emerald-600 font-semibold ml-1.5">
                Target &gt; 55%
              </span>
            </div>
          </div>
          {/* Sparkline Indicator */}
          <div className="w-full bg-slate-100 rounded-full h-1.5 mt-3 overflow-hidden">
            <div
              className="bg-gradient-to-r from-orange-400 to-emerald-500 h-1.5 rounded-full transition-all duration-500"
              style={{ width: `${Math.min(100, stats.avgMargin)}%` }}
            />
          </div>
        </div>

        {/* Metric 4: Perhatian & Restok */}
        <div className="p-4 rounded-2xl bg-rose-50/60 border border-rose-200/80 shadow-xs flex flex-col justify-between group hover:bg-rose-50 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-rose-700">
              Perhatian & Restok
            </span>
            <span className="w-6 h-6 rounded-lg bg-rose-100 text-rose-600 flex items-center justify-center animate-pulse">
              <AlertTriangle className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <div>
              <span className="text-2xl font-extrabold tracking-tight text-rose-700">
                {stats.soldOut} Menu
              </span>
              <span className="text-[11px] text-rose-600 font-semibold ml-1.5">Habis</span>
            </div>
            <span className="text-[11px] text-amber-700 font-medium">
              {stats.noRecipe} Tanpa Resep
            </span>
          </div>
          <button
            type="button"
            onClick={() => setStatusFilter(stats.soldOut > 0 ? 'sold-out' : 'no-recipe')}
            className="mt-2 text-[11px] font-bold text-rose-600 flex items-center gap-1 hover:underline cursor-pointer"
          >
            <span>Tindaki Restok Sekarang</span>
            <span className="text-[14px]">→</span>
          </button>
        </div>
      </div>

      {/* ── MAIN NAVIGATION TABS (Semua Menu / Combos / Toppings) ── */}
      <div className="flex border-b border-slate-200 gap-2">
        <button
          type="button"
          onClick={() => {
            setActiveTab('products');
            setSelectedIds([]);
          }}
          className={`py-3 px-5 text-xs font-bold border-b-2 flex items-center gap-2 transition-all cursor-pointer ${
            activeTab === 'products'
              ? 'border-orange-500 text-orange-600 font-extrabold'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Package className="w-4 h-4" />
          <span>Semua Produk Menu</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setActiveTab('combos');
            setSelectedIds([]);
          }}
          className={`py-3 px-5 text-xs font-bold border-b-2 flex items-center gap-2 transition-all cursor-pointer ${
            activeTab === 'combos'
              ? 'border-orange-500 text-orange-600 font-extrabold'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>Paket Bundling / Combo</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setActiveTab('toppings');
            setSelectedIds([]);
          }}
          className={`py-3 px-5 text-xs font-bold border-b-2 flex items-center gap-2 transition-all cursor-pointer ${
            activeTab === 'toppings'
              ? 'border-orange-500 text-orange-600 font-extrabold'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <CandyCane className="w-4 h-4" />
          <span>Master Topping & Add-On</span>
        </button>
      </div>

      {/* ── TAB CONTENT: MASTER TOPPINGS ── */}
      {activeTab === 'toppings' && (
        <MasterToppingsTab
          toppings={masterToppings}
          ingredients={ingredients}
          loading={loadingToppings}
          onRefresh={fetchToppings}
        />
      )}

      {/* ── TAB CONTENT: PRODUCTS & COMBOS ── */}
      {(activeTab === 'products' || activeTab === 'combos') && (
        <div className="space-y-4">
          {/* ── INTERACTIVE FILTER BAR ── */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-3 sm:p-4 shadow-xs space-y-3">
            {/* Top row: Category Pills & Fast Search */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
              {/* Segmented Category Pill Selector */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 lg:pb-0 scrollbar-none text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => setSelectedCategory('all')}
                  className={`px-3.5 py-1.5 rounded-xl flex items-center gap-1.5 whitespace-nowrap transition-all cursor-pointer ${
                    selectedCategory === 'all'
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  <span>Semua Menu</span>
                  <span
                    className={`px-1.5 py-0.5 rounded-md text-[10px] font-bold ${
                      selectedCategory === 'all'
                        ? 'bg-white/20 text-white'
                        : 'bg-slate-100 text-slate-500'
                    }`}
                  >
                    {categoryCounts.all || 0}
                  </span>
                </button>

                {categories.map((c) => {
                  const count = categoryCounts[c.id] || 0;
                  const isSelected = selectedCategory === c.id;
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setSelectedCategory(c.id)}
                      className={`px-3 py-1.5 rounded-xl flex items-center gap-1.5 whitespace-nowrap transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-orange-500 text-white shadow-xs'
                          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                      }`}
                    >
                      <span>{c.name}</span>
                      <span
                        className={`px-1.5 py-0.5 rounded-md text-[10px] font-bold ${
                          isSelected ? 'bg-white/25 text-white' : 'bg-slate-100 text-slate-500'
                        }`}
                      >
                        {count}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Fast Search & Sort Options */}
              <div className="flex items-center gap-2">
                <div className="relative flex-1 sm:w-72">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    ref={searchInputRef}
                    type="search"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Cari nama produk, SKU, kategori..."
                    className="w-full pl-9 pr-14 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 text-slate-800 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-100 transition-all"
                  />
                  <span className="absolute right-2.5 top-1/2 -translate-y-1/2 px-1.5 py-0.5 text-[10px] font-semibold text-slate-400 bg-white border border-slate-200 rounded shadow-2xs pointer-events-none">
                    ⌘K
                  </span>
                </div>

                {/* Sort dropdown */}
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="px-2.5 py-2 rounded-xl border border-slate-200 text-xs font-bold bg-white text-slate-700 focus:ring-2 focus:ring-orange-500"
                >
                  <option value="name-asc">Nama (A - Z)</option>
                  <option value="name-desc">Nama (Z - A)</option>
                  <option value="price-asc">Harga Terendah</option>
                  <option value="price-desc">Harga Tertinggi</option>
                </select>
              </div>
            </div>

            {/* Bottom row: Quick Status Filter Chips */}
            <div className="flex items-center gap-1.5 pt-2 border-t border-slate-100 overflow-x-auto pb-1 text-[11px] font-bold">
              {[
                { id: 'all', label: 'Semua Status' },
                { id: 'available', label: 'Tersedia Saja' },
                { id: 'promo', label: 'Flash Sale Promo' },
                { id: 'no-recipe', label: 'Belum Ada Resep' },
                { id: 'sold-out', label: 'Habis (Sold Out)' },
                { id: 'archived', label: 'Produk Diarsipkan' },
              ].map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setStatusFilter(f.id as any)}
                  className={`px-3 py-1 rounded-xl shrink-0 transition-all border cursor-pointer ${
                    statusFilter === f.id
                      ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                      : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>

            {/* Active Filter Badges Strip */}
            {(selectedCategory !== 'all' || statusFilter !== 'all' || search.trim()) && (
              <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs flex-wrap gap-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-slate-400 text-[11px] font-medium">Filter Aktif:</span>

                  {selectedCategory !== 'all' && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-orange-50 text-orange-700 border border-orange-200/60 text-[11px] font-semibold">
                      {categories.find((c) => c.id === selectedCategory)?.name || 'Kategori'}
                      <button
                        type="button"
                        onClick={() => setSelectedCategory('all')}
                        className="hover:text-orange-950 cursor-pointer"
                      >
                        ✕
                      </button>
                    </span>
                  )}

                  {statusFilter !== 'all' && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-slate-100 text-slate-700 text-[11px] font-medium">
                      Status: {statusFilter}
                      <button
                        type="button"
                        onClick={() => setStatusFilter('all')}
                        className="hover:text-slate-950 cursor-pointer"
                      >
                        ✕
                      </button>
                    </span>
                  )}

                  {search.trim() && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-slate-100 text-slate-700 text-[11px] font-medium">
                      Cari: &quot;{search}&quot;
                      <button
                        type="button"
                        onClick={() => setSearch('')}
                        className="hover:text-slate-950 cursor-pointer"
                      >
                        ✕
                      </button>
                    </span>
                  )}

                  <button
                    type="button"
                    onClick={() => {
                      setSelectedCategory('all');
                      setStatusFilter('all');
                      setSearch('');
                    }}
                    className="text-slate-400 hover:text-orange-600 text-[11px] font-semibold underline underline-offset-2 ml-1 cursor-pointer"
                  >
                    Reset Semua
                  </button>
                </div>

                <span className="text-slate-400 text-[11px]">
                  Menampilkan <strong>{filteredProducts.length}</strong> dari{' '}
                  <strong>{stats.total}</strong> item aktif
                </span>
              </div>
            )}
          </div>

          {/* ── WORKSPACE: PRODUCT LIST + OPTIONAL QUICK INSPECTOR DRAWER ── */}
          <div
            className={`grid grid-cols-1 ${
              inspectedProduct ? 'xl:grid-cols-12' : ''
            } gap-6 items-start`}
          >
            {/* Left Workspace Column: Products Cards / Table */}
            <div className={inspectedProduct ? 'xl:col-span-8 space-y-4' : 'w-full space-y-4'}>
              <ProductGridTable
                products={filteredProducts}
                ingredients={ingredients}
                viewMode={viewMode}
                selectedIds={selectedIds}
                inspectedProductId={inspectedProduct?.id}
                onInspectProduct={(p) => {
                  setInspectedProduct(inspectedProduct?.id === p.id ? null : p);
                }}
                onToggleSelect={toggleSelect}
                onToggleSelectAll={toggleSelectAll}
                onEdit={(p) => {
                  setEditingProduct(p);
                  setShowFormModal(true);
                }}
                onQuickPrice={(p) => setQuickPriceProduct(p)}
                onDuplicate={handleDuplicateProduct}
                onOpenRecipe={(p) => setRecipeProduct(p)}
                onToggleAvailability={handleToggleAvailability}
                onToggleArchive={handleToggleArchive}
                onDelete={handleDeleteProduct}
              />
            </div>

            {/* Right Workspace Column: Sticky Live Product Inspector Drawer */}
            {inspectedProduct && (
              <div className="xl:col-span-4 sticky top-24">
                <ProductInspectorDrawer
                  product={inspectedProduct}
                  ingredients={ingredients}
                  isPinned={isInspectorPinned}
                  onTogglePin={() => setIsInspectorPinned((prev) => !prev)}
                  onClose={() => setInspectedProduct(null)}
                  onEdit={(p) => {
                    setEditingProduct(p);
                    setShowFormModal(true);
                  }}
                  onQuickPrice={(p) => setQuickPriceProduct(p)}
                  onOpenRecipe={(p) => setRecipeProduct(p)}
                  onDuplicate={handleDuplicateProduct}
                  onToggleAvailability={handleToggleAvailability}
                />
              </div>
            )}
          </div>

          {/* ── FLOATING BATCH ACTIONS DOCK (Fixed Bottom Dock from Stitch) ── */}
          {selectedIds.length > 0 && (
            <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 bg-slate-900/95 backdrop-blur-xl text-white px-5 py-3 rounded-2xl shadow-glass flex items-center gap-4 border border-white/10 transition-all animate-in fade-in slide-in-from-bottom-4 duration-200">
              <div className="flex items-center gap-2 text-xs font-semibold">
                <span className="w-2.5 h-2.5 rounded-full bg-orange-500 animate-ping" />
                <span>
                  <strong>{selectedIds.length} Menu</strong> Terpilih
                </span>
              </div>

              <div className="h-4 w-px bg-white/20" />

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={isBulkProcessing}
                  onClick={() => handleBulkAction('availability', 'in-stock')}
                  className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-semibold transition-all cursor-pointer disabled:opacity-50"
                >
                  Set Tersedia
                </button>

                <button
                  type="button"
                  disabled={isBulkProcessing}
                  onClick={() => handleBulkAction('availability', 'sold-out')}
                  className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-semibold transition-all cursor-pointer disabled:opacity-50"
                >
                  Set Habis
                </button>

                <button
                  type="button"
                  disabled={isBulkProcessing}
                  onClick={() => handleBulkAction('delete')}
                  className="px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-xs font-bold transition-all flex items-center gap-1 cursor-pointer disabled:opacity-50"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Hapus / Arsipkan</span>
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── MODALS (100% PRESERVED) ── */}

      {/* 1. Step 1: Type Picker Modal */}
      <ProductTypePickerModal
        isOpen={showTypePicker}
        onClose={() => setShowTypePicker(false)}
        onSelectType={handleSelectTypeFromPicker}
      />

      {/* 2. Step 2: Comprehensive Product Form Modal */}
      <ProductFormModal
        product={editingProduct}
        productType={formProductType}
        categories={categories}
        allProducts={initialProducts}
        isOpen={showFormModal}
        onClose={() => {
          setShowFormModal(false);
          setEditingProduct(null);
        }}
        onSuccess={() => {
          router.refresh();
        }}
      />

      {/* 3. Quick Price Modal */}
      <ProductQuickPriceModal
        product={quickPriceProduct}
        isOpen={!!quickPriceProduct}
        onClose={() => setQuickPriceProduct(null)}
        onSuccess={() => {
          router.refresh();
        }}
      />

      {/* 4. Recipe & HPP Modal */}
      <RecipeHppModal
        product={recipeProduct}
        ingredients={ingredients}
        isOpen={!!recipeProduct}
        onClose={() => setRecipeProduct(null)}
        onSuccess={() => {
          router.refresh();
        }}
      />
    </div>
  );
}
