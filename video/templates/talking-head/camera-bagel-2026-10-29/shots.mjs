// Render the redrawn screens (screens.html) to 1080x1474 PNGs and write each one's marked rects to rects.json.
//   PW=<playwright> node shots.mjs <out dir>
import { createRequire } from 'module'
import fs from 'fs'
import path from 'path'
const require = createRequire(import.meta.url)
const { chromium } = require(process.env.PW)
const [out] = process.argv.slice(2)
fs.mkdirSync(out, { recursive: true })
const page_ = path.join(path.dirname(new URL(import.meta.url).pathname), 'screens.html')
const b = await chromium.launch({ args: ['--allow-file-access-from-files'] })
const p = await b.newPage({ viewport: { width: 430, height: 587 }, deviceScaleFactor: 1080 / 430 })
await p.goto('file://' + page_); await p.evaluate(() => window.READY)
const SHOTS = [['b_search'], ['b_nores', { q: 'Al-Hazm' }], ['b_nores_benfica', { q: 'benfica gil vicente' }], ['b_nores_shabana', { q: 'shabana' }],
  ['b_results'], ['b_event'], ['b_event_sel'], ['b_home'], ['b_home_0'], ['b_home_2'], ['b_home_3'], ['b_home_4'], ['b_home_placed'], ['b_stake'], ['b_pos'], ['c_slip4'], ['c_slip8'], ['c_safer']]
const rects = {}
for (const [id, o] of SHOTS) {
  rects[id] = await p.evaluate(([id, o]) => window.show(id, o || {}), [id, o])
  await p.waitForTimeout(150)
  await p.screenshot({ path: `${out}/${id}.png` })
}
fs.writeFileSync(`${out}/rects.json`, JSON.stringify(rects, null, 1))
await b.close(); console.log(SHOTS.length, 'screens')
