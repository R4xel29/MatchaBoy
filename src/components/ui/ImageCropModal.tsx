'use client';

import { useState, useCallback } from 'react';
import Cropper from 'react-easy-crop';
import { motion, AnimatePresence } from 'framer-motion';
import { X, RotateCw, Check, Loader2 } from 'lucide-react';

type Point = {
  x: number;
  y: number;
};

type Area = {
  x: number;
  y: number;
  width: number;
  height: number;
};

interface ImageCropModalProps {
  isOpen: boolean;
  imageUrl: string;
  onClose: () => void;
  onCropComplete: (croppedImageBlob: Blob) => void;
  aspectRatio?: number;
}

export function ImageCropModal({
  isOpen,
  imageUrl,
  onClose,
  onCropComplete,
  aspectRatio = 1, // Default to square (1:1)
}: ImageCropModalProps) {
  const [crop, setCrop] = useState<Point>({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const onCropChange = (location: Point) => {
    setCrop(location);
  };

  const onZoomChange = (zoom: number) => {
    setZoom(zoom);
  };

  const onCropCompleteCallback = useCallback(
    (croppedArea: Area, croppedAreaPixels: Area) => {
      setCroppedAreaPixels(croppedAreaPixels);
    },
    []
  );

  const handleRotate = () => {
    setRotation((prev) => (prev + 90) % 360);
  };

  const createImage = (url: string): Promise<HTMLImageElement> =>
    new Promise((resolve, reject) => {
      const image = new Image();
      image.addEventListener('load', () => resolve(image));
      image.addEventListener('error', (error) => reject(error));
      image.setAttribute('crossOrigin', 'anonymous');
      image.src = url;
    });

  const getCroppedImg = async (
    imageSrc: string,
    pixelCrop: Area,
    rotation = 0
  ): Promise<Blob> => {
    const image = await createImage(imageSrc);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      throw new Error('No 2d context');
    }

    const maxSize = Math.max(image.width, image.height);
    const safeArea = 2 * ((maxSize / 2) * Math.sqrt(2));

    canvas.width = safeArea;
    canvas.height = safeArea;

    ctx.translate(safeArea / 2, safeArea / 2);
    ctx.rotate((rotation * Math.PI) / 180);
    ctx.translate(-safeArea / 2, -safeArea / 2);

    ctx.drawImage(
      image,
      safeArea / 2 - image.width * 0.5,
      safeArea / 2 - image.height * 0.5
    );

    const data = ctx.getImageData(0, 0, safeArea, safeArea);

    canvas.width = pixelCrop.width;
    canvas.height = pixelCrop.height;

    ctx.putImageData(
      data,
      Math.round(0 - safeArea / 2 + image.width * 0.5 - pixelCrop.x),
      Math.round(0 - safeArea / 2 + image.height * 0.5 - pixelCrop.y)
    );

    return new Promise((resolve, reject) => {
      canvas.toBlob((blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error('Canvas is empty'));
        }
      }, 'image/jpeg', 0.95);
    });
  };

  const handleSave = async () => {
    if (!croppedAreaPixels) return;

    setIsProcessing(true);
    try {
      const croppedImageBlob = await getCroppedImg(
        imageUrl,
        croppedAreaPixels,
        rotation
      );
      onCropComplete(croppedImageBlob);
    } catch (error) {
      console.error('Error cropping image:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[200] bg-black/95 flex flex-col"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 bg-black/50 backdrop-blur-sm">
            <button
              onClick={onClose}
              disabled={isProcessing}
              className="w-10 h-10 flex items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 transition-all active:scale-90 disabled:opacity-50"
            >
              <X className="w-5 h-5" />
            </button>
            <h2 className="text-white font-bold text-lg">Edit Foto</h2>
            <button
              onClick={handleSave}
              disabled={isProcessing}
              className="px-4 py-2 bg-[#B48A5E] text-white rounded-full font-bold text-sm hover:bg-[#96714C] transition-all active:scale-95 disabled:opacity-50 flex items-center gap-2"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Proses...
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  Simpan
                </>
              )}
            </button>
          </div>

          {/* Crop Area */}
          <div className="flex-1 relative">
            <Cropper
              image={imageUrl}
              crop={crop}
              zoom={zoom}
              rotation={rotation}
              aspect={aspectRatio}
              onCropChange={onCropChange}
              onZoomChange={onZoomChange}
              onCropComplete={onCropCompleteCallback}
              cropShape="round"
              showGrid={false}
              style={{
                containerStyle: {
                  backgroundColor: 'transparent',
                },
              }}
            />
          </div>

          {/* Controls */}
          <div className="p-6 bg-black/50 backdrop-blur-sm space-y-4">
            {/* Zoom Control */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-white text-sm font-bold">Zoom</label>
                <span className="text-white/60 text-xs font-mono">
                  {Math.round(zoom * 100)}%
                </span>
              </div>
              <input
                type="range"
                min={1}
                max={3}
                step={0.1}
                value={zoom}
                onChange={(e) => setZoom(Number(e.target.value))}
                className="w-full h-2 bg-white/20 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-[#B48A5E] [&::-webkit-slider-thumb]:cursor-pointer"
              />
            </div>

            {/* Rotate Button */}
            <button
              onClick={handleRotate}
              disabled={isProcessing}
              className="w-full flex items-center justify-center gap-2 py-3 bg-white/10 text-white rounded-2xl font-bold hover:bg-white/20 transition-all active:scale-95 disabled:opacity-50"
            >
              <RotateCw className="w-5 h-5" />
              Putar 90°
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
