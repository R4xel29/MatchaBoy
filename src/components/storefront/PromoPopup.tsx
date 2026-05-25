'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import Image from 'next/image';

interface ActivePopup {
  id: string;
  title: string;
  image: string;
  linkUrl: string | null;
  isActive: boolean;
}

export function PromoPopup() {
  const router = useRouter();
  const [popup, setPopup] = useState<ActivePopup | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Client-side only checks to avoid SSR hydration mismatches
    const fetchActivePopup = async () => {
      try {
        const res = await fetch('/api/promo-popup/active');
        if (!res.ok) return;
        
        const data = await res.json();
        if (data && data.id) {
          const isSeen = localStorage.getItem(`matchaboy_promo_popup_seen_${data.id}`);
          if (!isSeen) {
            setPopup(data);
            // Delay slightly for smoother visual entry after loading
            setTimeout(() => {
              setIsOpen(true);
            }, 800);
          }
        }
      } catch (error) {
        console.error('Failed to load active promo popup:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchActivePopup();
  }, []);

  const handleClose = () => {
    if (popup) {
      localStorage.setItem(`matchaboy_promo_popup_seen_${popup.id}`, 'true');
    }
    setIsOpen(false);
  };

  const handleImageClick = () => {
    if (!popup) return;
    
    // Mark as seen so they don't see it again on return
    localStorage.setItem(`matchaboy_promo_popup_seen_${popup.id}`, 'true');
    setIsOpen(false);

    if (popup.linkUrl) {
      if (popup.linkUrl.startsWith('/')) {
        router.push(popup.linkUrl);
      } else {
        window.location.href = popup.linkUrl;
      }
    }
  };

  return (
    <AnimatePresence>
      {isOpen && popup && (
        <div className="fixed inset-0 z-[999] flex flex-col items-center justify-center p-6 overflow-hidden select-none">
          {/* Blur Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.35 }}
            onClick={handleClose}
            className="absolute inset-0 bg-black/65 backdrop-blur-md cursor-pointer"
          />

          {/* Modal Container */}
          <div className="relative flex flex-col items-center max-w-[340px] sm:max-w-[380px] w-full z-10">
            {/* Promotion Card */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 30 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ type: 'spring', stiffness: 350, damping: 26 }}
              onClick={popup.linkUrl ? handleImageClick : undefined}
              className={`relative max-h-[70vh] w-full rounded-[2rem] overflow-hidden bg-transparent shadow-2xl border border-white/10 group ${
                popup.linkUrl ? 'cursor-pointer active:scale-[0.98] transition-transform duration-150' : ''
              }`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={popup.image}
                alt={popup.title}
                className="max-h-[70vh] w-full h-auto object-contain rounded-[2rem] mx-auto block"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = 'https://placehold.co/400x500/18442D/FFF?text=Promo+Matchaboy';
                }}
              />
              
              {/* Subtle glass overlay reflection effect */}
              <div className="absolute inset-0 bg-gradient-to-tr from-white/0 via-white/5 to-white/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none rounded-[2rem]" />
            </motion.div>

            {/* Circular Close Button below the image card */}
            <motion.button
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              transition={{ delay: 0.15, duration: 0.25 }}
              onClick={handleClose}
              className="mt-5 w-12 h-12 rounded-full bg-white text-slate-800 flex items-center justify-center shadow-lg border border-slate-200/50 hover:bg-slate-50 hover:scale-105 active:scale-95 transition-all duration-200"
            >
              <X className="w-5 h-5 stroke-[2.5px]" />
            </motion.button>
          </div>
        </div>
      )}
    </AnimatePresence>
  );
}
