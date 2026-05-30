'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Gift, X, Star, RefreshCw } from 'lucide-react';
import { useToast } from '@/components/ui/Toast';

interface GachaOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  gachaChances: number;
  onSpinSuccess: (newChances: number) => void;
}

interface Prize {
  id: string;
  type: 'POINTS' | 'VOUCHER' | 'MERCH';
  value: string;
  label: string;
  description: string;
  color: string;
}

const PRIZES: Prize[] = [
  { id: 'p1', type: 'POINTS', value: '5', label: '5 Poin', description: 'Bonus 5 Arus Poin!', color: '#4E7C59' }, // Dark Matcha
  { id: 'p2', type: 'VOUCHER', value: 'FREE_TOPPING', label: 'Topping', description: 'Gratis 1 Topping Pilihan!', color: '#D4A574' }, // Cream Gold
  { id: 'p3', type: 'POINTS', value: '15', label: '15 Poin', description: 'Bonus 15 Arus Poin!', color: '#2E5A44' }, // Deep Forest Green
  { id: 'p4', type: 'VOUCHER', value: 'UPGRADE_SIZE', label: 'Size Up', description: 'Gratis Upgrade Ukuran Minuman!', color: '#EADFC9' }, // Light Matcha Cream
  { id: 'p5', type: 'POINTS', value: '50', label: '50 Poin', description: 'Jackpot! 50 Arus Poin!', color: '#B48A5E' }, // Golden Brown
  { id: 'p6', type: 'MERCH', value: 'STICKER_PACK', label: 'Stickers', description: 'Matchaboy Sticker Pack Eksklusif!', color: '#1E3F20' }, // Dark Green Black
];

