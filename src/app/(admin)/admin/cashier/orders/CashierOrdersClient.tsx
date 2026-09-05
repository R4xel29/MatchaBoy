'use client';

import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { formatRupiah } from '@/lib/utils';
import {
  Search,
  Package,
  Clock,
  ShoppingBag,
  Truck,
  Check,
  ChefHat,
  ListFilter,
  CheckCircle2,
  AlertCircle,
  Bell,
  BellOff,
  Volume2,
  VolumeX,
  X,
  Eye,
  MapPin,
  ImageIcon,
  MessageCircle,
  Coffee,
  Store,
  Smartphone,
  Monitor,
  RefreshCw,
  UtensilsCrossed,
  ArrowRight,
  Sparkles,
  Copy,
  ExternalLink,
  Flame,
  AlertTriangle,
  User,
  CreditCard,
  Banknote,
  Send,
  Printer,
  Zap
} from 'lucide-react';
import { LiveTableMinimap } from '@/components/admin/tables/LiveTableMinimap';
import { ThermalReceiptModal, ReceiptData } from '@/components/cashier/ThermalReceiptModal';
import { BluetoothPrinterPill } from '@/components/cashier/BluetoothPrinterPill';
import { printThermalReceipt, ThermalPrintOrder } from '@/lib/thermal-printer';
import { formatOrderCardModifiers } from '@/lib/receipt-modifiers';
import { useToast } from '@/components/ui/Toast';
import { motion, AnimatePresence } from 'framer-motion';
import { getAlarmSoundUrl } from '@/lib/alarm-utils';

interface OrderItem {
  id: string;
  qty: number;
  price: number;
  modifiers?: string | null;
  product: { name: string; price?: number; image: string | null };
}

interface OrderData {
  id: string;
  customerName: string;
  customerPhone: string;
  orderType: string;
  tableNumber?: string | null;
  address?: string;
  paymentMethod: string;
  total: number;
  subtotal?: number;
  deliveryFee?: number;
  status: string;
  cancelReason?: string | null;
  createdAt: string;
  items: OrderItem[];
  paymentProofUrl?: string | null;
  pickupDate?: string | null;
  pickupTime?: string | null;
  queueNumber?: string | null;
  voucherCode?: string | null;
  voucherTitle?: string | null;
  hasTumbler?: boolean;
  source?: string | null;
  notes?: string | null;
}

interface Props {
  initialOrders: OrderData[];
  storeLat: number;
  storeLng: number;
  initialPickupAlarmLeadTime: number;
  initialAlarmSoundUrl?: string;
}

const ORDER_TYPE_LABELS: Record<string, string> = {
  DELIVERY: 'Delivery (Kurir)',
  PICKUP: 'Pickup (Ambil Sendiri)',
  DINE_IN: 'Dine In (Meja)',
};

const ORDER_TYPE_ICONS: Record<string, React.ElementType> = {
  DELIVERY: Truck,
  PICKUP: ShoppingBag,
  DINE_IN: UtensilsCrossed,
};

type TabType = 'antrian' | 'selesai';

const formatWhatsAppNumber = (phone: string) => {
  let cleaned = phone.replace(/[^0-9]/g, '');
  if (cleaned.startsWith('08')) {
    cleaned = '62' + cleaned.substring(1);
  } else if (cleaned.startsWith('8')) {
    cleaned = '62' + cleaned;
  }
  return cleaned;
};

const getWhatsAppTemplate = (order: OrderData) => {
  const orderIdShort = order.id.slice(0, 8).toUpperCase();
  const itemsText = order.items
    .map((item) => `- ${item.qty}x ${item.product.name} (${formatRupiah(item.price * item.qty)})`)
    .join('\n');
  const totalAmount = formatRupiah(order.total);
    
  return `Halo ${order.customerName},

Kami dari *Arum Seduh* ingin mengonfirmasi pesanan Anda:

*ID Pesanan:* #${orderIdShort}
*Status:* ${order.status}
*Metode Pembayaran:* ${order.paymentMethod}
*Tipe Pesanan:* ${order.orderType === 'PICKUP' ? 'Ambil Sendiri (Pickup)' : order.orderType === 'DINE_IN' ? `Dine In (${order.tableNumber || 'Meja'})` : 'Pengiriman (Delivery)'}

*Rincian Pesanan:*
${itemsText}

*Total:* ${totalAmount}

Jika ada pertanyaan atau pesanan Anda sudah siap, staf kami akan segera melayani. Terima kasih!`;
};

const shouldTriggerAlarm = (order: OrderData, leadTimeMin: number) => {
  if (order.status !== 'PENDING' && order.status !== 'PENDING_PAYMENT') {
    return false;
  }
  if (order.orderType !== 'PICKUP') {
    return true;
  }
  if (!order.pickupDate || !order.pickupTime) {
    return true;
  }
  try {
    const scheduledDate = new Date(order.pickupDate);
    const [hours, minutes] = order.pickupTime.split(':').map(Number);
    scheduledDate.setHours(hours, minutes, 0, 0);
    const timeDiffMinutes = (scheduledDate.getTime() - Date.now()) / (1000 * 60);
    return timeDiffMinutes <= leadTimeMin;
  } catch {
    return true;
  }
};

