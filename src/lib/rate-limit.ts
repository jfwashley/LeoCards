/**
 * Simple in-memory sliding-window rate limiter.
 *
 * Each limiter instance tracks requests per key (typically userId).
 * Suitable for single-server deployment. For horizontal scaling,
 * replace with Redis-backed implementation.
 */

interface RateLimitEntry {
  timestamps: number[];
}

export function createRateLimiter(opts: {
  windowMs: number;
  maxRequests: number;
}) {
  const store = new Map<string, RateLimitEntry>();

  // Periodic cleanup every 5 minutes to prevent memory leaks
  const CLEANUP_INTERVAL = 5 * 60 * 1000;
  let lastCleanup = Date.now();

  function cleanup(now: number) {
    if (now - lastCleanup < CLEANUP_INTERVAL) return;
    lastCleanup = now;
    for (const [key, entry] of store) {
      entry.timestamps = entry.timestamps.filter(
        (t) => now - t < opts.windowMs,
      );
      if (entry.timestamps.length === 0) store.delete(key);
    }
  }

  return {
    /**
     * Check if a request is allowed for the given key.
     * Returns { allowed: true } or { allowed: false, retryAfterMs }.
     */
    check(
      key: string,
    ): { allowed: true } | { allowed: false; retryAfterMs: number } {
      const now = Date.now();
      cleanup(now);

      let entry = store.get(key);
      if (!entry) {
        entry = { timestamps: [] };
        store.set(key, entry);
      }

      // Remove timestamps outside the window
      entry.timestamps = entry.timestamps.filter(
        (t) => now - t < opts.windowMs,
      );

      if (entry.timestamps.length >= opts.maxRequests) {
        const oldest = entry.timestamps[0] ?? now;
        const retryAfterMs = opts.windowMs - (now - oldest);
        return { allowed: false, retryAfterMs };
      }

      entry.timestamps.push(now);
      return { allowed: true };
    },
  };
}
