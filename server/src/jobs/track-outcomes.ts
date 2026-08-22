// server/src/jobs/track-outcomes.ts
//
// The feedback loop (§28, §51). Without this the engine can assert that it finds things early
// but cannot demonstrate it — and "we found it early" is exactly the claim a user should not
// take on trust.
//
// NO LOOK-AHEAD (§50): the detection snapshot is written once, from data available at that
// moment, and never revised. Forward measurements are appended at fixed horizons. Nothing here
// reads a later value to justify an earlier decision.

import { query, loadConfig } from '../db.js'
import type { DexScreenerProvider } from '../providers/dexscreener.js'

export interface OutcomeRunResult {
  snapshotted: number
  measured: number
  completed: number
}

const HORIZONS: Array<{ key: string; hours: number }> = [
  { key: '1h', hours: 1 },
  { key: '6h', hours: 6 },
  { key: '24h', hours: 24 },
  { key: '3d', hours: 72 },
  { key: '7d', hours: 168 },
]

/** Record the state of a target the moment it first becomes interesting. Once, immutably. */
async function snapshotDetections(minHeat: number): Promise<number> {
  const rows = await query<{ id: string }>(
    `insert into signal_outcomes (
       target_id, detected_at, heat_at_detect, band_at_detect, alpha_at_detect, risk_at_detect,
       liquidity_at_detect, market_cap_at_detect, volume_at_detect,
       sources_at_detect, event_types_at_detect)
     select t.id, now(), t.heat, t.heat_band, t.alpha_score, t.risk_level,
            t.liquidity_usd, t.market_cap_usd, t.volume_24h_usd,
            coalesce((select array_agg(distinct e.source)     from signal_events e where e.target_id = t.id), '{}'),
            coalesce((select array_agg(distinct e.event_type) from signal_events e where e.target_id = t.id), '{}')
       from targets t
      where t.heat >= $1
        and not exists (select 1 from signal_outcomes o where o.target_id = t.id)
     on conflict do nothing
     returning id`,
    [minHeat],
  )
  return rows.length
}

export async function trackOutcomes(dex: DexScreenerProvider): Promise<OutcomeRunResult> {
  const cfg = await loadConfig()
  const minHeat = cfg['outcomes.snapshot_min_heat'] ?? 40
  const maxMeasure = cfg['outcomes.max_measure_per_run'] ?? 40

  const result: OutcomeRunResult = { snapshotted: 0, measured: 0, completed: 0 }
  result.snapshotted = await snapshotDetections(minHeat)

  // Any snapshot with a horizon that is due and unmeasured.
  const due = await query<any>(
    `select o.*, t.chain, t.contract_address
       from signal_outcomes o
       join targets t on t.id = o.target_id
      where o.complete = false
        and t.contract_address is not null
        and t.chain is not null
      order by o.detected_at asc
      limit $1`,
    [maxMeasure],
  )

  for (const o of due) {
    const ageHours = (Date.now() - new Date(o.detected_at).getTime()) / 3_600_000
    const pending = HORIZONS.filter((h) => ageHours >= h.hours && o[`measured_${h.key}`] === null)
    if (pending.length === 0) {
      // Nothing due yet; mark complete only once the final horizon has passed.
      if (ageHours >= 168) {
        await query('update signal_outcomes set complete = true where id = $1', [o.id])
        result.completed++
      }
      continue
    }

    const info = await dex.enrich(o.chain, o.contract_address)
    // A provider miss must not be recorded as a zero — leave the horizon unmeasured so the
    // aggregate can say "n measured" honestly rather than averaging in a false collapse.
    if (!info) continue

    const mcap = info.marketCapUsd ?? null
    const liq = info.liquidityUsd ?? null

    for (const h of pending) {
      await query(
        `update signal_outcomes
            set mcap_${h.key} = $2, liq_${h.key} = $3, measured_${h.key} = now()
          where id = $1`,
        [o.id, mcap, liq],
      )
      result.measured++
    }

    // Liquidity collapse is a distinct outcome from a price decline and worth flagging on its own.
    if (liq !== null && o.liquidity_at_detect !== null && Number(o.liquidity_at_detect) > 0) {
      const ratio = liq / Number(o.liquidity_at_detect)
      if (ratio < 0.2) {
        await query('update signal_outcomes set liquidity_collapsed = true where id = $1', [o.id])
      }
    }

    if (ageHours >= 168) {
      await query('update signal_outcomes set complete = true where id = $1', [o.id])
      result.completed++
    }
  }

  return result
}
