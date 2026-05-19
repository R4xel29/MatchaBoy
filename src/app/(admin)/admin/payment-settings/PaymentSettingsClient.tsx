'use client';

import { useState, useEffect } from 'react';
import {
  CreditCard, QrCode, Banknote, MessageCircle,
  Save, Loader2, CheckCircle2, Plus, Trash2, Upload,
  ToggleLeft, ToggleRight, Building2, Image as ImageIcon,
} from 'lucide-react';

interface PaymentConfig {
  id: string;
  codEnabled: boolean;
  codWhatsApp: string;
  qrisEnabled: boolean;
  qrisImage: string | null;
  qrisLogo: string | null;
  qrisLabel: string;
  transferEnabled: boolean;
  dokuEnabled: boolean;
  dokuClientId: string;
  dokuSharedKey: string;
  dokuSandbox: boolean;
}

interface BankAccount {
  id: string;
  bankName: string;
  bankLogo: string | null;
  accountNumber: string;
  accountName: string;
  isActive: boolean;
  order: number;
}

export default function PaymentSettingsClient() {
  const [settings, setSettings] = useState<PaymentConfig | null>(null);
  const [banks, setBanks] = useState<BankAccount[]>([]);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);
  
  // New bank form
  const [showNewBank, setShowNewBank] = useState(false);
  const [newBank, setNewBank] = useState({ bankName: '', accountNumber: '', accountName: '', bankLogo: '' });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const res = await fetch('/api/admin/payment-settings');
      const data = await res.json();
      setSettings(data.settings);
      setBanks(data.banks || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!settings) return;
    setSaving(true);
    try {
      await fetch('/api/admin/payment-settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch { alert('Gagal menyimpan'); }
    finally { setSaving(false); }
  };

  const addBank = async () => {
    try {
      const res = await fetch('/api/admin/bank-accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newBank),
      });
      const bank = await res.json();
      setBanks([...banks, bank]);
      setNewBank({ bankName: '', accountNumber: '', accountName: '', bankLogo: '' });
      setShowNewBank(false);
    } catch { alert('Gagal menambah bank'); }
  };

  const deleteBank = async (id: string) => {
    if (!confirm('Hapus rekening ini?')) return;
    try {
      await fetch(`/api/admin/bank-accounts?id=${id}`, { method: 'DELETE' });
      setBanks(banks.filter(b => b.id !== id));
    } catch { alert('Gagal menghapus'); }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, field: 'qrisImage' | 'qrisLogo') => {
    const file = e.target.files?.[0];
    if (!file || !settings) return;
    
    const formData = new FormData();
    formData.append('file', file);
    formData.append('type', field);

    try {
      const res = await fetch('/api/admin/upload', { method: 'POST', body: formData });
      if (res.ok) {
        const data = await res.json();
        setSettings({ ...settings, [field]: data.url });
      }
    } catch { 
      // Fallback: use data URL
      const reader = new FileReader();
      reader.onload = (ev) => {
        setSettings({ ...settings, [field]: ev.target?.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  const update = (key: keyof PaymentConfig, value: any) => {
    if (settings) setSettings({ ...settings, [key]: value });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold font-heading text-foreground flex items-center gap-2">
            <CreditCard className="w-6 h-6 text-blue-600" />
            Pengaturan Pembayaran
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Atur metode pembayaran yang tersedia untuk pelanggan
          </p>
        </div>
        <button onClick={handleSave} disabled={saving}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white shadow-sm transition-all ${
            saved ? 'bg-emerald-500' : 'bg-blue-600 hover:bg-blue-700'
          } disabled:opacity-50`}
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : saved ? <CheckCircle2 className="w-4 h-4" /> : <Save className="w-4 h-4" />}
          {saving ? 'Menyimpan...' : saved ? 'Tersimpan!' : 'Simpan'}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* COD Settings */}
        <div className="bg-white rounded-2xl border border-border/40 p-5 shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-green-50 text-green-600">
                <Banknote className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-foreground">COD (Bayar di Tempat)</h3>
                <p className="text-[10px] text-muted-foreground">Verifikasi via WhatsApp</p>
              </div>
            </div>
            <button onClick={() => update('codEnabled', !settings?.codEnabled)}>
              {settings?.codEnabled
                ? <ToggleRight className="w-7 h-7 text-emerald-500" />
                : <ToggleLeft className="w-7 h-7 text-muted-foreground/40" />
              }
            </button>
          </div>
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-1">
              Nomor WhatsApp Admin
            </label>
            <div className="relative">
              <MessageCircle className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/50" />
              <input
                type="tel"
                value={settings?.codWhatsApp || ''}
                onChange={(e) => update('codWhatsApp', e.target.value)}
                placeholder="628123456789"
                className="w-full pl-10 pr-4 py-2.5 text-sm bg-gray-50 border border-border/40 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500/20"
              />
            </div>
            <p className="text-[10px] text-muted-foreground mt-1.5">
              💡 Format: 628xxx (tanpa + atau spasi)
            </p>
          </div>
        </div>

        {/* QRIS Settings */}
        <div className="bg-white rounded-2xl border border-border/40 p-5 shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-purple-50 text-purple-600">
                <QrCode className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-foreground">QRIS</h3>
                <p className="text-[10px] text-muted-foreground">Scan QR untuk pembayaran</p>
              </div>
            </div>
            <button onClick={() => update('qrisEnabled', !settings?.qrisEnabled)}>
              {settings?.qrisEnabled
                ? <ToggleRight className="w-7 h-7 text-emerald-500" />
                : <ToggleLeft className="w-7 h-7 text-muted-foreground/40" />
              }
            </button>
          </div>
          <div className="space-y-3">
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-1">Label</label>
              <input type="text" value={settings?.qrisLabel || ''} onChange={(e) => update('qrisLabel', e.target.value)}
                className="w-full px-3 py-2 text-sm bg-gray-50 border border-border/40 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/20" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-1">Gambar QRIS</label>
                {settings?.qrisImage ? (
                  <div className="relative group">
                    <img src={settings.qrisImage} alt="QRIS" className="w-full h-24 object-contain rounded-xl border border-border/40 bg-white" />
                    <button onClick={() => update('qrisImage', null)}
                      className="absolute top-1 right-1 w-6 h-6 rounded-full bg-red-500 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                ) : (
                  <label className="flex flex-col items-center justify-center h-24 border-2 border-dashed border-gray-300 rounded-xl cursor-pointer hover:border-purple-400 transition-colors">
                    <Upload className="w-5 h-5 text-gray-400 mb-1" />
                    <span className="text-[10px] text-gray-400">Upload QRIS</span>
                    <input type="file" accept="image/*" className="hidden" onChange={(e) => handleImageUpload(e, 'qrisImage')} />
                  </label>
                )}
              </div>
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-1">Logo QRIS</label>
                {settings?.qrisLogo ? (
                  <div className="relative group">
                    <img src={settings.qrisLogo} alt="Logo" className="w-full h-24 object-contain rounded-xl border border-border/40 bg-white" />
                    <button onClick={() => update('qrisLogo', null)}
                      className="absolute top-1 right-1 w-6 h-6 rounded-full bg-red-500 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                ) : (
                  <label className="flex flex-col items-center justify-center h-24 border-2 border-dashed border-gray-300 rounded-xl cursor-pointer hover:border-purple-400 transition-colors">
                    <ImageIcon className="w-5 h-5 text-gray-400 mb-1" />
                    <span className="text-[10px] text-gray-400">Upload Logo</span>
                    <input type="file" accept="image/*" className="hidden" onChange={(e) => handleImageUpload(e, 'qrisLogo')} />
                  </label>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* DOKU Settings */}
        <div className="bg-white rounded-2xl border border-border/40 p-5 shadow-[0_1px_2px_rgba(0,0,0,0.03)] lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-indigo-50 text-indigo-600">
                <CreditCard className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-foreground">DOKU Payment Gateway</h3>
                <p className="text-[10px] text-muted-foreground">E-Wallet, QRIS, Virtual Account, & Kartu Kredit otomatis</p>
              </div>
            </div>
            <button onClick={() => update('dokuEnabled', !settings?.dokuEnabled)}>
              {settings?.dokuEnabled
                ? <ToggleRight className="w-7 h-7 text-emerald-500" />
                : <ToggleLeft className="w-7 h-7 text-muted-foreground/40" />
              }
            </button>
          </div>
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-1">
                  Client ID
                </label>
                <input
                  type="text"
                  value={settings?.dokuClientId || ''}
                  onChange={(e) => update('dokuClientId', e.target.value)}
                  placeholder="MALL-XXXXXXXX"
                  className="w-full px-3 py-2.5 text-sm bg-gray-50 border border-border/40 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-1">
                  Shared Key (Secret Key)
                </label>
                <input
                  type="password"
                  value={settings?.dokuSharedKey || ''}
                  onChange={(e) => update('dokuSharedKey', e.target.value)}
                  placeholder="SK-XXXXXXXXXXXXXXXXXXXX"
                  className="w-full px-3 py-2.5 text-sm bg-gray-50 border border-border/40 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-xl bg-indigo-50/50 border border-indigo-100">
              <input
                type="checkbox"
                id="dokuSandbox"
                checked={settings?.dokuSandbox ?? true}
                onChange={(e) => update('dokuSandbox', e.target.checked)}
                className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
              />
              <label htmlFor="dokuSandbox" className="text-xs font-semibold text-indigo-900 cursor-pointer select-none">
                Gunakan Mode Sandbox (Uji Coba / Development)
              </label>
            </div>
            <div className="text-[10px] text-muted-foreground leading-relaxed">
              💡 <b>Informasi Integrasi Webhook:</b> Konfigurasikan URL Pemberitahuan (Webhook / Notify URL) Anda di DOKU Dashboard ke:<br />
              <code className="bg-gray-100 px-1 py-0.5 rounded font-mono text-[9px] select-all">
                {typeof window !== 'undefined' ? `${window.location.origin}/api/payment/doku-webhook` : 'https://[domain-anda]/api/payment/doku-webhook'}
              </code>
            </div>
          </div>
        </div>
      </div>

      {/* Bank Transfer Settings */}
      <div className="bg-white rounded-2xl border border-border/40 p-5 shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-blue-50 text-blue-600">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-foreground">Transfer Bank</h3>
              <p className="text-[10px] text-muted-foreground">Kelola rekening bank untuk transfer</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setShowNewBank(true)}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700 transition-colors">
              <Plus className="w-3.5 h-3.5" /> Tambah Bank
            </button>
            <button onClick={() => update('transferEnabled', !settings?.transferEnabled)}>
              {settings?.transferEnabled
                ? <ToggleRight className="w-7 h-7 text-emerald-500" />
                : <ToggleLeft className="w-7 h-7 text-muted-foreground/40" />
              }
            </button>
          </div>
        </div>

        {/* Bank List */}
        <div className="space-y-2">
          {banks.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground/50">
              <Building2 className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <p className="text-xs">Belum ada rekening bank</p>
            </div>
          ) : (
            banks.map((bank) => (
              <div key={bank.id} className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 border border-border/30">
                <div className="w-10 h-10 rounded-lg bg-white border border-border/40 flex items-center justify-center overflow-hidden">
                  {bank.bankLogo ? (
                    <img src={bank.bankLogo} alt={bank.bankName} className="w-8 h-8 object-contain" />
                  ) : (
                    <Building2 className="w-5 h-5 text-muted-foreground" />
                  )}
                </div>
                <div className="flex-1">
                  <p className="text-[13px] font-bold text-foreground">{bank.bankName}</p>
                  <p className="text-[11px] text-muted-foreground">{bank.accountNumber} · {bank.accountName}</p>
                </div>
                <button onClick={() => deleteBank(bank.id)}
                  className="p-2 rounded-lg text-red-400 hover:text-red-600 hover:bg-red-50 transition-colors">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))
          )}
        </div>

        {/* New Bank Form */}
        {showNewBank && (
          <div className="mt-4 p-4 rounded-xl bg-blue-50/50 border border-blue-200 space-y-3">
            <h4 className="text-xs font-bold text-blue-800 uppercase tracking-wider">Tambah Rekening Baru</h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <input type="text" placeholder="Nama Bank" value={newBank.bankName} onChange={(e) => setNewBank({ ...newBank, bankName: e.target.value })}
                className="px-3 py-2 text-sm bg-white border border-blue-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
              <input type="text" placeholder="No. Rekening" value={newBank.accountNumber} onChange={(e) => setNewBank({ ...newBank, accountNumber: e.target.value })}
                className="px-3 py-2 text-sm bg-white border border-blue-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
              <input type="text" placeholder="Atas Nama" value={newBank.accountName} onChange={(e) => setNewBank({ ...newBank, accountName: e.target.value })}
                className="px-3 py-2 text-sm bg-white border border-blue-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
            </div>
            <div className="flex gap-2">
              <button onClick={addBank} disabled={!newBank.bankName || !newBank.accountNumber || !newBank.accountName}
                className="px-4 py-2 rounded-xl bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700 disabled:opacity-50 transition-colors">
                Simpan
              </button>
              <button onClick={() => setShowNewBank(false)}
                className="px-4 py-2 rounded-xl bg-white border border-border text-xs font-medium text-muted-foreground hover:bg-gray-50 transition-colors">
                Batal
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
