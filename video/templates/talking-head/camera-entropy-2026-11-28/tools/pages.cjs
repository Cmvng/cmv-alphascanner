// Phone-sized captures of Entropy's public pages (cookie banner answered "Reject all"; no login, no wallet).
//   node pages.cjs <outdir> name=url ...
const { open } = require('./pw_common.cjs')
;(async () => {
  const [out, ...pairs] = process.argv.slice(2)
  const { b, ctx } = await open(430, 932, 2.5, true)
  for (const pr of pairs) {
    const i = pr.indexOf('='); const name = pr.slice(0, i), url = pr.slice(i + 1)
    const p = await ctx.newPage()
    try { await p.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 }) } catch (e) { console.log(name, 'load', e.message.slice(0, 80)) }
    await p.waitForTimeout(9000)
    for (const t of ['Reject all', 'Reject All']) { const bt = p.getByRole('button', { name: t }); if (await bt.count()) { await bt.first().click().catch(() => {}); await p.waitForTimeout(1500) } }
    await p.screenshot({ path: `${out}/${name}_top.png` })
    await p.screenshot({ path: `${out}/${name}.png`, fullPage: true })
    const wb = await p.evaluate(require('fs').readFileSync(__dirname + '/wordboxes.js', 'utf8'))
    require('fs').writeFileSync(`${out}/${name}.words.json`, JSON.stringify({ scale: 2.5, words: wb }))
    console.log(name, (await p.evaluate(() => document.body.innerText)).replace(/\s+/g, ' ').slice(0, 200))
    await p.close()
  }
  await b.close()
})()
