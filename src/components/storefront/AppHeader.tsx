'use client';

import { useState, useEffect } from 'react';
import { motion, useMotionValueEvent, useScroll } from 'framer-motion';
import { Search, User, MapPin } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface AppHeaderProps {
  onSearchClick?: () => void;
}

export function AppHeader({ onSearchClick }: AppHeaderProps) {
  const [scrolled, setScrolled] = useState(false);
  const { scrollY } = useScroll();
  const router = useRouter();

  useMotionValueEvent(scrollY, 'change', (latest) => {
    setScrolled(latest > 80);
  });

  return (
    <motion.header
      className="fixed top-0 left-0 right-0 z-50 pt-safe"
      initial={false}
      animate={{
        backgroundColor: scrolled
          ? 'rgba(255, 251, 245, 0.92)'
          : 'rgba(255, 251, 245, 0)',
        backdropFilter: scrolled ? 'blur(16px) saturate(180%)' : 'blur(0px)',
      }}
      transition={{ duration: 0.25, ease: 'easeOut' }}
    >
      {/* Subtle bottom border when scrolled */}
      <motion.div
        className="absolute bottom-0 left-0 right-0 h-px bg-matcha-700/10"
        initial={false}
        animate={{ opacity: scrolled ? 1 : 0 }}
        transition={{ duration: 0.2 }}
      />

      <div className="flex items-center justify-between px-4 py-3 max-w-2xl mx-auto">
        {/* Logo */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="w-9 h-9 rounded-xl bg-matcha-700 flex items-center justify-center shadow-sm">
            <span className="text-white font-heading font-bold text-lg leading-none">
              M
            </span>
          </div>
          <motion.span
            className="font-heading font-bold text-lg tracking-tight"
            animate={{ color: scrolled ? '#1B4332' : '#FFFFFF' }}
            transition={{ duration: 0.25 }}
          >
            mattchaboy
          </motion.span>
        </div>

        {/* Address Pill */}
        <button
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full max-w-[180px]
            bg-white/20 backdrop-blur-sm border border-white/10
            hover:bg-white/30 transition-colors touch-target"
          aria-label="Change delivery address"
        >
          <MapPin className={`w-3.5 h-3.5 shrink-0 ${scrolled ? 'text-matcha-600' : 'text-matcha-400'}`} />
          <motion.span
            className="text-xs font-medium truncate"
            animate={{ color: scrolled ? '#1A1A1A' : '#FFFFFF' }}
            transition={{ duration: 0.25 }}
          >
            Pilih alamat...
          </motion.span>
        </button>

        {/* Right Icons */}
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={onSearchClick}
            className="w-10 h-10 flex items-center justify-center rounded-full 
              hover:bg-matcha-100/50 transition-colors touch-target"
            aria-label="Search"
          >
            <Search
              className={`w-5 h-5 transition-colors duration-250 ${
                scrolled ? 'text-matcha-700' : 'text-white'
              }`}
            />
          </button>
          <button
            onClick={() => router.push('/profile')}
            className="w-10 h-10 flex items-center justify-center rounded-full 
              hover:bg-matcha-100/50 transition-colors touch-target"
            aria-label="Profile"
          >
            <User
              className={`w-5 h-5 transition-colors duration-250 ${
                scrolled ? 'text-matcha-700' : 'text-white'
              }`}
            />
          </button>
        </div>
      </div>
    </motion.header>
  );
}
