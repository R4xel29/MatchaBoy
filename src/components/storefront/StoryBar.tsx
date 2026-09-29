'use client';

import { useState, useEffect, useRef } from 'react';
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
  Upload,
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

  // Playback & interaction states
  const [isPaused, setIsPaused] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [showLikersModal, setShowLikersModal] = useState(false);
  const [likingStoryId, setLikingStoryId] = useState<string | null>(null);
  const [deletingStoryId, setDeletingStoryId] = useState<string | null>(null);

  // Create Story Modal states
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [storyTitle, setStoryTitle] = useState('');
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploadedMediaUrl, setUploadedMediaUrl] = useState<string | null>(null);
  const [mediaType, setMediaType] = useState<'IMAGE' | 'VIDEO'>('IMAGE');
  const [mediaDuration, setMediaDuration] = useState<number>(5000);
  const [compressing, setCompressing] = useState(false);
  const [compressionProgress, setCompressionProgress] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [compressionStats, setCompressionStats] = useState<{
    originalSize: number;
    compressedSize: number;
    format: string;
  } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoPlayerRef = useRef<HTMLVideoElement>(null);

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

  // Lock body scroll & handle keyboard navigation while story modal or create modal is active
  useEffect(() => {
    if (activeStoryIndex === null && !isCreateOpen) return;

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (e: KeyboardEvent) => {
      if (isCreateOpen) {
        if (e.key === 'Escape') setIsCreateOpen(false);
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
  }, [activeStoryIndex, stories.length, isCreateOpen, showLikersModal]);

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

    // Optimistic update
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
      // Revert optimistic update
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
    setPreviewUrl(null);
    setUploadedMediaUrl(null);
    setCompressionStats(null);
    setMediaType('IMAGE');
    setMediaDuration(5000);
    setIsCreateOpen(true);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawFile = e.target.files?.[0];
    if (!rawFile) return;

    setCompressing(true);
    setCompressionProgress(5);
    setCompressionStats(null);

    try {
      // 1. Kompresi media di sisi klien (Gambar -> WebP, Video -> Kompresi MP4/WebM)
      const compressed = await compressStoryMedia(rawFile, (pct) => {
        setCompressionProgress(pct);
      });

      const localPreview = URL.createObjectURL(compressed.file);
      setPreviewUrl(localPreview);
      setMediaType(compressed.mediaType);
      setMediaDuration(compressed.durationMs);
      setCompressionStats({
        originalSize: compressed.originalSize,
        compressedSize: compressed.compressedSize,
        format: compressed.format.toUpperCase(),
      });
      setCompressing(false);

      // 2. Unggah ke server (Server juga memastikan gambar dikonversi ke WebP via Sharp)
      setUploading(true);
      const formData = new FormData();
      formData.append('file', compressed.file);

      const res = await fetch('/api/stories/upload', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();

      if (!res.ok || !data.url) {
        throw new Error(data.error || 'Gagal mengunggah media');
      }

      setUploadedMediaUrl(data.url);
      setMediaType(data.mediaType || compressed.mediaType);
      if (data.compressedSize) {
        setCompressionStats({
          originalSize: compressed.originalSize,
          compressedSize: data.compressedSize,
          format: (data.format || compressed.format).toUpperCase(),
        });
      }
      showToast(
        compressed.mediaType === 'IMAGE'
          ? 'Gambar berhasil dikompresi ke format WebP!'
          : 'Video berhasil dikompresi & siap dibagikan!',
        'success'
      );
    } catch (err: any) {
      console.error(err);
      showToast(err.message || 'Gagal memproses media Story', 'error');
      setPreviewUrl(null);
      setUploadedMediaUrl(null);
    } finally {
      setCompressing(false);
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleCreateStorySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadedMediaUrl) {
      showToast('Silakan pilih foto atau video terlebih dahulu.', 'error');
      return;
    }
    if (!storyTitle.trim()) {
      showToast('Silakan tulis cerita atau caption singkat Anda.', 'error');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/stories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: storyTitle.trim(),
          mediaUrl: uploadedMediaUrl,
          mediaType,
          duration: mediaDuration,
          daysActive: 20, // Tersimpan selama 20 hari
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Gagal membagikan Story');
      }

      setStories((prev) => [data.story, ...prev]);
      setIsCreateOpen(false);
      showToast('Story Anda berhasil dibagikan untuk 20 hari ke depan!', 'success');
      setActiveStoryIndex(0);
      setProgress(0);
    } catch (err: any) {
      showToast(err.message || 'Gagal membuat Story', 'error');
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
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-gradient-to-r from-orange-500 to-amber-500 text-white text-[10px] font-black shadow-sm hover:shadow transition-all active:scale-95 cursor-pointer"
          >
            <Plus className="w-3 h-3" />
            <span>Buat Story</span>
          </button>
        </div>

        {/* Stories Horizontal Scroll */}
        <div className="flex gap-4 overflow-x-auto scrollbar-hide pb-0.5 pt-0.5">
          {/* Tombol Tambah Story Pengguna */}
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
                    className="object-cover opacity-85"
                  />
                ) : (
                  <Plus className="w-6 h-6 text-orange-600" />
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

                  {/* Indikator Video atau Jumlah Like */}
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

      {/* FULL SCREEN INTERACTIVE STORIES OVERLAY (Portaled to document.body to escape parent stacking contexts) */}
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
                {/* Story Visual Frame */}
                <motion.div
                  initial={{ scale: 0.96, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.96, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  onClick={(e) => e.stopPropagation()}
                  className="relative w-full h-full md:h-[90vh] md:max-h-[820px] max-w-md md:rounded-3xl bg-stone-900 overflow-hidden flex flex-col justify-between shadow-2xl border-0 md:border md:border-white/10"
                >
                  {/* Story Media (Image WebP or Compressed Video) */}
                  <div className="absolute inset-0 z-10">
                    {currentStory.mediaType === 'VIDEO' ? (
                      <video
                        ref={videoPlayerRef}
                        key={currentStory.id}
                        src={currentStory.mediaUrl}
                        autoPlay
                        playsInline
                        muted={isMuted}
                        onEnded={handleNext}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <Image
                        src={currentStory.mediaUrl}
                        alt={currentStory.title}
                        fill
                        priority
                        className="object-cover"
                        sizes="(max-width: 768px) 100vw, 450px"
                      />
                    )}

                    {/* Ambient Shadow gradient at top and bottom */}
                    <div className="absolute inset-0 bg-gradient-to-b from-black/75 via-transparent to-black/90 pointer-events-none" />
                  </div>

                  {/* Left/Right click trigger areas inside the story frame */}
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

                  {/* TOP STORY INDICATORS (Progress Bars) */}
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

                    {/* STORY CREATOR INFO & CONTROLS */}
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

                  {/* BOTTOM CONTENT INFO, LIKE ACTION & LIKERS LIST, AND CALL TO ACTION */}
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

                    {/* BARIS INTERAKSI LIKE & DAFTAR SIAPA SAJA YANG LIKE */}
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

                    {/* Call To Action Button (Direct menu redirection) */}
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

                  {/* DRAWER / MODAL DAFTAR ORANG YANG MENYUKAI STORY */}
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

      {/* MODAL BUAT STORY BARU OLEH USER (Portaled to document.body) */}
      {mounted &&
        createPortal(
          <AnimatePresence>
            {isCreateOpen && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
                onClick={() => !uploading && !submitting && setIsCreateOpen(false)}
              >
                <motion.div
                  initial={{ scale: 0.95, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.95, opacity: 0 }}
                  onClick={(e) => e.stopPropagation()}
                  className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-amber-100 overflow-hidden"
                >
                  <div className="flex items-center justify-between px-5 py-4 bg-gradient-to-r from-orange-500 to-amber-500 text-white">
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-5 h-5" />
                      <div>
                        <h3 className="text-sm font-black">Buat Story Arum Seduh</h3>
                        <p className="text-[10px] text-amber-100 font-semibold">
                          Tampil di Beranda semua pengguna selama 20 hari
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsCreateOpen(false)}
                      className="w-8 h-8 rounded-full bg-white/20 text-white flex items-center justify-center hover:bg-white/30 cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <form onSubmit={handleCreateStorySubmit} className="p-5 space-y-4">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*,video/mp4,video/webm,video/quicktime"
                      onChange={handleFileChange}
                      className="hidden"
                    />

                    {/* Area Upload / Preview Media */}
                    {!previewUrl ? (
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={compressing || uploading}
                        className="w-full h-56 rounded-2xl border-2 border-dashed border-amber-300 bg-orange-50/40 hover:bg-orange-50/80 transition-all flex flex-col items-center justify-center gap-2.5 p-4 cursor-pointer"
                      >
                        <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-orange-500 to-amber-500 text-white flex items-center justify-center shadow-md">
                          <Upload className="w-6 h-6" />
                        </div>
                        <div className="text-center">
                          <p className="text-xs font-black text-gray-900">
                            Pilih Foto atau Video Story
                          </p>
                          <p className="text-[11px] text-gray-500 mt-0.5">
                            Foto otomatis diubah ke WebP & video dikompresi hemat kuota
                          </p>
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-white border border-amber-200 text-[10px] font-bold text-orange-600">
                            <ImageIcon className="w-3 h-3" /> Foto (Auto WebP)
                          </span>
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-white border border-amber-200 text-[10px] font-bold text-amber-700">
                            <Video className="w-3 h-3" /> Video (Auto Compress)
                          </span>
                        </div>
                      </button>
                    ) : (
                      <div className="relative w-full h-64 rounded-2xl overflow-hidden bg-stone-900 border border-amber-200">
                        {mediaType === 'VIDEO' ? (
                          <video
                            src={previewUrl}
                            controls
                            playsInline
                            className="w-full h-full object-contain"
                          />
                        ) : (
                          <Image
                            src={previewUrl}
                            alt="Preview Story"
                            fill
                            className="object-cover"
                          />
                        )}
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          disabled={compressing || uploading}
                          className="absolute top-3 right-3 px-3 py-1.5 rounded-xl bg-black/60 backdrop-blur-md text-white text-[11px] font-bold hover:bg-black/80 cursor-pointer border border-white/20"
                        >
                          Ganti Media
                        </button>
                      </div>
                    )}

                    {/* Status Kompresi & Konversi WebP */}
                    {(compressing || uploading) && (
                      <div className="bg-orange-50 border border-orange-200 rounded-2xl p-3 space-y-1.5">
                        <div className="flex items-center justify-between text-xs font-bold text-orange-700">
                          <span className="flex items-center gap-1.5">
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            {compressing
                              ? `Mengompresi media (${compressionProgress}%)...`
                              : 'Mengunggah media terkompresi...'}
                          </span>
                          <span>{compressing ? `${compressionProgress}%` : ''}</span>
                        </div>
                        <div className="w-full h-1.5 rounded-full bg-orange-200 overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-orange-500 to-amber-500 transition-all duration-200"
                            style={{ width: `${compressing ? compressionProgress : 100}%` }}
                          />
                        </div>
                      </div>
                    )}

                    {compressionStats && !compressing && !uploading && (
                      <div className="flex items-center justify-between px-3.5 py-2 rounded-xl bg-amber-50 border border-amber-200/80 text-[11px] font-bold text-amber-900">
                        <span className="flex items-center gap-1.5">
                          <CheckCircle2 className="w-3.5 h-3.5 text-orange-600" />
                          <span>
                            Teroptimasi ke {compressionStats.format}
                          </span>
                        </span>
                        <span className="text-orange-600 font-black">
                          {formatBytes(compressionStats.originalSize)} → {formatBytes(compressionStats.compressedSize)}
                        </span>
                      </div>
                    )}

                    {/* Input Judul / Caption Story */}
                    <div>
                      <label className="block text-xs font-black text-gray-800 mb-1.5">
                        Caption / Cerita Singkat
                      </label>
                      <input
                        type="text"
                        value={storyTitle}
                        onChange={(e) => setStoryTitle(e.target.value)}
                        placeholder="Contoh: Segarnya seduhan sore ini di Arum Seduh!"
                        maxLength={140}
                        required
                        className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-xs font-semibold text-gray-900 focus:outline-none focus:ring-2 focus:ring-orange-500"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={compressing || uploading || submitting || !uploadedMediaUrl}
                      className="w-full py-3 rounded-2xl bg-gradient-to-r from-orange-500 to-amber-500 text-white text-xs font-black shadow-lg shadow-orange-500/25 hover:opacity-95 disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer transition-all"
                    >
                      {submitting ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Membagikan Story...</span>
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-4 h-4" />
                          <span>Bagikan Story (Aktif 20 Hari)</span>
                        </>
                      )}
                    </button>
                  </form>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>,
          document.body
        )}
    </>
  );
}
