'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Gift, Copy, Check, X, Share2, MessageCircle } from 'lucide-react';

interface ReferralPopupProps {
  referralCode?: string | null;
}

export function ReferralPopup({ referralCode }: ReferralPopupProps) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [showBig, setShowBig] = useState(false);
  const [showMini, setShowMini] = useState(false);
  const [copied, setCopied] = useState(false);

  const code = referralCode || (session?.user as any)?.referralCode;
  const isLoggedIn = status === 'authenticated';

  useEffect(() => {
    // Delay 3s before showing
    const timer = setTimeout(() => {
      const bigDismissed = localStorage.getItem('matchaboy-referral-big-dismissed');

      if (!bigDismissed) {
        setShowBig(true);
      } else {
        // Show mini once per session
        const miniDismissed = sessionStorage.getItem('matchaboy-referral-mini-dismissed');
        if (!miniDismissed) {
          setShowMini(true);
        }
      }
    }, 3000);

    return () => clearTimeout(timer);
  }, []);

  const getReferralUrl = () => {
    if (typeof window === 'undefined') return '';
    return `${window.location.origin}/register?ref=${code || ''}`;
  };

  const handleCopy = () => {
    if (!isLoggedIn) {
      router.push('/login?callbackUrl=/');
      return;
    }
    navigator.clipboard.writeText(getReferralUrl());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShareWA = () => {
    if (!isLoggedIn) {
      router.push('/login?callbackUrl=/');
      return;
    }
    const text = encodeURIComponent(
      `Cobain Matchaboy! 🍵 Matcha premium yang enak banget. Daftar pakai link ini dan dapatkan reward spesial:\n${getReferralUrl()}`
    );
    window.open(`https://wa.me/?text=${text}`, '_blank');
  };

  const handleDismissBig = () => {
    setShowBig(false);
    localStorage.setItem('matchaboy-referral-big-dismissed', 'true');
    // Show mini after big is dismissed
    setShowMini(true);
  };

  const handleDismissMini = () => {
    setShowMini(false);
    sessionStorage.setItem('matchaboy-referral-mini-dismissed', 'true');
  };

  return (
    <>
      {/* ── Big Referral Pop-up ────────────────────────────── */}
      <AnimatePresence>
        {showBig && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[90] flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm p-4"
          >
            <motion.div
              initial={{ y: 100, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 100, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 400, damping: 35 }}
              className="w-full max-w-sm rounded-3xl bg-white shadow-2xl overflow-hidden"
            >
              {/* Header gradient */}
              <div className="bg-gradient-to-br from-[#18442D] to-[#1a5c3a] px-6 pt-6 pb-8 text-white relative overflow-hidden">
                <div className="absolute -top-10 -right-10 w-32 h-32 bg-white/5 rounded-full blur-2xl" />
                <div className="relative z-10">
                  <div className="w-14 h-14 rounded-2xl bg-white/15 backdrop-blur-md flex items-center justify-center mb-4 border border-white/10">
                    <Gift className="w-7 h-7" />
                  </div>
                  <h3 className="font-serif text-xl font-bold mb-1">Ajak Teman, Dapat Reward!</h3>
                  <p className="text-sm text-white/70 leading-relaxed">
                    Bagikan kode referral kamu. Kamu dan temanmu akan mendapat <strong className="text-white">1 Minuman Gratis</strong> setelah teman pertama kali memesan! 🎉
                  </p>
                </div>
              </div>

              <div className="px-6 py-5 space-y-3">
                {isLoggedIn && code ? (
                  <>
                    {/* Referral Link */}
                    <div className="flex items-center gap-2">
                      <div className="flex-1 px-3 py-2.5 bg-gray-50 rounded-xl border border-gray-100 text-[12px] font-mono text-gray-600 truncate">
                        {getReferralUrl()}
                      </div>
                      <button
                        onClick={handleCopy}
                        className={`px-4 py-2.5 rounded-xl text-[12px] font-bold flex items-center gap-1.5 transition-all active:scale-95 ${
                          copied ? 'bg-green-50 text-green-600 border border-green-200' : 'bg-[#18442D] text-white'
                        }`}
                      >
                        {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                        {copied ? 'Disalin!' : 'Salin'}
                      </button>
                    </div>

                    {/* Share via WA */}
                    <button onClick={handleShareWA}
                      className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl bg-green-500 text-white font-semibold text-sm hover:bg-green-600 transition-colors active:scale-[0.98]">
                      <MessageCircle className="w-4 h-4" />
                      Bagikan via WhatsApp
                    </button>
                  </>
                ) : isLoggedIn ? (
                  <button onClick={() => router.push('/profile')}
                    className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl bg-[#18442D] text-white font-semibold text-sm hover:opacity-90 transition-opacity">
                    Lihat Halaman Referral
                  </button>
                ) : (
                  <button onClick={() => router.push('/login?callbackUrl=/')}
                    className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl bg-[#18442D] text-white font-semibold text-sm hover:opacity-90 transition-opacity">
                    Login untuk Mendapat Kode Referral
                  </button>
                )}

                <button onClick={handleDismissBig}
                  className="w-full py-2.5 text-sm text-gray-400 font-medium hover:text-gray-600 transition-colors">
                  Nanti Saja
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Mini Referral Banner (bottom) ─────────────────── */}
      <AnimatePresence>
        {showMini && !showBig && (
          <motion.div
            initial={{ y: 100, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 100, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            className="fixed bottom-20 left-4 right-4 z-[80] max-w-md mx-auto"
          >
            <div className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-gradient-to-r from-[#18442D] to-[#1a5c3a] text-white shadow-xl shadow-[#18442D]/30">
              <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center flex-shrink-0">
                <Gift className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-bold">Ajak teman, dapat minuman gratis!</p>
                <button
                  onClick={() => { 
                    if (isLoggedIn) {
                      router.push('/profile');
                    } else {
                      setShowMini(false); setShowBig(true); localStorage.removeItem('matchaboy-referral-big-dismissed'); 
                    }
                  }}
                  className="text-[11px] text-white/70 font-medium underline underline-offset-2"
                >
                  Bagikan sekarang →
                </button>
              </div>
              <button onClick={handleDismissMini} className="p-1 rounded-full hover:bg-white/10 transition-colors flex-shrink-0">
                <X className="w-4 h-4 text-white/60" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
