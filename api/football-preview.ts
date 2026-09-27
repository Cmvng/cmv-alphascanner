// api/football-preview.ts — AI match preview
// Claude searches the web for the latest team news (injuries, suspensions, motivation) and writes
// a short preview that checks the model's numbers against it. This is the "human factors" layer
// on top of the statistical model. GET so Vercel's CDN caches each match's preview.

import type { VercelRequest, VercelResponse } from '@vercel/node'
import Anthropic from '@anthropic-ai/sdk'

const MODEL = 'claude-opus-5'

const SYSTEM = `You are a football analyst writing a short, factual pre-match preview.

You are given a statistical model's probabilities for the match. The model only knows past results and expected goals, so it cannot see injuries, suspensions, rotation, manager changes, fixture congestion or motivation. Your job is to find that missing context with web search and say whether it supports the model or points the other way.

Search for the latest team news for both sides (injuries, suspensions, expected line-ups) and any important context. Prefer sources from the last 7 days. Never invent news: if you find nothing reliable for a team, say so. Do not give staking or betting advice.

Finish with ONLY a JSON object, no other text after it:
{
  "headline": "one sentence, max 15 words",
  "homeNews": ["short bullet", "..."],
  "awayNews": ["short bullet", "..."],
  "factors": ["other context: motivation, derby, congestion, weather, manager change", "..."],
  "verdict": "2-3 sentences on whether the news supports the model's view",
  "nudge": "agree" | "home" | "draw" | "away"
}
"nudge" is the direction the news moves things compared to the model ("agree" if it doesn't change the picture). Keep each bullet under 20 words and at most 4 bullets per list.`

const pct = (v: string | undefined) => `${Math.round(Number(v) * 100)}%`

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })

  const q = req.query as Record<string, string | undefined>
  const { home, away, league, date } = q
  if (!home || !away || !league || !date) return res.status(400).json({ error: 'home, away, league and date are required' })

  const apiKey = process.env.ANTHROPIC_API_KEY || process.env.VITE_ANTHROPIC_API_KEY
  if (!apiKey) return res.status(500).json({ error: 'Anthropic key not configured — add ANTHROPIC_API_KEY to Vercel env vars' })

  const prompt = [
    `Match: ${home} (home) vs ${away} (away), ${league}, kick-off ${date}${q.time ? ` ${q.time}` : ''}.`,
    `Today is ${new Date().toISOString().slice(0, 10)}.`,
    `Model probabilities: ${home} win ${pct(q.ph)}, draw ${pct(q.pd)}, ${away} win ${pct(q.pa)}.`,
    `Model expected goals: ${home} ${Number(q.xgh).toFixed(2)}, ${away} ${Number(q.xga).toFixed(2)}. Most likely score ${q.score ?? 'n/a'}.`,
    q.formh ? `${home} last results (most recent first): ${q.formh}.` : '',
    q.forma ? `${away} last results (most recent first): ${q.forma}.` : '',
  ].filter(Boolean).join('\n')

  try {
    const client = new Anthropic({ apiKey })
    const messages: Anthropic.Beta.BetaMessageParam[] = [{ role: 'user', content: prompt }]
    const content: Anthropic.Beta.BetaContentBlock[] = []
    let response: Anthropic.Beta.BetaMessage | undefined

    // Web search runs server-side; a long search loop can pause and needs re-sending to continue
    for (let i = 0; i < 3; i++) {
      response = await client.beta.messages.create({
        model: MODEL,
        max_tokens: 16000,
        betas: ['server-side-fallback-2026-07-01'],
        fallbacks: 'default',
        output_config: { effort: 'low' },
        system: SYSTEM,
        tools: [{ type: 'web_search_20260209', name: 'web_search', max_uses: 4 }],
        messages,
      })
      content.push(...response.content)
      if (response.stop_reason !== 'pause_turn') break
      messages.push({ role: 'assistant', content: response.content })
    }

    if (!response || response.stop_reason === 'refusal') {
      return res.status(502).json({ error: 'The AI declined to write this preview' })
    }

    const text = content.flatMap(b => (b.type === 'text' ? [b.text] : [])).join('')
    const sources = content.flatMap(b =>
      b.type === 'web_search_tool_result' && Array.isArray(b.content)
        ? b.content.map(r => ({ title: r.title, url: r.url }))
        : [],
    ).filter((s, i, all) => all.findIndex(o => o.url === s.url) === i).slice(0, 6)

    const start = text.indexOf('{'), end = text.lastIndexOf('}')
    let preview: unknown = null
    if (start >= 0 && end > start) {
      try { preview = JSON.parse(text.slice(start, end + 1)) } catch { /* fall through to raw text */ }
    }

    res.setHeader('Cache-Control', 's-maxage=21600, stale-while-revalidate=86400')
    return res.status(200).json({ preview, raw: preview ? undefined : text.trim(), sources, model: response.model })
  } catch (e: any) {
    if (e instanceof Anthropic.RateLimitError) return res.status(429).json({ error: 'AI is busy — try again in a minute' })
    if (e instanceof Anthropic.APIError) return res.status(502).json({ error: `AI error ${e.status}: ${e.message}` })
    return res.status(500).json({ error: e.message })
  }
}
