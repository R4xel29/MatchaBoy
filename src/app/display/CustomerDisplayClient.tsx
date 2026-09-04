'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ShoppingBag,
  QrCode,
  Coffee,
  CheckCircle2,
  Sparkles,
  Leaf,
  Clock,
  ShieldCheck,
  Maximize,
  AlertCircle,
  Tag,
  Flame,
  Loader2,
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { formatRupiah } from '@/lib/utils';

export type POSDisplayState = {
  cart: {
    id: string;
    productId: string;
    name: string;
    basePrice: number;
    quantity: number;
    iceLevel: string;
    sugarLevel: string;
    matchaLevel?: number;
    addOns: { id: string; name: string; price: number }[];
    totalPrice: number;
    image?: string | null;
  }[];
  subtotal: number;
  tumblerDiscount: number;
  voucherDiscount?: number;
  voucherCode?: string | null;
  totalPayable: number;
  customerName: string;
  orderType: 'PICKUP' | 'DINE_IN';
  paymentMethod: 'CASH' | 'QRIS';
  hasTumbler: boolean;
  tableNumber?: string;
  isCompleted?: boolean;
  orderId?: string;
  dokuQrContent?: string | null;
  dokuQrImageUrl?: string | null;
  activeModifier?: {
    productName: string;
    productImage?: string | null;
    price: number;
    iceLevel: string;
    sugarLevel: string;
    matchaLevel: number;
    size?: string;
    sizePrice?: number;
    sizes?: { name: string; price: number }[];
    shotName?: string;
    shotCount?: number;
    shotPrice?: number;
    shots?: { name: string; shots: number; price: number }[];
    showSweetness: boolean;
    showMatcha: boolean;
    showEspressoShot?: boolean;
    defaultMatcha: number;
    activeStep?: 'MATCHA' | 'SWEETNESS' | 'ICE' | 'SIZE' | 'ESPRESSO';
  } | null;
  timestamp: number;
};

type DisplayProduct = {
  id: string;
  name: string;
  description: string;
  price: number;
  image: string | null;
  badge: string | null;
  isSoldOut: boolean;
  categoryId: string;
  categoryName: string;
};

