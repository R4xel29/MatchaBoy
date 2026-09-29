'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';
import { Coffee, Sparkles, ShieldCheck } from 'lucide-react';

interface LoadingScreenProps {
  isSplash?: boolean;
  onFinished?: () => void;
  fullScreen?: boolean;
  customMessages?: string[];
}

const BREWING_MESSAGES = [
  "Menghangatkan teko seduhan...",
  "Menakar racikan pilihan Arum Seduh...",
  "Menyeduh kebaikan rasa autentik...",
  "Mengocok busa susu hingga lembut...",
  "Menyaring esensi kemurnian rasa...",
  "Mengaduk kehangatan di setiap cangkir...",
  "Minuman segar Anda siap disajikan..."
];

export function LoadingScreen({
  isSplash = false,
  onFinished,
  fullScreen = true,
  customMessages
}: LoadingScreenProps) {
  const messages = customMessages && customMessages.length > 0 ? customMessages : BREWING_MESSAGES;
  const [progress, setProgress] = useState(0);
  const [messageIndex, setMessageIndex] = useState(0);

  // Reset messageIndex if messages list changes
  useEffect(() => {
    setMessageIndex(0);
  }, [messages]);

  // Rotate brewing messages
  useEffect(() => {
    if (messages.length <= 1) return;
    const messageInterval = setInterval(() => {
      setMessageIndex((prev) => (prev + 1) % messages.length);
    }, 1600);

    return () => clearInterval(messageInterval);
  }, [messages]);

  // Simulate progress when used as a splash screen
  useEffect(() => {
    if (!isSplash) return;

    const start = Date.now();
    const duration = 2400;

    const updateProgress = () => {
      const elapsed = Date.now() - start;
      const calculatedProgress = Math.min(100, Math.floor((elapsed / duration) * 100));

      setProgress(calculatedProgress);

      if (elapsed < duration) {
        requestAnimationFrame(updateProgress);
      } else {
        setTimeout(() => {
          if (onFinished) onFinished();
        }, 280);
      }
    };

    const animId = requestAnimationFrame(updateProgress);
    return () => cancelAnimationFrame(animId);
  }, [isSplash, onFinished]);

  const isFullOverlay = fullScreen || isSplash;

  return (
    <div
      role="status"
      aria-live="polite"
      aria-label="Memuat halaman Arum Seduh"
      className={`
        ${isFullOverlay ? 'fixed inset-0 z-[9999] w-screen h-screen bg-gradient-to-b from-[#FFFBF5] via-[#FFF7ED] to-[#FFEDD5]' : 'w-full py-12 px-4 flex items-center justify-center'}
        relative overflow-hidden flex flex-col items-center justify-center select-none
      `}
    >
      {/* Ambient Background Orbs for FullScreen / Splash */}
      {isFullOverlay && (
        <>
          <motion.div
            className="absolute -top-24 -left-24 w-80 h-80 rounded-full bg-gradient-to-br from-orange-400/20 to-amber-300/10 blur-3xl pointer-events-none"
            animate={{
              scale: [1, 1.15, 1],
              opacity: [0.5, 0.8, 0.5],
            }}
            transition={{
              duration: 4.5,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          />
          <motion.div
            className="absolute -bottom-24 -right-24 w-96 h-96 rounded-full bg-gradient-to-tl from-amber-400/25 to-orange-500/15 blur-3xl pointer-events-none"
            animate={{
              scale: [1.1, 0.95, 1.1],
              opacity: [0.6, 0.85, 0.6],
            }}
            transition={{
              duration: 5,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          />
          {/* Subtle Top Accent Line */}
          <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-orange-500 via-amber-400 to-orange-600" />
        </>
      )}

      {/* Main Artisanal Brew Card */}
      <div
        className={`
          relative z-10 w-full max-w-[350px] rounded-[2.25rem]
          bg-white/90 backdrop-blur-xl border border-orange-100/90
          shadow-[0_24px_60px_-15px_rgba(234,88,12,0.16),0_0_0_1px_rgba(251,146,60,0.08)]
          px-7 pt-8 pb-7 flex flex-col items-center overflow-hidden
        `}
      >
        {/* Top Shimmer Highlight */}
        <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-orange-400 via-amber-500 to-orange-500" />

        {/* Soft Top Radial Aura */}
        <div className="absolute -top-20 left-1/2 -translate-x-1/2 w-56 h-56 rounded-full bg-gradient-to-b from-orange-300/25 via-amber-200/10 to-transparent blur-2xl pointer-events-none" />

        {/* Brand Header Pill */}
        <div className="relative z-10 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gradient-to-r from-orange-50 to-amber-50 border border-orange-200/60 shadow-2xs mb-2">
          <Sparkles className="w-3 h-3 text-orange-500 animate-pulse" />
          <span className="text-[10px] font-extrabold uppercase tracking-[0.2em] bg-gradient-to-r from-orange-600 to-amber-600 bg-clip-text text-transparent">
            Arum Seduh
          </span>
        </div>

        {/* Cozy Cup & Steam Stage */}
        <div className="relative flex flex-col items-center justify-center w-40 h-40 my-1 z-10">
          {/* 1. Wavy Rising Steam (Uap Seduhan Hangat) */}
          <div className="absolute -top-2 left-0 right-0 h-14 flex justify-center items-end gap-3 overflow-visible pointer-events-none z-20">
            <motion.svg
              width="12"
              height="34"
              viewBox="0 0 12 36"
              fill="none"
              className="text-orange-400/75"
              initial={{ y: 6, x: 0, opacity: 0 }}
              animate={{
                y: [-2, -22],
                x: [-1, 2, -1],
                opacity: [0, 0.85, 0]
              }}
              transition={{
                duration: 2.6,
                repeat: Infinity,
                ease: "easeInOut"
              }}
            >
              <path d="M6 36C6 36 2 28 2 22C2 16 10 12 10 6C10 0 6 0 6 0" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </motion.svg>

            <motion.svg
              width="14"
              height="40"
              viewBox="0 0 14 42"
              fill="none"
              className="text-amber-500/90"
              initial={{ y: 6, x: 0, opacity: 0 }}
              animate={{
                y: [-2, -26],
                x: [1, -2, 1],
                opacity: [0, 0.95, 0]
              }}
              transition={{
                duration: 3,
                repeat: Infinity,
                ease: "easeInOut",
                delay: 0.7
              }}
            >
              <path d="M7 42C7 42 10 32 10 25C10 18 2 14 2 7C2 0 7 0 7 0" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
            </motion.svg>

            <motion.svg
              width="12"
              height="34"
              viewBox="0 0 12 36"
              fill="none"
              className="text-orange-400/75"
              initial={{ y: 6, x: 0, opacity: 0 }}
              animate={{
                y: [-2, -20],
                x: [-2, 1, -2],
                opacity: [0, 0.85, 0]
              }}
              transition={{
                duration: 2.4,
                repeat: Infinity,
                ease: "easeInOut",
                delay: 1.4
              }}
            >
              <path d="M6 36C6 36 10 28 10 22C10 16 2 12 2 6C2 0 6 0 6 0" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </motion.svg>
          </div>

          {/* 2. Expanding Crema Ripples (Riak Seduhan) */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="absolute w-[108px] h-[108px] rounded-full border border-orange-200/60" />

            <motion.div
              className="absolute w-[96px] h-[96px] rounded-full border border-orange-400/35"
              initial={{ scale: 0.9, opacity: 0.75 }}
              animate={{
                scale: [0.9, 1.48],
                opacity: [0.7, 0]
              }}
              transition={{
                duration: 2.8,
                repeat: Infinity,
                ease: "easeOut"
              }}
            />

            <motion.div
              className="absolute w-[96px] h-[96px] rounded-full border border-amber-400/30"
              initial={{ scale: 0.9, opacity: 0.6 }}
              animate={{
                scale: [0.9, 1.75],
                opacity: [0.55, 0]
              }}
              transition={{
                duration: 2.8,
                repeat: Infinity,
                ease: "easeOut",
                delay: 1.4
              }}
            />
          </div>

          {/* 3. Counter-Rotating Dashed Halo */}
          <motion.div
            className="absolute w-[126px] h-[126px] rounded-full border border-dashed border-amber-300/70 pointer-events-none"
            animate={{ rotate: -360 }}
            transition={{ duration: 16, repeat: Infinity, ease: "linear" }}
          />

          {/* 4. Golden-Orange Orbital Swirl */}
          <svg className="absolute w-[116px] h-[116px]" viewBox="0 0 130 130">
            <motion.circle
              cx="65"
              cy="65"
              r="58"
              fill="none"
              stroke="url(#arusAmberGradient)"
              strokeWidth="3"
              strokeDasharray="95 270"
              strokeLinecap="round"
              className="origin-center"
              animate={{ rotate: 360 }}
              transition={{
                duration: 3.2,
                repeat: Infinity,
                ease: "linear"
              }}
            />
            <defs>
              <linearGradient id="arusAmberGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#EA580C" stopOpacity="1" />
                <stop offset="55%" stopColor="#F59E0B" stopOpacity="0.85" />
                <stop offset="100%" stopColor="#FBBF24" stopOpacity="0" />
              </linearGradient>
            </defs>
          </svg>

          {/* 5. Ceramic Cup Emblem & Floating Logo */}
          <motion.div
            className="relative w-24 h-24 rounded-[1.85rem] bg-gradient-to-br from-[#FFFDF9] via-[#FFF7ED] to-[#FFEDD5] border-2 border-orange-200/80 shadow-[0_12px_28px_-6px_rgba(234,88,12,0.25)] flex items-center justify-center p-4 overflow-hidden z-10"
            animate={{
              y: [0, -5, 0],
              scale: [0.98, 1.02, 0.98],
            }}
            transition={{
              duration: 3,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          >
            {/* Inner subtle ring */}
            <div className="absolute inset-1.5 rounded-[1.45rem] border border-amber-300/35 pointer-events-none" />

            {/* Logo Image */}
            <div className="relative w-14 h-14">
              <Image
                src="/icons/arus.png"
                alt="Arum Seduh"
                fill
                sizes="56px"
                className="object-contain drop-shadow-[0_2px_6px_rgba(234,88,12,0.18)]"
                priority
              />
            </div>

            {/* Sweeping Glossy Shine */}
            <motion.div
              className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/75 to-transparent -skew-x-12 translate-x-[-150%] pointer-events-none"
              animate={{
                translateX: ["150%", "-150%"],
              }}
              transition={{
                duration: 3.2,
                repeat: Infinity,
                ease: "easeInOut",
                repeatDelay: 0.6
              }}
            />
          </motion.div>
        </div>

        {/* Dynamic Contextual Messages & Progress */}
        <div className="mt-2 w-full flex flex-col items-center gap-2.5 text-center z-20">
          <div className="h-5 flex items-center justify-center overflow-hidden px-2">
            <AnimatePresence mode="wait">
              <motion.p
                key={messageIndex}
                initial={{ y: 10, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: -10, opacity: 0 }}
                transition={{ duration: 0.35, ease: "easeOut" }}
                className="text-[13px] font-bold text-stone-800 tracking-tight line-clamp-1"
              >
                {messages[messageIndex]}
              </motion.p>
            </AnimatePresence>
          </div>

          <p className="text-[11px] font-medium text-stone-400">
            Mohon tunggu sejenak, sedang menyiapkan halaman...
          </p>

          {/* Step Dots */}
          {messages.length > 1 && (
            <div className="flex items-center justify-center gap-1.5 pt-0.5">
              {messages.map((_, idx) => (
                <span
                  key={idx}
                  className={`h-1.5 rounded-full transition-all duration-500 ${
                    idx === messageIndex
                      ? 'w-5 bg-gradient-to-r from-orange-500 to-amber-500 shadow-2xs'
                      : 'w-1.5 bg-orange-200/75'
                  }`}
                />
              ))}
            </div>
          )}

          {/* Progress Bar (Deterministic for Splash, Liquid Shimmer for Standard) */}
          {isSplash ? (
            <div className="w-full max-w-[230px] flex flex-col gap-1.5 mt-1">
              <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-orange-600">
                <span>Menyiapkan Aplikasi</span>
                <span className="font-mono">{progress}%</span>
              </div>
              <div className="w-full h-2 bg-orange-100/90 rounded-full overflow-hidden p-0.5 border border-orange-200/50">
                <motion.div
                  className="h-full bg-gradient-to-r from-orange-600 via-orange-500 to-amber-400 rounded-full"
                  style={{ width: `${progress}%` }}
                  transition={{ ease: "easeOut" }}
                />
              </div>
            </div>
          ) : (
            <div className="w-full max-w-[210px] h-1.5 bg-orange-100/80 rounded-full overflow-hidden p-[1px] mt-1">
              <motion.div
                className="h-full w-1/2 rounded-full bg-gradient-to-r from-orange-500 via-amber-400 to-orange-500"
                animate={{ x: ["-100%", "200%"] }}
                transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
              />
            </div>
          )}
        </div>

        {/* Bottom Micro-Feature Badges */}
        <div className="mt-5 pt-3.5 border-t border-orange-100/80 w-full flex items-center justify-center gap-4 text-[10px] font-semibold text-stone-400">
          <span className="inline-flex items-center gap-1 text-orange-700/80">
            <Coffee className="w-3 h-3 text-orange-500" />
            Racikan Segar
          </span>
          <span className="w-1 h-1 rounded-full bg-orange-200" />
          <span className="inline-flex items-center gap-1 text-amber-700/80">
            <Sparkles className="w-3 h-3 text-amber-500" />
            Kualitas Terjaga
          </span>
          <span className="w-1 h-1 rounded-full bg-orange-200" />
          <span className="inline-flex items-center gap-1 text-stone-500">
            <ShieldCheck className="w-3 h-3 text-orange-500" />
            Aman
          </span>
        </div>
      </div>

      {/* Seamless Sloshing "Arus" Liquid Amber Waves (Bottom Graphic for FullScreen) */}
      {isFullOverlay && (
        <div className="absolute bottom-0 left-0 right-0 w-full h-[90px] overflow-hidden leading-none z-0 pointer-events-none">
          <svg
            className="relative block w-[200%] h-full"
            viewBox="0 0 1000 120"
            preserveAspectRatio="none"
            style={{ width: '200%' }}
          >
            {/* Wave 1 - Back (Warm Orange) */}
            <motion.path
              d="M0,60 C150,90 350,30 500,60 C650,90 850,30 1000,60 C1150,90 1350,30 1500,60 L1500,120 L0,120 Z"
              fill="#EA580C"
              fillOpacity="0.08"
              animate={{ x: [-500, 0] }}
              transition={{
                ease: "linear",
                duration: 14,
                repeat: Infinity,
              }}
            />

            {/* Wave 2 - Middle (Golden Amber) */}
            <motion.path
              d="M0,70 C120,40 280,100 500,70 C620,40 780,100 1000,70 C1120,40 1280,100 1500,70 L1500,120 L0,120 Z"
              fill="#F97316"
              fillOpacity="0.12"
              animate={{ x: [0, -500] }}
              transition={{
                ease: "linear",
                duration: 10,
                repeat: Infinity,
              }}
            />

            {/* Wave 3 - Front (Soft Amber Glow) */}
            <motion.path
              d="M0,80 C180,110 320,50 500,80 C680,110 820,50 1000,80 C1180,110 1320,50 1500,80 L1500,120 L0,120 Z"
              fill="#F59E0B"
              fillOpacity="0.18"
              animate={{ x: [-500, 0] }}
              transition={{
                ease: "linear",
                duration: 7,
                repeat: Infinity,
              }}
            />
          </svg>
        </div>
      )}
    </div>
  );
}

