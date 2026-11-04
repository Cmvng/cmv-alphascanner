// node cover.mjs <cover.html> <out dir>  ->  cover (1080x1920) and thumbnail (1280x720)
import { createRequire } from 'module'
const require = createRequire(import.meta.url)
const { chromium } = require('/opt/node22/lib/node_modules/playwright')
const [page_, out] = process.argv.slice(2)
const b = await chromium.launch({ args: ['--allow-file-access-from-files', '--force-color-profile=srgb'] })
for (const [k, w, h, name] of [['v', 1080, 1920, 'agentics_cover.png'], ['t', 1280, 720, 'agentics_thumbnail.png']]) {
  const p = await b.newPage({ viewport: { width: w, height: h } }); await p.goto(`file://${page_}#${k}`); await p.evaluate(() => window.READY)
  await p.waitForTimeout(200); await p.screenshot({ path: `${out}/${name}` }); await p.close()
}
await b.close()
