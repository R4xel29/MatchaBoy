'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  CheckCircle2,
  Clock,
  XCircle,
  CreditCard,
  Banknote,
  Home,
  MessageCircle,
  Loader2,
} from 'lucide-react';
import { useCartStore } from '@/stores/cart-store';
import { formatRupiah } from '@/lib/utils';

type PaymentState = 'processing' | 'success' | 'pending' | 'error';

export default function PaymentPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const method = searchParams.get('method') ?? 'midtrans';
  const clearCart = useCartStore((s) => s.clearCart);
  const totalPrice = useCartStore((s) => s.totalPrice);

  const [state, setState] = useState<PaymentState>('processing');
  const [adminWhatsApp, setAdminWhatsApp] = useState('');
  const price = totalPrice();

  // Fetch admin WA number
  useEffect(() => {
    fetch('/api/payment-methods')
      .then(r => r.json())
      .then(d => { if (d.cod?.whatsapp) setAdminWhatsApp(d.cod.whatsapp); })
      .catch(() => {});
  }, []);

  // Simulate payment processing
  useEffect(() => {
    if (method === 'cod') {
      // COD goes straight to success
      const timer = setTimeout(() => {
        setState('success');
        clearCart();
      }, 2000);
      return () => clearTimeout(timer);
    }

    // Midtrans: simulate popup → success
    const timer = setTimeout(() => {
      setState('success');
      clearCart();
    }, 3500);
    return () => clearTimeout(timer);
  }, [method, clearCart]);

  const orderId = `MCB-${Date.now().toString(36).toUpperCase()}`;

  return (
    <div className="min-h-dvh bg-background flex flex-col items-center justify-center px-6 pb-safe">
      {/* Processing State */}
      {state === 'processing' && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center text-center"
        >
          {method === 'midtrans' ? (
            <>
              {/* Fake Midtrans Snap Popup */}
              <div className="w-full max-w-sm rounded-2xl bg-card border border-border shadow-2xl overflow-hidden mb-6">
                <div className="px-5 py-4 bg-[#003D79] text-white flex items-center gap-3">
                  <CreditCard className="w-5 h-5" />
                  <span className="font-bold text-sm">Midtrans Payment</span>
                </div>
                <div className="p-6 space-y-4">
                  <div className="text-center">
                    <p className="text-xs text-muted-foreground">Total Pembayaran</p>
                    <p className="text-2xl font-bold text-foreground mt-1">
                      {formatRupiah(price)}
                    </p>
                  </div>
                  <div className="flex items-center justify-center gap-2 py-3">
                    <Loader2 className="w-5 h-5 text-[#003D79] animate-spin" />
                    <span className="text-sm text-muted-foreground">
                      Memproses pembayaran...
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {['BCA', 'BNI', 'GoPay'].map((bank) => (
                      <div
                        key={bank}
                        className="py-2 rounded-lg border border-border bg-muted/50 
                          text-center text-xs font-medium text-muted-foreground"
                      >
                        {bank}
                      </div>
                    ))}
                  </div>
                </div>
                <div className="px-5 py-3 bg-muted/30 border-t border-border">
                  <p className="text-[10px] text-muted-foreground text-center">
                    🔒 Sandbox Mode — Pembayaran simulasi
                  </p>
                </div>
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-green-50 flex items-center justify-center">
                <Banknote className="w-8 h-8 text-green-500" />
              </div>
              <p className="text-sm text-muted-foreground">
                Mengonfirmasi pesanan COD...
              </p>
              <Loader2 className="w-5 h-5 text-brand-600 animate-spin" />
            </div>
          )}
        </motion.div>
      )}

      {/* Success State */}
      {state === 'success' && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: 'spring', stiffness: 300, damping: 25 }}
          className="flex flex-col items-center text-center max-w-sm"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: 'spring', stiffness: 400, damping: 15 }}
            className="w-20 h-20 rounded-full gradient-brand flex items-center justify-center mb-5
              shadow-lg shadow-brand-700/30"
          >
            <CheckCircle2 className="w-10 h-10 text-white" />
          </motion.div>

          <motion.h1
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="font-heading font-bold text-2xl text-foreground mb-2"
          >
            Pesanan Berhasil! 🎉
          </motion.h1>

          <motion.p
            initial={{ y: 15, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="text-sm text-muted-foreground mb-6"
          >
            {method === 'cod'
              ? 'Pesanan COD kamu sudah diterima. Driver akan segera menuju toko.'
              : 'Pembayaran berhasil diterima. Pesanan sedang diproses.'}
          </motion.p>

          {/* Order ID Card */}
          <motion.div
            initial={{ y: 15, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="w-full px-5 py-4 rounded-2xl bg-card border border-border/50 mb-6"
          >
            <p className="text-xs text-muted-foreground mb-1">Order ID</p>
            <p className="font-mono font-bold text-lg text-brand-700 tracking-wider">
              {orderId}
            </p>
            <div className="flex items-center gap-2 mt-2">
              <Clock className="w-3.5 h-3.5 text-muted-foreground" />
              <p className="text-xs text-muted-foreground">
                Estimasi pengiriman: 20-35 menit
              </p>
            </div>
          </motion.div>

          {/* Status Steps */}
          <motion.div
            initial={{ y: 15, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.6 }}
            className="w-full space-y-0 mb-8"
          >
            {[
              { label: 'Pesanan Diterima', active: true },
              { label: 'Sedang Disiapkan', active: false },
              { label: 'Driver Menuju Toko', active: false },
              { label: 'Dalam Pengiriman', active: false },
              { label: 'Selesai', active: false },
            ].map((step, i) => (
              <div key={step.label} className="flex items-start gap-3">
                <div className="flex flex-col items-center">
                  <div
                    className={`w-3 h-3 rounded-full border-2 ${
                      step.active
                        ? 'bg-brand-600 border-brand-600'
                        : 'bg-card border-border'
                    }`}
                  />
                  {i < 4 && (
                    <div className="w-0.5 h-6 bg-border" />
                  )}
                </div>
                <p
                  className={`text-sm -mt-0.5 ${
                    step.active
                      ? 'font-semibold text-foreground'
                      : 'text-muted-foreground'
                  }`}
                >
                  {step.label}
                </p>
              </div>
            ))}
          </motion.div>

          {/* Action Buttons */}
          <motion.div
            initial={{ y: 15, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.7 }}
            className="w-full space-y-2"
          >
            <button
              onClick={() => router.push('/')}
              className="w-full py-3.5 rounded-xl gradient-brand text-white 
                font-semibold text-sm flex items-center justify-center gap-2
                shadow-lg shadow-brand-700/20"
            >
              <Home className="w-4 h-4" />
              Kembali ke Menu
            </button>
            <button
              onClick={() => {
                const message = encodeURIComponent(
                  `Halo Arus! Saya mau tanya status pesanan ${orderId}.`
                );
                window.open(`https://wa.me/${adminWhatsApp}?text=${message}`, '_blank');
              }}
              className="w-full py-3.5 rounded-xl border border-border bg-card
                font-semibold text-sm flex items-center justify-center gap-2
                hover:bg-muted transition-colors text-foreground"
            >
              <MessageCircle className="w-4 h-4" />
              Hubungi Admin
            </button>
          </motion.div>
        </motion.div>
      )}
    </div>
  );
}
