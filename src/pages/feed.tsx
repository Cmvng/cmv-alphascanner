import { useState, useEffect } from 'react'

const TIER_CONFIG: Record<string, any> = {
  'FARM IT':        { tier: 'A', color: '#37b24d', bg: '#ebfbee', border: '#8ce99a', tc: '#2f9e44', emoji: '🌾', label: 'Tier A' },
  'CREATE CONTENT': { tier: 'B', color: '#f59f00', bg: '#fff3bf', border: '#ffe066', tc: '#e67700', emoji: '✍️', label: 'Tier B' },
  'WATCH':          { tier: 'C', color: '#e8590c', bg: '#fff4e6', border: '#ffc078', tc: '#d9480f', emoji: '👁️', label: 'Tier C' },
  'SKIP':           { tier: 'D', color: '#868e96', bg: '#f1f3f5', border: '#dee2e6', tc: '#495057', emoji: '🚫', label: 'Tier D' },
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

function ProjectLogo({ scan, size = 40, tc }: { scan: any, size?: number, tc: string }) {
  const [err, setErr] = useState(false)
  const initial = (scan.project_name || scan.handle || '?').charAt(0).toUpperCase()
  if (!err && scan.profile_image_url) {
    return <img src={scan.profile_image_url} alt={scan.project_name} onError={() => setErr(true)}
      style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover', border: '2px solid rgba(255,255,255,0.3)', flexShrink: 0 }} />
  }
  return <div style={{ width: size, height: size, borderRadius: '50%', background: 'rgba(255,255,255,0.2)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: size * 0.38, fontWeight: 700, flexShrink: 0 }}>{initial}</div>
}

function GridCard({ scan, livePrice }: { scan: any, livePrice?: string }) {
  const t = TIER_CONFIG[scan.verdict] || TIER_CONFIG['WATCH']
  const displayPrice = livePrice || scan.token_price
  return (
    <div onClick={() => { window.location.href = `/?q=${scan.handle}` }}
      style={{ background: '#fff', border: '1.5px solid #e5e7eb', borderRadius: 14, padding: 16, cursor: 'pointer', transition: 'all 0.15s', position: 'relative', overflow: 'hidden' }}
      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = t.border; (e.currentTarget as HTMLElement).style.boxShadow = `0 4px 20px ${t.color}20` }}
      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = '#e5e7eb'; (e.currentTarget as HTMLElement).style.boxShadow = 'none' }}>
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: t.color, borderRadius: '14px 14px 0 0' }} />
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 10, marginTop: 4 }}>
        <div style={{ width: 40, height: 40, borderRadius: 10, background: t.bg, border: `1px solid ${t.border}`, overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          {scan.profile_image_url
            ? <img src={scan.profile_image_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={e => { (e.target as HTMLImageElement).style.display='none' }} />
            : <span style={{ fontSize: 18, fontWeight: 700, color: t.tc }}>{(scan.project_name||scan.handle||'?').charAt(0).toUpperCase()}</span>}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 800, color: '#1c2b5a', letterSpacing: -0.3, marginBottom: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const }}>{scan.project_name || scan.handle}</div>
          <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 9, color: '#9ca3af' }}>{scan.category || 'Crypto'} · @{scan.handle}</div>
        </div>
        <div style={{ textAlign: 'right' as const, flexShrink: 0 }}>
          <div style={{ fontSize: 22, fontWeight: 800, color: t.color, lineHeight: 1 }}>{scan.score}</div>
          <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 8, color: '#9ca3af' }}>SCORE</div>
        </div>
      </div>
      <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: t.bg, border: `1px solid ${t.border}`, borderRadius: 20, padding: '4px 10px', marginBottom: 8 }}>
        <span style={{ fontSize: 10 }}>{t.emoji}</span>
        <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 9, fontWeight: 700, color: t.tc }}>{scan.verdict}</span>
      </div>
      {scan.ticker && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
          <div style={{ width: 6, height: 6, borderRadius: '50%', background: livePrice ? '#16a34a' : '#9ca3af' }} />
          <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 10, color: '#1c2b5a', fontWeight: 600 }}>{scan.ticker}</span>
          <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 10, color: livePrice ? '#16a34a' : '#6b7280' }}>{displayPrice || 'fetching...'}</span>
          {livePrice && <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 8, color: '#16a34a', background: '#dcfce7', padding: '1px 5px', borderRadius: 4 }}>LIVE</span>}
        </div>
      )}
      {(scan.good_highlights || []).filter((h: string) => h).slice(0, 2).map((h: string, i: number) => (
        <div key={i} style={{ fontSize: 10, color: '#4b5563', marginBottom: 3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const }}>✓ {h}</div>
      ))}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 8, paddingTop: 6, borderTop: '1px solid #f3f4f6' }}>
        {scan.red_flag_count > 0
          ? <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 9, color: '#c92a2a', background: '#fff5f5', border: '1px solid #fca5a5', padding: '2px 7px', borderRadius: 20 }}>🚨 {scan.red_flag_count} flag{scan.red_flag_count > 1 ? 's' : ''}</span>
          : <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 9, color: '#15803d' }}>✓ clean</span>}
        <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 9, color: '#9ca3af' }}>{timeAgo(scan.scanned_at)}</span>
      </div>
    </div>
  )
}

