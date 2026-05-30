'use client';

import { useState, useEffect, useMemo } from 'react';
import Image from 'next/image';
import { Search, RefreshCw, Bell, BellRing, ChevronDown, ChevronUp, Package, TrendingUp, Users, ShieldAlert, Send, Mail, Phone } from 'lucide-react';
import { formatRupiah, cn } from '@/lib/utils';
import { useToast } from '@/components/ui/Toast';

interface Subscriber {
  id: string;
  userName: string | null;
  userEmail: string | null;
  userPhone: string | null;
  phone: string | null;
  email: string | null;
  isSent: boolean;
  createdAt: string;
}

interface ProductGroup {
  productId: string;
  productName: string;
  productImage: string | null;
  productBadge: string | null;
  productPrice: number;
  subscriberCount: number;
  sentCount: number;
  subscribers: Subscriber[];
}

export default function AdminNotifyMeClient() {
  const [products, setProducts] = useState<ProductGroup[]>([]);
  const [totalSubscriptions, setTotalSubscriptions] = useState(0);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const { showToast } = useToast();

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/notify-me');
      if (!res.ok) throw new Error('Gagal memuat data');
      const data = await res.json();
      setProducts(data.products);
      setTotalSubscriptions(data.totalSubscriptions);
    } catch (err) {
      console.error(err);
      showToast('Gagal memuat data stock alerts.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSendNotification = async (productId: string, productName: string) => {
    setActionLoading(productId);
    try {
      const res = await fetch('/api/admin/notify-me', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId }),
      });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();

      // Update local state
      setProducts((prev) =>
        prev.map((p) =>
          p.productId === productId
            ? {
                ...p,
                sentCount: p.subscriberCount,
                subscribers: p.subscribers.map((s) => ({ ...s, isSent: true })),
              }
            : p
        )
      );

      showToast(`Notifikasi restock ${productName} berhasil dikirim ke ${data.notifiedCount} subscriber!`, 'success');
    } catch (err) {
      console.error(err);
      showToast(`Gagal mengirim notifikasi untuk ${productName}.`, 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const filteredProducts = useMemo(() => {
    return products.filter((p) =>
      p.productName.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [products, searchTerm]);

  // Stats
  const topProduct = products.length > 0 ? products[0] : null;
  const recentlyRestocked = products.filter((p) => p.sentCount > 0 && p.sentCount === p.subscriberCount).length;

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
          <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-bl from-brand-500/10 to-transparent rounded-bl-full" />
          <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-wider text-muted-foreground mb-1">
            <Bell className="w-3.5 h-3.5 text-brand-600" />
            Total Subscriptions
          </div>
          <p className="text-2xl font-black text-foreground">{totalSubscriptions}</p>
          <p className="text-[10px] text-muted-foreground mt-0.5">di {products.length} produk</p>
        </div>

        <div className="bg-card rounded-2xl border border-border p-5 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-bl from-rose-500/10 to-transparent rounded-bl-full" />
          <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-wider text-muted-foreground mb-1">
            <TrendingUp className="w-3.5 h-3.5 text-rose-600" />
            Top Demand
          </div>
          <p className="text-lg font-black text-foreground line-clamp-1">{topProduct?.productName || '-'}</p>
          <p className="text-[10px] text-muted-foreground mt-0.5">
            {topProduct ? `${topProduct.subscriberCount} subscriber menunggu` : 'Belum ada data'}
          </p>
        </div>

        <div className="bg-card rounded-2xl border border-border p-5 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-bl from-emerald-500/10 to-transparent rounded-bl-full" />
          <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-wider text-muted-foreground mb-1">
            <Package className="w-3.5 h-3.5 text-emerald-600" />
            Sudah Dinotifikasi
          </div>
          <p className="text-2xl font-black text-foreground">{recentlyRestocked}</p>
          <p className="text-[10px] text-muted-foreground mt-0.5">produk sudah dikirim restock alert</p>
        </div>
      </div>

      {/* Search & Refresh */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Cari produk..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm rounded-xl border border-border bg-card focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
          />
        </div>
        <button
          onClick={fetchData}
          disabled={loading}
          className="px-4 py-2 text-sm rounded-xl border border-border bg-card hover:bg-muted transition-colors flex items-center gap-1.5 font-bold shrink-0"
        >
          <RefreshCw className={cn('w-4 h-4', loading && 'animate-spin')} />
          Refresh
        </button>
      </div>

      {/* Product List — Demand Ranking */}
      <div className="space-y-3">
        {filteredProducts.map((p, index) => {
          const isExpanded = expandedId === p.productId;
          const unsentCount = p.subscriberCount - p.sentCount;
          const allSent = p.sentCount === p.subscriberCount;

          return (
            <div
              key={p.productId}
              className="bg-card rounded-2xl border border-border overflow-hidden hover:shadow-md transition-shadow"
            >
              {/* Main Row */}
              <div className="p-4 flex flex-col sm:flex-row sm:items-center gap-3">
                {/* Rank Badge */}
                <div className={cn(
                  'w-8 h-8 rounded-lg flex items-center justify-center shrink-0 font-black text-xs',
                  index === 0 ? 'bg-gradient-to-br from-amber-400 to-amber-500 text-white' :
                  index === 1 ? 'bg-gradient-to-br from-gray-300 to-gray-400 text-white' :
                  index === 2 ? 'bg-gradient-to-br from-orange-400 to-orange-500 text-white' :
                  'bg-muted text-muted-foreground'
                )}>
                  #{index + 1}
                </div>

                {/* Product Image & Info */}
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  {p.productImage ? (
                    <div className="relative w-12 h-12 rounded-xl overflow-hidden shrink-0 border border-border bg-brand-50">
                      <Image src={p.productImage} alt={p.productName} fill className="object-cover" />
                    </div>
                  ) : (
                    <div className="w-12 h-12 rounded-xl shrink-0 border border-border bg-brand-50/50 flex items-center justify-center text-lg">
                      🍵
                    </div>
                  )}
                  <div className="min-w-0">
                    <h4 className="font-bold text-sm text-foreground line-clamp-1">{p.productName}</h4>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[11px] text-brand-700 font-bold">{formatRupiah(p.productPrice)}</span>
                      {p.productBadge === 'sold-out' && (
                        <span className="px-1.5 py-0.5 rounded-full bg-red-100 text-red-700 text-[9px] font-black uppercase">Sold Out</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Subscriber Count */}
                <div className="flex items-center gap-2 shrink-0">
                  <div className="text-center px-3">
                    <div className="flex items-center gap-1.5 justify-center">
                      <Users className="w-3.5 h-3.5 text-brand-600" />
                      <span className="text-lg font-black text-foreground">{p.subscriberCount}</span>
                    </div>
                    <p className="text-[9px] text-muted-foreground font-bold uppercase">Subscribers</p>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => handleSendNotification(p.productId, p.productName)}
                    disabled={actionLoading === p.productId || allSent}
                    className={cn(
                      'py-1.5 px-3 text-[10px] font-bold rounded-xl border transition-colors flex items-center gap-1',
                      allSent
                        ? 'border-gray-200 text-gray-400 bg-gray-50 cursor-not-allowed'
                        : 'border-brand-500 text-brand-700 bg-brand-50/20 hover:bg-brand-50/50'
                    )}
                    title={allSent ? 'Semua sudah dinotifikasi' : 'Kirim notifikasi restock'}
                  >
                    {actionLoading === p.productId ? (
                      <span className="w-3 h-3 border-2 border-brand-600 border-t-transparent rounded-full animate-spin" />
                    ) : allSent ? (
                      <BellRing className="w-3 h-3" />
                    ) : (
                      <Send className="w-3 h-3" />
                    )}
                    {allSent ? 'Sudah Dikirim' : `Kirim (${unsentCount})`}
                  </button>

                  <button
                    onClick={() => setExpandedId(isExpanded ? null : p.productId)}
                    className="py-1.5 px-2 text-[10px] font-bold rounded-xl border border-border text-muted-foreground hover:bg-muted transition-colors"
                  >
                    {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              {/* Expanded Subscriber Details */}
              {isExpanded && (
                <div className="px-4 pb-4 pt-0 border-t border-border/40">
                  <p className="text-[9px] font-black uppercase tracking-wider text-muted-foreground mt-3 mb-2">
                    Daftar Subscriber ({p.subscribers.length})
                  </p>
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {p.subscribers.map((sub) => (
                      <div
                        key={sub.id}
                        className={cn(
                          'flex items-center gap-3 px-3 py-2 rounded-xl text-[11px]',
                          sub.isSent ? 'bg-emerald-50/50 border border-emerald-100' : 'bg-muted/50 border border-border/50'
                        )}
                      >
                        <div className={cn(
                          'w-6 h-6 rounded-full flex items-center justify-center shrink-0',
                          sub.isSent ? 'bg-emerald-100 text-emerald-700' : 'bg-brand-100 text-brand-700'
                        )}>
                          {sub.isSent ? <BellRing className="w-3 h-3" /> : <Bell className="w-3 h-3" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-foreground">{sub.userName || 'Guest'}</p>
                          <div className="flex items-center gap-3 text-muted-foreground">
                            {(sub.userEmail || sub.email) && (
                              <span className="flex items-center gap-0.5">
                                <Mail className="w-3 h-3" />
                                {sub.userEmail || sub.email}
                              </span>
                            )}
                            {(sub.userPhone || sub.phone) && (
                              <span className="flex items-center gap-0.5">
                                <Phone className="w-3 h-3" />
                                {sub.userPhone || sub.phone}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-[9px] text-muted-foreground">{new Date(sub.createdAt).toLocaleDateString('id-ID')}</p>
                          <span className={cn(
                            'text-[8px] font-black uppercase',
                            sub.isSent ? 'text-emerald-600' : 'text-amber-600'
                          )}>
                            {sub.isSent ? 'TERKIRIM' : 'MENUNGGU'}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {filteredProducts.length === 0 && !loading && (
        <div className="text-center py-12 bg-card border border-dashed border-border rounded-2xl space-y-2">
          <ShieldAlert className="w-10 h-10 text-muted-foreground mx-auto" />
          <h4 className="font-bold text-sm text-foreground">Tidak Ada Data</h4>
          <p className="text-xs text-muted-foreground">Belum ada pelanggan yang subscribe notifikasi stok.</p>
        </div>
      )}
    </div>
  );
}
