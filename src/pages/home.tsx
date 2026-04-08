import { useState, useEffect, useRef } from 'react'

const METRICS = [
  { id: 'funding', label: 'Funding Quality', icon: '💰', cat: 'Fundamentals' },
  { id: 'vc_pedigree', label: 'VC Pedigree & Track Record', icon: '🏦', cat: 'Fundamentals' },
  { id: 'copycat', label: 'Originality Check', icon: '🔍', cat: 'Fundamentals' },
  { id: 'niche', label: 'Niche Potential', icon: '🎯', cat: 'Fundamentals' },
  { id: 'location', label: 'Team Location & Ecosystem', icon: '🌍', cat: 'Fundamentals' },
  { id: 'founder_cred', label: 'Founder Credibility', icon: '👤', cat: 'Team' },
  { id: 'founder_activity', label: 'Founder X Activity', icon: '📡', cat: 'Team' },
  { id: 'top_voices', label: 'Top Voices Talking About It', icon: '🎙️', cat: 'Team' },
  { id: 'token', label: 'Token Confirmation', icon: '🪙', cat: 'Opportunity' },
  { id: 'metrics_clarity', label: 'Top 1-10% Requirements', icon: '📊', cat: 'Opportunity' },
  { id: 'user_count', label: 'User Count & Dilution Risk', icon: '👥', cat: 'Opportunity' },
  { id: 'fud', label: 'FUD Alert', icon: '⚠️', cat: 'Sentiment' },
  { id: 'notable_mentions', label: 'Notable CT Mentions', icon: '📣', cat: 'Sentiment' },
  { id: 'content_type', label: 'Organic vs Sponsored', icon: '🎬', cat: 'Sentiment' },
  { id: 'mindshare', label: 'Current Mindshare', icon: '🧠', cat: 'Traction' },
  { id: 'revenue', label: 'Revenue Generation', icon: '📈', cat: 'Traction' },
  { id: 'sentiment', label: 'Overall CT Sentiment', icon: '🌡️', cat: 'Traction' },
]

const CATS = ['Fundamentals', 'Team', 'Opportunity', 'Sentiment', 'Traction']

const PHASES = [
  'Checking CoinGecko for token data...',
  'Searching the web...',
  'Verifying project identity...',
  'Researching VCs & funding...',
  'Computing CMV Influence Scores...',
  'Analyzing CT sentiment...',
  'Computing tier score...',
]

const T: Record<string, any> = {
  A: { bg: '#ebfbee', border: '#8ce99a', tc: '#2f9e44', solid: '#37b24d', lbl: 'Tier A', v: 'FARM IT', sub: 'High conviction play. Go hard.', target: 'Top 30-50%', vbg: 'linear-gradient(135deg,#37b24d,#2f9e44)' },
  B: { bg: '#fff3bf', border: '#ffe066', tc: '#e67700', solid: '#f59f00', lbl: 'Tier B', v: 'CREATE CONTENT', sub: 'Might cook or not. Keep expectations low.', target: 'Top 20%', vbg: 'linear-gradient(135deg,#f59f00,#e67700)' },
  C: { bg: '#fff4e6', border: '#ffc078', tc: '#d9480f', solid: '#e8590c', lbl: 'Tier C', v: 'WATCH', sub: 'Too early to call. Monitor closely.', target: 'Top 10%', vbg: 'linear-gradient(135deg,#e8590c,#d9480f)' },
  D: { bg: '#f1f3f5', border: '#dee2e6', tc: '#495057', solid: '#868e96', lbl: 'Tier D', v: 'SKIP', sub: 'Not worth your time right now.', target: '', vbg: 'linear-gradient(135deg,#868e96,#495057)' },
}

const HOW_TO_PLAY: Record<string, string> = {
  'AI Project': 'Create content, test the product publicly and document your experience. Early users who build in public get rewarded. Share tutorials, feedback threads and use-case breakdowns.',
  'Perp DEX': 'Farm carefully. Use delta neutral strategies or a signal provider. Do not trade with money you cannot afford to lose. Keep your farming wallet separate from your trading wallet.',
  'L1/L2': 'Create content, run a node if possible, and perform a wide variety of onchain tasks. Diversity of activity matters more than volume. Document everything publicly.',
  'Testnet': 'Do every single task available. Testnet rewards go to the most active early users. Document your activity with screenshots and share publicly.',
  'Prediction Market': 'Create content and farm points aggressively but never bet more than you can lose. Keep your farming wallet completely separate from your prediction wallet.',
  'DeFi/Lending': 'Provide liquidity early, monitor token unlock schedules closely, and watch for VC dump windows before making large commitments.',
  'NFT/Gaming': 'Engage with the community first, create content, and hold floor assets carefully. Community standing often matters more than wallet activity.',
  'RWA': 'This is a long term hold play. Create educational content about the project. Do not expect a quick airdrop — patience is the strategy here.',
  'SocialFi': 'Be active on the platform early, build your follower count within the app itself, and refer aggressively. First mover advantage is everything in SocialFi.',
  'Infrastructure': 'Build something on it publicly if you can. Developer allocations are typically the most generous. Even simple tools or tutorials count.',
}

function getTier(s: number) { return s >= 80 ? 'A' : s >= 60 ? 'B' : s >= 35 ? 'C' : 'D' }

