import type { VercelRequest, VercelResponse } from '@vercel/node'
import { guard } from './_lib/guard'

// Previously unauthenticated with CORS `*` — anyone could write rows into the public feed.
// Now origin-allowlisted and rate limited. A scan takes ~20s, so 4/min per IP is generous.

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!guard(req as any, res as any, { route: 'save-scan', limit: { perMinute: 4, burst: 8 } })) return

  const SUPABASE_URL = process.env.SUPABASE_URL
  const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY

  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    return res.status(500).json({ error: 'Supabase not configured' })
  }

  try {
    const { handle, project_name, verdict, score, ticker, token_price, market_cap_str, category, profile_image_url, good_highlights, red_flag_count, full_result } = req.body

    if (typeof handle !== 'string' || !/^[a-zA-Z0-9_]{1,15}$/.test(handle)) {
      return res.status(400).json({ error: 'Valid X handle required' })
    }

    // Upsert — if same handle scanned again, update instead of insert
    const r = await fetch(`${SUPABASE_URL}/rest/v1/scans`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Prefer': 'resolution=merge-duplicates',
      },
      body: JSON.stringify({
        handle: handle.toLowerCase(),
        project_name,
        verdict,
        score,
        ticker: ticker || null,
        token_price: token_price || null,
        market_cap_str: market_cap_str || null,
        category,
        profile_image_url: profile_image_url || null,
        good_highlights: good_highlights || [],
        red_flag_count: red_flag_count || 0,
        full_result: full_result || null,
        scanned_at: new Date().toISOString(),
      })
    })

    if (!r.ok) {
      const err = await r.text()
      console.error('Supabase error:', r.status, err)
      // If full_result is too large, retry without it
      if (err.includes('too large') || err.includes('payload') || full_result) {
        const r2 = await fetch(`${SUPABASE_URL}/rest/v1/scans`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': SUPABASE_ANON_KEY,
            'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
            'Prefer': 'resolution=merge-duplicates',
          },
          body: JSON.stringify({
            handle: handle.toLowerCase(),
            project_name,
            verdict,
            score,
            ticker: ticker || null,
            token_price: token_price || null,
            market_cap_str: market_cap_str || null,
            category,
            profile_image_url: profile_image_url || null,
            good_highlights: good_highlights || [],
            red_flag_count: red_flag_count || 0,
            full_result: null,
            scanned_at: new Date().toISOString(),
          })
        })
        if (r2.ok) return res.status(200).json({ success: true, note: 'saved without full_result' })
      }
      return res.status(400).json({ error: err })
    }

    return res.status(200).json({ success: true })
  } catch (e: any) {
    return res.status(500).json({ error: e.message })
  }
}
