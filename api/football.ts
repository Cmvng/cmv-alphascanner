// api/football.ts — Football predictions for one league
// GET /api/football?league=E0 → next fixtures with model probabilities, power ratings and this
// season's track record. Data is free (football-data.co.uk + openfootball), so no API key needed.

import type { VercelRequest, VercelResponse } from '@vercel/node'
import { buildLeagueReport, LEAGUES } from '../src/lib/football/engine.js'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  if (req.method === 'OPTIONS') return res.status(200).end()

  const league = String(req.query.league || 'E0').toUpperCase()
  if (!LEAGUES.some(l => l.code === league)) {
    return res.status(400).json({ error: `Unknown league. Use one of: ${LEAGUES.map(l => l.code).join(', ')}` })
  }

  try {
    const report = await buildLeagueReport(league)
    // Results only change a few times a day — let Vercel's CDN serve cached copies
    res.setHeader('Cache-Control', 's-maxage=1800, stale-while-revalidate=21600')
    return res.status(200).json(report)
  } catch (e: any) {
    return res.status(500).json({ error: e.message })
  }
}
