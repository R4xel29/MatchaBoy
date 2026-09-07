'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { 
  ChevronLeft, 
  User, 
  Mail, 
  Phone, 
  Lock, 
  ShieldCheck, 
  Key, 
  Coins, 
  Receipt, 
  Activity, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  Eye, 
  EyeOff, 
  Calendar,
  Check,
  ArrowUpRight,
  ArrowDownRight,
  TrendingUp,
  Sparkles
} from 'lucide-react';
import { updateStaffDetailsAction } from '@/app/actions/admin';

interface StaffDetailClientProps {
  staff: any;
  stats: {
    totalShifts: number;
    totalOrdersProcessed: number;
    totalRevenueProcessed: number;
  };
}

export default function StaffDetailClient({ staff, stats }: StaffDetailClientProps) {
  // Form State
  const [name, setName] = useState(staff.name || '');
  const [email, setEmail] = useState(staff.email || '');
  const [phone, setPhone] = useState(staff.phone || '');
  const [role, setRole] = useState(staff.role || 'CASHIER');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Status State
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Active History Tab
  const [activeHistoryTab, setActiveHistoryTab] = useState<'shifts' | 'orders' | 'logs'>('shifts');

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setSuccessMsg(null);
    setErrorMsg(null);

    try {
      const res = await updateStaffDetailsAction({
        userId: staff.id,
        name,
        email,
        phone,
        role,
        password: password ? password : undefined,
      });

      if (!res.success) {
        setErrorMsg(res.error || 'Gagal memperbarui data staf');
      } else {
        setSuccessMsg(
          password
            ? 'Profil dan password staf berhasil diperbarui!'
            : 'Data profil staf berhasil diperbarui!'
        );
        setPassword('');
        setTimeout(() => setSuccessMsg(null), 4000);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Terjadi kesalahan sistem');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Back Button */}
      <div>
        <Link
          href="/admin/users"
          className="inline-flex items-center text-xs font-semibold text-slate-500 hover:text-orange-600 transition-colors"
        >
          <ChevronLeft className="w-4 h-4 mr-1" />
          Kembali ke Pengelolaan Admin & Staf
        </Link>
      </div>

      {/* Profile Header Card */}
      <div className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200/80 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center text-white font-extrabold text-2xl shadow-md overflow-hidden">
            {staff.image ? (
              <img src={staff.image} alt={staff.name || 'Staff'} className="w-full h-full object-cover" />
            ) : (
              (staff.name || 'S')[0]?.toUpperCase()
            )}
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl sm:text-2xl font-bold font-heading text-slate-800">
                {name || staff.name || 'Staf Tanpa Nama'}
              </h1>
              <span
                className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                  role === 'ADMIN'
                    ? 'bg-purple-50 text-purple-700 border border-purple-200'
                    : role === 'CASHIER'
                    ? 'bg-orange-50 text-orange-700 border border-orange-200'
                    : 'bg-slate-100 text-slate-700'
                }`}
              >
                {role === 'ADMIN'
                  ? 'Admin Utama (Owner)'
                  : role === 'CASHIER'
                  ? 'Staf Operasional (Kasir & Barista)'
                  : 'Pelanggan (Customer)'}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1 flex items-center gap-3">
              <span>ID: {staff.id}</span>
              <span>•</span>
              <span className="inline-flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                Bergabung: {new Date(staff.createdAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
              </span>
            </p>
          </div>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center gap-4">
          <div className="w-11 h-11 rounded-xl bg-orange-50 border border-orange-100 flex items-center justify-center text-orange-600">
            <Coins className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-slate-500 font-medium">Total Shift Dijalankan</p>
            <p className="text-xl font-bold text-slate-800">{stats.totalShifts} shift</p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center gap-4">
          <div className="w-11 h-11 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600">
            <Receipt className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-slate-500 font-medium">Pesanan POS Dilayani</p>
            <p className="text-xl font-bold text-slate-800">{stats.totalOrdersProcessed} pesanan</p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center gap-4">
          <div className="w-11 h-11 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600">
            <TrendingUp className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-slate-500 font-medium">Total Transaksi Kasir</p>
            <p className="text-xl font-bold text-slate-800">
              Rp {stats.totalRevenueProcessed.toLocaleString('id-ID')}
            </p>
          </div>
        </div>
      </div>

      {/* Main Grid: Form Edit on Left, History on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* ========================================================================= */}
        {/* COLUMN 1: FORM EDIT AKUN & PASSWORD                                      */}
        {/* ========================================================================= */}
        <div className="lg:col-span-1 bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm space-y-5">
          <div>
            <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
              <Key className="w-4 h-4 text-orange-500" />
              Pengaturan Akun & Password
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Ubah email login, nama, nomor WhatsApp, atau reset kata sandi staf
            </p>
          </div>

          {errorMsg && (
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs flex items-center gap-2.5">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
              <span className="font-semibold">{successMsg}</span>
            </div>
          )}

          <form onSubmit={handleUpdate} className="space-y-4 text-xs">
            {/* Nama Lengkap */}
            <div className="space-y-1.5">
              <label className="font-semibold text-slate-700 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-orange-500" />
                Nama Lengkap
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                disabled={loading}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 text-slate-800 text-xs font-medium"
              />
            </div>

            {/* Email Login */}
            <div className="space-y-1.5">
              <label className="font-semibold text-slate-700 flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-orange-500" />
                Email Login
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="nama@arumseduh.com"
                disabled={loading}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 text-slate-800 text-xs font-medium"
              />
            </div>

            {/* No WhatsApp */}
            <div className="space-y-1.5">
              <label className="font-semibold text-slate-700 flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-orange-500" />
                Nomor WhatsApp / HP
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="081234567890"
                disabled={loading}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 text-slate-800 text-xs font-medium"
              />
            </div>

            {/* Role */}
            <div className="space-y-1.5">
              <label className="font-semibold text-slate-700 flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-orange-500" />
                Peran & Hak Akses
              </label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value)}
                disabled={loading}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 text-slate-800 text-xs font-medium"
              >
                <option value="CASHIER">Staf Operasional (Kasir & Barista)</option>
                <option value="ADMIN">Admin Utama (Owner)</option>
                <option value="CUSTOMER">Pelanggan (Customer)</option>
              </select>
            </div>

            {/* Reset / Ubah Password */}
            <div className="space-y-1.5 pt-2 border-t border-slate-100">
              <label className="font-semibold text-slate-700 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-orange-500" />
                  Ganti Password / PIN Baru
                </span>
                <span className="text-[10px] text-slate-400 font-normal">Opsional</span>
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Isi jika ingin mereset password staf"
                  disabled={loading}
                  className="w-full pl-3.5 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 text-slate-800 text-xs font-medium placeholder:text-slate-400"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <p className="text-[11px] text-slate-400">
                Kosongkan kolom ini jika tidak ingin mengubah password staf saat ini.
              </p>
            </div>

            {/* Tombol Simpan */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 rounded-xl font-bold text-white bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 shadow-sm hover:shadow transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Menyimpan...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    <span>Simpan Perubahan Akun</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* ========================================================================= */}
        {/* COLUMN 2 & 3: DETAIL RIWAYAT LENGKAP                                     */}
        {/* ========================================================================= */}
        <div className="lg:col-span-2 bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm space-y-5">
          {/* History Navigation Tabs */}
          <div className="flex items-center gap-2 border-b border-slate-200 pb-2 flex-wrap">
            <button
              onClick={() => setActiveHistoryTab('shifts')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
                activeHistoryTab === 'shifts'
                  ? 'bg-orange-500 text-white shadow-sm'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <Coins className="w-3.5 h-3.5" />
              <span>Riwayat Shift Kasir</span>
              <span className="ml-1 px-1.5 py-0.5 rounded-md text-[10px] bg-white/20 text-white font-bold">
                {staff.cashierShifts?.length || 0}
              </span>
            </button>

            <button
              onClick={() => setActiveHistoryTab('orders')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
                activeHistoryTab === 'orders'
                  ? 'bg-orange-500 text-white shadow-sm'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <Receipt className="w-3.5 h-3.5" />
              <span>Pesanan POS Dilayani</span>
              <span className="ml-1 px-1.5 py-0.5 rounded-md text-[10px] bg-white/20 text-white font-bold">
                {staff.cashierOrders?.length || 0}
              </span>
            </button>

            <button
              onClick={() => setActiveHistoryTab('logs')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
                activeHistoryTab === 'logs'
                  ? 'bg-orange-500 text-white shadow-sm'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <Activity className="w-3.5 h-3.5" />
              <span>Log Aktivitas Staf</span>
              <span className="ml-1 px-1.5 py-0.5 rounded-md text-[10px] bg-white/20 text-white font-bold">
                {staff.activityLogs?.length || 0}
              </span>
            </button>
          </div>

          {/* TAB 1: SHIFTS */}
          {activeHistoryTab === 'shifts' && (
            <div className="space-y-3">
              {staff.cashierShifts?.length === 0 ? (
                <div className="py-12 text-center text-slate-400">
                  <Coins className="w-10 h-10 mx-auto mb-2 opacity-30 text-orange-500" />
                  <p className="text-xs font-medium">Belum ada riwayat shift kasir untuk staf ini</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {staff.cashierShifts.map((shift: any) => {
                    const isActive = !shift.closedAt;
                    return (
                      <div key={shift.id} className="py-3 flex items-center justify-between text-xs">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-800">Shift #{shift.id.slice(-5)}</span>
                            {isActive ? (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 animate-pulse">
                                Aktif
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-600">
                                Selesai
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-slate-400 mt-0.5">
                            Buka: {new Date(shift.openedAt).toLocaleString('id-ID')}
                            {shift.closedAt ? ` • Tutup: ${new Date(shift.closedAt).toLocaleString('id-ID')}` : ''}
                          </p>
                          {shift.notes && (
                            <p className="text-[11px] text-slate-500 italic mt-0.5">&quot;{shift.notes}&quot;</p>
                          )}
                        </div>

                        <div className="text-right">
                          <p className="font-bold text-slate-800">
                            Modal: Rp {shift.openingCash.toLocaleString('id-ID')}
                          </p>
                          {shift.closingCash !== null && (
                            <p className="text-[11px] text-orange-600 font-semibold">
                              Fisik Kasir: Rp {shift.closingCash.toLocaleString('id-ID')}
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: ORDERS */}
          {activeHistoryTab === 'orders' && (
            <div className="space-y-3">
              {staff.cashierOrders?.length === 0 ? (
                <div className="py-12 text-center text-slate-400">
                  <Receipt className="w-10 h-10 mx-auto mb-2 opacity-30 text-orange-500" />
                  <p className="text-xs font-medium">Belum ada pesanan POS yang diproses oleh staf ini</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {staff.cashierOrders.map((order: any) => (
                    <div key={order.id} className="py-3 flex items-center justify-between text-xs">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-800">#{order.id.slice(-6)}</span>
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-slate-100 text-slate-700">
                            {order.paymentMethod || 'TUNAI'}
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              order.status === 'COMPLETED'
                                ? 'bg-emerald-50 text-emerald-700'
                                : 'bg-amber-50 text-amber-700'
                            }`}
                          >
                            {order.status}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          Pelanggan: {order.customerName || 'Umum'} •{' '}
                          {new Date(order.createdAt).toLocaleString('id-ID')}
                        </p>
                      </div>

                      <div className="text-right font-bold text-slate-800">
                        Rp {order.total.toLocaleString('id-ID')}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: ACTIVITY LOGS */}
          {activeHistoryTab === 'logs' && (
            <div className="space-y-3">
              {staff.activityLogs?.length === 0 ? (
                <div className="py-12 text-center text-slate-400">
                  <Activity className="w-10 h-10 mx-auto mb-2 opacity-30 text-orange-500" />
                  <p className="text-xs font-medium">Belum ada catatan aktivitas staf</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {staff.activityLogs.map((log: any) => (
                    <div key={log.id} className="py-2.5 flex items-start justify-between text-xs gap-3">
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-orange-50 text-orange-700 border border-orange-100">
                            {log.action}
                          </span>
                          <span className="font-semibold text-slate-700">{log.entity}</span>
                        </div>
                        <p className="text-[11px] text-slate-500 mt-1 max-w-lg break-words">
                          {log.details || '-'}
                        </p>
                      </div>
                      <span className="text-[10px] text-slate-400 whitespace-nowrap">
                        {new Date(log.createdAt).toLocaleDateString('id-ID', {
                          day: 'numeric',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