function computeCMVScore(voice: any) {
  const followers = voice.followers || 0
  const engRate = voice.engagement_rate || 0
  const verified = voice.verified ? 1 : 0
  const age = voice.account_age_years || 0
  const postQuality = voice.post_quality_score || 50
  const authenticity = voice.authenticity_score || 50
  const companyAffiliated = voice.company_affiliated ? 1 : 0
  const companyCredibility = voice.company_credibility || 0
  const vouchScore = voice.vouch_score || 0
  const followerScore = Math.min(100, Math.log10(Math.max(followers, 1)) / 5 * 100)
  const engScore = Math.min(100, engRate * 20)
  const credScore = (verified * 40) + (companyAffiliated * 30) + (companyCredibility * 0.3)
  const authScore = (postQuality * 0.5) + (authenticity * 0.3) + (Math.min(age, 10) / 10 * 20)
  const vouchFinal = Math.min(100, vouchScore)
  const raw = (followerScore * 0.25) + (engScore * 0.25) + (credScore * 0.20) + (authScore * 0.15) + (vouchFinal * 0.15)
  return {
    total: Math.round(Math.min(1000, raw * 10)),
    breakdown: {
      'follower quality': Math.round(followerScore),
      'engagement': Math.round(engScore),
      'credibility': Math.round(credScore),
      'authenticity': Math.round(authScore),
      'vouch': Math.round(vouchFinal),
    }
  }
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

function tsq(tier: string, sz = 20) {
  return `<div style="width:${sz}px;height:${sz}px;background:${T[tier].solid};border-radius:${sz > 20 ? 6 : 4}px;display:flex;align-items:center;justify-content:center;font-family:'DM Mono',monospace;font-size:${sz > 20 ? 12 : 9}px;font-weight:500;color:#fff;flex-shrink:0">${tier}</div>`
}

async function fetchCoinGecko(name: string) {
  try {
    const r = await fetch(`https://api.coingecko.com/api/v3/search?query=${encodeURIComponent(name)}`)
    const d = await r.json()
    const coin = d.coins?.[0]
    if (!coin) return { token_live: false, token_price: 'Not Launched', token_note: 'No CoinGecko listing found' }
    const pr = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${coin.id}&vs_currencies=usd&include_market_cap=true`)
    const pd = await pr.json()
    const price = pd[coin.id]?.usd
    if (!price || price === 0) return { token_live: false, ticker: coin.symbol?.toUpperCase(), token_price: 'Not Launched', token_note: 'Listed on CoinGecko but no active price — not yet trading' }
    return { token_live: true, ticker: coin.symbol?.toUpperCase(), token_price: `$${price}`, market_cap: pd[coin.id]?.usd_market_cap, token_note: `Live on CoinGecko · ${coin.name}` }
  } catch { return { token_live: false, token_price: 'Not Launched', token_note: 'CoinGecko lookup failed' } }
}

const SYSTEM_PROMPT = `You are CMV AlphaScanner, a sharp crypto/Web3 alpha analyst. Today: ${new Date().toDateString()}.

CRITICAL ACCURACY RULES:
1. Use web_search to find REAL current data. Never guess.
2. Use BOTH project name and X URL to identify the EXACT correct project.
3. Token status is pre-fetched from CoinGecko — use it directly, do NOT search CoinGecko again.
4. For founder details — only state names if found from official sources. If unconfirmed write: "Team details unconfirmed — check official website and whitepaper for verified information."
5. Always return full results. Never block or refuse.

SCORE INTEGRITY — be harsh:
- Most projects score 35-65. Score above 75 requires exceptional evidence.
- Tier A (FARM IT) = 80+ with confirmed funding, active founders, low dilution, strong CT sentiment ALL at once.
- Tier B (CREATE CONTENT) = 60-79
- Tier C (WATCH) = 35-59
- Tier D (SKIP) = 0-34
- FUD score < 40 = overall max 65
- user_count score < 30 = overall max 60
- vc_pedigree score < 40 = overall max 65
- When in doubt score lower. Never inflate.

VERDICT ACTION GUIDE — this is critical. The verdict_action field must be SPECIFIC to this project based on what you find:
- If the project has a Season 2 or ongoing farming campaign: mention it specifically
- If it is pre-TGE: say "Stack points before TGE — airdrop likely"
- If it is a Perp DEX: say "Trade with delta neutral strategy, do NOT create content — this is a trading protocol"
- If it requires trading volume: say "Generate trading volume on the platform"
- If it requires Discord roles: say "Get Discord roles — they matter for allocation"
- If it requires liquidity provision: say "Provide liquidity in the pools early"
- If it requires onchain tasks: list the specific tasks
- If content helps: say "Create content about [specific topic relevant to this project]"
- If there is a leaderboard: say "Climb the leaderboard — top X% gets rewarded"
- Be SPECIFIC to this project. Never give generic advice.

For ct_voices include:
- handle, name, quote, sentiment, x_score (0-1000 Wallchain-style score), ethos_score, is_paid, date
- followers (number), engagement_rate (decimal), verified (boolean), account_age_years, post_quality_score (0-100), authenticity_score (0-100), company_affiliated (boolean), company_credibility (0-100), vouch_score (0-100)

Detect project_category from: AI Project, Perp DEX, L1/L2, Testnet, Prediction Market, DeFi/Lending, NFT/Gaming, RWA, SocialFi, Infrastructure.

Return ONLY valid JSON — no text before or after:
{"project_name":"","ticker":"","description":"","team_location":"","founded":"","project_category":"Infrastructure","handle_note":null,"verdict":"WATCH","verdict_reason":"","verdict_action":"Specific action guide for this exact project based on what you found","overall_score":0,"score_rationale":"","data_accuracy_note":"","post_tge_outlook":"Medium Potential","future_seasons":"","founder_details":"","project_follows":"","mindshare_trend":{"labels":["8w ago","7w ago","6w ago","5w ago","4w ago","3w ago","2w ago","1w ago"],"values":[0,0,0,0,0,0,0,0],"current_pct":"0%","trend":"stable"},"ct_voices":[{"handle":"@h","name":"N","quote":"q","sentiment":"neutral","x_score":0,"ethos_score":0,"is_paid":false,"date":"","followers":0,"engagement_rate":0,"verified":false,"account_age_years":0,"post_quality_score":50,"authenticity_score":50,"company_affiliated":false,"company_credibility":0,"vouch_score":0}],"sources":[{"name":"","url":"","used_for":""}],"metrics":{"funding":{"score":0,"detail":"","why_this_score":"","signal":"neutral"},"vc_pedigree":{"score":0,"detail":"","why_this_score":"","signal":"neutral"},"copycat":{"score":0,"detail":"","why_this_score":"","signal":"neutral"},"niche":{"score":0,"detail":"","why_this_score":"","signal":"neutral"},"location":{"score":0,"detail":"","why_this_score":"","signal":"neutral"},"founder_cred":{"score":0,"detail":"","why_this_score":"","signal":"neutral"},"founder_activity":{"score":0,"detail":"","why_this_score":"","signal":"neutral"},"top_voices":{"score":0,"detail":"","why_this_score":"","signal":"neutral"},"token":{"score":0,"detail":"","why_this_score":"","signal":"neutral"},"metrics_clarity":{"score":0,"detail":"","why_this_score":"","signal":"neutral"},"user_count":{"score":0,"detail":"","why_this_score":"","signal":"neutral"},"fud":{"score":0,"detail":"","why_this_score":"","signal":"neutral"},"notable_mentions":{"score":0,"detail":"","why_this_score":"","signal":"neutral"},"content_type":{"score":0,"detail":"","why_this_score":"","signal":"neutral"},"mindshare":{"score":0,"detail":"","why_this_score":"","signal":"neutral"},"revenue":{"score":0,"detail":"","why_this_score":"","signal":"neutral"},"sentiment":{"score":0,"detail":"","why_this_score":"","signal":"neutral"}},"top_risks":["","",""],"top_opportunities":["",""]}`

function MetricRow({ metric, data }: { metric: any, data: any }) {
  const [open, setOpen] = useState(false)
  const sc = typeof data?.score === 'number' ? data.score : 0
  const tier = getTier(sc)
  const col = T[tier].solid
  const sig = data?.signal ?? 'neutral'
  const sigBg = sig === 'bullish' ? '#ebfbee' : sig === 'bearish' ? '#fff5f5' : '#f1f3f5'
  const sigTc = sig === 'bullish' ? '#2f9e44' : sig === 'bearish' ? '#c92a2a' : '#868e96'

  return (
    <div onClick={() => setOpen(o => !o)}
      style={{ border: `1px solid ${open ? '#c5d0ff' : '#f0f4ff'}`, borderRadius: 10, padding: '11px 13px', marginBottom: 4, cursor: 'pointer', background: open ? '#f8f9ff' : '#fff' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
        <span style={{ fontSize: 14 }}>{metric.icon}</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 5, gap: 8 }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: '#1c2b5a' }}>{metric.label}</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexShrink: 0 }}>
              <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, padding: '2px 6px', borderRadius: 20, background: sigBg, color: sigTc }}>{sig}</span>
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

export default function Home() {
  const [projName, setProjName] = useState('')
  const [xUrl, setXUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [cgData, setCgData] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)
  const [phase, setPhase] = useState(PHASES[0])
  const [elapsed, setElapsed] = useState(0)
  const [atab, setAtab] = useState('Fundamentals')
  const [asec, setAsec] = useState('metrics')
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const pint = useRef<any>(null)
  const tint = useRef<any>(null)

  useEffect(() => {
    if (loading) {
      setElapsed(0)
      let pi = 0
      tint.current = setInterval(() => setElapsed(e => e + 1), 1000)
      pint.current = setInterval(() => { pi = (pi + 1) % PHASES.length; setPhase(PHASES[pi]) }, 4000)
    } else {
      clearInterval(tint.current); clearInterval(pint.current)
    }
    return () => { clearInterval(tint.current); clearInterval(pint.current) }
  }, [loading])

  useEffect(() => {
    if (result?.mindshare_trend && asec === 'mindshare' && canvasRef.current) {
      setTimeout(() => drawChart(result.mindshare_trend), 100)
    }
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

  async function analyze() {
    if (!projName.trim() && !xUrl.trim()) return
    setLoading(true); setResult(null); setCgData(null); setError(null); setAtab('Fundamentals'); setAsec('metrics')
    const handle = (xUrl.replace('https://x.com/', '').replace('https://twitter.com/', '').replace('@', '').split('/')[0].trim()) || projName.replace(/\s+/g, '').toLowerCase()
    const cg = await fetchCoinGecko(projName || handle)
    setCgData(cg)
    try {
      const r = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': import.meta.env.VITE_ANTHROPIC_API_KEY,
          'anthropic-version': '2023-06-01',
          'anthropic-dangerous-direct-browser-access': 'true',
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 4000,
          system: SYSTEM_PROMPT,
          tools: [{ type: 'web_search_20250305', name: 'web_search' }],
          messages: [{
            role: 'user', content: `Research and analyze this crypto/Web3 project:
Project Name: ${projName || 'unknown'}
X Profile URL: ${xUrl || 'not provided'}
X Handle: @${handle}

CoinGecko Token Data (pre-fetched — use directly, do NOT search CoinGecko again): ${JSON.stringify(cg)}

Do 2 targeted searches:
1. "${projName || handle} crypto project season 2 airdrop farming requirements discord leaderboard" to find SPECIFIC farming actions needed
2. "${handle} CT sentiment token unlock schedule community 2025 2026" for community data

For verdict_action: Be SPECIFIC. Find out if they have Season 2, if they need trading volume, Discord roles, liquidity provision, content creation, onchain tasks, leaderboard climbing. Name the exact actions needed for THIS project.

Return complete JSON. Apply strict score integrity rules. Return ONLY JSON.`
          }]
        })
      })
      const data = await r.json()
      if (data.error) throw new Error(data.error.message)
      const txt = (data.content || []).filter((b: any) => b.type === 'text').map((b: any) => b.text).join('\n')
      if (!txt.trim()) throw new Error('No response received. Please try again.')
      const parsed = xjson(txt)
      if (!parsed) throw new Error('Could not read results. Please try again.')
      setResult(parsed)
    } catch (e: any) {
      setError(e.message || 'Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const ot = result ? getTier(result.overall_score ?? 0) : 'C'
  const otc = T[ot]

  const groups = result ? [
    { label: 'Team Intentions', score: Math.round(((result.metrics?.founder_cred?.score ?? 0) + (result.metrics?.founder_activity?.score ?? 0)) / 2) },
    { label: 'Funding', score: result.metrics?.funding?.score ?? 0 },
    { label: 'Narrative', score: result.metrics?.niche?.score ?? 0 },
    { label: 'Revenue', score: result.metrics?.revenue?.score ?? 0 },
    { label: 'Community', score: result.metrics?.sentiment?.score ?? 0 },
    { label: 'CT Buzz', score: Math.round(((result.metrics?.notable_mentions?.score ?? 0) + (result.metrics?.top_voices?.score ?? 0)) / 2) },
  ].map(g => ({ ...g, tier: getTier(g.score), cfg: T[getTier(g.score)] })) : []

  const loadingMessages = [
    'Currently scanning.... 😊',
    'Deep diving into the data... 😊',
    'Checking what CT is saying... 😊',
    'Running the numbers... 😊',
    'Almost there... 😊',
  ]
  const msgIndex = Math.min(Math.floor(elapsed / 12), loadingMessages.length - 1)

  return (
    <div style={{ minHeight: '100vh', background: '#f0f4ff', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>

      {/* Nav */}
      <div style={{ background: '#fff', borderBottom: '1px solid #dbe4ff', padding: '0 20px', display: 'flex', alignItems: 'center', height: 56, gap: 10 }}>
        <div style={{ width: 32, height: 32, background: '#1c2b5a', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04a1 1 0 000-1.41l-2.34-2.34a1 1 0 00-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z" fill="#fff" /></svg>
        </div>
        <span style={{ fontSize: 16, fontWeight: 800, color: '#1c2b5a', letterSpacing: -0.3 }}>CMV <span style={{ color: '#3b5bdb' }}>AlphaScanner</span></span>
        <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, color: '#3b5bdb', background: '#e8ecff', borderRadius: 20, padding: '3px 8px', marginLeft: 'auto' }}>BETA</span>
      </div>

      <div style={{ maxWidth: 860, margin: '0 auto', padding: '28px 16px 60px' }}>

        {/* Hero */}
        {!result && !loading && (
          <div style={{ textAlign: 'center', padding: '36px 0 32px' }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: '#e8ecff', borderRadius: 20, padding: '5px 14px', fontFamily: "'DM Mono', monospace", fontSize: 10, color: '#3b5bdb', marginBottom: 18 }}>Alpha Intelligence System</div>
            <h1 style={{ fontSize: 'clamp(26px,4vw,40px)', fontWeight: 800, color: '#1c2b5a', lineHeight: 1.2, marginBottom: 14, letterSpacing: -0.5 }}>Know if this project<br />is <span style={{ color: '#3b5bdb' }}>worth your time.</span></h1>
            <p style={{ fontSize: 14, color: '#6c7a9c', lineHeight: 1.7, maxWidth: 480, margin: '0 auto 12px' }}>Evaluating various metrics grouped into categories and tiers — telling you exactly what level you need to achieve per project to make it worth your effort.</p>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, flexWrap: 'wrap' as const }}>
              {['17 metrics', '4 tiers', 'CMV Influence Score', 'real web search', 'sources cited'].map(t => (
                <span key={t} style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, color: '#868e96', background: '#fff', border: '1px solid #dbe4ff', borderRadius: 20, padding: '4px 10px' }}>{t}</span>
              ))}
            </div>
          </div>
        )}

        {/* Search */}
        <div style={{ background: '#fff', border: '1px solid #dbe4ff', borderRadius: 16, padding: 20, marginBottom: 18, boxShadow: '0 2px 12px rgba(59,91,219,0.06)' }}>
          <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, color: '#868e96', letterSpacing: '1.5px', marginBottom: 6 }}>PROJECT NAME</div>
          <input style={{ width: '100%', background: '#f8f9ff', border: '1px solid #dbe4ff', borderRadius: 10, padding: '11px 14px', fontSize: 14, color: '#1c2b5a', fontFamily: 'inherit', marginBottom: 12, outline: 'none' }}
            placeholder="e.g. EigenLayer, Hyperliquid, Kaito..."
            value={projName} onChange={e => setProjName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !loading && analyze()} disabled={loading} />
          <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, color: '#868e96', letterSpacing: '1.5px', marginBottom: 6 }}>X PROFILE URL</div>
          <div style={{ display: 'flex', gap: 10 }}>
            <input style={{ flex: 1, background: '#f8f9ff', border: '1px solid #dbe4ff', borderRadius: 10, padding: '11px 14px', fontSize: 12, color: '#1c2b5a', fontFamily: "'DM Mono', monospace", outline: 'none' }}
              placeholder="https://x.com/projecthandle"
              value={xUrl} onChange={e => setXUrl(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && !loading && analyze()} disabled={loading} />
            <button onClick={analyze} disabled={loading || (!projName.trim() && !xUrl.trim())}
              style={{ background: '#1c2b5a', color: '#fff', border: 'none', borderRadius: 10, padding: '11px 26px', fontSize: 13, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' as const, fontFamily: 'inherit', opacity: loading || (!projName.trim() && !xUrl.trim()) ? 0.4 : 1 }}>
              {loading ? 'Scanning...' : 'Analyze'}
            </button>
          </div>
          <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, color: '#adb5bd', marginTop: 10 }}>Providing both the project name and X URL gives more accurate results</div>
        </div>

        {/* Loading */}
        {loading && (
          <div style={{ background: '#fff', border: '1px solid #dbe4ff', borderRadius: 14, padding: 24, marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 20, background: '#f8f9ff', borderRadius: 12, padding: '14px 16px' }}>
              <img
                src="/pfp.jpeg"
                alt="CMV"
                style={{ width: 48, height: 48, borderRadius: '50%', objectFit: 'cover', flexShrink: 0, border: '2px solid #dbe4ff' }}
                onError={(e: any) => { e.target.style.display = 'none' }}
              />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#1c2b5a', marginBottom: 3 }}>@Cmv_ng</div>
                <div style={{ fontSize: 14, color: '#6c7a9c' }}>{loadingMessages[msgIndex]}</div>
              </div>
              <div style={{ textAlign: 'right' as const, flexShrink: 0 }}>
                <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 22, fontWeight: 700, color: '#3b5bdb' }}>{elapsed}s</div>
                <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, color: '#adb5bd' }}>elapsed</div>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 13, marginBottom: 16 }}>
              <div style={{ width: 28, height: 28, border: '2.5px solid #dbe4ff', borderTopColor: '#3b5bdb', borderRadius: '50%', animation: 'spin 0.7s linear infinite', flexShrink: 0 }} />
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#1c2b5a', marginBottom: 2 }}>{phase}</div>
                <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, color: '#adb5bd' }}>analyzing {projName || xUrl}</div>
              </div>
            </div>
            {[100, 83, 91, 74].map((w, i) => (
              <div key={i} style={{ height: 42, background: 'linear-gradient(90deg,#f0f4ff 25%,#e8ecff 50%,#f0f4ff 75%)', backgroundSize: '400px 100%', animation: 'shimmer 1.3s infinite', borderRadius: 8, marginBottom: 7, width: `${w}%` }} />
            ))}
          </div>
        )}

        {/* Error */}
        {error && (
          <div style={{ background: '#fff5f5', border: '1px solid #ffc9c9', borderRadius: 12, padding: '14px 16px', marginBottom: 14 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#e03131', marginBottom: 4 }}>Scan failed</div>
            <div style={{ fontSize: 11, color: '#c92a2a', lineHeight: 1.5, marginBottom: 8 }}>{error}</div>
            <button onClick={analyze} style={{ fontSize: 11, padding: '5px 12px', borderRadius: 7, border: '1px solid #ffc9c9', background: '#fff5f5', color: '#e03131', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 600 }}>Try again</button>
          </div>
        )}

        {/* Results */}
        {result && !loading && (
          <div>
            {result.handle_note && (
              <div style={{ background: '#e8ecff', border: '1px solid #c5d0ff', borderRadius: 9, padding: '10px 14px', marginBottom: 12, fontSize: 12, color: '#3b5bdb' }}>💡 {result.handle_note}</div>
            )}

            {/* Top 3 cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,minmax(0,1fr))', gap: 12, marginBottom: 14 }}>
              <div style={{ background: '#fff', border: '1px solid #dbe4ff', borderRadius: 14, padding: 20, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
                <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, color: '#868e96', letterSpacing: '1.5px' }}>ALPHA SCORE</div>
                <div style={{ fontSize: 48, fontWeight: 800, color: otc.solid, lineHeight: 1, letterSpacing: -2 }}>{result.overall_score ?? 0}</div>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, borderRadius: 20, padding: '5px 12px', border: `1px solid ${otc.border}`, background: otc.bg }}>
                  <div dangerouslySetInnerHTML={{ __html: tsq(ot, 20) }} />
                  <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: otc.tc }}>Overall {otc.lbl}</span>
                </div>
              </div>

              <div style={{ background: otc.vbg, borderRadius: 14, padding: 18, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, letterSpacing: '1.5px', marginBottom: 6, color: 'rgba(255,255,255,0.8)' }}>FINAL VERDICT</div>
                <div style={{ fontSize: 22, fontWeight: 800, color: '#fff', marginBottom: 4 }}>{otc.v}</div>
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.9)', marginBottom: 10, fontStyle: 'italic' }}>{otc.sub}</div>
                <div style={{ background: 'rgba(0,0,0,0.1)', borderRadius: 10, padding: '10px 12px', border: '1px solid rgba(255,255,255,0.3)' }}>
                  <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 8, letterSpacing: 1, marginBottom: 5, color: 'rgba(255,255,255,0.7)' }}>WHAT YOU SHOULD DO</div>
                  <div style={{ fontSize: 11, lineHeight: 1.6, color: 'rgba(255,255,255,0.95)' }}>{result.verdict_action || result.verdict_reason}</div>
                  {otc.target && <div style={{ marginTop: 8, display: 'inline-flex', alignItems: 'center', gap: 4, borderRadius: 20, padding: '3px 10px', fontFamily: "'DM Mono', monospace", fontSize: 9, color: '#fff', background: 'rgba(255,255,255,0.2)', border: '1px solid rgba(255,255,255,0.3)' }}>🎯 {otc.target}</div>}
                </div>
              </div>

              <div style={{ background: '#fff', border: '1px solid #dbe4ff', borderRadius: 14, padding: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 4, flexWrap: 'wrap' as const }}>
                  <span style={{ fontSize: 17, fontWeight: 800, color: '#1c2b5a', letterSpacing: -0.3 }}>{result.project_name || ''}</span>
                  {result.ticker && result.ticker !== 'unknown' && <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, color: '#3b5bdb', background: '#e8ecff', border: '1px solid #c5d0ff', padding: '2px 7px', borderRadius: 4 }}>{result.ticker}</span>}
                </div>
                {result.team_location && <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: '#868e96', marginBottom: 6 }}>📍 {result.team_location}{result.founded ? ` · Est. ${result.founded}` : ''}</div>}
                <div style={{ fontSize: 12, color: '#6c7a9c', lineHeight: 1.6 }}>{result.description || ''}</div>
                {result.data_accuracy_note && <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, color: '#adb5bd', marginTop: 8, paddingTop: 8, borderTop: '1px solid #f0f4ff' }}>ℹ {result.data_accuracy_note}</div>}
              </div>
            </div>

            {/* Rationale */}
            {result.score_rationale && (
              <div style={{ background: '#f8f9ff', border: '1px solid #dbe4ff', borderLeft: '3px solid #3b5bdb', padding: '12px 14px', marginBottom: 14 }}>
                <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, color: '#3b5bdb', letterSpacing: 1, marginBottom: 5 }}>WHY THIS SCORE</div>
                <div style={{ fontSize: 12, color: '#6c7a9c', lineHeight: 1.7 }}>{result.score_rationale}</div>
              </div>
            )}

            {/* How to play */}
            <div style={{ background: '#f0f4ff', border: '1px solid #c5d0ff', borderLeft: '3px solid #3b5bdb', borderRadius: 10, padding: '14px 16px', marginBottom: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: '#1c2b5a' }}>How to play this</span>
                <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, color: '#3b5bdb', background: '#e8ecff', border: '1px solid #c5d0ff', padding: '3px 9px', borderRadius: 20 }}>{result.project_category || 'Infrastructure'}</span>
              </div>
              <div style={{ fontSize: 12, color: '#6c7a9c', lineHeight: 1.6 }}>{HOW_TO_PLAY[result.project_category as string] || HOW_TO_PLAY['Infrastructure']}</div>
            </div>

            {/* Deep Intel */}
            <div style={{ background: '#fff', border: '1px solid #dbe4ff', borderRadius: 14, padding: 16, marginBottom: 14 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#1c2b5a', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" stroke="#3b5bdb" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                Deep Intel
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
                <div style={{ background: '#f8f9ff', border: '1px solid #dbe4ff', borderRadius: 8, padding: '10px 12px' }}>
                  <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 8, color: '#868e96', letterSpacing: 1, marginBottom: 5 }}>TOKEN STATUS</div>
                  {cgData?.token_live
                    ? <span style={{ background: '#ebfbee', color: '#2f9e44', border: '1px solid #8ce99a', borderRadius: 20, padding: '3px 10px', fontFamily: "'DM Mono', monospace", fontSize: 10, display: 'inline-flex', alignItems: 'center', gap: 5 }}><span style={{ width: 6, height: 6, borderRadius: '50%', background: '#2f9e44', display: 'inline-block' }} />{cgData.ticker} {cgData.token_price}</span>
                    : <span style={{ background: '#f1f3f5', color: '#868e96', border: '1px solid #dee2e6', borderRadius: 20, padding: '3px 10px', fontFamily: "'DM Mono', monospace", fontSize: 10, display: 'inline-flex', alignItems: 'center', gap: 5 }}><span style={{ width: 6, height: 6, borderRadius: '50%', background: '#868e96', display: 'inline-block' }} />Not Launched</span>}
                  {cgData?.token_note && <div style={{ fontSize: 11, color: '#6c7a9c', marginTop: 4 }}>{cgData.token_note}</div>}
                </div>
                <div style={{ background: '#f8f9ff', border: '1px solid #dbe4ff', borderRadius: 8, padding: '10px 12px' }}>
                  <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 8, color: '#868e96', letterSpacing: 1, marginBottom: 5 }}>TOKEN OUTLOOK</div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: result.post_tge_outlook === 'High Potential' ? '#2f9e44' : result.post_tge_outlook === 'Low Potential' ? '#868e96' : '#e67700' }}>{result.post_tge_outlook || 'Unknown'}</div>
                </div>
              </div>
              {[
                { lbl: 'FUTURE SEASONS / POST-TGE', val: result.future_seasons },
                { lbl: 'FOUNDERS & TEAM', val: result.founder_details },
                { lbl: 'NOTABLE X FOLLOWS (NETWORK SIGNAL)', val: result.project_follows },
              ].filter(item => item.val).map(item => (
                <div key={item.lbl} style={{ background: '#f8f9ff', border: '1px solid #dbe4ff', borderRadius: 8, padding: '10px 12px', marginBottom: 8 }}>
                  <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 8, color: '#868e96', letterSpacing: 1, marginBottom: 5 }}>{item.lbl}</div>
                  <div style={{ fontSize: 12, color: '#1c2b5a', lineHeight: 1.5 }}>{item.val}</div>
                </div>
              ))}
            </div>

            {/* Tier Summary */}
            <div style={{ background: '#fff', border: '1px solid #dbe4ff', borderRadius: 14, padding: 16, marginBottom: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, paddingBottom: 10, borderBottom: '1px solid #f0f4ff' }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: '#1c2b5a' }}>Project Tier Summary</span>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, borderRadius: 8, padding: '4px 10px', border: `1px solid ${otc.border}`, background: otc.bg }}>
                  <div dangerouslySetInnerHTML={{ __html: tsq(ot, 18) }} />
                  <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, color: otc.tc }}>Overall {otc.lbl} · {otc.v}</span>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8 }}>
                {groups.map(g => (
                  <div key={g.label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#f8f9ff', border: `1px solid ${g.cfg.border}`, borderRadius: 8, padding: '8px 12px' }}>
                    <span style={{ fontSize: 11, color: '#6c7a9c' }}>{g.label}</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                      <div dangerouslySetInnerHTML={{ __html: tsq(g.tier, 17) }} />
                      <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, color: g.cfg.tc }}>{g.cfg.lbl}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Section Nav */}
            <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' as const, marginBottom: 12 }}>
              {[{ id: 'metrics', l: '📊 Metrics' }, { id: 'voices', l: '📣 CT Voices' }, { id: 'mindshare', l: '🧠 Mindshare' }, { id: 'risks', l: '⚠️ Risks' }, { id: 'sources', l: '📎 Sources' }].map(sec => (
                <button key={sec.id} onClick={() => setAsec(sec.id)}
                  style={{ padding: '7px 16px', borderRadius: 8, border: `1px solid ${asec === sec.id ? '#1c2b5a' : '#dbe4ff'}`, background: asec === sec.id ? '#1c2b5a' : '#fff', color: asec === sec.id ? '#fff' : '#6c7a9c', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
                  {sec.l}
                </button>
              ))}
            </div>

            {/* Metrics */}
            {asec === 'metrics' && (
              <div style={{ background: '#fff', border: '1px solid #dbe4ff', borderRadius: 14, padding: 16, marginBottom: 12 }}>
                <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' as const, marginBottom: 10 }}>
                  {CATS.map(cat => {
                    const sc = catScore(cat)
                    return (
                      <button key={cat} onClick={() => setAtab(cat)}
                        style={{ padding: '5px 12px', borderRadius: 7, border: `1px solid ${atab === cat ? '#1c2b5a' : '#dbe4ff'}`, background: atab === cat ? '#1c2b5a' : '#fff', color: atab === cat ? '#fff' : '#6c7a9c', fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
                        {cat} <span style={{ color: atab === cat ? '#fff' : T[getTier(sc)].solid, fontFamily: "'DM Mono', monospace", fontSize: 9 }}>{sc}</span>
                      </button>
                    )
                  })}
                </div>
                <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, color: '#adb5bd', textAlign: 'right' as const, marginBottom: 10 }}>tap any row for analyst commentary</div>
                {METRICS.filter(m => m.cat === atab).map(m => (
                  <MetricRow key={m.id} metric={m} data={result.metrics?.[m.id]} />
                ))}
              </div>
            )}

            {/* CT Voices */}
            {asec === 'voices' && (
              <div style={{ background: '#fff', border: '1px solid #dbe4ff', borderRadius: 14, padding: 16, marginBottom: 12 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#1c2b5a', marginBottom: 4 }}>What CT is saying</div>
                <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, color: '#adb5bd', marginBottom: 14 }}>CMV Influence Score = our proprietary influence rating (0-1000) · Kaito smart followers connecting soon</div>
                {(result.ct_voices || []).length > 0 ? (result.ct_voices || []).map((v: any, i: number) => {
                  const cmv = computeCMVScore(v)
                  const ini = (v.name || v.handle || '?').replace('@', '').slice(0, 2).toUpperCase()
                  const handle = (v.handle || '').replace('@', '')
                  const sc = v.sentiment === 'bullish' ? '#2f9e44' : v.sentiment === 'bearish' ? '#c92a2a' : '#868e96'
                  const scbg = v.sentiment === 'bullish' ? '#ebfbee' : v.sentiment === 'bearish' ? '#fff5f5' : '#f1f3f5'
                  return (
                    <div key={i} style={{ border: '1px solid #f0f4ff', borderRadius: 10, padding: 13, marginBottom: 8 }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          {/* Profile picture from X */}
                          <a href={`https://x.com/${handle}`} target="_blank" rel="noreferrer" style={{ textDecoration: 'none', flexShrink: 0 }}>
                            <img
                              src={`https://unavatar.io/twitter/${handle}`}
                              alt={v.name}
                              style={{ width: 38, height: 38, borderRadius: '50%', objectFit: 'cover', border: '1px solid #dbe4ff' }}
                              onError={(e: any) => {
                                e.target.style.display = 'none'
                                e.target.nextSibling.style.display = 'flex'
                              }}
                            />
                            <div style={{ width: 38, height: 38, borderRadius: '50%', background: '#e8ecff', color: '#3b5bdb', display: 'none', alignItems: 'center', justifyContent: 'center', fontFamily: "'DM Mono', monospace", fontSize: 12, fontWeight: 500 }}>{ini}</div>
                          </a>
                          <div>
                            <a href={`https://x.com/${handle}`} target="_blank" rel="noreferrer" style={{ textDecoration: 'none' }}>
                              <div style={{ fontSize: 12, fontWeight: 700, color: '#1c2b5a' }}>{v.name || v.handle}</div>
                            </a>
                            <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, color: '#adb5bd' }}>{v.handle} · {v.date}</div>
                          </div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                          <span style={{ background: scbg, color: sc, fontFamily: "'DM Mono', monospace", fontSize: 9, padding: '3px 8px', borderRadius: 20 }}>{v.sentiment}</span>
                          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: '#1c2b5a', color: '#fff', borderRadius: 6, padding: '3px 8px', fontFamily: "'DM Mono', monospace", fontSize: 9 }}>CMV {cmv.total}</div>
                        </div>
                      </div>
                      <div style={{ fontSize: 12, color: '#6c7a9c', lineHeight: 1.6, marginBottom: 8, fontStyle: 'italic' }}>"{v.quote}"</div>

                      {/* X Score displayed directly */}
                      {v.x_score > 0 && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                          <div style={{ background: '#1c2b5a', borderRadius: 8, padding: '6px 12px', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="#fff"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.748l7.73-8.835L1.254 2.25H8.08l4.259 5.631L18.244 2.25z" /></svg>
                            <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: '#fff', fontWeight: 500 }}>X Score: {v.x_score}</span>
                          </div>
                          {v.ethos_score > 0 && <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, padding: '4px 10px', borderRadius: 20, background: '#f0f4ff', color: '#6c7a9c' }}>Ethos: {v.ethos_score}</span>}
                          <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, padding: '4px 10px', borderRadius: 20, background: v.is_paid ? '#fff3bf' : '#ebfbee', color: v.is_paid ? '#e67700' : '#2f9e44' }}>{v.is_paid ? 'Sponsored' : 'Organic'}</span>
                        </div>
                      )}

                      {/* CMV breakdown */}
                      <div style={{ background: '#f8f9ff', border: '1px solid #dbe4ff', borderRadius: 8, padding: '10px 12px' }}>
                        <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 8, color: '#868e96', marginBottom: 6, letterSpacing: 1 }}>CMV INFLUENCE SCORE BREAKDOWN</div>
                        {Object.entries(cmv.breakdown).map(([k, val]) => (
                          <div key={k} style={{ display: 'flex', alignItems: 'center', marginBottom: 5 }}>
                            <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, color: '#868e96', minWidth: 120 }}>{k}</span>
                            <div style={{ flex: 1, height: 3, background: '#dbe4ff', borderRadius: 2, margin: '0 8px', overflow: 'hidden' }}>
                              <div style={{ width: `${val}%`, height: '100%', background: '#3b5bdb', borderRadius: 2 }} />
                            </div>
                            <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, color: '#1c2b5a' }}>{val as number}/100</span>
                          </div>
                        ))}
                        <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 8, color: '#adb5bd', marginTop: 6 }}>Kaito smart followers — connecting soon</div>
                      </div>
                    </div>
                  )
                }) : <div style={{ fontSize: 12, color: '#adb5bd', textAlign: 'center' as const, padding: 24 }}>No CT voices found.</div>}
              </div>
            )}

            {/* Mindshare */}
            {asec === 'mindshare' && (
              <div style={{ background: '#fff', border: '1px solid #dbe4ff', borderRadius: 14, padding: 16, marginBottom: 12 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#1c2b5a', marginBottom: 4 }}>Mindshare Trend</div>
                <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, color: '#adb5bd', marginBottom: 14 }}>Estimated CT mindshare % over the past 8 weeks</div>
                <canvas ref={canvasRef} style={{ width: '100%', height: 110 }} />
                {result.mindshare_trend && (
                  <div style={{ display: 'flex', gap: 16, marginTop: 8 }}>
                    <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, color: '#868e96' }}>Current: <strong style={{ color: '#3b5bdb' }}>{result.mindshare_trend.current_pct || 'n/a'}</strong></span>
                    <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, color: '#868e96' }}>Trend: <strong style={{ color: '#3b5bdb' }}>{result.mindshare_trend.trend || 'n/a'}</strong></span>
                  </div>
                )}
              </div>
            )}

            {/* Risks */}
            {asec === 'risks' && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
                <div style={{ background: '#fff', border: '1px solid #dbe4ff', borderRadius: 14, padding: 15 }}>
                  <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, fontWeight: 500, letterSpacing: 1, marginBottom: 10, color: '#c92a2a', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#c92a2a', display: 'inline-block' }} />TOP RISKS
                  </div>
                  {(result.top_risks || []).map((x: string, i: number) => (
                    <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                      <span style={{ color: '#ffc9c9', flexShrink: 0, fontSize: 16 }}>•</span>
                      <span style={{ fontSize: 11, color: '#6c7a9c', lineHeight: 1.5 }}>{x}</span>
                    </div>
                  ))}
                </div>
                <div style={{ background: '#fff', border: '1px solid #dbe4ff', borderRadius: 14, padding: 15 }}>
                  <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, fontWeight: 500, letterSpacing: 1, marginBottom: 10, color: '#2f9e44', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#2f9e44', display: 'inline-block' }} />OPPORTUNITIES
                  </div>
                  {(result.top_opportunities || []).map((x: string, i: number) => (
                    <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                      <span style={{ color: '#8ce99a', flexShrink: 0, fontSize: 16 }}>•</span>
                      <span style={{ fontSize: 11, color: '#6c7a9c', lineHeight: 1.5 }}>{x}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Sources */}
            {asec === 'sources' && (
              <div style={{ background: '#fff', border: '1px solid #dbe4ff', borderRadius: 14, padding: 16, marginBottom: 12 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#1c2b5a', marginBottom: 14 }}>Research Sources</div>
                {(result.sources || []).length > 0 ? (result.sources || []).map((src: any, i: number) => (
                  <div key={i} style={{ display: 'flex', gap: 10, paddingBottom: 10, marginBottom: 10, borderBottom: '1px solid #f0f4ff' }}>
                    <div style={{ width: 22, height: 22, borderRadius: '50%', background: '#e8ecff', color: '#3b5bdb', fontFamily: "'DM Mono', monospace", fontSize: 9, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1 }}>{i + 1}</div>
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 600, color: '#1c2b5a', marginBottom: 2 }}>{src.name || src.title || ''}</div>
                      <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, color: '#adb5bd', marginBottom: 3 }}>{src.used_for || src.type || ''}</div>
                      {src.url && src.url !== 'unknown' && <a href={src.url} target="_blank" rel="noreferrer" style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, color: '#3b5bdb', textDecoration: 'none' }}>{src.url.slice(0, 55)}{src.url.length > 55 ? '...' : ''}</a>}
                    </div>
                  </div>
                )) : <div style={{ fontSize: 12, color: '#adb5bd', textAlign: 'center' as const, padding: 24 }}>No sources found.</div>}
              </div>
            )}

            <div style={{ textAlign: 'center' as const, fontFamily: "'DM Mono', monospace", fontSize: 9, color: '#adb5bd', letterSpacing: 1, paddingTop: 6 }}>CMV ALPHASCANNER · POWERED BY CLAUDE AI · NOT FINANCIAL ADVICE</div>
          </div>
        )}

        {/* Empty */}
        {!loading && !result && !error && (
          <div style={{ border: '1.5px dashed #dbe4ff', borderRadius: 14, padding: '48px 24px', textAlign: 'center' as const, background: '#fff' }}>
            <div style={{ fontSize: 28, marginBottom: 12, opacity: 0.3 }}>🔭</div>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#6c7a9c', marginBottom: 5 }}>No project scanned yet</div>
            <div style={{ fontSize: 12, color: '#adb5bd' }}>Enter a project name and X URL above to begin your alpha research.</div>
          </div>
        )}
      </div>
    </div>
  )
}
