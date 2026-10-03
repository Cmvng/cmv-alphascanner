#!/usr/bin/env node
// Edit the owner's own recording (a chart screen recording with a face-cam) into a vertical video, in the house style:
// a dark cold open of big numbers, the title on the music's drop, the chart zoomed to what is being pointed at with the
// face below, captions, callouts, a product segment and an end card.
//
//   node video/edit-video.mjs <edl.json> [--fmt vertical|wide] [--stills 3,12.5,40] [--workers 3]
//
// The edit decision list (see video/templates/talking-head/README.md) names the source video, its word timings
// (faster-whisper), where the chart and the face-cam sit in the frame, the cold-open lines and the clips (ranges of
// word indices, each with a zoom, a caption and an optional callout), the product segment and the music.
import fs from 'fs'
import path from 'path'
import { spawn, execSync } from 'child_process'
import { createRequire } from 'module'
import { fileURLToPath } from 'url'

const DIR = path.dirname(fileURLToPath(import.meta.url))
const args = process.argv.slice(2), edlPath = path.resolve(args.find(a => !a.startsWith('--')) || '')
const flag = (n, d) => { const i = args.indexOf('--' + n); return i < 0 ? d : (args[i + 1] && !args[i + 1].startsWith('--') ? args[i + 1] : true) }
if (!fs.existsSync(edlPath)) { console.log('Usage: node video/edit-video.mjs <edl.json> [--stills t1,t2] [--workers 3]'); process.exit(1) }
const EDL = JSON.parse(fs.readFileSync(edlPath, 'utf8')), BASE = path.dirname(edlPath)
const PY = process.env.PYTHON || 'python3', FF = process.env.FFMPEG || 'ffmpeg', FPS = 30, WORKERS = +flag('workers', 3)
const FMT = flag('fmt', 'vertical') === 'wide' ? 'wide' : 'vertical', [VW, VH] = FMT === 'wide' ? [1920, 1080] : [1080, 1920], SUF = FMT === 'wide' ? '_wide' : ''
const slug = 'edit-' + path.basename(edlPath).replace(/\.json$/i, '')
const OUT = path.join(DIR, 'out', slug)
fs.mkdirSync(OUT, { recursive: true })
const run = (cmd, a) => new Promise((res, rej) => { const p = spawn(cmd, a, { stdio: 'inherit' }); p.on('close', c => c ? rej(new Error(`${cmd} exited ${c}`)) : res()) })

// 1. the cut: pieces of the recording on the new timeline, and the cleaned voice
await run(PY, [path.join(DIR, 'lib', 'edit_audio.py'), 'plan', edlPath, OUT])
const plan = JSON.parse(fs.readFileSync(path.join(OUT, 'plan.json'), 'utf8'))

// 2. frames for every piece (30 fps JPEGs), kept between runs of the same edit
const src = plan.source
const dims = String(execSync(`"${FF}" -i "${src}" 2>&1 || true`)).match(/, (\d{3,5})x(\d{3,5})[, ]/)
const [frameW, frameH] = dims ? [+dims[1], +dims[2]] : [1920, 1080]
let k = 0
for (const s of plan.segments) for (const p of s.pieces || []) {
  const dir = path.join(OUT, 'f', `${p.src.toFixed(3)}_${p.dur.toFixed(3)}`)
  if (!fs.existsSync(dir) || !fs.readdirSync(dir).length) {
    fs.mkdirSync(dir, { recursive: true })
    await run(FF, ['-y', '-loglevel', 'error', '-ss', p.src.toFixed(3), '-i', src, '-t', p.dur.toFixed(3), '-vf', `fps=${FPS}${EDL.sharpen === false ? '' : ',unsharp=5:5:0.6:3:3:0'}`, '-q:v', '2', path.join(dir, '%05d.jpg')])
  }
  p.dir = path.relative(OUT, dir); p.n = fs.readdirSync(dir).length; k++
}
console.log(`Frames ready for ${k} pieces`)

