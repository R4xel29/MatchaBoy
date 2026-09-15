'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { 
  ChevronLeft, 
  User, 
  Mail, 
  Phone, 
  Calendar, 
  Clock, 
  Ticket, 
  ShoppingBag, 
  ShieldCheck, 
  History,
  Link2,
  Trophy,
  Smartphone,
  Wallet,
  Copy,
  Check,
  ExternalLink,
  MessageSquare,
  Lock,
  KeyRound,
  Eye,
  EyeOff,
  Edit3,
  PlusCircle,
  AlertCircle,
  Loader2,
  Sparkles,
  Layers,
  ArrowUpRight,
  ArrowDownRight,
  CheckCircle2,
  Send
} from 'lucide-react';
import { format } from 'date-fns';
import { id as localeId } from 'date-fns/locale';
import CustomerActions from './customer-actions';
import CustomerSessions from './customer-sessions';
import ImpersonateButton from '../../users/impersonate-button';
import { updateCustomerDetailsAction, grantCustomerVoucherAction } from '@/app/actions/customer-admin';
import { useToast } from '@/components/ui/Toast';

interface CustomerDetailClientProps {
  customer: any;
  voucherTemplates: any[];
  stats: {
    totalSpent: number;
    completedOrders: number;
  };
}

export default function CustomerDetailClient({
  customer,
  voucherTemplates,
  stats,
}: CustomerDetailClientProps) {
  const router = useRouter();
  const { showToast } = useToast();

  // Tab State
  const [activeTab, setActiveTab] = useState<'orders' | 'vouchers' | 'finance' | 'sessions' | 'logs'>('orders');

  // Copy Feedback State
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    showToast('Berhasil disalin ke papan klip!', 'success');
    setTimeout(() => setCopiedKey(null), 2000);
  };

  // Form State untuk Edit Profil
  const [name, setName] = useState(customer.name || '');
  const [email, setEmail] = useState(customer.email || '');
  const [phone, setPhone] = useState(customer.phone || '');
  const [slug, setSlug] = useState(customer.slug || '');
  const [referralCode, setReferralCode] = useState(customer.referralCode || '');
  const [arusLevel, setArusLevel] = useState(customer.arusLevel || 'Tunas Arus');
  const [points, setPoints] = useState(customer.points || 0);
  const [walletBalance, setWalletBalance] = useState(customer.walletBalance || 0);
  const [tumblerCount, setTumblerCount] = useState(customer.tumblerCount || 0);
  const [gender, setGender] = useState(customer.gender || '');
  const [birthDate, setBirthDate] = useState(
    customer.birthDate ? format(new Date(customer.birthDate), 'yyyy-MM-dd') : ''
  );
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [pin, setPin] = useState(customer.pin || '');
  const [adminNote, setAdminNote] = useState('');
  const [updatingProfile, setUpdatingProfile] = useState(false);

  // Modal Beri Voucher Manual State
  const [voucherModalOpen, setVoucherModalOpen] = useState(false);
  const [grantMode, setGrantMode] = useState<'template' | 'custom'>('template');
  const [selectedTemplateId, setSelectedTemplateId] = useState(voucherTemplates[0]?.id || '');
  const [customVoucherType, setCustomVoucherType] = useState('DISCOUNT_RP');
  const [customVoucherDesc, setCustomVoucherDesc] = useState('');
  const [customVoucherAmount, setCustomVoucherAmount] = useState(10000);
  const [customVoucherMinPurchase, setCustomVoucherMinPurchase] = useState(0);
  const [customVoucherExpiryDays, setCustomVoucherExpiryDays] = useState(14);
  const [grantingVoucher, setGrantingVoucher] = useState(false);

  // Handle Update Profile
  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setUpdatingProfile(true);

    try {
      const res = await updateCustomerDetailsAction({
        userId: customer.id,
        name,
        email: email || null,
        phone: phone || null,
        slug: slug || null,
        referralCode: referralCode || null,
        arusLevel,
        points: Number(points),
        walletBalance: Number(walletBalance),
        tumblerCount: Number(tumblerCount),
        gender: gender || null,
        birthDate: birthDate || null,
        password: password ? password : null,
        pin: pin ? pin : null,
        adminNote: adminNote || null,
      });

      if (!res.success) {
        showToast(res.error || 'Gagal memperbarui data pelanggan', 'error');
      } else {
        showToast(res.message || 'Profil pelanggan berhasil diperbarui!', 'success');
        setPassword('');
        setAdminNote('');
        router.refresh();
      }
    } catch (err: any) {
      showToast(err.message || 'Terjadi kesalahan sistem', 'error');
    } finally {
      setUpdatingProfile(false);
    }
  };

  // Handle Grant Manual Voucher
  const handleGrantVoucherSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setGrantingVoucher(true);

    try {
      const payload = grantMode === 'template'
        ? { userId: customer.id, templateId: selectedTemplateId }
        : {
            userId: customer.id,
            type: customVoucherType,
            description: customVoucherDesc || 'Hadiah Spesial Arum Seduh',
            discountAmount: Number(customVoucherAmount),
            minPurchase: Number(customVoucherMinPurchase),
            expiresInDays: Number(customVoucherExpiryDays),
          };

      const res = await grantCustomerVoucherAction(payload);

      if (!res.success) {
        showToast(res.error || 'Gagal memberikan voucher', 'error');
      } else {
        showToast(res.message || 'Voucher berhasil diberikan!', 'success');
        setVoucherModalOpen(false);
        setCustomVoucherDesc('');
        router.refresh();
      }
    } catch (err: any) {
      showToast(err.message || 'Terjadi kesalahan sistem', 'error');
    } finally {
      setGrantingVoucher(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-20">
      {/* Header & Navigation Bar */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Link 
            href="/admin/customers" 
            className="p-2.5 rounded-2xl border border-border/60 bg-white hover:bg-orange-50 text-muted-foreground hover:text-orange-600 transition-all shadow-sm group"
          >
            <ChevronLeft className="w-5 h-5 transition-transform group-hover:-translate-x-0.5" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground font-medium">Pelanggan /</span>
              <h1 className="text-xl sm:text-2xl font-bold font-heading text-foreground">
                {customer.name || 'Pelanggan'}
              </h1>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Kelola profil, poin loyalitas, saldo, dan riwayat pesanan
            </p>
          </div>
        </div>

        {/* Quick Actions Header */}
        <div className="flex flex-wrap items-center gap-2">
          {customer.phone && (
            <a
              href={`https://wa.me/${customer.phone}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-green-50 hover:bg-green-100 text-green-700 border border-green-200 text-xs font-bold transition-colors"
              title="Kirim pesan WhatsApp langsung"
            >
              <Phone className="w-3.5 h-3.5" />
              <span>WhatsApp</span>
            </a>
          )}

          <ImpersonateButton userId={customer.id} userName={customer.name || 'User'} />

          <button
            onClick={() => copyToClipboard(window.location.href, 'profile-url')}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white hover:bg-muted/40 text-foreground border border-border/60 text-xs font-semibold shadow-sm transition-colors cursor-pointer"
            title="Salin tautan profil ini"
          >
            {copiedKey === 'profile-url' ? (
              <Check className="w-3.5 h-3.5 text-green-600" />
            ) : (
              <Copy className="w-3.5 h-3.5 text-muted-foreground" />
            )}
            <span>Salin Link</span>
          </button>
        </div>
      </div>

      {/* Identifier Info Bar (ID, Slug, Referral Code, Level) */}
      <div className="bg-white p-3.5 sm:p-4 rounded-2xl sm:rounded-3xl border border-border/40 shadow-sm flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-2">
          {/* Customer ID Badge */}
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-muted/40 border border-border/60">
            <span className="text-[11px] font-bold text-muted-foreground">ID:</span>
            <code className="font-mono text-xs font-semibold text-foreground">{customer.id}</code>
            <button
              onClick={() => copyToClipboard(customer.id, 'id')}
              className="text-muted-foreground hover:text-orange-600 p-0.5 ml-0.5"
              title="Salin System ID"
            >
              {copiedKey === 'id' ? <Check className="w-3 h-3 text-green-600" /> : <Copy className="w-3 h-3" />}
            </button>
          </div>

          {/* Slug Badge */}
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-orange-50 border border-orange-200">
            <span className="text-[11px] font-bold text-orange-700">Slug:</span>
            <code className="font-mono text-xs font-bold text-orange-800">
              {customer.slug ? `@${customer.slug}` : 'Belum diatur'}
            </code>
            {customer.slug && (
              <button
                onClick={() => copyToClipboard(customer.slug, 'slug')}
                className="text-orange-700 hover:text-orange-900 p-0.5 ml-0.5"
                title="Salin Slug URL"
              >
                {copiedKey === 'slug' ? <Check className="w-3 h-3 text-green-600" /> : <Copy className="w-3 h-3" />}
              </button>
            )}
          </div>

          {/* Referral Code Badge */}
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-amber-50 border border-amber-200">
            <span className="text-[11px] font-bold text-amber-700">Ref:</span>
            <code className="font-mono text-xs font-bold text-amber-800">{customer.referralCode}</code>
            <button
              onClick={() => copyToClipboard(customer.referralCode, 'ref')}
              className="text-amber-700 hover:text-amber-900 p-0.5 ml-0.5"
              title="Salin Kode Referral"
            >
              {copiedKey === 'ref' ? <Check className="w-3 h-3 text-green-600" /> : <Copy className="w-3 h-3" />}
            </button>
          </div>
        </div>

        {/* Level & Role Tag */}
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-50 text-amber-800 font-bold text-[11px] uppercase tracking-wider border border-amber-200">
            <ShieldCheck className="w-3 h-3 text-amber-600" />
            {customer.arusLevel || 'Tunas Arus'}
          </span>
          <span className="text-muted-foreground text-xs font-medium">
            Bergabung {format(new Date(customer.createdAt), "d MMMM yyyy", { locale: localeId })}
          </span>
        </div>
      </div>

      {/* KPI Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        {/* Saldo Dompet */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl sm:rounded-3xl border border-orange-100 shadow-[0_4px_20px_rgba(234,88,12,0.04)] relative overflow-hidden group">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Saldo Dompet</span>
            <div className="w-8 h-8 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center">
              <Wallet className="w-4 h-4" />
            </div>
          </div>
          <p className="text-xl sm:text-2xl font-black text-foreground">
            Rp {customer.walletBalance.toLocaleString('id-ID')}
          </p>
          <p className="text-[10px] text-muted-foreground mt-1">Saldo aktif untuk transaksi</p>
        </div>

        {/* Poin Loyalitas */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl sm:rounded-3xl border border-amber-100 shadow-[0_4px_20px_rgba(217,119,6,0.04)] relative overflow-hidden group">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Poin Loyalitas</span>
            <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <Trophy className="w-4 h-4" />
            </div>
          </div>
          <p className="text-xl sm:text-2xl font-black text-amber-600">
            {customer.points.toLocaleString('id-ID')} Poin
          </p>
          <p className="text-[10px] text-muted-foreground mt-1">Dapat ditukar reward</p>
        </div>

        {/* Total Pesanan & Omzet */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl sm:rounded-3xl border border-orange-100 shadow-[0_4px_20px_rgba(234,88,12,0.04)] relative overflow-hidden group">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Total Pesanan</span>
            <div className="w-8 h-8 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center">
              <ShoppingBag className="w-4 h-4" />
            </div>
          </div>
          <p className="text-xl sm:text-2xl font-black text-foreground">
            {customer.orders.length} <span className="text-xs font-normal text-muted-foreground">order</span>
          </p>
          <p className="text-[10px] text-muted-foreground mt-1">
            Omzet: Rp {stats.totalSpent.toLocaleString('id-ID')}
          </p>
        </div>

        {/* Eco-Tumbler */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl sm:rounded-3xl border border-amber-100 shadow-[0_4px_20px_rgba(217,119,6,0.04)] relative overflow-hidden group">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Bawa Tumbler</span>
            <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <Sparkles className="w-4 h-4" />
            </div>
          </div>
          <p className="text-xl sm:text-2xl font-black text-foreground">
            {customer.tumblerCount} <span className="text-xs font-normal text-muted-foreground">kali</span>
          </p>
          <p className="text-[10px] text-muted-foreground mt-1">
            Target milestone: {customer.currentTumblerGoal || 10} kali
          </p>
        </div>
      </div>

      {/* Main 2-Column Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column (5 Cols): Profile Editor & Danger Zone */}
        <div className="lg:col-span-5 space-y-6">
          {/* Profile Editor Card */}
          <div className="bg-white rounded-3xl border border-border/40 shadow-sm overflow-hidden">
            <div className="p-5 sm:p-6 border-b border-border/40 flex items-center justify-between bg-muted/10">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center">
                  <Edit3 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-foreground text-sm">Kelola & Edit Profil</h3>
                  <p className="text-[11px] text-muted-foreground">Ubah data identitas, saldo, dan poin</p>
                </div>
              </div>
            </div>

            <form onSubmit={handleProfileSubmit} className="p-5 sm:p-6 space-y-4">
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
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 text-xs sm:text-sm bg-muted/20 border border-border/60 rounded-xl focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-200 transition-all text-foreground"
                  />
                </div>
              </div>

              {/* Slug Kustom (@handle) */}
              <div>
                <label className="block text-xs font-bold text-foreground uppercase tracking-wider mb-1.5">
                  Slug Pelanggan (@handle)
                </label>
                <div className="relative">
                  <span className="text-orange-600 font-mono font-bold text-sm absolute left-3.5 top-1/2 -translate-y-1/2">
                    @
                  </span>
                  <input
                    type="text"
                    placeholder="budi-santoso"
                    value={slug}
                    onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                    className="w-full pl-8 pr-4 py-2 text-xs sm:text-sm font-mono font-bold bg-muted/20 border border-border/60 rounded-xl focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-200 transition-all text-foreground"
                  />
                </div>
                <p className="text-[10px] text-muted-foreground mt-1">
                  URL langsung: <span className="font-mono text-orange-600">/admin/customers/{slug || customer.id}</span>
                </p>
              </div>

              {/* WhatsApp & Email */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-foreground uppercase tracking-wider mb-1.5">
                    Nomor WhatsApp
                  </label>
                  <div className="relative">
                    <Phone className="w-4 h-4 text-muted-foreground absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="08123456789"
                      className="w-full pl-10 pr-3 py-2 text-xs sm:text-sm bg-muted/20 border border-border/60 rounded-xl focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-200 transition-all text-foreground"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-foreground uppercase tracking-wider mb-1.5">
                    Alamat Email
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-muted-foreground absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="email@example.com"
                      className="w-full pl-10 pr-3 py-2 text-xs sm:text-sm bg-muted/20 border border-border/60 rounded-xl focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-200 transition-all text-foreground"
                    />
                  </div>
                </div>
              </div>

              {/* Level Loyalitas & Kode Referral */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-foreground uppercase tracking-wider mb-1.5">
                    Level Loyalitas
                  </label>
                  <select
                    value={arusLevel}
                    onChange={(e) => setArusLevel(e.target.value)}
                    className="w-full px-3 py-2 text-xs sm:text-sm bg-muted/20 border border-border/60 rounded-xl focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-200 transition-all text-foreground font-medium"
                  >
                    <option value="Tunas Arus">Tunas Arus</option>
                    <option value="Kuncup Arus">Kuncup Arus</option>
                    <option value="Mekar Arus">Mekar Arus</option>
                    <option value="Pohon Arus">Pohon Arus</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-foreground uppercase tracking-wider mb-1.5">
                    Kode Referral
                  </label>
                  <input
                    type="text"
                    value={referralCode}
                    onChange={(e) => setReferralCode(e.target.value.toUpperCase())}
                    className="w-full px-3 py-2 text-xs sm:text-sm font-mono font-bold bg-muted/20 border border-border/60 rounded-xl focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-200 transition-all text-foreground"
                  />
                </div>
              </div>

              {/* Saldo Dompet & Poin */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 rounded-2xl bg-orange-50/40 border border-orange-100">
                <div>
                  <label className="block text-[11px] font-bold text-orange-900 uppercase tracking-wider mb-1">
                    Saldo Dompet (Rp)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="1000"
                    value={walletBalance}
                    onChange={(e) => setWalletBalance(Number(e.target.value))}
                    className="w-full px-3 py-1.5 text-xs sm:text-sm font-bold bg-white border border-orange-200 rounded-xl focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-200 text-foreground"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-orange-900 uppercase tracking-wider mb-1">
                    Poin Loyalitas
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={points}
                    onChange={(e) => setPoints(Number(e.target.value))}
                    className="w-full px-3 py-1.5 text-xs sm:text-sm font-bold bg-white border border-orange-200 rounded-xl focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-200 text-foreground"
                  />
                </div>

                <div className="col-span-full">
                  <label className="block text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                    Catatan Penyesuaian Saldo / Poin (Opsional)
                  </label>
                  <input
                    type="text"
                    placeholder="Contoh: Koreksi kompensasi kendala order"
                    value={adminNote}
                    onChange={(e) => setAdminNote(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs bg-white border border-orange-200 rounded-xl focus:outline-none focus:border-orange-500 text-foreground"
                  />
                </div>
              </div>

              {/* Tumbler, Gender & Tanggal Lahir */}
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-[10px] font-bold text-foreground uppercase tracking-wider mb-1">
                    Tumbler (x)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={tumblerCount}
                    onChange={(e) => setTumblerCount(Number(e.target.value))}
                    className="w-full px-2.5 py-1.5 text-xs bg-muted/20 border border-border/60 rounded-xl text-foreground"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-foreground uppercase tracking-wider mb-1">
                    Gender
                  </label>
                  <select
                    value={gender}
                    onChange={(e) => setGender(e.target.value)}
                    className="w-full px-2 py-1.5 text-xs bg-muted/20 border border-border/60 rounded-xl text-foreground"
                  >
                    <option value="">-</option>
                    <option value="MAN">Pria</option>
                    <option value="WOMAN">Wanita</option>
                    <option value="SECRET">Rahasia</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-foreground uppercase tracking-wider mb-1">
                    Tgl Lahir
                  </label>
                  <input
                    type="date"
                    value={birthDate}
                    onChange={(e) => setBirthDate(e.target.value)}
                    className="w-full px-1.5 py-1.5 text-xs bg-muted/20 border border-border/60 rounded-xl text-foreground"
                  />
                </div>
              </div>

              {/* Keamanan: Password & PIN */}
              <div className="pt-3 border-t border-border/30 space-y-3">
                <div>
                  <label className="block text-xs font-bold text-foreground uppercase tracking-wider mb-1.5">
                    Reset Password Pelanggan (Opsional)
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-muted-foreground absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Kosongkan jika tidak ingin diubah"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full pl-10 pr-10 py-2 text-xs sm:text-sm bg-muted/20 border border-border/60 rounded-xl focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-200 text-foreground"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-1"
                    >
                      {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
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
                      placeholder="6 digit angka"
                      value={pin}
                      onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
                      className="w-full pl-10 pr-4 py-2 text-xs sm:text-sm font-mono bg-muted/20 border border-border/60 rounded-xl focus:outline-none focus:border-orange-500 text-foreground"
                    />
                  </div>
                </div>
              </div>

              {/* Submit Button */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={updatingProfile}
                  className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white text-xs sm:text-sm font-bold shadow-md hover:shadow-lg disabled:opacity-50 transition-all cursor-pointer"
                >
                  {updatingProfile ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Menyimpan Perubahan...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Simpan Perubahan Profil</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>

          {/* Akun Terhubung */}
          <div className="bg-white rounded-3xl border border-border/40 shadow-sm p-5 sm:p-6 space-y-3">
            <div className="flex items-center gap-2">
              <Link2 className="w-4 h-4 text-orange-600" />
              <h3 className="font-bold text-foreground text-sm">Akun Terhubung (OAuth)</h3>
            </div>
            
            {customer.accounts.length === 0 ? (
              <p className="text-xs text-muted-foreground p-3 rounded-2xl bg-muted/20 border border-dashed border-border/60 text-center">
                Tidak ada akun sosial terhubung
              </p>
            ) : (
              customer.accounts.map((acc: any) => (
                <div key={acc.id} className="flex items-center justify-between p-3 rounded-2xl bg-muted/20 border border-border/40 text-xs">
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-lg bg-white shadow-sm flex items-center justify-center font-bold text-foreground uppercase">
                      {acc.provider[0]}
                    </div>
                    <div>
                      <p className="font-bold text-foreground capitalize">{acc.provider}</p>
                      <p className="text-[10px] text-muted-foreground font-mono">ID: {acc.providerAccountId.slice(0, 10)}...</p>
                    </div>
                  </div>
                  <span className="px-2 py-0.5 rounded-md bg-green-50 text-green-700 text-[10px] font-bold">TERKONEKSI</span>
                </div>
              ))
            )}
          </div>

          {/* Danger Zone */}
          <CustomerActions userId={customer.id} userName={customer.name || 'Pelanggan'} />
        </div>

        {/* Right Column (7 Cols): Tabs Navigation & Deep Info */}
        <div className="lg:col-span-7 space-y-6">
          {/* Tabs Navigation Pills */}
          <div className="flex flex-wrap items-center gap-2 bg-white p-2 rounded-2xl sm:rounded-3xl border border-border/40 shadow-sm">
            <button
              onClick={() => setActiveTab('orders')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'orders'
                  ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-sm'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/30'
              }`}
            >
              <ShoppingBag className="w-3.5 h-3.5" />
              <span>Pesanan</span>
              <span className={`px-1.5 py-0.2 rounded-md text-[10px] font-black ${
                activeTab === 'orders' ? 'bg-white/20 text-white' : 'bg-muted text-muted-foreground'
              }`}>
                {customer.orders.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('vouchers')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'vouchers'
                  ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-sm'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/30'
              }`}
            >
              <Ticket className="w-3.5 h-3.5" />
              <span>Voucher</span>
              <span className={`px-1.5 py-0.2 rounded-md text-[10px] font-black ${
                activeTab === 'vouchers' ? 'bg-white/20 text-white' : 'bg-muted text-muted-foreground'
              }`}>
                {customer.vouchers.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('finance')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'finance'
                  ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-sm'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/30'
              }`}
            >
              <Wallet className="w-3.5 h-3.5" />
              <span>Mutasi Dompet & Poin</span>
            </button>

            <button
              onClick={() => setActiveTab('sessions')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'sessions'
                  ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-sm'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/30'
              }`}
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span>Perangkat ({customer.sessions.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('logs')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'logs'
                  ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-sm'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/30'
              }`}
            >
              <History className="w-3.5 h-3.5" />
              <span>Log ({customer.activityLogs.length})</span>
            </button>
          </div>

          {/* TAB 1: RIWAYAT PESANAN */}
          {activeTab === 'orders' && (
            <div className="bg-white rounded-3xl border border-border/40 shadow-sm p-5 sm:p-6 space-y-4 animate-fade-in">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ShoppingBag className="w-4 h-4 text-orange-600" />
                  <h3 className="font-bold text-foreground text-sm">Riwayat Pesanan Pelanggan</h3>
                </div>
                <span className="text-xs text-muted-foreground">
                  Menampilkan {customer.orders.length} pesanan terakhir
                </span>
              </div>

              {customer.orders.length === 0 ? (
                <div className="py-12 text-center text-muted-foreground/60 border-2 border-dashed border-border/40 rounded-3xl">
                  <ShoppingBag className="w-10 h-10 mx-auto mb-2 opacity-30 text-orange-600" />
                  <p className="font-bold text-foreground text-sm">Belum Ada Riwayat Pesanan</p>
                  <p className="text-xs text-muted-foreground mt-1">Pelanggan ini belum melakukan transaksi belanja.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {customer.orders.map((order: any) => (
                    <Link
                      key={order.id}
                      href={`/admin/orders/${order.id}`}
                      className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-2xl border border-border/40 hover:border-orange-200 hover:bg-orange-50/20 transition-all gap-3 group"
                    >
                      <div className="flex items-center gap-3.5">
                        <div className="w-11 h-11 rounded-2xl bg-muted/40 flex flex-col items-center justify-center group-hover:bg-orange-100 transition-colors shrink-0">
                          <span className="text-[9px] font-bold text-muted-foreground uppercase">
                            {format(new Date(order.createdAt), 'MMM')}
                          </span>
                          <span className="text-base font-black text-foreground leading-none">
                            {format(new Date(order.createdAt), 'dd')}
                          </span>
                        </div>
                        <div>
                          <p className="font-mono font-bold text-foreground text-xs group-hover:text-orange-600 transition-colors">
                            #{order.id.slice(-6).toUpperCase()}
                          </p>
                          <p className="text-[11px] text-muted-foreground">
                            {order._count?.items || 1} Item • {order.orderType} • {order.paymentMethod}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center justify-between sm:justify-end gap-3 text-right">
                        <div>
                          <p className="text-xs sm:text-sm font-black text-foreground">
                            Rp {order.total.toLocaleString('id-ID')}
                          </p>
                          <span className="text-[10px] text-muted-foreground">
                            {format(new Date(order.createdAt), 'HH:mm')} WIB
                          </span>
                        </div>
                        <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${
                          order.status === 'COMPLETED' ? 'bg-green-100 text-green-800' :
                          order.status === 'CANCELLED' ? 'bg-red-100 text-red-800' :
                          'bg-amber-100 text-amber-800'
                        }`}>
                          {order.status}
                        </span>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: VOUCHER & HADIAH */}
          {activeTab === 'vouchers' && (
            <div className="bg-white rounded-3xl border border-border/40 shadow-sm p-5 sm:p-6 space-y-5 animate-fade-in">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Ticket className="w-4 h-4 text-orange-600" />
                  <h3 className="font-bold text-foreground text-sm">Koleksi Voucher & Kupon</h3>
                </div>
                <button
                  onClick={() => setVoucherModalOpen(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-orange-50 hover:bg-orange-100 text-orange-700 border border-orange-200 text-xs font-bold transition-colors cursor-pointer"
                >
                  <PlusCircle className="w-3.5 h-3.5" />
                  <span>Beri Voucher Manual</span>
                </button>
              </div>

              {customer.vouchers.length === 0 ? (
                <div className="py-12 text-center text-muted-foreground/60 border-2 border-dashed border-border/40 rounded-3xl">
                  <Ticket className="w-10 h-10 mx-auto mb-2 opacity-30 text-orange-600" />
                  <p className="font-bold text-foreground text-sm">Belum Memiliki Voucher</p>
                  <p className="text-xs text-muted-foreground mt-1">Gunakan tombol di atas untuk menghadiahkan voucher.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  {customer.vouchers.map((voucher: any) => (
                    <div 
                      key={voucher.id} 
                      className={`p-4 rounded-2xl border-2 transition-all ${
                        voucher.isUsed 
                          ? 'border-border/30 bg-muted/10 opacity-70' 
                          : 'border-orange-100 bg-orange-50/20 hover:border-orange-300'
                      }`}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div className="w-8 h-8 rounded-xl bg-white flex items-center justify-center shadow-sm">
                          <Ticket className={`w-4 h-4 ${voucher.isUsed ? 'text-muted-foreground' : 'text-orange-600'}`} />
                        </div>
                        {voucher.isUsed ? (
                          <span className="px-2 py-0.5 rounded-md bg-muted text-muted-foreground text-[9px] font-bold uppercase">
                            Sudah Dipakai
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-md bg-orange-500 text-white text-[9px] font-bold uppercase shadow-sm">
                            Tersedia
                          </span>
                        )}
                      </div>

                      <p className="font-bold text-foreground text-xs sm:text-sm mb-1">{voucher.description}</p>
                      <div className="flex items-center justify-between text-xs font-mono font-bold text-orange-700 mb-2">
                        <span>{voucher.code}</span>
                        {voucher.discountAmount > 0 && (
                          <span className="text-foreground">Potongan: Rp {voucher.discountAmount.toLocaleString('id-ID')}</span>
                        )}
                      </div>

                      <div className="pt-2 border-t border-border/30 text-[10px] text-muted-foreground flex items-center justify-between">
                        <span>Didapat: {format(new Date(voucher.createdAt), 'd MMM yyyy')}</span>
                        {voucher.expiresAt && (
                          <span>Exp: {format(new Date(voucher.expiresAt), 'd MMM yyyy')}</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: MUTASI DOMPET & POIN */}
          {activeTab === 'finance' && (
            <div className="space-y-6 animate-fade-in">
              {/* Mutasi Saldo Dompet */}
              <div className="bg-white rounded-3xl border border-border/40 shadow-sm p-5 sm:p-6 space-y-4">
                <div className="flex items-center gap-2">
                  <Wallet className="w-4 h-4 text-orange-600" />
                  <h3 className="font-bold text-foreground text-sm">Riwayat Transaksi Saldo Dompet</h3>
                </div>

                {customer.walletTransactions?.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-6 border border-dashed border-border/40 rounded-2xl">
                    Belum ada riwayat transaksi dompet
                  </p>
                ) : (
                  <div className="space-y-2.5">
                    {customer.walletTransactions?.map((tx: any) => (
                      <div key={tx.id} className="flex items-center justify-between p-3 rounded-2xl bg-muted/20 border border-border/30 text-xs">
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${
                            tx.amount > 0 ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'
                          }`}>
                            {tx.amount > 0 ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
                          </div>
                          <div>
                            <p className="font-bold text-foreground">{tx.description || tx.type}</p>
                            <p className="text-[10px] text-muted-foreground">
                              {format(new Date(tx.createdAt), 'd MMM yyyy, HH:mm')}
                            </p>
                          </div>
                        </div>
                        <span className={`font-mono font-bold ${tx.amount > 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {tx.amount > 0 ? '+' : ''}Rp {tx.amount.toLocaleString('id-ID')}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Mutasi Poin Loyalitas */}
              <div className="bg-white rounded-3xl border border-border/40 shadow-sm p-5 sm:p-6 space-y-4">
                <div className="flex items-center gap-2">
                  <Trophy className="w-4 h-4 text-amber-600" />
                  <h3 className="font-bold text-foreground text-sm">Riwayat Mutasi Poin Loyalitas</h3>
                </div>

                {customer.pointHistory?.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-6 border border-dashed border-border/40 rounded-2xl">
                    Belum ada riwayat perolehan atau redeem poin
                  </p>
                ) : (
                  <div className="space-y-2.5">
                    {customer.pointHistory?.map((pt: any) => (
                      <div key={pt.id} className="flex items-center justify-between p-3 rounded-2xl bg-muted/20 border border-border/30 text-xs">
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${
                            pt.amount > 0 ? 'bg-amber-50 text-amber-600' : 'bg-red-50 text-red-600'
                          }`}>
                            <Trophy className="w-4 h-4" />
                          </div>
                          <div>
                            <p className="font-bold text-foreground">{pt.description}</p>
                            <p className="text-[10px] text-muted-foreground">
                              {format(new Date(pt.createdAt), 'd MMM yyyy, HH:mm')}
                            </p>
                          </div>
                        </div>
                        <span className={`font-mono font-bold ${pt.amount > 0 ? 'text-amber-600' : 'text-red-600'}`}>
                          {pt.amount > 0 ? '+' : ''}{pt.amount} Poin
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 4: PERANGKAT & SESI AKTIF */}
          {activeTab === 'sessions' && (
            <div className="animate-fade-in">
              <CustomerSessions sessions={customer.sessions} userId={customer.id} />
            </div>
          )}

          {/* TAB 5: LOG AKTIVITAS */}
          {activeTab === 'logs' && (
            <div className="bg-white rounded-3xl border border-border/40 shadow-sm p-5 sm:p-6 space-y-4 animate-fade-in">
              <div className="flex items-center gap-2">
                <History className="w-4 h-4 text-orange-600" />
                <h3 className="font-bold text-foreground text-sm">Riwayat Aktivitas Akun</h3>
              </div>

              {customer.activityLogs.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-8 border border-dashed border-border/40 rounded-2xl">
                  Belum ada log aktivitas yang tercatat
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-border/40 text-muted-foreground text-[10px] font-bold uppercase">
                        <th className="pb-2.5 text-left">Aktivitas</th>
                        <th className="pb-2.5 text-left">Detail</th>
                        <th className="pb-2.5 text-right">Waktu</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/20">
                      {customer.activityLogs.map((log: any) => (
                        <tr key={log.id}>
                          <td className="py-3 font-bold text-foreground">{log.action}</td>
                          <td className="py-3 text-muted-foreground">{log.details || '-'}</td>
                          <td className="py-3 text-right text-muted-foreground">
                            {format(new Date(log.createdAt), 'd MMM yyyy, HH:mm')}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Modal Beri Voucher Manual */}
      {voucherModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div 
            className="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-border/40 p-5 sm:p-6 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-border/40">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center">
                  <Ticket className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-foreground text-sm">Beri Voucher Manual</h3>
                  <p className="text-[11px] text-muted-foreground">Hadiahkan kupon ke {customer.name}</p>
                </div>
              </div>
              <button
                onClick={() => setVoucherModalOpen(false)}
                className="w-7 h-7 rounded-full bg-muted/40 hover:bg-muted text-muted-foreground flex items-center justify-center"
              >
                ✕
              </button>
            </div>

            {/* Selector: Template vs Custom */}
            <div className="grid grid-cols-2 gap-2 p-1 rounded-2xl bg-muted/30">
              <button
                type="button"
                onClick={() => setGrantMode('template')}
                className={`py-1.5 text-xs font-bold rounded-xl transition-all ${
                  grantMode === 'template' ? 'bg-white text-orange-600 shadow-sm' : 'text-muted-foreground'
                }`}
              >
                Pilih dari Template
              </button>
              <button
                type="button"
                onClick={() => setGrantMode('custom')}
                className={`py-1.5 text-xs font-bold rounded-xl transition-all ${
                  grantMode === 'custom' ? 'bg-white text-orange-600 shadow-sm' : 'text-muted-foreground'
                }`}
              >
                Voucher Kustom
              </button>
            </div>

            <form onSubmit={handleGrantVoucherSubmit} className="space-y-3.5">
              {grantMode === 'template' ? (
                <div>
                  <label className="block text-xs font-bold text-foreground uppercase tracking-wider mb-1.5">
                    Pilih Template Promo
                  </label>
                  {voucherTemplates.length === 0 ? (
                    <p className="text-xs text-amber-600 bg-amber-50 p-3 rounded-xl border border-amber-200">
                      Belum ada template voucher promo yang aktif di sistem. Silakan pilih tab Voucher Kustom.
                    </p>
                  ) : (
                    <select
                      value={selectedTemplateId}
                      onChange={(e) => setSelectedTemplateId(e.target.value)}
                      className="w-full px-3 py-2 text-xs sm:text-sm bg-muted/20 border border-border/60 rounded-xl text-foreground font-medium"
                    >
                      {voucherTemplates.map((tmpl) => (
                        <option key={tmpl.id} value={tmpl.id}>
                          {tmpl.title} ({tmpl.code}) - Potongan Rp {tmpl.discountValue.toLocaleString('id-ID')}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              ) : (
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-bold text-foreground uppercase tracking-wider mb-1">
                      Deskripsi Hadiah Voucher
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Contoh: Diskon Ulang Tahun Rp 15.000"
                      value={customVoucherDesc}
                      onChange={(e) => setCustomVoucherDesc(e.target.value)}
                      className="w-full px-3 py-2 text-xs sm:text-sm bg-muted/20 border border-border/60 rounded-xl text-foreground"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[10px] font-bold text-foreground uppercase tracking-wider mb-1">
                        Nilai Potongan (Rp)
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="1000"
                        value={customVoucherAmount}
                        onChange={(e) => setCustomVoucherAmount(Number(e.target.value))}
                        className="w-full px-3 py-1.5 text-xs bg-muted/20 border border-border/60 rounded-xl text-foreground font-bold"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-foreground uppercase tracking-wider mb-1">
                        Masa Berlaku (Hari)
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={customVoucherExpiryDays}
                        onChange={(e) => setCustomVoucherExpiryDays(Number(e.target.value))}
                        className="w-full px-3 py-1.5 text-xs bg-muted/20 border border-border/60 rounded-xl text-foreground"
                      />
                    </div>
                  </div>
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-border/40">
                <button
                  type="button"
                  onClick={() => setVoucherModalOpen(false)}
                  disabled={grantingVoucher}
                  className="px-4 py-2 text-xs font-semibold text-muted-foreground hover:text-foreground"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={grantingVoucher || (grantMode === 'template' && voucherTemplates.length === 0)}
                  className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white text-xs font-bold shadow-md transition-all disabled:opacity-50 cursor-pointer"
                >
                  {grantingVoucher ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Memberikan...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-3.5 h-3.5" />
                      <span>Kirimkan Voucher</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
