'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MapPin, ShieldCheck, X, Bell } from 'lucide-react';
import { useSession } from 'next-auth/react';

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export function PermissionPrompt() {
  const [isOpen, setIsOpen] = useState(false);
  const { data: session } = useSession();

  useEffect(() => {
    const hasSeenPrompt = localStorage.getItem('has_seen_permission_prompt');
    if (!hasSeenPrompt) {
      const timer = setTimeout(() => {
        setIsOpen(true);
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleClose = () => {
    localStorage.setItem('has_seen_permission_prompt', 'true');
    setIsOpen(false);
  };

  const handleAllow = async () => {
    // Request location permission natively
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        () => {},
        () => {}
      );
    }
    
    // Request notification permission if supported
    if ('Notification' in window && 'serviceWorker' in navigator && 'PushManager' in window) {
      try {
        const permission = await Notification.requestPermission();
        if (permission === 'granted' && session?.user) {
          const registration = await navigator.serviceWorker.register('/sw.js');
          const publicVapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
          
          if (publicVapidKey) {
            const subscription = await registration.pushManager.subscribe({
              userVisibleOnly: true,
              applicationServerKey: urlBase64ToUint8Array(publicVapidKey)
            });
            
            await fetch('/api/webpush/subscribe', {
              method: 'POST',
              body: JSON.stringify(subscription),
              headers: { 'Content-Type': 'application/json' }
            });
          }
        }
      } catch (err) {
        console.error('Failed to subscribe to web push:', err);
      }
    }

    handleClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center sm:p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={handleClose}
          />
          <motion.div
            initial={{ opacity: 0, y: '100%' }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="relative w-full sm:max-w-md bg-white sm:rounded-2xl rounded-t-2xl shadow-xl overflow-hidden z-10 p-6 pt-8 flex flex-col"
          >
            <button 
              onClick={handleClose}
              className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-600 rounded-full bg-gray-50"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full mb-5 bg-brand-100">
               <ShieldCheck className="h-8 w-8 text-brand-600" />
            </div>
            
            <h2 className="text-2xl font-bold font-heading text-center text-foreground mb-3">
              Izin Akses Aplikasi
            </h2>
            <p className="text-center text-muted-foreground text-sm mb-6 leading-relaxed px-2">
              Untuk memberikan pengalaman terbaik, Arus memerlukan beberapa izin dari perangkat Anda:
            </p>

            <div className="space-y-4 mb-8">
              <div className="flex items-start gap-4 p-4 bg-gray-50 rounded-xl">
                <div className="bg-white p-2 rounded-lg shadow-sm mt-0.5">
                  <MapPin className="w-5 h-5 text-brand-600" />
                </div>
                <div>
                  <h4 className="font-semibold text-sm text-foreground mb-1">Lokasi</h4>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Membantu kami menemukan alamat pengiriman dengan akurat dan menyarankan layanan terdekat.
                  </p>
                </div>
              </div>
              
              <div className="flex items-start gap-4 p-4 bg-gray-50 rounded-xl">
                <div className="bg-white p-2 rounded-lg shadow-sm mt-0.5">
                  <Bell className="w-5 h-5 text-brand-600" />
                </div>
                <div>
                  <h4 className="font-semibold text-sm text-foreground mb-1">Notifikasi</h4>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Menerima pemberitahuan tentang status pesanan, promo, dan info penting lainnya.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-3 w-full mt-auto">
              <button
                onClick={handleAllow}
                className="w-full flex items-center justify-center gap-2 px-4 py-3.5 font-bold text-sm text-white rounded-xl bg-brand-600 hover:bg-brand-700 transition-colors shadow-sm"
              >
                Izinkan Akses
              </button>
              <button
                onClick={handleClose}
                className="w-full px-4 py-3.5 font-medium text-sm text-muted-foreground hover:bg-gray-50 rounded-xl transition-colors"
              >
                Nanti Saja
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
