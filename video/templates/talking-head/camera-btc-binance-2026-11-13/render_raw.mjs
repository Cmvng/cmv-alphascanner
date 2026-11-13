// The final render for an edit of the owner's own recording: THEIR frames, untouched, with the graphics on top.
//   node render_raw.mjs <page.html> <work dir> <raw.mp4> <out.mp4>                      full render
//   node render_raw.mjs <page.html> <work dir> <raw.mp4> <out dir> --stills 1,6.5,30    composites of single frames
// One encode, straight from the recording: the kept frames are picked out of raw.mp4 by number (segs.json), flipped
// (the phone records the front camera mirrored), and encoded once at the recording's own frame rate. No blur, no
// regrade, no shade, no denoise, no intermediate file. The page draws two layers (#behind, #front, see depth.html);
// the behind layer is hidden wherever the owner's outline is (alpha60.mkv from matte60.py; ALPHA=<file> to override).
// Sound: mix_raw.wav from mix_raw.py (the owner's voice track as recorded).
import { createRequire } from 'module'
import { spawn, execFileSync } from 'child_process'
import fs from 'fs'
const require = createRequire(import.meta.url)
const { chromium } = require(process.env.PW || '/opt/node22/lib/node_modules/playwright')
const [page_, K, RAW, out] = process.argv.slice(2)
const si = process.argv.indexOf('--stills')
const plan = JSON.parse(fs.readFileSync(`${K}/plan.json`)), segs = JSON.parse(fs.readFileSync(`${K}/segs.json`))
const FPS = plan.fps || 60, FLIP = plan.flip ?? true, TOT = plan.end + plan.endcard, N = Math.round(TOT * FPS)      // the recording's own frame rate; flipped only when plan.json says the phone mirrored it
const ALPHA = process.env.ALPHA || `${K}/alpha60.mkv`, AFPS = +(process.env.ALPHA_FPS || FPS)
const ranges = segs.map(g => [Math.round(g.s * FPS), Math.round(g.e * FPS) - 1])
const kept = ranges.reduce((a, [x, y]) => a + y - x + 1, 0)
const rawT = t => { let acc = 0; for (const g of segs) { const d = g.e - g.s; if (t < acc + d) return g.s + (t - acc); acc += d } return segs[segs.length - 1].e - 1 / FPS }
const b = await chromium.launch({ args: ['--allow-file-access-from-files', '--force-color-profile=srgb'] })
const open = async h => { const p = await b.newPage({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 1 })
  p.on('pageerror', e => console.log('PAGE ERROR', h, e.message)); await p.goto('file://' + page_ + '#' + h); await p.evaluate(() => window.READY); return p }
// Every frame sent to ffmpeg must have an alpha channel. When the page covers the whole frame (the end card) the browser
// writes the PNG WITHOUT one (colour type 2, not 6); ffmpeg then rebuilds its whole filter chain at that frame, and as
// the recording has already been read to its end the video simply stops there (11 Nov: the file ended 3.4 s early,
// with no error). So an opaque frame is given its alpha channel back before it goes down the pipe.
const withAlpha = buf => buf[25] === 6 ? buf : execFileSync('ffmpeg', ['-v', 'error', '-f', 'png_pipe', '-i', 'pipe:0', '-frames:v', '1', '-pix_fmt', 'rgba', '-f', 'image2pipe', '-c:v', 'png', 'pipe:1'], { input: buf, maxBuffer: 1 << 28 })
const shot = async p => withAlpha(await p.screenshot({ omitBackground: true, type: 'png' }))
const pb = await open('behind'), pf = await open('front')
// the behind layer [bk] is cut by the outline [al]; then both layers go on the picture [b0]
const LAYERS = (bk, al, fr) => `${bk}format=rgba,split[bc][ba];[ba]alphaextract[a1];${al}format=gray,negate[inv];[a1][inv]blend=all_mode=multiply[am];[bc][am]alphamerge[bm];` +
  `[b0][bm]overlay=0:0:eof_action=pass[b1];[b1]${fr}overlay=0:0:eof_action=pass`
