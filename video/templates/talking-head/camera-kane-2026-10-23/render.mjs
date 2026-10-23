// Overlay renderer for the Kane edit: page frames (transparent where the camera shows) over base.mp4, with mix.wav.
//   node render.mjs <page.html> <kane dir> <out.mp4>            full render
//   node render.mjs <page.html> <kane dir> <out dir> --stills 1,6.5,30   composites of single frames
import { createRequire } from 'module'
import { spawn, execFileSync } from 'child_process'
import fs from 'fs'
const require = createRequire(import.meta.url)
const { chromium } = require(process.env.PW)
const [page_, K, out] = process.argv.slice(2)
const si = process.argv.indexOf('--stills')
const plan = JSON.parse(fs.readFileSync(`${K}/plan.json`))
const TOT = plan.end + plan.endcard, FPS = 30, N = Math.round(TOT * FPS)
const b = await chromium.launch({ args: ['--allow-file-access-from-files', '--force-color-profile=srgb'] })
const p = await b.newPage({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 1 })
p.on('pageerror', e => console.log('PAGE ERROR', e.message))
await p.goto('file://' + page_); await p.evaluate(() => window.READY)
const shot = () => p.screenshot({ omitBackground: true, type: 'png' })
if (si > 0) {
  fs.mkdirSync(out, { recursive: true })
  for (const t of process.argv[si + 1].split(',').map(Number)) {
    await p.evaluate(t => window.render(t), t)
    const png = `${out}/ov_${t}.png`; fs.writeFileSync(png, await shot())
    execFileSync('ffmpeg', ['-v', 'error', '-y', '-ss', String(Math.min(t, plan.end - 0.05)), '-i', `${K}/base.mp4`, '-i', png, '-frames:v', '1',
      '-filter_complex', '[0:v][1:v]overlay=0:0', `${out}/still_${t}.png`])
    console.log('still', t)
  }
  await b.close(); process.exit(0)
}
const ff = spawn('ffmpeg', ['-v', 'error', '-y', '-i', `${K}/base.mp4`, '-f', 'image2pipe', '-framerate', String(FPS), '-c:v', 'png', '-i', '-',
  '-i', `${K}/mix.wav`, '-filter_complex', '[0:v][1:v]overlay=0:0:eof_action=pass,format=yuv420p[v]', '-map', '[v]', '-map', '2:a',
  '-c:v', 'libx264', '-preset', 'medium', '-crf', '18', '-r', String(FPS), '-c:a', 'aac', '-b:a', '192k', '-shortest', '-movflags', '+faststart', out],
  { stdio: ['pipe', 'inherit', 'inherit'] })
let prev = null, buf = null, shots = 0, t0 = Date.now()
for (let f = 0; f < N; f++) {
  const sig = await p.evaluate(t => window.render(t), f / FPS)
  if (sig !== prev || !buf) { buf = await shot(); prev = sig; shots++ }
  if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r))
  if (f % 300 === 0) console.log(`frame ${f}/${N} (${shots} drawn, ${((Date.now() - t0) / 1000).toFixed(0)} s)`)
}
ff.stdin.end(); await new Promise(r => ff.on('close', r)); await b.close()
console.log(`done: ${N} frames, ${shots} drawn, ${((Date.now() - t0) / 1000).toFixed(0)} s`)
