'use client';

export interface CompressedMediaResult {
  file: File;
  mediaType: 'IMAGE' | 'VIDEO';
  originalSize: number;
  compressedSize: number;
  durationMs: number;
  format: string;
}

/**
 * Mengompresi gambar di sisi klien dan mengonversinya menjadi format WebP
 * sebelum diunggah ke server (server juga melakukan optimasi ulang dengan Sharp ke WebP).
 */
export async function compressImageToWebp(
  file: File,
  options: { maxWidth?: number; maxHeight?: number; quality?: number } = {},
  onProgress?: (pct: number) => void
): Promise<CompressedMediaResult> {
  const maxWidth = options.maxWidth ?? 1080;
  const maxHeight = options.maxHeight ?? 1920;
  const quality = options.quality ?? 0.8;
  const originalSize = file.size;

  onProgress?.(15);

  if (typeof window === 'undefined' || typeof document === 'undefined') {
    onProgress?.(100);
    return {
      file,
      mediaType: 'IMAGE',
      originalSize,
      compressedSize: file.size,
      durationMs: 5000,
      format: 'webp',
    };
  }

  return new Promise((resolve) => {
    const img = new window.Image();
    const objectUrl = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      onProgress?.(50);

      let width = img.naturalWidth || img.width;
      let height = img.naturalHeight || img.height;

      if (width > maxWidth || height > maxHeight) {
        const ratio = Math.min(maxWidth / width, maxHeight / height);
        width = Math.round(width * ratio);
        height = Math.round(height * ratio);
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        onProgress?.(100);
        resolve({
          file,
          mediaType: 'IMAGE',
          originalSize,
          compressedSize: file.size,
          durationMs: 5000,
          format: 'webp',
        });
        return;
      }

      ctx.drawImage(img, 0, 0, width, height);
      onProgress?.(80);

      canvas.toBlob(
        (blob) => {
          onProgress?.(100);
          if (!blob) {
            resolve({
              file,
              mediaType: 'IMAGE',
              originalSize,
              compressedSize: file.size,
              durationMs: 5000,
              format: 'webp',
            });
            return;
          }

          const baseName = file.name.replace(/\.[^.]+$/, '') || 'story-image';
          const webpFile = new File([blob], `${baseName}.webp`, {
            type: 'image/webp',
            lastModified: Date.now(),
          });

          resolve({
            file: webpFile,
            mediaType: 'IMAGE',
            originalSize,
            compressedSize: webpFile.size,
            durationMs: 5000,
            format: 'webp',
          });
        },
        'image/webp',
        quality
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      onProgress?.(100);
      resolve({
        file,
        mediaType: 'IMAGE',
        originalSize,
        compressedSize: file.size,
        durationMs: 5000,
        format: 'webp',
      });
    };

    img.src = objectUrl;
  });
}

/**
 * Mengompresi file video di sisi klien menggunakan HTML5 Video + Canvas + MediaRecorder
 * dengan target resolusi maksimal 720p dan bitrate hemat kuota (~1.2 Mbps).
 * Jika video sudah kecil (< 1.5 MB) atau browser tidak mendukung stream capture,
 * otomatis menggunakan fallback file asli dengan aman.
 */
