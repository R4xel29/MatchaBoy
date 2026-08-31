'use client';

import { useState, useEffect, useRef } from 'react';
import { Play, Volume2, Clock, Coffee, Sparkles } from 'lucide-react';
import { LiveQueueSkeleton } from '@/components/ui/ShimmerSkeleton';

interface QueueOrder {
  id: string;
  queueNumber: string;
  customerName: string;
  status: string;
  updatedAt: string;
}

export default function QueueMonitorPage() {
  const [orders, setOrders] = useState<QueueOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAudioEnabled, setIsAudioEnabled] = useState(false);
  const [currentTime, setCurrentTime] = useState('');
  
  // Keep track of order IDs that have already been announced
  const announcedIds = useRef<Set<string>>(new Set());
  const isFirstLoad = useRef(true);

  // Synthesize ding-dong sound natively using Web Audio API
  const playChime = () => {
    try {
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContext) return;
      const ctx = new AudioContext();
      
      // Ding (High tone)
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
      gain1.gain.setValueAtTime(0.08, ctx.currentTime);
      gain1.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.45);
      osc1.start(ctx.currentTime);
      osc1.stop(ctx.currentTime + 0.45);
      
      // Dong (Low tone)
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(440.00, ctx.currentTime + 0.38); // A4
      gain2.gain.setValueAtTime(0.08, ctx.currentTime + 0.38);
      gain2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.95);
      osc2.start(ctx.currentTime + 0.38);
      osc2.stop(ctx.currentTime + 0.95);
    } catch (err) {
      console.error('Failed to play synthesized chime:', err);
    }
  };

  // Text-To-Speech Queue Announcement
  const speakAnnouncement = (queueNumber: string, customerName: string) => {
    if (!('speechSynthesis' in window)) return;
    
    // Mask symbols
    const cleanName = customerName.replace(/[^\w\s]/g, '');
    const cleanQueue = queueNumber.replace('-', ' ');
    const text = `Nomor antrean ${cleanQueue}, atas nama ${cleanName}. Silakan ambil pesanan Anda.`;

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'id-ID';
    utterance.rate = 0.85; // Slightly slower for clear speaker output
    utterance.pitch = 1.05;

    // Find Indonesian voice if possible
    const voices = window.speechSynthesis.getVoices();
    const idVoice = voices.find(v => v.lang.includes('id') || v.lang.includes('ID'));
    if (idVoice) {
      utterance.voice = idVoice;
    }

    window.speechSynthesis.speak(utterance);
  };

  // Enable audio context
  const handleEnableAudio = () => {
    setIsAudioEnabled(true);
    playChime();
    // Warm up TTS
    if ('speechSynthesis' in window) {
      const warmUp = new SpeechSynthesisUtterance('');
      window.speechSynthesis.speak(warmUp);
    }
  };

  // Fetch orders from API
  const fetchQueue = async () => {
    try {
      const res = await fetch(`/api/queue?t=${Date.now()}`);
      if (!res.ok) return;
      const data = await res.json();
      
      if (data.orders) {
        const newOrders: QueueOrder[] = data.orders;
        
        // Handle announcements for READY orders
        const readyOrders = newOrders.filter(o => o.status === 'READY');

        if (isFirstLoad.current) {
          // Initialize announced list with already READY orders on first load
          // so we don't spam announcements when the page opens/refreshes
          readyOrders.forEach(o => announcedIds.current.add(o.id));
          isFirstLoad.current = false;
        } else if (isAudioEnabled) {
          // Find any READY order that hasn't been announced yet
          for (const order of readyOrders) {
            if (!announcedIds.current.has(order.id)) {
              announcedIds.current.add(order.id);
              // Trigger Chime & TTS Call sequentially
              playChime();
              setTimeout(() => {
                speakAnnouncement(order.queueNumber, order.customerName);
              }, 950);
              break; // Call one at a time to prevent audio overlap
            }
          }
        }
        
        setOrders(newOrders);
      }
    } catch (err) {
      console.error('Failed to fetch queue:', err);
    } finally {
      setLoading(false);
    }
  };

  // Clock Effect
  useEffect(() => {
    const updateClock = () => {
      const now = new Date();
      setCurrentTime(now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    };
    updateClock();
    const clockInterval = setInterval(updateClock, 1000);
    return () => clearInterval(clockInterval);
  }, []);

  // Poll Queue List
  useEffect(() => {
    fetchQueue();
    const pollInterval = setInterval(fetchQueue, 5000);
    return () => clearInterval(pollInterval);
  }, [isAudioEnabled]);

  const preparingOrders = orders.filter(o => o.status === 'PREPARING');
  const readyOrders = orders.filter(o => o.status === 'READY');

  return (
    <div className="min-h-screen bg-[#1C140E] text-[#FFFBF5] font-sans flex flex-col overflow-hidden relative selection:bg-orange-500 selection:text-white">
      {/* Decorative Warm Amber Glows */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] aspect-square rounded-full bg-amber-950/25 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-15%] right-[-5%] w-[45%] aspect-square rounded-full bg-orange-950/25 blur-[130px] pointer-events-none" />

      {/* Header */}
      <header className="px-8 py-5 border-b border-orange-950/40 flex items-center justify-between backdrop-blur-md bg-[#1C140E]/80 relative z-10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-orange-500 to-amber-500 flex items-center justify-center shadow-lg shadow-orange-500/10">
            <Coffee className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-black font-heading tracking-wide uppercase bg-gradient-to-r from-orange-400 to-amber-200 bg-clip-text text-transparent">
              Arum Seduh Queue Monitor
            </h1>
            <p className="text-[10px] text-amber-400/80 font-bold uppercase tracking-widest mt-0.5 flex items-center gap-1.5">
              <Sparkles className="w-3 h-3 text-amber-400" /> Live Queue Status Screen
            </p>
          </div>
        </div>

        {/* Live Clock & Audio Indicator */}
        <div className="flex items-center gap-5">
          {isAudioEnabled ? (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-950/60 border border-orange-500/30 text-amber-400 text-xs font-semibold">
              <Volume2 className="w-4 h-4 animate-pulse" />
              <span>Suara Aktif</span>
            </div>
          ) : (
            <button
              onClick={handleEnableAudio}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white text-xs font-bold transition-all shadow-lg shadow-orange-500/15 active:scale-95 cursor-pointer"
            >
              <Volume2 className="w-4 h-4" />
              Aktifkan Suara Panggilan
            </button>
          )}
          
          <div className="flex items-center gap-2 bg-[#2A1E16]/80 border border-orange-900/40 px-4 py-2 rounded-2xl shadow-inner font-mono text-amber-300 font-bold text-lg">
            <Clock className="w-4 h-4 text-orange-400" />
            {currentTime || '00:00:00'}
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      {loading ? (
        <main className="flex-1 p-0 relative z-10 overflow-hidden flex items-center justify-center">
          <LiveQueueSkeleton />
        </main>
      ) : (
        <main className="flex-1 grid grid-cols-1 md:grid-cols-2 p-8 gap-8 relative z-10 overflow-hidden">
          {/* Left Column: Preparing */}
          <div className="flex flex-col bg-[#2A1E16]/60 rounded-3xl border border-orange-950/40 p-6 backdrop-blur-sm overflow-hidden flex-1 min-h-[450px]">
            <div className="flex items-center justify-between pb-4 border-b border-orange-950/50 mb-6 shrink-0">
              <div className="flex items-center gap-3">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-ping" />
                <h2 className="text-lg font-black tracking-wide uppercase text-amber-400">
                  Sedang Disiapkan
                </h2>
              </div>
              <span className="px-3 py-1 bg-amber-950/50 border border-amber-900/40 text-amber-300 font-bold text-xs rounded-full">
                {preparingOrders.length} Pesanan
              </span>
            </div>

            <div className="flex-1 overflow-y-auto pr-2 space-y-3 max-h-[calc(100vh-250px)]">
              {preparingOrders.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-amber-800/40 py-20">
                  <Coffee className="w-16 h-16 mb-3 stroke-[1.2]" />
                  <p className="text-sm font-semibold">Belum ada pesanan yang disiapkan</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  {preparingOrders.map((order) => (
                    <div
                      key={order.id}
                      className="p-4 bg-amber-950/30 border border-amber-900/30 rounded-2xl flex flex-col gap-1.5 transition-all hover:bg-amber-950/40 shadow-sm"
                    >
                      <span className="font-mono text-2xl font-black text-amber-400 tracking-tight">
                        {order.queueNumber}
                      </span>
                      <span className="text-xs text-amber-200/90 font-bold truncate">
                        {order.customerName}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Ready for Pick Up */}
          <div className="flex flex-col bg-[#2A1E16]/80 rounded-3xl border border-orange-900/40 p-6 backdrop-blur-sm overflow-hidden flex-1 min-h-[450px]">
            <div className="flex items-center justify-between pb-4 border-b border-orange-900/40 mb-6 shrink-0">
              <div className="flex items-center gap-3">
                <span className="w-2.5 h-2.5 rounded-full bg-orange-400 animate-ping" />
                <h2 className="text-lg font-black tracking-wide uppercase text-orange-400">
                  Siap Diambil
                </h2>
              </div>
              <span className="px-3 py-1 bg-orange-950/60 border border-orange-500/40 text-orange-300 font-bold text-xs rounded-full">
                {readyOrders.length} Pesanan
              </span>
            </div>

            <div className="flex-1 overflow-y-auto pr-2 space-y-4 max-h-[calc(100vh-250px)]">
              {readyOrders.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-amber-800/40 py-20">
                  <Coffee className="w-16 h-16 mb-3 stroke-[1.2]" />
                  <p className="text-sm font-semibold">Belum ada pesanan yang siap diambil</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {readyOrders.map((order) => (
                    <div
                      key={order.id}
                      className="p-5 bg-gradient-to-br from-[#3D2818] to-[#25170F] border-2 border-orange-400/80 rounded-3xl flex flex-col justify-center items-center text-center gap-1.5 shadow-[0_4px_20px_rgba(234,88,12,0.15)] animate-pulse transition-all duration-300 hover:scale-[1.02]"
                    >
                      <span className="font-mono text-4xl font-extrabold text-amber-300 tracking-wide uppercase">
                        {order.queueNumber}
                      </span>
                      <span className="text-sm text-[#FFFBF5] font-bold uppercase tracking-wider mt-1 truncate max-w-full">
                        {order.customerName}
                      </span>
                      <span className="px-3 py-0.5 bg-gradient-to-r from-orange-500 to-amber-500 text-white font-black text-[9px] uppercase rounded-full mt-1.5 shadow-sm">
                        SIAP AMBIL
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </main>
      )}

      {/* Footer Instructions / Brand */}
      <footer className="px-8 py-4 border-t border-orange-950/30 text-center text-[10px] text-amber-500/80 font-bold uppercase tracking-widest bg-[#150E0A] relative z-10 shrink-0">
        Silakan periksa nomor antrean Anda. Jika nama Anda tertera pada kolom &ldquo;Siap Diambil&rdquo;, silakan temui barista kami di Arum Seduh.
      </footer>

      {/* Autoplay Blocker Overlay */}
      {!isAudioEnabled && (
        <div className="fixed inset-0 z-50 bg-[#1C140E]/95 flex flex-col items-center justify-center p-6 text-center animate-in fade-in duration-300">
          <div className="max-w-md w-full p-8 bg-[#2A1E16] border border-orange-500/30 rounded-3xl shadow-2xl flex flex-col items-center">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-orange-500 to-amber-500 flex items-center justify-center mb-6 shadow-xl shadow-orange-500/15">
              <Coffee className="w-8 h-8 text-white" />
            </div>
            <h3 className="text-xl font-black font-heading tracking-wide mb-3 bg-gradient-to-r from-orange-400 to-amber-200 bg-clip-text text-transparent uppercase">
              Mulai Monitor Antrean
            </h3>
            <p className="text-xs text-amber-200/80 leading-relaxed mb-6">
              Agar monitor dapat membunyikan bel panggilan antrean dan berbicara, browser memerlukan interaksi pertama Anda untuk mengaktifkan pemutar suara otomatis.
            </p>
            <button
              onClick={handleEnableAudio}
              className="w-full flex items-center justify-center gap-2 py-3.5 px-6 rounded-2xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-extrabold text-sm transition-all shadow-lg shadow-orange-500/20 active:scale-[0.98] cursor-pointer"
            >
              <Play className="w-4 h-4 fill-current" />
              Mulai Monitor Sekarang
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