export default function CashierOrdersClient({ initialOrders, storeLat, storeLng, initialPickupAlarmLeadTime, initialAlarmSoundUrl = '' }: Props) {
  const router = useRouter();
  const { showToast } = useToast();

  const [orders, setOrders] = useState<OrderData[]>(initialOrders);
  const [activeTab, setActiveTab] = useState<TabType>('antrian');
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [sourceFilter, setSourceFilter] = useState('ALL');
  const [tableFilter, setTableFilter] = useState('ALL');
  const [pickupAlarmLeadTime, setPickupAlarmLeadTime] = useState(initialPickupAlarmLeadTime);
  const [alarmSoundUrl, setAlarmSoundUrl] = useState(initialAlarmSoundUrl);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isUpdating, setIsUpdating] = useState<string | null>(null);

  // Read orders & Continuous Audio Alarm
  const [readOrderIds, setReadOrderIds] = useState<string[]>([]);
  const [isAudioBlocked, setIsAudioBlocked] = useState(false);
  const [isAudioMuted, setIsAudioMuted] = useState(false);
  const alarmAudioRef = useRef<HTMLAudioElement | null>(null);

  // Modals
  const [selectedOrder, setSelectedOrder] = useState<OrderData | null>(null);
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [cancelOrderId, setCancelOrderId] = useState<string | null>(null);
  const [cancelReason, setCancelReason] = useState('Bukti Pembayaran Palsu / Dibatalkan Pelanggan');
  const [customReason, setCustomReason] = useState('');
  const [isCourierModalOpen, setIsCourierModalOpen] = useState(false);
  const [selectedOrderIdForCourier, setSelectedOrderIdForCourier] = useState<string | null>(null);
  const [showMinimap, setShowMinimap] = useState(false);
  const [selectedReceiptOrder, setSelectedReceiptOrder] = useState<ReceiptData | null>(null);
  const [showReceiptModal, setShowReceiptModal] = useState(false);

  // Auto-Print Receipt Settings & Ref
  const [receiptSettings, setReceiptSettings] = useState<any>(null);
  const autoPrintedOrderIdsRef = useRef<Set<string>>(new Set());

  // Load receipt settings on mount
  useEffect(() => {
    fetch('/api/admin/receipt-settings')
      .then((res) => res.json())
      .then((data) => {
        if (data && !data.error) setReceiptSettings(data);
      })
      .catch(() => {});
  }, []);

  // Initialize auto-printed orders with initialOrders on mount so historical orders don't re-print
  useEffect(() => {
    if (initialOrders && initialOrders.length > 0) {
      initialOrders.forEach((o) => autoPrintedOrderIdsRef.current.add(o.id));
    }
  }, [initialOrders]);

  const handleOpenReceipt = (order: OrderData) => {
    const rawSubtotal = order.subtotal || order.total;
    const computedDiscount = Math.max(0, rawSubtotal + (order.deliveryFee || 0) - order.total);

    const receiptData: ReceiptData = {
      id: order.id,
      orderNumber: order.queueNumber ? `A-${order.queueNumber}` : undefined,
      queueNumber: order.queueNumber,
      customerName: order.customerName,
      customerPhone: order.customerPhone,
      orderType: order.orderType,
      tableNumber: order.tableNumber,
      paymentMethod: order.paymentMethod,
      createdAt: order.createdAt,
      items: order.items.map((item) => {
        const origPrice = item.product.price && item.product.price > item.price ? item.product.price : undefined;
        const pDiscount = origPrice ? (origPrice - item.price) : undefined;
        return {
          name: item.product.name,
          qty: item.qty,
          price: item.price,
          originalPrice: origPrice,
          promoDiscount: pDiscount,
          modifiersString: item.modifiers || undefined,
        };
      }),
      subtotal: rawSubtotal,
      deliveryFee: order.deliveryFee || 0,
      voucherDiscount: computedDiscount,
      voucherCode: order.voucherCode || undefined,
      voucherTitle: order.voucherTitle || undefined,
      hasTumbler: order.hasTumbler || false,
      total: order.total,
      notes: order.notes || undefined,
    };
    setSelectedReceiptOrder(receiptData);
    setShowReceiptModal(true);
  };

  // Load read order IDs on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('cashier_read_orders');
      if (saved) {
        try {
          setReadOrderIds(JSON.parse(saved));
        } catch {}
      }
    }
  }, []);

  // Mark selected order as read
  const markOrderAsRead = (orderId: string) => {
    setReadOrderIds((prev) => {
      if (prev.includes(orderId)) return prev;
      const next = [...prev, orderId];
      if (typeof window !== 'undefined') {
        localStorage.setItem('cashier_read_orders', JSON.stringify(next));
      }
      return next;
    });
  };

  useEffect(() => {
    if (selectedOrder) {
      markOrderAsRead(selectedOrder.id);
    }
  }, [selectedOrder]);

  // Split active vs done orders
  const ACTIVE_STATUSES = ['PENDING', 'PENDING_PAYMENT', 'PREPARING', 'READY', 'ASSIGNED', 'ON_DELIVERY'];
  const DONE_STATUSES = ['COMPLETED', 'DELIVERED', 'CANCELLED'];

  const antrianOrders = useMemo(() => {
    return orders.filter(o => ACTIVE_STATUSES.includes(o.status));
  }, [orders]);

  const selesaiOrders = useMemo(() => {
    return orders.filter(o => DONE_STATUSES.includes(o.status));
  }, [orders]);

  // Distinct unread pending orders
  const unreadPendingOrders = useMemo(() => {
    return antrianOrders.filter(o => shouldTriggerAlarm(o, pickupAlarmLeadTime) && !readOrderIds.includes(o.id));
  }, [antrianOrders, pickupAlarmLeadTime, readOrderIds]);

  const hasUnreadOrders = unreadPendingOrders.length > 0;

  // Continuous Audio Alarm playback (Dynamic / Custom or Mixkit default ring)
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const soundUrl = getAlarmSoundUrl(alarmSoundUrl);

    if (hasUnreadOrders && !isAudioMuted) {
      if (!alarmAudioRef.current) {
        const audio = new Audio(soundUrl);
        audio.loop = true;
        alarmAudioRef.current = audio;
      } else if (alarmAudioRef.current.src !== soundUrl) {
        alarmAudioRef.current.src = soundUrl;
      }

      alarmAudioRef.current.play()
        .then(() => setIsAudioBlocked(false))
        .catch((err) => {
          console.warn('Continuous alarm playback blocked by browser user-interaction policy:', err);
          setIsAudioBlocked(true);
        });
    } else {
      if (alarmAudioRef.current) {
        alarmAudioRef.current.pause();
        alarmAudioRef.current.currentTime = 0;
      }
    }

    return () => {
      if (alarmAudioRef.current) {
        alarmAudioRef.current.pause();
      }
    };
  }, [hasUnreadOrders, isAudioMuted, alarmSoundUrl]);

  // Unmute / enable audio user gesture
  const handleEnableAudio = () => {
    const soundUrl = getAlarmSoundUrl(alarmSoundUrl);
    if (!alarmAudioRef.current) {
      const audio = new Audio(soundUrl);
      audio.loop = true;
      alarmAudioRef.current = audio;
    } else if (alarmAudioRef.current.src !== soundUrl) {
      alarmAudioRef.current.src = soundUrl;
    }
    alarmAudioRef.current.play()
      .then(() => {
        setIsAudioBlocked(false);
        showToast('Suara alarm diaktifkan', 'success');
      })
      .catch(() => showToast('Gagal memutar audio di peramban ini', 'error'));
  };

  const handleDismissAllAlarms = () => {
    const allPendingIds = antrianOrders.map(o => o.id);
    setReadOrderIds(allPendingIds);
    if (typeof window !== 'undefined') {
      localStorage.setItem('cashier_read_orders', JSON.stringify(allPendingIds));
    }
    if (alarmAudioRef.current) {
      alarmAudioRef.current.pause();
      alarmAudioRef.current.currentTime = 0;
    }
    showToast('Alarm pesanan telah dimatikan', 'info');
  };

  // Realtime Polling (Every 4 seconds) with Auto-Print Trigger
  const fetchOrders = useCallback(async () => {
    try {
      const res = await fetch(`/api/cashier/orders?format=json&t=${Date.now()}`, {
        cache: 'no-store',
        headers: { 'Pragma': 'no-cache', 'Cache-Control': 'no-cache' }
      });
      if (res.ok) {
        const data = await res.json();
        if (data.alarmSoundUrl !== undefined) {
          setAlarmSoundUrl(data.alarmSoundUrl || '');
        }
        if (data.orders) {
          const incomingOrders: OrderData[] = data.orders;
          setOrders(incomingOrders);

          // Check for newly arrived orders to auto-print
          if (receiptSettings?.autoPrintIncomingOrders) {
            incomingOrders.forEach((ord) => {
              const isEligible = ['PENDING', 'PENDING_PAYMENT', 'PREPARING'].includes(ord.status);
              if (isEligible && !autoPrintedOrderIdsRef.current.has(ord.id)) {
                autoPrintedOrderIdsRef.current.add(ord.id);

                const rawSubtotal = ord.subtotal || ord.total;
                const computedDiscount = Math.max(0, rawSubtotal + (ord.deliveryFee || 0) - ord.total);

                const thermalOrder: ThermalPrintOrder = {
                  id: ord.id,
                  orderNumber: ord.queueNumber ? `A-${ord.queueNumber}` : undefined,
                  queueNumber: ord.queueNumber,
                  customerName: ord.customerName,
                  customerPhone: ord.customerPhone,
                  orderType: ord.orderType,
                  tableNumber: ord.tableNumber,
                  paymentMethod: ord.paymentMethod,
                  createdAt: ord.createdAt,
                  items: ord.items.map((item) => {
                    const origPrice = item.product.price && item.product.price > item.price ? item.product.price : undefined;
                    const pDiscount = origPrice ? (origPrice - item.price) : undefined;
                    return {
                      name: item.product.name,
                      qty: item.qty,
                      price: item.price,
                      originalPrice: origPrice,
                      promoDiscount: pDiscount,
                      modifiersString: item.modifiers || undefined,
                    };
                  }),
                  subtotal: rawSubtotal,
                  deliveryFee: ord.deliveryFee || 0,
                  voucherDiscount: computedDiscount,
                  voucherCode: ord.voucherCode || undefined,
                  voucherTitle: ord.voucherTitle || undefined,
                  hasTumbler: ord.hasTumbler || false,
                  total: ord.total,
                  notes: ord.notes || undefined,
                };

                // Trigger auto-print to thermal printer
                printThermalReceipt(
                  thermalOrder,
                  receiptSettings,
                  receiptSettings.printKitchenTicket
                );

                showToast(`⚡ Pesanan baru #${ord.id.slice(0, 8).toUpperCase()} otomatis dicetak ke Algoo!`, 'success');
              }
            });
          }
        }
        if (data.pickupAlarmLeadTime !== undefined) setPickupAlarmLeadTime(data.pickupAlarmLeadTime);
      }
    } catch (err) {
      console.error('Error fetching cashier orders:', err);
    }
  }, [receiptSettings, showToast]);

  useEffect(() => {
    const interval = setInterval(fetchOrders, 4000);
    return () => clearInterval(interval);
  }, [fetchOrders]);

  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    await fetchOrders();
    setIsRefreshing(false);
    showToast('Daftar pesanan diperbarui', 'info');
  };

  // Update order status
  const handleUpdateStatus = async (orderId: string, nextStatus: string) => {
    setIsUpdating(orderId);
    markOrderAsRead(orderId);
    try {
      const res = await fetch(`/api/cashier/orders/${orderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus })
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Gagal mengubah status pesanan');
      }

      showToast(`Status pesanan diubah ke ${nextStatus}`, 'success');
      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: nextStatus } : o));
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setIsUpdating(null);
    }
  };

  // Handle Order Cancellation
  const handleConfirmCancel = async () => {
    if (!cancelOrderId) return;
    setIsUpdating(cancelOrderId);
    try {
      const finalReason = cancelReason === 'Lainnya' ? customReason : cancelReason;
      const res = await fetch(`/api/orders/${cancelOrderId}/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: finalReason || 'Dibatalkan oleh kasir' })
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Gagal membatalkan pesanan');
      }

      showToast('Pesanan berhasil dibatalkan', 'success');
      setOrders(prev => prev.map(o => o.id === cancelOrderId ? { ...o, status: 'CANCELLED', cancelReason: finalReason } : o));
      setIsCancelModalOpen(false);
      setCancelOrderId(null);
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setIsUpdating(null);
    }
  };

  // Filtered orders computation
  const uniqueTableNumbers = useMemo(() => {
    const numbers = new Set<string>();
    orders.forEach((o) => {
      if (o.tableNumber) numbers.add(o.tableNumber);
    });
    return Array.from(numbers).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  }, [orders]);

  const filteredOrders = useMemo(() => {
    const baseList = activeTab === 'antrian' ? antrianOrders : selesaiOrders;

    return baseList.filter((order) => {
      // Type filter
      if (typeFilter !== 'ALL' && order.orderType !== typeFilter) return false;

      // Source filter
      if (sourceFilter !== 'ALL' && (order.source || 'POS') !== sourceFilter) return false;

      // Table filter
      if (tableFilter !== 'ALL' && order.tableNumber !== tableFilter) return false;

      // Search query
      if (search.trim()) {
        const q = search.toLowerCase();
        const matchesId = order.id.toLowerCase().includes(q);
        const matchesName = order.customerName.toLowerCase().includes(q);
        const matchesPhone = order.customerPhone.toLowerCase().includes(q);
        const matchesTable = order.tableNumber?.toLowerCase().includes(q);
        const matchesQueue = order.queueNumber?.toLowerCase().includes(q);
        if (!matchesId && !matchesName && !matchesPhone && !matchesTable && !matchesQueue) {
          return false;
        }
      }

      return true;
    });
  }, [activeTab, antrianOrders, selesaiOrders, typeFilter, sourceFilter, tableFilter, search]);

  // Metrics
  const totalAntreanCount = antrianOrders.length;
  const preparingCount = antrianOrders.filter(o => o.status === 'PREPARING').length;
  const readyCount = antrianOrders.filter(o => o.status === 'READY').length;
  const selesaiTodayCount = selesaiOrders.filter(o => o.status === 'COMPLETED' || o.status === 'DELIVERED').length;

  const formatElapsed = (createdAtStr: string) => {
    const elapsedSecs = Math.floor((Date.now() - new Date(createdAtStr).getTime()) / 1000);
    const mins = Math.floor(elapsedSecs / 60);
    if (mins < 1) return 'Baru saja';
    if (mins < 60) return `${mins} mnt lalu`;
    const hours = Math.floor(mins / 60);
    return `${hours} jam ${mins % 60} mnt`;
  };

  return (
    <div className="min-h-screen bg-[#FAF9F6] text-[#1C1917] p-4 sm:p-6 lg:p-8 space-y-6 font-sans">
      
      {/* Top Header & Metrics Dashboard */}
      <div className="bg-white rounded-3xl p-6 border border-stone-200 shadow-sm space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-orange-50 text-orange-700 border border-orange-200 text-[11px] font-bold tracking-wide">
              <ChefHat className="w-3.5 h-3.5 text-orange-600" />
              <span>Arum Seduh Live Kitchen & POS</span>
            </div>
            <h1 className="font-serif text-2xl sm:text-3xl font-bold tracking-tight text-stone-900">
              Pesanan Hari Ini
            </h1>
            <p className="text-xs text-stone-500">
              Pantau antrean pesanan masuk, status hidangan meja, dan proses transaksi secara langsung
            </p>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            {/* Bluetooth Thermal Printer Pill */}
            <BluetoothPrinterPill />

            {/* Audio Alarm Toggle */}
            <button
              type="button"
              onClick={() => setIsAudioMuted(!isAudioMuted)}
              className={`px-3.5 py-2.5 rounded-2xl text-xs font-bold border flex items-center gap-2 transition-all cursor-pointer ${
                !isAudioMuted
                  ? 'bg-orange-50 text-orange-800 border-orange-200 shadow-sm'
                  : 'bg-stone-50 text-stone-400 border-stone-200'
              }`}
              title="Toggle Suara Alarm"
            >
              {!isAudioMuted ? <Volume2 className="w-4 h-4 text-orange-600" /> : <VolumeX className="w-4 h-4 text-stone-400" />}
              <span>{!isAudioMuted ? 'Alarm Aktif' : 'Alarm Mute'}</span>
            </button>

            {/* Denah Meja Toggle */}
            <button
              type="button"
              onClick={() => setShowMinimap(!showMinimap)}
              className={`px-3.5 py-2.5 rounded-2xl text-xs font-bold border flex items-center gap-2 transition-all cursor-pointer ${
                showMinimap
                  ? 'bg-orange-500 text-white border-orange-500 shadow-md shadow-orange-500/20'
                  : 'bg-white text-stone-700 border-stone-200 hover:bg-stone-50'
              }`}
              title="Tampilkan Denah Meja 2D Live"
            >
              <UtensilsCrossed className="w-4 h-4" />
              <span>{showMinimap ? 'Tutup Denah Meja' : 'Denah Meja (Minimap)'}</span>
            </button>

            {/* Refresh */}
            <button
              type="button"
              onClick={handleManualRefresh}
              disabled={isRefreshing}
              className="px-4 py-2.5 rounded-2xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-md shadow-orange-500/20 disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
              <span>Segarkan</span>
            </button>
          </div>
        </div>

        {/* Live Metrics Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5 pt-2 border-t border-stone-100">
          <div className="bg-stone-50/70 p-4 rounded-2xl border border-stone-200">
            <p className="text-[10px] font-bold uppercase tracking-wider text-stone-400">Antrean Aktif</p>
            <p className="font-serif text-2xl font-bold text-stone-900 mt-1">{totalAntreanCount}</p>
          </div>
          <div className="bg-amber-50/60 p-4 rounded-2xl border border-amber-200">
            <p className="text-[10px] font-bold uppercase tracking-wider text-amber-700">Sedang Dimasak</p>
            <p className="font-serif text-2xl font-bold text-amber-900 mt-1">{preparingCount}</p>
          </div>
          <div className="bg-blue-50/60 p-4 rounded-2xl border border-blue-200">
            <p className="text-[10px] font-bold uppercase tracking-wider text-blue-700">Siap Saji</p>
            <p className="font-serif text-2xl font-bold text-blue-900 mt-1">{readyCount}</p>
          </div>
          <div className="bg-emerald-50/60 p-4 rounded-2xl border border-emerald-200">
            <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-700">Selesai Hari Ini</p>
            <p className="font-serif text-2xl font-bold text-emerald-900 mt-1">{selesaiTodayCount}</p>
          </div>
        </div>
      </div>

      {/* Flashing Continuous Alarm Banner */}
      <AnimatePresence>
        {hasUnreadOrders && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="p-5 rounded-3xl bg-gradient-to-r from-orange-600 via-amber-600 to-orange-500 text-white shadow-xl shadow-orange-500/25 flex flex-col md:flex-row items-center justify-between gap-4 border-2 border-white/20 animate-pulse"
          >
            <div className="flex items-center gap-3.5 text-left">
              <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center text-white shrink-0 border border-white/30">
                <Bell className="w-6 h-6 animate-bounce" />
              </div>
              <div>
                <h3 className="font-serif font-bold text-lg leading-tight">
                  Ada {unreadPendingOrders.length} Pesanan Baru Masuk!
                </h3>
                <p className="text-xs text-white/90 mt-0.5">
                  Alarm akan terus berbunyi hingga Anda membuka detail pesanan atau mematikan alarm.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2.5 shrink-0 w-full md:w-auto">
              {isAudioBlocked && (
                <button
                  onClick={handleEnableAudio}
                  className="px-4 py-2.5 rounded-2xl bg-white text-orange-700 font-bold text-xs hover:bg-orange-50 shadow transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <Volume2 className="w-4 h-4" /> Buka Kunci Audio
                </button>
              )}
              <button
                onClick={handleDismissAllAlarms}
                className="flex-1 md:flex-none px-5 py-2.5 rounded-2xl bg-stone-900/80 hover:bg-stone-900 text-white font-bold text-xs transition-all flex items-center justify-center gap-2 cursor-pointer shadow"
              >
                <Check className="w-4 h-4" />
                <span>Matikan Alarm</span>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Tabs, Search, & Filters Bar */}
      <div className="bg-white rounded-3xl p-4 sm:p-5 border border-stone-200 shadow-sm space-y-4">
        
        {/* Row 1: Antrean vs Selesai Tabs & Search */}
        <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
          <div className="flex gap-2 p-1 bg-stone-100 rounded-2xl shrink-0">
            <button
              onClick={() => setActiveTab('antrian')}
              className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                activeTab === 'antrian'
                  ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-md shadow-orange-500/20'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              <span>Antrean Aktif</span>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                activeTab === 'antrian' ? 'bg-white text-orange-700' : 'bg-stone-200 text-stone-700'
              }`}>
                {totalAntreanCount}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('selesai')}
              className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                activeTab === 'selesai'
                  ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-md shadow-orange-500/20'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              <span>Riwayat Selesai</span>
              <span className="px-2 py-0.5 rounded-full bg-stone-200 text-stone-700 text-[10px] font-black">
                {selesaiOrders.length}
              </span>
            </button>
          </div>

          {/* Search Box */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Cari ID pesanan, nama pemesan, meja, antrean..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-stone-50 border border-stone-200 text-xs font-medium focus:outline-none focus:border-orange-500 focus:ring-4 focus:ring-orange-500/10 transition-all"
            />
          </div>
        </div>

        {/* Row 2: Channel Pills & Table Selector Filter */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-stone-100">
          {/* Channel Filters */}
          <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
            {[
              { key: 'ALL', label: 'Semua Kanal' },
              { key: 'SPMB', label: 'SPMB Meja' },
              { key: 'POS', label: 'Kasir POS' },
              { key: 'APP', label: 'Aplikasi' },
              { key: 'WHATSAPP', label: 'WhatsApp' },
            ].map((ch) => (
              <button
                key={ch.key}
                onClick={() => setSourceFilter(ch.key)}
                className={`px-3 py-1.5 rounded-xl text-[11px] font-bold whitespace-nowrap transition-all border cursor-pointer ${
                  sourceFilter === ch.key
                    ? 'bg-orange-50 border-orange-300 text-orange-700 shadow-sm'
                    : 'bg-white border-stone-200 text-stone-600 hover:border-stone-400'
                }`}
              >
                {ch.label}
              </button>
            ))}
          </div>

          {/* Dropdown Filters */}
          <div className="flex items-center gap-2">
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="px-3 py-2 rounded-xl bg-stone-50 border border-stone-200 text-xs font-bold text-stone-700 focus:outline-none focus:border-orange-500 cursor-pointer"
            >
              <option value="ALL">Semua Tipe</option>
              <option value="DINE_IN">Dine In (Meja)</option>
              <option value="PICKUP">Pickup (Ambil)</option>
              <option value="DELIVERY">Delivery (Kurir)</option>
            </select>

            {uniqueTableNumbers.length > 0 && (
              <select
                value={tableFilter}
                onChange={(e) => setTableFilter(e.target.value)}
                className="px-3 py-2 rounded-xl bg-stone-50 border border-stone-200 text-xs font-bold text-stone-700 focus:outline-none focus:border-orange-500 cursor-pointer"
              >
                <option value="ALL">Semua Meja</option>
                {uniqueTableNumbers.map((tbl) => (
                  <option key={tbl} value={tbl}>Meja {tbl}</option>
                ))}
              </select>
            )}
          </div>
        </div>
      </div>

      {/* Orders Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {filteredOrders.map((order) => {
          const isUnread = shouldTriggerAlarm(order, pickupAlarmLeadTime) && !readOrderIds.includes(order.id);
          const TypeIcon = ORDER_TYPE_ICONS[order.orderType] || Coffee;
          const isPending = order.status === 'PENDING' || order.status === 'PENDING_PAYMENT';
          const isPreparing = order.status === 'PREPARING';
          const isReady = order.status === 'READY';
          const isCompleted = order.status === 'COMPLETED' || order.status === 'DELIVERED';
          const isCancelled = order.status === 'CANCELLED';

          const elapsedSecs = Math.floor((Date.now() - new Date(order.createdAt).getTime()) / 1000);
          const isLate = elapsedSecs > 20 * 60 && !isCompleted && !isCancelled;

          return (
            <motion.div
              key={order.id}
              layout
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              onClick={() => markOrderAsRead(order.id)}
              className={`bg-white rounded-3xl border overflow-hidden shadow-sm flex flex-col justify-between transition-all text-left ${
                isUnread
                  ? 'ring-4 ring-orange-500/30 border-orange-500 shadow-lg'
                  : isLate
                  ? 'border-rose-400 ring-2 ring-rose-300/40'
                  : 'border-stone-200 hover:border-orange-300'
              }`}
            >
              {/* Card Header */}
              <div className="p-4 bg-[#FAF9F6] border-b border-stone-100 flex items-start justify-between gap-2">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    {order.queueNumber ? (
                      <span className="font-mono font-black text-sm px-2.5 py-0.5 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-sm">
                        {order.queueNumber}
                      </span>
                    ) : (
                      <span className="font-mono font-bold text-xs text-stone-500 bg-white border border-stone-200 px-2 py-0.5 rounded-lg">
                        #{order.id.slice(0, 8).toUpperCase()}
                      </span>
                    )}

                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-white border border-stone-200 text-stone-700 text-[10px] font-bold">
                      <TypeIcon className="w-3 h-3 text-orange-600" />
                      {ORDER_TYPE_LABELS[order.orderType] || order.orderType}
                    </span>

                    {order.source && (
                      <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-stone-200/70 text-stone-600">
                        {order.source}
                      </span>
                    )}
                  </div>

                  <h3 className="font-serif font-bold text-base text-stone-900 leading-tight">
                    {order.customerName}
                  </h3>

                  {order.tableNumber && (
                    <p className="text-xs font-bold text-orange-700 flex items-center gap-1">
                      <UtensilsCrossed className="w-3 h-3" /> {order.tableNumber}
                    </p>
                  )}
                </div>

                <div className="text-right space-y-1">
                  <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                    isLate ? 'bg-rose-100 text-rose-800 animate-pulse font-black' : 'bg-stone-200 text-stone-700'
                  }`}>
                    <Clock className="w-2.5 h-2.5" />
                    {formatElapsed(order.createdAt)}
                  </span>
                  <p className="text-[10px] font-bold text-stone-400">
                    {order.paymentMethod}
                  </p>
                </div>
              </div>

              {/* Items List */}
              <div className="p-4 space-y-2 flex-1">
                <div className="space-y-1.5">
                  {order.items.map((item) => {
                    const { tags, promoText } = formatOrderCardModifiers(item.modifiers, item.product.name);
                    return (
                      <div key={item.id} className="p-2.5 rounded-2xl border border-stone-100 bg-stone-50/50 flex items-start justify-between gap-3 text-xs">
                        <div>
                          <p className="font-bold text-stone-900 leading-tight">
                            <span className="text-orange-600 font-black mr-1">{item.qty}x</span>
                            {item.product.name}
                          </p>
                          {(tags.length > 0 || promoText) && (
                            <div className="mt-1 space-y-0.5">
                              {tags.length > 0 && (
                                <p className="text-[10px] text-stone-500 leading-snug">
                                  {tags.join(' • ')}
                                </p>
                              )}
                              {promoText && (
                                <span className="inline-flex items-center gap-1 text-[9.5px] font-bold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200/60">
                                  <Sparkles className="w-2.5 h-2.5 text-amber-600 shrink-0" />
                                  {promoText}
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                        <span className="font-bold text-stone-700 shrink-0">
                          {formatRupiah(item.price * item.qty)}
                        </span>
                      </div>
                    );
                  })}
                </div>

                {order.notes && (
                  <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-[11px] font-medium mt-2">
                    <span className="font-bold">Catatan:</span> {order.notes}
                  </div>
                )}
              </div>

              {/* Card Footer & Stepper */}
              <div className="p-4 bg-[#FAF9F6] border-t border-stone-100 space-y-3">
                <div className="flex items-center justify-between text-xs font-bold">
                  <span className="text-stone-500">Total Tagihan</span>
                  <span className="text-base font-serif font-black text-orange-600">
                    {formatRupiah(order.total)}
                  </span>
                </div>

                {/* 1-Tap Quick Action Stepper */}
                {!isCompleted && !isCancelled && (
                  <div className="grid grid-cols-3 gap-1.5">
                    <button
                      onClick={() => handleUpdateStatus(order.id, 'PREPARING')}
                      disabled={isUpdating === order.id}
                      className={`py-2 rounded-xl text-[11px] font-bold transition-all cursor-pointer ${
                        isPending
                          ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-sm'
                          : 'bg-white border border-stone-200 text-stone-600 hover:bg-stone-100'
                      }`}
                    >
                      Masak
                    </button>

                    <button
                      onClick={() => handleUpdateStatus(order.id, 'READY')}
                      disabled={isUpdating === order.id}
                      className={`py-2 rounded-xl text-[11px] font-bold transition-all cursor-pointer ${
                        isPreparing
                          ? 'bg-blue-600 text-white shadow-sm'
                          : 'bg-white border border-stone-200 text-stone-600 hover:bg-stone-100'
                      }`}
                    >
                      Siap Saji
                    </button>

                    <button
                      onClick={() => handleUpdateStatus(order.id, 'COMPLETED')}
                      disabled={isUpdating === order.id}
                      className={`py-2 rounded-xl text-[11px] font-bold transition-all cursor-pointer ${
                        isReady
                          ? 'bg-emerald-600 text-white shadow-sm'
                          : 'bg-white border border-stone-200 text-stone-600 hover:bg-stone-100'
                      }`}
                    >
                      Selesai
                    </button>
                  </div>
                )}

                {/* Completed / Cancelled Status Indicator */}
                {(isCompleted || isCancelled) && (
                  <div className={`w-full py-2 rounded-xl text-center text-xs font-bold ${
                    isCompleted ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-rose-50 text-rose-800 border border-rose-200'
                  }`}>
                    {isCompleted ? 'Pesanan Selesai' : 'Pesanan Dibatalkan'}
                  </div>
                )}

                {/* Secondary Action Toolbar: Details, Print, WhatsApp, Cancel */}
                <div className="flex items-center gap-1.5 pt-1">
                  <button
                    onClick={() => setSelectedOrder(order)}
                    className="flex-1 py-2 px-3 rounded-xl border border-stone-200 bg-white hover:bg-stone-100 text-stone-700 text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                  >
                    <Eye className="w-3.5 h-3.5" /> Rincian
                  </button>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleOpenReceipt(order);
                    }}
                    className="p-2 rounded-xl border border-stone-200 bg-white hover:bg-orange-50 hover:border-orange-300 text-orange-600 transition-all cursor-pointer"
                    title="Cetak Struk Thermal (58mm)"
                  >
                    <Printer className="w-4 h-4" />
                  </button>

                  {order.customerPhone && order.customerPhone !== '-' && (
                    <a
                      href={`https://wa.me/${formatWhatsAppNumber(order.customerPhone)}?text=${encodeURIComponent(getWhatsAppTemplate(order))}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 rounded-xl border border-stone-200 bg-white hover:bg-emerald-50 hover:border-emerald-300 text-emerald-700 transition-all"
                      title="Kirim Pesan WhatsApp"
                    >
                      <MessageCircle className="w-4 h-4" />
                    </a>
                  )}

                  {!isCompleted && !isCancelled && (
                    <button
                      onClick={() => {
                        setCancelOrderId(order.id);
                        setIsCancelModalOpen(true);
                      }}
                      className="p-2 rounded-xl border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 transition-all cursor-pointer"
                      title="Batalkan Pesanan"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          );
        })}

        {filteredOrders.length === 0 && (
          <div className="col-span-full py-16 text-center text-stone-400 bg-white rounded-3xl border border-stone-200 p-8">
            <UtensilsCrossed className="w-12 h-12 mx-auto mb-2 text-stone-300" />
            <p className="font-serif font-bold text-base text-stone-700">Tidak ada pesanan ditemukan</p>
            <p className="text-xs text-stone-400 mt-1">Semua pesanan sesuai filter saat ini sudah selesai atau kosong.</p>
          </div>
        )}
      </div>

      {/* Detail Order Inspection Modal */}
      <AnimatePresence>
        {selectedOrder && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 backdrop-blur-sm cursor-pointer"
              onClick={() => setSelectedOrder(null)}
            />

            <motion.div
              initial={{ scale: 0.95, y: 10 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 10 }}
              className="bg-white rounded-3xl w-full max-w-lg p-6 shadow-2xl relative z-10 text-left border border-stone-200 space-y-4 max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between border-b border-stone-100 pb-3">
                <div>
                  <h3 className="font-serif font-bold text-lg text-stone-900 leading-tight">Detail Pesanan</h3>
                  <p className="text-xs text-stone-500 font-mono">#{selectedOrder.id.slice(0, 8).toUpperCase()}</p>
                </div>
                <button
                  onClick={() => setSelectedOrder(null)}
                  className="p-2 rounded-xl hover:bg-stone-100 text-stone-400 hover:text-stone-600 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-3">
                {/* Meta details */}
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="p-2.5 rounded-xl bg-stone-50 border border-stone-100">
                    <span className="text-stone-400 block text-[10px] uppercase font-bold">Pelanggan</span>
                    <span className="font-bold text-stone-800">{selectedOrder.customerName}</span>
                    <span className="text-stone-500 block text-[11px]">{selectedOrder.customerPhone}</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-stone-50 border border-stone-100">
                    <span className="text-stone-400 block text-[10px] uppercase font-bold">Tipe & Meja</span>
                    <span className="font-bold text-stone-800">{ORDER_TYPE_LABELS[selectedOrder.orderType] || selectedOrder.orderType}</span>
                    {selectedOrder.tableNumber && (
                      <span className="text-orange-700 block text-[11px] font-bold">Meja {selectedOrder.tableNumber}</span>
                    )}
                  </div>
                </div>

                {/* Items */}
                <div className="space-y-1.5">
                  <p className="text-xs font-bold text-stone-400 uppercase tracking-wider">Item Pesanan</p>
                  <div className="space-y-1">
                    {selectedOrder.items.map((item) => {
                      const { tags, promoText } = formatOrderCardModifiers(item.modifiers, item.product.name);
                      return (
                        <div key={item.id} className="p-2.5 rounded-xl border border-stone-100 bg-stone-50/50 flex justify-between items-center text-xs">
                          <div>
                            <span className="font-bold text-stone-900">{item.qty}x {item.product.name}</span>
                            {(tags.length > 0 || promoText) && (
                              <div className="mt-0.5 space-y-0.5">
                                {tags.length > 0 && (
                                  <p className="text-[10px] text-stone-500">{tags.join(' • ')}</p>
                                )}
                                {promoText && (
                                  <span className="inline-flex items-center gap-1 text-[9px] font-bold text-amber-700 bg-amber-50 px-1 py-0.5 rounded border border-amber-200/60">
                                    <Sparkles className="w-2 h-2 text-amber-600 shrink-0" />
                                    {promoText}
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                          <span className="font-bold text-stone-700">{formatRupiah(item.price * item.qty)}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Totals */}
                <div className="p-4 rounded-2xl bg-orange-50/50 border border-orange-200 space-y-1.5 text-xs font-bold">
                  <div className="flex justify-between text-stone-600">
                    <span>Subtotal</span>
                    <span>{formatRupiah(selectedOrder.subtotal || selectedOrder.total)}</span>
                  </div>
                  {selectedOrder.deliveryFee ? (
                    <div className="flex justify-between text-stone-600">
                      <span>Ongkir</span>
                      <span>{formatRupiah(selectedOrder.deliveryFee)}</span>
                    </div>
                  ) : null}
                  <div className="flex justify-between text-sm text-orange-700 pt-2 border-t border-orange-200 font-serif font-black">
                    <span>Total Tagihan</span>
                    <span>{formatRupiah(selectedOrder.total)}</span>
                  </div>
                </div>

                {/* Payment Proof */}
                {selectedOrder.paymentProofUrl && (
                  <div className="space-y-1.5">
                    <p className="text-xs font-bold text-stone-400 uppercase tracking-wider">Bukti Pembayaran</p>
                    <div className="relative w-full h-48 rounded-2xl overflow-hidden border border-stone-200">
                      <Image src={selectedOrder.paymentProofUrl} alt="Bukti Bayar" fill sizes="(max-width: 768px) 100vw, 450px" className="object-cover" />
                    </div>
                  </div>
                )}
              </div>

              {/* Modal Actions */}
              <div className="pt-3 border-t border-stone-100 flex gap-2">
                <button
                  onClick={() => setSelectedOrder(null)}
                  className="flex-1 py-3 rounded-xl border border-stone-200 font-bold text-xs text-stone-700 hover:bg-stone-50 cursor-pointer"
                >
                  Tutup
                </button>
                <button
                  onClick={() => {
                    handleOpenReceipt(selectedOrder);
                  }}
                  className="py-3 px-4 rounded-xl border border-orange-200 bg-orange-50 hover:bg-orange-100 text-orange-700 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  title="Cetak Struk (58mm)"
                >
                  <Printer className="w-4 h-4" /> Cetak Struk
                </button>
                {selectedOrder.customerPhone && selectedOrder.customerPhone !== '-' && (
                  <a
                    href={`https://wa.me/${formatWhatsAppNumber(selectedOrder.customerPhone)}?text=${encodeURIComponent(getWhatsAppTemplate(selectedOrder))}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 py-3 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-md shadow-orange-500/20"
                  >
                    <MessageCircle className="w-4 h-4" /> Buka WhatsApp
                  </a>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Cancel Modal */}
      <AnimatePresence>
        {isCancelModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 backdrop-blur-sm cursor-pointer"
              onClick={() => setIsCancelModalOpen(false)}
            />

            <motion.div
              initial={{ scale: 0.95, y: 10 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 10 }}
              className="bg-white rounded-3xl w-full max-w-sm p-6 shadow-2xl relative z-10 text-center border border-stone-200 space-y-4"
            >
              <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto shadow-inner">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <h3 className="font-serif font-bold text-lg text-stone-900">Batalkan Pesanan</h3>
              <p className="text-xs text-stone-500">Pilih alasan pembatalan pesanan ini:</p>

              <select
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-stone-200 bg-stone-50 text-xs font-bold text-stone-800"
              >
                <option value="QRIS Kedaluwarsa / Tidak Dibayar">QRIS Kedaluwarsa / Tidak Dibayar</option>
                <option value="Bukti Pembayaran Palsu / Dibatalkan Pelanggan">Bukti Pembayaran Palsu / Dibatalkan Pelanggan</option>
                <option value="Stok Habis">Stok Bahan Habis</option>
                <option value="Pelanggan Tidak Merespons">Pelanggan Tidak Merespons</option>
                <option value="Lainnya">Alasan Lainnya</option>
              </select>

              {cancelReason === 'Lainnya' && (
                <input
                  type="text"
                  placeholder="Tulis alasan pembatalan..."
                  value={customReason}
                  onChange={(e) => setCustomReason(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-stone-200 text-xs font-medium"
                />
              )}

              <div className="flex gap-2 pt-2">
                <button
                  onClick={() => setIsCancelModalOpen(false)}
                  className="flex-1 py-2.5 rounded-xl border border-stone-200 text-stone-600 font-bold text-xs hover:bg-stone-50"
                >
                  Kembali
                </button>
                <button
                  onClick={handleConfirmCancel}
                  className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-md"
                >
                  Ya, Batalkan
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Floating 2D Live Table Minimap Widget */}
      {!showMinimap && (
        <button
          type="button"
          onClick={() => setShowMinimap(true)}
          className="fixed bottom-6 right-6 z-40 px-4 py-3 rounded-full bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-bold text-xs shadow-2xl shadow-orange-500/40 flex items-center gap-2 border-2 border-white/40 transition-all hover:scale-105 active:scale-95 cursor-pointer animate-in fade-in slide-in-from-bottom-3"
          title="Buka Denah Meja Floating"
        >
          <UtensilsCrossed className="w-4 h-4" />
          <span>Denah Meja Live</span>
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-300 animate-ping" />
        </button>
      )}

      {showMinimap && (
        <LiveTableMinimap
          isFloating={true}
          isOpen={showMinimap}
          onClose={() => setShowMinimap(false)}
          onSelectTable={(num) => setTableFilter(num || 'ALL')}
          selectedTableNumber={tableFilter !== 'ALL' ? tableFilter : null}
          onRefreshOrders={fetchOrders}
        />
      )}

      {/* 58mm Thermal Receipt Modal (Algoo AT-5805) */}
      <ThermalReceiptModal
        isOpen={showReceiptModal}
        onClose={() => setShowReceiptModal(false)}
        order={selectedReceiptOrder}
      />
    </div>
  );
}
