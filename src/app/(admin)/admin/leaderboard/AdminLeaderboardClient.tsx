'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Crown, ShoppingCart, Users, Leaf, Calendar,
  TrendingUp, DollarSign, UserPlus, Recycle, ShieldAlert,
} from 'lucide-react';
import { cn, formatRupiah } from '@/lib/utils';
import { useToast } from '@/components/ui/Toast';

interface LeaderEntry {
  rank: number;
  userId: string;
  name: string;
  phone: string;
  image: string | null;
  // Spender-specific
  totalSpent?: number;
  orderCount?: number;
  // Referrer-specific
  referralCount?: number;
  // Eco-specific
  tumblerCount?: number;
  arusLevel?: string;
}

interface Overview {
  totalSpending: number;
  totalOrders: number;
  totalReferrals: number;
  totalTumblerUses: number;
}

type TabKey = 'spenders' | 'orders' | 'referrers' | 'eco';

const TABS: { key: TabKey; label: string; icon: React.ReactNode; color: string }[] = [
  { key: 'spenders', label: 'Top Spenders', icon: <DollarSign className="w-4 h-4" />, color: 'text-amber-600' },
  { key: 'orders', label: 'Most Orders', icon: <ShoppingCart className="w-4 h-4" />, color: 'text-blue-600' },
  { key: 'referrers', label: 'Top Referrers', icon: <UserPlus className="w-4 h-4" />, color: 'text-purple-600' },
  { key: 'eco', label: 'Eco Champions', icon: <Recycle className="w-4 h-4" />, color: 'text-emerald-600' },
];

const RANGES = [
  { value: 'week', label: 'Minggu Ini' },
  { value: 'month', label: 'Bulan Ini' },
  { value: 'all', label: 'Semua Waktu' },
];

const PODIUM_COLORS = [
  'from-amber-400 to-yellow-500', // 1st
  'from-gray-300 to-gray-400',     // 2nd
  'from-orange-400 to-amber-600',  // 3rd
];

const PODIUM_HEIGHTS = ['h-28', 'h-20', 'h-16'];
const PODIUM_ORDER = [1, 0, 2]; // Display order: 2nd, 1st, 3rd

