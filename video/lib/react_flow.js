/* react_flow.js: the owner's reaction stickers as a CHARACTER in the scene, not pop-in stamps.

   The rules it encodes come from the 7 Nov research (video/templates/reactions/PLAYBOOK.md):
   - Presence: the sticker arrives listening (an idle clip) before the moment, and changes expression IN PLACE on the
     trigger word. It does not pop in already at its peak.
   - Two anchors: every beat is tied to a WORD (a phrase looked up in CTC-aligned word times; the expression changes
     about 6 frames after the word ends) and to an on-screen ELEMENT (the page's anchor() puts the sticker against it,
     and the page uses peakT() to make the element react back).
   - Physics: entering and leaving are moves with a reason (peek out from behind something, duck behind it as a card
     flies over). The swap is a small UNIFORM pop, hard reactions recoil away from the content, soft ones lean in, and
     the idle state drifts gently. Never squash or stretch a real face: it reads as distortion (owner, 7 Nov).
   - Steady head: every clip is scaled and placed so the FACE keeps the listening clip's size and position (eye row,
     head width at eye level, from video/lib/react_face.py via lib.js "face"). The clips were filmed at different
     distances; without this the head jumped up to ~30% on each swap.
   - It never shrinks the page to make room: the layout gives it a home (the anchor).

   Usage (in a page rendered frame by frame):
     <script src="file:///home/user/cmv-alphascanner/video/lib/react_flow.js"></script>
     const RF = ReactFlow.create({
       img: document.getElementById('stk'), lib: window.RLIB, root: 'file:///.../video/out/reactions/',
       fps: 30, T: s => s + 0.2,                // take seconds -> video seconds
       words: WORDS,                            // [{s, e, w}] CTC-aligned (video/lib/align_words.py), take seconds
       width: 380,
       idle: { id: 'stare', a: 0, b: 100, speed: 0.7 },
       segments: [{
         from: 0.45, to: 7.0,                    // take seconds or phrases ('every trade' / {phrase, after, nth, edge})
         anchor: t => ({ x, y, rot, hide: [dx, dy], z }), // where the sticker's LEFT-BOTTOM sits, and the offset that hides it
         lean: -2,                               // resting lean toward the content, degrees (negative = top to the left)
         ducks: [{ at: 7.0, back: 7.6 }],        // hide while something passes over, come back
         looks: [{ at: 'one answer', deg: -4, dur: 1.2 }],
         beats: [{ at: 'every trade', id: 'ugh', kind: 'hard', away: 1, hold: 3.2, from: 0 }],
       }],
     })
     window.render = async t => { ...; SIG.push(await RF.render(t)); ... }
   Beat fields: at (word/phrase), id (clip), kind 'hard' (recoil, card can shudder) | 'soft' (lean in), away (+1 = the
   content is to the left, so recoil goes right), hold (s, then back to idle), from/to (frame window of the clip, e.g. to skip
   a clip's lip movement), speed, offset (s after the word end; default 0.2 = 6 frames), tail (moving-hold frames at the end).
   peakT(i) returns the video time of beat i's reaction peak, so the page can make its element react 2-4 frames later.
*/
(function (G) {
  const cl = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x))
  const eo = x => 1 - Math.pow(1 - cl(x), 3)
  const eio = x => { x = cl(x); return x < .5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2 }
  const eback = (x, c = 1.25) => { x = cl(x); return 1 + (c + 1) * Math.pow(x - 1, 3) + c * Math.pow(x - 1, 2) }
  const norm = s => String(s).toLowerCase().replace(/[^a-z0-9]/g, '')
  const ENTER = 0.34, EXIT = 0.26, DUCK = 0.2, RET = 0.34, SWAP = 0.2

  function create(o) {
    const fps = o.fps || 30, T = o.T || (s => s), img = o.img, lib = o.lib, root = o.root
    // ---- phrase lookup on the aligned words (joined, so "$8" ",200" still matches "$8,200")
    const W = (o.words || []).map(w => ({ s: w.s, e: w.e, n: norm(w.w) })).filter(w => w.n)
    let C = '', own = []
    W.forEach((w, i) => { C += w.n; for (let k = 0; k < w.n.length; k++) own.push(i) })
    function at(q) {
      if (typeof q === 'number') return q
      const sp = typeof q === 'string' ? { phrase: q } : q, P = norm(sp.phrase)
      let from = 0, nth = sp.nth || 0
      if (sp.after) { const i = W.findIndex(w => w.s >= sp.after); from = i < 0 ? C.length : own.indexOf(i) }
      for (;;) {
        const k = C.indexOf(P, from)
        if (k < 0) throw new Error('ReactFlow: phrase not found: ' + sp.phrase)
        // must start and end on word boundaries
        const a = own[k], b = own[k + P.length - 1]
        const okA = k === 0 || own[k - 1] !== a, okB = k + P.length === C.length || own[k + P.length] !== b
        if (okA && okB && nth-- <= 0) return sp.edge === 'start' ? W[a].s : W[b].e
        from = k + 1
      }
    }
    // ---- resolve the plan to video seconds
    const segs = o.segments.map(s => {
      const r = { ...s, vf: T(at(s.from)), vt: s.to == null ? Infinity : T(at(s.to)) }
      r.ducks = (s.ducks || []).map(d => ({ vf: T(at(d.at)) - (d.lead == null ? 0.08 : d.lead), vb: d.back == null ? Infinity : T(at(d.back)) }))
      r.looks = (s.looks || []).map(l => ({ ...l, vt: T(at(l.at)) }))
      r.beats = (s.beats || []).map(b => ({ ...b, vt: T(at(b.at)) + (b.offset == null ? 0.2 : b.offset) }))
      return r
    })
    const allBeats = segs.flatMap(s => s.beats)
    const width = o.width || 380, idle = o.idle

    function frameOf(id, i) { return `${root}${id}/f_${String(i + 1).padStart(4, '0')}.png` }
    function pingpong(i, a, b) { const n = b - a; if (n <= 0) return a; const per = 2 * n; i = ((i % per) + per) % per; return a + (i > n ? per - i : i) }

    async function render(t) {
      const S = segs.find(s => t >= s.vf && t < s.vt + EXIT)
      if (!S) { if (img.style.opacity !== '0') img.style.opacity = '0'; return 'rf:-' }
      // presence u: 1 = out, 0 = hidden behind the anchor
      let u = eback((t - S.vf) / ENTER, 1.1)
      if (t >= S.vt) u *= 1 - eio((t - S.vt) / EXIT)
      let duckSquash = 0
      for (const d of S.ducks) {
        if (t < d.vf || t > d.vb + RET) continue
        const k = t < d.vb ? 1 - eio((t - d.vf) / DUCK) : eback((t - d.vb) / RET, 1.3)
        u = Math.min(u, k)
        if (t < d.vf + DUCK) duckSquash = Math.sin(Math.PI * cl((t - d.vf) / DUCK))   // a quick flinch as it ducks
      }
      if (u <= 0.004) { if (img.style.opacity !== '0') img.style.opacity = '0'; return 'rf:h' }
      // which clip: the latest beat that has fired and is still held, else idle (listening)
      let B = null
      for (const b of S.beats) if (t >= b.vt && t < b.vt + (b.hold || 2.5)) B = b
      let id, fi, change
      if (B) {
        const L = lib[B.id], lt = t - B.vt, a = B.from || 0, e = B.to == null ? L.frames - 1 : B.to
        let i = a + Math.floor(lt * fps * (B.speed || 1))
        if (i > e) i = pingpong(i - e, e - (B.tail || 14), e) // a moving hold on the clip's last beat, never back to frame 1
        id = B.id; fi = Math.min(i, L.frames - 1); change = B.vt
      } else {
        const L = lib[idle.id], b = idle.b == null ? L.frames - 1 : idle.b
        id = idle.id; fi = pingpong(Math.floor(t * fps * (idle.speed || 1)), idle.a || 0, b)
        const prev = S.beats.filter(x => t >= x.vt + (x.hold || 2.5)).pop()
        change = prev ? prev.vt + (prev.hold || 2.5) : -9
      }
      const src = frameOf(id, fi)
      if (img.getAttribute('src') !== src) { img.src = src; try { await img.decode() } catch (e) {} }
      // ---- size and place: the idle clip at the segment's width; any other clip scaled so its face matches the idle face
      const L = lib[id], LI = lib[idle.id], p = S.anchor(t)
      const wI = S.w || width, sI = wI / LI.w, hI = wI * LI.h / LI.w
      let w = wI, h = hI, ox = 0, oy = 0, fx = 50, fy = 90
      if (L.face && LI.face) {
        const sC = sI * (LI.face.w / L.face.w)
        w = L.w * sC; h = L.h * sC
        ox = LI.face.cx * sI - L.face.cx * sC; oy = LI.face.cy * sI - L.face.cy * sC   // face point stays where the idle's is
        fx = 100 * L.face.cx / L.w; fy = 100 * L.face.cy / L.h                         // rotate / pop around the face
      } else if (B && B.w) { w = B.w; h = w * L.h / L.w }
      let sc = 1, rot = (S.lean || 0) + (p.rot || 0), dx = 0, dy = 0
      // swap: a small uniform pop (no squash: stretching a real face looks distorted)
      const q = (t - change) / SWAP
      if (q >= 0 && q < 1) sc *= 1 + 0.035 * Math.sin(Math.PI * q) * (1 - 0.5 * q)
      if (B) {
        const lt = t - B.vt
        if (B.kind === 'hard') {                                   // recoil away from the content, then come back
          const k = lt < 0.12 ? eo(lt / 0.12) : 1 - eio((lt - 0.12) / 0.55)
          dx += (B.away || 1) * 22 * k; rot += (B.away || 1) * 6 * k
        } else {                                                    // lean in toward it
          rot += -(B.away || 1) * 3 * eio(lt / 0.4)
        }
      }
      for (const l of S.looks) { const lt = t - l.vt; if (lt >= 0 && lt < l.dur + 0.5) rot += l.deg * Math.min(eio(lt / 0.35), 1 - eio((lt - l.dur) / 0.5)) }
      // a gentle drift while it holds (position only), and a small uniform dip while ducking
      const br = Math.sin(2 * Math.PI * t / 2.6)
      dy += -2.5 * br
      sc *= 1 - 0.03 * duckSquash
      const hx = p.hide ? p.hide[0] * (1 - u) : 0, hy = p.hide ? p.hide[1] * (1 - u) : 0
      const left = p.x + ox + hx + dx, top = p.y - hI + oy + hy + dy
      const st = img.style
      const set = (k, v) => { if (st[k] !== v) st[k] = v }
      set('width', w + 'px'); set('left', left.toFixed(1) + 'px'); set('top', top.toFixed(1) + 'px')
      set('opacity', String(p.opacity == null ? 1 : p.opacity)); if (p.z != null) set('zIndex', String(p.z))
      set('transformOrigin', `${fx.toFixed(1)}% ${fy.toFixed(1)}%`)
      set('transform', `rotate(${rot.toFixed(2)}deg) scale(${sc.toFixed(4)})`)
      return `rf:${src}|${left.toFixed(1)}|${top.toFixed(1)}|${w.toFixed(1)}|${rot.toFixed(2)}|${sc.toFixed(4)}`
    }
    // the video time a beat's reaction lands (for the element reacting back)
    const peakT = i => allBeats[i].vt + (allBeats[i].peakAfter == null ? 0.07 : allBeats[i].peakAfter)
    return { render, at, peakT, beats: allBeats, segments: segs }
  }
  // an envelope the page can use for "the element reacts back": a decaying wobble starting `delay` after t0
  function kick(t, t0, { delay = 0.1, dur = 0.45, cycles = 3 } = {}) {
    const x = (t - t0 - delay) / dur
    if (x < 0 || x > 1) return 0
    return Math.sin(2 * Math.PI * cycles * x) * (1 - x) * (1 - x)
  }
  G.ReactFlow = { create, kick }
})(window)
