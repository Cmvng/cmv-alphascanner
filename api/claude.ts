import type { VercelRequest, VercelResponse } from '@vercel/node'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  // Try both env var names — ANTHROPIC_API_KEY (server) or VITE_ANTHROPIC_API_KEY (if set that way)
  const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY || process.env.VITE_ANTHROPIC_API_KEY
  if (!ANTHROPIC_KEY) return res.status(500).json({ error: 'Anthropic key not configured — add ANTHROPIC_API_KEY to Vercel env vars' })

  try {
    const { system, messages } = req.body
    if (!system || !messages) return res.status(400).json({ error: 'Missing system or messages' })

    // Multi-turn loop for web search (pause_turn = still searching, end_turn = done)
    let data: any = null
    let currentMessages = [...messages]

    for (let turn = 0; turn < 5; turn++) {
      const r = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': ANTHROPIC_KEY,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 2000,
          system,
          tools: [{ type: 'web_search_20250305', name: 'web_search', max_uses: 3 }],
          messages: currentMessages,
        })
      })

      data = await r.json()

      if (data.error) break
      if (data.stop_reason === 'end_turn') break
      if (data.stop_reason === 'pause_turn') {
        // Claude is searching — append response and continue
        currentMessages = [...currentMessages, { role: 'assistant', content: data.content }]
        continue
      }
      break
    }

    return res.status(200).json(data)
  } catch (e: any) {
    return res.status(500).json({ error: e.message })
  }
}
