import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatRupiah(amount: number): string {
  const num = Math.round(Number(amount) || 0);
  return 'Rp ' + num.toLocaleString('id-ID');
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

export function getEffectiveProductDisplay(
  product: any,
  packagingStock?: { cupRegular: number; cupJumbo: number }
) {
  const isBundle = product?.modifiers?.isBundle === true;
  const promo = getActivePromo(product);
  const basePrice = promo ? promo.promoPrice : (product?.price ?? 0);
  const originalPrice = promo ? product.price : (product?.modifiers?.originalPrice || null);

  const cupRegular = packagingStock?.cupRegular ?? 999;
  const cupJumbo = packagingStock?.cupJumbo ?? 999;
  const isRegularOut = !isBundle && cupRegular <= 0 && cupJumbo > 0;
  const isBothOut = !isBundle && cupRegular <= 0 && cupJumbo <= 0;

  let displayPrice = basePrice;
  let sizeNotice: string | null = null;

  if (isRegularOut) {
    const largeSize = product?.modifiers?.sizes?.find(
      (s: any) => s.name?.toLowerCase().includes('large') || s.name?.toLowerCase().includes('jumbo')
    )?.price ?? 3000;
    displayPrice = basePrice + largeSize;
    sizeNotice = 'Hanya Jumbo';
  }

  return {
    displayPrice,
    originalPrice,
    basePrice,
    promo,
    isRegularOut,
    isBothOut,
    sizeNotice,
    isSoldOut: product?.badge === 'sold-out' || (isBothOut && product?.category !== 'pastries'),
  };
}
