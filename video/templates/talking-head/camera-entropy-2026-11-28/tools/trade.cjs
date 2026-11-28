// The real trade screen: Short, Long, then the amounts the owner says typed into the Amount field (no login).
const { open } = require('./pw_common.cjs')
const fs = require('fs'), WB = fs.readFileSync(__dirname + '/wordboxes.js', 'utf8')
const out = process.argv[2]
;(async () => {
  const { b, ctx } = await open(430, 932, 2.5, true)
  const p = await ctx.newPage()
  const shot = async (name, full) => { await p.screenshot({ path: `${out}/${name}.png`, fullPage: !!full }); fs.writeFileSync(`${out}/${name}.words.json`, JSON.stringify({ scale: 2.5, words: await p.evaluate(WB) })); process.stdout.write('shot ' + name + '\n') }
  try { await p.goto('https://entropy.io/', { waitUntil: 'domcontentloaded', timeout: 45000 }) } catch (e) {}
  await p.waitForTimeout(9000)
  for (const t of ['Reject all', 'Reject All']) { const bt = p.getByRole('button', { name: t }); if (await bt.count()) { await bt.first().click().catch(() => {}); await p.waitForTimeout(1200) } }
  const info = await p.evaluate(() => [...document.querySelectorAll('input,[contenteditable=true]')].map(i => { const r = i.getBoundingClientRect(); return [i.tagName, i.type, i.placeholder, i.value, Math.round(r.left), Math.round(r.top), Math.round(r.width), Math.round(r.height)] }))
  process.stdout.write('inputs ' + JSON.stringify(info) + '\n')
  const clickText = async t => { const l = p.getByText(t, { exact: true }); const n = await l.count(); if (!n) { process.stdout.write('no ' + t + '\n'); return false } await l.first().click({ timeout: 4000 }).catch(e => process.stdout.write('click fail ' + t + '\n')); await p.waitForTimeout(900); return true }
  if (await clickText('Short')) await shot('t_short')
  if (await clickText('Long')) await shot('t_long')
  const amt = info.find(i => i[0] === 'INPUT' && i[5] > 500 && i[5] < 760 && i[6] > 200)
  process.stdout.write('amount field ' + JSON.stringify(amt) + '\n')
  for (const v of ['10000', '50000', '250000', '3000000', '6000000', '10000000', '100000000']) {
    if (amt) { await p.mouse.click(amt[4] + amt[6] / 2, amt[5] + amt[7] / 2) } else { await p.mouse.click(215, 634) }
    await p.keyboard.press('Control+A'); await p.keyboard.press('Backspace'); await p.keyboard.type(v, { delay: 25 }); await p.waitForTimeout(800)
    await shot('t_amt_' + v)
  }
  await shot('t_amt_' + 'full', true)
  await b.close()
})()
