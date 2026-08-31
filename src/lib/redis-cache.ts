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
 * High-performance Cache-Aside wrapper.
 * Attempts to retrieve cached value from Redis. If missing or on error,
 * executes fetcher, caches result in background, and returns fresh data.
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
    const cachedData = await redisClient.get<T>(key);
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
 * Retrieve cached item directly.
 */
export async function getCache<T>(key: string): Promise<T | null> {
  if (!redisClient) return null;
  try {
    return await redisClient.get<T>(key);
  } catch (err) {
    console.warn(`[Arum Seduh Cache] Redis getCache error for key "${key}":`, err);
    return null;
  }
}

/**
 * Set cache item directly.
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
 * Invalidate specific cache keys.
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
 * Invalidate Product and Catalog caches.
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
 * Invalidate Category caches.
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
 * Invalidate Hero Banner caches.
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
 * Invalidate Promo Popup caches.
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
 * Invalidate Featured Review caches.
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
 * Invalidate Active Stories caches.
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
 * Invalidate All Arum Seduh caches.
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