if (si > 0) {
  fs.mkdirSync(out, { recursive: true })
  for (const t of process.argv[si + 1].split(',').map(Number)) {
    await pb.evaluate(t => window.render(t), t); await pf.evaluate(t => window.render(t), t)
    fs.writeFileSync(`${out}/bk.png`, await shot(pb)); fs.writeFileSync(`${out}/fr.png`, await shot(pf))
    const tt = Math.min(t, plan.end - 1 / FPS), at = Math.round(tt * AFPS) / AFPS
    execFileSync('ffmpeg', ['-v', 'error', '-y', '-ss', rawT(tt).toFixed(4), '-i', RAW, '-i', `${out}/bk.png`, '-ss', at.toFixed(4), '-i', ALPHA, '-i', `${out}/fr.png`,
      '-frames:v', '1', '-filter_complex', `[0:v]setpts=0,${FLIP ? 'hflip' : 'null'}[b0];[1:v]setpts=0[k];[2:v]setpts=0[l];[3:v]setpts=0[m];` + LAYERS('[k]', '[l]', '[m]'), `${out}/still_${t}.png`])   // all four at time 0: a seek can leave the picture a hair before the layers, and then they are not laid on it
    console.log('still', t)
  }
  await b.close(); process.exit(0)
}
const sel = ranges.map(([x, y]) => `between(n\\,${x}\\,${y})`).join('+')
const fc = `[0:v]select='${sel}',setpts=N/${FPS}/TB,${FLIP ? 'hflip,' : ''}tpad=stop_mode=clone:stop_duration=${(plan.endcard + 1).toFixed(2)}[b0];` +
  LAYERS('[1:v]', '[2:v]', '[3:v]') + ',format=yuv420p[v]'
const ff = spawn('ffmpeg', ['-v', 'error', '-y', '-i', RAW, '-f', 'image2pipe', '-framerate', String(FPS), '-c:v', 'png', '-i', 'pipe:3', '-i', ALPHA,
  '-f', 'image2pipe', '-framerate', String(FPS), '-c:v', 'png', '-i', 'pipe:4', '-i', `${K}/mix_raw.wav`,
  '-filter_complex', fc, '-map', '[v]', '-map', '4:a', '-t', TOT.toFixed(3), '-frames:v', String(N),      // the frame count as well as the time: 211.867 s let a 6,357th frame through (12 Nov), the recording's frozen picture with no end card on it
  // crf 16 with the grain tuning: measured on this recording, every frame of the face keeps 94% or more of the raw's fine
  // detail at about 27 Mbit/s. Plain crf 14 gave 88% (as low as 74% on the in-between frames) at 22 Mbit/s and failed the gate.
  '-c:v', 'libx264', '-preset', 'medium', '-crf', process.env.CRF || '16', '-tune', 'grain', '-maxrate', '60M', '-bufsize', '120M', '-r', String(FPS), '-pix_fmt', 'yuv420p',
  '-colorspace', 'bt709', '-color_primaries', 'bt709', '-color_trc', 'bt709', '-c:a', 'aac', '-b:a', '320k', '-movflags', '+faststart', out],
  { stdio: ['ignore', 'inherit', 'inherit', 'pipe', 'pipe'] })
// two pipes into one ffmpeg must not wait for each other: queue both, pause only when BOTH are far behind
const sleep = ms => new Promise(r => setTimeout(r, ms)), FAR = 96 * 1024 * 1024
let pipeError = null
for (const s of [ff.stdio[3], ff.stdio[4]]) s.on('error', e => { pipeError = pipeError || e.code })      // ffmpeg stopped before taking every frame
let sb = null, sf = null, bb = null, bf = null, shots = 0, t0 = Date.now()
console.log(`${kept} of the recording's frames kept, ${N} frames to write at ${FPS} a second`)
for (let f = 0; f < N; f++) {
  const t = f / FPS
  const [gb, gf] = await Promise.all([pb.evaluate(t => window.render(t), t), pf.evaluate(t => window.render(t), t)])
  if (gb !== sb || !bb) { bb = await shot(pb); sb = gb; shots++ }
  if (gf !== sf || !bf) { bf = await shot(pf); sf = gf; shots++ }
  ff.stdio[3].write(bb); ff.stdio[4].write(bf)
  while (Math.min(ff.stdio[3].writableLength, ff.stdio[4].writableLength) > FAR) await sleep(10)
  if (f % 600 === 0) console.log(`frame ${f}/${N} (${shots} drawn, ${((Date.now() - t0) / 1000).toFixed(0)} s)`)
}
ff.stdio[3].end(); ff.stdio[4].end(); const code = await new Promise(r => ff.on('close', r)); await b.close()
// never trust the exit alone: count what was written
const got = +execFileSync('ffprobe', ['-v', 'error', '-select_streams', 'v:0', '-count_packets', '-show_entries', 'stream=nb_read_packets', '-of', 'csv=p=0', out]).toString().trim()
console.log(`${got === N && !code && !pipeError ? 'done' : 'FAILED'}: ${got} of ${N} frames in the file, ${shots} drawn, ${((Date.now() - t0) / 1000).toFixed(0)} s` +
  (code ? `, ffmpeg exit ${code}` : '') + (pipeError ? `, pipe ${pipeError}` : ''))
process.exit(got === N && !code && !pipeError ? 0 : 1)
