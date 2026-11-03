// Rasterize an SVG through <img> (no scripts run): node svg2png.mjs <in.svg> <out.png> <width>
import { createRequire } from 'module'
import fs from 'fs'
const require = createRequire(import.meta.url)
const { chromium } = require('/opt/node22/lib/node_modules/playwright')
const [inp, out, w] = process.argv.slice(2)
const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: +w, height: 800 } })
const data = 'data:image/svg+xml;base64,' + fs.readFileSync(inp).toString('base64')
await p.setContent(`<html><body style="margin:0;background:transparent"><img id=i src="${data}" style="width:${w}px;display:block"></body></html>`)
await p.waitForFunction(() => document.getElementById('i').complete)
const el = await p.$('#i'); await el.screenshot({ path: out, omitBackground: true }); await b.close()
