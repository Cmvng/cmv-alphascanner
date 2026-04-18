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
  S: { bg: '#f5f3ff', border: '#c4b5fd', tc: '#6d28d9', solid: '#7c3aed', lbl: 'S · Alpha', v: 'ALPHA PLAY', sub: 'Rare conviction. Go all in.', target: 'Top 5%', vbg: 'linear-gradient(135deg,#7c3aed,#6d28d9)', emoji: '⚡', range: '950-1000' },
  A: { bg: '#ebfbee', border: '#8ce99a', tc: '#2f9e44', solid: '#37b24d', lbl: 'A · Farm It', v: 'FARM IT', sub: 'High conviction play. Go hard.', target: 'Top 30%', vbg: 'linear-gradient(135deg,#37b24d,#2f9e44)', emoji: '🌾', range: '850-949' },
  B: { bg: '#fff3bf', border: '#ffe066', tc: '#e67700', solid: '#f59f00', lbl: 'B · Watch It', v: 'ENGAGE', sub: 'Solid project, be selective.', target: 'Top 20%', vbg: 'linear-gradient(135deg,#f59f00,#e67700)', emoji: '✍️', range: '600-849' },
  C: { bg: '#fff4e6', border: '#ffc078', tc: '#d9480f', solid: '#e8590c', lbl: 'C · Observe', v: 'OBSERVE', sub: 'Too many uncertainties. Watch only.', target: 'Top 10%', vbg: 'linear-gradient(135deg,#e8590c,#d9480f)', emoji: '👁️', range: '350-599' },
  D: { bg: '#f1f3f5', border: '#dee2e6', tc: '#495057', solid: '#868e96', lbl: 'D · Avoid', v: 'AVOID', sub: 'Too many red flags. Not worth your time.', target: '', vbg: 'linear-gradient(135deg,#868e96,#495057)', emoji: '🚫', range: '0-349' },
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

function getTier(s: number) { return s >= 95 ? 'S' : s >= 85 ? 'A' : s >= 60 ? 'B' : s >= 35 ? 'C' : 'D' }

