'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Pause, SkipForward, Volume2, Music, X, Disc } from 'lucide-react';

interface Track {
  id: string;
  title: string;
  artist: string;
  url: string;
  mood: string;
  timePeriod: 'pagi' | 'siang' | 'sore' | 'malam';
}

const PLAYLIST: Track[] = [
  {
    id: 'lofi-pagi',
    title: 'Uji Sunrise 🌅',
    artist: 'Matchaboy Chill',
    url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3',
    mood: 'Fresh & Ceria (Gitar Akustik Lofi)',
    timePeriod: 'pagi',
  },
  {
    id: 'lofi-siang',
    title: 'Kyoto Afternoon Cafe ☀️',
    artist: 'Matchaboy Jazz',
    url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3',
    mood: 'Energetic Jazz (Piano & Terompet Lofi)',
    timePeriod: 'siang',
  },
  {
    id: 'lofi-sore',
    title: 'Golden Hour Tea 🌇',
    artist: 'Matchaboy Ambient',
    url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3',
    mood: 'Chill & Peaceful (Koto Jepang & Suling Bambu)',
    timePeriod: 'sore',
  },
  {
    id: 'lofi-malam',
    title: 'Midnight Whispers 🌃',
    artist: 'Matchaboy Sleep',
    url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3',
    mood: 'Deep Sleep (Lofi Synth & Suara Hujan)',
    timePeriod: 'malam',
  },
];

