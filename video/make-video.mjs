#!/usr/bin/env node
// cmvng picks / results video maker.
//
//   node video/make-video.mjs video/templates/picks.example.json
//   node video/make-video.mjs my-picks.csv --no-voice
//   node video/make-video.mjs my-picks.json --stills 2,8,15     (quick preview images, no video)
//
// Options: --out <file.mp4>  --fps 30  --workers 3  --no-voice  --stills t1,t2,...
// Needs: Node 18+, Playwright (Chromium), ffmpeg, python3 with numpy + kokoro-onnx (the voice).

import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { spawn, execSync } from 'node:child_process'
import { createRequire } from 'node:module'
import { loadInput } from './lib/input.mjs'
import { resolveBadge, isCountry } from './lib/badges.mjs'
import { resolveStadium } from './lib/stadium.mjs'
import { resolvePlayers } from './lib/players.mjs'
import { resolvePerson } from './lib/people.mjs'
import { buildScenes } from './lib/narration.mjs'

const DIR = path.dirname(new URL(import.meta.url).pathname)
const argv = process.argv.slice(2)
const flag = (n, d) => { const i = argv.indexOf(`--${n}`); return i < 0 ? d : (argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[i + 1] : true) }
const input = argv.find(a => !a.startsWith('--') && /\.(json|csv)$/i.test(a))
if (!input) { console.log('Usage: node video/make-video.mjs <picks.json|picks.csv> [--out file.mp4] [--no-voice] [--stills 2,8]'); process.exit(1) }
const FPS = Number(flag('fps', 30))
const WORKERS = Number(flag('workers', Math.max(1, Math.min(4, os.cpus().length - 1))))
const PY = process.env.PYTHON || 'python3'
const FF = process.env.FFMPEG || 'ffmpeg'

// Built-in music (Mixkit Stock Music Free License: free for videos, including commercial use). Downloaded once.
// start = where the beat drops, so the video opens on energy.
const TRACKS = {
  picks: { url: 'https://assets.mixkit.co/music/739/739.mp3', start: 20.4, credit: 'Music: "Never Going Broke" (Mixkit)' },
  results: { url: 'https://assets.mixkit.co/music/1183/1183.mp3', start: 12.7, credit: 'Music: "K.O." (Mixkit)' },
}

function run(cmd, args, opts = {}) {
  return new Promise((res, rej) => {
    const p = spawn(cmd, args, { stdio: ['ignore', 'inherit', 'inherit'], ...opts })
    p.on('close', c => c === 0 ? res() : rej(new Error(`${cmd} exited with ${c}`)))
  })
}
async function download(url, file) {
  if (fs.existsSync(file)) return file
  fs.mkdirSync(path.dirname(file), { recursive: true })
  const r = await fetch(url, { headers: { 'User-Agent': 'cmvng-video/1.0 (https://cmvngpicks.com)' } })
  if (!r.ok) throw new Error(`download failed (${r.status}) ${url}`)
  fs.writeFileSync(file + '.part', Buffer.from(await r.arrayBuffer())); fs.renameSync(file + '.part', file)
  return file
}
function loadPlaywright() {
  const req = createRequire(import.meta.url)
  for (const p of [process.env.PLAYWRIGHT_PATH, 'playwright', path.join(execSync('npm root -g').toString().trim(), 'playwright')]) {
    if (!p) continue
    try { return req(p) } catch {}
  }
  throw new Error('Playwright not found. Run: npm i -D playwright && npx playwright install chromium')
}

