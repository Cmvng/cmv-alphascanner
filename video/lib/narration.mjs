// Writes the voiceover from the picks data, the way a presenter would say it. Every number comes from
// the data; nothing is invented. No "sure", "banker", "guaranteed" or "fixed": predictions, not promises.
// Each line is { say, show }: what the voice says and what the caption shows (digits, the web address).

const WORDS = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten']
const word = n => WORDS[n] ?? String(n)
const Cap = s => s[0].toUpperCase() + s.slice(1)
const odds = v => v.toFixed(2)
const DIG = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine']
const TEENS = ['ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen']
const TENS = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety']
const num = n => n < 10 ? DIG[n] : n < 20 ? TEENS[n - 10] : TENS[Math.floor(n / 10)] + (n % 10 ? '-' + DIG[n % 10] : '')
// 1.28 → "one point two eight" (the voice reads digits after a point one by one, like punters do)
const oddsSay = v => { const [a, b] = v.toFixed(2).split('.'); return `${num(+a)} point ${DIG[+b[0]]}${b[1] !== '0' ? ' ' + DIG[+b[1]] : ''}` }
const money = v => Math.round(v).toLocaleString('en-US')
const pct = v => Math.round(v)
// how the voice should say names it gets wrong (captions keep the real spelling). Add to this as you find them;
// a pick can also carry "say_home" / "say_away".
const SAY_NAMES = { Ikorodu: 'Eekorodoo', Remo: 'Raymo', Kano: 'Kahno', Lobi: 'Lobee', Leicester: 'Lester' }
const speakNames = t => t.replace(/\b(Ikorodu|Remo|Kano|Lobi|Leicester)\b/g, w => SAY_NAMES[w])
const L = (say, show = say) => ({ say: speakNames(say), show })
const pick = (i, arr) => arr[i % arr.length]

// "Over 1.5 Goals" → "over one and a half goals"; "Double Chance: Draw or Norway" → "Norway or the draw"
export function spokenPick(p) {
  if (p.say) return p.say
  let s = p.pick.replace(/\s+/g, ' ').trim()
  const halves = { '0.5': 'half a', '1.5': 'one and a half', '2.5': 'two and a half', '3.5': 'three and a half', '4.5': 'four and a half' }
  s = s.replace(/\b(over|under)\s+(\d\.5)\b/gi, (_, ou, n) => `${ou.toLowerCase()} ${halves[n] || n}`)
  s = s.replace(/^double chance:?\s*draw or (.+)$/i, '$1 or the draw').replace(/^double chance:?\s*(.+) or draw$/i, '$1 or the draw')
  s = s.replace(/^draw$/i, 'the draw').replace(/\bbtts\b/i, 'both teams to score').replace(/\bdnb\b/i, 'draw no bet')
  return s.replace(/ to Win$/i, ' to win').replace(/ Goals$/i, ' goals').replace(/\s*&\s*/g, ' and ')
}
// what the caption shows: the same short label as the pick card ("Norway or Draw", not "Double Chance: Draw or Norway")
const shownPick = p => {
  const s = p.pick.trim()
  const m = s.match(/^double chance:?\s*draw or (.+)$/i) || s.match(/^double chance:?\s*(.+) or draw$/i)
  if (m) return `${m[1]} or the draw`
  return /^draw$/i.test(s) ? 'the draw' : s.replace(/ to Win$/i, ' to win').replace(/^(Over|Under) /, (_, w) => w.toLowerCase() + ' ').replace(/ Goals$/, ' goals')
}

function context(p) {
  if (p.home_win !== undefined) {
    const fav = p.home_win >= p.away_win ? p.home : p.away, fp = Math.max(p.home_win, p.away_win)
    if (fp >= 65) return `and our model makes ${fav} big favourites`
    if (p.draw >= Math.max(p.home_win, p.away_win)) return `and our model sees a tight one`
    if (fp - Math.min(p.home_win, p.away_win) >= 10) return `and our model leans ${fav}`
  }
  if (p.xg_home !== undefined && p.xg_home + p.xg_away >= 2.9) return `and our model expects goals`
  if (p.form_home) {
    const w = (s = '') => (s.match(/W/g) || []).length
    if (w(p.form_home) >= 4) return `with ${p.home} on ${word(w(p.form_home))} wins from five`
    if (w(p.form_away) >= 4) return `with ${p.away} on ${word(w(p.form_away))} wins from five`
  }
  return ''
}

function opener(i, n, p) {
  const ctx = context(p)
  const vs = pick(i, [`${p.home} host ${p.away}`, `${p.home} against ${p.away}`, `${p.home} versus ${p.away}`])
  const head = i === 0 ? `Pick one: ${vs}` : i === n - 1 ? `And the last one: ${vs}` : `Pick ${word(i + 1)}: ${vs}`
  return L(`${head}${ctx ? ', ' + ctx : ''}.`)
}

function thePick(i, p) {
  const form = (s, o) => pick(i, [`We're backing ${s}, at ${o}.`, `The pick: ${s}, at ${o}.`, `We're on ${s}, priced at ${o}.`])
  return L(form(spokenPick(p), oddsSay(p.odds)), form(shownPick(p), odds(p.odds)))
}

