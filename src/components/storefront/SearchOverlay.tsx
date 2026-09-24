'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  X,
  ArrowLeft,
  Star,
  Flame,
  Sparkles,
  Coffee,
  UtensilsCrossed,
  LayoutGrid,
  List,
  Plus,
  ShoppingBag,
  CupSoda,
} from 'lucide-react';
import { formatRupiah, getEffectiveProductDisplay, cn } from '@/lib/utils';
import { isFoodItem } from '@/lib/receipt-modifiers';
import Image from 'next/image';
import type { Product, Category } from '@/types';
import { PromoCountdown } from './PromoCountdown';
import { SearchOverlaySkeleton } from '@/components/ui/ShimmerSkeleton';

interface SearchOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  onProductSelect: (product: Product) => void;
  products: Product[];
  categories: Category[];
  packagingStock?: { cupRegular: number; cupJumbo: number };
}

function checkIsFoodProduct(product: Product, categories?: Category[]): boolean {
  const catObj = categories?.find((c) => c.id === product.category || c.slug === product.category);
  const catLower = `${product.category || ''} ${catObj?.name || ''} ${catObj?.slug || ''}`.toLowerCase();
  return (
    isFoodItem(product.name) ||
    (product.modifiers as any)?.productType === 'makanan' ||
    catLower.includes('makan') ||
    catLower.includes('food') ||
    catLower.includes('snack') ||
    catLower.includes('roti') ||
    catLower.includes('pastry') ||
    catLower.includes('cemilan')
  );
}