// ---------------------------------------------------------------- 1. data, badges, stadiums
const { cfg, picks, recap } = loadInput(input)
const slug = path.basename(input).replace(/\.(json|csv)$/i, '')
const OUT = path.join(DIR, 'out', slug), CACHE = path.join(DIR, '.cache')
fs.rmSync(OUT, { recursive: true, force: true }); fs.mkdirSync(OUT, { recursive: true })
console.log(`\n${cfg.title} · ${cfg.competition} · ${cfg.date}`)
for (const p of picks) {
  p.bh = await resolveBadge(p.home, p.crest_home, CACHE, OUT)
  p.ba = await resolveBadge(p.away, p.crest_away, CACHE, OUT)
  const own = typeof p.stadium === 'string' ? p.stadium : null
  p.stadium = cfg.stadiums === false ? null
    : await resolveStadium(p.home, { national: isCountry(p.home), country: p.country, cacheDir: CACHE, outDir: OUT, own, ownCredit: p.stadium_credit })
  if (cfg.style === 'players') p.players = await resolvePlayers(p.home, { national: isCountry(p.home), country: p.country, cacheDir: CACHE, outDir: OUT })
  if (cfg.mode === 'preview') { console.log(`  ${p.home} v ${p.away}  ${p.stadium ? '📷 ' + p.stadium.venue : '(no stadium photo)'}`); continue }
  console.log(`  ${(p.home + ' v ' + p.away).padEnd(28)} ${p.pick.padEnd(26)} @${p.odds.toFixed(2)}  model ${p.model}%  book ${p.market.toFixed(0)}%  edge ${(p.edge * 100).toFixed(1).padStart(5)}%  → ${p.signal} bar${p.signal > 1 ? 's' : ' '} (${cfg.currency}${p.stake})  ${p.stadium ? '📷 ' + p.stadium.venue : '(no stadium photo)'}`)
}

// AI Analyst previews: a free photo of each player to watch (else the card shows the crest)
for (const x of cfg.analysis?.players || []) x.photo = x.photo === false ? null : await resolvePerson(x.name, { cacheDir: CACHE, outDir: OUT })

// team colours from each crest or flag (the broadcast style's panels, the glows behind the badges)
const imgs = picks.flatMap(p => [p.bh, p.ba]).filter(b => b.src)
if (imgs.length) {
  try {
    const cols = JSON.parse(execSync(`"${PY}" "${path.join(DIR, 'audio.py')}" colour ${imgs.map(b => JSON.stringify(path.join(OUT, b.src))).join(' ')}`).toString())
    imgs.forEach((b, i) => { if (cols[i]) b.colour = cols[i] })
  } catch (e) { console.warn(`  ! team colours: ${e.message.split('\n')[0]}`) }
}
if (cfg.style === 'players') console.log(`Players style: ${picks.filter(p => p.players?.length).length}/${picks.length} matches have recent photos (the rest use the stadium)`)

// ---------------------------------------------------------------- 2. music (needed first: cuts land on its beat)
const stills = flag('stills', false)
let music = null
if (cfg.music !== false) {
  try {
    const track = typeof cfg.music === 'string' && cfg.music !== 'auto' ? { file: cfg.music, start: cfg.music_start ?? 0, credit: '' }
      : { ...TRACKS[cfg.mode === 'results' ? 'results' : 'picks'] }
    if (track.url) track.file = await download(track.url, path.join(CACHE, 'music', path.basename(track.url)))
    const bj = path.join(OUT, 'beats.json')
    await run(PY, [path.join(DIR, 'audio.py'), 'beats', track.file, String(track.start), bj])
    music = { ...track, ...JSON.parse(fs.readFileSync(bj, 'utf8')) }
    console.log(`Music: ${path.basename(track.file)} from ${music.start.toFixed(2)}s · ${music.bpm.toFixed(1)} bpm`)
  } catch (e) { console.warn(`  ! Music unavailable (${e.message}).`) }
}

