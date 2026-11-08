// Renders the unveil page: opaque 1920x1080 frames at 30 fps piped to ffmpeg with the soundtrack, one encode.
//   node render.mjs <page.html> <plan.json> <out.mp4> [crf]
//   node render.mjs <page.html> <plan.json> --stills t,t,... <dir>
// The frames go rgb -> yuv with the bt709 matrix and accurate rounding, tagged bt709, so players show the footage's colour.
import { createRequire } from 'module'
import { spawn } from 'child_process'
import fs from 'fs'
const require = createRequire(import.meta.url)
const { chromium } = require('/opt/node22/lib/node_modules/playwright')
const [page_, planPath, out, a4, a5] = process.argv.slice(2)
const plan = JSON.parse(fs.readFileSync(planPath, 'utf8')), FPS = plan.fps, N = Math.round(plan.total * FPS)
// a chunk for the parallel render: FROM=<frame> TO=<frame> VIDEO_ONLY=1
const F0 = +(process.env.FROM || 0), F1 = Math.min(N, +(process.env.TO || N)), VO = !!process.env.VIDEO_ONLY
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
const ff = spawn('ffmpeg', ['-v', 'error', '-y', '-f', 'image2pipe', '-framerate', String(FPS), '-c:v', 'png', '-i', '-', ...aud,
  '-vf', 'scale=out_color_matrix=bt709:out_range=tv:flags=lanczos+accurate_rnd+full_chroma_int,format=yuv420p',
  '-c:v', 'libx264', '-preset', 'slow', '-crf', String(a4 || 14), '-pix_fmt', 'yuv420p', '-colorspace', 'bt709', '-color_primaries', 'bt709', '-color_trc', 'bt709', '-color_range', 'tv',
  '-r', String(FPS), '-movflags', '+faststart', out], { stdio: ['pipe', 'inherit', 'inherit'] })
let prev = null, buf = null, shots = 0, t0 = Date.now()
for (let f = F0; f < F1; f++) {
  const sig = await p.evaluate(t => window.render(t), f / FPS)
  if (sig !== prev || !buf) { buf = await p.screenshot({ type: 'png' }); prev = sig; shots++ }
  if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r))
  if ((f - F0) % 300 === 0) console.log(`frame ${f}/${F1} (${shots} drawn, ${((Date.now() - t0) / 1000).toFixed(0)} s)`)
}
ff.stdin.end(); await new Promise(r => ff.on('close', r)); await b.close()
console.log(`done: ${F1 - F0} frames, ${shots} drawn, ${((Date.now() - t0) / 1000).toFixed(0)} s`)
