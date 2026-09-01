import { useState, useEffect } from 'react'

/* Radar — the discovery half. Answers "what just started moving?", which the scanner
   structurally cannot: every scan there begins with a handle you already know.

   Design follows the existing language: inline <style> block, the --green/--text-* custom
   properties, Outfit + JetBrains Mono. */

interface Target {
  id: string
  kind: string
  chain: string | null
  contract_address: string | null
  name: string | null
  symbol: string | null
  liquidity_usd: number | null
  market_cap_usd: number | null
  volume_24h_usd: number | null
  first_seen_at: string
  last_event_at: string | null
  heat: number
  heat_band: 'cold' | 'warm' | 'hot' | 'critical' | null
  why: string
  signal_count: number
  source_count: number
  alpha_score: number | null
  risk_level: string | null   // null => NOT ASSESSED, which is not the same as low risk
  spark: number[]
}

const BAND: Record<string, { label: string; color: string; bg: string; border: string }> = {
  critical: { label: 'CRITICAL', color: '#b91c1c', bg: '#fef2f2', border: '#fecaca' },
  hot: { label: 'HOT', color: '#c2410c', bg: '#fff7ed', border: '#fed7aa' },
  warm: { label: 'WARM', color: '#a16207', bg: '#fefce8', border: '#fde68a' },
  cold: { label: 'COLD', color: '#57534e', bg: '#f5f5f4', border: '#e7e5e4' },
}

const CHAINS = [
  { id: 'all', label: 'All chains' },
  { id: 'solana', label: 'Solana' },
  { id: 'base', label: 'Base' },
  { id: 'eth', label: 'Ethereum' },
]

const AGES = [
  { id: 24, label: '24h' },
  { id: 72, label: '3d' },
  { id: 168, label: '7d' },
]

function usd(n: number | null): string {
  if (n === null || !Number.isFinite(n)) return '—'
  if (n >= 1e9) return `$${(n / 1e9).toFixed(1)}B`
  if (n >= 1e6) return `$${(n / 1e6).toFixed(1)}M`
  if (n >= 1e3) return `$${(n / 1e3).toFixed(0)}K`
  return `$${n.toFixed(0)}`
}

function ago(iso: string | null): string {
  if (!iso) return '—'
  const mins = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000))
  if (mins < 60) return `${mins}m`
  const hours = Math.round(mins / 60)
  if (hours < 24) return `${hours}h`
  return `${Math.round(hours / 24)}d`
}

/** Heat over time. Renders nothing rather than faking a shape when there is no history. */
function Spark({ values }: { values: number[] }) {
  if (values.length < 2) return <div className="spark-empty">not enough history</div>
  const max = Math.max(...values, 1)
  const w = 84
  const h = 22
  const pts = values.map((v, i) => `${(i / (values.length - 1)) * w},${h - (v / max) * h}`).join(' ')
  const rising = values[values.length - 1] >= values[0]
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="spark" aria-hidden="true">
      <polyline points={pts} fill="none" stroke={rising ? 'var(--green)' : 'var(--text-4)'} strokeWidth="1.5" />
    </svg>
  )
}

