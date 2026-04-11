import { useState, useEffect, useRef } from 'react'
import { fetchProjectXData } from '../lib/xapi'

const METRICS = [
  { id: 'funding', label: 'Funding Quality', icon: '💰', cat: 'Fundamentals', weight: 200 },
  { id: 'vc_pedigree', label: 'VC Pedigree & Track Record', icon: '🏦', cat: 'Fundamentals', weight: 200 },
  { id: 'copycat', label: 'Originality Check', icon: '🔍', cat: 'Fundamentals', weight: 200 },
  { id: 'niche', label: 'Niche Potential', icon: '🎯', cat: 'Fundamentals', weight: 200 },
  { id: 'location', label: 'Team Location & Ecosystem', icon: '🌍', cat: 'Fundamentals', weight: 200 },
  { id: 'founder_cred', label: 'Founder Credibility', icon: '👤', cat: 'Team', weight: 200 },
  { id: 'founder_activity', label: 'Founder X Activity', icon: '📡', cat: 'Team', weight: 200 },
  { id: 'top_voices', label: 'Top Voices Talking About It', icon: '🎙️', cat: 'Team', weight: 200 },
  { id: 'token', label: 'Token Confirmation', icon: '🪙', cat: 'Opportunity', weight: 200 },
  { id: 'metrics_clarity', label: 'Top 1-10% Requirements', icon: '📊', cat: 'Opportunity', weight: 200 },
  { id: 'user_count', label: 'User Count & Dilution Risk', icon: '👥', cat: 'Opportunity', weight: 200 },
  { id: 'fud', label: 'FUD Alert', icon: '⚠️', cat: 'Sentiment', weight: 200 },
  { id: 'notable_mentions', label: 'Notable CT Mentions', icon: '📣', cat: 'Sentiment', weight: 200 },
  { id: 'content_type', label: 'Organic vs Sponsored', icon: '🎬', cat: 'Sentiment', weight: 200 },
  { id: 'mindshare', label: 'Current Mindshare', icon: '🧠', cat: 'Traction', weight: 200 },
  { id: 'revenue', label: 'Revenue Generation', icon: '📈', cat: 'Traction', weight: 200 },
  { id: 'sentiment', label: 'Overall CT Sentiment', icon: '🌡️', cat: 'Traction', weight: 200 },
]

const CATS = ['Fundamentals', 'Team', 'Opportunity', 'Sentiment', 'Traction']

const PHASES = [
  'Fetching X profile data...',
  'Searching the web for alpha...',
  'Verifying project identity...',
  'Researching VCs & funding...',
  'Detecting red flags...',
  'Computing CMV Alpha Score...',
  'Almost ready...',
]

const LOADING_MSGS = [
  { text: 'Currently scanning.... hold tight', emoji: '🔍' },
  { text: 'Deep diving into the data...', emoji: '🏊' },
  { text: 'Checking what CT is saying...', emoji: '👀' },
  { text: 'Almost there, do not move...', emoji: '🫡' },
  { text: 'Final alpha checks loading...', emoji: '⚡' },
]

const T: Record<string, any> = {
  A: { bg: '#ebfbee', border: '#8ce99a', tc: '#2f9e44', solid: '#37b24d', lbl: 'Tier A', v: 'FARM IT', sub: 'High conviction play. Go hard.', target: 'Top 30-50%', vbg: 'linear-gradient(135deg,#37b24d,#2f9e44)', emoji: '🌾', range: '850-1000' },
  B: { bg: '#fff3bf', border: '#ffe066', tc: '#e67700', solid: '#f59f00', lbl: 'Tier B', v: 'CREATE CONTENT', sub: 'Might cook or not. Keep expectations low.', target: 'Top 20%', vbg: 'linear-gradient(135deg,#f59f00,#e67700)', emoji: '✍️', range: '600-799' },
  C: { bg: '#fff4e6', border: '#ffc078', tc: '#d9480f', solid: '#e8590c', lbl: 'Tier C', v: 'WATCH', sub: 'Too early to call. Monitor closely.', target: 'Top 10%', vbg: 'linear-gradient(135deg,#e8590c,#d9480f)', emoji: '👁️', range: '350-599' },
  D: { bg: '#f1f3f5', border: '#dee2e6', tc: '#495057', solid: '#868e96', lbl: 'Tier D', v: 'SKIP', sub: 'Not worth your time right now.', target: '', vbg: 'linear-gradient(135deg,#868e96,#495057)', emoji: '🚫', range: '0-349' },
}

const HOW_TO_PLAY: Record<string, string> = {
  'AI Project': 'Create content, test the product publicly and document your experience. Early users who build in public get rewarded.',
  'Perp DEX': 'Farm carefully. Use delta neutral strategies or a signal provider. Do not trade with money you cannot afford to lose.',
  'L1/L2': 'Create content, run a node if possible, and perform a wide variety of onchain tasks. Diversity matters more than volume.',
  'Testnet': 'Do every single task available. Testnet rewards go to the most active early users. Screenshot everything.',
  'Prediction Market': 'Farm points aggressively but never bet more than you can lose. Keep farming wallet separate from prediction wallet.',
  'DeFi/Lending': 'Provide liquidity early, monitor unlock schedules, watch for VC dump windows.',
  'NFT/Gaming': 'Engage with the community first, create content, hold floor assets carefully.',
  'RWA': 'Long term hold play. Create educational content. Do not expect a quick airdrop.',
  'SocialFi': 'Be active early, build followers within the app itself, refer aggressively. First mover advantage is everything.',
  'Infrastructure': 'Build something on it publicly. Developer allocations are typically the most generous.',
}

const GOOD_TAGS = [
  { id: 'vc', label: 'Tier 1 VC backed 🔥' },
  { id: 'organic', label: 'Strong organic CT buzz 📣' },
  { id: 'season', label: 'Active season confirmed 🌾' },
  { id: 'lowdilution', label: 'Low dilution risk 💎' },
  { id: 'doxxed', label: 'Doxxed team with track record 👤' },
  { id: 'revenue', label: 'Generating real revenue 📈' },
  { id: 'earlystage', label: 'Early stage — get in now ⏰' },
  { id: 'mindshare', label: 'Rising mindshare fast 🧠' },
]

const BAD_TAGS = [
  { id: 'rughistory', label: 'Rug history detected 🚨' },
  { id: 'allshill', label: '99% paid content — all shill 🤥' },
  { id: 'anonteam', label: 'Anonymous team — no track record ⚠️' },
  { id: 'diluted', label: '2M+ users — heavily diluted 👥' },
  { id: 'noproduct', label: 'No revenue, no product 📉' },
  { id: 'fud', label: 'Active scam allegations 🚩' },
  { id: 'vcbag', label: 'VCs holding massive bags 💀' },
  { id: 'notoken', label: 'No token clarity whatsoever ❓' },
]

function getTier(s: number) { return s >= 85 ? 'A' : s >= 60 ? 'B' : s >= 35 ? 'C' : 'D' }

function computeCombinedScore(alphaScore: number, xScore: number) {
  // 70% Claude alpha analysis + 30% X social score
  const combined = Math.round((alphaScore * 0.5) + (xScore * 0.5))
  return Math.min(1000, Math.max(0, combined))
}

function computeCMVAlphaScore(metrics: any, redFlags: any[]) {
  if (!metrics) return { total: 0, categories: {}, fudPenalty: 0 }
  const cats: Record<string, { score: number; max: number; metrics: string[] }> = {
    Fundamentals: { score: 0, max: 200, metrics: ['funding', 'vc_pedigree', 'copycat', 'niche', 'location'] },
    Team: { score: 0, max: 200, metrics: ['founder_cred', 'founder_activity', 'top_voices'] },
    Opportunity: { score: 0, max: 200, metrics: ['token', 'metrics_clarity', 'user_count'] },
    Sentiment: { score: 0, max: 200, metrics: ['fud', 'notable_mentions', 'content_type'] },
    Traction: { score: 0, max: 200, metrics: ['mindshare', 'revenue', 'sentiment'] },
  }
  for (const [cat, data] of Object.entries(cats)) {
    const scores = data.metrics.map((m: string) => metrics[m]?.score ?? 0)
    const avg = scores.reduce((a: number, b: number) => a + b, 0) / scores.length
    cats[cat].score = Math.round((avg / 100) * 200)
  }
  let fudPenalty = 0
  for (const flag of redFlags) {
    if (!flag?.label) continue
    if (flag.type === 'rug') fudPenalty += 150
    else if (flag.type === 'scam') fudPenalty += 150
    else if (flag.type === 'exploit') fudPenalty += 100
    else if (flag.type === 'dump') fudPenalty += 80
    else if (flag.type === 'shill') fudPenalty += 60
    else if (flag.type === 'anon') fudPenalty += 40
    else fudPenalty += 30
  }
  fudPenalty = Math.min(300, fudPenalty)
  const rawTotal = Object.values(cats).reduce((a: number, c: any) => a + c.score, 0)
  const total = Math.max(0, Math.min(1000, rawTotal - fudPenalty))
  return { total, categories: cats, fudPenalty }
}

function tsq(tier: string, sz = 20) {
  return `<div style="width:${sz}px;height:${sz}px;background:${T[tier].solid};border-radius:${sz > 20 ? 6 : 4}px;display:flex;align-items:center;justify-content:center;font-family:'DM Mono',monospace;font-size:${sz > 20 ? 12 : 9}px;font-weight:500;color:#fff;flex-shrink:0">${tier}</div>`
}

function xjson(text: string) {
  const c = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
  const cands: string[] = []; let d = 0, s = -1
  for (let i = 0; i < c.length; i++) {
    if (c[i] === '{') { if (d === 0) s = i; d++ }
    else if (c[i] === '}') { d--; if (d === 0 && s !== -1) { cands.push(c.slice(s, i + 1)); s = -1 } }
  }
  for (const x of cands.sort((a, b) => b.length - a.length)) {
    try { const o = JSON.parse(x); if (o?.metrics && o?.verdict) return o } catch { continue }
  }
  return null
}

function stripCites(obj: any): any {
  if (typeof obj === 'string') return obj.replace(/<cite[^>]*>|<\/cite>/g, '').replace(/\[\d+\]/g, '').trim()
  if (Array.isArray(obj)) return obj.map(stripCites)
  if (obj && typeof obj === 'object') {
    const clean: any = {}
    for (const k in obj) clean[k] = stripCites(obj[k])
    return clean
  }
  return obj
}

