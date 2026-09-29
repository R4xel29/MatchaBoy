'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ShieldCheck,
  Wallet,
  X,
  Loader2,
  Delete,
  Lock,
  ArrowLeft,
  AlertCircle,
  Sparkles,
} from 'lucide-react';
import { formatRupiah } from '@/lib/utils';

export interface ArusPayPinModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (verifiedPin: string) => void | Promise<void>;
  amount?: number;
  description?: string;
  mode?: 'verify' | 'change';
}

type PinStep = 'verify' | 'verify_old' | 'create' | 'confirm';

export function ArusPayPinModal({
  isOpen,
  onClose,
  onSuccess,
  amount,
  description = 'Pembayaran Saldo Arus Pay',
  mode = 'verify',
}: ArusPayPinModalProps) {
  const [step, setStep] = useState<PinStep>('verify');
  const [pin, setPin] = useState('');
  const [oldPin, setOldPin] = useState('');
  const [newPinDraft, setNewPinDraft] = useState('');
  const [loading, setLoading] = useState(false);
  const [checkingStatus, setCheckingStatus] = useState(false);
  const [error, setError] = useState('');

  // Reset and check if user already has a PIN when modal opens
  useEffect(() => {
    if (!isOpen) {
      setPin('');
      setOldPin('');
      setNewPinDraft('');
      setError('');
      setLoading(false);
      return;
    }

    let isMounted = true;
    setPin('');
    setOldPin('');
    setNewPinDraft('');
    setError('');
    setCheckingStatus(true);

    fetch('/api/user/setup/pin')
      .then((res) => res.json())
      .then((data) => {
        if (!isMounted) return;
        const hasPin = !!data?.hasPin;
        if (mode === 'change') {
          setStep(hasPin ? 'verify_old' : 'create');
        } else {
          setStep(hasPin ? 'verify' : 'create');
        }
      })
      .catch(() => {
        if (!isMounted) return;
        setStep(mode === 'change' ? 'verify_old' : 'verify');
      })
      .finally(() => {
        if (isMounted) setCheckingStatus(false);
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen, mode]);

  const verifyExistingPin = useCallback(
    async (enteredPin: string, isOldPinCheck: boolean) => {
      setLoading(true);
      setError('');
      try {
        const res = await fetch('/api/user/setup/pin', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'verify', pin: enteredPin }),
        });
        const data = await res.json().catch(() => ({}));

        if (res.ok && data.valid) {
          if (isOldPinCheck) {
            setOldPin(enteredPin);
            setPin('');
            setStep('create');
            setLoading(false);
          } else {
            await onSuccess(enteredPin);
            setLoading(false);
          }
        } else if (data.code === 'PIN_NOT_SET') {
          setPin('');
          setStep('create');
          setLoading(false);
        } else {
          setError(data.error || 'PIN Arum Seduh tidak sesuai. Silakan coba lagi.');
          setLoading(false);
          setTimeout(() => {
            setPin('');
          }, 700);
        }
      } catch {
        setError('Gagal memverifikasi PIN. Periksa koneksi Anda.');
        setLoading(false);
        setTimeout(() => {
          setPin('');
        }, 700);
      }
    },
    [onSuccess]
  );

  const saveAndCompletePin = useCallback(
    async (finalPin: string) => {
      setLoading(true);
      setError('');
      try {
        const payload: Record<string, string> = { pin: finalPin };
        if (mode === 'change' && oldPin) {
          payload.action = 'change';
          payload.currentPin = oldPin;
        }
        const res = await fetch('/api/user/setup/pin', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        const data = await res.json().catch(() => ({}));

        if (res.ok && data.success) {
          await onSuccess(finalPin);
          setLoading(false);
        } else {
          setError(data.error || 'Gagal menyimpan PIN Arum Seduh. Coba lagi.');
          setLoading(false);
          setTimeout(() => {
            setPin('');
          }, 700);
        }
      } catch {
        setError('Terjadi kesalahan jaringan. Coba lagi.');
        setLoading(false);
        setTimeout(() => {
          setPin('');
        }, 700);
      }
    },
    [mode, oldPin, onSuccess]
  );

  const handleNumberClick = useCallback(
    (num: string) => {
      if (loading || checkingStatus) return;
      if (pin.length >= 6) return;

      const nextPin = pin + num;
      setPin(nextPin);
      setError('');

      if (nextPin.length === 6) {
        if (step === 'verify') {
          verifyExistingPin(nextPin, false);
        } else if (step === 'verify_old') {
          verifyExistingPin(nextPin, true);
        } else if (step === 'create') {
          setTimeout(() => {
            setNewPinDraft(nextPin);
            setPin('');
            setStep('confirm');
            setError('');
          }, 220);
        } else if (step === 'confirm') {
          if (nextPin === newPinDraft) {
            saveAndCompletePin(nextPin);
          } else {
            setError('PIN tidak cocok. Silakan ulangi 6 angka PIN Anda.');
            setTimeout(() => {
              setPin('');
            }, 900);
          }
        }
      }
    },
    [
      loading,
      checkingStatus,
      pin,
      step,
      newPinDraft,
      verifyExistingPin,
      saveAndCompletePin,
    ]
  );

  const handleBackspace = useCallback(() => {
    if (loading || checkingStatus) return;
    if (pin.length > 0) {
      setPin((prev) => prev.slice(0, -1));
      setError('');
    }
  }, [loading, checkingStatus, pin.length]);

  // Physical keyboard support for numbers, backspace, and escape
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key >= '0' && e.key <= '9') {
        e.preventDefault();
        handleNumberClick(e.key);
      } else if (e.key === 'Backspace') {
        e.preventDefault();
        handleBackspace();
      } else if (e.key === 'Escape' && !loading) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, handleNumberClick, handleBackspace, loading, onClose]);

  if (!isOpen) return null;

  const titleText =
    step === 'verify'
      ? 'Masukkan PIN Arum Seduh'
      : step === 'verify_old'
      ? 'Masukkan PIN Saat Ini'
      : step === 'create'
      ? mode === 'change'
        ? 'Buat PIN Arum Seduh Baru'
        : 'Buat PIN Arum Seduh'
      : 'Ulangi PIN Arum Seduh';

  const subtitleText =
    step === 'verify'
      ? 'Masukkan 6 angka PIN keamanan yang Anda buat pertama kali untuk melanjutkan pembayaran Arus Pay'
      : step === 'verify_old'
      ? 'Masukkan 6 angka PIN Arum Seduh lama Anda untuk verifikasi keamanan'
      : step === 'create'
      ? 'Masukkan 6 angka untuk menjaga keamanan akun Arum Seduh & pelindung pembayaran Arus Pay'
      : 'Masukkan kembali 6 angka PIN untuk konfirmasi';

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[220] flex items-end sm:items-center justify-center bg-black/65 backdrop-blur-sm p-0 sm:p-4 select-none">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => {
            if (!loading) onClose();
          }}
          className="absolute inset-0"
        />

        <motion.div
          initial={{ y: '100%', opacity: 0.5 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: '100%', opacity: 0 }}
          transition={{ type: 'spring', damping: 28, stiffness: 280 }}
          className="relative z-10 w-full max-w-md bg-[#FFFBF5] rounded-t-[2.5rem] sm:rounded-[2.5rem] border border-orange-100 shadow-2xl overflow-hidden flex flex-col max-h-[94dvh]"
        >
          {/* Top Header Banner */}
          <div className="px-6 pt-5 pb-4 bg-gradient-to-br from-[#24160E] via-[#2F1D12] to-[#180E08] text-white relative overflow-hidden">
            <div className="absolute -top-10 -right-10 w-32 h-32 bg-orange-500/20 rounded-full blur-2xl pointer-events-none" />

            <div className="flex items-center justify-between relative z-10">
              <div className="flex items-center gap-2">
                {step === 'confirm' ? (
                  <button
                    type="button"
                    onClick={() => {
                      if (loading) return;
                      setStep('create');
                      setPin('');
                      setNewPinDraft('');
                      setError('');
                    }}
                    className="px-2.5 py-1 rounded-xl bg-white/10 hover:bg-white/15 text-amber-300 text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>Ubah PIN</span>
                  </button>
                ) : (
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-400/15 border border-amber-400/30 text-amber-300 text-[10px] font-black uppercase tracking-wider">
                    <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
                    <span>Arum Seduh • Proteksi Arus Pay</span>
                  </div>
                )}
              </div>

              <button
                type="button"
                disabled={loading}
                onClick={onClose}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white/80 hover:text-white transition-colors cursor-pointer disabled:opacity-40"
                aria-label="Tutup"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Transaction Summary Strip (shown when paying with Arus Pay) */}
            {mode === 'verify' && typeof amount === 'number' && amount > 0 && (
              <div className="mt-3.5 p-3.5 rounded-2xl bg-white/10 border border-white/15 flex items-center justify-between gap-3 relative z-10">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center text-white shrink-0 shadow-sm">
                    <Wallet className="w-4.5 h-4.5" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-amber-200/90 truncate">
                      {description}
                    </p>
                    <p className="text-xs text-white/80 font-medium truncate">
                      Potong Saldo Arus Pay
                    </p>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <span className="font-serif font-black text-base text-amber-300">
                    {formatRupiah(amount)}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Main PIN Display Area */}
          <div className="px-6 pt-6 pb-4 flex flex-col items-center text-center">
            <div className="w-12 h-12 rounded-2xl bg-orange-50 border border-orange-200/70 flex items-center justify-center text-orange-600 mb-3 shadow-xs">
              <Lock className="w-5 h-5" />
            </div>

            <h3 className="font-serif font-black text-xl text-gray-900">
              {titleText}
            </h3>
            <p className="text-xs text-gray-500 font-medium max-w-[280px] leading-relaxed mt-1 mb-6">
              {subtitleText}
            </p>

            {/* 6-Digit PIN Circles (Matching SetupPinClient style) */}
            <div className="flex justify-center gap-3.5 sm:gap-4 mb-4 w-full">
              {[0, 1, 2, 3, 4, 5].map((index) => {
                const isFilled = index < pin.length;
                return (
                  <motion.div
                    key={index}
                    initial={false}
                    animate={{
                      scale: isFilled ? 1.05 : 0.92,
                      borderColor: error
                        ? '#EF4444'
                        : isFilled
                        ? '#F97316'
                        : '#D1D5DB',
                      backgroundColor: error
                        ? '#EF4444'
                        : isFilled
                        ? '#F97316'
                        : 'transparent',
                    }}
                    transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                    className="w-10 h-10 rounded-full border-2 flex items-center justify-center shadow-xs"
                  >
                    {isFilled && (
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="w-2.5 h-2.5 rounded-full bg-white"
                      />
                    )}
                  </motion.div>
                );
              })}
            </div>

            {/* Error or Loading Feedback */}
            <div className="min-h-[28px] flex items-center justify-center">
              <AnimatePresence mode="wait">
                {loading || checkingStatus ? (
                  <motion.div
                    key="loading"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="flex items-center gap-2 text-xs font-bold text-orange-600"
                  >
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>
                      {checkingStatus
                        ? 'Memeriksa keamanan PIN...'
                        : 'Memverifikasi PIN Arum Seduh...'}
                    </span>
                  </motion.div>
                ) : error ? (
                  <motion.div
                    key="error"
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    className="flex items-center gap-1.5 text-xs text-red-600 font-bold bg-red-50 border border-red-200 px-3 py-1.5 rounded-xl"
                  >
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>{error}</span>
                  </motion.div>
                ) : (
                  <motion.div
                    key="hint"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="flex items-center gap-1 text-[11px] text-gray-400 font-semibold"
                  >
                    <Sparkles className="w-3 h-3 text-amber-500" />
                    <span>Transaksi otomatis diproses saat 6 angka terisi</span>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Number Pad */}
          <div className="px-8 pb-7 pt-2 bg-white border-t border-orange-100/80">
            <div className="grid grid-cols-3 gap-y-3.5 gap-x-6 max-w-xs mx-auto">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                <button
                  key={num}
                  type="button"
                  onClick={() => handleNumberClick(num.toString())}
                  disabled={loading || checkingStatus}
                  className="text-2xl font-bold text-gray-800 flex items-center justify-center h-14 rounded-2xl hover:bg-orange-50 active:bg-orange-100 active:scale-95 transition-all disabled:opacity-40 cursor-pointer"
                >
                  {num}
                </button>
              ))}
              <div className="flex items-center justify-center">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={loading}
                  className="text-xs font-extrabold text-gray-400 hover:text-gray-600 uppercase tracking-wider py-2 px-3 rounded-xl transition-colors cursor-pointer"
                >
                  Batal
                </button>
              </div>
              <button
                type="button"
                onClick={() => handleNumberClick('0')}
                disabled={loading || checkingStatus}
                className="text-2xl font-bold text-gray-800 flex items-center justify-center h-14 rounded-2xl hover:bg-orange-50 active:bg-orange-100 active:scale-95 transition-all disabled:opacity-40 cursor-pointer"
              >
                0
              </button>
              <button
                type="button"
                onClick={handleBackspace}
                disabled={loading || checkingStatus || pin.length === 0}
                className="flex items-center justify-center h-14 rounded-2xl hover:bg-orange-50 active:bg-orange-100 active:scale-95 transition-all text-gray-600 disabled:opacity-30 cursor-pointer"
                aria-label="Hapus angka"
              >
                <Delete className="w-6 h-6" />
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

export default ArusPayPinModal;
