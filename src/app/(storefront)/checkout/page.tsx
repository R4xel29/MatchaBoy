'use client';

import { useState, useMemo, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  ArrowLeft, Phone, User, CreditCard, Banknote,
  ChevronDown, ChevronUp, Trash2, Plus, Minus,
  ShoppingBag, Truck, X, ArrowRight, Store, Clock, AlertTriangle, MapPin,
  Leaf, Ticket, Coins, CheckCircle2, XCircle, Loader2
} from 'lucide-react';
import { MapPicker } from '@/components/checkout/MapPicker';
import { useCartStore } from '@/stores/cart-store';
import { formatRupiah } from '@/lib/utils';
import { PickupTimePicker } from '@/components/checkout/PickupTimePicker';
import { PaymentUpload } from '@/components/checkout/PaymentUpload';
import { ProductRecommendations } from '@/components/checkout/ProductRecommendations';
import { ProductModal } from '@/components/storefront/ProductModal';
import Image from 'next/image';
import type { Product, CartItem } from '@/types';

// ── Zod Schema ──────────────────────────────────────────────
const checkoutSchema = z.object({
  name: z.string().min(2, 'Nama minimal 2 karakter'),
  phone: z.string().min(10, 'Nomor HP minimal 10 digit')
    .regex(/^(\+62|62|0)8[0-9]{8,12}$/, 'Format nomor HP tidak valid'),
  notes: z.string().optional(),
});

type CheckoutFormData = z.infer<typeof checkoutSchema>;
type OrderType = 'PICKUP' | 'DELIVERY';