const buildPrompt = (handle: string, xd: any, cg: any) => `You are CMV AlphaScanner, a sharp and brutally honest crypto/Web3 alpha analyst. Today: ${new Date().toDateString()}.

NEVER use <cite> tags, XML tags, numbered references like [1] or [2], or any citation markup. All string fields must be clean plain text only.

REAL X API DATA for @${handle} (ground truth — use this directly):
- Followers: ${xd?.followers?.toLocaleString() || 'unknown'}
- Following: ${xd?.following || 'unknown'}
- Verified: ${xd?.verified || false}
- Account Age: ${xd?.account_age_years || 'unknown'} years
- Total Tweets: ${xd?.tweet_count?.toLocaleString() || 'unknown'}
- Listed Count: ${xd?.listed || 'unknown'}
- Bio: "${xd?.description || 'unknown'}"
- Pinned Tweet: "${xd?.pinned_tweet || 'none'}"
- Confirmed Ticker from X: ${xd?.confirmed_ticker || 'none found'}
- Token launch signals: ${xd?.token_launch_hinted || false}
- CMV X Score: ${xd?.cmv_score || 0}/1000
- Category detected from bio: ${xd?.category || 'unknown'}
- Latest season detected: ${xd?.latest_season ? 'Season ' + xd?.latest_season : 'none'}
- Season dates: ${JSON.stringify(xd?.season_dates || [])}
- Funding mentions in tweets: ${JSON.stringify(xd?.funding_mentions || [])}
- VCs mentioned in tweets: ${JSON.stringify(xd?.vc_mentions || [])}
- Traction data from tweets: ${JSON.stringify(xd?.user_count_mentions || [])}
- Content type: ${xd?.content_type || 'organic'}
- Avg likes per tweet: ${xd?.avg_likes || 0}
- Avg retweets per tweet: ${xd?.avg_retweets || 0}

VERIFIED EXTERNAL DATA (use this directly — do not search for what is already here):
- TVL (DefiLlama): ${xd?.enriched?.tvl || 'not found'}
- Daily fees: ${xd?.enriched?.fees_24h || 'not found'}
- Daily revenue: ${xd?.enriched?.revenue_24h || 'not found'}
- Total raised (DefiLlama): ${xd?.enriched?.total_raised_defillama || 'not found'}
- Total raised (RootData): ${xd?.enriched?.total_raised_rootdata || 'not found'}
- Confirmed investors: ${JSON.stringify(xd?.enriched?.confirmed_investors || [])}
- Team members (RootData): ${JSON.stringify(xd?.enriched?.rootdata_team || [])}
- Chains deployed on: ${JSON.stringify(xd?.enriched?.chains || [])}
- Known hacks/exploits: ${JSON.stringify(xd?.enriched?.known_hacks || [])}
- DEX 24h volume: ${xd?.enriched?.dex_volume_24h || 'not found'}
- DEX liquidity: ${xd?.enriched?.dex_liquidity || 'not found'}
- Token dump detected: ${xd?.enriched?.dex_dump_detected || false}
- Token price change 24h: ${xd?.enriched?.dex_price_change_24h !== null ? xd?.enriched?.dex_price_change_24h + '%' : 'n/a'}
- News sentiment: ${xd?.enriched?.news_sentiment || 'unknown'}
- Recent news (${xd?.enriched?.news_article_count || 0} articles found): ${JSON.stringify(xd?.enriched?.news_recent || [])}
- Red flag headlines from news: ${JSON.stringify(xd?.enriched?.news_red_flags || [])}

IMPORTANT: Since TVL, revenue, investors, and hacks data are already provided above, do NOT waste web searches on these. Instead focus your searches on:
1. FUD, controversies, community complaints, TGE delays
2. Season details and requirements if not found above
3. Notable CT mentions and mindshare

CoinGecko Token Data: ${JSON.stringify(cg)}

Search ONLY for "@${handle}" — do not confuse with other projects.

SCORE INTEGRITY — be brutally honest. Tier A is reserved for the best projects in CT.
- Most projects score 35-65. Above 75 requires exceptional evidence.
- Tier A = 85+ requires ALL of: confirmed Tier 1 VC + doxxed founders with track record + active live product + low dilution risk + strong organic CT + no major red flags
- Tier B = 60-84. Good project but missing 1-2 key signals.
- Tier C = 35-59. Too early, too risky, or too much uncertainty.
- Tier D = 0-34. Skip entirely.
- ANY rug or scam history = maximum score of 40, no exceptions.
- ANY major red flag = automatic cap of 65.
- FUD < 40 = overall max 60. user_count < 30 = overall max 55. vc_pedigree < 40 = overall max 60.
- Do NOT give Tier A just because a project is popular on CT. Popularity ≠ quality.

RED FLAGS — THIS IS MANDATORY. You MUST search for problems first.
Do TWO dedicated searches before anything else:
Search 1: "@${handle} rug scam hack exploit controversy criticism delay postponed"
Search 2: "@${handle} TGE delay presale refund community angry broken promise token launch"

Report every concern you find including:
- Rug history or exit scam by founders on previous projects
- Security exploits, hacks, contract vulnerabilities
- Scam allegations from CT community
- TGE delays: promised token launch repeatedly postponed — how many months delayed?
- Presale taken but no TGE: did they collect presale funds and delay/cancel launch?
- Community anger: CT users calling out the team for delays or broken promises
- Anonymous team with no verifiable background
- Paid shill campaign covering up problems
- Token dump at or after TGE
- Regulatory issues
- High valuation with no token price discovery yet
- No security audit for a project handling sensitive data

ALWAYS report minimum 2-3 concerns. Every project has risks worth flagging.
For each flag include: type, label, specific detail with dates/amounts, source URL.

CRITICAL: If you find ANY of the above, you MUST include it in red_flags with:
- type: one of 'rug', 'scam', 'exploit', 'shill', 'dump', 'anon', 'other'
- label: short clear title
- detail: what happened specifically with numbers where possible
- source: where you found this

Do NOT omit real problems to give a better score. The FUD penalty exists specifically to punish bad actors.
For good_highlights — max 4 short punchy confirmed facts about this project. These appear on the share card.
Format like: "Backed by Coinbase Ventures", "$1.9B trading volume", "Season 3 active Jan-May 2026", "Doxxed team ex-Reface AI"
Make them specific with numbers/names where possible. Never generic like "strong team" or "good product".

CATEGORY — use the X API detected category above first. Only override if web search gives clear contradictory evidence.

SEASON LOGIC — use the X API detected season first:
- If X API found Season 3, use Season 3 everywhere. Never contradict it.
- Only search for season details if X API shows none.
- NEVER invent season numbers.
- The verdict_action and future_seasons MUST use the exact same season number.

PROJECT CATEGORY from bio keywords (use X API category above as primary):
- "prediction market", "predict", "outcome" → Prediction Market
- "perp", "perpetual", "derivatives trading" → Perp DEX
- "layer 1", "layer 2", "L1", "L2", "blockchain" → L1/L2
- "testnet", "devnet" → Testnet
- "lending", "borrow", "yield" → DeFi/Lending
- "NFT", "gaming", "game" → NFT/Gaming
- "real world asset", "RWA", "tokenized" → RWA
- "social", "creator", "content" → SocialFi
- "AI", "agent", "model" → AI Project
- "infrastructure", "protocol", "SDK" → Infrastructure

For team_members: search "[project] founder CEO team" to find real names and roles. Leave x_handle as empty string if not 100% certain. Always return at least 1 team member entry.

VERDICT ACTION — be SPECIFIC to @${handle}. Reference actual season numbers, requirements, and token data found above.

Return ONLY valid JSON, zero text before/after, zero cite tags:
{"project_name":"","ticker":"","description":"","team_location":"","founded":"","project_category":"","verdict":"WATCH","verdict_reason":"","verdict_action":"","overall_score":0,"score_rationale":"","data_accuracy_note":"","post_tge_outlook":"","future_seasons":"","team_members":[{"name":"","role":"","x_handle":"","background":"","confirmed":true}],"project_follows":"","red_flags":[{"type":"other","label":"","detail":"","source":""}],"good_highlights":[""],"mindshare_trend":{"labels":["8w ago","7w ago","6w ago","5w ago","4w ago","3w ago","2w ago","1w ago"],"values":[0,0,0,0,0,0,0,0],"current_pct":"0%","trend":"stable"},"sources":[{"name":"","url":"","used_for":""}],"metrics":{"funding":{"score":0,"detail":"","why_this_score":"","signal":"neutral"},"vc_pedigree":{"score":0,"detail":"","why_this_score":"","signal":"neutral"},"copycat":{"score":0,"detail":"","why_this_score":"","signal":"neutral"},"niche":{"score":0,"detail":"","why_this_score":"","signal":"neutral"},"location":{"score":0,"detail":"","why_this_score":"","signal":"neutral"},"founder_cred":{"score":0,"detail":"","why_this_score":"","signal":"neutral"},"founder_activity":{"score":0,"detail":"","why_this_score":"","signal":"neutral"},"top_voices":{"score":0,"detail":"","why_this_score":"","signal":"neutral"},"token":{"score":0,"detail":"","why_this_score":"","signal":"neutral"},"metrics_clarity":{"score":0,"detail":"","why_this_score":"","signal":"neutral"},"user_count":{"score":0,"detail":"","why_this_score":"","signal":"neutral"},"fud":{"score":0,"detail":"","why_this_score":"","signal":"neutral"},"notable_mentions":{"score":0,"detail":"","why_this_score":"","signal":"neutral"},"content_type":{"score":0,"detail":"","why_this_score":"","signal":"neutral"},"mindshare":{"score":0,"detail":"","why_this_score":"","signal":"neutral"},"revenue":{"score":0,"detail":"","why_this_score":"","signal":"neutral"},"sentiment":{"score":0,"detail":"","why_this_score":"","signal":"neutral"}},"top_risks":[""],"top_opportunities":[""]}`

async function fetchCoinGecko(projectName: string, confirmedTicker?: string | null, tokenHinted?: boolean, xHandle?: string) {
  try {
    let bestCoin: any = null
    if (confirmedTicker) {
      const r = await fetch(`https://api.coingecko.com/api/v3/search?query=${encodeURIComponent(confirmedTicker)}`)
      const d = await r.json()
      const matches = (d.coins || []).filter((c: any) => c.symbol?.toUpperCase() === confirmedTicker.toUpperCase())
      if (matches.length > 0) {
        const pNameLower = projectName.toLowerCase()
        const xHandleLower = (xHandle || '').toLowerCase()
        // Prefer coin whose name matches the project name or handle
        const nameMatch = matches.find((c: any) => {
          const cName = c.name?.toLowerCase() || ''
          return cName.includes(pNameLower) || pNameLower.includes(cName) ||
            cName.includes(xHandleLower) || xHandleLower.includes(cName)
        })
        // Only fall back to rank-based if name match found or only 1 result
        bestCoin = nameMatch || (matches.length === 1 ? matches[0] : null)
      }
    }
    if (!bestCoin) {
      const r = await fetch(`https://api.coingecko.com/api/v3/search?query=${encodeURIComponent(projectName)}`)
      const d = await r.json()
      if (d.coins?.length > 0) {
        const close = d.coins.find((c: any) => {
          const cName = c.name?.toLowerCase() || ''
          const cSymbol = c.symbol?.toUpperCase() || ''
          const pName = projectName.toLowerCase()
          return (confirmedTicker && cSymbol === confirmedTicker.toUpperCase()) || cName === pName || ((cName.includes(pName) || pName.includes(cName)) && (c.market_cap_rank || 9999) < 1500)
        })
        if (close) bestCoin = close
      }
    }
    if (!bestCoin && xHandle) {
      const stripped = xHandle.replace(/^(try|use|get|the|go)/i, '')
      if (stripped.length > 3 && stripped.toLowerCase() !== xHandle.toLowerCase()) {
        const r = await fetch(`https://api.coingecko.com/api/v3/search?query=${encodeURIComponent(stripped)}`)
        const d = await r.json()
        if (d.coins?.length > 0) {
          const nameMatches = (d.coins as any[]).filter((c: any) => {
            const cName = c.name?.toLowerCase() || ''
            return (cName.includes(stripped.toLowerCase()) || stripped.toLowerCase().includes(cName)) && (c.market_cap_rank || 9999) < 2000
          })
          if (nameMatches.length > 0) bestCoin = nameMatches.sort((a: any, b: any) => (a.market_cap_rank || 9999) - (b.market_cap_rank || 9999))[0]
        }
      }
    }
    if (!bestCoin && xHandle) {
      const r = await fetch(`https://api.coingecko.com/api/v3/search?query=${encodeURIComponent(xHandle)}`)
      const d = await r.json()
      if (d.coins?.length > 0 && (d.coins[0].market_cap_rank || 9999) < 2000) bestCoin = d.coins[0]
    }
    if (!bestCoin) return { token_live: false, token_price: 'Not Launched', token_note: 'No matching token found on CoinGecko' }
    const pr = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${bestCoin.id}&vs_currencies=usd&include_market_cap=true`)
    const pd = await pr.json()
    const price = pd[bestCoin.id]?.usd
    const mcap = pd[bestCoin.id]?.usd_market_cap
    if (!price || price === 0) return { token_live: false, ticker: bestCoin.symbol?.toUpperCase(), token_price: 'Not Launched', token_note: 'Listed on CoinGecko but no active price' }
    const pStr = price < 0.01 ? '$' + price.toFixed(6) : price < 1 ? '$' + price.toFixed(4) : '$' + price.toFixed(2)
    const mStr = !mcap ? '' : mcap >= 1e9 ? '$' + (mcap/1e9).toFixed(1) + 'B' : mcap >= 1e6 ? '$' + (mcap/1e6).toFixed(1) + 'M' : '$' + Math.round(mcap).toLocaleString()
    if (!confirmedTicker && !tokenHinted) {
      const rank = bestCoin.market_cap_rank || 9999
      if (rank < 1500) return { token_live: true, ticker: bestCoin.symbol?.toUpperCase(), token_price: pStr, market_cap: mcap, market_cap_str: mStr, token_note: 'Live on CoinGecko · Rank #' + rank }
      return { token_live: false, ticker: bestCoin.symbol?.toUpperCase(), token_price: pStr, token_note: 'Not confirmed in X bio' }
    }
    return { token_live: true, ticker: bestCoin.symbol?.toUpperCase(), token_price: pStr, market_cap: mcap, market_cap_str: mStr, token_note: 'Live on CoinGecko' + (mStr ? ' · MCap ' + mStr : '') }
  } catch { return { token_live: false, token_price: 'Not Launched', token_note: 'CoinGecko lookup failed' } }
}

function MetricRow({ metric, data }: { metric: any, data: any }) {
  const [open, setOpen] = useState(false)
  const sc = typeof data?.score === 'number' ? data.score : 0
  const tier = getTier(sc)
  const col = T[tier].solid
  const sig = data?.signal ?? 'neutral'
  const sigBg = sig === 'bullish' ? '#ebfbee' : sig === 'bearish' ? '#fff5f5' : '#f1f3f5'
  const sigTc = sig === 'bullish' ? '#2f9e44' : sig === 'bearish' ? '#c92a2a' : '#868e96'
  return (
    <div onClick={() => setOpen(o => !o)} style={{ border: `1px solid ${open ? '#c5d0ff' : '#f0f4ff'}`, borderRadius: 10, padding: '11px 13px', marginBottom: 4, cursor: 'pointer', background: open ? '#f8f9ff' : '#fff', transition: 'all 0.15s' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
        <span style={{ fontSize: 14 }}>{metric.icon}</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 5, gap: 8 }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: '#14532d' }}>{metric.label}</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexShrink: 0 }}>
              <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 9, padding: '2px 6px', borderRadius: 20, background: sigBg, color: sigTc }}>{sig}</span>
              <div dangerouslySetInnerHTML={{ __html: tsq(tier, 18) }} />
              <span style={{ fontSize: 15, fontWeight: 800, color: col, minWidth: 22, textAlign: 'right' as const }}>{sc}</span>
            </div>
          </div>
          <div style={{ background: sig === 'bullish' ? '#ebfbee' : sig === 'bearish' ? '#fff5f5' : '#f0f4ff', borderRadius: 3, height: 4, overflow: 'hidden' }}>
            <div style={{ width: `${sc}%`, height: '100%', background: col, borderRadius: 3, transition: 'width 1.1s cubic-bezier(0.4,0,0.2,1)' }} />
          </div>
        </div>
      </div>
      {open && (
        <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid #f0f4ff', paddingLeft: 23 }}>
          {data?.why_this_score && <div style={{ background: sigBg, borderRadius: 6, padding: '5px 10px', marginBottom: 7, fontSize: 11, fontWeight: 600, color: sigTc }}>→ {data.why_this_score}</div>}
          {data?.detail && <div style={{ fontSize: 11, color: '#6c7a9c', lineHeight: 1.7 }}>{data.detail}</div>}
        </div>
      )}
    </div>
  )
}

function TeamCardEnriched({ member }: { member: any }) {
  const [xProfile, setXProfile] = useState<any>(null)
  const [err, setErr] = useState(false)
  const handle = (member.x_handle || '').replace('@', '')
  const cleanHandle = handle.toLowerCase() === 'unknown' || handle === '' ? '' : handle
  useEffect(() => {
    if (!cleanHandle) return
    fetch(`/api/xuser?handle=${cleanHandle}`).then(r => r.ok ? r.json() : null).then(d => { if (d && !d.error) setXProfile(d) }).catch(() => {})
  }, [cleanHandle])
  const ini = (member.name || '?').slice(0, 2).toUpperCase()
  const imgSrc = xProfile?.profile_image_url || member.profile_image_url || (cleanHandle ? `https://unavatar.io/twitter/${cleanHandle}` : null)
  return (
    <div style={{ background: '#f8f9ff', border: '1px solid #dbe4ff', borderRadius: 10, padding: '12px 14px', display: 'flex', alignItems: 'flex-start', gap: 12 }}>
      <div onClick={() => cleanHandle && window.open(`https://x.com/${cleanHandle}`, '_blank', 'noopener,noreferrer')} style={{ flexShrink: 0, cursor: cleanHandle ? 'pointer' : 'default' }}>
        {!err && imgSrc ? <img src={imgSrc} alt={member.name} style={{ width: 42, height: 42, borderRadius: '50%', objectFit: 'cover', border: '1px solid #dbe4ff' }} onError={() => setErr(true)} /> : <div style={{ width: 42, height: 42, borderRadius: '50%', background: '#dcfce7', color: '#15803d', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'DM Mono',monospace", fontSize: 13, fontWeight: 700 }}>{ini}</div>}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' as const, marginBottom: 2 }}>
          <span onClick={() => cleanHandle && window.open(`https://x.com/${cleanHandle}`, '_blank', 'noopener,noreferrer')} style={{ fontSize: 13, fontWeight: 700, color: '#1c2b5a', cursor: cleanHandle ? 'pointer' : 'default' }}>{member.name}</span>
          {!member.confirmed && <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 8, color: '#e67700', background: '#fff3bf', border: '1px solid #ffe066', padding: '1px 6px', borderRadius: 20 }}>unconfirmed</span>}
          {xProfile?.verified && <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 8, color: '#15803d', background: '#dcfce7', padding: '1px 6px', borderRadius: 20 }}>✓</span>}
        </div>
        <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 10, color: '#16a34a', marginBottom: 4 }}>
          {member.role}{cleanHandle ? ` · @${cleanHandle}` : ''}
          {xProfile?.followers ? <span style={{ color: '#9ca3af', marginLeft: 6 }}>{xProfile.followers >= 1000 ? `${(xProfile.followers/1000).toFixed(0)}K` : xProfile.followers} followers</span> : null}
        </div>
        {member.background && <div style={{ fontSize: 11, color: '#6c7a9c', lineHeight: 1.5 }}>{member.background}</div>}
      </div>
    </div>
  )
}

