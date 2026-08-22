// server/src/jobs/compute-heat.ts
// Recompute heat for every target with recent evidence, and append to the time series.

import { query, loadConfig } from '../db.js'
import { loadTrustWeights } from './update-trust.js'
import { computeHeat, DEFAULT_HEAT_CONFIG, type HeatConfig, type HeatEvent } from '../lib/heat.js'

export interface HeatRunResult {
  targetsScored: number
  crossedAutoScan: number
}

/** Build the scoring config from database rows, falling back to the compiled defaults. */
export function configFromDb(cfg: Record<string, number>): HeatConfig {
  const halfLifeHours = { ...DEFAULT_HEAT_CONFIG.halfLifeHours }
  for (const [k, v] of Object.entries(cfg)) {
    if (k.startsWith('halflife.')) halfLifeHours[k.slice('halflife.'.length)] = v
  }
  return {
    ...DEFAULT_HEAT_CONFIG,
    halfLifeHours,
    obscurityReferenceMcap: cfg['obscurity.reference_mcap'] ?? DEFAULT_HEAT_CONFIG.obscurityReferenceMcap,
    obscurityMaxMultiplier: cfg['obscurity.max_multiplier'] ?? DEFAULT_HEAT_CONFIG.obscurityMaxMultiplier,
    bands: {
      warm: cfg['band.warm'] ?? DEFAULT_HEAT_CONFIG.bands.warm,
      hot: cfg['band.hot'] ?? DEFAULT_HEAT_CONFIG.bands.hot,
      critical: cfg['band.critical'] ?? DEFAULT_HEAT_CONFIG.bands.critical,
    },
  }
}

export async function computeHeatForAll(now = new Date()): Promise<HeatRunResult> {
  const raw = await loadConfig()
  // Trust is learned from recorded outcomes, so it is read fresh on every run rather than
  // compiled in — an entity that has been earning its weight should affect the next score.
  const trustWeights = await loadTrustWeights()
  const cfg = { ...configFromDb(raw), trustWeights }
  const autoScanAt = raw['autoscan.min_heat'] ?? 70

  // Only score targets with evidence inside the longest half-life window that still matters.
  // Anything older has decayed below the noise floor anyway.
  const rows = await query<{
    target_id: string
    market_cap_usd: string | null
    events: Array<{ source: string; event_type: string; occurred_at: string; confidence: string; weight: string }>
  }>(
    `select t.id as target_id,
            t.market_cap_usd,
            json_agg(json_build_object(
              'source',      e.source,
              'event_type',  e.event_type,
              'occurred_at', e.occurred_at,
              'confidence',  e.confidence,
              'weight',      e.weight
            )) as events
       from targets t
       join signal_events e on e.target_id = t.id
      where e.occurred_at > now() - interval '7 days'
      group by t.id`,
  )

  let crossed = 0

  for (const row of rows) {
    const events: HeatEvent[] = row.events.map((e) => ({
      source: e.source,
      eventType: e.event_type,
      occurredAt: new Date(e.occurred_at),
      confidence: Number(e.confidence),
      weight: Number(e.weight),
    }))

    const result = computeHeat(
      events,
      { marketCapUsd: row.market_cap_usd === null ? null : Number(row.market_cap_usd) },
      now,
      cfg,
    )

    const prev = await query<{ heat: string; alpha_score: number | null }>(
      'select heat, alpha_score from targets where id = $1',
      [row.target_id],
    )
    const previousHeat = prev.length ? Number(prev[0].heat) : 0
    const alreadyScanned = prev.length ? prev[0].alpha_score !== null : false

    await query(
      `update targets
          set heat = $2, heat_components = $3, heat_band = $4, updated_at = now()
        where id = $1`,
      [row.target_id, result.heat, JSON.stringify(result.components), result.band],
    )

    await query(
      'insert into heat_history (target_id, heat, components, computed_at) values ($1,$2,$3,$4) on conflict do nothing',
      [row.target_id, result.heat, JSON.stringify(result.components), now],
    )

    // Rising edge only — re-crossing the threshold on a target already scanned must not
    // re-spend Anthropic credits every cycle.
    if (result.heat >= autoScanAt && previousHeat < autoScanAt && !alreadyScanned) crossed++
  }

  return { targetsScored: rows.length, crossedAutoScan: crossed }
}
