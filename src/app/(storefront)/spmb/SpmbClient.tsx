'use client';

import { useState, useMemo, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ShoppingBag, Trash2, Plus, Minus, User, Phone, MapPin, Clock, 
  CreditCard, Banknote, CheckCircle, Loader2, ArrowRight, X, UtensilsCrossed, Lock, 
  ExternalLink, Download, MessageCircle, AlertCircle, ChefHat, Check
} from 'lucide-react';
import { QRCodeCanvas } from 'qrcode.react';
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

  // Form State - STRICTLY 2 PAYMENT OPTIONS: 'QRIS' or 'COD' (Tunai di Kasir)
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [notes, setNotes] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'QRIS' | 'COD'>('QRIS');
  
  // Checkout Status
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  // Realtime Active Order Status Tracking
  const [activeOrderId, setActiveOrderId] = useState<string | null>(null);
  const [activeOrderStatus, setActiveOrderStatus] = useState<any>(null);

  // QRIS Payment Modal state
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

  // 4. Poll payment status for QRIS Modal
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
            }, 2000);
          }
        }
      } catch (err) {
        console.error('Error polling QRIS payment status:', err);
      }
    }, 2500);

    return () => clearInterval(interval);
  }, [showQrisModal, qrisOrderId, qrisPaymentPaid]);

  // Check if active order is taking more than 20 minutes
  const isOrderOver20Min = useMemo(() => {
    if (!activeOrderStatus?.createdAt) return false;
    const created = new Date(activeOrderStatus.createdAt).getTime();
    const now = Date.now();
    const diffMinutes = (now - created) / (1000 * 60);
    return diffMinutes >= 20 && !['READY', 'COMPLETED', 'CANCELLED'].includes(activeOrderStatus.status);
  }, [activeOrderStatus]);

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

  const handleDownloadQris = () => {
    try {
      const canvas = document.getElementById('spmb-qris-canvas') as HTMLCanvasElement;
      if (!canvas) return;
      const url = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.href = url;
      link.download = `QRIS_ArumSeduh_Meja${tableNumber}_${qrisOrderId.slice(0, 8)}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error('Failed to download QRIS:', err);
    }
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
        shot: (item as any).shot || undefined,
        addOnIds: item.addOns ? item.addOns.map((a: any) => a.id) : [],
        modsString: (item.matchaLevel !== undefined && item.matchaLevel !== null ? `Matcha: Level ${item.matchaLevel}, ` : '') +
          ((item as any).shot ? `${(item as any).shot}, ` : '') +
          item.iceLevel + ', ' + item.sugarLevel +
          (item.addOns && item.addOns.length > 0 ? ', ' + item.addOns.map((a: any) => a.name).join(', ') : ''),
        bundleSelections: item.bundleSelections,
        matchaLevel: (item as any).matchaLevel
      }));

      const cleanPhone = phone.replace(/[^0-9]/g, '');
      const formattedTableNumber = tableNumber.trim();

      const backendPaymentMethod = paymentMethod === 'QRIS' ? 'QRIS_INSTAN' : 'COD';

      const payload = {
        name,
        phone: cleanPhone,
        tableNumber: formattedTableNumber,
        orderType: 'DINE_IN',
        address: `Meja ${formattedTableNumber}`,
        paymentMethod: backendPaymentMethod,
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

      if (paymentMethod === 'QRIS') {
        if (data.paymentQrContent) {
          setQrisQrContent(data.paymentQrContent);
          setQrisOrderId(data.orderId);
          setQrisTotal(data.total);
          setQrisPaymentPaid(false);
          setShowQrisModal(true);
        } else if (data.paymentUrl) {
          window.location.href = data.paymentUrl;
        } else {
          // Direct fallback to order tracking
          window.location.href = `/orders/${data.orderId}`;
        }
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Terjadi kesalahan sistem.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FAF7F2] text-[#1C1917] pb-32 font-sans selection:bg-[#2E5A44]/20 selection:text-[#2E5A44]">
      {/* Top Ambient Subtle Glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-4xl h-64 bg-gradient-to-b from-[#2E5A44]/10 via-[#FAF7F2]/40 to-transparent pointer-events-none" />

      {/* Main Container */}
      <div className="relative z-10 max-w-5xl mx-auto px-4 pt-6 sm:pt-10">
        
        {/* Editorial Zen Header */}
        <header className="mb-6 sm:mb-8 text-left bg-white/80 backdrop-blur-md rounded-3xl p-6 sm:p-8 border border-stone-200/80 shadow-[0_4px_24px_rgba(0,0,0,0.03)]">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#2E5A44]/10 border border-[#2E5A44]/20 text-[#2E5A44] text-[11px] font-bold tracking-wide">
                <UtensilsCrossed className="w-3.5 h-3.5" />
                <span>Self-Service Dine-In</span>
              </div>
              <h1 className="font-serif text-3xl sm:text-4xl font-bold tracking-tight text-stone-900">
                Arum Seduh
              </h1>
              <p className="text-xs sm:text-sm text-stone-600 max-w-lg leading-relaxed">
                Pesan hidangan & minuman matcha favorit langsung dari meja Anda. Pesanan akan diantarkan langsung ke meja setelah siap.
              </p>
            </div>

            {/* Table Badge & Quick Selector */}
            <div className="shrink-0 p-4 rounded-2xl bg-[#FAF7F2] border border-stone-200 flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-[#2E5A44] text-white flex items-center justify-center font-serif text-xl font-bold shadow-sm">
                {tableNumber || '—'}
              </div>
              <div className="text-left">
                <p className="text-[10px] font-bold uppercase tracking-wider text-stone-500">Nomor Meja</p>
                {isTableLocked ? (
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="font-serif font-bold text-stone-900 text-base">Meja {tableNumber}</span>
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 text-[10px] font-bold border border-emerald-200">
                      <Lock className="w-2.5 h-2.5" /> QR Code
                    </span>
                  </div>
                ) : (
                  <div className="mt-1">
                    {activeTables.length > 0 ? (
                      <select
                        value={tableNumber}
                        onChange={(e) => setTableNumber(e.target.value)}
                        className="bg-white text-stone-900 font-bold text-xs px-3 py-1.5 rounded-lg border border-stone-300 focus:outline-none focus:border-[#2E5A44] cursor-pointer"
                      >
                        <option value="">-- Pilih Meja --</option>
                        {activeTables.map((t) => (
                          <option key={t.id} value={t.number}>
                            Meja {t.number}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <input
                        type="text"
                        placeholder="Contoh: 3"
                        value={tableNumber}
                        onChange={(e) => setTableNumber(e.target.value)}
                        className="bg-white text-stone-900 font-bold text-xs px-2.5 py-1 rounded-lg border border-stone-300 w-20 text-center"
                      />
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </header>

        {/* Realtime Active Order Status Card */}
        {activeOrderStatus && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 p-5 sm:p-6 bg-white rounded-3xl border border-stone-200 shadow-sm space-y-4 text-left"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-stone-100 pb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#2E5A44]/10 text-[#2E5A44] flex items-center justify-center font-bold">
                  <UtensilsCrossed className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-stone-900">
                    Status Pesanan {activeOrderStatus.tableNumber ? `Meja ${activeOrderStatus.tableNumber}` : ''}
                  </h3>
                  <p className="text-[11px] font-mono text-stone-400">ID: {activeOrderStatus.id}</p>
                </div>
              </div>

              <div>
                <span className={`px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider inline-flex items-center gap-1.5
                  ${activeOrderStatus.status === 'PENDING' || activeOrderStatus.status === 'PENDING_PAYMENT' ? 'bg-amber-50 text-amber-800 border border-amber-200 animate-pulse' : ''}
                  ${activeOrderStatus.status === 'PREPARING' ? 'bg-blue-50 text-blue-800 border border-blue-200 animate-pulse' : ''}
                  ${activeOrderStatus.status === 'READY' ? 'bg-emerald-50 text-emerald-800 border border-emerald-300 animate-bounce' : ''}
                  ${activeOrderStatus.status === 'COMPLETED' ? 'bg-stone-100 text-stone-700' : ''}
                  ${activeOrderStatus.status === 'CANCELLED' ? 'bg-rose-50 text-rose-700 border border-rose-200' : ''}
                `}>
                  {activeOrderStatus.status === 'PENDING' && '⏳ Pesanan Diterima'}
                  {activeOrderStatus.status === 'PENDING_PAYMENT' && '💳 Menunggu Pembayaran'}
                  {activeOrderStatus.status === 'PREPARING' && '🍳 Sedang Disiapkan'}
                  {activeOrderStatus.status === 'READY' && '✨ Pesanan Siap!'}
                  {activeOrderStatus.status === 'COMPLETED' && '✅ Selesai'}
                  {activeOrderStatus.status === 'CANCELLED' && '❌ Dibatalkan'}
                </span>
              </div>
            </div>

            {/* 3-Step Simple Progress Bar for SPMB */}
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className={`p-3 rounded-2xl border transition-all ${
                ['PENDING', 'PENDING_PAYMENT', 'PREPARING', 'READY', 'COMPLETED'].includes(activeOrderStatus.status)
                  ? 'bg-[#2E5A44]/10 border-[#2E5A44] text-[#2E5A44] font-bold'
                  : 'bg-stone-50 border-stone-200 text-stone-400'
              }`}>
                <p className="text-[9px] uppercase tracking-wider font-bold">Langkah 1</p>
                <p className="text-xs font-bold mt-0.5">Diterima</p>
              </div>

              <div className={`p-3 rounded-2xl border transition-all ${
                ['PREPARING', 'READY', 'COMPLETED'].includes(activeOrderStatus.status)
                  ? 'bg-[#2E5A44]/10 border-[#2E5A44] text-[#2E5A44] font-bold'
                  : 'bg-stone-50 border-stone-200 text-stone-400'
              }`}>
                <p className="text-[9px] uppercase tracking-wider font-bold">Langkah 2</p>
                <p className="text-xs font-bold mt-0.5">Disiapkan</p>
              </div>

              <div className={`p-3 rounded-2xl border transition-all ${
                ['READY', 'COMPLETED'].includes(activeOrderStatus.status)
                  ? 'bg-emerald-100 border-emerald-600 text-emerald-900 font-bold shadow-sm'
                  : 'bg-stone-50 border-stone-200 text-stone-400'
              }`}>
                <p className="text-[9px] uppercase tracking-wider font-bold">Langkah 3</p>
                <p className="text-xs font-bold mt-0.5">Selesai</p>
              </div>
            </div>

            {/* 20-Minute Alert Notification */}
            {isOrderOver20Min && (
              <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/25 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 animate-in fade-in">
                <div className="flex items-center gap-2.5">
                  <span className="text-xl">⏱️</span>
                  <div>
                    <p className="text-xs font-bold text-amber-950">Pesanan belum selesai lebih dari 20 menit?</p>
                    <p className="text-[11px] text-amber-800/90 font-medium">Silakan hubungi kasir atau barista kami untuk konfirmasi langsung.</p>
                  </div>
                </div>
                <a
                  href={`https://wa.me/${botNumber || ''}?text=${encodeURIComponent(`Halo Arum Seduh, saya ingin menanyakan pesanan Meja ${activeOrderStatus.tableNumber || tableNumber} dengan ID ${activeOrderStatus.id} yang belum selesai.`)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3.5 py-2 rounded-xl bg-[#2E5A44] hover:bg-[#234533] text-white text-[11px] font-bold shrink-0 inline-flex items-center gap-1.5 transition-all shadow-sm"
                >
                  <MessageCircle className="w-3.5 h-3.5" /> Hubungi Kasir via WA
                </a>
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-2 pt-2 border-t border-stone-100">
              <button
                onClick={() => window.location.href = `/orders/${activeOrderStatus.id}`}
                className="flex-1 py-2.5 rounded-xl bg-[#2E5A44] text-white text-xs font-bold hover:bg-[#234533] transition-all flex items-center justify-center gap-1.5"
              >
                <ExternalLink className="w-3.5 h-3.5" /> Lihat Rincian Pesanan
              </button>
              <button
                onClick={() => {
                  localStorage.removeItem('spmb_active_order_id');
                  setActiveOrderId(null);
                  setActiveOrderStatus(null);
                }}
                className="px-4 py-2.5 rounded-xl border border-stone-200 text-stone-600 text-xs font-bold hover:bg-stone-50 transition-all"
              >
                Pesan Menu Baru
              </button>
            </div>
          </motion.div>
        )}

        {/* Category Navigation Pills */}
        <nav className="flex gap-2 overflow-x-auto pb-3 scrollbar-none select-none">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.slug)}
              className={`px-4 py-2 rounded-full text-xs font-bold tracking-wide shrink-0 transition-all border
                ${selectedCategory === cat.slug
                  ? 'bg-[#2E5A44] text-white border-[#2E5A44] shadow-sm'
                  : 'bg-white text-stone-600 border-stone-200 hover:border-stone-400'
                }`}
            >
              {cat.name}
            </button>
          ))}
        </nav>

        {/* Product Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3.5 sm:gap-4 mt-4">
          {filteredProducts.map((product) => {
            const isSoldOut = product.badge === 'sold-out';
            const promo = getActivePromo(product);
            const displayPrice = promo ? promo.promoPrice : product.price;
            const originalPrice = promo ? product.price : (product.modifiers?.originalPrice || null);

            return (
              <motion.div
                key={product.id}
                whileHover={isSoldOut ? {} : { y: -3 }}
                transition={{ duration: 0.2 }}
                onClick={() => handleProductClick(product)}
                className={`bg-white rounded-3xl border border-stone-200 overflow-hidden shadow-[0_2px_12px_rgba(0,0,0,0.02)] flex flex-col group relative transition-all
                  ${isSoldOut ? 'opacity-65 cursor-not-allowed' : 'cursor-pointer hover:shadow-md hover:border-[#2E5A44]/40'}`}
              >
                {/* Promo Overlay */}
                {promo && !isSoldOut && (
                  <div className="absolute top-2.5 right-2.5 z-20">
                    <PromoCountdown endDate={promo.endDate} compact />
                  </div>
                )}

                {/* Badge (Promo / Best Seller / New) */}
                {promo && !isSoldOut ? (
                  <span className="absolute top-3 left-3 z-10 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider bg-rose-600 text-white shadow-sm">
                    🔥 Promo
                  </span>
                ) : product.badge && (
                  <span className={`absolute top-3 left-3 z-10 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider shadow-sm
                    ${product.badge === 'best-seller' ? 'bg-[#8C6239] text-white' : ''}
                    ${product.badge === 'new' ? 'bg-[#2E5A44] text-white' : ''}
                    ${product.badge === 'sold-out' ? 'bg-stone-400 text-white' : ''}
                  `}>
                    {product.badge === 'best-seller' && 'Best Seller'}
                    {product.badge === 'new' && 'Baru'}
                    {product.badge === 'sold-out' && 'Habis'}
                  </span>
                )}

                {/* Product Image */}
                <div className="relative w-full aspect-square bg-[#FAF7F2] overflow-hidden">
                  {product.image ? (
                    <Image
                      src={product.image}
                      alt={product.name}
                      fill
                      sizes="(max-width: 768px) 50vw, 25vw"
                      className={`object-cover group-hover:scale-105 transition-transform duration-300
                        ${isSoldOut ? 'grayscale opacity-60' : ''}`}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-4xl">🍵</div>
                  )}
                </div>

                {/* Product Info */}
                <div className="p-3.5 sm:p-4 flex-1 flex flex-col justify-between text-left">
                  <div className="space-y-1">
                    <h3 className="font-bold text-xs sm:text-sm text-stone-900 group-hover:text-[#2E5A44] transition-colors line-clamp-1">
                      {product.name}
                    </h3>
                    <p className="text-[11px] text-stone-500 line-clamp-2 leading-relaxed">
                      {product.description}
                    </p>
                  </div>
                  
                  <div className="mt-3 pt-2.5 border-t border-stone-100 flex items-center justify-between">
                    <div className="flex flex-col text-left">
                      {originalPrice && originalPrice > displayPrice && (
                        <span className="text-[10px] text-stone-400 line-through leading-none mb-0.5">
                          {formatRupiah(originalPrice)}
                        </span>
                      )}
                      <span className="font-bold text-xs sm:text-sm text-[#2E5A44]">
                        {formatRupiah(displayPrice)}
                      </span>
                    </div>
                    
                    {!isSoldOut && (
                      <span className="w-7 h-7 rounded-xl bg-stone-100 text-stone-700 flex items-center justify-center text-xs font-bold group-hover:bg-[#2E5A44] group-hover:text-white transition-all shadow-sm">
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
        <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-40 w-[calc(100%-2rem)] max-w-md bg-[#1C1917] text-white rounded-3xl p-3.5 shadow-2xl border border-stone-800 flex items-center justify-between animate-in fade-in slide-in-from-bottom-4 duration-200">
          <div className="flex items-center gap-3 pl-1">
            <div className="w-10 h-10 rounded-2xl bg-[#2E5A44] flex items-center justify-center relative shadow-inner">
              <ShoppingBag className="w-5 h-5 text-white" />
              <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-amber-400 text-stone-950 font-black text-[10px] flex items-center justify-center border-2 border-stone-900">
                {cartItems.reduce((acc, i) => acc + i.quantity, 0)}
              </span>
            </div>
            <div className="text-left">
              <p className="text-[10px] text-stone-400 font-bold uppercase tracking-wider">Total</p>
              <p className="text-sm font-serif font-bold text-white mt-0.5">{formatRupiah(totalPrice)}</p>
            </div>
          </div>
          
          <button
            onClick={() => setIsCartOpen(true)}
            className="px-4 py-2.5 rounded-2xl bg-[#2E5A44] hover:bg-[#234533] text-white font-bold text-xs tracking-wide transition-all flex items-center gap-1.5 cursor-pointer shadow-md"
          >
            Lihat Pesanan <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Cart & Checkout Slide-Over Panel */}
      <AnimatePresence>
        {isCartOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 cursor-pointer"
              onClick={() => setIsCartOpen(false)}
            />

            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 220 }}
              className="fixed top-0 right-0 h-full w-full max-w-md bg-white shadow-2xl z-50 flex flex-col"
            >
              {/* Drawer Header */}
              <div className="p-5 border-b border-stone-100 flex items-center justify-between bg-[#FAF7F2] shrink-0">
                <div className="flex items-center gap-2 text-left">
                  <UtensilsCrossed className="w-5 h-5 text-[#2E5A44]" />
                  <div>
                    <h2 className="font-serif font-bold text-base text-stone-900">Pesanan Meja</h2>
                    <p className="text-[11px] text-stone-500 font-medium">Meja {tableNumber || '—'}</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsCartOpen(false)}
                  className="w-8 h-8 rounded-full border border-stone-200 bg-white flex items-center justify-center hover:bg-stone-50 transition-colors"
                >
                  <X className="w-4 h-4 text-stone-500" />
                </button>
              </div>

              {/* Drawer Scrollable Content */}
              <div className="flex-1 overflow-y-auto p-5 space-y-5">
                {/* Cart Items List */}
                <div className="space-y-2.5">
                  <h3 className="text-xs font-bold text-stone-400 uppercase tracking-wider text-left">Menu yang Dipesan</h3>
                  {cartItems.map((item) => (
                    <div key={item.id} className="flex gap-3 p-3 rounded-2xl border border-stone-100 bg-[#FAF7F2]/50 hover:bg-[#FAF7F2] transition-colors items-start">
                      {item.image && (
                        <div className="relative w-14 h-14 rounded-xl overflow-hidden bg-stone-100 shrink-0">
                          <Image src={item.image} alt={item.name} fill className="object-cover" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0 text-left">
                        <h4 className="text-xs font-bold text-stone-900 line-clamp-1">{item.name}</h4>
                        <p className="text-[10px] text-stone-500 mt-0.5 line-clamp-2 leading-relaxed">
                          Size: {item.size || 'Normal'} | Ice: {item.iceLevel} | Sugar: {item.sugarLevel}
                          {(item as any).shot && ` | ${(item as any).shot}`}
                          {item.addOns && item.addOns.length > 0 && ` | ${item.addOns.map((a) => a.name).join(', ')}`}
                        </p>
                        <p className="text-xs font-bold text-[#2E5A44] mt-1.5">{formatRupiah(item.totalPrice)}</p>
                      </div>
                      
                      <div className="flex flex-col items-end gap-2 shrink-0">
                        <button
                          onClick={() => removeItem(item.id)}
                          className="text-stone-300 hover:text-rose-500 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                        
                        <div className="flex items-center gap-1.5 border border-stone-200 bg-white rounded-lg p-0.5 shrink-0">
                          <button
                            onClick={() => updateQuantity(item.id, item.quantity - 1)}
                            className="p-1 text-stone-500 hover:bg-stone-50 rounded"
                          >
                            <Minus className="w-2.5 h-2.5" />
                          </button>
                          <span className="text-xs font-bold w-4 text-center">{item.quantity}</span>
                          <button
                            onClick={() => updateQuantity(item.id, item.quantity + 1)}
                            className="p-1 text-stone-500 hover:bg-stone-50 rounded"
                          >
                            <Plus className="w-2.5 h-2.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <hr className="border-stone-100" />

                {/* Form Informasi Pemesan */}
                <form onSubmit={handlePreSubmit} className="space-y-4">
                  <h3 className="text-xs font-bold text-stone-400 uppercase tracking-wider text-left">Informasi Pemesan</h3>

                  {/* Nomor Meja */}
                  <div className="space-y-1 text-left">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-stone-500 flex items-center gap-1">
                      <UtensilsCrossed className="w-3 h-3 text-[#2E5A44]" /> Nomor Meja (Dine-In)
                    </label>
                    {isTableLocked ? (
                      <div className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-800 font-bold flex items-center justify-between">
                        <span>Meja {tableNumber}</span>
                        <span className="text-[10px] text-emerald-700 bg-emerald-100 border border-emerald-200 px-2 py-0.5 rounded-full flex items-center gap-1">
                          <Lock className="w-2.5 h-2.5" /> Terkunci
                        </span>
                      </div>
                    ) : activeTables.length > 0 ? (
                      <select
                        required
                        value={tableNumber}
                        onChange={(e) => setTableNumber(e.target.value)}
                        className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-stone-200 bg-[#FAF7F2]/50 focus:outline-none focus:border-[#2E5A44]"
                      >
                        <option value="">-- Pilih Meja --</option>
                        {activeTables.map((t) => (
                          <option key={t.id} value={t.number}>
                            Meja {t.number}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <input
                        type="text"
                        placeholder="Contoh: 3"
                        required
                        value={tableNumber}
                        onChange={(e) => setTableNumber(e.target.value)}
                        className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-stone-200 bg-[#FAF7F2]/50 focus:outline-none focus:border-[#2E5A44]"
                      />
                    )}
                  </div>

                  {/* Nama Pemesan */}
                  <div className="space-y-1 text-left">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-stone-500 flex items-center gap-1">
                      <User className="w-3 h-3 text-[#2E5A44]" /> Nama Pemesan
                    </label>
                    <input
                      type="text"
                      placeholder="Contoh: Budi"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-stone-200 bg-[#FAF7F2]/50 focus:outline-none focus:border-[#2E5A44]"
                    />
                  </div>

                  {/* Nomor WhatsApp */}
                  <div className="space-y-1 text-left">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-stone-500 flex items-center gap-1">
                      <Phone className="w-3 h-3 text-[#2E5A44]" /> Nomor WhatsApp
                    </label>
                    <input
                      type="tel"
                      placeholder="Contoh: 081234567890"
                      required
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-stone-200 bg-[#FAF7F2]/50 focus:outline-none focus:border-[#2E5A44]"
                    />
                  </div>

                  {/* Catatan Khusus */}
                  <div className="space-y-1 text-left">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-stone-500 flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-[#2E5A44]" /> Catatan Tambahan (Opsional)
                    </label>
                    <textarea
                      placeholder="Contoh: Kurangi es, tanpa sedotan"
                      rows={2}
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-stone-200 bg-[#FAF7F2]/50 focus:outline-none focus:border-[#2E5A44] resize-none"
                    />
                  </div>

                  {/* STRICTLY 2 PAYMENT METHODS: QRIS & TUNAI */}
                  <div className="space-y-2 text-left">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-stone-500 flex items-center gap-1">
                      <CreditCard className="w-3 h-3 text-[#2E5A44]" /> Metode Pembayaran
                    </label>
                    <div className="grid grid-cols-2 gap-2.5">
                      {/* Option 1: QRIS */}
                      <label className={`flex flex-col items-center justify-center gap-2 p-3.5 rounded-2xl border cursor-pointer transition-all text-center ${
                        paymentMethod === 'QRIS'
                          ? 'border-[#2E5A44] bg-[#2E5A44]/5 text-[#2E5A44] font-bold shadow-sm'
                          : 'border-stone-200 bg-white text-stone-600 hover:border-stone-300'
                      }`}>
                        <input
                          type="radio"
                          name="paymentMethod"
                          checked={paymentMethod === 'QRIS'}
                          onChange={() => setPaymentMethod('QRIS')}
                          className="hidden"
                        />
                        <div className="w-8 h-8 rounded-full bg-[#2E5A44]/10 flex items-center justify-center text-[#2E5A44]">
                          <CreditCard className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="text-xs font-bold">QRIS</p>
                          <p className="text-[10px] text-stone-400 font-medium mt-0.5">Scan & Bayar Otomatis</p>
                        </div>
                      </label>

                      {/* Option 2: Tunai di Kasir */}
                      <label className={`flex flex-col items-center justify-center gap-2 p-3.5 rounded-2xl border cursor-pointer transition-all text-center ${
                        paymentMethod === 'COD'
                          ? 'border-[#2E5A44] bg-[#2E5A44]/5 text-[#2E5A44] font-bold shadow-sm'
                          : 'border-stone-200 bg-white text-stone-600 hover:border-stone-300'
                      }`}>
                        <input
                          type="radio"
                          name="paymentMethod"
                          checked={paymentMethod === 'COD'}
                          onChange={() => setPaymentMethod('COD')}
                          className="hidden"
                        />
                        <div className="w-8 h-8 rounded-full bg-stone-100 flex items-center justify-center text-stone-700">
                          <Banknote className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="text-xs font-bold">Tunai</p>
                          <p className="text-[10px] text-stone-400 font-medium mt-0.5">Bayar di Kasir</p>
                        </div>
                      </label>
                    </div>
                  </div>

                  {errorMsg && (
                    <div className="p-3 bg-rose-50 text-rose-700 rounded-xl text-xs font-medium text-left">
                      ⚠️ {errorMsg}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full py-3.5 rounded-2xl bg-[#2E5A44] hover:bg-[#234533] text-white font-bold text-xs uppercase tracking-wider shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer mt-3 disabled:opacity-50"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" /> Memproses...
                      </>
                    ) : (
                      `Kirim Pesanan (${formatRupiah(totalPrice)})`
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
              className="fixed inset-0 bg-black/50 backdrop-blur-sm"
              onClick={() => setShowConfirmModal(false)}
            />
            
            <motion.div
              initial={{ scale: 0.95, y: 10 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 10 }}
              className="bg-white rounded-3xl w-full max-w-sm p-6 shadow-2xl relative z-10 text-center border border-stone-200"
            >
              <div className="w-12 h-12 rounded-full bg-[#2E5A44]/10 text-[#2E5A44] flex items-center justify-center mx-auto mb-3">
                <UtensilsCrossed className="w-6 h-6" />
              </div>
              <h3 className="font-serif font-bold text-lg text-stone-900 mb-1">Konfirmasi Pesanan Meja</h3>
              <p className="text-xs text-stone-600 leading-relaxed mb-5">
                Pesanan akan dibuat untuk <span className="font-bold text-stone-900">Meja ${tableNumber}</span> atas nama <span className="font-bold text-stone-900">${name}</span>.
              </p>

              <div className="flex gap-2.5">
                <button
                  onClick={() => setShowConfirmModal(false)}
                  className="flex-1 py-3 rounded-xl border border-stone-200 text-stone-600 font-bold text-xs uppercase tracking-wider hover:bg-stone-50 transition-all"
                >
                  Batal
                </button>
                <button
                  onClick={executeCheckout}
                  className="flex-1 py-3 rounded-xl bg-[#2E5A44] hover:bg-[#234533] text-white font-bold text-xs uppercase tracking-wider shadow-md transition-all"
                >
                  Ya, Kirim
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Product Detail Modal */}
      <ProductModal
        product={selectedProduct}
        isOpen={isProductModalOpen}
        onClose={() => {
          setIsProductModalOpen(false);
          setSelectedProduct(null);
        }}
        allProducts={products}
      />

      {/* Dynamic QRIS Payment Modal with Download Feature */}
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
              className="bg-white rounded-3xl w-full max-w-sm p-6 shadow-2xl relative z-10 text-center border border-stone-200 flex flex-col items-center"
            >
              {/* Close Button */}
              {!qrisPaymentPaid && (
                <button
                  onClick={() => setShowQrisModal(false)}
                  className="absolute top-4 right-4 w-8 h-8 rounded-full border border-stone-200 bg-white flex items-center justify-center hover:bg-stone-50 transition-colors"
                >
                  <X className="w-4 h-4 text-stone-500" />
                </button>
              )}

              {/* QRIS Header */}
              <div className="w-full flex items-center justify-between border-b border-stone-100 pb-3 mb-4 shrink-0">
                <span className="text-lg font-black tracking-tight text-[#1b4353]">
                  QR<span className="text-[#e26d5c]">IS</span>
                </span>
                <span className="text-[9px] font-bold uppercase tracking-wider text-stone-600 bg-stone-100 px-2.5 py-0.5 rounded-md">
                  GPN Dynamic
                </span>
              </div>

              {qrisPaymentPaid ? (
                <div className="py-8 space-y-3 flex flex-col items-center">
                  <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center border border-emerald-200">
                    <CheckCircle className="w-8 h-8" />
                  </div>
                  <h3 className="font-serif font-bold text-lg text-stone-900">Pembayaran Berhasil!</h3>
                  <p className="text-xs text-stone-500">Mengarahkan Anda ke halaman rincian pesanan...</p>
                </div>
              ) : (
                <>
                  <div className="relative w-64 h-64 bg-white rounded-2xl p-2 border border-stone-200 shadow-inner flex items-center justify-center">
                    <QRCodeCanvas
                      id="spmb-qris-canvas"
                      value={qrisQrContent}
                      size={240}
                      level="M"
                      includeMargin={false}
                      className="w-full h-full object-contain rounded-xl"
                    />
                  </div>

                  <div className="mt-3 px-3 py-1.5 rounded-xl bg-emerald-50 border border-emerald-100 w-full text-center">
                    <p className="text-[10px] text-emerald-700 font-bold">
                      Scan QR dengan BCA, GoPay, OVO, ShopeePay, Dana, dll.
                    </p>
                  </div>

                  <div className="mt-3 text-center">
                    <p className="text-[10px] text-stone-400 font-bold uppercase tracking-wider">Total Tagihan</p>
                    <p className="text-xl font-serif font-bold text-[#2E5A44] mt-0.5">
                      {formatRupiah(qrisTotal)}
                    </p>
                  </div>

                  {/* Unduh QRIS Button */}
                  <button
                    type="button"
                    onClick={handleDownloadQris}
                    className="mt-3 w-full py-2.5 bg-stone-100 hover:bg-stone-200 text-stone-800 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5 text-stone-600" />
                    <span>Unduh Gambar QRIS</span>
                  </button>

                  <div className="mt-4 w-full flex items-center justify-center gap-2 text-xs text-stone-500 font-bold">
                    <Loader2 className="w-4 h-4 animate-spin text-[#2E5A44]" />
                    <span>Menunggu verifikasi pembayaran...</span>
                  </div>

                  <button
                    onClick={() => {
                      window.location.href = `/orders/${qrisOrderId}`;
                    }}
                    className="w-full mt-3 py-2 text-stone-500 hover:text-stone-800 text-[11px] font-semibold underline"
                  >
                    Buka Rincian Pesanan
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
