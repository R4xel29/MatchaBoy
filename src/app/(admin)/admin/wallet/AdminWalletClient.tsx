'use client';

import { useState, useEffect, useMemo } from 'react';
import { Search, Wallet, ChevronDown, ChevronUp, Plus, Minus, X, TrendingUp, TrendingDown, Users, ShieldAlert, RefreshCw } from 'lucide-react';
import { formatRupiah, cn } from '@/lib/utils';
import { useToast } from '@/components/ui/Toast';

interface WalletTransaction {
  id: string;
  amount: number;
  type: string;
  description: string;
  referenceId: string | null;
  createdAt: string;
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

export default function AdminWalletClient() {
  const [users, setUsers] = useState<WalletUser[]>([]);
  const [stats, setStats] = useState<WalletStats | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedUserId, setExpandedUserId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<WalletUser | null>(null);
  const [adjustType, setAdjustType] = useState<'add' | 'deduct'>('add');
  const [adjustAmount, setAdjustAmount] = useState('');
  const [adjustReason, setAdjustReason] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const { showToast } = useToast();

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/wallet');
      if (!res.ok) throw new Error('Failed to fetch wallet data');
      const data = await res.json();
      setUsers(data.users);
      setStats(data.stats);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Gagal memuat data wallet.';
      showToast(message, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filteredUsers = useMemo(() => {
    if (!searchTerm) return users;
    const term = searchTerm.toLowerCase();
    return users.filter(
      (u) =>
        (u.name && u.name.toLowerCase().includes(term)) ||
        (u.phone && u.phone.includes(term)) ||
        (u.email && u.email.toLowerCase().includes(term))
    );
  }, [users, searchTerm]);

  const openAdjustModal = (user: WalletUser, type: 'add' | 'deduct') => {
    setSelectedUser(user);
    setAdjustType(type);
    setAdjustAmount('');
    setAdjustReason('');
    setIsModalOpen(true);
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
        throw new Error(data.error || 'Failed to adjust balance');
      }

      const data = await res.json();

      // Update local state
      setUsers((prev) =>
        prev.map((u) => (u.id === selectedUser.id ? { ...u, walletBalance: data.user.walletBalance, walletTransactions: data.user.walletTransactions } : u))
      );

      showToast(
        `Saldo ${selectedUser.name || 'User'} berhasil ${adjustType === 'add' ? 'ditambahkan' : 'dikurangi'} ${formatRupiah(amt)}`,
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
                <Wallet className="w-4 h-4 text-brand-600" />
              </div>
              <span className="text-[10px] font-black uppercase tracking-wider">Total Saldo</span>
            </div>
            <p className="text-lg font-black text-foreground">{formatRupiah(stats.totalBalance)}</p>
          </div>

          <div className="bg-card rounded-2xl border border-border p-4 space-y-1">
            <div className="flex items-center gap-2 text-muted-foreground">
              <div className="w-8 h-8 rounded-xl bg-emerald-50 flex items-center justify-center">
                <TrendingUp className="w-4 h-4 text-emerald-600" />
              </div>
              <span className="text-[10px] font-black uppercase tracking-wider">Total Top Up</span>
            </div>
            <p className="text-lg font-black text-foreground">{formatRupiah(stats.totalTopUps)}</p>
            <p className="text-[10px] text-muted-foreground">{stats.totalTopUpCount} transaksi</p>
          </div>

          <div className="bg-card rounded-2xl border border-border p-4 space-y-1">
            <div className="flex items-center gap-2 text-muted-foreground">
              <div className="w-8 h-8 rounded-xl bg-rose-50 flex items-center justify-center">
                <TrendingDown className="w-4 h-4 text-rose-600" />
              </div>
              <span className="text-[10px] font-black uppercase tracking-wider">Total Pembayaran</span>
            </div>
            <p className="text-lg font-black text-foreground">{formatRupiah(stats.totalPayments)}</p>
            <p className="text-[10px] text-muted-foreground">{stats.totalPaymentCount} transaksi</p>
          </div>

          <div className="bg-card rounded-2xl border border-border p-4 space-y-1">
            <div className="flex items-center gap-2 text-muted-foreground">
              <div className="w-8 h-8 rounded-xl bg-blue-50 flex items-center justify-center">
                <Users className="w-4 h-4 text-blue-600" />
              </div>
              <span className="text-[10px] font-black uppercase tracking-wider">Pengguna Wallet</span>
            </div>
            <p className="text-lg font-black text-foreground">{stats.totalUsers}</p>
          </div>
        </div>
      )}

      {/* Search & Refresh */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Cari berdasarkan nama, telepon, atau email..."
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

      {/* Users Table */}
      <div className="space-y-2">
        {filteredUsers.map((user) => {
          const isExpanded = expandedUserId === user.id;
          const lastTx = user.walletTransactions[0];

          return (
            <div key={user.id} className="bg-card rounded-2xl border border-border overflow-hidden">
              {/* User Row */}
              <div
                className="flex items-center gap-3 p-4 cursor-pointer hover:bg-muted/30 transition-colors"
                onClick={() => setExpandedUserId(isExpanded ? null : user.id)}
              >
                {/* Avatar */}
                <div className="w-10 h-10 rounded-full bg-brand-50 border border-border flex items-center justify-center text-sm font-bold text-brand-700 shrink-0 overflow-hidden">
                  {user.image ? (
                    <img src={user.image} alt={user.name || ''} className="w-full h-full object-cover" />
                  ) : (
                    (user.name || '?').charAt(0).toUpperCase()
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <h4 className="font-bold text-sm text-foreground truncate">{user.name || 'Tanpa Nama'}</h4>
                  <p className="text-[11px] text-muted-foreground truncate">
                    {user.phone || user.email || '-'}
                  </p>
                </div>

                <div className="text-right shrink-0">
                  <p className="font-black text-sm text-brand-700">{formatRupiah(user.walletBalance)}</p>
                  {lastTx && (
                    <p className="text-[9px] text-muted-foreground">
                      {new Date(lastTx.createdAt).toLocaleDateString('id-ID')}
                    </p>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    onClick={(e) => { e.stopPropagation(); openAdjustModal(user, 'add'); }}
                    className="w-8 h-8 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-600 flex items-center justify-center transition-colors"
                    title="Tambah Saldo"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); openAdjustModal(user, 'deduct'); }}
                    className="w-8 h-8 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 flex items-center justify-center transition-colors"
                    title="Kurangi Saldo"
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

              {/* Expanded Transaction History */}
              {isExpanded && (
                <div className="border-t border-border/50 bg-muted/20 px-4 py-3">
                  <h5 className="text-[10px] font-black uppercase tracking-wider text-muted-foreground mb-2">Riwayat Transaksi Terakhir</h5>
                  {user.walletTransactions.length === 0 ? (
                    <p className="text-xs text-muted-foreground italic">Belum ada transaksi.</p>
                  ) : (
                    <div className="space-y-1.5 max-h-64 overflow-y-auto">
                      {user.walletTransactions.map((tx) => (
                        <div key={tx.id} className="flex items-center justify-between py-1.5 px-2 rounded-lg bg-card border border-border/30">
                          <div className="flex items-center gap-2 min-w-0">
                            <div className={cn(
                              'w-6 h-6 rounded-md flex items-center justify-center shrink-0',
                              tx.amount > 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'
                            )}>
                              {tx.amount > 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                            </div>
                            <div className="min-w-0">
                              <p className="text-[11px] font-semibold text-foreground truncate">{tx.description}</p>
                              <p className="text-[9px] text-muted-foreground">
                                {tx.type} • {new Date(tx.createdAt).toLocaleString('id-ID')}
                              </p>
                            </div>
                          </div>
                          <span className={cn(
                            'text-xs font-black shrink-0 ml-2',
                            tx.amount > 0 ? 'text-emerald-600' : 'text-rose-600'
                          )}>
                            {tx.amount > 0 ? '+' : ''}{formatRupiah(tx.amount)}
                          </span>
                        </div>
                      ))}
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
          <h4 className="font-bold text-sm text-foreground">Tidak Ada Data Wallet</h4>
          <p className="text-xs text-muted-foreground">Belum ada pelanggan yang memiliki saldo wallet.</p>
        </div>
      )}

      {/* Adjust Balance Modal */}
      {isModalOpen && selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setIsModalOpen(false)} />

          <div className="bg-card w-full max-w-sm rounded-2xl shadow-2xl p-6 relative border border-border animate-in fade-in zoom-in-95 duration-200">
            <button
              onClick={() => setIsModalOpen(false)}
              className="absolute top-4 right-4 text-muted-foreground hover:text-foreground w-7 h-7 rounded-full flex items-center justify-center bg-muted hover:bg-border transition-all"
            >
              <X className="w-4 h-4" />
            </button>

            <h3 className="font-heading font-black text-base text-foreground mb-1 flex items-center gap-2">
              <Wallet className="w-5 h-5 text-brand-600" />
              {adjustType === 'add' ? 'Tambah Saldo' : 'Kurangi Saldo'}
            </h3>
            <p className="text-[11px] text-muted-foreground mb-4">
              Pengguna: <strong>{selectedUser.name || 'Tanpa Nama'}</strong> — Saldo saat ini: <strong>{formatRupiah(selectedUser.walletBalance)}</strong>
            </p>

            <form onSubmit={handleAdjustBalance} className="space-y-4">
              {/* Type Toggle */}
              <div className="flex rounded-xl border border-border overflow-hidden">
                <button
                  type="button"
                  onClick={() => setAdjustType('add')}
                  className={cn(
                    'flex-1 py-2 text-xs font-bold transition-all flex items-center justify-center gap-1',
                    adjustType === 'add' ? 'bg-emerald-500 text-white' : 'bg-card text-muted-foreground hover:bg-muted'
                  )}
                >
                  <Plus className="w-3.5 h-3.5" />
                  Tambah
                </button>
                <button
                  type="button"
                  onClick={() => setAdjustType('deduct')}
                  className={cn(
                    'flex-1 py-2 text-xs font-bold transition-all flex items-center justify-center gap-1',
                    adjustType === 'deduct' ? 'bg-rose-500 text-white' : 'bg-card text-muted-foreground hover:bg-muted'
                  )}
                >
                  <Minus className="w-3.5 h-3.5" />
                  Kurangi
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
                  className="w-full px-4 py-2.5 text-sm rounded-xl border border-border bg-card focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
                  placeholder="Masukkan jumlah"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">
                  Alasan
                </label>
                <input
                  type="text"
                  required
                  value={adjustReason}
                  onChange={(e) => setAdjustReason(e.target.value)}
                  className="w-full px-4 py-2.5 text-sm rounded-xl border border-border bg-card focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
                  placeholder="Contoh: Kompensasi error order"
                />
              </div>

              <div className="flex gap-2.5 pt-3.5 select-none">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 py-3 px-4 rounded-xl border border-border hover:bg-muted text-xs font-bold transition-all"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className={cn(
                    'flex-1 py-3 px-4 rounded-xl text-white text-xs font-bold shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-1.5',
                    adjustType === 'add' ? 'bg-emerald-500 hover:bg-emerald-600' : 'bg-rose-500 hover:bg-rose-600'
                  )}
                >
                  {submitting && <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin shrink-0" />}
                  {adjustType === 'add' ? 'Tambahkan' : 'Kurangi'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
