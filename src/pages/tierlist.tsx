import { useState, useEffect, useRef } from 'react'

const TIER_CONFIG: Record<string, any> = {
  S: { color: '#7c3aed', bg: '#f5f3ff', border: '#c4b5fd', tc: '#6d28d9', label: 'S · Alpha', sub: 'Rare conviction play' },
  A: { color: '#16a34a', bg: '#dcfce7', border: '#86efac', tc: '#15803d', label: 'A · Farm It', sub: 'High conviction play' },
  B: { color: '#ca8a04', bg: '#fef9c3', border: '#fde047', tc: '#a16207', label: 'B · Watch It', sub: 'Solid but selective' },
  C: { color: '#ea580c', bg: '#fff7ed', border: '#fdba74', tc: '#c2410c', label: 'C · Observe', sub: 'Too early to call' },
  D: { color: '#6b7280', bg: '#f3f4f6', border: '#d1d5db', tc: '#4b5563', label: 'D · Avoid', sub: 'Too many red flags' },
}

const STORAGE_KEY = 'cmv_tierlist_v1'

function Logo({ scan, size = 48 }: { scan: any, size?: number }) {
  const [err, setErr] = useState(false)
  const initial = (scan.project_name || scan.handle || '?').charAt(0).toUpperCase()
  if (!err && scan.profile_image_url) {
    return <img src={scan.profile_image_url} alt={scan.project_name} onError={() => setErr(true)}
      style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover', border: '2px solid rgba(0,0,0,0.06)', flexShrink: 0 }} />
  }
  return <div style={{ width: size, height: size, borderRadius: '50%', background: 'var(--bg-3)', color: 'var(--text-3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: size * 0.4, fontWeight: 700, flexShrink: 0, border: '1px solid var(--border)' }}>{initial}</div>
}

export default function TierList() {
  const [scans, setScans] = useState<any[]>([])
  const [tiers, setTiers] = useState<Record<string, string[]>>({ A: [], B: [], C: [], D: [], unranked: [] })
  const [loading, setLoading] = useState(true)
  const [dragItem, setDragItem] = useState<string | null>(null)
  const [dragOver, setDragOver] = useState<string | null>(null)
  const [downloading, setDownloading] = useState(false)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => { loadScans() }, [])

  useEffect(() => {
    if (scans.length === 0) return
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) {
      try {
        const savedTiers = JSON.parse(saved)
        const allRanked = Object.values(savedTiers).flat() as string[]
        const newScans = scans.filter(s => !allRanked.includes(s.handle)).map(s => s.handle)
        setTiers({ ...savedTiers, unranked: [...(savedTiers.unranked || []), ...newScans] })
        return
      } catch {}
    }
    const suggested: Record<string, string[]> = { A: [], B: [], C: [], D: [], unranked: [] }
    scans.forEach(s => {
      if (s.verdict === 'FARM IT' || s.verdict === 'S') suggested.A.push(s.handle)
      else if (s.verdict === 'CREATE CONTENT') suggested.B.push(s.handle)
      else if (s.verdict === 'WATCH') suggested.C.push(s.handle)
      else suggested.D.push(s.handle)
    })
    setTiers(suggested)
  }, [scans])

  useEffect(() => {
    if (scans.length > 0) localStorage.setItem(STORAGE_KEY, JSON.stringify(tiers))
  }, [tiers])

  async function loadScans() {
    try {
      const r = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/rest/v1/scans?select=*&order=score.desc&limit=100`, {
        headers: { 'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY, 'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}` }
      })
      if (r.ok) setScans(await r.json())
    } catch {}
    setLoading(false)
  }

  function getScan(handle: string) {
    return scans.find(s => s.handle === handle)
  }

  function moveTo(handle: string, targetTier: string) {
    setTiers(prev => {
      const next = { ...prev }
      Object.keys(next).forEach(t => { next[t] = next[t].filter(h => h !== handle) })
      next[targetTier] = [...(next[targetTier] || []), handle]
      return next
    })
  }

  function removeFromTier(handle: string) {
    setTiers(prev => {
      const next = { ...prev }
      Object.keys(next).forEach(t => { next[t] = next[t].filter(h => h !== handle) })
      next.unranked = [...next.unranked, handle]
      return next
    })
  }

  function onDragStart(handle: string) { setDragItem(handle) }
  function onDragOver(e: React.DragEvent, tier: string) { e.preventDefault(); setDragOver(tier) }
  function onDrop(e: React.DragEvent, tier: string) {
    e.preventDefault()
    if (dragItem) { moveTo(dragItem, tier); setDragItem(null); setDragOver(null) }
  }
  function onDragEnd() { setDragItem(null); setDragOver(null) }

  async function downloadTierList() {
    setDownloading(true)
    const canvas = document.createElement('canvas')
    const W = 1200
    const activeTiers = ['S','A','B','C','D'].filter(t => (tiers[t]||[]).length > 0)
    const HEADER = 90
    const TIER_H = 160
    const GAP = 10
    const PAD = 24
    const H = HEADER + activeTiers.length * (TIER_H + GAP) + PAD
    canvas.width = W
    canvas.height = H
    const ctx = canvas.getContext('2d')!

    // Background — clean light
    ctx.fillStyle = '#f8faf8'
    ctx.fillRect(0, 0, W, H)

    // Header
    ctx.fillStyle = '#0f1a12'
    ctx.font = 'bold 28px Arial, sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText('CMV AlphaScanner  ·  Crypto Alpha Tier List', W / 2, 46)
    ctx.font = '14px monospace'
    ctx.fillStyle = '#8a9b8e'
    ctx.fillText('cmv-alphascanner.vercel.app  ·  ' + new Date().toLocaleDateString(), W / 2, 68)
    ctx.textAlign = 'left'

    let yOff = HEADER + GAP

    for (const tier of activeTiers) {
      const t = TIER_CONFIG[tier]
      const projects = (tiers[tier] || []).map(h => getScan(h)).filter(Boolean)

      // Tier label box
      ctx.fillStyle = t.color
      ctx.beginPath()
      ctx.roundRect(PAD, yOff, 64, TIER_H, 14)
      ctx.fill()
      ctx.fillStyle = '#fff'
      ctx.font = 'bold 38px Arial'
      ctx.textAlign = 'center'
      ctx.fillText(tier, PAD + 32, yOff + 46)
      ctx.font = '11px Arial'
      ctx.fillText(t.sub, PAD + 32, yOff + 64)
      ctx.textAlign = 'left'

      // White project area
      ctx.fillStyle = '#fff'
      ctx.beginPath()
      ctx.roundRect(PAD + 74, yOff, W - PAD * 2 - 74, TIER_H, 14)
      ctx.fill()
      ctx.strokeStyle = t.border
      ctx.lineWidth = 1.5
      ctx.stroke()

      const CARD_W = 140
      const LOGO_R = 36
      let xPos = PAD + 74 + 16

      for (let pi = 0; pi < Math.min(projects.length, 7); pi++) {
        const scan = projects[pi]
        if (xPos + CARD_W > W - PAD * 2) break

        const cx = xPos + LOGO_R
        const cy = yOff + 50

        let logoDrawn = false
        if (scan.profile_image_url) {
          try {
            await new Promise<void>(resolve => {
              const img = new Image()
              img.crossOrigin = 'anonymous'
              img.onload = () => {
                ctx.save()
                ctx.beginPath()
                ctx.arc(cx, cy, LOGO_R, 0, Math.PI * 2)
                ctx.clip()
                ctx.drawImage(img, cx - LOGO_R, cy - LOGO_R, LOGO_R * 2, LOGO_R * 2)
                ctx.restore()
                ctx.strokeStyle = t.border
                ctx.lineWidth = 2
                ctx.beginPath()
                ctx.arc(cx, cy, LOGO_R, 0, Math.PI * 2)
                ctx.stroke()
                logoDrawn = true
                resolve()
              }
              img.onerror = () => resolve()
              img.src = scan.profile_image_url
            })
          } catch {}
        }
        if (!logoDrawn) {
          ctx.fillStyle = t.bg
          ctx.beginPath()
          ctx.arc(cx, cy, LOGO_R, 0, Math.PI * 2)
          ctx.fill()
          ctx.strokeStyle = t.border
          ctx.lineWidth = 2
          ctx.stroke()
          ctx.fillStyle = t.tc
          ctx.font = 'bold 22px Arial'
          ctx.textAlign = 'center'
          ctx.fillText((scan.project_name||'?').charAt(0).toUpperCase(), cx, cy + 8)
          ctx.textAlign = 'left'
        }

        const name = (scan.project_name || scan.handle || '')
        const shortName = name.length > 11 ? name.slice(0, 10) + '…' : name
        ctx.fillStyle = '#0f1a12'
        ctx.font = 'bold 12px Arial'
        ctx.textAlign = 'center'
        ctx.fillText(shortName, cx, yOff + 102)

        ctx.fillStyle = t.color
        ctx.font = 'bold 13px monospace'
        ctx.fillText(String(scan.score), cx, yOff + 118)

        if (scan.ticker && scan.token_price && scan.token_price !== 'Not Launched') {
          ctx.fillStyle = '#8a9b8e'
          ctx.font = '10px monospace'
          ctx.fillText(scan.ticker, cx, yOff + 133)
        }

        ctx.textAlign = 'left'
        xPos += CARD_W
      }

      if (projects.length > 7) {
        ctx.fillStyle = '#8a9b8e'
        ctx.font = 'bold 13px Arial'
        ctx.textAlign = 'right'
        ctx.fillText('+' + (projects.length - 7) + ' more', W - PAD * 2 - 10, yOff + TIER_H / 2 + 6)
        ctx.textAlign = 'left'
      }

      yOff += TIER_H + GAP
    }

    // Footer
    ctx.fillStyle = '#8a9b8e'
    ctx.font = '12px monospace'
    ctx.textAlign = 'center'
    ctx.fillText('CMV ALPHASCANNER  ·  cmv-alphascanner.vercel.app', W / 2, H - 12)

    const link = document.createElement('a')
    link.download = 'cmv-tierlist.png'
    link.href = canvas.toDataURL('image/png', 1.0)
    link.click()
    setDownloading(false)
  }


  function resetTiers() {
    if (!confirm('Reset your tier list? This cannot be undone.')) return
    localStorage.removeItem(STORAGE_KEY)
    const suggested: Record<string, string[]> = { A: [], B: [], C: [], D: [], unranked: [] }
    scans.forEach(s => {
      if (s.verdict === 'FARM IT' || s.verdict === 'S') suggested.A.push(s.handle)
      else if (s.verdict === 'CREATE CONTENT') suggested.B.push(s.handle)
      else if (s.verdict === 'WATCH') suggested.C.push(s.handle)
      else suggested.D.push(s.handle)
    })
    setTiers(suggested)
  }

  const totalRanked = tiers.A.length + tiers.B.length + tiers.C.length + tiers.D.length

  return (
    <div className="tl-root">
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
        }

        * { box-sizing: border-box; margin: 0; padding: 0; }

        .tl-root {
          min-height: 100vh;
          background: var(--bg);
          font-family: var(--font);
          color: var(--text-1);
          -webkit-font-smoothing: antialiased;
        }

        @keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }

        .tl-nav {
          background: rgba(248,250,248,0.85);
          backdrop-filter: blur(20px) saturate(180%);
          border-bottom: 1px solid var(--border);
          padding: 0 24px;
          display: flex; align-items: center; height: 56px;
          position: sticky; top: 0; z-index: 100;
        }
        .tl-nav-brand { display: flex; align-items: center; gap: 10px; text-decoration: none; }
        .tl-nav-logo {
          width: 28px; height: 28px; background: var(--green);
          border-radius: 7px; display: flex; align-items: center; justify-content: center;
        }
        .tl-nav-title { font-size: 15px; font-weight: 700; color: var(--text-1); letter-spacing: -0.3px; }
        .tl-nav-title span { color: var(--green); }
        .tl-nav-right { margin-left: auto; display: flex; align-items: center; gap: 8px; }
        .tl-nav-link {
          font-family: var(--mono); font-size: 10px; color: var(--text-3);
          text-decoration: none; padding: 5px 12px;
          border: 1px solid var(--border); border-radius: 20px;
          transition: all 0.15s;
        }
        .tl-nav-link:hover { border-color: var(--border-2); }
        .tl-nav-scan {
          font-family: var(--mono); font-size: 10px; color: var(--green-dark);
          text-decoration: none; background: var(--green-light);
          border: 1px solid rgba(22,163,74,0.2); border-radius: 20px; padding: 5px 12px;
          transition: all 0.15s;
        }
        .tl-nav-scan:hover { background: #bbf7d0; }

        .tl-header { display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 24px; flex-wrap: wrap; gap: 12px; }
        .tl-header h1 { font-size: 26px; font-weight: 800; color: var(--text-1); letter-spacing: -1px; margin-bottom: 4px; }
        .tl-header p { font-size: 12px; color: var(--text-4); margin: 0; }
        .tl-header-btns { display: flex; gap: 8px; flex-wrap: wrap; }
        .tl-btn-reset {
          padding: 8px 16px; border-radius: 10px;
          border: 1px solid var(--border); background: var(--bg-2);
          color: var(--text-3); font-size: 12px; font-weight: 600;
          cursor: pointer; font-family: var(--font);
          transition: all 0.15s;
        }
        .tl-btn-reset:hover { border-color: var(--border-2); }
        .tl-btn-download {
          display: flex; align-items: center; gap: 6px;
          padding: 8px 18px; border-radius: 10px; border: none;
          background: var(--green); color: #fff; font-size: 12px;
          font-weight: 700; cursor: pointer; font-family: var(--font);
          transition: all 0.15s;
        }
        .tl-btn-download:hover { background: #15803d; }
        .tl-btn-download:disabled { background: var(--bg-3); color: var(--text-4); cursor: not-allowed; }

        .tl-tier-row {
          display: flex; gap: 0; border-radius: 14px;
          overflow: hidden; margin-bottom: 8px;
          transition: border-color 0.15s;
        }
        .tl-tier-label {
          width: 64px; flex-shrink: 0;
          display: flex; flex-direction: column;
          align-items: center; justify-content: center;
          padding: 12px 6px; gap: 2px;
        }
        .tl-tier-letter { font-size: 30px; font-weight: 900; color: #fff; line-height: 1; }
        .tl-tier-sub { font-family: var(--mono); font-size: 8px; color: rgba(255,255,255,0.7); text-align: center; }
        .tl-drop-zone {
          flex: 1; background: var(--bg-2); padding: 10px;
          display: flex; flex-wrap: wrap; gap: 8px;
          min-height: 90px; align-content: flex-start;
          transition: background 0.15s;
        }
        .tl-drop-empty {
          display: flex; align-items: center; justify-content: center;
          width: 100%; color: var(--text-4); font-size: 12px; font-style: italic; height: 70px;
        }

        .tl-proj-card {
          border-radius: 12px; padding: 8px 10px;
          display: flex; align-items: center; gap: 8px;
          cursor: grab; transition: all 0.15s;
          animation: fadeIn 0.2s ease; position: relative;
        }
        .tl-proj-card:hover { transform: translateY(-2px); }
        .tl-proj-card:active { cursor: grabbing; }
        .tl-proj-name {
          font-size: 12px; font-weight: 700; color: var(--text-1);
          white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 110px;
        }
        .tl-proj-cat { font-family: var(--mono); font-size: 9px; }
        .tl-proj-ticker { font-family: var(--mono); font-size: 9px; color: var(--green); }
        .tl-proj-score { font-size: 16px; font-weight: 800; }
        .tl-proj-remove {
          background: none; border: none; color: var(--text-4);
          font-size: 14px; cursor: pointer; padding: 0; line-height: 1;
          transition: color 0.15s;
        }
        .tl-proj-remove:hover { color: var(--text-2); }

        .tl-unranked-header {
          font-size: 13px; font-weight: 700; color: var(--text-3);
          margin-bottom: 10px; display: flex; align-items: center; gap: 8px;
        }
        .tl-unranked-count {
          font-family: var(--mono); font-size: 10px;
          background: var(--bg-3); padding: 2px 8px; border-radius: 20px; color: var(--text-4);
        }
        .tl-unranked-pool {
          display: flex; flex-wrap: wrap; gap: 8px;
          background: var(--bg-2); border-radius: 14px; padding: 12px;
          min-height: 80px; transition: border-color 0.15s;
        }
        .tl-unranked-card {
          background: var(--bg-3); border: 1px solid var(--border);
          border-radius: 10px; padding: 7px 10px;
          display: flex; align-items: center; gap: 8px;
          cursor: grab; transition: all 0.15s;
        }
        .tl-unranked-card:hover { transform: translateY(-1px); }
        .tl-unranked-card:active { cursor: grabbing; }
        .tl-unranked-name {
          font-size: 12px; font-weight: 700; color: var(--text-1);
          max-width: 100px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
        }
        .tl-unranked-pts { font-family: var(--mono); font-size: 9px; color: var(--text-4); }
        .tl-quick-btns { display: flex; gap: 3px; margin-left: 4px; }
        .tl-quick-btn {
          width: 20px; height: 20px; border-radius: 4px; border: none;
          color: #fff; font-size: 9px; font-weight: 700; cursor: pointer; padding: 0;
          transition: all 0.1s;
        }
        .tl-quick-btn:hover { transform: scale(1.1); }

        @media (max-width: 640px) {
          .tl-header { flex-direction: column; }
          .tl-drop-zone { flex-direction: column; }
        }
      `}</style>

      {/* Nav */}
      <div className="tl-nav">
        <a href="/" className="tl-nav-brand">
          <div className="tl-nav-logo">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04a1 1 0 000-1.41l-2.34-2.34a1 1 0 00-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z" fill="#fff" /></svg>
          </div>
          <span className="tl-nav-title">CMV <span>Alpha</span></span>
        </a>
        <div className="tl-nav-right">
          <a href="/feed" className="tl-nav-link">Feed</a>
          <a href="/" className="tl-nav-scan">Scan</a>
        </div>
      </div>

      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '28px 16px 80px' }}>

        <div className="tl-header">
          <div>
            <h1>My Crypto Tier List</h1>
            <p>Drag projects between tiers · {totalRanked} ranked · {tiers.unranked?.length || 0} unranked</p>
          </div>
          <div className="tl-header-btns">
            <button onClick={resetTiers} className="tl-btn-reset">Reset</button>
            <button onClick={downloadTierList} disabled={downloading} className="tl-btn-download">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3"/></svg>
              {downloading ? 'Generating...' : 'Download'}
            </button>
          </div>
        </div>

        {loading && (
          <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-4)' }}>
            <div style={{ fontSize: 24, marginBottom: 8 }}>⏳</div>
            <div style={{ fontSize: 13 }}>Loading projects from feed...</div>
          </div>
        )}

        {!loading && (
          <>
            {['A','B','C','D'].map(tier => {
              const t = TIER_CONFIG[tier]
              const projects = (tiers[tier] || []).map(h => getScan(h)).filter(Boolean)
              return (
                <div key={tier} onDragOver={e => onDragOver(e, tier)} onDrop={e => onDrop(e, tier)}
                  className="tl-tier-row"
                  style={{ border: `2px solid ${dragOver === tier ? t.color : t.border}` }}>
                  <div className="tl-tier-label" style={{ background: t.color }}>
                    <span className="tl-tier-letter">{tier}</span>
                    <span className="tl-tier-sub">{t.sub.split(' ').slice(0, 2).join(' ')}</span>
                  </div>
                  <div className="tl-drop-zone" style={{ background: dragOver === tier ? t.bg : 'var(--bg-2)' }}>
                    {projects.length === 0 && (
                      <div className="tl-drop-empty">drag projects here</div>
                    )}
                    {projects.map((scan: any) => (
                      <div key={scan.handle} className="tl-proj-card"
                        draggable onDragStart={() => onDragStart(scan.handle)} onDragEnd={onDragEnd}
                        style={{ background: t.bg, border: `1.5px solid ${t.border}`, opacity: dragItem === scan.handle ? 0.4 : 1 }}>
                        <Logo scan={scan} size={38} />
                        <div style={{ minWidth: 0 }}>
                          <div className="tl-proj-name">{scan.project_name || scan.handle}</div>
                          <div className="tl-proj-cat" style={{ color: t.tc }}>{scan.category || 'Crypto'}</div>
                          {scan.ticker && scan.token_price && scan.token_price !== 'Not Launched' && (
                            <div className="tl-proj-ticker">{scan.ticker} {scan.token_price}</div>
                          )}
                        </div>
                        <div style={{ textAlign: 'right', flexShrink: 0 }}>
                          <div className="tl-proj-score" style={{ color: t.color }}>{scan.score}</div>
                          <button onClick={() => removeFromTier(scan.handle)} className="tl-proj-remove" title="Move to unranked">×</button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}

            {(tiers.unranked || []).length > 0 && (
              <div style={{ marginTop: 20 }}>
                <div className="tl-unranked-header">
                  <span>Unranked projects</span>
                  <span className="tl-unranked-count">{tiers.unranked.length}</span>
                  <span style={{ fontSize: 11, color: 'var(--text-4)', fontWeight: 400 }}>— drag into a tier above</span>
                </div>
                <div onDragOver={e => onDragOver(e, 'unranked')} onDrop={e => onDrop(e, 'unranked')}
                  className="tl-unranked-pool"
                  style={{ border: `1.5px dashed ${dragOver === 'unranked' ? 'var(--green)' : 'var(--border)'}` }}>
                  {(tiers.unranked || []).map(handle => {
                    const scan = getScan(handle)
                    if (!scan) return null
                    return (
                      <div key={handle} className="tl-unranked-card"
                        draggable onDragStart={() => onDragStart(handle)} onDragEnd={onDragEnd}
                        style={{ opacity: dragItem === handle ? 0.4 : 1 }}>
                        <Logo scan={scan} size={32} />
                        <div>
                          <div className="tl-unranked-name">{scan.project_name || scan.handle}</div>
                          <div className="tl-unranked-pts">{scan.score} pts</div>
                        </div>
                        <div className="tl-quick-btns">
                          {['A','B','C','D'].map(t => (
                            <button key={t} onClick={() => moveTo(handle, t)} className="tl-quick-btn" style={{ background: TIER_CONFIG[t].color }}>{t}</button>
                          ))}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </>
        )}
      </div>
      <canvas ref={canvasRef} style={{ display: 'none' }} />
    </div>
  )
}
