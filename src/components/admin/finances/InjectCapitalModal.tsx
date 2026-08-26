'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Coins,
  Banknote,
  QrCode,
  Save,
  Loader2,
  Calendar,
  FileText,
  TrendingUp,
  TrendingDown,
  Sparkles,
  Info,
} from 'lucide-react';
import { formatRupiah } from '@/lib/utils';
import { useToast } from '@/components/ui/Toast';

export interface CapitalInjectionItem {
  id: string;
  name: string;
  amount: number;
  paymentMethod: 'CASH' | 'QRIS';
  category: string;
  notes?: string | null;
  date: string | Date;
  createdBy?: { name: string | null } | null;
}

interface InjectCapitalModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  initialData?: CapitalInjectionItem | null;
}

const CATEGORY_OPTIONS = [
  { value: 'CAPITAL_INJECTION', label: 'Suntikan Modal Tambahan' },
  { value: 'INITIAL_BALANCE', label: 'Modal Awal Kas / Rekening' },
  { value: 'OWNER_LOAN', label: 'Talangan Owner / Pinjaman Modal' },
  { value: 'ADJUSTMENT', label: 'Penyesuaian / Koreksi Saldo' },
  { value: 'WITHDRAWAL', label: 'Penarikan Modal / Prive Owner' },
];

const PRESETS = [
  'Suntik Kas Operasional',
  'Talangan Belanja Bahan Baku',
  'Tambahan Modal Kasir Weekend',
  'Setor Kas Fisik ke Rekening QRIS',
  'Koreksi Selisih Saldo Kas',
];

