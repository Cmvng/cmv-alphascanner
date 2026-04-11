import { useState, useEffect, useRef } from 'react'

const TIER_CONFIG: Record<string, any> = {
  A: { color: '#37b24d', bg: '#ebfbee', border: '#8ce99a', tc: '#2f9e44', label: 'Tier A', sub: 'Farm It', emoji: '🌾' },
  B: { color: '#f59f00', bg: '#fff3bf', border: '#ffe066', tc: '#e67700', label: 'Tier B', sub: 'Create Content', emoji: '✍️' },
  C: { color: '#e8590c', bg: '#fff4e6', border: '#ffc078', tc: '#d9480f', label: 'Tier C', sub: 'Watch', emoji: '👁️' },
  D: { color: '#868e96', bg: '#f1f3f5', border: '#dee2e6', tc: '#495057', label: 'Tier D', sub: 'Skip', emoji: '🚫' },
}

const STORAGE_KEY = 'cmv_tierlist_v1'

function Logo({ scan, size = 48 }: { scan: any, size?: number }) {
  const [err, setErr] = useState(false)
  const initial = (scan.project_name || scan.handle || '?').charAt(0).toUpperCase()
  if (!err && scan.profile_image_url) {
    return <img src={scan.profile_image_url} alt={scan.project_name} onError={() => setErr(true)}
      style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover', border: '2px solid rgba(255,255,255,0.4)', flexShrink: 0 }} />
  }
  return <div style={{ width: size, height: size, borderRadius: '50%', background: '#e8ecff', color: '#3b5bdb', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: size * 0.4, fontWeight: 700, flexShrink: 0, border: '2px solid #dbe4ff' }}>{initial}</div>
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
        // Add any new scans to unranked
        const allRanked = Object.values(savedTiers).flat() as string[]
        const newScans = scans.filter(s => !allRanked.includes(s.handle)).map(s => s.handle)
        setTiers({ ...savedTiers, unranked: [...(savedTiers.unranked || []), ...newScans] })
        return
      } catch {}
    }
    // First time — sort by score into suggested tiers
    const suggested: Record<string, string[]> = { A: [], B: [], C: [], D: [], unranked: [] }
    scans.forEach(s => {
      if (s.verdict === 'FARM IT') suggested.A.push(s.handle)
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
    const W = 1200, HEADER = 80, TIER_H = 140, PADDING = 20
    const activeTiers = ['A', 'B', 'C', 'D'].filter(t => tiers[t]?.length > 0)
    const H = HEADER + activeTiers.length * (TIER_H + PADDING) + PADDING * 2
    canvas.width = W; canvas.height = H
    const ctx = canvas.getContext('2d')!

    // Background
    ctx.fillStyle = '#faf7f0'
    ctx.fillRect(0, 0, W, H)

    // Header
    ctx.fillStyle = '#14532d'
    ctx.font = 'bold 32px Arial, sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText('CMV AlphaScanner — My Crypto Tier List', W / 2, 52)
    ctx.font = '16px monospace'
    ctx.fillStyle = '#9ca3af'
    ctx.fillText(`cmv-alphascanner.vercel.app · ${new Date().toLocaleDateString()}`, W / 2, 72)

    let yOffset = HEADER + PADDING

    for (const tier of activeTiers) {
      const t = TIER_CONFIG[tier]
      const projects = tiers[tier].map(h => getScan(h)).filter(Boolean)
      const rowH = TIER_H

      // Tier label box
      ctx.fillStyle = t.color
      ctx.beginPath()
      ctx.roundRect(PADDING, yOffset, 70, rowH, 12)
      ctx.fill()
      ctx.fillStyle = '#fff'
      ctx.font = 'bold 42px Arial, sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText(tier, PADDING + 35, yOffset + 50)
      ctx.font = '14px Arial'
      ctx.fillText(t.emoji, PADDING + 35, yOffset + 75)

      // Projects area
      ctx.fillStyle = '#fff'
      ctx.beginPath()
      ctx.roundRect(PADDING + 80, yOffset, W - PADDING * 2 - 80, rowH, 12)
      ctx.fill()
      ctx.strokeStyle = t.border
      ctx.lineWidth = 2
      ctx.stroke()

      // Draw project cards
      const cardW = 160, cardH = 110, cardPad = 12
      let xPos = PADDING + 80 + cardPad

      for (const scan of projects.slice(0, 6)) {
        if (xPos + cardW > W - PADDING) break

        // Try to draw logo
        if (scan.profile_image_url) {
          try {
            const img = new Image()
            img.crossOrigin = 'anonymous'
            await new Promise<void>(resolve => {
              img.onload = () => {
                ctx.save()
                ctx.beginPath()
                ctx.arc(xPos + 28, yOffset + 32, 24, 0, Math.PI * 2)
                ctx.clip()
                ctx.drawImage(img, xPos + 4, yOffset + 8, 48, 48)
                ctx.restore()
                // Circle border
                ctx.strokeStyle = t.border
                ctx.lineWidth = 2
                ctx.beginPath()
                ctx.arc(xPos + 28, yOffset + 32, 24, 0, Math.PI * 2)
                ctx.stroke()
                resolve()
              }
              img.onerror = () => {
                // Fallback initial
                ctx.fillStyle = t.bg
                ctx.beginPath()
                ctx.arc(xPos + 28, yOffset + 32, 24, 0, Math.PI * 2)
                ctx.fill()
                ctx.fillStyle = t.tc
                ctx.font = 'bold 20px Arial'
                ctx.textAlign = 'center'
                ctx.fillText((scan.project_name || '?').charAt(0), xPos + 28, yOffset + 40)
                resolve()
              }
              img.src = scan.profile_image_url
            })
          } catch {}
        } else {
          ctx.fillStyle = t.bg
          ctx.beginPath()
          ctx.arc(xPos + 28, yOffset + 32, 24, 0, Math.PI * 2)
          ctx.fill()
          ctx.fillStyle = t.tc
          ctx.font = 'bold 20px Arial'
          ctx.textAlign = 'center'
          ctx.fillText((scan.project_name || '?').charAt(0), xPos + 28, yOffset + 40)
        }

        // Project name
        ctx.fillStyle = '#1c2b5a'
        ctx.font = 'bold 13px Arial'
        ctx.textAlign = 'center'
        let name = scan.project_name || scan.handle
        if (name.length > 12) name = name.slice(0, 11) + '…'
        ctx.fillText(name, xPos + 28, yOffset + 72)

        // Score
        ctx.fillStyle = t.color
        ctx.font = 'bold 12px monospace'
        ctx.fillText(String(scan.score), xPos + 28, yOffset + 90)

        // Token price if live
        if (scan.ticker && scan.token_price && scan.token_price !== 'Not Launched') {
          ctx.fillStyle = '#9ca3af'
          ctx.font = '10px monospace'
          ctx.fillText(scan.ticker, xPos + 28, yOffset + 105)
        }

        xPos += cardW - 40
      }

      // Show +N more if truncated
      const remaining = projects.length - 6
      if (remaining > 0) {
        ctx.fillStyle = '#9ca3af'
        ctx.font = '14px Arial'
        ctx.textAlign = 'center'
        ctx.fillText(`+${remaining} more`, W - PADDING - 60, yOffset + rowH / 2 + 6)
      }

      yOffset += rowH + PADDING
    }

    // Footer
    ctx.fillStyle = '#9ca3af'
    ctx.font = '13px monospace'
    ctx.textAlign = 'center'
    ctx.fillText('CMV ALPHASCANNER · cmv-alphascanner.vercel.app', W / 2, H - 14)

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
      if (s.verdict === 'FARM IT') suggested.A.push(s.handle)
      else if (s.verdict === 'CREATE CONTENT') suggested.B.push(s.handle)
      else if (s.verdict === 'WATCH') suggested.C.push(s.handle)
      else suggested.D.push(s.handle)
    })
    setTiers(suggested)
  }

  const totalRanked = tiers.A.length + tiers.B.length + tiers.C.length + tiers.D.length

  return (
    <div style={{ minHeight: '100vh', background: '#faf7f0', fontFamily: "'Plus Jakarta Sans',sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=DM+Mono:wght@400;500&display=swap');
        @keyframes fadeIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
        .proj-card{transition:all 0.15s;cursor:grab;}
        .proj-card:hover{transform:translateY(-2px);}
        .proj-card:active{cursor:grabbing;}
        .tier-drop{transition:background 0.15s;}
      `}</style>

      {/* Nav */}
      <div style={{ background: '#fff', borderBottom: '1px solid #d4e8d0', padding: '0 24px', display: 'flex', alignItems: 'center', height: 58, gap: 10, position: 'sticky', top: 0, zIndex: 100 }}>
        <a href="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 34, height: 34, background: 'linear-gradient(135deg,#166534,#16a34a)', borderRadius: 9, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04a1 1 0 000-1.41l-2.34-2.34a1 1 0 00-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z" fill="#fff" /></svg>
          </div>
          <span style={{ fontSize: 16, fontWeight: 800, color: '#1c2b5a' }}>CMV <span style={{ color: '#16a34a' }}>AlphaScanner</span></span>
        </a>
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
          <a href="/feed" style={{ fontFamily: "'DM Mono',monospace", fontSize: 10, color: '#6b7280', textDecoration: 'none', padding: '5px 12px', border: '1px solid #e5e7eb', borderRadius: 20 }}>Feed</a>
          <a href="/" style={{ fontFamily: "'DM Mono',monospace", fontSize: 10, color: '#15803d', textDecoration: 'none', background: '#f0fdf4', border: '1px solid #86efac', borderRadius: 20, padding: '5px 12px' }}>← Scan</a>
        </div>
      </div>

      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '28px 16px 80px' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap' as const, gap: 12 }}>
          <div>
            <h1 style={{ fontSize: 26, fontWeight: 900, color: '#14532d', letterSpacing: -1, marginBottom: 4 }}>My Crypto Tier List</h1>
            <p style={{ fontSize: 12, color: '#6b7280', margin: 0 }}>Drag projects between tiers · {totalRanked} ranked · {tiers.unranked?.length || 0} unranked</p>
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' as const }}>
            <button onClick={resetTiers} style={{ padding: '8px 16px', borderRadius: 10, border: '1px solid #e5e7eb', background: '#fff', color: '#6b7280', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>↺ Reset</button>
            <button onClick={downloadTierList} disabled={downloading} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 18px', borderRadius: 10, border: 'none', background: downloading ? '#e2e8f0' : 'linear-gradient(135deg,#166534,#16a34a)', color: downloading ? '#9ca3af' : '#fff', fontSize: 12, fontWeight: 700, cursor: downloading ? 'not-allowed' : 'pointer', fontFamily: 'inherit' }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3"/></svg>
              {downloading ? 'Generating...' : 'Download'}
            </button>
          </div>
        </div>



        {loading && (
          <div style={{ textAlign: 'center' as const, padding: 40, color: '#9ca3af' }}>
            <div style={{ fontSize: 24, marginBottom: 8 }}>⏳</div>
            <div style={{ fontSize: 13 }}>Loading projects from feed...</div>
          </div>
        )}

        {!loading && (
          <>
            {/* Tier rows */}
            {['A','B','C','D'].map(tier => {
              const t = TIER_CONFIG[tier]
              const projects = (tiers[tier] || []).map(h => getScan(h)).filter(Boolean)
              return (
                <div key={tier} onDragOver={e => onDragOver(e, tier)} onDrop={e => onDrop(e, tier)}
                  style={{ display: 'flex', gap: 0, borderRadius: 14, overflow: 'hidden', border: `2px solid ${dragOver === tier ? t.color : t.border}`, marginBottom: 8, transition: 'border-color 0.15s' }}>
                  {/* Tier label */}
                  <div style={{ background: t.color, width: 72, flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '12px 6px', gap: 2 }}>
                    <span style={{ fontSize: 32, fontWeight: 900, color: '#fff', lineHeight: 1 }}>{tier}</span>
                    <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.8)', textAlign: 'center', lineHeight: 1.3, fontFamily: "'DM Mono',monospace" }}>{t.emoji}</span>
                  </div>
                  {/* Drop zone */}
                  <div className="tier-drop" style={{ flex: 1, background: dragOver === tier ? t.bg : '#fff', padding: 10, display: 'flex', flexWrap: 'wrap' as const, gap: 8, minHeight: 90, alignContent: 'flex-start' }}>
                    {projects.length === 0 && (
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', color: '#d1d5db', fontSize: 12, fontStyle: 'italic', height: 70 }}>
                        drag projects here
                      </div>
                    )}
                    {projects.map((scan: any) => (
                      <div key={scan.handle} className="proj-card"
                        draggable onDragStart={() => onDragStart(scan.handle)} onDragEnd={onDragEnd}
                        style={{ background: t.bg, border: `1.5px solid ${t.border}`, borderRadius: 12, padding: '8px 10px', display: 'flex', alignItems: 'center', gap: 8, opacity: dragItem === scan.handle ? 0.4 : 1, animation: 'fadeIn 0.2s ease', position: 'relative' as const }}>
                        <Logo scan={scan} size={40} />
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontSize: 12, fontWeight: 700, color: '#1c2b5a', whiteSpace: 'nowrap' as const, overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 110 }}>{scan.project_name || scan.handle}</div>
                          <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 9, color: t.tc }}>{scan.category || 'Crypto'}</div>
                          {scan.ticker && scan.token_price && scan.token_price !== 'Not Launched' && (
                            <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 9, color: '#16a34a' }}>{scan.ticker} {scan.token_price}</div>
                          )}
                        </div>
                        <div style={{ textAlign: 'right' as const, flexShrink: 0 }}>
                          <div style={{ fontSize: 16, fontWeight: 800, color: t.color }}>{scan.score}</div>
                          {/* Remove button */}
                          <button onClick={() => removeFromTier(scan.handle)} style={{ background: 'none', border: 'none', color: '#d1d5db', fontSize: 14, cursor: 'pointer', padding: 0, lineHeight: 1 }} title="Move to unranked">×</button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}

            {/* Unranked pool */}
            {(tiers.unranked || []).length > 0 && (
              <div style={{ marginTop: 20 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#6b7280', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span>Unranked projects</span>
                  <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 10, background: '#f1f3f5', padding: '2px 8px', borderRadius: 20, color: '#868e96' }}>{tiers.unranked.length}</span>
                  <span style={{ fontSize: 11, color: '#9ca3af', fontWeight: 400 }}>— drag into a tier above</span>
                </div>
                <div onDragOver={e => onDragOver(e, 'unranked')} onDrop={e => onDrop(e, 'unranked')}
                  style={{ display: 'flex', flexWrap: 'wrap' as const, gap: 8, background: '#fff', border: `1.5px dashed ${dragOver === 'unranked' ? '#3b5bdb' : '#d1d5db'}`, borderRadius: 14, padding: 12, minHeight: 80, transition: 'border-color 0.15s' }}>
                  {(tiers.unranked || []).map(handle => {
                    const scan = getScan(handle)
                    if (!scan) return null
                    return (
                      <div key={handle} className="proj-card"
                        draggable onDragStart={() => onDragStart(handle)} onDragEnd={onDragEnd}
                        style={{ background: '#f8f9ff', border: '1px solid #dbe4ff', borderRadius: 10, padding: '7px 10px', display: 'flex', alignItems: 'center', gap: 8, opacity: dragItem === handle ? 0.4 : 1 }}>
                        <Logo scan={scan} size={34} />
                        <div>
                          <div style={{ fontSize: 12, fontWeight: 700, color: '#1c2b5a', maxWidth: 100, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const }}>{scan.project_name || scan.handle}</div>
                          <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 9, color: '#9ca3af' }}>{scan.score} pts</div>
                        </div>
                        {/* Quick assign buttons */}
                        <div style={{ display: 'flex', gap: 3, marginLeft: 4 }}>
                          {['A','B','C','D'].map(t => (
                            <button key={t} onClick={() => moveTo(handle, t)} style={{ width: 20, height: 20, borderRadius: 4, border: 'none', background: TIER_CONFIG[t].color, color: '#fff', fontSize: 9, fontWeight: 700, cursor: 'pointer', padding: 0 }}>{t}</button>
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
