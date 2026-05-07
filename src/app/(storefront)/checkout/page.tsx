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
  ShoppingBag, Truck, X, ArrowRight, Store, Clock, AlertTriangle,
} from 'lucide-react';
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

  // Modal State
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [editingCartItem, setEditingCartItem] = useState<CartItem | null>(null);

  // Store settings
  const [storeSettings, setStoreSettings] = useState({
    openTime: '08:00', closeTime: '21:00', pickupSlotInterval: 5,
  });

  useEffect(() => {
    fetch('/api/admin/store-settings')
      .then(r => r.json())
      .then(d => { if (d.openTime) setStoreSettings(d); })
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
      // Phone will be filled from profile API
      fetch('/api/user/profile')
        .then(r => r.json())
        .then(d => { if (d.phone) setValue('phone', d.phone); })
        .catch(() => {});
    }
  }, [session, setValue]);

  const subtotal = totalPrice();
  const grandTotal = subtotal; // No delivery fee for pickup
  const itemCount = items.reduce((sum, i) => sum + i.quantity, 0);

  const canSubmit = useMemo(() => {
    if (items.length === 0) return false;
    if (orderType === 'PICKUP' && (!pickupDate || !pickupTime)) return false;
    return true;
  }, [items.length, orderType, pickupDate, pickupTime]);

  const onSubmit = async (data: CheckoutFormData) => {
    if (!canSubmit) return;
    setIsSubmitting(true);

    try {
      const payload = {
        name: data.name,
        phone: data.phone,
        notes: data.notes,
        orderType,
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
          modsString: `${item.iceLevel}, ${item.sugarLevel}${item.addOns.length > 0 ? ', +' + item.addOns.map(a => a.name).join(', +') : ''}`,
          addOnIds: item.addOns.map(a => a.id),
        })),
        deliveryFee: 0,
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
      alert(error.message);
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
        <div className="w-8 h-8 border-3 border-[#18442D] border-t-transparent rounded-full animate-spin" />
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
          <div className="mx-auto mb-4 w-14 h-14 rounded-2xl bg-gradient-to-br from-[#18442D] to-[#1a5c3a] flex items-center justify-center">
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
            className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-gradient-to-r from-[#18442D] to-[#1a5c3a] text-white font-bold text-[15px] hover:opacity-90 transition-opacity shadow-lg shadow-[#18442D]/20"
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
        <div className="w-20 h-20 rounded-full bg-matcha-50 flex items-center justify-center mb-5">
          <ShoppingBag className="w-8 h-8 text-matcha-400" />
        </div>
        <h2 className="font-heading font-bold text-xl text-foreground mb-2">Keranjang Kosong</h2>
        <p className="text-sm text-muted-foreground mb-6">Yuk, tambahkan matcha favoritmu dulu!</p>
        <button onClick={() => router.push('/')} className="px-6 py-3 rounded-xl gradient-matcha text-white font-semibold text-sm">
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
                className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-[#18442D] to-[#1a5c3a] text-white font-bold text-[15px]"
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
                  ? 'border-[#18442D] bg-[#18442D]/5 shadow-sm'
                  : 'border-gray-200 bg-white hover:border-gray-300'}`}
            >
              <Store className={`w-5 h-5 ${orderType === 'PICKUP' ? 'text-[#18442D]' : 'text-gray-400'}`} />
              <div className="text-left">
                <p className="text-sm font-bold">Ambil Langsung</p>
                <p className="text-[10px] text-gray-500">Pre-order & pickup</p>
              </div>
            </button>
            <button
              type="button"
              disabled
              className="flex items-center gap-3 px-4 py-4 rounded-2xl border-2 border-gray-200 bg-gray-50 opacity-60 cursor-not-allowed relative"
            >
              <Truck className="w-5 h-5 text-gray-400" />
              <div className="text-left">
                <p className="text-sm font-bold text-gray-400">Delivery</p>
                <p className="text-[10px] text-gray-400">Antar ke alamat</p>
              </div>
              <span className="absolute -top-2 -right-2 px-2 py-0.5 rounded-full bg-amber-400 text-[9px] font-bold text-white uppercase tracking-wider shadow-sm">
                Soon
              </span>
            </button>
          </div>
        </section>

        {/* ── 2. Pickup Time ────────────────────────────────── */}
        {orderType === 'PICKUP' && (
          <motion.section initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
            <h2 className="font-serif font-bold text-base flex items-center gap-2">
              <Clock className="w-4 h-4 text-[#18442D]" />
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

        {/* ── 3. Customer Details ───────────────────────────── */}
        <section className="space-y-3">
          <h2 className="font-serif font-bold text-base flex items-center gap-2">
            <User className="w-4 h-4 text-[#18442D]" />
            Detail Pemesan
          </h2>
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1.5">Nama Lengkap</label>
              <input {...register('name')} placeholder="Nama kamu"
                className="w-full px-4 py-3 rounded-2xl border-2 border-gray-200 bg-white text-sm focus:outline-none focus:border-[#18442D] transition-all" />
              {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name.message}</p>}
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1.5">Nomor HP (WhatsApp)</label>
              <div className="relative">
                <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input {...register('phone')} placeholder="08123456789" type="tel"
                  className="w-full pl-10 pr-4 py-3 rounded-2xl border-2 border-gray-200 bg-white text-sm focus:outline-none focus:border-[#18442D] transition-all" />
              </div>
              {errors.phone && <p className="text-xs text-red-500 mt-1">{errors.phone.message}</p>}
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1.5">Catatan (opsional)</label>
              <input {...register('notes')} placeholder="Catatan untuk pesanan..."
                className="w-full px-4 py-3 rounded-2xl border-2 border-gray-200 bg-white text-sm focus:outline-none focus:border-[#18442D] transition-all" />
            </div>
          </div>
        </section>

        {/* ── 4. Order Summary ──────────────────────────────── */}
        <section className="space-y-3">
          <h2 className="font-serif font-bold text-base flex items-center gap-2">
            <ShoppingBag className="w-4 h-4 text-[#18442D]" />
            Pesanan ({itemCount} item)
          </h2>
          <div className="space-y-2 pb-2">
                  {items.map((item) => (
                    <div key={item.id} className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-white border border-gray-100">
                      {item.image ? (
                        <div className="w-14 h-14 rounded-xl overflow-hidden shrink-0 bg-matcha-50 relative">
                          <Image src={item.image} alt={item.name} fill className="object-cover" sizes="56px" />
                        </div>
                      ) : (
                        <div className="w-14 h-14 rounded-xl shrink-0 bg-matcha-50 flex items-center justify-center">
                          <ShoppingBag className="w-5 h-5 text-matcha-200" />
                        </div>
                      )}
                      
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-900 truncate">{item.name}</p>
                        <p className="text-[11px] text-gray-500 line-clamp-1">{item.iceLevel} · {item.sugarLevel}{item.addOns.length > 0 && ` · +${item.addOns.map(a => a.name).join(', ')}`}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <p className="text-xs font-bold text-[#18442D]">{formatRupiah(item.totalPrice)}</p>
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
                  className="w-full mt-2 py-3 rounded-xl border border-dashed border-[#18442D]/30 text-[#18442D] font-bold text-sm hover:bg-[#18442D]/5 transition-colors"
                >
                  + Tambah Menu Lain
                </button>
        </section>
        </div> {/* END LEFT COLUMN */}

        {/* RIGHT COLUMN */}
        <div className="w-full lg:w-[400px] space-y-6 lg:sticky lg:top-24">
          {/* ── Product Recommendations ─────────────────────────── */}
          <ProductRecommendations onSelectProduct={handleSelectRecommendation} />

        {/* ── 5. Payment ────────────────────────────────────── */}
        <section className="space-y-3">
          <h2 className="font-serif font-bold text-base flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-[#18442D]" />
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
                <span className="font-medium text-[#18442D]">{pickupDate} · {pickupTime}</span>
              </div>
            )}
            <div className="border-t border-gray-100 pt-2.5">
              <div className="flex justify-between">
                <span className="font-bold text-gray-900">Total</span>
                <span className="font-bold text-lg text-[#18442D]">{formatRupiah(grandTotal)}</span>
              </div>
            </div>
          </div>

          <motion.button
            type="submit"
            disabled={!canSubmit || isSubmitting}
            whileTap={canSubmit ? { scale: 0.98 } : {}}
            className={`w-full py-4 font-bold text-[15px] transition-all
              ${canSubmit && !isSubmitting
                ? 'bg-gradient-to-r from-[#18442D] to-[#1a5c3a] text-white'
                : 'bg-gray-200 text-gray-400 cursor-not-allowed'}`}
          >
            {isSubmitting
              ? 'Memproses...'
              : orderType === 'PICKUP' && (!pickupDate || !pickupTime)
              ? 'Pilih waktu pengambilan'
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
      />
    </div>
  );
}
