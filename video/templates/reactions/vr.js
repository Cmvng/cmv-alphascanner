// Video reactions: the owner's own reaction clips (silent, 5-8 s each, filmed on a phone in their room) played as
// VIDEO inside a finished edit, at real speed, with the room. A page lists its events in window.VR_EVENTS and calls
// `await VR.draw(t)` from window.render(t). The returned signature changes on every frame where a reaction is on
// screen, so render.mjs redraws those frames and reuses the empty one everywhere else.
//
// Formats (k):
//   cam     a reaction-cam window in free space: the clip with the room, rounded, a white frame and a blue ring.
//           snap: [[seconds in, zoom], ...] adds snap zooms onto the face, each over 4 frames (no sound)
//   duet    the edit slides up and the reaction fills the bottom of the frame (a TikTok Duet, top and bottom)
//   cut     a hard cut to the full-screen reaction with a slow push-in, then straight back (the reaction shot)
//   freeze  the edit holds one frame with a slow push-in while a reaction plays over it (list the reaction after it)
//   behind  the cut-out owner rises from behind a part of the edit, which stays in front (the green-screen look)
// Every event: {k, id, t0, t1, from}. from is the second of the clip shown at t0; the clip then plays at real speed.
// Captions stay the top layer. On an event that covers them, caps lifts the edit's own burned-in captions:
//   {band:[x,y,w,h], bg:[r,g,b]} keeps whatever differs from the flat page colour bg inside the band (letters with an
//   outline), and window.VR_CAPS(t) can instead draw the page's own caption element (see the Primus page).
// The page sets window.VR_ROOT (video/out/vreact/) and window.VR_BASE (the edit's frames, b_000123.jpg; only the
// frames that duet, freeze, behind and caps use are needed: vr_frames.py lists them).
(function () {
  const W = 1080, H = 1920, FPS = 30
  const SKY = '#4FB3FF'
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v))
  const eo = p => 1 - Math.pow(1 - clamp(p), 3)
  const eio = p => (p = clamp(p), p < .5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2)
  const back = p => { p = clamp(p); const c = 1.5; return 1 + (c + 1) * Math.pow(p - 1, 3) + c * Math.pow(p - 1, 2) }
  const pad = (n, k) => String(n).padStart(k, '0')

  // images: decoded once, a short cache (frames are used in order)
  const cache = new Map()
  function img(src) {
    let p = cache.get(src)
    if (!p) {
      const im = new Image(); im.src = src
      p = im.decode().then(() => im, () => { console.error('missing frame ' + src); return null })
      cache.set(src, p)
      if (cache.size > 240) cache.delete(cache.keys().next().value)
    }
    return p
  }
  const lib = id => { const L = window.VLIB[id]; if (!L) throw new Error('no reaction ' + id); return L }
  const clipAt = (e, t) => (e.from ?? 0) + (t - e.t0)                       // clip seconds at page time t
  const clipFrame = (e, t, kind) => {
    const L = lib(e.id), i = clamp(Math.round(clipAt(e, t) * FPS), 0, L.n - 1) + 1
    return img(`${window.VR_ROOT}${e.id}/${kind}/f_${pad(i, 4)}.${kind === 'cut' ? 'webp' : 'jpg'}`)
  }
  const baseFrame = t => img(`${window.VR_BASE}b_${pad(Math.round(t * FPS), 6)}.jpg`)

  // the part of a 1080x1920 clip frame centred on (cx, cy), ch tall, drawn into the rect x, y, w, h
  function crop(g, im, cx, cy, ch, x, y, w, h) {
    ch = Math.min(ch, H, W * h / w)
    const cw = ch * w / h
    g.drawImage(im, clamp(cx - cw / 2, 0, W - cw), clamp(cy - ch / 2, 0, H - ch), cw, ch, x, y, w, h)
  }
  const focus = e => e.focus || [lib(e.id).face[0], lib(e.id).face[1], lib(e.id).face[2] * 1.1]   // the head and a little room
  const snapZoom = (e, t) => { let z = 1; for (const [dt, z1] of e.snap || []) z += (z1 - z) * eo((t - e.t0 - dt) / (4 / FPS)); return z }

  // ---- captions over a covering format
  const kc = document.createElement('canvas'), kg = kc.getContext('2d', { willReadFrequently: true })
  async function caps(g, e, t, dy = 0) {
    if (!e.caps) return
    if (e.caps === 'page') { window.VR_CAPS && window.VR_CAPS(t, true); return }
    const im = await baseFrame(t); if (!im) return
    const [x, y, w, h] = e.caps.band, [R, G, B] = e.caps.bg, d0 = e.caps.d0 ?? 18, d1 = e.caps.d1 ?? 46
    kc.width = w; kc.height = h; kg.drawImage(im, x, y, w, h, 0, 0, w, h)
    const id = kg.getImageData(0, 0, w, h), d = id.data
    for (let k = 0; k < d.length; k += 4) {
      const m = Math.max(Math.abs(d[k] - R), Math.abs(d[k + 1] - G), Math.abs(d[k + 2] - B))
      d[k + 3] = Math.round(255 * clamp((m - d0) / (d1 - d0)))
    }
    kg.putImageData(id, 0, 0); g.drawImage(kc, x, y + dy)
  }

  // ---- the formats
  const IN = .22, OUT = .16
  async function cam(g, e, t) {
    const [x, y, w, h] = e.box, r = e.r ?? 34, [ax, ay] = e.anchor || [.5, .5]
    const pin = clamp((t - e.t0) / IN), pout = clamp((e.t1 - t) / OUT)
    const s = pout < 1 ? .9 + .1 * eo(pout) : .8 + .2 * back(pin), a = Math.min(clamp(pin * 3), pout)
    const im = await clipFrame(e, t, 'full'); if (!im) return
    const px = x + w * ax, py = y + h * ay
    g.save(); g.globalAlpha = a
    g.translate(px, py); g.scale(s, s); g.translate(-px, -py)
    g.shadowColor = 'rgba(10,30,80,.38)'; g.shadowBlur = 44; g.shadowOffsetY = 18
    g.fillStyle = SKY; g.beginPath(); g.roundRect(x - 5, y - 5, w + 10, h + 10, r + 5); g.fill()
    g.shadowColor = 'transparent'
    g.fillStyle = '#fff'; g.beginPath(); g.roundRect(x, y, w, h, r); g.fill()
    const b = 8; g.beginPath(); g.roundRect(x + b, y + b, w - 2 * b, h - 2 * b, r - b); g.clip()
    const [cx, cy, ch] = focus(e); crop(g, im, cx, cy, ch / snapZoom(e, t), x + b, y + b, w - 2 * b, h - 2 * b)
    g.restore()
  }

  async function cut(g, e, t) {
    const im = await clipFrame(e, t, 'full'); if (!im) return
    const [z0, z1] = e.push || [1, 1.06], z = z0 + (z1 - z0) * eo((t - e.t0) / (e.t1 - e.t0))
    const [fx, fy] = e.focus || lib(e.id).face
    const w = W / z, h = H / z
    g.drawImage(im, clamp(fx - w / 2, 0, W - w), clamp(fy - h / 2, 0, H - h), w, h, 0, 0, W, H)
    await caps(g, e, t)
  }

  // the reaction takes half the frame. side 'bottom' (the default): the edit slides up by shift and the reaction rises
  // into the bottom half. side 'top': the reaction drops into the top half over the edit, which stays where it is
  async function duet(g, e, t) {
    const pe = Math.min(eio((t - e.t0) / .32), eio((e.t1 - t) / .28)), half = e.half ?? 960, top = e.side === 'top'
    const S = (e.shift || 0) * pe, P = top ? half * pe : H - half * pe        // P: the seam
    const ci = await clipFrame(e, t, 'full'); if (!ci) return
    if (S) { const bi = await baseFrame(t); if (!bi) return; g.drawImage(bi, 0, -S) }
    const [cx, cy, ch] = focus(e)
    g.save(); g.beginPath(); top ? g.rect(0, 0, W, P) : g.rect(0, P, W, H - P); g.clip()
    crop(g, ci, cx, cy, ch, 0, top ? P - half : P, W, half)                   // the video slides in with its half
    g.restore()
    const sh = top ? g.createLinearGradient(0, P + 34, 0, P) : g.createLinearGradient(0, P - 34, 0, P)
    sh.addColorStop(0, 'rgba(10,30,80,0)'); sh.addColorStop(1, 'rgba(10,30,80,.28)')
    g.fillStyle = sh; g.fillRect(0, top ? P : P - 34, W, 34)
    g.fillStyle = '#fff'; g.fillRect(0, P - 4, W, 8)
    g.fillStyle = SKY; g.fillRect(0, top ? P - 8 : P + 4, W, 4)
    await caps(g, e, t, -S)
  }

  async function freeze(g, e, t) {
    const im = await baseFrame(e.at); if (!im) return
    const [z0, z1] = e.push || [1, 1.05], z = z0 + (z1 - z0) * eo((t - e.t0) / (e.t1 - e.t0)), [fx, fy] = e.focus || [W / 2, H / 2]
    const w = W / z, h = H / z
    g.drawImage(im, clamp(fx - w / 2, 0, W - w), clamp(fy - h / 2, 0, H - h), w, h, 0, 0, W, H)
  }

  async function behind(g, e, t) {
    // the figure: the cut-out clip scaled by sc with the clip point (px, py) at the stage point (X, Y), rising from dy
    const pe = Math.min(back((t - e.t0) / .34), eo((e.t1 - t) / .26))
    const im = await clipFrame(e, t, 'cut'), bi = await baseFrame(t); if (!im || !bi) return
    const { sc, at: [px, py], to: [X, Y] } = e, dy = (e.rise ?? 600) * (1 - pe)
    g.save(); g.shadowColor = 'rgba(10,30,80,.35)'; g.shadowBlur = 36; g.shadowOffsetY = 10
    g.drawImage(im, X - px * sc, Y - py * sc + dy, W * sc, H * sc)
    g.restore()
    const [ox, oy, ow, oh, orr] = e.front                                        // the part of the edit kept in front
    g.save(); g.beginPath(); g.roundRect(ox, oy, ow, oh, orr || 0); g.clip(); g.drawImage(bi, 0, 0); g.restore()
    await caps(g, e, t)
  }

  const KINDS = { cam, cut, duet, freeze, behind }
  const cv = document.createElement('canvas'); cv.width = W; cv.height = H
  cv.style.cssText = 'position:absolute;left:0;top:0;width:1080px;height:1920px'
  const g = cv.getContext('2d')
  window.VR = {
    canvas: cv,
    async draw(t) {
      const on = (window.VR_EVENTS || []).filter(e => t >= e.t0 && t < e.t1)
      g.clearRect(0, 0, W, H)
      window.VR_CAPS && window.VR_CAPS(t, false)
      if (!on.length) return 'idle'
      for (const e of on) await KINDS[e.k](g, e, t)
      return 'f' + Math.round(t * FPS)
    },
  }
})()