function TeamCard({ member }: { member: any }) {
  const [err, setErr] = useState(false)
  const handle = (member.x_handle || '').replace('@', '').replace('@', '')
  const cleanHandle = handle.toLowerCase() === 'unknown' ? '' : handle
  const ini = (member.name || '?').slice(0, 2).toUpperCase()
  const imgSrc = member.profile_image_url || (cleanHandle ? `https://unavatar.io/twitter/${cleanHandle}` : null)
  return (
    <div style={{ background: '#f8f9ff', border: '1px solid #dbe4ff', borderRadius: 10, padding: '12px 14px', display: 'flex', alignItems: 'flex-start', gap: 12 }}>
      <div onClick={() => cleanHandle && window.open(`https://x.com/${cleanHandle}`, '_blank', 'noopener,noreferrer')} style={{ flexShrink: 0, cursor: cleanHandle ? 'pointer' : 'default' }}>
        {!err && imgSrc ? <img src={imgSrc} alt={member.name} style={{ width: 42, height: 42, borderRadius: '50%', objectFit: 'cover', border: '1px solid #dbe4ff' }} onError={() => setErr(true)} /> : <div style={{ width: 42, height: 42, borderRadius: '50%', background: '#dcfce7', color: '#15803d', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'DM Mono',monospace", fontSize: 13, fontWeight: 700 }}>{ini}</div>}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' as const, marginBottom: 2 }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: '#1c2b5a' }}>{member.name}</span>
          {!member.confirmed && <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 8, color: '#e67700', background: '#fff3bf', border: '1px solid #ffe066', padding: '1px 6px', borderRadius: 20 }}>unconfirmed</span>}
        </div>
        <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 10, color: '#16a34a', marginBottom: 4 }}>{member.role}{cleanHandle ? ` · @${cleanHandle}` : ''}</div>
        {member.background && <div style={{ fontSize: 11, color: '#6c7a9c', lineHeight: 1.5 }}>{member.background}</div>}
      </div>
    </div>
  )
}

function useProfile() {
  const [name, setName] = useState(() => localStorage.getItem('cmv_name') || '')
  const [photo, setPhoto] = useState(() => localStorage.getItem('cmv_photo') || '')
  const save = (n: string, p: string) => { setName(n); setPhoto(p); localStorage.setItem('cmv_name', n); if (p) localStorage.setItem('cmv_photo', p) }
  return { name, photo, save }
}

