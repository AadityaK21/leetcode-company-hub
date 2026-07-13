/**
 * Tiny in-memory sliding-window rate limiter for hot endpoints (register, etc.).
 * Good enough for a single instance; swap for Upstash/Redis if you scale out.
 */
const hits = new Map<string, number[]>();

export function rateLimit(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const windowStart = now - windowMs;
  const timestamps = (hits.get(key) ?? []).filter((t) => t > windowStart);
  if (timestamps.length >= limit) {
    hits.set(key, timestamps);
    return false;
  }
  timestamps.push(now);
  hits.set(key, timestamps);
  // Opportunistic cleanup so the map doesn't grow unbounded.
  if (hits.size > 5_000) {
    for (const [k, v] of hits) if (v.every((t) => t <= windowStart)) hits.delete(k);
  }
  return true;
}
