'use client';

import { useState, createContext, useContext, useEffect, Suspense } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { AppHeader } from '@/components/storefront/AppHeader';
import { FloatingCart } from '@/components/storefront/FloatingCart';
import { BottomNav } from '@/components/storefront/BottomNav';
import { QROverlay } from '@/components/storefront/QROverlay';
import { Loader2 } from 'lucide-react';

// Context to pass search control down to page
interface StorefrontContextType {
  openSearch: () => void;
  searchOpen: boolean;
  setSearchOpen: (open: boolean) => void;
  openQR: () => void;
}

const StorefrontContext = createContext<StorefrontContextType>({
  openSearch: () => {},
  searchOpen: false,
  setSearchOpen: () => {},
  openQR: () => {},
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
  const { data: session, status } = useSession();
  const [setupChecked, setSetupChecked] = useState(false);

  // Check if logged-in user has pin and name
  useEffect(() => {
    if (status === 'authenticated' && session?.user) {
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
  }, [status, session, router]);

  if (status === 'loading' || (status === 'authenticated' && !setupChecked)) {
    return (
      <div className="min-h-screen bg-[#FDFBF7] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 text-[#B48A5E] animate-spin" />
          <p className="text-sm text-gray-500 font-medium font-serif">Memuat Arus...</p>
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
            router.push('/login');
          } else {
            setQrOpen(true);
          }
        },
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
      </div>
    </StorefrontContext.Provider>
  );
}
