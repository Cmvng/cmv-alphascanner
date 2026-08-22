// server/src/routes/performance.ts
// "Did our early signals actually predict anything?" (§29, §51)
//
// FRAMING RULE (§53): this endpoint reports base rates over recorded outcomes. It never says a
// token will do anything. Every number is accompanied by the sample size that produced it, and a
// sample too small to mean anything is labelled as such rather than rendered as a percentage.

import { Router } from 'express'
import { query, hasDatabase } from '../db.js'

export const performanceRouter = Router()

/** Below this, a percentage is noise dressed as a finding. */
const MIN_SAMPLE = 10

performanceRouter.get('/performance', async (req, res) => {
  if (!hasDatabase) return res.status(503).json({ error: 'database_unavailable' })

  const horizon = ['1h', '6h', '24h', '3d', '7d'].includes(String(req.query.horizon))
    ? String(req.query.horizon)
    : '24h'

  try {
    const rows = await query<any>(
      `select
         unnest(sources_at_detect)                        as source,
         count(*)                                          as n,
         count(mcap_${horizon})                            as measured,
         avg(case when market_cap_at_detect > 0 and mcap_${horizon} is not null
                  then mcap_${horizon} / market_cap_at_detect end)          as mean_ratio,
         percentile_cont(0.5) within group (
           order by case when market_cap_at_detect > 0 and mcap_${horizon} is not null
                         then mcap_${horizon} / market_cap_at_detect end)   as median_ratio,
         count(*) filter (where market_cap_at_detect > 0
                            and mcap_${horizon} > market_cap_at_detect)     as up_count,
         count(*) filter (where liquidity_collapsed)                        as collapsed,
         avg(heat_at_detect)                                                as mean_heat_at_detect
       from signal_outcomes
       where market_cap_at_detect is not null
       group by source
       order by n desc`,
    )

    const totals = await query<any>(
      `select count(*)::int as snapshots,
              count(*) filter (where complete)::int as complete,
              min(detected_at) as first_detection
         from signal_outcomes`,
    )

    return res.json({
      horizon,
      // The honest header: how much evidence exists at all.
      coverage: totals[0] ?? { snapshots: 0, complete: 0, first_detection: null },
      min_sample: MIN_SAMPLE,
      by_source: rows.map((r) => {
        const measured = Number(r.measured)
        const sufficient = measured >= MIN_SAMPLE
        return {
          source: r.source,
          snapshots: Number(r.n),
          measured,
          // Percentages are withheld — not zeroed — until the sample supports them.
          sufficient_sample: sufficient,
          median_multiple: sufficient && r.median_ratio !== null ? Number(Number(r.median_ratio).toFixed(3)) : null,
          mean_multiple: sufficient && r.mean_ratio !== null ? Number(Number(r.mean_ratio).toFixed(3)) : null,
          pct_higher: sufficient ? Math.round((Number(r.up_count) / measured) * 100) : null,
          liquidity_collapsed: Number(r.collapsed),
          mean_heat_at_detect: r.mean_heat_at_detect === null ? null : Math.round(Number(r.mean_heat_at_detect)),
          note: sufficient
            ? null
            : `Only ${measured} measured outcome${measured === 1 ? '' : 's'} — too few to report a rate.`,
        }
      }),
      disclaimer:
        'These are recorded base rates over past detections, not predictions. Past behaviour of a signal does not establish what any individual target will do.',
    })
  } catch (e: any) {
    console.error('[performance] query failed', e?.message)
    return res.status(500).json({ error: 'query_failed' })
  }
})
