#!/usr/bin/env node
// cmvng picks video maker.
//
//   node video/make-video.mjs video/templates/picks.example.json
//   node video/make-video.mjs my-picks.csv --no-voice
//   node video/make-video.mjs my-picks.json --stills 2,8,15     (quick preview images, no video)
//
// Options: --out <file.mp4>  --fps 30  --workers 3  --no-voice  --stills t1,t2,...
// Needs: Node 18+, Playwright (Chromium), ffmpeg, and for the voice: python3 + `pip install piper-tts numpy`.

import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { spawn, execSync } from 'node:child_process'
import { createRequire } from 'node:module'
import { loadInput } from './lib/input.mjs'
import { resolveBadge } from './lib/badges.mjs'
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

function run(cmd, args, opts = {}) {
  return new Promise((res, rej) => {
    const p = spawn(cmd, args, { stdio: ['ignore', 'inherit', 'inherit'], ...opts })
    p.on('close', c => c === 0 ? res() : rej(new Error(`${cmd} exited with ${c}`)))
  })
}
function loadPlaywright() {
  const req = createRequire(import.meta.url)
  for (const p of [process.env.PLAYWRIGHT_PATH, 'playwright', path.join(execSync('npm root -g').toString().trim(), 'playwright')]) {
    if (!p) continue
    try { return req(p) } catch {}
  }
  throw new Error('Playwright not found. Run: npm i -D playwright && npx playwright install chromium')
}

// ---------------------------------------------------------------- 1. data
const { cfg, picks, recap } = loadInput(input)
const slug = path.basename(input).replace(/\.(json|csv)$/i, '')
const OUT = path.join(DIR, 'out', slug), CACHE = path.join(DIR, '.cache')
fs.rmSync(OUT, { recursive: true, force: true }); fs.mkdirSync(OUT, { recursive: true })
console.log(`\n${cfg.title} · ${cfg.competition} · ${cfg.date}`)
for (const p of picks) {
  p.bh = await resolveBadge(p.home, p.crest_home, CACHE, OUT)
  p.ba = await resolveBadge(p.away, p.crest_away, CACHE, OUT)
  console.log(`  ${(p.home + ' v ' + p.away).padEnd(30)} ${p.pick.padEnd(26)} @${p.odds.toFixed(2)}  model ${p.model}%  book ${p.market.toFixed(0)}%  edge ${(p.edge * 100).toFixed(1).padStart(5)}%  → ${p.units}u  (${cfg.currency}${p.stake})`)
}

// ---------------------------------------------------------------- 2. voiceover
const scenes = buildScenes(cfg, picks, recap)
const spoken = x => typeof x === 'string' ? x : x.say, shown = x => typeof x === 'string' ? x : x.show
const sentences = scenes.flatMap((s, k) => s.say.map((x, j) => ({ id: `s${k}_${j}`, text: spoken(x), k })))
fs.writeFileSync(path.join(OUT, 'script.txt'), scenes.map(s => s.say.map(shown).join(' ')).join('\n\n') + '\n')
let durs = null
const voiceOn = !flag('no-voice', false) && !flag('stills', false)
if (voiceOn) {
  try {
    const [lang, name, quality] = cfg.voice.split('-')
    const vfile = path.join(CACHE, 'voices', `${cfg.voice}.onnx`)
    if (!fs.existsSync(vfile)) {
      console.log(`Downloading voice ${cfg.voice} (one time)…`)
      fs.mkdirSync(path.dirname(vfile), { recursive: true })
      const base = `https://huggingface.co/rhasspy/piper-voices/resolve/main/${lang.split('_')[0]}/${lang}/${name}/${quality}/${cfg.voice}`
      for (const ext of ['.onnx', '.onnx.json']) {
        const r = await fetch(base + ext); if (!r.ok) throw new Error(`voice download failed (${r.status})`)
        fs.writeFileSync(vfile.replace('.onnx', ext), Buffer.from(await r.arrayBuffer()))
      }
    }
    fs.writeFileSync(path.join(OUT, 'sentences.json'), JSON.stringify(sentences))
    console.log('Recording the voiceover…')
    await run(PY, [path.join(DIR, 'audio.py'), 'speak', path.join(OUT, 'sentences.json'), vfile, path.join(OUT, 'voice'), String(cfg.voice_speed)])
    durs = JSON.parse(fs.readFileSync(path.join(OUT, 'voice', 'durations.json'), 'utf8'))
  } catch (e) {
    console.warn(`  ! Voice unavailable (${e.message}). Making the video with captions only.`)
  }
}
const est = s => s.split(/\s+/).length / (2.6 * cfg.voice_speed) + 0.25 // seconds, when there's no voice