function numbers(i, p) {
  const book = pct(p.market), ours = pct(p.model)
  if (p.signal === 3) return L(pick(i, [`Bookies say ${book} percent, our model ${ours}. Three bars.`, `Bookies: ${book} percent. Our model: ${ours}. Three bars.`]))
  if (p.signal === 2) return L(pick(i, [`Bookies say ${book} percent, our model ${ours}. Two bars.`, `Bookies: ${book} percent. Us: ${ours}. Two bars.`]))
  return L(`Bookies say ${book} percent, we say ${ours}. One bar, keep it light.`)
}

function scoreLine(p) {
  const m = String(p.score || '').match(/(\d+)\s*[-–:]\s*(\d+)/)
  if (!m) return null
  const [h, a] = [+m[1], +m[2]], hi = Math.max(h, a), lo = Math.min(h, a)
  const g = n => n === 0 ? 'nil' : num(n)              // football says "three nil"
  const H = p.say_home || p.home, A = p.say_away || p.away
  if (h > a) return L(`${H} beat ${A} ${g(hi)} ${g(lo)}.`, `${p.home} beat ${p.away} ${hi}–${lo}.`)
  if (h < a) return L(`${A} beat ${H} ${g(hi)} ${g(lo)}, away from home.`, `${p.away} beat ${p.home} ${hi}–${lo}, away from home.`)
  if (h === 0) return L(`${H} and ${A} played out a goalless draw.`, `${p.home} and ${p.away} played out a goalless draw.`)
  return L(`${H} and ${A} drew ${num(h)} all.`, `${p.home} and ${p.away} drew ${h}–${a}.`)
}

function buildResultScenes(cfg, picks, recap) {
  const n = picks.length, cw = cfg.currency_word, cur = cfg.currency
  const { won } = recap
  const lead = won === n ? `All ${word(n)} landed!` : won / n >= 0.6 ? `${Cap(word(won))} from ${word(n)}!`
    : won === 0 ? `A bad day: none of the ${word(n)} landed.`
      : recap.profit >= 0 ? `Only ${word(won)} from ${word(n)}, but the prices paid.` : `A tough one: ${word(won)} from ${word(n)}.`
  const back = recap.profit >= 0
    ? L(`${money(cfg.stake_example)} ${cw}, split by the bars, came back as ${money(recap.returned)}.`, `${cur}${money(cfg.stake_example)} split by the bars came back as ${cur}${money(recap.returned)}.`)
    : L(`${money(cfg.stake_example)} ${cw}, split by the bars, came back as ${money(recap.returned)}. Here's every result.`, `${cur}${money(cfg.stake_example)} split by the bars came back as ${cur}${money(recap.returned)}. Here's every result.`)
  const scenes = [{ type: 'rhook', say: [L(lead), back] }]
  picks.forEach((p, i) => {
    const s = spokenPick(p)
    const verdict = p.result === 'won' ? L(`${Cap(s)}: landed, at ${oddsSay(p.odds)}.`, `${Cap(shownPick(p))}: landed, at ${odds(p.odds)}.`)
      : p.result === 'void' ? L(`${Cap(s)} was void, so the stake comes back.`, `${Cap(shownPick(p))} was void, so the stake comes back.`)
        : L(`${Cap(s)} didn't come in.`, `${Cap(shownPick(p))} didn't come in.`)
    scenes.push({ type: 'result', i, say: [scoreLine(p) || L(`${p.home} against ${p.away}.`), verdict] })
  })
  const roi = Math.round(recap.profit / recap.total * 100)
  scenes.push({
    type: 'rtotal', say: [
      L(`On the day: ${money(recap.total)} staked, ${money(recap.returned)} back.`, `On the day: ${cur}${money(recap.total)} staked, ${cur}${money(recap.returned)} back.`),
      recap.profit >= 0 ? L(`That's ${money(recap.profit)} ${cw} up, ${roi} percent on the stakes.`, `That's ${cur}${money(recap.profit)} up, ${roi}% on the stakes.`)
        : L(`That's ${money(-recap.profit)} ${cw} down. We post every result, wins and losses.`, `That's ${cur}${money(-recap.profit)} down. We post every result, wins and losses.`),
    ],
  })
  scenes.push({ type: 'cta', say: [L(`Next picks ${cfg.next_when}. Follow so you catch them.`), L('Predictions, not guarantees. Eighteen plus.', 'Predictions, not guarantees. 18+.')] })
  return scenes
}

export function buildScenes(cfg, picks, recap) {
  if (cfg.mode === 'results') return buildResultScenes(cfg, picks, recap)
  const n = picks.length
  const best = [...picks].sort((a, b) => (b.signal - a.signal) || (b.model - a.model))[0]
  const comp = cfg.competition ? ` ${cfg.competition}` : ''
  const when = cfg.when || 'today'
  const scenes = [{
    type: 'hook', say: [
      L(`${Cap(word(n))}${comp} picks ${when}, and one of them our model rates at ${pct(best.model)} percent.`),
    ],
  }]
  picks.forEach((p, i) => scenes.push({ type: 'pick', i, say: [opener(i, n, p), thePick(i, p), numbers(i, p)] }))
  scenes.push({
    type: 'slate', say: [
      L(`That's the slate. Staking ${money(cfg.stake_example)} ${cfg.currency_word}? Split it by the bars.`,
        `That's the slate. Staking ${cfg.currency}${money(cfg.stake_example)}? Split it by the bars.`),
    ],
  })
  scenes.push({ type: 'cta', say: [L(`Results ${cfg.results_when}. Follow so you don't miss them.`), L('Predictions, not guarantees. Eighteen plus.', 'Predictions, not guarantees. 18+.')] })
  return scenes
}
