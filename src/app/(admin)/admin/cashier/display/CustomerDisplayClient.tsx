'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ShoppingBag,
  QrCode,
  Coffee,
  CheckCircle2,
  Sparkles,
  Leaf,
  Store,
  Clock,
  ArrowRight,
  ShieldCheck,
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
  timestamp: number;
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
  }>({
    qrisImage: null,
    qrisLabel: 'QRIS',
    qrisNmid: '',
    storeName: 'Arum Seduh',
    storeAddress: '',
    banners: [],
  });

  const [activeBannerIndex, setActiveBannerIndex] = useState(0);

  // Fetch store display settings (QRIS image & promo banners)
  useEffect(() => {
    fetch('/api/cashier/display-settings')
      .then((res) => res.json())
      .then((data) => {
        if (!data.error) {
          setSettings(data);
        }
      })
      .catch(() => {});
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

    return () => {
      channel.close();
      window.removeEventListener('storage', handleStorageChange);
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

  const cart = displayState?.cart || [];
  const totalPayable = displayState?.totalPayable || 0;
  const isQRIS = displayState?.paymentMethod === 'QRIS' && cart.length > 0;
  const isCompleted = displayState?.isCompleted === true;
  const activeBanner = settings.banners[activeBannerIndex];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans select-none overflow-hidden">
      {/* Header Bar */}
      <header className="h-16 px-8 bg-white border-b border-orange-100 shadow-sm backdrop-blur-md flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-orange-600 to-amber-500 flex items-center justify-center font-bold text-white shadow-md">
            M
          </div>
          <div>
            <h1 className="font-bold text-lg text-slate-900 tracking-tight">{settings.storeName}</h1>
            <p className="text-[11px] text-slate-500 font-medium">Customer Facing Display</p>
          </div>
        </div>

        {/* Live Status indicator */}
        <div className="flex items-center gap-4">
          {displayState?.customerName && (
            <div className="px-3 py-1.5 rounded-full bg-orange-50 border border-orange-200 text-xs font-semibold text-orange-800 flex items-center gap-2 shadow-sm">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              Pelanggan: {displayState.customerName}
            </div>
          )}
          <div className="flex items-center gap-1.5 text-xs text-slate-600 bg-orange-50/50 px-3 py-1.5 rounded-xl border border-orange-100">
            <Clock className="w-3.5 h-3.5 text-orange-500" />
            <span>{new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</span>
          </div>
        </div>
      </header>

      {/* Main Dual Grid View */}
      <main className="flex-1 grid grid-cols-12 overflow-hidden relative">
        {/* LEFT COLUMN: Media / Banner / QRIS Overlay (7 cols) */}
        <div className="col-span-7 p-6 border-r border-orange-100 flex flex-col justify-between relative bg-gradient-to-br from-orange-50/30 via-white to-amber-50/30 overflow-hidden">
          {/* Background Ambient Glow */}
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-orange-500/10 rounded-full blur-3xl pointer-events-none" />

          {/* ORDER COMPLETED STATE */}
          <AnimatePresence mode="wait">
            {isCompleted ? (
              <motion.div
                key="completed"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                className="my-auto text-center space-y-6 px-8 py-12"
              >
                <div className="w-24 h-24 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center mx-auto shadow-xl">
                  <CheckCircle2 className="w-14 h-14" />
                </div>
                <div className="space-y-2">
                  <span className="px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-bold uppercase tracking-wider">
                    Pembayaran Berhasil
                  </span>
                  <h2 className="text-3xl font-extrabold text-slate-900">Terima Kasih atas Pesanan Anda!</h2>
                  <p className="text-sm text-slate-500 max-w-md mx-auto">
                    Pesanan Anda #{displayState?.orderId?.slice(0, 8).toUpperCase()} sedang disiapkan oleh barista kami.
                  </p>
                </div>
              </motion.div>
            ) : isQRIS ? (
              /* QRIS PAYMENT POPUP OVERLAY */
              <motion.div
                key="qris-overlay"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="my-auto bg-white border border-orange-300 rounded-3xl p-8 shadow-2xl backdrop-blur-xl max-w-md mx-auto w-full text-center space-y-6 relative overflow-hidden text-slate-900"
              >
                <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-orange-500 via-amber-400 to-orange-500" />
                
                <div>
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-orange-100 border border-orange-200 text-orange-700 text-xs font-bold uppercase tracking-wider mb-2">
                    <QrCode className="w-3.5 h-3.5" /> Scan QRIS Untuk Membayar
                  </div>
                  <h3 className="text-2xl font-black text-slate-900">{formatRupiah(totalPayable)}</h3>
                </div>

                {/* QR Code Frame */}
                <div className="p-4 bg-white rounded-2xl shadow-xl inline-block border-4 border-orange-400 mx-auto relative group">
                  {settings.qrisImage ? (
                    <img
                      src={settings.qrisImage}
                      alt="QRIS Code"
                      className="w-64 h-64 object-contain rounded-lg"
                    />
                  ) : (
                    <QRCodeSVG
                      value={displayState?.orderId ? `QRIS-PAY-${displayState.orderId}-${totalPayable}` : `ARUM-SEDUH-QRIS-${totalPayable}`}
                      size={240}
                      level="H"
                      includeMargin={true}
                    />
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
                  <ShieldCheck className="w-4 h-4" /> Pembayaran Terverifikasi Aman
                </div>
              </motion.div>
            ) : (
              /* PROMO & HERO SHOWCASE */
              <motion.div
                key="hero-promo"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="h-full flex flex-col justify-between py-4"
              >
                {activeBanner ? (
                  <div className="relative rounded-3xl overflow-hidden aspect-video bg-white border border-orange-100 shadow-2xl group my-auto">
                    <img
                      src={activeBanner.image}
                      alt={activeBanner.headline}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 via-slate-900/30 to-transparent p-6 flex flex-col justify-end">
                      <span className="px-2.5 py-1 rounded-lg bg-orange-500 text-white text-[10px] font-black uppercase tracking-wider w-max mb-2">
                        Special Highlight
                      </span>
                      <h2 className="text-2xl font-black text-white line-clamp-1">{activeBanner.headline}</h2>
                      <p className="text-xs text-slate-200 line-clamp-2 mt-1">{activeBanner.subheadline}</p>
                    </div>
                  </div>
                ) : (
                  <div className="my-auto text-center space-y-4">
                    <div className="w-20 h-20 rounded-3xl bg-orange-100 border border-orange-200 text-orange-600 flex items-center justify-center mx-auto">
                      <Sparkles className="w-10 h-10" />
                    </div>
                    <h2 className="text-2xl font-black text-slate-900">Selamat Datang di Arum Seduh</h2>
                    <p className="text-xs text-slate-500 max-w-sm mx-auto">
                      Nikmati varian teh dan kopi racikan authentic dengan kualitas terbaik & promo hemat harian.
                    </p>
                  </div>
                )}

                {/* Bottom Promo Ticker / Info */}
                <div className="p-4 rounded-2xl bg-white border border-orange-100 shadow-sm flex items-center justify-between text-xs text-slate-600 mt-auto">
                  <div className="flex items-center gap-2">
                    <Leaf className="w-4 h-4 text-emerald-500" />
                    <span>Bawa Tumbler Sendiri = Diskon Poin & Ekstra Bonus</span>
                  </div>
                  <span className="text-orange-600 font-bold">#ArumSeduhExperience</span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* RIGHT COLUMN: Order Items & Total Summary (5 cols) */}
        <div className="col-span-5 bg-orange-50/30 p-6 flex flex-col justify-between overflow-hidden border-l border-orange-100">
          {/* Top Info Bar */}
          <div className="flex items-center justify-between pb-4 border-b border-orange-100">
            <div className="flex items-center gap-2">
              <ShoppingBag className="w-4 h-4 text-orange-500" />
              <h3 className="font-bold text-sm text-slate-900">Daftar Pesanan</h3>
            </div>
            {displayState?.orderType && (
              <span className="px-2.5 py-1 rounded-lg bg-white text-orange-700 border border-orange-200 text-[10px] font-extrabold uppercase tracking-wider shadow-sm">
                {displayState.orderType === 'DINE_IN' ? `DINE IN ${displayState.tableNumber ? `(Meja ${displayState.tableNumber})` : ''}` : 'PICKUP'}
              </span>
            )}
          </div>

          {/* Cart Itemized List */}
          <div className="flex-1 overflow-y-auto py-4 space-y-3 scrollbar-thin scrollbar-thumb-orange-200">
            {cart.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center text-slate-400 space-y-3 py-16">
                <Coffee className="w-12 h-12 stroke-[1.5] text-orange-300 opacity-60 animate-pulse" />
                <div>
                  <p className="text-sm font-semibold text-slate-700">Kasir Sedang Memilih Produk...</p>
                  <p className="text-xs text-slate-500 mt-1">Item yang dipilih akan muncul secara otomatis di sini</p>
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
            {displayState?.hasTumbler && displayState.tumblerDiscount > 0 && (
              <div className="flex justify-between items-center text-xs font-medium text-emerald-600 px-1">
                <span className="flex items-center gap-1.5">
                  <Leaf className="w-3.5 h-3.5" /> Diskon Wadah Tumbler
                </span>
                <span>-{formatRupiah(displayState.tumblerDiscount)}</span>
              </div>
            )}

            <div className="p-4 rounded-2xl bg-gradient-to-r from-orange-500 to-amber-500 text-white flex items-center justify-between shadow-xl">
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
      </main>
    </div>
  );
}
