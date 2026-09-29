'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, ShieldCheck, ArrowLeft, Delete } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function SetupPinClient() {
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [step, setStep] = useState<'create' | 'confirm'>('create');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  const currentPin = step === 'create' ? pin : confirmPin;

  const handleNumberClick = (num: string) => {
    if (loading) return;
    if (step === 'create') {
      if (pin.length < 6) {
        const newPin = pin + num;
        setPin(newPin);
        if (newPin.length === 6) {
          // Move to confirmation step after a short delay
          setTimeout(() => {
            setStep('confirm');
            setError('');
          }, 300);
        }
      }
    } else {
      if (confirmPin.length < 6) {
        const newConfirm = confirmPin + num;
        setConfirmPin(newConfirm);
        if (newConfirm.length === 6) {
          // Check if PINs match
          if (newConfirm === pin) {
            submitPin(newConfirm);
          } else {
            setError('PIN tidak cocok. Silakan ulangi.');
            setTimeout(() => {
              setConfirmPin('');
              setError('');
            }, 1200);
          }
        }
      }
    }
  };

  const handleBackspace = () => {
    if (loading) return;
    if (step === 'create') {
      if (pin.length > 0) {
        setPin(pin.slice(0, -1));
      }
    } else {
      if (confirmPin.length > 0) {
        setConfirmPin(confirmPin.slice(0, -1));
      }
    }
    setError('');
  };

  const handleBack = () => {
    setStep('create');
    setPin('');
    setConfirmPin('');
    setError('');
  };

  const submitPin = async (finalPin: string) => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/user/setup/pin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin: finalPin }),
      });
      if (res.ok) {
        // Redirect to setup-profile (name step) directly
        router.push('/setup-profile');
        router.refresh();
      } else {
        const data = await res.json().catch(() => ({}));
        setError(data.error || 'Gagal menyimpan PIN. Coba lagi.');
        setConfirmPin('');
      }
    } catch (err) {
      console.error(err);
      setError('Terjadi kesalahan. Coba lagi.');
      setConfirmPin('');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-orange-50/60 via-[#FFFBF7] to-amber-50/40 flex flex-col justify-between pt-10 pb-safe">
      <div className="flex-1 flex flex-col items-center px-6 max-w-md w-full mx-auto">
        {/* Step Progress Indicator */}
        <div className="w-full mb-6">
          <div className="flex items-center justify-between text-[11px] font-black uppercase tracking-wider text-orange-600 mb-2">
            <span>Langkah 1 dari 2</span>
            <span>Keamanan PIN</span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="h-1.5 rounded-full bg-gradient-to-r from-orange-500 to-amber-500 shadow-xs" />
            <div className="h-1.5 rounded-full bg-orange-200/50" />
          </div>
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: step === 'confirm' ? 30 : -30 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: step === 'confirm' ? -30 : 30 }}
            transition={{ duration: 0.25 }}
            className="flex flex-col items-center w-full bg-white/90 backdrop-blur-sm border border-orange-100 rounded-3xl p-6 shadow-[0_12px_35px_rgba(249,115,22,0.08)]"
          >
            {step === 'confirm' && (
              <button
                onClick={handleBack}
                className="self-start mb-3 text-xs text-orange-600 font-black flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-orange-50 hover:bg-orange-100 transition-colors active:opacity-70 cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                Ubah PIN
              </button>
            )}

            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-orange-500 to-amber-500 text-white flex items-center justify-center mb-3.5 shadow-lg shadow-orange-500/25 ring-4 ring-orange-50">
              <ShieldCheck className="w-7 h-7" />
            </div>

            <span className="text-[10px] font-black uppercase tracking-widest text-orange-600 bg-orange-50 border border-orange-200/70 px-3 py-1 rounded-full mb-2">
              Arum Seduh • Proteksi Arus Pay
            </span>

            <h1 className="text-2xl font-bold text-gray-900 mb-1.5 font-serif text-center">
              {step === 'create' ? 'Buat PIN Keamanan' : 'Konfirmasi PIN Anda'}
            </h1>
            <p className="text-xs text-gray-500 text-center max-w-[280px] leading-relaxed mb-6 font-medium">
              {step === 'create'
                ? 'Masukkan 6 angka untuk menjaga keamanan akun Arum Seduh dan melindungi setiap pembayaran Arus Pay kamu'
                : 'Masukkan kembali 6 angka PIN Arum Seduh yang baru saja kamu buat'}
            </p>

            <div className="flex justify-center gap-3.5 mb-3 w-full">
              {[0, 1, 2, 3, 4, 5].map((index) => (
                <motion.div
                  key={index}
                  initial={false}
                  animate={{
                    scale: index < currentPin.length ? 1.05 : 0.95,
                    borderColor: error
                      ? '#EF4444'
                      : index < currentPin.length
                      ? '#F97316'
                      : '#FED7AA',
                    backgroundColor: error
                      ? '#EF4444'
                      : index < currentPin.length
                      ? '#F97316'
                      : '#FFF7ED',
                  }}
                  transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                  className="w-10 h-10 rounded-2xl border-2 flex items-center justify-center shadow-xs"
                >
                  {index < currentPin.length && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="w-2.5 h-2.5 rounded-full bg-white"
                    />
                  )}
                </motion.div>
              ))}
            </div>

            {/* Error message */}
            <AnimatePresence>
              {error && (
                <motion.p
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -5 }}
                  className="text-xs text-red-500 font-bold text-center mt-2"
                >
                  {error}
                </motion.p>
              )}
            </AnimatePresence>
          </motion.div>
        </AnimatePresence>

        {loading && (
          <div className="mt-5 flex items-center gap-2 text-xs font-bold text-orange-600">
            <Loader2 className="w-4 h-4 animate-spin text-orange-500" />
            <span>Menyimpan PIN keamanan...</span>
          </div>
        )}
      </div>

      {/* Number Pad */}
      <div className="w-full max-w-md mx-auto px-8 pb-10 pt-4">
        <div className="grid grid-cols-3 gap-y-3.5 gap-x-5">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
            <button
              key={num}
              onClick={() => handleNumberClick(num.toString())}
              disabled={loading}
              className="text-2xl font-bold text-gray-800 bg-white border border-orange-100/80 shadow-xs flex items-center justify-center h-14 hover:bg-orange-50/60 active:bg-orange-100 active:scale-95 rounded-2xl transition-all disabled:opacity-40 cursor-pointer"
            >
              {num}
            </button>
          ))}
          <div /> {/* Empty space */}
          <button
            onClick={() => handleNumberClick('0')}
            disabled={loading}
            className="text-2xl font-bold text-gray-800 bg-white border border-orange-100/80 shadow-xs flex items-center justify-center h-14 hover:bg-orange-50/60 active:bg-orange-100 active:scale-95 rounded-2xl transition-all disabled:opacity-40 cursor-pointer"
          >
            0
          </button>
          <button
            onClick={handleBackspace}
            disabled={loading}
            className="flex items-center justify-center h-14 bg-orange-50/70 border border-orange-100 hover:bg-orange-100 active:scale-95 rounded-2xl transition-all text-orange-700 disabled:opacity-40 cursor-pointer"
          >
            <Delete className="w-6 h-6" />
          </button>
        </div>
      </div>
    </div>
  );
}

