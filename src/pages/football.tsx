import { useEffect, useState } from 'react'
import { LEAGUES, type FixturePrediction, type FormEntry, type LeagueReport, type Outcome } from '../lib/football/engine'
import backtest from '../lib/football/backtest-summary.json'

type Tab = 'fixtures' | 'ratings' | 'record'

const TIER: Record<string, { label: string; bg: string; fg: string; border: string }> = {
  banker: { label: 'Banker', bg: '#dcfce7', fg: '#15803d', border: '#86efac' },
  strong: { label: 'Strong', bg: '#ecfccb', fg: '#4d7c0f', border: '#bef264' },
  lean: { label: 'Lean', bg: '#fef9c3', fg: '#a16207', border: '#fde047' },
  open: { label: 'Toss-up', bg: '#f1f5f9', fg: '#475569', border: '#cbd5e1' },
}

const STORAGE_KEY = 'cmv_football_league'

const pct = (p: number) => `${Math.round(p * 100)}%`
const signed = (v: number, digits = 2) => {
  const r = Number(v.toFixed(digits))
  return `${r < 0 ? '−' : '+'}${Math.abs(r).toFixed(digits)}`
}
const fmtDate = (iso: string) => new Date(`${iso}T12:00:00Z`).toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' })
const fmtShort = (iso: string) => new Date(`${iso}T12:00:00Z`).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })

function initialLeague(): string {
  const fromUrl = new URLSearchParams(window.location.search).get('league')?.toUpperCase()
  if (fromUrl && LEAGUES.some(l => l.code === fromUrl)) return fromUrl
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved && LEAGUES.some(l => l.code === saved)) return saved
  } catch {}
  return 'E0'
}

// Oldest → newest, left to right (entries arrive most recent first)
function FormDots({ entries, align = 'left' }: { entries: FormEntry[]; align?: 'left' | 'right' }) {
  return (
    <div className="fb-form" style={{ justifyContent: align === 'right' ? 'flex-end' : 'flex-start' }}>
      {[...entries].reverse().map((e, i) => (
        <span key={i} className={`fb-dot fb-dot-${e.result}`} title={`${e.result} ${e.score} ${e.venue === 'H' ? 'vs' : 'at'} ${e.opponent} (${fmtShort(e.date)})`}>{e.result}</span>
      ))}
    </div>
  )
}

function ProbBar({ probs, home, away }: { probs: Outcome; home: string; away: string }) {
  return (
    <div>
      <div className="fb-bar">
        <div className="fb-bar-h" style={{ width: pct(probs.home) }} />
        <div className="fb-bar-d" style={{ width: pct(probs.draw) }} />
        <div className="fb-bar-a" style={{ width: pct(probs.away) }} />
      </div>
      <div className="fb-bar-labels">
        <span><b style={{ color: 'var(--home)' }}>{pct(probs.home)}</b> {home}</span>
        <span><b style={{ color: 'var(--text-3)' }}>{pct(probs.draw)}</b> Draw</span>
        <span>{away} <b style={{ color: 'var(--away)' }}>{pct(probs.away)}</b></span>
      </div>
    </div>
  )
}

interface PreviewData {
  preview: { headline?: string; homeNews?: string[]; awayNews?: string[]; factors?: string[]; verdict?: string; nudge?: string } | null
  raw?: string
  sources: { title: string; url: string }[]
}

