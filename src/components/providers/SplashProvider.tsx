'use client';

import { createContext, useContext, useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { LoadingScreen } from '../ui/LoadingScreen';

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
    
    // Check session storage so we only show the splash screen ONCE per browser session
    const hasShownSplash = sessionStorage.getItem('arus_splash_shown');
    
    if (!hasShownSplash) {
      setShowSplash(true);
    }
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
      {/* Ensure server-side markup matches exactly until mounted on client */}
      {isMounted && (
        <AnimatePresence mode="wait">
          {showSplash && (
            <motion.div
              key="splash-screen"
              initial={{ opacity: 1, y: 0 }}
              exit={{ 
                opacity: 0, 
                y: '-100%',
                filter: 'blur(20px)',
                transition: { 
                  duration: 0.65, 
                  ease: [0.76, 0, 0.24, 1] // Custom luxury cubic-bezier
                } 
              }}
              className="fixed inset-0 z-[9999] w-screen h-screen overflow-hidden"
            >
              <LoadingScreen isSplash={true} onFinished={handleSplashFinished} />
            </motion.div>
          )}
        </AnimatePresence>
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
