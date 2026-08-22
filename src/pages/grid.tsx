import { useState, useEffect, useMemo } from 'react'

/* Heat × Alpha — the two-axis view the whole product is built around.

   Discovery answers "is this moving?" Judgement answers "is this worth anything?" Neither
   question is useful alone: a chart that ranked by heat would be a momentum screener, and one
   that ranked by alpha would be the scanner we already had. Plotting both makes the interesting
   cases — high heat with a weak fundamental read, or a strong read nothing has noticed yet —
   visible as positions rather than as numbers you have to hold in your head.

   The honesty rule from the risk engine applies to charts too, and more sharply: a target with
   no alpha score has NOT been judged, and an unjudged target plotted at y=0 is a lie the reader
   cannot detect. Those targets are excluded from the plot and listed separately, with a count,
   so the plot is never quietly a subset. */

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
  risk_level: string | null
  spark: number[]
}

/* Axis dividers. Heat uses the `hot` band boundary from the heat engine; alpha uses the same 60
   that getTier() has always used as the C/B boundary in the scanner. Both are read from one
   place here so the quadrant story cannot drift away from the scores that feed it. */
const HEAT_SPLIT = 65
const ALPHA_SPLIT = 60

/* Quadrant names describe the SHAPE OF THE EVIDENCE, never an action and never a prediction.
   "Crowded" is an observation about attention; "worth a look" would be advice. */
const QUADRANTS = [
  {
    id: 'converging',
    label: 'MOVING + STRONG READ',
    note: 'Attention is accumulating on something that also scores well on fundamentals.',
    corner: 'tr' as const,
    color: '#16a34a',
    tint: 'rgba(22,163,74,.055)',
  },
  {
    id: 'quiet',
    label: 'STRONG READ, QUIET',
    note: 'Scores well, but little is happening onchain right now. Early, stalled, or simply mature.',
    corner: 'tl' as const,
    color: '#0369a1',
    tint: 'rgba(3,105,161,.045)',
  },
  {
    id: 'crowded',
    label: 'MOVING, WEAK READ',
    note: 'Attention without a matching fundamental score. Often the shape of a rotation or a farm.',
    corner: 'br' as const,
    color: '#c2410c',
    tint: 'rgba(194,65,12,.05)',
  },
  {
    id: 'noise',
    label: 'NEITHER',
    note: 'Low on both axes. Present for completeness, not because it is interesting.',
    corner: 'bl' as const,
    color: '#78716c',
    tint: 'rgba(120,113,108,.03)',
  },
]

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

function label(t: Target): string {
  return t.name || t.symbol || t.contract_address?.slice(0, 10) || 'Unknown'
}

function quadrantOf(t: Target): string {
  const hot = t.heat >= HEAT_SPLIT
  const strong = (t.alpha_score ?? 0) >= ALPHA_SPLIT
  if (hot && strong) return 'converging'
  if (!hot && strong) return 'quiet'
  if (hot && !strong) return 'crowded'
  return 'noise'
}

/* Dot area scales with liquidity so a $4M pool does not look identical to a $4K one — but on a
   log scale and clamped, because a linear scale would make one large target erase the rest of
   the plot. Unknown liquidity gets the minimum size and a hollow dot, so "we don't know" never
   renders as "it's small". */
function dotRadius(liq: number | null): number {
  if (liq === null || !Number.isFinite(liq) || liq <= 0) return 4
  const r = 4 + Math.log10(liq) * 1.5
  return Math.max(4, Math.min(13, r))
}

