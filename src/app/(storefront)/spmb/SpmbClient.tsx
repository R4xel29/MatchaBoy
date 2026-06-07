'use client';

import { useState, useMemo, useEffect } from 'react';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ShoppingBag, Trash2, Plus, Minus, User, Phone, MapPin, Clock, 
  CreditCard, Banknote, CheckCircle, Loader2, ArrowRight, X 
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { useCartStore } from '@/stores/cart-store';
import { ProductModal } from '@/components/storefront/ProductModal';
import { PromoCountdown } from '@/components/storefront/PromoCountdown';
import { formatRupiah, getActivePromo } from '@/lib/utils';
import type { Product, Category, CartItem } from '@/types';
import { useEffect as useReactEffect } from 'react';

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
  const [address, setAddress] = useState('');
  const [pickupDate, setPickupDate] = useState('');
  const [pickupTime, setPickupTime] = useState('09:00');
  const [paymentMethod, setPaymentMethod] = useState<'COD' | 'QRIS' | 'QRIS_INSTAN'>('COD');
  
  // Checkout Status
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  // QRIS Instan Modal state
  const [showQrisModal, setShowQrisModal] = useState(false);
  const [qrisQrContent, setQrisQrContent] = useState('');
  const [qrisOrderId, setQrisOrderId] = useState('');
  const [qrisTotal, setQrisTotal] = useState(0);
  const [qrisPaymentPaid, setQrisPaymentPaid] = useState(false);

  // Poll payment status for QRIS Instan modal
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

  // Get current time in WIB (GMT+7)
  const wibTime = useMemo(() => {
    try {
      const now = new Date();
      const formatter = new Intl.DateTimeFormat('en-US', {
        timeZone: 'Asia/Jakarta',
        hour: 'numeric',
        minute: 'numeric',
        hour12: false
      });
      const [h, m] = formatter.format(now).split(':').map(Number);
      return { hour: h, minute: m };
    } catch {
      const now = new Date();
      return { hour: now.getHours(), minute: now.getMinutes() };
    }
  }, []);

  // availableDates for SPMB (3 days PO limit)
  const availableDates = useMemo(() => {
    const dates: { value: string; label: string; dayLabel: string; isToday: boolean }[] = [];
    let openDays: number[] = [0,1,2,3,4,5,6];
    try {
      openDays = JSON.parse(operationalDays || '[0,1,2,3,4,5,6]');
    } catch {}
    let closedDates: string[] = [];
    try {
      closedDates = JSON.parse(disabledDates || '[]');
    } catch {}
    
    const dayNames = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];

    const now = new Date();
    const baseDate = new Date(now.getTime());
    let iterations = 0;
    
    const [endH, endM] = spmbEndTime.split(':').map(Number);
    const endMinutes = endH * 60 + endM;
    const leadTimeMinutes = 20;

    while (dates.length < 3 && iterations < 30) {
      const d = new Date(baseDate.getTime() + iterations * 24 * 60 * 60 * 1000);
      iterations++;
      const dayOfWeek = d.getDay();
      const dateString = d.toLocaleDateString('en-CA');
      
      const isOpenDay = openDays.includes(dayOfWeek);
      const isHoliday = closedDates.includes(dateString);
      
      let isAvailable = isOpenDay && !isHoliday;
      
      const isToday = dateString === now.toLocaleDateString('en-CA');
      if (isToday && isAvailable) {
        // If today's last slot is already passed, exclude today
        const currentTotalMinutes = wibTime.hour * 60 + wibTime.minute;
        if (currentTotalMinutes > endMinutes - leadTimeMinutes) {
          isAvailable = false;
        }
      }
      
      if (isAvailable) {
        dates.push({
          value: dateString,
          label: `${d.getDate()} ${monthNames[d.getMonth()]}`,
          dayLabel: isToday ? 'Hari ini' : dayNames[d.getDay()],
          isToday
        });
      }
    }
    return dates;
  }, [operationalDays, disabledDates, spmbEndTime, wibTime]);

  // Sync selected pickupDate to first available date
  useEffect(() => {
    if (availableDates.length > 0) {
      if (!pickupDate || !availableDates.some(d => d.value === pickupDate)) {
        setPickupDate(availableDates[0].value);
      }
    } else {
      setPickupDate('');
    }
  }, [availableDates, pickupDate]);

  // Time Slots with 20 minutes lead time
  const timeSlots = useMemo(() => {
    if (availableDates.length === 0 || !pickupDate) return [];
    
    const slots = [];
    const currentTotalMinutes = wibTime.hour * 60 + wibTime.minute;
    const leadTimeMinutes = 20;
    
    const [startH, startM] = spmbStartTime.split(':').map(Number);
    const [endH, endM] = spmbEndTime.split(':').map(Number);
    
    const startMin = startH * 60 + startM;
    const endMin = endH * 60 + endM;
    
    const now = new Date();
    const isToday = pickupDate === now.toLocaleDateString('en-CA');

    for (let min = startMin; min <= endMin; min += 30) {
      if (!isToday || (min - currentTotalMinutes >= leadTimeMinutes)) {
        const slotH = Math.floor(min / 60);
        const slotM = min % 60;
        slots.push(`${String(slotH).padStart(2, '0')}:${String(slotM).padStart(2, '0')}`);
      }
    }
    return slots;
  }, [wibTime, spmbStartTime, spmbEndTime, pickupDate, availableDates]);

  // Sync selected pickupTime to first available time slot if invalid
  useEffect(() => {
    if (timeSlots.length > 0) {
      if (!timeSlots.includes(pickupTime)) {
        setPickupTime(timeSlots[0]);
      }
    } else {
      setPickupTime('');
    }
  }, [timeSlots, pickupTime]);

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
    if (!name || name.trim().length < 2) {
      setErrorMsg('Nama lengkap minimal 2 karakter.');
      return false;
    }
    const cleanPhone = phone.replace(/[^0-9]/g, '');
    const phoneRegex = /^(\+62|62|0)8[0-9]{8,15}$/;
    if (!phoneRegex.test(cleanPhone)) {
      setErrorMsg('Format nomor WhatsApp tidak valid (contoh: 081234567890).');
      return false;
    }
    if (!address || address.trim().length < 5) {
      setErrorMsg('Alamat / detail kelas pengantaran minimal 5 karakter.');
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
      // Map cart items to API payload structure
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

      const res = await fetch('/api/checkout/spmb', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          phone: `SPMB-PENDING_${cleanPhone}`,
          address,
          pickupDate,
          pickupTime,
          paymentMethod,
          items: itemsPayload
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Gagal memproses pesanan.');
      }

      // Save active order ID in local storage for popup status notifications
      if (typeof window !== 'undefined') {
        localStorage.setItem('spmb_active_order_id', data.orderId);
      }

      // Clear local storefront cart state
      clearCart();
      setIsCartOpen(false);

      // Redirect immediately to Doku hosted checkout if paymentUrl is returned, otherwise to WhatsApp bot
      if ((paymentMethod === 'QRIS' || paymentMethod === 'QRIS_INSTAN') && data.paymentUrl) {
        window.location.href = data.paymentUrl;
      } else {
        const waUrl = getWhatsAppLink(data.orderId);
        window.location.href = waUrl;
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Terjadi kesalahan sistem.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // WhatsApp link generator
  const getWhatsAppLink = (orderId: string) => {
    let cleanNumber = botNumber.replace(/[^0-9]/g, '');
    if (cleanNumber.startsWith('08')) {
      cleanNumber = '628' + cleanNumber.substring(2);
    }
    return `https://wa.me/${cleanNumber}?text=${encodeURIComponent(orderId)}`;
  };

  return (
    <div className="min-h-screen bg-[#FAF8F5] pb-24 relative overflow-hidden font-sans">
      {/* Decorative Gradients */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(46,90,68,0.12)_0%,_rgba(250,248,245,0)_50%)] pointer-events-none z-0" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom,_rgba(212,165,116,0.08)_0%,_rgba(250,248,245,0)_50%)] pointer-events-none z-0" />
      <div className="absolute inset-0 bg-[linear-gradient(rgba(0,0,0,0.01)_1px,_transparent_1px),_linear-gradient(90deg,_rgba(0,0,0,0.01)_1px,_transparent_1px)] bg-[size:28px_28px] pointer-events-none z-0 opacity-40" />

      {/* SPMB Curated Header */}
      <div className="relative z-10 max-w-6xl mx-auto px-4 pt-8 md:pt-12">
        <div className="bg-[#1E3F20] text-white rounded-3xl p-6 md:p-10 shadow-xl border border-[#D4A574]/30 overflow-hidden relative mb-8">
          <div className="absolute -right-16 -top-16 w-44 h-44 bg-[#FEF08A]/10 rounded-full blur-2xl pointer-events-none" />
          <div className="absolute -left-20 -bottom-20 w-52 h-52 bg-[#D4A574]/15 rounded-full blur-3xl pointer-events-none" />
          
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#FEF08A]/10 border border-[#FEF08A]/20 text-[#FEF08A] text-xs font-black uppercase tracking-wider">
                ✨ SPMB Guest Storefront
              </div>
              <h1 className="font-serif text-3xl md:text-4xl font-black tracking-tight text-white">
               Arum Seduh
              </h1>
              <p className="text-sm text-neutral-200 font-medium max-w-xl">
                Nikmati matcha kualitas premium terbaik kami serta Kopi premium yang ramah di kantong. Khusus murid SPMB, pesan langsung dan kami antar (khusus wilayah SMKN 1 Probolinggo) .
              </p>
            </div>
            
            <div className="shrink-0 flex items-center gap-3 bg-white/5 border border-white/10 rounded-2xl p-4">
              <span className="text-2xl">🍵</span>
              <div className="text-left">
                <p className="text-[10px] font-black text-amber-300 uppercase tracking-widest leading-none">Status</p>
                <p className="text-xs font-bold mt-1 text-white">Guest Mode </p>
              </div>
            </div>
          </div>
        </div>

        {/* Category Navigation */}
        <div className="flex gap-2 overflow-x-auto pb-4 scrollbar-none relative z-10 select-none">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.slug)}
              className={`px-5 py-2.5 rounded-full text-xs font-bold uppercase tracking-wider shrink-0 transition-all border
                ${selectedCategory === cat.slug
                  ? 'bg-[#2E5A44] text-white border-[#2E5A44] shadow-md shadow-[#2E5A44]/15 scale-102'
                  : 'bg-white text-[#2E5A44] border-gray-150 hover:border-[#2E5A44]/45'
                }`}
            >
              {cat.name}
            </button>
          ))}
        </div>

        {/* Product Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4 relative z-10">
          {filteredProducts.map((product) => {
            const isSoldOut = product.badge === 'sold-out';
            const promo = getActivePromo(product);
            const displayPrice = promo ? promo.promoPrice : product.price;
            const originalPrice = promo ? product.price : (product.modifiers?.originalPrice || null);

            return (
              <motion.div
                key={product.id}
                whileHover={isSoldOut ? {} : { y: -4 }}
                transition={{ duration: 0.2 }}
                onClick={() => handleProductClick(product)}
                className={`bg-white rounded-3xl border border-gray-100 overflow-hidden shadow-sm flex flex-col group relative
                  ${isSoldOut ? 'opacity-70 cursor-not-allowed' : 'cursor-pointer hover:shadow-md hover:border-[#2E5A44]/20'}`}
              >
                {/* Promo Timer Overlay */}
                {promo && !isSoldOut && (
                  <div className="absolute top-2.5 right-2.5 z-20">
                    <PromoCountdown endDate={promo.endDate} compact />
                  </div>
                )}

                {/* Badge (New/Best Seller/Promo) */}
                {promo && !isSoldOut ? (
                  <span className="absolute top-2.5 left-2.5 z-10 px-2 py-0.5 rounded-full text-[9px] font-black tracking-wide uppercase bg-rose-500 text-white shadow-md">
                    🔥 Promo
                  </span>
                ) : product.badge && (
                  <span className={`absolute top-2.5 left-2.5 z-10 px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wide uppercase shadow-sm
                    ${product.badge === 'best-seller' ? 'bg-[#D4A574] text-white' : ''}
                    ${product.badge === 'new' ? 'bg-[#2E5A44] text-[#FEF08A]' : ''}
                    ${product.badge === 'sold-out' ? 'bg-gray-400 text-white' : ''}
                  `}>
                    {product.badge === 'best-seller' && 'Best Seller'}
                    {product.badge === 'new' && 'Baru'}
                    {product.badge === 'sold-out' && 'Habis'}
                  </span>
                )}

                {/* Product Image */}
                <div className="relative w-full aspect-[4/3] bg-[#FAF8F5] overflow-hidden">
                  {product.image ? (
                    <Image
                      src={product.image}
                      alt={product.name}
                      fill
                      sizes="(max-width: 768px) 50vw, 25vw"
                      className={`object-cover group-hover:scale-103 transition-transform duration-500
                        ${isSoldOut ? 'grayscale opacity-60' : ''}`}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-4xl">🍵</div>
                  )}
                </div>

                {/* Product Info */}
                <div className="p-4 flex-1 flex flex-col justify-between text-left">
                  <div className="space-y-1">
                    <h3 className="font-heading font-bold text-sm text-gray-900 group-hover:text-[#2E5A44] transition-colors line-clamp-1">
                      {product.name}
                    </h3>
                    <p className="text-[11px] text-gray-400 font-medium leading-relaxed line-clamp-2">
                      {product.description}
                    </p>
                  </div>
                  
                  <div className="mt-3 pt-3 border-t border-gray-50 flex items-center justify-between">
                    <div className="flex flex-col text-left">
                      {originalPrice && originalPrice > displayPrice && (
                        <span className="text-[10px] text-gray-400 line-through leading-none mb-1">
                          {formatRupiah(originalPrice)}
                        </span>
                      )}
                      <span className="font-bold text-sm text-[#2E5A44]">
                        {formatRupiah(displayPrice)}
                      </span>
                    </div>
                    
                    {!isSoldOut && (
                      <span className="w-7 h-7 rounded-full bg-[#2E5A44]/10 text-[#2E5A44] flex items-center justify-center text-xs font-bold group-hover:bg-[#2E5A44] group-hover:text-white transition-colors">
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
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 w-[calc(100%-2rem)] max-w-lg bg-[#1E3F20] text-white rounded-3xl p-4 shadow-xl border border-[#D4A574]/40 flex items-center justify-between animate-in fade-in slide-in-from-bottom-5 duration-300">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/10 flex items-center justify-center relative">
              <ShoppingBag className="w-5 h-5 text-white" />
              <span className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-[#D4A574] text-white font-extrabold text-[10px] flex items-center justify-center border-2 border-[#1E3F20]">
                {cartItems.reduce((acc, i) => acc + i.quantity, 0)}
              </span>
            </div>
            <div className="text-left">
              <p className="text-[10px] text-neutral-300 font-bold uppercase tracking-widest leading-none">Total Belanja</p>
              <p className="text-base font-bold mt-1">{formatRupiah(totalPrice)}</p>
            </div>
          </div>
          
          <button
            onClick={() => setIsCartOpen(true)}
            className="px-5 py-2.5 rounded-2xl bg-[#D4A574] text-[#1E3F20] font-bold text-xs uppercase tracking-wider hover:bg-[#c39665] transition-colors flex items-center gap-1.5 cursor-pointer shadow-md"
          >
            Keranjang & Checkout <ArrowRight className="w-3.5 h-3.5" />
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
                  <ShoppingBag className="w-5 h-5 text-[#2E5A44]" />
                  <h2 className="font-serif font-black text-lg text-gray-900">Keranjang Belanja</h2>
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
                  <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider text-left">Daftar Minuman</h3>
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
                        <p className="text-xs font-bold text-[#2E5A44] mt-1.5">{formatRupiah(item.totalPrice)}</p>
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
                  <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider text-left">Informasi Pengantaran</h3>

                  {availableDates.length === 0 ? (
                    <div className="p-4 bg-amber-50 border border-amber-100 rounded-2xl text-amber-800 text-xs font-medium text-left leading-relaxed">
                      <span className="font-bold block mb-1 text-amber-900">🏪 Toko Sedang Libur</span>
                      Maaf, toko kami saat ini sedang tidak melayani pemesanan SPMB. Silakan periksa jam operasional kami atau hubungi admin.
                    </div>
                  ) : (
                    <>
                      {/* Name */}
                      <div className="space-y-1 text-left">
                        <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400 flex items-center gap-1.5">
                          <User className="w-3 h-3 text-[#2E5A44]" /> Nama Lengkap
                        </label>
                        <input
                          type="text"
                          placeholder="Contoh: Budi Santoso"
                          required
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          className="w-full px-4 py-2.5 text-sm rounded-xl border border-gray-200 bg-[#FAF8F5]/30 focus:outline-none focus:border-[#2E5A44] focus:ring-1 focus:ring-[#2E5A44] transition-colors"
                        />
                      </div>

                      {/* Phone */}
                      <div className="space-y-1 text-left">
                        <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400 flex items-center gap-1.5">
                          <Phone className="w-3 h-3 text-[#2E5A44]" /> Nomor WhatsApp
                        </label>
                        <input
                          type="tel"
                          placeholder="Contoh: 081234567890"
                          required
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          className="w-full px-4 py-2.5 text-sm rounded-xl border border-gray-200 bg-[#FAF8F5]/30 focus:outline-none focus:border-[#2E5A44] focus:ring-1 focus:ring-[#2E5A44] transition-colors"
                        />
                      </div>

                      {/* Classroom / Location Details */}
                      <div className="space-y-1 text-left">
                        <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400 flex items-center gap-1.5">
                          <MapPin className="w-3 h-3 text-[#2E5A44]" /> Detail Lokasi / Kelas
                        </label>
                        <textarea
                          placeholder="Contoh: Gedung B, Lantai 2, Ruang Kelas 12A"
                          rows={2}
                          required
                          value={address}
                          onChange={(e) => setAddress(e.target.value)}
                          className="w-full px-4 py-2.5 text-sm rounded-xl border border-gray-200 bg-[#FAF8F5]/30 focus:outline-none focus:border-[#2E5A44] focus:ring-1 focus:ring-[#2E5A44] transition-colors resize-none"
                        />
                      </div>

                      {/* Date Selector */}
                      <div className="space-y-1.5 text-left">
                        <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400 flex items-center gap-1.5 pl-0.5">
                          <Clock className="w-3 h-3 text-[#2E5A44]" /> Tanggal Pengantaran
                        </label>
                        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none select-none">
                          {availableDates.map((date) => {
                            const isSelected = pickupDate === date.value;
                            return (
                              <button
                                key={date.value}
                                type="button"
                                onClick={() => setPickupDate(date.value)}
                                className={`flex-1 min-w-[90px] p-2.5 rounded-xl border text-center transition-all active:scale-95 cursor-pointer
                                  ${isSelected
                                    ? 'border-[#2E5A44] bg-[#2E5A44]/5 text-[#2E5A44] font-bold shadow-sm'
                                    : 'border-gray-200 bg-white text-gray-500 hover:border-gray-300'}`}
                              >
                                <p className="text-[9px] uppercase tracking-wider opacity-75">{date.dayLabel}</p>
                                <p className="text-xs font-black mt-0.5">{date.label}</p>
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Delivery Time (08:00 - 13:00) */}
                      <div className="space-y-1 text-left">
                        <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400 flex items-center gap-1.5">
                          <Clock className="w-3 h-3 text-[#2E5A44]" /> Jam Pengantaran
                        </label>
                        <select
                          value={pickupTime}
                          onChange={(e) => setPickupTime(e.target.value)}
                          className="w-full px-4 py-2.5 text-sm rounded-xl border border-gray-200 bg-[#FAF8F5]/30 focus:outline-none focus:border-[#2E5A44] focus:ring-1 focus:ring-[#2E5A44] transition-colors"
                        >
                          {timeSlots.map((slot) => (
                            <option key={slot} value={slot}>
                              {slot}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Payment Method */}
                      <div className="space-y-2 text-left">
                        <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400 flex items-center gap-1.5 mb-1">
                          <CreditCard className="w-3 h-3 text-[#2E5A44]" /> Metode Pembayaran
                        </label>
                        <div className="grid grid-cols-3 gap-2">
                          <label className={`flex flex-col items-center justify-center gap-1.5 p-3 rounded-xl border cursor-pointer transition-colors text-center
                            ${paymentMethod === 'COD' 
                              ? 'border-[#2E5A44] bg-[#2E5A44]/5 text-[#2E5A44] font-bold' 
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
                            <span className="text-[10px] uppercase font-bold">COD</span>
                          </label>

                          <label className={`flex flex-col items-center justify-center gap-1.5 p-3 rounded-xl border cursor-pointer transition-colors text-center
                            ${paymentMethod === 'QRIS_INSTAN' 
                              ? 'border-[#2E5A44] bg-[#2E5A44]/5 text-[#2E5A44] font-bold' 
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
                              ? 'border-[#2E5A44] bg-[#2E5A44]/5 text-[#2E5A44] font-bold' 
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
                    </>
                  )}

                  {errorMsg && (
                    <div className="p-3 bg-red-50 text-red-600 rounded-xl text-xs font-semibold text-left">
                      ⚠️ {errorMsg}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={isSubmitting || timeSlots.length === 0}
                    className="w-full py-4 rounded-2xl bg-[#2E5A44] text-white font-bold text-sm uppercase tracking-wider shadow-md hover:bg-[#203f2f] transition-all flex items-center justify-center gap-2 cursor-pointer mt-4 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" /> Memproses...
                      </>
                    ) : (
                      'Pesan Sekarang'
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
              <h3 className="font-serif font-black text-xl text-gray-900 mb-2">Konfirmasi Pesanan 🍵</h3>
              <p className="text-xs text-gray-500 leading-relaxed mb-6">
                Apakah Anda yakin data pesanan Anda sudah benar? Setelah menekan 'Ya, Kirim', pesanan akan dibuat dan Anda akan langsung diarahkan ke WhatsApp untuk mengirim pesan konfirmasi ke Bot.
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
                  className="flex-1 py-3.5 rounded-xl bg-[#2E5A44] text-white font-bold text-xs uppercase tracking-wider hover:bg-[#1a3828] transition-all cursor-pointer shadow-md"
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
                    <p className="text-2xl font-black font-serif text-[#2E5A44] mt-1">
                      {formatRupiah(qrisTotal)}
                    </p>
                  </div>

                  <div className="mt-5 w-full flex items-center justify-center gap-2 text-xs text-gray-500 font-bold">
                    <Loader2 className="w-4 h-4 animate-spin text-[#2E5A44]" />
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
