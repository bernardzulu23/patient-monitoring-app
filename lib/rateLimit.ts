type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();
const MAX_KEYS = 10_000;

function prune(now: number) {
  if (buckets.size < MAX_KEYS) return;
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key);
  }
  if (buckets.size >= MAX_KEYS) {
    buckets.clear();
  }
}

export function isRateLimited(
  key: string,
  limit: number,
): { limited: boolean; retryAfterSec: number } {
  const now = Date.now();
  const existing = buckets.get(key);
  if (!existing || existing.resetAt <= now) {
    return { limited: false, retryAfterSec: 0 };
  }
  if (existing.count >= limit) {
    return {
      limited: true,
      retryAfterSec: Math.max(1, Math.ceil((existing.resetAt - now) / 1000)),
    };
  }
  return { limited: false, retryAfterSec: 0 };
}

/** Count a failed attempt. */
export function hitRateLimit(key: string, windowMs: number) {
  const now = Date.now();
  prune(now);
  const existing = buckets.get(key);
  if (!existing || existing.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return;
  }
  existing.count += 1;
}

/** Count every call (not only failures); returns whether this call is over the limit. */
export function consumeRateLimit(key: string, limit: number, windowMs: number) {
  const state = isRateLimited(key, limit);
  if (state.limited) return state;
  hitRateLimit(key, windowMs);
  return { limited: false, retryAfterSec: 0 };
}

export function clearRateLimit(key: string) {
  buckets.delete(key);
}

/**
 * Forwarding headers are client-controlled unless a trusted proxy overwrites them.
 * Vercel sets x-forwarded-for itself; on-prem, opt in with TRUST_PROXY=1 only behind nginx/Caddy.
 */
function trustProxyHeaders() {
  return process.env.VERCEL === "1" || process.env.TRUST_PROXY === "1";
}

/**
 * `trusted: false` means every client shares one bucket, so callers should use a
 * higher shared cap there instead of the per-IP limit (a spoofed header cannot dodge it).
 */
export function clientIdentity(req: Request): { ip: string; trusted: boolean } {
  if (trustProxyHeaders()) {
    const forwarded = req.headers.get("x-forwarded-for");
    const first = forwarded?.split(",")[0]?.trim();
    if (first) return { ip: first, trusted: true };
    const real = req.headers.get("x-real-ip")?.trim();
    if (real) return { ip: real, trusted: true };
  }
  return { ip: "shared", trusted: false };
}

export function clientIp(req: Request) {
  return clientIdentity(req).ip;
}