export default function CustomerDisplayClient() {
  const [displayState, setDisplayState] = useState<POSDisplayState | null>(null);
  const [settings, setSettings] = useState<{
    qrisImage: string | null;
    qrisLabel: string;
    qrisNmid: string;
    storeName: string;
    storeAddress: string;
    banners: { id: string; image: string; headline: string; subheadline: string }[];
    categories: { id: string; name: string; slug: string }[];
    products: DisplayProduct[];
  }>({
    qrisImage: null,
    qrisLabel: 'QRIS',
    qrisNmid: '',
    storeName: 'Arum Seduh',
    storeAddress: '',
    banners: [],
    categories: [],
    products: [],
  });

  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [activeBannerIndex, setActiveBannerIndex] = useState(0);
  const [resetCountdown, setResetCountdown] = useState<number | null>(null);
  const [currentTime, setCurrentTime] = useState<string>('');

  // 40-second cashier inactivity detection & SPMB QR code state
  const [isIdle, setIsIdle] = useState(false);
  const [lastActivityTime, setLastActivityTime] = useState<number>(Date.now());
  const [spmbUrl, setSpmbUrl] = useState<string>('');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setSpmbUrl(`${window.location.origin}/spmb`);
    }
  }, []);

  const markActivity = () => {
    setLastActivityTime(Date.now());
    setIsIdle(false);
  };

  // Activity listeners on display screen window
  useEffect(() => {
    const handleActivity = () => markActivity();
    window.addEventListener('mousemove', handleActivity);
    window.addEventListener('keydown', handleActivity);
    window.addEventListener('touchstart', handleActivity);
    return () => {
      window.removeEventListener('mousemove', handleActivity);
      window.removeEventListener('keydown', handleActivity);
      window.removeEventListener('touchstart', handleActivity);
    };
  }, []);

  // 40 seconds idle timer
  useEffect(() => {
    const idleCheckInterval = setInterval(() => {
      if (Date.now() - lastActivityTime >= 40000) {
        setIsIdle(true);
      }
    }, 1000);
    return () => clearInterval(idleCheckInterval);
  }, [lastActivityTime]);

  useEffect(() => {
    const updateTime = () => {
      setCurrentTime(
        new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const catalogScrollRef = useRef<HTMLDivElement | null>(null);

  // Auto-scroll catalog menu for overflow items when scrollbar is hidden
  useEffect(() => {
    const container = catalogScrollRef.current;
    if (!container) return;

    let scrollDirection = 1;
    let isPaused = false;
    let pauseTimeout: NodeJS.Timeout | null = null;

    const scrollInterval = setInterval(() => {
      if (isPaused || !container) return;

      const maxScroll = container.scrollHeight - container.clientHeight;
      if (maxScroll <= 5) return;

      if (scrollDirection === 1 && container.scrollTop >= maxScroll - 2) {
        isPaused = true;
        pauseTimeout = setTimeout(() => {
          scrollDirection = -1;
          isPaused = false;
        }, 3000);
      } else if (scrollDirection === -1 && container.scrollTop <= 2) {
        isPaused = true;
        pauseTimeout = setTimeout(() => {
          scrollDirection = 1;
          isPaused = false;
        }, 3000);
      } else {
        container.scrollTop += scrollDirection * 0.8;
      }
    }, 35);

    return () => {
      clearInterval(scrollInterval);
      if (pauseTimeout) clearTimeout(pauseTimeout);
    };
  }, [selectedCategory, settings.products.length]);

  // Auto-reset display back to default menu catalog 6 seconds after order completion
  useEffect(() => {
    if (displayState?.isCompleted) {
      setResetCountdown(6);

      const interval = setInterval(() => {
        setResetCountdown((prev) => {
          if (prev === null || prev <= 1) {
            clearInterval(interval);
            setDisplayState(null);
            try {
              localStorage.removeItem('pos_customer_display_state');
            } catch {}
            return null;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(interval);
    } else {
      setResetCountdown(null);
    }
  }, [displayState?.isCompleted, displayState?.orderId]);

  // Fetch store display settings & Arum Seduh menu catalog (Auto refresh every 5 mins for live stock updates)
  useEffect(() => {
    const fetchCatalog = () => {
      fetch('/api/cashier/display-settings')
        .then((res) => res.json())
        .then((data) => {
          if (!data.error) {
            setSettings({
              ...data,
              storeName: data.storeName || 'Arum Seduh',
            });
          }
        })
        .catch(() => {});
    };

    fetchCatalog();
    const catalogTimer = setInterval(fetchCatalog, 300000); // 5 minutes auto refresh
    return () => clearInterval(catalogTimer);
  }, []);

  // Listen to BroadcastChannel & LocalStorage events from POS Kasir
  useEffect(() => {
    const channel = new BroadcastChannel('pos_customer_display');

    const handleMessage = (event: MessageEvent<POSDisplayState>) => {
      if (event.data) {
        setDisplayState(event.data);
        markActivity();
      }
    };

    channel.onmessage = handleMessage;

    // LocalStorage fallback for cross-tab sync
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'pos_customer_display_state' && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          setDisplayState(parsed);
          markActivity();
        } catch {}
      }
    };

    window.addEventListener('storage', handleStorageChange);

    // Initial check from localStorage
    const saved = localStorage.getItem('pos_customer_display_state');
    if (saved) {
      try {
        setDisplayState(JSON.parse(saved));
      } catch {}
    }

    // High frequency interval check (300ms) for dual-monitor cross-window sync
    const pollInterval = setInterval(() => {
      const currentSaved = localStorage.getItem('pos_customer_display_state');
      if (currentSaved) {
        try {
          const parsed = JSON.parse(currentSaved);
          setDisplayState((prev) => {
            if (!prev || prev.timestamp !== parsed.timestamp) {
              markActivity();
              return parsed;
            }
            return prev;
          });
        } catch {}
      }
    }, 300);

    return () => {
      channel.close();
      window.removeEventListener('storage', handleStorageChange);
      clearInterval(pollInterval);
    };
  }, []);

  const fallbackBanners = useMemo(
    () => [
      {
        id: 'fb-1',
        headline: 'Authentic Matcha & Artisanal Coffee 🍵',
        subheadline: 'Nikmati kelezatan matcha murni kualitas premium dan keharuman kopi pilihan terbaik di Arum Seduh.',
        image: null,
        icon: '🍵',
      },
      {
        id: 'fb-2',
        headline: 'Bawa Tumbler Sendiri, Dapatkan Diskon & Bonus 🌿',
        subheadline: 'Dukung gerakan ramah lingkungan dan nikmati potongan harga langsung untuk setiap pembelian menggunakan tumbler.',
        image: null,
        icon: '🌿',
      },
      {
        id: 'fb-3',
        headline: 'Pesan Mandiri Lebih Cepat & Praktis 📱',
        subheadline: 'Tanpa perlu antre di kasir, scan kode QR di sebelah kanan untuk melihat katalog lengkap, atur opsi rasa, dan bayar!',
        image: null,
        icon: '📱',
      },
    ],
    []
  );

  const promoSlides = useMemo(() => {
    return settings.banners.length > 0 ? settings.banners : fallbackBanners;
  }, [settings.banners, fallbackBanners]);

  // Auto banner rotation
  useEffect(() => {
    if (promoSlides.length <= 1) return;
    const interval = setInterval(() => {
      setActiveBannerIndex((prev) => (prev + 1) % promoSlides.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [promoSlides]);


  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

  // Filtered products for display catalog
  const filteredProducts = useMemo(() => {
    if (selectedCategory === 'all') return settings.products;
    return settings.products.filter((p) => p.categoryId === selectedCategory);
  }, [settings.products, selectedCategory]);

  const cart = displayState?.cart || [];
  const totalPayable = displayState?.totalPayable || 0;
  const isCompleted = displayState?.isCompleted === true;
  const isQRIS = !isCompleted && displayState?.paymentMethod === 'QRIS' && (cart.length > 0 || totalPayable > 0);

  return (
    <div className="fixed inset-0 bg-slate-50 text-slate-900 flex flex-col font-sans select-none overflow-hidden z-[99999]">
      {/* Header Bar */}
      <header className="h-16 px-8 bg-white border-b border-orange-100 shadow-sm backdrop-blur-md flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-orange-600 via-orange-500 to-amber-400 flex items-center justify-center font-black text-white shadow-md text-xl tracking-tighter">
            AS
          </div>
          <div>
            <h1 className="font-extrabold text-xl text-slate-900 tracking-tight flex items-center gap-2">
              Arum Seduh
              <span className="text-[10px] px-2 py-0.5 rounded-md bg-orange-100 border border-orange-200 text-orange-700 font-bold uppercase tracking-wider">
                Katalog Menu & POS Display
              </span>
            </h1>
            <p className="text-[11px] text-slate-500 font-medium">Layar Monitor Pelanggan Realtime</p>
          </div>
        </div>

        {/* Live Status & Controls */}
        <div className="flex items-center gap-4">
          {isIdle ? (
            <div className="px-3.5 py-1.5 rounded-full bg-amber-50 border border-amber-200 text-xs font-bold text-amber-800 flex items-center gap-2 shadow-sm animate-pulse">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
              Mode Idle (Promosi & Self-Service)
            </div>
          ) : displayState?.customerName ? (
            <div className="px-3.5 py-1.5 rounded-full bg-orange-50 border border-orange-200 text-xs font-bold text-orange-800 flex items-center gap-2 shadow-sm">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
              Pelanggan: {displayState.customerName}
            </div>
          ) : null}
          <div className="flex items-center gap-1.5 text-xs text-slate-600 bg-orange-50/50 px-3 py-1.5 rounded-xl border border-orange-100">
            <Clock className="w-3.5 h-3.5 text-orange-500" />
            <span>{currentTime}</span>
          </div>
          <button
            onClick={toggleFullscreen}
            className="p-2 rounded-xl bg-white hover:bg-orange-50 text-slate-600 hover:text-orange-600 border border-orange-200 transition-colors shadow-sm"
            title="Layar Penuh (Fullscreen)"
          >
            <Maximize className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Main Dual Grid View */}
      <main className="flex-1 grid grid-cols-12 overflow-hidden relative">
        <AnimatePresence mode="wait">
          {isIdle ? (
            <motion.div
              key="idle-promo-screen"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              transition={{ duration: 0.4 }}
              className="col-span-12 h-full grid grid-cols-12 overflow-hidden bg-gradient-to-br from-slate-900 via-slate-950 to-orange-950 text-white relative z-20"
            >
              {/* Background Ambient Glows */}
              <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-orange-500/15 rounded-full blur-[120px] pointer-events-none" />
              <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-amber-500/15 rounded-full blur-[120px] pointer-events-none" />

              {/* LEFT COLUMN: Banner Promosi (7 cols) */}
              <div className="col-span-7 p-8 flex flex-col justify-between border-r border-slate-800/80 relative z-10 bg-slate-950/40 backdrop-blur-sm">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="px-3 py-1 rounded-full bg-orange-500/20 border border-orange-500/40 text-orange-400 text-xs font-black uppercase tracking-wider flex items-center gap-1.5 backdrop-blur-md">
                      <Sparkles className="w-3.5 h-3.5 text-orange-400 animate-spin" /> Promosi Spesial Arum Seduh
                    </span>
                  </div>
                  <span className="text-[11px] font-bold text-slate-400 bg-slate-800/60 px-3 py-1 rounded-full border border-slate-700/60">
                    Menu Favorites & Special Offers
                  </span>
                </div>

                <div className="my-auto py-6">
                  <AnimatePresence mode="wait">
                    {(() => {
                      const activeBanner = promoSlides[activeBannerIndex % promoSlides.length];
                      if (!activeBanner) return null;
                      return (
                        <motion.div
                          key={activeBanner.id || activeBannerIndex}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: 20 }}
                          transition={{ duration: 0.5 }}
                          className="space-y-6"
                        >
                          {activeBanner.image ? (
                            <div className="relative aspect-[16/9] rounded-3xl overflow-hidden border border-white/10 shadow-2xl group">
                              <img
                                src={activeBanner.image}
                                alt={activeBanner.headline || 'Banner Promosi'}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                              />
                              <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-transparent" />
                              <div className="absolute bottom-6 left-6 right-6 space-y-2">
                                <h2 className="text-3xl font-black text-white drop-shadow-md">
                                  {activeBanner.headline}
                                </h2>
                                {activeBanner.subheadline && (
                                  <p className="text-sm text-slate-300 max-w-lg font-medium drop-shadow">
                                    {activeBanner.subheadline}
                                  </p>
                                )}
                              </div>
                            </div>
                          ) : (
                            <div className="p-10 rounded-3xl bg-gradient-to-br from-orange-600/30 via-slate-900/80 to-amber-600/20 border border-orange-500/30 backdrop-blur-xl shadow-2xl space-y-5">
                              <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-orange-500 to-amber-400 flex items-center justify-center text-3xl shadow-lg shadow-orange-500/30">
                                {('icon' in activeBanner && activeBanner.icon) ? (activeBanner as any).icon : '🍵'}
                              </div>
                              <div className="space-y-3">
                                <h2 className="text-3xl font-black text-white leading-tight">
                                  {activeBanner.headline}
                                </h2>
                                <p className="text-base text-slate-300 font-medium leading-relaxed max-w-xl">
                                  {activeBanner.subheadline}
                                </p>
                              </div>
                            </div>
                          )}
                        </motion.div>
                      );
                    })()}
                  </AnimatePresence>

                  {promoSlides.length > 1 && (
                    <div className="flex items-center gap-2 mt-6">
                      {promoSlides.map((_, idx) => (
                        <button
                          key={idx}
                          onClick={() => setActiveBannerIndex(idx)}
                          className={`h-2 rounded-full transition-all duration-500 ${
                            activeBannerIndex === idx
                              ? 'w-8 bg-orange-500 shadow-md shadow-orange-500/50'
                              : 'w-2 bg-slate-700 hover:bg-slate-500'
                          }`}
                        />
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between text-xs text-slate-400 border-t border-slate-800/80 pt-4">
                  <span className="flex items-center gap-1.5 font-semibold text-emerald-400">
                    <Leaf className="w-4 h-4" /> Diskon Tumbler & Poin Loyalti
                  </span>
                  <span className="text-slate-400 font-medium">#ArumSeduhAuthentic</span>
                </div>
              </div>

              {/* RIGHT COLUMN: Space "Kasir tidak ada ?, scan code qr berikut yuk" (5 cols) */}
              <div className="col-span-5 p-8 flex flex-col justify-between bg-gradient-to-b from-orange-600/20 via-slate-900/90 to-slate-950 border-l border-slate-800/80 relative z-10">
                <div className="space-y-4 text-center">
                  <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 text-xs font-black uppercase tracking-wider shadow-inner">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-ping" />
                    Kasir Sedang Tidak Di Tempat
                  </div>

                  <div className="space-y-2">
                    <h2 className="text-3xl font-black text-white tracking-tight leading-tight">
                      Kasir tidak ada ?
                    </h2>
                    <p className="text-lg font-black text-amber-300">
                      Scan code QR berikut yuk!
                    </p>
                    <p className="text-xs text-slate-300 max-w-xs mx-auto font-medium leading-relaxed">
                      Arahkan kamera HP Anda untuk memesan menu favorit secara mandiri tanpa harus mengantre.
                    </p>
                  </div>
                </div>

                {/* QR Code Container */}
                <div className="my-auto flex flex-col items-center justify-center space-y-4">
                  <div className="relative p-5 bg-white rounded-3xl shadow-2xl shadow-orange-500/25 border-4 border-orange-500 flex flex-col items-center justify-center group">
                    <div className="absolute -inset-1 rounded-[28px] bg-gradient-to-r from-orange-500 via-amber-400 to-orange-600 opacity-40 blur-md group-hover:opacity-80 transition-opacity pointer-events-none" />

                    <div className="relative bg-white p-2 rounded-2xl">
                      <QRCodeSVG
                        value={spmbUrl || 'https://arumseduh.app/spmb'}
                        size={210}
                        level="H"
                        includeMargin={true}
                      />
                    </div>

                    <div className="mt-3 px-3 py-1 rounded-full bg-orange-50 border border-orange-200 text-[11px] font-mono font-black text-orange-700 flex items-center gap-1.5 shadow-sm">
                      <QrCode className="w-3.5 h-3.5 text-orange-500" />
                      <span>{spmbUrl ? new URL(spmbUrl).pathname : '/spmb'}</span>
                    </div>
                  </div>

                  {/* Step instructions */}
                  <div className="w-full max-w-xs space-y-2 text-xs">
                    <div className="p-2.5 rounded-xl bg-slate-800/80 border border-slate-700/80 flex items-center gap-3 text-slate-200 shadow-sm">
                      <div className="w-6 h-6 rounded-lg bg-orange-500 text-white font-black flex items-center justify-center text-xs shrink-0">1</div>
                      <span className="font-semibold">Buka Kamera HP / App QR Scanner</span>
                    </div>
                    <div className="p-2.5 rounded-xl bg-slate-800/80 border border-slate-700/80 flex items-center gap-3 text-slate-200 shadow-sm">
                      <div className="w-6 h-6 rounded-lg bg-orange-500 text-white font-black flex items-center justify-center text-xs shrink-0">2</div>
                      <span className="font-semibold">Pilih Menu Favorit & Atur Opsi Rasa</span>
                    </div>
                    <div className="p-2.5 rounded-xl bg-slate-800/80 border border-slate-700/80 flex items-center gap-3 text-slate-200 shadow-sm">
                      <div className="w-6 h-6 rounded-lg bg-emerald-500 text-white font-black flex items-center justify-center text-xs shrink-0">3</div>
                      <span className="font-semibold">Bayar Langsung & Ambil Pesanan</span>
                    </div>
                  </div>
                </div>

                <div className="text-center pt-3 border-t border-slate-800/80 text-[11px] text-slate-400 font-medium">
                  Layar akan kembali otomatis saat kasir memproses pesanan ✨
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="active-pos-screen"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="col-span-12 h-full grid grid-cols-12 overflow-hidden"
            >
              {/* LEFT COLUMN: Menu Catalog Grid & Prices (7 cols) */}
              <div className="col-span-7 p-6 border-r border-orange-100 flex flex-col justify-between relative bg-gradient-to-br from-orange-50/30 via-white to-amber-50/30 overflow-hidden">
                {/* Background Ambient Glow */}
                <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-orange-500/10 rounded-full blur-3xl pointer-events-none" />


          {/* ORDER COMPLETED STATE */}
          <AnimatePresence mode="wait">
            {isCompleted ? (
              <motion.div
                key="completed"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="my-auto bg-white border border-emerald-500/30 rounded-3xl p-8 shadow-2xl backdrop-blur-xl max-w-lg mx-auto w-full text-center space-y-6 relative overflow-hidden"
              >
                <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-500" />
                
                {/* Animated Checkmark Circle */}
                <div className="relative mx-auto w-28 h-28 flex items-center justify-center">
                  <div className="absolute inset-0 rounded-full bg-emerald-500/20 animate-ping opacity-75" />
                  <motion.div
                    initial={{ scale: 0, rotate: -45 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ type: 'spring', stiffness: 200, damping: 12 }}
                    className="w-24 h-24 rounded-full bg-gradient-to-tr from-emerald-500 to-teal-400 text-white flex items-center justify-center shadow-2xl shadow-emerald-500/40 relative z-10"
                  >
                    <CheckCircle2 className="w-14 h-14 stroke-[2.5]" />
                  </motion.div>
                </div>

                <div className="space-y-2">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-black uppercase tracking-wider">
                    <Sparkles className="w-3.5 h-3.5 text-emerald-600" /> Pembayaran Berhasil & Terverifikasi
                  </div>
                  <h2 className="text-3xl font-black text-slate-900">Terima Kasih di Arum Seduh!</h2>
                  <p className="text-xs text-slate-500 max-w-md mx-auto">
                    Pesanan Anda sedang disiapkan oleh barista kami. Silakan menunggu pemanggilan nama.
                  </p>
                </div>

                {/* Transaction Receipt Card */}
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-left space-y-2 text-xs">
                  <div className="flex justify-between items-center pb-2 border-b border-slate-200">
                    <span className="text-slate-500">Nama Pelanggan</span>
                    <span className="font-bold text-orange-600">{displayState?.customerName || 'Pelanggan'}</span>
                  </div>
                  <div className="flex justify-between items-center pb-2 border-b border-slate-200">
                    <span className="text-slate-500">ID Pesanan</span>
                    <span className="font-mono text-slate-700">#{displayState?.orderId?.slice(0, 8).toUpperCase() || 'LUNAS'}</span>
                  </div>
                  <div className="flex justify-between items-center pb-2 border-b border-slate-200">
                    <span className="text-slate-500">Metode Pembayaran</span>
                    <span className="font-bold text-emerald-600">
                      {displayState?.paymentMethod === 'QRIS' ? 'QRIS DOKU (LUNAS)' : 'TUNAI / CASH (LUNAS)'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center pt-1 text-sm font-black">
                    <span className="text-slate-900">Total Dibayar</span>
                    <span className="text-emerald-600">{formatRupiah(totalPayable)}</span>
                  </div>
                </div>

                {/* Auto-Reset Countdown Badge */}
                {resetCountdown !== null && (
                  <div className="text-[11px] text-slate-500 font-semibold flex items-center justify-center gap-1.5 pt-1">
                    <Clock className="w-3.5 h-3.5 text-orange-500 animate-spin" />
                    <span>Kembali ke katalog menu dalam <strong className="text-orange-600 font-bold">{resetCountdown}s</strong>...</span>
                  </div>
                )}
              </motion.div>
            ) : isQRIS ? (
              /* QRIS PAYMENT POPUP OVERLAY */
              <motion.div
                key="qris-overlay"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="my-auto bg-white border border-orange-300 rounded-3xl p-8 shadow-2xl backdrop-blur-xl max-w-md mx-auto w-full text-center space-y-6 relative overflow-hidden"
              >
                <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-orange-500 via-amber-400 to-orange-500" />
                
                <div>
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-orange-100 border border-orange-200 text-orange-700 text-xs font-bold uppercase tracking-wider mb-2">
                    <QrCode className="w-3.5 h-3.5" /> Scan QRIS Untuk Membayar
                  </div>
                  <h3 className="text-3xl font-black text-slate-900">{formatRupiah(totalPayable)}</h3>
                </div>

                {/* QR Code Frame */}
                <div className="p-4 bg-white rounded-2xl shadow-xl inline-block border-4 border-orange-400 mx-auto relative group min-w-[280px] min-h-[280px]">
                  {displayState?.dokuQrImageUrl ? (
                    <img
                      src={displayState.dokuQrImageUrl}
                      alt="DOKU Dynamic QRIS"
                      className="w-64 h-64 object-contain rounded-lg"
                    />
                  ) : displayState?.dokuQrContent ? (
                    <QRCodeSVG
                      value={displayState.dokuQrContent}
                      size={240}
                      level="H"
                      includeMargin={true}
                    />
                  ) : (
                    <div className="w-64 h-64 flex flex-col items-center justify-center text-slate-900 gap-3">
                      <Loader2 className="w-10 h-10 animate-spin text-orange-500" />
                      <p className="text-xs font-bold text-slate-500 animate-pulse">Membuat QRIS Dinamis...</p>
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <p className="text-xs text-slate-600 font-medium">
                    Bisa digunakan untuk GoPay, OVO, Dana, ShopeePay, BCA, Mandiri & aplikasi m-Banking QRIS lainnya.
                  </p>
                  {settings.qrisNmid && (
                    <p className="text-[10px] text-slate-500 font-mono">NMID: {settings.qrisNmid}</p>
                  )}
                </div>

                <div className="flex items-center justify-center gap-2 pt-2 text-[11px] text-emerald-600 font-semibold border-t border-slate-200">
                  <ShieldCheck className="w-4 h-4" /> Deteksi Otomatis Pembayaran
                </div>
              </motion.div>
            ) : (
              /* ARUM SEDUH MENU CATALOG DISPLAY */
              <div className="h-full flex flex-col justify-between overflow-hidden space-y-4">
                {/* Catalog Header & Category Tabs */}
                <div className="space-y-3 shrink-0">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
                        <Sparkles className="w-5 h-5 text-orange-500" /> Katalog Menu Arum Seduh
                      </h2>
                      <p className="text-xs text-slate-500">Daftar minuman & makanan pilihan yang dapat Anda pesan</p>
                    </div>
                  </div>

                  {/* Category Filter Pills */}
                  <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
                    <button
                      onClick={() => setSelectedCategory('all')}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                        selectedCategory === 'all'
                          ? 'bg-orange-500 text-white shadow-md shadow-orange-500/20'
                          : 'bg-white border border-orange-200 text-slate-700 hover:bg-orange-50 hover:text-orange-600'
                      }`}
                    >
                      Semua Menu ({settings.products.length})
                    </button>
                    {settings.categories.map((cat) => (
                      <button
                        key={cat.id}
                        onClick={() => setSelectedCategory(cat.id)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                          selectedCategory === cat.id
                            ? 'bg-orange-500 text-white shadow-md shadow-orange-500/20'
                            : 'bg-white border border-orange-200 text-slate-700 hover:bg-orange-50 hover:text-orange-600'
                        }`}
                      >
                        {cat.name}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Product Catalog Grid */}
                <div
                  ref={catalogScrollRef}
                  className="flex-1 overflow-y-auto pr-1 scrollbar-none [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
                >
                  {filteredProducts.length === 0 ? (
                    <div className="py-16 text-center text-slate-400">
                      <Coffee className="w-10 h-10 mx-auto mb-2 opacity-40 text-orange-400" />
                      <p className="text-sm font-semibold">Belum ada menu di kategori ini</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
                      {filteredProducts.map((product) => (
                        <div
                          key={product.id}
                          className={`relative rounded-2xl border p-3 flex flex-col justify-between transition-all overflow-hidden ${
                            product.isSoldOut
                              ? 'bg-slate-100/80 border-slate-200 opacity-70'
                              : 'bg-white border-orange-100 hover:border-orange-300 shadow-sm'
                          }`}
                        >
                          {/* Image & Badges */}
                          <div className="relative aspect-video rounded-xl bg-orange-50/50 overflow-hidden mb-2.5 border border-orange-100/60">
                            {product.image ? (
                              <img
                                src={product.image}
                                alt={product.name}
                                className={`w-full h-full object-cover ${product.isSoldOut ? 'grayscale opacity-50' : ''}`}
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-orange-300">
                                <Coffee className="w-8 h-8" />
                              </div>
                            )}

                            {/* Sold Out Overlay Badge */}
                            {product.isSoldOut ? (
                              <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-[2px] flex items-center justify-center">
                                <span className="px-2.5 py-1 rounded-lg bg-rose-600 text-white font-black text-[10px] uppercase tracking-wider flex items-center gap-1 shadow-lg">
                                  <AlertCircle className="w-3.5 h-3.5" /> Stok Habis
                                </span>
                              </div>
                            ) : product.badge ? (
                              <span className="absolute top-2 left-2 px-2 py-0.5 rounded-md bg-orange-500 text-white text-[9px] font-black uppercase tracking-wider shadow-sm flex items-center gap-1">
                                <Flame className="w-3 h-3 text-amber-200" /> {product.badge}
                              </span>
                            ) : null}
                          </div>

                          {/* Product Info */}
                          <div className="space-y-1">
                            <span className="text-[9px] font-extrabold uppercase tracking-wider text-orange-600">
                              {product.categoryName}
                            </span>
                            <h4 className="font-bold text-xs text-slate-900 line-clamp-1">{product.name}</h4>
                            <p className="text-[10px] text-slate-500 line-clamp-1">{product.description}</p>
                          </div>

                          {/* Price & Availability Tag */}
                          <div className="flex items-center justify-between pt-2.5 border-t border-orange-100 mt-2">
                            <span className="text-xs font-black text-orange-600">{formatRupiah(product.price)}</span>
                            {product.isSoldOut ? (
                              <span className="text-[9px] font-bold text-rose-500">Habis</span>
                            ) : (
                              <span className="text-[9px] font-bold text-emerald-600 flex items-center gap-0.5">
                                <CheckCircle2 className="w-3 h-3" /> Tersedia
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Footer Ticker */}
                <div className="p-3 rounded-2xl bg-white border border-orange-100 flex items-center justify-between text-[11px] text-slate-600 shrink-0 shadow-sm">
                  <div className="flex items-center gap-2">
                    <Leaf className="w-3.5 h-3.5 text-emerald-500" />
                    <span>Bawa Wadah/Tumbler Sendiri = Diskon Poin & Bonus 🌿</span>
                  </div>
                  <span className="text-orange-600 font-bold">#ArumSeduhAuthentic</span>
                </div>
              </div>
            )}
          </AnimatePresence>
        </div>

        {/* RIGHT COLUMN: Order Items & Total Summary (5 cols) */}
        <div className="col-span-5 bg-orange-50/30 p-6 flex flex-col justify-between overflow-hidden border-l border-orange-100">
          {/* Top Info Bar */}
          <div className="flex items-center justify-between pb-4 border-b border-orange-100">
            <div className="flex items-center gap-2">
              <ShoppingBag className="w-4 h-4 text-orange-500" />
              <h3 className="font-bold text-sm text-slate-900">Daftar Pesanan Anda</h3>
            </div>
            {displayState?.orderType && (
              <span className="px-2.5 py-1 rounded-lg bg-white text-orange-700 border border-orange-200 text-[10px] font-extrabold uppercase tracking-wider shadow-sm">
                {displayState.orderType === 'DINE_IN' ? `DINE IN ${displayState.tableNumber ? `(Meja ${displayState.tableNumber})` : ''}` : 'PICKUP'}
              </span>
            )}
          </div>

          {/* Cart Itemized List */}
          <div className="flex-1 overflow-y-auto py-4 space-y-3 scrollbar-none [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
            {cart.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center text-slate-400 space-y-3 py-16">
                <Coffee className="w-12 h-12 stroke-[1.5] text-orange-300 opacity-60 animate-pulse" />
                <div>
                  <p className="text-sm font-semibold text-slate-700">Pilih Menu dari Katalog di Sebelah Kiri</p>
                  <p className="text-xs text-slate-500 mt-1">Item yang diinput kasir akan muncul secara real-time di sini</p>
                </div>
              </div>
            ) : (
              cart.map((item) => (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="p-3.5 rounded-2xl bg-white border border-orange-100 flex items-center justify-between gap-3 shadow-sm hover:border-orange-200 transition-all"
                >
                  {/* Product Image Thumbnail */}
                  <div className="w-12 h-12 rounded-xl bg-orange-50 overflow-hidden shrink-0 border border-orange-100 relative flex items-center justify-center">
                    {item.image ? (
                      <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                    ) : (
                      <Coffee className="w-6 h-6 text-orange-400" />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-sm text-slate-900 truncate">{item.name}</p>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      {item.matchaLevel !== undefined ? `Matcha Lvl ${item.matchaLevel} · ` : ''}{item.iceLevel} · {item.sugarLevel}
                      {item.addOns?.length > 0 && ` · +${item.addOns.map((a) => a.name).join(', ')}`}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xs font-bold text-orange-600">{formatRupiah(item.totalPrice)}</p>
                    <p className="text-[10px] text-slate-500 font-semibold">{item.quantity}x @ {formatRupiah(item.quantity > 0 ? item.totalPrice / item.quantity : item.basePrice)}</p>
                  </div>
                </motion.div>
              ))
            )}
          </div>

          {/* Bottom Total & Checkout Summary */}
          <div className="pt-4 border-t border-orange-100 space-y-3">
            {displayState?.voucherDiscount && displayState.voucherDiscount > 0 && (
              <div className="flex justify-between items-center text-xs font-medium text-orange-600 px-1">
                <span className="flex items-center gap-1.5">
                  <Tag className="w-3.5 h-3.5" /> Diskon Promo {displayState.voucherCode ? `(${displayState.voucherCode})` : ''}
                </span>
                <span>-{formatRupiah(displayState.voucherDiscount)}</span>
              </div>
            )}

            {displayState?.hasTumbler && displayState.tumblerDiscount > 0 && (
              <div className="flex justify-between items-center text-xs font-medium text-emerald-600 px-1">
                <span className="flex items-center gap-1.5">
                  <Leaf className="w-3.5 h-3.5" /> Diskon Wadah Tumbler
                </span>
                <span>-{formatRupiah(displayState.tumblerDiscount)}</span>
              </div>
            )}

            <div className="p-4 rounded-2xl bg-gradient-to-r from-orange-500 via-orange-500 to-amber-500 text-white flex items-center justify-between shadow-xl">
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-white/80">Total Bayar</p>
                <p className="text-2xl font-black text-white tracking-tight">{formatRupiah(totalPayable)}</p>
              </div>
              <div className="px-3.5 py-1.5 rounded-xl bg-white/20 backdrop-blur-sm text-white text-xs font-bold border border-white/20">
                {displayState?.paymentMethod === 'QRIS' ? 'QRIS' : 'CASH'}
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    )}
  </AnimatePresence>
</main>
      {/* Real-time Customization Pop-up Overlay (Sequential Step-by-Step Pop-up Cards) */}
      <AnimatePresence>
        {displayState?.activeModifier && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-md p-6 pointer-events-none select-none"
          >
            {(() => {
              const activeMod = displayState.activeModifier;
              const defaultDrinkSizes = [
                { name: 'Regular', price: 0 },
                { name: 'Large', price: 3000 },
              ];
              const effectiveSizes = (activeMod.sizes && activeMod.sizes.length > 0)
                ? activeMod.sizes
                : (activeMod.showSweetness !== false ? defaultDrinkSizes : []);

              const steps: { key: 'MATCHA' | 'SWEETNESS' | 'ICE' | 'SIZE' | 'ESPRESSO'; label: string; icon: string }[] = [];
              if (activeMod.showEspressoShot) {
                steps.push({ key: 'ESPRESSO', label: 'Espresso Shot', icon: '☕' });
              }
              if (activeMod.showMatcha) {
                steps.push({ key: 'MATCHA', label: 'Kepekatan Matcha', icon: '🍵' });
              }
              if (activeMod.showSweetness) {
                steps.push({ key: 'SWEETNESS', label: 'Tingkat Kemanisan', icon: '🍯' });
                steps.push({ key: 'ICE', label: 'Level Es Batu', icon: '🧊' });
              }
              if (effectiveSizes.length > 0) {
                steps.push({ key: 'SIZE', label: 'Ukuran Gelas', icon: '🥤' });
              }

              const currentKey = activeMod.activeStep || steps[0]?.key || 'ESPRESSO';
              const currentStepIdx = Math.max(0, steps.findIndex((s) => s.key === currentKey));
              const currentStepObj = steps[currentStepIdx] || steps[0];

              return (
                <div className="w-full max-w-xl bg-white border border-orange-200 rounded-3xl p-6 shadow-2xl space-y-5 text-center text-slate-900">
                  {/* Top Bar: Product Name & Step Counter */}
                  <div className="flex items-center justify-between border-b border-orange-100 pb-4">
                    <div className="flex items-center gap-3 text-left">
                      <div className="w-12 h-12 rounded-2xl bg-orange-100 border border-orange-200 flex items-center justify-center shrink-0 text-xl font-bold">
                        ☕
                      </div>
                      <div>
                        <h2 className="text-lg font-black text-slate-900">{activeMod.productName}</h2>
                        <p className="text-xs font-semibold text-orange-600">{formatRupiah(activeMod.price)}</p>
                      </div>
                    </div>
                    {steps.length > 0 && (
                      <div className="px-3.5 py-1.5 rounded-full bg-orange-50 text-orange-700 text-xs font-bold border border-orange-200">
                        Langkah {currentStepIdx + 1} dari {steps.length}
                      </div>
                    )}
                  </div>

                  {/* Step Tracker Pills Bar */}
                  {steps.length > 1 && (
                    <div className="flex items-center justify-center gap-2 overflow-x-auto py-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
                      {steps.map((st, idx) => {
                        const isActive = st.key === currentKey;
                        return (
                          <div
                            key={st.key}
                            className={`px-3 py-1 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 ${
                              isActive
                                ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-md scale-105'
                                : 'bg-slate-100 text-slate-600 border border-slate-200'
                            }`}
                          >
                            <span>{st.icon}</span>
                            <span>{st.label}</span>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Focused Active Step Card View */}
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={currentKey}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ duration: 0.2 }}
                      className="bg-orange-50/50 border border-orange-100 p-6 rounded-3xl flex flex-col items-center justify-center space-y-4 min-h-[220px]"
                    >
                      {currentKey === 'ESPRESSO' && (
                        <>
                          <AmericanoShotVisualizer shotName={activeMod.shotName} shotCount={activeMod.shotCount} shots={activeMod.shots} price={activeMod.shotPrice} />
                          <div>
                            <p className="text-xs font-bold text-orange-600 uppercase tracking-wider">Espresso Shot Pilihan Anda</p>
                            <p className="text-3xl font-black text-slate-900 mt-1">
                              {activeMod.shotName || 'Single Shot'} {activeMod.shotPrice && activeMod.shotPrice > 0 ? `(+${formatRupiah(activeMod.shotPrice)})` : ''}
                            </p>
                            <p className="text-[11px] text-slate-500 mt-1">
                              {(activeMod.shotCount || 1) === 1 ? 'Standar Espresso ☕ (Smooth & Balance)' : (activeMod.shotCount || 1) === 2 ? 'Double Espresso ☕☕ (Rich & Strong)' : 'Extra Bold Espresso ☕☕☕ (Super Strong)'}
                            </p>
                          </div>
                        </>
                      )}

                      {currentKey === 'MATCHA' && (
                        <>
                          <div className="w-24 h-24 flex items-center justify-center">
                            <MatchaCupVisualizer level={activeMod.matchaLevel} />
                          </div>
                          <div>
                            <p className="text-xs font-bold text-emerald-600 uppercase tracking-wider">Kepekatan Matcha Pilihan Anda</p>
                            <p className="text-3xl font-black text-slate-900 mt-1">Level {activeMod.matchaLevel} {activeMod.matchaLevel >= 9 ? '(+Rp 2.000)' : (activeMod.matchaLevel >= 7 ? '(+Rp 1.000)' : '')}</p>
                            <p className="text-[11px] text-slate-500 mt-1">
                              {activeMod.matchaLevel <= 3 ? 'Lembut & Rich' : activeMod.matchaLevel <= 7 ? 'Seimbang & Umami' : 'Extra Strong & Bold'}
                            </p>
                          </div>
                        </>
                      )}

                      {currentKey === 'SWEETNESS' && (() => {
                        const sweetnessOptions = ['Less', 'Biasa', 'Lumayan', 'Manis Sekali'];
                        const getSweetnessIndex = (sLevel: string) => {
                          if (sLevel === 'Less' || sLevel === 'Less Sugar' || sLevel === 'Sedikit Gula') return 0;
                          if (sLevel === 'Biasa' || sLevel === 'Normal Sugar' || sLevel === 'Normal') return 1;
                          if (sLevel === 'Lumayan') return 2;
                          if (sLevel === 'Manis Sekali' || sLevel === 'Extra Sugar') return 3;
                          return 1;
                        };
                        const currentSwIdx = getSweetnessIndex(activeMod.sugarLevel);
                        const prevSwLabel = currentSwIdx > 0 ? sweetnessOptions[currentSwIdx - 1] : null;
                        const nextSwLabel = currentSwIdx < sweetnessOptions.length - 1 ? sweetnessOptions[currentSwIdx + 1] : null;

                        return (
                          <div className="w-full flex flex-col items-center justify-center space-y-4">
                            <div className="w-full flex items-center justify-between px-2">
                              <div className="w-28 sm:w-32 flex items-center justify-start text-xs font-bold transition-all">
                                {prevSwLabel ? (
                                  <span className="opacity-75 text-orange-600 flex items-center gap-1">
                                    <span className="text-sm">‹</span>
                                    <span className="text-[11px] truncate max-w-[80px]">{prevSwLabel}</span>
                                  </span>
                                ) : (
                                  <span className="opacity-0 select-none">‹</span>
                                )}
                              </div>

                              <AnimatePresence mode="wait">
                                <motion.div
                                  key={activeMod.sugarLevel}
                                  initial={{ scale: 0.85, opacity: 0 }}
                                  animate={{ scale: 1.1, opacity: 1 }}
                                  exit={{ scale: 0.85, opacity: 0 }}
                                  transition={{ type: 'spring', damping: 20 }}
                                  className="flex flex-col items-center justify-center relative py-2 shrink-0"
                                >
                                  <div className={`absolute inset-0 rounded-full blur-2xl opacity-40 transition-colors ${
                                    currentSwIdx === 0
                                      ? 'bg-yellow-400'
                                      : currentSwIdx === 1
                                      ? 'bg-amber-400'
                                      : currentSwIdx === 2
                                      ? 'bg-orange-500'
                                      : 'bg-amber-600'
                                  }`} />
                                  <SweetnessCupVisualizer level={SWEETNESS_MAP[activeMod.sugarLevel] ?? currentSwIdx} />
                                </motion.div>
                              </AnimatePresence>

                              <div className="w-28 sm:w-32 flex items-center justify-end text-xs font-bold transition-all">
                                {nextSwLabel ? (
                                  <span className="opacity-75 text-orange-600 flex items-center gap-1">
                                    <span className="text-[11px] truncate max-w-[80px]">{nextSwLabel}</span>
                                    <span className="text-sm">›</span>
                                  </span>
                                ) : (
                                  <span className="opacity-0 select-none">›</span>
                                )}
                              </div>
                            </div>

                            <div className="text-center">
                              <p className="text-xs font-bold text-orange-600 uppercase tracking-wider">Tingkat Kemanisan Pilihan Anda</p>
                              <p className="text-3xl font-black text-slate-900 mt-1">{activeMod.sugarLevel}</p>
                              <p className="text-xs text-slate-500 font-medium mt-1">
                                {currentSwIdx === 0
                                  ? 'Kemanisan Ringan & Natural 🍯'
                                  : currentSwIdx === 1
                                  ? 'Kemanisan Standar Pas Khas Arum Seduh 🍯🍯'
                                  : currentSwIdx === 2
                                  ? 'Kemanisan Lumayan Mantap 🍯🍯🍯'
                                  : 'Kemanisan Ekstra Legit & Super Sweet 🍯🍯🍯🍯'}
                              </p>
                            </div>

                            <div className="flex items-center justify-center gap-2 pt-2 flex-wrap">
                              {sweetnessOptions.map((opt, idx) => {
                                const isSel = currentSwIdx === idx;
                                return (
                                  <div
                                    key={opt}
                                    className={`min-w-[70px] text-center px-3 py-1.5 rounded-full text-xs font-black transition-all ${
                                      isSel
                                        ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/30 scale-110'
                                        : 'bg-white text-slate-600 border border-slate-200'
                                    }`}
                                  >
                                    {opt}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })()}

                      {currentKey === 'ICE' && (() => {
                        const iceOptions = ['Less Ice', 'Normal Ice', 'No Ice'];
                        const getIceIndex = (iLevel: string) => {
                          if (iLevel === 'Less Ice' || iLevel === 'Es Sedikit') return 0;
                          if (iLevel === 'Normal Ice' || iLevel === 'Normal' || iLevel === 'Es Normal') return 1;
                          if (iLevel === 'No Ice' || iLevel === 'Tanpa Es') return 2;
                          return 1;
                        };
                        const currentIceIdx = getIceIndex(activeMod.iceLevel);
                        const prevIceLabel = currentIceIdx > 0 ? iceOptions[currentIceIdx - 1] : null;
                        const nextIceLabel = currentIceIdx < iceOptions.length - 1 ? iceOptions[currentIceIdx + 1] : null;

                        return (
                          <div className="w-full flex flex-col items-center justify-center space-y-4">
                            <div className="w-full flex items-center justify-between px-2">
                              <div className="w-28 sm:w-32 flex items-center justify-start text-xs font-bold transition-all">
                                {prevIceLabel ? (
                                  <span className="opacity-75 text-cyan-600 flex items-center gap-1">
                                    <span className="text-sm">‹</span>
                                    <span className="text-[11px] truncate max-w-[80px]">{prevIceLabel}</span>
                                  </span>
                                ) : (
                                  <span className="opacity-0 select-none">‹</span>
                                )}
                              </div>

                              <AnimatePresence mode="wait">
                                <motion.div
                                  key={activeMod.iceLevel}
                                  initial={{ scale: 0.85, opacity: 0 }}
                                  animate={{ scale: 1.1, opacity: 1 }}
                                  exit={{ scale: 0.85, opacity: 0 }}
                                  transition={{ type: 'spring', damping: 20 }}
                                  className="flex flex-col items-center justify-center relative py-2 shrink-0"
                                >
                                  <div className={`absolute inset-0 rounded-full blur-2xl opacity-40 transition-colors ${
                                    currentIceIdx === 0
                                      ? 'bg-sky-400'
                                      : currentIceIdx === 2
                                      ? 'bg-slate-300'
                                      : 'bg-cyan-400'
                                  }`} />
                                  <IceCupVisualizer level={activeMod.iceLevel} />
                                </motion.div>
                              </AnimatePresence>

                              <div className="w-28 sm:w-32 flex items-center justify-end text-xs font-bold transition-all">
                                {nextIceLabel ? (
                                  <span className="opacity-75 text-cyan-600 flex items-center gap-1">
                                    <span className="text-[11px] truncate max-w-[80px]">{nextIceLabel}</span>
                                    <span className="text-sm">›</span>
                                  </span>
                                ) : (
                                  <span className="opacity-0 select-none">›</span>
                                )}
                              </div>
                            </div>

                            <div className="text-center">
                              <p className="text-xs font-bold text-cyan-600 uppercase tracking-wider">Level Es Batu Pilihan Anda</p>
                              <p className="text-3xl font-black text-slate-900 mt-1">{activeMod.iceLevel}</p>
                              <p className="text-xs text-slate-500 font-medium mt-1">
                                {currentIceIdx === 0
                                  ? 'Suhu Kesegaran Es Batu Sedikit 🧊'
                                  : currentIceIdx === 2
                                  ? 'Tanpa Es Batu / Suhu Normal 🍵'
                                  : 'Suhu Kesegaran Es Batu Standar 🧊🧊'}
                              </p>
                            </div>

                            <div className="flex items-center justify-center gap-2 pt-2 flex-wrap">
                              {iceOptions.map((opt, idx) => {
                                const isSel = currentIceIdx === idx;
                                return (
                                  <div
                                    key={opt}
                                    className={`min-w-[75px] text-center px-3 py-1.5 rounded-full text-xs font-black transition-all ${
                                      isSel
                                        ? 'bg-cyan-500 text-white shadow-lg shadow-cyan-500/30 scale-110'
                                        : 'bg-white text-slate-600 border border-slate-200'
                                    }`}
                                  >
                                    {opt}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })()}

                      {currentKey === 'SIZE' && (
                        <>
                          <GlassSizeVisualizer currentSize={activeMod.size} sizes={effectiveSizes} price={activeMod.sizePrice} />
                          <div>
                            <p className="text-xs font-bold text-orange-600 uppercase tracking-wider">Ukuran Gelas Pilihan Anda</p>
                            <p className="text-2xl font-black text-slate-900 mt-1">
                              {activeMod.size} {activeMod.sizePrice && activeMod.sizePrice > 0 ? `(+${formatRupiah(activeMod.sizePrice)})` : ''}
                            </p>
                          </div>
                        </>
                      )}
                    </motion.div>
                  </AnimatePresence>

                  <p className="text-xs text-slate-500 font-medium pt-1">
                    Pilihan Anda diperbarui secara real-time dari meja kasir ✨
                  </p>
                </div>
              );
            })()}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

const SWEETNESS_MAP: { [key: string]: number } = {
  'Less': 0,
  'Less Sugar': 0,
  'Biasa': 1,
  'Normal Sugar': 1,
  'Normal': 1,
  'Lumayan': 2,
  'Manis Sekali': 3,
};

function SweetnessLevelVisualizer({ currentSweetness }: { currentSweetness: string }) {
  const sweetnessList = [
    { key: 'Less', label: 'Less', title: 'Less Sugar', desc: 'Kurang Manis', color: 'border-yellow-400/90 bg-gradient-to-b from-yellow-400/20 to-yellow-600/35 text-yellow-300 shadow-yellow-500/20', icon: '🍯' },
    { key: 'Biasa', label: 'Biasa', title: 'Biasa (Normal)', desc: 'Manis Pas', color: 'border-amber-400 bg-gradient-to-b from-amber-500/30 to-amber-700/50 text-amber-300 shadow-amber-500/25', icon: '🍯🍯' },
    { key: 'Lumayan', label: 'Lumayan', title: 'Lumayan (Manis)', desc: 'Ekstra Manis', color: 'border-orange-500 bg-gradient-to-b from-orange-500/30 to-orange-700/50 text-orange-300 shadow-orange-500/25', icon: '🍯🍯🍯' },
  ];

  return (
    <div className="flex items-center justify-center gap-4 w-full py-2">
      {sweetnessList.map((sw) => {
        const isSelected =
          currentSweetness === sw.key ||
          (sw.key === 'Less' && (currentSweetness === 'Less Sugar' || currentSweetness === 'Sedikit Gula')) ||
          (sw.key === 'Biasa' && (currentSweetness === 'Normal Sugar' || currentSweetness === 'Normal' || currentSweetness === 'Biasa')) ||
          (sw.key === 'Lumayan' && (currentSweetness === 'Manis Sekali' || currentSweetness === 'Lumayan' || currentSweetness === 'Extra Sugar'));
        return (
          <motion.div
            key={sw.key}
            animate={{ scale: isSelected ? 1.12 : 0.88, opacity: isSelected ? 1 : 0.35 }}
            transition={{ type: 'spring', damping: 20 }}
            className="flex flex-col items-center gap-1.5"
          >
            <div className={`relative w-20 h-20 rounded-2xl border-2 transition-all flex flex-col items-center justify-center gap-1 ${
              isSelected ? `${sw.color} shadow-xl border-2` : 'border-slate-800 bg-slate-900/40 text-slate-500'
            }`}>
              <span className="text-xl select-none">{sw.icon}</span>
              <span className={`text-xs font-black ${isSelected ? 'text-slate-100' : 'text-slate-500'}`}>{sw.label}</span>
            </div>
            <p className={`text-[10px] font-bold ${isSelected ? 'text-amber-300' : 'text-slate-500'}`}>{sw.desc}</p>
          </motion.div>
        );
      })}
    </div>
  );
}

function IceLevelVisualizer({ currentIce }: { currentIce: string }) {
  const iceList = [
    { key: 'Less Ice', label: 'Less Ice', desc: 'Es Sedikit 🧊', color: 'border-sky-400/90 bg-gradient-to-b from-sky-400/20 to-sky-600/35 text-sky-300 shadow-sky-500/20', icon: '🧊' },
    { key: 'Normal Ice', label: 'Normal Ice', desc: 'Es Normal 🧊🧊', color: 'border-cyan-400 bg-gradient-to-b from-cyan-500/30 to-cyan-700/50 text-cyan-300 shadow-cyan-500/25', icon: '🧊🧊' },
    { key: 'No Ice', label: 'No Ice', desc: 'Tanpa Es 🚫', color: 'border-slate-400 bg-gradient-to-b from-slate-600/30 to-slate-800/50 text-slate-200 shadow-slate-500/20', icon: '🍵' },
  ];

  return (
    <div className="flex items-center justify-center gap-4 w-full py-2">
      {iceList.map((ic) => {
        const isSelected = currentIce === ic.key || (ic.key === 'Normal Ice' && currentIce === 'Normal');
        return (
          <motion.div
            key={ic.key}
            animate={{ scale: isSelected ? 1.12 : 0.88, opacity: isSelected ? 1 : 0.35 }}
            transition={{ type: 'spring', damping: 20 }}
            className="flex flex-col items-center gap-1.5"
          >
            <div className={`relative w-20 h-20 rounded-2xl border-2 transition-all flex flex-col items-center justify-center gap-1 ${
              isSelected ? `${ic.color} shadow-xl border-2` : 'border-slate-800 bg-slate-900/40 text-slate-500'
            }`}>
              <span className="text-xl select-none">{ic.icon}</span>
              <span className={`text-xs font-black ${isSelected ? 'text-slate-100' : 'text-slate-500'}`}>{ic.label}</span>
            </div>
            <p className={`text-[10px] font-bold ${isSelected ? 'text-cyan-300' : 'text-slate-500'}`}>{ic.desc}</p>
          </motion.div>
        );
      })}
    </div>
  );
}

function IceCupVisualizer({ level }: { level: string }) {
  const isNoIce = level === 'No Ice' || level === 'Tanpa Es';
  const isLessIce = level === 'Less Ice' || level === 'Es Sedikit';
  const cubeCount = isNoIce ? 0 : isLessIce ? 1 : 3;

  return (
    <div className="relative w-28 h-28 flex items-center justify-center select-none pointer-events-none">
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes ice-float {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-6px) rotate(4deg); }
        }
        @keyframes frost-pulse {
          0%, 100% { opacity: 0.3; transform: scale(0.98); }
          50% { opacity: 0.7; transform: scale(1.02); }
        }
      `}} />
      <div
        className="absolute inset-0 rounded-full bg-cyan-400/20 blur-xl"
        style={{ animation: 'frost-pulse 2.5s ease-in-out infinite' }}
      />
      <div className="relative w-20 h-24 rounded-b-3xl rounded-t-lg border-2 border-cyan-300/40 bg-gradient-to-b from-cyan-500/10 via-cyan-400/20 to-cyan-600/30 backdrop-blur-md overflow-hidden flex flex-col justify-end p-2 shadow-inner">
        <div className="w-full h-[75%] rounded-b-2xl bg-gradient-to-t from-cyan-400/40 via-cyan-300/20 to-transparent relative flex items-center justify-center">
          {cubeCount > 0 ? (
            <div className="flex flex-wrap items-center justify-center gap-1">
              {Array.from({ length: cubeCount }).map((_, i) => (
                <div
                  key={i}
                  className="w-5 h-5 rounded-md bg-white/70 border border-cyan-200 shadow-md backdrop-blur-sm"
                  style={{
                    animationName: 'ice-float',
                    animationDuration: `${2 + i * 0.4}s`,
                    animationTimingFunction: 'ease-in-out',
                    animationIterationCount: 'infinite',
                    animationDelay: `${i * 0.2}s`,
                  }}
                />
              ))}
            </div>
          ) : (
            <div className="text-[10px] font-bold text-cyan-200/80 bg-cyan-950/40 px-2 py-0.5 rounded-full border border-cyan-400/30">
              Tanpa Es
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function GlassSizeVisualizer({ currentSize, sizes, price }: { currentSize?: string; sizes?: { name: string; price: number }[]; price?: number }) {
  const sizeList = sizes && sizes.length > 0 ? sizes : [
    { name: 'Regular', price: 0 },
    { name: 'Large', price: 3000 },
  ];

  return (
    <div className="flex items-end justify-center gap-6 w-full py-2">
      {sizeList.map((sz, idx) => {
        const isSelected = (currentSize || sizeList[0]?.name) === sz.name;
        const hClass = idx === 0 ? 'h-16 w-12' : idx === 1 ? 'h-20 w-14' : 'h-24 w-16';
        return (
          <motion.div
            key={sz.name}
            animate={{ scale: isSelected ? 1.1 : 0.9, opacity: isSelected ? 1 : 0.4 }}
            transition={{ type: 'spring', damping: 20 }}
            className="flex flex-col items-center gap-2"
          >
            <div className={`relative rounded-b-2xl rounded-t-md border-2 transition-all flex items-center justify-center ${
              isSelected ? 'border-indigo-400 bg-gradient-to-b from-indigo-500/20 to-indigo-700/40 shadow-lg shadow-indigo-500/20' : 'border-slate-700 bg-slate-800/40'
            } ${hClass}`}>
              <span className="text-xl">🥤</span>
            </div>
            <div className="text-center">
              <p className={`text-xs font-black ${isSelected ? 'text-indigo-300' : 'text-slate-500'}`}>{sz.name}</p>
              <p className="text-[10px] font-semibold text-slate-400">{sz.price > 0 ? `+${formatRupiah(sz.price)}` : 'Standard'}</p>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}

function MatchaCupVisualizer({ level }: { level: number }) {
  const h = 95 + (level - 1) * (45 / 9);
  const s = 45 + (level - 1) * (20 / 9);
  const l = 85 - (level - 1) * (73 / 9);
  const liquidColor = `hsl(${h}, ${s}%, ${l}%)`;
  const steamCount = Math.min(6, Math.floor(level / 1.5) + 1);
  const bubbleCount = Math.min(10, level);

  return (
    <div className="relative w-24 h-24 flex items-center justify-center select-none pointer-events-none">
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes steam-rise {
          0% { transform: translateY(5px) scale(0.8); opacity: 0; }
          50% { opacity: 0.55; }
          100% { transform: translateY(-40px) scale(1.2); opacity: 0; }
        }
        @keyframes bubble-float {
          0% { transform: translateY(0) scale(0.6); opacity: 0.2; }
          80% { opacity: 0.7; }
          100% { transform: translateY(-25px) scale(1); opacity: 0; }
        }
        @keyframes cup-shake {
          0%, 100% { transform: rotate(0deg); }
          50% { transform: rotate(${Math.min(3, level / 3)}deg); }
        }
      `}} />
      <div className="absolute top-2 w-full flex justify-center gap-1.5 z-10 pointer-events-none">
        {Array.from({ length: steamCount }).map((_, i) => (
          <div
            key={i}
            className="w-1.5 h-6 rounded-full bg-white/20 blur-[1.5px]"
            style={{
              animationName: 'steam-rise',
              animationDuration: `${1.5 + (i % 3) * 0.3}s`,
              animationTimingFunction: 'ease-in-out',
              animationIterationCount: 'infinite',
              animationDelay: `${i * 0.3}s`,
            }}
          />
        ))}
      </div>
      <svg
        width="80"
        height="80"
        viewBox="0 0 100 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{
          animationName: level > 7 ? 'cup-shake' : 'none',
          animationDuration: '0.3s',
          animationTimingFunction: 'ease-in-out',
          animationIterationCount: 'infinite',
        }}
        className="relative z-20 drop-shadow-[0_4px_12px_rgba(46,90,68,0.12)]"
      >
        <path d="M72 40 C84 40, 84 64, 72 64" stroke="#D4A574" strokeWidth="6" strokeLinecap="round" />
        <path d="M20 28 L28 76 C29 82, 35 86, 42 86 H58 C65 86, 71 82, 72 76 L80 28 Z" fill="rgba(255, 255, 255, 0.45)" stroke="#E5E2DD" strokeWidth="3.5" />
        <path d="M23 48 L28 76 C29 80, 34 83, 40 83 H60 C66 83, 71 80, 72 76 L77 48 Z" fill={liquidColor} className="transition-colors duration-500 ease-out" />
        <ellipse cx="50" cy="48" rx="27" ry="5.5" fill={liquidColor} className="transition-colors duration-500 ease-out" />
        <path d="M26 34 L32 70" stroke="rgba(255, 255, 255, 0.7)" strokeWidth="3" strokeLinecap="round" />
      </svg>
      <div className="absolute bottom-6 w-12 h-8 z-30 pointer-events-none">
        {Array.from({ length: bubbleCount }).map((_, i) => {
          const left = 20 + ((i * 17) % 60);
          const delay = (i * 0.3) % 2;
          const duration = 1 + ((i * 0.2) % 1.5);
          return (
            <div
              key={i}
              className="absolute w-2 h-2 rounded-full border border-white/20"
              style={{
                left: `${left}%`,
                bottom: '0px',
                backgroundColor: `hsla(${h}, ${s}%, ${l}%, 0.45)`,
                animationName: 'bubble-float',
                animationDuration: `${duration}s`,
                animationTimingFunction: 'ease-in',
                animationIterationCount: 'infinite',
                animationDelay: `${delay}s`,
              }}
            />
          );
        })}
      </div>
    </div>
  );
}

function SweetnessCupVisualizer({ level }: { level: number }) {
  const h = 45;
  const s = 60 + level * 10;
  const l = 95 - level * 13;
  const liquidColor = `hsl(${h}, ${s}%, ${l}%)`;
  const steamCount = Math.min(6, level + 1);
  const bubbleCount = Math.min(10, (level + 1) * 2.5);

  return (
    <div className="relative w-24 h-24 flex items-center justify-center select-none pointer-events-none">
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes sugar-steam-rise {
          0% { transform: translateY(5px) scale(0.8); opacity: 0; }
          50% { opacity: 0.55; }
          100% { transform: translateY(-40px) scale(1.2); opacity: 0; }
        }
        @keyframes sugar-bubble-float {
          0% { transform: translateY(0) scale(0.6); opacity: 0.2; }
          80% { opacity: 0.7; }
          100% { transform: translateY(-25px) scale(1); opacity: 0; }
        }
        @keyframes sugar-cup-shake {
          0%, 100% { transform: rotate(0deg); }
          50% { transform: rotate(${Math.min(3, level * 1)}deg); }
        }
      `}} />
      <div className="absolute top-2 w-full flex justify-center gap-1.5 z-10 pointer-events-none">
        {Array.from({ length: steamCount }).map((_, i) => (
          <div
            key={i}
            className="w-1.5 h-6 rounded-full bg-white/20 blur-[1.5px]"
            style={{
              animationName: 'sugar-steam-rise',
              animationDuration: `${1.5 + (i % 3) * 0.3}s`,
              animationTimingFunction: 'ease-in-out',
              animationIterationCount: 'infinite',
              animationDelay: `${i * 0.3}s`,
            }}
          />
        ))}
      </div>
      <svg
        width="80"
        height="80"
        viewBox="0 0 100 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{
          animationName: level > 2 ? 'sugar-cup-shake' : 'none',
          animationDuration: '0.3s',
          animationTimingFunction: 'ease-in-out',
          animationIterationCount: 'infinite',
        }}
        className="relative z-20 drop-shadow-[0_4px_12px_rgba(212,165,116,0.12)]"
      >
        <path d="M72 40 C84 40, 84 64, 72 64" stroke="#F1C40F" strokeWidth="6" strokeLinecap="round" />
        <path d="M20 28 L28 76 C29 82, 35 86, 42 86 H58 C65 86, 71 82, 72 76 L80 28 Z" fill="rgba(255, 255, 255, 0.45)" stroke="#E5E2DD" strokeWidth="3.5" />
        <path d="M23 48 L28 76 C29 80, 34 83, 40 83 H60 C66 83, 71 80, 72 76 L77 48 Z" fill={liquidColor} className="transition-colors duration-500 ease-out" />
        <ellipse cx="50" cy="48" rx="27" ry="5.5" fill={liquidColor} className="transition-colors duration-500 ease-out" />
        <path d="M26 34 L32 70" stroke="rgba(255, 255, 255, 0.7)" strokeWidth="3" strokeLinecap="round" />
      </svg>
      <div className="absolute bottom-6 w-12 h-8 z-30 pointer-events-none">
        {Array.from({ length: bubbleCount }).map((_, i) => {
          const left = 20 + ((i * 17) % 60);
          const delay = (i * 0.3) % 2;
          const duration = 1 + ((i * 0.2) % 1.5);
          return (
            <div
              key={i}
              className="absolute w-2 h-2 rounded-full border border-white/20"
              style={{
                left: `${left}%`,
                bottom: '0px',
                backgroundColor: `hsla(${h}, ${s}%, ${l}%, 0.45)`,
                animationName: 'sugar-bubble-float',
                animationDuration: `${duration}s`,
                animationTimingFunction: 'ease-in',
                animationIterationCount: 'infinite',
                animationDelay: `${delay}s`,
              }}
            />
          );
        })}
      </div>
    </div>
  );
}

function AmericanoShotVisualizer({ shotName, shotCount = 1, shots, price }: { shotName?: string; shotCount?: number; shots?: { name: string; shots: number; price: number }[]; price?: number }) {
  const currentCount = shotCount || 1;

  return (
    <div className="flex flex-col items-center justify-center gap-4 w-full py-2 select-none pointer-events-none">
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes coffee-steam {
          0% { transform: translateY(5px) scale(0.8); opacity: 0; }
          50% { opacity: 0.6; }
          100% { transform: translateY(-35px) scale(1.2); opacity: 0; }
        }
        @keyframes bean-pulse {
          0%, 100% { transform: scale(1) rotate(0deg); }
          50% { transform: scale(1.15) rotate(6deg); }
        }
      `}} />
      <div className="relative w-28 h-28 flex items-center justify-center">
        {/* Steam */}
        <div className="absolute -top-3 w-full flex justify-center gap-2 z-10">
          {Array.from({ length: Math.min(5, currentCount * 2) }).map((_, i) => (
            <div
              key={i}
              className="w-1.5 h-6 rounded-full bg-amber-100/30 blur-[1px]"
              style={{
                animationName: 'coffee-steam',
                animationDuration: `${1.4 + (i % 3) * 0.3}s`,
                animationTimingFunction: 'ease-in-out',
                animationIterationCount: 'infinite',
                animationDelay: `${i * 0.25}s`,
              }}
            />
          ))}
        </div>

        {/* Coffee Glass SVG Frame */}
        <div className="relative w-20 h-24 rounded-b-3xl rounded-t-lg border-2 border-amber-700/50 bg-gradient-to-b from-amber-950/20 to-slate-950/90 backdrop-blur-md overflow-hidden flex flex-col justify-end p-2 shadow-2xl">
          {/* Crema Foam Top Layer */}
          <div className="w-full h-3 rounded-t-md bg-gradient-to-r from-amber-600/70 via-amber-500/80 to-amber-700/70 shadow-sm border-b border-amber-800/40 shrink-0" />
          
          {/* Liquid Espresso Body */}
          <div
            className="w-full transition-all duration-500 rounded-b-2xl relative flex items-center justify-center"
            style={{
              height: `${Math.min(90, 55 + currentCount * 12)}%`,
              backgroundColor: currentCount === 1 ? 'hsl(25, 60%, 18%)' : currentCount === 2 ? 'hsl(20, 70%, 12%)' : 'hsl(15, 80%, 7%)',
            }}
          >
            {/* Floating Coffee Beans Icons inside Liquid */}
            <div className="flex items-center justify-center gap-1.5">
              {Array.from({ length: currentCount }).map((_, i) => (
                <span
                  key={i}
                  className="text-lg filter drop-shadow-md"
                  style={{
                    animationName: 'bean-pulse',
                    animationDuration: `${1.8 + i * 0.3}s`,
                    animationTimingFunction: 'ease-in-out',
                    animationIterationCount: 'infinite',
                    animationDelay: `${i * 0.2}s`,
                  }}
                >
                  ☕
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
