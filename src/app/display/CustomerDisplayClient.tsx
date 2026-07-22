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
    addOns: { id: string; name: string; price: number }[];
    totalPrice: number;
    image?: string | null;
  }[];
  subtotal: number;
  tumblerDiscount: number;
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
    showSweetness: boolean;
    showMatcha: boolean;
    defaultMatcha: number;
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
      }
    };

    channel.onmessage = handleMessage;

    // LocalStorage fallback for cross-tab sync
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'pos_customer_display_state' && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          setDisplayState(parsed);
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

  // Auto banner rotation
  useEffect(() => {
    if (settings.banners.length <= 1) return;
    const interval = setInterval(() => {
      setActiveBannerIndex((prev) => (prev + 1) % settings.banners.length);
    }, 6000);
    return () => clearInterval(interval);
  }, [settings.banners]);

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
    <div className="fixed inset-0 bg-slate-950 text-slate-100 flex flex-col font-sans select-none overflow-hidden z-[99999]">
      {/* Header Bar */}
      <header className="h-16 px-8 bg-slate-900/90 border-b border-slate-800/80 backdrop-blur-md flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-600 via-amber-500 to-emerald-400 flex items-center justify-center font-black text-slate-950 shadow-lg text-xl tracking-tighter">
            AS
          </div>
          <div>
            <h1 className="font-extrabold text-xl text-slate-100 tracking-tight flex items-center gap-2">
              Arum Seduh
              <span className="text-[10px] px-2 py-0.5 rounded-md bg-amber-500/10 border border-amber-500/30 text-amber-400 font-bold uppercase tracking-wider">
                Katalog Menu & POS Display
              </span>
            </h1>
            <p className="text-[11px] text-slate-400 font-medium">Layar Monitor Pelanggan Realtime</p>
          </div>
        </div>

        {/* Live Status & Controls */}
        <div className="flex items-center gap-4">
          {displayState?.customerName && (
            <div className="px-3.5 py-1.5 rounded-full bg-slate-800/90 border border-slate-700/80 text-xs font-bold text-amber-300 flex items-center gap-2 shadow-sm">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
              Pelanggan: {displayState.customerName}
            </div>
          )}
          <div className="flex items-center gap-1.5 text-xs text-slate-400 bg-slate-900/80 px-3 py-1.5 rounded-xl border border-slate-800">
            <Clock className="w-3.5 h-3.5 text-amber-500" />
            <span>{new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</span>
          </div>
          <button
            onClick={toggleFullscreen}
            className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-700/60 transition-colors"
            title="Layar Penuh (Fullscreen)"
          >
            <Maximize className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Main Dual Grid View */}
      <main className="flex-1 grid grid-cols-12 overflow-hidden relative">
        {/* LEFT COLUMN: Menu Catalog Grid & Prices (7 cols) */}
        <div className="col-span-7 p-6 border-r border-slate-800/60 flex flex-col justify-between relative bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 overflow-hidden">
          {/* Background Ambient Glow */}
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

          {/* ORDER COMPLETED STATE */}
          <AnimatePresence mode="wait">
            {isCompleted ? (
              <motion.div
                key="completed"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="my-auto bg-slate-900/95 border border-emerald-500/40 rounded-3xl p-8 shadow-2xl backdrop-blur-xl max-w-lg mx-auto w-full text-center space-y-6 relative overflow-hidden"
              >
                <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-500" />
                
                {/* Animated Checkmark Circle */}
                <div className="relative mx-auto w-28 h-28 flex items-center justify-center">
                  <div className="absolute inset-0 rounded-full bg-emerald-500/20 animate-ping opacity-75" />
                  <motion.div
                    initial={{ scale: 0, rotate: -45 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ type: 'spring', stiffness: 200, damping: 12 }}
                    className="w-24 h-24 rounded-full bg-gradient-to-tr from-emerald-600 to-teal-400 text-slate-950 flex items-center justify-center shadow-2xl shadow-emerald-500/40 relative z-10"
                  >
                    <CheckCircle2 className="w-14 h-14 stroke-[2.5]" />
                  </motion.div>
                </div>

                <div className="space-y-2">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-black uppercase tracking-wider">
                    <Sparkles className="w-3.5 h-3.5 text-emerald-400" /> Pembayaran Berhasil & Terverifikasi
                  </div>
                  <h2 className="text-3xl font-black text-white">Terima Kasih di Arum Seduh!</h2>
                  <p className="text-xs text-slate-400 max-w-md mx-auto">
                    Pesanan Anda sedang disiapkan oleh barista kami. Silakan menunggu pemanggilan nama.
                  </p>
                </div>

                {/* Transaction Receipt Card */}
                <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 text-left space-y-2 text-xs">
                  <div className="flex justify-between items-center pb-2 border-b border-slate-800/80">
                    <span className="text-slate-400">Nama Pelanggan</span>
                    <span className="font-bold text-amber-300">{displayState?.customerName || 'Pelanggan'}</span>
                  </div>
                  <div className="flex justify-between items-center pb-2 border-b border-slate-800/80">
                    <span className="text-slate-400">ID Pesanan</span>
                    <span className="font-mono text-slate-300">#{displayState?.orderId?.slice(0, 8).toUpperCase() || 'LUNAS'}</span>
                  </div>
                  <div className="flex justify-between items-center pb-2 border-b border-slate-800/80">
                    <span className="text-slate-400">Metode Pembayaran</span>
                    <span className="font-bold text-emerald-400">
                      {displayState?.paymentMethod === 'QRIS' ? 'QRIS DOKU (LUNAS)' : 'TUNAI / CASH (LUNAS)'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center pt-1 text-sm font-black">
                    <span className="text-slate-200">Total Dibayar</span>
                    <span className="text-emerald-400">{formatRupiah(totalPayable)}</span>
                  </div>
                </div>

                {/* Auto-Reset Countdown Badge */}
                {resetCountdown !== null && (
                  <div className="text-[11px] text-slate-500 font-semibold flex items-center justify-center gap-1.5 pt-1">
                    <Clock className="w-3.5 h-3.5 text-amber-500 animate-spin" />
                    <span>Kembali ke katalog menu dalam <strong className="text-amber-400 font-bold">{resetCountdown}s</strong>...</span>
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
                className="my-auto bg-slate-900/95 border border-amber-500/40 rounded-3xl p-8 shadow-2xl backdrop-blur-xl max-w-md mx-auto w-full text-center space-y-6 relative overflow-hidden"
              >
                <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-amber-500 via-emerald-400 to-amber-500" />
                
                <div>
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-bold uppercase tracking-wider mb-2">
                    <QrCode className="w-3.5 h-3.5" /> Scan QRIS Untuk Membayar
                  </div>
                  <h3 className="text-3xl font-black text-white">{formatRupiah(totalPayable)}</h3>
                </div>

                {/* QR Code Frame */}
                <div className="p-4 bg-white rounded-2xl shadow-2xl inline-block border-4 border-amber-400/80 mx-auto relative group min-w-[280px] min-h-[280px]">
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
                      <Loader2 className="w-10 h-10 animate-spin text-amber-500" />
                      <p className="text-xs font-bold text-slate-500 animate-pulse">Membuat QRIS Dinamis...</p>
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <p className="text-xs text-slate-300 font-medium">
                    Bisa digunakan untuk GoPay, OVO, Dana, ShopeePay, BCA, Mandiri & aplikasi m-Banking QRIS lainnya.
                  </p>
                  {settings.qrisNmid && (
                    <p className="text-[10px] text-slate-400 font-mono">NMID: {settings.qrisNmid}</p>
                  )}
                </div>

                <div className="flex items-center justify-center gap-2 pt-2 text-[11px] text-emerald-400 font-semibold border-t border-slate-800">
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
                      <h2 className="text-lg font-black text-white flex items-center gap-2">
                        <Sparkles className="w-5 h-5 text-amber-400" /> Katalog Menu Arum Seduh
                      </h2>
                      <p className="text-xs text-slate-400">Daftar minuman & makanan pilihan yang dapat Anda pesan</p>
                    </div>
                  </div>

                  {/* Category Filter Pills */}
                  <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
                    <button
                      onClick={() => setSelectedCategory('all')}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                        selectedCategory === 'all'
                          ? 'bg-amber-500 text-slate-950 shadow-md'
                          : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200'
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
                            ? 'bg-amber-500 text-slate-950 shadow-md'
                            : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200'
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
                    <div className="py-16 text-center text-slate-500">
                      <Coffee className="w-10 h-10 mx-auto mb-2 opacity-30" />
                      <p className="text-sm">Belum ada menu di kategori ini</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
                      {filteredProducts.map((product) => (
                        <div
                          key={product.id}
                          className={`relative rounded-2xl border p-3 flex flex-col justify-between transition-all overflow-hidden ${
                            product.isSoldOut
                              ? 'bg-slate-900/40 border-slate-800/80 opacity-70'
                              : 'bg-slate-900/90 border-slate-800 hover:border-amber-500/50 shadow-sm'
                          }`}
                        >
                          {/* Image & Badges */}
                          <div className="relative aspect-video rounded-xl bg-slate-950/60 overflow-hidden mb-2.5">
                            {product.image ? (
                              <img
                                src={product.image}
                                alt={product.name}
                                className={`w-full h-full object-cover ${product.isSoldOut ? 'grayscale opacity-50' : ''}`}
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-slate-700">
                                <Coffee className="w-8 h-8" />
                              </div>
                            )}

                            {/* Sold Out Overlay Badge */}
                            {product.isSoldOut ? (
                              <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-[2px] flex items-center justify-center">
                                <span className="px-2.5 py-1 rounded-lg bg-rose-600 text-white font-black text-[10px] uppercase tracking-wider flex items-center gap-1 shadow-lg">
                                  <AlertCircle className="w-3.5 h-3.5" /> Stok Habis
                                </span>
                              </div>
                            ) : product.badge ? (
                              <span className="absolute top-2 left-2 px-2 py-0.5 rounded-md bg-amber-500 text-slate-950 text-[9px] font-black uppercase tracking-wider shadow-sm flex items-center gap-1">
                                <Flame className="w-3 h-3" /> {product.badge}
                              </span>
                            ) : null}
                          </div>

                          {/* Product Info */}
                          <div className="space-y-1">
                            <span className="text-[9px] font-extrabold uppercase tracking-wider text-amber-500/80">
                              {product.categoryName}
                            </span>
                            <h4 className="font-bold text-xs text-slate-100 line-clamp-1">{product.name}</h4>
                            <p className="text-[10px] text-slate-400 line-clamp-1">{product.description}</p>
                          </div>

                          {/* Price & Availability Tag */}
                          <div className="flex items-center justify-between pt-2.5 border-t border-slate-800/60 mt-2">
                            <span className="text-xs font-black text-amber-400">{formatRupiah(product.price)}</span>
                            {product.isSoldOut ? (
                              <span className="text-[9px] font-bold text-rose-400">Habis</span>
                            ) : (
                              <span className="text-[9px] font-bold text-emerald-400 flex items-center gap-0.5">
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
                <div className="p-3 rounded-2xl bg-slate-900/60 border border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400 shrink-0">
                  <div className="flex items-center gap-2">
                    <Leaf className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Bawa Wadah/Tumbler Sendiri = Diskon Poin & Bonus 🌿</span>
                  </div>
                  <span className="text-amber-400 font-bold">#ArumSeduhAuthentic</span>
                </div>
              </div>
            )}
          </AnimatePresence>
        </div>

        {/* RIGHT COLUMN: Order Items & Total Summary (5 cols) */}
        <div className="col-span-5 bg-slate-900/40 p-6 flex flex-col justify-between overflow-hidden">
          {/* Top Info Bar */}
          <div className="flex items-center justify-between pb-4 border-b border-slate-800/80">
            <div className="flex items-center gap-2">
              <ShoppingBag className="w-4 h-4 text-amber-500" />
              <h3 className="font-bold text-sm text-slate-200">Daftar Pesanan Anda</h3>
            </div>
            {displayState?.orderType && (
              <span className="px-2.5 py-1 rounded-lg bg-slate-800 text-amber-400 border border-amber-500/20 text-[10px] font-extrabold uppercase tracking-wider">
                {displayState.orderType === 'DINE_IN' ? `DINE IN ${displayState.tableNumber ? `(Meja ${displayState.tableNumber})` : ''}` : 'PICKUP'}
              </span>
            )}
          </div>

          {/* Cart Itemized List */}
          <div className="flex-1 overflow-y-auto py-4 space-y-3 scrollbar-none [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
            {cart.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center text-slate-500 space-y-3 py-16">
                <Coffee className="w-12 h-12 stroke-[1.5] text-slate-600 opacity-40 animate-pulse" />
                <div>
                  <p className="text-sm font-semibold text-slate-400">Pilih Menu dari Katalog di Sebelah Kiri</p>
                  <p className="text-xs text-slate-600 mt-1">Item yang diinput kasir akan muncul secara real-time di sini</p>
                </div>
              </div>
            ) : (
              cart.map((item) => (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800/80 flex items-center justify-between gap-3 shadow-sm hover:border-slate-700 transition-all"
                >
                  {/* Product Image Thumbnail */}
                  <div className="w-12 h-12 rounded-xl bg-slate-950 overflow-hidden shrink-0 border border-slate-800 relative flex items-center justify-center">
                    {item.image ? (
                      <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                    ) : (
                      <Coffee className="w-6 h-6 text-slate-600" />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-sm text-slate-100 truncate">{item.name}</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      {item.iceLevel} · {item.sugarLevel}
                      {item.addOns?.length > 0 && ` · +${item.addOns.map((a) => a.name).join(', ')}`}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xs font-bold text-amber-400">{formatRupiah(item.totalPrice)}</p>
                    <p className="text-[10px] text-slate-500 font-semibold">{item.quantity}x @ {formatRupiah(item.basePrice + item.addOns.reduce((s, a) => s + a.price, 0))}</p>
                  </div>
                </motion.div>
              ))
            )}
          </div>

          {/* Bottom Total & Checkout Summary */}
          <div className="pt-4 border-t border-slate-800/80 space-y-3">
            {displayState?.hasTumbler && displayState.tumblerDiscount > 0 && (
              <div className="flex justify-between items-center text-xs font-medium text-emerald-400 px-1">
                <span className="flex items-center gap-1.5">
                  <Leaf className="w-3.5 h-3.5" /> Diskon Wadah Tumbler
                </span>
                <span>-{formatRupiah(displayState.tumblerDiscount)}</span>
              </div>
            )}

            <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-600 via-amber-500 to-amber-600 text-slate-950 flex items-center justify-between shadow-xl">
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-950/70">Total Bayar</p>
                <p className="text-2xl font-black text-slate-950 tracking-tight">{formatRupiah(totalPayable)}</p>
              </div>
              <div className="px-3.5 py-1.5 rounded-xl bg-slate-950/20 backdrop-blur-sm text-slate-950 text-xs font-bold border border-slate-950/20">
                {displayState?.paymentMethod === 'QRIS' ? 'QRIS' : 'CASH'}
              </div>
            </div>
          </div>
        </div>
      </main>
      {/* Real-time Customization Pop-up Overlay (Matcha & Sweetness Visualizers) */}
      <AnimatePresence>
        {displayState?.activeModifier && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-6 pointer-events-none select-none"
          >
            <div className="w-full max-w-2xl bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-6 text-center">
              <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                <div className="flex items-center gap-3 text-left">
                  <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center shrink-0 text-xl font-bold">
                    ☕
                  </div>
                  <div>
                    <h2 className="text-lg font-black text-slate-100">{displayState.activeModifier.productName}</h2>
                    <p className="text-xs font-semibold text-amber-400">{formatRupiah(displayState.activeModifier.price)}</p>
                  </div>
                </div>
                <div className="px-3 py-1 rounded-full bg-slate-800 text-amber-400 text-xs font-bold border border-slate-700">
                  Kustomisasi Pilihan Anda
                </div>
              </div>

              {/* Visualizers Grid */}
              <div className={`grid gap-4 ${displayState.activeModifier.showMatcha && displayState.activeModifier.showSweetness ? 'grid-cols-2' : 'grid-cols-1'}`}>
                
                {/* 1. Matcha Visualizer (If Matcha beverage) */}
                {displayState.activeModifier.showMatcha && (
                  <div className="bg-emerald-950/30 border border-emerald-500/20 p-5 rounded-3xl flex flex-col items-center justify-center space-y-3 relative overflow-hidden">
                    <div className="w-20 h-20 flex items-center justify-center">
                      <MatchaCupVisualizer level={displayState.activeModifier.matchaLevel} />
                    </div>
                    <div>
                      <h3 className="text-xs font-bold text-emerald-400 uppercase tracking-wider">Kepekatan Matcha</h3>
                      <p className="text-2xl font-black text-emerald-200 mt-1">Level {displayState.activeModifier.matchaLevel}</p>
                    </div>
                  </div>
                )}

                {/* 2. Sweetness & Ice Visualizer */}
                {displayState.activeModifier.showSweetness && (
                  <div className="bg-amber-950/30 border border-amber-500/20 p-5 rounded-3xl flex flex-col items-center justify-center space-y-3 relative overflow-hidden">
                    <div className="w-20 h-20 flex items-center justify-center">
                      <SweetnessCupVisualizer level={SWEETNESS_MAP[displayState.activeModifier.sugarLevel] ?? 1} />
                    </div>
                    <div>
                      <h3 className="text-xs font-bold text-amber-400 uppercase tracking-wider">Tingkat Kemanisan</h3>
                      <p className="text-2xl font-black text-amber-200 mt-1">{displayState.activeModifier.sugarLevel}</p>
                      <p className="text-[11px] font-semibold text-slate-400 mt-1">❄️ {displayState.activeModifier.iceLevel}</p>
                    </div>
                  </div>
                )}
              </div>

              <p className="text-xs text-slate-400 font-medium">
                Pilihan Anda diperbarui secara real-time dari meja kasir ✨
              </p>
            </div>
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
              animation: `steam-rise ${1.5 + Math.random() * 1}s ease-in-out infinite`,
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
          animation: level > 7 ? 'cup-shake 0.3s ease-in-out infinite' : 'none',
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
          const left = 20 + Math.random() * 60;
          const delay = Math.random() * 2;
          const duration = 1 + Math.random() * 1.5;
          return (
            <div
              key={i}
              className="absolute w-2 h-2 rounded-full border border-white/20"
              style={{
                left: `${left}%`,
                bottom: '0px',
                backgroundColor: `hsla(${h}, ${s}%, ${l}%, 0.45)`,
                animation: `bubble-float ${duration}s ease-in infinite`,
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
              animation: `sugar-steam-rise ${1.5 + Math.random() * 1}s ease-in-out infinite`,
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
          animation: level > 2 ? 'sugar-cup-shake 0.3s ease-in-out infinite' : 'none',
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
          const left = 20 + Math.random() * 60;
          const delay = Math.random() * 2;
          const duration = 1 + Math.random() * 1.5;
          return (
            <div
              key={i}
              className="absolute w-2 h-2 rounded-full border border-white/20"
              style={{
                left: `${left}%`,
                bottom: '0px',
                backgroundColor: `hsla(${h}, ${s}%, ${l}%, 0.45)`,
                animation: `sugar-bubble-float ${duration}s ease-in infinite`,
                animationDelay: `${delay}s`,
              }}
            />
          );
        })}
      </div>
    </div>
  );
}
