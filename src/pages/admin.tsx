import { VERDICT_ORDER, verdictStyle, VERDICTS } from '../lib/verdicts'
import { setAdminToken, clearAdminToken } from '../lib/session'
import { useState, useEffect, useRef } from 'react'

// The password lives in the ADMIN_PASSWORD env var and is checked server-side by /api/admin.
// It used to be a constant here, which shipped it in the public JS bundle.

export default function Admin() {
  const [pass, setPass] = useState('')
  const [auth, setAuth] = useState(false)
  const [token, setToken] = useState('')
  const [loginErr, setLoginErr] = useState('')

  // Session-only: the token is never persisted, so closing the tab ends the session.
  async function attemptLogin() {
    setLoginErr('')
    try {
      const r = await fetch('/api/admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'login', password: pass }),
      })
      if (!r.ok) {
        setPass(''); setLoginErr(r.status === 429 ? 'Too many attempts. Wait a minute.' : 'Invalid credentials')
        return
      }
      const { token: t } = await r.json()
      // Shared with the other pages for this tab only — see src/lib/session.ts.
      setAdminToken(t)
      setToken(t); setAuth(true); setPass('')
    } catch {
      setLoginErr('Could not reach the server')
    }
  }
  const [scans, setScans] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [rescanning, setRescanning] = useState(false)
  const [rescanLog, setRescanLog] = useState<string[]>([])
  const [rescanIdx, setRescanIdx] = useState(0)
  const [stats, setStats] = useState<any>(null)

  useEffect(() => { if (auth) loadData() }, [auth])

  async function loadData() {
    setLoading(true)
    try {
      const r = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/rest/v1/scans?select=*&order=scanned_at.desc&limit=200`, {
        headers: { 'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY, 'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}` }
      })
      if (r.ok) {
        const data = await r.json()
        setScans(data)
        setStats({
          total: data.length,
          // Counted through the shared vocabulary; these read 0/0/0 before because they
          // matched verdict names the app had stopped emitting.
          byVerdict: Object.fromEntries(
            VERDICT_ORDER.map(v => [v, data.filter((s: any) => verdictStyle(s.verdict).verdict === v).length]),
          ),
          withToken: data.filter((s: any) => s.ticker).length,
          withFlags: data.filter((s: any) => s.red_flag_count > 0).length,
          avgScore: Math.round(data.reduce((s: number, d: any) => s + (d.score || 0), 0) / data.length),
        })
      }
    } catch {}
    setLoading(false)
  }

  function clearAllCache() {
    let cleared = 0
    const keys = Object.keys(localStorage).filter(k => k.startsWith('cmv_scan'))
    keys.forEach(k => { try { localStorage.removeItem(k); cleared++ } catch {} })
    setRescanLog(prev => [`✓ Cleared ${cleared} cached scans from browser`, ...prev.slice(0, 19)])
  }

  async function rescanAll() {
    if (!confirm(`Rescan all ${scans.length} projects? This will use credits and take ~${Math.round(scans.length * 0.5)} minutes.`)) return
    setRescanning(true)
    setRescanLog([])
    setRescanIdx(0)
    for (let i = 0; i < scans.length; i++) {
      const s = scans[i]
      setRescanIdx(i + 1)
      const log = `[${i+1}/${scans.length}] Rescanning @${s.handle}...`
      setRescanLog(prev => [log, ...prev.slice(0, 19)])
      try {
        try { localStorage.removeItem('cmv_scan_v4_' + s.handle); localStorage.removeItem('cmv_scan_v3_' + s.handle); localStorage.removeItem('cmv_scan_v2_' + s.handle); localStorage.removeItem('cmv_scan_' + s.handle) } catch {}
        // nocache=true, or the server's 2h cache returns the OLD result while the log says 'refreshed'.
        await fetch('/api/xproject?handle=' + s.handle + '&nocache=true')
        setRescanLog(prev => [`✓ @${s.handle} — refreshed`, ...prev.slice(0, 19)])
      } catch {
        setRescanLog(prev => [`✗ @${s.handle} — failed`, ...prev.slice(0, 19)])
      }
      if (i < scans.length - 1) await new Promise(r => setTimeout(r, 30000))
    }
    setRescanning(false)
    setRescanLog(prev => ['✅ All done! Reload to see updated data.', ...prev])
    await loadData()
  }

  async function rescanOne(handle: string) {
    // Clears browser cache only — does NOT overwrite Supabase
    // Full Claude rescan happens when user clicks Analyze on main app
    try {
      localStorage.removeItem('cmv_scan_' + handle)
      localStorage.removeItem('cmv_scan_v2_' + handle)
      localStorage.removeItem('cmv_scan_v3_' + handle)
      localStorage.removeItem('cmv_scan_v4_' + handle)
    } catch {}
    setRescanLog(prev => ['↻ Clearing cache for @' + handle + '...', ...prev.slice(0, 19)])
    try {
      // Refresh xproject server cache with nocache=true
      const xr = await fetch('/api/xproject?handle=' + handle + '&nocache=true')
      if (!xr.ok) throw new Error('xproject failed')
      setRescanLog(prev => ['✓ @' + handle + ' ready — go to main app and click Analyze', ...prev.slice(0, 19)])
    } catch {
      setRescanLog(prev => ['✗ @' + handle + ' failed to refresh', ...prev.slice(0, 19)])
    }
  }

  async function deleteProject(handle: string, id: string) {
    if (!confirm(`Delete @${handle} from the feed?`)) return
    try {
      const r = await fetch('/api/admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ action: 'delete', id }),
      })
      if (!r.ok) {
        if (r.status === 401) { setAuth(false); setToken(''); clearAdminToken() }
        setRescanLog(prev => [`✗ Failed to delete @${handle}`, ...prev.slice(0, 19)])
        return
      }
      setScans(prev => prev.filter(s => s.id !== id))
      setRescanLog(prev => [`🗑 @${handle} deleted`, ...prev.slice(0, 19)])
    } catch {
      setRescanLog(prev => [`✗ Failed to delete @${handle}`, ...prev.slice(0, 19)])
    }
  }

  const VERDICT_COLORS: Record<string, string> = Object.fromEntries(
    VERDICT_ORDER.map(v => [v, VERDICTS[v].color]),
  )

  // Fake 404 page — only reveals login on secret key sequence
  const [keySeq, setKeySeq] = useState('')
  const [showLogin, setShowLogin] = useState(false)

  const gateRef = useRef<HTMLDivElement>(null)
  // React does not honour autoFocus on a div (it only writes the attribute for form elements and
  // never calls focus()), so the keyboard gate received no events until the user clicked the page
  // — and in Safari, which does not focus non-form elements on click, it was effectively
  // unopenable. Focus it on mount so the documented 'type cmvadm' ritual works as shipped.
  useEffect(() => { if (!auth) gateRef.current?.focus() }, [auth])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    const next = (keySeq + e.key).slice(-6)
    setKeySeq(next)
    if (next === 'cmvadm') setShowLogin(true)
  }

  if (!auth) return (
    <div ref={gateRef} onKeyDown={handleKeyDown} tabIndex={0} style={{ minHeight: '100vh', background: '#faf7f0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Plus Jakarta Sans',sans-serif", outline: 'none' }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=DM+Mono:wght@400;500&display=swap');`}</style>
      {!showLogin ? (
        // Fake 404
        <div style={{ textAlign: 'center' as const }}>
          <div style={{ fontSize: 96, fontWeight: 900, color: '#e5e7eb', letterSpacing: -4, lineHeight: 1 }}>404</div>
          <div style={{ fontSize: 18, fontWeight: 700, color: '#6b7280', marginBottom: 8 }}>Page not found</div>
          <div style={{ fontSize: 13, color: '#9ca3af', marginBottom: 24 }}>The page you're looking for doesn't exist.</div>
          <a href="/" style={{ padding: '10px 24px', background: '#16a34a', color: '#fff', borderRadius: 20, fontSize: 13, fontWeight: 700, textDecoration: 'none' }}>← Go home</a>
        </div>
      ) : (
        // Real login — only shown after typing 'cmvadm'
        <div style={{ background: '#1e293b', borderRadius: 16, padding: 32, width: 320, border: '1px solid #334155' }}>
          <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 11, color: '#64748b', letterSpacing: 2, marginBottom: 8 }}>CMV ALPHASCANNER</div>
          <div style={{ fontSize: 20, fontWeight: 800, color: '#f1f5f9', marginBottom: 4 }}>Admin Access</div>
          <div style={{ fontSize: 12, color: '#64748b', marginBottom: 24 }}>Enter your password</div>
          <input type="password" placeholder="Password" value={pass} onChange={e => setPass(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') attemptLogin() }}
            autoFocus
            style={{ width: '100%', background: '#0f172a', border: '1px solid #334155', borderRadius: 8, padding: '12px 14px', fontSize: 14, color: '#f1f5f9', fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' as const, marginBottom: 12 }} />
          <button onClick={attemptLogin}
            style={{ width: '100%', background: '#16a34a', border: 'none', borderRadius: 8, padding: '12px', fontSize: 14, fontWeight: 700, color: '#fff', cursor: 'pointer', fontFamily: 'inherit' }}>
            Enter
          </button>
          {loginErr && <div style={{ fontSize: 11, color: '#ef4444', marginTop: 10 }}>{loginErr}</div>}
        </div>
      )}
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: '#0f172a', fontFamily: "'Plus Jakarta Sans',sans-serif", color: '#f1f5f9' }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=DM+Mono:wght@400;500&display=swap');`}</style>

      {/* Nav */}
      <div style={{ background: '#1e293b', borderBottom: '1px solid #334155', padding: '0 24px', display: 'flex', alignItems: 'center', height: 56, gap: 10 }}>
        <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 11, color: '#16a34a', letterSpacing: 2 }}>CMV ADMIN</div>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
          <a href="/" style={{ fontFamily: "'DM Mono',monospace", fontSize: 10, color: '#64748b', textDecoration: 'none', padding: '5px 12px', border: '1px solid #334155', borderRadius: 20 }}>← App</a>
          <a href="/feed" style={{ fontFamily: "'DM Mono',monospace", fontSize: 10, color: '#64748b', textDecoration: 'none', padding: '5px 12px', border: '1px solid #334155', borderRadius: 20 }}>Feed</a>
          <button onClick={() => { setAuth(false); setToken(''); clearAdminToken() }} style={{ fontFamily: "'DM Mono',monospace", fontSize: 10, color: '#ef4444', background: 'none', border: '1px solid #334155', borderRadius: 20, padding: '5px 12px', cursor: 'pointer' }}>Logout</button>
        </div>
      </div>

      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '28px 16px 60px' }}>

        {/* Stats */}
        {stats && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(130px,1fr))', gap: 10, marginBottom: 24 }}>
            {[
              { label: 'Total Scans', value: stats.total, color: '#94a3b8' },
              ...VERDICT_ORDER.map(v => ({ label: v, value: stats.byVerdict?.[v] ?? 0, color: VERDICTS[v].color })),
              { label: 'With Token', value: stats.withToken, color: '#3b5bdb' },
              { label: 'With Flags', value: stats.withFlags, color: '#e03131' },
              { label: 'Avg Score', value: stats.avgScore, color: '#16a34a' },
            ].map(s => (
              <div key={s.label} style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 10, padding: '12px 14px' }}>
                <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 9, color: '#64748b', marginBottom: 4 }}>{s.label.toUpperCase()}</div>
                <div style={{ fontSize: 24, fontWeight: 800, color: s.color }}>{s.value}</div>
              </div>
            ))}
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 16 }}>

          {/* Projects table */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <div style={{ fontSize: 14, fontWeight: 700 }}>All Projects ({scans.length})</div>
              <button onClick={rescanAll} disabled={rescanning}
                style={{ padding: '8px 16px', borderRadius: 8, border: 'none', background: rescanning ? '#334155' : '#16a34a', color: rescanning ? '#64748b' : '#fff', fontSize: 12, fontWeight: 700, cursor: rescanning ? 'not-allowed' : 'pointer', fontFamily: 'inherit' }}>
                {rescanning ? `Rescanning ${rescanIdx}/${scans.length}...` : '↻ Rescan All'}
              </button>
            </div>

            {rescanning && (
              <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 8, padding: '8px 12px', marginBottom: 12 }}>
                <div style={{ height: 4, background: '#334155', borderRadius: 4, overflow: 'hidden', marginBottom: 6 }}>
                  <div style={{ height: '100%', background: '#16a34a', borderRadius: 4, width: `${Math.round((rescanIdx / scans.length) * 100)}%`, transition: 'width 0.5s' }} />
                </div>
                <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 10, color: '#64748b' }}>{rescanIdx}/{scans.length} projects · ~30s between each</div>
              </div>
            )}

            <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 12, overflow: 'hidden' }}>
              {loading ? (
                <div style={{ padding: 32, textAlign: 'center' as const, color: '#64748b', fontSize: 13 }}>Loading...</div>
              ) : scans.map((s: any, i: number) => (
                <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderBottom: i < scans.length - 1 ? '1px solid #1e293b' : 'none', background: i % 2 === 0 ? '#1e293b' : '#172033' }}>
                  {s.profile_image_url
                    ? <img src={s.profile_image_url} alt="" style={{ width: 32, height: 32, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} onError={e => { (e.target as HTMLImageElement).style.display='none' }} />
                    : <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#334155', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, color: '#94a3b8', flexShrink: 0 }}>{(s.project_name||s.handle||'?').charAt(0).toUpperCase()}</div>}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: '#f1f5f9', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const }}>{s.project_name || s.handle}</div>
                    <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 9, color: '#64748b' }}>@{s.handle} · {s.category || 'Crypto'}{s.ticker ? ` · ${s.ticker}` : ''}</div>
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: VERDICT_COLORS[s.verdict] || '#94a3b8', flexShrink: 0 }}>{s.score}</div>
                  <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 9, color: VERDICT_COLORS[s.verdict] || '#94a3b8', flexShrink: 0, minWidth: 60, textAlign: 'right' as const }}>{s.verdict}</div>
                  {s.red_flag_count > 0 && <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 9, color: '#ef4444', flexShrink: 0 }}>🚨{s.red_flag_count}</div>}
                  <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                    <button onClick={() => rescanOne(s.handle)} style={{ padding: '3px 8px', borderRadius: 6, border: '1px solid #334155', background: 'none', color: '#94a3b8', fontSize: 10, cursor: 'pointer', fontFamily: 'inherit' }}>↻</button>
                    <button onClick={() => deleteProject(s.handle, s.id)} style={{ padding: '3px 8px', borderRadius: 6, border: '1px solid #334155', background: 'none', color: '#ef4444', fontSize: 10, cursor: 'pointer', fontFamily: 'inherit' }}>✕</button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right panel — logs + data sources */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

            {/* Activity log */}
            <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 12, padding: 14 }}>
              <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 10, color: '#64748b', letterSpacing: 1, marginBottom: 10 }}>ACTIVITY LOG</div>
              {rescanLog.length === 0
                ? <div style={{ fontSize: 12, color: '#475569', fontStyle: 'italic' }}>No activity yet</div>
                : rescanLog.map((log, i) => <div key={i} style={{ fontFamily: "'DM Mono',monospace", fontSize: 10, color: log.startsWith('✓') ? '#16a34a' : log.startsWith('✗') ? '#ef4444' : log.startsWith('✅') ? '#16a34a' : '#94a3b8', marginBottom: 4 }}>{log}</div>)}
            </div>

            {/* Data sources */}
            <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 12, padding: 14 }}>
              <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 10, color: '#64748b', letterSpacing: 1, marginBottom: 12 }}>DATA SOURCES</div>
              {[
                { name: 'X API (twitterapi.io)', status: 'live', detail: 'Followers, bio, tweets, pinned' },
                { name: 'DefiLlama', status: 'live', detail: 'TVL, revenue, fees, hacks DB' },
                { name: 'RootData', status: 'live', detail: 'VC names, funding rounds, team' },
                { name: 'DexScreener', status: 'live', detail: 'Token price, volume, dump detection' },
                { name: 'GeckoTerminal', status: 'live', detail: 'Token fallback across DEXes' },
                { name: 'CryptoNews', status: 'live', detail: 'News sentiment, red flag headlines' },
                { name: 'CoinGecko', status: 'live', detail: 'Token price fallback' },
                { name: 'Anthropic Claude', status: 'live', detail: 'AI analysis, scoring, verdicts' },
                { name: 'Supabase', status: 'live', detail: 'Community feed database' },
              ].map(src => (
                <div key={src.name} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 10 }}>
                  <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#16a34a', marginTop: 4, flexShrink: 0 }} />
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 600, color: '#f1f5f9' }}>{src.name}</div>
                    <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 9, color: '#64748b' }}>{src.detail}</div>
                  </div>
                </div>
              ))}
            </div>

            {/* Quick actions */}
            <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 12, padding: 14 }}>
              <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 10, color: '#64748b', letterSpacing: 1, marginBottom: 10 }}>QUICK ACTIONS</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <button onClick={clearAllCache} style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #ef4444', background: 'none', color: '#ef4444', fontSize: 12, cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left' as const }}>🗑 Clear All Browser Cache</button>
                <button onClick={loadData} style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #334155', background: 'none', color: '#94a3b8', fontSize: 12, cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left' as const }}>↺ Refresh data</button>
                <a href="/tierlist" style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #334155', background: 'none', color: '#94a3b8', fontSize: 12, textDecoration: 'none', display: 'block' }}>📊 Tier List</a>
                <a href="/feed" style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #334155', background: 'none', color: '#94a3b8', fontSize: 12, textDecoration: 'none', display: 'block' }}>🌐 Public Feed</a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
