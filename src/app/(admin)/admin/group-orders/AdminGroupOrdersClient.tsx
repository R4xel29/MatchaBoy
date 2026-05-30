'use client';

import { useState, useEffect, useMemo } from 'react';
import Image from 'next/image';
import { Search, RefreshCw, ChevronDown, ChevronUp, ShoppingCart, Users, DollarSign, X, ShieldAlert, Lock, Package } from 'lucide-react';
import { formatRupiah, cn } from '@/lib/utils';
import { useToast } from '@/components/ui/Toast';

interface GroupItem {
  id: string;
  productId: string;
  productName: string;
  productImage: string | null;
  memberName: string;
  qty: number;
  price: number;
  modifiers: string | null;
  createdAt: string;
}

interface GroupOrder {
  id: string;
  creatorId: string;
  creatorName: string;
  creatorPhone: string;
  creatorEmail: string;
  status: string;
  itemsCount: number;
  totalParticipants: number;
  participants: string[];
  totalPrice: number;
  items: GroupItem[];
  createdAt: string;
  updatedAt: string;
}

export default function AdminGroupOrdersClient() {
  const [orders, setOrders] = useState<GroupOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'CHECKED_OUT' | 'CANCELLED'>('ALL');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const { showToast } = useToast();

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/group-orders');
      if (!res.ok) throw new Error('Gagal memuat data');
      const data = await res.json();
      setOrders(data.groupOrders);
    } catch (err) {
      console.error(err);
      showToast('Gagal memuat data group orders.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleAction = async (id: string, action: 'close' | 'cancel') => {
    const labels = { close: 'ditutup', cancel: 'dibatalkan' };
    setActionLoading(id);
    try {
      const res = await fetch('/api/admin/group-orders', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, action }),
      });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();

      setOrders((prev) =>
        prev.map((o) =>
          o.id === id ? { ...o, status: data.groupOrder.status, updatedAt: data.groupOrder.updatedAt } : o
        )
      );
      showToast(`Group order berhasil ${labels[action]}.`, 'success');
    } catch (err) {
      console.error(err);
      showToast(`Gagal ${labels[action]} group order.`, 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const filteredOrders = useMemo(() => {
    return orders.filter((o) => {
      const matchesSearch =
        o.creatorName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        o.creatorPhone.toLowerCase().includes(searchTerm.toLowerCase()) ||
        o.id.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesStatus =
        statusFilter === 'ALL' || o.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [orders, searchTerm, statusFilter]);

  // Stats
  const activeOrders = orders.filter((o) => o.status === 'ACTIVE').length;
  const totalGroupRevenue = orders
    .filter((o) => o.status === 'CHECKED_OUT')
    .reduce((sum, o) => sum + o.totalPrice, 0);
  const avgGroupSize = orders.length > 0
    ? (orders.reduce((sum, o) => sum + o.totalParticipants, 0) / orders.length).toFixed(1)
    : '0';

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return (
          <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[9px] font-black tracking-wide uppercase flex items-center gap-1 w-fit">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Active
          </span>
        );
      case 'CHECKED_OUT':
        return (
          <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 text-[9px] font-black tracking-wide uppercase w-fit">
            Checked Out
          </span>
        );
      case 'CANCELLED':
        return (
          <span className="px-2 py-0.5 rounded-full bg-red-100 text-red-800 text-[9px] font-black tracking-wide uppercase w-fit">
            Cancelled
          </span>
        );
      default:
        return (
          <span className="px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 text-[9px] font-black tracking-wide uppercase w-fit">
            {status}
          </span>
        );
    }
  };

  const parseModifiers = (modifiers: string | null): Record<string, string> => {
    if (!modifiers) return {};
    try {
      return JSON.parse(modifiers);
    } catch {
      return {};
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-card rounded-2xl border border-border p-5 animate-pulse">
              <div className="h-4 bg-muted rounded w-24 mb-2" />
              <div className="h-8 bg-muted rounded w-16" />
            </div>
          ))}
        </div>
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-card rounded-2xl border border-border p-5 animate-pulse">
            <div className="h-4 bg-muted rounded w-full mb-2" />
            <div className="h-4 bg-muted rounded w-2/3" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-card rounded-2xl border border-border p-5 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-bl from-emerald-500/10 to-transparent rounded-bl-full" />
          <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-wider text-muted-foreground mb-1">
            <ShoppingCart className="w-3.5 h-3.5 text-emerald-600" />
            Group Order Aktif
          </div>
          <p className="text-2xl font-black text-foreground">{activeOrders}</p>
          <p className="text-[10px] text-muted-foreground mt-0.5">dari {orders.length} total group order</p>
        </div>

        <div className="bg-card rounded-2xl border border-border p-5 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-bl from-amber-500/10 to-transparent rounded-bl-full" />
          <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-wider text-muted-foreground mb-1">
            <DollarSign className="w-3.5 h-3.5 text-amber-600" />
            Total Group Revenue
          </div>
          <p className="text-2xl font-black text-foreground">{formatRupiah(totalGroupRevenue)}</p>
          <p className="text-[10px] text-muted-foreground mt-0.5">dari group order yang sudah checkout</p>
        </div>

        <div className="bg-card rounded-2xl border border-border p-5 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-bl from-blue-500/10 to-transparent rounded-bl-full" />
          <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-wider text-muted-foreground mb-1">
            <Users className="w-3.5 h-3.5 text-blue-600" />
            Rata-rata Group Size
          </div>
          <p className="text-2xl font-black text-foreground">{avgGroupSize}</p>
          <p className="text-[10px] text-muted-foreground mt-0.5">peserta per group order</p>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Cari host atau ID group..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm rounded-xl border border-border bg-card focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
          />
        </div>
        <button
          onClick={fetchOrders}
          disabled={loading}
          className="px-4 py-2 text-sm rounded-xl border border-border bg-card hover:bg-muted transition-colors flex items-center gap-1.5 font-bold shrink-0"
        >
          <RefreshCw className={cn('w-4 h-4', loading && 'animate-spin')} />
          Refresh
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border select-none">
        <button
          onClick={() => setStatusFilter('ALL')}
          className={cn(
            'px-4 py-2 text-xs font-bold uppercase tracking-wider border-b-2 transition-all',
            statusFilter === 'ALL' ? 'border-brand-600 text-brand-700' : 'border-transparent text-muted-foreground hover:text-foreground'
          )}
        >
          Semua ({orders.length})
        </button>
        <button
          onClick={() => setStatusFilter('ACTIVE')}
          className={cn(
            'px-4 py-2 text-xs font-bold uppercase tracking-wider border-b-2 transition-all flex items-center gap-1.5',
            statusFilter === 'ACTIVE' ? 'border-brand-600 text-brand-700' : 'border-transparent text-muted-foreground hover:text-foreground'
          )}
        >
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          Aktif ({orders.filter(o => o.status === 'ACTIVE').length})
        </button>
        <button
          onClick={() => setStatusFilter('CHECKED_OUT')}
          className={cn(
            'px-4 py-2 text-xs font-bold uppercase tracking-wider border-b-2 transition-all',
            statusFilter === 'CHECKED_OUT' ? 'border-brand-600 text-brand-700' : 'border-transparent text-muted-foreground hover:text-foreground'
          )}
        >
          Checkout ({orders.filter(o => o.status === 'CHECKED_OUT').length})
        </button>
        <button
          onClick={() => setStatusFilter('CANCELLED')}
          className={cn(
            'px-4 py-2 text-xs font-bold uppercase tracking-wider border-b-2 transition-all',
            statusFilter === 'CANCELLED' ? 'border-brand-600 text-brand-700' : 'border-transparent text-muted-foreground hover:text-foreground'
          )}
        >
          Dibatalkan ({orders.filter(o => o.status === 'CANCELLED').length})
        </button>
      </div>

      {/* Orders List */}
      <div className="space-y-3">
        {filteredOrders.map((o) => {
          const isExpanded = expandedId === o.id;

          return (
            <div
              key={o.id}
              className="bg-card rounded-2xl border border-border overflow-hidden hover:shadow-md transition-shadow"
            >
              {/* Main Row */}
              <div className="p-4 flex flex-col sm:flex-row sm:items-center gap-3">
                {/* Host Avatar */}
                <div className={cn(
                  'w-10 h-10 rounded-xl flex items-center justify-center shrink-0 text-white font-black text-sm',
                  o.status === 'ACTIVE' ? 'bg-gradient-to-br from-emerald-500 to-emerald-600' :
                  o.status === 'CHECKED_OUT' ? 'bg-gradient-to-br from-blue-500 to-blue-600' :
                  'bg-gradient-to-br from-gray-400 to-gray-500'
                )}>
                  {o.creatorName.charAt(0).toUpperCase()}
                </div>

                {/* Host & Status */}
                <div className="flex-1 min-w-0 space-y-0.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4 className="font-bold text-sm text-foreground">{o.creatorName}</h4>
                    {getStatusBadge(o.status)}
                  </div>
                  <p className="text-[11px] text-muted-foreground font-medium">{o.creatorPhone}</p>
                </div>

                {/* Items & Participants */}
                <div className="flex items-center gap-4 shrink-0">
                  <div className="text-center">
                    <div className="flex items-center gap-1 justify-center">
                      <Package className="w-3.5 h-3.5 text-brand-600" />
                      <span className="text-sm font-black text-foreground">{o.itemsCount}</span>
                    </div>
                    <p className="text-[9px] text-muted-foreground font-bold uppercase">Items</p>
                  </div>
                  <div className="text-center">
                    <div className="flex items-center gap-1 justify-center">
                      <Users className="w-3.5 h-3.5 text-blue-600" />
                      <span className="text-sm font-black text-foreground">{o.totalParticipants}</span>
                    </div>
                    <p className="text-[9px] text-muted-foreground font-bold uppercase">Peserta</p>
                  </div>
                  <div className="text-center">
                    <span className="text-sm font-black text-brand-700">{formatRupiah(o.totalPrice)}</span>
                    <p className="text-[9px] text-muted-foreground font-bold uppercase">Total</p>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 shrink-0">
                  {o.status === 'ACTIVE' && (
                    <>
                      <button
                        onClick={() => handleAction(o.id, 'close')}
                        disabled={actionLoading === o.id}
                        className="py-1.5 px-3 text-[10px] font-bold rounded-xl border border-blue-200 text-blue-700 bg-blue-50/20 hover:bg-blue-50 transition-colors flex items-center gap-1"
                        title="Tutup Group Order"
                      >
                        <Lock className="w-3 h-3" /> Tutup
                      </button>
                      <button
                        onClick={() => handleAction(o.id, 'cancel')}
                        disabled={actionLoading === o.id}
                        className="py-1.5 px-3 text-[10px] font-bold rounded-xl border border-red-200 text-red-600 bg-red-50/10 hover:bg-red-50 transition-colors flex items-center gap-1"
                        title="Batalkan Group Order"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </>
                  )}

                  <button
                    onClick={() => setExpandedId(isExpanded ? null : o.id)}
                    className="py-1.5 px-2 text-[10px] font-bold rounded-xl border border-border text-muted-foreground hover:bg-muted transition-colors"
                  >
                    {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              {/* Expanded Details */}
              {isExpanded && (
                <div className="px-4 pb-4 pt-0 border-t border-border/40">
                  {/* Participants */}
                  <div className="mt-3 mb-3">
                    <p className="text-[9px] font-black uppercase tracking-wider text-muted-foreground mb-1.5">
                      Peserta ({o.participants.length})
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {o.participants.map((name, i) => (
                        <span
                          key={i}
                          className="px-2 py-0.5 rounded-full bg-brand-50 text-brand-700 text-[10px] font-bold border border-brand-100"
                        >
                          {name}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Items */}
                  <p className="text-[9px] font-black uppercase tracking-wider text-muted-foreground mb-2">
                    Daftar Item ({o.items.length})
                  </p>
                  <div className="space-y-2 max-h-72 overflow-y-auto">
                    {o.items.map((item) => {
                      const mods = parseModifiers(item.modifiers);
                      return (
                        <div
                          key={item.id}
                          className="flex items-center gap-3 px-3 py-2 rounded-xl bg-muted/50 border border-border/50"
                        >
                          {item.productImage ? (
                            <div className="relative w-10 h-10 rounded-lg overflow-hidden shrink-0 border border-border">
                              <Image src={item.productImage} alt={item.productName} fill className="object-cover" />
                            </div>
                          ) : (
                            <div className="w-10 h-10 rounded-lg shrink-0 border border-border bg-brand-50/50 flex items-center justify-center text-sm">
                              🍵
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="text-[11px] font-bold text-foreground line-clamp-1">{item.productName}</p>
                            <p className="text-[10px] text-muted-foreground">
                              oleh <span className="font-semibold text-foreground">{item.memberName}</span>
                              {' · '}x{item.qty}
                              {Object.entries(mods).length > 0 && (
                                <span className="ml-1">
                                  · {Object.entries(mods).map(([k, v]) => `${k}: ${v}`).join(', ')}
                                </span>
                              )}
                            </p>
                          </div>
                          <p className="text-[11px] font-bold text-brand-700 shrink-0">
                            {formatRupiah(item.price * item.qty)}
                          </p>
                        </div>
                      );
                    })}
                  </div>

                  {/* Meta */}
                  <div className="mt-3 pt-2.5 border-t border-border/40 flex flex-wrap gap-4 text-[10px] text-muted-foreground">
                    <span>Dibuat: {new Date(o.createdAt).toLocaleString('id-ID')}</span>
                    <span>Updated: {new Date(o.updatedAt).toLocaleString('id-ID')}</span>
                    <span className="font-mono text-[9px] bg-muted px-1.5 py-0.5 rounded">ID: {o.id.slice(0, 12)}...</span>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {filteredOrders.length === 0 && !loading && (
        <div className="text-center py-12 bg-card border border-dashed border-border rounded-2xl space-y-2">
          <ShieldAlert className="w-10 h-10 text-muted-foreground mx-auto" />
          <h4 className="font-bold text-sm text-foreground">Tidak Ada Group Order</h4>
          <p className="text-xs text-muted-foreground">Belum ada group order yang sesuai filter.</p>
        </div>
      )}
    </div>
  );
}
