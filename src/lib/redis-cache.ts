import { Redis } from '@upstash/redis';
import { revalidatePath } from 'next/cache';

// Initialize Redis client securely with environment variables
export let redisClient: Redis | null = null;

try {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (url && token) {
    redisClient = new Redis({
      url,
      token,
    });
  }
} catch (error) {
  console.warn('[Arum Seduh Cache] Failed to initialize Upstash Redis client, falling back to DB:', error);
  redisClient = null;
}

// TTL Constants (in seconds)
export const CACHE_TTL = {
  DEFAULT: 900, // 15 minutes
  PRODUCTS: 900, // 15 minutes
  CATEGORIES: 900, // 15 minutes
  BANNERS: 900, // 15 minutes
  POPUPS: 900, // 15 minutes
  REVIEWS: 900, // 15 minutes
  STORIES: 900, // 15 minutes
  WEATHER: 600, // 10 minutes
};

// Standardized Cache Keys
export const CACHE_KEYS = {
  PRODUCTS_ALL: 'cache:products:all',
  CATEGORIES_ALL: 'cache:categories:all',
  BANNERS_ACTIVE: 'cache:banners:active',
  POPUPS_ACTIVE: 'cache:popups:active',
  REVIEWS_FEATURED: 'cache:reviews:featured',
  STORIES_ACTIVE: 'cache:stories:active',
  WEATHER: (lat: number, lon: number, hour: number) => `cache:weather:${lat.toFixed(2)}_${lon.toFixed(2)}_${hour}`,
};

/**
 * High-performance Cache-Aside wrapper dengan proteksi race timeout (Rule 4).
 * Mencoba membaca data dari Upstash Redis dengan batas waktu fallback 800ms.
 * Jika key tidak ditemukan, terjadi timeout, atau terjadi error jaringan:
 * langsung menjalankan callback `fetcher` (misalnya query Prisma DB),
 * lalu menyimpan hasilnya ke Redis secara asinkron (non-blocking).
 *
 * @template T - Tipe data yang disimpan/di-fetch
 * @param key - Cache key unik (misal: CACHE_KEYS.PRODUCTS_ALL)
 * @param fetcher - Fungsi asinkron penarik data segar jika cache miss
 * @param ttlSeconds - Masa aktif cache dalam detik (default: 900 detik / 15 menit)
 * @param tags - Tag opsional untuk pelacakan invalidasi masa depan
 * @returns Data hasil cache atau data segar dari fetcher
 */
export async function getOrSetCache<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttlSeconds: number = CACHE_TTL.DEFAULT,
  tags?: string[]
): Promise<T> {
  if (!redisClient) {
    // Graceful fallback to database query
    return fetcher();
  }

  try {
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('Redis get timeout')), 800)
    );
    const cachedData = await Promise.race([redisClient.get<T>(key), timeoutPromise]);
    if (cachedData !== null && cachedData !== undefined) {
      return cachedData;
    }
  } catch (err) {
    console.warn(`[Arum Seduh Cache] Redis get error for key "${key}", falling back to DB:`, err);
  }

  // Execute database / source query
  const freshData = await fetcher();

  // Save into Redis asynchronously (non-blocking)
  if (redisClient && freshData !== null && freshData !== undefined) {
    redisClient.set(key, freshData, { ex: ttlSeconds }).catch((err) => {
      console.warn(`[Arum Seduh Cache] Redis set error for key "${key}":`, err);
    });
  }

  return freshData;
}

/**
 * Mengambil nilai cache secara langsung dari Redis dengan fallback timeout 800ms.
 *
 * @template T - Tipe data yang diharapkan
 * @param key - Kunci Redis yang akan dibaca
 * @returns Nilai data cache jika ditemukan, atau null jika miss/error/timeout
 */
export async function getCache<T>(key: string): Promise<T | null> {
  if (!redisClient) return null;
  try {
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('Redis getCache timeout')), 800)
    );
    return await Promise.race([redisClient.get<T>(key), timeoutPromise]);
  } catch (err) {
    console.warn(`[Arum Seduh Cache] Redis getCache error for key "${key}":`, err);
    return null;
  }
}

/**
 * Menyimpan data ke Redis secara langsung dengan TTL tertentu.
 *
 * @template T - Tipe data yang disimpan
 * @param key - Kunci cache tujuan
 * @param data - Payload data yang akan diserialisasi
 * @param ttlSeconds - Durasi simpan dalam detik (default 900s)
 */
export async function setCache<T>(
  key: string,
  data: T,
  ttlSeconds: number = CACHE_TTL.DEFAULT
): Promise<void> {
  if (!redisClient) return;
  try {
    await redisClient.set(key, data, { ex: ttlSeconds });
  } catch (err) {
    console.warn(`[Arum Seduh Cache] Redis setCache error for key "${key}":`, err);
  }
}