export default function AdminLeaderboardClient() {
  const [activeTab, setActiveTab] = useState<TabKey>('spenders');
  const [range, setRange] = useState('all');
  const [data, setData] = useState<{
    topSpenders: LeaderEntry[];
    mostOrders: LeaderEntry[];
    topReferrers: LeaderEntry[];
    ecoChampions: LeaderEntry[];
    overview: Overview;
  } | null>(null);
  const [loading, setLoading] = useState(true);

  const { showToast } = useToast();

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/leaderboard?range=${range}`);
      if (!res.ok) throw new Error('Failed');
      const json = await res.json();
      setData(json);
    } catch {
      showToast('Gagal memuat data leaderboard.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [range]);

  const getCurrentList = (): LeaderEntry[] => {
    if (!data) return [];
    switch (activeTab) {
      case 'spenders': return data.topSpenders;
      case 'orders': return data.mostOrders;
      case 'referrers': return data.topReferrers;
      case 'eco': return data.ecoChampions;
    }
  };

  const getMetricValue = (entry: LeaderEntry): string => {
    switch (activeTab) {
      case 'spenders': return formatRupiah(entry.totalSpent || 0);
      case 'orders': return `${entry.orderCount || 0} pesanan`;
      case 'referrers': return `${entry.referralCount || 0} referral`;
      case 'eco': return `${entry.tumblerCount || 0} tumbler`;
    }
  };

  const getMetricLabel = (): string => {
    switch (activeTab) {
      case 'spenders': return 'Total Belanja';
      case 'orders': return 'Jumlah Pesanan';
      case 'referrers': return 'Total Referral';
      case 'eco': return 'Penggunaan Tumbler';
    }
  };

  const list = getCurrentList();
  const top3 = list.slice(0, 3);
  const rest = list.slice(3);

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-24 bg-card rounded-2xl border border-border animate-pulse" />
          ))}
        </div>
        <div className="h-64 bg-card rounded-2xl border border-border animate-pulse" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Overview Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total Belanja', value: formatRupiah(data?.overview.totalSpending || 0), icon: <DollarSign className="w-5 h-5 text-amber-600" />, bg: 'bg-amber-50' },
          { label: 'Total Pesanan', value: String(data?.overview.totalOrders || 0), icon: <ShoppingCart className="w-5 h-5 text-blue-600" />, bg: 'bg-blue-50' },
          { label: 'Total Referral', value: String(data?.overview.totalReferrals || 0), icon: <UserPlus className="w-5 h-5 text-purple-600" />, bg: 'bg-purple-50' },
          { label: 'Tumbler Uses', value: String(data?.overview.totalTumblerUses || 0), icon: <Recycle className="w-5 h-5 text-emerald-600" />, bg: 'bg-emerald-50' },
        ].map((card, i) => (
          <motion.div
            key={card.label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="bg-card rounded-2xl border border-border p-4 flex items-center gap-3"
          >
            <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center", card.bg)}>
              {card.icon}
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">{card.label}</p>
              <p className="text-lg font-black text-foreground">{card.value}</p>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Range Filter */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex border-b border-border select-none overflow-x-auto w-full sm:w-auto">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={cn(
                "px-3 py-2 text-xs font-bold uppercase tracking-wider border-b-2 transition-all flex items-center gap-1.5 whitespace-nowrap",
                activeTab === tab.key ? 'border-brand-600 text-brand-700' : 'border-transparent text-muted-foreground hover:text-foreground'
              )}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-1.5">
          <Calendar className="w-4 h-4 text-muted-foreground" />
          <select
            value={range}
            onChange={(e) => setRange(e.target.value)}
            className="px-3 py-1.5 text-xs font-bold rounded-xl border border-border bg-card focus:outline-none focus:border-brand-500"
          >
            {RANGES.map((r) => (
              <option key={r.value} value={r.value}>{r.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Podium Display for Top 3 */}
      {top3.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-card rounded-2xl border border-border p-6 overflow-hidden"
        >
          <div className="flex items-end justify-center gap-3 sm:gap-6 mb-4 pt-4">
            {PODIUM_ORDER.map((podiumIdx) => {
              const entry = top3[podiumIdx];
              if (!entry) return <div key={podiumIdx} className="w-24" />;

              return (
                <motion.div
                  key={entry.userId}
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 + podiumIdx * 0.15 }}
                  className="flex flex-col items-center"
                >
                  {/* Avatar */}
                  <div className="relative mb-2">
                    {podiumIdx === 0 && (
                      <Crown className="w-6 h-6 text-amber-500 absolute -top-5 left-1/2 -translate-x-1/2" />
                    )}
                    <div className={cn(
                      "w-14 h-14 sm:w-16 sm:h-16 rounded-full border-3 flex items-center justify-center text-xl font-black text-white",
                      podiumIdx === 0 ? 'border-amber-400' : podiumIdx === 1 ? 'border-gray-400' : 'border-orange-400'
                    )}>
                      {entry.image ? (
                        <img src={entry.image} alt={entry.name} className="w-full h-full rounded-full object-cover" />
                      ) : (
                        <div className={cn("w-full h-full rounded-full bg-gradient-to-br flex items-center justify-center", PODIUM_COLORS[podiumIdx])}>
                          {entry.name.charAt(0).toUpperCase()}
                        </div>
                      )}
                    </div>
                    <div className={cn(
                      "absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-gradient-to-br flex items-center justify-center text-white text-[10px] font-black shadow-md",
                      PODIUM_COLORS[podiumIdx]
                    )}>
                      {podiumIdx + 1}
                    </div>
                  </div>

                  {/* Name */}
                  <p className="text-xs font-bold text-foreground text-center truncate max-w-[80px] sm:max-w-[100px]">
                    {entry.name}
                  </p>
                  <p className="text-[10px] font-bold text-brand-600 mt-0.5">{getMetricValue(entry)}</p>

                  {/* Podium bar */}
                  <div className={cn(
                    "w-20 sm:w-24 mt-2 rounded-t-xl bg-gradient-to-b",
                    PODIUM_COLORS[podiumIdx],
                    PODIUM_HEIGHTS[podiumIdx]
                  )} />
                </motion.div>
              );
            })}
          </div>
        </motion.div>
      )}

      {/* Rest of Leaderboard Table */}
      {rest.length > 0 && (
        <div className="bg-card rounded-2xl border border-border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="px-4 py-3 text-left text-[10px] font-black uppercase tracking-wider text-muted-foreground">Rank</th>
                  <th className="px-4 py-3 text-left text-[10px] font-black uppercase tracking-wider text-muted-foreground">Pelanggan</th>
                  <th className="px-4 py-3 text-left text-[10px] font-black uppercase tracking-wider text-muted-foreground">No. Telepon</th>
                  <th className="px-4 py-3 text-right text-[10px] font-black uppercase tracking-wider text-muted-foreground">{getMetricLabel()}</th>
                </tr>
              </thead>
              <tbody>
                <AnimatePresence>
                  {rest.map((entry, idx) => (
                    <motion.tr
                      key={entry.userId}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: idx * 0.02 }}
                      className="border-b border-border/50 hover:bg-muted/20 transition-colors"
                    >
                      <td className="px-4 py-3">
                        <span className="w-7 h-7 rounded-full bg-muted flex items-center justify-center text-[11px] font-black text-muted-foreground">
                          {entry.rank}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-brand-200 to-brand-400 flex items-center justify-center text-white text-xs font-bold shrink-0">
                            {entry.image ? (
                              <img src={entry.image} alt={entry.name} className="w-full h-full rounded-full object-cover" />
                            ) : (
                              entry.name.charAt(0).toUpperCase()
                            )}
                          </div>
                          <div>
                            <p className="font-bold text-xs text-foreground">{entry.name}</p>
                            {activeTab === 'eco' && entry.arusLevel && (
                              <span className="text-[9px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">
                                {entry.arusLevel}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground font-medium">{entry.phone}</td>
                      <td className="px-4 py-3 text-right">
                        <span className="text-xs font-bold text-foreground">{getMetricValue(entry)}</span>
                      </td>
                    </motion.tr>
                  ))}
                </AnimatePresence>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {list.length === 0 && !loading && (
        <div className="text-center py-12 bg-card border border-dashed border-border rounded-2xl space-y-2">
          <ShieldAlert className="w-10 h-10 text-muted-foreground mx-auto" />
          <h4 className="font-bold text-sm text-foreground">Belum Ada Data</h4>
          <p className="text-xs text-muted-foreground">Belum ada data leaderboard untuk periode ini.</p>
        </div>
      )}
    </div>
  );
}