// ---------------------------------------------------------------- 3. voiceover
const scenes = buildScenes(cfg, picks, recap)
const spoken = x => typeof x === 'string' ? x : x.say, shown = x => typeof x === 'string' ? x : x.show
const sentences = scenes.flatMap((s, k) => s.say.map((x, j) => ({ id: `s${k}_${j}`, text: spoken(x), k })))
fs.writeFileSync(path.join(OUT, 'script.txt'), scenes.map(s => s.say.map(shown).join(' ')).join('\n\n') + '\n')
let durs = null
const voiceOn = !flag('no-voice', false) && !stills
if (voiceOn) {
  try {
    let voice = cfg.voice
    const models = path.join(CACHE, 'kokoro')
    if (voice.endsWith('.onnx')) {
      if (!fs.existsSync(voice)) throw new Error(`voice file not found: ${voice}`)
    } else {
      console.log('Getting the voice model (one time, ~350 MB)…')
      for (const f of ['kokoro-v1.0.onnx', 'voices-v1.0.bin']) await download(`https://huggingface.co/fastrtc/kokoro-onnx/resolve/main/${f}`, path.join(models, f))
    }
    fs.writeFileSync(path.join(OUT, 'sentences.json'), JSON.stringify(sentences))
    console.log(`Recording the voiceover (${voice})…`)
    await run(PY, [path.join(DIR, 'audio.py'), 'speak', path.join(OUT, 'sentences.json'), voice, path.join(OUT, 'voice'), String(cfg.voice_speed), models])
    durs = JSON.parse(fs.readFileSync(path.join(OUT, 'voice', 'durations.json'), 'utf8'))
  } catch (e) {
    console.warn(`  ! Voice unavailable (${e.message}). Making the video with captions only.`)
  }
}
const est = s => s.split(/\s+/).length / (2.7 * cfg.voice_speed) + 0.2 // seconds, when there's no voice

// ---------------------------------------------------------------- 4. timeline + captions
const MIN = { hook: 4.2, pick: 7.0, slate: 5.0, cta: 4.4, rhook: 5.4, result: 4.6, rtotal: 6.2, pv_hook: 5.0, pv_form: 6.0, pv_stats: 7.0, pv_model: 7.5, pv_score: 5.5, pv_cta: 4.5, pv_stake: 6.0, pv_players: 8.0, pv_tactics: 8.0, pv_expect: 7.0, pv_round: 6.0 }
const LEAD = { hook: 0.2, rhook: 0.2 }, GAP = 0.12, TAIL = 0.3
const BEAT = music?.beat || null
let t = 0
const captions = []
scenes.forEach((sc, k) => {
  sc.start = t
  let st = t + (LEAD[sc.type] ?? 0.32)
  sc.sentences = sc.say.map((x, j) => {
    const id = `s${k}_${j}`, text = shown(x), d = durs?.[id] ?? est(spoken(x))
    const s = { id, text, start: st, dur: d, wav: durs ? path.join(OUT, 'voice', `${id}.wav`) : null }
    // word timings: share the sentence by word length; captions of ≤5 words, broken at punctuation
    const words = text.split(/\s+/), weights = words.map(w => w.length + 2), W = weights.reduce((a, b) => a + b, 0)
    let tw = st; const timed = words.map((w, i) => { const t0 = tw; tw += d * weights[i] / W; return { w, t0, t1: tw } })
    let chunk = []
    timed.forEach((w, i) => {
      chunk.push(w)
      const end = i === timed.length - 1, brk = /[,.;:?!]$/.test(w.w) && chunk.length >= 2
      if (end || chunk.length >= 5 || brk) { captions.push({ start: chunk[0].t0, end: chunk.at(-1).t1, words: chunk }); chunk = [] }
    })
    st += d + GAP
    return s
  })
  let end = Math.max(t + MIN[sc.type], st - GAP + TAIL)
  if (BEAT) end = Math.ceil((end - 0.02) / BEAT) * BEAT          // every cut lands on the beat
  sc.dur = end - t
  sc.lines = sc.sentences.map(s => [s.start - sc.start, s.dur])
  t = end
})
captions.forEach((c, i) => { const n = captions[i + 1]; c.end = n && n.start - c.end < 0.5 ? n.start : c.end + 0.3 })
const DURATION = t + 0.4
console.log(`Video length: ${DURATION.toFixed(1)}s, ${captions.length} caption lines`)

