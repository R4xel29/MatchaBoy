'use client';

import { useState, useEffect } from 'react';
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

  // Load viewed stories from localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('matchaboy_viewed_stories');
        if (saved) {
          setViewedStories(new Set(JSON.parse(saved)));
        }
      } catch (e) {
        console.error(e);
      }
    }
  }, []);

  // Save viewed stories to localStorage
  const markStoryAsViewed = (id: string) => {
    setViewedStories(prev => {
      const next = new Set(prev);
      next.add(id);
      if (typeof window !== 'undefined') {
        localStorage.setItem('matchaboy_viewed_stories', JSON.stringify(Array.from(next)));
      }
      return next;
    });
  };

  useEffect(() => {
    fetch('/api/stories')
      .then(res => res.json())
      .then(data => {
        if (data?.success && data.stories) {
          setStories(data.stories);
        }
      })
      .catch(err => console.error('Error fetching stories:', err))
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

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes story-halo-glow {
          0%, 100% { border-color: rgba(212, 165, 116, 0.85); box-shadow: 0 0 8px rgba(46, 90, 68, 0.35); }
          50% { border-color: rgba(254, 240, 138, 0.95); box-shadow: 0 0 14px rgba(254, 240, 138, 0.55); }
        }
      `}} />

      {/* STORY BAR CONTAINER */}
      <div className="w-full bg-white rounded-3xl border border-gray-150 p-4.5 shadow-sm overflow-hidden select-none mb-6">
        <div className="flex items-center gap-1.5 mb-3 px-1">
          <Sparkles className="w-4 h-4 text-[#2E5A44] animate-pulse" />
          <h3 className="text-xs font-black text-gray-900 uppercase tracking-widest leading-none">
            Behind the Scenes 🍃
          </h3>
        </div>

        {/* Stories Horizon Scroll */}
        <div className="flex gap-4.5 overflow-x-auto scrollbar-hide pb-0.5 pt-0.5">
          {stories.map((story, index) => {
            const hasViewed = viewedStories.has(story.id);
            return (
              <button
                key={story.id}
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
                  className={`w-15 h-15 rounded-full p-[2.5px] border-2 flex items-center justify-center`}
                >
                  <div className="relative w-full h-full rounded-full overflow-hidden bg-brand-50 border border-gray-100">
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
                  {story.title.split(':')[0] || 'Matchaboy'}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* FULL SCREEN INTERACTIVE STORIES OVERLAY */}
      <AnimatePresence>
        {activeStoryIndex !== null && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/95 select-none">
            {/* Left/Right click trigger areas */}
            <div className="absolute inset-y-0 left-0 w-1/4 z-20 cursor-w-resize" onClick={handlePrev} />
            <div className="absolute inset-y-0 right-0 w-1/4 z-20 cursor-e-resize" onClick={handleNext} />
            
            {/* Top Close Click */}
            <div className="absolute top-4 right-4 z-30 flex items-center gap-3">
              <button
                onClick={() => setActiveStoryIndex(null)}
                className="w-10 h-10 rounded-full bg-black/40 backdrop-blur-md text-white flex items-center justify-center hover:bg-black/60 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Story Visual Frame */}
            <motion.div
              initial={{ scale: 0.96, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.96, opacity: 0 }}
              className="relative w-full h-full max-w-md bg-stone-900 overflow-hidden flex flex-col justify-between"
            >
              {/* TOP STORY INDICATORS (Progress Bars) */}
              <div className="absolute top-4 inset-x-4 z-30 flex gap-1.5">
                {stories.map((s, idx) => {
                  let width = '0%';
                  if (idx < activeStoryIndex) width = '100%';
                  if (idx === activeStoryIndex) width = `${progress}%`;
                  return (
                    <div key={s.id} className="flex-1 h-[3px] rounded-full bg-white/25 overflow-hidden">
                      <div 
                        className="h-full bg-white rounded-full transition-all duration-300 ease-out"
                        style={{ width }}
                      />
                    </div>
                  );
                })}
              </div>

              {/* STORY CREATOR INFO */}
              <div className="absolute top-8 inset-x-4 z-30 flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-full bg-[#1E3F20] border border-[#FEF08A]/60 flex items-center justify-center text-xs">
                  <span>🍃</span>
                </div>
                <div className="flex flex-col text-left">
                  <span className="text-xs font-black text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">
                    Matchaboy Official
                  </span>
                  <span className="text-[9px] font-bold text-gray-300 drop-shadow-[0_1px_1px_rgba(0,0,0,0.8)] uppercase tracking-wider">
                    Barista Live Story
                  </span>
                </div>
              </div>

              {/* Story Media (Image or Video) */}
              <div className="relative w-full h-full z-10">
                <Image
                  src={stories[activeStoryIndex].mediaUrl}
                  alt={stories[activeStoryIndex].title}
                  fill
                  priority
                  className="object-cover"
                  sizes="(max-width: 768px) 100vw, 450px"
                />
                
                {/* Ambient Shadow gradient at top and bottom */}
                <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-transparent to-black/80 pointer-events-none" />
              </div>

              {/* BOTTOM CONTENT INFO & CALL TO ACTION */}
              <div className="absolute bottom-6 inset-x-5 z-30 space-y-4">
                <div className="text-left space-y-1">
                  <h4 className="font-serif font-black text-lg text-white leading-snug drop-shadow-[0_1.5px_4px_rgba(0,0,0,0.8)]">
                    {stories[activeStoryIndex].title}
                  </h4>
                  <p className="text-[10px] text-[#FEF08A] font-black uppercase tracking-widest drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)] flex items-center gap-1">
                    <span>✦ Live Promo / Story ✦</span>
                  </p>
                </div>

                {/* Call To Action Button (Direct menu redirection) */}
                {stories[activeStoryIndex].linkUrl && (
                  <motion.button
                    whileTap={{ scale: 0.98 }}
                    onClick={() => {
                      const url = stories[activeStoryIndex].linkUrl;
                      if (url) {
                        setActiveStoryIndex(null);
                        window.location.href = url;
                      }
                    }}
                    className="w-full py-4 bg-gradient-to-tr from-[#FEF08A] to-[#D4A574] hover:shadow-lg text-[#2A1F16] text-[12.5px] font-black rounded-2xl shadow-xl z-30 flex items-center justify-center gap-2 cursor-pointer border border-[#FEF08A]/30 active:scale-95 transition-all"
                  >
                    <ShoppingBag className="w-4.5 h-4.5" />
                    <span>Lihat Menu / Pesan Sekarang</span>
                    <ChevronRight className="w-4 h-4" />
                  </motion.button>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
