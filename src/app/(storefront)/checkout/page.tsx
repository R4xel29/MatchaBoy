'use client';

import { useState, useMemo, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useStorefrontContext } from '@/app/(storefront)/layout';
import { motion, AnimatePresence } from 'framer-motion';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  ArrowLeft, Phone, User, CreditCard, Banknote,
  ChevronDown, ChevronUp, Trash2, Plus, Minus,
  ShoppingBag, Truck, X, ArrowRight, Store, Clock, AlertTriangle, MapPin,
  Leaf, Ticket, Coins, CheckCircle2, XCircle, Loader2, Building2, QrCode
} from 'lucide-react';
import dynamic from 'next/dynamic';
const MapPicker = dynamic(() => import('@/components/checkout/MapPicker').then(m => m.MapPicker), { ssr: false });
import { useCartStore } from '@/stores/cart-store';
import { formatRupiah } from '@/lib/utils';
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
  const { openLogin } = useStorefrontContext();

  const items = useCartStore((s) => s.items);
  const totalPrice = useCartStore((s) => s.totalPrice);
  const updateQuantity = useCartStore((s) => s.updateQuantity);
  const removeItem = useCartStore((s) => s.removeItem);
  const clearCart = useCartStore((s) => s.clearCart);

  const [orderType, setOrderType] = useState<OrderType>('PICKUP');
  const [pickupDate, setPickupDate] = useState<string | null>(() => {
    const now = new Date();
    return now.toISOString().split('T')[0];
  });
  const [pickupTime, setPickupTime] = useState<string | null>('Sekarang');
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [tempPickupTime, setTempPickupTime] = useState<string>('Sekarang');
  const [isSubmitting, setIsSubmitting] = useState(false);
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

  const [deliveryAddress, setDeliveryAddress] = useState<{ label: string, detail: string, streetDetail: string, lat: number, lng: number, distance: number, deliveryFee: number } | null>(null);
  const [allProducts, setAllProducts] = useState<Product[]>([]);

  // Payment Config State
  const [paymentConfig, setPaymentConfig] = useState<any>(null);
  const [paymentConfigLoading, setPaymentConfigLoading] = useState(true);

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

    // Fetch payment methods config
    fetch('/api/payment-methods')
      .then(r => r.json())
      .then(d => {
        setPaymentConfig(d);
        if (d.qris?.enabled) setPaymentMethod('QRIS');
        else if (d.transfer?.enabled) setPaymentMethod('TRANSFER');
        else if (d.doku?.enabled) setPaymentMethod('DOKU');
        else if (d.cod?.enabled) setPaymentMethod('COD');
      })
      .catch(() => {})
      .finally(() => setPaymentConfigLoading(false));
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

  const modalTimeSlots = useMemo(() => {
    const [openH, openM] = storeSettings.openTime.split(':').map(Number);
    const [closeH, closeM] = storeSettings.closeTime.split(':').map(Number);

    const openMinutes = openH * 60 + openM;
    const closeMinutes = closeH * 60 + closeM;

    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    const minSlot = currentMinutes + 15;

    const startMinutes = Math.max(openMinutes, minSlot);
    const slots: string[] = [];
    const interval = 15;

    const remainder = startMinutes % interval;
    const alignedStart = remainder === 0 ? startMinutes : startMinutes + (interval - remainder);

    for (let m = alignedStart; m < closeMinutes; m += interval) {
      const h = Math.floor(m / 60) % 24;
      const min = m % 60;
      slots.push(`${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`);
    }
    return slots;
  }, [storeSettings.openTime, storeSettings.closeTime]);

  const getEndTime = (timeStr: string | null) => {
    if (!timeStr || timeStr === 'Sekarang') return '';
    const [h, m] = timeStr.split(':').map(Number);
    const totalMins = h * 60 + m + 15;
    const endH = Math.floor(totalMins / 60) % 24;
    const endM = totalMins % 60;
    return `${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}`;
  };

  useEffect(() => {
    if (isScheduleModalOpen) {
      if (pickupTime && pickupTime !== 'Sekarang') {
        setTempPickupTime(pickupTime);
      } else if (modalTimeSlots.length > 0) {
        setTempPickupTime(modalTimeSlots[0]);
      }
    }
  }, [isScheduleModalOpen, pickupTime, modalTimeSlots]);

  const [tempHour, tempMin] = useMemo(() => {
    if (!tempPickupTime || tempPickupTime === 'Sekarang') {
      if (modalTimeSlots.length > 0) {
        return modalTimeSlots[0].split(':');
      }
      return [null, null];
    }
    return tempPickupTime.split(':');
  }, [tempPickupTime, modalTimeSlots]);

  const availableHours = useMemo(() => {
    const hours = new Set<string>();
    modalTimeSlots.forEach((slot) => {
      const [h] = slot.split(':');
      hours.add(h);
    });
    return Array.from(hours).sort();
  }, [modalTimeSlots]);

  const availableMinutesForSelectedHour = useMemo(() => {
    const activeHour = tempHour || (availableHours.length > 0 ? availableHours[0] : null);
    if (!activeHour) return [];
    const minutes = new Set<string>();
    modalTimeSlots.forEach((slot) => {
      const [h, m] = slot.split(':');
      if (h === activeHour) {
        minutes.add(m);
      }
    });
    return Array.from(minutes).sort();
  }, [modalTimeSlots, tempHour, availableHours]);

  const handleHourSelect = (hour: string) => {
    const minsForHour = modalTimeSlots
      .filter((slot) => slot.startsWith(`${hour}:`))
      .map((slot) => slot.split(':')[1]);
    let newMin = tempMin;
    if (!newMin || !minsForHour.includes(newMin)) {
      newMin = minsForHour[0] || '00';
    }
    setTempPickupTime(`${hour}:${newMin}`);
  };

  const handleMinSelect = (min: string) => {
    const hour = tempHour || (availableHours.length > 0 ? availableHours[0] : '08');
    setTempPickupTime(`${hour}:${min}`);
  };

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
      
      // COD redirects straight to Order Tracking, online methods redirect to Payment detail page
      if (paymentMethod === 'COD') {
        router.push(`/orders/${responseData.orderId}`);
      } else {
        router.push(`/orders/${responseData.orderId}/payment`);
      }
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

  // Auth Guard
  if (status === 'loading') {
    return (
      <div className="min-h-dvh bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-3 border-[#B48A5E] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (status === 'unauthenticated') {
    return (
      <div className="min-h-dvh bg-[#FFFBF5] flex items-center justify-center px-4">
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="w-full max-w-sm rounded-[2rem] bg-white p-8 shadow-[0_15px_40px_rgba(0,0,0,0.03)] border border-[#EADFC9]/30 text-center"
        >
          <div className="mx-auto mb-5 w-16 h-16 rounded-2xl bg-gradient-to-br from-[#B48A5E] to-[#946F48] flex items-center justify-center shadow-md">
            <User className="w-8 h-8 text-white" />
          </div>
          <h3 className="font-serif text-xl font-bold text-gray-900 mb-2">
            Login Diperlukan
          </h3>
          <p className="text-sm text-gray-500 mb-6 leading-relaxed">
            Kamu harus masuk terlebih dahulu untuk melanjutkan pemesanan matcha favoritmu.
          </p>
          <button
            type="button"
            onClick={openLogin}
            className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl bg-gradient-to-r from-[#B48A5E] to-[#946F48] text-white font-bold text-[15px] hover:opacity-95 transition-opacity shadow-lg shadow-[#B48A5E]/15 active:scale-[0.98] transition-all duration-200"
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
      <div className="min-h-dvh bg-[#FFFBF5] flex flex-col items-center justify-center px-6 text-center">
        <div className="w-20 h-20 rounded-full bg-orange-50 flex items-center justify-center mb-6 shadow-inner border border-orange-100/50">
          <ShoppingBag className="w-8 h-8 text-[#B48A5E]" />
        </div>
        <h2 className="font-serif font-bold text-xl text-gray-900 mb-2">Keranjang Kosong</h2>
        <p className="text-sm text-gray-500 mb-6 max-w-xs">Yuk, jelajahi menu artisanal matcha terbaik kami dan tambahkan minuman favoritmu!</p>
        <button onClick={() => router.push('/')} className="px-8 py-4 rounded-2xl bg-[#B48A5E] text-white font-bold text-sm shadow-lg shadow-[#B48A5E]/20 hover:bg-[#946F48] transition-all active:scale-[0.98]">
          Kembali ke Menu
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-[#FFFBF5] pb-safe noise relative">
      {/* Pickup Warning Modal */}
      <AnimatePresence>
        {showPickupWarning && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-[2px]"
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}
              className="w-full max-w-sm rounded-[2rem] bg-white p-7 shadow-2xl border border-gray-100"
            >
              <div className="mx-auto mb-4 w-14 h-14 rounded-2xl bg-amber-50 border border-amber-100/60 flex items-center justify-center">
                <AlertTriangle className="w-7 h-7 text-amber-600" />
              </div>
              <h3 className="text-center font-serif text-lg font-bold text-gray-950 mb-2">Waktu Pengambilan</h3>
              <p className="text-center text-xs text-gray-500 mb-6 leading-relaxed">
                Demi kualitas citarasa minuman terbaik, disarankan untuk <strong>tidak mengambil pesanan lebih dari 7 menit</strong> dari waktu yang dijadwalkan. 🍵
              </p>
              <button
                type="button"
                onClick={() => setShowPickupWarning(false)}
                className="w-full py-4 rounded-2xl bg-gradient-to-r from-[#B48A5E] to-[#946F48] text-white font-bold text-sm shadow-md shadow-[#B48A5E]/10"
              >
                Saya Mengerti
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <header className="sticky top-0 z-40 bg-[#FFFBF5]/90 backdrop-blur-md border-b border-gray-100">
        <div className="flex items-center gap-4 px-6 py-4 max-w-6xl mx-auto">
          <button onClick={() => router.back()} className="w-10 h-10 flex items-center justify-center rounded-full bg-white shadow-sm border border-gray-100 hover:bg-gray-50 transition-colors" aria-label="Back">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="font-serif font-bold text-xl text-gray-900">Checkout</h1>
        </div>
      </header>

      <form onSubmit={handleSubmit(onSubmit)} className="max-w-6xl mx-auto px-4 sm:px-6 py-8 flex flex-col lg:flex-row gap-8 items-start relative z-10">
        {/* LEFT COLUMN */}
        <div className="w-full lg:flex-1 space-y-6">
          {/* ── 1. Order Type Selector ────────────────────────── */}
          <section className="bg-white rounded-[2rem] border border-gray-100 p-6 shadow-sm">
            <h2 className="font-serif font-bold text-base text-gray-900 mb-4 flex items-center gap-2">
              <Store className="w-4.5 h-4.5 text-[#B48A5E]" /> Metode Pengambilan
            </h2>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setOrderType('PICKUP')}
                className={`flex items-center gap-3.5 px-5 py-4 rounded-2xl border-2 transition-all active:scale-[0.98] text-left
                  ${orderType === 'PICKUP'
                    ? 'border-[#B48A5E] bg-[#B48A5E]/5 shadow-sm shadow-[#B48A5E]/5'
                    : 'border-gray-150 bg-white hover:border-gray-300'}`}
              >
                <Store className={`w-5.5 h-5.5 shrink-0 ${orderType === 'PICKUP' ? 'text-[#B48A5E]' : 'text-gray-400'}`} />
                <div>
                  <p className="text-sm font-bold text-gray-900">Ambil Langsung</p>
                  <p className="text-[10px] text-gray-400 leading-none mt-0.5">Pre-order & pickup di toko</p>
                </div>
              </button>
              <button
                type="button"
                onClick={() => setOrderType('DELIVERY')}
                className={`flex items-center gap-3.5 px-5 py-4 rounded-2xl border-2 transition-all active:scale-[0.98] text-left
                  ${orderType === 'DELIVERY'
                    ? 'border-[#B48A5E] bg-[#B48A5E]/5 shadow-sm shadow-[#B48A5E]/5'
                    : 'border-gray-150 bg-white hover:border-gray-300'}`}
              >
                <Truck className={`w-5.5 h-5.5 shrink-0 ${orderType === 'DELIVERY' ? 'text-[#B48A5E]' : 'text-gray-400'}`} />
                <div>
                  <p className="text-sm font-bold text-gray-900">Delivery</p>
                  <p className="text-[10px] text-gray-400 leading-none mt-0.5">Kirim ke alamat tujuan</p>
                </div>
              </button>
            </div>
          </section>

          {/* ── 2. Delivery Address (Leaflet Map) ────────────────────────────────── */}
          {orderType === 'DELIVERY' && (
            <motion.section initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-[2rem] border border-gray-100 p-6 shadow-sm space-y-4">
              <h2 className="font-serif font-bold text-base text-gray-900 flex items-center gap-2">
                <MapPin className="w-4.5 h-4.5 text-[#B48A5E]" /> Alamat Pengiriman
              </h2>
              <MapPicker
                onLocationSelect={setDeliveryAddress}
                deliveryFeePerKm={storeSettings.deliveryFeePerKm}
                maxDeliveryDistance={storeSettings.maxDeliveryDistance}
              />
            </motion.section>
          )}

          {/* ── 3. Customer Details ───────────────────────────── */}
          <section className="bg-white rounded-[2rem] border border-gray-100 p-6 shadow-sm space-y-4">
            <h2 className="font-serif font-bold text-base text-gray-900 flex items-center gap-2">
              <User className="w-4.5 h-4.5 text-[#B48A5E]" /> Detail Pemesan
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1.5 pl-1">Nama Lengkap</label>
                <input {...register('name')} placeholder="Nama Anda"
                  className="w-full px-4.5 py-3.5 rounded-2xl border border-gray-200 bg-[#F9F8F6] text-sm focus:outline-none focus:bg-white focus:border-[#B48A5E] transition-all shadow-inner" />
                {errors.name && <p className="text-xs text-red-500 mt-1 pl-1">{errors.name.message}</p>}
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1.5 pl-1">Nomor HP (WhatsApp)</label>
                <div className="relative">
                  <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input {...register('phone')} placeholder="08123456789" type="tel"
                    className="w-full pl-11 pr-4.5 py-3.5 rounded-2xl border border-gray-200 bg-[#F9F8F6] text-sm focus:outline-none focus:bg-white focus:border-[#B48A5E] transition-all shadow-inner" />
                </div>
                {errors.phone && <p className="text-xs text-red-500 mt-1 pl-1">{errors.phone.message}</p>}
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1.5 pl-1">Catatan Pesanan (opsional)</label>
                <input {...register('notes')} placeholder="Contoh: Es sedikit, gula 50%, patokan rumah depan pagar hitam"
                  className="w-full px-4.5 py-3.5 rounded-2xl border border-gray-200 bg-[#F9F8F6] text-sm focus:outline-none focus:bg-white focus:border-[#B48A5E] transition-all shadow-inner" />
              </div>
            </div>
          </section>

          {/* ── 3b. Tumbler Toggle (Eco Card Glassmorphic) ──────────────────── */}
          {tumblerEnabled && (
            <motion.section initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
              <button
                type="button"
                onClick={() => setHasTumbler(!hasTumbler)}
                className={`w-full relative overflow-hidden rounded-[2rem] border-2 p-5 transition-all duration-300 text-left active:scale-[0.98] ${
                  hasTumbler
                    ? 'border-emerald-300 bg-gradient-to-r from-emerald-50 to-green-50 shadow-md shadow-emerald-100/50'
                    : 'border-gray-100 bg-white hover:border-emerald-200'
                }`}
              >
                {hasTumbler && (
                  <div className="absolute -top-6 -right-6 w-24 h-24 rounded-full bg-emerald-400/10 blur-xl" />
                )}

                <div className="relative z-10 flex items-start gap-4">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 transition-all duration-300 ${
                    hasTumbler ? 'bg-emerald-500 shadow-md shadow-emerald-400/10 text-white' : 'bg-gray-50 border border-gray-100 text-gray-400'
                  }`}>
                    <Leaf className="w-5.5 h-5.5" />
                  </div>

                  <div className="flex-1 min-w-0 pr-2">
                    <div className="flex items-center gap-2 mb-0.5">
                      <p className={`text-sm font-bold transition-colors ${hasTumbler ? 'text-emerald-800' : 'text-gray-900'}`}>
                        Saya Bawa Tumbler Sendiri
                      </p>
                      {hasTumbler && (
                        <span className="text-[8.5px] font-black uppercase tracking-wider text-emerald-600 bg-emerald-100/80 px-2 py-0.5 rounded-full">
                          Aktif ✓
                        </span>
                      )}
                    </div>
                    <p className={`text-xs leading-relaxed transition-colors ${hasTumbler ? 'text-emerald-650' : 'text-gray-400 font-medium'}`}>
                      Mendukung gerakan kurangi sampah plastik, dapatkan <strong>+{tumblerBonusPoints} bonus poin</strong>
                      {tumblerDiscountPct > 0 && <> + <strong>diskon {tumblerDiscountPct}%</strong></>} pada pesanan ini! 🌍
                    </p>
                  </div>

                  {/* Micro toggle switch */}
                  <div className={`w-11 h-6 rounded-full transition-colors duration-300 shrink-0 mt-1 relative border ${
                    hasTumbler ? 'bg-emerald-500 border-emerald-500' : 'bg-gray-100 border-gray-250'
                  }`}>
                    <motion.div
                      initial={false}
                      animate={{ x: hasTumbler ? 20 : 0 }}
                      className="absolute left-0.5 top-0.5 w-4.5 h-4.5 rounded-full bg-white shadow-sm"
                    />
                  </div>
                </div>
              </button>
            </motion.section>
          )}

          {/* ── 4. Order Summary ──────────────────────────────── */}
          <section className="bg-white rounded-[2rem] border border-gray-100 p-6 shadow-sm space-y-4">
            <h2 className="font-serif font-bold text-base text-gray-900 flex items-center gap-2">
              <ShoppingBag className="w-4.5 h-4.5 text-[#B48A5E]" /> Pesanan ({itemCount} Item)
            </h2>
            <div className="space-y-3">
              {items.map((item) => (
                <div key={item.id} className="flex items-center gap-4 px-4 py-3.5 rounded-2xl bg-gray-50/50 border border-gray-100/30 hover:border-gray-200 transition-colors">
                  {item.image ? (
                    <div className="w-14 h-14 rounded-xl overflow-hidden shrink-0 bg-white relative border border-gray-100 shadow-sm">
                      <Image src={item.image} alt={item.name} fill className="object-cover" sizes="56px" />
                    </div>
                  ) : (
                    <div className="w-14 h-14 rounded-xl shrink-0 bg-white border border-gray-100 flex items-center justify-center shadow-sm">
                      <ShoppingBag className="w-5.5 h-5.5 text-gray-300" />
                    </div>
                  )}
                  
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-gray-900 truncate">{item.name}</p>
                    <p className="text-[11px] text-gray-400 font-medium leading-relaxed truncate mt-0.5">
                      {item.isBundle && item.bundleSelections
                        ? item.bundleSelections.map((s: any) => `${s.productName}`).join(' · ')
                        : `${item.iceLevel} · ${item.sugarLevel}${item.addOns.length > 0 ? ` · +${item.addOns.map(a => a.name).join(', ')}` : ''}`
                      }
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <p className="text-xs font-bold text-[#B48A5E]">{formatRupiah(item.totalPrice)}</p>
                      <button 
                        type="button" 
                        onClick={() => handleEditOrAdd(item, true)} 
                        className="text-[10px] text-amber-600 font-bold hover:underline"
                      >
                        Edit
                      </button>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <div className="flex items-center gap-2 bg-white rounded-xl p-1 border border-gray-150 shadow-sm">
                      <button type="button" onClick={() => item.quantity <= 1 ? removeItem(item.id) : updateQuantity(item.id, item.quantity - 1)}
                        className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-red-50 text-gray-500 hover:text-red-500 transition-colors">
                        {item.quantity <= 1 ? <Trash2 className="w-3.5 h-3.5" /> : <Minus className="w-3.5 h-3.5" />}
                      </button>
                      <span className="w-5 text-center text-xs font-bold text-gray-800">{item.quantity}</span>
                      <button type="button" onClick={() => handleEditOrAdd(item, false)}
                        className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-gray-50 text-gray-800 transition-colors">
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            
            <button
              type="button"
              onClick={() => router.push('/')}
              className="w-full py-4 rounded-2xl border-2 border-dashed border-[#B48A5E]/20 text-[#B48A5E] font-bold text-xs hover:bg-[#B48A5E]/5 hover:border-[#B48A5E]/40 transition-all text-center flex items-center justify-center gap-2"
            >
              + Tambah Menu Lain
            </button>
          </section>
        </div> {/* END LEFT COLUMN */}

        {/* RIGHT COLUMN */}
        <div className="w-full lg:w-[390px] space-y-6 lg:sticky lg:top-24">
          <ProductRecommendations onSelectProduct={handleSelectRecommendation} />

          {/* ── 5. Payment Selector (Brutal Premium Upgraded) ─────────────────── */}
          <section className="bg-white rounded-[2rem] border border-gray-100 p-6 shadow-sm space-y-4">
            <h2 className="font-serif font-bold text-base text-gray-900 flex items-center gap-2">
              <CreditCard className="w-4.5 h-4.5 text-[#B48A5E]" /> Metode Pembayaran
            </h2>
            
            {paymentConfigLoading ? (
              <div className="flex items-center justify-center py-6">
                <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                {paymentConfig?.qris?.enabled && (
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('QRIS')}
                    className={`flex flex-col items-center gap-1.5 p-4.5 rounded-2xl border-2 transition-all active:scale-[0.97]
                      ${paymentMethod === 'QRIS'
                        ? 'border-purple-500 bg-purple-50/50 text-purple-700 shadow-sm shadow-purple-100'
                        : 'border-gray-150 bg-white text-gray-500 hover:border-gray-250'}`}
                  >
                    <QrCode className="w-6 h-6 shrink-0" />
                    <span className="text-[11px] font-bold tracking-wide">QRIS Instan</span>
                  </button>
                )}
                {paymentConfig?.transfer?.enabled && (
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('TRANSFER')}
                    className={`flex flex-col items-center gap-1.5 p-4.5 rounded-2xl border-2 transition-all active:scale-[0.97]
                      ${paymentMethod === 'TRANSFER'
                        ? 'border-blue-500 bg-blue-50/50 text-blue-700 shadow-sm shadow-blue-100'
                        : 'border-gray-150 bg-white text-gray-500 hover:border-gray-250'}`}
                  >
                    <Building2 className="w-6 h-6 shrink-0" />
                    <span className="text-[11px] font-bold tracking-wide">Transfer Bank</span>
                  </button>
                )}
                {paymentConfig?.cod?.enabled && (
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('COD')}
                    className={`flex flex-col items-center gap-1.5 p-4.5 rounded-2xl border-2 transition-all active:scale-[0.97]
                      ${paymentMethod === 'COD'
                        ? 'border-emerald-500 bg-emerald-50/50 text-emerald-700 shadow-sm shadow-emerald-100'
                        : 'border-gray-150 bg-white text-gray-500 hover:border-gray-250'}`}
                  >
                    <Banknote className="w-6 h-6 shrink-0" />
                    <span className="text-[11px] font-bold tracking-wide">COD (Toko/Kurir)</span>
                  </button>
                )}
              </div>
            )}
            <div className="bg-[#FFFDF9]/60 border border-[#EADFC9]/25 rounded-2xl p-4 text-[11px] text-[#8C7864] font-medium leading-relaxed">
              💡 {paymentMethod === 'COD' 
                ? 'Bayar langsung di tempat saat pesanan kamu diserahkan kurir atau diambil di toko.' 
                : 'Selesaikan transaksi dengan mudah lewat sistem pembayaran premium kami setelah checkout.'}
            </div>
          </section>

          {/* ── 5a. Voucher Section ──────────────────────────── */}
          <section className="bg-white rounded-[2rem] border border-gray-100 p-6 shadow-sm space-y-3">
            <h2 className="font-serif font-bold text-base text-gray-900 flex items-center gap-2">
              <Ticket className="w-4.5 h-4.5 text-[#B48A5E]" /> Promo Voucher
            </h2>
            {appliedVoucher ? (
              <div className="flex items-center gap-3.5 px-4.5 py-3.5 rounded-2xl bg-emerald-50 border border-emerald-250 shadow-sm">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-emerald-800 truncate">{appliedVoucher.description}</p>
                  <p className="text-[10px] text-emerald-600 font-bold uppercase tracking-wider">Kode: {appliedVoucher.code}</p>
                </div>
                <button type="button" onClick={() => { setAppliedVoucher(null); setVoucherCode(''); }} className="p-1.5 rounded-full hover:bg-emerald-100/50 text-emerald-600 transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="flex gap-2">
                  <input
                    value={voucherCode}
                    onChange={(e) => { setVoucherCode(e.target.value); setVoucherError(''); }}
                    placeholder="Kode promo voucher"
                    className="flex-1 px-4.5 py-3.5 rounded-2xl border border-gray-200 bg-[#F9F8F6] text-sm focus:outline-none focus:bg-white focus:border-[#B48A5E] transition-all shadow-inner"
                  />
                  <button
                    type="button"
                    onClick={handleApplyVoucher}
                    disabled={voucherLoading || !voucherCode.trim()}
                    className="px-6 py-3.5 rounded-2xl bg-[#B48A5E] text-white font-bold text-xs hover:bg-[#946F48] disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2"
                  >
                    {voucherLoading ? <Loader2 className="w-4.5 h-4.5 animate-spin" /> : 'Pakai'}
                  </button>
                </div>
                {voucherError && <p className="text-xs text-red-500 pl-1 flex items-center gap-1"><XCircle className="w-3.5 h-3.5" />{voucherError}</p>}
              </div>
            )}
          </section>

          {/* ── 5b. Points Section ──────────────────────────── */}
          {userPoints > 0 && (
            <section className="bg-white rounded-[2rem] border border-gray-100 p-6 shadow-sm space-y-3">
              <h2 className="font-serif font-bold text-base text-gray-900 flex items-center gap-2">
                <Coins className="w-4.5 h-4.5 text-[#B48A5E]" /> Tukar Arus Poin
              </h2>
              <button
                type="button"
                onClick={() => { setUsePoints(!usePoints); if (!usePoints) setPointsToUse(Math.min(userPoints, Math.floor(subtotal / 1000))); }}
                className={`w-full flex items-center gap-3.5 p-4.5 rounded-2xl border-2 transition-all text-left active:scale-[0.98] ${
                  usePoints ? 'border-amber-400 bg-amber-50/20 shadow-sm' : 'border-gray-150 bg-white hover:border-gray-250'
                }`}
              >
                <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${
                  usePoints ? 'bg-amber-500 shadow-md shadow-amber-400/20 text-white' : 'bg-gray-50 border border-gray-100 text-gray-400'
                }`}>
                  <Coins className="w-5.5 h-5.5" />
                </div>
                <div className="flex-1">
                  <p className={`text-sm font-bold ${usePoints ? 'text-amber-800' : 'text-gray-900'}`}>Tukarkan Poin</p>
                  <p className={`text-xs leading-none mt-1 ${usePoints ? 'text-amber-600' : 'text-gray-400 font-medium'}`}>
                    {usePoints ? `${pointsToUse} poin = diskon ${formatRupiah(pointsToUse * 1000)}` : `Miliki ${userPoints} poin (1 poin = Rp1.000)`}
                  </p>
                </div>
                <div className={`w-11 h-6 rounded-full transition-colors duration-300 shrink-0 relative border ${
                  usePoints ? 'bg-amber-500 border-amber-500' : 'bg-gray-100 border-gray-250'
                }`}>
                  <motion.div initial={false} animate={{ x: usePoints ? 20 : 0 }} className="absolute left-0.5 top-0.5 w-4.5 h-4.5 rounded-full bg-white shadow-sm" />
                </div>
              </button>
              {usePoints && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="overflow-hidden">
                  <div className="flex items-center gap-3 px-1 pt-2">
                    <span className="text-[10px] font-bold text-gray-400">1p</span>
                    <input
                      type="range"
                      min={1}
                      max={Math.min(userPoints, Math.floor(subtotal / 1000))}
                      value={pointsToUse}
                      onChange={(e) => setPointsToUse(parseInt(e.target.value))}
                      className="flex-1 accent-amber-500 h-1.5 bg-gray-150 rounded-lg cursor-pointer"
                    />
                    <span className="text-[10px] font-bold text-gray-400">{Math.min(userPoints, Math.floor(subtotal / 1000))}p</span>
                  </div>
                </motion.div>
              )}
            </section>
          )}

          {/* ── 6. Price Summary Receipt Card ─────────────────── */}
          <section className="rounded-[2.5rem] bg-white border border-gray-100 shadow-sm overflow-hidden ticket-card">
            <div className="px-6 py-6 space-y-4">
              <h2 className="font-serif font-black text-lg text-gray-900 border-b border-gray-50 pb-3">Ringkasan Tagihan</h2>
              <div className="space-y-3 text-xs font-semibold text-gray-500">
                <div className="flex justify-between">
                  <span className="font-medium">Subtotal</span>
                  <span className="text-gray-800">{formatRupiah(subtotal)}</span>
                </div>
                {orderType === 'PICKUP' && pickupTime && (
                  <div className="flex justify-between items-center bg-[#FFFDF9] border border-[#EADFC9]/20 p-2.5 rounded-xl">
                    <span className="flex items-center gap-1.5"><Clock className="w-4 h-4 text-[#B48A5E]" /> Waktu Ambil</span>
                    <span className="font-bold text-[#B48A5E]">
                      {pickupTime === 'Sekarang' ? 'Pickup Sekarang (~15 mnt)' : `Hari Ini, ${pickupTime} - ${getEndTime(pickupTime)}`}
                    </span>
                  </div>
                )}
                {orderType === 'DELIVERY' && deliveryAddress && (
                  <div className="flex justify-between">
                    <span className="flex items-center gap-1.5"><Truck className="w-4 h-4" /> Ongkir ({deliveryAddress.distance.toFixed(1)} km)</span>
                    <span className="text-gray-850 font-bold">{formatRupiah(deliveryAddress.deliveryFee)}</span>
                  </div>
                )}
                {hasTumbler && tumblerDiscount > 0 && (
                  <div className="flex justify-between text-emerald-600">
                    <span className="flex items-center gap-1.5"><Leaf className="w-4 h-4" /> Diskon Tumbler</span>
                    <span className="font-bold">-{formatRupiah(tumblerDiscount)}</span>
                  </div>
                )}
                {appliedVoucher && voucherDiscount > 0 && (
                  <div className="flex justify-between text-purple-600">
                    <span className="flex items-center gap-1.5"><Ticket className="w-4 h-4" /> Diskon Voucher</span>
                    <span className="font-bold">-{formatRupiah(voucherDiscount)}</span>
                  </div>
                )}
                {(hasFreeShippingBundle || (appliedVoucher && (appliedVoucher.type === 'GRATIS_ONGKIR' || appliedVoucher.type === 'DISKON_ONGKIR') && ongkirDiscount > 0)) && (
                  <div className="flex justify-between text-emerald-600">
                    <span className="flex items-center gap-1.5">
                      <Truck className="w-4 h-4" />
                      Potongan Ongkos Kirim {hasFreeShippingBundle && <span className="text-[9px] bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded-full font-bold ml-1">Combo</span>}
                    </span>
                    <span className="font-bold">-{formatRupiah(ongkirDiscount)}</span>
                  </div>
                )}
                {usePoints && pointsDiscount > 0 && (
                  <div className="flex justify-between text-amber-600">
                    <span className="flex items-center gap-1.5"><Coins className="w-4 h-4" /> Diskon Poin ({pointsToUse})</span>
                    <span className="font-bold">-{formatRupiah(pointsDiscount)}</span>
                  </div>
                )}
                {hasTumbler && (
                  <div className="flex justify-between text-emerald-600 bg-emerald-50/20 border border-emerald-100/25 p-2 rounded-xl text-[10px]">
                    <span className="flex items-center gap-1">🌿 Bonus Arus Poin</span>
                    <span className="font-bold">+{tumblerBonusPoints} poin</span>
                  </div>
                )}
              </div>
              
              <div className="border-t border-dashed border-gray-200 pt-4 flex items-baseline justify-between">
                <span className="font-serif font-black text-gray-900 text-sm">Total Pembayaran</span>
                <span className="font-serif font-black text-2xl text-[#B48A5E] tracking-tight">{formatRupiah(grandTotal)}</span>
              </div>
            </div>

            <div className="px-6 pb-6 pt-3 bg-gray-50/40 border-t border-gray-50">
              {orderType === 'PICKUP' && (
                <button
                  type="button"
                  onClick={() => setIsScheduleModalOpen(true)}
                  className="w-full mb-3.5 py-4 rounded-2xl border-2 border-[#946F48] text-[#946F48] font-bold text-xs bg-white hover:bg-[#FAF6EE]/50 active:scale-95 transition-all flex items-center justify-center gap-2"
                >
                  <Clock className="w-4.5 h-4.5 text-[#946F48]" />
                  {pickupTime === 'Sekarang' ? 'Jadwalkan Waktu Ambil' : `Jam Ambil: ${pickupTime}`}
                </button>
              )}

              <motion.button
                type="submit"
                disabled={!canSubmit || isSubmitting}
                whileTap={canSubmit ? { scale: 0.98 } : {}}
                className={`w-full py-4.5 font-bold text-sm tracking-wide transition-all rounded-2xl hidden md:block
                  ${canSubmit && !isSubmitting
                    ? 'bg-gradient-to-r from-[#B48A5E] to-[#946F48] text-white shadow-xl shadow-[#946F48]/15 hover:opacity-95'
                    : 'bg-gray-200 text-gray-400 cursor-not-allowed border border-gray-250/20'}`}
              >
                {isSubmitting ? (
                  <div className="flex items-center justify-center gap-2">
                    <Loader2 className="w-4.5 h-4.5 animate-spin" />
                    <span>Memproses...</span>
                  </div>
                ) : orderType === 'PICKUP' && (!pickupDate || !pickupTime) ? (
                  'Tentukan Waktu Pengambilan'
                ) : orderType === 'DELIVERY' && !deliveryAddress ? (
                  'Tentukan Alamat Kirim'
                ) : (
                  `Buat Pesanan · ${formatRupiah(grandTotal)}`
                )}
              </motion.button>
            </div>
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
            className={`fixed top-6 left-1/2 z-[100] max-w-sm w-[90vw] px-5 py-4 rounded-2xl shadow-2xl flex items-center gap-3 border ${
              toast.type === 'error'
                ? 'bg-red-50 border-red-200 text-red-800'
                : 'bg-emerald-50 border-emerald-200 text-emerald-800'
            }`}
          >
            {toast.type === 'error' ? <XCircle className="w-5 h-5 text-red-500 shrink-0" /> : <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />}
            <p className="text-xs font-semibold flex-1 leading-snug">{toast.message}</p>
            <button onClick={() => setToast(null)} className="p-1 rounded-full hover:bg-black/5"><X className="w-4 h-4" /></button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Sticky Bottom Bar for Mobile Checkout */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-gray-150 p-4 md:hidden pb-safe flex gap-3 shadow-[0_-8px_24px_rgba(0,0,0,0.035)]">
        {orderType === 'PICKUP' && (
          <button
            type="button"
            onClick={() => setIsScheduleModalOpen(true)}
            className="flex items-center justify-center gap-1.5 px-4.5 rounded-2xl border-2 border-[#946F48] text-[#946F48] font-bold text-xs shrink-0 active:scale-95 transition-all"
          >
            <Clock className="w-4 h-4 text-[#946F48]" />
            {pickupTime === 'Sekarang' ? 'Jadwalkan' : pickupTime}
          </button>
        )}
        <button
          type="button"
          onClick={() => {
            if (canSubmit && !isSubmitting) {
              handleSubmit(onSubmit)();
            }
          }}
          disabled={!canSubmit || isSubmitting}
          className={`flex-1 py-4 rounded-2xl font-bold text-xs tracking-wider text-center transition-all flex items-center justify-center gap-2 active:scale-[0.98] ${
            canSubmit && !isSubmitting
              ? 'bg-[#946F48] text-white shadow-md shadow-[#946F48]/15 hover:bg-[#745432]'
              : 'bg-gray-250 text-gray-400 cursor-not-allowed border border-gray-300/10'
          }`}
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-4.5 h-4.5 animate-spin" />
              <span>Memproses...</span>
            </>
          ) : orderType === 'PICKUP' && (!pickupDate || !pickupTime) ? (
            'Waktu Ambil Kosong'
          ) : orderType === 'DELIVERY' && !deliveryAddress ? (
            'Pilih Alamat Kirim'
          ) : (
            `BAYAR SEKARANG - ${formatRupiah(grandTotal)}`
          )}
        </button>
      </div>

      {/* Pickup Schedule Modal (Framer Motion spring based wheel) */}
      <AnimatePresence>
        {isScheduleModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-end justify-center">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsScheduleModalOpen(false)}
              className="absolute inset-0 bg-black/50 backdrop-blur-[2px]"
            />

            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 260 }}
              className="relative w-full max-w-md bg-white rounded-t-[2.5rem] shadow-2xl p-6 pb-safe z-10 flex flex-col border-t border-gray-100"
            >
              <button
                onClick={() => setIsScheduleModalOpen(false)}
                className="absolute top-5 right-5 w-9 h-9 flex items-center justify-center rounded-full bg-gray-50 text-gray-500 hover:bg-gray-100 transition-colors border border-gray-100"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="flex flex-col items-center text-center mt-2 mb-6 select-none">
                <div className="w-14 h-14 rounded-2xl bg-[#FAF6EE] border border-[#EADFC9]/30 flex items-center justify-center mb-3.5">
                  <Clock className="w-7 h-7 text-[#946F48]" strokeWidth={1.8} />
                </div>
                <h3 className="font-serif font-black text-lg text-[#2A1A0F]">
                  Jadwalkan Waktu Ambil
                </h3>
                <p className="text-[11px] text-[#8C7864] font-bold mt-1 uppercase tracking-wider">
                  {tempPickupTime === 'Sekarang' 
                    ? 'Hari Ini, Sekarang' 
                    : `Hari Ini, Jam ${tempPickupTime} - ${getEndTime(tempPickupTime)}`}
                </p>
              </div>

              <div className="relative border border-[#EADFC9]/30 bg-[#FAF6EE]/40 rounded-3xl p-4 mb-6 overflow-hidden">
                <div className="absolute inset-x-4 top-1/2 -translate-y-1/2 h-14 bg-white border border-[#EADFC9]/40 rounded-2xl -z-10 shadow-sm shadow-[#946F48]/5" />

                <div className="flex justify-center items-center h-[180px] py-2 relative">
                  {modalTimeSlots.length === 0 ? (
                    <p className="text-xs text-amber-800 font-bold py-6 text-center w-full">
                      Toko sudah tutup. Silakan pesan lagi besok pagi! ☕
                    </p>
                  ) : (
                    <>
                      {/* Hour Picker */}
                      <div 
                        className="w-1/2 h-[160px] overflow-y-auto scrollbar-hide flex flex-col items-center py-12 gap-2 select-none snap-y snap-mandatory scroll-smooth"
                        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                      >
                        {availableHours.map((hour) => {
                          const isSelected = tempHour === hour;
                          return (
                            <button
                              key={hour}
                              type="button"
                              onClick={() => handleHourSelect(hour)}
                              className={`flex justify-center items-center py-1.5 px-4 rounded-xl transition-all duration-300 w-full max-w-[80px] shrink-0 snap-center ${
                                isSelected
                                  ? 'scale-115 font-serif font-black text-xl text-[#946F48]'
                                  : 'text-gray-350 text-sm hover:text-gray-600 font-bold opacity-60'
                              }`}
                            >
                              {hour}
                            </button>
                          );
                        })}
                      </div>

                      {/* Divider */}
                      <span className="text-xl font-black text-[#946F48]/60 px-3 shrink-0 animate-pulse">:</span>

                      {/* Minute Picker */}
                      <div 
                        className="w-1/2 h-[160px] overflow-y-auto scrollbar-hide flex flex-col items-center py-12 gap-2 select-none snap-y snap-mandatory scroll-smooth"
                        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                      >
                        {availableMinutesForSelectedHour.map((min) => {
                          const isSelected = tempMin === min;
                          return (
                            <button
                              key={min}
                              type="button"
                              onClick={() => handleMinSelect(min)}
                              className={`flex justify-center items-center py-1.5 px-4 rounded-xl transition-all duration-300 w-full max-w-[80px] shrink-0 snap-center ${
                                isSelected
                                  ? 'scale-115 font-serif font-black text-xl text-[#946F48]'
                                  : 'text-gray-350 text-sm hover:text-gray-600 font-bold opacity-60'
                              }`}
                            >
                              {min}
                            </button>
                          );
                        })}
                      </div>
                    </>
                  )}
                </div>
              </div>

              <div className="space-y-2.5">
                <button
                  type="button"
                  onClick={() => {
                    setPickupTime('Sekarang');
                    setTempPickupTime('Sekarang');
                    setIsScheduleModalOpen(false);
                  }}
                  className="w-full py-4 rounded-2xl border-2 border-[#946F48] text-[#946F48] font-bold text-xs hover:bg-[#FAF6EE]/50 active:scale-95 transition-all text-center"
                >
                  Pickup Sekarang
                </button>
                <button
                  type="button"
                  disabled={modalTimeSlots.length === 0}
                  onClick={() => {
                    if (tempPickupTime !== 'Sekarang') {
                      setPickupTime(tempPickupTime);
                    } else {
                      setPickupTime('Sekarang');
                    }
                    setIsScheduleModalOpen(false);
                  }}
                  className="w-full py-4 rounded-2xl bg-[#946F48] text-white font-bold text-xs hover:bg-[#745432] active:scale-[0.98] transition-all text-center disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-[#946F48]/15"
                >
                  Gunakan Jadwal Ini
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
