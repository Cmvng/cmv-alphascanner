// renders cut01.html frame by frame: node render.mjs stills 1.2,8,20.5  → still_<t>.png
//                                    node render.mjs video             → silent.mp4 (1080x1920, 30 fps)
import path from 'node:path'
import fs from 'node:fs'
import { spawn, execSync } from 'node:child_process'
import { createRequire } from 'node:module'

const DIR = path.dirname(new URL(import.meta.url).pathname)
const req = createRequire('/home/user/cmv-alphascanner/video/make-cover.mjs')
let chromium
for (const p of [process.env.PLAYWRIGHT_PATH, 'playwright', path.join(execSync('npm root -g').toString().trim(), 'playwright')]) { if (!p) continue; try { ({ chromium } = req(p)); break } catch {} }
const [mode = 'stills', arg = '1'] = process.argv.slice(2)
const page_ = process.env.PAGE || 'cut01.html'
const browser = await chromium.launch({ args: ['--allow-file-access-from-files', '--force-color-profile=srgb'] })
const page = await browser.newPage({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 1 })
page.on('pageerror', e => console.error('page error:', e.message))
await page.goto('file://' + path.join(DIR, page_)); await page.evaluate(() => window.ready)
const TOTAL = await page.evaluate(() => window.TOTAL)
if (mode === 'stills') {
  for (const t of arg.split(',').map(Number)) {
    await page.evaluate(t => window.seek(t), t)
    await page.screenshot({ path: path.join(DIR, `still_${t.toFixed(2)}.png`) }); console.log('still', t)
  }
} else {
  const out = path.join(DIR, process.env.OUT || 'silent.mp4'), N = Math.round(TOTAL * 30)
  const ff = spawn('ffmpeg', ['-v', 'error', '-y', '-f', 'image2pipe', '-framerate', '30', '-c:v', 'mjpeg', '-i', '-', '-c:v', 'libx264', '-preset', 'slow', '-crf', '15', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', out], { stdio: ['pipe', 'inherit', 'inherit'] })
  for (let f = 0; f < N; f++) {
    await page.evaluate(t => window.seek(t), f / 30)
    const buf = await page.screenshot({ type: 'jpeg', quality: 94 })
    if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r))
    if (f % 90 === 0) console.log(`${f}/${N}`)
  }
  ff.stdin.end(); await new Promise(r => ff.on('close', r)); console.log('VIDEO', out)
}
await browser.close()
