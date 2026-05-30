'use client';

import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, Plus, X, Target, Trophy, Zap, CheckCircle2,
  Edit3, Trash2, ToggleLeft, ToggleRight, ShieldAlert,
  Swords, TrendingUp, Users, Star,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/components/ui/Toast';

interface QuestStats {
  total: number;
  completed: number;
  claimed: number;
}

interface Quest {
  id: string;
  title: string;
  description: string;
  type: string;
  targetType: string;
  targetValue: number;
  rewardPoints: number;
  rewardVoucher: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  stats: QuestStats;
}

interface Overview {
  totalActive: number;
  totalCompletions: number;
  totalQuests: number;
  mostPopular: { id: string; title: string; participants: number } | null;
}

const QUEST_TYPES = ['DAILY', 'WEEKLY', 'SPECIAL'];
const TARGET_TYPES = [
  { value: 'TRANSACTION_COUNT', label: 'Jumlah Transaksi' },
  { value: 'DINE_IN_COUNT', label: 'Dine-In Count' },
  { value: 'TUMBLER_COUNT', label: 'Penggunaan Tumbler' },
  { value: 'TOP_UP_COUNT', label: 'Top-Up Count' },
];

const typeColors: Record<string, string> = {
  DAILY: 'bg-blue-100 text-blue-800',
  WEEKLY: 'bg-purple-100 text-purple-800',
  SPECIAL: 'bg-amber-100 text-amber-800',
};

const typeIcons: Record<string, React.ReactNode> = {
  DAILY: <Zap className="w-3.5 h-3.5" />,
  WEEKLY: <TrendingUp className="w-3.5 h-3.5" />,
  SPECIAL: <Star className="w-3.5 h-3.5" />,
};

