import { Context, Next } from 'hono';
import { HTTPException } from '../utils/http-exception';

interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
  keyGenerator?: (c: Context) => string;
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
}

class RateLimitStore {
  private store = new Map<string, { count: number; resetTime: number; requests: number[] }>();
  private cleanupInterval: number | null = null;

  constructor() {
    // Cleanup old entries every 5 minutes
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 5 * 60 * 1000);
  }

  private cleanup() {
    const now = Date.now();
    for (const [key, data] of this.store.entries()) {
      if (data.resetTime <= now) {
        this.store.delete(key);
      }
    }
  }

  increment(key: string, windowMs: number): { count: number; resetTime: number; remaining: number } {
    const now = Date.now();
    const data = this.store.get(key) || { count: 0, resetTime: now + windowMs, requests: [] };
    
    // Clean up old requests within sliding window
    data.requests = data.requests.filter(timestamp => timestamp > now - windowMs);
    
    // Add current request
    data.requests.push(now);
    data.count = data.requests.length;
    
    // Update reset time if needed
    if (data.resetTime <= now) {
      data.resetTime = now + windowMs;
    }
    
    this.store.set(key, data);
    
    return {
      count: data.count,
      resetTime: data.resetTime,
      remaining: Math.max(0, data.count)
    };
  }

  get(key: string): { count: number; resetTime: number } | null {
    const data = this.store.get(key);
    if (!data) return null;
    
    const now = Date.now();
    if (data.resetTime <= now) {
      this.store.delete(key);
      return null;
    }
    
    return { count: data.count, resetTime: data.resetTime };
  }

  reset(key: string) {
    this.store.delete(key);
  }

  resetAll() {
    this.store.clear();
  }
}

const globalStore = new RateLimitStore();

export const rateLimiter = (config: RateLimitConfig) => {
  return async (c: Context, next: Next) => {
    const key = config.keyGenerator ? config.keyGenerator(c) : c.req.header('cf-connecting-ip') || 'unknown';
    const userAgent = c.req.header('user-agent') || 'unknown';
    const rateLimitKey = `${key}:${userAgent}`;

    const result = globalStore.increment(rateLimitKey, config.windowMs);
    
    // Set rate limit headers
    c.header('X-RateLimit-Limit', config.maxRequests.toString());
    c.header('X-RateLimit-Remaining', Math.max(0, config.maxRequests - result.count).toString());
    c.header('X-RateLimit-Reset', Math.ceil(result.resetTime / 1000).toString());
    
    if (result.count > config.maxRequests) {
      c.header('Retry-After', Math.ceil((result.resetTime - Date.now()) / 1000).toString());
      throw new HTTPException(429, { 
        message: 'Too Many Requests',
        res: new Response(JSON.stringify({
          error: 'Rate limit exceeded',
          message: `Maximum ${config.maxRequests} requests allowed per ${config.windowMs / 1000} seconds`,
          retryAfter: Math.ceil((result.resetTime - Date.now()) / 1000)
        }), {
          status: 429,
          headers: {
            'Content-Type': 'application/json',
            'X-RateLimit-Limit': config.maxRequests.toString(),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': Math.ceil(result.resetTime / 1000).toString(),
            'Retry-After': Math.ceil((result.resetTime - Date.now()) / 1000).toString()
          }
        })
      });
    }

    await next();
  };
};

// Pre-configured rate limiters for different use cases
export const rateLimiters = {
  // General API rate limiting - 100 requests per minute per IP
  general: rateLimiter({
    maxRequests: 100,
    windowMs: 60 * 1000, // 1 minute
  }),
  
  // Authenticated user rate limiting - 200 requests per minute per user
  authenticated: rateLimiter({
    maxRequests: 200,
    windowMs: 60 * 1000, // 1 minute
    keyGenerator: (c) => {
      const user = c.get('user');
      return user?.id?.toString() || c.req.header('cf-connecting-ip') || 'unknown';
    }
  }),
  
  // Strict rate limiting for resource-intensive endpoints
  strict: rateLimiter({
    maxRequests: 10,
    windowMs: 60 * 1000, // 1 minute
    keyGenerator: (c) => {
      const user = c.get('user');
      return user?.id?.toString() || c.req.header('cf-connecting-ip') || 'unknown';
    }
  })
};