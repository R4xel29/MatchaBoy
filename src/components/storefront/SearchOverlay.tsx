'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, X, ArrowLeft, Star, Flame, Sparkles, ChevronDown, MapPin } from 'lucide-react';
import { formatRupiah } from '@/lib/utils';
import Image from 'next/image';
import type { Product, Category } from '@/types';

interface SearchOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  onProductSelect: (product: Product) => void;
  products: Product[];
  categories: Category[];
}

export function SearchOverlay({ isOpen, onClose, onProductSelect, products, categories }: SearchOverlayProps) {
  const [query, setQuery] = useState('');
  const [activeTab, setActiveTab] = useState<string>('combo');
  const inputRef = useRef<HTMLInputElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const sectionsRef = useRef<{ [key: string]: HTMLDivElement | null }>({});
  const tabsRef = useRef<HTMLDivElement>(null);

  // Daftar kategori untuk tab navigasi
  const categoryTabs = useMemo(() => {
    const dbCats = categories
      .filter(c => c.id !== 'all')
      .map(c => ({ id: c.id, name: c.name }));
    return [
      { id: 'combo', name: 'Paket Combo' },
      { id: 'promo', name: 'Promo & Best' },
      { id: 'new', name: 'Baru!' },
      ...dbCats
    ];
  }, [categories]);

  // Paket Combo (only bundles)
  const comboProducts = useMemo(() => {
    const list = products.filter(p => p.modifiers?.isBundle === true);
    return [...list].sort((a, b) => (a.badge === 'sold-out' ? 1 : 0) - (b.badge === 'sold-out' ? 1 : 0));
  }, [products]);

  // Produk spesial (best-seller only, no bundles)
  const spesialProducts = useMemo(() => {
    const list = products.filter(p => p.badge === 'best-seller' && p.modifiers?.isBundle !== true);
    const baseList = list.length > 0 ? list : products.slice(0, 4).filter(p => p.modifiers?.isBundle !== true);
    return [...baseList].sort((a, b) => (a.badge === 'sold-out' ? 1 : 0) - (b.badge === 'sold-out' ? 1 : 0));
  }, [products]);

  // Produk baru
  const baruProducts = useMemo(() => {
    const list = products.filter(p => p.badge === 'new');
    const baseList = list.length > 0 ? list : products.slice(1, 3);
    return [...baseList].sort((a, b) => (a.badge === 'sold-out' ? 1 : 0) - (b.badge === 'sold-out' ? 1 : 0));
  }, [products]);

  // Hasil pencarian
  const searchResults = useMemo(() => {
    if (query.trim().length === 0) return [];
    const list = products.filter(p => {
      const catName = categories.find(c => c.id === p.category)?.name.toLowerCase() || '';
      return (
        p.name.toLowerCase().includes(query.toLowerCase()) ||
        p.description?.toLowerCase().includes(query.toLowerCase()) ||
        catName.includes(query.toLowerCase())
      );
    });
    return [...list].sort((a, b) => (a.badge === 'sold-out' ? 1 : 0) - (b.badge === 'sold-out' ? 1 : 0));
  }, [query, products, categories]);

  const isSearching = query.trim().length > 0;

  // Clear query saat overlay ditutup
  useEffect(() => {
    if (!isOpen) {
      setQuery('');
      setActiveTab('combo');
    }
  }, [isOpen]);

  // Scroll tracking untuk auto-highlight category pills
  useEffect(() => {
    if (isSearching) return;
    const container = scrollContainerRef.current;
    if (!container) return;

    const handleScroll = () => {
      const scrollTop = container.scrollTop + 220;
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
    setQuery(''); // bersihkan pencarian saat klik tab
    const el = sectionsRef.current[tabId];
    const container = scrollContainerRef.current;
    if (el && container) {
      const offset = 200;
      container.scrollTo({
        top: el.offsetTop - offset,
        behavior: 'smooth'
      });
    }
  };

  const handleSelectProduct = (product: Product) => {
    if (product.badge === 'sold-out') return;
    onProductSelect(product);
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          className="fixed inset-0 z-[80] bg-[#FFFDF9]"
        >
          {/* ═══════════════════════════════════════════════════════════════
              HEADER: Search Input on the same row as Back Button
              ═══════════════════════════════════════════════════════════════ */}
          <div className="sticky top-0 z-50 bg-[#FFFDF9] border-b border-[#EADFC9]/40 shadow-[0_2px_12px_rgba(148,111,72,0.03)] pt-safe">
            <div className="flex items-center gap-3 px-4 py-3">
              <button
                onClick={onClose}
                className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-[#FAF6EE] transition-colors touch-target shrink-0"
                aria-label="Kembali"
              >
                <ArrowLeft className="w-5 h-5 text-[#54391C]" />
              </button>

              <div className="relative flex-1">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8C7864]" />
                <input
                  ref={inputRef}
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Cari menu favorit kamu..."
                  className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-[#EADFC9]/50
                    bg-[#FAF6EE]/60 text-sm text-[#2A1A0F] placeholder:text-[#A69F94]
                    focus:outline-none focus:ring-2 focus:ring-[#946F48]/20 focus:border-[#946F48]/40
                    transition-all font-medium"
                />
                {query.length > 0 && (
                  <button
                    onClick={() => setQuery('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2
                      w-5 h-5 rounded-full bg-[#EADFC9]/60
                      flex items-center justify-center hover:bg-[#EADFC9] transition-colors"
                  >
                    <X className="w-3 h-3 text-[#8C7864]" />
                  </button>
                )}
              </div>
            </div>

            {/* Sticky Category Pills (hanya tampil saat tidak searching) */}
            {!isSearching && (
              <div
                ref={tabsRef}
                className="flex gap-2 px-4 pb-3 overflow-x-auto scrollbar-hide"
              >
                {categoryTabs.map((tab) => {
                  const isActive = activeTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      data-tab-id={tab.id}
                      onClick={() => handleTabClick(tab.id)}
                      className={`shrink-0 px-4 py-2 rounded-full text-[11px] font-black tracking-wide transition-all duration-300 relative whitespace-nowrap ${
                        isActive ? 'text-white' : 'text-[#745432] bg-[#FAF6EE] hover:bg-[#F5EBE0]/80'
                      }`}
                    >
                      {isActive && (
                        <motion.div
                          layoutId="menuActiveTab"
                          className="absolute inset-0 bg-[#946F48] rounded-full shadow-md shadow-[#946F48]/15"
                          transition={{ type: 'spring', stiffness: 420, damping: 28 }}
                        />
                      )}
                      <span className="relative z-10">{tab.name}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* ═══════════════════════════════════════════════════════════════
              KONTEN: Menu Penuh ATAU Hasil Pencarian
              ═══════════════════════════════════════════════════════════════ */}
          <div
            ref={scrollContainerRef}
            className="overflow-y-auto pb-28"
            style={{ height: 'calc(100dvh - 1px)' }}
          >
            {isSearching ? (
              /* ─── Mode Pencarian ─── */
              <div className="px-4 pt-4">
                {searchResults.length > 0 ? (
                  <>
                    <p className="text-[11px] text-[#8C7864] font-medium mb-3">
                      {searchResults.length} hasil untuk &ldquo;{query}&rdquo;
                    </p>
                    <div className="grid grid-cols-2 gap-3">
                      {searchResults.map((product, i) => (
                        <motion.div
                          key={product.id}
                          initial={{ opacity: 0, y: 12 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: i * 0.04 }}
                        >
                          <MenuProductCard product={product} onClick={handleSelectProduct} />
                        </motion.div>
                      ))}
                    </div>
                  </>
                ) : (
                  <div className="flex flex-col items-center justify-center py-20 text-center">
                    <div className="w-16 h-16 rounded-full bg-[#FAF6EE] flex items-center justify-center mb-4 border border-[#EADFC9]/30">
                      <Search className="w-7 h-7 text-[#8C7864]" />
                    </div>
                    <p className="text-sm font-bold text-[#2A1A0F]">Tidak ditemukan</p>
                    <p className="text-xs text-[#8C7864] mt-1">
                      Coba kata kunci lain untuk &ldquo;{query}&rdquo;
                    </p>

                    {/* Saran pencarian cepat */}
                    <div className="flex flex-wrap gap-2 mt-6 justify-center">
                      {['Signature', 'Biscoff', 'Croissant', 'Hidden Menu', 'Seasonal'].map((tag) => (
                        <button
                          key={tag}
                          onClick={() => setQuery(tag)}
                          className="px-3.5 py-1.5 rounded-full bg-[#FAF6EE] border border-[#EADFC9]/40
                            text-[10px] font-bold text-[#946F48] hover:bg-[#F5EBE0] transition-colors"
                        >
                          {tag}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              /* ─── Mode Menu Penuh (Browsing) ─── */
              <div className="px-4 pt-4 space-y-8">

                {/* Paket Combo Section */}
                <div ref={el => { sectionsRef.current['combo'] = el; }} id="menu-section-combo">
                  <div className="flex items-center gap-2 mb-4">
                    <h3 className="font-serif font-black text-base text-[#2A1A0F] tracking-tight whitespace-nowrap">
                      Paket Combo
                    </h3>
                    <div className="flex-1 h-px bg-[#EADFC9]/35" />
                  </div>

                  <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
                    {comboProducts.map((p) => {
                      const isSoldOut = p.badge === 'sold-out';
                      return (
                        <div
                          key={p.id}
                          onClick={() => handleSelectProduct(p)}
                          className={`w-[140px] shrink-0 bg-white border border-[#EADFC9]/40 rounded-2xl p-2.5 group transition-all duration-300 ${
                            isSoldOut 
                              ? 'opacity-60 cursor-not-allowed' 
                              : 'hover:border-[#D4AF37]/35 hover:shadow-[0_8px_20px_rgba(148,111,72,0.04)] hover:-translate-y-0.5 cursor-pointer'
                          }`}
                        >
                          {p.image && (
                            <div className="relative w-full aspect-square rounded-xl overflow-hidden bg-[#FAF6EE] mb-2 border border-[#EADFC9]/20">
                              <Image
                                src={p.image}
                                alt={p.name}
                                fill
                                sizes="120px"
                                className={`object-cover group-hover:scale-105 transition-transform duration-500 ease-out ${
                                  isSoldOut ? 'grayscale brightness-50' : ''
                                }`}
                              />
                              {isSoldOut ? (
                                <div className="absolute inset-0 bg-black/40 flex items-center justify-center z-20">
                                  <span className="bg-black/80 text-white font-extrabold text-[8px] px-2 py-0.5 rounded-md tracking-wider uppercase">
                                    Habis
                                  </span>
                                </div>
                              ) : (
                                <>
                                  <span className="absolute top-1.5 right-1.5 z-10 px-1.5 py-0.5 rounded-md bg-white/90 backdrop-blur-sm text-[#D4AF37] text-[7px] font-bold shadow-sm flex items-center gap-0.5">
                                    <Star className="w-2.5 h-2.5 fill-[#D4AF37] stroke-none" /> 4.9
                                  </span>
                                  <span className="absolute bottom-1.5 left-1.5 z-10 px-1.5 py-0.5 rounded-md bg-[#946F48] text-white text-[7px] font-extrabold shadow-sm uppercase tracking-wider flex items-center gap-0.5">
                                    Combo
                                  </span>
                                </>
                              )}
                            </div>
                          )}
                          <p className="font-serif font-black text-[11px] text-[#2A1A0F] line-clamp-1 group-hover:text-[#946F48] transition-colors">
                            {p.name}
                          </p>
                          <p className="font-serif font-extrabold text-[11px] text-[#B48A5E] mt-1">
                            {formatRupiah(p.price)}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Promo & Best Seller Section */}
                <div ref={el => { sectionsRef.current['promo'] = el; }} id="menu-section-promo">
                  <div className="flex items-center gap-2 mb-4">
                    <h3 className="font-serif font-black text-base text-[#2A1A0F] tracking-tight whitespace-nowrap">
                      Promo & Best Seller
                    </h3>
                    <div className="flex-1 h-px bg-[#EADFC9]/35" />
                  </div>

                  <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
                    {spesialProducts.map((p) => {
                      const isSoldOut = p.badge === 'sold-out';
                      return (
                        <div
                          key={p.id}
                          onClick={() => handleSelectProduct(p)}
                          className={`w-[140px] shrink-0 bg-white border border-[#EADFC9]/40 rounded-2xl p-2.5 group transition-all duration-300 ${
                            isSoldOut 
                              ? 'opacity-60 cursor-not-allowed' 
                              : 'hover:border-[#D4AF37]/35 hover:shadow-[0_8px_20px_rgba(148,111,72,0.04)] hover:-translate-y-0.5 cursor-pointer'
                          }`}
                        >
                          {p.image && (
                            <div className="relative w-full aspect-square rounded-xl overflow-hidden bg-[#FAF6EE] mb-2 border border-[#EADFC9]/20">
                              <Image
                                src={p.image}
                                alt={p.name}
                                fill
                                sizes="120px"
                                className={`object-cover group-hover:scale-105 transition-transform duration-500 ease-out ${
                                  isSoldOut ? 'grayscale brightness-50' : ''
                                }`}
                              />
                              {isSoldOut ? (
                                <div className="absolute inset-0 bg-black/40 flex items-center justify-center z-20">
                                  <span className="bg-black/80 text-white font-extrabold text-[8px] px-2 py-0.5 rounded-md tracking-wider uppercase">
                                    Habis
                                  </span>
                                </div>
                              ) : (
                                <>
                                  <span className="absolute top-1.5 right-1.5 z-10 px-1.5 py-0.5 rounded-md bg-white/90 backdrop-blur-sm text-[#D4AF37] text-[7px] font-bold shadow-sm flex items-center gap-0.5">
                                    <Star className="w-2.5 h-2.5 fill-[#D4AF37] stroke-none" /> 4.9
                                  </span>
                                  <span className="absolute bottom-1.5 left-1.5 z-10 px-1.5 py-0.5 rounded-md bg-[#946F48] text-white text-[7px] font-extrabold shadow-sm uppercase tracking-wider flex items-center gap-0.5">
                                    <Flame className="w-2.5 h-2.5 text-[#D4AF37] fill-[#D4AF37]" /> Best
                                  </span>
                                </>
                              )}
                            </div>
                          )}
                          <p className="font-serif font-black text-[11px] text-[#2A1A0F] line-clamp-1 group-hover:text-[#946F48] transition-colors">
                            {p.name}
                          </p>
                          <p className="font-serif font-extrabold text-[11px] text-[#B48A5E] mt-1">
                            {formatRupiah(p.price)}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Baru! Section */}
                <div ref={el => { sectionsRef.current['new'] = el; }} id="menu-section-new">
                  <div className="flex items-center gap-2 mb-4">
                    <h3 className="font-serif font-black text-base text-[#2A1A0F] tracking-tight whitespace-nowrap">
                      Baru!
                    </h3>
                    <div className="flex-1 h-px bg-[#EADFC9]/35" />
                  </div>

                  <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
                    {baruProducts.map((p) => {
                      const isSoldOut = p.badge === 'sold-out';
                      return (
                        <div
                          key={p.id}
                          onClick={() => handleSelectProduct(p)}
                          className={`w-[140px] shrink-0 bg-white border border-[#EADFC9]/40 rounded-2xl p-2.5 group transition-all duration-300 ${
                            isSoldOut 
                              ? 'opacity-60 cursor-not-allowed' 
                              : 'hover:border-[#D4AF37]/35 hover:shadow-[0_8px_20px_rgba(148,111,72,0.04)] hover:-translate-y-0.5 cursor-pointer'
                          }`}
                        >
                          {p.image && (
                            <div className="relative w-full aspect-square rounded-xl overflow-hidden bg-[#FAF6EE] mb-2 border border-[#EADFC9]/20">
                              <Image
                                src={p.image}
                                alt={p.name}
                                fill
                                sizes="120px"
                                className={`object-cover group-hover:scale-105 transition-transform duration-500 ease-out ${
                                  isSoldOut ? 'grayscale brightness-50' : ''
                                }`}
                              />
                              {isSoldOut ? (
                                <div className="absolute inset-0 bg-black/40 flex items-center justify-center z-20">
                                  <span className="bg-black/80 text-white font-extrabold text-[8px] px-2 py-0.5 rounded-md tracking-wider uppercase">
                                    Habis
                                  </span>
                                </div>
                              ) : (
                                <>
                                  <span className="absolute top-1.5 right-1.5 z-10 px-1.5 py-0.5 rounded-md bg-white/90 backdrop-blur-sm text-[#D4AF37] text-[7px] font-bold shadow-sm flex items-center gap-0.5">
                                    <Star className="w-2.5 h-2.5 fill-[#D4AF37] stroke-none" /> 4.8
                                  </span>
                                  <span className="absolute bottom-1.5 left-1.5 z-10 px-1.5 py-0.5 rounded-md bg-[#FAF6EE] text-[#946F48] border border-[#EADFC9]/30 text-[7px] font-extrabold shadow-sm uppercase tracking-wider flex items-center gap-0.5">
                                    <Sparkles className="w-2.5 h-2.5 text-[#D4AF37]" /> New
                                  </span>
                                </>
                              )}
                            </div>
                          )}
                          <p className="font-serif font-black text-[11px] text-[#2A1A0F] line-clamp-1 group-hover:text-[#946F48] transition-colors">
                            {p.name}
                          </p>
                          <p className="font-serif font-extrabold text-[11px] text-[#B48A5E] mt-1">
                            {formatRupiah(p.price)}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Kategori Database: Grid 2-Kolom per Kategori */}
                {categories.filter(cat => cat.id !== 'all').map((cat) => {
                  const filteredProducts = products
                    .filter(p => p.category === cat.id)
                    .sort((a, b) => (a.badge === 'sold-out' ? 1 : 0) - (b.badge === 'sold-out' ? 1 : 0));
                  if (filteredProducts.length === 0) return null;

                  return (
                    <div
                      key={cat.id}
                      ref={el => { sectionsRef.current[cat.id] = el; }}
                      id={`menu-section-${cat.id}`}
                    >
                      <div className="flex items-center gap-2 mb-4">
                        <h3 className="font-serif font-black text-base text-[#2A1A0F] tracking-tight whitespace-nowrap">
                          {cat.name}
                        </h3>
                        <div className="flex-1 h-px bg-[#EADFC9]/35" />
                        <span className="text-[10px] text-[#8C7864] font-bold">{filteredProducts.length} menu</span>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        {filteredProducts.map((product) => (
                          <MenuProductCard
                            key={product.id}
                            product={product}
                            onClick={handleSelectProduct}
                          />
                        ))}
                      </div>
                    </div>
                  );
                })}

                {/* Spacer bawah untuk scroll tracking */}
                <div className="h-8" />
              </div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   KOMPONEN: Kartu Produk Menu
   - Desain terinspirasi Kopi Kenangan & Fore Coffee
   - Palet coklat klasik Arum Seduh
   ═══════════════════════════════════════════════════════════════════════════ */

function MenuProductCard({
  product,
  onClick,
}: {
  product: Product;
  onClick: (product: Product) => void;
}) {
  const isSoldOut = product.badge === 'sold-out';

  const badgeConfig: Record<string, { bg: string; text: string; label: string; icon?: 'flame' | 'sparkle' }> = {
    'best-seller': { bg: 'bg-[#946F48]', text: 'text-white', label: 'Best Seller', icon: 'flame' },
    'new': { bg: 'bg-[#FAF6EE]', text: 'text-[#946F48]', label: 'New', icon: 'sparkle' },
    'sold-out': { bg: 'bg-neutral-400', text: 'text-white', label: 'Habis' },
  };
  const badge = product.badge ? badgeConfig[product.badge] : null;

  return (
    <div
      onClick={() => !isSoldOut && onClick(product)}
      className={`bg-white border border-[#EADFC9]/40 rounded-2xl p-2.5 relative group overflow-hidden flex flex-col justify-between transition-all duration-300 ${
        isSoldOut
          ? 'opacity-60 cursor-not-allowed'
          : 'hover:border-[#D4AF37]/35 hover:shadow-[0_8px_20px_rgba(148,111,72,0.04)] hover:-translate-y-0.5 cursor-pointer'
      }`}
    >
      {/* Gambar Produk */}
      <div>
        {product.image && (
          <div className="relative w-full aspect-square rounded-xl overflow-hidden bg-[#FAF6EE] mb-2 border border-[#EADFC9]/20">
            <Image
              src={product.image}
              alt={product.name}
              fill
              sizes="(max-width: 768px) 45vw, 180px"
              className={`object-cover group-hover:scale-105 transition-transform duration-500 ease-out ${
                isSoldOut ? 'grayscale brightness-50' : ''
              }`}
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = 'none';
              }}
            />

            {/* Rating */}
            <span className="absolute top-1.5 right-1.5 z-10 px-1.5 py-0.5 rounded-md bg-white/90 backdrop-blur-sm text-[#D4AF37] text-[7px] font-bold shadow-sm flex items-center gap-0.5">
              <Star className="w-2.5 h-2.5 fill-[#D4AF37] stroke-none" /> 4.9
            </span>

            {/* Badge */}
            {badge && (
              <span className={`absolute bottom-1.5 left-1.5 z-10 px-1.5 py-0.5 rounded-md ${badge.bg} ${badge.text} text-[7px] font-extrabold shadow-sm uppercase tracking-wider flex items-center gap-0.5 border ${product.badge === 'new' ? 'border-[#EADFC9]/30' : 'border-transparent'}`}>
                {badge.icon === 'flame' && <Flame className="w-2.5 h-2.5 text-[#D4AF37] fill-[#D4AF37]" />}
                {badge.icon === 'sparkle' && <Sparkles className="w-2.5 h-2.5 text-[#D4AF37]" />}
                {badge.label}
              </span>
            )}

            {/* Sold Out Overlay */}
            {isSoldOut && (
              <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                <span className="bg-black/80 text-white font-extrabold text-[8px] px-2 py-0.5 rounded-md tracking-wider uppercase">
                  Habis
                </span>
              </div>
            )}
          </div>
        )}

        {/* Nama & Deskripsi Produk */}
        <div className="space-y-0.5">
          <p className="font-serif font-black text-[11px] text-[#2A1A0F] line-clamp-1 leading-snug group-hover:text-[#946F48] transition-colors">
            {product.name}
          </p>
          {product.description && (
            <p className="text-[9px] text-[#8C7864] line-clamp-2 leading-relaxed">
              {product.description}
            </p>
          )}
        </div>
      </div>

      {/* Harga + Tombol Tambah */}
      <div className="mt-2.5 pt-2 border-t border-[#EADFC9]/25 flex items-center justify-between">
        <span className="font-serif font-black text-[11px] text-[#B48A5E]">
          {formatRupiah(product.price)}
        </span>

        <button
          disabled={isSoldOut}
          onClick={(e) => {
            e.stopPropagation();
            if (!isSoldOut) onClick(product);
          }}
          className={`w-6 h-6 rounded-full flex items-center justify-center transition-all duration-300 ${
            isSoldOut
              ? 'bg-[#EADFC9]/30 text-[#8C7864]'
              : 'bg-[#946F48] text-white hover:bg-[#745432] active:scale-90 shadow-sm'
          }`}
        >
          <span className="text-xs font-bold leading-none">+</span>
        </button>
      </div>
    </div>
  );
}