export function InjectCapitalModal({
  isOpen,
  onClose,
  onSuccess,
  initialData,
}: InjectCapitalModalProps) {
  const { showToast } = useToast();
  const [saving, setSaving] = useState(false);

  const [isWithdrawal, setIsWithdrawal] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'QRIS'>('CASH');
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('CAPITAL_INJECTION');
  const [notes, setNotes] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);

  useEffect(() => {
    if (initialData) {
      const isNegative = initialData.amount < 0;
      setIsWithdrawal(isNegative || initialData.category === 'WITHDRAWAL');
      setPaymentMethod(initialData.paymentMethod);
      setName(initialData.name);
      setAmount(Math.abs(initialData.amount).toString());
      setCategory(initialData.category);
      setNotes(initialData.notes || '');
      setDate(new Date(initialData.date).toISOString().split('T')[0]);
    } else {
      setIsWithdrawal(false);
      setPaymentMethod('CASH');
      setName('');
      setAmount('');
      setCategory('CAPITAL_INJECTION');
      setNotes('');
      setDate(new Date().toISOString().split('T')[0]);
    }
  }, [initialData, isOpen]);

  const numericAmount = parseFloat(amount.replace(/[^0-9]/g, '')) || 0;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      return showToast('Nama atau keterangan transaksi wajib diisi', 'error');
    }
    if (numericAmount <= 0) {
      return showToast('Nominal harus lebih besar dari Rp 0', 'error');
    }

    setSaving(true);
    try {
      const finalAmount = isWithdrawal ? -numericAmount : numericAmount;
      const url = initialData
        ? `/api/admin/capital-injections/${initialData.id}`
        : '/api/admin/capital-injections';

      const method = initialData ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          amount: finalAmount,
          paymentMethod,
          category: isWithdrawal ? 'WITHDRAWAL' : category,
          notes: notes.trim() || null,
          date,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Gagal menyimpan');
      }

      showToast(
        isWithdrawal
          ? 'Penarikan dana berhasil dicatat'
          : 'Suntik dana modal berhasil ditambahkan!',
        'success'
      );
      onSuccess();
      onClose();
    } catch (err: any) {
      showToast(err.message || 'Gagal menyimpan transaksi', 'error');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[95] flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/65 backdrop-blur-sm"
          onClick={onClose}
        />

        {/* Modal Window */}
        <motion.div
          initial={{ scale: 0.95, opacity: 0, y: 15 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 15 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-stone-200 overflow-hidden z-10 flex flex-col max-h-[92vh]"
        >
          {/* Header */}
          <div className="p-5 border-b border-stone-100 flex items-center justify-between bg-gradient-to-r from-stone-50 to-amber-50/50">
            <div className="flex items-center gap-3 text-left">
              <div
                className={`w-10 h-10 rounded-2xl flex items-center justify-center shadow-inner ${
                  isWithdrawal
                    ? 'bg-rose-100 text-rose-700'
                    : 'bg-emerald-100 text-emerald-700'
                }`}
              >
                {isWithdrawal ? <TrendingDown className="w-5 h-5" /> : <TrendingUp className="w-5 h-5" />}
              </div>
              <div>
                <h3 className="font-heading font-bold text-base text-stone-900 line-clamp-1">
                  {initialData
                    ? 'Edit Transaksi Modal'
                    : isWithdrawal
                    ? 'Tarik Dana / Prive Owner'
                    : 'Suntik Dana / Tambah Modal'}
                </h3>
                <p className="text-xs text-stone-500">
                  {isWithdrawal
                    ? 'Mengurangi saldo kas fisik atau saldo rekening QRIS'
                    : 'Menambah saldo kas fisik di laci atau saldo rekening QRIS'}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-5 space-y-4 text-left">
            {/* 1. Mode Switcher: Suntik Masuk vs Tarik Keluar */}
            <div className="grid grid-cols-2 gap-2 bg-stone-100 p-1 rounded-2xl border border-stone-200/80">
              <button
                type="button"
                onClick={() => {
                  setIsWithdrawal(false);
                  if (category === 'WITHDRAWAL') setCategory('CAPITAL_INJECTION');
                }}
                className={`py-2 px-3 rounded-xl text-xs font-extrabold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                  !isWithdrawal
                    ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                <TrendingUp className="w-3.5 h-3.5" />
                <span>+ Suntik / Tambah Modal</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setIsWithdrawal(true);
                  setCategory('WITHDRAWAL');
                }}
                className={`py-2 px-3 rounded-xl text-xs font-extrabold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                  isWithdrawal
                    ? 'bg-rose-600 text-white shadow-md shadow-rose-600/20'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                <TrendingDown className="w-3.5 h-3.5" />
                <span>- Tarik Dana / Prive</span>
              </button>
            </div>

            {/* 2. Target Saldo (Cash vs QRIS) */}
            <div>
              <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1.5">
                Target Saldo Rekening / Kas
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setPaymentMethod('CASH')}
                  className={`p-3 rounded-2xl border text-left flex items-center gap-3 transition-all cursor-pointer ${
                    paymentMethod === 'CASH'
                      ? 'border-amber-500 bg-amber-50/80 ring-2 ring-amber-500/20'
                      : 'border-stone-200 bg-white hover:border-stone-300'
                  }`}
                >
                  <div
                    className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                      paymentMethod === 'CASH'
                        ? 'bg-amber-500 text-white'
                        : 'bg-stone-100 text-stone-600'
                    }`}
                  >
                    <Banknote className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-xs font-extrabold text-stone-900">Uang Tunai (Cash)</p>
                    <p className="text-[10px] text-stone-500 font-medium">Fisik di Laci Kasir</p>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setPaymentMethod('QRIS')}
                  className={`p-3 rounded-2xl border text-left flex items-center gap-3 transition-all cursor-pointer ${
                    paymentMethod === 'QRIS'
                      ? 'border-sky-500 bg-sky-50/80 ring-2 ring-sky-500/20'
                      : 'border-stone-200 bg-white hover:border-stone-300'
                  }`}
                >
                  <div
                    className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                      paymentMethod === 'QRIS'
                        ? 'bg-sky-500 text-white'
                        : 'bg-stone-100 text-stone-600'
                    }`}
                  >
                    <QrCode className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-xs font-extrabold text-stone-900">Saldo QRIS</p>
                    <p className="text-[10px] text-stone-500 font-medium">Rekening Bank Toko</p>
                  </div>
                </button>
              </div>
            </div>

            {/* 3. Nominal Input */}
            <div>
              <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1.5">
                Nominal Transaksi (Rp) <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-black text-stone-400">
                  Rp
                </span>
                <input
                  type="number"
                  required
                  min="1000"
                  step="1000"
                  placeholder="Contoh: 500000"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-stone-200 text-sm font-black text-stone-900 focus:ring-2 focus:ring-orange-500 focus:border-orange-500 bg-stone-50/40"
                />
              </div>
              {numericAmount > 0 && (
                <p className="text-xs font-extrabold text-orange-600 mt-1">
                  {isWithdrawal ? '- ' : '+ '} {formatRupiah(numericAmount)}
                </p>
              )}
            </div>

            {/* 4. Nama / Judul Transaksi */}
            <div>
              <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1.5">
                Nama / Keterangan Singkat <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="Contoh: Suntik Kas Operasional Weekend"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 text-xs font-bold text-stone-900 focus:ring-2 focus:ring-orange-500 bg-stone-50/40"
              />

              {/* Quick Preset Buttons */}
              <div className="flex items-center gap-1.5 flex-wrap mt-2">
                <span className="text-[10px] text-stone-400 font-bold flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-amber-500" /> Contoh:
                </span>
                {PRESETS.map((p, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setName(p)}
                    className="px-2 py-0.5 rounded-lg bg-stone-100 hover:bg-orange-50 hover:text-orange-700 text-[10px] font-bold text-stone-600 transition-colors cursor-pointer"
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>

            {/* 5. Kategori & Tanggal */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1.5">
                  Kategori
                </label>
                <select
                  value={category}
                  disabled={isWithdrawal}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-stone-200 text-xs font-bold bg-stone-50/40 text-stone-900 focus:ring-2 focus:ring-orange-500"
                >
                  {CATEGORY_OPTIONS.map((c) => (
                    <option key={c.value} value={c.value}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-stone-400" /> Tanggal
                </label>
                <input
                  type="date"
                  required
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-stone-200 text-xs font-bold bg-stone-50/40 text-stone-900 focus:ring-2 focus:ring-orange-500"
                />
              </div>
            </div>

            {/* 6. Catatan Tambahan */}
            <div>
              <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                <FileText className="w-3.5 h-3.5 text-stone-400" /> Catatan Tambahan (Opsional)
              </label>
              <textarea
                rows={2}
                placeholder="Catatan nomor referensi transfer, alasan talangan, dll..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl border border-stone-200 text-xs font-medium text-stone-800 bg-stone-50/40 focus:ring-2 focus:ring-orange-500"
              />
            </div>

            {/* Informational Callout */}
            <div className="p-3 rounded-2xl bg-amber-50 border border-amber-200/80 text-[11px] text-amber-900 flex items-start gap-2">
              <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <span>
                Transaksi ini akan langsung tercatat di <strong>Buku Kas & Mutasi Keuangan</strong> dan otomatis menambah atau mengurangi saldo riil toko.
              </span>
            </div>

            {/* Footer Buttons */}
            <div className="pt-2 border-t border-stone-100 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={onClose}
                disabled={saving}
                className="px-4 py-2.5 rounded-xl border border-stone-200 text-stone-600 font-bold text-xs hover:bg-stone-100 transition-colors cursor-pointer"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={saving || numericAmount <= 0}
                className={`px-5 py-2.5 rounded-xl text-white font-extrabold text-xs shadow-md transition-all flex items-center gap-1.5 cursor-pointer ${
                  isWithdrawal
                    ? 'bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-700 hover:to-red-700 shadow-rose-600/20'
                    : 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 shadow-emerald-600/20'
                }`}
              >
                {saving ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Menyimpan...
                  </>
                ) : (
                  <>
                    <Save className="w-3.5 h-3.5" />
                    {initialData
                      ? 'Simpan Perubahan'
                      : isWithdrawal
                      ? 'Simpan Penarikan Dana'
                      : 'Simpan Suntik Modal'}
                  </>
                )}
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
