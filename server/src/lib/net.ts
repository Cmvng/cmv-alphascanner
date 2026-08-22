// server/src/lib/net.ts
// Rate limiting, timeouts and a circuit breaker for outbound provider calls (§40).
// Never hammer an API, never bypass a documented limit.

export class RateLimiter {
  private tokens: number
  private lastRefill = Date.now()

  constructor(private readonly perMinute: number, private readonly burst = Math.max(1, Math.ceil(perMinute / 4))) {
    this.tokens = burst
  }

  private refill() {
    const now = Date.now()
    this.tokens = Math.min(this.burst, this.tokens + ((now - this.lastRefill) * this.perMinute) / 60_000)
    this.lastRefill = now
  }

  /** Resolves when a token is available. Serialises callers rather than dropping them. */
  async take(): Promise<void> {
    this.refill()
    if (this.tokens >= 1) {
      this.tokens -= 1
      return
    }
    const waitMs = Math.ceil(((1 - this.tokens) * 60_000) / this.perMinute)
    await new Promise<void>((resolve) => setTimeout(resolve, waitMs))
    return this.take()
  }
}

/**
 * Fetch with a real abort, not a dangling Promise.race.
 * The existing api/xproject.ts races against a setTimeout that is never cleared, so the request
 * keeps running after the "timeout" and the timer stays pending. This actually cancels.
 */
export async function fetchWithTimeout(
  url: string,
  { timeoutMs = 8000, ...init }: RequestInit & { timeoutMs?: number } = {},
): Promise<Response> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    return await fetch(url, { ...init, signal: controller.signal })
  } finally {
    clearTimeout(timer)
  }
}

/** Trips after repeated failures so a dead provider stops costing latency every cycle. */
export class CircuitBreaker {
  private failures = 0
  private openedAt: number | null = null

  constructor(private readonly threshold = 4, private readonly cooldownMs = 5 * 60_000) {}

  get isOpen(): boolean {
    if (this.openedAt === null) return false
    if (Date.now() - this.openedAt > this.cooldownMs) {
      this.openedAt = null
      this.failures = 0
      return false
    }
    return true
  }

  recordSuccess() {
    this.failures = 0
    this.openedAt = null
  }

  recordFailure() {
    this.failures += 1
    if (this.failures >= this.threshold) this.openedAt = Date.now()
  }
}
