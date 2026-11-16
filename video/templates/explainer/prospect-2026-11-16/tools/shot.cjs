// node shot.mjs <outdir> <name>=<url> ...   full-page screenshots at DPR 2 + the page text
const { chromium } = require('playwright');
const fs = require('fs');
(async () => {
const [out, ...jobs] = process.argv.slice(2);
const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 1280, height: 900 }, deviceScaleFactor: 2 });
for (const j of jobs) {
  const i = j.indexOf('='); const name = j.slice(0, i), url = j.slice(i + 1);
  const p = await ctx.newPage();
  try {
    const r = await p.goto(url, { waitUntil: 'networkidle', timeout: 45000 }).catch(e => (console.log('goto', e.message.split('\n')[0]), null));
    await p.waitForTimeout(2500);
    const t = await p.evaluate(() => document.body ? document.body.innerText : '');
    fs.writeFileSync(`${out}/${name}.txt`, t);
    await p.screenshot({ path: `${out}/${name}.png`, fullPage: true });
    const h = await p.evaluate(() => document.documentElement.scrollHeight);
    console.log(name, r ? r.status() : '-', 'h', h, 'title:', (await p.title()).slice(0, 80), '| text', t.length);
  } catch (e) { console.log(name, 'ERR', e.message.split('\n')[0]); }
  await p.close();
}
await b.close();
})();
