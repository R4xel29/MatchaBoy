'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';
import { formatRupiah } from '@/lib/utils';
import { Trophy, Award, Sparkles, X } from 'lucide-react';

export interface LeaderboardOverlayProps {
  isOpen: boolean;
  onClose: () => void;
}

export function LeaderboardOverlay({ isOpen, onClose }: LeaderboardOverlayProps) {
  const [data, setData] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'spender' | 'loyal' | 'referrer' | 'eco'>('spender');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setLoading(true);
      fetch('/api/leaderboard')
        .then((res) => res.json())
        .then((d) => {
          if (d) setData(d);
        })
        .catch((err) => console.error('Error fetching leaderboard:', err))
        .finally(() => setLoading(false));
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const getList = () => {
    if (!data) return [];
    if (activeTab === 'spender') return data.topSpenders || [];
    if (activeTab === 'loyal') return data.mostLoyal || [];
    if (activeTab === 'referrer') return data.topReferrers || [];
    return data.ecoChampions || [];
  };

  const getScoreLabel = (val: number) => {
    if (activeTab === 'spender') return formatRupiah(val);
    if (activeTab === 'loyal') return `${val} Order`;
    if (activeTab === 'referrer') return `${val} Referral`;
    return `${val} Tumbler ♻️`;
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="bg-white rounded-[2.5rem] w-full max-w-lg overflow-hidden shadow-2xl flex flex-col border border-amber-100 max-h-[85vh]"
        >
          {/* Header */}
          <div className="p-6 bg-gradient-to-tr from-amber-600 via-orange-500 to-amber-700 text-white flex justify-between items-center relative">
            <div className="space-y-0.5">
              <span className="text-[9px] text-amber-200 font-black uppercase tracking-widest bg-white/10 px-2 py-0.5 rounded-full inline-flex items-center gap-1">
                <Sparkles className="w-2.5 h-2.5" /> Arum Seduh Arena <Sparkles className="w-2.5 h-2.5" />
              </span>
              <h3 className="font-serif font-black text-xl text-white tracking-tight mt-1 flex items-center gap-2">
                <Trophy className="w-5 h-5 text-amber-200" />
                Papan Peringkat
              </h3>
            </div>
            <button
              onClick={onClose}
              className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 border border-white/15 flex items-center justify-center text-white text-sm font-bold active:scale-95 transition-all cursor-pointer"
              aria-label="Tutup"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Tabs selector */}
          <div className="flex bg-amber-50/50 border-b border-amber-100 p-2 overflow-x-auto scrollbar-hide shrink-0 gap-1">
            {[
              { id: 'spender', label: 'Top Spender' },
              { id: 'loyal', label: 'Most Loyal' },
              { id: 'referrer', label: 'Referral' },
              { id: 'eco', label: 'Eco Champion' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-4 py-2 text-[10px] font-black uppercase rounded-2xl tracking-wider transition-all whitespace-nowrap shrink-0 border cursor-pointer ${
                  activeTab === tab.id
                    ? 'bg-gradient-to-r from-orange-500 to-amber-500 border-orange-500 text-white shadow-sm'
                    : 'bg-white border-amber-200/60 text-gray-600 hover:bg-amber-50/60'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* List Content */}
          <div className="flex-1 overflow-y-auto p-6 space-y-3.5 scrollbar-hide">
            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="h-16 bg-amber-100/50 animate-pulse rounded-2xl w-full" />
                ))}
              </div>
            ) : getList().length === 0 ? (
              <div className="text-center py-10 space-y-2">
                <span className="text-3xl">🏺</span>
                <p className="text-xs font-bold text-amber-800/60 uppercase tracking-widest">
                  Belum Ada Data Bulan Ini
                </p>
              </div>
            ) : (
              getList().map((user: any, index: number) => {
                const isTopThree = index < 3;
                const medals = ['🥇', '🥈', '🥉'];
                const badgeBg = [
                  'bg-amber-500/10 text-amber-600 border-amber-500/20',
                  'bg-slate-400/10 text-slate-500 border-slate-400/20',
                  'bg-orange-600/10 text-orange-700 border-orange-600/20',
                ];

                return (
                  <div
                    key={user.id || index}
                    className={`flex items-center justify-between p-3.5 border rounded-3xl transition-all ${
                      isTopThree
                        ? 'bg-gradient-to-r from-amber-50 to-orange-50/40 border-amber-200/80 shadow-sm'
                        : 'bg-white border-gray-100'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      {/* Rank Indicator */}
                      <div
                        className={`w-8 h-8 rounded-full border flex items-center justify-center font-black text-xs ${
                          isTopThree ? badgeBg[index] : 'bg-gray-50 border-gray-200 text-gray-500'
                        }`}
                      >
                        {isTopThree ? medals[index] : index + 1}
                      </div>

                      {/* Avatar */}
                      <div className="w-10 h-10 rounded-full overflow-hidden bg-amber-50 border border-amber-200/60 shrink-0 relative">
                        <Image
                          src={
                            user.image ||
                            `https://ui-avatars.com/api/?name=${encodeURIComponent(
                              user.name
                            )}&background=F97316&color=FFFFFF&bold=true`
                          }
                          alt={user.name}
                          fill
                          sizes="40px"
                          className="object-cover"
                        />
                      </div>

                      {/* Name */}
                      <div className="text-left">
                        <h4 className="font-serif font-black text-xs text-gray-900 line-clamp-1 max-w-[150px]">
                          {user.name}
                        </h4>
                        <span className="text-[9px] font-bold text-amber-700/70 uppercase tracking-widest leading-none">
                          Pecinta Arum Seduh
                        </span>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <span
                        className={`font-black text-xs ${
                          isTopThree ? 'text-orange-600' : 'text-gray-700'
                        }`}
                      >
                        {getScoreLabel(user.value)}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

export default LeaderboardOverlay;
