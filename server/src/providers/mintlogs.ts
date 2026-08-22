// server/src/providers/mintlogs.ts
//
// Mint detection as an RPC problem, not an API subscription (§12).
//
// Reservoir and SimpleHash both shut down, and no cheap cross-marketplace NFT aggregator replaced
// them. That turns out to be an advantage: every ERC-721/1155 mint emits `Transfer` with
// `from == 0x0`, so ONE log filter covers any EVM chain for nothing — including Robinhood Chain
// and Stable, where real mint activity happens and where Magic Eden, NFTScan and the dead
// aggregators have no coverage at all. That is very likely why J7Tracker and MintGo chose them.
//
// This is also the first signal family that is not a price API, which is what makes convergence
// mean "different kinds of evidence agreed" rather than "two price feeds agreed".

import { RateLimiter, fetchWithTimeout, CircuitBreaker } from '../lib/net.js'
import { meter } from '../lib/meter.js'
import type { Discovery, DiscoveryProvider, HealthStatus } from './types.js'

/** keccak256("Transfer(address,address,uint256)") */
const TRANSFER_TOPIC = '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef'
/** Zero address, left-padded to 32 bytes — `from == 0x0` is what makes a Transfer a mint. */
const ZERO_TOPIC = '0x0000000000000000000000000000000000000000000000000000000000000000'

export interface ChainRpc {
  chain: string
  url: string
  /** Roughly how many blocks per minute, used to size the lookback window. */
  blocksPerMin: number
}

/**
 * Public RPCs, no keys. Overridable so a paid endpoint can be swapped in without a code change.
 *
 * Stable publishes a genuine public endpoint. Robinhood Chain's is unconfirmed — every concrete
 * endpoint found in research was a commercial provider — so it is opt-in via env rather than
 * hard-coded to something that may not answer.
 */
export function defaultRpcs(): ChainRpc[] {
  const out: ChainRpc[] = []
  const stable = process.env.RPC_STABLE || 'https://rpc.stable.xyz'
  if (stable) out.push({ chain: 'stable', url: stable, blocksPerMin: 85 }) // ~0.7s blocks
  const base = process.env.RPC_BASE || 'https://mainnet.base.org'
  if (base) out.push({ chain: 'base', url: base, blocksPerMin: 30 }) // ~2s blocks
  if (process.env.RPC_ROBINHOOD) {
    out.push({ chain: 'robinhood', url: process.env.RPC_ROBINHOOD, blocksPerMin: 600 })
  }
  if (process.env.RPC_ETH) out.push({ chain: 'eth', url: process.env.RPC_ETH, blocksPerMin: 5 })
  return out
}

interface MintTally {
  contract: string
  mints: number
  uniqueMinters: Set<string>
  firstBlock: number
  lastBlock: number
}

export class MintLogProvider implements DiscoveryProvider {
  readonly id = 'mintlogs'
  readonly displayName = 'Onchain mint logs'
  // Public RPCs publish no numeric limit and ban silently, so this is deliberately conservative.
  readonly rateLimitPerMin = 20

  private limiter = new RateLimiter(this.rateLimitPerMin)
  private breaker = new CircuitBreaker()
  private lastError: string | undefined

  constructor(private readonly rpcs: ChainRpc[] = defaultRpcs()) {}

