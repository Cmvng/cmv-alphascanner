// Renders the unveil page: opaque 1920x1080 frames at 30 fps piped to ffmpeg with the soundtrack, one encode.
//   node render.mjs <page.html> <plan.json> <out.mp4> [crf]
//   node render.mjs <page.html> <plan.json> --stills t,t,... <dir>
// The frames go rgb -> yuv with the bt709 matrix and accurate rounding, tagged bt709, so players show the footage's colour.
//
// Motion blur (opt-in; 14 Nov motion study, after /anatomy-reveal and Remotion's CameraMotionBlur): MBLUR=<max samples>
// (e.g. 32). For each frame the page is laid out at the start and end of a 180-degree shutter (SHUTTER=0.5 of a frame)
// and the largest distance any element travels is measured (getBoundingClientRect, so transforms count; the captions
// box #cap and anything with data-noblur are left out). A frame that moves under BLUR_STEP px (default 2) is one sharp
// shot; a moving one gets one sample per BLUR_STEP px of travel (up to MBLUR), averaged here, so a fast move smears
// smoothly instead of strobing (a fixed 6 samples showed stepped copies of the text: 14 Nov test).
import { createRequire } from 'module'
import { spawn } from 'child_process'
import fs from 'fs'
import { png2rgb } from '../../../lib/png.mjs'
const require = createRequire(import.meta.url)
const { chromium } = require('/opt/node22/lib/node_modules/playwright')
const [page_, planPath, out, a4, a5] = process.argv.slice(2)
const plan = JSON.parse(fs.readFileSync(planPath, 'utf8')), FPS = plan.fps, N = Math.round(plan.total * FPS)
// a chunk for the parallel render: FROM=<frame> TO=<frame> VIDEO_ONLY=1
const F0 = +(process.env.FROM || 0), F1 = Math.min(N, +(process.env.TO || N)), VO = !!process.env.VIDEO_ONLY
const MB = Math.max(1, Math.round(+(process.env.MBLUR || 1))), SH = +(process.env.SHUTTER || .5), STEP = +(process.env.BLUR_STEP || 2)
const b = await chromium.launch({ args: ['--allow-file-access-from-files', '--force-color-profile=srgb'] })
const VW = +(process.env.VIEW_W || 1920), VH = +(process.env.VIEW_H || 1080), HASH = process.env.HASH || ''   // other frame sizes: VIEW_W/VIEW_H, page variant: HASH (e.g. #45)
const p = await b.newPage({ viewport: { width: VW, height: VH }, deviceScaleFactor: 1 })
p.on('pageerror', e => console.log('PAGE ERROR', e.message))
await p.goto('file://' + page_ + HASH); await p.evaluate(() => window.READY)
if (out === '--stills') {
  fs.mkdirSync(a5, { recursive: true })
  for (const t of a4.split(',').map(Number)) { await p.evaluate(t => window.render(t), t); await p.screenshot({ path: `${a5}/still_${t.toFixed(2)}.png` }) }
  await b.close(); process.exit(0)
}
const A = plan.audio
const aud = VO ? [] : ['-ss', String(A.in), '-i', A.src, '-map', '0:v', '-map', '1:a', '-t', plan.total.toFixed(3),
  '-af', `afade=t=out:st=${A.fade[0]}:d=${A.fade[1]},apad=whole_dur=${plan.total},atrim=0:${plan.total}`, '-c:a', 'aac', '-b:a', '256k']
const inp = MB > 1 ? ['-f', 'rawvideo', '-pix_fmt', 'rgb24', '-s', `${VW}x${VH}`, '-framerate', String(FPS), '-i', '-'] : ['-f', 'image2pipe', '-framerate', String(FPS), '-c:v', 'png', '-i', '-']
const ff = spawn('ffmpeg', ['-v', 'error', '-y', ...inp, ...aud,
  '-vf', 'scale=out_color_matrix=bt709:out_range=tv:flags=lanczos+accurate_rnd+full_chroma_int,format=yuv420p',
  '-c:v', 'libx264', '-preset', 'slow', '-crf', String(a4 || 14), '-pix_fmt', 'yuv420p', '-colorspace', 'bt709', '-color_primaries', 'bt709', '-color_trc', 'bt709', '-color_range', 'tv',
  '-r', String(FPS), '-movflags', '+faststart', out], { stdio: ['pipe', 'inherit', 'inherit'] })
const put = async buf => { if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r)) }
// the boxes of every laid-out element (transforms included), in document order, for measuring travel
const RECTS = () => { const skip = new Set([...document.querySelectorAll('#cap, #cap *, [data-noblur], [data-noblur] *')])
  return [...document.querySelectorAll('body *')].map(e => { if (skip.has(e)) return null; const r = e.getBoundingClientRect(); return r.width * r.height > 0 ? [r.x, r.y, r.width, r.height] : null }) }
const travel = (r0, r1) => { let m = 0; for (let i = 0; i < r0.length; i++) { const a = r0[i], c = r1[i]; if (!a || !c) continue
  m = Math.max(m, Math.abs(c[0] - a[0]), Math.abs(c[1] - a[1]), Math.abs(c[0] + c[2] - a[0] - a[2]), Math.abs(c[1] + c[3] - a[1] - a[3])) } return m }
let prev = null, buf = null, shots = 0, blurred = 0, t0 = Date.now()
const acc = MB > 1 ? new Uint32Array(VW * VH * 3) : null
for (let f = F0; f < F1; f++) {
  if (MB === 1) {
    const sig = await p.evaluate(t => window.render(t), f / FPS)
    if (sig !== prev || !buf) { buf = await p.screenshot({ type: 'png' }); prev = sig; shots++ }
    await put(buf); continue
  }
  const ta = (f - SH / 2) / FPS, tb = (f + SH / 2) / FPS
  await p.evaluate(t => window.render(t), ta); const r0 = await p.evaluate(RECTS)
  await p.evaluate(t => window.render(t), tb); const r1 = await p.evaluate(RECTS)
  const n = Math.min(MB, Math.ceil(travel(r0, r1) / STEP))
  if (n <= 1) {
    const sig = await p.evaluate(t => window.render(t), f / FPS)
    if (sig !== prev || !buf) { buf = png2rgb(await p.screenshot({ type: 'png' })); prev = sig; shots++ }
    await put(buf)
  } else {
    blurred++; acc.fill(0)
    for (let j = 0; j < n; j++) { await p.evaluate(t => window.render(t), (f + SH * ((j + .5) / n - .5)) / FPS); const px = png2rgb(await p.screenshot({ type: 'png' })); shots++
      for (let i = 0; i < px.length; i++) acc[i] += px[i] }
    const avg = Buffer.alloc(acc.length); for (let i = 0; i < acc.length; i++) avg[i] = (acc[i] + (n >> 1)) / n
    await put(avg); prev = null
  }
  if ((f - F0) % 300 === 0) console.log(`frame ${f}/${F1} (${shots} drawn, ${blurred} blurred, ${((Date.now() - t0) / 1000).toFixed(0)} s)`)
}
ff.stdin.end(); await new Promise(r => ff.on('close', r)); await b.close()
console.log(`done: ${F1 - F0} frames, ${shots} drawn${MB > 1 ? `, ${blurred} blurred` : ''}, ${((Date.now() - t0) / 1000).toFixed(0)} s`)
