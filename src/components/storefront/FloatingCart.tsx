'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShoppingBag, ArrowRight } from 'lucide-react';
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

  if (!mounted) return null;
  if (pathname?.startsWith('/profile') || pathname?.startsWith('/checkout') || pathname?.startsWith('/orders')) return null;

  return (
    <AnimatePresence>
      {count > 0 && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 400, damping: 30 }}
          className="fixed bottom-16 md:bottom-0 left-0 right-0 z-50 px-4 pb-safe md:pb-4"
        >
          <div className="max-w-2xl mx-auto mb-3">
            <motion.button
              whileTap={{ scale: 0.98 }}
              onClick={() => router.push('/checkout')}
              className="w-full flex items-center justify-between gap-3 px-5 py-4 rounded-2xl gradient-brand text-white shadow-[0_8px_32px_rgba(27,67,50,0.35)] active:shadow-[0_4px_16px_rgba(27,67,50,0.3)] transition-shadow"
            >
              {/* Left: bag + count */}
              <div className="flex items-center gap-3">
                <div className="relative">
                  <ShoppingBag className="w-5 h-5" />
                  <motion.span
                    key={count}
                    initial={{ scale: 0.5 }}
                    animate={{ scale: 1 }}
                    className="absolute -top-2 -right-2 w-5 h-5 bg-brand-300 text-brand-900 text-[10px] font-bold rounded-full flex items-center justify-center"
                  >
                    {count}
                  </motion.span>
                </div>
                <div className="text-left">
                  <p className="text-xs text-brand-200">
                    {count} {count === 1 ? 'item' : 'items'}
                  </p>
                  <p className="font-bold text-sm">
                    {formatRupiah(price)}
                  </p>
                </div>
              </div>

              {/* Right: CTA */}
              <div className="flex items-center gap-2 font-semibold text-sm">
                <span>Checkout</span>
                <ArrowRight className="w-4 h-4" />
              </div>
            </motion.button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
