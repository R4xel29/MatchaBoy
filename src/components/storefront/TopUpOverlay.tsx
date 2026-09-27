'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { formatRupiah } from '@/lib/utils';
import { QRCodeCanvas } from 'qrcode.react';
import {
  ChevronRight,
  Copy,
  Check,
  Wallet,
  Loader2,
  Sparkles,
  X,
  QrCode,
  Building2,
  Store,
  Upload,
  Gift,
  Flame,
  Zap,
  ArrowLeft,
  Download,
  CheckCircle2,
  Clock,
  RefreshCw,
  ShieldCheck,
  Receipt,
  Info,
  Trash2,
  ExternalLink,
  Plus,
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
  const [step, setStep] = useState<'select' | 'payment' | 'success' | 'verifying'>('select');
  const [payMethod, setPayMethod] = useState<'qris' | 'bank' | 'offline'>('qris');
  const [loading, setLoading] = useState(false);
  const [fetchingConfig, setFetchingConfig] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [activeTransaction, setActiveTransaction] = useState<any>(null);
  const [pendingTransactions, setPendingTransactions] = useState<any[]>([]);
  const [currentBalance, setCurrentBalance] = useState<number>(0);
  const [checkingStatus, setCheckingStatus] = useState(false);
  const [simulating, setSimulating] = useState(false);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
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
    firstTimePromoPackages: [
      { amount: 50000, bonus: 5000 },
      { amount: 200000, bonus: 10000 },
    ],
  });

  // Compress image to WebP on client before uploading to /api/upload
  const compressImage = (file: File): Promise<Blob> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target?.result as string;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX_WIDTH = 900;
          const MAX_HEIGHT = 900;
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > MAX_WIDTH) {
              height *= MAX_WIDTH / width;
              width = MAX_WIDTH;
            }
          } else {
            if (height > MAX_HEIGHT) {
              width *= MAX_HEIGHT / height;
              height = MAX_HEIGHT;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            resolve(file);
            return;
          }
          ctx.drawImage(img, 0, 0, width, height);
          canvas.toBlob(
            (blob) => {
              resolve(blob || file);
            },
            'image/webp',
            0.65
          );
        };
        img.onerror = () => resolve(file);
      };
      reader.onerror = () => resolve(file);
    });
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (ev) => setPreview(ev.target?.result as string);
    reader.readAsDataURL(file);

    setUploading(true);
    try {
      const compressedBlob = await compressImage(file);
      const formData = new FormData();
      formData.append('file', compressedBlob, 'topup-proof.webp');
      formData.append('type', 'payment-proof');

      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (res.ok) {
        const data = await res.json();
        setPaymentProofUrl(data.url);
        setUploaded(true);
        showToast('Bukti bayar berhasil dipilih. Klik Kirim Bukti Pembayaran.', 'success');
      } else {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'Gagal unggah');
      }
    } catch (err: any) {
      showToast(err?.message || 'Gagal mengunggah bukti pembayaran. Silakan coba lagi.', 'error');
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
        body: JSON.stringify({
          transactionId: activeTransaction.id,
          paymentProofUrl,
          paymentMethod: payMethod.toUpperCase(),
        }),
      });

      if (res.ok) {
        const d = await res.json();
        setActiveTransaction((prev: any) => ({
          ...prev,
          status: d.transaction?.status || 'VERIFYING',
          paymentProofUrl,
        }));
        setStep('verifying');
        showToast(
          'Bukti pembayaran berhasil dikirim! Saldo akan masuk setelah kasir memverifikasi.',
          'success'
        );
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
      const canvas = document.getElementById('topup-qris-canvas') as HTMLCanvasElement;
      if (!canvas) {
        throw new Error('Canvas not found');
      }
      const url = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.href = url;
      link.download = `QRIS_ARUSPAY_${activeTransaction?.paymentCode || 'TOPUP'}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      showToast('Kode QRIS berhasil diunduh!', 'success');
    } catch (error) {
      console.error('Gagal mengunduh QRIS:', error);
      showToast('Gagal mengunduh QRIS.', 'error');
    }
  };

  const loadWalletConfig = () => {
    setFetchingConfig(true);
    fetch('/api/user/wallet')
      .then((res) => res.json())
      .then((data) => {
        if (data && !data.error) {
          setCurrentBalance(data.balance ?? 0);
          setBanks(data.banks || []);
          setIsFirstTime(!!data.isFirstTime);
          setPendingTransactions(data.pendingTransactions || []);
          const loadedSettings = data.settings || {
            minTopUp: 10000,
            bonusMinAmount: 100000,
            bonusPercent: 10,
            topUpEnabled: true,
            bonusMode: 'BOTH',
            firstTimePromoEnabled: true,
            firstTimePromoPackages: [
              { amount: 50000, bonus: 5000 },
              { amount: 200000, bonus: 10000 },
            ],
          };
          setWalletSettings(loadedSettings);
          setAmount((prev) => {
            if (prev) return prev;
            if (
              data.isFirstTime &&
              (loadedSettings.bonusMode === 'FIRST_TIME' || loadedSettings.bonusMode === 'BOTH') &&
              loadedSettings.firstTimePromoEnabled &&
              loadedSettings.firstTimePromoPackages?.length > 0
            ) {
              return String(loadedSettings.firstTimePromoPackages[0].amount);
            }
            return String(loadedSettings.minTopUp || 50000);
          });
        }
      })
      .catch((err) => console.error('Error fetching wallet settings:', err))
      .finally(() => setFetchingConfig(false));
  };

  useEffect(() => {
    if (isOpen) {
      setStep('select');
      setAmount('');
      setActiveTransaction(null);
      setPreview(null);
      setUploaded(false);
      setPaymentProofUrl(null);
      loadWalletConfig();
    }
  }, [isOpen]);

  const minAmt = walletSettings?.minTopUp ?? 10000;
  const bonusAmt = walletSettings?.bonusMinAmount ?? 100000;
  const bonusPercent = walletSettings?.bonusPercent ?? 10;
  const bonusMode = walletSettings?.bonusMode ?? 'BOTH';
  const isFirstTimePromoActive =
    isFirstTime &&
    (bonusMode === 'FIRST_TIME' || bonusMode === 'BOTH') &&
    walletSettings?.firstTimePromoEnabled &&
    Array.isArray(walletSettings?.firstTimePromoPackages) &&
    walletSettings.firstTimePromoPackages.length > 0;
  const isRegularBonusActive =
    (bonusMode === 'REGULAR' || bonusMode === 'BOTH') && bonusPercent > 0;

  // Build clean 6-card preset grid
  const presets = useMemo(() => {
    const raw = [
      minAmt,
      Math.max(minAmt, 25000),
      Math.max(minAmt * 2, 50000),
      bonusAmt,
      Math.max(bonusAmt + 50000, 150000),
      bonusAmt * 2,
    ];
    return Array.from(new Set(raw)).sort((a, b) => a - b).slice(0, 6);
  }, [minAmt, bonusAmt]);

  // Calculate bonus for any given nominal in real time
  const getBonusForAmount = (val: number): { bonus: number; label: string; type: 'FIRST_TIME' | 'REGULAR' | 'NONE' } => {
    if (!val || isNaN(val) || val <= 0) {
      return { bonus: 0, label: '', type: 'NONE' };
    }
    if (isFirstTimePromoActive) {
      const matchedPkg = walletSettings.firstTimePromoPackages.find(
        (p: any) => Number(p.amount) === val
      );
      if (matchedPkg && Number(matchedPkg.bonus) > 0) {
        return {
          bonus: Number(matchedPkg.bonus),
          label: `Promo Perdana +${formatRupiah(Number(matchedPkg.bonus))}`,
          type: 'FIRST_TIME',
        };
      }
    }
    if (isRegularBonusActive && val >= bonusAmt) {
      const calc = Math.floor(val * (bonusPercent / 100));
      if (calc > 0) {
        return {
          bonus: calc,
          label: `Bonus Saldo +${bonusPercent}%`,
          type: 'REGULAR',
        };
      }
    }
    return { bonus: 0, label: '', type: 'NONE' };
  };

  const parsedAmount = parseInt(amount || '0', 10) || 0;
  const currentBonusInfo = getBonusForAmount(parsedAmount);
  const activeBonus =
    step === 'select'
      ? currentBonusInfo.bonus
      : activeTransaction?.promoBonus ?? currentBonusInfo.bonus;
  const displayAmount =
    step === 'select' ? parsedAmount : activeTransaction?.amount ?? parsedAmount;
  const totalToReceive = displayAmount + activeBonus;

  if (!isOpen) return null;

  const handleProceedToPayment = async (overrideAmount?: number) => {
    const finalAmount = overrideAmount ?? parsedAmount;
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
        setActiveTransaction(d.transaction);
        setPreview(null);
        setUploaded(false);
        setPaymentProofUrl(null);
        setStep('payment');
        if (refreshWallet) refreshWallet();
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

  const handleSwitchMethodInPayment = async (newMethod: 'qris' | 'bank' | 'offline') => {
    setPayMethod(newMethod);
    if (!activeTransaction?.id) return;
    try {
      await fetch('/api/user/wallet', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transactionId: activeTransaction.id,
          action: 'change_method',
          paymentMethod: newMethod.toUpperCase(),
        }),
      });
      setActiveTransaction((prev: any) =>
        prev ? { ...prev, paymentMethod: newMethod.toUpperCase() } : prev
      );
    } catch {
      // Non-fatal UI tab switch
    }
  };

  const handleResumePending = (tx: any) => {
    setActiveTransaction(tx);
    setAmount(String(tx.amount));
    const methodLower = String(tx.paymentMethod || 'QRIS').toLowerCase();
    if (methodLower === 'bank' || methodLower === 'offline' || methodLower === 'qris') {
      setPayMethod(methodLower as 'qris' | 'bank' | 'offline');
    } else {
      setPayMethod('qris');
    }
    if (tx.paymentProofUrl) {
      setPreview(tx.paymentProofUrl);
      setPaymentProofUrl(tx.paymentProofUrl);
      setUploaded(true);
    } else {
      setPreview(null);
      setPaymentProofUrl(null);
      setUploaded(false);
    }
    setStep('payment');
  };

  const handleCancelPending = async (txId: string) => {
    setCancellingId(txId);
    try {
      const res = await fetch('/api/user/wallet', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transactionId: txId, action: 'cancel' }),
      });
      if (res.ok) {
        setPendingTransactions((prev) => prev.filter((p) => p.id !== txId));
        showToast('Transaksi top up pending berhasil dibatalkan.', 'success');
        if (refreshWallet) refreshWallet();
      }
    } catch {
      showToast('Gagal membatalkan transaksi.', 'error');
    } finally {
      setCancellingId(null);
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
          setCurrentBalance(d.balance ?? currentBalance + totalToReceive);
          setActiveTransaction((prev: any) => ({
            ...prev,
            status: 'COMPLETED',
            promoBonus: d.promoBonus ?? prev?.promoBonus ?? 0,
          }));
          setStep('success');
          showToast(
            `Top Up berhasil! Saldo Arus Pay bertambah ${formatRupiah(d.totalReceived || d.amount)}`,
            'success'
          );
          if (refreshWallet) refreshWallet();
        } else if (d.status === 'VERIFYING') {
          setStep('verifying');
          showToast(
            'Bukti pembayaran sedang diverifikasi oleh Kasir Arum Seduh.',
            'success'
          );
        } else {
          showToast(
            'Pembayaran belum terkonfirmasi. Silakan selesaikan pembayaran atau unggah bukti bayar.',
            'error'
          );
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
      const res = await fetch('/api/user/wallet', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transactionId: activeTransaction.id, action: 'simulate' }),
      });
      const d = await res.json();
      if (res.ok && d.success) {
        setCurrentBalance(d.balance ?? currentBalance + totalToReceive);
        setActiveTransaction((prev: any) => ({
          ...prev,
          status: 'COMPLETED',
          promoBonus: d.bonusAmount ?? prev?.promoBonus ?? 0,
        }));
        setStep('success');
        showToast(
          `Pembayaran berhasil! Saldo Arus Pay bertambah ${formatRupiah(
            d.totalReceived || activeTransaction.amount
          )}`,
          'success'
        );
        if (refreshWallet) refreshWallet();
      } else {
        showToast(d.error || 'Gagal memproses simulasi pembayaran', 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('Koneksi terputus, coba lagi nanti', 'error');
    } finally {
      setSimulating(false);
    }
  };

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    showToast('Berhasil disalin ke clipboard!', 'success');
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const stepIndex = step === 'select' ? 1 : step === 'payment' ? 2 : 3;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/65 backdrop-blur-sm p-0 sm:p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 28 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 28 }}
          transition={{ type: 'spring', damping: 26, stiffness: 320 }}
          className="bg-[#FFFBF5] rounded-t-[2.25rem] sm:rounded-[2.25rem] w-full max-w-lg max-h-[92dvh] sm:max-h-[88vh] overflow-hidden shadow-[0_25px_70px_-15px_rgba(0,0,0,0.5)] flex flex-col border border-amber-200/60"
        >
          {/* LUXURY ROASTED ESPRESSO & AMBER HEADER */}
          <div className="px-6 pt-5 pb-4 bg-gradient-to-br from-[#24160E] via-[#2F1D12] to-[#180E08] text-white relative overflow-hidden shrink-0 border-b border-amber-500/20">
            {/* Decorative ambient glows */}
            <div className="absolute -top-16 -right-16 w-48 h-48 bg-orange-500/20 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute -bottom-16 -left-12 w-44 h-44 bg-amber-400/15 rounded-full blur-2xl pointer-events-none" />

            <div className="flex justify-between items-start relative z-10">
              <div className="space-y-1">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-gradient-to-r from-orange-500/25 to-amber-500/25 border border-amber-400/30 text-amber-300 text-[9.5px] font-black uppercase tracking-[0.18em]">
                  <Sparkles className="w-2.5 h-2.5 text-amber-300" />
                  <span>Arum Seduh • Arus Pay</span>
                </div>
                <h3 className="font-serif font-black text-xl sm:text-2xl text-white tracking-tight flex items-center gap-2">
                  <Wallet className="w-5 h-5 text-amber-400 shrink-0" />
                  <span>
                    {step === 'select'
                      ? 'Isi Saldo Arus Pay'
                      : step === 'payment'
                      ? 'Selesaikan Pembayaran'
                      : step === 'verifying'
                      ? 'Menunggu Verifikasi'
                      : 'Top Up Berhasil'}
                  </span>
                </h3>
              </div>

              <button
                type="button"
                onClick={onClose}
                className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 border border-white/15 flex items-center justify-center text-white active:scale-95 transition-all cursor-pointer shrink-0"
                aria-label="Tutup"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Live Balance Bar & Step Indicator */}
            <div className="mt-3.5 pt-3 border-t border-white/10 flex flex-wrap items-center justify-between gap-2 relative z-10">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-200/70">
                  Saldo Aktif:
                </span>
                <span className="text-xs font-black text-white bg-white/10 px-2.5 py-1 rounded-lg border border-white/10">
                  {fetchingConfig ? 'Memuat...' : formatRupiah(currentBalance)}
                </span>
                {step === 'select' && parsedAmount >= minAmt && (
                  <span className="text-[10px] font-black text-amber-300 flex items-center gap-1">
                    <ChevronRight className="w-3 h-3" />
                    <span>{formatRupiah(currentBalance + totalToReceive)}</span>
                  </span>
                )}
              </div>

              {/* 3-Step Pill Indicator */}
              <div className="flex items-center gap-1.5 text-[9.5px] font-black uppercase tracking-wider">
                {[
                  { idx: 1, label: 'Nominal' },
                  { idx: 2, label: 'Bayar' },
                  { idx: 3, label: 'Selesai' },
                ].map((s) => (
                  <div
                    key={s.idx}
                    className={`px-2 py-0.5 rounded-full flex items-center gap-1 transition-all ${
                      stepIndex === s.idx
                        ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-sm'
                        : stepIndex > s.idx
                        ? 'bg-emerald-500/25 text-emerald-300 border border-emerald-400/30'
                        : 'bg-white/5 text-white/40'
                    }`}
                  >
                    <span>{s.idx}.</span>
                    <span className="hidden xs:inline">{s.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* BODY CONTENT */}
          {step === 'select' && (
            <>
              <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5 text-left">
                {/* 0. PENDING TRANSACTIONS RESUME BANNER */}
                {pendingTransactions.length > 0 && (
                  <div className="bg-gradient-to-r from-amber-50 to-orange-50/80 border border-amber-300/80 rounded-2xl p-3.5 space-y-2.5 shadow-sm">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-orange-500 animate-ping" />
                        <span className="text-[10.5px] font-black uppercase tracking-wider text-orange-800">
                          Transaksi Top Up Menunggu ({pendingTransactions.length})
                        </span>
                      </div>
                      <span className="text-[9.5px] font-bold text-amber-700">
                        Belum Selesai
                      </span>
                    </div>
                    <div className="space-y-2 max-h-32 overflow-y-auto pr-1">
                      {pendingTransactions.slice(0, 2).map((ptx) => (
                        <div
                          key={ptx.id}
                          className="bg-white rounded-xl p-2.5 border border-amber-200/70 flex items-center justify-between gap-2"
                        >
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs font-black text-gray-900">
                                {formatRupiah(ptx.amount)}
                              </span>
                              {ptx.promoBonus > 0 && (
                                <span className="text-[9px] font-extrabold text-orange-600 bg-orange-50 px-1.5 py-0.5 rounded border border-orange-200">
                                  +Bonus {formatRupiah(ptx.promoBonus)}
                                </span>
                              )}
                            </div>
                            <p className="text-[10px] font-mono text-gray-500 truncate">
                              {ptx.paymentCode} • {ptx.paymentMethod} •{' '}
                              {ptx.status === 'VERIFYING' ? 'Menunggu Verifikasi' : 'Menunggu Bayar'}
                            </p>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <button
                              type="button"
                              disabled={cancellingId === ptx.id}
                              onClick={() => handleCancelPending(ptx.id)}
                              className="p-1.5 rounded-lg border border-gray-200 text-gray-400 hover:text-rose-600 hover:border-rose-200 transition-colors cursor-pointer"
                              title="Batalkan"
                            >
                              {cancellingId === ptx.id ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                <Trash2 className="w-3.5 h-3.5" />
                              )}
                            </button>
                            <button
                              type="button"
                              onClick={() => handleResumePending(ptx)}
                              className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-orange-500 to-amber-500 text-white text-[10px] font-black uppercase tracking-wider shadow-sm hover:from-orange-600 hover:to-amber-600 transition-all cursor-pointer flex items-center gap-1"
                            >
                              <span>Lanjutkan</span>
                              <ChevronRight className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 1. FIRST-TIME PROMO PACKAGES (IF APPLICABLE) */}
                {isFirstTimePromoActive && (
                  <div className="space-y-3">
                    <div className="bg-gradient-to-r from-orange-500/10 via-amber-500/10 to-orange-500/5 border border-orange-300/60 rounded-2xl p-4 flex items-start gap-3 relative overflow-hidden">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-amber-500 text-white flex items-center justify-center shrink-0 shadow-sm">
                        <Gift className="w-5 h-5" />
                      </div>
                      <div className="space-y-0.5 flex-1">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-black text-orange-800">
                            Promo Spesial Top-Up Pertama!
                          </span>
                          <span className="px-1.5 py-0.5 text-[8.5px] font-black uppercase bg-orange-600 text-white rounded-full">
                            Eksklusif
                          </span>
                        </div>
                        <p className="text-[11px] text-gray-600 font-medium leading-relaxed">
                          Pilih paket perdana di bawah ini untuk mendapatkan ekstra saldo Arus Pay langsung secara cuma-cuma.
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {walletSettings.firstTimePromoPackages.map((pkg: any, idx: number) => {
                        const isSelected = parsedAmount === Number(pkg.amount);
                        return (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => setAmount(String(pkg.amount))}
                            className={`relative p-3.5 rounded-2xl border-2 text-left transition-all cursor-pointer flex flex-col justify-between gap-2 active:scale-[0.98] ${
                              isSelected
                                ? 'border-orange-500 bg-gradient-to-br from-orange-50/90 to-amber-50/60 shadow-md shadow-orange-500/10'
                                : 'border-amber-200/80 bg-white hover:border-orange-300'
                            }`}
                          >
                            <div className="flex items-start justify-between w-full">
                              <div>
                                <span className="text-[9.5px] font-black uppercase tracking-wider text-orange-600 block">
                                  Paket Perdana {idx + 1}
                                </span>
                                <span className="text-base font-black text-gray-900 font-serif">
                                  {formatRupiah(Number(pkg.amount))}
                                </span>
                              </div>
                              <div
                                className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 ${
                                  isSelected
                                    ? 'bg-orange-500 border-orange-500 text-white'
                                    : 'border-gray-300 bg-white'
                                }`}
                              >
                                {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                              </div>
                            </div>

                            <div className="pt-2 border-t border-amber-200/50 flex items-center justify-between w-full">
                              <span className="inline-flex items-center gap-1 text-[10px] font-extrabold text-orange-700 bg-orange-100/80 px-2 py-0.5 rounded-md">
                                <Sparkles className="w-2.5 h-2.5" />
                                +Bonus {formatRupiah(Number(pkg.bonus))}
                              </span>
                              <span className="text-[10.5px] font-black text-gray-700">
                                Terima {formatRupiah(Number(pkg.amount) + Number(pkg.bonus))}
                              </span>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* 2. REGULAR BONUS INTERACTIVE PROGRESS BANNER */}
                {isRegularBonusActive && (
                  <div
                    className={`rounded-2xl p-3.5 border transition-all ${
                      currentBonusInfo.bonus > 0
                        ? 'bg-gradient-to-r from-amber-50 via-orange-50 to-amber-50 border-orange-300 shadow-sm'
                        : 'bg-white border-amber-200/70'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5">
                        <div
                          className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                            currentBonusInfo.bonus > 0
                              ? 'bg-gradient-to-br from-orange-500 to-amber-500 text-white shadow-sm'
                              : 'bg-amber-100 text-orange-600'
                          }`}
                        >
                          <Flame className="w-4.5 h-4.5" />
                        </div>
                        <div>
                          <p className="text-xs font-black text-gray-900 flex items-center gap-1.5">
                            <span>
                              {currentBonusInfo.bonus > 0
                                ? `Bonus Saldo Aktif: +${formatRupiah(currentBonusInfo.bonus)}!`
                                : `Bonus Ekstra Saldo ${bonusPercent}%`}
                            </span>
                          </p>
                          <p className="text-[10.5px] text-gray-600 font-medium leading-snug">
                            {currentBonusInfo.bonus > 0
                              ? `Selamat! Anda mendapat tambahan saldo gratis ${formatRupiah(
                                  currentBonusInfo.bonus
                                )}.`
                              : `Top up minimal ${formatRupiah(
                                  bonusAmt
                                )} untuk ekstra saldo gratis +${bonusPercent}% (${formatRupiah(
                                  Math.floor((bonusAmt * bonusPercent) / 100)
                                )}).`}
                          </p>
                        </div>
                      </div>

                      {parsedAmount < bonusAmt && (
                        <button
                          type="button"
                          onClick={() => setAmount(String(bonusAmt))}
                          className="px-2.5 py-1.5 rounded-xl bg-orange-100 hover:bg-orange-200 text-orange-700 text-[10px] font-black uppercase tracking-wider shrink-0 transition-colors cursor-pointer"
                        >
                          Pilih {formatRupiah(bonusAmt)}
                        </button>
                      )}
                    </div>
                  </div>
                )}

                {/* 3. QUICK NOMINAL PRESET GRID */}
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <label className="text-[10.5px] font-black text-gray-500 uppercase tracking-wider">
                      Pilih Cepat Nominal
                    </label>
                    <span className="text-[10px] font-bold text-gray-400">
                      Min. {formatRupiah(minAmt)}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                    {presets.map((val) => {
                      const isSelected = parsedAmount === val;
                      const presetBonus = getBonusForAmount(val);
                      return (
                        <button
                          key={val}
                          type="button"
                          onClick={() => setAmount(String(val))}
                          className={`relative p-3 rounded-2xl border-2 text-left transition-all cursor-pointer outline-none active:scale-[0.98] flex flex-col justify-between ${
                            isSelected
                              ? 'border-orange-500 bg-gradient-to-br from-orange-50 to-amber-50/70 shadow-sm'
                              : 'border-gray-200/90 bg-white hover:border-amber-300 hover:bg-amber-50/20'
                          }`}
                        >
                          {presetBonus.bonus > 0 && (
                            <span className="absolute -top-2 right-2 bg-gradient-to-r from-orange-600 to-amber-500 text-white text-[8px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider shadow-sm">
                              +{formatRupiah(presetBonus.bonus)}
                            </span>
                          )}
                          <div className="flex items-center justify-between w-full">
                            <span
                              className={`text-xs sm:text-sm font-black ${
                                isSelected ? 'text-orange-700' : 'text-gray-900'
                              }`}
                            >
                              {formatRupiah(val)}
                            </span>
                            {isSelected && (
                              <span className="w-4 h-4 rounded-full bg-orange-500 text-white flex items-center justify-center shrink-0">
                                <Check className="w-2.5 h-2.5 stroke-[3]" />
                              </span>
                            )}
                          </div>
                          <span className="text-[9.5px] font-semibold text-gray-400 mt-1">
                            {presetBonus.bonus > 0
                              ? `Terima ${formatRupiah(val + presetBonus.bonus)}`
                              : 'Saldo Instan'}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 4. CUSTOM AMOUNT INPUT */}
                <div className="space-y-2">
                  <label className="text-[10.5px] font-black text-gray-500 uppercase tracking-wider block">
                    Atau Masukkan Nominal Sendiri
                  </label>
                  <div className="relative flex items-center">
                    <span className="absolute left-4 text-sm font-black text-orange-600 select-none">
                      Rp
                    </span>
                    <input
                      type="number"
                      min={minAmt}
                      step={5000}
                      placeholder={`Minimal ${minAmt.toLocaleString('id-ID')}`}
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      className="w-full pl-11 pr-20 py-3.5 rounded-2xl border-2 border-gray-200 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/15 outline-none text-base font-black text-gray-900 bg-white transition-all"
                    />
                    {amount && (
                      <button
                        type="button"
                        onClick={() => setAmount(String(minAmt))}
                        className="absolute right-3 px-2.5 py-1 rounded-lg bg-gray-100 hover:bg-gray-200 text-[10px] font-extrabold text-gray-600 transition-colors cursor-pointer"
                      >
                        Reset
                      </button>
                    )}
                  </div>

                  {/* Quick Adder Chips */}
                  <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                    <span className="text-[9.5px] font-bold text-gray-400 mr-1">Tambah Cepat:</span>
                    {[10000, 25000, 50000, 100000].map((inc) => (
                      <button
                        key={inc}
                        type="button"
                        onClick={() => setAmount(String((parsedAmount || 0) + inc))}
                        className="px-2.5 py-1 rounded-lg bg-amber-50 hover:bg-amber-100 border border-amber-200/80 text-[10px] font-extrabold text-amber-900 transition-all active:scale-95 cursor-pointer flex items-center gap-0.5"
                      >
                        <Plus className="w-2.5 h-2.5 text-orange-600" />
                        <span>{(inc / 1000).toLocaleString('id-ID')}rb</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* 5. PAYMENT METHOD SELECTION */}
                <div className="space-y-2.5">
                  <label className="text-[10.5px] font-black text-gray-500 uppercase tracking-wider block">
                    Pilih Metode Pembayaran
                  </label>
                  <div className="grid grid-cols-3 gap-2.5">
                    {[
                      {
                        id: 'qris',
                        label: 'QRIS Instan',
                        sub: 'E-Wallet & M-Bank',
                        icon: QrCode,
                      },
                      {
                        id: 'bank',
                        label: 'Transfer Bank',
                        sub: banks.length > 0 ? `${banks.length} Rekening` : 'Rekening Toko',
                        icon: Building2,
                      },
                      {
                        id: 'offline',
                        label: 'Kasir Booth',
                        sub: 'Bayar di Outlet',
                        icon: Store,
                      },
                    ].map((m) => {
                      const Icon = m.icon;
                      const isActive = payMethod === m.id;
                      return (
                        <button
                          key={m.id}
                          type="button"
                          onClick={() => setPayMethod(m.id as 'qris' | 'bank' | 'offline')}
                          className={`p-3 rounded-2xl border-2 text-left transition-all cursor-pointer flex flex-col justify-between gap-1.5 active:scale-[0.98] ${
                            isActive
                              ? 'border-orange-500 bg-gradient-to-br from-orange-50 to-amber-50/70 text-orange-900 shadow-sm'
                              : 'border-gray-200 bg-white text-gray-700 hover:border-amber-300'
                          }`}
                        >
                          <div className="flex items-center justify-between w-full">
                            <div
                              className={`w-8 h-8 rounded-xl flex items-center justify-center ${
                                isActive
                                  ? 'bg-gradient-to-br from-orange-500 to-amber-500 text-white shadow-sm'
                                  : 'bg-gray-100 text-gray-600'
                              }`}
                            >
                              <Icon className="w-4 h-4" />
                            </div>
                            {isActive && (
                              <span className="w-4 h-4 rounded-full bg-orange-500 text-white flex items-center justify-center">
                                <Check className="w-2.5 h-2.5 stroke-[3]" />
                              </span>
                            )}
                          </div>
                          <div>
                            <p className="text-[11px] font-black leading-tight">{m.label}</p>
                            <p className="text-[9px] text-gray-500 font-semibold mt-0.5 leading-tight">
                              {m.sub}
                            </p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 6. TRANSPARENT BREAKDOWN SUMMARY (RULE 8) */}
                <div className="bg-white rounded-2xl border border-amber-200/80 p-4 space-y-2.5 shadow-sm">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-500 font-bold">Nominal Top Up</span>
                    <span className="font-extrabold text-gray-900">
                      {formatRupiah(parsedAmount)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-500 font-bold flex items-center gap-1">
                      <Sparkles className="w-3.5 h-3.5 text-orange-500" />
                      <span>
                        {currentBonusInfo.label || 'Bonus Promo Arus Pay'}
                      </span>
                    </span>
                    <span
                      className={`font-black ${
                        activeBonus > 0 ? 'text-orange-600' : 'text-gray-400'
                      }`}
                    >
                      +{formatRupiah(activeBonus)}
                    </span>
                  </div>

                  <div className="border-t border-dashed border-amber-200 pt-2.5 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] font-black uppercase tracking-wider text-gray-400 block">
                        Total Saldo Diterima
                      </span>
                      {activeBonus > 0 && (
                        <span className="text-[10px] font-bold text-orange-600">
                          {formatRupiah(parsedAmount)} + {formatRupiah(activeBonus)} ={' '}
                          {formatRupiah(totalToReceive)}
                        </span>
                      )}
                    </div>
                    <span className="text-lg font-serif font-black text-orange-600">
                      {formatRupiah(totalToReceive)}
                    </span>
                  </div>
                </div>
              </div>

              {/* STICKY FOOTER CTA STEP 1 */}
              <div className="p-4 sm:px-6 bg-white border-t border-amber-100 shrink-0">
                <button
                  type="button"
                  onClick={() => handleProceedToPayment()}
                  disabled={loading || !walletSettings?.topUpEnabled || parsedAmount < minAmt}
                  className="w-full py-4 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 disabled:from-gray-200 disabled:to-gray-200 disabled:text-gray-400 text-white font-black text-sm tracking-wide rounded-2xl shadow-lg shadow-orange-500/20 transition-all active:scale-[0.98] cursor-pointer flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Membuat Instruksi Pembayaran...</span>
                    </>
                  ) : !walletSettings?.topUpEnabled ? (
                    <span>Top Up Sedang Dinonaktifkan</span>
                  ) : (
                    <>
                      <span>
                        Lanjutkan Pembayaran • {formatRupiah(parsedAmount)}
                      </span>
                      <ChevronRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            </>
          )}

          {step === 'payment' && (
            <>
              <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5 text-left">
                {/* Back & Summary Card */}
                <div className="bg-white rounded-2xl border border-amber-200/80 p-4 space-y-3 shadow-sm">
                  <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                    <button
                      type="button"
                      onClick={() => setStep('select')}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-gray-200 text-[11px] font-black text-gray-700 hover:bg-gray-50 transition-all cursor-pointer"
                    >
                      <ArrowLeft className="w-3.5 h-3.5" />
                      <span>Ubah Nominal</span>
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        handleCopy(activeTransaction?.paymentCode || '', 'ref-code')
                      }
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-50 border border-amber-200/80 text-[10.5px] font-mono font-bold text-amber-900 hover:bg-amber-100 transition-colors cursor-pointer"
                    >
                      <span>{activeTransaction?.paymentCode || 'AS-TOPUP'}</span>
                      {copiedKey === 'ref-code' ? (
                        <Check className="w-3 h-3 text-emerald-600" />
                      ) : (
                        <Copy className="w-3 h-3 text-amber-700" />
                      )}
                    </button>
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-wider text-gray-400">
                        Tagihan Pembayaran
                      </p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-xl font-serif font-black text-gray-900">
                          {formatRupiah(displayAmount)}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleCopy(String(displayAmount), 'amount')}
                          className="p-1 rounded-md bg-gray-100 hover:bg-gray-200 text-gray-600 transition-colors cursor-pointer"
                          title="Salin Nominal"
                        >
                          {copiedKey === 'amount' ? (
                            <Check className="w-3 h-3 text-emerald-600" />
                          ) : (
                            <Copy className="w-3 h-3" />
                          )}
                        </button>
                      </div>
                    </div>

                    <div className="text-right">
                      <p className="text-[10px] font-black uppercase tracking-wider text-gray-400">
                        Total Saldo Masuk
                      </p>
                      <p className="text-lg font-serif font-black text-orange-600 mt-0.5">
                        {formatRupiah(totalToReceive)}
                      </p>
                      {activeBonus > 0 && (
                        <span className="text-[9.5px] font-extrabold text-orange-700 bg-orange-50 px-1.5 py-0.5 rounded border border-orange-200">
                          Termasuk Bonus +{formatRupiah(activeBonus)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Payment Method Switcher Tabs */}
                <div className="grid grid-cols-3 gap-1.5 p-1.5 bg-amber-100/50 border border-amber-200/70 rounded-2xl select-none">
                  {[
                    { id: 'qris', label: 'Scan QRIS', icon: QrCode },
                    { id: 'bank', label: 'Transfer Bank', icon: Building2 },
                    { id: 'offline', label: 'Kasir Booth', icon: Store },
                  ].map((m) => {
                    const Icon = m.icon;
                    const isActive = payMethod === m.id;
                    return (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => handleSwitchMethodInPayment(m.id as any)}
                        className={`py-2.5 px-2 text-[10.5px] font-black uppercase tracking-wider rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                          isActive
                            ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-sm'
                            : 'text-gray-600 hover:bg-white/70'
                        }`}
                      >
                        <Icon className="w-3.5 h-3.5 shrink-0" />
                        <span className="truncate">{m.label}</span>
                      </button>
                    );
                  })}
                </div>

                {/* METHOD 1: QRIS */}
                {payMethod === 'qris' && (
                  <div className="space-y-4">
                    <div className="bg-white border border-amber-200/80 rounded-3xl p-5 flex flex-col items-center shadow-sm">
                      <div className="w-full flex items-center justify-between border-b border-dashed border-gray-200 pb-3 mb-4 select-none">
                        <div className="flex items-center gap-2">
                          <span className="text-lg font-black italic tracking-tighter text-gray-900">
                            QR<span className="text-orange-600">IS</span>
                          </span>
                          <span className="text-[9px] font-bold text-gray-500">
                            Standar Pembayaran Nasional
                          </span>
                        </div>
                        <span className="text-[9px] font-black uppercase tracking-widest text-orange-700 bg-orange-50 border border-orange-200 px-2 py-0.5 rounded-md">
                          GPN • Instan
                        </span>
                      </div>

                      {/* QR Code Canvas */}
                      <div className="relative p-3.5 bg-white rounded-2xl border-2 border-amber-200 shadow-sm flex items-center justify-center">
                        <QRCodeCanvas
                          id="topup-qris-canvas"
                          value={
                            activeTransaction?.paymentQrContent ||
                            `00020101021226670016ID.CO.ARUMSEDUH.WWW01189360091430000000005204581253033605802ID5910ARUM SEDUH6007JAKARTA62070703A016304ABCD`
                          }
                          size={190}
                          level="M"
                          includeMargin={true}
                          marginSize={2}
                          className="block rounded-lg"
                        />
                      </div>

                      <div className="text-center mt-3.5 space-y-0.5 w-full">
                        <p className="text-[9.5px] text-gray-400 font-black uppercase tracking-widest">
                          Merchant Resmi
                        </p>
                        <h4 className="text-sm font-serif font-black text-gray-900">
                          ARUM SEDUH • ARUS PAY
                        </h4>
                        <p className="text-xs font-extrabold text-orange-600 pt-0.5">
                          Nominal Scan: {formatRupiah(displayAmount)}
                        </p>
                      </div>

                      <div className="grid grid-cols-2 gap-2.5 w-full mt-4 pt-3.5 border-t border-gray-100">
                        <button
                          type="button"
                          onClick={handleDownloadQr}
                          className="py-2.5 px-3 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 font-extrabold rounded-xl transition-all flex items-center justify-center gap-1.5 active:scale-[0.98] text-xs cursor-pointer"
                        >
                          <Download className="w-3.5 h-3.5 text-orange-600" />
                          <span>Unduh QRIS</span>
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            handleCopy(
                              activeTransaction?.paymentCode || 'AS-TOPUP',
                              'qris-code'
                            )
                          }
                          className="py-2.5 px-3 bg-white hover:bg-gray-50 text-gray-700 border border-gray-200 font-extrabold rounded-xl transition-all flex items-center justify-center gap-1.5 active:scale-[0.98] text-xs cursor-pointer"
                        >
                          <Copy className="w-3.5 h-3.5 text-gray-500" />
                          <span>Salin Kode</span>
                        </button>
                      </div>

                      {activeTransaction?.paymentUrl && (
                        <a
                          href={activeTransaction.paymentUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="w-full mt-2.5 py-2.5 px-3 bg-orange-50 hover:bg-orange-100 text-orange-700 border border-orange-200 font-extrabold rounded-xl transition-all flex items-center justify-center gap-1.5 text-xs"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                          <span>Buka Halaman Checkout DOKU</span>
                        </a>
                      )}
                    </div>
                  </div>
                )}

                {/* METHOD 2: BANK TRANSFER */}
                {payMethod === 'bank' && (
                  <div className="space-y-3">
                    {banks.length === 0 ? (
                      <div className="p-5 bg-white border border-amber-200/80 rounded-2xl text-center space-y-2">
                        <Building2 className="w-8 h-8 text-amber-500 mx-auto" />
                        <p className="text-xs font-extrabold text-gray-800">
                          Rekening Bank Sedang Diperbarui
                        </p>
                        <p className="text-[11px] text-gray-500">
                          Silakan gunakan metode Scan QRIS atau bayar langsung di Kasir Booth Arum Seduh.
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-2.5">
                        {banks.map((bank, idx) => (
                          <div
                            key={bank.id || idx}
                            className="bg-white border border-amber-200/80 p-4 rounded-2xl shadow-sm flex items-center justify-between gap-3"
                          >
                            <div className="space-y-1 min-w-0">
                              <span className="inline-flex items-center gap-1 text-[9.5px] font-black uppercase bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-md text-amber-900">
                                <Building2 className="w-3 h-3 text-orange-600" />
                                <span>Bank {bank.bankName}</span>
                              </span>
                              <p className="text-base font-mono font-black tracking-wider text-gray-900 pt-0.5">
                                {bank.accountNumber}
                              </p>
                              <p className="text-[11px] text-gray-500 font-bold truncate">
                                a.n. {bank.accountName}
                              </p>
                            </div>

                            <button
                              type="button"
                              onClick={() =>
                                handleCopy(bank.accountNumber, `bank-${bank.id || idx}`)
                              }
                              className="px-3.5 py-2 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white text-[10.5px] font-black uppercase tracking-wider rounded-xl shadow-sm transition-all active:scale-95 cursor-pointer flex items-center gap-1.5 shrink-0"
                            >
                              {copiedKey === `bank-${bank.id || idx}` ? (
                                <>
                                  <Check className="w-3.5 h-3.5" />
                                  <span>Tersalin</span>
                                </>
                              ) : (
                                <>
                                  <Copy className="w-3.5 h-3.5" />
                                  <span>Salin</span>
                                </>
                              )}
                            </button>
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="bg-amber-50/80 border border-amber-200 rounded-2xl p-3.5 flex items-start gap-2.5">
                      <Info className="w-4 h-4 text-orange-600 shrink-0 mt-0.5" />
                      <p className="text-[11px] text-gray-700 font-semibold leading-relaxed">
                        Transfer tepat sebesar{' '}
                        <span className="text-orange-700 font-black">
                          {formatRupiah(displayAmount)}
                        </span>{' '}
                        lalu unggah foto struk/bukti transfer pada kotak di bawah ini.
                      </p>
                    </div>
                  </div>
                )}

                {/* METHOD 3: KASIR BOOTH (OFFLINE) */}
                {payMethod === 'offline' && (
                  <div className="bg-white border-2 border-dashed border-amber-300 rounded-3xl p-5 text-center space-y-4 shadow-sm">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-orange-500 to-amber-500 text-white flex items-center justify-center mx-auto shadow-md">
                      <Store className="w-6 h-6" />
                    </div>

                    <div className="space-y-1">
                      <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">
                        Kode Tiket Top Up Kasir
                      </p>
                      <div className="inline-flex items-center gap-2 bg-amber-50 border border-amber-200 px-4 py-2 rounded-2xl">
                        <span className="text-lg font-mono font-black text-orange-600 tracking-widest">
                          {activeTransaction?.paymentCode || 'AS-TOPUP'}
                        </span>
                        <button
                          type="button"
                          onClick={() =>
                            handleCopy(
                              activeTransaction?.paymentCode || '',
                              'ticket-code'
                            )
                          }
                          className="p-1.5 rounded-lg bg-white border border-amber-200 text-amber-800 hover:bg-amber-100 cursor-pointer"
                        >
                          {copiedKey === 'ticket-code' ? (
                            <Check className="w-3.5 h-3.5 text-emerald-600" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>
                    </div>

                    <div className="p-3 bg-white rounded-2xl border border-gray-200 inline-block mx-auto">
                      <QRCodeCanvas
                        value={activeTransaction?.paymentCode || 'AS-TOPUP'}
                        size={136}
                        level="M"
                        includeMargin={true}
                        marginSize={2}
                      />
                    </div>

                    <div className="text-left bg-amber-50/60 border border-amber-200/70 rounded-2xl p-3.5 space-y-2 text-[11px] text-gray-700 font-semibold">
                      <p className="font-black text-gray-900 text-xs">
                        Cara Top Up di Kasir Booth:
                      </p>
                      <p>1. Tunjukkan kode tiket di atas kepada Kasir Arum Seduh.</p>
                      <p>
                        2. Serahkan pembayaran tunai sebesar{' '}
                        <span className="font-black text-orange-600">
                          {formatRupiah(displayAmount)}
                        </span>
                        .
                      </p>
                      <p>
                        3. Kasir akan menyetujui permintaan dan saldo{' '}
                        <span className="font-black text-orange-600">
                          {formatRupiah(totalToReceive)}
                        </span>{' '}
                        langsung masuk ke Arus Pay Anda.
                      </p>
                    </div>
                  </div>
                )}

                {/* SHARED PAYMENT PROOF UPLOADER (FOR QRIS & BANK) */}
                {(payMethod === 'qris' || payMethod === 'bank') && (
                  <div className="bg-white border border-amber-200/80 rounded-3xl p-4 space-y-3 shadow-sm">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-black text-gray-800 flex items-center gap-1.5">
                        <Upload className="w-4 h-4 text-orange-600" />
                        <span>Unggah Bukti Pembayaran</span>
                      </h4>
                      <span className="text-[9.5px] font-bold text-gray-400">
                        JPG / PNG / WebP
                      </span>
                    </div>

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
                        className="w-full py-5 border-2 border-dashed border-amber-300 rounded-2xl flex flex-col items-center justify-center gap-1.5 hover:border-orange-500 hover:bg-orange-50/30 transition-all active:scale-[0.99] cursor-pointer text-gray-500"
                      >
                        <div className="w-9 h-9 rounded-xl bg-amber-50 text-orange-600 flex items-center justify-center">
                          <Upload className="w-4.5 h-4.5" />
                        </div>
                        <span className="text-xs font-extrabold text-gray-700">
                          Klik untuk pilih foto bukti bayar / struk
                        </span>
                        <span className="text-[10px] text-gray-400">
                          Otomatis dikompresi agar cepat diunggah
                        </span>
                      </button>
                    ) : (
                      <div className="relative rounded-2xl overflow-hidden border border-amber-200 bg-gray-50">
                        <img
                          src={preview}
                          alt="Bukti Pembayaran"
                          className="w-full h-36 object-cover"
                        />
                        {uploading && (
                          <div className="absolute inset-0 bg-black/50 backdrop-blur-[1px] flex flex-col items-center justify-center gap-1.5 text-white">
                            <Loader2 className="w-6 h-6 animate-spin" />
                            <span className="text-[10px] font-bold">Mengunggah...</span>
                          </div>
                        )}
                        {uploaded && !uploading && (
                          <div className="absolute top-2.5 right-2.5 bg-emerald-600 text-white px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider flex items-center gap-1 shadow">
                            <Check className="w-3 h-3" />
                            <span>Siap Dikirim</span>
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
                          className="absolute top-2.5 left-2.5 w-7 h-7 bg-white/95 rounded-full flex items-center justify-center border border-gray-200 text-gray-700 hover:text-rose-600 shadow-sm cursor-pointer"
                          aria-label="Hapus bukti"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    )}

                    {uploaded && (
                      <button
                        type="button"
                        disabled={submittingProof || uploading}
                        onClick={handleSubmitProof}
                        className="w-full py-3.5 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-black text-xs uppercase tracking-wider shadow-md transition-all active:scale-[0.98] flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        {submittingProof ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            <span>Mengirim Bukti Pembayaran...</span>
                          </>
                        ) : (
                          <>
                            <CheckCircle2 className="w-4 h-4" />
                            <span>Kirim Bukti Pembayaran</span>
                          </>
                        )}
                      </button>
                    )}
                  </div>
                )}

                {/* SANDBOX / INSTANT SIMULATION BUTTON */}
                <div className="bg-amber-50/70 border border-amber-200/80 rounded-2xl p-3.5 flex flex-col sm:flex-row items-center justify-between gap-2.5">
                  <div className="flex items-center gap-2 text-left">
                    <div className="w-8 h-8 rounded-xl bg-amber-500/15 text-orange-600 flex items-center justify-center shrink-0">
                      <Zap className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-[11px] font-black text-gray-900">
                        Mode Simulasi Instan
                      </p>
                      <p className="text-[9.5px] text-gray-500 font-medium">
                        Uji coba tambah saldo langsung tanpa menunggu antrean kasir
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleSimulatePayment}
                    disabled={simulating || checkingStatus}
                    className="w-full sm:w-auto px-3.5 py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-black text-[10.5px] uppercase tracking-wider rounded-xl shadow-sm transition-all active:scale-95 cursor-pointer flex items-center justify-center gap-1.5 shrink-0"
                  >
                    {simulating ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Memproses...</span>
                      </>
                    ) : (
                      <>
                        <Zap className="w-3.5 h-3.5" />
                        <span>Simulasi Lunas Instan</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* STICKY FOOTER STEP 2 */}
              <div className="p-4 sm:px-6 bg-white border-t border-amber-100 shrink-0 space-y-2">
                <button
                  type="button"
                  onClick={handleCheckStatus}
                  disabled={checkingStatus || simulating}
                  className="w-full py-3.5 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-black text-xs sm:text-sm tracking-wide rounded-2xl shadow-md transition-all active:scale-[0.98] cursor-pointer flex items-center justify-center gap-2"
                >
                  {checkingStatus ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Memeriksa Status Pembayaran...</span>
                    </>
                  ) : (
                    <>
                      <RefreshCw className="w-4 h-4" />
                      <span>Periksa Status Pembayaran</span>
                    </>
                  )}
                </button>
              </div>
            </>
          )}

          {/* STEP 3: SUCCESS OR VERIFYING RECEIPT */}
          {(step === 'success' || step === 'verifying') && (
            <div className="p-6 space-y-5 text-center overflow-y-auto">
              <div className="pt-2">
                <motion.div
                  initial={{ scale: 0.6, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ type: 'spring', damping: 16, stiffness: 260 }}
                  className={`w-16 h-16 rounded-3xl mx-auto flex items-center justify-center shadow-lg ${
                    step === 'success'
                      ? 'bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-emerald-500/25'
                      : 'bg-gradient-to-br from-orange-500 to-amber-500 text-white shadow-orange-500/25'
                  }`}
                >
                  {step === 'success' ? (
                    <CheckCircle2 className="w-9 h-9" />
                  ) : (
                    <Clock className="w-9 h-9" />
                  )}
                </motion.div>

                <h4 className="font-serif font-black text-xl text-gray-900 mt-4">
                  {step === 'success'
                    ? 'Saldo Arus Pay Berhasil Ditambahkan!'
                    : 'Bukti Pembayaran Diterima!'}
                </h4>
                <p className="text-xs text-gray-500 font-medium mt-1 max-w-xs mx-auto leading-relaxed">
                  {step === 'success'
                    ? 'Saldo dompet digital Anda telah diperbarui dan siap digunakan untuk transaksi instan di Arum Seduh.'
                    : 'Tim Kasir Arum Seduh sedang memverifikasi bukti pembayaran Anda. Saldo akan otomatis bertambah setelah disetujui.'}
                </p>
              </div>

              {/* Receipt Breakdown Card */}
              <div className="bg-white rounded-3xl border border-amber-200/80 p-5 text-left space-y-3 shadow-sm">
                <div className="flex items-center justify-between border-b border-dashed border-gray-200 pb-3">
                  <div className="flex items-center gap-2">
                    <Receipt className="w-4 h-4 text-orange-600" />
                    <span className="text-[10.5px] font-black uppercase tracking-wider text-gray-500">
                      Rincian Top Up Arus Pay
                    </span>
                  </div>
                  <span className="text-[10px] font-mono font-bold text-gray-600">
                    {activeTransaction?.paymentCode}
                  </span>
                </div>

                <div className="space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-gray-500 font-medium">Metode Pembayaran</span>
                    <span className="font-bold text-gray-900 uppercase">
                      {payMethod === 'qris'
                        ? 'QRIS'
                        : payMethod === 'bank'
                        ? 'Transfer Bank'
                        : 'Kasir Booth'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500 font-medium">Nominal Top Up</span>
                    <span className="font-bold text-gray-900">
                      {formatRupiah(displayAmount)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500 font-medium">Bonus Promo Arus Pay</span>
                    <span className="font-extrabold text-orange-600">
                      +{formatRupiah(activeBonus)}
                    </span>
                  </div>
                  <div className="border-t border-gray-100 pt-2 flex justify-between items-baseline">
                    <span className="font-black text-gray-800">Total Saldo Masuk</span>
                    <span className="text-base font-serif font-black text-orange-600">
                      {formatRupiah(totalToReceive)}
                    </span>
                  </div>
                </div>

                {step === 'success' && (
                  <div className="mt-3 pt-3 border-t border-amber-100 bg-amber-50/60 -mx-5 -mb-5 p-4 rounded-b-3xl flex items-center justify-between">
                    <span className="text-[11px] font-black uppercase tracking-wider text-amber-900 flex items-center gap-1.5">
                      <ShieldCheck className="w-4 h-4 text-orange-600" />
                      <span>Saldo Arus Pay Sekarang</span>
                    </span>
                    <span className="text-base font-serif font-black text-gray-900">
                      {formatRupiah(currentBalance)}
                    </span>
                  </div>
                )}
              </div>

              <div className="flex gap-2.5 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setStep('select');
                    setActiveTransaction(null);
                    setPreview(null);
                    setUploaded(false);
                    setPaymentProofUrl(null);
                    loadWalletConfig();
                  }}
                  className="flex-1 py-3.5 rounded-2xl border border-amber-200 bg-white hover:bg-amber-50 text-amber-900 font-black text-xs uppercase tracking-wider transition-all cursor-pointer"
                >
                  Top Up Lagi
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (refreshWallet) refreshWallet();
                    onClose();
                  }}
                  className="flex-[1.5] py-3.5 rounded-2xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-black text-xs uppercase tracking-wider shadow-md transition-all cursor-pointer"
                >
                  Selesai & Tutup
                </button>
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

export default TopUpOverlay;
