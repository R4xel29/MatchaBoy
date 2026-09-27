'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import {
  Search,
  Wallet,
  ChevronDown,
  ChevronUp,
  Plus,
  Minus,
  X,
  TrendingUp,
  TrendingDown,
  Users,
  ShieldAlert,
  RefreshCw,
  QrCode,
  Building2,
  Store,
  Clock,
  Copy,
  Check,
  Sparkles,
  Gift,
  Eye,
  CheckCircle2,
  XCircle,
  Settings,
  AlertTriangle,
  Loader2,
} from 'lucide-react';
import { formatRupiah, cn } from '@/lib/utils';
import { useToast } from '@/components/ui/Toast';

interface WalletTransaction {
  id: string;
  amount: number;
  type: string;
  description: string;
  referenceId: string | null;
  status?: string;
  paymentMethod?: string | null;
  promoBonus?: number | null;
  paymentProofUrl?: string | null;
  createdAt: string;
  expiresAt?: string | null;
}

interface WalletUser {
  id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  image: string | null;
  walletBalance: number;
  walletTransactions: WalletTransaction[];
}

interface WalletStats {
  totalBalance: number;
  totalTopUps: number;
  totalTopUpCount: number;
  totalPayments: number;
  totalPaymentCount: number;
  totalUsers: number;
}

interface AdminWalletSettings {
  topUpEnabled: boolean;
  minTopUp: number;
  bonusMinAmount: number;
  bonusPercent: number;
  bonusMode: string;
  firstTimePromoEnabled: boolean;
  firstTimePromoPackages: Array<{ amount: number; bonus: number }>;
  transferEnabled: boolean;
  qrisExpireMinutes: number;
}

