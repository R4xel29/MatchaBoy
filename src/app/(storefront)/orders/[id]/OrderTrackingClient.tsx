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
  ShoppingBag,
  RefreshCw,
} from 'lucide-react';
import { useState, useEffect, useCallback } from 'react';
import { formatRupiah } from '@/lib/utils';

export type TrackingOrderShape = {
  id: string;
  status: string;
  customerName: string;
  customerPhone: string;
  address: string;
  paymentMethod: string;
  orderType: string;
  items: Array<{ name: string; qty: number; price: number; mods?: string }>;
  subtotal: number;
  deliveryFee: number;
  total: number;
  createdAt: string;
  estimatedArrival: string;
};

type OrderStep = {
  key: string;
  label: string;
  time?: string;
  icon: React.ElementType;
  active: boolean;
  completed: boolean;
};

const STATUS_ORDER_PICKUP = ['PENDING', 'PENDING_PAYMENT', 'PREPARING', 'READY', 'COMPLETED'];
const STATUS_ORDER_DELIVERY = ['PENDING', 'PENDING_PAYMENT', 'ASSIGNED', 'PREPARING', 'ON_DELIVERY', 'DELIVERED'];

function getOrderSteps(orderType: string, currentStatus: string): OrderStep[] {
  if (orderType === 'PICKUP') {
    const steps: OrderStep[] = [
      { key: 'PENDING', label: 'Pesanan Diterima', icon: Check, active: false, completed: false },
      { key: 'PREPARING', label: 'Sedang Disiapkan', icon: ChefHat, active: false, completed: false },
      { key: 'READY', label: 'Siap Diambil', icon: ShoppingBag, active: false, completed: false },
      { key: 'COMPLETED', label: 'Selesai', icon: Check, active: false, completed: false },
    ];
    const currentIdx = STATUS_ORDER_PICKUP.indexOf(currentStatus);
    // Map PENDING_PAYMENT to PENDING index
    const effectiveIdx = currentStatus === 'PENDING_PAYMENT' ? 0 : currentIdx;
    steps.forEach((step, i) => {
      if (i < effectiveIdx) { step.completed = true; }
      else if (i === effectiveIdx) { step.active = true; step.completed = currentStatus === 'COMPLETED'; }
    });
    return steps;
  }
  // DELIVERY
  const steps: OrderStep[] = [
    { key: 'ASSIGNED', label: 'Pesanan Diterima', icon: Check, active: false, completed: false },
    { key: 'PREPARING', label: 'Sedang Disiapkan', icon: ChefHat, active: false, completed: false },
    { key: 'ON_DELIVERY', label: 'Dalam Pengiriman', icon: Truck, active: false, completed: false },
    { key: 'DELIVERED', label: 'Tiba di Tujuan', icon: MapPin, active: false, completed: false },
  ];
  const currentIdx = STATUS_ORDER_DELIVERY.indexOf(currentStatus);
  const effectiveIdx = currentStatus === 'PENDING_PAYMENT' ? 0 : currentIdx;
  steps.forEach((step, i) => {
    if (i < effectiveIdx) { step.completed = true; }
    else if (i === effectiveIdx) { step.active = true; step.completed = currentStatus === 'DELIVERED'; }
  });
  return steps;
}

function getOrderTypeLabel(type: string) {
  switch (type) {
    case 'PICKUP': return 'Ambil Sendiri';
    default: return 'Pengiriman';
  }
}

function getOrderTypeIcon(type: string) {
  switch (type) {
    case 'PICKUP': return ShoppingBag;
    default: return Truck;
  }
}

