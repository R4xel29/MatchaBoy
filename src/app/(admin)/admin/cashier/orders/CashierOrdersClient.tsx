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
  Sun,
  Moon,
  Lock,
  Unlock,
  UtensilsCrossed,
  ArrowRight,
  Flame
} from 'lucide-react';
import { CourierSelectModal } from '@/components/admin/CourierSelectModal';
import { useToast } from '@/components/ui/Toast';
import { motion, AnimatePresence } from 'framer-motion';

interface OrderItem {
  id: string;
  qty: number;
  price: number;
  modifiers?: string | null;
  product: { name: string; image: string | null };
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
  status: string;
  cancelReason?: string | null;
  createdAt: string;
  items: OrderItem[];
  paymentProofUrl?: string | null;
  pickupDate?: string | null;
  pickupTime?: string | null;
  queueNumber?: string | null;
  source?: string | null;
  notes?: string | null;
}

interface Props {
  initialOrders: OrderData[];
  storeLat: number;
  storeLng: number;
  initialPickupAlarmLeadTime: number;
}

const ORDER_TYPE_LABELS: Record<string, string> = {
  DELIVERY: 'Delivery',
  PICKUP: 'Pickup',
  DINE_IN: 'Dine In (Meja)',
};

const ORDER_TYPE_ICONS: Record<string, React.ElementType> = {
  DELIVERY: Truck,
  PICKUP: ShoppingBag,
  DINE_IN: UtensilsCrossed,
};

type TabType = 'antrian' | 'selesai';

