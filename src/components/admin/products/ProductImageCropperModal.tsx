'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Crop,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Sparkles,
  Smartphone,
  Monitor,
  Check,
  Loader2,
  Info,
} from 'lucide-react';
import { useToast } from '@/components/ui/Toast';

export type AspectRatioPreset = '1:1' | '4:3' | '16:10';

interface ProductImageCropperModalProps {
  imageSrc: string | null;
  isOpen: boolean;
  onClose: () => void;
  onConfirmCrop: (webpBlob: Blob, previewUrl: string) => Promise<void>;
}

export function ProductImageCropperModal({
  imageSrc,
  isOpen,
  onClose,
  onConfirmCrop,
}: ProductImageCropperModalProps) {
  const { showToast } = useToast();
  const [ratio, setRatio] = useState<AspectRatioPreset>('1:1');
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const dragStartRef = useRef({ x: 0, y: 0 });
  const viewportRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);

  // Live preview canvas data
  const [livePreviewUrl, setLivePreviewUrl] = useState<string | null>(null);

  // Initialize crop position & zoom when imageSrc changes
  useEffect(() => {
    if (!imageSrc) return;
    const img = new Image();
    img.onload = () => {
      let targetW = 400;
      let targetH = ratio === '1:1' ? 400 : ratio === '4:3' ? 300 : 250;
      const scaleX = targetW / img.width;
      const scaleY = targetH / img.height;
      const fitZoom = Math.max(scaleX, scaleY);
      setZoom(Math.max(fitZoom, 0.8));
      setOffset({ x: 0, y: 0 });
    };
    img.src = imageSrc;
  }, [imageSrc, ratio]);

  // Mouse Drag Handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    dragStartRef.current = { x: e.clientX - offset.x, y: e.clientY - offset.y };
  };

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isDragging) return;
      setOffset({
        x: e.clientX - dragStartRef.current.x,
        y: e.clientY - dragStartRef.current.y,
      });
    },
    [isDragging]
  );

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  // Touch Drag Handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length !== 1) return;
    setIsDragging(true);
    const t = e.touches[0];
    dragStartRef.current = { x: t.clientX - offset.x, y: t.clientY - offset.y };
  };

  const handleTouchMove = useCallback(
    (e: TouchEvent) => {
      if (!isDragging || e.touches.length !== 1) return;
      const t = e.touches[0];
      setOffset({
        x: t.clientX - dragStartRef.current.x,
        y: t.clientY - dragStartRef.current.y,
      });
    },
    [isDragging]
  );

  const handleTouchEnd = useCallback(() => {
    setIsDragging(false);
  }, []);

  // Global window listeners for drag out of bounds
  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      window.addEventListener('touchmove', handleTouchMove);
      window.addEventListener('touchend', handleTouchEnd);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);
    };
  }, [isDragging, handleMouseMove, handleMouseUp, handleTouchMove, handleTouchEnd]);

  // Handle crop and save to WebP
  const handleConfirm = async () => {
    if (!viewportRef.current || !imgRef.current) return;
    setIsProcessing(true);
    try {
      const rectV = viewportRef.current.getBoundingClientRect();
      const rectI = imgRef.current.getBoundingClientRect();

      let targetWidth = 600;
      let targetHeight = 600;

      if (ratio === '1:1') {
        targetWidth = 600;
        targetHeight = 600;
      } else if (ratio === '4:3') {
        targetWidth = 800;
        targetHeight = 600;
      } else if (ratio === '16:10') {
        targetWidth = 800;
        targetHeight = 500;
      }

      const canvas = document.createElement('canvas');
      canvas.width = targetWidth;
      canvas.height = targetHeight;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Canvas not supported');

      // White background fill
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const canvasScale = targetWidth / rectV.width;
      const x = (rectI.left - rectV.left) * canvasScale;
      const y = (rectI.top - rectV.top) * canvasScale;
      const w = rectI.width * canvasScale;
      const h = rectI.height * canvasScale;

      ctx.drawImage(imgRef.current, x, y, w, h);

      const webpBlob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob(
          (blob) => (blob ? resolve(blob) : reject(new Error('Cropping failed'))),
          'image/webp',
          0.85
        );
      });

      const previewUrl = URL.createObjectURL(webpBlob);
      await onConfirmCrop(webpBlob, previewUrl);
      onClose();
    } catch (err: any) {
      showToast(err.message || 'Gagal memproses gambar', 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  if (!isOpen || !imageSrc) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/75 backdrop-blur-sm"
          onClick={onClose}
        />

        {/* Modal Window */}
        <motion.div
          initial={{ scale: 0.95, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 20 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-stone-200 overflow-hidden z-10 flex flex-col max-h-[92vh]"
        >
          {/* Header */}
          <div className="p-5 border-b border-stone-100 flex items-center justify-between bg-stone-50/80">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-orange-100 text-orange-600 flex items-center justify-center shadow-inner">
                <Crop className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-heading font-bold text-base text-stone-900">
                  Potong & Kalibrasi Foto Produk
                </h3>
                <p className="text-xs text-stone-500">
                  Pastikan objek makanan/minuman tepat di tengah untuk tampilan SPMB & POS terbaik.
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Body */}
          <div className="p-5 overflow-y-auto space-y-5">
            {/* Ratio Presets */}
            <div className="flex flex-wrap items-center justify-between gap-2 p-1.5 bg-stone-100 rounded-2xl">
              <div className="flex items-center gap-1.5 flex-1">
                <button
                  type="button"
                  onClick={() => setRatio('1:1')}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-bold transition-all ${
                    ratio === '1:1'
                      ? 'bg-white text-orange-600 shadow-sm'
                      : 'text-stone-600 hover:text-stone-900'
                  }`}
                >
                  <Smartphone className="w-3.5 h-3.5" />
                  1:1 Persegi (SPMB & Kasir)
                  <span className="text-[9px] px-1.5 py-0.5 rounded-md bg-orange-50 text-orange-600 font-extrabold ml-1">
                    Rekomendasi
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setRatio('4:3')}
                  className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-bold transition-all ${
                    ratio === '4:3'
                      ? 'bg-white text-orange-600 shadow-sm'
                      : 'text-stone-600 hover:text-stone-900'
                  }`}
                >
                  <Monitor className="w-3.5 h-3.5" />
                  4:3 (Katalog Web)
                </button>

                <button
                  type="button"
                  onClick={() => setRatio('16:10')}
                  className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-bold transition-all ${
                    ratio === '16:10'
                      ? 'bg-white text-orange-600 shadow-sm'
                      : 'text-stone-600 hover:text-stone-900'
                  }`}
                >
                  16:10 (Lanskap)
                </button>
              </div>
            </div>

            {/* Cropper Viewport */}
            <div className="flex flex-col items-center justify-center bg-stone-950 p-4 rounded-3xl relative">
              <div
                ref={viewportRef}
                onMouseDown={handleMouseDown}
                onTouchStart={handleTouchStart}
                className={`relative overflow-hidden bg-stone-900 border-2 border-dashed border-orange-400/80 rounded-2xl cursor-move touch-none select-none shadow-2xl transition-all ${
                  ratio === '1:1'
                    ? 'w-[320px] sm:w-[360px] aspect-square'
                    : ratio === '4:3'
                    ? 'w-[360px] sm:w-[420px] aspect-[4/3]'
                    : 'w-[360px] sm:w-[440px] aspect-[16/10]'
                }`}
              >
                {/* Image to be dragged */}
                <img
                  ref={imgRef}
                  src={imageSrc}
                  alt="Crop Source"
                  style={{
                    transform: `translate(${offset.x}px, ${offset.y}px) scale(${zoom})`,
                    transformOrigin: 'top left',
                  }}
                  className="max-w-none absolute pointer-events-none transition-transform duration-75 ease-out"
                />

                {/* Composition Grid (Rule of Thirds Overlay) */}
                <div className="absolute inset-0 grid grid-cols-3 grid-rows-3 pointer-events-none opacity-40">
                  <div className="border-r border-b border-white/40" />
                  <div className="border-r border-b border-white/40" />
                  <div className="border-b border-white/40" />
                  <div className="border-r border-b border-white/40" />
                  <div className="border-r border-b border-white/40" />
                  <div className="border-b border-white/40" />
                  <div className="border-r border-white/40" />
                  <div className="border-r border-white/40" />
                  <div />
                </div>

                {/* Center Safe Zone Circle Overlay (For 1:1) */}
                {ratio === '1:1' && (
                  <div className="absolute inset-4 rounded-full border border-orange-400/30 pointer-events-none" />
                )}
              </div>

              <p className="text-[11px] text-stone-400 mt-2 font-medium flex items-center gap-1.5">
                <Info className="w-3.5 h-3.5 text-orange-400" />
                Geser / Drag gambar untuk memposisikan objek di tengah kotak panduan.
              </p>
            </div>

            {/* Zoom Slider Control */}
            <div className="flex items-center gap-4 px-3 py-2 bg-stone-50 rounded-2xl border border-stone-100">
              <ZoomOut className="w-4 h-4 text-stone-400 shrink-0" />
              <input
                type="range"
                min="0.4"
                max="3"
                step="0.05"
                value={zoom}
                onChange={(e) => setZoom(parseFloat(e.target.value))}
                className="flex-1 accent-orange-500 cursor-pointer h-2 bg-stone-200 rounded-lg appearance-none"
              />
              <ZoomIn className="w-4 h-4 text-stone-400 shrink-0" />
              <button
                type="button"
                onClick={() => {
                  setZoom(1);
                  setOffset({ x: 0, y: 0 });
                }}
                className="text-xs font-bold text-stone-600 hover:text-orange-600 flex items-center gap-1 px-2.5 py-1 rounded-lg border border-stone-200 bg-white hover:bg-stone-50 transition-colors shrink-0"
              >
                <RotateCcw className="w-3 h-3" />
                Reset
              </button>
            </div>

            {/* Explanation Note for SPMB consistency */}
            <div className="p-3.5 rounded-2xl bg-orange-50/70 border border-orange-100 text-[11px] text-stone-700 leading-relaxed flex items-start gap-2.5">
              <Sparkles className="w-4 h-4 text-orange-600 shrink-0 mt-0.5" />
              <div>
                <strong className="font-bold text-orange-950">Kenapa Rasio 1:1 (Persegi) Direkomendasikan?</strong>
                <p className="text-stone-600 mt-0.5">
                  Tampilan menu di meja pelanggan (<strong>/spmb</strong>) dan layar kasir POS menggunakan grid persegi 1:1. Menggunakan rasio 1:1 menjamin foto tidak akan terpotong pada sisi pinggir di perangkat apapun.
                </p>
              </div>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="p-4 border-t border-stone-100 bg-stone-50 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              disabled={isProcessing}
              className="px-5 py-2.5 rounded-xl border border-stone-200 text-stone-600 hover:text-stone-900 font-bold text-xs hover:bg-stone-100 transition-colors"
            >
              Batal
            </button>

            <button
              type="button"
              onClick={handleConfirm}
              disabled={isProcessing}
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-bold text-xs shadow-lg shadow-orange-500/20 transition-all flex items-center gap-2"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Mengompres WebP...
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  Gunakan Foto Ini
                </>
              )}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
