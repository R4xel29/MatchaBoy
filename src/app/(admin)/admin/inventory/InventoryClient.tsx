'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { formatRupiah } from '@/lib/utils';
import { useToast } from '@/components/ui/Toast';
import {
  Search,
  Plus,
  Edit2,
  Trash2,
  X,
  Save,
  Loader2,
  Package,
  History,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Boxes,
  CupSoda,
  Coins,
  CheckCircle2,
  Sparkles,
  ArrowUpDown,
  Filter,
  Check,
  Calendar,
  Layers,
  Info,
} from 'lucide-react';
import { Pagination } from '@/components/ui/Pagination';

export interface Ingredient {
  id: string;
  name: string;
  unit: string;
  stock: number;
  costPerUnit: number;
  isPackaging: boolean;
  updatedAt: Date | string;
}

export interface StockMovementItem {
  id: string;
  ingredientId: string;
  quantity: number;
  type: string; // 'IN' | 'OUT' | 'WASTE' | 'ADJUST'
  reason: string | null;
  createdAt: Date | string;
  ingredient?: {
    id: string;
    name: string;
    unit: string;
    isPackaging: boolean;
  };
}

interface Props {
  initialIngredients: Ingredient[];
  initialMovements?: StockMovementItem[];
}

type ViewTab = 'ITEMS' | 'MOVEMENTS';
type CategoryFilter = 'ALL' | 'RAW' | 'PACKAGING' | 'LOW_STOCK';
type SortOption = 'NAME_ASC' | 'STOCK_ASC' | 'STOCK_DESC' | 'VALUE_DESC';

