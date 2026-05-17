'use client';

import { useState, createContext, useContext, useEffect, Suspense } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { AppHeader } from '@/components/storefront/AppHeader';
import { FloatingCart } from '@/components/storefront/FloatingCart';
import { BottomNav } from '@/components/storefront/BottomNav';
import { QROverlay } from '@/components/storefront/QROverlay';
import { PhoneNumberModal } from '@/components/storefront/PhoneNumberModal';

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
  const [needsPhone, setNeedsPhone] = useState(false);

  // Check if logged-in user has phone number
  useEffect(() => {
    if (status === 'authenticated' && session?.user) {
      fetch('/api/user/check-phone')
        .then((res) => res.json())
        .then((data) => {
          if (!data.hasPhone) {
            setNeedsPhone(true);
          }
        })
        .catch(() => {});
    }
  }, [status, session]);

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

        {/* Blocking Phone Number Modal */}
        {needsPhone && (
          <PhoneNumberModal onComplete={() => setNeedsPhone(false)} />
        )}
      </div>
    </StorefrontContext.Provider>
  );
}
