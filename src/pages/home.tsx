import { useState, useEffect, useRef } from 'react'
import { fetchProjectXData } from '../lib/xapi'

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
  'Searching the web...',
  'Verifying project identity...',
  'Fetching X profile data...',
  'Researching VCs & funding...',
  'Scanning CT sentiment...',
  'Computing tier score...',
]

const LOADING_MSGS = [
  { text: 'Currently scanning.... hold tight', emoji: '🔍' },
  { text: 'Deep diving into the data...', emoji: '🏊' },
  { text: 'Checking what CT is saying...', emoji: '👀' },
  { text: 'Almost there, do not move...', emoji: '🫡' },
  { text: 'Final checks loading...', emoji: '⚡' },
]

const T: Record<string, any> = {
  A: { bg: '#ebfbee', border: '#8ce99a', tc: '#2f9e44', solid: '#37b24d', lbl: 'Tier A', v: 'FARM IT', sub: 'High conviction play. Go hard.', target: 'Top 30-50%', vbg: 'linear-gradient(135deg,#37b24d,#2f9e44)', emoji: '🌾' },
  B: { bg: '#fff3bf', border: '#ffe066', tc: '#e67700', solid: '#f59f00', lbl: 'Tier B', v: 'CREATE CONTENT', sub: 'Might cook or not. Keep expectations low.', target: 'Top 20%', vbg: 'linear-gradient(135deg,#f59f00,#e67700)', emoji: '✍️' },
  C: { bg: '#fff4e6', border: '#ffc078', tc: '#d9480f', solid: '#e8590c', lbl: 'Tier C', v: 'WATCH', sub: 'Too early to call. Monitor closely.', target: 'Top 10%', vbg: 'linear-gradient(135deg,#e8590c,#d9480f)', emoji: '👁️' },
  D: { bg: '#f1f3f5', border: '#dee2e6', tc: '#495057', solid: '#868e96', lbl: 'Tier D', v: 'SKIP', sub: 'Not worth your time right now.', target: '', vbg: 'linear-gradient(135deg,#868e96,#495057)', emoji: '🚫' },
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
  'SocialFi': 'Be active early, build followers within the app itself, refer aggressively.',
  'Infrastructure': 'Build something on it publicly. Developer allocations are typically the most generous.',
}

function getTier(s: number) { return s >= 80 ? 'A' : s >= 60 ? 'B' : s >= 35 ? 'C' : 'D' }

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

