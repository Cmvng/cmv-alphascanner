import { useState, useEffect } from 'react'

/* Target detail — the "why am I looking at this?" view (§23).
   Radar rows were previously dead ends; this is where the evidence lives. */

interface Check {
  key: string
  checked: boolean
  reason?: string
  indicator: {
    indicator: string
    severity: 'low' | 'medium' | 'high' | 'critical'
    observation: string
    implication: string
  } | null
}

interface Payload {
  target: any
  risk: { checks: Check[]; summary: Record<string, number>; checked_count: number; total_count: number; assessed_at: string } | null
  events: Array<{ id: string; source: string; event_type: string; occurred_at: string; confidence: number; reference: string | null }>
  heat_history: Array<{ heat: number; at: string }>
}

const SEV: Record<string, { label: string; color: string; bg: string; border: string }> = {
  critical: { label: 'CRITICAL', color: '#b91c1c', bg: '#fef2f2', border: '#fecaca' },
  high: { label: 'HIGH', color: '#c2410c', bg: '#fff7ed', border: '#fed7aa' },
  medium: { label: 'MEDIUM', color: '#a16207', bg: '#fefce8', border: '#fde68a' },
  low: { label: 'LOW', color: '#3f6212', bg: '#f7fee7', border: '#d9f99d' },
}

const REASON_TEXT: Record<string, string> = {
  source_unavailable: 'the risk data source could not be reached',
  chain_unsupported: 'this chain is not covered by the risk source',
  not_applicable: 'not applicable to this token type',
  no_data: 'the source returned no data for this check',
}

const CHECK_LABEL: Record<string, string> = {
  ownership: 'Contract ownership', upgradeable: 'Upgradeability', mintable: 'Supply inflation',
  honeypot: 'Sell simulation', sellable: 'Trading restrictions', transfer_tax: 'Transfer tax',
  transfer_pausable: 'Pausable transfers', blacklist: 'Address blacklist', lp_locked: 'Liquidity lock',
  holder_concentration: 'Holder concentration', mint_authority: 'Mint authority',
  freeze_authority: 'Freeze authority', metadata_mutable: 'Metadata mutability',
  transfer_fee: 'Transfer fee', transferable: 'Transferability',
}

function usd(n: number | null): string {
  if (n === null || !Number.isFinite(n)) return '—'
  if (n >= 1e9) return `$${(n / 1e9).toFixed(1)}B`
  if (n >= 1e6) return `$${(n / 1e6).toFixed(1)}M`
  if (n >= 1e3) return `$${(n / 1e3).toFixed(0)}K`
  return `$${n.toFixed(0)}`
}

function ago(iso: string | null): string {
  if (!iso) return '—'
  const m = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000))
  if (m < 60) return `${m}m ago`
  const h = Math.round(m / 60)
  return h < 24 ? `${h}h ago` : `${Math.round(h / 24)}d ago`
}

