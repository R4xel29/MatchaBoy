'use client';

import { useRouter } from 'next/navigation';
import { motion, AnimatePresence, useMotionValue, useTransform } from 'framer-motion';
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
  AlertTriangle,
  X,
  ChevronRight,
  Leaf,
  CreditCard,
} from 'lucide-react';
import { useState, useEffect, useCallback, useRef } from 'react';
import { formatRupiah } from '@/lib/utils';
import dynamic from 'next/dynamic';

const LeafletTracking = dynamic(() => import('@/components/storefront/MapboxTracking').then(m => m.LeafletTracking), { ssr: false });
import { SocialShareCard } from '@/components/storefront/SocialShareCard';

export type TrackingOrderShape = {
  id: string;
  status: string;
  cancelReason?: string | null;
  customerName: string;
  customerPhone: string;
  address: string;
  paymentMethod: string;
  orderType: string;
  items: Array<{ productId?: string; name: string; qty: number; price: number; image?: string; mods?: string }>;
  subtotal: number;
  deliveryFee: number;
  total: number;
  createdAt: string;
  createdAtRaw?: string;
  cancellationTimeLimit?: number;
  estimatedArrival: string;
  hasTumbler?: boolean;
  adminWhatsApp?: string;
  paymentUrl?: string;
  queueNumber?: string | null;
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
const STATUS_ORDER_DELIVERY = ['PENDING', 'PENDING_PAYMENT', 'PREPARING', 'READY', 'ASSIGNED', 'PICKED_UP', 'ON_DELIVERY', 'DELIVERED'];

function getOrderSteps(orderType: string, currentStatus: string, isSpmb?: boolean): OrderStep[] {
  if (orderType === 'PICKUP') {
    const steps: OrderStep[] = [
      { key: 'PENDING', label: 'Pesanan Diterima', icon: Check, active: false, completed: false },
      { key: 'PREPARING', label: 'Sedang Disiapkan', icon: ChefHat, active: false, completed: false },
      { key: 'READY', label: isSpmb ? 'Siap Diantar' : 'Siap Diambil', icon: ShoppingBag, active: false, completed: false },
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
    { key: 'PENDING', label: 'Pesanan Diterima', icon: Check, active: false, completed: false },
    { key: 'PREPARING', label: 'Sedang Disiapkan', icon: ChefHat, active: false, completed: false },
    { key: 'READY', label: 'Siap Diambil', icon: ShoppingBag, active: false, completed: false },
    { key: 'ASSIGNED', label: 'Kurir Ditugaskan', icon: Truck, active: false, completed: false },
    { key: 'ON_DELIVERY', label: 'Dalam Pengiriman', icon: Truck, active: false, completed: false },
    { key: 'DELIVERED', label: 'Tiba di Tujuan', icon: MapPin, active: false, completed: false },
  ];
  const currentIdx = STATUS_ORDER_DELIVERY.indexOf(currentStatus);
  const effectiveIdx = currentStatus === 'PENDING_PAYMENT' ? 0 : currentStatus === 'PICKED_UP' ? 4 : currentIdx;
  steps.forEach((step, i) => {
    if (i < effectiveIdx) { step.completed = true; }
    else if (i === effectiveIdx) { step.active = true; step.completed = currentStatus === 'DELIVERED'; }
  });
  return steps;
}

function getOrderTypeLabel(type: string, isSpmb?: boolean) {
  if (isSpmb) return 'Pengantaran SPMB';
  switch (type) {
    case 'PICKUP': return 'Ambil Sendiri';
    default: return 'Pengiriman';
  }
}

function getOrderTypeIcon(type: string, isSpmb?: boolean) {
  if (isSpmb) return MapPin;
  switch (type) {
    case 'PICKUP': return ShoppingBag;
    default: return Truck;
  }
}

const compressImageToWebP = (file: File): Promise<Blob> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        
        const MAX_SIZE = 1000;
        if (width > MAX_SIZE || height > MAX_SIZE) {
          if (width > height) {
            height = Math.round((height * MAX_SIZE) / width);
            width = MAX_SIZE;
          } else {
            width = Math.round((width * MAX_SIZE) / height);
            height = MAX_SIZE;
          }
        }
        
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Gagal mendapatkan canvas context'));
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve(blob);
            } else {
              reject(new Error('toBlob compression failed'));
            }
          },
          'image/webp',
          0.75
        );
      };
      img.onerror = (err) => reject(err);
    };
    reader.onerror = (err) => reject(err);
  });
};