function TierCard({ scan, livePrice }: { scan: any, livePrice?: string }) {
  const t = TIER_CONFIG[scan.verdict] || TIER_CONFIG['WATCH']
  const displayPrice = livePrice || scan.token_price
  return (
    <div onClick={() => { window.location.href = `/?q=${scan.handle}` }}
      style={{ display: 'flex', alignItems: 'center', gap: 10, background: '#fff', border: `1px solid ${t.border}`, borderRadius: 12, padding: '10px 12px', cursor: 'pointer', transition: 'all 0.15s', minWidth: 0 }}
      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = t.bg }}
      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = '#fff' }}>
      {/* Project logo */}
      <div style={{ width: 44, height: 44, borderRadius: '50%', overflow: 'hidden', flexShrink: 0, border: `2px solid ${t.border}`, background: t.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {scan.profile_image_url
          ? <img src={scan.profile_image_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={e => { (e.target as HTMLImageElement).style.display='none' }} />
          : <span style={{ fontSize: 18, fontWeight: 700, color: t.tc }}>{(scan.project_name||scan.handle||'?').charAt(0).toUpperCase()}</span>}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: '#1c2b5a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const }}>{scan.project_name || scan.handle}</div>
        <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 9, color: '#9ca3af', marginTop: 1 }}>
          {scan.category || 'Crypto'}
          {scan.ticker && <span style={{ color: t.color, marginLeft: 6 }}>{scan.ticker} {displayPrice || ''}</span>}
        </div>
      </div>
      <div style={{ textAlign: 'right' as const, flexShrink: 0 }}>
        <div style={{ fontSize: 18, fontWeight: 800, color: t.color }}>{scan.score}</div>
        {scan.red_flag_count > 0 && <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 8, color: '#c92a2a' }}>🚨 {scan.red_flag_count}</div>}
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
    <div style={{ minHeight: '100vh', background: '#faf7f0', fontFamily: "'Plus Jakarta Sans',sans-serif" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=DM+Mono:wght@400;500&display=swap');`}</style>

      {/* Nav */}
      <div style={{ background: '#fff', borderBottom: '1px solid #d4e8d0', padding: '0 24px', display: 'flex', alignItems: 'center', height: 58, gap: 10, position: 'sticky', top: 0, zIndex: 100 }}>
        <a href="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 34, height: 34, background: 'linear-gradient(135deg,#166534,#16a34a)', borderRadius: 9, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04a1 1 0 000-1.41l-2.34-2.34a1 1 0 00-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z" fill="#fff" /></svg>
          </div>
          <div>
            <span style={{ fontSize: 16, fontWeight: 800, color: '#1c2b5a' }}>CMV <span style={{ color: '#16a34a' }}>AlphaScanner</span></span>
            <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 8, color: '#16a34a' }}>tap to scan a project</div>
          </div>
        </a>
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 9, color: '#15803d', background: '#dcfce7', borderRadius: 20, padding: '3px 10px', border: '1px solid #86efac' }}>🔴 LIVE</span>
          <a href="/" style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'linear-gradient(135deg,#166534,#16a34a)', color: '#fff', textDecoration: 'none', borderRadius: 20, padding: '7px 14px', fontSize: 12, fontWeight: 700, fontFamily: 'inherit', whiteSpace: 'nowrap' as const }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>
            Scan Project
          </a>
        </div>
      </div>

      <div style={{ maxWidth: 960, margin: '0 auto', padding: '32px 16px 60px' }}>

        {/* Header */}
        <div style={{ marginBottom: 24 }}>
          <h1 style={{ fontSize: 28, fontWeight: 900, color: '#14532d', letterSpacing: -1, marginBottom: 6 }}>Community Alpha Feed</h1>
          <p style={{ fontSize: 13, color: '#6b7280' }}>{scans.length} projects scanned · prices update every 60s</p>
        </div>

        {/* Controls */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' as const, marginBottom: 16, alignItems: 'center' }}>
          {/* View toggle */}
          <div style={{ display: 'flex', background: '#f0f4ff', borderRadius: 10, padding: 3, gap: 2 }}>
            {(['grid', 'tier'] as const).map(v => (
              <button key={v} onClick={() => setViewMode(v)} style={{ padding: '6px 14px', borderRadius: 8, border: 'none', background: viewMode === v ? '#fff' : 'transparent', color: viewMode === v ? '#14532d' : '#6b7280', fontSize: 12, fontWeight: viewMode === v ? 700 : 500, cursor: 'pointer', fontFamily: 'inherit', boxShadow: viewMode === v ? '0 1px 4px rgba(0,0,0,0.1)' : 'none', transition: 'all 0.15s' }}>
                {v === 'grid' ? '⊞ Grid' : '≡ Tier List'}
              </button>
            ))}
          </div>

          {/* Sort */}
          <div style={{ display: 'flex', background: '#f0f4ff', borderRadius: 10, padding: 3, gap: 2 }}>
            {(['recent', 'score'] as const).map(s => (
              <button key={s} onClick={() => setSortBy(s)} style={{ padding: '6px 14px', borderRadius: 8, border: 'none', background: sortBy === s ? '#fff' : 'transparent', color: sortBy === s ? '#14532d' : '#6b7280', fontSize: 12, fontWeight: sortBy === s ? 700 : 500, cursor: 'pointer', fontFamily: 'inherit', boxShadow: sortBy === s ? '0 1px 4px rgba(0,0,0,0.1)' : 'none', transition: 'all 0.15s' }}>
                {s === 'recent' ? '🕐 Recent' : '🏆 Score'}
              </button>
            ))}
          </div>

          {/* Filter — hide in tier mode */}
          {viewMode === 'grid' && (
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' as const }}>
              {['All', 'FARM IT', 'CREATE CONTENT', 'WATCH', 'SKIP'].map(v => {
                const t = TIER_CONFIG[v]
                const active = filter === v
                return (
                  <button key={v} onClick={() => setFilter(v)} style={{ padding: '6px 14px', borderRadius: 20, border: `1.5px solid ${active && t ? t.border : '#d4e8d0'}`, background: active && t ? t.bg : '#fff', color: active && t ? t.tc : '#6b7280', fontSize: 11, fontWeight: active ? 700 : 500, cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.15s' }}>
                    {t ? `${t.emoji} ${v}` : '🌐 All'}
                  </button>
                )
              })}
            </div>
          )}

          <button onClick={loadScans} style={{ marginLeft: 'auto', padding: '6px 14px', borderRadius: 20, border: '1px solid #86efac', background: '#f0fdf4', color: '#15803d', fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>↺ Refresh</button>
        </div>

        {/* Loading */}
        {loading && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(min(260px,100%),1fr))', gap: 12 }}>
            {[1,2,3,4,5,6].map(i => <div key={i} style={{ height: 160, background: 'linear-gradient(90deg,#f0fdf4 25%,#dcfce7 50%,#f0fdf4 75%)', backgroundSize: '400px 100%', animation: 'shimmer 1.5s infinite', borderRadius: 14 }} />)}
          </div>
        )}

        {/* Empty */}
        {!loading && sorted.length === 0 && (
          <div style={{ textAlign: 'center' as const, padding: '60px 24px', color: '#9ca3af' }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>🔭</div>
            <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 6, color: '#6b7280' }}>No scans yet</div>
            <a href="/" style={{ display: 'inline-block', marginTop: 16, padding: '10px 24px', background: 'linear-gradient(135deg,#166534,#16a34a)', color: '#fff', borderRadius: 20, fontSize: 13, fontWeight: 700, textDecoration: 'none' }}>Scan a project →</a>
          </div>
        )}

        {/* Grid view */}
        {!loading && sorted.length > 0 && viewMode === 'grid' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(min(260px,100%),1fr))', gap: 12 }}>
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
                <div key={verdict} style={{ display: 'flex', gap: 0, borderRadius: 16, overflow: 'hidden', border: `1.5px solid ${t.border}` }}>
                  {/* Tier label */}
                  <div style={{ background: t.color, width: 70, flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '12px 8px', gap: 4 }}>
                    <span style={{ fontSize: 28, fontWeight: 900, color: '#fff', lineHeight: 1 }}>{t.tier}</span>
                    <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.8)', textAlign: 'center', lineHeight: 1.3 }}>{t.emoji}</span>
                  </div>
                  {/* Projects */}
                  <div style={{ flex: 1, background: '#fff', padding: 10, display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(min(220px,100%),1fr))', gap: 8, minHeight: 80, alignContent: 'start' }}>
                    {tierProjects.length === 0
                      ? <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9ca3af', fontSize: 12, fontStyle: 'italic', gridColumn: '1/-1', padding: 16 }}>No projects in this tier yet</div>
                      : tierProjects.map((scan: any) => <TierCard key={scan.id} scan={scan} livePrice={scan.ticker ? prices[scan.ticker] : undefined} />)}
                  </div>
                </div>
              )
            })}
          </div>
        )}

        <div style={{ textAlign: 'center' as const, fontFamily: "'DM Mono',monospace", fontSize: 9, color: '#adb5bd', letterSpacing: 1, paddingTop: 40 }}>CMV ALPHASCANNER · COMMUNITY FEED · PRICES UPDATE EVERY 60S</div>
      </div>
    </div>
  )
}
