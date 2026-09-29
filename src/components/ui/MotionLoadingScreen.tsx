'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Coffee, Sparkles, Flame, ShieldCheck } from 'lucide-react';
import Image from 'next/image';

interface MotionLoadingScreenProps {
  message?: string;
  customMessages?: string[];
  title?: string;
}

const DEFAULT_MESSAGES = [
  'Menghubungkan ke layanan Arum Seduh...',
  'Menakar racikan seduhan terbaik untuk Anda...',
  'Memverifikasi sesi & keamanan akun...',
  'Menyiapkan pengalaman kuliner yang hangat...',
  'Hampir siap disajikan...'
];

export function MotionLoadingScreen({
  message,
  customMessages,
  title = 'Menyiapkan Seduhan Terbaik'
}: MotionLoadingScreenProps) {
  const messages = customMessages && customMessages.length > 0 ? customMessages : DEFAULT_MESSAGES;
  const [messageIndex, setMessageIndex] = useState(0);

  useEffect(() => {
    setMessageIndex(0);
  }, [messages]);

  useEffect(() => {
    if (messages.length <= 1) return;
    const interval = setInterval(() => {
      setMessageIndex((prev) => (prev + 1) % messages.length);
    }, 2000);
    return () => clearInterval(interval);
  }, [messages]);

  return (
    <div className="fixed inset-0 z-[9999] w-screen h-screen flex flex-col items-center justify-center bg-gradient-to-b from-orange-50/90 via-[#FFFBF7] to-amber-50/80 text-slate-900 overflow-hidden select-none px-6">
      {/* GPU-Accelerated Keyframes for Artisanal Brewing Motion */}
      <style>{`
        @keyframes arus-orbit-cw {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes arus-orbit-ccw {
          from { transform: rotate(360deg); }
          to { transform: rotate(0deg); }
        }
        @keyframes arus-ripple {
          0% { transform: scale(0.92); opacity: 0.65; }
          70% { transform: scale(1.38); opacity: 0; }
          100% { transform: scale(1.38); opacity: 0; }
        }
        @keyframes arus-float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-6px); }
        }
        @keyframes arus-steam {
          0% { transform: translateY(6px) scaleX(0.9); opacity: 0; }
          45% { opacity: 0.75; }
          100% { transform: translateY(-18px) scaleX(1.1); opacity: 0; }
        }
        @keyframes arus-liquid-bar {
          0% { transform: translateX(-100%); }
          50% { transform: translateX(40%); }
          100% { transform: translateX(200%); }
        }
        @keyframes arus-sheen {
          0% { transform: translateX(-140%) skewX(-18deg); }
          60%, 100% { transform: translateX(220%) skewX(-18deg); }
        }
        .animate-arus-orbit-cw {
          animation: arus-orbit-cw 2.4s cubic-bezier(0.45, 0.05, 0.55, 0.95) infinite;
        }
        .animate-arus-orbit-slow {
          animation: arus-orbit-ccw 14s linear infinite;
        }
        .animate-arus-ripple-1 {
          animation: arus-ripple 2.6s ease-out infinite;
        }
        .animate-arus-ripple-2 {
          animation: arus-ripple 2.6s ease-out 1.3s infinite;
        }
        .animate-arus-float {
          animation: arus-float 3s ease-in-out infinite;
        }
        .animate-arus-steam-1 {
          animation: arus-steam 2.4s ease-in-out infinite;
        }
        .animate-arus-steam-2 {
          animation: arus-steam 2.7s ease-in-out 0.6s infinite;
        }
        .animate-arus-steam-3 {
          animation: arus-steam 2.5s ease-in-out 1.2s infinite;
        }
        .animate-arus-liquid {
          animation: arus-liquid-bar 1.8s ease-in-out infinite;
        }
        .animate-arus-sheen {
          animation: arus-sheen 3.2s ease-in-out infinite;
        }
      `}</style>

      {/* Subtle Warm Dotted Texture Pattern */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.07]"
        style={{
          backgroundImage: 'radial-gradient(#EA580C 1px, transparent 1px)',
          backgroundSize: '22px 22px',
        }}
      />

      {/* Ambient Warm Aura Orbs */}
      <div className="absolute -top-24 -left-24 w-72 h-72 rounded-full bg-gradient-to-br from-orange-300/20 to-amber-200/10 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-24 -right-24 w-80 h-80 rounded-full bg-gradient-to-tl from-amber-300/20 to-orange-200/10 blur-3xl pointer-events-none" />

      {/* Main Glassmorphic Artisanal Card */}
      <div className="relative z-10 flex flex-col items-center justify-center max-w-sm w-full">
        <div className="w-full bg-white/85 backdrop-blur-md border border-orange-100/90 rounded-[2.25rem] px-7 py-9 shadow-[0_20px_50px_-12px_rgba(249,115,22,0.14)] flex flex-col items-center text-center relative overflow-hidden">
          {/* Top Decorative Gradient Accent Bar */}
          <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-orange-500 via-amber-400 to-orange-500" />

          {/* Centerpiece: Steam + Orbital Rings + Floating Emblem */}
          <div className="relative w-32 h-32 flex items-center justify-center mt-2 mb-5">
            {/* Rising Aromatic Steam Wisps */}
            <div className="absolute -top-4 inset-x-0 flex justify-center items-end gap-2.5 pointer-events-none z-20">
              <svg width="10" height="24" viewBox="0 0 10 24" fill="none" className="text-orange-400 animate-arus-steam-1">
                <path d="M5 22C5 22 1.5 16.5 1.5 12C1.5 7.5 8.5 5.5 8.5 1.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
              </svg>
              <svg width="12" height="28" viewBox="0 0 12 28" fill="none" className="text-amber-500 animate-arus-steam-2">
                <path d="M6 26C6 26 9.5 19.5 9.5 14C9.5 8.5 2.5 6 2.5 1.5" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
              </svg>
              <svg width="10" height="24" viewBox="0 0 10 24" fill="none" className="text-orange-400 animate-arus-steam-3">
                <path d="M5 22C5 22 8.5 16.5 8.5 12C8.5 7.5 1.5 5.5 1.5 1.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
              </svg>
            </div>

            {/* Expanding Warm Crema Ripples */}
            <div className="absolute w-24 h-24 rounded-full border border-orange-300/60 animate-arus-ripple-1 pointer-events-none" />
            <div className="absolute w-24 h-24 rounded-full border border-amber-300/50 animate-arus-ripple-2 pointer-events-none" />

            {/* Outer Dashed Artisanal Ring */}
            <div className="absolute inset-0 rounded-full border-[1.5px] border-dashed border-orange-200/90 animate-arus-orbit-slow" />

            {/* Active Golden-Orange Orbital Arc */}
            <div className="absolute inset-2 rounded-full border-[3px] border-orange-100/70" />
            <div className="absolute inset-2 rounded-full border-[3px] border-transparent border-t-orange-500 border-r-amber-500 animate-arus-orbit-cw" />

            {/* Floating Medallion Core */}
            <div className="relative w-20 h-20 rounded-3xl bg-gradient-to-br from-orange-500 via-orange-500 to-amber-500 text-white shadow-xl shadow-orange-500/30 border-2 border-white flex items-center justify-center overflow-hidden animate-arus-float">
              <div className="relative w-12 h-12 flex items-center justify-center">
                <Image
                  src="/icons/arus.png"
                  alt="Arum Seduh"
                  fill
                  sizes="48px"
                  className="object-contain drop-shadow-xs"
                  priority
                />
              </div>
              <Sparkles className="w-3.5 h-3.5 text-amber-100 absolute top-2 right-2" />
              {/* Glossy Sweeping Sheen */}
              <div className="absolute inset-y-0 w-10 bg-gradient-to-r from-transparent via-white/35 to-transparent pointer-events-none animate-arus-sheen" />
            </div>
          </div>

          {/* Brand Pill Badge */}
          <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-gradient-to-r from-orange-50 to-amber-50 border border-orange-200/70 text-orange-700 text-[10px] font-black uppercase tracking-widest mb-2.5 shadow-2xs">
            <span className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-ping" />
            <span>Arum Seduh • Artisanal Brew</span>
          </div>

          {/* Editorial Title */}
          <h2 className="font-serif text-xl font-bold text-slate-900 tracking-tight">
            {title}
          </h2>

          {/* Dynamic Rotating Brewing Message */}
          <div className="mt-2 h-9 flex items-center justify-center px-2">
            <AnimatePresence mode="wait">
              <motion.p
                key={message || messageIndex}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.25 }}
                className="text-xs font-semibold text-slate-500 leading-relaxed"
              >
                {message || messages[messageIndex]}
              </motion.p>
            </AnimatePresence>
          </div>

          {/* Liquid Amber Shimmer Progress Bar */}
          <div className="w-full max-w-[210px] mt-4 space-y-2.5">
            <div className="w-full h-2 bg-orange-100/80 rounded-full overflow-hidden p-[1px] border border-orange-200/40 shadow-inner">
              <div className="w-1/2 h-full bg-gradient-to-r from-orange-500 via-amber-400 to-orange-500 rounded-full animate-arus-liquid" />
            </div>

            {/* Step Dots Indicator */}
            {!message && messages.length > 1 && (
              <div className="flex items-center justify-center gap-1.5">
                {messages.map((_, idx) => (
                  <span
                    key={idx}
                    className={`h-1.5 rounded-full transition-all duration-300 ${
                      idx === messageIndex
                        ? 'w-5 bg-gradient-to-r from-orange-500 to-amber-500'
                        : 'w-1.5 bg-orange-200/70'
                    }`}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Bottom Micro-Feature Pills */}
          <div className="mt-6 pt-4 border-t border-orange-100/70 w-full flex items-center justify-center gap-4 text-[10px] font-bold text-slate-400">
            <span className="inline-flex items-center gap-1 text-orange-600/80">
              <Coffee className="w-3 h-3" /> Racikan Segar
            </span>
            <span className="text-orange-200">•</span>
            <span className="inline-flex items-center gap-1 text-amber-600/90">
              <Flame className="w-3 h-3" /> Kualitas Terjaga
            </span>
            <span className="text-orange-200">•</span>
            <span className="inline-flex items-center gap-1 text-emerald-600/80">
              <ShieldCheck className="w-3 h-3" /> Aman
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
