'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Gift, Award, Coffee, Leaf, Share2, Save, Loader2,
  Trophy, Target, Recycle, ToggleLeft, ToggleRight,
  TrendingUp, Ticket, CheckCircle2, BarChart3, ShieldCheck, Coins
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
  tumblerVoucherEnabled: boolean;
  tumblerVoucherType: string;
  tumblerVoucherDesc: string;
  referralEnabled: boolean;
  referralRewardType: string;
  referralRewardPoints: number;
  referralRewardVoucher: string;
  referralRewardDesc: string;
  
  // Point Value & Earning Settings
  pointMode: string;
  pointPerTransaction: number;
  pointPerAmount: number;
  pointValue: number;
  
  // Easter Egg fields
  easterEggEnabled: boolean;
  easterEggVoucherCode: string;
  easterEggDiscount: number;
  easterEggQuota: number;
}

interface Props {
  initialSettings: LoyaltySettingsData;
  stats: {
    totalPointsDistributed: number;
    totalVouchersIssued: number;
    totalVouchersUsed: number;
    totalEcoOrders: number;
  };
}

const REWARD_TYPES = [
  { value: 'FREE_TOPPING', label: 'Gratis Topping' },
  { value: 'UPGRADE_SIZE', label: 'Free Upgrade Size' },
  { value: 'FREE_DRINK', label: 'Minuman Gratis' },
  { value: 'DISKON_ONGKIR', label: 'Diskon Ongkir (Rp 10.000)' },
  { value: 'GRATIS_ONGKIR', label: 'Gratis Ongkir' },
  { value: 'DISCOUNT_10', label: 'Diskon 10%' },
  { value: 'DISCOUNT_20', label: 'Diskon 20%' },
  { value: 'CUSTOM', label: 'Custom' },
];

