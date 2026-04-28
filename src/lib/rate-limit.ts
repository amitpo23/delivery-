/**
 * Best-effort in-memory rate limiter for serverless route handlers.
 *
 * Caveats: each Vercel Lambda has its own memory, so a determined attacker
 * who happens to land on a fresh cold-start gets a fresh bucket. That's
 * acceptable for the threats this guards against (one bot, one keyboard
 * mashing F5) but not for a coordinated attack. For real abuse-grade limits
 * use Upstash/Vercel KV; this module is the cheap floor.
 *
 * Buckets are keyed by (route, IP). The token bucket refills linearly.
 */

interface Bucket {
  tokens: number;
  lastRefill: number;
}

const buckets = new Map<string, Bucket>();
const MAX_BUCKETS = 5000;

export interface RateLimitConfig {
  /** Max tokens in the bucket (burst capacity). */
  max: number;
  /** Tokens refilled per minute. */
  refillPerMinute: number;
}

export interface RateLimitResult {
  allowed: boolean;
  /** Seconds until the next token would be available — for Retry-After. */
  retryAfterSec?: number;
}

export function rateLimit(
  bucketKey: string,
  config: RateLimitConfig,
): RateLimitResult {
  const now = Date.now();
  let b = buckets.get(bucketKey);

  if (!b) {
    if (buckets.size >= MAX_BUCKETS) {
      // Drop oldest entry — Map preserves insertion order, so the first
      // key is also the oldest.
      const firstKey = buckets.keys().next().value;
      if (firstKey) buckets.delete(firstKey);
    }
    b = { tokens: config.max, lastRefill: now };
    buckets.set(bucketKey, b);
  }

  const elapsedMs = now - b.lastRefill;
  const refilled = (elapsedMs / 60_000) * config.refillPerMinute;
  if (refilled >= 1) {
    b.tokens = Math.min(config.max, b.tokens + refilled);
    b.lastRefill = now;
  }

  if (b.tokens >= 1) {
    b.tokens -= 1;
    return { allowed: true };
  }

  const retryAfterSec = Math.ceil((1 - b.tokens) * (60 / config.refillPerMinute));
  return { allowed: false, retryAfterSec };
}

/**
 * Resolve the caller's IP from request headers Vercel forwards.
 * Falls back to "unknown" so we still rate-limit the bucket as a whole
 * rather than letting headerless calls bypass entirely.
 */
export function getRequestIp(req: Request): string {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) {
    const first = fwd.split(",")[0]?.trim();
    if (first) return first;
  }
  return req.headers.get("x-real-ip") ?? "unknown";
}
