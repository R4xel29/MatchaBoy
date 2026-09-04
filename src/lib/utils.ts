import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

/**
 * Menggabungkan nama-nama class Tailwind secara kondisional dan aman dari duplikasi (*merge conflict*).
 *
 * @param {...ClassValue[]} inputs - Daftar kelas string, objek boolean, atau array kelas
 * @returns {string} String kelas Tailwind yang telah digabungkan rapi
 *
 * @example
 * ```typescript
 * cn('bg-orange-500', isSelected && 'border-2 border-amber-600');
 * ```
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs))
}

/**
 * Memformat nominal angka ke dalam format mata uang Rupiah Indonesia yang standar (contoh: "Rp 15.000").
 *
 * @param {number | string} amount - Jumlah nominal angka
 * @returns {string} String nominal terformat Rupiah
 *
 * @example
 * ```typescript
 * formatRupiah(15000); // 'Rp 15.000'
 * ```
 */
export function formatRupiah(amount: number | string): string {
  const num = Math.round(Number(amount) || 0);
  return 'Rp ' + num.toLocaleString('id-ID');
}

/**
 * Struktur objek konfigurasi promo aktif pada produk.
 */
export interface ProductPromoInfo {
  promoPrice: number;
  startDate: string;
  endDate: string;
  isActive: boolean;
}

/**
 * Mengambil informasi promo aktif pada suatu produk jika periode tanggal berlaku saat ini.
 *
 * @param {object} product - Objek produk dengan kolom `modifiers`
 * @returns {ProductPromoInfo | null} Objek promo aktif atau null jika tidak ada promo yang berlaku
 *
 * @example
 * ```typescript
 * const promo = getActivePromo(product);
 * if (promo) {
 *   console.log('Harga promo aktif:', promo.promoPrice);
 * }
 * ```
 */
export function getActivePromo(product: {
  modifiers?: string | Record<string, unknown> | null;
  [key: string]: unknown;
} | null | undefined): ProductPromoInfo | null {
  if (!product || !product.modifiers) return null;
  try {
    const mods = typeof product.modifiers === 'string' 
      ? JSON.parse(product.modifiers) 
      : product.modifiers;
    if (mods && typeof mods === 'object' && 'promo' in mods) {
      const promo = (mods as { promo?: ProductPromoInfo }).promo;
      if (promo && promo.isActive) {
        const now = new Date();
        const start = new Date(promo.startDate);
        const end = new Date(promo.endDate);
        if (now >= start && now <= end) {
          return promo;
        }
      }
    }
  } catch (e) {
    console.error('Error parsing modifiers in getActivePromo:', e);
  }
  return null;
}

/**
 * Mendapatkan harga berlaku saat ini untuk suatu produk (harga promo jika ada, atau harga dasar).
 *
 * @param {object} product - Objek produk
 * @returns {number} Harga per unit produk saat ini
 *
 * @example
 * ```typescript
 * const price = getCurrentProductPrice(product);
 * ```
 */
export function getCurrentProductPrice(product: {
  price?: number;
  modifiers?: string | Record<string, unknown> | null;
  [key: string]: unknown;
} | null | undefined): number {
  const promo = getActivePromo(product);
  return promo ? promo.promoPrice : (product?.price ?? 0);
}

/**
 * Hasil kalkulasi status tampilan dan ketersediaan produk berdasarkan stok cup kemasan.
 */
export interface EffectiveProductDisplayResult {
  /** Harga yang harus ditampilkan di katalog */
  displayPrice: number;
  /** Harga asli sebelum diskon promo jika ada */
  originalPrice: number | null;
  /** Harga dasar reguler produk */
  basePrice: number;
  /** Data objek promo aktif */
  promo: ProductPromoInfo | null;
  /** Apakah cup reguler habis dan hanya tersedia ukuran jumbo */
  isRegularOut: boolean;
  /** Apakah kedua cup (reguler dan jumbo) habis */
  isBothOut: boolean;
  /** Catatan ukuran khusus (misal: "Hanya Jumbo") */
  sizeNotice: string | null;
  /** Apakah produk habis (sold-out) */
  isSoldOut: boolean;
}

/**
 * Menghitung harga efektif dan ketersediaan varian produk berdasarkan sisa stok kemasan cup.
 *
 * Mendukung skenario:
 * - Jika cup Regular habis namun cup Jumbo masih ada, produk otomatis diarahkan ke ukuran Jumbo (+harga large).
 * - Jika kedua cup habis, produk otomatis berstatus `isSoldOut: true`.
 *
 * @param {object} product - Objek produk katalog
 * @param {{ cupRegular: number; cupJumbo: number }} [packagingStock] - Stok fisik cup saat ini
 * @returns {EffectiveProductDisplayResult} Status tampilan dan harga efektif
 *
 * @example
 * ```typescript
 * const display = getEffectiveProductDisplay(product, { cupRegular: 0, cupJumbo: 10 });
 * console.log('Harga:', display.displayPrice, 'Catatan:', display.sizeNotice);
 * ```
 */
export function getEffectiveProductDisplay(
  product: {
    price?: number;
    badge?: string;
    category?: string;
    modifiers?: string | {
      isBundle?: boolean;
      originalPrice?: number;
      sizes?: Array<{ name?: string; price?: number }>;
      promo?: ProductPromoInfo;
      [key: string]: unknown;
    } | null;
    [key: string]: unknown;
  } | null | undefined,
  packagingStock?: { cupRegular: number; cupJumbo: number }
): EffectiveProductDisplayResult {
  let parsedMods: {
    isBundle?: boolean;
    originalPrice?: number;
    sizes?: Array<{ name?: string; price?: number }>;
    promo?: ProductPromoInfo;
  } | null = null;

  if (product?.modifiers) {
    if (typeof product.modifiers === 'string') {
      try {
        parsedMods = JSON.parse(product.modifiers);
      } catch {}
    } else {
      parsedMods = product.modifiers;
    }
  }

  const isBundle = parsedMods?.isBundle === true;
  const promo = getActivePromo(product);
  const basePrice = promo ? promo.promoPrice : (product?.price ?? 0);
  const originalPrice = promo ? (product?.price ?? null) : (parsedMods?.originalPrice || null);

  const cupRegular = packagingStock?.cupRegular ?? 999;
  const cupJumbo = packagingStock?.cupJumbo ?? 999;
  const isRegularOut = !isBundle && cupRegular <= 0 && cupJumbo > 0;
  const isBothOut = !isBundle && cupRegular <= 0 && cupJumbo <= 0;

  let displayPrice = basePrice;
  let sizeNotice: string | null = null;

  if (isRegularOut) {
    const largeSize = parsedMods?.sizes?.find(
      (s) => s.name?.toLowerCase().includes('large') || s.name?.toLowerCase().includes('jumbo')
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
