'use client';

import { useState, useEffect, useMemo } from 'react';
import { Search, RefreshCw, Pause, Play, Trash2, ChevronDown, ChevronUp, CalendarClock, Repeat, DollarSign, Clock, ShieldAlert, Package, MapPin } from 'lucide-react';
import { formatRupiah, cn } from '@/lib/utils';
import { useToast } from '@/components/ui/Toast';

interface Schedule {
  id: string;
  userId: string;
  userName: string;
  userPhone: string;
  userEmail: string;
  productId: string;
  productName: string;
  price: number;
  quantity: number;
  size: string;
  iceLevel: string;
  sugarLevel: string;
  addOns: string | null;
  frequency: string;
  dayOfWeek: number | null;
  dayOfMonth: number | null;
  timeSlot: string;
  deliveryAddress: string;
  paymentMethod: string;
  isActive: boolean;
  lastTriggeredAt: string | null;
  nextTriggeredAt: string | null;
  createdAt: string;
  updatedAt: string;
}

const DAY_NAMES = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];

export default function AdminAutoReorderClient() {
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'PAUSED'>('ALL');
  const [frequencyFilter, setFrequencyFilter] = useState<'ALL' | 'DAILY' | 'WEEKLY' | 'MONTHLY'>('ALL');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const { showToast } = useToast();

  const fetchSchedules = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/auto-reorder');
      if (!res.ok) throw new Error('Gagal memuat data');
      const data = await res.json();
      setSchedules(data.schedules);
    } catch (err) {
      console.error(err);
      showToast('Gagal memuat data auto-reorder.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSchedules();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleAction = async (id: string, action: 'pause' | 'resume' | 'cancel') => {
    const labels = { pause: 'dijeda', resume: 'dilanjutkan', cancel: 'dibatalkan' };
    setActionLoading(id);
    try {
      const res = await fetch('/api/admin/auto-reorder', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, action }),
      });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();

      if (action === 'cancel') {
        setSchedules((prev) => prev.filter((s) => s.id !== id));
      } else {
        setSchedules((prev) =>
          prev.map((s) =>
            s.id === id ? { ...s, isActive: action === 'resume' } : s
          )
        );
      }
      showToast(`Jadwal berhasil ${labels[action]}.`, 'success');
    } catch (err) {
      console.error(err);
      showToast(`Gagal ${labels[action]} jadwal.`, 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const filteredSchedules = useMemo(() => {
    return schedules.filter((s) => {
      const matchesSearch =
        s.userName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.userPhone.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.productName.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesStatus =
        statusFilter === 'ALL' ||
        (statusFilter === 'ACTIVE' && s.isActive) ||
        (statusFilter === 'PAUSED' && !s.isActive);

      const matchesFrequency =
        frequencyFilter === 'ALL' || s.frequency === frequencyFilter;

      return matchesSearch && matchesStatus && matchesFrequency;
    });
  }, [schedules, searchTerm, statusFilter, frequencyFilter]);

  // Stats
  const activeCount = schedules.filter((s) => s.isActive).length;
  const today = new Date();
  const triggersToday = schedules.filter((s) => {
    if (!s.nextTriggeredAt || !s.isActive) return false;
    const d = new Date(s.nextTriggeredAt);
    return d.toDateString() === today.toDateString();
  }).length;
  const monthlyRevenue = schedules
    .filter((s) => s.isActive)
    .reduce((sum, s) => {
      const multiplier = s.frequency === 'DAILY' ? 30 : s.frequency === 'WEEKLY' ? 4 : 1;
      return sum + s.price * s.quantity * multiplier;
    }, 0);

  const getFrequencyLabel = (s: Schedule) => {
    switch (s.frequency) {
      case 'DAILY':
        return `Setiap hari, ${s.timeSlot}`;
      case 'WEEKLY':
        return `${DAY_NAMES[s.dayOfWeek ?? 0]}, ${s.timeSlot}`;
      case 'MONTHLY':
        return `Tgl ${s.dayOfMonth ?? 1}, ${s.timeSlot}`;
      default:
        return s.frequency;
    }
  };

  const parseAddOns = (addOns: string | null): Array<{ name: string; price: number }> => {
    if (!addOns) return [];
    try {
      return JSON.parse(addOns);
    } catch {
      return [];
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
        {[1, 2, 3, 4].map((i) => (
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
            <Repeat className="w-3.5 h-3.5 text-emerald-600" />
            Jadwal Aktif
          </div>
          <p className="text-2xl font-black text-foreground">{activeCount}</p>
          <p className="text-[10px] text-muted-foreground mt-0.5">dari {schedules.length} total jadwal</p>
        </div>

        <div className="bg-card rounded-2xl border border-border p-5 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-bl from-blue-500/10 to-transparent rounded-bl-full" />
          <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-wider text-muted-foreground mb-1">
            <CalendarClock className="w-3.5 h-3.5 text-blue-600" />
            Trigger Hari Ini
          </div>
          <p className="text-2xl font-black text-foreground">{triggersToday}</p>
          <p className="text-[10px] text-muted-foreground mt-0.5">jadwal akan dijalankan hari ini</p>
        </div>

        <div className="bg-card rounded-2xl border border-border p-5 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-bl from-amber-500/10 to-transparent rounded-bl-full" />
          <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-wider text-muted-foreground mb-1">
            <DollarSign className="w-3.5 h-3.5 text-amber-600" />
            Est. Revenue Bulanan
          </div>
          <p className="text-2xl font-black text-foreground">{formatRupiah(monthlyRevenue)}</p>
          <p className="text-[10px] text-muted-foreground mt-0.5">dari auto-reorder aktif</p>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Cari pelanggan atau produk..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm rounded-xl border border-border bg-card focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
          />
        </div>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as 'ALL' | 'ACTIVE' | 'PAUSED')}
          className="px-4 py-2 text-sm rounded-xl border border-border bg-card focus:outline-none focus:border-brand-500"
        >
          <option value="ALL">Semua Status</option>
          <option value="ACTIVE">Aktif</option>
          <option value="PAUSED">Dijeda</option>
        </select>

        <select
          value={frequencyFilter}
          onChange={(e) => setFrequencyFilter(e.target.value as 'ALL' | 'DAILY' | 'WEEKLY' | 'MONTHLY')}
          className="px-4 py-2 text-sm rounded-xl border border-border bg-card focus:outline-none focus:border-brand-500"
        >
          <option value="ALL">Semua Frekuensi</option>
          <option value="DAILY">Harian</option>
          <option value="WEEKLY">Mingguan</option>
          <option value="MONTHLY">Bulanan</option>
        </select>

        <button
          onClick={fetchSchedules}
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
          Semua ({schedules.length})
        </button>
        <button
          onClick={() => setStatusFilter('ACTIVE')}
          className={cn(
            'px-4 py-2 text-xs font-bold uppercase tracking-wider border-b-2 transition-all flex items-center gap-1.5',
            statusFilter === 'ACTIVE' ? 'border-brand-600 text-brand-700' : 'border-transparent text-muted-foreground hover:text-foreground'
          )}
        >
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          Aktif ({schedules.filter(s => s.isActive).length})
        </button>
        <button
          onClick={() => setStatusFilter('PAUSED')}
          className={cn(
            'px-4 py-2 text-xs font-bold uppercase tracking-wider border-b-2 transition-all',
            statusFilter === 'PAUSED' ? 'border-brand-600 text-brand-700' : 'border-transparent text-muted-foreground hover:text-foreground'
          )}
        >
          Dijeda ({schedules.filter(s => !s.isActive).length})
        </button>
      </div>

      {/* Schedule List */}
      <div className="space-y-3">
        {filteredSchedules.map((s) => {
          const isExpanded = expandedId === s.id;
          const addOns = parseAddOns(s.addOns);

          return (
            <div
              key={s.id}
              className="bg-card rounded-2xl border border-border overflow-hidden hover:shadow-md transition-shadow"
            >
              {/* Main Row */}
              <div className="p-4 flex flex-col sm:flex-row sm:items-center gap-3">
                {/* Status + User Info */}
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  <div className={cn(
                    'w-10 h-10 rounded-xl flex items-center justify-center shrink-0 text-white font-black text-sm',
                    s.isActive ? 'bg-gradient-to-br from-emerald-500 to-emerald-600' : 'bg-gradient-to-br from-gray-400 to-gray-500'
                  )}>
                    {s.userName.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0 space-y-0.5">
                    <div className="flex items-center gap-2">
                      <h4 className="font-bold text-sm text-foreground line-clamp-1">{s.userName}</h4>
                      <span className={cn(
                        'px-2 py-0.5 rounded-full text-[9px] font-black tracking-wide uppercase',
                        s.isActive ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-100 text-gray-600'
                      )}>
                        {s.isActive ? 'Active' : 'Paused'}
                      </span>
                    </div>
                    <p className="text-[11px] text-muted-foreground font-medium">{s.userPhone}</p>
                  </div>
                </div>

                {/* Product Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <Package className="w-3.5 h-3.5 text-brand-600 shrink-0" />
                    <span className="text-xs font-bold text-foreground line-clamp-1">{s.productName}</span>
                    <span className="text-[9px] font-bold text-muted-foreground bg-muted px-1.5 py-0.5 rounded shrink-0">x{s.quantity}</span>
                  </div>
                  <p className="text-[11px] text-brand-700 font-bold mt-0.5">{formatRupiah(s.price * s.quantity)}</p>
                </div>

                {/* Frequency */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                    <span className="text-xs font-medium text-foreground">{getFrequencyLabel(s)}</span>
                  </div>
                  {s.nextTriggeredAt && (
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      Next: {new Date(s.nextTriggeredAt).toLocaleString('id-ID')}
                    </p>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 shrink-0">
                  {s.isActive ? (
                    <button
                      onClick={() => handleAction(s.id, 'pause')}
                      disabled={actionLoading === s.id}
                      className="py-1.5 px-3 text-[10px] font-bold rounded-xl border border-amber-200 text-amber-700 bg-amber-50/20 hover:bg-amber-50 transition-colors flex items-center gap-1"
                      title="Jeda Jadwal"
                    >
                      <Pause className="w-3 h-3" /> Jeda
                    </button>
                  ) : (
                    <button
                      onClick={() => handleAction(s.id, 'resume')}
                      disabled={actionLoading === s.id}
                      className="py-1.5 px-3 text-[10px] font-bold rounded-xl border border-emerald-200 text-emerald-700 bg-emerald-50/20 hover:bg-emerald-50 transition-colors flex items-center gap-1"
                      title="Lanjutkan Jadwal"
                    >
                      <Play className="w-3 h-3" /> Lanjut
                    </button>
                  )}
                  <button
                    onClick={() => handleAction(s.id, 'cancel')}
                    disabled={actionLoading === s.id}
                    className="py-1.5 px-3 text-[10px] font-bold rounded-xl border border-red-200 text-red-600 bg-red-50/10 hover:bg-red-50 transition-colors flex items-center gap-1"
                    title="Batalkan Jadwal"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                  <button
                    onClick={() => setExpandedId(isExpanded ? null : s.id)}
                    className="py-1.5 px-2 text-[10px] font-bold rounded-xl border border-border text-muted-foreground hover:bg-muted transition-colors"
                  >
                    {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              {/* Expanded Details */}
              {isExpanded && (
                <div className="px-4 pb-4 pt-0 border-t border-border/40">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mt-3">
                    <div className="space-y-1.5">
                      <p className="text-[9px] font-black uppercase tracking-wider text-muted-foreground">Detail Pesanan</p>
                      <div className="text-[11px] text-foreground space-y-0.5">
                        <p>Ukuran: <span className="font-bold">{s.size}</span></p>
                        <p>Es: <span className="font-bold">{s.iceLevel}</span></p>
                        <p>Gula: <span className="font-bold">{s.sugarLevel}</span></p>
                        {addOns.length > 0 && (
                          <div>
                            <p className="font-semibold">Add-ons:</p>
                            {addOns.map((a, i) => (
                              <p key={i} className="ml-2">• {a.name} (+{formatRupiah(a.price)})</p>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <p className="text-[9px] font-black uppercase tracking-wider text-muted-foreground">Pengiriman</p>
                      <div className="text-[11px] text-foreground space-y-0.5">
                        <div className="flex items-start gap-1">
                          <MapPin className="w-3.5 h-3.5 text-rose-500 shrink-0 mt-0.5" />
                          <span>{s.deliveryAddress}</span>
                        </div>
                        <p>Pembayaran: <span className="font-bold">{s.paymentMethod}</span></p>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <p className="text-[9px] font-black uppercase tracking-wider text-muted-foreground">Riwayat</p>
                      <div className="text-[11px] text-foreground space-y-0.5">
                        <p>Dibuat: {new Date(s.createdAt).toLocaleString('id-ID')}</p>
                        {s.lastTriggeredAt && (
                          <p>Terakhir jalan: {new Date(s.lastTriggeredAt).toLocaleString('id-ID')}</p>
                        )}
                        {s.nextTriggeredAt && (
                          <p>Trigger berikutnya: {new Date(s.nextTriggeredAt).toLocaleString('id-ID')}</p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {filteredSchedules.length === 0 && !loading && (
        <div className="text-center py-12 bg-card border border-dashed border-border rounded-2xl space-y-2">
          <ShieldAlert className="w-10 h-10 text-muted-foreground mx-auto" />
          <h4 className="font-bold text-sm text-foreground">Tidak Ada Jadwal</h4>
          <p className="text-xs text-muted-foreground">Belum ada jadwal auto-reorder yang sesuai filter.</p>
        </div>
      )}
    </div>
  );
}
