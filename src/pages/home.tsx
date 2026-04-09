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
  A: { bg: '#ebfbee', border: '#8ce99a', tc: '#2f9e44', solid: '#37b24d', lbl: 'Tier A', v: 'FARM IT', sub: 'High conviction play. Go hard.', target: 'Top 30-50%', vbg: 'linear-gradient(135deg,#37b24d,#2f9e44)', emoji: '🌾', range: '800-1000' },
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
  { id: 'season2', label: 'Season 2 confirmed 🌾' },
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

function getTier(s: number) { return s >= 80 ? 'A' : s >= 60 ? 'B' : s >= 35 ? 'C' : 'D' }

function computeCMVAlphaScore(metrics: any, redFlags: any[]) {
  if (!metrics) return { total: 0, categories: {} }
  const cats: Record<string, { score: number; max: number; metrics: string[] }> = {
    Fundamentals: { score: 0, max: 200, metrics: ['funding', 'vc_pedigree', 'copycat', 'niche', 'location'] },
    Team: { score: 0, max: 200, metrics: ['founder_cred', 'founder_activity', 'top_voices'] },
    Opportunity: { score: 0, max: 200, metrics: ['token', 'metrics_clarity', 'user_count'] },
    Sentiment: { score: 0, max: 200, metrics: ['fud', 'notable_mentions', 'content_type'] },
    Traction: { score: 0, max: 200, metrics: ['mindshare', 'revenue', 'sentiment'] },
  }
  for (const [cat, data] of Object.entries(cats)) {
    const scores = data.metrics.map(m => metrics[m]?.score ?? 0)
    const avg = scores.reduce((a, b) => a + b, 0) / scores.length
    cats[cat].score = Math.round((avg / 100) * 200)
  }
  let fudPenalty = 0
  for (const flag of redFlags) {
    if (flag.type === 'rug') fudPenalty += 100
    else if (flag.type === 'scam') fudPenalty += 100
    else if (flag.type === 'shill') fudPenalty += 60
    else if (flag.type === 'anon') fudPenalty += 40
    else fudPenalty += 25
  }
  fudPenalty = Math.min(200, fudPenalty)
  const rawTotal = Object.values(cats).reduce((a, c) => a + c.score, 0)
  const total = Math.max(0, Math.min(1000, rawTotal - fudPenalty))
  return { total, categories: cats, fudPenalty: fudPenalty || 0 }
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

async function fetchCoinGecko(projectName: string, confirmedTicker?: string | null, tokenHinted?: boolean) {
  try {
    const results: any[] = []
    if (confirmedTicker) {
      const r = await fetch(`https://api.coingecko.com/api/v3/search?query=${encodeURIComponent(confirmedTicker)}`)
      const d = await r.json()
      const match = d.coins?.find((c: any) => c.symbol?.toUpperCase() === confirmedTicker)
      if (match) results.push(match)
    }
    if (results.length === 0) {
      const r = await fetch(`https://api.coingecko.com/api/v3/search?query=${encodeURIComponent(projectName)}`)
      const d = await r.json()
      if (d.coins?.length > 0) {
        const close = d.coins.find((c: any) => {
          const cName = c.name?.toLowerCase() || ''
          const pName = projectName.toLowerCase()
          return cName.includes(pName) || pName.includes(cName) || (confirmedTicker && c.symbol?.toUpperCase() === confirmedTicker)
        })
        if (close) results.push(close)
      }
    }
    if (results.length === 0) return { token_live: false, token_price: 'Not Launched', token_note: 'No matching token found on CoinGecko' }
    const coin = results[0]
    const pr = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${coin.id}&vs_currencies=usd&include_market_cap=true`)
    const pd = await pr.json()
    const price = pd[coin.id]?.usd
    if (!price || price === 0) return { token_live: false, ticker: coin.symbol?.toUpperCase(), token_price: 'Not Launched', token_note: 'Listed on CoinGecko but no active price — not yet trading' }
    if (!confirmedTicker && !tokenHinted) return { token_live: false, ticker: coin.symbol?.toUpperCase(), token_price: 'Unconfirmed', token_note: `$${coin.symbol?.toUpperCase()} found on CoinGecko but not confirmed in X bio or tweets` }
    return { token_live: true, ticker: coin.symbol?.toUpperCase(), token_price: `$${price}`, market_cap: pd[coin.id]?.usd_market_cap, token_note: `Live on CoinGecko · confirmed from X data` }
  } catch { return { token_live: false, token_price: 'Not Launched', token_note: 'CoinGecko lookup failed' } }
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

CoinGecko Token Data: ${JSON.stringify(cg)}

Search ONLY for "@${handle}" — do not confuse with other projects.

SCORE INTEGRITY — be brutally honest:
- Most projects score 35-65. Above 75 requires exceptional evidence.
- Tier A = 80+ ALL of: confirmed funding + active founders + low dilution + strong CT
- Tier B = 60-79, Tier C = 35-59, Tier D = 0-34
- FUD < 40 = overall max 65. user_count < 30 = overall max 60. vc_pedigree < 40 = overall max 65.

RED FLAGS — search specifically for these and report honestly:
- Rug history: did founders previously rug or exit scam?
- Scam allegations: is there active CT calling this a scam?
- Anonymous team: no doxxed founders anywhere?
- All paid content: is 90%+ of CT coverage sponsored?
- Token confusion: is the token ticker confirmed or is it a different project?
- Founder dump: did founders dump tokens at TGE previously?

For red_flags array — only include CONFIRMED issues found from searching. Each flag needs a source.
For good_highlights — only include genuinely positive confirmed facts.

SEASON LOGIC — be specific:
- If token is LIVE: do NOT mention any season unless you find a CONFIRMED official announcement with specific dates or requirements. If unsure, leave future_seasons as empty string.
- NEVER invent season numbers. If you see Season 2 mentioned somewhere, do not assume Season 3 exists.
- The verdict_action and future_seasons must be consistent — never say different season numbers in the same result.
- If pre-TGE: mention farming strategy if found
- If no season info found: leave future_seasons empty string

VERDICT ACTION — be SPECIFIC to @${handle}:
- Perp DEX: trading volume, delta neutral — NOT content creation
- Has confirmed Season 2: mention specific requirements found
- Requires Discord: say get Discord roles
- Has leaderboard: name the leaderboard and what matters

Return ONLY valid JSON — zero text before or after, zero cite tags:
{"project_name":"","ticker":"","description":"","team_location":"","founded":"","project_category":"SocialFi","verdict":"WATCH","verdict_reason":"","verdict_action":"","overall_score":0,"score_rationale":"","data_accuracy_note":"","post_tge_outlook":"","future_seasons":"","team_members":[{"name":"","role":"","x_handle":"","background":"","confirmed":true}],"project_follows":"","red_flags":[{"type":"rug","label":"","detail":"","source":""}],"good_highlights":["",""],"mindshare_trend":{"labels":["8w ago","7w ago","6w ago","5w ago","4w ago","3w ago","2w ago","1w ago"],"values":[0,0,0,0,0,0,0,0],"current_pct":"0%","trend":"stable"},"sources":[{"name":"","url":"","used_for":""}],"metrics":{"funding":{"score":0,"detail":"","why_this_score":"","signal":"neutral"},"vc_pedigree":{"score":0,"detail":"","why_this_score":"","signal":"neutral"},"copycat":{"score":0,"detail":"","why_this_score":"","signal":"neutral"},"niche":{"score":0,"detail":"","why_this_score":"","signal":"neutral"},"location":{"score":0,"detail":"","why_this_score":"","signal":"neutral"},"founder_cred":{"score":0,"detail":"","why_this_score":"","signal":"neutral"},"founder_activity":{"score":0,"detail":"","why_this_score":"","signal":"neutral"},"top_voices":{"score":0,"detail":"","why_this_score":"","signal":"neutral"},"token":{"score":0,"detail":"","why_this_score":"","signal":"neutral"},"metrics_clarity":{"score":0,"detail":"","why_this_score":"","signal":"neutral"},"user_count":{"score":0,"detail":"","why_this_score":"","signal":"neutral"},"fud":{"score":0,"detail":"","why_this_score":"","signal":"neutral"},"notable_mentions":{"score":0,"detail":"","why_this_score":"","signal":"neutral"},"content_type":{"score":0,"detail":"","why_this_score":"","signal":"neutral"},"mindshare":{"score":0,"detail":"","why_this_score":"","signal":"neutral"},"revenue":{"score":0,"detail":"","why_this_score":"","signal":"neutral"},"sentiment":{"score":0,"detail":"","why_this_score":"","signal":"neutral"}},"top_risks":["","",""],"top_opportunities":["",""]}`

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

function TeamCard({ member }: { member: any }) {
  const [err, setErr] = useState(false)
  const handle = (member.x_handle || '').replace('@', '')
  const ini = (member.name || '?').slice(0, 2).toUpperCase()
  return (
    <div style={{ background: '#f8f9ff', border: '1px solid #dbe4ff', borderRadius: 10, padding: '12px 14px', display: 'flex', alignItems: 'flex-start', gap: 12 }}>
      <a href={handle ? `https://x.com/${handle}` : '#'} target="_blank" rel="noreferrer" style={{ textDecoration: 'none', flexShrink: 0 }}>
        {!err && handle ? (
          <img src={`https://unavatar.io/twitter/${handle}`} alt={member.name} style={{ width: 42, height: 42, borderRadius: '50%', objectFit: 'cover', border: '1px solid #dbe4ff' }} onError={() => setErr(true)} />
        ) : (
          <div style={{ width: 42, height: 42, borderRadius: '50%', background: '#e8ecff', color: '#3b5bdb', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'DM Mono',monospace", fontSize: 13, fontWeight: 600 }}>{ini}</div>
        )}
      </a>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' as const, marginBottom: 2 }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: '#1c2b5a' }}>{member.name}</span>
          {!member.confirmed && <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 8, color: '#e67700', background: '#fff3bf', border: '1px solid #ffe066', padding: '1px 6px', borderRadius: 20 }}>unconfirmed</span>}
        </div>
        <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 10, color: '#3b5bdb', marginBottom: 4 }}>{member.role}{handle ? ` · @${handle}` : ''}</div>
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

  useEffect(() => {
    setTempName(userName); setTempPhoto(userPhoto)
  }, [userName, userPhoto])

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
    setLoading(true); setResult(null); setCgData(null); setXData(null); setError(null); setAtab('Fundamentals'); setAsec('metrics'); setSelectedTags([])
    const xd = await fetchProjectXData(handle)
    setXData(xd)
    const cg = await fetchCoinGecko(handle, xd?.confirmed_ticker, xd?.token_launch_hinted)
    setCgData(cg)
    try {
      const r = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-api-key': import.meta.env.VITE_ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01', 'anthropic-dangerous-direct-browser-access': 'true' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514', max_tokens: 4000,
          system: buildPrompt(handle, xd, cg),
          tools: [{ type: 'web_search_20250305', name: 'web_search' }],
          messages: [{ role: 'user', content: `Analyze @${handle}. Search for "@${handle}" specifically. Return complete JSON only. No cite tags. No numbered references.` }]
        })
      })
      const data = await r.json()
      if (data.error) throw new Error(data.error.message)
      const txt = (data.content || []).filter((b: any) => b.type === 'text').map((b: any) => b.text).join('\n')
      if (!txt.trim()) throw new Error('No response received. Please try again.')
      const parsed = xjson(txt)
      if (!parsed) throw new Error('Could not read results. Please try again.')
      setResult(stripCites(parsed))
    } catch (e: any) {
      setError(e.message || 'Something went wrong.')
    } finally { setLoading(false) }
  }

  async function shareResult() {
    if (!result) return
    const ot = getTier(result.overall_score ?? 0)
    const otc = T[ot]
    const tagLabels = selectedTags.map(id => {
      const good = GOOD_TAGS.find(t => t.id === id)
      const bad = BAD_TAGS.find(t => t.id === id)
      return good?.label || bad?.label || ''
    }).filter(Boolean)
    const name = userName || 'CMV AlphaScanner'
    const text = `${name} says ${otc.v} ${otc.emoji} on ${result.project_name}\n\nAlpha Score: ${result.overall_score}/100 · ${otc.lbl}\n${tagLabels.map(t => `• ${t}`).join('\n')}\n\n${result.verdict_action || result.verdict_reason}\n\n🎯 ${otc.target || 'Skip entirely'}\n\nScanned at cmv-alphascanner.vercel.app`
    try {
      if (navigator.share) await navigator.share({ text, title: `${result.project_name} — CMV AlphaScanner` })
      else { await navigator.clipboard.writeText(text); alert('Copied! Paste it on X.') }
    } catch { }
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
        @keyframes float{0%,100%{transform:translateY(0) rotate(var(--r,0deg))}50%{transform:translateY(-10px) rotate(var(--r,0deg))}}
        @keyframes scan{0%{transform:translateX(-100%)}100%{transform:translateX(400%)}}
        @keyframes pop{0%{transform:scale(0.8);opacity:0}60%{transform:scale(1.05)}100%{transform:scale(1);opacity:1}}
        .tag-btn{transition:all 0.15s;cursor:pointer;}
        .tag-btn:hover{transform:translateY(-1px);}
        input:focus{outline:none;}
      `}</style>

      {/* Nav */}
      <div style={{ background: '#fff', borderBottom: '1px solid #d4e8d0', padding: '0 24px', display: 'flex', alignItems: 'center', height: 58, gap: 10, position: 'sticky', top: 0, zIndex: 100 }}>
        <div style={{ width: 34, height: 34, background: 'linear-gradient(135deg,#166534,#16a34a)', borderRadius: 9, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04a1 1 0 000-1.41l-2.34-2.34a1 1 0 00-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z" fill="#fff" /></svg>
        </div>
        <div>
          <span style={{ fontSize: 16, fontWeight: 800, color: '#1c2b5a', letterSpacing: -0.5 }}>CMV <span style={{ color: '#16a34a' }}>AlphaScanner</span></span>
          <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 8, color: '#4ade80', letterSpacing: 0.5 }}>know if this project is worth your time</div>
        </div>
        {/* Profile button */}
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
          <button onClick={() => setShowProfileSetup(true)} style={{ display: 'flex', alignItems: 'center', gap: 7, background: '#f0fdf4', border: '1px solid #86efac', borderRadius: 20, padding: '5px 12px 5px 6px', cursor: 'pointer', fontFamily: 'inherit' }}>
            {userPhoto ? (
              <img src={userPhoto} alt="" style={{ width: 24, height: 24, borderRadius: '50%', objectFit: 'cover' }} />
            ) : (
              <div style={{ width: 24, height: 24, borderRadius: '50%', background: '#e8ecff', color: '#3b5bdb', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700 }}>{userName ? userName.charAt(0).toUpperCase() : '?'}</div>
            )}
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
                {tempPhoto ? <img src={tempPhoto} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : (
                  <div style={{ textAlign: 'center' as const }}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" style={{ display: 'block', margin: '0 auto 4px' }}><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12" stroke="#adb5bd" strokeWidth="2" strokeLinecap="round" /></svg>
                    <span style={{ fontSize: 9, color: '#adb5bd', fontFamily: "'DM Mono',monospace" }}>upload</span>
                  </div>
                )}
              </div>
              <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handlePhotoUpload} />
              <div style={{ flex: 1 }}>
                <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 9, color: '#868e96', letterSpacing: 1, marginBottom: 6 }}>YOUR NAME OR HANDLE</div>
                <input style={{ width: '100%', border: '1px solid #dbe4ff', borderRadius: 10, padding: '10px 14px', fontSize: 14, color: '#1c2b5a', fontFamily: 'inherit' }}
                  placeholder="e.g. Charles or @Cmv_ng" maxLength={20}
                  value={tempName} onChange={e => setTempName(e.target.value)} />
              </div>
            </div>

            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => setShowProfileSetup(false)} style={{ flex: 1, background: '#f8f9ff', border: '1px solid #dbe4ff', borderRadius: 10, padding: '11px', fontSize: 13, fontWeight: 600, color: '#6c7a9c', cursor: 'pointer', fontFamily: 'inherit' }}>Cancel</button>
              <button onClick={() => { saveProfile(tempName, tempPhoto); setShowProfileSetup(false) }}
                style={{ flex: 2, background: '#14532d', color: '#fff', border: 'none', borderRadius: 10, padding: '11px', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>Save Profile</button>
            </div>
          </div>
        </div>
      )}

      <div style={{ maxWidth: 860, margin: '0 auto', padding: '32px 16px 60px' }}>

        {/* Hero */}
        {!result && !loading && (
          <div style={{ position: 'relative', overflow: 'hidden', padding: '0 0 8px' }}>
            {/* Soft cream circle bg */}
            <div style={{ position: 'absolute', top: -80, left: '50%', transform: 'translateX(-50%)', width: 600, height: 600, borderRadius: '50%', background: '#dcfce7', opacity: 0.45, pointerEvents: 'none' }} />
            <div style={{ position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)', width: 360, height: 360, borderRadius: '50%', border: '1px solid #86efac', opacity: 0.35, pointerEvents: 'none', animation: 'ring 5s ease-in-out infinite' }} />

            {/* Floating verdict chips */}
            <div style={{ position: 'absolute', left: '1%', top: 20, transform: 'rotate(-6deg)', animation: 'float 5s ease-in-out infinite', zIndex: 1 }}>
              <div style={{ background: '#fff', border: '1.5px solid #86efac', borderRadius: 12, padding: '9px 14px', boxShadow: '0 4px 16px rgba(21,128,61,0.1)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                  <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#16a34a' }} />
                  <span style={{ fontSize: 11, fontWeight: 800, color: '#14532d' }}>🌾 FARM IT</span>
                </div>
                <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 9, color: '#9ca3af' }}>EigenLayer · 84/100</div>
              </div>
            </div>
            <div style={{ position: 'absolute', right: '1%', top: 30, transform: 'rotate(5deg)', animation: 'float 6s ease-in-out infinite 0.8s', zIndex: 1 }}>
              <div style={{ background: '#fff', border: '1.5px solid #fde68a', borderRadius: 12, padding: '9px 14px', boxShadow: '0 4px 16px rgba(0,0,0,0.06)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                  <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#d97706' }} />
                  <span style={{ fontSize: 11, fontWeight: 800, color: '#78350f' }}>✍️ CREATE</span>
                </div>
                <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 9, color: '#9ca3af' }}>KaitoAI · 67/100</div>
              </div>
            </div>
            <div style={{ position: 'absolute', left: '3%', bottom: 40, transform: 'rotate(4deg)', animation: 'float 7s ease-in-out infinite 1.3s', zIndex: 1, opacity: 0.85 }}>
              <div style={{ background: '#fff', border: '1.5px solid #fca5a5', borderRadius: 12, padding: '9px 14px', boxShadow: '0 4px 16px rgba(0,0,0,0.06)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                  <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#dc2626' }} />
                  <span style={{ fontSize: 11, fontWeight: 800, color: '#7f1d1d' }}>🚫 SKIP 🚨</span>
                </div>
                <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 9, color: '#9ca3af' }}>SuspectDAO · 12/100</div>
              </div>
            </div>
            <div style={{ position: 'absolute', right: '2%', bottom: 50, transform: 'rotate(-4deg)', animation: 'float 5.5s ease-in-out infinite 0.5s', zIndex: 1, opacity: 0.85 }}>
              <div style={{ background: '#fff', border: '1.5px solid #fed7aa', borderRadius: 12, padding: '9px 14px', boxShadow: '0 4px 16px rgba(0,0,0,0.06)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                  <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#ea580c' }} />
                  <span style={{ fontSize: 11, fontWeight: 800, color: '#7c2d12' }}>👁️ WATCH</span>
                </div>
                <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 9, color: '#9ca3af' }}>RallyOnChain · 49/100</div>
              </div>
            </div>

            {/* Main content */}
            <div style={{ position: 'relative', zIndex: 2, textAlign: 'center', padding: '48px 24px 52px', animation: 'fadeIn 0.7s ease' }}>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 7, background: '#dcfce7', border: '1px solid #86efac', borderRadius: 20, padding: '6px 16px', marginBottom: 22 }}>
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#16a34a', animation: 'ring 2s ease-in-out infinite' }} />
                <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 10, color: '#15803d', letterSpacing: '0.5px' }}>CRYPTO ALPHA INTELLIGENCE</span>
              </div>
              <h1 style={{ fontSize: 'clamp(38px,5.5vw,64px)', fontWeight: 900, color: '#14532d', lineHeight: 1.05, letterSpacing: -2, marginBottom: 14 }}>
                Know before<br /><span style={{ color: '#16a34a' }}>you farm.</span>
              </h1>
              <p style={{ fontSize: 15, color: '#4b5563', lineHeight: 1.7, maxWidth: 440, margin: '0 auto 36px' }}>
                Paste any project's X link. Get the full alpha — 17 metrics, red flag detection, a CMV score out of 1000, and a personalised verdict card you can share.
              </p>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, flexWrap: 'wrap' as const, marginBottom: 24 }}>
                {['17 metrics', '1000pt score', 'Red flag detection', 'Real X data', 'Personalised cards'].map(t => (
                  <span key={t} style={{ fontFamily: "'DM Mono',monospace", fontSize: 9, color: '#15803d', background: '#f0fdf4', border: '1px solid #86efac', borderRadius: 20, padding: '5px 12px' }}>{t}</span>
                ))}
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
            <input style={{ flex: 1, background: '#f8f9ff', border: '1px solid #86efac', borderRadius: 12, padding: '14px 16px', fontSize: 14, color: '#1c2b5a', fontFamily: "'DM Mono',monospace", outline: 'none', transition: 'border-color 0.2s' }}
              placeholder="https://x.com/projecthandle or @handle"
              value={xUrl} onChange={e => setXUrl(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && !loading && analyze()} disabled={loading}
              onFocus={e => e.target.style.borderColor = '#3b5bdb'} onBlur={e => e.target.style.borderColor = '#dbe4ff'} />
            <button onClick={analyze} disabled={loading || !xUrl.trim()}
              style={{ background: loading || !xUrl.trim() ? '#e2e8f0' : 'linear-gradient(135deg,#166534,#16a34a)', color: loading || !xUrl.trim() ? '#adb5bd' : '#fff', border: 'none', borderRadius: 12, padding: '14px 28px', fontSize: 14, fontWeight: 700, cursor: loading || !xUrl.trim() ? 'not-allowed' : 'pointer', whiteSpace: 'nowrap' as const, fontFamily: 'inherit', transition: 'all 0.2s', boxShadow: loading || !xUrl.trim() ? 'none' : '0 4px 14px rgba(22,163,74,0.3)' }}>
              {loading ? 'Scanning...' : 'Analyze →'}
            </button>
          </div>
          <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 9, color: '#adb5bd', marginTop: 10, display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' as const }}>
            <span>try:</span>
            {['https://x.com/eigenlayer', 'https://x.com/KaitoAI', 'https://x.com/RallyOnChain'].map(ex => (
              <button key={ex} onClick={() => setXUrl(ex)} style={{ fontFamily: "'DM Mono',monospace", fontSize: 9, color: '#16a34a', background: 'none', border: 'none', cursor: 'pointer', padding: 0, textDecoration: 'underline dotted' }}>{ex.replace('https://x.com/', '@')}</button>
            ))}
          </div>
        </div>

        {/* Loading */}
        {loading && (
          <div style={{ background: '#fff', border: '1px solid #dbe4ff', borderRadius: 18, padding: 28, marginBottom: 16, overflow: 'hidden', position: 'relative' }}>
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: 'linear-gradient(90deg,transparent,#16a34a,transparent)', animation: 'scan 2s linear infinite' }} />
            {[
              { w: 40, h: 40, t: '8%', r: '6%', d: '3s' },
              { w: 24, h: 24, t: '55%', r: '12%', d: '4s' },
              { w: 16, h: 16, t: '25%', r: '3%', d: '2.5s' },
              { w: 32, h: 32, b: '12%', l: '4%', d: '3.5s' },
            ].map((p, i) => (
              <div key={i} style={{ position: 'absolute', width: p.w, height: p.h, borderRadius: '50%', background: 'rgba(59,91,219,0.1)', animation: `float ${p.d} ease-in-out infinite`, top: (p as any).t, right: (p as any).r, bottom: (p as any).b, left: (p as any).l, animationDelay: `${i * 0.3}s` }} />
            ))}
            <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginBottom: 24, position: 'relative', zIndex: 2 }}>
              <div style={{ position: 'relative', flexShrink: 0 }}>
                <div style={{ position: 'absolute', inset: -8, borderRadius: '50%', border: '2px solid rgba(59,91,219,0.15)', animation: 'ring 2s ease-in-out infinite' }} />
                <div style={{ position: 'absolute', inset: -4, borderRadius: '50%', border: '1.5px solid rgba(59,91,219,0.25)', animation: 'ring 2s ease-in-out infinite 0.4s' }} />
                <div style={{ width: 64, height: 64, borderRadius: '50%', overflow: 'hidden', border: '3px solid #3b5bdb', background: '#e8ecff', display: 'flex', alignItems: 'center', justifyContent: 'center', animation: 'float 3s ease-in-out infinite' }}>
                  <img src="/pfp.jpeg" alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: pfpLoaded ? 'block' : 'none' }} onLoad={() => setPfpLoaded(true)} onError={() => setPfpLoaded(false)} />
                  {!pfpLoaded && <span style={{ fontSize: 28 }}>🔍</span>}
                </div>
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 17, fontWeight: 700, color: '#1c2b5a', marginBottom: 5 }}>{msg.text} <span style={{ fontSize: 20 }}>{msg.emoji}</span></div>
                <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 10, color: '#6c7a9c' }}>scanning <span style={{ color: '#3b5bdb', fontWeight: 600 }}>@{xUrl.replace('https://x.com/', '').replace('@', '').split('/')[0]}</span></div>
              </div>
              <div style={{ textAlign: 'right' as const, flexShrink: 0 }}>
                <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 36, fontWeight: 800, color: '#16a34a', lineHeight: 1 }}>{elapsed}<span style={{ fontSize: 14, color: '#adb5bd' }}>s</span></div>
                <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 8, color: '#adb5bd' }}>elapsed</div>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 18, background: '#f8f9ff', borderRadius: 10, padding: '10px 14px', border: '1px solid #e8ecff' }}>
              <div style={{ width: 22, height: 22, border: '2.5px solid #dbe4ff', borderTopColor: '#16a34a', borderRadius: '50%', animation: 'spin 0.7s linear infinite', flexShrink: 0 }} />
              <div style={{ fontSize: 13, fontWeight: 600, color: '#1c2b5a' }}>{phase}</div>
            </div>
            {[100, 83, 91, 74].map((w, i) => (
              <div key={i} style={{ height: 42, background: 'linear-gradient(90deg,#f0f4ff 25%,#e8ecff 50%,#f0f4ff 75%)', backgroundSize: '400px 100%', animation: 'shimmer 1.3s infinite', borderRadius: 10, marginBottom: 8, width: `${w}%` }} />
            ))}
          </div>
        )}

        {/* Error */}
        {error && (
          <div style={{ background: '#fff5f5', border: '1px solid #ffc9c9', borderRadius: 14, padding: '16px 18px', marginBottom: 14 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#e03131', marginBottom: 5 }}>⚠️ Scan failed</div>
            <div style={{ fontSize: 12, color: '#c92a2a', lineHeight: 1.6, marginBottom: 10 }}>{error}</div>
            <button onClick={analyze} style={{ fontSize: 12, padding: '6px 14px', borderRadius: 8, border: '1px solid #ffc9c9', background: '#fff5f5', color: '#e03131', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 600 }}>Try again</button>
          </div>
        )}

        {/* Results */}
        {result && !loading && (
          <div style={{ animation: 'fadeIn 0.5s ease' }}>

            {/* Red Flags Alert */}
            {redFlags.length > 0 && (
              <div style={{ background: '#fff5f5', border: '1px solid #ffc9c9', borderLeft: '4px solid #e03131', borderRadius: 12, padding: '14px 16px', marginBottom: 14, animation: 'pop 0.4s ease' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" stroke="#e03131" strokeWidth="2" strokeLinecap="round" /></svg>
                  <span style={{ fontSize: 13, fontWeight: 700, color: '#e03131' }}>🚨 Red Flags Detected — Score Penalised</span>
                </div>
                {redFlags.map((f: any, i: number) => (
                  <div key={i} style={{ background: '#fff', border: '1px solid #ffc9c9', borderRadius: 8, padding: '8px 12px', marginBottom: 6 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: '#c92a2a', marginBottom: 2 }}>{f.label}</div>
                    <div style={{ fontSize: 11, color: '#868e96', lineHeight: 1.5 }}>{f.detail}</div>
                    {f.source && <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 9, color: '#adb5bd', marginTop: 3 }}>Source: {f.source}</div>}
                  </div>
                ))}
              </div>
            )}

            {/* Verdict Card — Shareable */}
            <div style={{ background: otc.vbg, borderRadius: 18, padding: 22, marginBottom: 14, position: 'relative', overflow: 'hidden', boxShadow: `0 8px 32px ${otc.solid}30` }}>
              <div style={{ position: 'absolute', top: -50, right: -50, width: 200, height: 200, borderRadius: '50%', background: 'rgba(255,255,255,0.06)', pointerEvents: 'none' }} />
              <div style={{ position: 'absolute', bottom: -30, left: -30, width: 140, height: 140, borderRadius: '50%', background: 'rgba(255,255,255,0.04)', pointerEvents: 'none' }} />

              {/* User badge */}
              {userName && (
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(255,255,255,0.2)', border: '1px solid rgba(255,255,255,0.3)', borderRadius: 20, padding: '5px 12px', marginBottom: 14, animation: 'pop 0.5s ease' }}>
                  {userPhoto ? (
                    <img src={userPhoto} alt="" style={{ width: 26, height: 26, borderRadius: '50%', objectFit: 'cover', border: '1.5px solid rgba(255,255,255,0.5)' }} />
                  ) : (
                    <div style={{ width: 26, height: 26, borderRadius: '50%', background: 'rgba(255,255,255,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: '#fff' }}>{userName.charAt(0).toUpperCase()}</div>
                  )}
                  <span style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>{userName} says</span>
                </div>
              )}

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
                    {cgData?.token_live && <span style={{ background:'rgba(255,255,255,0.2)', border:'1px solid rgba(255,255,255,0.3)', borderRadius:20, padding:'1px 8px', fontSize:9, color:'#fff', fontWeight:700 }}>🟢 {cgData.ticker} {cgData.token_price}</span>}
                  </div>
                </div>
                <div style={{ textAlign: 'right' as const, flexShrink: 0 }}>
                  <div style={{ fontSize: 44, fontWeight: 800, color: '#fff', lineHeight: 1, letterSpacing: -2 }}>{result.overall_score ?? 0}</div>
                  <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 8, color: 'rgba(255,255,255,0.65)' }}>ALPHA SCORE</div>
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: 'rgba(255,255,255,0.2)', borderRadius: 20, padding: '3px 9px', fontFamily: "'DM Mono',monospace", fontSize: 9, color: '#fff', marginTop: 4 }}>{ot} · {otc.lbl}</div>
                </div>
              </div>

              <div style={{ background: 'rgba(0,0,0,0.15)', borderRadius: 12, padding: '14px 16px', marginBottom: 14, border: '1px solid rgba(255,255,255,0.15)', position: 'relative', zIndex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                  <span style={{ fontSize: 24 }}>{otc.emoji}</span>
                  <span style={{ fontSize: 24, fontWeight: 900, color: '#fff', letterSpacing: -0.5 }}>{otc.v}</span>
                  <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.75)', fontStyle: 'italic', marginLeft: 4 }}>{otc.sub}</span>
                </div>
                <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.95)', lineHeight: 1.65, fontWeight: 500 }}>{result.verdict_action || result.verdict_reason}</div>
              </div>

              {/* Selected tags on card */}
              {selectedTags.length > 0 && (
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' as const, marginBottom: 12, position: 'relative', zIndex: 1 }}>
                  {selectedTags.map(id => {
                    const tag = [...GOOD_TAGS, ...BAD_TAGS].find(t => t.id === id)
                    return tag ? <div key={id} style={{ background: 'rgba(255,255,255,0.2)', border: '1px solid rgba(255,255,255,0.3)', borderRadius: 20, padding: '5px 12px', fontSize: 11, fontWeight: 700, color: '#fff', animation: 'pop 0.3s ease' }}>{tag.label}</div> : null
                  })}
                </div>
              )}

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, position: 'relative', zIndex: 1 }}>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' as const }}>
                  {otc.target && <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.25)', borderRadius: 20, padding: '5px 14px', fontFamily: "'DM Mono',monospace", fontSize: 10, color: '#fff', fontWeight: 600 }}>🎯 {otc.target}</div>}
                </div>
                <button onClick={shareResult} style={{ display: 'flex', alignItems: 'center', gap: 7, background: 'rgba(255,255,255,0.2)', border: '1px solid rgba(255,255,255,0.35)', borderRadius: 20, padding: '8px 18px', fontFamily: 'inherit', fontSize: 13, fontWeight: 700, color: '#fff', cursor: 'pointer', whiteSpace: 'nowrap' as const }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8M16 6l-4-4-4 4M12 2v13" /></svg>
                  Share to X
                </button>
              </div>
              <div style={{ marginTop: 12, fontFamily: "'DM Mono',monospace", fontSize: 8, color: 'rgba(255,255,255,0.35)', letterSpacing: 1 }}>CMV ALPHASCANNER · cmv-alphascanner.vercel.app</div>
            </div>

            {/* Tag Picker */}
            <div style={{ background: '#fff', border: '1px solid #dbe4ff', borderRadius: 14, padding: 16, marginBottom: 14 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#1c2b5a', marginBottom: 4 }}>Pick 2 highlights for your share card</div>
              <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 9, color: '#adb5bd', marginBottom: 12 }}>Selected {selectedTags.length}/2 — these appear on your verdict card</div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' as const }}>
                {availableTags.map(tag => {
                  const selected = selectedTags.includes(tag.id)
                  const disabled = !selected && selectedTags.length >= 2
                  return (
                    <button key={tag.id} className="tag-btn" onClick={() => !disabled && toggleTag(tag.id)}
                      style={{ padding: '7px 14px', borderRadius: 20, border: `1.5px solid ${selected ? otc.solid : '#dbe4ff'}`, background: selected ? otc.bg : '#f8f9ff', color: selected ? otc.tc : disabled ? '#adb5bd' : '#475569', fontSize: 12, fontWeight: selected ? 700 : 500, fontFamily: 'inherit', opacity: disabled ? 0.5 : 1, cursor: disabled ? 'not-allowed' : 'pointer' }}>
                      {tag.label}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* CMV Alpha Score Breakdown */}
            {cmvScore && (
              <div style={{ background: '#fff', border: '1px solid #dbe4ff', borderRadius: 14, padding: 20, marginBottom: 14 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap' as const, gap: 12 }}>
                  <div>
                    <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 9, color: '#868e96', letterSpacing: 2, marginBottom: 4 }}>CMV ALPHA SCORE</div>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                      <span style={{ fontSize: 48, fontWeight: 800, color: '#1c2b5a', letterSpacing: -3, lineHeight: 1 }}>{cmvScore.total}</span>
                      <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 14, color: '#adb5bd' }}>/1000</span>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' as const }}>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: otc.bg, border: `1px solid ${otc.border}`, borderRadius: 12, padding: '8px 16px', marginBottom: 6 }}>
                      <div style={{ width: 10, height: 10, borderRadius: '50%', background: otc.solid }} />
                      <span style={{ fontWeight: 700, fontSize: 14, color: otc.tc }}>{otc.lbl} · {otc.v}</span>
                    </div>
                    <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 9, color: '#adb5bd' }}>{otc.range}/1000 range for this tier</div>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10, marginBottom: 16 }}>
                  {Object.entries(cmvScore.categories).map(([cat, data]: [string, any]) => {
                    const pct = Math.round((data.score / data.max) * 100)
                    const col = pct >= 70 ? '#37b24d' : pct >= 50 ? '#f59f00' : '#e8590c'
                    return (
                      <div key={cat} style={{ background: '#f8f9ff', border: '1px solid #dbe4ff', borderRadius: 10, padding: '12px' }}>
                        <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 8, color: '#868e96', letterSpacing: 1, marginBottom: 3 }}>{cat.toUpperCase()}</div>
                        <div style={{ fontSize: 22, fontWeight: 800, color: col, lineHeight: 1 }}>{data.score}<span style={{ fontSize: 11, color: '#adb5bd', fontWeight: 400 }}>/{data.max}</span></div>
                        <div style={{ height: 6, background: '#e8ecff', borderRadius: 4, overflow: 'hidden', margin: '6px 0' }}>
                          <div style={{ width: `${pct}%`, height: '100%', background: col, borderRadius: 4, transition: 'width 1.2s cubic-bezier(0.4,0,0.2,1)' }} />
                        </div>
                        <div style={{ fontSize: 10, color: '#6c7a9c' }}>{METRICS.filter(m => m.cat === cat).map(m => m.label.split(' ')[0]).join(' · ')}</div>
                      </div>
                    )
                  })}

                  {/* FUD Penalty */}
                  <div style={{ background: fudPen > 0 ? '#fff5f5' : '#f8f9ff', border: `1px solid ${fudPen > 0 ? '#ffc9c9' : '#dbe4ff'}`, borderRadius: 10, padding: '12px' }}>
                    <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 8, color: fudPen > 0 ? '#c92a2a' : '#868e96', letterSpacing: 1, marginBottom: 3 }}>FUD PENALTY ⚠</div>
                    <div style={{ fontSize: 22, fontWeight: 800, color: fudPen > 0 ? '#c92a2a' : '#adb5bd', lineHeight: 1 }}>-{fudPen * 10}<span style={{ fontSize: 11, color: '#adb5bd', fontWeight: 400 }}>/200</span></div>
                    <div style={{ height: 6, background: '#fee2e2', borderRadius: 4, overflow: 'hidden', margin: '6px 0' }}>
                      <div style={{ width: `${(fudPen / 200) * 100}%`, height: '100%', background: '#e03131', borderRadius: 4 }} />
                    </div>
                    <div style={{ fontSize: 10, color: fudPen > 0 ? '#c92a2a' : '#6c7a9c' }}>{fudPen > 0 ? `${redFlags.length} flag(s) detected` : 'No major FUD detected'}</div>
                  </div>
                </div>

                {/* Score legend */}
                <div style={{ background: '#f8f9ff', border: '1px solid #dbe4ff', borderRadius: 10, padding: '12px 14px' }}>
                  <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 9, color: '#868e96', letterSpacing: 1, marginBottom: 8 }}>SCORE LEGEND — WHAT EACH RANGE MEANS</div>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' as const }}>
                    {[
                      { range: '800-1000', tier: 'A', label: 'FARM IT' },
                      { range: '600-799', tier: 'B', label: 'CREATE CONTENT' },
                      { range: '350-599', tier: 'C', label: 'WATCH' },
                      { range: '0-349', tier: 'D', label: 'SKIP' },
                    ].map(item => (
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
            <div style={{ display: 'grid', gridTemplateColumns: '160px 1fr', gap: 12, marginBottom: 14 }}>
              <div style={{ background: '#fff', border: '1px solid #dbe4ff', borderRadius: 14, padding: 18, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
                <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 9, color: '#868e96', letterSpacing: '1.5px' }}>ALPHA SCORE</div>
                <div style={{ fontSize: 52, fontWeight: 800, color: otc.solid, lineHeight: 1, letterSpacing: -3 }}>{result.overall_score ?? 0}</div>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, borderRadius: 20, padding: '5px 12px', border: `1px solid ${otc.border}`, background: otc.bg }}>
                  <div dangerouslySetInnerHTML={{ __html: tsq(ot, 20) }} />
                  <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 10, color: otc.tc }}>Overall {otc.lbl}</span>
                </div>
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
                {goodHighlights.length > 0 && (
                  <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' as const }}>
                    {goodHighlights.map((h: string, i: number) => <span key={i} style={{ fontSize: 10, background: '#ebfbee', color: '#2f9e44', border: '1px solid #8ce99a', borderRadius: 20, padding: '2px 8px' }}>✓ {h}</span>)}
                  </div>
                )}
                {result.data_accuracy_note && <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 9, color: '#adb5bd', marginTop: 8, paddingTop: 8, borderTop: '1px solid #f0f4ff' }}>ℹ {result.data_accuracy_note}</div>}
              </div>
            </div>

            {/* Rationale */}
            {result.score_rationale && (
              <div style={{ background: '#f8f9ff', border: '1px solid #dbe4ff', borderLeft: '3px solid #16a34a', padding: '12px 14px', marginBottom: 14 }}>
                <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 9, color: '#15803d', letterSpacing: 1, marginBottom: 5 }}>WHY THIS SCORE</div>
                <div style={{ fontSize: 12, color: '#6c7a9c', lineHeight: 1.7 }}>{result.score_rationale}</div>
              </div>
            )}

            {/* How to play */}
            <div style={{ background: 'linear-gradient(135deg,#f0f4ff,#e8ecff)', border: '1px solid #c5d0ff', borderLeft: '3px solid #16a34a', borderRadius: 12, padding: '14px 16px', marginBottom: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: '#1c2b5a' }}>How to play this</span>
                <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 9, color: '#15803d', background: '#fff', border: '1px solid #86efac', padding: '3px 9px', borderRadius: 20 }}>{result.project_category || 'Infrastructure'}</span>
              </div>
              <div style={{ fontSize: 12, color: '#475569', lineHeight: 1.65 }}>{HOW_TO_PLAY[result.project_category as string] || HOW_TO_PLAY['Infrastructure']}</div>
            </div>

            {/* Deep Intel */}
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
                      <span style={{ background: '#ebfbee', color: '#2f9e44', border: '1px solid #8ce99a', borderRadius: 20, padding: '3px 10px', fontFamily: "'DM Mono',monospace", fontSize: 10, display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                        <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#2f9e44', display: 'inline-block' }} />
                        {cgData.ticker} {cgData.token_price}
                      </span>
                      {cgData.token_note && <div style={{ fontSize: 11, color: '#6c7a9c', marginTop: 4 }}>{cgData.token_note}</div>}
                    </div>
                    <div style={{ background: '#f8f9ff', border: '1px solid #dbe4ff', borderRadius: 8, padding: '10px 12px' }}>
                      <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 8, color: '#868e96', letterSpacing: 1, marginBottom: 5 }}>TOKEN OUTLOOK</div>
                      <div style={{ fontSize: 12, fontWeight: 600, color: result.post_tge_outlook === 'High Potential' ? '#2f9e44' : result.post_tge_outlook === 'Low Potential' ? '#868e96' : '#e67700' }}>{result.post_tge_outlook || 'Unknown'}</div>
                    </div>
                  </div>
                )}
                {result.future_seasons && !result.future_seasons.toLowerCase().includes('no ') && !result.future_seasons.toLowerCase().includes('unknown') && !result.future_seasons.toLowerCase().includes('unconfirmed') && !result.future_seasons.toLowerCase().includes('likely given') && result.future_seasons.length > 15 && (
                  <div style={{ background: '#f8f9ff', border: '1px solid #dbe4ff', borderRadius: 8, padding: '10px 12px', marginBottom: 8 }}>
                    <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 8, color: '#868e96', letterSpacing: 1, marginBottom: 5 }}>FUTURE SEASONS / POST-TGE</div>
                    <div style={{ fontSize: 12, color: '#1c2b5a', lineHeight: 1.5 }}>{result.future_seasons}</div>
                  </div>
                )}
                {result.project_follows && result.project_follows.toLowerCase() !== 'unknown' && result.project_follows.length > 15 && (
                  <div style={{ background: '#f8f9ff', border: '1px solid #dbe4ff', borderRadius: 8, padding: '10px 12px' }}>
                    <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 8, color: '#868e96', letterSpacing: 1, marginBottom: 5 }}>NOTABLE X FOLLOWS (NETWORK SIGNAL)</div>
                    <div style={{ fontSize: 12, color: '#1c2b5a', lineHeight: 1.5 }}>{result.project_follows}</div>
                  </div>
                )}
              </div>
            )}

            {/* Team */}
            {result.team_members?.filter((m: any) => m.name).length > 0 && (
              <div style={{ background: '#fff', border: '1px solid #dbe4ff', borderRadius: 14, padding: 16, marginBottom: 14 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#1c2b5a', marginBottom: 12 }}>👥 Team & Founders</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(240px,1fr))', gap: 10 }}>
                  {result.team_members.filter((m: any) => m.name).map((m: any, i: number) => <TeamCard key={i} member={m} />)}
                </div>
              </div>
            )}

            {/* Tier Summary */}
            <div style={{ background: '#fff', border: '1px solid #dbe4ff', borderRadius: 14, padding: 16, marginBottom: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, paddingBottom: 10, borderBottom: '1px solid #f0f4ff' }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: '#1c2b5a' }}>Project Tier Summary</span>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, borderRadius: 8, padding: '4px 10px', border: `1px solid ${otc.border}`, background: otc.bg }}>
                  <div dangerouslySetInnerHTML={{ __html: tsq(ot, 18) }} />
                  <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 9, color: otc.tc }}>Overall {otc.lbl} · {otc.v}</span>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8 }}>
                {groups.map(g => (
                  <div key={g.label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#f8f9ff', border: `1px solid ${g.cfg.border}`, borderRadius: 8, padding: '8px 12px' }}>
                    <span style={{ fontSize: 11, color: '#6c7a9c' }}>{g.label}</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                      <div dangerouslySetInnerHTML={{ __html: tsq(g.tier, 17) }} />
                      <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 9, color: g.cfg.tc }}>{g.cfg.lbl}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Tabs */}
            <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' as const, marginBottom: 12 }}>
              {[{ id: 'metrics', l: '📊 Metrics' }, { id: 'mindshare', l: '🧠 Mindshare' }, { id: 'risks', l: '⚠️ Risks' }, { id: 'sources', l: '📎 Sources' }].map(sec => (
                <button key={sec.id} onClick={() => setAsec(sec.id)}
                  style={{ padding: '8px 18px', borderRadius: 10, border: `1px solid ${asec === sec.id ? '#14532d' : '#d4e8d0'}`, background: asec === sec.id ? '#14532d' : '#fff', color: asec === sec.id ? '#fff' : '#6c7a9c', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.15s' }}>
                  {sec.l}
                </button>
              ))}
            </div>

            {asec === 'metrics' && (
              <div style={{ background: '#fff', border: '1px solid #dbe4ff', borderRadius: 14, padding: 16, marginBottom: 12 }}>
                <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' as const, marginBottom: 10 }}>
                  {CATS.map(cat => {
                    const sc = catScore(cat)
                    return (
                      <button key={cat} onClick={() => setAtab(cat)}
                        style={{ padding: '5px 12px', borderRadius: 7, border: `1px solid ${atab === cat ? '#14532d' : '#d4e8d0'}`, background: atab === cat ? '#14532d' : '#fff', color: atab === cat ? '#fff' : '#6c7a9c', fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
                        {cat} <span style={{ color: atab === cat ? '#fff' : T[getTier(sc)].solid, fontFamily: "'DM Mono',monospace", fontSize: 9 }}>{sc}</span>
                      </button>
                    )
                  })}
                </div>
                <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 9, color: '#adb5bd', textAlign: 'right' as const, marginBottom: 10 }}>tap any row for analyst commentary</div>
                {METRICS.filter(m => m.cat === atab).map(m => <MetricRow key={m.id} metric={m} data={result.metrics?.[m.id]} />)}
              </div>
            )}

            {asec === 'mindshare' && (
              <div style={{ background: '#fff', border: '1px solid #dbe4ff', borderRadius: 14, padding: 16, marginBottom: 12 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#1c2b5a', marginBottom: 4 }}>Mindshare Trend</div>
                <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 9, color: '#adb5bd', marginBottom: 14 }}>Estimated CT mindshare % over the past 8 weeks</div>
                <canvas ref={canvasRef} style={{ width: '100%', height: 110 }} />
                {result.mindshare_trend && (
                  <div style={{ display: 'flex', gap: 16, marginTop: 8 }}>
                    <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 9, color: '#868e96' }}>Current: <strong style={{ color: '#3b5bdb' }}>{result.mindshare_trend.current_pct || 'n/a'}</strong></span>
                    <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 9, color: '#868e96' }}>Trend: <strong style={{ color: '#3b5bdb' }}>{result.mindshare_trend.trend || 'n/a'}</strong></span>
                  </div>
                )}
              </div>
            )}

            {asec === 'risks' && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
                <div style={{ background: '#fff', border: '1px solid #dbe4ff', borderRadius: 14, padding: 15 }}>
                  <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 9, fontWeight: 500, letterSpacing: 1, marginBottom: 10, color: '#c92a2a', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#c92a2a', display: 'inline-block' }} />TOP RISKS
                  </div>
                  {(result.top_risks || []).filter((x: string) => x).map((x: string, i: number) => (
                    <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                      <span style={{ color: '#ffc9c9', flexShrink: 0, fontSize: 16 }}>•</span>
                      <span style={{ fontSize: 11, color: '#6c7a9c', lineHeight: 1.5 }}>{x}</span>
                    </div>
                  ))}
                </div>
                <div style={{ background: '#fff', border: '1px solid #dbe4ff', borderRadius: 14, padding: 15 }}>
                  <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 9, fontWeight: 500, letterSpacing: 1, marginBottom: 10, color: '#2f9e44', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#2f9e44', display: 'inline-block' }} />OPPORTUNITIES
                  </div>
                  {(result.top_opportunities || []).filter((x: string) => x).map((x: string, i: number) => (
                    <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                      <span style={{ color: '#8ce99a', flexShrink: 0, fontSize: 16 }}>•</span>
                      <span style={{ fontSize: 11, color: '#6c7a9c', lineHeight: 1.5 }}>{x}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {asec === 'sources' && (
              <div style={{ background: '#fff', border: '1px solid #dbe4ff', borderRadius: 14, padding: 16, marginBottom: 12 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#1c2b5a', marginBottom: 14 }}>Research Sources</div>
                {(result.sources || []).filter((s: any) => s.name).length > 0 ? (result.sources || []).filter((s: any) => s.name).map((src: any, i: number) => (
                  <div key={i} style={{ display: 'flex', gap: 10, paddingBottom: 10, marginBottom: 10, borderBottom: '1px solid #f0f4ff' }}>
                    <div style={{ width: 22, height: 22, borderRadius: '50%', background: '#e8ecff', color: '#3b5bdb', fontFamily: "'DM Mono',monospace", fontSize: 9, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1 }}>{i + 1}</div>
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 600, color: '#14532d', marginBottom: 2 }}>{src.name || src.title || ''}</div>
                      <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 9, color: '#adb5bd', marginBottom: 3 }}>{src.used_for || src.type || ''}</div>
                      {src.url && src.url !== 'unknown' && <a href={src.url} target="_blank" rel="noreferrer" style={{ fontFamily: "'DM Mono',monospace", fontSize: 9, color: '#3b5bdb', textDecoration: 'none' }}>{src.url.slice(0, 55)}{src.url.length > 55 ? '...' : ''}</a>}
                    </div>
                  </div>
                )) : <div style={{ fontSize: 12, color: '#adb5bd', textAlign: 'center' as const, padding: 24 }}>No sources found.</div>}
              </div>
            )}

            <div style={{ textAlign: 'center' as const, fontFamily: "'DM Mono',monospace", fontSize: 9, color: '#adb5bd', letterSpacing: 1, paddingTop: 6 }}>CMV ALPHASCANNER · POWERED BY CLAUDE AI · NOT FINANCIAL ADVICE</div>
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
