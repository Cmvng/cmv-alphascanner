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
    const cacheKey = 'cmv_scan_v4_' + handle

    async function loadFromFeed() {
      let cr: any = null, cc: any = null, cx: any = null

      // 1. Check browser cache (v4 first, then older versions)
      try {
        const cached = localStorage.getItem(cacheKey) || 
                       localStorage.getItem('cmv_scan_v3_' + handle) ||
                       localStorage.getItem('cmv_scan_v2_' + handle)
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
    const cacheKey = `cmv_scan_v4_${handle.toLowerCase()}`
    // Clear old cache versions silently
    try { localStorage.removeItem(`cmv_scan_v3_${handle.toLowerCase()}`); localStorage.removeItem(`cmv_scan_v2_${handle.toLowerCase()}`); localStorage.removeItem(`cmv_scan_${handle.toLowerCase()}`) } catch {}
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
    if (!xd && !handle) {
      setError('Unable to reach X API. Please try again.')
      setLoading(false)
      return
    }

    // Non-crypto detection — check bio for crypto signals
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

    // Use token_data from xproject — already prioritized (DexScreener > GeckoTerminal > CoinGecko)
    if (xd?.token_data?.token_live) {
      cg = xd.token_data
    }

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
      // ── FULL TOOL-NATIVE SCORING ENGINE ──
      const enriched = xd?.enriched || {}

      // Check if we have ANY useful data at all
      const hasXData = (xd?.followers || 0) > 0 || (xd?.tweet_count || 0) > 0
      const hasToolData = !!(enriched.tvl || enriched.total_raised_rootdata ||
        enriched.total_raised_defillama || enriched.dex_volume_24h ||
        (enriched.confirmed_investors || []).length > 0 ||
        (enriched.rootdata_team || []).length > 0)

      // Note: even with low/zero data, still score using what we have
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
      const hasRevenue = !!(enriched.revenue_24h || enriched.fees_24h)
      const revenueScore = enriched.revenue_24h ? 
        (enriched.revenue_24h.includes('M') ? 95 : enriched.revenue_24h.includes('K') ? 75 : 60) : 
        enriched.fees_24h ? 
        (enriched.fees_24h.includes('M') ? 85 : enriched.fees_24h.includes('K') ? 65 : 55) : 
        tvlNum > 1e9 ? 85 : tvlNum > 1e8 ? 75 : tvlNum > 1e7 ? 65 : tvlNum > 1e6 ? 55 : tvlNum > 0 ? 40 : 15

      // 3. Token health (DexScreener)
      const dexDump = enriched.dex_dump_detected
      const dexLiq = enriched.dex_liquidity
      const tokenLive = cg?.token_live || xd?.token_data?.token_live
      const dexToken = xd?.token_data
      const tokenScore = dexDump ? 10 : 
        (tokenLive && dexLiq) ? (dexLiq.includes('M') ? 80 : dexLiq.includes('K') ? 60 : 40) : 
        tokenLive ? 55 :
        xd?.token_launch_hinted ? 50 : 35

      // 4. Community / X presence — only score if real X data came back
      const hasRealXData = followers > 0 || tweetCount > 0
      const followerScore = !hasRealXData ? 50 : followers > 500000 ? 95 : followers > 100000 ? 85 : followers > 50000 ? 75 : followers > 10000 ? 60 : followers > 5000 ? 45 : 25
      const engagementScore = !hasRealXData ? 50 : avgLikes > 1000 ? 90 : avgLikes > 500 ? 75 : avgLikes > 100 ? 60 : avgLikes > 20 ? 45 : 20

      // 5. Team credibility (RootData + X)
      const team = (enriched.rootdata_team || []).filter((t: any) => t.name && t.name.length > 1)
      const teamScore = team.length > 4 ? 90 : team.length > 2 ? 75 : team.length > 0 ? 65 : verified ? 55 : accountAge > 3 ? 50 : 30

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
      const verdict = cappedScore >= 95 ? 'ALPHA PLAY' : cappedScore >= 85 ? 'FARM IT' : cappedScore >= 60 ? 'ENGAGE' : cappedScore >= 35 ? 'OBSERVE' : 'AVOID'

      // ── GENERATE HIGHLIGHTS FROM TOOLS ──
      const highlights: string[] = []
      if (hasRaised) highlights.push(`${enriched.total_raised_rootdata || enriched.total_raised_defillama} raised`)
      if (hasTopVC) highlights.push(`Backed by ${investors.slice(0,2).join(', ')}`)
      if (tvl) highlights.push(`${tvl} TVL deployed`)
      if (revenue) highlights.push(`${revenue} daily revenue`)
      if (hasRealXData && followers > 10000) highlights.push(`${(followers/1000).toFixed(0)}K X followers`)
      if (team.length > 0) highlights.push(`${team.length} verified team members`)
      if (verified) highlights.push('Verified X account')
      if (enriched.chains?.length > 0) highlights.push(`Live on ${enriched.chains.slice(0,2).join(', ')}`)

      // ── VERDICT REASON FROM TOOLS ──
      const parts: string[] = []
      if (enriched.defillama_category) parts.push(`${enriched.defillama_category} project`)
      if (hasRaised && hasTopVC) parts.push(`Backed by top VCs including ${investors[0]}`)
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

      // ── BUILD FULL RESULT ──
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
        score_rationale: `Tool-native score: Funding ${fundingScore}/100 · Revenue ${revenueScore}/100 · Community ${followerScore}/100 · Team ${teamScore}/100. FUD penalty: -${fudPenalty}pts. Raw: followers=${xd?.followers || 0} tvl=${enriched.tvl || 'none'} investors=${(enriched.confirmed_investors||[]).length} sentiment=${enriched.news_sentiment || 'none'}`,
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
          hasTopVC ? `VC backing from ${investors[0]} adds credibility` : null,
          enriched.chains?.length > 1 ? `Multi-chain deployment on ${enriched.chains.join(', ')}` : null,
        ].filter(Boolean).slice(0, 3),
        team_members: (enriched.rootdata_team || []).filter((t: any) => t.name && t.name.length > 1).map((t: any) => ({
          name: t.name,
          role: t.role || '',
          x_handle: t.x_handle || '',
          background: enriched.coinpaprika_description ? `${enriched.coinpaprika_description.slice(0, 100)}` : '',
          confirmed: !!(t.x_handle),
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
          revenue: { score: revenueScore, summary: enriched.revenue_24h ? `${enriched.revenue_24h} daily revenue` : enriched.fees_24h ? `${enriched.fees_24h} daily fees` : tvl ? `${tvl} TVL (no revenue data)` : 'No revenue data found' },
          community: { score: followerScore, summary: hasRealXData ? `${followers.toLocaleString()} followers, ${(avgLikes).toFixed(0)} avg likes, account ${accountAge.toFixed(1)}y old` : 'X API unavailable — community data not retrieved' },
          team: { score: teamScore, summary: team.length > 0 ? `${team.length} team member${team.length > 1 ? 's' : ''} found via RootData: ${team.slice(0,3).map((t: any) => t.name + (t.role ? ' (' + t.role + ')' : '')).join(', ')}` : verified ? 'Verified X account — no team data on RootData' : 'No team data found' },
          sentiment: { score: sentimentScore, summary: `${sentiment || 'neutral'} news sentiment from ${enriched.news_article_count || 0} articles` },
          security: { score: securityScore, summary: hacks.length > 0 ? `${hacks.length} known exploit(s) on DefiLlama` : 'No known security incidents' },
        },
        post_tge_outlook: tokenLive ? (dexDump ? 'Poor — token declining' : 'Moderate') : 'Token not yet live',
        project_follows: null,
        future_seasons: enriched.news_recent?.length > 0 ? `Recent coverage: ${enriched.news_recent.slice(0,2).join('. ')}` : null,
        mindshare_trend: null,
        token_data: cg?.token_live ? cg : (xd?.token_data?.token_live ? xd.token_data : null),
      }
      saveResult(cleaned)
    }

    // Run Claude via serverless function — avoids CORS and key exposure
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
          // API key missing or wrong - fall to xOnlyScan but log clearly
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
      // Merge auto FUD flags Claude may have missed
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

    // Twitter: 1200x628 at 2x = 2400x1256 for crisp display
    const W = 1200, H = 628, DPR = 2
    const canvas = document.createElement('canvas')
    canvas.width = W * DPR; canvas.height = H * DPR
    const ctx = canvas.getContext('2d')!
    ctx.scale(DPR, DPR)

    const loadImg = (src: string): Promise<HTMLImageElement | null> => new Promise(resolve => {
      const img = new Image(); const t = setTimeout(() => resolve(null), 4000)
      img.crossOrigin = 'anonymous'
      img.onload = () => { clearTimeout(t); resolve(img) }
      img.onerror = () => {
        const img2 = new Image(); const t2 = setTimeout(() => resolve(null), 3000)
        img2.onload = () => { clearTimeout(t2); resolve(img2) }
        img2.onerror = () => { clearTimeout(t2); resolve(null) }
        img2.src = src
      }
      img.src = src
    })

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

    // ── BACKGROUND: dark gradient matching theme ──
    const bg = ctx.createLinearGradient(0, 0, W, H)
    bg.addColorStop(0, '#0a0a0f'); bg.addColorStop(1, '#0f1420')
    ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H)

    // Colored accent panel (left 45%)
    const accentGrad = ctx.createLinearGradient(0, 0, W * 0.45, H)
    accentGrad.addColorStop(0, colors[0] + 'cc'); accentGrad.addColorStop(1, colors[0] + '33')
    ctx.fillStyle = accentGrad; ctx.fillRect(0, 0, W * 0.45, H)

    // Subtle grid overlay
    ctx.save(); ctx.globalAlpha = 0.03; ctx.strokeStyle = '#fff'; ctx.lineWidth = 0.5
    for (let x = 0; x < W; x += 40) { ctx.beginPath(); ctx.moveTo(x,0); ctx.lineTo(x,H); ctx.stroke() }
    for (let y = 0; y < H; y += 40) { ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(W,y); ctx.stroke() }
    ctx.restore()

    // Decorative circles
    ctx.save(); ctx.globalAlpha = 0.08; ctx.fillStyle = '#fff'
    ctx.beginPath(); ctx.arc(W * 0.42, -40, 200, 0, Math.PI * 2); ctx.fill()
    ctx.beginPath(); ctx.arc(20, H + 20, 150, 0, Math.PI * 2); ctx.fill()
    ctx.restore()

    const PAD = 44

    // ── LEFT: Project info ──
    // Logo
    const pfpSrc = xData?.profile_image_url?.replace('_normal','_400x400') ||
      (xUrl ? `https://unavatar.io/twitter/${xUrl.replace('https://x.com/','').replace('https://twitter.com/','').replace('@','').split('/')[0].trim()}` : null)
    const pfpImg = pfpSrc ? await loadImg(pfpSrc) : null
    if (pfpImg) {
      ctx.save(); ctx.beginPath(); ctx.arc(PAD + 42, 74, 38, 0, Math.PI * 2); ctx.clip()
      ctx.drawImage(pfpImg, PAD + 4, 36, 76, 76); ctx.restore()
      ctx.strokeStyle = 'rgba(255,255,255,0.5)'; ctx.lineWidth = 2
      ctx.beginPath(); ctx.arc(PAD + 42, 74, 38, 0, Math.PI * 2); ctx.stroke()
    } else {
      ctx.fillStyle = 'rgba(255,255,255,0.1)'
      ctx.beginPath(); ctx.arc(PAD + 42, 74, 38, 0, Math.PI * 2); ctx.fill()
      ctx.fillStyle = '#fff'; ctx.font = 'bold 28px Arial'; ctx.textAlign = 'center'
      ctx.fillText((result.project_name||'?').charAt(0).toUpperCase(), PAD + 42, 84); ctx.textAlign = 'left'
    }

    // Project name
    ctx.fillStyle = '#fff'; ctx.font = 'bold 36px Arial'
    ctx.fillText((result.project_name||'').slice(0, 20), PAD + 96, 64)

    // Category + location line
    const meta = [result.project_category, result.team_location].filter(Boolean).join(' · ')
    ctx.fillStyle = 'rgba(255,255,255,0.5)'; ctx.font = '13px Arial'
    ctx.fillText(meta.slice(0,48), PAD + 96, 85)

    // Token pill
    if (cgData?.token_live && cgData.ticker) {
      const tok = cgData.ticker + (cgData.token_price ? '  ' + cgData.token_price : '')
      ctx.font = 'bold 11px monospace'
      const tw = ctx.measureText(tok).width + 18
      ctx.fillStyle = 'rgba(22,163,74,0.3)'; ctx.strokeStyle = 'rgba(22,163,74,0.5)'; ctx.lineWidth = 1
      ctx.beginPath(); (ctx as any).roundRect(PAD + 96, 93, tw, 20, 10); ctx.fill(); ctx.stroke()
      ctx.fillStyle = '#fff'; ctx.fillText(tok, PAD + 105, 107)
    }

    // Divider
    ctx.strokeStyle = 'rgba(255,255,255,0.1)'; ctx.lineWidth = 1
    ctx.beginPath(); ctx.moveTo(PAD, 128); ctx.lineTo(W * 0.44, 128); ctx.stroke()

    // Description
    ctx.fillStyle = 'rgba(255,255,255,0.75)'; ctx.font = '14px Arial'
    wrap(result.description || '', PAD, 152, W * 0.44 - PAD - 10, 22, 3)

    // Highlights
    let hlY = 218
    ctx.font = 'bold 11px Arial'
    highlights.forEach((h: string) => {
      const label = '✓  ' + (h.length > 56 ? h.slice(0,54)+'…' : h)
      const pw = Math.min(ctx.measureText(label).width + 20, W * 0.44 - PAD - 10)
      ctx.fillStyle = 'rgba(255,255,255,0.08)'
      ctx.beginPath(); (ctx as any).roundRect(PAD, hlY, pw, 24, 12); ctx.fill()
      ctx.fillStyle = 'rgba(255,255,255,0.9)'; ctx.fillText(label, PAD + 10, hlY + 16)
      hlY += 32
    })

    // Red flag pill
    if (flagCount > 0) {
      ctx.font = 'bold 11px Arial'
      const fl = '🚨  ' + flagCount + ' red flag' + (flagCount > 1 ? 's' : '')
      const fw = ctx.measureText(fl).width + 18
      ctx.fillStyle = 'rgba(220,38,38,0.8)'
      ctx.beginPath(); (ctx as any).roundRect(PAD, hlY + 4, fw, 24, 12); ctx.fill()
      ctx.fillStyle = '#fff'; ctx.fillText(fl, PAD + 9, hlY + 19)
    }

    // ── DIVIDER LINE ──
    ctx.strokeStyle = 'rgba(255,255,255,0.08)'; ctx.lineWidth = 1
    ctx.beginPath(); ctx.moveTo(W * 0.46, 30); ctx.lineTo(W * 0.46, H - 30); ctx.stroke()

    // ── RIGHT: Score + verdict ──
    const RX = W * 0.48

    // Tier badge
    ctx.fillStyle = colors[0] + '33'; ctx.strokeStyle = colors[0] + '66'; ctx.lineWidth = 1
    ctx.beginPath(); (ctx as any).roundRect(RX, 28, 80, 26, 13); ctx.fill(); ctx.stroke()
    ctx.fillStyle = '#fff'; ctx.font = 'bold 11px monospace'; ctx.textAlign = 'center'
    ctx.fillText(otc.lbl, RX + 40, 45); ctx.textAlign = 'left'

    // Big score
    ctx.fillStyle = '#fff'; ctx.font = 'bold 110px Arial'; ctx.textAlign = 'right'
    ctx.fillText(String(result.overall_score ?? 0), W - PAD, 118)
    ctx.font = '11px monospace'; ctx.fillStyle = 'rgba(255,255,255,0.35)'
    ctx.fillText('ALPHA SCORE', W - PAD, 136); ctx.textAlign = 'left'

    // User badge
    const UY = 168
    const uImg = userPhoto ? await loadImg(userPhoto) : null
    if (uImg) {
      ctx.save(); ctx.beginPath(); ctx.arc(RX + 18, UY, 16, 0, Math.PI * 2); ctx.clip()
      ctx.drawImage(uImg, RX + 2, UY - 16, 32, 32); ctx.restore()
      ctx.strokeStyle = 'rgba(255,255,255,0.5)'; ctx.lineWidth = 1.5
      ctx.beginPath(); ctx.arc(RX + 18, UY, 16, 0, Math.PI * 2); ctx.stroke()
    } else {
      ctx.fillStyle = colors[0]; ctx.beginPath(); ctx.arc(RX + 18, UY, 16, 0, Math.PI * 2); ctx.fill()
      ctx.fillStyle = '#fff'; ctx.font = 'bold 12px Arial'; ctx.textAlign = 'center'
      ctx.fillText((userName||'C').charAt(0).toUpperCase(), RX + 18, UY + 4); ctx.textAlign = 'left'
    }
    ctx.fillStyle = 'rgba(255,255,255,0.4)'; ctx.font = '10px Arial'
    ctx.fillText('@' + (userName||'cmvng') + ' says', RX + 44, UY - 5)
    ctx.fillStyle = '#fff'; ctx.font = 'bold 17px Arial'
    ctx.fillText(otc.v, RX + 44, UY + 12)

    // Verdict box
    const VBY = UY + 32, RW = W - RX - PAD
    ctx.fillStyle = colors[0] + '22'
    ctx.beginPath(); (ctx as any).roundRect(RX, VBY, RW, H - VBY - 36, 14); ctx.fill()
    ctx.strokeStyle = colors[0] + '44'; ctx.lineWidth = 1
    ctx.beginPath(); (ctx as any).roundRect(RX, VBY, RW, H - VBY - 36, 14); ctx.stroke()
    ctx.fillStyle = '#fff'; ctx.font = 'bold 13px Arial'
    wrap(result.verdict_action || result.verdict_reason || '', RX + 16, VBY + 28, RW - 32, 21, 8)

    // Footer
    ctx.fillStyle = 'rgba(255,255,255,0.2)'; ctx.font = '10px monospace'; ctx.textAlign = 'center'
    ctx.fillText('CMV ALPHASCANNER  ·  cmv-alphascanner.vercel.app', W / 2, H - 14)
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

  // ── Good vs Bad vs Conclusion for bottom section ──
  const goodSides = result ? Object.entries(result.metrics || {})
    .filter(([,d]: any) => d.signal === 'bullish' && d.score >= 70)
    .sort(([,a]: any, [,b]: any) => b.score - a.score)
    .slice(0, 4)
    .map(([k, d]: any) => ({ key: k, label: k.replace(/_/g,' '), score: d.score, detail: d.detail || d.summary || '' })) : []

  const badSides = result ? Object.entries(result.metrics || {})
    .filter(([,d]: any) => d.signal === 'bearish' || d.score < 45)
    .sort(([,a]: any, [,b]: any) => a.score - b.score)
    .slice(0, 4)
    .map(([k, d]: any) => ({ key: k, label: k.replace(/_/g,' '), score: d.score, detail: d.detail || d.summary || '' })) : []

  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0f', fontFamily: "'Inter',sans-serif", color: '#fff' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;500;600;700;800&family=DM+Mono:wght@400;500&family=Inter:wght@300;400;500;600&display=swap');
        *{box-sizing:border-box;margin:0;padding:0;}
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes fadeUp{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}
        @keyframes scan{0%{transform:translateX(-100%)}100%{transform:translateX(500%)}}
        @keyframes pulse{0%,100%{opacity:0.4}50%{opacity:1}}
        @keyframes shimmer{0%{background-position:-700px 0}100%{background-position:700px 0}}
        @keyframes pop{0%{transform:scale(0.9);opacity:0}60%{transform:scale(1.02)}100%{transform:scale(1);opacity:1}}
        @keyframes glow{0%,100%{box-shadow:0 0 20px rgba(22,163,74,0.15)}50%{box-shadow:0 0 40px rgba(22,163,74,0.3)}}
        .nav-link{transition:color 0.2s;opacity:0.6;} .nav-link:hover{opacity:1;}
        .scan-btn:hover{transform:translateY(-1px);box-shadow:0 8px 32px rgba(22,163,74,0.4);}
        .scan-btn{transition:all 0.2s;}
        .metric-card:hover{background:#1a1a2e!important;border-color:#2d2d4e!important;}
        .metric-card{transition:all 0.15s;}
        input:focus{outline:none;}
        ::-webkit-scrollbar{width:4px;} ::-webkit-scrollbar-track{background:#0a0a0f;} ::-webkit-scrollbar-thumb{background:#2d2d4e;border-radius:2px;}
        @media(max-width:640px){
          .hero-grid{grid-template-columns:1fr!important;}
          .result-grid{grid-template-columns:1fr!important;}
          .metrics-grid{grid-template-columns:1fr!important;}
        }
      `}</style>

      {/* ── NAV ── */}
      <nav style={{ background: 'rgba(10,10,15,0.8)', backdropFilter: 'blur(20px)', borderBottom: '1px solid rgba(255,255,255,0.06)', padding: '0 24px', display: 'flex', alignItems: 'center', height: 58, position: 'sticky', top: 0, zIndex: 100 }}>
        <a href="/" style={{ display: 'flex', alignItems: 'center', gap: 9, textDecoration: 'none' }}>
          <div style={{ width: 30, height: 30, background: 'linear-gradient(135deg,#16a34a,#14532d)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04a1 1 0 000-1.41l-2.34-2.34a1 1 0 00-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z" fill="#fff"/></svg>
          </div>
          <span style={{ fontSize: 14, fontWeight: 700, color: '#fff', fontFamily: "'Syne',sans-serif", letterSpacing: -0.3 }}>CMV <span style={{ color: '#16a34a' }}>Alpha</span></span>
        </a>
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 4 }}>
          {[{href:'/',label:'Home'},{href:'/tierlist',label:'Tiers'},{href:'/feed',label:'Feed'}].map(({href,label}) => (
            <a key={label} href={href} className="nav-link" style={{ fontFamily: "'DM Mono',monospace", fontSize: 10, color: '#fff', textDecoration: 'none', padding: '5px 10px', borderRadius: 6 }}>{label}</a>
          ))}
          <div style={{ width: 1, height: 16, background: 'rgba(255,255,255,0.1)', margin: '0 6px' }} />
          <button onClick={() => setShowProfileSetup(true)} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 20, padding: '4px 10px 4px 5px', cursor: 'pointer' }}>
            {userPhoto ? <img src={userPhoto} alt="" style={{ width: 20, height: 20, borderRadius: '50%', objectFit: 'cover' }} /> : <div style={{ width: 20, height: 20, borderRadius: '50%', background: '#16a34a', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 8, fontWeight: 700 }}>{userName?.charAt(0).toUpperCase() || '?'}</div>}
            <span style={{ fontSize: 11, color: '#fff', fontFamily: "'DM Mono',monospace" }}>{userName || 'Profile'}</span>
          </button>
        </div>
      </nav>

      {/* ── PROFILE MODAL ── */}
      {showProfileSetup && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div style={{ background: '#111117', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 20, padding: 28, width: '100%', maxWidth: 380, animation: 'fadeUp 0.3s ease' }}>
            <div style={{ fontSize: 16, fontWeight: 700, color: '#fff', marginBottom: 4, fontFamily: "'Syne',sans-serif" }}>Your Alpha Profile</div>
            <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 9, color: '#6b7280', marginBottom: 20 }}>Appears on every verdict card you share</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20 }}>
              <div onClick={() => fileRef.current?.click()} style={{ width: 64, height: 64, borderRadius: '50%', background: 'rgba(255,255,255,0.05)', border: '2px dashed rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', overflow: 'hidden', flexShrink: 0 }}>
                {tempPhoto ? <img src={tempPhoto} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12" stroke="#6b7280" strokeWidth="2" strokeLinecap="round"/></svg>}
              </div>
              <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handlePhotoUpload} />
              <div style={{ flex: 1 }}>
                <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 8, color: '#6b7280', letterSpacing: 1, marginBottom: 6 }}>YOUR HANDLE</div>
                <input style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '9px 12px', fontSize: 13, color: '#fff', fontFamily: 'inherit' }} placeholder="e.g. @cmvng" maxLength={20} value={tempName} onChange={e => setTempName(e.target.value)} />
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => setShowProfileSetup(false)} style={{ flex: 1, background: 'none', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, padding: 10, fontSize: 13, color: '#6b7280', cursor: 'pointer', fontFamily: 'inherit' }}>Cancel</button>
              <button onClick={() => { saveProfile(tempName, tempPhoto); setShowProfileSetup(false) }} style={{ flex: 2, background: '#16a34a', border: 'none', borderRadius: 10, padding: 10, fontSize: 13, fontWeight: 700, color: '#fff', cursor: 'pointer', fontFamily: 'inherit' }}>Save</button>
            </div>
          </div>
        </div>
      )}

      <div style={{ maxWidth: 860, margin: '0 auto', padding: '32px 20px 80px' }}>

        {/* ── HERO ── */}
        {!result && !loading && (
          <div style={{ textAlign: 'center', padding: '52px 0 44px', animation: 'fadeUp 0.6s ease' }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'rgba(22,163,74,0.12)', border: '1px solid rgba(22,163,74,0.25)', borderRadius: 20, padding: '5px 14px', marginBottom: 24 }}>
              <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#16a34a', animation: 'pulse 2s infinite' }} />
              <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 10, color: '#16a34a', letterSpacing: 1 }}>CRYPTO ALPHA INTELLIGENCE</span>
            </div>
            <h1 style={{ fontSize: 'clamp(38px,5.5vw,68px)', fontWeight: 800, color: '#fff', lineHeight: 1.0, letterSpacing: -2, marginBottom: 18, fontFamily: "'Syne',sans-serif" }}>
              Know before<br /><span style={{ color: '#16a34a' }}>you farm.</span>
            </h1>
            <p style={{ fontSize: 15, color: 'rgba(255,255,255,0.5)', lineHeight: 1.7, maxWidth: 400, margin: '0 auto 36px' }}>
              Paste any crypto project's X handle. Get instant red flag detection, a verified alpha score, and a shareable verdict card.
            </p>
            <div style={{ display: 'flex', justifyContent: 'center', gap: 8, flexWrap: 'wrap' as const }}>
              {['Red flag detection','17 metrics','AI-powered','Shareable cards','Token data'].map(t => (
                <span key={t} style={{ fontFamily: "'DM Mono',monospace", fontSize: 9, color: 'rgba(255,255,255,0.4)', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 20, padding: '4px 12px' }}>{t}</span>
              ))}
            </div>
          </div>
        )}

        {/* ── SEARCH BOX ── */}
        <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 16, padding: 16, marginBottom: 16, backdropFilter: 'blur(10px)' }}>
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              style={{ flex: 1, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, padding: '13px 16px', fontSize: 14, color: '#fff', fontFamily: "'DM Mono',monospace", transition: 'border-color 0.2s' }}
              placeholder="@handle or https://x.com/handle"
              value={xUrl} onChange={e => setXUrl(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && !loading && analyze()}
              disabled={loading}
              onFocus={e => e.target.style.borderColor = 'rgba(22,163,74,0.5)'}
              onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.1)'}
            />
            <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
              {result && !loading && (
                <button onClick={() => { setResult(null); setCgData(null); setXData(null); setXUrl(''); setSelectedTags([]) }}
                  style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, padding: '13px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer', color: 'rgba(255,255,255,0.7)', fontFamily: 'inherit', whiteSpace: 'nowrap' as const }}>
                  + New Scan
                </button>
              )}
              <button className="scan-btn" onClick={analyze} disabled={loading || !xUrl.trim()}
                style={{ background: loading || !xUrl.trim() ? 'rgba(255,255,255,0.06)' : '#16a34a', color: loading || !xUrl.trim() ? 'rgba(255,255,255,0.3)' : '#fff', border: 'none', borderRadius: 10, padding: '13px 24px', fontSize: 14, fontWeight: 600, cursor: loading || !xUrl.trim() ? 'not-allowed' : 'pointer', whiteSpace: 'nowrap' as const, fontFamily: "'Syne',sans-serif" }}>
                {loading ? 'Scanning...' : 'Analyze →'}
              </button>
            </div>
          </div>
          <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 9, color: 'rgba(255,255,255,0.25)', marginTop: 10, display: 'flex', gap: 8, alignItems: 'center' }}>
            <span>try:</span>
            {['eigenlayer','KaitoAI','hyperliquid'].map(ex => (
              <button key={ex} onClick={() => setXUrl('https://x.com/' + ex)} style={{ fontFamily: "'DM Mono',monospace", fontSize: 9, color: '#16a34a', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>@{ex}</button>
            ))}
          </div>
        </div>

        {/* ── LOADING ── */}
        {loading && (
          <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 16, padding: 28, marginBottom: 16, position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: 'rgba(22,163,74,0.15)' }}>
              <div style={{ height: '100%', background: 'linear-gradient(90deg,transparent,#16a34a,transparent)', animation: 'scan 2s linear infinite' }} />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24 }}>
              <div style={{ width: 48, height: 48, borderRadius: '50%', border: '1.5px solid rgba(22,163,74,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <span style={{ fontSize: 20, animation: 'spin 3s linear infinite' }}>⚡</span>
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 15, fontWeight: 600, color: '#fff', marginBottom: 4, fontFamily: "'Syne',sans-serif" }}>{msg.text}</div>
                <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 10, color: 'rgba(255,255,255,0.35)' }}>{phase}</div>
              </div>
              <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 24, fontWeight: 800, color: '#16a34a' }}>{elapsed}<span style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>s</span></div>
            </div>
            <div style={{ background: 'rgba(22,163,74,0.06)', borderRadius: 8, padding: '8px 12px', border: '1px solid rgba(22,163,74,0.1)', marginBottom: 12 }}>
              <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 10, color: 'rgba(22,163,74,0.8)' }}>est. 15-30s · AI analysis running</div>
            </div>
            {['100%','78%'].map((w,i) => <div key={i} style={{ height: 32, background: 'linear-gradient(90deg,rgba(255,255,255,0.03) 25%,rgba(255,255,255,0.06) 50%,rgba(255,255,255,0.03) 75%)', backgroundSize: '700px 100%', animation: 'shimmer 1.8s infinite', borderRadius: 8, marginBottom: 8, width: w }} />)}
          </div>
        )}

        {/* ── ERROR ── */}
        {error && !loading && (
          <div style={{ background: error.startsWith('rate_limit') ? 'rgba(245,158,11,0.08)' : 'rgba(220,38,38,0.08)', border: `1px solid ${error.startsWith('rate_limit') ? 'rgba(245,158,11,0.2)' : 'rgba(220,38,38,0.2)'}`, borderRadius: 12, padding: '18px 20px', marginBottom: 14 }}>
            {error.startsWith('rate_limit') ? (
              <><div style={{ fontSize: 13, fontWeight: 600, color: '#f59f00', marginBottom: 4 }}>⏳ High demand — retrying in {error.split(':')[1] || '65'}s</div><div style={{ height: 2, background: 'rgba(245,158,11,0.2)', borderRadius: 2 }}><div style={{ height: '100%', background: '#f59f00', borderRadius: 2, width: '60%' }} /></div></>
            ) : error === 'not_crypto' ? (
              <div style={{ textAlign: 'center' as const }}>
                <div style={{ fontSize: 28, marginBottom: 10 }}>🤔</div>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#fff', marginBottom: 6 }}>This doesn't look like a crypto project</div>
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginBottom: 14, lineHeight: 1.6 }}>The X account you entered doesn't appear to be a Web3 or crypto project. Please paste the X link of a crypto project to scan.</div>
                <button onClick={() => { setError(null); setXUrl('') }} style={{ fontSize: 12, padding: '8px 18px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.15)', background: 'none', color: 'rgba(255,255,255,0.6)', cursor: 'pointer', fontFamily: 'inherit' }}>Try another project</button>
              </div>
            ) : (
              <><div style={{ fontSize: 13, fontWeight: 600, color: '#ef4444', marginBottom: 6 }}>⚠️ Scan failed</div><div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginBottom: 10 }}>{error}</div><button onClick={analyze} style={{ fontSize: 12, padding: '6px 14px', borderRadius: 8, border: '1px solid rgba(220,38,38,0.3)', background: 'none', color: '#ef4444', cursor: 'pointer', fontFamily: 'inherit' }}>Try again</button></>
            )}
          </div>
        )}

        {/* ── RESULTS ── */}
        {result && !loading && (
          <div style={{ animation: 'fadeUp 0.4s ease' }}>

            {/* Red flags */}
            {redFlags.length > 0 && (
              <div style={{ background: 'rgba(220,38,38,0.08)', border: '1.5px solid rgba(220,38,38,0.25)', borderRadius: 14, padding: '16px 18px', marginBottom: 12, animation: 'pop 0.4s ease' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                  <div style={{ width: 34, height: 34, background: '#dc2626', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" stroke="#fff" strokeWidth="2" strokeLinecap="round"/></svg>
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: '#ef4444', fontFamily: "'Syne',sans-serif" }}>🚨 {redFlags.length} Red Flag{redFlags.length > 1 ? 's' : ''} Detected</div>
                    <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 9, color: 'rgba(239,68,68,0.7)' }}>Score penalised · Proceed with extreme caution</div>
                  </div>
                  <div style={{ background: '#dc2626', borderRadius: 8, padding: '5px 10px', textAlign: 'center' as const }}>
                    <div style={{ fontSize: 15, fontWeight: 800, color: '#fff' }}>-{fudPen}</div>
                    <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 7, color: 'rgba(255,255,255,0.7)' }}>PENALTY</div>
                  </div>
                </div>
                {redFlags.map((f: any, i: number) => (
                  <div key={i} style={{ background: 'rgba(220,38,38,0.06)', border: '1px solid rgba(220,38,38,0.15)', borderLeft: '3px solid #dc2626', borderRadius: 8, padding: '10px 14px', marginBottom: 8 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
                      <span style={{ fontSize: 11 }}>{f.type === 'dump' ? '📉' : f.type === 'exploit' ? '⚡' : f.type === 'shill' ? '🤥' : '⚠️'}</span>
                      <span style={{ fontSize: 12, fontWeight: 600, color: '#ef4444', fontFamily: "'Syne',sans-serif" }}>{f.label}</span>
                    </div>
                    <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', lineHeight: 1.6 }}>{f.detail}</div>
                  </div>
                ))}
              </div>
            )}

            {redFlags.length === 0 && (
              <div style={{ background: 'rgba(22,163,74,0.06)', border: '1px solid rgba(22,163,74,0.15)', borderRadius: 10, padding: '10px 14px', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M22 11.08V12a10 10 0 11-5.93-9.14M22 4L12 14.01l-3-3" stroke="#16a34a" strokeWidth="2" strokeLinecap="round"/></svg>
                <span style={{ fontSize: 12, fontWeight: 600, color: '#16a34a' }}>No red flags detected</span>
              </div>
            )}

            {/* ── VERDICT CARD ── */}
            <div style={{ background: otc.vbg, borderRadius: 20, padding: 24, marginBottom: 12, position: 'relative', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', top: -60, right: -60, width: 220, height: 220, borderRadius: '50%', background: 'rgba(255,255,255,0.06)', pointerEvents: 'none' }} />
              <div style={{ position: 'absolute', bottom: -40, left: -40, width: 160, height: 160, borderRadius: '50%', background: 'rgba(0,0,0,0.1)', pointerEvents: 'none' }} />

              {/* User badge */}
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 7, background: 'rgba(0,0,0,0.2)', borderRadius: 20, padding: '4px 12px 4px 5px', marginBottom: 16 }}>
                {userPhoto ? <img src={userPhoto} alt="" style={{ width: 24, height: 24, borderRadius: '50%', objectFit: 'cover' }} /> : <div style={{ width: 24, height: 24, borderRadius: '50%', background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, color: '#fff' }}>{userName?.charAt(0)?.toUpperCase() || 'C'}</div>}
                <span style={{ fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.9)' }}>{userName || 'cmvng'} says {otc.v.toLowerCase()} {otc.emoji}</span>
              </div>

              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, marginBottom: 16 }}>
                <div style={{ width: 52, height: 52, borderRadius: 13, overflow: 'hidden', background: 'rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, border: '1.5px solid rgba(255,255,255,0.25)' }}>
                  {(() => {
                    const imgUrl = xData?.profile_image_url || (xUrl ? `https://unavatar.io/twitter/${xUrl.replace('https://x.com/','').replace('@','').split('/')[0].trim()}` : null)
                    return imgUrl ? <img src={imgUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' as const }} onError={(e) => { (e.target as HTMLImageElement).style.display='none' }} /> : <span style={{ fontSize: 22, fontWeight: 800, color: '#fff' }}>{(result.project_name||'?').charAt(0).toUpperCase()}</span>
                  })()}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' as const, marginBottom: 3 }}>
                    <span style={{ fontSize: 22, fontWeight: 800, color: '#fff', fontFamily: "'Syne',sans-serif" }}>{result.project_name}</span>
                    {cgData?.token_live && cgData.ticker && <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 10, color: 'rgba(255,255,255,0.8)', background: 'rgba(0,0,0,0.2)', padding: '2px 8px', borderRadius: 5 }}>{cgData.ticker} {cgData.token_price}</span>}
                  </div>
                  <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 9, color: 'rgba(255,255,255,0.5)' }}>{result.project_category}{result.team_location ? ' · ' + result.team_location : ''}</div>
                </div>
                <div style={{ textAlign: 'right' as const, flexShrink: 0 }}>
                  <div style={{ fontSize: 52, fontWeight: 800, color: '#fff', lineHeight: 1, fontFamily: "'Syne',sans-serif" }}>{result.overall_score ?? 0}</div>
                  <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 7, color: 'rgba(255,255,255,0.5)' }}>ALPHA SCORE</div>
                  <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 9, color: '#fff', background: 'rgba(0,0,0,0.2)', borderRadius: 20, padding: '2px 8px', display: 'inline-block', marginTop: 3 }}>{otc.lbl}</div>
                </div>
              </div>

              {goodHighlights.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap' as const, gap: 5, marginBottom: 14 }}>
                  {goodHighlights.slice(0,3).map((h: string, i: number) => <div key={i} style={{ background: 'rgba(0,0,0,0.15)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 20, padding: '3px 10px', fontSize: 11, color: 'rgba(255,255,255,0.9)' }}>✓ {h}</div>)}
                </div>
              )}

              <div style={{ background: 'rgba(0,0,0,0.2)', borderRadius: 12, padding: '14px 16px', marginBottom: 16 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#fff', fontFamily: "'Syne',sans-serif", marginBottom: 6 }}>{otc.v}</div>
                <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.85)', lineHeight: 1.65 }}>{result.verdict_action || result.verdict_reason}</div>
              </div>

              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                <button onClick={downloadCard} style={{ display: 'flex', alignItems: 'center', gap: 5, background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: 20, padding: '7px 14px', fontSize: 12, fontWeight: 600, color: '#fff', cursor: 'pointer', fontFamily: 'inherit' }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3"/></svg>Download
                </button>
                <button onClick={shareResult} style={{ display: 'flex', alignItems: 'center', gap: 5, background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: 20, padding: '7px 16px', fontSize: 12, fontWeight: 600, color: '#fff', cursor: 'pointer', fontFamily: 'inherit' }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8M16 6l-4-4-4 4M12 2v13"/></svg>Share to X
                </button>
              </div>
            </div>

            {/* ── SCORE + OVERVIEW ── */}
            <div className="result-grid" style={{ display: 'grid', gridTemplateColumns: '140px 1fr', gap: 10, marginBottom: 10 }}>
              <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 14, padding: 16, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 7, color: 'rgba(255,255,255,0.3)', letterSpacing: 1 }}>ALPHA SCORE</div>
                <div style={{ fontSize: 52, fontWeight: 800, color: otc.solid, lineHeight: 1, fontFamily: "'Syne',sans-serif" }}>{result.overall_score ?? 0}</div>
                <div style={{ background: 'rgba(0,0,0,0.2)', border: `1px solid ${otc.solid}30`, borderRadius: 20, padding: '3px 10px', fontFamily: "'DM Mono',monospace", fontSize: 8, color: otc.solid }}>{otc.lbl}</div>
                {xData?.cmv_score > 0 && <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 8, padding: '6px 8px', width: '100%', textAlign: 'center' as const, marginTop: 4 }}><div style={{ fontFamily: "'DM Mono',monospace", fontSize: 7, color: 'rgba(255,255,255,0.3)' }}>CMV X</div><div style={{ fontSize: 16, fontWeight: 700, color: '#fff', fontFamily: "'Syne',sans-serif" }}>{xData.cmv_score}<span style={{ fontSize: 9, color: 'rgba(255,255,255,0.3)' }}>/1k</span></div></div>}
              </div>
              <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 14, padding: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, flexWrap: 'wrap' as const }}>
                  <span style={{ fontSize: 16, fontWeight: 700, color: '#fff', fontFamily: "'Syne',sans-serif" }}>{result.project_name}</span>
                  {cgData?.token_live && cgData.ticker ? <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 9, color: '#60a5fa', background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.2)', padding: '2px 7px', borderRadius: 4 }}>{cgData.ticker} {cgData.token_price}</span> : <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 9, color: 'rgba(255,255,255,0.25)', background: 'rgba(255,255,255,0.04)', padding: '2px 7px', borderRadius: 4 }}>No Token</span>}
                </div>
                {result.team_location && <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 9, color: 'rgba(255,255,255,0.3)', marginBottom: 8 }}>📍 {result.team_location}{result.founded ? ' · Est. ' + result.founded : ''}</div>}
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', lineHeight: 1.65, marginBottom: 10 }}>{result.description}</div>
                {goodHighlights.length > 0 && <div style={{ display: 'flex', flexWrap: 'wrap' as const, gap: 4 }}>{goodHighlights.map((h: string, i: number) => <span key={i} style={{ fontSize: 10, background: 'rgba(22,163,74,0.08)', color: '#16a34a', border: '1px solid rgba(22,163,74,0.15)', borderRadius: 20, padding: '2px 8px' }}>✓ {h}</span>)}</div>}
              </div>
            </div>

            {/* WHY THIS SCORE */}
            {result.score_rationale && (
              <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderLeft: '3px solid #16a34a', borderRadius: 0, padding: '12px 14px', marginBottom: 10 }}>
                <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 7, color: '#16a34a', letterSpacing: 1, marginBottom: 4 }}>WHY THIS SCORE</div>
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', lineHeight: 1.7 }}>{result.score_rationale}</div>
              </div>
            )}

            {/* TOKEN + CONTRACTS */}
            {(result.token_data?.token_live || cgData?.token_live || result.post_tge_outlook || result.future_seasons) && (
              <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 14, padding: 16, marginBottom: 10 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.5)', marginBottom: 12, fontFamily: "'DM Mono',monospace", letterSpacing: 1 }}>DEEP INTEL</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 8 }}>
                  <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 8, padding: '10px 12px' }}>
                    <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 7, color: 'rgba(255,255,255,0.3)', letterSpacing: 1, marginBottom: 5 }}>TOKEN STATUS</div>
                    {(result.token_data?.token_live || cgData?.token_live) ? (() => {
                      const td = result.token_data?.token_live ? result.token_data : cgData
                      return <span style={{ background: 'rgba(22,163,74,0.12)', color: '#16a34a', border: '1px solid rgba(22,163,74,0.2)', borderRadius: 20, padding: '3px 10px', fontFamily: "'DM Mono',monospace", fontSize: 10, display: 'inline-flex', alignItems: 'center', gap: 5 }}><span style={{ width: 5, height: 5, borderRadius: '50%', background: '#16a34a', display: 'inline-block', animation: 'pulse 2s infinite' }} />{td.ticker} {td.token_price}</span>
                    })() : <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 10, color: 'rgba(255,255,255,0.3)' }}>Not yet launched</span>}
                  </div>
                  {(result.token_data?.token_live || cgData?.token_live) && result.post_tge_outlook && (
                    <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 8, padding: '10px 12px' }}>
                      <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 7, color: 'rgba(255,255,255,0.3)', letterSpacing: 1, marginBottom: 5 }}>TOKEN OUTLOOK</div>
                      <div style={{ fontSize: 11, fontWeight: 600, color: result.post_tge_outlook?.includes('Poor') ? '#ef4444' : '#16a34a' }}>{result.post_tge_outlook}</div>
                    </div>
                  )}
                </div>
                {result.future_seasons && <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 8, padding: '10px 12px', marginBottom: 8 }}><div style={{ fontFamily: "'DM Mono',monospace", fontSize: 7, color: 'rgba(255,255,255,0.3)', letterSpacing: 1, marginBottom: 4 }}>RECENT COVERAGE</div><div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', lineHeight: 1.5 }}>{result.future_seasons}</div></div>}
                {(xData?.enriched?.coinpaprika_contracts || []).length > 0 && (
                  <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 8, padding: '10px 12px' }}>
                    <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 7, color: 'rgba(255,255,255,0.3)', letterSpacing: 1, marginBottom: 6 }}>CONTRACT ADDRESSES</div>
                    {(xData?.enriched?.coinpaprika_contracts || []).map((c: any, i: number) => (
                      <div key={i} style={{ marginBottom: 3, display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 8, color: '#16a34a', background: 'rgba(22,163,74,0.08)', padding: '1px 5px', borderRadius: 3 }}>{c.chain}</span>
                        <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 9, color: 'rgba(255,255,255,0.3)' }}>{c.address.slice(0,8)}...{c.address.slice(-6)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* TEAM */}
            {result.team_members?.filter((m: any) => m.name?.length > 1).length > 0 && (
              <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 14, padding: 14, marginBottom: 10 }}>
                <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 7, color: 'rgba(255,255,255,0.3)', letterSpacing: 1, marginBottom: 10 }}>TEAM</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(200px,1fr))', gap: 8 }}>
                  {result.team_members.filter((m: any) => m.name?.length > 1).map((m: any, i: number) => <TeamCardEnriched key={i} member={m} />)}
                </div>
              </div>
            )}

            {/* ── GOOD vs BAD vs CONCLUSION ── */}
            <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 14, padding: 16, marginBottom: 10 }}>
              <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 7, color: 'rgba(255,255,255,0.3)', letterSpacing: 1, marginBottom: 14 }}>ALPHA BREAKDOWN</div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
                {/* Good sides */}
                <div>
                  <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 8, color: '#16a34a', letterSpacing: 1, marginBottom: 8 }}>WHAT'S WORKING ✓</div>
                  {goodSides.length > 0 ? goodSides.map((g: any, i: number) => (
                    <div key={i} style={{ marginBottom: 8 }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 3 }}>
                        <span style={{ fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.7)', textTransform: 'capitalize' as const }}>{g.label}</span>
                        <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 10, color: '#16a34a', fontWeight: 700 }}>{g.score}</span>
                      </div>
                      {g.detail && <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', lineHeight: 1.5 }}>{g.detail}</div>}
                    </div>
                  )) : <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)' }}>No strong positives found</div>}
                </div>

                {/* Bad sides */}
                <div>
                  <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 8, color: '#ef4444', letterSpacing: 1, marginBottom: 8 }}>WATCH OUT ✗</div>
                  {badSides.length > 0 ? badSides.map((b: any, i: number) => (
                    <div key={i} style={{ marginBottom: 8 }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 3 }}>
                        <span style={{ fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.7)', textTransform: 'capitalize' as const }}>{b.label}</span>
                        <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 10, color: '#ef4444', fontWeight: 700 }}>{b.score}</span>
                      </div>
                      {b.detail && <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', lineHeight: 1.5 }}>{b.detail}</div>}
                    </div>
                  )) : <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)' }}>No major concerns</div>}
                </div>
              </div>

              {/* Conclusion */}
              <div style={{ background: `linear-gradient(135deg,${otc.solid}15,transparent)`, border: `1px solid ${otc.solid}25`, borderRadius: 10, padding: '12px 14px' }}>
                <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 7, color: otc.solid, letterSpacing: 1, marginBottom: 5 }}>CONCLUSION</div>
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)', lineHeight: 1.65 }}>{result.score_rationale || result.verdict_reason}</div>
              </div>
            </div>

          </div>
        )}

        {!loading && !result && !error && (
          <div style={{ border: '1px dashed rgba(255,255,255,0.08)', borderRadius: 14, padding: '48px 24px', textAlign: 'center' as const }}>
            <div style={{ fontSize: 28, marginBottom: 10, opacity: 0.4 }}>🔭</div>
            <div style={{ fontSize: 14, fontWeight: 600, color: 'rgba(255,255,255,0.3)', marginBottom: 4, fontFamily: "'Syne',sans-serif" }}>No project scanned yet</div>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.2)' }}>Paste any crypto project X URL or handle above.</div>
          </div>
        )}
      </div>
    </div>
  )
}
