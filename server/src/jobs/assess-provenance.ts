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

      // Only "sources unreachable" (a real domain, but RDAP and crt.sh both failed) must NOT be
      // persisted — writing it would render as "checked, nothing found". A no-domain result
      // (website is a Telegram invite or an aggregator page, or the host has no registrable
      // domain) IS a definitive answer and MUST be persisted: its four explicit no_domain checks
      // are what the target UI's "no project website to check" mapping renders, and persisting it
      // stops the target being re-selected on every 45-minute run forever.
      if (a.domain !== null && a.checkedCount === 0) {
        result.unavailable++
        continue
      }
      if (a.domain === null) result.noDomain++

      await query(
        `insert into risk_assessments (target_id, source, checks, summary, checked_count, total_count, assessed_at)
         values ($1,'provenance',$2,$3,$4,$5,$6)
         on conflict (target_id, source) do update set
           checks = excluded.checks, summary = excluded.summary,
           checked_count = excluded.checked_count, total_count = excluded.total_count,
           assessed_at = excluded.assessed_at`,
        [row.id, JSON.stringify(a.checks), JSON.stringify(a.summary), a.checkedCount, a.totalCount, a.assessedAt],
      )
      // recomputeRiskLevel ignores checked_count === 0 rows, so a no_domain assessment correctly
      // leaves risk_level unchanged rather than fabricating a 'low'.
      await recomputeRiskLevel(row.id)
      if (a.domain !== null) result.assessed++
    } catch (e: any) {
      console.warn('[provenance] failed for', row.id, e?.message)
    }
  }

  return result
}
