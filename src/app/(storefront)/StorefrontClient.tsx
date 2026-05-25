'use client';

import { useState, useMemo, useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import dynamic from 'next/dynamic';
import { useToast } from '@/components/ui/Toast';
import { useStorefrontContext } from './layout';
import type { Product, Category } from '@/types';
import Image from 'next/image';
import { formatRupiah } from '@/lib/utils';
import { motion, useMotionValue, useTransform, animate, AnimatePresence } from 'framer-motion';
import { Star, Sparkles, Flame, MessageCircle, Info, ChevronRight, ShoppingBag, Clock } from 'lucide-react';

// Lazy-load heavy modal components (only shown on user interaction)
const ProductModal = dynamic(() => import('@/components/storefront/ProductModal').then(m => ({ default: m.ProductModal })), { ssr: false });
const SearchOverlay = dynamic(() => import('@/components/storefront/SearchOverlay').then(m => ({ default: m.SearchOverlay })), { ssr: false });
const EasterEggOverlay = dynamic(() => import('@/components/storefront/EasterEggOverlay').then(m => ({ default: m.EasterEggOverlay })), { ssr: false });

interface HeroBanner {
  id: string;
  image: string;
  alt: string;
  headline?: string | null;
  subheadline?: string | null;
}

export default function StorefrontClient({ 
  categories, 
  products,
  banners
}: { 
  categories: Category[]; 
  products: Product[];
  banners: HeroBanner[];
}) {
  const { data: session, status } = useSession();
  
  const formatPhone = (phone?: string | null) => {
    if (!phone) return '';
    let cleaned = phone.replace(/[^0-9]/g, '');
    if (cleaned.startsWith('62')) {
      cleaned = '0' + cleaned.substring(2);
    }
    if (cleaned.length > 7) {
      return `${cleaned.substring(0, 4)}-${cleaned.substring(4, 8)}-${cleaned.substring(8)}`;
    }
    return cleaned;
  };

  const userName = useMemo(() => {
    if (status !== 'authenticated' || !session?.user) return 'Guest';
    if (session.user.name && session.user.name.trim() !== '') return session.user.name;
    if ((session.user as { phone?: string | null }).phone) return formatPhone((session.user as { phone?: string | null }).phone);
    if (session.user.email) return session.user.email.split('@')[0];
    return 'Matcha Lover';
  }, [session, status]);

  const { showToast } = useToast();

  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { searchOpen, setSearchOpen, openLogin } = useStorefrontContext();

  const [isNight, setIsNight] = useState(false);
  const dragY = useMotionValue(0);
  const stretchHeight = useTransform(dragY, [0, 150], ["124px", "320px"]);

  // Custom drag motion value
  const [easterEggConfig, setEasterEggConfig] = useState<{ enabled: boolean; discount: number; quota: number; hasClaimed: boolean } | null>(null);
  const [isEasterEggExpanded, setIsEasterEggExpanded] = useState(false);
  const [isClaiming, setIsClaiming] = useState(false);
  const loyaltyFetchedRef = useRef(false);

  useEffect(() => {
    const hour = new Date().getHours();
    setIsNight(hour >= 18 || hour < 6);
  }, []);

  useEffect(() => {
    if (status === 'authenticated' && !loyaltyFetchedRef.current) {
      loyaltyFetchedRef.current = true;
      fetch('/api/user/loyalty')
        .then(res => res.json())
        .then(data => {
          if (data?.easterEgg) {
            setEasterEggConfig(data.easterEgg);
          }
        })
        .catch(err => console.error('Error fetching loyalty data:', err));
    }
  }, [status]);

  const handleClaimEasterEgg = async () => {
    setIsClaiming(true);
    try {
      const res = await fetch('/api/user/loyalty/claim-easter-egg', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showToast(data.message || 'Selamat! Voucher rahasia berhasil diklaim!', 'success');
        setEasterEggConfig(prev => prev ? { ...prev, hasClaimed: true } : null);
      } else {
        showToast(data.error || 'Gagal mengklaim voucher rahasia', 'error');
      }
    } catch (err) {
      console.error('Error claiming easter egg:', err);
      showToast('Terjadi kesalahan koneksi', 'error');
    } finally {
      setIsClaiming(false);
    }
  };

  // Mobile Aspect Slider State
  const [currentSlide, setCurrentSlide] = useState(0);
  const displayBanners = useMemo(() => {
    return banners.length > 0 ? banners : [
      { id: '1', image: '/hero/hero-1.jpg', alt: 'Kopi Gratis', headline: 'Ajak Teman Bisa Dapat Kopi Gratis', subheadline: 'Buy 1 Get 1' },
      { id: '2', image: '/hero/hero-2.jpg', alt: 'Buy 1 Get 1', headline: 'Nikmati Promo Spesial Hari Ini', subheadline: 'Buy 1 Get 1' },
    ];
  }, [banners]);

  useEffect(() => {
    if (displayBanners.length <= 1) return;
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % displayBanners.length);
    }, 4500);
    return () => clearInterval(timer);
  }, [displayBanners]);

  const spesialProducts = useMemo(() => {
    const bestSellers = products.filter(p => p.badge === 'best-seller');
    const bundles = products.filter(p => p.modifiers?.isBundle === true);
    const combined = [...bundles, ...bestSellers];
    const unique = combined.filter((item, index) => combined.findIndex(p => p.id === item.id) === index);
    return unique.length > 0 ? unique : products.slice(0, 4);
  }, [products]);

  const baruProducts = useMemo(() => {
    const list = products.filter(p => p.badge === 'new');
    return list.length > 0 ? list : products.slice(1, 3);
  }, [products]);

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
      <div className={`min-h-screen bg-[#FAF8F5] md:pt-20 relative overflow-hidden transition-all duration-300 ${status === 'unauthenticated' ? 'pb-36 md:pb-28' : 'pb-24'}`}>
        
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(212,235,214,0.35)_0%,_rgba(250,248,245,0)_60%)] pointer-events-none z-0" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom,_rgba(247,238,211,0.25)_0%,_rgba(250,248,245,0)_50%)] pointer-events-none z-0" />
        
        <div className="absolute inset-0 bg-[linear-gradient(rgba(0,0,0,0.01)_1px,_transparent_1px),_linear-gradient(90deg,_rgba(0,0,0,0.01)_1px,_transparent_1px)] bg-[size:32px_32px] pointer-events-none z-0 opacity-40" />

        {/* Background gambar siang/malam — stretch saat di-drag */}
        <motion.div 
          style={{ 
            height: stretchHeight,
            backgroundImage: `url(${isNight ? '/banners/night_header_bg.png' : '/banners/day_header_bg.png'})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            borderBottomLeftRadius: "2.5rem",
            borderBottomRightRadius: "2.5rem",
          }}
          className="md:hidden absolute top-0 left-0 right-0 z-20 border-b shadow-md pointer-events-none select-none overflow-hidden border-sky-100/60"
        />

        {/* Header interaktif yang bisa di-drag */}
        <motion.header 
          initial={{ y: -60, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 90, damping: 14 }}
          whileHover={{ scale: 1.015, y: 2 }}
          whileTap={{ scale: 0.985 }}
          drag="y"
          dragConstraints={{ top: 0, bottom: 150 }}
          dragElastic={0.4}
          onDragEnd={(event, info) => {
            if (info.offset.y > 80 && isNight && easterEggConfig?.enabled && !easterEggConfig?.hasClaimed) {
              setIsEasterEggExpanded(true);
            }
            animate(dragY, 0, { type: "spring", stiffness: 350, damping: 28 });
          }}
          style={{ y: dragY, touchAction: 'pan-y' }}
          className={`md:hidden relative z-30 px-6 py-7 cursor-pointer transition-all duration-300 select-none bg-transparent shadow-none border-transparent ${
            isNight ? 'text-white' : 'text-[#2A1F16]'
          }`}
        >
          <div className="max-w-7xl mx-auto flex items-center justify-between gap-4 relative z-10">
            <div className="space-y-0.5">
              <p className={`text-[10px] font-black uppercase tracking-[0.2em] select-none ${
                isNight ? 'text-yellow-300' : 'text-[#0369A1]'
              }`}>
                {isNight ? 'Selamat Malam 🌃' : 'Selamat Siang ☀️'}
              </p>
              <h1 className="font-serif text-lg md:text-2xl font-black tracking-tight flex items-center gap-1.5">
                Hai, {userName} <span className="text-base md:text-xl animate-pulse">👋</span>
              </h1>
            </div>
            <div className="flex items-center gap-3">
              <div className={`w-11 h-11 rounded-2xl flex items-center justify-center shadow-md hover:scale-105 active:scale-95 transition-all duration-300 ${
                isNight 
                  ? 'bg-white/10 border border-white/20 text-yellow-300' 
                  : 'bg-[#0369A1]/5 border border-[#0369A1]/10 text-[#2E5A44]'
              }`}>
                <span className="text-xl">🍃</span>
              </div>
            </div>
          </div>

          {/* Hint tarik ke bawah */}
          {isNight && easterEggConfig?.enabled && !easterEggConfig?.hasClaimed && (
            <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex flex-col items-center gap-0.5 animate-bounce">
              <span className="text-[8px] font-black uppercase tracking-widest text-yellow-300/80">
                ✦ Tarik untuk Voucher Rahasia ✦
              </span>
            </div>
          )}
        </motion.header>

        {/* Desktop Header Greeting */}
        <div className="hidden md:block max-w-6xl mx-auto px-6 mt-4 mb-6">
          <div className="flex items-center justify-between border-b border-gray-150 pb-6">
            <div className="space-y-1">
              <span className="text-[10px] font-black uppercase text-[#A69F94] tracking-[0.2em] select-none">
                {isNight ? 'Selamat Malam 🌃' : 'Selamat Siang ☀️'}
              </span>
              <h2 className="font-serif text-3xl font-black text-gray-900 tracking-tight">
                Hai, <span className="text-[#2E5A44]">{userName}</span> <span className="text-2xl animate-pulse">👋</span>
              </h2>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex flex-col text-right select-none">
                <span className="text-xs font-black uppercase tracking-widest text-[#2E5A44]">
                  Matchaboy
                </span>
                <span className="text-[10px] font-bold text-[#A69F94] mt-0.5">
                  Artisanal Premium Matcha
                </span>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-white border border-[#EADFC9]/40 flex items-center justify-center shadow-sm text-xl">
                <span>🍃</span>
              </div>
            </div>
          </div>
        </div>

        {/* Hero Banner Slider */}
        <motion.div 
          initial={{ y: 30, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.1, duration: 0.6 }}
          className="max-w-6xl mx-auto px-4 sm:px-6 mt-2 md:mt-6 relative z-10"
        >
          <div className="relative w-full aspect-[2.1/1] md:aspect-[3.6/1] overflow-hidden rounded-[2rem] bg-white shadow-md border border-[#EADFC9]/30 group">
            <Image
              src={displayBanners[currentSlide].image}
              alt={displayBanners[currentSlide].alt}
              fill
              className="object-cover group-hover:scale-[1.02] transition-transform duration-1000 ease-out"
              priority
              unoptimized
              onError={(e) => {
                (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1536256263959-770b48d82b0a?auto=format&fit=crop&q=80&w=1200';
              }}
            />
            
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/25 to-black/5 flex flex-col justify-end p-5 md:p-8">
              <span className="px-2.5 py-0.5 rounded-full bg-[#D4A574] text-white text-[8px] font-black uppercase tracking-widest w-fit shadow-md mb-2">
                Promo Spesial
              </span>
              <h2 className="font-serif text-lg md:text-2xl font-black text-white leading-tight tracking-tight">
                {displayBanners[currentSlide].headline || displayBanners[currentSlide].alt}
              </h2>
              <p className="text-[10px] md:text-[12px] text-neutral-200 mt-1 leading-snug font-semibold max-w-xl">
                {displayBanners[currentSlide].subheadline}
              </p>
            </div>

            <div className="absolute bottom-5 right-5 flex items-center gap-1.5 select-none">
              {displayBanners.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => setCurrentSlide(idx)}
                  className={`h-1.5 rounded-full transition-all duration-500 ease-out ${
                    idx === currentSlide ? 'w-5 bg-[#D4A574]' : 'w-1.5 bg-white/40'
                  }`}
                  aria-label={`Go to slide ${idx + 1}`}
                />
              ))}
            </div>
          </div>
        </motion.div>

        {/* Content Sections */}
        <motion.div 
          initial={{ y: 40, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.7 }}
          className="max-w-6xl mx-auto px-4 sm:px-6 mt-8 space-y-8 relative z-10"
        >
          {/* Spesial Hari Ini */}
          <section className="bg-white rounded-[2rem] border border-gray-100 p-6 shadow-sm">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-serif font-black text-base md:text-lg text-gray-900 tracking-tight flex items-center gap-1.5">
                <Flame className="w-5 h-5 text-amber-500 fill-amber-500/20" /> Spesial Hari Ini
              </h3>
              <span className="text-[10px] md:text-xs text-[#946F48] font-bold flex items-center gap-0.5 cursor-pointer hover:text-[#B48A5E] transition-colors uppercase tracking-wider select-none">
                Semua Menu <ChevronRight className="w-3.5 h-3.5" />
              </span>
            </div>

            <div className="flex gap-4 overflow-x-auto pb-3 scrollbar-hide">
              {spesialProducts.map((p) => (
                <div 
                  key={p.id}
                  onClick={() => handleProductClick(p)}
                  className="w-[145px] md:w-[175px] shrink-0 bg-white/70 backdrop-blur-md border border-[#D4A574]/15 hover:border-[#B48A5E]/40 shadow-[0_8px_30px_rgba(0,0,0,0.025)] hover:shadow-[0_12px_40px_rgba(180,138,94,0.12)] hover:-translate-y-1.5 transition-all duration-300 cursor-pointer rounded-3xl p-3 relative group overflow-hidden"
                >
                  {p.image && (
                    <div className="relative w-full aspect-square rounded-2xl overflow-hidden bg-white mb-2.5 border border-[#EADFC9]/20 shadow-sm">
                      <Image
                        src={p.image}
                        alt={p.name}
                        fill
                        sizes="(max-width: 768px) 120px, 150px"
                        className="object-cover group-hover:scale-105 transition-transform duration-500 ease-out"
                      />
                      <span className="absolute top-1.5 right-1.5 z-10 px-1.5 py-0.5 rounded-lg bg-white/90 backdrop-blur-md text-[#D4A574] text-[8px] font-black shadow-sm flex items-center gap-0.5 leading-none">
                        <Star className="w-3 h-3 fill-[#D4A574] stroke-none" /> 4.9
                      </span>
                    </div>
                  )}

                  <div className="flex-grow flex flex-col justify-between">
                    <p className="font-serif font-bold text-xs text-gray-900 line-clamp-1 leading-snug group-hover:text-[#2E5A44] transition-colors">
                      {p.name}
                    </p>
                    <div className="mt-2 flex items-baseline justify-between">
                      <span className="font-bold text-xs text-[#B48A5E]">
                        {formatRupiah(p.price)}
                      </span>
                      <span className="text-[8px] font-black uppercase text-[#2E5A44] bg-[#E8F5E9] px-1.5 py-0.5 rounded">
                        Combo
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Vouchers & Discounts (Premium Ticket Cuts Layout) */}
          <section className="bg-white rounded-[2rem] border border-gray-100 p-6 shadow-sm">
            <h3 className="font-serif font-black text-base md:text-lg text-gray-900 tracking-tight mb-5 flex items-center gap-1.5">
              <Sparkles className="w-5 h-5 text-[#B48A5E]" /> Diskon & Voucher Belanja
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {/* Ticket 1 */}
              <div className="ticket-card border border-gray-150/70 hover:border-amber-300 shadow-sm hover:shadow-md hover:-translate-y-0.5 rounded-2xl p-4.5 flex items-center justify-between relative overflow-hidden group transition-all duration-300 cursor-pointer">
                <div className="min-w-0 pr-3 flex-1">
                  <span className="text-[8px] font-black text-[#0096C7] bg-cyan-50 border border-cyan-150 px-2 py-0.5 rounded uppercase tracking-wider">blu BCA</span>
                  <p className="text-lg font-serif font-black text-[#0077B6] leading-none mt-2">40% OFF</p>
                  <p className="text-[9px] mt-1 text-gray-400 font-bold uppercase tracking-wider leading-none">BCA Digital Payment</p>
                </div>
                <div className="border-l border-dashed border-gray-150 h-11 mx-2 shrink-0" />
                <div className="w-10 h-10 rounded-xl bg-cyan-50 border border-cyan-100 flex items-center justify-center shrink-0 shadow-inner text-xs font-black text-[#0096C7] group-hover:scale-105 transition-transform">
                  blu
                </div>
              </div>

              {/* Ticket 2 */}
              <div className="ticket-card border border-gray-150/70 hover:border-amber-300 shadow-sm hover:shadow-md hover:-translate-y-0.5 rounded-2xl p-4.5 flex items-center justify-between relative overflow-hidden group transition-all duration-300 cursor-pointer">
                <div className="min-w-0 pr-3 flex-1">
                  <span className="text-[8px] font-black text-[#7B1FA2] bg-purple-50 border border-purple-150 px-2 py-0.5 rounded uppercase tracking-wider">OVO</span>
                  <p className="text-lg font-serif font-black text-[#4C2A86] leading-none mt-2">60% OFF</p>
                  <p className="text-[9px] mt-1 text-gray-400 font-bold uppercase tracking-wider leading-none">Cashback OVO Cash</p>
                </div>
                <div className="border-l border-dashed border-gray-150 h-11 mx-2 shrink-0" />
                <div className="w-10 h-10 rounded-xl bg-purple-50 border border-purple-100 flex items-center justify-center shrink-0 shadow-inner text-xs font-black text-[#7B1FA2] group-hover:scale-105 transition-transform">
                  OVO
                </div>
              </div>

              {/* Ticket 3 */}
              <div className="ticket-card border border-gray-150/70 hover:border-amber-300 shadow-sm hover:shadow-md hover:-translate-y-0.5 rounded-2xl p-4.5 flex items-center justify-between relative overflow-hidden group transition-all duration-300 cursor-pointer">
                <div className="min-w-0 pr-3 flex-1">
                  <span className="text-[8px] font-black text-[#FF5722] bg-orange-50 border border-orange-150 px-2 py-0.5 rounded uppercase tracking-wider">ShopeePay</span>
                  <p className="text-lg font-serif font-black text-[#D35400] leading-none mt-2">50% OFF</p>
                  <p className="text-[9px] mt-1 text-gray-400 font-bold uppercase tracking-wider leading-none">Klaim Shopee Cashback</p>
                </div>
                <div className="border-l border-dashed border-gray-150 h-11 mx-2 shrink-0" />
                <div className="w-10 h-10 rounded-xl bg-orange-50 border border-orange-100 flex items-center justify-center shrink-0 shadow-inner text-xs font-black text-[#FF5722] group-hover:scale-105 transition-transform">
                  SPay
                </div>
              </div>
            </div>
          </section>

          {/* Baru! */}
          <section className="bg-white rounded-[2rem] border border-gray-100 p-6 shadow-sm">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-serif font-black text-base md:text-lg text-gray-900 tracking-tight flex items-center gap-1.5">
                <Sparkles className="w-5 h-5 text-emerald-600" /> Menu Baru Bulan Ini
              </h3>
              <span className="text-[10px] md:text-xs text-[#946F48] font-bold flex items-center gap-0.5 cursor-pointer hover:text-[#B48A5E] transition-colors uppercase tracking-wider select-none">
                Semua Baru <ChevronRight className="w-3.5 h-3.5" />
              </span>
            </div>

            <div className="flex gap-4 overflow-x-auto pb-3 scrollbar-hide">
              {baruProducts.map((p) => (
                <div 
                  key={p.id}
                  onClick={() => handleProductClick(p)}
                  className="w-[145px] md:w-[175px] shrink-0 bg-white/70 backdrop-blur-md border border-[#D4A574]/15 hover:border-[#B48A5E]/40 shadow-[0_8px_30px_rgba(0,0,0,0.025)] hover:shadow-[0_12px_40px_rgba(180,138,94,0.12)] hover:-translate-y-1.5 transition-all duration-300 cursor-pointer rounded-3xl p-3 relative group overflow-hidden"
                >
                  {p.image && (
                    <div className="relative w-full aspect-square rounded-2xl overflow-hidden bg-white mb-2.5 border border-[#EADFC9]/20 shadow-sm">
                      <Image
                        src={p.image}
                        alt={p.name}
                        fill
                        sizes="(max-width: 768px) 120px, 150px"
                        className="object-cover group-hover:scale-105 transition-transform duration-550 ease-out"
                      />
                      <span className="absolute bottom-1.5 left-1.5 z-10 px-2 py-0.5 rounded-full bg-[#E8F5E9] text-[#2E7D32] text-[8px] font-black shadow-sm uppercase tracking-wider flex items-center gap-0.5 leading-none">
                        New
                      </span>
                    </div>
                  )}

                  <div className="flex-grow flex flex-col justify-between">
                    <p className="font-serif font-bold text-xs text-gray-900 line-clamp-1 leading-snug group-hover:text-[#2E5A44] transition-colors">
                      {p.name}
                    </p>
                    <p className="font-bold text-xs text-[#B48A5E] leading-none mt-2">
                      {formatRupiah(p.price)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Makanan */}
          <section className="bg-white rounded-[2rem] border border-gray-100 p-6 shadow-sm">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-serif font-black text-base md:text-lg text-gray-900 tracking-tight flex items-center gap-1.5">
                <ShoppingBag className="w-5 h-5 text-gray-800" /> Cemilan & Roti
              </h3>
              <span className="text-[10px] md:text-xs text-[#946F48] font-bold flex items-center gap-0.5 cursor-pointer hover:text-[#B48A5E] transition-colors uppercase tracking-wider select-none">
                Semua Roti <ChevronRight className="w-3.5 h-3.5" />
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {makananProducts.map((p) => (
                <div 
                  key={p.id}
                  onClick={() => handleProductClick(p)}
                  className="bg-white/80 backdrop-blur-sm border border-[#D4A574]/15 hover:border-[#B48A5E]/45 shadow-[0_6px_20px_rgba(0,0,0,0.015)] hover:shadow-[0_12px_35px_rgba(180,138,94,0.1)] hover:-translate-y-1.5 transition-all duration-300 cursor-pointer rounded-3xl p-3.5 relative group overflow-hidden"
                >
                  {p.image && (
                    <div className="relative w-full aspect-[4/3] rounded-2xl overflow-hidden bg-[#FAF8F5] mb-2.5 border border-[#EADFC9]/30 shadow-sm">
                      <Image
                        src={p.image}
                        alt={p.name}
                        fill
                        sizes="(max-width: 768px) 120px, 150px"
                        className="object-cover group-hover:scale-105 transition-transform duration-500 ease-out"
                      />
                    </div>
                  )}

                  <div className="flex-1 flex flex-col justify-between">
                    <p className="font-serif font-bold text-xs text-gray-900 line-clamp-1 leading-snug group-hover:text-[#2E5A44] transition-colors">
                      {p.name}
                    </p>
                    <p className="font-bold text-xs text-gray-800 leading-none mt-2">
                      {formatRupiah(p.price)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Help Center */}
          <section className="bg-white border border-gray-100 rounded-[2rem] p-6 shadow-sm flex flex-col md:flex-row items-center justify-between gap-6">
            <a 
              href="https://wa.me/6281270756865"
              target="_blank"
              rel="noopener noreferrer"
              className="w-full md:w-auto md:min-w-[340px] py-4 px-5 bg-gradient-to-r from-emerald-50/50 via-green-50/30 to-transparent border border-emerald-150 rounded-2xl flex items-center justify-start gap-3.5 hover:shadow-sm hover:border-[#25D366]/40 transition-all duration-300 active:scale-[0.99] group"
            >
              <div className="w-11 h-11 rounded-xl bg-emerald-500/10 flex items-center justify-center text-xl group-hover:scale-105 transition-transform text-[#25D366]">
                <MessageCircle className="w-5.5 h-5.5 fill-current" />
              </div>
              <div className="text-left space-y-0.5">
                <span className="text-xs font-black text-[#128C7E] flex items-center gap-1.5 leading-none">
                  Hubungi CS Matchaboy
                  <span className="inline-flex items-center gap-0.5 bg-emerald-100 text-[#128C7E] px-2 py-0.5 rounded text-[8px] font-black uppercase">
                    Online
                  </span>
                </span>
                <p className="text-[10px] text-emerald-700/60 font-semibold leading-none pt-0.5">Tanya-tanya via WhatsApp Chat</p>
              </div>
            </a>

            <div className="text-[9.5px] text-left text-gray-400 leading-relaxed max-w-xl border-l border-gray-100 pl-5 space-y-1.5 select-none font-medium">
              <p className="font-bold text-gray-500 flex items-center gap-1.5">
                <Info className="w-3.5 h-3.5 text-gray-300" /> Perlindungan Konsumen Republik Indonesia
              </p>
              <p className="leading-relaxed">
                Direktorat Jenderal Perlindungan Konsumen dan Tertib Niaga, Kementerian Perdagangan RI, Whatsapp Ditjen PKTN: <span className="font-bold text-gray-500">0853-1111-1010</span>
              </p>
            </div>
          </section>

        </motion.div>

        {/* Join CTA for unauthenticated users */}
        {status === 'unauthenticated' && (
          <div className="fixed bottom-[56px] md:bottom-6 left-4 right-4 z-40 bg-[#FFFBF5]/95 backdrop-blur-md border border-[#EADFC9]/30 p-5 flex flex-col md:flex-row justify-between items-center max-w-6xl mx-auto rounded-3xl shadow-lg animate-in fade-in slide-in-from-bottom-5 duration-500">
            <div className="hidden md:block space-y-1">
              <h4 className="text-xs font-black text-gray-900 font-serif">Bergabung dengan Matchaboy sekarang!</h4>
              <p className="text-[10px] text-gray-400 font-semibold">Kumpulkan Arus Poin, klaim voucher gratis, dan pesan lebih cepat ke mejamu.</p>
            </div>
            <button 
              onClick={openLogin}
              className="w-full md:w-[200px] py-3.5 bg-[#2E5A44] hover:bg-[#1E3F20] text-white text-[12px] font-bold rounded-2xl shadow-md transition-all active:scale-[0.98]"
            >
              Masuk / Daftar Akun
            </button>
          </div>
        )}
      </div>

      {/* Common overlays */}
      <ProductModal
        product={selectedProduct}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        allProducts={products}
      />

      <SearchOverlay
        isOpen={searchOpen}
        onClose={() => setSearchOpen(false)}
        onProductSelect={handleSearchSelect}
        products={products}
        categories={categories}
      />

      <EasterEggOverlay
        isOpen={isEasterEggExpanded}
        onClose={() => setIsEasterEggExpanded(false)}
        config={easterEggConfig}
        onClaim={handleClaimEasterEgg}
        isClaiming={isClaiming}
      />
    </>
  );
}