export default function Home() {
  const [xUrl, setXUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [cgData, setCgData] = useState<any>(null)
  const [xData, setXData] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)
  const [phase, setPhase] = useState(PHASES[0])
  const [elapsed, setElapsed] = useState(0)
  const [msgIdx, setMsgIdx] = useState(0)
  const [pfpLoaded, setPfpLoaded] = useState(false)
  const [atab, setAtab] = useState('Fundamentals')
  const [asec, setAsec] = useState('metrics')
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [showProfileSetup, setShowProfileSetup] = useState(false)
  const [tempName, setTempName] = useState('')
  const [tempPhoto, setTempPhoto] = useState('')
  const { name: userName, photo: userPhoto, save: saveProfile } = useProfile()
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const pint = useRef<any>(null)
  const tint = useRef<any>(null)
  const mint = useRef<any>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => { setTempName(userName); setTempPhoto(userPhoto) }, [userName, userPhoto])

  // Coming from feed — load cached result and refresh X + CoinGecko only (no Claude, no credits)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const q = params.get('q')
    if (!q) return
    window.history.replaceState({}, '', '/')
    const handle = q.toLowerCase()
    setXUrl('https://x.com/' + handle)
    const cacheKey = 'cmv_scan_' + handle

    async function loadFromFeed() {
      let cr: any = null, cc: any = null, cx: any = null

      // 1. Check browser cache
      try {
        const cached = localStorage.getItem(cacheKey)
        if (cached) {
          const parsed = JSON.parse(cached)
          if (parsed.result) { cr = parsed.result; cc = parsed.cgData; cx = parsed.xData }
        }
      } catch {}

      // 2. Check Supabase if no browser cache
      if (!cr) {
        try {
          const sbUrl = import.meta.env.VITE_SUPABASE_URL
          const sbKey = import.meta.env.VITE_SUPABASE_ANON_KEY
          if (sbUrl && sbKey) {
            const r = await fetch(sbUrl + '/rest/v1/scans?handle=eq.' + handle + '&select=full_result&limit=1', {
              headers: { 'apikey': sbKey, 'Authorization': 'Bearer ' + sbKey }
            })
            if (r.ok) {
              const rows = await r.json()
              if (rows[0]?.full_result) {
                cr = rows[0].full_result.result
                cc = rows[0].full_result.cgData
                cx = rows[0].full_result.xData
                try { localStorage.setItem(cacheKey, JSON.stringify({ result: cr, cgData: cc, xData: cx, timestamp: Date.now() })) } catch {}
              }
            }
          }
        } catch {}
      }

      // 3. Not in feed or cache — run full scan to add it
      if (!cr) {
        analyze()
        return
      }

      // 4. Found — show immediately then refresh X + price silently
      setResult(cr)
      setCgData(cc)
      setXData(cx)
      fetchProjectXData(handle).then(freshXd => { if (freshXd) setXData(freshXd) }).catch(() => {})
      if (cc?.ticker) {
        fetchCoinGecko(handle, cc.ticker, true, handle).then(freshCg => { if (freshCg?.token_live) setCgData(freshCg) }).catch(() => {})
      }
    }

    loadFromFeed()
  }, [])

  useEffect(() => {
    if (loading) {
      setElapsed(0); setMsgIdx(0); setPfpLoaded(false)
      tint.current = setInterval(() => setElapsed(e => e + 1), 1000)
      let pi = 0
      pint.current = setInterval(() => { pi = (pi + 1) % PHASES.length; setPhase(PHASES[pi]) }, 4000)
      mint.current = setInterval(() => setMsgIdx(i => Math.min(i + 1, LOADING_MSGS.length - 1)), 12000)
    } else { clearInterval(tint.current); clearInterval(pint.current); clearInterval(mint.current) }
    return () => { clearInterval(tint.current); clearInterval(pint.current); clearInterval(mint.current) }
  }, [loading])

  useEffect(() => {
    if (result?.mindshare_trend && asec === 'mindshare' && canvasRef.current) setTimeout(() => drawChart(result.mindshare_trend), 100)
  }, [asec, result])

  function drawChart(trend: any) {
    const canvas = canvasRef.current
    if (!canvas || !trend?.values?.length) return
    const ctx = canvas.getContext('2d')!
    const vals = trend.values, max = Math.max(...vals, 1)
    const w = canvas.offsetWidth || 700, h = 110, pad = 24
    canvas.width = w; canvas.height = h; ctx.clearRect(0, 0, w, h)
    const pts = vals.map((v: number, i: number) => ({ x: pad + (i / (vals.length - 1)) * (w - pad * 2), y: h - pad - (v / max) * (h - pad * 2) }))
    ctx.beginPath(); ctx.moveTo(pts[0].x, pts[0].y); pts.slice(1).forEach((p: any) => ctx.lineTo(p.x, p.y))
    ctx.strokeStyle = '#3b5bdb'; ctx.lineWidth = 2.5; ctx.lineJoin = 'round'; ctx.stroke()
    ctx.lineTo(pts[pts.length - 1].x, h - pad); ctx.lineTo(pts[0].x, h - pad); ctx.closePath()
    ctx.fillStyle = 'rgba(59,91,219,0.08)'; ctx.fill()
    pts.forEach((p: any) => { ctx.beginPath(); ctx.arc(p.x, p.y, 4, 0, Math.PI * 2); ctx.fillStyle = '#3b5bdb'; ctx.fill(); ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.5; ctx.stroke() });
    (trend.labels || []).forEach((l: string, i: number) => { ctx.fillStyle = '#adb5bd'; ctx.font = "9px 'DM Mono'"; ctx.textAlign = 'center'; ctx.fillText(l, pts[i].x, h - 6) })
  }

  function catScore(cat: string) {
    if (!result) return 0
    const ms = METRICS.filter(m => m.cat === cat)
    return Math.round(ms.map(m => result.metrics?.[m.id]?.score ?? 0).reduce((a: number, b: number) => a + b, 0) / ms.length)
  }

  function toggleTag(id: string) {
    setSelectedTags(prev => prev.includes(id) ? prev.filter(t => t !== id) : prev.length < 2 ? [...prev, id] : prev)
  }

  function handlePhotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => setTempPhoto(ev.target?.result as string)
    reader.readAsDataURL(file)
  }

  async function analyze() {
    const url = xUrl.trim()
    if (!url) return
    const handle = url.replace('https://x.com/', '').replace('https://twitter.com/', '').replace('http://x.com/', '').replace('@', '').split('/')[0].trim()
    if (!handle) return
    const cacheKey = `cmv_scan_${handle.toLowerCase()}`
    setLoading(true); setResult(null); setCgData(null); setXData(null); setError(null); setAtab('Fundamentals'); setAsec('metrics'); setSelectedTags([])
    try {
      const cached = localStorage.getItem(cacheKey)
      if (cached) {
        const { result: cr, cgData: cc, xData: cx, timestamp } = JSON.parse(cached)
        if (Date.now() - timestamp < 1000 * 60 * 60 * 24) { setResult(cr); setCgData(cc); setXData(cx); setLoading(false); return }
      }
    } catch { }
    const xd = await fetchProjectXData(handle)
    setXData(xd)
    let cg = null

    // Priority 1: DexScreener from xproject (most accurate — verifies name match)
    if (xd?.token_data?.token_live && xd.token_data.source === 'dexscreener') {
      cg = xd.token_data
    }

    // Priority 2: GeckoTerminal from xproject
    if (!cg?.token_live && xd?.token_data?.token_live && xd.token_data.source === 'geckoterminal') {
      cg = xd.token_data
    }

    // Priority 3: CoinGecko with confirmed ticker from bio/pinned only
    if (!cg?.token_live && xd?.confirmed_ticker) {
      cg = await fetchCoinGecko(handle, xd.confirmed_ticker, true, handle)
      // Verify name match to prevent false positives like Variational/MON
      if (cg?.token_live && cg?.ticker) {
        const projectLower = (xd?.name || handle).toLowerCase()
        const tickerName = cg.ticker.toLowerCase()
        // If the ticker doesn't appear in bio AND project name doesn't match, be cautious
        const bioHasTicker = (xd?.description || '').toLowerCase().includes('$' + cg.ticker.toLowerCase())
        if (!bioHasTicker && !projectLower.includes(tickerName) && !tickerName.includes(projectLower)) {
          // Unconfirmed match — don't show token
          cg = { token_live: false, token_price: 'Not Launched', token_note: 'Token unconfirmed' }
        }
      }
    }

    // No generic handle-based search — prevents false positives
    if (!cg) cg = { token_live: false, token_price: 'Not Launched', token_note: 'No token found' }
    setCgData(cg)
    // Helper to save result
    const saveResult = (cleaned: any) => {
      try { localStorage.setItem(cacheKey, JSON.stringify({ result: cleaned, cgData: cg, xData: xd, timestamp: Date.now() })) } catch { }
      setResult(cleaned)
      fetch('/api/save-scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          handle,
          project_name: cleaned.project_name,
          verdict: cleaned.verdict,
          score: cleaned.overall_score,
          ticker: cg?.ticker || null,
          token_price: cg?.token_price || null,
          market_cap_str: cg?.market_cap_str || null,
          category: cleaned.project_category,
          profile_image_url: xd?.profile_image_url || null,
          good_highlights: cleaned.good_highlights || [],
          red_flag_count: (cleaned.red_flags || []).filter((f: any) => f.label).length,
          full_result: { result: cleaned, cgData: cg, xData: xd },
        })
      }).catch(() => {})
    }

    // X-only fallback scan — no Claude, uses X data to build basic result
    const xOnlyScan = () => {
      const score = Math.round((xd?.cmv_score || 0) * 0.6)
      const tier = score >= 85 ? 'FARM IT' : score >= 60 ? 'CREATE CONTENT' : score >= 35 ? 'WATCH' : 'SKIP'
      const cleaned = {
        project_name: xd?.name || handle,
        ticker: cg?.ticker || null,
        description: xd?.description || '',
        team_location: '',
        founded: '',
        project_category: xd?.category || 'Crypto',
        verdict: tier,
        verdict_reason: 'Score based on X profile data only. Full analysis unavailable at this time.',
        verdict_action: 'Check back later for a full scan with detailed metrics and red flag detection.',
        overall_score: score,
        score_rationale: 'Estimated from X social score only — deep analysis unavailable.',
        data_accuracy_note: 'Limited data — X API only. Full scan unavailable.',
        post_tge_outlook: '',
        future_seasons: '',
        team_members: [],
        project_follows: '',
        red_flags: [],
        good_highlights: [
          xd?.followers ? (xd.followers >= 1000 ? Math.round(xd.followers/1000) + 'K X followers' : xd.followers + ' X followers') : '',
          xd?.verified ? 'Verified X account' : '',
          cg?.token_live ? (cg.ticker + ' token live at ' + cg.token_price) : '',
        ].filter(Boolean),
        mindshare_trend: { labels: ['8w ago','7w ago','6w ago','5w ago','4w ago','3w ago','2w ago','1w ago'], values: [0,0,0,0,0,0,0,0], current_pct: '0%', trend: 'unknown' },
        sources: [],
        metrics: Object.fromEntries(['funding','vc_pedigree','copycat','niche','location','founder_cred','founder_activity','top_voices','token','metrics_clarity','user_count','fud','notable_mentions','content_type','mindshare','revenue','sentiment'].map(k => [k, { score: Math.round(score * 0.8 + Math.random() * 20), detail: 'Estimated from X data only', why_this_score: 'Full analysis unavailable', signal: 'neutral' }])),
        top_risks: ['Full analysis unavailable — check back later'],
        top_opportunities: ['Scan again when service is restored for full alpha'],
      }
      saveResult(cleaned)
    }

    try {
      const r = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-api-key': import.meta.env.VITE_ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01', 'anthropic-dangerous-direct-browser-access': 'true' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 3000,
          system: buildPrompt(handle, xd, cg),
          tools: [{ type: 'web_search_20250305', name: 'web_search' }],
          messages: [{ role: 'user', content: 'Analyze @' + handle + '. X Bio: ' + JSON.stringify(xd?.description||'') + ' Pinned: ' + JSON.stringify(xd?.pinned_tweet||'') + ' Followers: ' + (xd?.followers||0) + ' CMV: ' + (xd?.cmv_score||0) + '/1000 Ticker: ' + (xd?.confirmed_ticker||'none') + ' Token: ' + JSON.stringify(cg||{}) + '. Return complete JSON only. No cite tags. No numbered references.' }]
        })
      })
      const data = await r.json()

      // Check for credit exhaustion or overload — fall back to X-only
      if (data.error) {
        const errMsg = data.error.message || ''
        const isRateLimit = errMsg.includes('rate limit') || errMsg.includes('tokens per minute')
        const isOverloaded = errMsg.includes('overloaded') || errMsg.includes('529') || data.error.type === 'overloaded_error'
        const isCreditExhausted = errMsg.includes('credit') || errMsg.includes('billing') || errMsg.includes('quota') || data.error.type === 'insufficient_quota'

        if (isCreditExhausted) {
          // Credits finished — fall back to X-only silently
          xOnlyScan()
          return
        } else if (isOverloaded) {
          // Overloaded — fall back to X-only silently
          xOnlyScan()
          return
        } else if (isRateLimit) {
          // Rate limit — auto retry
          setError('rate_limit')
          let secs = 65
          const countdown = setInterval(() => {
            secs -= 1
            setError('rate_limit:' + secs)
            if (secs <= 0) { clearInterval(countdown); setError(null); analyze() }
          }, 1000)
          return
        }
        throw new Error(errMsg)
      }

      const txt = (data.content || []).filter((b: any) => b.type === 'text').map((b: any) => b.text).join('\n')
      if (!txt.trim()) { xOnlyScan(); return }
      const parsed = xjson(txt)
      if (!parsed) { xOnlyScan(); return }
      const cleaned = stripCites(parsed)
      saveResult(cleaned)
    } catch (e: any) {
      const msg = e.message || ''
      if (msg.includes('rate limit') || msg.includes('rate_limit') || msg.includes('tokens per minute')) {
        setError('rate_limit')
        let secs = 65
        const countdown = setInterval(() => {
          secs -= 1
          setError('rate_limit:' + secs)
          if (secs <= 0) { clearInterval(countdown); setError(null); analyze() }
        }, 1000)
      } else if (msg.includes('credit') || msg.includes('billing') || msg.includes('quota') || msg.includes('overload')) {
        // Silent fallback to X-only
        xOnlyScan()
      } else if (msg.includes('Failed to fetch') || msg.includes('network') || msg.includes('NetworkError')) {
        // Both APIs dead — clean message
        setError('unavailable')
      } else {
        setError(msg || 'Something went wrong.')
      }
    } finally { setLoading(false) }
  }

  async function shareResult() {
    if (!result) return
    const ot = getTier(result.overall_score ?? 0)
    const otc = T[ot]
    const tagLabels = selectedTags.map(id => { const good = GOOD_TAGS.find(t => t.id === id); const bad = BAD_TAGS.find(t => t.id === id); return good?.label || bad?.label || '' }).filter(Boolean)
    const name = userName || 'CMV AlphaScanner'
    const text = `${name} says ${otc.v} ${otc.emoji} on ${result.project_name}\n\nAlpha Score: ${result.overall_score}/100 · ${otc.lbl}\n${tagLabels.map(t => `• ${t}`).join('\n')}\n\n${result.verdict_action || result.verdict_reason}\n\n🎯 ${otc.target || 'Skip entirely'}\n\nScanned at cmv-alphascanner.vercel.app`
    try { if (navigator.share) await navigator.share({ text, title: `${result.project_name} — CMV AlphaScanner` }); else { await navigator.clipboard.writeText(text); alert('Copied! Paste it on X.') } } catch { }
  }

  async function downloadCard() {
    if (!result) return
    const ot = getTier(result.overall_score ?? 0)
    const otc = T[ot]
    const colors = otc.vbg.match(/#[0-9a-fA-F]{6}/g) || ['#37b24d', '#2f9e44']

    // Build narrative from result data
    const narrative = result.project_category || 'Crypto'
    const whatBuilding = (result.description || '').split('.')[0].trim().slice(0, 100)
    const catalyst = result.future_seasons || result.post_tge_outlook || ''
    const verdictText = (result.verdict_action || result.verdict_reason || '').slice(0, 120)

    // High res canvas
    const canvas = document.createElement('canvas')
    const W = 1200, H = 630
    canvas.width = W; canvas.height = H
    const ctx = canvas.getContext('2d')!

    // Background
    const grad = ctx.createLinearGradient(0, 0, W, H)
    grad.addColorStop(0, colors[0])
    grad.addColorStop(1, colors[1] || colors[0])
    ctx.fillStyle = grad
    ctx.fillRect(0, 0, W, H)

    // Subtle circle decorations
    ctx.save()
    ctx.globalAlpha = 0.06
    ctx.fillStyle = '#fff'
    ctx.beginPath(); ctx.arc(W + 60, -60, 340, 0, Math.PI * 2); ctx.fill()
    ctx.beginPath(); ctx.arc(-80, H + 80, 260, 0, Math.PI * 2); ctx.fill()
    ctx.restore()

    // ── TOP ROW: Project PFP + Name + Score ──
    const pfpUrl = xData?.profile_image_url
    let pfpLoaded = false
    if (pfpUrl) {
      try {
        await new Promise<void>((resolve) => {
          const img = new Image()
          img.crossOrigin = 'anonymous'
          img.onload = () => {
            ctx.save()
            ctx.beginPath()
            ctx.arc(80, 90, 58, 0, Math.PI * 2)
            ctx.clip()
            ctx.drawImage(img, 22, 32, 116, 116)
            ctx.restore()
            ctx.strokeStyle = 'rgba(255,255,255,0.5)'
            ctx.lineWidth = 3
            ctx.beginPath()
            ctx.arc(80, 90, 58, 0, Math.PI * 2)
            ctx.stroke()
            pfpLoaded = true
            resolve()
          }
          img.onerror = () => resolve()
          img.src = pfpUrl
        })
      } catch {}
    }
    if (!pfpLoaded) {
      // Fallback initial
      ctx.fillStyle = 'rgba(255,255,255,0.2)'
      ctx.beginPath(); ctx.arc(80, 90, 58, 0, Math.PI * 2); ctx.fill()
      ctx.fillStyle = '#fff'
      ctx.font = 'bold 44px Arial'
      ctx.textAlign = 'center'
      ctx.fillText((result.project_name || '?').charAt(0).toUpperCase(), 80, 108)
      ctx.textAlign = 'left'
    }

    const textX = pfpUrl ? 160 : 50

    // Project name
    ctx.fillStyle = '#fff'
    ctx.font = 'bold 52px Arial, sans-serif'
    ctx.fillText((result.project_name || '').slice(0, 22), textX, 78)

    // Category badge
    ctx.fillStyle = 'rgba(255,255,255,0.22)'
    const catW = ctx.measureText(narrative).width + 32
    ctx.beginPath(); ctx.roundRect(textX, 88, catW, 30, 15); ctx.fill()
    ctx.fillStyle = '#fff'
    ctx.font = 'bold 14px Arial'
    ctx.fillText(narrative, textX + 16, 108)

    // Score — top right
    ctx.fillStyle = '#fff'
    ctx.font = 'bold 110px Arial, sans-serif'
    ctx.textAlign = 'right'
    ctx.fillText(String(result.overall_score ?? 0), W - 40, 120)
    ctx.font = '16px monospace'
    ctx.globalAlpha = 0.65
    ctx.fillText('ALPHA SCORE', W - 40, 148)
    ctx.globalAlpha = 1
    ctx.font = 'bold 18px monospace'
    ctx.fillText(ot + ' · ' + otc.lbl, W - 40, 172)
    ctx.textAlign = 'left'

    // ── DIVIDER ──
    ctx.strokeStyle = 'rgba(255,255,255,0.15)'
    ctx.lineWidth = 1
    ctx.beginPath(); ctx.moveTo(40, 168); ctx.lineTo(W - 40, 168); ctx.stroke()

    // ── MIDDLE: What it's building + Narrative + Catalyst ──
    const midY = 200

    // What it's building
    ctx.fillStyle = 'rgba(255,255,255,0.55)'
    ctx.font = '13px monospace'
    ctx.fillText("WHAT IT BUILDS", 44, midY)
    ctx.fillStyle = '#fff'
    ctx.font = '20px Arial, sans-serif'
    // Word wrap
    const buildWords = whatBuilding.split(' ')
    let buildLine = '', buildY = midY + 26
    for (const word of buildWords) {
      const test = buildLine + word + ' '
      if (ctx.measureText(test).width > W * 0.55 && buildLine) {
        ctx.fillText(buildLine.trim(), 44, buildY)
        buildLine = word + ' '; buildY += 26
        if (buildY > midY + 80) break
      } else buildLine = test
    }
    if (buildY <= midY + 80) ctx.fillText(buildLine.trim(), 44, buildY)

    // Trending narrative pill
    const trendY = midY + 110
    ctx.fillStyle = 'rgba(255,255,255,0.15)'
    ctx.beginPath(); ctx.roundRect(44, trendY - 20, 220, 32, 16); ctx.fill()
    ctx.fillStyle = '#fff'
    ctx.font = 'bold 14px Arial'
    ctx.fillText('🔥 ' + narrative + ' narrative', 60, trendY + 4)

    // Catalyst (what to watch)
    if (catalyst && catalyst.length > 10) {
      ctx.fillStyle = 'rgba(255,255,255,0.55)'
      ctx.font = '12px monospace'
      ctx.fillText("WATCH FOR", 44, trendY + 44)
      ctx.fillStyle = '#fff'
      ctx.font = '16px Arial'
      const catalystShort = catalyst.slice(0, 80) + (catalyst.length > 80 ? '…' : '')
      ctx.fillText(catalystShort, 44, trendY + 64)
    }

    // ── RIGHT SIDE: User PFP + says + verdict ──
    const rightX = W * 0.62

    // User PFP — drawn from base64, no crossOrigin needed
    let userPfpDrawn = false
    if (userPhoto) {
      try {
        await new Promise<void>((resolve) => {
          const uImg = new Image()
          uImg.onload = () => {
            ctx.save()
            ctx.beginPath()
            ctx.arc(rightX + 28, midY + 18, 24, 0, Math.PI * 2)
            ctx.clip()
            ctx.drawImage(uImg, rightX + 4, midY - 6, 48, 48)
            ctx.restore()
            ctx.strokeStyle = 'rgba(255,255,255,0.8)'
            ctx.lineWidth = 2.5
            ctx.beginPath()
            ctx.arc(rightX + 28, midY + 18, 24, 0, Math.PI * 2)
            ctx.stroke()
            userPfpDrawn = true
            resolve()
          }
          uImg.onerror = () => resolve()
          uImg.src = userPhoto
        })
      } catch {}
    }
    if (!userPfpDrawn) {
      // Initials fallback
      ctx.fillStyle = 'rgba(255,255,255,0.3)'
      ctx.beginPath(); ctx.arc(rightX + 28, midY + 18, 24, 0, Math.PI * 2); ctx.fill()
      ctx.fillStyle = '#fff'
      ctx.font = 'bold 18px Arial'
      ctx.textAlign = 'center'
      ctx.fillText((userName || 'C').charAt(0).toUpperCase(), rightX + 28, midY + 26)
      ctx.textAlign = 'left'
    }

    // "@username says..."
    ctx.fillStyle = '#fff'
    ctx.font = 'bold 15px Arial'
    ctx.fillText('@' + (userName || 'cmvng') + ' says', rightX + 62, midY + 14)
    ctx.font = 'bold 22px Arial'
    ctx.fillText(otc.v.toLowerCase() + ' ' + otc.emoji, rightX + 62, midY + 38)

    // Verdict box
    const vBoxY = midY + 64
    ctx.fillStyle = 'rgba(0,0,0,0.2)'
    ctx.beginPath(); ctx.roundRect(rightX, vBoxY, W - rightX - 40, 130, 14); ctx.fill()
    ctx.fillStyle = '#fff'
    ctx.font = 'bold 18px Arial'
    ctx.fillText(otc.emoji + '  ' + otc.v, rightX + 16, vBoxY + 30)
    ctx.globalAlpha = 0.85
    ctx.font = '14px Arial'
    // Word wrap verdict
    const vWords = verdictText.split(' ')
    let vLine = '', vLineY = vBoxY + 58
    for (const word of vWords) {
      const test = vLine + word + ' '
      if (ctx.measureText(test).width > W - rightX - 72 && vLine) {
        ctx.fillText(vLine.trim(), rightX + 16, vLineY)
        vLine = word + ' '; vLineY += 22
        if (vLineY > vBoxY + 122) break
      } else vLine = test
    }
    if (vLineY <= vBoxY + 122) ctx.fillText(vLine.trim(), rightX + 16, vLineY)
    ctx.globalAlpha = 1

    // ── BOTTOM: Highlights row ──
    const hlY = 530
    ctx.strokeStyle = 'rgba(255,255,255,0.12)'
    ctx.lineWidth = 1
    ctx.beginPath(); ctx.moveTo(40, hlY - 14); ctx.lineTo(W - 40, hlY - 14); ctx.stroke()

    const goodHighlights = (result.good_highlights || []).filter((h: string) => h && h.length > 5)
    let hx = 44
    ctx.font = 'bold 13px Arial'
    goodHighlights.slice(0, 3).forEach((h: string) => {
      let label = '✓ ' + h
      const maxW = (W - 200) / 3 - 16
      while (ctx.measureText(label).width > maxW && label.length > 4) label = label.slice(0, -4) + '…'
      const pw = ctx.measureText(label).width + 24
      ctx.fillStyle = 'rgba(255,255,255,0.15)'
      ctx.beginPath(); ctx.roundRect(hx, hlY, pw, 30, 15); ctx.fill()
      ctx.fillStyle = '#fff'
      ctx.fillText(label, hx + 12, hlY + 20)
      hx += pw + 8
    })

    // Red flags badge
    const flagCount = (result.red_flags || []).filter((f: any) => f.label).length
    if (flagCount > 0) {
      ctx.fillStyle = 'rgba(200,30,30,0.85)'
      ctx.beginPath(); ctx.roundRect(W - 180, hlY, 140, 30, 15); ctx.fill()
      ctx.fillStyle = '#fff'
      ctx.font = 'bold 13px Arial'
      ctx.textAlign = 'center'
      ctx.fillText('🚨 ' + flagCount + ' red flag' + (flagCount > 1 ? 's' : ''), W - 110, hlY + 20)
      ctx.textAlign = 'left'
    }

    // Footer
    ctx.globalAlpha = 0.3
    ctx.fillStyle = '#fff'
    ctx.font = '13px monospace'
    ctx.fillText('CMV ALPHASCANNER  ·  cmv-alphascanner.vercel.app', 44, H - 16)
    ctx.globalAlpha = 1

    const link = document.createElement('a')
    link.download = (result.project_name || 'scan').replace(/[^a-zA-Z0-9]/g, '_') + '-cmv-alpha.png'
    link.href = canvas.toDataURL('image/png', 1.0)
    link.click()
  }

  const ot = result ? getTier(result.overall_score ?? 0) : 'C'
  const otc = T[ot]
  const redFlags = result?.red_flags?.filter((f: any) => f.label) || []
  const goodHighlights = result?.good_highlights?.filter((h: string) => h && h.length > 5) || []
  const cmvScore = result ? computeCMVAlphaScore(result.metrics, redFlags) : null
  const fudPen = cmvScore?.fudPenalty ?? 0
  const isGoodScore = result && result.overall_score >= 60
  const availableTags = isGoodScore ? GOOD_TAGS : BAD_TAGS
  const groups = result ? [
    { label: 'Team Intentions', score: Math.round(((result.metrics?.founder_cred?.score ?? 0) + (result.metrics?.founder_activity?.score ?? 0)) / 2) },
    { label: 'Funding', score: result.metrics?.funding?.score ?? 0 },
    { label: 'Narrative', score: result.metrics?.niche?.score ?? 0 },
    { label: 'Revenue', score: result.metrics?.revenue?.score ?? 0 },
    { label: 'Community', score: result.metrics?.sentiment?.score ?? 0 },
    { label: 'CT Buzz', score: Math.round(((result.metrics?.notable_mentions?.score ?? 0) + (result.metrics?.top_voices?.score ?? 0)) / 2) },
  ].map(g => ({ ...g, tier: getTier(g.score), cfg: T[getTier(g.score)] })) : []
  const msg = LOADING_MSGS[msgIdx]

  return (
    <div style={{ minHeight: '100vh', background: '#faf7f0', fontFamily: "'Plus Jakarta Sans',sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=DM+Mono:wght@400;500&display=swap');
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes shimmer{0%{background-position:-400px 0}100%{background-position:400px 0}}
        @keyframes float{0%,100%{transform:translateY(0)}50%{transform:translateY(-10px)}}
        @keyframes ring{0%,100%{transform:scale(1);opacity:0.4}50%{transform:scale(1.2);opacity:0.1}}
        @keyframes fadeIn{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
        @keyframes scan{0%{transform:translateX(-100%)}100%{transform:translateX(400%)}}
        @keyframes thinkDot{0%,100%{opacity:0.2;transform:scale(0.8)}50%{opacity:1;transform:scale(1.2)}}
        @keyframes pop{0%{transform:scale(0.8);opacity:0}60%{transform:scale(1.05)}100%{transform:scale(1);opacity:1}}
        .tag-btn{transition:all 0.15s;cursor:pointer;}
        .tag-btn:hover{transform:translateY(-1px);}
        input:focus{outline:none;}
        @media(max-width:600px){
          .grid-score{grid-template-columns:1fr!important;}
          .grid-3{grid-template-columns:1fr 1fr!important;}
          .grid-2{grid-template-columns:1fr!important;}
          .grid-tier{grid-template-columns:1fr 1fr!important;}
          .search-btns{flex-wrap:wrap!important;}
          .verdict-row{flex-wrap:wrap!important;}
        }
      `}</style>

      {/* Nav */}
      <div style={{ background: '#fff', borderBottom: '1px solid #d4e8d0', padding: '0 24px', display: 'flex', alignItems: 'center', height: 58, gap: 10, position: 'sticky', top: 0, zIndex: 100 }}>
        <div style={{ width: 34, height: 34, background: 'linear-gradient(135deg,#166534,#16a34a)', borderRadius: 9, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04a1 1 0 000-1.41l-2.34-2.34a1 1 0 00-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z" fill="#fff" /></svg>
        </div>
        <div>
          <span style={{ fontSize: 16, fontWeight: 800, color: '#1c2b5a', letterSpacing: -0.5 }}>CMV <span style={{ color: '#16a34a' }}>AlphaScanner</span></span>
          <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 8, color: '#4ade80', letterSpacing: 0.5, display: 'none' } as any}>know if this project is worth your time</div>
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
          <a href="/tierlist" style={{ fontFamily: "'DM Mono',monospace", fontSize: 9, color: '#3b5bdb', background: '#f0f4ff', border: '1px solid #c5d0ff', borderRadius: 20, padding: '5px 12px', textDecoration: 'none', fontWeight: 600 }}>📊 Tier List</a>
          <a href="/feed" style={{ fontFamily: "'DM Mono',monospace", fontSize: 9, color: '#15803d', background: '#f0fdf4', border: '1px solid #86efac', borderRadius: 20, padding: '5px 12px', textDecoration: 'none', fontWeight: 600 }}>🌐 Feed</a>
          <button onClick={() => setShowProfileSetup(true)} style={{ display: 'flex', alignItems: 'center', gap: 7, background: '#f0fdf4', border: '1px solid #86efac', borderRadius: 20, padding: '5px 12px 5px 6px', cursor: 'pointer', fontFamily: 'inherit' }}>
            {userPhoto ? <img src={userPhoto} alt="" style={{ width: 24, height: 24, borderRadius: '50%', objectFit: 'cover' }} /> : <div style={{ width: 24, height: 24, borderRadius: '50%', background: '#e8ecff', color: '#3b5bdb', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700 }}>{userName ? userName.charAt(0).toUpperCase() : '?'}</div>}
            <span style={{ fontSize: 12, fontWeight: 600, color: '#14532d' }}>{userName || 'Set profile'}</span>
          </button>
          <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 9, color: '#15803d', background: '#dcfce7', borderRadius: 20, padding: '3px 8px', border: '1px solid #86efac' }}>BETA</span>
        </div>
      </div>

      {/* Profile Setup Modal */}
      {showProfileSetup && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div style={{ background: '#fff', borderRadius: 20, padding: 24, width: '100%', maxWidth: 400, animation: 'fadeIn 0.3s ease' }}>
            <div style={{ fontSize: 16, fontWeight: 800, color: '#1c2b5a', marginBottom: 4 }}>Your Alpha Profile</div>
            <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 9, color: '#868e96', marginBottom: 20 }}>Shows on every verdict card you generate</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20 }}>
              <div onClick={() => fileRef.current?.click()} style={{ width: 72, height: 72, borderRadius: '50%', background: '#f8f9ff', border: '2px dashed #c5d0ff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', overflow: 'hidden', flexShrink: 0 }}>
                {tempPhoto ? <img src={tempPhoto} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <div style={{ textAlign: 'center' as const }}><svg width="20" height="20" viewBox="0 0 24 24" fill="none" style={{ display: 'block', margin: '0 auto 4px' }}><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12" stroke="#adb5bd" strokeWidth="2" strokeLinecap="round" /></svg><span style={{ fontSize: 9, color: '#adb5bd', fontFamily: "'DM Mono',monospace" }}>upload</span></div>}
              </div>
              <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handlePhotoUpload} />
              <div style={{ flex: 1 }}>
                <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 9, color: '#868e96', letterSpacing: 1, marginBottom: 6 }}>YOUR NAME OR HANDLE</div>
                <input style={{ width: '100%', border: '1px solid #dbe4ff', borderRadius: 10, padding: '10px 14px', fontSize: 14, color: '#1c2b5a', fontFamily: 'inherit' }} placeholder="e.g. Charles or @Cmv_ng" maxLength={20} value={tempName} onChange={e => setTempName(e.target.value)} />
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => setShowProfileSetup(false)} style={{ flex: 1, background: '#f8f9ff', border: '1px solid #dbe4ff', borderRadius: 10, padding: '11px', fontSize: 13, fontWeight: 600, color: '#6c7a9c', cursor: 'pointer', fontFamily: 'inherit' }}>Cancel</button>
              <button onClick={() => { saveProfile(tempName, tempPhoto); setShowProfileSetup(false) }} style={{ flex: 2, background: '#14532d', color: '#fff', border: 'none', borderRadius: 10, padding: '11px', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>Save Profile</button>
            </div>
          </div>
        </div>
      )}

      <div style={{ maxWidth: 860, margin: '0 auto', padding: '32px 16px 60px' }}>

        {/* Hero */}
        {!result && !loading && (
          <div style={{ position: 'relative', overflow: 'hidden', padding: '0 0 8px' }}>
            <div style={{ position: 'absolute', top: -80, left: '50%', transform: 'translateX(-50%)', width: 600, height: 600, borderRadius: '50%', background: '#dcfce7', opacity: 0.45, pointerEvents: 'none' }} />
            <div style={{ position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)', width: 360, height: 360, borderRadius: '50%', border: '1px solid #86efac', opacity: 0.35, pointerEvents: 'none', animation: 'ring 5s ease-in-out infinite' }} />
            <div style={{ position: 'absolute', left: '1%', top: 20, transform: 'rotate(-6deg)', animation: 'float 5s ease-in-out infinite', zIndex: 1 }}><div style={{ background: '#fff', border: '1.5px solid #86efac', borderRadius: 12, padding: '9px 14px', boxShadow: '0 4px 16px rgba(21,128,61,0.1)' }}><div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}><div style={{ width: 7, height: 7, borderRadius: '50%', background: '#16a34a' }} /><span style={{ fontSize: 11, fontWeight: 800, color: '#14532d' }}>🌾 FARM IT</span></div><div style={{ fontFamily: "'DM Mono',monospace", fontSize: 9, color: '#9ca3af' }}>EigenLayer · 84/100</div></div></div>
            <div style={{ position: 'absolute', right: '1%', top: 30, transform: 'rotate(5deg)', animation: 'float 6s ease-in-out infinite 0.8s', zIndex: 1 }}><div style={{ background: '#fff', border: '1.5px solid #fde68a', borderRadius: 12, padding: '9px 14px', boxShadow: '0 4px 16px rgba(0,0,0,0.06)' }}><div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}><div style={{ width: 7, height: 7, borderRadius: '50%', background: '#d97706' }} /><span style={{ fontSize: 11, fontWeight: 800, color: '#78350f' }}>✍️ CREATE</span></div><div style={{ fontFamily: "'DM Mono',monospace", fontSize: 9, color: '#9ca3af' }}>KaitoAI · 67/100</div></div></div>
            <div style={{ position: 'absolute', left: '3%', bottom: 40, transform: 'rotate(4deg)', animation: 'float 7s ease-in-out infinite 1.3s', zIndex: 1, opacity: 0.85 }}><div style={{ background: '#fff', border: '1.5px solid #fca5a5', borderRadius: 12, padding: '9px 14px', boxShadow: '0 4px 16px rgba(0,0,0,0.06)' }}><div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}><div style={{ width: 7, height: 7, borderRadius: '50%', background: '#dc2626' }} /><span style={{ fontSize: 11, fontWeight: 800, color: '#7f1d1d' }}>🚫 SKIP 🚨</span></div><div style={{ fontFamily: "'DM Mono',monospace", fontSize: 9, color: '#9ca3af' }}>SuspectDAO · 12/100</div></div></div>
            <div style={{ position: 'absolute', right: '2%', bottom: 50, transform: 'rotate(-4deg)', animation: 'float 5.5s ease-in-out infinite 0.5s', zIndex: 1, opacity: 0.85 }}><div style={{ background: '#fff', border: '1.5px solid #fed7aa', borderRadius: 12, padding: '9px 14px', boxShadow: '0 4px 16px rgba(0,0,0,0.06)' }}><div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}><div style={{ width: 7, height: 7, borderRadius: '50%', background: '#ea580c' }} /><span style={{ fontSize: 11, fontWeight: 800, color: '#7c2d12' }}>👁️ WATCH</span></div><div style={{ fontFamily: "'DM Mono',monospace", fontSize: 9, color: '#9ca3af' }}>RallyOnChain · 49/100</div></div></div>
            <div style={{ position: 'relative', zIndex: 2, textAlign: 'center', padding: '48px 24px 52px', animation: 'fadeIn 0.7s ease' }}>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 7, background: '#dcfce7', border: '1px solid #86efac', borderRadius: 20, padding: '6px 16px', marginBottom: 22 }}>
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#16a34a', animation: 'ring 2s ease-in-out infinite' }} />
                <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 10, color: '#15803d', letterSpacing: '0.5px' }}>CRYPTO ALPHA INTELLIGENCE</span>
              </div>
              <h1 style={{ fontSize: 'clamp(38px,5.5vw,64px)', fontWeight: 900, color: '#14532d', lineHeight: 1.05, letterSpacing: -2, marginBottom: 14 }}>Know before<br /><span style={{ color: '#16a34a' }}>you farm.</span></h1>
              <p style={{ fontSize: 15, color: '#4b5563', lineHeight: 1.7, maxWidth: 440, margin: '0 auto 36px' }}>Paste any project's X link. Get the full alpha — 17 metrics, red flag detection, a CMV score out of 1000, and a personalised verdict card you can share.</p>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, flexWrap: 'wrap' as const, marginBottom: 24 }}>
                {['17 metrics', '1000pt score', 'Red flag detection', 'Real X data', 'Personalised cards'].map(t => <span key={t} style={{ fontFamily: "'DM Mono',monospace", fontSize: 9, color: '#15803d', background: '#f0fdf4', border: '1px solid #86efac', borderRadius: 20, padding: '5px 12px' }}>{t}</span>)}
              </div>
            </div>
          </div>
        )}

        {/* Search */}
        <div style={{ background: '#fff', border: '1px solid #dbe4ff', borderRadius: 18, padding: 20, marginBottom: 20, boxShadow: '0 4px 24px rgba(59,91,219,0.07)' }}>
          {!result && !loading && (
            <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 9, color: '#3b5bdb', letterSpacing: '1.5px', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="#3b5bdb"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.748l7.73-8.835L1.254 2.25H8.08l4.259 5.631L18.244 2.25z" /></svg>
              PASTE PROJECT X URL OR HANDLE
            </div>
          )}
          <div style={{ display: 'flex', gap: 10 }}>
            <input style={{ flex: 1, background: '#f8f9ff', border: '1px solid #86efac', borderRadius: 12, padding: '14px 16px', fontSize: 14, color: '#1c2b5a', fontFamily: "'DM Mono',monospace", outline: 'none', transition: 'border-color 0.2s' }} placeholder="https://x.com/projecthandle or @handle" value={xUrl} onChange={e => setXUrl(e.target.value)} onKeyDown={e => e.key === 'Enter' && !loading && analyze()} disabled={loading} onFocus={e => e.target.style.borderColor = '#3b5bdb'} onBlur={e => e.target.style.borderColor = '#dbe4ff'} />
            <div className="search-btns" style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
              {result && !loading && (
                <>
                  <button onClick={() => { setResult(null); setCgData(null); setXData(null); setXUrl(''); setSelectedTags([]) }} style={{ background: '#fff', border: '1px solid #86efac', borderRadius: 12, padding: '14px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer', color: '#15803d', fontFamily: 'inherit', whiteSpace: 'nowrap' as const }}>+ New Scan</button>
                  <button onClick={async () => {
                    const handle = xUrl.replace('https://x.com/','').replace('https://twitter.com/','').replace('@','').split('/')[0].trim().toLowerCase()
                    try { localStorage.removeItem('cmv_scan_' + handle) } catch {}
                    const freshXd = await fetchProjectXData(handle).catch(() => null)
                    if (freshXd) setXData(freshXd)
                    if (freshXd?.confirmed_ticker) {
                      const freshCg = await fetchCoinGecko(handle, freshXd.confirmed_ticker, true, handle).catch(() => null)
                      if (freshCg?.token_live) { setCgData(freshCg) } else { setCgData({ token_live: false, token_price: 'Not Launched', token_note: 'No token found' }); setResult((r: any) => r ? { ...r, ticker: null } : r) }
                    } else if (!freshXd?.token_launch_hinted) { setCgData({ token_live: false, token_price: 'Not Launched', token_note: 'No token found' }); setResult((r: any) => r ? { ...r, ticker: null } : r) }
                  }} style={{ background: '#fff', border: '1px solid #86efac', borderRadius: 12, padding: '14px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer', color: '#15803d', fontFamily: 'inherit', whiteSpace: 'nowrap' as const }}>↺ Refresh</button>
                </>
              )}
              <button onClick={analyze} disabled={loading || !xUrl.trim()} style={{ background: loading || !xUrl.trim() ? '#e2e8f0' : 'linear-gradient(135deg,#166534,#16a34a)', color: loading || !xUrl.trim() ? '#adb5bd' : '#fff', border: 'none', borderRadius: 12, padding: '14px 28px', fontSize: 14, fontWeight: 700, cursor: loading || !xUrl.trim() ? 'not-allowed' : 'pointer', whiteSpace: 'nowrap' as const, fontFamily: 'inherit', transition: 'all 0.2s', boxShadow: loading || !xUrl.trim() ? 'none' : '0 4px 14px rgba(22,163,74,0.3)' }}>{loading ? 'Scanning...' : 'Analyze →'}</button>
            </div>
          </div>
          <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 9, color: '#adb5bd', marginTop: 10, display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' as const }}>
            <span>try:</span>
            {['https://x.com/eigenlayer', 'https://x.com/KaitoAI', 'https://x.com/RallyOnChain'].map(ex => <button key={ex} onClick={() => setXUrl(ex)} style={{ fontFamily: "'DM Mono',monospace", fontSize: 9, color: '#16a34a', background: 'none', border: 'none', cursor: 'pointer', padding: 0, textDecoration: 'underline dotted' }}>{ex.replace('https://x.com/', '@')}</button>)}
          </div>
        </div>

        {/* Loading */}
        {loading && (
          <div style={{ background: '#fff', border: '1px solid #d4e8d0', borderRadius: 18, padding: 28, marginBottom: 16, overflow: 'hidden', position: 'relative' }}>
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: 'linear-gradient(90deg,transparent 0%,#16a34a 50%,transparent 100%)', animation: 'scan 2s linear infinite', borderRadius: '18px 18px 0 0' }} />
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24 }}>
              <div style={{ position: 'relative', flexShrink: 0 }}>
                <div style={{ position: 'absolute', inset: -6, borderRadius: '50%', border: '2px solid rgba(22,163,74,0.2)', animation: 'ring 2s ease-in-out infinite' }} />
                <div style={{ width: 60, height: 60, borderRadius: '50%', overflow: 'hidden', border: '2.5px solid #16a34a', background: '#dcfce7', display: 'flex', alignItems: 'center', justifyContent: 'center', animation: 'float 3s ease-in-out infinite' }}>
                  <img src="/pfp.jpeg" alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: pfpLoaded ? 'block' : 'none' }} onLoad={() => setPfpLoaded(true)} onError={() => setPfpLoaded(false)} />
                  {!pfpLoaded && <span style={{ fontSize: 26 }}>🔍</span>}
                </div>
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 16, fontWeight: 700, color: '#14532d', marginBottom: 6 }}>{msg.text} <span style={{ fontSize: 18 }}>{msg.emoji}</span></div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 10, color: '#6b7280' }}>scanning</div>
                  <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 10, color: '#16a34a', fontWeight: 600 }}>@{xUrl.replace('https://x.com/','').replace('@','').split('/')[0]}</span>
                  <div style={{ display: 'flex', gap: 3, marginLeft: 4 }}>
                    {[0,1,2].map(i => <div key={i} style={{ width: 6, height: 6, borderRadius: '50%', background: '#16a34a', animation: 'thinkDot 1.2s ease-in-out infinite', animationDelay: `${i * 0.2}s` }} />)}
                  </div>
                </div>
              </div>
              <div style={{ textAlign: 'right' as const, flexShrink: 0 }}>
                <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 32, fontWeight: 800, color: '#16a34a', lineHeight: 1 }}>{elapsed}<span style={{ fontSize: 13, color: '#9ca3af', fontWeight: 400 }}>s</span></div>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20, background: '#f0fdf4', borderRadius: 10, padding: '10px 14px', border: '1px solid #86efac' }}>
              <div style={{ display: 'flex', gap: 3 }}>{[0,1,2].map(i => <div key={i} style={{ width: 7, height: 7, borderRadius: '50%', background: '#16a34a', animation: 'thinkDot 1.2s ease-in-out infinite', animationDelay: `${i * 0.15}s` }} />)}</div>
              <div style={{ fontSize: 12, fontWeight: 600, color: '#14532d' }}>{phase}</div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '160px 1fr', gap: 12, marginBottom: 12 }}>
              <div style={{ height: 140, background: 'linear-gradient(90deg,#f0fdf4 25%,#dcfce7 50%,#f0fdf4 75%)', backgroundSize: '400px 100%', animation: 'shimmer 1.5s infinite', borderRadius: 14 }} />
              <div style={{ height: 140, background: 'linear-gradient(90deg,#f0fdf4 25%,#dcfce7 50%,#f0fdf4 75%)', backgroundSize: '400px 100%', animation: 'shimmer 1.5s infinite 0.2s', borderRadius: 14 }} />
            </div>
            {[95, 80].map((w, i) => <div key={i} style={{ height: 36, background: 'linear-gradient(90deg,#f0fdf4 25%,#dcfce7 50%,#f0fdf4 75%)', backgroundSize: '400px 100%', animation: 'shimmer 1.5s infinite', borderRadius: 10, marginBottom: 8, width: `${w}%` }} />)}
          </div>
        )}

        {/* Error */}
        {error && (
          <div style={{ background: error.startsWith('rate_limit') ? '#fff9e6' : error === 'unavailable' ? '#f0f4ff' : '#fff5f5', border: `1px solid ${error.startsWith('rate_limit') ? '#fde68a' : error === 'unavailable' ? '#c5d0ff' : '#ffc9c9'}`, borderRadius: 14, padding: '16px 18px', marginBottom: 14 }}>
            {error.startsWith('rate_limit') ? (
              <>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#92400e', marginBottom: 6 }}>⏳ High demand — please hold on</div>
                <div style={{ fontSize: 12, color: '#78350f', lineHeight: 1.6, marginBottom: 6 }}>Too many scans at once. Auto-retrying in <strong>{error.split(':')[1] || '65'}s</strong>...</div>
                <div style={{ height: 4, background: '#fde68a', borderRadius: 4, overflow: 'hidden' }}>
                  <div style={{ height: '100%', background: '#f59f00', borderRadius: 4, width: `${Math.min(100, ((65 - parseInt(error.split(':')[1] || '65')) / 65) * 100)}%`, transition: 'width 1s linear' }} />
                </div>
              </>
            ) : error === 'unavailable' ? (
              <>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#3b5bdb', marginBottom: 5 }}>🔧 Unable to scan at this moment</div>
                <div style={{ fontSize: 12, color: '#4c6ef5', lineHeight: 1.6 }}>Our scanning service is temporarily unavailable. Please check back in a few minutes.</div>
              </>
            ) : (
              <>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#e03131', marginBottom: 5 }}>⚠️ Scan failed</div>
                <div style={{ fontSize: 12, color: '#c92a2a', lineHeight: 1.6, marginBottom: 10 }}>{error}</div>
                <button onClick={analyze} style={{ fontSize: 12, padding: '6px 14px', borderRadius: 8, border: '1px solid #ffc9c9', background: '#fff5f5', color: '#e03131', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 600 }}>Try again</button>
              </>
            )}
          </div>
        )}

        {/* Results */}
        {result && !loading && (
          <div style={{ animation: 'fadeIn 0.5s ease' }}>

            {redFlags.length > 0 && (
              <div style={{ background: '#fff5f5', border: '2px solid #e03131', borderRadius: 14, padding: '16px 18px', marginBottom: 14, animation: 'pop 0.4s ease' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                  <div style={{ width: 36, height: 36, background: '#e03131', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" stroke="#fff" strokeWidth="2" strokeLinecap="round" /></svg>
                  </div>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 800, color: '#e03131' }}>🚨 {redFlags.length} Red Flag{redFlags.length > 1 ? 's' : ''} Detected</div>
                    <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 9, color: '#c92a2a' }}>Score penalised · Proceed with extreme caution</div>
                  </div>
                  <div style={{ marginLeft: 'auto', background: '#e03131', borderRadius: 8, padding: '6px 12px', textAlign: 'center' as const }}>
                    <div style={{ fontSize: 16, fontWeight: 800, color: '#fff' }}>-{fudPen}</div>
                    <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 8, color: 'rgba(255,255,255,0.8)' }}>PENALTY</div>
                  </div>
                </div>
                {redFlags.map((f: any, i: number) => (
                  <div key={i} style={{ background: '#fff', border: '1px solid #fca5a5', borderLeft: '3px solid #e03131', borderRadius: 8, padding: '10px 14px', marginBottom: 8 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                      <span style={{ fontSize: 12 }}>{f.type === 'rug' ? '💀' : f.type === 'scam' ? '🚩' : f.type === 'exploit' ? '⚡' : f.type === 'dump' ? '📉' : f.type === 'shill' ? '🤥' : f.type === 'anon' ? '👻' : '⚠️'}</span>
                      <span style={{ fontSize: 13, fontWeight: 700, color: '#c92a2a' }}>{f.label}</span>
                    </div>
                    <div style={{ fontSize: 12, color: '#4b5563', lineHeight: 1.6, marginBottom: 4 }}>{f.detail}</div>
                    {f.source && <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 9, color: '#9ca3af', background: '#fef2f2', padding: '3px 8px', borderRadius: 4, display: 'inline-block' }}>Source: {f.source}</div>}
                  </div>
                ))}
              </div>
            )}

            {redFlags.length === 0 && (
              <div style={{ background: '#f0fdf4', border: '1px solid #86efac', borderRadius: 10, padding: '10px 14px', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M22 11.08V12a10 10 0 11-5.93-9.14M22 4L12 14.01l-3-3" stroke="#16a34a" strokeWidth="2" strokeLinecap="round"/></svg>
                <div><span style={{ fontSize: 12, fontWeight: 700, color: '#15803d' }}>No major red flags detected</span><span style={{ fontSize: 11, color: '#4b5563', marginLeft: 8 }}>Dedicated FUD search ran — nothing significant found</span></div>
              </div>
            )}

            {/* Verdict Card */}
            <div style={{ background: otc.vbg, borderRadius: 18, padding: 22, marginBottom: 14, position: 'relative', overflow: 'hidden', boxShadow: `0 8px 32px ${otc.solid}30` }}>
              <div style={{ position: 'absolute', top: -50, right: -50, width: 200, height: 200, borderRadius: '50%', background: 'rgba(255,255,255,0.06)', pointerEvents: 'none' }} />
              <div style={{ position: 'absolute', bottom: -30, left: -30, width: 140, height: 140, borderRadius: '50%', background: 'rgba(255,255,255,0.04)', pointerEvents: 'none' }} />
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(255,255,255,0.2)', border: '1px solid rgba(255,255,255,0.3)', borderRadius: 20, padding: '5px 14px 5px 6px', marginBottom: 14, animation: 'pop 0.5s ease' }}>
                {userPhoto ? <img src={userPhoto} alt="" style={{ width: 28, height: 28, borderRadius: '50%', objectFit: 'cover', border: '1.5px solid rgba(255,255,255,0.5)' }} /> : <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'rgba(255,255,255,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: '#fff' }}>{userName ? userName.charAt(0).toUpperCase() : 'C'}</div>}
                <span style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>{userName || 'CMV'} says {otc.v.toLowerCase()} {otc.emoji}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16, marginBottom: 16, position: 'relative', zIndex: 1 }}>
                <div style={{ width: 56, height: 56, borderRadius: 14, background: 'rgba(255,255,255,0.2)', border: '2px solid rgba(255,255,255,0.3)', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  {xData?.profile_image_url ? <img src={xData.profile_image_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <span style={{ fontSize: 26, fontWeight: 800, color: '#fff' }}>{(result.project_name || '?').charAt(0).toUpperCase()}</span>}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' as const, marginBottom: 3 }}>
                    <span style={{ fontSize: 20, fontWeight: 800, color: '#fff', letterSpacing: -0.5 }}>{result.project_name || ''}</span>
                    {cgData?.token_live && cgData.ticker && <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 10, color: 'rgba(255,255,255,0.85)', background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.25)', padding: '2px 8px', borderRadius: 5 }}>{cgData.ticker} {cgData.token_price}</span>}
                  </div>
                  <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 9, color: 'rgba(255,255,255,0.65)', display:'flex', alignItems:'center', gap:6, flexWrap:'wrap' as const }}>
                    <span>{result.project_category || 'Crypto'}{result.team_location ? ` · ${result.team_location}` : ''}</span>
                  </div>
                </div>
                <div style={{ textAlign: 'right' as const, flexShrink: 0 }}>
                  <div style={{ fontSize: 44, fontWeight: 800, color: '#fff', lineHeight: 1, letterSpacing: -2 }}>{result.overall_score ?? 0}</div>
                  <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 8, color: 'rgba(255,255,255,0.65)' }}>ALPHA SCORE</div>
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: 'rgba(255,255,255,0.2)', borderRadius: 20, padding: '3px 9px', fontFamily: "'DM Mono',monospace", fontSize: 9, color: '#fff', marginTop: 4 }}>{ot} · {otc.lbl}</div>
                </div>
              </div>
              {goodHighlights.length > 0 && (
                <div style={{ marginBottom: 12, position: 'relative', zIndex: 1 }}>
                  <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 9, color: 'rgba(255,255,255,0.6)', letterSpacing: 1, marginBottom: 6 }}>{userName || 'CMV'} SAYS</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap' as const, gap: 6 }}>
                    {goodHighlights.slice(0, 3).map((h: string, i: number) => <div key={i} style={{ background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.25)', borderRadius: 20, padding: '4px 12px', fontSize: 11, fontWeight: 600, color: '#fff' }}>✓ {h}</div>)}
                  </div>
                </div>
              )}
              <div style={{ background: 'rgba(0,0,0,0.15)', borderRadius: 12, padding: '14px 16px', marginBottom: 14, border: '1px solid rgba(255,255,255,0.15)', position: 'relative', zIndex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                  <span style={{ fontSize: 24 }}>{otc.emoji}</span>
                  <span style={{ fontSize: 24, fontWeight: 900, color: '#fff', letterSpacing: -0.5 }}>{otc.v}</span>
                  <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.75)', fontStyle: 'italic', marginLeft: 4 }}>{otc.sub}</span>
                </div>
                <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.95)', lineHeight: 1.65, fontWeight: 500 }}>{result.verdict_action || result.verdict_reason}</div>
              </div>
              {selectedTags.length > 0 && (
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' as const, marginBottom: 12, position: 'relative', zIndex: 1 }}>
                  {selectedTags.map(id => { const tag = [...GOOD_TAGS, ...BAD_TAGS].find(t => t.id === id); return tag ? <div key={id} style={{ background: 'rgba(255,255,255,0.2)', border: '1px solid rgba(255,255,255,0.3)', borderRadius: 20, padding: '5px 12px', fontSize: 11, fontWeight: 700, color: '#fff', animation: 'pop 0.3s ease' }}>{tag.label}</div> : null })}
                </div>
              )}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, position: 'relative', zIndex: 1 }}>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' as const }}>
                  {otc.target && <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.25)', borderRadius: 20, padding: '5px 14px', fontFamily: "'DM Mono',monospace", fontSize: 10, color: '#fff', fontWeight: 600 }}>🎯 {otc.target}</div>}
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={downloadCard} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(255,255,255,0.2)', border: '1px solid rgba(255,255,255,0.35)', borderRadius: 20, padding: '8px 16px', fontFamily: 'inherit', fontSize: 13, fontWeight: 700, color: '#fff', cursor: 'pointer', whiteSpace: 'nowrap' as const }}>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3"/></svg>
                    Download
                  </button>
                  <button onClick={shareResult} style={{ display: 'flex', alignItems: 'center', gap: 7, background: 'rgba(255,255,255,0.2)', border: '1px solid rgba(255,255,255,0.35)', borderRadius: 20, padding: '8px 18px', fontFamily: 'inherit', fontSize: 13, fontWeight: 700, color: '#fff', cursor: 'pointer', whiteSpace: 'nowrap' as const }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8M16 6l-4-4-4 4M12 2v13" /></svg>
                    Share to X
                  </button>
                </div>
              </div>
              <div style={{ marginTop: 12, fontFamily: "'DM Mono',monospace", fontSize: 8, color: 'rgba(255,255,255,0.35)', letterSpacing: 1 }}>CMV ALPHASCANNER · cmv-alphascanner.vercel.app</div>
            </div>

            {/* Tag Picker */}
            <div style={{ background: '#fff', border: '1px solid #dbe4ff', borderRadius: 14, padding: 16, marginBottom: 14 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#1c2b5a', marginBottom: 4 }}>Pick 2 highlights for your share card</div>
              <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 9, color: '#adb5bd', marginBottom: 12 }}>Selected {selectedTags.length}/2</div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' as const }}>
                {availableTags.map(tag => { const selected = selectedTags.includes(tag.id); const disabled = !selected && selectedTags.length >= 2; return <button key={tag.id} className="tag-btn" onClick={() => !disabled && toggleTag(tag.id)} style={{ padding: '7px 14px', borderRadius: 20, border: `1.5px solid ${selected ? otc.solid : '#dbe4ff'}`, background: selected ? otc.bg : '#f8f9ff', color: selected ? otc.tc : disabled ? '#adb5bd' : '#475569', fontSize: 12, fontWeight: selected ? 700 : 500, fontFamily: 'inherit', opacity: disabled ? 0.5 : 1, cursor: disabled ? 'not-allowed' : 'pointer' }}>{tag.label}</button> })}
              </div>
            </div>

            {/* CMV Alpha Score */}
            {cmvScore && (
              <div style={{ background: '#fff', border: '1px solid #dbe4ff', borderRadius: 14, padding: 20, marginBottom: 14 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap' as const, gap: 12 }}>
                  <div>
                    <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 9, color: '#868e96', letterSpacing: 2, marginBottom: 4 }}>CMV ALPHA SCORE</div>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}><span style={{ fontSize: 48, fontWeight: 800, color: '#1c2b5a', letterSpacing: -3, lineHeight: 1 }}>{cmvScore.total}</span><span style={{ fontFamily: "'DM Mono',monospace", fontSize: 14, color: '#adb5bd' }}>/1000</span></div>
                    {xData?.cmv_score ? (
                      <div style={{ marginTop: 8 }}>
                        <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 9, color: '#868e96', letterSpacing: 2, marginBottom: 4 }}>COMBINED SCORE</div>
                        <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                          <span style={{ fontSize: 32, fontWeight: 800, color: otc.solid, letterSpacing: -2, lineHeight: 1 }}>{computeCombinedScore(cmvScore.total, xData.cmv_score)}</span>
                          <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 12, color: '#adb5bd' }}>/1000</span>
                        </div>
                        <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 8, color: '#adb5bd' }}>50% alpha · 50% X score</div>
                      </div>
                    ) : null}
                  </div>
                  <div style={{ textAlign: 'right' as const }}>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: otc.bg, border: `1px solid ${otc.border}`, borderRadius: 12, padding: '8px 16px', marginBottom: 6 }}><div style={{ width: 10, height: 10, borderRadius: '50%', background: otc.solid }} /><span style={{ fontWeight: 700, fontSize: 14, color: otc.tc }}>{otc.lbl} · {otc.v}</span></div>
                    <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 9, color: '#adb5bd' }}>{otc.range}/1000 range</div>
                  </div>
                </div>
                <div className="grid-3" style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10, marginBottom: 16 }}>
                  {Object.entries(cmvScore.categories).map(([cat, data]: [string, any]) => {
                    const pct = Math.round((data.score / data.max) * 100)
                    const col = pct >= 70 ? '#37b24d' : pct >= 50 ? '#f59f00' : '#e8590c'
                    return <div key={cat} style={{ background: '#f8f9ff', border: '1px solid #dbe4ff', borderRadius: 10, padding: '12px' }}><div style={{ fontFamily: "'DM Mono',monospace", fontSize: 8, color: '#868e96', letterSpacing: 1, marginBottom: 3 }}>{cat.toUpperCase()}</div><div style={{ fontSize: 22, fontWeight: 800, color: col, lineHeight: 1 }}>{data.score}<span style={{ fontSize: 11, color: '#adb5bd', fontWeight: 400 }}>/{data.max}</span></div><div style={{ height: 6, background: '#e8ecff', borderRadius: 4, overflow: 'hidden', margin: '6px 0' }}><div style={{ width: `${pct}%`, height: '100%', background: col, borderRadius: 4, transition: 'width 1.2s cubic-bezier(0.4,0,0.2,1)' }} /></div><div style={{ fontSize: 10, color: '#6c7a9c' }}>{METRICS.filter(m => m.cat === cat).map(m => m.label.split(' ')[0]).join(' · ')}</div></div>
                  })}
                  <div style={{ background: fudPen > 0 ? '#fff5f5' : '#f8f9ff', border: `1px solid ${fudPen > 0 ? '#ffc9c9' : '#dbe4ff'}`, borderRadius: 10, padding: '12px' }}>
                    <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 8, color: fudPen > 0 ? '#c92a2a' : '#868e96', letterSpacing: 1, marginBottom: 3 }}>FUD PENALTY ⚠</div>
                    <div style={{ fontSize: 22, fontWeight: 800, color: fudPen > 0 ? '#c92a2a' : '#adb5bd', lineHeight: 1 }}>{fudPen > 0 ? `-${fudPen}` : '0'}<span style={{ fontSize: 11, color: '#adb5bd', fontWeight: 400 }}>/300</span></div>
                    <div style={{ height: 6, background: '#fee2e2', borderRadius: 4, overflow: 'hidden', margin: '6px 0' }}><div style={{ width: `${Math.min(100, (fudPen / 300) * 100)}%`, height: '100%', background: '#e03131', borderRadius: 4 }} /></div>
                    <div style={{ fontSize: 10, color: fudPen > 0 ? '#c92a2a' : '#6c7a9c' }}>{fudPen > 0 ? `${redFlags.length} flag(s)` : 'Clean'}</div>
                  </div>
                </div>
                <div style={{ background: '#f8f9ff', border: '1px solid #dbe4ff', borderRadius: 10, padding: '12px 14px' }}>
                  <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 9, color: '#868e96', letterSpacing: 1, marginBottom: 8 }}>SCORE LEGEND</div>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' as const }}>
                    {[{ range: '850-1000', tier: 'A', label: 'FARM IT' }, { range: '600-849', tier: 'B', label: 'CREATE CONTENT' }, { range: '350-599', tier: 'C', label: 'WATCH' }, { range: '0-349', tier: 'D', label: 'SKIP' }].map(item => (
                      <div key={item.tier} style={{ display: 'flex', alignItems: 'center', gap: 6, background: T[item.tier].bg, border: `1px solid ${T[item.tier].border}`, borderRadius: 8, padding: '5px 10px' }}>
                        <div style={{ width: 8, height: 8, borderRadius: '50%', background: T[item.tier].solid }} />
                        <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 9, fontWeight: 700, color: T[item.tier].tc }}>{item.range}</span>
                        <span style={{ fontSize: 10, color: T[item.tier].tc }}>{item.label}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Score + Project Info */}
            <div className="grid-score" style={{ display: 'grid', gridTemplateColumns: '160px 1fr', gap: 12, marginBottom: 14 }}>
              <div style={{ background: '#fff', border: '1px solid #dbe4ff', borderRadius: 14, padding: 18, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
                <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 9, color: '#868e96', letterSpacing: '1.5px' }}>ALPHA SCORE</div>
                <div style={{ fontSize: 52, fontWeight: 800, color: otc.solid, lineHeight: 1, letterSpacing: -3 }}>{result.overall_score ?? 0}</div>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, borderRadius: 20, padding: '5px 12px', border: `1px solid ${otc.border}`, background: otc.bg }}><div dangerouslySetInnerHTML={{ __html: tsq(ot, 20) }} /><span style={{ fontFamily: "'DM Mono',monospace", fontSize: 10, color: otc.tc }}>Overall {otc.lbl}</span></div>
                {xData?.cmv_score ? (
                  <div style={{ width: '100%', background: '#f8f9ff', border: '1px solid #dbe4ff', borderRadius: 8, padding: '8px 10px', textAlign: 'center' as const }}>
                    <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 8, color: '#868e96', marginBottom: 2 }}>CMV X SCORE</div>
                    <div style={{ fontSize: 20, fontWeight: 800, color: '#1c2b5a' }}>{xData.cmv_score}<span style={{ fontSize: 11, color: '#868e96', fontWeight: 400 }}>/1000</span></div>
                    <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 8, color: '#adb5bd' }}>{xData.followers?.toLocaleString()} followers</div>
                  </div>
                ) : null}
              </div>
              <div style={{ background: '#fff', border: '1px solid #dbe4ff', borderRadius: 14, padding: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, flexWrap: 'wrap' as const }}>
                  <span style={{ fontSize: 18, fontWeight: 800, color: '#1c2b5a', letterSpacing: -0.5 }}>{result.project_name || ''}</span>
                  {cgData?.token_live && cgData.ticker && <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 9, color: '#3b5bdb', background: '#e8ecff', border: '1px solid #c5d0ff', padding: '2px 7px', borderRadius: 4 }}>{cgData.ticker} {cgData.token_price}</span>}
                  {!cgData?.token_live && <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 9, color: '#868e96', background: '#f1f3f5', border: '1px solid #dee2e6', padding: '2px 7px', borderRadius: 4 }}>No Token</span>}
                </div>
                {result.team_location && <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 10, color: '#868e96', marginBottom: 6 }}>📍 {result.team_location}{result.founded ? ` · Est. ${result.founded}` : ''}</div>}
                <div style={{ fontSize: 12, color: '#6c7a9c', lineHeight: 1.6, marginBottom: 8 }}>{result.description || ''}</div>
                {goodHighlights.length > 0 && <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' as const }}>{goodHighlights.map((h: string, i: number) => <span key={i} style={{ fontSize: 10, background: '#ebfbee', color: '#2f9e44', border: '1px solid #8ce99a', borderRadius: 20, padding: '2px 8px' }}>✓ {h}</span>)}</div>}
                {result.data_accuracy_note && <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 9, color: '#adb5bd', marginTop: 8, paddingTop: 8, borderTop: '1px solid #f0f4ff' }}>ℹ {result.data_accuracy_note}</div>}
              </div>
            </div>

            {result.score_rationale && (
              <div style={{ background: '#f8f9ff', border: '1px solid #dbe4ff', borderLeft: '3px solid #16a34a', borderRadius: 0, padding: '12px 14px', marginBottom: 14 }}>
                <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 9, color: '#15803d', letterSpacing: 1, marginBottom: 5 }}>WHY THIS SCORE</div>
                <div style={{ fontSize: 12, color: '#6c7a9c', lineHeight: 1.7 }}>{result.score_rationale}</div>
              </div>
            )}

            <div style={{ background: 'linear-gradient(135deg,#f0f4ff,#e8ecff)', border: '1px solid #c5d0ff', borderLeft: '3px solid #16a34a', borderRadius: 12, padding: '14px 16px', marginBottom: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: '#1c2b5a' }}>How to play this</span>
                <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 9, color: '#15803d', background: '#fff', border: '1px solid #86efac', padding: '3px 9px', borderRadius: 20 }}>{result.project_category || 'Infrastructure'}</span>
              </div>
              <div style={{ fontSize: 12, color: '#475569', lineHeight: 1.65 }}>{HOW_TO_PLAY[result.project_category as string] || HOW_TO_PLAY['Infrastructure']}</div>
            </div>

            {(cgData?.token_live || result.future_seasons || result.project_follows) && (
              <div style={{ background: '#fff', border: '1px solid #dbe4ff', borderRadius: 14, padding: 16, marginBottom: 14 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#1c2b5a', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" stroke="#3b5bdb" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                  Deep Intel
                </div>
                {cgData?.token_live && (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
                    <div style={{ background: '#f8f9ff', border: '1px solid #dbe4ff', borderRadius: 8, padding: '10px 12px' }}>
                      <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 8, color: '#868e96', letterSpacing: 1, marginBottom: 5 }}>TOKEN STATUS</div>
                      <span style={{ background: '#ebfbee', color: '#2f9e44', border: '1px solid #8ce99a', borderRadius: 20, padding: '3px 10px', fontFamily: "'DM Mono',monospace", fontSize: 10, display: 'inline-flex', alignItems: 'center', gap: 5 }}><span style={{ width: 6, height: 6, borderRadius: '50%', background: '#2f9e44', display: 'inline-block' }} />{cgData.ticker} {cgData.token_price}</span>
                      {cgData.token_note && <div style={{ fontSize: 11, color: '#6c7a9c', marginTop: 4 }}>{cgData.token_note}</div>}
                    </div>
                    <div style={{ background: '#f8f9ff', border: '1px solid #dbe4ff', borderRadius: 8, padding: '10px 12px' }}>
                      <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 8, color: '#868e96', letterSpacing: 1, marginBottom: 5 }}>TOKEN OUTLOOK</div>
                      <div style={{ fontSize: 12, fontWeight: 600, color: result.post_tge_outlook === 'High Potential' ? '#2f9e44' : result.post_tge_outlook === 'Low Potential' ? '#868e96' : '#e67700' }}>{result.post_tge_outlook || 'Unknown'}</div>
                    </div>
                  </div>
                )}
                {result.future_seasons && !result.future_seasons.toLowerCase().includes('no ') && !result.future_seasons.toLowerCase().includes('unknown') && result.future_seasons.length > 15 && (
                  <div style={{ background: '#f8f9ff', border: '1px solid #dbe4ff', borderRadius: 8, padding: '10px 12px', marginBottom: 8 }}>
                    <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 8, color: '#868e96', letterSpacing: 1, marginBottom: 5 }}>FUTURE SEASONS / POST-TGE</div>
                    <div style={{ fontSize: 12, color: '#1c2b5a', lineHeight: 1.5 }}>{result.future_seasons}</div>
                  </div>
                )}
                {result.project_follows && result.project_follows.toLowerCase() !== 'unknown' && result.project_follows.length > 15 && (
                  <div style={{ background: '#f8f9ff', border: '1px solid #dbe4ff', borderRadius: 8, padding: '10px 12px' }}>
                    <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 8, color: '#868e96', letterSpacing: 1, marginBottom: 5 }}>NOTABLE X FOLLOWS</div>
                    <div style={{ fontSize: 12, color: '#1c2b5a', lineHeight: 1.5 }}>{result.project_follows}</div>
                  </div>
                )}
              </div>
            )}

            {result.team_members?.filter((m: any) => m.name && m.name.length > 1 && m.name.toLowerCase() !== 'anonymous team').length > 0 && (
              <div style={{ background: '#fff', border: '1px solid #dbe4ff', borderRadius: 14, padding: 16, marginBottom: 14 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: '#1c2b5a' }}>👥 Team & Founders</span>
                  <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 9, color: '#15803d', background: '#dcfce7', border: '1px solid #86efac', padding: '2px 8px', borderRadius: 20 }}>X API enriched</span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(240px,1fr))', gap: 10 }}>
                  {result.team_members.filter((m: any) => m.name && m.name.length > 1 && m.name.toLowerCase() !== 'anonymous team').map((m: any, i: number) => <TeamCardEnriched key={i} member={m} />)}
                </div>
              </div>
            )}

            <div style={{ background: '#fff', border: '1px solid #dbe4ff', borderRadius: 14, padding: 16, marginBottom: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, paddingBottom: 10, borderBottom: '1px solid #f0f4ff' }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: '#1c2b5a' }}>Project Tier Summary</span>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, borderRadius: 8, padding: '4px 10px', border: `1px solid ${otc.border}`, background: otc.bg }}><div dangerouslySetInnerHTML={{ __html: tsq(ot, 18) }} /><span style={{ fontFamily: "'DM Mono',monospace", fontSize: 9, color: otc.tc }}>Overall {otc.lbl} · {otc.v}</span></div>
              </div>
              <div className="grid-tier" style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8 }}>
                {groups.map(g => (
                  <div key={g.label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#f8f9ff', border: `1px solid ${g.cfg.border}`, borderRadius: 8, padding: '8px 12px' }}>
                    <span style={{ fontSize: 11, color: '#6c7a9c' }}>{g.label}</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}><div dangerouslySetInnerHTML={{ __html: tsq(g.tier, 17) }} /><span style={{ fontFamily: "'DM Mono',monospace", fontSize: 9, color: g.cfg.tc }}>{g.cfg.lbl}</span></div>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' as const, marginBottom: 12 }}>
              {[{ id: 'metrics', l: '📊 Metrics' }, { id: 'mindshare', l: '🧠 Mindshare' }, { id: 'risks', l: '⚠️ Risks' }, { id: 'sources', l: '📎 Sources' }].map(sec => (
                <button key={sec.id} onClick={() => setAsec(sec.id)} style={{ padding: '8px 18px', borderRadius: 10, border: `1px solid ${asec === sec.id ? '#14532d' : '#d4e8d0'}`, background: asec === sec.id ? '#14532d' : '#fff', color: asec === sec.id ? '#fff' : '#6c7a9c', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.15s' }}>{sec.l}</button>
              ))}
            </div>

            {asec === 'metrics' && (
              <div style={{ background: '#fff', border: '1px solid #dbe4ff', borderRadius: 14, padding: 16, marginBottom: 12 }}>
                <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' as const, marginBottom: 10 }}>
                  {CATS.map(cat => { const sc = catScore(cat); return <button key={cat} onClick={() => setAtab(cat)} style={{ padding: '5px 12px', borderRadius: 7, border: `1px solid ${atab === cat ? '#14532d' : '#d4e8d0'}`, background: atab === cat ? '#14532d' : '#fff', color: atab === cat ? '#fff' : '#6c7a9c', fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>{cat} <span style={{ color: atab === cat ? '#fff' : T[getTier(sc)].solid, fontFamily: "'DM Mono',monospace", fontSize: 9 }}>{sc}</span></button> })}
                </div>
                <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 9, color: '#adb5bd', textAlign: 'right' as const, marginBottom: 10 }}>tap any row for analyst commentary</div>
                {METRICS.filter(m => m.cat === atab).map(m => <MetricRow key={m.id} metric={m} data={result.metrics?.[m.id]} />)}
              </div>
            )}

            {asec === 'mindshare' && (
              <div style={{ background: '#fff', border: '1px solid #dbe4ff', borderRadius: 14, padding: 16, marginBottom: 12 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#1c2b5a', marginBottom: 4 }}>Mindshare Trend</div>
                <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 9, color: '#adb5bd', marginBottom: 14 }}>Estimated CT mindshare over past 8 weeks</div>
                <canvas ref={canvasRef} style={{ width: '100%', height: 110 }} />
                {result.mindshare_trend && <div style={{ display: 'flex', gap: 16, marginTop: 8 }}><span style={{ fontFamily: "'DM Mono',monospace", fontSize: 9, color: '#868e96' }}>Current: <strong style={{ color: '#3b5bdb' }}>{result.mindshare_trend.current_pct || 'n/a'}</strong></span><span style={{ fontFamily: "'DM Mono',monospace", fontSize: 9, color: '#868e96' }}>Trend: <strong style={{ color: '#3b5bdb' }}>{result.mindshare_trend.trend || 'n/a'}</strong></span></div>}
              </div>
            )}

            {asec === 'risks' && (
              <div className="grid-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
                <div style={{ background: '#fff', border: '1px solid #dbe4ff', borderRadius: 14, padding: 15 }}>
                  <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 9, fontWeight: 500, letterSpacing: 1, marginBottom: 10, color: '#c92a2a', display: 'flex', alignItems: 'center', gap: 6 }}><span style={{ width: 6, height: 6, borderRadius: '50%', background: '#c92a2a', display: 'inline-block' }} />TOP RISKS</div>
                  {(result.top_risks || []).filter((x: string) => x).map((x: string, i: number) => <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 8 }}><span style={{ color: '#ffc9c9', flexShrink: 0, fontSize: 16 }}>•</span><span style={{ fontSize: 11, color: '#6c7a9c', lineHeight: 1.5 }}>{x}</span></div>)}
                </div>
                <div style={{ background: '#fff', border: '1px solid #dbe4ff', borderRadius: 14, padding: 15 }}>
                  <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 9, fontWeight: 500, letterSpacing: 1, marginBottom: 10, color: '#2f9e44', display: 'flex', alignItems: 'center', gap: 6 }}><span style={{ width: 6, height: 6, borderRadius: '50%', background: '#2f9e44', display: 'inline-block' }} />OPPORTUNITIES</div>
                  {(result.top_opportunities || []).filter((x: string) => x).map((x: string, i: number) => <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 8 }}><span style={{ color: '#8ce99a', flexShrink: 0, fontSize: 16 }}>•</span><span style={{ fontSize: 11, color: '#6c7a9c', lineHeight: 1.5 }}>{x}</span></div>)}
                </div>
              </div>
            )}

            {asec === 'sources' && (
              <div style={{ background: '#fff', border: '1px solid #dbe4ff', borderRadius: 14, padding: 16, marginBottom: 12 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#1c2b5a', marginBottom: 14 }}>Research Sources</div>
                {(result.sources || []).filter((s: any) => s.name).length > 0 ? (result.sources || []).filter((s: any) => s.name).map((src: any, i: number) => (
                  <div key={i} style={{ display: 'flex', gap: 10, paddingBottom: 10, marginBottom: 10, borderBottom: '1px solid #f0f4ff' }}>
                    <div style={{ width: 22, height: 22, borderRadius: '50%', background: '#e8ecff', color: '#3b5bdb', fontFamily: "'DM Mono',monospace", fontSize: 9, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1 }}>{i + 1}</div>
                    <div><div style={{ fontSize: 12, fontWeight: 600, color: '#14532d', marginBottom: 2 }}>{src.name || src.title || ''}</div><div style={{ fontFamily: "'DM Mono',monospace", fontSize: 9, color: '#adb5bd', marginBottom: 3 }}>{src.used_for || src.type || ''}</div>{src.url && src.url !== 'unknown' && <a href={src.url} target="_blank" rel="noreferrer" style={{ fontFamily: "'DM Mono',monospace", fontSize: 9, color: '#3b5bdb', textDecoration: 'none' }}>{src.url.slice(0, 55)}{src.url.length > 55 ? '...' : ''}</a>}</div>
                  </div>
                )) : <div style={{ fontSize: 12, color: '#adb5bd', textAlign: 'center' as const, padding: 24 }}>No sources found.</div>}
              </div>
            )}

            <div style={{ textAlign: 'center' as const, fontFamily: "'DM Mono',monospace", fontSize: 9, color: '#adb5bd', letterSpacing: 1, paddingTop: 6 }}>CMV ALPHASCANNER · POWERED BY AI · NOT FINANCIAL ADVICE</div>
          </div>
        )}

        {!loading && !result && !error && (
          <div style={{ border: '1.5px dashed #86efac', borderRadius: 16, padding: '48px 24px', textAlign: 'center' as const, background: 'rgba(255,255,255,0.7)' }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>🔭</div>
            <div style={{ fontSize: 15, fontWeight: 700, color: '#6c7a9c', marginBottom: 6 }}>No project scanned yet</div>
            <div style={{ fontSize: 12, color: '#adb5bd', lineHeight: 1.6 }}>Paste any project X URL or handle above.<br />Works with URLs, @handles, or just the username.</div>
          </div>
        )}
      </div>
    </div>
  )
}