export default function OrderTrackingClient({ order }: { order: TrackingOrderShape }) {
  const router = useRouter();
  const orderId = order.id;
  const [copied, setCopied] = useState(false);
  const [currentStatus, setCurrentStatus] = useState(order.status);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

  // Auto-poll status every 10 seconds
  const pollStatus = useCallback(async () => {
    try {
      const res = await fetch(`/api/orders/${orderId}/status`);
      if (res.ok) {
        const data = await res.json();
        if (data.status !== currentStatus) {
          setCurrentStatus(data.status);
          setLastUpdated(new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
        }
      }
    } catch {}
  }, [orderId, currentStatus]);

  useEffect(() => {
    // Don't poll if order is already completed/delivered
    const finalStatuses = ['COMPLETED', 'DELIVERED', 'CANCELLED'];
    if (finalStatuses.includes(currentStatus)) return;

    const interval = setInterval(pollStatus, 10000);
    return () => clearInterval(interval);
  }, [pollStatus, currentStatus]);

  const handleCopy = () => {
    navigator.clipboard.writeText(orderId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const OrderTypeIcon = getOrderTypeIcon(order.orderType);
  const steps = getOrderSteps(order.orderType, currentStatus);
  const isFinished = ['COMPLETED', 'DELIVERED'].includes(currentStatus);

  return (
    <div className="min-h-dvh bg-background pb-safe">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur-sm border-b border-border/50">
        <div className="flex items-center gap-3 px-4 py-3 max-w-6xl mx-auto">
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

      <div className="max-w-6xl mx-auto px-4 py-5 flex flex-col lg:flex-row gap-8 items-start">
        {/* Left Column */}
        <div className="w-full lg:flex-1 space-y-6">
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
              <OrderTypeIcon className="w-5 h-5" />
              <span className="text-sm font-bold uppercase">{currentStatus.replace('_', ' ')}</span>
            </div>
            <p className="text-matcha-200 text-xs">
              {getOrderTypeLabel(order.orderType)}
            </p>

            {/* Order Type Badge */}
            <div className="flex items-center gap-3 mt-4 pt-3 border-t border-white/15">
              <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                <OrderTypeIcon className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold">{getOrderTypeLabel(order.orderType)}</p>
                <p className="text-xs text-matcha-200">
                  {order.orderType === 'DELIVERY' ? 'Diantar ke alamat Anda' : 'Ambil di toko'}
                </p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Order Progress Timeline */}
        <section>
          <h2 className="font-heading font-bold text-base mb-4">Status Pesanan</h2>
          <div className="space-y-0 pl-2">
            {steps.map((step, i) => (
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
                  {i < steps.length - 1 && (
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

          {/* Auto-refresh indicator */}
          {!isFinished && (
            <div className="flex items-center justify-center gap-1.5 text-[10px] text-muted-foreground">
              <RefreshCw className="w-3 h-3 animate-spin" />
              <span>Update otomatis setiap 10 detik</span>
              {lastUpdated && <span>· Terakhir: {lastUpdated}</span>}
            </div>
          )}

          {isFinished && (
            <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-center">
              <Check className="w-8 h-8 text-emerald-600 mx-auto mb-2" />
              <p className="text-sm font-bold text-emerald-800">Pesanan Selesai!</p>
              <p className="text-xs text-emerald-600 mt-0.5">Terima kasih telah memesan di Matchaboy</p>
            </div>
          )}
        </section>
        </div> {/* END LEFT COLUMN */}

        {/* Right Column */}
        <div className="w-full lg:w-[400px] space-y-6 lg:sticky lg:top-24">
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
              {order.orderType === 'DELIVERY' && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Ongkir</span>
                  <span>{formatRupiah(order.deliveryFee)}</span>
                </div>
              )}
              <div className="flex justify-between text-sm font-bold pt-1.5 border-t border-border/30">
                <span>Total</span>
                <span className="text-matcha-700">{formatRupiah(order.total)}</span>
              </div>
            </div>
          </div>
        </section>

        {/* Delivery Address - only for delivery orders */}
        {order.orderType === 'DELIVERY' && order.address && (
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
        )}

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
        </div> {/* END RIGHT COLUMN */}
      </div>
    </div>
  );
}
