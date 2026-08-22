import { describe, it, expect } from 'vitest'
import {
  decay,
  obscurityMultiplier,
  convergenceScore,
  computeHeat,
  bandFor,
  explainHeat,
  DEFAULT_HEAT_CONFIG as CFG,
  type HeatEvent,
} from './heat'

const NOW = new Date('2026-08-22T12:00:00Z')
const hoursAgo = (h: number) => new Date(NOW.getTime() - h * 3_600_000)

const ev = (over: Partial<HeatEvent> = {}): HeatEvent => ({
  source: 'geckoterminal',
  eventType: 'new_pool',
  occurredAt: NOW,
  confidence: 1,
  ...over,
})

describe('decay', () => {
  it('is 1 for a signal that just happened', () => {
    expect(decay(0, 6)).toBe(1)
  })

  // Master Spec §49: "signal older than half-life => approximately 50% contribution"
  it('contributes ~50% at exactly one half-life', () => {
    expect(decay(6, 6)).toBeCloseTo(0.5, 10)
    expect(decay(3, 3)).toBeCloseTo(0.5, 10)
  })

  it('halves again at two half-lives', () => {
    expect(decay(12, 6)).toBeCloseTo(0.25, 10)
  })

  it('respects per-type half-lives — funding ages far slower than a new pool', () => {
    const atOneDay = 24
    expect(decay(atOneDay, CFG.halfLifeHours.funding)).toBeCloseTo(0.5, 10)
    expect(decay(atOneDay, CFG.halfLifeHours.new_pool)).toBeLessThan(0.01)
  })
})

describe('obscurityMultiplier', () => {
  // §14: this is the differentiator — reward signal on things nobody knows yet.
  it('is neutral at the reference market cap', () => {
    expect(obscurityMultiplier(CFG.obscurityReferenceMcap, CFG)).toBeCloseTo(1, 6)
  })

  it('rewards smaller targets', () => {
    const small = obscurityMultiplier(500_000, CFG)
    const mid = obscurityMultiplier(5_000_000, CFG)
    expect(small).toBeGreaterThan(mid)
    expect(mid).toBeGreaterThan(1)
  })

  it('suppresses targets that are already huge — ten wallets buying BTC is not alpha', () => {
    expect(obscurityMultiplier(5_000_000_000, CFG)).toBeLessThan(1)
  })

  it('never exceeds the configured cap', () => {
    expect(obscurityMultiplier(1, CFG)).toBeLessThanOrEqual(CFG.obscurityMaxMultiplier)
  })

  it('treats an unknown market cap as unknown, not as tiny', () => {
    // Guessing "small" would inflate every target we simply failed to price.
    expect(obscurityMultiplier(null, CFG)).toBe(1)
    expect(obscurityMultiplier(undefined, CFG)).toBe(1)
    expect(obscurityMultiplier(0, CFG)).toBe(1)
  })
})

describe('convergenceScore — independence', () => {
  // §49: "5 KOLs independently follow target => expected convergence increase"
  it('rises with each additional independent source', () => {
    const one = convergenceScore([ev({ source: 'a' })], NOW, CFG).convergence
    const three = convergenceScore(
      [ev({ source: 'a' }), ev({ source: 'b' }), ev({ source: 'c' })],
      NOW,
      CFG,
    ).convergence
    expect(three).toBeGreaterThan(one)
    expect(three).toBeCloseTo(3, 6)
  })

  // §49: "Same KOL reposted 20 times => should NOT equal 20 independent signals"
  it('does not let one source counterfeit twenty discoveries', () => {
    const twentyFromOne = convergenceScore(
      Array.from({ length: 20 }, () => ev({ source: 'a' })),
      NOW,
      CFG,
    )
    const twentyIndependent = convergenceScore(
      Array.from({ length: 20 }, (_, i) => ev({ source: `s${i}` })),
      NOW,
      CFG,
    )
    expect(twentyFromOne.distinctSources).toBe(1)
    expect(twentyIndependent.distinctSources).toBe(20)
    // The repeated source must stay far below the independent set...
    expect(twentyFromOne.convergence).toBeLessThan(twentyIndependent.convergence / 3)
    // ...and must not even reach the value of three genuinely independent sources.
    expect(twentyFromOne.convergence).toBeLessThan(3)
  })

  it('counts the strongest observation per source in full', () => {
    // One fresh + one stale from the same source ≈ the fresh one, plus a small remainder.
    const r = convergenceScore(
      [ev({ source: 'a' }), ev({ source: 'a', occurredAt: hoursAgo(24) })],
      NOW,
      CFG,
    )
    expect(r.convergence).toBeGreaterThan(1)
    expect(r.convergence).toBeLessThan(1.1)
  })

  it('caps any single source no matter how much it repeats', () => {
    // Geometric weighting bounds one source at strongest / (1 - repeatSourceFactor). That is a
    // supremum: by n=200 the series has converged to it exactly in float64, so the bound is
    // inclusive. What matters is that it never grows past it, however many repeats arrive.
    const ceiling = 1 / (1 - CFG.repeatSourceFactor)
    for (const n of [5, 20, 200, 5000]) {
      const r = convergenceScore(Array.from({ length: n }, () => ev({ source: 'a' })), NOW, CFG)
      expect(r.convergence).toBeLessThanOrEqual(ceiling)
    }
    // And the cap must sit below three genuinely independent sources.
    expect(ceiling).toBeLessThan(3)
  })

  it('ignores events dated in the future', () => {
    const future = new Date(NOW.getTime() + 3_600_000)
    const r = convergenceScore([ev({ occurredAt: future })], NOW, CFG)
    expect(r.convergence).toBe(0)
  })

  it('reports freshness from the newest event', () => {
    const r = convergenceScore(
      [ev({ occurredAt: hoursAgo(10) }), ev({ source: 'b', occurredAt: hoursAgo(2) })],
      NOW,
      CFG,
    )
    expect(r.freshnessHours).toBeCloseTo(2, 6)
  })
})

