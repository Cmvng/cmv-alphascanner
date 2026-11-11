// Capture a public Primus docs page as it is served, at a phone-width window, and write where given phrases sit.
// Requests go through Node (TLS verified against the proxy's CA bundle). No login, no clicks.
//   NODE_USE_ENV_PROXY=1 node capture_docs.mjs <url> <out dir> <css width> <css height> <scale> "phrase|phrase|..."
import { createRequire } from 'module'
import fs from 'fs'
const require = createRequire(import.meta.url)
const { chromium } = require('/opt/node22/lib/node_modules/playwright')
const [url, outDir, w, h, scale, phrases] = process.argv.slice(2)
fs.mkdirSync(outDir, { recursive: true })
const b = await chromium.launch()
const ctx = await b.newContext({ viewport: { width: +w, height: +h }, deviceScaleFactor: +scale, colorScheme: 'light' })
await ctx.route('**/*', async route => {
  const r = route.request(), u = r.url()
  if (!/^https?:/.test(u)) return route.continue()
  try {
    const headers = { ...r.headers() }; delete headers['host']
    const res = await fetch(u, { method: r.method(), headers, body: ['GET', 'HEAD'].includes(r.method()) ? undefined : r.postDataBuffer() })
    const body = Buffer.from(await res.arrayBuffer())
    const hs = {}; res.headers.forEach((v, k) => { if (!['content-encoding', 'content-length', 'transfer-encoding'].includes(k)) hs[k] = v })
    await route.fulfill({ status: res.status, headers: hs, body })
  } catch (e) { await route.abort() }
})
const p = await ctx.newPage()
await p.goto(url, { waitUntil: 'load', timeout: 90000 }).catch(e => console.log('goto', e.message.split('\n')[0]))
await p.waitForTimeout(4000)
await p.evaluate(async () => { await document.fonts.ready })
const rects = await p.evaluate(list => {
  const out = {}
  for (const ph of list) {
    const tw = document.createTreeWalker(document.querySelector('article') || document.body, NodeFilter.SHOW_TEXT); let n
    while ((n = tw.nextNode())) { const i = n.textContent.indexOf(ph); if (i < 0) continue
      const r = document.createRange(); r.setStart(n, i); r.setEnd(n, i + ph.length)
      out[ph] = [...r.getClientRects()].map(q => [q.x + scrollX, q.y + scrollY, q.width, q.height]); break }
  }
  const h1 = document.querySelector('article h1'); if (h1) { const q = h1.getBoundingClientRect(); out.h1 = [[q.x, q.y + scrollY, q.width, q.height]] }
  out.title = document.title; out.url = location.href; out.height = document.documentElement.scrollHeight
  return out
}, (phrases || '').split('|').filter(Boolean))
await p.screenshot({ path: `${outDir}/page.png`, clip: { x: 0, y: 0, width: +w, height: Math.min(rects.height, +h) } })
fs.writeFileSync(`${outDir}/rects.json`, JSON.stringify({ ...rects, scale: +scale, w: +w, read: new Date().toISOString() }, null, 1))
console.log(JSON.stringify(rects).slice(0, 900))
await b.close()
