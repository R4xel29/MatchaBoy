'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, QrCode, Flashlight, ArrowLeft, Camera, CameraOff, FlipHorizontal2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/components/ui/Toast';

interface QROverlayProps {
  isOpen: boolean;
  onClose: () => void;
}

export function QROverlay({ isOpen, onClose }: QROverlayProps) {
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState<'my-qr' | 'scan'>('my-qr');
  const { data: session, status } = useSession();
  const [referralCode, setReferralCode] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [debugInfo, setDebugInfo] = useState<string>('');
  const router = useRouter();

  // Scanner state
  const scannerRef = useRef<HTMLDivElement>(null);
  const html5QrCodeRef = useRef<any>(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [isStartingCamera, setIsStartingCamera] = useState(false);
  const [cameraError, setCameraError] = useState('');
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');

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
    } else {
      // Stop camera if overlay closes
      stopCamera();
      setActiveTab('my-qr');
    }
  }, [isOpen, session, status]);

  const stopCamera = async () => {
    if (html5QrCodeRef.current) {
      try { await html5QrCodeRef.current.stop(); } catch {}
      html5QrCodeRef.current = null;
    }
    setCameraActive(false);
    setIsStartingCamera(false);
  };

  const startCamera = async () => {
    setCameraError('');
    setIsStartingCamera(true);
    try {
      const { Html5Qrcode } = await import('html5-qrcode');
      
      if (html5QrCodeRef.current) {
        try { await html5QrCodeRef.current.stop(); } catch {}
      }

      const scannerId = 'user-qr-scanner';
      if (scannerRef.current) {
        scannerRef.current.innerHTML = '';
        const div = document.createElement('div');
        div.id = scannerId;
        scannerRef.current.appendChild(div);
      }
      
      const html5QrCode = new Html5Qrcode(scannerId);
      html5QrCodeRef.current = html5QrCode;

      await html5QrCode.start(
        { facingMode },
        {
          fps: 10,
          qrbox: { width: 220, height: 220 },
          aspectRatio: 1.0,
        },
        (decodedText: string) => {
          // Auto stop on successful scan
          html5QrCode.stop().catch(() => {});
          html5QrCodeRef.current = null;
          setCameraActive(false);
          setIsStartingCamera(false);
          handleScanSuccess(decodedText);
        },
        () => {} // Ignore errors during scanning
      );
      
      setCameraActive(true);
      setIsStartingCamera(false);
    } catch (err: any) {
      console.error('Camera error:', err);
      setIsStartingCamera(false);
      
      let errorMsg = 'Kamera tidak tersedia saat ini.';
      if (typeof window !== 'undefined' && !window.isSecureContext) {
        errorMsg = 'Akses kamera membutuhkan HTTPS atau localhost. Anda tidak bisa menggunakan IP address di HP tanpa HTTPS.';
      } else if (err?.message?.includes('Permission') || err?.name === 'NotAllowedError') {
        errorMsg = 'Izin kamera ditolak. Silakan izinkan akses kamera di pengaturan browser HP Anda.';
      } else if (err?.name === 'NotFoundError') {
        errorMsg = 'Kamera tidak ditemukan di perangkat ini.';
      }
      setCameraError(errorMsg);
    }
  };

  const flipCamera = async () => {
    await stopCamera();
    setFacingMode(prev => prev === 'environment' ? 'user' : 'environment');
    setTimeout(() => {
      startCamera();
    }, 100);
  };

  useEffect(() => {
    if (activeTab === 'scan' && isOpen) {
      // Don't auto-start, wait for user to click button
      setCameraError('');
      setIsStartingCamera(false);
    } else {
      stopCamera();
    }
    return () => { stopCamera(); };
  }, [activeTab, isOpen]);

  const handleScanSuccess = (decodedText: string) => {
    onClose();
    // Jika itu adalah URL, arahkan ke URL tersebut
    if (decodedText.startsWith('http://') || decodedText.startsWith('https://')) {
      window.location.href = decodedText;
    } else {
      showToast(`Kode QR berhasil dipindai: ${decodedText}`, 'info');
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] bg-gradient-to-b from-[#1A120B] via-[#120C08] to-[#0D0906] flex flex-col pt-safe"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-4 max-w-md mx-auto w-full">
            <button
              onClick={onClose}
              className="w-10 h-10 flex items-center justify-center rounded-2xl bg-white/10 hover:bg-white/15 border border-amber-300/20 text-white transition-colors cursor-pointer"
              aria-label="Tutup QR Arum Seduh"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="text-center">
              <h2 className="text-white font-serif font-black text-base tracking-tight">QR Arum Seduh</h2>
              <p className="text-[10px] font-bold text-amber-300/80 uppercase tracking-widest">Member & Scan Meja</p>
            </div>
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
                  <div className="w-full bg-gradient-to-r from-orange-500/15 via-amber-500/10 to-orange-500/15 rounded-2xl p-4 mb-6 text-center border border-amber-400/25 backdrop-blur-md">
                    <p className="text-amber-100 text-sm font-bold mb-0.5">Tunjukkan QR Code ke Kasir</p>
                    <p className="text-amber-200/70 text-xs">Dapatkan potensi cashback Poin Arum Seduh</p>
                  </div>

                  {/* QR Card */}
                  <div className="bg-[#FFFDF9] rounded-[32px] p-7 shadow-[0_24px_60px_rgba(0,0,0,0.6),0_0_25px_rgba(234,88,12,0.15)] border border-amber-200/80 w-full aspect-square flex flex-col items-center justify-center">
                    {referralCode ? (
                      <>
                        <img
                          src={`https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(referralCode)}&bgcolor=FFFDF9&color=2A1F16`}
                          alt="QR Member Arum Seduh"
                          className="w-full h-auto rounded-2xl"
                        />
                        <p className="mt-5 font-mono font-extrabold text-orange-700 bg-orange-50 border border-orange-200/80 px-4 py-1.5 rounded-full text-xs tracking-[0.2em]">
                          {referralCode}
                        </p>
                      </>
                    ) : (
                      <div className="flex flex-col items-center gap-3">
                        <QrCode className="w-12 h-12 text-amber-300 animate-pulse" />
                        <p className="text-sm text-stone-600 font-medium text-center">
                          {error || "Menyiapkan QR Code..."}
                        </p>
                        {error && (
                          <button 
                            onClick={() => window.location.reload()}
                            className="mt-2 text-xs text-orange-600 font-bold underline cursor-pointer"
                          >
                            Refresh Halaman
                          </button>
                        )}
                        <p className="text-[10px] text-stone-400 mt-4 opacity-50">{debugInfo}</p>
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
                  <p className="text-amber-100/80 text-xs sm:text-sm text-center mb-6 px-6 max-w-sm">
                    Scan kode QR di meja (Dine-In), QR di struk kasir, atau QR promo Arum Seduh
                  </p>

                  {/* Scanner Frame */}
                  <div className="relative w-72 h-72 rounded-3xl overflow-hidden bg-black flex items-center justify-center border-2 border-amber-400/30 shadow-[0_0_30px_rgba(234,88,12,0.15)]">
                    <div ref={scannerRef} className="w-full h-full [&_video]:!object-cover [&_video]:!rounded-3xl" />
                    
                    {cameraActive && (
                      <div className="absolute inset-0 pointer-events-none">
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-56 h-56">
                          <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-amber-400 rounded-tl-2xl" />
                          <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-amber-400 rounded-tr-2xl" />
                          <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-amber-400 rounded-bl-2xl" />
                          <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-amber-400 rounded-br-2xl" />
                          
                          {/* Animated Scanning Line */}
                          <motion.div 
                            className="absolute left-2 right-2 h-0.5 bg-gradient-to-r from-orange-500 via-amber-300 to-orange-500 shadow-[0_0_15px_#f97316]"
                            animate={{ top: ['0%', '100%', '0%'] }}
                            transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                          />
                        </div>
                        {/* Dim overlay outside scan area */}
                        <div className="absolute inset-0 bg-black/40" style={{ 
                          clipPath: 'polygon(0 0, 100% 0, 100% 100%, 0 100%, 0 0, calc(50% - 112px) calc(50% - 112px), calc(50% - 112px) calc(50% + 112px), calc(50% + 112px) calc(50% + 112px), calc(50% + 112px) calc(50% - 112px), calc(50% - 112px) calc(50% - 112px))'
                        }} />
                      </div>
                    )}

                    {!cameraActive && !cameraError && !isStartingCamera && (
                      <div className="absolute inset-0 flex items-center justify-center bg-[#18110B]">
                        <div className="text-center text-white px-5">
                          <Camera className="w-12 h-12 mx-auto mb-4 text-amber-400/60" />
                          <p className="text-xs text-amber-100/80 mb-5">Klik tombol di bawah untuk mengaktifkan kamera pemindai QR</p>
                          <button 
                            onClick={startCamera}
                            className="bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-extrabold text-xs py-3 px-6 rounded-2xl transition-all shadow-lg shadow-orange-500/25 active:scale-95 cursor-pointer"
                          >
                            Buka Kamera
                          </button>
                        </div>
                      </div>
                    )}

                    {isStartingCamera && !cameraActive && !cameraError && (
                      <div className="absolute inset-0 flex items-center justify-center bg-[#18110B]">
                        <div className="text-center text-white px-4">
                          <Camera className="w-8 h-8 mx-auto mb-4 animate-pulse text-orange-400" />
                          <p className="text-sm font-bold">Meminta izin kamera...</p>
                          <p className="text-xs text-amber-200/60 mt-2">Pilih &quot;Allow&quot; / &quot;Izinkan&quot; pada pop-up browser</p>
                        </div>
                      </div>
                    )}

                    {cameraError && (
                      <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#18110B] p-6">
                        <CameraOff className="w-10 h-10 mx-auto mb-4 text-red-400" />
                        <p className="text-sm text-center text-red-300 mb-6">{cameraError}</p>
                        <button 
                          onClick={startCamera}
                          className="bg-white/10 hover:bg-white/20 text-white py-2.5 px-6 rounded-2xl text-xs font-bold transition-colors cursor-pointer"
                        >
                          Coba Lagi
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Camera Controls */}
                  {cameraActive && (
                    <div className="mt-6 flex gap-4">
                      <button 
                        onClick={flipCamera}
                        className="w-12 h-12 rounded-full bg-white/10 border border-amber-300/20 flex items-center justify-center text-white backdrop-blur-md hover:bg-white/20 transition-colors cursor-pointer"
                        aria-label="Balik Kamera"
                      >
                        <FlipHorizontal2 className="w-5 h-5" />
                      </button>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Sculpted Floating Bottom Switcher Dock */}
          <div className="px-4 pb-4 pt-2 pb-safe">
            <div className="max-w-sm mx-auto p-1.5 rounded-[24px] bg-white/8 backdrop-blur-2xl border border-amber-400/20 flex items-center gap-1.5 shadow-2xl">
              <button
                type="button"
                onClick={() => setActiveTab('my-qr')}
                className={cn(
                  "flex-1 py-3 rounded-2xl text-xs font-extrabold transition-all relative flex items-center justify-center gap-2 cursor-pointer",
                  activeTab === 'my-qr' ? "text-white" : "text-amber-100/50 hover:text-amber-100/80"
                )}
              >
                {activeTab === 'my-qr' && (
                  <motion.div
                    layoutId="qr-tab-pill"
                    transition={{ type: 'spring', stiffness: 420, damping: 32 }}
                    className="absolute inset-0 rounded-2xl bg-gradient-to-r from-orange-500 to-amber-500 shadow-md shadow-orange-500/25"
                  />
                )}
                <QrCode className="w-4 h-4 relative z-10" />
                <span className="relative z-10">QR Member Saya</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('scan')}
                className={cn(
                  "flex-1 py-3 rounded-2xl text-xs font-extrabold transition-all relative flex items-center justify-center gap-2 cursor-pointer",
                  activeTab === 'scan' ? "text-white" : "text-amber-100/50 hover:text-amber-100/80"
                )}
              >
                {activeTab === 'scan' && (
                  <motion.div
                    layoutId="qr-tab-pill"
                    transition={{ type: 'spring', stiffness: 420, damping: 32 }}
                    className="absolute inset-0 rounded-2xl bg-gradient-to-r from-orange-500 to-amber-500 shadow-md shadow-orange-500/25"
                  />
                )}
                <Camera className="w-4 h-4 relative z-10" />
                <span className="relative z-10">Scan QR Meja</span>
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

