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
  Maximize2,
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

  // Dimension details based on ratio
  const dimensionInfo = {
    '1:1': {
      width: 600,
      height: 600,
      label: '1:1 Persegi',
      px: '600 × 600 px',
      usage: 'SPMB Smartphone Pelanggan & POS Kasir',
      recommended: true,
    },
    '4:3': {
      width: 800,
      height: 600,
      label: '4:3 Standar',
      px: '800 × 600 px',
      usage: 'Katalog Web & Tablet',
      recommended: false,
    },
    '16:10': {
      width: 800,
      height: 500,
      label: '16:10 Lanskap',
      px: '800 × 500 px',
      usage: 'Banner & Tampilan Luas',
      recommended: false,
    },
  }[ratio];

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

      const targetWidth = dimensionInfo.width;
      const targetHeight = dimensionInfo.height;

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
          0.88
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
                  Potong & Kalibrasi Foto Menu Produk
                </h3>
                <p className="text-xs text-stone-500">
                  Pilih rasio dan sesuaikan posisi foto agar tajam & pas di layar pelanggan.
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
          <div className="p-5 overflow-y-auto space-y-4">
            {/* Ratio Presets with Explicit Pixels */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs font-bold text-stone-700">
                <span>Pilih Rasio & Resolusi Output:</span>
                <span className="text-[11px] text-orange-600 font-extrabold bg-orange-50 px-2 py-0.5 rounded-lg border border-orange-200">
                  📐 Hasil Output: {dimensionInfo.px}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {/* 1:1 Preset */}
                <button
                  type="button"
                  onClick={() => setRatio('1:1')}
                  className={`p-2.5 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                    ratio === '1:1'
                      ? 'bg-orange-500 text-white border-orange-500 shadow-md shadow-orange-500/20 ring-2 ring-orange-500/30'
                      : 'bg-stone-50 text-stone-700 border-stone-200 hover:bg-white hover:border-orange-300'
                  }`}
                >
                  <div className="flex items-center justify-between w-full">
                    <span className="font-bold text-xs flex items-center gap-1.5">
                      <Smartphone className="w-3.5 h-3.5" /> 1:1 Persegi
                    </span>
                    <span
                      className={`text-[9px] px-1.5 py-0.5 rounded font-black ${
                        ratio === '1:1' ? 'bg-white text-orange-700' : 'bg-orange-100 text-orange-800'
                      }`}
                    >
                      Utama SPMB
                    </span>
                  </div>
                  <div className="mt-1.5">
                    <p className={`text-[11px] font-mono font-bold ${ratio === '1:1' ? 'text-orange-100' : 'text-stone-900'}`}>
                      600 × 600 px
                    </p>
                    <p className={`text-[9px] leading-tight ${ratio === '1:1' ? 'text-white/80' : 'text-stone-400'}`}>
                      HP Pelanggan & Kasir
                    </p>
                  </div>
                </button>

                {/* 4:3 Preset */}
                <button
                  type="button"
                  onClick={() => setRatio('4:3')}
                  className={`p-2.5 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                    ratio === '4:3'
                      ? 'bg-orange-500 text-white border-orange-500 shadow-md shadow-orange-500/20 ring-2 ring-orange-500/30'
                      : 'bg-stone-50 text-stone-700 border-stone-200 hover:bg-white hover:border-orange-300'
                  }`}
                >
                  <div className="flex items-center justify-between w-full">
                    <span className="font-bold text-xs flex items-center gap-1.5">
                      <Monitor className="w-3.5 h-3.5" /> 4:3 Standar
                    </span>
                  </div>
                  <div className="mt-1.5">
                    <p className={`text-[11px] font-mono font-bold ${ratio === '4:3' ? 'text-orange-100' : 'text-stone-900'}`}>
                      800 × 600 px
                    </p>
                    <p className={`text-[9px] leading-tight ${ratio === '4:3' ? 'text-white/80' : 'text-stone-400'}`}>
                      Katalog Web & Tablet
                    </p>
                  </div>
                </button>

                {/* 16:10 Preset */}
                <button
                  type="button"
                  onClick={() => setRatio('16:10')}
                  className={`p-2.5 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                    ratio === '16:10'
                      ? 'bg-orange-500 text-white border-orange-500 shadow-md shadow-orange-500/20 ring-2 ring-orange-500/30'
                      : 'bg-stone-50 text-stone-700 border-stone-200 hover:bg-white hover:border-orange-300'
                  }`}
                >
                  <div className="flex items-center justify-between w-full">
                    <span className="font-bold text-xs flex items-center gap-1.5">
                      <Maximize2 className="w-3.5 h-3.5" /> 16:10 Lanskap
                    </span>
                  </div>
                  <div className="mt-1.5">
                    <p className={`text-[11px] font-mono font-bold ${ratio === '16:10' ? 'text-orange-100' : 'text-stone-900'}`}>
                      800 × 500 px
                    </p>
                    <p className={`text-[9px] leading-tight ${ratio === '16:10' ? 'text-white/80' : 'text-stone-400'}`}>
                      Banner Promosi Luas
                    </p>
                  </div>
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
                    ? 'w-[300px] sm:w-[340px] aspect-square'
                    : ratio === '4:3'
                    ? 'w-[320px] sm:w-[380px] aspect-[4/3]'
                    : 'w-[320px] sm:w-[400px] aspect-[16/10]'
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
                  <div className="border-r border-b border-white/40" />
                  <div className="border-r border-b border-white/40" />
                  <div />
                </div>

                {/* Center Safe Zone Circle Overlay (For 1:1) */}
                {ratio === '1:1' && (
                  <div className="absolute inset-4 rounded-full border border-orange-400/30 pointer-events-none" />
                )}
              </div>

              <p className="text-[11px] text-stone-400 mt-2 font-medium flex items-center gap-1.5">
                <Info className="w-3.5 h-3.5 text-orange-400" />
                Geser / Drag gambar untuk memposisikan objek di tengah kotak ({dimensionInfo.px}).
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
                className="text-xs font-bold text-stone-600 hover:text-orange-600 flex items-center gap-1 px-2.5 py-1 rounded-lg border border-stone-200 bg-white hover:bg-stone-50 transition-colors shrink-0 cursor-pointer"
              >
                <RotateCcw className="w-3 h-3" />
                Reset
              </button>
            </div>

            {/* Explanation Note for SPMB consistency */}
            <div className="p-3.5 rounded-2xl bg-orange-50/70 border border-orange-100 text-[11px] text-stone-700 leading-relaxed flex items-start gap-2.5">
              <Sparkles className="w-4 h-4 text-orange-600 shrink-0 mt-0.5" />
              <div>
                <strong className="font-bold text-orange-950">Panduan Resolusi & Rasio 1:1 Persegi:</strong>
                <p className="text-stone-600 mt-0.5">
                  Ukuran standar 1:1 adalah <strong>600 × 600 px</strong> (optimal hingga <strong>1000 × 1000 px</strong>). Karena kartu menu SPMB di smartphone pelanggan dan tombol kasir berbentuk bujur sangkar, rasio 1:1 memastikan produk tidak terpotong dan tampil tajam serta cepat dimuat dalam format WebP (kurang dari 150 KB).
                </p>
              </div>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="p-4 border-t border-stone-100 bg-stone-50 flex items-center justify-between gap-2.5">
            <span className="text-[11px] font-mono text-stone-500 font-bold hidden sm:inline">
              Format: WebP • Resolusi: {dimensionInfo.px}
            </span>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                disabled={isProcessing}
                className="px-5 py-2.5 rounded-xl border border-stone-200 text-stone-600 hover:text-stone-900 font-bold text-xs hover:bg-stone-100 transition-colors cursor-pointer"
              >
                Batal
              </button>

              <button
                type="button"
                onClick={handleConfirm}
                disabled={isProcessing}
                className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-bold text-xs shadow-md shadow-orange-500/20 flex items-center gap-2 transition-all cursor-pointer disabled:opacity-50"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Memproses WebP...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    <span>Gunakan Foto Ini ({dimensionInfo.px})</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
