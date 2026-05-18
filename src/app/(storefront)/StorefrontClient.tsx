'use client';

import { useState, useMemo, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Hero } from '@/components/storefront/Hero';
import { CategoryTabs } from '@/components/storefront/CategoryTabs';
import { ProductGrid } from '@/components/storefront/ProductGrid';
import { ProductModal } from '@/components/storefront/ProductModal';
import { SearchOverlay } from '@/components/storefront/SearchOverlay';
import { PointsWidget } from '@/components/storefront/PointsWidget';
import { useToast } from '@/components/ui/Toast';
import { useStorefrontContext } from './layout';
import type { Product, Category } from '@/types';
import Image from 'next/image';
import { formatRupiah } from '@/lib/utils';

export default function StorefrontClient({ 
  categories, 
  products,
  banners
}: { 
  categories: Category[]; 
  products: Product[];
  banners: any[];
}) {
  const { data: session, status } = useSession();
  const userName = session?.user?.name || 'Guest';
  const router = useRouter();
  const { showToast } = useToast();

  const [activeCategory, setActiveCategory] = useState('all');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { searchOpen, setSearchOpen, openQR } = useStorefrontContext();

  // Location Selector branch state
  const [selectedBranch, setSelectedBranch] = useState({
    name: 'Suroyo Probolinggo',
    address: 'Suroyo Probolinggo, Jl. Suroyo No.16, Tisnonegaran, Kec...',
  });
  const [isBranchDropdownOpen, setIsBranchDropdownOpen] = useState(false);

  const branches = [
    { name: 'Suroyo Probolinggo', address: 'Suroyo Probolinggo, Jl. Suroyo No.16, Tisnonegaran, Kec. Kanigaran, Kota Probolinggo' },
    { name: 'Matchaboy Wamena', address: 'Matchaboy Wamena, Jl. Yos Sudarso No. 8, Wamena, Papua' },
    { name: 'Arus Coffee HQ', address: 'Arus Coffee HQ, Jl. Pemuda No. 45, Jakarta Selatan' },
  ];

  // Mobile Aspect Slider State
  const [currentSlide, setCurrentSlide] = useState(0);
  const displayBanners = useMemo(() => {
    return banners.length > 0 ? banners : [
      { id: 1, image: '/hero/hero-1.jpg', alt: 'Kopi Gratis', headline: 'Ajak Teman Bisa Dapat Kopi Gratis', subheadline: 'Buy 1 Get 1' },
      { id: 2, image: '/hero/hero-2.jpg', alt: 'Buy 1 Get 1', headline: 'Nikmati Promo Spesial Hari Ini', subheadline: 'Buy 1 Get 1' },
    ];
  }, [banners]);

  useEffect(() => {
    if (displayBanners.length <= 1) return;
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % displayBanners.length);
    }, 4500);
    return () => clearInterval(timer);
  }, [displayBanners]);

  const hasBundles = useMemo(() => products.some(p => p.modifiers?.isBundle === true), [products]);

  const displayCategories = useMemo(() => {
    if (!hasBundles) return categories;
    const list = [...categories];
    // Insert 'bundle' category tab right after 'All' at index 1
    list.splice(1, 0, { id: 'bundle', name: 'Combo Hemat', slug: 'bundle' });
    return list;
  }, [categories, hasBundles]);

  // Filter Spesial Hari Ini
  const spesialProducts = useMemo(() => {
    const list = products.filter(p => p.badge === 'best-seller');
    return list.length > 0 ? list : products.slice(0, 4);
  }, [products]);

  // Filter Baru
  const baruProducts = useMemo(() => {
    const list = products.filter(p => p.badge === 'new');
    return list.length > 0 ? list : products.slice(1, 3);
  }, [products]);

  // Filter Makanan (Roti/Croissant/Donut/Food keywords)
  const makananProducts = useMemo(() => {
    const foodKeywords = ['roti', 'croissant', 'donut', 'cake', 'pastry', 'sweet', 'makanan', 'bread', 'bun', 'pie', 'chocolate', 'keju', 'susu'];
    const list = products.filter(p => {
      const nameLower = p.name.toLowerCase();
      const descLower = p.description.toLowerCase();
      const catLower = p.category.toLowerCase();
      return foodKeywords.some(kw => nameLower.includes(kw) || descLower.includes(kw) || catLower.includes(kw));
    });
    return list.length > 0 ? list : products.slice(2, 8);
  }, [products]);

  const handleProductClick = (product: Product) => {
    if (product.badge === 'sold-out') return;
    setSelectedProduct(product);
    setIsModalOpen(true);
  };

  const handleSearchSelect = (product: Product) => {
    if (product.badge === 'sold-out') return;
    setSelectedProduct(product);
    setIsModalOpen(true);
  };

  return (
    <>
      {/* ───────────────────────────────────────────────────────────────────────
          1. DESKTOP VIEW LAYOUT (Preserves original header/banner structure)
          ─────────────────────────────────────────────────────────────────────── */}
      <div className="hidden md:block">
        {/* Hero Section */}
        <Hero banners={banners} />

        {/* Points Progress Widget (only for logged-in users) */}
        <PointsWidget />

        {/* Category Navigation (Sticky) */}
        <CategoryTabs
          categories={displayCategories}
          activeCategory={activeCategory}
          onCategoryChange={setActiveCategory}
        />

        {/* Menu Section */}
        <section
          id="menu-section"
          className="px-4 sm:px-6 lg:px-8 py-6 pb-32 max-w-7xl mx-auto"
        >
          {/* Highlighted Bundle Section at the top when 'all' is active */}
          {activeCategory === 'all' && hasBundles && (
            <div className="mb-8 bg-gradient-to-br from-amber-50/20 via-brand-50/10 to-transparent p-5 rounded-3xl border border-brand-100/30">
              <div className="mb-4">
                <span className="px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-700 text-[10px] font-bold uppercase tracking-wider">Spesial</span>
                <h3 className="font-heading font-bold text-lg text-foreground mt-1 flex items-center gap-1.5">
                  <span>📦</span> Paket Combo Hemat
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">Patungan lebih hemat, nikmat dinikmati bersama teman atau keluarga</p>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {products.filter(p => p.modifiers?.isBundle === true).map((product) => (
                  <div 
                    key={product.id}
                    onClick={() => handleProductClick(product)}
                    className="bg-white rounded-2xl p-3.5 border border-brand-100/40 shadow-sm hover:shadow-md transition-all active:scale-[0.98] cursor-pointer flex gap-3.5 group relative overflow-hidden"
                  >
                    <div className="absolute top-2.5 right-2.5 z-10 px-2 py-0.5 rounded-full bg-amber-500 text-white text-[9px] font-extrabold shadow-sm">
                      Hemat
                    </div>
                    {product.image && (
                      <div className="relative w-20 h-20 rounded-xl overflow-hidden bg-brand-50 shrink-0">
                        <Image
                          src={product.image}
                          alt={product.name}
                          fill
                          sizes="80px"
                          className="object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      </div>
                    )}
                    <div className="flex-grow min-w-0 flex flex-col justify-between py-0.5">
                      <div>
                        <h4 className="font-bold text-[14px] text-foreground leading-tight group-hover:text-brand-700 transition-colors line-clamp-1">{product.name}</h4>
                        <p className="text-[11px] text-muted-foreground mt-1 line-clamp-2 leading-tight">{product.description}</p>
                      </div>
                      <p className="font-black text-sm text-[#B48A5E] leading-none mt-2">{formatRupiah(product.price)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="mb-5">
            <h2 className="font-heading font-bold text-2xl text-foreground">
              Our Menu
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              Pilih dan nikmati matcha favoritmu
            </p>
          </div>

          <ProductGrid
            products={products}
            activeCategory={activeCategory}
            onProductClick={handleProductClick}
          />
        </section>
      </div>

      {/* ───────────────────────────────────────────────────────────────────────
          2. MOBILE VIEW LAYOUT (Redesigned matching the provided screenshot)
          ─────────────────────────────────────────────────────────────────────── */}
      <div className={`block md:hidden bg-[#FFFBF5] min-h-screen ${status === 'unauthenticated' ? 'pb-36' : 'pb-24'}`}>
        
        {/* Mobile Header (Greeting, Location, Services) */}
        <div className="bg-gradient-to-b from-[#F2F7F2] to-[#FFFBF5] px-4 pt-6 pb-4 border-b border-brand-100/10">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-[10px] text-muted-foreground font-semibold tracking-wider">Hai,</p>
              <h2 className="font-heading text-lg font-black text-foreground -mt-1 flex items-center gap-1">
                {userName} <span className="text-sm">👋</span>
              </h2>
            </div>
            {/* Soft decorative visual element */}
            <div className="w-10 h-10 rounded-full bg-brand-700/5 flex items-center justify-center border border-brand-700/5">
              <span className="text-lg">🍵</span>
            </div>
          </div>

          {/* Location & QR Row */}
          <div className="flex gap-2">
            {/* Address Box */}
            <div 
              onClick={() => setIsBranchDropdownOpen(!isBranchDropdownOpen)}
              className="flex-1 bg-white border border-brand-100/50 shadow-[0_2px_8px_rgba(0,0,0,0.02)] rounded-2xl px-3.5 py-2.5 flex items-center justify-between cursor-pointer active:scale-[0.99] transition-all relative z-30"
            >
              <div className="flex items-start gap-2.5 min-w-0">
                <span className="text-base mt-0.5 shrink-0">📍</span>
                <div className="min-w-0">
                  <p className="text-[12px] font-black text-foreground flex items-center gap-1">
                    {selectedBranch.name}
                    <span className="text-[8px] text-brand-600">▼</span>
                  </p>
                  <p className="text-[9px] text-muted-foreground truncate leading-tight mt-0.5">
                    {selectedBranch.address}
                  </p>
                </div>
              </div>
            </div>

            {/* Red QR Scanner */}
            <button 
              onClick={openQR}
              className="w-11 h-11 bg-white border border-red-200 rounded-2xl flex items-center justify-center shadow-[0_2px_8px_rgba(0,0,0,0.02)] text-red-600 hover:bg-red-50 hover:border-red-300 transition-colors shrink-0 active:scale-95"
              aria-label="QR Scan"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <rect x="2" y="2" width="8" height="8" rx="1.5" />
                <rect x="14" y="2" width="8" height="8" rx="1.5" />
                <rect x="2" y="14" width="8" height="8" rx="1.5" />
                <rect x="14" y="14" width="8" height="8" rx="1.5" />
                <path d="M6 6h0M18 6h0M6 18h0M18 18h0" strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} />
              </svg>
            </button>
          </div>

          {/* Branch Dropdown Options */}
          {isBranchDropdownOpen && (
            <>
              <div className="fixed inset-0 z-20 bg-black/10" onClick={() => setIsBranchDropdownOpen(false)} />
              <div className="absolute left-4 right-4 mt-1 bg-white border border-brand-100 rounded-2xl shadow-xl z-30 p-2 space-y-1 animate-in fade-in slide-in-from-top-2 duration-150">
                <p className="text-[9px] font-bold text-muted-foreground px-3 py-1 uppercase tracking-wider">Pilih Cabang MatchaBoy</p>
                {branches.map((b) => (
                  <button
                    key={b.name}
                    onClick={() => {
                      setSelectedBranch(b);
                      setIsBranchDropdownOpen(false);
                    }}
                    className={`w-full text-left px-3 py-2 rounded-xl text-[11px] transition-colors flex flex-col gap-0.5
                      ${selectedBranch.name === b.name ? 'bg-brand-50 text-brand-800 font-bold' : 'hover:bg-gray-50 text-foreground'}`}
                  >
                    <span>{b.name}</span>
                    <span className="text-[9px] text-muted-foreground truncate font-normal">{b.address}</span>
                  </button>
                ))}
              </div>
            </>
          )}

          {/* Active Service Indicators */}
          <div className="flex items-center gap-3 mt-3 text-[10px] font-bold text-muted-foreground">
            <span className="text-gray-400">Melayani</span>
            <div className="flex items-center gap-1 bg-[#E8F5E9] text-[#2E7D32] px-2.5 py-0.5 rounded-full border border-green-200/40">
              <span className="text-[8px]">✔</span> Delivery
            </div>
            <div className="flex items-center gap-1 bg-[#E8F5E9] text-[#2E7D32] px-2.5 py-0.5 rounded-full border border-green-200/40">
              <span className="text-[8px]">✔</span> Pickup
            </div>
          </div>
        </div>

        {/* Aspect-perfect Banner Slider (Landscape Mobile Version) */}
        <div className="relative w-full aspect-[2.1/1] overflow-hidden rounded-b-[2rem] bg-brand-700/5 shadow-sm">
          <Image
            src={displayBanners[currentSlide].image}
            alt={displayBanners[currentSlide].alt}
            fill
            className="object-cover"
            priority
            onError={(e) => {
              // fallback if local images aren't present
              (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1536256263959-770b48d82b0a?auto=format&fit=crop&q=80&w=1200';
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />

          {/* Top-Left Heart icon button */}
          <button 
            onClick={() => showToast('Disimpan ke Favorit!', 'success')}
            className="absolute top-3.5 left-3.5 w-8 h-8 rounded-full bg-white/25 backdrop-blur-md flex items-center justify-center text-white hover:bg-white/40 transition-all active:scale-90"
            aria-label="Favorites"
          >
            <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
            </svg>
          </button>

          {/* Top-Right Ticket/Gift icon button */}
          <button 
            onClick={() => router.push('/profile?section=loyalty&tab=vouchers')}
            className="absolute top-3.5 right-3.5 w-8 h-8 rounded-full bg-white/25 backdrop-blur-md flex items-center justify-center text-white hover:bg-white/40 transition-all active:scale-90"
            aria-label="Vouchers"
          >
            <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
            </svg>
          </button>

          {/* Bottom dot paginators */}
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5 z-10">
            {displayBanners.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setCurrentSlide(idx)}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  idx === currentSlide ? 'w-4 bg-white' : 'w-1.5 bg-white/50'
                }`}
                aria-label={`Go to slide ${idx + 1}`}
              />
            ))}
          </div>
        </div>

        {/* 1. Spesial Hari Ini Row */}
        <section className="px-4 py-5 bg-white">
          <div className="flex items-center justify-between mb-3.5">
            <h3 className="font-heading font-black text-[15px] text-foreground flex items-center gap-1">
              Spesial Hari Ini
            </h3>
            <span className="text-[11px] text-brand-600 font-bold flex items-center gap-0.5 cursor-pointer">
              Lihat Semua <span className="text-[8px]">▶</span>
            </span>
          </div>

          <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-none -mx-4 px-4">
            {spesialProducts.map((p) => (
              <div 
                key={p.id}
                onClick={() => handleProductClick(p)}
                className="w-[130px] shrink-0 bg-[#FAFAF9] rounded-2xl p-2.5 border border-brand-100/30 flex flex-col justify-between active:scale-[0.98] transition-all cursor-pointer shadow-sm relative group overflow-hidden"
              >
                {p.image && (
                  <div className="relative w-full aspect-square rounded-xl overflow-hidden bg-brand-50 mb-2">
                    <Image
                      src={p.image}
                      alt={p.name}
                      fill
                      sizes="120px"
                      className="object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <span className="absolute bottom-1 left-1.5 z-10 px-1.5 py-0.5 rounded bg-green-600 text-white text-[8px] font-black shadow-sm uppercase tracking-wide">
                      {p.badge || 'Spesial'}
                    </span>
                  </div>
                )}

                <div className="flex-1 flex flex-col justify-between">
                  <p className="text-[11px] font-black text-foreground line-clamp-1 leading-snug">
                    {p.name}
                  </p>
                  <div className="mt-2 flex items-center">
                    <span className="px-2 py-0.5 rounded-full bg-red-50 border border-red-100 text-[#B02A30] text-[10px] font-black tracking-tight">
                      {formatRupiah(p.price)}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* 2. Diskon & Cashback Scrolling Mini Banners */}
        <section className="px-4 py-4 bg-white border-t border-brand-100/5">
          <div className="flex items-center gap-1.5 mb-3.5">
            <span className="text-base">🉐</span>
            <h3 className="font-heading font-black text-[14px] text-foreground">
              Diskon & Cashback
            </h3>
          </div>

          <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-none -mx-4 px-4">
            {/* Promo Card: blu */}
            <div className="w-[170px] shrink-0 bg-white border border-[#00B4D8]/20 shadow-sm rounded-2xl p-3 flex items-center justify-between relative overflow-hidden">
              <div className="absolute -top-6 -right-6 w-12 h-12 bg-[#00B4D8]/5 rounded-full" />
              <div className="min-w-0 pr-2">
                <p className="text-[12px] font-black text-[#0077B6] leading-none">40% OFF</p>
                <p className="text-[8px] text-muted-foreground mt-1.5 leading-snug font-semibold">blu by BCA Digital</p>
              </div>
              <div className="w-8 h-8 rounded-full bg-[#E0F7FA] border border-[#00B4D8]/30 flex items-center justify-center shrink-0 shadow-inner">
                <span className="text-[8px] font-black text-[#0096C7]">blu</span>
              </div>
            </div>

            {/* Promo Card: OVO */}
            <div className="w-[170px] shrink-0 bg-white border border-[#4C2A86]/20 shadow-sm rounded-2xl p-3 flex items-center justify-between relative overflow-hidden">
              <div className="absolute -top-6 -right-6 w-12 h-12 bg-[#4C2A86]/5 rounded-full" />
              <div className="min-w-0 pr-2">
                <p className="text-[12px] font-black text-[#4C2A86] leading-none">60% OFF</p>
                <p className="text-[8px] text-muted-foreground mt-1.5 leading-snug font-semibold">Bayar pakai OVO</p>
              </div>
              <div className="w-8 h-8 rounded-full bg-[#F3E5F5] border border-[#7B1FA2]/30 flex items-center justify-center shrink-0 shadow-inner">
                <span className="text-[8px] font-black text-[#4A148C]">OVO</span>
              </div>
            </div>

            {/* Promo Card: ShopeePay */}
            <div className="w-[170px] shrink-0 bg-white border border-[#EE4D2D]/20 shadow-sm rounded-2xl p-3 flex items-center justify-between relative overflow-hidden">
              <div className="absolute -top-6 -right-6 w-12 h-12 bg-[#EE4D2D]/5 rounded-full" />
              <div className="min-w-0 pr-2">
                <p className="text-[12px] font-black text-[#D35400] leading-none">50% OFF</p>
                <p className="text-[8px] text-muted-foreground mt-1.5 leading-snug font-semibold">ShopeePay Cashback</p>
              </div>
              <div className="w-8 h-8 rounded-full bg-[#FBE9E7] border border-[#FF5722]/30 flex items-center justify-center shrink-0 shadow-inner">
                <span className="text-[8px] font-black text-[#E64A19]">SPay</span>
              </div>
            </div>
          </div>
        </section>

        {/* 3. Baru! Section Row */}
        <section className="px-4 py-5 bg-white border-t border-brand-100/5">
          <div className="flex items-center justify-between mb-3.5">
            <h3 className="font-heading font-black text-[15px] text-foreground flex items-center gap-1">
              Baru!
            </h3>
            <span className="text-[11px] text-brand-600 font-bold flex items-center gap-0.5 cursor-pointer">
              Lihat Semua <span className="text-[8px]">▶</span>
            </span>
          </div>

          <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-none -mx-4 px-4">
            {baruProducts.map((p) => (
              <div 
                key={p.id}
                onClick={() => handleProductClick(p)}
                className="w-[130px] shrink-0 bg-[#FAFAF9] rounded-2xl p-2.5 border border-brand-100/30 flex flex-col justify-between active:scale-[0.98] transition-all cursor-pointer shadow-sm relative group overflow-hidden"
              >
                {p.image && (
                  <div className="relative w-full aspect-square rounded-xl overflow-hidden bg-brand-50 mb-2">
                    <Image
                      src={p.image}
                      alt={p.name}
                      fill
                      sizes="120px"
                      className="object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <span className="absolute bottom-1 left-1.5 z-10 px-2 py-0.5 rounded-full bg-[#E8F5E9] text-[#2E7D32] text-[8px] font-extrabold shadow-sm uppercase tracking-wide">
                      New
                    </span>
                  </div>
                )}

                <div className="flex-grow flex flex-col justify-between">
                  <p className="text-[11px] font-black text-foreground line-clamp-1 leading-snug">
                    {p.name}
                  </p>
                  <p className="font-black text-[11px] text-[#B48A5E] leading-none mt-2">
                    {formatRupiah(p.price)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* 4. Makanan Grid Section (2 Columns) */}
        <section className="px-4 py-5 bg-white border-t border-brand-100/5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-heading font-black text-[15px] text-foreground flex items-center gap-1">
              Makanan
            </h3>
            <span className="text-[11px] text-brand-600 font-bold flex items-center gap-0.5 cursor-pointer">
              Lihat Semua <span className="text-[8px]">▶</span>
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3.5">
            {makananProducts.map((p) => (
              <div 
                key={p.id}
                onClick={() => handleProductClick(p)}
                className="bg-[#FAFAF9] rounded-2xl p-3 border border-brand-100/30 flex flex-col justify-between active:scale-[0.98] transition-all cursor-pointer shadow-sm relative group overflow-hidden"
              >
                {p.image && (
                  <div className="relative w-full aspect-[4/3] rounded-xl overflow-hidden bg-brand-50 mb-2.5">
                    <Image
                      src={p.image}
                      alt={p.name}
                      fill
                      sizes="150px"
                      className="object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  </div>
                )}

                <div className="flex-1 flex flex-col justify-between">
                  <p className="text-[12px] font-black text-foreground line-clamp-1 leading-snug">
                    {p.name}
                  </p>
                  <p className="font-black text-[11px] text-gray-700 leading-none mt-2">
                    {formatRupiah(p.price)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* 5. Emerald CS Whatsapp & Ditjen Advisory Footer */}
        <section className="px-4 py-6 bg-white border-t border-brand-100/5 space-y-4 text-center">
          {/* WhatsApp Curhat Button */}
          <a 
            href="https://wa.me/628170756865"
            target="_blank"
            rel="noopener noreferrer"
            className="w-full py-3 px-4 bg-white border border-[#25D366]/30 rounded-2xl flex items-center justify-center gap-2 hover:bg-[#25D366]/5 transition-colors shadow-sm active:scale-[0.99]"
          >
            <span className="text-lg">💬</span>
            <span className="text-[12px] font-black text-[#128C7E]">
              Curhat ke 6281 7075 6865 (Chat Only)
            </span>
          </a>

          {/* advisory disclaimer */}
          <div className="text-[9px] text-left text-muted-foreground leading-relaxed px-1 space-y-1">
            <p className="font-black text-gray-500">Informasi Kontak Layanan Pengaduan Konsumen</p>
            <p className="text-gray-400">
              Direktorat Jenderal Perlindungan Konsumen dan Tertib Niaga, Kementerian Perdagangan Republik Indonesia, Whatsapp Ditjen PKTN: 0853-1111-1010
            </p>
          </div>
        </section>

        {/* 6. Guest Sticky Footer CTA */}
        {status === 'unauthenticated' && (
          <div className="fixed bottom-[56px] left-0 right-0 z-40 bg-[#FFFBF5]/95 backdrop-blur-md border-t border-brand-700/5 p-3 flex justify-center max-w-7xl mx-auto shadow-[0_-4px_16px_rgba(0,0,0,0.03)] animate-in fade-in slide-in-from-bottom-5 duration-300">
            <button 
              onClick={() => router.push('/login')}
              className="w-full py-3.5 bg-[#B02A30] hover:bg-[#901E23] text-white text-[13px] font-black rounded-2xl shadow-md transition-colors tracking-wide active:scale-[0.98] shadow-red-700/20"
            >
              Daftar atau Masuk
            </button>
          </div>
        )}
      </div>

      {/* ───────────────────────────────────────────────────────────────────────
          3. COMMON OVERLAYS & MODALS
          ─────────────────────────────────────────────────────────────────────── */}
      {/* Product Customization Modal */}
      <ProductModal
        product={selectedProduct}
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
        }}
        allProducts={products}
      />

      {/* Search Overlay */}
      <SearchOverlay
        isOpen={searchOpen}
        onClose={() => setSearchOpen(false)}
        onProductSelect={handleSearchSelect}
        products={products}
        categories={categories}
      />
    </>
  );
}
