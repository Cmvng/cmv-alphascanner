// Cover (1080x1920) and thumbnail (1280x720) for the edit.
//   node cover.mjs <cover.html next to img/still.png> <out prefix>
import { createRequire } from 'module'
const require = createRequire(import.meta.url)
const { chromium } = require(process.env.PW || '/opt/node22/lib/node_modules/playwright')
const [page_, out] = process.argv.slice(2)
const b = await chromium.launch({ args: ['--allow-file-access-from-files', '--force-color-profile=srgb'] })
for (const [m, w, h, f] of [['v', 1080, 1920, '_cover.png'], ['t', 1280, 720, '_thumbnail.png']]) {
  const p = await b.newPage({ viewport: { width: w, height: h } })
  await p.goto('file://' + page_ + '#' + m); await p.evaluate(() => window.READY)
  await p.screenshot({ path: out + f }); await p.close()
}
await b.close()
