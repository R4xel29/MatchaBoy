'use client';

import { useEffect, useState, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { Bell, X } from 'lucide-react';

interface OrderData {
  id: string;
  status: string;
}

export function AdminIncomingOrderAlarm() {
  const pathname = usePathname();
  const [hasUnread, setHasUnread] = useState(false);
  const [isAudioBlocked, setIsAudioBlocked] = useState(false);
  const alarmAudioRef = useRef<HTMLAudioElement | null>(null);

  // We only run this alarm if we are NOT on the cashier page (since that page has its own alarm)
  const isCashierPage = pathname ? pathname.startsWith('/admin/cashier') : false;

  useEffect(() => {
    if (isCashierPage) {
      // Stop sound if we just navigated to the cashier page
      if (alarmAudioRef.current) {
        alarmAudioRef.current.pause();
        alarmAudioRef.current.currentTime = 0;
      }
      setHasUnread(false);
      return;
    }

    const checkPendingOrders = async () => {
      try {
        console.log('[BG ALARM] Polling pending orders...');
        const res = await fetch(`/api/cashier/orders?format=json&t=${Date.now()}`, {
          cache: 'no-store',
          headers: {
            'Pragma': 'no-cache',
            'Cache-Control': 'no-cache'
          }
        });
        console.log('[BG ALARM] Fetch status:', res.status);
        if (!res.ok) return;

        const data = await res.json();
        if (!data.orders || !Array.isArray(data.orders)) {
          console.log('[BG ALARM] No orders array found in response data');
          return;
        }

        const activeOrders: OrderData[] = data.orders;
        console.log('[BG ALARM] Total orders loaded:', activeOrders.length);

        // Get read orders from localStorage
        let readIds: string[] = [];
        const saved = localStorage.getItem('cashier_read_orders');
        if (saved) {
          try {
            readIds = JSON.parse(saved);
          } catch {
            // Ignore
          }
        }
        console.log('[BG ALARM] Read order IDs from localStorage:', readIds);

        // Check if there are any PENDING/PENDING_PAYMENT orders not in readIds
        const unread = activeOrders.some(
          o => (o.status === 'PENDING' || o.status === 'PENDING_PAYMENT') && !readIds.includes(o.id)
        );
        console.log('[BG ALARM] Computed hasUnread orders:', unread);

        setHasUnread(unread);
      } catch (err) {
        console.error('[BG ALARM] Error polling pending orders in background:', err);
      }
    };

    // Run immediately on mount/pathname change
    checkPendingOrders();

    // Poll every 10 seconds
    const interval = setInterval(checkPendingOrders, 10000);

    return () => {
      clearInterval(interval);
    };
  }, [isCashierPage, pathname]);

  // Audio playback effect
  useEffect(() => {
    if (isCashierPage || !hasUnread) {
      if (alarmAudioRef.current) {
        console.log('[BG ALARM] Stopping sound playback');
        alarmAudioRef.current.pause();
        alarmAudioRef.current.currentTime = 0;
      }
      return;
    }

    if (!alarmAudioRef.current) {
      const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
      audio.loop = true;
      alarmAudioRef.current = audio;
    }

    console.log('[BG ALARM] Attempting to play looping alarm sound...');
    alarmAudioRef.current.play()
      .then(() => {
        console.log('[BG ALARM] Playback succeeded');
        setIsAudioBlocked(false);
      })
      .catch(e => {
        console.log('[BG ALARM] Playback blocked by browser autoplay policy:', e);
        setIsAudioBlocked(true);
      });

    return () => {
      if (alarmAudioRef.current) {
        alarmAudioRef.current.pause();
      }
    };
  }, [hasUnread, isCashierPage]);

  // If there are unread orders and audio is blocked, show a global notification badge/banner
  if (isCashierPage || !hasUnread) return null;

  return (
    <div className="fixed bottom-4 right-4 z-[9999] max-w-sm w-full bg-red-600 text-white rounded-2xl p-4 shadow-2xl border border-red-500/30 flex items-center justify-between gap-3 animate-in slide-in-from-bottom-2 duration-300">
      <div className="flex items-center gap-3">
        <Bell className="w-5 h-5 animate-bounce shrink-0 text-white" />
        <div>
          <p className="text-xs font-bold">Ada Pesanan Baru Belum Dibuka!</p>
          <p className="text-[10px] text-red-100 mt-0.5 leading-relaxed">
            {isAudioBlocked 
              ? 'Klik tombol "Aktifkan" di samping untuk mendengarkan alarm suara.' 
              : 'Silakan buka menu Kasir untuk memproses pesanan.'}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        {isAudioBlocked && (
          <button
            onClick={() => {
              if (alarmAudioRef.current) {
                alarmAudioRef.current.play()
                  .then(() => setIsAudioBlocked(false))
                  .catch(err => console.log('[BG ALARM] Play retry failed:', err));
              }
            }}
            className="px-3 py-1.5 bg-white text-red-700 hover:bg-red-50 text-[10px] font-bold rounded-lg active:scale-[0.98] transition-all shrink-0 shadow-sm"
          >
            Aktifkan
          </button>
        )}
        <button
          onClick={() => setHasUnread(false)}
          className="p-1 hover:bg-white/10 rounded-full text-white/80 hover:text-white transition-colors"
          title="Tutup notifikasi sementara"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