export function SearchOverlay({
  isOpen,
  onClose,
  onProductSelect,
  products,
  categories,
  packagingStock,
}: SearchOverlayProps) {
  const [query, setQuery] = useState('');
  const [isSearchingLoading, setIsSearchingLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<string>('combo');
  const [typeFilter, setTypeFilter] = useState<'all' | 'drink' | 'food' | 'promo'>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const inputRef = useRef<HTMLInputElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const sectionsRef = useRef<{ [key: string]: HTMLDivElement | null }>({});
  const tabsRef = useRef<HTMLDivElement>(null);

  // Filter products by typeFilter (Semua / Minuman / Makanan / Promo)
  const typeFilteredProducts = useMemo(() => {
    return products.filter((p) => {
      if (typeFilter === 'all') return true;
      const isFood = checkIsFoodProduct(p, categories);
      if (typeFilter === 'food') return isFood && !p.modifiers?.isBundle;
      if (typeFilter === 'drink') return !isFood && !p.modifiers?.isBundle;
      if (typeFilter === 'promo') {
        const { promo, originalPrice, displayPrice } = getEffectiveProductDisplay(p, packagingStock);
        return !!promo || !!(originalPrice && originalPrice > displayPrice);
      }
      return true;
    });
  }, [products, categories, typeFilter, packagingStock]);

  // Counts for type filter badges
  const typeCounts = useMemo(() => {
    let drink = 0;
    let food = 0;
    let promoCount = 0;
    products.forEach((p) => {
      const isFood = checkIsFoodProduct(p, categories);
      if (!p.modifiers?.isBundle) {
        if (isFood) food++;
        else drink++;
      }
      const { promo, originalPrice, displayPrice } = getEffectiveProductDisplay(p, packagingStock);
      if (promo || (originalPrice && originalPrice > displayPrice)) {
        promoCount++;
      }
    });
    return {
      all: products.length,
      drink,
      food,
      promo: promoCount,
    };
  }, [products, categories, packagingStock]);

  // Daftar kategori untuk tab navigasi
  const categoryTabs = useMemo(() => {
    const dbCats = categories
      .filter((c) => c.id !== 'all')
      .filter((c) => {
        const count = typeFilteredProducts.filter((p) => p.category === c.id && !p.modifiers?.isBundle).length;
        return count > 0;
      })
      .map((c) => ({
        id: c.id,
        name: c.name,
        count: typeFilteredProducts.filter((p) => p.category === c.id && !p.modifiers?.isBundle).length,
      }));

    if (typeFilter !== 'all') {
      return dbCats;
    }

    const baseTabs: Array<{ id: string; name: string; count?: number }> = [];
    const comboLen = products.filter((p) => p.modifiers?.isBundle === true).length;
    if (comboLen > 0) baseTabs.push({ id: 'combo', name: 'Paket Combo', count: comboLen });
    baseTabs.push({ id: 'promo', name: 'Promo & Best' });
    baseTabs.push({ id: 'new', name: 'Menu Baru' });

    return [...baseTabs, ...dbCats];
  }, [categories, typeFilteredProducts, typeFilter, products]);

  // Paket Combo (only bundles)
  const comboProducts = useMemo(() => {
    const list = products.filter((p) => p.modifiers?.isBundle === true);
    return [...list].sort((a, b) => (a.badge === 'sold-out' ? 1 : 0) - (b.badge === 'sold-out' ? 1 : 0));
  }, [products]);

  // Produk spesial (best-seller or active promo, no bundles)
  const spesialProducts = useMemo(() => {
    const list = products.filter(
      (p) =>
        (p.badge === 'best-seller' || getEffectiveProductDisplay(p, packagingStock).promo !== null) &&
        p.modifiers?.isBundle !== true
    );
    const baseList = list.length > 0 ? list : products.slice(0, 4).filter((p) => p.modifiers?.isBundle !== true);
    return [...baseList].sort((a, b) => (a.badge === 'sold-out' ? 1 : 0) - (b.badge === 'sold-out' ? 1 : 0));
  }, [products, packagingStock]);

  // Produk baru
  const baruProducts = useMemo(() => {
    const list = products.filter((p) => p.badge === 'new');
    const baseList = list.length > 0 ? list : products.slice(1, 5);
    return [...baseList].sort((a, b) => (a.badge === 'sold-out' ? 1 : 0) - (b.badge === 'sold-out' ? 1 : 0));
  }, [products]);

  // Hasil pencarian
  const searchResults = useMemo(() => {
    if (query.trim().length === 0) return [];
    const q = query.toLowerCase();
    const list = typeFilteredProducts.filter((p) => {
      const catName = categories.find((c) => c.id === p.category)?.name.toLowerCase() || '';
      const isFood = checkIsFoodProduct(p, categories);
      const typeLabel = isFood ? 'makanan cemilan roti snack' : 'minuman kopi teh matcha';
      return (
        p.name.toLowerCase().includes(q) ||
        p.description?.toLowerCase().includes(q) ||
        catName.includes(q) ||
        typeLabel.includes(q)
      );
    });
    return [...list].sort((a, b) => (a.badge === 'sold-out' ? 1 : 0) - (b.badge === 'sold-out' ? 1 : 0));
  }, [query, typeFilteredProducts, categories]);

  const isSearching = query.trim().length > 0;

  // Debounce search query to show skeleton loader smoothly
  useEffect(() => {
    if (query.trim().length > 0) {
      setIsSearchingLoading(true);
      const timer = setTimeout(() => {
        setIsSearchingLoading(false);
      }, 150);
      return () => clearTimeout(timer);
    } else {
      setIsSearchingLoading(false);
    }
  }, [query]);

  // Clear query saat overlay ditutup
  useEffect(() => {
    if (!isOpen) {
      setQuery('');
      setActiveTab('combo');
      setTypeFilter('all');
    }
  }, [isOpen]);

  // Pastikan activeTab selalu mengarah ke tab yang tersedia saat filter berubah
  useEffect(() => {
    if (categoryTabs.length > 0 && !categoryTabs.some((t) => t.id === activeTab)) {
      setActiveTab(categoryTabs[0].id);
    }
  }, [categoryTabs, activeTab]);

  // Scroll tracking untuk auto-highlight category pills
  useEffect(() => {
    if (isSearching) return;
    const container = scrollContainerRef.current;
    if (!container) return;

    const handleScroll = () => {
      const scrollTop = container.scrollTop + 240;
      for (let i = categoryTabs.length - 1; i >= 0; i--) {
        const tab = categoryTabs[i];
        const el = sectionsRef.current[tab.id];
        if (el && el.offsetTop <= scrollTop) {
          setActiveTab(tab.id);
          break;
        }
      }
    };

    container.addEventListener('scroll', handleScroll, { passive: true });
    return () => container.removeEventListener('scroll', handleScroll);
  }, [categoryTabs, isSearching]);

  // Auto-scroll tab pill ke tengah saat berubah
  useEffect(() => {
    const tabsContainer = tabsRef.current;
    if (!tabsContainer) return;
    const activeBtn = tabsContainer.querySelector<HTMLButtonElement>(`[data-tab-id="${activeTab}"]`);
    if (activeBtn) {
      const containerRect = tabsContainer.getBoundingClientRect();
      const btnRect = activeBtn.getBoundingClientRect();
      const scrollLeft = activeBtn.offsetLeft - containerRect.width / 2 + btnRect.width / 2;
      tabsContainer.scrollTo({ left: scrollLeft, behavior: 'smooth' });
    }
  }, [activeTab]);

  const handleTabClick = (tabId: string) => {
    setActiveTab(tabId);
    setQuery('');
    const el = sectionsRef.current[tabId];
    const container = scrollContainerRef.current;
    if (el && container) {
      const offset = 210;
      container.scrollTo({
        top: Math.max(0, el.offsetTop - offset),
        behavior: 'smooth',
      });
    }
  };

  const handleSelectProduct = (product: Product) => {
    onProductSelect(product);
    if (product.badge !== 'sold-out') {
      onClose();
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{
            opacity: typeof window !== 'undefined' && window.location.search.includes('openMenu=true') ? 1 : 0,
          }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.22 }}
          className="fixed inset-0 z-[80] bg-[#FAF8F5] flex flex-col"
        >
          {/* ═══════════════════════════════════════════════════════════════
              HEADER: Search Input + Type Filter + Mobile Category Pills
              ═══════════════════════════════════════════════════════════════ */}
          <div className="sticky top-0 z-50 bg-[#FFFDF9]/95 backdrop-blur-xl border-b border-amber-200/60 shadow-[0_4px_20px_rgba(148,111,72,0.05)] pt-safe shrink-0">
            <div className="max-w-6xl mx-auto w-full px-4 sm:px-6">
              {/* Row 1: Back Button + Search Bar + View Mode Toggle */}
              <div className="flex items-center gap-2.5 sm:gap-3 py-3">
                <button
                  onClick={onClose}
                  className="w-10 h-10 flex items-center justify-center rounded-2xl bg-amber-50/80 hover:bg-orange-100/70 border border-amber-200/60 text-stone-800 hover:text-orange-600 transition-colors touch-target shrink-0 cursor-pointer"
                  aria-label="Kembali"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>

                <div className="relative flex-1">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-orange-500" />
                  <input
                    ref={inputRef}
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Cari minuman kopi, matcha, teh, atau makanan..."
                    className="w-full pl-10 pr-10 py-2.5 rounded-2xl border border-amber-200/80
                      bg-white text-sm text-stone-900 placeholder:text-stone-400
                      focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-400
                      transition-all font-medium shadow-2xs"
                  />
                  {query.length > 0 && (
                    <button
                      onClick={() => setQuery('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2
                        w-5 h-5 rounded-full bg-amber-100
                        flex items-center justify-center hover:bg-orange-200 transition-colors cursor-pointer"
                      aria-label="Hapus pencarian"
                    >
                      <X className="w-3 h-3 text-orange-800" />
                    </button>
                  )}
                </div>

                {/* View Mode Switcher (Grid vs List) */}
                <div className="flex items-center bg-amber-50/90 p-1 rounded-2xl border border-amber-200/70 shrink-0">
                  <button
                    type="button"
                    onClick={() => setViewMode('grid')}
                    className={cn(
                      'p-2 rounded-xl transition-all cursor-pointer',
                      viewMode === 'grid'
                        ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-xs'
                        : 'text-stone-500 hover:text-orange-600'
                    )}
                    aria-label="Tampilan Grid"
                    title="Tampilan Grid"
                  >
                    <LayoutGrid className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewMode('list')}
                    className={cn(
                      'p-2 rounded-xl transition-all cursor-pointer',
                      viewMode === 'list'
                        ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-xs'
                        : 'text-stone-500 hover:text-orange-600'
                    )}
                    aria-label="Tampilan Daftar"
                    title="Tampilan Daftar"
                  >
                    <List className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Row 2: Quick Type Filter (Semua / Minuman / Makanan / Promo) */}
              <div className="flex items-center gap-2 pb-2.5 overflow-x-auto scrollbar-hide">
                {[
                  { id: 'all', label: 'Semua Menu', icon: Sparkles, count: typeCounts.all },
                  { id: 'drink', label: 'Minuman', icon: Coffee, count: typeCounts.drink },
                  { id: 'food', label: 'Makanan & Cemilan', icon: UtensilsCrossed, count: typeCounts.food },
                  { id: 'promo', label: 'Lagi Promo', icon: Flame, count: typeCounts.promo },
                ].map((item) => {
                  const Icon = item.icon;
                  const active = typeFilter === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        setTypeFilter(item.id as any);
                        if (scrollContainerRef.current) {
                          scrollContainerRef.current.scrollTo({ top: 0, behavior: 'smooth' });
                        }
                      }}
                      className={cn(
                        'shrink-0 px-3.5 py-1.5 rounded-xl text-xs font-extrabold flex items-center gap-1.5 border transition-all cursor-pointer',
                        active
                          ? 'bg-stone-900 text-white border-stone-900 shadow-xs'
                          : 'bg-white text-stone-600 border-amber-200/70 hover:border-orange-300 hover:text-orange-600'
                      )}
                    >
                      <Icon className={cn('w-3.5 h-3.5', active ? 'text-amber-400' : 'text-orange-500')} />
                      <span>{item.label}</span>
                      <span
                        className={cn(
                          'px-1.5 py-0.2 rounded-md text-[10px] font-black',
                          active ? 'bg-white/20 text-amber-200' : 'bg-amber-50 text-amber-800'
                        )}
                      >
                        {item.count}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Row 3: Sticky Category Pills (Mobile / Tablet only, Desktop has left rail) */}
              {!isSearching && categoryTabs.length > 0 && (
                <div
                  ref={tabsRef}
                  className="flex lg:hidden gap-2 pb-3 pt-0.5 overflow-x-auto scrollbar-hide"
                >
                  {categoryTabs.map((tab) => {
                    const isActive = activeTab === tab.id;
                    return (
                      <button
                        key={tab.id}
                        data-tab-id={tab.id}
                        onClick={() => handleTabClick(tab.id)}
                        className={cn(
                          'shrink-0 px-4 py-1.5 rounded-full text-[11px] font-extrabold tracking-wide transition-all duration-300 relative whitespace-nowrap cursor-pointer',
                          isActive
                            ? 'text-white'
                            : 'text-stone-700 bg-amber-50/90 border border-amber-200/60 hover:bg-orange-50'
                        )}
                      >
                        {isActive && (
                          <motion.div
                            layoutId="menuActiveTab"
                            className="absolute inset-0 bg-gradient-to-r from-orange-500 to-amber-500 rounded-full shadow-sm shadow-orange-500/20"
                            transition={{ type: 'spring', stiffness: 420, damping: 28 }}
                          />
                        )}
                        <span className="relative z-10 flex items-center gap-1">
                          <span>{tab.name}</span>
                          {tab.count !== undefined && (
                            <span className={cn('text-[9px]', isActive ? 'text-white/90' : 'text-stone-400')}>
                              ({tab.count})
                            </span>
                          )}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* ═══════════════════════════════════════════════════════════════
              KONTEN: Menu Penuh (Desktop Sidebar + Grid / Mobile Scroll) ATAU Hasil Pencarian
              ═══════════════════════════════════════════════════════════════ */}
          <div
            ref={scrollContainerRef}
            className="flex-1 overflow-y-auto pb-28"
          >
            <div className="max-w-6xl mx-auto w-full px-4 sm:px-6 pt-5">
              {isSearching ? (
                /* ─── Mode Pencarian ─── */
                <div>
                  {isSearchingLoading ? (
                    <div className="space-y-3">
                      <p className="text-xs text-stone-500 font-semibold mb-3">
                        Mencari &ldquo;{query}&rdquo;...
                      </p>
                      <SearchOverlaySkeleton />
                    </div>
                  ) : searchResults.length > 0 ? (
                    <>
                      <div className="flex items-center justify-between mb-4">
                        <p className="text-xs text-stone-600 font-bold">
                          Menampilkan <span className="text-orange-600">{searchResults.length} menu</span> untuk &ldquo;{query}&rdquo;
                        </p>
                      </div>
                      <div
                        className={
                          viewMode === 'list'
                            ? 'grid grid-cols-1 md:grid-cols-2 gap-3'
                            : 'grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3.5 sm:gap-4'
                        }
                      >
                        {searchResults.map((product, i) => (
                          <motion.div
                            key={product.id}
                            initial={{ opacity: 0, y: 12 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: Math.min(i * 0.03, 0.25) }}
                          >
                            <MenuProductCard
                              product={product}
                              onClick={handleSelectProduct}
                              viewMode={viewMode}
                              packagingStock={packagingStock}
                              categories={categories}
                            />
                          </motion.div>
                        ))}
                      </div>
                    </>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-20 text-center bg-white rounded-3xl border border-amber-100 p-6">
                      <div className="w-16 h-16 rounded-2xl bg-amber-50 flex items-center justify-center mb-4 border border-amber-200/60 text-orange-500">
                        <Search className="w-7 h-7" />
                      </div>
                      <p className="text-base font-bold text-stone-900">Menu tidak ditemukan</p>
                      <p className="text-xs text-stone-500 mt-1">
                        Coba kata kunci lain atau pilih saran pencarian cepat di bawah ini:
                      </p>

                      {/* Saran pencarian cepat */}
                      <div className="flex flex-wrap gap-2 mt-5 justify-center">
                        {['Matcha', 'Kopi', 'Croissant', 'Roti', 'Signature', 'Latte'].map((tag) => (
                          <button
                            key={tag}
                            onClick={() => setQuery(tag)}
                            className="px-3.5 py-1.5 rounded-full bg-amber-50 border border-amber-200/80
                              text-xs font-bold text-orange-700 hover:bg-orange-100 transition-colors cursor-pointer"
                          >
                            {tag}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                /* ─── Mode Menu Penuh (Desktop Left Rail + Responsive Content) ─── */
                <div className="lg:grid lg:grid-cols-[220px_1fr] lg:gap-7 items-start">
                  {/* Desktop Left Category Rail */}
                  {categoryTabs.length > 0 && (
                    <aside className="hidden lg:flex flex-col gap-1.5 sticky top-5 bg-white rounded-3xl p-3.5 border border-amber-100 shadow-xs">
                      <p className="px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-amber-800/70">
                        Kategori Menu
                      </p>
                      {categoryTabs.map((tab) => {
                        const isActive = activeTab === tab.id;
                        return (
                          <button
                            key={tab.id}
                            onClick={() => handleTabClick(tab.id)}
                            className={cn(
                              'w-full px-3.5 py-2.5 rounded-2xl text-xs font-bold text-left flex items-center justify-between transition-all cursor-pointer',
                              isActive
                                ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-sm shadow-orange-500/20'
                                : 'text-stone-700 hover:bg-amber-50/80 hover:text-orange-600'
                            )}
                          >
                            <span className="truncate">{tab.name}</span>
                            {tab.count !== undefined && (
                              <span
                                className={cn(
                                  'px-2 py-0.5 rounded-full text-[10px] font-extrabold',
                                  isActive ? 'bg-white/20 text-white' : 'bg-amber-50 text-amber-800'
                                )}
                              >
                                {tab.count}
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </aside>
                  )}

                  {/* Main Sections */}
                  <div className="space-y-8 min-w-0">
                    {/* Paket Combo Section (Shown when typeFilter === 'all') */}
                    {typeFilter === 'all' && comboProducts.length > 0 && (
                      <div
                        ref={(el) => {
                          sectionsRef.current['combo'] = el;
                        }}
                        id="menu-section-combo"
                        className="bg-white rounded-3xl p-4 sm:p-5 border border-amber-100/80 shadow-2xs"
                      >
                        <div className="flex items-center justify-between gap-2 mb-4">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-xl bg-orange-50 border border-orange-200/60 flex items-center justify-center text-orange-600">
                              <ShoppingBag className="w-4 h-4" />
                            </div>
                            <div>
                              <h3 className="font-serif font-black text-base sm:text-lg text-stone-900 tracking-tight">
                                Paket Combo Hemat
                              </h3>
                              <p className="text-[10px] text-stone-400 font-semibold">
                                Paduan minuman & makanan lebih hemat
                              </p>
                            </div>
                          </div>
                          <span className="px-2.5 py-1 rounded-full bg-amber-50 text-amber-800 text-[10px] font-extrabold border border-amber-200/60">
                            {comboProducts.length} Paket
                          </span>
                        </div>

                        <div
                          className={
                            viewMode === 'list'
                              ? 'grid grid-cols-1 md:grid-cols-2 gap-3'
                              : 'grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3.5'
                          }
                        >
                          {comboProducts.map((p) => (
                            <MenuProductCard
                              key={p.id}
                              product={p}
                              onClick={handleSelectProduct}
                              viewMode={viewMode}
                              packagingStock={packagingStock}
                              categories={categories}
                            />
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Promo & Best Seller Section (Shown when typeFilter === 'all') */}
                    {typeFilter === 'all' && spesialProducts.length > 0 && (
                      <div
                        ref={(el) => {
                          sectionsRef.current['promo'] = el;
                        }}
                        id="menu-section-promo"
                        className="bg-white rounded-3xl p-4 sm:p-5 border border-amber-100/80 shadow-2xs"
                      >
                        <div className="flex items-center justify-between gap-2 mb-4">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-xl bg-rose-50 border border-rose-200/60 flex items-center justify-center text-rose-600">
                              <Flame className="w-4 h-4 fill-rose-500/20" />
                            </div>
                            <div>
                              <h3 className="font-serif font-black text-base sm:text-lg text-stone-900 tracking-tight">
                                Promo & Best Seller
                              </h3>
                              <p className="text-[10px] text-stone-400 font-semibold">
                                Menu terfavorit pilihan pelanggan Arum Seduh
                              </p>
                            </div>
                          </div>
                        </div>

                        <div
                          className={
                            viewMode === 'list'
                              ? 'grid grid-cols-1 md:grid-cols-2 gap-3'
                              : 'grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3.5'
                          }
                        >
                          {spesialProducts.map((p) => (
                            <MenuProductCard
                              key={p.id}
                              product={p}
                              onClick={handleSelectProduct}
                              viewMode={viewMode}
                              packagingStock={packagingStock}
                              categories={categories}
                            />
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Menu Baru Section (Shown when typeFilter === 'all') */}
                    {typeFilter === 'all' && baruProducts.length > 0 && (
                      <div
                        ref={(el) => {
                          sectionsRef.current['new'] = el;
                        }}
                        id="menu-section-new"
                        className="bg-white rounded-3xl p-4 sm:p-5 border border-amber-100/80 shadow-2xs"
                      >
                        <div className="flex items-center justify-between gap-2 mb-4">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-xl bg-amber-50 border border-amber-200/60 flex items-center justify-center text-amber-600">
                              <Sparkles className="w-4 h-4" />
                            </div>
                            <div>
                              <h3 className="font-serif font-black text-base sm:text-lg text-stone-900 tracking-tight">
                                Menu Baru
                              </h3>
                              <p className="text-[10px] text-stone-400 font-semibold">
                                Kreasi terbaru dari barista & dapur Arum Seduh
                              </p>
                            </div>
                          </div>
                        </div>

                        <div
                          className={
                            viewMode === 'list'
                              ? 'grid grid-cols-1 md:grid-cols-2 gap-3'
                              : 'grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3.5'
                          }
                        >
                          {baruProducts.map((p) => (
                            <MenuProductCard
                              key={p.id}
                              product={p}
                              onClick={handleSelectProduct}
                              viewMode={viewMode}
                              packagingStock={packagingStock}
                              categories={categories}
                            />
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Kategori Database: Responsive Grid / List per Kategori */}
                    {categories
                      .filter((cat) => cat.id !== 'all')
                      .map((cat) => {
                        const filteredProducts = typeFilteredProducts
                          .filter((p) => p.category === cat.id && !p.modifiers?.isBundle)
                          .sort((a, b) => (a.badge === 'sold-out' ? 1 : 0) - (b.badge === 'sold-out' ? 1 : 0));
                        if (filteredProducts.length === 0) return null;

                        const isFoodCat = checkIsFoodProduct(filteredProducts[0], categories);

                        return (
                          <div
                            key={cat.id}
                            ref={(el) => {
                              sectionsRef.current[cat.id] = el;
                            }}
                            id={`menu-section-${cat.id}`}
                            className="bg-white rounded-3xl p-4 sm:p-5 border border-amber-100/80 shadow-2xs"
                          >
                            <div className="flex items-center justify-between gap-2 mb-4">
                              <div className="flex items-center gap-2.5">
                                <div className="w-8 h-8 rounded-xl bg-amber-50 border border-amber-200/60 flex items-center justify-center text-orange-600">
                                  {isFoodCat ? (
                                    <UtensilsCrossed className="w-4 h-4" />
                                  ) : (
                                    <Coffee className="w-4 h-4" />
                                  )}
                                </div>
                                <h3 className="font-serif font-black text-base sm:text-lg text-stone-900 tracking-tight">
                                  {cat.name}
                                </h3>
                              </div>
                              <span className="px-2.5 py-1 rounded-full bg-amber-50 text-amber-800 text-[10px] font-extrabold border border-amber-200/60">
                                {filteredProducts.length} Menu
                              </span>
                            </div>

                            <div
                              className={
                                viewMode === 'list'
                                  ? 'grid grid-cols-1 md:grid-cols-2 gap-3'
                                  : 'grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3.5'
                              }
                            >
                              {filteredProducts.map((product) => (
                                <MenuProductCard
                                  key={product.id}
                                  product={product}
                                  onClick={handleSelectProduct}
                                  viewMode={viewMode}
                                  packagingStock={packagingStock}
                                  categories={categories}
                                />
                              ))}
                            </div>
                          </div>
                        );
                      })}

                    {typeFilteredProducts.length === 0 && (
                      <div className="flex flex-col items-center justify-center py-16 text-center bg-white rounded-3xl border border-amber-100 p-6">
                        <div className="w-14 h-14 rounded-2xl bg-amber-50 flex items-center justify-center mb-3 border border-amber-200/60 text-orange-500">
                          <UtensilsCrossed className="w-6 h-6" />
                        </div>
                        <p className="text-sm font-bold text-stone-900">
                          Belum ada menu untuk filter ini
                        </p>
                        <p className="text-xs text-stone-500 mt-1">
                          Silakan pilih kategori makanan atau minuman lainnya.
                        </p>
                        <button
                          type="button"
                          onClick={() => setTypeFilter('all')}
                          className="mt-4 px-4 py-2 rounded-full bg-gradient-to-r from-orange-500 to-amber-500 text-white text-xs font-bold shadow-xs cursor-pointer"
                        >
                          Tampilkan Semua Menu
                        </button>
                      </div>
                    )}

                    {/* Spacer bawah untuk scroll tracking */}
                    <div className="h-8" />
                  </div>
                </div>
              )}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   KOMPONEN: Kartu Produk Menu (Mendukung Tampilan Grid & List)
   - Palet Oranye & Kuning Amber Arum Seduh
   - Transparansi Potongan Harga (Rule 8) & Ikon Vektor Lucide React (Rule 3)
   ═══════════════════════════════════════════════════════════════════════════ */

function MenuProductCard({
  product,
  onClick,
  viewMode = 'grid',
  packagingStock,
  categories,
}: {
  product: Product;
  onClick: (product: Product) => void;
  viewMode?: 'grid' | 'list';
  packagingStock?: { cupRegular: number; cupJumbo: number };
  categories?: Category[];
}) {
  const {
    displayPrice,
    originalPrice,
    promo,
    isRegularOut,
    sizeNotice,
    isSoldOut,
  } = getEffectiveProductDisplay(product, packagingStock);

  const isFood = useMemo(() => checkIsFoodProduct(product, categories), [product, categories]);
  const discountAmount = originalPrice && originalPrice > displayPrice ? originalPrice - displayPrice : 0;

  const badgeConfig: Record<string, { bg: string; text: string; label: string; icon?: 'flame' | 'sparkle' }> = {
    'best-seller': { bg: 'bg-amber-900/90', text: 'text-amber-100', label: 'Best Seller', icon: 'flame' },
    'new': { bg: 'bg-gradient-to-r from-orange-500 to-amber-500', text: 'text-white', label: 'Baru', icon: 'sparkle' },
    'sold-out': { bg: 'bg-stone-500', text: 'text-white', label: 'Habis' },
  };
  const badge = product.badge ? badgeConfig[product.badge] : null;

  if (viewMode === 'list') {
    return (
      <div
        onClick={() => onClick(product)}
        className={cn(
          'bg-white border border-amber-100/90 rounded-2xl p-3 relative group flex items-center gap-3.5 transition-all duration-300 text-left',
          isSoldOut
            ? 'opacity-65 cursor-pointer'
            : 'hover:border-orange-400 hover:shadow-[0_8px_24px_rgba(234,88,12,0.08)] cursor-pointer'
        )}
      >
        {/* Thumbnail */}
        <div className="relative w-22 h-22 sm:w-24 sm:h-24 rounded-2xl overflow-hidden bg-amber-50/70 shrink-0 border border-amber-100">
          {product.image ? (
            <Image
              src={product.image}
              alt={product.name}
              fill
              sizes="96px"
              className={cn(
                'object-cover group-hover:scale-105 transition-transform duration-500 ease-out',
                isSoldOut && 'grayscale brightness-75'
              )}
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = 'none';
              }}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-amber-300">
              {isFood ? <UtensilsCrossed className="w-6 h-6" /> : <Coffee className="w-6 h-6" />}
            </div>
          )}

          {isSoldOut && (
            <div className="absolute inset-0 bg-black/45 flex items-center justify-center">
              <span className="bg-black/80 text-white font-extrabold text-[8px] px-2 py-0.5 rounded-md tracking-wider uppercase">
                Habis
              </span>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-1.5 flex-wrap mb-1">
              <span
                className={cn(
                  'inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[9px] font-bold',
                  isFood
                    ? 'bg-amber-100/80 text-amber-900'
                    : 'bg-orange-50 text-orange-700'
                )}
              >
                {isFood ? <UtensilsCrossed className="w-2.5 h-2.5" /> : <Coffee className="w-2.5 h-2.5" />}
                <span>{isFood ? 'Makanan' : 'Minuman'}</span>
              </span>

              {promo && !isSoldOut && (
                <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-md bg-rose-600 text-white text-[9px] font-extrabold uppercase">
                  <Flame className="w-2.5 h-2.5 fill-white" /> Promo
                </span>
              )}

              {!promo && badge && (
                <span className={cn('inline-flex items-center gap-0.5 px-2 py-0.5 rounded-md text-[9px] font-extrabold uppercase', badge.bg, badge.text)}>
                  {badge.label}
                </span>
              )}
            </div>

            <h4 className="font-serif font-bold text-xs sm:text-sm text-stone-900 group-hover:text-orange-600 transition-colors line-clamp-1">
              {product.name}
            </h4>
            {product.description && (
              <p className="text-[11px] text-stone-500 line-clamp-1 mt-0.5 leading-relaxed">
                {product.description}
              </p>
            )}
          </div>

          {discountAmount > 0 && originalPrice && (
            <div className="mt-1.5 px-2 py-0.5 rounded-md bg-rose-50 border border-rose-100 text-[9px] font-bold text-rose-700 w-fit">
              {formatRupiah(originalPrice)} - {formatRupiah(discountAmount)} = {formatRupiah(displayPrice)}
            </div>
          )}

          <div className="mt-2 flex items-center justify-between gap-2">
            <div className="flex items-baseline gap-1.5">
              <span className="font-sans font-extrabold text-xs sm:text-sm text-orange-600">
                {formatRupiah(displayPrice)}
              </span>
              {originalPrice && originalPrice > displayPrice && (
                <span className="text-[10px] text-stone-400 line-through">
                  {formatRupiah(originalPrice)}
                </span>
              )}
              {isRegularOut && !isFood && (
                <span className="text-[9px] font-bold text-amber-800 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                  Jumbo
                </span>
              )}
            </div>

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onClick(product);
              }}
              className={cn(
                'px-3 py-1.5 rounded-xl text-[11px] font-extrabold flex items-center gap-1 transition-all cursor-pointer',
                isSoldOut
                  ? 'bg-orange-50 text-orange-700 border border-orange-200'
                  : 'bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-xs hover:shadow-md active:scale-95'
              )}
            >
              {isSoldOut ? (
                <span>Ingatkan</span>
              ) : (
                <>
                  <Plus className="w-3.5 h-3.5" strokeWidth={2.5} />
                  <span>Tambah</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      onClick={() => onClick(product)}
      className={cn(
        'bg-white border border-amber-100/90 rounded-3xl p-3 relative group overflow-hidden flex flex-col justify-between transition-all duration-300 text-left',
        isSoldOut
          ? 'opacity-65 cursor-pointer'
          : 'hover:border-orange-400/80 hover:shadow-[0_12px_28px_rgba(234,88,12,0.08)] hover:-translate-y-1 cursor-pointer'
      )}
    >
      {/* Gambar Produk */}
      <div>
        <div className="relative w-full aspect-square rounded-2xl overflow-hidden bg-amber-50/60 mb-2.5 border border-amber-100/60">
          {product.image ? (
            <Image
              src={product.image}
              alt={product.name}
              fill
              sizes="(max-width: 640px) 45vw, (max-width: 1024px) 30vw, 220px"
              className={cn(
                'object-cover group-hover:scale-105 transition-transform duration-500 ease-out',
                isSoldOut && 'grayscale brightness-75'
              )}
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = 'none';
              }}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-amber-300">
              {isFood ? <UtensilsCrossed className="w-8 h-8" /> : <Coffee className="w-8 h-8" />}
            </div>
          )}

          {/* Rating / Size Notice */}
          {isRegularOut && !isFood && !isSoldOut ? (
            <span className="absolute top-2 right-2 z-10 px-2 py-0.5 rounded-full bg-amber-500 text-white text-[8px] font-black uppercase shadow-sm flex items-center gap-0.5">
              <CupSoda className="w-2.5 h-2.5" /> {sizeNotice}
            </span>
          ) : (
            <span className="absolute top-2 right-2 z-10 px-2 py-0.5 rounded-full bg-white/95 backdrop-blur-sm text-amber-600 text-[9px] font-extrabold shadow-xs flex items-center gap-0.5">
              <Star className="w-2.5 h-2.5 fill-amber-400 stroke-none" /> 4.9
            </span>
          )}

          {/* Promo Countdown Overlay */}
          {promo && !isSoldOut && (
            <div className="absolute top-2 left-2 z-20">
              <PromoCountdown endDate={promo.endDate} compact />
            </div>
          )}

          {/* Badge */}
          {promo && !isSoldOut ? (
            <span className="absolute bottom-2 left-2 z-10 px-2 py-0.5 rounded-lg bg-rose-600 text-white text-[8px] font-extrabold shadow-sm uppercase tracking-wider flex items-center gap-0.5">
              <Flame className="w-2.5 h-2.5 text-white fill-white" /> Promo
            </span>
          ) : (
            badge && (
              <span
                className={cn(
                  'absolute top-2 left-2 z-10 px-2 py-0.5 rounded-full text-[8px] font-extrabold shadow-sm uppercase tracking-wider flex items-center gap-0.5',
                  badge.bg,
                  badge.text
                )}
              >
                {badge.icon === 'flame' && <Flame className="w-2.5 h-2.5 text-amber-300 fill-amber-300" />}
                {badge.icon === 'sparkle' && <Sparkles className="w-2.5 h-2.5 text-white" />}
                {badge.label}
              </span>
            )
          )}

          {/* Food / Drink Pill */}
          <span
            className={cn(
              'absolute bottom-2 right-2 z-10 px-2 py-0.5 rounded-lg text-[8px] font-bold backdrop-blur-md flex items-center gap-1 border',
              isFood
                ? 'bg-amber-950/75 text-amber-100 border-amber-400/30'
                : 'bg-white/90 text-orange-800 border-amber-200/60'
            )}
          >
            {isFood ? <UtensilsCrossed className="w-2.5 h-2.5 text-amber-300" /> : <Coffee className="w-2.5 h-2.5 text-orange-600" />}
            <span>{isFood ? 'Makanan' : 'Minuman'}</span>
          </span>

          {/* Sold Out Overlay */}
          {isSoldOut && (
            <div className="absolute inset-0 bg-black/40 flex items-center justify-center z-20">
              <span className="bg-black/80 text-white font-extrabold text-[9px] px-3 py-1 rounded-full tracking-wider uppercase">
                Habis
              </span>
            </div>
          )}
        </div>

        {/* Nama & Deskripsi Produk */}
        <div className="space-y-1">
          <p className="font-serif font-bold text-xs sm:text-sm text-stone-900 line-clamp-1 leading-snug group-hover:text-orange-600 transition-colors">
            {product.name}
          </p>
          {product.description && (
            <p className="text-[10px] sm:text-[11px] text-stone-500 line-clamp-2 leading-relaxed">
              {product.description}
            </p>
          )}
        </div>
      </div>

      {/* Transparent Discount Breakdown (Rule 8) */}
      {discountAmount > 0 && originalPrice && (
        <div className="mt-2 px-2 py-1 rounded-lg bg-rose-50 border border-rose-100 text-[9px] font-bold text-rose-700 leading-tight">
          {formatRupiah(originalPrice)} - {formatRupiah(discountAmount)} = {formatRupiah(displayPrice)}
        </div>
      )}

      {/* Harga + Tombol Tambah */}
      <div className="mt-2.5 pt-2.5 border-t border-amber-100/70 flex items-center justify-between gap-2">
        <div className="flex flex-col">
          {originalPrice && originalPrice > displayPrice && (
            <span className="text-[9px] text-stone-400 line-through leading-none mb-0.5">
              {formatRupiah(originalPrice)}
            </span>
          )}
          <div className="flex items-baseline gap-1">
            <span className="font-sans font-extrabold text-xs sm:text-sm text-orange-600">
              {formatRupiah(displayPrice)}
            </span>
            {isRegularOut && !isFood && (
              <span className="text-[8px] font-bold text-amber-800 bg-amber-50 px-1 rounded border border-amber-200">
                Jumbo
              </span>
            )}
          </div>
        </div>

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onClick(product);
          }}
          className={cn(
            'w-8 h-8 rounded-2xl flex items-center justify-center transition-all duration-300 cursor-pointer shrink-0',
            isSoldOut
              ? 'bg-orange-50 text-orange-700 border border-orange-200 text-[9px] font-bold px-2 w-auto'
              : 'bg-gradient-to-r from-orange-500 to-amber-500 text-white hover:from-orange-600 hover:to-amber-600 active:scale-90 shadow-xs hover:shadow-md'
          )}
          aria-label={`Pilih ${product.name}`}
        >
          {isSoldOut ? <span>Ingatkan</span> : <Plus className="w-4 h-4" strokeWidth={2.5} />}
        </button>
      </div>
    </div>
  );
}
