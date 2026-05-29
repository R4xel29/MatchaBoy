/**
 * ✅ BUG FIX #2: Redis-based distributed rate limiting
 * 
 * This replaces the in-memory rate limiter with a Redis-based solution
 * that works across multiple serverless instances.
 * 
 * Setup Instructions:
 * 1. Sign up for Upstash Redis (free tier): https://upstash.com
 * 2. Create a Redis database
 * 3. Add UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN to .env
 * 4. Update imports in API routes to use this file instead of rate-limit.ts
 */

import { Redis } from '@upstash/redis';

// Initialize Redis client (will use env vars automatically)
let redis: Redis | null = null;

try {
  if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
    redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN,
    });
  }
} catch (error) {
  console.error('[Rate Limit] Failed to initialize Redis:', error);
}

interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
}

interface RateLimitResult {
  success: boolean;
  remaining: number;
  reset?: number;
}

/**
 * Redis-based sliding window rate limiter
 * Falls back to in-memory if Redis is not configured
 */
export async function rateLimit(
  key: string,
  config: RateLimitConfig
): Promise<RateLimitResult> {
  // If Redis is not configured, fall back to in-memory (for development)
  if (!redis) {
    console.warn('[Rate Limit] Redis not configured, using in-memory fallback');
    return inMemoryRateLimit(key, config);
  }

  try {
    const now = Date.now();
    const windowStart = now - config.windowMs;
    const redisKey = `ratelimit:${key}`;

    // Use Redis sorted set for sliding window
    // Remove old entries outside the window
    await redis.zremrangebyscore(redisKey, 0, windowStart);

    // Count current requests in window
    const count = await redis.zcard(redisKey);

    if (count >= config.maxRequests) {
      // Get the oldest timestamp to calculate reset time
      const oldest: any = await redis.zrange(redisKey, 0, 0, { withScores: true });
      const resetTime = oldest.length > 0 
        ? Math.ceil((oldest[0].score + config.windowMs) / 1000) 
        : Math.ceil((now + config.windowMs) / 1000);

      return {
        success: false,
        remaining: 0,
        reset: resetTime,
      };
    }

    // Add current request
    await redis.zadd(redisKey, { score: now, member: `${now}-${Math.random()}` });

    // Set expiry on the key (cleanup)
    await redis.expire(redisKey, Math.ceil(config.windowMs / 1000) + 10);

    return {
      success: true,
      remaining: config.maxRequests - count - 1,
      reset: Math.ceil((now + config.windowMs) / 1000),
    };
  } catch (error) {
    console.error('[Rate Limit] Redis error, falling back to in-memory:', error);
    return inMemoryRateLimit(key, config);
  }
}

/**
 * In-memory fallback rate limiter (for development/fallback)
 * ⚠️ This is NOT suitable for production with multiple instances
 */
const requests = new Map<string, number[]>();

function inMemoryRateLimit(
  key: string,
  config: RateLimitConfig
): RateLimitResult {
  const now = Date.now();
  const windowStart = now - config.windowMs;

  // Get existing timestamps and filter expired ones
  const timestamps = (requests.get(key) || []).filter(t => t > windowStart);

  if (timestamps.length >= config.maxRequests) {
    requests.set(key, timestamps);
    return {
      success: false,
      remaining: 0,
      reset: Math.ceil((timestamps[0] + config.windowMs) / 1000),
    };
  }

  timestamps.push(now);
  requests.set(key, timestamps);

  return {
    success: true,
    remaining: config.maxRequests - timestamps.length,
    reset: Math.ceil((now + config.windowMs) / 1000),
  };
}

// Cleanup stale entries every 5 minutes (only for in-memory fallback)
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now();
    const maxAge = 10 * 60 * 1000; // 10 min
    for (const [key, timestamps] of requests.entries()) {
      const valid = timestamps.filter(t => t > now - maxAge);
      if (valid.length === 0) {
        requests.delete(key);
      } else {
        requests.set(key, valid);
      }
    }
  }, 5 * 60 * 1000);
}

/**
 * Helper to extract client identifier from request.
 */
export function getClientId(req: Request, userId?: string): string {
  if (userId) return `user:${userId}`;
  const forwarded = req.headers.get('x-forwarded-for');
  const ip = forwarded?.split(',')[0]?.trim() || 'unknown';
  return `ip:${ip}`;
}

/**
 * Rate limit presets for common use cases
 */
export const RateLimitPresets = {
  // Strict limits for sensitive operations
  CHECKOUT: { maxRequests: 5, windowMs: 60_000 }, // 5 per minute
  LOGIN: { maxRequests: 5, windowMs: 60_000 }, // 5 per minute
  REGISTER: { maxRequests: 3, windowMs: 60_000 }, // 3 per minute
  
  // Moderate limits for API endpoints
  API_WRITE: { maxRequests: 20, windowMs: 60_000 }, // 20 per minute
  API_READ: { maxRequests: 60, windowMs: 60_000 }, // 60 per minute
  
  // Generous limits for public endpoints
  PUBLIC: { maxRequests: 100, windowMs: 60_000 }, // 100 per minute
};
