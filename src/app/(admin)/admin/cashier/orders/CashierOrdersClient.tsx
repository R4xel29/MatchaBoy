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
  MapPin
} from 'lucide-react';
import { useEffect, useRef } from 'react';
import { CourierSelectModal } from '@/components/admin/CourierSelectModal';

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
  createdAt: string;
  items: OrderItem[];
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

export default function CashierOrdersClient({ initialOrders, storeLat, storeLng }: Props) {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<TabType>('antrian');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [isUpdating, setIsUpdating] = useState<string | null>(null);

  // Split orders by tab
  const ACTIVE_STATUSES = ['PENDING', 'PENDING_PAYMENT', 'PREPARING', 'READY', 'ASSIGNED', 'ON_DELIVERY'];
  const DONE_STATUSES = ['COMPLETED', 'DELIVERED', 'CANCELLED'];

  const antrianOrders = initialOrders.filter(o => ACTIVE_STATUSES.includes(o.status));
  const selesaiOrders = initialOrders.filter(o => DONE_STATUSES.includes(o.status));

  // Auto-refresh and Notification Logic
  const prevAntrianCount = useRef(antrianOrders.length);

  useEffect(() => {
    const interval = setInterval(() => {
      router.refresh();
    }, 10000); // Refresh every 10 seconds

    return () => clearInterval(interval);
  }, [router]);

  useEffect(() => {
    // If new orders are detected in the queue
    if (antrianOrders.length > prevAntrianCount.current) {
      const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
      audio.play().catch(e => console.log('Audio play blocked by browser:', e));
    }
    prevAntrianCount.current = antrianOrders.length;
  }, [antrianOrders.length]);

  // Courier Selection State
  const [isCourierModalOpen, setIsCourierModalOpen] = useState(false);
  const [selectedOrderIdForCourier, setSelectedOrderIdForCourier] = useState<string | null>(null);

  // Detail Modal State
  const [selectedOrder, setSelectedOrder] = useState<OrderData | null>(null);

  const currentOrders = activeTab === 'antrian' ? antrianOrders : selesaiOrders;

  const filteredOrders = currentOrders.filter((o) => {
    const matchesSearch =
      o.id.toLowerCase().includes(search.toLowerCase()) ||
      o.customerName.toLowerCase().includes(search.toLowerCase());
    const matchesType = typeFilter === 'ALL' || o.orderType === typeFilter;
    return matchesSearch && matchesType;
  });

  const getNextStatus = (status: string, orderType: string) => {
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

  const advanceStatus = async (orderId: string, currentStatus: string, orderType: string) => {
    const nextStatus = getNextStatus(currentStatus, orderType);
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
    } catch {
      alert('Error updating order');
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
    } catch (err) {
      console.error(err);
      alert('Gagal menugaskan kurir');
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
          {initialOrders.length} pesanan · Total {formatRupiah(initialOrders.reduce((s, o) => s + o.total, 0))}
        </p>
      </div>

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
                        <p className="text-[10px] text-muted-foreground">{order.customerPhone}</p>
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
                  <div className="px-4 py-3 bg-muted/20 border-t border-border/30">
                    {order.orderType === 'DELIVERY' && order.status === 'READY' ? (
                      <button
                        onClick={() => {
                          setSelectedOrderIdForCourier(order.id);
                          setIsCourierModalOpen(true);
                        }}
                        className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-blue-600 to-blue-500 text-white font-semibold text-xs hover:opacity-90 transition-all shadow-sm active:scale-[0.98] flex items-center justify-center gap-1.5"
                      >
                        <UserPlus className="w-3.5 h-3.5" />
                        Tugaskan Kurir
                      </button>
                    ) : getNextStatus(order.status, order.orderType) ? (
                      <button
                        onClick={() => advanceStatus(order.id, order.status, order.orderType)}
                        disabled={isUpdating === order.id}
                        className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-amber-600 to-amber-500 text-white font-semibold text-xs hover:opacity-90 transition-all disabled:opacity-50 shadow-sm active:scale-[0.98] flex items-center justify-center gap-1.5"
                      >
                        {isUpdating === order.id ? (
                          'Mengupdate...'
                        ) : (
                          <>
                            {order.status === 'PREPARING' && <ChefHat className="w-3.5 h-3.5" />}
                            {order.status === 'READY' && <Check className="w-3.5 h-3.5" />}
                            Ubah ke → {getNextStatus(order.status, order.orderType)?.replace('_', ' ')}
                          </>
                        )}
                      </button>
                    ) : (
                       <div className="text-center text-xs text-muted-foreground py-1">
                          Menunggu kurir...
                       </div>
                    )}
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
              {/* Customer Info */}
              <div className="bg-slate-50 rounded-xl p-4 space-y-3">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-xs text-muted-foreground mb-0.5">Pelanggan</p>
                    <p className="text-sm font-semibold text-foreground">{selectedOrder.customerName}</p>
                    <p className="text-xs text-muted-foreground">{selectedOrder.customerPhone}</p>
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
