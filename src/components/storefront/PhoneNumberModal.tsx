'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Phone, Loader2, CheckCircle } from 'lucide-react';

interface PhoneNumberModalProps {
  onComplete: () => void;
}

const PHONE_REGEX = /^(\+62|62|0)8[0-9]{8,12}$/;

export function PhoneNumberModal({ onComplete }: PhoneNumberModalProps) {
  const [phone, setPhone] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const cleaned = phone.trim();
    if (!PHONE_REGEX.test(cleaned)) {
      setError('Format nomor HP tidak valid. Gunakan format 08xxx atau +628xxx');
      return;
    }

    setSaving(true);
    try {
      const res = await fetch('/api/user/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: cleaned }),
      });

      if (!res.ok) throw new Error('Gagal menyimpan');

      setSuccess(true);
      setTimeout(() => {
        onComplete();
      }, 1200);
    } catch {
      setError('Gagal menyimpan nomor telepon. Coba lagi.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-md p-4"
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 400, damping: 30 }}
        className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl"
      >
        {/* Icon */}
        <div className="mx-auto mb-4 w-16 h-16 rounded-2xl bg-gradient-to-br from-[#B48A5E] to-[#946F48] flex items-center justify-center shadow-lg shadow-[#B48A5E]/20">
          {success ? (
            <CheckCircle className="w-8 h-8 text-white" />
          ) : (
            <Phone className="w-8 h-8 text-white" />
          )}
        </div>

        {/* Title */}
        <h2 className="text-center font-serif text-xl font-bold text-gray-900 mb-1">
          {success ? 'Berhasil!' : 'Nomor Telepon Diperlukan'}
        </h2>
        <p className="text-center text-sm text-gray-500 mb-6 leading-relaxed">
          {success 
            ? 'Nomor telepon berhasil disimpan.' 
            : 'Masukkan nomor HP aktif (WhatsApp) untuk melanjutkan. Nomor ini digunakan untuk pemesanan dan informasi penting.'}
        </p>

        {!success && (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <div className="relative">
                <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => {
                    setPhone(e.target.value);
                    setError('');
                  }}
                  placeholder="08123456789"
                  autoFocus
                  className="w-full pl-11 pr-4 py-3.5 rounded-2xl border-2 border-gray-200 bg-gray-50/50 text-[15px] font-medium
                    focus:outline-none focus:border-[#B48A5E] focus:bg-white transition-all placeholder:text-gray-300"
                />
              </div>
              {error && (
                <motion.p
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-xs text-red-500 mt-2 font-medium"
                >
                  {error}
                </motion.p>
              )}
            </div>

            <button
              type="submit"
              disabled={saving || !phone.trim()}
              className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-[#B48A5E] to-[#946F48] text-white font-bold text-[15px]
                hover:opacity-90 transition-all disabled:opacity-40 disabled:cursor-not-allowed
                flex items-center justify-center gap-2 shadow-lg shadow-[#B48A5E]/20"
            >
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              {saving ? 'Menyimpan...' : 'Simpan & Lanjutkan'}
            </button>
          </form>
        )}
      </motion.div>
    </motion.div>
  );
}
