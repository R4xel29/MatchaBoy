'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { formatRupiah } from '@/lib/utils';
import { Search, MapPin, Package, Clock, ArrowUpRight, ShoppingBag, Truck, UserPlus, Bell } from 'lucide-react';
import { useEffect, useRef } from 'react';
import { CourierSelectModal } from '@/components/admin/CourierSelectModal';

interface OrderItem { id: string; qty: number; price: number; product: { name: string; image: string | null; }; }
interface OrderData {
  id: string; customerName: string; customerPhone: string; address: string;
  orderType: string; paymentMethod: string; total: number; status: string; createdAt: string; items: OrderItem[];
  paymentProofUrl?: string | null;
}
interface Props { initialOrders: OrderData[]; }

export default function AdminOrdersClient({ initialOrders }: Props) {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [isUpdating, setIsUpdating] = useState<string | null>(null);
  const [orders, setOrders] = useState(initialOrders);

  // Sync when server-side initialOrders changes (e.g. after manual action)
  useEffect(() => {
    setOrders(initialOrders);
  }, [initialOrders]);

  // Lightweight client-side polling (no router.refresh = no full server recompile)
  const prevOrdersCount = useRef(orders.length);

  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const res = await fetch('/api/admin/orders?format=json');
        if (res.ok) {
          const data = await res.json();
          if (data.orders) setOrders(data.orders);
        }
      } catch {}
    }, 15000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    // If new orders are detected
    if (orders.length > prevOrdersCount.current) {
      const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
      audio.play().catch(e => console.log('Audio play blocked by browser:', e));
    }
    prevOrdersCount.current = orders.length;
  }, [orders.length]);

  const [isCourierModalOpen, setIsCourierModalOpen] = useState(false);
  const [selectedOrderIdForCourier, setSelectedOrderIdForCourier] = useState<string | null>(null);

  const filteredOrders = orders.filter(o => {
    const matchesSearch = o.id.toLowerCase().includes(search.toLowerCase()) || o.customerName.toLowerCase().includes(search.toLowerCase()) || o.customerPhone.includes(search);
    const matchesStatus = statusFilter === 'ALL' || o.status === statusFilter;
    const matchesType = typeFilter === 'ALL' || o.orderType === typeFilter;
    return matchesSearch && matchesStatus && matchesType;
  });

  const getNextStatus = (status: string, orderType: string) => {
    if (orderType === 'DELIVERY') {
      const map: Record<string, string> = {
        'PENDING': 'PREPARING',
        'PENDING_PAYMENT': 'PREPARING',
        'PREPARING': 'READY',
      };
      return map[status];
    } else {
      const map: Record<string, string> = {
        'PENDING': 'PREPARING',
        'PENDING_PAYMENT': 'PREPARING',
        'PREPARING': 'READY',
        'READY': 'COMPLETED',
      };
      return map[status];
    }
  };

  const advanceOrderStatus = async (orderId: string, currentStatus: string, orderType: string) => {
    const nextStatus = getNextStatus(currentStatus, orderType);
    if (!nextStatus) return;
    setIsUpdating(orderId);
    try {
      const res = await fetch(`/api/admin/orders/${orderId}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: nextStatus }) });
      if (!res.ok) throw new Error('Failed');
      router.refresh();
    } catch { alert('Error updating order'); }
    finally { setIsUpdating(null); }
  };

  const handleAssignDriver = async (driverId: string) => {
    if (!selectedOrderIdForCourier) return;
    const res = await fetch(`/api/admin/orders/${selectedOrderIdForCourier}/assign`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ driverId }),
    });
    if (!res.ok) throw new Error('Failed to assign driver');
    router.refresh();
  };

  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'PENDING': return 'bg-orange-50 text-orange-700 border border-orange-100';
      case 'PENDING_PAYMENT': return 'bg-rose-50 text-rose-700 border border-rose-100';
      case 'PREPARING': return 'bg-sky-50 text-sky-700 border border-sky-100';
      case 'READY': return 'bg-indigo-50 text-indigo-700 border border-indigo-100';
      case 'COMPLETED': return 'bg-emerald-50 text-emerald-700 border border-emerald-100';
      case 'DELIVERED': return 'bg-emerald-50 text-emerald-700 border border-emerald-100';
      case 'ON_DELIVERY': return 'bg-blue-50 text-blue-700 border border-blue-100';
      case 'PICKED_UP': return 'bg-violet-50 text-violet-700 border border-violet-100';
      case 'TO_STORE': return 'bg-cyan-50 text-cyan-700 border border-cyan-100';
      case 'ASSIGNED': return 'bg-amber-50 text-amber-700 border border-amber-100';
      case 'CANCELLED': return 'bg-gray-50 text-gray-500 border border-gray-100';
      default: return 'bg-rose-50 text-rose-700 border border-rose-100';
    }
  };

  return (
    <>
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/50" />
          <input type="text" placeholder="Search orders..." value={search} onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 text-sm bg-white border border-border/40 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-400 transition-all shadow-[0_1px_2px_rgba(0,0,0,0.04)]" />
        </div>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2.5 text-sm bg-white border border-border/40 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
          <option value="ALL">All Statuses</option>
          <option value="PENDING_PAYMENT">Pending Payment</option>
          <option value="PENDING">Pending</option>
          <option value="PREPARING">Preparing</option>
          <option value="READY">Ready</option>
          <option value="ASSIGNED">Assigned</option>
          <option value="TO_STORE">To Store</option>
          <option value="PICKED_UP">Picked Up</option>
          <option value="ON_DELIVERY">On Delivery</option>
          <option value="DELIVERED">Delivered</option>
          <option value="COMPLETED">Completed</option>
          <option value="CANCELLED">Cancelled</option>
        </select>
        <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}
          className="px-3 py-2.5 text-sm bg-white border border-border/40 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
          <option value="ALL">All Types</option>
          <option value="DELIVERY">Delivery</option>
          <option value="PICKUP">Pickup</option>
        </select>
      </div>

      {/* Order Cards */}
      <div className="space-y-3">
        {filteredOrders.length === 0 ? (
          <div className="py-16 text-center text-muted-foreground/50 bg-white rounded-2xl border border-border/40">
            <Package className="w-10 h-10 mx-auto mb-2 opacity-30" />
            <p className="text-sm">No orders found</p>
          </div>
        ) : (
          filteredOrders.map(order => (
            <div key={order.id} className="bg-white rounded-2xl border border-border/40 shadow-[0_1px_2px_rgba(0,0,0,0.03)] hover:shadow-md transition-all duration-300 overflow-hidden">
              <div className="p-4 sm:p-5">
                {/* Top Row */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    <a href={`/admin/orders/${order.id}`} className="font-mono text-xs font-bold text-brand-700 hover:underline underline-offset-2">
                      #{order.id.slice(0, 8).toUpperCase()}
                    </a>
                    <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider ${getStatusStyle(order.status)}`}>
                      {order.status.replace('_', ' ')}
                    </span>
                    <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider ${
                      order.orderType === 'PICKUP' ? 'bg-purple-50 text-purple-700' :
                      'bg-sky-50 text-sky-700'
                    }`}>
                      {order.orderType === 'PICKUP' ? 'Pickup' : 'Delivery'}
                    </span>
                    {order.paymentProofUrl && (
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-100 flex items-center gap-1">
                        📸 Bukti Ada
                      </span>
                    )}
                  </div>
                  <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {new Date(order.createdAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>

                {/* Content Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <div>
                      <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-0.5">Customer</p>
                      <p className="text-[13px] font-semibold text-foreground">{order.customerName}</p>
                      <p className="text-[11px] text-muted-foreground">{order.customerPhone}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-0.5 flex items-center gap-1"><MapPin className="w-3 h-3" /> Address</p>
                      <p className="text-[12px] text-foreground line-clamp-2">{order.address}</p>
                    </div>
                  </div>
                  <div>
                    <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Items ({order.items.length})</p>
                    <div className="space-y-1 max-h-20 overflow-y-auto pr-1">
                      {order.items.map((item: any) => (
                        <div key={item.id} className="flex justify-between text-[12px]">
                          <span className="text-foreground">{item.qty}× {item.product.name}</span>
                          <span className="text-muted-foreground ml-2 shrink-0">{formatRupiah(item.price * item.qty)}</span>
                        </div>
                      ))}
                    </div>
                    <div className="flex items-center justify-between mt-2 pt-2 border-t border-border/30">
                      <span className="text-[11px] text-muted-foreground">{order.paymentMethod}</span>
                      <span className="text-sm font-bold text-foreground">{formatRupiah(order.total)}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 px-4 sm:px-5 py-3 bg-muted/20 border-t border-border/30">
                {order.orderType === 'DELIVERY' && order.status === 'READY' ? (
                  <button
                    onClick={() => {
                      setSelectedOrderIdForCourier(order.id);
                      setIsCourierModalOpen(true);
                    }}
                    className="flex-1 py-2 px-4 rounded-xl bg-blue-600 text-white font-semibold text-xs hover:bg-blue-700 transition-all shadow-sm active:scale-[0.98] flex items-center justify-center gap-1.5"
                  >
                    <UserPlus className="w-3.5 h-3.5" /> Tugaskan Kurir
                  </button>
                ) : getNextStatus(order.status, order.orderType) && order.status !== 'DELIVERED' ? (
                  <button onClick={() => advanceOrderStatus(order.id, order.status, order.orderType)} disabled={isUpdating === order.id}
                    className="flex-1 py-2 px-4 rounded-xl gradient-brand text-white font-semibold text-xs hover:opacity-90 transition-all disabled:opacity-50 shadow-sm active:scale-[0.98]">
                    {isUpdating === order.id ? 'Updating...' : `Advance → ${getNextStatus(order.status, order.orderType)?.replace('_', ' ')}`}
                  </button>
                ) : (
                  <div className="flex-1 text-center text-xs text-muted-foreground font-medium">
                    {order.status === 'DELIVERED' ? 'Selesai' : 'Menunggu kurir'}
                  </div>
                )}
                <a href={`/admin/orders/${order.id}`} className="flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-semibold text-brand-700 bg-brand-50 hover:bg-brand-100 transition-colors">
                  Detail <ArrowUpRight className="w-3 h-3" />
                </a>
              </div>
            </div>
          ))
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
    </>
  );
}
