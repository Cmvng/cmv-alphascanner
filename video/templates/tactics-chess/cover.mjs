// node cover.mjs <cover dir with cover.html + cover.js> <out dir> <name>  ->  <name>_cover.png (1080x1920), <name>_thumbnail.png (1280x720)
import { createRequire } from 'module'
const require = createRequire(import.meta.url)
const { chromium } = require('/opt/node22/lib/node_modules/playwright')
const [dir, out, name] = process.argv.slice(2)
const b = await chromium.launch({ args: ['--allow-file-access-from-files', '--force-color-profile=srgb'] })
for (const [k, w, h, suf] of [['v', 1080, 1920, 'cover'], ['t', 1280, 720, 'thumbnail']]) {
  const p = await b.newPage({ viewport: { width: w, height: h } }); await p.goto(`file://${dir}/cover.html#${k}`); await p.evaluate(() => window.READY)
  await p.waitForTimeout(200); await p.screenshot({ path: `${out}/${name}_${suf}.png` }); await p.close()
}
await b.close()