export async function compressVideoFile(
  file: File,
  onProgress?: (pct: number) => void
): Promise<CompressedMediaResult> {
  const originalSize = file.size;
  onProgress?.(10);

  if (typeof window === 'undefined' || typeof document === 'undefined') {
    onProgress?.(100);
    return {
      file,
      mediaType: 'VIDEO',
      originalSize,
      compressedSize: file.size,
      durationMs: 10000,
      format: 'mp4',
    };
  }

  return new Promise((resolve) => {
    const video = document.createElement('video');
    const objectUrl = URL.createObjectURL(file);
    video.preload = 'metadata';
    video.muted = true;
    video.playsInline = true;

    const cleanupAndFallback = (durationSec = 10) => {
      URL.revokeObjectURL(objectUrl);
      onProgress?.(100);
      const durationMs = Math.min(Math.max(Math.round(durationSec * 1000), 3000), 30000);
      resolve({
        file,
        mediaType: 'VIDEO',
        originalSize,
        compressedSize: file.size,
        durationMs,
        format: file.name.split('.').pop()?.toLowerCase() || 'mp4',
      });
    };

    video.onloadedmetadata = async () => {
      const durationSec = Number.isFinite(video.duration) && video.duration > 0 ? video.duration : 10;
      const durationMs = Math.min(Math.max(Math.round(durationSec * 1000), 3000), 30000);

      // Jika ukuran video sudah cukup kecil (<= 1.5 MB) dan durasi <= 30 detik, tidak perlu re-encode lambat
      const isSmallEnough = file.size <= 1.5 * 1024 * 1024 && durationSec <= 30;
      const supportsMediaRecorder =
        typeof window.MediaRecorder !== 'undefined' &&
        typeof HTMLCanvasElement.prototype.captureStream === 'function';

      if (isSmallEnough || !supportsMediaRecorder) {
        cleanupAndFallback(durationSec);
        return;
      }

      try {
        const maxDim = 1280;
        const minDim = 720;
        let targetW = video.videoWidth || 720;
        let targetH = video.videoHeight || 1280;

        const isPortrait = targetH >= targetW;
        const maxW = isPortrait ? minDim : maxDim;
        const maxH = isPortrait ? maxDim : minDim;

        if (targetW > maxW || targetH > maxH) {
          const ratio = Math.min(maxW / targetW, maxH / targetH);
          targetW = Math.floor((targetW * ratio) / 2) * 2;
          targetH = Math.floor((targetH * ratio) / 2) * 2;
        }

        const canvas = document.createElement('canvas');
        canvas.width = Math.max(targetW, 240);
        canvas.height = Math.max(targetH, 240);
        const ctx = canvas.getContext('2d');

        if (!ctx) {
          cleanupAndFallback(durationSec);
          return;
        }

        const candidateMimeTypes = [
          'video/webm;codecs=vp9,opus',
          'video/webm;codecs=vp8,opus',
          'video/webm',
          'video/mp4',
        ];
        const supportedMime = candidateMimeTypes.find((t) => MediaRecorder.isTypeSupported(t));

        if (!supportedMime) {
          cleanupAndFallback(durationSec);
          return;
        }

        const canvasStream = canvas.captureStream(24);

        // Coba gabungkan audio track dari elemen video jika browser mengizinkan
        try {
          const videoAny = video as any;
          const mediaStream: MediaStream | undefined =
            typeof videoAny.captureStream === 'function'
              ? videoAny.captureStream()
              : typeof videoAny.mozCaptureStream === 'function'
              ? videoAny.mozCaptureStream()
              : undefined;

          if (mediaStream) {
            mediaStream.getAudioTracks().forEach((track) => {
              canvasStream.addTrack(track);
            });
          }
        } catch {
          // Abaikan jika browser memblokir captureStream pada elemen video
        }

        const chunks: BlobPart[] = [];
        const recorder = new MediaRecorder(canvasStream, {
          mimeType: supportedMime,
          videoBitsPerSecond: 1_200_000, // ~1.2 Mbps untuk kompresi optimal
        });

        recorder.ondataavailable = (e) => {
          if (e.data && e.data.size > 0) {
            chunks.push(e.data);
          }
        };

        const maxRecordDuration = Math.min(durationSec, 20); // Kompresi cepat maks 20 detik story
        let animFrameId: number;

        const drawFrame = () => {
          if (!video.paused && !video.ended) {
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            const pct = Math.min(95, Math.round(15 + (video.currentTime / maxRecordDuration) * 80));
            onProgress?.(pct);
            if (video.currentTime >= maxRecordDuration) {
              video.pause();
              if (recorder.state === 'recording') {
                recorder.stop();
              }
              return;
            }
            animFrameId = requestAnimationFrame(drawFrame);
          }
        };

        recorder.onstop = () => {
          cancelAnimationFrame(animFrameId);
          URL.revokeObjectURL(objectUrl);
          onProgress?.(100);

          const ext = supportedMime.includes('mp4') ? 'mp4' : 'webm';
          const contentType = supportedMime.includes('mp4') ? 'video/mp4' : 'video/webm';
          const compressedBlob = new Blob(chunks, { type: contentType });

          // Gunakan hasil kompresi jika valid dan lebih hemat dari ukuran asli
          if (compressedBlob.size > 1024 && compressedBlob.size < file.size) {
            const baseName = file.name.replace(/\.[^.]+$/, '') || 'story-video';
            const compressedFile = new File([compressedBlob], `${baseName}-compressed.${ext}`, {
              type: contentType,
              lastModified: Date.now(),
            });
            resolve({
              file: compressedFile,
              mediaType: 'VIDEO',
              originalSize,
              compressedSize: compressedFile.size,
              durationMs: Math.round(maxRecordDuration * 1000),
              format: ext,
            });
          } else {
            resolve({
              file,
              mediaType: 'VIDEO',
              originalSize,
              compressedSize: file.size,
              durationMs,
              format: file.name.split('.').pop()?.toLowerCase() || 'mp4',
            });
          }
        };

        recorder.onerror = () => {
          cancelAnimationFrame(animFrameId);
          cleanupAndFallback(durationSec);
        };

        video.onended = () => {
          if (recorder.state === 'recording') {
            recorder.stop();
          }
        };

        recorder.start(250);
        await video.play();
        drawFrame();
      } catch {
        cleanupAndFallback(durationSec);
      }
    };

    video.onerror = () => {
      cleanupAndFallback(10);
    };

    video.src = objectUrl;
  });
}

/**
 * Fungsi utama kompresi media Story (Otomatis deteksi Gambar -> WebP atau Video -> Kompresi).
 */
export async function compressStoryMedia(
  file: File,
  onProgress?: (pct: number) => void
): Promise<CompressedMediaResult> {
  if (file.type.startsWith('video/') || /\.(mp4|webm|mov|m4v)$/i.test(file.name)) {
    return compressVideoFile(file, onProgress);
  }
  return compressImageToWebp(file, { maxWidth: 1080, maxHeight: 1920, quality: 0.8 }, onProgress);
}