export default function Grid() {
  const [targets, setTargets] = useState<Target[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [chain, setChain] = useState('all')
  const [maxAge, setMaxAge] = useState(168)
  const [selected, setSelected] = useState<Target | null>(null)
  const [generatedAt, setGeneratedAt] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    setSelected(null)
    fetch(`/api/radar?chain=${chain}&maxAgeHours=${maxAge}&limit=100`)
      .then(async (r) => {
        const body = await r.json()
        if (cancelled) return
        if (!r.ok) {
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

  // Judged vs unjudged is the load-bearing split on this page — see the header comment.
  const { plotted, unjudged, counts } = useMemo(() => {
    const plotted = targets.filter((t) => t.alpha_score !== null)
    const unjudged = targets.filter((t) => t.alpha_score === null)
    const counts: Record<string, number> = { converging: 0, quiet: 0, crowded: 0, noise: 0 }
    for (const t of plotted) counts[quadrantOf(t)]++
    return { plotted, unjudged, counts }
  }, [targets])

  return (
    <div className="grid-root">
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
        .grid-root { min-height:100vh; background:var(--bg); font-family:var(--font); color:var(--text-1); -webkit-font-smoothing:antialiased; }

        .nav { background:rgba(248,250,248,.85); backdrop-filter:blur(20px) saturate(180%); border-bottom:1px solid var(--border); padding:0 24px; display:flex; align-items:center; height:56px; position:sticky; top:0; z-index:100; }
        .nav-brand { display:flex; align-items:center; gap:10px; text-decoration:none; }
        .nav-logo { width:28px; height:28px; background:var(--green); border-radius:7px; display:flex; align-items:center; justify-content:center; }
        .nav-title { font-size:15px; font-weight:700; color:var(--text-1); letter-spacing:-.3px; }
        .nav-title span { color:var(--green); }
        .nav-links { margin-left:auto; display:flex; gap:2px; }
        .nav-link { font-family:var(--mono); font-size:11px; color:var(--text-3); text-decoration:none; padding:6px 12px; border-radius:6px; }
        .nav-link:hover { color:var(--text-1); background:var(--bg-3); }
        .nav-link.active { color:var(--green); background:var(--green-light); }

        .wrap { max-width:1060px; margin:0 auto; padding:0 20px 80px; }
        .head { padding:36px 0 16px; }
        .head h1 { font-size:clamp(28px,4.4vw,42px); font-weight:900; letter-spacing:-1.8px; line-height:1.05; margin-bottom:10px; }
        .head h1 span { color:var(--green); }
        .head p { font-size:15px; color:var(--text-3); line-height:1.6; max-width:60ch; }

        .filters { display:flex; gap:16px; flex-wrap:wrap; align-items:center; padding:18px 0; border-bottom:1px solid var(--border); margin-bottom:22px; }
        .filter-group { display:flex; gap:4px; }
        .chip { font-family:var(--mono); font-size:11px; padding:5px 12px; border-radius:20px; border:1px solid var(--border); background:var(--bg-2); color:var(--text-3); cursor:pointer; transition:all .15s; }
        .chip:hover { border-color:var(--border-2); }
        .chip.on { background:var(--green-light); border-color:var(--green); color:#14532d; font-weight:600; }
        .meta { margin-left:auto; font-family:var(--mono); font-size:10px; color:var(--text-4); }

        .board { display:grid; grid-template-columns:1fr 264px; gap:20px; align-items:start; }

        .plot-shell { background:var(--bg-2); border:1px solid var(--border); border-radius:var(--radius); padding:16px 16px 12px 16px; }
        .plot-frame { display:grid; grid-template-columns:30px 1fr; grid-template-rows:1fr 26px; }
        .y-axis { grid-column:1; grid-row:1; position:relative; }
        .y-label { position:absolute; left:50%; top:50%; transform:translate(-50%,-50%) rotate(-90deg); white-space:nowrap; font-family:var(--mono); font-size:9px; letter-spacing:1.2px; color:var(--text-4); }
        .x-axis { grid-column:2; grid-row:2; text-align:center; font-family:var(--mono); font-size:9px; letter-spacing:1.2px; color:var(--text-4); padding-top:8px; }

        .plot { grid-column:2; grid-row:1; position:relative; aspect-ratio:1/.78; min-height:330px; border:1px solid var(--border); border-radius:8px; overflow:hidden; background:var(--bg-2); }
        .quad { position:absolute; }
        .quad-tr { right:0; top:0; }
        .quad-tl { left:0; top:0; }
        .quad-br { right:0; bottom:0; }
        .quad-bl { left:0; bottom:0; }
        .quad-tag { position:absolute; font-family:var(--mono); font-size:8px; font-weight:700; letter-spacing:.9px; padding:3px 6px; opacity:.7; pointer-events:none; }

        .divider-v, .divider-h { position:absolute; background:var(--border-2); pointer-events:none; }
        .divider-v { top:0; bottom:0; width:1px; }
        .divider-h { left:0; right:0; height:1px; }

        .dot { position:absolute; transform:translate(-50%,50%); border-radius:50%; cursor:pointer; border:2px solid var(--bg-2); transition:transform .12s; padding:0; }
        .dot:hover, .dot.sel { transform:translate(-50%,50%) scale(1.35); z-index:20; }
        .dot.unknown-liq { background:var(--bg-2) !important; }
        .dot.risky { box-shadow:0 0 0 2px #dc2626; }

        .tick { position:absolute; font-family:var(--mono); font-size:8px; color:var(--text-4); pointer-events:none; }

        .legend { display:flex; gap:14px; flex-wrap:wrap; padding-top:12px; margin-top:10px; border-top:1px solid var(--border); font-family:var(--mono); font-size:9px; color:var(--text-4); }
        .legend b { color:var(--text-3); font-weight:600; }

        .side-card { background:var(--bg-2); border:1px solid var(--border); border-radius:var(--radius); padding:14px 16px; margin-bottom:12px; }
        .side-h { font-family:var(--mono); font-size:9px; letter-spacing:1.2px; color:var(--text-4); margin-bottom:10px; }
        .q-row { display:flex; align-items:baseline; gap:8px; padding:7px 0; border-bottom:1px solid var(--bg-3); }
        .q-row:last-child { border-bottom:none; }
        .q-swatch { width:8px; height:8px; border-radius:2px; flex-shrink:0; }
        .q-name { font-family:var(--mono); font-size:9px; font-weight:700; letter-spacing:.5px; }
        .q-n { margin-left:auto; font-family:var(--mono); font-size:13px; font-weight:700; }
        .q-note { font-size:11px; color:var(--text-3); line-height:1.5; margin-top:3px; }

        .sel-name { font-size:15px; font-weight:800; letter-spacing:-.3px; margin-bottom:2px; }
        .sel-sub { font-family:var(--mono); font-size:9px; color:var(--text-4); margin-bottom:10px; }
        .sel-scores { display:flex; gap:8px; margin-bottom:10px; }
        .sel-score { flex:1; background:var(--bg-3); border-radius:8px; padding:8px 10px; }
        .sel-score-n { font-family:var(--mono); font-size:19px; font-weight:700; line-height:1; }
        .sel-score-l { font-family:var(--mono); font-size:8px; letter-spacing:.8px; color:var(--text-4); margin-top:4px; }
        .sel-why { font-size:12px; color:var(--text-3); line-height:1.55; margin-bottom:10px; }
        .sel-stats { font-family:var(--mono); font-size:10px; color:var(--text-4); line-height:1.9; margin-bottom:12px; }
        .sel-stats b { color:var(--text-2); font-weight:600; }
        .sel-link { display:block; text-align:center; font-family:var(--mono); font-size:10px; text-decoration:none; background:var(--text-1); color:#fff; padding:8px; border-radius:8px; }
        .empty-sel { font-size:12px; color:var(--text-4); line-height:1.6; }

        .unjudged { margin-top:20px; background:var(--bg-2); border:1px solid var(--border); border-radius:var(--radius); padding:16px; }
        .unjudged-h { font-size:13px; font-weight:700; margin-bottom:4px; }
        .unjudged-p { font-size:12px; color:var(--text-3); line-height:1.6; margin-bottom:12px; max-width:66ch; }
        .u-list { display:flex; flex-wrap:wrap; gap:6px; }
        .u-item { text-decoration:none; font-family:var(--mono); font-size:10px; padding:4px 9px; border-radius:20px; border:1px solid var(--border); background:var(--bg-3); color:var(--text-3); }
        .u-item:hover { border-color:var(--green); color:var(--text-1); }
        .u-item b { color:var(--text-1); font-weight:600; }

        .state { text-align:center; padding:60px 20px; }
        .state-icon { font-size:32px; margin-bottom:12px; }
        .state-title { font-size:15px; font-weight:700; margin-bottom:6px; }
        .state-desc { font-size:13px; color:var(--text-3); line-height:1.6; max-width:48ch; margin:0 auto; }
        .skel { height:360px; border-radius:var(--radius); background:linear-gradient(90deg,var(--bg-3) 25%,var(--bg-2) 50%,var(--bg-3) 75%); background-size:600px 100%; animation:shimmer 1.4s infinite; }
        @keyframes shimmer { 0%{background-position:-300px 0} 100%{background-position:300px 0} }

        @media (max-width:820px) { .board { grid-template-columns:1fr; } }
      `}</style>

      <nav className="nav">
        <a href="/" className="nav-brand">
          <div className="nav-logo">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04a1 1 0 000-1.41l-2.34-2.34a1 1 0 00-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z" fill="#fff"/></svg>
          </div>
          <span className="nav-title">CMV <span>Alpha</span></span>
        </a>
        <div className="nav-links">
          <a href="/" className="nav-link">Radar</a>
          <a href="/grid" className="nav-link active">Grid</a>
          <a href="/scan" className="nav-link">Scan</a>
          <a href="/tierlist" className="nav-link">Tiers</a>
          <a href="/feed" className="nav-link">Feed</a>
        </div>
      </nav>

      <div className="wrap">
        <div className="head">
          <h1>Moving, and <span>worth something.</span></h1>
          <p>
            Every target we have both discovered and judged, placed by how fast attention is
            accumulating against how it scores on fundamentals. The two questions are independent —
            which is the entire point of plotting them against each other rather than blending them
            into one number.
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
          {generatedAt && <div className="meta">updated {ago(generatedAt)} ago</div>}
        </div>

        {loading && <div className="skel" />}

        {!loading && error === 'unavailable' && (
          <div className="state">
            <div className="state-icon">🔌</div>
            <div className="state-title">Discovery engine not connected</div>
            <div className="state-desc">
              The grid has no database to read from. This is a configuration state, not an empty
              market — nothing is being hidden.
            </div>
          </div>
        )}

        {!loading && error === 'failed' && (
          <div className="state">
            <div className="state-icon">⚠️</div>
            <div className="state-title">Could not load the grid</div>
            <div className="state-desc">The request failed. Refresh to try again.</div>
          </div>
        )}

        {!loading && !error && plotted.length === 0 && unjudged.length === 0 && (
          <div className="state">
            <div className="state-icon">🔭</div>
            <div className="state-title">Nothing discovered in this window</div>
            <div className="state-desc">
              Try a wider time range, or all chains. The grid shows what the engine has found — it
              does not fill in gaps.
            </div>
          </div>
        )}

        {!loading && !error && (plotted.length > 0 || unjudged.length > 0) && (
          <>
            <div className="board">
              <div className="plot-shell">
                <div className="plot-frame">
                  <div className="y-axis"><div className="y-label">ALPHA SCORE →</div></div>

                  <div className="plot">
                    {QUADRANTS.map((q) => {
                      const w = q.corner === 'tr' || q.corner === 'br' ? `${100 - HEAT_SPLIT}%` : `${HEAT_SPLIT}%`
                      const h = q.corner === 'tr' || q.corner === 'tl' ? `${100 - ALPHA_SPLIT}%` : `${ALPHA_SPLIT}%`
                      return (
                        <div key={q.id} className={`quad quad-${q.corner}`} style={{ width: w, height: h, background: q.tint }}>
                          <div
                            className="quad-tag"
                            style={{
                              color: q.color,
                              [q.corner[0] === 't' ? 'top' : 'bottom']: '6px',
                              [q.corner[1] === 'r' ? 'right' : 'left']: '8px',
                            } as React.CSSProperties}
                          >
                            {q.label}
                          </div>
                        </div>
                      )
                    })}

                    <div className="divider-v" style={{ left: `${HEAT_SPLIT}%` }} />
                    <div className="divider-h" style={{ bottom: `${ALPHA_SPLIT}%` }} />
                    <div className="tick" style={{ left: `${HEAT_SPLIT}%`, bottom: '2px', transform: 'translateX(-50%)' }}>heat {HEAT_SPLIT}</div>
                    <div className="tick" style={{ bottom: `${ALPHA_SPLIT}%`, left: '3px', transform: 'translateY(50%)' }}>alpha {ALPHA_SPLIT}</div>

                    {plotted.map((t) => {
                      const q = QUADRANTS.find((x) => x.id === quadrantOf(t))!
                      const r = dotRadius(t.liquidity_usd)
                      const risky = t.risk_level === 'critical' || t.risk_level === 'high'
                      const unknownLiq = t.liquidity_usd === null || !Number.isFinite(t.liquidity_usd)
                      return (
                        <button
                          key={t.id}
                          type="button"
                          title={`${label(t)} — heat ${t.heat}, alpha ${t.alpha_score}`}
                          aria-label={`${label(t)}, heat ${t.heat}, alpha score ${t.alpha_score}`}
                          className={`dot ${selected?.id === t.id ? 'sel' : ''} ${unknownLiq ? 'unknown-liq' : ''} ${risky ? 'risky' : ''}`}
                          onClick={() => setSelected(t)}
                          style={{
                            left: `${Math.min(99, Math.max(1, t.heat))}%`,
                            bottom: `${Math.min(99, Math.max(1, t.alpha_score ?? 0))}%`,
                            width: r * 2,
                            height: r * 2,
                            background: q.color,
                            borderColor: unknownLiq ? q.color : 'var(--bg-2)',
                          }}
                        />
                      )
                    })}
                  </div>

                  <div className="x-axis">HEAT →</div>
                </div>

                <div className="legend">
                  <span>dot size = <b>liquidity</b> (log)</span>
                  <span>hollow = <b>liquidity unknown</b></span>
                  <span>red ring = <b>high or critical risk</b></span>
                  <span><b>{plotted.length}</b> plotted</span>
                </div>
              </div>

              <div>
                <div className="side-card">
                  <div className="side-h">WHERE THINGS SIT</div>
                  {QUADRANTS.map((q) => (
                    <div key={q.id} className="q-row">
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span className="q-swatch" style={{ background: q.color }} />
                          <span className="q-name" style={{ color: q.color }}>{q.label}</span>
                          <span className="q-n" style={{ color: q.color }}>{counts[q.id]}</span>
                        </div>
                        <div className="q-note">{q.note}</div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="side-card">
                  <div className="side-h">SELECTED</div>
                  {!selected && (
                    <div className="empty-sel">
                      Pick a dot to see the evidence behind both of its scores.
                    </div>
                  )}
                  {selected && (
                    <>
                      <div className="sel-name">{label(selected)}</div>
                      <div className="sel-sub">
                        {selected.chain || 'unknown chain'} · {selected.kind} · seen {ago(selected.first_seen_at)} ago
                      </div>
                      <div className="sel-scores">
                        <div className="sel-score">
                          <div className="sel-score-n">{selected.heat}</div>
                          <div className="sel-score-l">HEAT</div>
                        </div>
                        <div className="sel-score">
                          <div className="sel-score-n">{selected.alpha_score}</div>
                          <div className="sel-score-l">ALPHA</div>
                        </div>
                      </div>
                      <div className="sel-why">{selected.why}</div>
                      <div className="sel-stats">
                        <div>liquidity <b>{usd(selected.liquidity_usd)}</b></div>
                        <div>24h volume <b>{usd(selected.volume_24h_usd)}</b></div>
                        <div><b>{selected.source_count}</b> sources · <b>{selected.signal_count}</b> signals</div>
                        {/* Absent risk is stated as unassessed, never rendered as a clean result. */}
                        <div>risk <b>{selected.risk_level || 'not assessed'}</b></div>
                      </div>
                      <a className="sel-link" href={`/target/${selected.id}`}>Open full evidence →</a>
                    </>
                  )}
                </div>
              </div>
            </div>

            {unjudged.length > 0 && (
              <div className="unjudged">
                <div className="unjudged-h">{unjudged.length} discovered but not yet judged</div>
                <div className="unjudged-p">
                  These have a heat score but no alpha score, so they have no position on the
                  vertical axis and are deliberately left off the plot. Most are waiting on a
                  linked X account — the scanner needs a social identity to judge a project, and a
                  freshly deployed pool usually does not have one yet. Plotting them at zero would
                  read as "scored badly", which is a different claim entirely.
                </div>
                <div className="u-list">
                  {unjudged.slice(0, 40).map((t) => (
                    <a key={t.id} className="u-item" href={`/target/${t.id}`}>
                      {label(t)} <b>{t.heat}</b>
                    </a>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
