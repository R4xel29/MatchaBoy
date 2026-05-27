'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { Home, BookOpen, Ticket, User, QrCode } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useStorefrontContext } from '@/app/(storefront)/layout';

export function BottomNav() {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { openSearch, openQR, setSearchOpen, searchOpen } = useStorefrontContext();
  const currentSection = searchParams.get('section');
  const isMenuOpen = !!searchOpen || searchParams.get('openMenu') === 'true';

  const navigateTo = (href: string) => {
    if (href === '/') {
      setSearchOpen?.(false);
      router.push(href);
    } else if (pathname?.startsWith('/profile') && href.startsWith('/profile')) {
      setSearchOpen?.(false);
      window.history.pushState(null, '', href);
      window.dispatchEvent(new PopStateEvent('popstate'));
    } else {
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
      label: 'Beranda',
      icon: Home,
      href: '/',
      active: pathname === '/' && !isMenuOpen,
    },
    {
      label: 'Menu',
      icon: BookOpen,
      onClick: pathname === '/' ? openSearch : undefined,
      href: pathname === '/' ? undefined : '/?openMenu=true',
      active: isMenuOpen,
    },
    {
      label: 'Voucher',
      icon: Ticket,
      href: '/profile?section=loyalty&tab=vouchers',
      active: pathname?.startsWith('/profile') && currentSection === 'loyalty' && searchParams.get('tab') === 'vouchers',
    },
    {
      label: 'Saya',
      icon: User,
      href: '/profile',
      active: pathname?.startsWith('/profile') && !currentSection,
    },
  ];

  // Don't show on checkout or if pathname is missing
  if (pathname?.startsWith('/checkout')) return null;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-[90] md:hidden">
      {/* Glassmorphism Background */}
      <div className="absolute inset-0 bg-[#FFFBF5]/80 backdrop-blur-xl border-t border-brand-700/5" />
      
      {/* Nav Content */}
      <div className="relative flex items-center justify-between px-4 pb-safe pt-2">
        {/* Left Side Items */}
        <div className="flex flex-1 justify-around">
          {navItems.slice(0, 2).map((item) => (
            <button
              key={item.label}
              onMouseEnter={() => item.href && router.prefetch(item.href)}
              onClick={() => {
                if (item.onClick) {
                  item.onClick();
                } else {
                  navigateTo(item.href!);
                }
              }}
              className="flex flex-col items-center justify-center py-2 px-2 relative group"
            >
              <div className={cn(
                "p-1.5 rounded-xl transition-all duration-300",
                item.active 
                  ? "bg-brand-700 text-white shadow-lg shadow-brand-700/20" 
                  : "text-muted-foreground group-hover:text-brand-700"
              )}>
                <item.icon className="w-5 h-5" strokeWidth={item.active ? 2.5 : 2} />
              </div>
              <span className={cn(
                "text-[10px] font-bold mt-1 transition-colors",
                item.active ? "text-brand-700" : "text-muted-foreground"
              )}>
                {item.label}
              </span>
            </button>
          ))}
        </div>

        {/* Central Prominent Scan Button */}
        <div className="relative -top-6 px-2">
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={() => {
              setSearchOpen?.(false);
              openQR();
            }}
            className="w-16 h-16 rounded-full bg-gold text-white flex items-center justify-center shadow-[0_8px_24px_rgba(212,175,55,0.4)] border-4 border-background"
          >
            <QrCode className="w-8 h-8" strokeWidth={2.5} />
          </motion.button>
          <span className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-[10px] font-bold text-gold uppercase tracking-wider">Scan</span>
        </div>

        {/* Right Side Items */}
        <div className="flex flex-1 justify-around">
          {navItems.slice(2).map((item) => (
            <button
              key={item.label}
              onMouseEnter={() => item.href && router.prefetch(item.href)}
              onClick={() => {
                if (item.onClick) {
                  item.onClick();
                } else {
                  navigateTo(item.href!);
                }
              }}
              className="flex flex-col items-center justify-center py-2 px-2 relative group"
            >
              <div className={cn(
                "p-1.5 rounded-xl transition-all duration-300",
                item.active 
                  ? "bg-brand-700 text-white shadow-lg shadow-brand-700/20" 
                  : "text-muted-foreground group-hover:text-brand-700"
              )}>
                <item.icon className="w-5 h-5" strokeWidth={item.active ? 2.5 : 2} />
              </div>
              <span className={cn(
                "text-[10px] font-bold mt-1 transition-colors",
                item.active ? "text-brand-700" : "text-muted-foreground"
              )}>
                {item.label}
              </span>
            </button>
          ))}
        </div>
      </div>
    </nav>
  );
}
