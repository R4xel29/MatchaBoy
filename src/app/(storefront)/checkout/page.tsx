'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  ArrowLeft,
  MapPin,
  Phone,
  User,
  FileText,
  CreditCard,
  Banknote,
  MessageCircle,
  ChevronDown,
  ChevronUp,
  Trash2,
  Plus,
  Minus,
  ShoppingBag,
  Truck,
} from 'lucide-react';
import { useCartStore } from '@/stores/cart-store';
import { useLocationStore } from '@/stores/location-store';
import { formatRupiah } from '@/lib/utils';
import { MapPicker } from '@/components/checkout/MapPicker';
import type { PaymentMethod } from '@/types';

// ── Zod Schema ──────────────────────────────────────────────

const checkoutSchema = z.object({
  name: z.string().min(2, 'Nama minimal 2 karakter'),
  phone: z
    .string()
    .min(10, 'Nomor HP minimal 10 digit')
    .regex(/^(\+62|62|0)8[0-9]{8,12}$/, 'Format nomor HP tidak valid'),
  addressDetail: z.string().min(5, 'Detail alamat minimal 5 karakter'),
  notes: z.string().optional(),
});

type CheckoutFormData = z.infer<typeof checkoutSchema>;

export default function CheckoutPage() {
  const router = useRouter();
  const items = useCartStore((s) => s.items);
  const totalPrice = useCartStore((s) => s.totalPrice);
  const updateQuantity = useCartStore((s) => s.updateQuantity);
  const removeItem = useCartStore((s) => s.removeItem);
  const clearCart = useCartStore((s) => s.clearCart);
  const address = useLocationStore((s) => s.address);
  const setAddress = useLocationStore((s) => s.setAddress);

  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('midtrans');
  const [showMap, setShowMap] = useState(!address);
  const [showCart, setShowCart] = useState(false);
  const [whatsappVerified, setWhatsappVerified] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CheckoutFormData>({
    resolver: zodResolver(checkoutSchema),
  });

  const subtotal = totalPrice();
  const deliveryFee = address?.deliveryFee ?? 0;
  const grandTotal = subtotal + deliveryFee;
  const itemCount = items.reduce((sum, i) => sum + i.quantity, 0);

  const canSubmit = useMemo(() => {
    if (!address) return false;
    if (items.length === 0) return false;
    if (paymentMethod === 'cod' && !whatsappVerified) return false;
    return true;
  }, [address, items.length, paymentMethod, whatsappVerified]);

  const handleWhatsAppVerify = () => {
    const adminPhone = '6281234567890';
    const message = encodeURIComponent(
      `Halo Mattchaboy! Saya ingin verifikasi pesanan COD.\n\nNama: (akan terisi)\nAlamat: ${address?.label ?? '-'}`
    );
    window.open(`https://wa.me/${adminPhone}?text=${message}`, '_blank');
    setWhatsappVerified(true);
  };

  const onSubmit = async (data: CheckoutFormData) => {
    setIsSubmitting(true);

    try {
      const payload = {
        name: data.name,
        phone: data.phone,
        address: address, // { label, detail, lat, lng, distance, deliveryFee }
        notes: data.notes,
        paymentMethod,
        items: items.map(item => ({
          productId: item.productId,
          name: item.name,
          quantity: item.quantity,
          price: item.basePrice,
          totalPrice: item.totalPrice,
          modsString: `${item.iceLevel}, ${item.sugarLevel}${item.addOns.length > 0 ? ', +' + item.addOns.map(a => a.name).join(', +') : ''}`
        })),
        deliveryFee: address?.deliveryFee || 0,
      };

      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const responseData = await res.json();

      if (!res.ok) {
        throw new Error(responseData.error || 'Gagal membuat pesanan');
      }

      // If Midtrans, route to payment gateway (to be implemented)
      // For COD, redirect to the real tracking page!
      clearCart();
      router.push(`/orders/${responseData.orderId}`);
    } catch (error: any) {
      alert(error.message);
      setIsSubmitting(false);
    }
  };

  // Empty cart guard
  if (items.length === 0) {
    return (
      <div className="min-h-dvh bg-background flex flex-col items-center justify-center px-6 text-center">
        <div className="w-20 h-20 rounded-full bg-matcha-50 flex items-center justify-center mb-5">
          <ShoppingBag className="w-8 h-8 text-matcha-400" />
        </div>
        <h2 className="font-heading font-bold text-xl text-foreground mb-2">
          Keranjang Kosong
        </h2>
        <p className="text-sm text-muted-foreground mb-6">
          Yuk, tambahkan matcha favoritmu dulu!
        </p>
        <button
          onClick={() => router.push('/')}
          className="px-6 py-3 rounded-xl gradient-matcha text-white font-semibold text-sm"
        >
          Kembali ke Menu
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-background pb-safe">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur-sm border-b border-border/50">
        <div className="flex items-center gap-3 px-4 py-3 max-w-2xl mx-auto">
          <button
            onClick={() => router.back()}
            className="w-10 h-10 flex items-center justify-center rounded-full 
              hover:bg-muted transition-colors touch-target"
            aria-label="Back"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="font-heading font-bold text-lg">Checkout</h1>
        </div>
      </header>

      <form
        onSubmit={handleSubmit(onSubmit)}
        className="max-w-2xl mx-auto px-4 py-5 space-y-5"
      >
        {/* ── 1. Delivery Address ──────────────────────────── */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-heading font-bold text-base flex items-center gap-2">
              <MapPin className="w-4 h-4 text-matcha-600" />
              Alamat Pengiriman
            </h2>
            {address && (
              <button
                type="button"
                onClick={() => setShowMap(!showMap)}
                className="text-xs text-matcha-600 font-medium hover:underline touch-target"
              >
                {showMap ? 'Tutup' : 'Ubah'}
              </button>
            )}
          </div>

          {/* Current address display */}
          {address && !showMap && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="px-4 py-3 rounded-xl bg-matcha-50 border border-matcha-200"
            >
              <p className="text-sm font-semibold text-foreground">{address.label}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{address.detail}</p>
              <div className="flex gap-4 mt-2">
                <span className="text-xs text-matcha-600">
                  {address.distance?.toFixed(1)} km
                </span>
                <span className="text-xs text-matcha-600">
                  Ongkir: {formatRupiah(address.deliveryFee ?? 0)}
                </span>
              </div>
            </motion.div>
          )}

          {/* Map Picker */}
          <AnimatePresence>
            {showMap && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="overflow-hidden"
              >
                <MapPicker
                  onLocationSelect={(data) => {
                    setAddress({
                      label: data.label,
                      detail: data.detail,
                      lat: data.lat,
                      lng: data.lng,
                      distance: data.distance,
                      deliveryFee: data.deliveryFee,
                    });
                    setShowMap(false);
                  }}
                  initialLat={address?.lat}
                  initialLng={address?.lng}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </section>

        {/* ── 2. Customer Details ──────────────────────────── */}
        <section className="space-y-3">
          <h2 className="font-heading font-bold text-base flex items-center gap-2">
            <User className="w-4 h-4 text-matcha-600" />
            Detail Pemesan
          </h2>

          <div className="space-y-3">
            {/* Name */}
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1.5">
                Nama Lengkap
              </label>
              <input
                {...register('name')}
                placeholder="Nama kamu"
                className="w-full px-4 py-3 rounded-xl border border-border bg-card 
                  text-sm focus:outline-none focus:ring-2 focus:ring-matcha-500/30 focus:border-matcha-500
                  transition-all"
              />
              {errors.name && (
                <p className="text-xs text-red-500 mt-1">{errors.name.message}</p>
              )}
            </div>

            {/* Phone */}
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1.5">
                Nomor HP (WhatsApp)
              </label>
              <div className="relative">
                <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  {...register('phone')}
                  placeholder="08123456789"
                  type="tel"
                  className="w-full pl-10 pr-4 py-3 rounded-xl border border-border bg-card 
                    text-sm focus:outline-none focus:ring-2 focus:ring-matcha-500/30 focus:border-matcha-500
                    transition-all"
                />
              </div>
              {errors.phone && (
                <p className="text-xs text-red-500 mt-1">{errors.phone.message}</p>
              )}
            </div>

            {/* Address Detail */}
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1.5">
                Detail Alamat (lantai, gedung, patokan)
              </label>
              <textarea
                {...register('addressDetail')}
                rows={2}
                placeholder="Contoh: Lantai 3, Apartemen XYZ, sebelah minimarket"
                className="w-full px-4 py-3 rounded-xl border border-border bg-card 
                  text-sm resize-none focus:outline-none focus:ring-2 focus:ring-matcha-500/30 
                  focus:border-matcha-500 transition-all"
              />
              {errors.addressDetail && (
                <p className="text-xs text-red-500 mt-1">{errors.addressDetail.message}</p>
              )}
            </div>

            {/* Notes */}
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1.5">
                Catatan (opsional)
              </label>
              <input
                {...register('notes')}
                placeholder="Catatan untuk driver..."
                className="w-full px-4 py-3 rounded-xl border border-border bg-card 
                  text-sm focus:outline-none focus:ring-2 focus:ring-matcha-500/30 focus:border-matcha-500
                  transition-all"
              />
            </div>
          </div>
        </section>

        {/* ── 3. Order Summary ─────────────────────────────── */}
        <section className="space-y-3">
          <button
            type="button"
            onClick={() => setShowCart(!showCart)}
            className="w-full flex items-center justify-between touch-target"
          >
            <h2 className="font-heading font-bold text-base flex items-center gap-2">
              <ShoppingBag className="w-4 h-4 text-matcha-600" />
              Pesanan ({itemCount} item)
            </h2>
            {showCart ? (
              <ChevronUp className="w-4 h-4 text-muted-foreground" />
            ) : (
              <ChevronDown className="w-4 h-4 text-muted-foreground" />
            )}
          </button>

          <AnimatePresence>
            {showCart && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.25 }}
                className="overflow-hidden"
              >
                <div className="space-y-2 pb-2">
                  {items.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center gap-3 px-4 py-3 rounded-xl bg-card border border-border/50"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-foreground truncate">
                          {item.name}
                        </p>
                        <p className="text-[11px] text-muted-foreground">
                          {item.iceLevel} · {item.sugarLevel}
                          {item.addOns.length > 0 &&
                            ` · +${item.addOns.map((a) => a.name).join(', ')}`}
                        </p>
                        <p className="text-xs font-bold text-matcha-700 mt-0.5">
                          {formatRupiah(item.totalPrice)}
                        </p>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() =>
                            item.quantity <= 1
                              ? removeItem(item.id)
                              : updateQuantity(item.id, item.quantity - 1)
                          }
                          className="w-7 h-7 flex items-center justify-center rounded-lg 
                            bg-muted hover:bg-muted/80 transition-colors touch-target"
                        >
                          {item.quantity <= 1 ? (
                            <Trash2 className="w-3 h-3 text-red-500" />
                          ) : (
                            <Minus className="w-3 h-3" />
                          )}
                        </button>
                        <span className="w-6 text-center text-xs font-bold">
                          {item.quantity}
                        </span>
                        <button
                          type="button"
                          onClick={() => updateQuantity(item.id, item.quantity + 1)}
                          className="w-7 h-7 flex items-center justify-center rounded-lg 
                            bg-muted hover:bg-muted/80 transition-colors touch-target"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </section>

        {/* ── 4. Payment Method ────────────────────────────── */}
        <section className="space-y-3">
          <h2 className="font-heading font-bold text-base flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-matcha-600" />
            Metode Pembayaran
          </h2>

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => {
                setPaymentMethod('midtrans');
                setWhatsappVerified(false);
              }}
              className={`flex items-center gap-3 px-4 py-3.5 rounded-xl border 
                transition-all touch-target
                ${
                  paymentMethod === 'midtrans'
                    ? 'border-matcha-600 bg-matcha-50 shadow-sm'
                    : 'border-border bg-card hover:border-matcha-300'
                }`}
            >
              <CreditCard
                className={`w-5 h-5 ${
                  paymentMethod === 'midtrans'
                    ? 'text-matcha-700'
                    : 'text-muted-foreground'
                }`}
              />
              <div className="text-left">
                <p className="text-sm font-semibold">Online</p>
                <p className="text-[10px] text-muted-foreground">
                  Transfer / E-Wallet
                </p>
              </div>
            </button>

            <button
              type="button"
              onClick={() => setPaymentMethod('cod')}
              className={`flex items-center gap-3 px-4 py-3.5 rounded-xl border 
                transition-all touch-target
                ${
                  paymentMethod === 'cod'
                    ? 'border-matcha-600 bg-matcha-50 shadow-sm'
                    : 'border-border bg-card hover:border-matcha-300'
                }`}
            >
              <Banknote
                className={`w-5 h-5 ${
                  paymentMethod === 'cod'
                    ? 'text-matcha-700'
                    : 'text-muted-foreground'
                }`}
              />
              <div className="text-left">
                <p className="text-sm font-semibold">COD</p>
                <p className="text-[10px] text-muted-foreground">
                  Bayar di tempat
                </p>
              </div>
            </button>
          </div>

          {/* COD WhatsApp Verification */}
          <AnimatePresence>
            {paymentMethod === 'cod' && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.25 }}
                className="overflow-hidden"
              >
                {!whatsappVerified ? (
                  <div className="px-4 py-3 rounded-xl bg-amber-50 border border-amber-200 space-y-2">
                    <p className="text-xs text-amber-800">
                      Untuk pesanan COD, verifikasi WhatsApp diperlukan.
                    </p>
                    <button
                      type="button"
                      onClick={handleWhatsAppVerify}
                      className="w-full flex items-center justify-center gap-2 
                        py-2.5 rounded-lg bg-green-500 text-white font-semibold text-sm
                        hover:bg-green-600 transition-colors touch-target"
                    >
                      <MessageCircle className="w-4 h-4" />
                      Verifikasi WhatsApp
                    </button>
                  </div>
                ) : (
                  <div className="px-4 py-3 rounded-xl bg-green-50 border border-green-200 flex items-center gap-2">
                    <div className="w-5 h-5 rounded-full bg-green-500 flex items-center justify-center">
                      <FileText className="w-3 h-3 text-white" />
                    </div>
                    <p className="text-xs text-green-800 font-medium">
                      WhatsApp terverifikasi ✓
                    </p>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </section>

        {/* ── 5. Price Summary ─────────────────────────────── */}
        <section className="rounded-2xl bg-card border border-border/50 overflow-hidden">
          <div className="px-5 py-4 space-y-2.5">
            <h2 className="font-heading font-bold text-base">Ringkasan</h2>

            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Subtotal</span>
              <span className="font-medium">{formatRupiah(subtotal)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground flex items-center gap-1.5">
                <Truck className="w-3.5 h-3.5" />
                Ongkos Kirim
              </span>
              <span className="font-medium">
                {address ? formatRupiah(deliveryFee) : '-'}
              </span>
            </div>

            <div className="border-t border-border/50 pt-2.5">
              <div className="flex justify-between">
                <span className="font-bold text-foreground">Total</span>
                <span className="font-bold text-lg text-matcha-700">
                  {formatRupiah(grandTotal)}
                </span>
              </div>
            </div>
          </div>

          {/* Submit Button */}
          <motion.button
            type="submit"
            disabled={!canSubmit || isSubmitting}
            whileTap={canSubmit ? { scale: 0.98 } : {}}
            className={`w-full py-4 font-bold text-sm transition-all
              ${
                canSubmit && !isSubmitting
                  ? 'gradient-matcha text-white'
                  : 'bg-gray-200 text-gray-400 cursor-not-allowed'
              }`}
          >
            {isSubmitting
              ? 'Memproses...'
              : !address
              ? 'Pilih alamat dulu'
              : paymentMethod === 'cod' && !whatsappVerified
              ? 'Verifikasi WhatsApp dulu'
              : paymentMethod === 'midtrans'
              ? `Bayar ${formatRupiah(grandTotal)}`
              : `Pesan COD ${formatRupiah(grandTotal)}`}
          </motion.button>
        </section>
      </form>
    </div>
  );
}
