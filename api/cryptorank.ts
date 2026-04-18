// api/cryptorank.ts — Vercel serverless function for CryptoRank API
// Proxies requests to CryptoRank to keep API key server-side
import type { VercelRequest, VercelResponse } from '@vercel/node'

const API_KEY = process.env.CRYPTORANK_API_KEY || ''
const BASE = 'https://api.cryptorank.io/v2'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'GET only' })
  if (!API_KEY) return res.status(500).json({ error: 'CRYPTORANK_API_KEY not set' })

  const { action, query } = req.query as { action?: string; query?: string }
  if (!action || !query) return res.status(400).json({ error: 'action and query required' })

  try {
    if (action === 'search') {
      const r = await fetch(`${BASE}/currencies?api_key=${API_KEY}&search=${encodeURIComponent(query)}&limit=5`)
      if (!r.ok) return res.status(r.status).json({ error: `CryptoRank search failed: ${r.status}` })
      return res.status(200).json(await r.json())
    }

    if (action === 'funding') {
      const r = await fetch(`${BASE}/currencies/${encodeURIComponent(query)}/funding-rounds?api_key=${API_KEY}`)
      if (!r.ok) return res.status(r.status).json({ error: `CryptoRank funding failed: ${r.status}` })
      return res.status(200).json(await r.json())
    }

    if (action === 'unlocks') {
      const r = await fetch(`${BASE}/currencies/${encodeURIComponent(query)}/vesting?api_key=${API_KEY}`)
      if (!r.ok) return res.status(r.status).json({ error: `CryptoRank unlocks failed: ${r.status}` })
      return res.status(200).json(await r.json())
    }

    if (action === 'overview') {
      const r = await fetch(`${BASE}/currencies/${encodeURIComponent(query)}?api_key=${API_KEY}`)
      if (!r.ok) return res.status(r.status).json({ error: `CryptoRank overview failed: ${r.status}` })
      return res.status(200).json(await r.json())
    }

    return res.status(400).json({ error: 'Unknown action. Use: search, funding, unlocks, overview' })
  } catch (e: any) {
    return res.status(500).json({ error: e.message || 'CryptoRank API error' })
  }
}
