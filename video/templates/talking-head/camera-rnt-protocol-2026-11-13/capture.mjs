// The real RNT screens for the video, captured as served (no wallet, no login), on 13 Nov 2026.
//   node capture.mjs <out dir>
// Each shot is a whole panel of the real page (its own edges), at twice the pixels, so it stays sharp in a card.
// The cookie banner is declined first ("Opt-out") so it does not cover the page.
import { createRequire } from 'module'
const require = createRequire(import.meta.url)
const { chromium } = require('/opt/node22/lib/node_modules/playwright')
const out = process.argv[2]
const L = 'https://lend.rnt.finance', M = '&marketName=reental_polygon_v3'
const SHOTS = [
  ['lend-home', `${L}/`, { x: 0, y: 48, width: 760, height: 900 }, 760],                                          // the market and its first asset, at a phone-ish width so the type is big
  ['lend-cme1-head', `${L}/reserve-overview/?underlyingAsset=0x243e4bacc4b4d61b87816c945544286eb29125c6${M}`, { x: 0, y: 64, width: 760, height: 198 }, 760],  // one property token: its name and price
  ['lend-cme1', `${L}/reserve-overview/?underlyingAsset=0x243e4bacc4b4d61b87816c945544286eb29125c6${M}`, { x: 20, y: 244, width: 808, height: 350 }],       // its card: Max LTV, liquidation threshold, penalty
  ['lend-usdt', `${L}/reserve-overview/?underlyingAsset=0xc2132d05d31c914a87c6611c10748aeb04b58e8f${M}`, { x: 20, y: 244, width: 808, height: 556 }],       // USDT0: the supply APY and its week
  ['site-home', 'https://www.rnt.finance/', { x: 0, y: 0, width: 1280, height: 860 }],
]
const b = await chromium.launch()
for (const [name, url, clip, vw] of SHOTS) {
  const p = await b.newPage({ viewport: { width: vw || 1280, height: 1100 }, deviceScaleFactor: 2 })
  try { await p.goto(url, { waitUntil: 'networkidle', timeout: 60000 }) } catch (e) { console.log('slow', name) }
  await p.waitForTimeout(5000)
  for (const t of ['Opt-out', 'Reject', 'Rechazar', 'Decline']) { const btn = p.getByRole('button', { name: t }); if (await btn.count()) { await btn.first().click().catch(() => 0); await p.waitForTimeout(600) } }
  if (clip) await p.screenshot({ path: `${out}/${name}.png`, clip })
  await p.screenshot({ path: `${out}/${name}_full.png`, fullPage: false })
  console.log(name, 'ok', new Date().toISOString())
  await p.close()
}
await b.close()