  private async rpc(url: string, method: string, params: unknown[]): Promise<any | null> {
    if (this.breaker.isOpen) return null
    await this.limiter.take()
    try {
      const r = await fetchWithTimeout(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }),
        timeoutMs: 12_000,
      })
      if (!r.ok) {
        this.lastError = `HTTP ${r.status}`
        this.breaker.recordFailure()
        meter('mintlogs', false)
        return null
      }
      const body: any = await r.json()
      if (body?.error) {
        this.lastError = String(body.error?.message || 'rpc error')
        this.breaker.recordFailure()
        meter('mintlogs', false)
        return null
      }
      this.breaker.recordSuccess()
      this.lastError = undefined
      meter('mintlogs', true)
      return body?.result ?? null
    } catch (e: any) {
      this.lastError = e?.name === 'AbortError' ? 'timeout' : String(e?.message || e)
      this.breaker.recordFailure()
      meter('mintlogs', false)
      return null
    }
  }

  async discover({ chains }: { chains: string[]; maxAgeHours: number }): Promise<Discovery[]> {
    const wanted = new Set(chains.map((c) => c.toLowerCase()))
    const out: Discovery[] = []

    for (const rpc of this.rpcs) {
      // A chain is watched if explicitly requested, or if it is one of the two exotic chains
      // that exist here precisely because nothing else covers them.
      if (!wanted.has(rpc.chain) && !['stable', 'robinhood'].includes(rpc.chain)) continue

      const head = await this.rpc(rpc.url, 'eth_blockNumber', [])
      if (!head) continue
      const latest = parseInt(String(head), 16)
      if (!Number.isFinite(latest)) continue

      // Look back ~15 minutes. Velocity has to be computed from our own stream: polling any
      // slower than the phenomenon is useless, and a 4,444-piece free mint can finish in under
      // two minutes.
      const lookback = Math.max(20, Math.min(2000, Math.round(rpc.blocksPerMin * 15)))
      const fromBlock = Math.max(0, latest - lookback)

      const logs = await this.rpc(rpc.url, 'eth_getLogs', [
        {
          fromBlock: `0x${fromBlock.toString(16)}`,
          toBlock: `0x${latest.toString(16)}`,
          topics: [TRANSFER_TOPIC, ZERO_TOPIC],
        },
      ])
      if (!Array.isArray(logs)) continue

      const tallies = new Map<string, MintTally>()
      for (const log of logs) {
        const contract = String(log?.address || '').toLowerCase()
        if (!contract) continue
        // topics[2] is `to` — the minter. ERC-20 transfers-from-zero also match this filter, so
        // we rely on topic count: ERC-721 carries an indexed tokenId as a fourth topic.
        const topics: string[] = Array.isArray(log?.topics) ? log.topics : []
        if (topics.length < 4) continue // ERC-20 mint, not an NFT — skip

        const minter = topics[2]
        const block = parseInt(String(log?.blockNumber || '0x0'), 16)

        const t = tallies.get(contract) ?? {
          contract, mints: 0, uniqueMinters: new Set<string>(),
          firstBlock: block, lastBlock: block,
        }
        t.mints++
        t.uniqueMinters.add(minter)
        t.firstBlock = Math.min(t.firstBlock, block)
        t.lastBlock = Math.max(t.lastBlock, block)
        tallies.set(contract, t)
      }

      for (const t of tallies.values()) {
        // A handful of mints is background noise on any chain; only sustained velocity is signal.
        if (t.mints < 5) continue

        const spanBlocks = Math.max(1, t.lastBlock - t.firstBlock)
        const mintsPerMin = t.mints / Math.max(1, spanBlocks / rpc.blocksPerMin)
        // Bot-dominated mints show high volume from few addresses. Reported, not judged.
        const uniqueRatio = t.uniqueMinters.size / t.mints

        out.push({
          target: {
            kind: 'nft_collection',
            chain: rpc.chain,
            contractAddress: t.contract,
            xHandle: null,
            name: null,
            symbol: null,
            audienceSize: t.uniqueMinters.size,
            liquidityUsd: null,
            marketCapUsd: null,
            volume24hUsd: null,
            poolCreatedAt: null,
          },
          events: [
            {
              eventType: 'new_pool', // reuses the "something was created" family
              occurredAt: new Date(),
              // Broad participation is stronger evidence than the same few wallets minting
              // repeatedly, so confidence scales with how distributed the minters are.
              confidence: Math.min(0.9, 0.4 + uniqueRatio * 0.5),
              rawReference: null,
              raw: {
                mints: t.mints,
                unique_minters: t.uniqueMinters.size,
                mints_per_min: Number(mintsPerMin.toFixed(2)),
                unique_ratio: Number(uniqueRatio.toFixed(3)),
                blocks: spanBlocks,
                chain: rpc.chain,
              },
            },
          ],
        })
      }
    }

    return out
  }

  async healthCheck(): Promise<HealthStatus> {
    const started = Date.now()
    const first = this.rpcs[0]
    if (!first) return { ok: false, latencyMs: null, error: 'no RPC endpoints configured' }
    const head = await this.rpc(first.url, 'eth_blockNumber', [])
    return head
      ? { ok: true, latencyMs: Date.now() - started }
      : { ok: false, latencyMs: Date.now() - started, error: this.lastError || 'unknown' }
  }
}
