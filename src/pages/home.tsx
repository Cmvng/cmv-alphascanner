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
    ctx.fillText('WHAT IT'S BUILDING', 44, midY)
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
      ctx.fillText('WATCH FOR', 44, trendY + 44)
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
