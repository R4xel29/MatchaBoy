'use client';

import { useState, useRef, createContext, useContext, useEffect, Suspense } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter, usePathname } from 'next/navigation';
import dynamic from 'next/dynamic';
import { AppHeader } from '@/components/storefront/AppHeader';
import { BottomNav } from '@/components/storefront/BottomNav';
import { PromoPopup } from '@/components/storefront/PromoPopup';
import { MatchaVibesPlayer } from '@/components/storefront/MatchaVibesPlayer';


// Lazy-load heavy components that are only visible on user interaction
const FloatingCart = dynamic(() => import('@/components/storefront/FloatingCart').then(m => ({ default: m.FloatingCart })), { ssr: false });
const QROverlay = dynamic(() => import('@/components/storefront/QROverlay').then(m => ({ default: m.QROverlay })), { ssr: false });
const LoginBottomSheet = dynamic(() => import('@/components/auth/LoginBottomSheet').then(m => ({ default: m.LoginBottomSheet })), { ssr: false });
const ActiveOrderPopup = dynamic(() => import('@/components/storefront/ActiveOrderPopup').then(m => ({ default: m.ActiveOrderPopup })), { ssr: false });

// Context to pass search control down to page
interface StorefrontContextType {
  openSearch: () => void;
  searchOpen: boolean;
  setSearchOpen: (open: boolean) => void;
  openQR: () => void;
  openLogin: () => void;
}

const StorefrontContext = createContext<StorefrontContextType>({
  openSearch: () => {},
  searchOpen: false,
  setSearchOpen: () => {},
  openQR: () => {},
  openLogin: () => {},
});

export const useStorefrontContext = () => useContext(StorefrontContext);

export default function StorefrontLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [searchOpen, setSearchOpen] = useState(() => {
    if (typeof window !== 'undefined') {
      return new URLSearchParams(window.location.search).get('openMenu') === 'true';
    }
    return false;
  });
  const [qrOpen, setQrOpen] = useState(false);
  const [loginOpen, setLoginOpen] = useState(false);
  const { data: session, status } = useSession();
  const [setupChecked, setSetupChecked] = useState(false);
  const setupCheckRef = useRef(false);

  useEffect(() => {
    if (pathname !== '/') {
      setSearchOpen(false);
    }
  }, [pathname]);

  // Check if logged-in user has pin and name (runs once per auth)
  useEffect(() => {
    if (status === 'authenticated' && session?.user && !setupCheckRef.current) {
      setupCheckRef.current = true;
      fetch('/api/user/check-phone')
        .then((res) => res.json())
        .then((data) => {
          // If we are already on a setup page, don't redirect
          const path = window.location.pathname;
          if (path.startsWith('/setup-')) {
            setSetupChecked(true);
            return;
          }

          if (!data.hasPin) {
            router.push('/setup-pin');
          } else if (!data.hasName) {
            router.push('/setup-profile');
          } else if (!data.phoneVerified) {
            router.push('/setup-phone');
          } else {
            setSetupChecked(true);
          }
        })
        .catch(() => {
          setSetupChecked(true);
        });
    } else if (status === 'unauthenticated') {
      setSetupChecked(true);
    }
  }, [status, session?.user?.id, router]);

  if (pathname !== '/spmb' && (status === 'loading' || (status === 'authenticated' && !setupChecked))) {
    return (
      <div className="min-h-dvh flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="w-9 h-9 rounded-full border-2 border-brand-500/25 border-t-brand-500 animate-spin" />
          <p className="text-xs font-medium text-muted-foreground tracking-wider uppercase">Memuat...</p>
        </div>
      </div>
    );
  }

  return (
    <StorefrontContext.Provider
      value={{
        openSearch: () => setSearchOpen(true),
        searchOpen,
        setSearchOpen,
        openQR: () => {
          if (status === 'unauthenticated') {
            setLoginOpen(true);
          } else {
            setQrOpen(true);
          }
        },
        openLogin: () => setLoginOpen(true),
      }}
    >
      <div className="min-h-dvh bg-background">
        <AppHeader onSearchClick={() => setSearchOpen(true)} />
        <main className={pathname === '/spmb' ? "pb-0" : "pb-20 md:pb-0"}>{children}</main>
        {pathname !== '/spmb' && <FloatingCart />}
        <ActiveOrderPopup />
        {pathname !== '/spmb' && !pathname?.startsWith('/spmb') && <PromoPopup />}
        <MatchaVibesPlayer />

        {pathname !== '/spmb' && (
          <Suspense fallback={null}>
            <BottomNav />
          </Suspense>
        )}
        <QROverlay 
          key={session?.user?.id ? `qr-${session.user.id}-${qrOpen}` : 'qr-guest'} 
          isOpen={qrOpen} 
          onClose={() => setQrOpen(false)} 
        />
        <LoginBottomSheet 
          isOpen={loginOpen} 
          onClose={() => setLoginOpen(false)} 
        />
      </div>
    </StorefrontContext.Provider>
  );
}
