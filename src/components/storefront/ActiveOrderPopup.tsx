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
    if (!session?.user?.id) {
      setActiveOrder(null);
      return;
    }

    // Don't show or poll on checkout, orders, or auth pages
    const hideOnPaths = ['/checkout', '/orders', '/login', '/register', '/setup-'];
    if (hideOnPaths.some((p) => pathname?.startsWith(p))) {
      return;
    }

    const fetchActiveOrders = async () => {
      try {
        const res = await fetch('/api/orders/active');
        if (res.ok) {
          const data = await res.json();
          if (data && data.length > 0) {
            const currentOrder = data[0]; // Take the most recent active order
            
            // If order status changed, reset dismissal so user is notified
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
  const getStatusConfig = (status: string) => {
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
          title: 'Siap Diambil',
          description: 'Pesanan Anda siap diambil di toko',
          color: 'text-green-500 bg-green-50 border-green-100',
          progress: 85,
          icon: ShoppingBag,
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

  const statusConfig = getStatusConfig(activeOrder.status);
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
        exit={{ opacity: 0, y: 20, scale: 0.95 }}
        transition={{ type: 'spring', stiffness: 350, damping: 25 }}
        className="fixed bottom-24 left-4 right-4 md:bottom-6 md:right-6 md:left-auto md:w-96 z-50"
      >
        <div className="bg-[#FFFBF5]/90 backdrop-blur-xl border border-brand-700/10 rounded-2xl shadow-[0_12px_40px_rgba(148,111,72,0.15)] overflow-hidden">
          {/* Card Header & Content */}
          <div className="p-4 relative">
            {/* Close Button */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                setIsDismissed(true);
              }}
              className="absolute top-3.5 right-3.5 p-1 rounded-full text-muted-foreground hover:bg-black/5 hover:text-foreground transition-colors"
              aria-label="Dismiss"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Main Interactive Row */}
            <div
              onClick={handleClick}
              className="flex items-start gap-3 cursor-pointer select-none"
            >
              {/* Icon Container */}
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center border shrink-0 ${statusConfig.color}`}
              >
                <StatusIcon className="w-5 h-5 animate-pulse" />
              </div>

              {/* Text Info */}
              <div className="flex-1 min-w-0 pr-6">
                <span className="text-[10px] font-bold text-brand-700 tracking-wider uppercase block">
                  Pesanan Aktif • #{activeOrder.id.slice(0, 8).toUpperCase()}
                </span>
                <h4 className="font-heading font-extrabold text-sm text-gray-900 leading-tight mt-0.5">
                  {statusConfig.title}
                </h4>
                <p className="text-xs text-muted-foreground truncate mt-0.5">
                  {activeOrder.itemsSummary}
                </p>
              </div>

              {/* Arrow */}
              <div className="self-center text-brand-700">
                <ArrowRight className="w-4 h-4" />
              </div>
            </div>

            {/* Progress Bar Container */}
            <div className="mt-3.5 space-y-1">
              <div className="h-1.5 w-full bg-brand-700/5 rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-brand-700 rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${statusConfig.progress}%` }}
                  transition={{ duration: 0.8, ease: 'easeOut' }}
                />
              </div>
              <div className="flex justify-between items-center text-[10px] text-muted-foreground font-semibold">
                <span>{statusConfig.description}</span>
                <span className="text-brand-700">{formatRupiah(activeOrder.total)}</span>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
