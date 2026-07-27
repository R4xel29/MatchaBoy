'use client';

import { useState, useMemo, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ShoppingBag, Trash2, Plus, Minus, User, Phone, MapPin, Clock, 
  CreditCard, Banknote, CheckCircle, Loader2, ArrowRight, X, Utensils, Lock, ExternalLink
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { useCartStore } from '@/stores/cart-store';
import { ProductModal } from '@/components/storefront/ProductModal';
import { PromoCountdown } from '@/components/storefront/PromoCountdown';
import { formatRupiah, getActivePromo } from '@/lib/utils';
import type { Product, Category } from '@/types';

interface SpmbClientProps {
  categories: Category[];
  products: Product[];
  botNumber: string;
  spmbStartTime: string;
  spmbEndTime: string;
  spmbCloseTime: string;
  operationalDays: string;
  disabledDates: string;
}

export default function SpmbClient({ 
  categories, 
  products, 
  botNumber,
  spmbStartTime,
  spmbEndTime,
  spmbCloseTime,
  operationalDays,
  disabledDates
}: SpmbClientProps) {
  // Read URL query parameter ?table=...
  const searchParams = useSearchParams();
  const tableParam = searchParams.get('table');

  // Table State
  const [tableNumber, setTableNumber] = useState<string>('');
  const [isTableLocked, setIsTableLocked] = useState<boolean>(false);
  const [activeTables, setActiveTables] = useState<Array<{ id: string; number: string; status?: string }>>([]);
  const [loadingTables, setLoadingTables] = useState<boolean>(false);

  // Cart State
  const cartItems = useCartStore((s) => s.items);
  const totalPrice = useCartStore((s) => s.totalPrice());
  const updateQuantity = useCartStore((s) => s.updateQuantity);
  const removeItem = useCartStore((s) => s.removeItem);
  const clearCart = useCartStore((s) => s.clearCart);

  // UI State
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [isCartOpen, setIsCartOpen] = useState(false);

  // Form State
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [notes, setNotes] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'COD' | 'QRIS' | 'QRIS_INSTAN'>('COD');
  
  // Checkout Status
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  // Realtime Active Order Status Tracking
  const [activeOrderId, setActiveOrderId] = useState<string | null>(null);
  const [activeOrderStatus, setActiveOrderStatus] = useState<any>(null);

  // QRIS Instan Modal state
  const [showQrisModal, setShowQrisModal] = useState(false);
  const [qrisQrContent, setQrisQrContent] = useState('');
  const [qrisOrderId, setQrisOrderId] = useState('');
  const [qrisTotal, setQrisTotal] = useState(0);
  const [qrisPaymentPaid, setQrisPaymentPaid] = useState(false);

  // 1. Initialize table parameter or fetch active tables
  useEffect(() => {
    if (tableParam) {
      const clean = tableParam.trim();
      setTableNumber(clean);
      setIsTableLocked(true);
    } else {
      setIsTableLocked(false);
      setLoadingTables(true);
      fetch('/api/tables/active')
        .then((res) => res.json())
        .then((data) => {
          if (Array.isArray(data)) {
            setActiveTables(data);
            if (data.length > 0 && !tableNumber) {
              setTableNumber(data[0].number.toString());
            }
          }
        })
        .catch((err) => console.error('Error fetching active tables:', err))
        .finally(() => setLoadingTables(false));
    }
  }, [tableParam]);

  // 2. Read saved active order ID from local storage on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedId = localStorage.getItem('spmb_active_order_id');
      if (savedId) {
        setActiveOrderId(savedId);
      }
    }
  }, []);

  // 3. Realtime Order Status Polling (every 3 seconds)
  useEffect(() => {
    if (!activeOrderId) {
      setActiveOrderStatus(null);
      return;
    }

    const fetchStatus = async () => {
      try {
        const res = await fetch(`/api/orders/${activeOrderId}/status`);
        if (res.ok) {
          const data = await res.json();
          setActiveOrderStatus(data);
        }
      } catch (err) {
        console.error('Error polling order status:', err);
      }
    };

    fetchStatus();
    const interval = setInterval(fetchStatus, 3000);
    return () => clearInterval(interval);
  }, [activeOrderId]);

  // 4. Poll payment status for QRIS Instan modal
  useEffect(() => {
    if (!showQrisModal || !qrisOrderId || qrisPaymentPaid) return;

    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/orders/${qrisOrderId}/status`);
        if (res.ok) {
          const data = await res.json();
          if (data.status !== 'PENDING_PAYMENT' && data.status !== 'CANCELLED') {
            setQrisPaymentPaid(true);
            clearInterval(interval);
            setTimeout(() => {
              window.location.href = `/orders/${qrisOrderId}`;
            }, 2500);
          }
        }
      } catch (err) {
        console.error('Error polling QRIS payment status:', err);
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [showQrisModal, qrisOrderId, qrisPaymentPaid]);

  // Filtered Products
  const filteredProducts = useMemo(() => {
    if (selectedCategory === 'all') return products;
    return products.filter((p) => p.category === selectedCategory);
  }, [products, selectedCategory]);

  const handleProductClick = (product: Product) => {
    if (product.badge === 'sold-out') return;
    setSelectedProduct(product);
    setIsProductModalOpen(true);
  };

  const validateForm = () => {
    if (!tableNumber || !tableNumber.trim()) {
      setErrorMsg('Nomor meja wajib dipilih atau diisi.');
      return false;
    }
    if (!name || name.trim().length < 2) {
      setErrorMsg('Nama pemesan minimal 2 karakter.');
      return false;
    }
    const cleanPhone = phone.replace(/[^0-9]/g, '');
    const phoneRegex = /^(\+62|62|0)8[0-9]{8,15}$/;
    if (!phoneRegex.test(cleanPhone)) {
      setErrorMsg('Format nomor WhatsApp tidak valid (contoh: 081234567890).');
      return false;
    }
    setErrorMsg('');
    return true;
  };

  const handlePreSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;
    if (cartItems.length === 0) {
      setErrorMsg('Keranjang belanja Anda kosong.');
      return;
    }
    setShowConfirmModal(true);
  };

  const executeCheckout = async () => {
    setShowConfirmModal(false);
    setIsSubmitting(true);
    setErrorMsg('');

    try {
      const itemsPayload = cartItems.map((item) => ({
        productId: item.productId,
        name: item.name,
        quantity: item.quantity,
        size: item.size || 'Normal',
        addOnIds: item.addOns ? item.addOns.map((a: any) => a.id) : [],
        modsString: (item.matchaLevel !== undefined && item.matchaLevel !== null ? `Matcha Lvl: ${item.matchaLevel}, ` : '') + item.iceLevel + ', ' + item.sugarLevel + (item.addOns && item.addOns.length > 0 ? ', ' + item.addOns.map((a: any) => a.name).join(', ') : ''),
        bundleSelections: item.bundleSelections,
        matchaLevel: (item as any).matchaLevel
      }));

      const cleanPhone = phone.replace(/[^0-9]/g, '');
      const formattedTableNumber = tableNumber.trim();

      const payload = {
        name,
        phone: cleanPhone,
        tableNumber: formattedTableNumber,
        orderType: 'DINE_IN',
        address: `Meja ${formattedTableNumber}`,
        paymentMethod,
        items: itemsPayload,
        notes: notes || undefined
      };

      let res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        // Fallback to /api/checkout/spmb
        res = await fetch('/api/checkout/spmb', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
      }

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Gagal memproses pesanan.');
      }

      // Save active order ID for realtime status tracking
      if (typeof window !== 'undefined') {
        localStorage.setItem('spmb_active_order_id', data.orderId);
      }
      setActiveOrderId(data.orderId);

      clearCart();
      setIsCartOpen(false);

      if (paymentMethod === 'QRIS_INSTAN' && data.paymentQrContent) {
        setQrisQrContent(data.paymentQrContent);
        setQrisOrderId(data.orderId);
        setQrisTotal(data.total);
        setQrisPaymentPaid(false);
        setShowQrisModal(true);
      } else if (data.paymentUrl) {
        window.location.href = data.paymentUrl;
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Terjadi kesalahan sistem.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FAF7F2] pb-28 relative overflow-hidden font-sans">
      {/* Premium Ambient Background Mesh */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,_rgba(249,115,22,0.18)_0%,_rgba(250,247,242,0)_65%)] pointer-events-none z-0" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_40%,_rgba(212,165,116,0.10)_0%,_rgba(250,247,242,0)_50%)] pointer-events-none z-0" />
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#00000005_1px,transparent_1px),linear-gradient(to_bottom,#00000005_1px,transparent_1px)] bg-[size:32px_32px] pointer-events-none z-0 opacity-60" />

      {/* Main Header Container */}
      <div className="relative z-10 max-w-6xl mx-auto px-4 pt-8 md:pt-12">
        <div className="bg-gradient-to-br from-[#1C1917] via-[#292524] to-[#1C1917] text-white rounded-[2.5rem] p-6 md:p-10 shadow-[0_20px_50px_rgba(0,0,0,0.25)] border border-amber-500/30 overflow-hidden relative mb-8 backdrop-blur-md">
          {/* Ambient Glow Orbs */}
          <div className="absolute -right-16 -top-16 w-56 h-56 bg-gradient-to-br from-orange-500/20 to-amber-500/20 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -left-20 -bottom-20 w-64 h-64 bg-gradient-to-tr from-amber-600/15 to-orange-600/15 rounded-full blur-3xl pointer-events-none" />
          
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
            <div className="space-y-3 text-left">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-gradient-to-r from-amber-500/20 via-orange-500/20 to-amber-500/20 border border-amber-400/40 text-amber-300 text-[11px] font-black uppercase tracking-widest shadow-sm">
                <span>✨</span> Self-Service Order per Meja
              </div>
              <h1 className="font-serif text-3xl sm:text-4xl md:text-5xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-amber-100 via-orange-300 to-amber-400 drop-shadow-sm">
                Arum Seduh
              </h1>
              <p className="text-xs sm:text-sm text-stone-300 font-medium max-w-xl leading-relaxed">
                Nikmati kemudahan memesan langsung dari meja Anda. Pilih menu favorit, selesaikan pesanan, dan hidangan terbaik akan diantarkan langsung ke meja Anda.
              </p>
            </div>
            
            <div className="shrink-0 flex items-center gap-3.5 bg-white/10 backdrop-blur-md border border-white/15 rounded-2xl p-4 shadow-inner">
              <span className="text-3xl">☕</span>
              <div className="text-left">
                <p className="text-[10px] font-black text-amber-400 uppercase tracking-widest leading-none">Layanan Premium</p>
                <p className="text-xs font-bold mt-1 text-white">Self-Service Dine In</p>
              </div>
            </div>
          </div>

          {/* Table Banner & Selection Card */}
          <div className="mt-8 pt-6 border-t border-white/10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white/5 backdrop-blur-md rounded-2xl p-4.5 border border-white/10">
            <div className="flex items-center gap-3.5 text-left">
              <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-amber-400/25 to-orange-500/25 border border-amber-400/40 flex items-center justify-center text-amber-300 font-bold text-xl shrink-0 shadow-sm">
                📍
              </div>
              <div>
                <p className="text-[10px] font-black text-amber-400 uppercase tracking-widest">Lokasi Meja Anda</p>
                {isTableLocked ? (
                  <p className="text-base sm:text-lg font-black text-white mt-0.5 flex items-center gap-2">
                    Meja {tableNumber}
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-400/50 text-emerald-300 text-[10px] font-extrabold shadow-sm">
                      <Lock className="w-3 h-3" /> Dikunci via QR Code
                    </span>
                  </p>
                ) : (
                  <p className="text-sm font-bold text-white mt-0.5">
                    {tableNumber ? `Meja ${tableNumber}` : 'Silakan pilih nomor meja Anda'}
                  </p>
                )}
              </div>
            </div>

            {/* Table Selector Dropdown / Input if not locked */}
            {!isTableLocked && (
              <div className="w-full sm:w-auto flex items-center gap-2">
                {activeTables.length > 0 ? (
                  <select
                    value={tableNumber}
                    onChange={(e) => setTableNumber(e.target.value)}
                    className="w-full sm:w-auto bg-stone-900/90 text-amber-300 font-bold text-xs px-4 py-3 rounded-xl border border-amber-500/40 focus:ring-2 focus:ring-amber-400 cursor-pointer shadow-lg transition-all"
                  >
                    <option value="">-- Pilih Meja --</option>
                    {activeTables.map((t) => (
                      <option key={t.id} value={t.number} className="bg-stone-900 text-white">
                        Meja {t.number} {t.status ? `(${t.status})` : ''}
                      </option>
                    ))}
                  </select>
                ) : (
                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    <span className="text-xs font-bold text-stone-300">Nomor Meja:</span>
                    <input
                      type="text"
                      placeholder="Contoh: 5"
                      value={tableNumber}
                      onChange={(e) => setTableNumber(e.target.value)}
                      className="bg-stone-900/90 text-amber-300 font-bold text-xs px-3 py-2.5 rounded-xl border border-amber-500/40 w-28 focus:ring-2 focus:ring-amber-400 shadow-lg text-center"
                    />
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Realtime Order Status Card (PENDING, PREPARING, READY) */}
        {activeOrderStatus && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 p-5 bg-white rounded-3xl border border-[#EA580C]/20 shadow-lg relative overflow-hidden"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-gray-100 pb-3 mb-4 gap-2">
              <div className="flex items-center gap-3 text-left">
                <div className="w-10 h-10 rounded-2xl bg-[#EA580C]/10 flex items-center justify-center text-[#EA580C] font-bold text-lg">
                  🍽️
                </div>
                <div>
                  <h3 className="font-bold text-sm text-gray-900 flex items-center gap-2">
                    Status Pesanan {activeOrderStatus.tableNumber ? `Meja ${activeOrderStatus.tableNumber}` : ''}
                  </h3>
                  <p className="text-[11px] text-gray-400 font-mono">ID: {activeOrderStatus.id}</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className={`px-3 py-1.5 rounded-full text-xs font-black uppercase tracking-wider flex items-center gap-1.5
                  ${activeOrderStatus.status === 'PENDING' || activeOrderStatus.status === 'PENDING_PAYMENT' ? 'bg-amber-100 text-amber-900 border border-amber-300 animate-pulse' : ''}
                  ${activeOrderStatus.status === 'PREPARING' ? 'bg-blue-100 text-blue-900 border border-blue-300 animate-pulse' : ''}
                  ${activeOrderStatus.status === 'READY' ? 'bg-emerald-100 text-emerald-900 border border-emerald-400 animate-bounce' : ''}
                  ${activeOrderStatus.status === 'COMPLETED' ? 'bg-gray-100 text-gray-800 border border-gray-300' : ''}
                  ${activeOrderStatus.status === 'CANCELLED' ? 'bg-rose-100 text-rose-800 border border-rose-300' : ''}
                `}>
                  {activeOrderStatus.status === 'PENDING' && '⏳ PENDING (Menunggu Konfirmasi)'}
                  {activeOrderStatus.status === 'PENDING_PAYMENT' && '💳 Menunggu Pembayaran'}
                  {activeOrderStatus.status === 'PREPARING' && '🍳 PREPARING (Sedang Disiapkan)'}
                  {activeOrderStatus.status === 'READY' && '✨ READY (Pesanan Siap!)'}
                  {activeOrderStatus.status === 'COMPLETED' && '✅ COMPLETED (Selesai)'}
                  {activeOrderStatus.status === 'CANCELLED' && '❌ Dibatalkan'}
                </span>
              </div>
            </div>

            {/* Step Progress Tracker */}
            <div className="grid grid-cols-3 gap-2 text-center my-4">
              <div className={`p-3 rounded-2xl border transition-all ${
                ['PENDING', 'PENDING_PAYMENT', 'PREPARING', 'READY', 'COMPLETED'].includes(activeOrderStatus.status)
                  ? 'bg-[#EA580C]/10 border-[#EA580C] text-[#EA580C] font-bold'
                  : 'bg-gray-50 border-gray-200 text-gray-400'
              }`}>
                <p className="text-[9px] uppercase tracking-wider font-extrabold">Step 1</p>
                <p className="text-xs font-black mt-0.5">PENDING</p>
              </div>

              <div className={`p-3 rounded-2xl border transition-all ${
                ['PREPARING', 'READY', 'COMPLETED'].includes(activeOrderStatus.status)
                  ? 'bg-[#EA580C]/10 border-[#EA580C] text-[#EA580C] font-bold'
                  : 'bg-gray-50 border-gray-200 text-gray-400'
              }`}>
                <p className="text-[9px] uppercase tracking-wider font-extrabold">Step 2</p>
                <p className="text-xs font-black mt-0.5">PREPARING</p>
              </div>

              <div className={`p-3 rounded-2xl border transition-all ${
                ['READY', 'COMPLETED'].includes(activeOrderStatus.status)
                  ? 'bg-emerald-100 border-emerald-500 text-emerald-900 font-black shadow-sm'
                  : 'bg-gray-50 border-gray-200 text-gray-400'
              }`}>
                <p className="text-[9px] uppercase tracking-wider font-extrabold">Step 3</p>
                <p className="text-xs font-black mt-0.5">READY</p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-2 mt-4 pt-3 border-t border-gray-100">
              <button
                onClick={() => window.location.href = `/orders/${activeOrderStatus.id}`}
                className="flex-1 py-2.5 rounded-xl bg-[#EA580C] text-white text-xs font-bold hover:bg-[#C2410C] transition-all flex items-center justify-center gap-1.5"
              >
                <ExternalLink className="w-3.5 h-3.5" /> Lihat Rincian Pesanan
              </button>
              <button
                onClick={() => {
                  localStorage.removeItem('spmb_active_order_id');
                  setActiveOrderId(null);
                  setActiveOrderStatus(null);
                }}
                className="px-4 py-2.5 rounded-xl border border-gray-200 text-gray-600 text-xs font-bold hover:bg-gray-50 transition-all"
              >
                Buat Pesanan Baru
              </button>
            </div>
          </motion.div>
        )}

        {/* Category Navigation */}
        <div className="flex gap-2.5 overflow-x-auto pb-4 scrollbar-none relative z-10 select-none">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.slug)}
              className={`px-5 py-2.5 rounded-2xl text-xs font-bold uppercase tracking-wider shrink-0 transition-all duration-300 border
                ${selectedCategory === cat.slug
                  ? 'bg-gradient-to-r from-[#EA580C] to-[#C2410C] text-white border-orange-500 shadow-lg shadow-orange-500/25 scale-102 font-extrabold'
                  : 'bg-white/90 backdrop-blur-md text-stone-700 border-stone-200/80 hover:border-orange-300 hover:text-orange-600 shadow-sm'
                }`}
            >
              {cat.name}
            </button>
          ))}
        </div>

        {/* Product Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-5 mt-4 relative z-10">
          {filteredProducts.map((product) => {
            const isSoldOut = product.badge === 'sold-out';
            const promo = getActivePromo(product);
            const displayPrice = promo ? promo.promoPrice : product.price;
            const originalPrice = promo ? product.price : (product.modifiers?.originalPrice || null);

            return (
              <motion.div
                key={product.id}
                whileHover={isSoldOut ? {} : { y: -5 }}
                transition={{ duration: 0.25 }}
                onClick={() => handleProductClick(product)}
                className={`bg-white rounded-[2rem] border border-stone-200/60 overflow-hidden shadow-[0_10px_30px_rgba(0,0,0,0.03)] flex flex-col group relative transition-all duration-300
                  ${isSoldOut ? 'opacity-70 cursor-not-allowed' : 'cursor-pointer hover:shadow-[0_20px_40px_rgba(234,88,12,0.12)] hover:border-orange-300/60'}`}
              >
                {/* Promo Timer Overlay */}
                {promo && !isSoldOut && (
                  <div className="absolute top-2.5 right-2.5 z-20">
                    <PromoCountdown endDate={promo.endDate} compact />
                  </div>
                )}

                {/* Badge (New/Best Seller/Promo) */}
                {promo && !isSoldOut ? (
                  <span className="absolute top-3 left-3 z-10 px-2.5 py-1 rounded-full text-[9px] font-black tracking-widest uppercase bg-gradient-to-r from-rose-500 to-red-600 text-white shadow-md">
                    🔥 Promo
                  </span>
                ) : product.badge && (
                  <span className={`absolute top-3 left-3 z-10 px-2.5 py-1 rounded-full text-[9px] font-black tracking-widest uppercase shadow-sm
                    ${product.badge === 'best-seller' ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white' : ''}
                    ${product.badge === 'new' ? 'bg-gradient-to-r from-orange-600 to-amber-600 text-amber-100' : ''}
                    ${product.badge === 'sold-out' ? 'bg-stone-400 text-white' : ''}
                  `}>
                    {product.badge === 'best-seller' && 'Best Seller'}
                    {product.badge === 'new' && 'Baru'}
                    {product.badge === 'sold-out' && 'Habis'}
                  </span>
                )}

                {/* Product Image */}
                <div className="relative w-full aspect-[4/3] bg-stone-100 overflow-hidden">
                  {product.image ? (
                    <Image
                      src={product.image}
                      alt={product.name}
                      fill
                      sizes="(max-width: 768px) 50vw, 25vw"
                      className={`object-cover group-hover:scale-105 transition-transform duration-500
                        ${isSoldOut ? 'grayscale opacity-60' : ''}`}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-4xl">🍵</div>
                  )}
                </div>

                {/* Product Info */}
                <div className="p-4 sm:p-5 flex-1 flex flex-col justify-between text-left">
                  <div className="space-y-1.5">
                    <h3 className="font-heading font-bold text-sm sm:text-base text-stone-900 group-hover:text-orange-600 transition-colors line-clamp-1">
                      {product.name}
                    </h3>
                    <p className="text-[11px] text-stone-400 font-medium leading-relaxed line-clamp-2">
                      {product.description}
                    </p>
                  </div>
                  
                  <div className="mt-4 pt-3.5 border-t border-stone-100 flex items-center justify-between">
                    <div className="flex flex-col text-left">
                      {originalPrice && originalPrice > displayPrice && (
                        <span className="text-[10px] text-stone-400 line-through leading-none mb-1">
                          {formatRupiah(originalPrice)}
                        </span>
                      )}
                      <span className="font-extrabold text-sm sm:text-base text-orange-600">
                        {formatRupiah(displayPrice)}
                      </span>
                    </div>
                    
                    {!isSoldOut && (
                      <span className="w-8 h-8 rounded-2xl bg-orange-50 border border-orange-200/60 text-orange-600 flex items-center justify-center text-sm font-black group-hover:bg-gradient-to-r group-hover:from-orange-600 group-hover:to-amber-600 group-hover:text-white group-hover:border-transparent transition-all shadow-sm">
                        +
                      </span>
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Floating Bottom Cart Bar */}
      {cartItems.length > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 w-[calc(100%-2rem)] max-w-lg bg-[#1C1917]/95 backdrop-blur-xl text-white rounded-[2.5rem] p-4 shadow-[0_20px_50px_rgba(0,0,0,0.35)] border border-amber-500/40 flex items-center justify-between animate-in fade-in slide-in-from-bottom-5 duration-300">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-amber-400/20 to-orange-500/20 border border-amber-400/30 flex items-center justify-center relative shadow-inner">
              <ShoppingBag className="w-5 h-5 text-amber-300" />
              <span className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-gradient-to-r from-amber-400 to-orange-500 text-stone-950 font-black text-[10px] flex items-center justify-center border-2 border-stone-900 shadow-md">
                {cartItems.reduce((acc, i) => acc + i.quantity, 0)}
              </span>
            </div>
            <div className="text-left">
              <p className="text-[10px] text-amber-300/80 font-black uppercase tracking-widest leading-none">Total Belanja</p>
              <p className="text-base sm:text-lg font-black text-white mt-1 font-serif">{formatRupiah(totalPrice)}</p>
            </div>
          </div>
          
          <button
            onClick={() => setIsCartOpen(true)}
            className="px-5 py-3 rounded-2xl bg-gradient-to-r from-amber-400 via-orange-500 to-amber-500 text-stone-950 font-black text-xs uppercase tracking-wider hover:brightness-110 active:scale-[0.98] transition-all flex items-center gap-2 cursor-pointer shadow-lg shadow-orange-500/20"
          >
            Keranjang & Checkout <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Cart & Checkout Slide-over Panel */}
      <AnimatePresence>
        {isCartOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 cursor-pointer"
              onClick={() => setIsCartOpen(false)}
            />

            {/* Panel */}
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed top-0 right-0 h-full w-full max-w-md bg-white shadow-2xl z-50 flex flex-col"
            >
              {/* Drawer Header */}
              <div className="p-5 border-b flex items-center justify-between bg-[#FAF8F5] shrink-0">
                <div className="flex items-center gap-2">
                  <ShoppingBag className="w-5 h-5 text-[#EA580C]" />
                  <h2 className="font-serif font-black text-lg text-gray-900">Keranjang Self-Service</h2>
                </div>
                <button
                  onClick={() => setIsCartOpen(false)}
                  className="w-8 h-8 rounded-full border bg-white flex items-center justify-center hover:bg-gray-50 transition-colors"
                >
                  <X className="w-4 h-4 text-gray-500" />
                </button>
              </div>

              {/* Drawer Content */}
              <div className="flex-1 overflow-y-auto p-5 space-y-6">
                {/* Cart Items List */}
                <div className="space-y-3">
                  <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider text-left">Daftar Item</h3>
                  {cartItems.map((item) => (
                    <div key={item.id} className="flex gap-3 p-3.5 rounded-2xl border border-gray-100 bg-[#FAF8F5]/50 hover:bg-[#FAF8F5] transition-colors items-start">
                      {item.image && (
                        <div className="relative w-14 h-14 rounded-xl overflow-hidden bg-muted shrink-0">
                          <Image src={item.image} alt={item.name} fill className="object-cover" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0 text-left">
                        <h4 className="text-xs font-bold text-gray-900 line-clamp-1">{item.name}</h4>
                        <p className="text-[10px] text-gray-400 mt-0.5 line-clamp-2 leading-relaxed">
                          Size: {item.size || 'Normal'} | Ice: {item.iceLevel} | Sugar: {item.sugarLevel}
                          {item.addOns && item.addOns.length > 0 && ` | Addons: ${item.addOns.map((a) => a.name).join(', ')}`}
                        </p>
                        <p className="text-xs font-bold text-[#EA580C] mt-1.5">{formatRupiah(item.totalPrice)}</p>
                      </div>
                      
                      <div className="flex flex-col items-end gap-2 shrink-0">
                        <button
                          onClick={() => removeItem(item.id)}
                          className="text-gray-300 hover:text-red-500 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                        
                        <div className="flex items-center gap-2 border bg-white rounded-lg p-1 shrink-0">
                          <button
                            onClick={() => updateQuantity(item.id, item.quantity - 1)}
                            className="p-1 text-gray-500 hover:bg-gray-50 rounded"
                          >
                            <Minus className="w-2.5 h-2.5" />
                          </button>
                          <span className="text-xs font-bold w-4 text-center">{item.quantity}</span>
                          <button
                            onClick={() => updateQuantity(item.id, item.quantity + 1)}
                            className="p-1 text-gray-500 hover:bg-gray-50 rounded"
                          >
                            <Plus className="w-2.5 h-2.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <hr className="border-gray-100" />

                <form onSubmit={handlePreSubmit} className="space-y-4">
                  <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider text-left">Informasi Pesanan Meja</h3>

                  {/* Table Selection Display */}
                  <div className="space-y-1 text-left">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400 flex items-center gap-1.5">
                      <Utensils className="w-3 h-3 text-[#EA580C]" /> Nomor Meja (Dine-In)
                    </label>
                    {isTableLocked ? (
                      <div className="w-full px-4 py-2.5 text-sm rounded-xl border border-orange-200 bg-orange-50/50 text-[#C2410C] font-bold flex items-center justify-between">
                        <span>Meja {tableNumber}</span>
                        <span className="text-[10px] text-orange-700 bg-orange-100 border border-orange-200 px-2 py-0.5 rounded-full flex items-center gap-1">
                          <Lock className="w-2.5 h-2.5" /> Terkunci
                        </span>
                      </div>
                    ) : activeTables.length > 0 ? (
                      <select
                        required
                        value={tableNumber}
                        onChange={(e) => setTableNumber(e.target.value)}
                        className="w-full px-4 py-2.5 text-sm rounded-xl border border-gray-200 bg-[#FAF8F5]/30 focus:outline-none focus:border-[#EA580C] focus:ring-1 focus:ring-[#EA580C] transition-colors"
                      >
                        <option value="">-- Pilih Meja --</option>
                        {activeTables.map((t) => (
                          <option key={t.id} value={t.number}>
                            Meja {t.number} {t.status ? `(${t.status})` : ''}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <input
                        type="text"
                        placeholder="Masukkan nomor meja (misal: 5)"
                        required
                        value={tableNumber}
                        onChange={(e) => setTableNumber(e.target.value)}
                        className="w-full px-4 py-2.5 text-sm rounded-xl border border-gray-200 bg-[#FAF8F5]/30 focus:outline-none focus:border-[#EA580C] focus:ring-1 focus:ring-[#EA580C] transition-colors"
                      />
                    )}
                  </div>

                  {/* Customer Name */}
                  <div className="space-y-1 text-left">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400 flex items-center gap-1.5">
                      <User className="w-3 h-3 text-[#EA580C]" /> Nama Pemesan
                    </label>
                    <input
                      type="text"
                      placeholder="Contoh: Budi Santoso"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full px-4 py-2.5 text-sm rounded-xl border border-gray-200 bg-[#FAF8F5]/30 focus:outline-none focus:border-[#EA580C] focus:ring-1 focus:ring-[#EA580C] transition-colors"
                    />
                  </div>

                  {/* Customer Phone */}
                  <div className="space-y-1 text-left">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400 flex items-center gap-1.5">
                      <Phone className="w-3 h-3 text-[#EA580C]" /> Nomor WhatsApp
                    </label>
                    <input
                      type="tel"
                      placeholder="Contoh: 081234567890"
                      required
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full px-4 py-2.5 text-sm rounded-xl border border-gray-200 bg-[#FAF8F5]/30 focus:outline-none focus:border-[#EA580C] focus:ring-1 focus:ring-[#EA580C] transition-colors"
                    />
                  </div>

                  {/* Special Notes */}
                  <div className="space-y-1 text-left">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400 flex items-center gap-1.5">
                      <MapPin className="w-3 h-3 text-[#EA580C]" /> Catatan Khusus (Opsional)
                    </label>
                    <textarea
                      placeholder="Contoh: Tanpa sedotan plastik, es sedikit"
                      rows={2}
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      className="w-full px-4 py-2.5 text-sm rounded-xl border border-gray-200 bg-[#FAF8F5]/30 focus:outline-none focus:border-[#EA580C] focus:ring-1 focus:ring-[#EA580C] transition-colors resize-none"
                    />
                  </div>

                  {/* Payment Method Selection */}
                  <div className="space-y-2 text-left">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400 flex items-center gap-1.5 mb-1">
                      <CreditCard className="w-3 h-3 text-[#EA580C]" /> Metode Pembayaran
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      <label className={`flex flex-col items-center justify-center gap-1.5 p-3 rounded-xl border cursor-pointer transition-colors text-center
                        ${paymentMethod === 'COD' 
                          ? 'border-[#EA580C] bg-[#EA580C]/5 text-[#EA580C] font-bold' 
                          : 'border-gray-200 bg-white text-gray-650 hover:bg-gray-50'
                        }`}
                      >
                        <input
                          type="radio"
                          name="paymentMethod"
                          checked={paymentMethod === 'COD'}
                          onChange={() => setPaymentMethod('COD')}
                          className="hidden"
                        />
                        <Banknote className="w-4 h-4" />
                        <span className="text-[10px] uppercase font-bold">Bayar Kasir</span>
                      </label>

                      <label className={`flex flex-col items-center justify-center gap-1.5 p-3 rounded-xl border cursor-pointer transition-colors text-center
                        ${paymentMethod === 'QRIS_INSTAN' 
                          ? 'border-[#EA580C] bg-[#EA580C]/5 text-[#EA580C] font-bold' 
                          : 'border-gray-200 bg-white text-gray-650 hover:bg-gray-50'
                        }`}
                      >
                        <input
                          type="radio"
                          name="paymentMethod"
                          checked={paymentMethod === 'QRIS_INSTAN'}
                          onChange={() => setPaymentMethod('QRIS_INSTAN')}
                          className="hidden"
                        />
                        <CreditCard className="w-4 h-4" />
                        <span className="text-[10px] uppercase font-bold">QRIS Instan</span>
                      </label>

                      <label className={`flex flex-col items-center justify-center gap-1.5 p-3 rounded-xl border cursor-pointer transition-colors text-center
                        ${paymentMethod === 'QRIS' 
                          ? 'border-[#EA580C] bg-[#EA580C]/5 text-[#EA580C] font-bold' 
                          : 'border-gray-200 bg-white text-gray-650 hover:bg-gray-50'
                        }`}
                      >
                        <input
                          type="radio"
                          name="paymentMethod"
                          checked={paymentMethod === 'QRIS'}
                          onChange={() => setPaymentMethod('QRIS')}
                          className="hidden"
                        />
                        <CreditCard className="w-4 h-4" />
                        <span className="text-[10px] uppercase font-bold">QRIS (Doku)</span>
                      </label>
                    </div>
                  </div>

                  {errorMsg && (
                    <div className="p-3 bg-red-50 text-red-600 rounded-xl text-xs font-semibold text-left">
                      ⚠️ {errorMsg}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full py-4 rounded-2xl bg-[#EA580C] text-white font-bold text-sm uppercase tracking-wider shadow-md hover:bg-[#C2410C] transition-all flex items-center justify-center gap-2 cursor-pointer mt-4 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" /> Memproses Pesanan...
                      </>
                    ) : (
                      'Kirim Pesanan Meja'
                    )}
                  </button>
                </form>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Confirmation Modal Overlay */}
      <AnimatePresence>
        {showConfirmModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm cursor-pointer"
              onClick={() => setShowConfirmModal(false)}
            />
            
            <motion.div
              initial={{ scale: 0.95, y: 15 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 15 }}
              className="bg-white rounded-[2rem] w-full max-w-sm p-6 shadow-2xl relative z-10 text-center border border-gray-100"
            >
              <h3 className="font-serif font-black text-xl text-gray-900 mb-2">Konfirmasi Pesanan Meja 🍽️</h3>
              <p className="text-xs text-gray-500 leading-relaxed mb-6">
                Pesanan akan diproses untuk <span className="font-bold text-gray-900">Meja {tableNumber}</span> atas nama <span className="font-bold text-gray-900">{name}</span>. Apakah data sudah benar?
              </p>

              <div className="flex gap-3">
                <button
                  onClick={() => setShowConfirmModal(false)}
                  className="flex-1 py-3.5 rounded-xl border border-gray-200 text-gray-500 font-bold text-xs uppercase tracking-wider hover:bg-gray-50 transition-all cursor-pointer"
                >
                  Batal
                </button>
                <button
                  onClick={executeCheckout}
                  className="flex-1 py-3.5 rounded-xl bg-[#EA580C] text-white font-bold text-xs uppercase tracking-wider hover:bg-[#C2410C] transition-all cursor-pointer shadow-md"
                >
                  Ya, Kirim
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Customized Product Detail Modal */}
      <ProductModal
        product={selectedProduct}
        isOpen={isProductModalOpen}
        onClose={() => {
          setIsProductModalOpen(false);
          setSelectedProduct(null);
        }}
        allProducts={products}
      />

      {/* QRIS Instan Payment Modal */}
      <AnimatePresence>
        {showQrisModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => {
                if (!qrisPaymentPaid) {
                  setShowQrisModal(false);
                }
              }}
            />

            <motion.div
              initial={{ scale: 0.95, y: 15 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 15 }}
              className="bg-white rounded-[2rem] w-full max-w-sm p-6 shadow-2xl relative z-10 text-center border border-gray-100 flex flex-col items-center"
            >
              {/* Close Button */}
              {!qrisPaymentPaid && (
                <button
                  onClick={() => setShowQrisModal(false)}
                  className="absolute top-4 right-4 w-8 h-8 rounded-full border bg-white flex items-center justify-center hover:bg-gray-50 transition-colors"
                >
                  <X className="w-4 h-4 text-gray-500" />
                </button>
              )}

              {/* Header */}
              <div className="w-full flex items-center justify-between border-b border-dashed border-gray-150 pb-3 mb-4 shrink-0 mt-2">
                <span className="text-[18px] font-black italic tracking-tighter text-[#1b4353]">
                  QR<span className="text-[#e26d5c]">IS</span>
                </span>
                <span className="text-[8px] font-extrabold uppercase tracking-widest text-[#1b4353] bg-gray-50 border border-gray-100 px-2.5 py-0.5 rounded-md">
                  Dynamic GPN
                </span>
              </div>

              {qrisPaymentPaid ? (
                <div className="py-8 space-y-4 flex flex-col items-center">
                  <div className="w-16 h-16 bg-green-50 text-green-500 rounded-full flex items-center justify-center border border-green-200">
                    <CheckCircle className="w-8 h-8 text-green-500" />
                  </div>
                  <h3 className="font-serif font-black text-xl text-gray-900">Pembayaran Berhasil!</h3>
                  <p className="text-xs text-gray-550">Mengarahkan Anda ke halaman rincian pesanan...</p>
                </div>
              ) : (
                <>
                  <div className="relative w-60 h-60 bg-white rounded-2xl p-2 border border-gray-100 shadow-inner flex items-center justify-center">
                    <QRCodeSVG
                      value={qrisQrContent}
                      size={220}
                      level="M"
                      includeMargin={false}
                      className="w-full h-full object-contain rounded-xl"
                    />
                  </div>

                  <div className="mt-3 px-3 py-2 rounded-xl bg-green-50 border border-green-100 w-full text-center">
                    <p className="text-[10px] text-green-600 font-bold">
                      Scan & bayar otomatis terverifikasi
                    </p>
                  </div>

                  <div className="mt-4 text-center">
                    <p className="text-[10px] text-gray-400 font-extrabold uppercase">Total Pembayaran</p>
                    <p className="text-2xl font-black font-serif text-[#EA580C] mt-1">
                      {formatRupiah(qrisTotal)}
                    </p>
                  </div>

                  <div className="mt-5 w-full flex items-center justify-center gap-2 text-xs text-gray-500 font-bold">
                    <Loader2 className="w-4 h-4 animate-spin text-[#EA580C]" />
                    <span>Menunggu pembayaran Anda...</span>
                  </div>

                  <button
                    onClick={() => {
                      window.location.href = `/orders/${qrisOrderId}`;
                    }}
                    className="w-full mt-5 py-3 bg-[#FAF6EE] hover:bg-[#FAF6EE]/70 text-[#946F48] border border-[#EADFC9]/30 rounded-2xl text-xs font-bold transition-all active:scale-[0.98]"
                  >
                    Buka Halaman Rincian Pesanan
                  </button>
                </>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
