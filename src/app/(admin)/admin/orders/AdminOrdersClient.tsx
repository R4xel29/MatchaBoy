'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { formatRupiah } from '@/lib/utils';
import { Search, MapPin, Package, Clock, ExternalLink } from 'lucide-react';
import type { Order, OrderItem, Product } from '@prisma/client';

type OrderWithItems = Order & { 
  items: (OrderItem & { product: Product })[] 
};

interface Props {
  initialOrders: OrderWithItems[];
}

export default function AdminOrdersClient({ initialOrders }: Props) {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [isUpdating, setIsUpdating] = useState<string | null>(null);

  const filteredOrders = initialOrders.filter(o => {
    const matchesSearch = 
      o.id.toLowerCase().includes(search.toLowerCase()) ||
      o.customerName.toLowerCase().includes(search.toLowerCase()) ||
      o.customerPhone.includes(search);
    
    const matchesStatus = statusFilter === 'ALL' || o.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const nextStatusMap: Record<string, string> = {
    'PENDING_PAYMENT': 'ASSIGNED', // If Midtrans was skipped, fast track to processing
    'ASSIGNED': 'TO_STORE',
    'TO_STORE': 'PICKED_UP',
    'PICKED_UP': 'ON_DELIVERY',
    'ON_DELIVERY': 'DELIVERED',
  };

  const advanceOrderStatus = async (orderId: string, currentStatus: string) => {
    const nextStatus = nextStatusMap[currentStatus];
    if (!nextStatus) return; // Sequence done

    setIsUpdating(orderId);
    try {
      const res = await fetch(`/api/admin/orders/${orderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus })
      });

      if (!res.ok) throw new Error('Failed to update status');
      router.refresh();
    } catch (error) {
      alert('Error updating order');
    } finally {
      setIsUpdating(null);
    }
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'DELIVERED': return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'ON_DELIVERY': return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'ASSIGNED': return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'PENDING_PAYMENT': return 'bg-rose-50 text-rose-700 border-rose-200';
      default: return 'bg-purple-50 text-purple-700 border-purple-200';
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-border/50 shadow-sm overflow-hidden">
      {/* Filters Bar */}
      <div className="p-4 border-b border-border/50 flex flex-col sm:flex-row gap-4 justify-between items-center bg-card">
        <div className="flex-1 flex gap-4 w-full">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search by ID, name, or phone..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm border border-border bg-background rounded-xl focus:outline-none focus:ring-2 focus:ring-matcha-500/30 transition-all"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 text-sm border border-border bg-background rounded-xl focus:outline-none focus:ring-2 focus:ring-matcha-500/30 outline-none"
          >
            <option value="ALL">All Statuses</option>
            <option value="ASSIGNED">New Order (Assigned)</option>
            <option value="TO_STORE">Driver To Store</option>
            <option value="PICKED_UP">Picked Up</option>
            <option value="ON_DELIVERY">On Delivery</option>
            <option value="DELIVERED">Delivered</option>
          </select>
        </div>
      </div>

      <div className="divide-y divide-border/50">
        {filteredOrders.length === 0 ? (
           <div className="p-12 text-center text-muted-foreground/70">
             <Package className="w-12 h-12 mx-auto mb-3 opacity-20" />
             <p>No orders found.</p>
           </div>
        ) : (
          filteredOrders.map(order => (
            <div key={order.id} className="p-5 hover:bg-muted/20 transition-colors">
              <div className="flex flex-col md:flex-row gap-6 justify-between">
                
                {/* Left Col: Order Info */}
                <div className="space-y-3 flex-1">
                  <div className="flex items-center gap-3">
                    <span className="font-mono font-bold text-matcha-700 text-sm">
                      {order.id.slice(0, 8).toUpperCase()}
                    </span>
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${getStatusBadgeColor(order.status)}`}>
                        {order.status.replace('_', ' ')}
                      </span>
                      <a href={`/admin/orders/${order.id}`} className="text-xs text-matcha-600 hover:underline ml-auto">
                        View Details →
                      </a>
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {new Date(order.createdAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-muted-foreground font-medium mb-1">Customer</p>
                      <p className="text-sm font-semibold">{order.customerName}</p>
                      <p className="text-xs text-muted-foreground">{order.customerPhone}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground font-medium mb-1">Payment</p>
                      <p className="text-sm font-semibold">{order.paymentMethod}</p>
                      <p className="text-xs font-bold text-matcha-700">{formatRupiah(order.total)}</p>
                    </div>
                  </div>

                  <div>
                    <p className="text-xs text-muted-foreground font-medium mb-1 flex items-center gap-1">
                      <MapPin className="w-3 h-3" /> Destination
                    </p>
                    <p className="text-sm line-clamp-2 pr-4">{order.address}</p>
                  </div>
                </div>

                {/* Right Col: Items & Actions */}
                <div className="flex-1 border-t md:border-t-0 md:border-l border-border/50 pt-4 md:pt-0 md:pl-6 flex flex-col justify-between">
                  <div className="space-y-2 mb-4">
                    <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Items ({order.items.length})</p>
                    <div className="space-y-1.5 line-clamp-3 overflow-y-auto max-h-24 pr-2 custom-scrollbar">
                      {order.items.map((item: any) => (
                        <div key={item.id} className="text-sm flex justify-between gap-4">
                          <span className="font-medium text-foreground">
                            {item.qty}x {item.product.name}
                          </span>
                          <span className="text-muted-foreground shrink-0">{formatRupiah(item.price * item.qty)}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    {order.status !== 'DELIVERED' && (
                      <button 
                        onClick={() => advanceOrderStatus(order.id, order.status)}
                        disabled={isUpdating === order.id}
                        className="flex-1 py-2 px-4 rounded-xl gradient-matcha text-white font-semibold text-sm hover:opacity-90 transition-opacity disabled:opacity-50"
                      >
                        {isUpdating === order.id ? 'Updating...' : `Advance to ${nextStatusMap[order.status]?.replace('_', ' ') || 'Done'}`}
                      </button>
                    )}
                    <button 
                      onClick={() => window.open(`/orders/${order.id}`, '_blank')}
                      className="p-2.5 rounded-xl border border-border bg-muted/50 hover:bg-muted text-muted-foreground transition-colors"
                      title="View public tracking page"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </button>
                  </div>
                </div>

              </div>
            </div>
          ))
        )}
      </div>

    </div>
  );
}
