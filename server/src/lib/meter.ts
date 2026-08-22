// server/src/lib/meter.ts
// Counts provider calls so cost is observable rather than assumed (§44).
//
// Buffered in memory and flushed periodically: metering must never add a database round-trip to
// the hot path of a request it is only observing.

import { query } from '../db.js'

interface Bucket { calls: number; errors: number; unitCost: number }
const buffer = new Map<string, Bucket>()

/** Record one outbound call. `unitCostUsd` is 0 for the free providers. */
export function meter(provider: string, ok: boolean, unitCostUsd = 0): void {
  const b = buffer.get(provider) ?? { calls: 0, errors: 0, unitCost: unitCostUsd }
  b.calls += 1
  if (!ok) b.errors += 1
  // Keep the highest unit cost seen this window — a provider whose price varies by endpoint
  // should not be under-reported.
  b.unitCost = Math.max(b.unitCost, unitCostUsd)
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
        [provider, b.calls, b.errors, b.unitCost, b.calls * b.unitCost],
      )
      flushed += b.calls
    } catch {
      // Losing a metering row must never break the pipeline it is observing.
    }
  }
  return flushed
}
