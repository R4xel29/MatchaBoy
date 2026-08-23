'use client';

import { createContext, useContext, useState, useEffect } from 'react';
import dynamic from 'next/dynamic';

// Lazy-load heavy animation components - only needed once per session
const AnimatedSplash = dynamic(
  () => import('./AnimatedSplash'),
  { ssr: false }
);

interface SplashContextType {
  showSplash: boolean;
  triggerSplash: () => void;
}

const SplashContext = createContext<SplashContextType | undefined>(undefined);

export function SplashProvider({ children }: { children: React.ReactNode }) {
  const [showSplash, setShowSplash] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    // Instant load: no forced splash screen blocking on refresh or initial open
  }, []);

  const handleSplashFinished = () => {
    sessionStorage.setItem('arus_splash_shown', 'true');
    setShowSplash(false);
  };

  const triggerSplash = () => {
    sessionStorage.removeItem('arus_splash_shown');
    setShowSplash(true);
  };

  return (
    <SplashContext.Provider value={{ showSplash, triggerSplash }}>
      {/* Lazy-loaded splash - framer-motion only loads when splash is needed */}
      {isMounted && showSplash && (
        <AnimatedSplash showSplash={showSplash} onFinished={handleSplashFinished} />
      )}
      {children}
    </SplashContext.Provider>
  );
}

export function useSplash() {
  const context = useContext(SplashContext);
  if (!context) {
    throw new Error('useSplash must be used within a SplashProvider');
  }
  return context;
}