import type { VercelRequest, VercelResponse } from '@vercel/node'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET')

  const { handle } = req.query
  if (!handle || typeof handle !== 'string') {
    return res.status(400).json({ error: 'Handle required' })
  }

  const clean = handle.replace('@', '').trim()

  try {
    // Fetch user profile + pinned tweet ID
    const userRes = await fetch(
      `https://api.twitter.com/2/users/by/username/${clean}?user.fields=public_metrics,verified,created_at,profile_image_url,description,entities,pinned_tweet_id`,
      { headers: { Authorization: `Bearer ${process.env.X_API_BEARER_TOKEN}` } }
    )
    const userData = await userRes.json()
    const u = userData.data
    if (!u) return res.status(404).json({ error: 'User not found' })

    const bio = u.description || ''
    let pinnedTweetText = ''

    // Fetch pinned tweet if exists
    if (u.pinned_tweet_id) {
      try {
        const tweetRes = await fetch(
          `https://api.twitter.com/2/tweets/${u.pinned_tweet_id}`,
          { headers: { Authorization: `Bearer ${process.env.X_API_BEARER_TOKEN}` } }
        )
        const tweetData = await tweetRes.json()
        pinnedTweetText = tweetData.data?.text || ''
      } catch { }
    }

    // Fetch recent tweets to look for token announcements
    let recentTweetsText = ''
    try {
      const tweetsRes = await fetch(
        `https://api.twitter.com/2/users/${u.id}/tweets?max_results=5&tweet.fields=text`,
        { headers: { Authorization: `Bearer ${process.env.X_API_BEARER_TOKEN}` } }
      )
      const tweetsData = await tweetsRes.json()
      recentTweetsText = (tweetsData.data || []).map((t: any) => t.text).join(' ')
    } catch { }

    // Search all text sources for $TICKER
    const allText = `${bio} ${pinnedTweetText} ${recentTweetsText}`
    const tickerMatches = allText.match(/\$([A-Z]{2,10})\b/g) || []
    const tickers = [...new Set(tickerMatches.map(t => t.replace('$', '')))]

    // Token launch signals across all text
    const allTextLower = allText.toLowerCase()
    const launchSignals = [
      'token live', 'now live', 'trading now', 'listed on', 'available on',
      'buy $', 'trade $', 'token launched', 'token is live', 'tge', 'airdrop live',
      'claim now', 'token claim', 'now trading', 'token available'
    ]
    const tokenLaunchHinted = launchSignals.some(s => allTextLower.includes(s))
    const confirmedTicker = tickers.length > 0 ? tickers[0] : null

    const metrics = u.public_metrics
    const followers = metrics?.followers_count || 0
    const following = metrics?.following_count || 0
    const tweetCount = metrics?.tweet_count || 0
    const listed = metrics?.listed_count || 0

    const createdYear = new Date(u.created_at || '').getFullYear()
    const age = new Date().getFullYear() - createdYear

    const followerScore = Math.min(100, Math.log10(Math.max(followers, 1)) / 5 * 100)
    const listedScore = Math.min(100, Math.log10(Math.max(listed, 1)) / 4 * 100)
    const ageScore = Math.min(100, (age / 5) * 100)
    const activityScore = Math.min(100, (tweetCount / 1000) * 100)
    const ratioScore = Math.min(100, (followers / Math.max(following, 1)) / 100 * 100)
    const verifiedScore = u.verified ? 100 : 0

    const cmvScore = Math.round(
      (followerScore * 0.30) +
      (listedScore * 0.20) +
      (ageScore * 0.15) +
      (activityScore * 0.15) +
      (ratioScore * 0.10) +
      (verifiedScore * 0.10)
    )

    return res.status(200).json({
      followers,
      following,
      tweet_count: tweetCount,
      listed,
      verified: u.verified || false,
      account_age_years: age,
      profile_image_url: u.profile_image_url?.replace('_normal', '_bigger') || null,
      description: bio,
      pinned_tweet: pinnedTweetText,
      confirmed_ticker: confirmedTicker,
      all_tickers_found: tickers,
      token_launch_hinted: tokenLaunchHinted,
      cmv_score: Math.min(1000, Math.round(cmvScore * 10)),
      breakdown: {
        follower_reach: Math.round(followerScore),
        listed_quality: Math.round(listedScore),
        account_age: Math.round(ageScore),
        posting_activity: Math.round(activityScore),
        follower_ratio: Math.round(ratioScore),
        verified: Math.round(verifiedScore),
      }
    })
  } catch {
    return res.status(500).json({ error: 'Failed to fetch X data' })
  }
}

const SYSTEM_PROMPT = `You are CMV AlphaScanner, a sharp crypto/Web3 alpha analyst. Today: ${new Date().toDateString()}.

CRITICAL RULES:
1. Use web_search to find REAL current data. Never guess.
2. Use BOTH project name and X URL to identify the EXACT correct project.
3. Token status is pre-fetched from CoinGecko — use it directly, do NOT search CoinGecko.
4. For founder/team details — ONLY state names if found from official sources (website, whitepaper, LinkedIn, CoinGecko). Include their X handles if found. If unconfirmed write: "Team details unconfirmed."
5. Always return full results. Never block.

SCORE INTEGRITY:
- Most projects score 35-65. Score above 75 requires exceptional evidence.
- Tier A = 80+ (confirmed funding + active founders + low dilution + strong CT ALL at once)
- Tier B = 60-79, Tier C = 35-59, Tier D = 0-34
- FUD < 40 = overall max 65. user_count < 30 = overall max 60. vc_pedigree < 40 = overall max 65.

VERDICT ACTION — be SPECIFIC to this exact project:
- Perp DEX: mention trading volume, delta neutral, not content creation
- Has Season 2: mention it specifically
- Pre-TGE: say stack points before TGE
- Needs Discord roles: say get Discord roles
- Needs liquidity: say provide liquidity early
- Has leaderboard: mention specific leaderboard mechanics
- Never give generic advice

TEAM SECTION — search for real founder names, X handles, LinkedIn, previous projects. Return as array of objects.

Detect project_category: AI Project, Perp DEX, L1/L2, Testnet, Prediction Market, DeFi/Lending, NFT/Gaming, RWA, SocialFi, Infrastructure.

Return ONLY valid JSON:
{"project_name":"","ticker":"","description":"","team_location":"","founded":"","project_category":"Infrastructure","handle_note":null,"verdict":"WATCH","verdict_reason":"","verdict_action":"Specific action for this exact project","overall_score":0,"score_rationale":"","data_accuracy_note":"","post_tge_outlook":"Medium Potential","future_seasons":"","team_members":[{"name":"","role":"","x_handle":"","background":"","confirmed":true}],"project_follows":"","mindshare_trend":{"labels":["8w ago","7w ago","6w ago","5w ago","4w ago","3w ago","2w ago","1w ago"],"values":[0,0,0,0,0,0,0,0],"current_pct":"0%","trend":"stable"},"sources":[{"name":"","url":"","used_for":""}],"metrics":{"funding":{"score":0,"detail":"","why_this_score":"","signal":"neutral"},"vc_pedigree":{"score":0,"detail":"","why_this_score":"","signal":"neutral"},"copycat":{"score":0,"detail":"","why_this_score":"","signal":"neutral"},"niche":{"score":0,"detail":"","why_this_score":"","signal":"neutral"},"location":{"score":0,"detail":"","why_this_score":"","signal":"neutral"},"founder_cred":{"score":0,"detail":"","why_this_score":"","signal":"neutral"},"founder_activity":{"score":0,"detail":"","why_this_score":"","signal":"neutral"},"top_voices":{"score":0,"detail":"","why_this_score":"","signal":"neutral"},"token":{"score":0,"detail":"","why_this_score":"","signal":"neutral"},"metrics_clarity":{"score":0,"detail":"","why_this_score":"","signal":"neutral"},"user_count":{"score":0,"detail":"","why_this_score":"","signal":"neutral"},"fud":{"score":0,"detail":"","why_this_score":"","signal":"neutral"},"notable_mentions":{"score":0,"detail":"","why_this_score":"","signal":"neutral"},"content_type":{"score":0,"detail":"","why_this_score":"","signal":"neutral"},"mindshare":{"score":0,"detail":"","why_this_score":"","signal":"neutral"},"revenue":{"score":0,"detail":"","why_this_score":"","signal":"neutral"},"sentiment":{"score":0,"detail":"","why_this_score":"","signal":"neutral"}},"top_risks":["","",""],"top_opportunities":["",""]}`

