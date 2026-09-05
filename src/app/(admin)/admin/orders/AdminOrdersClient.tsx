'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { formatRupiah } from '@/lib/utils';
import {
  Search,
  MapPin,
  Package,
  Clock,
  ArrowUpRight,
  ShoppingBag,
  Truck,
  UtensilsCrossed,
  Printer,
  Camera,
  MessageCircle,
  RefreshCw,
  Copy,
  Check,
  X,
  CreditCard,
  Banknote,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Eye,
  SlidersHorizontal,
  ChevronDown
} from 'lucide-react';
import { useToast } from '@/components/ui/Toast';
import { AdminOrdersSkeleton } from '@/components/ui/ShimmerSkeleton';
import { UrlPagination } from '@/components/ui/UrlPagination';
import { ThermalReceiptModal, ReceiptData } from '@/components/cashier/ThermalReceiptModal';
import { BluetoothPrinterPill } from '@/components/cashier/BluetoothPrinterPill';
import { formatOrderCardModifiers } from '@/lib/receipt-modifiers';
import { getAlarmSoundUrl } from '@/lib/alarm-utils';

interface OrderItem {
  id: string;
  qty: number;
  price: number;
  modifiers?: string | null;
  product: {
    name: string;
    image: string | null;
    price?: number;
  };
}

interface OrderData {
  id: string;
  customerName: string;
  customerPhone: string;
  address: string;
  orderType: string;
  tableNumber?: string | null;
  paymentMethod: string;
  total: number;
  status: string;
  createdAt: string;
  items: OrderItem[];
  paymentProofUrl?: string | null;
  notes?: string | null;
  pickupTime?: string | null;
  queueNumber?: string | null;
  source?: string | null;
  subtotal?: number;
  deliveryFee?: number;
  voucherCode?: string | null;
  hasTumbler?: boolean;
  pointsEarned?: number;
  cancelReason?: string | null;
}

interface Props {
  initialOrders: OrderData[];
  currentPage?: number;
  totalPages?: number;
  totalOrders?: number;
  pageSize?: number;
  isLoading?: boolean;
  alarmSoundUrl?: string;
}