export function MatchaVibesPlayer() {
  const [mounted, setMounted] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [currentPeriod, setCurrentPeriod] = useState<'pagi' | 'siang' | 'sore' | 'malam'>('siang');
  const [volume, setVolume] = useState(0.5);

  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Time Period Detection
  useEffect(() => {
    setMounted(true);
    const hour = new Date().getHours();
    if (hour >= 6 && hour < 10) {
      setCurrentPeriod('pagi');
    } else if (hour >= 10 && hour < 16) {
      setCurrentPeriod('siang');
    } else if (hour >= 16 && hour < 18) {
      setCurrentPeriod('sore');
    } else {
      setCurrentPeriod('malam');
    }
  }, []);

  const currentTrack = useMemo(() => {
    return PLAYLIST.find(t => t.timePeriod === currentPeriod) || PLAYLIST[1];
  }, [currentPeriod]);

  // Audio Playback Sync
  useEffect(() => {
    if (!mounted) return;

    if (!audioRef.current) {
      audioRef.current = new Audio(currentTrack.url);
      audioRef.current.loop = true;
    } else {
      const wasPlaying = isPlaying;
      audioRef.current.pause();
      audioRef.current.src = currentTrack.url;
      audioRef.current.load();
      if (wasPlaying) {
        audioRef.current.play().catch(err => console.log('Audio autoplay prevented:', err));
      }
    }
  }, [currentTrack, mounted]);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume;
    }
  }, [volume]);

  const handlePlayPause = () => {
    if (!audioRef.current) return;

    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play()
        .then(() => setIsPlaying(true))
        .catch(err => {
          console.error('Audio play error:', err);
          setIsPlaying(false);
        });
    }
  };

  const handleNextTrack = () => {
    // Cycle to next time period playlist
    const periods: ('pagi' | 'siang' | 'sore' | 'malam')[] = ['pagi', 'siang', 'sore', 'malam'];
    const currentIndex = periods.indexOf(currentPeriod);
    const nextIndex = (currentIndex + 1) % periods.length;
    setCurrentPeriod(periods[nextIndex]);
  };

  if (!mounted) return null;

  return (
    <>
      {/* HTML5 Audio element fallback (handled programmatically via ref) */}
      
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes disc-spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        @keyframes vinyl-wave {
          0%, 100% { height: 4px; }
          50% { height: 16px; }
        }
        @keyframes tea-steam-lofi {
          0% { transform: translateY(4px) scale(0.9); opacity: 0; }
          50% { opacity: 0.4; }
          100% { transform: translateY(-12px) scale(1.1); opacity: 0; }
        }
      `}} />

      {/* FLOATING ACTION TRIGGER BUTTON */}
      <AnimatePresence>
        {!isOpen && (
          <motion.button
            initial={{ scale: 0, y: 50 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0, y: 50 }}
            whileHover={{ scale: 1.08 }}
            whileTap={{ scale: 0.92 }}
            onClick={() => setIsOpen(true)}
            className="fixed bottom-24 left-4 z-40 p-3 rounded-full bg-gradient-to-tr from-[#1E3F20] to-[#2E5A44] border-2 border-[#FEF08A]/60 text-white shadow-2xl flex items-center justify-center cursor-pointer select-none"
            style={{
              boxShadow: '0 8px 24px rgba(46,90,68,0.35), 0 0 10px rgba(254,240,138,0.15)'
            }}
          >
            {/* Visual Vinyl Disc */}
            <div className="relative w-8 h-8 flex items-center justify-center">
              <Disc 
                className={`w-8 h-8 text-yellow-100/90`} 
                style={{
                  animation: isPlaying ? 'disc-spin 4s linear infinite' : 'none',
                }}
              />
              <span className="absolute text-[8px] leading-none select-none">🍵</span>
              
              {/* Steaming Lofi Indicator */}
              {isPlaying && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 flex gap-0.5 justify-center">
                  {[1, 2].map(n => (
                    <div
                      key={n}
                      className="w-1 h-3 rounded-full bg-white/40 blur-[0.8px]"
                      style={{
                        animation: `tea-steam-lofi 1.2s ease-in-out infinite`,
                        animationDelay: `${n * 0.4}s`
                      }}
                    />
                  ))}
                </div>
              )}
            </div>
          </motion.button>
        )}
      </AnimatePresence>

      {/* FULL VINYL PLAYER DISPLAY PANEL */}
      <AnimatePresence>
        {isOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm select-none">
            {/* Backdrop click closes panel */}
            <div className="absolute inset-0" onClick={() => setIsOpen(false)} />

            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              transition={{ type: 'spring', damping: 25, stiffness: 220 }}
              className="relative w-full max-w-sm rounded-[2.5rem] bg-gradient-to-b from-[#1E3F20]/95 via-[#1E3F20]/90 to-[#102411]/95 text-white p-6 shadow-2xl border-2 border-[#FEF08A]/20 backdrop-blur-md overflow-hidden z-10"
              style={{
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5), 0 0 20px rgba(46,90,68,0.2)'
              }}
            >
              {/* Close Button */}
              <button
                onClick={() => setIsOpen(false)}
                className="absolute top-5 right-5 w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>

              {/* Title & Info */}
              <div className="text-center mt-3 mb-6 space-y-1">
                <span className="bg-[#FEF08A]/10 border border-[#FEF08A]/25 text-[#FEF08A] text-[8px] font-black uppercase px-2.5 py-0.5 rounded-full tracking-widest leading-none">
                  ✦ Matcha Vibes Player ✦
                </span>
                <h3 className="font-serif text-lg font-black text-white mt-1.5 leading-snug tracking-wide">
                  {currentTrack.title}
                </h3>
                <p className="text-[10px] text-gray-300 font-bold uppercase tracking-wider">
                  {currentTrack.artist}
                </p>
                <p className="text-[9px] text-[#FEF08A]/70 font-semibold italic">
                  "{currentTrack.mood}"
                </p>
              </div>

              {/* RETRO VINYL TURNTABLE SECTION */}
              <div className="relative w-full aspect-square max-w-[200px] mx-auto bg-black/45 border-4 border-[#8C6239] rounded-3xl flex items-center justify-center shadow-inner overflow-hidden mb-6">
                {/* Wood grain pattern overlay */}
                <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.01)_1px,_transparent_1px)] bg-[size:10px_10px] pointer-events-none opacity-20" />
                
                {/* Stylus needle arm unit */}
                <div 
                  className="absolute top-2 right-4 w-12 h-20 origin-top-right z-30 transition-transform duration-1000 ease-in-out pointer-events-none"
                  style={{
                    transform: isPlaying ? 'rotate(18deg)' : 'rotate(0deg)'
                  }}
                >
                  {/* Metal arm bar */}
                  <svg width="48" height="80" viewBox="0 0 48 80" fill="none">
                    <path d="M40 5 L10 5 L10 65 L20 72" stroke="#E5E2DD" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
                    <rect x="16" y="68" width="8" height="10" rx="1.5" fill="#FEF08A" />
                  </svg>
                </div>

                {/* Rotating Vinyl Disc */}
                <div 
                  style={{
                    boxShadow: '0 8px 30px rgba(0,0,0,0.65), inset 0 0 10px rgba(255,255,255,0.1)'
                  }}
                  className="relative w-40 h-40 rounded-full bg-[#1A1A1A] flex items-center justify-center border-4 border-[#101010]"
                >
                  {/* Vinyl Grooves (CSS concentric circles) */}
                  <div className="absolute inset-2 rounded-full border border-neutral-800/40" />
                  <div className="absolute inset-5 rounded-full border border-neutral-800/45" />
                  <div className="absolute inset-8 rounded-full border border-neutral-800/50" />
                  <div className="absolute inset-11 rounded-full border border-neutral-800/55" />
                  <div className="absolute inset-14 rounded-full border border-neutral-800/60" />

                  {/* Center Label (Gold Matcha Brand) */}
                  <div 
                    style={{
                      animation: isPlaying ? 'disc-spin 8s linear infinite' : 'none',
                    }}
                    className="relative w-16 h-16 rounded-full p-[1px] bg-gradient-to-tr from-[#FEF08A] via-[#2E5A44] to-[#D4A574] flex items-center justify-center overflow-hidden border border-[#FEF08A]/40"
                  >
                    <div className="w-full h-full rounded-full bg-[#1E3F20] flex flex-col items-center justify-center">
                      <span className="text-[12px] leading-none select-none">🍃</span>
                      <span className="text-[6px] font-black uppercase text-[#FEF08A] tracking-wider mt-0.5 select-none">Matcha</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* EQUALIZER WAVE AUDIO VISUALIZER */}
              <div className="h-6 w-32 mx-auto flex items-end justify-center gap-1 mb-5 select-none pointer-events-none">
                {Array.from({ length: 9 }).map((_, i) => {
                  const delay = 0.1 + i * 0.15;
                  const duration = 0.5 + Math.random() * 0.6;
                  return (
                    <div
                      key={i}
                      className="w-1.5 rounded-full bg-gradient-to-t from-[#2E5A44] to-[#FEF08A]"
                      style={{
                        animation: isPlaying ? 'vinyl-wave 1.2s ease-in-out infinite' : 'none',
                        animationDelay: `${delay}s`,
                        animationDuration: `${duration}s`,
                        height: isPlaying ? undefined : '4px',
                      }}
                    />
                  );
                })}
              </div>

              {/* MUSIC PLAYER CONTROLS PANEL */}
              <div className="space-y-5">
                {/* Play, Pause, Next */}
                <div className="flex items-center justify-center gap-6">
                  <button
                    onClick={handleNextTrack}
                    className="w-10 h-10 rounded-full bg-white/5 border border-white/10 hover:bg-white/15 text-white flex items-center justify-center transition-all cursor-pointer active:scale-95 rotate-180"
                    title="Previous mood"
                  >
                    <SkipForward className="w-4.5 h-4.5" />
                  </button>

                  <button
                    onClick={handlePlayPause}
                    style={{
                      boxShadow: isPlaying ? '0 0 16px rgba(254, 240, 138, 0.35)' : 'none'
                    }}
                    className={`w-16 h-16 rounded-full flex items-center justify-center transition-all cursor-pointer active:scale-95 border-2 ${
                      isPlaying 
                        ? 'bg-gradient-to-tr from-[#FEF08A] to-[#D4A574] border-[#FEF08A] text-[#1E3F20]'
                        : 'bg-white/10 border-white/20 text-white hover:bg-white/15'
                    }`}
                  >
                    {isPlaying ? <Pause className="w-7 h-7 stroke-[2.5]" /> : <Play className="w-7 h-7 stroke-[2.5] pl-1" />}
                  </button>

                  <button
                    onClick={handleNextTrack}
                    className="w-10 h-10 rounded-full bg-white/5 border border-white/10 hover:bg-white/15 text-white flex items-center justify-center transition-all cursor-pointer active:scale-95"
                    title="Next mood"
                  >
                    <SkipForward className="w-4.5 h-4.5" />
                  </button>
                </div>

                {/* Volume Slider control */}
                <div className="flex items-center gap-3 bg-black/25 px-4.5 py-3 rounded-2xl border border-white/5">
                  <Volume2 className="w-4 h-4 text-[#FEF08A]" />
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={volume}
                    onChange={(e) => setVolume(parseFloat(e.target.value))}
                    className="w-full h-1.5 bg-white/15 rounded-lg appearance-none cursor-pointer focus:outline-none accent-[#FEF08A]"
                    style={{
                      WebkitAppearance: 'none',
                    }}
                  />
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
