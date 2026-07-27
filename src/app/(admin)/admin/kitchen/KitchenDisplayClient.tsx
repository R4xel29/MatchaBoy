'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { 
  ChefHat, 
  Volume2, 
  VolumeX, 
  Sun, 
  Moon, 
  RefreshCw, 
  CheckCircle2, 
  Clock, 
  Flame, 
  Lock,
  Unlock,
  Utensils,
  MessageSquare,
  BellRing,
  Check
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export interface KitchenItem {
  id: string;
  qty: number;
  price: number;
  modifiers?: string | null;
  product: {
    id: string;
    name: string;
    image?: string | null;
  };
}

export interface KitchenOrder {
  id: string;
  customerName: string;
  customerPhone: string;
  address?: string | null;
  tableNumber?: string | null;
  orderType: string;
  source: string;
  status: string;
  total: number;
  notes?: string | null;
  queueNumber?: string | null;
  createdAt: string;
  items: KitchenItem[];
}

interface KitchenDisplayClientProps {
  initialOrders: KitchenOrder[];
}

export default function KitchenDisplayClient({ initialOrders }: KitchenDisplayClientProps) {
  const [orders, setOrders] = useState<KitchenOrder[]>(initialOrders);
  const [filterStatus, setFilterStatus] = useState<'ALL' | 'PENDING' | 'PREPARING' | 'READY'>('ALL');
  const [isAudioEnabled, setIsAudioEnabled] = useState<boolean>(false);
  const [isWakeLockActive, setIsWakeLockActive] = useState<boolean>(false);
  const [wakeLockSupported, setWakeLockSupported] = useState<boolean>(false);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [loadingOrderId, setLoadingOrderId] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [darkMode, setDarkMode] = useState<boolean>(true);

  const wakeLockSentinelRef = useRef<any>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const knownPendingOrderIdsRef = useRef<Set<string>>(
    new Set(initialOrders.filter((o) => o.status === 'PENDING').map((o) => o.id))
  );

  // Synthesize loud dual-tone kitchen chime using Web Audio API
  const playKitchenBell = useCallback(() => {
    try {
      if (!audioContextRef.current) {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioCtx) {
          audioContextRef.current = new AudioCtx();
        }
      }

      const ctx = audioContextRef.current;
      if (!ctx) return;

      if (ctx.state === 'suspended') {
        ctx.resume();
      }

      const now = ctx.currentTime;

      // Tone 1: High crisp bell (1046.5 Hz)
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(1046.5, now);
      gain1.gain.setValueAtTime(0.8, now);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 1.2);
      osc1.connect(gain1);
      gain1.connect(ctx.destination);

      // Tone 2: Harmonious chime (1318.5 Hz)
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = 'triangle';
      osc2.frequency.setValueAtTime(1318.5, now + 0.1);
      gain2.gain.setValueAtTime(0.7, now + 0.1);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 1.4);
      osc2.connect(gain2);
      gain2.connect(ctx.destination);

      // Tone 3: Second dong (0.35s later - 783.99 Hz)
      const osc3 = ctx.createOscillator();
      const gain3 = ctx.createGain();
      osc3.type = 'sine';
      osc3.frequency.setValueAtTime(783.99, now + 0.35);
      gain3.gain.setValueAtTime(0.9, now + 0.35);
      gain3.gain.exponentialRampToValueAtTime(0.001, now + 1.8);
      osc3.connect(gain3);
      gain3.connect(ctx.destination);

      osc1.start(now);
      osc1.stop(now + 1.2);

      osc2.start(now + 0.1);
      osc2.stop(now + 1.4);

      osc3.start(now + 0.35);
      osc3.stop(now + 1.8);
    } catch (err) {
      console.error('[KITCHEN_BELL] Error playing audio chime:', err);
    }
  }, []);

  // Web Wake Lock API implementation
  const requestWakeLock = useCallback(async () => {
    if (!('wakeLock' in navigator)) {
      setWakeLockSupported(false);
      return;
    }
    setWakeLockSupported(true);
    try {
      wakeLockSentinelRef.current = await (navigator as any).wakeLock.request('screen');
      setIsWakeLockActive(true);

      wakeLockSentinelRef.current.addEventListener('release', () => {
        setIsWakeLockActive(false);
      });
    } catch (err) {
      console.warn('[WAKE_LOCK] Request failed:', err);
      setIsWakeLockActive(false);
    }
  }, []);

  const releaseWakeLock = useCallback(async () => {
    if (wakeLockSentinelRef.current) {
      try {
        await wakeLockSentinelRef.current.release();
        wakeLockSentinelRef.current = null;
      } catch (err) {
        console.error('[WAKE_LOCK] Release error:', err);
      }
    }
    setIsWakeLockActive(false);
  }, []);

  useEffect(() => {
    requestWakeLock();

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        requestWakeLock();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      releaseWakeLock();
    };
  }, [requestWakeLock, releaseWakeLock]);

  const toggleAudio = () => {
    if (!isAudioEnabled) {
      setIsAudioEnabled(true);
      playKitchenBell();
    } else {
      setIsAudioEnabled(false);
    }
  };

  // Poll orders every 4 seconds
  const fetchOrders = useCallback(async (isManual = false) => {
    if (isManual) setIsRefreshing(true);
    try {
      const res = await fetch('/api/orders?status=PENDING,PREPARING,READY');
      if (!res.ok) throw new Error(`HTTP error ${res.status}`);
      const data = await res.json();
      if (data.success && Array.isArray(data.orders)) {
        const fetchedOrders: KitchenOrder[] = data.orders;

        const currentPendingIds = new Set<string>();
        let hasNewPending = false;

        fetchedOrders.forEach((order) => {
          if (order.status === 'PENDING') {
            currentPendingIds.add(order.id);
            if (!knownPendingOrderIdsRef.current.has(order.id)) {
              hasNewPending = true;
            }
          }
        });

        knownPendingOrderIdsRef.current = currentPendingIds;

        if (hasNewPending && isAudioEnabled) {
          playKitchenBell();
        }

        setOrders(fetchedOrders);
        setLastUpdated(new Date());
      }
    } catch (err) {
      console.error('[KITCHEN_POLL] Error polling orders:', err);
    } finally {
      if (isManual) setIsRefreshing(false);
    }
  }, [isAudioEnabled, playKitchenBell]);

  useEffect(() => {
    const interval = setInterval(() => {
      fetchOrders(false);
    }, 4000);
    return () => clearInterval(interval);
  }, [fetchOrders]);

  const handleUpdateStatus = async (orderId: string, newStatus: string) => {
    setLoadingOrderId(orderId);
    try {
      const res = await fetch(`/api/admin/orders/${orderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!res.ok) {
        const resCashier = await fetch(`/api/cashier/orders/${orderId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: newStatus }),
        });
        if (!resCashier.ok) {
          const errText = await resCashier.text();
          alert(`Gagal memperbarui status: ${errText}`);
          return;
        }
      }

      setOrders((prev) =>
        prev
          .map((o) => (o.id === orderId ? { ...o, status: newStatus } : o))
          .filter((o) => ['PENDING', 'PREPARING', 'READY'].includes(o.status))
      );

      if (isAudioEnabled && newStatus === 'READY') {
        playKitchenBell();
      }

      await fetchOrders(false);
    } catch (err: any) {
      alert(`Terjadi kesalahan: ${err.message}`);
    } finally {
      setLoadingOrderId(null);
    }
  };

  const filteredOrders = orders.filter((order) => {
    if (filterStatus === 'ALL') return true;
    return order.status === filterStatus;
  });

  const countPending = orders.filter((o) => o.status === 'PENDING').length;
  const countPreparing = orders.filter((o) => o.status === 'PREPARING').length;
  const countReady = orders.filter((o) => o.status === 'READY').length;

  return (
    <div className={`min-h-screen transition-colors duration-300 ${darkMode ? 'bg-zinc-950 text-zinc-100' : 'bg-slate-100 text-zinc-900'} p-2 sm:p-4 font-sans`}>
      {/* Top Header Bar */}
      <header className={`sticky top-0 z-30 rounded-2xl p-3 sm:p-4 mb-4 shadow-xl border backdrop-blur-md transition-colors ${darkMode ? 'bg-zinc-900/90 border-zinc-800' : 'bg-white/90 border-slate-200'}`}>
        <div className="flex flex-wrap items-center justify-between gap-2 sm:gap-4">
          
          {/* Title & Badge */}
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 bg-emerald-500/20 text-emerald-400 rounded-xl border border-emerald-500/30">
              <ChefHat className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black tracking-tight flex items-center gap-2">
                LAYAR DAPUR (KDS)
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  HP Mobile
                </span>
              </h1>
              <p className="text-xs text-zinc-400 font-mono">
                Update otomatis tiap 4d • Terakhir: {lastUpdated.toLocaleTimeString('id-ID')}
              </p>
            </div>
          </div>

          {/* Action Control Buttons */}
          <div className="flex items-center gap-2 flex-wrap">
            
            {/* Audio Toggle */}
            <button
              onClick={toggleAudio}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all border ${
                isAudioEnabled
                  ? 'bg-emerald-600 text-white border-emerald-500 shadow-lg shadow-emerald-900/40 ring-2 ring-emerald-400/30'
                  : darkMode ? 'bg-zinc-800 text-zinc-400 border-zinc-700 hover:bg-zinc-700' : 'bg-slate-200 text-slate-700 border-slate-300'
              }`}
            >
              {isAudioEnabled ? (
                <>
                  <Volume2 className="w-4 h-4 text-emerald-200 animate-bounce" />
                  <span>Audio Dapur ON</span>
                </>
              ) : (
                <>
                  <VolumeX className="w-4 h-4 text-zinc-400" />
                  <span>Aktifkan Audio Dapur</span>
                </>
              )}
            </button>

            {/* Test Sound Button */}
            {isAudioEnabled && (
              <button
                onClick={playKitchenBell}
                title="Tes suara lonceng dapur"
                className="px-2.5 py-2 bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 border border-amber-500/30 rounded-xl text-xs font-bold transition-all flex items-center gap-1"
              >
                <BellRing className="w-4 h-4" />
                <span className="hidden sm:inline">Tes Bel</span>
              </button>
            )}

            {/* Wake Lock Status / Toggle */}
            <button
              onClick={() => (isWakeLockActive ? releaseWakeLock() : requestWakeLock())}
              title={wakeLockSupported ? 'Fitur Layar Tetap Menyala' : 'Web Wake Lock tidak didukung browser'}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all border ${
                isWakeLockActive
                  ? 'bg-blue-600 text-white border-blue-500 shadow-lg shadow-blue-900/40'
                  : darkMode ? 'bg-zinc-800 text-zinc-400 border-zinc-700' : 'bg-slate-200 text-slate-700 border-slate-300'
              }`}
            >
              {isWakeLockActive ? (
                <>
                  <Lock className="w-4 h-4 text-blue-200" />
                  <span className="hidden sm:inline">Layar ON (WakeLock)</span>
                  <span className="sm:hidden">Layar ON</span>
                </>
              ) : (
                <>
                  <Unlock className="w-4 h-4" />
                  <span className="hidden sm:inline">Aktifkan Layar ON</span>
                  <span className="sm:hidden">Layar OFF</span>
                </>
              )}
            </button>

            {/* Dark / Light Toggle */}
            <button
              onClick={() => setDarkMode(!darkMode)}
              className={`p-2 rounded-xl border transition-all ${
                darkMode ? 'bg-zinc-800 text-amber-400 border-zinc-700' : 'bg-slate-200 text-amber-600 border-slate-300'
              }`}
            >
              {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>

            {/* Refresh Button */}
            <button
              onClick={() => fetchOrders(true)}
              disabled={isRefreshing}
              className={`p-2 rounded-xl border transition-all ${
                darkMode ? 'bg-zinc-800 text-zinc-300 border-zinc-700 hover:bg-zinc-700' : 'bg-slate-200 text-slate-700 border-slate-300'
              }`}
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-emerald-400' : ''}`} />
            </button>
          </div>
        </div>

        {/* Status Filter Tabs */}
        <div className="flex items-center gap-2 mt-3 pt-3 border-t border-zinc-800/60 overflow-x-auto no-scrollbar">
          <button
            onClick={() => setFilterStatus('ALL')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all border flex items-center gap-1.5 ${
              filterStatus === 'ALL'
                ? 'bg-emerald-500 text-black border-emerald-400 font-extrabold shadow-md'
                : darkMode ? 'bg-zinc-800/80 text-zinc-400 border-zinc-700' : 'bg-slate-200 text-slate-700 border-slate-300'
            }`}
          >
            Semua Pesanan
            <span className="ml-1 px-1.5 py-0.5 rounded-full text-[10px] bg-black/20 text-current">
              {orders.length}
            </span>
          </button>

          <button
            onClick={() => setFilterStatus('PENDING')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all border flex items-center gap-1.5 ${
              filterStatus === 'PENDING'
                ? 'bg-amber-500 text-black border-amber-400 font-extrabold shadow-md'
                : darkMode ? 'bg-amber-950/40 text-amber-400 border-amber-800/40' : 'bg-amber-100 text-amber-800 border-amber-300'
            }`}
          >
            🔥 Baru (Pending)
            {countPending > 0 && (
              <span className="ml-1 px-1.5 py-0.5 rounded-full text-[10px] bg-amber-600 text-white font-black animate-pulse">
                {countPending}
              </span>
            )}
          </button>

          <button
            onClick={() => setFilterStatus('PREPARING')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all border flex items-center gap-1.5 ${
              filterStatus === 'PREPARING'
                ? 'bg-blue-500 text-white border-blue-400 font-extrabold shadow-md'
                : darkMode ? 'bg-blue-950/40 text-blue-400 border-blue-800/40' : 'bg-blue-100 text-blue-800 border-blue-300'
            }`}
          >
            🍳 Sedang Dimasak
            {countPreparing > 0 && (
              <span className="ml-1 px-1.5 py-0.5 rounded-full text-[10px] bg-blue-600 text-white font-bold">
                {countPreparing}
              </span>
            )}
          </button>

          <button
            onClick={() => setFilterStatus('READY')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all border flex items-center gap-1.5 ${
              filterStatus === 'READY'
                ? 'bg-emerald-500 text-black border-emerald-400 font-extrabold shadow-md'
                : darkMode ? 'bg-emerald-950/40 text-emerald-400 border-emerald-800/40' : 'bg-emerald-100 text-emerald-800 border-emerald-300'
            }`}
          >
            ✅ Siap Saji
            {countReady > 0 && (
              <span className="ml-1 px-1.5 py-0.5 rounded-full text-[10px] bg-emerald-600 text-white font-bold">
                {countReady}
              </span>
            )}
          </button>
        </div>
      </header>

      {/* Orders Grid - Mobile Optimized */}
      {filteredOrders.length === 0 ? (
        <div className={`flex flex-col items-center justify-center p-12 text-center rounded-3xl border ${darkMode ? 'bg-zinc-900/50 border-zinc-800 text-zinc-500' : 'bg-white border-slate-200 text-slate-400'}`}>
          <ChefHat className="w-16 h-16 mb-4 stroke-1 animate-bounce opacity-40" />
          <h3 className="text-lg font-bold text-zinc-300 mb-1">Belum Ada Pesanan Dapur</h3>
          <p className="text-xs max-w-sm text-zinc-500">
            Pesanan baru dari Kasir, Dine-In Meja, atau SPMB akan muncul otomatis di sini lengkap dengan lonceng alert.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          <AnimatePresence mode="popLayout">
            {filteredOrders.map((order) => {
              const isPending = order.status === 'PENDING';
              const isPreparing = order.status === 'PREPARING';
              const isReady = order.status === 'READY';
              const isLoadingThis = loadingOrderId === order.id;

              return (
                <motion.div
                  key={order.id}
                  layout
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.2 }}
                  className={`rounded-3xl border-2 overflow-hidden shadow-2xl transition-all flex flex-col justify-between ${
                    isPending
                      ? darkMode
                        ? 'bg-zinc-900 border-amber-500/80 ring-4 ring-amber-500/10'
                        : 'bg-white border-amber-400 ring-4 ring-amber-400/20'
                      : isPreparing
                      ? darkMode
                        ? 'bg-zinc-900 border-blue-500/80 ring-2 ring-blue-500/10'
                        : 'bg-white border-blue-400 ring-2 ring-blue-400/20'
                      : darkMode
                      ? 'bg-zinc-900 border-emerald-500/80'
                      : 'bg-white border-emerald-400'
                  }`}
                >
                  {/* Card Header: Table Number / Location Banner */}
                  <div>
                    <div
                      className={`px-4 py-3 border-b flex items-center justify-between ${
                        isPending
                          ? 'bg-amber-500 text-black border-amber-600'
                          : isPreparing
                          ? 'bg-blue-600 text-white border-blue-700'
                          : 'bg-emerald-600 text-white border-emerald-700'
                      }`}
                    >
                      {/* Prominent Table Number / Location */}
                      <div className="flex items-center gap-2">
                        <Utensils className="w-5 h-5" />
                        <span className="text-xl sm:text-2xl font-black tracking-wider uppercase">
                          {order.tableNumber
                            ? `MEJA ${order.tableNumber}`
                            : order.source === 'SPMB'
                            ? `SPMB (${order.address || 'Gedung'})`
                            : order.orderType === 'PICKUP'
                            ? 'TAKEAWAY / PICKUP'
                            : 'DELIVERY'}
                        </span>
                      </div>

                      {/* Queue Number */}
                      <div className="text-right">
                        <span className="text-xs font-bold block opacity-80">No. Antrean</span>
                        <span className="text-base font-black tracking-tight">
                          #{order.queueNumber || order.id.slice(-6).toUpperCase()}
                        </span>
                      </div>
                    </div>

                    {/* Order Metadata Row */}
                    <div className={`px-4 py-2 text-xs flex items-center justify-between border-b ${darkMode ? 'bg-zinc-950/60 border-zinc-800 text-zinc-400' : 'bg-slate-50 border-slate-200 text-slate-600'}`}>
                      <div className="flex items-center gap-2 font-medium">
                        <span className="font-semibold text-zinc-200">{order.customerName}</span>
                        <span>•</span>
                        <span className="uppercase font-bold text-[10px] px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-300">
                          {order.orderType}
                        </span>
                      </div>

                      <div className="flex items-center gap-1 font-mono text-[11px]">
                        <Clock className="w-3.5 h-3.5" />
                        {new Date(order.createdAt).toLocaleTimeString('id-ID', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </div>
                    </div>

                    {/* Catatan Khusus Order */}
                    {order.notes && (
                      <div className="mx-4 mt-3 p-2.5 bg-amber-500/10 border border-amber-500/30 rounded-xl text-xs text-amber-300 flex items-start gap-2">
                        <MessageSquare className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                        <div>
                          <span className="font-bold block text-amber-400 text-[10px] uppercase tracking-wider">Catatan Khusus</span>
                          <span className="font-medium leading-tight">{order.notes}</span>
                        </div>
                      </div>
                    )}

                    {/* Items List */}
                    <div className="p-4 space-y-3">
                      <div className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 border-b border-zinc-800/60 pb-1 mb-2">
                        Rincian Pesanan ({order.items.length} Menu)
                      </div>

                      {order.items.map((item, idx) => (
                        <div
                          key={item.id || idx}
                          className={`p-3 rounded-2xl border transition-all ${
                            darkMode ? 'bg-zinc-950/70 border-zinc-800' : 'bg-slate-50 border-slate-200'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-start gap-2.5">
                              <span className="px-2.5 py-1 bg-emerald-500 text-black font-black text-lg rounded-xl shadow-md shrink-0">
                                {item.qty}x
                              </span>
                              <div>
                                <h4 className="text-base sm:text-lg font-black leading-tight text-emerald-400">
                                  {item.product.name}
                                </h4>
                                
                                {item.modifiers && (
                                  <div className="mt-1 text-xs text-zinc-300 bg-zinc-800/80 px-2 py-1 rounded-lg border border-zinc-700/60 font-medium">
                                    {item.modifiers}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Card Footer Action Buttons */}
                  <div className={`p-4 border-t ${darkMode ? 'bg-zinc-950/80 border-zinc-800' : 'bg-slate-50 border-slate-200'}`}>
                    {isPending && (
                      <button
                        onClick={() => handleUpdateStatus(order.id, 'PREPARING')}
                        disabled={isLoadingThis}
                        className="w-full py-4 bg-amber-500 hover:bg-amber-400 text-black font-black text-lg rounded-2xl shadow-xl hover:shadow-amber-500/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2 border-2 border-amber-300"
                      >
                        {isLoadingThis ? (
                          <RefreshCw className="w-6 h-6 animate-spin text-black" />
                        ) : (
                          <>
                            <Flame className="w-6 h-6 fill-current" />
                            <span>TERIMA & MASAK (PROSES)</span>
                          </>
                        )}
                      </button>
                    )}

                    {isPreparing && (
                      <button
                        onClick={() => handleUpdateStatus(order.id, 'READY')}
                        disabled={isLoadingThis}
                        className="w-full py-4 bg-emerald-500 hover:bg-emerald-400 text-black font-black text-lg rounded-2xl shadow-xl hover:shadow-emerald-500/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2 border-2 border-emerald-300"
                      >
                        {isLoadingThis ? (
                          <RefreshCw className="w-6 h-6 animate-spin text-black" />
                        ) : (
                          <>
                            <CheckCircle2 className="w-6 h-6 fill-current text-black" />
                            <span>PESANAN SIAP SAJI (READY)</span>
                          </>
                        )}
                      </button>
                    )}

                    {isReady && (
                      <div className="flex gap-2">
                        <div className="flex-1 py-3 bg-emerald-950/60 text-emerald-400 border border-emerald-800/80 font-bold text-center text-xs rounded-xl flex items-center justify-center gap-1">
                          <Check className="w-4 h-4" />
                          <span>Siap Diambil / Diantar</span>
                        </div>
                        <button
                          onClick={() => handleUpdateStatus(order.id, 'COMPLETED')}
                          disabled={isLoadingThis}
                          className="px-4 py-3 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-bold rounded-xl border border-zinc-700"
                        >
                          Selesai
                        </button>
                      </div>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
