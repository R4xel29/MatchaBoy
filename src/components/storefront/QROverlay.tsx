'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, QrCode, Flashlight, ArrowLeft } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useSession } from 'next-auth/react';

interface QROverlayProps {
  isOpen: boolean;
  onClose: () => void;
}

export function QROverlay({ isOpen, onClose }: QROverlayProps) {
  const [activeTab, setActiveTab] = useState<'my-qr' | 'scan'>('my-qr');
  const { data: session, status } = useSession();
  const [referralCode, setReferralCode] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [debugInfo, setDebugInfo] = useState<string>('');

  useEffect(() => {
    if (isOpen) {
      setError(null);
      setDebugInfo('');
      
      // 1. Try to get from session first
      if (session?.user?.referralCode) {
        setReferralCode(session.user.referralCode);
        setDebugInfo('Using session data');
      } 
      // 2. Fallback to API if session doesn't have it
      else if (status === 'authenticated') {
        setDebugInfo('Fetching from API...');
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 8000); // 8s timeout

        fetch(`/api/user/profile?t=${Date.now()}`, { signal: controller.signal })
          .then(async res => {
            clearTimeout(timeoutId);
            if (!res.ok) {
              const text = await res.text();
              throw new Error(`HTTP ${res.status}: ${text.slice(0, 20)}`);
            }
            return res.json();
          })
          .then(data => {
            if (data.referralCode) {
              setReferralCode(data.referralCode);
              setDebugInfo('Data received from API');
            } else {
              setError("Referral code tidak ditemukan di profil Anda.");
              setDebugInfo('API returned user but no referralCode');
            }
          })
          .catch(err => {
            clearTimeout(timeoutId);
            console.error("Failed to fetch profile for QR:", err);
            if (err.name === 'AbortError') {
              setError("Koneksi lambat. Silakan coba lagi.");
            } else {
              setError("Gagal memuat profil. Silakan coba lagi.");
            }
            setDebugInfo(`Error: ${err.message}`);
          });
      } else if (status === 'unauthenticated') {
        setError("Silakan login terlebih dahulu.");
        setDebugInfo('Status: Unauthenticated');
      } else {
        setDebugInfo('Status: Loading session...');
      }
    }
  }, [isOpen, session, status]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] bg-black flex flex-col pt-safe"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-4">
            <button
              onClick={onClose}
              className="w-10 h-10 flex items-center justify-center rounded-full bg-white/10 text-white"
            >
              <X className="w-6 h-6" />
            </button>
            <h2 className="text-white font-bold text-lg">QR Arus</h2>
            <div className="w-10" /> {/* Spacer */}
          </div>

          {/* Content Area */}
          <div className="flex-1 flex flex-col items-center justify-center px-6">
            <AnimatePresence mode="wait">
              {activeTab === 'my-qr' ? (
                <motion.div
                  key="my-qr"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="w-full max-w-sm flex flex-col items-center"
                >
                  {/* Info Box */}
                  <div className="w-full bg-white/10 rounded-2xl p-4 mb-8 text-center border border-white/10 backdrop-blur-md">
                    <p className="text-white text-sm font-medium mb-1">Tunjukkan QR Code ke kasir</p>
                    <p className="text-white/60 text-xs">Dapatkan potensi cashback Arus Points</p>
                  </div>

                  {/* QR Card */}
                  <div className="bg-white rounded-[32px] p-8 shadow-2xl w-full aspect-square flex flex-col items-center justify-center">
                    {referralCode ? (
                      <>
                        <img
                          src={`https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(referralCode)}&bgcolor=ffffff&color=18442D`}
                          alt="Your QR Code"
                          className="w-full h-auto"
                        />
                        <p className="mt-6 font-mono font-bold text-brand-700 tracking-[0.2em]">
                          {referralCode}
                        </p>
                      </>
                    ) : (
                      <div className="flex flex-col items-center gap-3">
                        <QrCode className="w-12 h-12 text-brand-100 animate-pulse" />
                        <p className="text-sm text-brand-300 font-medium text-center">
                          {error || "Menyiapkan QR Code..."}
                        </p>
                        {error && (
                          <button 
                            onClick={() => window.location.reload()}
                            className="mt-2 text-xs text-brand-600 font-bold underline"
                          >
                            Refresh Halaman
                          </button>
                        )}
                        <p className="text-[10px] text-gray-300 mt-4 opacity-50">{debugInfo}</p>
                      </div>
                    )}
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  key="scan"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="w-full flex flex-col items-center"
                >
                  <p className="text-white/80 text-sm text-center mb-12 px-8">
                    Scan kode QR di meja (dine-in), QR di struk (join komunitas), ATAU QR di merchandise (koleksi merchandise)
                  </p>

                  {/* Scanner Frame */}
                  <div className="relative w-64 h-64 border-2 border-white/20 rounded-3xl">
                    {/* Corner Borders */}
                    <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-white rounded-tl-2xl -translate-x-1 -translate-y-1" />
                    <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-white rounded-tr-2xl translate-x-1 -translate-y-1" />
                    <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-white rounded-bl-2xl -translate-x-1 translate-y-1" />
                    <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-white rounded-br-2xl translate-x-1 translate-y-1" />
                    
                    {/* Animated Scanning Line */}
                    <motion.div 
                      className="absolute left-0 right-0 h-0.5 bg-brand-400 shadow-[0_0_15px_#34d399]"
                      animate={{ top: ['0%', '100%', '0%'] }}
                      transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                    />
                  </div>

                  {/* Flashlight Toggle */}
                  <button className="mt-12 w-16 h-16 rounded-full bg-white flex items-center justify-center text-black shadow-lg">
                    <Flashlight className="w-8 h-8" />
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Bottom Tabs */}
          <div className="bg-white/5 border-t border-white/10 pb-safe">
            <div className="flex h-16">
              <button
                onClick={() => setActiveTab('my-qr')}
                className={cn(
                  "flex-1 text-sm font-bold transition-all relative",
                  activeTab === 'my-qr' ? "text-gold" : "text-white/40"
                )}
              >
                My QR
                {activeTab === 'my-qr' && (
                  <motion.div layoutId="tab-indicator" className="absolute top-0 left-0 right-0 h-1 bg-gold" />
                )}
              </button>
              <button
                onClick={() => setActiveTab('scan')}
                className={cn(
                  "flex-1 text-sm font-bold transition-all relative",
                  activeTab === 'scan' ? "text-gold" : "text-white/40"
                )}
              >
                Scan QR
                {activeTab === 'scan' && (
                  <motion.div layoutId="tab-indicator" className="absolute top-0 left-0 right-0 h-1 bg-gold" />
                )}
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
