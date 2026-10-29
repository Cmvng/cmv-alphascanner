// The owner's reaction stickers, one locked style (the signature): the die-cut white border is baked into the frames,
// one soft shadow, one tilt per placement, one pop in (0 → 110% → 100% in 0.2 s) and one pop out (0.12 s).
// Needs window.RLIB (video/out/reactions/lib.js) and RX_BASE (that folder as a file:// URL).
// Events: {k, id, t0, t1, ...}
//   sticker   {x, y, w, rot}                      a corner sticker
//   peek      {edge: 'left'|'right'|'bottom', x|y, w, rot}   slides in from behind a frame edge, partly hidden
//   behind    {x, w, line, rot}                   rises from behind a horizontal line (a caption bar, a card edge)
//   interrupt {}                                  full-frame cutaway of the real clip (room and all), punched in
//   stamp     {x, y, w, rot, label, ok}           a verdict stamp (CALLED IT / MISSED IT) on the sticker
//   chain     {ids: [...], x, y, w, rot, labels}  reactions swap in one place, a flipbook
//   bubble    {x, y, d, seq: [[t, id], ...]}      a round face-cam bubble whose face changes on the beats
//   from: seconds into the clip to start at (default 0); speed: playback rate (default 1)
const RX = (() => {
  const $ = id => document.getElementById(id)
  const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x))
  const eo = x => 1 - Math.pow(1 - clamp(x), 3)
  const back = x => { x = clamp(x); const c = 2.2; return 1 + (c + 1) * Math.pow(x - 1, 3) + c * Math.pow(x - 1, 2) }
  const SHADOW = 'drop-shadow(0 16px 26px rgba(10,30,80,.34)) drop-shadow(0 3px 6px rgba(10,30,80,.18))'
  function frame(id, lt, from = 0, speed = 1, full = false) {          // ping-pong through the clip, so a long hold never jumps
    const m = RLIB[id], n = full ? m.full : m.frames
    let i = Math.floor((from + lt * speed) * 30)
    const per = 2 * (n - 1); i = ((i % per) + per) % per; if (i >= n) i = per - i
    return `${RX_BASE}${id}/${full ? 'full/' : ''}f_${String(i + 1).padStart(4, '0')}.${full ? 'jpg' : 'png'}`
  }
  const pend = []
  function setSrc(img, src) { if (img.getAttribute('src') !== src) { img.setAttribute('src', src); pend.push(img.decode().catch(() => 0)) } }
  // one DOM element per event, created once
  function mount(root, evs) {
    evs.forEach((e, i) => {
      const d = document.createElement('div'); d.className = 'rx rxk-' + e.k; d.id = 'rx' + i; d.style.cssText = 'position:absolute;opacity:0;will-change:transform'
      if (e.k === 'interrupt') {
        d.style.cssText += ';inset:0;overflow:hidden;background:#000'
        d.innerHTML = '<img style="position:absolute;left:0;top:0;width:1080px;height:1920px;transform-origin:50% 42%">'
      } else if (e.k === 'behind') {
        d.style.cssText += `;left:${e.x}px;top:0;width:${e.w + 60}px;height:${e.line}px;overflow:hidden`
        d.innerHTML = `<img style="position:absolute;left:30px;width:${e.w}px;filter:${SHADOW}">`
      } else if (e.k === 'bubble') {
        d.style.cssText += `;left:${e.x}px;top:${e.y}px;width:${e.d}px;height:${e.d}px;border-radius:50%;overflow:hidden;background:radial-gradient(circle at 50% 35%,#6FC3FF,#1F5FDB);border:9px solid #fff;box-shadow:0 18px 40px rgba(10,30,80,.35)`
        d.innerHTML = `<img style="position:absolute;left:50%;top:6%;width:${e.d * 1.05}px;transform:translateX(-50%)">`
      } else {
        d.style.cssText += `;left:${e.x}px;top:${e.y ?? 0}px;width:${e.w}px;transform-origin:50% 80%`
        d.innerHTML = `<img style="display:block;width:${e.w}px;filter:${SHADOW}">` +
          (e.k === 'stamp' ? `<div class="rx-stamp ${e.ok ? 'ok' : 'no'}">${e.label}</div>` : '') +
          (e.k === 'chain' && e.labels ? `<div class="rx-label"></div>` : '')
      }
      root.appendChild(d); e.el = d; e.img = d.querySelector('img')
    })
  }
  // draw every event at time t; returns a signature of what changed
  async function draw(evs, t) {
    pend.length = 0; const sig = []
    for (const e of evs) {
      const d = e.el, on = t >= e.t0 && t < e.t1
      if (!on) { if (d.style.opacity !== '0') d.style.opacity = '0'; continue }
      const lt = t - e.t0, out = clamp((e.t1 - t) / .12), pin = clamp(lt / .2)
      const s = (e.k === 'interrupt' || e.k === 'bubble') ? 1 : (pin < 1 ? back(pin) : 1) * (.85 + .15 * out)
      const rot = e.rot || 0
      if (e.k === 'interrupt') {
        setSrc(e.img, frame(e.id, lt, e.from || 0, e.speed || 1, true))
        const z = 1.0 + .10 * eo(lt / .25) + .03 * lt                 // a punch-in that keeps creeping
        e.img.style.transform = `scale(${z.toFixed(4)})`; d.style.opacity = '1'
      } else if (e.k === 'peek') {
        setSrc(e.img, frame(e.id, lt, e.from || 0, e.speed || 1))
        const p = eo(lt / .32) * out, w = e.w
        let tx = 0, ty = 0
        if (e.edge === 'left') { d.style.left = (-w + p * w * (e.show || .62)) + 'px'; d.style.top = e.y + 'px' }
        if (e.edge === 'right') { d.style.left = (1080 - p * w * (e.show || .62)) + 'px'; d.style.top = e.y + 'px' }
        if (e.edge === 'bottom') { d.style.left = e.x + 'px'; d.style.top = (1920 - p * (e.h || w * 1.27) * (e.show || .7)) + 'px' }
        d.style.transform = `rotate(${rot}deg)`; d.style.opacity = '1'
      } else if (e.k === 'behind') {
        setSrc(e.img, frame(e.id, lt, e.from || 0, e.speed || 1))
        const h = e.w * RLIB[e.id].h / RLIB[e.id].w, p = eo(lt / .3) * eo(out)
        e.img.style.top = (e.line - h * (e.show || .78) * p) + 'px'; e.img.style.transform = `rotate(${rot}deg)`
        d.style.opacity = '1'
      } else if (e.k === 'bubble') {
        let id = e.seq[0][1]; for (const [ts, i] of e.seq) if (t >= ts) id = i
        const since = t - Math.max(...e.seq.filter(q => t >= q[0]).map(q => q[0]))
        setSrc(e.img, frame(id, since))
        const p = pin < 1 ? back(pin) : 1, bump = since < .18 ? 1 + .06 * Math.sin(since / .18 * Math.PI) : 1
        d.style.transform = `scale(${(p * bump * (.85 + .15 * out)).toFixed(4)})`; d.style.opacity = out.toFixed(3); sig.push(id)
      } else if (e.k === 'chain') {
        const k = Math.min(e.ids.length - 1, Math.floor(lt / e.dt)), id = e.ids[k], lk = lt - k * e.dt
        setSrc(e.img, frame(id, lk))
        const sw = lk < .12 ? .9 + .1 * back(lk / .12) : 1
        d.style.transform = `rotate(${rot + (k % 2 ? 4 : -4)}deg) scale(${(s * sw).toFixed(4)})`; d.style.opacity = '1'
        if (e.labels) { const l = d.querySelector('.rx-label'); if (l.textContent !== e.labels[k]) l.textContent = e.labels[k] }
        sig.push(k)
      } else {
        setSrc(e.img, frame(e.id, lt, e.from || 0, e.speed || 1))
        d.style.transform = `rotate(${rot}deg) scale(${s.toFixed(4)})`; d.style.opacity = '1'
        if (e.k === 'stamp') {
          const st = d.querySelector('.rx-stamp'), ps = clamp((lt - .35) / .16)
          st.style.opacity = ps > 0 ? '1' : '0'; st.style.transform = `rotate(-12deg) scale(${(2.2 - 1.2 * eo(ps)).toFixed(3)})`
        }
      }
      sig.push(e.img.getAttribute('src'), d.style.transform, d.style.opacity, d.style.left, d.style.top)
    }
    await Promise.all(pend)
    return sig.join('|')
  }
  return { mount, draw, frame, SHADOW, eo, back, clamp }
})()