export default function Target() {
  const [data, setData] = useState<Payload | null>(null)
  const [state, setState] = useState<'loading' | 'ok' | 'notfound' | 'error'>('loading')

  const id = window.location.pathname.split('/').filter(Boolean).pop() || ''

  useEffect(() => {
    fetch(`/api/target/${id}`)
      .then(async (r) => {
        if (r.status === 404) return setState('notfound')
        if (!r.ok) return setState('error')
        setData(await r.json())
        setState('ok')
      })
      .catch(() => setState('error'))
  }, [id])

  const t = data?.target
  const risk = data?.risk

  const flagged = (risk?.checks || []).filter((c) => c.checked && c.indicator)
  const cleared = (risk?.checks || []).filter((c) => c.checked && !c.indicator)
  const notChecked = (risk?.checks || []).filter((c) => !c.checked)

  return (
    <div className="t-root">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800;900&family=JetBrains+Mono:wght@400;500;600;700&display=swap');
        :root{--bg:#f8faf8;--bg-2:#fff;--bg-3:#f1f5f1;--border:#e2e8e4;--text-1:#0f1a12;--text-2:#2d3b30;--text-3:#5a6b5e;--text-4:#8a9b8e;--green:#16a34a;--green-light:#dcfce7;--red:#dc2626;--font:'Outfit',sans-serif;--mono:'JetBrains Mono',monospace;--radius:12px;--shadow:0 1px 2px rgba(15,26,18,.04),0 8px 24px -18px rgba(15,26,18,.3)}
        *{box-sizing:border-box;margin:0;padding:0}
        .t-root{min-height:100vh;background:var(--bg);font-family:var(--font);color:var(--text-1);-webkit-font-smoothing:antialiased}
        .nav{background:rgba(248,250,248,.85);backdrop-filter:blur(20px);border-bottom:1px solid var(--border);padding:0 24px;display:flex;align-items:center;height:56px;position:sticky;top:0;z-index:100}
        .nav a{font-family:var(--mono);font-size:11px;color:var(--text-3);text-decoration:none;padding:6px 12px;border-radius:6px}
        .nav a:hover{background:var(--bg-3);color:var(--text-1)}
        .wrap{max-width:900px;margin:0 auto;padding:28px 20px 80px}
        .card{background:var(--bg-2);border:1px solid var(--border);border-radius:var(--radius);padding:20px;margin-bottom:14px;box-shadow:var(--shadow)}
        .label{font-family:var(--mono);font-size:9px;letter-spacing:1.6px;text-transform:uppercase;color:var(--text-4);margin-bottom:12px}
        h1{font-size:clamp(24px,4vw,34px);font-weight:800;letter-spacing:-1px;margin-bottom:6px}
        .sub{font-family:var(--mono);font-size:11px;color:var(--text-4);word-break:break-all}
        .hero{display:flex;gap:20px;align-items:flex-start;flex-wrap:wrap}
        .scores{display:flex;gap:10px;margin-left:auto;flex-shrink:0}
        .score{text-align:center;background:var(--bg-3);border:1px solid var(--border);border-radius:10px;padding:10px 16px;min-width:84px}
        .score-n{font-family:var(--mono);font-size:24px;font-weight:700;line-height:1}
        .score-l{font-family:var(--mono);font-size:8px;letter-spacing:1px;color:var(--text-4);margin-top:5px}
        .why{background:var(--green-light);border:1px solid rgba(22,163,74,.2);border-radius:10px;padding:14px 16px;font-size:14px;line-height:1.6;color:#14532d;margin-top:16px}
        .grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(120px,1fr));gap:8px}
        .stat{background:var(--bg-3);border:1px solid var(--border);border-radius:8px;padding:10px 12px}
        .stat-l{font-family:var(--mono);font-size:8px;letter-spacing:1px;color:var(--text-4);margin-bottom:4px}
        .stat-v{font-size:15px;font-weight:700;font-variant-numeric:tabular-nums}
        .chk{border:1px solid var(--border);border-radius:10px;padding:13px 15px;margin-bottom:7px;background:var(--bg-2)}
        .chk-h{display:flex;align-items:center;gap:9px;margin-bottom:6px;flex-wrap:wrap}
        .chk-t{font-size:13.5px;font-weight:700}
        .sev{font-family:var(--mono);font-size:8.5px;font-weight:700;letter-spacing:.8px;padding:3px 7px;border-radius:4px}
        .chk-o{font-size:12.5px;color:var(--text-2);line-height:1.55;margin-bottom:5px}
        .chk-i{font-size:12px;color:var(--text-3);line-height:1.55}
        .pill{display:inline-flex;align-items:center;gap:6px;font-family:var(--mono);font-size:10px;padding:4px 10px;border-radius:20px;border:1px solid var(--border);background:var(--bg-3);color:var(--text-3);margin:0 5px 5px 0}
        .pill.ok{background:var(--green-light);border-color:rgba(22,163,74,.25);color:#14532d}
        .pill.unk{background:#fffbeb;border-color:#fde68a;color:#92400e}
        .ev{display:grid;grid-template-columns:64px 1fr auto;gap:11px;align-items:center;padding:9px 0;border-bottom:1px solid var(--border);font-size:12.5px}
        .ev:last-child{border-bottom:0}
        .ev-t{font-family:var(--mono);font-size:10px;color:var(--text-4)}
        .ev-s{font-family:var(--mono);font-size:9px;padding:2px 6px;border-radius:4px;background:var(--bg-3);border:1px solid var(--border);color:var(--text-3)}
        .banner{border-radius:10px;padding:14px 16px;font-size:13px;line-height:1.6;margin-bottom:14px}
        .banner.warn{background:#fffbeb;border:1px solid #fde68a;color:#92400e}
        .state{text-align:center;padding:70px 20px}
        .state-t{font-size:16px;font-weight:700;margin-bottom:6px}
        .state-d{font-size:13px;color:var(--text-3);max-width:44ch;margin:0 auto;line-height:1.6}
        .skel{height:90px;border-radius:var(--radius);background:linear-gradient(90deg,var(--bg-3) 25%,var(--bg-2) 50%,var(--bg-3) 75%);background-size:600px 100%;animation:sh 1.4s infinite;margin-bottom:12px}
        @keyframes sh{0%{background-position:-300px 0}100%{background-position:300px 0}}
      `}</style>

      <nav className="nav">
        <a href="/">← Radar</a>
        <a href="/grid">Grid</a>
        {t?.x_handle && <a href={`/scan?q=${t.x_handle}`}>Full scan →</a>}
      </nav>

      <div className="wrap">
        {state === 'loading' && [0, 1, 2].map((i) => <div key={i} className="skel" />)}

        {state === 'notfound' && (
          <div className="state">
            <div className="state-t">Target not found</div>
            <div className="state-d">It may have been removed, or the link is wrong.</div>
          </div>
        )}
        {state === 'error' && (
          <div className="state">
            <div className="state-t">Could not load this target</div>
            <div className="state-d">The request failed. Refresh to try again.</div>
          </div>
        )}

        {state === 'ok' && t && (
          <>
            <div className="card">
              <div className="hero">
                <div style={{ minWidth: 0, flex: 1 }}>
                  <h1>{t.name || t.symbol || 'Unnamed target'}</h1>
                  <div className="sub">
                    {t.chain}{t.symbol ? ` · ${t.symbol}` : ''}{t.contract_address ? ` · ${t.contract_address}` : ''}
                  </div>
                </div>
                <div className="scores">
                  <div className="score">
                    <div className="score-n" style={{ color: '#c2410c' }}>{t.heat}</div>
                    <div className="score-l">HEAT</div>
                  </div>
                  <div className="score">
                    {/* null is NOT a low score — say so plainly. */}
                    <div className="score-n" style={{ color: t.alpha_score !== null ? 'var(--green)' : 'var(--text-4)' }}>
                      {t.alpha_score !== null ? t.alpha_score : '—'}
                    </div>
                    <div className="score-l">{t.alpha_score !== null ? 'ALPHA' : 'NOT SCANNED'}</div>
                  </div>
                </div>
              </div>
              <div className="why">{t.why}</div>
            </div>

            <div className="card">
              <div className="label">Market</div>
              <div className="grid">
                <div className="stat"><div className="stat-l">LIQUIDITY</div><div className="stat-v">{usd(t.liquidity_usd)}</div></div>
                <div className="stat"><div className="stat-l">MARKET CAP</div><div className="stat-v">{usd(t.market_cap_usd)}</div></div>
                <div className="stat"><div className="stat-l">VOLUME 24H</div><div className="stat-v">{usd(t.volume_24h_usd)}</div></div>
                <div className="stat"><div className="stat-l">FIRST SEEN</div><div className="stat-v" style={{ fontSize: 13 }}>{ago(t.first_seen_at)}</div></div>
                <div className="stat"><div className="stat-l">LAST SIGNAL</div><div className="stat-v" style={{ fontSize: 13 }}>{ago(t.last_event_at)}</div></div>
              </div>
            </div>

            {/* ── RISK ─────────────────────────────────────────────────── */}
            <div className="card">
              <div className="label">Risk indicators</div>

              {!risk && (
                <div className="banner warn">
                  <strong>Not assessed.</strong> No risk checks have run against this target yet.
                  That is not the same as a clean result — nothing has been verified.
                </div>
              )}

              {risk && (
                <>
                  {risk.checked_count < risk.total_count && (
                    <div className="banner warn">
                      <strong>{risk.checked_count} of {risk.total_count} checks completed.</strong>{' '}
                      The remainder could not be run, so their outcome is unknown — not clear.
                    </div>
                  )}

                  {flagged.length === 0 && (
                    <div style={{ fontSize: 13, color: 'var(--text-3)', marginBottom: 12, lineHeight: 1.6 }}>
                      No indicators were raised by the {risk.checked_count} checks that ran.
                    </div>
                  )}

                  {flagged.map((c) => {
                    const s = SEV[c.indicator!.severity]
                    return (
                      <div key={c.key} className="chk" style={{ borderLeft: `3px solid ${s.color}` }}>
                        <div className="chk-h">
                          <span className="chk-t">{c.indicator!.indicator}</span>
                          <span className="sev" style={{ background: s.bg, color: s.color, border: `1px solid ${s.border}` }}>{s.label}</span>
                        </div>
                        <div className="chk-o">{c.indicator!.observation}</div>
                        <div className="chk-i">{c.indicator!.implication}</div>
                      </div>
                    )
                  })}

                  {cleared.length > 0 && (
                    <div style={{ marginTop: 14 }}>
                      <div className="label" style={{ marginBottom: 8 }}>Checked, nothing raised</div>
                      {cleared.map((c) => (
                        <span key={c.key} className="pill ok">✓ {CHECK_LABEL[c.key] || c.key}</span>
                      ))}
                    </div>
                  )}

                  {notChecked.length > 0 && (
                    <div style={{ marginTop: 14 }}>
                      <div className="label" style={{ marginBottom: 8 }}>Not checked — outcome unknown</div>
                      {notChecked.map((c) => (
                        <span key={c.key} className="pill unk" title={REASON_TEXT[c.reason || ''] || ''}>
                          ? {CHECK_LABEL[c.key] || c.key}
                        </span>
                      ))}
                      <div style={{ fontSize: 11.5, color: 'var(--text-4)', marginTop: 8, lineHeight: 1.5 }}>
                        These did not run{notChecked[0]?.reason ? ` — ${REASON_TEXT[notChecked[0].reason] || notChecked[0].reason}` : ''}. Their result is unknown, not clear.
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* ── EVIDENCE ─────────────────────────────────────────────── */}
            <div className="card">
              <div className="label">Evidence timeline ({data!.events.length})</div>
              {data!.events.length === 0 && (
                <div style={{ fontSize: 13, color: 'var(--text-3)' }}>No signals recorded.</div>
              )}
              {data!.events.map((e) => (
                <div key={e.id} className="ev">
                  <span className="ev-t">{ago(e.occurred_at)}</span>
                  <span>
                    {e.event_type.replace(/_/g, ' ')}
                    {e.reference && (
                      <a href={e.reference} target="_blank" rel="noopener noreferrer"
                         style={{ marginLeft: 8, fontSize: 11, color: 'var(--green)' }}>source ↗</a>
                    )}
                  </span>
                  <span className="ev-s">{e.source}</span>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
