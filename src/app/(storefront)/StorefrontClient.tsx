'use client';

import { useState, useMemo, useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import dynamic from 'next/dynamic';
import { useToast } from '@/components/ui/Toast';
import { useStorefrontContext } from './layout';
import type { Product, Category } from '@/types';
import Image from 'next/image';
import { formatRupiah, getActivePromo, cn } from '@/lib/utils';
import { motion, useMotionValue, useTransform, animate, AnimatePresence } from 'framer-motion';
import { Star, Sparkles, Flame, MessageCircle, Info, ChevronRight, ShoppingBag, Clock, Gift, Copy, Check, Share2 } from 'lucide-react';
import { PromoCountdown } from '@/components/storefront/PromoCountdown';

// Lazy-load heavy modal components (only shown on user interaction)
const ProductModal = dynamic(() => import('@/components/storefront/ProductModal').then(m => ({ default: m.ProductModal })), { ssr: false });
const SearchOverlay = dynamic(() => import('@/components/storefront/SearchOverlay').then(m => ({ default: m.SearchOverlay })), { ssr: false });
const EasterEggOverlay = dynamic(() => import('@/components/storefront/EasterEggOverlay').then(m => ({ default: m.EasterEggOverlay })), { ssr: false });
import { GachaOverlay } from '@/components/storefront/GachaOverlay';
import { StoryBar } from '@/components/storefront/StoryBar';

interface HeroBanner {
  id: string;
  image: string;
  alt: string;
  headline?: string | null;
  subheadline?: string | null;
  isFlashSale?: boolean;
  product?: Product | null;
  endDate?: string;
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
  const stretchHeight = useTransform(dragY, [0, 150], ["78px", "320px"]);

  // Custom drag motion value
  const [easterEggConfig, setEasterEggConfig] = useState<{ enabled: boolean; discount: number; quota: number; hasClaimed: boolean } | null>(null);
  const [isEasterEggExpanded, setIsEasterEggExpanded] = useState(false);
  const [isClaiming, setIsClaiming] = useState(false);
  const loyaltyFetchedRef = useRef(false);

  // Featured Reviews and Gacha chances states
  const [featuredReviews, setFeaturedReviews] = useState<any[]>([]);
  const [loadingReviews, setLoadingReviews] = useState(true);
  const [gachaChances, setGachaChances] = useState(0);
  const [isGachaOpen, setIsGachaOpen] = useState(false);

  // Weather recommendations state
  const [weatherData, setWeatherData] = useState<any>(null);
  const [loadingWeather, setLoadingWeather] = useState(true);
  const [timePeriod, setTimePeriod] = useState<'pagi' | 'siang' | 'sore' | 'malam'>('siang');
  const [weatherCategory, setWeatherCategory] = useState<'cerah' | 'cerah_berawan' | 'berawan' | 'berawan_tebal' | 'gerimis' | 'hujan_ringan' | 'hujan_sedang'>('cerah');

  // AI recommendations state
  const [aiData, setAiData] = useState<any[]>([]);
  const [loadingAi, setLoadingAi] = useState(true);


  const [copied, setCopied] = useState(false);
  const referralCode = useMemo(() => {
    return (session?.user as any)?.referralCode || '';
  }, [session]);

  const getReferralUrl = () => {
    if (typeof window === 'undefined') return '';
    return `${window.location.origin}/register?ref=${referralCode}`;
  };

  const handleCopyLink = () => {
    if (status !== 'authenticated') {
      openLogin();
      return;
    }
    navigator.clipboard.writeText(getReferralUrl());
    setCopied(true);
    showToast('Link referral berhasil disalin!', 'success');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShareWA = () => {
    if (status !== 'authenticated') {
      openLogin();
      return;
    }
    const text = encodeURIComponent(
      `Cobain Matchaboy! 🍵 Matcha premium yang enak banget. Daftar pakai link ini dan dapatkan diskon langsung Rp3.000 tanpa batas belanja:\n${getReferralUrl()}`
    );
    window.open(`https://wa.me/?text=${text}`, '_blank');
  };

  useEffect(() => {
    const hour = new Date().getHours();
    setIsNight(hour >= 18 || hour < 6);
    
    // Set exact time period according to:
    // Pagi (06:00-10:00) | Siang (10:00-16:00) | Sore (16:00-18:00) | Malam (18:00-06:00)
    if (hour >= 6 && hour < 10) {
      setTimePeriod('pagi');
    } else if (hour >= 10 && hour < 16) {
      setTimePeriod('siang');
    } else if (hour >= 16 && hour < 18) {
      setTimePeriod('sore');
    } else {
      setTimePeriod('malam');
    }
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const refCode = params.get('ref');
      if (refCode) {
        document.cookie = `pending_referral_code=${encodeURIComponent(refCode)}; path=/; max-age=${7 * 24 * 60 * 60}; SameSite=Lax`;
        
        // Remove ref parameter from URL to clean up the browser address bar
        const url = new URL(window.location.href);
        url.searchParams.delete('ref');
        window.history.replaceState({}, '', url.pathname + url.search);
      }

      if (params.get('openMenu') === 'true') {
        setSearchOpen(true);
        const url = new URL(window.location.href);
        url.searchParams.delete('openMenu');
        window.history.replaceState({}, '', url.pathname + url.search);
      }
    }
  }, [setSearchOpen]);

  useEffect(() => {
    // Fetch featured reviews
    fetch('/api/reviews/featured')
      .then(res => res.json())
      .then(data => {
        if (data?.reviews) {
          setFeaturedReviews(data.reviews);
        }
      })
      .catch(err => console.error('Error fetching reviews:', err))
      .finally(() => setLoadingReviews(false));

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

      fetch('/api/user/gacha')
        .then(res => res.json())
        .then(data => {
          if (data?.gachaChances !== undefined) {
            setGachaChances(data.gachaChances);
          }
        })
        .catch(err => console.error('Error fetching gacha chances:', err));
    }
  }, [status]);

  // Weather & Geolocation Fetch
  useEffect(() => {
    const updateWeatherCategory = (data: any) => {
      if (data?.weather?.condition) {
        const cond = data.weather.condition;
        const desc = data.weather.description || '';
        setWeatherCategory(getWeatherCategory(cond, desc));
      }
    };

    if (typeof window !== 'undefined' && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const { latitude, longitude } = pos.coords;
          fetch(`/api/weather-recommendation?lat=${latitude}&lon=${longitude}`)
            .then(res => res.json())
            .then(data => {
              if (data?.success) {
                setWeatherData(data);
                updateWeatherCategory(data);
              }
            })
            .catch(err => console.error('Error fetching weather:', err))
            .finally(() => setLoadingWeather(false));
        },
        (err) => {
          fetch(`/api/weather-recommendation`)
            .then(res => res.json())
            .then(data => {
              if (data?.success) {
                setWeatherData(data);
                updateWeatherCategory(data);
              }
            })
            .catch(err => console.error('Error fetching weather fallback:', err))
            .finally(() => setLoadingWeather(false));
        }
      );
    } else {
      setLoadingWeather(false);
    }
  }, []);

  // AI Recommendations Fetch
  useEffect(() => {
    fetch('/api/ai/recommendations')
      .then(res => res.json())
      .then(data => {
        if (data?.success && data.recommendations) {
          setAiData(data.recommendations);
        }
      })
      .catch(err => console.error('Error fetching AI recommendations:', err))
      .finally(() => setLoadingAi(false));
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
    const flashSaleSlides = products
      .filter((p: Product) => getActivePromo(p) !== null)
      .map((p: Product) => {
        const promo = getActivePromo(p)!;
        return {
          id: `flash-sale-${p.id}`,
          image: p.image || '/hero/hero-1.jpg',
          alt: `Flash Sale ${p.name}`,
          headline: `🔥 Flash Sale: ${p.name}`,
          subheadline: `Nikmati harga spesial hanya ${formatRupiah(promo.promoPrice)} (Hemat ${formatRupiah(p.price - promo.promoPrice)})! Buruan beli sebelum kehabisan!`,
          isFlashSale: true,
          product: p,
          endDate: promo.endDate
        };
      });

    const baseBanners = banners.length > 0 ? banners : [
      { id: '1', image: '/hero/hero-1.jpg', alt: 'Kopi Gratis', headline: 'Ajak Teman Bisa Dapat Kopi Gratis', subheadline: 'Buy 1 Get 1' },
      { id: '2', image: '/hero/hero-2.jpg', alt: 'Buy 1 Get 1', headline: 'Nikmati Promo Spesial Hari Ini', subheadline: 'Buy 1 Get 1' },
    ];

    return [...flashSaleSlides, ...baseBanners];
  }, [banners, products]);

  useEffect(() => {
    if (displayBanners.length <= 1) return;
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % displayBanners.length);
    }, 4500);
    return () => clearInterval(timer);
  }, [displayBanners]);

  const comboProducts = useMemo(() => {
    const list = products.filter(p => p.modifiers?.isBundle === true);
    return [...list].sort((a, b) => (a.badge === 'sold-out' ? 1 : 0) - (b.badge === 'sold-out' ? 1 : 0));
  }, [products]);

  const spesialProducts = useMemo(() => {
    const list = products.filter(p => p.badge === 'best-seller' && p.modifiers?.isBundle !== true);
    const baseList = list.length > 0 ? list : products.slice(0, 4).filter(p => p.modifiers?.isBundle !== true);
    return [...baseList].sort((a, b) => (a.badge === 'sold-out' ? 1 : 0) - (b.badge === 'sold-out' ? 1 : 0));
  }, [products]);

  const baruProducts = useMemo(() => {
    const list = products.filter(p => p.badge === 'new');
    const baseList = list.length > 0 ? list : products.slice(1, 3);
    return [...baseList].sort((a, b) => (a.badge === 'sold-out' ? 1 : 0) - (b.badge === 'sold-out' ? 1 : 0));
  }, [products]);

  const makananProducts = useMemo(() => {
    const foodKeywords = ['roti', 'croissant', 'donut', 'cake', 'pastry', 'sweet', 'makanan', 'bread', 'bun', 'pie', 'chocolate', 'keju', 'susu'];
    const list = products.filter(p => {
      const nameLower = p.name.toLowerCase();
      const descLower = p.description.toLowerCase();
      const catLower = p.category.toLowerCase();
      return foodKeywords.some(kw => nameLower.includes(kw) || descLower.includes(kw) || catLower.includes(kw));
    });
    const baseList = list.length > 0 ? list : products.slice(2, 8);
    return [...baseList].sort((a, b) => (a.badge === 'sold-out' ? 1 : 0) - (b.badge === 'sold-out' ? 1 : 0));
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

        {/* Background gambar dinamis pagi/siang/sore/malam dengan cuaca — stretch saat di-drag */}
        <motion.div 
          style={{ 
            height: stretchHeight,
            backgroundImage: `url(/banners/${timePeriod}_header_bg.png)`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            borderBottomLeftRadius: "2.5rem",
            borderBottomRightRadius: "2.5rem",
          }}
          className="md:hidden absolute top-0 left-0 right-0 z-20 border-b-[3px] border-[#D4A574] shadow-md pointer-events-none select-none overflow-hidden"
        >
          {/* Weather Animated SVG/CSS Overlay */}
          <WeatherEffectOverlay timePeriod={timePeriod} category={weatherCategory} />
        </motion.div>

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
          className={`md:hidden relative z-30 px-6 pt-3 pb-1 cursor-pointer transition-all duration-300 select-none bg-transparent shadow-none border-transparent ${
            (timePeriod === 'malam' || timePeriod === 'sore') ? 'text-white' : 'text-[#2A1F16]'
          }`}
        >
          <div className="max-w-7xl mx-auto flex items-center justify-between gap-4 relative z-10 pt-2">
            <div className="space-y-0.5">
              <p className={`text-[9px] font-black uppercase tracking-[0.25em] select-none ${
                (timePeriod === 'malam' || timePeriod === 'sore') 
                  ? 'text-[#FEF08A] drop-shadow-[0_1px_2px_rgba(0,0,0,0.3)]' 
                  : (timePeriod === 'pagi' ? 'text-[#0369A1]' : 'text-[#1E3F20]')
              }`}>
                {timePeriod === 'pagi' && 'Selamat Pagi 🌅'}
                {timePeriod === 'siang' && 'Selamat Siang ☀️'}
                {timePeriod === 'sore' && 'Selamat Sore 🌇'}
                {timePeriod === 'malam' && 'Selamat Malam 🌃'}
              </p>
              <h1 className={`font-serif text-lg md:text-2xl font-black tracking-tight ${
                (timePeriod === 'malam' || timePeriod === 'sore') 
                  ? 'text-white drop-shadow-[0_1px_3px_rgba(0,0,0,0.4)]' 
                  : 'text-[#2A1F16]'
              }`}>
                Hai, {userName}
              </h1>
            </div>
            
            {/* User Profile Avatar with Gold Border and Leaf Badge Overlay */}
            <div className="flex items-center gap-3">
              <div 
                onClick={() => {
                  if (status === 'authenticated') {
                    window.location.href = '/profile';
                  } else {
                    openLogin();
                  }
                }}
                className="relative cursor-pointer"
              >
                <div 
                  style={{
                    boxShadow: '0 0 14px 2px rgba(212, 165, 116, 0.85), inset 0 0 4px rgba(254, 240, 138, 0.6)',
                  }}
                  className="w-12 h-12 rounded-full p-[2px] bg-gradient-to-tr from-[#D4A574] via-[#FEF08A] to-[#B48A5E] flex items-center justify-center overflow-hidden border border-[#FEF08A]/80"
                >
                  <div className="w-full h-full rounded-full overflow-hidden bg-[#1E3F20] relative">
                    <Image
                      src={session?.user?.image || `https://ui-avatars.com/api/?name=${encodeURIComponent(userName)}&background=1E3F20&color=D4A574&bold=true`}
                      alt="User Profile"
                      width={48}
                      height={48}
                      className="object-cover w-full h-full"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(userName)}&background=1E3F20&color=D4A574&bold=true`;
                      }}
                    />
                  </div>
                </div>
                {/* Gold Leaf Badge overlay on bottom right */}
                <div className="absolute -bottom-1 -right-1 w-5.5 h-5.5 rounded-full bg-[#1E3F20] border-2 border-white flex items-center justify-center shadow-md">
                  <span className="text-[10px] leading-none select-none">🍃</span>
                </div>
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
              <h1 className="font-serif text-3xl font-black text-gray-900 tracking-tight">
                Hai, <span className="text-[#2E5A44]">{userName}</span> <span className="text-2xl animate-pulse">👋</span>
              </h1>
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

        {/* Story Bar Status (B3) */}
        <div className="max-w-6xl mx-auto px-4 sm:px-6 mt-10 md:mt-4 relative z-10 md:hidden">
          <StoryBar />
        </div>

        {/* Hero Banner Slider */}
        <motion.div 
          initial={{ y: 30, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.1, duration: 0.6 }}
          className="max-w-6xl mx-auto px-4 sm:px-6 mt-10 md:mt-6 relative z-10"
        >
          <div className="relative w-full aspect-[2.1/1] md:aspect-[3.6/1] overflow-hidden rounded-[2rem] bg-white shadow-lg border-[3px] border-[#D4A574]/70 group">
            {(() => {
              const slide = displayBanners[currentSlide] || displayBanners[0];
              return (
                <div 
                  onClick={() => {
                    if (slide?.isFlashSale && (slide as any).product) {
                      handleProductClick((slide as any).product);
                    }
                  }}
                  className={cn(
                    "relative w-full h-full overflow-hidden select-none",
                    slide?.isFlashSale && "cursor-pointer active:scale-[0.99] transition-transform duration-300"
                  )}
                >
                  <Image
                    src={slide?.image || '/hero/hero-1.jpg'}
                    alt={slide?.alt || 'Promo banner'}
                    fill
                    className="object-cover group-hover:scale-[1.02] transition-transform duration-1000 ease-out"
                    priority
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1536256263959-770b48d82b0a?auto=format&fit=crop&q=80&w=1200';
                    }}
                  />
                  
                  <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent flex flex-col justify-end p-5 md:p-8">
                    <div className="relative w-[115px] h-[26px] mb-2.5 select-none flex items-center justify-center">
                      {/* Gold Ribbon SVG background */}
                      <svg className="absolute inset-0 w-full h-full drop-shadow-[0_2px_4px_rgba(0,0,0,0.35)]" viewBox="0 0 115 26" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <defs>
                          <linearGradient id="gold-ribbon-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" stopColor="#FEF08A" />
                            <stop offset="40%" stopColor="#D4A574" />
                            <stop offset="75%" stopColor="#B48A5E" />
                            <stop offset="100%" stopColor="#8C6239" />
                          </linearGradient>
                        </defs>
                        {/* Ribbon body with inward tail notch on the right */}
                        <path d="M0 0 H115 L108 13 L115 26 H0 Z" fill="url(#gold-ribbon-grad)" />
                        {/* Glowing gold inner border accent */}
                        <path d="M0 1.5 H111 L105.5 13 L111 24.5 H0" stroke="#FEF08A" strokeWidth="0.8" strokeOpacity="0.8" fill="none" />
                      </svg>
                      {/* Ribbon text centered slightly left to align with notch */}
                      <span className="relative z-10 text-[#2A1F16] text-[8.5px] font-black uppercase tracking-widest leading-none pr-2.5 pt-0.5">
                        {slide?.isFlashSale ? "FLASH SALE 🔥" : "Promo Spesial"}
                      </span>
                    </div>
                    
                    <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                      <h2 className="font-serif text-lg md:text-2xl font-black text-white leading-tight tracking-tight whitespace-pre-line">
                        {slide?.headline || slide?.alt}
                      </h2>
                      {slide?.isFlashSale && (slide as any).endDate && (
                        <PromoCountdown endDate={(slide as any).endDate} className="bg-rose-600 text-white font-extrabold shadow-sm border border-rose-500/25 shrink-0 self-start sm:self-auto" />
                      )}
                    </div>
                    <p className="text-[10px] md:text-[12px] text-neutral-200 mt-1 leading-snug font-semibold max-w-xl">
                      {slide?.subheadline}
                    </p>
                  </div>
                </div>
              );
            })()}

            <div className="absolute bottom-5 right-5 flex items-center gap-1.5 select-none z-20">
              {displayBanners.map((_, idx) => (
                <button
                  key={idx}
                  onClick={(e) => {
                    e.stopPropagation();
                    setCurrentSlide(idx);
                  }}
                  className={`h-1.5 rounded-full transition-all duration-500 ease-out ${
                    idx === currentSlide ? 'w-5 bg-[#D4A574]' : 'w-1.5 bg-white/40'
                  }`}
                  aria-label={`Go to slide ${idx + 1}`}
                />
              ))}
            </div>
          </div>
        </motion.div>

        {/* Welcome & Referral Widget Banner (Shown for both authenticated users and guests) */}
        <div className="max-w-6xl mx-auto px-4 sm:px-6 mt-6 relative z-10">
          <motion.div 
            onClick={() => {
              if (status === 'authenticated') {
                window.location.href = '/profile?section=referral';
              } else {
                openLogin();
              }
            }}
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.15 }}
            style={{
              backgroundImage: "url('/brand/referral_bg.png')",
              backgroundSize: 'cover',
              backgroundPosition: 'center',
            }}
            className="border-2 border-[#D4A574]/60 p-4 sm:p-5 rounded-[2rem] shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative overflow-hidden cursor-pointer hover:shadow-lg transition-all group"
          >
            <div className="flex items-center gap-3 sm:gap-4.5 z-10 w-full sm:w-auto">
              {/* Stacked hands vector */}
              <div className="w-12 h-12 sm:w-14 sm:h-14 shrink-0 flex items-center justify-center select-none bg-[#704F37]/10 rounded-2xl border border-[#D4A574]/40 relative shadow-inner">
                <svg viewBox="0 0 100 100" className="w-9 h-9 sm:w-11 sm:h-11 text-[#704F37]" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" xmlns="http://www.w3.org/2000/svg">
                  {/* Stacked hands graphics */}
                  <path d="M22 22 L40 40 M30 18 L44 32" stroke="#8C6239" strokeWidth="3" />
                  <path d="M40 40 C43 43, 48 39, 44 35 C42 33, 38 31, 35 32" stroke="#8C6239" strokeWidth="2.5" fill="#EADFC9" />
                  <path d="M78 22 L60 40 M70 18 L56 32" stroke="#B48A5E" strokeWidth="3" />
                  <path d="M60 40 C57 43, 52 39, 56 35 C58 33, 62 31, 65 32" stroke="#B48A5E" strokeWidth="2.5" fill="#EADFC9" />
                  <path d="M22 80 L40 60 M30 82 L44 68" stroke="#946F48" strokeWidth="3" />
                  <path d="M40 60 C43 57, 48 61, 44 65 C42 67, 38 69, 35 68" stroke="#946F48" strokeWidth="2.5" fill="#EADFC9" />
                  <path d="M78 80 L60 60 M70 82 L56 68" stroke="#D4A574" strokeWidth="3" />
                  <path d="M60 60 C57 57, 52 61, 56 65 C58 67, 62 69, 65 68" stroke="#D4A574" strokeWidth="2.5" fill="#EADFC9" />
                  <circle cx="50" cy="50" r="10" fill="#EADFC9" stroke="#704F37" strokeWidth="2" />
                  <path d="M47 50 L53 50 M50 47 L50 53" stroke="#704F37" strokeWidth="2" />
                  <path d="M12 50 L14 47 L16 50 L14 53 Z M88 50 L86 47 L84 50 L86 53 Z M50 12 L48 15 L50 18 L52 15 Z M50 88 L48 85 L50 82 L52 85 Z" fill="#D4A574" stroke="none" />
                </svg>
              </div>
              <div className="flex-1">
                <h3 className="font-serif font-black text-xs md:text-sm text-gray-900 leading-snug">
                  Ajak Teman, Dapat Reward Voucher!
                </h3>
                <div className="flex items-start gap-1 mt-1 text-[10px] text-gray-500 font-semibold max-w-xl">
                  <span className="shrink-0">🤝</span>
                  <p className="leading-tight">
                    Temanmu dapat diskon <span className="font-bold text-gray-800">Rp3.000</span>, kamu mendapat <span className="font-bold text-[#8C6239]">Poin / Voucher</span> reward menarik!
                  </p>
                </div>
              </div>
            </div>

            {/* Styled "Undang Teman" Button with Gold Star Badge */}
            <div className="flex items-center justify-center gap-1.5 px-4.5 py-2.5 bg-[#704F37] hover:bg-[#5C3E2B] text-white rounded-full text-[11px] font-bold shadow-md group-hover:scale-102 transition-all w-full sm:w-auto flex-shrink-0 z-10">
              <span>Undang Teman</span>
              <div className="w-4 h-4 rounded-full bg-white/20 flex items-center justify-center shrink-0">
                <Star className="w-2.5 h-2.5 fill-white stroke-none" />
              </div>
            </div>
          </motion.div>
        </div>

        {/* Content Sections */}
        <motion.div 
          initial={{ y: 40, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.7 }}
          className="max-w-6xl mx-auto px-4 sm:px-6 mt-8 space-y-8 relative z-10"
        >
          {/* Custom Studio Banner Direct Link */}
          <div className="bg-gradient-to-tr from-[#2E5A44] to-[#1E3F20] text-white rounded-[2.5rem] p-6 shadow-md border-2 border-[#D4A574]/40 flex flex-col md:flex-row items-center justify-between gap-4 relative overflow-hidden select-none">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(254,240,138,0.2)_0%,_rgba(0,0,0,0)_60%)] pointer-events-none" />
            <div className="space-y-1.5 text-left z-10">
              <span className="bg-[#FEF08A]/20 text-[#FEF08A] text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest leading-none">
                ✦ Studio Menu Baru ✦
              </span>
              <h3 className="font-serif font-black text-lg md:text-xl text-white tracking-tight leading-none mt-1">
                Custom Matcha Studio
              </h3>
              <p className="text-[11px] text-gray-200 font-semibold max-w-xl">
                Jadilah master blender! Racik sendiri kadar matcha murni, susu oat/almond premium, tingkat kemanisan, dan aneka toppings sesukamu.
              </p>
            </div>
            <button 
              onClick={() => window.location.href = '/custom-studio'}
              className="w-full md:w-auto px-6 py-3.5 bg-gradient-to-tr from-[#FEF08A] to-[#D4A574] hover:shadow-lg active:scale-98 transition-all text-[#2A1F16] text-[12px] font-black rounded-2xl shadow-md z-10 flex items-center justify-center gap-1.5 shrink-0"
            >
              <span>Mulai Meracik</span> 🧪
            </button>
          </div>

          {/* Teman Cuaca Hari Ini Widget */}
          {!loadingWeather && weatherData && (
            <section className="bg-white rounded-[2rem] border border-gray-150 p-6 shadow-sm overflow-hidden text-left relative">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-5 border-b border-gray-100 pb-4">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="text-xl leading-none">🌤️</span>
                    <h3 className="font-serif font-black text-base md:text-lg text-gray-950 tracking-tight">
                      Teman Cuaca Hari Ini
                    </h3>
                  </div>
                  <p className="text-[9px] text-gray-400 font-bold uppercase tracking-wider">
                    Rekomendasi minuman kurasi otomatis berdasarkan cuaca lokalmu
                  </p>
                </div>

                {/* Weather details pill */}
                <div className="flex items-center gap-2.5 bg-[#2E5A44]/5 border border-[#2E5A44]/10 px-3.5 py-1.5 rounded-2xl shrink-0 self-start sm:self-auto shadow-inner">
                  <span className="text-sm font-bold text-gray-700">{weatherData.weather.city}</span>
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-xs font-black text-[#2E5A44]">{weatherData.weather.temp.toFixed(1)}°C</span>
                  <span className="text-[10px] bg-[#2E5A44]/10 text-[#2E5A44] font-black uppercase px-2 py-0.5 rounded-lg leading-none">
                    {weatherData.weather.description}
                  </span>
                </div>
              </div>

              {/* Tagline */}
              <p className="text-xs text-gray-600 font-semibold italic bg-gray-50 p-3.5 rounded-2xl border border-gray-100 mb-5 leading-relaxed">
                "{weatherData.tagline}"
              </p>

              {/* Recommended Items horizontal scrolls */}
              <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide">
                {weatherData.recommendations.map((p: any) => {
                  const isSoldOut = p.badge === 'sold-out';
                  const promo = getActivePromo(p);
                  const displayPrice = promo ? promo.promoPrice : p.price;
                  const originalPrice = promo ? p.price : (p.modifiers?.originalPrice || null);

                  return (
                    <div 
                      key={p.id}
                      onClick={() => handleProductClick(p)}
                      className={`w-[135px] md:w-[155px] shrink-0 bg-white/50 border border-gray-150 rounded-2xl p-2.5 hover:border-[#2E5A44]/30 hover:shadow-[0_8px_30px_rgba(0,0,0,0.035)] transition-all cursor-pointer overflow-hidden relative group`}
                    >
                      {p.image && (
                        <div className="relative w-full aspect-square rounded-xl overflow-hidden bg-[#FAF8F5] mb-2 border border-gray-100 shadow-sm animate-pulse-once">
                          <Image
                            src={p.image}
                            alt={p.name}
                            fill
                            sizes="120px"
                            className="object-cover group-hover:scale-103 transition-transform"
                          />
                        </div>
                      )}
                      <p className="font-serif font-black text-[11px] text-gray-900 line-clamp-1 leading-tight">{p.name}</p>
                      <span className="font-bold text-[10px] text-[#B48A5E] mt-1 block">
                        {formatRupiah(displayPrice)}
                      </span>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {/* Rekomendasi AI Anda Section */}
          {!loadingAi && aiData.length > 0 && (
            <section className="bg-white rounded-[2rem] border border-gray-150 p-6 shadow-sm overflow-hidden text-left relative">
              <div className="flex items-center justify-between mb-5">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-1.5">
                    <Sparkles className="w-5 h-5 text-[#2E5A44] fill-[#2E5A44]/10" />
                    <h3 className="font-serif font-black text-base md:text-lg text-gray-950 tracking-tight">
                      Rekomendasi AI Anda
                    </h3>
                  </div>
                  <p className="text-[9px] text-gray-400 font-bold uppercase tracking-wider">
                    Sajian terbaik yang dipersonalisasi khusus berdasarkan selera unikmu
                  </p>
                </div>
                <span className="text-[8px] font-black uppercase text-[#2E5A44] bg-[#2E5A44]/10 px-2.5 py-1 rounded-full tracking-widest leading-none">
                  ✦ AI Engine v2.0
                </span>
              </div>

              {/* Cards Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                {aiData.map((rec: any) => {
                  const p = rec.product;
                  const isSoldOut = p.badge === 'sold-out';
                  const promo = getActivePromo(p);
                  const displayPrice = promo ? promo.promoPrice : p.price;

                  return (
                    <div 
                      key={p.id}
                      onClick={() => handleProductClick(p)}
                      className="bg-white/80 border border-[#2E5A44]/15 rounded-3xl p-4 shadow-[0_8px_30px_rgba(0,0,0,0.015)] hover:border-[#2E5A44]/30 hover:shadow-md transition-all cursor-pointer relative overflow-hidden group flex flex-col justify-between"
                    >
                      <div className="absolute top-2 right-2 bg-gradient-to-tr from-[#FEF08A] to-[#D4A574] text-[#2A1F16] text-[8px] font-black px-2 py-0.5 rounded-full uppercase leading-none shadow-sm z-10 flex items-center gap-0.5">
                        <span>Recommended</span> ✦
                      </div>

                      <div className="space-y-3">
                        {p.image && (
                          <div className="relative w-full h-32 rounded-2xl overflow-hidden bg-[#FAF8F5] border border-gray-100 shadow-sm">
                            <Image
                              src={p.image}
                              alt={p.name}
                              fill
                              sizes="(max-width: 768px) 100vw, 300px"
                              className="object-cover group-hover:scale-102 transition-transform"
                            />
                          </div>
                        )}
                        <div className="space-y-1">
                          <h4 className="font-serif font-black text-sm text-gray-900 group-hover:text-[#2E5A44] transition-colors leading-tight">
                            {p.name}
                          </h4>
                          <span className="font-black text-xs text-[#B48A5E]">
                            {formatRupiah(displayPrice)}
                          </span>
                        </div>
                        {/* Custom text rationale */}
                        <p className="text-[10px] text-gray-500 font-semibold leading-relaxed border-t border-gray-100 pt-2.5">
                          {rec.rationale}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {/* Paket Combo */}
          {comboProducts.length > 0 && (
            <section className="bg-white rounded-[2rem] border border-gray-100 p-6 shadow-sm">
              <div className="flex items-center justify-between mb-5">
                <h3 className="font-serif font-black text-base md:text-lg text-gray-900 tracking-tight flex items-center gap-1.5">
                  <ShoppingBag className="w-5 h-5 text-[#2E5A44]" /> Paket Combo Hemat
                </h3>
                <span onClick={() => setSearchOpen(true)} className="text-[10px] md:text-xs text-[#946F48] font-bold flex items-center gap-0.5 cursor-pointer hover:text-[#B48A5E] transition-colors uppercase tracking-wider select-none">
                  Semua Combo <ChevronRight className="w-3.5 h-3.5" />
                </span>
              </div>


              <div className="flex gap-4 overflow-x-auto pb-3 scrollbar-hide">
                {comboProducts.map((p) => {
                  const isSoldOut = p.badge === 'sold-out';
                  const promo = getActivePromo(p);
                  const displayPrice = promo ? promo.promoPrice : p.price;
                  const originalPrice = promo ? p.price : (p.modifiers?.originalPrice || null);

                  return (
                    <div 
                      key={p.id}
                      onClick={() => handleProductClick(p)}
                      className={`w-[145px] md:w-[175px] shrink-0 bg-white/70 backdrop-blur-md border border-[#D4A574]/15 shadow-[0_8px_30px_rgba(0,0,0,0.025)] transition-all duration-300 rounded-3xl p-3 relative group overflow-hidden ${
                        isSoldOut
                          ? 'opacity-60 cursor-not-allowed'
                          : 'hover:border-[#B48A5E]/40 hover:shadow-[0_12px_40px_rgba(180,138,94,0.12)] hover:-translate-y-1.5 cursor-pointer'
                      }`}
                    >
                      {p.image && (
                        <div className="relative w-full aspect-square rounded-2xl overflow-hidden bg-white mb-2.5 border border-[#EADFC9]/20 shadow-sm">
                          <Image
                            src={p.image}
                            alt={p.name}
                            fill
                            sizes="(max-width: 768px) 120px, 150px"
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
                              <span className="absolute top-1.5 right-1.5 z-10 px-1.5 py-0.5 rounded-lg bg-white/90 backdrop-blur-md text-[#D4A574] text-[8px] font-black shadow-sm flex items-center gap-0.5 leading-none">
                                <Star className="w-3 h-3 fill-[#D4A574] stroke-none" /> 4.9
                              </span>
                              {promo && (
                                <div className="absolute top-1.5 left-1.5 z-20">
                                  <PromoCountdown endDate={promo.endDate} compact />
                                </div>
                              )}
                            </>
                          )}
                        </div>
                      )}

                      <div className="flex-grow flex flex-col justify-between">
                        <p className="font-serif font-bold text-xs text-gray-900 line-clamp-1 leading-snug group-hover:text-[#2E5A44] transition-colors">
                          {p.name}
                        </p>
                        <div className="flex flex-col mt-2">
                          {originalPrice && originalPrice > displayPrice && (
                            <span className="text-[10px] text-muted-foreground line-through leading-none mb-1">
                              {formatRupiah(originalPrice)}
                            </span>
                          )}
                          <p className="font-bold text-xs text-[#B48A5E] leading-none">
                            {formatRupiah(displayPrice)}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {/* Spesial Hari Ini */}
          <section className="bg-white rounded-[2rem] border border-gray-100 p-6 shadow-sm">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-serif font-black text-base md:text-lg text-gray-900 tracking-tight flex items-center gap-1.5">
                <Flame className="w-5 h-5 text-amber-500 fill-amber-500/20" /> Spesial Hari Ini
              </h3>
              <span onClick={() => setSearchOpen(true)} className="text-[10px] md:text-xs text-[#946F48] font-bold flex items-center gap-0.5 cursor-pointer hover:text-[#B48A5E] transition-colors uppercase tracking-wider select-none">
                Semua Menu <ChevronRight className="w-3.5 h-3.5" />
              </span>
            </div>

            <div className="flex gap-4 overflow-x-auto pb-3 scrollbar-hide">
              {spesialProducts.map((p) => {
                const isSoldOut = p.badge === 'sold-out';
                const promo = getActivePromo(p);
                const displayPrice = promo ? promo.promoPrice : p.price;
                const originalPrice = promo ? p.price : (p.modifiers?.originalPrice || null);

                return (
                  <div 
                    key={p.id}
                    onClick={() => handleProductClick(p)}
                    className={`w-[145px] md:w-[175px] shrink-0 bg-white/70 backdrop-blur-md border border-[#D4A574]/15 shadow-[0_8px_30px_rgba(0,0,0,0.025)] transition-all duration-300 rounded-3xl p-3 relative group overflow-hidden ${
                      isSoldOut
                        ? 'opacity-60 cursor-not-allowed'
                        : 'hover:border-[#B48A5E]/40 hover:shadow-[0_12px_40px_rgba(180,138,94,0.12)] hover:-translate-y-1.5 cursor-pointer'
                    }`}
                  >
                    {p.image && (
                      <div className="relative w-full aspect-square rounded-2xl overflow-hidden bg-white mb-2.5 border border-[#EADFC9]/20 shadow-sm">
                        <Image
                          src={p.image}
                          alt={p.name}
                          fill
                          sizes="(max-width: 768px) 120px, 150px"
                          className={`object-cover group-hover:scale-105 transition-transform duration-555 ease-out ${
                            isSoldOut ? 'grayscale brightness-50' : ''
                          }`}
                        />
                        {isSoldOut ? (
                          <div className="absolute inset-0 bg-black/40 flex items-center justify-center z-20">
                            <span className="bg-black/85 text-white font-extrabold text-[8px] px-2 py-0.5 rounded-md tracking-wider uppercase">
                              Habis
                            </span>
                          </div>
                        ) : (
                          <>
                            <span className="absolute top-1.5 right-1.5 z-10 px-1.5 py-0.5 rounded-lg bg-white/90 backdrop-blur-md text-[#D4A574] text-[8px] font-black shadow-sm flex items-center gap-0.5 leading-none">
                              <Star className="w-3 h-3 fill-[#D4A574] stroke-none" /> 4.9
                            </span>
                            {promo && (
                              <div className="absolute top-1.5 left-1.5 z-20">
                                <PromoCountdown endDate={promo.endDate} compact />
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    )}

                    <div className="flex-grow flex flex-col justify-between">
                      <p className="font-serif font-bold text-xs text-gray-900 line-clamp-1 leading-snug group-hover:text-[#2E5A44] transition-colors">
                        {p.name}
                      </p>
                      <div className="mt-2 flex flex-col items-baseline">
                        {originalPrice && originalPrice > displayPrice && (
                          <span className="text-[10px] text-muted-foreground line-through leading-none mb-1">
                            {formatRupiah(originalPrice)}
                          </span>
                        )}
                        <span className="font-bold text-xs text-[#B48A5E]">
                          {formatRupiah(displayPrice)}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
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
              {baruProducts.map((p) => {
                const isSoldOut = p.badge === 'sold-out';
                const promo = getActivePromo(p);
                const displayPrice = promo ? promo.promoPrice : p.price;
                const originalPrice = promo ? p.price : (p.modifiers?.originalPrice || null);

                return (
                  <div 
                    key={p.id}
                    onClick={() => handleProductClick(p)}
                    className={`w-[145px] md:w-[175px] shrink-0 bg-white/70 backdrop-blur-md border border-[#D4A574]/15 shadow-[0_8px_30px_rgba(0,0,0,0.025)] transition-all duration-300 rounded-3xl p-3 relative group overflow-hidden ${
                      isSoldOut
                        ? 'opacity-60 cursor-not-allowed'
                        : 'hover:border-[#B48A5E]/40 hover:shadow-[0_12px_40px_rgba(180,138,94,0.12)] hover:-translate-y-1.5 cursor-pointer'
                    }`}
                  >
                    {p.image && (
                      <div className="relative w-full aspect-square rounded-2xl overflow-hidden bg-white mb-2.5 border border-[#EADFC9]/20 shadow-sm">
                        <Image
                          src={p.image}
                          alt={p.name}
                          fill
                          sizes="(max-width: 768px) 120px, 150px"
                          className={`object-cover group-hover:scale-105 transition-transform duration-555 ease-out ${
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
                            {promo && (
                              <div className="absolute top-1.5 left-1.5 z-20">
                                <PromoCountdown endDate={promo.endDate} compact />
                              </div>
                            )}
                            {promo ? (
                              <span className="absolute bottom-1.5 left-1.5 z-10 px-2 py-0.5 rounded-full bg-rose-500 text-white text-[8px] font-black shadow-sm uppercase tracking-wider flex items-center gap-0.5 leading-none">
                                Promo
                              </span>
                            ) : (
                              <span className="absolute bottom-1.5 left-1.5 z-10 px-2 py-0.5 rounded-full bg-[#E8F5E9] text-[#2E7D32] text-[8px] font-black shadow-sm uppercase tracking-wider flex items-center gap-0.5 leading-none">
                                New
                              </span>
                            )}
                          </>
                        )}
                      </div>
                    )}

                    <div className="flex-grow flex flex-col justify-between">
                      <p className="font-serif font-bold text-xs text-gray-900 line-clamp-1 leading-snug group-hover:text-[#2E5A44] transition-colors">
                        {p.name}
                      </p>
                      <div className="flex flex-col mt-2">
                        {originalPrice && originalPrice > displayPrice && (
                          <span className="text-[10px] text-muted-foreground line-through leading-none mb-1">
                            {formatRupiah(originalPrice)}
                          </span>
                        )}
                        <p className="font-bold text-xs text-[#B48A5E] leading-none">
                          {formatRupiah(displayPrice)}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
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
              {makananProducts.map((p) => {
                const isSoldOut = p.badge === 'sold-out';
                const promo = getActivePromo(p);
                const displayPrice = promo ? promo.promoPrice : p.price;
                const originalPrice = promo ? p.price : (p.modifiers?.originalPrice || null);

                return (
                  <div 
                    key={p.id}
                    onClick={() => handleProductClick(p)}
                    className={`bg-white/80 backdrop-blur-sm border border-[#D4A574]/15 shadow-[0_6px_20px_rgba(0,0,0,0.015)] transition-all duration-300 rounded-3xl p-3.5 relative group overflow-hidden ${
                      isSoldOut
                        ? 'opacity-60 cursor-not-allowed'
                        : 'hover:border-[#B48A5E]/45 hover:shadow-[0_12px_35px_rgba(180,138,94,0.1)] hover:-translate-y-1.5 cursor-pointer'
                    }`}
                  >
                    {p.image && (
                      <div className="relative w-full aspect-[4/3] rounded-2xl overflow-hidden bg-[#FAF8F5] mb-2.5 border border-[#EADFC9]/30 shadow-sm">
                        <Image
                          src={p.image}
                          alt={p.name}
                          fill
                          sizes="(max-width: 768px) 120px, 150px"
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
                            {promo && (
                              <div className="absolute top-1.5 left-1.5 z-20">
                                <PromoCountdown endDate={promo.endDate} compact />
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    )}

                    <div className="flex-grow flex flex-col justify-between">
                      <p className="font-serif font-bold text-xs text-gray-900 line-clamp-1 leading-snug group-hover:text-[#2E5A44] transition-colors">
                        {p.name}
                      </p>
                      <div className="flex flex-col mt-2">
                        {originalPrice && originalPrice > displayPrice && (
                          <span className="text-[10px] text-muted-foreground line-through leading-none mb-1">
                            {formatRupiah(originalPrice)}
                          </span>
                        )}
                        <p className="font-bold text-xs text-gray-800 leading-none">
                          {formatRupiah(displayPrice)}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* Matcha Moments - Featured Reviews Slideshow */}
          {!loadingReviews && featuredReviews.length > 0 && (
            <section className="bg-white rounded-[2rem] border border-gray-100 p-6 shadow-sm overflow-hidden">
              <div className="flex items-center justify-between mb-5">
                <h3 className="font-serif font-black text-base md:text-lg text-gray-950 tracking-tight flex items-center gap-1.5">
                  <Star className="w-5 h-5 text-yellow-500 fill-yellow-500/20" /> Matcha Moments
                </h3>
                <span className="text-[9px] md:text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                  Momen Manis Bersama Matchaboy
                </span>
              </div>

              <div className="flex gap-5 overflow-x-auto pb-4 pt-1 scrollbar-hide">
                {featuredReviews.map((review: any) => {
                  let imageUrls: string[] = [];
                  try {
                    if (review.images) {
                      imageUrls = JSON.parse(review.images);
                    }
                  } catch (e) {
                    console.error('Failed to parse review images', e);
                  }

                  const firstImage = imageUrls.length > 0 ? imageUrls[0] : null;

                  return (
                    <div
                      key={review.id}
                      className="w-[280px] md:w-[320px] shrink-0 bg-[#FAF8F5] border border-[#D4A574]/15 rounded-3xl overflow-hidden shadow-sm flex flex-col justify-between hover:shadow-md hover:border-[#D4A574]/30 transition-all duration-300"
                    >
                      {/* Review Photo */}
                      <div className="relative w-full h-40 bg-stone-200 overflow-hidden">
                        {firstImage ? (
                          <Image
                            src={firstImage}
                            alt="Ulasan customer"
                            fill
                            className="object-cover"
                            sizes="(max-width: 768px) 280px, 320px"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = review.product?.image || 'https://images.unsplash.com/photo-1536256263959-770b48d82b0a?auto=format&fit=crop&q=80&w=1200';
                            }}
                          />
                        ) : (
                          <div className="w-full h-full flex flex-col items-center justify-center bg-[#2E5A44]/5 relative p-4">
                            <span className="text-3xl select-none">🍵</span>
                            <span className="text-[10px] font-black text-[#2E5A44] mt-2 tracking-widest uppercase">Matchaboy Moment</span>
                          </div>
                        )}
                        {/* Rating Badge */}
                        <div className="absolute top-3 left-3 bg-white/95 backdrop-blur-sm px-2.5 py-1 rounded-full shadow-sm flex items-center gap-0.5 z-10">
                          {Array.from({ length: 5 }).map((_, i) => (
                            <Star
                              key={i}
                              className={`w-3.5 h-3.5 ${
                                i < review.rating
                                  ? 'fill-yellow-400 stroke-yellow-500'
                                  : 'fill-gray-100 stroke-gray-300'
                              }`}
                            />
                          ))}
                        </div>
                      </div>

                      {/* Content details */}
                      <div className="p-4 flex-grow flex flex-col justify-between space-y-3">
                        <div className="space-y-1.5">
                          <p className="text-xs text-gray-700 font-semibold italic line-clamp-3 leading-relaxed text-left">
                            "{review.comment || 'Enak banget, matcha terenak yang pernah kucoba! 💚'}"
                          </p>
                        </div>

                        <div className="flex items-center justify-between pt-2 border-t border-gray-150">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-full overflow-hidden bg-[#2E5A44]/10 border border-[#FAF8F5] relative shrink-0">
                              <Image
                                src={review.user?.image || `https://ui-avatars.com/api/?name=${encodeURIComponent(review.user?.name || 'C')}&background=2E5A44&color=FFFFFF&bold=true`}
                                alt={review.user?.name || 'Customer'}
                                fill
                                className="object-cover"
                              />
                            </div>
                            <div className="flex flex-col text-left">
                              <span className="text-[10px] font-black text-gray-900 line-clamp-1 leading-tight">
                                {review.user?.name || 'Matcha Lover'}
                              </span>
                              <span className="text-[8px] text-gray-400 font-bold uppercase tracking-wider">
                                Terverifikasi
                              </span>
                            </div>
                          </div>

                          {review.product && (
                            <div className="bg-[#2E5A44]/5 text-[#2E5A44] px-2 py-0.5 rounded-lg text-[9px] font-black uppercase max-w-[100px] truncate leading-tight select-none">
                              {review.product.name}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

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

      {/* Floating Gacha Trigger Button */}
      <AnimatePresence>
        {status === 'authenticated' && gachaChances > 0 && (
          <motion.button
            initial={{ scale: 0, y: 50 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0, y: 50 }}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => setIsGachaOpen(true)}
            className="fixed bottom-24 right-4 z-40 p-4 bg-gradient-to-tr from-[#704F37] to-[#D4A574] text-white rounded-full shadow-2xl flex items-center justify-center border-2 border-[#FEF08A] hover:shadow-yellow-300/40 select-none touch-none"
            style={{
              boxShadow: '0 10px 25px rgba(112, 79, 55, 0.4), 0 0 15px rgba(254, 240, 138, 0.3)'
            }}
          >
            <Gift className="w-6 h-6 animate-pulse" />
            <span className="absolute -top-1 -right-1 w-5.5 h-5.5 rounded-full bg-rose-600 text-white font-extrabold text-[9px] flex items-center justify-center border border-white">
              {gachaChances}
            </span>
          </motion.button>
        )}
      </AnimatePresence>

      {/* Gacha Lucky Draw Spin-the-wheel game overlay */}
      <GachaOverlay
        isOpen={isGachaOpen}
        onClose={() => setIsGachaOpen(false)}
        gachaChances={gachaChances}
        onSpinSuccess={(newChances) => {
          setGachaChances(newChances);
        }}
      />
    </>
  );
}

// Map real OpenWeatherMap descriptions to the 7 weather rows
const getWeatherCategory = (
  condition: string,
  description: string
): 'cerah' | 'cerah_berawan' | 'berawan' | 'berawan_tebal' | 'gerimis' | 'hujan_ringan' | 'hujan_sedang' => {
  const cond = condition.toLowerCase();
  const desc = description.toLowerCase();
  
  if (desc.includes('gerimis') || desc.includes('drizzle') || desc.includes('rindu gerimis')) return 'gerimis';
  if (desc.includes('hujan ringan') || desc.includes('light rain') || desc.includes('rindu hujan ringan')) return 'hujan_ringan';
  if (cond.includes('rain') || cond.includes('storm') || desc.includes('hujan')) return 'hujan_sedang';
  if (desc.includes('berawan tebal') || desc.includes('overcast') || desc.includes('kabut') || desc.includes('fog')) return 'berawan_tebal';
  if (desc.includes('cerah berawan') || desc.includes('partly cloudy')) return 'cerah_berawan';
  if (cond.includes('cloud') || desc.includes('berawan')) return 'berawan';
  return 'cerah';
};

// Animated Weather SVG/CSS Overlay Component
function WeatherEffectOverlay({
  timePeriod,
  category
}: {
  timePeriod: 'pagi' | 'siang' | 'sore' | 'malam';
  category: 'cerah' | 'cerah_berawan' | 'berawan' | 'berawan_tebal' | 'gerimis' | 'hujan_ringan' | 'hujan_sedang';
}) {
  const isNight = timePeriod === 'malam';
  
  // Render rain drops falling dynamically
  const renderRain = (count: number, speed: number) => {
    return Array.from({ length: count }).map((_, i) => {
      const left = Math.random() * 100;
      const delay = Math.random() * 2;
      const duration = 0.5 + Math.random() * speed;
      return (
        <div
          key={i}
          className="absolute w-[1.5px] h-3.5 bg-blue-100/40 rounded-full"
          style={{
            left: `${left}%`,
            top: `-20px`,
            animation: `fall-rain ${duration}s linear infinite`,
            animationDelay: `${delay}s`,
          }}
        />
      );
    });
  };

  return (
    <div className="absolute inset-0 w-full h-full overflow-hidden select-none pointer-events-none z-10">
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes float-cloud-1 {
          0% { transform: translateX(-10px) translateY(0); }
          50% { transform: translateX(10px) translateY(-2px); }
          100% { transform: translateX(-10px) translateY(0); }
        }
        @keyframes float-cloud-2 {
          0% { transform: translateX(15px) translateY(0); }
          50% { transform: translateX(-10px) translateY(1.5px); }
          100% { transform: translateX(15px) translateY(0); }
        }
        @keyframes spin-sun {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        @keyframes twinkle-star {
          0%, 100% { opacity: 0.2; transform: scale(0.7); }
          50% { opacity: 1; transform: scale(1.1); }
        }
        @keyframes fall-rain {
          0% { transform: translateY(-10px) rotate(15deg); opacity: 0; }
          40% { opacity: 0.65; }
          100% { transform: translateY(160px) rotate(15deg); opacity: 0; }
        }
        @keyframes flash-lightning {
          0%, 94%, 96%, 98%, 100% { opacity: 0; }
          95%, 97% { opacity: 0.45; }
        }
      `}} />

      {/* Lightning Flash effect for heavy rain */}
      {category === 'hujan_sedang' && (
        <div className="absolute inset-0 bg-white z-0 pointer-events-none" style={{ animation: 'flash-lightning 7s ease-in-out infinite' }} />
      )}

      {/* Stars for Night Period */}
      {isNight && (
        <div className="absolute inset-0 z-0">
          {[
            { top: '15%', left: '12%', delay: '0.4s' },
            { top: '22%', left: '28%', delay: '1.1s' },
            { top: '10%', left: '42%', delay: '0.7s' },
            { top: '28%', left: '58%', delay: '1.9s' },
            { top: '12%', left: '72%', delay: '1.4s' },
            { top: '24%', left: '88%', delay: '0.2s' },
          ].map((star, i) => (
            <div
              key={i}
              className="absolute w-1 h-1 bg-white rounded-full shadow-[0_0_3px_#fff]"
              style={{
                top: star.top,
                left: star.left,
                animation: `twinkle-star 2.2s ease-in-out infinite`,
                animationDelay: star.delay,
              }}
            />
          ))}
        </div>
      )}

      {/* Sun/Moon rendering based on Cerah / Partly Cloudy */}
      {(category === 'cerah' || category === 'cerah_berawan') && (
        <div className="absolute top-3 right-6 z-0">
          {isNight ? (
            /* Premium Crescent Moon */
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" className="text-yellow-100 drop-shadow-[0_0_8px_rgba(254,240,138,0.55)]">
              <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" fill="currentColor" />
            </svg>
          ) : (
            /* Premium Sun with animation */
            <svg 
              width="40" 
              height="40" 
              viewBox="0 0 24 24" 
              fill="none" 
              className={`${
                timePeriod === 'sore' ? 'text-orange-500 drop-shadow-[0_0_12px_rgba(249,115,22,0.6)]' : 'text-amber-400 drop-shadow-[0_0_10px_rgba(251,191,36,0.6)]'
              }`}
              style={{ animation: 'spin-sun 25s linear infinite' }}
            >
              <circle cx="12" cy="12" r="5" fill="currentColor" />
              <line x1="12" y1="1" x2="12" y2="3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              <line x1="12" y1="21" x2="12" y2="23" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              <line x1="1" y1="12" x2="3" y2="12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              <line x1="21" y1="12" x2="23" y2="12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          )}
        </div>
      )}

      {/* Cloud Layers based on category */}
      <div className="absolute inset-0 z-10 pointer-events-none">
        {/* Cerah Berawan (Partly Cloudy) - 1 wispy cloud */}
        {category === 'cerah_berawan' && (
          <svg 
            width="55" 
            height="32" 
            viewBox="0 0 24 16" 
            fill="currentColor" 
            className="absolute top-4 right-12 text-white/70 drop-shadow-sm"
            style={{ animation: 'float-cloud-1 6s ease-in-out infinite' }}
          >
            <path d="M18 10h-1.26A8 8 0 1 0 9 10H4a4 4 0 0 0 0 8h14a4 4 0 0 0 0-8z" />
          </svg>
        )}

        {/* Berawan (Cloudy) - 2 floating clouds */}
        {category === 'berawan' && (
          <>
            <svg 
              width="65" 
              height="38" 
              viewBox="0 0 24 16" 
              fill="currentColor" 
              className="absolute top-3 left-10 text-white/75 drop-shadow-sm"
              style={{ animation: 'float-cloud-1 7.5s ease-in-out infinite' }}
            >
              <path d="M18 10h-1.26A8 8 0 1 0 9 10H4a4 4 0 0 0 0 8h14a4 4 0 0 0 0-8z" />
            </svg>
            <svg 
              width="55" 
              height="32" 
              viewBox="0 0 24 16" 
              fill="currentColor" 
              className="absolute top-4 right-8 text-white/70 drop-shadow-sm"
              style={{ animation: 'float-cloud-2 5.5s ease-in-out infinite' }}
            >
              <path d="M18 10h-1.26A8 8 0 1 0 9 10H4a4 4 0 0 0 0 8h14a4 4 0 0 0 0-8z" />
            </svg>
          </>
        )}

        {/* Berawan Tebal (Overcast) - Multiple overlapping greyish clouds */}
        {category === 'berawan_tebal' && (
          <>
            <svg 
              width="85" 
              height="48" 
              viewBox="0 0 24 16" 
              fill="currentColor" 
              className="absolute top-1 left-6 text-neutral-300/80 drop-shadow-md"
              style={{ animation: 'float-cloud-1 9s ease-in-out infinite' }}
            >
              <path d="M18 10h-1.26A8 8 0 1 0 9 10H4a4 4 0 0 0 0 8h14a4 4 0 0 0 0-8z" />
            </svg>
            <svg 
              width="75" 
              height="42" 
              viewBox="0 0 24 16" 
              fill="currentColor" 
              className="absolute top-2 right-4 text-neutral-400/70 drop-shadow-md"
              style={{ animation: 'float-cloud-2 7.2s ease-in-out infinite' }}
            >
              <path d="M18 10h-1.26A8 8 0 1 0 9 10H4a4 4 0 0 0 0 8h14a4 4 0 0 0 0-8z" />
            </svg>
            <svg 
              width="65" 
              height="38" 
              viewBox="0 0 24 16" 
              fill="currentColor" 
              className="absolute top-3 left-1/3 text-neutral-200/85 drop-shadow-sm"
              style={{ animation: 'float-cloud-1 6.5s ease-in-out infinite', animationDelay: '0.8s' }}
            >
              <path d="M18 10h-1.26A8 8 0 1 0 9 10H4a4 4 0 0 0 0 8h14a4 4 0 0 0 0-8z" />
            </svg>
          </>
        )}

        {/* Gerimis / Hujan Ringan / Hujan Sedang Clouds */}
        {['gerimis', 'hujan_ringan', 'hujan_sedang'].includes(category) && (
          <>
            <svg 
              width="85" 
              height="48" 
              viewBox="0 0 24 16" 
              fill="currentColor" 
              className={`absolute top-1 left-6 drop-shadow-md ${category === 'hujan_sedang' ? 'text-neutral-500/75' : 'text-neutral-400/75'}`}
              style={{ animation: 'float-cloud-1 8s ease-in-out infinite' }}
            >
              <path d="M18 10h-1.26A8 8 0 1 0 9 10H4a4 4 0 0 0 0 8h14a4 4 0 0 0 0-8z" />
            </svg>
            <svg 
              width="75" 
              height="42" 
              viewBox="0 0 24 16" 
              fill="currentColor" 
              className={`absolute top-2 right-4 drop-shadow-md ${category === 'hujan_sedang' ? 'text-neutral-600/70' : 'text-neutral-500/65'}`}
              style={{ animation: 'float-cloud-2 6.2s ease-in-out infinite' }}
            >
              <path d="M18 10h-1.26A8 8 0 1 0 9 10H4a4 4 0 0 0 0 8h14a4 4 0 0 0 0-8z" />
            </svg>
          </>
        )}
      </div>

      {/* Falling raindrops overlays */}
      {category === 'gerimis' && renderRain(15, 0.75)}
      {category === 'hujan_ringan' && renderRain(26, 0.45)}
      {category === 'hujan_sedang' && renderRain(42, 0.28)}
    </div>
  );
}
