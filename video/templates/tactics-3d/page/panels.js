/* panels.js: the HTML layer over the 3D board, driven by PLAN.ui (take seconds; T() maps to video time).
   Types: giant (big word over the board), title, bug (score bug), chip (small pill), stat (big number card),
   coach (formation card), bars (stats panel), quote, table, cta, note (footnote), flash (whistle flash). */
(function () {
  const P = window.PLAN, cl = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x)), eo = x => 1 - Math.pow(1 - cl(x), 3)
  const eback = x => { x = cl(x); const c = 1.4; return 1 + (c + 1) * Math.pow(x - 1, 3) + c * Math.pow(x - 1, 2) }
  const root = document.getElementById('panels'), H = P.teams.home, A = P.teams.away
  const el = (html, cls, style) => { const d = document.createElement('div'); d.className = 'panel ' + (cls || ''); d.innerHTML = html; if (style) d.style.cssText += style; root.appendChild(d); return d }
  const css = document.createElement('style'); css.textContent = `
    .giantw{position:absolute;left:0;right:0;text-align:center;opacity:0;pointer-events:none}
    .giantw .g{font:300 210px/0.92 Osw,sans-serif;text-transform:uppercase;color:#fff;text-shadow:0 8px 40px rgba(8,20,50,.55),0 2px 6px rgba(8,20,50,.4);white-space:nowrap}
    .giantw .s{margin-top:14px;font:800 40px/1 Man,sans-serif;letter-spacing:.14em;text-transform:uppercase;color:#fff;text-shadow:0 4px 18px rgba(8,20,50,.6)}
    .title{left:50%;top:50%;width:1360px;margin-left:-680px;margin-top:-250px;padding:46px 60px 50px;text-align:center}
    .title .row{display:flex;align-items:center;justify-content:center;gap:34px;margin-top:22px}
    .title .tm{display:flex;align-items:center;gap:18px;font:300 96px/1 Osw,sans-serif;text-transform:uppercase;color:var(--navy);white-space:nowrap}
    .title .tm i{width:26px;height:84px;border-radius:8px}
    .title .sc{font:400 120px/1 Anton,sans-serif;color:var(--navy);letter-spacing:.04em;white-space:nowrap}
    .title .why{margin-top:26px;font:800 46px/1 Man,sans-serif;color:var(--blue)}
    .chip2{position:absolute;opacity:0;padding:16px 26px;border-radius:18px;background:rgba(11,31,68,.9);color:#fff;font:800 34px/1 Man,sans-serif;box-shadow:0 14px 30px rgba(0,0,0,.25);white-space:nowrap}
    .chip2 b{color:#9FD3FF;font-weight:800}
    .stat{width:560px;padding:30px 36px}
    .stat .n{font:300 150px/1 Osw,sans-serif;color:var(--navy)}
    .stat .l{margin-top:10px;font:800 32px/1.25 Man,sans-serif;color:var(--navy)}
    .stat .src{margin-top:14px;font:600 22px/1.2 Man,sans-serif;color:var(--mut)}
    .coach{padding:22px 30px;display:flex;align-items:center;gap:20px}
    .coach i{width:16px;height:70px;border-radius:6px}
    .coach .a{font:300 64px/1 Osw,sans-serif;color:var(--navy);text-transform:uppercase}
    .coach .b{margin-top:6px;font:800 26px/1 Man,sans-serif;color:var(--mut)}
    .bars{left:50%;top:120px;width:1240px;margin-left:-620px;padding:40px 56px 36px}
    .bars .hd{display:flex;justify-content:space-between;font:300 58px/1 Osw,sans-serif;text-transform:uppercase;color:var(--navy);margin-bottom:18px}
    .bars .r{margin:20px 0 0;transition:none}
    .bars .lb{display:flex;justify-content:space-between;font:800 34px/1 Man,sans-serif;color:var(--navy)}
    .bars .lb span:nth-child(2){font:800 24px/34px Man,sans-serif;letter-spacing:.14em;text-transform:uppercase;color:var(--mut)}
    .bars .tr{display:flex;height:16px;margin-top:10px;border-radius:8px;overflow:hidden;background:#E3E9F3}
    .bars .tr i{display:block;height:100%}
    .bars .src{margin-top:24px;font:600 22px/1 Man,sans-serif;color:var(--mut);text-align:right}
    .quote{width:820px;padding:40px 48px;border-left:16px solid}
    .quote .t{font:800 48px/1.25 Man,sans-serif;color:var(--navy)}
    .quote .w{margin-top:22px;font:800 30px/1 Man,sans-serif;color:var(--navy)}
    .quote .w span{font-weight:600;color:var(--mut)}
    .table{width:760px;padding:30px 40px}
    .table .rw{display:flex;align-items:center;gap:22px;height:78px;border-top:1px solid rgba(11,31,68,.1);font:800 40px/1 Man,sans-serif;color:var(--navy)}
    .table .rw:first-of-type{border-top:0}
    .table .rw .p{width:70px;font:300 48px/1 Osw,sans-serif;color:var(--mut)}
    .table .rw i{width:14px;height:44px;border-radius:4px}
    .table .rw .pt{margin-left:auto;font:300 48px/1 Osw,sans-serif}
    .cta{left:50%;top:50%;width:1100px;margin-left:-550px;margin-top:-170px;padding:44px 56px;text-align:center}
    .cta .t{font:300 92px/1.02 Osw,sans-serif;text-transform:uppercase;color:var(--navy)}
    .cta .h{display:inline-block;margin-top:26px;font:800 44px/1 Man,sans-serif;color:#fff;background:var(--navy);padding:16px 30px;border-radius:40px}
    .cta .f{margin-top:20px;font:600 24px/1 Man,sans-serif;letter-spacing:.12em;text-transform:uppercase;color:var(--mut)}
    .note{position:absolute;left:40px;bottom:22px;font:600 20px/1 Man,sans-serif;color:rgba(255,255,255,.85);text-shadow:0 1px 4px rgba(0,0,0,.4);opacity:0}`
  document.head.appendChild(css)
  const U = (P.ui || []).map(u => {
    let d
    if (u.type === 'giant') { d = document.createElement('div'); d.className = 'giantw'; d.style.top = (u.y || 380) + 'px'; d.innerHTML = `<div class="g" style="${u.size ? 'font-size:' + u.size + 'px' : ''}">${u.text}</div>${u.sub ? `<div class="s">${u.sub}</div>` : ''}`; root.appendChild(d) }
    else if (u.type === 'title') d = el(`<div class="kick">${u.kick}</div><div class="row"><div class="tm"><i style="background:${H.c1}"></i>${H.name}</div><div class="sc">${u.score}</div><div class="tm">${A.name}<i style="background:${A.c1}"></i></div></div><div class="why">${u.why}</div>`, 'title')
    else if (u.type === 'chip') { d = document.createElement('div'); d.className = 'chip2'; d.innerHTML = u.text; d.style.left = u.x + 'px'; d.style.top = u.y + 'px'; if (u.anchor === 'c') d.style.transform = 'translateX(-50%)'; root.appendChild(d) }
    else if (u.type === 'stat') d = el(`<div class="n" style="color:${u.color || 'var(--navy)'}">${u.big}</div><div class="l">${u.label}</div>${u.src ? `<div class="src">${u.src}</div>` : ''}`, 'stat', `left:${u.x}px;top:${u.y}px`)
    else if (u.type === 'coach') d = el(`<i style="background:${u.team === 'home' ? H.c1 : A.c1}"></i><div><div class="a">${u.text}</div><div class="b">${u.sub}</div></div>`, 'coach', `left:${u.x}px;top:${u.y}px`)
    else if (u.type === 'bars') {
      const rows = u.rows.map(r => { const tot = r[1] + r[2], w1 = (r[1] / tot * 100).toFixed(1)
        return `<div class="r"><div class="lb"><span>${r[4] || r[1]}${r[3] || ''}</span><span>${r[0]}</span><span>${r[5] || r[2]}${r[3] || ''}</span></div><div class="tr"><i class="bh" style="width:${w1}%;background:${H.c1}"></i><i class="ba" style="width:${(100 - w1).toFixed(1)}%;background:${A.c1}"></i></div></div>` }).join('')
      d = el(`<div class="hd"><span>${H.name}</span><span>${A.name}</span></div>${rows}<div class="src">${u.src}</div>`, 'bars') }
    else if (u.type === 'quote') d = el(`<div class="t">“${u.text}”</div><div class="w">${u.who} <span>· ${u.src}</span></div>`, 'quote', `left:${u.x}px;top:${u.y}px;border-left-color:${u.team === 'home' ? H.c1 : A.c1}`)
    else if (u.type === 'table') d = el(`<div class="kick" style="margin-bottom:12px">${u.kick}</div>` + u.rows.map(r => `<div class="rw"><span class="p">${r[0]}</span><i style="background:${r[3]}"></i>${r[1]}<span class="pt">${r[2]} pts</span></div>`).join(''), 'table', `left:${u.x}px;top:${u.y}px`)
    else if (u.type === 'cta') d = el(`<div class="t">${u.text}</div><div class="h">${u.handle}</div><div class="f">${u.foot}</div>`, 'cta')
    else if (u.type === 'note') { d = document.createElement('div'); d.className = 'note'; d.textContent = u.text; root.appendChild(d) }
    else if (u.type === 'flash') d = document.getElementById('flash')
    else if (u.type === 'bug') { d = document.getElementById('bug'); d.innerHTML = `<div class="t" style="background:${H.c1}">${H.short}</div><div class="s">0–0</div><div class="t" style="background:${A.c1}">${A.short}</div><div class="m">FT</div>` }
    return { u, d }
  })
  window.PANELS = async (t, T) => {
    const sig = []
    for (const { u, d } of U) {
      const a = T(u.from), b = u.to != null ? T(u.to) : 1e9
      if (u.type === 'flash') { const q = t >= a && t < a + .45 ? (1 - (t - a) / .45) * .6 : 0; if (q > 0 || d.dataset.on === String(u.from)) { d.style.opacity = q.toFixed(3); d.dataset.on = q > 0 ? String(u.from) : '' } sig.push(q.toFixed(2)); continue }
      const fi = u.fi || .35, fo = u.fo || .3
      const q = t >= a - .001 && t < b + fo ? Math.min(cl((t - a) / fi), cl((b + fo - t) / fo)) : 0
      d.style.opacity = q.toFixed(3); sig.push(q.toFixed(3))
      if (q <= 0) continue
      if (u.type === 'giant') { const k = cl((t - a) / .32); d.style.transform = `scale(${(1.1 - .1 * eback(k)).toFixed(4)})` }
      else if (u.type === 'bug') { let sc = '0–0'; (u.score || []).forEach(s => { if (t >= T(s[0])) sc = s[1] }); const sp = d.querySelector('.s'); if (sp.textContent !== sc) sp.textContent = sc; sig.push(sc)
        const lastS = (u.score || []).filter(s => t >= T(s[0])).pop(); if (lastS) { const k = cl((t - T(lastS[0])) / .4); sp.style.transform = `scale(${(1 + .25 * Math.sin(Math.PI * k)).toFixed(3)})` } }
      else if (u.type === 'bars') { (u.hi || []).forEach(h => { const r = d.querySelectorAll('.r')[h[1]]; if (r) { const on = t >= T(h[0]) && t < T(h[2] || 1e9); r.style.transform = on ? 'scale(1.04)' : 'none'; r.style.opacity = (u.hi.some(x => t >= T(x[0]) && t < T(x[2] || 1e9)) && !on) ? '.45' : '1' } })
        d.style.transform = `translateY(${(30 * (1 - eo((t - a) / .45))).toFixed(1)}px)` }
      else if (u.type !== 'note' && u.type !== 'chip') d.style.transform = `translateY(${(26 * (1 - eo((t - a) / .4))).toFixed(1)}px)`
      else if (u.type === 'chip') d.style.transform = (u.anchor === 'c' ? 'translateX(-50%) ' : '') + `translateY(${(16 * (1 - eo((t - a) / .3))).toFixed(1)}px)`
    }
    return sig.join(',')
  }
})()
