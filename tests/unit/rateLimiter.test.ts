import { describe, expect, it } from "vitest";
import { createRateLimiter } from "@/core/rateLimiter";

function clockFrom(times: number[]): () => number {
  let cursor = 0;
  return () => {
    const next = times[cursor];
    if (next === undefined) {
      const last = times[times.length - 1] ?? 0;
      return last;
    }
    cursor += 1;
    return next;
  };
}

describe("createRateLimiter", () => {
  it("allows up to the configured limit per minute and rejects the next", () => {
    const fixedNow = clockFrom([1000, 1100, 1200, 1300]);
    const limiter = createRateLimiter({
      defaultCallsPerMinute: 3,
      now: fixedNow,
    });
    expect(limiter.acquire("reading").allowed).toBe(true);
    expect(limiter.acquire("reading").allowed).toBe(true);
    expect(limiter.acquire("reading").allowed).toBe(true);
    const blocked = limiter.acquire("reading");
    expect(blocked.allowed).toBe(false);
    expect(blocked.retryAfterMs).toBeGreaterThan(0);
  });

  it("lets calls through again once the window slides", () => {
    const fixedNow = clockFrom([1000, 2000, 3000, 70_000]);
    const limiter = createRateLimiter({
      defaultCallsPerMinute: 3,
      now: fixedNow,
    });
    limiter.acquire("reading");
    limiter.acquire("reading");
    limiter.acquire("reading");
    const result = limiter.acquire("reading");
    expect(result.allowed).toBe(true);
  });

  it("isolates buckets", () => {
    const fixedNow = clockFrom([1000, 1100, 1200, 1300, 1400, 1500]);
    const limiter = createRateLimiter({
      defaultCallsPerMinute: 2,
      now: fixedNow,
    });
    expect(limiter.acquire("reading").allowed).toBe(true);
    expect(limiter.acquire("reading").allowed).toBe(true);
    expect(limiter.acquire("reading").allowed).toBe(false);
    expect(limiter.acquire("critic").allowed).toBe(true);
    expect(limiter.acquire("critic").allowed).toBe(true);
    expect(limiter.acquire("critic").allowed).toBe(false);
  });

  it("honors a per-bucket limit override", () => {
    const fixedNow = clockFrom([1000, 1100, 1200, 1300]);
    const limiter = createRateLimiter({
      defaultCallsPerMinute: 100,
      now: fixedNow,
    });
    limiter.setLimit("critic", 1);
    expect(limiter.acquire("critic").allowed).toBe(true);
    expect(limiter.acquire("critic").allowed).toBe(false);
    expect(limiter.acquire("reading").allowed).toBe(true);
  });

  it("reset clears a single bucket", () => {
    const fixedNow = clockFrom([1000, 2000, 3000, 4000]);
    const limiter = createRateLimiter({
      defaultCallsPerMinute: 1,
      now: fixedNow,
    });
    expect(limiter.acquire("reading").allowed).toBe(true);
    expect(limiter.acquire("reading").allowed).toBe(false);
    limiter.reset("reading");
    expect(limiter.acquire("reading").allowed).toBe(true);
  });
});
