// server/src/jobs/assess-provenance.ts
// Runs domain provenance over targets whose footprint has not been checked, or not recently.
//
// Cadence is deliberately slow. A registration date changes once a year at most, so re-checking
// often would spend rate limit on a number that cannot have moved. Contrast assess-risk, where a
// contract's ownership genuinely can change between runs.

import { query, loadConfig } from '../db.js'
import { recomputeRiskLevel } from './risk-rollup.js'
import type { ProvenanceProvider } from '../providers/provenance.js'

export interface ProvenanceRunResult {
  considered: number
  assessed: number
  noDomain: number
  unavailable: number
}

export async function assessProvenance(prov: ProvenanceProvider): Promise<ProvenanceRunResult> {
  const cfg = await loadConfig()
  const staleHours = cfg['provenance.reassess_hours'] ?? 168
  const maxPerRun = cfg['provenance.max_per_run'] ?? 15
  const thresholds = {
    newDomainDays: cfg['provenance.new_domain_days'] ?? 7,
    youngDomainDays: cfg['provenance.young_domain_days'] ?? 30,
  }

  // Only targets we could plausibly check: a website has to have been found by enrichment first.
  // Targets with no website are skipped here rather than written as four unchecked rows every
  // cycle — the absence is already visible as a missing assessment.
  const rows = await query<{ id: string; website: string | null }>(
    `select t.id, t.website
       from targets t
       left join risk_assessments r
         on r.target_id = t.id and r.source = 'provenance'
      where t.website is not null
        and (r.target_id is null or r.assessed_at < now() - ($1 || ' hours')::interval)
      order by t.heat desc, t.first_seen_at desc
      limit $2`,
    [String(staleHours), maxPerRun],
  )

  const result: ProvenanceRunResult = { considered: rows.length, assessed: 0, noDomain: 0, unavailable: 0 }

  for (const row of rows) {
    try {
      const a = await prov.assess(row.website, thresholds)

      if (a.domain === null) {
        // A website that is only a Telegram invite or an aggregator page. Nothing to check, and
        // recording an assessment would imply we had looked at the project's own domain.
        result.noDomain++
        continue
      }
      if (a.checkedCount === 0) {
        // Both sources were unreachable. Writing this row would render as "checked, nothing
        // found" in every list view — the exact failure the checked/unchecked rule exists for.
        result.unavailable++
        continue
      }

      await query(
        `insert into risk_assessments (target_id, source, checks, summary, checked_count, total_count, assessed_at)
         values ($1,'provenance',$2,$3,$4,$5,$6)
         on conflict (target_id, source) do update set
           checks = excluded.checks, summary = excluded.summary,
           checked_count = excluded.checked_count, total_count = excluded.total_count,
           assessed_at = excluded.assessed_at`,
        [row.id, JSON.stringify(a.checks), JSON.stringify(a.summary), a.checkedCount, a.totalCount, a.assessedAt],
      )
      await recomputeRiskLevel(row.id)
      result.assessed++
    } catch (e: any) {
      console.warn('[provenance] failed for', row.id, e?.message)
    }
  }

  return result
}
