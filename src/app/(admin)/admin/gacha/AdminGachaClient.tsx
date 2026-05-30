'use client';

import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Dices, Settings, History, TrendingUp, Plus, X, Trash2,
  Save, ToggleLeft, ToggleRight, ShieldAlert, Gift, Award,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/components/ui/Toast';

interface Prize {
  id: string;
  name: string;
  type: string;
  value: string;
  weight: number;
  image: string;
}

interface DrawEntry {
  id: string;
  userId: string;
  userName: string;
  userPhone: string;
  userImage: string | null;
  prizeType: string;
  prizeValue: string;
  description: string;
  createdAt: string;
}

interface Stats {
  totalDraws: number;
  prizeBreakdown: { type: string; count: number }[];
  mostCommonPrize: { description: string; count: number } | null;
}

const PRIZE_TYPES = ['POINTS', 'VOUCHER', 'MERCH'];

const PRIZE_EMOJIS: Record<string, string> = {
  POINTS: '🎯',
  VOUCHER: '🎟️',
  MERCH: '🎁',
};

const PIE_COLORS = [
  '#4ade80', '#60a5fa', '#f59e0b', '#a78bfa',
  '#f472b6', '#34d399', '#fb923c', '#818cf8',
];

export default function AdminGachaClient() {
  const [activeView, setActiveView] = useState<'config' | 'history'>('config');
  const [prizes, setPrizes] = useState<Prize[]>([]);
  const [isEnabled, setIsEnabled] = useState(true);
  const [draws, setDraws] = useState<DrawEntry[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  const { showToast } = useToast();

  const fetchData = async () => {
    setLoading(true);
    try {
      const [dataRes, configRes] = await Promise.all([
        fetch('/api/admin/gacha'),
        fetch('/api/admin/gacha?config=true'),
      ]);

      if (!dataRes.ok || !configRes.ok) throw new Error('Failed');

      const dataJson = await dataRes.json();
      const configJson = await configRes.json();

      setDraws(dataJson.draws);
      setStats(dataJson.stats);
      setPrizes(configJson.config.prizes);
      setIsEnabled(configJson.config.isEnabled);
    } catch {
      showToast('Gagal memuat data gacha.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const totalWeight = useMemo(() => prizes.reduce((s, p) => s + p.weight, 0), [prizes]);

  const handleAddPrize = () => {
    const newPrize: Prize = {
      id: Date.now().toString(),
      name: '',
      type: 'POINTS',
      value: '',
      weight: 10,
      image: '🎯',
    };
    setPrizes((prev) => [...prev, newPrize]);
    setHasChanges(true);
  };

  const handleRemovePrize = (id: string) => {
    setPrizes((prev) => prev.filter((p) => p.id !== id));
    setHasChanges(true);
  };

  const handlePrizeChange = (id: string, field: keyof Prize, value: string | number) => {
    setPrizes((prev) =>
      prev.map((p) => {
        if (p.id !== id) return p;
        const updated = { ...p, [field]: value };
        if (field === 'type') {
          updated.image = PRIZE_EMOJIS[value as string] || '🎯';
        }
        return updated;
      })
    );
    setHasChanges(true);
  };

  const handleSaveConfig = async () => {
    if (prizes.some((p) => !p.name || !p.value)) {
      showToast('Lengkapi semua nama dan value hadiah!', 'error');
      return;
    }

    setSaving(true);
    try {
      const res = await fetch('/api/admin/gacha', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prizes, isEnabled }),
      });
      if (!res.ok) throw new Error('Failed');
      showToast('Konfigurasi gacha berhasil disimpan!', 'success');
      setHasChanges(false);
    } catch {
      showToast('Gagal menyimpan konfigurasi.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleEnabled = () => {
    setIsEnabled(!isEnabled);
    setHasChanges(true);
  };

  // Build CSS conic gradient for pie chart
  const pieGradient = useMemo(() => {
    if (totalWeight === 0) return 'conic-gradient(#e5e7eb 0deg 360deg)';
    let accumulated = 0;
    const stops: string[] = [];
    prizes.forEach((p, i) => {
      const color = PIE_COLORS[i % PIE_COLORS.length];
      const start = (accumulated / totalWeight) * 360;
      accumulated += p.weight;
      const end = (accumulated / totalWeight) * 360;
      stops.push(`${color} ${start}deg ${end}deg`);
    });
    return `conic-gradient(${stops.join(', ')})`;
  }, [prizes, totalWeight]);

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 bg-card rounded-2xl border border-border animate-pulse" />
          ))}
        </div>
        <div className="h-96 bg-card rounded-2xl border border-border animate-pulse" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-card rounded-2xl border border-border p-4 flex items-center gap-3"
        >
          <div className="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center">
            <Dices className="w-5 h-5 text-purple-600" />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">Total Undian</p>
            <p className="text-xl font-black text-foreground">{stats?.totalDraws || 0}</p>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="bg-card rounded-2xl border border-border p-4 flex items-center gap-3"
        >
          <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center">
            <Gift className="w-5 h-5 text-amber-600" />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">Hadiah Diberikan</p>
            <p className="text-xl font-black text-foreground">{stats?.totalDraws || 0}</p>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-card rounded-2xl border border-border p-4 flex items-center gap-3"
        >
          <div className="w-10 h-10 rounded-xl bg-brand-50 flex items-center justify-center">
            <Award className="w-5 h-5 text-brand-600" />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">Hadiah Terpopuler</p>
            <p className="text-sm font-bold text-foreground truncate max-w-[160px]">
              {stats?.mostCommonPrize?.description || '-'}
            </p>
            {stats?.mostCommonPrize && (
              <p className="text-[10px] text-muted-foreground">{stats.mostCommonPrize.count}x diperoleh</p>
            )}
          </div>
        </motion.div>
      </div>

      {/* Gacha Enable/Disable + Tabs */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex border-b border-border select-none">
          <button
            onClick={() => setActiveView('config')}
            className={cn(
              "px-4 py-2 text-xs font-bold uppercase tracking-wider border-b-2 transition-all flex items-center gap-1.5",
              activeView === 'config' ? 'border-brand-600 text-brand-700' : 'border-transparent text-muted-foreground hover:text-foreground'
            )}
          >
            <Settings className="w-3.5 h-3.5" />
            Konfigurasi
          </button>
          <button
            onClick={() => setActiveView('history')}
            className={cn(
              "px-4 py-2 text-xs font-bold uppercase tracking-wider border-b-2 transition-all flex items-center gap-1.5",
              activeView === 'history' ? 'border-brand-600 text-brand-700' : 'border-transparent text-muted-foreground hover:text-foreground'
            )}
          >
            <History className="w-3.5 h-3.5" />
            Riwayat ({draws.length})
          </button>
        </div>

        {/* Enable Toggle */}
        <div className="flex items-center gap-3 p-2.5 bg-card rounded-xl border border-border">
          <span className="text-xs font-bold text-foreground">Gacha Event</span>
          <button
            onClick={handleToggleEnabled}
            className={cn("relative w-11 h-6 rounded-full transition-colors", isEnabled ? 'bg-brand-500' : 'bg-muted-foreground/30')}
          >
            <span className={cn("absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform", isEnabled ? 'left-[22px]' : 'left-0.5')} />
          </button>
          <span className={cn("text-[10px] font-black uppercase tracking-wider", isEnabled ? 'text-emerald-600' : 'text-muted-foreground')}>
            {isEnabled ? 'Aktif' : 'Nonaktif'}
          </span>
        </div>
      </div>

      {/* Config View */}
      {activeView === 'config' && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="space-y-4"
        >
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Prize Configuration */}
            <div className="lg:col-span-2 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-foreground">Daftar Hadiah</h3>
                <button
                  onClick={handleAddPrize}
                  className="px-3 py-1.5 text-[11px] font-bold rounded-xl border border-brand-500 text-brand-700 bg-brand-50/20 hover:bg-brand-50/50 transition-colors flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Tambah
                </button>
              </div>

              <div className="space-y-2">
                <AnimatePresence mode="popLayout">
                  {prizes.map((prize, idx) => (
                    <motion.div
                      key={prize.id}
                      layout
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                      className="bg-card rounded-xl border border-border p-3 flex flex-col sm:flex-row items-start sm:items-center gap-3"
                    >
                      {/* Emoji indicator */}
                      <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center text-xl shrink-0">
                        {prize.image}
                      </div>

                      <div className="flex-1 grid grid-cols-2 sm:grid-cols-4 gap-2 w-full">
                        <div className="space-y-0.5">
                          <label className="text-[9px] font-black uppercase tracking-wider text-muted-foreground">Nama</label>
                          <input
                            type="text"
                            value={prize.name}
                            onChange={(e) => handlePrizeChange(prize.id, 'name', e.target.value)}
                            className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-border bg-card focus:outline-none focus:border-brand-500"
                            placeholder="Nama hadiah"
                          />
                        </div>
                        <div className="space-y-0.5">
                          <label className="text-[9px] font-black uppercase tracking-wider text-muted-foreground">Tipe</label>
                          <select
                            value={prize.type}
                            onChange={(e) => handlePrizeChange(prize.id, 'type', e.target.value)}
                            className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-border bg-card focus:outline-none focus:border-brand-500"
                          >
                            {PRIZE_TYPES.map((t) => (
                              <option key={t} value={t}>{t}</option>
                            ))}
                          </select>
                        </div>
                        <div className="space-y-0.5">
                          <label className="text-[9px] font-black uppercase tracking-wider text-muted-foreground">Value</label>
                          <input
                            type="text"
                            value={prize.value}
                            onChange={(e) => handlePrizeChange(prize.id, 'value', e.target.value)}
                            className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-border bg-card focus:outline-none focus:border-brand-500"
                            placeholder="Value"
                          />
                        </div>
                        <div className="space-y-0.5">
                          <label className="text-[9px] font-black uppercase tracking-wider text-muted-foreground">
                            Bobot ({totalWeight > 0 ? Math.round((prize.weight / totalWeight) * 100) : 0}%)
                          </label>
                          <input
                            type="number"
                            min="1"
                            value={prize.weight}
                            onChange={(e) => handlePrizeChange(prize.id, 'weight', Number(e.target.value))}
                            className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-border bg-card focus:outline-none focus:border-brand-500"
                          />
                        </div>
                      </div>

                      <button
                        onClick={() => handleRemovePrize(prize.id)}
                        className="p-1.5 rounded-lg border border-red-200 text-red-500 hover:bg-red-50 transition-colors shrink-0"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>

              {/* Save Button */}
              {hasChanges && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="pt-2">
                  <button
                    onClick={handleSaveConfig}
                    disabled={saving}
                    className="w-full py-3 px-4 rounded-xl gradient-brand text-white text-xs font-bold shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-1.5"
                  >
                    {saving ? (
                      <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin shrink-0" />
                    ) : (
                      <Save className="w-4 h-4" />
                    )}
                    Simpan Konfigurasi
                  </button>
                </motion.div>
              )}
            </div>

            {/* Probability Pie Chart */}
            <div className="bg-card rounded-2xl border border-border p-4 space-y-4">
              <h3 className="text-sm font-bold text-foreground flex items-center gap-1.5">
                <TrendingUp className="w-4 h-4 text-brand-600" />
                Distribusi Probabilitas
              </h3>

              {/* CSS Pie Chart */}
              <div className="flex justify-center">
                <div
                  className="w-40 h-40 rounded-full shadow-inner border-4 border-card"
                  style={{ background: pieGradient }}
                />
              </div>

              {/* Legend */}
              <div className="space-y-1.5">
                {prizes.map((prize, idx) => {
                  const pct = totalWeight > 0 ? Math.round((prize.weight / totalWeight) * 100) : 0;
                  return (
                    <div key={prize.id} className="flex items-center gap-2">
                      <span
                        className="w-3 h-3 rounded-sm shrink-0"
                        style={{ backgroundColor: PIE_COLORS[idx % PIE_COLORS.length] }}
                      />
                      <span className="text-[11px] font-medium text-foreground flex-1 truncate">
                        {prize.name || 'Belum dinamai'}
                      </span>
                      <span className="text-[10px] font-bold text-muted-foreground">{pct}%</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* History View */}
      {activeView === 'history' && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="bg-card rounded-2xl border border-border overflow-hidden"
        >
          {draws.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    <th className="px-4 py-3 text-left text-[10px] font-black uppercase tracking-wider text-muted-foreground">Pengguna</th>
                    <th className="px-4 py-3 text-left text-[10px] font-black uppercase tracking-wider text-muted-foreground">Hadiah</th>
                    <th className="px-4 py-3 text-left text-[10px] font-black uppercase tracking-wider text-muted-foreground">Tipe</th>
                    <th className="px-4 py-3 text-right text-[10px] font-black uppercase tracking-wider text-muted-foreground">Tanggal</th>
                  </tr>
                </thead>
                <tbody>
                  {draws.map((draw, idx) => (
                    <motion.tr
                      key={draw.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: idx * 0.02 }}
                      className="border-b border-border/50 hover:bg-muted/20 transition-colors"
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-200 to-purple-400 flex items-center justify-center text-white text-xs font-bold shrink-0">
                            {draw.userImage ? (
                              <img src={draw.userImage} alt={draw.userName} className="w-full h-full rounded-full object-cover" />
                            ) : (
                              draw.userName.charAt(0).toUpperCase()
                            )}
                          </div>
                          <div>
                            <p className="font-bold text-xs text-foreground">{draw.userName}</p>
                            <p className="text-[10px] text-muted-foreground">{draw.userPhone}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-xs font-medium text-foreground">{draw.description}</p>
                      </td>
                      <td className="px-4 py-3">
                        <span className={cn(
                          "px-2 py-0.5 rounded-full text-[9px] font-black tracking-wide uppercase",
                          draw.prizeType === 'POINTS' ? 'bg-blue-100 text-blue-800' :
                          draw.prizeType === 'VOUCHER' ? 'bg-purple-100 text-purple-800' :
                          'bg-amber-100 text-amber-800'
                        )}>
                          {draw.prizeType}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className="text-[11px] text-muted-foreground font-medium">
                          {new Date(draw.createdAt).toLocaleString('id-ID')}
                        </span>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-12 space-y-2">
              <ShieldAlert className="w-10 h-10 text-muted-foreground mx-auto" />
              <h4 className="font-bold text-sm text-foreground">Belum Ada Riwayat</h4>
              <p className="text-xs text-muted-foreground">Belum ada undian gacha yang dilakukan.</p>
            </div>
          )}
        </motion.div>
      )}
    </div>
  );
}
