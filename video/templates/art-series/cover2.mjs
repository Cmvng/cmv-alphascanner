// renders cover.html → cover.jpg (1080x1920) and thumb.jpg (1280x720)
import path from 'node:path'
import { execSync } from 'node:child_process'
import { createRequire } from 'node:module'
const DIR = path.dirname(new URL(import.meta.url).pathname)
const req = createRequire('/home/user/cmv-alphascanner/video/make-cover.mjs')
let chromium
for (const p of ['playwright', path.join(execSync('npm root -g').toString().trim(), 'playwright')]) { try { ({ chromium } = req(p)); break } catch {} }
const browser = await chromium.launch({ args: ['--allow-file-access-from-files', '--force-color-profile=srgb'] })
for (const [q, w, h, out] of [['', 1080, 1920, 'cover2.jpg'], ['?thumb', 1280, 720, 'thumb2.jpg']]) {
  const page = await browser.newPage({ viewport: { width: w, height: h } })
  page.on('pageerror', e => console.error('page error:', e.message))
  await page.goto('file://' + path.join(DIR, 'cover2.html') + q); await page.evaluate(() => window.ready)
  await page.screenshot({ path: path.join(DIR, out), type: 'jpeg', quality: 92 }); console.log(out)
}
await browser.close()
