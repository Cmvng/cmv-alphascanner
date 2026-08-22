// server/src/providers/types.ts
// Provider abstraction (§32). APIs change, get acquired, and shut down — four of the sources
// commonly recommended for this work died between March 2025 and August 2026 (Reservoir,
// SimpleHash, Zapper, Sim by Dune). Nothing outside an adapter file may name a provider.

/** A thing we might care about, as reported by a provider. */
export interface DiscoveredTarget {
  kind: 'token' | 'x_account' | 'nft_collection'
  chain: string | null
  contractAddress: string | null
  xHandle: string | null
  name: string | null
  symbol: string | null
  audienceSize: number | null
  liquidityUsd: number | null
  marketCapUsd: number | null
  volume24hUsd: number | null
  poolCreatedAt: Date | null
}

/** Something that happened to a target, observed by a provider. */
export interface DiscoveredEvent {
  eventType: 'new_pool' | 'liquidity_spike' | 'volume_spike' | 'boosted'
  occurredAt: Date
  /** 0..1 — how much this observation should count. A promotion signal is weaker evidence. */
  confidence: number
  /** Provenance (§36) — where a human could go to check this. */
  rawReference: string | null
  raw: unknown
}

export interface Discovery {
  target: DiscoveredTarget
  events: DiscoveredEvent[]
}

export interface HealthStatus {
  ok: boolean
  latencyMs: number | null
  error?: string
}

export interface DiscoveryProvider {
  /** Stable id — must match a row in signal_sources. */
  readonly id: string
  readonly displayName: string
  /** Documented ceiling, so the limiter can be configured from the adapter that knows it. */
  readonly rateLimitPerMin: number

  /** Find things worth looking at. Must never throw — return [] and let healthCheck report. */
  discover(opts: { chains: string[]; maxAgeHours: number }): Promise<Discovery[]>

  healthCheck(): Promise<HealthStatus>
}
