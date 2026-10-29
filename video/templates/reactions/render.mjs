// Render a reaction page (window.render(t) may be async; it returns a signature so unchanged frames are reused).
//   PW=<playwright> node render.mjs <page.html> <out.mp4> --dur 100.2 [--base base.mp4] [--audio a.wav]
//   PW=<playwright> node render.mjs <page.html> <out dir> --dur 100.2 [--base base.mp4] --stills 1,6.5,30
// A frame is reused when render(t) returns the same signature as the frame before, so the signature must change with
// everything on the page. --noreuse draws every frame fresh (safe for short pieces; stills can't catch a stuck frame).
// With --base the page is drawn transparent over the base video and the base's sound is kept; without it the page is
// the whole frame (opaque), with --audio if given, else silent.
import { createRequire } from 'module'
import { spawn, execFileSync } from 'child_process'
import fs from 'fs'
const require = createRequire(import.meta.url)
const { chromium } = require(process.env.PW)
const [page_, out] = process.argv.slice(2)
const arg = k => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : null }
const DUR = +arg('--dur'), BASE = arg('--base'), AUDIO = arg('--audio'), STILLS = arg('--stills'), NOREUSE = process.argv.includes('--noreuse')
const FPS = 30, N = Math.round(DUR * FPS)
const b = await chromium.launch({ args: ['--allow-file-access-from-files', '--force-color-profile=srgb'] })
const p = await b.newPage({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 1 })
p.on('pageerror', e => console.log('PAGE ERROR', e.message))
p.on('console', m => { if (m.type() === 'error') console.log('CONSOLE', m.text()) })
await p.goto('file://' + page_); await p.evaluate(() => window.READY)
const shot = () => p.screenshot({ omitBackground: !!BASE, type: 'png' })
if (STILLS) {
  fs.mkdirSync(out, { recursive: true })
  for (const t of STILLS.split(',').map(Number)) {
    await p.evaluate(t => window.render(t), t)
    const png = `${out}/ov_${t}.png`; fs.writeFileSync(png, await shot())
    if (BASE) execFileSync('ffmpeg', ['-v', 'error', '-y', '-ss', String(t), '-i', BASE, '-i', png, '-frames:v', '1',
      '-filter_complex', '[0:v][1:v]overlay=0:0', `${out}/still_${t}.png`])
    else fs.copyFileSync(png, `${out}/still_${t}.png`)
    console.log('still', t)
  }
  await b.close(); process.exit(0)
}
const args = ['-v', 'error', '-y']
if (BASE) args.push('-i', BASE)
args.push('-f', 'image2pipe', '-framerate', String(FPS), '-c:v', 'png', '-i', '-')
if (AUDIO) args.push('-i', AUDIO)
if (BASE) args.push('-filter_complex', '[0:v][1:v]overlay=0:0:eof_action=pass,format=yuv420p[v]', '-map', '[v]', '-map', '0:a?')
else args.push('-map', '0:v', ...(AUDIO ? ['-map', '1:a'] : []), '-pix_fmt', 'yuv420p')
// over a base, its sound is copied as it is (no second encode); otherwise the --audio file is encoded
args.push('-t', DUR.toFixed(3), '-c:v', 'libx264', '-preset', 'medium', '-crf', '18', '-r', String(FPS),
  ...(BASE ? ['-c:a', 'copy'] : ['-c:a', 'aac', '-b:a', '192k']), '-movflags', '+faststart', out)
const ff = spawn('ffmpeg', args, { stdio: ['pipe', 'inherit', 'inherit'] })
let prev = null, buf = null, shots = 0, t0 = Date.now()
for (let f = 0; f < N; f++) {
  const sig = await p.evaluate(t => window.render(t), f / FPS)
  if (NOREUSE || sig !== prev || !buf) { buf = await shot(); prev = sig; shots++ }
  if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r))
  if (f % 300 === 0) console.log(`frame ${f}/${N} (${shots} drawn, ${((Date.now() - t0) / 1000).toFixed(0)} s)`)
}
ff.stdin.end(); await new Promise(r => ff.on('close', r)); await b.close()
console.log(`done: ${N} frames, ${shots} drawn, ${((Date.now() - t0) / 1000).toFixed(0)} s`)
