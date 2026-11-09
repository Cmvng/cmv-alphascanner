/* stage3d.js: a small 3D theatre for explainers, on the same engine as the tactical board (board3d.js must load first).
   A round checkered stage on the house sky, a wall with a door that opens, a sign that flips, and flat props drawn on
   canvas (cards, pages, tickets, screens). Characters are the same lacquer chess pieces. First used for the Primus
   "bouncer" explainer (9 Nov 2026). Units: y up; the action runs along x toward the door at +x; the camera sits at +z. */
(function (G) {
  const T3 = THREE, B = G.B3, S = {}
  const lacquer = (color, o = {}) => new T3.MeshPhysicalMaterial({ color, roughness: o.rough != null ? o.rough : .28, metalness: 0, clearcoat: o.coat != null ? o.coat : 1, clearcoatRoughness: .08, envMapIntensity: 1 })
  const shadow = m => { m.castShadow = true; m.receiveShadow = true; return m }
  const rr = (g, x, y, w, h, r) => { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath() }
  S.rr = rr
  const ctex = c => { const t = new T3.CanvasTexture(c); t.colorSpace = T3.SRGBColorSpace; t.anisotropy = 8; return t }

  // ---------- the stage: a lacquered disc with a soft checker top, on a light floor that fades into the sky
  S.makeStage = (scene, o = {}) => {
    const R = o.r || 40, g = new T3.Group()   // the top is kept mid-tone so the checker survives the key light
    const c = document.createElement('canvas'); c.width = c.height = 2048; const x = c.getContext('2d'), n = o.squares || 10, a = o.c1 || '#ddd3bf', b = o.c2 || '#c9bda4'
    for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) { x.fillStyle = (i + j) % 2 ? a : b; x.fillRect(i * 2048 / n, j * 2048 / n, 2048 / n + 1, 2048 / n + 1) }
    const rg = x.createRadialGradient(1024, 1024, 300, 1024, 1024, 1150); rg.addColorStop(0, 'rgba(255,255,255,.10)'); rg.addColorStop(1, 'rgba(20,30,60,.16)'); x.fillStyle = rg; x.fillRect(0, 0, 2048, 2048)
    const top = shadow(new T3.Mesh(new T3.CircleGeometry(R, 128), new T3.MeshPhysicalMaterial({ map: ctex(c), roughness: .55, clearcoat: .35, clearcoatRoughness: .3 }))); top.rotation.x = -Math.PI / 2; top.position.y = 0; g.add(top)
    const rim = shadow(new T3.Mesh(new T3.CylinderGeometry(R + .9, R + 1.5, 1.6, 128, 1, true), lacquer(o.rim || '#0B1F44'))); rim.position.y = -.8; g.add(rim)
    const lip = new T3.Mesh(new T3.RingGeometry(R, R + .9, 128), lacquer(o.rim || '#0B1F44')); lip.rotation.x = -Math.PI / 2; lip.position.y = .001; lip.receiveShadow = true; g.add(lip)
    const fl = new T3.Mesh(new T3.PlaneGeometry(900, 900), new T3.ShadowMaterial({ opacity: .22 })); fl.rotation.x = -Math.PI / 2; fl.position.y = -1.6; fl.receiveShadow = true; g.add(fl)
    scene.add(g); return g
  }

  // ---------- a wall with a doorway, a door leaf that swings, and a glow behind it. Faces -x.
  S.makeDoor = (o = {}) => {
    const g = new T3.Group(), W = o.w || 6.4, H = o.h || 9.6, WH = o.wallH || 13, WL = o.wallL || 30, th = 1.1
    const wm = lacquer(o.wall || '#0B1F44', { rough: .5, coat: .5 }), fm = lacquer(o.frame || '#132c5e')
    const side = (WL - W) / 2
    for (const sg of [-1, 1]) { const m = shadow(new T3.Mesh(new T3.BoxGeometry(th, WH, side), wm)); m.position.set(0, WH / 2, sg * (W / 2 + side / 2)); g.add(m) }
    const topm = shadow(new T3.Mesh(new T3.BoxGeometry(th, WH - H, W), wm)); topm.position.set(0, H + (WH - H) / 2, 0); g.add(topm)
    for (const sg of [-1, 1]) { const j = shadow(new T3.Mesh(new T3.BoxGeometry(th + .5, H + .3, .5), fm)); j.position.set(-.05, (H + .3) / 2, sg * (W / 2 + .05)); g.add(j) }
    const lin = shadow(new T3.Mesh(new T3.BoxGeometry(th + .5, .5, W + .6), fm)); lin.position.set(-.05, H + .25, 0); g.add(lin)
    const piv = new T3.Group(); piv.position.set(-.2, 0, -W / 2 + .1)
    const leaf = shadow(new T3.Mesh(new T3.BoxGeometry(.36, H - .1, W - .2), lacquer(o.leaf || '#1a3a7a'))); leaf.position.set(0, (H - .1) / 2, (W - .2) / 2); piv.add(leaf)
    const knob = new T3.Mesh(new T3.SphereGeometry(.26, 24, 16), lacquer(o.accent || '#FD4C00')); knob.position.set(-.34, H * .46, W - .9); piv.add(knob); g.add(piv)
    const gc = document.createElement('canvas'); gc.width = 256; gc.height = 384; const x = gc.getContext('2d'), gr = x.createRadialGradient(128, 230, 10, 128, 230, 260)
    gr.addColorStop(0, '#fff3e0'); gr.addColorStop(.45, o.glow || '#ff9a4d'); gr.addColorStop(1, o.glow2 || '#c43a00'); x.fillStyle = gr; x.fillRect(0, 0, 256, 384)
    const glow = new T3.Mesh(new T3.PlaneGeometry(W, H), new T3.MeshBasicMaterial({ map: ctex(gc), transparent: true, opacity: 0, toneMapped: false })); glow.rotation.y = -Math.PI / 2; glow.position.set(.3, H / 2, 0); g.add(glow)
    const lamp = new T3.PointLight(o.glow || '#ff8a3d', 0, 60, 1.6); lamp.position.set(-2.5, H * .55, 0); g.add(lamp)
    g.userData = { piv, glow, lamp, W, H }
    g.userData.open = q => { piv.rotation.y = -q * 1.75; glow.material.opacity = Math.min(1, q * 1.5); lamp.intensity = q * (o.lamp || 900) }
    return g
  }

  // ---------- a flat prop drawn on a canvas: draw(ctx, w, h, state) is called once per state it shows
  S.makeCard = (o) => {
    const pw = o.px || 1024, ph = Math.round(pw * o.h / o.w), tx = {}
    const texFor = st => { if (tx[st]) return tx[st]; const c = document.createElement('canvas'); c.width = pw; c.height = ph; o.draw(c.getContext('2d'), pw, ph, st); return (tx[st] = ctex(c)) }
    const mat = new T3.MeshPhysicalMaterial({ map: texFor(o.state0 || 0), roughness: .42, clearcoat: o.coat != null ? o.coat : .5, clearcoatRoughness: .25, transparent: true, side: T3.FrontSide })
    const back = new T3.MeshPhysicalMaterial({ color: o.back || '#e9e2d4', roughness: .5, clearcoat: .3, transparent: true })
    const edge = new T3.MeshPhysicalMaterial({ color: o.edge || '#d9d1c0', roughness: .5, transparent: true })
    const m = new T3.Mesh(new T3.BoxGeometry(o.w, o.h, o.t || .06), [edge, edge, edge, edge, mat, back]); m.castShadow = true
    const g = new T3.Group(); g.add(m); g.userData = { mats: [mat, back, edge], setState: st => { const t = texFor(st); if (mat.map !== t) { mat.map = t; mat.needsUpdate = true } }, setOpacity: q => { for (const k of [mat, back, edge]) k.opacity = q; g.visible = q > .002 } }
    return g
  }
  // ---------- a board on the wall that flips between two faces (the sign over the door)
  S.makeSign = (o) => {
    const g = new T3.Group(), mk = txt => { const c = document.createElement('canvas'); c.width = 1024; c.height = Math.round(1024 * o.h / o.w); const x = c.getContext('2d')
      x.fillStyle = o.bg || '#0b1730'; x.fillRect(0, 0, c.width, c.height); x.strokeStyle = o.line || '#FD4C00'; x.lineWidth = 10; rr(x, 14, 14, c.width - 28, c.height - 28, 26); x.stroke()
      x.fillStyle = o.fg || '#fff'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.font = `400 ${Math.round(c.height * .56)}px Anton`; x.fillText(txt, c.width / 2, c.height * .54); return ctex(c) }
    const fa = new T3.Mesh(new T3.PlaneGeometry(o.w, o.h), new T3.MeshBasicMaterial({ map: mk(o.a), toneMapped: false })), fb = new T3.Mesh(new T3.PlaneGeometry(o.w, o.h), new T3.MeshBasicMaterial({ map: mk(o.b), toneMapped: false }))
    fa.rotation.y = -Math.PI / 2; fb.rotation.set(0, -Math.PI / 2, Math.PI, 'ZYX'); fa.position.x = -.05; fb.position.x = .05   // b hangs upside down on the back, so the turn brings it upright to the front
    const body = shadow(new T3.Mesh(new T3.BoxGeometry(.09, o.h + .24, o.w + .24), lacquer('#132c5e'))); g.add(body, fa, fb)
    g.userData.flip = q => { g.rotation.z = q * Math.PI }                // 0 = face a, 1 = face b (turns about the wall's axis)
    return g
  }
  // ---------- a box with a slot (where the files pile up), a post, and a dashed link between two points
  S.makeBox = (o = {}) => { const g = new T3.Group(), w = o.w || 4, h = o.h || 3.2, d = o.d || 3
    const b = shadow(new T3.Mesh(new T3.BoxGeometry(w, h, d), lacquer(o.color || '#132c5e'))); b.position.y = h / 2; g.add(b)
    const sl = new T3.Mesh(new T3.BoxGeometry(w * .7, .08, .34), new T3.MeshBasicMaterial({ color: '#04070f' })); sl.position.set(0, h + .041, 0); g.add(sl)
    if (o.label) { const c = document.createElement('canvas'); c.width = 512; c.height = 256; const x = c.getContext('2d'); x.fillStyle = '#fff'; x.font = '800 86px Man'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(o.label, 256, 128)
      const l = new T3.Mesh(new T3.PlaneGeometry(w * .8, w * .4), new T3.MeshBasicMaterial({ map: ctex(c), transparent: true, toneMapped: false })); l.position.set(0, h * .5, d / 2 + .01); g.add(l) }
    return g }
  S.cardAt = (obj, k) => { obj.position.set(k[0], k[1], k[2]); obj.rotation.set(k[3] || 0, k[4] || 0, k[5] || 0); obj.scale.setScalar(k[6] != null ? k[6] : 1) }
  // keys [[t, v...]] with ease in-out between keys; values are arrays of numbers
  S.keys = (keys, t) => { if (t <= keys[0][0]) return keys[0].slice(1); const n = keys.length; if (t >= keys[n - 1][0]) return keys[n - 1].slice(1)
    let i = 1; while (t >= keys[i][0]) i++; const a = keys[i - 1], b = keys[i], u = B.eio((t - a[0]) / (b[0] - a[0])); return a.slice(1).map((v, j) => v + (b[j + 1] - v) * u) }
  B.stage = S
})(window)
