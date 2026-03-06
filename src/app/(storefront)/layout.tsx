'use client';

import { useState, createContext, useContext } from 'react';
import { AppHeader } from '@/components/storefront/AppHeader';
import { FloatingCart } from '@/components/storefront/FloatingCart';

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
      </div>
    </StorefrontContext.Provider>
  );
}
