'use client';

import { useState, useMemo } from 'react';
import Image from 'next/image';
import {
  Cake, Gift, Calendar, Users, Search, Send, ShieldAlert,
  PartyPopper, TrendingUp, Clock, Phone, Mail, DollarSign,
} from 'lucide-react';
import { cn, formatRupiah } from '@/lib/utils';
import { useToast } from '@/components/ui/Toast';

interface BirthdayUser {
  id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  image: string | null;
  birthDate: string;
  nextBirthday?: string;
  daysUntil?: number;
  age?: number;
  dayOfMonth?: number;
}

interface BirthdayVoucher {
  id: string;
  userId: string;
  code: string;
  type: string;
  description: string;
  discountAmount: number;
  isUsed: boolean;
  createdAt: string;
  usedAt: string | null;
  expiresAt: string | null;
  user: {
    id: string;
    name: string | null;
    email: string | null;
    phone: string | null;
  };
}

interface Stats {
  totalBirthdaysThisMonth: number;
  totalRewardsSent: number;
  avgVoucherValue: number;
  totalUsersWithBirthday: number;
}

interface AdminBirthdayClientProps {
  initialUpcomingBirthdays: BirthdayUser[];
  initialBirthdaysThisMonth: BirthdayUser[];
  initialBirthdayVouchers: BirthdayVoucher[];
  initialStats: Stats;
}

const DAYS_IN_MONTH = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
const MONTH_NAMES = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];

