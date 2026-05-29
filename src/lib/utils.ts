import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatRupiah(amount: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

export function getActivePromo(product: any): { promoPrice: number; startDate: string; endDate: string; isActive: boolean } | null {
  if (!product || !product.modifiers) return null;
  try {
    const mods = typeof product.modifiers === 'string' ? JSON.parse(product.modifiers) : product.modifiers;
    if (mods?.promo && mods.promo.isActive) {
      const now = new Date();
      const start = new Date(mods.promo.startDate);
      const end = new Date(mods.promo.endDate);
      if (now >= start && now <= end) {
        return mods.promo;
      }
    }
  } catch (e) {
    console.error('Error parsing modifiers in getActivePromo:', e);
  }
  return null;
}

export function getCurrentProductPrice(product: any): number {
  const promo = getActivePromo(product);
  return promo ? promo.promoPrice : (product?.price ?? 0);
}
