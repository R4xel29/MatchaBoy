'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Coffee, Sparkles } from 'lucide-react';

interface MotionLoadingScreenProps {
  message?: string;
  customMessages?: string[];
}

const DEFAULT_MESSAGES = [
  'Menghubungkan ke server aman...',
  'Memverifikasi akses akun Anda...',
  'Menyiapkan seduhan terbaik Arum Seduh...',
  'Mengamankan sesi autentikasi...',
  'Hampir selesai...'
];

export function MotionLoadingScreen({
  message,
  customMessages
}: MotionLoadingScreenProps) {
  const messages = customMessages || DEFAULT_MESSAGES;
  const [messageIndex, setMessageIndex] = useState(0);

  useEffect(() => {
    if (messages.length <= 1) return;
    const interval = setInterval(() => {
      setMessageIndex((prev) => (prev + 1) % messages.length);
    }, 2000);
    return () => clearInterval(interval);
  }, [messages]);

  return (
    <div className="fixed inset-0 z-[9999] w-screen h-screen flex flex-col items-center justify-center bg-gradient-to-b from-orange-50/70 via-[#FFFBF7] to-amber-50/60 text-slate-900 overflow-hidden select-none px-6">
      {/* Lightweight CSS keyframes for zero-lag spinner & progress bar */}
      <style>{`
        @keyframes arus-spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes arus-progress {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(200%); }
        }
        .animate-arus-spin {
          animation: arus-spin 1.4s linear infinite;
        }
        .animate-arus-progress {
          animation: arus-progress 1.5s ease-in-out infinite;
        }
      `}</style>

      <div className="relative flex flex-col items-center justify-center max-w-xs w-full text-center">
        {/* Lightweight Icon & Spinner Ring */}
        <div className="relative w-24 h-24 flex items-center justify-center mb-6">
          {/* Outer soft ring */}
          <div className="absolute inset-0 rounded-full border-4 border-orange-100" />
          {/* Active spinning arc */}
          <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-orange-500 border-r-amber-500 animate-arus-spin" />

          {/* Warm Brand Core */}
          <div className="relative w-16 h-16 rounded-2xl bg-gradient-to-br from-orange-500 to-amber-500 text-white shadow-lg shadow-orange-500/25 flex items-center justify-center">
            <Coffee className="w-8 h-8" />
            <Sparkles className="w-3.5 h-3.5 text-amber-100 absolute top-2 right-2" />
          </div>
        </div>

        {/* Brand Identity Title */}
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-orange-100/80 text-orange-700 text-[10px] font-extrabold uppercase tracking-widest mb-2">
          Arum Seduh
        </span>
        <h2 className="text-lg font-extrabold text-slate-900 tracking-tight">
          Mohon Tunggu Sebentar
        </h2>

        {/* Animated Status Message */}
        <div className="mt-2 h-8 flex items-center justify-center">
          <AnimatePresence mode="wait">
            <motion.p
              key={message || messageIndex}
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
              transition={{ duration: 0.25 }}
              className="text-xs font-semibold text-slate-500"
            >
              {message || messages[messageIndex]}
            </motion.p>
          </AnimatePresence>
        </div>

        {/* Lightweight Progress Line */}
        <div className="w-36 h-1.5 bg-orange-100 rounded-full mt-4 overflow-hidden">
          <div
            className="w-1/2 h-full bg-gradient-to-r from-orange-500 to-amber-500 rounded-full animate-arus-progress"
          />
        </div>
      </div>
    </div>
  );
}
