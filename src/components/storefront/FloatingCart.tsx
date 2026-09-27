'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShoppingBag, ArrowRight, Sparkles } from 'lucide-react';
import { useCartStore } from '@/stores/cart-store';
import { formatRupiah } from '@/lib/utils';
import { useRouter, usePathname } from 'next/navigation';

export function FloatingCart() {
  const [mounted, setMounted] = useState(false);
  const items = useCartStore((s) => s.items);
  const totalItems = useCartStore((s) => s.totalItems);
  const totalPrice = useCartStore((s) => s.totalPrice);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    setMounted(true);
  }, []);

  const count = totalItems();
  const price = totalPrice();
  const discount = useCartStore((s) => (s.getVoucherDiscount ? s.getVoucherDiscount() : 0));
  const finalPrice = Math.max(0, price - discount);

  if (!mounted) return null;
  if (
    pathname?.startsWith('/profile') ||
    pathname?.startsWith('/checkout') ||
    pathname?.startsWith('/orders') ||
    pathname?.startsWith('/spmb')
  ) {
    return null;
  }

  return (
    <AnimatePresence>
      {count > 0 && (
        <motion.div
          initial={{ y: 100, opacity: 0, scale: 0.96 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          exit={{ y: 100, opacity: 0, scale: 0.96 }}
          transition={{ type: 'spring', stiffness: 420, damping: 32 }}
          className="fixed bottom-[92px] md:bottom-5 left-0 right-0 z-[85] px-3 sm:px-4 pb-safe pointer-events-none"
        >
          <div className="max-w-md md:max-w-xl mx-auto pointer-events-auto">
            <motion.button
              type="button"
              whileHover={{ scale: 1.01, y: -2 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => router.push('/checkout')}
              className="relative w-full flex items-center justify-between gap-3 px-3.5 sm:px-5 py-3 rounded-[24px] bg-gradient-to-r from-[#231810]/95 via-[#352316]/95 to-[#231810]/95 backdrop-blur-xl text-white shadow-[0_16px_40px_rgba(35,24,16,0.38),0_2px_12px_rgba(234,88,12,0.15)] border border-amber-400/35 transition-all cursor-pointer overflow-hidden group"
            >
              {/* Subtle top specular highlight */}
              <div className="absolute inset-x-8 top-0 h-[1px] bg-gradient-to-r from-transparent via-amber-300/45 to-transparent pointer-events-none" />

              {/* Left: bag + count + price details */}
              <div className="flex items-center gap-3 min-w-0">
                <div className="relative shrink-0">
                  <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center shadow-md shadow-orange-500/30 ring-1 ring-amber-300/40">
                    <ShoppingBag className="w-5 h-5 text-white" />
                  </div>
                  <motion.span
                    key={count}
                    initial={{ scale: 0.5 }}
                    animate={{ scale: 1 }}
                    className="absolute -top-1.5 -right-1.5 min-w-[20px] h-5 px-1 bg-white text-orange-700 text-[10px] font-black rounded-full flex items-center justify-center border-2 border-[#231810] shadow-xs"
                  >
                    {count}
                  </motion.span>
                </div>

                <div className="text-left min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <p className="text-[11px] font-bold text-amber-200/95 tracking-tight">
                      {count} Menu Dipilih
                    </p>
                    {discount > 0 && (
                      <span className="bg-emerald-500/95 text-white text-[9px] font-extrabold px-2 py-0.5 rounded-full shadow-xs flex items-center gap-1">
                        <Sparkles className="w-2.5 h-2.5" />
                        <span>Hemat {formatRupiah(discount)}</span>
                      </span>
                    )}
                  </div>

                  {discount > 0 ? (
                    <div className="mt-0.5">
                      <p className="font-extrabold text-sm sm:text-base text-white tracking-tight leading-tight">
                        {formatRupiah(finalPrice)}
                      </p>
                      <p className="text-[10px] font-semibold text-amber-200/80 truncate">
                        {formatRupiah(price)} - {formatRupiah(discount)} = {formatRupiah(finalPrice)}
                      </p>
                    </div>
                  ) : (
                    <p className="font-extrabold text-sm sm:text-base text-white mt-0.5 tracking-tight">
                      {formatRupiah(finalPrice)}
                    </p>
                  )}
                </div>
              </div>

              {/* Right: CTA Pill */}
              <div className="px-3.5 sm:px-4 py-2.5 rounded-2xl bg-gradient-to-r from-orange-500 to-amber-500 group-hover:from-orange-600 group-hover:to-amber-600 text-white flex items-center gap-1.5 font-extrabold text-xs sm:text-sm shadow-md shadow-orange-500/25 shrink-0 transition-all">
                <span>Lanjut Pesan</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
              </div>
            </motion.button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
