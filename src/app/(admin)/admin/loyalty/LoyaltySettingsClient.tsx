'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Gift, Award, Coffee, Leaf, Share2, Save, Loader2,
  Trophy, Target, Recycle, ToggleLeft, ToggleRight,
  TrendingUp, Ticket, CheckCircle2
} from 'lucide-react';

interface LoyaltySettingsData {
  id: string;
  milestone1Points: number;
  milestone1Reward: string;
  milestone1Desc: string;
  milestone1Enabled: boolean;
  milestone2Points: number;
  milestone2Reward: string;
  milestone2Desc: string;
  milestone2Enabled: boolean;
  milestone3Points: number;
  milestone3Reward: string;
  milestone3Desc: string;
  milestone3Enabled: boolean;
  milestone3ResetPoints: boolean;
  tumblerBonusEnabled: boolean;
  tumblerBonusPoints: number;
  tumblerDiscountPct: number;
  referralEnabled: boolean;
  referralRewardType: string;
  referralRewardPoints: number;
  referralRewardVoucher: string;
  referralRewardDesc: string;
}

interface Props {
  initialSettings: LoyaltySettingsData;
  stats: {
    totalPointsDistributed: number;
    totalVouchersIssued: number;
    totalVouchersUsed: number;
  };
}

const REWARD_TYPES = [
  { value: 'FREE_TOPPING', label: 'Gratis Topping' },
  { value: 'UPGRADE_SIZE', label: 'Free Upgrade Size' },
  { value: 'FREE_DRINK', label: 'Minuman Gratis' },
  { value: 'DISCOUNT_10', label: 'Diskon 10%' },
  { value: 'DISCOUNT_20', label: 'Diskon 20%' },
  { value: 'CUSTOM', label: 'Custom' },
];

