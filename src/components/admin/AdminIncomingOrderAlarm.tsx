'use client';

import { useEffect, useState, useRef } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { Bell, X, ExternalLink } from 'lucide-react';
import { getAlarmSoundUrl, playBoostedAudio } from '@/lib/alarm-utils';

interface OrderData {
  id: string;
  status: string;
  orderType: string;
  pickupDate?: string | null;
  pickupTime?: string | null;
}

interface AdminIncomingOrderAlarmProps {
  initialAlarmSoundUrl?: string;
  initialAlarmVolumeBoost?: number;
  initialPickupAlarmLeadTime?: number;
}

const shouldTriggerAlarm = (order: OrderData, leadTimeMin: number) => {
  if (order.status !== 'PENDING' && order.status !== 'PENDING_PAYMENT') {
    return false;
  }
  if (order.orderType !== 'PICKUP') {
    return true; // immediate alarm
  }
  if (!order.pickupDate || !order.pickupTime) {
    return true; // immediate alarm if timing is unspecified
  }
  try {
    const scheduledDate = new Date(order.pickupDate);
    const [hours, minutes] = order.pickupTime.split(':').map(Number);
    scheduledDate.setHours(hours, minutes, 0, 0);

    const timeDiffMinutes = (scheduledDate.getTime() - Date.now()) / (1000 * 60);
    return timeDiffMinutes <= leadTimeMin;
  } catch (err) {
    console.error('[BG ALARM] Error parsing pickup time for alarm:', err);
    return true;
  }
};

