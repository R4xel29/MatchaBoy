'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronRight, Sparkles, ShoppingBag } from 'lucide-react';
import Image from 'next/image';

interface Story {
  id: string;
  title: string;
  mediaUrl: string;
  mediaType: string;
  linkUrl?: string | null;
  isActive: boolean;
  duration: number;
}

export function StoryBar() {
  const [stories, setStories] = useState<Story[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeStoryIndex, setActiveStoryIndex] = useState<number | null>(null);
  const [progress, setProgress] = useState(0);
  const [viewedStories, setViewedStories] = useState<Set<string>>(new Set());
  const [mounted, setMounted] = useState(false);

  // Ensure portal only mounts on client
  useEffect(() => {
    setMounted(true);
  }, []);

  // Load viewed stories from localStorage
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

  // Lock body scroll & handle keyboard navigation while story modal is active
  useEffect(() => {
    if (activeStoryIndex === null) return;

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (e: KeyboardEvent) => {
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
  }, [activeStoryIndex, stories.length]);

  // Save viewed stories to localStorage
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

  useEffect(() => {
    fetch('/api/stories')
      .then((res) => res.json())
      .then((data) => {
        if (data?.success && data.stories) {
          setStories(data.stories);
        }
      })
      .catch((err) => console.error('Error fetching stories:', err))
      .finally(() => setLoading(false));
  }, []);

  // Story Autoplay & Progress Bar Timer
  useEffect(() => {
    if (activeStoryIndex === null || stories.length === 0) {
      setProgress(0);
      return;
    }

    const currentStory = stories[activeStoryIndex];
    markStoryAsViewed(currentStory.id);

    const startTime = Date.now();
    const duration = currentStory.duration || 5000;

    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const pct = Math.min(100, (elapsed / duration) * 100);
      setProgress(pct);

      if (elapsed >= duration) {
        clearInterval(interval);
        // Move to next story or close
        if (activeStoryIndex < stories.length - 1) {
          setActiveStoryIndex(activeStoryIndex + 1);
          setProgress(0);
        } else {
          setActiveStoryIndex(null);
        }
      }
    }, 30);

    return () => clearInterval(interval);
  }, [activeStoryIndex, stories]);

  const handleStoryClick = (index: number) => {
    setActiveStoryIndex(index);
    setProgress(0);
  };

  const handleNext = () => {
    if (activeStoryIndex === null) return;
    if (activeStoryIndex < stories.length - 1) {
      setActiveStoryIndex(activeStoryIndex + 1);
      setProgress(0);
    } else {
      setActiveStoryIndex(null);
    }
  };

  const handlePrev = () => {
    if (activeStoryIndex === null) return;
    if (activeStoryIndex > 0) {
      setActiveStoryIndex(activeStoryIndex - 1);
      setProgress(0);
    } else {
      setActiveStoryIndex(0);
      setProgress(0);
    }
  };

  if (loading || stories.length === 0) return null;

  const currentStory = activeStoryIndex !== null ? stories[activeStoryIndex] : null;

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
        <div className="flex items-center gap-1.5 mb-3 px-1">
          <Sparkles className="w-4 h-4 text-orange-500 animate-pulse" />
          <h3 className="text-xs font-black text-gray-900 uppercase tracking-widest leading-none">
            Cerita & Promo Hari Ini
          </h3>
        </div>

        {/* Stories Horizon Scroll */}
        <div className="flex gap-4.5 overflow-x-auto scrollbar-hide pb-0.5 pt-0.5">
          {stories.map((story, index) => {
            const hasViewed = viewedStories.has(story.id);
            return (
              <button
                key={story.id}
                type="button"
                onClick={() => handleStoryClick(index)}
                className="flex flex-col items-center gap-2 shrink-0 cursor-pointer active:scale-95 transition-transform bg-transparent border-0 outline-none"
              >
                {/* Visual Ring Halo */}
                <div
                  style={{
                    animation: !hasViewed ? 'story-halo-glow 3s ease-in-out infinite' : 'none',
                    borderColor: hasViewed ? '#E5E2DD' : undefined,
                    boxShadow: hasViewed ? 'none' : undefined,
                  }}
                  className="w-15 h-15 rounded-full p-[2.5px] border-2 flex items-center justify-center"
                >
                  <div className="relative w-full h-full rounded-full overflow-hidden bg-amber-50 border border-amber-150">
                    <Image
                      src={story.mediaUrl}
                      alt={story.title}
                      fill
                      sizes="60px"
                      className="object-cover"
                    />
                  </div>
                </div>
                <span className="text-[10px] font-black text-gray-800 tracking-tight max-w-[65px] truncate text-center">
                  {story.title.split(':')[0] || 'Arum Seduh'}
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
                onClick={() => setActiveStoryIndex(null)}
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
                  {/* Story Media (Image or Video) */}
                  <div className="absolute inset-0 z-10">
                    <Image
                      src={currentStory.mediaUrl}
                      alt={currentStory.title}
                      fill
                      priority
                      className="object-cover"
                      sizes="(max-width: 768px) 100vw, 450px"
                    />

                    {/* Ambient Shadow gradient at top and bottom */}
                    <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-transparent to-black/85 pointer-events-none" />
                  </div>

                  {/* Left/Right click trigger areas inside the story frame */}
                  <div
                    className="absolute inset-y-0 left-0 w-1/3 z-20 cursor-w-resize"
                    onClick={handlePrev}
                    aria-label="Cerita sebelumnya"
                  />
                  <div
                    className="absolute inset-y-0 right-0 w-2/3 z-20 cursor-e-resize"
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

                    {/* STORY CREATOR INFO & CLOSE BUTTON */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-orange-500 to-amber-500 border border-amber-200 flex items-center justify-center text-xs text-white font-black shadow-md">
                          <Sparkles className="w-4 h-4" />
                        </div>
                        <div className="flex flex-col text-left">
                          <span className="text-xs font-black text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">
                            Arum Seduh Official
                          </span>
                          <span className="text-[9px] font-bold text-gray-300 drop-shadow-[0_1px_1px_rgba(0,0,0,0.8)] uppercase tracking-wider">
                            Barista Live Story
                          </span>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveStoryIndex(null);
                        }}
                        aria-label="Tutup story"
                        className="pointer-events-auto w-10 h-10 rounded-full bg-black/40 backdrop-blur-md text-white flex items-center justify-center hover:bg-black/60 transition-colors cursor-pointer border border-white/15"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>
                  </div>

                  {/* BOTTOM CONTENT INFO & CALL TO ACTION */}
                  <div className="relative z-30 pb-6 px-5 space-y-4 pointer-events-none">
                    <div className="text-left space-y-1">
                      <h4 className="font-serif font-black text-lg text-white leading-snug drop-shadow-[0_1.5px_4px_rgba(0,0,0,0.8)]">
                        {currentStory.title}
                      </h4>
                      <p className="text-[10px] text-amber-200 font-black uppercase tracking-widest drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)] flex items-center gap-1.5">
                        <Sparkles className="w-3 h-3 text-amber-300" />
                        <span>Live Promo / Story</span>
                      </p>
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
                        className="pointer-events-auto w-full py-4 bg-gradient-to-tr from-amber-300 via-orange-400 to-amber-500 hover:shadow-lg text-[#2A1F16] text-[12.5px] font-black rounded-2xl shadow-xl flex items-center justify-center gap-2 cursor-pointer border border-amber-200/50 active:scale-95 transition-all"
                      >
                        <ShoppingBag className="w-4.5 h-4.5" />
                        <span>Lihat Menu / Pesan Sekarang</span>
                        <ChevronRight className="w-4 h-4" />
                      </motion.button>
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
