// node rec_phone.cjs <out dir>: four public gamdom.com pages at 412 x 732 (x2), logged out, read-only, one mp4 each
// read-only, logged-out capture of public gamdom.com pages in a phone-sized window (plain load, no UA/locale changes):
// wait for the page, hold, then a slow eased scroll, one screenshot per frame
const { chromium } = require('playwright')
const { execFileSync } = require('child_process'), fs = require('fs')
;(async () => {
  const OUT = process.argv[2]
  const b = await chromium.launch()
  const p = await b.newPage({ viewport: { width: 412, height: 732 }, deviceScaleFactor: 2 })
  const plan = [['mhome', '/', 20, 70, 430], ['morig', '/casino/providers/gamdom-originals', 20, 70, 330], ['mkoth', '/koth', 20, 70, 300], ['msports', '/sports', 20, 70, 300]]
  const ease = u => u < .5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2
  for (const [n, u, hold, move, dist] of plan) {
    await p.goto('https://gamdom.com' + u, { waitUntil: 'domcontentloaded', timeout: 90000 })
    let ok = false
    for (let i = 0; i < 40 && !ok; i++) { await p.waitForTimeout(2000); ok = await p.evaluate(() => document.body.innerText.length > 300) }
    await p.waitForTimeout(6000)
    const d = `${OUT}/${n}`; fs.rmSync(d, { recursive: true, force: true }); fs.mkdirSync(d, { recursive: true })
    let f = 0
    const shot = async () => { await p.screenshot({ path: `${d}/${String(++f).padStart(4, '0')}.png` }) }
    for (let i = 0; i < hold; i++) await shot()
    for (let i = 1; i <= move; i++) {
      const y = dist * ease(i / move)
      await p.evaluate(y => { const els = [...document.querySelectorAll('*')].filter(e => e.scrollHeight > e.clientHeight + 100 && /auto|scroll/.test(getComputedStyle(e).overflowY)); const e = els.sort((a, b) => (b.scrollHeight - b.clientHeight) - (a.scrollHeight - a.clientHeight))[0] || document.scrollingElement; e.scrollTop = y }, y)
      await p.waitForTimeout(30); await shot()
    }
    for (let i = 0; i < 10; i++) await shot()
    execFileSync('ffmpeg', ['-v', 'error', '-y', '-framerate', '30', '-i', `${d}/%04d.png`, '-vf', 'scale=out_color_matrix=bt709:out_range=tv:flags=lanczos+accurate_rnd+full_chroma_int,format=yuv420p',
      '-c:v', 'libx264', '-crf', '14', '-preset', 'slow', '-colorspace', 'bt709', '-color_primaries', 'bt709', '-color_trc', 'bt709', `${OUT}/${n}.mp4`])
    console.log(n, f, 'frames', ok ? 'loaded' : 'NOT LOADED', new Date().toISOString().slice(11, 19))
  }
  await b.close()
})()
