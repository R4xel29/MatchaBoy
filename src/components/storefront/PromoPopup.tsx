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
  displayFrequency?: string;
}

export function PromoPopup() {
  const router = useRouter();
  const [popup, setPopup] = useState<ActivePopup | null>(null);
  const [popupQueue, setPopupQueue] = useState<ActivePopup[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Client-side only checks to avoid SSR hydration mismatches
    const fetchActivePopups = async () => {
      try {
        const res = await fetch('/api/promo-popup/active');
        if (!res.ok) return;
        
        const data = await res.json();
        if (Array.isArray(data)) {
          const queue: ActivePopup[] = [];
          
          for (const item of data) {
            if (!item || !item.id) continue;
            const freq = item.displayFrequency || 'ONCE';
            let shouldShow = false;

            if (freq === 'ONCE') {
              const isSeen = localStorage.getItem(`matchaboy_promo_popup_seen_${item.id}`);
              if (!isSeen) shouldShow = true;
            } else if (freq === 'EVERY_SESSION') {
              const isSeenSession = sessionStorage.getItem(`matchaboy_promo_popup_seen_session_${item.id}`);
              if (!isSeenSession) shouldShow = true;
            } else {
              // Time-based frequencies: EVERY_5_MIN, EVERY_10_MIN, EVERY_20_MIN, EVERY_30_MIN, EVERY_DAY
              const lastSeenStr = localStorage.getItem(`matchaboy_promo_popup_last_seen_${item.id}`);
              if (!lastSeenStr) {
                shouldShow = true;
              } else {
                const lastSeen = parseInt(lastSeenStr, 10);
                const now = Date.now();
                let cooldownMs = 24 * 60 * 60 * 1000; // default EVERY_DAY: 1 day

                if (freq === 'EVERY_5_MIN') cooldownMs = 5 * 60 * 1000;
                else if (freq === 'EVERY_10_MIN') cooldownMs = 10 * 60 * 1000;
                else if (freq === 'EVERY_20_MIN') cooldownMs = 20 * 60 * 1000;
                else if (freq === 'EVERY_30_MIN') cooldownMs = 30 * 60 * 1000;

                if (now - lastSeen > cooldownMs) {
                  shouldShow = true;
                }
              }
            }

            if (shouldShow) {
              queue.push(item);
            }
          }

          if (queue.length > 0) {
            setPopupQueue(queue);
            setPopup(queue[0]);
            // Delay slightly for smoother visual entry after loading
            setTimeout(() => {
              setIsOpen(true);
            }, 800);
          }
        }
      } catch (error) {
        console.error('Failed to load active promo popups:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchActivePopups();
  }, []);

  const markAsSeen = (currPopup: ActivePopup) => {
    const freq = currPopup.displayFrequency || 'ONCE';
    const nowStr = Date.now().toString();

    if (freq === 'ONCE') {
      localStorage.setItem(`matchaboy_promo_popup_seen_${currPopup.id}`, 'true');
    } else if (freq === 'EVERY_SESSION') {
      sessionStorage.setItem(`matchaboy_promo_popup_seen_session_${currPopup.id}`, 'true');
    } else {
      localStorage.setItem(`matchaboy_promo_popup_last_seen_${currPopup.id}`, nowStr);
    }
  };

  const handleClose = () => {
    if (popup) {
      markAsSeen(popup);
    }
    setIsOpen(false);

    // If there is more in the queue, show the next one after a delay
    if (popupQueue.length > 1) {
      setTimeout(() => {
        const nextQueue = popupQueue.slice(1);
        setPopupQueue(nextQueue);
        setPopup(nextQueue[0]);
        setTimeout(() => {
          setIsOpen(true);
        }, 500); // Wait for fade in
      }, 400); // Wait for previous modal close transition to complete
    } else {
      setPopupQueue([]);
      setPopup(null);
    }
  };

  const handleImageClick = () => {
    if (!popup) return;
    
    markAsSeen(popup);
    setIsOpen(false);

    if (popup.linkUrl) {
      if (popup.linkUrl.startsWith('/')) {
        router.push(popup.linkUrl);
      } else {
        window.location.href = popup.linkUrl;
      }
    }

    // Process next in queue
    if (popupQueue.length > 1) {
      setTimeout(() => {
        const nextQueue = popupQueue.slice(1);
        setPopupQueue(nextQueue);
        setPopup(nextQueue[0]);
        setTimeout(() => {
          setIsOpen(true);
        }, 500);
      }, 400);
    } else {
      setPopupQueue([]);
      setPopup(null);
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
