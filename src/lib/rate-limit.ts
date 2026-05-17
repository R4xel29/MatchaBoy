/**
 * Simple in-memory rate limiter using sliding window.
 * For production, use Redis-based rate limiting.
 */

const requests = new Map<string, number[]>();

interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
}

export function rateLimit(key: string, config: RateLimitConfig): { success: boolean; remaining: number } {
  const now = Date.now();
  const windowStart = now - config.windowMs;

  // Get existing timestamps and filter expired ones
  const timestamps = (requests.get(key) || []).filter(t => t > windowStart);

  if (timestamps.length >= config.maxRequests) {
    requests.set(key, timestamps);
    return { success: false, remaining: 0 };
  }

  timestamps.push(now);
  requests.set(key, timestamps);

  return { success: true, remaining: config.maxRequests - timestamps.length };
}

// Cleanup stale entries every 5 minutes
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

/**
 * Helper to extract client identifier from request.
 */
export function getClientId(req: Request, userId?: string): string {
  if (userId) return `user:${userId}`;
  const forwarded = req.headers.get('x-forwarded-for');
  const ip = forwarded?.split(',')[0]?.trim() || 'unknown';
  return `ip:${ip}`;
}
