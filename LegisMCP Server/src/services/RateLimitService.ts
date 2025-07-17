/**
 * Rate limiting service for API calls
 * Implements sliding window rate limiting
 */

export interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
}

export class RateLimitService {
  private requestTimestamps: number[] = [];
  private config: RateLimitConfig;

  constructor(config?: RateLimitConfig) {
    this.config = config || {
      maxRequests: 500, // Congress.gov default limit
      windowMs: 60 * 60 * 1000 // 1 hour window
    };
  }

  /**
   * Check if a request can be made without exceeding rate limits
   */
  canMakeRequest(): boolean {
    this.cleanupOldTimestamps();
    return this.requestTimestamps.length < this.config.maxRequests;
  }

  /**
   * Record a request
   */
  recordRequest(): void {
    this.requestTimestamps.push(Date.now());
  }

  /**
   * Get the number of remaining requests
   */
  getRemainingRequests(): number {
    this.cleanupOldTimestamps();
    return Math.max(0, this.config.maxRequests - this.requestTimestamps.length);
  }

  /**
   * Get the reset time for the rate limit window
   */
  getResetTime(): Date | null {
    if (this.requestTimestamps.length === 0) {
      return null;
    }

    const oldestTimestamp = this.requestTimestamps[0];
    return new Date(oldestTimestamp + this.config.windowMs);
  }

  /**
   * Clean up timestamps outside the current window
   */
  private cleanupOldTimestamps(): void {
    const cutoffTime = Date.now() - this.config.windowMs;
    this.requestTimestamps = this.requestTimestamps.filter(timestamp => timestamp > cutoffTime);
  }

  /**
   * Reset the rate limiter (useful for testing)
   */
  reset(): void {
    this.requestTimestamps = [];
  }
}