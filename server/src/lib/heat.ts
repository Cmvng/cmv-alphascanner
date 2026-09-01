// server/src/lib/heat.ts
//
// The scoring core. PURE FUNCTIONS ONLY — no I/O, no clock reads, no randomness. Every input is
// passed in, so this is fully testable and reproducible (Master Spec §43: deterministic code for
// maths, LLMs only for prose).
//
// Heat answers one question: "how unusually fast is meaningful attention accumulating around this
// target RIGHT NOW?" It is not a prediction and must never be presented as one.

export interface HeatEvent {
  /** Which provider/entity observed this. Independence is computed per source (§18). */
  source: string
  eventType: string
  occurredAt: Date
  /** How much we trust this observation, 0..1. */
  confidence: number
  /** Optional per-event multiplier, e.g. a weaker promotion signal. */
  weight?: number
}

export interface HeatConfig {
  /**
   * Per-entity trust, keyed by source/entity identifier. Learned from recorded outcomes rather
   * than asserted — see server/src/jobs/update-trust.ts. A missing entry means "unknown", which
   * uses `defaultTrust` rather than silently counting as fully trusted.
   */
  trustWeights?: Record<string, number>
  defaultTrust: number
  /** halflife.<eventType> in hours; falls back to `defaultHalfLifeHours`. */
  halfLifeHours: Record<string, number>
  defaultHalfLifeHours: number
  /** Repeat observations from the SAME source are worth this fraction of the first. */
  repeatSourceFactor: number
  obscurityReferenceMcap: number
  obscurityMaxMultiplier: number
  obscurityMinMultiplier: number
  /** Saturation constant: larger => harder to reach a high score. */
  saturationK: number
  bands: { warm: number; hot: number; critical: number }
}

export const DEFAULT_HEAT_CONFIG: HeatConfig = {
  halfLifeHours: {
    new_pool: 3,
    liquidity_spike: 3,
    volume_spike: 4,
    boosted: 6,
    wallet_buy: 4,
    social_follow: 6,
    funding: 24,
  },
  defaultHalfLifeHours: 6,
  defaultTrust: 0.5,
  repeatSourceFactor: 0.25,
  obscurityReferenceMcap: 50_000_000,
  obscurityMaxMultiplier: 3.0,
  obscurityMinMultiplier: 0.4,
  // Every contribution is now multiplied by trust (<= 1), so the same evidence yields a
  // smaller raw score than before. K is reduced to keep the 0-100 band calibrated.
  saturationK: 1.5,
  bands: { warm: 40, hot: 65, critical: 85 },
}

export interface HeatComponents {
  /** Independence-adjusted, decayed sum of evidence. */
  convergence: number
  /** How many DISTINCT sources contributed. */
  distinctSources: number
  eventCount: number
  /** Multiplier from how unknown the target still is. */
  obscurity: number
  /** Newest evidence age, in hours. */
  freshnessHours: number | null
  /** convergence × obscurity, before saturation. */
  rawScore: number
  /** Mean trust of the entities that contributed, so a score can be traced to who produced it. */
  meanTrust: number | null
}

export interface HeatResult {
  heat: number
  band: 'cold' | 'warm' | 'hot' | 'critical'
  components: HeatComponents
}

/** Exponential decay. At exactly one half-life the contribution is 50%. */
export function decay(ageHours: number, halfLifeHours: number): number {
  if (!(halfLifeHours > 0)) return 0
  if (ageHours <= 0) return 1
  return Math.pow(0.5, ageHours / halfLifeHours)
}

/**
 * Reward signal on targets nobody knows about yet (§14).
 *
 * Ten quality wallets buying BTC is not alpha; ten buying a $500k project might be. An unknown
 * market cap is treated as unknown, not as tiny — guessing "small" here would inflate every
 * target we failed to price.
 */
export function obscurityMultiplier(marketCapUsd: number | null | undefined, cfg: HeatConfig): number {
  const { obscurityReferenceMcap: ref, obscurityMaxMultiplier: max, obscurityMinMultiplier: min } = cfg
  if (marketCapUsd == null || !Number.isFinite(marketCapUsd) || marketCapUsd <= 0) return 1
  const raw = 1 + 0.5 * Math.log10(ref / marketCapUsd)
  return Math.min(max, Math.max(min, raw))
}

/**
 * Collapse correlated evidence (§18).
 *
 * Ten sites repeating one X post are not ten signals, and one KOL reposted twenty times is not
 * twenty discoveries. The strongest observation from each source counts fully; every additional
 * observation from that SAME source is worth `repeatSourceFactor`.
 */
