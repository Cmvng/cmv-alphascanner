// api/_lib/guard.ts
// Shared request guards for the money-spending / data-writing routes.
//
// NOTE ON DEPLOYMENT: the token buckets below are in-process. On Vercel that means per-lambda
// (weak, since instances multiply). On Railway the API runs as ONE long-lived process, so the
// limiter is actually global and effective. This is one of the quieter wins of the migration.

type Req = { headers: Record<string, any>; method?: string; socket?: any; connection?: any }
type Res = {
  setHeader: (k: string, v: string) => void
  status: (n: number) => { json: (b: any) => any; end: () => any }
}

/** Origins allowed to call the spending routes. Extend via ALLOWED_ORIGINS (comma-separated). */
function allowedOrigins(): string[] {
  const fromEnv = (process.env.ALLOWED_ORIGINS || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
  return [
    'https://cmv-alphascanner.vercel.app',
    ...fromEnv,
    ...(process.env.NODE_ENV !== 'production' ? ['http://localhost:3000', 'http://localhost:4173'] : []),
  ]
}

export function clientIp(req: Req): string {
  const fwd = req.headers['x-forwarded-for']
  const raw = Array.isArray(fwd) ? fwd[0] : fwd
  if (typeof raw === 'string' && raw.length) return raw.split(',')[0].trim()
  return req.socket?.remoteAddress || req.connection?.remoteAddress || 'unknown'
}

// ── token bucket ────────────────────────────────────────────────────────────
type Bucket = { tokens: number; last: number }
const buckets = new Map<string, Bucket>()

export interface RateLimit {
  /** sustained requests per minute */
  perMinute: number
  /** burst capacity */
  burst: number
}

export function rateLimit(key: string, { perMinute, burst }: RateLimit): boolean {
  const now = Date.now()
  const refillPerMs = perMinute / 60_000
  const b = buckets.get(key) || { tokens: burst, last: now }
  b.tokens = Math.min(burst, b.tokens + (now - b.last) * refillPerMs)
  b.last = now
  if (b.tokens < 1) {
    buckets.set(key, b)
    return false
  }
  b.tokens -= 1
  buckets.set(key, b)
  return true
}

// Keep the map from growing without bound on a long-lived process.
setInterval(() => {
  const cutoff = Date.now() - 10 * 60_000
  for (const [k, v] of buckets) if (v.last < cutoff) buckets.delete(k)
}, 5 * 60_000).unref?.()

// ── the guard ───────────────────────────────────────────────────────────────
export interface GuardOptions {
  limit: RateLimit
  /** route name, so different routes get independent buckets */
  route: string
}

/**
 * Applies CORS (allowlisted, not `*`), method check, origin check and rate limiting.
 * Returns true if the handler should continue; false if a response has already been sent.
 */
export function guard(req: Req, res: Res, { limit, route }: GuardOptions): boolean {
  const origin = String(req.headers.origin || '')
  const allowed = allowedOrigins()
  const originOk = !origin || allowed.includes(origin)

  // Only ever echo an allowlisted origin — never `*` on a route that spends money.
  if (origin && originOk) res.setHeader('Access-Control-Allow-Origin', origin)
  res.setHeader('Vary', 'Origin')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') {
    res.status(204).end()
    return false
  }
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' })
    return false
  }
  if (!originOk) {
    res.status(403).json({ error: 'Origin not allowed' })
    return false
  }
  if (!rateLimit(`${route}:${clientIp(req)}`, limit)) {
    res.setHeader('Retry-After', '60')
    res.status(429).json({ error: 'Rate limit exceeded. Try again shortly.' })
    return false
  }
  return true
}
