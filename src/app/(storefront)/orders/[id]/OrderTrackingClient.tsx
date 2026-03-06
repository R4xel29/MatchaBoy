'use client';

import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  Copy,
  Check,
  Clock,
  Package,
  Truck,
  Store,
  MapPin,
  Phone,
  MessageCircle,
  ChefHat,
} from 'lucide-react';
import { useState } from 'react';
import { formatRupiah } from '@/lib/utils';

export type TrackingOrderShape = {
  id: string;
  status: string;
  customerName: string;
  customerPhone: string;
  address: string;
  paymentMethod: string;
  items: Array<{ name: string; qty: number; price: number; mods?: string }>;
  subtotal: number;
  deliveryFee: number;
  total: number;
  createdAt: string;
  estimatedArrival: string;
  driverName: string;
  driverPhone: string;
};

type OrderStep = {
  key: string;
  label: string;
  time?: string;
  icon: React.ElementType;
  active: boolean;
  completed: boolean;
};

const ORDER_STEPS: OrderStep[] = [
  { key: 'confirmed', label: 'Pesanan Diterima', time: '14:32', icon: Check, active: false, completed: true },
  { key: 'preparing', label: 'Sedang Disiapkan', time: '14:35', icon: ChefHat, active: false, completed: true },
  { key: 'picked-up', label: 'Driver Menuju Toko', time: '14:42', icon: Store, active: false, completed: true },
  { key: 'on-delivery', label: 'Dalam Pengiriman', time: '14:50', icon: Truck, active: true, completed: false },
  { key: 'delivered', label: 'Tiba di Tujuan', icon: MapPin, active: false, completed: false },
];

export default function OrderTrackingClient({ order }: { order: TrackingOrderShape }) {
  const router = useRouter();
  const orderId = order.id;
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(orderId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

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
          <div className="flex-1">
            <h1 className="font-heading font-bold text-base">Detail Pesanan</h1>
            <button
              onClick={handleCopy}
              className="flex items-center gap-1 text-xs text-matcha-600 hover:underline"
            >
              {orderId.slice(0, 8).toUpperCase()}
              {copied ? (
                <Check className="w-3 h-3" />
              ) : (
                <Copy className="w-3 h-3" />
              )}
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-5 space-y-5">
        {/* Status Banner */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl gradient-matcha text-white p-5 relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 w-32 h-32 rounded-full bg-white/5 -mr-10 -mt-10" />
          <div className="absolute bottom-0 left-0 w-24 h-24 rounded-full bg-white/5 -ml-8 -mb-8" />
          
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-2">
              <Truck className="w-5 h-5" />
              <span className="text-sm font-bold uppercase">{order.status.replace('_', ' ')}</span>
            </div>
            <p className="text-matcha-200 text-xs">
              Estimasi tiba: {order.estimatedArrival}
            </p>

            {/* Driver info */}
            <div className="flex items-center gap-3 mt-4 pt-3 border-t border-white/15">
              <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                <Truck className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold">{order.driverName}</p>
                <p className="text-xs text-matcha-200">Driver Mattchaboy</p>
              </div>
              <div className="flex gap-2">
                <a
                  href={`tel:${order.driverPhone}`}
                  className="w-9 h-9 rounded-full bg-white/20 
                    flex items-center justify-center touch-target
                    hover:bg-white/30 transition-colors"
                >
                  <Phone className="w-4 h-4" />
                </a>
                <a
                  href={`https://wa.me/${order.driverPhone.replace(/\s/g, '')}`}
                  target="_blank"
                  className="w-9 h-9 rounded-full bg-white/20 
                    flex items-center justify-center touch-target
                    hover:bg-white/30 transition-colors"
                >
                  <MessageCircle className="w-4 h-4" />
                </a>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Order Progress Timeline */}
        <section>
          <h2 className="font-heading font-bold text-base mb-4">Status Pesanan</h2>
          <div className="space-y-0 pl-2">
            {ORDER_STEPS.map((step, i) => (
              <motion.div
                key={step.key}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.1 }}
                className="flex items-start gap-4"
              >
                <div className="flex flex-col items-center">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center border-2 
                      ${
                        step.completed
                          ? 'bg-matcha-600 border-matcha-600'
                          : step.active
                          ? 'bg-matcha-100 border-matcha-600 animate-pulse'
                          : 'bg-card border-border'
                      }`}
                  >
                    <step.icon
                      className={`w-3.5 h-3.5 ${
                        step.completed
                          ? 'text-white'
                          : step.active
                          ? 'text-matcha-700'
                          : 'text-muted-foreground'
                      }`}
                    />
                  </div>
                  {i < ORDER_STEPS.length - 1 && (
                    <div
                      className={`w-0.5 h-8 ${
                        step.completed ? 'bg-matcha-600' : 'bg-border'
                      }`}
                    />
                  )}
                </div>
                <div className="pb-6">
                  <p
                    className={`text-sm font-medium ${
                      step.active || step.completed
                        ? 'text-foreground'
                        : 'text-muted-foreground'
                    }`}
                  >
                    {step.label}
                  </p>
                  {step.time && (
                    <p className="text-[10px] text-muted-foreground mt-0.5">{step.time}</p>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        </section>

        {/* Order Items */}
        <section>
          <h2 className="font-heading font-bold text-base mb-3">Detail Pesanan</h2>
          <div className="rounded-2xl bg-card border border-border/50 overflow-hidden divide-y divide-border/30">
            {order.items.map((item, i) => (
              <div key={i} className="px-4 py-3">
                <div className="flex justify-between">
                  <p className="text-sm font-semibold text-foreground">
                    {item.qty}× {item.name}
                  </p>
                  <p className="text-sm font-medium text-foreground">
                    {formatRupiah(item.price * item.qty)}
                  </p>
                </div>
                {item.mods && (
                  <p className="text-[11px] text-muted-foreground mt-0.5">{item.mods}</p>
                )}
              </div>
            ))}

            {/* Totals */}
            <div className="px-4 py-3 space-y-1.5">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Subtotal</span>
                <span>{formatRupiah(order.subtotal)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Ongkir</span>
                <span>{formatRupiah(order.deliveryFee)}</span>
              </div>
              <div className="flex justify-between text-sm font-bold pt-1.5 border-t border-border/30">
                <span>Total</span>
                <span className="text-matcha-700">{formatRupiah(order.total)}</span>
              </div>
            </div>
          </div>
        </section>

        {/* Delivery Address */}
        <section className="rounded-2xl bg-card border border-border/50 px-4 py-3">
          <div className="flex items-start gap-3">
            <MapPin className="w-4 h-4 text-matcha-600 mt-0.5 shrink-0" />
            <div>
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1">
                Alamat Pengiriman
              </p>
              <p className="text-sm text-foreground">{order.address}</p>
            </div>
          </div>
        </section>

        {/* Contact Admin */}
        <button
          onClick={() => {
            const msg = encodeURIComponent(`Halo admin, saya mau tanya soal pesanan ${orderId}`);
            window.open(`https://wa.me/6281234567890?text=${msg}`, '_blank');
          }}
          className="w-full py-3.5 rounded-xl border border-border bg-card
            font-semibold text-sm flex items-center justify-center gap-2
            hover:bg-muted transition-colors text-foreground touch-target"
        >
          <MessageCircle className="w-4 h-4" />
          Hubungi Admin
        </button>
      </div>
    </div>
  );
}