// ---------------------------------------------------------------- 5. page
fs.cpSync(path.join(DIR, 'assets'), path.join(OUT, 'assets'), { recursive: true })
cfg.when_word ||= cfg.when === 'tonight' ? 'Tonight' : 'Today'
const DATA = { cfg, picks, recap, beat: BEAT, scenes: scenes.map(({ type, i, start, dur, lines }) => ({ type, i, start, dur, lines })), captions, duration: DURATION }
const page = fs.readFileSync(path.join(DIR, 'scene.html'), 'utf8')
  .replace('<script>\nconst D = window.DATA', `<script>window.DATA=${JSON.stringify(DATA).replace(/</g, '\\u003c')}</script>\n<script>\nconst D = window.DATA`)
fs.writeFileSync(path.join(OUT, 'index.html'), page)
const credits = [...(cfg.analysis?.players || []).map(x => x.photo?.credit), ...new Set(picks.flatMap(p => cfg.style === 'broadcast' ? [] : cfg.style === 'players' && p.players?.length ? p.players.map(x => x.credit) : [p.stadium?.credit]).filter(Boolean)), music?.credit].filter(Boolean)
fs.writeFileSync(path.join(OUT, 'credits.txt'), credits.join('\n') + '\n')

const { chromium } = loadPlaywright()
async function openPage() {
  const browser = await chromium.launch({ args: ['--allow-file-access-from-files', '--force-color-profile=srgb'] })
  const pg = await browser.newPage({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 1 })
  pg.on('pageerror', e => console.error('  page error:', e.message))
  await pg.goto('file://' + path.join(OUT, 'index.html'))
  await pg.evaluate(() => window.ready)
  const cdp = await pg.context().newCDPSession(pg)
  const shot = async () => Buffer.from((await cdp.send('Page.captureScreenshot', { format: 'png', optimizeForSpeed: true })).data, 'base64')
  return { browser, pg, shot }
}

// ---------------------------------------------------------------- monetisation check (match previews for X / YouTube)
// Every word on screen and in the voiceover is read; any betting term stops the render.
const BANNED = /\b(odds|bets?|betting|bettors?|bookies?|bookmakers?|stakes?|staking|wagers?|tips|tipsters?|picks|value bets?|booking codes?|bet ?slips?|accumulators?|accas?|bankers?|sure (?:win|bet)|guaranteed?|fixed match(?:es)?|sportybet|bet9ja|1xbet|betway|bet365|naira|cmvngpicks(?:\.com)?|payouts?|risk[- ]free|handicap|over\/under)\b|₦/gi
async function complianceCheck() {
  const { browser, pg } = await openPage()
  const seen = new Set()
  for (const sc of scenes) {
    await pg.evaluate(x => window.renderAt(x), sc.start + Math.max(0.1, sc.dur - 0.35))
    for (const line of (await pg.evaluate(() => document.getElementById('stage').innerText)).split('\n')) seen.add(line.trim())
  }
  await browser.close()
  for (const x of sentences) seen.add(x.text)
  for (const sc of scenes) for (const x of sc.say) seen.add(shown(x))
  const hits = [...seen].filter(Boolean).flatMap(t => [...t.matchAll(BANNED)].map(m => `"${m[0]}" in: ${t.slice(0, 90)}`))
  if (hits.length && !flag('allow-words', false)) {
    console.error(`\n✗ Not monetisation-safe: betting words found in the preview\n  - ${[...new Set(hits)].join('\n  - ')}\nReword the script/analysis (or pass --allow-words to render anyway).`)
    process.exit(3)
  }
  console.log(`Monetisation check: passed (${seen.size} lines of on-screen text and voiceover, no betting terms)`)
}
if (cfg.mode === 'preview') await complianceCheck()

// ---------------------------------------------------------------- stills (preview)
if (stills) {
  const { browser, pg, shot } = await openPage()
  fs.mkdirSync(path.join(OUT, 'stills'), { recursive: true })
  const times = stills === true ? scenes.map(s => s.start + s.dur - 0.25) : String(stills).split(',').map(Number)
  for (const tt of times) {
    await pg.evaluate(x => window.renderAt(x), tt)
    fs.writeFileSync(path.join(OUT, 'stills', `t_${tt.toFixed(2)}.png`), await shot())
  }
  await browser.close()
  console.log(`Stills saved in ${path.join(OUT, 'stills')}`)
  console.log(scenes.map(s => `  ${s.type.padEnd(7)} ${s.start.toFixed(2)}–${(s.start + s.dur).toFixed(2)}`).join('\n'))
  process.exit(0)
}

