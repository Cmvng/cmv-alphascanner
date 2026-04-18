import { useState, useEffect } from 'react'

const TIER_CONFIG: Record<string, any> = {
  'FARM IT':        { tier: 'A', color: '#16a34a', bg: '#dcfce7', border: '#86efac', tc: '#15803d', emoji: '🌾', label: 'Tier A' },
  'CREATE CONTENT': { tier: 'B', color: '#ca8a04', bg: '#fef9c3', border: '#fde047', tc: '#a16207', emoji: '✍️', label: 'Tier B' },
  'WATCH':          { tier: 'C', color: '#ea580c', bg: '#fff7ed', border: '#fdba74', tc: '#c2410c', emoji: '👁️', label: 'Tier C' },
  'SKIP':           { tier: 'D', color: '#6b7280', bg: '#f3f4f6', border: '#d1d5db', tc: '#4b5563', emoji: '🚫', label: 'Tier D' },
}

const TIER_ORDER = ['FARM IT', 'CREATE CONTENT', 'WATCH', 'SKIP']

function timeAgo(ts: string) {
  const diff = Date.now() - new Date(ts).getTime()
  const mins = Math.floor(diff / 60000)
  const hrs = Math.floor(mins / 60)
  const days = Math.floor(hrs / 24)
  if (days > 0) return `${days}d ago`
  if (hrs > 0) return `${hrs}h ago`
  if (mins > 0) return `${mins}m ago`
  return 'just now'
}

