import type { VercelRequest, VercelResponse } from '@vercel/node'
import { guard } from './_lib/guard'
import { buildSystemPrompt } from './_lib/prompt'

// This route used to accept a caller-controlled `system` and `messages` with `CORS: *` and no
// auth — an open proxy to the Anthropic key. It now takes STRUCTURED SCAN INPUT only and builds
// the prompt server-side, so the worst an abuser can do is run a CMV scan against our rate limit.

const MODEL = 'claude-haiku-4-5-20251001'
// The required JSON carries 17 metrics plus team, risks, opportunities and flags. At 4096 the
// response was silently truncating, producing unparseable JSON that fell through to xOnlyScan
// with no signal to the user that the LLM path had failed at all.
const MAX_TOKENS = 8192

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!guard(req as any, res as any, { route: 'claude', limit: { perMinute: 6, burst: 10 } })) return

  const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY
  if (!ANTHROPIC_KEY) {
    return res.status(503).json({ error: 'analysis_unavailable', detail: 'ANTHROPIC_API_KEY not configured' })
  }

  try {
    const { handle, xd, cg, web } = (req.body || {}) as any

    const clean = typeof handle === 'string' ? handle.replace(/[^a-zA-Z0-9_]/g, '').slice(0, 15) : ''
    if (!clean) return res.status(400).json({ error: 'A valid X handle is required' })

    const system = buildSystemPrompt({ handle: clean, xd, cg, web })

    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: MAX_TOKENS,
        system,
        // The user turn is fixed too — nothing the caller sends reaches the model as instructions.
        messages: [
          {
            role: 'user',
            content: `Analyse the crypto project @${clean} using the data in the system prompt. Return JSON only.`,
          },
        ],
      }),
    })

    const data = (await r.json()) as any
    if (!r.ok) {
      console.error('[claude] upstream error', r.status, data?.error?.type || '')
      // Surface the shape the client already branches on, without leaking upstream detail.
      return res.status(200).json({ error: data?.error || { type: 'api_error', message: 'Upstream error' } })
    }

    // Report which path ran, so a silent fall-through to the heuristic scorer is visible.
    return res.status(200).json({ ...data, scan_mode: 'llm' })
  } catch (e: any) {
    console.error('[claude] handler error', e?.message)
    return res.status(200).json({ error: { type: 'api_error', message: e?.message || 'Unknown error' } })
  }
}