// 2b. a coin segment shows the coin itself, live: price, 24h change and 4-hour candles from Coinbase (public data),
// with the levels the owner talked about
const coin = plan.segments.find(s => s.kind === 'product' && s.kind2 === 'coin')
if (coin) {
  const get = u => JSON.parse(execSync(`curl -sS -f --max-time 30 "${u}"`).toString())
  const st = get(`https://api.exchange.coinbase.com/products/${coin.coin}/stats`)
  const cd = get(`https://api.coinbase.com/api/v3/brokerage/market/products/${coin.coin}/candles?granularity=FOUR_HOUR&limit=${coin.bars || 60}`).candles
  coin.price = +st.last; coin.open24 = +st.open
  coin.candles = cd.map(k => ({ t: +k.start, o: +k.open, h: +k.high, l: +k.low, c: +k.close })).sort((a, b) => a.t - b.t)
  coin.asof = new Date().toUTCString().replace(/:\d\d GMT$/, ' UTC').replace(/^\w+, /, '')
  const inZone = coin.price >= coin.zone[0] && coin.price <= coin.zone[1]
  console.log(`${coin.coin}: $${coin.price} (${((coin.price / coin.open24 - 1) * 100).toFixed(1)}% 24h) at ${coin.asof}${inZone ? ', inside the zone' : `, OUTSIDE the zone ${coin.zone.join('–')}: check the points still read true`}`)
}

// 3. the page
fs.cpSync(path.join(DIR, 'assets'), path.join(OUT, 'assets'), { recursive: true })
const prod = plan.segments.find(s => s.kind === 'product')
if (prod) for (const key of ['shot', 'bar', 'head']) if (prod[key]) { const f = path.resolve(BASE, prod[key]), dst = 'prod_' + key + path.extname(f); fs.copyFileSync(f, path.join(OUT, dst)); prod[key] = dst }
const DATA = { fmt: FMT, fps: FPS, frameW, frameH, chart: EDL.chart, face: EDL.face, mask: EDL.mask, pair: EDL.pair, handle: EDL.handle, duration: plan.duration, drop: plan.drop, segments: plan.segments }
const page = fs.readFileSync(path.join(DIR, 'edit.html'), 'utf8').replace('<script>\nconst D = window.DATA', `<script>window.DATA=${JSON.stringify(DATA).replace(/</g, '\\u003c')}</script>\n<script>\nconst D = window.DATA`)
  .replace('.box img{position:absolute;', `.box img,#cold img{width:${frameW}px;height:${frameH}px}\n.box img{position:absolute;`)
fs.writeFileSync(path.join(OUT, `index${SUF}.html`), page)

function loadPlaywright() {
  const req = createRequire(import.meta.url)
  for (const p of [process.env.PLAYWRIGHT_PATH, 'playwright', path.join(execSync('npm root -g').toString().trim(), 'playwright')]) { if (!p) continue; try { return req(p) } catch {} }
  throw new Error('Playwright not found')
}
const { chromium } = loadPlaywright()
async function openPage() {
  const browser = await chromium.launch({ args: ['--allow-file-access-from-files', '--force-color-profile=srgb'] })
  const pg = await browser.newPage({ viewport: { width: VW, height: VH }, deviceScaleFactor: 1 })
  pg.on('pageerror', e => console.error('  page error:', e.message))
  await pg.goto('file://' + path.join(OUT, `index${SUF}.html`)); await pg.evaluate(() => window.ready)
  const cdp = await pg.context().newCDPSession(pg)
  const shot = async () => Buffer.from((await cdp.send('Page.captureScreenshot', { format: 'png', optimizeForSpeed: true })).data, 'base64')
  return { browser, pg, shot }
}

const stills = flag('stills', false)
if (stills) {
  const { browser, pg, shot } = await openPage(); fs.mkdirSync(path.join(OUT, 'stills' + SUF), { recursive: true })
  for (const t of String(stills).split(',').map(Number)) { await pg.evaluate(x => window.renderAt(x), t); fs.writeFileSync(path.join(OUT, 'stills' + SUF, `t_${t.toFixed(2)}.png`), await shot()) }
  await browser.close(); console.log(`Stills in ${path.join(OUT, 'stills' + SUF)}`); process.exit(0)
}

