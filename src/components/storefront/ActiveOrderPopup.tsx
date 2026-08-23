'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Clock,
  ChefHat,
  ShoppingBag,
  Truck,
  ArrowRight,
  X,
  CreditCard,
} from 'lucide-react';
import { useSession } from 'next-auth/react';
import { formatRupiah } from '@/lib/utils';

interface ActiveOrder {
  id: string;
  status: string;
  orderType: string;
  total: number;
  paymentMethod: string;
  paymentUrl?: string;
  itemsSummary: string;
  createdAt: string;
}

export function ActiveOrderPopup() {
  const pathname = usePathname();
  const router = useRouter();
  const { data: session } = useSession();
  const [activeOrder, setActiveOrder] = useState<ActiveOrder | null>(null);
  const [isDismissed, setIsDismissed] = useState(false);
  const [lastSeenStatus, setLastSeenStatus] = useState<string | null>(null);

  // Poll for active orders every 10 seconds
  useEffect(() => {
    // Don't show or poll on checkout, orders, or auth pages
    const hideOnPaths = ['/checkout', '/orders', '/login', '/register', '/setup-'];
    if (hideOnPaths.some((p) => pathname?.startsWith(p))) {
      return;
    }

    const fetchActiveOrders = async () => {
      // 1. Check if there's a guest SPMB order in localStorage
      let spmbOrderId = null;
      if (typeof window !== 'undefined') {
        spmbOrderId = localStorage.getItem('spmb_active_order_id');
      }

      if (spmbOrderId) {
        try {
          const res = await fetch(`/api/orders/${spmbOrderId}/status`);
          if (res.ok) {
            const data = await res.json();
            
            // If the order is finished (COMPLETED or CANCELLED), clear it from localStorage
            if (['COMPLETED', 'CANCELLED'].includes(data.status)) {
              localStorage.removeItem('spmb_active_order_id');
              setActiveOrder(null);
              setLastSeenStatus(null);
              return;
            }

            const currentOrder = {
              id: data.id,
              status: data.status,
              orderType: data.orderType,
              total: data.total,
              paymentMethod: data.paymentMethod,
              itemsSummary: 'Pesanan SPMB Anda',
              createdAt: data.updatedAt
            };

            if (lastSeenStatus && currentOrder.status !== lastSeenStatus) {
              setIsDismissed(false);
            }

            setActiveOrder(currentOrder);
            setLastSeenStatus(currentOrder.status);
            return;
          } else {
            // If status API fails with 404/401/etc, the order might be gone or invalid
            localStorage.removeItem('spmb_active_order_id');
          }
        } catch (err) {
          console.error('Failed to fetch guest SPMB active order:', err);
        }
      }

      // 2. Standard flow for logged-in users
      if (!session?.user?.id) {
        setActiveOrder(null);
        return;
      }

      try {
        const res = await fetch('/api/orders/active');
        if (res.ok) {
          const data = await res.json();
          if (data && data.length > 0) {
            const currentOrder = data[0]; // Take the most recent active order
            
            if (lastSeenStatus && currentOrder.status !== lastSeenStatus) {
              setIsDismissed(false);
            }
            
            setActiveOrder(currentOrder);
            setLastSeenStatus(currentOrder.status);
          } else {
            setActiveOrder(null);
            setLastSeenStatus(null);
          }
        }
      } catch (err) {
        console.error('Failed to fetch active orders:', err);
      }
    };

    fetchActiveOrders();
    const interval = setInterval(fetchActiveOrders, 10000);

    return () => clearInterval(interval);
  }, [session?.user?.id, pathname, lastSeenStatus]);

  // If path is checkout, order detail, or auth, don't show
  const hideOnPaths = ['/checkout', '/orders', '/login', '/register', '/setup-'];
  if (
    !activeOrder ||
    isDismissed ||
    hideOnPaths.some((p) => pathname?.startsWith(p))
  ) {
    return null;
  }

  // Map status to progress percentage and UI details
  const getStatusConfig = (status: string, isSpmb: boolean) => {
    switch (status) {
      case 'PENDING_PAYMENT':
        return {
          title: 'Menunggu Pembayaran',
          description: 'Selesaikan pembayaran pesanan Anda',
          color: 'text-amber-500 bg-amber-50 border-amber-100',
          progress: 15,
          icon: CreditCard,
        };
      case 'PENDING':
        return {
          title: 'Menunggu Konfirmasi',
          description: 'Kasir sedang mengonfirmasi pesanan',
          color: 'text-blue-500 bg-blue-50 border-blue-100',
          progress: 30,
          icon: Clock,
        };
      case 'PREPARING':
        return {
          title: 'Sedang Disiapkan',
          description: 'Makanan & minuman Anda sedang dibuat',
          color: 'text-orange-500 bg-orange-50 border-orange-100',
          progress: 60,
          icon: ChefHat,
        };
      case 'READY':
        return {
          title: isSpmb ? 'Sedang Diantar' : 'Siap Diambil',
          description: isSpmb ? 'Pesanan sedang diantar ke kelas/lokasi Anda' : 'Pesanan Anda siap diambil di toko',
          color: 'text-green-500 bg-green-50 border-green-100',
          progress: 85,
          icon: isSpmb ? Truck : ShoppingBag,
        };
      case 'ASSIGNED':
      case 'TO_STORE':
      case 'PICKED_UP':
      case 'ON_DELIVERY':
        return {
          title: 'Sedang Diantar',
          description: 'Driver sedang menuju alamat Anda',
          color: 'text-emerald-500 bg-emerald-50 border-emerald-100',
          progress: 90,
          icon: Truck,
        };
      default:
        return {
          title: 'Pesanan Diproses',
          description: 'Pesanan sedang diproses',
          color: 'text-gray-500 bg-gray-50 border-gray-100',
          progress: 50,
          icon: Clock,
        };
    }
  };

  const isSpmb = activeOrder.id.startsWith('SPMB');
  const statusConfig = getStatusConfig(activeOrder.status, isSpmb);
  const StatusIcon = statusConfig.icon;

  const handleClick = () => {
    if (activeOrder.status === 'PENDING_PAYMENT') {
      router.push(`/orders/${activeOrder.id}/payment`);
    } else {
      router.push(`/orders/${activeOrder.id}`);
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 50, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 30, scale: 0.95 }}
        transition={{ type: 'spring', stiffness: 400, damping: 28 }}
        className="fixed bottom-20 md:bottom-6 left-3 right-3 sm:left-auto sm:right-6 sm:w-[390px] z-[88]"
      >
        <div className="relative bg-[#16100C]/95 backdrop-blur-xl border border-[#D4A574]/30 rounded-[1.75rem] shadow-[0_20px_50px_rgba(0,0,0,0.5),0_0_0_1px_rgba(212,165,116,0.15)] text-[#FFFBF5] overflow-hidden">
          {/* Subtle Ambient Glow */}
          <div className="absolute top-0 right-0 w-36 h-36 bg-[#D4A574]/15 rounded-full blur-2xl pointer-events-none" />

          <div className="p-4 sm:p-4.5 relative z-10">
            {/* Top Bar: Live Status + Order ID + Close Button */}
            <div className="flex items-center justify-between pb-2.5 mb-2.5 border-b border-white/10">
              <div className="flex items-center gap-2">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                </span>
                <span className="text-[10px] font-extrabold uppercase tracking-widest text-[#EFDCA7]">
                  Pesanan Aktif
                </span>
                <span className="text-[10px] font-mono font-bold text-stone-400 bg-white/5 px-2 py-0.5 rounded-md border border-white/5">
                  #{activeOrder.id.slice(0, 8).toUpperCase()}
                </span>
              </div>

              {/* Close Button */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsDismissed(true);
                }}
                className="w-6 h-6 rounded-full bg-white/5 hover:bg-white/15 text-stone-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
                aria-label="Tutup"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Main Interactive Row */}
            <div
              onClick={handleClick}
              className="flex items-center gap-3.5 cursor-pointer select-none group"
            >
              {/* Icon Container */}
              <div
                className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#B48A5E]/30 to-[#D4A574]/10 border border-[#D4A574]/40 flex items-center justify-center shrink-0 shadow-inner group-hover:scale-105 transition-transform"
              >
                <StatusIcon className="w-6 h-6 text-[#EFDCA7] animate-pulse" />
              </div>

              {/* Text Info */}
              <div className="flex-1 min-w-0 text-left">
                <h4 className="font-sans font-bold text-sm sm:text-base text-white leading-tight truncate">
                  {statusConfig.title}
                </h4>
                <p className="text-xs text-[#EFDCA7]/80 truncate mt-0.5 font-medium">
                  {activeOrder.itemsSummary}
                </p>
                <p className="text-xs font-extrabold text-[#D4A574] mt-1">
                  {formatRupiah(activeOrder.total)}
                </p>
              </div>

              {/* Arrow Action Button */}
              <div className="w-9 h-9 rounded-2xl bg-gradient-to-r from-amber-400 via-orange-500 to-amber-500 text-stone-950 flex items-center justify-center shrink-0 shadow-md shadow-orange-500/25 group-hover:translate-x-0.5 transition-all">
                <ArrowRight className="w-4 h-4 stroke-[2.5]" />
              </div>
            </div>

            {/* Luxury Progress Bar Container */}
            <div className="mt-3.5 space-y-1.5 text-left">
              <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-gradient-to-r from-[#B48A5E] via-[#D4A574] to-[#EFDCA7] rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${statusConfig.progress}%` }}
                  transition={{ duration: 0.8, ease: 'easeOut' }}
                />
              </div>
              <div className="flex justify-between items-center text-[10px] text-stone-400 font-medium">
                <span>{statusConfig.description}</span>
                <span className="text-[#EFDCA7] font-semibold">Ketuk untuk detail →</span>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