// ---------------------------------------------------------------- 3. timeline + captions
const MIN = { intro: 6.0, match: 4.4, stats: 4.4, pick: 6.4, recap: 7.0, outro: 5.0, rintro: 6.4, result: 5.2, totals: 7.4 }
let t = 0
const captions = []
scenes.forEach((sc, k) => {
  sc.start = t
  let st = t + (k === 0 ? 0.6 : 0.5)
  sc.sentences = sc.say.map((x, j) => {
    const id = `s${k}_${j}`, text = shown(x), d = durs?.[id] ?? est(spoken(x))
    const s = { id, text, start: st, dur: d, wav: durs ? path.join(OUT, 'voice', `${id}.wav`) : null }
    // word timings: share the sentence by word length; chunk into caption lines of ≤6 words
    const words = text.split(/\s+/), weights = words.map(w => w.length + 2), W = weights.reduce((a, b) => a + b, 0)
    let tw = st; const timed = words.map((w, i) => { const t0 = tw; tw += d * weights[i] / W; return { w, t0, t1: tw } })
    let chunk = []
    timed.forEach((w, i) => {
      chunk.push(w)
      const end = i === timed.length - 1, brk = /[,.;:?!]$/.test(w.w) && chunk.length >= 3
      if (end || chunk.length >= 6 || brk) { captions.push({ start: chunk[0].t0, end: chunk.at(-1).t1, words: chunk }); chunk = [] }
    })
    st += d + 0.18
    return s
  })
  sc.dur = Math.max(MIN[sc.type], st - t + 0.45)
  t += sc.dur
})
// keep each caption on screen until the next one starts (within the same scene)
captions.forEach((c, i) => { const n = captions[i + 1]; c.end = n && n.start - c.end < 0.6 ? n.start : c.end + 0.35 })
const DURATION = t
console.log(`Video length: ${DURATION.toFixed(1)}s, ${captions.length} caption lines`)

// ---------------------------------------------------------------- 4. page
fs.cpSync(path.join(DIR, 'assets'), path.join(OUT, 'assets'), { recursive: true })
const DATA = { cfg, picks, recap, scenes: scenes.map(({ type, i, start, dur }) => ({ type, i, start, dur })), captions, duration: DURATION }
const page = fs.readFileSync(path.join(DIR, 'scene.html'), 'utf8')
  .replace('<script>\nconst D = window.DATA', `<script>window.DATA=${JSON.stringify(DATA).replace(/</g, '\\u003c')}</script>\n<script>\nconst D = window.DATA`)
fs.writeFileSync(path.join(OUT, 'index.html'), page)

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

// ---------------------------------------------------------------- stills (preview)
const stills = flag('stills', false)
if (stills) {
  const { browser, pg, shot } = await openPage()
  fs.mkdirSync(path.join(OUT, 'stills'), { recursive: true })
  const times = stills === true ? scenes.map(s => s.start + Math.min(s.dur - 0.4, 2.6)) : String(stills).split(',').map(Number)
  for (const tt of times) {
    await pg.evaluate(x => window.renderAt(x), tt)
    fs.writeFileSync(path.join(OUT, 'stills', `t_${tt.toFixed(2)}.png`), await shot())
  }
  await browser.close()
  console.log(`Stills saved in ${path.join(OUT, 'stills')}`)
  process.exit(0)
}

