// server/src/providers/geckoterminal.ts
//
// PRIMARY DISCOVERY. This is the only free provider with a purpose-built new-pool feed.
// (DexScreener's token-profiles/token-boosts are PROMOTION feeds — a token appears there because
// someone paid to boost it, not because it was deployed. Do not swap these roles.)
//
// Free, keyless, 30 calls/min. Officially Beta and subject to change, so the version header is
// pinned and every field access is defensive.

import { RateLimiter, fetchWithTimeout, CircuitBreaker } from '../lib/net.js'
import { meter } from '../lib/meter.js'
import type { Discovery, DiscoveryProvider, HealthStatus } from './types.js'

const BASE = 'https://api.geckoterminal.com/api/v2'

// GeckoTerminal asks callers to pin an API version. The long-quoted token could not be
// re-verified against current docs, so it is overridable without a redeploy.
const ACCEPT = `application/json;version=${process.env.GECKOTERMINAL_API_VERSION || '20230302'}`

/** Our chain ids -> GeckoTerminal network slugs. */
const NETWORK_SLUGS: Record<string, string> = {
  solana: 'solana',
  base: 'base',
  eth: 'eth',
  ethereum: 'eth',
}

function num(v: unknown): number | null {
  const n = typeof v === 'string' ? parseFloat(v) : typeof v === 'number' ? v : NaN
  return Number.isFinite(n) ? n : null
}

export class GeckoTerminalProvider implements DiscoveryProvider {
  readonly id = 'geckoterminal'
  readonly displayName = 'GeckoTerminal'
  readonly rateLimitPerMin = 30

  private limiter = new RateLimiter(this.rateLimitPerMin)
  private breaker = new CircuitBreaker()
  private lastError: string | undefined

  private async get(path: string): Promise<any | null> {
    if (this.breaker.isOpen) return null
    await this.limiter.take()
    try {
      const r = await fetchWithTimeout(`${BASE}${path}`, {
        headers: { Accept: ACCEPT },
        timeoutMs: 8000,
      })
      if (!r.ok) {
        this.lastError = `HTTP ${r.status}`
        this.breaker.recordFailure()
        meter('geckoterminal', false)
        return null
      }
      this.breaker.recordSuccess()
      this.lastError = undefined
      meter('geckoterminal', true)
      return await r.json()
    } catch (e: any) {
      this.lastError = e?.name === 'AbortError' ? 'timeout' : String(e?.message || e)
      this.breaker.recordFailure()
      meter('geckoterminal', false)
      return null
    }
  }

  async discover({ chains, maxAgeHours }: { chains: string[]; maxAgeHours: number }): Promise<Discovery[]> {
    const cutoff = Date.now() - maxAgeHours * 3_600_000
    const out: Discovery[] = []

    for (const chain of chains) {
      const slug = NETWORK_SLUGS[chain.toLowerCase()]
      if (!slug) continue

      const body = await this.get(`/networks/${slug}/new_pools?page=1`)
      const pools: any[] = Array.isArray(body?.data) ? body.data : []

      for (const pool of pools) {
        const a = pool?.attributes
        if (!a) continue

        const createdAt = a.pool_created_at ? new Date(a.pool_created_at) : null
        if (createdAt && createdAt.getTime() < cutoff) continue

        // The base token is the thing being discovered; the pool is the evidence.
        const baseId: string | undefined = pool?.relationships?.base_token?.data?.id
        // Ids look like "solana_<address>" — strip the network prefix.
        const address = baseId ? baseId.slice(baseId.indexOf('_') + 1) : null
        if (!address) continue

        const liquidity = num(a.reserve_in_usd)
        const volume = num(a.volume_usd?.h24)

        out.push({
          target: {
            kind: 'token',
            chain,
            contractAddress: address,
            xHandle: null,
            website: null,
            name: typeof a.name === 'string' ? a.name : null,
            symbol: null,
            audienceSize: null,
            liquidityUsd: liquidity,
            // Prefer the real market cap; fall back to FDV only when it is absent. Preferring
            // fdv_usd wrote fully-diluted valuation (often ~100x higher on a low-float token)
            // into the market-cap column, which suppressed the obscurity bonus and mislabelled
            // /grid — and coalesce made the wrong figure permanent.
            marketCapUsd: num(a.market_cap_usd) ?? num(a.fdv_usd),
            volume24hUsd: volume,
            poolCreatedAt: createdAt,
          },
          events: [
            {
              eventType: 'new_pool',
              occurredAt: createdAt ?? new Date(),
              // A brand-new pool is a real creation event, not a promotion — weight it fully.
              confidence: 0.8,
              rawReference: `https://www.geckoterminal.com/${slug}/pools/${a.address ?? ''}`,
              raw: a,
            },
          ],
        })
      }
    }

    return out
  }

  async healthCheck(): Promise<HealthStatus> {
    const started = Date.now()
    const body = await this.get('/networks?page=1')
    const latencyMs = Date.now() - started
    return body ? { ok: true, latencyMs } : { ok: false, latencyMs, error: this.lastError || 'unknown' }
  }
}
