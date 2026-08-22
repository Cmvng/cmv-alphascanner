// server/src/jobs/risk-rollup.ts
//
// `targets.risk_level` is a single coarse word used for list views only. With more than one risk
// source it can no longer be written by whichever job ran last — that would let a clean
// provenance result overwrite a critical contract finding purely on timing.
//
// So it is derived, always from every source at once. NULL still means NOT ASSESSED, and stays
// NULL until at least one source has actually run a check.

import { query } from '../db.js'

const ORDER = ['low', 'medium', 'high', 'critical'] as const

export async function recomputeRiskLevel(targetId: string): Promise<string | null> {
  const rows = await query<{ summary: Record<string, number>; checked_count: number }>(
    'select summary, checked_count from risk_assessments where target_id = $1',
    [targetId],
  )

  // A row that checked nothing carries no information — it must not be allowed to produce a
  // 'low', which reads as a clean result.
  const informative = rows.filter((r) => Number(r.checked_count) > 0)
  if (informative.length === 0) {
    await query('update targets set risk_level = null, updated_at = now() where id = $1', [targetId])
    return null
  }

  let worst: (typeof ORDER)[number] = 'low'
  for (const r of informative) {
    for (const level of ORDER) {
      if (Number(r.summary?.[level] ?? 0) > 0 && ORDER.indexOf(level) > ORDER.indexOf(worst)) {
        worst = level
      }
    }
  }

  await query('update targets set risk_level = $2, updated_at = now() where id = $1', [targetId, worst])
  return worst
}