export default function InventoryClient({
  initialIngredients,
  initialMovements = [],
}: Props) {
  const router = useRouter();
  const { showToast } = useToast();

  // Navigation & Filter States
  const [activeView, setActiveView] = useState<ViewTab>('ITEMS');
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('ALL');
  const [sortBy, setSortBy] = useState<SortOption>('NAME_ASC');
  const [search, setSearch] = useState('');
  const [movementFilter, setMovementFilter] = useState<'ALL' | 'IN' | 'OUT'>('ALL');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);

  // Modals & Action States
  const [saving, setSaving] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [showRestockModal, setShowRestockModal] = useState(false);
  const [editingIngredient, setEditingIngredient] = useState<Ingredient | null>(null);
  const [restockIngredient, setRestockIngredient] = useState<Ingredient | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Ingredient | null>(null);

  // Form states
  const [formData, setFormData] = useState({
    name: '',
    unit: '',
    stock: '0',
    costPerUnit: '0',
    isPackaging: false,
  });

  const [restockData, setRestockData] = useState({
    quantity: '',
    totalCost: '',
    notes: '',
    source: 'CASH_DRAWER',
  });

  // KPI Overview Calculations
  const kpiStats = useMemo(() => {
    let totalAssetValue = 0;
    let lowStockCount = 0;
    let outOfStockCount = 0;
    let rawMaterialsCount = 0;
    let packagingCount = 0;

    initialIngredients.forEach((item) => {
      totalAssetValue += item.stock * item.costPerUnit;
      if (item.isPackaging) {
        packagingCount++;
      } else {
        rawMaterialsCount++;
      }

      if (item.stock <= 0) {
        outOfStockCount++;
        lowStockCount++;
      } else if (item.stock <= 10) {
        lowStockCount++;
      }
    });

    return {
      totalAssetValue,
      totalItems: initialIngredients.length,
      rawMaterialsCount,
      packagingCount,
      lowStockCount,
      outOfStockCount,
    };
  }, [initialIngredients]);

  // Filtered & Sorted Ingredients List
  const filteredIngredients = useMemo(() => {
    return initialIngredients
      .filter((i) => {
        // Search filter
        const matchSearch =
          i.name.toLowerCase().includes(search.toLowerCase()) ||
          i.unit.toLowerCase().includes(search.toLowerCase());
        if (!matchSearch) return false;

        // Category filter
        if (categoryFilter === 'RAW') return !i.isPackaging;
        if (categoryFilter === 'PACKAGING') return i.isPackaging;
        if (categoryFilter === 'LOW_STOCK') return i.stock <= 10;
        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'NAME_ASC') return a.name.localeCompare(b.name);
        if (sortBy === 'STOCK_ASC') return a.stock - b.stock;
        if (sortBy === 'STOCK_DESC') return b.stock - a.stock;
        if (sortBy === 'VALUE_DESC')
          return b.stock * b.costPerUnit - a.stock * a.costPerUnit;
        return 0;
      });
  }, [initialIngredients, search, categoryFilter, sortBy]);

  // Filtered Stock Movements List
  const filteredMovements = useMemo(() => {
    return initialMovements.filter((m) => {
      if (movementFilter === 'IN') return m.type === 'IN';
      if (movementFilter === 'OUT') return m.type === 'OUT' || m.type === 'WASTE';
      return true;
    });
  }, [initialMovements, movementFilter]);

  const totalPages = Math.ceil(filteredIngredients.length / pageSize) || 1;
  const paginatedIngredients = filteredIngredients.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  const openModal = (ingredient?: Ingredient) => {
    if (ingredient) {
      setEditingIngredient(ingredient);
      setFormData({
        name: ingredient.name,
        unit: ingredient.unit,
        stock: ingredient.stock.toString(),
        costPerUnit: ingredient.costPerUnit.toString(),
        isPackaging: ingredient.isPackaging,
      });
    } else {
      setEditingIngredient(null);
      setFormData({
        name: '',
        unit: '',
        stock: '0',
        costPerUnit: '0',
        isPackaging: false,
      });
    }
    setShowModal(true);
  };

  const openRestockModal = (ingredient: Ingredient) => {
    setRestockIngredient(ingredient);
    setRestockData({ quantity: '', totalCost: '', notes: '', source: 'CASH_DRAWER' });
    setShowRestockModal(true);
  };

  const handleSave = async () => {
    if (!formData.name || !formData.unit) {
      showToast('Nama dan Satuan bahan wajib diisi', 'error');
      return;
    }
    setSaving(true);
    try {
      const url = editingIngredient
        ? `/api/admin/inventory/${editingIngredient.id}`
        : '/api/admin/inventory';
      const res = await fetch(url, {
        method: editingIngredient ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      if (!res.ok) throw new Error('Failed to save');
      showToast(
        editingIngredient
          ? 'Data bahan baku berhasil diperbarui'
          : 'Bahan baku baru berhasil ditambahkan',
        'success'
      );
      setShowModal(false);
      router.refresh();
    } catch {
      showToast('Gagal menyimpan bahan baku', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleRestock = async () => {
    if (!restockIngredient || !restockData.quantity || !restockData.totalCost) {
      showToast('Jumlah dan Total Biaya belanja wajib diisi', 'error');
      return;
    }
    setSaving(true);
    try {
      const res = await fetch('/api/admin/inventory/restock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ingredientId: restockIngredient.id,
          ...restockData,
        }),
      });
      if (!res.ok) throw new Error('Failed to restock');
      showToast(
        `Restock ${restockIngredient.name} (${restockData.quantity} ${restockIngredient.unit}) berhasil dicatat!`,
        'success'
      );
      setShowRestockModal(false);
      router.refresh();
    } catch {
      showToast('Gagal mencatat restock bahan', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      const res = await fetch(`/api/admin/inventory/${deleteTarget.id}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('Failed to delete');
      showToast(`Bahan baku ${deleteTarget.name} berhasil dihapus`, 'success');
      setDeleteTarget(null);
      router.refresh();
    } catch {
      showToast('Gagal menghapus bahan baku', 'error');
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-3xl border border-stone-200/80 shadow-xs">
        <div className="flex items-center gap-3.5 text-left">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-orange-500 to-amber-500 text-white flex items-center justify-center shadow-md shadow-orange-500/20 shrink-0">
            <Boxes className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold font-heading text-stone-900">
              Inventaris Bahan Baku & Kemasan
            </h1>
            <p className="text-xs sm:text-sm text-stone-500 mt-0.5">
              Pantau ketersediaan bahan racikan, kemasan cup, nilai aset gudang, dan kelola restock Arum Seduh.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
          {/* AI Scanner Trigger */}
          <button
            type="button"
            onClick={() => {
              if (typeof window !== 'undefined') {
                window.dispatchEvent(
                  new CustomEvent('open-ai-assistant', {
                    detail: {
                      prompt:
                        'Tolong bantu saya scan struk belanja supplier dan restock bahan baku ke sistem gudang.',
                    },
                  })
                );
              }
            }}
            className="flex items-center gap-1.5 px-3.5 py-2.5 text-xs font-bold rounded-2xl bg-stone-100 hover:bg-stone-200 text-stone-800 border border-stone-200/80 shadow-2xs transition-all active:scale-95 cursor-pointer"
            title="Buka Scanner Struk Belanja Supplier AI"
          >
            <Sparkles className="w-3.5 h-3.5 text-orange-600" />
            <span>Scan Struk AI</span>
          </button>

          {/* AI Burn-Rate Trigger */}
          <button
            type="button"
            onClick={() => {
              if (typeof window !== 'undefined') {
                window.dispatchEvent(
                  new CustomEvent('open-ai-assistant', {
                    detail: {
                      prompt:
                        'Analisa burn-rate seluruh bahan baku dan prediksi bahan apa yang akan habis dalam waktu dekat.',
                    },
                  })
                );
              }
            }}
            className="flex items-center gap-1.5 px-3.5 py-2.5 text-xs font-bold rounded-2xl bg-amber-50 hover:bg-amber-100/80 text-amber-900 border border-amber-200/70 shadow-2xs transition-all active:scale-95 cursor-pointer"
            title="Lihat Proyeksi Kehabisan Stok Berdasarkan Laju Penjualan"
          >
            <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
            <span>Analisa Burn-Rate</span>
          </button>

          {/* Add Ingredient Button */}
          <button
            type="button"
            onClick={() => openModal()}
            className="flex items-center gap-1.5 px-4 py-2.5 text-xs font-bold rounded-2xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white shadow-md shadow-orange-500/20 transition-all active:scale-95 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Tambah Bahan</span>
          </button>
        </div>
      </div>

      {/* 2. KPI Overview Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 text-left">
        {/* Card 1: Total Nilai Aset */}
        <div className="p-4 bg-white rounded-3xl border border-stone-200/80 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-stone-400 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-stone-500">
              Total Nilai Aset Gudang
            </span>
            <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <Coins className="w-4 h-4" />
            </div>
          </div>
          <div>
            <p className="text-xl sm:text-2xl font-heading font-black text-stone-900">
              {formatRupiah(kpiStats.totalAssetValue)}
            </p>
            <p className="text-xs text-stone-400 mt-0.5">
              Valuasi stok saat ini
            </p>
          </div>
        </div>

        {/* Card 2: Total Item Bahan */}
        <div className="p-4 bg-white rounded-3xl border border-stone-200/80 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-stone-400 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-stone-500">
              Total Jenis Bahan
            </span>
            <div className="w-8 h-8 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center">
              <Package className="w-4 h-4" />
            </div>
          </div>
          <div>
            <p className="text-xl sm:text-2xl font-heading font-black text-stone-900">
              {kpiStats.totalItems} <span className="text-sm font-medium text-stone-500">Item</span>
            </p>
            <p className="text-xs text-stone-400 mt-0.5 truncate">
              {kpiStats.rawMaterialsCount} Racikan • {kpiStats.packagingCount} Kemasan
            </p>
          </div>
        </div>

        {/* Card 3: Stok Menipis */}
        <div
          className={`p-4 rounded-3xl border shadow-xs flex flex-col justify-between transition-colors ${
            kpiStats.lowStockCount > 0
              ? 'bg-amber-50/50 border-amber-200/80'
              : 'bg-white border-stone-200/80'
          }`}
        >
          <div className="flex items-center justify-between text-stone-400 mb-2">
            <span
              className={`text-[11px] font-bold uppercase tracking-wider ${
                kpiStats.lowStockCount > 0 ? 'text-amber-800' : 'text-stone-500'
              }`}
            >
              Perlu Restock Segera
            </span>
            <div
              className={`w-8 h-8 rounded-xl flex items-center justify-center ${
                kpiStats.lowStockCount > 0
                  ? 'bg-amber-100 text-amber-700'
                  : 'bg-stone-100 text-stone-500'
              }`}
            >
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <p
                className={`text-xl sm:text-2xl font-heading font-black ${
                  kpiStats.lowStockCount > 0 ? 'text-amber-900' : 'text-stone-900'
                }`}
              >
                {kpiStats.lowStockCount}{' '}
                <span className="text-sm font-medium text-stone-500">Bahan</span>
              </p>
              {kpiStats.lowStockCount > 0 && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-200/70 text-amber-900">
                  Perhatian
                </span>
              )}
            </div>
            <p className="text-xs text-stone-400 mt-0.5">
              {kpiStats.outOfStockCount > 0
                ? `${kpiStats.outOfStockCount} bahan habis total`
                : 'Stok mendekati batas minimum'}
            </p>
          </div>
        </div>

        {/* Card 4: Kesiapan Kemasan Cup */}
        <div className="p-4 bg-white rounded-3xl border border-stone-200/80 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-stone-400 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-stone-500">
              Kesiapan Kemasan Cup
            </span>
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <CupSoda className="w-4 h-4" />
            </div>
          </div>
          <div>
            <p className="text-xl sm:text-2xl font-heading font-black text-stone-900">
              {kpiStats.packagingCount} <span className="text-sm font-medium text-stone-500">Tipe Cup</span>
            </p>
            <p className="text-xs text-emerald-600 font-semibold mt-0.5 flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" /> Siap Melayani Pesanan
            </p>
          </div>
        </div>
      </div>

      {/* 3. Main Navigation Pills (Daftar Bahan vs Riwayat Mutasi) */}
      <div className="flex items-center justify-between gap-3 border-b border-stone-200/80 pb-2">
        <div className="flex items-center p-1 bg-stone-100 rounded-2xl border border-stone-200/60">
          <button
            type="button"
            onClick={() => setActiveView('ITEMS')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              activeView === 'ITEMS'
                ? 'bg-white text-orange-600 shadow-xs border border-orange-200/60'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            <Boxes className="w-3.5 h-3.5" />
            <span>Daftar Bahan Baku & Kemasan</span>
            <span className="px-1.5 py-0.2 rounded-md bg-stone-100 text-stone-600 text-[10px]">
              {initialIngredients.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveView('MOVEMENTS')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              activeView === 'MOVEMENTS'
                ? 'bg-white text-orange-600 shadow-xs border border-orange-200/60'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            <span>Riwayat Mutasi Stok</span>
            {initialMovements.length > 0 && (
              <span className="px-1.5 py-0.2 rounded-md bg-stone-100 text-stone-600 text-[10px]">
                {initialMovements.length}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* VIEW 1: DAFTAR BAHAN BAKU & KEMASAN */}
      {activeView === 'ITEMS' && (
        <div className="space-y-4">
          {/* Toolbar: Category Filters, Search, and Sort */}
          <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
            {/* Category Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
              <button
                type="button"
                onClick={() => {
                  setCategoryFilter('ALL');
                  setCurrentPage(1);
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                  categoryFilter === 'ALL'
                    ? 'bg-orange-500 text-white shadow-xs'
                    : 'bg-stone-100 text-stone-600 hover:bg-stone-200/70'
                }`}
              >
                Semua ({initialIngredients.length})
              </button>

              <button
                type="button"
                onClick={() => {
                  setCategoryFilter('RAW');
                  setCurrentPage(1);
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                  categoryFilter === 'RAW'
                    ? 'bg-orange-500 text-white shadow-xs'
                    : 'bg-stone-100 text-stone-600 hover:bg-stone-200/70'
                }`}
              >
                Bahan Racikan ({kpiStats.rawMaterialsCount})
              </button>

              <button
                type="button"
                onClick={() => {
                  setCategoryFilter('PACKAGING');
                  setCurrentPage(1);
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                  categoryFilter === 'PACKAGING'
                    ? 'bg-orange-500 text-white shadow-xs'
                    : 'bg-stone-100 text-stone-600 hover:bg-stone-200/70'
                }`}
              >
                Kemasan Cup ({kpiStats.packagingCount})
              </button>

              <button
                type="button"
                onClick={() => {
                  setCategoryFilter('LOW_STOCK');
                  setCurrentPage(1);
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${
                  categoryFilter === 'LOW_STOCK'
                    ? 'bg-amber-600 text-white shadow-xs'
                    : 'bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-200/60'
                }`}
              >
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>Stok Menipis ({kpiStats.lowStockCount})</span>
              </button>
            </div>

            {/* Search & Sort Controls */}
            <div className="flex items-center gap-2">
              <div className="relative flex-1 sm:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
                <input
                  type="text"
                  placeholder="Cari bahan baku..."
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full pl-9 pr-8 py-2 text-xs font-semibold bg-white border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all shadow-2xs placeholder:text-stone-400"
                />
                {search && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearch('');
                      setCurrentPage(1);
                    }}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 p-0.5"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Sort selector */}
              <div className="flex items-center gap-1 bg-white border border-stone-200 rounded-xl px-2.5 py-2 shadow-2xs shrink-0">
                <ArrowUpDown className="w-3.5 h-3.5 text-stone-400" />
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as SortOption)}
                  className="bg-transparent text-xs font-bold text-stone-700 focus:outline-none cursor-pointer"
                >
                  <option value="NAME_ASC">Nama (A-Z)</option>
                  <option value="STOCK_ASC">Stok Terendah</option>
                  <option value="STOCK_DESC">Stok Tertinggi</option>
                  <option value="VALUE_DESC">Nilai Aset Terbesar</option>
                </select>
              </div>
            </div>
          </div>

          {/* Table of Ingredients */}
          <div className="bg-white border border-stone-200/80 rounded-3xl shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-stone-100 bg-stone-50/70 text-stone-500 font-bold uppercase tracking-wider text-[10px]">
                    <th className="px-5 py-3.5">Nama Bahan Baku</th>
                    <th className="px-4 py-3.5">Tipe Kategori</th>
                    <th className="px-4 py-3.5">Sisa Stok & Status</th>
                    <th className="px-4 py-3.5">Harga Pokok (HPP)</th>
                    <th className="px-4 py-3.5">Total Nilai Aset</th>
                    <th className="px-5 py-3.5 text-right">Aksi Cepat</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {paginatedIngredients.map((ing) => {
                    const isLow = ing.stock > 0 && ing.stock <= 10;
                    const isOut = ing.stock <= 0;
                    const totalVal = ing.stock * ing.costPerUnit;

                    return (
                      <tr
                        key={ing.id}
                        className="hover:bg-orange-50/20 transition-colors group"
                      >
                        {/* 1. Item Name */}
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-3">
                            <div
                              className={`w-9 h-9 rounded-2xl flex items-center justify-center shrink-0 ${
                                ing.isPackaging
                                  ? 'bg-blue-50 text-blue-600'
                                  : 'bg-orange-50 text-orange-600'
                              }`}
                            >
                              {ing.isPackaging ? (
                                <CupSoda className="w-4 h-4" />
                              ) : (
                                <Package className="w-4 h-4" />
                              )}
                            </div>
                            <div>
                              <p className="font-bold text-stone-900 text-xs">{ing.name}</p>
                              <p className="text-[10px] text-stone-400">
                                Satuan: <span className="font-semibold text-stone-600">{ing.unit}</span>
                              </p>
                            </div>
                          </div>
                        </td>

                        {/* 2. Type */}
                        <td className="px-4 py-3.5">
                          <span
                            className={`px-2.5 py-1 rounded-xl text-[10px] font-bold inline-flex items-center gap-1 ${
                              ing.isPackaging
                                ? 'bg-blue-50 text-blue-700 border border-blue-200/60'
                                : 'bg-amber-50 text-amber-800 border border-amber-200/60'
                            }`}
                          >
                            {ing.isPackaging ? (
                              <>
                                <Layers className="w-3 h-3" /> Kemasan Cup
                              </>
                            ) : (
                              <>
                                <Package className="w-3 h-3" /> Bahan Racikan
                              </>
                            )}
                          </span>
                        </td>

                        {/* 3. Stock & Status */}
                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-2">
                            <span
                              className={`font-black text-xs ${
                                isOut
                                  ? 'text-rose-600 font-extrabold'
                                  : isLow
                                  ? 'text-amber-600 font-extrabold'
                                  : 'text-stone-900'
                              }`}
                            >
                              {ing.stock} {ing.unit}
                            </span>

                            {/* Status Pill */}
                            <span
                              className={`px-2 py-0.5 rounded-full text-[9px] font-bold inline-flex items-center gap-1 ${
                                isOut
                                  ? 'bg-rose-50 text-rose-700 border border-rose-200'
                                  : isLow
                                  ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                  : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              }`}
                            >
                              {isOut ? (
                                <>
                                  <AlertTriangle className="w-2.5 h-2.5" /> Habis
                                </>
                              ) : isLow ? (
                                <>
                                  <AlertTriangle className="w-2.5 h-2.5" /> Menipis
                                </>
                              ) : (
                                <>
                                  <CheckCircle2 className="w-2.5 h-2.5" /> Aman
                                </>
                              )}
                            </span>
                          </div>
                        </td>

                        {/* 4. Cost Per Unit */}
                        <td className="px-4 py-3.5">
                          <span className="font-semibold text-stone-700">
                            {formatRupiah(ing.costPerUnit)}
                          </span>
                          <span className="text-[10px] text-stone-400 ml-1">/ {ing.unit}</span>
                        </td>

                        {/* 5. Total Asset Value */}
                        <td className="px-4 py-3.5">
                          <span className="font-bold text-stone-900">
                            {formatRupiah(totalVal)}
                          </span>
                        </td>

                        {/* 6. Actions */}
                        <td className="px-5 py-3.5 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {/* Restock Button */}
                            <button
                              type="button"
                              onClick={() => openRestockModal(ing)}
                              className="px-2.5 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold text-[11px] flex items-center gap-1 transition-colors cursor-pointer border border-emerald-200/60"
                              title="Catat belanja / restock bahan"
                            >
                              <TrendingUp className="w-3.5 h-3.5" />
                              <span>Restock</span>
                            </button>

                            {/* Edit Button */}
                            <button
                              type="button"
                              onClick={() => openModal(ing)}
                              className="p-1.5 rounded-xl bg-stone-100 hover:bg-stone-200/80 text-stone-600 hover:text-stone-900 transition-colors cursor-pointer"
                              title="Edit rincian bahan"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>

                            {/* Delete Button */}
                            <button
                              type="button"
                              onClick={() => setDeleteTarget(ing)}
                              className="p-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 transition-colors cursor-pointer"
                              title="Hapus bahan"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Empty State */}
            {filteredIngredients.length === 0 && (
              <div className="py-16 text-center text-stone-400">
                <Package className="w-10 h-10 mx-auto mb-2 text-stone-300" />
                <p className="text-xs font-bold text-stone-600">Tidak ada bahan baku ditemukan</p>
                <p className="text-[11px] text-stone-400 mt-0.5">
                  Coba sesuaikan kata kunci pencarian atau filter kategori di atas.
                </p>
              </div>
            )}

            {/* Pagination Footer */}
            {filteredIngredients.length > 0 && (
              <div className="p-4 border-t border-stone-100 bg-stone-50/50">
                <Pagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  totalItems={filteredIngredients.length}
                  pageSize={pageSize}
                  pageSizeOptions={[10, 15, 25, 50]}
                  onPageSizeChange={(sz) => {
                    setPageSize(sz);
                    setCurrentPage(1);
                  }}
                  onPageChange={setCurrentPage}
                />
              </div>
            )}
          </div>
        </div>
      )}

      {/* VIEW 2: RIWAYAT MUTASI STOK */}
      {activeView === 'MOVEMENTS' && (
        <div className="space-y-4 text-left">
          {/* Movement Type Filter */}
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setMovementFilter('ALL')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  movementFilter === 'ALL'
                    ? 'bg-orange-500 text-white shadow-xs'
                    : 'bg-stone-100 text-stone-600 hover:bg-stone-200/70'
                }`}
              >
                Semua Mutasi ({initialMovements.length})
              </button>

              <button
                type="button"
                onClick={() => setMovementFilter('IN')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  movementFilter === 'IN'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200/60'
                }`}
              >
                Stok Masuk (Restock)
              </button>

              <button
                type="button"
                onClick={() => setMovementFilter('OUT')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  movementFilter === 'OUT'
                    ? 'bg-stone-800 text-white shadow-xs'
                    : 'bg-stone-100 text-stone-600 hover:bg-stone-200/70'
                }`}
              >
                Stok Keluar (Pesanan / Pakai)
              </button>
            </div>

            <p className="text-[11px] text-stone-400">
              Menampilkan {filteredMovements.length} catatan mutasi terbaru
            </p>
          </div>

          {/* Movements List Card */}
          <div className="bg-white border border-stone-200/80 rounded-3xl shadow-xs overflow-hidden">
            {filteredMovements.length === 0 ? (
              <div className="py-16 text-center text-stone-400">
                <History className="w-10 h-10 mx-auto mb-2 text-stone-300" />
                <p className="text-xs font-bold text-stone-600">Belum ada catatan riwayat mutasi stok</p>
                <p className="text-[11px] text-stone-400 mt-0.5">
                  Setiap restock belanja dan pemotongan pesanan kasir akan tercatat otomatis di sini.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-stone-100">
                {filteredMovements.map((move) => {
                  const isPositive = move.quantity > 0;
                  const dateStr = new Date(move.createdAt).toLocaleString('id-ID', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  });

                  return (
                    <div
                      key={move.id}
                      className="p-4 flex items-center justify-between hover:bg-stone-50/60 transition-colors"
                    >
                      <div className="flex items-center gap-3.5">
                        <div
                          className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 ${
                            isPositive
                              ? 'bg-emerald-50 text-emerald-600'
                              : 'bg-stone-100 text-stone-600'
                          }`}
                        >
                          {isPositive ? (
                            <TrendingUp className="w-5 h-5" />
                          ) : (
                            <TrendingDown className="w-5 h-5" />
                          )}
                        </div>

                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-stone-900 text-xs sm:text-sm">
                              {move.ingredient?.name || 'Bahan Baku'}
                            </span>
                            <span
                              className={`px-2 py-0.2 rounded-md text-[10px] font-bold ${
                                isPositive
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/60'
                                  : 'bg-stone-100 text-stone-600'
                              }`}
                            >
                              {move.type}
                            </span>
                          </div>
                          <p className="text-xs text-stone-500 mt-0.5">
                            {move.reason || 'Mutasi otomatis sistem'}
                          </p>
                        </div>
                      </div>

                      <div className="text-right">
                        <p
                          className={`font-heading font-black text-sm sm:text-base ${
                            isPositive ? 'text-emerald-600' : 'text-stone-800'
                          }`}
                        >
                          {isPositive ? `+${move.quantity}` : move.quantity}{' '}
                          <span className="text-xs font-semibold text-stone-400">
                            {move.ingredient?.unit || ''}
                          </span>
                        </p>
                        <p className="text-[10px] text-stone-400 mt-0.5">{dateStr}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* 4. MODALS */}

      {/* A. Add / Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-stone-900/60 backdrop-blur-md p-4">
          <motion.div
            initial={{ scale: 0.96, opacity: 0, y: 12 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.96, opacity: 0, y: 12 }}
            className="bg-white rounded-3xl shadow-2xl border border-stone-200/80 w-full max-w-md overflow-hidden text-left"
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-stone-100 bg-stone-50/70">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-orange-100 text-orange-700 flex items-center justify-center font-bold">
                  <Package className="w-4 h-4" />
                </div>
                <h3 className="text-base font-bold font-heading text-stone-900">
                  {editingIngredient ? 'Edit Bahan Baku' : 'Tambah Bahan Baku Baru'}
                </h3>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="p-1.5 text-stone-400 hover:text-stone-700 hover:bg-stone-200/60 rounded-xl transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              {/* Name */}
              <div>
                <label className="text-[11px] font-bold text-stone-700 block mb-1">
                  Nama Bahan Baku *
                </label>
                <input
                  type="text"
                  placeholder="Contoh: Bubuk Matcha Hana, Gula Aren, Cup 16 oz"
                  value={formData.name}
                  onChange={(e) => setFormData((p) => ({ ...p, name: e.target.value }))}
                  className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 font-semibold text-stone-900 transition-all"
                />
              </div>

              {/* Unit & Type */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-stone-700 block mb-1">
                    Satuan (Unit) *
                  </label>
                  <input
                    type="text"
                    placeholder="gr, ml, pcs, botol"
                    value={formData.unit}
                    onChange={(e) => setFormData((p) => ({ ...p, unit: e.target.value }))}
                    className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 font-semibold text-stone-900 transition-all"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-stone-700 block mb-1">
                    Kategori Bahan
                  </label>
                  <select
                    value={formData.isPackaging ? 'true' : 'false'}
                    onChange={(e) =>
                      setFormData((p) => ({ ...p, isPackaging: e.target.value === 'true' }))
                    }
                    className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 font-bold text-stone-900 cursor-pointer"
                  >
                    <option value="false">Bahan Racikan</option>
                    <option value="true">Kemasan (Cup/Plastik)</option>
                  </select>
                </div>
              </div>

              {/* Initial Stock & Avg Cost */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-stone-700 block mb-1">
                    {editingIngredient ? 'Jumlah Stok Saat Ini' : 'Stok Awal'}
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={formData.stock}
                    onChange={(e) => setFormData((p) => ({ ...p, stock: e.target.value }))}
                    className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 font-bold text-stone-900 transition-all text-right"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-stone-700 block mb-1">
                    Harga Pokok / Satuan (Rp)
                  </label>
                  <input
                    type="number"
                    value={formData.costPerUnit}
                    onChange={(e) => setFormData((p) => ({ ...p, costPerUnit: e.target.value }))}
                    className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 font-bold text-stone-900 transition-all text-right"
                  />
                </div>
              </div>

              {formData.costPerUnit && formData.unit && (
                <div className="p-3 bg-orange-50/50 rounded-2xl border border-orange-200/60 flex items-center justify-between">
                  <span className="text-[11px] text-stone-500 font-semibold">
                    Estimasi HPP Bahan:
                  </span>
                  <span className="text-xs font-bold text-orange-700">
                    {formatRupiah(parseInt(formData.costPerUnit) || 0)} / {formData.unit}
                  </span>
                </div>
              )}
            </div>

            <div className="px-6 py-4 border-t border-stone-100 flex items-center justify-end gap-2 bg-stone-50/60">
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="px-4 py-2 text-xs font-bold text-stone-600 hover:bg-stone-200/60 rounded-xl transition-colors cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="px-5 py-2 text-xs font-bold rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white shadow-md shadow-orange-500/20 transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Menyimpan...</span>
                  </>
                ) : (
                  <>
                    <Save className="w-3.5 h-3.5" />
                    <span>Simpan Bahan</span>
                  </>
                )}
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* B. Restock Modal */}
      {showRestockModal && restockIngredient && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-stone-900/60 backdrop-blur-md p-4">
          <motion.div
            initial={{ scale: 0.96, opacity: 0, y: 12 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.96, opacity: 0, y: 12 }}
            className="bg-white rounded-3xl shadow-2xl border border-stone-200/80 w-full max-w-md overflow-hidden text-left"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-stone-100 bg-emerald-50/70">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
                  <TrendingUp className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold font-heading text-emerald-950">
                    Restock {restockIngredient.name}
                  </h3>
                  <p className="text-[11px] text-emerald-700 font-semibold">
                    Stok saat ini: {restockIngredient.stock} {restockIngredient.unit}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowRestockModal(false)}
                className="p-1.5 text-stone-400 hover:text-stone-700 hover:bg-stone-200/60 rounded-xl transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              {/* Input Qty and Cost */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-stone-700 block mb-1">
                    Jumlah Masuk ({restockIngredient.unit}) *
                  </label>
                  <input
                    type="number"
                    step="any"
                    placeholder="0"
                    value={restockData.quantity}
                    onChange={(e) =>
                      setRestockData((p) => ({ ...p, quantity: e.target.value }))
                    }
                    className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-bold text-stone-900 transition-all text-right"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-stone-700 block mb-1">
                    Total Biaya Belanja (Rp) *
                  </label>
                  <input
                    type="number"
                    placeholder="0"
                    value={restockData.totalCost}
                    onChange={(e) =>
                      setRestockData((p) => ({ ...p, totalCost: e.target.value }))
                    }
                    className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-bold text-stone-900 transition-all text-right"
                  />
                </div>
              </div>

              {/* Live Average Cost Calculator Preview */}
              {restockData.quantity && restockData.totalCost && (
                <div className="p-3.5 bg-emerald-50/70 rounded-2xl border border-emerald-200/70 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 block">
                      Estimasi Rata-rata HPP Baru:
                    </span>
                    <span className="text-[11px] text-emerald-600">
                      Sebelumnya: {formatRupiah(restockIngredient.costPerUnit)} / {restockIngredient.unit}
                    </span>
                  </div>
                  <span className="text-sm font-heading font-black text-emerald-950">
                    {formatRupiah(
                      Math.round(
                        (restockIngredient.stock * restockIngredient.costPerUnit +
                          parseInt(restockData.totalCost)) /
                          (restockIngredient.stock + parseFloat(restockData.quantity))
                      )
                    )}{' '}
                    <span className="text-xs font-semibold text-emerald-700">/ {restockIngredient.unit}</span>
                  </span>
                </div>
              )}

              {/* Payment Source */}
              <div>
                <label className="text-[11px] font-bold text-stone-700 block mb-1.5">
                  Sumber Dana Pengeluaran Belanja:
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      setRestockData((p) => ({ ...p, source: 'CASH_DRAWER' }))
                    }
                    className={`px-3 py-2 text-xs font-bold rounded-xl border transition-all cursor-pointer ${
                      restockData.source === 'CASH_DRAWER'
                        ? 'bg-amber-100/80 border-amber-300 text-amber-950 shadow-2xs'
                        : 'bg-stone-50 border-stone-200 text-stone-600 hover:bg-stone-100'
                    }`}
                  >
                    Kas Laci (Tunai)
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      setRestockData((p) => ({ ...p, source: 'BANK_TRANSFER' }))
                    }
                    className={`px-3 py-2 text-xs font-bold rounded-xl border transition-all cursor-pointer ${
                      restockData.source === 'BANK_TRANSFER'
                        ? 'bg-orange-100/80 border-orange-300 text-orange-950 shadow-2xs'
                        : 'bg-stone-50 border-stone-200 text-stone-600 hover:bg-stone-100'
                    }`}
                  >
                    Transfer Bank / Rekening
                  </button>
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="text-[11px] font-bold text-stone-700 block mb-1">
                  Catatan Belanja (Opsional)
                </label>
                <textarea
                  value={restockData.notes}
                  onChange={(e) =>
                    setRestockData((p) => ({ ...p, notes: e.target.value }))
                  }
                  rows={2}
                  placeholder="Contoh: Belanja bahan di Pasar Baru / Suplier Utama"
                  className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-xs font-semibold text-stone-900 transition-all resize-none"
                />
              </div>
            </div>

            <div className="px-6 py-4 border-t border-stone-100 flex items-center justify-end gap-2 bg-stone-50/60">
              <button
                type="button"
                onClick={() => setShowRestockModal(false)}
                className="px-4 py-2 text-xs font-bold text-stone-600 hover:bg-stone-200/60 rounded-xl transition-colors cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleRestock}
                disabled={saving}
                className="px-5 py-2 text-xs font-bold rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white shadow-md shadow-emerald-600/20 transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Mencatat...</span>
                  </>
                ) : (
                  <>
                    <TrendingUp className="w-3.5 h-3.5" />
                    <span>Catat Restock</span>
                  </>
                )}
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* C. Delete Confirmation Modal */}
      {deleteTarget && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-stone-900/60 backdrop-blur-md p-4">
          <motion.div
            initial={{ scale: 0.96, opacity: 0, y: 12 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.96, opacity: 0, y: 12 }}
            className="bg-white rounded-3xl shadow-2xl border border-stone-200/80 w-full max-w-sm p-6 text-center"
          >
            <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto mb-3">
              <Trash2 className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-stone-900 font-heading mb-1">
              Hapus Bahan Baku?
            </h3>
            <p className="text-xs text-stone-500 mb-5 leading-relaxed">
              Bahan <strong>{deleteTarget.name}</strong> akan dihapus permanen dari inventaris. Pastikan bahan ini tidak lagi digunakan pada resep aktif.
            </p>
            <div className="flex gap-2.5">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                className="flex-1 px-4 py-2.5 text-xs font-bold rounded-xl border border-stone-200 text-stone-600 hover:bg-stone-100 transition-colors cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleDelete}
                className="flex-1 px-4 py-2.5 text-xs font-bold rounded-xl bg-rose-600 hover:bg-rose-700 text-white shadow-md shadow-rose-600/20 transition-all cursor-pointer"
              >
                Ya, Hapus
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}

