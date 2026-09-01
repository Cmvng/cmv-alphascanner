// server/src/routes/target.ts
// Everything known about one target: identity, heat with its components, the risk assessment
// (including what could NOT be checked), and the raw evidence timeline.
//
// This is the "why am I looking at this?" view (§23). Every claim links back to evidence.

import { Router } from 'express'
import { query, hasDatabase } from '../db.js'
import { explainHeat } from '../lib/heat.js'

export const targetRouter = Router()

targetRouter.get('/target/:id', async (req, res) => {
  if (!hasDatabase) return res.status(503).json({ error: 'database_unavailable' })

  const id = String(req.params.id)
  if (!/^[0-9a-f-]{36}$/i.test(id)) return res.status(400).json({ error: 'invalid_id' })

  try {
    const [targets, events, history, risk] = await Promise.all([
      query(`select * from targets where id = $1`, [id]),
      query(
        `select e.id, e.source, e.event_type, e.occurred_at, e.ingested_at,
                e.confidence, e.raw_reference
           from signal_events e where e.target_id = $1
          order by e.occurred_at desc limit 100`,
        [id],
      ),
      query(
        `select heat, components, computed_at from heat_history
          where target_id = $1 order by computed_at desc limit 96`,
        [id],
      ),
      query(`select * from risk_assessments where target_id = $1 order by source`, [id]),
    ])

    if (targets.length === 0) return res.status(404).json({ error: 'not_found' })
    const t = targets[0]

    // Two independent risk sources now write here (contract checks and domain provenance). They
    // are merged for display but their availability is tracked separately, so one source timing
    // out cannot make the other's silence look like coverage.
    const merged = risk.length
      ? {
          checks: risk.flatMap((r: any) =>
            (r.checks as any[]).map((c) => ({ ...c, source: r.source })),
          ),
          summary: risk.reduce(
            (acc: Record<string, number>, r: any) => {
              for (const k of ['low', 'medium', 'high', 'critical']) {
                acc[k] = (acc[k] ?? 0) + Number(r.summary?.[k] ?? 0)
              }
              return acc
            },
            { low: 0, medium: 0, high: 0, critical: 0 },
          ),
          checked_count: risk.reduce((n: number, r: any) => n + Number(r.checked_count), 0),
          total_count: risk.reduce((n: number, r: any) => n + Number(r.total_count), 0),
          // Most recent assessment time. Default .sort() coerces Dates to strings and orders
          // them alphabetically by weekday name ("Fri" < "Sun"), so it could report an older
          // source's timestamp as the latest. Compare by epoch millis.
          assessed_at: risk
            .map((r: any) => r.assessed_at)
            .reduce((latest: any, cur: any) =>
              !latest || new Date(cur).getTime() > new Date(latest).getTime() ? cur : latest, null),
          sources: risk.map((r: any) => ({
            source: r.source,
            checked_count: Number(r.checked_count),
            total_count: Number(r.total_count),
            assessed_at: r.assessed_at,
          })),
        }
      : null

    return res.json({
      target: {
        id: t.id,
        kind: t.kind,
        chain: t.chain,
        contract_address: t.contract_address,
        x_handle: t.x_handle,
        website: t.website,
        name: t.name,
        symbol: t.symbol,
        liquidity_usd: t.liquidity_usd === null ? null : Number(t.liquidity_usd),
        market_cap_usd: t.market_cap_usd === null ? null : Number(t.market_cap_usd),
        volume_24h_usd: t.volume_24h_usd === null ? null : Number(t.volume_24h_usd),
        first_seen_at: t.first_seen_at,
        last_event_at: t.last_event_at,
        pool_created_at: t.pool_created_at,
        heat: Number(t.heat),
        heat_band: t.heat_band,
        heat_components: t.heat_components,
        why: t.heat_components
          ? explainHeat({ heat: Number(t.heat), band: t.heat_band ?? 'cold', components: t.heat_components })
          : 'No recent signals.',
        // null => NOT YET SCANNED. The UI must not render this as a low score.
        alpha_score: t.alpha_score,
        alpha_scanned_at: t.alpha_scanned_at,
        status: t.status,
      },
      // Absent => never assessed. Distinct from an assessment that found nothing.
      risk: merged,
      events: events.map((e: any) => ({
        id: e.id,
        source: e.source,
        event_type: e.event_type,
        occurred_at: e.occurred_at,
        confidence: Number(e.confidence),
        reference: e.raw_reference,
      })),
      heat_history: history.reverse().map((h: any) => ({ heat: Number(h.heat), at: h.computed_at })),
    })
  } catch (e: any) {
    console.error('[target] query failed', e?.message)
    return res.status(500).json({ error: 'query_failed' })
  }
})
