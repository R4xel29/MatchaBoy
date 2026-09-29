'use client';

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
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
  const pathname = usePathname();

  const isExcludedRoute =
    !pathname ||
    pathname.startsWith('/spmb') ||
    pathname.startsWith('/admin') ||
    pathname.startsWith('/cashier') ||
    pathname.startsWith('/login') ||
    pathname.startsWith('/register') ||
    pathname.startsWith('/verify-wa') ||
    pathname.startsWith('/setup-');

  useEffect(() => {
    if (isExcludedRoute) return;

    let timer: ReturnType<typeof setTimeout> | null = null;
    let isCancelled = false;

    const checkAndShowPrompt = async () => {
      try {
        const hasSeenPrompt = localStorage.getItem('has_seen_permission_prompt');
        if (hasSeenPrompt === 'true') return;

        // Check browser native geolocation permission state if supported
        if ('permissions' in navigator && typeof navigator.permissions?.query === 'function') {
          try {
            const geoStatus = await navigator.permissions.query({ name: 'geolocation' as PermissionName });
            if (geoStatus.state === 'granted') {
              localStorage.setItem('has_seen_permission_prompt', 'true');
              // Silently cache coordinates once if granted
              if ('geolocation' in navigator) {
                navigator.geolocation.getCurrentPosition(
                  (pos) => {
                    const coords = { lat: pos.coords.latitude, lon: pos.coords.longitude, updatedAt: Date.now() };
                    localStorage.setItem('arus_user_coords', JSON.stringify(coords));
                    window.dispatchEvent(new CustomEvent('arus-location-updated', { detail: coords }));
                  },
                  () => {},
                  { enableHighAccuracy: false, timeout: 5000, maximumAge: 600000 }
                );
              }
              return;
            }
            if (geoStatus.state === 'denied') {
              localStorage.setItem('has_seen_permission_prompt', 'true');
              return;
            }
          } catch {
            // Ignore permissions API errors on older browsers
          }
        }

        if (!isCancelled) {
          timer = setTimeout(() => {
            if (localStorage.getItem('has_seen_permission_prompt') !== 'true') {
              setIsOpen(true);
            }
          }, 1500);
        }
      } catch {
        // Fallback if localStorage is restricted
      }
    };

    checkAndShowPrompt();

    return () => {
      isCancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [isExcludedRoute]);

  const handleClose = () => {
    try {
      localStorage.setItem('has_seen_permission_prompt', 'true');
    } catch {}
    setIsOpen(false);
  };

  const handleAllow = async () => {
    try {
      localStorage.setItem('has_seen_permission_prompt', 'true');
    } catch {}
    setIsOpen(false);

    // Request location permission natively once and persist result
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          try {
            const coords = { lat: pos.coords.latitude, lon: pos.coords.longitude, updatedAt: Date.now() };
            localStorage.setItem('arus_user_coords', JSON.stringify(coords));
            window.dispatchEvent(new CustomEvent('arus-location-updated', { detail: coords }));
          } catch {}
        },
        () => {},
        { enableHighAccuracy: false, timeout: 6000, maximumAge: 600000 }
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
              applicationServerKey: urlBase64ToUint8Array(publicVapidKey),
            });

            await fetch('/api/webpush/subscribe', {
              method: 'POST',
              body: JSON.stringify(subscription),
              headers: { 'Content-Type': 'application/json' },
            });
          }
        }
      } catch (err) {
        console.error('Failed to subscribe to web push:', err);
      }
    }
  };

  if (isExcludedRoute) {
    return null;
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center sm:p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-slate-900/45 backdrop-blur-sm"
            onClick={handleClose}
          />
          <motion.div
            initial={{ opacity: 0, y: '100%', scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: '100%', scale: 0.98 }}
            transition={{ type: 'spring', damping: 26, stiffness: 220 }}
            className="relative w-full sm:max-w-md bg-[#FFFBF7] sm:rounded-3xl rounded-t-3xl shadow-2xl border border-orange-100 overflow-hidden z-10 p-6 pt-7 flex flex-col"
          >
            {/* Decorative top glow */}
            <div className="absolute -top-16 -right-16 w-36 h-36 rounded-full bg-gradient-to-br from-orange-400/20 to-amber-300/10 blur-2xl pointer-events-none" />
            <div className="w-12 h-1.5 bg-orange-200/70 rounded-full mx-auto mb-4 sm:hidden" />

            <button
              onClick={handleClose}
              aria-label="Tutup"
              className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 rounded-full bg-white border border-orange-100/80 shadow-sm transition-colors"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl mb-4 bg-gradient-to-br from-orange-500 to-amber-500 text-white shadow-lg shadow-orange-500/25 ring-4 ring-orange-100">
              <ShieldCheck className="h-8 w-8" />
            </div>

            <span className="mx-auto mb-1.5 inline-flex items-center gap-1 px-3 py-0.5 rounded-full bg-orange-100/80 text-orange-700 text-[11px] font-bold uppercase tracking-wider">
              Pengalaman Lebih Optimal
            </span>

            <h2 className="text-xl font-extrabold text-center text-slate-900 mb-1.5">
              Aktifkan Lokasi & Notifikasi
            </h2>
            <p className="text-center text-slate-500 text-xs sm:text-sm mb-5 leading-relaxed px-2">
              Bantu <span className="font-bold text-orange-600">Arum Seduh</span> menyajikan rekomendasi sesuai cuaca sekitar dan kabar pesanan secara langsung:
            </p>

            <div className="space-y-3 mb-6">
              <div className="flex items-start gap-3.5 p-3.5 bg-white rounded-2xl border border-orange-100/90 shadow-sm">
                <div className="bg-gradient-to-br from-orange-50 to-amber-50 border border-orange-200/60 p-2.5 rounded-xl shrink-0 mt-0.5">
                  <MapPin className="w-5 h-5 text-orange-600" />
                </div>
                <div>
                  <h4 className="font-bold text-sm text-slate-900 mb-0.5">Lokasi Sekitar Anda</h4>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Menyesuaikan rekomendasi menu dengan cuaca sekitar dan menampilkan jarak outlet terdekat tanpa perlu ditanya berulang kali.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3.5 p-3.5 bg-white rounded-2xl border border-orange-100/90 shadow-sm">
                <div className="bg-gradient-to-br from-orange-50 to-amber-50 border border-orange-200/60 p-2.5 rounded-xl shrink-0 mt-0.5">
                  <Bell className="w-5 h-5 text-amber-600" />
                </div>
                <div>
                  <h4 className="font-bold text-sm text-slate-900 mb-0.5">Notifikasi Status Pesanan</h4>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Kabar instan saat minuman sedang diracik barista hingga siap diambil di meja atau kasir.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-2.5 w-full mt-auto">
              <button
                onClick={handleAllow}
                className="w-full flex items-center justify-center gap-2 px-4 py-3.5 font-bold text-sm text-white rounded-2xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 active:scale-[0.98] transition-all shadow-lg shadow-orange-500/20 cursor-pointer"
              >
                Izinkan Sekarang
              </button>
              <button
                onClick={handleClose}
                className="w-full px-4 py-3 font-semibold text-xs text-slate-500 hover:text-slate-700 hover:bg-orange-50/50 rounded-2xl transition-colors cursor-pointer"
              >
                Nanti Saja, Jangan Tanya Lagi
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