export default function Radar() {
  const [targets, setTargets] = useState<Target[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [chain, setChain] = useState('all')
  const [maxAge, setMaxAge] = useState(168)
  const [generatedAt, setGeneratedAt] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    fetch(`/api/radar?chain=${chain}&maxAgeHours=${maxAge}&limit=50`)
      .then(async (r) => {
        const body = await r.json()
        if (cancelled) return
        if (!r.ok) {
          // Say the data is unavailable — never render an empty list as "nothing is moving".
          setError(body?.error === 'database_unavailable' ? 'unavailable' : 'failed')
          setTargets([])
        } else {
          setTargets(body.targets || [])
          setGeneratedAt(body.generated_at || null)
        }
      })
      .catch(() => { if (!cancelled) setError('failed') })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [chain, maxAge])

  return (
    <div className="radar-root">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800;900&family=JetBrains+Mono:wght@400;500;600;700&display=swap');
        :root {
          --bg:#f8faf8; --bg-2:#ffffff; --bg-3:#f1f5f1; --border:#e2e8e4; --border-2:#d1d9d3;
          --text-1:#0f1a12; --text-2:#2d3b30; --text-3:#5a6b5e; --text-4:#8a9b8e;
          --green:#16a34a; --green-light:#dcfce7; --red:#dc2626; --amber:#d97706;
          --font:'Outfit',sans-serif; --mono:'JetBrains Mono',monospace; --radius:12px;
          --shadow:0 1px 2px rgba(15,26,18,.04), 0 8px 24px -18px rgba(15,26,18,.3);
        }
        * { box-sizing:border-box; margin:0; padding:0; }
        .radar-root { min-height:100vh; background:var(--bg); font-family:var(--font); color:var(--text-1); -webkit-font-smoothing:antialiased; }

        .nav { background:rgba(248,250,248,.85); backdrop-filter:blur(20px) saturate(180%); border-bottom:1px solid var(--border); padding:0 24px; display:flex; align-items:center; height:56px; position:sticky; top:0; z-index:100; }
        .nav-brand { display:flex; align-items:center; gap:10px; text-decoration:none; }
        .nav-logo { width:28px; height:28px; background:var(--green); border-radius:7px; display:flex; align-items:center; justify-content:center; }
        .nav-title { font-size:15px; font-weight:700; color:var(--text-1); letter-spacing:-.3px; }
        .nav-title span { color:var(--green); }
        .nav-links { margin-left:auto; display:flex; gap:2px; }
        .nav-link { font-family:var(--mono); font-size:11px; color:var(--text-3); text-decoration:none; padding:6px 12px; border-radius:6px; }
        .nav-link:hover { color:var(--text-1); background:var(--bg-3); }
        .nav-link.active { color:var(--green); background:var(--green-light); }

        .wrap { max-width:1000px; margin:0 auto; padding:0 20px 80px; }
        .head { padding:40px 0 20px; }
        .head-badge { display:inline-flex; align-items:center; gap:6px; background:var(--green-light); border:1px solid rgba(22,163,74,.2); border-radius:20px; padding:5px 14px; margin-bottom:18px; }
        .head-dot { width:5px; height:5px; border-radius:50%; background:var(--green); animation:pulse 2s infinite; }
        @keyframes pulse { 0%,100%{opacity:.4} 50%{opacity:1} }
        .head-badge-text { font-family:var(--mono); font-size:10px; color:#14532d; letter-spacing:1.5px; font-weight:600; }
        .head h1 { font-size:clamp(30px,5vw,46px); font-weight:900; letter-spacing:-2px; line-height:1.05; margin-bottom:10px; }
        .head h1 span { color:var(--green); }
        .head p { font-size:15px; color:var(--text-3); line-height:1.6; max-width:52ch; }

        .filters { display:flex; gap:16px; flex-wrap:wrap; align-items:center; padding:18px 0 22px; border-bottom:1px solid var(--border); margin-bottom:8px; }
        .filter-group { display:flex; gap:4px; }
        .chip { font-family:var(--mono); font-size:11px; padding:5px 12px; border-radius:20px; border:1px solid var(--border); background:var(--bg-2); color:var(--text-3); cursor:pointer; transition:all .15s; }
        .chip:hover { border-color:var(--border-2); }
        .chip.on { background:var(--green-light); border-color:var(--green); color:#14532d; font-weight:600; }
        .meta { margin-left:auto; font-family:var(--mono); font-size:10px; color:var(--text-4); }

        .row { text-decoration:none; color:inherit; display:grid; grid-template-columns:56px 1fr auto; gap:14px; align-items:center; background:var(--bg-2); border:1px solid var(--border); border-radius:var(--radius); padding:14px 16px; margin-bottom:8px; transition:all .15s; }
        .row:hover { border-color:var(--green); box-shadow:var(--shadow); }

        .heat { text-align:center; }
        .heat-n { font-family:var(--mono); font-size:22px; font-weight:700; line-height:1; }
        .heat-band { font-family:var(--mono); font-size:7px; letter-spacing:.8px; padding:2px 5px; border-radius:3px; margin-top:4px; display:inline-block; font-weight:700; }

        .main { min-width:0; }
        .title-line { display:flex; align-items:center; gap:8px; flex-wrap:wrap; margin-bottom:3px; }
        .tname { font-size:14px; font-weight:700; color:var(--text-1); overflow:hidden; text-overflow:ellipsis; white-space:nowrap; max-width:34ch; }
        .tag { font-family:var(--mono); font-size:9px; padding:2px 6px; border-radius:4px; background:var(--bg-3); color:var(--text-3); border:1px solid var(--border); }
        .tag.new { background:var(--green-light); color:var(--green); border-color:rgba(22,163,74,.25); }
        .why { font-size:12px; color:var(--text-3); line-height:1.5; margin-bottom:5px; }
        .stats { display:flex; gap:12px; flex-wrap:wrap; font-family:var(--mono); font-size:10px; color:var(--text-4); }
        .stats b { color:var(--text-2); font-weight:600; }

        .side { text-align:right; flex-shrink:0; display:flex; flex-direction:column; align-items:flex-end; gap:6px; }
        .spark { display:block; }
        .spark-empty { font-family:var(--mono); font-size:8px; color:var(--text-4); }
        .alpha { font-family:var(--mono); font-size:10px; padding:3px 8px; border-radius:20px; border:1px solid var(--border); color:var(--text-3); white-space:nowrap; }
        .alpha.scored { background:var(--green-light); border-color:rgba(22,163,74,.25); color:#14532d; font-weight:600; }
        .risk-critical { background:#fef2f2; border-color:#fecaca; color:#b91c1c; font-weight:600; }
        .risk-high { background:#fff7ed; border-color:#fed7aa; color:#c2410c; font-weight:600; }
        .risk-medium { background:#fefce8; border-color:#fde68a; color:#a16207; }
        .risk-low { background:#f7fee7; border-color:#d9f99d; color:#3f6212; }
        .risk-none { background:#fffbeb; border-color:#fde68a; color:#92400e; }

        .state { text-align:center; padding:60px 20px; }
        .state-icon { font-size:32px; margin-bottom:12px; }
        .state-title { font-size:15px; font-weight:700; margin-bottom:6px; }
        .state-desc { font-size:13px; color:var(--text-3); line-height:1.6; max-width:44ch; margin:0 auto; }
        .skel { height:74px; border-radius:var(--radius); background:linear-gradient(90deg,var(--bg-3) 25%,var(--bg-2) 50%,var(--bg-3) 75%); background-size:600px 100%; animation:shimmer 1.4s infinite; margin-bottom:8px; }
        @keyframes shimmer { 0%{background-position:-300px 0} 100%{background-position:300px 0} }

        @media (max-width:640px) {
          .row { grid-template-columns:48px 1fr; }
          .side { grid-column:1 / -1; flex-direction:row; align-items:center; justify-content:space-between; }
        }
      `}</style>

      <nav className="nav">
        <a href="/" className="nav-brand">
          <div className="nav-logo">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04a1 1 0 000-1.41l-2.34-2.34a1 1 0 00-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z" fill="#fff"/></svg>
          </div>
          <span className="nav-title">CMV <span>Alpha</span></span>
        </a>
        <div className="nav-links">
          <a href="/" className="nav-link active">Radar</a>
          <a href="/grid" className="nav-link">Grid</a>
          <a href="/scan" className="nav-link">Scan</a>
          <a href="/tierlist" className="nav-link">Tiers</a>
          <a href="/feed" className="nav-link">Feed</a>
        </div>
      </nav>

      <div className="wrap">
        <div className="head">
          <div className="head-badge">
            <div className="head-dot" />
            <span className="head-badge-text">LIVE DISCOVERY</span>
          </div>
          <h1>What just started<br /><span>moving.</span></h1>
          <p>
            Ranked by how unusually fast meaningful attention is accumulating — not by price, and
            not by size. Every score opens up into the evidence behind it.
          </p>
        </div>

        <div className="filters">
          <div className="filter-group">
            {CHAINS.map((c) => (
              <button key={c.id} className={`chip ${chain === c.id ? 'on' : ''}`} onClick={() => setChain(c.id)}>{c.label}</button>
            ))}
          </div>
          <div className="filter-group">
            {AGES.map((a) => (
              <button key={a.id} className={`chip ${maxAge === a.id ? 'on' : ''}`} onClick={() => setMaxAge(a.id)}>{a.label}</button>
            ))}
          </div>
          {(() => {
            // Age of the most recent signal across the returned targets — the real freshness of
            // the data, not the response time. If the newest evidence is hours old the engine has
            // likely stopped, so say so rather than implying live.
            const newest = targets
              .map((t) => (t.last_event_at ? new Date(t.last_event_at).getTime() : 0))
              .reduce((a, b) => Math.max(a, b), 0)
            if (!newest) return generatedAt ? <div className="meta">updated {ago(generatedAt)} ago</div> : null
            const stale = Date.now() - newest > 3 * 3600_000
            return <div className="meta" style={stale ? { color: 'var(--amber)' } : undefined}>newest signal {ago(new Date(newest).toISOString())} ago{stale ? ' · engine may be idle' : ''}</div>
          })()}
        </div>

        {loading && [0, 1, 2, 3, 4].map((i) => <div key={i} className="skel" />)}

        {!loading && error === 'unavailable' && (
          <div className="state">
            <div className="state-icon">🔌</div>
            <div className="state-title">Discovery engine not connected</div>
            <div className="state-desc">
              The radar has no database to read from, so there is nothing to show. This is a
              configuration state, not an empty market — no results are being hidden.
            </div>
          </div>
        )}

        {!loading && error === 'failed' && (
          <div className="state">
            <div className="state-icon">⚠️</div>
            <div className="state-title">Could not load the radar</div>
            <div className="state-desc">The request failed. Refresh to try again.</div>
          </div>
        )}

        {!loading && !error && targets.length === 0 && (
          <div className="state">
            <div className="state-icon">🔭</div>
            <div className="state-title">Nothing above the threshold yet</div>
            <div className="state-desc">
              The engine is running but nothing in this window has crossed the qualification floor.
              Try a wider time range, or all chains.
            </div>
          </div>
        )}

        {!loading && !error && targets.map((t) => {
          const band = BAND[t.heat_band || 'cold']
          const isNew = Date.now() - new Date(t.first_seen_at).getTime() < 6 * 3600_000
          return (
            <a key={t.id} href={`/target/${t.id}`} className="row">
              <div className="heat">
                <div className="heat-n" style={{ color: band.color }}>{t.heat}</div>
                <span className="heat-band" style={{ background: band.bg, color: band.color, border: `1px solid ${band.border}` }}>{band.label}</span>
              </div>

              <div className="main">
                <div className="title-line">
                  <span className="tname">{t.name || t.symbol || t.contract_address?.slice(0, 12) || 'Unknown'}</span>
                  {t.chain && <span className="tag">{t.chain}</span>}
                  {isNew && <span className="tag new">NEW</span>}
                </div>
                <div className="why">{t.why}</div>
                <div className="stats">
                  <span><b>{t.source_count}</b> sources</span>
                  <span><b>{t.signal_count}</b> signals</span>
                  <span>liq <b>{usd(t.liquidity_usd)}</b></span>
                  <span>vol <b>{usd(t.volume_24h_usd)}</b></span>
                  <span>seen <b>{ago(t.first_seen_at)}</b> ago</span>
                </div>
              </div>

              <div className="side">
                <Spark values={t.spark} />
                {/* null means NOT YET JUDGED — deliberately distinct from a low score. */}
                <span className={`alpha ${t.alpha_score !== null ? 'scored' : ''}`}>
                  {t.alpha_score !== null ? `alpha ${t.alpha_score}` : 'not yet scanned'}
                </span>
                {/* null risk means NOT ASSESSED — rendered distinctly from a low-risk result. */}
                <span className={`alpha risk-${t.risk_level || 'none'}`}>
                  {t.risk_level ? `risk ${t.risk_level}` : 'risk unknown'}
                </span>
              </div>
            </a>
          )
        })}
      </div>
    </div>
  )
}
