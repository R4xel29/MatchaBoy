'use client';

import { useEffect, useRef, useState } from 'react';
import { Camera, CameraOff, FlipHorizontal2, X, Keyboard } from 'lucide-react';

interface QRCameraScannerProps {
  onScan: (result: string) => void;
  onClose?: () => void;
  placeholder?: string;
}

export default function QRCameraScanner({ onScan, onClose, placeholder = 'Masukkan kode manual...' }: QRCameraScannerProps) {
  const scannerRef = useRef<HTMLDivElement>(null);
  const html5QrCodeRef = useRef<any>(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState('');
  const [manualMode, setManualMode] = useState(false);
  const [manualInput, setManualInput] = useState('');
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');

  const startCamera = async () => {
    setCameraError('');
    try {
      const { Html5Qrcode } = await import('html5-qrcode');
      
      if (html5QrCodeRef.current) {
        try { await html5QrCodeRef.current.stop(); } catch {}
      }

      const scannerId = 'qr-scanner-' + Date.now();
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
          onScan(decodedText);
        },
        () => {} // Ignore errors during scanning
      );
      
      setCameraActive(true);
    } catch (err: any) {
      console.error('Camera error:', err);
      setCameraError(
        err?.message?.includes('Permission')
          ? 'Izin kamera ditolak. Silakan izinkan akses kamera di browser.'
          : 'Kamera tidak tersedia. Gunakan mode manual.'
      );
      setManualMode(true);
    }
  };

  const stopCamera = async () => {
    if (html5QrCodeRef.current) {
      try { await html5QrCodeRef.current.stop(); } catch {}
      html5QrCodeRef.current = null;
    }
    setCameraActive(false);
  };

  const flipCamera = async () => {
    await stopCamera();
    setFacingMode(prev => prev === 'environment' ? 'user' : 'environment');
  };

  useEffect(() => {
    if (!manualMode && facingMode) {
      startCamera();
    }
    return () => { stopCamera(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [facingMode, manualMode]);

  const handleManualSubmit = () => {
    if (manualInput.trim()) {
      onScan(manualInput.trim());
    }
  };

  return (
    <div className="space-y-3">
      {!manualMode ? (
        <>
          {/* Camera Viewfinder */}
          <div className="relative rounded-2xl overflow-hidden bg-black aspect-square max-w-[300px] mx-auto">
            <div ref={scannerRef} className="w-full h-full [&_video]:!object-cover [&_video]:!rounded-2xl" />
            
            {/* Scan overlay frame */}
            {cameraActive && (
              <div className="absolute inset-0 pointer-events-none">
                {/* Corner brackets */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[220px] h-[220px]">
                  <div className="absolute top-0 left-0 w-8 h-8 border-t-3 border-l-3 border-green-400 rounded-tl-lg" />
                  <div className="absolute top-0 right-0 w-8 h-8 border-t-3 border-r-3 border-green-400 rounded-tr-lg" />
                  <div className="absolute bottom-0 left-0 w-8 h-8 border-b-3 border-l-3 border-green-400 rounded-bl-lg" />
                  <div className="absolute bottom-0 right-0 w-8 h-8 border-b-3 border-r-3 border-green-400 rounded-br-lg" />
                  {/* Scan line animation */}
                  <div className="absolute left-2 right-2 h-0.5 bg-gradient-to-r from-transparent via-green-400 to-transparent animate-[scanline_2s_ease-in-out_infinite]" 
                    style={{ animation: 'scanline 2s ease-in-out infinite' }} />
                </div>
                {/* Dim overlay outside scan area */}
                <div className="absolute inset-0 bg-black/40" style={{ 
                  clipPath: 'polygon(0 0, 100% 0, 100% 100%, 0 100%, 0 0, calc(50% - 110px) calc(50% - 110px), calc(50% - 110px) calc(50% + 110px), calc(50% + 110px) calc(50% + 110px), calc(50% + 110px) calc(50% - 110px), calc(50% - 110px) calc(50% - 110px))'
                }} />
              </div>
            )}
            
            {/* Loading state */}
            {!cameraActive && !cameraError && (
              <div className="absolute inset-0 flex items-center justify-center bg-gray-900">
                <div className="text-center text-white">
                  <Camera className="w-8 h-8 mx-auto mb-2 animate-pulse" />
                  <p className="text-xs">Membuka kamera...</p>
                </div>
              </div>
            )}
          </div>

          {/* Camera controls */}
          <div className="flex items-center justify-center gap-2">
            <button
              type="button"
              onClick={flipCamera}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-xs font-medium transition-colors"
            >
              <FlipHorizontal2 className="w-3.5 h-3.5" /> Flip
            </button>
            <button
              type="button"
              onClick={() => { stopCamera(); setManualMode(true); }}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-xs font-medium transition-colors"
            >
              <Keyboard className="w-3.5 h-3.5" /> Manual
            </button>
          </div>

          {cameraError && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-200">
              <p className="text-xs text-red-600 font-medium flex items-center gap-1.5">
                <CameraOff className="w-3.5 h-3.5" /> {cameraError}
              </p>
            </div>
          )}

          <p className="text-center text-[10px] text-gray-400">
            Arahkan kamera ke QR Code pelanggan
          </p>
        </>
      ) : (
        <>
          {/* Manual input mode */}
          <div className="relative">
            <Keyboard className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={manualInput}
              onChange={(e) => setManualInput(e.target.value)}
              placeholder={placeholder}
              autoFocus
              onKeyDown={(e) => { if (e.key === 'Enter') handleManualSubmit(); }}
              className="w-full pl-10 pr-4 py-3 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-400 transition-all"
            />
          </div>
          
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleManualSubmit}
              disabled={!manualInput.trim()}
              className="flex-1 py-2.5 rounded-xl bg-amber-600 text-white font-semibold text-sm disabled:opacity-50 hover:bg-amber-700 transition-colors"
            >
              Cari
            </button>
            <button
              type="button"
              onClick={() => { setManualMode(false); setManualInput(''); }}
              className="px-4 py-2.5 rounded-xl bg-gray-100 text-sm font-medium text-gray-600 hover:bg-gray-200 transition-colors flex items-center gap-1.5"
            >
              <Camera className="w-3.5 h-3.5" /> Kamera
            </button>
          </div>
        </>
      )}

      {/* Inline CSS for scan line animation */}
      <style jsx global>{`
        @keyframes scanline {
          0%, 100% { top: 8px; }
          50% { top: calc(100% - 8px); }
        }
        #qr-shaded-region { border: none !important; }
      `}</style>
    </div>
  );
}
