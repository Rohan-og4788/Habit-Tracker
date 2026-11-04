// In-memory rate limiter. For production multi-instance deploys, back this
// with Redis. Keys: `${identifier}:${endpoint}`.
interface Window {
  count: number;
  resetAt: number;
}

const stores = new Map<string, Window>();

export function rateLimit(identifier: string, opts: {
  max: number;
  windowMs: number;
}): { allowed: boolean; remaining: number; resetAt: number } {
  const now = Date.now();
  const key = identifier;
  let win = stores.get(key);
  if (!win || now >= win.resetAt) {
    win = { count: 0, resetAt: now + opts.windowMs };
    stores.set(key, win);
  }
  win.count += 1;
  const remaining = Math.max(0, opts.max - win.count);
  return {
    allowed: win.count <= opts.max,
    remaining,
    resetAt: win.resetAt,
  };
}

export function cleanupRateLimitStore() {
  const now = Date.now();
  for (const key of Array.from(stores.keys())) {
    const win = stores.get(key);
    if (win && now >= win.resetAt) stores.delete(key);
  }
}

// Run cleanup every 5 minutes
if (typeof setInterval !== "undefined") {
  setInterval(cleanupRateLimitStore, 5 * 60 * 1000);
}
