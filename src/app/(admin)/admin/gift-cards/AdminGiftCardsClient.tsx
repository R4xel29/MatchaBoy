'use client';

import { useState, useEffect, useMemo } from 'react';
import { Search, Gift, Plus, X, Copy, Check, ShieldAlert, RefreshCw, CreditCard, TrendingUp, Tag } from 'lucide-react';
import { formatRupiah, cn } from '@/lib/utils';
import { useToast } from '@/components/ui/Toast';

interface GiftCardUser {
  id: string;
  name: string | null;
  phone: string | null;
  image: string | null;
}

interface GiftCardItem {
  id: string;
  code: string;
  senderId: string | null;
  sender: GiftCardUser | null;
  senderName: string;
  recipientPhone: string;
  amount: number;
  message: string | null;
  isClaimed: boolean;
  claimedById: string | null;
  claimedBy: GiftCardUser | null;
  claimedAt: string | null;
  createdAt: string;
  expiresAt: string | null;
}

interface GiftCardStats {
  totalIssued: number;
  totalClaimedValue: number;
  totalActiveValue: number;
  activeCount: number;
  claimedCount: number;
  expiredCount: number;
}

export default function AdminGiftCardsClient() {
  const [giftCards, setGiftCards] = useState<GiftCardItem[]>([]);
  const [stats, setStats] = useState<GiftCardStats | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'ALL' | 'ACTIVE' | 'CLAIMED' | 'EXPIRED'>('ALL');
  const [loading, setLoading] = useState(true);

  // Create modal
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newAmount, setNewAmount] = useState('');
  const [newRecipientPhone, setNewRecipientPhone] = useState('');
  const [newSenderName, setNewSenderName] = useState('');
  const [newMessage, setNewMessage] = useState('');
  const [newExpiresInDays, setNewExpiresInDays] = useState('90');
  const [submitting, setSubmitting] = useState(false);

  // Copied code
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const { showToast } = useToast();

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/gift-cards');
      if (!res.ok) throw new Error('Failed to fetch gift cards');
      const data = await res.json();
      setGiftCards(data.giftCards);
      setStats(data.stats);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Gagal memuat data gift card.';
      showToast(message, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const getGiftCardStatus = (gc: GiftCardItem): string => {
    if (gc.isClaimed) return 'CLAIMED';
    if (gc.expiresAt && new Date(gc.expiresAt) <= new Date()) return 'EXPIRED';
    return 'ACTIVE';
  };

  const filteredCards = useMemo(() => {
    return giftCards.filter((gc) => {
      const matchesSearch =
        !searchTerm ||
        gc.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
        gc.senderName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        gc.recipientPhone.includes(searchTerm) ||
        (gc.claimedBy?.name && gc.claimedBy.name.toLowerCase().includes(searchTerm.toLowerCase()));

      const status = getGiftCardStatus(gc);
      const matchesTab = activeTab === 'ALL' || status === activeTab;

      return matchesSearch && matchesTab;
    });
  }, [giftCards, searchTerm, activeTab]);

  const handleCreateGiftCard = async (e: React.FormEvent) => {
    e.preventDefault();
    const amount = Number(newAmount);
    if (isNaN(amount) || amount <= 0) {
      showToast('Masukkan jumlah nominal yang valid!', 'error');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/admin/gift-cards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount,
          recipientPhone: newRecipientPhone || '',
          senderName: newSenderName || 'Matchaboy Admin',
          message: newMessage || null,
          expiresInDays: newExpiresInDays ? Number(newExpiresInDays) : null,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to create gift card');
      }

      const data = await res.json();
      setGiftCards((prev) => [data.giftCard, ...prev]);

      showToast(`Gift card ${data.giftCard.code} berhasil dibuat!`, 'success');
      setIsCreateOpen(false);
      setNewAmount('');
      setNewRecipientPhone('');
      setNewSenderName('');
      setNewMessage('');
      setNewExpiresInDays('90');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Gagal membuat gift card.';
      showToast(message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const copyCode = (code: string, id: string) => {
    navigator.clipboard.writeText(code);
    setCopiedId(id);
    showToast('Kode berhasil disalin!', 'info');
    setTimeout(() => setCopiedId(null), 2000);
  };

  const STATUS_BADGE: Record<string, { label: string; color: string; dot: string }> = {
    ACTIVE: { label: 'Aktif', color: 'bg-emerald-100 text-emerald-800', dot: 'bg-emerald-500' },
    CLAIMED: { label: 'Diklaim', color: 'bg-blue-100 text-blue-800', dot: 'bg-blue-500' },
    EXPIRED: { label: 'Kedaluwarsa', color: 'bg-amber-100 text-amber-800', dot: 'bg-amber-500' },
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
              <div className="w-8 h-8 rounded-xl bg-brand-50 flex items-center justify-center">
                <Gift className="w-4 h-4 text-brand-600" />
              </div>
              <span className="text-[10px] font-black uppercase tracking-wider">Total Diterbitkan</span>
            </div>
            <p className="text-lg font-black text-foreground">{stats.totalIssued}</p>
          </div>

          <div className="bg-card rounded-2xl border border-border p-4 space-y-1">
            <div className="flex items-center gap-2 text-muted-foreground">
              <div className="w-8 h-8 rounded-xl bg-emerald-50 flex items-center justify-center">
                <Tag className="w-4 h-4 text-emerald-600" />
              </div>
              <span className="text-[10px] font-black uppercase tracking-wider">Aktif</span>
            </div>
            <p className="text-lg font-black text-foreground">{stats.activeCount}</p>
            <p className="text-[10px] text-muted-foreground">Nilai: {formatRupiah(stats.totalActiveValue)}</p>
          </div>

          <div className="bg-card rounded-2xl border border-border p-4 space-y-1">
            <div className="flex items-center gap-2 text-muted-foreground">
              <div className="w-8 h-8 rounded-xl bg-blue-50 flex items-center justify-center">
                <TrendingUp className="w-4 h-4 text-blue-600" />
              </div>
              <span className="text-[10px] font-black uppercase tracking-wider">Diklaim</span>
            </div>
            <p className="text-lg font-black text-foreground">{stats.claimedCount}</p>
            <p className="text-[10px] text-muted-foreground">Nilai: {formatRupiah(stats.totalClaimedValue)}</p>
          </div>

          <div className="bg-card rounded-2xl border border-border p-4 space-y-1">
            <div className="flex items-center gap-2 text-muted-foreground">
              <div className="w-8 h-8 rounded-xl bg-amber-50 flex items-center justify-center">
                <CreditCard className="w-4 h-4 text-amber-600" />
              </div>
              <span className="text-[10px] font-black uppercase tracking-wider">Kedaluwarsa</span>
            </div>
            <p className="text-lg font-black text-foreground">{stats.expiredCount}</p>
          </div>
        </div>
      )}

      {/* Search, Refresh & Create */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Cari kode, pengirim, atau penerima..."
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
        <button
          onClick={() => setIsCreateOpen(true)}
          className="px-4 py-2 text-sm rounded-xl gradient-brand text-white font-bold shadow-md hover:shadow-lg transition-all flex items-center gap-1.5"
        >
          <Plus className="w-3.5 h-3.5" />
          Buat Gift Card
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border select-none">
        {(['ALL', 'ACTIVE', 'CLAIMED', 'EXPIRED'] as const).map((tab) => {
          const labels: Record<string, string> = { ALL: 'Semua', ACTIVE: 'Aktif', CLAIMED: 'Diklaim', EXPIRED: 'Kedaluwarsa' };
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

      {/* Gift Cards List */}
      <div className="space-y-2">
        {filteredCards.map((gc) => {
          const status = getGiftCardStatus(gc);
          const badge = STATUS_BADGE[status] || STATUS_BADGE.EXPIRED;

          return (
            <div key={gc.id} className="bg-card rounded-2xl border border-border p-4 hover:shadow-md transition-shadow">
              <div className="flex items-center gap-3">
                {/* Gift Icon */}
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-50 to-emerald-50 border border-border flex items-center justify-center shrink-0">
                  <Gift className="w-5 h-5 text-brand-600" />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    {/* Code */}
                    <button
                      onClick={() => copyCode(gc.code, gc.id)}
                      className="font-mono text-sm font-black text-foreground bg-muted px-2 py-0.5 rounded-lg hover:bg-border transition-colors flex items-center gap-1"
                      title="Klik untuk menyalin"
                    >
                      {gc.code}
                      {copiedId === gc.id ? (
                        <Check className="w-3 h-3 text-emerald-500" />
                      ) : (
                        <Copy className="w-3 h-3 text-muted-foreground" />
                      )}
                    </button>

                    <span className={cn('px-2 py-0.5 rounded-full text-[9px] font-black tracking-wide uppercase flex items-center gap-1', badge.color)}>
                      <span className={cn('w-1.5 h-1.5 rounded-full', badge.dot, status === 'ACTIVE' && 'animate-pulse')} />
                      {badge.label}
                    </span>

                    <span className="font-black text-sm text-brand-700">{formatRupiah(gc.amount)}</span>
                  </div>

                  <div className="flex items-center gap-3 mt-1.5 text-[10px] text-muted-foreground font-medium flex-wrap">
                    <span>Dari: <strong className="text-foreground">{gc.senderName || gc.sender?.name || '-'}</strong></span>
                    {gc.recipientPhone && (
                      <span>Untuk: <strong className="text-foreground">{gc.recipientPhone}</strong></span>
                    )}
                    {gc.claimedBy && (
                      <span>Diklaim oleh: <strong className="text-foreground">{gc.claimedBy.name || gc.claimedBy.phone}</strong></span>
                    )}
                    <span>{new Date(gc.createdAt).toLocaleDateString('id-ID')}</span>
                    {gc.expiresAt && (
                      <span className="text-amber-600">Exp: {new Date(gc.expiresAt).toLocaleDateString('id-ID')}</span>
                    )}
                  </div>

                  {gc.message && (
                    <p className="text-[10px] text-muted-foreground mt-1 italic truncate">&quot;{gc.message}&quot;</p>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {filteredCards.length === 0 && !loading && (
        <div className="text-center py-12 bg-card border border-dashed border-border rounded-2xl space-y-2">
          <ShieldAlert className="w-10 h-10 text-muted-foreground mx-auto" />
          <h4 className="font-bold text-sm text-foreground">Tidak Ada Gift Card</h4>
          <p className="text-xs text-muted-foreground">Belum ada gift card atau sesuaikan filter pencarian.</p>
        </div>
      )}

      {/* Create Gift Card Modal */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setIsCreateOpen(false)} />

          <div className="bg-card w-full max-w-sm rounded-2xl shadow-2xl p-6 relative border border-border animate-in fade-in zoom-in-95 duration-200">
            <button
              onClick={() => setIsCreateOpen(false)}
              className="absolute top-4 right-4 text-muted-foreground hover:text-foreground w-7 h-7 rounded-full flex items-center justify-center bg-muted hover:bg-border transition-all"
            >
              <X className="w-4 h-4" />
            </button>

            <h3 className="font-heading font-black text-base text-foreground mb-1 flex items-center gap-2">
              <Gift className="w-5 h-5 text-brand-600" />
              Buat Gift Card Baru
            </h3>
            <p className="text-[11px] text-muted-foreground mb-4">Buat gift card baru dengan nominal tertentu.</p>

            <form onSubmit={handleCreateGiftCard} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">
                  Nominal (IDR) *
                </label>
                <input
                  type="number"
                  required
                  min="1000"
                  value={newAmount}
                  onChange={(e) => setNewAmount(e.target.value)}
                  className="w-full px-4 py-2.5 text-sm rounded-xl border border-border bg-card focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
                  placeholder="50000"
                />
                {/* Quick amount selectors */}
                <div className="flex gap-1.5 mt-1.5">
                  {[25000, 50000, 100000, 200000].map((amt) => (
                    <button
                      key={amt}
                      type="button"
                      onClick={() => setNewAmount(String(amt))}
                      className={cn(
                        'flex-1 py-1 text-[9px] font-bold rounded-lg border transition-all',
                        newAmount === String(amt) ? 'border-brand-500 bg-brand-50 text-brand-700' : 'border-border hover:bg-muted text-muted-foreground'
                      )}
                    >
                      {formatRupiah(amt)}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">
                  Nama Pengirim
                </label>
                <input
                  type="text"
                  value={newSenderName}
                  onChange={(e) => setNewSenderName(e.target.value)}
                  className="w-full px-4 py-2.5 text-sm rounded-xl border border-border bg-card focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
                  placeholder="Matchaboy Admin"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">
                  No. HP Penerima (Opsional)
                </label>
                <input
                  type="text"
                  value={newRecipientPhone}
                  onChange={(e) => setNewRecipientPhone(e.target.value)}
                  className="w-full px-4 py-2.5 text-sm rounded-xl border border-border bg-card focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
                  placeholder="08123456789"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">
                  Pesan (Opsional)
                </label>
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  className="w-full px-4 py-2.5 text-sm rounded-xl border border-border bg-card focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
                  placeholder="Selamat ulang tahun!"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">
                  Berlaku (hari)
                </label>
                <input
                  type="number"
                  min="1"
                  value={newExpiresInDays}
                  onChange={(e) => setNewExpiresInDays(e.target.value)}
                  className="w-full px-4 py-2.5 text-sm rounded-xl border border-border bg-card focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
                  placeholder="90"
                />
              </div>

              <div className="flex gap-2.5 pt-3.5 select-none">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="flex-1 py-3 px-4 rounded-xl border border-border hover:bg-muted text-xs font-bold transition-all"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 py-3 px-4 rounded-xl gradient-brand text-white text-xs font-bold shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-1.5"
                >
                  {submitting && <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin shrink-0" />}
                  Buat Gift Card
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
