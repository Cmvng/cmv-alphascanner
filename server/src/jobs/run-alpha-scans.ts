// server/src/jobs/run-alpha-scans.ts
//
// The join between the two halves of the product. Discovery says "this is moving"; the existing
// scanner says "this is worth something". Only when both scores sit on the same object does the
// Heat × Alpha grid exist at all.
//
// Cost discipline (§44): this is the ONLY path that spends Anthropic credits automatically, so it
// is gated four ways — a heat threshold, a rising edge, a per-run cap, and a re-scan cooldown.

import { query, loadConfig } from '../db.js'
import { meter } from '../lib/meter.js'

export interface AlphaScanResult {
  eligible: number
  scanned: number
  failed: number
  skippedNoHandle: number
}

const SELF = () => `http://127.0.0.1:${process.env.PORT || 3000}`

/**
 * Run the existing scan pipeline against a handle by calling our own API, so the scanner stays
 * the single implementation. It already degrades to the deterministic scorer when Anthropic is
 * unavailable, and we record which path ran.
 */
async function scanHandle(handle: string, unitCostUsd: number): Promise<{ score: number | null; mode: string } | null> {
  try {
    const xr = await fetch(`${SELF()}/api/xproject?handle=${encodeURIComponent(handle)}`)
    if (!xr.ok) return null
    const xd: any = await xr.json()

    const cg = xd?.token_data?.token_live ? xd.token_data : { token_live: false }

    // No Origin header. This is a server-to-server call, not a browser one, and the loopback
    // address it used to send is not — and should not be — in the origin allowlist, so the guard
    // rejected it with 403. Every automatic alpha scan failed silently: `scanHandle` returns null
    // on any non-ok response and the caller stamps `alpha_scanned_at` anyway, so each target was
    // marked attempted and not retried for 24 hours. The join between discovery and judgement —
    // the entire two-axis premise — would never once have produced a score.
    const cr = await fetch(`${SELF()}/api/claude`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ handle, xd, cg, web: null }),
    })
    // The only automatic spend in the system — metered with its real unit cost.
    //
    // Metered AFTER the body is read, not on cr.ok: the handler deliberately returns HTTP 200
    // with an {error} body when Anthropic itself fails, so cr.ok alone would bill us for calls
    // that were rejected upstream and never charged.
    if (!cr.ok) {
      meter('anthropic', false, 0)
      // Say which status came back. A silent null here is how the 403 above went unnoticed.
      console.warn(`[alpha-scan] /api/claude returned ${cr.status} for ${handle}`)
      return null
    }
    const body: any = await cr.json()

    if (body?.error) {
      // Upstream refused — a failed call, and not one we were charged for.
      meter('anthropic', false, 0)
      return { score: null, mode: 'llm_error' }
    }
    meter('anthropic', true, unitCostUsd)

    const text = (body.content || [])
      .filter((b: any) => b.type === 'text')
      .map((b: any) => b.text)
      .join('\n')

    // Same brace-balancing extraction the client uses.
    const match = text.match(/\{[\s\S]*\}/)
    if (!match) return { score: null, mode: 'unparseable' }
    const parsed = JSON.parse(match[0])
    const score = typeof parsed?.overall_score === 'number' ? parsed.overall_score : null
    return { score, mode: body.scan_mode || 'llm' }
  } catch (e: any) {
    console.warn('[alpha-scan] failed for', handle, e?.message)
    return null
  }
}

export async function runAlphaScans(): Promise<AlphaScanResult> {
  const cfg = await loadConfig()
  const minHeat = cfg['autoscan.min_heat'] ?? 70
  // Hard ceiling per run. Even if fifty targets cross at once, spend stays bounded.
  const maxPerRun = cfg['autoscan.max_per_run'] ?? 3

  const rows = await query<{ id: string; x_handle: string | null }>(
    `select id, x_handle
       from targets
      where heat >= $1
        and status <> 'muted'
        -- Eligible only when NEVER attempted (both null), or the 24h cooldown since the last
        -- attempt has elapsed. The old alpha_score-is-null clause made the cooldown a no-op:
        -- a FAILED scan leaves alpha_score null but stamps alpha_scanned_at, so that clause re-selected it on the very next run — a permanently-failing hot target (dead X
        -- handle, unparseable output) was re-scanned every 15 minutes forever, re-spending
        -- credits and monopolising the ordered window so cooler targets never got scanned.
        and (
          (alpha_score is null and alpha_scanned_at is null)
          or alpha_scanned_at < now() - interval '24 hours'
        )
      order by heat desc
      limit $2`,
    [minHeat, maxPerRun * 3], // over-fetch: many will lack a handle
  )

  const result: AlphaScanResult = { eligible: rows.length, scanned: 0, failed: 0, skippedNoHandle: 0 }

  for (const row of rows) {
    if (result.scanned >= maxPerRun) break

    if (!row.x_handle) {
      // Not a failure — we simply cannot judge a token with no social identity yet. It stays
      // on the radar with alpha_score null, which the UI renders as "not yet scanned".
      result.skippedNoHandle++
      continue
    }

    const out = await scanHandle(row.x_handle, cfg['cost.per_alpha_scan_usd'] ?? 0.004)
    if (!out || out.score === null) {
      result.failed++
      // Stamp the attempt so a permanently-failing target cannot be retried every cycle.
      await query('update targets set alpha_scanned_at = now() where id = $1', [row.id]).catch(() => {})
      continue
    }

    await query(
      `update targets set alpha_score = $2, alpha_scanned_at = now(), status = 'scanned', updated_at = now()
        where id = $1`,
      [row.id, Math.round(out.score)],
    )
    result.scanned++
  }

  return result
}
