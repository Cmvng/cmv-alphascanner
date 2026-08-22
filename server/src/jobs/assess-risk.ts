// server/src/jobs/assess-risk.ts
// Runs the risk provider over targets that have none, or whose assessment is stale.
//
// Risk is evaluated INDEPENDENTLY of heat and alpha (§21). A target can be moving fast, score
// well on fundamentals, and still carry a critical contract risk — collapsing those into one
// number would hide exactly the thing a user needs to see.

import { query, loadConfig } from '../db.js'
import { recomputeRiskLevel } from './risk-rollup.js'
import type { GoPlusProvider } from '../providers/goplus.js'

export interface RiskRunResult {
  considered: number
  assessed: number
  unavailable: number
}

export async function assessRisk(goplus: GoPlusProvider): Promise<RiskRunResult> {
  const cfg = await loadConfig()
  const staleHours = cfg['risk.reassess_hours'] ?? 24
  const maxPerRun = cfg['risk.max_per_run'] ?? 25

  const rows = await query<{ id: string; chain: string; contract_address: string }>(
    `select t.id, t.chain, t.contract_address
       from targets t
       left join risk_assessments r on r.target_id = t.id and r.source = 'goplus'
      where t.contract_address is not null
        and t.chain is not null
        and (r.target_id is null or r.assessed_at < now() - ($1 || ' hours')::interval)
      order by t.heat desc, t.first_seen_at desc
      limit $2`,
    [String(staleHours), maxPerRun],
  )

  const result: RiskRunResult = { considered: rows.length, assessed: 0, unavailable: 0 }

  for (const row of rows) {
    try {
      const a = await goplus.assess(row.chain, row.contract_address)

      // If nothing could actually be checked, record that rather than writing a clean-looking
      // assessment. An unavailable source must never read as "no risk found".
      if (a.checkedCount === 0) {
        result.unavailable++
        continue
      }

      await query(
        `insert into risk_assessments (target_id, source, checks, summary, checked_count, total_count, assessed_at)
         values ($1,'goplus',$2,$3,$4,$5,$6)
         on conflict (target_id, source) do update set
           checks = excluded.checks, summary = excluded.summary,
           checked_count = excluded.checked_count, total_count = excluded.total_count,
           assessed_at = excluded.assessed_at`,
        [row.id, JSON.stringify(a.checks), JSON.stringify(a.summary), a.checkedCount, a.totalCount, a.assessedAt],
      )
      await recomputeRiskLevel(row.id)
      result.assessed++
    } catch (e: any) {
      console.warn('[risk] failed for', row.id, e?.message)
    }
  }

  return result
}
