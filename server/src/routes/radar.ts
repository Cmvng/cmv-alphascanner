// server/src/routes/radar.ts
// Read endpoint for the radar feed.
//
// Ranking is deliberately NOT `order by heat desc` (§52). Heat alone surfaces whatever is
// loudest; the feed should surface what is worth investigating, which also weighs how fresh the
// evidence is, how many independent sources agree, and whether we have judged it yet.

import { Router } from 'express'
import { query, hasDatabase } from '../db.js'
import { explainHeat, type HeatResult } from '../lib/heat.js'

export const radarRouter = Router()

interface Row {
  id: string
  kind: string
  chain: string | null
  contract_address: string | null
  x_handle: string | null
  name: string | null
  symbol: string | null
  liquidity_usd: string | null
  market_cap_usd: string | null
  volume_24h_usd: string | null
  first_seen_at: string
  last_event_at: string | null
  heat: string
  heat_band: string | null
  heat_components: HeatResult['components'] | null
  alpha_score: number | null
  risk_level: string | null
  status: string
  signal_count: string
  source_count: string
  spark: Array<{ h: number; t: string }> | null
}

radarRouter.get('/radar', async (req, res) => {
  if (!hasDatabase) {
    // Never invent numbers (§48). Say the data is unavailable and why.
    return res.status(503).json({ error: 'database_unavailable', targets: [] })
  }

  const chain = typeof req.query.chain === 'string' && req.query.chain !== 'all' ? req.query.chain : null
  const maxAgeHours = Math.min(720, Number(req.query.maxAgeHours) || 168)
  const limit = Math.min(100, Number(req.query.limit) || 50)
  const minHeat = Number(req.query.minHeat) || 0

  try {
    const rows = await query<Row>(
      `select t.*,
              count(e.id)                     as signal_count,
              count(distinct e.source)        as source_count,
              (select json_agg(json_build_object('h', h.heat, 't', h.computed_at)
                        order by h.computed_at)
                 from (select heat, computed_at from heat_history
                        where target_id = t.id
                        order by computed_at desc limit 24) h)  as spark
         from targets t
         left join signal_events e on e.target_id = t.id
        where t.first_seen_at > now() - ($1 || ' hours')::interval
          and t.heat >= $2
          and t.status <> 'muted'
          and ($3::text is null or t.chain = $3)
        group by t.id
        order by
          -- priority, not raw heat: recency and independent agreement both matter, and a
          -- target we have already judged well should outrank one we have not looked at.
          (t.heat
             * (1 + 0.25 * least(count(distinct e.source), 4))
             * exp(-extract(epoch from (now() - coalesce(t.last_event_at, t.first_seen_at))) / 86400.0)
             * (1 + coalesce(t.alpha_score, 0) / 400.0)
          ) desc
        limit $4`,
      [String(maxAgeHours), minHeat, chain, limit],
    )

    return res.json({
      generated_at: new Date().toISOString(),
      count: rows.length,
      targets: rows.map((r) => ({
        id: r.id,
        kind: r.kind,
        chain: r.chain,
        contract_address: r.contract_address,
        x_handle: r.x_handle,
        name: r.name,
        symbol: r.symbol,
        liquidity_usd: r.liquidity_usd === null ? null : Number(r.liquidity_usd),
        market_cap_usd: r.market_cap_usd === null ? null : Number(r.market_cap_usd),
        volume_24h_usd: r.volume_24h_usd === null ? null : Number(r.volume_24h_usd),
        first_seen_at: r.first_seen_at,
        last_event_at: r.last_event_at,
        heat: Number(r.heat),
        heat_band: r.heat_band,
        heat_components: r.heat_components,
        // "Why is this showing?" — assembled from components, never from an LLM.
        why: r.heat_components
          ? explainHeat({ heat: Number(r.heat), band: (r.heat_band as any) ?? 'cold', components: r.heat_components })
          : 'No recent signals.',
        signal_count: Number(r.signal_count),
        source_count: Number(r.source_count),
        // null means NOT YET JUDGED — distinct from a low score (§18 honesty rule).
        alpha_score: r.alpha_score,
        risk_level: r.risk_level,
        status: r.status,
        spark: (r.spark ?? []).map((s) => Number(s.h)),
      })),
    })
  } catch (e: any) {
    console.error('[radar] query failed', e?.message)
    return res.status(500).json({ error: 'query_failed', targets: [] })
  }
})

/** Provider health + last run, so degradation is visible rather than silent (§31). */
radarRouter.get('/radar/status', async (_req, res) => {
  if (!hasDatabase) return res.status(503).json({ error: 'database_unavailable' })
  try {
    const [sources, runs, counts] = await Promise.all([
      query('select id, display_name, status, last_ok_at, last_error, consecutive_errors, latency_ms from signal_sources order by id'),
      query(`select distinct on (job) job, started_at, finished_at, status, events_written, targets_seen
               from cron_runs order by job, started_at desc`),
      query('select count(*)::int as targets, (select count(*)::int from signal_events) as events from targets'),
    ])
    return res.json({ sources, last_runs: runs, totals: counts[0] ?? { targets: 0, events: 0 } })
  } catch (e: any) {
    return res.status(500).json({ error: 'status_failed', detail: e?.message })
  }
})
