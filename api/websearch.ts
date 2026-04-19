// api/websearch.ts — Free web search for project red flags
// Call this BEFORE Claude to find shutdown notices, scams, hacks
// Uses DuckDuckGo instant answer API (free, no key needed)

import type { VercelRequest, VercelResponse } from '@vercel/node'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  if (req.method === 'OPTIONS') return res.status(200).end()

  const { query } = req.query as { query?: string }
  if (!query) return res.status(400).json({ error: 'query required' })

  try {
    const results: { title: string; snippet: string; url: string }[] = []

    // Search 1: Project name + crypto for general news
    const searches = [
      `${query} crypto`,
      `${query} crypto scam OR shutdown OR rug OR hack OR exploit`,
    ]

    for (const q of searches) {
      try {
        // Use DuckDuckGo HTML search (no API key needed)
        const ddgUrl = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(q)}`
        const r = await fetch(ddgUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (compatible; CMVAlphaScanner/1.0)',
          }
        })
        if (r.ok) {
          const html = await r.text()
          // Extract result snippets from DDG HTML
          const resultRegex = /<a rel="nofollow" class="result__a"[^>]*href="([^"]*)"[^>]*>([^<]*)<\/a>[\s\S]*?<a class="result__snippet"[^>]*>([\s\S]*?)<\/a>/g
          let match
          let count = 0
          while ((match = resultRegex.exec(html)) !== null && count < 5) {
            const url = match[1] || ''
            const title = (match[2] || '').replace(/<[^>]*>/g, '').trim()
            const snippet = (match[3] || '').replace(/<[^>]*>/g, '').trim()
            if (title && snippet) {
              results.push({ title, snippet, url })
              count++
            }
          }

          // Fallback: simpler regex for result snippets
          if (count === 0) {
            const simpleRegex = /<a class="result__snippet"[^>]*>([\s\S]*?)<\/a>/g
            let sMatch
            while ((sMatch = simpleRegex.exec(html)) !== null && count < 5) {
              const snippet = (sMatch[1] || '').replace(/<[^>]*>/g, '').trim()
              if (snippet.length > 20) {
                results.push({ title: '', snippet, url: '' })
                count++
              }
            }
          }
        }
      } catch {}
    }

    // Analyze results for red flag keywords
    const redFlagKeywords = [
      'shut down', 'shutdown', 'shutting down', 'closing', 'ceased operations',
      'scam', 'fraud', 'fraudulent', 'ponzi', 'rug pull', 'rugged',
      'hack', 'hacked', 'exploit', 'exploited', 'drained', 'stolen',
      'sec', 'investigation', 'lawsuit', 'sued', 'regulatory',
      'bankrupt', 'insolvent', 'collapsed',
      'warning', 'alert', 'avoid', 'do not invest',
      'exit scam', 'disappeared', 'abandoned',
    ]

    const detectedFlags: { keyword: string; context: string }[] = []
    const allText = results.map(r => `${r.title} ${r.snippet}`).join(' ').toLowerCase()

    for (const kw of redFlagKeywords) {
      if (allText.includes(kw)) {
        // Find the snippet that contains this keyword
        const matchingResult = results.find(r =>
          `${r.title} ${r.snippet}`.toLowerCase().includes(kw)
        )
        if (matchingResult) {
          detectedFlags.push({
            keyword: kw,
            context: (matchingResult.snippet || matchingResult.title).slice(0, 200)
          })
        }
      }
    }

    return res.status(200).json({
      results: results.slice(0, 8),
      detected_flags: detectedFlags,
      has_red_flags: detectedFlags.length > 0,
      flag_summary: detectedFlags.length > 0
        ? detectedFlags.slice(0, 3).map(f => `${f.keyword}: ${f.context}`).join(' | ')
        : 'No red flags found in web search'
    })
  } catch (e: any) {
    return res.status(500).json({ error: e.message, results: [], detected_flags: [], has_red_flags: false })
  }
}