export default function CashierOrdersClient({ initialOrders }: Props) {
  const router = useRouter();
  const { showToast } = useToast();

  const [orders, setOrders] = useState<OrderData[]>(initialOrders);
  const [activeTab, setActiveTab] = useState<TabType>('antrian');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState<string>('ALL');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>('ALL');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [loadingOrderId, setLoadingOrderId] = useState<string | null>(null);

  // Kitchen Display features merged
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [isWakeLockActive, setIsWakeLockActive] = useState(false);
  const [wakeLockSupported, setWakeLockSupported] = useState(false);
  const [checkedItems, setCheckedItems] = useState<Record<string, boolean>>({});

  // Courier Assignment Modal
  const [selectedOrderForCourier, setSelectedOrderForCourier] = useState<OrderData | null>(null);
  const [isCourierModalOpen, setIsCourierModalOpen] = useState(false);

  // Web Audio Context & Wake Lock refs
  const audioContextRef = useRef<AudioContext | null>(null);
  const wakeLockSentinelRef = useRef<any>(null);
  const knownOrderIdsRef = useRef<Set<string>>(new Set(initialOrders.map(o => o.id)));

  // Dual-tone kitchen chime sound
  const playKitchenBell = useCallback(() => {
    if (!isAudioEnabled) return;
    try {
      if (!audioContextRef.current) {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioCtx) {
          audioContextRef.current = new AudioCtx();
        }
      }

      const ctx = audioContextRef.current;
      if (!ctx) return;

      if (ctx.state === 'suspended') {
        ctx.resume();
      }

      const now = ctx.currentTime;
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(1046.5, now); // C6
      gain1.gain.setValueAtTime(0.8, now);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 1.0);
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.start(now);
      osc1.stop(now + 1.0);

      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = 'triangle';
      osc2.frequency.setValueAtTime(1318.51, now + 0.15); // E6
      gain2.gain.setValueAtTime(0.6, now + 0.15);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 1.2);
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.start(now + 0.15);
      osc2.stop(now + 1.2);
    } catch (e) {
      console.warn('Audio chime failed:', e);
    }
  }, [isAudioEnabled]);

  // Screen Wake Lock API
  useEffect(() => {
    if (typeof window !== 'undefined' && 'wakeLock' in navigator) {
      setWakeLockSupported(true);
    }
  }, []);

  const toggleWakeLock = async () => {
    if (!wakeLockSupported) return;
    try {
      if (!isWakeLockActive) {
        wakeLockSentinelRef.current = await (navigator as any).wakeLock.request('screen');
        setIsWakeLockActive(true);
        showToast('Layar akan tetap menyala', 'success');
      } else {
        if (wakeLockSentinelRef.current) {
          await wakeLockSentinelRef.current.release();
          wakeLockSentinelRef.current = null;
        }
        setIsWakeLockActive(false);
        showToast('Wake lock dinonaktifkan', 'info');
      }
    } catch (err) {
      console.error('Wake lock error:', err);
    }
  };

  // Poll orders every 4 seconds
  const fetchOrders = useCallback(async () => {
    try {
      const res = await fetch('/api/cashier/orders');
      if (res.ok) {
        const data = await res.json();
        const incoming = Array.isArray(data) ? data : data.orders || [];

        // Detect brand new pending orders
        const hasNewPending = incoming.some((o: OrderData) => 
          !knownOrderIdsRef.current.has(o.id) && 
          (o.status === 'PENDING' || o.status === 'PENDING_PAYMENT')
        );

        if (hasNewPending) {
          playKitchenBell();
          showToast('🔔 Pesanan baru masuk!', 'info');
        }

        incoming.forEach((o: OrderData) => knownOrderIdsRef.current.add(o.id));
        setOrders(incoming);
      }
    } catch (err) {
      console.error('Error polling cashier orders:', err);
    }
  }, [playKitchenBell, showToast]);

  useEffect(() => {
    const interval = setInterval(fetchOrders, 4000);
    return () => clearInterval(interval);
  }, [fetchOrders]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchOrders();
    setIsRefreshing(false);
  };

  // Update order status stepper
  const handleUpdateStatus = async (orderId: string, nextStatus: string) => {
    setLoadingOrderId(orderId);
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
      setLoadingOrderId(null);
    }
  };

  // Item checklist toggle
  const toggleItemCheck = (orderItemId: string) => {
    setCheckedItems(prev => ({
      ...prev,
      [orderItemId]: !prev[orderItemId]
    }));
  };

  // Filtered orders
  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      // Tab filter
      const isCompleted = ['COMPLETED', 'DELIVERED', 'CANCELLED'].includes(order.status);
      if (activeTab === 'antrian' && isCompleted) return false;
      if (activeTab === 'selesai' && !isCompleted) return false;

      // Status filter
      if (selectedStatusFilter !== 'ALL' && order.status !== selectedStatusFilter) {
        return false;
      }

      // Order type filter
      if (selectedType !== 'ALL' && order.orderType !== selectedType) {
        return false;
      }

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
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
  }, [orders, activeTab, selectedStatusFilter, selectedType, searchQuery]);

  // Counts
  const antrianCount = useMemo(() => {
    return orders.filter(o => !['COMPLETED', 'DELIVERED', 'CANCELLED'].includes(o.status)).length;
  }, [orders]);

  const selesaiCount = useMemo(() => {
    return orders.filter(o => ['COMPLETED', 'DELIVERED', 'CANCELLED'].includes(o.status)).length;
  }, [orders]);

  const formatElapsed = (createdAtStr: string) => {
    const elapsedSecs = Math.floor((Date.now() - new Date(createdAtStr).getTime()) / 1000);
    const mins = Math.floor(elapsedSecs / 60);
    if (mins < 1) return 'Baru saja';
    if (mins < 60) return `${mins} mnt lalu`;
    const hours = Math.floor(mins / 60);
    return `${hours} jam ${mins % 60} mnt lalu`;
  };

  return (
    <div className="min-h-screen bg-[#FAF7F2] text-[#1C1917] p-4 sm:p-6 lg:p-8 space-y-6">
      
      {/* Top Header Bar */}
      <div className="bg-white/80 backdrop-blur-md rounded-3xl p-5 sm:p-6 border border-stone-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#2E5A44]/10 text-[#2E5A44] text-[11px] font-bold tracking-wide">
            <ChefHat className="w-3.5 h-3.5" />
            <span>Kitchen & POS Live Orders</span>
          </div>
          <h1 className="font-serif text-2xl sm:text-3xl font-bold tracking-tight text-stone-900 mt-1">
            Pesanan Hari Ini
          </h1>
          <p className="text-xs text-stone-500 mt-0.5">
            Pantau dan kelola antrean pesanan dapur & meja secara realtime
          </p>
        </div>

        {/* Live Controls: Audio chime, Wake Lock, Refresh */}
        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Audio Chime Toggle */}
          <button
            onClick={() => setIsAudioEnabled(!isAudioEnabled)}
            className={`px-3.5 py-2.5 rounded-2xl text-xs font-bold border flex items-center gap-1.5 transition-all cursor-pointer ${
              isAudioEnabled
                ? 'bg-emerald-50 text-emerald-800 border-emerald-200 shadow-sm'
                : 'bg-stone-50 text-stone-500 border-stone-200'
            }`}
            title="Lonceng Suara Pesanan Baru"
          >
            {isAudioEnabled ? <Volume2 className="w-4 h-4 text-emerald-600" /> : <VolumeX className="w-4 h-4" />}
            <span>{isAudioEnabled ? 'Suara ON' : 'Suara Mute'}</span>
          </button>

          {/* Screen Wake Lock */}
          {wakeLockSupported && (
            <button
              onClick={toggleWakeLock}
              className={`px-3.5 py-2.5 rounded-2xl text-xs font-bold border flex items-center gap-1.5 transition-all cursor-pointer ${
                isWakeLockActive
                  ? 'bg-amber-50 text-amber-800 border-amber-200 shadow-sm'
                  : 'bg-stone-50 text-stone-500 border-stone-200'
              }`}
              title="Cegah layar redup / mati"
            >
              <Smartphone className="w-4 h-4" />
              <span>{isWakeLockActive ? 'Layar Terjaga' : 'Auto-Sleep'}</span>
            </button>
          )}

          {/* Refresh Button */}
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="px-4 py-2.5 rounded-2xl bg-[#2E5A44] hover:bg-[#234533] text-white text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-sm disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span>Segarkan</span>
          </button>
        </div>
      </div>

      {/* Filter Tabs & Search Bar */}
      <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
        
        {/* Main Tabs: Antrian vs Selesai */}
        <div className="flex gap-2 p-1 bg-stone-200/60 rounded-2xl shrink-0">
          <button
            onClick={() => setActiveTab('antrian')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'antrian'
                ? 'bg-white text-[#2E5A44] shadow-sm'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            <span>Antrean Aktif</span>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
              activeTab === 'antrian' ? 'bg-[#2E5A44] text-white' : 'bg-stone-300 text-stone-700'
            }`}>
              {antrianCount}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('selesai')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'selesai'
                ? 'bg-white text-stone-900 shadow-sm'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            <span>Riwayat Selesai</span>
            <span className="px-2 py-0.5 rounded-full bg-stone-300 text-stone-700 text-[10px] font-black">
              {selesaiCount}
            </span>
          </button>
        </div>

        {/* Search Input & Order Type Filters */}
        <div className="flex flex-col sm:flex-row gap-2.5 items-center flex-1 max-w-xl">
          <div className="relative w-full">
            <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Cari ID, nama pemesan, meja, antrean..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9.5 pr-4 py-2.5 rounded-2xl bg-white border border-stone-200 text-xs font-medium focus:outline-none focus:border-[#2E5A44] shadow-sm"
            />
          </div>

          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="w-full sm:w-auto px-3.5 py-2.5 rounded-2xl bg-white border border-stone-200 text-xs font-bold focus:outline-none focus:border-[#2E5A44] cursor-pointer shadow-sm"
          >
            <option value="ALL">Semua Tipe</option>
            <option value="DINE_IN">Dine-In (Meja)</option>
            <option value="PICKUP">Pickup (Ambil)</option>
            <option value="DELIVERY">Delivery (Kurir)</option>
          </select>
        </div>
      </div>

      {/* Orders Grid / Kitchen Kanban Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {filteredOrders.map((order) => {
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
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className={`bg-white rounded-3xl border overflow-hidden shadow-sm flex flex-col justify-between transition-all ${
                isLate
                  ? 'border-rose-400 ring-2 ring-rose-300/40'
                  : isPending
                  ? 'border-amber-300'
                  : isPreparing
                  ? 'border-blue-300'
                  : isReady
                  ? 'border-emerald-400 ring-2 ring-emerald-300/40'
                  : 'border-stone-200'
              }`}
            >
              {/* Card Header */}
              <div className="p-4 bg-[#FAF7F2] border-b border-stone-100 flex items-start justify-between gap-2">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    {order.queueNumber ? (
                      <span className="font-mono font-black text-sm px-2.5 py-0.5 rounded-lg bg-[#2E5A44] text-white">
                        {order.queueNumber}
                      </span>
                    ) : (
                      <span className="font-mono font-bold text-xs text-stone-500">
                        #{order.id.slice(0, 8).toUpperCase()}
                      </span>
                    )}
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-white border border-stone-200 text-stone-700 text-[10px] font-bold">
                      <TypeIcon className="w-3 h-3 text-[#2E5A44]" />
                      {ORDER_TYPE_LABELS[order.orderType] || order.orderType}
                    </span>
                  </div>

                  <h3 className="font-serif font-bold text-base text-stone-900 leading-tight">
                    {order.customerName}
                  </h3>
                  {order.tableNumber && (
                    <p className="text-xs font-bold text-[#2E5A44]">
                      📍 {order.tableNumber}
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

              {/* Dish Items Checklist */}
              <div className="p-4 space-y-2 flex-1">
                <p className="text-[10px] font-bold uppercase tracking-wider text-stone-400">
                  Daftar Pesanan ({order.items.reduce((acc, i) => acc + i.qty, 0)} item)
                </p>
                
                <div className="space-y-1.5">
                  {order.items.map((item) => {
                    const isChecked = checkedItems[item.id] || false;
                    return (
                      <div
                        key={item.id}
                        onClick={() => toggleItemCheck(item.id)}
                        className={`p-2.5 rounded-2xl border transition-all flex items-start justify-between gap-3 cursor-pointer select-none ${
                          isChecked
                            ? 'bg-emerald-50/60 border-emerald-300 opacity-60 line-through'
                            : 'bg-stone-50/70 border-stone-200/80 hover:bg-stone-100/80'
                        }`}
                      >
                        <div className="flex items-start gap-2.5">
                          <div className={`w-4 h-4 rounded-md border mt-0.5 flex items-center justify-center ${
                            isChecked ? 'bg-emerald-600 border-emerald-600 text-white' : 'border-stone-300 bg-white'
                          }`}>
                            {isChecked && <Check className="w-3 h-3" />}
                          </div>
                          <div>
                            <p className="font-bold text-xs text-stone-900 leading-tight">
                              <span className="font-black text-[#2E5A44] mr-1">{item.qty}x</span>
                              {item.product.name}
                            </p>
                            {item.modifiers && (
                              <p className="text-[10px] text-stone-500 mt-0.5 leading-snug">
                                {item.modifiers}
                              </p>
                            )}
                          </div>
                        </div>
                        <span className="text-[11px] font-bold text-stone-700 shrink-0">
                          {formatRupiah(item.price * item.qty)}
                        </span>
                      </div>
                    );
                  })}
                </div>

                {order.notes && (
                  <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-[11px] font-medium mt-2">
                    📝 <span className="font-bold">Catatan:</span> {order.notes}
                  </div>
                )}
              </div>

              {/* Card Footer & Stepper Status Actions */}
              <div className="p-4 bg-stone-50 border-t border-stone-100 space-y-3">
                <div className="flex items-center justify-between text-xs font-bold">
                  <span className="text-stone-500">Total Tagihan</span>
                  <span className="text-sm font-serif font-black text-[#2E5A44]">
                    {formatRupiah(order.total)}
                  </span>
                </div>

                {/* 1-Tap Status Progress Stepper */}
                {!isCompleted && !isCancelled && (
                  <div className="grid grid-cols-3 gap-1.5 pt-1">
                    {/* Step 1: PENDING */}
                    <button
                      onClick={() => handleUpdateStatus(order.id, 'PREPARING')}
                      disabled={loadingOrderId === order.id}
                      className={`py-2 rounded-xl text-[11px] font-bold transition-all cursor-pointer ${
                        isPending
                          ? 'bg-amber-500 text-white shadow-sm ring-2 ring-amber-300/50'
                          : 'bg-white border border-stone-200 text-stone-600 hover:bg-stone-100'
                      }`}
                    >
                      🍳 Masak
                    </button>

                    {/* Step 2: PREPARING */}
                    <button
                      onClick={() => handleUpdateStatus(order.id, 'READY')}
                      disabled={loadingOrderId === order.id}
                      className={`py-2 rounded-xl text-[11px] font-bold transition-all cursor-pointer ${
                        isPreparing
                          ? 'bg-blue-600 text-white shadow-sm ring-2 ring-blue-300/50'
                          : 'bg-white border border-stone-200 text-stone-600 hover:bg-stone-100'
                      }`}
                    >
                      ✨ Siap Saji
                    </button>

                    {/* Step 3: READY / COMPLETED */}
                    <button
                      onClick={() => handleUpdateStatus(order.id, 'COMPLETED')}
                      disabled={loadingOrderId === order.id}
                      className={`py-2 rounded-xl text-[11px] font-bold transition-all cursor-pointer ${
                        isReady
                          ? 'bg-emerald-600 text-white shadow-sm ring-2 ring-emerald-300/50'
                          : 'bg-white border border-stone-200 text-stone-600 hover:bg-stone-100'
                      }`}
                    >
                      ✅ Selesai
                    </button>
                  </div>
                )}

                {/* Completed / Cancelled Status Badge */}
                {(isCompleted || isCancelled) && (
                  <div className={`w-full py-2 rounded-xl text-center text-xs font-bold ${
                    isCompleted ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                  }`}>
                    {isCompleted ? '✅ Pesanan Selesai' : '❌ Pesanan Dibatalkan'}
                  </div>
                )}
              </div>
            </motion.div>
          );
        })}

        {filteredOrders.length === 0 && (
          <div className="col-span-full py-16 text-center text-stone-400 bg-white rounded-3xl border border-stone-200 p-8">
            <ChefHat className="w-12 h-12 mx-auto mb-2 text-stone-300" />
            <p className="font-serif font-bold text-base text-stone-700">Tidak ada pesanan ditemukan</p>
            <p className="text-xs text-stone-400 mt-1">Semua pesanan saat ini sudah selesai atau sesuai filter.</p>
          </div>
        )}
      </div>
    </div>
  );
}
