'use client';

import { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import {
  Printer,
  Save,
  Loader2,
  Upload,
  Trash2,
  Store,
  Wifi,
  Share2,
  FileText,
  CheckCircle2,
  HelpCircle,
  Sparkles,
  Sliders,
  Receipt,
  Coffee,
  Check,
} from 'lucide-react';
import { useToast } from '@/components/ui/Toast';
import { formatRupiah } from '@/lib/utils';
import { ThermalReceiptModal, ReceiptData } from '@/components/cashier/ThermalReceiptModal';
import { BluetoothPrinterPill } from '@/components/cashier/BluetoothPrinterPill';

interface ReceiptSettingsData {
  id: string;
  storeName: string;
  tagline: string;
  address: string;
  phone: string;
  headerNotes: string;
  footerNotes: string;
  showLogo: boolean;
  logoUrl: string | null;
  showWifi: boolean;
  wifiSsid: string;
  wifiPassword: string;
  showSocial: boolean;
  instagram: string;
  tiktok: string;
  showOrderQr: boolean;
  paperWidth: string;
  autoPrintOnCheckout: boolean;
  autoPrintIncomingOrders: boolean;
  printKitchenTicket: boolean;
}

interface Props {
  initialSettings: ReceiptSettingsData;
}

export default function ReceiptSettingsClient({ initialSettings }: Props) {
  const { showToast } = useToast();
  const [form, setForm] = useState<ReceiptSettingsData>(initialSettings);
  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [showTestModal, setShowTestModal] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const sampleOrder: ReceiptData = {
    id: 'AS-TEST-001',
    customerName: 'Bella (Uji Coba)',
    customerPhone: '081288990011',
    orderType: 'DINE_IN',
    tableNumber: '03',
    paymentMethod: 'QRIS',
    createdAt: new Date().toISOString(),
    items: [
      {
        name: 'Kopi Susu Arum',
        qty: 1,
        price: 22000,
        totalPrice: 27000,
        sugarLevel: 'Less Sugar (50%)',
        iceLevel: 'Normal Ice',
        shotName: 'Double Shot (+5.000)',
      },
      {
        name: 'Roti Bakar Butter',
        qty: 1,
        price: 18000,
        totalPrice: 18000,
      },
    ],
    subtotal: 45000,
    tumblerDiscount: 4500,
    total: 40500,
    pointsEarned: 4,
    totalPoints: 34,
    notes: 'Kopi jangan terlalu manis, roti bakar garing.',
  };

  const handleChange = (field: keyof ReceiptSettingsData, value: any) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      showToast('Harap pilih file gambar (PNG/JPG)', 'error');
      return;
    }

    if (file.size > 3 * 1024 * 1024) {
      showToast('Ukuran gambar maksimal 3MB', 'error');
      return;
    }

    setUploadingLogo(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch('/api/admin/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Gagal mengupload logo');

      handleChange('logoUrl', data.url);
      handleChange('showLogo', true);
      showToast('Logo struk berhasil diunggah', 'success');
    } catch (err: any) {
      showToast(err.message || 'Gagal mengupload gambar', 'error');
    } finally {
      setUploadingLogo(false);
    }
  };

  const handleRemoveLogo = () => {
    handleChange('logoUrl', null);
    if (fileInputRef.current) fileInputRef.current.value = '';
    showToast('Logo struk dihapus', 'info');
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/admin/receipt-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Gagal menyimpan pengaturan');

      showToast('Pengaturan struk berhasil disimpan', 'success');
    } catch (err: any) {
      showToast(err.message || 'Terjadi kesalahan saat menyimpan', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleTestPrint = () => {
    setShowTestModal(true);
  };

  return (
    <div className="min-h-screen bg-slate-50/50 p-4 sm:p-6 lg:p-8">
      {/* Header Banner */}
      <div className="max-w-6xl mx-auto mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-xl bg-orange-50 text-orange-600 border border-orange-100 flex items-center justify-center shadow-sm">
                <Printer className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-slate-900 tracking-tight">Pengaturan Struk Kasir</h1>
                <p className="text-xs text-slate-500">
                  Kustomisasi format teks, logo, Wi-Fi, dan preferensi cetak thermal (Algoo AT-5805 / 58mm)
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={handleTestPrint}
              className="px-4 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center gap-2 transition-colors shadow-sm"
            >
              <Printer className="w-4 h-4 text-slate-600" />
              Test Cetak (58mm)
            </button>

            <button
              onClick={handleSave}
              disabled={saving}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white text-xs font-bold shadow-md shadow-orange-500/20 flex items-center gap-2 transition-all disabled:opacity-50"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {saving ? 'Menyimpan...' : 'Simpan Pengaturan'}
            </button>
          </div>
        </div>
      </div>

      {/* Main Grid: Form Left (col-span-7), Live Preview Right (col-span-5) */}
      <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* ================= LEFT FORM ================= */}
        <div className="lg:col-span-7 space-y-6">
          {/* Card 1: Logo Toko */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Store className="w-4 h-4 text-orange-600" />
                <h2 className="font-bold text-sm text-slate-800">Logo Struk</h2>
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.showLogo}
                  onChange={(e) => handleChange('showLogo', e.target.checked)}
                  className="rounded border-slate-300 text-orange-600 focus:ring-orange-500"
                />
                <span className="text-xs font-medium text-slate-600">Tampilkan Logo</span>
              </label>
            </div>

            <p className="text-xs text-slate-500 leading-relaxed">
              Gunakan logo berlatar belakang putih atau transparan dengan kontras tegas. Sistem akan mencetaknya dalam format monokrom (hitam-putih) yang pas untuk kertas 58mm.
            </p>

            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 pt-2">
              <div className="w-32 h-20 bg-slate-100 rounded-xl border border-dashed border-slate-300 flex items-center justify-center p-2 overflow-hidden shrink-0">
                {form.logoUrl ? (
                  <img
                    src={form.logoUrl}
                    alt="Logo Struk"
                    className="max-h-full max-w-full object-contain grayscale contrast-150"
                  />
                ) : (
                  <span className="text-[11px] text-slate-400 text-center font-medium">Belum ada logo</span>
                )}
              </div>

              <div className="flex flex-col gap-2">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleLogoUpload}
                  accept="image/png, image/jpeg, image/webp"
                  className="hidden"
                />
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploadingLogo}
                    className="px-4 py-2 rounded-xl bg-orange-50 hover:bg-orange-100 text-orange-700 text-xs font-semibold flex items-center gap-1.5 transition-colors"
                  >
                    {uploadingLogo ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                    {uploadingLogo ? 'Mengunggah...' : form.logoUrl ? 'Ganti Logo' : 'Upload Logo Toko'}
                  </button>

                  {form.logoUrl && (
                    <button
                      type="button"
                      onClick={handleRemoveLogo}
                      className="p-2 rounded-xl text-red-600 hover:bg-red-50 transition-colors"
                      title="Hapus Logo"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
                <span className="text-[10px] text-slate-400">Rekomendasi lebar: 200px - 384px (PNG/JPG, maks 3MB)</span>
              </div>
            </div>
          </div>

          {/* Card 2: Informasi Toko (Header) */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
              <Store className="w-4 h-4 text-orange-600" />
              <h2 className="font-bold text-sm text-slate-800">Identitas Toko & Header</h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Nama Toko (Header Utama)</label>
                <input
                  type="text"
                  value={form.storeName}
                  onChange={(e) => handleChange('storeName', e.target.value)}
                  placeholder="Arum Seduh"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-orange-500 focus:bg-white outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Tagline / Slogan</label>
                <input
                  type="text"
                  value={form.tagline}
                  onChange={(e) => handleChange('tagline', e.target.value)}
                  placeholder="Kopi & Seduhan Istimewa"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-orange-500 focus:bg-white outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Alamat Lengkap Outlet</label>
              <input
                type="text"
                value={form.address}
                onChange={(e) => handleChange('address', e.target.value)}
                placeholder="Jl. Sukajadi No. 88, Bandung"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-orange-500 focus:bg-white outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">No. WhatsApp / Telepon</label>
              <input
                type="text"
                value={form.phone}
                onChange={(e) => handleChange('phone', e.target.value)}
                placeholder="0812-3456-7890"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-orange-500 focus:bg-white outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Catatan Tambahan Header (Opsional)</label>
              <textarea
                value={form.headerNotes}
                onChange={(e) => handleChange('headerNotes', e.target.value)}
                placeholder="Misal: Buka Setiap Hari 08:00 - 22:00"
                rows={2}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-orange-500 focus:bg-white outline-none resize-none"
              />
            </div>
          </div>

          {/* Card 3: Info Wi-Fi Pelanggan */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Wifi className="w-4 h-4 text-orange-600" />
                <h2 className="font-bold text-sm text-slate-800">Fasilitas Wi-Fi di Struk</h2>
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.showWifi}
                  onChange={(e) => handleChange('showWifi', e.target.checked)}
                  className="rounded border-slate-300 text-orange-600 focus:ring-orange-500"
                />
                <span className="text-xs font-medium text-slate-600">Tampilkan Info Wi-Fi</span>
              </label>
            </div>

            {form.showWifi && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Nama Wi-Fi (SSID)</label>
                  <input
                    type="text"
                    value={form.wifiSsid}
                    onChange={(e) => handleChange('wifiSsid', e.target.value)}
                    placeholder="ArumSeduh_Free"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-orange-500 focus:bg-white outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Password Wi-Fi</label>
                  <input
                    type="text"
                    value={form.wifiPassword}
                    onChange={(e) => handleChange('wifiPassword', e.target.value)}
                    placeholder="seduhkopi123"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-orange-500 focus:bg-white outline-none"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Card 4: Footer & Media Sosial */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Share2 className="w-4 h-4 text-orange-600" />
                <h2 className="font-bold text-sm text-slate-800">Pesan Footer & Media Sosial</h2>
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.showSocial}
                  onChange={(e) => handleChange('showSocial', e.target.checked)}
                  className="rounded border-slate-300 text-orange-600 focus:ring-orange-500"
                />
                <span className="text-xs font-medium text-slate-600">Tampilkan Sosmed</span>
              </label>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Pesan Ucapan / Terima Kasih (Footer)</label>
              <textarea
                value={form.footerNotes}
                onChange={(e) => handleChange('footerNotes', e.target.value)}
                placeholder="Terima kasih atas kunjungan Anda!\nSelamat menikmati seduhan kami."
                rows={3}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-orange-500 focus:bg-white outline-none resize-none"
              />
            </div>

            {form.showSocial && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Instagram</label>
                  <input
                    type="text"
                    value={form.instagram}
                    onChange={(e) => handleChange('instagram', e.target.value)}
                    placeholder="@arumseduh.id"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-orange-500 focus:bg-white outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">TikTok</label>
                  <input
                    type="text"
                    value={form.tiktok}
                    onChange={(e) => handleChange('tiktok', e.target.value)}
                    placeholder="@arumseduh"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-orange-500 focus:bg-white outline-none"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Card 5: Pengaturan Printer Algoo AT-5805 */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Sliders className="w-4 h-4 text-orange-600" />
                <h2 className="font-bold text-sm text-slate-800">Koneksi & Spesifikasi Printer</h2>
              </div>
              <BluetoothPrinterPill />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Lebar Kertas</label>
                <select
                  value={form.paperWidth}
                  onChange={(e) => handleChange('paperWidth', e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-orange-500 focus:bg-white outline-none font-medium text-slate-800"
                >
                  <option value="58mm">58mm (Standar Algoo AT-5805)</option>
                  <option value="80mm">80mm (Printer Thermal Lebar)</option>
                </select>
              </div>

              <div className="flex flex-col justify-center space-y-2 pt-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.autoPrintOnCheckout}
                    onChange={(e) => handleChange('autoPrintOnCheckout', e.target.checked)}
                    className="rounded border-slate-300 text-orange-600 focus:ring-orange-500"
                  />
                  <span className="text-xs font-medium text-slate-700">Auto-Print Transaksi Kasir POS</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.autoPrintIncomingOrders}
                    onChange={(e) => handleChange('autoPrintIncomingOrders', e.target.checked)}
                    className="rounded border-slate-300 text-orange-600 focus:ring-orange-500"
                  />
                  <span className="text-xs font-medium text-slate-700 font-semibold text-orange-700">
                    ⚡ Auto-Print Pesanan Masuk (Online / Meja)
                  </span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.printKitchenTicket}
                    onChange={(e) => handleChange('printKitchenTicket', e.target.checked)}
                    className="rounded border-slate-300 text-orange-600 focus:ring-orange-500"
                  />
                  <span className="text-xs font-medium text-slate-700">Sertakan Struk Dapur / Barista</span>
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* ================= RIGHT LIVE PREVIEW ================= */}
        <div className="lg:col-span-5">
          <div className="sticky top-6 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Receipt className="w-4 h-4 text-orange-600" />
                <h3 className="font-bold text-sm text-slate-800">Live Preview Struk 58mm</h3>
              </div>
              <span className="text-[11px] px-2 py-0.5 rounded bg-orange-100 text-orange-700 font-mono font-semibold">
                Algoo AT-5805
              </span>
            </div>

            {/* Simulated Thermal Paper (CGV Cinema Ticket Style) */}
            <div className="bg-slate-200/80 p-4 sm:p-5 rounded-2xl flex justify-center border border-slate-300 shadow-inner">
              <div
                id="printable-thermal-receipt"
                className="w-full max-w-[310px] bg-white p-4 rounded-lg shadow-lg border-2 border-black text-black font-mono text-[10.5px] leading-tight transition-all select-none space-y-2"
              >
                {/* Logo Preview */}
                {form.showLogo && form.logoUrl && (
                  <div className="flex justify-center mb-1">
                    <img
                      src={form.logoUrl}
                      alt="Preview Logo"
                      className="max-h-9 max-w-[85px] object-contain grayscale contrast-200"
                    />
                  </div>
                )}

                {/* Header */}
                <div className="text-center pb-2 border-b-2 border-black">
                  <h2 className="font-black text-[13px] tracking-wider uppercase">
                    {form.storeName || 'ARUM SEDUH'}
                  </h2>
                  {form.tagline && <p className="text-[9.5px] font-bold text-slate-700">{form.tagline}</p>}
                  {form.address && <p className="text-[8.5px] text-slate-600 mt-0.5">{form.address}</p>}
                  {form.phone && <p className="text-[8.5px] text-slate-600">WA: {form.phone}</p>}
                  {form.headerNotes && (
                    <p className="text-[8px] italic text-slate-500 mt-1 whitespace-pre-line">{form.headerNotes}</p>
                  )}
                </div>

                {/* Section 1: Customer & Order (CGV Header Style) */}
                <div>
                  <span className="bg-black text-white text-[8px] font-black uppercase px-1.5 py-0.5 tracking-wider inline-block">
                    PESANAN
                  </span>
                  <h3 className="font-black text-sm uppercase tracking-wide mt-1 text-black">
                    BELLA
                  </h3>
                  <p className="text-[9px] font-bold text-slate-600">
                    ORDER: #AS-0828
                  </p>
                </div>

                {/* Section 2: Split Box Time/Date & Table/Auditorium (CGV 2-Col Style) */}
                <div className="border-2 border-black flex my-1">
                  <div className="flex-1 p-2 border-r-2 border-black bg-white">
                    <span className="bg-black text-white text-[7px] font-black uppercase px-1 py-0.5 tracking-wider inline-block">
                      WAKTU & TANGGAL
                    </span>
                    <div className="font-black text-[9.5px] mt-1">28/08/2026</div>
                    <div className="font-black text-[11px]">21:45 WIB</div>
                  </div>
                  <div className="w-2/5 p-2 bg-slate-50 flex flex-col items-center justify-center text-center">
                    <span className="bg-black text-white text-[7px] font-black uppercase px-1 py-0.5 tracking-wider inline-block">
                      NOMOR MEJA
                    </span>
                    <div className="font-black text-sm uppercase tracking-tight mt-1 text-black">
                      MEJA 03
                    </div>
                  </div>
                </div>

                {/* Section 3: Order Items (CGV Seat Breakdown Style) */}
                <div className="pt-1">
                  <span className="bg-black text-white text-[8px] font-black uppercase px-1.5 py-0.5 tracking-wider inline-block">
                    DETAIL PESANAN
                  </span>

                  <div className="divide-y divide-dashed divide-slate-400 mt-1">
                    <div className="py-2 space-y-1">
                      <div className="flex justify-between items-start">
                        <span className="font-black text-xs uppercase flex-1 pr-2">
                          [ 1x ] KOPI SUSU ARUM
                        </span>
                        <span className="font-black text-xs shrink-0">
                          27.000
                        </span>
                      </div>
                      {/* Clear & Bold Modifiers */}
                      <div className="border-l-2 border-black pl-2 space-y-0.5 text-[9.5px] font-bold text-black mt-1">
                        <div>» <span className="font-black">GULA:</span> <span className="underline font-black">LESS SUGAR (50%)</span></div>
                        <div>» <span className="font-black">ES:</span> <span className="underline font-black">NORMAL ICE</span></div>
                        <div>» <span className="font-black">SHOT:</span> <span className="underline font-black">DOUBLE SHOT (+5.000)</span></div>
                      </div>
                    </div>

                    <div className="py-2 space-y-1">
                      <div className="flex justify-between items-start">
                        <span className="font-black text-xs uppercase flex-1 pr-2">
                          [ 1x ] ROTI BAKAR BUTTER
                        </span>
                        <span className="font-black text-xs shrink-0">
                          18.000
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Section 4: Barcode & Payment Breakdown */}
                <div className="border-t-2 border-black pt-2">
                  <div className="text-center font-mono font-black text-xs tracking-widest">
                    |||| | ||||| || ||||||||| | |||
                  </div>
                  <div className="text-center text-[8px] font-mono text-slate-600 mb-2">
                    AS-260828-042
                  </div>

                  <div className="space-y-1 text-[9.5px]">
                    <div className="flex justify-between">
                      <span className="text-slate-700">Subtotal:</span>
                      <span className="font-bold">45.000</span>
                    </div>
                    <div className="flex justify-between text-slate-800">
                      <span>Diskon / Promo:</span>
                      <span className="font-bold">-4.500</span>
                    </div>

                    {/* Total Inverted Banner */}
                    <div className="bg-black text-white px-2 py-1 flex justify-between font-black text-xs tracking-wide my-1">
                      <span>TOTAL</span>
                      <span>Rp 40.500</span>
                    </div>

                    <div className="flex justify-between text-[9.5px]">
                      <span>Metode Pembayaran:</span>
                      <span className="font-bold">QRIS (LUNAS)</span>
                    </div>
                  </div>
                </div>

                {/* Section 5: Loyalty Points */}
                <div className="border-t border-dashed border-slate-400 py-1 text-center text-[9px]">
                  <span className="font-black text-black">POIN DIPEROLEH: +4 POIN</span>
                  <div className="text-[8px] text-slate-600">TOTAL POIN MEMBER: 34 POIN</div>
                </div>

                {/* Section 6: Promo Loyalty Card (CGV Style) */}
                <div className="border-2 border-black p-1.5 text-center bg-slate-50 my-1">
                  <div className="font-black text-[9.5px] tracking-wide uppercase">
                    GRATIS VOUCHER & CASHBACK
                  </div>
                  <div className="text-[8px] font-bold text-slate-700 mt-0.5">
                    DENGAN JOIN MEMBER ARUM SEDUH
                  </div>
                  <div className="text-[7px] font-bold text-slate-500 mt-0.5 uppercase">
                    KUMPULKAN POIN DI SETIAP KUNJUNGAN
                  </div>
                </div>

                {/* Wi-Fi Info */}
                {form.showWifi && form.wifiSsid && (
                  <div className="text-center text-[8.5px] text-slate-700 py-1 border-t border-dashed border-slate-400">
                    Wi-Fi: <span className="font-black">{form.wifiSsid}</span> | Pass: <span className="font-bold">{form.wifiPassword || '-'}</span>
                  </div>
                )}

                {/* Footer Notes & Sosmed */}
                <div className="text-center text-[8.5px] text-slate-600 space-y-0.5 pt-1">
                  {form.footerNotes && (
                    <p className="whitespace-pre-line font-medium leading-tight">{form.footerNotes}</p>
                  )}
                  {form.showSocial && form.instagram && (
                    <p className="font-black text-black mt-0.5">
                      IG: {form.instagram}
                    </p>
                  )}
                  {form.showSocial && form.tiktok && (
                    <p className="font-black text-black text-[8px]">
                      TikTok: {form.tiktok}
                    </p>
                  )}
                  <p className="text-[7.5px] text-slate-400 pt-1">*** TERIMA KASIH • SELAMAT MENIKMATI ***</p>
                </div>
              </div>
            </div>

            <div className="p-4 bg-orange-50/80 rounded-xl border border-orange-200 text-xs text-orange-800 flex items-start gap-2.5">
              <Sparkles className="w-4 h-4 text-orange-600 shrink-0 mt-0.5" />
              <p className="leading-relaxed">
                Tampilan preview ini akan langsung menyesuaikan secara real-time dengan teks dan logo yang Anda masukkan di sebelah kiri.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* 58mm Thermal Receipt Test Modal (Algoo AT-5805) */}
      <ThermalReceiptModal
        isOpen={showTestModal}
        onClose={() => setShowTestModal(false)}
        order={sampleOrder}
        customSettings={form}
      />
    </div>
  );
}
