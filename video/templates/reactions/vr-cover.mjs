// Covers (1080x1920) and thumbnails (1280x720) for the video-reaction demos. vr-cover.html reads its pictures from
// video/out/vreact-demo/cover/: a frame of each video and a frame of the reaction (see the page).
//   PW=<playwright> node vr-cover.mjs <out dir> held primus
import { createRequire } from 'module'
import path from 'path'
const require = createRequire(import.meta.url)
const { chromium } = require(process.env.PW)
const [out, ...names] = process.argv.slice(2)
const page_ = path.join(path.dirname(new URL(import.meta.url).pathname), 'vr-cover.html')
const b = await chromium.launch({ args: ['--allow-file-access-from-files'] })
for (const n of names)
  for (const [m, w, h, f] of [['v', 1080, 1920, 'cover'], ['h', 1280, 720, 'thumbnail']]) {
    const p = await b.newPage({ viewport: { width: w, height: h } })
    await p.goto(`file://${page_}#${n}-${m}`); await p.evaluate(() => window.READY)
    await p.screenshot({ path: `${out}/${n}-${f}.png` }); await p.close()
  }
await b.close()
