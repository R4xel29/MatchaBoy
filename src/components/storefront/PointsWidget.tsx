'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Gift, ChevronRight, Star, Sparkles } from 'lucide-react';

export function PointsWidget() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [points, setPoints] = useState(0);
  const [settings, setSettings] = useState<any>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (status === 'authenticated') {
      Promise.all([
        fetch('/api/user/profile').then(r => r.ok ? r.json() : {}) as Promise<any>,
        fetch('/api/admin/loyalty/settings').then(r => r.ok ? r.json() : {}) as Promise<any>
      ]).then(([profileData, settingsData]) => {
        setPoints(profileData?.points || 0);
        setSettings(settingsData);
        setLoaded(true);
      }).catch(() => setLoaded(true));
    }
  }, [status]);

  if (status !== 'authenticated' || !loaded) return null;

  const maxPoints = settings?.milestone3Points || 15;
  const progressPercent = Math.min((points / maxPoints) * 100, 100);
  
  const milestones = [
    { points: settings?.milestone1Points || 5, desc: settings?.milestone1Desc || 'Reward 1', enabled: settings?.milestone1Enabled !== false },
    { points: settings?.milestone2Points || 10, desc: settings?.milestone2Desc || 'Reward 2', enabled: settings?.milestone2Enabled !== false },
    { points: settings?.milestone3Points || 15, desc: settings?.milestone3Desc || 'Reward 3', enabled: settings?.milestone3Enabled !== false },
  ].filter(m => m.enabled && m.points > 0).sort((a, b) => a.points - b.points);

  const nextMilestone = milestones.find(m => m.points > points) || milestones[milestones.length - 1];

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6 mb-6 flex flex-col items-center">
      {/* Headline */}
      <div className="w-full max-w-2xl flex items-center justify-between mb-3 px-1">
        <h3 className="font-heading font-bold text-lg text-foreground flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-emerald-500" />
          Loyalty Rewards
        </h3>
        <p className="text-xs font-medium text-muted-foreground hidden sm:block">
          Tukarkan poin dengan minuman favoritmu
        </p>
      </div>

      <motion.button
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        onClick={() => router.push('/profile')}
        className="block w-full max-w-2xl mx-auto text-left relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#18442D] to-[#0f2a1c] p-4 sm:p-5 shadow-lg group transition-all hover:shadow-xl hover:-translate-y-0.5 active:scale-[0.99] border border-emerald-900/30"
      >
        {/* Decorative background elements */}
        <div className="absolute -top-10 -right-10 w-32 h-32 bg-emerald-500/15 rounded-full blur-2xl group-hover:bg-emerald-400/25 transition-colors duration-500" />
        <div className="absolute -bottom-10 -left-10 w-24 h-24 bg-green-500/10 rounded-full blur-xl" />
        
        <div className="relative z-10">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-400/20 to-emerald-500/10 flex items-center justify-center backdrop-blur-md border border-emerald-400/20 shadow-inner group-hover:scale-105 transition-transform">
                <Gift className="w-5 h-5 text-emerald-400" />
              </div>
              <div>
                <p className="text-[10px] text-emerald-200/60 font-bold uppercase tracking-widest mb-0.5">Poin Terkumpul</p>
                <div className="flex items-baseline gap-1.5">
                  <p className="text-2xl font-extrabold text-white leading-none tracking-tight">{points}</p>
                  <p className="text-xs text-white/40 font-medium">/ {maxPoints} Pts</p>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-1.5 text-emerald-100/70 group-hover:text-white transition-colors bg-white/5 group-hover:bg-white/10 px-3 py-1.5 rounded-full backdrop-blur-sm border border-white/5">
              <span className="text-[10px] font-bold tracking-wide">Tukar Poin</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </div>
          </div>

          {/* Compact Timeline Progress */}
          <div className="relative px-2 py-3 mt-2 bg-black/20 rounded-xl border border-white/5 backdrop-blur-sm shadow-inner">
            {/* Background Track */}
            <div className="absolute top-1/2 -translate-y-1/2 left-3 right-3 h-1.5 bg-black/40 rounded-full overflow-hidden border border-white/5">
              <motion.div
                className="h-full bg-gradient-to-r from-emerald-500 to-green-400 rounded-full relative"
                initial={{ width: 0 }}
                animate={{ width: `${progressPercent}%` }}
                transition={{ duration: 1, ease: 'easeOut', delay: 0.5 }}
              >
                <div className="absolute inset-0 bg-[linear-gradient(90deg,transparent_0%,rgba(255,255,255,0.3)_50%,transparent_100%)] bg-[length:200%_100%] animate-shimmer" />
              </motion.div>
            </div>

            {/* Nodes */}
            <div className="relative flex justify-between items-center z-10">
              {Array.from({ length: maxPoints }).map((_, i) => {
                const pointValue = i + 1;
                const isEarned = pointValue <= points;
                const milestone = milestones.find(m => m.points === pointValue);
                const isNextMilestone = nextMilestone?.points === pointValue;

                return (
                  <div key={i} className="relative group/node flex flex-col items-center justify-center">
                    {milestone ? (
                      <div className={`
                        w-4 h-4 sm:w-5 sm:h-5 rounded-full flex items-center justify-center border-2 transition-all duration-300 z-10 cursor-pointer
                        ${isEarned 
                          ? 'bg-emerald-400 border-emerald-400 text-[#0f2a1c] shadow-[0_0_10px_rgba(52,211,153,0.5)]' 
                          : 'bg-[#0f2a1c] border-emerald-500/50 text-emerald-500/50 hover:border-emerald-400 hover:text-emerald-400'}
                      `}>
                        <Star className={`w-2.5 h-2.5 sm:w-3 sm:h-3 ${isEarned ? 'fill-[#0f2a1c]' : ''}`} />
                        
                        {/* Milestone Tooltip */}
                        <div className="absolute -top-8 sm:-top-9 opacity-0 group-hover/node:opacity-100 transition-all translate-y-1 group-hover/node:translate-y-0 pointer-events-none whitespace-nowrap z-20">
                          <div className="bg-emerald-500 text-white text-[10px] font-bold px-2.5 py-1 rounded-lg shadow-xl border border-emerald-400">
                            {milestone.desc}
                            <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 border-4 border-transparent border-t-emerald-500" />
                          </div>
                        </div>
                        
                        {/* Always show text for the NEXT milestone if it's the target */}
                        {isNextMilestone && !isEarned && (
                          <div className="absolute -bottom-6 sm:-bottom-7 whitespace-nowrap z-10">
                            <span className="text-[9px] font-bold text-emerald-300 bg-emerald-900/40 px-2 py-0.5 rounded-full border border-emerald-500/30 backdrop-blur-sm shadow-sm">
                              {milestone.desc}
                            </span>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className={`
                        w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full transition-all duration-300 z-10
                        ${isEarned ? 'bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.6)] scale-110' : 'bg-white/10'}
                      `} />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
          
        </div>
      </motion.button>
    </div>
  );
}