export default function LoyaltySettingsClient({ initialSettings, stats }: Props) {
  const router = useRouter();
  const [settings, setSettings] = useState(initialSettings);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [activeTab, setActiveTab] = useState<'settings' | 'analytics'>('settings');

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
        const data = await res.json().catch(() => ({}));
        alert(data.detail || data.error || 'Gagal menyimpan pengaturan');
      }
    } catch {
      alert('Terjadi kesalahan jaringan');
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

      {/* Tabs */}
      <div className="flex border-b border-border/60">
        <button
          onClick={() => setActiveTab('settings')}
          className={`px-5 py-2.5 text-sm font-bold border-b-2 transition-all ${
            activeTab === 'settings'
              ? 'border-emerald-600 text-emerald-600 font-bold'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          Konfigurasi Loyalty
        </button>
        <button
          onClick={() => setActiveTab('analytics')}
          className={`px-5 py-2.5 text-sm font-bold border-b-2 transition-all flex items-center gap-1.5 ${
            activeTab === 'analytics'
              ? 'border-emerald-600 text-emerald-600 font-bold'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <Leaf className="w-4 h-4" />
          Analytics & Eco-Impact
        </button>
      </div>

      {activeTab === 'settings' ? (
        <div className="space-y-6">
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
 
          {/* Pengaturan Nilai Rupiah Poin */}
          <div className="bg-white rounded-2xl border border-border/40 p-5 shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
            <div className="flex items-center gap-2 mb-4 border-b border-border/20 pb-3">
              <div className="p-2 rounded-xl bg-amber-50 text-amber-600">
                <Coins className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-foreground">Pengaturan Nilai Rupiah Poin</h3>
                <p className="text-[10px] text-muted-foreground">Atur harga/nilai Rupiah dari 1 poin untuk potongan diskon belanja pelanggan.</p>
              </div>
            </div>
            <div className="max-w-xs">
              <label className="block text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-1">Harga 1 Poin (Rupiah)</label>
              <input type="number" value={settings.pointValue || 0} onChange={(e) => update('pointValue', parseInt(e.target.value) || 0)}
                className="w-full px-3 py-2 text-sm bg-muted/30 border border-border/40 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/20" />
              <p className="text-[10px] text-muted-foreground mt-1">1 poin = Rp {(settings.pointValue || 0).toLocaleString('id-ID')} diskon</p>
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
              
              {/* Tumbler Eco-Voucher Settings */}
              <div className="border-t border-border/40 mt-4 pt-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-bold text-foreground">Hadiah Voucher Eco-Reward</h4>
                    <p className="text-[10px] text-muted-foreground">Berikan voucher otomatis jika membawa tumbler</p>
                  </div>
                  <ToggleButton enabled={settings.tumblerVoucherEnabled} onChange={(v) => update('tumblerVoucherEnabled', v)} />
                </div>
                
                {settings.tumblerVoucherEnabled && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 animate-fadeIn">
                    <div>
                      <label className="block text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-1">Jenis Voucher</label>
                      <select value={settings.tumblerVoucherType || 'UPGRADE_SIZE'} onChange={(e) => update('tumblerVoucherType', e.target.value)}
                        className="w-full px-3 py-2 text-sm bg-muted/30 border border-border/40 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/20">
                        {REWARD_TYPES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-1">Deskripsi Voucher</label>
                      <input type="text" value={settings.tumblerVoucherDesc || ''} onChange={(e) => update('tumblerVoucherDesc', e.target.value)}
                        className="w-full px-3 py-2 text-sm bg-muted/30 border border-border/40 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/20"
                        placeholder="Eco-Reward: Free Upgrade Size (Bawa Tumbler)" />
                    </div>
                  </div>
                )}
              </div>

              <p className="text-[10px] text-muted-foreground mt-3">
                💡 Setiap pelanggan yang bawa tumbler/wadah sendiri mendapat {settings.tumblerBonusPoints} poin extra
                {settings.tumblerDiscountPct > 0 && ` + diskon ${settings.tumblerDiscountPct}%`}.
                {settings.tumblerVoucherEnabled && ` Pelanggan juga akan secara otomatis menerima Voucher Eco-Reward!`}
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

          {/* Easter Egg Settings */}
          <div className="bg-white rounded-2xl border border-border/40 p-5 shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-indigo-50 text-indigo-600">
                  <Gift className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-foreground">Pengaturan Easter Egg & Secret Discount</h3>
                  <p className="text-[10px] text-muted-foreground">Klaim voucher rahasia ketika user menarik/menarik layar langit malam mobile</p>
                </div>
              </div>
              <ToggleButton enabled={settings.easterEggEnabled} onChange={(v) => update('easterEggEnabled', v)} />
            </div>
            
            {settings.easterEggEnabled && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 animate-fadeIn">
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-1">Kode Voucher Rahasia</label>
                  <input 
                    type="text" 
                    value={settings.easterEggVoucherCode || ''} 
                    onChange={(e) => update('easterEggVoucherCode', e.target.value.toUpperCase())}
                    className="w-full px-3 py-2 text-sm bg-muted/30 border border-border/40 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20" 
                    placeholder="EASTERSTELLAR"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-1">Nilai Diskon (Rupiah)</label>
                  <input 
                    type="number" 
                    value={settings.easterEggDiscount || 0} 
                    onChange={(e) => update('easterEggDiscount', parseInt(e.target.value) || 0)}
                    className="w-full px-3 py-2 text-sm bg-muted/30 border border-border/40 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20" 
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-1">Kuota Klaim Maksimal (Orang)</label>
                  <input 
                    type="number" 
                    value={settings.easterEggQuota || 0} 
                    onChange={(e) => update('easterEggQuota', parseInt(e.target.value) || 0)}
                    className="w-full px-3 py-2 text-sm bg-muted/30 border border-border/40 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20" 
                  />
                </div>
              </div>
            )}
            
            <p className="text-[10px] text-muted-foreground mt-3">
              💡 Ketika Easter Egg aktif, pengguna mobile yang menarik ke bawah (*pull down*) pada spanduk langit malam akan membuka pemandangan langit malam penuh dan dapat mengklaim voucher rahasia diskon Rp {(settings.easterEggDiscount || 15000).toLocaleString('id-ID')} (Terbatas hanya untuk {settings.easterEggQuota || 10} orang tercepat!).
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-6 animate-fadeIn">
          {/* Eco-Impact Spotlight Card */}
          <div className="bg-gradient-to-br from-emerald-500 to-teal-600 rounded-3xl p-6 text-white relative overflow-hidden shadow-lg shadow-emerald-100/50">
            <div className="absolute -top-10 -right-10 w-36 h-36 bg-white/10 rounded-full blur-xl" />
            <div className="absolute -bottom-10 -left-10 w-28 h-28 bg-black/10 rounded-full blur-lg" />
            
            <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-1">
                <span className="px-2.5 py-0.5 rounded-full bg-white/20 text-xs font-bold uppercase tracking-wider">Laporan Ramah Lingkungan</span>
                <h2 className="text-2xl font-black mt-1">Dampak Kampanye Eco-Tumbler</h2>
                <p className="text-sm text-emerald-50 max-w-xl mt-1 leading-relaxed">
                  Terima kasih kepada pelanggan setia! Dengan menggunakan tumbler sendiri saat memesan kopi, kita bersama-sama mengurangi timbunan sampah plastik sekali pakai.
                </p>
              </div>
              <div className="flex items-center gap-3 bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-4 shrink-0">
                <Leaf className="w-8 h-8 text-emerald-200 animate-pulse" />
                <div>
                  <p className="text-3xl font-extrabold">{stats.totalEcoOrders}</p>
                  <p className="text-[10px] text-emerald-100 font-bold uppercase">Gelas Plastik Dihemat</p>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Voucher Performance Analysis */}
            <div className="bg-white rounded-3xl border border-border/40 p-5 shadow-[0_1px_2px_rgba(0,0,0,0.03)] space-y-4">
              <h3 className="text-base font-bold text-foreground flex items-center gap-2 border-b border-border/20 pb-3">
                <BarChart3 className="w-5 h-5 text-indigo-500" />
                Kinerja Penukaran Voucher
              </h3>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-gray-50/50 p-4 rounded-2xl border border-gray-100/50">
                    <p className="text-xs font-medium text-muted-foreground">Total Diterbitkan</p>
                    <p className="text-2xl font-bold text-gray-800 mt-1">{stats.totalVouchersIssued}</p>
                  </div>
                  <div className="bg-gray-50/50 p-4 rounded-2xl border border-gray-100/50">
                    <p className="text-xs font-medium text-muted-foreground">Total Digunakan</p>
                    <p className="text-2xl font-bold text-gray-800 mt-1 text-emerald-600">{stats.totalVouchersUsed}</p>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-xs font-bold text-muted-foreground">
                    <span>Rasio Penukaran (Redemption Rate)</span>
                    <span className="text-emerald-600">
                      {stats.totalVouchersIssued > 0 
                        ? ((stats.totalVouchersUsed / stats.totalVouchersIssued) * 100).toFixed(1) 
                        : '0.0'}%
                    </span>
                  </div>
                  <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 rounded-full"
                      style={{ 
                        width: `${stats.totalVouchersIssued > 0 
                          ? Math.min((stats.totalVouchersUsed / stats.totalVouchersIssued) * 100, 100) 
                          : 0}%` 
                      }}
                    />
                  </div>
                  <p className="text-[10px] text-muted-foreground leading-relaxed">
                    💡 Rasio penukaran menunjukkan seberapa aktif pelanggan menggunakan voucher reward mereka. Rasio di atas 30% menandakan engagement program loyalty yang sangat baik!
                  </p>
                </div>
              </div>
            </div>

            {/* Eco Campaign Analytics */}
            <div className="bg-white rounded-3xl border border-border/40 p-5 shadow-[0_1px_2px_rgba(0,0,0,0.03)] space-y-4">
              <h3 className="text-base font-bold text-foreground flex items-center gap-2 border-b border-border/20 pb-3">
                <Recycle className="w-5 h-5 text-emerald-500" />
                Statistik Kampanye Hijau
              </h3>

              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-emerald-50/20 border border-emerald-100/30 rounded-2xl">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600">
                      <Coffee className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-gray-800">Total Eco-Checkouts</p>
                      <p className="text-[10px] text-muted-foreground">Menggunakan tumbler sendiri</p>
                    </div>
                  </div>
                  <p className="text-lg font-black text-emerald-700">{stats.totalEcoOrders} kali</p>
                </div>

                <div className="flex items-center justify-between p-3 bg-teal-50/20 border border-teal-100/30 rounded-2xl">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-teal-50 text-teal-600">
                      <Recycle className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-gray-800">Cup Plastik Dihindari</p>
                      <p className="text-[10px] text-muted-foreground">Mencegah sampah plastik sekali pakai</p>
                    </div>
                  </div>
                  <p className="text-lg font-black text-teal-700">{stats.totalEcoOrders} cup</p>
                </div>

                <div className="p-4 bg-gray-50 rounded-2xl">
                  <h4 className="text-xs font-bold text-gray-700 flex items-center gap-1.5 mb-1">
                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                    Tentang Data Eco-Impact
                  </h4>
                  <p className="text-[10px] text-muted-foreground leading-relaxed">
                    Setiap transaksi belanja yang mengaktifkan opsi "Bawa Tumbler" dihitung sebagai 1 eco-checkout. Hal ini berkontribusi langsung mengurangi sampah plastik di lingkungan sekitar gerai Arum Seduh!
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
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
