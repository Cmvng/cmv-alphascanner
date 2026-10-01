// Writes the voiceover for each scene from the picks data. Numbers always come from
// the data, never invented. Wording stays factual: no "sure", "banker" or "guaranteed".

const WORDS = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten']
const word = n => WORDS[n] ?? String(n)
const pct = v => `${Math.round(v)} percent`
const odds = v => v.toFixed(2)
const money = v => Math.round(v).toLocaleString('en-US')
const weekday = d => (d ? new Date(`${d}T12:00:00Z`).toLocaleDateString('en-GB', { weekday: 'long', timeZone: 'UTC' }) : 'today')

function opener(i, n, p) {
  if (i === 0) return `First up, ${p.home} host ${p.away}.`
  if (i === n - 1) return `And the last one: ${p.home} against ${p.away}.`
  return [`Pick ${word(i + 1)}: ${p.home} against ${p.away}.`, `Next, ${p.home} take on ${p.away}.`, `Pick ${word(i + 1)}: ${p.home} host ${p.away}.`][i % 3]
}

function favourite(p) {
  if (p.home_win === undefined) return null
  const [h, d, a] = [p.home_win, p.draw, p.away_win]
  const fav = h >= a ? p.home : p.away, fp = Math.max(h, a)
  if (fp >= 65) return `Our model makes ${fav} clear favourites, ${pct(fp)}.`
  if (d >= Math.max(h, a)) return `A cagey one: the draw is the likeliest result at ${pct(d)}.`
  if (fp - Math.min(h, a) >= 10) return `Our model leans ${fav}, ${pct(fp)} to win.`
  return `It's close: ${pct(h)} ${p.home}, ${pct(a)} ${p.away}.`
}

function stats(p) {
  const out = []
  if (p.xg_home !== undefined) out.push(`Expected goals: ${p.home} ${p.xg_home.toFixed(1)}, ${p.away} ${p.xg_away.toFixed(1)}.`)
  if (p.scored_home !== undefined && p.conceded_away !== undefined) out.push(`${p.home} score ${p.scored_home.toFixed(1)} a game; ${p.away} concede ${p.conceded_away.toFixed(1)}.`)
  else if (p.form_home) {
    const w = s => (s.match(/W/g) || []).length
    out.push(`Form: ${p.home} won ${word(w(p.form_home))} of their last five, ${p.away} ${word(w(p.form_away || ''))}.`)
  }
  return out.length ? out.slice(0, 1) : [`Here's how they compare.`]
}

function scoreLine(p) {
  const m = String(p.score || '').match(/(\d+)\s*[-–:]\s*(\d+)/)
  if (!m) return `${p.home} against ${p.away}.`
  const [h, a] = [+m[1], +m[2]]
  if (h > a) return `${p.home} beat ${p.away} ${h}-${a}.`
  if (h < a) return `${p.away} won ${a}-${h} at ${p.home}.`
  return `${p.home} and ${p.away} drew ${h}-${a}.`
}

function buildResultScenes(cfg, picks, recap) {
  const n = picks.length, cw = cfg.currency_word
  const rec = [recap.won ? `${word(recap.won)} won` : 'no winners', `${word(recap.lost)} lost`, recap.void ? `${word(recap.void)} void` : ''].filter(Boolean).join(', ')
  const scenes = [{ type: 'rintro', say: [`${cfg.day_label || weekday(cfg.date)}'s results: ${rec}.`, `Here's how they landed.`] }]
  picks.forEach((p, i) => {
    const pk = p.say || (/^draw$/i.test(p.pick) ? 'the draw' : p.pick)
    scenes.push({
      type: 'result', i, say: [scoreLine(p),
        p.result === 'won' ? `Our pick, ${pk}, landed at ${odds(p.odds)}.` : p.result === 'void' ? `Our pick, ${pk}, was void, so the stake comes back.` : `Our pick, ${pk}, lost.`],
    })
  })
  const roi = recap.profit / recap.total * 100
  scenes.push({
    type: 'totals', say: [
      `Staking ${money(cfg.stake_example)} ${cw} split by units, you'd have got back ${money(recap.returned)} ${cw}.`,
      recap.profit >= 0 ? `That's a profit of ${money(recap.profit)} ${cw}, ${Math.round(roi)} percent on the day.`
        : `That's down ${money(-recap.profit)} ${cw} on the day. We post every result, good days and bad.`,
    ],
  })
  scenes.push({ type: 'outro', say: [{ say: `Tomorrow's picks on ${cfg.cta.say || cfg.cta.url.replace(/\./g, ' dot ')}.`, show: `Tomorrow's picks on ${cfg.cta.url}.` }, `Only stake what you can afford to lose.`] })
  return scenes
}

export function buildScenes(cfg, picks, recap) {
  if (cfg.mode === 'results') return buildResultScenes(cfg, picks, recap)
  const n = picks.length
  const scenes = [{ type: 'intro', say: [`${word(n)[0].toUpperCase() + word(n).slice(1)} ${cfg.competition || ''} picks for ${weekday(cfg.date)}.`.replace(/\s+/g, ' '), `Here's the board.`] }]
  picks.forEach((p, i) => {
    scenes.push({ type: 'match', i, say: [opener(i, n, p), favourite(p)].filter(Boolean) })
    scenes.push({ type: 'stats', i, say: stats(p) })
    scenes.push({
      type: 'pick', i, say: [
        `The pick: ${p.say || p.pick} at ${odds(p.odds)}.`,
        p.value
          ? `We make it ${pct(p.model)}, the bookmaker ${Math.round(p.market)}: value, so ${p.units} units.`
          : `We make it ${pct(p.model)}, the bookmaker ${Math.round(p.market)}: a thin price, so keep it small, ${p.units} units.`,
      ],
    })
  })
  scenes.push({
    type: 'recap', say: [
      `Here's the full slate.`,
      `Staking ${money(cfg.stake_example)} ${cfg.currency_word} across all ${word(n)}? One unit is about ${money(recap.oneUnit)} ${cfg.currency_word}.`,
    ],
  })
  // { say, show }: the voice says one thing, the caption shows another (e.g. the web address)
  scenes.push({ type: 'outro', say: [{ say: `Full analysis on ${cfg.cta.say || cfg.cta.url.replace(/\./g, ' dot ')}.`, show: `Full analysis on ${cfg.cta.url}.` }, `Only stake what you can afford to lose.`] })
  return scenes
}
