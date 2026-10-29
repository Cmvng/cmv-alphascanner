// Cover (1080x1920) and thumbnail (1280x720) for the Bagel edit.
//   PW=<playwright> node cover.mjs <out prefix>
import { createRequire } from 'module'
import path from 'path'
const require = createRequire(import.meta.url)
const { chromium } = require(process.env.PW)
const [out] = process.argv.slice(2)
const page_ = path.join(path.dirname(new URL(import.meta.url).pathname), 'cover.html')
const b = await chromium.launch({ args: ['--allow-file-access-from-files'] })
for (const [m, w, h, f] of [['v', 1080, 1920, '_cover.png'], ['h', 1280, 720, '_thumbnail.png']]) {
  const p = await b.newPage({ viewport: { width: w, height: h } })
  await p.goto('file://' + page_ + '#' + m); await p.evaluate(() => window.READY)
  await p.screenshot({ path: out + f }); await p.close()
}
await b.close()
