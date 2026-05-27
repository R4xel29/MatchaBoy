'use client';

import { useState, useEffect } from 'react';
import { Settings, Save, RefreshCw, AlertCircle, Ticket, Gift, DollarSign, Users } from 'lucide-react';
import toast from 'react-hot-toast';

export default function ReferralSettingsClient() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<any>({});
  const [referralTemplate, setReferralTemplate] = useState<any>(null);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/loyalty/settings');
      const data = await res.json();
      setSettings(data || {});
      
      // Ambil template voucher referral
      const code = data?.referralVoucherCode || 'REFERRAL_REWARD';
      const tmplRes = await fetch(`/api/admin/vouchers/templates?code=${code}`);
      const tmplData = await tmplRes.json();
      if (tmplData && tmplData.length > 0) {
        setReferralTemplate(tmplData[0]);
      }
    } catch (err) {
      toast.error('Gagal memuat pengaturan');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      
      // 1. Save loyalty settings
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

      toast.success('Pengaturan referral berhasil disimpan');
    } catch (err) {
      toast.error('Gagal menyimpan pengaturan');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="flex justify-center p-12"><RefreshCw className="w-8 h-8 animate-spin text-violet-500" /></div>;
  }

  return (
    <form onSubmit={handleSave} className="space-y-6">
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
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                className="sr-only peer"
                checked={settings.referralEnabled || false}
                onChange={(e) => setSettings({ ...settings, referralEnabled: e.target.checked })}
              />
              <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-violet-600"></div>
            </label>
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

      {settings.referralRewardType === 'POINTS' && (
        <div className="bg-amber-50/50 rounded-2xl border border-amber-200 p-6">
          <h2 className="text-lg font-bold text-amber-900 mb-4">Pengaturan Hadiah Poin</h2>
          <div className="max-w-md space-y-1.5">
            <label className="text-sm font-semibold text-amber-900">Jumlah Poin yang Diberikan</label>
            <input
              type="number"
              min="1"
              required
              className="w-full px-3 py-2 rounded-xl border border-amber-300 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
              value={settings.referralRewardPoints || 5}
              onChange={(e) => setSettings({ ...settings, referralRewardPoints: e.target.value })}
            />
          </div>
        </div>
      )}

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
        <div className="bg-rose-50 rounded-2xl border border-rose-200 p-4 flex gap-3 text-rose-700">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <p className="text-sm">Template voucher referral (kode: REFERRAL_REWARD) tidak ditemukan di database. Pastikan template telah dibuat di menu Voucher agar sistem bisa mencetak hadiah.</p>
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