// 4. frames in parallel
const FRAMES = Math.ceil(plan.duration * FPS), per = Math.ceil(FRAMES / WORKERS), t0 = Date.now()
let done = 0, fx = []
console.log(`Rendering ${FRAMES} frames (${plan.duration.toFixed(1)}s) with ${WORKERS} workers…`)
await Promise.all(Array.from({ length: WORKERS }, async (_, w) => {
  const a = w * per, b = Math.min(FRAMES, a + per); if (a >= b) return
  const { browser, pg, shot } = await openPage()
  if (w === 0) fx = await pg.evaluate(() => window.fxEvents())
  const ff = spawn(FF, ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(FPS), '-i', '-', '-c:v', 'libx264', '-preset', 'medium', '-crf', '19', '-pix_fmt', 'yuv420p', '-r', String(FPS), path.join(OUT, `seg${SUF}_${w}.mp4`)], { stdio: ['pipe', 'inherit', 'inherit'] })
  for (let f = a; f < b; f++) {
    await pg.evaluate(x => window.renderAt(x), f / FPS)
    if (!ff.stdin.write(await shot())) await new Promise(r => ff.stdin.once('drain', r))
    if (++done % 300 === 0) console.log(`  ${done}/${FRAMES} frames · ${((Date.now() - t0) / 1000).toFixed(0)}s`)
  }
  ff.stdin.end(); await new Promise(r => ff.on('close', r)); await browser.close()
}))

// 5. sound: the owner's voice, a drop track whose drop lands on the title, recorded effects
const lib = JSON.parse(fs.readFileSync(path.join(DIR, 'lib', 'music.json'), 'utf8')).tracks
const tr = lib.find(t => t.id === +(EDL.music?.id ?? 720))
const mfile = path.join(DIR, '.cache', 'music', `${tr.id}.mp3`)
if (!fs.existsSync(mfile)) await run('curl', ['-sS', '-f', '-o', mfile, `https://assets.mixkit.co/music/${tr.id}/${tr.id}.mp3`])
const coldEnd = Math.max(...plan.segments.filter(s => s.kind === 'cold').map(s => s.end), 0)
const tl = {
  duration: plan.duration, limiter: 'peak', fx,
  sentences: [{ id: 'voice', wav: path.join(OUT, 'voice.wav'), start: 0, dur: plan.duration }],
  music: { file: mfile, start: tr.drop - plan.drop, ref: 'loud', duck: EDL.music?.duck ?? 9, level: EDL.music?.level ?? -3, cuts: coldEnd ? [[coldEnd + 0.03, plan.drop]] : [], loop: tr.loop },
}
fs.writeFileSync(path.join(OUT, 'timeline.json'), JSON.stringify(tl))
await run(PY, [path.join(DIR, 'audio.py'), 'mix', path.join(OUT, 'timeline.json'), path.join(OUT, 'mix.wav')])
const segs = Array.from({ length: WORKERS }, (_, w) => path.join(OUT, `seg${SUF}_${w}.mp4`)).filter(f => fs.existsSync(f))
fs.writeFileSync(path.join(OUT, `segments${SUF}.txt`), segs.map(f => `file '${f}'`).join('\n'))
const final = path.join(OUT, `${slug}${SUF}.mp4`)
await run(FF, ['-y', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', path.join(OUT, `segments${SUF}.txt`), '-i', path.join(OUT, 'mix.wav'),
  '-filter_complex', '[1:a]loudnorm=I=-14:TP=-1.5:LRA=9[a]', '-map', '0:v', '-map', '[a]', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '192k', '-ar', '48000', '-ac', '2', '-t', plan.duration.toFixed(2), '-movflags', '+faststart', final])
for (const f of segs) fs.rmSync(f)
fs.writeFileSync(path.join(OUT, 'credits.txt'), `Music: "${tr.name}"${tr.artist ? ' by ' + tr.artist : ''} (Mixkit)\nSound effects: Mixkit\n`)
console.log(`\nDone in ${((Date.now() - t0) / 1000).toFixed(0)}s → ${final}`)
