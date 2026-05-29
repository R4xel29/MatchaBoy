'use client';

import { useState, useEffect } from 'react';
import { Settings, Save, RefreshCw, AlertCircle, Ticket, Gift, DollarSign, Users, Share2, ToggleLeft, ToggleRight, HelpCircle, Image as ImageIcon, TrendingUp, Award, Calendar, Edit2, Trash2, X } from 'lucide-react';
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

// Tooltip Component
function Tooltip({ text }: { text: string }) {
  return (
    <div className="group relative inline-block">
      <HelpCircle className="w-4 h-4 text-muted-foreground/50 hover:text-muted-foreground cursor-help" />
      <div className="invisible group-hover:visible absolute z-50 w-64 p-2 mt-1 text-xs text-white bg-gray-900 rounded-lg shadow-lg -left-24">
        {text}
      </div>
    </div>
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
  const [stats, setStats] = useState({ totalVouchersIssued: 0, totalVouchersUsed: 0, totalReferrals: 0 });
  const [activeTab, setActiveTab] = useState<'basic' | 'tiers' | 'events'>('basic');
  const [tiers, setTiers] = useState<any[]>([]);
  const [events, setEvents] = useState<any[]>([]);
  const [errors, setErrors] = useState<any>({});
  
  // Tier form state
  const [showTierForm, setShowTierForm] = useState(false);
  const [editingTier, setEditingTier] = useState<any>(null);
  const [tierForm, setTierForm] = useState({
    tierNumber: 1,
    targetInvites: 5,
    rewardType: 'VOUCHER',
    rewardValue: '',
    rewardDesc: '',
    isActive: true,
  });
  
  // Event form state
  const [showEventForm, setShowEventForm] = useState(false);
  const [editingEvent, setEditingEvent] = useState<any>(null);
  const [eventForm, setEventForm] = useState({
    name: '',
    description: '',
    rewardType: 'VOUCHER',
    rewardValue: '',
    rewardDesc: '',
    refereeReward: '',
    startDate: '',
    endDate: '',
    isActive: true,
  });

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      
      // Fetch dari endpoint referral-settings yang sudah lengkap
      const res = await fetch('/api/admin/referral-settings');
      const data = await res.json();
      
      setSettings(data.loyaltySettings || {});
      setTiers(data.tiers || []);
      setEvents(data.events || []);
      setStats({
        totalReferrals: data.totalReferrals || 0,
        totalVouchersIssued: 0,
        totalVouchersUsed: 0,
      });
      
      // Ambil template voucher
      setVoucherTemplates(data.voucherTemplates || []);
      
      // Ambil template voucher referral via system voucher endpoint
      const tmplRes = await fetch('/api/admin/vouchers/system');
      const tmplData = await tmplRes.json();
      const code = data.loyaltySettings?.referralVoucherCode || 'REFERRAL_REWARD';
      
      const systemVoucher = tmplData?.systemVouchers?.find((sv: any) => sv.activeCode === code || sv.key === 'referralVoucherCode');
      if (systemVoucher && systemVoucher.isCreated && systemVoucher.template) {
        setReferralTemplate(systemVoucher.template);
      } else {
        const found = data.voucherTemplates?.find((t: any) => t.code === code);
        if (found) {
          setReferralTemplate(found);
        } else {
          setReferralTemplate(null);
        }
      }
      
      // Fetch stats voucher referral
      const vouchersRes = await fetch('/api/admin/vouchers');
      const vouchersData = await vouchersRes.json();
      const referralVouchers = vouchersData.filter((v: any) => v.type === 'REFERRAL_REWARD');
      setStats(prev => ({
        ...prev,
        totalVouchersIssued: referralVouchers.length,
        totalVouchersUsed: referralVouchers.filter((v: any) => v.isUsed).length,
      }));
      
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
    
    // Validasi input
    const newErrors: any = {};
    
    if (settings.referralMinPurchase && Number(settings.referralMinPurchase) < 0) {
      newErrors.referralMinPurchase = 'Minimal belanja tidak boleh negatif';
    }
    
    if (settings.referralMaxClaims && Number(settings.referralMaxClaims) < 0) {
      newErrors.referralMaxClaims = 'Batas maksimal tidak boleh negatif';
    }
    
    if (settings.referralRewardType === 'VOUCHER' && !settings.referralRewardVoucher) {
      newErrors.referralRewardVoucher = 'Pilih template voucher';
    }
    
    if (settings.referralRewardType === 'POINTS' && (!settings.referralRewardPoints || Number(settings.referralRewardPoints) <= 0)) {
      newErrors.referralRewardPoints = 'Jumlah poin harus lebih dari 0';
    }
    
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      showToast('Mohon perbaiki input yang tidak valid', 'error');
      return;
    }
    
    setErrors({});
    
    try {
      setSaving(true);
      
      // Save ke endpoint referral-settings
      const saveRes = await fetch('/api/admin/referral-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'settings',
          referralEnabled: settings.referralEnabled,
          referralMinPurchase: Number(settings.referralMinPurchase || 0),
          referralMaxClaims: Number(settings.referralMaxClaims || 0),
          referralRewardType: settings.referralRewardType || 'VOUCHER',
          referralRewardPoints: Number(settings.referralRewardPoints || 5),
          referralRewardVoucher: settings.referralRewardVoucher || '',
          referralRewardDesc: settings.referralRewardDesc || '',
          referralShareImage: settings.referralShareImage || '/brand/og-preview.png',
        }),
      });

      if (!saveRes.ok) {
        const errorData = await saveRes.json();
        throw new Error(errorData.error || 'Gagal menyimpan pengaturan');
      }

      // Save template if voucher type is selected
      if (settings.referralRewardType === 'VOUCHER' && referralTemplate) {
        const templateRes = await fetch(`/api/admin/vouchers/templates/${referralTemplate.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: referralTemplate.title,
            description: referralTemplate.description,
            type: referralTemplate.type,
            discountValue: Number(referralTemplate.discountValue || 0),
          }),
        });
        
        if (!templateRes.ok) {
          throw new Error('Gagal menyimpan template voucher');
        }
      }

      showToast('Pengaturan referral berhasil disimpan', 'success');
      fetchSettings(); // Refresh data
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Gagal menyimpan pengaturan';
      showToast(message, 'error');
      console.error('Save error:', err);
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

  // Handler untuk Tier
  const handleCreateTier = () => {
    setEditingTier(null);
    setTierForm({
      tierNumber: tiers.length + 1,
      targetInvites: 5,
      rewardType: 'VOUCHER',
      rewardValue: '',
      rewardDesc: '',
      isActive: true,
    });
    setShowTierForm(true);
  };

  const handleEditTier = (tier: any) => {
    setEditingTier(tier);
    setTierForm({
      tierNumber: tier.tierNumber,
      targetInvites: tier.targetInvites,
      rewardType: tier.rewardType,
      rewardValue: tier.rewardValue,
      rewardDesc: tier.rewardDesc,
      isActive: tier.isActive,
    });
    setShowTierForm(true);
  };

  const handleSaveTier = async () => {
    try {
      // Validasi
      if (!tierForm.rewardValue || !tierForm.rewardDesc) {
        showToast('Mohon lengkapi semua field', 'error');
        return;
      }

      const res = await fetch('/api/admin/referral-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'tier',
          id: editingTier?.id,
          ...tierForm,
          targetInvites: Number(tierForm.targetInvites),
        }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Gagal menyimpan tier');
      }

      showToast(editingTier ? 'Tier berhasil diupdate' : 'Tier berhasil dibuat', 'success');
      setShowTierForm(false);
      fetchSettings();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Gagal menyimpan tier';
      showToast(message, 'error');
    }
  };

  const handleDeleteTier = async (id: string) => {
    if (!confirm('Yakin ingin menghapus tier ini?')) return;

    try {
      const res = await fetch(`/api/admin/referral-settings?id=${id}&type=tier`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        throw new Error('Gagal menghapus tier');
      }

      showToast('Tier berhasil dihapus', 'success');
      fetchSettings();
    } catch (err) {
      showToast('Gagal menghapus tier', 'error');
    }
  };

  // Handler untuk Event
  const handleCreateEvent = () => {
    setEditingEvent(null);
    const today = new Date().toISOString().split('T')[0];
    setEventForm({
      name: '',
      description: '',
      rewardType: 'VOUCHER',
      rewardValue: '',
      rewardDesc: '',
      refereeReward: '',
      startDate: today,
      endDate: today,
      isActive: true,
    });
    setShowEventForm(true);
  };

  const handleEditEvent = (event: any) => {
    setEditingEvent(event);
    setEventForm({
      name: event.name,
      description: event.description,
      rewardType: event.rewardType,
      rewardValue: event.rewardValue,
      rewardDesc: event.rewardDesc,
      refereeReward: event.refereeReward || '',
      startDate: new Date(event.startDate).toISOString().split('T')[0],
      endDate: new Date(event.endDate).toISOString().split('T')[0],
      isActive: event.isActive,
    });
    setShowEventForm(true);
  };

  const handleSaveEvent = async () => {
    try {
      // Validasi
      if (!eventForm.name || !eventForm.rewardValue || !eventForm.rewardDesc) {
        showToast('Mohon lengkapi semua field wajib', 'error');
        return;
      }

      if (new Date(eventForm.endDate) < new Date(eventForm.startDate)) {
        showToast('Tanggal selesai harus setelah tanggal mulai', 'error');
        return;
      }

      const res = await fetch('/api/admin/referral-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'event',
          id: editingEvent?.id,
          ...eventForm,
        }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Gagal menyimpan event');
      }

      showToast(editingEvent ? 'Event berhasil diupdate' : 'Event berhasil dibuat', 'success');
      setShowEventForm(false);
      fetchSettings();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Gagal menyimpan event';
      showToast(message, 'error');
    }
  };

  const handleDeleteEvent = async (id: string) => {
    if (!confirm('Yakin ingin menghapus event ini?')) return;

    try {
      const res = await fetch(`/api/admin/referral-settings?id=${id}&type=event`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        throw new Error('Gagal menghapus event');
      }

      showToast('Event berhasil dihapus', 'success');
      fetchSettings();
    } catch (err) {
      showToast('Gagal menghapus event', 'error');
    }
  };

  if (loading) {
    return <div className="flex justify-center p-12"><RefreshCw className="w-8 h-8 animate-spin text-violet-500" /></div>;
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-gradient-to-br from-blue-50 to-blue-100/50 rounded-2xl border border-blue-200 p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-blue-600 text-white">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <p className="text-2xl font-bold text-blue-900">{stats.totalReferrals}</p>
              <p className="text-[11px] text-blue-700 font-medium">Total Referral</p>
            </div>
          </div>
        </div>
        
        <div className="bg-gradient-to-br from-violet-50 to-violet-100/50 rounded-2xl border border-violet-200 p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-violet-600 text-white">
              <Ticket className="w-5 h-5" />
            </div>
            <div>
              <p className="text-2xl font-bold text-violet-900">{stats.totalVouchersIssued}</p>
              <p className="text-[11px] text-violet-700 font-medium">Voucher Diterbitkan</p>
            </div>
          </div>
        </div>
        
        <div className="bg-gradient-to-br from-emerald-50 to-emerald-100/50 rounded-2xl border border-emerald-200 p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-emerald-600 text-white">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <p className="text-2xl font-bold text-emerald-900">{stats.totalVouchersUsed}</p>
              <p className="text-[11px] text-emerald-700 font-medium">Voucher Digunakan</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex bg-muted/40 p-1.5 rounded-2xl border border-border/20 w-fit">
        <button
          onClick={() => setActiveTab('basic')}
          className={`flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-xl transition-all ${
            activeTab === 'basic'
              ? 'bg-violet-600 text-white shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <Settings className="w-4 h-4" />
          Pengaturan Dasar
        </button>
        <button
          onClick={() => setActiveTab('tiers')}
          className={`flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-xl transition-all ${
            activeTab === 'tiers'
              ? 'bg-violet-600 text-white shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <Award className="w-4 h-4" />
          Tier Bertingkat
        </button>
        <button
          onClick={() => setActiveTab('events')}
          className={`flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-xl transition-all ${
            activeTab === 'events'
              ? 'bg-violet-600 text-white shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <Calendar className="w-4 h-4" />
          Event Promo
        </button>
      </div>

      {activeTab === 'basic' && (
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
              <p className="font-semibold text-foreground flex items-center gap-2">
                Aktifkan Program Referral
                <Tooltip text="Jika diaktifkan, pengguna dapat mengundang teman dan mendapatkan reward ketika teman tersebut berbelanja." />
              </p>
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
              <Tooltip text="Teman yang diundang harus berbelanja minimal nominal ini agar pengundang mendapat hadiah. Contoh: 30000 = Rp 30.000" />
            </label>
            <input
              type="number"
              min="0"
              required
              className={`w-full px-3 py-2 rounded-xl border ${errors.referralMinPurchase ? 'border-red-500' : 'border-border/40'} focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-400`}
              value={settings.referralMinPurchase || 0}
              onChange={(e) => {
                setSettings({ ...settings, referralMinPurchase: e.target.value });
                setErrors({ ...errors, referralMinPurchase: null });
              }}
            />
            {errors.referralMinPurchase && (
              <p className="text-xs text-red-500 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" /> {errors.referralMinPurchase}
              </p>
            )}
            <p className="text-xs text-muted-foreground">Teman harus belanja minimal nominal ini agar pengundang mendapat hadiah.</p>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Users className="w-4 h-4 text-blue-500" /> Batas Maksimal Klaim Hadiah
              <Tooltip text="Maksimal berapa teman yang bisa memberikan hadiah ke pengundang. Isi 0 untuk tanpa batas. Contoh: 5 = maksimal dapat hadiah dari 5 teman." />
            </label>
            <input
              type="number"
              min="0"
              required
              className={`w-full px-3 py-2 rounded-xl border ${errors.referralMaxClaims ? 'border-red-500' : 'border-border/40'} focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-400`}
              value={settings.referralMaxClaims || 0}
              onChange={(e) => {
                setSettings({ ...settings, referralMaxClaims: e.target.value });
                setErrors({ ...errors, referralMaxClaims: null });
              }}
            />
            {errors.referralMaxClaims && (
              <p className="text-xs text-red-500 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" /> {errors.referralMaxClaims}
              </p>
            )}
            <p className="text-xs text-muted-foreground">Maksimal teman yang bisa memberikan hadiah. Isi 0 untuk tanpa batas.</p>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Gift className="w-4 h-4 text-rose-500" /> Jenis Hadiah (Untuk Pengundang)
              <Tooltip text="VOUCHER = Pengundang dapat voucher yang bisa dipakai untuk belanja. POINTS = Pengundang dapat poin loyalty yang bisa dikumpulkan." />
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
            <label className="block text-sm font-semibold text-foreground mb-2 flex items-center gap-2">
              Jenis Reward Referrer
              <Tooltip text="Pilih apakah pengundang akan mendapat voucher atau poin loyalty sebagai hadiah." />
            </label>
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
              <label className="block text-sm font-semibold text-foreground mb-2 flex items-center gap-2">
                Jumlah Poin
                <Tooltip text="Berapa poin yang akan diberikan ke pengundang setiap kali temannya berbelanja." />
              </label>
              <input 
                type="number"
                min="1"
                value={settings.referralRewardPoints || 5} 
                onChange={(e) => {
                  setSettings({ ...settings, referralRewardPoints: parseInt(e.target.value) || 0 });
                  setErrors({ ...errors, referralRewardPoints: null });
                }}
                className={`w-full px-3 py-2 text-sm bg-muted/30 border ${errors.referralRewardPoints ? 'border-red-500' : 'border-border/40'} rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500/20`}
              />
              {errors.referralRewardPoints && (
                <p className="text-xs text-red-500 flex items-center gap-1 mt-1">
                  <AlertCircle className="w-3 h-3" /> {errors.referralRewardPoints}
                </p>
              )}
              <p className="text-xs text-muted-foreground mt-1">Jumlah poin yang akan diberikan kepada pengundang</p>
            </div>
          ) : (
            <div>
              <label className="block text-sm font-semibold text-foreground mb-2 flex items-center gap-2">
                Template Voucher
                <Tooltip text="Pilih template voucher yang sudah dibuat. Voucher akan otomatis diterbitkan untuk pengundang." />
              </label>
              <select 
                value={settings.referralRewardVoucher || ''} 
                onChange={(e) => {
                  setSettings({ ...settings, referralRewardVoucher: e.target.value });
                  setErrors({ ...errors, referralRewardVoucher: null });
                }}
                className={`w-full px-3 py-2 text-sm bg-muted/30 border ${errors.referralRewardVoucher ? 'border-red-500' : 'border-border/40'} rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500/20`}
              >
                <option value="">Pilih Template Voucher</option>
                <optgroup label="Template Voucher">
                  {voucherTemplates.map((t) => (
                    <option key={t.id} value={t.code}>
                      {t.title} ({t.code})
                    </option>
                  ))}
                </optgroup>
              </select>
              {errors.referralRewardVoucher && (
                <p className="text-xs text-red-500 flex items-center gap-1 mt-1">
                  <AlertCircle className="w-3 h-3" /> {errors.referralRewardVoucher}
                </p>
              )}
              <p className="text-xs text-muted-foreground mt-1">Pilih template voucher yang akan diberikan (hanya menampilkan template yang sudah dibuat)</p>
            </div>
          )}

          <div>
            <label className="block text-sm font-semibold text-foreground mb-2 flex items-center gap-2">
              Deskripsi Reward
              <Tooltip text="Deskripsi yang akan ditampilkan ke pengguna tentang reward yang mereka dapatkan." />
            </label>
            <input 
              type="text" 
              value={settings.referralRewardDesc || ''} 
              onChange={(e) => setSettings({ ...settings, referralRewardDesc: e.target.value })}
              className="w-full px-3 py-2 text-sm bg-muted/30 border border-border/40 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500/20"
              placeholder="Contoh: Dapatkan voucher gratis minuman untuk setiap teman yang berbelanja"
            />
            <p className="text-xs text-muted-foreground mt-1">Deskripsi yang akan ditampilkan kepada pengguna</p>
          </div>
          
          <div>
            <label className="block text-sm font-semibold text-foreground mb-2 flex items-center gap-2">
              <ImageIcon className="w-4 h-4 text-violet-500" /> Gambar Share Link Referral
              <Tooltip text="URL gambar yang akan muncul sebagai preview ketika link referral dibagikan di media sosial (Open Graph image)." />
            </label>
            <input 
              type="text" 
              value={settings.referralShareImage || '/brand/og-preview.png'} 
              onChange={(e) => setSettings({ ...settings, referralShareImage: e.target.value })}
              className="w-full px-3 py-2 text-sm bg-muted/30 border border-border/40 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500/20"
              placeholder="/brand/og-preview.png"
            />
            <p className="text-xs text-muted-foreground mt-1">URL gambar preview saat link referral dibagikan (Open Graph)</p>
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
      )}

      {activeTab === 'tiers' && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-border/40 p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
                  <Award className="w-5 h-5 text-violet-600" />
                  Tier Bertingkat
                </h2>
                <p className="text-xs text-muted-foreground mt-1">
                  Buat reward bertingkat berdasarkan jumlah teman yang berhasil diajak
                </p>
              </div>
              <button
                type="button"
                className="px-4 py-2 bg-violet-600 text-white text-sm font-semibold rounded-xl hover:bg-violet-700 transition-all"
                onClick={handleCreateTier}
              >
                + Tambah Tier
              </button>
            </div>
            
            {tiers.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Award className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p className="text-sm">Belum ada tier yang dibuat</p>
                <p className="text-xs mt-1">Buat tier untuk memberikan reward bertingkat kepada pengundang</p>
              </div>
            ) : (
              <div className="space-y-3">
                {tiers.map((tier) => (
                  <div key={tier.id} className="p-4 border border-border/40 rounded-xl hover:bg-muted/10 transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3">
                          <div className="flex items-center justify-center w-10 h-10 rounded-full bg-violet-100 text-violet-700 font-bold">
                            {tier.tierNumber}
                          </div>
                          <div>
                            <p className="font-semibold text-foreground">Tier {tier.tierNumber}</p>
                            <p className="text-xs text-muted-foreground">Target: {tier.targetInvites} undangan berhasil</p>
                            <p className="text-xs text-violet-600 mt-1 font-medium">{tier.rewardDesc}</p>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-1 text-xs font-semibold rounded-lg ${tier.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>
                          {tier.isActive ? 'Aktif' : 'Nonaktif'}
                        </span>
                        <button
                          onClick={() => handleEditTier(tier)}
                          className="px-3 py-1.5 text-xs font-semibold text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDeleteTier(tier.id)}
                          className="px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          Hapus
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Tier Form Modal */}
          {showTierForm && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-2xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                <h3 className="text-xl font-bold text-foreground mb-4">
                  {editingTier ? 'Edit Tier' : 'Tambah Tier Baru'}
                </h3>
                
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-foreground mb-2">
                        Nomor Tier <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={tierForm.tierNumber}
                        onChange={(e) => setTierForm({ ...tierForm, tierNumber: Number(e.target.value) })}
                        className="w-full px-3 py-2 border border-border/40 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500/20"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-semibold text-foreground mb-2">
                        Target Undangan <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={tierForm.targetInvites}
                        onChange={(e) => setTierForm({ ...tierForm, targetInvites: Number(e.target.value) })}
                        className="w-full px-3 py-2 border border-border/40 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500/20"
                      />
                      <p className="text-xs text-muted-foreground mt-1">Jumlah teman yang harus berhasil diajak</p>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-foreground mb-2">
                      Jenis Reward <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={tierForm.rewardType}
                      onChange={(e) => setTierForm({ ...tierForm, rewardType: e.target.value })}
                      className="w-full px-3 py-2 border border-border/40 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500/20"
                    >
                      <option value="VOUCHER">Voucher</option>
                      <option value="POINTS">Poin</option>
                      <option value="DISCOUNT">Diskon</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-foreground mb-2">
                      Nilai Reward <span className="text-red-500">*</span>
                    </label>
                    {tierForm.rewardType === 'VOUCHER' ? (
                      <select
                        value={tierForm.rewardValue}
                        onChange={(e) => setTierForm({ ...tierForm, rewardValue: e.target.value })}
                        className="w-full px-3 py-2 border border-border/40 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500/20"
                      >
                        <option value="">Pilih Template Voucher</option>
                        {voucherTemplates.map((t) => (
                          <option key={t.id} value={t.code}>
                            {t.title} ({t.code})
                          </option>
                        ))}
                      </select>
                    ) : (
                      <input
                        type="text"
                        value={tierForm.rewardValue}
                        onChange={(e) => setTierForm({ ...tierForm, rewardValue: e.target.value })}
                        placeholder={tierForm.rewardType === 'POINTS' ? 'Contoh: 10' : 'Contoh: 20000'}
                        className="w-full px-3 py-2 border border-border/40 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500/20"
                      />
                    )}
                    <p className="text-xs text-muted-foreground mt-1">
                      {tierForm.rewardType === 'POINTS' && 'Jumlah poin yang diberikan'}
                      {tierForm.rewardType === 'DISCOUNT' && 'Nilai diskon dalam Rupiah'}
                      {tierForm.rewardType === 'VOUCHER' && 'Pilih template voucher'}
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-foreground mb-2">
                      Deskripsi Reward <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      value={tierForm.rewardDesc}
                      onChange={(e) => setTierForm({ ...tierForm, rewardDesc: e.target.value })}
                      placeholder="Contoh: Dapatkan voucher gratis minuman untuk 5 teman pertama"
                      rows={3}
                      className="w-full px-3 py-2 border border-border/40 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500/20"
                    />
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="tierActive"
                      checked={tierForm.isActive}
                      onChange={(e) => setTierForm({ ...tierForm, isActive: e.target.checked })}
                      className="w-4 h-4 text-violet-600 rounded focus:ring-2 focus:ring-violet-500/20"
                    />
                    <label htmlFor="tierActive" className="text-sm font-medium text-foreground">
                      Aktifkan tier ini
                    </label>
                  </div>
                </div>

                <div className="flex gap-3 mt-6">
                  <button
                    onClick={() => setShowTierForm(false)}
                    className="flex-1 px-4 py-2.5 border border-border/40 text-foreground rounded-xl font-semibold hover:bg-muted/20 transition-all"
                  >
                    Batal
                  </button>
                  <button
                    onClick={handleSaveTier}
                    className="flex-1 px-4 py-2.5 bg-violet-600 text-white rounded-xl font-semibold hover:bg-violet-700 transition-all"
                  >
                    {editingTier ? 'Update Tier' : 'Simpan Tier'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'events' && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-border/40 p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-violet-600" />
                  Event Promo Referral
                </h2>
                <p className="text-xs text-muted-foreground mt-1">
                  Buat event promo referral dengan periode waktu tertentu
                </p>
              </div>
              <button
                type="button"
                className="px-4 py-2 bg-violet-600 text-white text-sm font-semibold rounded-xl hover:bg-violet-700 transition-all"
                onClick={handleCreateEvent}
              >
                + Tambah Event
              </button>
            </div>
            
            {events.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Calendar className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p className="text-sm">Belum ada event promo</p>
                <p className="text-xs mt-1">Buat event untuk memberikan bonus spesial di periode tertentu</p>
              </div>
            ) : (
              <div className="space-y-3">
                {events.map((event) => (
                  <div key={event.id} className="p-4 border border-border/40 rounded-xl hover:bg-muted/10 transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3">
                          <div className="flex items-center justify-center w-10 h-10 rounded-full bg-violet-100 text-violet-700">
                            <Calendar className="w-5 h-5" />
                          </div>
                          <div>
                            <p className="font-semibold text-foreground">{event.name}</p>
                            <p className="text-xs text-muted-foreground">{event.description}</p>
                            <p className="text-xs text-violet-600 mt-1 font-medium">
                              📅 {new Date(event.startDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })} - {new Date(event.endDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                            </p>
                            <p className="text-xs text-emerald-600 mt-0.5">{event.rewardDesc}</p>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-1 text-xs font-semibold rounded-lg ${event.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>
                          {event.isActive ? 'Aktif' : 'Nonaktif'}
                        </span>
                        <button
                          onClick={() => handleEditEvent(event)}
                          className="px-3 py-1.5 text-xs font-semibold text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDeleteEvent(event.id)}
                          className="px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          Hapus
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Event Form Modal */}
          {showEventForm && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-2xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                <h3 className="text-xl font-bold text-foreground mb-4">
                  {editingEvent ? 'Edit Event' : 'Tambah Event Baru'}
                </h3>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-foreground mb-2">
                      Nama Event <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={eventForm.name}
                      onChange={(e) => setEventForm({ ...eventForm, name: e.target.value })}
                      placeholder="Contoh: Promo Lebaran 2026"
                      className="w-full px-3 py-2 border border-border/40 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500/20"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-foreground mb-2">
                      Deskripsi Event
                    </label>
                    <textarea
                      value={eventForm.description}
                      onChange={(e) => setEventForm({ ...eventForm, description: e.target.value })}
                      placeholder="Contoh: Ajak teman berbelanja di bulan Ramadan dan dapatkan bonus spesial"
                      rows={2}
                      className="w-full px-3 py-2 border border-border/40 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500/20"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-foreground mb-2">
                        Tanggal Mulai <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="date"
                        value={eventForm.startDate}
                        onChange={(e) => setEventForm({ ...eventForm, startDate: e.target.value })}
                        className="w-full px-3 py-2 border border-border/40 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500/20"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-semibold text-foreground mb-2">
                        Tanggal Selesai <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="date"
                        value={eventForm.endDate}
                        onChange={(e) => setEventForm({ ...eventForm, endDate: e.target.value })}
                        className="w-full px-3 py-2 border border-border/40 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500/20"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-foreground mb-2">
                      Jenis Reward (Untuk Pengundang) <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={eventForm.rewardType}
                      onChange={(e) => setEventForm({ ...eventForm, rewardType: e.target.value })}
                      className="w-full px-3 py-2 border border-border/40 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500/20"
                    >
                      <option value="VOUCHER">Voucher</option>
                      <option value="POINTS">Poin</option>
                      <option value="DISCOUNT">Diskon</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-foreground mb-2">
                      Nilai Reward <span className="text-red-500">*</span>
                    </label>
                    {eventForm.rewardType === 'VOUCHER' ? (
                      <select
                        value={eventForm.rewardValue}
                        onChange={(e) => setEventForm({ ...eventForm, rewardValue: e.target.value })}
                        className="w-full px-3 py-2 border border-border/40 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500/20"
                      >
                        <option value="">Pilih Template Voucher</option>
                        {voucherTemplates.map((t) => (
                          <option key={t.id} value={t.code}>
                            {t.title} ({t.code})
                          </option>
                        ))}
                      </select>
                    ) : (
                      <input
                        type="text"
                        value={eventForm.rewardValue}
                        onChange={(e) => setEventForm({ ...eventForm, rewardValue: e.target.value })}
                        placeholder={eventForm.rewardType === 'POINTS' ? 'Contoh: 10' : 'Contoh: 20000'}
                        className="w-full px-3 py-2 border border-border/40 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500/20"
                      />
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-foreground mb-2">
                      Deskripsi Reward <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      value={eventForm.rewardDesc}
                      onChange={(e) => setEventForm({ ...eventForm, rewardDesc: e.target.value })}
                      placeholder="Contoh: Dapatkan voucher gratis minuman untuk setiap teman yang berbelanja"
                      rows={2}
                      className="w-full px-3 py-2 border border-border/40 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500/20"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-foreground mb-2">
                      Reward untuk Teman yang Diajak (Opsional)
                    </label>
                    <input
                      type="text"
                      value={eventForm.refereeReward}
                      onChange={(e) => setEventForm({ ...eventForm, refereeReward: e.target.value })}
                      placeholder="Contoh: Diskon 10% untuk pembelian pertama"
                      className="w-full px-3 py-2 border border-border/40 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500/20"
                    />
                    <p className="text-xs text-muted-foreground mt-1">Bonus tambahan untuk teman yang diajak (opsional)</p>
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="eventActive"
                      checked={eventForm.isActive}
                      onChange={(e) => setEventForm({ ...eventForm, isActive: e.target.checked })}
                      className="w-4 h-4 text-violet-600 rounded focus:ring-2 focus:ring-violet-500/20"
                    />
                    <label htmlFor="eventActive" className="text-sm font-medium text-foreground">
                      Aktifkan event ini
                    </label>
                  </div>
                </div>

                <div className="flex gap-3 mt-6">
                  <button
                    onClick={() => setShowEventForm(false)}
                    className="flex-1 px-4 py-2.5 border border-border/40 text-foreground rounded-xl font-semibold hover:bg-muted/20 transition-all"
                  >
                    Batal
                  </button>
                  <button
                    onClick={handleSaveEvent}
                    className="flex-1 px-4 py-2.5 bg-violet-600 text-white rounded-xl font-semibold hover:bg-violet-700 transition-all"
                  >
                    {editingEvent ? 'Update Event' : 'Simpan Event'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
