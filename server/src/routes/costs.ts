// server/src/routes/costs.ts
// What the engine is spending, and — more usefully — what it is spending PER RESULT (§44).

import { Router } from 'express'
import { query, hasDatabase, loadConfig } from '../db.js'

export const costsRouter = Router()

costsRouter.get('/costs', async (req, res) => {
  if (!hasDatabase) return res.status(503).json({ error: 'database_unavailable' })
  const days = Math.min(90, Math.max(1, Number(req.query.days) || 30))

  try {
    // "Qualified" must mean what the heat engine means by it. This was hardcoded to 40, which
    // silently stopped agreeing with the engine the moment `band.warm` was tuned — and tuning
    // thresholds without a deploy is the entire reason they live in the database.
    const cfg = await loadConfig()
    const warmBand = cfg['band.warm'] ?? 40

    const [byProvider, totals, yields] = await Promise.all([
      query(
        `select provider, sum(calls)::int as calls, sum(errors)::int as errors,
                round(sum(est_cost_usd)::numeric, 4) as cost_usd
           from provider_calls where day >= current_date - ($1::int - 1)
          group by provider order by sum(est_cost_usd) desc, sum(calls) desc`,
        [days],
      ),
      query(
        `select coalesce(round(sum(est_cost_usd)::numeric, 4), 0) as cost_usd,
                coalesce(sum(calls), 0)::int as calls,
                coalesce(round(sum(est_cost_usd) filter (where day = current_date)::numeric, 4), 0) as cost_today
           from provider_calls where day >= current_date - ($1::int - 1)`,
        [days],
      ),
      query(
        `select count(*)::int as targets,
                count(*) filter (where heat >= $2)::int as qualified,
                count(*) filter (where alpha_score is not null)::int as scanned
           from targets where first_seen_at > now() - ($1::int || ' days')::interval`,
        [days, warmBand],
      ),
    ])

    const cost = Number(totals[0]?.cost_usd ?? 0)
    const y = yields[0] ?? { targets: 0, qualified: 0, scanned: 0 }

    return res.json({
      window_days: days,
      total_cost_usd: cost,
      cost_today_usd: Number(totals[0]?.cost_today ?? 0),
      total_calls: Number(totals[0]?.calls ?? 0),
      by_provider: byProvider.map((p: any) => ({
        provider: p.provider,
        calls: Number(p.calls),
        errors: Number(p.errors),
        cost_usd: Number(p.cost_usd),
        // A high error rate is a cost even when the calls are free — it burns availability.
        error_rate: Number(p.calls) > 0 ? Math.round((Number(p.errors) / Number(p.calls)) * 100) : 0,
      })),
      // The number that actually matters: spend per useful result, not spend per call.
      efficiency: {
        qualified_at_heat: warmBand,
        targets_discovered: y.targets,
        qualified_signals: y.qualified,
        alpha_scans_run: y.scanned,
        cost_per_qualified_signal: y.qualified > 0 ? Number((cost / y.qualified).toFixed(5)) : null,
        cost_per_scan: y.scanned > 0 ? Number((cost / y.scanned).toFixed(5)) : null,
      },
      note: 'Free providers report $0 but are still counted — rate-limit pressure is a cost in availability.',
    })
  } catch (e: any) {
    return res.status(500).json({ error: 'query_failed', detail: e?.message })
  }
})
