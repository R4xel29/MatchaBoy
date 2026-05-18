'use client';

import { useState, useMemo, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { ProductModal } from '@/components/storefront/ProductModal';
import { SearchOverlay } from '@/components/storefront/SearchOverlay';
import { useToast } from '@/components/ui/Toast';
import { useStorefrontContext } from './layout';
import type { Product, Category } from '@/types';
import Image from 'next/image';
import { formatRupiah } from '@/lib/utils';
import { motion, AnimatePresence, useMotionValue, useTransform, animate } from 'framer-motion';

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
    if ((session.user as any).phone) return formatPhone((session.user as any).phone);
    if (session.user.email) return session.user.email.split('@')[0];
    return 'Matcha Lover';
  }, [session, status]);

  const router = useRouter();
  const { showToast } = useToast();

  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { searchOpen, setSearchOpen } = useStorefrontContext();

  const [isNight, setIsNight] = useState(false);
  const dragY = useMotionValue(0);
  const stretchHeight = useTransform(dragY, [0, 150], ["124px", "320px"]);

  // Custom drag motion value
  const [easterEggConfig, setEasterEggConfig] = useState<{ enabled: boolean; discount: number; quota: number; hasClaimed: boolean } | null>(null);
  const [isEasterEggExpanded, setIsEasterEggExpanded] = useState(false);
  const [isClaiming, setIsClaiming] = useState(false);

  useEffect(() => {
    const hour = new Date().getHours();
    setIsNight(hour >= 18 || hour < 6);
  }, []);

  useEffect(() => {
    if (status === 'authenticated') {
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
      <div className={`min-h-screen bg-[#FAF8F5] md:pt-20 relative overflow-hidden transition-all duration-300 ${status === 'unauthenticated' ? 'pb-36 md:pb-28' : 'pb-24'}`}>
        
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(212,235,214,0.35)_0%,_rgba(250,248,245,0)_60%)] pointer-events-none z-0" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom,_rgba(247,238,211,0.25)_0%,_rgba(250,248,245,0)_50%)] pointer-events-none z-0" />
        
        <div className="absolute inset-0 bg-[linear-gradient(rgba(0,0,0,0.01)_1px,_transparent_1px),_linear-gradient(90deg,_rgba(0,0,0,0.01)_1px,_transparent_1px)] bg-[size:32px_32px] pointer-events-none z-0 opacity-40" />

        <motion.div 
          style={{ 
            height: stretchHeight,
            backgroundImage: `url(${isNight ? '/banners/night_header_bg.png' : '/banners/day_header_bg.png'})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            borderBottomLeftRadius: "2.5rem",
            borderBottomRightRadius: "2.5rem",
          }}
          className="md:hidden absolute top-0 left-0 right-0 z-20 border-b shadow-md pointer-events-none select-none overflow-hidden bg-[#E3F2FD] border-sky-100/60"
        >
        </motion.div>

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
              <h1 className="font-heading text-lg md:text-2xl font-black tracking-tight flex items-center gap-1.5">
                Hai, {userName} <span className="text-base md:text-xl animate-pulse">👋</span>
              </h1>
            </div>
            <div className="flex items-center gap-3">
              <div className="hidden sm:flex flex-col text-right">
                <span className={`text-[10px] font-black uppercase tracking-widest leading-none ${
                  isNight ? 'text-white' : 'text-brand-700'
                }`}>
                  Arum Seduh
                </span>
                <span className={`text-[8px] font-bold leading-none mt-1 ${
                  isNight ? 'text-[#A69F94]/85' : 'text-[#A69F94]'
                }`}>
                  Premium Brews
                </span>
              </div>
              <div className={`w-11 h-11 rounded-2xl flex items-center justify-center shadow-md hover:scale-105 active:scale-95 transition-all duration-300 ${
                isNight 
                  ? 'bg-white/10 border border-white/20 text-yellow-300' 
                  : 'bg-[#0369A1]/5 border border-[#0369A1]/10 text-brand-700'
              }`}>
                <span className="text-xl">🍃</span>
              </div>
            </div>
          </div>
        </motion.header>

        <div className="hidden md:block max-w-7xl mx-auto px-12 mt-6">
          <p className="text-[10px] font-black uppercase text-[#A69F94] tracking-[0.2em] select-none">
            {isNight ? 'Selamat Malam 🌃' : 'Selamat Siang ☀️'}
          </p>
          <h2 className="font-heading text-xl md:text-2xl font-black text-[#2A1F16] tracking-tight mt-0.5 flex items-center gap-1.5">
            Hai, {userName} <span className="text-base md:text-xl animate-pulse">👋</span>
          </h2>
        </div>

        <motion.div 
          initial={{ y: 30, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.12, duration: 0.6 }}
          className="max-w-7xl mx-auto px-4 md:px-12 mt-4 md:mt-8 relative z-10"
        >
          <div className="relative w-full aspect-[2.1/1] md:aspect-[3.5/1] overflow-hidden rounded-3xl bg-brand-700/5 shadow-[0_12px_36px_rgba(0,0,0,0.035)] border border-brand-700/5 group">
            
            <Image
              src={displayBanners[currentSlide].image}
              alt={displayBanners[currentSlide].alt}
              fill
              className="object-cover group-hover:scale-[1.02] transition-transform duration-700 ease-out"
              priority
              onError={(e) => {
                (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1536256263959-770b48d82b0a?auto=format&fit=crop&q=80&w=1200';
              }}
            />
            
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent flex flex-col justify-end p-5 md:p-8">
              <span className="px-3 py-0.5 rounded-full bg-brand-500 text-white text-[8px] md:text-[9.5px] font-black uppercase tracking-widest w-fit shadow-md">
                Promosi Unggulan
              </span>
              <h2 className="font-heading text-lg md:text-2xl font-black text-white mt-1.5 leading-tight tracking-tight">
                {displayBanners[currentSlide].title}
              </h2>
              <p className="text-[11px] md:text-[12.5px] text-[#F3ECE0] mt-1 leading-snug font-medium max-w-xl">
                {displayBanners[currentSlide].description}
              </p>
            </div>

            <div className="absolute bottom-4 right-4 flex items-center gap-1.5">
              {displayBanners.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => setCurrentSlide(idx)}
                  className={`h-1.5 rounded-full transition-all duration-500 ease-out ${
                    idx === currentSlide ? 'w-5 bg-white' : 'w-1.5 bg-white/40'
                  }`}
                  aria-label={`Go to slide ${idx + 1}`}
                />
              ))}
            </div>
          </div>
        </motion.div>

        <motion.div 
          initial={{ y: 40, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.22, duration: 0.7 }}
          className="max-w-7xl mx-auto px-4 md:px-12 mt-8 space-y-10 relative z-10"
        >

          {hasBundles && (
            <section className="py-7 bg-gradient-to-br from-amber-500/[0.04] via-transparent to-transparent rounded-[2.5rem] border border-amber-500/10 shadow-[0_8px_40px_rgba(245,158,11,0.015)] p-5 md:p-8 relative overflow-hidden">
              <div className="absolute top-0 -left-[100%] w-[50%] h-full bg-gradient-to-r from-transparent via-white/10 to-transparent skew-x-12 animate-[shimmer_4s_infinite]" />
              
              <div className="flex items-center justify-between mb-5">
                <div className="space-y-1">
                  <span className="px-3 py-0.5 rounded-full bg-amber-500/10 text-amber-700 text-[8px] font-black uppercase tracking-widest flex items-center gap-1 w-fit border border-amber-500/20 shadow-sm">
                    🍃 Special Offer
                  </span>
                  <h3 className="font-heading font-black text-base md:text-xl text-[#2A1F16] tracking-tight">
                    Paket Combo Hemat
                  </h3>
                </div>
                <span className="text-[11px] md:text-[13px] text-amber-700 font-bold flex items-center gap-0.5 cursor-pointer hover:underline transition-all">
                  Lihat Semua <span className="text-[8px] md:text-[10px]">▶</span>
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {products.filter(p => p.modifiers?.isBundle === true).map((product) => (
                  <div 
                    key={product.id}
                    onClick={() => handleProductClick(product)}
                    className="bg-white rounded-3xl p-4.5 border border-brand-700/5 shadow-[0_6px_24px_rgba(0,0,0,0.01)] hover:shadow-[0_12px_36px_rgba(245,158,11,0.06)] hover:border-amber-500/25 hover:-translate-y-1 transition-all duration-300 active:scale-[0.98] cursor-pointer flex gap-4 group relative overflow-hidden"
                  >
                    <div className="absolute top-3.5 right-3.5 z-10 px-2.5 py-0.5 rounded-full bg-amber-500 text-white text-[8px] font-black uppercase tracking-wider shadow-sm">
                      Hemat
                    </div>
                    {product.image && (
                      <div className="relative w-20 h-20 rounded-2xl overflow-hidden bg-brand-50 shrink-0 border border-brand-700/5">
                        <Image
                           src={product.image}
                           alt={product.name}
                           fill
                           sizes="80px"
                           className="object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                      </div>
                    )}
                    <div className="flex-grow min-w-0 flex flex-col justify-between py-0.5">
                      <div>
                        <h4 className="font-black text-[13px] md:text-[14px] leading-tight text-[#2A1F16] group-hover:text-brand-500 transition-colors line-clamp-1">{product.name}</h4>
                        <p className="text-[10px] md:text-[11px] mt-1 text-[#A69F94] line-clamp-2 leading-tight font-medium">{product.description}</p>
                      </div>
                      <p className="font-black text-sm text-amber-700 leading-none mt-2">{formatRupiah(product.price)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}
          
          <section className="py-6 bg-white rounded-[2.5rem] border border-brand-700/5 shadow-[0_8px_30px_rgba(0,0,0,0.015)] p-5 md:p-8">
            <div className="flex items-center justify-between mb-5">
              <div className="space-y-1">
                <span className="w-1.5 h-1.5 rounded-full bg-[#B02A30] inline-block animate-ping mr-1"></span>
                <h3 className="font-heading font-black text-base md:text-xl text-[#2A1F16] tracking-tight inline-block">
                  Spesial Hari Ini
                </h3>
              </div>
              <span className="text-[11px] md:text-[13px] text-brand-600 font-bold flex items-center gap-0.5 cursor-pointer hover:text-brand-500 transition-colors">
                Lihat Semua <span className="text-[8px] md:text-[10px]">▶</span>
              </span>
            </div>

            <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-thin scrollbar-thumb-brand-100/60 scrollbar-track-transparent">
              {spesialProducts.map((p) => (
                <div 
                  key={p.id}
                  onClick={() => handleProductClick(p)}
                  className="w-[140px] md:w-[170px] shrink-0 bg-white border border-brand-700/5 hover:border-brand-500/25 hover:shadow-[0_12px_36px_rgba(0,0,0,0.035)] hover:-translate-y-1 transition-all duration-300 cursor-pointer rounded-3xl p-3 relative group overflow-hidden"
                >
                  {p.image && (
                    <div className="relative w-full aspect-square rounded-2xl overflow-hidden bg-[#FAF8F5] mb-3">
                      <Image
                        src={p.image}
                        alt={p.name}
                        fill
                        sizes="(max-width: 768px) 120px, 150px"
                        className="object-cover group-hover:scale-110 transition-transform duration-550 ease-out"
                      />
                      <span className="absolute top-1.5 right-1.5 z-10 px-2 py-0.5 rounded-full bg-white/90 backdrop-blur-md text-[#E69F00] text-[8px] font-black shadow-sm flex items-center gap-0.5">
                        ⭐ 4.9
                      </span>
                      <span className="absolute bottom-1.5 left-1.5 z-10 px-2 py-0.5 rounded-lg bg-[#2E5A44] text-white text-[8px] font-black shadow-sm uppercase tracking-wide">
                        {p.badge || 'Spesial'}
                      </span>
                    </div>
                  )}

                  <div className="flex-grow flex flex-col justify-between">
                    <p className="text-[12px] md:text-[13px] font-black text-[#2A1F16] line-clamp-1 leading-snug group-hover:text-brand-500 transition-colors">
                      {p.name}
                    </p>
                    <div className="mt-2.5">
                      <span className="px-3 py-1 rounded-xl text-[10px] md:text-[11px] font-black tracking-tight border bg-[#FFF5E6] border-[#FFE8CC] text-[#B02A30]">
                        {formatRupiah(p.price)}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="py-6 bg-white rounded-[2.5rem] border border-brand-700/5 shadow-[0_8px_30px_rgba(0,0,0,0.015)] p-5 md:p-8">
            <div className="flex items-center gap-2 mb-5">
              <span className="text-lg">🉐</span>
              <h3 className="font-heading font-black text-base md:text-xl text-[#2A1F16] tracking-tight">
                Diskon & Cashback
              </h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5">
              <div className="bg-white border border-brand-700/5 hover:border-[#00B4D8]/30 shadow-sm hover:shadow-[0_8px_24px_rgba(0,180,216,0.06)] hover:-translate-y-0.5 rounded-3xl p-5 flex items-center justify-between relative overflow-hidden group transition-all duration-300 cursor-pointer">
                <div className="absolute -top-6 -right-6 w-16 h-16 bg-[#00B4D8]/5 rounded-full" />
                <div className="min-w-0 pr-2">
                  <p className="text-[15px] md:text-[17px] font-black text-[#0077B6] leading-none">40% OFF</p>
                  <p className="text-[9.5px] md:text-[11.5px] mt-2 text-[#A69F94] leading-snug font-bold uppercase tracking-wider">blu by BCA Digital</p>
                </div>
                <div className="w-10 h-10 rounded-2xl bg-[#E0F7FA] border border-[#00B4D8]/20 flex items-center justify-center shrink-0 shadow-inner group-hover:scale-105 transition-transform duration-300">
                  <span className="text-[10px] font-black text-[#0096C7]">blu</span>
                </div>
              </div>

              <div className="bg-white border border-brand-700/5 hover:border-[#4C2A86]/30 shadow-sm hover:shadow-[0_8px_24px_rgba(76,42,134,0.06)] hover:-translate-y-0.5 rounded-3xl p-5 flex items-center justify-between relative overflow-hidden group transition-all duration-300 cursor-pointer">
                <div className="absolute -top-6 -right-6 w-16 h-16 bg-[#4C2A86]/5 rounded-full" />
                <div className="min-w-0 pr-2">
                  <p className="text-[15px] md:text-[17px] font-black text-[#4C2A86] leading-none">60% OFF</p>
                  <p className="text-[9.5px] md:text-[11.5px] mt-2 text-[#A69F94] leading-snug font-bold uppercase tracking-wider">Bayar pakai OVO</p>
                </div>
                <div className="w-10 h-10 rounded-2xl bg-[#F3E5F5] border border-[#7B1FA2]/20 flex items-center justify-center shrink-0 shadow-inner group-hover:scale-105 transition-transform duration-300">
                  <span className="text-[10px] font-black text-[#4A148C]">OVO</span>
                </div>
              </div>

              <div className="bg-white border border-brand-700/5 hover:border-[#EE4D2D]/30 shadow-sm hover:shadow-[0_8px_24px_rgba(238,77,45,0.06)] hover:-translate-y-0.5 rounded-3xl p-5 flex items-center justify-between relative overflow-hidden group transition-all duration-300 cursor-pointer">
                <div className="absolute -top-6 -right-6 w-16 h-16 bg-[#EE4D2D]/5 rounded-full" />
                <div className="min-w-0 pr-2">
                  <p className="text-[15px] md:text-[17px] font-black text-[#D35400] leading-none">50% OFF</p>
                  <p className="text-[9.5px] md:text-[11.5px] mt-2 text-[#A69F94] leading-snug font-bold uppercase tracking-wider">ShopeePay Cashback</p>
                </div>
                <div className="w-10 h-10 rounded-2xl bg-[#FBE9E7] border border-[#FF5722]/20 flex items-center justify-center shrink-0 shadow-inner group-hover:scale-105 transition-transform duration-300">
                  <span className="text-[10px] font-black text-[#E64A19]">SPay</span>
                </div>
              </div>
            </div>
          </section>

          <section className="py-6 bg-white rounded-[2.5rem] border border-brand-700/5 shadow-[0_8px_30px_rgba(0,0,0,0.015)] p-5 md:p-8">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-heading font-black text-base md:text-xl text-[#2A1F16] tracking-tight">
                Baru!
              </h3>
              <span className="text-[11px] md:text-[13px] text-brand-600 font-bold flex items-center gap-0.5 cursor-pointer hover:text-brand-500 transition-colors">
                Lihat Semua <span className="text-[8px] md:text-[10px]">▶</span>
              </span>
            </div>

            <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-thin scrollbar-thumb-brand-100/60 scrollbar-track-transparent">
              {baruProducts.map((p) => (
                <div 
                  key={p.id}
                  onClick={() => handleProductClick(p)}
                  className="w-[140px] md:w-[170px] shrink-0 bg-white border border-brand-700/5 hover:border-brand-500/25 hover:shadow-[0_12px_36px_rgba(0,0,0,0.035)] hover:-translate-y-1 transition-all duration-300 cursor-pointer rounded-3xl p-3 relative group overflow-hidden"
                >
                  {p.image && (
                    <div className="relative w-full aspect-square rounded-2xl overflow-hidden bg-[#FAF8F5] mb-3">
                      <Image
                        src={p.image}
                        alt={p.name}
                        fill
                        sizes="(max-width: 768px) 120px, 150px"
                        className="object-cover group-hover:scale-110 transition-transform duration-550 ease-out"
                      />
                      <span className="absolute top-1.5 right-1.5 z-10 px-2 py-0.5 rounded-full bg-white/90 backdrop-blur-md text-[#E69F00] text-[8px] font-black shadow-sm flex items-center gap-0.5">
                        ⭐ 4.8
                      </span>
                      <span className="absolute bottom-1.5 left-1.5 z-10 px-2 py-0.5 rounded-full bg-[#E8F5E9] text-[#2E7D32] text-[8px] font-extrabold shadow-sm uppercase tracking-wide">
                        New
                      </span>
                    </div>
                  )}

                  <div className="flex-grow flex flex-col justify-between">
                    <p className="text-[12px] md:text-[13px] font-black text-[#2A1F16] line-clamp-1 leading-snug group-hover:text-brand-500 transition-colors">
                      {p.name}
                    </p>
                    <p className="font-black text-[12px] md:text-[13px] text-[#B48A5E] leading-none mt-2.5">
                      {formatRupiah(p.price)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="py-6 bg-white rounded-[2.5rem] border border-brand-700/5 shadow-[0_8px_30px_rgba(0,0,0,0.015)] p-5 md:p-8">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-heading font-black text-base md:text-xl text-[#2A1F16] tracking-tight">
                Makanan
              </h3>
              <span className="text-[11px] md:text-[13px] text-brand-600 font-bold flex items-center gap-0.5 cursor-pointer hover:text-brand-500 transition-colors">
                Lihat Semua <span className="text-[8px] md:text-[10px]">▶</span>
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-5">
              {makananProducts.map((p) => (
                <div 
                  key={p.id}
                  onClick={() => handleProductClick(p)}
                  className="bg-white border border-brand-700/5 hover:border-brand-500/25 hover:shadow-[0_12px_36px_rgba(0,0,0,0.035)] hover:-translate-y-1 transition-all duration-300 cursor-pointer rounded-3xl p-4.5 relative group overflow-hidden"
                >
                  {p.image && (
                    <div className="relative w-full aspect-[4/3] rounded-2xl overflow-hidden bg-[#FAF8F5] mb-3">
                      <Image
                        src={p.image}
                        alt={p.name}
                        fill
                        sizes="(max-width: 768px) 150px, 200px"
                        className="object-cover group-hover:scale-110 transition-transform duration-500"
                      />
                      <span className="absolute top-1.5 right-1.5 z-10 px-2 py-0.5 rounded-full bg-white/90 backdrop-blur-md text-[#E69F00] text-[8px] font-black shadow-sm flex items-center gap-0.5">
                        ⭐ 4.9
                      </span>
                    </div>
                  )}

                  <div className="flex-1 flex flex-col justify-between">
                    <p className="text-[12px] md:text-[13.5px] font-black text-[#2A1F16] line-clamp-1 leading-snug group-hover:text-brand-500 transition-colors">
                      {p.name}
                    </p>
                    <p className="font-black text-[12px] md:text-[13px] text-gray-700 leading-none mt-2.5">
                      {formatRupiah(p.price)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="px-6 py-8 bg-white border border-brand-700/5 rounded-[2.5rem] shadow-[0_8px_30px_rgba(0,0,0,0.01)] flex flex-col md:flex-row items-center justify-between gap-8 text-center md:text-left">
            
            <a 
              href="https://wa.me/628170756865"
              target="_blank"
              rel="noopener noreferrer"
              className="w-full md:w-auto md:min-w-[360px] py-4.5 px-6 bg-gradient-to-r from-[#25D366]/5 via-[#25D366]/10 to-transparent border border-[#25D366]/15 rounded-3xl flex items-center justify-center gap-4 hover:shadow-[0_8px_24px_rgba(37,211,102,0.12)] hover:border-[#25D366]/40 transition-all duration-350 active:scale-[0.99] group"
            >
              <div className="w-11 h-11 rounded-full bg-[#25D366]/10 flex items-center justify-center shrink-0 text-2xl group-hover:scale-110 transition-transform duration-300 shadow-inner">
                💬
              </div>
              <div className="text-left space-y-0.5">
                <span className="text-[13px] font-black text-[#128C7E] flex items-center gap-2">
                  Curhat ke 6281 7075 6865 
                  <span className="inline-flex items-center gap-1 bg-[#25D366]/15 text-[#128C7E] px-2 py-0.5 rounded-full text-[8px] font-extrabold uppercase tracking-wider">
                    <span className="h-1.5 w-1.5 rounded-full bg-[#25D366] animate-pulse"></span>
                    CS Online
                  </span>
                </span>
                <p className="text-[10px] text-emerald-600/70 font-medium">Layanan respon cepat chat WA only</p>
              </div>
            </a>

            <div className="text-[9.5px] md:text-[10.5px] text-left text-[#A69F94] leading-relaxed max-w-xl border-l-2 border-brand-500/30 pl-5 space-y-1.5 py-1 select-none">
              <p className="font-black text-gray-500 flex items-center gap-2">
                🛡️ Informasi Kontak Layanan Pengaduan Konsumen
              </p>
              <p className="text-gray-400 font-medium leading-relaxed">
                Direktorat Jenderal Perlindungan Konsumen dan Tertib Niaga, Kementerian Perdagangan Republik Indonesia, Whatsapp Ditjen PKTN: <span className="font-black text-gray-500">0853-1111-1010</span>
              </p>
            </div>
          </section>

        </motion.div>

        {status === 'unauthenticated' && (
          <div className="fixed bottom-[56px] md:bottom-6 left-4 right-4 z-40 bg-[#FFFBF5]/95 backdrop-blur-md border border-brand-100/60 p-4.5 flex flex-col md:flex-row justify-between items-center max-w-7xl mx-auto rounded-3xl shadow-[0_12px_48px_rgba(0,0,0,0.08)] animate-in fade-in slide-in-from-bottom-5 duration-500">
            <div className="hidden md:block space-y-0.5">
              <h4 className="text-sm font-black text-[#2A1F16]">Bergabung dengan Arum Seduh sekarang!</h4>
              <p className="text-[11.5px] text-[#A69F94] font-medium">Dapatkan poin cashback, diskon spesial, dan kemudahan pemesanan.</p>
            </div>
            <button 
              onClick={() => router.push('/login')}
              className="w-full md:w-[230px] py-4 bg-gradient-to-r from-[#B02A30] to-[#901E23] hover:from-[#901E23] hover:to-[#701015] text-white text-[13px] font-black rounded-2xl shadow-[0_8px_24px_rgba(176,42,48,0.25)] hover:shadow-[0_8px_32px_rgba(176,42,48,0.4)] transition-all duration-350 tracking-wide active:scale-[0.98]"
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

      {/* 🌌 FULL SCREEN EASTER EGG OVERLAY */}
      <AnimatePresence>
        {isEasterEggExpanded && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 overflow-hidden flex flex-col items-center justify-between text-white px-6 py-12"
            style={{ 
              backgroundImage: "url('/banners/night_header_bg.png')", 
              backgroundSize: 'cover', 
              backgroundPosition: 'center' 
            }}
          >
            {/* Ambient glows & active stars overlay */}
            <div className="absolute inset-0 bg-[#0B0D19]/40 backdrop-blur-[2px] z-0" />

            {/* Pulsing galaxy light */}
            <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-72 h-72 bg-indigo-500/15 rounded-full blur-[64px] animate-pulse" />
            <div className="absolute bottom-1/4 left-1/3 w-60 h-60 bg-purple-500/10 rounded-full blur-[64px] animate-pulse duration-1000" />

            {/* Twinkling overlay stars */}
            <div className="absolute inset-0 opacity-80 z-0 pointer-events-none select-none">
              <div className="absolute top-1/4 left-[15%] w-2 h-2 bg-yellow-100 rounded-full animate-ping" />
              <div className="absolute top-1/3 left-[75%] w-2.5 h-2.5 bg-yellow-200 rounded-full animate-pulse" />
              <div className="absolute top-2/3 left-[25%] w-2 h-2 bg-white rounded-full animate-ping duration-700" />
              <div className="absolute top-[80%] left-[80%] w-2.5 h-2.5 bg-indigo-200 rounded-full animate-pulse duration-1000" />
            </div>

            {/* Top Close Bar */}
            <div className="w-full flex justify-end relative z-10">
              <motion.button 
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => setIsEasterEggExpanded(false)}
                className="w-10 h-10 rounded-full bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center text-xl font-bold shadow-md"
              >
                ✕
              </motion.button>
            </div>

            {/* Main Content Card (Spring Fade-In) */}
            <motion.div 
              initial={{ scale: 0.85, y: 50, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.85, y: 50, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 100, damping: 15 }}
              className="max-w-md w-full bg-white/5 backdrop-blur-xl border border-white/15 rounded-3xl p-8 text-center relative z-10 shadow-[0_20px_50px_rgba(0,0,0,0.5)] space-y-6"
            >
              <div className="w-16 h-16 bg-gradient-to-tr from-yellow-300 to-amber-500 rounded-2xl flex items-center justify-center text-3xl mx-auto shadow-lg animate-bounce">
                🌌
              </div>

              <div className="space-y-2">
                <span className="text-[10px] text-yellow-300 font-extrabold uppercase tracking-[0.25em] px-2.5 py-1 rounded-full bg-yellow-400/10 border border-yellow-400/20">
                  Secret Easter Egg
                </span>
                <h3 className="font-heading text-2xl font-black tracking-tight text-white mt-1">
                  Misteri Langit Bimasakti!
                </h3>
                <p className="text-xs text-indigo-100 leading-relaxed px-2">
                  Wah! Kamu sangat jeli! Kamu baru saja menemukan rahasia langit malam **Arum Seduh** yang menakjubkan.
                </p>
              </div>

              <div className="border-t border-white/10 pt-4 space-y-3">
                <p className="text-[11px] text-[#A69F94] font-medium uppercase tracking-[0.1em]">
                  Hadiah Spesial Untukmu
                </p>
                <div className="bg-gradient-to-r from-amber-500/15 via-yellow-400/5 to-amber-500/15 border border-yellow-300/30 rounded-2xl py-4 px-2">
                  <p className="text-[10px] text-yellow-300 font-black tracking-widest uppercase">Secret Voucher Discount</p>
                  <p className="text-3xl font-extrabold text-yellow-300 mt-1">
                    Rp {(easterEggConfig?.discount || 15000).toLocaleString('id-ID')}
                  </p>
                  <p className="text-[9px] text-[#A69F94] mt-1">Berlaku untuk 1 kali pembelian di kasir/checkout</p>
                </div>
              </div>

              {easterEggConfig?.hasClaimed ? (
                <div className="w-full py-3.5 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 font-bold text-xs tracking-wide">
                  ✓ Voucher Rahasia Sudah Diklaim!
                </div>
              ) : (
                <motion.button 
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={handleClaimEasterEgg}
                  disabled={isClaiming}
                  className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-yellow-400 via-amber-500 to-yellow-500 text-slate-950 font-black text-sm tracking-wide shadow-[0_4px_20px_rgba(245,158,11,0.3)] hover:shadow-[0_4px_30px_rgba(245,158,11,0.5)] transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isClaiming ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-slate-950" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Mengklaim...
                    </>
                  ) : (
                    'Klaim Voucher Rahasia ☕'
                  )}
                </motion.button>
              )}
            </motion.div>

            {/* Bottom text */}
            <p className="text-[10px] text-white/40 tracking-wider font-semibold z-10 select-none">
              DITENAGAI OLEH ARUM SEDUH LOYALTY SYSTEM
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
