'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
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
    <div className="min-h-screen bg-[#FDFBF7] flex flex-col justify-between pt-16 pb-safe">
      <div className="flex-1 flex flex-col items-center px-6">
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: step === 'confirm' ? 30 : -30 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: step === 'confirm' ? -30 : 30 }}
            transition={{ duration: 0.25 }}
            className="flex flex-col items-center w-full"
          >
            {step === 'confirm' && (
              <button
                onClick={handleBack}
                className="self-start mb-4 text-sm text-[#B48A5E] font-medium flex items-center gap-1 active:opacity-70"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
                Ubah PIN
              </button>
            )}

            <h1 className="text-2xl font-bold text-gray-900 mb-2 font-serif">
              {step === 'create' ? 'Buat PIN' : 'Ulangi PIN'}
            </h1>
            <p className="text-sm text-gray-500 text-center max-w-[260px] leading-relaxed mb-10">
              {step === 'create'
                ? 'Masukkan 6 angka untuk menjaga keamanan akun Arus kamu'
                : 'Masukkan lagi 6 angka PIN'}
            </p>

            <div className="flex justify-center gap-4 mb-6 w-full">
              {[0, 1, 2, 3, 4, 5].map((index) => (
                <motion.div
                  key={index}
                  initial={false}
                  animate={{
                    scale: index < currentPin.length ? 1 : 0.9,
                    borderColor: error ? '#EF4444' : (index < currentPin.length ? '#B48A5E' : '#D1D5DB'),
                    backgroundColor: error ? '#EF4444' : (index < currentPin.length ? '#B48A5E' : 'transparent'),
                  }}
                  transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                  className="w-10 h-10 rounded-full border-2 flex items-center justify-center"
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
                  className="text-sm text-red-500 font-medium text-center"
                >
                  {error}
                </motion.p>
              )}
            </AnimatePresence>
          </motion.div>
        </AnimatePresence>

        {loading && (
          <div className="mt-8 flex justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-[#B48A5E]" />
          </div>
        )}
      </div>

      {/* Number Pad */}
      <div className="w-full px-8 pb-12">
        <div className="grid grid-cols-3 gap-y-6 gap-x-6">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
            <button
              key={num}
              onClick={() => handleNumberClick(num.toString())}
              disabled={loading}
              className="text-3xl font-semibold text-gray-800 flex items-center justify-center h-16 active:bg-gray-100 rounded-full transition-colors disabled:opacity-40"
            >
              {num}
            </button>
          ))}
          <div /> {/* Empty space */}
          <button
            onClick={() => handleNumberClick('0')}
            disabled={loading}
            className="text-3xl font-semibold text-gray-800 flex items-center justify-center h-16 active:bg-gray-100 rounded-full transition-colors disabled:opacity-40"
          >
            0
          </button>
          <button
            onClick={handleBackspace}
            disabled={loading}
            className="flex items-center justify-center h-16 active:bg-gray-100 rounded-full transition-colors text-gray-600 disabled:opacity-40"
          >
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M9 4L2 12L9 20H21C21.5304 20 22.0391 19.7893 22.4142 19.4142C22.7893 19.0391 23 18.5304 23 18V6C23 5.46957 22.7893 4.96086 22.4142 4.58579C22.0391 4.21071 21.5304 4 21 4H9Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M18 9L12 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M12 9L18 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
