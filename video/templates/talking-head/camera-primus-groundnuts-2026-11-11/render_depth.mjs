// Renderer for a page with two layers: graphics BEHIND the owner and graphics in front (depth.html).
//   node render_depth.mjs <page.html> <work dir> <out.mp4>                      full render
//   node render_depth.mjs <page.html> <work dir> <out dir> --stills 1,6.5,30    composites of single frames
// The page draws one layer at a time, chosen by the address: #shade (the still gradient over the room), #behind, #front.
// Order: base.mp4 (the owner's whole picture) -> shade -> the behind layer, hidden wherever the owner's outline is
// (alpha_cut.mkv from matte_cut.py) -> the front layer. One encode, with mix.wav.
import { createRequire } from 'module'
import { spawn, execFileSync } from 'child_process'
import fs from 'fs'
const require = createRequire(import.meta.url)
const { chromium } = require(process.env.PW || '/opt/node22/lib/node_modules/playwright')
const [page_, K, out] = process.argv.slice(2)
const si = process.argv.indexOf('--stills')
const plan = JSON.parse(fs.readFileSync(`${K}/plan.json`))
const TOT = plan.end + plan.endcard, FPS = 30, N = Math.round(TOT * FPS)
const b = await chromium.launch({ args: ['--allow-file-access-from-files', '--force-color-profile=srgb'] })
const open = async h => { const p = await b.newPage({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 1 })
  p.on('pageerror', e => console.log('PAGE ERROR', h, e.message)); await p.goto('file://' + page_ + '#' + h); await p.evaluate(() => window.READY); return p }
const shot = p => p.screenshot({ omitBackground: true, type: 'png' })
const sh = await open('shade'); await sh.evaluate(() => window.render(0)); const shade = `${K}/shade.png`; fs.writeFileSync(shade, await shot(sh)); await sh.close()
const pb = await open('behind'), pf = await open('front')
// inputs: 0 base, 1 shade, 2 behind, 3 outline, 4 front
const FC = '[1:v]format=rgba[sh];[0:v][sh]overlay=0:0[b0];[2:v]format=rgba,split[bc][ba];[ba]alphaextract[a1];[3:v]format=gray,negate[inv];' +
  '[a1][inv]blend=all_mode=multiply[am];[bc][am]alphamerge[bm];[b0][bm]overlay=0:0:eof_action=pass[b1];[b1][4:v]overlay=0:0:eof_action=pass'
if (si > 0) {
  fs.mkdirSync(out, { recursive: true })
  for (const t of process.argv[si + 1].split(',').map(Number)) {
    await pb.evaluate(t => window.render(t), t); await pf.evaluate(t => window.render(t), t)
    fs.writeFileSync(`${out}/bk.png`, await shot(pb)); fs.writeFileSync(`${out}/fr.png`, await shot(pf))
    const ss = String(Math.min(t, TOT - 0.05))
    execFileSync('ffmpeg', ['-v', 'error', '-y', '-ss', ss, '-i', `${K}/base.mp4`, '-i', shade, '-i', `${out}/bk.png`, '-ss', ss, '-i', `${K}/alpha_cut.mkv`, '-i', `${out}/fr.png`,
      '-frames:v', '1', '-filter_complex', FC, `${out}/still_${t}.png`])
    console.log('still', t)
  }
  await b.close(); process.exit(0)
}
const ff = spawn('ffmpeg', ['-v', 'error', '-y', '-i', `${K}/base.mp4`, '-loop', '1', '-framerate', String(FPS), '-i', shade,
  '-f', 'image2pipe', '-framerate', String(FPS), '-c:v', 'png', '-i', 'pipe:3', '-i', `${K}/alpha_cut.mkv`,
  '-f', 'image2pipe', '-framerate', String(FPS), '-c:v', 'png', '-i', 'pipe:4', '-i', `${K}/mix.wav`,
  '-filter_complex', FC + ',format=yuv420p[v]', '-map', '[v]', '-map', '5:a', '-t', TOT.toFixed(3),
  '-c:v', 'libx264', '-preset', 'medium', '-crf', '16', '-r', String(FPS), '-pix_fmt', 'yuv420p', '-colorspace', 'bt709', '-color_primaries', 'bt709', '-color_trc', 'bt709',
  '-c:a', 'aac', '-b:a', '256k', '-movflags', '+faststart', out], { stdio: ['ignore', 'inherit', 'inherit', 'pipe', 'pipe'] })
// The two layers go down two pipes. ffmpeg reads them in its own order (while it opens the first it does not touch
// the second), so neither write may wait for the other: both are queued, and the loop only pauses when BOTH are far
// behind, which means the encoder is the slow one. Waiting for each pipe to drain in turn stops the render dead.
const sleep = ms => new Promise(r => setTimeout(r, ms))
const FAR = 96 * 1024 * 1024
let sb = null, sf = null, bb = null, bf = null, shots = 0, t0 = Date.now()
for (let f = 0; f < N; f++) {
  const t = f / FPS
  const [gb, gf] = await Promise.all([pb.evaluate(t => window.render(t), t), pf.evaluate(t => window.render(t), t)])
  if (gb !== sb || !bb) { bb = await shot(pb); sb = gb; shots++ }
  if (gf !== sf || !bf) { bf = await shot(pf); sf = gf; shots++ }
  ff.stdio[3].write(bb); ff.stdio[4].write(bf)
  while (Math.min(ff.stdio[3].writableLength, ff.stdio[4].writableLength) > FAR) await sleep(10)
  if (f % 300 === 0) console.log(`frame ${f}/${N} (${shots} drawn, ${((Date.now() - t0) / 1000).toFixed(0)} s)`)
}
ff.stdio[3].end(); ff.stdio[4].end(); await new Promise(r => ff.on('close', r)); await b.close()
console.log(`done: ${N} frames, ${shots} drawn, ${((Date.now() - t0) / 1000).toFixed(0)} s`)