export default function AdminQuestsClient() {
  const [quests, setQuests] = useState<Quest[]>([]);
  const [overview, setOverview] = useState<Overview | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingQuest, setEditingQuest] = useState<Quest | null>(null);

  // Form state
  const [formTitle, setFormTitle] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formType, setFormType] = useState('DAILY');
  const [formTargetType, setFormTargetType] = useState('TRANSACTION_COUNT');
  const [formTargetValue, setFormTargetValue] = useState('');
  const [formRewardPoints, setFormRewardPoints] = useState('');
  const [formRewardVoucher, setFormRewardVoucher] = useState('');
  const [formIsActive, setFormIsActive] = useState(true);

  const { showToast } = useToast();

  const fetchQuests = async () => {
    try {
      const res = await fetch('/api/admin/quests');
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      setQuests(data.quests);
      setOverview(data.overview);
    } catch (err) {
      showToast('Gagal memuat data quest.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQuests();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filteredQuests = useMemo(() => {
    return quests.filter((q) => {
      const matchSearch = q.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        q.description.toLowerCase().includes(searchTerm.toLowerCase());
      const matchTab =
        activeTab === 'ALL' ||
        (activeTab === 'ACTIVE' && q.isActive) ||
        (activeTab === 'INACTIVE' && !q.isActive);
      return matchSearch && matchTab;
    });
  }, [quests, searchTerm, activeTab]);

  const openCreateModal = () => {
    setEditingQuest(null);
    setFormTitle('');
    setFormDescription('');
    setFormType('DAILY');
    setFormTargetType('TRANSACTION_COUNT');
    setFormTargetValue('');
    setFormRewardPoints('');
    setFormRewardVoucher('');
    setFormIsActive(true);
    setIsModalOpen(true);
  };

  const openEditModal = (quest: Quest) => {
    setEditingQuest(quest);
    setFormTitle(quest.title);
    setFormDescription(quest.description);
    setFormType(quest.type);
    setFormTargetType(quest.targetType);
    setFormTargetValue(String(quest.targetValue));
    setFormRewardPoints(String(quest.rewardPoints));
    setFormRewardVoucher(quest.rewardVoucher || '');
    setFormIsActive(quest.isActive);
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle || !formDescription || !formTargetValue) {
      showToast('Lengkapi semua field yang wajib diisi!', 'error');
      return;
    }

    setSaving(true);
    try {
      const body = {
        ...(editingQuest ? { id: editingQuest.id } : {}),
        title: formTitle,
        description: formDescription,
        type: formType,
        targetType: formTargetType,
        targetValue: Number(formTargetValue),
        rewardPoints: Number(formRewardPoints) || 0,
        rewardVoucher: formRewardVoucher || null,
        isActive: formIsActive,
      };

      const res = await fetch('/api/admin/quests', {
        method: editingQuest ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!res.ok) throw new Error(await res.text());

      showToast(editingQuest ? 'Quest berhasil diperbarui!' : 'Quest baru berhasil dibuat!', 'success');
      setIsModalOpen(false);
      fetchQuests();
    } catch (err) {
      showToast('Gagal menyimpan quest.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async (quest: Quest) => {
    try {
      const res = await fetch('/api/admin/quests', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: quest.id, isActive: !quest.isActive }),
      });
      if (!res.ok) throw new Error('Failed');
      setQuests((prev) =>
        prev.map((q) => (q.id === quest.id ? { ...q, isActive: !q.isActive } : q))
      );
      showToast(`Quest ${!quest.isActive ? 'diaktifkan' : 'dinonaktifkan'}.`, 'success');
    } catch {
      showToast('Gagal mengubah status quest.', 'error');
    }
  };

  const handleDelete = async (quest: Quest) => {
    if (!confirm(`Hapus quest "${quest.title}"? Tindakan ini tidak dapat dibatalkan.`)) return;
    try {
      const res = await fetch(`/api/admin/quests?id=${quest.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed');
      setQuests((prev) => prev.filter((q) => q.id !== quest.id));
      showToast('Quest berhasil dihapus.', 'success');
    } catch {
      showToast('Gagal menghapus quest.', 'error');
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 bg-card rounded-2xl border border-border animate-pulse" />
          ))}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-48 bg-card rounded-2xl border border-border animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-card rounded-2xl border border-border p-4 flex items-center gap-3"
        >
          <div className="w-10 h-10 rounded-xl bg-brand-50 flex items-center justify-center">
            <Swords className="w-5 h-5 text-brand-600" />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">Quest Aktif</p>
            <p className="text-xl font-black text-foreground">{overview?.totalActive || 0}</p>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="bg-card rounded-2xl border border-border p-4 flex items-center gap-3"
        >
          <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center">
            <Trophy className="w-5 h-5 text-emerald-600" />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">Total Selesai</p>
            <p className="text-xl font-black text-foreground">{overview?.totalCompletions || 0}</p>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-card rounded-2xl border border-border p-4 flex items-center gap-3"
        >
          <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center">
            <Star className="w-5 h-5 text-amber-600" />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">Paling Populer</p>
            <p className="text-sm font-bold text-foreground truncate max-w-[160px]">
              {overview?.mostPopular?.title || '-'}
            </p>
            {overview?.mostPopular && (
              <p className="text-[10px] text-muted-foreground">{overview.mostPopular.participants} peserta</p>
            )}
          </div>
        </motion.div>
      </div>

      {/* Search & Create */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Cari quest..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm rounded-xl border border-border bg-card focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
          />
        </div>
        <button
          onClick={openCreateModal}
          className="px-4 py-2 text-sm font-bold rounded-xl gradient-brand text-white shadow-md hover:shadow-lg transition-all flex items-center gap-1.5"
        >
          <Plus className="w-4 h-4" />
          Buat Quest
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border select-none">
        <button
          onClick={() => setActiveTab('ALL')}
          className={cn(
            "px-4 py-2 text-xs font-bold uppercase tracking-wider border-b-2 transition-all",
            activeTab === 'ALL' ? 'border-brand-600 text-brand-700' : 'border-transparent text-muted-foreground hover:text-foreground'
          )}
        >
          Semua ({quests.length})
        </button>
        <button
          onClick={() => setActiveTab('ACTIVE')}
          className={cn(
            "px-4 py-2 text-xs font-bold uppercase tracking-wider border-b-2 transition-all flex items-center gap-1.5",
            activeTab === 'ACTIVE' ? 'border-brand-600 text-brand-700' : 'border-transparent text-muted-foreground hover:text-foreground'
          )}
        >
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          Aktif
        </button>
        <button
          onClick={() => setActiveTab('INACTIVE')}
          className={cn(
            "px-4 py-2 text-xs font-bold uppercase tracking-wider border-b-2 transition-all",
            activeTab === 'INACTIVE' ? 'border-brand-600 text-brand-700' : 'border-transparent text-muted-foreground hover:text-foreground'
          )}
        >
          Nonaktif
        </button>
      </div>

      {/* Quest Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <AnimatePresence mode="popLayout">
          {filteredQuests.map((quest, idx) => {
            const completionRate = quest.stats.total > 0
              ? Math.round((quest.stats.completed / quest.stats.total) * 100)
              : 0;

            return (
              <motion.div
                key={quest.id}
                layout
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ delay: idx * 0.03 }}
                className="bg-card rounded-2xl border border-border overflow-hidden p-4 flex flex-col justify-between hover:shadow-md transition-shadow relative"
              >
                {/* Status badge */}
                {quest.isActive ? (
                  <span className="absolute top-3 right-3 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[9px] font-black tracking-wide uppercase flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                    Active
                  </span>
                ) : (
                  <span className="absolute top-3 right-3 px-2 py-0.5 rounded-full bg-gray-100 text-gray-800 text-[9px] font-black tracking-wide uppercase">
                    Inactive
                  </span>
                )}

                <div className="space-y-2">
                  {/* Type badge */}
                  <div className="flex items-center gap-1.5">
                    <span className={cn("px-2 py-0.5 rounded-full text-[9px] font-black tracking-wide uppercase flex items-center gap-1", typeColors[quest.type] || 'bg-gray-100 text-gray-800')}>
                      {typeIcons[quest.type]}
                      {quest.type}
                    </span>
                  </div>

                  <h4 className="font-bold text-sm text-foreground leading-snug line-clamp-1 pr-16">{quest.title}</h4>
                  <p className="text-[11px] text-muted-foreground line-clamp-2">{quest.description}</p>

                  {/* Target & Reward */}
                  <div className="flex items-center gap-3 mt-1">
                    <div className="flex items-center gap-1">
                      <Target className="w-3.5 h-3.5 text-brand-600" />
                      <span className="text-[10px] font-bold text-muted-foreground">
                        {quest.targetValue}x {TARGET_TYPES.find(t => t.value === quest.targetType)?.label || quest.targetType}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {quest.rewardPoints > 0 && (
                      <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded">
                        +{quest.rewardPoints} Poin
                      </span>
                    )}
                    {quest.rewardVoucher && (
                      <span className="text-[10px] font-bold text-purple-700 bg-purple-50 px-1.5 py-0.5 rounded">
                        🎟️ Voucher
                      </span>
                    )}
                  </div>
                </div>

                {/* Completion Stats */}
                <div className="mt-3.5 pt-2.5 border-t border-border/50 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-muted-foreground">Completion Rate</span>
                    <span className="text-[10px] font-black text-foreground">{completionRate}%</span>
                  </div>
                  <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                    <motion.div
                      className="h-full bg-gradient-to-r from-brand-400 to-brand-600 rounded-full"
                      initial={{ width: 0 }}
                      animate={{ width: `${completionRate}%` }}
                      transition={{ duration: 0.8, delay: idx * 0.05 }}
                    />
                  </div>
                  <div className="flex items-center justify-between text-[9px] text-muted-foreground font-medium">
                    <span>{quest.stats.completed} selesai</span>
                    <span>{quest.stats.total} peserta</span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 mt-4 pt-3.5 border-t border-border/40 select-none">
                  <button
                    onClick={() => openEditModal(quest)}
                    className="flex-1 py-2 px-3 text-[11px] font-bold rounded-xl border border-brand-500 text-brand-700 bg-brand-50/20 hover:bg-brand-50/50 transition-colors flex items-center justify-center gap-1 shadow-sm"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    Edit
                  </button>
                  <button
                    onClick={() => handleToggle(quest)}
                    className={cn(
                      "py-2 px-3 text-[11px] font-bold rounded-xl border transition-colors flex items-center justify-center",
                      quest.isActive
                        ? "border-amber-200 text-amber-600 bg-amber-50/10 hover:bg-amber-50"
                        : "border-emerald-200 text-emerald-600 bg-emerald-50/10 hover:bg-emerald-50"
                    )}
                    title={quest.isActive ? 'Nonaktifkan' : 'Aktifkan'}
                  >
                    {quest.isActive ? <ToggleRight className="w-4 h-4" /> : <ToggleLeft className="w-4 h-4" />}
                  </button>
                  <button
                    onClick={() => handleDelete(quest)}
                    className="py-2 px-3 text-[11px] font-bold rounded-xl border border-red-200 text-red-600 bg-red-50/10 hover:bg-red-50 transition-colors flex items-center justify-center"
                    title="Hapus Quest"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {filteredQuests.length === 0 && !loading && (
        <div className="text-center py-12 bg-card border border-dashed border-border rounded-2xl space-y-2">
          <ShieldAlert className="w-10 h-10 text-muted-foreground mx-auto" />
          <h4 className="font-bold text-sm text-foreground">Tidak Ada Quest</h4>
          <p className="text-xs text-muted-foreground">Buat quest baru untuk mulai gamifikasi!</p>
        </div>
      )}

      {/* Create/Edit Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/50 backdrop-blur-sm"
              onClick={() => setIsModalOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-card w-full max-w-md rounded-2xl shadow-2xl p-6 relative border border-border max-h-[90vh] overflow-y-auto"
            >
              <button
                onClick={() => setIsModalOpen(false)}
                className="absolute top-4 right-4 text-muted-foreground hover:text-foreground w-7 h-7 rounded-full flex items-center justify-center bg-muted hover:bg-border transition-all"
              >
                <X className="w-4 h-4" />
              </button>

              <h3 className="font-heading font-black text-base text-foreground mb-1 flex items-center gap-2">
                <Swords className="w-5 h-5 text-brand-600" />
                {editingQuest ? 'Edit Quest' : 'Buat Quest Baru'}
              </h3>
              <p className="text-[11px] text-muted-foreground mb-4">
                {editingQuest ? 'Perbarui detail quest.' : 'Tambahkan tantangan baru untuk pelanggan.'}
              </p>

              <form onSubmit={handleSave} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">Judul Quest</label>
                  <input
                    type="text"
                    required
                    value={formTitle}
                    onChange={(e) => setFormTitle(e.target.value)}
                    className="w-full px-4 py-2.5 text-sm rounded-xl border border-border bg-card focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
                    placeholder="Contoh: Misi Harian Matcha"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">Deskripsi</label>
                  <textarea
                    required
                    value={formDescription}
                    onChange={(e) => setFormDescription(e.target.value)}
                    rows={2}
                    className="w-full px-4 py-2.5 text-sm rounded-xl border border-border bg-card focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 resize-none"
                    placeholder="Jelaskan tantangan ini..."
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">Tipe Quest</label>
                    <select
                      value={formType}
                      onChange={(e) => setFormType(e.target.value)}
                      className="w-full px-4 py-2.5 text-sm rounded-xl border border-border bg-card focus:outline-none focus:border-brand-500"
                    >
                      {QUEST_TYPES.map((t) => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">Target Tipe</label>
                    <select
                      value={formTargetType}
                      onChange={(e) => setFormTargetType(e.target.value)}
                      className="w-full px-4 py-2.5 text-sm rounded-xl border border-border bg-card focus:outline-none focus:border-brand-500"
                    >
                      {TARGET_TYPES.map((t) => (
                        <option key={t.value} value={t.value}>{t.label}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">Target Jumlah</label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={formTargetValue}
                    onChange={(e) => setFormTargetValue(e.target.value)}
                    className="w-full px-4 py-2.5 text-sm rounded-xl border border-border bg-card focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
                    placeholder="Contoh: 5"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">Reward Poin</label>
                    <input
                      type="number"
                      min="0"
                      value={formRewardPoints}
                      onChange={(e) => setFormRewardPoints(e.target.value)}
                      className="w-full px-4 py-2.5 text-sm rounded-xl border border-border bg-card focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
                      placeholder="0"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">Voucher Code</label>
                    <input
                      type="text"
                      value={formRewardVoucher}
                      onChange={(e) => setFormRewardVoucher(e.target.value)}
                      className="w-full px-4 py-2.5 text-sm rounded-xl border border-border bg-card focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
                      placeholder="Opsional"
                    />
                  </div>
                </div>

                {/* Active Toggle */}
                <div className="flex items-center justify-between p-3 bg-muted/50 rounded-xl">
                  <div>
                    <p className="text-xs font-bold text-foreground">Status Quest</p>
                    <p className="text-[10px] text-muted-foreground">{formIsActive ? 'Quest aktif dan terlihat pelanggan' : 'Quest nonaktif'}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setFormIsActive(!formIsActive)}
                    className={cn("relative w-11 h-6 rounded-full transition-colors", formIsActive ? 'bg-brand-500' : 'bg-muted-foreground/30')}
                  >
                    <span className={cn("absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform", formIsActive ? 'left-[22px]' : 'left-0.5')} />
                  </button>
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
                    disabled={saving}
                    className="flex-1 py-3 px-4 rounded-xl gradient-brand text-white text-xs font-bold shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-1.5"
                  >
                    {saving && <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin shrink-0" />}
                    {editingQuest ? 'Simpan' : 'Buat Quest'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
