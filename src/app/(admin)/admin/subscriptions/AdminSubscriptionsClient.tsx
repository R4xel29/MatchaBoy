'use client';

import { useState, useEffect, useMemo } from 'react';
import { Search, Crown, Calendar, Clock, X, Users, TrendingUp, Timer, ShieldAlert, RefreshCw, Play, Pause, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/components/ui/Toast';

interface SubscriptionUser {
  id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  image: string | null;
}

interface Subscription {
  id: string;
  userId: string;
  user: SubscriptionUser;
  tier: string;
  status: string;
  startedAt: string;
  expiresAt: string;
  createdAt: string;
  updatedAt: string;
}

interface SubStats {
  total: number;
  totalActive: number;
  totalExpired: number;
  totalCancelled: number;
  avgDuration: number;
}

const TIER_LABELS: Record<string, { label: string; color: string; bg: string }> = {
  GREEN_TEA: { label: 'Green Tea', color: 'text-emerald-700', bg: 'bg-emerald-50 border-emerald-200' },
  MATCHA_LATTE: { label: 'Matcha Latte', color: 'text-brand-700', bg: 'bg-brand-50 border-brand-200' },
  GOLDEN_MATCHA: { label: 'Golden Matcha', color: 'text-amber-700', bg: 'bg-amber-50 border-amber-200' },
};

const STATUS_LABELS: Record<string, { label: string; color: string; dot: string }> = {
  ACTIVE: { label: 'Aktif', color: 'bg-emerald-100 text-emerald-800', dot: 'bg-emerald-500' },
  EXPIRED: { label: 'Kedaluwarsa', color: 'bg-amber-100 text-amber-800', dot: 'bg-amber-500' },
  CANCELLED: { label: 'Dibatalkan', color: 'bg-red-100 text-red-800', dot: 'bg-red-500' },
};

export default function AdminSubscriptionsClient() {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [stats, setStats] = useState<SubStats | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'ALL' | 'ACTIVE' | 'EXPIRED' | 'CANCELLED'>('ALL');
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Extend modal
  const [isExtendOpen, setIsExtendOpen] = useState(false);
  const [selectedSub, setSelectedSub] = useState<Subscription | null>(null);
  const [extensionDays, setExtensionDays] = useState('30');

  const { showToast } = useToast();

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/subscriptions');
      if (!res.ok) throw new Error('Failed to fetch subscriptions');
      const data = await res.json();
      setSubscriptions(data.subscriptions);
      setStats(data.stats);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Gagal memuat data langganan.';
      showToast(message, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const getEffectiveStatus = (sub: Subscription): string => {
    if (sub.status === 'CANCELLED') return 'CANCELLED';
    if (sub.status === 'EXPIRED') return 'EXPIRED';
    if (sub.status === 'ACTIVE' && new Date(sub.expiresAt) <= new Date()) return 'EXPIRED';
    return sub.status;
  };

  const filteredSubs = useMemo(() => {
    return subscriptions.filter((sub) => {
      const matchesSearch =
        !searchTerm ||
        (sub.user.name && sub.user.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (sub.user.phone && sub.user.phone.includes(searchTerm)) ||
        (sub.user.email && sub.user.email.toLowerCase().includes(searchTerm.toLowerCase()));

      const effectiveStatus = getEffectiveStatus(sub);
      const matchesTab = activeTab === 'ALL' || effectiveStatus === activeTab;

      return matchesSearch && matchesTab;
    });
  }, [subscriptions, searchTerm, activeTab]);

  const handleAction = async (subscriptionId: string, action: string, days?: number) => {
    setActionLoading(subscriptionId);
    try {
      const res = await fetch('/api/admin/subscriptions', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subscriptionId, action, extensionDays: days }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to update subscription');
      }

      const data = await res.json();
      setSubscriptions((prev) =>
        prev.map((s) => (s.id === subscriptionId ? data.subscription : s))
      );

      const labels: Record<string, string> = {
        activate: 'diaktifkan',
        cancel: 'dibatalkan',
        expire: 'dikedaluwarsakan',
        extend: `diperpanjang ${days} hari`,
      };

      showToast(`Langganan berhasil ${labels[action] || 'diperbarui'}.`, 'success');
      setIsExtendOpen(false);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Gagal memperbarui langganan.';
      showToast(message, 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const openExtendModal = (sub: Subscription) => {
    setSelectedSub(sub);
    setExtensionDays('30');
    setIsExtendOpen(true);
  };

  const handleExtendSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSub) return;
    const days = Number(extensionDays);
    if (isNaN(days) || days <= 0) {
      showToast('Masukkan jumlah hari yang valid!', 'error');
      return;
    }
    handleAction(selectedSub.id, 'extend', days);
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-24 rounded-2xl bg-card border border-border animate-pulse" />
          ))}
        </div>
        <div className="h-12 rounded-xl bg-card border border-border animate-pulse" />
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-20 rounded-2xl bg-card border border-border animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Overview Cards */}
      {stats && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="bg-card rounded-2xl border border-border p-4 space-y-1">
            <div className="flex items-center gap-2 text-muted-foreground">
              <div className="w-8 h-8 rounded-xl bg-emerald-50 flex items-center justify-center">
                <Users className="w-4 h-4 text-emerald-600" />
              </div>
              <span className="text-[10px] font-black uppercase tracking-wider">Member Aktif</span>
            </div>
            <p className="text-lg font-black text-foreground">{stats.totalActive}</p>
          </div>

          <div className="bg-card rounded-2xl border border-border p-4 space-y-1">
            <div className="flex items-center gap-2 text-muted-foreground">
              <div className="w-8 h-8 rounded-xl bg-brand-50 flex items-center justify-center">
                <Crown className="w-4 h-4 text-brand-600" />
              </div>
              <span className="text-[10px] font-black uppercase tracking-wider">Total Langganan</span>
            </div>
            <p className="text-lg font-black text-foreground">{stats.total}</p>
          </div>

          <div className="bg-card rounded-2xl border border-border p-4 space-y-1">
            <div className="flex items-center gap-2 text-muted-foreground">
              <div className="w-8 h-8 rounded-xl bg-amber-50 flex items-center justify-center">
                <TrendingUp className="w-4 h-4 text-amber-600" />
              </div>
              <span className="text-[10px] font-black uppercase tracking-wider">Kedaluwarsa</span>
            </div>
            <p className="text-lg font-black text-foreground">{stats.totalExpired}</p>
          </div>

          <div className="bg-card rounded-2xl border border-border p-4 space-y-1">
            <div className="flex items-center gap-2 text-muted-foreground">
              <div className="w-8 h-8 rounded-xl bg-blue-50 flex items-center justify-center">
                <Timer className="w-4 h-4 text-blue-600" />
              </div>
              <span className="text-[10px] font-black uppercase tracking-wider">Rata-rata Durasi</span>
            </div>
            <p className="text-lg font-black text-foreground">{stats.avgDuration} hari</p>
          </div>
        </div>
      )}

      {/* Search & Filter */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Cari berdasarkan nama atau telepon..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm rounded-xl border border-border bg-card focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
          />
        </div>
        <button
          onClick={fetchData}
          className="px-4 py-2 text-sm rounded-xl border border-border bg-card hover:bg-muted transition-colors flex items-center gap-1.5 font-bold"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Refresh
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border select-none">
        {(['ALL', 'ACTIVE', 'EXPIRED', 'CANCELLED'] as const).map((tab) => {
          const labels: Record<string, string> = { ALL: 'Semua', ACTIVE: 'Aktif', EXPIRED: 'Kedaluwarsa', CANCELLED: 'Dibatalkan' };
          return (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={cn(
                'px-4 py-2 text-xs font-bold uppercase tracking-wider border-b-2 transition-all flex items-center gap-1.5',
                activeTab === tab ? 'border-brand-600 text-brand-700' : 'border-transparent text-muted-foreground hover:text-foreground'
              )}
            >
              {tab === 'ACTIVE' && <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />}
              {labels[tab]}
            </button>
          );
        })}
      </div>

      {/* Subscription List */}
      <div className="space-y-2">
        {filteredSubs.map((sub) => {
          const effectiveStatus = getEffectiveStatus(sub);
          const statusInfo = STATUS_LABELS[effectiveStatus] || STATUS_LABELS.EXPIRED;
          const tierInfo = TIER_LABELS[sub.tier] || { label: sub.tier, color: 'text-gray-700', bg: 'bg-gray-50 border-gray-200' };
          const isLoading = actionLoading === sub.id;
          const daysLeft = Math.max(0, Math.ceil((new Date(sub.expiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24)));

          return (
            <div key={sub.id} className="bg-card rounded-2xl border border-border p-4 hover:shadow-md transition-shadow">
              <div className="flex items-center gap-3">
                {/* Avatar */}
                <div className="w-10 h-10 rounded-full bg-brand-50 border border-border flex items-center justify-center text-sm font-bold text-brand-700 shrink-0 overflow-hidden">
                  {sub.user.image ? (
                    <img src={sub.user.image} alt={sub.user.name || ''} className="w-full h-full object-cover" />
                  ) : (
                    (sub.user.name || '?').charAt(0).toUpperCase()
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4 className="font-bold text-sm text-foreground">{sub.user.name || 'Tanpa Nama'}</h4>
                    <span className={cn('px-2 py-0.5 rounded-full text-[9px] font-black tracking-wide uppercase border', tierInfo.bg, tierInfo.color)}>
                      {tierInfo.label}
                    </span>
                    <span className={cn('px-2 py-0.5 rounded-full text-[9px] font-black tracking-wide uppercase flex items-center gap-1', statusInfo.color)}>
                      <span className={cn('w-1.5 h-1.5 rounded-full', statusInfo.dot, effectiveStatus === 'ACTIVE' && 'animate-pulse')} />
                      {statusInfo.label}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 mt-1 text-[10px] text-muted-foreground font-medium">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3 text-brand-600" />
                      {new Date(sub.startedAt).toLocaleDateString('id-ID')}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3 text-rose-600" />
                      {new Date(sub.expiresAt).toLocaleDateString('id-ID')}
                    </span>
                    {effectiveStatus === 'ACTIVE' && (
                      <span className="text-emerald-600 font-bold">{daysLeft} hari tersisa</span>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1.5 shrink-0">
                  {effectiveStatus !== 'ACTIVE' && (
                    <button
                      onClick={() => handleAction(sub.id, 'activate')}
                      disabled={isLoading}
                      className="px-2.5 py-1.5 text-[10px] font-bold rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 transition-colors flex items-center gap-1"
                      title="Aktifkan"
                    >
                      <Play className="w-3 h-3" /> Aktifkan
                    </button>
                  )}
                  <button
                    onClick={() => openExtendModal(sub)}
                    disabled={isLoading}
                    className="px-2.5 py-1.5 text-[10px] font-bold rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 transition-colors flex items-center gap-1"
                    title="Perpanjang"
                  >
                    <Timer className="w-3 h-3" /> Perpanjang
                  </button>
                  {effectiveStatus === 'ACTIVE' && (
                    <>
                      <button
                        onClick={() => handleAction(sub.id, 'expire')}
                        disabled={isLoading}
                        className="px-2.5 py-1.5 text-[10px] font-bold rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-700 transition-colors flex items-center gap-1"
                        title="Jeda"
                      >
                        <Pause className="w-3 h-3" />
                      </button>
                      <button
                        onClick={() => handleAction(sub.id, 'cancel')}
                        disabled={isLoading}
                        className="px-2.5 py-1.5 text-[10px] font-bold rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 transition-colors flex items-center gap-1"
                        title="Batalkan"
                      >
                        <XCircle className="w-3 h-3" />
                      </button>
                    </>
                  )}
                  {isLoading && <span className="w-4 h-4 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {filteredSubs.length === 0 && !loading && (
        <div className="text-center py-12 bg-card border border-dashed border-border rounded-2xl space-y-2">
          <ShieldAlert className="w-10 h-10 text-muted-foreground mx-auto" />
          <h4 className="font-bold text-sm text-foreground">Tidak Ada Langganan</h4>
          <p className="text-xs text-muted-foreground">Belum ada member yang berlangganan atau sesuaikan filter.</p>
        </div>
      )}

      {/* Extend Modal */}
      {isExtendOpen && selectedSub && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setIsExtendOpen(false)} />

          <div className="bg-card w-full max-w-sm rounded-2xl shadow-2xl p-6 relative border border-border animate-in fade-in zoom-in-95 duration-200">
            <button
              onClick={() => setIsExtendOpen(false)}
              className="absolute top-4 right-4 text-muted-foreground hover:text-foreground w-7 h-7 rounded-full flex items-center justify-center bg-muted hover:bg-border transition-all"
            >
              <X className="w-4 h-4" />
            </button>

            <h3 className="font-heading font-black text-base text-foreground mb-1 flex items-center gap-2">
              <Timer className="w-5 h-5 text-brand-600" />
              Perpanjang Langganan
            </h3>
            <p className="text-[11px] text-muted-foreground mb-4">
              Member: <strong>{selectedSub.user.name || 'Tanpa Nama'}</strong> — Berakhir: <strong>{new Date(selectedSub.expiresAt).toLocaleDateString('id-ID')}</strong>
            </p>

            <form onSubmit={handleExtendSubmit} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">
                  Jumlah Hari Perpanjangan
                </label>
                <input
                  type="number"
                  required
                  min="1"
                  value={extensionDays}
                  onChange={(e) => setExtensionDays(e.target.value)}
                  className="w-full px-4 py-2.5 text-sm rounded-xl border border-border bg-card focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
                  placeholder="30"
                />
              </div>

              {/* Quick Select */}
              <div className="flex gap-2">
                {[7, 14, 30, 60, 90].map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setExtensionDays(String(d))}
                    className={cn(
                      'flex-1 py-1.5 text-[10px] font-bold rounded-lg border transition-all',
                      extensionDays === String(d) ? 'border-brand-500 bg-brand-50 text-brand-700' : 'border-border hover:bg-muted text-muted-foreground'
                    )}
                  >
                    {d}h
                  </button>
                ))}
              </div>

              <div className="flex gap-2.5 pt-3.5 select-none">
                <button
                  type="button"
                  onClick={() => setIsExtendOpen(false)}
                  className="flex-1 py-3 px-4 rounded-xl border border-border hover:bg-muted text-xs font-bold transition-all"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={actionLoading !== null}
                  className="flex-1 py-3 px-4 rounded-xl gradient-brand text-white text-xs font-bold shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-1.5"
                >
                  {actionLoading && <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin shrink-0" />}
                  Perpanjang
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
