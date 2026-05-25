'use client';

import { useState } from 'react';
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
  UserPlus,
  Bell,
  X,
  Eye,
  MapPin,
  ImageIcon,
  MessageCircle
} from 'lucide-react';
import { useEffect, useRef } from 'react';
import { CourierSelectModal } from '@/components/admin/CourierSelectModal';
import { useToast } from '@/components/ui/Toast';

interface OrderItem {
  id: string;
  qty: number;
  price: number;
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
}

interface Props {
  initialOrders: OrderData[];
  storeLat: number;
  storeLng: number;
}

const ORDER_TYPE_LABELS: Record<string, string> = {
  DELIVERY: 'Delivery',
  PICKUP: 'Pickup',
};

const ORDER_TYPE_ICONS: Record<string, React.ElementType> = {
  DELIVERY: Truck,
  PICKUP: ShoppingBag,
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

const getWhatsAppTemplate = (order: any) => {
  const orderIdShort = order.id.slice(0, 8).toUpperCase();
  const itemsText = order.items
    .map((item: any) => `- ${item.qty}x ${item.product.name}`)
    .join('\n');
  const totalAmount = new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(order.total);
    
  return `Halo ${order.customerName},

Kami dari *Matchaboy* ingin mengonfirmasi pesanan Anda dengan detail sebagai berikut:

*ID Pesanan:* #${orderIdShort}
*Status:* ${order.status}
*Metode Pembayaran:* ${order.paymentMethod}
*Tipe Pesanan:* ${order.orderType === 'PICKUP' ? 'Ambil Sendiri' : 'Pengiriman'}

*Rincian Pesanan:*
${itemsText}

*Total:* ${totalAmount}

Jika ada pertanyaan atau perubahan, silakan kabari kami ya. Terima kasih! 🍵`;
};

export default function CashierOrdersClient({ initialOrders, storeLat, storeLng }: Props) {
  const { showToast } = useToast();
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<TabType>('antrian');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [isUpdating, setIsUpdating] = useState<string | null>(null);
  const [orders, setOrders] = useState(initialOrders);

  // Cancellation Modal State
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [cancelOrderId, setCancelOrderId] = useState<string | null>(null);
  const [cancelReason, setCancelReason] = useState('Bukti Pembayaran Palsu');
  const [customReason, setCustomReason] = useState('');

  // Courier Selection State
  const [isCourierModalOpen, setIsCourierModalOpen] = useState(false);
  const [selectedOrderIdForCourier, setSelectedOrderIdForCourier] = useState<string | null>(null);

  // Detail Modal State
  const [selectedOrder, setSelectedOrder] = useState<OrderData | null>(null);

  // Unread orders & alarm sound states
  const [readOrderIds, setReadOrderIds] = useState<string[]>([]);
  const [isAudioBlocked, setIsAudioBlocked] = useState(false);
  const alarmAudioRef = useRef<HTMLAudioElement | null>(null);

  // Load read order IDs on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('cashier_read_orders');
      if (saved) {
        try {
          setReadOrderIds(JSON.parse(saved));
        } catch {
          // Ignore
        }
      }
    }
  }, []);

  // Mark selected order as read when opened
  useEffect(() => {
    if (selectedOrder) {
      setReadOrderIds(prev => {
        if (prev.includes(selectedOrder.id)) return prev;
        const next = [...prev, selectedOrder.id];
        localStorage.setItem('cashier_read_orders', JSON.stringify(next));
        return next;
      });
    }
  }, [selectedOrder]);

  // Sync when server-side initialOrders changes (e.g. after manual action)
  useEffect(() => {
    setOrders(initialOrders);
  }, [initialOrders]);

  // Split orders by tab
  const ACTIVE_STATUSES = ['PENDING', 'PENDING_PAYMENT', 'PREPARING', 'READY', 'ASSIGNED', 'ON_DELIVERY'];
  const DONE_STATUSES = ['COMPLETED', 'DELIVERED', 'CANCELLED'];

  const antrianOrders = orders.filter(o => ACTIVE_STATUSES.includes(o.status));
  const selesaiOrders = orders.filter(o => DONE_STATUSES.includes(o.status));

  // Lightweight client-side polling (no router.refresh = no full server recompile)
  const prevAntrianCount = useRef(antrianOrders.length);

  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/cashier/orders?format=json&t=${Date.now()}`, {
          cache: 'no-store',
          headers: {
            'Pragma': 'no-cache',
            'Cache-Control': 'no-cache'
          }
        });
        if (res.ok) {
          const data = await res.json();
          if (data.orders) setOrders(data.orders);
        }
      } catch {}
    }, 10000);

    return () => clearInterval(interval);
  }, []);

  const hasUnreadOrders = antrianOrders.some(
    o => (o.status === 'PENDING' || o.status === 'PENDING_PAYMENT') && !readOrderIds.includes(o.id)
  );

  // Continuous alarm playback effect
  useEffect(() => {
    if (typeof window === 'undefined') return;

    if (hasUnreadOrders) {
      if (!alarmAudioRef.current) {
        const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
        audio.loop = true;
        alarmAudioRef.current = audio;
      }

      alarmAudioRef.current.play()
        .then(() => {
          setIsAudioBlocked(false);
        })
        .catch(e => {
          console.log('Continuous alarm blocked by browser:', e);
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
  }, [hasUnreadOrders, readOrderIds]);

  useEffect(() => {
    // If new orders are detected in the queue, we can still trigger visual updates
    if (antrianOrders.length > prevAntrianCount.current) {
      router.refresh();
    }
    prevAntrianCount.current = antrianOrders.length;
  }, [antrianOrders.length]);

  // State variables moved to top

  const currentOrders = activeTab === 'antrian' ? antrianOrders : selesaiOrders;

  const filteredOrders = currentOrders.filter((o) => {
    const matchesSearch =
      o.id.toLowerCase().includes(search.toLowerCase()) ||
      o.customerName.toLowerCase().includes(search.toLowerCase());
    const matchesType = typeFilter === 'ALL' || o.orderType === typeFilter;
    return matchesSearch && matchesType;
  });

  const getNextStatus = (status: string, orderType: string, paymentMethod?: string, paymentProofUrl?: string | null) => {
    if (status === 'PENDING_PAYMENT' && ['QRIS', 'TRANSFER'].includes(paymentMethod || '') && !paymentProofUrl) {
      return 'PENDING';
    }
    if (orderType === 'DELIVERY') {
      const map: Record<string, string> = {
        PENDING: 'PREPARING',
        PENDING_PAYMENT: 'PREPARING',
        PREPARING: 'READY',
      };
      return map[status];
    } else {
      const map: Record<string, string> = {
        PENDING: 'PREPARING',
        PENDING_PAYMENT: 'PREPARING',
        PREPARING: 'READY',
        READY: 'COMPLETED',
      };
      return map[status];
    }
  };

  const advanceStatus = async (orderId: string, nextStatus: string) => {
    if (!nextStatus) return;
    setIsUpdating(orderId);
    try {
      const res = await fetch(`/api/cashier/orders/${orderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus }),
      });
      if (!res.ok) throw new Error('Failed');
      router.refresh();
      showToast('Status pesanan berhasil diperbarui', 'success');
    } catch {
      showToast('Error updating order', 'error');
    } finally {
      setIsUpdating(null);
    }
  };

  const handleCancelOrder = async (orderId: string, reason: string) => {
    setIsUpdating(orderId);
    try {
      const res = await fetch(`/api/cashier/orders/${orderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'CANCELLED', reason }),
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed');
      }
      setSelectedOrder(null);
      router.refresh();
      showToast('Pesanan berhasil dibatalkan', 'success');
    } catch (err: any) {
      showToast(err.message || 'Gagal membatalkan pesanan', 'error');
    } finally {
      setIsUpdating(null);
    }
  };

  const handleAssignDriver = async (driverId: string) => {
    if (!selectedOrderIdForCourier) return;
    try {
      const res = await fetch(`/api/admin/orders/${selectedOrderIdForCourier}/assign`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ driverId }),
      });
      if (!res.ok) throw new Error('Failed to assign driver');
      router.refresh();
      showToast('Kurir berhasil ditugaskan', 'success');
    } catch (err) {
      console.error(err);
      showToast('Gagal menugaskan kurir', 'error');
    }
  };

  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'COMPLETED':
      case 'DELIVERED':
        return 'bg-emerald-50 text-emerald-700';
      case 'READY':
        return 'bg-blue-50 text-blue-700';
      case 'PREPARING':
        return 'bg-amber-50 text-amber-700';
      case 'ON_DELIVERY':
        return 'bg-violet-50 text-violet-700';
      case 'ASSIGNED':
        return 'bg-cyan-50 text-cyan-700';
      case 'PENDING_PAYMENT':
        return 'bg-orange-50 text-orange-700';
      case 'CANCELLED':
        return 'bg-red-50 text-red-700';
      default:
        return 'bg-slate-100 text-slate-600';
    }
  };

  const getTypeStyle = (type: string) => {
    switch (type) {
      case 'PICKUP':
        return 'bg-purple-50 text-purple-700';
      case 'DELIVERY':
        return 'bg-sky-50 text-sky-700';
      default:
        return 'bg-slate-100 text-slate-600';
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold font-heading text-foreground">Pesanan Hari Ini</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          {orders.length} pesanan · Total {formatRupiah(orders.reduce((s, o) => s + o.total, 0))}
        </p>
      </div>

      {isAudioBlocked && hasUnreadOrders && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-sm animate-in fade-in duration-300">
          <div className="flex items-center gap-2.5">
            <Bell className="w-5 h-5 text-red-600 animate-bounce shrink-0" />
            <div>
              <p className="text-xs font-bold text-red-950">Ada Pesanan Belum Dibuka!</p>
              <p className="text-[11px] text-red-700 leading-relaxed">Browser memblokir pemutaran alarm otomatis. Klik tombol di samping untuk mengaktifkan alarm suara.</p>
            </div>
          </div>
          <button
            onClick={() => {
              if (alarmAudioRef.current) {
                alarmAudioRef.current.play()
                  .then(() => setIsAudioBlocked(false))
                  .catch(err => console.log('Play retry failed:', err));
              } else {
                const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
                audio.loop = true;
                alarmAudioRef.current = audio;
                audio.play()
                  .then(() => setIsAudioBlocked(false))
                  .catch(err => console.log('Init play failed:', err));
              }
            }}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-xl active:scale-[0.98] transition-all shrink-0 shadow-sm"
          >
            Aktifkan Suara
          </button>
        </div>
      )}

      {/* Tabs: Antrian / Selesai */}
      <div className="flex gap-2 p-1 bg-gray-100 rounded-xl">
        <button
          onClick={() => setActiveTab('antrian')}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold transition-all ${
            activeTab === 'antrian'
              ? 'bg-white text-amber-700 shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <AlertCircle className="w-4 h-4" />
          Antrian
          {antrianOrders.length > 0 && (
            <span className="px-1.5 py-0.5 rounded-full bg-red-500 text-white text-[10px] font-bold min-w-[20px] text-center">
              {antrianOrders.length}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab('selesai')}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold transition-all ${
            activeTab === 'selesai'
              ? 'bg-white text-emerald-700 shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <CheckCircle2 className="w-4 h-4" />
          Selesai Hari Ini
          <span className="text-[10px] text-muted-foreground">({selesaiOrders.length})</span>
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/50" />
          <input
            type="text"
            placeholder="Cari pesanan..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 text-sm bg-white border border-border/40 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-400 transition-all shadow-[0_1px_2px_rgba(0,0,0,0.04)]"
          />
        </div>
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="px-3 py-2.5 text-sm bg-white border border-border/40 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/20 shadow-[0_1px_2px_rgba(0,0,0,0.04)]"
        >
          <option value="ALL">Semua Tipe</option>
          <option value="PICKUP">Pickup</option>
          <option value="DELIVERY">Delivery</option>
        </select>
      </div>

      {/* Order Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {filteredOrders.length === 0 ? (
          <div className="col-span-full py-16 text-center text-muted-foreground/50 bg-white rounded-2xl border border-border/40">
            <Package className="w-10 h-10 mx-auto mb-2 opacity-30" />
            <p className="text-sm">
              {activeTab === 'antrian' ? 'Tidak ada pesanan dalam antrian' : 'Belum ada pesanan selesai'}
            </p>
          </div>
        ) : (
          filteredOrders.map((order) => {
            const TypeIcon = ORDER_TYPE_ICONS[order.orderType] || Package;
            return (
              <div
                key={order.id}
                className="bg-white rounded-2xl border border-border/40 shadow-[0_1px_2px_rgba(0,0,0,0.03)] hover:shadow-md transition-all duration-300 overflow-hidden"
              >
                <div className="p-4">
                  {/* Top row */}
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-xs font-bold text-amber-700">
                        #{order.id.slice(0, 8).toUpperCase()}
                      </span>
                      <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider ${getTypeStyle(order.orderType)}`}>
                        <TypeIcon className="w-3 h-3 inline mr-0.5 -mt-0.5" />
                        {ORDER_TYPE_LABELS[order.orderType]}
                      </span>
                      <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider ${getStatusStyle(order.status)}`}>
                        {order.status.replace('_', ' ')}
                      </span>
                      {order.paymentProofUrl && (
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-100 flex items-center gap-1">
                          📸 Bukti Ada
                        </span>
                      )}
                      {(order.status === 'PENDING' || order.status === 'PENDING_PAYMENT') && !readOrderIds.includes(order.id) && (
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-red-50 text-red-700 border border-red-200 animate-pulse flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-red-600 animate-ping shrink-0" />
                          Belum Dibuka
                        </span>
                      )}
                    </div>
                    <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {new Date(order.createdAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>

                  {/* Customer + Items */}
                  <div className="space-y-2 cursor-pointer hover:bg-slate-50/50 p-2 -mx-2 rounded-xl transition-colors" onClick={() => setSelectedOrder(order)}>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-[13px] font-semibold text-foreground">{order.customerName}</p>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <p className="text-[10px] text-muted-foreground">{order.customerPhone}</p>
                          <a
                            href={`https://wa.me/${formatWhatsAppNumber(order.customerPhone)}?text=${encodeURIComponent(getWhatsAppTemplate(order))}`}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center justify-center p-0.5 rounded bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition-colors border border-emerald-100/50 shadow-sm"
                            onClick={(e) => e.stopPropagation()}
                            title="Hubungi via WhatsApp"
                          >
                            <MessageCircle className="w-3 h-3 text-emerald-600" />
                          </a>
                        </div>
                      </div>
                      <span className="text-sm font-bold text-foreground">{formatRupiah(order.total)}</span>
                    </div>
                    <div className="space-y-0.5">
                      {order.items.slice(0, 3).map((item) => (
                        <p key={item.id} className="text-[12px] text-muted-foreground">
                          {item.qty}× {item.product.name}
                        </p>
                      ))}
                      {order.items.length > 3 && (
                        <p className="text-[11px] text-muted-foreground/60">
                          +{order.items.length - 3} item lainnya
                        </p>
                      )}
                    </div>
                    <button className="text-[11px] font-medium text-amber-600 flex items-center gap-1 mt-1 hover:text-amber-700">
                      <Eye className="w-3 h-3" />
                      Lihat Detail Pesanan
                    </button>
                  </div>
                </div>

                {/* Actions — only for active orders */}
                {activeTab === 'antrian' && (
                  <div className="px-4 py-3 bg-muted/20 border-t border-border/30 flex gap-2">
                    {order.orderType === 'DELIVERY' && order.status === 'READY' ? (
                      <button
                        onClick={() => {
                          setSelectedOrderIdForCourier(order.id);
                          setIsCourierModalOpen(true);
                        }}
                        className="flex-1 py-2.5 px-4 rounded-xl bg-gradient-to-r from-blue-600 to-blue-500 text-white font-semibold text-xs hover:opacity-90 transition-all shadow-sm active:scale-[0.98] flex items-center justify-center gap-1.5"
                      >
                        <UserPlus className="w-3.5 h-3.5" />
                        Tugaskan Kurir
                      </button>
                    ) : getNextStatus(order.status, order.orderType, order.paymentMethod, order.paymentProofUrl) ? (
                      (() => {
                        const nextStatus = getNextStatus(order.status, order.orderType, order.paymentMethod, order.paymentProofUrl)!;
                        const isAcceptPayment = nextStatus === 'PENDING';
                        return (
                          <button
                            onClick={() => advanceStatus(order.id, nextStatus)}
                            disabled={isUpdating === order.id}
                            className={`flex-[2] py-2.5 px-4 rounded-xl bg-gradient-to-r ${
                              isAcceptPayment 
                                ? 'from-emerald-600 to-emerald-500' 
                                : 'from-amber-600 to-amber-500'
                            } text-white font-semibold text-xs hover:opacity-90 transition-all disabled:opacity-50 shadow-sm active:scale-[0.98] flex items-center justify-center gap-1.5`}
                          >
                            {isUpdating === order.id ? (
                              'Mengupdate...'
                            ) : (
                              <>
                                {order.status === 'PREPARING' && <ChefHat className="w-3.5 h-3.5" />}
                                {order.status === 'READY' && <Check className="w-3.5 h-3.5" />}
                                {isAcceptPayment ? 'Terima Pembayaran' : `Ubah ke → ${nextStatus.replace('_', ' ')}`}
                              </>
                            )}
                          </button>
                        );
                      })()
                    ) : (
                       <div className="flex-1 text-center text-xs text-muted-foreground py-1">
                          Menunggu kurir...
                       </div>
                    )}
                    
                    <button
                      onClick={() => {
                        setCancelOrderId(order.id);
                        setCancelReason('Bukti Pembayaran Palsu');
                        setCustomReason('');
                        setIsCancelModalOpen(true);
                      }}
                      className="px-3 py-2.5 rounded-xl border border-red-200 bg-red-50 text-red-600 font-semibold text-xs hover:bg-red-100 transition-all shadow-sm flex items-center justify-center gap-1 active:scale-[0.98]"
                      title="Batalkan Pesanan"
                    >
                      <X className="w-3.5 h-3.5 shrink-0" />
                      <span>Batal</span>
                    </button>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      <CourierSelectModal
        isOpen={isCourierModalOpen}
        onClose={() => {
          setIsCourierModalOpen(false);
          setSelectedOrderIdForCourier(null);
        }}
        onSelectDriver={handleAssignDriver}
        orderId={selectedOrderIdForCourier || ''}
      />

      {/* Cancellation Confirmation Modal */}
      {isCancelModalOpen && cancelOrderId && (
        <div className="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center p-4 sm:p-6" onClick={() => setIsCancelModalOpen(false)}>
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200" onClick={e => e.stopPropagation()}>
            <div className="p-5 border-b border-border/40 flex justify-between items-start bg-slate-50/50">
              <div>
                <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                  <AlertCircle className="w-5 h-5 text-red-600" />
                  Batalkan Pesanan
                </h3>
                <p className="text-[11px] text-muted-foreground mt-0.5 font-mono">
                  #{cancelOrderId.slice(0, 8).toUpperCase()}
                </p>
              </div>
              <button 
                onClick={() => setIsCancelModalOpen(false)}
                className="p-1.5 text-muted-foreground hover:bg-slate-100 rounded-full transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <p className="text-xs text-muted-foreground leading-relaxed">
                Apakah Anda yakin ingin membatalkan pesanan ini? Poin, voucher, dan stok bahan (jika ada) akan dikembalikan secara otomatis.
              </p>

              <div className="space-y-2">
                <label className="text-xs font-semibold text-foreground">Alasan Pembatalan</label>
                <div className="grid grid-cols-1 gap-2">
                  {[
                    'Bukti Pembayaran Palsu',
                    'Stok Bahan Habis',
                    'Pelanggan Minta Batal',
                    'Lainnya'
                  ].map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setCancelReason(r)}
                      className={`w-full py-2.5 px-3 rounded-xl border text-left text-xs font-semibold transition-all ${
                        cancelReason === r
                          ? 'border-red-500 bg-red-50/50 text-red-700 shadow-sm'
                          : 'border-border/60 hover:bg-slate-50 text-foreground'
                      }`}
                    >
                      {r}
                    </button>
                  ))}
                </div>
              </div>

              {cancelReason === 'Lainnya' && (
                <div className="space-y-1.5 animate-in slide-in-from-top-1 duration-200">
                  <label className="text-xs font-semibold text-foreground">Tulis Alasan Manual</label>
                  <textarea
                    value={customReason}
                    onChange={(e) => setCustomReason(e.target.value)}
                    placeholder="Contoh: Toko tutup lebih awal / kendala operasional"
                    rows={3}
                    className="w-full p-3 text-xs bg-white border border-border/40 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all"
                  />
                </div>
              )}
            </div>

            <div className="p-5 border-t border-border/40 bg-slate-50/50 flex gap-3">
              <button
                onClick={() => setIsCancelModalOpen(false)}
                className="flex-1 py-2.5 rounded-xl border border-border/60 text-xs font-semibold hover:bg-slate-100 transition-colors"
              >
                Kembali
              </button>
              <button
                onClick={async () => {
                  const finalReason = cancelReason === 'Lainnya' ? (customReason.trim() || 'Lainnya') : cancelReason;
                  await handleCancelOrder(cancelOrderId, finalReason);
                  setIsCancelModalOpen(false);
                }}
                disabled={isUpdating === cancelOrderId || (cancelReason === 'Lainnya' && !customReason.trim())}
                className="flex-1 py-2.5 rounded-xl bg-red-600 text-white font-semibold text-xs hover:bg-red-700 transition-colors disabled:opacity-50 shadow-sm active:scale-[0.98] flex items-center justify-center"
              >
                {isUpdating === cancelOrderId ? 'Memproses...' : 'Ya, Batalkan'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 sm:p-6" onClick={() => setSelectedOrder(null)}>
          <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] flex flex-col shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="p-4 sm:p-5 border-b border-border/40 flex justify-between items-start bg-slate-50/50">
              <div>
                <h2 className="text-lg font-bold font-heading text-foreground">Detail Pesanan</h2>
                <p className="text-sm font-mono text-amber-700 font-semibold mt-0.5">#{selectedOrder.id.toUpperCase()}</p>
              </div>
              <button onClick={() => setSelectedOrder(null)} className="p-2 text-muted-foreground hover:bg-slate-100 rounded-full transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 sm:p-5 overflow-y-auto flex-1 space-y-6">
              {selectedOrder.status === 'CANCELLED' && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-xs text-red-700 font-semibold space-y-1">
                  <div className="flex items-center gap-1.5 font-bold uppercase">
                    🚫 Pesanan Dibatalkan
                  </div>
                  <p className="text-red-650">
                    Alasan: {selectedOrder.cancelReason || 'Tidak ada alasan khusus'}
                  </p>
                </div>
              )}

              {/* Customer Info */}
              <div className="bg-slate-50 rounded-xl p-4 space-y-3">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-xs text-muted-foreground mb-0.5">Pelanggan</p>
                    <p className="text-sm font-semibold text-foreground">{selectedOrder.customerName}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <p className="text-xs text-muted-foreground">{selectedOrder.customerPhone}</p>
                      <a
                        href={`https://wa.me/${formatWhatsAppNumber(selectedOrder.customerPhone)}?text=${encodeURIComponent(getWhatsAppTemplate(selectedOrder))}`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition-colors text-[10px] font-bold uppercase tracking-wider border border-emerald-100 shadow-sm"
                      >
                        <MessageCircle className="w-3.5 h-3.5 text-emerald-600" />
                        <span>WA</span>
                      </a>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground mb-0.5">Tipe Pesanan</p>
                    <span className={`inline-block px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider ${getTypeStyle(selectedOrder.orderType)}`}>
                      {ORDER_TYPE_LABELS[selectedOrder.orderType] || selectedOrder.orderType}
                    </span>
                    {selectedOrder.tableNumber && (
                      <p className="text-xs font-semibold text-foreground mt-1">Meja: {selectedOrder.tableNumber}</p>
                    )}
                  </div>
                </div>

                {selectedOrder.orderType === 'DELIVERY' && selectedOrder.address && (
                  <div className="pt-2 border-t border-border/20">
                    <p className="text-xs text-muted-foreground mb-1.5 flex items-center gap-1">
                      <MapPin className="w-3 h-3" />
                      Alamat Pengiriman
                    </p>
                    <p className="text-[13px] text-foreground leading-relaxed">
                      {selectedOrder.address.split('(')[0].trim()}
                    </p>
                    {(() => {
                      const match = selectedOrder.address.match(/\(([^,]+),\s*([^)]+)\)/);
                      if (match) {
                        const lat = match[1].trim();
                        const lng = match[2].trim();
                        return (
                          <>
                          <a
                            href={`https://www.google.com/maps/search/?api=1&query=${lat},${lng}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 mt-2 px-3 py-1.5 bg-blue-50 text-blue-600 rounded-lg text-xs font-semibold hover:bg-blue-100 transition-colors"
                          >
                            <MapPin className="w-3.5 h-3.5" />
                            Buka di Google Maps
                          </a>
                          <div className="mt-3 w-full h-64 rounded-xl overflow-hidden border border-border/40 shadow-inner">
                            <iframe
                              width="100%"
                              height="100%"
                              style={{ border: 0 }}
                              loading="lazy"
                              allowFullScreen
                              referrerPolicy="no-referrer-when-downgrade"
                              src={`https://maps.google.com/maps?saddr=${storeLat},${storeLng}&daddr=${lat},${lng}&t=&z=15&ie=UTF8&iwloc=&output=embed`}
                            ></iframe>
                          </div>
                        </>
                      );
                    }
                    return null;
                  })()}
                </div>
              )}
              </div>

              {/* Payment Proof for Cashier review */}
              {selectedOrder.paymentProofUrl && (
                <div className="bg-emerald-50/50 rounded-xl p-4 border border-emerald-150 space-y-3">
                  <h3 className="text-sm font-bold text-emerald-950 flex items-center gap-1.5">
                    <ImageIcon className="w-4 h-4 text-emerald-700" />
                    {selectedOrder.paymentProofUrl === '/verified-cashier.svg' ? 'Status Pembayaran' : 'Bukti Pembayaran (Sudah Diunggah)'}
                  </h3>
                  <div className="relative w-full aspect-[4/3] max-w-[280px] mx-auto rounded-xl overflow-hidden border border-emerald-200 bg-white group shadow-sm">
                    <img 
                      src={selectedOrder.paymentProofUrl} 
                      alt="Bukti Pembayaran" 
                      className={`w-full h-full ${selectedOrder.paymentProofUrl === '/verified-cashier.svg' ? 'object-contain p-2' : 'object-cover group-hover:scale-[1.02]'} transition-all duration-300`}
                    />
                    {selectedOrder.paymentProofUrl !== '/verified-cashier.svg' && (
                      <a 
                        href={selectedOrder.paymentProofUrl} 
                        target="_blank" 
                        rel="noreferrer" 
                        className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center text-white text-xs font-bold transition-opacity gap-1 cursor-pointer"
                      >
                        <ImageIcon className="w-5 h-5 text-white" />
                        <span>Buka Ukuran Penuh</span>
                      </a>
                    )}
                  </div>
                </div>
              )}

              {/* Order Items */}
              <div>
                <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                  <Package className="w-4 h-4 text-muted-foreground" />
                  Daftar Pesanan
                </h3>
                <div className="space-y-3">
                  {selectedOrder.items.map((item) => (
                    <div key={item.id} className="flex justify-between items-center gap-4 pb-3 border-b border-border/40 last:border-0 last:pb-0">
                      <div className="flex items-center gap-3">
                        {/* Product Image */}
                        <div className="w-12 h-12 rounded-lg overflow-hidden bg-slate-100 border border-border/20 relative shrink-0">
                          {item.product.image ? (
                            <Image
                              src={item.product.image}
                              alt={item.product.name}
                              fill
                              className="object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <Package className="w-5 h-5 text-muted-foreground/30" />
                            </div>
                          )}
                          <div className="absolute top-0 right-0 bg-amber-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-bl-lg">
                            {item.qty}x
                          </div>
                        </div>
                        
                        <div>
                          <p className="text-sm font-semibold text-foreground">{item.product.name}</p>
                          <p className="text-[11px] text-muted-foreground">{formatRupiah(item.price)}</p>
                        </div>
                      </div>
                      <p className="text-sm font-bold text-foreground">{formatRupiah(item.price * item.qty)}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="p-4 sm:p-5 border-t border-border/40 bg-slate-50/50">
              <div className="flex justify-between items-center mb-4">
                <p className="text-sm font-medium text-muted-foreground">Total Pembayaran</p>
                <p className="text-lg font-bold text-foreground">{formatRupiah(selectedOrder.total)}</p>
              </div>
              <div className="flex gap-3">
                {selectedOrder.status === 'PENDING_PAYMENT' && ['QRIS', 'TRANSFER'].includes(selectedOrder.paymentMethod) && !selectedOrder.paymentProofUrl && (
                  <button
                    onClick={async () => {
                      await advanceStatus(selectedOrder.id, 'PENDING');
                      setSelectedOrder(null);
                    }}
                    disabled={isUpdating === selectedOrder.id}
                    className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-500 text-white text-sm font-semibold hover:opacity-90 transition-all disabled:opacity-50"
                  >
                    {isUpdating === selectedOrder.id ? 'Memproses...' : 'Terima Pembayaran'}
                  </button>
                )}
                {ACTIVE_STATUSES.includes(selectedOrder.status) && (
                  <button
                    onClick={() => {
                      setCancelOrderId(selectedOrder.id);
                      setCancelReason('Bukti Pembayaran Palsu');
                      setCustomReason('');
                      setIsCancelModalOpen(true);
                    }}
                    className="flex-1 py-2.5 rounded-xl bg-red-50 text-red-600 border border-red-200 text-sm font-semibold hover:bg-red-100 transition-colors"
                  >
                    Batalkan Pesanan
                  </button>
                )}
                <button onClick={() => setSelectedOrder(null)} className="flex-1 py-2.5 rounded-xl border border-border/60 text-sm font-semibold hover:bg-slate-50 transition-colors">
                  Tutup
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
