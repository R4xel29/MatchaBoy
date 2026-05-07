'use client';

import { useState } from 'react';
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
} from 'lucide-react';

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
  paymentMethod: string;
  total: number;
  status: string;
  createdAt: string;
  items: OrderItem[];
}

interface Props {
  initialOrders: OrderData[];
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

export default function CashierOrdersClient({ initialOrders }: Props) {
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

  const currentOrders = activeTab === 'antrian' ? antrianOrders : selesaiOrders;

  const filteredOrders = currentOrders.filter((o) => {
    const matchesSearch =
      o.id.toLowerCase().includes(search.toLowerCase()) ||
      o.customerName.toLowerCase().includes(search.toLowerCase());
    const matchesType = typeFilter === 'ALL' || o.orderType === typeFilter;
    return matchesSearch && matchesType;
  });

  const nextStatusMap: Record<string, string> = {
    PENDING: 'PREPARING',
    PENDING_PAYMENT: 'PREPARING',
    PREPARING: 'READY',
    READY: 'COMPLETED',
    ASSIGNED: 'PREPARING',
    ON_DELIVERY: 'DELIVERED',
  };

  const advanceStatus = async (orderId: string, currentStatus: string) => {
    const nextStatus = nextStatusMap[currentStatus];
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
                  <div className="space-y-2">
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
                  </div>
                </div>

                {/* Actions — only for active orders */}
                {activeTab === 'antrian' && nextStatusMap[order.status] && (
                  <div className="px-4 py-3 bg-muted/20 border-t border-border/30">
                    <button
                      onClick={() => advanceStatus(order.id, order.status)}
                      disabled={isUpdating === order.id}
                      className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-amber-600 to-amber-500 text-white font-semibold text-xs hover:opacity-90 transition-all disabled:opacity-50 shadow-sm active:scale-[0.98] flex items-center justify-center gap-1.5"
                    >
                      {isUpdating === order.id ? (
                        'Mengupdate...'
                      ) : (
                        <>
                          {order.status === 'PREPARING' && <ChefHat className="w-3.5 h-3.5" />}
                          {order.status === 'READY' && <Check className="w-3.5 h-3.5" />}
                          Ubah ke → {nextStatusMap[order.status]?.replace('_', ' ') || 'Done'}
                        </>
                      )}
                    </button>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
