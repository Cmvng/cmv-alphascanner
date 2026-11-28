// Whole X posts as X's own embed draws them (the public embed widget), at 2x.  node posts.cjs <outdir> name=id ...
const { open } = require('./pw_common.cjs')
;(async () => {
  const [out, ...pairs] = process.argv.slice(2)
  const { b, ctx } = await open(560, 2400, 2)
  for (const pr of pairs) {
    const [name, id] = pr.split('=')
    const p = await ctx.newPage()
    await p.setContent(`<html><body style="margin:0;background:#fff"><div id="w" style="width:550px;padding:5px"><blockquote class="twitter-tweet" data-dnt="true" data-conversation="none"><a href="https://twitter.com/x/status/${id}"></a></blockquote></div><script async src="https://platform.twitter.com/widgets.js"></script></body></html>`, { waitUntil: 'load' })
    try { await p.waitForSelector('iframe[id^="twitter-widget"]', { timeout: 20000 }) } catch (e) { console.log(name, 'no embed'); continue }
    await p.waitForTimeout(6000)
    const f = await p.$('iframe[id^="twitter-widget"]')
    const fr = await f.contentFrame()
    const txt = fr ? (await fr.evaluate(() => document.body.innerText)).replace(/\s+/g, ' ').slice(0, 260) : ''
    await f.screenshot({ path: `${out}/${name}.png` })
    const wb = fr ? await fr.evaluate(require('fs').readFileSync(__dirname + '/wordboxes.js', 'utf8')) : []
    require('fs').writeFileSync(`${out}/${name}.words.json`, JSON.stringify({ scale: 2, words: wb }))
    console.log(name, id, '|', txt)
    await p.close()
  }
  await b.close()
})()
