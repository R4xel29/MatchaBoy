'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useSession } from 'next-auth/react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  ChevronRight,
  Sparkles,
  ShoppingBag,
  Heart,
  Plus,
  Video,
  Image as ImageIcon,
  Users,
  Volume2,
  VolumeX,
  Trash2,
  Loader2,
  Clock,
  CheckCircle2,
  Play,
  Pause,
  Camera,
  RefreshCw,
  RotateCcw,
  Type,
  Send,
  Zap,
  Palette,
  Maximize2,
  Minimize2,
} from 'lucide-react';
import Image from 'next/image';
import { useToast } from '@/components/ui/Toast';
import { compressStoryMedia } from '@/lib/story-media-compressor';

export interface StoryLikeUser {
  id: string;
  userId: string;
  createdAt: string;
  user: {
    id: string;
    name: string | null;
    image: string | null;
    role?: string;
  };
}

export interface StoryItem {
  id: string;
  title: string;
  mediaUrl: string;
  mediaType: 'IMAGE' | 'VIDEO' | string;
  linkUrl?: string | null;
  isActive: boolean;
  duration: number;
  userId?: string | null;
  createdAt?: string;
  expiresAt?: string;
  user?: {
    id: string;
    name: string | null;
    image: string | null;
    role?: string;
  } | null;
  likes?: StoryLikeUser[];
}

const CAMERA_FILTERS = [
  { id: 'none', name: 'Normal', css: 'none' },
  { id: 'warm', name: 'Arum Warm', css: 'sepia(0.22) saturate(1.35) contrast(1.05) brightness(1.03)' },
  { id: 'golden', name: 'Golden Hour', css: 'sepia(0.35) saturate(1.5) brightness(1.06)' },
  { id: 'vivid', name: 'Vivid Crisp', css: 'saturate(1.4) contrast(1.12)' },
  { id: 'mono', name: 'Classic B&W', css: 'grayscale(1) contrast(1.18)' },
];

const TEXT_BG_THEMES = [
  'from-orange-600 via-amber-500 to-yellow-500',
  'from-stone-900 via-amber-950 to-orange-900',
  'from-amber-500 via-orange-500 to-red-500',
  'from-orange-400 via-amber-300 to-yellow-200',
];

function formatBytes(bytes: number): string {
  if (!bytes || bytes <= 0) return '0 KB';
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function getRemainingDays(expiresAt?: string): number {
  if (!expiresAt) return 20;
  const diffMs = new Date(expiresAt).getTime() - Date.now();
  return Math.max(1, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
}

function formatRelativeTime(dateStr?: string): string {
  if (!dateStr) return 'Baru saja';
  const diffSec = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (diffSec < 60) return 'Baru saja';
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)} menit lalu`;
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)} jam lalu`;
  return `${Math.floor(diffSec / 86400)} hari lalu`;
}

