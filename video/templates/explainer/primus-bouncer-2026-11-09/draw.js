/* draw.js: the flat props of the Primus "bouncer" explainer, drawn on canvas (stage3d.js makeCard calls these).
   Each is draw(g, w, h, state, spec). Colours: Primus orange and cream for its own things, navy ink, house blue rings. */
(function () {
  const rr = (g, x, y, w, h, r) => { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath() }
  const NAVY = '#0B1F44', OR = '#FD4C00', MUT = '#7b879f', BAR = '#c5cee0', CREAM = '#fbf7ee'
  const lock = (g, x, y, s, col) => { g.strokeStyle = col; g.lineWidth = s * .16; g.beginPath(); g.arc(x, y - s * .28, s * .3, Math.PI, 0); g.stroke(); g.fillStyle = col; rr(g, x - s * .44, y - s * .28, s * .88, s * .7, s * .12); g.fill() }
  const D = {}
  // an identity card: state k lights rows 1..k in orange (4 = all of them)
  D.id = (g, w, h, st) => { g.fillStyle = CREAM; rr(g, 0, 0, w, h, 46); g.fill(); g.fillStyle = NAVY; g.font = '800 54px Man'; g.fillText('IDENTITY CARD', 56, 98)
    g.fillStyle = '#d6dcea'; rr(g, 56, 150, 250, 320, 24); g.fill(); g.fillStyle = '#9aa7c2'; g.beginPath(); g.arc(181, 266, 64, 0, 7); g.fill(); g.beginPath(); g.ellipse(181, 432, 108, 82, 0, Math.PI, 0); g.fill()
    ;['NAME', 'ADDRESS', 'DATE OF BIRTH', 'ID NUMBER'].forEach((t, i) => { const on = st > i, y = 150 + i * 106
      if (on) { g.fillStyle = 'rgba(253,76,0,.12)'; rr(g, 340, y - 6, 640, 96, 18); g.fill() }
      g.fillStyle = on ? OR : MUT; g.font = '800 32px Man'; g.fillText(t, 362, y + 34); g.fillStyle = on ? OR : NAVY; rr(g, 362, y + 48, [500, 560, 300, 420][i], 30, 10); g.fill() }) }
  // a document page: spec.title, spec.tone
  D.page = (g, w, h, st, d) => { g.fillStyle = '#fff'; rr(g, 0, 0, w, h, 34); g.fill(); g.fillStyle = d.tone || NAVY; rr(g, 0, 0, w, 150, 34); g.fill(); g.fillRect(0, 100, w, 50)
    g.fillStyle = '#fff'; g.font = `800 ${d.fs || 62}px Man`; g.textBaseline = 'middle'; g.fillText(d.title, 54, 78); lock(g, w - 96, 92, 62, 'rgba(255,255,255,.9)'); g.textBaseline = 'alphabetic'
    let s = 11; const rnd = () => (s = (s * 16807 + (d.seed || 0)) % 2147483647) / 2147483647
    g.fillStyle = MUT; g.font = '800 30px Man'; g.fillText(d.sub || 'ACCOUNT', 54, 232); g.fillStyle = NAVY; rr(g, 54, 256, w * .5, 54, 12); g.fill()
    for (let i = 0; i < (d.rows || 9); i++) { const y = 372 + i * 92; g.fillStyle = BAR; rr(g, 54, y, w * (.3 + rnd() * .28), 30, 10); g.fill(); g.fillStyle = '#9aa7c2'; rr(g, w - 54 - w * (.14 + rnd() * .1), y, w * .2, 30, 10); g.fill(); g.fillStyle = '#e6ebf4'; g.fillRect(54, y + 58, w - 108, 3) } }
  // the real site in your own browser: state 1 rings the one line the proof is about
  D.browser = (g, w, h, st, d) => { g.fillStyle = '#fff'; rr(g, 0, 0, w, h, 30); g.fill(); g.fillStyle = '#eef2f8'; rr(g, 0, 0, w, 96, 30); g.fill(); g.fillRect(0, 60, w, 36)
    ;[40, 76, 112].forEach(x => { g.fillStyle = '#c9d2e2'; g.beginPath(); g.arc(x, 48, 12, 0, 7); g.fill() }); g.fillStyle = '#fff'; rr(g, 160, 20, w - 200, 56, 28); g.fill()
    lock(g, 196, 58, 30, '#12824a'); g.fillStyle = NAVY; g.font = '600 32px Man'; g.fillText(d.url || 'https://your-bank.example', 226, 60)
    g.fillStyle = NAVY; rr(g, 60, 140, 70, 70, 16); g.fill(); g.font = '800 46px Man'; g.fillText('Your bank', 152, 192)
    g.fillStyle = MUT; g.font = '800 30px Man'; g.fillText('AVAILABLE BALANCE', 60, 300); g.fillStyle = NAVY; g.font = '400 124px Anton'; g.fillText(d.balance || '$2,480.15', 58, 420)
    for (let i = 0; i < 3; i++) { const y = 492 + i * 62; g.fillStyle = BAR; rr(g, 60, y, 330 + i * 60, 28, 10); g.fill(); g.fillStyle = '#9aa7c2'; rr(g, w - 260, y, 200, 28, 10); g.fill() }
    if (st >= 1) { g.strokeStyle = OR; g.lineWidth = 10; rr(g, 36, 262, 600, 186, 26); g.stroke() } }
  // the proof: state 0 sealed, 1 shows the one line, 2 shows TRUE
  D.ticket = (g, w, h, st) => { g.fillStyle = CREAM; rr(g, 0, 0, w, h, 40); g.fill(); g.fillStyle = OR; rr(g, 0, 0, 250, h, 40); g.fill(); g.fillRect(200, 0, 50, h)
    g.strokeStyle = '#fff'; g.lineWidth = 16; g.lineCap = 'round'; g.lineJoin = 'round'; g.beginPath(); g.arc(125, h / 2, 78, 0, 7); g.stroke(); g.beginPath(); g.moveTo(88, h / 2 + 4); g.lineTo(116, h / 2 + 34); g.lineTo(166, h / 2 - 30); g.stroke()
    g.fillStyle = OR; g.font = '800 34px Man'; g.fillText('PROOF  ·  ONE LINE', 296, 78)
    if (st >= 1) { g.fillStyle = NAVY; g.font = '800 70px Man'; g.fillText('Balance over $1,000', 294, 188) } else { g.fillStyle = BAR; rr(g, 296, 140, 560, 54, 14); g.fill() }
    if (st >= 2) { g.fillStyle = '#12824a'; g.font = '400 150px Anton'; g.fillText('TRUE', 292, 352) } else { g.fillStyle = BAR; rr(g, 296, 240, 300, 96, 18); g.fill() }
    g.fillStyle = MUT; g.font = '800 30px Man'; g.fillText('Signed  ·  Primus node', 296, h - 44)
    g.fillStyle = '#e9e2d4'; for (let y = 26; y < h; y += 44) { g.beginPath(); g.arc(250, y, 9, 0, 7); g.fill() } }
  // what the app asks for: state 1 rings the request
  D.request = (g, w, h, st) => { g.fillStyle = '#fff'; rr(g, 0, 0, w, h, 36); g.fill(); g.fillStyle = NAVY; rr(g, 0, 0, w, 124, 36); g.fill(); g.fillRect(0, 84, w, 40)
    g.fillStyle = '#fff'; g.font = '800 50px Man'; g.fillText('THE APP ASKS FOR', 50, 82)
    g.fillStyle = '#eef2f8'; rr(g, 44, 166, w - 88, 170, 24); g.fill(); g.fillStyle = NAVY; g.font = '800 78px Man'; g.fillText('Your account balance', 76, 278)
    g.font = '800 46px Man'; g.fillStyle = OR; g.fillText('By default', 54, 432); g.fillStyle = NAVY; g.fillText('the app sees it', 54 + g.measureText('By default  ').width, 432)
    g.fillStyle = MUT; g.fillText('Option', 54, 512); g.fillText('a yes / no only', 54 + g.measureText('By default  ').width, 512)
    if (st >= 1) { g.strokeStyle = '#1F5FDB'; g.lineWidth = 12; rr(g, 30, 152, w - 60, 198, 30); g.stroke() } }
  window.DRAW = D
})()