export function GachaOverlay({ isOpen, onClose, gachaChances, onSpinSuccess }: GachaOverlayProps) {
  const { showToast } = useToast();
  const [isSpinning, setIsSpinning] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [wonPrize, setWonPrize] = useState<Prize | null>(null);
  const [showPrizeModal, setShowPrizeModal] = useState(false);
  const [confetti, setConfetti] = useState<{ id: number; x: number; y: number; color: string; size: number }[]>([]);

  // Reset local state when overlay opens/closes
  useEffect(() => {
    if (!isOpen) {
      setWonPrize(null);
      setShowPrizeModal(false);
      setConfetti([]);
    }
  }, [isOpen]);

  const generateConfetti = () => {
    const colors = ['#A3E635', '#FEF08A', '#F472B6', '#60A5FA', '#34D399', '#FB923C'];
    const newConfetti = Array.from({ length: 100 }).map((_, i) => ({
      id: i,
      x: Math.random() * 100, // percentage
      y: Math.random() * -20 - 5, // starting above screen
      color: colors[Math.floor(Math.random() * colors.length)],
      size: Math.random() * 8 + 6,
    }));
    setConfetti(newConfetti);
  };

  const handleSpin = async () => {
    if (isSpinning || gachaChances <= 0) return;

    setIsSpinning(true);
    setWonPrize(null);
    setShowPrizeModal(false);
    setConfetti([]);

    try {
      const response = await fetch('/api/user/gacha', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Gagal memutar Gacha');
      }

      const data = await response.json();
      const prizeResult = data.prize;

      // Find the index of the won prize
      const prizeIndex = PRIZES.findIndex(
        (p) => p.type === prizeResult.type && p.value === prizeResult.value
      );

      if (prizeIndex === -1) {
        throw new Error('Hadiah tidak dikenali');
      }

      // Calculate target angle to land on won prize index
      // Segment size = 60 degrees. Center of segment i = (i * 60) + 30.
      // To align segment i with the top pointer (0°):
      // Rotation required = 360 - ((i * 60) + 30)
      const targetSegmentAngle = 360 - ((prizeIndex * 60) + 30);
      const extraSpins = 6 * 360; // 6 full rotations
      const finalRotation = rotation + extraSpins + (targetSegmentAngle - (rotation % 360));

      setRotation(finalRotation);

      // Wait for spin animation (4.5s) to complete
      setTimeout(() => {
        setIsSpinning(false);
        setWonPrize(PRIZES[prizeIndex]);
        setShowPrizeModal(true);
        generateConfetti();
        onSpinSuccess(gachaChances - 1);
        showToast(`Selamat! Kamu mendapatkan ${PRIZES[prizeIndex].label}! 🎉`, 'success');
      }, 4600);

    } catch (error: any) {
      console.error('Spin error:', error);
      showToast(error.message || 'Terjadi kesalahan saat memutar roda.', 'error');
      setIsSpinning(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-4 overflow-y-auto">
        {/* Close Button */}
        {!isSpinning && (
          <button
            onClick={onClose}
            className="absolute top-4 right-4 z-50 p-2.5 bg-white/10 hover:bg-white/20 border border-white/20 rounded-full text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        )}

        {/* Confetti Elements */}
        {confetti.map((c) => (
          <motion.div
            key={c.id}
            initial={{ top: `${c.y}%`, left: `${c.x}%`, rotate: 0, opacity: 1 }}
            animate={{
              top: '110%',
              rotate: 360 + Math.random() * 360,
              x: `${parseFloat(c.x.toString()) + (Math.random() * 20 - 10)}%`,
            }}
            transition={{
              duration: Math.random() * 2.5 + 2,
              ease: 'linear',
            }}
            className="fixed z-[60] pointer-events-none rounded-sm"
            style={{
              width: `${c.size}px`,
              height: `${c.size}px`,
              backgroundColor: c.color,
            }}
          />
        ))}

        <div className="relative w-full max-w-md bg-[#FAF8F5] border-[3px] border-[#D4A574] rounded-[2.5rem] p-6 shadow-2xl overflow-hidden flex flex-col items-center">
          {/* Decorative Sparkles Background */}
          <div className="absolute top-0 inset-x-0 h-40 bg-[radial-gradient(circle_at_top,_rgba(212,235,214,0.3)_0%,_rgba(250,248,245,0)_70%)] pointer-events-none" />

          {/* Title Area */}
          <div className="text-center space-y-1 mb-6 relative z-10">
            <div className="inline-flex items-center gap-1 bg-[#2E5A44]/10 text-[#2E5A44] px-3.5 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border border-[#2E5A44]/15">
              <Sparkles className="w-3.5 h-3.5 fill-[#2E5A44] stroke-none animate-pulse" /> Matcha Lucky Draw
            </div>
            <h2 className="font-serif text-2xl font-black text-gray-900 mt-2">Gacha Spin-the-Wheel</h2>
            <p className="text-xs text-gray-500 font-semibold max-w-[280px] mx-auto">
              Putar roda keberuntunganmu dan menangkan hadiah menarik dari Matchaboy!
            </p>
          </div>

          {/* Gamified Wheel Container */}
          <div className="relative w-72 h-72 my-4 select-none">
            {/* Wheel Pointer (Glow Arrow at Top) */}
            <div className="absolute top-[-14px] left-1/2 -translate-x-1/2 z-30 drop-shadow-[0_4px_8px_rgba(0,0,0,0.3)]">
              <div className="w-0 h-0 border-l-[14px] border-l-transparent border-r-[14px] border-r-transparent border-t-[20px] border-t-rose-600 animate-pulse" />
              <div className="w-3 h-3 rounded-full bg-yellow-300 absolute top-[-8px] left-1/2 -translate-x-1/2 shadow-[0_0_8px_#FEF08A]" />
            </div>

            {/* Glowing Rim lights border */}
            <div className="absolute inset-0 rounded-full border-[10px] border-[#8C6239] shadow-[0_8px_30px_rgba(0,0,0,0.35),_inset_0_0_12px_rgba(0,0,0,0.2)] z-10 pointer-events-none" />

            {/* Glowing Diamonds on Rim */}
            <div className="absolute inset-[3px] rounded-full z-20 pointer-events-none">
              {Array.from({ length: 12 }).map((_, i) => {
                const angle = (i * 30) * (Math.PI / 180);
                const x = 50 + 47 * Math.cos(angle);
                const y = 50 + 47 * Math.sin(angle);
                return (
                  <div
                    key={i}
                    className={`absolute w-2 h-2 rounded-full bg-yellow-300 -translate-x-1/2 -translate-y-1/2 shadow-[0_0_6px_#FEF08A] ${
                      isSpinning ? 'animate-ping' : 'animate-pulse'
                    }`}
                    style={{
                      left: `${x}%`,
                      top: `${y}%`,
                      animationDelay: `${i * 100}ms`,
                    }}
                  />
                );
              })}
            </div>

            {/* Spinning Wheel */}
            <motion.div
              animate={{ rotate: rotation }}
              transition={{
                duration: 4.5,
                ease: [0.15, 0.85, 0.35, 1], // Custom slow down bezier curve
              }}
              className="w-full h-full rounded-full overflow-hidden relative shadow-inner bg-stone-100"
            >
              {/* Render 6 SVG Colored Segments */}
              <svg viewBox="0 0 100 100" className="w-full h-full transform rotate-[-90deg]">
                {PRIZES.map((prize, idx) => {
                  const startAngle = idx * 60;
                  const endAngle = (idx + 1) * 60;
                  const radStart = (startAngle * Math.PI) / 180;
                  const radEnd = (endAngle * Math.PI) / 180;
                  
                  // Coordinate calculation for wedge path
                  const x1 = 50 + 50 * Math.cos(radStart);
                  const y1 = 50 + 50 * Math.sin(radStart);
                  const x2 = 50 + 50 * Math.cos(radEnd);
                  const y2 = 50 + 50 * Math.sin(radEnd);

                  return (
                    <g key={prize.id}>
                      {/* Segment Slice Path */}
                      <path
                        d={`M 50 50 L ${x1} ${y1} A 50 50 0 0 1 ${x2} ${y2} Z`}
                        fill={prize.color}
                        stroke="#FAF8F5"
                        strokeWidth="1.5"
                      />
                    </g>
                  );
                })}
              </svg>

              {/* Text Labels inside Wheel Segments */}
              {PRIZES.map((prize, idx) => {
                const angle = (idx * 60) + 30; // Center angle of segment
                return (
                  <div
                    key={prize.id}
                    className="absolute w-28 text-center text-[10px] font-black uppercase tracking-wider origin-left flex items-center justify-end pr-5 select-none"
                    style={{
                      left: '50%',
                      top: '50%',
                      transform: `translate(0, -50%) rotate(${angle}deg)`,
                      color: prize.type === 'VOUCHER' && prize.value === 'UPGRADE_SIZE' ? '#2A1F16' : '#FFFFFF',
                      textShadow: prize.type === 'VOUCHER' && prize.value === 'UPGRADE_SIZE' ? 'none' : '0 1px 2px rgba(0,0,0,0.5)',
                    }}
                  >
                    <span>{prize.label}</span>
                  </div>
                );
              })}
            </motion.div>

            {/* Central Spinner Button */}
            <button
              onClick={handleSpin}
              disabled={isSpinning || gachaChances <= 0}
              className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-18 h-18 rounded-full z-30 flex flex-col items-center justify-center shadow-lg transition-transform active:scale-95 ${
                gachaChances <= 0
                  ? 'bg-gray-300 text-gray-500 border-4 border-gray-400 cursor-not-allowed'
                  : isSpinning
                  ? 'bg-[#2E5A44] border-4 border-yellow-300 text-yellow-300'
                  : 'bg-gradient-to-tr from-[#704F37] via-[#8C6239] to-[#D4A574] text-white hover:scale-105 border-4 border-[#FAF8F5] shadow-[0_0_15px_rgba(212,165,116,0.5)]'
              }`}
            >
              {isSpinning ? (
                <RefreshCw className="w-6 h-6 animate-spin text-yellow-300" />
              ) : (
                <>
                  <span className="text-[11px] font-black tracking-widest uppercase">SPIN</span>
                  <Gift className="w-3.5 h-3.5 mt-0.5" />
                </>
              )}
            </button>
          </div>

          {/* Chances Counter Footer */}
          <div className="mt-5 text-center relative z-10">
            <p className="text-xs font-bold text-gray-700">
              Kesempatan Kamu:{' '}
              <span className="inline-flex items-center justify-center px-3 py-1 bg-[#2E5A44] text-white font-extrabold rounded-full text-xs shadow-inner animate-pulse">
                {gachaChances}x
              </span>
            </p>
            {gachaChances > 0 ? (
              <p className="text-[9px] font-bold text-emerald-600 mt-2 uppercase tracking-widest animate-bounce">
                ✦ Tap SPIN untuk Memulai! ✦
              </p>
            ) : (
              <p className="text-[10px] text-gray-400 font-semibold mt-2 max-w-[240px]">
                Belanja minimal <span className="font-bold text-gray-600">Rp25.000</span> untuk mendapatkan extra kesempatan Lucky Draw!
              </p>
            )}
          </div>
        </div>

        {/* Prize Congratulation Modal Overlay */}
        <AnimatePresence>
          {showPrizeModal && wonPrize && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
            >
              <motion.div
                initial={{ scale: 0.85, y: 50, opacity: 0 }}
                animate={{ scale: 1, y: 0, opacity: 1 }}
                exit={{ scale: 0.85, y: 50, opacity: 0 }}
                transition={{ type: 'spring', damping: 25, stiffness: 180 }}
                className="w-full max-w-sm bg-[#FAF8F5] border-[4px] border-yellow-300 rounded-[2.5rem] p-6 text-center shadow-2xl overflow-hidden relative"
              >
                {/* Shiny Gold Background burst */}
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_rgba(254,240,138,0.3)_0%,_rgba(250,248,245,0)_70%)] pointer-events-none" />

                <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4 border border-yellow-200">
                  <Star className="w-8 h-8 text-yellow-500 fill-yellow-500 animate-spin" style={{ animationDuration: '6s' }} />
                </div>

                <span className="text-[10px] font-black uppercase tracking-[0.25em] text-yellow-600">
                  🎉 YAY! SELAMAT! 🎉
                </span>
                
                <h3 className="font-serif text-2xl font-black text-gray-900 mt-2">Kamu Mendapatkan:</h3>
                
                <div className="my-5 p-4.5 bg-white border border-[#D4A574]/30 rounded-3xl shadow-inner inline-block w-full">
                  <p className="font-serif font-black text-lg text-[#2E5A44] leading-tight">
                    {wonPrize.label}
                  </p>
                  <p className="text-xs text-gray-500 font-semibold mt-1 leading-snug">
                    {wonPrize.description}
                  </p>
                </div>

                <p className="text-[10px] text-gray-400 font-bold mb-5 max-w-[260px] mx-auto">
                  {wonPrize.type === 'POINTS'
                    ? 'Poin telah ditambahkan ke saldo akun loyalitasmu.'
                    : wonPrize.type === 'VOUCHER'
                    ? 'Voucher gratis dapat digunakan pada pesananmu berikutnya!'
                    : 'Tunjukkan riwayat draw ini ke kasir untuk klaim sticker pack!'}
                </p>

                <button
                  onClick={() => {
                    setShowPrizeModal(false);
                    if (gachaChances <= 0) {
                      onClose();
                    }
                  }}
                  className="w-full py-3.5 bg-[#2E5A44] hover:bg-[#1E3F20] text-white text-[12px] font-bold rounded-2xl shadow-md transition-all active:scale-[0.98]"
                >
                  {gachaChances > 0 ? 'Main Lagi 🔁' : 'Selesai'}
                </button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </AnimatePresence>
  );
}
