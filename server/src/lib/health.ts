// server/src/lib/health.ts
// Provider health, recorded in one place.
//
// This used to live inside the ingest job, which quietly meant only discovery providers ever
// reported health: the risk sources could be down for a week and /radar/status would show four
// green rows. Degradation has to be visible (§31), and a source nobody checks is not visible.

import { query } from '../db.js'

export async function recordSourceHealth(
  id: string,
  ok: boolean,
  latencyMs: number | null,
  error?: string,
): Promise<void> {
  await query(
    `update signal_sources set
       status             = $2,
       last_ok_at         = case when $2 = 'ok' then now() else last_ok_at end,
       last_error         = $3,
       consecutive_errors = case when $2 = 'ok' then 0 else consecutive_errors + 1 end,
       latency_ms         = coalesce($4, latency_ms),
       updated_at         = now()
     where id = $1`,
    [id, ok ? 'ok' : 'degraded', error ?? null, latencyMs],
  ).catch(() => { /* health recording must never break a run */ })
}

export interface HealthCheckable {
  readonly id: string
  healthCheck(): Promise<{ ok: boolean; latencyMs: number | null; error?: string }>
}

/** Probe every provider, including the ones that never run inside a discovery pass. */
export async function checkAllSources(providers: HealthCheckable[]): Promise<{ ok: number; down: number }> {
  let ok = 0
  let down = 0
  for (const p of providers) {
    try {
      const h = await p.healthCheck()
      await recordSourceHealth(p.id, h.ok, h.latencyMs, h.error)
      h.ok ? ok++ : down++
    } catch (e: any) {
      await recordSourceHealth(p.id, false, null, String(e?.message || e))
      down++
    }
  }
  return { ok, down }
}
