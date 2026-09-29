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
  ArrowRight,
  LayoutGrid,
  SlidersHorizontal,
} from 'lucide-react';
import { useToast } from '@/components/ui/Toast';

export type AspectRatioPreset = '1:1' | '4:3' | '16:10';
export type CropTargetSlot = 'display' | 'detail' | 'banner';

/**
 * Helper to automatically center-crop a source image URL/DataURL into a WebP Blob
 * for a given target width and height.
 */
export async function autoCropImageToWebp(
  imageSrc: string,
  targetWidth: number,
  targetHeight: number
): Promise<{ blob: Blob; previewUrl: string }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = targetWidth;
        canvas.height = targetHeight;
        const ctx = canvas.getContext('2d');
        if (!ctx) throw new Error('Canvas context tidak tersedia');

        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, targetWidth, targetHeight);

        const targetRatio = targetWidth / targetHeight;
        const srcRatio = img.width / img.height;

        let sWidth = img.width;
        let sHeight = img.height;
        let sx = 0;
        let sy = 0;

        if (srcRatio > targetRatio) {
          sWidth = img.height * targetRatio;
          sx = (img.width - sWidth) / 2;
        } else {
          sHeight = img.width / targetRatio;
          sy = (img.height - sHeight) / 2;
        }

        ctx.drawImage(img, sx, sy, sWidth, sHeight, 0, 0, targetWidth, targetHeight);

        canvas.toBlob(
          (blob) => {
            if (!blob) return reject(new Error('Gagal membuat WebP otomatis'));
            const previewUrl = URL.createObjectURL(blob);
            resolve({ blob, previewUrl });
          },
          'image/webp',
          0.88
        );
      } catch (err) {
        reject(err);
      }
    };
    img.onerror = () => reject(new Error('Gagal memuat gambar sumber'));
    img.src = imageSrc;
  });
}

interface ProductImageCropperModalProps {
  imageSrc: string | null;
  isOpen: boolean;
  onClose: () => void;
  targetSlot?: CropTargetSlot;
  onChangeSlot?: (slot: CropTargetSlot) => void;
  hasDisplayCropped?: boolean;
  hasDetailCropped?: boolean;
  hasBannerCropped?: boolean;
  includeBannerSlot?: boolean;
  onConfirmCrop: (
    webpBlob: Blob,
    previewUrl: string,
    slot?: CropTargetSlot,
    continueToNext?: boolean
  ) => Promise<void>;
}

const SLOT_META: Record<
  CropTargetSlot,
  {
    stepNum: string;
    title: string;
    subtitle: string;
    defaultRatio: AspectRatioPreset;
    badge: string;
  }
> = {
  display: {
    stepNum: '1',
    title: 'Foto Display Katalog',
    subtitle: 'Tampil di kartu daftar menu SPMB, Web Store & POS Kasir',
    defaultRatio: '1:1',
    badge: 'Wajib 1/2',
  },
  detail: {
    stepNum: '2',
    title: 'Foto Detail Kustomisasi',
    subtitle: 'Tampil saat pelanggan membuka menu untuk memilih ukuran & kemanisan',
    defaultRatio: '4:3',
    badge: 'Wajib 2/2',
  },
  banner: {
    stepNum: '3',
    title: 'Foto Banner Produk',
    subtitle: 'Tampil melebar pada highlight banner promosi & Flash Sale',
    defaultRatio: '16:10',
    badge: 'Opsional 3/3',
  },
};