/**
 * Menghapus satu atau lebih kunci cache dari Redis (cache invalidation).
 *
 * @param keys - Daftar kunci Redis yang akan dihapus
 */
export async function delCache(...keys: string[]): Promise<void> {
  if (!redisClient || keys.length === 0) return;
  try {
    await redisClient.del(...keys);
  } catch (err) {
    console.warn(`[Arum Seduh Cache] Redis delCache error for keys [${keys.join(', ')}]:`, err);
  }
}

/**
 * Menginvalidasi cache katalog produk dan kategori, serta memicu revalidasi rute Next.js.
 */
export async function invalidateProductCache(): Promise<void> {
  try {
    await delCache(CACHE_KEYS.PRODUCTS_ALL, CACHE_KEYS.CATEGORIES_ALL);
  } catch (err) {
    console.warn('[Arum Seduh Cache] Error invalidating product cache:', err);
  }

  try {
    revalidatePath('/');
    revalidatePath('/api/products');
  } catch {
    // Ignore revalidate errors in non-request contexts
  }
}

/**
 * Menginvalidasi cache kategori dan produk terkait.
 */
export async function invalidateCategoryCache(): Promise<void> {
  try {
    await delCache(CACHE_KEYS.CATEGORIES_ALL, CACHE_KEYS.PRODUCTS_ALL);
  } catch (err) {
    console.warn('[Arum Seduh Cache] Error invalidating category cache:', err);
  }

  try {
    revalidatePath('/');
    revalidatePath('/api/products');
  } catch {
    // Ignore revalidate errors in non-request contexts
  }
}

/**
 * Menginvalidasi cache banner promosi utama (Hero Banners) dan revalidasi path homepage.
 */
export async function invalidateBannerCache(): Promise<void> {
  try {
    await delCache(CACHE_KEYS.BANNERS_ACTIVE);
  } catch (err) {
    console.warn('[Arum Seduh Cache] Error invalidating banner cache:', err);
  }

  try {
    revalidatePath('/');
  } catch {
    // Ignore revalidate errors in non-request contexts
  }
}

/**
 * Menginvalidasi cache popup promosi aktif dan revalidasi endpoint terkait.
 */
export async function invalidatePopupCache(): Promise<void> {
  try {
    await delCache(CACHE_KEYS.POPUPS_ACTIVE);
  } catch (err) {
    console.warn('[Arum Seduh Cache] Error invalidating popup cache:', err);
  }

  try {
    revalidatePath('/api/promo-popup/active');
  } catch {
    // Ignore revalidate errors in non-request contexts
  }
}

/**
 * Menginvalidasi cache testimoni/ulasan pilihan pelanggan (featured reviews).
 */
export async function invalidateReviewsCache(): Promise<void> {
  try {
    await delCache(CACHE_KEYS.REVIEWS_FEATURED);
  } catch (err) {
    console.warn('[Arum Seduh Cache] Error invalidating reviews cache:', err);
  }

  try {
    revalidatePath('/api/reviews/featured');
  } catch {
    // Ignore revalidate errors in non-request contexts
  }
}

/**
 * Menginvalidasi cache cerita aktif toko (Arum Seduh Instagram-style stories).
 */
export async function invalidateStoriesCache(): Promise<void> {
  try {
    await delCache(CACHE_KEYS.STORIES_ACTIVE);
  } catch (err) {
    console.warn('[Arum Seduh Cache] Error invalidating stories cache:', err);
  }

  try {
    revalidatePath('/api/stories');
  } catch {
    // Ignore revalidate errors in non-request contexts
  }
}

/**
 * Menginvalidasi seluruh kunci cache aplikasi Arum Seduh secara serentak (master cache flush).
 */
export async function invalidateAllCaches(): Promise<void> {
  try {
    await delCache(
      CACHE_KEYS.PRODUCTS_ALL,
      CACHE_KEYS.CATEGORIES_ALL,
      CACHE_KEYS.BANNERS_ACTIVE,
      CACHE_KEYS.POPUPS_ACTIVE,
      CACHE_KEYS.REVIEWS_FEATURED,
      CACHE_KEYS.STORIES_ACTIVE
    );
  } catch (err) {
    console.warn('[Arum Seduh Cache] Error invalidating all caches:', err);
  }

  try {
    revalidatePath('/');
    revalidatePath('/api/products');
    revalidatePath('/api/promo-popup/active');
    revalidatePath('/api/reviews/featured');
    revalidatePath('/api/stories');
  } catch {
    // Ignore revalidate errors in non-request contexts
  }
}