async function fetchLivePrice(ticker: string) {
  try {
    const r = await fetch(`https://api.coingecko.com/api/v3/search?query=${encodeURIComponent(ticker)}`)
    const d = await r.json()
    const match = (d.coins || []).find((c: any) => c.symbol?.toUpperCase() === ticker.toUpperCase())
    if (!match) return null
    const pr = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${match.id}&vs_currencies=usd`)
    const pd = await pr.json()
    const price = pd[match.id]?.usd
    if (!price) return null
    return price < 0.01 ? `$${price.toFixed(6)}` : price < 1 ? `$${price.toFixed(4)}` : `$${price.toFixed(2)}`
  } catch { return null }
}

function GridCard({ scan, livePrice }: { scan: any, livePrice?: string }) {
  const t = TIER_CONFIG[scan.verdict] || TIER_CONFIG['WATCH']
  const displayPrice = livePrice || scan.token_price
  return (
    <div onClick={() => { window.location.href = `/?q=${scan.handle}` }} className="grid-card"
      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = t.border }}
      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--border)' }}>
      <div className="grid-card-accent" style={{ background: t.color }} />
      <div className="grid-card-header">
        <div className="grid-card-logo" style={{ background: t.bg, border: `1px solid ${t.border}` }}>
          {scan.profile_image_url
            ? <img src={scan.profile_image_url} alt="" onError={e => { (e.target as HTMLImageElement).style.display='none' }} />
            : <span style={{ fontSize: 16, fontWeight: 700, color: t.tc }}>{(scan.project_name||scan.handle||'?').charAt(0).toUpperCase()}</span>}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="grid-card-name">{scan.project_name || scan.handle}</div>
          <div className="grid-card-meta">{scan.category || 'Crypto'} · @{scan.handle}</div>
        </div>
        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          <div className="grid-card-score" style={{ color: t.color }}>{scan.score}</div>
          <div className="grid-card-score-label">SCORE</div>
        </div>
      </div>
      <div className="grid-card-verdict" style={{ background: t.bg, border: `1px solid ${t.border}` }}>
        <span style={{ fontFamily: 'var(--mono)', fontSize: 10, fontWeight: 600, color: t.tc }}>{scan.verdict}</span>
      </div>
      {scan.ticker && (
        <div className="grid-card-ticker">
          <div className="ticker-dot" style={{ background: livePrice ? '#16a34a' : '#9ca3af' }} />
          <span className="ticker-symbol">{scan.ticker}</span>
          <span className="ticker-price" style={{ color: livePrice ? '#16a34a' : '#6b7280' }}>{displayPrice || 'fetching...'}</span>
          {livePrice && <span className="ticker-live">LIVE</span>}
        </div>
      )}
      {(scan.good_highlights || []).filter((h: string) => h).slice(0, 2).map((h: string, i: number) => (
        <div key={i} className="grid-card-hl">✓ {h}</div>
      ))}
      <div className="grid-card-footer">
        {scan.red_flag_count > 0
          ? <span className="grid-card-flags">{scan.red_flag_count} flag{scan.red_flag_count > 1 ? 's' : ''}</span>
          : <span className="grid-card-clean">✓ clean</span>}
        <span className="grid-card-time">{timeAgo(scan.scanned_at)}</span>
      </div>
    </div>
  )
}

function TierCard({ scan, livePrice }: { scan: any, livePrice?: string }) {
  const t = TIER_CONFIG[scan.verdict] || TIER_CONFIG['WATCH']
  const displayPrice = livePrice || scan.token_price
  return (
    <div onClick={() => { window.location.href = `/?q=${scan.handle}` }} className="tier-card"
      style={{ border: `1px solid ${t.border}` }}
      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = t.bg }}
      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'var(--bg-2)' }}>
      <div className="tier-card-logo" style={{ border: `2px solid ${t.border}`, background: t.bg }}>
        {scan.profile_image_url
          ? <img src={scan.profile_image_url} alt="" onError={e => { (e.target as HTMLImageElement).style.display='none' }} />
          : <span style={{ fontSize: 16, fontWeight: 700, color: t.tc }}>{(scan.project_name||scan.handle||'?').charAt(0).toUpperCase()}</span>}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div className="tier-card-name">{scan.project_name || scan.handle}</div>
        <div className="tier-card-meta">
          {scan.category || 'Crypto'}
          {scan.ticker && <span style={{ color: t.color, marginLeft: 6 }}>{scan.ticker} {displayPrice || ''}</span>}
        </div>
      </div>
      <div style={{ textAlign: 'right', flexShrink: 0 }}>
        <div style={{ fontSize: 18, fontWeight: 800, color: t.color }}>{scan.score}</div>
        {scan.red_flag_count > 0 && <div style={{ fontFamily: 'var(--mono)', fontSize: 8, color: '#dc2626' }}>{scan.red_flag_count} flags</div>}
      </div>
    </div>
  )
}

export default function Feed() {
  const [scans, setScans] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [prices, setPrices] = useState<Record<string, string>>({})
  const [filter, setFilter] = useState('All')
  const [viewMode, setViewMode] = useState<'grid' | 'tier'>('grid')
  const [sortBy, setSortBy] = useState<'recent' | 'score'>('recent')

  useEffect(() => { loadScans() }, [])

  useEffect(() => {
    if (scans.length === 0) return
    const tickers = [...new Set(scans.filter(s => s.ticker).map(s => s.ticker))]
    tickers.forEach(async (ticker) => {
      const price = await fetchLivePrice(ticker)
      if (price) setPrices(prev => ({ ...prev, [ticker]: price }))
    })
    const interval = setInterval(() => {
      tickers.forEach(async (ticker) => {
        const price = await fetchLivePrice(ticker)
        if (price) setPrices(prev => ({ ...prev, [ticker]: price }))
      })
    }, 60000)
    return () => clearInterval(interval)
  }, [scans])

  async function loadScans() {
    try {
      const url = `${import.meta.env.VITE_SUPABASE_URL}/rest/v1/scans?select=*&order=scanned_at.desc&limit=100`
      const r = await fetch(url, { headers: { 'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY, 'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}` } })
      if (r.ok) setScans(await r.json())
    } catch { }
    setLoading(false)
  }

  const sorted = [...scans]
    .filter(s => filter === 'All' || s.verdict === filter)
    .sort((a, b) => sortBy === 'score' ? (b.score - a.score) : sortBy === 'recent' ? (new Date(b.scanned_at).getTime() - new Date(a.scanned_at).getTime()) : 0)

  return (
    <div className="feed-root">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800;900&family=JetBrains+Mono:wght@400;500;600;700&display=swap');

        :root {
          --bg: #f8faf8;
          --bg-2: #ffffff;
          --bg-3: #f1f5f1;
          --border: #e2e8e4;
          --border-2: #d1d9d3;
          --text-1: #0f1a12;
          --text-2: #2d3b30;
          --text-3: #5a6b5e;
          --text-4: #8a9b8e;
          --green: #16a34a;
          --green-light: #dcfce7;
          --green-dark: #14532d;
          --font: 'Outfit', sans-serif;
          --mono: 'JetBrains Mono', monospace;
          --radius: 12px;
          --shadow-sm: 0 1px 2px rgba(0,0,0,0.04);
        }

        * { box-sizing: border-box; margin: 0; padding: 0; }

        .feed-root {
          min-height: 100vh;
          background: var(--bg);
          font-family: var(--font);
          color: var(--text-1);
          -webkit-font-smoothing: antialiased;
        }

        @keyframes shimmer { 0% { background-position: -700px 0; } 100% { background-position: 700px 0; } }
        @keyframes fadeUp { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }

        .feed-nav {
          background: rgba(248,250,248,0.85);
          backdrop-filter: blur(20px) saturate(180%);
          border-bottom: 1px solid var(--border);
          padding: 0 24px;
          display: flex; align-items: center; height: 56px;
          position: sticky; top: 0; z-index: 100;
        }
        .feed-nav-brand { display: flex; align-items: center; gap: 10px; text-decoration: none; }
        .feed-nav-logo {
          width: 28px; height: 28px; background: var(--green);
          border-radius: 7px; display: flex; align-items: center; justify-content: center;
        }
        .feed-nav-title { font-size: 15px; font-weight: 700; color: var(--text-1); letter-spacing: -0.3px; }
        .feed-nav-title span { color: var(--green); }
        .feed-nav-right { margin-left: auto; display: flex; align-items: center; gap: 8px; }
        .feed-nav-badge {
          font-family: var(--mono); font-size: 9px; color: var(--green-dark);
          background: var(--green-light); border-radius: 20px; padding: 3px 10px;
          border: 1px solid rgba(22,163,74,0.2);
        }
        .feed-nav-scan {
          display: flex; align-items: center; gap: 6px;
          background: var(--green); color: #fff; text-decoration: none;
          border-radius: 20px; padding: 7px 14px; font-size: 12px;
          font-weight: 600; font-family: var(--font); white-space: nowrap;
          transition: all 0.15s;
        }
        .feed-nav-scan:hover { background: #15803d; }

        .feed-header h1 {
          font-size: 26px; font-weight: 800; color: var(--text-1);
          letter-spacing: -1px; margin-bottom: 4px;
        }
        .feed-header p {
          font-size: 13px; color: var(--text-4); margin: 0;
        }

        .feed-controls {
          display: flex; gap: 8px; flex-wrap: wrap;
          margin-bottom: 16px; align-items: center;
        }
        .toggle-group {
          display: flex; background: var(--bg-3);
          border-radius: 10px; padding: 3px; gap: 2px;
          border: 1px solid var(--border);
        }
        .toggle-btn {
          padding: 6px 14px; border-radius: 8px; border: none;
          background: transparent; color: var(--text-4);
          font-size: 12px; font-weight: 500; cursor: pointer;
          font-family: var(--font); transition: all 0.15s;
        }
        .toggle-btn.active {
          background: var(--bg-2); color: var(--text-1);
          font-weight: 700; box-shadow: var(--shadow-sm);
        }
        .filter-btn {
          padding: 6px 14px; border-radius: 20px;
          border: 1.5px solid var(--border);
          background: var(--bg-2); color: var(--text-4);
          font-size: 11px; font-weight: 500; cursor: pointer;
          font-family: var(--font); transition: all 0.15s;
        }
        .filter-btn.active {
          font-weight: 700;
        }
        .refresh-btn {
          margin-left: auto; padding: 6px 14px; border-radius: 20px;
          border: 1px solid rgba(22,163,74,0.2); background: var(--green-light);
          color: var(--green-dark); font-size: 11px; font-weight: 600;
          cursor: pointer; font-family: var(--font); transition: all 0.15s;
        }
        .refresh-btn:hover { background: #bbf7d0; }

        .grid-view {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(min(280px, 100%), 1fr));
          gap: 10px;
        }

        .grid-card {
          background: var(--bg-2);
          border: 1.5px solid var(--border);
          border-radius: var(--radius);
          padding: 16px;
          cursor: pointer;
          transition: all 0.15s;
          position: relative;
          overflow: hidden;
        }
        .grid-card:hover { box-shadow: 0 4px 16px rgba(0,0,0,0.06); }
        .grid-card-accent {
          position: absolute; top: 0; left: 0; right: 0;
          height: 3px; border-radius: 12px 12px 0 0;
        }
        .grid-card-header {
          display: flex; align-items: flex-start; gap: 10px;
          margin-bottom: 10px; margin-top: 4px;
        }
        .grid-card-logo {
          width: 40px; height: 40px; border-radius: 10px;
          overflow: hidden; display: flex; align-items: center;
          justify-content: center; flex-shrink: 0;
        }
        .grid-card-logo img { width: 100%; height: 100%; object-fit: cover; }
        .grid-card-name {
          font-size: 14px; font-weight: 700; color: var(--text-1);
          letter-spacing: -0.3px; margin-bottom: 2px;
          overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
        }
        .grid-card-meta { font-family: var(--mono); font-size: 9px; color: var(--text-4); }
        .grid-card-score { font-size: 22px; font-weight: 800; line-height: 1; }
        .grid-card-score-label { font-family: var(--mono); font-size: 8px; color: var(--text-4); }
        .grid-card-verdict {
          display: inline-flex; align-items: center; gap: 5px;
          border-radius: 20px; padding: 4px 10px; margin-bottom: 8px;
        }
        .grid-card-ticker {
          display: flex; align-items: center; gap: 6px; margin-bottom: 6px;
        }
        .ticker-dot { width: 6px; height: 6px; border-radius: 50%; }
        .ticker-symbol { font-family: var(--mono); font-size: 10px; color: var(--text-1); font-weight: 600; }
        .ticker-price { font-family: var(--mono); font-size: 10px; }
        .ticker-live {
          font-family: var(--mono); font-size: 8px; color: #16a34a;
          background: #dcfce7; padding: 1px 5px; border-radius: 4px;
        }
        .grid-card-hl {
          font-size: 10px; color: var(--text-3); margin-bottom: 3px;
          overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
        }
        .grid-card-footer {
          display: flex; align-items: center; justify-content: space-between;
          margin-top: 8px; padding-top: 8px; border-top: 1px solid var(--bg-3);
        }
        .grid-card-flags {
          font-family: var(--mono); font-size: 9px; color: #dc2626;
          background: #fef2f2; border: 1px solid #fecaca; padding: 2px 7px; border-radius: 20px;
        }
        .grid-card-clean { font-family: var(--mono); font-size: 9px; color: var(--green); }
        .grid-card-time { font-family: var(--mono); font-size: 9px; color: var(--text-4); }

        .tier-row {
          display: flex; gap: 0; border-radius: 14px;
          overflow: hidden; border: 1.5px solid var(--border);
          margin-bottom: 8px;
        }
        .tier-label {
          width: 64px; flex-shrink: 0;
          display: flex; flex-direction: column;
          align-items: center; justify-content: center;
          padding: 12px 6px; gap: 2px;
        }
        .tier-label-letter { font-size: 28px; font-weight: 900; color: #fff; line-height: 1; }
        .tier-label-sub { font-size: 9px; color: rgba(255,255,255,0.7); text-align: center; }
        .tier-projects {
          flex: 1; background: var(--bg-2); padding: 10px;
          display: grid; grid-template-columns: repeat(auto-fill, minmax(min(220px, 100%), 1fr));
          gap: 8px; min-height: 80px; align-content: start;
        }
        .tier-empty {
          display: flex; align-items: center; justify-content: center;
          color: var(--text-4); font-size: 12px; font-style: italic;
          grid-column: 1 / -1; padding: 16px;
        }

        .tier-card {
          display: flex; align-items: center; gap: 10px;
          background: var(--bg-2); border-radius: 12px;
          padding: 10px 12px; cursor: pointer;
          transition: all 0.15s; min-width: 0;
        }
        .tier-card-logo {
          width: 40px; height: 40px; border-radius: 50%;
          overflow: hidden; flex-shrink: 0;
          display: flex; align-items: center; justify-content: center;
        }
        .tier-card-logo img { width: 100%; height: 100%; object-fit: cover; }
        .tier-card-name {
          font-size: 13px; font-weight: 700; color: var(--text-1);
          overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
        }
        .tier-card-meta { font-family: var(--mono); font-size: 9px; color: var(--text-4); margin-top: 1px; }

        .feed-footer {
          text-align: center; font-family: var(--mono);
          font-size: 9px; color: var(--text-4); letter-spacing: 1px;
          padding-top: 40px;
        }

        @media (max-width: 640px) {
          .grid-view { grid-template-columns: 1fr !important; }
          .tier-projects { grid-template-columns: 1fr !important; }
          .feed-controls { flex-direction: column; align-items: stretch; }
          .refresh-btn { margin-left: 0; }
        }
      `}</style>

      {/* Nav */}
      <div className="feed-nav">
        <a href="/" className="feed-nav-brand">
          <div className="feed-nav-logo">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04a1 1 0 000-1.41l-2.34-2.34a1 1 0 00-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z" fill="#fff" /></svg>
          </div>
          <div>
            <span className="feed-nav-title">CMV <span>Alpha</span></span>
          </div>
        </a>
        <div className="feed-nav-right">
          <span className="feed-nav-badge">LIVE</span>
          <a href="/" className="feed-nav-scan">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>
            Scan Project
          </a>
        </div>
      </div>

      <div style={{ maxWidth: 960, margin: '0 auto', padding: '32px 16px 60px' }}>

        {/* Header */}
        <div className="feed-header" style={{ marginBottom: 24 }}>
          <h1>Community Alpha Feed</h1>
          <p>{scans.length} projects scanned · prices update every 60s</p>
        </div>

        {/* Controls */}
        <div className="feed-controls">
          <div className="toggle-group">
            {(['grid', 'tier'] as const).map(v => (
              <button key={v} onClick={() => setViewMode(v)} className={`toggle-btn ${viewMode === v ? 'active' : ''}`}>
                {v === 'grid' ? 'Grid' : 'Tier List'}
              </button>
            ))}
          </div>

          <div className="toggle-group">
            {(['recent', 'score'] as const).map(s => (
              <button key={s} onClick={() => setSortBy(s)} className={`toggle-btn ${sortBy === s ? 'active' : ''}`}>
                {s === 'recent' ? 'Recent' : 'Top Score'}
              </button>
            ))}
          </div>

          {viewMode === 'grid' && (
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {['All', 'FARM IT', 'CREATE CONTENT', 'WATCH', 'SKIP'].map(v => {
                const t = TIER_CONFIG[v]
                const active = filter === v
                return (
                  <button key={v} onClick={() => setFilter(v)}
                    className={`filter-btn ${active ? 'active' : ''}`}
                    style={active && t ? { borderColor: t.border, background: t.bg, color: t.tc } : {}}>
                    {t ? v : 'All'}
                  </button>
                )
              })}
            </div>
          )}

          <button onClick={loadScans} className="refresh-btn">Refresh</button>
        </div>

        {/* Loading */}
        {loading && (
          <div className="grid-view">
            {[1,2,3,4,5,6].map(i => <div key={i} style={{ height: 160, background: 'linear-gradient(90deg, var(--bg-3) 25%, var(--border) 50%, var(--bg-3) 75%)', backgroundSize: '400px 100%', animation: 'shimmer 1.5s infinite', borderRadius: 'var(--radius)' }} />)}
          </div>
        )}

        {/* Empty */}
        {!loading && sorted.length === 0 && (
          <div style={{ textAlign: 'center', padding: '60px 24px', color: 'var(--text-4)' }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>🔭</div>
            <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 6, color: 'var(--text-3)' }}>No scans yet</div>
            <a href="/" style={{ display: 'inline-block', marginTop: 16, padding: '10px 24px', background: 'var(--green)', color: '#fff', borderRadius: 20, fontSize: 13, fontWeight: 700, textDecoration: 'none' }}>Scan a project</a>
          </div>
        )}

        {/* Grid view */}
        {!loading && sorted.length > 0 && viewMode === 'grid' && (
          <div className="grid-view">
            {sorted.map((scan: any) => <GridCard key={scan.id} scan={scan} livePrice={scan.ticker ? prices[scan.ticker] : undefined} />)}
          </div>
        )}

        {/* Tier list view */}
        {!loading && scans.length > 0 && viewMode === 'tier' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {TIER_ORDER.map(verdict => {
              const t = TIER_CONFIG[verdict]
              const tierProjects = scans
                .filter(s => s.verdict === verdict)
                .sort((a, b) => sortBy === 'score' ? b.score - a.score : sortBy === 'recent' ? new Date(b.scanned_at).getTime() - new Date(a.scanned_at).getTime() : 0)
              return (
                <div key={verdict} className="tier-row" style={{ borderColor: t.border }}>
                  <div className="tier-label" style={{ background: t.color }}>
                    <span className="tier-label-letter">{t.tier}</span>
                    <span className="tier-label-sub">{verdict.toLowerCase()}</span>
                  </div>
                  <div className="tier-projects">
                    {tierProjects.length === 0
                      ? <div className="tier-empty">No projects in this tier yet</div>
                      : tierProjects.map((scan: any) => <TierCard key={scan.id} scan={scan} livePrice={scan.ticker ? prices[scan.ticker] : undefined} />)}
                  </div>
                </div>
              )
            })}
          </div>
        )}

        <div className="feed-footer">CMV ALPHASCANNER · COMMUNITY FEED · PRICES UPDATE EVERY 60S</div>
      </div>
    </div>
  )
}
