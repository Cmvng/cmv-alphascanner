// server/src/routes/watchlist.ts
//
// Watchlist and operator feedback (§27) — the loop that turns a feed you read into a feed that
// learns. Every write here is admin-gated; the standing rule is that no unauthenticated route
// may write data, and a watchlist is data.
//
// The feedback question is deliberately narrow: "was surfacing this worth your attention?" —
// never "was this a good investment?". The first is answerable from the operator's own
// experience. The second is a price prediction, and asking it would drag exactly the thing this
// system is built to avoid back into the middle of it.

import { Router } from 'express'
import { query, hasDatabase } from '../db.js'
import { requireAdmin } from '../lib/admin.js'

export const watchlistRouter = Router()

const UUID = /^[0-9a-f-]{36}$/i
const VERDICTS = new Set(['useful', 'noise', 'already_knew', 'wrong_risk'])

watchlistRouter.get('/watchlist', async (req, res) => {
  if (!hasDatabase) return res.status(503).json({ error: 'database_unavailable', items: [] })
  if (!(await requireAdmin(req as any, res))) return

  try {
    const rows = await query(
      `select w.target_id, w.note, w.added_at,
              t.name, t.symbol, t.chain, t.x_handle, t.contract_address,
              t.heat, t.heat_band, t.alpha_score, t.risk_level,
              -- Heat at the moment of adding is gone, but the direction since is recoverable
              -- from history, which is the part that says whether watching it was right.
              (select h.heat from heat_history h
                where h.target_id = w.target_id and h.computed_at <= w.added_at
                order by h.computed_at desc limit 1) as heat_when_added
         from watchlist w
         join targets t on t.id = w.target_id
        order by w.added_at desc
        limit 200`,
    )
    return res.json({
      count: rows.length,
      items: rows.map((r: any) => ({
        target_id: r.target_id,
        note: r.note,
        added_at: r.added_at,
        name: r.name,
        symbol: r.symbol,
        chain: r.chain,
        x_handle: r.x_handle,
        contract_address: r.contract_address,
        heat: Number(r.heat),
        heat_band: r.heat_band,
        // null on either of these means NOT YET JUDGED / NOT ASSESSED, not a low value.
        alpha_score: r.alpha_score,
        risk_level: r.risk_level,
        heat_when_added: r.heat_when_added === null ? null : Number(r.heat_when_added),
      })),
    })
  } catch (e: any) {
    console.error('[watchlist] query failed', e?.message)
    return res.status(500).json({ error: 'query_failed', items: [] })
  }
})

watchlistRouter.post('/watchlist', async (req, res) => {
  if (!hasDatabase) return res.status(503).json({ error: 'database_unavailable' })
  if (!(await requireAdmin(req as any, res))) return

  const targetId = String((req.body || {}).target_id || '')
  if (!UUID.test(targetId)) return res.status(400).json({ error: 'invalid_target_id' })
  const note = typeof req.body?.note === 'string' ? req.body.note.slice(0, 500) : null

  try {
    const rows = await query(
      `insert into watchlist (target_id, note) values ($1,$2)
       on conflict (target_id) do update set note = coalesce(excluded.note, watchlist.note)
       returning target_id, added_at`,
      [targetId, note],
    )
    return res.json({ ok: true, item: rows[0] })
  } catch (e: any) {
    // A target id that does not exist trips the foreign key — report it as the caller's error
    // rather than a server fault.
    if (String(e?.code) === '23503') return res.status(404).json({ error: 'target_not_found' })
    console.error('[watchlist] insert failed', e?.message)
    return res.status(500).json({ error: 'write_failed' })
  }
})

watchlistRouter.delete('/watchlist/:targetId', async (req, res) => {
  if (!hasDatabase) return res.status(503).json({ error: 'database_unavailable' })
  if (!(await requireAdmin(req as any, res))) return

  const targetId = String(req.params.targetId)
  if (!UUID.test(targetId)) return res.status(400).json({ error: 'invalid_target_id' })

  try {
    await query('delete from watchlist where target_id = $1', [targetId])
    // Removing something never watched is not an error — the caller's desired state is reached.
    return res.json({ ok: true })
  } catch (e: any) {
    console.error('[watchlist] delete failed', e?.message)
    return res.status(500).json({ error: 'write_failed' })
  }
})

watchlistRouter.post('/feedback', async (req, res) => {
  if (!hasDatabase) return res.status(503).json({ error: 'database_unavailable' })
  if (!(await requireAdmin(req as any, res))) return

  const targetId = String((req.body || {}).target_id || '')
  const verdict = String((req.body || {}).verdict || '')
  if (!UUID.test(targetId)) return res.status(400).json({ error: 'invalid_target_id' })
  if (!VERDICTS.has(verdict)) return res.status(400).json({ error: 'invalid_verdict' })
  const note = typeof req.body?.note === 'string' ? req.body.note.slice(0, 1000) : null

  try {
    // Snapshot the engine's state AT THE MOMENT of judgement, server-side. Taking these from the
    // request body would let a stale browser tab record scores that were never current, and the
    // whole value of the snapshot is that it is what the operator was actually looking at.
    const rows = await query(
      `insert into target_feedback (target_id, verdict, note, heat_at, alpha_at, sources_at)
       select $1, $2, $3, t.heat, t.alpha_score,
              (select array_agg(distinct e.source) from signal_events e where e.target_id = t.id)
         from targets t where t.id = $1
       returning id, created_at`,
      [targetId, verdict, note],
    )
    if (rows.length === 0) return res.status(404).json({ error: 'target_not_found' })
    return res.json({ ok: true, feedback: rows[0] })
  } catch (e: any) {
    console.error('[feedback] insert failed', e?.message)
    return res.status(500).json({ error: 'write_failed' })
  }
})

/**
 * What the operator has said so far, per source.
 *
 * Reported, never auto-applied. Feedback measures whether a signal was worth someone's
 * attention; the trust weights in `update-trust` measure what happened to the market afterwards.
 * They are different questions, and silently averaging them would make both unreadable — so this
 * sits beside the derived weights rather than inside them.
 */
watchlistRouter.get('/feedback/summary', async (req, res) => {
  if (!hasDatabase) return res.status(503).json({ error: 'database_unavailable' })
  if (!(await requireAdmin(req as any, res))) return

  try {
    const rows = await query(
      `select src as source,
              count(*)::int                                         as total,
              count(*) filter (where verdict = 'useful')::int        as useful,
              count(*) filter (where verdict = 'noise')::int         as noise,
              count(*) filter (where verdict = 'already_knew')::int  as already_knew,
              count(*) filter (where verdict = 'wrong_risk')::int    as wrong_risk
         from target_feedback f, unnest(coalesce(f.sources_at, '{}')) as src
        group by src
        order by total desc`,
    )
    const totals = await query(`select count(*)::int as n from target_feedback`)
    return res.json({
      total_feedback: totals[0]?.n ?? 0,
      by_source: rows,
      note: 'Feedback measures whether a signal was worth attention. It is reported alongside derived trust, never folded into it.',
    })
  } catch (e: any) {
    console.error('[feedback] summary failed', e?.message)
    return res.status(500).json({ error: 'query_failed' })
  }
})
