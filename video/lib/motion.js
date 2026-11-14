// Deterministic motion helpers for our render(t) pages: every value is a pure function of t, so Playwright can seek
// any frame. From the 14 Nov motion study (video/templates/MOTION-STUDY.md): LottieFiles' motion-design skill (timing,
// easing, the three motion layers, choreography), Motion's springs, Remotion's spring/interpolate model.
//   <script src="file:///home/user/cmv-alphascanner/video/lib/motion.js"></script>   ->  window.M
// Times are seconds. Rules of thumb (MOTION-STUDY.md): ease-out to enter, ease-in to leave, exits ~70% of the entrance,
// never opacity alone for something that matters, children follow 0.05-0.15 s after their parent, a stagger stays
// under 0.5 s in total, something on screen keeps a little life (ambient), no unbroken move over a third of the frame.
;(function () {
  const cl = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x))
  const lerp = (a, b, u) => a + (b - a) * u
  // CSS cubic-bezier(x1, y1, x2, y2) as a function of 0..1 (Newton, then bisection)
  function bezier(x1, y1, x2, y2) {
    const cx = 3 * x1, bx = 3 * (x2 - x1) - cx, ax = 1 - cx - bx, cy = 3 * y1, by = 3 * (y2 - y1) - cy, ay = 1 - cy - by
    const X = s => ((ax * s + bx) * s + cx) * s, Y = s => ((ay * s + by) * s + cy) * s, dX = s => (3 * ax * s + 2 * bx) * s + cx
    return x => {
      if (x <= 0) return 0; if (x >= 1) return 1
      let s = x
      for (let i = 0; i < 8; i++) { const e = X(s) - x; if (Math.abs(e) < 1e-6) return Y(s); const d = dX(s); if (Math.abs(d) < 1e-6) break; s -= e / d }
      let lo = 0, hi = 1; s = x
      for (let i = 0; i < 40; i++) { const v = X(s); if (Math.abs(v - x) < 1e-6) break; if (v < x) lo = s; else hi = s; s = (lo + hi) / 2 }
      return Y(s)
    }
  }
  // one signature curve for most moves, plus the others by direction (Material 3 / HIG values)
  const E = {
    standard: bezier(0.2, 0, 0, 1),            // on-screen moves, the house curve
    enter: bezier(0.05, 0.7, 0.1, 1),          // entrances: fast start, soft landing
    exit: bezier(0.3, 0, 1, 1),                // exits: gentle start, fast leave
    gentle: bezier(0.4, 0, 0.2, 1),            // premium, ambient, camera
    settle: bezier(0.175, 0.885, 0.32, 1.275), // a small overshoot (about 10%)
    linear: x => cl(x),
    sine: x => .5 - .5 * Math.cos(Math.PI * cl(x)),
  }
  // durations for 30 fps video (seconds); distance scales them: 1.0x at 100 px, 1.3x at 200, 1.6x at 400
  const D = { quick: .22, standard: .36, slow: .6, reveal: .9 }
  const dist = (px, d = D.standard) => d * (px <= 100 ? 1 : 1 + .3 * Math.log2(px / 100))
  // progress 0..1 of something that starts at a and lasts d, with a curve
  const p = (t, a, d = D.standard, e = E.enter) => e(cl((t - a) / d))
  // a damped spring from 0 to 1 (mass m, stiffness k, damping c; the Remotion / Motion model), closed form
  function spring(t, a = 0, { k = 170, c = 26, m = 1, v0 = 0 } = {}) {
    const x = t - a; if (x <= 0) return 0
    const w0 = Math.sqrt(k / m), z = c / (2 * Math.sqrt(k * m))
    if (z < 1) { const wd = w0 * Math.sqrt(1 - z * z), B = (z * w0 - v0) / wd; return 1 - Math.exp(-z * w0 * x) * (Math.cos(wd * x) + B * Math.sin(wd * x)) }
    if (z === 1) return 1 - Math.exp(-w0 * x) * (1 + (w0 - v0) * x)
    const r1 = -w0 * (z - Math.sqrt(z * z - 1)), r2 = -w0 * (z + Math.sqrt(z * z - 1)), c1 = (v0 + r2) / (r1 - r2), c2 = -1 - c1
    return 1 + c1 * Math.exp(r1 * x) + c2 * Math.exp(r2 * x)
  }
  // presets: snappy UI pop, a soft card, a heavy panel (no overshoot), a bouncy sticker
  const SP = { pop: { k: 300, c: 20 }, card: { k: 170, c: 26 }, heavy: { k: 120, c: 30 }, bouncy: { k: 220, c: 12 } }
  // when a spring has settled within 0.1% (to time the next beat after it)
  function settle(o = SP.card) { for (let x = .02; x < 6; x += .01) { let ok = true; for (let y = x; y < x + .4; y += .02) if (Math.abs(spring(y, 0, o) - 1) > .001) { ok = false; break } if (ok) return x } return 6 }
  // an element's state between its entrance at a and its exit at b: never opacity alone, ease-out in, ease-in out (shorter)
  //   o: { d, dy, dx, s0, dOut, dyOut, sOut, e, eOut, spring }  ->  { op, x, y, s }
  function inout(t, a, b = 1e9, o = {}) {
    const d = o.d ?? D.standard, dOut = o.dOut ?? d * .7
    const u = o.spring ? cl(spring(t, a, o.spring), 0, 1.5) : p(t, a, d, o.e || E.enter)
    const v = t >= b ? p(t, b, dOut, o.eOut || E.exit) : 0
    const op = t < a ? 0 : Math.min(1, (o.spring ? cl((t - a) / (d * .5)) : u)) * (1 - v)
    return { op, x: (1 - u) * (o.dx ?? 0) + v * (o.dxOut ?? 0), y: (1 - u) * (o.dy ?? 24) + v * (o.dyOut ?? -12),
      s: lerp(o.s0 ?? 1, 1, u) * lerp(1, o.sOut ?? 1, v) }
  }
  const apply = (el, st, extra = '') => { el.style.opacity = st.op.toFixed(3); el.style.transform = `${extra} translate(${st.x.toFixed(1)}px,${st.y.toFixed(1)}px) scale(${st.s.toFixed(4)})`; return st.op.toFixed(3) + st.x.toFixed(1) + st.y.toFixed(1) + st.s.toFixed(4) }
  // follow-through: the i-th child of something that lands at a (0.1 s after, then step apart)
  const child = (a, i = 0, step = .08, lag = .1) => a + lag + i * step
  // stagger n items from a so the whole cascade stays within budget
  const stagger = (i, n, a, step = .08, budget = .5) => a + i * Math.min(step, n > 1 ? budget / (n - 1) : step)
  // ambient life: a float, a breath, a slow drift (pick one per element, small)
  const float = (t, amp = 3, per = 4, ph = 0) => amp * Math.sin(2 * Math.PI * (t / per + ph))
  const breathe = (t, lo = .99, hi = 1.01, per = 4, ph = 0) => lo + (hi - lo) * (.5 + .5 * Math.sin(2 * Math.PI * (t / per + ph)))
  // squash and stretch on landing (a stamp, a pop): [sx, sy] around 1, settling over d
  function squash(t, a, d = .2, amt = .07) { const x = cl((t - a) / d); if (x <= 0 || x >= 1) return [1, 1]; const k = Math.sin(Math.PI * x) * Math.exp(-3 * x) * amt * 1.8; return [1 + k, 1 - k] }
  // a decaying camera shake for one heavy hit (deterministic), returns [dx, dy, rot]
  function shake(t, a, d = .35, amp = 8, seed = 1) { const x = (t - a) / d; if (x <= 0 || x >= 1) return [0, 0, 0]; const f = (1 - x) * (1 - x) * amp, q = (t - a) * 60
    return [f * Math.sin(q * 1.7 + seed), f * Math.sin(q * 2.3 + seed * 2.1) * .6, f * .05 * Math.sin(q * 1.3 + seed * 3.7)] }
  // a point on an arc from p0 to p1 (height h, positive = up), u in 0..1: paths that curve read as natural
  const arc = (u, p0, p1, h = 80) => [lerp(p0[0], p1[0], u), lerp(p0[1], p1[1], u) - h * Math.sin(Math.PI * u)]
  // draw an SVG path or line on: stroke-dash reveal over d from a (hairline-style line figures)
  function draw(el, t, a, d = .8, e = E.gentle) { const L = el.__len || (el.__len = el.getTotalLength()); const u = e(cl((t - a) / d))
    el.style.strokeDasharray = L.toFixed(1); el.style.strokeDashoffset = (L * (1 - u)).toFixed(1); return u }
  // count a number up to its value over d (for a number the voice says), formatted
  const count = (t, a, d, to, from = 0, dec = 0) => (from + (to - from) * E.gentle(cl((t - a) / d))).toFixed(dec)
  // scene change with depth: the old scene eases back and out, the new one settles in (not opacity alone)
  function scene(t, a, b, fi = .3, fo = .24) {
    if (t < a || t >= b) return { op: 0, s: 1, y: 0 }
    const u = fi ? E.enter(cl((t - a) / fi)) : 1, v = fo ? E.exit(cl((t - (b - fo)) / fo)) : 0
    return { op: Math.min(u, 1 - v), s: lerp(1.02, 1, u) * lerp(1, .98, v), y: 0 }
  }
  window.M = { cl, lerp, bezier, E, D, dist, p, spring, SP, settle, inout, apply, child, stagger, float, breathe, squash, shake, arc, draw, count, scene }
})()
