import { NextResponse } from "next/server";

/**
 * Lightweight in-memory rate limiter (fixed window, per-instance).
 * Like flask-limiter's memory:// — it's a courtesy throttle / abuse speed-bump,
 * NOT a global security boundary (each serverless instance has its own map).
 */
type Bucket = { count: number; reset: number };
const store = new Map<string, Bucket>();

export function clientIp(req: Request): string {
  const xff = req.headers.get("x-forwarded-for") || "";
  const first = xff.split(",")[0].trim();
  return first || req.headers.get("x-real-ip") || "unknown";
}

export function checkRateLimit(key: string, limit: number, windowMs: number): { ok: boolean; retryAfter: number } {
  const now = Date.now();
  // opportunistic sweep so the map can't grow unbounded
  if (store.size > 5000) store.forEach((v, k) => { if (now > v.reset) store.delete(k); });

  const b = store.get(key);
  if (!b || now > b.reset) {
    store.set(key, { count: 1, reset: now + windowMs });
    return { ok: true, retryAfter: 0 };
  }
  b.count++;
  if (b.count > limit) return { ok: false, retryAfter: Math.ceil((b.reset - now) / 1000) };
  return { ok: true, retryAfter: 0 };
}

/** Returns a 429 NextResponse if the caller is over the limit, else null (proceed). */
export function rateLimit(req: Request, name: string, limit: number, windowMs: number): NextResponse | null {
  const { ok, retryAfter } = checkRateLimit(`${name}:${clientIp(req)}`, limit, windowMs);
  if (ok) return null;
  return NextResponse.json(
    { error: "Too many requests. Please slow down and try again shortly." },
    { status: 429, headers: { "Retry-After": String(retryAfter) } },
  );
}
