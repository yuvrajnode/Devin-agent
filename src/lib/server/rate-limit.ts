/**
 * Per-instance sliding-window limiter.
 *
 * Deliberately in-memory: this guards a single serverless instance against a
 * runaway client, not a distributed abuse case. A real deployment would move
 * the same interface onto Redis — which is exactly the change the demo agent
 * makes to `checkout-service`.
 */

const WINDOW_MS = 60_000;
const MAX_REQUESTS = 12;
/** Bounds memory if a deployment sees many distinct clients. */
const MAX_TRACKED_CLIENTS = 5_000;

const hits = new Map<string, number[]>();

export interface LimitResult {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds: number;
}

export function checkRateLimit(key: string, now = Date.now()): LimitResult {
  const cutoff = now - WINDOW_MS;
  const recent = (hits.get(key) ?? []).filter((at) => at > cutoff);

  if (recent.length >= MAX_REQUESTS) {
    const oldest = recent[0] ?? now;
    hits.set(key, recent);
    return {
      allowed: false,
      remaining: 0,
      retryAfterSeconds: Math.max(1, Math.ceil((oldest + WINDOW_MS - now) / 1000)),
    };
  }

  if (hits.size >= MAX_TRACKED_CLIENTS && !hits.has(key)) {
    // Evict the least recently seen client rather than growing without bound.
    const oldestKey = hits.keys().next().value;
    if (oldestKey !== undefined) hits.delete(oldestKey);
  }

  recent.push(now);
  hits.set(key, recent);

  return {
    allowed: true,
    remaining: MAX_REQUESTS - recent.length,
    retryAfterSeconds: 0,
  };
}

/** Best-effort client identity from proxy headers. */
export function clientKey(headers: Headers): string {
  const forwarded = headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }
  return headers.get("x-real-ip") ?? "anonymous";
}

/** Test seam. */
export function resetRateLimit(): void {
  hits.clear();
}
