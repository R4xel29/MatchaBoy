'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { 
  UserPlus, 
  X, 
  Loader2, 
  User, 
  Phone, 
  Mail, 
  AtSign, 
  Lock, 
  KeyRound, 
  Wallet, 
  Trophy, 
  ShieldCheck,
  CheckCircle2
} from 'lucide-react';
import { createCustomerAction } from '@/app/actions/customer-admin';
import { useToast } from '@/components/ui/Toast';

export default function CreateCustomerModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { showToast } = useToast();

  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    slug: '',
    password: '',
    pin: '',
    arusLevel: 'Tunas Arus',
    initialPoints: 0,
    initialWallet: 0,
  });

  const resetForm = () => {
    setFormData({
      name: '',
      phone: '',
      email: '',
      slug: '',
      password: '',
      pin: '',
      arusLevel: 'Tunas Arus',
      initialPoints: 0,
      initialWallet: 0,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await createCustomerAction(formData);

      if (!res.success) {
        showToast(res.error || 'Gagal mendaftarkan pelanggan', 'error');
      } else {
        showToast(res.message || 'Pelanggan berhasil didaftarkan!', 'success');
        resetForm();
        setIsOpen(false);
        router.refresh();
      }
    } catch (err: any) {
      showToast(err.message || 'Terjadi kesalahan sistem', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white text-xs sm:text-sm font-bold shadow-md hover:shadow-lg transition-all cursor-pointer"
      >
        <UserPlus className="w-4 h-4" />
        <span>Tambah Pelanggan Baru</span>
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div 
            className="bg-white rounded-3xl max-w-lg w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-border/40 relative"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="p-5 sm:p-6 border-b border-border/40 flex items-center justify-between sticky top-0 bg-white z-10 rounded-t-3xl">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-orange-50 border border-orange-100 flex items-center justify-center text-orange-600">
                  <UserPlus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-foreground">Tambah Pelanggan Baru</h3>
                  <p className="text-xs text-muted-foreground">Pendaftaran akun member Arum Seduh</p>
                </div>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="w-8 h-8 rounded-full bg-muted/40 hover:bg-muted text-muted-foreground flex items-center justify-center transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-4">
              {/* Nama Lengkap */}
              <div>
                <label className="block text-xs font-bold text-foreground uppercase tracking-wider mb-1.5">
                  Nama Pelanggan <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-muted-foreground absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    placeholder="Contoh: Budi Santoso"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full pl-10 pr-4 py-2.5 text-sm bg-muted/20 border border-border/60 rounded-xl focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-200 transition-all text-foreground"
                  />
                </div>
              </div>

              {/* Kontak: WhatsApp & Email */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-foreground uppercase tracking-wider mb-1.5">
                    Nomor WhatsApp
                  </label>
                  <div className="relative">
                    <Phone className="w-4 h-4 text-muted-foreground absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="tel"
                      placeholder="08123456789"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      className="w-full pl-10 pr-4 py-2.5 text-sm bg-muted/20 border border-border/60 rounded-xl focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-200 transition-all text-foreground"
                    />
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-1">Otomatis diformat 62xxx</p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-foreground uppercase tracking-wider mb-1.5">
                    Alamat Email
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-muted-foreground absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="email"
                      placeholder="budi@example.com"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="w-full pl-10 pr-4 py-2.5 text-sm bg-muted/20 border border-border/60 rounded-xl focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-200 transition-all text-foreground"
                    />
                  </div>
                </div>
              </div>

              {/* Slug Kustom (Handle) */}
              <div>
                <label className="block text-xs font-bold text-foreground uppercase tracking-wider mb-1.5">
                  Slug / Handle Kustom (Opsional)
                </label>
                <div className="relative">
                  <AtSign className="w-4 h-4 text-orange-600 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="budi-santoso"
                    value={formData.slug}
                    onChange={(e) => setFormData({ ...formData, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') })}
                    className="w-full pl-10 pr-4 py-2.5 text-sm bg-muted/20 border border-border/60 rounded-xl focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-200 transition-all text-foreground font-mono"
                  />
                </div>
                <p className="text-[10px] text-muted-foreground mt-1">
                  URL profil pelanggan: <span className="font-mono text-orange-600">/admin/customers/{formData.slug || 'slug-unik'}</span>
                </p>
              </div>

              {/* Arus Level (Tingkat Loyalitas) */}
              <div>
                <label className="block text-xs font-bold text-foreground uppercase tracking-wider mb-1.5">
                  Tingkat Loyalitas (Arus Level)
                </label>
                <div className="relative">
                  <ShieldCheck className="w-4 h-4 text-amber-600 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <select
                    value={formData.arusLevel}
                    onChange={(e) => setFormData({ ...formData, arusLevel: e.target.value })}
                    className="w-full pl-10 pr-4 py-2.5 text-sm bg-muted/20 border border-border/60 rounded-xl focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-200 transition-all text-foreground font-medium"
                  >
                    <option value="Tunas Arus">Tunas Arus (Pemula)</option>
                    <option value="Kuncup Arus">Kuncup Arus (Menengah)</option>
                    <option value="Mekar Arus">Mekar Arus (Setia)</option>
                    <option value="Pohon Arus">Pohon Arus (VIP / Ramah Lingkungan)</option>
                  </select>
                </div>
              </div>

              {/* Poin Awal & Saldo Dompet Awal */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-foreground uppercase tracking-wider mb-1.5">
                    Poin Awal
                  </label>
                  <div className="relative">
                    <Trophy className="w-4 h-4 text-amber-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="number"
                      min="0"
                      placeholder="0"
                      value={formData.initialPoints}
                      onChange={(e) => setFormData({ ...formData, initialPoints: Number(e.target.value) || 0 })}
                      className="w-full pl-10 pr-4 py-2.5 text-sm bg-muted/20 border border-border/60 rounded-xl focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-200 transition-all text-foreground"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-foreground uppercase tracking-wider mb-1.5">
                    Saldo Dompet Awal (Rp)
                  </label>
                  <div className="relative">
                    <Wallet className="w-4 h-4 text-orange-600 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="number"
                      min="0"
                      step="1000"
                      placeholder="0"
                      value={formData.initialWallet}
                      onChange={(e) => setFormData({ ...formData, initialWallet: Number(e.target.value) || 0 })}
                      className="w-full pl-10 pr-4 py-2.5 text-sm bg-muted/20 border border-border/60 rounded-xl focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-200 transition-all text-foreground"
                    />
                  </div>
                </div>
              </div>

              {/* Password & PIN Keamanan */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-border/30">
                <div>
                  <label className="block text-xs font-bold text-foreground uppercase tracking-wider mb-1.5">
                    Password Awal
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-muted-foreground absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="seduh123"
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      className="w-full pl-10 pr-4 py-2.5 text-sm bg-muted/20 border border-border/60 rounded-xl focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-200 transition-all text-foreground"
                    />
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-1">Default: seduh123</p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-foreground uppercase tracking-wider mb-1.5">
                    PIN Keamanan (6 Digit)
                  </label>
                  <div className="relative">
                    <KeyRound className="w-4 h-4 text-muted-foreground absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="password"
                      maxLength={6}
                      placeholder="6 digit"
                      value={formData.pin}
                      onChange={(e) => setFormData({ ...formData, pin: e.target.value.replace(/\D/g, '') })}
                      className="w-full pl-10 pr-4 py-2.5 text-sm bg-muted/20 border border-border/60 rounded-xl focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-200 transition-all text-foreground font-mono"
                    />
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-1">Opsional (untuk transaksi dompet)</p>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-border/40">
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  disabled={loading}
                  className="px-4 py-2.5 text-xs sm:text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white text-xs sm:text-sm font-bold shadow-md hover:shadow-lg disabled:opacity-50 transition-all cursor-pointer"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Mendaftarkan...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Simpan Pelanggan</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