export default function AdminOrdersClient({
  initialOrders,
  currentPage = 1,
  totalPages = 1,
  totalOrders = 0,
  pageSize = 15,
  isLoading = false,
  alarmSoundUrl = '',
}: Props) {
  const router = useRouter();
  const { showToast } = useToast();

  const [orders, setOrders] = useState<OrderData[]>(initialOrders);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [sourceFilter, setSourceFilter] = useState('ALL');
  const [isUpdating, setIsUpdating] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Receipt Modal State
  const [selectedReceiptOrder, setSelectedReceiptOrder] = useState<ReceiptData | null>(null);
  const [showReceiptModal, setShowReceiptModal] = useState(false);

  // Payment Proof Modal State
  const [previewProofUrl, setPreviewProofUrl] = useState<string | null>(null);

  // Sync when initialOrders changes from server
  useEffect(() => {
    setOrders(initialOrders);
  }, [initialOrders]);

  // Client-side polling
  const prevOrdersCount = useRef(orders.length);

  const refreshOrders = async (manual = false) => {
    if (manual) setIsRefreshing(true);
    try {
      const res = await fetch('/api/admin/orders?format=json');
      if (res.ok) {
        const data = await res.json();
        if (data.orders) {
          setOrders(data.orders);
          if (manual) showToast('Data pesanan diperbarui', 'success');
        }
      }
    } catch {
      if (manual) showToast('Gagal memuat pembaruan pesanan', 'error');
    } finally {
      if (manual) setIsRefreshing(false);
    }
  };

  useEffect(() => {
    const interval = setInterval(() => {
      refreshOrders(false);
    }, 15000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    // Sound notification when new orders arrive
    if (orders.length > prevOrdersCount.current) {
      const audio = new Audio(getAlarmSoundUrl(alarmSoundUrl));
      audio.play().catch((e) => console.log('Audio play blocked by browser:', e));
    }
    prevOrdersCount.current = orders.length;
  }, [orders.length, alarmSoundUrl]);

  // Order Counts for Quick Filters
  const counts = useMemo(() => {
    let pending = 0;
    let preparing = 0;
    let ready = 0;
    let completed = 0;
    let cancelled = 0;

    orders.forEach((o) => {
      if (o.status === 'PENDING' || o.status === 'PENDING_PAYMENT') pending++;
      else if (o.status === 'PREPARING') preparing++;
      else if (o.status === 'READY') ready++;
      else if (['COMPLETED', 'DELIVERED'].includes(o.status)) completed++;
      else if (o.status === 'CANCELLED') cancelled++;
    });

    return {
      all: orders.length,
      pending,
      preparing,
      ready,
      completed,
      cancelled,
    };
  }, [orders]);

  const filteredOrders = useMemo(() => {
    return orders.filter((o) => {
      const q = search.toLowerCase();
      const matchesSearch =
        o.id.toLowerCase().includes(q) ||
        o.customerName.toLowerCase().includes(q) ||
        o.customerPhone.includes(q) ||
        (o.queueNumber && o.queueNumber.toLowerCase().includes(q)) ||
        (o.tableNumber && o.tableNumber.toLowerCase().includes(q));

      let matchesStatus = true;
      if (statusFilter === 'ACTIVE_PROCESS') {
        matchesStatus = ['PENDING', 'PENDING_PAYMENT', 'PREPARING', 'READY'].includes(o.status);
      } else if (statusFilter !== 'ALL') {
        matchesStatus = o.status === statusFilter;
      }

      const matchesType = typeFilter === 'ALL' || o.orderType === typeFilter;
      const matchesSource = sourceFilter === 'ALL' || o.source === sourceFilter;

      return matchesSearch && matchesStatus && matchesType && matchesSource;
    });
  }, [orders, search, statusFilter, typeFilter, sourceFilter]);

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
        const origPrice = item.product?.price && item.product.price > item.price ? item.product.price : undefined;
        const pDiscount = origPrice ? origPrice - item.price : undefined;
        return {
          name: item.product?.name || 'Item',
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
      hasTumbler: order.hasTumbler || false,
      total: order.total,
      pointsEarned: order.pointsEarned,
      notes: order.notes || undefined,
    };

    setSelectedReceiptOrder(receiptData);
    setShowReceiptModal(true);
  };

  const copyOrderId = (id: string) => {
    const short = id.slice(0, 8).toUpperCase();
    navigator.clipboard.writeText(short);
    setCopiedId(id);
    showToast(`ID #${short} disalin ke papan klip`, 'success');
    setTimeout(() => {
      setCopiedId((curr) => (curr === id ? null : curr));
    }, 2000);
  };

  const formatWhatsAppNumber = (phone: string) => {
    let cleaned = phone.replace(/[^0-9]/g, '');
    if (cleaned.startsWith('08')) {
      cleaned = '62' + cleaned.substring(1);
    } else if (cleaned.startsWith('8')) {
      cleaned = '62' + cleaned;
    }
    return cleaned;
  };

  const getNextStatus = (status: string, paymentMethod?: string, paymentProofUrl?: string | null) => {
    if (status === 'PENDING_PAYMENT' && ['QRIS', 'TRANSFER'].includes(paymentMethod || '') && !paymentProofUrl) {
      return 'PENDING';
    }
    const map: Record<string, string> = {
      PENDING: 'PREPARING',
      PENDING_PAYMENT: 'PREPARING',
      PREPARING: 'READY',
      READY: 'COMPLETED',
    };
    return map[status];
  };

  const advanceOrderStatus = async (orderId: string, nextStatus: string) => {
    if (!nextStatus) return;
    setIsUpdating(orderId);
    try {
      const res = await fetch(`/api/admin/orders/${orderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus }),
      });
      if (!res.ok) throw new Error('Failed');
      router.refresh();
      showToast('Status pesanan berhasil diperbarui', 'success');
      // Update local state optimistically
      setOrders((prev) =>
        prev.map((o) => (o.id === orderId ? { ...o, status: nextStatus } : o))
      );
    } catch {
      showToast('Gagal memperbarui status pesanan', 'error');
    } finally {
      setIsUpdating(null);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PENDING':
        return {
          label: 'Menunggu Masak',
          style: 'bg-orange-50 text-orange-700 border-orange-200/80',
        };
      case 'PENDING_PAYMENT':
        return {
          label: 'Menunggu Bayar',
          style: 'bg-rose-50 text-rose-700 border-rose-200/80',
        };
      case 'PREPARING':
        return {
          label: 'Sedang Masak',
          style: 'bg-amber-50 text-amber-700 border-amber-200/80',
        };
      case 'READY':
        return {
          label: 'Siap Disajikan',
          style: 'bg-sky-50 text-sky-700 border-sky-200/80',
        };
      case 'COMPLETED':
      case 'DELIVERED':
        return {
          label: 'Selesai',
          style: 'bg-emerald-50 text-emerald-700 border-emerald-200/80',
        };
      case 'ON_DELIVERY':
        return {
          label: 'Dalam Pengiriman',
          style: 'bg-blue-50 text-blue-700 border-blue-200/80',
        };
      case 'CANCELLED':
        return {
          label: 'Dibatalkan',
          style: 'bg-stone-100 text-stone-600 border-stone-200',
        };
      default:
        return {
          label: status.replace('_', ' '),
          style: 'bg-stone-100 text-stone-700 border-stone-200',
        };
    }
  };

  return (
    <>
      {/* Top Header & Metrics Bar */}
      <div className="bg-gradient-to-r from-orange-50 via-amber-50 to-orange-50/40 rounded-2xl border border-orange-200/70 p-4 sm:p-5 shadow-sm mb-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-xs">
                Arum Seduh
              </span>
              <span className="text-xs font-semibold text-orange-950/70">
                Manajemen Pesanan Real-Time
              </span>
            </div>
            <h2 className="text-lg sm:text-xl font-bold text-stone-900 tracking-tight">
              Daftar Semua Pesanan
            </h2>
            <p className="text-xs text-stone-600 mt-0.5">
              Pantau antrean, cetak struk thermal kasir & tiket dapur, serta kelola alur transaksi pesanan.
            </p>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            {/* Bluetooth Printer Status Pill */}
            <BluetoothPrinterPill />

            {/* Refresh Button */}
            <button
              onClick={() => refreshOrders(true)}
              disabled={isRefreshing}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white border border-stone-200 hover:border-orange-300 text-stone-700 hover:text-orange-700 text-xs font-semibold shadow-xs transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
              title="Perbarui daftar pesanan sekarang"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-orange-500' : 'text-stone-500'}`} />
              <span>{isRefreshing ? 'Memperbarui...' : 'Segarkan'}</span>
            </button>
          </div>
        </div>

        {/* Quick Filter Tabs */}
        <div className="flex items-center gap-1.5 mt-4 pt-3 border-t border-orange-200/50 overflow-x-auto pb-1 scrollbar-none">
          <button
            onClick={() => setStatusFilter('ALL')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
              statusFilter === 'ALL'
                ? 'bg-orange-600 text-white shadow-xs shadow-orange-500/20'
                : 'bg-white/80 hover:bg-white text-stone-600 border border-stone-200/60'
            }`}
          >
            Semua ({counts.all})
          </button>
          <button
            onClick={() => setStatusFilter('PENDING')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer flex items-center gap-1.5 ${
              statusFilter === 'PENDING'
                ? 'bg-orange-600 text-white shadow-xs shadow-orange-500/20'
                : 'bg-white/80 hover:bg-white text-stone-600 border border-stone-200/60'
            }`}
          >
            Menunggu Masak
            {counts.pending > 0 && (
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${statusFilter === 'PENDING' ? 'bg-white/20 text-white' : 'bg-orange-100 text-orange-700'}`}>
                {counts.pending}
              </span>
            )}
          </button>
          <button
            onClick={() => setStatusFilter('PREPARING')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer flex items-center gap-1.5 ${
              statusFilter === 'PREPARING'
                ? 'bg-amber-600 text-white shadow-xs shadow-amber-500/20'
                : 'bg-white/80 hover:bg-white text-stone-600 border border-stone-200/60'
            }`}
          >
            Sedang Masak
            {counts.preparing > 0 && (
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${statusFilter === 'PREPARING' ? 'bg-white/20 text-white' : 'bg-amber-100 text-amber-700'}`}>
                {counts.preparing}
              </span>
            )}
          </button>
          <button
            onClick={() => setStatusFilter('READY')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer flex items-center gap-1.5 ${
              statusFilter === 'READY'
                ? 'bg-sky-600 text-white shadow-xs shadow-sky-500/20'
                : 'bg-white/80 hover:bg-white text-stone-600 border border-stone-200/60'
            }`}
          >
            Siap Saji
            {counts.ready > 0 && (
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${statusFilter === 'READY' ? 'bg-white/20 text-white' : 'bg-sky-100 text-sky-700'}`}>
                {counts.ready}
              </span>
            )}
          </button>
          <button
            onClick={() => setStatusFilter('COMPLETED')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer flex items-center gap-1.5 ${
              statusFilter === 'COMPLETED'
                ? 'bg-emerald-600 text-white shadow-xs shadow-emerald-500/20'
                : 'bg-white/80 hover:bg-white text-stone-600 border border-stone-200/60'
            }`}
          >
            Selesai
            {counts.completed > 0 && (
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${statusFilter === 'COMPLETED' ? 'bg-white/20 text-white' : 'bg-emerald-100 text-emerald-700'}`}>
                {counts.completed}
              </span>
            )}
          </button>
          <button
            onClick={() => setStatusFilter('CANCELLED')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
              statusFilter === 'CANCELLED'
                ? 'bg-stone-700 text-white shadow-xs'
                : 'bg-white/80 hover:bg-white text-stone-600 border border-stone-200/60'
            }`}
          >
            Dibatalkan ({counts.cancelled})
          </button>
        </div>
      </div>

      {/* Filter & Search Toolbar */}
      <div className="flex flex-col sm:flex-row gap-2.5 mb-4">
        {/* Search Box */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
          <input
            type="text"
            placeholder="Cari ID pesanan, nama pelanggan, no. antrean..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-8 py-2.5 text-xs sm:text-sm bg-white border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-400 transition-all shadow-xs text-stone-800 placeholder:text-stone-400"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 p-0.5"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Tipe Pesanan Filter */}
        <div className="relative min-w-[140px]">
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="w-full px-3 py-2.5 text-xs sm:text-sm bg-white border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-400 shadow-xs appearance-none font-medium text-stone-700 pr-8 cursor-pointer"
          >
            <option value="ALL">Semua Tipe</option>
            <option value="DINE_IN">Dine In (Meja)</option>
            <option value="PICKUP">Pickup (Ambil)</option>
            <option value="DELIVERY">Delivery (Kurir)</option>
          </select>
          <ChevronDown className="w-4 h-4 text-stone-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
        </div>

        {/* Sumber Pesanan Filter */}
        <div className="relative min-w-[150px]">
          <select
            value={sourceFilter}
            onChange={(e) => setSourceFilter(e.target.value)}
            className="w-full px-3 py-2.5 text-xs sm:text-sm bg-white border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-400 shadow-xs appearance-none font-medium text-stone-700 pr-8 cursor-pointer"
          >
            <option value="ALL">Semua Channel</option>
            <option value="SPMB">SPMB (Self Service)</option>
            <option value="POS">Kasir (POS)</option>
            <option value="WA">Bot WhatsApp</option>
            <option value="APP">Aplikasi Online</option>
          </select>
          <ChevronDown className="w-4 h-4 text-stone-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
        </div>
      </div>

      {/* Order Cards List */}
      <div className="space-y-3.5">
        {isLoading ? (
          <AdminOrdersSkeleton />
        ) : filteredOrders.length === 0 ? (
          <div className="py-16 text-center text-stone-400 bg-white rounded-2xl border border-stone-200 shadow-xs">
            <Package className="w-12 h-12 mx-auto mb-2.5 text-stone-300" />
            <p className="text-sm font-semibold text-stone-700">Tidak ada pesanan yang sesuai</p>
            <p className="text-xs text-stone-400 mt-1">Coba ubah kata kunci pencarian atau filter status Anda.</p>
          </div>
        ) : (
          filteredOrders.map((order) => {
            const badge = getStatusBadge(order.status);
            const rawSubtotal = order.subtotal || order.total;
            const computedDiscount = Math.max(0, rawSubtotal + (order.deliveryFee || 0) - order.total);
            const waNumber = formatWhatsAppNumber(order.customerPhone);

            return (
              <div
                key={order.id}
                className="bg-white rounded-2xl border border-stone-200/80 shadow-xs hover:shadow-md hover:border-orange-200 transition-all duration-200 overflow-hidden"
              >
                <div className="p-4 sm:p-5">
                  {/* Card Header Row */}
                  <div className="flex items-center justify-between gap-2 flex-wrap mb-3 pb-3 border-b border-stone-100">
                    <div className="flex items-center gap-2 flex-wrap">
                      {/* Copyable Order ID */}
                      <button
                        onClick={() => copyOrderId(order.id)}
                        className="inline-flex items-center gap-1 font-mono text-xs font-bold text-stone-800 hover:text-orange-600 bg-stone-50 hover:bg-orange-50 px-2 py-1 rounded-lg border border-stone-200/80 hover:border-orange-300 transition-colors cursor-pointer"
                        title="Klik untuk menyalin ID pesanan"
                      >
                        <span>#{order.id.slice(0, 8).toUpperCase()}</span>
                        {copiedId === order.id ? (
                          <Check className="w-3 h-3 text-emerald-600" />
                        ) : (
                          <Copy className="w-3 h-3 text-stone-400" />
                        )}
                      </button>

                      {/* Queue Number */}
                      {order.queueNumber && (
                        <span className="px-2 py-0.5 rounded-lg text-[11px] font-black tracking-wide bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-xs">
                          A-{order.queueNumber}
                        </span>
                      )}

                      {/* Status Badge */}
                      <span className={`px-2.5 py-0.5 rounded-lg text-[10.5px] font-bold border ${badge.style}`}>
                        {badge.label}
                      </span>

                      {/* Channel / Source Badge */}
                      <span
                        className={`px-2 py-0.5 rounded-lg text-[10px] font-bold uppercase tracking-wider border ${
                          order.source === 'SPMB'
                            ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                            : order.source === 'WA'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : order.source === 'POS'
                            ? 'bg-amber-50 text-amber-700 border-amber-200'
                            : 'bg-sky-50 text-sky-700 border-sky-200'
                        }`}
                      >
                        {order.source === 'SPMB'
                          ? `SPMB (Self Service)${order.pickupTime ? `: ${order.pickupTime}` : ''}`
                          : order.source === 'WA'
                          ? 'Bot WhatsApp'
                          : order.source === 'POS'
                          ? 'Kasir (POS)'
                          : 'Aplikasi'}
                      </span>

                      {/* Order Type Badge */}
                      <span
                        className={`px-2 py-0.5 rounded-lg text-[10px] font-bold uppercase tracking-wider border flex items-center gap-1 ${
                          order.orderType === 'DINE_IN'
                            ? 'bg-amber-50 text-amber-700 border-amber-200'
                            : order.orderType === 'PICKUP'
                            ? 'bg-purple-50 text-purple-700 border-purple-200'
                            : 'bg-sky-50 text-sky-700 border-sky-200'
                        }`}
                      >
                        {order.orderType === 'DINE_IN' ? (
                          <>
                            <UtensilsCrossed className="w-3 h-3" />
                            <span>Dine In {order.tableNumber ? `(Meja ${order.tableNumber})` : ''}</span>
                          </>
                        ) : order.orderType === 'PICKUP' ? (
                          <>
                            <ShoppingBag className="w-3 h-3" />
                            <span>Pickup</span>
                          </>
                        ) : (
                          <>
                            <Truck className="w-3 h-3" />
                            <span>Delivery</span>
                          </>
                        )}
                      </span>

                      {/* Bukti Pembayaran Badge */}
                      {order.paymentProofUrl && (
                        <button
                          onClick={() => setPreviewProofUrl(order.paymentProofUrl || null)}
                          className="px-2 py-0.5 rounded-lg text-[10px] font-bold uppercase tracking-wider bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 flex items-center gap-1 transition-colors cursor-pointer"
                          title="Klik untuk melihat bukti pembayaran"
                        >
                          <Camera className="w-3 h-3 text-emerald-600" />
                          <span>Bukti Ada</span>
                        </button>
                      )}
                    </div>

                    {/* Order Time */}
                    <span className="text-[11.5px] text-stone-500 font-medium flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-stone-400" />
                      {new Date(order.createdAt).toLocaleTimeString('id-ID', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>

                  {/* Content Grid (Customer Info vs Items & Payment) */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Left Column: Customer & Details */}
                    <div className="space-y-2.5">
                      <div>
                        <p className="text-[10px] font-bold text-stone-400 uppercase tracking-wider mb-0.5">
                          Pelanggan
                        </p>
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-bold text-stone-900">{order.customerName}</p>
                          {waNumber && (
                            <a
                              href={`https://wa.me/${waNumber}`}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 text-[10.5px] font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-2 py-0.5 rounded-md border border-emerald-200/80 transition-colors"
                              title="Chat pelanggan via WhatsApp"
                            >
                              <MessageCircle className="w-3 h-3 text-emerald-600" />
                              <span>Chat WA</span>
                            </a>
                          )}
                        </div>
                        <p className="text-xs text-stone-500 mt-0.5">{order.customerPhone}</p>
                      </div>

                      <div>
                        <p className="text-[10px] font-bold text-stone-400 uppercase tracking-wider mb-0.5 flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-stone-400" /> Alamat / Lokasi
                        </p>
                        <p className="text-xs text-stone-700 line-clamp-2 leading-relaxed">
                          {order.orderType === 'DINE_IN' && order.tableNumber
                            ? `Dine In — Meja ${order.tableNumber}`
                            : order.address || 'Ambil di Bar / Kasir Arum Seduh'}
                        </p>
                      </div>

                      {order.notes && (
                        <div className="bg-amber-50/70 border border-amber-200/80 rounded-xl p-2.5 text-xs text-amber-950 leading-relaxed">
                          <span className="font-bold text-amber-900">Catatan:</span> {order.notes}
                        </div>
                      )}
                    </div>

                    {/* Right Column: Items & Pricing */}
                    <div className="flex flex-col justify-between">
                      <div>
                        <p className="text-[10px] font-bold text-stone-400 uppercase tracking-wider mb-1.5">
                          Menu Pesanan ({order.items.length})
                        </p>
                        <div className="space-y-2 max-h-36 overflow-y-auto pr-1">
                          {order.items.map((item) => {
                            const { tags, promoText } = formatOrderCardModifiers(
                              item.modifiers,
                              item.product?.name
                            );
                            const origPrice =
                              item.product?.price && item.product.price > item.price
                                ? item.product.price
                                : undefined;

                            return (
                              <div
                                key={item.id}
                                className="bg-stone-50/70 rounded-xl p-2 border border-stone-100 space-y-1"
                              >
                                <div className="flex justify-between items-start text-xs">
                                  <span className="font-bold text-stone-800">
                                    {item.qty}× {item.product?.name || 'Item'}
                                  </span>
                                  <span className="font-bold text-stone-900 shrink-0 ml-2">
                                    {origPrice && (
                                      <span className="line-through text-stone-400 text-[10px] mr-1.5 font-normal">
                                        {formatRupiah(origPrice * item.qty)}
                                      </span>
                                    )}
                                    {formatRupiah(item.price * item.qty)}
                                  </span>
                                </div>

                                {tags.length > 0 && (
                                  <div className="flex flex-wrap gap-1 pt-0.5">
                                    {tags.map((tag, idx) => (
                                      <span
                                        key={idx}
                                        className="inline-block text-[9.5px] font-medium text-stone-600 bg-white px-1.5 py-0.5 rounded border border-stone-200"
                                      >
                                        {tag}
                                      </span>
                                    ))}
                                  </div>
                                )}

                                {promoText && (
                                  <div className="text-[9.5px] font-semibold text-rose-600">
                                    » Potongan: {promoText}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* Financial & Payment Row */}
                      <div className="mt-3 pt-2.5 border-t border-stone-100 flex items-center justify-between gap-2">
                        <div>
                          <span className="text-[9px] font-bold text-stone-400 uppercase tracking-wider block">
                            Pembayaran
                          </span>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span className="text-xs font-bold text-stone-800">
                              {order.paymentMethod === 'QRIS'
                                ? 'QRIS (Doku)'
                                : order.paymentMethod === 'COD'
                                ? 'COD'
                                : order.paymentMethod === 'CASH'
                                ? 'Tunai Kasir'
                                : order.paymentMethod === 'TRANSFER'
                                ? 'Transfer Bank'
                                : order.paymentMethod}
                            </span>
                            <span
                              className={`px-1.5 py-0.5 rounded text-[9.5px] font-bold ${
                                order.status === 'PENDING_PAYMENT'
                                  ? 'bg-rose-100 text-rose-800'
                                  : ['CANCELLED'].includes(order.status)
                                  ? 'bg-stone-100 text-stone-700'
                                  : 'bg-emerald-100 text-emerald-800'
                              }`}
                            >
                              {order.status === 'PENDING_PAYMENT'
                                ? 'Belum Bayar'
                                : ['CANCELLED'].includes(order.status)
                                ? 'Batal'
                                : 'Lunas'}
                            </span>
                          </div>
                        </div>

                        <div className="text-right">
                          {computedDiscount > 0 && (
                            <div className="text-[10px] text-stone-500 font-medium flex items-center justify-end gap-1.5 mb-0.5">
                              <span>Subtotal: {formatRupiah(rawSubtotal)}</span>
                              <span className="text-rose-600 font-bold bg-rose-50 px-1 py-0.2 rounded">
                                Potongan: -{formatRupiah(computedDiscount)}
                              </span>
                            </div>
                          )}
                          <p className="text-[9px] font-bold text-stone-400 uppercase tracking-wider">
                            Total Akhir
                          </p>
                          <p className="text-sm sm:text-base font-extrabold text-stone-900 tracking-tight">
                            {formatRupiah(order.total)}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Card Action Footer */}
                <div className="flex items-center justify-between gap-2 px-4 sm:px-5 py-3 bg-stone-50/70 border-t border-stone-100">
                  {/* Left: Workflow Action Button */}
                  <div className="flex-1 max-w-[260px]">
                    {getNextStatus(order.status, order.paymentMethod, order.paymentProofUrl) ? (
                      (() => {
                        const nextStatus = getNextStatus(
                          order.status,
                          order.paymentMethod,
                          order.paymentProofUrl
                        )!;
                        const isAcceptPayment = nextStatus === 'PENDING';
                        return (
                          <button
                            onClick={() => advanceOrderStatus(order.id, nextStatus)}
                            disabled={isUpdating === order.id}
                            className={`w-full py-2 px-3.5 rounded-xl ${
                              isAcceptPayment
                                ? 'bg-gradient-to-r from-emerald-600 to-emerald-500 text-white'
                                : 'bg-gradient-to-r from-orange-500 to-amber-500 text-white'
                            } font-bold text-xs hover:opacity-95 transition-all disabled:opacity-50 shadow-xs active:scale-98 cursor-pointer flex items-center justify-center gap-1.5`}
                          >
                            {isUpdating === order.id ? (
                              <span>Memperbarui...</span>
                            ) : isAcceptPayment ? (
                              <>
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                <span>Terima Pembayaran</span>
                              </>
                            ) : (
                              <>
                                <span>Lanjutkan ke {nextStatus.replace('_', ' ')}</span>
                                <ArrowUpRight className="w-3.5 h-3.5" />
                              </>
                            )}
                          </button>
                        );
                      })()
                    ) : (
                      <div className="text-xs font-semibold text-stone-500 flex items-center gap-1.5 py-1.5">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        <span>Pesanan Selesai</span>
                      </div>
                    )}
                  </div>

                  {/* Right: Cetak Struk & Detail Action Buttons */}
                  <div className="flex items-center gap-2">
                    {/* Cetak Struk Thermal Button */}
                    <button
                      onClick={() => handleOpenReceipt(order)}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-orange-50 hover:bg-orange-100 text-orange-700 border border-orange-200/90 font-bold text-xs transition-all shadow-xs active:scale-95 cursor-pointer hover:border-orange-300"
                      title="Cetak Struk Thermal Kasir & Tiket Dapur (58mm / 80mm)"
                    >
                      <Printer className="w-3.5 h-3.5 text-orange-600" />
                      <span>Cetak Struk</span>
                    </button>

                    {/* Detail Order Link */}
                    <a
                      href={`/admin/orders/${order.id}`}
                      className="inline-flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-bold text-stone-700 bg-white hover:bg-stone-100 border border-stone-200 transition-colors shadow-xs"
                    >
                      <span>Detail</span>
                      <ArrowUpRight className="w-3 h-3 text-stone-500" />
                    </a>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Pagination */}
      <div className="pt-3">
        <UrlPagination
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={totalOrders}
          pageSize={pageSize}
        />
      </div>

      {/* Thermal Receipt Modal (Receipt & Kitchen Ticket) */}
      <ThermalReceiptModal
        isOpen={showReceiptModal}
        onClose={() => setShowReceiptModal(false)}
        order={selectedReceiptOrder}
      />

      {/* Payment Proof Quick Preview Modal */}
      {previewProofUrl && (
        <div
          className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 backdrop-blur-xs"
          onClick={() => setPreviewProofUrl(null)}
        >
          <div
            className="bg-white rounded-2xl max-w-lg w-full overflow-hidden shadow-2xl relative animate-in fade-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-4 border-b border-stone-100">
              <div className="flex items-center gap-2">
                <Camera className="w-4 h-4 text-orange-600" />
                <h3 className="font-bold text-sm text-stone-900">Bukti Pembayaran</h3>
              </div>
              <button
                onClick={() => setPreviewProofUrl(null)}
                className="p-1 rounded-lg hover:bg-stone-100 text-stone-500 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-4 bg-stone-50 flex items-center justify-center max-h-[70vh] overflow-auto">
              <img
                src={previewProofUrl}
                alt="Bukti Pembayaran"
                className="max-w-full max-h-full object-contain rounded-xl shadow-sm"
              />
            </div>
            <div className="p-3 bg-white border-t border-stone-100 text-right">
              <a
                href={previewProofUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-xs font-bold text-orange-600 hover:text-orange-700"
              >
                <span>Buka Ukuran Penuh</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
