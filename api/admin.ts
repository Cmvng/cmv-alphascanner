import type { VercelRequest, VercelResponse } from '@vercel/node'
import { guard } from './_lib/guard'
import { checkPassword, issueToken, requireAdmin } from './_lib/admin-auth'

// Privileged admin operations, server-side.
//   POST { action: 'login',  password }        -> { token }
//   POST { action: 'delete', id }  + Bearer    -> { success }
//
// Deletes now run here with the server's Supabase credentials instead of from the browser with
// the anon key, so RLS no longer has to permit anonymous DELETE on `scans`.

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!guard(req as any, res as any, { route: 'admin', limit: { perMinute: 10, burst: 15 } })) return

  const { action } = (req.body || {}) as any

  if (action === 'login') {
    // Deliberately slow-ish and rate-limited above; no detail on why a login failed.
    if (!checkPassword((req.body as any)?.password)) {
      return res.status(401).json({ error: 'Invalid credentials' })
    }
    return res.status(200).json({ token: issueToken() })
  }

  if (action === 'delete') {
    if (!requireAdmin(req as any, res)) return

    const id = (req.body as any)?.id
    if (typeof id !== 'string' || !/^[0-9a-zA-Z-]{1,64}$/.test(id)) {
      return res.status(400).json({ error: 'Valid id required' })
    }

    const SUPABASE_URL = process.env.SUPABASE_URL
    const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY
    if (!SUPABASE_URL || !SUPABASE_KEY) {
      return res.status(503).json({ error: 'Supabase not configured' })
    }

    try {
      const r = await fetch(`${SUPABASE_URL}/rest/v1/scans?id=eq.${encodeURIComponent(id)}`, {
        method: 'DELETE',
        headers: {
          apikey: SUPABASE_KEY,
          Authorization: `Bearer ${SUPABASE_KEY}`,
          Prefer: 'return=minimal',
        },
      })
      if (!r.ok) {
        const detail = await r.text()
        console.error('[admin] delete failed', r.status, detail)
        return res.status(502).json({ error: 'Delete failed' })
      }
      return res.status(200).json({ success: true })
    } catch (e: any) {
      console.error('[admin] delete error', e?.message)
      return res.status(500).json({ error: 'Delete failed' })
    }
  }

  return res.status(400).json({ error: 'Unknown action' })
}