export function StoryBar() {
  const { data: session, status } = useSession();
  const { showToast } = useToast();

  const [stories, setStories] = useState<StoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeStoryIndex, setActiveStoryIndex] = useState<number | null>(null);
  const [progress, setProgress] = useState(0);
  const [viewedStories, setViewedStories] = useState<Set<string>>(new Set());
  const [mounted, setMounted] = useState(false);

  // Story Viewer states
  const [isPaused, setIsPaused] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [showLikersModal, setShowLikersModal] = useState(false);
  const [likingStoryId, setLikingStoryId] = useState<string | null>(null);
  const [deletingStoryId, setDeletingStoryId] = useState<string | null>(null);

  // Instagram-Style Full Camera Story Creator states
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [cameraMode, setCameraMode] = useState<'PHOTO' | 'VIDEO' | 'TEXT'>('PHOTO');
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const [cameraFitMode, setCameraFitMode] = useState<'FIT' | 'COVER'>('FIT'); // Default FIT agar kamera tidak nge-zoom / terpotong
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [activeFilterIndex, setActiveFilterIndex] = useState(0);
  const [textBgIndex, setTextBgIndex] = useState(0);
  const [flashEffect, setFlashEffect] = useState(false);

  // Live Video Recording states
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);

  // Overlay Text & Caption states
  const [showTextOverlayInput, setShowTextOverlayInput] = useState(false);
  const [overlayText, setOverlayText] = useState('');
  const [storyTitle, setStoryTitle] = useState('');

  // Captured / Compressed Media states
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [capturedFile, setCapturedFile] = useState<File | null>(null);
  const [mediaType, setMediaType] = useState<'IMAGE' | 'VIDEO'>('IMAGE');
  const [mediaDuration, setMediaDuration] = useState<number>(5000);
  const [compressing, setCompressing] = useState(false);
  const [compressionProgress, setCompressionProgress] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [compressionStats, setCompressionStats] = useState<{
    originalSize: number;
    compressedSize: number;
    format: string;
  } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoPlayerRef = useRef<HTMLVideoElement>(null);
  const liveVideoRef = useRef<HTMLVideoElement>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<BlobPart[]>([]);
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('arumseduh_viewed_stories');
        if (saved) {
          setViewedStories(new Set(JSON.parse(saved)));
        }
      } catch (e) {
        console.error(e);
      }
    }
  }, []);

  const fetchStories = () => {
    fetch('/api/stories')
      .then((res) => res.json())
      .then((data) => {
        if (data?.success && Array.isArray(data.stories)) {
          setStories(data.stories);
        }
      })
      .catch((err) => console.error('Error fetching stories:', err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchStories();
  }, []);

  const stopCameraStream = useCallback(() => {
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      try {
        mediaRecorderRef.current.stop();
      } catch {}
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }
    setCameraReady(false);
    setIsRecording(false);
  }, []);

  // Start live camera stream with natural wide sensor aspect ratio (no forced portrait crop)
  const startCameraStream = useCallback(async () => {
    if (!isCreateOpen || previewUrl || cameraMode === 'TEXT') {
      stopCameraStream();
      return;
    }

    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      setCameraError('Kamera tidak tersedia di perangkat/browser ini.');
      return;
    }

    stopCameraStream();
    setCameraError(null);

    const applyWideSensorReset = async (stream: MediaStream) => {
      try {
        const videoTrack = stream.getVideoTracks()[0];
        if (videoTrack && typeof videoTrack.getCapabilities === 'function') {
          const caps = videoTrack.getCapabilities() as any;
          if (caps?.zoom && typeof caps.zoom.min === 'number') {
            await videoTrack.applyConstraints({
              advanced: [{ zoom: caps.zoom.min } as any],
            });
          }
        }
      } catch {
        // Ignore if hardware zoom constraint is not supported
      }
    };

    try {
      // Gunakan resolusi sensor natural (tanpa memaksa 1080x1920 yang membuat webcam/HP melakukan digital crop/zoom)
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode,
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: cameraMode === 'VIDEO',
      });

      await applyWideSensorReset(stream);
      mediaStreamRef.current = stream;
      if (liveVideoRef.current) {
        liveVideoRef.current.srcObject = stream;
        await liveVideoRef.current.play().catch(() => {});
      }
      setCameraReady(true);
    } catch {
      try {
        const fallbackStream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode },
          audio: false,
        });
        await applyWideSensorReset(fallbackStream);
        mediaStreamRef.current = fallbackStream;
        if (liveVideoRef.current) {
          liveVideoRef.current.srcObject = fallbackStream;
          await liveVideoRef.current.play().catch(() => {});
        }
        setCameraReady(true);
      } catch {
        setCameraError(
          'Akses kamera belum diizinkan. Izinkan akses kamera di browser atau gunakan mode Cerita Teks / Galeri di bawah.'
        );
      }
    }
  }, [isCreateOpen, previewUrl, cameraMode, facingMode, stopCameraStream]);

  useEffect(() => {
    if (isCreateOpen && !previewUrl && cameraMode !== 'TEXT') {
      startCameraStream();
    } else {
      stopCameraStream();
    }
    return () => {
      stopCameraStream();
    };
  }, [isCreateOpen, previewUrl, cameraMode, facingMode, startCameraStream, stopCameraStream]);

  // Lock body scroll & handle keyboard navigation while story modal or create modal is active
  useEffect(() => {
    if (activeStoryIndex === null && !isCreateOpen) return;

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (e: KeyboardEvent) => {
      if (isCreateOpen) {
        if (e.key === 'Escape' && !submitting) {
          stopCameraStream();
          setIsCreateOpen(false);
        }
        return;
      }
      if (showLikersModal) {
        if (e.key === 'Escape') setShowLikersModal(false);
        return;
      }
      if (e.key === 'Escape') {
        setActiveStoryIndex(null);
      } else if (e.key === 'ArrowRight') {
        setActiveStoryIndex((prev) => {
          if (prev === null) return null;
          return prev < stories.length - 1 ? prev + 1 : null;
        });
        setProgress(0);
      } else if (e.key === 'ArrowLeft') {
        setActiveStoryIndex((prev) => {
          if (prev === null) return null;
          return prev > 0 ? prev - 1 : 0;
        });
        setProgress(0);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [activeStoryIndex, stories.length, isCreateOpen, showLikersModal, submitting, stopCameraStream]);

  const markStoryAsViewed = (id: string) => {
    setViewedStories((prev) => {
      const next = new Set(prev);
      next.add(id);
      if (typeof window !== 'undefined') {
        localStorage.setItem('arumseduh_viewed_stories', JSON.stringify(Array.from(next)));
      }
      return next;
    });
  };

  // Story Autoplay & Progress Bar Timer
  useEffect(() => {
    if (activeStoryIndex === null || stories.length === 0) {
      setProgress(0);
      return;
    }

    const currentStory = stories[activeStoryIndex];
    if (!currentStory) return;
    markStoryAsViewed(currentStory.id);

    if (isPaused || showLikersModal) {
      if (videoPlayerRef.current && !videoPlayerRef.current.paused) {
        videoPlayerRef.current.pause();
      }
      return;
    } else {
      if (videoPlayerRef.current && videoPlayerRef.current.paused) {
        videoPlayerRef.current.play().catch(() => {});
      }
    }

    const duration = currentStory.duration || (currentStory.mediaType === 'VIDEO' ? 15000 : 5000);
    const stepMs = 50;
    const increment = (stepMs / duration) * 100;

    const interval = setInterval(() => {
      setProgress((prev) => {
        const nextPct = prev + increment;
        if (nextPct >= 100) {
          clearInterval(interval);
          if (activeStoryIndex < stories.length - 1) {
            setActiveStoryIndex(activeStoryIndex + 1);
            return 0;
          } else {
            setActiveStoryIndex(null);
            return 0;
          }
        }
        return nextPct;
      });
    }, stepMs);

    return () => clearInterval(interval);
  }, [activeStoryIndex, stories, isPaused, showLikersModal]);

  const handleStoryClick = (index: number) => {
    setShowLikersModal(false);
    setIsPaused(false);
    setActiveStoryIndex(index);
    setProgress(0);
  };

  const handleNext = () => {
    if (activeStoryIndex === null) return;
    setShowLikersModal(false);
    if (activeStoryIndex < stories.length - 1) {
      setActiveStoryIndex(activeStoryIndex + 1);
      setProgress(0);
    } else {
      setActiveStoryIndex(null);
    }
  };

  const handlePrev = () => {
    if (activeStoryIndex === null) return;
    setShowLikersModal(false);
    if (activeStoryIndex > 0) {
      setActiveStoryIndex(activeStoryIndex - 1);
      setProgress(0);
    } else {
      setActiveStoryIndex(0);
      setProgress(0);
    }
  };

  const handleToggleLike = async (story: StoryItem, e: React.MouseEvent) => {
    e.stopPropagation();
    if (status !== 'authenticated' || !session?.user?.id) {
      showToast('Silakan masuk terlebih dahulu untuk menyukai Story.', 'error');
      return;
    }
    if (likingStoryId === story.id) return;

    setLikingStoryId(story.id);
    const currentUserId = session.user.id;
    const currentLikes = story.likes || [];
    const alreadyLiked = currentLikes.some((l) => l.userId === currentUserId);

    const optimisticLikes: StoryLikeUser[] = alreadyLiked
      ? currentLikes.filter((l) => l.userId !== currentUserId)
      : [
          {
            id: `temp-${Date.now()}`,
            userId: currentUserId,
            createdAt: new Date().toISOString(),
            user: {
              id: currentUserId,
              name: session.user.name || 'Pelanggan Arum Seduh',
              image: session.user.image || null,
              role: (session.user as any).role || 'CUSTOMER',
            },
          },
          ...currentLikes,
        ];

    setStories((prev) =>
      prev.map((s) => (s.id === story.id ? { ...s, likes: optimisticLikes } : s))
    );

    try {
      const res = await fetch(`/api/stories/${story.id}/like`, {
        method: 'POST',
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setStories((prev) =>
          prev.map((s) => (s.id === story.id ? { ...s, likes: data.likes } : s))
        );
      } else {
        throw new Error(data.error || 'Gagal menyukai story');
      }
    } catch (err: any) {
      setStories((prev) =>
        prev.map((s) => (s.id === story.id ? { ...s, likes: currentLikes } : s))
      );
      showToast(err.message || 'Gagal menyukai story', 'error');
    } finally {
      setLikingStoryId(null);
    }
  };

  const handleDeleteStory = async (story: StoryItem, e: React.MouseEvent) => {
    e.stopPropagation();
    if (deletingStoryId) return;
    setDeletingStoryId(story.id);
    try {
      const res = await fetch(`/api/stories/${story.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Gagal menghapus story');
      const nextStories = stories.filter((s) => s.id !== story.id);
      setStories(nextStories);
      showToast('Story berhasil dihapus', 'success');
      if (nextStories.length === 0) {
        setActiveStoryIndex(null);
      } else if (activeStoryIndex !== null && activeStoryIndex >= nextStories.length) {
        setActiveStoryIndex(nextStories.length - 1);
      }
    } catch (err: any) {
      showToast(err.message || 'Gagal menghapus story', 'error');
    } finally {
      setDeletingStoryId(null);
    }
  };

  const handleOpenCreateStory = () => {
    if (status !== 'authenticated' || !session?.user) {
      showToast('Silakan masuk terlebih dahulu untuk membuat Story Anda.', 'error');
      return;
    }
    setStoryTitle('');
    setOverlayText('');
    setShowTextOverlayInput(false);
    setPreviewUrl(null);
    setCapturedFile(null);
    setCompressionStats(null);
    setCameraMode('PHOTO');
    setCameraFitMode('FIT');
    setZoomLevel(1);
    setMediaType('IMAGE');
    setMediaDuration(5000);
    setActiveFilterIndex(0);
    setIsCreateOpen(true);
  };

  // Instant Photo Capture from Live Camera -> True 9:16 WebP without unwanted zoom/crop!
  const handleCapturePhoto = async () => {
    const video = liveVideoRef.current;
    if (!video || !cameraReady) return;

    setFlashEffect(true);
    setTimeout(() => setFlashEffect(false), 180);

    const vw = video.videoWidth || 1280;
    const vh = video.videoHeight || 720;

    // Kanvas target Story proporsional 9:16 (1080x1920)
    const targetW = 1080;
    const targetH = 1920;
    const canvas = document.createElement('canvas');
    canvas.width = targetW;
    canvas.height = targetH;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const currentFilter = CAMERA_FILTERS[activeFilterIndex];
    const filterCss = currentFilter && currentFilter.css !== 'none' ? currentFilter.css : '';

    // 1. Gambar latar belakang ambient blur agar bidang kosong atas/bawah tetap estetik (tanpa bar hitam kaku)
    ctx.save();
    ctx.filter = `${filterCss} blur(36px) brightness(0.55)`.trim();
    const bgScale = Math.max(targetW / vw, targetH / vh) * 1.1;
    const bgW = vw * bgScale;
    const bgH = vh * bgScale;
    const bgX = (targetW - bgW) / 2;
    const bgY = (targetH - bgH) / 2;
    if (facingMode === 'user') {
      ctx.translate(targetW, 0);
      ctx.scale(-1, 1);
    }
    ctx.drawImage(video, bgX, bgY, bgW, bgH);
    ctx.restore();

    // 2. Gambar frame utama kamera sesuai mode FIT (1x Wide utuh) atau COVER, ditambah zoomLevel pilihan pengguna
    ctx.save();
    if (filterCss) {
      ctx.filter = filterCss;
    }

    const baseScale =
      cameraFitMode === 'FIT'
        ? Math.min(targetW / vw, targetH / vh)
        : Math.max(targetW / vw, targetH / vh);
    const finalScale = baseScale * zoomLevel;
    const drawW = vw * finalScale;
    const drawH = vh * finalScale;
    const drawX = (targetW - drawW) / 2;
    const drawY = (targetH - drawH) / 2;

    if (facingMode === 'user') {
      ctx.translate(targetW, 0);
      ctx.scale(-1, 1);
    }
    ctx.drawImage(video, drawX, drawY, drawW, drawH);
    ctx.restore();

    // 3. Jika ada teks overlay pada layar, gambar ke kanvas
    if (overlayText.trim()) {
      const fontSize = 54;
      ctx.font = `900 ${fontSize}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const textWidth = Math.min(targetW * 0.86, ctx.measureText(overlayText).width + 56);
      const boxHeight = fontSize * 1.9;
      const boxX = (targetW - textWidth) / 2;
      const boxY = targetH * 0.5 - boxHeight / 2;

      ctx.fillStyle = 'rgba(0, 0, 0, 0.65)';
      ctx.beginPath();
      ctx.roundRect(boxX, boxY, textWidth, boxHeight, 24);
      ctx.fill();

      ctx.fillStyle = '#FFFFFF';
      ctx.fillText(overlayText.trim(), targetW / 2, targetH * 0.5, targetW * 0.82);
    }

    canvas.toBlob(
      async (blob) => {
        if (!blob) return;
        const rawShot = new File([blob], `camera-story-${Date.now()}.webp`, {
          type: 'image/webp',
        });
        const compressed = await compressStoryMedia(rawShot);
        stopCameraStream();
        setCapturedFile(compressed.file);
        setPreviewUrl(URL.createObjectURL(compressed.file));
        setMediaType('IMAGE');
        setMediaDuration(5000);
        setCompressionStats({
          originalSize: Math.round(targetW * targetH * 0.35),
          compressedSize: compressed.compressedSize,
          format: 'WEBP',
        });
      },
      'image/webp',
      0.82
    );
  };

  // Capture Story Card in TEXT Mode -> WebP
  const handleCaptureTextStory = async () => {
    const textToRender = overlayText.trim() || storyTitle.trim() || 'Momen Segar di Arum Seduh';
    const width = 1080;
    const height = 1920;
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const grad = ctx.createLinearGradient(0, 0, width, height);
    if (textBgIndex === 0) {
      grad.addColorStop(0, '#EA580C');
      grad.addColorStop(0.5, '#F59E0B');
      grad.addColorStop(1, '#EAB308');
    } else if (textBgIndex === 1) {
      grad.addColorStop(0, '#1C1917');
      grad.addColorStop(0.5, '#451A03');
      grad.addColorStop(1, '#7C2D12');
    } else if (textBgIndex === 2) {
      grad.addColorStop(0, '#F59E0B');
      grad.addColorStop(0.5, '#EA580C');
      grad.addColorStop(1, '#DC2626');
    } else {
      grad.addColorStop(0, '#FB923C');
      grad.addColorStop(0.5, '#FBBF24');
      grad.addColorStop(1, '#FEF08A');
    }
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, height);

    ctx.fillStyle = '#FFFFFF';
    ctx.font = '900 68px serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    const words = textToRender.split(' ');
    const lines: string[] = [];
    let currentLine = '';
    for (const w of words) {
      const testLine = currentLine ? `${currentLine} ${w}` : w;
      if (ctx.measureText(testLine).width > width * 0.78) {
        if (currentLine) lines.push(currentLine);
        currentLine = w;
      } else {
        currentLine = testLine;
      }
    }
    if (currentLine) lines.push(currentLine);

    const lineHeight = 92;
    const startY = height / 2 - ((lines.length - 1) * lineHeight) / 2;
    lines.forEach((line, idx) => {
      ctx.fillText(line, width / 2, startY + idx * lineHeight);
    });

    if (!storyTitle.trim()) {
      setStoryTitle(textToRender);
    }

    canvas.toBlob(
      async (blob) => {
        if (!blob) return;
        const webpFile = new File([blob], `text-story-${Date.now()}.webp`, {
          type: 'image/webp',
        });
        setCapturedFile(webpFile);
        setPreviewUrl(URL.createObjectURL(webpFile));
        setMediaType('IMAGE');
        setMediaDuration(5000);
        setCompressionStats({
          originalSize: webpFile.size,
          compressedSize: webpFile.size,
          format: 'WEBP',
        });
      },
      'image/webp',
      0.85
    );
  };

  // Start / Stop Live Video Recording from Camera Stream
  const handleToggleVideoRecording = () => {
    if (isRecording) {
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
        recordingTimerRef.current = null;
      }
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
        mediaRecorderRef.current.stop();
      }
      setIsRecording(false);
      return;
    }

    const stream = mediaStreamRef.current;
    if (!stream) return;

    const candidateMimes = [
      'video/webm;codecs=vp9,opus',
      'video/webm;codecs=vp8,opus',
      'video/webm',
      'video/mp4',
    ];
    const mimeType =
      candidateMimes.find((m) => typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(m)) ||
      '';

    try {
      recordedChunksRef.current = [];
      const recorder = new MediaRecorder(stream, {
        ...(mimeType ? { mimeType } : {}),
        videoBitsPerSecond: 1_200_000,
      });

      mediaRecorderRef.current = recorder;
      const startTime = Date.now();
      setRecordingSeconds(0);
      setIsRecording(true);

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          recordedChunksRef.current.push(e.data);
        }
      };

      recorder.onstop = () => {
        const elapsedMs = Math.min(Math.max(Date.now() - startTime, 3000), 20000);
        const ext = mimeType.includes('mp4') ? 'mp4' : 'webm';
        const contentType = mimeType.includes('mp4') ? 'video/mp4' : 'video/webm';
        const blob = new Blob(recordedChunksRef.current, { type: contentType });
        const videoFile = new File([blob], `camera-video-${Date.now()}.${ext}`, {
          type: contentType,
        });

        stopCameraStream();
        setCapturedFile(videoFile);
        setPreviewUrl(URL.createObjectURL(videoFile));
        setMediaType('VIDEO');
        setMediaDuration(elapsedMs);
        setCompressionStats({
          originalSize: Math.round(videoFile.size * 1.65),
          compressedSize: videoFile.size,
          format: ext.toUpperCase(),
        });
      };

      recorder.start(250);

      recordingTimerRef.current = setInterval(() => {
        setRecordingSeconds((prev) => {
          if (prev >= 19) {
            if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
              mediaRecorderRef.current.stop();
            }
            if (recordingTimerRef.current) {
              clearInterval(recordingTimerRef.current);
              recordingTimerRef.current = null;
            }
            setIsRecording(false);
            return 20;
          }
          return prev + 1;
        });
      }, 1000);
    } catch {
      showToast('Perekaman video langsung tidak didukung di browser ini.', 'error');
    }
  };

  // Pick from Device Gallery (Bottom-Left Thumbnail Button in Camera View)
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawFile = e.target.files?.[0];
    if (!rawFile) return;

    stopCameraStream();
    setCompressing(true);
    setCompressionProgress(5);
    setCompressionStats(null);

    try {
      const compressed = await compressStoryMedia(rawFile, (pct) => {
        setCompressionProgress(pct);
      });

      setCapturedFile(compressed.file);
      setPreviewUrl(URL.createObjectURL(compressed.file));
      setMediaType(compressed.mediaType);
      setMediaDuration(compressed.durationMs);
      setCompressionStats({
        originalSize: compressed.originalSize,
        compressedSize: compressed.compressedSize,
        format: compressed.format.toUpperCase(),
      });
    } catch (err: any) {
      showToast(err.message || 'Gagal memproses media', 'error');
    } finally {
      setCompressing(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleRetake = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setCapturedFile(null);
    setCompressionStats(null);
    setRecordingSeconds(0);
  };

  const handleCreateStorySubmit = async () => {
    if (!capturedFile) {
      showToast('Ambil foto atau rekam video terlebih dahulu.', 'error');
      return;
    }

    const finalTitle =
      storyTitle.trim() ||
      overlayText.trim() ||
      `Momen ${session?.user?.name?.split(' ')[0] || 'Segar'} di Arum Seduh`;

    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('file', capturedFile);

      const uploadRes = await fetch('/api/stories/upload', {
        method: 'POST',
        body: formData,
      });
      const uploadData = await uploadRes.json();

      if (!uploadRes.ok || !uploadData.url) {
        throw new Error(uploadData.error || 'Gagal mengunggah media Story');
      }

      const res = await fetch('/api/stories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: finalTitle,
          mediaUrl: uploadData.url,
          mediaType: uploadData.mediaType || mediaType,
          duration: mediaDuration,
          daysActive: 20,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Gagal membagikan Story');
      }

      setStories((prev) => [data.story, ...prev]);
      stopCameraStream();
      setIsCreateOpen(false);
      showToast('Story Anda berhasil tayang di Beranda selama 20 hari!', 'success');
      setActiveStoryIndex(0);
      setProgress(0);
    } catch (err: any) {
      showToast(err.message || 'Gagal membagikan Story', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading && stories.length === 0) return null;

  const currentStory = activeStoryIndex !== null ? stories[activeStoryIndex] : null;
  const currentLikes = currentStory?.likes || [];
  const isLikedByMe =
    !!session?.user?.id && currentLikes.some((l) => l.userId === session.user?.id);
  const canDeleteCurrentStory =
    !!session?.user?.id &&
    !!currentStory &&
    (currentStory.userId === session.user.id || (session.user as any).role === 'ADMIN');
  const isOfficialStory =
    !currentStory?.user || currentStory.user.role === 'ADMIN';
  const activeFilter = CAMERA_FILTERS[activeFilterIndex] || CAMERA_FILTERS[0];

  return (
    <>
      <style
        dangerouslySetInnerHTML={{
          __html: `
        @keyframes story-halo-glow {
          0%, 100% { border-color: rgba(249, 115, 22, 0.85); box-shadow: 0 0 8px rgba(249, 115, 22, 0.35); }
          50% { border-color: rgba(254, 240, 138, 0.95); box-shadow: 0 0 14px rgba(254, 240, 138, 0.55); }
        }
      `,
        }}
      />

      {/* STORY BAR CONTAINER */}
      <div className="w-full bg-white rounded-3xl border border-amber-100/80 p-4.5 shadow-sm overflow-hidden select-none mb-6">
        <div className="flex items-center justify-between gap-2 mb-3.5 px-1">
          <div className="flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-orange-500 animate-pulse" />
            <h3 className="text-xs font-black text-gray-900 uppercase tracking-widest leading-none">
              Cerita & Momen Arum Seduh
            </h3>
            <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-orange-50 text-orange-600 border border-orange-200/70 text-[9px] font-bold">
              <Clock className="w-2.5 h-2.5" />
              20 Hari
            </span>
          </div>

          <button
            type="button"
            onClick={handleOpenCreateStory}
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gradient-to-r from-orange-500 to-amber-500 text-white text-[10px] font-black shadow-sm hover:shadow transition-all active:scale-95 cursor-pointer"
          >
            <Camera className="w-3 h-3" />
            <span>Buat Story</span>
          </button>
        </div>

        {/* Stories Horizontal Scroll */}
        <div className="flex gap-4 overflow-x-auto scrollbar-hide pb-0.5 pt-0.5">
          {/* Tombol Kamera Story Pengguna */}
          <button
            type="button"
            onClick={handleOpenCreateStory}
            className="flex flex-col items-center gap-2 shrink-0 cursor-pointer active:scale-95 transition-transform bg-transparent border-0 outline-none group"
          >
            <div className="relative w-15 h-15 rounded-full p-[2.5px] border-2 border-dashed border-orange-400 group-hover:border-orange-500 flex items-center justify-center bg-orange-50/50">
              <div className="relative w-full h-full rounded-full overflow-hidden bg-gradient-to-br from-orange-50 to-amber-100 flex items-center justify-center">
                {session?.user?.image ? (
                  <Image
                    src={session.user.image}
                    alt={session.user.name || 'Buat Story'}
                    fill
                    sizes="60px"
                    className="object-cover opacity-90"
                  />
                ) : (
                  <Camera className="w-6 h-6 text-orange-600" />
                )}
              </div>
              <div className="absolute -bottom-0.5 -right-0.5 w-5 h-5 rounded-full bg-gradient-to-r from-orange-500 to-amber-500 text-white flex items-center justify-center border-2 border-white shadow">
                <Plus className="w-3 h-3" />
              </div>
            </div>
            <span className="text-[10px] font-black text-orange-600 tracking-tight max-w-[68px] truncate text-center">
              Buat Story
            </span>
          </button>

          {/* Daftar Semua Story Aktif (Official & User) */}
          {stories.map((story, index) => {
            const hasViewed = viewedStories.has(story.id);
            const likesCount = story.likes?.length || 0;
            const authorLabel =
              story.user && story.user.role !== 'ADMIN' && story.user.name
                ? story.user.name.split(' ')[0]
                : story.title.split(':')[0] || 'Arum Seduh';

            return (
              <button
                key={story.id}
                type="button"
                onClick={() => handleStoryClick(index)}
                className="flex flex-col items-center gap-2 shrink-0 cursor-pointer active:scale-95 transition-transform bg-transparent border-0 outline-none"
              >
                <div
                  style={{
                    animation: !hasViewed ? 'story-halo-glow 3s ease-in-out infinite' : 'none',
                    borderColor: hasViewed ? '#E5E2DD' : undefined,
                    boxShadow: hasViewed ? 'none' : undefined,
                  }}
                  className="relative w-15 h-15 rounded-full p-[2.5px] border-2 flex items-center justify-center"
                >
                  <div className="relative w-full h-full rounded-full overflow-hidden bg-amber-50 border border-amber-150">
                    {story.mediaType === 'VIDEO' ? (
                      <video
                        src={story.mediaUrl}
                        className="w-full h-full object-cover"
                        muted
                        playsInline
                        preload="metadata"
                      />
                    ) : (
                      <Image
                        src={story.mediaUrl}
                        alt={story.title}
                        fill
                        sizes="60px"
                        className="object-cover"
                      />
                    )}
                  </div>

                  {story.mediaType === 'VIDEO' && (
                    <span className="absolute -top-0.5 -right-0.5 w-4.5 h-4.5 rounded-full bg-stone-900/80 text-amber-300 flex items-center justify-center border border-white/40">
                      <Play className="w-2.5 h-2.5 fill-amber-300" />
                    </span>
                  )}

                  {likesCount > 0 && (
                    <span className="absolute -bottom-1 px-1.5 py-0.2 rounded-full bg-gradient-to-r from-orange-500 to-amber-500 text-white text-[8px] font-black flex items-center gap-0.5 border border-white shadow-sm">
                      <Heart className="w-2 h-2 fill-white" />
                      {likesCount}
                    </span>
                  )}
                </div>
                <span className="text-[10px] font-black text-gray-800 tracking-tight max-w-[68px] truncate text-center">
                  {authorLabel}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* FULL SCREEN INTERACTIVE STORIES VIEWER OVERLAY (Portaled to document.body) */}
      {mounted &&
        createPortal(
          <AnimatePresence>
            {activeStoryIndex !== null && currentStory && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/95 backdrop-blur-md select-none"
                onClick={() => {
                  setShowLikersModal(false);
                  setActiveStoryIndex(null);
                }}
              >
                <motion.div
                  initial={{ scale: 0.96, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.96, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  onClick={(e) => e.stopPropagation()}
                  className="relative w-full h-full md:h-[90vh] md:max-h-[820px] max-w-md md:rounded-3xl bg-stone-950 overflow-hidden flex flex-col justify-between shadow-2xl border-0 md:border md:border-white/10"
                >
                  {/* Story Media (Tampil proporsional tanpa zoom berlebih, dengan latar blur ambient) */}
                  <div className="absolute inset-0 z-10 flex items-center justify-center bg-stone-950">
                    {currentStory.mediaType === 'VIDEO' ? (
                      <>
                        <video
                          src={currentStory.mediaUrl}
                          muted
                          playsInline
                          className="absolute inset-0 w-full h-full object-cover blur-2xl opacity-45 scale-110 pointer-events-none"
                        />
                        <video
                          ref={videoPlayerRef}
                          key={currentStory.id}
                          src={currentStory.mediaUrl}
                          autoPlay
                          playsInline
                          muted={isMuted}
                          onEnded={handleNext}
                          className="relative z-10 w-full h-full object-contain"
                        />
                      </>
                    ) : (
                      <>
                        <Image
                          src={currentStory.mediaUrl}
                          alt={currentStory.title}
                          fill
                          className="object-cover blur-2xl opacity-50 scale-110 pointer-events-none"
                          sizes="(max-width: 768px) 100vw, 450px"
                        />
                        <Image
                          src={currentStory.mediaUrl}
                          alt={currentStory.title}
                          fill
                          priority
                          className="object-contain z-10"
                          sizes="(max-width: 768px) 100vw, 450px"
                        />
                      </>
                    )}
                    <div className="absolute inset-0 z-20 bg-gradient-to-b from-black/70 via-transparent to-black/85 pointer-events-none" />
                  </div>

                  <div
                    className="absolute inset-y-20 left-0 w-1/3 z-20 cursor-w-resize"
                    onClick={handlePrev}
                    aria-label="Cerita sebelumnya"
                  />
                  <div
                    className="absolute inset-y-20 right-0 w-2/3 z-20 cursor-e-resize"
                    onClick={handleNext}
                    aria-label="Cerita selanjutnya"
                  />

                  {/* TOP STORY INDICATORS */}
                  <div className="relative z-30 pt-4 px-4 space-y-3 pointer-events-none">
                    <div className="flex gap-1.5">
                      {stories.map((s, idx) => {
                        let width = '0%';
                        if (idx < activeStoryIndex) width = '100%';
                        if (idx === activeStoryIndex) width = `${progress}%`;
                        return (
                          <div key={s.id} className="flex-1 h-[3px] rounded-full bg-white/25 overflow-hidden">
                            <div
                              className="h-full bg-white rounded-full transition-all duration-75 ease-linear"
                              style={{ width }}
                            />
                          </div>
                        );
                      })}
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="relative w-9 h-9 rounded-full bg-gradient-to-tr from-orange-500 to-amber-500 border border-amber-200 flex items-center justify-center text-xs text-white font-black shadow-md overflow-hidden">
                          {currentStory.user?.image ? (
                            <Image
                              src={currentStory.user.image}
                              alt={currentStory.user.name || 'Creator'}
                              fill
                              sizes="36px"
                              className="object-cover"
                            />
                          ) : isOfficialStory ? (
                            <Sparkles className="w-4 h-4" />
                          ) : (
                            <span>{(currentStory.user?.name || 'A')[0]?.toUpperCase()}</span>
                          )}
                        </div>
                        <div className="flex flex-col text-left">
                          <span className="text-xs font-black text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)] flex items-center gap-1">
                            {isOfficialStory
                              ? 'Arum Seduh Official'
                              : currentStory.user?.name || 'Pelanggan Arum Seduh'}
                            {isOfficialStory && (
                              <CheckCircle2 className="w-3.5 h-3.5 text-amber-400 fill-amber-400/20" />
                            )}
                          </span>
                          <span className="text-[9px] font-bold text-amber-200/90 drop-shadow-[0_1px_1px_rgba(0,0,0,0.8)] uppercase tracking-wider">
                            {formatRelativeTime(currentStory.createdAt)} • Aktif {getRemainingDays(currentStory.expiresAt)} Hari Lagi
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 pointer-events-auto">
                        {currentStory.mediaType === 'VIDEO' && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setIsMuted((prev) => !prev);
                            }}
                            aria-label={isMuted ? 'Nyalakan suara' : 'Bisukan suara'}
                            className="w-9 h-9 rounded-full bg-black/40 backdrop-blur-md text-white flex items-center justify-center hover:bg-black/60 transition-colors cursor-pointer border border-white/15"
                          >
                            {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setIsPaused((prev) => !prev);
                          }}
                          aria-label={isPaused ? 'Lanjutkan story' : 'Jeda story'}
                          className="w-9 h-9 rounded-full bg-black/40 backdrop-blur-md text-white flex items-center justify-center hover:bg-black/60 transition-colors cursor-pointer border border-white/15"
                        >
                          {isPaused ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
                        </button>

                        {canDeleteCurrentStory && (
                          <button
                            type="button"
                            onClick={(e) => handleDeleteStory(currentStory, e)}
                            disabled={deletingStoryId === currentStory.id}
                            aria-label="Hapus story"
                            className="w-9 h-9 rounded-full bg-red-500/30 backdrop-blur-md text-red-200 flex items-center justify-center hover:bg-red-500/60 transition-colors cursor-pointer border border-red-400/30"
                          >
                            {deletingStoryId === currentStory.id ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <Trash2 className="w-4 h-4" />
                            )}
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setShowLikersModal(false);
                            setActiveStoryIndex(null);
                          }}
                          aria-label="Tutup story"
                          className="w-9 h-9 rounded-full bg-black/40 backdrop-blur-md text-white flex items-center justify-center hover:bg-black/60 transition-colors cursor-pointer border border-white/15"
                        >
                          <X className="w-4.5 h-4.5" />
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* BOTTOM CONTENT INFO, LIKE ACTION & LIKERS LIST */}
                  <div className="relative z-30 pb-6 px-5 space-y-3.5 pointer-events-none">
                    <div className="text-left space-y-1">
                      <h4 className="font-serif font-black text-lg text-white leading-snug drop-shadow-[0_1.5px_4px_rgba(0,0,0,0.8)]">
                        {currentStory.title}
                      </h4>
                      <p className="text-[10px] text-amber-200 font-black uppercase tracking-widest drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)] flex items-center gap-1.5">
                        <Sparkles className="w-3 h-3 text-amber-300" />
                        <span>{isOfficialStory ? 'Official Promo / Story' : 'Cerita Komunitas Arum Seduh'}</span>
                      </p>
                    </div>

                    <div className="flex items-center justify-between gap-3 pointer-events-auto bg-black/45 backdrop-blur-md border border-white/15 rounded-2xl px-3.5 py-2.5">
                      <button
                        type="button"
                        onClick={() => setShowLikersModal(true)}
                        className="flex items-center gap-2 text-left flex-1 min-w-0 cursor-pointer group"
                      >
                        {currentLikes.length > 0 ? (
                          <>
                            <div className="flex -space-x-2 overflow-hidden shrink-0">
                              {currentLikes.slice(0, 3).map((likeItem) => (
                                <div
                                  key={likeItem.id}
                                  className="relative inline-block w-6 h-6 rounded-full ring-2 ring-stone-900 bg-gradient-to-tr from-orange-500 to-amber-500 text-white text-[9px] font-black flex items-center justify-center overflow-hidden"
                                >
                                  {likeItem.user?.image ? (
                                    <Image
                                      src={likeItem.user.image}
                                      alt={likeItem.user.name || 'User'}
                                      fill
                                      sizes="24px"
                                      className="object-cover"
                                    />
                                  ) : (
                                    <span>{(likeItem.user?.name || 'U')[0]?.toUpperCase()}</span>
                                  )}
                                </div>
                              ))}
                            </div>
                            <div className="truncate">
                              <p className="text-[11px] font-bold text-white truncate group-hover:text-amber-300 transition-colors">
                                Disukai oleh{' '}
                                <span className="font-black text-amber-300">
                                  {currentLikes[0]?.user?.name || 'Pelanggan'}
                                </span>
                                {currentLikes.length > 1 && ` dan ${currentLikes.length - 1} lainnya`}
                              </p>
                              <p className="text-[9px] text-gray-300 font-medium">
                                Ketuk untuk lihat siapa saja yang menyukai
                              </p>
                            </div>
                          </>
                        ) : (
                          <div className="flex items-center gap-2 text-gray-300">
                            <Users className="w-4 h-4 text-amber-300 shrink-0" />
                            <span className="text-[11px] font-semibold">
                              Jadilah yang pertama menyukai cerita ini
                            </span>
                          </div>
                        )}
                      </button>

                      <motion.button
                        type="button"
                        whileTap={{ scale: 0.9 }}
                        onClick={(e) => handleToggleLike(currentStory, e)}
                        className={`px-3.5 py-2 rounded-xl font-black text-xs flex items-center gap-1.5 transition-all cursor-pointer border ${
                          isLikedByMe
                            ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white border-amber-300 shadow-lg shadow-orange-500/30'
                            : 'bg-white/10 hover:bg-white/20 text-white border-white/20'
                        }`}
                      >
                        <Heart className={`w-4 h-4 ${isLikedByMe ? 'fill-white text-white' : ''}`} />
                        <span>{currentLikes.length}</span>
                      </motion.button>
                    </div>

                    {currentStory.linkUrl && (
                      <motion.button
                        type="button"
                        whileTap={{ scale: 0.98 }}
                        onClick={(e) => {
                          e.stopPropagation();
                          const url = currentStory.linkUrl;
                          if (url) {
                            setActiveStoryIndex(null);
                            window.location.href = url;
                          }
                        }}
                        className="pointer-events-auto w-full py-3.5 bg-gradient-to-tr from-amber-300 via-orange-400 to-amber-500 hover:shadow-lg text-[#2A1F16] text-[12.5px] font-black rounded-2xl shadow-xl flex items-center justify-center gap-2 cursor-pointer border border-amber-200/50 active:scale-95 transition-all"
                      >
                        <ShoppingBag className="w-4.5 h-4.5" />
                        <span>Lihat Menu / Pesan Sekarang</span>
                        <ChevronRight className="w-4 h-4" />
                      </motion.button>
                    )}
                  </div>

                  {/* DRAWER DAFTAR ORANG YANG MENYUKAI STORY */}
                  <AnimatePresence>
                    {showLikersModal && (
                      <motion.div
                        initial={{ y: '100%' }}
                        animate={{ y: 0 }}
                        exit={{ y: '100%' }}
                        transition={{ type: 'spring', damping: 26, stiffness: 280 }}
                        onClick={(e) => e.stopPropagation()}
                        className="absolute inset-x-0 bottom-0 z-50 max-h-[70%] bg-stone-900/98 backdrop-blur-xl border-t border-amber-500/30 rounded-t-3xl p-5 flex flex-col shadow-2xl"
                      >
                        <div className="flex items-center justify-between pb-3 mb-3 border-b border-white/10">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 flex items-center justify-center text-white">
                              <Heart className="w-4 h-4 fill-white" />
                            </div>
                            <div>
                              <h5 className="text-sm font-black text-white">
                                Disukai Oleh ({currentLikes.length})
                              </h5>
                              <p className="text-[10px] text-gray-400">
                                Daftar pengguna yang menyukai Story ini
                              </p>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => setShowLikersModal(false)}
                            className="w-8 h-8 rounded-full bg-white/10 text-white flex items-center justify-center hover:bg-white/20 cursor-pointer"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>

                        <div className="overflow-y-auto space-y-2.5 pr-1 flex-1">
                          {currentLikes.length === 0 ? (
                            <div className="py-10 text-center text-gray-400 text-xs">
                              Belum ada yang menyukai Story ini.
                            </div>
                          ) : (
                            currentLikes.map((like) => (
                              <div
                                key={like.id}
                                className="flex items-center justify-between bg-white/5 border border-white/10 rounded-2xl px-3.5 py-2.5"
                              >
                                <div className="flex items-center gap-3">
                                  <div className="relative w-9 h-9 rounded-full bg-gradient-to-tr from-orange-500 to-amber-500 text-white font-black text-xs flex items-center justify-center overflow-hidden">
                                    {like.user?.image ? (
                                      <Image
                                        src={like.user.image}
                                        alt={like.user.name || 'User'}
                                        fill
                                        sizes="36px"
                                        className="object-cover"
                                      />
                                    ) : (
                                      <span>{(like.user?.name || 'U')[0]?.toUpperCase()}</span>
                                    )}
                                  </div>
                                  <div>
                                    <p className="text-xs font-black text-white flex items-center gap-1.5">
                                      <span>{like.user?.name || 'Pelanggan Arum Seduh'}</span>
                                      {like.user?.role === 'ADMIN' && (
                                        <span className="px-1.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-400/30 text-[9px] font-bold">
                                          Admin
                                        </span>
                                      )}
                                    </p>
                                    <p className="text-[10px] text-gray-400">
                                      {formatRelativeTime(like.createdAt)}
                                    </p>
                                  </div>
                                </div>
                                <Heart className="w-4 h-4 text-orange-500 fill-orange-500 shrink-0" />
                              </div>
                            ))
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>,
          document.body
        )}

      {/* INSTAGRAM-STYLE FULL CAMERA STORY STUDIO OVERLAY (Portaled to document.body) */}
      {mounted &&
        createPortal(
          <AnimatePresence>
            {isCreateOpen && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[9999] flex items-center justify-center bg-black select-none"
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*,video/mp4,video/webm,video/quicktime"
                  onChange={handleFileChange}
                  className="hidden"
                />

                {/* 9:16 Full-Screen Instagram Camera & Preview Frame */}
                <motion.div
                  initial={{ scale: 0.96, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.96, opacity: 0 }}
                  className="relative w-full h-full md:h-[92vh] md:max-h-[840px] max-w-md md:rounded-3xl bg-stone-950 overflow-hidden flex flex-col justify-between shadow-2xl border-0 md:border md:border-white/15"
                >
                  {/* Shutter Flash Animation */}
                  <AnimatePresence>
                    {flashEffect && (
                      <motion.div
                        initial={{ opacity: 0.9 }}
                        animate={{ opacity: 0 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.18 }}
                        className="absolute inset-0 z-50 bg-white pointer-events-none"
                      />
                    )}
                  </AnimatePresence>

                  {/* VIEWPORT AREA: LIVE CAMERA (WIDE / NO-ZOOM DEFAULT) OR TEXT CANVAS OR CAPTURED PREVIEW */}
                  <div className="absolute inset-0 z-10 overflow-hidden flex items-center justify-center bg-stone-950">
                    {!previewUrl ? (
                      cameraMode === 'TEXT' ? (
                        <div
                          className={`w-full h-full bg-gradient-to-br ${TEXT_BG_THEMES[textBgIndex]} flex flex-col items-center justify-center p-8 text-center`}
                        >
                          <textarea
                            value={overlayText}
                            onChange={(e) => setOverlayText(e.target.value)}
                            placeholder="Ketik cerita atau momen Anda di sini..."
                            maxLength={140}
                            rows={4}
                            className="w-full bg-transparent text-white placeholder:text-white/60 font-serif font-black text-2xl sm:text-3xl text-center focus:outline-none resize-none drop-shadow-[0_2px_8px_rgba(0,0,0,0.4)]"
                          />
                        </div>
                      ) : (
                        <>
                          {/* Video Kamera dengan Rasio Natural (object-contain saat FIT agar tidak nge-zoom wajah) */}
                          <video
                            ref={liveVideoRef}
                            autoPlay
                            playsInline
                            muted
                            style={{
                              filter: activeFilter.css,
                              transform: `${facingMode === 'user' ? 'scaleX(-1)' : ''} scale(${zoomLevel})`.trim(),
                            }}
                            className={`w-full h-full transition-transform duration-200 ${
                              cameraFitMode === 'FIT' ? 'object-contain' : 'object-cover'
                            }`}
                          />

                          {/* Fallback jika kamera belum diizinkan / tidak ada */}
                          {cameraError && (
                            <div className="absolute inset-0 bg-gradient-to-b from-stone-900 via-stone-950 to-black flex flex-col items-center justify-center p-8 text-center space-y-4">
                              <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-orange-500 to-amber-500 text-white flex items-center justify-center shadow-xl shadow-orange-500/25">
                                <Camera className="w-8 h-8" />
                              </div>
                              <p className="text-xs font-bold text-gray-200 max-w-xs leading-relaxed">
                                {cameraError}
                              </p>
                              <div className="flex flex-wrap items-center justify-center gap-2.5 pt-1">
                                <button
                                  type="button"
                                  onClick={startCameraStream}
                                  className="px-4 py-2 rounded-full bg-white/15 hover:bg-white/25 text-white text-xs font-black flex items-center gap-1.5 border border-white/20 cursor-pointer"
                                >
                                  <RefreshCw className="w-3.5 h-3.5" />
                                  <span>Aktifkan Kamera</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => fileInputRef.current?.click()}
                                  className="px-4 py-2 rounded-full bg-gradient-to-r from-orange-500 to-amber-500 text-white text-xs font-black flex items-center gap-1.5 shadow-lg cursor-pointer"
                                >
                                  <ImageIcon className="w-3.5 h-3.5" />
                                  <span>Buka Galeri</span>
                                </button>
                              </div>
                            </div>
                          )}
                        </>
                      )
                    ) : mediaType === 'VIDEO' ? (
                      <video
                        src={previewUrl}
                        autoPlay
                        loop
                        playsInline
                        className="w-full h-full object-contain"
                      />
                    ) : (
                      <Image
                        src={previewUrl}
                        alt="Story Preview"
                        fill
                        className="object-contain"
                      />
                    )}

                    {/* Floating Text Sticker Overlay (IG-style) */}
                    {cameraMode !== 'TEXT' && (showTextOverlayInput || overlayText) && (
                      <div className="absolute inset-x-6 top-1/2 -translate-y-1/2 z-30 flex flex-col items-center">
                        {showTextOverlayInput ? (
                          <div className="w-full bg-black/75 backdrop-blur-md border border-amber-400/50 rounded-2xl p-3 flex items-center gap-2">
                            <input
                              type="text"
                              autoFocus
                              value={overlayText}
                              onChange={(e) => setOverlayText(e.target.value)}
                              placeholder="Tulis teks di atas Story..."
                              maxLength={80}
                              className="flex-1 bg-transparent text-white text-sm font-black text-center focus:outline-none"
                            />
                            <button
                              type="button"
                              onClick={() => setShowTextOverlayInput(false)}
                              className="px-3 py-1 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 text-white text-xs font-black cursor-pointer"
                            >
                              Selesai
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setShowTextOverlayInput(true)}
                            className="px-4 py-2 rounded-2xl bg-black/65 backdrop-blur-md text-white font-black text-sm shadow-lg border border-white/15 cursor-pointer"
                          >
                            {overlayText}
                          </button>
                        )}
                      </div>
                    )}

                    <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-transparent to-black/80 pointer-events-none" />
                  </div>

                  {/* TOP CAMERA CONTROLS BAR */}
                  <div className="relative z-30 pt-4 px-4 flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => {
                        stopCameraStream();
                        setIsCreateOpen(false);
                      }}
                      disabled={submitting}
                      aria-label="Tutup kamera story"
                      className="w-10 h-10 rounded-full bg-black/45 backdrop-blur-md text-white flex items-center justify-center hover:bg-black/65 border border-white/15 cursor-pointer"
                    >
                      <X className="w-5 h-5" />
                    </button>

                    {/* Recording Timer or 20-Day Badge */}
                    {isRecording ? (
                      <div className="px-3.5 py-1.5 rounded-full bg-red-600/90 backdrop-blur-md text-white text-xs font-black flex items-center gap-2 shadow-lg animate-pulse">
                        <span className="w-2 h-2 rounded-full bg-white" />
                        <span>00:{String(recordingSeconds).padStart(2, '0')} / 00:20</span>
                      </div>
                    ) : compressionStats ? (
                      <div className="px-3 py-1 rounded-full bg-black/55 backdrop-blur-md border border-amber-400/40 text-amber-300 text-[10px] font-black flex items-center gap-1.5">
                        <Zap className="w-3 h-3 text-orange-400" />
                        <span>
                          {compressionStats.format} • {formatBytes(compressionStats.compressedSize)}
                        </span>
                      </div>
                    ) : (
                      <div className="px-3 py-1 rounded-full bg-black/45 backdrop-blur-md border border-white/15 text-amber-200 text-[10px] font-black flex items-center gap-1.5">
                        <Sparkles className="w-3 h-3 text-orange-400" />
                        <span>Arum Story • Tayang 20 Hari</span>
                      </div>
                    )}

                    {!previewUrl ? (
                      cameraMode === 'TEXT' ? (
                        <button
                          type="button"
                          onClick={() => setTextBgIndex((prev) => (prev + 1) % TEXT_BG_THEMES.length)}
                          className="w-10 h-10 rounded-full bg-black/45 backdrop-blur-md text-white flex items-center justify-center hover:bg-black/65 border border-white/15 cursor-pointer"
                          title="Ganti Warna Latar"
                        >
                          <Palette className="w-5 h-5" />
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() =>
                            setFacingMode((prev) => (prev === 'user' ? 'environment' : 'user'))
                          }
                          aria-label="Putar kamera"
                          className="w-10 h-10 rounded-full bg-black/45 backdrop-blur-md text-white flex items-center justify-center hover:bg-black/65 border border-white/15 cursor-pointer"
                        >
                          <RefreshCw className="w-5 h-5" />
                        </button>
                      )
                    ) : (
                      <button
                        type="button"
                        onClick={handleRetake}
                        disabled={submitting}
                        title="Ambil Ulang"
                        className="w-10 h-10 rounded-full bg-black/45 backdrop-blur-md text-white flex items-center justify-center hover:bg-black/65 border border-white/15 cursor-pointer"
                      >
                        <RotateCcw className="w-5 h-5" />
                      </button>
                    )}
                  </div>

                  {/* RIGHT FLOATING IG TOOLS RAIL (Text, Filter, & Wide/Full Rasio Toggle) */}
                  {!isRecording && (
                    <div className="relative z-30 self-end pr-4 flex flex-col gap-3">
                      {cameraMode !== 'TEXT' && (
                        <button
                          type="button"
                          onClick={() => setShowTextOverlayInput((prev) => !prev)}
                          className="w-10 h-10 rounded-full bg-black/45 backdrop-blur-md text-white flex items-center justify-center hover:bg-black/70 border border-white/20 cursor-pointer shadow-lg"
                          title="Tambah Teks (Aa)"
                        >
                          <Type className="w-5 h-5" />
                        </button>
                      )}

                      {!previewUrl && cameraMode !== 'TEXT' && (
                        <>
                          <button
                            type="button"
                            onClick={() =>
                              setActiveFilterIndex((prev) => (prev + 1) % CAMERA_FILTERS.length)
                            }
                            className="w-10 h-10 rounded-full bg-black/45 backdrop-blur-md text-amber-300 flex items-center justify-center hover:bg-black/70 border border-amber-300/30 cursor-pointer shadow-lg"
                            title={`Filter: ${activeFilter.name}`}
                          >
                            <Sparkles className="w-5 h-5" />
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              setCameraFitMode((prev) => (prev === 'FIT' ? 'COVER' : 'FIT'))
                            }
                            className="w-10 h-10 rounded-full bg-black/45 backdrop-blur-md text-white flex items-center justify-center hover:bg-black/70 border border-white/20 cursor-pointer shadow-lg"
                            title={cameraFitMode === 'FIT' ? 'Mode Layar Penuh' : 'Mode Sudut Lebar (Wide)'}
                          >
                            {cameraFitMode === 'FIT' ? (
                              <Maximize2 className="w-4.5 h-4.5" />
                            ) : (
                              <Minimize2 className="w-4.5 h-4.5" />
                            )}
                          </button>
                        </>
                      )}
                    </div>
                  )}

                  {/* BOTTOM CAMERA SHUTTER DOCK OR PREVIEW SHARE BAR */}
                  <div className="relative z-30 pb-6 px-5 space-y-3.5">
                    {compressing && (
                      <div className="bg-black/70 backdrop-blur-md border border-orange-400/40 rounded-2xl p-3 text-xs font-bold text-amber-200 flex items-center justify-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin text-orange-400" />
                        <span>Mengompresi media ({compressionProgress}%)...</span>
                      </div>
                    )}

                    {!previewUrl ? (
                      <>
                        {/* Zoom & Angle Pills (Wide Fit 1x / Full 1x / 1.5x) */}
                        {cameraMode !== 'TEXT' && (
                          <div className="flex items-center justify-center gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                setCameraFitMode('FIT');
                                setZoomLevel(1);
                              }}
                              className={`px-2.5 py-1 rounded-full text-[10px] font-black transition-all cursor-pointer border ${
                                cameraFitMode === 'FIT' && zoomLevel === 1
                                  ? 'bg-amber-400 text-stone-950 border-amber-300 shadow'
                                  : 'bg-black/50 text-white border-white/15'
                              }`}
                            >
                              Wide (Utuh)
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setCameraFitMode('COVER');
                                setZoomLevel(1);
                              }}
                              className={`px-2.5 py-1 rounded-full text-[10px] font-black transition-all cursor-pointer border ${
                                cameraFitMode === 'COVER' && zoomLevel === 1
                                  ? 'bg-amber-400 text-stone-950 border-amber-300 shadow'
                                  : 'bg-black/50 text-white border-white/15'
                              }`}
                            >
                              1x Full
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setCameraFitMode('COVER');
                                setZoomLevel(1.4);
                              }}
                              className={`px-2.5 py-1 rounded-full text-[10px] font-black transition-all cursor-pointer border ${
                                zoomLevel === 1.4
                                  ? 'bg-amber-400 text-stone-950 border-amber-300 shadow'
                                  : 'bg-black/50 text-white border-white/15'
                              }`}
                            >
                              1.4x
                            </button>
                          </div>
                        )}

                        {/* Shutter Row: Gallery (Left) — Big IG Shutter (Center) — Flip Camera (Right) */}
                        <div className="flex items-center justify-between px-4">
                          {/* Tombol Galeri Pojok Kiri Bawah */}
                          <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            disabled={isRecording || compressing}
                            className="w-12 h-12 rounded-2xl bg-white/15 hover:bg-white/25 backdrop-blur-md border-2 border-white/30 text-white flex flex-col items-center justify-center gap-0.5 cursor-pointer transition-all active:scale-95"
                            title="Pilih dari Galeri"
                          >
                            <ImageIcon className="w-5 h-5" />
                            <span className="text-[8px] font-black uppercase">Galeri</span>
                          </button>

                          {/* TOMBOL SHUTTER UTAMA ALA INSTAGRAM */}
                          {cameraMode === 'PHOTO' && (
                            <button
                              type="button"
                              onClick={
                                cameraReady
                                  ? handleCapturePhoto
                                  : () => fileInputRef.current?.click()
                              }
                              aria-label="Ambil Foto"
                              className="w-20 h-20 rounded-full p-1.5 border-4 border-amber-400 flex items-center justify-center shadow-[0_0_25px_rgba(249,115,22,0.5)] active:scale-90 transition-transform cursor-pointer"
                            >
                              <div className="w-full h-full rounded-full bg-white hover:bg-amber-50 transition-colors" />
                            </button>
                          )}

                          {cameraMode === 'VIDEO' && (
                            <button
                              type="button"
                              onClick={
                                cameraReady
                                  ? handleToggleVideoRecording
                                  : () => fileInputRef.current?.click()
                              }
                              aria-label={isRecording ? 'Hentikan Rekaman' : 'Rekam Video'}
                              className={`w-20 h-20 rounded-full p-1.5 border-4 ${
                                isRecording
                                  ? 'border-red-500 animate-pulse'
                                  : 'border-orange-500'
                              } flex items-center justify-center shadow-[0_0_25px_rgba(249,115,22,0.5)] active:scale-90 transition-transform cursor-pointer`}
                            >
                              <div
                                className={`transition-all duration-200 ${
                                  isRecording
                                    ? 'w-8 h-8 rounded-lg bg-red-500'
                                    : 'w-full h-full rounded-full bg-gradient-to-tr from-orange-600 to-amber-500'
                                }`}
                              />
                            </button>
                          )}

                          {cameraMode === 'TEXT' && (
                            <button
                              type="button"
                              onClick={handleCaptureTextStory}
                              aria-label="Buat Story Teks"
                              className="w-20 h-20 rounded-full p-1.5 border-4 border-amber-300 flex items-center justify-center shadow-[0_0_25px_rgba(249,115,22,0.5)] active:scale-90 transition-transform cursor-pointer"
                            >
                              <div className="w-full h-full rounded-full bg-gradient-to-tr from-orange-500 to-amber-400 text-white flex items-center justify-center">
                                <CheckCircle2 className="w-8 h-8" />
                              </div>
                            </button>
                          )}

                          {/* Tombol Flip Kamera Pojok Kanan Bawah */}
                          <button
                            type="button"
                            onClick={() =>
                              cameraMode === 'TEXT'
                                ? setTextBgIndex((prev) => (prev + 1) % TEXT_BG_THEMES.length)
                                : setFacingMode((prev) => (prev === 'user' ? 'environment' : 'user'))
                            }
                            disabled={isRecording}
                            className="w-12 h-12 rounded-2xl bg-white/15 hover:bg-white/25 backdrop-blur-md border-2 border-white/30 text-white flex flex-col items-center justify-center gap-0.5 cursor-pointer transition-all active:scale-95"
                          >
                            <RefreshCw className="w-5 h-5" />
                            <span className="text-[8px] font-black uppercase">
                              {cameraMode === 'TEXT' ? 'Warna' : 'Putar'}
                            </span>
                          </button>
                        </div>

                        {/* Mode Selector Pills (FOTO • VIDEO • CERITA TEKS) */}
                        <div className="flex items-center justify-center gap-2 pt-1">
                          {[
                            { id: 'PHOTO', label: 'FOTO', icon: Camera },
                            { id: 'VIDEO', label: 'VIDEO', icon: Video },
                            { id: 'TEXT', label: 'TEKS', icon: Type },
                          ].map((mode) => {
                            const Icon = mode.icon;
                            const active = cameraMode === mode.id;
                            return (
                              <button
                                key={mode.id}
                                type="button"
                                disabled={isRecording}
                                onClick={() => setCameraMode(mode.id as any)}
                                className={`px-4 py-1.5 rounded-full text-[11px] font-black tracking-wider flex items-center gap-1.5 transition-all cursor-pointer ${
                                  active
                                    ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-lg'
                                    : 'bg-white/10 text-gray-300 hover:bg-white/20'
                                }`}
                              >
                                <Icon className="w-3.5 h-3.5" />
                                <span>{mode.label}</span>
                              </button>
                            );
                          })}
                        </div>
                      </>
                    ) : (
                      /* LAYAR PREVIEW SIAP BAGIKAN ALA INSTAGRAM STORY */
                      <div className="space-y-3">
                        <div className="bg-black/55 backdrop-blur-md border border-white/20 rounded-2xl px-4 py-2.5 flex items-center gap-2">
                          <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
                          <input
                            type="text"
                            value={storyTitle}
                            onChange={(e) => setStoryTitle(e.target.value)}
                            placeholder="Tambahkan caption cerita Anda..."
                            maxLength={140}
                            className="w-full bg-transparent text-white placeholder:text-gray-300 text-xs font-semibold focus:outline-none"
                          />
                        </div>

                        <div className="flex items-center gap-2.5">
                          <button
                            type="button"
                            onClick={handleRetake}
                            disabled={submitting}
                            className="px-4 py-3.5 rounded-2xl bg-white/15 hover:bg-white/25 backdrop-blur-md text-white text-xs font-black flex items-center justify-center gap-1.5 border border-white/20 cursor-pointer"
                          >
                            <RotateCcw className="w-4 h-4" />
                            <span>Ulangi</span>
                          </button>

                          <button
                            type="button"
                            onClick={handleCreateStorySubmit}
                            disabled={submitting || compressing}
                            className="flex-1 py-3.5 rounded-2xl bg-gradient-to-r from-orange-500 to-amber-500 text-white text-xs font-black shadow-xl shadow-orange-500/30 flex items-center justify-center gap-2 cursor-pointer active:scale-98 transition-all disabled:opacity-50"
                          >
                            {submitting ? (
                              <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                <span>Membagikan Story...</span>
                              </>
                            ) : (
                              <>
                                <Send className="w-4 h-4" />
                                <span>Bagikan ke Story (20 Hari)</span>
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>,
          document.body
        )}
    </>
  );
}
