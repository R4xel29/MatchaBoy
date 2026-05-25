'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';

interface LoadingScreenProps {
  isSplash?: boolean;
  onFinished?: () => void;
  fullScreen?: boolean;
  customMessages?: string[];
}

const BREWING_MESSAGES = [
  "Menghangatkan teko air...",
  "Menakar racikan matcha premium...",
  "Menyeduh kebaikan rasa...",
  "Mengocok busa susu hingga lembut...",
  "Menyaring esensi kemurnian...",
  "Mengaduk kehangatan cangkir...",
  "Minuman Anda siap disajikan..."
];

export function LoadingScreen({ 
  isSplash = false, 
  onFinished, 
  fullScreen = true,
  customMessages
}: LoadingScreenProps) {
  const messages = customMessages || BREWING_MESSAGES;
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
    }, 1500);

    return () => clearInterval(messageInterval);
  }, [messages]);;

  // Simulate progress when used as a splash screen
  useEffect(() => {
    if (!isSplash) return;

    const start = Date.now();
    const duration = 2500;

    const updateProgress = () => {
      const elapsed = Date.now() - start;
      const calculatedProgress = Math.min(100, Math.floor((elapsed / duration) * 100));
      
      setProgress(calculatedProgress);

      if (elapsed < duration) {
        requestAnimationFrame(updateProgress);
      } else {
        setTimeout(() => {
          if (onFinished) onFinished();
        }, 300);
      }
    };

    const animId = requestAnimationFrame(updateProgress);
    return () => cancelAnimationFrame(animId);
  }, [isSplash, onFinished]);

  return (
    <div
      className={`
        ${fullScreen || isSplash ? 'fixed inset-0 z-[9999] w-screen h-screen' : 'w-full py-16 flex items-center justify-center'} 
        relative overflow-hidden flex flex-col items-center justify-center 
        bg-[#1F140E] text-[#FFFBF5]
        transition-colors duration-300 noise
      `}
    >
      {/* Warm Caramel Glow Backdrop */}
      <motion.div
        className="absolute w-[380px] h-[380px] rounded-full bg-[#B48A5E]/15 blur-3xl pointer-events-none"
        animate={{
          scale: [1, 1.15, 1],
          opacity: [0.6, 0.8, 0.6],
        }}
        transition={{
          duration: 4,
          repeat: Infinity,
          ease: "easeInOut"
        }}
      />

      {/* Cozy Cup & Steam Container */}
      <div className="relative flex flex-col items-center justify-center w-48 h-48 z-10">
        
        {/* 1. Wavy Rising Steam (Uap Panas) */}
        <div className="absolute top-2 left-0 right-0 h-16 flex justify-center items-end gap-2.5 overflow-visible pointer-events-none z-20">
          {/* Steam Wave 1 */}
          <motion.svg 
            width="12" 
            height="36" 
            viewBox="0 0 12 36" 
            fill="none" 
            className="text-[#EFDCA7]/60"
            initial={{ y: 5, x: 0, opacity: 0 }}
            animate={{ 
              y: -28,
              x: [-1, 2, -1],
              opacity: [0, 0.85, 0]
            }}
            transition={{
              duration: 2.8,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          >
            <path d="M6 36C6 36 2 28 2 22C2 16 10 12 10 6C10 0 6 0 6 0" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
          </motion.svg>

          {/* Steam Wave 2 - Center (Thicker) */}
          <motion.svg 
            width="14" 
            height="42" 
            viewBox="0 0 14 42" 
            fill="none" 
            className="text-[#EFDCA7]/85"
            initial={{ y: 5, x: 0, opacity: 0 }}
            animate={{ 
              y: -32,
              x: [1, -2, 1],
              opacity: [0, 0.95, 0]
            }}
            transition={{
              duration: 3.2,
              repeat: Infinity,
              ease: "easeInOut",
              delay: 0.8
            }}
          >
            <path d="M7 42C7 42 10 32 10 25C10 18 2 14 2 7C2 0 7 0 7 0" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"/>
          </motion.svg>

          {/* Steam Wave 3 */}
          <motion.svg 
            width="12" 
            height="36" 
            viewBox="0 0 12 36" 
            fill="none" 
            className="text-[#EFDCA7]/60"
            initial={{ y: 5, x: 0, opacity: 0 }}
            animate={{ 
              y: -26,
              x: [-2, 1, -2],
              opacity: [0, 0.85, 0]
            }}
            transition={{
              duration: 2.5,
              repeat: Infinity,
              ease: "easeInOut",
              delay: 1.6
            }}
          >
            <path d="M6 36C6 36 10 28 10 22C10 16 2 12 2 6C2 0 6 0 6 0" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
          </motion.svg>
        </div>

        {/* 2. Expanding Coffee Ripples (Riak Seduhan) */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          {/* Inner Cup Ring Rim */}
          <div className="absolute w-[114px] h-[114px] rounded-full border border-[#D4A574]/25" />
          
          {/* Ripple 1 */}
          <motion.div
            className="absolute w-[108px] h-[108px] rounded-full border border-[#D4A574]/40"
            initial={{ scale: 1, opacity: 0.8 }}
            animate={{
              scale: [1, 1.45],
              opacity: [0.8, 0]
            }}
            transition={{
              duration: 3,
              repeat: Infinity,
              ease: "easeOut"
            }}
          />

          {/* Ripple 2 */}
          <motion.div
            className="absolute w-[108px] h-[108px] rounded-full border border-[#D4A574]/25"
            initial={{ scale: 1, opacity: 0.8 }}
            animate={{
              scale: [1, 1.8],
              opacity: [0.5, 0]
            }}
            transition={{
              duration: 3,
              repeat: Infinity,
              ease: "easeOut",
              delay: 1.5
            }}
          />
        </div>

        {/* 3. Golden Crema Swirl */}
        <svg className="absolute w-[130px] h-[130px]" viewBox="0 0 130 130">
          <motion.circle
            cx="65"
            cy="65"
            r="58"
            fill="none"
            stroke="url(#cremaGradient)"
            strokeWidth="2"
            strokeDasharray="80 280"
            strokeLinecap="round"
            className="origin-center"
            animate={{ rotate: 360 }}
            transition={{
              duration: 6,
              repeat: Infinity,
              ease: "linear"
            }}
          />
          <defs>
            <linearGradient id="cremaGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#D4A574" stopOpacity="0.9" />
              <stop offset="100%" stopColor="#D4A574" stopOpacity="0" />
            </linearGradient>
          </defs>
        </svg>

        {/* 4. Ceramic Cup & Pulsing/Floating Logo */}
        <motion.div
          className="relative w-24 h-24 rounded-full bg-[#FFFBF5] border-2 border-[#D4A574]/45 shadow-2xl flex items-center justify-center p-4 overflow-hidden z-10"
          animate={{
            y: [0, -6, 0], // Floating gently like a cup on waves
            scale: [0.98, 1.02, 0.98],
            boxShadow: [
              "0 10px 30px -5px rgba(0, 0, 0, 0.4), 0 8px 10px -6px rgba(180, 138, 94, 0.3)",
              "0 20px 40px -5px rgba(0, 0, 0, 0.55), 0 15px 20px -6px rgba(180, 138, 94, 0.45)",
              "0 10px 30px -5px rgba(0, 0, 0, 0.4), 0 8px 10px -6px rgba(180, 138, 94, 0.3)"
            ]
          }}
          transition={{
            duration: 3,
            repeat: Infinity,
            ease: "easeInOut"
          }}
          style={{
            filter: "drop-shadow(0 6px 16px rgba(0, 0, 0, 0.3))"
          }}
        >
          {/* Logo Image */}
          <div className="relative w-14 h-14">
            <Image
              src="/icons/arus.png"
              alt="Arus"
              fill
              className="object-contain"
              priority
            />
          </div>

          {/* Sweeping Shine */}
          <motion.div
            className="absolute inset-0 bg-gradient-to-tr from-transparent via-[#D4A574]/15 to-transparent -skew-x-12 translate-x-[-150%] pointer-events-none"
            animate={{
              translateX: ["150%", "-150%"],
            }}
            transition={{
              duration: 3.5,
              repeat: Infinity,
              ease: "easeInOut",
              repeatDelay: 0.5
            }}
          />
        </motion.div>
      </div>

      {/* Loading Details */}
      <div className="mt-4 flex flex-col items-center gap-4 text-center px-6 max-w-sm z-20">
        
        {/* Dynamic Contextual Messages */}
        <div className="h-6 flex items-center justify-center overflow-hidden">
          <AnimatePresence mode="wait">
            <motion.p
              key={messageIndex}
              initial={{ y: 12, opacity: 0 }}
              animate={{ y: 0, opacity: 0.95 }}
              exit={{ y: -12, opacity: 0 }}
              transition={{ duration: 0.45, ease: "easeOut" }}
              className="text-xs uppercase tracking-widest font-bold text-[#EFDCA7] font-sans"
            >
              {messages[messageIndex]}
            </motion.p>
          </AnimatePresence>
        </div>

        {/* Progress & Percentage for Splash */}
        {isSplash && (
          <div className="w-48 hidden md:flex flex-col gap-2 mt-1">
            <motion.div 
              className="text-2xl font-light tracking-widest font-mono text-[#EFDCA7]"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              {progress}%
            </motion.div>

            {/* Coffee-Cream Progress Bar */}
            <div className="w-full h-[2px] bg-[#D4A574]/20 rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-gradient-to-r from-[#B48A5E] via-[#D4A574] to-[#EFDCA7] rounded-full"
                style={{ width: `${progress}%` }}
                transition={{ ease: "easeInOut" }}
              />
            </div>
          </div>
        )}
      </div>

      {/* 5. Seamless Sloshing "Arus" Liquid Waves (Grafis Ombak Seduhan Premium) */}
      {(fullScreen || isSplash) && (
        <div className="absolute bottom-0 left-0 right-0 w-full h-[100px] overflow-hidden leading-none z-10 pointer-events-none">
          <svg 
            className="relative block w-[200%] h-full" 
            viewBox="0 0 1000 120" 
            preserveAspectRatio="none"
            style={{ width: '200%' }}
          >
            {/* Wave 1 - Back (Dark Mocha Gold) */}
            <motion.path 
              d="M0,60 C150,90 350,30 500,60 C650,90 850,30 1000,60 C1150,90 1350,30 1500,60 L1500,120 L0,120 Z" 
              fill="#B48A5E" 
              fillOpacity="0.18"
              animate={{ x: [-500, 0] }}
              transition={{
                ease: "linear",
                duration: 14,
                repeat: Infinity,
              }}
            />

            {/* Wave 2 - Middle (Latte Gold) */}
            <motion.path 
              d="M0,70 C120,40 280,100 500,70 C620,40 780,100 1000,70 C1120,40 1280,100 1500,70 L1500,120 L0,120 Z" 
              fill="#D4A574" 
              fillOpacity="0.25"
              animate={{ x: [0, -500] }} // Flows in opposite direction
              transition={{
                ease: "linear",
                duration: 10,
                repeat: Infinity,
              }}
            />

            {/* Wave 3 - Front (Warm Cream) */}
            <motion.path 
              d="M0,80 C180,110 320,50 500,80 C680,110 820,50 1000,80 C1180,110 1320,50 1500,80 L1500,120 L0,120 Z" 
              fill="#EFDCA7" 
              fillOpacity="0.4"
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
