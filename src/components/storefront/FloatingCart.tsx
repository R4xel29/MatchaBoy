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
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 400, damping: 30 }}
          className="fixed bottom-20 md:bottom-4 left-0 right-0 z-[85] px-4 pb-safe pointer-events-none"
        >
          <div className="max-w-xl mx-auto pointer-events-auto">
            <motion.button
              whileHover={{ scale: 1.01, y: -2 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => router.push('/checkout')}
              className="w-full flex items-center justify-between gap-3 px-4 sm:px-5 py-3.5 rounded-3xl bg-gradient-to-r from-[#2A1F16] via-[#3A2818] to-[#2A1F16] text-white shadow-[0_16px_40px_rgba(42,31,22,0.35)] border border-amber-400/30 transition-all cursor-pointer"
            >
              {/* Left: bag + count */}
              <div className="flex items-center gap-3.5 min-w-0">
                <div className="relative shrink-0">
                  <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center shadow-md shadow-orange-500/30">
                    <ShoppingBag className="w-5 h-5 text-white" />
                  </div>
                  <motion.span
                    key={count}
                    initial={{ scale: 0.5 }}
                    animate={{ scale: 1 }}
                    className="absolute -top-1.5 -right-1.5 min-w-[20px] h-5 px-1 bg-white text-orange-700 text-[10px] font-black rounded-full flex items-center justify-center border-2 border-[#2A1F16] shadow-xs"
                  >
                    {count}
                  </motion.span>
                </div>
                <div className="text-left min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-[11px] font-bold text-amber-200/90">
                      {count} {count === 1 ? 'Menu Dipilih' : 'Menu Dipilih'}
                    </p>
                    {discount > 0 && (
                      <span className="bg-emerald-500 text-white text-[9px] font-extrabold px-2 py-0.5 rounded-full shadow-xs flex items-center gap-1">
                        <Sparkles className="w-2.5 h-2.5" />
                        <span>Hemat {formatRupiah(discount)}</span>
                      </span>
                    )}
                  </div>
                  <p className="font-extrabold text-sm sm:text-base text-white mt-0.5 tracking-tight">
                    {discount > 0 && (
                      <span className="line-through text-amber-200/50 mr-1.5 text-xs font-semibold">
                        {formatRupiah(price)}
                      </span>
                    )}
                    {formatRupiah(finalPrice)}
                  </p>
                </div>
              </div>

              {/* Right: CTA */}
              <div className="px-4 py-2.5 rounded-2xl bg-gradient-to-r from-orange-500 to-amber-500 text-white flex items-center gap-1.5 font-extrabold text-xs sm:text-sm shadow-md shadow-orange-500/25 shrink-0">
                <span>Lanjut Pesan</span>
                <ArrowRight className="w-4 h-4" />
              </div>
            </motion.button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