// ---------------------------------------------------------------- 6. render frames in parallel
const FRAMES = Math.ceil(DURATION * FPS)
const per = Math.ceil(FRAMES / WORKERS)
const t0 = Date.now()
let done = 0, fx = []
console.log(`Rendering ${FRAMES} frames with ${WORKERS} workers…`)
await Promise.all(Array.from({ length: WORKERS }, async (_, w) => {
  const a = w * per, b = Math.min(FRAMES, a + per)
  if (a >= b) return
  const { browser, pg, shot } = await openPage()
  if (w === 0) fx = await pg.evaluate(() => window.fxEvents())
  const ff = spawn(FF, ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(FPS), '-i', '-',
    '-c:v', 'libx264', '-preset', 'medium', '-crf', '20', '-maxrate', '12M', '-bufsize', '24M', '-pix_fmt', 'yuv420p', '-r', String(FPS), path.join(OUT, `seg_${w}.mp4`)], { stdio: ['pipe', 'inherit', 'inherit'] })
  for (let f = a; f < b; f++) {
    await pg.evaluate(x => window.renderAt(x), f / FPS)
    if (!ff.stdin.write(await shot())) await new Promise(r => ff.stdin.once('drain', r))
    if (++done % 300 === 0) console.log(`  ${done}/${FRAMES} frames · ${((Date.now() - t0) / 1000).toFixed(0)}s`)
  }
  ff.stdin.end(); await new Promise(r => ff.on('close', r)); await browser.close()
}))

// ---------------------------------------------------------------- 7. sound + final file
const segs = Array.from({ length: WORKERS }, (_, w) => path.join(OUT, `seg_${w}.mp4`)).filter(f => fs.existsSync(f))
fs.writeFileSync(path.join(OUT, 'segments.txt'), segs.map(f => `file '${f}'`).join('\n'))
const final = flag('out', null) || path.join(OUT, `${slug}.mp4`)
fs.writeFileSync(path.join(OUT, 'timeline.json'), JSON.stringify({
  duration: DURATION, sentences: durs ? scenes.flatMap(s => s.sentences) : [], fx,
  music: music ? { file: music.file, start: music.start } : null,
}))
await run(PY, [path.join(DIR, 'audio.py'), 'mix', path.join(OUT, 'timeline.json'), path.join(OUT, 'mix.wav')])
await run(FF, ['-y', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', path.join(OUT, 'segments.txt'), '-i', path.join(OUT, 'mix.wav'),
  '-filter_complex', '[1:a]loudnorm=I=-14:TP=-1.5:LRA=9[a]', '-map', '0:v', '-map', '[a]',
  '-c:v', 'copy', '-c:a', 'aac', '-b:a', '192k', '-ar', '48000', '-ac', '2', '-t', DURATION.toFixed(2), '-movflags', '+faststart', final])
for (const f of segs) fs.rmSync(f)
// cover image for the YouTube / X thumbnail: the opening screen once everything has landed
const cover = final.replace(/\.mp4$/, '_cover.jpg')
await run(FF, ['-y', '-loglevel', 'error', '-ss', Math.max(0, scenes[0].start + scenes[0].dur - 0.4).toFixed(2), '-i', final, '-frames:v', '1', '-q:v', '2', cover]).catch(() => {})
console.log(`\nDone in ${((Date.now() - t0) / 1000).toFixed(0)}s → ${final}`)
console.log(`Post caption (the voiceover script): ${path.join(OUT, 'script.txt')}`)
console.log(`Credits to paste in the post: ${path.join(OUT, 'credits.txt')}`)
if (fs.existsSync(cover)) console.log(`Cover image (thumbnail): ${cover}`)
