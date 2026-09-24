'use client';

import { useState } from 'react';
import { motion, useMotionValueEvent, useScroll } from 'framer-motion';
import { BookOpen, Search, User, Coffee, UtensilsCrossed } from 'lucide-react';
import { useRouter, usePathname } from 'next/navigation';
import Image from 'next/image';
import { useSession } from 'next-auth/react';

interface AppHeaderProps {
  onSearchClick?: () => void;
}

export function AppHeader({ onSearchClick }: AppHeaderProps) {
  const { data: session } = useSession();
  const [scrolled, setScrolled] = useState(false);
  const { scrollY } = useScroll();
  const router = useRouter();
  const pathname = usePathname();

  useMotionValueEvent(scrollY, 'change', (latest) => {
    setScrolled(latest > 40);
  });

  // Hide AppHeader on the profile page, checkout, orders, and spmb because they have their own headers
  if (
    pathname?.startsWith('/profile') ||
    pathname?.startsWith('/checkout') ||
    pathname?.startsWith('/orders') ||
    pathname?.startsWith('/spmb')
  ) {
    return null;
  }

  const handleProfileClick = () => {
    const role = session?.user?.role;
    if (role === 'ADMIN' || role === 'CASHIER') {
      router.push('/admin');
    } else {
      router.push('/profile');
    }
  };

  return (
    <motion.header
      className="hidden md:block fixed top-0 left-0 right-0 z-50 pt-safe"
      initial={false}
      animate={{
        backgroundColor: scrolled
          ? 'rgba(255, 251, 245, 0.94)'
          : 'rgba(255, 251, 245, 0.78)',
        backdropFilter: 'blur(16px) saturate(180%)',
      }}
      transition={{ duration: 0.25, ease: 'easeOut' }}
    >
      {/* Subtle bottom border */}
      <motion.div
        className="absolute bottom-0 left-0 right-0 h-px bg-amber-200/70"
        initial={false}
        animate={{ opacity: scrolled ? 1 : 0.5 }}
        transition={{ duration: 0.2 }}
      />

      <div className="flex items-center justify-between px-6 lg:px-8 py-3 max-w-6xl mx-auto w-full gap-4">
        {/* Brand Logo & Identity */}
        <button
          type="button"
          onClick={() => router.push('/')}
          className="flex items-center gap-3 shrink-0 cursor-pointer group text-left"
        >
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-orange-50 to-amber-100/80 flex items-center justify-center shadow-xs overflow-hidden p-1.5 border border-amber-200/80 group-hover:border-orange-400 transition-colors">
            <Image
              src="/icons/arus.png"
              alt="Arum Seduh Logo"
              width={32}
              height={32}
              className="object-contain"
            />
          </div>
          <div>
            <span className="font-serif font-black text-base text-stone-900 tracking-tight block leading-none group-hover:text-orange-600 transition-colors">
              Arum Seduh
            </span>
            <span className="text-[10px] font-bold text-amber-800/70 uppercase tracking-widest block mt-0.5">
              Coffee, Matcha & Eatery
            </span>
          </div>
        </button>

        {/* Center Quick Search / Menu Trigger Bar for Desktop */}
        <button
          type="button"
          onClick={onSearchClick}
          className="flex-1 max-w-md flex items-center justify-between gap-3 px-4 py-2.5 rounded-2xl bg-white/90 hover:bg-white border border-amber-200/80 hover:border-orange-400 shadow-xs hover:shadow-md transition-all cursor-pointer group"
          aria-label="Cari menu makanan dan minuman"
        >
          <div className="flex items-center gap-2.5 text-stone-500 group-hover:text-stone-700">
            <Search className="w-4 h-4 text-orange-500 shrink-0" />
            <span className="text-xs font-semibold truncate">
              Cari minuman segar, kopi, matcha, atau cemilan...
            </span>
          </div>
          <span className="px-2.5 py-1 rounded-xl bg-amber-50 border border-amber-200/70 text-[10px] font-extrabold text-orange-700 uppercase tracking-wider shrink-0 flex items-center gap-1">
            <Coffee className="w-3 h-3" />
            <UtensilsCrossed className="w-3 h-3" />
            <span>Menu</span>
          </span>
        </button>

        {/* Right Actions - Desktop */}
        <div className="hidden md:flex items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={onSearchClick}
            className="px-4 py-2.5 flex items-center gap-2 rounded-2xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white text-xs font-extrabold shadow-sm hover:shadow-md transition-all cursor-pointer touch-target"
            aria-label="Buka Katalog Menu"
          >
            <BookOpen className="w-4 h-4" />
            <span>Katalog Menu</span>
          </button>
          <button
            type="button"
            onClick={handleProfileClick}
            className="w-10 h-10 flex items-center justify-center rounded-2xl bg-white border border-amber-200/80 hover:border-orange-400 hover:bg-orange-50/50 text-stone-700 hover:text-orange-600 transition-all cursor-pointer touch-target shadow-xs"
            aria-label="Profile"
          >
            <User className="w-4.5 h-4.5" />
          </button>
        </div>
      </div>
    </motion.header>
  );
}
