'use client';

import { useState, useRef, createContext, useContext, useEffect, Suspense } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { AppHeader } from '@/components/storefront/AppHeader';
import { BottomNav } from '@/components/storefront/BottomNav';
import { LoadingScreen } from '@/components/ui/LoadingScreen';

// Lazy-load heavy components that are only visible on user interaction
const FloatingCart = dynamic(() => import('@/components/storefront/FloatingCart').then(m => ({ default: m.FloatingCart })), { ssr: false });
const QROverlay = dynamic(() => import('@/components/storefront/QROverlay').then(m => ({ default: m.QROverlay })), { ssr: false });
const LoginBottomSheet = dynamic(() => import('@/components/auth/LoginBottomSheet').then(m => ({ default: m.LoginBottomSheet })), { ssr: false });

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
  const [searchOpen, setSearchOpen] = useState(false);
  const [qrOpen, setQrOpen] = useState(false);
  const [loginOpen, setLoginOpen] = useState(false);
  const { data: session, status } = useSession();
  const [setupChecked, setSetupChecked] = useState(false);
  const setupCheckRef = useRef(false);

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

  if (status === 'loading' || (status === 'authenticated' && !setupChecked)) {
    return <LoadingScreen isSplash={false} />;
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
        <main className="pb-20 md:pb-0">{children}</main>
        <FloatingCart />
        <Suspense fallback={null}>
          <BottomNav />
        </Suspense>
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