export default function AdminBirthdayClient({
  initialUpcomingBirthdays,
  initialBirthdaysThisMonth,
  initialBirthdayVouchers,
  initialStats,
}: AdminBirthdayClientProps) {
  const [upcomingBirthdays] = useState<BirthdayUser[]>(initialUpcomingBirthdays);
  const [birthdaysThisMonth] = useState<BirthdayUser[]>(initialBirthdaysThisMonth);
  const [birthdayVouchers, setBirthdayVouchers] = useState<BirthdayVoucher[]>(initialBirthdayVouchers);
  const [stats, setStats] = useState<Stats>(initialStats);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'upcoming' | 'calendar' | 'history'>('upcoming');

  // Send reward modal state
  const [sendRewardModal, setSendRewardModal] = useState<BirthdayUser | null>(null);
  const [voucherValue, setVoucherValue] = useState('25000');
  const [voucherType, setVoucherType] = useState('DISCOUNT_RP');

  const { showToast } = useToast();

  const currentMonth = new Date().getMonth();
  const currentDay = new Date().getDate();

  // Filtered upcoming birthdays
  const filteredUpcoming = useMemo(() => {
    return upcomingBirthdays.filter(u =>
      (u.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (u.phone || '').includes(searchTerm)
    );
  }, [upcomingBirthdays, searchTerm]);

  // Send birthday reward
  const handleSendReward = async (user: BirthdayUser) => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/birthday', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          voucherType,
          voucherValue: parseInt(voucherValue),
          description: `Selamat Ulang Tahun! 🎂 Birthday Voucher dari Matchaboy`,
        }),
      });

      if (!res.ok) throw new Error(await res.text());

      const data = await res.json();

      // Add to vouchers list
      setBirthdayVouchers(prev => [
        {
          ...data.voucher,
          createdAt: new Date().toISOString(),
          usedAt: null,
          expiresAt: data.voucher.expiresAt,
        },
        ...prev,
      ]);

      setStats(prev => ({
        ...prev,
        totalRewardsSent: prev.totalRewardsSent + 1,
      }));

      setSendRewardModal(null);
      showToast(`Birthday voucher berhasil dikirim ke ${user.name}! 🎉`, 'success');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Gagal mengirim reward.';
      showToast(message, 'error');
    } finally {
      setLoading(false);
    }
  };

  // Calendar view - build grid for current month
  const calendarDays = useMemo(() => {
    const totalDays = DAYS_IN_MONTH[currentMonth];
    const firstDay = new Date(new Date().getFullYear(), currentMonth, 1).getDay();
    const days: { day: number; users: BirthdayUser[] }[] = [];

    // Empty cells for offset
    for (let i = 0; i < firstDay; i++) {
      days.push({ day: 0, users: [] });
    }

    for (let d = 1; d <= totalDays; d++) {
      const usersOnDay = birthdaysThisMonth.filter(u => u.dayOfMonth === d);
      days.push({ day: d, users: usersOnDay });
    }

    return days;
  }, [birthdaysThisMonth, currentMonth]);

  return (
    <div className="space-y-4">
      {/* Overview Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-card rounded-2xl border border-border p-4 space-y-1">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-pink-50 flex items-center justify-center">
              <Cake className="w-4 h-4 text-pink-600" />
            </div>
            <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">Bulan Ini</span>
          </div>
          <p className="text-2xl font-black text-foreground">{stats.totalBirthdaysThisMonth}</p>
          <p className="text-[10px] text-muted-foreground">Ulang tahun di {MONTH_NAMES[currentMonth]}</p>
        </div>

        <div className="bg-card rounded-2xl border border-border p-4 space-y-1">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-emerald-50 flex items-center justify-center">
              <Gift className="w-4 h-4 text-emerald-600" />
            </div>
            <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">Rewards</span>
          </div>
          <p className="text-2xl font-black text-foreground">{stats.totalRewardsSent}</p>
          <p className="text-[10px] text-muted-foreground">Total voucher terkirim</p>
        </div>

        <div className="bg-card rounded-2xl border border-border p-4 space-y-1">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-brand-50 flex items-center justify-center">
              <DollarSign className="w-4 h-4 text-brand-600" />
            </div>
            <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">Rata-rata</span>
          </div>
          <p className="text-2xl font-black text-foreground">{formatRupiah(stats.avgVoucherValue)}</p>
          <p className="text-[10px] text-muted-foreground">Nilai voucher rata-rata</p>
        </div>

        <div className="bg-card rounded-2xl border border-border p-4 space-y-1">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-blue-50 flex items-center justify-center">
              <Users className="w-4 h-4 text-blue-600" />
            </div>
            <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">Total</span>
          </div>
          <p className="text-2xl font-black text-foreground">{stats.totalUsersWithBirthday}</p>
          <p className="text-[10px] text-muted-foreground">User dengan tanggal lahir</p>
        </div>
      </div>

      {/* Search */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Cari nama atau nomor telepon..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm rounded-xl border border-border bg-card focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
          />
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border select-none">
        <button
          onClick={() => setActiveTab('upcoming')}
          className={cn(
            "px-4 py-2 text-xs font-bold uppercase tracking-wider border-b-2 transition-all flex items-center gap-1.5",
            activeTab === 'upcoming' ? 'border-brand-600 text-brand-700' : 'border-transparent text-muted-foreground hover:text-foreground'
          )}
        >
          <PartyPopper className="w-3.5 h-3.5" />
          Akan Datang ({upcomingBirthdays.length})
        </button>
        <button
          onClick={() => setActiveTab('calendar')}
          className={cn(
            "px-4 py-2 text-xs font-bold uppercase tracking-wider border-b-2 transition-all flex items-center gap-1.5",
            activeTab === 'calendar' ? 'border-brand-600 text-brand-700' : 'border-transparent text-muted-foreground hover:text-foreground'
          )}
        >
          <Calendar className="w-3.5 h-3.5" />
          Kalender
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={cn(
            "px-4 py-2 text-xs font-bold uppercase tracking-wider border-b-2 transition-all flex items-center gap-1.5",
            activeTab === 'history' ? 'border-brand-600 text-brand-700' : 'border-transparent text-muted-foreground hover:text-foreground'
          )}
        >
          <Clock className="w-3.5 h-3.5" />
          Riwayat ({birthdayVouchers.length})
        </button>
      </div>

      {/* Tab Content: Upcoming Birthdays */}
      {activeTab === 'upcoming' && (
        <div className="space-y-3">
          {filteredUpcoming.length === 0 ? (
            <div className="text-center py-12 bg-card border border-dashed border-border rounded-2xl space-y-2">
              <Cake className="w-10 h-10 text-muted-foreground mx-auto" />
              <h4 className="font-bold text-sm text-foreground">Tidak Ada Ulang Tahun</h4>
              <p className="text-xs text-muted-foreground">Tidak ada ulang tahun pelanggan dalam 30 hari ke depan.</p>
            </div>
          ) : (
            filteredUpcoming.map(user => (
              <div
                key={user.id}
                className={cn(
                  "bg-card rounded-2xl border overflow-hidden p-4 hover:shadow-md transition-shadow",
                  user.daysUntil === 0 ? 'border-pink-300 bg-gradient-to-r from-pink-50/30 to-card' : 'border-border'
                )}
              >
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    {/* Avatar */}
                    <div className="relative w-12 h-12 rounded-full overflow-hidden shrink-0 border-2 border-pink-200 bg-pink-50">
                      {user.image ? (
                        <Image src={user.image} alt={user.name || ''} fill className="object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-pink-600 font-bold text-lg">
                          {(user.name || '?')[0].toUpperCase()}
                        </div>
                      )}
                    </div>

                    <div className="min-w-0 space-y-0.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="font-bold text-sm text-foreground">{user.name || 'Anonymous'}</h4>
                        {user.daysUntil === 0 && (
                          <span className="text-[9px] font-black uppercase tracking-wider text-pink-700 bg-pink-100 px-2 py-0.5 rounded-full flex items-center gap-1">
                            🎂 Hari Ini!
                          </span>
                        )}
                        {user.daysUntil === 1 && (
                          <span className="text-[9px] font-black uppercase tracking-wider text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full">
                            Besok
                          </span>
                        )}
                        {user.daysUntil !== undefined && user.daysUntil > 1 && user.daysUntil <= 7 && (
                          <span className="text-[9px] font-black uppercase tracking-wider text-blue-700 bg-blue-100 px-2 py-0.5 rounded-full">
                            {user.daysUntil} hari lagi
                          </span>
                        )}
                        {user.daysUntil !== undefined && user.daysUntil > 7 && (
                          <span className="text-[9px] font-bold text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                            {user.daysUntil} hari lagi
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-3 text-[10px] text-muted-foreground font-medium">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {new Date(user.birthDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'long' })}
                        </span>
                        {user.age && <span>({user.age} tahun)</span>}
                      </div>

                      <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
                        {user.phone && (
                          <span className="flex items-center gap-1">
                            <Phone className="w-3 h-3" />
                            {user.phone}
                          </span>
                        )}
                        {user.email && (
                          <span className="flex items-center gap-1">
                            <Mail className="w-3 h-3" />
                            {user.email}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Send Reward Button */}
                  <button
                    onClick={() => {
                      setSendRewardModal(user);
                      setVoucherValue('25000');
                      setVoucherType('DISCOUNT_RP');
                    }}
                    className="py-2 px-4 text-[11px] font-bold rounded-xl gradient-brand text-white shadow-md hover:shadow-lg transition-all flex items-center gap-1.5 shrink-0"
                  >
                    <Send className="w-3.5 h-3.5" />
                    Kirim Reward
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Tab Content: Calendar View */}
      {activeTab === 'calendar' && (
        <div className="bg-card rounded-2xl border border-border p-4">
          <h3 className="font-heading font-black text-sm text-foreground mb-3 flex items-center gap-2">
            <Calendar className="w-4 h-4 text-brand-600" />
            {MONTH_NAMES[currentMonth]} {new Date().getFullYear()}
          </h3>

          {/* Day headers */}
          <div className="grid grid-cols-7 gap-1 mb-1">
            {['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'].map(day => (
              <div key={day} className="text-center text-[9px] font-black uppercase tracking-wider text-muted-foreground py-1">
                {day}
              </div>
            ))}
          </div>

          {/* Calendar grid */}
          <div className="grid grid-cols-7 gap-1">
            {calendarDays.map((cell, idx) => (
              <div
                key={idx}
                className={cn(
                  "relative aspect-square rounded-xl flex flex-col items-center justify-center text-xs transition-all",
                  cell.day === 0 && 'bg-transparent',
                  cell.day > 0 && cell.users.length === 0 && 'bg-muted/30 text-muted-foreground hover:bg-muted/50',
                  cell.day > 0 && cell.users.length > 0 && 'bg-pink-50 text-pink-700 border border-pink-200 font-bold cursor-pointer hover:bg-pink-100',
                  cell.day === currentDay && 'ring-2 ring-brand-500 ring-offset-1',
                )}
                title={cell.users.length > 0 ? cell.users.map(u => u.name).join(', ') : undefined}
              >
                {cell.day > 0 && (
                  <>
                    <span className={cn("text-xs font-bold", cell.day === currentDay && "text-brand-700")}>
                      {cell.day}
                    </span>
                    {cell.users.length > 0 && (
                      <span className="text-[8px] font-black mt-0.5">
                        🎂 {cell.users.length}
                      </span>
                    )}
                  </>
                )}
              </div>
            ))}
          </div>

          {/* Legend */}
          <div className="flex items-center gap-4 mt-3 pt-3 border-t border-border/50">
            <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
              <div className="w-3 h-3 rounded bg-pink-50 border border-pink-200" />
              <span>Ada ulang tahun</span>
            </div>
            <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
              <div className="w-3 h-3 rounded ring-2 ring-brand-500" />
              <span>Hari ini</span>
            </div>
          </div>
        </div>
      )}

      {/* Tab Content: Voucher History */}
      {activeTab === 'history' && (
        <div className="space-y-3">
          {birthdayVouchers.length === 0 ? (
            <div className="text-center py-12 bg-card border border-dashed border-border rounded-2xl space-y-2">
              <Gift className="w-10 h-10 text-muted-foreground mx-auto" />
              <h4 className="font-bold text-sm text-foreground">Belum Ada Riwayat</h4>
              <p className="text-xs text-muted-foreground">Belum ada voucher ulang tahun yang dikirim.</p>
            </div>
          ) : (
            birthdayVouchers.map(voucher => (
              <div
                key={voucher.id}
                className="bg-card rounded-2xl border border-border p-4 hover:shadow-md transition-shadow"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-pink-100 to-pink-50 flex items-center justify-center shrink-0">
                      <Gift className="w-5 h-5 text-pink-600" />
                    </div>
                    <div className="min-w-0">
                      <h4 className="font-bold text-sm text-foreground line-clamp-1">{voucher.user.name || 'Anonymous'}</h4>
                      <p className="text-[10px] text-muted-foreground">{voucher.description}</p>
                      <div className="flex items-center gap-2 mt-0.5 text-[10px] text-muted-foreground">
                        <span>{new Date(voucher.createdAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                        <span>•</span>
                        <span className="font-bold text-brand-700">{formatRupiah(voucher.discountAmount)}</span>
                      </div>
                    </div>
                  </div>

                  <div className="shrink-0">
                    {voucher.isUsed ? (
                      <span className="text-[9px] font-black uppercase tracking-wider text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                        Digunakan
                      </span>
                    ) : (
                      <span className="text-[9px] font-black uppercase tracking-wider text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full">
                        Belum Dipakai
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Send Reward Modal */}
      {sendRewardModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setSendRewardModal(null)} />

          {/* Dialog */}
          <div className="bg-card w-full max-w-sm rounded-2xl shadow-2xl p-6 relative border border-border animate-in fade-in zoom-in-95 duration-200">
            <button
              onClick={() => setSendRewardModal(null)}
              className="absolute top-4 right-4 text-muted-foreground hover:text-foreground w-7 h-7 rounded-full flex items-center justify-center bg-muted hover:bg-border transition-all"
            >
              ✕
            </button>

            <h3 className="font-heading font-black text-base text-foreground mb-1 flex items-center gap-2">
              <Gift className="w-5 h-5 text-pink-600" />
              Kirim Birthday Reward
            </h3>
            <p className="text-[11px] text-muted-foreground mb-4">
              Kirim voucher ulang tahun untuk <strong>{sendRewardModal.name}</strong>
            </p>

            <div className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">
                  Tipe Voucher
                </label>
                <select
                  value={voucherType}
                  onChange={(e) => setVoucherType(e.target.value)}
                  className="w-full px-4 py-2.5 text-sm rounded-xl border border-border bg-card focus:outline-none focus:border-brand-500"
                >
                  <option value="DISCOUNT_RP">Diskon Rupiah</option>
                  <option value="FREE_DRINK">Minuman Gratis</option>
                  <option value="FREE_TOPPING">Topping Gratis</option>
                  <option value="UPGRADE_SIZE">Upgrade Size</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">
                  Nilai Voucher (Rp)
                </label>
                <input
                  type="number"
                  min="5000"
                  step="5000"
                  value={voucherValue}
                  onChange={(e) => setVoucherValue(e.target.value)}
                  className="w-full px-4 py-2.5 text-sm rounded-xl border border-border bg-card focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
                  placeholder="Masukkan nilai voucher"
                />
              </div>

              <div className="flex gap-2.5 pt-3.5 select-none">
                <button
                  type="button"
                  onClick={() => setSendRewardModal(null)}
                  className="flex-1 py-3 px-4 rounded-xl border border-border hover:bg-muted text-xs font-bold transition-all"
                >
                  Batal
                </button>
                <button
                  onClick={() => handleSendReward(sendRewardModal)}
                  disabled={loading}
                  className="flex-1 py-3 px-4 rounded-xl gradient-brand text-white text-xs font-bold shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-1.5"
                >
                  {loading && <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin shrink-0" />}
                  <Send className="w-3.5 h-3.5" />
                  Kirim
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
