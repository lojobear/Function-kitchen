/**
 * Token Bucket Rate Limiter
 * Prevents API exhaustion by limiting requests per time period
 */

export interface RateLimitConfig {
  tokensPerMinute: number; // Allowed requests per minute
  maxBurst: number;        // Max requests allowed in a burst
}

type RateLimitListener = () => void;

class TokenBucket {
  private tokens: number;
  private lastRefillTime: number;
  private readonly tokensPerMinute: number;
  private readonly maxBurst: number;
  private requestLog: number[] = [];
  private listeners: Set<RateLimitListener> = new Set();

  constructor(config: RateLimitConfig) {
    this.tokensPerMinute = config.tokensPerMinute;
    this.maxBurst = config.maxBurst;
    this.tokens = config.maxBurst;
    this.lastRefillTime = Date.now();
  }

  subscribe(listener: RateLimitListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify() {
    this.listeners.forEach((l) => {
      try {
        l();
      } catch (e) {
        console.warn('Rate limit listener error:', e);
      }
    });
  }

  canConsume(weight: number = 1): boolean {
    this.refill();
    if (this.tokens >= weight) {
      this.tokens -= weight;
      this.requestLog.push(Date.now());
      this.notify();
      return true;
    }
    return false;
  }

  tryConsume(weight: number = 1): boolean {
    return this.canConsume(weight);
  }

  async waitAndConsume(weight: number = 1): Promise<void> {
    let attempts = 0;
    while (!this.canConsume(weight)) {
      if (attempts === 0) {
        console.log(`⏸️ Rate limited. Available tokens: ${Math.floor(this.tokens)}/${this.maxBurst}. Waiting...`);
      }
      const waitMs = this.getWaitTime();
      await new Promise((resolve) => setTimeout(resolve, waitMs));
      attempts++;
    }
  }

  private getWaitTime(): number {
    this.refill();
    if (this.tokens >= 1) return 0;
    const minuteInMs = 60 * 1000;
    const tokensPerMs = this.tokensPerMinute / minuteInMs;
    const neededMs = Math.ceil(1 / tokensPerMs);
    return Math.max(250, Math.min(neededMs, 3000));
  }

  private refill(): void {
    const now = Date.now();
    const elapsed = now - this.lastRefillTime;
    const tokensAdded = (elapsed / 60000) * this.tokensPerMinute;
    if (tokensAdded > 0) {
      this.tokens = Math.min(this.maxBurst, this.tokens + tokensAdded);
      this.lastRefillTime = now;
    }
  }

  getStatus() {
    this.refill();
    const oneMinuteAgo = Date.now() - 60000;
    this.requestLog = this.requestLog.filter((t) => t >= oneMinuteAgo);

    return {
      availableTokens: Math.floor(this.tokens),
      maxBurst: this.maxBurst,
      tokensPerMinute: this.tokensPerMinute,
      recentRequests: this.requestLog.length,
      isThrottled: this.tokens < 1,
    };
  }
}

// 20 requests per minute with a burst allowance of 5 (safe for Gemini free tier)
export const rateLimiter = new TokenBucket({
  tokensPerMinute: 20,
  maxBurst: 5,
});

export const synthesisLimiter = rateLimiter;
