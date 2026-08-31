'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { formatRupiah } from '@/lib/utils';
import { QRCodeCanvas } from 'qrcode.react';
import {
  ChevronRight,
  ChevronDown,
  Copy,
  Check,
  Wallet,
  Loader2,
  CreditCard,
  Sparkles,
  X,
  QrCode,
  Building2,
  Store,
  Upload,
} from 'lucide-react';

export interface TopUpOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  refreshWallet?: () => void;
  showToast?: (msg: string, type: 'success' | 'error') => void;
}

export function TopUpOverlay({
  isOpen,
  onClose,
  refreshWallet,
  showToast = () => {},
}: TopUpOverlayProps) {
  const [amount, setAmount] = useState('');
  const [step, setStep] = useState<'select' | 'payment'>('select');
  const [payMethod, setPayMethod] = useState<'bank' | 'qris' | 'offline'>('qris');
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [activeTransaction, setActiveTransaction] = useState<any>(null);
  const [checkingStatus, setCheckingStatus] = useState(false);
  const [simulating, setSimulating] = useState(false);
  const [isFirstTime, setIsFirstTime] = useState<boolean>(false);

  // Upload and confirmation states for top-up
  const [preview, setPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploaded, setUploaded] = useState(false);
  const [paymentProofUrl, setPaymentProofUrl] = useState<string | null>(null);
  const [submittingProof, setSubmittingProof] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // Dynamic configurations from database
  const [banks, setBanks] = useState<any[]>([]);
  const [walletSettings, setWalletSettings] = useState<any>({
    minTopUp: 10000,
    bonusMinAmount: 100000,
    bonusPercent: 10,
    topUpEnabled: true,
    bonusMode: 'BOTH',
    firstTimePromoEnabled: true,
    firstTimePromoPackages: [],
  });

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
        setPaymentProofUrl(data.url);
        setUploaded(true);
      } else {
        throw new Error('Gagal unggah');
      }
    } catch {
      showToast('Gagal mengunggah bukti pembayaran. Silakan coba lagi.', 'error');
      setPreview(null);
      setUploaded(false);
      setPaymentProofUrl(null);
    } finally {
      setUploading(false);
    }
  };

  const handleSubmitProof = async () => {
    if (!activeTransaction || !paymentProofUrl) return;
    setSubmittingProof(true);
    try {
      const res = await fetch('/api/user/wallet', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transactionId: activeTransaction.id, paymentProofUrl }),
      });

      if (res.ok) {
        showToast(
          'Bukti pembayaran berhasil diunggah! Saldo akan masuk setelah kasir memverifikasi.',
          'success'
        );
        onClose();
        setAmount('');
        setActiveTransaction(null);
        setPreview(null);
        setUploaded(false);
        setPaymentProofUrl(null);
        if (refreshWallet) refreshWallet();
      } else {
        const d = await res.json();
        showToast(d.error || 'Gagal mengirim bukti pembayaran.', 'error');
      }
    } catch {
      showToast('Terjadi kesalahan jaringan.', 'error');
    } finally {
      setSubmittingProof(false);
    }
  };

  const handleDownloadQr = () => {
    try {
      showToast('Mengunduh QRIS...', 'success');
      const canvas = document.getElementById('topup-qris-canvas') as HTMLCanvasElement;
      if (!canvas) {
        throw new Error('Canvas not found');
      }
      const url = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.href = url;
      link.download = `QRIS_TOPUP_${activeTransaction?.paymentCode || 'ARUSPAY'}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('Gagal mengunduh QRIS:', error);
      showToast('Gagal mengunduh QRIS.', 'error');
    }
  };

  useEffect(() => {
    if (isOpen) {
      setStep('select');
      setAmount('');
      setActiveTransaction(null);
      setPreview(null);
      setUploaded(false);
      setPaymentProofUrl(null);

      // Fetch dynamic settings and bank details
      fetch('/api/user/wallet')
        .then((res) => res.json())
        .then((data) => {
          if (data) {
            setBanks(data.banks || []);
            setIsFirstTime(!!data.isFirstTime);
            setWalletSettings(
              data.settings || {
                minTopUp: 10000,
                bonusMinAmount: 100000,
                bonusPercent: 10,
                topUpEnabled: true,
                bonusMode: 'BOTH',
                firstTimePromoEnabled: true,
                firstTimePromoPackages: [],
              }
            );
            if (data.settings?.minTopUp) {
              setAmount(String(data.settings.minTopUp));
            }
          }
        })
        .catch((err) => console.error('Error fetching wallet settings:', err));
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const minAmt = walletSettings?.minTopUp ?? 10000;
  const bonusAmt = walletSettings?.bonusMinAmount ?? 100000;
  const presets = [
    minAmt,
    Math.max(minAmt * 2, 50000),
    bonusAmt,
    bonusAmt * 2,
  ];

  const handleNextStep = async (val?: number) => {
    const finalAmount = val || parseInt(amount);
    if (!finalAmount || isNaN(finalAmount) || finalAmount < minAmt) {
      showToast(`Masukkan jumlah top up minimal ${formatRupiah(minAmt)}`, 'error');
      return;
    }
    setAmount(String(finalAmount));
    setLoading(true);
    try {
      const res = await fetch('/api/user/wallet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: finalAmount, paymentMethod: payMethod }),
      });
      const d = await res.json();
      if (res.ok && d.success && d.transaction) {
        if (payMethod === 'qris' && d.transaction.paymentUrl) {
          window.location.href = d.transaction.paymentUrl;
          return;
        }
        setActiveTransaction(d.transaction);
        setStep('payment');
      } else {
        showToast(d.error || 'Gagal memulai transaksi top up', 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('Gagal terhubung ke server', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleCheckStatus = async () => {
    if (!activeTransaction) return;
    setCheckingStatus(true);
    try {
      const res = await fetch(`/api/user/wallet?transactionId=${activeTransaction.id}`);
      const d = await res.json();
      if (res.ok && d.success) {
        if (d.status === 'COMPLETED') {
          showToast(`Top Up berhasil! Saldo Anda bertambah sebesar ${formatRupiah(d.amount)}`, 'success');
          if (refreshWallet) refreshWallet();
          onClose();
          setAmount('');
          setActiveTransaction(null);
        } else {
          showToast('Pembayaran Anda belum terkonfirmasi oleh sistem/kasir.', 'error');
        }
      } else {
        showToast(d.error || 'Gagal memeriksa status pembayaran', 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('Gagal memeriksa status pembayaran', 'error');
    } finally {
      setCheckingStatus(false);
    }
  };

  const handleSimulatePayment = async () => {
    if (!activeTransaction) return;
    setSimulating(true);
    try {
      const res = await fetch('/api/admin/wallet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transactionId: activeTransaction.id, action: 'approve' }),
      });
      const d = await res.json();
      if (res.ok && d.success) {
        showToast(
          `[Sandbox] Pembayaran berhasil disimulasikan! Saldo Anda bertambah sebesar ${formatRupiah(
            activeTransaction.amount
          )}`,
          'success'
        );
        if (refreshWallet) refreshWallet();
        onClose();
        setAmount('');
        setActiveTransaction(null);
      } else {
        showToast(d.error || 'Gagal mensimulasikan pembayaran', 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('Koneksi terputus, coba lagi nanti', 'error');
    } finally {
      setSimulating(false);
    }
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="bg-white rounded-[2.5rem] w-full max-w-md overflow-hidden shadow-2xl flex flex-col border border-amber-100"
        >
          {/* Header */}
          <div className="p-6 bg-gradient-to-tr from-amber-600 via-orange-500 to-amber-700 text-white flex justify-between items-center relative">
            <div className="space-y-0.5">
              <span className="text-[9px] text-amber-200 font-black uppercase tracking-widest bg-white/10 px-2 py-0.5 rounded-full inline-flex items-center gap-1">
                <Sparkles className="w-2.5 h-2.5" /> Arus Pay <Sparkles className="w-2.5 h-2.5" />
              </span>
              <h3 className="font-serif font-black text-xl text-white tracking-tight mt-1 flex items-center gap-2">
                <Wallet className="w-5 h-5 text-amber-200" />
                {step === 'select' ? 'Top Up Arus Pay' : 'Petunjuk Pembayaran'}
              </h3>
            </div>
            <button
              onClick={onClose}
              className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 border border-white/15 flex items-center justify-center text-white text-sm font-bold active:scale-95 transition-all cursor-pointer"
              aria-label="Tutup"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {step === 'select' ? (
            /* STEP 1: SELECT NOMINAL */
            <div className="p-6 space-y-6 text-left">
              {isFirstTime &&
              (walletSettings?.bonusMode === 'FIRST_TIME' || walletSettings?.bonusMode === 'BOTH') &&
              walletSettings?.firstTimePromoEnabled &&
              walletSettings?.firstTimePromoPackages?.length > 0 ? (
                /* FIRST TIME PROMO LAYOUT */
                <div className="space-y-4">
                  <div className="bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/30 rounded-2xl p-4 flex gap-3 text-gray-800 shadow-sm relative overflow-hidden">
                    <div className="absolute right-0 top-0 text-5xl opacity-10 pointer-events-none select-none">
                      🎁
                    </div>
                    <span className="text-xl">🎉</span>
                    <div className="space-y-0.5">
                      <p className="text-xs font-black text-orange-700">Promo Pengisian Pertama Kali!</p>
                      <p className="text-[10px] text-gray-600 font-semibold leading-tight">
                        Dapatkan bonus saldo langsung yang melimpah khusus untuk transaksi top-up pertama Anda di bawah ini!
                      </p>
                    </div>
                  </div>

                  {/* Promo Packages Cards */}
                  <div className="space-y-2">
                    <span className="text-[10px] font-black text-gray-500 uppercase tracking-wider block">
                      Pilih Paket Promo
                    </span>
                    <div className="grid grid-cols-1 gap-3">
                      {walletSettings.firstTimePromoPackages.map((pkg: any, idx: number) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => handleNextStep(pkg.amount)}
                          className="relative p-4 bg-gradient-to-br from-white to-amber-50/40 hover:to-orange-50/30 border-2 border-amber-200 hover:border-orange-500 text-gray-800 text-xs font-black rounded-2xl transition-all cursor-pointer text-left outline-none flex items-center justify-between shadow-sm active:scale-[0.99]"
                        >
                          <div className="space-y-1">
                            <span className="text-sm font-black text-gray-900 block">
                              {formatRupiah(pkg.amount)}
                            </span>
                            <span className="text-[10px] text-orange-600 font-extrabold bg-orange-50 border border-orange-200 px-2 py-0.5 rounded-lg">
                              Bonus Ekstra +{formatRupiah(pkg.bonus)} Saldo
                            </span>
                          </div>
                          <div className="text-right">
                            <span className="text-[9px] text-gray-400 uppercase font-black tracking-wider block">
                              Total Diterima
                            </span>
                            <span className="text-base font-black text-orange-600">
                              {formatRupiah(pkg.amount + pkg.bonus)}
                            </span>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Accordion to custom amount */}
                  <div className="border-t border-gray-100 pt-3">
                    <details className="group">
                      <summary className="text-[10.5px] font-extrabold text-gray-500 hover:text-orange-600 cursor-pointer list-none flex items-center justify-between">
                        <span>Atau isi nominal kustom lainnya (Kembali ke rate normal)</span>
                        <ChevronDown className="w-3.5 h-3.5 transition-transform group-open:rotate-180" />
                      </summary>
                      <div className="space-y-4 mt-4">
                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-gray-500 uppercase tracking-wider block">
                            Masukkan Jumlah Top Up (Rp)
                          </label>
                          <input
                            type="number"
                            placeholder={`Contoh: ${minAmt}`}
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                            className="w-full px-4.5 py-3 rounded-2xl border border-gray-200 outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 text-sm font-bold text-gray-900 bg-gray-50"
                          />
                        </div>
                        <button
                          onClick={() => handleNextStep()}
                          disabled={loading || !walletSettings?.topUpEnabled}
                          className="w-full py-4 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-black text-xs uppercase tracking-wider rounded-2xl shadow-sm transition-all active:scale-[0.98] cursor-pointer flex items-center justify-center gap-1.5"
                        >
                          {loading ? (
                            <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          ) : (
                            <>
                              <span>Lanjutkan dengan Nominal Kustom</span>
                              <ChevronRight className="w-3.5 h-3.5" />
                            </>
                          )}
                        </button>
                      </div>
                    </details>
                  </div>
                </div>
              ) : (
                /* STANDARD SELECT NOMINAL SCREEN */
                <div className="space-y-6">
                  {/* Standard Promo Alert */}
                  {(walletSettings?.bonusMode === 'REGULAR' || walletSettings?.bonusMode === 'BOTH') &&
                    walletSettings?.bonusPercent > 0 && (
                      <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex gap-3 text-gray-800">
                        <span className="text-lg">🔥</span>
                        <div className="space-y-0.5">
                          <p className="text-xs font-black text-orange-600">
                            Bonus Saldo {walletSettings.bonusPercent}%!
                          </p>
                          <p className="text-[10px] text-gray-600 font-semibold leading-tight">
                            Lakukan pengisian saldo minimum {formatRupiah(bonusAmt)} untuk mendapatkan ekstra saldo{' '}
                            {walletSettings.bonusPercent}% cuma-cuma!
                          </p>
                        </div>
                      </div>
                    )}

                  {/* Custom Input */}
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-wider block">
                      Masukkan Jumlah Top Up (Rp)
                    </label>
                    <input
                      type="number"
                      placeholder={`Contoh: ${minAmt}`}
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      className="w-full px-4.5 py-3 rounded-2xl border border-gray-200 outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 text-sm font-bold text-gray-900 bg-gray-50"
                    />
                  </div>

                  {/* Presets */}
                  <div className="space-y-2">
                    <span className="text-[10px] font-black text-gray-500 uppercase tracking-wider block">
                      Pilih Cepat Nominal
                    </span>
                    <div className="grid grid-cols-2 gap-3">
                      {presets.map((val) => (
                        <button
                          key={val}
                          type="button"
                          onClick={() => handleNextStep(val)}
                          className="relative p-3.5 bg-white hover:bg-amber-50/50 border border-gray-200 hover:border-orange-500 text-gray-800 text-xs font-black rounded-2xl transition-all cursor-pointer text-center outline-none"
                        >
                          <span>{formatRupiah(val)}</span>
                          {val >= bonusAmt &&
                            (walletSettings?.bonusMode === 'REGULAR' || walletSettings?.bonusMode === 'BOTH') &&
                            walletSettings?.bonusPercent > 0 && (
                              <span className="absolute -top-2 -right-1 bg-orange-600 text-white text-[7.5px] font-black px-1.5 py-0.5 rounded-full uppercase leading-none shadow-sm scale-95 border border-white">
                                +{walletSettings.bonusPercent}%
                              </span>
                            )}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Next Button */}
                  <button
                    onClick={() => handleNextStep()}
                    disabled={loading || !walletSettings?.topUpEnabled}
                    className="w-full py-4 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-black text-sm tracking-wide rounded-2xl shadow-md transition-all active:scale-[0.98] cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    {loading ? (
                      <>
                        <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span>Memproses...</span>
                      </>
                    ) : !walletSettings?.topUpEnabled ? (
                      <span>Pengisian Dinonaktifkan</span>
                    ) : (
                      <>
                        <span>Lanjutkan ke Pembayaran</span>
                        <ChevronRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          ) : (
            /* STEP 2: PAYMENT METHOD POPUP */
            <div className="p-6 space-y-5 text-left flex flex-col max-h-[70vh] overflow-y-auto scrollbar-hide">
              {/* Back Button & Amount display */}
              <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                <button
                  type="button"
                  onClick={() => setStep('select')}
                  className="px-3 py-1.5 rounded-lg border border-gray-200 text-[10px] font-black uppercase text-gray-600 hover:bg-gray-50 transition-all cursor-pointer"
                >
                  ← Kembali
                </button>
                <div className="text-right">
                  <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest leading-none">
                    Total Tagihan
                  </p>
                  <p className="text-lg font-black text-orange-600 font-serif mt-0.5">
                    {formatRupiah(parseInt(amount))}
                  </p>
                </div>
              </div>

              {/* Payment Methods Tab */}
              <div className="flex border border-gray-100 rounded-2xl p-1 bg-gray-50 gap-1 shrink-0 select-none">
                {[
                  { id: 'qris', label: 'Scan QRIS' },
                  { id: 'bank', label: 'Transfer Bank' },
                  { id: 'offline', label: 'Kasir Booth' },
                ].map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setPayMethod(m.id as any)}
                    className={`flex-1 py-2 text-[10px] font-black uppercase tracking-wider text-center rounded-xl border transition-all cursor-pointer ${
                      payMethod === m.id
                        ? 'bg-gradient-to-r from-orange-500 to-amber-500 border-orange-500 text-white shadow-sm'
                        : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    {m.label}
                  </button>
                ))}
              </div>

              {/* Tab Contents */}
              <div className="flex-1 bg-amber-50/30 border border-amber-100/60 rounded-3xl p-5 flex flex-col items-center justify-center min-h-[220px]">
                {payMethod === 'qris' && (
                  <div className="text-center space-y-4 flex flex-col items-center w-full">
                    {/* Realistic GPN/QRIS Frame */}
                    <div className="w-full border border-gray-100 rounded-3xl p-4.5 bg-white flex flex-col items-center shadow-sm">
                      <div className="w-full flex items-center justify-between border-b border-dashed border-gray-150 pb-2 mb-4 shrink-0 select-none">
                        <span className="text-[18px] font-black italic tracking-tighter text-[#1b4353]">
                          QR<span className="text-[#e26d5c]">IS</span>
                        </span>
                        <span className="text-[8.5px] font-extrabold uppercase tracking-widest text-[#1b4353] bg-gray-50 border border-gray-100 px-2 py-0.5 rounded">
                          GPN Standard
                        </span>
                      </div>

                      {/* QR Code Canvas Frame */}
                      <div className="relative w-44 h-44 bg-white rounded-2xl p-2 border border-gray-100 flex items-center justify-center shadow-inner group">
                        <QRCodeCanvas
                          id="topup-qris-canvas"
                          value={
                            activeTransaction?.paymentQrContent ||
                            `00020101021226570014ID.DOKU.WWW.01189360091234567890120215AS${
                              activeTransaction?.paymentCode || 'TOPUP'
                            }0303UME5204581153033605802ID5910ARUM SEDUH6007JAKARTA61051212362070703A016304ABCD`
                          }
                          size={160}
                          level="M"
                          includeMargin={false}
                          className="object-contain"
                        />
                      </div>

                      {/* Merchant Info */}
                      <div className="text-center mt-3 space-y-0.5 w-full select-none">
                        <p className="text-[9px] text-gray-400 font-extrabold uppercase tracking-wider">
                          Nama Merchant
                        </p>
                        <h4 className="text-sm font-serif font-black text-gray-900 leading-tight">
                          ARUM SEDUH ARUS PAY
                        </h4>
                        <p className="text-[9.5px] text-gray-600 font-mono mt-1 pt-1.5 border-t border-gray-50">
                          Kode Top-Up: <span className="font-bold">{activeTransaction?.paymentCode}</span>
                        </p>
                        <p className="text-base font-black text-amber-600 pt-0.5">
                          {formatRupiah(parseInt(amount))}
                        </p>
                      </div>
                    </div>

                    {/* Download & Screenshot Buttons */}
                    <div className="grid grid-cols-2 gap-2.5 w-full">
                      <button
                        type="button"
                        onClick={handleDownloadQr}
                        className="py-3 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-bold rounded-xl shadow transition-all flex items-center justify-center gap-1.5 active:scale-[0.98] text-[10.5px]"
                      >
                        <span>Unduh QRIS</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          showToast(
                            'Silakan screenshot QRIS untuk membayar via galeri aplikasi bank/e-wallet Anda.',
                            'success'
                          );
                        }}
                        className="py-3 bg-white hover:bg-gray-50 text-gray-700 border border-gray-200 font-bold rounded-xl shadow-sm transition-all flex items-center justify-center gap-1.5 active:scale-[0.98] text-[10.5px]"
                      >
                        <span>Screenshot</span>
                      </button>
                    </div>

                    {/* Proof Uploader Box */}
                    <div className="w-full bg-white border border-gray-100 rounded-3xl p-4.5 space-y-3.5 text-left">
                      <h4 className="text-[10px] font-black uppercase tracking-wider text-gray-400 pl-1">
                        Upload Bukti Pembayaran
                      </h4>
                      <input
                        ref={fileRef}
                        type="file"
                        accept="image/*"
                        onChange={handleFileSelect}
                        className="hidden"
                      />
                      {!preview ? (
                        <button
                          type="button"
                          onClick={() => fileRef.current?.click()}
                          className="w-full py-4 border-2 border-dashed border-amber-200 rounded-xl flex flex-col items-center justify-center gap-1 hover:border-orange-500 hover:bg-orange-50/20 transition-all active:scale-[0.98] select-none text-gray-400"
                        >
                          <Upload className="w-5 h-5 text-amber-500" />
                          <span className="text-xs font-bold text-gray-600">
                            Klik untuk upload struk/bukti bayar
                          </span>
                        </button>
                      ) : (
                        <div className="relative rounded-xl overflow-hidden border border-gray-150">
                          <img src={preview} alt="Struk QRIS" className="w-full h-32 object-cover" />
                          {uploading && (
                            <div className="absolute inset-0 bg-black/40 backdrop-blur-[1px] flex items-center justify-center">
                              <Loader2 className="w-6 h-6 text-white animate-spin" />
                            </div>
                          )}
                          {uploaded && (
                            <div className="absolute top-2.5 right-2.5 bg-green-500 text-white px-2 py-0.5 rounded-full text-[8.5px] font-black uppercase tracking-wider flex items-center gap-1 shadow">
                              <span>Selesai</span>
                            </div>
                          )}
                          <button
                            type="button"
                            disabled={uploading}
                            onClick={() => {
                              setPreview(null);
                              setUploaded(false);
                              setPaymentProofUrl(null);
                            }}
                            className="absolute top-2.5 left-2.5 w-6 h-6 bg-white/95 backdrop-blur-sm rounded-full flex items-center justify-center border border-gray-100 text-gray-500 hover:text-gray-700 shadow-sm"
                          >
                            ✕
                          </button>
                        </div>
                      )}

                      <button
                        type="button"
                        disabled={!uploaded || submittingProof || uploading}
                        onClick={handleSubmitProof}
                        className={`w-full py-3.5 rounded-xl font-bold text-xs tracking-wide shadow transition-all flex items-center justify-center gap-1.5 active:scale-[0.98]
                          ${
                            uploaded && !submittingProof
                              ? 'bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white'
                              : 'bg-gray-100 text-gray-400 border border-gray-200 cursor-not-allowed'
                          }`}
                      >
                        {submittingProof ? 'Mengirim...' : 'Konfirmasi Saya Sudah Bayar'}
                      </button>
                    </div>
                  </div>
                )}

                {payMethod === 'bank' && (
                  <div className="w-full text-center space-y-4 max-h-[300px] overflow-y-auto pr-1">
                    {banks.length === 0 ? (
                      <div className="py-6 bg-white border border-gray-150 rounded-2xl text-center text-gray-400 text-xs italic">
                        Metode transfer bank belum dikonfigurasi oleh toko.
                      </div>
                    ) : (
                      banks.map((bank, idx) => (
                        <div
                          key={bank.id || idx}
                          className="bg-white border border-amber-100 p-4.5 rounded-2xl shadow-sm text-left relative overflow-hidden mb-3"
                        >
                          <div className="absolute right-0 top-0 opacity-5 pointer-events-none select-none">
                            <Wallet className="w-16 h-16 text-gray-900" />
                          </div>
                          <span className="text-[9px] font-extrabold uppercase bg-amber-50 border border-amber-200 px-2 py-0.5 rounded text-amber-800">
                            Bank Transfer {bank.bankName}
                          </span>
                          <h4 className="text-[10px] text-gray-400 font-black uppercase tracking-wider mt-2.5">
                            Nomor Rekening
                          </h4>

                          <div className="flex items-center justify-between mt-1">
                            <span className="text-base font-mono font-bold tracking-wider text-gray-900">
                              {bank.accountNumber}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleCopy(bank.accountNumber)}
                              className="px-3 py-1 bg-amber-50 hover:bg-amber-100 border border-amber-200 text-[10px] font-extrabold uppercase rounded-lg text-amber-800 transition-colors cursor-pointer"
                            >
                              {copied ? 'Tersalin!' : 'Salin'}
                            </button>
                          </div>

                          <p className="text-[10px] text-gray-600 mt-1 font-bold">
                            a.n. {bank.accountName}
                          </p>
                        </div>
                      ))
                    )}
                    <p className="text-[10.5px] text-gray-500 font-semibold leading-relaxed px-2">
                      Silakan lakukan transfer ke salah satu rekening di atas dengan nominal persis{' '}
                      <span className="text-orange-600 font-extrabold">{formatRupiah(parseInt(amount))}</span>.
                    </p>
                  </div>
                )}

                {payMethod === 'offline' && (
                  <div className="text-center space-y-4">
                    <div className="bg-white border border-dashed border-amber-300 p-5 rounded-2xl shadow-sm">
                      <span className="text-[32px] select-none block mb-1">🏪</span>
                      <h4 className="text-[10px] text-gray-400 font-black uppercase tracking-wider">
                        Kode Tiket Pembayaran
                      </h4>
                      <h3 className="text-lg font-mono font-black text-orange-600 tracking-widest mt-1">
                        {activeTransaction?.paymentCode || 'AS-TOPUP-XXXX'}
                      </h3>
                    </div>
                    <p className="text-[10.5px] text-gray-600 font-semibold leading-relaxed px-3">
                      Tunjukkan kode tiket di atas ke Kasir Arum Seduh di booth kami dan lakukan pembayaran tunai sebesar{' '}
                      <span className="text-orange-600 font-extrabold">{formatRupiah(parseInt(amount))}</span>.
                    </p>
                  </div>
                )}
              </div>

              {/* Dev Sandbox simulation button for QRIS and BCA Bank */}
              {(payMethod === 'qris' || payMethod === 'bank') && (
                <button
                  type="button"
                  onClick={handleSimulatePayment}
                  disabled={simulating || checkingStatus}
                  className="w-full py-2.5 bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs uppercase tracking-wider rounded-xl shadow transition-all active:scale-[0.98] cursor-pointer flex items-center justify-center gap-1.5 border border-amber-600"
                >
                  {simulating ? (
                    <>
                      <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Mensimulasikan Pembayaran...</span>
                    </>
                  ) : (
                    <>
                      <span>⚡ Simulasi Bayar Instan (Dev Sandbox)</span>
                    </>
                  )}
                </button>
              )}

              {/* Confirm / Check Status Button */}
              <div className="space-y-2.5 pt-2">
                <button
                  onClick={handleCheckStatus}
                  disabled={checkingStatus || simulating}
                  className="w-full py-4 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-black text-sm tracking-wide rounded-2xl shadow-md transition-all active:scale-[0.98] cursor-pointer flex items-center justify-center gap-1.5"
                >
                  {checkingStatus ? (
                    <>
                      <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Memeriksa status pembayaran...</span>
                    </>
                  ) : (
                    <>
                      <span>Periksa Status Pembayaran</span>
                    </>
                  )}
                </button>

                <p className="text-[9px] text-gray-400 font-semibold text-center leading-normal">
                  {payMethod === 'offline'
                    ? 'Tunjukkan kode tiket di atas ke Kasir. Setelah Kasir memproses pembayaran Anda, klik tombol Periksa di atas.'
                    : 'Setelah melakukan transfer atau memindai QRIS, klik tombol Periksa di atas untuk memperbarui saldo Anda.'}
                </p>
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

export default TopUpOverlay;
