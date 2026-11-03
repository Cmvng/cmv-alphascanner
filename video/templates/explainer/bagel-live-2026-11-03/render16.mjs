// 16:9 renderer: opaque page frames (1920x1080, 30 fps) piped to ffmpeg with the mix; a frame is redrawn only when the
// page's render(t) signature changes.
//   node render16.mjs <page.html> <end s> <mix.wav> <out.mp4>
//   node render16.mjs <page.html> <end s> - <out dir> --stills 1,6.5,30
import { createRequire } from 'module'
import { spawn } from 'child_process'
import fs from 'fs'
const require = createRequire(import.meta.url)
const { chromium } = require('/opt/node22/lib/node_modules/playwright')
const [page_, endS, mix, out] = process.argv.slice(2)
const si = process.argv.indexOf('--stills'), FPS = 30, N = Math.round(+endS * FPS)
const b = await chromium.launch({ args: ['--allow-file-access-from-files', '--force-color-profile=srgb'] })
const p = await b.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 })
p.on('pageerror', e => console.log('PAGE ERROR', e.message))
await p.goto('file://' + page_); await p.evaluate(() => window.READY)
if (si > 0) {
  fs.mkdirSync(out, { recursive: true })
  for (const t of process.argv[si + 1].split(',').map(Number)) { await p.evaluate(t => window.render(t), t); await p.screenshot({ path: `${out}/still_${t}.png`, type: 'png' }) }
  await b.close(); process.exit(0)
}
const ff = spawn('ffmpeg', ['-v', 'error', '-y', '-f', 'image2pipe', '-framerate', String(FPS), '-c:v', 'png', '-i', '-', '-i', mix,
  '-map', '0:v', '-map', '1:a', '-t', (+endS).toFixed(3), '-c:v', 'libx264', '-preset', 'medium', '-crf', '17', '-pix_fmt', 'yuv420p', '-r', String(FPS),
  '-c:a', 'aac', '-b:a', '192k', '-movflags', '+faststart', out], { stdio: ['pipe', 'inherit', 'inherit'] })
let prev = null, buf = null, shots = 0, t0 = Date.now()
for (let f = 0; f < N; f++) {
  const sig = await p.evaluate(t => window.render(t), f / FPS)
  if (sig !== prev || !buf) { buf = await p.screenshot({ type: 'png' }); prev = sig; shots++ }
  if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r))
  if (f % 300 === 0) console.log(`frame ${f}/${N} (${shots} drawn, ${((Date.now() - t0) / 1000).toFixed(0)} s)`)
}
ff.stdin.end(); await new Promise(r => ff.on('close', r)); await b.close()
console.log(`done: ${N} frames, ${shots} drawn, ${((Date.now() - t0) / 1000).toFixed(0)} s`)