export function ProductImageCropperModal({
  imageSrc,
  isOpen,
  onClose,
  targetSlot = 'display',
  onChangeSlot,
  hasDisplayCropped = false,
  hasDetailCropped = false,
  hasBannerCropped = false,
  includeBannerSlot = false,
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

  // Sync ratio with active targetSlot
  useEffect(() => {
    if (targetSlot === 'display') setRatio('1:1');
    else if (targetSlot === 'detail') setRatio('4:3');
    else if (targetSlot === 'banner') setRatio('16:10');
  }, [targetSlot, isOpen]);

  // Dimension details based on ratio
  const dimensionInfo = {
    '1:1': {
      width: 600,
      height: 600,
      label: '1:1 Persegi',
      px: '600 × 600 px',
      usage: 'Kartu Display Menu & POS Kasir',
    },
    '4:3': {
      width: 800,
      height: 600,
      label: '4:3 Detail Menu',
      px: '800 × 600 px',
      usage: 'Pop-up Pilih Ukuran & Kemanisan',
    },
    '16:10': {
      width: 960,
      height: 600,
      label: '16:10 Lanskap',
      px: '960 × 600 px',
      usage: 'Banner Highlight & Promosi',
    },
  }[ratio];

  // Initialize crop position & zoom when imageSrc or ratio changes
  useEffect(() => {
    if (!imageSrc) return;
    const img = new Image();
    img.onload = () => {
      const targetW = ratio === '1:1' ? 320 : ratio === '4:3' ? 360 : 380;
      const targetH = ratio === '1:1' ? 320 : ratio === '4:3' ? 270 : 238;
      const scaleX = targetW / img.width;
      const scaleY = targetH / img.height;
      const fitZoom = Math.max(scaleX, scaleY);
      setZoom(Math.max(Number(fitZoom.toFixed(2)), 0.4));
      setOffset({ x: 0, y: 0 });
    };
    img.src = imageSrc;
  }, [imageSrc, ratio, targetSlot]);

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
  const handleConfirm = async (continueToNext = false) => {
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
      if (!ctx) throw new Error('Canvas tidak didukung pada browser ini');

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
          (blob) => (blob ? resolve(blob) : reject(new Error('Gagal memotong gambar'))),
          'image/webp',
          0.88
        );
      });

      const previewUrl = URL.createObjectURL(webpBlob);
      await onConfirmCrop(webpBlob, previewUrl, targetSlot, continueToNext);

      if (!continueToNext) {
        onClose();
      }
    } catch (err: any) {
      showToast(err.message || 'Gagal memproses gambar', 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  if (!isOpen || !imageSrc) return null;

  const activeMeta = SLOT_META[targetSlot];

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
          className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-stone-200 overflow-hidden z-10 flex flex-col max-h-[92vh] text-left"
        >
          {/* Header */}
          <div className="px-5 py-4 border-b border-stone-100 flex items-center justify-between bg-gradient-to-r from-orange-50/80 via-amber-50/40 to-white">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-orange-500 to-amber-500 text-white flex items-center justify-center shadow-sm">
                <Crop className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-heading font-extrabold text-sm sm:text-base text-stone-900">
                    Potong Gambar: {activeMeta.title}
                  </h3>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-orange-100 text-orange-700 border border-orange-200">
                    {activeMeta.badge}
                  </span>
                </div>
                <p className="text-xs text-stone-500 mt-0.5">{activeMeta.subtitle}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Slot Switcher Bar (1 Sumber Foto -> Potong Masing-Masing Bagian) */}
          {onChangeSlot && (
            <div className="px-5 py-2.5 bg-stone-50 border-b border-stone-200/80 flex items-center gap-2 overflow-x-auto">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-stone-400 shrink-0 mr-1">
                Bagian Foto:
              </span>
              {(
                [
                  {
                    id: 'display' as CropTargetSlot,
                    label: '1. Display (1:1)',
                    done: hasDisplayCropped,
                    icon: LayoutGrid,
                  },
                  {
                    id: 'detail' as CropTargetSlot,
                    label: '2. Detail Produk (4:3)',
                    done: hasDetailCropped,
                    icon: SlidersHorizontal,
                  },
                  ...(includeBannerSlot
                    ? [
                        {
                          id: 'banner' as CropTargetSlot,
                          label: '3. Banner (16:10)',
                          done: hasBannerCropped,
                          icon: Maximize2,
                        },
                      ]
                    : []),
                ]
              ).map((item) => {
                const Icon = item.icon;
                const isCurrent = targetSlot === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => onChangeSlot(item.id)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shrink-0 border ${
                      isCurrent
                        ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white border-orange-500 shadow-sm'
                        : item.done
                        ? 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100'
                        : 'bg-white text-stone-600 border-stone-200 hover:border-orange-300'
                    }`}
                  >
                    {item.done && !isCurrent ? (
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                    ) : (
                      <Icon className="w-3.5 h-3.5" />
                    )}
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </div>
          )}

          {/* Body */}
          <div className="p-5 overflow-y-auto space-y-4">
            {/* Ratio Info Bar */}
            <div className="flex items-center justify-between gap-2 flex-wrap bg-amber-50/60 border border-amber-200/70 px-3.5 py-2.5 rounded-2xl">
              <div className="flex items-center gap-2 text-xs font-bold text-stone-700">
                {ratio === '1:1' ? (
                  <Smartphone className="w-4 h-4 text-orange-600" />
                ) : ratio === '4:3' ? (
                  <Monitor className="w-4 h-4 text-orange-600" />
                ) : (
                  <Maximize2 className="w-4 h-4 text-orange-600" />
                )}
                <span>
                  Rasio <strong>{dimensionInfo.label}</strong> • {dimensionInfo.usage}
                </span>
              </div>
              <span className="text-[11px] text-orange-700 font-extrabold bg-white px-2.5 py-1 rounded-lg border border-orange-200 flex items-center gap-1.5">
                <Crop className="w-3 h-3 text-orange-500" />
                <span>Output: {dimensionInfo.px}</span>
              </span>
            </div>

            {/* Cropper Viewport */}
            <div className="flex flex-col items-center justify-center bg-stone-950 p-4 rounded-3xl relative">
              <div
                ref={viewportRef}
                onMouseDown={handleMouseDown}
                onTouchStart={handleTouchStart}
                className={`relative overflow-hidden bg-stone-900 border-2 border-dashed border-orange-400/90 rounded-2xl cursor-move touch-none select-none shadow-2xl transition-all ${
                  ratio === '1:1'
                    ? 'w-[280px] sm:w-[320px] aspect-square'
                    : ratio === '4:3'
                    ? 'w-[300px] sm:w-[360px] aspect-[4/3]'
                    : 'w-[310px] sm:w-[380px] aspect-[16/10]'
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

              <p className="text-[11px] text-stone-300 mt-2.5 font-medium flex items-center gap-1.5">
                <Info className="w-3.5 h-3.5 text-orange-400 shrink-0" />
                <span>
                  Geser gambar dan atur zoom untuk menentukan fokus potongan{' '}
                  <strong className="text-orange-300">{activeMeta.title}</strong>.
                </span>
              </p>
            </div>

            {/* Zoom Slider Control */}
            <div className="flex items-center gap-3 px-3.5 py-2.5 bg-stone-50 rounded-2xl border border-stone-200/80">
              <ZoomOut className="w-4 h-4 text-stone-400 shrink-0" />
              <input
                type="range"
                min="0.3"
                max="3"
                step="0.02"
                value={zoom}
                onChange={(e) => setZoom(parseFloat(e.target.value))}
                className="flex-1 accent-orange-500 cursor-pointer h-2 bg-stone-200 rounded-lg appearance-none"
              />
              <ZoomIn className="w-4 h-4 text-stone-400 shrink-0" />
              <button
                type="button"
                onClick={() => {
                  if (!imgRef.current) return;
                  const targetW = ratio === '1:1' ? 320 : ratio === '4:3' ? 360 : 380;
                  const targetH = ratio === '1:1' ? 320 : ratio === '4:3' ? 270 : 238;
                  const fitZoom = Math.max(
                    targetW / (imgRef.current.naturalWidth || 600),
                    targetH / (imgRef.current.naturalHeight || 600)
                  );
                  setZoom(Math.max(Number(fitZoom.toFixed(2)), 0.4));
                  setOffset({ x: 0, y: 0 });
                }}
                className="text-xs font-bold text-stone-600 hover:text-orange-600 flex items-center gap-1 px-2.5 py-1 rounded-lg border border-stone-200 bg-white hover:bg-stone-50 transition-colors shrink-0 cursor-pointer"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Reset</span>
              </button>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="p-4 border-t border-stone-100 bg-stone-50 flex flex-wrap items-center justify-between gap-2.5">
            <button
              type="button"
              onClick={onClose}
              disabled={isProcessing}
              className="px-4 py-2.5 rounded-xl border border-stone-200 text-stone-600 hover:text-stone-900 font-bold text-xs hover:bg-stone-100 transition-colors cursor-pointer"
            >
              Tutup
            </button>

            <div className="flex items-center gap-2 flex-wrap">
              {targetSlot === 'display' && onChangeSlot ? (
                <>
                  <button
                    type="button"
                    onClick={() => handleConfirm(false)}
                    disabled={isProcessing}
                    className="px-4 py-2.5 rounded-xl border border-orange-200 bg-orange-50 hover:bg-orange-100 text-orange-700 font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>Simpan Display Saja</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleConfirm(true)}
                    disabled={isProcessing}
                    className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-bold text-xs shadow-md shadow-orange-500/20 flex items-center gap-2 transition-all cursor-pointer disabled:opacity-50"
                  >
                    {isProcessing ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Memproses...</span>
                      </>
                    ) : (
                      <>
                        <span>Simpan & Lanjut Crop Detail</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={() => handleConfirm(false)}
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
                      <span>Simpan Potongan {activeMeta.title}</span>
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