export default function CheckoutPage() {
  const router = useRouter();
  const { data: session, status } = useSession();

  const items = useCartStore((s) => s.items);
  const totalPrice = useCartStore((s) => s.totalPrice);
  const updateQuantity = useCartStore((s) => s.updateQuantity);
  const removeItem = useCartStore((s) => s.removeItem);
  const clearCart = useCartStore((s) => s.clearCart);

  const [orderType, setOrderType] = useState<OrderType>('PICKUP');
  const [pickupDate, setPickupDate] = useState<string | null>(null);
  const [pickupTime, setPickupTime] = useState<string | null>(null);
  const [showCart, setShowCart] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [paymentProofUrl, setPaymentProofUrl] = useState<string | null>(null);
  const [paymentMethod, setPaymentMethod] = useState('TRANSFER');
  const [showPickupWarning, setShowPickupWarning] = useState(false);

  // Tumbler state
  const [hasTumbler, setHasTumbler] = useState(false);
  const [tumblerBonusPoints, setTumblerBonusPoints] = useState(0);
  const [tumblerDiscountPct, setTumblerDiscountPct] = useState(0);
  const [tumblerEnabled, setTumblerEnabled] = useState(false);

  // Voucher state
  const [voucherCode, setVoucherCode] = useState('');
  const [appliedVoucher, setAppliedVoucher] = useState<{ id: string; code: string; type: string; description: string } | null>(null);
  const [voucherLoading, setVoucherLoading] = useState(false);
  const [voucherError, setVoucherError] = useState('');

  // Points state
  const [userPoints, setUserPoints] = useState(0);
  const [usePoints, setUsePoints] = useState(false);
  const [pointsToUse, setPointsToUse] = useState(0);

  // Toast state
  const [toast, setToast] = useState<{ message: string; type: 'error' | 'success' } | null>(null);

  // Modal State
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [editingCartItem, setEditingCartItem] = useState<CartItem | null>(null);

  // Store settings
  const [storeSettings, setStoreSettings] = useState({
    openTime: '08:00', closeTime: '21:00', pickupSlotInterval: 5,
    deliveryFeePerKm: 2000, maxDeliveryDistance: 10
  });

  const [deliveryAddress, setDeliveryAddress] = useState<{ label: string, detail: string, lat: number, lng: number, distance: number, deliveryFee: number } | null>(null);

  const [allProducts, setAllProducts] = useState<Product[]>([]);

  useEffect(() => {
    fetch('/api/products')
      .then(r => r.json())
      .then(d => { if (d.products) setAllProducts(d.products); })
      .catch(() => {});

    fetch('/api/admin/store-settings')
      .then(r => r.json())
      .then(d => { if (d.openTime) setStoreSettings({ ...storeSettings, ...d }); })
      .catch(() => {});

    // Fetch tumbler bonus settings
    fetch('/api/admin/loyalty/settings')
      .then(r => r.json())
      .then(d => {
        if (d.tumblerBonusEnabled) {
          setTumblerEnabled(true);
          setTumblerBonusPoints(d.tumblerBonusPoints || 0);
          setTumblerDiscountPct(d.tumblerDiscountPct || 0);
        }
      })
      .catch(() => {});
  }, []);

  // Auto-fill from session
  const {
    register, handleSubmit, setValue,
    formState: { errors },
  } = useForm<CheckoutFormData>({
    resolver: zodResolver(checkoutSchema),
  });

  useEffect(() => {
    if (session?.user) {
      if (session.user.name) setValue('name', session.user.name);
      // Phone + points from profile API
      fetch('/api/user/profile')
        .then(r => r.json())
        .then(d => {
          if (d.phone) setValue('phone', d.phone);
          if (d.points !== undefined) setUserPoints(d.points);
        })
        .catch(() => {});
    }
  }, [session, setValue]);

  // Auto-dismiss toast
  useEffect(() => {
    if (toast) {
      const t = setTimeout(() => setToast(null), 4000);
      return () => clearTimeout(t);
    }
  }, [toast]);

  const subtotal = totalPrice();
  const tumblerDiscount = hasTumbler && tumblerDiscountPct > 0 ? Math.round(subtotal * tumblerDiscountPct / 100) : 0;
  
  const shippingFee = orderType === 'DELIVERY' && deliveryAddress ? deliveryAddress.deliveryFee : 0;
  
  const hasFreeShippingBundle = useMemo(() => {
    return items.some(item => {
      if (item.isBundle) {
        const prod = allProducts.find(p => p.id === item.productId);
        if (prod?.modifiers) {
          return (prod.modifiers as any).freeShipping === true;
        }
      }
      return false;
    });
  }, [items, allProducts]);

  const ongkirDiscount = hasFreeShippingBundle
    ? shippingFee
    : appliedVoucher
      ? appliedVoucher.type === 'GRATIS_ONGKIR' ? shippingFee
      : appliedVoucher.type === 'DISKON_ONGKIR' ? Math.min(shippingFee, 10000)
      : 0
      : 0;

  const voucherDiscount = appliedVoucher
    ? appliedVoucher.type === 'FREE_DRINK' ? 25000
    : appliedVoucher.type === 'FREE_TOPPING' ? 3000
    : appliedVoucher.type === 'UPGRADE_SIZE' ? 5000
    : appliedVoucher.type === 'REFERRAL_REWARD' ? 25000
    : appliedVoucher.type === 'GRATIS_ONGKIR' || appliedVoucher.type === 'DISKON_ONGKIR' ? 0
    : 10000
    : 0;

  const pointsDiscount = usePoints ? pointsToUse * 1000 : 0;
  const grandTotal = Math.max(0, subtotal - tumblerDiscount - voucherDiscount - pointsDiscount) + Math.max(0, shippingFee - ongkirDiscount);
  const itemCount = items.reduce((sum, i) => sum + i.quantity, 0);

  const handleApplyVoucher = async () => {
    if (!voucherCode.trim()) return;
    setVoucherLoading(true);
    setVoucherError('');
    try {
      const res = await fetch('/api/checkout/validate-voucher', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: voucherCode.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setAppliedVoucher(data.voucher);
      setToast({ message: `Voucher "${data.voucher.description}" berhasil diterapkan!`, type: 'success' });
    } catch (e: any) {
      setVoucherError(e.message);
    } finally {
      setVoucherLoading(false);
    }
  };

  const canSubmit = useMemo(() => {
    if (items.length === 0) return false;
    if (orderType === 'PICKUP' && (!pickupDate || !pickupTime)) return false;
    if (orderType === 'DELIVERY' && !deliveryAddress) return false;
    return true;
  }, [items.length, orderType, pickupDate, pickupTime, deliveryAddress]);

  const onSubmit = async (data: CheckoutFormData) => {
    if (!canSubmit) return;
    setIsSubmitting(true);

    try {
      const payload = {
        name: data.name,
        phone: data.phone,
        notes: data.notes,
        orderType,
        hasTumbler,
        voucherCode: appliedVoucher?.code || undefined,
        pointsUsed: usePoints ? pointsToUse : 0,
        pickupDate: pickupDate || undefined,
        pickupTime: pickupTime || undefined,
        paymentProofUrl: paymentProofUrl || undefined,
        paymentMethod,
        items: items.map(item => ({
          productId: item.productId,
          name: item.name,
          quantity: item.quantity,
          price: item.basePrice,
          totalPrice: item.totalPrice,
          modsString: item.isBundle && item.bundleSelections
            ? item.bundleSelections.map(s => `${s.groupName}: ${s.productName}${s.iceLevel || s.sugarLevel ? ` (${[s.iceLevel, s.sugarLevel].filter(Boolean).join(', ')})` : ''}`).join(' | ')
            : `${item.iceLevel}, ${item.sugarLevel}${item.addOns.length > 0 ? ', +' + item.addOns.map(a => a.name).join(', +') : ''}`,
          addOnIds: item.isBundle ? [] : item.addOns.map(a => a.id),
          isBundle: item.isBundle || false,
          bundleSelections: item.isBundle ? item.bundleSelections : undefined
        })),
        address: deliveryAddress ? { ...deliveryAddress } : undefined,
        deliveryFee: orderType === 'DELIVERY' && deliveryAddress ? deliveryAddress.deliveryFee : 0,
      };

      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const responseData = await res.json();
      if (!res.ok) throw new Error(responseData.error || 'Gagal membuat pesanan');

      clearCart();
      router.push(`/orders/${responseData.orderId}`);
    } catch (error: any) {
      setToast({ message: error.message, type: 'error' });
      setIsSubmitting(false);
    }
  };

  const handleEditOrAdd = async (cartItem: CartItem, isEdit: boolean) => {
    try {
      const res = await fetch(`/api/products/${cartItem.productId}`);
      if (res.ok) {
        const data = await res.json();
        setSelectedProduct(data.product);
        setEditingCartItem(isEdit ? cartItem : { ...cartItem, id: '' });
        setIsProductModalOpen(true);
      }
    } catch (e) {
      console.error('Failed to fetch product details', e);
    }
  };

  const handleSelectRecommendation = (product: Product) => {
    setSelectedProduct(product);
    setEditingCartItem(null);
    setIsProductModalOpen(true);
  };

  // Show pickup reminder when time is selected
  useEffect(() => {
    if (pickupTime) {
      setShowPickupWarning(true);
    }
  }, [pickupTime]);

  // ── Auth Guard ──────────────────────────────────────────────
  if (status === 'loading') {
    return (
      <div className="min-h-dvh bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-3 border-[#B48A5E] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (status === 'unauthenticated') {
    return (
      <div className="min-h-dvh bg-background flex items-center justify-center px-4">
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl border border-gray-100"
        >
          <div className="mx-auto mb-4 w-14 h-14 rounded-2xl bg-gradient-to-br from-[#B48A5E] to-[#946F48] flex items-center justify-center">
            <User className="w-7 h-7 text-white" />
          </div>
          <h3 className="text-center font-serif text-xl font-bold text-gray-900 mb-2">
            Login Diperlukan
          </h3>
          <p className="text-center text-sm text-gray-500 mb-6">
            Kamu harus masuk terlebih dahulu untuk melanjutkan pemesanan.
          </p>
          <button
            type="button"
            onClick={() => router.push('/login?callbackUrl=/checkout')}
            className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-gradient-to-r from-[#B48A5E] to-[#946F48] text-white font-bold text-[15px] hover:opacity-90 transition-opacity shadow-lg shadow-[#B48A5E]/20"
          >
            Masuk / Daftar
            <ArrowRight className="w-4 h-4" />
          </button>
        </motion.div>
      </div>
    );
  }

  // Empty cart guard
  if (items.length === 0) {
    return (
      <div className="min-h-dvh bg-background flex flex-col items-center justify-center px-6 text-center">
        <div className="w-20 h-20 rounded-full bg-brand-50 flex items-center justify-center mb-5">
          <ShoppingBag className="w-8 h-8 text-brand-400" />
        </div>
        <h2 className="font-heading font-bold text-xl text-foreground mb-2">Keranjang Kosong</h2>
        <p className="text-sm text-muted-foreground mb-6">Yuk, tambahkan matcha favoritmu dulu!</p>
        <button onClick={() => router.push('/')} className="px-6 py-3 rounded-xl gradient-brand text-white font-semibold text-sm">
          Kembali ke Menu
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-[#FDFBF7] pb-safe">
      {/* Pickup Warning Modal */}
      <AnimatePresence>
        {showPickupWarning && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}
              className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl"
            >
              <div className="mx-auto mb-4 w-14 h-14 rounded-2xl bg-amber-100 flex items-center justify-center">
                <AlertTriangle className="w-7 h-7 text-amber-600" />
              </div>
              <h3 className="text-center font-serif text-lg font-bold text-gray-900 mb-2">Pengingat Pengambilan</h3>
              <p className="text-center text-sm text-gray-600 mb-6 leading-relaxed">
                Disarankan untuk <strong>tidak mengambil pesanan lebih dari 7 menit</strong> dari waktu pengambilan yang dipilih demi kualitas minuman terbaik. 🍵
              </p>
              <button
                type="button"
                onClick={() => setShowPickupWarning(false)}
                className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-[#B48A5E] to-[#946F48] text-white font-bold text-[15px]"
              >
                Mengerti
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-sm border-b border-gray-100">
        <div className="flex items-center gap-3 px-4 py-3 max-w-2xl mx-auto">
          <button onClick={() => router.back()} className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors" aria-label="Back">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="font-serif font-bold text-lg">Checkout</h1>
        </div>
      </header>

      <form onSubmit={handleSubmit(onSubmit)} className="max-w-6xl mx-auto px-4 py-6 flex flex-col lg:flex-row gap-8 items-start">
        {/* LEFT COLUMN */}
        <div className="w-full lg:flex-1 space-y-6">
          {/* ── 1. Order Type Selector ────────────────────────── */}
        <section>
          <h2 className="font-serif font-bold text-base mb-3">Metode Pengambilan</h2>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setOrderType('PICKUP')}
              className={`flex items-center gap-3 px-4 py-4 rounded-2xl border-2 transition-all active:scale-[0.98]
                ${orderType === 'PICKUP'
                  ? 'border-[#B48A5E] bg-[#B48A5E]/5 shadow-sm'
                  : 'border-gray-200 bg-white hover:border-gray-300'}`}
            >
              <Store className={`w-5 h-5 ${orderType === 'PICKUP' ? 'text-[#B48A5E]' : 'text-gray-400'}`} />
              <div className="text-left">
                <p className="text-sm font-bold">Ambil Langsung</p>
                <p className="text-[10px] text-gray-500">Pre-order & pickup</p>
              </div>
            </button>
            <button
              type="button"
              onClick={() => setOrderType('DELIVERY')}
              className={`flex items-center gap-3 px-4 py-4 rounded-2xl border-2 transition-all active:scale-[0.98]
                ${orderType === 'DELIVERY'
                  ? 'border-[#B48A5E] bg-[#B48A5E]/5 shadow-sm'
                  : 'border-gray-200 bg-white hover:border-gray-300'}`}
            >
              <Truck className={`w-5 h-5 ${orderType === 'DELIVERY' ? 'text-[#B48A5E]' : 'text-gray-400'}`} />
              <div className="text-left">
                <p className="text-sm font-bold">Delivery</p>
                <p className="text-[10px] text-gray-500">Antar ke alamat</p>
              </div>
            </button>
          </div>
        </section>

        {/* ── 2. Pickup Time ────────────────────────────────── */}
        {orderType === 'PICKUP' && (
          <motion.section initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
            <h2 className="font-serif font-bold text-base flex items-center gap-2">
              <Clock className="w-4 h-4 text-[#B48A5E]" />
              Waktu Pengambilan
            </h2>
            <PickupTimePicker
              openTime={storeSettings.openTime}
              closeTime={storeSettings.closeTime}
              slotInterval={storeSettings.pickupSlotInterval}
              selectedDate={pickupDate}
              selectedTime={pickupTime}
              onDateChange={setPickupDate}
              onTimeChange={setPickupTime}
            />
          </motion.section>
        )}

        {/* ── 2b. Delivery Address ────────────────────────────────── */}
        {orderType === 'DELIVERY' && (
          <motion.section initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
            <h2 className="font-serif font-bold text-base flex items-center gap-2">
              <MapPin className="w-4 h-4 text-[#B48A5E]" />
              Alamat Pengiriman
            </h2>
            <MapPicker
              onLocationSelect={setDeliveryAddress}
              deliveryFeePerKm={storeSettings.deliveryFeePerKm}
              maxDeliveryDistance={storeSettings.maxDeliveryDistance}
            />
          </motion.section>
        )}

        {/* ── 3. Customer Details ───────────────────────────── */}
        <section className="space-y-3">
          <h2 className="font-serif font-bold text-base flex items-center gap-2">
            <User className="w-4 h-4 text-[#B48A5E]" />
            Detail Pemesan
          </h2>
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1.5">Nama Lengkap</label>
              <input {...register('name')} placeholder="Nama kamu"
                className="w-full px-4 py-3 rounded-2xl border-2 border-gray-200 bg-white text-sm focus:outline-none focus:border-[#B48A5E] transition-all" />
              {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name.message}</p>}
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1.5">Nomor HP (WhatsApp)</label>
              <div className="relative">
                <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input {...register('phone')} placeholder="08123456789" type="tel"
                  className="w-full pl-10 pr-4 py-3 rounded-2xl border-2 border-gray-200 bg-white text-sm focus:outline-none focus:border-[#B48A5E] transition-all" />
              </div>
              {errors.phone && <p className="text-xs text-red-500 mt-1">{errors.phone.message}</p>}
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1.5">Catatan (opsional)</label>
              <input {...register('notes')} placeholder="Catatan untuk pesanan..."
                className="w-full px-4 py-3 rounded-2xl border-2 border-gray-200 bg-white text-sm focus:outline-none focus:border-[#B48A5E] transition-all" />
            </div>
          </div>
        </section>

        {/* ── 3b. Tumbler Toggle (Eco Card) ──────────────────── */}
        {tumblerEnabled && (
          <motion.section
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <button
              type="button"
              onClick={() => setHasTumbler(!hasTumbler)}
              className={`w-full relative overflow-hidden rounded-2xl border-2 p-4 transition-all duration-300 text-left active:scale-[0.98] ${
                hasTumbler
                  ? 'border-emerald-400 bg-gradient-to-r from-emerald-50 to-green-50 shadow-md shadow-emerald-100'
                  : 'border-gray-200 bg-white hover:border-emerald-300'
              }`}
            >
              {/* Decorative leaf pattern */}
              {hasTumbler && (
                <div className="absolute -top-6 -right-6 w-24 h-24 rounded-full bg-emerald-400/10 blur-xl" />
              )}

              <div className="relative z-10 flex items-start gap-3.5">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 transition-all duration-300 ${
                  hasTumbler
                    ? 'bg-emerald-500 shadow-lg shadow-emerald-200'
                    : 'bg-gray-100'
                }`}>
                  <Leaf className={`w-6 h-6 transition-colors ${hasTumbler ? 'text-white' : 'text-gray-400'}`} />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <p className={`text-sm font-bold transition-colors ${
                      hasTumbler ? 'text-emerald-800' : 'text-gray-800'
                    }`}>
                      Saya Bawa Tumbler / Wadah Sendiri
                    </p>
                    {hasTumbler && (
                      <span className="text-[9px] font-bold uppercase tracking-wider text-emerald-600 bg-emerald-100 px-2 py-0.5 rounded-full">
                        Aktif ✓
                      </span>
                    )}
                  </div>
                  <p className={`text-xs leading-relaxed transition-colors ${
                    hasTumbler ? 'text-emerald-600' : 'text-gray-500'
                  }`}>
                    Kurangi plastik, dapatkan <strong>+{tumblerBonusPoints} poin bonus</strong>
                    {tumblerDiscountPct > 0 && <> + <strong>diskon {tumblerDiscountPct}%</strong></>}
                    {' '}setiap pembelian! 🌍
                  </p>
                </div>

                {/* Toggle indicator */}
                <div className={`w-11 h-6 rounded-full transition-colors duration-300 shrink-0 mt-1 relative ${
                  hasTumbler ? 'bg-emerald-500' : 'bg-gray-200'
                }`}>
                  <motion.div
                    initial={false}
                    animate={{ x: hasTumbler ? 20 : 0 }}
                    className="absolute left-0.5 top-0.5 w-5 h-5 rounded-full bg-white shadow-sm"
                  />
                </div>
              </div>
            </button>
          </motion.section>
        )}

        {/* ── 4. Order Summary ──────────────────────────────── */}
        <section className="space-y-3">
          <h2 className="font-serif font-bold text-base flex items-center gap-2">
            <ShoppingBag className="w-4 h-4 text-[#B48A5E]" />
            Pesanan ({itemCount} item)
          </h2>
          <div className="space-y-2 pb-2">
                  {items.map((item) => (
                    <div key={item.id} className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-white border border-gray-100">
                      {item.image ? (
                        <div className="w-14 h-14 rounded-xl overflow-hidden shrink-0 bg-brand-50 relative">
                          <Image src={item.image} alt={item.name} fill className="object-cover" sizes="56px" />
                        </div>
                      ) : (
                        <div className="w-14 h-14 rounded-xl shrink-0 bg-brand-50 flex items-center justify-center">
                          <ShoppingBag className="w-5 h-5 text-brand-200" />
                        </div>
                      )}
                      
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-900 truncate">{item.name}</p>
                        <p className="text-[11px] text-gray-500 line-clamp-1">
                          {item.isBundle && item.bundleSelections
                            ? item.bundleSelections.map((s: any) => `${s.groupName}: ${s.productName}${s.iceLevel || s.sugarLevel ? ` (${[s.iceLevel, s.sugarLevel].filter(Boolean).join(', ')})` : ''}`).join(' | ')
                            : `${item.iceLevel} · ${item.sugarLevel}${item.addOns.length > 0 ? ` · +${item.addOns.map(a => a.name).join(', ')}` : ''}`
                          }
                        </p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <p className="text-xs font-bold text-[#B48A5E]">{formatRupiah(item.totalPrice)}</p>
                          <button 
                            type="button" 
                            onClick={() => handleEditOrAdd(item, true)} 
                            className="text-[10px] text-amber-600 font-semibold hover:underline"
                          >
                            Edit
                          </button>
                        </div>
                      </div>
                      <div className="flex flex-col items-center gap-1.5 shrink-0">
                        <div className="flex items-center gap-1.5 bg-gray-50 rounded-lg p-0.5 border border-gray-100">
                          <button type="button" onClick={() => item.quantity <= 1 ? removeItem(item.id) : updateQuantity(item.id, item.quantity - 1)}
                            className="w-7 h-7 flex items-center justify-center rounded-md bg-white hover:bg-gray-100 transition-colors shadow-sm">
                            {item.quantity <= 1 ? <Trash2 className="w-3 h-3 text-red-500" /> : <Minus className="w-3 h-3" />}
                          </button>
                          <span className="w-5 text-center text-xs font-bold">{item.quantity}</span>
                          <button type="button" onClick={() => handleEditOrAdd(item, false)}
                            className="w-7 h-7 flex items-center justify-center rounded-md bg-white hover:bg-gray-100 transition-colors shadow-sm">
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                
                <button
                  type="button"
                  onClick={() => router.push('/')}
                  className="w-full mt-2 py-3 rounded-xl border border-dashed border-[#B48A5E]/30 text-[#B48A5E] font-bold text-sm hover:bg-[#B48A5E]/5 transition-colors"
                >
                  + Tambah Menu Lain
                </button>
        </section>
        </div> {/* END LEFT COLUMN */}

        {/* RIGHT COLUMN */}
        <div className="w-full lg:w-[400px] space-y-6 lg:sticky lg:top-24">
          {/* ── Product Recommendations ─────────────────────────── */}
          <ProductRecommendations onSelectProduct={handleSelectRecommendation} />

        {/* ── 5a. Voucher Section ──────────────────────────── */}
        <section className="space-y-3">
          <h2 className="font-serif font-bold text-base flex items-center gap-2">
            <Ticket className="w-4 h-4 text-[#B48A5E]" />
            Voucher
          </h2>
          {appliedVoucher ? (
            <div className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-emerald-50 border border-emerald-200">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-emerald-800">{appliedVoucher.description}</p>
                <p className="text-xs text-emerald-600">Kode: {appliedVoucher.code}</p>
              </div>
              <button type="button" onClick={() => { setAppliedVoucher(null); setVoucherCode(''); }} className="p-1.5 rounded-full hover:bg-emerald-100">
                <X className="w-4 h-4 text-emerald-600" />
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="flex gap-2">
                <input
                  value={voucherCode}
                  onChange={(e) => { setVoucherCode(e.target.value); setVoucherError(''); }}
                  placeholder="Masukkan kode voucher"
                  className="flex-1 px-4 py-3 rounded-2xl border-2 border-gray-200 bg-white text-sm focus:outline-none focus:border-[#B48A5E] transition-all"
                />
                <button
                  type="button"
                  onClick={handleApplyVoucher}
                  disabled={voucherLoading || !voucherCode.trim()}
                  className="px-5 py-3 rounded-2xl bg-[#B48A5E] text-white font-bold text-sm hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2"
                >
                  {voucherLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Pakai'}
                </button>
              </div>
              {voucherError && <p className="text-xs text-red-500 flex items-center gap-1"><XCircle className="w-3 h-3" />{voucherError}</p>}
            </div>
          )}
        </section>

        {/* ── 5b. Points Section ──────────────────────────── */}
        {userPoints > 0 && (
          <section className="space-y-3">
            <h2 className="font-serif font-bold text-base flex items-center gap-2">
              <Coins className="w-4 h-4 text-[#B48A5E]" />
              Poin Saya ({userPoints} poin)
            </h2>
            <button
              type="button"
              onClick={() => { setUsePoints(!usePoints); if (!usePoints) setPointsToUse(Math.min(userPoints, Math.floor(subtotal / 1000))); }}
              className={`w-full flex items-center gap-3.5 p-4 rounded-2xl border-2 transition-all text-left active:scale-[0.98] ${
                usePoints ? 'border-amber-400 bg-amber-50/50 shadow-sm' : 'border-gray-200 bg-white hover:border-gray-300'
              }`}
            >
              <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${
                usePoints ? 'bg-amber-500 shadow-md' : 'bg-gray-100'
              }`}>
                <Coins className={`w-5 h-5 ${usePoints ? 'text-white' : 'text-gray-400'}`} />
              </div>
              <div className="flex-1">
                <p className={`text-sm font-bold ${usePoints ? 'text-amber-800' : 'text-gray-800'}`}>Gunakan Poin</p>
                <p className={`text-xs ${usePoints ? 'text-amber-600' : 'text-gray-500'}`}>
                  {usePoints ? `${pointsToUse} poin = diskon ${formatRupiah(pointsToUse * 1000)}` : `1 poin = Rp1.000 (maks. ${Math.min(userPoints, Math.floor(subtotal / 1000))} poin)`}
                </p>
              </div>
              <div className={`w-11 h-6 rounded-full transition-colors duration-300 shrink-0 relative ${usePoints ? 'bg-amber-500' : 'bg-gray-200'}`}>
                <motion.div initial={false} animate={{ x: usePoints ? 20 : 0 }} className="absolute left-0.5 top-0.5 w-5 h-5 rounded-full bg-white shadow-sm" />
              </div>
            </button>
            {usePoints && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="overflow-hidden">
                <div className="flex items-center gap-3 px-1">
                  <span className="text-xs text-gray-500 shrink-0">1</span>
                  <input
                    type="range"
                    min={1}
                    max={Math.min(userPoints, Math.floor(subtotal / 1000))}
                    value={pointsToUse}
                    onChange={(e) => setPointsToUse(parseInt(e.target.value))}
                    className="flex-1 accent-amber-500 h-2"
                  />
                  <span className="text-xs text-gray-500 shrink-0">{Math.min(userPoints, Math.floor(subtotal / 1000))}</span>
                </div>
              </motion.div>
            )}
          </section>
        )}

        {/* ── 6. Payment ────────────────────────────────────── */}
        <section className="space-y-3">
          <h2 className="font-serif font-bold text-base flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-[#B48A5E]" />
            Pembayaran
          </h2>
          <PaymentUpload
            orderTotal={grandTotal}
            customerName={session?.user?.name || ''}
            onProofUploaded={(url) => setPaymentProofUrl(url)}
            onPaymentMethodChange={setPaymentMethod}
            selectedMethod={paymentMethod}
          />
        </section>

        {/* ── 6. Price Summary ──────────────────────────────── */}
        <section className="rounded-3xl bg-white border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-5 py-4 space-y-2.5">
            <h2 className="font-serif font-bold text-base">Ringkasan</h2>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Subtotal</span>
              <span className="font-medium">{formatRupiah(subtotal)}</span>
            </div>
            {orderType === 'PICKUP' && pickupDate && pickupTime && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-500 flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" />Pickup</span>
                <span className="font-medium text-[#B48A5E]">{pickupDate} · {pickupTime}</span>
              </div>
            )}
            {orderType === 'DELIVERY' && deliveryAddress && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-500 flex items-center gap-1.5"><Truck className="w-3.5 h-3.5" />Ongkir ({deliveryAddress.distance.toFixed(1)} km)</span>
                <span className="font-medium text-[#B48A5E]">{formatRupiah(deliveryAddress.deliveryFee)}</span>
              </div>
            )}
            {hasTumbler && tumblerDiscount > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-emerald-600 flex items-center gap-1.5"><Leaf className="w-3.5 h-3.5" />Diskon Tumbler</span>
                <span className="font-medium text-emerald-600">-{formatRupiah(tumblerDiscount)}</span>
              </div>
            )}
            {appliedVoucher && voucherDiscount > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-purple-600 flex items-center gap-1.5"><Ticket className="w-3.5 h-3.5" />Voucher</span>
                <span className="font-medium text-purple-600">-{formatRupiah(voucherDiscount)}</span>
              </div>
            )}
            {(hasFreeShippingBundle || (appliedVoucher && (appliedVoucher.type === 'GRATIS_ONGKIR' || appliedVoucher.type === 'DISKON_ONGKIR') && ongkirDiscount > 0)) && (
              <div className="flex justify-between text-sm">
                <span className="text-emerald-600 flex items-center gap-1.5">
                  <Truck className="w-3.5 h-3.5" />
                  Diskon Ongkir {hasFreeShippingBundle && <span className="text-[9px] bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded-full font-bold">Promo Combo</span>}
                </span>
                <span className="font-medium text-emerald-600">-{formatRupiah(ongkirDiscount)}</span>
              </div>
            )}
            {usePoints && pointsDiscount > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-amber-600 flex items-center gap-1.5"><Coins className="w-3.5 h-3.5" />Poin ({pointsToUse})</span>
                <span className="font-medium text-amber-600">-{formatRupiah(pointsDiscount)}</span>
              </div>
            )}
            {hasTumbler && (
              <div className="flex justify-between text-sm">
                <span className="text-emerald-600 flex items-center gap-1.5">🌿 Bonus Poin</span>
                <span className="font-medium text-emerald-600">+{tumblerBonusPoints} poin</span>
              </div>
            )}
            <div className="border-t border-gray-100 pt-2.5">
              <div className="flex justify-between">
                <span className="font-bold text-gray-900">Total</span>
                <span className="font-bold text-lg text-[#B48A5E]">{formatRupiah(grandTotal)}</span>
              </div>
            </div>
          </div>

          <motion.button
            type="submit"
            disabled={!canSubmit || isSubmitting}
            whileTap={canSubmit ? { scale: 0.98 } : {}}
            className={`w-full py-4 font-bold text-[15px] transition-all
              ${canSubmit && !isSubmitting
                ? 'bg-gradient-to-r from-[#B48A5E] to-[#946F48] text-white'
                : 'bg-gray-200 text-gray-400 cursor-not-allowed'}`}
          >
            {isSubmitting
              ? 'Memproses...'
              : orderType === 'PICKUP' && (!pickupDate || !pickupTime)
              ? 'Pilih waktu pengambilan'
              : orderType === 'DELIVERY' && !deliveryAddress
              ? 'Pilih alamat pengiriman'
              : `Pesan Sekarang · ${formatRupiah(grandTotal)}`}
          </motion.button>
        </section>
        </div> {/* END RIGHT COLUMN */}
      </form>

      {/* Product Modal for Editing / Adding */}
      <ProductModal
        product={selectedProduct}
        isOpen={isProductModalOpen}
        onClose={() => setIsProductModalOpen(false)}
        editCartItemId={editingCartItem?.id || undefined}
        initialData={editingCartItem || undefined}
        allProducts={allProducts}
      />

      {/* Toast Notification */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -40, x: '-50%' }}
            animate={{ opacity: 1, y: 0, x: '-50%' }}
            exit={{ opacity: 0, y: -40, x: '-50%' }}
            className={`fixed top-4 left-1/2 z-[100] max-w-sm w-[90vw] px-4 py-3 rounded-2xl shadow-2xl flex items-center gap-3 border ${
              toast.type === 'error'
                ? 'bg-red-50 border-red-200 text-red-800'
                : 'bg-emerald-50 border-emerald-200 text-emerald-800'
            }`}
          >
            {toast.type === 'error' ? <XCircle className="w-5 h-5 text-red-500 shrink-0" /> : <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />}
            <p className="text-sm font-medium flex-1">{toast.message}</p>
            <button onClick={() => setToast(null)} className="p-1 rounded-full hover:bg-black/5"><X className="w-4 h-4" /></button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
