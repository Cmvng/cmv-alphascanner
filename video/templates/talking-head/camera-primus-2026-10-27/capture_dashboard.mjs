// Capture Primus Points' real dashboard (/home) for the edit: the app's own code, CSS and images as served, with the one
// line that sends logged-out visitors back to "/" skipped in this local copy (nothing else changes; no account data).
// Requests go through Node (TLS verified against the proxy's CA bundle). No wallet, no login, no clicks on "Verify Now".
// It clicks the week tabs and the sidebar tabs, screenshots each view, and writes every card's position to rects.json.
//   NODE_USE_ENV_PROXY=1 node capture_dashboard.mjs https://points.primuslabs.xyz/home <out dir> 1440 1330 2
// The window is tall enough for the whole page: a full-page screenshot resizes it and the app re-renders its first tab.
import { createRequire } from 'module'
import fs from 'fs'
const require = createRequire(import.meta.url)
const { chromium } = require('/opt/node22/lib/node_modules/playwright')
const [url, outDir, w, h, scale, actions] = process.argv.slice(2)
fs.mkdirSync(outDir, { recursive: true })
const b = await chromium.launch()
const ctx = await b.newContext({ viewport: { width: +w, height: +h }, deviceScaleFactor: +(scale || 2) })
let patched = 0
await ctx.route('**/*', async route => {
  const r = route.request(), u = r.url()
  if (!/^https?:/.test(u)) return route.continue()
  try {
    const headers = { ...r.headers() }; delete headers['host']
    const res = await fetch(u, { method: r.method(), headers, body: ['GET', 'HEAD'].includes(r.method()) ? undefined : r.postDataBuffer() })
    let body = Buffer.from(await res.arrayBuffer())
    if (/\/assets\/index-[^/]+\.js$/.test(u)) {
      const s = body.toString('utf8'), a = 'P||a(lR("/",et))}'
      if (s.includes(a)) { body = Buffer.from(s.replace(a, 'P||0}'), 'utf8'); patched++ }
    }
    const hs = {}; res.headers.forEach((v, k) => { if (!['content-encoding', 'content-length', 'transfer-encoding'].includes(k)) hs[k] = v })
    await route.fulfill({ status: res.status, headers: hs, body })
  } catch (e) { await route.abort() }
})
const p = await ctx.newPage()
p.on('pageerror', e => console.log('PAGE ERROR', e.message.slice(0, 200)))
await p.goto(url, { waitUntil: 'load', timeout: 90000 }).catch(e => console.log('goto', e.message.split('\n')[0]))
await p.waitForTimeout(8000)
console.log('patched', patched, 'at', p.url())
// fonts the page names but never loads would show as a fallback (Times) in the capture: FONTS="Play:wght@400;700,..."
if (process.env.FONTS) {
  for (const f of process.env.FONTS.split(',')) await p.addStyleTag({ url: `https://fonts.googleapis.com/css2?family=${f}&display=block` })
  await p.evaluate(async () => { await document.fonts.ready; await Promise.all([...document.fonts].filter(f => f.status !== 'loaded').map(f => f.load().catch(() => 0))) })
  await p.waitForTimeout(1500)
}
const fontCheck = () => p.evaluate(() => {
  const loaded = new Set([...document.fonts].filter(f => f.status === 'loaded').map(f => f.family.replace(/["']/g, '')))
  const fams = new Set(); for (const el of document.querySelectorAll('body *')) if (el.childElementCount === 0 && el.textContent.trim() && el.getBoundingClientRect().width > 0) fams.add(getComputedStyle(el).fontFamily.split(',')[0].replace(/["']/g, '').trim())
  return [...fams].filter(f => !loaded.has(f))
})
// the positions (page pixels at 1x) of everything the edit points at
const rects = () => p.evaluate(() => {
  const R = el => { const r = el.getBoundingClientRect(); return [Math.round(r.x + scrollX), Math.round(r.y + scrollY), Math.round(r.width), Math.round(r.height)] }
  const vis = el => { const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0 && getComputedStyle(el).visibility !== 'hidden' }
  const out = { cards: {}, weeks: {}, side: {}, misc: {} }
  document.querySelectorAll('.templateItem').forEach(el => { if (!vis(el)) return; const n = el.querySelector('.dataSourceName'); if (n) out.cards[n.textContent.trim()] = R(el) })
  document.querySelectorAll('.weekTabItem').forEach(el => out.weeks[el.textContent.trim()] = R(el))
  document.querySelectorAll('[role=tab]').forEach(el => { if (!el.classList.contains('weekTabItem')) out.side[el.textContent.trim().slice(0, 40)] = R(el) })
  for (const [k, sel] of Object.entries({ banner: '.bannerWrapper', panel: '.panelViewport', tasks: '.panelChunk:not([hidden])', header: '.layoutHeader' })) { const el = document.querySelector(sel); if (el) out.misc[k] = R(el) }
  const all = [...document.querySelectorAll('*')]
  const byText = t => all.find(e => e.children.length === 0 && e.textContent.trim() === t && vis(e))
  for (const t of ['NEW', 'Enable Extension', 'Agentic Ara', 'Identity Profile', 'Platform Activities', 'Tasks & Campaign']) { const el = byText(t); if (el) out.misc[t] = R(el) }
  out.page = [document.documentElement.scrollWidth, document.documentElement.scrollHeight]
  return out
})
const shots = {}
async function snap(name) {
  await p.waitForTimeout(1800)
  const miss = await fontCheck(); if (miss.length) console.log('MISSING FONTS in', name, '(pass them in FONTS):', miss.join(', '))
  await p.screenshot({ path: `${outDir}/${name}.png` })
  shots[name] = await rects(); console.log('shot', name, Object.keys(shots[name].cards).join(', '))
}
const clickText = async (sel, text) => { const el = p.locator(sel, { hasText: text }).first(); await el.click({ timeout: 5000 }) }
await snap('nomad')
for (const [name, label] of [['pnl', 'Proof of PnL'], ['ai', 'Proof of AI Affinity'], ['trade', 'Proof of Trade']]) {
  try { await clickText('.weekTabItem', label); await snap(name) } catch (e) { console.log('tab fail', label, e.message.slice(0, 120)) }
}
for (const [name, label] of [['identity', 'Identity Profile'], ['platform', 'Platform Activities']]) {
  try { await clickText('[role=tab]', label); await snap(name) } catch (e) { console.log('side fail', label, e.message.slice(0, 120)) }
}
fs.writeFileSync(`${outDir}/rects.json`, JSON.stringify(shots, null, 1))
await b.close()
