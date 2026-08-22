// server/src/jobs/dispatch-alerts.ts
// Gets discoveries off the website and onto a phone (§26).
//
// A radar you have to visit is still pull-based — the thing the whole project exists to fix.
// Telegram first: it is where CT already lives, delivery is instant, and the Bot API is free.
//
// Alerts are GRADED, not binary. The heat band decides the urgency of the message rather than
// whether one is sent, which is the pattern both 985monitor (4 tiers) and Uxento (silver/gold)
// converged on independently.

import { query, loadConfig } from '../db.js'

export interface AlertRunResult {
  candidates: number
  sent: number
  failed: number
  skipped: number
}

const BAND_PREFIX: Record<string, string> = {
  critical: '🚨 CRITICAL',
  hot: '🔥 HOT',
  warm: '📈 WARM',
  cold: '·',
}

function escapeMd(s: string): string {
  return String(s).replace(/([_*\[\]()~`>#+=|{}.!-])/g, '\\$1')
}

function buildMessage(t: any): string {
  const prefix = BAND_PREFIX[t.heat_band] || '·'
  const name = escapeMd(t.name || t.symbol || t.contract_address?.slice(0, 12) || 'Unknown')
  const lines = [
    `${prefix} · *${name}*`,
    '',
    `Heat *${t.heat}*${t.alpha_score !== null ? ` · Alpha *${t.alpha_score}*` : ' · _not yet scanned_'}`,
    // Absence of a risk assessment is stated, never implied to be safe.
    t.risk_level ? `Risk: *${escapeMd(t.risk_level)}*` : 'Risk: _not assessed_',
    '',
    `_${escapeMd(t.why || '')}_`,
    '',
    `${t.source_count} independent source${t.source_count === 1 ? '' : 's'} · ${t.signal_count} signals`,
    t.chain ? `Chain: ${escapeMd(t.chain)}` : '',
    '',
    // Never a recommendation — the message reports observations and links to the evidence.
    `[Open evidence](${process.env.PUBLIC_URL || ''}/target/${t.id})`,
  ]
  return lines.filter(Boolean).join('\n')
}

async function sendTelegram(chatId: string, text: string): Promise<{ ok: boolean; error?: string }> {
  const token = process.env.TELEGRAM_BOT_TOKEN
  if (!token) return { ok: false, error: 'TELEGRAM_BOT_TOKEN not configured' }
  try {
    const r = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: 'MarkdownV2',
        disable_web_page_preview: true,
      }),
    })
    if (!r.ok) return { ok: false, error: `HTTP ${r.status}` }
    return { ok: true }
  } catch (e: any) {
    return { ok: false, error: String(e?.message || e) }
  }
}

const RISK_RANK: Record<string, number> = { low: 0, medium: 1, high: 2, critical: 3 }

export async function dispatchAlerts(): Promise<AlertRunResult> {
  const cfg = await loadConfig()
  const maxPerRun = cfg['alerts.max_per_run'] ?? 5

  const rules = await query<any>('select * from alert_rules where enabled = true')
  const result: AlertRunResult = { candidates: 0, sent: 0, failed: 0, skipped: 0 }
  if (rules.length === 0) return result

  for (const rule of rules) {
    // The unique (rule_id, target_id) constraint plus this NOT EXISTS is what stops a target
    // hovering at the threshold from alerting on every single cycle.
    const targets = await query<any>(
      `select t.*,
              count(e.id) as signal_count,
              count(distinct e.source) as source_count
         from targets t
         left join signal_events e on e.target_id = t.id
        where t.heat >= $1
          and t.status <> 'muted'
          and ($2::int is null or t.alpha_score >= $2)
          and ($3::boolean = false or t.alpha_score is not null)
          and (cardinality($4::text[]) = 0 or t.chain = any($4::text[]))
          and not exists (select 1 from alert_deliveries d
                           where d.rule_id = $5 and d.target_id = t.id)
        group by t.id
        order by t.heat desc
        limit $6`,
      [rule.min_heat, rule.min_alpha, rule.require_alpha, rule.chains ?? [], rule.id, maxPerRun],
    )

    result.candidates += targets.length

    for (const t of targets) {
      // Risk ceiling is applied here rather than in SQL so an UNASSESSED target is handled
      // explicitly: unknown risk is not treated as acceptable risk.
      if (rule.max_risk) {
        if (!t.risk_level) { result.skipped++; continue }
        if ((RISK_RANK[t.risk_level] ?? 99) > (RISK_RANK[rule.max_risk] ?? 99)) { result.skipped++; continue }
      }

      const why = t.heat_components
        ? `${t.heat_components.distinctSources} independent source(s), most recent ${
            t.heat_components.freshnessHours === null ? 'unknown' : `${Math.round(t.heat_components.freshnessHours)}h`
          } ago`
        : ''

      const out = await sendTelegram(rule.destination, buildMessage({ ...t, why }))

      await query(
        `insert into alert_deliveries (rule_id, target_id, heat_at_send, band_at_send, status, error)
         values ($1,$2,$3,$4,$5,$6)
         on conflict (rule_id, target_id) do nothing`,
        [rule.id, t.id, t.heat, t.heat_band, out.ok ? 'sent' : 'failed', out.error ?? null],
      )

      if (out.ok) result.sent++
      else result.failed++
    }
  }

  return result
}
