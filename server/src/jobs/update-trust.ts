// server/src/jobs/update-trust.ts
//
// Trust is EARNED, not asserted (§30).
//
// A hand-curated list of "good sources" is a bootstrap. The destination is a weight derived from
// what actually happened after each entity's signals — which is only possible now that outcomes
// are recorded. 985monitor recomputes its trusted set hourly from realized PnL rather than
// curating it, and that is the right shape.
//
// Two guards keep this honest:
//   - Below `trust.min_sample` measured outcomes, trust is NOT moved. A 2-for-2 record is noise.
//   - Derived trust is blended with the seed rather than replacing it, so one unusual week
//     cannot swing an entity from 1.0 to the floor.

import { query, loadConfig } from '../db.js'

export interface TrustRunResult {
  evaluated: number
  updated: number
  insufficient: number
}

export async function updateTrust(): Promise<TrustRunResult> {
  const cfg = await loadConfig()
  const minSample = cfg['trust.min_sample'] ?? 12
  const floor = cfg['trust.floor'] ?? 0.1
  const ceiling = cfg['trust.ceiling'] ?? 1.0
  const blend = cfg['trust.blend'] ?? 0.7

  // Attribute each recorded outcome to every entity whose signal contributed to it.
  const rows = await query<any>(
    `select e.id,
            e.trust_weight,
            count(o.id)                                         as signals_total,
            count(o.mcap_24h)                                   as measured,
            count(*) filter (where o.market_cap_at_detect > 0
                               and o.mcap_24h > o.market_cap_at_detect) as hits,
            count(*) filter (where o.liquidity_collapsed)       as collapses,
            percentile_cont(0.5) within group (
              order by case when o.market_cap_at_detect > 0 and o.mcap_24h is not null
                            then o.mcap_24h / o.market_cap_at_detect end) as median_multiple
       from signal_entities e
       join signal_outcomes o on e.identifier = any(o.sources_at_detect)
      where e.active = true
      group by e.id, e.trust_weight`,
  )

  const result: TrustRunResult = { evaluated: rows.length, updated: 0, insufficient: 0 }

  for (const r of rows) {
    const measured = Number(r.measured)

    if (measured < minSample) {
      // Record what we know, but do NOT move the weight on a sample this small.
      await query(
        `update signal_entities
            set signals_total = $2, signals_measured = $3, last_evaluated_at = now()
          where id = $1`,
        [r.id, Number(r.signals_total), measured],
      )
      result.insufficient++
      continue
    }

    const hitRate = Number(r.hits) / measured
    const collapseRate = Number(r.collapses) / measured

    // A signal that reliably precedes a liquidity collapse is worse than one that merely
    // fails to go up, so collapses are penalised separately rather than folded into hit rate.
    const rawScore = Math.max(0, hitRate - collapseRate)
    const derived = floor + (ceiling - floor) * rawScore
    const seed = Number(r.trust_weight)
    const next = Math.min(ceiling, Math.max(floor, seed * (1 - blend) + derived * blend))

    await query(
      `update signal_entities
          set trust_weight = $2, trust_source = 'derived',
              signals_total = $3, signals_measured = $4,
              hit_rate = $5, median_multiple = $6, last_evaluated_at = now()
        where id = $1`,
      [r.id, next, Number(r.signals_total), measured, hitRate, r.median_multiple],
    )
    await query(
      'insert into trust_scores (entity_id, trust_weight, hit_rate, sample_size) values ($1,$2,$3,$4)',
      [r.id, next, hitRate, measured],
    )
    result.updated++
  }

  return result
}

/** Current weights, keyed by identifier, for the heat scorer. */
export async function loadTrustWeights(): Promise<Record<string, number>> {
  const rows = await query<{ identifier: string; trust_weight: string }>(
    'select identifier, trust_weight from signal_entities where active = true',
  )
  const out: Record<string, number> = {}
  for (const r of rows) out[r.identifier] = Number(r.trust_weight)
  return out
}
