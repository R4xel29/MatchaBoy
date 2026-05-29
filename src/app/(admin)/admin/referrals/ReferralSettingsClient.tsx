'use client';

import { useState, useEffect } from 'react';
import { Settings, Save, RefreshCw, AlertCircle, Ticket, Gift, DollarSign, Users, Share2, ToggleLeft, ToggleRight } from 'lucide-react';
import { useToast } from '@/components/ui/Toast';

// Toggle Button Component
function ToggleButton({ enabled, onChange }: { enabled: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!enabled)}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
        enabled ? 'bg-emerald-600' : 'bg-gray-300'
      }`}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
          enabled ? 'translate-x-6' : 'translate-x-1'
        }`}
      />
    </button>
  );
}

export default function ReferralSettingsClient() {
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<any>({});
  const [referralTemplate, setReferralTemplate] = useState<any>(null);
  const [creatingTemplate, setCreatingTemplate] = useState(false);
  const [voucherTemplates, setVoucherTemplates] = useState<any[]>([]);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/loyalty/settings');
      const data = await res.json();
      setSettings(data || {});
      
      // Ambil semua template voucher untuk dropdown
      const vouchersRes = await fetch('/api/admin/vouchers');
      const vouchersData = await vouchersRes.json();
      setVoucherTemplates(vouchersData || []);
      
      // Ambil template voucher referral via system voucher endpoint
      const tmplRes = await fetch('/api/admin/vouchers/system');
      const tmplData = await tmplRes.json();
      const code = data?.referralVoucherCode || 'REFERRAL_REWARD';
      
      const systemVoucher = tmplData?.systemVouchers?.find((sv: any) => sv.activeCode === code || sv.key === 'referralVoucherCode');
      if (systemVoucher && systemVoucher.isCreated && systemVoucher.template) {
        setReferralTemplate(systemVoucher.template);
      } else {
        // Jika tidak ada di system voucher, cari manual dari daftar template
        const allRes = await fetch('/api/admin/vouchers');
        const allTemplates = await allRes.json();
        const found = allTemplates.find((t: any) => t.code === code);
        if (found) {
          setReferralTemplate(found);
        } else {
          setReferralTemplate(null);
        }
      }
    } catch (err) {
      showToast('Gagal memuat pengaturan', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTemplate = async () => {
    try {
      setCreatingTemplate(true);
      const res = await fetch('/api/admin/vouchers/system', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: 'referralVoucherCode' }),
      });
      const data = await res.json();
      if (data.success) {
        showToast('Template voucher referral berhasil dibuat!', 'success');
        fetchSettings();
      } else {
        showToast(data.error || 'Gagal membuat template voucher', 'error');
      }
    } catch (err) {
      showToast('Terjadi kesalahan koneksi', 'error');
    } finally {
      setCreatingTemplate(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      
      // 1. Save loyalty settings dengan semua field referral
      await fetch('/api/admin/loyalty/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...settings,
          referralEnabled: settings.referralEnabled,
          referralMinPurchase: Number(settings.referralMinPurchase || 0),
          referralMaxClaims: Number(settings.referralMaxClaims || 0),
          referralRewardType: settings.referralRewardType || 'VOUCHER',
          referralRewardPoints: Number(settings.referralRewardPoints || 5),
          referralRewardVoucher: settings.referralRewardVoucher || '',
          referralRewardDesc: settings.referralRewardDesc || '',
        }),
      });

      // 2. Save template if voucher type is selected
      if (settings.referralRewardType === 'VOUCHER' && referralTemplate) {
        await fetch(`/api/admin/vouchers/templates/${referralTemplate.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: referralTemplate.title,
            description: referralTemplate.description,
            type: referralTemplate.type,
            discountValue: Number(referralTemplate.discountValue || 0),
          }),
        });
      }

      showToast('Pengaturan referral berhasil disimpan', 'success');
    } catch (err) {
      showToast('Gagal menyimpan pengaturan', 'error');
    } finally {
      setSaving(false);
    }
  };

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

  const dynamicRewardTypes = [
    ...REWARD_TYPES,
    ...voucherTemplates.map((t) => ({
      value: t.code,
      label: `Template: ${t.title} (${t.code})`,
    })),
  ];

  if (loading) {
    return <div className="flex justify-center p-12"><RefreshCw className="w-8 h-8 animate-spin text-violet-500" /></div>;
  }

  return (
    <form onSubmit={handleSave} className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold font-heading text-foreground flex items-center gap-2">
            <Share2 className="w-6 h-6 text-violet-600" />
            Kelola Referral
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Atur program referral, reward untuk pengundang, dan syarat & ketentuan.
          </p>
        </div>
        <button
          type="submit"
          disabled={saving}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white shadow-sm transition-all active:scale-[0.97] bg-gradient-to-r from-violet-600 to-violet-500 hover:opacity-90 disabled:opacity-50"
        >
          {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          {saving ? 'Menyimpan...' : 'Simpan Pengaturan'}
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-border/40 p-6 shadow-sm">
        <h2 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
          <Settings className="w-5 h-5 text-violet-600" />
          Pengaturan Umum Referral
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="flex items-center justify-between p-4 bg-muted/20 rounded-xl border border-border/50">
            <div>
              <p className="font-semibold text-foreground">Aktifkan Program Referral</p>
              <p className="text-xs text-muted-foreground">Izinkan pengguna mengundang teman</p>
            </div>
            <ToggleButton 
              enabled={settings.referralEnabled || false} 
              onChange={(v) => setSettings({ ...settings, referralEnabled: v })} 
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-semibold text-foreground flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-emerald-500" /> Minimal Belanja Teman (Rp)
            </label>
            <input
              type="number"
              min="0"
              required
              className="w-full px-3 py-2 rounded-xl border border-border/40 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-400"
              value={settings.referralMinPurchase || 0}
              onChange={(e) => setSettings({ ...settings, referralMinPurchase: e.target.value })}
            />
            <p className="text-xs text-muted-foreground">Teman harus belanja minimal nominal ini agar pengundang mendapat hadiah.</p>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Users className="w-4 h-4 text-blue-500" /> Batas Maksimal Klaim Hadiah
            </label>
            <input
              type="number"
              min="0"
              required
              className="w-full px-3 py-2 rounded-xl border border-border/40 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-400"
              value={settings.referralMaxClaims || 0}
              onChange={(e) => setSettings({ ...settings, referralMaxClaims: e.target.value })}
            />
            <p className="text-xs text-muted-foreground">Maksimal teman yang bisa memberikan hadiah. Isi 0 untuk tanpa batas.</p>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Gift className="w-4 h-4 text-rose-500" /> Jenis Hadiah (Untuk Pengundang)
            </label>
            <select
              className="w-full px-3 py-2 rounded-xl border border-border/40 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-400"
              value={settings.referralRewardType || 'VOUCHER'}
              onChange={(e) => setSettings({ ...settings, referralRewardType: e.target.value })}
            >
              <option value="VOUCHER">Voucher</option>
              <option value="POINTS">Poin (Loyalty)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Referral Reward Settings - Dipindahkan dari Loyalty Settings */}
      <div className="bg-white rounded-2xl border border-border/40 p-6 shadow-sm">
        <h2 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
          <Gift className="w-5 h-5 text-violet-600" />
          Pengaturan Reward Referral
        </h2>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-foreground mb-2">Jenis Reward Referrer</label>
            <select 
              value={settings.referralRewardType || 'VOUCHER'} 
              onChange={(e) => setSettings({ ...settings, referralRewardType: e.target.value })}
              className="w-full px-3 py-2 text-sm bg-muted/30 border border-border/40 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500/20"
            >
              <option value="VOUCHER">Voucher</option>
              <option value="POINTS">Poin</option>
            </select>
            <p className="text-xs text-muted-foreground mt-1">Pilih jenis reward yang akan diberikan kepada pengundang</p>
          </div>

          {settings.referralRewardType === 'POINTS' ? (
            <div>
              <label className="block text-sm font-semibold text-foreground mb-2">Jumlah Poin</label>
              <input 
                type="number" 
                value={settings.referralRewardPoints || 5} 
                onChange={(e) => setSettings({ ...settings, referralRewardPoints: parseInt(e.target.value) || 0 })}
                className="w-full px-3 py-2 text-sm bg-muted/30 border border-border/40 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500/20" 
              />
              <p className="text-xs text-muted-foreground mt-1">Jumlah poin yang akan diberikan kepada pengundang</p>
            </div>
          ) : (
            <div>
              <label className="block text-sm font-semibold text-foreground mb-2">Jenis Voucher</label>
              <select 
                value={settings.referralRewardVoucher || ''} 
                onChange={(e) => setSettings({ ...settings, referralRewardVoucher: e.target.value })}
                className="w-full px-3 py-2 text-sm bg-muted/30 border border-border/40 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500/20"
              >
                <option value="">Pilih Jenis Voucher</option>
                {dynamicRewardTypes.map((r) => (
                  <option key={r.value} value={r.value}>{r.label}</option>
                ))}
              </select>
              <p className="text-xs text-muted-foreground mt-1">Pilih template voucher yang akan diberikan</p>
            </div>
          )}

          <div>
            <label className="block text-sm font-semibold text-foreground mb-2">Deskripsi Reward</label>
            <input 
              type="text" 
              value={settings.referralRewardDesc || ''} 
              onChange={(e) => setSettings({ ...settings, referralRewardDesc: e.target.value })}
              className="w-full px-3 py-2 text-sm bg-muted/30 border border-border/40 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500/20"
              placeholder="Contoh: Dapatkan voucher gratis minuman untuk setiap teman yang berbelanja"
            />
            <p className="text-xs text-muted-foreground mt-1">Deskripsi yang akan ditampilkan kepada pengguna</p>
          </div>
        </div>
      </div>

      {settings.referralRewardType === 'VOUCHER' && referralTemplate && (
        <div className="bg-violet-50/50 rounded-2xl border border-violet-200 p-6">
          <h2 className="text-lg font-bold text-violet-900 mb-4 flex items-center gap-2">
            <Ticket className="w-5 h-5" /> Pengaturan Template Voucher Hadiah
          </h2>
          <p className="text-xs text-violet-700/70 mb-4">
            Ini adalah voucher yang akan otomatis dicetak untuk pengundang ketika teman yang diundangnya berbelanja.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-violet-900">Nama Voucher</label>
              <input
                type="text"
                required
                className="w-full px-3 py-2 rounded-xl border border-violet-300 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500"
                value={referralTemplate.title || ''}
                onChange={(e) => setReferralTemplate({ ...referralTemplate, title: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-violet-900">Deskripsi (Syarat & Ketentuan)</label>
              <input
                type="text"
                required
                className="w-full px-3 py-2 rounded-xl border border-violet-300 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500"
                value={referralTemplate.description || ''}
                onChange={(e) => setReferralTemplate({ ...referralTemplate, description: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-violet-900">Tipe Potongan</label>
              <select
                className="w-full px-3 py-2 rounded-xl border border-violet-300 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500"
                value={referralTemplate.type || 'FREE_DRINK'}
                onChange={(e) => setReferralTemplate({ ...referralTemplate, type: e.target.value })}
              >
                <option value="FREE_DRINK">Gratis Minuman</option>
                <option value="DISCOUNT_RP">Diskon Nominal (Rp)</option>
                <option value="DISCOUNT_PCT">Diskon Persen (%)</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-violet-900">
                Nilai Diskon (Isi 0 jika Gratis Minuman)
              </label>
              <input
                type="number"
                min="0"
                className="w-full px-3 py-2 rounded-xl border border-violet-300 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500"
                value={referralTemplate.discountValue || 0}
                onChange={(e) => setReferralTemplate({ ...referralTemplate, discountValue: e.target.value })}
              />
            </div>
          </div>
        </div>
      )}

      {settings.referralRewardType === 'VOUCHER' && !referralTemplate && (
        <div className="bg-rose-50 rounded-2xl border border-rose-200 p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 text-rose-700">
          <div className="flex gap-3">
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="font-semibold">Template voucher referral (kode: REFERRAL_REWARD) belum dibuat.</p>
              <p className="text-xs text-rose-600/80 mt-0.5">Sistem membutuhkan template voucher ini agar dapat mencetak hadiah untuk pengundang secara otomatis.</p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleCreateTemplate}
            disabled={creatingTemplate}
            className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold rounded-lg shadow-sm transition-colors shrink-0 disabled:opacity-50"
          >
            {creatingTemplate ? 'Membuat...' : 'Buat Template Sekarang'}
          </button>
        </div>
      )}

      <div className="flex justify-end pt-4">
        <button
          type="submit"
          disabled={saving}
          className="flex items-center gap-2 px-6 py-2.5 bg-violet-600 text-white rounded-xl font-semibold hover:bg-violet-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          {saving ? 'Menyimpan...' : 'Simpan Pengaturan'}
        </button>
      </div>
    </form>
  );
}
