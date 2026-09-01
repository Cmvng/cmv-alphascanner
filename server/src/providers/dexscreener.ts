// server/src/providers/dexscreener.ts
//
// ENRICHMENT + FAILOVER — not primary discovery.
//
// DexScreener has no true new-pairs endpoint. `token-profiles/latest` and `token-boosts/latest`
// are PROMOTION feeds: a token appears because someone paid to boost it. That is still a signal
// (someone is spending money on attention) but it is weak evidence of anything real, so boosted
// events carry low confidence and a short half-life.
//
// Its value here is a second, independent 300/min budget for enriching whatever GeckoTerminal
// surfaces — different vendor, different bucket, so the pair is a genuine failover rather than a
// shared failure mode.

import { RateLimiter, fetchWithTimeout, CircuitBreaker } from '../lib/net.js'
import { meter } from '../lib/meter.js'
import type { Discovery, DiscoveryProvider, HealthStatus } from './types.js'

const BASE = 'https://api.dexscreener.com'

/** DexScreener chain ids for the chains we watch. */
const CHAIN_IDS: Record<string, string> = {
  solana: 'solana',
  base: 'base',
  eth: 'ethereum',
  ethereum: 'ethereum',
}

function num(v: unknown): number | null {
  const n = typeof v === 'string' ? parseFloat(v) : typeof v === 'number' ? v : NaN
  return Number.isFinite(n) ? n : null
}


/**
 * Pull the project's X handle out of a pair's socials.
 *
 * This is the join between the two halves of the product: discovery finds contract addresses,
 * but the scanner is keyed on X handles. Without this, a discovered token can never be judged
 * and alpha_score stays null forever.
 */