describe('computeHeat', () => {
  it('is 0 with no events', () => {
    const r = computeHeat([], { marketCapUsd: 100_000 }, NOW, CFG)
    expect(r.heat).toBe(0)
    expect(r.band).toBe('cold')
    expect(r.components.distinctSources).toBe(0)
  })

  it('returns an integer 0-100 — no fake precision', () => {
    const r = computeHeat(
      [ev({ source: 'a' }), ev({ source: 'b' })],
      { marketCapUsd: 250_000 },
      NOW,
      CFG,
    )
    expect(Number.isInteger(r.heat)).toBe(true)
    expect(r.heat).toBeGreaterThanOrEqual(0)
    expect(r.heat).toBeLessThanOrEqual(100)
  })

  it('scores an obscure converged target above a huge one with identical evidence', () => {
    const events = [ev({ source: 'a' }), ev({ source: 'b' }), ev({ source: 'c' })]
    const obscure = computeHeat(events, { marketCapUsd: 300_000 }, NOW, CFG)
    const megacap = computeHeat(events, { marketCapUsd: 8_000_000_000 }, NOW, CFG)
    expect(obscure.heat).toBeGreaterThan(megacap.heat)
  })

  it('decays as evidence ages, with no new events', () => {
    const events = [ev({ source: 'a' }), ev({ source: 'b' })]
    const fresh = computeHeat(events, { marketCapUsd: 500_000 }, NOW, CFG)
    const later = computeHeat(events, { marketCapUsd: 500_000 }, new Date(NOW.getTime() + 12 * 3_600_000), CFG)
    expect(later.heat).toBeLessThan(fresh.heat)
  })

  it('exposes every component that produced the score', () => {
    const r = computeHeat([ev()], { marketCapUsd: 1_000_000 }, NOW, CFG)
    expect(r.components).toMatchObject({
      convergence: expect.any(Number),
      distinctSources: 1,
      eventCount: 1,
      obscurity: expect.any(Number),
      rawScore: expect.any(Number),
    })
  })
})

describe('bands', () => {
  it('escalates in four steps rather than firing one binary threshold', () => {
    expect(bandFor(0, CFG)).toBe('cold')
    expect(bandFor(CFG.bands.warm, CFG)).toBe('warm')
    expect(bandFor(CFG.bands.hot, CFG)).toBe('hot')
    expect(bandFor(CFG.bands.critical, CFG)).toBe('critical')
    expect(bandFor(100, CFG)).toBe('critical')
  })
})

describe('explainHeat', () => {
  it('says nothing happened when nothing happened', () => {
    expect(explainHeat(computeHeat([], {}, NOW, CFG))).toBe('No recent signals.')
  })

  it('describes what was observed, and never predicts', () => {
    const text = explainHeat(
      computeHeat([ev({ source: 'a' }), ev({ source: 'b' })], { marketCapUsd: 200_000 }, NOW, CFG),
    )
    expect(text).toContain('2 independent sources')
    expect(text).not.toMatch(/will|expect|predict|moon|profit|guarantee/i)
  })
})