// ---------------------------------------------------------------- 5. render frames in parallel
const FRAMES = Math.ceil(DURATION * FPS)
const per = Math.ceil(FRAMES / WORKERS)
const t0 = Date.now()
let done = 0
console.log(`Rendering ${FRAMES} frames with ${WORKERS} workers…`)
await Promise.all(Array.from({ length: WORKERS }, async (_, w) => {
  const a = w * per, b = Math.min(FRAMES, a + per)
  if (a >= b) return
  const { browser, pg, shot } = await openPage()
  const ff = spawn(FF, ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(FPS), '-i', '-',
    '-c:v', 'libx264', '-preset', 'medium', '-crf', '20', '-maxrate', '10M', '-bufsize', '20M', '-pix_fmt', 'yuv420p', '-r', String(FPS), path.join(OUT, `seg_${w}.mp4`)], { stdio: ['pipe', 'inherit', 'inherit'] })
  for (let f = a; f < b; f++) {
    await pg.evaluate(x => window.renderAt(x), f / FPS)
    if (!ff.stdin.write(await shot())) await new Promise(r => ff.stdin.once('drain', r))
    if (++done % 300 === 0) console.log(`  ${done}/${FRAMES} frames · ${((Date.now() - t0) / 1000).toFixed(0)}s`)
  }
  ff.stdin.end(); await new Promise(r => ff.on('close', r)); await browser.close()
}))

// ---------------------------------------------------------------- 6. sound + final file
const segs = Array.from({ length: WORKERS }, (_, w) => path.join(OUT, `seg_${w}.mp4`)).filter(f => fs.existsSync(f))
fs.writeFileSync(path.join(OUT, 'segments.txt'), segs.map(f => `file '${f}'`).join('\n'))
const final = flag('out', null) || path.join(OUT, `${slug}.mp4`)
const audioIn = [], filters = []
if (durs) {
  fs.writeFileSync(path.join(OUT, 'timeline.json'), JSON.stringify({ duration: DURATION, sentences: scenes.flatMap(s => s.sentences) }))
  await run(PY, [path.join(DIR, 'audio.py'), 'mix', path.join(OUT, 'timeline.json'), path.join(OUT, 'voice.wav')])
  audioIn.push('-i', path.join(OUT, 'voice.wav'))
}
let musicFile = null
if (cfg.music === true) {
  try { musicFile = path.join(OUT, 'music.wav'); await run(PY, [path.join(DIR, 'audio.py'), 'music', String(DURATION + 1), musicFile]) } catch { musicFile = null }
} else if (typeof cfg.music === 'string' && fs.existsSync(cfg.music)) musicFile = cfg.music
if (musicFile) audioIn.push('-stream_loop', '-1', '-i', musicFile)

const args = ['-y', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', path.join(OUT, 'segments.txt'), ...audioIn]
if (durs && musicFile) {
  args.push('-filter_complex', '[1:a]asplit=2[v1][v2];[2:a]volume=0.45[m];[m][v1]sidechaincompress=threshold=0.02:ratio=6:attack=15:release=400[md];[v2][md]amix=inputs=2:normalize=0,loudnorm=I=-16:TP=-1.5[a]', '-map', '0:v', '-map', '[a]')
} else if (durs || musicFile) {
  args.push('-filter_complex', `[1:a]${musicFile && !durs ? 'volume=0.6,' : ''}loudnorm=I=-16:TP=-1.5[a]`, '-map', '0:v', '-map', '[a]')
}
args.push('-c:v', 'copy', ...(audioIn.length ? ['-c:a', 'aac', '-b:a', '192k', '-ar', '48000', '-ac', '2'] : []), '-t', DURATION.toFixed(2), '-movflags', '+faststart', final)
await run(FF, args)
for (const f of segs) fs.rmSync(f)
console.log(`\nDone in ${((Date.now() - t0) / 1000).toFixed(0)}s → ${final}`)
console.log(`Voiceover script (good as the post caption): ${path.join(OUT, 'script.txt')}`)
