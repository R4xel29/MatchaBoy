'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { formatRupiah } from '@/lib/utils';
import { QRCodeCanvas, QRCodeSVG } from 'qrcode.react';
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
  ArrowLeft,
  Download,
  CheckCircle2,
  Clock,
  RefreshCw,
  ShieldCheck,
  Receipt,
  Info,
  Trash2,
  Plus,
  AlertTriangle,
} from 'lucide-react';

export interface TopUpOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  refreshWallet?: () => void;
  showToast?: (msg: string, type: 'success' | 'error') => void;
}

const DEFAULT_FIRST_TIME_PACKAGES = [
  { amount: 50000, bonus: 3000 },
  { amount: 100000, bonus: 5000 },
  { amount: 200000, bonus: 10000 },
];

const QRIS_EXPIRE_SECONDS = 15 * 60; // 15 minutes

// Module-level cache so opening TopUpOverlay is instant without slow loading
let cachedWalletConfig: {
  balance: number;
  banks: any[];
  isFirstTime: boolean;
  pendingTransactions: any[];
  settings: any;
} | null = null;

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
  const [pendingTransactions, setPendingTransactions] = useState<any[]>(
    cachedWalletConfig?.pendingTransactions || []
  );
  const [currentBalance, setCurrentBalance] = useState<number>(
    cachedWalletConfig?.balance ?? 0
  );
  const [checkingStatus, setCheckingStatus] = useState(false);
  const [downloadingQr, setDownloadingQr] = useState(false);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [isFirstTime, setIsFirstTime] = useState<boolean>(
    cachedWalletConfig?.isFirstTime ?? false
  );
  const [qrisSecondsLeft, setQrisSecondsLeft] = useState<number>(QRIS_EXPIRE_SECONDS);

  // Upload and confirmation states for Bank Transfer top-up
  const [preview, setPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploaded, setUploaded] = useState(false);
  const [paymentProofUrl, setPaymentProofUrl] = useState<string | null>(null);
  const [submittingProof, setSubmittingProof] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // Dynamic configurations from database
  const [banks, setBanks] = useState<any[]>(cachedWalletConfig?.banks || []);
  const [walletSettings, setWalletSettings] = useState<any>(
    cachedWalletConfig?.settings || {
      minTopUp: 10000,
      bonusMinAmount: 100000,
      bonusPercent: 10,
      topUpEnabled: true,
      bonusMode: 'BOTH',
      firstTimePromoEnabled: true,
      firstTimePromoPackages: DEFAULT_FIRST_TIME_PACKAGES,
      qrisExpireMinutes: 15,
    }
  );

  // Whether bank transfer option is available (automatically hidden when no bank accounts exist)
  const hasBankOption = useMemo(() => {
    return Array.isArray(banks) && banks.length > 0 && walletSettings?.transferEnabled !== false;
  }, [banks, walletSettings?.transferEnabled]);

  // Ensure payMethod never stays on 'bank' if bank accounts are empty
  useEffect(() => {
    if (step === 'select' && !hasBankOption && payMethod === 'bank') {
      setPayMethod('qris');
    }
  }, [hasBankOption, payMethod, step]);

  // 15-Minute QRIS Expiration Countdown Timer
  useEffect(() => {
    if (step !== 'payment' || payMethod !== 'qris' || !activeTransaction) {
      return;
    }

    const computeRemaining = () => {
      const expireMs = activeTransaction.expiresAt
        ? new Date(activeTransaction.expiresAt).getTime()
        : new Date(activeTransaction.createdAt || Date.now()).getTime() +
          QRIS_EXPIRE_SECONDS * 1000;
      const diffSec = Math.floor((expireMs - Date.now()) / 1000);
      return Math.max(0, diffSec);
    };

    const initialRemaining = computeRemaining();
    setQrisSecondsLeft(initialRemaining);

    let expiredHandled = false;
    const handleExpired = async () => {
      if (expiredHandled) return;
      expiredHandled = true;
      const expiredTxId = activeTransaction?.id;
      if (expiredTxId) {
        try {
          await fetch('/api/user/wallet', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ transactionId: expiredTxId, action: 'expire' }),
          });
        } catch {
          // Ignore network error on auto-expire
        }
        setPendingTransactions((prev) => prev.filter((p) => p.id !== expiredTxId));
      }
      setActiveTransaction(null);
      setStep('select');
      showToast(
        'Batas waktu pembayaran QRIS (15 menit) telah habis. Transaksi dianggap gagal dan dibatalkan.',
        'error'
      );
      if (refreshWallet) refreshWallet();
    };

    if (initialRemaining <= 0) {
      handleExpired();
      return;
    }

    const timer = setInterval(() => {
      const rem = computeRemaining();
      setQrisSecondsLeft(rem);
      if (rem <= 0) {
        clearInterval(timer);
        handleExpired();
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [step, payMethod, activeTransaction]);

  const formatCountdown = (totalSec: number) => {
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

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
        showToast('Bukti transfer berhasil dipilih. Klik Kirim Bukti Pembayaran.', 'success');
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
    if (!activeTransaction || !paymentProofUrl || payMethod !== 'bank') return;
    setSubmittingProof(true);
    try {
      const res = await fetch('/api/user/wallet', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transactionId: activeTransaction.id,
          paymentProofUrl,
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
          'Bukti transfer berhasil dikirim! Saldo akan masuk setelah diverifikasi.',
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

  // High-resolution QRIS Card builder + real HTTP Content-Disposition attachment download
  const buildCompositeQrisCanvas = (qrCanvas: HTMLCanvasElement): HTMLCanvasElement => {
    const exportCanvas = document.createElement('canvas');
    exportCanvas.width = 600;
    exportCanvas.height = 760;
    const ctx = exportCanvas.getContext('2d');
    if (!ctx) return qrCanvas;

    // 1. Solid cream-white background so gallery viewers in dark mode never invert QR modules
    ctx.fillStyle = '#FFFBF5';
    ctx.fillRect(0, 0, 600, 760);

    // 2. Main card container
    ctx.fillStyle = '#FFFFFF';
    ctx.strokeStyle = '#FDE68A';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.roundRect(24, 24, 552, 712, 28);
    ctx.fill();
    ctx.stroke();

    // 3. Top Espresso Header Banner
    ctx.fillStyle = '#24160E';
    ctx.beginPath();
    ctx.roundRect(24, 24, 552, 118, [28, 28, 0, 0]);
    ctx.fill();

    ctx.textAlign = 'center';
    ctx.fillStyle = '#FBBF24';
    ctx.font = 'bold 15px sans-serif';
    ctx.fillText('ARUM SEDUH • ARUS PAY', 300, 68);

    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 26px serif';
    ctx.fillText('QRIS PEMBAYARAN TOP UP', 300, 108);

    // 4. QR Code Frame
    ctx.fillStyle = '#FFFFFF';
    ctx.strokeStyle = '#FDBA74';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.roundRect(116, 172, 368, 368, 22);
    ctx.fill();
    ctx.stroke();

    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(qrCanvas, 136, 192, 328, 328);

    // 5. Nominal & Metadata Footer
    ctx.fillStyle = '#6B7280';
    ctx.font = 'bold 14px sans-serif';
    ctx.fillText('NOMINAL PEMBAYARAN', 300, 584);

    ctx.fillStyle = '#EA580C';
    ctx.font = 'bold 34px serif';
    ctx.fillText(formatRupiah(displayAmount), 300, 626);

    const codeText = activeTransaction?.paymentCode || 'AS-TOPUP';
    ctx.fillStyle = '#374151';
    ctx.font = 'bold 15px monospace';
    ctx.fillText(`Ref: ${codeText}`, 300, 668);

    ctx.fillStyle = '#9CA3AF';
    ctx.font = '600 13px sans-serif';
    ctx.fillText('Batas waktu pembayaran: 15 Menit sejak kode dibuat', 300, 702);

    return exportCanvas;
  };

  // Pre-warm composite QRIS PNG on server & upgrade DOKU QRIS in background when Step 2 QRIS opens
  useEffect(() => {
    if (step !== 'payment' || payMethod !== 'qris' || !activeTransaction?.id) {
      return;
    }

    let cancelled = false;
    const txId = String(activeTransaction.id);
    const code = String(activeTransaction.paymentCode || 'TOPUP').replace(/[^A-Za-z0-9-_]/g, '');

    const prewarmCanvasToServer = () => {
      if (cancelled) return;
      const qrCanvas = document.getElementById('topup-qris-canvas') as HTMLCanvasElement | null;
      if (!qrCanvas) return;
      try {
        const exportCanvas = buildCompositeQrisCanvas(qrCanvas);
        const pngDataUrl = exportCanvas.toDataURL('image/png', 1.0);
        fetch('/api/user/wallet', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'prepare_qr_download',
            transactionId: txId,
            paymentCode: code,
            qrImageBase64: pngDataUrl,
          }),
          keepalive: true,
        }).catch(() => {});
      } catch {
        // Ignore pre-warm error; server-side QR generator handles fallback
      }
    };

    const timerId = setTimeout(prewarmCanvasToServer, 120);

    if (walletSettings?.dokuEnabled) {
      fetch(`/api/user/wallet?transactionId=${encodeURIComponent(txId)}&qrOnly=1`, {
        signal: AbortSignal.timeout(4000),
      })
        .then((r) => r.json())
        .then((d) => {
          if (!cancelled && d?.success && d.paymentQrContent) {
            setActiveTransaction((prev: any) =>
              prev && prev.id === txId
                ? { ...prev, paymentQrContent: d.paymentQrContent }
                : prev
            );
            setTimeout(prewarmCanvasToServer, 150);
          }
        })
        .catch(() => {});
    }

    return () => {
      cancelled = true;
      clearTimeout(timerId);
    };
  }, [step, payMethod, activeTransaction?.id, activeTransaction?.paymentQrContent, walletSettings?.dokuEnabled]);

  const handleDownloadQr = () => {
    if (downloadingQr) return;
    setDownloadingQr(true);
    try {
      const code = (activeTransaction?.paymentCode || 'TOPUP').replace(/[^A-Za-z0-9-_]/g, '');
      const txId = String(activeTransaction?.id || code);
      const fileName = `QRIS_ARUSPAY_${code}.png`;

      const qrCanvas = document.getElementById('topup-qris-canvas') as HTMLCanvasElement | null;
      if (qrCanvas) {
        try {
          const exportCanvas = buildCompositeQrisCanvas(qrCanvas);
          const pngDataUrl = exportCanvas.toDataURL('image/png', 1.0);
          // Fire non-blocking cache update without awaiting so user gesture activation stays intact
          fetch('/api/user/wallet', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action: 'prepare_qr_download',
              transactionId: txId,
              paymentCode: code,
              qrImageBase64: pngDataUrl,
            }),
            keepalive: true,
          }).catch(() => {});
        } catch {
          // Server fallback generates full scannable QRIS PNG directly
        }
      }

      // Trigger HTTP attachment download synchronously inside the click gesture
      const params = new URLSearchParams({
        downloadQr: '1',
        transactionId: txId,
        code,
        amount: String(displayAmount),
        t: String(Date.now()),
      });
      const downloadUrl = `/api/user/wallet?${params.toString()}`;
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = fileName;
      link.rel = 'noopener';
      link.style.display = 'none';
      document.body.appendChild(link);
      link.click();

      // Keep link in DOM for 60s so browser download confirmation dialog never loses reference
      setTimeout(() => {
        if (link.parentNode) {
          link.parentNode.removeChild(link);
        }
      }, 60000);

      showToast('Gambar QRIS berhasil diunduh ke perangkat Anda!', 'success');
    } catch (error) {
      console.error('Gagal mengunduh QRIS:', error);
      showToast('Gagal mengunduh gambar QRIS.', 'error');
    } finally {
      setTimeout(() => setDownloadingQr(false), 600);
    }
  };

  const loadWalletConfig = () => {
    if (!cachedWalletConfig) {
      setFetchingConfig(true);
    }
    fetch('/api/user/wallet', { signal: AbortSignal.timeout(4000) })
      .then((res) => res.json())
      .then((data) => {
        if (data && !data.error) {
          const loadedBanks = data.banks || [];
          const hasActiveBank =
            Array.isArray(loadedBanks) &&
            loadedBanks.length > 0 &&
            data.settings?.transferEnabled !== false;
          const loadedPending = (data.pendingTransactions || []).filter((ptx: any) => {
            const pMethod = String(ptx.paymentMethod || 'QRIS').toUpperCase();
            if (pMethod === 'QRIS' && ptx.status === 'PENDING') {
              const expMs = ptx.expiresAt
                ? new Date(ptx.expiresAt).getTime()
                : new Date(ptx.createdAt).getTime() + QRIS_EXPIRE_SECONDS * 1000;
              return Date.now() < expMs;
            }
            if (pMethod === 'BANK' && ptx.status === 'PENDING' && !hasActiveBank) {
              return false;
            }
            return true;
          });
          const loadedSettings = data.settings || {
            minTopUp: 10000,
            bonusMinAmount: 100000,
            bonusPercent: 10,
            topUpEnabled: true,
            bonusMode: 'BOTH',
            firstTimePromoEnabled: true,
            firstTimePromoPackages: DEFAULT_FIRST_TIME_PACKAGES,
            qrisExpireMinutes: 15,
          };

          cachedWalletConfig = {
            balance: data.balance ?? 0,
            banks: loadedBanks,
            isFirstTime: !!data.isFirstTime,
            pendingTransactions: loadedPending,
            settings: loadedSettings,
          };

          setCurrentBalance(data.balance ?? 0);
          setBanks(loadedBanks);
          setIsFirstTime(!!data.isFirstTime);
          setPendingTransactions(loadedPending);
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
      setActiveTransaction(null);
      setPreview(null);
      setUploaded(false);
      setPaymentProofUrl(null);
      if (cachedWalletConfig) {
        const s = cachedWalletConfig.settings;
        if (
          cachedWalletConfig.isFirstTime &&
          (s?.bonusMode === 'FIRST_TIME' || s?.bonusMode === 'BOTH') &&
          s?.firstTimePromoEnabled &&
          s?.firstTimePromoPackages?.length > 0
        ) {
          setAmount(String(s.firstTimePromoPackages[0].amount));
        } else {
          setAmount(String(s?.minTopUp || 50000));
        }
      } else {
        setAmount('50000');
      }
      loadWalletConfig();
    }
  }, [isOpen]);

  const minAmt = walletSettings?.minTopUp ?? 10000;
  const bonusAmt = walletSettings?.bonusMinAmount ?? 100000;
  const bonusPercent = walletSettings?.bonusPercent ?? 10;
  const bonusMode = walletSettings?.bonusMode ?? 'BOTH';
  const promoPackages = useMemo(() => {
    const raw = walletSettings?.firstTimePromoPackages;
    if (Array.isArray(raw) && raw.length > 0) {
      if (
        raw.length === 2 &&
        Number(raw[0].amount) === 50000 &&
        Number(raw[0].bonus) === 5000 &&
        Number(raw[1].amount) === 200000 &&
        Number(raw[1].bonus) === 10000
      ) {
        return DEFAULT_FIRST_TIME_PACKAGES;
      }
      return raw;
    }
    return DEFAULT_FIRST_TIME_PACKAGES;
  }, [walletSettings?.firstTimePromoPackages]);

  const isFirstTimePromoActive =
    isFirstTime &&
    (bonusMode === 'FIRST_TIME' || bonusMode === 'BOTH') &&
    (walletSettings?.firstTimePromoEnabled ?? true) &&
    promoPackages.length > 0;

  const isRegularBonusActive =
    !isFirstTimePromoActive &&
    (bonusMode === 'REGULAR' || bonusMode === 'BOTH') &&
    bonusPercent > 0;

  // Build clean 6-card preset grid
  const presets = useMemo(() => {
    const raw = [
      minAmt,
      Math.max(minAmt, 25000),
      Math.max(minAmt * 2, 50000),
      100000,
      150000,
      200000,
    ];
    return Array.from(new Set(raw)).sort((a, b) => a - b).slice(0, 6);
  }, [minAmt]);

  // Calculate bonus for any given nominal in real time
  const getBonusForAmount = (
    val: number
  ): { bonus: number; label: string; type: 'FIRST_TIME' | 'REGULAR' | 'NONE' } => {
    if (!val || isNaN(val) || val <= 0) {
      return { bonus: 0, label: '', type: 'NONE' };
    }
    if (isFirstTimePromoActive) {
      const sortedDesc = [...promoPackages].sort((a, b) => Number(b.amount) - Number(a.amount));
      const matchedPkg =
        promoPackages.find((p: any) => Number(p.amount) === val) ||
        sortedDesc.find((p: any) => val >= Number(p.amount));
      if (matchedPkg && Number(matchedPkg.bonus) > 0) {
        return {
          bonus: Number(matchedPkg.bonus),
          label: `Bonus Isi Pertama +${formatRupiah(Number(matchedPkg.bonus))}`,
          type: 'FIRST_TIME',
        };
      }
      return { bonus: 0, label: '', type: 'NONE' };
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
    step === 'select' || !activeTransaction
      ? currentBonusInfo.bonus
      : Number(activeTransaction.promoBonus || 0);
  const displayAmount =
    step === 'select' || !activeTransaction
      ? parsedAmount
      : Number(activeTransaction.amount || parsedAmount);
  const totalToReceive = displayAmount + activeBonus;

  const availableMethods = useMemo(() => {
    const list: Array<{
      id: 'qris' | 'bank' | 'offline';
      label: string;
      sub: string;
      icon: any;
    }> = [
      {
        id: 'qris',
        label: 'QRIS Instan',
        sub: 'Batas 15 Menit',
        icon: QrCode,
      },
    ];
    if (hasBankOption) {
      list.push({
        id: 'bank',
        label: 'Transfer Bank',
        sub: `${banks.length} Rekening Aktif`,
        icon: Building2,
      });
    }
    list.push({
      id: 'offline',
      label: 'Kasir Booth',
      sub: 'Bayar di Outlet',
      icon: Store,
    });
    return list;
  }, [hasBankOption, banks.length]);

  if (!isOpen) return null;

  const handleProceedToPayment = async (overrideAmount?: number) => {
    const finalAmount = overrideAmount ?? parsedAmount;
    if (!finalAmount || isNaN(finalAmount) || finalAmount < minAmt) {
      showToast(`Masukkan jumlah top up minimal ${formatRupiah(minAmt)}`, 'error');
      return;
    }
    const chosenMethod = !hasBankOption && payMethod === 'bank' ? 'qris' : payMethod;
    setPayMethod(chosenMethod);
    setAmount(String(finalAmount));
    setLoading(true);
    try {
      const res = await fetch('/api/user/wallet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: finalAmount, paymentMethod: chosenMethod }),
      });
      const d = await res.json();
      if (res.ok && d.success && d.transaction) {
        setActiveTransaction(d.transaction);
        setPreview(null);
        setUploaded(false);
        setPaymentProofUrl(null);
        setQrisSecondsLeft(QRIS_EXPIRE_SECONDS);
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

  const handleResumePending = (tx: any) => {
    const methodLower = String(tx.paymentMethod || 'QRIS').toLowerCase();
    if (methodLower === 'qris') {
      const expMs = tx.expiresAt
        ? new Date(tx.expiresAt).getTime()
        : new Date(tx.createdAt).getTime() + QRIS_EXPIRE_SECONDS * 1000;
      if (Date.now() >= expMs) {
        handleCancelPending(tx.id, true);
        return;
      }
    }

    setActiveTransaction(tx);
    setAmount(String(tx.amount));
    if (methodLower === 'bank') {
      if (tx.status === 'VERIFYING') {
        setPayMethod('bank');
        setPreview(tx.paymentProofUrl || null);
        setPaymentProofUrl(tx.paymentProofUrl || null);
        setUploaded(!!tx.paymentProofUrl);
        setStep('verifying');
        return;
      }
      if (hasBankOption) {
        setPayMethod('bank');
      } else {
        handleCancelPending(tx.id, false);
        return;
      }
    } else if (methodLower === 'offline') {
      setPayMethod('offline');
    } else {
      setPayMethod('qris');
    }
    if (tx.paymentProofUrl && methodLower === 'bank') {
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

  const handleCancelPending = async (txId: string, isExpired = false) => {
    setCancellingId(txId);
    try {
      const res = await fetch('/api/user/wallet', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transactionId: txId,
          action: isExpired ? 'expire' : 'cancel',
        }),
      });
      if (res.ok) {
        setPendingTransactions((prev) => prev.filter((p) => p.id !== txId));
        showToast(
          isExpired
            ? 'Transaksi QRIS telah melewati batas 15 menit dan dibatalkan.'
            : 'Transaksi top up berhasil dibatalkan.',
          isExpired ? 'error' : 'success'
        );
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
          setPendingTransactions((prev) =>
            prev.filter((p) => p.id !== activeTransaction.id)
          );
          setStep('success');
          showToast(
            `Top Up berhasil! Saldo Arus Pay bertambah ${formatRupiah(
              d.totalReceived || d.amount
            )}`,
            'success'
          );
          if (refreshWallet) refreshWallet();
        } else if (d.status === 'REJECTED' || d.expired) {
          setPendingTransactions((prev) =>
            prev.filter((p) => p.id !== activeTransaction.id)
          );
          setActiveTransaction(null);
          setStep('select');
          showToast(
            d.error ||
              'Transaksi telah melewati batas waktu atau dibatalkan.',
            'error'
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
            payMethod === 'qris'
              ? 'Pembayaran QRIS belum terdeteksi. Silakan scan kode QRIS sebelum batas waktu 15 menit berakhir.'
              : payMethod === 'bank'
              ? 'Silakan unggah foto bukti transfer bank Anda terlebih dahulu.'
              : 'Silakan tunjukkan kode tiket ke Kasir Booth Arum Seduh untuk konfirmasi.',
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

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    showToast('Berhasil disalin ke clipboard!', 'success');
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const stepIndex = step === 'select' ? 1 : step === 'payment' ? 2 : 3;
  const qrValueString =
    activeTransaction?.paymentQrContent ||
    `00020101021226670016ID.CO.ARUMSEDUH.WWW01189360091430000000005204581253033605802ID5910ARUM SEDUH6007JAKARTA62070703A016304ABCD`;

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
                      ? payMethod === 'qris'
                        ? 'Pembayaran QRIS'
                        : payMethod === 'bank'
                        ? 'Transfer Bank'
                        : 'Bayar di Kasir Booth'
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
                  {fetchingConfig && !cachedWalletConfig
                    ? 'Memuat...'
                    : formatRupiah(currentBalance)}
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

          {/* STEP 1: SELECT NOMINAL & PAYMENT METHOD */}
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
                      {pendingTransactions.slice(0, 2).map((ptx) => {
                        const methodLabel =
                          ptx.paymentMethod === 'BANK'
                            ? 'Transfer Bank'
                            : ptx.paymentMethod === 'OFFLINE'
                            ? 'Kasir Booth'
                            : 'QRIS';
                        return (
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
                              <p className="text-[10px] font-semibold text-gray-500 truncate">
                                {methodLabel} •{' '}
                                {ptx.status === 'VERIFYING'
                                  ? 'Menunggu Verifikasi'
                                  : 'Menunggu Pembayaran'}
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
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* 1. FIRST-TIME PROMO PACKAGES (50rb -> 3.000, 100rb -> 5.000, 200rb -> 10.000) */}
                {isFirstTimePromoActive && (
                  <div className="space-y-3">
                    <div className="bg-gradient-to-r from-orange-500/10 via-amber-500/10 to-orange-500/5 border border-orange-300/60 rounded-2xl p-3.5 flex items-start gap-3 relative overflow-hidden">
                      <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-orange-500 to-amber-500 text-white flex items-center justify-center shrink-0 shadow-sm">
                        <Gift className="w-4.5 h-4.5" />
                      </div>
                      <div className="space-y-0.5 flex-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-xs font-black text-orange-800">
                            Bonus Spesial Pengisian Pertama!
                          </span>
                          <span className="px-1.5 py-0.5 text-[8.5px] font-black uppercase bg-orange-600 text-white rounded-full">
                            Perdana
                          </span>
                        </div>
                        <p className="text-[10.5px] text-gray-600 font-medium leading-relaxed">
                          Isi Rp 50.000 bonus Rp 3.000 • Rp 100.000 bonus Rp 5.000 • Rp 200.000 bonus Rp 10.000
                        </p>
                      </div>
                    </div>

                    <div
                      className={`grid gap-2.5 ${
                        promoPackages.length === 3
                          ? 'grid-cols-1 sm:grid-cols-3'
                          : 'grid-cols-1 sm:grid-cols-2'
                      }`}
                    >
                      {promoPackages.map((pkg: any, idx: number) => {
                        const pkgAmt = Number(pkg.amount);
                        const pkgBonus = Number(pkg.bonus);
                        const isSelected = parsedAmount === pkgAmt;
                        return (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => setAmount(String(pkgAmt))}
                            className={`relative p-3 rounded-2xl border-2 text-left transition-all cursor-pointer flex flex-col justify-between gap-2 active:scale-[0.98] ${
                              isSelected
                                ? 'border-orange-500 bg-gradient-to-br from-orange-50/95 to-amber-50/70 shadow-md shadow-orange-500/10'
                                : 'border-amber-200/80 bg-white hover:border-orange-300'
                            }`}
                          >
                            <div className="flex items-start justify-between w-full gap-1">
                              <div>
                                <span className="text-[9px] font-black uppercase tracking-wider text-orange-600 block">
                                  Paket {idx + 1}
                                </span>
                                <span className="text-sm font-black text-gray-900 font-serif">
                                  {formatRupiah(pkgAmt)}
                                </span>
                              </div>
                              <div
                                className={`w-4.5 h-4.5 rounded-full border flex items-center justify-center shrink-0 ${
                                  isSelected
                                    ? 'bg-orange-500 border-orange-500 text-white'
                                    : 'border-gray-300 bg-white'
                                }`}
                              >
                                {isSelected && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                              </div>
                            </div>

                            <div className="pt-1.5 border-t border-amber-200/50 flex flex-col gap-0.5 w-full">
                              <span className="inline-flex items-center gap-1 text-[9.5px] font-extrabold text-orange-700 bg-orange-100/80 px-1.5 py-0.5 rounded-md w-fit">
                                <Sparkles className="w-2.5 h-2.5 shrink-0" />
                                <span>+{formatRupiah(pkgBonus)}</span>
                              </span>
                              <span className="text-[10px] font-black text-gray-700 mt-0.5">
                                Terima {formatRupiah(pkgAmt + pkgBonus)}
                              </span>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* 2. REGULAR BONUS INTERACTIVE BANNER (FOR REPEAT TOP-UPS) */}
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
                              : 'Saldo Arus Pay'}
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

                {/* 5. PAYMENT METHOD SELECTION (Bank automatically hidden if no active bank accounts) */}
                <div className="space-y-2.5">
                  <label className="text-[10.5px] font-black text-gray-500 uppercase tracking-wider block">
                    Pilih Metode Pembayaran
                  </label>
                  <div
                    className={`grid gap-2.5 ${
                      availableMethods.length === 2 ? 'grid-cols-2' : 'grid-cols-3'
                    }`}
                  >
                    {availableMethods.map((m) => {
                      const Icon = m.icon;
                      const isActive = payMethod === m.id;
                      return (
                        <button
                          key={m.id}
                          type="button"
                          onClick={() => setPayMethod(m.id)}
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
                      <span>{currentBonusInfo.label || 'Bonus Promo Arus Pay'}</span>
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
                      <span>Lanjutkan Pembayaran • {formatRupiah(parsedAmount)}</span>
                      <ChevronRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            </>
          )}

          {/* STEP 2: SINGLE SELECTED PAYMENT METHOD VIEW */}
          {step === 'payment' && (
            <>
              <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5 text-left">
                {/* Back & Selected Method Summary Card */}
                <div className="bg-white rounded-2xl border border-amber-200/80 p-4 space-y-3 shadow-sm">
                  <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                    <button
                      type="button"
                      onClick={() => setStep('select')}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-gray-200 text-[11px] font-black text-gray-700 hover:bg-gray-50 transition-all cursor-pointer"
                    >
                      <ArrowLeft className="w-3.5 h-3.5" />
                      <span>Kembali</span>
                    </button>

                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-gradient-to-r from-orange-50 to-amber-50 border border-orange-200/80 text-[10.5px] font-black uppercase tracking-wider text-orange-800">
                      {payMethod === 'qris' ? (
                        <>
                          <QrCode className="w-3.5 h-3.5 text-orange-600" />
                          <span>Metode: QRIS Instan</span>
                        </>
                      ) : payMethod === 'bank' ? (
                        <>
                          <Building2 className="w-3.5 h-3.5 text-orange-600" />
                          <span>Metode: Transfer Bank</span>
                        </>
                      ) : (
                        <>
                          <Store className="w-3.5 h-3.5 text-orange-600" />
                          <span>Metode: Kasir Booth</span>
                        </>
                      )}
                    </span>
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

                {/* SELECTED METHOD 1: QRIS (WITH 15-MINUTE EXPIRY TIMER & DOWNLOAD ONLY) */}
                {payMethod === 'qris' && (
                  <div className="space-y-4">
                    {/* 15-Minute Expiry Countdown Bar */}
                    <div
                      className={`rounded-2xl p-3.5 border flex items-center justify-between gap-3 ${
                        qrisSecondsLeft <= 180
                          ? 'bg-rose-50 border-rose-200 text-rose-900'
                          : 'bg-amber-50/90 border-amber-200 text-amber-950'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <div
                          className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                            qrisSecondsLeft <= 180
                              ? 'bg-rose-500 text-white'
                              : 'bg-gradient-to-br from-orange-500 to-amber-500 text-white'
                          }`}
                        >
                          <Clock className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="text-[11px] font-black uppercase tracking-wider">
                            Batas Waktu Pembayaran QRIS
                          </p>
                          <p className="text-[10px] text-gray-600 font-semibold">
                            Otomatis batal jika melewati 15 menit
                          </p>
                        </div>
                      </div>
                      <div className="px-3 py-1.5 rounded-xl bg-white border border-amber-200/80 font-mono text-sm font-black text-orange-600 shrink-0 shadow-2xs">
                        {formatCountdown(qrisSecondsLeft)}
                      </div>
                    </div>

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
                          GPN • 15 Menit
                        </span>
                      </div>

                      {/* QR Code Canvas & Hidden SVG for Server PNG Generation */}
                      <div className="relative p-3.5 bg-white rounded-2xl border-2 border-amber-200 shadow-sm flex items-center justify-center">
                        <QRCodeCanvas
                          id="topup-qris-canvas"
                          value={qrValueString}
                          size={220}
                          level="M"
                          includeMargin={true}
                          marginSize={2}
                          className="block rounded-lg"
                        />
                        <div className="hidden" aria-hidden="true">
                          <QRCodeSVG
                            id="topup-qris-svg"
                            value={qrValueString}
                            size={220}
                            level="M"
                            includeMargin={true}
                            marginSize={2}
                          />
                        </div>
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

                      {/* Single full-width Download QRIS button (No Salin Kode here) */}
                      <div className="w-full mt-4 pt-3.5 border-t border-gray-100">
                        <button
                          type="button"
                          disabled={downloadingQr}
                          onClick={handleDownloadQr}
                          className="w-full py-3 px-4 bg-amber-50 hover:bg-amber-100 text-amber-950 border border-amber-200 font-extrabold rounded-xl transition-all flex items-center justify-center gap-2 active:scale-[0.98] text-xs cursor-pointer"
                        >
                          {downloadingQr ? (
                            <>
                              <Loader2 className="w-4 h-4 animate-spin text-orange-600" />
                              <span>Menyiapkan File Gambar QRIS...</span>
                            </>
                          ) : (
                            <>
                              <Download className="w-4 h-4 text-orange-600" />
                              <span>Unduh Gambar QRIS</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* SELECTED METHOD 2: BANK TRANSFER (WITH PAYMENT PROOF UPLOADER) */}
                {payMethod === 'bank' && (
                  <div className="space-y-4">
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
                                <span>Salin No. Rek</span>
                              </>
                            )}
                          </button>
                        </div>
                      ))}
                    </div>

                    <div className="bg-amber-50/80 border border-amber-200 rounded-2xl p-3.5 flex items-start gap-2.5">
                      <Info className="w-4 h-4 text-orange-600 shrink-0 mt-0.5" />
                      <p className="text-[11px] text-gray-700 font-semibold leading-relaxed">
                        Transfer tepat sebesar{' '}
                        <span className="text-orange-700 font-black">
                          {formatRupiah(displayAmount)}
                        </span>{' '}
                        lalu unggah foto struk/bukti transfer bank pada kotak di bawah ini.
                      </p>
                    </div>

                    {/* PAYMENT PROOF UPLOADER (EXCLUSIVE TO BANK TRANSFER) */}
                    <div className="bg-white border border-amber-200/80 rounded-3xl p-4 space-y-3 shadow-sm">
                      <div className="flex items-center justify-between">
                        <h4 className="text-xs font-black text-gray-800 flex items-center gap-1.5">
                          <Upload className="w-4 h-4 text-orange-600" />
                          <span>Unggah Bukti Pembayaran</span>
                        </h4>
                        <span className="text-[9.5px] font-bold text-gray-400">
                          Khusus Transfer Bank
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
                            Klik untuk pilih foto bukti transfer bank
                          </span>
                          <span className="text-[10px] text-gray-400">
                            JPG / PNG / WebP • Otomatis dikompresi
                          </span>
                        </button>
                      ) : (
                        <div className="relative rounded-2xl overflow-hidden border border-amber-200 bg-gray-50">
                          <img
                            src={preview}
                            alt="Bukti Transfer Bank"
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
                              <span>Mengirim Bukti Transfer...</span>
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
                  </div>
                )}

                {/* SELECTED METHOD 3: KASIR BOOTH / OFFLINE (WITH EXCLUSIVE SALIN KODE) */}
                {payMethod === 'offline' && (
                  <div className="bg-white border-2 border-dashed border-amber-300 rounded-3xl p-5 text-center space-y-4 shadow-sm">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-orange-500 to-amber-500 text-white flex items-center justify-center mx-auto shadow-md">
                      <Store className="w-6 h-6" />
                    </div>

                    <div className="space-y-2">
                      <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">
                        Kode Tiket Top Up Kasir Booth
                      </p>
                      <div className="inline-flex items-center gap-2.5 bg-amber-50 border border-amber-200 px-4 py-2.5 rounded-2xl">
                        <span className="text-lg font-mono font-black text-orange-600 tracking-widest">
                          {activeTransaction?.paymentCode || 'AS-TOPUP'}
                        </span>
                      </div>
                      <div>
                        <button
                          type="button"
                          onClick={() =>
                            handleCopy(
                              activeTransaction?.paymentCode || 'AS-TOPUP',
                              'ticket-code'
                            )
                          }
                          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white text-xs font-black uppercase tracking-wider shadow-sm transition-all active:scale-95 cursor-pointer"
                        >
                          {copiedKey === 'ticket-code' ? (
                            <>
                              <Check className="w-3.5 h-3.5" />
                              <span>Kode Tersalin</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3.5 h-3.5" />
                              <span>Salin Kode</span>
                            </>
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
                      <p>1. Salin atau tunjukkan kode tiket di atas kepada Kasir Arum Seduh.</p>
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
              </div>

              {/* STICKY FOOTER STEP 2 */}
              <div className="p-4 sm:px-6 bg-white border-t border-amber-100 shrink-0 space-y-2">
                <button
                  type="button"
                  onClick={handleCheckStatus}
                  disabled={checkingStatus}
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
                    : 'Tim Kasir Arum Seduh sedang memverifikasi bukti transfer Anda. Saldo akan otomatis bertambah setelah disetujui.'}
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