export function convergenceScore(events: HeatEvent[], now: Date, cfg: HeatConfig): {
  convergence: number
  distinctSources: number
  freshnessHours: number | null
  meanTrust: number | null
} {
  if (events.length === 0) return { convergence: 0, distinctSources: 0, freshnessHours: null, meanTrust: null }

  const bySource = new Map<string, number[]>()
  let newestMs = -Infinity

  for (const e of events) {
    const ageHours = (now.getTime() - e.occurredAt.getTime()) / 3_600_000
    if (ageHours < 0) continue // ignore anything claiming to be from the future
    newestMs = Math.max(newestMs, e.occurredAt.getTime())

    const halfLife = cfg.halfLifeHours[e.eventType] ?? cfg.defaultHalfLifeHours
    // An unknown entity gets defaultTrust, not 1. Treating unknown as fully trusted would let
    // any new source inflate scores before it has earned anything.
    const trust = cfg.trustWeights?.[e.source] ?? cfg.defaultTrust
    const contribution =
      Math.max(0, Math.min(1, e.confidence)) * (e.weight ?? 1) * trust * decay(ageHours, halfLife)

    const list = bySource.get(e.source) ?? []
    list.push(contribution)
    bySource.set(e.source, list)
  }

  let convergence = 0
  for (const contributions of bySource.values()) {
    contributions.sort((a, b) => b - a)
    // Geometric, not linear. A linear factor still accumulates without bound, so a source that
    // repeats itself twenty times outscores three genuinely independent sources — precisely the
    // "1 person + 4 accounts copying them" failure this is supposed to prevent. Weighting the
    // nth repeat by f^n caps any single source at strongest/(1-f) however much it repeats.
    for (let i = 0; i < contributions.length; i++) {
      convergence += contributions[i] * Math.pow(cfg.repeatSourceFactor, i)
    }
  }

  const trusts = [...bySource.keys()].map((k) => cfg.trustWeights?.[k] ?? cfg.defaultTrust)
  return {
    convergence,
    meanTrust: trusts.length ? trusts.reduce((a, b) => a + b, 0) / trusts.length : null,
    distinctSources: bySource.size,
    freshnessHours: newestMs === -Infinity ? null : (now.getTime() - newestMs) / 3_600_000,
  }
}

/** Map a raw score onto 0..100 with diminishing returns, so no single term can dominate. */
function saturate(raw: number, k: number): number {
  if (raw <= 0) return 0
  return raw / (raw + k)
}

export function bandFor(heat: number, cfg: HeatConfig): HeatResult['band'] {
  if (heat >= cfg.bands.critical) return 'critical'
  if (heat >= cfg.bands.hot) return 'hot'
  if (heat >= cfg.bands.warm) return 'warm'
  return 'cold'
}

/**
 * The whole calculation. Returns an integer 0-100 plus every component that produced it, so the
 * UI can always answer "why did this go up?" (§15 — and no fake precision like 83.2719).
 */
export function computeHeat(
  events: HeatEvent[],
  target: { marketCapUsd?: number | null },
  now: Date,
  cfg: HeatConfig = DEFAULT_HEAT_CONFIG,
): HeatResult {
  const { convergence, distinctSources, freshnessHours, meanTrust } = convergenceScore(events, now, cfg)
  const obscurity = obscurityMultiplier(target.marketCapUsd, cfg)
  const rawScore = convergence * obscurity
  const heat = Math.round(100 * saturate(rawScore, cfg.saturationK))

  return {
    heat,
    band: bandFor(heat, cfg),
    components: {
      convergence: Number(convergence.toFixed(4)),
      distinctSources,
      eventCount: events.length,
      obscurity: Number(obscurity.toFixed(4)),
      freshnessHours: freshnessHours === null ? null : Number(freshnessHours.toFixed(2)),
      rawScore: Number(rawScore.toFixed(4)),
      meanTrust: meanTrust === null ? null : Number(meanTrust.toFixed(3)),
    },
  }
}

/**
 * Plain-language reason, built from the components rather than an LLM call.
 * Describes what was observed — never what will happen.
 */
export function explainHeat(r: HeatResult): string {
  const c = r.components
  if (c.eventCount === 0) return 'No recent signals.'
  // eventCount counts what was submitted; distinctSources counts what actually scored. They
  // differ when every event was rejected as future-dated, and the sentence below would then
  // assert "1 source reported activity" on the strength of zero.
  if (c.distinctSources === 0) return 'No usable signals — every observation was rejected.'

  const parts: string[] = []
  parts.push(
    c.distinctSources > 1
      ? `${c.distinctSources} independent sources reported activity`
      : '1 source reported activity',
  )
  if (c.eventCount > c.distinctSources) parts.push(`across ${c.eventCount} observations`)
  if (c.freshnessHours !== null) {
    parts.push(
      c.freshnessHours < 1
        ? 'the most recent within the last hour'
        : `the most recent ${Math.round(c.freshnessHours)}h ago`,
    )
  }
  if (c.obscurity > 1.5) parts.push('on a target with little existing coverage')
  else if (c.obscurity < 0.8) parts.push('on an already well-covered target')

  return parts.join(', ') + '.'
}
