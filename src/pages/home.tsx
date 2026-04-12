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

TOOLS-FIRST APPROACH: You have pre-fetched data from DefiLlama, RootData, DexScreener, GeckoTerminal and CryptoNews already in this prompt. Use that data directly to score metrics. Only web search for FUD/controversies that APIs cannot detect. Most scans should need 0-1 web searches.

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
- AUTO-DETECTED FUD FLAGS (verified by tools — include ALL of these in red_flags, do not ignore them):
${(xd?.enriched?.auto_fud_flags || []).map((f: any) => `  * [${f.type}] ${f.label}: ${f.detail}`).join('\n')}

STRICT SEARCH RULES — you have pre-fetched data from 5 APIs. Follow these exactly:

DO NOT SEARCH FOR (already provided above — use it directly):
- TVL, revenue, fees → use DefiLlama data above
- VC names, funding amounts → use RootData/confirmed investors above  
- Token price, volume → use DexScreener/CoinGecko data above
- Known hacks/exploits → use hacks database above
- News sentiment → use CryptoNews data above
- Team members → use RootData team above

ONLY RUN 1-2 WEB SEARCHES FOR:
1. TGE delays, presale issues, community anger, broken promises
2. Specific season requirements/dates if not found in X data above

If all data is already provided, skip web searches entirely and score directly.
Use the pre-fetched data to fill all metrics. Web search is a last resort only.

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
    <div className="metric-row" onClick={() => setOpen(o => !o)} style={{ border: `1px solid ${open ? '#d1fae5' : '#f1f5f9'}`, borderRadius: 10, padding: '11px 13px', marginBottom: 3, cursor: 'pointer', background: open ? '#f0fdf4' : '#fff', transition: 'all 0.2s' }}>
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
      <div onClick={() => { if (cleanHandle) window.open('https://x.com/' + cleanHandle, '_blank', 'noopener,noreferrer') }} style={{ flexShrink: 0, cursor: cleanHandle ? 'pointer' : 'default' }}>
        {!err && imgSrc ? <img src={imgSrc} alt={member.name} style={{ width: 42, height: 42, borderRadius: '50%', objectFit: 'cover', border: '1px solid #dbe4ff' }} onError={() => setErr(true)} /> : <div style={{ width: 42, height: 42, borderRadius: '50%', background: '#dcfce7', color: '#15803d', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'DM Mono',monospace", fontSize: 13, fontWeight: 700 }}>{ini}</div>}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' as const, marginBottom: 2 }}>
          <span onClick={() => { if (cleanHandle) window.open('https://x.com/' + cleanHandle, '_blank', 'noopener,noreferrer') }} style={{ fontSize: 13, fontWeight: 600, color: '#111', fontFamily: "'Syne',sans-serif", cursor: cleanHandle ? 'pointer' : 'default', textDecoration: cleanHandle ? 'underline' : 'none' }}>{member.name}</span>
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
          <span style={{ fontSize: 13, fontWeight: 600, color: '#111', fontFamily: "'Syne',sans-serif" }}>{member.name}</span>
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
    // Strip URL parts, @, and any invalid X handle characters (only a-z 0-9 _ allowed)
    const rawHandle = url.replace('https://x.com/', '').replace('https://twitter.com/', '').replace('http://x.com/', '').replace('@', '').split('/')[0].trim()
    const handle = rawHandle.replace(/[^a-zA-Z0-9_]/g, '')
    if (!handle) return
    // If handle changed after sanitization, warn user
    if (handle.toLowerCase() !== rawHandle.toLowerCase()) {
      console.warn('Handle sanitized:', rawHandle, '→', handle)
    }
    const cacheKey = `cmv_scan_${handle.toLowerCase()}`
    setLoading(true); setResult(null); setCgData(null); setXData(null); setError(null); setAtab('Fundamentals'); setAsec('metrics'); setSelectedTags([])
    try {
      const cached = localStorage.getItem(cacheKey)
      if (cached) {
        const { result: cr, cgData: cc, xData: cx, timestamp } = JSON.parse(cached)
        if (Date.now() - timestamp < 1000 * 60 * 60 * 24) { setResult(cr); setCgData(cc); setXData(cx); setLoading(false); return }
      }
    } catch { }
    // Fetch X data — catch ALL errors and continue with what we have
    let xd: any = null
    try {
      xd = await fetchProjectXData(handle)
    } catch (xErr) {
      console.warn('X API fetch failed:', xErr)
    }

    // If X API completely failed AND we have no data at all — show retry
    // But if we have partial data, continue — tools can still score the project
    if (!xd && !handle) {
      setError('Unable to reach X API. Please try again.')
      setLoading(false)
      return
    }

    // If null, create a minimal stub so tool-native scoring can still run
    if (!xd) {
      xd = {
        name: handle, handle, description: '', followers: 0, following: 0,
        tweet_count: 0, listed: 0, verified: false, account_age_years: 0,
        avg_likes: 0, avg_retweets: 0, cmv_score: 0,
        confirmed_ticker: null, token_launch_hinted: false,
        category: 'Crypto', enriched: {}, profile_image_url: null,
        error: 'X API unavailable', partial: true
      }
    }
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

    // Merge auto-detected FUD flags into result when Claude runs
    const mergeAutoFlags = (cleaned: any) => {
      const autoFlags = (xd?.enriched?.auto_fud_flags || []).map((f: any) => ({
        type: f.type,
        label: f.label,
        detail: f.detail,
        source: 'Auto-detected by CMV tools'
      }))
      // Add auto flags that Claude didn't already catch
      const existingLabels = (cleaned.red_flags || []).map((f: any) => f.label?.toLowerCase())
      const newFlags = autoFlags.filter((f: any) => !existingLabels.some((l: string) => l.includes(f.label.toLowerCase().slice(0, 10))))
      return { ...cleaned, red_flags: [...(cleaned.red_flags || []), ...newFlags] }
    }

    // X-only fallback scan — no Claude, uses X data to build basic result
    const xOnlyScan = () => {
      // ── FULL TOOL-NATIVE SCORING ENGINE ──
      // No Claude needed. Uses DefiLlama, DexScreener, RootData, CryptoNews, X API.

      const enriched = xd?.enriched || {}
      const autoFlags = enriched.auto_fud_flags || []
      const followers = xd?.followers || 0
      const following = xd?.following || 0
      const listed = xd?.listed || 0
      const tweetCount = xd?.tweet_count || 0
      const accountAge = xd?.account_age_years || 0
      const avgLikes = xd?.avg_likes || 0
      const verified = xd?.verified || false
      const cmvXScore = xd?.cmv_score || 0

      // ── METRIC SCORES FROM TOOLS ──

      // 1. Funding (RootData + DefiLlama)
      const hasRaised = enriched.total_raised_rootdata || enriched.total_raised_defillama
      const investors = enriched.confirmed_investors || []
      const topVCs = ['paradigm','a16z','coinbase','polychain','multicoin','pantera','sequoia','dragonfly','binance','animoca']
      const hasTopVC = investors.some((v: string) => topVCs.some(vc => v.toLowerCase().includes(vc)))
      const fundingScore = hasTopVC ? 90 : investors.length > 3 ? 75 : hasRaised ? 60 : investors.length > 0 ? 45 : 25

      // 2. TVL / Revenue (DefiLlama)
      const tvl = enriched.tvl
      const revenue = enriched.revenue_24h
      const fees = enriched.fees_24h
      const tvlNum = tvl ? (tvl.includes('B') ? parseFloat(tvl)*1e9 : tvl.includes('M') ? parseFloat(tvl)*1e6 : parseFloat(tvl)*1e3) : 0
      const revenueScore = revenue ? (revenue.includes('M') ? 90 : revenue.includes('K') ? 70 : 50) : tvlNum > 1e9 ? 80 : tvlNum > 1e8 ? 65 : tvlNum > 1e6 ? 50 : 20

      // 3. Token health (DexScreener)
      const dexDump = enriched.dex_dump_detected
      const dexLiq = enriched.dex_liquidity
      const tokenLive = cg?.token_live
      const tokenScore = dexDump ? 10 : tokenLive && dexLiq ? (dexLiq.includes('M') ? 75 : dexLiq.includes('K') ? 55 : 35) : xd?.token_launch_hinted ? 50 : 40

      // 4. Community / X presence
      const followerScore = followers > 500000 ? 95 : followers > 100000 ? 85 : followers > 50000 ? 75 : followers > 10000 ? 60 : followers > 5000 ? 45 : 25
      const engagementScore = avgLikes > 1000 ? 90 : avgLikes > 500 ? 75 : avgLikes > 100 ? 60 : avgLikes > 20 ? 45 : 20

      // 5. Team credibility (RootData + X)
      const team = enriched.rootdata_team || []
      const teamScore = team.length > 3 ? 80 : team.length > 1 ? 65 : verified ? 60 : accountAge > 3 ? 55 : accountAge > 1 ? 45 : 30

      // 6. News sentiment (CryptoNews)
      const sentiment = enriched.news_sentiment
      const sentimentScore = sentiment === 'positive' ? 80 : sentiment === 'neutral' ? 60 : sentiment === 'negative' ? 25 : 50

      // 7. Security (DefiLlama hacks)
      const hacks = enriched.known_hacks || []
      const securityScore = hacks.length > 0 ? 10 : tvlNum > 0 ? 75 : 55

      // ── FUD PENALTY ──
      let fudPenalty = 0
      autoFlags.forEach((f: any) => {
        if (f.severity === 'high') fudPenalty += 100
        else if (f.severity === 'medium') fudPenalty += 50
        else fudPenalty += 25
      })
      fudPenalty = Math.min(fudPenalty, 300)

      // ── COMPOSITE SCORE ──
      const weights = { funding: 0.20, revenue: 0.18, token: 0.12, follower: 0.15, engagement: 0.12, team: 0.10, sentiment: 0.08, security: 0.05 }
      const rawScore = Math.round(
        fundingScore * weights.funding +
        revenueScore * weights.revenue +
        tokenScore * weights.token +
        followerScore * weights.follower +
        engagementScore * weights.engagement +
        teamScore * weights.team +
        sentimentScore * weights.sentiment +
        securityScore * weights.security
      )
      // Combine with CMV X score (social proof)
      const combined = Math.round(rawScore * 0.6 + (cmvXScore / 10) * 0.4)
      const finalScore = Math.max(0, Math.min(100, combined - Math.round(fudPenalty / 10)))

      // Hard caps
      const hasHack = hacks.length > 0
      const hasDump = enriched.dex_dump_detected
      const cappedScore = hasHack ? Math.min(finalScore, 35) : hasDump ? Math.min(finalScore, 45) : finalScore

      // ── VERDICT ──
      const verdict = cappedScore >= 85 ? 'FARM IT' : cappedScore >= 60 ? 'CREATE CONTENT' : cappedScore >= 35 ? 'WATCH' : 'SKIP'

      // ── GENERATE HIGHLIGHTS FROM TOOLS ──
      const highlights: string[] = []
      if (hasRaised) highlights.push(`${enriched.total_raised_rootdata || enriched.total_raised_defillama} raised`)
      if (hasTopVC) highlights.push(`Backed by ${investors.slice(0,2).join(', ')}`)
      if (tvl) highlights.push(`${tvl} TVL deployed`)
      if (revenue) highlights.push(`${revenue} daily revenue`)
      if (followers > 10000) highlights.push(`${(followers/1000).toFixed(0)}K X followers`)
      if (team.length > 0) highlights.push(`${team.length} verified team members`)
      if (verified) highlights.push('Verified X account')
      if (enriched.chains?.length > 0) highlights.push(`Live on ${enriched.chains.slice(0,2).join(', ')}`)

      // ── VERDICT REASON FROM TOOLS ──
      const parts: string[] = []
      if (hasRaised && hasTopVC) parts.push(`Backed by top VCs including ${investors[0]}`)
      else if (hasRaised) parts.push(`Has raised ${enriched.total_raised_rootdata || enriched.total_raised_defillama}`)
      if (tvl) parts.push(`${tvl} TVL showing real capital deployment`)
      if (revenue) parts.push(`Generating ${revenue} in daily revenue`)
      if (followers > 10000) parts.push(`Strong X presence with ${(followers/1000).toFixed(0)}K followers`)
      if (hacks.length > 0) parts.push(`WARNING: ${hacks.length} known security exploit(s) on record`)
      if (dexDump) parts.push(`Token showing significant price decline`)
      if (autoFlags.length > 0) parts.push(`${autoFlags.length} automated red flag(s) detected`)
      if (sentiment === 'negative') parts.push('Negative news sentiment detected')

      const verdictReason = parts.length > 0 ? parts.join('. ') + '.' : `Based on available data: ${followers.toLocaleString()} followers, ${accountAge.toFixed(1)} year old account.`

      const verdictAction: Record<string, string> = {
        'FARM IT': 'Strong fundamentals confirmed by multiple data sources. Actively farm this project.',
        'CREATE CONTENT': 'Solid metrics but monitor closely. Create content and track progress.',
        'WATCH': 'Insufficient data or mixed signals. Watch for more clarity before committing.',
        'SKIP': 'Multiple red flags or weak fundamentals detected across data sources. Skip for now.'
      }

      // ── BUILD FULL RESULT ──
      const cleaned = {
        project_name: xd?.name || handle,
        ticker: cg?.ticker || xd?.confirmed_ticker || null,
        description: xd?.description || '',
        team_location: '',
        founded: '',
        project_category: xd?.category || 'Crypto',
        verdict: verdict,
        verdict_reason: verdictReason,
        verdict_action: verdictAction[verdict],
        overall_score: cappedScore,
        score_rationale: `Tool-native score: Funding ${fundingScore}/100 · Revenue ${revenueScore}/100 · Community ${followerScore}/100 · Team ${teamScore}/100. FUD penalty: -${fudPenalty}pts. Claude analysis unavailable — score based on verified tool data only.`,
        good_highlights: highlights.slice(0, 5),
        red_flags: autoFlags.map((f: any) => ({ type: f.type, label: f.label, detail: f.detail })),
        top_risks: [
          hacks.length > 0 ? `Security: ${hacks.length} known exploit(s)` : null,
          dexDump ? 'Token showing significant price dump' : null,
          dexLiq && dexLiq.includes('K') && !dexLiq.includes('00K') ? 'Low DEX liquidity — rug risk' : null,
          sentiment === 'negative' ? 'Negative news coverage detected' : null,
          followers < 1000 ? 'Very low social presence' : null,
        ].filter(Boolean).slice(0, 4),
        top_opportunities: [
          !tokenLive && xd?.token_launch_hinted ? 'Token not yet launched — early farming opportunity' : null,
          tvlNum > 1e8 ? `High TVL of ${tvl} showing strong ecosystem` : null,
          hasTopVC ? `VC backing from ${investors[0]} adds credibility` : null,
          enriched.chains?.length > 1 ? `Multi-chain deployment on ${enriched.chains.join(', ')}` : null,
        ].filter(Boolean).slice(0, 3),
        team_members: (enriched.rootdata_team || []).map((t: any) => ({
          name: t.name,
          role: t.role,
          x_handle: t.x_handle,
        })),
        sources: [
          tvl ? { name: 'DefiLlama', used_for: 'TVL and revenue data' } : null,
          investors.length > 0 ? { name: 'RootData', used_for: 'Funding and investor data' } : null,
          tokenLive ? { name: 'DexScreener', used_for: 'Token price and liquidity' } : null,
          sentiment ? { name: 'CryptoNews', used_for: 'News sentiment analysis' } : null,
        ].filter(Boolean),
        data_accuracy_note: 'Analysis powered by DefiLlama, RootData, DexScreener, CryptoNews and X API. Claude AI analysis unavailable — using tool-native scoring.',
        metrics: {
          funding: { score: fundingScore, summary: hasRaised ? `${enriched.total_raised_rootdata || enriched.total_raised_defillama} raised from ${investors.length} investors` : 'No confirmed funding found' },
          revenue: { score: revenueScore, summary: revenue ? `${revenue} daily revenue, ${fees || 'N/A'} fees` : tvl ? `${tvl} TVL` : 'No revenue data found' },
          community: { score: followerScore, summary: `${followers.toLocaleString()} followers, ${(avgLikes).toFixed(0)} avg likes, account ${accountAge.toFixed(1)}y old` },
          team: { score: teamScore, summary: team.length > 0 ? `${team.length} verified team members via RootData` : 'Team details unverified' },
          sentiment: { score: sentimentScore, summary: `${sentiment || 'neutral'} news sentiment from ${enriched.news_article_count || 0} articles` },
          security: { score: securityScore, summary: hacks.length > 0 ? `${hacks.length} known exploit(s) on DefiLlama` : 'No known security incidents' },
        },
        mindshare_trend: null,
        future_seasons: null,
        post_tge_outlook: tokenLive ? (dexDump ? 'Poor — token declining' : 'Moderate') : 'Token not yet live',
        project_follows: null,
      }
      saveResult(cleaned)
    }

    try {
      const r = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-api-key': import.meta.env.VITE_ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01', 'anthropic-dangerous-direct-browser-access': 'true' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 2000,
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
      const withAutoFlags = mergeAutoFlags(cleaned)
      saveResult(withAutoFlags)
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
    const colors = otc.vbg.match(/#[0-9a-fA-F]{6}/g) || ['#37b24d','#2f9e44']
    const goodHighlights = (result.good_highlights || []).filter((h: string) => h && h.length > 5)
    const flagCount = (result.red_flags || []).filter((f: any) => f.label).length

    // Verdict text — word wrap helper
    const wrapText = (ctx2: CanvasRenderingContext2D, text: string, x: number, y: number, maxW: number, lineH: number, maxLines: number) => {
      const words = text.split(' ')
      let line = '', lY = y, lines = 0
      for (const word of words) {
        const test = line + word + ' '
        if (ctx2.measureText(test).width > maxW && line) {
          ctx2.fillText(line.trim(), x, lY)
          line = word + ' '; lY += lineH; lines++
          if (lines >= maxLines - 1) { line = line.trim() + '…'; break }
        } else line = test
      }
      if (line.trim()) ctx2.fillText(line.trim(), x, lY)
    }

    const canvas = document.createElement('canvas')
    const W = 1200, H = 630
    canvas.width = W; canvas.height = H
    const ctx = canvas.getContext('2d')!

    // ── BACKGROUND ──
    const grad = ctx.createLinearGradient(0, 0, W, H)
    grad.addColorStop(0, colors[0])
    grad.addColorStop(1, colors[1] || colors[0])
    ctx.fillStyle = grad
    ctx.fillRect(0, 0, W, H)

    // Subtle decoration
    ctx.save()
    ctx.globalAlpha = 0.06
    ctx.fillStyle = '#fff'
    ctx.beginPath(); ctx.arc(W + 80, -80, 380, 0, Math.PI * 2); ctx.fill()
    ctx.beginPath(); ctx.arc(-60, H + 60, 280, 0, Math.PI * 2); ctx.fill()
    ctx.restore()

    // ── LEFT COLUMN (project info) ──
    const leftW = 520
    const pad = 50

    // Project PFP — large circle
    const pfpUrl = xData?.profile_image_url
    let pfpOk = false
    if (pfpUrl) {
      await new Promise<void>(resolve => {
        const img = new Image()
        img.crossOrigin = 'anonymous'
        img.onload = () => {
          ctx.save()
          ctx.beginPath(); ctx.arc(pad + 56, 90, 52, 0, Math.PI * 2); ctx.clip()
          ctx.drawImage(img, pad + 4, 38, 104, 104)
          ctx.restore()
          ctx.strokeStyle = 'rgba(255,255,255,0.5)'; ctx.lineWidth = 3
          ctx.beginPath(); ctx.arc(pad + 56, 90, 52, 0, Math.PI * 2); ctx.stroke()
          pfpOk = true; resolve()
        }
        img.onerror = () => resolve()
        img.src = pfpUrl
      })
    }
    if (!pfpOk) {
      ctx.fillStyle = 'rgba(255,255,255,0.2)'
      ctx.beginPath(); ctx.arc(pad + 56, 90, 52, 0, Math.PI * 2); ctx.fill()
      ctx.fillStyle = '#fff'; ctx.font = 'bold 38px Arial'; ctx.textAlign = 'center'
      ctx.fillText((result.project_name||'?').charAt(0).toUpperCase(), pad + 56, 106)
      ctx.textAlign = 'left'
    }

    // Project name
    ctx.fillStyle = '#fff'
    ctx.font = 'bold 46px Arial, sans-serif'
    const nameX = pad + 126
    ctx.fillText((result.project_name || '').slice(0, 18), nameX, 78)

    // Category pill
    const cat = result.project_category || 'Crypto'
    ctx.fillStyle = 'rgba(0,0,0,0.2)'
    const catW = ctx.measureText(cat).width + 28
    ctx.font = 'bold 14px Arial'
    ctx.beginPath(); ctx.roundRect(nameX, 88, catW, 28, 14); ctx.fill()
    ctx.fillStyle = '#fff'
    ctx.fillText(cat, nameX + 14, 107)

    // ── DIVIDER ──
    ctx.strokeStyle = 'rgba(255,255,255,0.15)'; ctx.lineWidth = 1
    ctx.beginPath(); ctx.moveTo(pad, 162); ctx.lineTo(leftW + pad, 162); ctx.stroke()

    // Description — up to 3 lines
    ctx.fillStyle = '#fff'; ctx.globalAlpha = 0.92
    ctx.font = '18px Arial, sans-serif'
    wrapText(ctx, result.description || '', pad, 195, leftW, 28, 3)
    ctx.globalAlpha = 1

    // ── HIGHLIGHTS ──
    const hlY = 290
    ctx.font = 'bold 13px Arial'
    let hx = pad
    goodHighlights.slice(0, 3).forEach((h: string) => {
      let label = '✓  ' + h
      const maxPW = (leftW - 20) / 3 - 8
      while (ctx.measureText(label).width > maxPW - 20 && label.length > 4) label = label.slice(0, -4) + '…'
      const pw = Math.min(ctx.measureText(label).width + 20, maxPW)
      ctx.fillStyle = 'rgba(255,255,255,0.15)'
      ctx.beginPath(); ctx.roundRect(hx, hlY, pw, 30, 15); ctx.fill()
      ctx.fillStyle = '#fff'
      ctx.fillText(label, hx + 10, hlY + 20)
      hx += pw + 8
    })

    // Red flags pill
    if (flagCount > 0) {
      ctx.fillStyle = 'rgba(180,20,20,0.85)'
      ctx.font = 'bold 13px Arial'
      const fpW = ctx.measureText('🚨 ' + flagCount + ' red flag' + (flagCount > 1 ? 's' : '')).width + 24
      ctx.beginPath(); ctx.roundRect(pad, hlY + 40, fpW, 28, 14); ctx.fill()
      ctx.fillStyle = '#fff'
      ctx.fillText('🚨 ' + flagCount + ' red flag' + (flagCount > 1 ? 's' : ''), pad + 12, hlY + 59)
    }

    // ── RIGHT COLUMN ──
    const rightX = leftW + pad + 60
    const rightW = W - rightX - pad

    // Score — massive
    ctx.fillStyle = '#fff'
    ctx.font = 'bold 120px Arial, sans-serif'
    ctx.textAlign = 'right'
    ctx.fillText(String(result.overall_score ?? 0), W - pad, 120)
    ctx.font = 'bold 16px monospace'
    ctx.globalAlpha = 0.6
    ctx.fillText('ALPHA SCORE', W - pad, 148)
    ctx.globalAlpha = 1
    ctx.font = 'bold 18px Arial'
    ctx.fillText(ot + '  ·  ' + otc.lbl, W - pad, 174)
    ctx.textAlign = 'left'

    // Vertical divider
    ctx.strokeStyle = 'rgba(255,255,255,0.15)'; ctx.lineWidth = 1
    ctx.beginPath(); ctx.moveTo(rightX - 30, 60); ctx.lineTo(rightX - 30, H - 60); ctx.stroke()

    // User badge — PFP + name + says
    let userOk = false
    const uBadgeY = 210
    if (userPhoto) {
      await new Promise<void>(resolve => {
        const uImg = new Image()
        uImg.onload = () => {
          ctx.save()
          ctx.beginPath(); ctx.arc(rightX + 24, uBadgeY, 22, 0, Math.PI * 2); ctx.clip()
          ctx.drawImage(uImg, rightX + 2, uBadgeY - 22, 44, 44)
          ctx.restore()
          ctx.strokeStyle = 'rgba(255,255,255,0.8)'; ctx.lineWidth = 2.5
          ctx.beginPath(); ctx.arc(rightX + 24, uBadgeY, 22, 0, Math.PI * 2); ctx.stroke()
          userOk = true; resolve()
        }
        uImg.onerror = () => resolve()
        uImg.src = userPhoto
      })
    }
    if (!userOk) {
      ctx.fillStyle = 'rgba(255,255,255,0.25)'
      ctx.beginPath(); ctx.arc(rightX + 24, uBadgeY, 22, 0, Math.PI * 2); ctx.fill()
      ctx.fillStyle = '#fff'; ctx.font = 'bold 16px Arial'; ctx.textAlign = 'center'
      ctx.fillText((userName || 'C').charAt(0).toUpperCase(), rightX + 24, uBadgeY + 6)
      ctx.textAlign = 'left'
    }
    ctx.fillStyle = 'rgba(255,255,255,0.7)'; ctx.font = '13px Arial'
    ctx.fillText('@' + (userName || 'cmvng') + ' says', rightX + 56, uBadgeY - 8)
    ctx.fillStyle = '#fff'; ctx.font = 'bold 22px Arial'
    ctx.fillText(otc.v.toLowerCase() + '  ' + otc.emoji, rightX + 56, uBadgeY + 16)

    // Verdict box
    const vBoxY = uBadgeY + 48
    const vBoxH = 180
    ctx.fillStyle = 'rgba(0,0,0,0.22)'
    ctx.beginPath(); ctx.roundRect(rightX, vBoxY, rightW, vBoxH, 16); ctx.fill()

    ctx.fillStyle = '#fff'
    ctx.font = 'bold 26px Arial'
    ctx.fillText(otc.emoji + '  ' + otc.v, rightX + 18, vBoxY + 38)

    ctx.font = '15px Arial'; ctx.globalAlpha = 0.88
    wrapText(ctx, result.verdict_action || result.verdict_reason || '', rightX + 18, vBoxY + 72, rightW - 36, 24, 5)
    ctx.globalAlpha = 1

    // Footer
    ctx.globalAlpha = 0.28; ctx.fillStyle = '#fff'; ctx.font = '13px monospace'
    ctx.textAlign = 'center'
    ctx.fillText('CMV ALPHASCANNER  ·  cmv-alphascanner.vercel.app', W / 2, H - 18)
    ctx.globalAlpha = 1; ctx.textAlign = 'left'

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
    <div style={{ minHeight: '100vh', background: '#f6f8fa', fontFamily: "'Inter',sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;500;600;700;800&family=DM+Mono:wght@400;500&family=Inter:wght@300;400;500;600&display=swap');
        *{box-sizing:border-box;}
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes shimmer{0%{background-position:-700px 0}100%{background-position:700px 0}}
        @keyframes float{0%,100%{transform:translateY(0)}50%{transform:translateY(-8px)}}
        @keyframes ring{0%,100%{transform:scale(1);opacity:0.3}50%{transform:scale(1.15);opacity:0.08}}
        @keyframes fadeIn{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}
        @keyframes scan{0%{transform:translateX(-100%)}100%{transform:translateX(500%)}}
        @keyframes thinkDot{0%,100%{opacity:0.15;transform:scale(0.7)}50%{opacity:1;transform:scale(1.1)}}
        @keyframes pop{0%{transform:scale(0.85);opacity:0}60%{transform:scale(1.03)}100%{transform:scale(1);opacity:1}}
        .tag-btn{transition:all 0.2s;cursor:pointer;}
        .tag-btn:hover{transform:translateY(-2px);}
        .metric-row{transition:all 0.2s;cursor:pointer;}
        .metric-row:hover{background:#f0fdf4!important;}
        .nav-link{transition:opacity 0.15s;}
        .nav-link:hover{opacity:0.7;}
        input:focus{outline:none;}
        @media(max-width:640px){
          .grid-score{grid-template-columns:1fr!important;}
          .grid-3{grid-template-columns:1fr 1fr!important;}
          .grid-2{grid-template-columns:1fr!important;}
          .grid-tier{grid-template-columns:1fr 1fr!important;}
          .search-btns{flex-wrap:wrap!important;}
          .hero-title{font-size:36px!important;}
        }
      `}</style>

      {/* Nav */}
      <div style={{ background: 'rgba(255,255,255,0.92)', backdropFilter: 'blur(12px)', borderBottom: '1px solid rgba(0,0,0,0.06)', padding: '0 28px', display: 'flex', alignItems: 'center', height: 60, gap: 12, position: 'sticky', top: 0, zIndex: 100 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
          <div style={{ width: 32, height: 32, background: '#16a34a', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04a1 1 0 000-1.41l-2.34-2.34a1 1 0 00-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z" fill="#fff" /></svg>
          </div>
          <span style={{ fontSize: 15, fontWeight: 700, color: '#111', letterSpacing: -0.3, fontFamily: "'Syne',sans-serif" }}>CMV <span style={{ color: '#16a34a' }}>Alpha</span></span>
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6 }}>
          <a href="/tierlist" className="nav-link" style={{ fontFamily: "'DM Mono',monospace", fontSize: 10, color: '#6b7280', textDecoration: 'none', padding: '5px 12px', borderRadius: 8, border: '1px solid #e5e7eb', background: '#fff' }}>Tiers</a>
          <a href="/feed" className="nav-link" style={{ fontFamily: "'DM Mono',monospace", fontSize: 10, color: '#6b7280', textDecoration: 'none', padding: '5px 12px', borderRadius: 8, border: '1px solid #e5e7eb', background: '#fff' }}>Feed</a>
          <button onClick={() => setShowProfileSetup(true)} style={{ display: 'flex', alignItems: 'center', gap: 7, background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 20, padding: '5px 12px 5px 6px', cursor: 'pointer', fontFamily: 'inherit' }}>
            {userPhoto ? <img src={userPhoto} alt="" style={{ width: 22, height: 22, borderRadius: '50%', objectFit: 'cover' }} /> : <div style={{ width: 22, height: 22, borderRadius: '50%', background: '#dcfce7', color: '#16a34a', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 700 }}>{userName ? userName.charAt(0).toUpperCase() : '?'}</div>}
            <span style={{ fontSize: 12, fontWeight: 500, color: '#374151' }}>{userName || 'Profile'}</span>
          </button>
        </div>
      </div>

      {/* Profile Setup Modal */}
      {showProfileSetup && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div style={{ background: '#fff', borderRadius: 20, padding: 24, width: '100%', maxWidth: 400, animation: 'fadeIn 0.3s ease' }}>
            <div style={{ fontSize: 16, fontWeight: 700, color: '#111', marginBottom: 4, fontFamily: "'Syne',sans-serif" }}>Your Alpha Profile</div>
            <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 9, color: '#9ca3af', marginBottom: 20 }}>Shows on every verdict card you generate</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20 }}>
              <div onClick={() => fileRef.current?.click()} style={{ width: 72, height: 72, borderRadius: '50%', background: '#f8f9ff', border: '2px dashed #c5d0ff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', overflow: 'hidden', flexShrink: 0 }}>
                {tempPhoto ? <img src={tempPhoto} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <div style={{ textAlign: 'center' as const }}><svg width="20" height="20" viewBox="0 0 24 24" fill="none" style={{ display: 'block', margin: '0 auto 4px' }}><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12" stroke="#adb5bd" strokeWidth="2" strokeLinecap="round" /></svg><span style={{ fontSize: 9, color: '#adb5bd', fontFamily: "'DM Mono',monospace" }}>upload</span></div>}
              </div>
              <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handlePhotoUpload} />
              <div style={{ flex: 1 }}>
                <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 9, color: '#9ca3af', letterSpacing: 1, marginBottom: 6 }}>YOUR NAME OR HANDLE</div>
                <input style={{ width: '100%', border: '1px solid #e5e7eb', borderRadius: 10, padding: '10px 14px', fontSize: 14, color: '#111', fontFamily: 'inherit' }} placeholder="e.g. Charles or @Cmv_ng" maxLength={20} value={tempName} onChange={e => setTempName(e.target.value)} />
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => setShowProfileSetup(false)} style={{ flex: 1, background: '#f8f9ff', border: '1px solid #e5e7eb', borderRadius: 10, padding: '11px', fontSize: 13, fontWeight: 600, color: '#6b7280', cursor: 'pointer', fontFamily: 'inherit' }}>Cancel</button>
              <button onClick={() => { saveProfile(tempName, tempPhoto); setShowProfileSetup(false) }} style={{ flex: 2, background: '#14532d', color: '#fff', border: 'none', borderRadius: 10, padding: '11px', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>Save Profile</button>
            </div>
          </div>
        </div>
      )}

      <div style={{ maxWidth: 880, margin: '0 auto', padding: '28px 20px 80px' }}>

        {/* Hero */}
        {!result && !loading && (
          <div style={{ position: 'relative', textAlign: 'center', padding: '48px 24px 52px' }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 7, background: '#dcfce7', border: '1px solid #86efac', borderRadius: 20, padding: '6px 16px', marginBottom: 22 }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#16a34a' }} />
              <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 10, color: '#15803d', letterSpacing: '0.5px' }}>CRYPTO ALPHA INTELLIGENCE</span>
            </div>
            <h1 className="hero-title" style={{ fontSize: 'clamp(40px,6vw,72px)', fontWeight: 800, color: '#0f172a', lineHeight: 1.0, letterSpacing: -2.5, marginBottom: 16, fontFamily: "'Syne',sans-serif" }}>Know before<br /><span style={{ color: '#16a34a' }}>you farm.</span></h1>
            <p style={{ fontSize: 16, color: '#6b7280', lineHeight: 1.7, maxWidth: 420, margin: '0 auto 36px', fontWeight: 400 }}>Paste any crypto project's X handle. Get 17 metrics, red flag detection, a score out of 1000, and a shareable verdict card.</p>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, flexWrap: 'wrap' as const }}>
              {['17 metrics','1000pt score','Red flag detection','Tool-native scoring','Shareable cards'].map(t => <span key={t} style={{ fontFamily: "'DM Mono',monospace", fontSize: 9, color: '#15803d', background: '#f0fdf4', border: '1px solid #86efac', borderRadius: 20, padding: '5px 12px' }}>{t}</span>)}
            </div>
          </div>
        )}

        {/* Search */}
        <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 16, padding: 16, marginBottom: 16, boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
          {!result && !loading && (
            <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 9, color: '#9ca3af', letterSpacing: '1.5px', marginBottom: 8 }}>PASTE X URL OR HANDLE</div>
          )}
          <div style={{ display: 'flex', gap: 8 }}>
            <input style={{ flex: 1, background: '#f9fafb', border: '1.5px solid #e5e7eb', borderRadius: 10, padding: '13px 16px', fontSize: 14, color: '#111', fontFamily: "'DM Mono',monospace", outline: 'none', transition: 'all 0.2s' }} placeholder="@projecthandle or https://x.com/handle" value={xUrl} onChange={e => setXUrl(e.target.value)} onKeyDown={e => e.key === 'Enter' && !loading && analyze()} disabled={loading} onFocus={e => { e.target.style.borderColor = '#16a34a'; e.target.style.background = '#fff' }} onBlur={e => { e.target.style.borderColor = '#e5e7eb'; e.target.style.background = '#f9fafb' }} />
            <div className="search-btns" style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
              {result && !loading && (
                <>
                  <button onClick={() => { setResult(null); setCgData(null); setXData(null); setXUrl(''); setSelectedTags([]) }} style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10, padding: '13px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer', color: '#374151', fontFamily: 'inherit', whiteSpace: 'nowrap' as const }}>+ New Scan</button>
                  <button onClick={async () => {
                    const rawHandle = xUrl.replace('https://x.com/','').replace('https://twitter.com/','').replace('@','').split('/')[0].trim()
                    const handle2 = rawHandle.replace(/[^a-zA-Z0-9_]/g, '')
                    try { localStorage.removeItem('cmv_scan_' + handle2) } catch {}
                    const freshXd = await fetchProjectXData(handle2).catch(() => null)
                    if (freshXd) setXData(freshXd)
                  }} style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10, padding: '13px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer', color: '#374151', fontFamily: 'inherit', whiteSpace: 'nowrap' as const }}>↺ Refresh</button>
                </>
              )}
              <button onClick={analyze} disabled={loading || !xUrl.trim()} style={{ background: loading || !xUrl.trim() ? '#f3f4f6' : '#16a34a', color: loading || !xUrl.trim() ? '#9ca3af' : '#fff', border: 'none', borderRadius: 10, padding: '13px 24px', fontSize: 14, fontWeight: 600, cursor: loading || !xUrl.trim() ? 'not-allowed' : 'pointer', whiteSpace: 'nowrap' as const, fontFamily: "'Syne',sans-serif", transition: 'all 0.2s' }}>{loading ? 'Scanning...' : 'Analyze →'}</button>
            </div>
          </div>
          <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 9, color: '#9ca3af', marginTop: 10, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' as const }}>
            <span>try:</span>
            {['eigenlayer','KaitoAI','hyperliquid'].map(ex => <button key={ex} onClick={() => setXUrl('https://x.com/' + ex)} style={{ fontFamily: "'DM Mono',monospace", fontSize: 9, color: '#16a34a', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>@{ex}</button>)}
          </div>
        </div>

        {/* Loading */}
        {loading && (
          <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 16, padding: 28, marginBottom: 16, overflow: 'hidden', position: 'relative' }}>
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: 'linear-gradient(90deg,transparent,#16a34a,transparent)', animation: 'scan 2s linear infinite', borderRadius: '16px 16px 0 0' }} />
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20 }}>
              <div style={{ width: 52, height: 52, borderRadius: '50%', border: '2px solid #16a34a', background: '#f0fdf4', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <span style={{ fontSize: 22 }}>🔍</span>
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 15, fontWeight: 600, color: '#111', marginBottom: 4, fontFamily: "'Syne',sans-serif" }}>{msg.text} {msg.emoji}</div>
                <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 10, color: '#6b7280' }}>scanning @{xUrl.replace('https://x.com/','').replace('@','').split('/')[0].replace(/[^a-zA-Z0-9_]/g,'')}...</div>
              </div>
              <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 28, fontWeight: 800, color: '#16a34a' }}>{elapsed}<span style={{ fontSize: 13, color: '#9ca3af' }}>s</span></div>
            </div>
            <div style={{ background: '#f0fdf4', borderRadius: 8, padding: '8px 12px', marginBottom: 16, border: '1px solid #86efac' }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: '#15803d' }}>{phase}</div>
            </div>
            {[100,80].map((w,i) => <div key={i} style={{ height: 36, background: 'linear-gradient(90deg,#f0fdf4 25%,#dcfce7 50%,#f0fdf4 75%)', backgroundSize: '700px 100%', animation: 'shimmer 1.5s infinite', borderRadius: 8, marginBottom: 8, width: w + '%' }} />)}
          </div>
        )}

        {/* Error */}
        {error && (
          <div style={{ background: error.startsWith('rate_limit') ? '#fffbeb' : '#fef2f2', border: `1px solid ${error.startsWith('rate_limit') ? '#fcd34d' : '#fca5a5'}`, borderRadius: 12, padding: '16px 18px', marginBottom: 14 }}>
            {error.startsWith('rate_limit') ? (
              <><div style={{ fontSize: 13, fontWeight: 600, color: '#92400e', marginBottom: 4 }}>⏳ High demand — retrying in {error.split(':')[1] || '65'}s</div><div style={{ height: 3, background: '#fde68a', borderRadius: 3 }}><div style={{ height: '100%', background: '#f59f00', borderRadius: 3, width: '60%' }} /></div></>
            ) : (
              <><div style={{ fontSize: 13, fontWeight: 600, color: '#dc2626', marginBottom: 6 }}>⚠️ Scan failed</div><div style={{ fontSize: 12, color: '#7f1d1d', marginBottom: 10 }}>{error}</div><button onClick={analyze} style={{ fontSize: 12, padding: '6px 14px', borderRadius: 8, border: '1px solid #fca5a5', background: '#fff', color: '#dc2626', cursor: 'pointer', fontFamily: 'inherit' }}>Try again</button></>
            )}
          </div>
        )}

        {/* Results */}
        {result && !loading && (
          <div style={{ animation: 'fadeIn 0.5s ease' }}>

            {redFlags.length > 0 && (
              <div style={{ background: '#fff5f5', border: '1.5px solid #fca5a5', borderRadius: 14, padding: '16px 18px', marginBottom: 12, animation: 'pop 0.4s ease' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                  <div style={{ width: 36, height: 36, background: '#dc2626', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" stroke="#fff" strokeWidth="2" strokeLinecap="round" /></svg>
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: '#dc2626', fontFamily: "'Syne',sans-serif" }}>🚨 {redFlags.length} Red Flag{redFlags.length > 1 ? 's' : ''} Detected</div>
                    <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 9, color: '#c92a2a' }}>Score penalised · Proceed with extreme caution</div>
                  </div>
                  <div style={{ background: '#dc2626', borderRadius: 8, padding: '6px 12px', textAlign: 'center' as const, flexShrink: 0 }}>
                    <div style={{ fontSize: 16, fontWeight: 800, color: '#fff' }}>-{fudPen}</div>
                    <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 8, color: 'rgba(255,255,255,0.8)' }}>PENALTY</div>
                  </div>
                </div>
                {redFlags.map((f: any, i: number) => (
                  <div key={i} style={{ background: '#fff', border: '1px solid #fca5a5', borderLeft: '3px solid #dc2626', borderRadius: 8, padding: '10px 14px', marginBottom: 8 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                      <span style={{ fontSize: 12 }}>{f.type === 'dump' ? '📉' : f.type === 'exploit' ? '⚡' : f.type === 'shill' ? '🤥' : f.type === 'anon' ? '👻' : '⚠️'}</span>
                      <span style={{ fontSize: 13, fontWeight: 600, color: '#dc2626', fontFamily: "'Syne',sans-serif" }}>{f.label}</span>
                    </div>
                    <div style={{ fontSize: 12, color: '#4b5563', lineHeight: 1.6 }}>{f.detail}</div>
                  </div>
                ))}
              </div>
            )}

            {redFlags.length === 0 && (
              <div style={{ background: '#f0fdf4', border: '1px solid #86efac', borderRadius: 10, padding: '10px 14px', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M22 11.08V12a10 10 0 11-5.93-9.14M22 4L12 14.01l-3-3" stroke="#16a34a" strokeWidth="2" strokeLinecap="round"/></svg>
                <span style={{ fontSize: 12, fontWeight: 600, color: '#15803d' }}>No red flags detected</span>
              </div>
            )}

            {/* Verdict Card */}
            <div style={{ background: otc.vbg, borderRadius: 18, padding: 22, marginBottom: 12, position: 'relative', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', top: -50, right: -50, width: 200, height: 200, borderRadius: '50%', background: 'rgba(255,255,255,0.05)', pointerEvents: 'none' }} />
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(255,255,255,0.2)', border: '1px solid rgba(255,255,255,0.3)', borderRadius: 20, padding: '5px 14px 5px 6px', marginBottom: 14 }}>
                {userPhoto ? <img src={userPhoto} alt="" style={{ width: 28, height: 28, borderRadius: '50%', objectFit: 'cover', border: '1.5px solid rgba(255,255,255,0.5)' }} /> : <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'rgba(255,255,255,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: '#fff' }}>{userName ? userName.charAt(0).toUpperCase() : 'C'}</div>}
                <span style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>{userName || 'CMV'} says {otc.v.toLowerCase()} {otc.emoji}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16, marginBottom: 14 }}>
                <div style={{ width: 54, height: 54, borderRadius: 14, overflow: 'hidden', background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, border: '2px solid rgba(255,255,255,0.3)' }}>
                  {xData?.profile_image_url ? <img src={xData.profile_image_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <span style={{ fontSize: 24, fontWeight: 800, color: '#fff' }}>{(result.project_name||'?').charAt(0).toUpperCase()}</span>}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' as const, marginBottom: 2 }}>
                    <span style={{ fontSize: 20, fontWeight: 800, color: '#fff', fontFamily: "'Syne',sans-serif" }}>{result.project_name || ''}</span>
                    {cgData?.token_live && cgData.ticker && <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 10, color: 'rgba(255,255,255,0.85)', background: 'rgba(255,255,255,0.15)', padding: '2px 8px', borderRadius: 5 }}>{cgData.ticker} {cgData.token_price}</span>}
                  </div>
                  <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 9, color: 'rgba(255,255,255,0.65)' }}>{result.project_category || 'Crypto'}</div>
                </div>
                <div style={{ textAlign: 'right' as const, flexShrink: 0 }}>
                  <div style={{ fontSize: 48, fontWeight: 800, color: '#fff', lineHeight: 1, fontFamily: "'Syne',sans-serif" }}>{result.overall_score ?? 0}</div>
                  <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 8, color: 'rgba(255,255,255,0.65)' }}>ALPHA SCORE</div>
                  <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 9, color: '#fff', background: 'rgba(255,255,255,0.2)', borderRadius: 20, padding: '2px 8px', display: 'inline-block', marginTop: 3 }}>{ot} · {otc.lbl}</div>
                </div>
              </div>
              {goodHighlights.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap' as const, gap: 6, marginBottom: 12 }}>
                  {goodHighlights.slice(0, 3).map((h: string, i: number) => <div key={i} style={{ background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.25)', borderRadius: 20, padding: '4px 12px', fontSize: 11, fontWeight: 600, color: '#fff' }}>✓ {h}</div>)}
                </div>
              )}
              <div style={{ background: 'rgba(0,0,0,0.15)', borderRadius: 12, padding: '14px 16px', marginBottom: 14, border: '1px solid rgba(255,255,255,0.12)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <span style={{ fontSize: 22 }}>{otc.emoji}</span>
                  <span style={{ fontSize: 22, fontWeight: 800, color: '#fff', fontFamily: "'Syne',sans-serif" }}>{otc.v}</span>
                </div>
                <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.92)', lineHeight: 1.65 }}>{result.verdict_action || result.verdict_reason}</div>
              </div>
              {result.data_accuracy_note && (
                <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 9, color: 'rgba(255,255,255,0.45)', marginBottom: 10 }}>ℹ {result.data_accuracy_note}</div>
              )}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                <button onClick={downloadCard} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(255,255,255,0.2)', border: '1px solid rgba(255,255,255,0.35)', borderRadius: 20, padding: '8px 16px', fontFamily: 'inherit', fontSize: 13, fontWeight: 600, color: '#fff', cursor: 'pointer' }}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3"/></svg>Download
                </button>
                <button onClick={shareResult} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(255,255,255,0.2)', border: '1px solid rgba(255,255,255,0.35)', borderRadius: 20, padding: '8px 18px', fontFamily: 'inherit', fontSize: 13, fontWeight: 600, color: '#fff', cursor: 'pointer' }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8M16 6l-4-4-4 4M12 2v13" /></svg>Share to X
                </button>
              </div>
            </div>

            {/* Score Section */}
            <div className="grid-score" style={{ display: 'grid', gridTemplateColumns: '150px 1fr', gap: 10, marginBottom: 10 }}>
              <div style={{ background: '#fff', border: '1px solid #f1f5f9', borderRadius: 14, padding: 16, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 8, color: '#9ca3af', letterSpacing: 1 }}>ALPHA SCORE</div>
                <div style={{ fontSize: 56, fontWeight: 800, color: otc.solid, lineHeight: 1, fontFamily: "'Syne',sans-serif" }}>{result.overall_score ?? 0}</div>
                <div style={{ background: otc.bg, border: `1px solid ${otc.border}`, borderRadius: 20, padding: '4px 12px', fontFamily: "'DM Mono',monospace", fontSize: 9, color: otc.tc }}>{ot} · {otc.lbl}</div>
                {xData?.cmv_score ? <div style={{ background: '#f8faff', border: '1px solid #e5e7eb', borderRadius: 8, padding: '8px 10px', width: '100%', textAlign: 'center' as const }}><div style={{ fontFamily: "'DM Mono',monospace", fontSize: 8, color: '#9ca3af' }}>CMV X SCORE</div><div style={{ fontSize: 18, fontWeight: 700, color: '#111', fontFamily: "'Syne',sans-serif" }}>{xData.cmv_score}<span style={{ fontSize: 10, color: '#9ca3af' }}>/1000</span></div></div> : null}
              </div>
              <div style={{ background: '#fff', border: '1px solid #f1f5f9', borderRadius: 14, padding: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, flexWrap: 'wrap' as const }}>
                  <span style={{ fontSize: 18, fontWeight: 700, color: '#111', fontFamily: "'Syne',sans-serif" }}>{result.project_name || ''}</span>
                  {cgData?.token_live && cgData.ticker && <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 9, color: '#3b5bdb', background: '#eff6ff', border: '1px solid #bfdbfe', padding: '2px 7px', borderRadius: 4 }}>{cgData.ticker} {cgData.token_price}</span>}
                  {!cgData?.token_live && <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 9, color: '#9ca3af', background: '#f1f5f9', padding: '2px 7px', borderRadius: 4 }}>No Token</span>}
                </div>
                {result.team_location && <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 9, color: '#9ca3af', marginBottom: 6 }}>📍 {result.team_location}{result.founded ? ` · Est. ${result.founded}` : ''}</div>}
                <div style={{ fontSize: 12, color: '#6b7280', lineHeight: 1.6, marginBottom: 8 }}>{result.description || ''}</div>
                {goodHighlights.length > 0 && <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' as const }}>{goodHighlights.map((h: string, i: number) => <span key={i} style={{ fontSize: 10, background: '#f0fdf4', color: '#16a34a', border: '1px solid #86efac', borderRadius: 20, padding: '2px 8px' }}>✓ {h}</span>)}</div>}
              </div>
            </div>

            {result.score_rationale && (
              <div style={{ background: '#fff', border: '1px solid #f1f5f9', borderLeft: '3px solid #16a34a', borderRadius: 0, padding: '12px 14px', marginBottom: 10 }}>
                <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 8, color: '#16a34a', letterSpacing: 1, marginBottom: 4 }}>WHY THIS SCORE</div>
                <div style={{ fontSize: 12, color: '#6b7280', lineHeight: 1.7 }}>{result.score_rationale}</div>
              </div>
            )}

            {(result.top_risks?.length > 0 || result.top_opportunities?.length > 0) && (
              <div className="grid-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
                <div style={{ background: '#fff', border: '1px solid #f1f5f9', borderRadius: 14, padding: 14 }}>
                  <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 8, color: '#dc2626', letterSpacing: 1, marginBottom: 8 }}>TOP RISKS</div>
                  {(result.top_risks || []).filter((x: string) => x).map((x: string, i: number) => <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 6 }}><span style={{ color: '#fca5a5', flexShrink: 0 }}>•</span><span style={{ fontSize: 11, color: '#6b7280', lineHeight: 1.5 }}>{x}</span></div>)}
                </div>
                <div style={{ background: '#fff', border: '1px solid #f1f5f9', borderRadius: 14, padding: 14 }}>
                  <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 8, color: '#16a34a', letterSpacing: 1, marginBottom: 8 }}>OPPORTUNITIES</div>
                  {(result.top_opportunities || []).filter((x: string) => x).map((x: string, i: number) => <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 6 }}><span style={{ color: '#86efac', flexShrink: 0 }}>•</span><span style={{ fontSize: 11, color: '#6b7280', lineHeight: 1.5 }}>{x}</span></div>)}
                </div>
              </div>
            )}

            {result.team_members?.filter((m: any) => m.name?.length > 1).length > 0 && (
              <div style={{ background: '#fff', border: '1px solid #f1f5f9', borderRadius: 14, padding: 14, marginBottom: 10 }}>
                <div style={{ fontFamily: "'Syne',sans-serif", fontSize: 13, fontWeight: 600, color: '#111', marginBottom: 10 }}>👥 Team</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(220px,1fr))', gap: 8 }}>
                  {result.team_members.filter((m: any) => m.name?.length > 1).map((m: any, i: number) => <TeamCardEnriched key={i} member={m} />)}
                </div>
              </div>
            )}

            <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' as const, marginBottom: 10 }}>
              {[{ id: 'metrics', l: '📊 Metrics' }, { id: 'mindshare', l: '🧠 Mindshare' }, { id: 'risks', l: '⚠️ Risks' }].map(sec => (
                <button key={sec.id} onClick={() => setAsec(sec.id)} style={{ padding: '7px 16px', borderRadius: 8, border: `1px solid ${asec === sec.id ? '#16a34a' : '#e5e7eb'}`, background: asec === sec.id ? '#16a34a' : '#fff', color: asec === sec.id ? '#fff' : '#6b7280', fontSize: 12, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.15s' }}>{sec.l}</button>
              ))}
            </div>

            {asec === 'metrics' && result.metrics && (
              <div style={{ background: '#fff', border: '1px solid #f1f5f9', borderRadius: 14, padding: 14, marginBottom: 10 }}>
                {Object.entries(result.metrics).map(([key, data]: [string, any]) => (
                  <div key={key} className="metric-row" style={{ border: '1px solid #f1f5f9', borderRadius: 8, padding: '10px 12px', marginBottom: 4, background: '#fff' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: 12, fontWeight: 500, color: '#374151', textTransform: 'capitalize' as const }}>{key.replace(/_/g,' ')}</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ width: 80, height: 4, background: '#f1f5f9', borderRadius: 2, overflow: 'hidden' }}><div style={{ width: (data.score || 0) + '%', height: '100%', background: data.score >= 70 ? '#16a34a' : data.score >= 50 ? '#f59f00' : '#dc2626', borderRadius: 2 }} /></div>
                        <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 11, fontWeight: 600, color: data.score >= 70 ? '#16a34a' : data.score >= 50 ? '#f59f00' : '#dc2626', minWidth: 28, textAlign: 'right' as const }}>{data.score}</span>
                      </div>
                    </div>
                    {data.summary && <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 4 }}>{data.summary}</div>}
                  </div>
                ))}
              </div>
            )}

            {asec === 'mindshare' && (
              <div style={{ background: '#fff', border: '1px solid #f1f5f9', borderRadius: 14, padding: 14, marginBottom: 10 }}>
                <div style={{ fontFamily: "'Syne',sans-serif", fontSize: 13, fontWeight: 600, color: '#111', marginBottom: 8 }}>Mindshare</div>
                <canvas ref={canvasRef} style={{ width: '100%', height: 110 }} />
              </div>
            )}

            {asec === 'risks' && (
              <div className="grid-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
                <div style={{ background: '#fff', border: '1px solid #f1f5f9', borderRadius: 14, padding: 14 }}>
                  <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 8, color: '#dc2626', letterSpacing: 1, marginBottom: 8 }}>TOP RISKS</div>
                  {(result.top_risks || []).filter((x: string) => x).map((x: string, i: number) => <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 6 }}><span style={{ color: '#fca5a5' }}>•</span><span style={{ fontSize: 11, color: '#6b7280', lineHeight: 1.5 }}>{x}</span></div>)}
                </div>
                <div style={{ background: '#fff', border: '1px solid #f1f5f9', borderRadius: 14, padding: 14 }}>
                  <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 8, color: '#16a34a', letterSpacing: 1, marginBottom: 8 }}>OPPORTUNITIES</div>
                  {(result.top_opportunities || []).filter((x: string) => x).map((x: string, i: number) => <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 6 }}><span style={{ color: '#86efac' }}>•</span><span style={{ fontSize: 11, color: '#6b7280', lineHeight: 1.5 }}>{x}</span></div>)}
                </div>
              </div>
            )}

            <div style={{ textAlign: 'center' as const, fontFamily: "'DM Mono',monospace", fontSize: 9, color: '#9ca3af', letterSpacing: 1, paddingTop: 16 }}>CMV ALPHASCANNER · POWERED BY DEFILLAMA, ROOTDATA, DEXSCREENER, CRYPTONEWS & X API</div>
          </div>
        )}

        {!loading && !result && !error && (
          <div style={{ border: '1.5px dashed #86efac', borderRadius: 14, padding: '48px 24px', textAlign: 'center' as const, background: 'rgba(255,255,255,0.7)' }}>
            <div style={{ fontSize: 32, marginBottom: 10 }}>🔭</div>
            <div style={{ fontSize: 14, fontWeight: 600, color: '#6b7280', marginBottom: 4, fontFamily: "'Syne',sans-serif" }}>No project scanned yet</div>
            <div style={{ fontSize: 12, color: '#9ca3af' }}>Paste any crypto project X URL or handle above.</div>
          </div>
        )}
      </div>
    </div>
  )
}