function extractXHandle(pair: any): string | null {
  const socials: any[] = pair?.info?.socials ?? []
  const websites: any[] = pair?.info?.websites ?? []
  const candidates = [
    ...socials.map((x) => (typeof x?.url === 'string' ? x.url : typeof x?.handle === 'string' ? x.handle : '')),
    ...websites.map((w) => (typeof w?.url === 'string' ? w.url : '')),
  ]
  for (const raw of candidates) {
    const m = raw.match(/(?<![a-z0-9])(?:twitter\.com|x\.com)\/(?:#!\/)?@?([A-Za-z0-9_]{1,15})/i)
    // Reject X's own non-profile paths, which would otherwise look like handles.
    if (m && !/^(i|home|search|intent|share|hashtag|status)$/i.test(m[1])) return m[1]
  }
  return null
}

/**
 * Pull the project's own website out of a pair's metadata.
 *
 * Filtered against the social and aggregator hosts, because a "website" entry pointing at a
 * Telegram invite or a DexScreener page tells you nothing about how long the PROJECT has
 * existed — which is the only thing provenance checks are for.
 */
function extractWebsite(pair: any): string | null {
  const websites: any[] = pair?.info?.websites ?? []
  for (const w of websites) {
    const url = typeof w?.url === 'string' ? w.url : ''
    if (!/^https?:\/\//i.test(url)) continue
    if (/(?:x\.com|twitter\.com|t\.me|telegram|discord|medium\.com|github\.com|linktr\.ee)/i.test(url)) continue
    return url
  }
  return null
}

export class DexScreenerProvider implements DiscoveryProvider {
  readonly id = 'dexscreener'
  readonly displayName = 'DexScreener'
  // Two independent buckets upstream: 60/min for profile+boost, 300/min for pairs. The lower
  // one governs discovery here.
  readonly rateLimitPerMin = 60

  private limiter = new RateLimiter(this.rateLimitPerMin)
  private pairLimiter = new RateLimiter(300)
  private breaker = new CircuitBreaker()
  private lastError: string | undefined

  private async get(path: string, limiter = this.limiter): Promise<any | null> {
    if (this.breaker.isOpen) return null
    await limiter.take()
    try {
      const r = await fetchWithTimeout(`${BASE}${path}`, { timeoutMs: 8000 })
      if (!r.ok) {
        this.lastError = `HTTP ${r.status}`
        this.breaker.recordFailure()
        meter('dexscreener', false)
        return null
      }
      this.breaker.recordSuccess()
      this.lastError = undefined
      meter('dexscreener', true)
      return await r.json()
    } catch (e: any) {
      this.lastError = e?.name === 'AbortError' ? 'timeout' : String(e?.message || e)
      this.breaker.recordFailure()
      meter('dexscreener', false)
      return null
    }
  }

  async discover({ chains }: { chains: string[]; maxAgeHours: number }): Promise<Discovery[]> {
    const wanted = new Set(chains.map((c) => CHAIN_IDS[c.toLowerCase()]).filter(Boolean))
    const body = await this.get('/token-boosts/latest/v1')
    const items: any[] = Array.isArray(body) ? body : Array.isArray(body?.data) ? body.data : []
    const out: Discovery[] = []

    for (const it of items.slice(0, 60)) {
      const chainId = typeof it?.chainId === 'string' ? it.chainId : null
      const address = typeof it?.tokenAddress === 'string' ? it.tokenAddress : null
      if (!chainId || !address || !wanted.has(chainId)) continue

      const chain = Object.keys(CHAIN_IDS).find((k) => CHAIN_IDS[k] === chainId) ?? chainId

      out.push({
        target: {
          kind: 'token',
          chain,
          contractAddress: address,
          xHandle: null,
          website: null,
          // NOT it.description — that is promoter-authored ad copy. enrich() fills the real name
          // from the pairs endpoint; storing the blurb here would coalesce as a permanent identity.
          name: null,
          symbol: null,
          audienceSize: null,
          liquidityUsd: null,
          marketCapUsd: null,
          volume24hUsd: null,
          poolCreatedAt: null,
        },
        events: [
          {
            eventType: 'boosted',
            occurredAt: new Date(),
            // Paid promotion. Someone spending money is information, but it is the weakest
            // evidence we ingest — hence low confidence and a 6h half-life.
            confidence: 0.25,
            rawReference: typeof it?.url === 'string' ? it.url : null,
            raw: it,
          },
        ],
      })
    }

    return out
  }

  /**
   * Fill in liquidity / volume / market cap for a target another provider found.
   * Uses the 300/min pairs budget, separate from the discovery bucket above.
   */
  async enrich(chain: string, address: string): Promise<Partial<Discovery['target']> | null> {
    const chainId = CHAIN_IDS[chain.toLowerCase()]
    if (!chainId) return null

    const body = await this.get(`/token-pairs/v1/${chainId}/${address}`, this.pairLimiter)
    const pairs: any[] = Array.isArray(body) ? body : Array.isArray(body?.pairs) ? body.pairs : []
    if (pairs.length === 0) return null

    const addrLower = address.toLowerCase()
    // Prefer pools where OUR token is the base side, because name/symbol/marketCap/fdv all
    // describe the baseToken. Picking the deepest pool blindly grabs the partner project's
    // identity whenever our token is the quote side — a wrong name, handle and market cap that
    // then coalesce permanently onto the target.
    const baseSide = pairs.filter((p) => String(p?.baseToken?.address ?? '').toLowerCase() === addrLower)
    const deepest = (arr: any[]) => arr.reduce((a, b) => ((b?.liquidity?.usd ?? 0) > (a?.liquidity?.usd ?? 0) ? b : a))
    const best = baseSide.length ? deepest(baseSide) : deepest(pairs)
    // If our token is only ever the quote side, do not attribute the base token's identity to it.
    const isBase = String(best?.baseToken?.address ?? '').toLowerCase() === addrLower

    return {
      name: isBase ? (best?.baseToken?.name ?? null) : null,
      symbol: isBase ? (best?.baseToken?.symbol ?? null) : null,
      xHandle: isBase ? extractXHandle(best) : null,
      website: isBase ? extractWebsite(best) : null,
      liquidityUsd: num(best?.liquidity?.usd),
      marketCapUsd: isBase ? (num(best?.marketCap) ?? num(best?.fdv)) : null,
      volume24hUsd: num(best?.volume?.h24),
      poolCreatedAt: best?.pairCreatedAt ? new Date(best.pairCreatedAt) : null,
    }
  }

  async healthCheck(): Promise<HealthStatus> {
    const started = Date.now()
    const body = await this.get('/token-boosts/latest/v1')
    const latencyMs = Date.now() - started
    return body ? { ok: true, latencyMs } : { ok: false, latencyMs, error: this.lastError || 'unknown' }
  }
}