export default function LoyaltySettingsClient({ initialSettings, stats }: Props) {
  const router = useRouter();
  const [settings, setSettings] = useState(initialSettings);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/admin/loyalty/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });
      if (res.ok) {
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
        router.refresh();
      } else {
        alert('Gagal menyimpan pengaturan');
      }
    } catch {
      alert('Terjadi kesalahan');
    } finally {
      setSaving(false);
    }
  };

  const update = (key: keyof LoyaltySettingsData, value: any) => {
    setSettings((s) => ({ ...s, [key]: value }));
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold font-heading text-foreground flex items-center gap-2">
            <Gift className="w-6 h-6 text-emerald-600" />
            Loyalty Settings
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Atur milestone poin, bonus tumbler, dan reward referral. Semua bisa diubah tanpa coding.
          </p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white shadow-sm transition-all active:scale-[0.97] ${
            saved
              ? 'bg-emerald-500'
              : 'bg-gradient-to-r from-emerald-600 to-emerald-500 hover:opacity-90'
          } disabled:opacity-50`}
        >
          {saving ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : saved ? (
            <CheckCircle2 className="w-4 h-4" />
          ) : (
            <Save className="w-4 h-4" />
          )}
          {saving ? 'Menyimpan...' : saved ? 'Tersimpan!' : 'Simpan'}
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: 'Total Poin Didistribusikan', value: stats.totalPointsDistributed, icon: TrendingUp, color: 'text-blue-600 bg-blue-50' },
          { label: 'Voucher Diterbitkan', value: stats.totalVouchersIssued, icon: Ticket, color: 'text-purple-600 bg-purple-50' },
          { label: 'Voucher Dipakai', value: stats.totalVouchersUsed, icon: CheckCircle2, color: 'text-emerald-600 bg-emerald-50' },
        ].map((s) => (
          <div key={s.label} className="bg-white rounded-2xl border border-border/40 p-4 shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-xl ${s.color}`}>
                <s.icon className="w-5 h-5" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{s.value}</p>
                <p className="text-[11px] text-muted-foreground font-medium">{s.label}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Milestone Settings */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Milestone 1 */}
        <MilestoneCard
          title="Milestone 1"
          subtitle="Reward pertama"
          icon={<Target className="w-5 h-5" />}
          color="amber"
          points={settings.milestone1Points}
          reward={settings.milestone1Reward}
          desc={settings.milestone1Desc}
          enabled={settings.milestone1Enabled}
          onPointsChange={(v) => update('milestone1Points', v)}
          onRewardChange={(v) => update('milestone1Reward', v)}
          onDescChange={(v) => update('milestone1Desc', v)}
          onEnabledChange={(v) => update('milestone1Enabled', v)}
        />

        {/* Milestone 2 */}
        <MilestoneCard
          title="Milestone 2"
          subtitle="Reward menengah"
          icon={<Award className="w-5 h-5" />}
          color="blue"
          points={settings.milestone2Points}
          reward={settings.milestone2Reward}
          desc={settings.milestone2Desc}
          enabled={settings.milestone2Enabled}
          onPointsChange={(v) => update('milestone2Points', v)}
          onRewardChange={(v) => update('milestone2Reward', v)}
          onDescChange={(v) => update('milestone2Desc', v)}
          onEnabledChange={(v) => update('milestone2Enabled', v)}
        />

        {/* Milestone 3 */}
        <div className="bg-white rounded-2xl border border-border/40 p-5 shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600">
                <Trophy className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-foreground">Milestone 3 (Target Utama)</h3>
                <p className="text-[10px] text-muted-foreground">Reward utama + reset poin</p>
              </div>
            </div>
            <ToggleButton enabled={settings.milestone3Enabled} onChange={(v) => update('milestone3Enabled', v)} />
          </div>
          <div className="space-y-3">
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-1">Target Poin</label>
              <input type="number" value={settings.milestone3Points} onChange={(e) => update('milestone3Points', parseInt(e.target.value) || 0)}
                className="w-full px-3 py-2 text-sm bg-muted/30 border border-border/40 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20" />
            </div>
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-1">Jenis Reward</label>
              <select value={settings.milestone3Reward} onChange={(e) => update('milestone3Reward', e.target.value)}
                className="w-full px-3 py-2 text-sm bg-muted/30 border border-border/40 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20">
                {REWARD_TYPES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-1">Deskripsi Reward</label>
              <input type="text" value={settings.milestone3Desc} onChange={(e) => update('milestone3Desc', e.target.value)}
                className="w-full px-3 py-2 text-sm bg-muted/30 border border-border/40 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20" />
            </div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={settings.milestone3ResetPoints} onChange={(e) => update('milestone3ResetPoints', e.target.checked)}
                className="w-4 h-4 rounded border-border text-emerald-600 focus:ring-emerald-500" />
              <span className="text-xs font-medium text-muted-foreground">Reset poin setelah milestone tercapai</span>
            </label>
          </div>
        </div>
      </div>

      {/* Tumbler & Referral */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Tumbler Bonus */}
        <div className="bg-white rounded-2xl border border-border/40 p-5 shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-teal-50 text-teal-600">
                <Recycle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-foreground">Bonus Tumbler / Wadah Sendiri</h3>
                <p className="text-[10px] text-muted-foreground">Kurangi plastik, beri bonus poin</p>
              </div>
            </div>
            <ToggleButton enabled={settings.tumblerBonusEnabled} onChange={(v) => update('tumblerBonusEnabled', v)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-1">Extra Poin</label>
              <input type="number" value={settings.tumblerBonusPoints} onChange={(e) => update('tumblerBonusPoints', parseInt(e.target.value) || 0)}
                className="w-full px-3 py-2 text-sm bg-muted/30 border border-border/40 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/20" />
            </div>
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-1">Diskon (%)</label>
              <input type="number" value={settings.tumblerDiscountPct} onChange={(e) => update('tumblerDiscountPct', parseInt(e.target.value) || 0)}
                min={0} max={100}
                className="w-full px-3 py-2 text-sm bg-muted/30 border border-border/40 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/20" />
            </div>
          </div>
          <p className="text-[10px] text-muted-foreground mt-2">
            💡 Setiap pelanggan yang bawa tumbler/wadah sendiri mendapat {settings.tumblerBonusPoints} poin extra
            {settings.tumblerDiscountPct > 0 && ` + diskon ${settings.tumblerDiscountPct}%`}.
          </p>
        </div>

        {/* Referral Settings */}
        <div className="bg-white rounded-2xl border border-border/40 p-5 shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-violet-50 text-violet-600">
                <Share2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-foreground">Referral Reward</h3>
                <p className="text-[10px] text-muted-foreground">Bonus untuk yang mengajak teman</p>
              </div>
            </div>
            <ToggleButton enabled={settings.referralEnabled} onChange={(v) => update('referralEnabled', v)} />
          </div>
          <div className="space-y-3">
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-1">Jenis Reward Referrer</label>
              <select value={settings.referralRewardType} onChange={(e) => update('referralRewardType', e.target.value)}
                className="w-full px-3 py-2 text-sm bg-muted/30 border border-border/40 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500/20">
                <option value="VOUCHER">Voucher</option>
                <option value="POINTS">Poin</option>
              </select>
            </div>
            {settings.referralRewardType === 'POINTS' ? (
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-1">Jumlah Poin</label>
                <input type="number" value={settings.referralRewardPoints} onChange={(e) => update('referralRewardPoints', parseInt(e.target.value) || 0)}
                  className="w-full px-3 py-2 text-sm bg-muted/30 border border-border/40 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500/20" />
              </div>
            ) : (
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-1">Jenis Voucher</label>
                <select value={settings.referralRewardVoucher} onChange={(e) => update('referralRewardVoucher', e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-muted/30 border border-border/40 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500/20">
                  {REWARD_TYPES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
                </select>
              </div>
            )}
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-1">Deskripsi Reward</label>
              <input type="text" value={settings.referralRewardDesc} onChange={(e) => update('referralRewardDesc', e.target.value)}
                className="w-full px-3 py-2 text-sm bg-muted/30 border border-border/40 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500/20" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Sub-components ──────────────────────────────────────

function ToggleButton({ enabled, onChange }: { enabled: boolean; onChange: (v: boolean) => void }) {
  return (
    <button onClick={() => onChange(!enabled)} className="focus:outline-none">
      {enabled ? (
        <ToggleRight className="w-7 h-7 text-emerald-500" />
      ) : (
        <ToggleLeft className="w-7 h-7 text-muted-foreground/40" />
      )}
    </button>
  );
}

function MilestoneCard({
  title, subtitle, icon, color, points, reward, desc, enabled,
  onPointsChange, onRewardChange, onDescChange, onEnabledChange
}: {
  title: string; subtitle: string; icon: React.ReactNode; color: string;
  points: number; reward: string; desc: string; enabled: boolean;
  onPointsChange: (v: number) => void; onRewardChange: (v: string) => void;
  onDescChange: (v: string) => void; onEnabledChange: (v: boolean) => void;
}) {
  return (
    <div className="bg-white rounded-2xl border border-border/40 p-5 shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className={`p-2 rounded-xl bg-${color}-50 text-${color}-600`}>
            {icon}
          </div>
          <div>
            <h3 className="text-sm font-bold text-foreground">{title}</h3>
            <p className="text-[10px] text-muted-foreground">{subtitle}</p>
          </div>
        </div>
        <ToggleButton enabled={enabled} onChange={onEnabledChange} />
      </div>
      <div className="space-y-3">
        <div>
          <label className="block text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-1">Target Poin (Kelipatan)</label>
          <input type="number" value={points} onChange={(e) => onPointsChange(parseInt(e.target.value) || 0)}
            className="w-full px-3 py-2 text-sm bg-muted/30 border border-border/40 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20" />
        </div>
        <div>
          <label className="block text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-1">Jenis Reward</label>
          <select value={reward} onChange={(e) => onRewardChange(e.target.value)}
            className="w-full px-3 py-2 text-sm bg-muted/30 border border-border/40 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20">
            {REWARD_TYPES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-1">Deskripsi Reward</label>
          <input type="text" value={desc} onChange={(e) => onDescChange(e.target.value)}
            className="w-full px-3 py-2 text-sm bg-muted/30 border border-border/40 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20" />
        </div>
      </div>
    </div>
  );
}
