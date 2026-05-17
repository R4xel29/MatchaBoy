'use client';

import { useState, useEffect } from 'react';
import { motion, useMotionValueEvent, useScroll } from 'framer-motion';
import { Search, User } from 'lucide-react';
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
    setScrolled(latest > 80);
  });

  // Hide AppHeader on the profile page and checkout because they have their own headers
  if (pathname?.startsWith('/profile') || pathname?.startsWith('/checkout') || pathname?.startsWith('/orders')) {
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
          ? 'rgba(255, 251, 245, 0.92)'
          : 'rgba(255, 251, 245, 0)',
        backdropFilter: scrolled ? 'blur(16px) saturate(180%)' : 'blur(0px)',
      }}
      transition={{ duration: 0.25, ease: 'easeOut' }}
    >
      {/* Subtle bottom border when scrolled */}
      <motion.div
        className="absolute bottom-0 left-0 right-0 h-px bg-brand-700/10"
        initial={false}
        animate={{ opacity: scrolled ? 1 : 0 }}
        transition={{ duration: 0.2 }}
      />

      <div className="flex items-center justify-between px-4 sm:px-6 lg:px-8 py-3 max-w-7xl mx-auto w-full">
        {/* Logo */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="w-10 h-10 rounded-xl bg-brand-700/5 flex items-center justify-center shadow-sm overflow-hidden p-1.5 border border-brand-700/10 backdrop-blur-sm">
            <Image 
              src="/icons/arus.png" 
              alt="Arus Logo" 
              width={32} 
              height={32} 
              className="object-contain"
            />
          </div>
          <motion.span
            className="font-heading font-bold text-lg tracking-tight"
            animate={{ color: scrolled ? '#D4A574' : '#FFFFFF' }}
            transition={{ duration: 0.25 }}
          >
            Arus
          </motion.span>
        </div>


        {/* Right Icons - Desktop only */}
        <div className="hidden md:flex items-center gap-1 shrink-0">
          <button
            onClick={onSearchClick}
            className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-brand-100/50 transition-colors touch-target"
            aria-label="Search"
          >
            <Search
              className={`w-5 h-5 transition-colors duration-250 ${
                scrolled ? 'text-brand-700' : 'text-white'
              }`}
            />
          </button>
          <button
            onClick={handleProfileClick}
            className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-brand-100/50 transition-colors touch-target"
            aria-label="Profile"
          >
            <User
              className={`w-5 h-5 transition-colors duration-250 ${
                scrolled ? 'text-brand-700' : 'text-white'
              }`}
            />
          </button>
        </div>
      </div>
    </motion.header>
  );
}
