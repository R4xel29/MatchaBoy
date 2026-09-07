'use client';

import React, { useState } from 'react';
import { 
  UserPlus, 
  X, 
  User, 
  Mail, 
  Phone, 
  Lock, 
  ShieldCheck, 
  CheckCircle2, 
  AlertCircle, 
  Loader2,
  Sparkles
} from 'lucide-react';
import { createStaffUserAction } from '@/app/actions/admin';

export default function CreateStaffModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    role: 'CASHIER',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (error) setError(null);
  };

  const handleOpen = () => {
    setFormData({
      name: '',
      email: '',
      phone: '',
      password: '',
      role: 'CASHIER',
    });
    setError(null);
    setSuccess(null);
    setIsOpen(true);
  };

  const handleClose = () => {
    if (loading) return;
    setIsOpen(false);
    setError(null);
    setSuccess(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!formData.name.trim()) {
      setError('Nama lengkap staf wajib diisi');
      return;
    }

    if (!formData.email.trim() && !formData.phone.trim()) {
      setError('Masukkan minimal Email atau Nomor WhatsApp untuk login staf');
      return;
    }

    if (!formData.password || formData.password.length < 6) {
      setError('Password / PIN awal minimal 6 karakter');
      return;
    }

    setLoading(true);
    try {
      const res = await createStaffUserAction(formData);

      if (!res.success) {
        setError(res.error || 'Gagal menambahkan staf');
      } else {
        setSuccess(`Akun untuk ${formData.name} berhasil dibuat!`);
        setTimeout(() => {
          setIsOpen(false);
        }, 1500);
      }
    } catch (err: any) {
      setError(err?.message || 'Terjadi kesalahan sistem saat membuat akun staf');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button
        onClick={handleOpen}
        className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-semibold text-sm shadow-sm hover:shadow transition-all duration-200"
      >
        <UserPlus className="w-4 h-4" />
        <span>Tambah Staf Baru</span>
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div 
            className="bg-white rounded-2xl w-full max-w-md shadow-2xl border border-orange-100 overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="px-6 py-4 bg-gradient-to-r from-orange-500 to-amber-500 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-white/20 backdrop-blur-md">
                  <UserPlus className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="font-bold text-base tracking-tight">Tambah Staf Karyawan</h3>
                  <p className="text-xs text-orange-100">Buat akun akses operasional Arum Seduh</p>
                </div>
              </div>
              <button
                onClick={handleClose}
                disabled={loading}
                className="p-1 rounded-lg hover:bg-white/20 text-white/80 hover:text-white transition-colors disabled:opacity-50"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {error && (
                <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2.5">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              {success && (
                <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs flex items-center gap-2.5">
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                  <span className="font-medium">{success}</span>
                </div>
              )}

              {/* Input Nama */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-orange-500" />
                  Nama Lengkap Karyawan
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="Contoh: Budi Santoso"
                  disabled={loading}
                  required
                  className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all text-slate-800 placeholder:text-slate-400"
                />
              </div>

              {/* Input Email */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-orange-500" />
                  Email Login
                </label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="staf1@arumseduh.com"
                  disabled={loading}
                  className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all text-slate-800 placeholder:text-slate-400"
                />
                <p className="text-[11px] text-slate-400">Digunakan untuk login staf via browser kasir.</p>
              </div>

              {/* Input No HP */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-orange-500" />
                  Nomor WhatsApp / HP
                </label>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  placeholder="08123456789"
                  disabled={loading}
                  className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all text-slate-800 placeholder:text-slate-400"
                />
              </div>

              {/* Input Password */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-orange-500" />
                  Password / PIN Login
                </label>
                <input
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="Minimal 6 karakter"
                  disabled={loading}
                  required
                  className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all text-slate-800 placeholder:text-slate-400"
                />
              </div>

              {/* Role Selection */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-orange-500" />
                  Peran & Hak Akses
                </label>
                <select
                  name="role"
                  value={formData.role}
                  onChange={handleChange}
                  disabled={loading}
                  className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all text-slate-800"
                >
                  <option value="CASHIER">Staf Operasional (Kasir & Barista)</option>
                  <option value="ADMIN">Admin Utama (Akses Penuh)</option>
                </select>
                <p className="text-[11px] text-amber-700 bg-amber-50/80 p-2 rounded-lg border border-amber-100 flex items-start gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 shrink-0 text-amber-600 mt-0.5" />
                  <span>Staf Operasional berhak mengakses POS Kasir, antrean live pesanan dapur, stok bahan baku, dan kas kecil. Laporan keuangan pemilik tetap terlindungi aman.</span>
                </p>
              </div>

              {/* Buttons */}
              <div className="pt-3 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={handleClose}
                  disabled={loading}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors disabled:opacity-50"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="inline-flex items-center gap-2 px-5 py-2 text-xs font-semibold text-white bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 rounded-xl shadow-sm hover:shadow transition-all disabled:opacity-50"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Menyimpan...</span>
                    </>
                  ) : (
                    <>
                      <UserPlus className="w-4 h-4" />
                      <span>Simpan Akun Staf</span>
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
