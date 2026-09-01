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

/** keccak256("Transfer(address,address,uint256)") — ERC-721 (and ERC-20). */
const TRANSFER_TOPIC = '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef'
/** keccak256("TransferSingle(address,address,address,uint256,uint256)") — ERC-1155. */
const TRANSFER_SINGLE_TOPIC = '0xc3d58168c5ae7397731d063d5bbf3d657854427343f4c083240f7aacaa2d0f62'
/** Zero address, left-padded to 32 bytes — `from == 0x0` is what makes a transfer a mint. */
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

  /**
   * eth_getLogs across a block range, splitting the window when the node rejects it.
   *
   * Public RPCs cap result count and block span (geth: "query returned more than 10000 results").
   * During exactly the high-activity windows this provider exists to catch, a 15-minute window of
   * mints on Base exceeds that cap, the single call returns null, and the whole chain was silently
   * skipped while healthCheck (eth_blockNumber only) still reported green. Halving the range on
   * failure down to a floor recovers the data instead of going blind.
   *
   * Returns null only when even a minimal sub-range fails (a real RPC outage); an empty array
   * means the range was queried and held no mints.
   */
  private async getLogsChunked(
    url: string,
    fromBlock: number,
    toBlock: number,
    topics: (string | null)[],
    depth = 0,
  ): Promise<any[] | null> {
    const logs = await this.rpc(url, 'eth_getLogs', [
      { fromBlock: `0x${fromBlock.toString(16)}`, toBlock: `0x${toBlock.toString(16)}`, topics },
    ])
    if (Array.isArray(logs)) return logs
    // Give up splitting once the window is tiny or we have recursed too far — a persistent failure
    // at that point is an outage, not a range cap.
    if (depth >= 6 || toBlock - fromBlock <= 4) return null
    const mid = Math.floor((fromBlock + toBlock) / 2)
    const [a, b] = await Promise.all([
      this.getLogsChunked(url, fromBlock, mid, topics, depth + 1),
      this.getLogsChunked(url, mid + 1, toBlock, topics, depth + 1),
    ])
    if (a === null && b === null) return null
    return [...(a ?? []), ...(b ?? [])]
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

      // ERC-721 Transfer mints: topics = [sig, from, to, tokenId] with from == 0x0. The zero
      // filter sits at topic position 1 (from).
      const erc721 = await this.getLogsChunked(rpc.url, fromBlock, latest, [TRANSFER_TOPIC, ZERO_TOPIC])
      // ERC-1155 TransferSingle mints: topics = [sig, operator, from, to] with from == 0x0. The
      // zero filter sits at position 2, so this needs its own query — the open-edition format is
      // the majority mint phenomenon on Base/Zora and was structurally invisible before.
      const erc1155 = await this.getLogsChunked(rpc.url, fromBlock, latest, [TRANSFER_SINGLE_TOPIC, null, ZERO_TOPIC])
      if (erc721 === null && erc1155 === null) continue // RPC failed both ways — say nothing

      const tallies = new Map<string, MintTally>()
      const tally = (log: any, minterIdx: number) => {
        const contract = String(log?.address || '').toLowerCase()
        if (!contract) return
        const topics: string[] = Array.isArray(log?.topics) ? log.topics : []
        const minter = topics[minterIdx]
        if (!minter) return
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

      for (const log of erc721 ?? []) {
        // Exactly 4 topics = ERC-721 (indexed tokenId as the 4th). A 3-topic hit is an ERC-20
        // mint; skip it rather than mis-tallying it as an NFT collection. The minter is `to` = [2].
        const topics: string[] = Array.isArray(log?.topics) ? log.topics : []
        if (topics.length !== 4) continue
        tally(log, 2)
      }
      // ERC-1155 TransferSingle: minter is `to` = topics[3].
      for (const log of erc1155 ?? []) tally(log, 3)

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
            website: null,
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
