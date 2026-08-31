'use client';

import { useState, useMemo, useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import dynamic from 'next/dynamic';
import { useToast } from '@/components/ui/Toast';
import { useStorefrontContext } from './layout';
import { useCartStore } from '@/stores/cart-store';
import type { Product, Category } from '@/types';
import Image from 'next/image';
import { formatRupiah, getActivePromo, getEffectiveProductDisplay, cn } from '@/lib/utils';
import { motion, useMotionValue, useTransform, animate, AnimatePresence } from 'framer-motion';
import {
  Star,
  Sparkles,
  Flame,
  MessageCircle,
  Info,
  ChevronRight,
  ChevronDown,
  ShoppingBag,
  Clock,
  Gift,
  Copy,
  Check,
  Share2,
  Trophy,
  RefreshCw,
  FlaskConical,
  CreditCard,
  Plus,
  History,
  Trash2,
  ArrowUpRight,
  Leaf,
  Award,
  ShieldAlert,
  CheckCircle2,
  CalendarDays,
  Wallet,
  Loader2,
  CloudSun,
} from 'lucide-react';
import { PromoCountdown } from '@/components/storefront/PromoCountdown';
import {
  useWallet,
  useLoyalty,
  useWeather,
  useFeaturedReviews,
} from '@/hooks/use-cached-data';
import {
  WeatherWidgetSkeleton,
  FeaturedReviewsSkeleton,
  ArusPoinWalletSkeleton,
} from '@/components/ui/ShimmerSkeleton';
import {
  WeatherEffectOverlay,
  getWeatherCategory,
} from '@/components/storefront/WeatherEffectOverlay';

// Lazy-load heavy modal and overlay components (only loaded when user interacts)
const ProductModal = dynamic(
  () => import('@/components/storefront/ProductModal').then((m) => ({ default: m.ProductModal })),
  { ssr: false }
);
const SearchOverlay = dynamic(
  () => import('@/components/storefront/SearchOverlay').then((m) => ({ default: m.SearchOverlay })),
  { ssr: false }
);
const EasterEggOverlay = dynamic(
  () => import('@/components/storefront/EasterEggOverlay').then((m) => ({ default: m.EasterEggOverlay })),
  { ssr: false }
);
const GachaOverlay = dynamic(
  () => import('@/components/storefront/GachaOverlay').then((m) => ({ default: m.GachaOverlay })),
  { ssr: false }
);
const LeaderboardOverlay = dynamic(
  () => import('@/components/storefront/LeaderboardOverlay').then((m) => ({ default: m.LeaderboardOverlay })),
  { ssr: false }
);
const TopUpOverlay = dynamic(
  () => import('@/components/storefront/TopUpOverlay').then((m) => ({ default: m.TopUpOverlay })),
  { ssr: false }
);
const AutoReorderOverlay = dynamic(
  () => import('@/components/storefront/AutoReorderOverlay').then((m) => ({ default: m.AutoReorderOverlay })),
  { ssr: false }
);
const StoryBar = dynamic(
  () => import('@/components/storefront/StoryBar').then((m) => ({ default: m.StoryBar })),
  { ssr: false }
);

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
  banners,
  packagingStock,
}: {
  categories: Category[];
  products: Product[];
  banners: HeroBanner[];
  packagingStock?: { cupRegular: number; cupJumbo: number };
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
    if ((session.user as { phone?: string | null }).phone)
      return formatPhone((session.user as { phone?: string | null }).phone);
    if (session.user.email) return session.user.email.split('@')[0];
    return 'Pecinta Arum';
  }, [session, status]);

  const { showToast } = useToast();

  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { searchOpen, setSearchOpen, openLogin } = useStorefrontContext();

  const [isNight, setIsNight] = useState(false);
  const dragY = useMotionValue(0);
  const stretchHeight = useTransform(dragY, [0, 150], ['78px', '320px']);

  // Custom drag motion value for Easter Egg
  const [easterEggConfig, setEasterEggConfig] = useState<{
    enabled: boolean;
    discount: number;
    quota: number;
    hasClaimed: boolean;
  } | null>(null);
  const [isEasterEggExpanded, setIsEasterEggExpanded] = useState(false);
  const [isClaiming, setIsClaiming] = useState(false);

  // Gacha state
  const [gachaChances, setGachaChances] = useState(0);
  const [isGachaOpen, setIsGachaOpen] = useState(false);

  // Time period state
  const [timePeriod, setTimePeriod] = useState<'pagi' | 'siang' | 'sore' | 'malam'>('siang');
  const [weatherCategory, setWeatherCategory] = useState<
    'cerah' | 'cerah_berawan' | 'berawan' | 'berawan_tebal' | 'gerimis' | 'hujan_ringan' | 'hujan_sedang'
  >('cerah');

  // AI recommendations state (disabled / optional)
  const [aiData, setAiData] = useState<any[]>([]);
  const [loadingAi, setLoadingAi] = useState(true);

  // Geolocation coords for weather
  const [geoCoords, setGeoCoords] = useState<{ lat?: number; lon?: number }>({});

  // SWR Caching Hooks
  const {
    balance: walletBalance,
    transactions: walletTransactions,
    isLoading: loadingWallet,
    mutate: refreshWallet,
  } = useWallet();

  const {
    points,
    arusLevel,
    pointHistory,
    milestones,
    easterEgg: loyaltyEasterEgg,
    isLoading: loadingLoyalty,
    mutate: refreshLoyalty,
  } = useLoyalty();

  const {
    data: weatherData,
    isLoading: loadingWeather,
  } = useWeather(geoCoords.lat, geoCoords.lon);

  const {
    reviews: featuredReviews,
    isLoading: loadingReviews,
  } = useFeaturedReviews();

  // History and shortcut modal toggles
  const [showWalletHistory, setShowWalletHistory] = useState(false);
  const [showPointsHistory, setShowPointsHistory] = useState(false);
  const [isLeaderboardOpen, setIsLeaderboardOpen] = useState(false);
  const [isAutoReorderOpen, setIsAutoReorderOpen] = useState(false);
  const [isTopUpOpen, setIsTopUpOpen] = useState(false);

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
      `Cobain Arum Seduh! 🍵 Seduhan teh dan kopi istimewa. Daftar pakai link ini dan dapatkan diskon langsung Rp3.000 tanpa batas belanja:\n${getReferralUrl()}`
    );
    window.open(`https://wa.me/?text=${text}`, '_blank');
  };

  useEffect(() => {
    const hour = new Date().getHours();
    setIsNight(hour >= 18 || hour < 6);

    // Set exact time period: Pagi (06:00-10:00) | Siang (10:00-16:00) | Sore (16:00-18:00) | Malam (18:00-06:00)
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

      const table = params.get('table');
      if (table) {
        useCartStore.getState().setTableNumber(table);
        const url = new URL(window.location.href);
        url.searchParams.delete('table');
        window.history.replaceState({}, '', url.pathname + url.search);
      }

      const refCode = params.get('ref');
      if (refCode) {
        document.cookie = `pending_referral_code=${encodeURIComponent(
          refCode
        )}; path=/; max-age=${7 * 24 * 60 * 60}; SameSite=Lax`;

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

  // Sync EasterEgg from Loyalty SWR
  useEffect(() => {
    if (loyaltyEasterEgg) {
      setEasterEggConfig(loyaltyEasterEgg);
    }
  }, [loyaltyEasterEgg]);

  // Fetch Gacha chances on authenticated
  useEffect(() => {
    if (status === 'authenticated') {
      fetch('/api/user/gacha')
        .then((res) => res.json())
        .then((data) => {
          if (data?.gachaChances !== undefined) {
            setGachaChances(data.gachaChances);
          }
        })
        .catch((err) => console.error('Error fetching gacha chances:', err));
    }
  }, [status]);

  // Request precise geolocation for weather
  useEffect(() => {
    if (typeof window !== 'undefined' && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setGeoCoords({ lat: pos.coords.latitude, lon: pos.coords.longitude });
        },
        () => {
          // Graceful fallback to default weather
        },
        { enableHighAccuracy: false, timeout: 5000, maximumAge: 600000 }
      );
    }
  }, []);

  // Update weather animation category when weatherData changes
  useEffect(() => {
    if (weatherData?.weather?.condition) {
      const cond = weatherData.weather.condition;
      const desc = weatherData.weather.description || '';
      setWeatherCategory(getWeatherCategory(cond, desc));
    }
  }, [weatherData]);

  // AI Recommendations Fetch
  useEffect(() => {
    fetch('/api/ai/recommendations')
      .then((res) => res.json())
      .then((data) => {
        if (data?.success && data.recommendations) {
          setAiData(data.recommendations);
        }
      })
      .catch((err) => console.error('Error fetching AI recommendations:', err))
      .finally(() => setLoadingAi(false));
  }, [status]);

  const handleClaimEasterEgg = async () => {
    setIsClaiming(true);
    try {
      const res = await fetch('/api/user/loyalty/claim-easter-egg', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showToast(data.message || 'Selamat! Voucher rahasia berhasil diklaim!', 'success');
        setEasterEggConfig((prev) => (prev ? { ...prev, hasClaimed: true } : null));
        refreshLoyalty();
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
          subheadline: `Nikmati harga spesial hanya ${formatRupiah(promo.promoPrice)} (Hemat ${formatRupiah(
            p.price - promo.promoPrice
          )})! Buruan beli sebelum kehabisan!`,
          isFlashSale: true,
          product: p,
          endDate: promo.endDate,
        };
      });

    const baseBanners =
      banners.length > 0
        ? banners
        : [
            {
              id: '1',
              image: '/hero/hero-1.jpg',
              alt: 'Kopi Gratis',
              headline: 'Ajak Teman Bisa Dapat Kopi Gratis',
              subheadline: 'Buy 1 Get 1',
            },
            {
              id: '2',
              image: '/hero/hero-2.jpg',
              alt: 'Buy 1 Get 1',
              headline: 'Nikmati Promo Spesial Hari Ini',
              subheadline: 'Buy 1 Get 1',
            },
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
    const list = products.filter((p) => p.modifiers?.isBundle === true);
    return [...list].sort((a, b) => (a.badge === 'sold-out' ? 1 : 0) - (b.badge === 'sold-out' ? 1 : 0));
  }, [products]);

  const spesialProducts = useMemo(() => {
    const list = products.filter((p) => p.badge === 'best-seller' && p.modifiers?.isBundle !== true);
    const baseList = list.length > 0 ? list : products.slice(0, 4).filter((p) => p.modifiers?.isBundle !== true);
    return [...baseList].sort((a, b) => (a.badge === 'sold-out' ? 1 : 0) - (b.badge === 'sold-out' ? 1 : 0));
  }, [products]);

  const baruProducts = useMemo(() => {
    const list = products.filter((p) => p.badge === 'new');
    const baseList = list.length > 0 ? list : products.slice(1, 3);
    return [...baseList].sort((a, b) => (a.badge === 'sold-out' ? 1 : 0) - (b.badge === 'sold-out' ? 1 : 0));
  }, [products]);

  const makananProducts = useMemo(() => {
    const foodKeywords = [
      'roti',
      'croissant',
      'donut',
      'cake',
      'pastry',
      'sweet',
      'makanan',
      'bread',
      'bun',
      'pie',
      'chocolate',
      'keju',
      'susu',
    ];
    const list = products.filter((p) => {
      const nameLower = p.name.toLowerCase();
      const descLower = p.description.toLowerCase();
      const catLower = p.category.toLowerCase();
      return foodKeywords.some(
        (kw) => nameLower.includes(kw) || descLower.includes(kw) || catLower.includes(kw)
      );
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
      <div
        className={`min-h-screen bg-[#FAF8F5] md:pt-20 relative overflow-hidden transition-all duration-300 ${
          status === 'unauthenticated' ? 'pb-36 md:pb-28' : 'pb-24'
        }`}
      >
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(251,191,36,0.15)_0%,_rgba(250,248,245,0)_60%)] pointer-events-none z-0" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom,_rgba(249,115,22,0.1)_0%,_rgba(250,248,245,0)_50%)] pointer-events-none z-0" />

        <div className="absolute inset-0 bg-[linear-gradient(rgba(0,0,0,0.01)_1px,_transparent_1px),_linear-gradient(90deg,_rgba(0,0,0,0.01)_1px,_transparent_1px)] bg-[size:32px_32px] pointer-events-none z-0 opacity-40" />

        {/* Background gambar dinamis pagi/siang/sore/malam dengan cuaca — stretch saat di-drag */}
        <motion.div
          style={{
            height: stretchHeight,
            backgroundImage: `url(/banners/${timePeriod}_header_bg.png)`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            borderBottomLeftRadius: '2.5rem',
            borderBottomRightRadius: '2.5rem',
          }}
          className="md:hidden absolute top-0 left-0 right-0 z-20 border-b-[3px] border-amber-400/80 shadow-md pointer-events-none select-none overflow-hidden"
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
            animate(dragY, 0, { type: 'spring', stiffness: 350, damping: 28 });
          }}
          style={{ y: dragY, touchAction: 'pan-y' }}
          className={`md:hidden relative z-30 px-6 pt-3 pb-1 cursor-pointer transition-all duration-300 select-none bg-transparent shadow-none border-transparent ${
            timePeriod === 'malam' || timePeriod === 'sore' ? 'text-white' : 'text-[#2A1F16]'
          }`}
        >
          <div className="max-w-7xl mx-auto flex items-center justify-between gap-4 relative z-10 pt-2">
            <div className="space-y-0.5">
              <p
                className={`text-[9px] font-black uppercase tracking-[0.25em] select-none ${
                  timePeriod === 'malam' || timePeriod === 'sore'
                    ? 'text-[#FEF08A] drop-shadow-[0_1px_2px_rgba(0,0,0,0.3)]'
                    : timePeriod === 'pagi'
                    ? 'text-orange-700'
                    : 'text-amber-800'
                }`}
              >
                {timePeriod === 'pagi' && 'Selamat Pagi 🌅'}
                {timePeriod === 'siang' && 'Selamat Siang ☀️'}
                {timePeriod === 'sore' && 'Selamat Sore 🌇'}
                {timePeriod === 'malam' && 'Selamat Malam 🌃'}
              </p>
              <h1
                className={`font-serif text-lg md:text-2xl font-black tracking-tight ${
                  timePeriod === 'malam' || timePeriod === 'sore'
                    ? 'text-white drop-shadow-[0_1px_3px_rgba(0,0,0,0.4)]'
                    : 'text-[#2A1F16]'
                }`}
              >
                Hai, {userName}
              </h1>
            </div>

            {/* User Profile Avatar with Gold Border and Badge Overlay */}
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
                    boxShadow:
                      '0 0 14px 2px rgba(249, 115, 22, 0.4), inset 0 0 4px rgba(254, 240, 138, 0.6)',
                  }}
                  className="w-12 h-12 rounded-full p-[2px] bg-gradient-to-tr from-orange-500 via-amber-300 to-orange-600 flex items-center justify-center overflow-hidden border border-amber-200"
                >
                  <div className="w-full h-full rounded-full overflow-hidden bg-amber-950 relative">
                    <Image
                      src={
                        session?.user?.image ||
                        `https://ui-avatars.com/api/?name=${encodeURIComponent(
                          userName
                        )}&background=F97316&color=FFFFFF&bold=true`
                      }
                      alt="User Profile"
                      width={48}
                      height={48}
                      sizes="48px"
                      className="object-cover w-full h-full"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(
                          userName
                        )}&background=F97316&color=FFFFFF&bold=true`;
                      }}
                    />
                  </div>
                </div>
                {/* Sparkle Badge overlay on bottom right */}
                <div className="absolute -bottom-1 -right-1 w-5.5 h-5.5 rounded-full bg-gradient-to-tr from-orange-500 to-amber-500 border-2 border-white flex items-center justify-center shadow-md">
                  <Sparkles className="w-3 h-3 text-white" />
                </div>
              </div>
            </div>
          </div>

          {/* Hint tarik ke bawah */}
          {isNight && easterEggConfig?.enabled && !easterEggConfig?.hasClaimed && (
            <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex flex-col items-center gap-0.5 animate-bounce">
              <span className="text-[8px] font-black uppercase tracking-widest text-amber-200 drop-shadow">
                ✦ Tarik untuk Voucher Rahasia ✦
              </span>
            </div>
          )}
        </motion.header>

        {/* Desktop Header Greeting */}
        <div className="hidden md:block max-w-6xl mx-auto px-6 mt-4 mb-6">
          <div className="flex items-center justify-between border-b border-amber-100 pb-6">
            <div className="space-y-1">
              <span className="text-[10px] font-black uppercase text-amber-800/60 tracking-[0.2em] select-none">
                {isNight ? 'Selamat Malam 🌃' : 'Selamat Siang ☀️'}
              </span>
              <h1 className="font-serif text-3xl font-black text-gray-900 tracking-tight">
                Hai, <span className="text-orange-600">{userName}</span>{' '}
                <span className="text-2xl animate-pulse">👋</span>
              </h1>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex flex-col text-right select-none">
                <span className="text-xs font-black uppercase tracking-widest text-orange-600">
                  Arum Seduh
                </span>
                <span className="text-[10px] font-bold text-amber-700/60 mt-0.5">
                  Artisanal Coffee & Tea
                </span>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center shadow-sm text-orange-600">
                <Sparkles className="w-6 h-6 text-orange-500" />
              </div>
            </div>
          </div>
        </div>

        {/* Story Bar */}
        <div className="max-w-6xl mx-auto px-4 sm:px-6 mt-6 relative z-10">
          <StoryBar />
        </div>

        {/* Hero Banner Slider */}
        <motion.div
          initial={{ y: 30, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.1, duration: 0.6 }}
          className="max-w-6xl mx-auto px-4 sm:px-6 mt-4 md:mt-2 relative z-10"
        >
          <div className="relative w-full aspect-[2.1/1] md:aspect-[3.6/1] overflow-hidden rounded-[2rem] bg-white shadow-lg border-[3px] border-amber-300/80 group">
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
                    'relative w-full h-full overflow-hidden select-none',
                    slide?.isFlashSale && 'cursor-pointer active:scale-[0.99] transition-transform duration-300'
                  )}
                >
                  <Image
                    src={slide?.image || '/hero/hero-1.jpg'}
                    alt={slide?.alt || 'Promo banner'}
                    fill
                    sizes="(max-width: 768px) 100vw, 1200px"
                    className="object-cover group-hover:scale-[1.02] transition-transform duration-1000 ease-out"
                    priority
                    onError={(e) => {
                      (e.target as HTMLImageElement).src =
                        'https://images.unsplash.com/photo-1536256263959-770b48d82b0a?auto=format&fit=crop&q=80&w=1200';
                    }}
                  />

                  <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent flex flex-col justify-end p-5 md:p-8">
                    <div className="relative w-[115px] h-[26px] mb-2.5 select-none flex items-center justify-center">
                      <svg
                        className="absolute inset-0 w-full h-full drop-shadow-[0_2px_4px_rgba(0,0,0,0.35)]"
                        viewBox="0 0 115 26"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <defs>
                          <linearGradient id="gold-ribbon-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" stopColor="#FEF08A" />
                            <stop offset="40%" stopColor="#F59E0B" />
                            <stop offset="75%" stopColor="#EA580C" />
                            <stop offset="100%" stopColor="#9A3412" />
                          </linearGradient>
                        </defs>
                        <path d="M0 0 H115 L108 13 L115 26 H0 Z" fill="url(#gold-ribbon-grad)" />
                        <path
                          d="M0 1.5 H111 L105.5 13 L111 24.5 H0"
                          stroke="#FEF08A"
                          strokeWidth="0.8"
                          strokeOpacity="0.8"
                          fill="none"
                        />
                      </svg>
                      <span className="relative z-10 text-white text-[8.5px] font-black uppercase tracking-widest leading-none pr-2.5 pt-0.5">
                        {slide?.isFlashSale ? 'FLASH SALE 🔥' : 'Promo Spesial'}
                      </span>
                    </div>

                    <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                      <h2 className="font-serif text-lg md:text-2xl font-black text-white leading-tight tracking-tight whitespace-pre-line">
                        {slide?.headline || slide?.alt}
                      </h2>
                      {slide?.isFlashSale && (slide as any).endDate && (
                        <PromoCountdown
                          endDate={(slide as any).endDate}
                          className="bg-rose-600 text-white font-extrabold shadow-sm border border-rose-500/25 shrink-0 self-start sm:self-auto"
                        />
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
                    idx === currentSlide ? 'w-5 bg-amber-400' : 'w-1.5 bg-white/40'
                  }`}
                  aria-label={`Go to slide ${idx + 1}`}
                />
              ))}
            </div>
          </div>
        </motion.div>

        {/* INTERACTIVE FUNCTION SHORTCUTS GRID */}
        <div className="max-w-6xl mx-auto px-4 sm:px-6 mt-6 relative z-10">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {/* PAPAN PERINGKAT */}
            <motion.button
              whileHover={{ scale: 1.025, y: -2 }}
              whileTap={{ scale: 0.975 }}
              onClick={() => {
                if (status === 'authenticated') {
                  setIsLeaderboardOpen(true);
                } else {
                  openLogin();
                }
              }}
              className="bg-white border border-amber-100 rounded-3xl p-4 flex items-center gap-3 shadow-sm hover:shadow-md hover:border-orange-500/35 transition-all text-left cursor-pointer outline-none w-full"
            >
              <div className="w-11 h-11 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600 shrink-0 shadow-inner">
                <Trophy className="w-5.5 h-5.5" />
              </div>
              <div className="space-y-0.5">
                <h4 className="font-serif font-black text-xs text-gray-900 leading-tight">
                  Papan Peringkat
                </h4>
                <p className="text-[9px] text-gray-400 font-bold leading-tight">
                  Juara Arum Seduh 🏆
                </p>
              </div>
            </motion.button>

            {/* PEMESANAN OTOMATIS */}
            <motion.button
              whileHover={{ scale: 1.025, y: -2 }}
              whileTap={{ scale: 0.975 }}
              onClick={() => {
                if (status === 'authenticated') {
                  setIsAutoReorderOpen(true);
                } else {
                  openLogin();
                }
              }}
              className="bg-white border border-amber-100 rounded-3xl p-4 flex items-center gap-3 shadow-sm hover:shadow-md hover:border-orange-500/35 transition-all text-left cursor-pointer outline-none w-full"
            >
              <div className="w-11 h-11 rounded-2xl bg-orange-50 border border-orange-200 flex items-center justify-center text-orange-600 shrink-0 shadow-inner">
                <CalendarDays className="w-5.5 h-5.5" />
              </div>
              <div className="space-y-0.5">
                <h4 className="font-serif font-black text-xs text-gray-900 leading-tight">
                  Pemesanan Rutin
                </h4>
                <p className="text-[9px] text-gray-400 font-bold leading-tight">
                  Jadwal Otomatis ⏰
                </p>
              </div>
            </motion.button>

            {/* TOP UP SALDO */}
            <motion.button
              whileHover={{ scale: 1.025, y: -2 }}
              whileTap={{ scale: 0.975 }}
              onClick={() => {
                if (status === 'authenticated') {
                  setIsTopUpOpen(true);
                } else {
                  openLogin();
                }
              }}
              className="bg-white border border-amber-100 rounded-3xl p-4 flex items-center gap-3 shadow-sm hover:shadow-md hover:border-orange-500/35 transition-all text-left cursor-pointer outline-none w-full"
            >
              <div className="w-11 h-11 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600 shrink-0 shadow-inner">
                <Wallet className="w-5.5 h-5.5" />
              </div>
              <div className="space-y-0.5">
                <h4 className="font-serif font-black text-xs text-gray-900 leading-tight">
                  Top Up Saldo
                </h4>
                <p className="text-[9px] text-gray-400 font-bold leading-tight">
                  Arus Pay Instan ⚡
                </p>
              </div>
            </motion.button>

            {/* LUCKY GACHA */}
            <motion.button
              whileHover={{ scale: 1.025, y: -2 }}
              whileTap={{ scale: 0.975 }}
              onClick={() => {
                if (status === 'authenticated') {
                  setIsGachaOpen(true);
                } else {
                  openLogin();
                }
              }}
              className="bg-white border border-amber-100 rounded-3xl p-4 flex items-center gap-3 shadow-sm hover:shadow-md hover:border-orange-500/35 transition-all text-left cursor-pointer outline-none w-full"
            >
              <div className="w-11 h-11 rounded-2xl bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-500 shrink-0 shadow-inner relative">
                <Gift className="w-5.5 h-5.5" />
                {status === 'authenticated' && gachaChances > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-rose-600 border border-white text-white font-extrabold text-[8px] flex items-center justify-center animate-bounce">
                    {gachaChances}
                  </span>
                )}
              </div>
              <div className="space-y-0.5">
                <h4 className="font-serif font-black text-xs text-gray-900 leading-tight">
                  Lucky Gacha
                </h4>
                <p className="text-[9px] text-gray-400 font-bold leading-tight">
                  Hadiah & Game 🎁
                </p>
              </div>
            </motion.button>
          </div>
        </div>

        {/* ARUS POIN & WALLET SECTION */}
        <div className="max-w-6xl mx-auto px-4 sm:px-6 mt-6 relative z-10">
          {status === 'authenticated' && loadingLoyalty && points === null ? (
            <ArusPoinWalletSkeleton />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* ARUS PAY (WALLET CARD) */}
              <div className="bg-gradient-to-tr from-[#2A1F16] via-[#1F1710] to-[#140F0A] text-white rounded-[2rem] p-6 shadow-xl border border-[#D4A574]/35 relative overflow-hidden flex flex-col justify-between min-h-[170px] group transition-all duration-300 hover:shadow-2xl">
                <div className="absolute -top-12 -right-12 w-40 h-40 bg-amber-500/10 rounded-full blur-2xl pointer-events-none group-hover:scale-110 transition-transform duration-500" />
                <div className="absolute -bottom-16 -left-16 w-48 h-48 bg-orange-500/10 rounded-full blur-3xl pointer-events-none" />

                <div className="flex items-center justify-between z-10">
                  <div className="flex items-center gap-2">
                    <CreditCard className="w-5 h-5 text-amber-300" />
                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-neutral-300">
                      Arus Pay
                    </span>
                  </div>
                  <div className="px-2.5 py-0.5 rounded-full bg-amber-400/10 border border-amber-400/20 text-amber-300 text-[9px] font-black tracking-wider uppercase">
                    Dompet Digital ⚡
                  </div>
                </div>

                <div className="my-4 z-10 text-left">
                  <span className="text-[10px] font-black text-neutral-300 uppercase tracking-widest leading-none block mb-1">
                    Saldo Anda
                  </span>
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-black font-serif tracking-tight text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.3)]">
                      {walletBalance !== null
                        ? formatRupiah(walletBalance)
                        : status === 'authenticated'
                        ? 'Memuat...'
                        : 'Rp 0'}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 z-10 mt-auto">
                  <button
                    onClick={() => {
                      if (status === 'authenticated') {
                        setIsTopUpOpen(true);
                      } else {
                        openLogin();
                      }
                    }}
                    className="flex-1 py-2.5 bg-gradient-to-tr from-amber-400 to-orange-500 text-white text-[11px] font-black rounded-xl hover:shadow-lg active:scale-98 transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-md border border-amber-300/30"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Top Up Saldo</span>
                  </button>
                  <button
                    onClick={() => {
                      if (status === 'authenticated') {
                        setShowWalletHistory(!showWalletHistory);
                      } else {
                        openLogin();
                      }
                    }}
                    className="px-4 py-2.5 bg-white/10 hover:bg-white/15 text-white border border-white/15 text-[11px] font-black rounded-xl active:scale-98 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <History className="w-4 h-4" />
                    <span>Riwayat</span>
                  </button>
                </div>

                {/* Toggleable Wallet Transaction History */}
                <AnimatePresence>
                  {showWalletHistory && walletTransactions.length > 0 && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden border-t border-white/10 mt-4 pt-4 z-10 text-left space-y-2.5 max-h-[220px] overflow-y-auto scrollbar-hide"
                    >
                      <p className="text-[9px] font-black text-neutral-400 uppercase tracking-widest">
                        Transaksi Terakhir
                      </p>
                      {walletTransactions.slice(0, 5).map((tx: any) => (
                        <div
                          key={tx.id}
                          className="flex justify-between items-center text-xs pb-2 border-b border-white/5 last:border-0 last:pb-0"
                        >
                          <div className="space-y-0.5">
                            <p className="font-bold text-white text-[11px]">{tx.description}</p>
                            <p className="text-[9px] text-neutral-400">
                              {new Date(tx.createdAt).toLocaleDateString('id-ID', {
                                day: 'numeric',
                                month: 'short',
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </p>
                          </div>
                          <span
                            className={`font-black text-[11px] ${
                              tx.type.startsWith('TOP_UP') ? 'text-amber-400' : 'text-rose-400'
                            }`}
                          >
                            {tx.type.startsWith('TOP_UP') ? '+' : '-'}
                            {formatRupiah(tx.amount)}
                          </span>
                        </div>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* ARUS POIN (LOYALTY CARD) */}
              <div className="bg-white text-[#2A1F16] rounded-[2rem] p-6 shadow-xl border border-amber-100 relative overflow-hidden flex flex-col justify-between min-h-[170px] group transition-all duration-300 hover:shadow-2xl">
                <div className="absolute -top-12 -right-12 w-40 h-40 bg-amber-50 rounded-full blur-2xl pointer-events-none" />
                <div className="absolute -bottom-16 -left-16 w-48 h-48 bg-orange-50/50 rounded-full blur-3xl pointer-events-none" />

                <div className="flex items-center justify-between z-10">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-orange-500" />
                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-orange-700">
                      Arus Poin
                    </span>
                  </div>
                  <div className="flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-100 border border-amber-200 text-amber-800 text-[9px] font-black tracking-wider uppercase shadow-inner">
                    <span>✨</span>
                    <span>{arusLevel}</span>
                  </div>
                </div>

                <div className="my-4 z-10 text-left flex justify-between items-center">
                  <div>
                    <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest leading-none block mb-1">
                      Loyalty Points
                    </span>
                    <div className="flex items-baseline gap-1">
                      <span className="text-3xl font-black font-serif tracking-tight text-orange-600 drop-shadow-sm">
                        {points !== null ? points : status === 'authenticated' ? 'Memuat...' : '0'}
                      </span>
                      <span className="text-xs font-bold text-gray-500">Poin</span>
                    </div>
                  </div>

                  <div className="w-11 h-11 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center text-xl shadow-inner animate-pulse-once">
                    {arusLevel.includes('Tunas') ? '🌱' : arusLevel.includes('Mengalir') ? '🌊' : '✨'}
                  </div>
                </div>

                {/* Progress to next Milestone */}
                <div className="mb-4 z-10 text-left">
                  {(() => {
                    const currentPoints = points || 0;
                    let target = 5;
                    let prevTarget = 0;
                    let nextReward = 'Reward Milestone 1';

                    if (milestones) {
                      if (currentPoints < milestones.milestone1.target && milestones.milestone1.enabled) {
                        target = milestones.milestone1.target;
                        nextReward = milestones.milestone1.reward;
                      } else if (
                        currentPoints < milestones.milestone2.target &&
                        milestones.milestone2.enabled
                      ) {
                        target = milestones.milestone2.target;
                        prevTarget = milestones.milestone1.target;
                        nextReward = milestones.milestone2.reward;
                      } else if (
                        currentPoints < milestones.milestone3.target &&
                        milestones.milestone3.enabled
                      ) {
                        target = milestones.milestone3.target;
                        prevTarget = milestones.milestone2.target;
                        nextReward = milestones.milestone3.reward;
                      } else {
                        target = milestones.milestone3.target;
                        prevTarget = milestones.milestone2.target;
                        nextReward = 'Maximum Milestone Reached 🎉';
                      }
                    }

                    const progressPct = Math.min(
                      100,
                      Math.max(0, ((currentPoints - prevTarget) / (target - prevTarget)) * 100)
                    );

                    return (
                      <div className="space-y-1.5">
                        <div className="flex justify-between text-[9px] font-black text-gray-500 uppercase tracking-widest">
                          <span>Milestone Berikutnya</span>
                          <span className="text-orange-600">
                            {currentPoints} / {target} Poin
                          </span>
                        </div>
                        <div className="w-full h-2 rounded-full bg-gray-200 border border-gray-300 overflow-hidden shadow-inner relative">
                          <div
                            className="h-full bg-gradient-to-r from-amber-400 to-orange-500 rounded-full transition-all duration-1000 ease-out"
                            style={{ width: `${progressPct}%` }}
                          />
                        </div>
                        <p className="text-[8.5px] font-bold text-gray-500 leading-none">
                          🎁 Target: {nextReward}
                        </p>
                      </div>
                    );
                  })()}
                </div>

                <div className="flex items-center gap-2 z-10 mt-auto">
                  <button
                    onClick={() => {
                      if (status === 'authenticated') {
                        setShowPointsHistory(!showPointsHistory);
                      } else {
                        openLogin();
                      }
                    }}
                    className="w-full py-2.5 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white text-[11px] font-black rounded-xl hover:shadow-lg active:scale-98 transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-md"
                  >
                    <History className="w-4 h-4" />
                    <span>Riwayat Poin</span>
                  </button>
                </div>

                {/* Toggleable Points History */}
                <AnimatePresence>
                  {showPointsHistory && pointHistory.length > 0 && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden border-t border-gray-200 mt-4 pt-4 z-10 text-left space-y-2.5 max-h-[220px] overflow-y-auto scrollbar-hide"
                    >
                      <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest">
                        Riwayat Transaksi Poin
                      </p>
                      {pointHistory.slice(0, 5).map((ph: any) => (
                        <div
                          key={ph.id}
                          className="flex justify-between items-center text-xs pb-2 border-b border-gray-150 last:border-0 last:pb-0"
                        >
                          <div className="space-y-0.5">
                            <p className="font-bold text-gray-800 text-[11px]">
                              {ph.description || 'Pemberian Poin'}
                            </p>
                            <p className="text-[9px] text-gray-500">
                              {new Date(ph.createdAt).toLocaleDateString('id-ID', {
                                day: 'numeric',
                                month: 'short',
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </p>
                          </div>
                          <span
                            className={`font-black text-[11px] ${
                              ph.type === 'EARNED' || ph.amount > 0 ? 'text-orange-600' : 'text-rose-600'
                            }`}
                          >
                            {ph.amount > 0 ? '+' : ''}
                            {ph.amount} Pts
                          </span>
                        </div>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          )}
        </div>

        {/* Welcome & Referral Widget Banner */}
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
            className="border-2 border-amber-300/80 p-4 sm:p-5 rounded-[2rem] shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative overflow-hidden cursor-pointer hover:shadow-lg transition-all group"
          >
            <div className="flex items-center gap-3 sm:gap-4.5 z-10 w-full sm:w-auto">
              <div className="w-12 h-12 sm:w-14 sm:h-14 shrink-0 flex items-center justify-center select-none bg-orange-100/50 rounded-2xl border border-amber-300 relative shadow-inner">
                <Sparkles className="w-7 h-7 sm:w-8 sm:h-8 text-orange-600" />
              </div>
              <div className="flex-1">
                <h3 className="font-serif font-black text-xs md:text-sm text-gray-900 leading-snug">
                  Ajak Teman, Dapat Reward Voucher!
                </h3>
                <div className="flex items-start gap-1 mt-1 text-[10px] text-gray-600 font-semibold max-w-xl">
                  <span className="shrink-0">🤝</span>
                  <p className="leading-tight">
                    Temanmu dapat diskon <span className="font-bold text-gray-800">Rp3.000</span>, kamu
                    mendapat <span className="font-bold text-orange-600">Poin / Voucher</span> reward menarik!
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-center gap-1.5 px-4.5 py-2.5 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white rounded-full text-[11px] font-bold shadow-md group-hover:scale-102 transition-all w-full sm:w-auto flex-shrink-0 z-10">
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
          {/* Teman Cuaca Hari Ini Widget */}
          {loadingWeather ? (
            <WeatherWidgetSkeleton />
          ) : weatherData ? (
            <section className="bg-white rounded-[2rem] border border-amber-100 p-6 shadow-sm overflow-hidden text-left relative">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-5 border-b border-amber-100/60 pb-4">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <CloudSun className="w-5 h-5 text-amber-500" />
                    <h3 className="font-serif font-black text-base md:text-lg text-gray-950 tracking-tight">
                      Teman Cuaca Hari Ini
                    </h3>
                  </div>
                  <p className="text-[9px] text-gray-400 font-bold uppercase tracking-wider">
                    Rekomendasi minuman kurasi otomatis berdasarkan cuaca lokalmu
                  </p>
                </div>

                <div className="flex items-center gap-2.5 bg-amber-50 border border-amber-200/60 px-3.5 py-1.5 rounded-2xl shrink-0 self-start sm:self-auto shadow-inner">
                  <span className="text-sm font-bold text-gray-700">{weatherData.weather?.city}</span>
                  <div className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                  <span className="text-xs font-black text-orange-600">
                    {weatherData.weather?.temp?.toFixed(1)}°C
                  </span>
                  <span className="text-[10px] bg-orange-100 text-orange-700 font-black uppercase px-2 py-0.5 rounded-lg leading-none">
                    {weatherData.weather?.description}
                  </span>
                </div>
              </div>

              <p className="text-xs text-gray-600 font-semibold italic bg-amber-50/50 p-3.5 rounded-2xl border border-amber-100 mb-5 leading-relaxed">
                "{weatherData.tagline}"
              </p>

              {/* Recommended Items */}
              <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide">
                {weatherData.recommendations?.map((p: any) => {
                  const isSoldOut = p.badge === 'sold-out';
                  const promo = getActivePromo(p);
                  const displayPrice = promo ? promo.promoPrice : p.price;

                  return (
                    <div
                      key={p.id}
                      onClick={() => handleProductClick(p)}
                      className="w-[135px] md:w-[155px] shrink-0 bg-white border border-amber-100 rounded-2xl p-2.5 hover:border-orange-400 hover:shadow-md transition-all cursor-pointer overflow-hidden relative group"
                    >
                      {p.image && (
                        <div className="relative w-full aspect-square rounded-xl overflow-hidden bg-amber-50 mb-2 border border-amber-100/60 shadow-sm">
                          <Image
                            src={p.image}
                            alt={p.name}
                            fill
                            sizes="(max-width: 640px) 135px, 155px"
                            className="object-cover group-hover:scale-103 transition-transform"
                          />
                        </div>
                      )}
                      <p className="font-serif font-black text-[11px] text-gray-900 line-clamp-1 leading-tight">
                        {p.name}
                      </p>
                      <span className="font-bold text-[10px] text-amber-600 mt-1 block">
                        {formatRupiah(displayPrice)}
                      </span>
                    </div>
                  );
                })}
              </div>
            </section>
          ) : null}

          {/* Paket Combo */}
          {comboProducts.length > 0 && (
            <section className="bg-white rounded-[2rem] border border-amber-100/70 p-6 shadow-sm">
              <div className="flex items-center justify-between mb-5">
                <h3 className="font-serif font-black text-base md:text-lg text-gray-900 tracking-tight flex items-center gap-1.5">
                  <ShoppingBag className="w-5 h-5 text-orange-600" /> Paket Combo Hemat
                </h3>
                <span
                  onClick={() => setSearchOpen(true)}
                  className="text-[10px] md:text-xs text-amber-700 font-bold flex items-center gap-0.5 cursor-pointer hover:text-orange-600 transition-colors uppercase tracking-wider select-none"
                >
                  Semua Combo <ChevronRight className="w-3.5 h-3.5" />
                </span>
              </div>

              <div className="flex gap-4 overflow-x-auto pb-3 scrollbar-hide">
                {comboProducts.map((p) => {
                  const isSoldOut = p.badge === 'sold-out';
                  const promo = getActivePromo(p);
                  const displayPrice = promo ? promo.promoPrice : p.price;
                  const originalPrice = promo ? p.price : p.modifiers?.originalPrice || null;

                  return (
                    <div
                      key={p.id}
                      onClick={() => handleProductClick(p)}
                      className={`w-[145px] md:w-[175px] shrink-0 bg-white border border-amber-100 shadow-sm transition-all duration-300 rounded-3xl p-3 relative group overflow-hidden ${
                        isSoldOut
                          ? 'opacity-60 cursor-not-allowed'
                          : 'hover:border-orange-400 hover:shadow-md hover:-translate-y-1 cursor-pointer'
                      }`}
                    >
                      {p.image && (
                        <div className="relative w-full aspect-square rounded-2xl overflow-hidden bg-amber-50 mb-2.5 border border-amber-100 shadow-sm">
                          <Image
                            src={p.image}
                            alt={p.name}
                            fill
                            sizes="(max-width: 640px) 145px, 175px"
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
                              <span className="absolute top-1.5 right-1.5 z-10 px-1.5 py-0.5 rounded-lg bg-white/90 backdrop-blur-md text-amber-600 text-[8px] font-black shadow-sm flex items-center gap-0.5 leading-none">
                                <Star className="w-3 h-3 fill-amber-500 stroke-none" /> 4.9
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
                        <p className="font-serif font-bold text-xs text-gray-900 line-clamp-1 leading-snug group-hover:text-orange-600 transition-colors">
                          {p.name}
                        </p>
                        <div className="flex flex-col mt-2">
                          {originalPrice && originalPrice > displayPrice && (
                            <span className="text-[10px] text-muted-foreground line-through leading-none mb-1">
                              {formatRupiah(originalPrice)}
                            </span>
                          )}
                          <p className="font-bold text-xs text-amber-600 leading-none">
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
          <section className="bg-white rounded-[2rem] border border-amber-100/70 p-6 shadow-sm">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-serif font-black text-base md:text-lg text-gray-900 tracking-tight flex items-center gap-1.5">
                <Flame className="w-5 h-5 text-orange-500 fill-orange-500/20" /> Spesial Hari Ini
              </h3>
              <span
                onClick={() => setSearchOpen(true)}
                className="text-[10px] md:text-xs text-amber-700 font-bold flex items-center gap-0.5 cursor-pointer hover:text-orange-600 transition-colors uppercase tracking-wider select-none"
              >
                Semua Menu <ChevronRight className="w-3.5 h-3.5" />
              </span>
            </div>

            <div className="flex gap-4 overflow-x-auto pb-3 scrollbar-hide">
              {spesialProducts.map((p) => {
                const {
                  displayPrice,
                  originalPrice,
                  promo,
                  isRegularOut,
                  sizeNotice,
                  isSoldOut,
                } = getEffectiveProductDisplay(p, packagingStock);

                return (
                  <div
                    key={p.id}
                    onClick={() => handleProductClick(p)}
                    className={`w-[145px] md:w-[175px] shrink-0 bg-white border border-amber-100 shadow-sm transition-all duration-300 rounded-3xl p-3 relative group overflow-hidden ${
                      isSoldOut
                        ? 'opacity-60 cursor-not-allowed'
                        : 'hover:border-orange-400 hover:shadow-md hover:-translate-y-1 cursor-pointer'
                    }`}
                  >
                    {p.image && (
                      <div className="relative w-full aspect-square rounded-2xl overflow-hidden bg-amber-50 mb-2.5 border border-amber-100 shadow-sm">
                        <Image
                          src={p.image}
                          alt={p.name}
                          fill
                          sizes="(max-width: 640px) 145px, 175px"
                          className={`object-cover group-hover:scale-105 transition-transform duration-500 ease-out ${
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
                            <span className="absolute top-1.5 right-1.5 z-10 px-1.5 py-0.5 rounded-lg bg-white/90 backdrop-blur-md text-amber-600 text-[8px] font-black shadow-sm flex items-center gap-0.5 leading-none">
                              <Star className="w-3 h-3 fill-amber-500 stroke-none" /> 4.9
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
                      <p className="font-serif font-bold text-xs text-gray-900 line-clamp-1 leading-snug group-hover:text-orange-600 transition-colors">
                        {p.name}
                      </p>
                      <div className="mt-2 flex flex-col items-baseline">
                        {originalPrice && originalPrice > displayPrice && (
                          <span className="text-[10px] text-muted-foreground line-through leading-none mb-1">
                            {formatRupiah(originalPrice)}
                          </span>
                        )}
                        <div className="flex items-baseline gap-1">
                          <span className="font-bold text-xs text-amber-600">
                            {formatRupiah(displayPrice)}
                          </span>
                          {isRegularOut && (
                            <span className="text-[8px] font-bold text-amber-700 bg-amber-50 px-1 rounded border border-amber-200">
                              (Jumbo)
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* Menu Baru */}
          <section className="bg-white rounded-[2rem] border border-amber-100/70 p-6 shadow-sm">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-serif font-black text-base md:text-lg text-gray-900 tracking-tight flex items-center gap-1.5">
                <Sparkles className="w-5 h-5 text-orange-500" /> Menu Baru Bulan Ini
              </h3>
              <span
                onClick={() => setSearchOpen(true)}
                className="text-[10px] md:text-xs text-amber-700 font-bold flex items-center gap-0.5 cursor-pointer hover:text-orange-600 transition-colors uppercase tracking-wider select-none"
              >
                Semua Baru <ChevronRight className="w-3.5 h-3.5" />
              </span>
            </div>

            <div className="flex gap-4 overflow-x-auto pb-3 scrollbar-hide">
              {baruProducts.map((p) => {
                const {
                  displayPrice,
                  originalPrice,
                  promo,
                  isRegularOut,
                  sizeNotice,
                  isSoldOut,
                } = getEffectiveProductDisplay(p, packagingStock);

                return (
                  <div
                    key={p.id}
                    onClick={() => handleProductClick(p)}
                    className={`w-[145px] md:w-[175px] shrink-0 bg-white border border-amber-100 shadow-sm transition-all duration-300 rounded-3xl p-3 relative group overflow-hidden ${
                      isSoldOut
                        ? 'opacity-60 cursor-not-allowed'
                        : 'hover:border-orange-400 hover:shadow-md hover:-translate-y-1 cursor-pointer'
                    }`}
                  >
                    {p.image && (
                      <div className="relative w-full aspect-square rounded-2xl overflow-hidden bg-amber-50 mb-2.5 border border-amber-100 shadow-sm">
                        <Image
                          src={p.image}
                          alt={p.name}
                          fill
                          sizes="(max-width: 640px) 145px, 175px"
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
                            {promo ? (
                              <span className="absolute bottom-1.5 left-1.5 z-10 px-2 py-0.5 rounded-full bg-rose-500 text-white text-[8px] font-black shadow-sm uppercase tracking-wider flex items-center gap-0.5 leading-none">
                                Promo
                              </span>
                            ) : (
                              <span className="absolute bottom-1.5 left-1.5 z-10 px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[8px] font-black shadow-sm uppercase tracking-wider flex items-center gap-0.5 leading-none">
                                New
                              </span>
                            )}
                          </>
                        )}
                      </div>
                    )}

                    <div className="flex-grow flex flex-col justify-between">
                      <p className="font-serif font-bold text-xs text-gray-900 line-clamp-1 leading-snug group-hover:text-orange-600 transition-colors">
                        {p.name}
                      </p>
                      <div className="flex flex-col mt-2">
                        {originalPrice && originalPrice > displayPrice && (
                          <span className="text-[10px] text-muted-foreground line-through leading-none mb-1">
                            {formatRupiah(originalPrice)}
                          </span>
                        )}
                        <div className="flex items-baseline gap-1">
                          <span className="font-bold text-xs text-amber-600">
                            {formatRupiah(displayPrice)}
                          </span>
                          {isRegularOut && (
                            <span className="text-[8px] font-bold text-amber-700 bg-amber-50 px-1 rounded border border-amber-200">
                              (Jumbo)
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* Makanan */}
          <section className="bg-white rounded-[2rem] border border-amber-100/70 p-6 shadow-sm">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-serif font-black text-base md:text-lg text-gray-900 tracking-tight flex items-center gap-1.5">
                <ShoppingBag className="w-5 h-5 text-amber-700" /> Cemilan & Roti
              </h3>
              <span
                onClick={() => setSearchOpen(true)}
                className="text-[10px] md:text-xs text-amber-700 font-bold flex items-center gap-0.5 cursor-pointer hover:text-orange-600 transition-colors uppercase tracking-wider select-none"
              >
                Semua Roti <ChevronRight className="w-3.5 h-3.5" />
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {makananProducts.map((p) => {
                const isSoldOut = p.badge === 'sold-out';
                const promo = getActivePromo(p);
                const displayPrice = promo ? promo.promoPrice : p.price;
                const originalPrice = promo ? p.price : p.modifiers?.originalPrice || null;

                return (
                  <div
                    key={p.id}
                    onClick={() => handleProductClick(p)}
                    className={`bg-white border border-amber-100 shadow-sm transition-all duration-300 rounded-3xl p-3.5 relative group overflow-hidden ${
                      isSoldOut
                        ? 'opacity-60 cursor-not-allowed'
                        : 'hover:border-orange-400 hover:shadow-md hover:-translate-y-1 cursor-pointer'
                    }`}
                  >
                    {p.image && (
                      <div className="relative w-full aspect-[4/3] rounded-2xl overflow-hidden bg-amber-50 mb-2.5 border border-amber-100 shadow-sm">
                        <Image
                          src={p.image}
                          alt={p.name}
                          fill
                          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
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
                      <p className="font-serif font-bold text-xs text-gray-900 line-clamp-1 leading-snug group-hover:text-orange-600 transition-colors">
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

          {/* Arum Moments - Featured Reviews Slideshow */}
          {loadingReviews ? (
            <FeaturedReviewsSkeleton />
          ) : featuredReviews.length > 0 ? (
            <section className="bg-white rounded-[2rem] border border-amber-100/70 p-6 shadow-sm overflow-hidden">
              <div className="flex items-center justify-between mb-5">
                <h3 className="font-serif font-black text-base md:text-lg text-gray-950 tracking-tight flex items-center gap-1.5">
                  <Star className="w-5 h-5 text-amber-500 fill-amber-500/20" /> Arum Moments
                </h3>
                <span className="text-[9px] md:text-[10px] font-bold text-amber-800/60 uppercase tracking-widest">
                  Momen Manis Bersama Arum Seduh
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
                      className="w-[280px] md:w-[320px] shrink-0 bg-white border border-amber-100 rounded-3xl overflow-hidden shadow-sm flex flex-col justify-between hover:shadow-md hover:border-orange-400/40 transition-all duration-300"
                    >
                      {/* Review Photo */}
                      <div className="relative w-full h-40 bg-amber-50 overflow-hidden">
                        {firstImage ? (
                          <Image
                            src={firstImage}
                            alt="Ulasan customer"
                            fill
                            className="object-cover"
                            sizes="(max-width: 768px) 280px, 320px"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src =
                                review.product?.image ||
                                'https://images.unsplash.com/photo-1536256263959-770b48d82b0a?auto=format&fit=crop&q=80&w=1200';
                            }}
                          />
                        ) : (
                          <div className="w-full h-full flex flex-col items-center justify-center bg-amber-50 relative p-4">
                            <span className="text-3xl select-none">🍵</span>
                            <span className="text-[10px] font-black text-orange-600 mt-2 tracking-widest uppercase">
                              Momen Arum Seduh
                            </span>
                          </div>
                        )}
                        {/* Rating Badge */}
                        <div className="absolute top-3 left-3 bg-white/95 backdrop-blur-sm px-2.5 py-1 rounded-full shadow-sm flex items-center gap-0.5 z-10">
                          {Array.from({ length: 5 }).map((_, i) => (
                            <Star
                              key={i}
                              className={`w-3.5 h-3.5 ${
                                i < review.rating
                                  ? 'fill-amber-400 stroke-amber-500'
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
                            "{review.comment || 'Enak banget, minuman terenak yang pernah kucoba! 🧡'}"
                          </p>
                        </div>

                        <div className="flex items-center justify-between pt-2 border-t border-amber-100/60">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-full overflow-hidden bg-amber-100 border border-amber-200 relative shrink-0">
                              <Image
                                src={
                                  review.user?.image ||
                                  `https://ui-avatars.com/api/?name=${encodeURIComponent(
                                    review.user?.name || 'C'
                                  )}&background=F97316&color=FFFFFF&bold=true`
                                }
                                alt={review.user?.name || 'Customer'}
                                fill
                                sizes="32px"
                                className="object-cover"
                              />
                            </div>
                            <div className="flex flex-col text-left">
                              <span className="text-[10px] font-black text-gray-900 line-clamp-1 leading-tight">
                                {review.user?.name || 'Pecinta Arum'}
                              </span>
                              <span className="text-[8px] text-gray-400 font-bold uppercase tracking-wider">
                                Terverifikasi
                              </span>
                            </div>
                          </div>

                          {review.product && (
                            <div className="bg-amber-50 text-orange-600 px-2 py-0.5 rounded-lg text-[9px] font-black uppercase max-w-[100px] truncate leading-tight select-none border border-amber-200/50">
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
          ) : null}
        </motion.div>

        {/* Join CTA for unauthenticated users */}
        {status === 'unauthenticated' && (
          <div className="fixed bottom-[56px] md:bottom-6 left-4 right-4 z-40 bg-[#FFFBF5]/95 backdrop-blur-md border border-amber-200/60 p-5 flex flex-col md:flex-row justify-between items-center max-w-6xl mx-auto rounded-3xl shadow-lg animate-in fade-in slide-in-from-bottom-5 duration-500">
            <div className="hidden md:block space-y-1">
              <h4 className="text-xs font-black text-gray-900 font-serif">
                Bergabung dengan Arum Seduh sekarang!
              </h4>
              <p className="text-[10px] text-gray-400 font-semibold">
                Kumpulkan Arus Poin, klaim voucher gratis, dan pesan lebih cepat ke mejamu.
              </p>
            </div>
            <button
              onClick={openLogin}
              className="w-full md:w-[200px] py-3.5 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white text-[12px] font-bold rounded-2xl shadow-md transition-all active:scale-[0.98]"
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
        packagingStock={packagingStock}
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
            className="fixed bottom-24 right-4 z-40 p-4 bg-gradient-to-tr from-orange-500 to-amber-500 text-white rounded-full shadow-2xl flex items-center justify-center border-2 border-amber-200 hover:shadow-orange-300/40 select-none touch-none"
            style={{
              boxShadow: '0 10px 25px rgba(249, 115, 22, 0.4), 0 0 15px rgba(254, 240, 138, 0.3)',
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

      <LeaderboardOverlay
        isOpen={isLeaderboardOpen}
        onClose={() => setIsLeaderboardOpen(false)}
      />

      <AutoReorderOverlay
        isOpen={isAutoReorderOpen}
        onClose={() => setIsAutoReorderOpen(false)}
        products={products}
        showToast={showToast}
        refreshWallet={refreshWallet}
        refreshLoyalty={refreshLoyalty}
      />

      <TopUpOverlay
        isOpen={isTopUpOpen}
        onClose={() => setIsTopUpOpen(false)}
        refreshWallet={refreshWallet}
        showToast={showToast}
      />
    </>
  );
}
