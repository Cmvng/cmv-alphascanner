/* board3d.js: the 3D tactical board (house engine, 9 Nov 2026). The owner on the CSS chessboard (8 Nov): "not quality…
   not rendered quality 3D… just flat… not really clean". So this one is a real rendered scene in three.js (r160):
   - a pitch board on a lacquered base, the grass mowed in squares (the chessboard idea, kept), painted lines, goals
     with nets;
   - players are turned chess pieces (lathe geometry) in glossy clear-coated lacquer, in each club's colours
     (keeper = king, defenders = rooks, midfielders = knights, wide players = bishops, strikers = queens);
   - studio light: an environment map built from soft boxes (so the lacquer reflects real highlights), a key light with
     soft shadows, a cool rim, ACES tone mapping, and supersampling for clean edges.
   Everything is a pure function of time, so parallel render workers draw identical frames.
   Units are metres: x along the pitch (-52.5..52.5, home goal at -x), z across (-34..34), y up. */
(function (G) {
  const T3 = THREE
  const B = {}
  const PW = 105, PH = 68

  // ---------- the grass: squares mowed in two greens, painted lines, a little noise
  function pitchTexture(opt = {}) {
    const W = 4096, H = Math.round(W * PH / PW), s = W / PW, c = document.createElement('canvas'); c.width = W; c.height = H
    const g = c.getContext('2d'), n = opt.squares || [12, 8]
    const g1 = opt.g1 || '#2f7a33', g2 = opt.g2 || '#286b2c'
    for (let i = 0; i < n[0]; i++) for (let j = 0; j < n[1]; j++) { g.fillStyle = (i + j) % 2 ? g1 : g2; g.fillRect(i * W / n[0], j * H / n[1], W / n[0] + 1, H / n[1] + 1) }
    // fine grass noise
    const id = g.getImageData(0, 0, W, H), d = id.data; let seed = 7
    const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647
    for (let k = 0; k < d.length; k += 4) { const v = (rnd() - .5) * 18; d[k] += v * .8; d[k + 1] += v * 1.1; d[k + 2] += v * .5 }
    g.putImageData(id, 0, 0)
    // soft light falloff toward the edges (the stadium lights pool in the middle)
    const rg = g.createRadialGradient(W / 2, H / 2, H * .2, W / 2, H / 2, W * .62); rg.addColorStop(0, 'rgba(255,250,235,0.10)'); rg.addColorStop(1, 'rgba(0,10,0,0.34)')
    g.fillStyle = rg; g.fillRect(0, 0, W, H)
    if (opt.noLines) { const t0 = new T3.CanvasTexture(c); t0.colorSpace = T3.SRGBColorSpace; t0.anisotropy = 8; return t0 }
    // lines
    g.strokeStyle = 'rgba(255,255,255,0.92)'; g.lineWidth = 0.14 * s; g.lineJoin = 'round'
    const X = x => (x + PW / 2) * s, Y = z => (z + PH / 2) * s
    const rect = (x0, z0, x1, z1) => g.strokeRect(X(x0), Y(z0), X(x1) - X(x0), Y(z1) - Y(z0))
    rect(-PW / 2 + .1, -PH / 2 + .1, PW / 2 - .1, PH / 2 - .1)
    g.beginPath(); g.moveTo(X(0), Y(-PH / 2)); g.lineTo(X(0), Y(PH / 2)); g.stroke()
    g.beginPath(); g.arc(X(0), Y(0), 9.15 * s, 0, Math.PI * 2); g.stroke()
    for (const sg of [-1, 1]) {
      const gx = sg * PW / 2
      rect(Math.min(gx, gx - sg * 16.5), -20.16, Math.max(gx, gx - sg * 16.5), 20.16)
      rect(Math.min(gx, gx - sg * 5.5), -9.16, Math.max(gx, gx - sg * 5.5), 9.16)
      g.beginPath(); const px = gx - sg * 11, a = Math.acos(5.5 / 9.15)
      if (sg > 0) g.arc(X(px), Y(0), 9.15 * s, Math.PI - a, Math.PI + a); else g.arc(X(px), Y(0), 9.15 * s, -a, a); g.stroke()
      g.fillStyle = 'rgba(255,255,255,0.92)'; g.beginPath(); g.arc(X(px), Y(0), .25 * s, 0, Math.PI * 2); g.fill()
      for (const cz of [-1, 1]) { g.beginPath(); g.arc(X(gx), Y(cz * PH / 2), 1 * s, sg > 0 ? (cz > 0 ? Math.PI : Math.PI / 2) : (cz > 0 ? -Math.PI / 2 : 0), sg > 0 ? (cz > 0 ? Math.PI * 1.5 : Math.PI) : (cz > 0 ? 0 : Math.PI / 2)); g.stroke() }
    }
    g.fillStyle = 'rgba(255,255,255,0.92)'; g.beginPath(); g.arc(X(0), Y(0), .25 * s, 0, Math.PI * 2); g.fill()
    const t = new T3.CanvasTexture(c); t.colorSpace = T3.SRGBColorSpace; t.anisotropy = 8; return t
  }

  // ---------- studio environment for reflections: a gradient dome and soft boxes, prefiltered once
  function studioEnv(R) {
    const es = new T3.Scene()
    const dome = new T3.Mesh(new T3.SphereGeometry(50, 32, 16), new T3.ShaderMaterial({ side: T3.BackSide, depthWrite: false,
      uniforms: { top: { value: new T3.Color('#dfeeff') }, bot: { value: new T3.Color('#1b3a7a') } },
      vertexShader: 'varying vec3 p; void main(){ p = normalize(position); gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.); }',
      fragmentShader: 'uniform vec3 top; uniform vec3 bot; varying vec3 p; void main(){ float h = smoothstep(-.3,.9,p.y); gl_FragColor = vec4(mix(bot, top, h), 1.); }' }))
    es.add(dome)
    const box = (w, h, pos, k) => { const m = new T3.Mesh(new T3.PlaneGeometry(w, h), new T3.MeshBasicMaterial({ color: new T3.Color(k, k, k), side: T3.DoubleSide }))
      m.position.set(...pos); m.lookAt(0, 0, 0); es.add(m) }
    box(30, 12, [0, 38, 10], 6.0)       // the big overhead soft box
    box(14, 20, [-34, 16, 18], 2.4)     // key side
    box(10, 18, [32, 14, -20], 1.4)     // rim side
    box(40, 4, [0, 6, -40], 0.9)        // a strip behind
    const pm = new T3.PMREMGenerator(R), rt = pm.fromScene(es, 0.03); pm.dispose(); return rt.texture
  }

  // ---------- turned pieces
  const smoothProfile = (pts, n = 90) => new T3.SplineCurve(pts.map(p => new T3.Vector2(p[0], p[1]))).getPoints(n)
  const BASE = [[0, 0], [1.32, 0], [1.36, .12], [1.34, .3], [1.18, .42], [1.02, .48], [1.06, .6], [.86, .7]]
  const PROFILES = {
    pawn: [...BASE, [.62, 1.1], [.5, 1.7], [.72, 1.86], [.74, 1.98], [.44, 2.06], [.5, 2.2], [.66, 2.5], [.6, 2.8], [.38, 3.0], [.001, 3.06]],
    rook: [...BASE, [.74, 1.2], [.7, 2.2], [.92, 2.4], [.98, 2.56], [.96, 3.05], [.001, 3.05]],
    bishop: [...BASE, [.6, 1.3], [.46, 2.2], [.74, 2.36], [.74, 2.48], [.42, 2.56], [.58, 2.9], [.6, 3.3], [.36, 3.72], [.16, 3.86], [.26, 3.98], [.18, 4.12], [.001, 4.16]],
    queen: [...BASE, [.66, 1.3], [.48, 2.5], [.8, 2.66], [.8, 2.78], [.5, 2.86], [.72, 3.5], [.96, 3.92], [.86, 4.0], [.5, 4.06], [.36, 4.18], [.22, 4.3], [.001, 4.32]],
    king: [...BASE, [.68, 1.3], [.5, 2.6], [.84, 2.76], [.84, 2.88], [.52, 2.96], [.74, 3.6], [.9, 4.0], [.6, 4.12], [.001, 4.14]],
    knightBase: [...BASE, [.74, 1.0], [.8, 1.2], [.001, 1.22]],
  }
  const GEO = {}
  function pieceGeo(kind) {
    if (GEO[kind]) return GEO[kind]
    const lathe = p => { const g = new T3.LatheGeometry(smoothProfile(p), 64); const ng = g.index ? g.toNonIndexed() : g; ng.computeVertexNormals(); smoothNormals(ng); ng.userData.smooth = 1; return ng }
    let parts = []
    if (kind === 'knight') {
      parts.push(lathe(PROFILES.knightBase))
      const s = new T3.Shape()      // a horse head in profile, facing +x
      s.moveTo(-.62, 0); s.lineTo(.66, 0); s.bezierCurveTo(.7, .5, .48, .9, .38, 1.18); s.bezierCurveTo(.62, 1.3, 1.0, 1.42, 1.06, 1.7)
      s.bezierCurveTo(1.1, 1.92, .9, 2.02, .7, 1.98); s.bezierCurveTo(.5, 2.1, .36, 2.42, .12, 2.6); s.lineTo(.02, 2.86); s.lineTo(-.12, 2.6)
      s.bezierCurveTo(-.5, 2.5, -.74, 2.1, -.76, 1.6); s.bezierCurveTo(-.78, 1.0, -.66, .5, -.62, 0)
      const ex = new T3.ExtrudeGeometry(s, { depth: .7, bevelEnabled: true, bevelThickness: .16, bevelSize: .12, bevelSegments: 6, curveSegments: 40 })
      ex.translate(0, 1.18, -.35); parts.push(ex)
    } else if (kind === 'rook') {
      parts.push(lathe(PROFILES.rook))
      for (let i = 0; i < 6; i++) { const b = new T3.BoxGeometry(.42, .34, .3); const a = i / 6 * Math.PI * 2; b.rotateY(-a); b.translate(Math.cos(a) * .8, 3.2, Math.sin(a) * .8); parts.push(b) }
    } else if (kind === 'king') {
      parts.push(lathe(PROFILES.king))
      const v = new T3.BoxGeometry(.18, .7, .18); v.translate(0, 4.45, 0); const h = new T3.BoxGeometry(.5, .18, .18); h.translate(0, 4.5, 0); parts.push(v, h)
    } else if (kind === 'queen') {
      parts.push(lathe(PROFILES.queen))
      for (let i = 0; i < 8; i++) { const sp = new T3.SphereGeometry(.11, 16, 12), a = i / 8 * Math.PI * 2; sp.translate(Math.cos(a) * .82, 4.02, Math.sin(a) * .82); parts.push(sp) }
      const top = new T3.SphereGeometry(.16, 20, 14); top.translate(0, 4.4, 0); parts.push(top)
    } else parts.push(lathe(PROFILES[kind] || PROFILES.pawn))
    parts.forEach(p => { if (p.index) p.computeVertexNormals() }); parts = parts.map(p => p.index ? p.toNonIndexed() : p); parts.forEach(p => { p.deleteAttribute('uv'); if (!p.attributes.normal) p.computeVertexNormals() })
    GEO[kind] = mergeGeos(parts); return GEO[kind]
  }
  // smooth normals for non-indexed geometry: average the normals of coincident positions (no addons needed)
  function smoothNormals(g) {
    const p = g.attributes.position.array, n = g.attributes.normal.array, map = new Map(), key = i => `${Math.round(p[i] * 1e4)},${Math.round(p[i + 1] * 1e4)},${Math.round(p[i + 2] * 1e4)}`
    for (let i = 0; i < p.length; i += 3) { const k = key(i); let a = map.get(k); if (!a) map.set(k, a = [0, 0, 0]); a[0] += n[i]; a[1] += n[i + 1]; a[2] += n[i + 2] }
    for (let i = 0; i < p.length; i += 3) { const a = map.get(key(i)), l = Math.hypot(a[0], a[1], a[2]) || 1; n[i] = a[0] / l; n[i + 1] = a[1] / l; n[i + 2] = a[2] / l }
  }
  function mergeGeos(list) {
    let n = 0; list.forEach(g => n += g.attributes.position.count)
    const pos = new Float32Array(n * 3), nor = new Float32Array(n * 3); let o = 0
    list.forEach(g => { pos.set(g.attributes.position.array, o * 3); nor.set(g.attributes.normal.array, o * 3); o += g.attributes.position.count })
    const m = new T3.BufferGeometry(); m.setAttribute('position', new T3.BufferAttribute(pos, 3)); m.setAttribute('normal', new T3.BufferAttribute(nor, 3)); return m
  }
  const ROLE = { GK: 'king', CB: 'rook', LB: 'rook', RB: 'rook', LWB: 'rook', RWB: 'rook', DM: 'knight', CM: 'knight', AM: 'knight', LM: 'bishop', RM: 'bishop', LW: 'bishop', RW: 'bishop', ST: 'queen', CF: 'queen' }

  let CT = null
  function contactTex() { if (CT) return CT; const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d'), r = g.createRadialGradient(64, 64, 8, 64, 64, 64)
    r.addColorStop(0, 'rgba(0,0,0,0.75)'); r.addColorStop(.45, 'rgba(0,0,0,0.35)'); r.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = r; g.fillRect(0, 0, 128, 128); CT = new T3.CanvasTexture(c); return CT }
  // lacquer, with an optional band of the second colour (Sunderland's stripes)
  function makePiece(team, role, scale = 1.25) {
    const kind = ROLE[role] || 'pawn', grp = new T3.Group()
    const mat = new T3.MeshPhysicalMaterial({ color: team.c1, roughness: .24, metalness: 0, clearcoat: 1, clearcoatRoughness: .05, envMapIntensity: 1.0 })
    const m = new T3.Mesh(pieceGeo(kind), mat); m.castShadow = true; m.receiveShadow = true; grp.add(m)
    if (team.c2) {
      const band = new T3.Mesh(new T3.CylinderGeometry(1.075, 1.075, .16, 64, 1, true), new T3.MeshPhysicalMaterial({ color: team.c2, roughness: .3, clearcoat: 1, clearcoatRoughness: .08, side: T3.DoubleSide }))
      band.position.y = .54; grp.add(band)
    }
    const cs = new T3.Mesh(new T3.PlaneGeometry(4.2, 4.2), new T3.MeshBasicMaterial({ map: contactTex(), transparent: true, depthWrite: false, opacity: .85 }))
    cs.rotation.x = -Math.PI / 2; cs.position.y = .03; grp.add(cs)
    // felt underside glow ring (selection / highlight), hidden until used
    const ring = new T3.Mesh(new T3.RingGeometry(1.55, 1.95, 64), new T3.MeshBasicMaterial({ color: '#7cc8ff', transparent: true, opacity: 0, depthWrite: false }))
    ring.rotation.x = -Math.PI / 2; ring.position.y = .06; grp.add(ring)
    grp.scale.setScalar(scale); grp.userData = { mat, ring, kind }
    return grp
  }


  // ---------- crisp pitch lines as thin geometry (sharp at any distance)
  function lineMeshes(grp) {
    const mat = new T3.MeshStandardMaterial({ color: '#f4f7fb', roughness: .7, metalness: 0, polygonOffset: true, polygonOffsetFactor: -2 })
    const W2 = .07, Y = .075, add = g => { const m = new T3.Mesh(g, mat); m.receiveShadow = true; grp.add(m) }
    const seg = (x0, z0, x1, z1) => { const dx = x1 - x0, dz = z1 - z0, L = Math.hypot(dx, dz); const g = new T3.PlaneGeometry(L + W2 * 2, W2 * 2); g.rotateX(-Math.PI / 2); g.rotateY(-Math.atan2(dz, dx)); g.translate((x0 + x1) / 2, Y, (z0 + z1) / 2); add(g) }
    const arc = (cx, cz, r, a0, a1) => { const g = new T3.RingGeometry(r - W2, r + W2, 128, 1, a0, a1 - a0); g.rotateX(-Math.PI / 2); g.translate(cx, Y, cz); add(g) }
    const spot = (x, z) => { const g = new T3.CircleGeometry(.24, 24); g.rotateX(-Math.PI / 2); g.translate(x, Y, z); add(g) }
    const hx = PW / 2, hz = PH / 2
    seg(-hx, -hz, hx, -hz); seg(-hx, hz, hx, hz); seg(-hx, -hz, -hx, hz); seg(hx, -hz, hx, hz); seg(0, -hz, 0, hz)
    arc(0, 0, 9.15, 0, Math.PI * 2); spot(0, 0)
    for (const sg of [-1, 1]) {
      const gx = sg * hx, b16 = gx - sg * 16.5, b5 = gx - sg * 5.5
      seg(gx, -20.16, b16, -20.16); seg(gx, 20.16, b16, 20.16); seg(b16, -20.16, b16, 20.16)
      seg(gx, -9.16, b5, -9.16); seg(gx, 9.16, b5, 9.16); seg(b5, -9.16, b5, 9.16)
      const px = gx - sg * 11; spot(px, 0)
      const a = Math.acos(5.5 / 9.15)                          // the D outside the box (screen-space angles: ring is in xz after rotation)
      if (sg > 0) arc(px, 0, 9.15, Math.PI - a, Math.PI + a); else arc(px, 0, 9.15, -a, a)
      for (const cz of [-1, 1]) { const st = sg > 0 ? (cz > 0 ? Math.PI / 2 : Math.PI) : (cz > 0 ? 0 : -Math.PI / 2); arc(gx, cz * hz, 1, st, st + Math.PI / 2) }
    }
  }
  // fine grass detail for close-ups: a tiled noise used as a bump map
  function grassBump() { const c = document.createElement('canvas'); c.width = c.height = 512; const g = c.getContext('2d'), id = g.createImageData(512, 512); let sd = 11
    const rnd = () => (sd = (sd * 16807) % 2147483647) / 2147483647
    for (let k = 0; k < id.data.length; k += 4) { const v = 128 + (rnd() - .5) * 120; id.data[k] = id.data[k + 1] = id.data[k + 2] = v; id.data[k + 3] = 255 }
    g.putImageData(id, 0, 0); const t = new T3.CanvasTexture(c); t.wrapS = t.wrapT = T3.RepeatWrapping; t.repeat.set(60, 40); t.anisotropy = 8; return t }
  // ---------- the board: base, pitch, goals
  function makeBoard(scene) {
    const grp = new T3.Group()
    // lacquered base slab with rounded corners
    const sh = new T3.Shape(), w = PW / 2 + 5, h = PH / 2 + 5, r = 4
    sh.moveTo(-w + r, -h); sh.lineTo(w - r, -h); sh.quadraticCurveTo(w, -h, w, -h + r); sh.lineTo(w, h - r); sh.quadraticCurveTo(w, h, w - r, h)
    sh.lineTo(-w + r, h); sh.quadraticCurveTo(-w, h, -w, h - r); sh.lineTo(-w, -h + r); sh.quadraticCurveTo(-w, -h, -w + r, -h)
    const slab = new T3.Mesh(new T3.ExtrudeGeometry(sh, { depth: 3, bevelEnabled: true, bevelThickness: .6, bevelSize: .6, bevelSegments: 5, curveSegments: 24 }),
      new T3.MeshPhysicalMaterial({ color: '#0b1f44', roughness: .32, clearcoat: 1, clearcoatRoughness: .1 }))
    slab.rotation.x = -Math.PI / 2; slab.position.y = -3.6; slab.receiveShadow = true; slab.castShadow = true; grp.add(slab)
    // a thin brass-like trim between base and grass
    const trim = new T3.Mesh(new T3.BoxGeometry(PW + 2.4, .3, PH + 2.4), new T3.MeshStandardMaterial({ color: '#c9d6ea', roughness: .25, metalness: .8 }))
    trim.position.y = -.1; grp.add(trim)
    const pitch = new T3.Mesh(new T3.PlaneGeometry(PW + 2, PH + 2), new T3.MeshStandardMaterial({ map: pitchTexture({ noLines: true }), bumpMap: grassBump(), bumpScale: .6, roughness: .9, metalness: 0, envMapIntensity: .35 }))
    pitch.material.map.repeat.set(1, 1)
    pitch.rotation.x = -Math.PI / 2; pitch.position.y = .06; pitch.receiveShadow = true; grp.add(pitch)
    lineMeshes(grp)
    // the floor the board stands on: it only shows the board's soft shadow
    const floor = new T3.Mesh(new T3.PlaneGeometry(600, 600), new T3.ShadowMaterial({ opacity: .28 })); floor.rotation.x = -Math.PI / 2; floor.position.y = -4.3; floor.receiveShadow = true; grp.add(floor)
    // goals
    const post = new T3.MeshStandardMaterial({ color: '#ffffff', roughness: .3, metalness: .2 })
    const netMat = new T3.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: .35, wireframe: true })
    B.nets = []
    for (const sg of [-1, 1]) {
      const g = new T3.Group(), gw = 7.32, gh = 2.44, depth = 2.2, rad = .12
      const cyl = (len, x, y, z, rx, rz) => { const m = new T3.Mesh(new T3.CylinderGeometry(rad, rad, len, 16), post); m.position.set(x, y, z); m.rotation.set(rx || 0, 0, rz || 0); m.castShadow = true; g.add(m) }
      cyl(gh, 0, gh / 2, -gw / 2); cyl(gh, 0, gh / 2, gw / 2); cyl(gw, 0, gh, 0, Math.PI / 2)
      const net = new T3.Mesh(new T3.BoxGeometry(depth, gh, gw, 6, 6, 18), netMat); net.position.set(sg * depth / 2, gh / 2, 0); g.add(net); B.nets.push(net)
      g.position.set(sg * PW / 2, .06, 0); grp.add(g)
    }
    scene.add(grp); return grp
  }

  // ---------- the ball
  function makeBall() {
    const c = document.createElement('canvas'); c.width = 512; c.height = 256; const g = c.getContext('2d')
    g.fillStyle = '#f4f6fa'; g.fillRect(0, 0, 512, 256); g.fillStyle = '#111827'
    for (let i = 0; i < 12; i++) { const x = (i % 6) * 85 + (i < 6 ? 0 : 42), y = i < 6 ? 70 : 186; g.beginPath(); for (let k = 0; k < 5; k++) { const a = k / 5 * Math.PI * 2 - Math.PI / 2; g.lineTo(x + Math.cos(a) * 22, y + Math.sin(a) * 22) } g.fill() }
    const t = new T3.CanvasTexture(c); t.colorSpace = T3.SRGBColorSpace
    const m = new T3.Mesh(new T3.SphereGeometry(.75, 32, 24), new T3.MeshPhysicalMaterial({ map: t, roughness: .35, clearcoat: .6 }))
    m.castShadow = true; return m
  }

  // ---------- renderer, lights, background
  function setup(canvas, opt = {}) {
    const R = new T3.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true, powerPreference: 'high-performance' })
    B.W = opt.w || 1920; B.H = opt.h || 1080; R.setPixelRatio(opt.pr || 1); R.setSize(B.W, B.H, false)
    R.toneMapping = T3.ACESFilmicToneMapping; R.toneMappingExposure = opt.exposure || 1.0; R.outputColorSpace = T3.SRGBColorSpace
    R.shadowMap.enabled = true; R.shadowMap.type = T3.PCFSoftShadowMap
    const scene = new T3.Scene()
    // the house background: light sky to deep blue, as a gradient texture
    const bc = document.createElement('canvas'); bc.width = 256; bc.height = 1024; const bg = bc.getContext('2d'), gr = bg.createLinearGradient(0, 0, 0, 1024)
    ;(opt.bg || [[0, '#cfe4ff'], [.55, '#6fa8f0'], [1, '#1d4fb8']]).forEach(([o, c]) => gr.addColorStop(o, c)); bg.fillStyle = gr; bg.fillRect(0, 0, 256, 1024)
    { const id = bg.getImageData(0, 0, 256, 1024); let sd = 3; for (let k = 0; k < id.data.length; k += 4) { sd = (sd * 16807) % 2147483647; const v = (sd / 2147483647 - .5) * 3; id.data[k] += v; id.data[k + 1] += v; id.data[k + 2] += v } bg.putImageData(id, 0, 0) }
    const bt = new T3.CanvasTexture(bc); bt.colorSpace = T3.SRGBColorSpace; scene.background = bt
    scene.environment = studioEnv(R)
    const hemi = new T3.HemisphereLight('#e8f2ff', '#22461f', .18); scene.add(hemi)
    const key = new T3.DirectionalLight('#fff3e2', 2.5); key.position.set(-55, 62, 40); key.castShadow = true
    key.shadow.mapSize.set(opt.shadow || 4096, opt.shadow || 4096); const sc = key.shadow.camera; sc.left = -82; sc.right = 82; sc.top = 60; sc.bottom = -60; sc.near = 10; sc.far = 240
    key.shadow.bias = -.0004; key.shadow.normalBias = .03; key.shadow.radius = 3; scene.add(key)
    const pool = new T3.SpotLight('#fff8ee', 520, 0, Math.PI / 5, .9, 1.6); pool.position.set(0, 70, 8); pool.target.position.set(0, 0, 0); scene.add(pool, pool.target)
    const rim = new T3.DirectionalLight('#bcd8ff', 1.1); rim.position.set(50, 40, -60); scene.add(rim)
    const cam = new T3.PerspectiveCamera(opt.fov || 26, B.W / B.H, 1, 1000)
    B.R = R; B.scene = scene; B.cam = cam; B.key = key
    return { R, scene, cam }
  }


  // ================= animation (all pure functions of t, in VIDEO seconds) =================
  const cl = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x)), eio = x => { x = cl(x); return x < .5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2 }
  const eo = x => 1 - Math.pow(1 - cl(x), 3)
  // keys [[t, x, z], ...]: hold, then glide (ease in-out) to the next key over its own time span
  function keyAt(keys, t) {
    if (!keys || !keys.length) return null
    if (t <= keys[0][0]) return keys[0].slice(1)
    for (let i = 1; i < keys.length; i++) if (t < keys[i][0]) { const a = keys[i - 1], b = keys[i], u = eio((t - a[0]) / (b[0] - a[0])); return a.slice(1).map((v, k) => v + (b[k + 1] - v) * u) }
    return keys[keys.length - 1].slice(1)
  }
  // the ball: keys [[t, x, z, peak]], peak = height of the arc on the way TO that key (0 = along the ground)
  function ballAt(keys, t) {
    if (t <= keys[0][0]) return [keys[0][1], 0, keys[0][2]]
    for (let i = 1; i < keys.length; i++) if (t < keys[i][0]) {
      const a = keys[i - 1], b = keys[i], u = (t - a[0]) / (b[0] - a[0]), e = b[3] ? u : eo(u * 1.15)
      return [a[1] + (b[1] - a[1]) * e, (b[3] || 0) * 4 * u * (1 - u), a[2] + (b[2] - a[2]) * e] }
    const k = keys[keys.length - 1]; return [k[1], 0, k[2]]
  }
  // ---- arrows: a raised arc tube for passes and shots, a flat dashed ribbon for runs
  function arcCurve(p0, p1, h) { const m = new T3.Vector3((p0[0] + p1[0]) / 2, h, (p0[1] + p1[1]) / 2)
    return new T3.QuadraticBezierCurve3(new T3.Vector3(p0[0], .5, p0[1]), m, new T3.Vector3(p1[0], .5, p1[1])) }
  function makeArrow(o) {
    const grp = new T3.Group(), col = new T3.Color(o.color || '#ffffff')
    const curve = o.kind === 'run' ? new T3.QuadraticBezierCurve3(new T3.Vector3(o.from[0], .2, o.from[1]),
      new T3.Vector3((o.from[0] + o.to[0]) / 2 + (o.bend || 0) * (o.to[1] - o.from[1]) * .3, .2, (o.from[1] + o.to[1]) / 2 - (o.bend || 0) * (o.to[0] - o.from[0]) * .3),
      new T3.Vector3(o.to[0], .2, o.to[1])) : arcCurve(o.from, o.to, o.h != null ? o.h : 3)
    const mat = new T3.MeshBasicMaterial({ color: col, transparent: true, opacity: .95, depthWrite: false, toneMapped: false })
    let geo
    if (o.kind === 'run') {      // dashes: a ribbon of short quads along the curve
      const pts = curve.getSpacedPoints(160), pos = [], idx = []; let q = 0
      for (let i = 0; i < pts.length - 1; i++) { if (Math.floor(i / 5) % 2) continue
        const a = pts[i], b = pts[i + 1], d = new T3.Vector3().subVectors(b, a).normalize(), n = new T3.Vector3(-d.z, 0, d.x).multiplyScalar(.32)
        pos.push(a.x + n.x, a.y, a.z + n.z, a.x - n.x, a.y, a.z - n.z, b.x + n.x, b.y, b.z + n.z, b.x - n.x, b.y, b.z - n.z)
        idx.push(q, q + 1, q + 2, q + 1, q + 3, q + 2); q += 4 }
      geo = new T3.BufferGeometry(); geo.setAttribute('position', new T3.Float32BufferAttribute(pos, 3)); geo.setIndex(idx)
    } else geo = new T3.TubeGeometry(curve, 120, o.r || .26, 10, false)
    const m = new T3.Mesh(geo, mat); m.renderOrder = 5; grp.add(m)
    const head = new T3.Mesh(new T3.ConeGeometry(o.kind === 'run' ? .9 : .75, 2.2, 20), mat); head.renderOrder = 5; grp.add(head)
    grp.userData = { o, curve, geo, m, head, mat, total: geo.index ? geo.index.count : geo.attributes.position.count }
    return grp
  }
  function updateArrow(a, t, T) {
    const { o, curve, geo, head, mat, total } = a.userData, t0 = T(o.at), t1 = T(o.until != null ? o.until : o.at + 3)
    const grow = eio((t - t0) / (o.dur || .7)), out = cl((t1 - t) / .3), vis = t >= t0 && t < t1 + .01
    a.visible = vis && grow > .001; if (!a.visible) return
    geo.setDrawRange(0, Math.max(3, Math.floor(total * grow / 3) * 3)); mat.opacity = .95 * Math.min(1, out)
    const u = Math.min(.999, grow), p = curve.getPointAt(u), tg = curve.getTangentAt(u)
    head.position.copy(p); head.quaternion.setFromUnitVectors(new T3.Vector3(0, 1, 0), tg.normalize())
  }
  // ---- zones: a soft glowing patch on the grass (ellipse), pulsing gently
  let ZT = null
  function zoneTex() { if (ZT) return ZT; const c = document.createElement('canvas'); c.width = c.height = 256; const g = c.getContext('2d'), r = g.createRadialGradient(128, 128, 30, 128, 128, 128)
    r.addColorStop(0, 'rgba(255,255,255,0.75)'); r.addColorStop(.7, 'rgba(255,255,255,0.45)'); r.addColorStop(.92, 'rgba(255,255,255,0.9)'); r.addColorStop(1, 'rgba(255,255,255,0)')
    g.fillStyle = r; g.fillRect(0, 0, 256, 256); ZT = new T3.CanvasTexture(c); return ZT }
  function makeZone(o) {
    const m = new T3.Mesh(new T3.PlaneGeometry(1, 1), new T3.MeshBasicMaterial({ map: zoneTex(), color: o.color || '#4FB3FF', transparent: true, depthWrite: false, toneMapped: false, opacity: 0 }))
    m.rotation.x = -Math.PI / 2; m.position.set(o.at3[0], .12, o.at3[1]); m.scale.set(o.size[0], o.size[1], 1); m.renderOrder = 3; m.userData = { o }; return m
  }
  function updateZone(z, t, T) { const o = z.userData.o, a = T(o.from), b = T(o.to); const q = t >= a && t < b + .4 ? Math.min(eo((t - a) / .5), cl((b + .4 - t) / .4)) : 0
    z.visible = q > 0; z.material.opacity = q * (o.op || .55) * (1 + .12 * Math.sin(t * 5)) }
  // ---- the camera: keys [t, [px,py,pz], [tx,ty,tz], fov], Catmull-Rom through the keys (stops only at the ends)
  function camAt(keys, t) {
    if (t <= keys[0][0]) return keys[0]; const n = keys.length; if (t >= keys[n - 1][0]) return keys[n - 1]
    let i = 1; while (t >= keys[i][0]) i++
    const k0 = keys[Math.max(0, i - 2)], k1 = keys[i - 1], k2 = keys[i], k3 = keys[Math.min(n - 1, i + 1)], u = eio((t - k1[0]) / (k2[0] - k1[0]))
    const cr = (a, b, c, d) => { const u2 = u * u, u3 = u2 * u; return .5 * ((2 * b) + (-a + c) * u + (2 * a - 5 * b + 4 * c - d) * u2 + (-a + 3 * b - 3 * c + d) * u3) }
    const lerp = (j, k) => [0, 1, 2].map(q => cr(k0[j][q], k1[j][q], k2[j][q], k3[j][q]))
    return [t, lerp(1), lerp(2), k1[3] + (k2[3] - k1[3]) * u]
  }
  // ---- net ripple on a goal
  const NET0 = new WeakMap()
  function rippleNet(net, t, tg) {
    const pos = net.geometry.attributes.position; if (!NET0.has(net)) NET0.set(net, Float32Array.from(pos.array))
    const base = NET0.get(net), d = t - tg, amp = d > 0 && d < 1.6 ? .55 * Math.exp(-d * 2.6) : 0
    for (let i = 0; i < pos.count; i++) { const x = base[i * 3], y = base[i * 3 + 1], z = base[i * 3 + 2]
      pos.array[i * 3] = x + (amp ? amp * Math.sin(d * 18 - Math.abs(z) * .9 - y * 1.2) * (.6 + .4 * Math.cos(z * .8)) * Math.sign(net.position.x) : 0) }
    pos.needsUpdate = true
  }

  // ---------- depth of field: the scene goes to a multisampled target with depth, then a two-pass blur whose radius
  // follows each pixel's distance from the focus plane (a real-lens look on close shots; off when aperture is 0)
  function postSetup(pr) {
    const W = Math.round(1920 * pr), H = Math.round(1080 * pr)
    const mk = (depth) => { const rt = new T3.WebGLRenderTarget(W, H, { type: T3.HalfFloatType, samples: depth ? 4 : 0 })
      if (depth) { rt.depthTexture = new T3.DepthTexture(W, H); rt.depthTexture.type = T3.UnsignedIntType } return rt }
    const rtA = mk(true), rtB = mk(false), rtC = mk(false)
    const vs = 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0., 1.); }'
    const fs = (dir) => `uniform sampler2D tCol; uniform sampler2D tDep; uniform vec2 px; uniform float focus; uniform float ap; uniform float near; uniform float far; uniform float maxR;
      varying vec2 vUv;
      float lin(float d){ return near * far / (far - d * (far - near)); }
      float coc(vec2 uv){ float z = lin(texture2D(tDep, uv).x); return clamp(abs(z - focus) / z * ap, 0., maxR); }
      void main(){
        float c0 = coc(vUv); vec4 acc = vec4(0.); float wsum = 0.;
        for (int i = -6; i <= 6; i++) { float o = float(i) / 6.; vec2 uv = vUv + ${dir} * px * o * c0;
          float ci = coc(uv); float w = (1. - abs(o) * .55) * smoothstep(0., 1., ci + .35);      // samples sharper than us count less (less bleeding)
          acc += texture2D(tCol, uv) * w; wsum += w; }
        gl_FragColor = acc / max(wsum, 1e-4);
      }`
    const mat = (dir) => new T3.ShaderMaterial({ vertexShader: vs, fragmentShader: fs(dir), depthTest: false, depthWrite: false,
      uniforms: { tCol: { value: null }, tDep: { value: rtA.depthTexture }, px: { value: new T3.Vector2(1 / W, 1 / H) }, focus: { value: 60 }, ap: { value: 0 }, near: { value: 1 }, far: { value: 1000 }, maxR: { value: 6 * pr } } })
    const mH = mat('vec2(1.,0.)'), mV = mat('vec2(0.,1.)')
    const quad = new T3.Mesh(new T3.PlaneGeometry(2, 2), mH), qs = new T3.Scene(); qs.add(quad); const oc = new T3.OrthographicCamera(-1, 1, 1, -1, 0, 1)
    // the final pass also does the tone mapping and sRGB (the targets hold linear HDR)
    const outMat = new T3.ShaderMaterial({ vertexShader: vs, depthTest: false, depthWrite: false, uniforms: { tCol: { value: null } },
      fragmentShader: ['uniform sampler2D tCol;', 'varying vec2 vUv;', 'void main(){', '  gl_FragColor = texture2D(tCol, vUv);', '  #include <tonemapping_fragment>', '  #include <colorspace_fragment>', '}'].join('\n') })
    outMat.toneMapped = true
    B.post = { rtA, rtB, rtC, mH, mV, quad, qs, oc, outMat, W, H }
  }
  function renderFrame(scene, cam, focus, ap) {
    const R = B.R, P = B.post
    if (!P || !ap) { R.setRenderTarget(null); R.render(scene, cam); return }
    const tm = R.toneMapping; R.toneMapping = T3.NoToneMapping
    R.setRenderTarget(P.rtA); R.render(scene, cam)
    for (const m of [P.mH, P.mV]) { m.uniforms.focus.value = focus; m.uniforms.ap.value = ap; m.uniforms.near.value = cam.near; m.uniforms.far.value = cam.far }
    P.mH.uniforms.tCol.value = P.rtA.texture; P.quad.material = P.mH; R.setRenderTarget(P.rtB); R.render(P.qs, P.oc)
    P.mV.uniforms.tCol.value = P.rtB.texture; P.quad.material = P.mV; R.setRenderTarget(P.rtC); R.render(P.qs, P.oc)
    R.toneMapping = tm; P.outMat.uniforms.tCol.value = P.rtC.texture; P.quad.material = P.outMat; R.setRenderTarget(null); R.render(P.qs, P.oc)
  }
  // screen position of a 3D point (for HTML labels)
  function toScreen(v) { const p = v.clone().project(B.cam); return { x: (p.x + 1) / 2 * (B.W || 1920), y: (1 - p.y) / 2 * (B.H || 1080), vis: p.z < 1 } }

  Object.assign(B, { postSetup, renderFrame, setup, makeBoard, makePiece, makeBall, toScreen, pitchTexture, PW, PH, ROLE, keyAt, ballAt, makeArrow, updateArrow, makeZone, updateZone, camAt, rippleNet, cl, eio, eo })
  G.B3 = B
})(window)