function computeCombinedScore(alphaScore: number, xScore: number) {
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
  return `<div style="width:${sz}px;height:${sz}px;background:${T[tier].solid};border-radius:${sz > 20 ? 6 : 4}px;display:flex;align-items:center;justify-content:center;font-family:'JetBrains Mono',monospace;font-size:${sz > 20 ? 12 : 9}px;font-weight:500;color:#fff;flex-shrink:0">${tier}</div>`
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
    <div className="team-card">
      <div onClick={() => { if (cleanHandle) window.open('https://x.com/' + cleanHandle, '_blank', 'noopener,noreferrer') }} style={{ flexShrink: 0, cursor: cleanHandle ? 'pointer' : 'default' }}>
        {!err && imgSrc ? <img src={imgSrc} alt={member.name} className="team-avatar" onError={() => setErr(true)} /> : <div className="team-avatar-fallback">{ini}</div>}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' as const, marginBottom: 2 }}>
          <span onClick={() => { if (cleanHandle) window.open('https://x.com/' + cleanHandle, '_blank', 'noopener,noreferrer') }} className="team-name" style={{ cursor: cleanHandle ? 'pointer' : 'default', textDecoration: cleanHandle ? 'underline' : 'none' }}>{member.name}</span>
          {!member.confirmed && <span className="tag-warn">unconfirmed</span>}
          {xProfile?.verified && <span className="tag-ok">✓</span>}
        </div>
        <div className="team-meta">
          {member.role}{cleanHandle ? ` · @${cleanHandle}` : ''}
          {xProfile?.followers ? <span style={{ color: 'var(--text-4)', marginLeft: 6 }}>{xProfile.followers >= 1000 ? `${(xProfile.followers/1000).toFixed(0)}K` : xProfile.followers} followers</span> : null}
        </div>
        {member.background && <div className="team-bg">{member.background}</div>}
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

const buildSystemPrompt = (handle: string, xd: any, cg: any) => {
  const enriched = xd?.enriched || {}
  return `You are CMV AlphaScanner, a sharp crypto/Web3 alpha analyst. Today: ${new Date().toDateString()}.

CRITICAL: Return ONLY valid JSON. No markdown, no explanation, no code blocks.

You have pre-fetched data from multiple tools. Use it directly — do NOT search for data already provided below.

=== VERIFIED TOOL DATA ===
X Profile: ${xd?.followers || 0} followers, ${xd?.tweet_count || 0} tweets, ${xd?.account_age_years || 0}y old account, verified: ${xd?.verified || false}
Bio: ${xd?.description || 'none'}
Avg likes: ${xd?.avg_likes || 0} | Category: ${xd?.category || 'unknown'}
Confirmed ticker: ${xd?.confirmed_ticker || 'none'} | Token hinted: ${xd?.token_launch_hinted || false}

DefiLlama: TVL=${enriched.tvl || 'none'} | Revenue/day=${enriched.revenue_24h || 'none'} | Fees/day=${enriched.fees_24h || 'none'} | Raised=${enriched.total_raised_defillama || 'none'} | Category=${enriched.defillama_category || 'none'} | Chains=${JSON.stringify(enriched.chains || [])}
Hacks: ${JSON.stringify(enriched.known_hacks || [])}

RootData: Raised=${enriched.total_raised_rootdata || 'none'} | Investors=${JSON.stringify(enriched.confirmed_investors || [])} | Team=${JSON.stringify((enriched.rootdata_team || []).map((t:any) => ({name:t.name, role:t.role, x:t.x_handle})))}

Token: ${cg?.token_live ? 'LIVE — ' + (cg.ticker || '') + ' at ' + (cg.token_price || '') + ' | mcap=' + (cg.market_cap_str || 'unknown') + ' | vol24h=' + (cg.volume_24h || 'unknown') + ' | change24h=' + (cg.price_change_24h || 0) + '%' : 'NOT YET LAUNCHED — no confirmed token on any DEX'}

CryptoNews: sentiment=${enriched.news_sentiment || 'unknown'} | articles=${enriched.news_article_count || 0} | red flags=${JSON.stringify(enriched.news_red_flags || [])}

CryptoRank: ${enriched.best_vc_tier ? `Best VC Tier=${enriched.best_vc_tier} | Tier 1 VCs=${JSON.stringify(enriched.tier1_vcs || [])} | Tier 2 VCs=${JSON.stringify(enriched.tier2_vcs || [])} | Lead Investors=${JSON.stringify(enriched.lead_investors || [])} | Total Investors=${enriched.total_investor_count || 0} | Raised=${enriched.total_raised_cryptorank || 'unknown'} | Valuation=${enriched.last_valuation || 'unknown'} | Funding Rounds=${JSON.stringify((enriched.funding_rounds || []).slice(0,4))} | Token Unlocks=${enriched.has_unlock_data ? 'Next: ' + (enriched.next_unlock_date || 'unknown') + ' (' + (enriched.next_unlock_pct || 'unknown') + ')' : 'No data'} | Vesting Warning=${enriched.vesting_warning || 'none'} | Airdrop=${enriched.airdrop_confirmed ? enriched.airdrop_details || 'Confirmed' : 'none'}` : 'Not found on CryptoRank'}

Auto-detected FUD signals (from tools): ${JSON.stringify((enriched.auto_fud_flags || []).map((f:any) => ({label: f.label, detail: f.detail, severity: f.severity})))}

=== INSTRUCTIONS ===
DO NOT search for: TVL, revenue, token price, investors, funding — all provided above.
VERDICT GUIDE — pick the verdict that matches the category AND quality:
- ALPHA PLAY (score 95+): Exceptional fundamentals, no red flags, top-tier everything
- FARM IT (score 85-94): Strong conviction, go hard
- ENGAGE (score 60-84): Solid but selective. Tailor action to category:
  * DeFi/Lending: Deposit and farm yield
  * Perp DEX: Test trading features and liquidity
  * Prediction Market: Explore predictions, farm points
  * L1/L2: Bridge, transact, run node if possible
  * AI/Infrastructure: Build something public, document it
  * Gaming/NFT: Engage community, hold floor assets
  * RWA: Long term, create educational content
- OBSERVE (score 35-59): Too many uncertainties. Watch only, do not commit
- AVOID (score 0-34): Too many red flags. Not worth time
For RED FLAGS — this is critical:
ALWAYS convert ALL auto_fud_flags listed above into red_flags entries. Every single one.
ALSO add flags for:
- Any hacks listed above → "Security exploit" flag
- Token dump detected → "Token dump" flag  
- Negative news red flags listed above → flag each one
- Low liquidity if dex_liquidity < $50K → "Low liquidity" flag
- No team data + anonymous project → "Anonymous team" flag
Do NOT return empty red_flags if auto_fud_flags has entries.
Be specific in detail — include numbers and sources.
Be concise in metrics — 1 sentence with specific data points only.

RED FLAGS — flag ALL of these when present:
- Known hacks or exploits (from DefiLlama hacks data)
- Token dump >30% in 24h (from DexScreener)
- Token pump >100% in 24h → flag as "Extreme Volatility" (speculation/manipulation risk)
- Liquidity <$50K → "Low liquidity / rug risk"
- No team data for non-anonymous project → "Unverified team"
- Negative news: scam/fraud/SEC/investigation
- Large upcoming token unlocks found in search → "Token unlock risk"
- Follow farming: following >> followers
DO NOT flag: no TVL for non-DeFi, low mindshare, early stage, no revenue pre-launch.

Score strictly. Tier A (85+) = only the best CT projects with strong fundamentals. Most projects are B or C.
Entertainment/events projects without DeFi TVL should NOT be penalized on revenue — use event revenue if mentioned.

Return this exact JSON:
{
  "project_name": "string",
  "project_category": "string (use DefiLlama category if available, else infer from bio: Prediction Market, DeFi, L1/L2, RWA, AI, Gaming, etc)",
  "description": "2-3 sentence description of what the project builds",
  "team_location": "string or empty",
  "founded": "year or empty",
  "verdict": "ALPHA PLAY|FARM IT|ENGAGE|OBSERVE|AVOID",
  "verdict_reason": "2-3 sentences with specific data points from tool data",
  "verdict_action": "specific actionable advice for CT farmers",
  "overall_score": number (0-100),
  "score_rationale": "explain score using specific tool data",
  "good_highlights": ["specific highlight with data", "another", "another"],
  "red_flags": [{"type": "dump|hack|shill|suspicious|regulatory|tokenomics|team", "label": "short label", "detail": "specific detail with source and date"}],
  "top_risks": ["specific risk", "another"],
  "top_opportunities": ["specific opportunity", "another"],
  "team_members": [{"name": "string", "role": "string", "x_handle": "@handle or empty", "background": "1 sentence", "confirmed": true/false}],
  "future_seasons": "token/season/airdrop info if any",
  "post_tge_outlook": "string if token live",
  "project_follows": "notable CT accounts that follow this project",
  "mindshare_trend": {"labels": ["8w ago","7w ago","6w ago","5w ago","4w ago","3w ago","2w ago","1w ago"], "values": [0,0,0,0,0,0,0,0], "current_pct": "string", "trend": "rising|falling|stable"},
  "sources": [{"name": "string", "url": "string", "used_for": "string"}],
  "data_accuracy_note": "string",
  "metrics": {
    "funding": {"score": 0-100, "detail": "1 sentence with specific numbers", "signal": "bullish|bearish|neutral"},
    "vc_pedigree": {"score": 0-100, "detail": "1 concise sentence with data", "signal": "bullish|bearish|neutral"},
    "copycat": {"score": 0-100, "detail": "1 concise sentence with data", "signal": "bullish|bearish|neutral"},
    "niche": {"score": 0-100, "detail": "1 concise sentence with data", "signal": "bullish|bearish|neutral"},
    "location": {"score": 0-100, "detail": "1 sentence: team location if known, why it matters", "signal": "bullish|bearish|neutral"},
    "founder_cred": {"score": 0-100, "detail": "1 concise sentence with data", "signal": "bullish|bearish|neutral"},
    "founder_activity": {"score": 0-100, "detail": "1 concise sentence with data", "signal": "bullish|bearish|neutral"},
    "top_voices": {"score": 0-100, "detail": "1 concise sentence with data", "signal": "bullish|bearish|neutral"},
    "token": {"score": 0-100, "detail": "state if live or not, include price/mcap/volume if live", "signal": "bullish|bearish|neutral"},
    "metrics_clarity": {"score": 0-100, "detail": "1 concise sentence with data", "signal": "bullish|bearish|neutral"},
    "user_count": {"score": 0-100, "detail": "1 concise sentence with data", "signal": "bullish|bearish|neutral"},
    "fud": {"score": 0-100, "detail": "1 concise sentence with data", "signal": "bullish|bearish|neutral"},
    "notable_mentions": {"score": 0-100, "detail": "1 concise sentence with data", "signal": "bullish|bearish|neutral"},
    "content_type": {"score": 0-100, "detail": "1 concise sentence with data", "signal": "bullish|bearish|neutral"},
    "mindshare": {"score": 0-100, "detail": "1 concise sentence with data", "signal": "bullish|bearish|neutral"},
    "revenue": {"score": 0-100, "detail": "1 concise sentence with data", "signal": "bullish|bearish|neutral"},
    "sentiment": {"score": 0-100, "detail": "1 concise sentence with data", "signal": "bullish|bearish|neutral"}
  }
}`
}

/* ─── FEATURED PROJECTS MINI COMPONENT ─── */
function FeaturedProjects() {
  const [feats, setFeats] = useState<any[]>([])
  useEffect(() => {
    (async () => {
      try {
        const url = `${import.meta.env.VITE_SUPABASE_URL}/rest/v1/scans?select=*&order=scanned_at.desc&limit=8`
        const r = await fetch(url, { headers: { 'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY, 'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}` } })
        if (r.ok) setFeats(await r.json())
      } catch {}
    })()
  }, [])
  if (feats.length === 0) return null
  const VERDICT_COLOR: Record<string, string> = { 'FARM IT': '#16a34a', 'CREATE CONTENT': '#ca8a04', 'WATCH': '#ea580c', 'SKIP': '#6b7280' }
  return (
    <div className="featured-section" style={{ animationDelay: '0.5s' }}>
      <div className="section-label">Recently Scanned</div>
      <div className="featured-grid">
        {feats.map((s: any) => (
          <a key={s.id} href={`/?q=${s.handle}`} className="feat-card">
            <div className="feat-card-inner">
              <div className="feat-logo-wrap">
                {s.profile_image_url
                  ? <img src={s.profile_image_url} alt="" className="feat-logo" onError={e => { (e.target as HTMLImageElement).style.display='none' }} />
                  : <span className="feat-logo-letter">{(s.project_name||s.handle||'?').charAt(0).toUpperCase()}</span>}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="feat-name">{s.project_name || s.handle}</div>
                <div className="feat-meta">{s.category || 'Crypto'}</div>
              </div>
              <div className="feat-score-wrap">
                <div className="feat-score" style={{ color: VERDICT_COLOR[s.verdict] || '#6b7280' }}>{s.score}</div>
              </div>
            </div>
          </a>
        ))}
      </div>
    </div>
  )
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
  const [feedLoading, setFeedLoading] = useState(() => !!new URLSearchParams(window.location.search).get('q'))
  const { name: userName, photo: userPhoto, save: saveProfile } = useProfile()
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const pint = useRef<any>(null)
  const tint = useRef<any>(null)
  const mint = useRef<any>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => { setTempName(userName); setTempPhoto(userPhoto) }, [userName, userPhoto])

  // Coming from feed OR page refresh — restore last scan
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const q = params.get('q')

    // Determine which handle to load — only from ?q= (feed click)
    let handle = ''
    if (q) {
      handle = q.toLowerCase()
      window.history.replaceState({}, '', '/')
    }

    if (!handle) { setFeedLoading(false); return }

    setXUrl('https://x.com/' + handle)
    const cacheKey = 'cmv_scan_v4_' + handle

    async function loadFromCache() {
      let cr: any = null, cc: any = null, cx: any = null

      try {
        const cached = localStorage.getItem(cacheKey) || 
                       localStorage.getItem('cmv_scan_v3_' + handle) ||
                       localStorage.getItem('cmv_scan_v2_' + handle)
        if (cached) {
          const parsed = JSON.parse(cached)
          if (parsed.result) { cr = parsed.result; cc = parsed.cgData; cx = parsed.xData }
        }
      } catch {}

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

      if (!cr) {
        // Only auto-analyze if coming from feed (?q=), not on page refresh
        if (q) analyze()
        setFeedLoading(false)
        return
      }

      setResult(cr)
      setCgData(cc)
      setXData(cx)
      setFeedLoading(false)
      fetchProjectXData(handle).then(freshXd => { if (freshXd) setXData(freshXd) }).catch(() => {})
    }

    loadFromCache()
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
    (trend.labels || []).forEach((l: string, i: number) => { ctx.fillStyle = '#adb5bd'; ctx.font = "9px 'JetBrains Mono'"; ctx.textAlign = 'center'; ctx.fillText(l, pts[i].x, h - 6) })
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
    const rawHandle = url.replace('https://x.com/', '').replace('https://twitter.com/', '').replace('http://x.com/', '').replace('@', '').split('/')[0].trim()
    const handle = rawHandle.replace(/[^a-zA-Z0-9_]/g, '')
    if (!handle) return
    if (handle.toLowerCase() !== rawHandle.toLowerCase()) {
      console.warn('Handle sanitized:', rawHandle, '→', handle)
    }
    const cacheKey = `cmv_scan_v4_${handle.toLowerCase()}`
    try { localStorage.removeItem(`cmv_scan_v3_${handle.toLowerCase()}`); localStorage.removeItem(`cmv_scan_v2_${handle.toLowerCase()}`); localStorage.removeItem(`cmv_scan_${handle.toLowerCase()}`) } catch {}
    setLoading(true); setResult(null); setCgData(null); setXData(null); setError(null); setAtab('Fundamentals'); setAsec('metrics'); setSelectedTags([])

    // Check cache — serve cached result unless admin deleted from Supabase
    try {
      const cached = localStorage.getItem(cacheKey)
      if (cached) {
        const { result: cr, cgData: cc, xData: cx } = JSON.parse(cached)
        const hasFullMetrics = cr?.metrics?.vc_pedigree || cr?.metrics?.founder_cred

        if (hasFullMetrics) {
          // Check if admin deleted this scan from Supabase
          let adminDeleted = false
          try {
            const sbUrl = import.meta.env.VITE_SUPABASE_URL
            const sbKey = import.meta.env.VITE_SUPABASE_ANON_KEY
            if (sbUrl && sbKey) {
              const check = await fetch(sbUrl + '/rest/v1/scans?handle=eq.' + handle.toLowerCase() + '&select=id&limit=1', {
                headers: { 'apikey': sbKey, 'Authorization': 'Bearer ' + sbKey }
              })
              if (check.ok) {
                const rows = await check.json()
                if (rows.length === 0) adminDeleted = true
              }
            }
          } catch {}

          if (adminDeleted) {
            try { localStorage.removeItem(cacheKey) } catch {}
          } else {
            setResult(cr); setCgData(cc); setXData(cx); setLoading(false); return
          }
        }
      }
    } catch { }
    let xd: any = null
    try {
      xd = await fetchProjectXData(handle)
    } catch (xErr) {
      console.warn('X API fetch failed:', xErr)
    }

    if (!xd && !handle) {
      setError('Unable to reach X API. Please try again.')
      setLoading(false)
      return
    }

    if (xd && !xd.partial && xd.followers > 0) {
      const bio = (xd.description || '').toLowerCase()
      const cryptoSignals = ['crypto','web3','defi','blockchain','token','nft','dao','airdrop','chain','protocol','dex','yield','stake','wallet','btc','eth','sol','base','layer']
      const hasCryptoSignal = cryptoSignals.some(s => bio.includes(s)) || 
                              xd.confirmed_ticker || 
                              xd.token_launch_hinted ||
                              (xd.enriched?.total_raised_rootdata) ||
                              (xd.enriched?.tvl)
      if (!hasCryptoSignal && xd.followers > 5000) {
        setError('not_crypto')
        setLoading(false)
        return
      }
    }

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

    if (xd?.token_data?.token_live) {
      cg = xd.token_data
    }

    if (!cg) cg = { token_live: false, token_price: 'Not Launched', token_note: 'No token found' }
    setCgData(cg)
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


    const xOnlyScan = () => {
      const enriched = xd?.enriched || {}

      const hasXData = (xd?.followers || 0) > 0 || (xd?.tweet_count || 0) > 0
      const hasToolData = !!(enriched.tvl || enriched.total_raised_rootdata ||
        enriched.total_raised_defillama || enriched.dex_volume_24h ||
        (enriched.confirmed_investors || []).length > 0 ||
        (enriched.rootdata_team || []).length > 0)

      const autoFlags = enriched.auto_fud_flags || []
      const followers = xd?.followers || 0
      const following = xd?.following || 0
      const listed = xd?.listed || 0
      const tweetCount = xd?.tweet_count || 0
      const accountAge = xd?.account_age_years || 0
      const avgLikes = xd?.avg_likes || 0
      const verified = xd?.verified || false
      const cmvXScore = xd?.cmv_score || 0

      const hasRaised = enriched.total_raised_rootdata || enriched.total_raised_defillama || enriched.total_raised_cryptorank
      const investors = enriched.confirmed_investors || []
      // CryptoRank VC tier data (11K+ funds classified)
      const crTier1 = enriched.tier1_vcs || []
      const crTier2 = enriched.tier2_vcs || []
      const crLeads = enriched.lead_investors || []
      const bestTier = enriched.best_vc_tier || null
      const topVCs = ['paradigm','a16z','andreessen','coinbase ventures','polychain','multicoin','pantera','sequoia','dragonfly','binance labs','binance','animoca','electric capital','framework ventures','jump crypto','delphi digital','galaxy digital','hashkey','okx ventures','circle']
      const tier2VCs = ['blockchain capital','robot ventures','maelstrom','hashed','hack vc','dao5','variant','1kx','placeholder','iosg','spartan','mechanism capital','amber group','wintermute','gsr','cms holdings','alameda','three arrows','digital currency group','dcg','grayscale','bitfinex','huobi','kucoin','gate','bybit','maven 11','nascent','north island','coinfund','distributed global','arrington','galaxy','svn','standard crypto','castle island']
      const matchedTier1 = crTier1.length > 0 ? crTier1 : investors.filter((v: string) => topVCs.some(vc => v.toLowerCase().includes(vc)))
      const matchedTier2 = crTier2.length > 0 ? crTier2 : investors.filter((v: string) => tier2VCs.some(vc => v.toLowerCase().includes(vc)))
      const hasTopVC = matchedTier1.length > 0
      const hasTier2VC = matchedTier2.length > 0
      const fundingScore = bestTier === 1 ? 95 : bestTier === 2 ? 80 : hasTopVC ? 90 : hasTier2VC ? 78 : bestTier === 3 ? 65 : investors.length > 3 ? 70 : hasRaised ? 60 : bestTier === 4 ? 50 : investors.length > 0 ? 45 : 25

      const tvl = enriched.tvl
      const revenue = enriched.revenue_24h
      const fees = enriched.fees_24h
      const tvlNum = tvl ? (tvl.includes('B') ? parseFloat(tvl)*1e9 : tvl.includes('M') ? parseFloat(tvl)*1e6 : parseFloat(tvl)*1e3) : 0
      const hasRevenue = !!(enriched.revenue_24h || enriched.fees_24h)
      const revenueScore = enriched.revenue_24h ? 
        (enriched.revenue_24h.includes('M') ? 95 : enriched.revenue_24h.includes('K') ? 75 : 60) : 
        enriched.fees_24h ? 
        (enriched.fees_24h.includes('M') ? 85 : enriched.fees_24h.includes('K') ? 65 : 55) : 
        tvlNum > 1e9 ? 85 : tvlNum > 1e8 ? 75 : tvlNum > 1e7 ? 65 : tvlNum > 1e6 ? 55 : tvlNum > 0 ? 40 : 15

      const dexDump = enriched.dex_dump_detected
      const dexLiq = enriched.dex_liquidity
      const tokenLive = cg?.token_live || xd?.token_data?.token_live
      const dexToken = xd?.token_data
      const tokenScore = dexDump ? 10 : 
        (tokenLive && dexLiq) ? (dexLiq.includes('M') ? 80 : dexLiq.includes('K') ? 60 : 40) : 
        tokenLive ? 55 :
        xd?.token_launch_hinted ? 50 : 35

      const hasRealXData = followers > 0 || tweetCount > 0
      const followerScore = !hasRealXData ? 50 : followers > 500000 ? 95 : followers > 100000 ? 85 : followers > 50000 ? 75 : followers > 10000 ? 60 : followers > 5000 ? 45 : 25
      const engagementScore = !hasRealXData ? 50 : avgLikes > 1000 ? 90 : avgLikes > 500 ? 75 : avgLikes > 100 ? 60 : avgLikes > 20 ? 45 : 20

      const team = (enriched.rootdata_team || []).filter((t: any) => t.name && t.name.length > 1)
      const teamScore = team.length > 4 ? 90 : team.length > 2 ? 75 : team.length > 0 ? 65 : verified ? 55 : accountAge > 3 ? 50 : 30

      const sentiment = enriched.news_sentiment
      const sentimentScore = sentiment === 'positive' ? 80 : sentiment === 'neutral' ? 60 : sentiment === 'negative' ? 25 : 50

      const hacks = enriched.known_hacks || []
      const securityScore = hacks.length > 0 ? 10 : tvlNum > 0 ? 75 : 55

      let fudPenalty = 0
      autoFlags.forEach((f: any) => {
        if (f.severity === 'high') fudPenalty += 100
        else if (f.severity === 'medium') fudPenalty += 50
        else fudPenalty += 25
      })
      fudPenalty = Math.min(fudPenalty, 300)

      const weights = { funding: 0.25, revenue: 0.22, token: 0.14, team: 0.15, sentiment: 0.10, security: 0.08, follower: 0.03, engagement: 0.03 }
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
      const combined = Math.round(rawScore * 0.6 + (cmvXScore / 10) * 0.4)
      const finalScore = Math.max(0, Math.min(100, combined - Math.round(fudPenalty / 10)))

      const hasHack = hacks.length > 0
      const hasDump = enriched.dex_dump_detected
      const cappedScore = hasHack ? Math.min(finalScore, 35) : hasDump ? Math.min(finalScore, 45) : finalScore

      const verdict = cappedScore >= 95 ? 'ALPHA PLAY' : cappedScore >= 85 ? 'FARM IT' : cappedScore >= 60 ? 'ENGAGE' : cappedScore >= 35 ? 'OBSERVE' : 'AVOID'

      const highlights: string[] = []
      if (hasRaised) highlights.push(`${enriched.total_raised_cryptorank || enriched.total_raised_rootdata || enriched.total_raised_defillama} raised`)
      if (hasTopVC) highlights.push(`Tier 1 VC backed: ${matchedTier1.slice(0,2).join(', ')}`)
      else if (hasTier2VC) highlights.push(`Tier 2 VC backed: ${matchedTier2.slice(0,2).join(', ')}`)
      if (tvl) highlights.push(`${tvl} TVL deployed`)
      if (revenue) highlights.push(`${revenue} daily revenue`)
      if (hasRealXData && followers > 10000) highlights.push(`${(followers/1000).toFixed(0)}K X followers`)
      if (team.length > 0) highlights.push(`${team.length} verified team members`)
      if (verified) highlights.push('Verified X account')
      if (enriched.chains?.length > 0) highlights.push(`Live on ${enriched.chains.slice(0,2).join(', ')}`)
      if (enriched.airdrop_confirmed) highlights.push('Airdrop signals detected')
      if (enriched.vesting_warning) highlights.push(`⚠️ ${enriched.vesting_warning}`)

      const parts: string[] = []
      if (enriched.defillama_category) parts.push(`${enriched.defillama_category} project`)
      if (hasRaised && hasTopVC) parts.push(`Backed by tier 1 VCs including ${matchedTier1[0]}`)
      else if (hasRaised && hasTier2VC) parts.push(`Backed by tier 2 VCs including ${matchedTier2[0]}`)
      else if (hasRaised) parts.push(`Has raised ${enriched.total_raised_rootdata || enriched.total_raised_defillama}`)
      if (tvl) parts.push(`${tvl} TVL showing real capital deployment`)
      if (revenue) parts.push(`Generating ${revenue} in daily revenue`)
      if (hasRealXData && followers > 10000) parts.push(`Strong X presence with ${(followers/1000).toFixed(0)}K followers`)
      if (hacks.length > 0) parts.push(`WARNING: ${hacks.length} known security exploit(s) on record`)
      if (dexDump) parts.push(`Token showing significant price decline`)
      if (autoFlags.length > 0) parts.push(`${autoFlags.length} automated red flag(s) detected`)
      if (sentiment === 'negative') parts.push('Negative news sentiment detected')

      const verdictReason = parts.length > 0 ? parts.join('. ') + '.' : `Based on available data: ${followers.toLocaleString()} followers, ${accountAge.toFixed(1)} year old account.`

      const categoryLabel = enriched.defillama_category || xd?.category || 'Crypto'
      const verdictAction: Record<string, string> = {
        'ALPHA PLAY': 'Exceptional fundamentals across all metrics. Rare conviction play — go all in.',
        'FARM IT': 'Strong fundamentals confirmed. Actively farm and create content around this project.',
        'ENGAGE': 'Solid project. Engage selectively based on the category — explore features, create content.',
        'OBSERVE': 'Too many uncertainties. Observe only — do not commit time or capital yet.',
        'AVOID': 'Too many red flags detected. Not worth your time right now.'
      }

      const cleaned = {
        project_name: xd?.name || handle,
        ticker: cg?.ticker || xd?.confirmed_ticker || null,
        description: xd?.description || '',
        team_location: '',
        founded: '',
        project_category: enriched.defillama_category || xd?.category || 'Crypto',
        verdict: verdict,
        verdict_reason: verdictReason,
        verdict_action: verdictAction[verdict],
        overall_score: cappedScore,
        score_rationale: (() => {
          const pts: string[] = []
          if (hasRaised) pts.push(`Raised ${enriched.total_raised_rootdata || enriched.total_raised_defillama} from ${investors.length} investor${investors.length > 1 ? 's' : ''}${hasTopVC ? ' including tier 1 VCs' : hasTier2VC ? ' including tier 2 VCs' : ''}`)
          if (tvl) pts.push(`${tvl} in TVL deployed`)
          if (enriched.revenue_24h) pts.push(`generating ${enriched.revenue_24h} daily revenue`)
          if (hasRealXData && followers > 10000) pts.push(`${(followers/1000).toFixed(0)}K community following`)
          if (team.length > 0) pts.push(`${team.length} identified team members`)
          if (autoFlags.length > 0) pts.push(`${autoFlags.length} red flag${autoFlags.length > 1 ? 's' : ''} detected (score penalty applied)`)
          if (hacks.length > 0) pts.push(`${hacks.length} security incident${hacks.length > 1 ? 's' : ''} on record`)
          return pts.length > 0 ? pts.join('. ') + '.' : verdictReason
        })(),
        good_highlights: highlights.slice(0, 5),
        red_flags: autoFlags.map((f: any) => ({ type: f.type, label: f.label, detail: f.detail })),
        top_risks: [
          hacks.length > 0 ? `Security: ${hacks.length} known exploit(s)` : null,
          dexDump ? 'Token showing significant price dump' : null,
          dexLiq && dexLiq.includes('K') && !dexLiq.includes('00K') ? 'Low DEX liquidity — rug risk' : null,
          sentiment === 'negative' ? 'Negative news coverage detected' : null,
          (hasRealXData && followers < 1000) ? 'Very low social presence' : null,
        ].filter(Boolean).slice(0, 4),
        top_opportunities: [
          !tokenLive && xd?.token_launch_hinted ? 'Token not yet launched — early farming opportunity' : null,
          tvlNum > 1e8 ? `High TVL of ${tvl} showing strong ecosystem` : null,
          hasTopVC ? `Tier 1 VC backing from ${matchedTier1[0]} adds strong credibility` : hasTier2VC ? `Tier 2 VC backing from ${matchedTier2[0]}` : null,
          enriched.chains?.length > 1 ? `Multi-chain deployment on ${enriched.chains.join(', ')}` : null,
        ].filter(Boolean).slice(0, 3),
        team_members: (enriched.rootdata_team || []).filter((t: any) => t.name && t.name.length > 1).map((t: any) => ({
          name: t.name,
          role: t.role || '',
          x_handle: t.x_handle || '',
          background: enriched.coinpaprika_description ? `${enriched.coinpaprika_description.slice(0, 100)}` : '',
          confirmed: !!(t.x_handle),
        })),
        sources: [],
        data_accuracy_note: '',
        metrics: {
          funding: { score: fundingScore, detail: hasRaised ? `${enriched.total_raised_rootdata || enriched.total_raised_defillama} raised from ${investors.length} investors` : 'No confirmed funding data found', signal: fundingScore >= 70 ? 'bullish' : fundingScore <= 30 ? 'bearish' : 'neutral' },
          vc_pedigree: { score: bestTier === 1 ? 95 : bestTier === 2 ? 80 : hasTopVC ? 92 : hasTier2VC ? 72 : bestTier === 3 ? 60 : investors.length > 2 ? 55 : bestTier === 4 ? 45 : investors.length > 0 ? 40 : 0, detail: crTier1.length > 0 ? `Tier 1 VC backed: ${crTier1.slice(0,3).join(', ')}${crLeads.length > 0 ? ' (led by ' + crLeads[0] + ')' : ''}` : crTier2.length > 0 ? `Tier 2 VC backed: ${crTier2.slice(0,3).join(', ')}` : hasTopVC ? `Tier 1 VC backing: ${matchedTier1.slice(0,3).join(', ')}` : hasTier2VC ? `Tier 2 VC backing: ${matchedTier2.slice(0,3).join(', ')}` : investors.length > 0 ? `${investors.length} investors: ${investors.slice(0,3).join(', ')}` : 'No investor data found', signal: bestTier === 1 || hasTopVC ? 'bullish' : bestTier === 2 || hasTier2VC ? 'bullish' : bestTier && bestTier <= 3 ? 'neutral' : investors.length === 0 ? 'bearish' : 'neutral' },
          copycat: { score: enriched.defillama_category ? 55 : 45, detail: enriched.defillama_category ? `Operates in the ${enriched.defillama_category} sector${enriched.chains?.length > 0 ? ' across ' + enriched.chains.slice(0,2).join(', ') : ''}` : `Positioned in the ${xd?.category || 'crypto'} space — differentiation unclear without deeper analysis`, signal: 'neutral' },
          niche: { score: enriched.defillama_category ? (tvlNum > 1e8 ? 80 : tvlNum > 1e6 ? 65 : 55) : 40, detail: enriched.defillama_category ? `${enriched.defillama_category}${tvlNum > 1e8 ? ' — significant TVL indicates strong product-market fit' : tvlNum > 1e6 ? ' — meaningful capital deployment shows traction' : tvlNum > 0 ? ' — early capital deployment' : ' — building in an active sector'}` : `${xd?.category || 'Crypto'} project — niche potential unclear at this stage`, signal: tvlNum > 1e7 ? 'bullish' : 'neutral' },
          location: { score: team.length > 0 ? 60 : 25, detail: team.length > 0 ? `${team.length} team members identified: ${team.slice(0,2).map((t: any) => t.name + (t.role ? ' (' + t.role + ')' : '')).join(', ')}` : 'Team data not publicly available — higher risk for anonymous projects', signal: team.length > 2 ? 'bullish' : team.length === 0 ? 'bearish' : 'neutral' },
          founder_cred: { score: teamScore, detail: team.length > 0 ? `${team.length} team member${team.length > 1 ? 's' : ''} found: ${team.slice(0,3).map((t: any) => t.name + (t.role ? ' (' + t.role + ')' : '')).join(', ')}` : verified ? 'Verified X account but no public team profiles found' : 'No team data found — cannot verify founder credibility', signal: teamScore >= 65 ? 'bullish' : teamScore <= 35 ? 'bearish' : 'neutral' },
          founder_activity: { score: Math.min(55, !hasRealXData ? 0 : avgLikes > 100 ? 55 : avgLikes > 20 ? 45 : 30), detail: team.length > 0 ? `Team of ${team.length} — ${team[0].name}${team[0].role ? ' (' + team[0].role + ')' : ''} leads the project` : accountAge > 2 ? `Project account active for ${accountAge.toFixed(1)} years` : 'Limited public activity from founding team', signal: 'neutral' },
          top_voices: { score: Math.min(55, !hasRealXData ? 0 : listed > 500 ? 55 : listed > 100 ? 45 : 30), detail: listed > 500 ? 'Well-recognized project among crypto thought leaders' : listed > 100 ? 'Moderate recognition in the crypto community' : 'Still building recognition — early stage visibility', signal: 'neutral' },
          token: { score: tokenScore, detail: tokenLive ? `Token live: ${cg?.ticker || ''} at ${cg?.token_price || 'unknown'}${cg?.market_cap_str ? ' · MCap ' + cg.market_cap_str : ''}${enriched.vesting_warning ? ' ⚠️ ' + enriched.vesting_warning : ''}` : xd?.token_launch_hinted ? 'Token launch hinted in bio/tweets but not yet live on any DEX' : enriched.airdrop_confirmed ? 'No token yet but airdrop signals detected' : 'No token confirmed — potential early farming opportunity', signal: tokenLive ? (dexDump ? 'bearish' : 'bullish') : 'neutral' },
          metrics_clarity: { score: (tokenLive || xd?.token_launch_hinted) ? 55 : 30, detail: tokenLive ? 'Token is live — farming criteria and requirements are clearer' : xd?.token_launch_hinted ? 'Token hinted — watch for announcements on farming requirements' : 'No clear criteria for top % requirements yet — early stage project', signal: 'neutral' },
          user_count: { score: !hasRealXData ? 50 : followers > 200000 ? 30 : followers > 50000 ? 50 : followers > 5000 ? 70 : 85, detail: !hasRealXData ? 'User base size unclear' : followers > 200000 ? 'Very large community — expect heavy dilution for airdrops/rewards' : followers > 50000 ? 'Sizable community — moderate dilution expected' : followers > 5000 ? 'Growing community — reasonable dilution, good timing to farm' : 'Small community — early mover advantage, minimal dilution', signal: followers > 200000 ? 'bearish' : followers < 10000 ? 'bullish' : 'neutral' },
          fud: { score: autoFlags.length > 0 ? Math.max(10, 100 - autoFlags.length * 30) : securityScore, detail: autoFlags.length > 0 ? `${autoFlags.length} warning signal(s): ${autoFlags.slice(0,2).map((f: any) => f.label).join(', ')}` : hacks.length > 0 ? `${hacks.length} known security exploit(s) on record` : 'No FUD signals or security issues detected', signal: autoFlags.length > 0 || hacks.length > 0 ? 'bearish' : 'bullish' },
          notable_mentions: { score: Math.min(55, !hasRealXData ? 0 : listed > 200 ? 55 : listed > 50 ? 45 : 30), detail: listed > 200 ? 'Project is discussed by notable crypto accounts' : listed > 50 ? 'Some attention from crypto community' : 'Limited discussion among notable accounts', signal: 'neutral' },
          content_type: { score: hasRealXData ? (avgLikes > 50 && followers < 50000 ? 65 : avgLikes > 20 ? 50 : 35) : 45, detail: hasRealXData ? (avgLikes > 50 && followers < 50000 ? 'Strong organic engagement relative to community size' : avgLikes > 20 ? 'Moderate community engagement' : 'Low engagement — may rely on paid promotion') : 'Engagement data insufficient', signal: avgLikes > 50 && followers < 50000 ? 'bullish' : avgLikes < 10 ? 'bearish' : 'neutral' },
          mindshare: { score: tvlNum > 1e7 ? 75 : tvlNum > 0 ? 55 : hasRevenue ? 65 : Math.min(50, engagementScore), detail: tvl ? `${tvl} TVL shows real user adoption and capital commitment` : hasRevenue ? 'Revenue-generating protocol — real usage beyond speculation' : 'Early stage — mindshare still developing', signal: tvlNum > 1e7 ? 'bullish' : 'neutral' },
          revenue: { score: revenueScore, detail: enriched.revenue_24h ? `${enriched.revenue_24h} daily revenue — real economic activity` : enriched.fees_24h ? `${enriched.fees_24h} daily fees — protocol generating real value` : tvl ? `${tvl} TVL deployed but no revenue reported yet` : 'Pre-revenue stage — no fees or revenue data available', signal: revenueScore >= 65 ? 'bullish' : revenueScore <= 30 ? 'bearish' : 'neutral' },
          sentiment: { score: sentimentScore, detail: sentiment === 'positive' ? `Positive news coverage across ${enriched.news_article_count || 0} articles` : sentiment === 'negative' ? `Negative press detected — ${enriched.news_article_count || 0} articles with concerning tone` : sentiment === 'neutral' ? `Neutral coverage across ${enriched.news_article_count || 0} articles` : 'No recent news coverage found', signal: sentiment === 'positive' ? 'bullish' : sentiment === 'negative' ? 'bearish' : 'neutral' },
        },
        post_tge_outlook: tokenLive ? (dexDump ? 'Poor — token declining' : 'Moderate') : 'Token not yet live',
        project_follows: null,
        future_seasons: enriched.news_recent?.length > 0 ? `Recent coverage: ${enriched.news_recent.slice(0,2).join('. ')}` : null,
        mindshare_trend: null,
        token_data: cg?.token_live ? cg : (xd?.token_data?.token_live ? xd.token_data : null),
      }
      saveResult(cleaned)
    }

    try {
      const systemPrompt = buildSystemPrompt(handle, xd, cg)
      const r = await fetch('/api/claude', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          system: systemPrompt,
          messages: [{ role: 'user', content: `Analyze @${handle}. Use the tool data in the system prompt. Return JSON only.` }]
        })
      })
      if (!r.ok) {
        const errText = await r.text()
        console.error('Claude API error:', r.status, errText)
        xOnlyScan(); return
      }
      const data = await r.json()

      if (data.error) {
        const msg = data.error.message || ''
        const errType = data.error.type || ''
        const isCredits = msg.includes('credit') || msg.includes('billing') || msg.includes('quota') || errType === 'insufficient_quota'
        const isOverload = msg.includes('overload') || errType === 'overloaded_error'
        const isRateLimit = msg.includes('rate limit') || msg.includes('tokens per minute')
        const isAuth = errType === 'authentication_error' || msg.includes('invalid x-api-key') || msg.includes('invalid api key')

        if (isAuth) { 
          console.error('Anthropic API key issue:', msg)
          xOnlyScan(); return 
        }
        if (isCredits || isOverload) { xOnlyScan(); return }
        if (isRateLimit) {
          setError('rate_limit'); let secs = 65
          const cd = setInterval(() => { secs--; setError('rate_limit:' + secs); if (secs <= 0) { clearInterval(cd); setError(null); analyze() } }, 1000)
          return
        }
        throw new Error(msg)
      }

      const txt = (data.content || []).filter((b: any) => b.type === 'text').map((b: any) => b.text).join('\n')
      if (!txt.trim()) { xOnlyScan(); return }
      const parsed = xjson(txt)
      if (!parsed) { xOnlyScan(); return }
      const cleaned = stripCites(parsed)
      const autoFlags = (xd?.enriched?.auto_fud_flags || []).map((f: any) => ({ type: f.type, label: f.label, detail: f.detail }))
      const existingLabels = (cleaned.red_flags || []).map((f: any) => f.label?.toLowerCase())
      const newFlags = autoFlags.filter((f: any) => !existingLabels.some((l: string) => l.includes(f.label.toLowerCase().slice(0,10))))
      cleaned.red_flags = [...(cleaned.red_flags || []), ...newFlags]
      saveResult(cleaned)
    } catch (e: any) {
      const msg = e.message || ''
      if (msg.includes('credit') || msg.includes('billing') || msg.includes('overload')) { xOnlyScan(); return }
      if (msg.includes('rate limit')) {
        setError('rate_limit'); let secs = 65
        const cd = setInterval(() => { secs--; setError('rate_limit:' + secs); if (secs <= 0) { clearInterval(cd); setError(null); analyze() } }, 1000)
        return
      }
      if (msg.includes('Failed to fetch') || msg.includes('NetworkError')) { setError('unavailable'); return }
      xOnlyScan()
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
    const highlights = (result.good_highlights || []).filter((h: string) => h && h.length > 5).slice(0, 3)
    const flagCount = (result.red_flags || []).filter((f: any) => f.label).length

    const W = 1200, H = 628, DPR = 2
    const canvas = document.createElement('canvas')
    canvas.width = W * DPR; canvas.height = H * DPR
    const ctx = canvas.getContext('2d')!
    ctx.scale(DPR, DPR)

    const loadImg = (src: string, fallbacks: string[] = []): Promise<HTMLImageElement | null> => new Promise(resolve => {
      const sources = [src, ...fallbacks].filter(Boolean)
      let idx = 0
      const tryNext = () => {
        if (idx >= sources.length) { resolve(null); return }
        const url = sources[idx++]
        const img = new Image()
        img.crossOrigin = 'anonymous'
        const t = setTimeout(() => { img.onload = null; img.onerror = null; tryNext() }, 5000)
        img.onload = () => { clearTimeout(t); resolve(img) }
        img.onerror = () => { clearTimeout(t); tryNext() }
        img.src = url
      }
      tryNext()
    })

    // Build logo source URLs with multiple fallbacks
    const handle = xUrl ? xUrl.replace('https://x.com/','').replace('https://twitter.com/','').replace('http://x.com/','').replace('@','').split('/')[0].trim() : ''
    const logoSources: string[] = []
    // 1. Unavatar proxy FIRST — most reliable CORS-safe source
    if (handle) logoSources.push(`https://unavatar.io/twitter/${handle}`)
    // 2. Direct X profile image variants
    if (xData?.profile_image_url) {
      logoSources.push(xData.profile_image_url.replace('_normal','_400x400'))
      logoSources.push(xData.profile_image_url.replace('_normal','_200x200'))
      logoSources.push(xData.profile_image_url)
    }
    // 3. UI Avatars as last resort (always works, generates letter)
    logoSources.push(`https://ui-avatars.com/api/?name=${encodeURIComponent((result.project_name||'?').charAt(0))}&background=${colors[0].replace('#','')}&color=fff&size=128&bold=true&format=png`)

    const wrap = (text: string, x: number, y: number, maxW: number, lh: number, max: number) => {
      const words = text.split(' '); let line = '', lY = y, n = 0
      for (const w of words) {
        const t = line + w + ' '
        if (ctx.measureText(t).width > maxW && line) {
          ctx.fillText(line.trim(), x, lY); line = w + ' '; lY += lh; n++
          if (n >= max - 1) { line = line.trim() + '…'; break }
        } else line = t
      }
      if (line.trim()) ctx.fillText(line.trim(), x, lY)
    }

    // ── BACKGROUND: deep dark with subtle texture ──
    const bg = ctx.createLinearGradient(0, 0, W, H)
    bg.addColorStop(0, '#080b12'); bg.addColorStop(0.5, '#0c1018'); bg.addColorStop(1, '#080b12')
    ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H)

    // Accent strip — left edge
    const accentGrad = ctx.createLinearGradient(0, 0, 0, H)
    accentGrad.addColorStop(0, colors[0]); accentGrad.addColorStop(1, colors[0] + '44')
    ctx.fillStyle = accentGrad
    ctx.fillRect(0, 0, 5, H)

    // Subtle dot grid
    ctx.save(); ctx.globalAlpha = 0.03; ctx.fillStyle = '#fff'
    for (let x = 30; x < W; x += 28) {
      for (let y = 30; y < H; y += 28) {
        ctx.beginPath(); ctx.arc(x, y, 0.5, 0, Math.PI * 2); ctx.fill()
      }
    }
    ctx.restore()

    // Large faded score watermark
    ctx.save(); ctx.globalAlpha = 0.03; ctx.fillStyle = '#fff'
    ctx.font = 'bold 380px Arial'; ctx.textAlign = 'right'
    ctx.fillText(String(result.overall_score ?? 0), W + 10, 400)
    ctx.restore()

    const PAD = 48
    const COL_R = W * 0.52

    // ── TOP BAR ──
    // Tier badge
    ctx.fillStyle = colors[0] + '20'
    ctx.beginPath(); (ctx as any).roundRect(PAD, 32, 100, 30, 15); ctx.fill()
    ctx.strokeStyle = colors[0] + '55'; ctx.lineWidth = 1
    ctx.beginPath(); (ctx as any).roundRect(PAD, 32, 100, 30, 15); ctx.stroke()
    ctx.fillStyle = colors[0]; ctx.font = 'bold 12px Arial'; ctx.textAlign = 'center'
    ctx.fillText(otc.lbl, PAD + 50, 52); ctx.textAlign = 'left'

    // CMV branding top-right
    ctx.fillStyle = 'rgba(255,255,255,0.2)'; ctx.font = '10px monospace'; ctx.textAlign = 'right'
    ctx.fillText('CMV ALPHASCANNER', W - PAD, 52); ctx.textAlign = 'left'

    // ── LEFT COLUMN ──
    const LOGO_Y = 82
    const LOGO_R = 34
    const pfpImg = await loadImg(logoSources[0] || '', logoSources.slice(1))
    if (pfpImg) {
      ctx.save(); ctx.beginPath(); ctx.arc(PAD + LOGO_R, LOGO_Y + LOGO_R, LOGO_R, 0, Math.PI * 2); ctx.clip()
      ctx.drawImage(pfpImg, PAD, LOGO_Y, LOGO_R * 2, LOGO_R * 2); ctx.restore()
      ctx.strokeStyle = 'rgba(255,255,255,0.15)'; ctx.lineWidth = 2
      ctx.beginPath(); ctx.arc(PAD + LOGO_R, LOGO_Y + LOGO_R, LOGO_R, 0, Math.PI * 2); ctx.stroke()
    } else {
      ctx.fillStyle = colors[0] + '44'
      ctx.beginPath(); ctx.arc(PAD + LOGO_R, LOGO_Y + LOGO_R, LOGO_R, 0, Math.PI * 2); ctx.fill()
      ctx.fillStyle = '#fff'; ctx.font = 'bold 26px Arial'; ctx.textAlign = 'center'
      ctx.fillText((result.project_name||'?').charAt(0).toUpperCase(), PAD + LOGO_R, LOGO_Y + LOGO_R + 9); ctx.textAlign = 'left'
    }

    // Project name — next to logo
    const nameX = PAD + LOGO_R * 2 + 16
    ctx.fillStyle = '#fff'; ctx.font = 'bold 30px Arial'
    ctx.fillText((result.project_name||'').slice(0, 20), nameX, LOGO_Y + 24)

    // Category line
    const metaLine = [result.project_category, result.team_location].filter(Boolean).join(' · ')
    ctx.fillStyle = 'rgba(255,255,255,0.4)'; ctx.font = '13px Arial'
    ctx.fillText(metaLine.slice(0, 45), nameX, LOGO_Y + 46)

    // Token pill
    if (cgData?.token_live && cgData.ticker) {
      const tok = cgData.ticker + '  ' + (cgData.token_price || '')
      ctx.font = 'bold 11px monospace'
      const tw = ctx.measureText(tok).width + 18
      ctx.fillStyle = 'rgba(22,163,74,0.2)'; ctx.strokeStyle = 'rgba(22,163,74,0.4)'; ctx.lineWidth = 1
      ctx.beginPath(); (ctx as any).roundRect(nameX, LOGO_Y + 54, tw, 20, 10); ctx.fill(); ctx.stroke()
      ctx.fillStyle = '#4ade80'; ctx.fillText(tok, nameX + 9, LOGO_Y + 68)
    }

    // Divider
    const DIV_Y = LOGO_Y + 86
    ctx.strokeStyle = 'rgba(255,255,255,0.06)'; ctx.lineWidth = 1
    ctx.beginPath(); ctx.moveTo(PAD, DIV_Y); ctx.lineTo(COL_R - 20, DIV_Y); ctx.stroke()

    // Description
    ctx.fillStyle = 'rgba(255,255,255,0.5)'; ctx.font = '13px Arial'
    wrap(result.description || '', PAD, DIV_Y + 22, COL_R - PAD - 40, 20, 3)

    // Highlights
    let hlY = DIV_Y + 84
    highlights.forEach((h: string) => {
      const label = '✓  ' + (h.length > 46 ? h.slice(0,44)+'…' : h)
      ctx.font = 'bold 11px Arial'
      const pw = Math.min(ctx.measureText(label).width + 20, COL_R - PAD - 40)
      ctx.fillStyle = 'rgba(22,163,74,0.1)'
      ctx.beginPath(); (ctx as any).roundRect(PAD, hlY, pw, 24, 12); ctx.fill()
      ctx.fillStyle = '#4ade80'; ctx.fillText(label, PAD + 10, hlY + 16)
      hlY += 30
    })

    // Red flags badge
    if (flagCount > 0) {
      ctx.font = 'bold 11px Arial'
      const fl = flagCount + ' red flag' + (flagCount > 1 ? 's' : '') + ' detected'
      const fw = ctx.measureText(fl).width + 24
      ctx.fillStyle = 'rgba(220,38,38,0.2)'
      ctx.beginPath(); (ctx as any).roundRect(PAD, hlY + 4, fw, 24, 12); ctx.fill()
      ctx.fillStyle = '#f87171'; ctx.fillText(fl, PAD + 12, hlY + 20)
    }

    // ── VERTICAL DIVIDER ──
    ctx.strokeStyle = 'rgba(255,255,255,0.05)'; ctx.lineWidth = 1
    ctx.beginPath(); ctx.moveTo(COL_R - 10, 75); ctx.lineTo(COL_R - 10, H - 44); ctx.stroke()

    // ── RIGHT COLUMN ──
    // Big score
    ctx.fillStyle = '#fff'; ctx.font = 'bold 88px Arial'; ctx.textAlign = 'right'
    ctx.fillText(String(result.overall_score ?? 0), W - PAD, 140)
    ctx.font = '10px monospace'; ctx.fillStyle = 'rgba(255,255,255,0.25)'; ctx.textAlign = 'right'
    ctx.fillText('/100  ALPHA SCORE', W - PAD, 158); ctx.textAlign = 'left'

    // User badge
    const UY = 188
    const uImg = userPhoto ? await loadImg(userPhoto) : null
    if (uImg) {
      ctx.save(); ctx.beginPath(); ctx.arc(COL_R + 14, UY, 14, 0, Math.PI * 2); ctx.clip()
      ctx.drawImage(uImg, COL_R, UY - 14, 28, 28); ctx.restore()
      ctx.strokeStyle = 'rgba(255,255,255,0.2)'; ctx.lineWidth = 1
      ctx.beginPath(); ctx.arc(COL_R + 14, UY, 14, 0, Math.PI * 2); ctx.stroke()
    } else {
      ctx.fillStyle = colors[0]; ctx.beginPath(); ctx.arc(COL_R + 14, UY, 14, 0, Math.PI * 2); ctx.fill()
      ctx.fillStyle = '#fff'; ctx.font = 'bold 11px Arial'; ctx.textAlign = 'center'
      ctx.fillText((userName||'C').charAt(0).toUpperCase(), COL_R + 14, UY + 4); ctx.textAlign = 'left'
    }
    ctx.fillStyle = 'rgba(255,255,255,0.3)'; ctx.font = '10px Arial'
    ctx.fillText('@' + (userName||'cmvng') + ' says', COL_R + 38, UY - 4)
    ctx.fillStyle = colors[0]; ctx.font = 'bold 17px Arial'
    ctx.fillText(otc.v, COL_R + 38, UY + 15)

    // Verdict reasoning box
    const VBY = UY + 34
    const VBW = W - COL_R - PAD
    const VBH = 130
    ctx.fillStyle = 'rgba(255,255,255,0.03)'
    ctx.beginPath(); (ctx as any).roundRect(COL_R, VBY, VBW, VBH, 12); ctx.fill()
    ctx.strokeStyle = 'rgba(255,255,255,0.06)'; ctx.lineWidth = 1
    ctx.beginPath(); (ctx as any).roundRect(COL_R, VBY, VBW, VBH, 12); ctx.stroke()
    ctx.fillStyle = 'rgba(255,255,255,0.6)'; ctx.font = '12px Arial'
    wrap(result.verdict_action || result.verdict_reason || '', COL_R + 14, VBY + 22, VBW - 28, 18, 6)

    // Category scores row at bottom of right column
    const CSY = VBY + VBH + 16
    const catNames = ['Fund', 'Team', 'Oppt', 'Sent', 'Trac']
    const catW = Math.floor((VBW - 4 * 8) / 5)
    CATS.forEach((cat, ci) => {
      const cs = catScore(cat)
      const cx = COL_R + ci * (catW + 8)
      ctx.fillStyle = 'rgba(255,255,255,0.04)'
      ctx.beginPath(); (ctx as any).roundRect(cx, CSY, catW, 44, 8); ctx.fill()
      ctx.fillStyle = 'rgba(255,255,255,0.25)'; ctx.font = '8px monospace'; ctx.textAlign = 'center'
      ctx.fillText(catNames[ci].toUpperCase(), cx + catW/2, CSY + 14)
      const cTier = getTier(cs)
      ctx.fillStyle = T[cTier].solid; ctx.font = 'bold 16px Arial'
      ctx.fillText(String(cs), cx + catW/2, CSY + 36)
      ctx.textAlign = 'left'
    })

    // Footer
    ctx.fillStyle = 'rgba(255,255,255,0.12)'; ctx.font = '9px monospace'; ctx.textAlign = 'center'
    ctx.fillText('cmv-alphascanner.vercel.app', W / 2, H - 14)
    ctx.globalAlpha = 1

    const link = document.createElement('a')
    link.download = (result.project_name||'scan').replace(/[^a-zA-Z0-9]/g,'_') + '_cmv_alpha.png'
    link.href = canvas.toDataURL('image/png', 1.0); link.click()
  }

  const ot = result ? getTier(result.overall_score ?? 0) : 'C'
  const otc = T[ot]
  const redFlags = result?.red_flags?.filter((f: any) => f.label) || []
  const goodHighlights = result?.good_highlights?.filter((h: string) => h && h.length > 5) || []
  const cmvScore = result ? computeCMVAlphaScore(result.metrics, redFlags) : null
  const fudPen = cmvScore?.fudPenalty ?? 0
  const msg = LOADING_MSGS[msgIdx]

  // Metrics that matter for project evaluation (exclude pure social stats)
  const FUNDAMENTAL_METRICS = ['funding', 'vc_pedigree', 'copycat', 'niche', 'revenue', 'token', 'fud', 'founder_cred', 'metrics_clarity', 'user_count', 'sentiment', 'content_type']
  const METRIC_LABELS: Record<string, string> = {
    funding: 'Funding', vc_pedigree: 'VC Quality', copycat: 'Originality', niche: 'Niche Potential',
    location: 'Team Location', founder_cred: 'Team Credibility', founder_activity: 'Founder Activity',
    top_voices: 'CT Attention', token: 'Token Status', metrics_clarity: 'Farming Clarity',
    user_count: 'Dilution Risk', fud: 'FUD / Red Flags', notable_mentions: 'CT Mentions',
    content_type: 'Content Quality', mindshare: 'Mindshare', revenue: 'Revenue', sentiment: 'News Sentiment',
  }

  const goodSides = result ? Object.entries(result.metrics || {})
    .filter(([k, d]: any) => FUNDAMENTAL_METRICS.includes(k) && d.signal === 'bullish' && d.score >= 65)
    .sort(([,a]: any, [,b]: any) => b.score - a.score)
    .slice(0, 5)
    .map(([k, d]: any) => ({ key: k, label: METRIC_LABELS[k] || k.replace(/_/g,' '), score: d.score, detail: d.detail || d.summary || '' })) : []

  const badSides = result ? Object.entries(result.metrics || {})
    .filter(([k, d]: any) => FUNDAMENTAL_METRICS.includes(k) && (d.signal === 'bearish' || d.score < 40))
    .sort(([,a]: any, [,b]: any) => a.score - b.score)
    .slice(0, 5)
    .map(([k, d]: any) => ({ key: k, label: METRIC_LABELS[k] || k.replace(/_/g,' '), score: d.score, detail: d.detail || d.summary || '' })) : []

  // Show landing page only when no result, not loading, no error, and NOT coming from feed
  const showLanding = !result && !loading && !error && !feedLoading

  return (
    <div className="app-root">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800;900&family=JetBrains+Mono:wght@400;500;600;700&display=swap');

        :root {
          --bg: #f8faf8;
          --bg-2: #ffffff;
          --bg-3: #f1f5f1;
          --bg-card: #ffffff;
          --border: #e2e8e4;
          --border-2: #d1d9d3;
          --text-1: #0f1a12;
          --text-2: #2d3b30;
          --text-3: #5a6b5e;
          --text-4: #8a9b8e;
          --green: #16a34a;
          --green-light: #dcfce7;
          --green-dark: #14532d;
          --red: #dc2626;
          --red-light: #fef2f2;
          --amber: #d97706;
          --amber-light: #fef3c7;
          --font: 'Outfit', sans-serif;
          --mono: 'JetBrains Mono', monospace;
          --radius: 12px;
          --radius-lg: 16px;
          --shadow-sm: 0 1px 2px rgba(0,0,0,0.04);
          --shadow: 0 2px 8px rgba(0,0,0,0.06);
          --shadow-lg: 0 8px 30px rgba(0,0,0,0.08);
        }

        * { box-sizing: border-box; margin: 0; padding: 0; }

        .app-root {
          min-height: 100vh;
          background: var(--bg);
          font-family: var(--font);
          color: var(--text-1);
          -webkit-font-smoothing: antialiased;
        }

        /* ── NAV ── */
        .nav {
          background: rgba(248,250,248,0.85);
          backdrop-filter: blur(20px) saturate(180%);
          -webkit-backdrop-filter: blur(20px) saturate(180%);
          border-bottom: 1px solid var(--border);
          padding: 0 24px;
          display: flex;
          align-items: center;
          height: 56px;
          position: sticky;
          top: 0;
          z-index: 100;
        }
        .nav-brand { display: flex; align-items: center; gap: 10px; text-decoration: none; }
        .nav-logo {
          width: 28px; height: 28px;
          background: var(--green);
          border-radius: 7px;
          display: flex; align-items: center; justify-content: center;
        }
        .nav-title { font-size: 15px; font-weight: 700; color: var(--text-1); letter-spacing: -0.3px; }
        .nav-title span { color: var(--green); }
        .nav-links { margin-left: auto; display: flex; align-items: center; gap: 2px; }
        .nav-link {
          font-family: var(--mono);
          font-size: 11px;
          color: var(--text-3);
          text-decoration: none;
          padding: 6px 12px;
          border-radius: 6px;
          transition: all 0.15s;
        }
        .nav-link:hover { color: var(--text-1); background: var(--bg-3); }
        .nav-sep { width: 1px; height: 16px; background: var(--border); margin: 0 8px; }
        .nav-profile {
          display: flex; align-items: center; gap: 6px;
          background: var(--bg-3);
          border: 1px solid var(--border);
          border-radius: 20px;
          padding: 3px 10px 3px 4px;
          cursor: pointer;
          transition: all 0.15s;
        }
        .nav-profile:hover { border-color: var(--border-2); }
        .nav-profile-img { width: 22px; height: 22px; border-radius: 50%; object-fit: cover; }
        .nav-profile-fallback {
          width: 22px; height: 22px; border-radius: 50%;
          background: var(--green);
          display: flex; align-items: center; justify-content: center;
          font-size: 9px; font-weight: 700; color: #fff;
        }

        /* ── ANIMATIONS ── */
        @keyframes fadeUp { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes scan { 0% { transform: translateX(-100%); } 100% { transform: translateX(500%); } }
        @keyframes pulse { 0%,100% { opacity: 0.4; } 50% { opacity: 1; } }
        @keyframes shimmer { 0% { background-position: -700px 0; } 100% { background-position: 700px 0; } }
        @keyframes pop { 0% { transform: scale(0.97); opacity: 0; } 100% { transform: scale(1); opacity: 1; } }
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes slideIn { from { opacity: 0; transform: translateX(-8px); } to { opacity: 1; transform: translateX(0); } }

        .animate-in { animation: fadeUp 0.5s ease both; }

        /* ── HERO ── */
        .hero {
          text-align: center;
          padding: 72px 24px 48px;
          position: relative;
          overflow: hidden;
        }
        .hero::before {
          content: '';
          position: absolute;
          top: -120px; left: 50%; transform: translateX(-50%);
          width: 600px; height: 600px;
          background: radial-gradient(circle, rgba(22,163,74,0.06) 0%, transparent 70%);
          pointer-events: none;
        }
        .hero-badge {
          display: inline-flex; align-items: center; gap: 6px;
          background: var(--green-light);
          border: 1px solid rgba(22,163,74,0.2);
          border-radius: 20px;
          padding: 5px 14px;
          margin-bottom: 24px;
        }
        .hero-badge-dot {
          width: 5px; height: 5px; border-radius: 50%;
          background: var(--green);
          animation: pulse 2s infinite;
        }
        .hero-badge-text {
          font-family: var(--mono);
          font-size: 10px;
          color: var(--green-dark);
          letter-spacing: 1.5px;
          font-weight: 600;
        }
        .hero-title {
          font-size: clamp(40px, 6vw, 72px);
          font-weight: 900;
          color: var(--text-1);
          line-height: 1.0;
          letter-spacing: -3px;
          margin-bottom: 20px;
        }
        .hero-title span { color: var(--green); }
        .hero-sub {
          font-size: 16px;
          color: var(--text-3);
          line-height: 1.7;
          max-width: 440px;
          margin: 0 auto 40px;
          font-weight: 400;
        }
        .hero-tags {
          display: flex; justify-content: center; gap: 8px; flex-wrap: wrap;
        }
        .hero-tag {
          font-family: var(--mono);
          font-size: 10px;
          color: var(--text-4);
          background: var(--bg-2);
          border: 1px solid var(--border);
          border-radius: 20px;
          padding: 5px 14px;
        }

        /* ── HOW IT WORKS ── */
        .how-section {
          max-width: 720px;
          margin: 0 auto;
          padding: 48px 0 0;
          animation: fadeUp 0.6s ease both;
          animation-delay: 0.3s;
        }
        .section-label {
          font-family: var(--mono);
          font-size: 10px;
          font-weight: 600;
          color: var(--text-4);
          letter-spacing: 2px;
          text-transform: uppercase;
          margin-bottom: 16px;
        }
        .how-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 12px;
        }
        .how-card {
          background: var(--bg-2);
          border: 1px solid var(--border);
          border-radius: var(--radius);
          padding: 20px;
          text-align: left;
        }
        .how-num {
          font-family: var(--mono);
          font-size: 10px;
          font-weight: 700;
          color: var(--green);
          margin-bottom: 8px;
        }
        .how-title {
          font-size: 14px;
          font-weight: 700;
          color: var(--text-1);
          margin-bottom: 4px;
        }
        .how-desc {
          font-size: 12px;
          color: var(--text-3);
          line-height: 1.5;
        }

        /* ── FEATURED ── */
        .featured-section {
          max-width: 720px;
          margin: 0 auto;
          padding: 40px 0 0;
          animation: fadeUp 0.6s ease both;
        }
        .featured-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(min(300px, 100%), 1fr));
          gap: 8px;
        }
        .feat-card {
          text-decoration: none;
          display: block;
          background: var(--bg-2);
          border: 1px solid var(--border);
          border-radius: var(--radius);
          padding: 12px 14px;
          transition: all 0.15s;
        }
        .feat-card:hover { border-color: var(--green); box-shadow: var(--shadow); }
        .feat-card-inner { display: flex; align-items: center; gap: 10px; }
        .feat-logo-wrap {
          width: 36px; height: 36px; border-radius: 50%;
          overflow: hidden; flex-shrink: 0;
          background: var(--bg-3);
          display: flex; align-items: center; justify-content: center;
        }
        .feat-logo { width: 100%; height: 100%; object-fit: cover; }
        .feat-logo-letter { font-size: 14px; font-weight: 700; color: var(--text-3); }
        .feat-name { font-size: 13px; font-weight: 600; color: var(--text-1); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .feat-meta { font-family: var(--mono); font-size: 10px; color: var(--text-4); margin-top: 1px; }
        .feat-score-wrap { flex-shrink: 0; text-align: right; }
        .feat-score { font-family: var(--mono); font-size: 18px; font-weight: 700; }

        /* ── SEARCH BOX ── */
        .search-box {
          background: var(--bg-2);
          border: 1px solid var(--border);
          border-radius: var(--radius-lg);
          padding: 14px;
          margin-bottom: 14px;
          box-shadow: var(--shadow-sm);
        }
        .search-row { display: flex; gap: 8px; }
        .search-input {
          flex: 1;
          background: var(--bg-3);
          border: 1.5px solid var(--border);
          border-radius: 10px;
          padding: 12px 16px;
          font-size: 14px;
          color: var(--text-1);
          font-family: var(--mono);
          transition: border-color 0.2s;
          outline: none;
        }
        .search-input:focus { border-color: var(--green); }
        .search-input::placeholder { color: var(--text-4); }
        .search-btns { display: flex; gap: 8px; flex-shrink: 0; }
        .btn-new {
          background: var(--bg-3);
          border: 1px solid var(--border);
          border-radius: 10px;
          padding: 12px 16px;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          color: var(--text-3);
          font-family: var(--font);
          white-space: nowrap;
          transition: all 0.15s;
        }
        .btn-new:hover { border-color: var(--border-2); }
        .btn-scan {
          background: var(--green);
          color: #fff;
          border: none;
          border-radius: 10px;
          padding: 12px 24px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          white-space: nowrap;
          font-family: var(--font);
          transition: all 0.2s;
        }
        .btn-scan:hover { background: #15803d; transform: translateY(-1px); box-shadow: 0 4px 16px rgba(22,163,74,0.3); }
        .btn-scan:disabled { background: var(--bg-3); color: var(--text-4); cursor: not-allowed; transform: none; box-shadow: none; }
        .search-hints {
          font-family: var(--mono);
          font-size: 10px;
          color: var(--text-4);
          margin-top: 10px;
          display: flex; gap: 8px; align-items: center;
        }
        .search-hint-link {
          font-family: var(--mono);
          font-size: 10px;
          color: var(--green);
          background: none;
          border: none;
          cursor: pointer;
          padding: 0;
        }
        .search-hint-link:hover { text-decoration: underline; }

        /* ── LOADING ── */
        .loading-card {
          background: var(--bg-2);
          border: 1px solid var(--border);
          border-radius: var(--radius-lg);
          padding: 24px;
          margin-bottom: 14px;
          position: relative;
          overflow: hidden;
        }
        .loading-bar {
          position: absolute; top: 0; left: 0; right: 0; height: 2px;
          background: rgba(22,163,74,0.1);
        }
        .loading-bar-inner {
          height: 100%;
          background: linear-gradient(90deg, transparent, var(--green), transparent);
          animation: scan 2s linear infinite;
        }
        .loading-row {
          display: flex; align-items: center; gap: 14px; margin-bottom: 20px;
        }
        .loading-icon {
          width: 44px; height: 44px; border-radius: 50%;
          border: 1.5px solid rgba(22,163,74,0.3);
          display: flex; align-items: center; justify-content: center;
          flex-shrink: 0;
        }
        .loading-icon span { font-size: 18px; animation: spin 3s linear infinite; }
        .loading-title { font-size: 14px; font-weight: 600; color: var(--text-1); margin-bottom: 3px; }
        .loading-phase { font-family: var(--mono); font-size: 10px; color: var(--text-4); }
        .loading-timer { font-family: var(--mono); font-size: 22px; font-weight: 700; color: var(--green); }
        .loading-timer span { font-size: 11px; color: var(--text-4); }
        .shimmer-bar {
          height: 28px;
          background: linear-gradient(90deg, var(--bg-3) 25%, var(--border) 50%, var(--bg-3) 75%);
          background-size: 700px 100%;
          animation: shimmer 1.8s infinite;
          border-radius: 8px;
          margin-bottom: 8px;
        }

        /* ── ERRORS ── */
        .error-card {
          background: var(--bg-2);
          border: 1px solid var(--border);
          border-radius: var(--radius);
          padding: 20px;
          margin-bottom: 14px;
        }
        .error-card.rate-limit { border-color: rgba(217,119,6,0.3); }
        .error-card.fail { border-color: rgba(220,38,38,0.3); }

        /* ── RESULT CARDS ── */
        .card {
          background: var(--bg-2);
          border: 1px solid var(--border);
          border-radius: var(--radius-lg);
          padding: 20px;
          margin-bottom: 10px;
          box-shadow: var(--shadow-sm);
        }
        .card-label {
          font-family: var(--mono);
          font-size: 9px;
          font-weight: 600;
          color: var(--text-4);
          letter-spacing: 1.5px;
          text-transform: uppercase;
          margin-bottom: 12px;
        }

        /* ── RED FLAGS ── */
        .flags-card {
          background: var(--red-light);
          border: 1.5px solid rgba(220,38,38,0.2);
          border-radius: var(--radius-lg);
          padding: 18px;
          margin-bottom: 10px;
          animation: pop 0.4s ease;
        }
        .flag-header { display: flex; align-items: center; gap: 10px; margin-bottom: 12px; }
        .flag-icon {
          width: 32px; height: 32px; background: var(--red); border-radius: 8px;
          display: flex; align-items: center; justify-content: center; flex-shrink: 0;
        }
        .flag-title { font-size: 14px; font-weight: 700; color: var(--red); }
        .flag-sub { font-family: var(--mono); font-size: 9px; color: rgba(220,38,38,0.6); }
        .flag-penalty {
          background: var(--red); border-radius: 8px; padding: 5px 10px; text-align: center;
        }
        .flag-penalty-num { font-size: 15px; font-weight: 800; color: #fff; }
        .flag-penalty-label { font-family: var(--mono); font-size: 7px; color: rgba(255,255,255,0.7); }
        .flag-item {
          background: rgba(220,38,38,0.04);
          border: 1px solid rgba(220,38,38,0.1);
          border-left: 3px solid var(--red);
          border-radius: 8px;
          padding: 10px 14px;
          margin-bottom: 6px;
        }
        .flag-item-label { font-size: 12px; font-weight: 600; color: var(--red); }
        .flag-item-detail { font-size: 11px; color: var(--text-3); line-height: 1.5; margin-top: 3px; }

        .clean-badge {
          background: var(--green-light);
          border: 1px solid rgba(22,163,74,0.15);
          border-radius: 10px;
          padding: 10px 14px;
          margin-bottom: 10px;
          display: flex; align-items: center; gap: 8px;
        }
        .clean-badge span { font-size: 12px; font-weight: 600; color: var(--green); }

        /* ── VERDICT CARD ── */
        .verdict-card {
          border-radius: 20px;
          padding: 24px;
          margin-bottom: 10px;
          position: relative;
          overflow: hidden;
          color: #fff;
        }
        .verdict-bg-circle {
          position: absolute; border-radius: 50%; pointer-events: none;
        }
        .verdict-user-badge {
          display: inline-flex; align-items: center; gap: 7px;
          background: rgba(0,0,0,0.2);
          border-radius: 20px;
          padding: 4px 12px 4px 5px;
          margin-bottom: 16px;
        }
        .verdict-user-img { width: 24px; height: 24px; border-radius: 50%; object-fit: cover; }
        .verdict-user-fallback {
          width: 24px; height: 24px; border-radius: 50%;
          background: rgba(255,255,255,0.2);
          display: flex; align-items: center; justify-content: center;
          font-size: 10px; font-weight: 700; color: #fff;
        }
        .verdict-header { display: flex; align-items: flex-start; gap: 14px; margin-bottom: 16px; }
        .verdict-logo {
          width: 48px; height: 48px; border-radius: 12px;
          overflow: hidden; background: rgba(255,255,255,0.15);
          display: flex; align-items: center; justify-content: center;
          flex-shrink: 0; border: 1.5px solid rgba(255,255,255,0.2);
        }
        .verdict-logo img { width: 100%; height: 100%; object-fit: cover; }
        .verdict-name { font-size: 22px; font-weight: 800; letter-spacing: -0.5px; }
        .verdict-ticker {
          font-family: var(--mono); font-size: 10px;
          background: rgba(0,0,0,0.2); padding: 2px 8px; border-radius: 4px;
        }
        .verdict-cat { font-family: var(--mono); font-size: 9px; color: rgba(255,255,255,0.5); }
        .verdict-score { font-size: 48px; font-weight: 800; line-height: 1; }
        .verdict-score-label { font-family: var(--mono); font-size: 7px; color: rgba(255,255,255,0.5); }
        .verdict-tier { font-family: var(--mono); font-size: 9px; background: rgba(0,0,0,0.2); border-radius: 20px; padding: 2px 8px; display: inline-block; margin-top: 3px; }
        .verdict-highlight {
          background: rgba(0,0,0,0.15); border: 1px solid rgba(255,255,255,0.12);
          border-radius: 20px; padding: 3px 10px; font-size: 11px; color: rgba(255,255,255,0.9);
        }
        .verdict-action-box { background: rgba(0,0,0,0.2); border-radius: 12px; padding: 14px 16px; margin-bottom: 16px; }
        .verdict-action-title { font-size: 13px; font-weight: 700; margin-bottom: 4px; }
        .verdict-action-text { font-size: 13px; color: rgba(255,255,255,0.85); line-height: 1.6; }
        .verdict-btns { display: flex; gap: 8px; justify-content: flex-end; }
        .verdict-btn {
          display: flex; align-items: center; gap: 5px;
          background: rgba(255,255,255,0.12); border: 1px solid rgba(255,255,255,0.2);
          border-radius: 20px; padding: 7px 14px; font-size: 12px; font-weight: 600;
          color: #fff; cursor: pointer; font-family: var(--font); transition: all 0.15s;
        }
        .verdict-btn:hover { background: rgba(255,255,255,0.2); }

        /* ── OVERVIEW GRID ── */
        .overview-grid {
          display: grid;
          grid-template-columns: 120px 1fr;
          gap: 10px;
          margin-bottom: 10px;
        }
        .score-tower {
          background: var(--bg-2);
          border: 1px solid var(--border);
          border-radius: var(--radius-lg);
          padding: 16px;
          display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 4px;
        }
        .score-tower-label { font-family: var(--mono); font-size: 8px; color: var(--text-4); letter-spacing: 1px; }
        .score-tower-num { font-size: 48px; font-weight: 800; line-height: 1; }
        .score-tower-tier { font-family: var(--mono); font-size: 9px; border-radius: 20px; padding: 2px 10px; display: inline-block; margin-top: 2px; }
        .overview-info {
          background: var(--bg-2);
          border: 1px solid var(--border);
          border-radius: var(--radius-lg);
          padding: 16px;
        }
        .overview-name { font-size: 16px; font-weight: 700; color: var(--text-1); margin-bottom: 2px; }
        .overview-token-live {
          font-family: var(--mono); font-size: 9px; color: #3b82f6;
          background: rgba(59,130,246,0.08); border: 1px solid rgba(59,130,246,0.15);
          padding: 2px 7px; border-radius: 4px;
        }
        .overview-token-none {
          font-family: var(--mono); font-size: 9px; color: var(--text-4);
          background: var(--bg-3); padding: 2px 7px; border-radius: 4px;
        }
        .overview-desc { font-size: 13px; color: var(--text-3); line-height: 1.6; margin-bottom: 8px; }
        .overview-hl {
          font-size: 10px; background: var(--green-light); color: var(--green);
          border: 1px solid rgba(22,163,74,0.12); border-radius: 20px; padding: 2px 8px;
        }

        /* ── ALPHA BREAKDOWN ── */
        .breakdown-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 16px; }
        .breakdown-col {
          background: var(--bg-3);
          border: 1px solid var(--border);
          border-radius: var(--radius);
          padding: 16px;
        }
        .breakdown-col-label {
          font-family: var(--mono); font-size: 9px; letter-spacing: 1.5px; margin-bottom: 14px; font-weight: 700;
          padding-bottom: 10px; border-bottom: 1px solid var(--border);
        }
        .breakdown-item {
          padding: 10px 0;
          border-bottom: 1px solid rgba(0,0,0,0.04);
        }
        .breakdown-item:last-child { border-bottom: none; padding-bottom: 0; }
        .breakdown-item:first-of-type { padding-top: 0; }
        .breakdown-item-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 6px; }
        .breakdown-item-label { font-size: 13px; font-weight: 600; color: var(--text-1); text-transform: capitalize; }
        .breakdown-item-score { font-family: var(--mono); font-size: 14px; font-weight: 800; }
        .breakdown-item-bar { height: 4px; border-radius: 2px; overflow: hidden; margin-bottom: 6px; }
        .breakdown-item-bar-fill { height: 100%; border-radius: 2px; transition: width 0.8s ease; }
        .breakdown-item-detail { font-size: 11px; color: var(--text-3); line-height: 1.6; }
        .conclusion-box { border-radius: var(--radius); padding: 16px 18px; margin-top: 4px; }
        .conclusion-label { font-family: var(--mono); font-size: 9px; letter-spacing: 1.5px; margin-bottom: 6px; font-weight: 700; }
        .conclusion-text { font-size: 13px; color: var(--text-2); line-height: 1.7; }

        /* ── TEAM CARDS ── */
        .team-card {
          background: var(--bg-3);
          border: 1px solid var(--border);
          border-radius: 10px;
          padding: 12px 14px;
          display: flex; align-items: flex-start; gap: 12px;
        }
        .team-avatar { width: 40px; height: 40px; border-radius: 50%; object-fit: cover; border: 1px solid var(--border); }
        .team-avatar-fallback {
          width: 40px; height: 40px; border-radius: 50%;
          background: var(--green-light); color: var(--green);
          display: flex; align-items: center; justify-content: center;
          font-family: var(--mono); font-size: 13px; font-weight: 700;
        }
        .team-name { font-size: 13px; font-weight: 600; color: var(--text-1); }
        .tag-warn { font-family: var(--mono); font-size: 8px; color: var(--amber); background: var(--amber-light); border: 1px solid rgba(217,119,6,0.2); padding: 1px 6px; border-radius: 20px; }
        .tag-ok { font-family: var(--mono); font-size: 8px; color: var(--green); background: var(--green-light); padding: 1px 6px; border-radius: 20px; }
        .team-meta { font-family: var(--mono); font-size: 10px; color: var(--green); margin-bottom: 3px; }
        .team-bg { font-size: 11px; color: var(--text-3); line-height: 1.5; }

        /* ── MODAL ── */
        .modal-overlay {
          position: fixed; inset: 0;
          background: rgba(0,0,0,0.4);
          backdrop-filter: blur(4px);
          z-index: 200;
          display: flex; align-items: center; justify-content: center;
          padding: 16px;
        }
        .modal {
          background: var(--bg-2);
          border: 1px solid var(--border);
          border-radius: 20px;
          padding: 28px;
          width: 100%; max-width: 380px;
          animation: fadeUp 0.3s ease;
          box-shadow: var(--shadow-lg);
        }
        .modal-title { font-size: 16px; font-weight: 700; color: var(--text-1); margin-bottom: 4px; }
        .modal-sub { font-family: var(--mono); font-size: 9px; color: var(--text-4); margin-bottom: 20px; }
        .modal-avatar-btn {
          width: 64px; height: 64px; border-radius: 50%;
          background: var(--bg-3); border: 2px dashed var(--border);
          display: flex; align-items: center; justify-content: center;
          cursor: pointer; overflow: hidden; flex-shrink: 0;
        }
        .modal-avatar-btn img { width: 100%; height: 100%; object-fit: cover; }
        .modal-input {
          width: 100%; background: var(--bg-3); border: 1px solid var(--border);
          border-radius: 8px; padding: 9px 12px; font-size: 13px;
          color: var(--text-1); font-family: var(--font); outline: none;
        }
        .modal-input:focus { border-color: var(--green); }
        .btn-cancel {
          flex: 1; background: none; border: 1px solid var(--border);
          border-radius: 10px; padding: 10px; font-size: 13px;
          color: var(--text-3); cursor: pointer; font-family: var(--font);
        }
        .btn-save {
          flex: 2; background: var(--green); border: none;
          border-radius: 10px; padding: 10px; font-size: 13px;
          font-weight: 700; color: #fff; cursor: pointer; font-family: var(--font);
        }

        /* ── EMPTY ── */
        .empty-state {
          border: 1px dashed var(--border);
          border-radius: var(--radius-lg);
          padding: 48px 24px;
          text-align: center;
        }
        .empty-icon { font-size: 28px; margin-bottom: 10px; opacity: 0.4; }
        .empty-title { font-size: 14px; font-weight: 600; color: var(--text-4); margin-bottom: 4px; }
        .empty-desc { font-size: 12px; color: var(--text-4); }

        /* ── RESPONSIVE ── */
        @media (max-width: 640px) {
          .overview-grid { grid-template-columns: 1fr !important; }
          .breakdown-grid { grid-template-columns: 1fr !important; }
          .how-grid { grid-template-columns: 1fr !important; }
          .search-row { flex-direction: column; }
          .search-btns { width: 100%; }
          .btn-scan { width: 100%; }
          .btn-new { flex: 1; }
          .verdict-header { flex-direction: column; }
        }
      `}</style>

      {/* ── NAV ── */}
      <nav className="nav">
        <a href="/" className="nav-brand">
          <div className="nav-logo">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04a1 1 0 000-1.41l-2.34-2.34a1 1 0 00-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z" fill="#fff"/></svg>
          </div>
          <span className="nav-title">CMV <span>Alpha</span></span>
        </a>
        <div className="nav-links">
          {[{href:'/',label:'Home'},{href:'/tierlist',label:'Tiers'},{href:'/feed',label:'Feed'}].map(({href,label}) => (
            <a key={label} href={href} className="nav-link">{label}</a>
          ))}
          <div className="nav-sep" />
          <button onClick={() => setShowProfileSetup(true)} className="nav-profile">
            {userPhoto ? <img src={userPhoto} alt="" className="nav-profile-img" /> : <div className="nav-profile-fallback">{userName?.charAt(0).toUpperCase() || '?'}</div>}
            <span style={{ fontSize: 11, color: 'var(--text-2)', fontFamily: 'var(--mono)' }}>{userName || 'Profile'}</span>
          </button>
        </div>
      </nav>

      {/* ── PROFILE MODAL ── */}
      {showProfileSetup && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-title">Your Alpha Profile</div>
            <div className="modal-sub">Appears on every verdict card you share</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20 }}>
              <div onClick={() => fileRef.current?.click()} className="modal-avatar-btn">
                {tempPhoto ? <img src={tempPhoto} alt="" /> : <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12" stroke="#9ca3af" strokeWidth="2" strokeLinecap="round"/></svg>}
              </div>
              <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handlePhotoUpload} />
              <div style={{ flex: 1 }}>
                <div style={{ fontFamily: 'var(--mono)', fontSize: 8, color: 'var(--text-4)', letterSpacing: 1, marginBottom: 6 }}>YOUR HANDLE</div>
                <input className="modal-input" placeholder="e.g. @cmvng" maxLength={20} value={tempName} onChange={e => setTempName(e.target.value)} />
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => setShowProfileSetup(false)} className="btn-cancel">Cancel</button>
              <button onClick={() => { saveProfile(tempName, tempPhoto); setShowProfileSetup(false) }} className="btn-save">Save</button>
            </div>
          </div>
        </div>
      )}

      <div style={{ maxWidth: 800, margin: '0 auto', padding: '0 20px 80px' }}>

        {/* ── HERO (only when no result) ── */}
        {showLanding && (
          <>
            <div className="hero animate-in">
              <div className="hero-badge">
                <div className="hero-badge-dot" />
                <span className="hero-badge-text">CRYPTO ALPHA INTELLIGENCE</span>
              </div>
              <h1 className="hero-title">
                Know before<br /><span>you farm.</span>
              </h1>
              <p className="hero-sub">
                Paste any crypto project's X handle. Get instant red flag detection, a verified alpha score, and a shareable verdict card.
              </p>
              <div className="hero-tags">
                {['Red flag detection','17 metrics','AI-powered','Shareable cards','Live token data'].map(t => (
                  <span key={t} className="hero-tag">{t}</span>
                ))}
              </div>
            </div>
          </>
        )}

        {/* ── SEARCH BOX ── */}
        <div className="search-box" style={showLanding ? {} : { marginTop: 24 }}>
          <div className="search-row">
            <input
              className="search-input"
              placeholder="@handle or https://x.com/handle"
              value={xUrl} onChange={e => setXUrl(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && !loading && analyze()}
              disabled={loading}
            />
            <div className="search-btns">
              {result && !loading && (
                <button onClick={() => { setResult(null); setCgData(null); setXData(null); setXUrl(''); setSelectedTags([]) }} className="btn-new">
                  + New Scan
                </button>
              )}
              <button className="btn-scan" onClick={analyze} disabled={loading || !xUrl.trim()}>
                {loading ? 'Scanning...' : 'Analyze'}
              </button>
            </div>
          </div>
          <div className="search-hints">
            <span>try:</span>
            {['eigenlayer','KaitoAI','hyperliquid'].map(ex => (
              <button key={ex} onClick={() => setXUrl('https://x.com/' + ex)} className="search-hint-link">@{ex}</button>
            ))}
          </div>
        </div>

        {/* ── HOW IT WORKS (landing only) ── */}
        {showLanding && (
          <>
            <div className="how-section">
              <div className="section-label">How It Works</div>
              <div className="how-grid">
                <div className="how-card">
                  <div className="how-num">01</div>
                  <div className="how-title">Paste a handle</div>
                  <div className="how-desc">Drop any crypto project's X URL or handle into the search box.</div>
                </div>
                <div className="how-card">
                  <div className="how-num">02</div>
                  <div className="how-title">AI deep research</div>
                  <div className="how-desc">Our AI analyzes 17 metrics across fundamentals, team, opportunity, sentiment, and traction.</div>
                </div>
                <div className="how-card">
                  <div className="how-num">03</div>
                  <div className="how-title">Get your verdict</div>
                  <div className="how-desc">Receive a scored verdict card you can download and share on X.</div>
                </div>
              </div>
            </div>
            <FeaturedProjects />
          </>
        )}

        {/* ── LOADING ── */}
        {loading && (
          <div className="loading-card">
            <div className="loading-bar"><div className="loading-bar-inner" /></div>
            <div className="loading-row">
              <div className="loading-icon"><span>⚡</span></div>
              <div style={{ flex: 1 }}>
                <div className="loading-title">{msg.text}</div>
                <div className="loading-phase">{phase}</div>
              </div>
              <div className="loading-timer">{elapsed}<span>s</span></div>
            </div>
            <div style={{ background: 'var(--green-light)', borderRadius: 8, padding: '7px 12px', border: '1px solid rgba(22,163,74,0.1)', marginBottom: 12 }}>
              <div style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--green)' }}>est. 15-30s · AI analysis running</div>
            </div>
            <div className="shimmer-bar" style={{ width: '100%' }} />
            <div className="shimmer-bar" style={{ width: '78%' }} />
          </div>
        )}

        {/* ── ERROR ── */}
        {error && !loading && (
          <div className={`error-card ${error.startsWith('rate_limit') ? 'rate-limit' : 'fail'}`}>
            {error.startsWith('rate_limit') ? (
              <>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--amber)', marginBottom: 4 }}>High demand — retrying in {error.split(':')[1] || '65'}s</div>
                <div style={{ height: 2, background: 'var(--amber-light)', borderRadius: 2 }}><div style={{ height: '100%', background: 'var(--amber)', borderRadius: 2, width: '60%' }} /></div>
              </>
            ) : error === 'not_crypto' ? (
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 28, marginBottom: 10 }}>🤔</div>
                <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-1)', marginBottom: 6 }}>This doesn't look like a crypto project</div>
                <div style={{ fontSize: 12, color: 'var(--text-3)', marginBottom: 14, lineHeight: 1.6 }}>The X account you entered doesn't appear to be a Web3 or crypto project. Please paste the X link of a crypto project to scan.</div>
                <button onClick={() => { setError(null); setXUrl('') }} style={{ fontSize: 12, padding: '8px 18px', borderRadius: 8, border: '1px solid var(--border)', background: 'none', color: 'var(--text-3)', cursor: 'pointer', fontFamily: 'var(--font)' }}>Try another project</button>
              </div>
            ) : (
              <>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--red)', marginBottom: 6 }}>Scan failed</div>
                <div style={{ fontSize: 12, color: 'var(--text-3)', marginBottom: 10 }}>{error}</div>
                <button onClick={analyze} style={{ fontSize: 12, padding: '6px 14px', borderRadius: 8, border: '1px solid rgba(220,38,38,0.2)', background: 'none', color: 'var(--red)', cursor: 'pointer', fontFamily: 'var(--font)' }}>Try again</button>
              </>
            )}
          </div>
        )}

        {/* ── RESULTS ── */}
        {result && !loading && (
          <div className="animate-in">

            {/* Red flags */}
            {redFlags.length > 0 && (
              <div className="flags-card">
                <div className="flag-header">
                  <div className="flag-icon">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" stroke="#fff" strokeWidth="2" strokeLinecap="round"/></svg>
                  </div>
                  <div style={{ flex: 1 }}>
                    <div className="flag-title">{redFlags.length} Red Flag{redFlags.length > 1 ? 's' : ''} Detected</div>
                    <div className="flag-sub">Score penalised · Proceed with extreme caution</div>
                  </div>
                  <div className="flag-penalty">
                    <div className="flag-penalty-num">-{fudPen}</div>
                    <div className="flag-penalty-label">PENALTY</div>
                  </div>
                </div>
                {redFlags.map((f: any, i: number) => (
                  <div key={i} className="flag-item">
                    <div className="flag-item-label">
                      {f.type === 'dump' ? '📉' : f.type === 'exploit' ? '⚡' : f.type === 'shill' ? '🤥' : '⚠️'} {f.label}
                    </div>
                    <div className="flag-item-detail">{f.detail}</div>
                  </div>
                ))}
              </div>
            )}

            {redFlags.length === 0 && (
              <div className="clean-badge">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M22 11.08V12a10 10 0 11-5.93-9.14M22 4L12 14.01l-3-3" stroke="#16a34a" strokeWidth="2" strokeLinecap="round"/></svg>
                <span>No red flags detected</span>
              </div>
            )}

            {/* ── VERDICT CARD ── */}
            <div className="verdict-card" style={{ background: otc.vbg }}>
              <div className="verdict-bg-circle" style={{ top: -60, right: -60, width: 200, height: 200, background: 'rgba(255,255,255,0.06)' }} />
              <div className="verdict-bg-circle" style={{ bottom: -40, left: -40, width: 140, height: 140, background: 'rgba(0,0,0,0.08)' }} />

              <div className="verdict-user-badge">
                {userPhoto ? <img src={userPhoto} alt="" className="verdict-user-img" /> : <div className="verdict-user-fallback">{userName?.charAt(0)?.toUpperCase() || 'C'}</div>}
                <span style={{ fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.9)' }}>{userName || 'cmvng'} says {otc.v.toLowerCase()} {otc.emoji}</span>
              </div>

              <div className="verdict-header">
                <div className="verdict-logo">
                  {(() => {
                    const imgUrl = xData?.profile_image_url || (xUrl ? `https://unavatar.io/twitter/${xUrl.replace('https://x.com/','').replace('@','').split('/')[0].trim()}` : null)
                    return imgUrl ? <img src={imgUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={(e) => { (e.target as HTMLImageElement).style.display='none' }} /> : <span style={{ fontSize: 20, fontWeight: 800, color: '#fff' }}>{(result.project_name||'?').charAt(0).toUpperCase()}</span>
                  })()}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 3 }}>
                    <span className="verdict-name">{result.project_name}</span>
                    {cgData?.token_live && cgData.ticker && <span className="verdict-ticker">{cgData.ticker} {cgData.token_price}</span>}
                  </div>
                  <div className="verdict-cat">{result.project_category}{result.team_location ? ' · ' + result.team_location : ''}</div>
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <div className="verdict-score">{result.overall_score ?? 0}</div>
                  <div className="verdict-score-label">ALPHA SCORE</div>
                  <div className="verdict-tier">{otc.lbl}</div>
                </div>
              </div>

              {goodHighlights.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginBottom: 14 }}>
                  {goodHighlights.slice(0,4).map((h: string, i: number) => <div key={i} className="verdict-highlight">✓ {h}</div>)}
                </div>
              )}

              <div className="verdict-action-box">
                <div className="verdict-action-title">{otc.v}</div>
                <div className="verdict-action-text">{result.verdict_action || result.verdict_reason}</div>
              </div>

              <div className="verdict-btns">
                <button onClick={downloadCard} className="verdict-btn">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3"/></svg>Download
                </button>
                <button onClick={shareResult} className="verdict-btn">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8M16 6l-4-4-4 4M12 2v13"/></svg>Share to X
                </button>
              </div>
            </div>

            {/* ── PROJECT OVERVIEW ── */}
            <div className="overview-grid">
              <div className="score-tower">
                <div className="score-tower-label">ALPHA SCORE</div>
                <div className="score-tower-num" style={{ color: otc.solid }}>{result.overall_score ?? 0}</div>
                <div className="score-tower-tier" style={{ background: otc.bg, color: otc.tc, border: `1px solid ${otc.border}` }}>{otc.lbl}</div>
                {xData?.cmv_score > 0 && (
                  <div style={{ background: 'var(--bg-3)', borderRadius: 8, padding: '6px 8px', width: '100%', textAlign: 'center', marginTop: 4 }}>
                    <div style={{ fontFamily: 'var(--mono)', fontSize: 7, color: 'var(--text-4)' }}>CMV X</div>
                    <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-1)' }}>{xData.cmv_score}<span style={{ fontSize: 9, color: 'var(--text-4)' }}>/1k</span></div>
                  </div>
                )}
              </div>
              <div className="overview-info">
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
                  <span className="overview-name">{result.project_name}</span>
                  {cgData?.token_live && cgData.ticker
                    ? <span className="overview-token-live">{cgData.ticker} {cgData.token_price}</span>
                    : <span className="overview-token-none">No Token</span>}
                </div>
                {result.team_location && <div style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--text-4)', marginBottom: 6 }}>📍 {result.team_location}{result.founded ? ' · Est. ' + result.founded : ''}</div>}
                <div className="overview-desc">{result.description}</div>
                {goodHighlights.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                    {goodHighlights.map((h: string, i: number) => <span key={i} className="overview-hl">✓ {h}</span>)}
                  </div>
                )}
              </div>
            </div>

            {/* ── VERDICT REASONING ── */}
            {result.verdict_reason && (
              <div className="card" style={{ borderLeft: '3px solid ' + otc.solid, borderRadius: 0 }}>
                <div className="card-label">VERDICT REASONING</div>
                <div style={{ fontSize: 13, color: 'var(--text-2)', lineHeight: 1.7 }}>{result.verdict_reason}</div>
              </div>
            )}

            {/* ── HOW TO PLAY ── */}
            {result.project_category && HOW_TO_PLAY[result.project_category] && (
              <div className="card" style={{ borderLeft: '3px solid var(--green)', borderRadius: 0 }}>
                <div className="card-label">HOW TO PLAY — {result.project_category.toUpperCase()}</div>
                <div style={{ fontSize: 13, color: 'var(--text-2)', lineHeight: 1.7 }}>{HOW_TO_PLAY[result.project_category]}</div>
              </div>
            )}

            {/* ── INVESTORS ── */}
            {(xData?.enriched?.confirmed_investors || []).length > 0 && (
              <div className="card">
                <div className="card-label">INVESTORS & BACKERS</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {(xData.enriched.confirmed_investors || []).map((inv: string, i: number) => (
                    <span key={i} style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-2)', background: 'var(--bg-3)', border: '1px solid var(--border)', borderRadius: 20, padding: '4px 12px' }}>{inv}</span>
                  ))}
                </div>
                {(xData.enriched.total_raised_rootdata || xData.enriched.total_raised_defillama) && (
                  <div style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--green)', marginTop: 10, fontWeight: 600 }}>
                    Total raised: {xData.enriched.total_raised_rootdata || xData.enriched.total_raised_defillama}
                  </div>
                )}
              </div>
            )}

            {/* ── TOKEN + DEEP INTEL ── */}
            {(result.token_data?.token_live || cgData?.token_live || xData?.enriched?.tvl || xData?.enriched?.revenue_24h || xData?.enriched?.fees_24h || (xData?.enriched?.chains || []).length > 0 || result.future_seasons || (xData?.enriched?.coinpaprika_contracts || []).length > 0) && (
            <div className="card">
              <div className="card-label">DEEP INTEL</div>
              {(result.token_data?.token_live || cgData?.token_live) && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 8 }}>
                <div style={{ background: 'var(--bg-3)', border: '1px solid var(--border)', borderRadius: 8, padding: '10px 12px' }}>
                  <div style={{ fontFamily: 'var(--mono)', fontSize: 7, color: 'var(--text-4)', letterSpacing: 1, marginBottom: 5 }}>TOKEN STATUS</div>
                  {(() => {
                    const td = result.token_data?.token_live ? result.token_data : cgData
                    return <span style={{ background: 'var(--green-light)', color: 'var(--green)', border: '1px solid rgba(22,163,74,0.2)', borderRadius: 20, padding: '3px 10px', fontFamily: 'var(--mono)', fontSize: 10, display: 'inline-flex', alignItems: 'center', gap: 5 }}><span style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--green)', display: 'inline-block', animation: 'pulse 2s infinite' }} />{td.ticker} {td.token_price}</span>
                  })()}
                </div>
                {result.post_tge_outlook && (
                  <div style={{ background: 'var(--bg-3)', border: '1px solid var(--border)', borderRadius: 8, padding: '10px 12px' }}>
                    <div style={{ fontFamily: 'var(--mono)', fontSize: 7, color: 'var(--text-4)', letterSpacing: 1, marginBottom: 5 }}>TOKEN OUTLOOK</div>
                    <div style={{ fontSize: 11, fontWeight: 600, color: result.post_tge_outlook?.includes('Poor') ? 'var(--red)' : 'var(--green)' }}>{result.post_tge_outlook}</div>
                  </div>
                )}
              </div>
              )}
              {/* TVL + Revenue from enriched data */}
              {(xData?.enriched?.tvl || xData?.enriched?.revenue_24h || xData?.enriched?.fees_24h) && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 8, marginBottom: 8 }}>
                  {xData.enriched.tvl && (
                    <div style={{ background: 'var(--bg-3)', border: '1px solid var(--border)', borderRadius: 8, padding: '10px 12px' }}>
                      <div style={{ fontFamily: 'var(--mono)', fontSize: 7, color: 'var(--text-4)', letterSpacing: 1, marginBottom: 5 }}>TVL</div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-1)' }}>{xData.enriched.tvl}</div>
                    </div>
                  )}
                  {xData.enriched.revenue_24h && (
                    <div style={{ background: 'var(--bg-3)', border: '1px solid var(--border)', borderRadius: 8, padding: '10px 12px' }}>
                      <div style={{ fontFamily: 'var(--mono)', fontSize: 7, color: 'var(--text-4)', letterSpacing: 1, marginBottom: 5 }}>REVENUE / DAY</div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-1)' }}>{xData.enriched.revenue_24h}</div>
                    </div>
                  )}
                  {xData.enriched.fees_24h && (
                    <div style={{ background: 'var(--bg-3)', border: '1px solid var(--border)', borderRadius: 8, padding: '10px 12px' }}>
                      <div style={{ fontFamily: 'var(--mono)', fontSize: 7, color: 'var(--text-4)', letterSpacing: 1, marginBottom: 5 }}>FEES / DAY</div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-1)' }}>{xData.enriched.fees_24h}</div>
                    </div>
                  )}
                </div>
              )}
              {/* Chains */}
              {(xData?.enriched?.chains || []).length > 0 && (
                <div style={{ background: 'var(--bg-3)', border: '1px solid var(--border)', borderRadius: 8, padding: '10px 12px', marginBottom: 8 }}>
                  <div style={{ fontFamily: 'var(--mono)', fontSize: 7, color: 'var(--text-4)', letterSpacing: 1, marginBottom: 5 }}>CHAINS</div>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {xData.enriched.chains.map((c: string, i: number) => (
                      <span key={i} style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--green)', background: 'var(--green-light)', padding: '2px 8px', borderRadius: 4, fontWeight: 600 }}>{c}</span>
                    ))}
                  </div>
                </div>
              )}
              {result.future_seasons && (
                <div style={{ background: 'var(--bg-3)', border: '1px solid var(--border)', borderRadius: 8, padding: '10px 12px', marginBottom: 8 }}>
                  <div style={{ fontFamily: 'var(--mono)', fontSize: 7, color: 'var(--text-4)', letterSpacing: 1, marginBottom: 4 }}>RECENT COVERAGE</div>
                  <div style={{ fontSize: 11, color: 'var(--text-3)', lineHeight: 1.5 }}>{result.future_seasons}</div>
                </div>
              )}
              {(xData?.enriched?.coinpaprika_contracts || []).length > 0 && (
                <div style={{ background: 'var(--bg-3)', border: '1px solid var(--border)', borderRadius: 8, padding: '10px 12px' }}>
                  <div style={{ fontFamily: 'var(--mono)', fontSize: 7, color: 'var(--text-4)', letterSpacing: 1, marginBottom: 6 }}>CONTRACT ADDRESSES</div>
                  {(xData.enriched.coinpaprika_contracts || []).map((c: any, i: number) => (
                    <div key={i} style={{ marginBottom: 3, display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ fontFamily: 'var(--mono)', fontSize: 8, color: 'var(--green)', background: 'var(--green-light)', padding: '1px 5px', borderRadius: 3 }}>{c.chain}</span>
                      <span style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--text-4)' }}>{c.address.slice(0,8)}...{c.address.slice(-6)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
            )}

            {/* ── RISKS & OPPORTUNITIES ── */}
            {((result.top_risks || []).filter(Boolean).length > 0 || (result.top_opportunities || []).filter(Boolean).length > 0) && (
              <div className="card">
                <div className="card-label">RISKS & OPPORTUNITIES</div>
                <div className="breakdown-grid">
                  <div className="breakdown-col">
                    <div className="breakdown-col-label" style={{ color: 'var(--green)' }}>OPPORTUNITIES</div>
                    {(result.top_opportunities || []).filter(Boolean).length > 0 ? (result.top_opportunities || []).filter(Boolean).map((o: string, i: number) => (
                      <div key={i} style={{ fontSize: 13, color: 'var(--text-2)', marginBottom: 10, paddingLeft: 12, borderLeft: '3px solid var(--green)', lineHeight: 1.6 }}>{o}</div>
                    )) : <div style={{ fontSize: 12, color: 'var(--text-4)', padding: '8px 0' }}>None identified</div>}
                  </div>
                  <div className="breakdown-col">
                    <div className="breakdown-col-label" style={{ color: 'var(--red)' }}>KEY RISKS</div>
                    {(result.top_risks || []).filter(Boolean).length > 0 ? (result.top_risks || []).filter(Boolean).map((r: string, i: number) => (
                      <div key={i} style={{ fontSize: 13, color: 'var(--text-2)', marginBottom: 10, paddingLeft: 12, borderLeft: '3px solid var(--red)', lineHeight: 1.6 }}>{r}</div>
                    )) : <div style={{ fontSize: 12, color: 'var(--text-4)', padding: '8px 0' }}>None identified</div>}
                  </div>
                </div>
              </div>
            )}

            {/* ── TEAM ── */}
            {result.team_members?.filter((m: any) => m.name?.length > 1).length > 0 && (
              <div className="card">
                <div className="card-label">TEAM ({result.team_members.filter((m: any) => m.name?.length > 1).length} members)</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 8 }}>
                  {result.team_members.filter((m: any) => m.name?.length > 1).map((m: any, i: number) => <TeamCardEnriched key={i} member={m} />)}
                </div>
              </div>
            )}

            {/* ── FULL 17 METRICS BREAKDOWN ── */}
            <div className="card">
              <div className="card-label">DETAILED METRICS — 17 POINT ANALYSIS</div>

              {/* Category tabs */}
              <div style={{ display: 'flex', gap: 4, marginBottom: 16, flexWrap: 'wrap' }}>
                {CATS.map(cat => {
                  const cs = catScore(cat)
                  const active = atab === cat
                  return (
                    <button key={cat} onClick={() => setAtab(cat)}
                      style={{ padding: '6px 14px', borderRadius: 8, border: active ? '1.5px solid var(--green)' : '1px solid var(--border)', background: active ? 'var(--green-light)' : 'var(--bg-2)', color: active ? 'var(--green-dark)' : 'var(--text-3)', fontSize: 11, fontWeight: active ? 700 : 500, cursor: 'pointer', fontFamily: 'var(--font)', transition: 'all 0.15s', display: 'flex', alignItems: 'center', gap: 6 }}>
                      {cat}
                      <span style={{ fontFamily: 'var(--mono)', fontSize: 10, fontWeight: 700, color: active ? 'var(--green)' : 'var(--text-4)' }}>{cs}</span>
                    </button>
                  )
                })}
              </div>

              {/* Metric rows for active category */}
              <div>
                {METRICS.filter(m => m.cat === atab).map(metric => {
                  const data = result.metrics?.[metric.id]
                  const sc = typeof data?.score === 'number' ? data.score : 0
                  const tier = getTier(sc)
                  const col = T[tier].solid
                  const sig = data?.signal ?? 'neutral'
                  const sigBg = sig === 'bullish' ? 'var(--green-light)' : sig === 'bearish' ? 'var(--red-light)' : 'var(--bg-3)'
                  const sigTc = sig === 'bullish' ? 'var(--green)' : sig === 'bearish' ? 'var(--red)' : 'var(--text-4)'
                  const detail = data?.detail || data?.summary || data?.why_this_score || ''
                  return (
                    <div key={metric.id} style={{ border: '1px solid var(--border)', borderRadius: 10, padding: '11px 13px', marginBottom: 4, background: 'var(--bg-2)', transition: 'all 0.15s' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                        <span style={{ fontSize: 14, width: 20, textAlign: 'center' }}>{metric.icon}</span>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 5, gap: 8 }}>
                            <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-1)' }}>{metric.label}</span>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                              <span style={{ fontFamily: 'var(--mono)', fontSize: 9, padding: '2px 6px', borderRadius: 20, background: sigBg, color: sigTc, fontWeight: 600 }}>{sig}</span>
                              <span style={{ fontSize: 15, fontWeight: 800, color: col, minWidth: 22, textAlign: 'right', fontFamily: 'var(--mono)' }}>{sc}</span>
                            </div>
                          </div>
                          {/* Score bar */}
                          <div style={{ background: 'var(--bg-3)', borderRadius: 3, height: 4, overflow: 'hidden', marginBottom: detail ? 6 : 0 }}>
                            <div style={{ width: `${sc}%`, height: '100%', background: col, borderRadius: 3, transition: 'width 1s ease' }} />
                          </div>
                          {/* Detail text */}
                          {detail && !/^No |unavailable|unclear|insufficient|not publicly/i.test(detail) && <div style={{ fontSize: 11, color: 'var(--text-3)', lineHeight: 1.6, marginTop: 4 }}>{detail}</div>}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Category score summary */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 6, marginTop: 12 }}>
                {CATS.map(cat => {
                  const cs = catScore(cat)
                  const tier = getTier(cs)
                  return (
                    <div key={cat} style={{ background: 'var(--bg-3)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 6px', textAlign: 'center' }}>
                      <div style={{ fontFamily: 'var(--mono)', fontSize: 7, color: 'var(--text-4)', letterSpacing: 0.5, marginBottom: 4 }}>{cat.slice(0, 5).toUpperCase()}</div>
                      <div style={{ fontSize: 18, fontWeight: 800, color: T[tier].solid }}>{cs}</div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* ── WHAT'S WORKING vs WATCH OUT ── */}
            <div className="card">
              <div className="card-label">ALPHA BREAKDOWN</div>

              <div className="breakdown-grid">
                <div className="breakdown-col">
                  <div className="breakdown-col-label" style={{ color: 'var(--green)' }}>WHAT'S WORKING</div>
                  {goodSides.length > 0 ? goodSides.map((g: any, i: number) => (
                    <div key={i} className="breakdown-item">
                      <div className="breakdown-item-header">
                        <span className="breakdown-item-label">{g.label}</span>
                        <span className="breakdown-item-score" style={{ color: 'var(--green)' }}>{g.score}</span>
                      </div>
                      <div className="breakdown-item-bar" style={{ background: 'rgba(22,163,74,0.1)' }}>
                        <div className="breakdown-item-bar-fill" style={{ width: `${g.score}%`, background: 'var(--green)' }} />
                      </div>
                      {g.detail && !/^No |unavailable|unclear|insufficient|not publicly/i.test(g.detail) && <div className="breakdown-item-detail">{g.detail}</div>}
                    </div>
                  )) : <div style={{ fontSize: 12, color: 'var(--text-4)', padding: '12px 0' }}>No strong positives identified</div>}
                </div>

                <div className="breakdown-col">
                  <div className="breakdown-col-label" style={{ color: 'var(--red)' }}>WATCH OUT</div>
                  {badSides.length > 0 ? badSides.map((b: any, i: number) => (
                    <div key={i} className="breakdown-item">
                      <div className="breakdown-item-header">
                        <span className="breakdown-item-label">{b.label}</span>
                        <span className="breakdown-item-score" style={{ color: 'var(--red)' }}>{b.score}</span>
                      </div>
                      <div className="breakdown-item-bar" style={{ background: 'rgba(220,38,38,0.08)' }}>
                        <div className="breakdown-item-bar-fill" style={{ width: `${b.score}%`, background: 'var(--red)' }} />
                      </div>
                      {b.detail && !/^No |unavailable|unclear|insufficient|not publicly/i.test(b.detail) && <div className="breakdown-item-detail">{b.detail}</div>}
                    </div>
                  )) : <div style={{ fontSize: 12, color: 'var(--text-4)', padding: '12px 0' }}>No major concerns identified</div>}
                </div>
              </div>

              {/* CONCLUSION */}
              <div className="conclusion-box" style={{ background: `linear-gradient(135deg, ${otc.solid}08, ${otc.solid}03)`, border: `1px solid ${otc.solid}20` }}>
                <div className="conclusion-label" style={{ color: otc.solid }}>CONCLUSION</div>
                <div className="conclusion-text">{result.verdict_reason || result.score_rationale}</div>
              </div>
            </div>

          </div>
        )}

        {!loading && !result && !error && !showLanding && (
          <div className="empty-state">
            <div className="empty-icon">🔭</div>
            <div className="empty-title">No project scanned yet</div>
            <div className="empty-desc">Paste any crypto project X URL or handle above.</div>
          </div>
        )}
      </div>
    </div>
  )
}
