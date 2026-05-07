'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Upload, CheckCircle, MessageCircle, Loader2, X,
  QrCode, Banknote, Building2, CreditCard, Copy, Check
} from 'lucide-react';

interface BankAccount {
  id: string;
  bankName: string;
  bankLogo: string | null;
  accountNumber: string;
  accountName: string;
}

interface PaymentConfig {
  cod: { enabled: boolean; whatsapp: string };
  qris: { enabled: boolean; image: string | null; label: string };
  transfer: { enabled: boolean; banks: BankAccount[] };
}

interface PaymentUploadProps {
  orderTotal: number;
  customerName: string;
  onProofUploaded: (url: string) => void;
  onPaymentMethodChange: (method: string) => void;
  selectedMethod: string;
}

const formatRupiah = (n: number) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(n);

export function PaymentUpload({ orderTotal, customerName, onProofUploaded, onPaymentMethodChange, selectedMethod }: PaymentUploadProps) {
  const [config, setConfig] = useState<PaymentConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [preview, setPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploaded, setUploaded] = useState(false);
  const [copiedBank, setCopiedBank] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch('/api/payment-methods')
      .then(r => r.json())
      .then(data => {
        setConfig(data);
        // Auto-select first available method
        if (!selectedMethod) {
          if (data.transfer?.enabled) onPaymentMethodChange('TRANSFER');
          else if (data.qris?.enabled) onPaymentMethodChange('QRIS');
          else if (data.cod?.enabled) onPaymentMethodChange('COD');
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleCopyAccount = (accountNumber: string, bankId: string) => {
    navigator.clipboard.writeText(accountNumber);
    setCopiedBank(bankId);
    setTimeout(() => setCopiedBank(null), 2000);
  };

  const handleWhatsAppCOD = () => {
    const phone = config?.cod?.whatsapp || '6281234567890';
    const message = encodeURIComponent(
      `Halo Matchaboy! 🍵\n\nSaya ingin memesan dengan COD:\n` +
      `Nama: ${customerName}\n` +
      `Total: ${formatRupiah(orderTotal)}\n` +
      `Metode: Bayar di Tempat (COD)\n\n` +
      `Mohon dikonfirmasi 🙏`
    );
    window.open(`https://wa.me/${phone}?text=${message}`, '_blank');
  };

  const handleWhatsAppConfirm = () => {
    const phone = config?.cod?.whatsapp || '6281234567890';
    const message = encodeURIComponent(
      `Halo Matchaboy! 🍵\n\nSaya sudah melakukan pembayaran:\n` +
      `Nama: ${customerName}\n` +
      `Total: ${formatRupiah(orderTotal)}\n` +
      `Metode: ${selectedMethod === 'QRIS' ? 'QRIS' : 'Transfer Bank'}\n\n` +
      `Bukti pembayaran sudah saya upload di aplikasi. Mohon dikonfirmasi 🙏`
    );
    window.open(`https://wa.me/${phone}?text=${message}`, '_blank');
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (ev) => setPreview(ev.target?.result as string);
    reader.readAsDataURL(file);

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('type', 'payment-proof');

      const res = await fetch('/api/admin/upload', {
        method: 'POST',
        body: formData,
      });

      if (res.ok) {
        const data = await res.json();
        onProofUploaded(data.url);
        setUploaded(true);
      }
    } catch {
      onProofUploaded('pending-review');
      setUploaded(true);
    } finally {
      setUploading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
      </div>
    );
  }

  const methods = [
    ...(config?.transfer?.enabled ? [{ key: 'TRANSFER', label: 'Transfer Bank', icon: Building2, color: 'blue' }] : []),
    ...(config?.qris?.enabled ? [{ key: 'QRIS', label: config?.qris?.label || 'QRIS', icon: QrCode, color: 'purple' }] : []),
    ...(config?.cod?.enabled ? [{ key: 'COD', label: 'Bayar di Tempat', icon: Banknote, color: 'green' }] : []),
  ];

  return (
    <div className="space-y-4">
      {/* Method Selection Tabs */}
      <div className="grid grid-cols-3 gap-2">
        {methods.map((m) => {
          const isActive = selectedMethod === m.key;
          const colorMap: Record<string, string> = {
            blue: isActive ? 'border-blue-500 bg-blue-50 text-blue-700' : '',
            purple: isActive ? 'border-purple-500 bg-purple-50 text-purple-700' : '',
            green: isActive ? 'border-green-500 bg-green-50 text-green-700' : '',
          };
          return (
            <button
              key={m.key}
              type="button"
              onClick={() => onPaymentMethodChange(m.key)}
              className={`flex flex-col items-center gap-1.5 p-3 rounded-2xl border-2 transition-all active:scale-[0.97]
                ${isActive
                  ? colorMap[m.color]
                  : 'border-gray-200 bg-white text-gray-500 hover:border-gray-300'
                }`}
            >
              <m.icon className="w-5 h-5" />
              <span className="text-[11px] font-semibold leading-tight text-center">{m.label}</span>
            </button>
          );
        })}
      </div>

      {/* COD Panel */}
      <AnimatePresence mode="wait">
        {selectedMethod === 'COD' && (
          <motion.div
            key="cod"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="space-y-3 overflow-hidden"
          >
            <div className="p-4 rounded-2xl bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200">
              <h4 className="text-sm font-bold text-green-800 mb-2 flex items-center gap-1.5">
                <Banknote className="w-4 h-4" /> Bayar di Tempat (COD)
              </h4>
              <p className="text-[13px] text-green-700 leading-relaxed mb-3">
                Bayar langsung saat mengambil pesanan. Konfirmasi pesanan via WhatsApp admin untuk memproses.
              </p>
              <p className="font-bold text-green-900 text-base">
                Total: {formatRupiah(orderTotal)}
              </p>
            </div>
            <button
              type="button"
              onClick={handleWhatsAppCOD}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl bg-green-500 text-white font-semibold text-sm
                hover:bg-green-600 transition-colors active:scale-[0.98]"
            >
              <MessageCircle className="w-4 h-4" />
              Konfirmasi via WhatsApp
            </button>
          </motion.div>
        )}

        {/* Transfer Panel */}
        {selectedMethod === 'TRANSFER' && (
          <motion.div
            key="transfer"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="space-y-3 overflow-hidden"
          >
            <div className="p-4 rounded-2xl bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200">
              <h4 className="text-sm font-bold text-blue-800 mb-3 flex items-center gap-1.5">
                <Building2 className="w-4 h-4" /> Transfer Bank
              </h4>

              {/* Bank accounts list */}
              <div className="space-y-2.5">
                {config?.transfer?.banks.map((bank) => (
                  <div key={bank.id} className="flex items-center gap-3 p-3 rounded-xl bg-white/80 border border-blue-100">
                    <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center shrink-0 overflow-hidden">
                      {bank.bankLogo ? (
                        <img src={bank.bankLogo} alt={bank.bankName} className="w-8 h-8 object-contain" />
                      ) : (
                        <Building2 className="w-5 h-5 text-blue-400" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-blue-900">{bank.bankName}</p>
                      <p className="text-sm font-mono font-bold text-blue-700">{bank.accountNumber}</p>
                      <p className="text-[11px] text-blue-500">a.n. {bank.accountName}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleCopyAccount(bank.accountNumber, bank.id)}
                      className="p-2 rounded-lg bg-blue-100 text-blue-600 hover:bg-blue-200 transition-colors"
                    >
                      {copiedBank === bank.id ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>
                ))}
              </div>

              <p className="font-bold text-blue-900 text-base mt-3">
                Total: {formatRupiah(orderTotal)}
              </p>
            </div>

            {/* Upload proof */}
            <div>
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 block">
                Upload Bukti Pembayaran
              </label>
              <input ref={fileRef} type="file" accept="image/*" onChange={handleFileSelect} className="hidden" />

              {!preview ? (
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  className="w-full py-8 border-2 border-dashed border-gray-300 rounded-2xl flex flex-col items-center gap-2
                    hover:border-[#18442D]/40 hover:bg-[#18442D]/5 transition-all active:scale-[0.98]"
                >
                  <Upload className="w-8 h-8 text-gray-400" />
                  <p className="text-sm font-medium text-gray-500">Tap untuk upload bukti bayar</p>
                  <p className="text-[10px] text-gray-400">JPG, PNG, atau screenshot</p>
                </button>
              ) : (
                <div className="relative rounded-2xl overflow-hidden border border-gray-200">
                  <img src={preview} alt="Bukti bayar" className="w-full h-48 object-cover" />
                  {uploading && (
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                      <Loader2 className="w-8 h-8 text-white animate-spin" />
                    </div>
                  )}
                  {uploaded && (
                    <div className="absolute top-3 right-3 bg-green-500 text-white px-3 py-1 rounded-full text-[11px] font-bold flex items-center gap-1">
                      <CheckCircle className="w-3 h-3" /> Uploaded
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={() => { setPreview(null); setUploaded(false); }}
                    className="absolute top-3 left-3 w-8 h-8 bg-white/80 backdrop-blur-sm rounded-full flex items-center justify-center"
                  >
                    <X className="w-4 h-4 text-gray-600" />
                  </button>
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={handleWhatsAppConfirm}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl bg-green-500 text-white font-semibold text-sm
                hover:bg-green-600 transition-colors active:scale-[0.98]"
            >
              <MessageCircle className="w-4 h-4" />
              Konfirmasi via WhatsApp
            </button>
          </motion.div>
        )}

        {/* QRIS Panel */}
        {selectedMethod === 'QRIS' && (
          <motion.div
            key="qris"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="space-y-3 overflow-hidden"
          >
            <div className="p-4 rounded-2xl bg-gradient-to-br from-purple-50 to-violet-50 border border-purple-200 text-center">
              <h4 className="text-sm font-bold text-purple-800 mb-3 flex items-center justify-center gap-1.5">
                <QrCode className="w-4 h-4" /> {config?.qris?.label || 'QRIS'}
              </h4>

              {config?.qris?.image ? (
                <div className="mx-auto w-64 h-64 rounded-2xl border-2 border-purple-200 bg-white p-2 mb-3">
                  <img src={config.qris.image} alt="QRIS" className="w-full max-w-[200px] h-auto rounded-xl shadow-sm border border-gray-100" />
                </div>
              ) : (
                <div className="mx-auto w-64 h-64 rounded-2xl border-2 border-dashed border-purple-300 bg-purple-50 flex flex-col items-center justify-center mb-3">
                  <QrCode className="w-16 h-16 text-purple-300 mb-2" />
                  <p className="text-xs text-purple-400">QRIS belum dikonfigurasi</p>
                </div>
              )}

              <p className="font-bold text-purple-900 text-base">
                Total: {formatRupiah(orderTotal)}
              </p>
              <p className="text-[11px] text-purple-600 mt-1">Scan QR di atas untuk melakukan pembayaran</p>
            </div>

            {/* Upload proof */}
            <div>
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 block">
                Upload Bukti Pembayaran
              </label>
              <input ref={fileRef} type="file" accept="image/*" onChange={handleFileSelect} className="hidden" />

              {!preview ? (
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  className="w-full py-6 border-2 border-dashed border-gray-300 rounded-2xl flex flex-col items-center gap-2
                    hover:border-purple-400 hover:bg-purple-50/50 transition-all active:scale-[0.98]"
                >
                  <Upload className="w-6 h-6 text-gray-400" />
                  <p className="text-sm font-medium text-gray-500">Upload bukti bayar QRIS</p>
                </button>
              ) : (
                <div className="relative rounded-2xl overflow-hidden border border-gray-200">
                  <img src={preview} alt="Bukti bayar" className="w-full h-40 object-cover" />
                  {uploading && (
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                      <Loader2 className="w-8 h-8 text-white animate-spin" />
                    </div>
                  )}
                  {uploaded && (
                    <div className="absolute top-3 right-3 bg-green-500 text-white px-3 py-1 rounded-full text-[11px] font-bold flex items-center gap-1">
                      <CheckCircle className="w-3 h-3" /> Uploaded
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={() => { setPreview(null); setUploaded(false); }}
                    className="absolute top-3 left-3 w-8 h-8 bg-white/80 backdrop-blur-sm rounded-full flex items-center justify-center"
                  >
                    <X className="w-4 h-4 text-gray-600" />
                  </button>
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={handleWhatsAppConfirm}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl bg-green-500 text-white font-semibold text-sm
                hover:bg-green-600 transition-colors active:scale-[0.98]"
            >
              <MessageCircle className="w-4 h-4" />
              Konfirmasi via WhatsApp
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
