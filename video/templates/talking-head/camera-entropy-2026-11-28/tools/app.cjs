// States of Entropy's real trade screen and pages at phone size, for the screen-recording parts (no login, no wallet).
const { open } = require('./pw_common.cjs')
const fs = require('fs'), WB = fs.readFileSync(__dirname + '/wordboxes.js', 'utf8')
const out = process.argv[2]
;(async () => {
  const { b, ctx } = await open(430, 932, 2.5, true)
  const p = await ctx.newPage()
  const shot = async (name, full) => { await p.screenshot({ path: `${out}/${name}.png`, fullPage: !!full }); fs.writeFileSync(`${out}/${name}.words.json`, JSON.stringify({ scale: 2.5, words: await p.evaluate(WB) })); console.log('shot', name) }
  try { await p.goto('https://entropy.io/', { waitUntil: 'domcontentloaded', timeout: 45000 }) } catch (e) { console.log('goto', e.message.slice(0, 80)) }
  await p.waitForTimeout(9000)
  for (const t of ['Reject all', 'Reject All']) { const bt = p.getByRole('button', { name: t }); if (await bt.count()) { await bt.first().click().catch(() => {}); await p.waitForTimeout(1200) } }
  await shot('t0')
  const inputs = await p.$$eval('input', is => is.map(i => [i.type, i.placeholder, i.name, i.inputMode, Math.round(i.getBoundingClientRect().top)]))
  console.log('inputs', JSON.stringify(inputs))
  const btns = await p.$$eval('button', bs => bs.map(x => x.innerText.trim()).filter(Boolean).slice(0, 40))
  console.log('buttons', JSON.stringify(btns))
  const tap = async (txt) => { const bt = p.getByRole('button', { name: txt, exact: true }); if (await bt.count()) { await bt.first().click().catch(e => console.log('tap fail', txt)); await p.waitForTimeout(900); return true } console.log('no button', txt); return false }
  if (await tap('Short')) await shot('t_short')
  if (await tap('Long')) await shot('t_long')
  const amt = p.locator('input').first()
  for (const v of ['10000', '50000', '250000', '3000000', '6000000', '10000000', '100000000']) {
    try { await amt.click({ timeout: 3000 }); await amt.fill(''); await amt.type(v, { delay: 20 }); await p.waitForTimeout(700); await shot('t_amt_' + v) } catch (e) { console.log('type fail', v, e.message.slice(0, 60)) }
  }
  await shot('t_amt_full', true)
  await p.evaluate(() => scrollTo(0, 0))
  for (const [nav, name] of [['Referrals', 'nav_ref'], ['Markets', 'nav_mk'], ['Social', 'nav_soc']]) {
    const l = p.getByText(nav, { exact: true }); if (await l.count()) { await l.last().click().catch(() => {}); await p.waitForTimeout(4000); await shot(name); await shot(name + '_full', true) } else console.log('no nav', nav)
  }
  // the docs: the volume tier table
  for (const [u, name] of [['https://docs.entropy.io/about-entropy/referrals-and-fees/frontend-fees', 'docs_ff'], ['https://docs.entropy.io/about-entropy/referrals-and-fees/referrals', 'docs_ref']]) {
    try { await p.goto(u, { waitUntil: 'domcontentloaded', timeout: 40000 }) } catch (e) {}
    await p.waitForTimeout(6000)
    const x = p.locator('button[aria-label*="lose" i], button[aria-label*="ismiss" i]'); if (await x.count()) { await x.first().click().catch(() => {}); await p.waitForTimeout(800) }
    await shot(name); await shot(name + '_full', true)
  }
  await b.close()
})()
