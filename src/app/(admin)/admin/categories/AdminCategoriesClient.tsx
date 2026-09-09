'use client';

import { useState, useMemo, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  Plus,
  Edit2,
  Trash2,
  X,
  Save,
  Loader2,
  FolderOpen,
  Package,
  Download,
  LayoutGrid,
  List,
  Search,
  ShieldCheck,
  TrendingUp,
  AlertTriangle,
  ExternalLink,
  CheckSquare,
  Square,
  ArrowUpDown,
  Check,
  Layers,
  Sparkles,
  Info,
  FolderPlus,
} from 'lucide-react';
import { useToast } from '@/components/ui/Toast';
import { formatRupiah, cn } from '@/lib/utils';

export interface ProductPreview {
  id: string;
  name: string;
  price: number;
  image?: string | null;
  badge?: string | null;
}

export interface CategoryWithCount {
  id: string;
  name: string;
  slug: string;
  createdAt?: string | Date;
  updatedAt?: string | Date;
  _count: { products: number };
  products?: ProductPreview[];
}

interface Props {
  initialCategories: CategoryWithCount[];
}

export default function AdminCategoriesClient({ initialCategories }: Props) {
  const { showToast } = useToast();
  const router = useRouter();
  const searchInputRef = useRef<HTMLInputElement>(null);

  // View Mode: 'grid' (Visual Bento) vs 'table' (Matriks Tabel)
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');

  // Search, Filter & Sort States
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'with-products' | 'empty'>('all');
  const [sortBy, setSortBy] = useState<'name-asc' | 'name-desc' | 'products-desc' | 'products-asc'>('name-asc');

  // Multi-select Checkboxes
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isBulkProcessing, setIsBulkProcessing] = useState(false);
  const [showBulkDeleteModal, setShowBulkDeleteModal] = useState(false);

  // Add / Edit Modal State
  const [showModal, setShowModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState<CategoryWithCount | null>(null);
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);

  // Delete Target Modal State
  const [deleteTarget, setDeleteTarget] = useState<CategoryWithCount | null>(null);
  const [deleteError, setDeleteError] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  // Keyboard shortcut: ⌘K or Ctrl+K to focus search input
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

  // Live slug preview calculation
  const previewSlug = useMemo(() => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
  }, [name]);

  // Overall Statistics Ribbon
  const stats = useMemo(() => {
    const total = initialCategories.length;
    const withProducts = initialCategories.filter((c) => c._count.products > 0).length;
    const emptyCount = total - withProducts;
    const totalProducts = initialCategories.reduce((acc, c) => acc + c._count.products, 0);
    const avgProducts = total > 0 ? (totalProducts / total).toFixed(1) : '0';
    const activeRate = total > 0 ? Math.round((withProducts / total) * 100) : 0;

    return {
      total,
      withProducts,
      emptyCount,
      totalProducts,
      avgProducts,
      activeRate,
    };
  }, [initialCategories]);

  // Filtered & Sorted Categories
  const filteredCategories = useMemo(() => {
    return initialCategories
      .filter((cat) => {
        // Search filter
        if (search.trim()) {
          const q = search.toLowerCase();
          const matchName = cat.name.toLowerCase().includes(q);
          const matchSlug = cat.slug.toLowerCase().includes(q);
          if (!matchName && !matchSlug) return false;
        }

        // Status filter
        if (statusFilter === 'with-products') {
          return cat._count.products > 0;
        }
        if (statusFilter === 'empty') {
          return cat._count.products === 0;
        }

        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'name-asc') return a.name.localeCompare(b.name, 'id');
        if (sortBy === 'name-desc') return b.name.localeCompare(a.name, 'id');
        if (sortBy === 'products-desc') return b._count.products - a._count.products;
        if (sortBy === 'products-asc') return a._count.products - b._count.products;
        return 0;
      });
  }, [initialCategories, search, statusFilter, sortBy]);

  // Multi-select handlers
  const toggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    const visibleIds = filteredCategories.map((c) => c.id);
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

  const isAllSelected =
    filteredCategories.length > 0 &&
    filteredCategories.every((c) => selectedIds.includes(c.id));

  // Modal open & close
  const openModal = (cat?: CategoryWithCount) => {
    setEditingCategory(cat || null);
    setName(cat?.name || '');
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingCategory(null);
    setName('');
  };

  // Save Category Handler
  const handleSave = async () => {
    if (!name.trim()) {
      showToast('Nama kategori wajib diisi', 'error');
      return;
    }
    setSaving(true);
    try {
      const url = editingCategory
        ? `/api/admin/categories/${editingCategory.id}`
        : '/api/admin/categories';
      const res = await fetch(url, {
        method: editingCategory ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim() }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Gagal menyimpan kategori');
      }

      closeModal();
      router.refresh();
      showToast(
        editingCategory
          ? 'Kategori menu berhasil diperbarui'
          : 'Kategori menu baru berhasil ditambahkan',
        'success'
      );
    } catch (err: any) {
      showToast(err.message || 'Terjadi kesalahan saat menyimpan kategori', 'error');
    } finally {
      setSaving(false);
    }
  };

  // Single Delete Handler
  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleteError('');
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/admin/categories/${deleteTarget.id}`, {
        method: 'DELETE',
      });
      if (res.status === 409) {
        const data = await res.json();
        setDeleteError(data.error || 'Kategori tidak dapat dihapus karena masih memiliki produk.');
        return;
      }
      if (!res.ok) throw new Error('Gagal menghapus');

      setDeleteTarget(null);
      setSelectedIds((prev) => prev.filter((id) => id !== deleteTarget.id));
      router.refresh();
      showToast('Kategori menu berhasil dihapus permanen', 'success');
    } catch {
      showToast('Terjadi kesalahan saat menghapus kategori', 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  // Bulk Delete Handler
  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    setIsBulkProcessing(true);
    try {
      const res = await fetch('/api/admin/categories/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: selectedIds, action: 'delete' }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Gagal memproses aksi masal');

      showToast(data.message || 'Aksi masal selesai dijalankan', 'success');
      setSelectedIds([]);
      setShowBulkDeleteModal(false);
      router.refresh();
    } catch (err: any) {
      showToast(err.message || 'Gagal menghapus kategori terpilih', 'error');
    } finally {
      setIsBulkProcessing(false);
    }
  };

  // Export CSV Handler
  const handleExportCSV = () => {
    window.open('/api/admin/categories/export', '_blank');
  };

  // Selected categories info for bulk modal
  const selectedCategories = useMemo(() => {
    return initialCategories.filter((c) => selectedIds.includes(c.id));
  }, [initialCategories, selectedIds]);

  const deletableCount = useMemo(() => {
    return selectedCategories.filter((c) => c._count.products === 0).length;
  }, [selectedCategories]);

  const skippedCount = selectedCategories.length - deletableCount;

  return (
    <div className="space-y-6 text-left">
      {/* ── TOP HEADER & WORKSPACE ACTION BAR ── */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-slate-900 font-heading">
              Kategori Menu
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-extrabold bg-orange-50 text-orange-700 border border-orange-200/80">
              {initialCategories.length} Kategori
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Kelola dan organisir pengelompokan menu minuman, makanan, dan promo Arum Seduh
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Quick View Switcher (Visual Bento vs Matriks Tabel) */}
          <div className="flex items-center bg-slate-100 p-1 rounded-2xl border border-slate-200/80 text-slate-600">
            <button
              type="button"
              onClick={() => setViewMode('grid')}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold text-xs transition-all cursor-pointer',
                viewMode === 'grid'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800'
              )}
              title="Tampilan Visual Bento"
            >
              <LayoutGrid className="w-3.5 h-3.5 text-orange-500" />
              <span>Visual Bento</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('table')}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold text-xs transition-all cursor-pointer',
                viewMode === 'table'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800'
              )}
              title="Tampilan Matriks Tabel"
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
            title="Download CSV Kategori Menu"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            <span className="hidden sm:inline">Export CSV</span>
          </button>

          {/* Add Category Button */}
          <button
            type="button"
            onClick={() => openModal()}
            className="px-4 py-2 rounded-2xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-bold text-xs shadow-glow-orange flex items-center gap-1.5 transition-all cursor-pointer active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>Tambah Kategori Baru</span>
          </button>
        </div>
      </div>

      {/* ── QUICK INTELLIGENCE RIBBON (4 Metric Cards matching Produk style) ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* Metric 1: Total Kategori Terdaftar */}
        <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs flex flex-col justify-between group hover:border-orange-200 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Total Kategori
            </span>
            <span className="w-6 h-6 rounded-lg bg-orange-50 text-orange-600 flex items-center justify-center">
              <FolderOpen className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <div>
              <span className="text-2xl font-extrabold tracking-tight text-slate-900">
                {stats.total}
              </span>
              <span className="text-[11px] text-emerald-600 font-semibold ml-1.5">
                {stats.activeRate}% Aktif
              </span>
            </div>
            <span className="text-[11px] text-slate-400 font-medium">
              {stats.withProducts} Berisi Menu
            </span>
          </div>
          <div className="w-full bg-slate-100 rounded-full h-1.5 mt-3 overflow-hidden">
            <div
              className="bg-orange-500 h-1.5 rounded-full transition-all duration-500"
              style={{ width: `${stats.activeRate}%` }}
            />
          </div>
        </div>

        {/* Metric 2: Total Menu Terkatalog */}
        <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs flex flex-col justify-between group hover:border-orange-200 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Total Menu Terkatalog
            </span>
            <span className="w-6 h-6 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <Package className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <div>
              <span className="text-2xl font-extrabold tracking-tight text-slate-900">
                {stats.totalProducts}
              </span>
              <span className="text-[11px] text-blue-600 font-semibold ml-1.5">
                Menu Terdistribusi
              </span>
            </div>
          </div>
          <div className="flex items-center gap-1.5 text-[11px] text-slate-500 mt-3">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
            <span>Terhubung ke sistem POS & online</span>
          </div>
        </div>

        {/* Metric 3: Kepadatan Menu per Kategori */}
        <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs flex flex-col justify-between group hover:border-orange-200 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Rata-rata Menu / Kategori
            </span>
            <span className="w-6 h-6 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <div>
              <span className="text-2xl font-extrabold tracking-tight text-slate-900">
                {stats.avgProducts}
              </span>
              <span className="text-[11px] text-emerald-600 font-semibold ml-1.5">
                Item / Kategori
              </span>
            </div>
          </div>
          <div className="w-full bg-slate-100 rounded-full h-1.5 mt-3 overflow-hidden">
            <div
              className="bg-gradient-to-r from-amber-400 to-emerald-500 h-1.5 rounded-full transition-all duration-500"
              style={{
                width: `${Math.min(
                  100,
                  Math.round((Number(stats.avgProducts) / 10) * 100)
                )}%`,
              }}
            />
          </div>
        </div>

        {/* Metric 4: Kategori Kosong / Perlu Menu */}
        <div
          className={cn(
            'p-4 rounded-2xl border shadow-xs flex flex-col justify-between group transition-all',
            stats.emptyCount > 0
              ? 'bg-amber-50/60 border-amber-200/80 hover:bg-amber-50'
              : 'bg-white border-slate-200/80 hover:border-slate-300'
          )}
        >
          <div className="flex items-center justify-between">
            <span
              className={cn(
                'text-[11px] font-bold uppercase tracking-wider',
                stats.emptyCount > 0 ? 'text-amber-700' : 'text-slate-400'
              )}
            >
              Kategori Kosong
            </span>
            <span
              className={cn(
                'w-6 h-6 rounded-lg flex items-center justify-center',
                stats.emptyCount > 0
                  ? 'bg-amber-100 text-amber-700'
                  : 'bg-slate-100 text-slate-400'
              )}
            >
              <AlertTriangle className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <div>
              <span
                className={cn(
                  'text-2xl font-extrabold tracking-tight',
                  stats.emptyCount > 0 ? 'text-amber-800' : 'text-slate-900'
                )}
              >
                {stats.emptyCount} Kategori
              </span>
              <span className="text-[11px] text-slate-500 font-semibold ml-1.5">
                0 Menu
              </span>
            </div>
          </div>
          {stats.emptyCount > 0 ? (
            <button
              type="button"
              onClick={() => setStatusFilter('empty')}
              className="mt-2 text-[11px] font-bold text-amber-700 flex items-center gap-1 hover:underline cursor-pointer"
            >
              <span>Filter Kategori Kosong</span>
              <span className="text-[14px]">→</span>
            </button>
          ) : (
            <div className="flex items-center gap-1.5 text-[11px] text-emerald-600 font-medium mt-3">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Semua kategori terisi menu</span>
            </div>
          )}
        </div>
      </div>

      {/* ── INTERACTIVE FILTER & SEARCH BAR ── */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-3 sm:p-4 shadow-xs space-y-3">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          {/* Segmented Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 lg:pb-0 scrollbar-none text-xs font-semibold">
            <button
              type="button"
              onClick={() => setStatusFilter('all')}
              className={cn(
                'px-3.5 py-1.5 rounded-xl flex items-center gap-1.5 whitespace-nowrap transition-all cursor-pointer',
                statusFilter === 'all'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              )}
            >
              <span>Semua Kategori</span>
              <span
                className={cn(
                  'px-1.5 py-0.5 rounded-md text-[10px] font-bold',
                  statusFilter === 'all'
                    ? 'bg-white/20 text-white'
                    : 'bg-slate-100 text-slate-500'
                )}
              >
                {stats.total}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setStatusFilter('with-products')}
              className={cn(
                'px-3.5 py-1.5 rounded-xl flex items-center gap-1.5 whitespace-nowrap transition-all cursor-pointer',
                statusFilter === 'with-products'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              )}
            >
              <span>Ada Menu</span>
              <span
                className={cn(
                  'px-1.5 py-0.5 rounded-md text-[10px] font-bold',
                  statusFilter === 'with-products'
                    ? 'bg-white/20 text-white'
                    : 'bg-slate-100 text-slate-500'
                )}
              >
                {stats.withProducts}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setStatusFilter('empty')}
              className={cn(
                'px-3.5 py-1.5 rounded-xl flex items-center gap-1.5 whitespace-nowrap transition-all cursor-pointer',
                statusFilter === 'empty'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              )}
            >
              <span>Kategori Kosong</span>
              <span
                className={cn(
                  'px-1.5 py-0.5 rounded-md text-[10px] font-bold',
                  statusFilter === 'empty'
                    ? 'bg-white/20 text-white'
                    : 'bg-slate-100 text-slate-500'
                )}
              >
                {stats.emptyCount}
              </span>
            </button>
          </div>

          {/* Search Box & Sort Dropdown */}
          <div className="flex items-center gap-2 w-full lg:w-auto">
            {/* Search Input with Ctrl+K */}
            <div className="relative flex-1 sm:w-72">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                ref={searchInputRef}
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Cari kategori atau slug... (Ctrl+K)"
                className="w-full pl-9 pr-8 py-2 text-xs bg-slate-50 hover:bg-slate-100/80 focus:bg-white rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all placeholder:text-slate-400"
              />
              {search ? (
                <button
                  type="button"
                  onClick={() => setSearch('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              ) : (
                <kbd className="hidden sm:inline-block absolute right-2.5 top-1/2 -translate-y-1/2 px-1.5 py-0.5 text-[9px] font-mono text-slate-400 bg-white border border-slate-200 rounded shadow-2xs">
                  ⌘K
                </kbd>
              )}
            </div>

            {/* Sort Dropdown */}
            <div className="relative">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="px-3 py-2 text-xs font-semibold bg-slate-50 hover:bg-slate-100 rounded-xl border border-slate-200 text-slate-700 focus:outline-none focus:ring-2 focus:ring-orange-500/20 cursor-pointer transition-all"
              >
                <option value="name-asc">Nama (A - Z)</option>
                <option value="name-desc">Nama (Z - A)</option>
                <option value="products-desc">Menu Terbanyak</option>
                <option value="products-asc">Menu Tersedikit</option>
              </select>
            </div>
          </div>
        </div>

        {/* Active Filters indicator */}
        {(search || statusFilter !== 'all') && (
          <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-100 text-slate-500">
            <span>
              Menampilkan <strong>{filteredCategories.length}</strong> dari{' '}
              {initialCategories.length} kategori
            </span>
            <button
              type="button"
              onClick={() => {
                setSearch('');
                setStatusFilter('all');
              }}
              className="text-orange-600 font-bold hover:underline cursor-pointer"
            >
              Reset Filter
            </button>
          </div>
        )}
      </div>

      {/* ── BULK ACTION TOOLBAR (Multi-Select) ── */}
      {selectedIds.length > 0 && (
        <div className="bg-orange-500 text-white rounded-2xl p-3.5 shadow-lg shadow-orange-500/20 flex items-center justify-between flex-wrap gap-3 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={toggleSelectAll}
              className="p-1 rounded-lg bg-white/20 hover:bg-white/30 text-white cursor-pointer"
              title="Batalkan Semua"
            >
              <CheckSquare className="w-4 h-4" />
            </button>
            <span className="text-xs font-bold">
              {selectedIds.length} kategori dipilih
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setSelectedIds([])}
              className="px-3 py-1.5 rounded-xl bg-white/20 hover:bg-white/30 text-white text-xs font-bold transition-all cursor-pointer"
            >
              Batal
            </button>
            <button
              type="button"
              onClick={() => setShowBulkDeleteModal(true)}
              className="px-3.5 py-1.5 rounded-xl bg-white text-rose-600 hover:bg-rose-50 text-xs font-bold flex items-center gap-1.5 shadow-xs transition-all cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Hapus Terpilih</span>
            </button>
          </div>
        </div>
      )}

      {/* ── EMPTY STATE ── */}
      {filteredCategories.length === 0 && (
        <div className="py-16 text-center rounded-3xl border-2 border-dashed border-slate-200 bg-white shadow-xs">
          <FolderOpen className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h4 className="font-bold text-sm text-slate-800">
            Tidak ada kategori yang sesuai
          </h4>
          <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
            {search
              ? `Tidak ditemukan kategori dengan kata kunci "${search}". Silakan bersihkan pencarian atau buat baru.`
              : 'Belum ada kategori yang terdaftar dalam filter ini.'}
          </p>
          <div className="mt-4 flex items-center justify-center gap-2">
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all cursor-pointer"
              >
                Bersihkan Pencarian
              </button>
            )}
            <button
              type="button"
              onClick={() => openModal()}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 text-white text-xs font-bold shadow-glow-orange flex items-center gap-1.5 hover:opacity-95 transition-all cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Tambah Kategori Baru</span>
            </button>
          </div>
        </div>
      )}

      {/* ── MATRIKS TABEL VIEW ── */}
      {viewMode === 'table' && filteredCategories.length > 0 && (
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden text-left">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/80 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                  <th className="p-4 w-10">
                    <input
                      type="checkbox"
                      checked={isAllSelected}
                      onChange={toggleSelectAll}
                      className="rounded text-orange-500 w-4 h-4 cursor-pointer focus:ring-orange-400"
                    />
                  </th>
                  <th className="py-3.5 px-3 text-left">Kategori Menu</th>
                  <th className="py-3.5 px-3 text-left">Slug URL</th>
                  <th className="py-3.5 px-3 text-left">Jumlah Menu</th>
                  <th className="py-3.5 px-3 text-left">Cuplikan Menu Terdaftar</th>
                  <th className="py-3.5 px-3 text-left">Status</th>
                  <th className="py-3.5 px-4 text-right">Aksi Cepat</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {filteredCategories.map((cat) => {
                  const isSelected = selectedIds.includes(cat.id);
                  const hasProducts = cat._count.products > 0;
                  const previews = cat.products || [];

                  return (
                    <tr
                      key={cat.id}
                      className={cn(
                        'transition-colors',
                        isSelected ? 'bg-orange-50/30' : 'hover:bg-slate-50/80'
                      )}
                    >
                      {/* Checkbox */}
                      <td className="p-4">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelect(cat.id)}
                          className="rounded text-orange-500 w-4 h-4 cursor-pointer focus:ring-orange-400"
                        />
                      </td>

                      {/* Category Name & Emblem */}
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-orange-50 border border-orange-100 flex items-center justify-center text-orange-600 shrink-0">
                            <FolderOpen className="w-5 h-5" />
                          </div>
                          <div className="min-w-0">
                            <div className="font-bold text-slate-900 text-sm">
                              {cat.name}
                            </div>
                            <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                              ID: {cat.id.slice(0, 8)}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Slug */}
                      <td className="py-3 px-3 font-mono text-[11px] text-slate-500">
                        <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-600">
                          /{cat.slug}
                        </span>
                      </td>

                      {/* Product Count */}
                      <td className="py-3 px-3">
                        <span
                          className={cn(
                            'inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-extrabold',
                            hasProducts
                              ? 'bg-blue-50 text-blue-700 border border-blue-200/80'
                              : 'bg-slate-100 text-slate-500 border border-slate-200'
                          )}
                        >
                          <Package className="w-3.5 h-3.5" />
                          <span>{cat._count.products} Produk</span>
                        </span>
                      </td>

                      {/* Previews */}
                      <td className="py-3 px-3">
                        {previews.length > 0 ? (
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {previews.slice(0, 3).map((p) => (
                              <span
                                key={p.id}
                                className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 text-[10px] font-medium truncate max-w-[120px]"
                                title={p.name}
                              >
                                {p.name}
                              </span>
                            ))}
                            {cat._count.products > 3 && (
                              <span className="text-[10px] text-slate-400 font-bold">
                                +{cat._count.products - 3} lainnya
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-[11px] text-slate-400 italic">
                            Belum ada menu
                          </span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="py-3 px-3">
                        {hasProducts ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                            <span>Aktif</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                            <span>Kosong</span>
                          </span>
                        )}
                      </td>

                      {/* Quick Actions */}
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {/* View Products */}
                          <button
                            type="button"
                            title="Buka Produk Terkait di Katalog"
                            onClick={() =>
                              router.push(`/admin/products?category=${cat.id}`)
                            }
                            className="p-1.5 rounded-lg text-slate-500 hover:text-orange-600 hover:bg-orange-50 transition-colors cursor-pointer"
                          >
                            <ExternalLink className="w-4 h-4" />
                          </button>

                          {/* Edit */}
                          <button
                            type="button"
                            title="Edit Kategori"
                            onClick={() => openModal(cat)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>

                          {/* Delete */}
                          <button
                            type="button"
                            title="Hapus Kategori"
                            onClick={() => {
                              setDeleteTarget(cat);
                              setDeleteError('');
                            }}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── VISUAL BENTO CARD VIEW ── */}
      {viewMode === 'grid' && filteredCategories.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredCategories.map((cat) => {
            const isSelected = selectedIds.includes(cat.id);
            const hasProducts = cat._count.products > 0;
            const previews = cat.products || [];

            return (
              <div
                key={cat.id}
                className={cn(
                  'group bg-white rounded-2xl border transition-all duration-200 p-4.5 relative overflow-hidden shadow-xs hover:shadow-md flex flex-col justify-between',
                  isSelected
                    ? 'border-orange-400 bg-orange-50/15 ring-2 ring-orange-500/20'
                    : 'border-slate-200/80 hover:border-orange-200'
                )}
              >
                <div>
                  {/* Top Bar: Checkbox, Icon, Title, Actions */}
                  <div className="flex items-start justify-between gap-3 mb-3.5">
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      {/* Checkbox */}
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleSelect(cat.id)}
                        className="w-4 h-4 rounded border-slate-300 text-orange-500 focus:ring-orange-400 cursor-pointer shrink-0"
                      />

                      {/* Icon Emblem */}
                      <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-orange-500/10 to-amber-500/15 border border-orange-200/60 text-orange-600 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform duration-200">
                        <FolderOpen className="w-5 h-5" />
                      </div>

                      {/* Category Name & Slug */}
                      <div className="min-w-0 flex-1">
                        <h3 className="font-bold text-slate-900 text-[15px] truncate group-hover:text-orange-600 transition-colors">
                          {cat.name}
                        </h3>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="font-mono text-[10px] text-slate-400 truncate bg-slate-100 px-1.5 py-0.2 rounded">
                            /{cat.slug}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Action buttons (Edit & Delete) */}
                    <div className="flex items-center gap-0.5 opacity-90 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                      <button
                        type="button"
                        onClick={() => openModal(cat)}
                        title="Edit Kategori"
                        className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors cursor-pointer"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setDeleteTarget(cat);
                          setDeleteError('');
                        }}
                        title="Hapus Kategori"
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Menu Previews or Empty State Banner */}
                  <div className="my-3 py-2.5 px-3 rounded-xl bg-slate-50 border border-slate-100">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5 flex items-center justify-between">
                      <span>Menu Terdaftar</span>
                      <span className="font-mono text-slate-500">
                        {cat._count.products} Total
                      </span>
                    </div>

                    {previews.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {previews.slice(0, 3).map((p) => (
                          <span
                            key={p.id}
                            className="inline-flex items-center px-2 py-0.5 rounded-md bg-white border border-slate-200/80 text-[10px] font-semibold text-slate-700 truncate max-w-[130px]"
                            title={p.name}
                          >
                            {p.name}
                          </span>
                        ))}
                        {cat._count.products > 3 && (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded-md bg-slate-200/60 text-[10px] font-bold text-slate-500">
                            +{cat._count.products - 3} lagi
                          </span>
                        )}
                      </div>
                    ) : (
                      <div className="text-[11px] text-amber-700/80 italic flex items-center gap-1 py-0.5">
                        <AlertTriangle className="w-3 h-3 text-amber-500 shrink-0" />
                        <span>Kategori masih kosong, belum ada menu.</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Bottom Footer: Product count & direct catalog link */}
                <div className="pt-3 border-t border-slate-100 flex items-center justify-between mt-1">
                  <div className="flex items-center gap-1.5 text-xs text-slate-500">
                    <Package className="w-3.5 h-3.5 text-slate-400" />
                    <span className="font-semibold">
                      {cat._count.products} menu
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      router.push(`/admin/products?category=${cat.id}`)
                    }
                    className="text-xs font-bold text-orange-600 hover:text-orange-700 flex items-center gap-1 hover:underline cursor-pointer"
                  >
                    <span>Lihat Produk</span>
                    <span className="text-[13px]">→</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── CREATE / EDIT CATEGORY MODAL ── */}
      {showModal && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in duration-200"
          onClick={closeModal}
        >
          <div
            className="bg-white rounded-3xl shadow-2xl border border-slate-100 w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4.5 border-b border-slate-100 bg-slate-50/50">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-orange-50 border border-orange-100 flex items-center justify-center text-orange-600">
                  <FolderPlus className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-slate-900 font-heading">
                    {editingCategory ? 'Edit Kategori Menu' : 'Tambah Kategori Baru'}
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Atur nama dan identitas kategori menu Arum Seduh
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={closeModal}
                className="p-1.5 hover:bg-slate-200/60 rounded-xl text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-4">
              <div>
                <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block mb-1.5">
                  Nama Kategori <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  autoFocus
                  onKeyDown={(e) => e.key === 'Enter' && handleSave()}
                  placeholder="Contoh: Kopi Susu & Espresso"
                  className="w-full px-4 py-2.5 text-sm bg-slate-50 hover:bg-slate-100/70 focus:bg-white border border-slate-200 focus:border-orange-500 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/20 transition-all font-medium text-slate-900"
                />
              </div>

              {/* Slug Preview */}
              <div>
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                  Slug URL (Otomatis)
                </label>
                <div className="px-3.5 py-2 text-xs bg-slate-100 rounded-xl border border-slate-200 text-slate-600 font-mono flex items-center gap-1">
                  <span className="text-slate-400">/menu/kategori/</span>
                  <span className="font-bold text-slate-800">
                    {previewSlug || 'nama-kategori'}
                  </span>
                </div>
              </div>

              {/* Live Preview Card */}
              <div className="p-3.5 rounded-2xl bg-orange-50/50 border border-orange-200/60 text-xs">
                <span className="text-[10px] font-bold uppercase tracking-wider text-orange-700 block mb-1">
                  Pratinjau Tampilan:
                </span>
                <div className="flex items-center gap-2.5 bg-white p-2.5 rounded-xl border border-orange-100 shadow-2xs">
                  <div className="w-8 h-8 rounded-lg bg-orange-100 text-orange-600 flex items-center justify-center font-bold text-xs">
                    <FolderOpen className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="font-bold text-slate-900">
                      {name.trim() || 'Nama Kategori'}
                    </div>
                    <div className="text-[10px] text-slate-400">
                      Kategori Menu Arum Seduh
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 border-t border-slate-100 flex justify-end gap-2.5 bg-slate-50/60">
              <button
                type="button"
                onClick={closeModal}
                className="px-4 py-2 text-xs font-bold rounded-xl text-slate-600 hover:bg-slate-200/60 transition-colors cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={saving || !name.trim()}
                className="px-5 py-2 text-xs font-bold rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white shadow-glow-orange flex items-center gap-2 disabled:opacity-50 transition-all cursor-pointer"
              >
                {saving ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                <span>{saving ? 'Menyimpan...' : 'Simpan Kategori'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── SINGLE DELETE CONFIRMATION MODAL ── */}
      {deleteTarget && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in duration-200"
          onClick={() => setDeleteTarget(null)}
        >
          <div
            className="bg-white rounded-3xl shadow-2xl border border-slate-100 w-full max-w-sm p-6 text-center animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {deleteTarget._count.products > 0 ? (
              // Case: Category has products -> CANNOT delete
              <>
                <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-100 flex items-center justify-center mx-auto mb-4 text-amber-600">
                  <AlertTriangle className="w-6 h-6" />
                </div>
                <h3 className="text-base font-extrabold text-slate-900 mb-1 font-heading">
                  Kategori Tidak Dapat Dihapus
                </h3>
                <p className="text-xs text-slate-500 mb-4 leading-relaxed">
                  Kategori <strong>&quot;{deleteTarget.name}&quot;</strong> masih memiliki{' '}
                  <strong className="text-slate-900">
                    {deleteTarget._count.products} menu
                  </strong>{' '}
                  yang terdaftar. Pindahkan atau hapus menu-menu tersebut terlebih dahulu di
                  katalog produk sebelum menghapus kategori ini.
                </p>

                {deleteError && (
                  <p className="text-xs text-rose-600 bg-rose-50 rounded-xl px-3 py-2 mb-4 border border-rose-100">
                    {deleteError}
                  </p>
                )}

                <div className="flex flex-col gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      const catId = deleteTarget.id;
                      setDeleteTarget(null);
                      router.push(`/admin/products?category=${catId}`);
                    }}
                    className="w-full px-4 py-2.5 text-xs font-bold rounded-xl bg-orange-500 hover:bg-orange-600 text-white transition-colors flex items-center justify-center gap-1.5 shadow-xs cursor-pointer"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>Lihat Produk di Katalog ({deleteTarget._count.products})</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeleteTarget(null)}
                    className="w-full px-4 py-2 text-xs font-bold rounded-xl text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                  >
                    Tutup
                  </button>
                </div>
              </>
            ) : (
              // Case: Category has 0 products -> Safe to delete
              <>
                <div className="w-12 h-12 rounded-2xl bg-rose-50 border border-rose-100 flex items-center justify-center mx-auto mb-4 text-rose-500">
                  <Trash2 className="w-6 h-6" />
                </div>
                <h3 className="text-base font-extrabold text-slate-900 mb-1 font-heading">
                  Hapus Kategori Menu?
                </h3>
                <p className="text-xs text-slate-500 mb-4 leading-relaxed">
                  Kategori <strong>&quot;{deleteTarget.name}&quot;</strong> akan dihapus
                  secara permanen dari sistem Arum Seduh.
                </p>

                {deleteError && (
                  <p className="text-xs text-rose-600 bg-rose-50 rounded-xl px-3 py-2 mb-4 border border-rose-100">
                    {deleteError}
                  </p>
                )}

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setDeleteTarget(null)}
                    className="flex-1 px-4 py-2.5 text-xs font-bold rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
                  >
                    Batal
                  </button>
                  <button
                    type="button"
                    onClick={handleDelete}
                    disabled={isDeleting}
                    className="flex-1 px-4 py-2.5 text-xs font-bold rounded-xl bg-rose-600 hover:bg-rose-700 text-white transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                  >
                    {isDeleting ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Trash2 className="w-4 h-4" />
                    )}
                    <span>{isDeleting ? 'Menghapus...' : 'Hapus'}</span>
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* ── BULK DELETE CONFIRMATION MODAL ── */}
      {showBulkDeleteModal && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in duration-200"
          onClick={() => setShowBulkDeleteModal(false)}
        >
          <div
            className="bg-white rounded-3xl shadow-2xl border border-slate-100 w-full max-w-md p-6 text-center animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-12 h-12 rounded-2xl bg-rose-50 border border-rose-100 flex items-center justify-center mx-auto mb-4 text-rose-500">
              <Trash2 className="w-6 h-6" />
            </div>
            <h3 className="text-base font-extrabold text-slate-900 mb-1 font-heading">
              Hapus {selectedIds.length} Kategori Terpilih?
            </h3>

            <div className="text-xs text-slate-500 mb-4 text-left bg-slate-50 p-3.5 rounded-2xl border border-slate-100 space-y-1.5">
              <div className="flex items-center justify-between">
                <span>Siap dihapus (0 menu):</span>
                <strong className="text-rose-600 font-extrabold">
                  {deletableCount} kategori
                </strong>
              </div>
              {skippedCount > 0 && (
                <div className="flex items-center justify-between text-amber-700">
                  <span>Dilewati (masih ada menu):</span>
                  <strong className="font-extrabold">{skippedCount} kategori</strong>
                </div>
              )}
            </div>

            {deletableCount === 0 ? (
              <div className="mb-4">
                <p className="text-xs text-amber-700 bg-amber-50 p-3 rounded-xl border border-amber-200">
                  Seluruh kategori yang dipilih masih memiliki menu terdaftar sehingga tidak
                  dapat dihapus.
                </p>
              </div>
            ) : (
              <p className="text-xs text-slate-500 mb-4">
                Tindakan ini akan menghapus kategori kosong secara permanen.
              </p>
            )}

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setShowBulkDeleteModal(false)}
                className="flex-1 px-4 py-2.5 text-xs font-bold rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
              >
                Batal
              </button>
              {deletableCount > 0 && (
                <button
                  type="button"
                  onClick={handleBulkDelete}
                  disabled={isBulkProcessing}
                  className="flex-1 px-4 py-2.5 text-xs font-bold rounded-xl bg-rose-600 hover:bg-rose-700 text-white transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                >
                  {isBulkProcessing ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Trash2 className="w-4 h-4" />
                  )}
                  <span>{isBulkProcessing ? 'Memproses...' : 'Hapus Sekarang'}</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
