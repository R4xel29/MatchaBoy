'use client';

import { useEffect, useState, useMemo } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { motion, AnimatePresence } from 'framer-motion';
import { Home, BookOpen, Ticket, User, QrCode, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useStorefrontContext } from '@/app/(storefront)/layout';
import { useCartStore } from '@/stores/cart-store';
import { useLoyalty } from '@/hooks/use-cached-data';

export function BottomNav() {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { status } = useSession();
  const {
    openSearch,
    openQR,
    setSearchOpen,
    searchOpen,
    qrOpen,
    setQrOpen,
  } = useStorefrontContext();

  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  const totalCartItems = useCartStore((s) => s.totalItems);
  const cartCount = mounted ? totalCartItems() : 0;

  // Fetch loyalty vouchers only when authenticated (deduped via SWR)
  const { vouchers } = useLoyalty({
    revalidateOnMount: status === 'authenticated',
    isPaused: () => status !== 'authenticated',
  });

  const unusedVoucherCount = useMemo(() => {
    if (status !== 'authenticated' || !Array.isArray(vouchers)) return 0;
    return vouchers.filter((v: any) => !v?.isUsed).length;
  }, [status, vouchers]);

  const currentSection = searchParams.get('section');
  const currentTab = searchParams.get('tab');
  const isMenuOpen = !!searchOpen || searchParams.get('openMenu') === 'true';
  const isVoucherSection =
    pathname?.startsWith('/profile') &&
    ((currentSection === 'loyalty' && currentTab === 'vouchers') ||
      currentSection === 'vouchers');

  const navigateTo = (href: string) => {
    setQrOpen?.(false);

    if (href === '/') {
      setSearchOpen?.(false);
      if (pathname === '/') {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } else {
        router.push(href);
      }
    } else if (href === '/?openMenu=true') {
      setSearchOpen?.(true);
      router.push(href);
    } else if (pathname?.startsWith('/profile') && href.startsWith('/profile')) {
      setSearchOpen?.(false);
      router.push(href, { scroll: false });
      window.history.pushState(null, '', href);
      window.dispatchEvent(new PopStateEvent('popstate'));
    } else {
      setSearchOpen?.(false);
      router.push(href);
    }
  };

  useEffect(() => {
    router.prefetch('/');
    router.prefetch('/profile');
    router.prefetch('/profile?section=loyalty&tab=vouchers');
  }, [router]);

  const navItems = [
    {
      id: 'home',
      label: 'Beranda',
      icon: Home,
      href: '/',
      active: pathname === '/' && !isMenuOpen && !qrOpen,
      badge: 0,
    },
    {
      id: 'menu',
      label: 'Menu',
      icon: BookOpen,
      onClick:
        pathname === '/'
          ? () => {
              setQrOpen?.(false);
              if (searchOpen) {
                setSearchOpen?.(false);
              } else {
                openSearch();
              }
            }
          : undefined,
      href: pathname === '/' ? undefined : '/?openMenu=true',
      active: isMenuOpen && !qrOpen,
      badge: cartCount,
    },
    {
      id: 'vouchers',
      label: 'Voucher',
      icon: Ticket,
      href: '/profile?section=loyalty&tab=vouchers',
      active: !!isVoucherSection && !isMenuOpen && !qrOpen,
      badge: unusedVoucherCount,
    },
    {
      id: 'profile',
      label: 'Saya',
      icon: User,
      href: '/profile',
      active:
        !!pathname?.startsWith('/profile') &&
        !isVoucherSection &&
        !isMenuOpen &&
        !qrOpen,
      badge: 0,
      showAuthDot: status === 'authenticated',
    },
  ];

  // Don't show on checkout, order detail pages, or if pathname is missing
  if (pathname?.startsWith('/checkout') || pathname?.startsWith('/orders')) {
    return null;
  }

  const renderNavItem = (item: (typeof navItems)[number]) => {
    const Icon = item.icon;
    return (
      <button
        key={item.id}
        type="button"
        onMouseEnter={() => item.href && router.prefetch(item.href)}
        onClick={() => {
          if (item.onClick) {
            item.onClick();
          } else if (item.href) {
            navigateTo(item.href);
          }
        }}
        aria-label={item.label}
        aria-current={item.active ? 'page' : undefined}
        className="relative flex flex-col items-center justify-center py-1.5 px-1 min-h-[54px] select-none group cursor-pointer touch-target"
      >
        {/* Shared Layout Active Background Pill */}
        {item.active && (
          <motion.div
            layoutId="arum-bottom-nav-pill"
            transition={{ type: 'spring', stiffness: 420, damping: 32 }}
            className="absolute inset-x-1 inset-y-0.5 rounded-2xl bg-gradient-to-b from-orange-50/95 via-amber-50/85 to-orange-100/50 border border-orange-200/75 shadow-[inset_0_1px_0_rgba(255,255,255,0.9),0_2px_10px_rgba(234,88,12,0.08)]"
          />
        )}

        {/* Shared Layout Top Glowing Indicator Bar */}
        {item.active && (
          <motion.div
            layoutId="arum-bottom-nav-indicator"
            transition={{ type: 'spring', stiffness: 420, damping: 32 }}
            className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-6 h-1 rounded-full bg-gradient-to-r from-orange-500 to-amber-500 shadow-[0_2px_8px_rgba(234,88,12,0.45)]"
          />
        )}

        {/* Icon Container + Badges */}
        <div className="relative z-10 flex items-center justify-center">
          <motion.div
            whileTap={{ scale: 0.9 }}
            className={cn(
              'w-8 h-8 rounded-xl flex items-center justify-center transition-all duration-200',
              item.active
                ? 'bg-gradient-to-br from-orange-500 to-amber-500 text-white shadow-md shadow-orange-500/25 scale-105'
                : 'text-stone-500 group-hover:text-orange-600 group-hover:bg-orange-50/60'
            )}
          >
            <Icon className="w-4.5 h-4.5" strokeWidth={item.active ? 2.5 : 2} />
          </motion.div>

          {/* Numeric Badge (Cart items on Menu / Unused Vouchers on Voucher) */}
          <AnimatePresence>
            {item.badge > 0 && (
              <motion.span
                key={item.badge}
                initial={{ scale: 0.4, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.4, opacity: 0 }}
                className={cn(
                  'absolute -top-1.5 -right-2 min-w-[17px] h-[17px] px-1 rounded-full text-[9px] font-black flex items-center justify-center border-[1.5px] border-[#FFFDF9] shadow-xs leading-none',
                  item.id === 'menu'
                    ? 'bg-gradient-to-r from-orange-600 to-amber-500 text-white'
                    : 'bg-amber-100 text-orange-800 border-orange-300/80'
                )}
              >
                {item.badge > 99 ? '99+' : item.badge}
              </motion.span>
            )}
          </AnimatePresence>

          {/* Authenticated Member Status Dot on 'Saya' */}
          {item.showAuthDot && item.badge === 0 && (
            <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-[#FFFDF9] shadow-2xs" />
          )}
        </div>

        {/* Item Label */}
        <span
          className={cn(
            'relative z-10 text-[10px] mt-1 tracking-tight leading-none transition-colors duration-200',
            item.active
              ? 'font-extrabold text-orange-700'
              : 'font-semibold text-stone-500 group-hover:text-orange-600'
          )}
        >
          {item.label}
        </span>
      </button>
    );
  };

  return (
    <nav
      aria-label="Navigasi Utama Arum Seduh"
      className="fixed bottom-0 left-0 right-0 z-[90] md:hidden pointer-events-none"
    >
      {/* Soft Bottom Ambient Veil so scrolling page content dissolves cleanly */}
      <div className="bg-gradient-to-t from-[#FFFBF5]/95 via-[#FFFBF5]/70 to-transparent pt-3 px-3 pb-2 pb-safe">
        {/* Sculpted Glassmorphic Floating Dock */}
        <div className="pointer-events-auto relative max-w-md mx-auto rounded-[28px] bg-[#FFFDF9]/95 backdrop-blur-2xl border border-amber-200/85 shadow-[0_14px_38px_rgba(42,31,22,0.15),0_2px_12px_rgba(234,88,12,0.08)] px-2 py-1.5">
          {/* Top Specular Amber/Orange Highlight Rim */}
          <div className="absolute inset-x-10 top-0 h-[1.5px] bg-gradient-to-r from-transparent via-orange-400/60 to-transparent pointer-events-none" />

          {/* 5-Column Ergonomic Grid */}
          <div className="relative grid grid-cols-5 items-center">
            {/* Left 2 Items: Beranda & Menu */}
            {navItems.slice(0, 2).map(renderNavItem)}

            {/* Center Prominent Action: Scan / QR Arum Seduh */}
            <div className="relative flex flex-col items-center justify-center -mt-6 select-none">
              {/* Sculpted Pedestal Cradle */}
              <div className="p-1.5 rounded-full bg-[#FFFDF9] border border-amber-200/90 shadow-[0_-6px_18px_rgba(42,31,22,0.09)]">
                <motion.button
                  type="button"
                  whileHover={{ scale: 1.04 }}
                  whileTap={{ scale: 0.92 }}
                  onClick={() => {
                    setSearchOpen?.(false);
                    if (qrOpen) {
                      setQrOpen?.(false);
                    } else {
                      openQR();
                    }
                  }}
                  aria-label="Buka QR Arum Seduh & Pemindai Meja"
                  className={cn(
                    'relative w-13 h-13 rounded-full flex items-center justify-center text-white cursor-pointer transition-all duration-300',
                    qrOpen
                      ? 'bg-gradient-to-tr from-[#2A1F16] via-[#3D291A] to-orange-600 shadow-[0_8px_24px_rgba(42,31,22,0.45)] ring-2 ring-orange-400'
                      : 'bg-gradient-to-tr from-orange-600 via-orange-500 to-amber-500 shadow-[0_8px_22px_rgba(234,88,12,0.38)] ring-2 ring-amber-200/80'
                  )}
                >
                  {/* Subtle Inner Glass Specular Ring */}
                  <span className="absolute inset-0.5 rounded-full border border-white/25 pointer-events-none" />

                  <QrCode className="w-6 h-6 relative z-10" strokeWidth={2.4} />

                  {/* Corner Sparkle Accent Badge */}
                  <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-amber-300 text-stone-950 flex items-center justify-center shadow-xs border border-white">
                    <Sparkles className="w-2.5 h-2.5 fill-stone-950" />
                  </span>
                </motion.button>
              </div>

              {/* Cleanly Aligned Center Label (No Overlap) */}
              <span
                className={cn(
                  'text-[10px] font-extrabold tracking-tight mt-1 leading-none transition-colors',
                  qrOpen ? 'text-orange-700' : 'text-orange-600'
                )}
              >
                Scan QR
              </span>
            </div>

            {/* Right 2 Items: Voucher & Saya */}
            {navItems.slice(2).map(renderNavItem)}
          </div>
        </div>
      </div>
    </nav>
  );
}