function MetricRow({ metric, data }: { metric: any, data: any }) {
  const [open, setOpen] = useState(false)
  const sc = typeof data?.score === 'number' ? data.score : 0
  const tier = getTier(sc)
  const col = T[tier].solid
  const sig = data?.signal ?? 'neutral'
  const sigBg = sig === 'bullish' ? '#ebfbee' : sig === 'bearish' ? '#fff5f5' : '#f1f3f5'
  const sigTc = sig === 'bullish' ? '#2f9e44' : sig === 'bearish' ? '#c92a2a' : '#868e96'
  return (
    <div onClick={() => setOpen(o => !o)} style={{ border: `1px solid ${open ? '#c5d0ff' : '#f0f4ff'}`, borderRadius: 10, padding: '11px 13px', marginBottom: 4, cursor: 'pointer', background: open ? '#f8f9ff' : '#fff' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
        <span style={{ fontSize: 14 }}>{metric.icon}</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 5, gap: 8 }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: '#1c2b5a' }}>{metric.label}</span>
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

function TeamMemberCard({ member }: { member: any }) {
  const [pfpError, setPfpError] = useState(false)
  const handle = (member.x_handle || '').replace('@', '')
  const ini = (member.name || '?').slice(0, 2).toUpperCase()
  return (
    <div style={{ background: '#f8f9ff', border: '1px solid #dbe4ff', borderRadius: 10, padding: '12px 14px', display: 'flex', alignItems: 'flex-start', gap: 12 }}>
      <a href={handle ? `https://x.com/${handle}` : '#'} target="_blank" rel="noreferrer" style={{ textDecoration: 'none', flexShrink: 0 }}>
        {!pfpError && handle ? (
          <img
            src={`https://unavatar.io/twitter/${handle}`}
            alt={member.name}
            style={{ width: 42, height: 42, borderRadius: '50%', objectFit: 'cover', border: '1px solid #dbe4ff' }}
            onError={() => setPfpError(true)}
          />
        ) : (
          <div style={{ width: 42, height: 42, borderRadius: '50%', background: '#e8ecff', color: '#3b5bdb', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'DM Mono',monospace", fontSize: 13, fontWeight: 600, border: '1px solid #dbe4ff' }}>{ini}</div>
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

function VerdictShareCard({ result, cgData, ot, otc, xData }: { result: any, cgData: any, ot: string, otc: any, xData: any }) {
  const cardRef = useRef<HTMLDivElement>(null)
  const [sharing, setSharing] = useState(false)

  async function share() {
    setSharing(true)
    try {
      const text = `🔍 CMV AlphaScanner Results\n\n${result.project_name} — ${otc.v} ${otc.emoji}\nAlpha Score: ${result.overall_score}/100 · ${otc.lbl}\n\n${result.verdict_action || result.verdict_reason}\n\n🎯 Target: ${otc.target || 'N/A'}\n\nScanned at cmv-alphascanner.vercel.app`
      if (navigator.share) {
        await navigator.share({ text, title: `${result.project_name} — CMV AlphaScanner` })
      } else {
        await navigator.clipboard.writeText(text)
        alert('Result copied to clipboard! Paste it on X.')
      }
    } catch { }
    setSharing(false)
  }

  return (
    <div ref={cardRef} style={{ background: otc.vbg, borderRadius: 16, padding: 20, marginBottom: 14, position: 'relative', overflow: 'hidden' }}>
      {/* Decorative background circle */}
      <div style={{ position: 'absolute', top: -40, right: -40, width: 160, height: 160, borderRadius: '50%', background: 'rgba(255,255,255,0.08)', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', bottom: -20, left: -20, width: 100, height: 100, borderRadius: '50%', background: 'rgba(255,255,255,0.05)', pointerEvents: 'none' }} />

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
        {/* Project logo */}
        <div style={{ width: 48, height: 48, borderRadius: 12, background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.3)' }}>
          {xData?.profile_image_url ? (
            <img src={xData.profile_image_url} alt={result.project_name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          ) : (
            <span style={{ fontSize: 22, fontWeight: 800, color: '#fff' }}>{(result.project_name || '?').charAt(0).toUpperCase()}</span>
          )}
        </div>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 18, fontWeight: 800, color: '#fff' }}>{result.project_name}</span>
            {result.ticker && result.ticker !== 'unknown' && <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 9, color: 'rgba(255,255,255,0.8)', background: 'rgba(255,255,255,0.15)', padding: '2px 7px', borderRadius: 4 }}>{result.ticker}</span>}
          </div>
          <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 9, color: 'rgba(255,255,255,0.7)', marginTop: 2 }}>
            {result.project_category || 'Crypto Project'}
            {cgData?.token_live ? ` · ${cgData.ticker} ${cgData.token_price}` : ' · Token Not Launched'}
          </div>
        </div>
        <div style={{ marginLeft: 'auto', textAlign: 'right' as const }}>
          <div style={{ fontSize: 36, fontWeight: 800, color: '#fff', lineHeight: 1, letterSpacing: -1 }}>{result.overall_score}</div>
          <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 8, color: 'rgba(255,255,255,0.7)' }}>ALPHA SCORE</div>
        </div>
      </div>

      {/* Verdict */}
      <div style={{ background: 'rgba(0,0,0,0.15)', borderRadius: 10, padding: '12px 14px', marginBottom: 12, border: '1px solid rgba(255,255,255,0.2)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
          <span style={{ fontSize: 20 }}>{otc.emoji}</span>
          <span style={{ fontSize: 20, fontWeight: 900, color: '#fff', letterSpacing: -0.5 }}>{otc.v}</span>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: 'rgba(255,255,255,0.2)', border: '1px solid rgba(255,255,255,0.3)', borderRadius: 20, padding: '3px 10px', fontFamily: "'DM Mono',monospace", fontSize: 10, color: '#fff', marginLeft: 'auto' }}>
            {ot} · {otc.lbl}
          </div>
        </div>
        <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.95)', lineHeight: 1.6, fontWeight: 500 }}>{result.verdict_action || result.verdict_reason}</div>
      </div>

      {/* Target + share */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
        {otc.target ? (
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.25)', borderRadius: 20, padding: '5px 14px', fontFamily: "'DM Mono',monospace", fontSize: 10, color: '#fff', fontWeight: 500 }}>
            🎯 Target: {otc.target}
          </div>
        ) : <div />}
        <button onClick={share} disabled={sharing}
          style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(255,255,255,0.2)', border: '1px solid rgba(255,255,255,0.3)', borderRadius: 20, padding: '6px 16px', fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 12, fontWeight: 700, color: '#fff', cursor: 'pointer' }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8M16 6l-4-4-4 4M12 2v13" /></svg>
          {sharing ? 'Sharing...' : 'Share to X'}
        </button>
      </div>

      {/* Watermark */}
      <div style={{ marginTop: 12, fontFamily: "'DM Mono',monospace", fontSize: 8, color: 'rgba(255,255,255,0.4)', letterSpacing: 1 }}>CMV ALPHASCANNER · cmv-alphascanner.vercel.app</div>
    </div>
  )
}

export default function Home() {
  const [projName, setProjName] = useState('')
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
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const pint = useRef<any>(null)
  const tint = useRef<any>(null)
  const mint = useRef<any>(null)

  useEffect(() => {
    if (loading) {
      setElapsed(0); setMsgIdx(0); setPfpLoaded(false)
      tint.current = setInterval(() => setElapsed(e => e + 1), 1000)
      let pi = 0
      pint.current = setInterval(() => { pi = (pi + 1) % PHASES.length; setPhase(PHASES[pi]) }, 4000)
      mint.current = setInterval(() => setMsgIdx(i => Math.min(i + 1, LOADING_MSGS.length - 1)), 12000)
    } else {
      clearInterval(tint.current); clearInterval(pint.current); clearInterval(mint.current)
    }
    return () => { clearInterval(tint.current); clearInterval(pint.current); clearInterval(mint.current) }
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
    setLoading(true); setResult(null); setCgData(null); setXData(null); setError(null); setAtab('Fundamentals'); setAsec('metrics')
    const handle = (xUrl.replace('https://x.com/', '').replace('https://twitter.com/', '').replace('@', '').split('/')[0].trim()) || projName.replace(/\s+/g, '').toLowerCase()

    const [cg, xd] = await Promise.all([
      fetchCoinGecko(projName || handle),
      fetchProjectXData(handle)
    ])
    setCgData(cg); setXData(xd)

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

Real X API Data for this project (already fetched):
- Followers: ${xd?.followers || 'unknown'}
- Following: ${xd?.following || 'unknown'}
- Verified: ${xd?.verified || false}
- Account Age: ${xd?.account_age_years || 'unknown'} years
- Total Tweets: ${xd?.tweet_count || 'unknown'}
- Listed Count: ${xd?.listed || 'unknown'}
- Bio: ${xd?.description || 'unknown'}
- CMV X Score: ${xd?.cmv_score || 'unknown'}/1000

CoinGecko Token Data: ${JSON.stringify(cg)}

Do 2 searches:
1. "${projName || handle} crypto founders team members whitepaper season 2 airdrop farming requirements"
2. "${handle} CT sentiment community discord leaderboard 2025 2026"

For team_members: search their website, whitepaper, LinkedIn, CoinGecko. Include X handles. Mark confirmed:true only if you found from official source.
For verdict_action: be SPECIFIC to this project based on what you find.
Return ONLY JSON.`
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

  const msg = LOADING_MSGS[msgIdx]

  return (
    <div style={{ minHeight: '100vh', background: '#f0f4ff', fontFamily: "'Plus Jakarta Sans',sans-serif" }}>
      <style>{`
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes shimmer{0%{background-position:-400px 0}100%{background-position:400px 0}}
        @keyframes pfpPulse{0%,100%{transform:scale(1);box-shadow:0 0 0 0 rgba(59,91,219,0.3)}50%{transform:scale(1.05);box-shadow:0 0 0 8px rgba(59,91,219,0)}}
        @keyframes fadeIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
      `}</style>

      {/* Nav */}
      <div style={{ background: '#fff', borderBottom: '1px solid #dbe4ff', padding: '0 20px', display: 'flex', alignItems: 'center', height: 56, gap: 10 }}>
        <div style={{ width: 32, height: 32, background: '#1c2b5a', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04a1 1 0 000-1.41l-2.34-2.34a1 1 0 00-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z" fill="#fff" /></svg>
        </div>
        <span style={{ fontSize: 16, fontWeight: 800, color: '#1c2b5a', letterSpacing: -0.3 }}>CMV <span style={{ color: '#3b5bdb' }}>AlphaScanner</span></span>
        <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 9, color: '#3b5bdb', background: '#e8ecff', borderRadius: 20, padding: '3px 8px', marginLeft: 'auto' }}>BETA</span>
      </div>

      <div style={{ maxWidth: 860, margin: '0 auto', padding: '28px 16px 60px' }}>

        {!result && !loading && (
          <div style={{ textAlign: 'center', padding: '36px 0 32px' }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: '#e8ecff', borderRadius: 20, padding: '5px 14px', fontFamily: "'DM Mono',monospace", fontSize: 10, color: '#3b5bdb', marginBottom: 18 }}>Alpha Intelligence System</div>
            <h1 style={{ fontSize: 'clamp(26px,4vw,40px)', fontWeight: 800, color: '#1c2b5a', lineHeight: 1.2, marginBottom: 14, letterSpacing: -0.5 }}>Know if this project<br />is <span style={{ color: '#3b5bdb' }}>worth your time.</span></h1>
            <p style={{ fontSize: 14, color: '#6c7a9c', lineHeight: 1.7, maxWidth: 480, margin: '0 auto 12px' }}>Evaluating various metrics grouped into categories and tiers — telling you exactly what level you need to achieve per project.</p>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, flexWrap: 'wrap' as const }}>
              {['17 metrics', '4 tiers', 'Real X data', 'Team profiles', 'Share results'].map(t => (
                <span key={t} style={{ fontFamily: "'DM Mono',monospace", fontSize: 9, color: '#868e96', background: '#fff', border: '1px solid #dbe4ff', borderRadius: 20, padding: '4px 10px' }}>{t}</span>
              ))}
            </div>
          </div>
        )}

        {/* Search */}
        <div style={{ background: '#fff', border: '1px solid #dbe4ff', borderRadius: 16, padding: 20, marginBottom: 18, boxShadow: '0 2px 12px rgba(59,91,219,0.06)' }}>
          <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 9, color: '#868e96', letterSpacing: '1.5px', marginBottom: 6 }}>PROJECT NAME</div>
          <input style={{ width: '100%', background: '#f8f9ff', border: '1px solid #dbe4ff', borderRadius: 10, padding: '11px 14px', fontSize: 14, color: '#1c2b5a', fontFamily: 'inherit', marginBottom: 12, outline: 'none' }}
            placeholder="e.g. EigenLayer, Hyperliquid, Kaito..."
            value={projName} onChange={e => setProjName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !loading && analyze()} disabled={loading} />
          <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 9, color: '#868e96', letterSpacing: '1.5px', marginBottom: 6 }}>X PROFILE URL</div>
          <div style={{ display: 'flex', gap: 10 }}>
            <input style={{ flex: 1, background: '#f8f9ff', border: '1px solid #dbe4ff', borderRadius: 10, padding: '11px 14px', fontSize: 12, color: '#1c2b5a', fontFamily: "'DM Mono',monospace", outline: 'none' }}
              placeholder="https://x.com/projecthandle"
              value={xUrl} onChange={e => setXUrl(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && !loading && analyze()} disabled={loading} />
            <button onClick={analyze} disabled={loading || (!projName.trim() && !xUrl.trim())}
              style={{ background: '#1c2b5a', color: '#fff', border: 'none', borderRadius: 10, padding: '11px 26px', fontSize: 13, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' as const, fontFamily: 'inherit', opacity: loading || (!projName.trim() && !xUrl.trim()) ? 0.4 : 1 }}>
              {loading ? 'Scanning...' : 'Analyze'}
            </button>
          </div>
          <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 9, color: '#adb5bd', marginTop: 10 }}>Providing both the project name and X URL gives more accurate results</div>
        </div>

        {/* Loading */}
        {loading && (
          <div style={{ background: '#fff', border: '1px solid #dbe4ff', borderRadius: 14, padding: 24, marginBottom: 16 }}>
            {/* PFP animation block */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20, background: 'linear-gradient(135deg,#f0f4ff,#e8ecff)', borderRadius: 14, padding: '16px 18px', border: '1px solid #c5d0ff', animation: 'fadeIn 0.4s ease' }}>
              <div style={{ position: 'relative', flexShrink: 0 }}>
                <div style={{ width: 56, height: 56, borderRadius: '50%', overflow: 'hidden', border: '2.5px solid #3b5bdb', animation: 'pfpPulse 2s ease-in-out infinite', background: '#e8ecff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <img
                    src="/pfp.jpeg"
                    alt=""
                    style={{ width: '100%', height: '100%', objectFit: 'cover', display: pfpLoaded ? 'block' : 'none' }}
                    onLoad={() => setPfpLoaded(true)}
                    onError={() => setPfpLoaded(false)}
                  />
                  {!pfpLoaded && <span style={{ fontSize: 24 }}>🔍</span>}
                </div>
                {/* Pulse ring */}
                <div style={{ position: 'absolute', inset: -4, borderRadius: '50%', border: '2px solid rgba(59,91,219,0.3)', animation: 'pfpPulse 2s ease-in-out infinite 0.5s' }} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 16, fontWeight: 700, color: '#1c2b5a', marginBottom: 4 }}>
                  {msg.text} <span style={{ fontSize: 18 }}>{msg.emoji}</span>
                </div>
                <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 10, color: '#6c7a9c' }}>analyzing {projName || xUrl}</div>
              </div>
              <div style={{ textAlign: 'right' as const, flexShrink: 0 }}>
                <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 28, fontWeight: 700, color: '#3b5bdb', lineHeight: 1 }}>{elapsed}s</div>
                <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 8, color: '#adb5bd' }}>elapsed</div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 13, marginBottom: 16 }}>
              <div style={{ width: 26, height: 26, border: '2.5px solid #dbe4ff', borderTopColor: '#3b5bdb', borderRadius: '50%', animation: 'spin 0.7s linear infinite', flexShrink: 0 }} />
              <div style={{ fontSize: 13, fontWeight: 600, color: '#1c2b5a' }}>{phase}</div>
            </div>
            {[100, 83, 91, 74].map((w, i) => (
              <div key={i} style={{ height: 40, background: 'linear-gradient(90deg,#f0f4ff 25%,#e8ecff 50%,#f0f4ff 75%)', backgroundSize: '400px 100%', animation: 'shimmer 1.3s infinite', borderRadius: 8, marginBottom: 7, width: `${w}%` }} />
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
          <div style={{ animation: 'fadeIn 0.5s ease' }}>
            {result.handle_note && <div style={{ background: '#e8ecff', border: '1px solid #c5d0ff', borderRadius: 9, padding: '10px 14px', marginBottom: 12, fontSize: 12, color: '#3b5bdb' }}>💡 {result.handle_note}</div>}

            {/* Score card + Verdict share card */}
            <div style={{ display: 'grid', gridTemplateColumns: '160px 1fr', gap: 12, marginBottom: 14 }}>
              <div style={{ background: '#fff', border: '1px solid #dbe4ff', borderRadius: 14, padding: 18, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
                <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 9, color: '#868e96', letterSpacing: '1.5px' }}>ALPHA SCORE</div>
                <div style={{ fontSize: 52, fontWeight: 800, color: otc.solid, lineHeight: 1, letterSpacing: -2 }}>{result.overall_score ?? 0}</div>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, borderRadius: 20, padding: '5px 12px', border: `1px solid ${otc.border}`, background: otc.bg }}>
                  <div dangerouslySetInnerHTML={{ __html: tsq(ot, 20) }} />
                  <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 10, color: otc.tc }}>Overall {otc.lbl}</span>
                </div>
                {xData && (
                  <div style={{ width: '100%', background: '#f8f9ff', border: '1px solid #dbe4ff', borderRadius: 8, padding: '8px 10px', textAlign: 'center' as const }}>
                    <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 8, color: '#868e96', marginBottom: 3 }}>CMV X SCORE</div>
                    <div style={{ fontSize: 18, fontWeight: 800, color: '#1c2b5a' }}>{xData.cmv_score || '—'}<span style={{ fontSize: 10, color: '#868e96', fontWeight: 400 }}>/1000</span></div>
                    <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 8, color: '#868e96' }}>{xData.followers?.toLocaleString()} followers</div>
                  </div>
                )}
              </div>
              <VerdictShareCard result={result} cgData={cgData} ot={ot} otc={otc} xData={xData} />
            </div>

            {/* Rationale */}
            {result.score_rationale && (
              <div style={{ background: '#f8f9ff', border: '1px solid #dbe4ff', borderLeft: '3px solid #3b5bdb', padding: '12px 14px', marginBottom: 14 }}>
                <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 9, color: '#3b5bdb', letterSpacing: 1, marginBottom: 5 }}>WHY THIS SCORE</div>
                <div style={{ fontSize: 12, color: '#6c7a9c', lineHeight: 1.7 }}>{result.score_rationale}</div>
              </div>
            )}

            {/* How to play */}
            <div style={{ background: '#f0f4ff', border: '1px solid #c5d0ff', borderLeft: '3px solid #3b5bdb', borderRadius: 10, padding: '14px 16px', marginBottom: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: '#1c2b5a' }}>How to play this</span>
                <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 9, color: '#3b5bdb', background: '#e8ecff', border: '1px solid #c5d0ff', padding: '3px 9px', borderRadius: 20 }}>{result.project_category || 'Infrastructure'}</span>
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
                  <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 8, color: '#868e96', letterSpacing: 1, marginBottom: 5 }}>TOKEN STATUS</div>
                  {cgData?.token_live
                    ? <span style={{ background: '#ebfbee', color: '#2f9e44', border: '1px solid #8ce99a', borderRadius: 20, padding: '3px 10px', fontFamily: "'DM Mono',monospace", fontSize: 10, display: 'inline-flex', alignItems: 'center', gap: 5 }}><span style={{ width: 6, height: 6, borderRadius: '50%', background: '#2f9e44', display: 'inline-block' }} />{cgData.ticker} {cgData.token_price}</span>
                    : <span style={{ background: '#f1f3f5', color: '#868e96', border: '1px solid #dee2e6', borderRadius: 20, padding: '3px 10px', fontFamily: "'DM Mono',monospace", fontSize: 10, display: 'inline-flex', alignItems: 'center', gap: 5 }}><span style={{ width: 6, height: 6, borderRadius: '50%', background: '#868e96', display: 'inline-block' }} />Not Launched</span>}
                  {cgData?.token_note && <div style={{ fontSize: 11, color: '#6c7a9c', marginTop: 4 }}>{cgData.token_note}</div>}
                </div>
                <div style={{ background: '#f8f9ff', border: '1px solid #dbe4ff', borderRadius: 8, padding: '10px 12px' }}>
                  <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 8, color: '#868e96', letterSpacing: 1, marginBottom: 5 }}>TOKEN OUTLOOK</div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: result.post_tge_outlook === 'High Potential' ? '#2f9e44' : result.post_tge_outlook === 'Low Potential' ? '#868e96' : '#e67700' }}>{result.post_tge_outlook || 'Unknown'}</div>
                </div>
              </div>
              {result.future_seasons && (
                <div style={{ background: '#f8f9ff', border: '1px solid #dbe4ff', borderRadius: 8, padding: '10px 12px', marginBottom: 8 }}>
                  <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 8, color: '#868e96', letterSpacing: 1, marginBottom: 5 }}>FUTURE SEASONS / POST-TGE</div>
                  <div style={{ fontSize: 12, color: '#1c2b5a', lineHeight: 1.5 }}>{result.future_seasons}</div>
                </div>
              )}
              {result.project_follows && (
                <div style={{ background: '#f8f9ff', border: '1px solid #dbe4ff', borderRadius: 8, padding: '10px 12px' }}>
                  <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 8, color: '#868e96', letterSpacing: 1, marginBottom: 5 }}>NOTABLE X FOLLOWS (NETWORK SIGNAL)</div>
                  <div style={{ fontSize: 12, color: '#1c2b5a', lineHeight: 1.5 }}>{result.project_follows}</div>
                </div>
              )}
            </div>

            {/* Team Members */}
            {result.team_members?.length > 0 && (
              <div style={{ background: '#fff', border: '1px solid #dbe4ff', borderRadius: 14, padding: 16, marginBottom: 14 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#1c2b5a', marginBottom: 12 }}>👥 Team & Founders</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(240px,1fr))', gap: 10 }}>
                  {result.team_members.map((m: any, i: number) => <TeamMemberCard key={i} member={m} />)}
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

            {/* Section Nav — no CT Voices */}
            <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' as const, marginBottom: 12 }}>
              {[{ id: 'metrics', l: '📊 Metrics' }, { id: 'mindshare', l: '🧠 Mindshare' }, { id: 'risks', l: '⚠️ Risks' }, { id: 'sources', l: '📎 Sources' }].map(sec => (
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
                        {cat} <span style={{ color: atab === cat ? '#fff' : T[getTier(sc)].solid, fontFamily: "'DM Mono',monospace", fontSize: 9 }}>{sc}</span>
                      </button>
                    )
                  })}
                </div>
                <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 9, color: '#adb5bd', textAlign: 'right' as const, marginBottom: 10 }}>tap any row for analyst commentary</div>
                {METRICS.filter(m => m.cat === atab).map(m => <MetricRow key={m.id} metric={m} data={result.metrics?.[m.id]} />)}
              </div>
            )}

            {/* Mindshare */}
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

            {/* Risks */}
            {asec === 'risks' && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
                <div style={{ background: '#fff', border: '1px solid #dbe4ff', borderRadius: 14, padding: 15 }}>
                  <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 9, fontWeight: 500, letterSpacing: 1, marginBottom: 10, color: '#c92a2a', display: 'flex', alignItems: 'center', gap: 6 }}>
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
                  <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 9, fontWeight: 500, letterSpacing: 1, marginBottom: 10, color: '#2f9e44', display: 'flex', alignItems: 'center', gap: 6 }}>
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
                    <div style={{ width: 22, height: 22, borderRadius: '50%', background: '#e8ecff', color: '#3b5bdb', fontFamily: "'DM Mono',monospace", fontSize: 9, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1 }}>{i + 1}</div>
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 600, color: '#1c2b5a', marginBottom: 2 }}>{src.name || src.title || ''}</div>
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