function ProductReviewForm({
  item,
  orderId,
  onSuccess,
  disabled,
}: {
  item: any;
  orderId: string;
  onSuccess: () => void;
  disabled?: boolean;
}) {
  const [rating, setRating] = useState(5);
  const [hoverRating, setHoverRating] = useState<number | null>(null);
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [uploadingImage, setUploadingImage] = useState(false);
  const [uploadedImageUrl, setUploadedImageUrl] = useState<string | null>(null);

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingImage(true);
    setError('');

    try {
      const webpBlob = await compressImageToWebP(file);
      const formData = new FormData();
      formData.append('file', webpBlob, 'review-photo.webp');
      formData.append('type', 'review');

      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (res.ok) {
        const data = await res.json();
        setUploadedImageUrl(data.url);
      } else {
        const data = await res.json();
        setError(data.error || 'Gagal mengunggah foto.');
      }
    } catch (err: any) {
      console.error(err);
      setError('Gagal mengompresi atau mengunggah foto.');
    } finally {
      setUploadingImage(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');

    try {
      const res = await fetch(`/api/products/${item.productId}/reviews`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rating,
          comment: comment.trim() || undefined,
          images: uploadedImageUrl ? [uploadedImageUrl] : undefined,
          orderId,
        }),
      });

      if (res.ok) {
        onSuccess();
      } else {
        const data = await res.json();
        setError(data.message || data.error || 'Gagal mengirimkan ulasan.');
      }
    } catch (err) {
      setError('Terjadi kesalahan. Silakan coba lagi.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (disabled) {
    return (
      <div className="p-4 rounded-xl bg-gray-50 border border-gray-150 flex items-center justify-between">
        <div className="flex items-center gap-3">
          {item.image && (
            <div className="w-10 h-10 rounded-lg overflow-hidden shrink-0 border relative">
              <img src={item.image} alt={item.name} className="object-cover w-full h-full" />
            </div>
          )}
          <div>
            <p className="text-xs font-bold text-gray-805">{item.name}</p>
            <p className="text-[10px] text-emerald-600 font-semibold flex items-center gap-1">
              ✓ Ulasan berhasil dikirim
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="p-4 rounded-xl border border-gray-100 bg-gray-50/20 space-y-3">
      <div className="flex items-center gap-3">
        {item.image && (
          <div className="w-10 h-10 rounded-lg overflow-hidden shrink-0 border relative bg-white">
            <img src={item.image} alt={item.name} className="object-cover w-full h-full" />
          </div>
        )}
        <div className="flex-1">
          <p className="text-xs font-bold text-gray-900 leading-tight">{item.name}</p>
          <p className="text-[10px] text-gray-400 mt-0.5">{item.mods || 'Normal'}</p>
        </div>
      </div>

      {/* Star Selector */}
      <div className="flex items-center gap-1.5 py-1">
        <span className="text-[11px] text-gray-500 font-bold mr-1">Rating:</span>
        {[1, 2, 3, 4, 5].map((star) => {
          const isFilled = hoverRating !== null ? star <= hoverRating : star <= rating;
          return (
            <button
              key={star}
              type="button"
              onClick={() => setRating(star)}
              onMouseEnter={() => setHoverRating(star)}
              onMouseLeave={() => setHoverRating(null)}
              className="text-amber-400 hover:scale-110 transition-transform duration-105"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill={isFilled ? 'currentColor' : 'none'}
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="w-5.5 h-5.5"
              >
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
              </svg>
            </button>
          );
        })}
      </div>

      {/* Comment Input */}
      <div>
        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="Tulis ulasan Anda tentang rasa, kemasan, atau pelayanan kami..."
          rows={2}
          className="w-full p-2.5 text-xs bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-505 transition-all text-foreground"
        />
      </div>

      {/* Photo Uploader */}
      <div className="space-y-2">
        <label className="block text-[11px] font-bold text-gray-500">Tambahkan Foto (Opsional):</label>
        
        {uploadedImageUrl ? (
          <div className="relative w-24 h-24 rounded-xl overflow-hidden border border-border shadow-sm group">
            <img src={uploadedImageUrl} alt="Review upload" className="object-cover w-full h-full" />
            <button
              type="button"
              onClick={() => setUploadedImageUrl(null)}
              className="absolute top-1 right-1 w-6 h-6 bg-black/70 hover:bg-black text-white rounded-full flex items-center justify-center transition-colors animate-in fade-in"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <label className="cursor-pointer px-4 py-2.5 rounded-xl border border-dashed border-gray-300 bg-white hover:bg-gray-50 hover:border-brand-500 transition-all text-[11px] font-bold text-gray-600 flex items-center gap-1.5 shadow-sm active:scale-[0.98]">
              {uploadingImage ? (
                <>
                  <svg className="animate-spin h-3.5 w-3.5 text-gray-500" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  <span>Mengompres & Mengunggah...</span>
                </>
              ) : (
                <>
                  <span>📸 Unggah Foto Matcha</span>
                </>
              )}
              <input
                type="file"
                accept="image/*"
                onChange={handleImageChange}
                disabled={uploadingImage}
                className="hidden"
              />
            </label>
          </div>
        )}
      </div>

      {error && <p className="text-[10px] text-red-600 font-bold">{error}</p>}

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={isSubmitting || uploadingImage}
          className="px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white text-[11px] font-bold transition-all flex items-center gap-1.5"
        >
          {isSubmitting ? (
            <svg className="animate-spin h-3.5 w-3.5 text-white" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
          ) : 'Kirim Ulasan'}
        </button>
      </div>
    </form>
  );
}

export default function OrderTrackingClient({ order }: { order: TrackingOrderShape }) {
  const router = useRouter();
  const orderId = order.id;

  const [cooldown, setCooldown] = useState<{
    cooldownActive: boolean;
    remainingMs?: number;
    nextAllowedDate?: string;
  } | null>(null);

  // Swipe logic for SPMB orders
  const swipeContainerRef = useRef<HTMLDivElement>(null);
  const [swipeDragWidth, setSwipeDragWidth] = useState(0);
  const swipeX = useMotionValue(0);
  const swipeTextOpacity = useTransform(swipeX, [0, 150], [1, 0]);
  const swipeBgWidth = useTransform(swipeX, (value) => `${value + 48}px`);

  useEffect(() => {
    const updateWidth = () => {
      if (swipeContainerRef.current) {
        setSwipeDragWidth(swipeContainerRef.current.offsetWidth - 56);
      }
    };
    updateWidth();
    window.addEventListener('resize', updateWidth);
    return () => window.removeEventListener('resize', updateWidth);
  }, []);

  const handleSwipeDragEnd = async () => {
    if (swipeX.get() >= swipeDragWidth * 0.9) {
      swipeX.set(swipeDragWidth);
      await handleConfirmDelivery();
    } else {
      swipeX.set(0);
    }
  };
  const [loadingCooldown, setLoadingCooldown] = useState(false);
  const [submittedReviews, setSubmittedReviews] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    order.items.forEach(item => {
      if (item.productId && (item as any).reviewed) {
        initial[item.productId] = true;
      }
    });
    return initial;
  });
  const [remainingTime, setRemainingTime] = useState<number>(0);
  const [showReviewModal, setShowReviewModal] = useState(false);

  const checkReviewCooldown = useCallback(async () => {
    try {
      setLoadingCooldown(true);
      const res = await fetch('/api/reviews/cooldown');
      if (res.ok) {
        const data = await res.json();
        setCooldown(data);
        if (data.cooldownActive && data.remainingMs) {
          setRemainingTime(Math.ceil(data.remainingMs / 1000));
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingCooldown(false);
    }
  }, []);

  const [copied, setCopied] = useState(false);
  const [currentStatus, setCurrentStatus] = useState(order.status);
  const isFinished = ['COMPLETED', 'DELIVERED'].includes(currentStatus);
  const [cancelReasonState, setCancelReasonState] = useState<string | null>(order.cancelReason || null);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const statusRef = useRef(currentStatus);
  statusRef.current = currentStatus;

  // Live Cancel Timer
  const [timeLeftSeconds, setTimeLeftSeconds] = useState<number>(0);

  useEffect(() => {
    if (!order.cancellationTimeLimit || !order.createdAtRaw) return;
    const deadline = new Date(order.createdAtRaw).getTime() + order.cancellationTimeLimit * 60 * 1000;

    const updateTimer = () => {
      const now = Date.now();
      const remainingMs = deadline - now;
      if (remainingMs <= 0) {
        setTimeLeftSeconds(0);
        setShowCancelConfirm(false);
      } else {
        setTimeLeftSeconds(Math.ceil(remainingMs / 1000));
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [order.cancellationTimeLimit, order.createdAtRaw]);

  useEffect(() => {
    if (isFinished) {
      checkReviewCooldown();
      
      const hasUnsubmitted = order.items.some(item => item.productId && !submittedReviews[item.productId]);
      if (hasUnsubmitted) {
        setShowReviewModal(true);
      }
    }
  }, [isFinished, checkReviewCooldown, order.items, submittedReviews]);

  useEffect(() => {
    if (remainingTime <= 0) return;
    const interval = setInterval(() => {
      setRemainingTime(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          setCooldown(c => c ? { ...c, cooldownActive: false } : null);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [remainingTime]);

  const formatCooldownTime = (secs: number) => {
    const d = Math.floor(secs / (24 * 3600));
    const h = Math.floor((secs % (24 * 3600)) / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = secs % 60;
    if (d > 0) {
      return `${d} hari ${h} jam ${m} menit`;
    }
    if (h > 0) {
      return `${h} jam ${m} menit ${s} detik`;
    }
    return `${m} menit ${s} detik`;
  };

  const formatTimeLeft = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // Auto-redirect to payment page removed to prevent back button navigation loop

  // Cancel dialog states
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [showCancelSuccess, setShowCancelSuccess] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [cancelError, setCancelError] = useState('');
  const [selectedCancelReason, setSelectedCancelReason] = useState('Ingin mengubah pesanan (item/alamat)');
  const [customCancelReason, setCustomCancelReason] = useState('');

  // Confirmation states
  const [isConfirming, setIsConfirming] = useState(false);
  const [confirmError, setConfirmError] = useState('');

  // Auto-poll status every 10 seconds
  const pollStatus = useCallback(async () => {
    try {
      const res = await fetch(`/api/orders/${orderId}/status`);
      if (res.ok) {
        const data = await res.json();
        if (data.status !== statusRef.current) {
          setCurrentStatus(data.status);
          setLastUpdated(new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
        }
        if (data.cancelReason) {
          setCancelReasonState(data.cancelReason);
        }
      }
    } catch {}
  }, [orderId]);

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

  const handleCancelOrder = async () => {
    setIsCancelling(true);
    setCancelError('');
    try {
      const finalReason = selectedCancelReason === 'Lainnya' ? (customCancelReason.trim() || 'Lainnya') : selectedCancelReason;
      const res = await fetch(`/api/orders/${orderId}/cancel`, { 
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: finalReason })
      });
      if (res.ok) {
        setCurrentStatus('CANCELLED');
        setCancelReasonState(finalReason);
        setShowCancelConfirm(false);
        setShowCancelSuccess(true);
      } else {
        const data = await res.json();
        setCancelError(data.error || 'Gagal membatalkan pesanan.');
      }
    } catch (e) {
      setCancelError('Terjadi kesalahan. Silakan coba lagi.');
    } finally {
      setIsCancelling(false);
    }
  };


  const handleConfirmDelivery = async () => {
    setIsConfirming(true);
    setConfirmError('');
    try {
      const res = await fetch(`/api/orders/${orderId}/confirm`, { method: 'PUT' });
      if (res.ok) {
        setCurrentStatus(order.id.startsWith('SPMB') ? 'COMPLETED' : 'DELIVERED');
      } else {
        const data = await res.json();
        setConfirmError(data.error || 'Gagal konfirmasi pesanan.');
      }
    } catch (e) {
      setConfirmError('Terjadi kesalahan. Silakan coba lagi.');
    } finally {
      setIsConfirming(false);
    }
  };

  const isSpmb = order.id.startsWith('SPMB');
  const OrderTypeIcon = getOrderTypeIcon(order.orderType, isSpmb);
  const steps = getOrderSteps(order.orderType, currentStatus, isSpmb);

  const isOngoingDelivery = order.orderType === 'DELIVERY' && ['PICKED_UP', 'ON_DELIVERY'].includes(currentStatus);

  if (isOngoingDelivery) {
    return (
      <LeafletTracking
        orderId={orderId}
        orderStatus={currentStatus}
        paymentMethod={order.paymentMethod}
        customerName={order.customerName}
        customerPhone={order.customerPhone}
        address={order.address}
        subtotal={order.subtotal}
        deliveryFee={order.deliveryFee}
        total={order.total}
        items={order.items}
        onConfirmDelivery={handleConfirmDelivery}
        isConfirming={isConfirming}
        confirmError={confirmError}
      />
    );
  }

  return (
    <div className="min-h-dvh bg-background pb-safe">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur-sm border-b border-border/50">
        <div className="flex items-center gap-3 px-4 py-3 max-w-6xl mx-auto">
          <button
            onClick={() => {
              if (currentStatus !== 'PENDING_PAYMENT') {
                router.push('/profile?section=orders')
              } else {
                router.back()
              }
            }}
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
              className="flex items-center gap-1 text-xs text-brand-600 hover:underline"
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
          className={`rounded-2xl text-white p-5 relative overflow-hidden ${
            currentStatus === 'CANCELLED' ? 'bg-gradient-to-r from-slate-600 to-slate-700' : 'gradient-brand'
          }`}
        >
          <div className="absolute top-0 right-0 w-32 h-32 rounded-full bg-white/5 -mr-10 -mt-10" />
          <div className="absolute bottom-0 left-0 w-24 h-24 rounded-full bg-white/5 -ml-8 -mb-8" />
          
          <div className="relative z-10">
            <div className="flex justify-between items-start gap-4 flex-wrap">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <OrderTypeIcon className="w-5 h-5" />
                  <span className="text-sm font-bold uppercase">{currentStatus.replace('_', ' ')}</span>
                </div>
                <p className="text-brand-200 text-xs font-semibold">
                  {getOrderTypeLabel(order.orderType, isSpmb)}
                </p>
              </div>
              {order.queueNumber && (
                <div className="px-3.5 py-2 bg-white/20 border border-white/20 rounded-2xl text-center backdrop-blur-md shadow-[0_4px_12px_rgba(0,0,0,0.05)] select-none">
                  <p className="text-[9px] text-white/80 font-black uppercase tracking-wider">Antrean</p>
                  <p className="text-xl font-black font-mono tracking-wider mt-0.5">{order.queueNumber}</p>
                </div>
              )}
            </div>

            {/* Order Type Badge */}
            <div className="flex items-center gap-3 mt-4 pt-3 border-t border-white/15">
              <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                <OrderTypeIcon className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold">{getOrderTypeLabel(order.orderType, isSpmb)}</p>
                <p className="text-xs text-brand-200">
                  {isSpmb ? 'Diantar ke kelas/lokasi Anda' : order.orderType === 'DELIVERY' ? 'Diantar ke alamat Anda' : 'Ambil di toko'}
                </p>
              </div>
            </div>

            {/* Eco Badge */}
            {order.hasTumbler && (
              <div className="flex items-center gap-2.5 mt-3 pt-3 border-t border-white/15">
                <div className="w-8 h-8 rounded-full bg-emerald-400/20 flex items-center justify-center">
                  <Leaf className="w-4 h-4 text-emerald-300" />
                </div>
                <div>
                  <p className="text-xs font-bold text-emerald-300">Eco Order 🌍</p>
                  <p className="text-[10px] text-emerald-200/70">Menggunakan tumbler/wadah sendiri</p>
                </div>
              </div>
            )}
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
                          ? 'bg-brand-600 border-brand-600'
                          : step.active
                          ? 'bg-brand-100 border-brand-600 animate-pulse'
                          : 'bg-card border-border'
                      }`}
                  >
                    <step.icon
                      className={`w-3.5 h-3.5 ${
                        step.completed
                          ? 'text-white'
                          : step.active
                          ? 'text-brand-700'
                          : 'text-muted-foreground'
                      }`}
                    />
                  </div>
                  {i < steps.length - 1 && (
                    <div
                      className={`w-0.5 h-8 ${
                        step.completed ? 'bg-brand-600' : 'bg-border'
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
          {!isFinished && currentStatus !== 'CANCELLED' && (
            <div className="flex items-center justify-center gap-1.5 text-[10px] text-muted-foreground">
              <RefreshCw className="w-3 h-3 animate-spin" />
              <span>Update otomatis setiap 10 detik</span>
              {lastUpdated && <span>· Terakhir: {lastUpdated}</span>}
            </div>
          )}

          {isFinished && (
            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-5 duration-500">
              <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-center">
                <Check className="w-8 h-8 text-emerald-600 mx-auto mb-2" />
                <p className="text-sm font-bold text-emerald-800">Pesanan Selesai!</p>
                <p className="text-xs text-emerald-600 mt-0.5">Terima kasih telah memesan di Matchaboy</p>
              </div>
              {/* MATCHA MOMEN CARD - DISABLED (Coming Soon)
              <SocialShareCard
                customerName={order.customerName}
                orderId={order.id}
                total={order.total}
                items={order.items}
              />
              */}

              {/* Review Section */}
              <div className="bg-card border border-border/50 rounded-2xl p-5 text-center space-y-3">
                <h3 className="font-heading font-bold text-sm text-foreground">Ulas Produk</h3>
                <p className="text-xs text-muted-foreground leading-normal">
                  Berikan ulasan dan unggah foto matcha-mu untuk mendapatkan reward 1 poin loyalitas!
                </p>
                <button
                  type="button"
                  onClick={() => setShowReviewModal(true)}
                  className="px-5 py-2.5 rounded-xl gradient-brand text-white font-bold text-xs shadow-md shadow-brand-700/10 hover:shadow-lg hover:-translate-y-0.5 active:scale-[0.98] transition-all flex items-center justify-center gap-1.5 mx-auto"
                >
                  <span>✍ Ulas & Upload Foto Matcha</span>
                </button>
              </div>
            </div>
          )}

          {currentStatus === 'CANCELLED' && (
            <div className="p-4 rounded-2xl bg-red-50 border border-red-200 text-center">
              <AlertTriangle className="w-8 h-8 text-red-650 mx-auto mb-2" />
              <p className="text-sm font-bold text-red-800">Pesanan Dibatalkan</p>
              <p className="text-xs text-red-600 mt-1 font-semibold">
                Alasan: {cancelReasonState || 'Tidak ada alasan khusus'}
              </p>
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
                <span className="text-brand-700">{formatRupiah(order.total)}</span>
              </div>
            </div>
          </div>
        </section>

        {/* Delivery Address - only for delivery orders or SPMB orders */}
        {(order.orderType === 'DELIVERY' || order.id.startsWith('SPMB')) && order.address && (
          <section className="rounded-2xl bg-card border border-border/50 px-4 py-3">
            <div className="flex items-start gap-3">
              <MapPin className="w-4 h-4 text-brand-600 mt-0.5 shrink-0" />
              <div>
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1">
                  Alamat Pengiriman
                </p>
                <p className="text-sm text-foreground">{order.address}</p>
              </div>
            </div>
          </section>
        )}

        {/* Unified Pay Now Button */}
        {currentStatus === 'PENDING_PAYMENT' && (
          order.paymentMethod === 'DOKU' && order.paymentUrl ? (
            <div className="p-4 rounded-2xl bg-indigo-50/75 border border-indigo-100/50 space-y-3 shadow-sm">
              <div className="flex items-start gap-2.5">
                <CreditCard className="w-5 h-5 text-indigo-600 mt-0.5 shrink-0" />
                <div>
                  <p className="text-xs font-bold text-indigo-900 uppercase tracking-wider mb-0.5">
                    Menunggu Pembayaran
                  </p>
                  <p className="text-[11px] text-indigo-700 leading-relaxed font-medium">
                    Segera selesaikan pembayaran via DOKU agar pesanan Anda langsung diproses secara otomatis.
                  </p>
                </div>
              </div>
              <a
                href={order.paymentUrl}
                className="w-full py-3.5 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white font-bold text-sm flex items-center justify-center gap-2 transition-all shadow-md active:scale-[0.98]"
              >
                <CreditCard className="w-4 h-4" />
                Bayar Sekarang ({formatRupiah(order.total)})
              </a>
            </div>
          ) : (
            <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 space-y-3 shadow-sm">
              <div className="flex items-start gap-2.5">
                <CreditCard className="w-5 h-5 text-amber-600 mt-0.5 shrink-0" />
                <div>
                  <p className="text-xs font-bold text-amber-900 uppercase tracking-wider mb-0.5">
                    Menunggu Pembayaran
                  </p>
                  <p className="text-[11px] text-amber-700 leading-relaxed font-medium">
                    Pesanan Anda belum dibayar. Silakan lakukan pembayaran agar pesanan Anda dapat diproses.
                  </p>
                </div>
              </div>
              <button
                onClick={() => router.push(`/orders/${order.id}/payment`)}
                className="w-full py-3.5 rounded-xl bg-gradient-to-r from-amber-600 to-amber-750 hover:from-amber-700 hover:to-amber-800 text-white font-bold text-sm flex items-center justify-center gap-2 transition-all shadow-md active:scale-[0.98]"
              >
                <CreditCard className="w-4 h-4" />
                Selesaikan Pembayaran ({formatRupiah(order.total)})
              </button>
            </div>
          )
        )}

        {/* Confirm Received Button for SPMB Orders */}
        {order.id.startsWith('SPMB') && !['COMPLETED', 'CANCELLED', 'PENDING_PAYMENT'].includes(currentStatus) && (
          <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 space-y-3 shadow-sm animate-in fade-in slide-in-from-bottom-3">
            <div className="flex items-start gap-2.5">
              <Check className="w-5 h-5 text-emerald-600 mt-0.5 shrink-0" />
              <div className="text-left">
                <p className="text-xs font-bold text-emerald-900 uppercase tracking-wider mb-0.5">
                  Konfirmasi Diterima
                </p>
                <p className="text-[11px] text-emerald-700 leading-relaxed font-medium">
                  Apakah pesanan Anda sudah sampai dan Anda terima dengan baik? Silakan geser tombol di bawah untuk menyelesaikan pesanan.
                </p>
              </div>
            </div>
            {confirmError && (
              <p className="text-xs text-red-500 font-bold text-left">{confirmError}</p>
            )}
            
            <div 
              ref={swipeContainerRef}
              className="w-full relative overflow-hidden bg-emerald-100 border border-emerald-300 rounded-full p-1 h-14 shadow-inner flex items-center select-none"
            >
              <motion.div 
                className="absolute left-1 top-1 bottom-1 bg-emerald-600 rounded-full"
                style={{ width: swipeBgWidth }}
              />
              
              <motion.div 
                className="absolute inset-0 flex items-center justify-center pointer-events-none"
                style={{ opacity: swipeTextOpacity }}
              >
                <span className="font-extrabold text-emerald-800 text-xs uppercase tracking-wider">Geser untuk Diterima</span>
              </motion.div>

              <motion.div
                drag="x"
                dragConstraints={{ left: 0, right: swipeDragWidth }}
                dragElastic={0.05}
                dragMomentum={false}
                onDragEnd={handleSwipeDragEnd}
                style={{ x: swipeX }}
                className="w-12 h-12 rounded-full bg-white border border-emerald-300 flex items-center justify-center text-emerald-600 shadow-md cursor-grab active:cursor-grabbing z-10 shrink-0"
              >
                {isConfirming ? (
                  <RefreshCw className="w-5 h-5 animate-spin text-emerald-500" />
                ) : (
                  <ChevronRight className="w-6 h-6 text-emerald-500" />
                )}
              </motion.div>
            </div>
          </div>
        )}

        {/* Contact Admin */}
        <button
          onClick={() => {
            const msg = encodeURIComponent(`Halo admin, saya mau tanya soal pesanan ${orderId}`);
            window.open(`https://wa.me/${order.adminWhatsApp || ''}?text=${msg}`, '_blank');
          }}
          className="w-full py-3.5 rounded-xl border border-border bg-card
            font-semibold text-sm flex items-center justify-center gap-2
            hover:bg-muted transition-colors text-foreground touch-target"
        >
          <MessageCircle className="w-4 h-4" />
          Hubungi Admin
        </button>

        {/* Cancel Button */}
        {order.paymentMethod === 'COD' && (currentStatus === 'PENDING' || currentStatus === 'PENDING_PAYMENT') && timeLeftSeconds > 0 && (
          <button
            onClick={() => setShowCancelConfirm(true)}
            className="w-full py-3.5 rounded-xl border border-red-200 bg-red-50 text-red-600
              font-semibold text-sm flex items-center justify-center gap-2
              hover:bg-red-100 transition-colors touch-target animate-in fade-in zoom-in duration-250"
          >
            Batalkan Pesanan ({formatTimeLeft(timeLeftSeconds)})
          </button>
        )}
        </div> {/* END RIGHT COLUMN */}
      </div>

      {/* Confirmation Modal */}
      <AnimatePresence>
        {showCancelConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md bg-card rounded-2xl shadow-xl overflow-hidden"
            >
              <div className="p-6">
                <div className="w-12 h-12 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-3">
                  <AlertTriangle className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-center text-foreground mb-1">Batalkan Pesanan?</h3>
                <p className="text-xs text-center text-muted-foreground mb-4">
                  Tindakan ini tidak dapat dibatalkan. Mengapa Anda ingin membatalkan pesanan ini?
                </p>

                {cancelError && (
                  <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-600">
                    {cancelError}
                  </div>
                )}

                <div className="space-y-2 mb-4">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Pilih Alasan</label>
                  <div className="grid grid-cols-1 gap-1.5">
                    {[
                      'Ingin mengubah pesanan (item/alamat)',
                      'Salah pilih metode pembayaran',
                      'Pengiriman terlalu lama / berubah pikiran',
                      'Lainnya'
                    ].map((reasonOption) => (
                      <button
                        key={reasonOption}
                        type="button"
                        onClick={() => setSelectedCancelReason(reasonOption)}
                        className={`w-full py-2 px-3 rounded-xl border text-left text-xs font-semibold transition-all ${
                          selectedCancelReason === reasonOption
                            ? 'border-red-500 bg-red-50 text-red-700 shadow-sm'
                            : 'border-border/60 hover:bg-muted text-foreground'
                        }`}
                      >
                        {reasonOption}
                      </button>
                    ))}
                  </div>
                </div>

                {selectedCancelReason === 'Lainnya' && (
                  <div className="space-y-1 mb-4 animate-in slide-in-from-top-1 duration-200">
                    <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Tulis Alasan Lainnya</label>
                    <textarea
                      value={customCancelReason}
                      onChange={(e) => setCustomCancelReason(e.target.value)}
                      placeholder="Masukkan alasan pembatalan..."
                      rows={2}
                      className="w-full p-2.5 text-xs bg-white border border-border/40 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all text-foreground"
                    />
                  </div>
                )}

                <div className="flex gap-3">
                  <button
                    onClick={() => setShowCancelConfirm(false)}
                    disabled={isCancelling}
                    className="flex-1 py-2.5 px-4 rounded-xl border border-border font-semibold text-xs hover:bg-muted transition-colors disabled:opacity-50 text-foreground"
                  >
                    Kembali
                  </button>
                  <button
                    onClick={handleCancelOrder}
                    disabled={isCancelling || timeLeftSeconds <= 0 || (selectedCancelReason === 'Lainnya' && !customCancelReason.trim())}
                    className="flex-1 py-2.5 px-4 rounded-xl bg-red-600 text-white font-semibold text-xs hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center justify-center"
                  >
                    {isCancelling ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : 'Ya, Batalkan'}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Success Modal */}
      <AnimatePresence>
        {showCancelSuccess && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-sm bg-card rounded-2xl shadow-xl overflow-hidden"
            >
              <div className="p-6 text-center">
                <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Check className="w-8 h-8" />
                </div>
                <h3 className="text-lg font-bold text-foreground mb-2">Pesanan Dibatalkan</h3>
                <p className="text-sm text-muted-foreground mb-6">
                  Pesanan Anda telah berhasil dibatalkan.
                </p>
                <button
                  onClick={() => setShowCancelSuccess(false)}
                  className="w-full py-3 px-4 rounded-xl bg-brand-600 text-white font-semibold text-sm hover:bg-brand-700 transition-colors"
                >
                  Tutup
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Rating & Review Pop-up Modal */}
      <AnimatePresence>
        {showReviewModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-card w-full max-w-lg rounded-3xl border border-border shadow-2xl overflow-hidden max-h-[85vh] flex flex-col"
            >
              {/* Header */}
              <div className="px-5 py-4 border-b border-border/50 flex items-center justify-between bg-muted/40 shrink-0">
                <div className="text-left">
                  <h3 className="font-heading font-bold text-sm text-foreground flex items-center gap-1.5">
                    <span>Penilaian Pesanan</span> 🌟
                  </h3>
                  <p className="text-[10px] text-muted-foreground font-semibold mt-0.5">
                    Berikan ulasan Anda tentang produk yang dibeli
                  </p>
                </div>
                <button
                  onClick={() => setShowReviewModal(false)}
                  className="w-8 h-8 rounded-full bg-muted flex items-center justify-center hover:bg-border transition-colors text-muted-foreground hover:text-foreground"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Scrollable Form Area */}
              <div className="p-5 overflow-y-auto space-y-4 flex-1">
                {cooldown?.cooldownActive ? (
                  <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-xs text-amber-800 space-y-1 text-center">
                    <p className="font-bold flex items-center justify-center gap-1.5">
                      ⏳ Cooldown Ulasan Aktif
                    </p>
                    <p className="text-amber-700 leading-normal">
                      Anda hanya dapat menulis ulasan sekali setiap 3 hari untuk menjaga kualitas ulasan dan mencegah penyalahgunaan poin.
                    </p>
                    <p className="font-mono text-[10px] mt-1.5 font-bold text-amber-900 bg-amber-100/50 inline-block px-2.5 py-1 rounded-lg">
                      Tersedia dalam: {formatCooldownTime(remainingTime)}
                    </p>
                  </div>
                ) : (
                  <>
                    <p className="text-xs text-muted-foreground leading-normal mb-1 text-left">
                      Kirim ulasan produk di bawah ini untuk mendapatkan bonus 1 poin loyalitas!
                    </p>
                    <div className="space-y-4">
                      {order.items.map((item) => {
                        if (!item.productId) return null;
                        const prodId = item.productId;
                        const hasSubmitted = submittedReviews[prodId];
                        
                        return (
                          <ProductReviewForm
                            key={prodId}
                            item={item}
                            orderId={orderId}
                            onSuccess={() => {
                              setSubmittedReviews(prev => {
                                const next = { ...prev, [prodId]: true };
                                const allReviewed = order.items.every(i => !i.productId || next[i.productId]);
                                if (allReviewed) {
                                  setTimeout(() => setShowReviewModal(false), 2000);
                                }
                                return next;
                              });
                              checkReviewCooldown();
                            }}
                            disabled={hasSubmitted}
                          />
                        );
                      })}
                    </div>
                  </>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