export function AdminIncomingOrderAlarm({
  initialAlarmSoundUrl = '',
  initialAlarmVolumeBoost = 100,
  initialPickupAlarmLeadTime = 30,
}: AdminIncomingOrderAlarmProps) {
  const pathname = usePathname();
  const [hasUnread, setHasUnread] = useState(false);
  const [alarmSoundUrl, setAlarmSoundUrl] = useState(initialAlarmSoundUrl);
  const [alarmVolumeBoost, setAlarmVolumeBoost] = useState(initialAlarmVolumeBoost);
  const [pickupAlarmLeadTime, setPickupAlarmLeadTime] = useState(initialPickupAlarmLeadTime);
  const [isAudioBlocked, setIsAudioBlocked] = useState(false);
  const alarmAudioRef = useRef<HTMLAudioElement | null>(null);

  // Synchronize state with initial props if they update from server
  useEffect(() => {
    if (initialAlarmSoundUrl) {
      setAlarmSoundUrl(initialAlarmSoundUrl);
    }
  }, [initialAlarmSoundUrl]);

  useEffect(() => {
    if (initialAlarmVolumeBoost !== undefined) {
      setAlarmVolumeBoost(initialAlarmVolumeBoost);
    }
  }, [initialAlarmVolumeBoost]);

  useEffect(() => {
    if (initialPickupAlarmLeadTime !== undefined) {
      setPickupAlarmLeadTime(initialPickupAlarmLeadTime);
    }
  }, [initialPickupAlarmLeadTime]);

  // We only disable this background alarm on the dedicated Cashier Orders page ("/admin/cashier/orders"),
  // because that specific page already has its own order alarm and dismiss button.
  // On POS ("/admin/cashier") and all other admin menus, this alarm MUST remain active!
  const isOrdersPage = pathname ? pathname.replace(/\/$/, '') === '/admin/cashier/orders' : false;

  useEffect(() => {
    if (isOrdersPage) {
      if (alarmAudioRef.current) {
        alarmAudioRef.current.pause();
        alarmAudioRef.current.currentTime = 0;
      }
      setHasUnread(false);
      return;
    }

    const checkPendingOrders = async () => {
      try {
        const res = await fetch(`/api/cashier/orders?format=json&t=${Date.now()}`, {
          cache: 'no-store',
          headers: {
            'Pragma': 'no-cache',
            'Cache-Control': 'no-cache',
          },
        });
        if (!res.ok) return;

        const data = await res.json();
        if (!data.orders || !Array.isArray(data.orders)) {
          return;
        }

        const activeOrders: OrderData[] = data.orders;
        const leadTime = data.pickupAlarmLeadTime ?? pickupAlarmLeadTime;
        if (data.alarmSoundUrl !== undefined && data.alarmSoundUrl !== alarmSoundUrl) {
          setAlarmSoundUrl(data.alarmSoundUrl || '');
        }
        if (data.alarmVolumeBoost !== undefined && data.alarmVolumeBoost !== alarmVolumeBoost) {
          setAlarmVolumeBoost(data.alarmVolumeBoost);
        }
        if (data.pickupAlarmLeadTime !== undefined && data.pickupAlarmLeadTime !== pickupAlarmLeadTime) {
          setPickupAlarmLeadTime(data.pickupAlarmLeadTime);
        }

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

        // Check if there are any PENDING/PENDING_PAYMENT orders not in readIds and match alarm time
        const unread = activeOrders.some(
          (o) => shouldTriggerAlarm(o, leadTime) && !readIds.includes(o.id)
        );

        setHasUnread(unread);
      } catch (err) {
        console.error('[BG ALARM] Error polling pending orders in background:', err);
      }
    };

    // Run immediately on mount or page toggle
    checkPendingOrders();

    // Fast polling every 5 seconds so cashiers are notified promptly
    const interval = setInterval(checkPendingOrders, 5000);

    return () => {
      clearInterval(interval);
    };
  }, [isOrdersPage, pickupAlarmLeadTime, alarmSoundUrl, alarmVolumeBoost]);

  // Continuous Audio playback effect
  useEffect(() => {
    if (isOrdersPage || !hasUnread) {
      if (alarmAudioRef.current) {
        alarmAudioRef.current.pause();
        alarmAudioRef.current.currentTime = 0;
      }
      return;
    }

    const soundUrl = getAlarmSoundUrl(alarmSoundUrl);

    // Recreate clean Audio element if none exists or if URL changed
    if (!alarmAudioRef.current || alarmAudioRef.current.src !== soundUrl) {
      if (alarmAudioRef.current) {
        alarmAudioRef.current.pause();
      }
      const audio = new Audio();
      audio.crossOrigin = 'anonymous';
      audio.src = soundUrl;
      audio.loop = true;
      alarmAudioRef.current = audio;
    }

    playBoostedAudio(alarmAudioRef.current, alarmVolumeBoost)
      .then(() => {
        setIsAudioBlocked(false);
      })
      .catch((e) => {
        console.warn('[BG ALARM] Playback blocked by browser autoplay policy:', e);
        setIsAudioBlocked(true);
      });

    return () => {
      if (alarmAudioRef.current) {
        alarmAudioRef.current.pause();
      }
    };
  }, [hasUnread, isOrdersPage, alarmSoundUrl, alarmVolumeBoost]);

  // Auto-unlock audio playback on first user gesture anywhere if autoplay was initially blocked
  useEffect(() => {
    if (!hasUnread || !isAudioBlocked) return;

    const handleUnlockInteraction = () => {
      if (alarmAudioRef.current) {
        playBoostedAudio(alarmAudioRef.current, alarmVolumeBoost)
          .then(() => setIsAudioBlocked(false))
          .catch((err) => console.warn('[BG ALARM] User interaction unlock failed:', err));
      }
    };

    window.addEventListener('click', handleUnlockInteraction, { once: true });
    window.addEventListener('touchstart', handleUnlockInteraction, { once: true });
    window.addEventListener('keydown', handleUnlockInteraction, { once: true });

    return () => {
      window.removeEventListener('click', handleUnlockInteraction);
      window.removeEventListener('touchstart', handleUnlockInteraction);
      window.removeEventListener('keydown', handleUnlockInteraction);
    };
  }, [hasUnread, isAudioBlocked, alarmVolumeBoost]);

  // Dismiss / stop current alarm
  const handleDismiss = () => {
    if (alarmAudioRef.current) {
      alarmAudioRef.current.pause();
      alarmAudioRef.current.currentTime = 0;
    }
    setHasUnread(false);
  };

  if (isOrdersPage || !hasUnread) return null;

  return (
    <div className="fixed bottom-4 right-4 z-[9999] max-w-sm w-full bg-gradient-to-r from-orange-600 to-amber-600 text-white rounded-2xl p-4 shadow-2xl border border-orange-400/30 flex items-center justify-between gap-3 animate-in slide-in-from-bottom-2 duration-300">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
          <Bell className="w-5 h-5 animate-bounce text-white" />
        </div>
        <div>
          <p className="text-xs font-bold leading-tight">Ada Pesanan Baru Belum Diproses!</p>
          <p className="text-[11px] text-orange-100 mt-0.5 leading-snug">
            {isAudioBlocked 
              ? 'Klik tombol "Aktifkan" untuk membunyikan alarm suara.' 
              : 'Silakan buka Pesanan Hari Ini untuk memproses pesanan.'}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-1.5 shrink-0">
        {isAudioBlocked ? (
          <button
            onClick={() => {
              if (alarmAudioRef.current) {
                playBoostedAudio(alarmAudioRef.current, alarmVolumeBoost)
                  .then(() => setIsAudioBlocked(false))
                  .catch((err) => console.warn('[BG ALARM] Manual unlock failed:', err));
              }
            }}
            className="px-2.5 py-1.5 bg-white text-orange-700 hover:bg-orange-50 text-[11px] font-bold rounded-lg active:scale-[0.98] transition-all shadow-sm"
          >
            Aktifkan
          </button>
        ) : (
          <Link
            href="/admin/cashier/orders"
            className="px-2.5 py-1.5 bg-white/20 hover:bg-white/30 text-white text-[11px] font-semibold rounded-lg transition-colors flex items-center gap-1"
          >
            <span>Buka</span>
            <ExternalLink className="w-3 h-3" />
          </Link>
        )}
        <button
          onClick={handleDismiss}
          className="p-1 hover:bg-white/10 rounded-full text-white/80 hover:text-white transition-colors"
          title="Tutup notifikasi sementara"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
