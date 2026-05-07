'use client';

import { useState, createContext, useContext, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { AppHeader } from '@/components/storefront/AppHeader';
import { FloatingCart } from '@/components/storefront/FloatingCart';
import { PhoneNumberModal } from '@/components/storefront/PhoneNumberModal';

// Context to pass search control down to page
interface StorefrontContextType {
  openSearch: () => void;
  searchOpen: boolean;
  setSearchOpen: (open: boolean) => void;
}

const StorefrontContext = createContext<StorefrontContextType>({
  openSearch: () => {},
  searchOpen: false,
  setSearchOpen: () => {},
});

export const useStorefrontContext = () => useContext(StorefrontContext);

export default function StorefrontLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [searchOpen, setSearchOpen] = useState(false);
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
      }}
    >
      <div className="min-h-dvh bg-background">
        <AppHeader onSearchClick={() => setSearchOpen(true)} />
        <main>{children}</main>
        <FloatingCart />

        {/* Blocking Phone Number Modal */}
        {needsPhone && (
          <PhoneNumberModal onComplete={() => setNeedsPhone(false)} />
        )}
      </div>
    </StorefrontContext.Provider>
  );
}
