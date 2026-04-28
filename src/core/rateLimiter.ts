export interface AcquireResult {
  allowed: boolean;
  retryAfterMs: number;
}

export interface RateLimiterOptions {
  defaultCallsPerMinute: number;
  windowMs?: number;
  now?: () => number;
}

export interface RateLimiter {
  acquire: (bucket: string) => AcquireResult;
  setLimit: (bucket: string, callsPerMinute: number) => void;
  getLimit: (bucket: string) => number;
  reset: (bucket?: string) => void;
}

export function createRateLimiter(options: RateLimiterOptions): RateLimiter {
  const windowMs = options.windowMs ?? 60_000;
  const now = options.now ?? (() => Date.now());
  const limits = new Map<string, number>();
  const recentTimestamps = new Map<string, number[]>();

  function limitFor(bucket: string): number {
    return limits.get(bucket) ?? options.defaultCallsPerMinute;
  }

  function pruneOlderThan(bucket: string, threshold: number): number[] {
    const stamps = recentTimestamps.get(bucket) ?? [];
    const fresh = stamps.filter((stamp) => stamp > threshold);
    recentTimestamps.set(bucket, fresh);
    return fresh;
  }

  return {
    acquire(bucket) {
      const currentTime = now();
      const threshold = currentTime - windowMs;
      const fresh = pruneOlderThan(bucket, threshold);
      const limit = limitFor(bucket);
      if (fresh.length < limit) {
        fresh.push(currentTime);
        recentTimestamps.set(bucket, fresh);
        return { allowed: true, retryAfterMs: 0 };
      }
      const oldest = fresh[0]!;
      const retryAfterMs = Math.max(0, oldest + windowMs - currentTime);
      return { allowed: false, retryAfterMs };
    },

    setLimit(bucket, callsPerMinute) {
      if (callsPerMinute < 0)
        throw new Error("callsPerMinute must be non-negative");
      limits.set(bucket, callsPerMinute);
    },

    getLimit(bucket) {
      return limitFor(bucket);
    },

    reset(bucket) {
      if (bucket) {
        recentTimestamps.delete(bucket);
        return;
      }
      recentTimestamps.clear();
    },
  };
}
