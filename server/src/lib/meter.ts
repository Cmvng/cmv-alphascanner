// server/src/lib/meter.ts
// Counts provider calls so cost is observable rather than assumed (§44).
//
// Buffered in memory and flushed periodically: metering must never add a database round-trip to
// the hot path of a request it is only observing.

import { query } from '../db.js'

interface Bucket { calls: number; errors: number; maxUnitCost: number; costUsd: number }
const buffer = new Map<string, Bucket>()

/** Record one outbound call. `unitCostUsd` is 0 for the free providers. */
export function meter(provider: string, ok: boolean, unitCostUsd = 0): void {
  const b = buffer.get(provider) ?? { calls: 0, errors: 0, maxUnitCost: 0, costUsd: 0 }
  b.calls += 1
  if (!ok) b.errors += 1
  // Cost accumulates PER CALL rather than being reconstructed at flush time as
  // calls × max-unit-cost. That reconstruction was wrong for any provider whose endpoints are
  // priced differently: nine free calls and one at $0.004 reported $0.04, a 10x overstatement
  // of the one number this whole file exists to get right.
  b.costUsd += unitCostUsd
  b.maxUnitCost = Math.max(b.maxUnitCost, unitCostUsd)
  buffer.set(provider, b)
}

/** Flush the buffer into today's row. Safe to call when nothing has happened. */
export async function flushMeter(): Promise<number> {
  if (buffer.size === 0) return 0
  const entries = [...buffer.entries()]
  buffer.clear()

  let flushed = 0
  for (const [provider, b] of entries) {
    try {
      await query(
        `insert into provider_calls (provider, day, calls, errors, unit_cost_usd, est_cost_usd)
         values ($1, current_date, $2, $3, $4, $5)
         on conflict (provider, day) do update set
           calls         = provider_calls.calls + excluded.calls,
           errors        = provider_calls.errors + excluded.errors,
           unit_cost_usd = greatest(provider_calls.unit_cost_usd, excluded.unit_cost_usd),
           est_cost_usd  = provider_calls.est_cost_usd + excluded.est_cost_usd`,
        [provider, b.calls, b.errors, b.maxUnitCost, b.costUsd],
      )
      flushed += b.calls
    } catch {
      // Never break the pipeline being observed — but do not silently discard the counts
      // either. Merge them back so the next flush carries them; the buffer was cleared before
      // the write, so without this a single failed insert loses the window entirely.
      const back = buffer.get(provider) ?? { calls: 0, errors: 0, maxUnitCost: 0, costUsd: 0 }
      back.calls += b.calls
      back.errors += b.errors
      back.costUsd += b.costUsd
      back.maxUnitCost = Math.max(back.maxUnitCost, b.maxUnitCost)
      buffer.set(provider, back)
    }
  }
  return flushed
}