function AiPreview({ f, leagueName }: { f: FixturePrediction; leagueName: string }) {
  const [data, setData] = useState<PreviewData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const p = f.prediction

  const run = async () => {
    setLoading(true); setError('')
    const form = (entries: FormEntry[]) => entries.map(e => `${e.result} ${e.score} ${e.venue === 'H' ? 'vs' : 'at'} ${e.opponent}`).join(', ')
    const params = new URLSearchParams({
      home: f.home, away: f.away, league: leagueName, date: f.date, time: f.time ?? '',
      ph: p.probs.home.toFixed(3), pd: p.probs.draw.toFixed(3), pa: p.probs.away.toFixed(3),
      xgh: p.xgHome.toFixed(2), xga: p.xgAway.toFixed(2), score: p.correctScores[0].score,
      formh: form(f.form.home), forma: form(f.form.away),
    })
    try {
      const r = await fetch(`/api/football-preview?${params}`)
      const d = await r.json()
      if (!r.ok) throw new Error(d.error || 'Preview failed')
      setData(d)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  if (!data) {
    return (
      <div className="fb-ai">
        <div className="fb-ai-head">
          <div>
            <div className="fb-sec-title">AI match preview</div>
            <div className="fb-muted">The model only sees results. Claude searches today's team news — injuries, suspensions, motivation — and checks the numbers against it.</div>
          </div>
          <button className="fb-btn" onClick={run} disabled={loading}>
            {loading ? <><span className="fb-spin" /> Searching team news…</> : '✨ Get preview'}
          </button>
        </div>
        {error && <div className="fb-error-inline">{error}</div>}
      </div>
    )
  }

  const pv = data.preview
  const nudge = pv?.nudge === 'home' ? `leans towards ${f.home}` : pv?.nudge === 'away' ? `leans towards ${f.away}` : pv?.nudge === 'draw' ? 'leans towards a draw' : 'agrees with the model'
  return (
    <div className="fb-ai">
      <div className="fb-sec-title">AI match preview</div>
      {pv ? (
        <>
          {pv.headline && <div className="fb-ai-headline">{pv.headline}</div>}
          <div className="fb-ai-grid">
            {[{ team: f.home, items: pv.homeNews }, { team: f.away, items: pv.awayNews }].map(({ team, items }) => (
              <div key={team}>
                <div className="fb-ai-label">{team} team news</div>
                <ul>{(items?.length ? items : ['No reliable news found']).map((n, i) => <li key={i}>{n}</li>)}</ul>
              </div>
            ))}
          </div>
          {!!pv.factors?.length && (
            <>
              <div className="fb-ai-label">Other factors</div>
              <ul>{pv.factors.map((n, i) => <li key={i}>{n}</li>)}</ul>
            </>
          )}
          {pv.verdict && <div className="fb-ai-verdict"><b>News {nudge}.</b> {pv.verdict}</div>}
        </>
      ) : (
        <div className="fb-ai-raw">{data.raw}</div>
      )}
      {!!data.sources.length && (
        <div className="fb-ai-sources">
          Sources: {data.sources.map((s, i) => <a key={i} href={s.url} target="_blank" rel="noreferrer">{s.title || new URL(s.url).hostname}</a>)}
        </div>
      )}
    </div>
  )
}

function MatchDetail({ f, leagueName }: { f: FixturePrediction; leagueName: string }) {
  const p = f.prediction
  const maxScore = p.correctScores[0].p
  return (
    <div className="fb-detail">
      <div className="fb-detail-grid">
        <div>
          <div className="fb-sec-title">Correct score</div>
          {p.correctScores.map(s => (
            <div key={s.score} className="fb-score-row">
              <span className="fb-mono">{s.score}</span>
              <div className="fb-score-track"><div style={{ width: `${(s.p / maxScore) * 100}%` }} /></div>
              <span className="fb-mono fb-muted">{pct(s.p)}</span>
            </div>
          ))}
        </div>
        <div>
          <div className="fb-sec-title">Goals</div>
          <table className="fb-mini">
            <thead><tr><th>Line</th><th>Over</th><th>Under</th></tr></thead>
            <tbody>
              {p.overUnder.filter(o => o.line >= 1.5 && o.line <= 3.5).map(o => (
                <tr key={o.line}><td>{o.line}</td><td>{pct(o.over)}</td><td>{pct(o.under)}</td></tr>
              ))}
              <tr><td>BTTS</td><td>{pct(p.btts.yes)}</td><td>{pct(p.btts.no)}</td></tr>
            </tbody>
          </table>
        </div>
        <div>
          <div className="fb-sec-title">Other markets</div>
          <table className="fb-mini">
            <tbody>
              <tr><td>{f.home} or draw</td><td>{pct(p.doubleChance.homeOrDraw)}</td></tr>
              <tr><td>{f.away} or draw</td><td>{pct(p.doubleChance.awayOrDraw)}</td></tr>
              <tr><td>Either team wins</td><td>{pct(p.doubleChance.homeOrAway)}</td></tr>
              <tr><td>Half time H / D / A</td><td>{pct(p.halfTime.home)} / {pct(p.halfTime.draw)} / {pct(p.halfTime.away)}</td></tr>
              <tr><td>Likely half-time score</td><td>{p.halfTime.mostLikelyScore}</td></tr>
            </tbody>
          </table>
        </div>
      </div>

      <div className="fb-detail-grid fb-detail-grid-2">
        {[{ team: f.home, form: f.form.home }, { team: f.away, form: f.form.away }].map(({ team, form }) => (
          <div key={team}>
            <div className="fb-sec-title">{team} — last {form.length}</div>
            {form.map((e, i) => (
              <div key={i} className="fb-form-row">
                <span className={`fb-dot fb-dot-${e.result}`}>{e.result}</span>
                <span className="fb-mono">{e.score}</span>
                <span>{e.venue === 'H' ? 'vs' : 'at'} {e.opponent}</span>
                <span className="fb-muted fb-mono" style={{ marginLeft: 'auto' }}>{fmtShort(e.date)}</span>
              </div>
            ))}
          </div>
        ))}
      </div>

      {f.market && (
        <div>
          <div className="fb-sec-title">Model vs bookmakers</div>
          <table className="fb-mini">
            <thead><tr><th /><th>{f.home}</th><th>Draw</th><th>{f.away}</th></tr></thead>
            <tbody>
              <tr><td>Model</td><td>{pct(p.probs.home)}</td><td>{pct(p.probs.draw)}</td><td>{pct(p.probs.away)}</td></tr>
              <tr><td>Bookmakers</td><td>{pct(f.market.implied.home)}</td><td>{pct(f.market.implied.draw)}</td><td>{pct(f.market.implied.away)}</td></tr>
            </tbody>
          </table>
          <div className="fb-muted fb-small">Bookmaker prices (margin removed) are usually sharper than any public model — in our backtest, backing the model where it disagreed lost money. Treat big gaps as a reason to check team news, not as free value.</div>
        </div>
      )}

      <AiPreview f={f} leagueName={leagueName} />
    </div>
  )
}

function MatchCard({ f, open, onToggle, leagueName }: { f: FixturePrediction; open: boolean; onToggle: () => void; leagueName: string }) {
  const p = f.prediction
  const tier = TIER[p.pick.tier]
  const o25 = p.overUnder.find(o => o.line === 2.5)!
  return (
    <div className={`fb-card ${open ? 'fb-card-open' : ''}`}>
      <div className="fb-card-main" onClick={onToggle}>
        <div className="fb-card-meta">
          <span className="fb-mono">{f.time ?? 'TBC'}</span>
          {f.round && <span className="fb-muted">· {f.round}</span>}
          <span className="fb-tier" style={{ background: tier.bg, color: tier.fg, borderColor: tier.border }}>{tier.label}</span>
        </div>
        <div className="fb-teams">
          <div className="fb-team">
            <div className="fb-team-name">{f.home}</div>
            <FormDots entries={f.form.home} />
          </div>
          <div className="fb-likely">
            <div className="fb-likely-score">{p.correctScores[0].score}</div>
            <div className="fb-likely-lbl">likely score</div>
          </div>
          <div className="fb-team fb-team-away">
            <div className="fb-team-name">{f.away}</div>
            <FormDots entries={f.form.away} align="right" />
          </div>
        </div>
        <ProbBar probs={p.probs} home={f.home} away={f.away} />
        <div className="fb-chips">
          <span className="fb-chip fb-chip-pick">Pick: <b>{p.pick.label}</b> {pct(p.pick.p)}</span>
          <span className="fb-chip">Safer: <b>{p.pick.safer.label}</b> {pct(p.pick.safer.p)}</span>
          <span className="fb-chip">xG <b>{p.xgHome.toFixed(1)} – {p.xgAway.toFixed(1)}</b></span>
          <span className="fb-chip">Over 2.5 <b>{pct(o25.over)}</b></span>
          <span className="fb-chip">BTTS <b>{pct(p.btts.yes)}</b></span>
          {f.market && <span className="fb-chip">Bookies <b>{pct(f.market.implied.home)} / {pct(f.market.implied.draw)} / {pct(f.market.implied.away)}</b></span>}
        </div>
      </div>
      <button className="fb-toggle" onClick={onToggle} aria-expanded={open}>{open ? 'Hide details ▲' : 'Scores, goals, form & AI preview ▼'}</button>
      {open && <MatchDetail f={f} leagueName={leagueName} />}
    </div>
  )
}

function Fixtures({ report }: { report: LeagueReport }) {
  const [open, setOpen] = useState<string | null>(null)
  if (!report.fixtures.length) {
    return <div className="fb-empty">No upcoming fixtures found for {report.league.name}. The season may be on a break — check back soon.</div>
  }
  const byDate = new Map<string, FixturePrediction[]>()
  for (const f of report.fixtures) byDate.set(f.date, [...(byDate.get(f.date) ?? []), f])
  return (
    <>
      {[...byDate.entries()].map(([date, list]) => (
        <section key={date} className="fb-day">
          <h3 className="fb-day-title">{fmtDate(date)}</h3>
          {list.map(f => {
            const id = `${f.home}|${f.away}`
            return <MatchCard key={id} f={f} leagueName={report.league.name} open={open === id} onToggle={() => setOpen(open === id ? null : id)} />
          })}
        </section>
      ))}
    </>
  )
}

function Ratings({ report }: { report: LeagueReport }) {
  const max = Math.max(...report.ratings.map(r => Math.abs(r.goalDiff)), 0.5)
  return (
    <div className="fb-panel">
      <div className="fb-muted fb-small" style={{ marginBottom: 12 }}>
        Model strength of every team: goals scored and conceded compared with an average {report.league.name} side, and the expected goal difference per game against one on neutral ground. Recent matches count most.
      </div>
      <div className="fb-table-wrap">
        <table className="fb-table">
          <thead><tr><th>#</th><th>Team</th><th>Attack</th><th>Defence</th><th>Net</th><th className="fb-hide-sm">Form</th></tr></thead>
          <tbody>
            {report.ratings.map(r => (
              <tr key={r.team}>
                <td className="fb-mono fb-muted">{r.rank}</td>
                <td><b>{r.team}</b>{r.arrival && <span className={`fb-new fb-new-${r.arrival}`} title={r.arrival}>{r.arrival === 'promoted' ? '▲' : '▼'}<span className="fb-new-text"> {r.arrival}</span></span>}</td>
                <td className="fb-mono" style={{ color: r.attack >= 1 ? 'var(--green)' : 'var(--red)' }}>{signed((r.attack - 1) * 100, 0)}%</td>
                <td className="fb-mono" style={{ color: r.defence <= 1 ? 'var(--green)' : 'var(--red)' }}>{signed((r.defence - 1) * 100, 0)}%</td>
                <td>
                  <div className="fb-net">
                    <span className="fb-mono">{signed(r.goalDiff)}</span>
                    <div className="fb-net-track">
                      <div style={{ left: r.goalDiff >= 0 ? '50%' : `${50 - (Math.abs(r.goalDiff) / max) * 50}%`, width: `${(Math.abs(r.goalDiff) / max) * 50}%`, background: r.goalDiff >= 0 ? 'var(--green)' : 'var(--red)' }} />
                    </div>
                  </div>
                </td>
                <td className="fb-hide-sm"><FormDots entries={r.form} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="fb-muted fb-small" style={{ marginTop: 10 }}>Form reads oldest → newest. Defence: negative = concedes fewer than average (good). Promoted and relegated teams have little history in this league, so their rating leans on a typical promoted or relegated side until they've played more.</div>
    </div>
  )
}

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="fb-stat">
      <div className="fb-stat-label">{label}</div>
      <div className="fb-stat-value">{value}</div>
      {sub && <div className="fb-stat-sub">{sub}</div>}
    </div>
  )
}

function Record({ report }: { report: LeagueReport }) {
  const t = report.seasonTrack
  const bt = backtest.leagues.find(l => l.code === report.league.code)
  return (
    <>
      <div className="fb-panel">
        <div className="fb-sec-title">This season — {report.season}</div>
        {t ? (
          <>
            <div className="fb-muted fb-small" style={{ marginBottom: 12 }}>Every match so far, predicted using only the results available before it was played.</div>
            <div className="fb-stats">
              <Stat label="Matches predicted" value={String(t.matches)} />
              <Stat label="Result called right" value={pct(t.model.accuracy)} sub={t.market ? `Bookmakers: ${pct(t.market.accuracy)}` : undefined} />
              <Stat label="Over/under 2.5 right" value={pct(t.model.over25Accuracy)} sub={t.market?.over25Accuracy !== undefined ? `Bookmakers: ${pct(t.market.over25Accuracy)}` : undefined} />
              <Stat label="Log loss (lower = better)" value={t.model.logLoss.toFixed(3)} sub={t.market ? `Bookmakers: ${t.market.logLoss.toFixed(3)}` : undefined} />
            </div>
            {!!t.lastRound.length && (
              <>
                <div className="fb-sec-title" style={{ marginTop: 18 }}>Latest round</div>
                {t.lastRound.map(r => {
                  const top = (['home', 'draw', 'away'] as const).reduce((m, k) => (r.predicted[k] > r.predicted[m] ? k : m), 'home' as keyof Outcome)
                  const label = top === 'home' ? r.home : top === 'away' ? r.away : 'Draw'
                  return (
                    <div key={`${r.home}|${r.away}`} className="fb-round-row">
                      <span className={`fb-check ${r.correct ? 'fb-check-ok' : 'fb-check-no'}`}>{r.correct ? '✓' : '✗'}</span>
                      <span className="fb-round-match">{r.home} <b className="fb-mono">{r.score}</b> {r.away}</span>
                      <span className="fb-muted fb-small">called: {label} {pct(r.predicted[top])}</span>
                    </div>
                  )
                })}
              </>
            )}
          </>
        ) : <div className="fb-muted">Not enough matches played yet this season.</div>}
      </div>

      <div className="fb-panel">
        <div className="fb-sec-title">Backtest — {backtest.seasons.join(' & ')}</div>
        <div className="fb-muted fb-small" style={{ marginBottom: 12 }}>
          Two full seasons replayed week by week, with the model refitted each week on past data only, against the bookmakers' closing odds. A know-nothing guess scores a log loss of {backtest.naiveLogLoss.toFixed(3)}.
        </div>
        <div className="fb-table-wrap">
          <table className="fb-table">
            <thead><tr><th>League</th><th>Matches</th><th>Model right</th><th>Bookies right</th><th>Model LL</th><th>Bookies LL</th></tr></thead>
            <tbody>
              {[...backtest.leagues, { code: 'ALL', name: 'All leagues', ...backtest.overall }].map(l => (
                <tr key={l.code} className={l.code === report.league.code ? 'fb-row-hl' : l.code === 'ALL' ? 'fb-row-total' : ''}>
                  <td><b>{l.name}</b></td>
                  <td className="fb-mono">{l.matches}</td>
                  <td className="fb-mono">{pct(l.model.accuracy)}</td>
                  <td className="fb-mono">{pct(l.market?.accuracy ?? 0)}</td>
                  <td className="fb-mono">{l.model.logLoss.toFixed(3)}</td>
                  <td className="fb-mono">{(l.market?.logLoss ?? 0).toFixed(3)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {bt && (
          <div className="fb-note">
            <b>Honest take:</b> the model gets close to the bookmakers but doesn't beat them — {report.league.name} {pct(bt.model.accuracy)} vs {pct(bt.market?.accuracy ?? 0)}. Blindly backing its "value" picks (model ≥5% above the odds) returned {pct(backtest.overall.valueBets.roi)} over {backtest.overall.valueBets.bets.toLocaleString()} bets. Use it to understand matches, not as a money machine.
          </div>
        )}
      </div>

      <div className="fb-panel">
        <div className="fb-sec-title">How it works</div>
        <ol className="fb-how">
          <li><b>Data.</b> Every result from the last three seasons ({report.model.matchesUsed.toLocaleString()} matches in this league), plus expected goals (xG) where published — from football-data.co.uk. Fixtures from openfootball.</li>
          <li><b>Ratings.</b> Each team gets an attack and a defence rating (a Dixon-Coles model). Last week's match counts about twice as much as one from a year ago. Home advantage here: goals ×{report.model.homeAdvantage.toFixed(2)}.</li>
          <li><b>Every scoreline.</b> Ratings turn into expected goals for each side, then into a probability for every score from 0-0 to 10-10. Win/draw/loss, over/under, both teams to score and correct score all come from that grid.</li>
          <li><b>Team news.</b> The model can't see injuries or motivation — that's what the AI preview is for.</li>
        </ol>
        <div className="fb-muted fb-small">Model fitted {new Date(report.generatedAt).toLocaleString()} · latest result {report.model.lastResult ?? 'n/a'} · average {report.model.avgGoals.toFixed(2)} goals per game this season.</div>
      </div>
    </>
  )
}

export default function Football() {
  const [league, setLeague] = useState(initialLeague)
  const [tab, setTab] = useState<Tab>('fixtures')
  const [report, setReport] = useState<LeagueReport | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [reload, setReload] = useState(0)

  useEffect(() => {
    let cancelled = false
    setLoading(true); setError('')
    try { localStorage.setItem(STORAGE_KEY, league) } catch {}
    window.history.replaceState(null, '', `/football?league=${league}`)
    fetch(`/api/football?league=${league}`)
      .then(async r => {
        const d = await r.json()
        if (!r.ok) throw new Error(d.error || 'Could not load predictions')
        return d as LeagueReport
      })
      .then(d => { if (!cancelled) setReport(d) })
      .catch(e => { if (!cancelled) setError(e.message) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [league, reload])

  const current = LEAGUES.find(l => l.code === league)!

  return (
    <div className="fb-root">
      <style>{`
        .fb-root {
          --bg: #f6f8fb; --card: #ffffff; --bg-3: #f1f5f9;
          --border: #e2e8f0; --border-2: #cbd5e1;
          --text-1: #0f172a; --text-2: #334155; --text-3: #64748b; --text-4: #94a3b8;
          --green: #16a34a; --green-light: #dcfce7; --green-dark: #14532d; --red: #dc2626;
          --home: #16a34a; --draw: #cbd5e1; --away: #4f46e5;
          --mono: 'DM Mono', monospace;
          min-height: 100vh; background: var(--bg); color: var(--text-1);
          font-family: 'Plus Jakarta Sans', sans-serif; -webkit-font-smoothing: antialiased;
        }
        .fb-nav {
          position: sticky; top: 0; z-index: 50; height: 56px; padding: 0 16px;
          display: flex; align-items: center; gap: 10px;
          background: rgba(246,248,251,0.9); backdrop-filter: blur(16px); border-bottom: 1px solid var(--border);
        }
        .fb-brand { display: flex; align-items: center; gap: 10px; text-decoration: none; color: var(--text-1); font-weight: 800; font-size: 15px; letter-spacing: -0.3px; }
        .fb-brand span { color: var(--green); }
        .fb-logo { width: 28px; height: 28px; border-radius: 8px; background: var(--green); display: flex; align-items: center; justify-content: center; font-size: 15px; }
        .fb-nav-link { margin-left: auto; font-family: var(--mono); font-size: 11px; color: var(--text-3); text-decoration: none; padding: 5px 12px; border: 1px solid var(--border); border-radius: 20px; }
        .fb-nav-link:hover { border-color: var(--border-2); color: var(--text-1); }

        .fb-wrap { max-width: 880px; margin: 0 auto; padding: 24px 16px 80px; }
        .fb-hero h1 { font-size: 26px; font-weight: 800; letter-spacing: -0.6px; }
        .fb-hero p { color: var(--text-3); font-size: 14px; margin-top: 6px; line-height: 1.5; }

        .fb-leagues { display: flex; gap: 8px; overflow-x: auto; padding: 16px 0 4px; scrollbar-width: none; }
        .fb-leagues::-webkit-scrollbar { display: none; }
        .fb-league {
          flex-shrink: 0; display: flex; align-items: center; gap: 6px; padding: 8px 14px; border-radius: 999px;
          border: 1px solid var(--border); background: var(--card); color: var(--text-2);
          font: inherit; font-size: 13px; font-weight: 600; cursor: pointer; transition: all .15s;
        }
        .fb-league:hover { border-color: var(--border-2); }
        .fb-league-on { background: var(--text-1); border-color: var(--text-1); color: #fff; }

        .fb-tabs { display: flex; gap: 4px; margin: 14px 0 18px; background: var(--bg-3); padding: 4px; border-radius: 12px; }
        .fb-tab { flex: 1; padding: 9px 8px; border: none; border-radius: 9px; background: none; font: inherit; font-size: 13px; font-weight: 600; color: var(--text-3); cursor: pointer; }
        .fb-tab-on { background: var(--card); color: var(--text-1); box-shadow: 0 1px 3px rgba(15,23,42,0.08); }

        .fb-day { margin-bottom: 22px; }
        .fb-day-title { font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.6px; color: var(--text-3); margin-bottom: 10px; }

        .fb-card { background: var(--card); border: 1px solid var(--border); border-radius: 16px; margin-bottom: 12px; overflow: hidden; transition: border-color .15s, box-shadow .15s; }
        .fb-card:hover, .fb-card-open { border-color: var(--border-2); box-shadow: 0 4px 16px rgba(15,23,42,0.06); }
        .fb-card-main { padding: 14px 16px 12px; cursor: pointer; }
        .fb-card-meta { display: flex; align-items: center; gap: 6px; font-size: 12px; color: var(--text-2); margin-bottom: 10px; }
        .fb-tier { margin-left: auto; font-size: 11px; font-weight: 700; padding: 3px 10px; border-radius: 999px; border: 1px solid; }

        .fb-teams { display: grid; grid-template-columns: 1fr auto 1fr; align-items: center; gap: 10px; margin-bottom: 12px; }
        .fb-team { min-width: 0; }
        .fb-team-away { text-align: right; }
        .fb-team-name { font-size: 16px; font-weight: 800; letter-spacing: -0.3px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; margin-bottom: 5px; }
        .fb-likely { text-align: center; padding: 6px 12px; background: var(--bg-3); border-radius: 10px; }
        .fb-likely-score { font-family: var(--mono); font-size: 18px; font-weight: 500; }
        .fb-likely-lbl { font-size: 9px; text-transform: uppercase; letter-spacing: 0.5px; color: var(--text-4); }

        .fb-form { display: flex; gap: 3px; }
        .fb-dot { width: 17px; height: 17px; border-radius: 4px; font-size: 9px; font-weight: 800; color: #fff; display: inline-flex; align-items: center; justify-content: center; flex-shrink: 0; }
        .fb-dot-W { background: #16a34a; } .fb-dot-D { background: #94a3b8; } .fb-dot-L { background: #dc2626; }

        .fb-bar { display: flex; height: 10px; border-radius: 999px; overflow: hidden; gap: 2px; }
        .fb-bar-h { background: var(--home); } .fb-bar-d { background: var(--draw); } .fb-bar-a { background: var(--away); }
        .fb-bar-labels { display: flex; justify-content: space-between; gap: 8px; font-size: 12px; color: var(--text-3); margin-top: 6px; }
        .fb-bar-labels span { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .fb-bar-labels b { font-family: var(--mono); font-weight: 500; font-size: 13px; }

        .fb-chips { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 12px; }
        .fb-chip { font-size: 11.5px; color: var(--text-3); background: var(--bg-3); border-radius: 8px; padding: 4px 9px; }
        .fb-chip b { color: var(--text-1); font-weight: 700; }
        .fb-chip-pick { background: var(--green-light); color: var(--green-dark); }
        .fb-chip-pick b { color: var(--green-dark); }

        .fb-toggle { width: 100%; border: none; border-top: 1px solid var(--border); background: none; padding: 9px; font: inherit; font-size: 12px; font-weight: 600; color: var(--text-3); cursor: pointer; }
        .fb-toggle:hover { color: var(--text-1); background: var(--bg-3); }

        .fb-detail { border-top: 1px solid var(--border); padding: 16px; display: flex; flex-direction: column; gap: 18px; background: #fbfcfe; }
        .fb-detail-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 18px; }
        .fb-detail-grid-2 { grid-template-columns: repeat(2, 1fr); }
        .fb-sec-title { font-size: 12px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px; color: var(--text-2); margin-bottom: 8px; }
        .fb-score-row { display: flex; align-items: center; gap: 8px; font-size: 13px; margin-bottom: 5px; }
        .fb-score-track { flex: 1; height: 6px; background: var(--bg-3); border-radius: 999px; overflow: hidden; }
        .fb-score-track div { height: 100%; background: var(--green); border-radius: 999px; }
        .fb-mini { width: 100%; border-collapse: collapse; font-size: 12.5px; }
        .fb-mini th { text-align: left; font-weight: 600; color: var(--text-4); font-size: 11px; padding: 3px 4px; }
        .fb-mini td { padding: 4px; border-top: 1px solid var(--border); }
        .fb-mini td:not(:first-child), .fb-mini th:not(:first-child) { text-align: right; font-family: var(--mono); }
        .fb-form-row { display: flex; align-items: center; gap: 8px; font-size: 12.5px; padding: 3px 0; }

        .fb-ai { border: 1px solid #c7d2fe; background: #f5f7ff; border-radius: 12px; padding: 14px; }
        .fb-ai-head { display: flex; align-items: center; gap: 14px; }
        .fb-ai-head .fb-muted { font-size: 12.5px; line-height: 1.5; }
        .fb-ai-headline { font-size: 15px; font-weight: 700; margin-bottom: 10px; }
        .fb-ai-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin-bottom: 8px; }
        .fb-ai-label { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.4px; color: #4338ca; margin-bottom: 4px; }
        .fb-ai ul { padding-left: 16px; font-size: 13px; line-height: 1.5; color: var(--text-2); margin-bottom: 8px; }
        .fb-ai-verdict { font-size: 13px; line-height: 1.55; background: #fff; border-radius: 8px; padding: 10px 12px; }
        .fb-ai-raw { font-size: 13px; line-height: 1.55; white-space: pre-wrap; }
        .fb-ai-sources { margin-top: 10px; font-size: 11.5px; color: var(--text-3); display: flex; flex-wrap: wrap; gap: 4px 10px; }
        .fb-ai-sources a { color: #4338ca; text-decoration: none; max-width: 240px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .fb-btn { flex-shrink: 0; display: inline-flex; align-items: center; gap: 8px; border: none; border-radius: 10px; background: #4f46e5; color: #fff; font: inherit; font-size: 13px; font-weight: 700; padding: 10px 16px; cursor: pointer; }
        .fb-btn:disabled { opacity: 0.7; cursor: wait; }
        .fb-spin { width: 13px; height: 13px; border: 2px solid rgba(255,255,255,0.4); border-top-color: #fff; border-radius: 50%; animation: spin .8s linear infinite; }
        .fb-error-inline { margin-top: 10px; font-size: 12.5px; color: var(--red); }

        .fb-panel { background: var(--card); border: 1px solid var(--border); border-radius: 16px; padding: 18px; margin-bottom: 14px; }
        .fb-table-wrap { overflow-x: auto; }
        .fb-table { width: 100%; border-collapse: collapse; font-size: 13px; }
        .fb-table th { text-align: left; font-size: 11px; font-weight: 700; color: var(--text-4); text-transform: uppercase; letter-spacing: 0.4px; padding: 6px 8px; border-bottom: 1px solid var(--border); white-space: nowrap; }
        .fb-table td { padding: 8px; border-bottom: 1px solid var(--bg-3); white-space: nowrap; }
        .fb-row-hl td { background: #f0fdf4; }
        .fb-row-total td { border-top: 2px solid var(--border); font-weight: 700; }
        .fb-new { margin-left: 6px; font-size: 10px; font-weight: 700; padding: 1px 6px; border-radius: 6px; }
        .fb-new-promoted { color: #15803d; background: #dcfce7; }
        .fb-new-relegated { color: #b45309; background: #fef3c7; }
        .fb-net { display: flex; align-items: center; gap: 8px; }
        .fb-net-track { position: relative; width: 90px; height: 6px; background: var(--bg-3); border-radius: 999px; }
        .fb-net-track div { position: absolute; top: 0; height: 100%; border-radius: 999px; }

        .fb-stats { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; }
        .fb-stat { background: var(--bg-3); border-radius: 12px; padding: 12px; }
        .fb-stat-label { font-size: 11px; color: var(--text-3); font-weight: 600; }
        .fb-stat-value { font-family: var(--mono); font-size: 22px; margin-top: 4px; }
        .fb-stat-sub { font-size: 11px; color: var(--text-3); margin-top: 2px; }
        .fb-round-row { display: flex; align-items: center; gap: 10px; padding: 7px 0; border-top: 1px solid var(--bg-3); font-size: 13px; flex-wrap: wrap; }
        .fb-round-match { flex: 1; min-width: 180px; }
        .fb-check { width: 20px; height: 20px; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; font-size: 11px; font-weight: 800; color: #fff; flex-shrink: 0; }
        .fb-check-ok { background: var(--green); } .fb-check-no { background: #cbd5e1; }
        .fb-note { margin-top: 14px; font-size: 13px; line-height: 1.55; background: #fffbeb; border: 1px solid #fde68a; border-radius: 10px; padding: 12px; color: #78350f; }
        .fb-how { padding-left: 18px; font-size: 13.5px; line-height: 1.6; color: var(--text-2); margin-bottom: 12px; }
        .fb-how li { margin-bottom: 6px; }

        .fb-muted { color: var(--text-3); }
        .fb-small { font-size: 12px; line-height: 1.5; }
        .fb-mono { font-family: var(--mono); }
        .fb-empty, .fb-error { text-align: center; padding: 48px 16px; color: var(--text-3); background: var(--card); border: 1px dashed var(--border-2); border-radius: 16px; }
        .fb-error button { margin-top: 12px; }
        .fb-notes { font-size: 12px; color: #92400e; margin-bottom: 12px; }
        .fb-skeleton { height: 150px; border-radius: 16px; margin-bottom: 12px; background: linear-gradient(90deg, #eef2f7 0px, #f8fafc 200px, #eef2f7 400px); background-size: 800px 100%; animation: shimmer 1.4s linear infinite; }
        .fb-footer { margin-top: 28px; text-align: center; font-size: 11.5px; color: var(--text-4); line-height: 1.6; }
        .fb-footer a { color: var(--text-3); }

        @media (max-width: 640px) {
          .fb-hero h1 { font-size: 22px; }
          .fb-detail-grid, .fb-detail-grid-2, .fb-ai-grid { grid-template-columns: 1fr; }
          .fb-stats { grid-template-columns: 1fr 1fr; }
          .fb-team-name { font-size: 14px; }
          .fb-dot { width: 15px; height: 15px; font-size: 8px; }
          .fb-ai-head { flex-direction: column; align-items: stretch; }
          .fb-hide-sm { display: none; }
          .fb-net-track { display: none; }
          .fb-table th, .fb-table td { padding: 7px 5px; }
          .fb-new-text { display: none; }
        }
      `}</style>

      <nav className="fb-nav">
        <a href="/football" className="fb-brand">
          <div className="fb-logo">⚽</div>
          CMV <span>Football</span>
        </a>
        <a href="/" className="fb-nav-link">Alpha Scanner →</a>
      </nav>

      <main className="fb-wrap">
        <div className="fb-hero">
          <h1>{current.flag} {current.name} predictions</h1>
          <p>Win, draw and scoreline probabilities from a statistical model of every team's attack and defence, checked each week against real results.</p>
        </div>

        <div className="fb-leagues">
          {LEAGUES.map(l => (
            <button key={l.code} className={`fb-league ${l.code === league ? 'fb-league-on' : ''}`} onClick={() => setLeague(l.code)}>
              <span>{l.flag}</span>{l.name}
            </button>
          ))}
        </div>

        <div className="fb-tabs">
          {([['fixtures', 'Fixtures'], ['ratings', 'Power ratings'], ['record', 'Track record']] as const).map(([id, label]) => (
            <button key={id} className={`fb-tab ${tab === id ? 'fb-tab-on' : ''}`} onClick={() => setTab(id)}>{label}</button>
          ))}
        </div>

        {loading ? (
          <>{[0, 1, 2].map(i => <div key={i} className="fb-skeleton" />)}</>
        ) : error || !report ? (
          <div className="fb-error">
            <div>Couldn't load predictions: {error || 'no data'}</div>
            <button className="fb-btn" onClick={() => setReload(n => n + 1)}>Try again</button>
          </div>
        ) : (
          <>
            {!!report.notes.length && <div className="fb-notes">{report.notes.join(' · ')}</div>}
            {tab === 'fixtures' && <Fixtures key={report.league.code} report={report} />}
            {tab === 'ratings' && <Ratings report={report} />}
            {tab === 'record' && <Record report={report} />}
          </>
        )}

        <footer className="fb-footer">
          Probabilities, not guarantees. If you bet, only stake what you can afford to lose — 18+.<br />
          Data: <a href="https://www.football-data.co.uk" target="_blank" rel="noreferrer">football-data.co.uk</a> · <a href="https://github.com/openfootball/football.json" target="_blank" rel="noreferrer">openfootball</a>
        </footer>
      </main>
    </div>
  )
}
