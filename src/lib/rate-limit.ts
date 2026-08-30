import { prisma } from "@/lib/prisma";

/**
 * In-memory sliding window. Best-effort only: on serverless each instance
 * keeps its own Map, so this is a cheap first line for high-volume, low-risk
 * endpoints. Anything protecting credentials should use rateLimitShared.
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

/**
 * Durable counter shared by every instance, so the limit actually holds when
 * the platform scales out. One atomic upsert per call: the window resets
 * inside the statement when the previous one has expired, which avoids the
 * read-then-write race two concurrent requests would otherwise hit.
 */
export async function rateLimitShared(
  key: string,
  limit: number,
  windowMs: number
): Promise<boolean> {
  const expires = new Date(Date.now() + windowMs);

  try {
    const rows = await prisma.$queryRaw<{ count: number }[]>`
      INSERT INTO "RateLimit" ("key", "count", "expiresAt")
      VALUES (${key}, 1, ${expires})
      ON CONFLICT ("key") DO UPDATE SET
        "count" = CASE
          WHEN "RateLimit"."expiresAt" < NOW() THEN 1
          ELSE "RateLimit"."count" + 1
        END,
        "expiresAt" = CASE
          WHEN "RateLimit"."expiresAt" < NOW() THEN ${expires}
          ELSE "RateLimit"."expiresAt"
        END
      RETURNING "count"
    `;

    // Occasional sweep so expired rows don't accumulate forever.
    if (Math.random() < 0.01) {
      prisma.rateLimit
        .deleteMany({ where: { expiresAt: { lt: new Date() } } })
        .catch(() => {});
    }

    return Number(rows[0]?.count ?? 1) <= limit;
  } catch {
    // A database blip must not silently switch rate limiting off entirely.
    return rateLimit(key, limit, windowMs);
  }
}