export default function AdminWalletClient() {
  const [users, setUsers] = useState<WalletUser[]>([]);
  const [stats, setStats] = useState<WalletStats | null>(null);
  const [banks, setBanks] = useState<any[]>([]);
  const [walletSettings, setWalletSettings] = useState<AdminWalletSettings | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [pendingFilterMethod, setPendingFilterMethod] = useState<'ALL' | 'OFFLINE' | 'BANK' | 'QRIS'>('ALL');
  const [pendingSearch, setPendingSearch] = useState('');
  const [expandedUserId, setExpandedUserId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<WalletUser | null>(null);
  const [adjustType, setAdjustType] = useState<'add' | 'deduct'>('add');
  const [adjustAmount, setAdjustAmount] = useState('');
  const [adjustReason, setAdjustReason] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [processingTxId, setProcessingTxId] = useState<string | null>(null);
  const [pendingTransactions, setPendingTransactions] = useState<any[]>([]);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [previewProofModal, setPreviewProofModal] = useState<{
    url: string;
    tx: any;
  } | null>(null);
  const [confirmActionModal, setConfirmActionModal] = useState<{
    tx: any;
    action: 'approve' | 'reject';
  } | null>(null);
  const [nowMs, setNowMs] = useState<number>(() => Date.now());

  const { showToast } = useToast();

  const fetchData = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const res = await fetch('/api/admin/wallet');
      if (!res.ok) throw new Error('Gagal memuat data Arus Pay');
      const data = await res.json();
      setUsers(data.users || []);
      setStats(data.stats || null);
      setBanks(data.banks || []);
      setWalletSettings(data.walletSettings || null);
      setPendingTransactions(data.pendingTransactions || []);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Gagal memuat data Arus Pay.';
      showToast(message, 'error');
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Live 1-second ticker for QRIS 15-minute countdown in Admin pending queue
  useEffect(() => {
    const hasQrisPending = pendingTransactions.some(
      (tx) => String(tx.paymentMethod || '').toUpperCase() === 'QRIS'
    );
    if (!hasQrisPending) return;

    const interval = setInterval(() => {
      const current = Date.now();
      setNowMs(current);

      // Check if any QRIS transaction just crossed the 15-minute expiry mark
      const expiredOne = pendingTransactions.find((tx) => {
        if (String(tx.paymentMethod || '').toUpperCase() !== 'QRIS' || tx.status !== 'PENDING') {
          return false;
        }
        const exp = tx.expiresAt
          ? new Date(tx.expiresAt).getTime()
          : new Date(tx.createdAt).getTime() + 15 * 60 * 1000;
        return current >= exp;
      });

      if (expiredOne) {
        fetchData(true);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [pendingTransactions]);

  const formatRemainingQris = (tx: any) => {
    const expMs = tx.expiresAt
      ? new Date(tx.expiresAt).getTime()
      : new Date(tx.createdAt).getTime() + 15 * 60 * 1000;
    const diffSec = Math.max(0, Math.floor((expMs - nowMs) / 1000));
    const mins = Math.floor(diffSec / 60);
    const secs = diffSec % 60;
    return {
      diffSec,
      label: `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`,
    };
  };

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    showToast(`Kode ${code} berhasil disalin!`, 'success');
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const filteredPending = useMemo(() => {
    return pendingTransactions.filter((tx) => {
      const m = String(tx.paymentMethod || 'OFFLINE').toUpperCase();
      if (pendingFilterMethod !== 'ALL' && m !== pendingFilterMethod) {
        return false;
      }
      if (pendingSearch.trim()) {
        const q = pendingSearch.toLowerCase().trim();
        const matchCode = tx.referenceId && String(tx.referenceId).toLowerCase().includes(q);
        const matchName = tx.user?.name && String(tx.user.name).toLowerCase().includes(q);
        const matchPhone = tx.user?.phone && String(tx.user.phone).toLowerCase().includes(q);
        return matchCode || matchName || matchPhone;
      }
      return true;
    });
  }, [pendingTransactions, pendingFilterMethod, pendingSearch]);

  const filteredUsers = useMemo(() => {
    if (!searchTerm) return users;
    const term = searchTerm.toLowerCase();
    return users.filter(
      (u) =>
        (u.name && u.name.toLowerCase().includes(term)) ||
        (u.phone && u.phone.includes(term)) ||
        (u.email && u.email.toLowerCase().includes(term)) ||
        u.walletTransactions.some(
          (tx) => tx.referenceId && tx.referenceId.toLowerCase().includes(term)
        )
    );
  }, [users, searchTerm]);

  const openAdjustModal = (user: WalletUser, type: 'add' | 'deduct') => {
    setSelectedUser(user);
    setAdjustType(type);
    setAdjustAmount('');
    setAdjustReason('');
    setIsModalOpen(true);
  };

  const executePendingAction = async (txId: string, action: 'approve' | 'reject') => {
    setProcessingTxId(txId);
    try {
      const res = await fetch('/api/admin/wallet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transactionId: txId, action }),
      });
      const d = await res.json();
      if (!res.ok) {
        throw new Error(d.error || 'Gagal memproses transaksi');
      }
      showToast(
        action === 'approve'
          ? 'Permintaan top up berhasil disetujui! Saldo pelanggan telah ditambahkan.'
          : 'Permintaan top up telah ditolak/dibatalkan.',
        'success'
      );
      setConfirmActionModal(null);
      setPreviewProofModal(null);
      fetchData(true);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Gagal memproses transaksi.';
      showToast(message, 'error');
      fetchData(true);
    } finally {
      setProcessingTxId(null);
    }
  };

  const handleAdjustBalance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;

    const amt = Number(adjustAmount);
    if (isNaN(amt) || amt <= 0) {
      showToast('Masukkan jumlah yang valid!', 'error');
      return;
    }

    const finalAmount = adjustType === 'deduct' ? -amt : amt;

    setSubmitting(true);
    try {
      const res = await fetch('/api/admin/wallet', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: selectedUser.id,
          amount: finalAmount,
          reason: adjustReason,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Gagal menyesuaikan saldo');
      }

      const data = await res.json();

      setUsers((prev) =>
        prev.map((u) =>
          u.id === selectedUser.id
            ? {
                ...u,
                walletBalance: data.user.walletBalance,
                walletTransactions: data.user.walletTransactions,
              }
            : u
        )
      );

      showToast(
        `Saldo ${selectedUser.name || 'Pelanggan'} berhasil ${
          adjustType === 'add' ? 'ditambahkan' : 'dikurangi'
        } ${formatRupiah(amt)}`,
        'success'
      );
      setIsModalOpen(false);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Gagal menyesuaikan saldo.';
      showToast(message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const getMethodMeta = (method?: string | null) => {
    const m = String(method || 'OFFLINE').toUpperCase();
    if (m === 'QRIS') {
      return {
        label: 'QRIS Instan',
        badgeClass: 'bg-orange-50 text-orange-700 border-orange-200',
        Icon: QrCode,
      };
    }
    if (m === 'BANK') {
      return {
        label: 'Transfer Bank',
        badgeClass: 'bg-amber-50 text-amber-800 border-amber-200',
        Icon: Building2,
      };
    }
    if (m === 'ADMIN' || m === 'DIRECT') {
      return {
        label: 'Penyesuaian Admin',
        badgeClass: 'bg-slate-100 text-slate-700 border-slate-200',
        Icon: Wallet,
      };
    }
    return {
      label: 'Kasir Booth',
      badgeClass: 'bg-orange-100/80 text-orange-900 border-orange-300',
      Icon: Store,
    };
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-24 rounded-2xl bg-card border border-border animate-pulse" />
          ))}
        </div>
        <div className="h-20 rounded-2xl bg-card border border-border animate-pulse" />
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-20 rounded-2xl bg-card border border-border animate-pulse" />
        ))}
      </div>
    );
  }

  const promoPkgs = walletSettings?.firstTimePromoPackages || [
    { amount: 50000, bonus: 3000 },
    { amount: 100000, bonus: 5000 },
    { amount: 200000, bonus: 10000 },
  ];

  return (
    <div className="space-y-5">
      {/* 1. OVERVIEW STATS CARDS */}
      {stats && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="bg-card rounded-2xl border border-amber-200/80 p-4 space-y-1 shadow-2xs">
            <div className="flex items-center gap-2 text-muted-foreground">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-orange-500 to-amber-500 text-white flex items-center justify-center shadow-2xs">
                <Wallet className="w-4 h-4" />
              </div>
              <span className="text-[10px] font-black uppercase tracking-wider">
                Total Saldo Aktif
              </span>
            </div>
            <p className="text-lg font-black text-orange-600">{formatRupiah(stats.totalBalance)}</p>
            <p className="text-[10px] text-muted-foreground">Saldo mengendap seluruh pelanggan</p>
          </div>

          <div className="bg-card rounded-2xl border border-border p-4 space-y-1 shadow-2xs">
            <div className="flex items-center gap-2 text-muted-foreground">
              <div className="w-8 h-8 rounded-xl bg-emerald-50 flex items-center justify-center">
                <TrendingUp className="w-4 h-4 text-emerald-600" />
              </div>
              <span className="text-[10px] font-black uppercase tracking-wider">
                Total Top Up Lunas
              </span>
            </div>
            <p className="text-lg font-black text-foreground">{formatRupiah(stats.totalTopUps)}</p>
            <p className="text-[10px] text-muted-foreground">
              {stats.totalTopUpCount} transaksi berhasil
            </p>
          </div>

          <div className="bg-card rounded-2xl border border-border p-4 space-y-1 shadow-2xs">
            <div className="flex items-center gap-2 text-muted-foreground">
              <div className="w-8 h-8 rounded-xl bg-rose-50 flex items-center justify-center">
                <TrendingDown className="w-4 h-4 text-rose-600" />
              </div>
              <span className="text-[10px] font-black uppercase tracking-wider">
                Total Pembelanjaan
              </span>
            </div>
            <p className="text-lg font-black text-foreground">
              {formatRupiah(stats.totalPayments)}
            </p>
            <p className="text-[10px] text-muted-foreground">
              {stats.totalPaymentCount} pesanan via Arus Pay
            </p>
          </div>

          <div className="bg-card rounded-2xl border border-border p-4 space-y-1 shadow-2xs">
            <div className="flex items-center gap-2 text-muted-foreground">
              <div className="w-8 h-8 rounded-xl bg-amber-50 flex items-center justify-center">
                <Users className="w-4 h-4 text-amber-600" />
              </div>
              <span className="text-[10px] font-black uppercase tracking-wider">
                Pemilik Saldo Aktif
              </span>
            </div>
            <p className="text-lg font-black text-foreground">{stats.totalUsers}</p>
            <p className="text-[10px] text-muted-foreground">Pelanggan dengan saldo &gt; Rp 0</p>
          </div>
        </div>
      )}

      {/* 2. ACTIVE ARUS PAY CONFIGURATION & RULES SUMMARY BANNER */}
      <div className="bg-gradient-to-r from-orange-50/90 via-amber-50/60 to-white rounded-2xl border border-amber-200/80 p-4 sm:p-5 space-y-3 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-amber-200/60 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-orange-500 to-amber-500 text-white flex items-center justify-center shrink-0 shadow-xs">
              <Sparkles className="w-4.5 h-4.5" />
            </div>
            <div>
              <h3 className="text-xs sm:text-sm font-black text-gray-900 flex items-center gap-2">
                <span>Status & Aturan Aktif Arus Pay</span>
                <span
                  className={cn(
                    'text-[9px] px-2 py-0.5 rounded-full font-black uppercase',
                    walletSettings?.topUpEnabled !== false
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-rose-100 text-rose-800'
                  )}
                >
                  {walletSettings?.topUpEnabled !== false ? 'Top Up Aktif' : 'Top Up Nonaktif'}
                </span>
              </h3>
              <p className="text-[11px] text-gray-600 font-medium">
                Tersinkronisasi otomatis dengan tampilan Top Up Pelanggan
              </p>
            </div>
          </div>

          <Link
            href="/admin/settings/payment-settings"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white hover:bg-amber-50 text-orange-700 border border-amber-200 text-[11px] font-extrabold transition-colors self-start sm:self-auto"
          >
            <Settings className="w-3.5 h-3.5" />
            <span>Atur Skema & Rekening</span>
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          {/* Promo Perdana Card */}
          <div className="bg-white/90 rounded-xl p-3 border border-amber-200/70 space-y-1.5">
            <div className="flex items-center gap-1.5 text-orange-700 font-black text-[10.5px] uppercase tracking-wider">
              <Gift className="w-3.5 h-3.5" />
              <span>Bonus Top Up Pertama</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {promoPkgs.map((pkg, i) => (
                <span
                  key={i}
                  className="text-[10px] font-bold bg-orange-50 text-orange-900 border border-orange-200/80 px-2 py-0.5 rounded-lg"
                >
                  {formatRupiah(pkg.amount)} → +{formatRupiah(pkg.bonus)}
                </span>
              ))}
            </div>
          </div>

          {/* Metode & Aturan Bukti Card */}
          <div className="bg-white/90 rounded-xl p-3 border border-amber-200/70 space-y-1">
            <div className="flex items-center gap-1.5 text-amber-900 font-black text-[10.5px] uppercase tracking-wider">
              <Clock className="w-3.5 h-3.5 text-orange-600" />
              <span>Batas Waktu & Verifikasi</span>
            </div>
            <p className="text-[11px] text-gray-700 font-semibold leading-snug">
              • <strong>QRIS:</strong> Batas waktu <strong>15 Menit</strong> (otomatis gagal &amp; batal jika lewat).
            </p>
            <p className="text-[11px] text-gray-700 font-semibold leading-snug">
              • <strong>Kasir Booth:</strong> Salin Kode Tiket • <strong>Bank:</strong> Unggah Bukti.
            </p>
          </div>

          {/* Status Rekening Bank Card */}
          <div className="bg-white/90 rounded-xl p-3 border border-amber-200/70 space-y-1">
            <div className="flex items-center gap-1.5 text-amber-900 font-black text-[10.5px] uppercase tracking-wider">
              <Building2 className="w-3.5 h-3.5 text-orange-600" />
              <span>Status Rekening Bank</span>
            </div>
            {banks.length > 0 ? (
              <>
                <p className="text-[11px] font-extrabold text-emerald-700">
                  {banks.length} Rekening Aktif Ditampilkan ke User
                </p>
                <p className="text-[10px] text-gray-500 truncate">
                  {banks.map((b) => `${b.bankName} (${b.accountNumber})`).join(', ')}
                </p>
              </>
            ) : (
              <div className="flex items-start gap-1.5 text-amber-800">
                <AlertTriangle className="w-3.5 h-3.5 text-orange-500 shrink-0 mt-0.5" />
                <p className="text-[10.5px] font-semibold leading-tight">
                  Belum ada rekening bank. Opsi <strong>Transfer Bank</strong> otomatis disembunyikan dari tampilan User.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 3. PENDING TOP-UP REQUESTS QUEUE */}
      <div className="bg-card rounded-2xl border border-amber-300/90 p-4 sm:p-5 space-y-4 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/60 pb-3.5">
          <div className="flex items-center gap-2.5">
            <span
              className={cn(
                'w-2.5 h-2.5 rounded-full shrink-0',
                pendingTransactions.length > 0 ? 'bg-orange-500 animate-ping' : 'bg-emerald-500'
              )}
            />
            <div>
              <h3 className="font-heading font-black text-sm sm:text-base text-foreground flex items-center gap-2">
                <span>Antrean Verifikasi Top-Up ({pendingTransactions.length})</span>
              </h3>
              <p className="text-[11px] text-muted-foreground">
                Cocokkan Kode Tiket Kasir Booth atau periksa Bukti Transfer Bank pelanggan sebelum konfirmasi lunas
              </p>
            </div>
          </div>

          {/* Filter Tabs by Method */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
            {[
              { id: 'ALL' as const, label: 'Semua', count: pendingTransactions.length },
              {
                id: 'OFFLINE' as const,
                label: 'Kasir Booth',
                count: pendingTransactions.filter(
                  (t) => String(t.paymentMethod || 'OFFLINE').toUpperCase() === 'OFFLINE'
                ).length,
              },
              {
                id: 'BANK' as const,
                label: 'Transfer Bank',
                count: pendingTransactions.filter(
                  (t) => String(t.paymentMethod || '').toUpperCase() === 'BANK'
                ).length,
              },
              {
                id: 'QRIS' as const,
                label: 'QRIS (15m)',
                count: pendingTransactions.filter(
                  (t) => String(t.paymentMethod || '').toUpperCase() === 'QRIS'
                ).length,
              },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setPendingFilterMethod(tab.id)}
                className={cn(
                  'px-2.5 py-1.5 rounded-xl text-[10.5px] font-black uppercase tracking-wider transition-all cursor-pointer whitespace-nowrap flex items-center gap-1',
                  pendingFilterMethod === tab.id
                    ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-xs'
                    : 'bg-muted text-muted-foreground hover:text-foreground'
                )}
              >
                <span>{tab.label}</span>
                <span
                  className={cn(
                    'px-1.5 py-0.2 rounded-full text-[9px]',
                    pendingFilterMethod === tab.id ? 'bg-white/20 text-white' : 'bg-background'
                  )}
                >
                  {tab.count}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Search Input for Pending Ticket Code / Customer */}
        {pendingTransactions.length > 0 && (
          <div className="relative">
            <Search className="absolute left-3.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Cari Kode Tiket Kasir (contoh: AS-TOPUP-...) atau nama pelanggan..."
              value={pendingSearch}
              onChange={(e) => setPendingSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-xs font-semibold rounded-xl border border-border bg-background focus:outline-none focus:border-orange-500"
            />
          </div>
        )}

        {filteredPending.length === 0 ? (
          <div className="py-8 text-center space-y-1.5 bg-muted/20 rounded-xl border border-dashed border-border">
            <CheckCircle2 className="w-7 h-7 text-emerald-500 mx-auto" />
            <p className="text-xs font-bold text-foreground">
              Tidak ada antrean top up pending untuk filter ini
            </p>
            <p className="text-[11px] text-muted-foreground">
              Permintaan top up baru dari pelanggan akan langsung muncul di sini.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 max-h-[460px] overflow-y-auto pr-1">
            {filteredPending.map((tx) => {
              const method = String(tx.paymentMethod || 'OFFLINE').toUpperCase();
              const methodMeta = getMethodMeta(method);
              const MethodIcon = methodMeta.Icon;
              const bonus = Number(tx.promoBonus || 0);
              const totalReceive = Number(tx.amount) + bonus;
              const qrisTimer = method === 'QRIS' ? formatRemainingQris(tx) : null;

              return (
                <div
                  key={tx.id}
                  className="bg-background border border-amber-200/90 rounded-2xl p-4 flex flex-col justify-between gap-3 shadow-xs hover:border-orange-300 transition-all"
                >
                  {/* Top Row: User Info + Method Badge */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-2.5 min-w-0">
                      <div className="w-9 h-9 rounded-full bg-orange-50 border border-orange-200 flex items-center justify-center text-xs font-black text-orange-700 overflow-hidden shrink-0">
                        {tx.user?.image ? (
                          <img
                            src={tx.user.image}
                            alt={tx.user.name || ''}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          (tx.user?.name || '?').charAt(0).toUpperCase()
                        )}
                      </div>
                      <div className="min-w-0">
                        <h4 className="text-xs font-black text-foreground truncate">
                          {tx.user?.name || 'Pelanggan Arum Seduh'}
                        </h4>
                        <p className="text-[10.5px] text-muted-foreground font-semibold truncate">
                          {tx.user?.phone || tx.user?.email || '-'}
                        </p>
                        <div className="flex items-center flex-wrap gap-1.5 mt-1.5">
                          <span
                            className={cn(
                              'inline-flex items-center gap-1 text-[9px] font-black uppercase px-2 py-0.5 rounded-md border',
                              methodMeta.badgeClass
                            )}
                          >
                            <MethodIcon className="w-3 h-3" />
                            <span>{methodMeta.label}</span>
                          </span>
                          <span
                            className={cn(
                              'text-[9px] font-black uppercase px-2 py-0.5 rounded-md',
                              tx.status === 'VERIFYING'
                                ? 'bg-orange-500 text-white'
                                : 'bg-amber-100 text-amber-900'
                            )}
                          >
                            {tx.status === 'VERIFYING'
                              ? 'Bukti Diunggah'
                              : 'Menunggu Pembayaran'}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <p className="font-black text-sm text-orange-600">
                        {formatRupiah(tx.amount)}
                      </p>
                      {bonus > 0 && (
                        <span className="text-[9.5px] font-extrabold text-orange-700 bg-orange-50 border border-orange-200 px-1.5 py-0.5 rounded-md mt-0.5 inline-block">
                          +Bonus {formatRupiah(bonus)}
                        </span>
                      )}
                      <p className="text-[10px] font-black text-foreground mt-0.5">
                        Total: {formatRupiah(totalReceive)}
                      </p>
                    </div>
                  </div>

                  {/* Method-Specific Verification Box */}
                  {method === 'OFFLINE' && (
                    <div className="bg-amber-50/70 border border-amber-200 rounded-xl p-2.5 flex items-center justify-between gap-2">
                      <div>
                        <span className="text-[9px] font-black uppercase tracking-wider text-amber-800 block">
                          Kode Tiket Kasir Booth
                        </span>
                        <span className="text-xs font-mono font-black text-orange-700">
                          {tx.referenceId || '-'}
                        </span>
                      </div>
                      {tx.referenceId && (
                        <button
                          type="button"
                          onClick={() => handleCopyCode(tx.referenceId)}
                          className="px-2.5 py-1.5 rounded-lg bg-white hover:bg-orange-50 border border-amber-200 text-amber-900 text-[10px] font-extrabold flex items-center gap-1 cursor-pointer"
                        >
                          {copiedCode === tx.referenceId ? (
                            <>
                              <Check className="w-3 h-3 text-emerald-600" />
                              <span>Tersalin</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3 h-3 text-orange-600" />
                              <span>Salin Kode</span>
                            </>
                          )}
                        </button>
                      )}
                    </div>
                  )}

                  {method === 'BANK' && (
                    <div className="space-y-2">
                      {tx.paymentProofUrl ? (
                        <div className="border border-amber-200 rounded-xl overflow-hidden bg-muted/20 relative group">
                          <img
                            src={tx.paymentProofUrl}
                            alt="Bukti Transfer Bank"
                            className="w-full h-28 object-cover"
                          />
                          <div className="absolute inset-0 bg-black/35 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <button
                              type="button"
                              onClick={() =>
                                setPreviewProofModal({ url: tx.paymentProofUrl, tx })
                              }
                              className="px-3 py-1.5 rounded-xl bg-white text-gray-900 text-[10.5px] font-black flex items-center gap-1.5 shadow-md cursor-pointer"
                            >
                              <Eye className="w-3.5 h-3.5 text-orange-600" />
                              <span>Periksa Bukti Transfer</span>
                            </button>
                          </div>
                          <button
                            type="button"
                            onClick={() =>
                              setPreviewProofModal({ url: tx.paymentProofUrl, tx })
                            }
                            className="absolute top-2 right-2 bg-black/70 hover:bg-black/85 text-white font-black text-[9px] px-2 py-1 rounded-lg uppercase flex items-center gap-1 cursor-pointer"
                          >
                            <Eye className="w-3 h-3" />
                            <span>Lihat Bukti</span>
                          </button>
                        </div>
                      ) : (
                        <div className="bg-amber-50/50 border border-dashed border-amber-200 rounded-xl p-2.5 text-[10.5px] font-semibold text-amber-800 flex items-center gap-2">
                          <Clock className="w-3.5 h-3.5 text-orange-500 shrink-0" />
                          <span>Pelanggan belum mengunggah foto bukti transfer bank.</span>
                        </div>
                      )}
                    </div>
                  )}

                  {method === 'QRIS' && qrisTimer && (
                    <div
                      className={cn(
                        'rounded-xl p-2.5 border flex items-center justify-between text-xs',
                        qrisTimer.diffSec <= 180
                          ? 'bg-rose-50 border-rose-200 text-rose-900'
                          : 'bg-orange-50/60 border-orange-200/80 text-orange-950'
                      )}
                    >
                      <div className="flex items-center gap-1.5 font-bold text-[10.5px]">
                        <Clock className="w-3.5 h-3.5 text-orange-600" />
                        <span>Batas Waktu QRIS (15 Menit):</span>
                      </div>
                      <span className="font-mono font-black text-xs text-orange-600 bg-white px-2 py-0.5 rounded border border-orange-200">
                        {qrisTimer.label}
                      </span>
                    </div>
                  )}

                  {/* Actions Row */}
                  <div className="flex items-center gap-2 border-t border-border/50 pt-2.5">
                    <button
                      type="button"
                      disabled={processingTxId === tx.id}
                      onClick={() => setConfirmActionModal({ tx, action: 'reject' })}
                      className="flex-1 py-2 rounded-xl border border-rose-200 text-rose-600 hover:bg-rose-50 text-[10.5px] font-black uppercase tracking-wider transition-colors cursor-pointer"
                    >
                      Tolak
                    </button>
                    <button
                      type="button"
                      disabled={processingTxId === tx.id}
                      onClick={() => setConfirmActionModal({ tx, action: 'approve' })}
                      className="flex-[1.6] py-2 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white text-[10.5px] font-black uppercase tracking-wider shadow-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      {processingTxId === tx.id ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <CheckCircle2 className="w-3.5 h-3.5" />
                      )}
                      <span>Setujui (+{formatRupiah(totalReceive)})</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 4. SEARCH & REFRESH BAR FOR USER WALLETS */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Cari pelanggan berdasarkan nama, nomor telepon, email, atau kode transaksi..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm rounded-xl border border-border bg-card focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500"
          />
        </div>
        <button
          type="button"
          onClick={() => fetchData()}
          className="px-4 py-2 text-sm rounded-xl border border-border bg-card hover:bg-muted transition-colors flex items-center justify-center gap-1.5 font-bold cursor-pointer"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Muat Ulang</span>
        </button>
      </div>

      {/* 5. USERS WALLET TABLE */}
      <div className="space-y-2">
        {filteredUsers.map((user) => {
          const isExpanded = expandedUserId === user.id;
          const lastTx = user.walletTransactions[0];

          return (
            <div
              key={user.id}
              className="bg-card rounded-2xl border border-border overflow-hidden"
            >
              <div
                className="flex items-center gap-3 p-4 cursor-pointer hover:bg-muted/30 transition-colors"
                onClick={() => setExpandedUserId(isExpanded ? null : user.id)}
              >
                <div className="w-10 h-10 rounded-full bg-orange-50 border border-orange-200 flex items-center justify-center text-sm font-black text-orange-700 shrink-0 overflow-hidden">
                  {user.image ? (
                    <img
                      src={user.image}
                      alt={user.name || ''}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    (user.name || '?').charAt(0).toUpperCase()
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <h4 className="font-bold text-sm text-foreground truncate">
                    {user.name || 'Tanpa Nama'}
                  </h4>
                  <p className="text-[11px] text-muted-foreground truncate">
                    {user.phone || user.email || '-'}
                  </p>
                </div>

                <div className="text-right shrink-0">
                  <p className="font-black text-sm text-orange-600">
                    {formatRupiah(user.walletBalance)}
                  </p>
                  {lastTx && (
                    <p className="text-[9.5px] text-muted-foreground">
                      {new Date(lastTx.createdAt).toLocaleDateString('id-ID')}
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      openAdjustModal(user, 'add');
                    }}
                    className="w-8 h-8 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-600 flex items-center justify-center transition-colors cursor-pointer"
                    title="Tambah Saldo Manual"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      openAdjustModal(user, 'deduct');
                    }}
                    className="w-8 h-8 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 flex items-center justify-center transition-colors cursor-pointer"
                    title="Kurangi Saldo Manual"
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  {isExpanded ? (
                    <ChevronUp className="w-4 h-4 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-muted-foreground" />
                  )}
                </div>
              </div>

              {/* Expanded Transaction History with Accurate Status Badges */}
              {isExpanded && (
                <div className="border-t border-border/50 bg-muted/20 px-4 py-3">
                  <h5 className="text-[10px] font-black uppercase tracking-wider text-muted-foreground mb-2">
                    Riwayat Transaksi Arus Pay Terakhir
                  </h5>
                  {user.walletTransactions.length === 0 ? (
                    <p className="text-xs text-muted-foreground italic">Belum ada transaksi.</p>
                  ) : (
                    <div className="space-y-1.5 max-h-72 overflow-y-auto">
                      {user.walletTransactions.map((tx) => {
                        const isRejected = tx.status === 'REJECTED';
                        const isPending =
                          tx.status === 'PENDING' || tx.status === 'VERIFYING';
                        const isPositive = tx.amount > 0;

                        return (
                          <div
                            key={tx.id}
                            className="flex items-center justify-between py-2 px-3 rounded-xl bg-card border border-border/40 gap-2"
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div
                                className={cn(
                                  'w-7 h-7 rounded-lg flex items-center justify-center shrink-0',
                                  isRejected
                                    ? 'bg-slate-100 text-slate-400'
                                    : isPending
                                    ? 'bg-amber-50 text-amber-600'
                                    : isPositive
                                    ? 'bg-emerald-50 text-emerald-600'
                                    : 'bg-rose-50 text-rose-600'
                                )}
                              >
                                {isRejected ? (
                                  <XCircle className="w-3.5 h-3.5" />
                                ) : isPending ? (
                                  <Clock className="w-3.5 h-3.5" />
                                ) : isPositive ? (
                                  <TrendingUp className="w-3.5 h-3.5" />
                                ) : (
                                  <TrendingDown className="w-3.5 h-3.5" />
                                )}
                              </div>
                              <div className="min-w-0">
                                <p
                                  className={cn(
                                    'text-[11px] font-bold truncate',
                                    isRejected
                                      ? 'text-muted-foreground line-through'
                                      : 'text-foreground'
                                  )}
                                >
                                  {tx.description}
                                </p>
                                <div className="flex items-center flex-wrap gap-1.5 mt-0.5">
                                  <span className="text-[9.5px] text-muted-foreground">
                                    {new Date(tx.createdAt).toLocaleString('id-ID')}
                                  </span>
                                  {tx.paymentMethod && (
                                    <span className="text-[8.5px] font-black uppercase px-1.5 py-0.2 rounded bg-amber-50 text-amber-800 border border-amber-200">
                                      {tx.paymentMethod === 'OFFLINE'
                                        ? 'Kasir Booth'
                                        : tx.paymentMethod === 'BANK'
                                        ? 'Transfer Bank'
                                        : tx.paymentMethod}
                                    </span>
                                  )}
                                  {tx.referenceId && (
                                    <span className="text-[9px] font-mono text-muted-foreground">
                                      {tx.referenceId}
                                    </span>
                                  )}
                                  {isRejected && (
                                    <span className="text-[8.5px] font-black uppercase px-1.5 py-0.2 rounded bg-rose-50 text-rose-700 border border-rose-200">
                                      Batal / Kedaluwarsa
                                    </span>
                                  )}
                                  {isPending && (
                                    <span className="text-[8.5px] font-black uppercase px-1.5 py-0.2 rounded bg-amber-100 text-amber-900">
                                      {tx.status === 'VERIFYING' ? 'Verifikasi' : 'Pending'}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>

                            <span
                              className={cn(
                                'text-xs font-black shrink-0 ml-2',
                                isRejected
                                  ? 'text-slate-400 line-through'
                                  : isPending
                                  ? 'text-amber-600'
                                  : isPositive
                                  ? 'text-emerald-600'
                                  : 'text-rose-600'
                              )}
                            >
                              {isPositive ? '+' : ''}
                              {formatRupiah(tx.amount)}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {filteredUsers.length === 0 && !loading && (
        <div className="text-center py-12 bg-card border border-dashed border-border rounded-2xl space-y-2">
          <ShieldAlert className="w-10 h-10 text-muted-foreground mx-auto" />
          <h4 className="font-bold text-sm text-foreground">Tidak Ada Data Arus Pay</h4>
          <p className="text-xs text-muted-foreground">
            Belum ada pelanggan yang cocok dengan pencarian Anda.
          </p>
        </div>
      )}

      {/* MODAL 1: BANK TRANSFER PROOF LIGHTBOX */}
      {previewProofModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/65 backdrop-blur-xs"
            onClick={() => setPreviewProofModal(null)}
          />
          <div className="bg-card w-full max-w-md rounded-3xl shadow-2xl p-5 relative border border-amber-200 z-10 space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div>
                <h3 className="font-heading font-black text-sm text-foreground">
                  Bukti Transfer Bank • {previewProofModal.tx.user?.name || 'Pelanggan'}
                </h3>
                <p className="text-[11px] text-muted-foreground font-mono">
                  {previewProofModal.tx.referenceId} •{' '}
                  {formatRupiah(previewProofModal.tx.amount)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setPreviewProofModal(null)}
                className="w-8 h-8 rounded-full bg-muted hover:bg-border flex items-center justify-center text-foreground cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="rounded-2xl overflow-hidden border border-border bg-black/5 max-h-[60vh] flex items-center justify-center">
              <img
                src={previewProofModal.url}
                alt="Bukti Transfer Penuh"
                className="max-h-[58vh] w-auto object-contain"
              />
            </div>

            <div className="flex gap-2.5">
              <button
                type="button"
                disabled={processingTxId === previewProofModal.tx.id}
                onClick={() =>
                  executePendingAction(previewProofModal.tx.id, 'reject')
                }
                className="flex-1 py-2.5 rounded-xl border border-rose-200 text-rose-600 hover:bg-rose-50 text-xs font-black uppercase cursor-pointer"
              >
                Tolak Bukti
              </button>
              <button
                type="button"
                disabled={processingTxId === previewProofModal.tx.id}
                onClick={() =>
                  executePendingAction(previewProofModal.tx.id, 'approve')
                }
                className="flex-[1.5] py-2.5 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white text-xs font-black uppercase shadow-sm cursor-pointer flex items-center justify-center gap-1.5"
              >
                {processingTxId === previewProofModal.tx.id && (
                  <Loader2 className="w-4 h-4 animate-spin" />
                )}
                <span>Setujui &amp; Tambah Saldo</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: CONFIRM APPROVE / REJECT PENDING TOP-UP */}
      {confirmActionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/55 backdrop-blur-xs"
            onClick={() => setConfirmActionModal(null)}
          />
          <div className="bg-card w-full max-w-sm rounded-3xl shadow-2xl p-6 relative border border-amber-200 z-10 space-y-4">
            <h3 className="font-heading font-black text-base text-foreground">
              {confirmActionModal.action === 'approve'
                ? 'Konfirmasi Setujui Top Up'
                : 'Tolak Permintaan Top Up'}
            </h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              {confirmActionModal.action === 'approve' ? (
                <>
                  Pastikan pembayaran dari{' '}
                  <strong>{confirmActionModal.tx.user?.name || 'Pelanggan'}</strong> sebesar{' '}
                  <strong className="text-orange-600">
                    {formatRupiah(confirmActionModal.tx.amount)}
                  </strong>{' '}
                  ({confirmActionModal.tx.referenceId}) telah diterima. Total saldo yang akan masuk ke Arus Pay pelanggan adalah{' '}
                  <strong className="text-emerald-600">
                    {formatRupiah(
                      Number(confirmActionModal.tx.amount) +
                        Number(confirmActionModal.tx.promoBonus || 0)
                    )}
                  </strong>
                  .
                </>
              ) : (
                <>
                  Apakah Anda yakin ingin menolak dan membatalkan permintaan top up{' '}
                  <strong>{confirmActionModal.tx.referenceId}</strong> sebesar{' '}
                  <strong>{formatRupiah(confirmActionModal.tx.amount)}</strong>?
                </>
              )}
            </p>

            <div className="flex gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setConfirmActionModal(null)}
                className="flex-1 py-2.5 rounded-xl border border-border text-xs font-bold hover:bg-muted cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={processingTxId === confirmActionModal.tx.id}
                onClick={() =>
                  executePendingAction(
                    confirmActionModal.tx.id,
                    confirmActionModal.action
                  )
                }
                className={cn(
                  'flex-1 py-2.5 rounded-xl text-white text-xs font-black uppercase cursor-pointer flex items-center justify-center gap-1.5',
                  confirmActionModal.action === 'approve'
                    ? 'bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600'
                    : 'bg-rose-600 hover:bg-rose-700'
                )}
              >
                {processingTxId === confirmActionModal.tx.id && (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                )}
                <span>
                  {confirmActionModal.action === 'approve'
                    ? 'Ya, Konfirmasi'
                    : 'Ya, Tolak'}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: MANUAL BALANCE ADJUSTMENT */}
      {isModalOpen && selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-xs"
            onClick={() => setIsModalOpen(false)}
          />

          <div className="bg-card w-full max-w-sm rounded-2xl shadow-2xl p-6 relative border border-border z-10">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="absolute top-4 right-4 text-muted-foreground hover:text-foreground w-7 h-7 rounded-full flex items-center justify-center bg-muted hover:bg-border transition-all cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            <h3 className="font-heading font-black text-base text-foreground mb-1 flex items-center gap-2">
              <Wallet className="w-5 h-5 text-orange-600" />
              <span>{adjustType === 'add' ? 'Tambah Saldo Arus Pay' : 'Kurangi Saldo Arus Pay'}</span>
            </h3>
            <p className="text-[11px] text-muted-foreground mb-4">
              Pelanggan: <strong>{selectedUser.name || 'Tanpa Nama'}</strong> — Saldo aktif:{' '}
              <strong>{formatRupiah(selectedUser.walletBalance)}</strong>
            </p>

            <form onSubmit={handleAdjustBalance} className="space-y-4">
              <div className="flex rounded-xl border border-border overflow-hidden">
                <button
                  type="button"
                  onClick={() => setAdjustType('add')}
                  className={cn(
                    'flex-1 py-2 text-xs font-bold transition-all flex items-center justify-center gap-1 cursor-pointer',
                    adjustType === 'add'
                      ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white'
                      : 'bg-card text-muted-foreground hover:bg-muted'
                  )}
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Tambah</span>
                </button>
                <button
                  type="button"
                  onClick={() => setAdjustType('deduct')}
                  className={cn(
                    'flex-1 py-2 text-xs font-bold transition-all flex items-center justify-center gap-1 cursor-pointer',
                    adjustType === 'deduct'
                      ? 'bg-rose-500 text-white'
                      : 'bg-card text-muted-foreground hover:bg-muted'
                  )}
                >
                  <Minus className="w-3.5 h-3.5" />
                  <span>Kurangi</span>
                </button>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">
                  Jumlah (IDR)
                </label>
                <input
                  type="number"
                  required
                  min="1"
                  value={adjustAmount}
                  onChange={(e) => setAdjustAmount(e.target.value)}
                  className="w-full px-4 py-2.5 text-sm rounded-xl border border-border bg-card focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500"
                  placeholder="Masukkan nominal (contoh: 50000)"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">
                  Alasan Penyesuaian
                </label>
                <input
                  type="text"
                  required
                  value={adjustReason}
                  onChange={(e) => setAdjustReason(e.target.value)}
                  className="w-full px-4 py-2.5 text-sm rounded-xl border border-border bg-card focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500"
                  placeholder="Contoh: Kompensasi pesanan / koreksi kasir"
                />
              </div>

              <div className="flex gap-2.5 pt-3.5 select-none">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 py-3 px-4 rounded-xl border border-border hover:bg-muted text-xs font-bold transition-all cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className={cn(
                    'flex-1 py-3 px-4 rounded-xl text-white text-xs font-bold shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer',
                    adjustType === 'add'
                      ? 'bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600'
                      : 'bg-rose-500 hover:bg-rose-600'
                  )}
                >
                  {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" />}
                  <span>{adjustType === 'add' ? 'Tambahkan' : 'Kurangi'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
