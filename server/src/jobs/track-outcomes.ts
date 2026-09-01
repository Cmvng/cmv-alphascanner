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

// Each horizon carries a window: measure it only while now is between its due time and `until`.
// A reading taken 30h after detection is NOT a valid "1h" measurement — after downtime, backfil-
// ling every overdue horizon from one current reading records a much-later value into mcac_1h/6h
// and update-trust reads those columns as if taken AT the horizon, so a token that pumped at hour
// 2 and collapsed by hour 30 is scored as a 1h miss it never was. A missed horizon stays NULL
// (honestly unmeasured) rather than being filled with the wrong number.
const HORIZONS: Array<{ key: string; hours: number; until: number }> = [
  { key: '1h', hours: 1, until: 6 },
  { key: '6h', hours: 6, until: 24 },
  { key: '24h', hours: 24, until: 72 },
  { key: '3d', hours: 72, until: 168 },
  { key: '7d', hours: 168, until: 180 },
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
  //
  // The due-ness test has to live in SQL. Selecting the oldest N incomplete rows and filtering
  // in JS meant that once more than N snapshots were open, the same oldest N were returned every
  // run — they stay incomplete until 168h have passed — and everything behind them was never
  // looked at. Newer detections silently missed their 1h and 6h horizons entirely, which is the
  // measurement this table exists to take. Excluding rows with nothing due means the limit is
  // always spent on work that needs doing, so the queue drains instead of stalling.
  const due = await query<any>(
    `select o.*, t.chain, t.contract_address
       from signal_outcomes o
       join targets t on t.id = o.target_id
      where o.complete = false
        and t.contract_address is not null
        and t.chain is not null
        and (
          (o.detected_at <= now() - interval '1 hour'    and o.measured_1h  is null) or
          (o.detected_at <= now() - interval '6 hours'   and o.measured_6h  is null) or
          (o.detected_at <= now() - interval '24 hours'  and o.measured_24h is null) or
          (o.detected_at <= now() - interval '72 hours'  and o.measured_3d  is null) or
          (o.detected_at <= now() - interval '168 hours' and o.measured_7d  is null)
        )
      order by o.detected_at asc
      limit $1`,
    [maxMeasure],
  )

  for (const o of due) {
    const ageHours = (Date.now() - new Date(o.detected_at).getTime()) / 3_600_000
    // Due AND still inside its window. A horizon whose window has fully passed is left unmeasured
    // rather than backfilled with a stale reading (see the HORIZONS note).
    const pending = HORIZONS.filter((h) => ageHours >= h.hours && ageHours < h.until && o[`measured_${h.key}`] === null)
    if (pending.length === 0) continue

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

  // Close out anything past the last horizon plus a grace period, including rows the query above
  // can never return — a target with no contract address is unmeasurable and would otherwise sit
  // in the incomplete set forever, growing it without bound.
  //
  // Unmeasured horizons stay NULL. Completing a row records that we stopped trying; it must
  // never be read as a measurement of zero.
  const swept = await query<{ id: string }>(
    `update signal_outcomes set complete = true
      where complete = false
        and detected_at <= now() - interval '180 hours'
      returning id`,
  )
  result.completed += swept.length

  return result
}
