// Walk-through 3D gallery of Victor's work: six rooms along one hall.
// Drag to look, tap the floor to walk, tap anything to open it. Follows the light/dark theme.
import * as THREE from "three";

const $ = s => document.querySelector(s);
const root = document.documentElement;
const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
const coarse = matchMedia("(pointer: coarse)").matches;
const A = p => "../" + p;
const V3 = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const ease = t => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

/* ---------- layout ---------- */
const EYE = 1.65, HALF_W = 7, WALL_H = 5, DOOR = 2.4, LINTEL = 3.6;
const ROOMS = [
  { id: "lobby", name: "Lobby", short: "Lobby", z: 0 },
  { id: "art", name: "Art", short: "Art", z: -14 },
  { id: "builds", name: "Builds", short: "Builds", z: -28 },
  { id: "journey", name: "Journey", short: "Journey", z: -42 },
  { id: "life", name: "Life", short: "Life", z: -56 },
  { id: "cv", name: "CV & Contact", short: "CV", z: -70 },
];
const FRONT_Z = 7, BACK_Z = -77;
const PARTS = ROOMS.slice(0, -1).map(r => r.z - 7);
const roomAt = z => clamp(Math.floor((FRONT_Z - z) / 14), 0, ROOMS.length - 1);
const station = i => ({ x: 0, z: i === 0 ? 5.4 : ROOMS[i].z + 5.6, yaw: 0, pitch: -0.05 });

/* ---------- themes ---------- */
const THEMES = {
  dark: {
    bg: 0x0a0b0f, fog: [9, 34], wall: 0x1a1d24, floor: 0x9aa0ad, ceil: 0x0d0e12, strip: 0xdfe7ff, led: 0x4c84f0, frame: 0x14171e,
    mat: 0xf2efe9, pedestal: 0x1d2029, hemi: [0xaebfe8, 0x14161c, 0.75], lamp: [0xd6e0ff, 26], pool: 0.42, glow: 0.55, dust: [0x7cc4f8, 0.5],
    ink: "#EEF0F4", ink2: "#B9C2D0", mute: "#8C95A5", accent: "#7CC4F8", solid: "#4C84F0", card: "rgba(19,22,30,0.96)", line: "rgba(255,255,255,0.13)", floorInk: "rgba(124,196,248,0.5)",
  },
  light: {
    bg: 0xeeebe4, fog: [14, 50], wall: 0xf4f1eb, floor: 0xe3dccf, ceil: 0xfbfaf6, strip: 0xffffff, led: 0x2f63e0, frame: 0x1b1e25,
    mat: 0xffffff, pedestal: 0xffffff, hemi: [0xffffff, 0xcdc4b3, 1.35], lamp: [0xfff3df, 13], pool: 0.16, glow: 0.22, dust: [0x2f63e0, 0.22],
    ink: "#0E1116", ink2: "#3A4150", mute: "#6A7282", accent: "#2458D8", solid: "#2F63E0", card: "rgba(255,255,255,0.97)", line: "rgba(14,17,22,0.12)", floorInk: "rgba(36,88,216,0.42)",
  },
};
let T = THEMES[root.dataset.theme === "light" ? "light" : "dark"];

/* ---------- content ---------- */
const WORLDS = [
  { t: "Art", d: "Graphite and charcoal drawings about power, war, love and the struggle for meaning. 19 works across two collections on OpenSea.", go: 1 },
  { t: "Markets", d: "Trading forex majors, minors and crypto since 2019, with a focus on Bitcoin. I share views on Telegram and built my own signal bot.", go: 2 },
  { t: "AI products", d: "I build with AI tools like Claude and ChatGPT: prediction sites, trading bots, research tools and games. Eight live so far.", go: 2 },
  { t: "Operations & Sales", d: "Inventory and general manager at Showboy Motors: parts, vehicle movements, sales records, profit margins and a team of eight.", go: 3 },
  { t: "Agribusiness", d: "Ran my own catfish farming business for three years on ten rented ponds at Samalad Farm: a 10-tonne annual target and the full cycle from stocking to sale.", go: 4 },
  { t: "Content & community", d: "I post my thoughts on crypto, finance, trading and prediction markets, and create content on crypto projects. Limitless ambassador since January 2026.", go: 5 },
];
const STATS = [["2016", "drawing seriously since"], ["2019", "trading markets since"], ["10", "fish ponds run"], ["8", "team members managed"], ["19", "artworks on OpenSea"], ["8", "live products built with AI"]];
const PRODUCTS = [
  { key: "picks", img: "assets/shots/d-picks.webp", kicker: "AI · Sports predictions", title: "cmvng Picks", url: "https://cmvngpicks.com", host: "cmvngpicks.com",
    d: "An AI-powered football prediction platform. The engine reads every fixture, ranks games by win probability on a daily board, builds accumulator slips from 2 odds up to 100, and turns each one into a one-tap booking code. Every pick is graded in public, won or lost." },
  { key: "signals", img: "assets/shots/d-signals.webp", kicker: "Trading · Automation", title: "cmvng Signals", url: "https://cmvngsignals.com", host: "cmvngsignals.com",
    d: "An automated signal bot for forex and crypto. It scans a curated set of pairs across timeframes, generates signals with a defined entry, stop-loss and take-profit, then executes and tracks every one. Running in paper-trading mode with a live dashboard." },
  { key: "alphascanner", img: "assets/shots/d-alphascanner.webp", kicker: "Crypto research · AI", title: "CMV AlphaScanner", url: "https://cmv-alphascanner.vercel.app/", host: "cmv-alphascanner.vercel.app",
    d: "Paste any crypto project's X handle and get AI red-flag detection across 17 metrics, an alpha score and a shareable verdict card." },
  { key: "macro", img: "assets/shots/d-macro.webp", kicker: "Markets · Macro", title: "MacroSentinel", url: "https://macro-sentinel-lac.vercel.app/", host: "macro-sentinel-lac.vercel.app",
    d: "A fundamental sentiment dashboard: a daily macro pulse, a risk-on/risk-off gauge, and signals across currencies, commodities and digital assets, with a live news feed." },
  { key: "gallery", img: "assets/shots/d-gallery.webp", kicker: "Art · Web", title: "CMVNG Art Gallery", url: "https://cmvng-art-gallery-production.up.railway.app", host: "cmvng-art-gallery · railway",
    d: "My online gallery: 21 drawings and digital works, including both OpenSea collections, a full-screen viewer, and a private studio page where I publish finished pieces and works in progress straight from my phone." },
  { key: "dca", img: "assets/shots/d-dca.webp", kicker: "Crypto · Tools", title: "DCA Simulator", url: "https://dca-simulator-one.vercel.app/", host: "dca-simulator-one.vercel.app",
    d: "See what dollar-cost averaging into any of the top 250 coins could return. Pick a coin, set the amount, frequency and goal, and get real numbers from CoinGecko data." },
  { key: "battlefield", img: "assets/shots/d-battlefield.webp", kicker: "3D game · Bitcoin", title: "Bitcoin Battlefield", url: "https://bitcoin-battlefield-production-e9bc.up.railway.app/", host: "bitcoin-battlefield · railway",
    d: "A 3D strategy game where the Bitcoin price fuels a 15-minute war. Pick your doctrine and special, then defend your castle. Simulation only, no real betting." },
  { key: "studio", img: "assets/shots/d-studio.webp", kicker: "Content · Design", title: "Banger Studio", url: "https://studio-production-b81c.up.railway.app/app", host: "banger-studio · railway",
    d: "A research-powered content studio that turns any project into finished social visuals, with 122 editable templates, live research and a writer that drafts in your voice." },
];
const JOBS = [
  { role: "Founder & AI Product Builder", org: "CMVNG · Independent", when: "2026 – Present", b: [
    "Explores and applies AI tools, including Claude and ChatGPT, to design, build and ship web products: eight live in about five months.",
    "Designed, built and launched cmvngpicks.com, an AI-powered football prediction platform with daily slips, one-tap booking codes and a public record of every pick.",
    "Built cmvngsignals.com, an automated forex and crypto signal bot with a live dashboard (currently paper trading).",
    "Launched the CMVNG Art Gallery with a mobile studio for publishing new work.",
    "Also built CMV AlphaScanner, MacroSentinel, a crypto DCA simulator, Bitcoin Battlefield and Banger Studio."] },
  { role: "Ambassador", org: "Limitless · Prediction market", when: "Jan 2026 – Present", link: ["Visit Limitless ↗", "https://limitless.exchange"], b: [
    "Represents Limitless, a prediction market for crypto, sports and world events.",
    "Creates and posts content about Limitless and prediction markets."] },
  { role: "Content Creator", org: "Crypto, finance & trading · X & Instagram", when: "Present", link: ["@i_am_vickyd on X ↗", "https://x.com/i_am_vickyd"], b: [
    "Posts thoughts on crypto, finance, trading and prediction markets on X (@i_am_vickyd) and Instagram (@cmv.ng).",
    "Creates content on crypto projects, alongside artwork and new products."] },
  { role: "Forex & Crypto Trader", org: "Independent", when: "2019 – Present", b: [
    "Trades forex majors and minors and cryptocurrencies, with a primary focus on Bitcoin.",
    "Shares market views and trade ideas with followers on Telegram.",
    "Turned a manual trading approach into software with an automated signal bot."] },
  { role: "Inventory Manager & General Manager", org: "Showboy Motors · Car dealership", when: "", b: [
    "Ran inventory control: recorded every car part received and tracked each vehicle moving out for inspection, repairs and painting.",
    "Kept the full sales record for every car sold, from import cost to sale price, with profit margins and losses.",
    "Managed day-to-day operations and a team of eight, including the secretary, repair manager, assistants and general staff.",
    "Closed vehicle sales and handled the buying and selling of cars."] },
  { role: "Catfish Farmer · Owner-Operator", org: "Samalad Farm · rented ponds", when: "3 years", b: [
    "Rented 10 ponds at Samalad Farm and ran an independent catfish farming business for three years, planned around a 10-tonne annual production target.",
    "Managed the full cycle: species and fingerling selection, stocking, feeding and feed conversion ratio (FCR), sorting and grading, and grow-out to large market sizes.",
    "Sold harvested catfish directly to buyers."] },
  { role: "Visual Artist", org: "Graphite, charcoal & digital", when: "2016 – Present", b: [
    "Self-taught; drawing since 2015 and practising seriously since 2016.",
    "Two NFT collections on OpenSea: the CMVNG Collection (17 works) and the World Over Series (2 works)."] },
  { role: "Outdoor Cooking & Barbecue", org: "Independent", when: "2018 – 2020", b: [
    "Ran outdoor charcoal barbecue cooking for two years, specialising in chicken and goat meat.",
    "Handled the full process, from seasoning and marinating the meat to grilling it over charcoal."] },
];
const ABOUT = [
  "I'm Victor Damilola Bukola-Ojumu, also known as CMVNG. I studied Civil Engineering at the Federal University Oye-Ekiti, and my path since has run through very different rooms: managing inventory, sales records and an eight-person team at Showboy Motors, renting ten ponds at Samalad Farm to run my own catfish business for three years, and trading forex and crypto since 2019.",
  "Drawing has been the constant. I've drawn seriously since 2016, mostly in graphite and charcoal. Lately I've been exploring AI tools like Claude and ChatGPT and using them to build my own prediction websites, trading bots and apps: eight live products in about five months. I also post my thoughts on crypto, finance and trading, and I've been an ambassador for the Limitless prediction market since January 2026.",
];
const CV = { pdf: A("cv/Victor-Bukola-Ojumu-CV.pdf"), docx: A("cv/Victor-Bukola-Ojumu-CV.docx"), web: A("cv/") };

/* ---------- renderer, scene, camera ---------- */
const canvas = $("#world");
let renderer, scene, camera, hemi;
const lamps = [];
const manager = new THREE.LoadingManager();
const loader = new THREE.TextureLoader(manager);
let maxAniso = 4;

function tex(src) {
  const t = loader.load(src);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = maxAniso;
  return t;
}

const M = {};
function makeMaterials() {
  M.wall = new THREE.MeshStandardMaterial({ roughness: 0.93, metalness: 0 });
  M.floor = new THREE.MeshStandardMaterial({ roughness: 0.38, metalness: 0.18, map: floorTexture() });
  M.ceil = new THREE.MeshStandardMaterial({ roughness: 1, metalness: 0 });
  M.strip = new THREE.MeshBasicMaterial();
  M.led = new THREE.MeshBasicMaterial();
  M.frame = new THREE.MeshStandardMaterial({ roughness: 0.45, metalness: 0.35 });
  M.mat = new THREE.MeshBasicMaterial();
  M.bezel = new THREE.MeshStandardMaterial({ color: 0x0b0d12, roughness: 0.3, metalness: 0.7 });
  M.pedestal = new THREE.MeshStandardMaterial({ roughness: 0.55, metalness: 0.1 });
  M.pool = new THREE.MeshBasicMaterial({ map: poolTexture(), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false });
  M.glow = new THREE.MeshBasicMaterial({ map: glowTexture(), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false });
  M.ledGlow = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.9 });
}

// polished concrete with 2 m seams, so walking has depth cues
function floorTexture() {
  const c = document.createElement("canvas"); c.width = c.height = 1024;
  const g = c.getContext("2d");
  g.fillStyle = "#e9e9e9"; g.fillRect(0, 0, 1024, 1024);
  const img = g.getImageData(0, 0, 1024, 1024), d = img.data;
  for (let i = 0; i < d.length; i += 4) { const n = 225 + Math.random() * 30; d[i] = d[i + 1] = d[i + 2] = n; }
  g.putImageData(img, 0, 0);
  for (let k = 0; k < 60; k++) {
    const x = Math.random() * 1024, y = Math.random() * 1024, r = 40 + Math.random() * 160;
    const gr = g.createRadialGradient(x, y, 0, x, y, r);
    gr.addColorStop(0, `rgba(${Math.random() < 0.5 ? "255,255,255" : "180,180,180"},0.12)`); gr.addColorStop(1, "rgba(0,0,0,0)");
    g.fillStyle = gr; g.fillRect(x - r, y - r, r * 2, r * 2);
  }
  g.strokeStyle = "rgba(90,90,90,0.55)"; g.lineWidth = 2;
  for (let p = 0; p <= 1024; p += 256) { g.beginPath(); g.moveTo(p, 0); g.lineTo(p, 1024); g.stroke(); g.beginPath(); g.moveTo(0, p); g.lineTo(1024, p); g.stroke(); }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set((HALF_W * 2) / 8, (FRONT_Z - BACK_Z) / 8);
  t.anisotropy = 8;
  return t;
}
// soft wash of light from a picture lamp above the frame
function poolTexture() {
  const c = document.createElement("canvas"); c.width = 256; c.height = 256;
  const g = c.getContext("2d");
  const gr = g.createRadialGradient(128, 40, 4, 128, 90, 150);
  gr.addColorStop(0, "rgba(255,255,255,0.95)"); gr.addColorStop(0.45, "rgba(255,255,255,0.35)"); gr.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = gr; g.fillRect(0, 0, 256, 256);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
function glowTexture() {
  const c = document.createElement("canvas"); c.width = c.height = 256;
  const g = c.getContext("2d");
  const gr = g.createRadialGradient(128, 128, 10, 128, 128, 128);
  gr.addColorStop(0, "rgba(255,255,255,0.9)"); gr.addColorStop(0.5, "rgba(255,255,255,0.25)"); gr.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = gr; g.fillRect(0, 0, 256, 256);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}

/* ---------- canvas text panels ---------- */
const F = { serif: '"Instrument Serif", Georgia, serif', sans: '"Inter Tight", system-ui, sans-serif' };
const panels = [];
function font(g, px, weight = 400, fam = F.sans, style = "") { g.font = `${style} ${weight} ${Math.round(px)}px ${fam}`; }
function rr(g, x, y, w, h, r) { g.beginPath(); if (g.roundRect) g.roundRect(x, y, w, h, r); else g.rect(x, y, w, h); }
function cardBg(g, W, H, r = W * 0.035) {
  rr(g, 3, 3, W - 6, H - 6, r); g.fillStyle = T.card; g.fill();
  g.lineWidth = Math.max(2, W * 0.003); g.strokeStyle = T.line; g.stroke();
}
function spaced(g, text, x, y, sp, align = "left") {
  const chars = [...text];
  const w = chars.reduce((s, ch) => s + g.measureText(ch).width + sp, -sp);
  let cx = align === "center" ? x - w / 2 : align === "right" ? x - w : x;
  const prev = g.textAlign; g.textAlign = "left";
  for (const ch of chars) { g.fillText(ch, cx, y); cx += g.measureText(ch).width + sp; }
  g.textAlign = prev;
  return w;
}
// word-wrap; returns the y after the last line. Stops (with an ellipsis) at maxY.
function wrap(g, text, x, y, maxW, lh, maxY = Infinity) {
  const words = text.split(" ");
  let line = "";
  for (let i = 0; i < words.length; i++) {
    const test = line ? line + " " + words[i] : words[i];
    if (g.measureText(test).width > maxW && line) {
      if (y + lh > maxY) { g.fillText(line.replace(/[,.;:]?$/, "…"), x, y); return y + lh; }
      g.fillText(line, x, y); y += lh; line = words[i];
    } else line = test;
  }
  if (line) { g.fillText(line, x, y); y += lh; }
  return y;
}
function panel(wm, hm, draw, { ppm = 300, transparent = true } = {}) {
  const W = Math.min(2048, Math.round(wm * ppm)), H = Math.min(2048, Math.round(hm * ppm));
  const c = document.createElement("canvas"); c.width = W; c.height = H;
  const g = c.getContext("2d");
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = maxAniso;
  const p = { g, t, W, H, draw };
  panels.push(p); paint(p);
  return new THREE.Mesh(new THREE.PlaneGeometry(wm, hm), new THREE.MeshBasicMaterial({ map: t, transparent, depthWrite: !transparent }));
}
function paint(p) { p.g.clearRect(0, 0, p.W, p.H); p.g.textBaseline = "alphabetic"; p.g.textAlign = "left"; p.draw(p.g, p.W, p.H); p.t.needsUpdate = true; }

/* ---------- interactive items ---------- */
const items = [], clickables = [], solids = [], obstacles = [];
function register(item, meshes) {
  item.room = roomAt(item.center.z);
  items.push(item);
  meshes.forEach(m => { m.userData.item = item; clickables.push(m); });
  if (item.obj) item.base = item.obj.position.clone();
  item.hl = 0;
  return item;
}

/* ---------- wall placement ---------- */
function pose(side, a, y, z0) {
  switch (side) {
    case "L": return { p: V3(-HALF_W, y, a), n: V3(1, 0, 0), ry: Math.PI / 2 };
    case "R": return { p: V3(HALF_W, y, a), n: V3(-1, 0, 0), ry: -Math.PI / 2 };
    case "P+": return { p: V3(a, y, z0 + 0.15), n: V3(0, 0, 1), ry: 0 };
    case "P-": return { p: V3(a, y, z0 - 0.15), n: V3(0, 0, -1), ry: Math.PI };
    case "F": return { p: V3(a, y, FRONT_Z), n: V3(0, 0, -1), ry: Math.PI };
    case "B": return { p: V3(a, y, BACK_Z), n: V3(0, 0, 1), ry: 0 };
  }
}
function place(obj, ps, off = 0.004) {
  obj.position.copy(ps.p).addScaledVector(ps.n, off);
  obj.rotation.y = ps.ry;
  scene.add(obj);
  return obj;
}
function box(w, h, d, mat, x, y, z, solid = false) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  m.position.set(x, y, z);
  scene.add(m);
  if (solid) solids.push(m);
  return m;
}

/* ---------- the building ---------- */
let floor, dust, cursorRing;
function buildShell() {
  const LEN = FRONT_Z - BACK_Z, MID = (FRONT_Z + BACK_Z) / 2;
  floor = new THREE.Mesh(new THREE.PlaneGeometry(HALF_W * 2, LEN), M.floor);
  floor.rotation.x = -Math.PI / 2; floor.position.set(0, 0, MID);
  scene.add(floor);
  const ceil = new THREE.Mesh(new THREE.PlaneGeometry(HALF_W * 2, LEN), M.ceil);
  ceil.rotation.x = Math.PI / 2; ceil.position.set(0, WALL_H, MID);
  scene.add(ceil);
  box(0.2, WALL_H, LEN, M.wall, -HALF_W - 0.1, WALL_H / 2, MID, true);
  box(0.2, WALL_H, LEN, M.wall, HALF_W + 0.1, WALL_H / 2, MID, true);
  box(HALF_W * 2 + 0.4, WALL_H, 0.2, M.wall, 0, WALL_H / 2, FRONT_Z + 0.1, true);
  box(HALF_W * 2 + 0.4, WALL_H, 0.2, M.wall, 0, WALL_H / 2, BACK_Z - 0.1, true);
  const side = HALF_W - DOOR;
  for (const z of PARTS) {
    box(side, WALL_H, 0.3, M.wall, -(DOOR + side / 2), WALL_H / 2, z, true);
    box(side, WALL_H, 0.3, M.wall, DOOR + side / 2, WALL_H / 2, z, true);
    box(DOOR * 2, WALL_H - LINTEL, 0.3, M.wall, 0, LINTEL + (WALL_H - LINTEL) / 2, z, true);
    // glowing door frame
    box(0.04, LINTEL, 0.32, M.led, -DOOR, LINTEL / 2, z);
    box(0.04, LINTEL, 0.32, M.led, DOOR, LINTEL / 2, z);
    box(DOOR * 2 + 0.04, 0.04, 0.32, M.led, 0, LINTEL, z);
  }
  // light strips in the ceiling and LED lines along the floor
  for (const x of [-3.4, 3.4]) box(0.16, 0.02, LEN - 0.4, M.strip, x, WALL_H - 0.012, MID);
  for (const r of ROOMS) box(HALF_W * 2 - 1, 0.02, 0.16, M.strip, 0, WALL_H - 0.012, r.z);
  for (const x of [-HALF_W + 0.02, HALF_W - 0.02]) box(0.02, 0.03, LEN, M.led, x, 0.05, MID);

  hemi = new THREE.HemisphereLight(0xffffff, 0x000000, 1);
  scene.add(hemi);
  for (const r of ROOMS) {
    const l = new THREE.PointLight(0xffffff, 20, 22, 1.6);
    l.position.set(0, WALL_H - 1.5, r.z);
    scene.add(l); lamps.push(l);
  }

  // dust drifting in the light
  const P = coarse ? 900 : 1600, pos = new Float32Array(P * 3);
  for (let i = 0; i < P; i++) {
    pos[i * 3] = (Math.random() - 0.5) * HALF_W * 2;
    pos[i * 3 + 1] = Math.random() * WALL_H;
    pos[i * 3 + 2] = BACK_Z + Math.random() * LEN;
  }
  const dg = new THREE.BufferGeometry();
  dg.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  dust = new THREE.Points(dg, new THREE.PointsMaterial({ size: 0.028, transparent: true, depthWrite: false }));
  scene.add(dust);

  // walk-to cursor on the floor
  cursorRing = new THREE.Mesh(new THREE.RingGeometry(0.22, 0.3, 48), new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.85, depthWrite: false }));
  cursorRing.rotation.x = -Math.PI / 2;
  cursorRing.visible = false;
  scene.add(cursorRing);

  // lintel signs and floor names for each room
  PARTS.forEach((z, i) => {
    const next = ROOMS[i + 1], num = String(i + 2).padStart(2, "0");
    const sign = panel(4.4, 0.9, (g, W, H) => {
      font(g, H * 0.2, 800); g.fillStyle = T.accent; g.textAlign = "center";
      spaced(g, num, W / 2, H * 0.36, H * 0.03, "center");
      font(g, H * 0.46, 400, F.serif); g.fillStyle = T.ink; g.textAlign = "center";
      g.fillText(next.name, W / 2, H * 0.84);
    }, { ppm: 220 });
    place(sign, pose("P+", 0, LINTEL + (WALL_H - LINTEL) / 2, z), 0.01);
  });
  ROOMS.forEach((r, i) => {
    const decal = panel(5.2, 0.8, (g, W, H) => {
      font(g, H * 0.34, 800); g.fillStyle = T.floorInk;
      spaced(g, `${String(i + 1).padStart(2, "0")} — ${r.name.toUpperCase()}`, W / 2, H * 0.66, H * 0.07, "center");
    }, { ppm: 200 });
    decal.rotation.x = -Math.PI / 2;
    decal.position.set(0, 0.006, r.z + 2.2);
    scene.add(decal);
  });
}

/* ---------- builders for objects ---------- */
function framed(texture, w, h, { border = 0.07, matW = 0.1, depth = 0.06, lamp = true } = {}) {
  const g = new THREE.Group();
  const fw = w + 2 * (matW + border), fh = h + 2 * (matW + border);
  const frame = new THREE.Mesh(new THREE.BoxGeometry(fw, fh, depth), M.frame);
  frame.position.z = depth / 2;
  const mat = new THREE.Mesh(new THREE.PlaneGeometry(w + 2 * matW, h + 2 * matW), M.mat);
  mat.position.z = depth + 0.001;
  const pic = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: texture }));
  pic.position.z = depth + 0.002;
  g.add(frame, mat, pic);
  if (lamp) {
    const arm = new THREE.Mesh(new THREE.BoxGeometry(Math.min(0.9, fw * 0.55), 0.035, 0.16), M.frame);
    arm.position.set(0, fh / 2 + 0.16, 0.12);
    const bulb = new THREE.Mesh(new THREE.BoxGeometry(Math.min(0.86, fw * 0.52), 0.008, 0.1), M.strip);
    bulb.position.set(0, fh / 2 + 0.14, 0.13);
    const wash = new THREE.Mesh(new THREE.PlaneGeometry(fw * 1.9, fh * 1.7 + 0.5), M.pool);
    wash.position.set(0, 0.2, 0.003);
    wash.renderOrder = -1;
    g.add(arm, bulb, wash);
  }
  return { g, hit: [frame, mat, pic], fw, fh };
}
function artSize(a, maxH, maxW) {
  let h = maxH, w = (h * a.w) / a.h;
  if (w > maxW) { w = maxW; h = (w * a.h) / a.w; }
  return [w, h];
}
function artInfo(a) {
  const os = /opensea\.io/.test(a.link || "");
  return {
    kicker: a.series, title: a.title, meta: "Victor Bukola-Ojumu · drawing",
    body: `<p>${a.series === "New Works" ? "A new drawing, published to the CMVNG Art Gallery." : `Part of the ${a.series}${os ? ", minted on OpenSea" : ""}.`}</p>`,
    actions: [{ label: os ? "View on OpenSea ↗" : "View in the gallery ↗", href: a.link || "https://cmvng-art-gallery-production.up.railway.app", primary: true }],
  };
}
function hangArt(a, ps, maxH = 1.3, maxW = 1.5) {
  const [w, h] = artSize(a, maxH, maxW);
  const { g, hit, fw, fh } = framed(tex(A(a.src)), w, h);
  place(g, ps);
  const label = panel(1.3, 0.26, (c, W, H) => {
    c.textAlign = "center";
    font(c, H * 0.34, 700); c.fillStyle = T.ink; c.fillText(a.title, W / 2, H * 0.42);
    font(c, H * 0.26, 500); c.fillStyle = T.mute; c.fillText(a.series, W / 2, H * 0.84);
  }, { ppm: 420 });
  place(label, { ...ps, p: ps.p.clone().setY(ps.p.y - fh / 2 - 0.26) }, 0.006);
  register({ id: "art:" + a.id, kind: "art", label: a.title, sub: a.series, center: ps.p.clone().addScaledVector(ps.n, 0.06), normal: ps.n.clone(), w: fw, h: fh, obj: g, info: artInfo(a) }, hit);
}

function plaque(wm, hm, { kicker = "", title = "", body = "", hint = "" } = {}, ppm = 320) {
  return panel(wm, hm, (g, W, H) => {
    cardBg(g, W, H);
    const u = W / 100, pad = 6 * u;
    let y = pad + 3.4 * u;
    if (kicker) { font(g, 3.1 * u, 800); g.fillStyle = T.accent; spaced(g, kicker.toUpperCase(), pad, y, 0.5 * u); y += 8.5 * u; }
    if (title) { font(g, 8.2 * u, 400, F.serif); g.fillStyle = T.ink; y = wrap(g, title, pad, y + 1.5 * u, W - 2 * pad, 8.4 * u); y += 1.2 * u; }
    if (body) { font(g, 3.7 * u, 500); g.fillStyle = T.ink2; y = wrap(g, body, pad, y + 1 * u, W - 2 * pad, 5.4 * u, H - (hint ? 12 : 5) * u); }
    if (hint) { font(g, 3.4 * u, 700); g.fillStyle = T.accent; g.fillText(hint, pad, H - pad); }
  }, { ppm });
}

/* ---------- 01 lobby ---------- */
let portrait;
function buildLobby() {
  const z = PARTS[0];
  const title = panel(4.3, 2.6, (g, W, H) => {
    const u = W / 100;
    font(g, 3.1 * u, 800); g.fillStyle = T.accent; spaced(g, "LAGOS, NIGERIA", 2 * u, 9 * u, 0.9 * u);
    font(g, 17 * u, 400, F.serif); g.fillStyle = T.ink; g.fillText("Victor", 1 * u, 28 * u);
    font(g, 17 * u, 400, F.serif, "italic"); g.fillStyle = T.accent; g.fillText("Bukola-Ojumu", 1 * u, 44 * u);
    font(g, 3.5 * u, 600); g.fillStyle = T.ink2; g.fillText("Artist · Trader · AI Product Builder · Operations & Sales", 2 * u, 53 * u);
  }, { ppm: 240 });
  place(title, pose("P+", -(DOOR + (HALF_W - DOOR) / 2), 2.35, z), 0.01);
  const hello = panel(4.3, 2.6, (g, W, H) => {
    const u = W / 100;
    font(g, 11 * u, 400, F.serif); g.fillStyle = T.ink; g.fillText("Welcome in.", 2 * u, 16 * u);
    font(g, 3.9 * u, 500); g.fillStyle = T.ink2;
    let y = wrap(g, "This is my portfolio as a place you can walk through: my art, the products I've built with AI, my journey, life beyond the screen, and my CV.", 2 * u, 26 * u, 94 * u, 5.8 * u);
    font(g, 3.9 * u, 700); g.fillStyle = T.accent; g.fillText("Walk through the door to begin  →", 2 * u, y + 5 * u);
  }, { ppm: 240 });
  place(hello, pose("P+", DOOR + (HALF_W - DOOR) / 2, 2.35, z), 0.01);

  // the entrance wall behind you
  const mark = panel(8, 2.4, (g, W, H) => {
    const u = W / 100; g.textAlign = "center";
    font(g, 14 * u, 400, F.serif); g.fillStyle = T.ink; spaced(g, "CMVNG", W / 2, 17 * u, 1.2 * u, "center");
    font(g, 1.9 * u, 700); g.fillStyle = T.mute; spaced(g, "THE PORTFOLIO OF VICTOR DAMILOLA BUKOLA-OJUMU", W / 2, 25 * u, 0.5 * u, "center");
  }, { ppm: 180 });
  place(mark, pose("F", 0, 3.05, 0), 0.01);
  const exitP = panel(2.6, 0.5, (g, W, H) => {
    rr(g, 3, 3, W - 6, H - 6, H / 2); g.fillStyle = T.solid; g.fill();
    font(g, H * 0.36, 700); g.fillStyle = "#fff"; g.textAlign = "center"; g.fillText("← Back to the classic site", W / 2, H * 0.63);
  }, { ppm: 300 });
  const exitPose = pose("F", 0, 1.2, 0);
  place(exitP, exitPose, 0.01);
  register({ id: "exit", kind: "link", label: "Back to the classic site", href: A(""), self: true, center: exitPose.p.clone(), normal: exitPose.n.clone(), w: 2.6, h: 0.5, obj: exitP }, [exitP]);

  // what I do: six plaques on the left wall
  WORLDS.forEach((w, i) => {
    const col = i % 3, row = Math.floor(i / 3);
    const ps = pose("L", 3 - col * 3, row === 0 ? 2.95 : 1.3, 0);
    const m = plaque(2.45, 1.45, { kicker: String(i + 1).padStart(2, "0") + " · What I do", title: w.t, body: w.d, hint: "Tap to explore →" });
    place(m, ps, 0.01);
    register({ id: "world:" + i, kind: "world", label: w.t, sub: "What I do", center: ps.p.clone(), normal: ps.n.clone(), w: 2.45, h: 1.45, obj: m,
      info: { kicker: "What I do", title: w.t, body: `<p>${w.d}</p>`, actions: [{ label: `Go to ${ROOMS[w.go].name} →`, room: w.go, primary: true }] } }, [m]);
  });
  // numbers on the right wall
  STATS.forEach(([n, l], i) => {
    const col = i % 3, row = Math.floor(i / 3);
    const m = panel(2.3, 1.3, (g, W, H) => {
      cardBg(g, W, H); const u = W / 100;
      font(g, 24 * u, 400, F.serif); g.fillStyle = T.accent; g.fillText(n, 7 * u, 31 * u);
      font(g, 5 * u, 600); g.fillStyle = T.ink2; g.fillText(l, 7 * u, 46 * u);
    }, { ppm: 300 });
    place(m, pose("R", 3 - col * 3, row === 0 ? 2.95 : 1.4, 0), 0.01);
  });

  // centrepiece: a portrait turning on a plinth
  const px = 0, pz = -2;
  const ped = new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.7, 1.0, 64), M.pedestal);
  ped.position.set(px, 0.5, pz); scene.add(ped);
  const halo = new THREE.Mesh(new THREE.RingGeometry(0.95, 1.0, 96), M.ledGlow);
  halo.rotation.x = -Math.PI / 2; halo.position.set(px, 0.01, pz); scene.add(halo);
  const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 1.3, WALL_H - 1, 48, 1, true), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.035, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
  beam.position.set(px, 1 + (WALL_H - 1) / 2, pz); scene.add(beam);
  portrait = new THREE.Group();
  const edge = new THREE.Mesh(new THREE.BoxGeometry(1.2, 1.48, 0.05), M.frame);
  const front = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 1.375), new THREE.MeshBasicMaterial({ map: tex(A("assets/portrait.webp")) }));
  front.position.z = 0.026;
  const back = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 1.375), new THREE.MeshBasicMaterial({ map: tex(A("assets/portrait-car.webp")) }));
  back.position.z = -0.026; back.rotation.y = Math.PI;
  portrait.add(edge, front, back);
  portrait.position.set(px, 2.0, pz);
  scene.add(portrait);
  obstacles.push({ x: px, z: pz, r: 1.05 });
  register({ id: "about", kind: "about", label: "About Victor", sub: "Tap to read", center: portrait.position.clone(), normal: V3(0, 0, 1), dynamic: true, w: 1.3, h: 2.3,
    info: { kicker: "About me", title: "Victor Damilola Bukola-Ojumu", meta: "Lagos, Nigeria · also known as CMVNG", body: ABOUT.map(p => `<p>${p}</p>`).join(""),
      actions: [{ label: "Download CV", href: CV.pdf, download: true, primary: true }, { label: "Next: Art →", room: 1 }] } }, [edge, front, back]);
}

/* ---------- 02 art ---------- */
function buildArt(art) {
  const by = Object.fromEntries(art.map(a => [a.id, a]));
  const pick = ids => ids.map(id => by[id]).filter(Boolean);
  const zs = [-8.6, -10.8, -13.0, -15.2, -17.4, -19.6];
  pick(["police-brutality-1", "the-naira", "breath-in-the-dark", "quincy", "desolation-1", "soulical-realm-i"]).forEach((a, i) => hangArt(a, pose("L", zs[i], 1.85)));
  pick(["the-faced-man", "memories", "usd1-gbp1", "pirates-2", "mindless", "alpamale-1"]).forEach((a, i) => hangArt(a, pose("R", zs[i], 1.85)));
  const xs = [-5.75, -3.65, 3.65, 5.75];
  pick(["untitled-2022", "why", "spongbob-pirates", "desolation-2"]).forEach((a, i) => hangArt(a, pose("P+", xs[i], 1.9, PARTS[1]), 1.3, 1.35));
  pick(["sponge-pirates-1", "broken", "the-bored-man", "insomia-iv"]).forEach((a, i) => hangArt(a, pose("P-", xs[i], 1.9, PARTS[0]), 1.3, 1.35));

  // the newest drawing on an easel
  const e = by["eye-study"];
  if (e) {
    const g = new THREE.Group();
    const leg = (x, rz, rx, zz) => { const m = new THREE.Mesh(new THREE.BoxGeometry(0.05, 2.45, 0.05), M.frame); m.position.set(x, 1.2, zz); m.rotation.set(rx, 0, rz); g.add(m); };
    leg(-0.5, -0.1, -0.08, 0); leg(0.5, 0.1, -0.08, 0); leg(0, 0, 0.36, -0.42);
    const ledge = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.05, 0.14), M.frame);
    ledge.position.set(0, 0.95, 0.06); g.add(ledge);
    const [w, h] = artSize(e, 0.95, 1.25);
    const f = framed(tex(A(e.src)), w, h, { border: 0.04, matW: 0.06, depth: 0.04, lamp: false });
    f.g.position.set(0, 0.98 + f.fh / 2, 0.02); f.g.rotation.x = -0.08;
    g.add(f.g);
    g.position.set(2.9, 0, -14.6); g.rotation.y = -0.5;
    scene.add(g);
    g.updateMatrixWorld(true);
    obstacles.push({ x: 2.9, z: -14.6, r: 0.95 });
    const c = f.g.getWorldPosition(V3());
    register({ id: "art:eye-study", kind: "art", label: e.title, sub: "Newest drawing", center: c, normal: V3(Math.sin(-0.5), 0, Math.cos(-0.5)), w: f.fw, h: f.fh, info: artInfo(e) }, f.hit);
  }
}

/* ---------- 03 builds ---------- */
let holo;
const life = { embers: null, smoke: [], fish: [], ripples: [] };
function buildBuilds() {
  const zs = [-23.2, -26.4, -29.6, -32.8];
  PRODUCTS.forEach((p, i) => {
    const side = i < 4 ? "L" : "R", ps = pose(side, zs[i % 4], 2.15);
    const w = 2.3, h = w * 0.625;
    const g = new THREE.Group();
    const bez = new THREE.Mesh(new THREE.BoxGeometry(w + 0.1, h + 0.1, 0.07), M.bezel);
    bez.position.z = 0.1;
    const scr = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: tex(A(p.img)) }));
    scr.position.z = 0.136;
    const mount = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.3, 0.07), M.frame);
    mount.position.z = 0.035;
    const glow = new THREE.Mesh(new THREE.PlaneGeometry(w * 1.7, h * 2), M.glow);
    glow.position.z = 0.004; glow.renderOrder = -1;
    g.add(mount, bez, scr, glow);
    place(g, ps);
    const label = panel(2.3, 0.72, (c, W, H) => {
      cardBg(c, W, H, H * 0.14); const u = W / 100;
      font(c, 2.6 * u, 800); c.fillStyle = T.accent; spaced(c, p.kicker.toUpperCase(), 4 * u, 7.4 * u, 0.3 * u);
      font(c, 6.2 * u, 400, F.serif); c.fillStyle = T.ink; c.fillText(p.title, 4 * u, 16 * u);
      font(c, 2.9 * u, 700); c.fillStyle = T.accent; c.textAlign = "right"; c.fillText("Open ↗", 96 * u, 16 * u); c.textAlign = "left";
      font(c, 2.75 * u, 500); c.fillStyle = T.ink2; wrap(c, p.d, 4 * u, 21.8 * u, 92 * u, 4 * u, 27 * u);
    }, { ppm: 380 });
    place(label, { ...ps, p: ps.p.clone().setY(0.95) }, 0.01);
    register({ id: "prod:" + p.key, kind: "product", label: p.title, sub: p.host, center: ps.p.clone().addScaledVector(ps.n, 0.14).setY(1.62), normal: ps.n.clone(), w: w + 0.2, h: 2.75, obj: g,
      info: { kicker: p.kicker, title: p.title, meta: p.host, body: `<p>${p.d}</p>`, actions: [{ label: "Open the app ↗", href: p.url, primary: true }] } }, [bez, scr, label]);
  });

  // hologram: built with AI
  holo = new THREE.Group();
  const ico = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.IcosahedronGeometry(0.55, 1)), new THREE.LineBasicMaterial({ transparent: true, opacity: 0.9 }));
  const core = new THREE.Mesh(new THREE.IcosahedronGeometry(0.2, 2), M.led);
  const halo = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 2.6), M.glow);
  holo.add(ico, core, halo);
  for (let i = 0; i < 3; i++) {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.85 + i * 0.12, 0.01, 8, 120), M.led);
    ring.rotation.set(Math.PI / 2 + i * 0.5, i * 0.8, 0);
    holo.add(ring);
  }
  const hit = new THREE.Mesh(new THREE.SphereGeometry(1.0, 16, 12), new THREE.MeshBasicMaterial({ visible: false }));
  holo.add(hit);
  holo.position.set(0, 2.25, -28.8);
  scene.add(holo);
  obstacles.push({ x: 0, z: -28.8, r: 1.25 });
  const pad = new THREE.Mesh(new THREE.RingGeometry(1.0, 1.06, 96), M.ledGlow);
  pad.rotation.x = -Math.PI / 2; pad.position.set(0, 0.01, -28.8); scene.add(pad);
  const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 1.05, WALL_H, 48, 1, true), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.03, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
  beam.position.set(0, WALL_H / 2, -28.8); scene.add(beam);
  register({ id: "holo", kind: "ai", label: "Built with AI", sub: "Claude & ChatGPT", center: holo.position.clone(), normal: V3(0, 0, 1), dynamic: true, w: 2.2, h: 2.2,
    info: { kicker: "How I build", title: "Built with AI", meta: "Claude · ChatGPT", body: "<p>Everything in this room was designed, built and shipped with AI tools like Claude and ChatGPT: eight live products in about five months.</p><p>Right now I'm focused on prediction websites and trading bots, and on using AI to work faster and better.</p>",
      actions: [{ label: "Next: Journey →", room: 3, primary: true }] } }, [hit]);

  const t1 = panel(4.3, 2.4, (g, W, H) => {
    const u = W / 100;
    font(g, 3.1 * u, 800); g.fillStyle = T.accent; spaced(g, "THINGS I'VE BUILT WITH AI", 2 * u, 9 * u, 0.7 * u);
    font(g, 14 * u, 400, F.serif); g.fillStyle = T.ink; g.fillText("Live products,", 1 * u, 26 * u);
    font(g, 14 * u, 400, F.serif, "italic"); g.fillStyle = T.accent; g.fillText("real users.", 1 * u, 40 * u);
    font(g, 3.7 * u, 500); g.fillStyle = T.ink2; wrap(g, "Eight live products in about five months, built with Claude and ChatGPT.", 2 * u, 49 * u, 94 * u, 5.4 * u);
  }, { ppm: 240 });
  place(t1, pose("P+", -(DOOR + (HALF_W - DOOR) / 2), 2.3, PARTS[2]), 0.01);
  const t2 = panel(4.3, 2.4, (g, W, H) => {
    const u = W / 100;
    font(g, 3.1 * u, 800); g.fillStyle = T.accent; spaced(g, "WHAT I'M BUILDING NOW", 2 * u, 9 * u, 0.7 * u);
    font(g, 4.2 * u, 500); g.fillStyle = T.ink2;
    let y = wrap(g, "Prediction websites and trading bots, with AI tools doing more of the heavy lifting every week.", 2 * u, 19 * u, 94 * u, 6.2 * u);
    font(g, 4.2 * u, 700); g.fillStyle = T.accent; g.fillText("Tap any screen to open the app  ↗", 2 * u, y + 5 * u);
  }, { ppm: 240 });
  place(t2, pose("P+", DOOR + (HALF_W - DOOR) / 2, 2.3, PARTS[2]), 0.01);
}

/* ---------- 04 journey ---------- */
function buildJourney() {
  const zs = [-38.4, -41.2, -44.0, -46.8];
  // glowing timeline down the middle of the floor
  const line = new THREE.Mesh(new THREE.PlaneGeometry(0.05, 12.4), M.ledGlow);
  line.rotation.x = -Math.PI / 2; line.position.set(0, 0.004, -42); scene.add(line);
  JOBS.forEach((j, i) => {
    const left = i % 2 === 0, z = zs[Math.floor(i / 2)], x = left ? -4.2 : 4.2, ry = left ? 0.58 : -0.58;
    const g = new THREE.Group();
    const card = panel(2.3, 1.55, (c, W, H) => {
      cardBg(c, W, H); const u = W / 100, pad = 5.5 * u;
      font(c, 3.3 * u, 800); c.fillStyle = T.accent; c.fillText(j.when || "Car dealership", pad, 9 * u);
      font(c, 7 * u, 400, F.serif); c.fillStyle = T.ink; let y = wrap(c, j.role, pad, 18.5 * u, W - 2 * pad, 7.2 * u);
      font(c, 3.3 * u, 600); c.fillStyle = T.mute; c.fillText(j.org, pad, y + 0.4 * u); y += 7 * u;
      font(c, 3.15 * u, 500); c.fillStyle = T.ink2;
      for (const b of j.b) {
        if (y > H - 12 * u) break;
        c.fillStyle = T.accent; c.fillText("•", pad, y); c.fillStyle = T.ink2;
        y = wrap(c, b, pad + 3 * u, y, W - 2 * pad - 3 * u, 4.5 * u, H - 9 * u) + 1.2 * u;
      }
      font(c, 3 * u, 700); c.fillStyle = T.accent; c.fillText("Tap for details", pad, H - 4.5 * u);
    }, { ppm: 340 });
    card.position.set(0, 1.62, 0.03);
    const plate = new THREE.Mesh(new THREE.BoxGeometry(2.38, 1.63, 0.05), M.frame);
    plate.position.set(0, 1.62, 0);
    const legL = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.85, 0.05), M.frame); legL.position.set(-0.8, 0.42, 0);
    const legR = legL.clone(); legR.position.x = 0.8;
    const foot = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.04, 0.42), M.frame); foot.position.set(0, 0.02, 0);
    g.add(plate, card, legL, legR, foot);
    g.position.set(x, 0, z); g.rotation.y = ry;
    scene.add(g);
    obstacles.push({ x, z, r: 1.1 });
    // marker on the timeline
    const dot = new THREE.Mesh(new THREE.CircleGeometry(0.12, 32), M.led);
    dot.rotation.x = -Math.PI / 2; dot.position.set(0, 0.006, z + (left ? 0.5 : -0.5)); scene.add(dot);
    const n = V3(Math.sin(ry), 0, Math.cos(ry));
    register({ id: "exp:" + i, kind: "job", label: j.role, sub: j.when || j.org, center: V3(x, 1.62, z).addScaledVector(n, 0.03), normal: n, w: 2.4, h: 1.7, obj: g,
      info: { kicker: j.when || "Experience", title: j.role, meta: j.org, body: `<ul>${j.b.map(b => `<li>${b}</li>`).join("")}</ul>`,
        actions: j.link ? [{ label: j.link[0], href: j.link[1], primary: true }] : [] } }, [card, plate]);
  });
  const t = panel(4.3, 2.4, (g, W, H) => {
    const u = W / 100;
    font(g, 3.1 * u, 800); g.fillStyle = T.accent; spaced(g, "EXPERIENCE", 2 * u, 9 * u, 0.8 * u);
    font(g, 14 * u, 400, F.serif); g.fillStyle = T.ink; g.fillText("Where I've", 1 * u, 26 * u);
    font(g, 14 * u, 400, F.serif, "italic"); g.fillStyle = T.accent; g.fillText("worked.", 1 * u, 40 * u);
    font(g, 3.7 * u, 500); g.fillStyle = T.ink2; wrap(g, "From dealership floors, fish ponds and charcoal grills to charts and AI-built products.", 2 * u, 49 * u, 94 * u, 5.4 * u);
  }, { ppm: 240 });
  place(t, pose("P+", -(DOOR + (HALF_W - DOOR) / 2), 2.3, PARTS[3]), 0.01);
  const e = plaque(3.4, 1.7, { kicker: "Education", title: "B.Eng. Civil Engineering", body: "Federal University Oye-Ekiti (FUOYE), Ekiti State, Nigeria. An engineering foundation in structure, measurement and problem-solving, carried into business, markets and software." }, 260);
  const eps = pose("P+", DOOR + (HALF_W - DOOR) / 2, 2.2, PARTS[3]);
  place(e, eps, 0.01);
  register({ id: "edu", kind: "plaque", label: "Education", sub: "B.Eng. Civil Engineering", center: eps.p.clone(), normal: eps.n.clone(), w: 3.4, h: 1.7, obj: e,
    info: { kicker: "Education", title: "B.Eng. Civil Engineering", meta: "Federal University Oye-Ekiti (FUOYE)", body: "<p>An engineering foundation in structure, measurement and problem-solving, carried into business, markets and software.</p>" } }, [e]);
}

/* ---------- 05 life ---------- */
function buildLife() {
  const grill = [["grill-prep", "Seasoned goat meat, ready for the grill"], ["grill-1", "Goat meat and chicken over charcoal"], ["grill-3", "Grilled steaks, chicken and bread"], ["grill-2", "Chicken, goat meat and bread on the grill"]];
  const grillInfo = { kicker: "2018 – 2020", title: "Outdoor cooking", meta: "Charcoal barbecue · chicken & goat meat", body: "<p>For two years I ran outdoor charcoal barbecue cooking, specialising in chicken and goat meat. I handled the full process, from seasoning and marinating the meat to grilling it over charcoal.</p>" };
  grill.forEach(([id, alt], i) => {
    const ps = pose("L", -51.3 - i * 2.05, 1.9);
    const { g, hit, fw, fh } = framed(tex(A(`assets/grill/${id}.webp`)), 1.08, 1.35, { matW: 0.06 });
    place(g, ps);
    register({ id: "grill:" + i, kind: "photo", label: alt, sub: "Outdoor cooking", center: ps.p.clone().addScaledVector(ps.n, 0.06), normal: ps.n.clone(), w: fw, h: fh, obj: g, info: { ...grillInfo, meta: alt } }, hit);
  });
  // a charcoal grill, still going
  const metal = new THREE.MeshStandardMaterial({ color: 0x17181c, roughness: 0.35, metalness: 0.85, side: THREE.DoubleSide });
  const bbq = new THREE.Group();
  const bowl = new THREE.Mesh(new THREE.SphereGeometry(0.46, 40, 16, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), metal);
  bowl.position.y = 0.9;
  const rim = new THREE.Mesh(new THREE.TorusGeometry(0.46, 0.018, 8, 64), metal);
  rim.rotation.x = Math.PI / 2; rim.position.y = 0.9;
  bbq.add(bowl, rim);
  for (let i = -3; i <= 3; i++) {
    const bar = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.012, 0.86 * Math.sqrt(1 - (i / 3.6) ** 2)), metal);
    bar.position.set(i * 0.12, 0.88, 0); bbq.add(bar);
  }
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2;
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.82), metal);
    leg.position.set(Math.cos(a) * 0.3, 0.41, Math.sin(a) * 0.3);
    leg.rotation.set(Math.sin(a) * 0.25, 0, -Math.cos(a) * 0.25);
    bbq.add(leg);
  }
  const emberMat = new THREE.MeshBasicMaterial({ color: 0xff6a1a });
  life.embers = emberMat;
  for (let i = 0; i < 26; i++) {
    const r = Math.random() * 0.3, a = Math.random() * Math.PI * 2;
    const coal = new THREE.Mesh(new THREE.IcosahedronGeometry(0.025 + Math.random() * 0.02, 0), i % 3 ? emberMat : metal);
    coal.position.set(Math.cos(a) * r, 0.62 + Math.random() * 0.06 + (0.3 - r) * 0.25, Math.sin(a) * r);
    bbq.add(coal);
  }
  const meatMat = new THREE.MeshStandardMaterial({ color: 0x7a3d1c, roughness: 0.55 });
  [[-0.2, 0.05], [0.02, -0.12], [0.2, 0.08], [-0.02, 0.2]].forEach(([x, z], i) => {
    const m = new THREE.Mesh(new THREE.CapsuleGeometry(0.05, 0.16, 4, 10), meatMat);
    m.rotation.set(Math.PI / 2, 0, i * 0.7); m.position.set(x, 0.925, z); bbq.add(m);
  });
  const fire = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 1.4), new THREE.MeshBasicMaterial({ map: M.glow.map, color: 0xff7a2a, transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending, depthWrite: false }));
  fire.position.y = 0.95; bbq.add(fire); life.fire = fire;
  const smokeMat = new THREE.SpriteMaterial({ map: M.glow.map, color: 0x9aa0aa, transparent: true, opacity: 0.12, depthWrite: false });
  for (let i = 0; i < 12; i++) {
    const sp = new THREE.Sprite(smokeMat.clone());
    sp.userData.t = i / 12; bbq.add(sp); life.smoke.push(sp);
  }
  bbq.position.set(-2.9, 0, -55.4);
  scene.add(bbq);
  obstacles.push({ x: -2.9, z: -55.4, r: 0.8 });
  const grillHit = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.4, 1.1, 16), new THREE.MeshBasicMaterial({ visible: false }));
  grillHit.position.y = 0.55; bbq.add(grillHit);
  register({ id: "grill3d", kind: "plaque", label: "The grill", sub: "Outdoor cooking · 2018 – 2020", center: V3(-2.9, 1.0, -55.4), normal: V3(0, 0, 1), dynamic: true, w: 1.4, h: 1.4, info: grillInfo }, [grillHit, bowl]);

  // a catfish pond, for the three years at Samalad Farm
  const pond = new THREE.Group();
  const tank = new THREE.Mesh(new THREE.CylinderGeometry(1.25, 1.32, 0.48, 72, 1, true), M.pedestal);
  tank.position.y = 0.24;
  const lip = new THREE.Mesh(new THREE.RingGeometry(1.2, 1.36, 72), M.pedestal);
  lip.rotation.x = -Math.PI / 2; lip.position.y = 0.48;
  const water = new THREE.Mesh(new THREE.CircleGeometry(1.22, 72), new THREE.MeshStandardMaterial({ color: 0x1f5d73, roughness: 0.08, metalness: 0.4, transparent: true, opacity: 0.82 }));
  water.rotation.x = -Math.PI / 2; water.position.y = 0.4;
  const bed = new THREE.Mesh(new THREE.CircleGeometry(1.24, 48), new THREE.MeshStandardMaterial({ color: 0x0e2a33, roughness: 1 }));
  bed.rotation.x = -Math.PI / 2; bed.position.y = 0.02;
  pond.add(bed, tank, lip, water);
  life.water = water.material;
  const fishMat = new THREE.MeshStandardMaterial({ color: 0x3a3d42, roughness: 0.6 });
  for (let i = 0; i < 4; i++) {
    const f = new THREE.Group();
    const body = new THREE.Mesh(new THREE.SphereGeometry(1, 16, 10), fishMat);
    body.scale.set(0.06, 0.035, 0.22);
    const tail = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.12, 8), fishMat);
    tail.rotation.x = Math.PI / 2; tail.position.z = -0.25;
    f.add(body, tail);
    f.userData = { r: 0.45 + i * 0.16, s: (0.35 + i * 0.08) * (i % 2 ? -1 : 1), o: i * 1.7, y: 0.22 + i * 0.03 };
    pond.add(f); life.fish.push(f);
  }
  for (let i = 0; i < 2; i++) {
    const rp = new THREE.Mesh(new THREE.RingGeometry(0.2, 0.225, 48), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.3, depthWrite: false }));
    rp.rotation.x = -Math.PI / 2; rp.position.y = 0.405; rp.userData.t = i * 0.5;
    pond.add(rp); life.ripples.push(rp);
  }
  pond.position.set(2.9, 0, -57.6);
  scene.add(pond);
  obstacles.push({ x: 2.9, z: -57.6, r: 1.6 });
  register({ id: "pond", kind: "plaque", label: "Catfish pond", sub: "3 years · Samalad Farm", center: V3(2.9, 0.5, -57.6), normal: V3(0, 0, 1), dynamic: true, w: 2.8, h: 1.2,
    info: { kicker: "3 years · owner-operator", title: "Catfish farming", meta: "Samalad Farm · ten rented ponds", body: "<p>I rented ten ponds at Samalad Farm and ran my own catfish business for three years, planned around a 10-tonne annual target: fingerlings, stocking, feeding and FCR, sorting and grading, grow-out and direct sales.</p>" } }, [water, tank]);
  const gp = plaque(2.3, 1.6, { kicker: "2018 – 2020", title: "Outdoor cooking", body: "Two years of charcoal barbecue: chicken and goat meat, from seasoning and marinating to the grill." }, 300);
  const gps = pose("L", -60.0, 1.9);
  place(gp, gps, 0.01);
  register({ id: "grill", kind: "plaque", label: "Outdoor cooking", sub: "2018 – 2020", center: gps.p.clone(), normal: gps.n.clone(), w: 2.3, h: 1.6, obj: gp, info: grillInfo }, [gp]);

  const car = framed(tex(A("assets/portrait-car.webp")), 1.12, 1.4, { matW: 0.06 });
  const cps = pose("R", -51.6, 1.9);
  place(car.g, cps);
  register({ id: "car", kind: "photo", label: "Victor", sub: "Lagos, Nigeria", center: cps.p.clone().addScaledVector(cps.n, 0.06), normal: cps.n.clone(), w: car.fw, h: car.fh, obj: car.g,
    info: { kicker: "About me", title: "Victor Damilola Bukola-Ojumu", meta: "Lagos, Nigeria", body: `<p>${ABOUT[0]}</p>` } }, car.hit);
  const R = [
    { id: "farm", z: -54.4, k: "3 years · owner-operator", t: "Catfish farming", b: "Rented ten ponds at Samalad Farm and ran my own catfish business for three years: fingerlings, stocking, feeding and FCR, sorting and grading, grow-out and direct sales." },
    { id: "skills", z: -57.2, k: "Skills", t: "What I bring", b: "Stock control, record-keeping, profit and loss tracking, team supervision, closing deals, catfish production, charcoal grilling, forex and crypto, prediction markets, Claude and ChatGPT, graphite and charcoal drawing." },
    { id: "interests", z: -60.0, k: "Interests", t: "Off the clock", b: "Fine art, financial markets, Bitcoin, prediction markets, AI and automation, agribusiness, cars and content." },
  ];
  R.forEach(r => {
    const m = plaque(2.3, 1.6, { kicker: r.k, title: r.t, body: r.b }, 300);
    const ps = pose("R", r.z, 1.9);
    place(m, ps, 0.01);
    register({ id: r.id, kind: "plaque", label: r.t, sub: r.k, center: ps.p.clone(), normal: ps.n.clone(), w: 2.3, h: 1.6, obj: m, info: { kicker: r.k, title: r.t, body: `<p>${r.b}</p>` } }, [m]);
  });
  const t = panel(4.3, 2.4, (g, W, H) => {
    const u = W / 100;
    font(g, 3.1 * u, 800); g.fillStyle = T.accent; spaced(g, "LIFE", 2 * u, 9 * u, 0.8 * u);
    font(g, 14 * u, 400, F.serif); g.fillStyle = T.ink; g.fillText("Beyond the", 1 * u, 26 * u);
    font(g, 14 * u, 400, F.serif, "italic"); g.fillStyle = T.accent; g.fillText("screen.", 1 * u, 40 * u);
    font(g, 3.7 * u, 500); g.fillStyle = T.ink2; wrap(g, "Charcoal grills, fish ponds and the things that shaped how I work.", 2 * u, 49 * u, 94 * u, 5.4 * u);
  }, { ppm: 240 });
  place(t, pose("P+", -(DOOR + (HALF_W - DOOR) / 2), 2.3, PARTS[4]), 0.01);
  const t2 = panel(4.3, 2.4, (g, W, H) => {
    const u = W / 100;
    font(g, 3.1 * u, 800); g.fillStyle = T.accent; spaced(g, "LAST ROOM", 2 * u, 9 * u, 0.8 * u);
    font(g, 4.2 * u, 500); g.fillStyle = T.ink2;
    const y = wrap(g, "My CV and how to reach me are through this door.", 2 * u, 19 * u, 94 * u, 6.2 * u);
    font(g, 4.2 * u, 700); g.fillStyle = T.accent; g.fillText("CV & Contact  →", 2 * u, y + 5 * u);
  }, { ppm: 240 });
  place(t2, pose("P+", DOOR + (HALF_W - DOOR) / 2, 2.3, PARTS[4]), 0.01);
}

/* ---------- 06 CV & contact ---------- */
function buildCV() {
  const ps = pose("B", 0, 2.35);
  const { g, hit, fw, fh } = framed(tex(A("assets/cv-preview.webp")), 2.3, 2.3 * (1274 / 900), { border: 0.05, matW: 0.0, depth: 0.05 });
  place(g, ps);
  register({ id: "cv", kind: "cv", label: "My CV", sub: "Two pages · PDF & Word", center: ps.p.clone().addScaledVector(ps.n, 0.05), normal: ps.n.clone(), w: fw, h: fh, obj: g,
    info: { kicker: "Curriculum vitae", title: "Everything here, on two pages.", body: "<p>Download the designed PDF, grab the Word version to edit, or read it online.</p>",
      actions: [{ label: "Download PDF", href: CV.pdf, download: true, primary: true }, { label: "Word (.docx)", href: CV.docx, download: true }, { label: "View online", href: CV.web, self: true }] } }, hit);

  const t = panel(3.9, 2.2, (c, W, H) => {
    const u = W / 100;
    font(c, 3.2 * u, 800); c.fillStyle = T.accent; spaced(c, "CONTACT", 2 * u, 10 * u, 0.8 * u);
    font(c, 15 * u, 400, F.serif); c.fillStyle = T.ink; c.fillText("Let's build", 1 * u, 28 * u);
    font(c, 15 * u, 400, F.serif, "italic"); c.fillStyle = T.accent; c.fillText("something.", 1 * u, 43 * u);
    font(c, 3.8 * u, 500); c.fillStyle = T.ink2; wrap(c, "For art commissions, collaborations, sales and operations roles, or anything markets and product.", 2 * u, 51 * u, 94 * u, 5.4 * u);
  }, { ppm: 240 });
  place(t, pose("B", -4.55, 2.9), 0.01);

  const pills = [
    { label: "Download CV (PDF)", href: CV.pdf, download: true, primary: true },
    { label: "Word version (.docx)", href: CV.docx, download: true },
    { label: "X  ·  @i_am_vickyd", href: "https://x.com/i_am_vickyd" },
    { label: "Instagram  ·  @cmv.ng", href: "https://www.instagram.com/cmv.ng" },
    { label: "Telegram  ·  t.me/cmv_ng", href: "https://t.me/cmv_ng" },
  ];
  pills.forEach((pl, i) => {
    const m = panel(2.8, 0.46, (c, W, H) => {
      rr(c, 3, 3, W - 6, H - 6, H / 2);
      if (pl.primary) { c.fillStyle = T.solid; c.fill(); } else { c.fillStyle = T.card; c.fill(); c.lineWidth = 3; c.strokeStyle = T.line; c.stroke(); }
      font(c, H * 0.36, 700); c.fillStyle = pl.primary ? "#fff" : T.ink; c.fillText(pl.label, H * 0.5, H * 0.63);
      c.textAlign = "right"; c.fillStyle = pl.primary ? "#fff" : T.accent; c.fillText(pl.download ? "↓" : "↗", W - H * 0.5, H * 0.63);
    }, { ppm: 320 });
    const pp = pose("B", 4.55, 3.55 - i * 0.6);
    place(m, pp, 0.01);
    register({ id: "pill:" + i, kind: "link", label: pl.label, sub: pl.download ? "Download" : "Opens in a new tab", href: pl.href, download: pl.download, center: pp.p.clone(), normal: pp.n.clone(), w: 2.8, h: 0.46, obj: m }, [m]);
  });
  const back = panel(2.4, 0.46, (c, W, H) => {
    rr(c, 3, 3, W - 6, H - 6, H / 2); c.fillStyle = T.card; c.fill(); c.lineWidth = 3; c.strokeStyle = T.line; c.stroke();
    font(c, H * 0.36, 700); c.fillStyle = T.ink; c.textAlign = "center"; c.fillText("↩  Back to the lobby", W / 2, H * 0.63);
  }, { ppm: 320 });
  const bp = pose("B", -5.3, 1.05);
  place(back, bp, 0.01);
  register({ id: "toLobby", kind: "room", label: "Back to the lobby", room: 0, center: bp.p.clone(), normal: bp.n.clone(), w: 2.4, h: 0.46, obj: back }, [back]);

  const side = [
    { side: "L", z: -66.2, k: "OpenSea", t: "CMVNG Collection", b: "17 works on Polygon and Ethereum, including Police Brutality 1, Desolation and Soulical Realm I.", href: "https://opensea.io/collection/cmv-156408845" },
    { side: "L", z: -69.8, k: "OpenSea", t: "World Over Series", b: "Two works on Ethereum: The Naira and $1/£1.", href: "https://opensea.io/collection/world-over-series" },
    { side: "R", z: -66.2, k: "Ambassador · Jan 2026 – Present", t: "Limitless", b: "I represent Limitless, a prediction market for crypto, sports and world events, and create content about it.", href: "https://limitless.exchange" },
    { side: "R", z: -69.8, k: "Content", t: "Follow along", b: "My thoughts on crypto, finance, trading and prediction markets, on X and Instagram.", href: "https://x.com/i_am_vickyd" },
  ];
  side.forEach((s, i) => {
    const m = plaque(2.5, 1.5, { kicker: s.k, title: s.t, body: s.b, hint: "Tap to open ↗" }, 300);
    const sp = pose(s.side, s.z, 1.95);
    place(m, sp, 0.01);
    register({ id: "side:" + i, kind: "plaque", label: s.t, sub: s.k, center: sp.p.clone(), normal: sp.n.clone(), w: 2.5, h: 1.5, obj: m,
      info: { kicker: s.k, title: s.t, body: `<p>${s.b}</p>`, actions: [{ label: "Open ↗", href: s.href, primary: true }] } }, [m]);
  });
}

/* ---------- theme ---------- */
function applyTheme() {
  T = THEMES[root.dataset.theme === "light" ? "light" : "dark"];
  renderer.setClearColor(T.bg, 1);
  scene.fog.color.setHex(T.bg); scene.fog.near = T.fog[0]; scene.fog.far = T.fog[1];
  M.wall.color.setHex(T.wall); M.floor.color.setHex(T.floor); M.ceil.color.setHex(T.ceil);
  M.strip.color.setHex(T.strip); M.led.color.setHex(T.led); M.ledGlow.color.setHex(T.led);
  M.frame.color.setHex(T.frame); M.mat.color.setHex(T.mat); M.pedestal.color.setHex(T.pedestal);
  M.pool.opacity = T.pool; M.glow.opacity = T.glow; M.glow.color.setHex(T.led);
  hemi.color.setHex(T.hemi[0]); hemi.groundColor.setHex(T.hemi[1]); hemi.intensity = T.hemi[2];
  lamps.forEach(l => { l.color.setHex(T.lamp[0]); l.intensity = T.lamp[1]; });
  dust.material.color.setHex(T.dust[0]); dust.material.opacity = T.dust[1];
  cursorRing.material.color.setHex(T.led);
  if (holo) holo.children[0].material.color.setHex(T.led);
  if (life.water) life.water.color.setHex(T === THEMES.light ? 0x3c8fae : 0x1f5d73);
  panels.forEach(paint);
}

/* ---------- movement ---------- */
const S = { x: 0, z: 5.4, yaw: 0, pitch: -0.05, tw: null, keys: new Set(), walkV: 0, bob: 0 };

function allowed(x, z, px, pz) {
  x = clamp(x, -HALF_W + 0.55, HALF_W - 0.55);
  z = clamp(z, BACK_Z + 0.55, FRONT_Z - 0.55);
  for (const w of PARTS) {
    if (Math.abs(z - w) < 0.5 && Math.abs(x) > DOOR - 0.4) {
      if (Math.abs(pz - w) >= 0.5) z = pz; else x = clamp(x, -(DOOR - 0.4), DOOR - 0.4);
    }
  }
  for (const o of obstacles) {
    const dx = x - o.x, dz = z - o.z, d = Math.hypot(dx, dz);
    if (d < o.r) { const k = o.r / (d || 1); x = o.x + dx * k; z = o.z + dz * k; }
  }
  return [x, z];
}
// path from here to there that goes through doorways and around plinths
function route(tx, tz) {
  const pts = [[S.x, S.z]];
  const ra = roomAt(S.z), rb = roomAt(tz);
  if (ra !== rb) {
    const dir = rb > ra ? -1 : 1;
    for (let r = ra; r !== rb; r -= dir) {
      const w = dir < 0 ? PARTS[r] : PARTS[r - 1];
      const x = clamp((S.x + tx) / 2, -1.4, 1.4);
      pts.push([x, w - dir * 0.9], [x, w + dir * 0.9]);
    }
  }
  pts.push([tx, tz]);
  for (const o of obstacles) {
    for (let i = 0; i < pts.length - 1; i++) {
      const [ax, az] = pts[i], [bx, bz] = pts[i + 1];
      const vx = bx - ax, vz = bz - az, L2 = vx * vx + vz * vz || 1;
      const t = clamp(((o.x - ax) * vx + (o.z - az) * vz) / L2, 0, 1);
      const cx = ax + vx * t, cz = az + vz * t, d = Math.hypot(cx - o.x, cz - o.z);
      if (d < o.r + 0.25 && t > 0.02 && t < 0.98) {
        let nx = cx - o.x, nz = cz - o.z;
        if (d < 1e-3) { nx = -vz; nz = vx; }
        const n = Math.hypot(nx, nz);
        pts.splice(i + 1, 0, [o.x + (nx / n) * (o.r + 0.6), o.z + (nz / n) * (o.r + 0.6)]);
        i++;
      }
    }
  }
  return pts;
}
function travel(tx, tz, yaw, pitch, { speed = 1 } = {}) {
  const pts = route(tx, tz);
  const seg = [0];
  for (let i = 1; i < pts.length; i++) seg.push(seg[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
  const L = seg.at(-1);
  let dy = (yaw - S.yaw) % (Math.PI * 2);
  if (dy > Math.PI) dy -= Math.PI * 2;
  if (dy < -Math.PI) dy += Math.PI * 2;
  const dur = reduce ? 0.01 : clamp((0.6 + L * 0.085 + Math.abs(dy) * 0.25) / speed, 0.55, 4.2);
  return new Promise(res => {
    S.tw = { pts, seg, L, t: 0, dur, y0: S.yaw, dy, p0: S.pitch, p1: pitch, res };
  });
}
function stepTween(dt) {
  const w = S.tw;
  w.t = Math.min(1, w.t + dt / w.dur);
  const k = ease(w.t), d = k * w.L;
  let i = 1;
  while (i < w.seg.length - 1 && w.seg[i] < d) i++;
  const f = (d - w.seg[i - 1]) / ((w.seg[i] - w.seg[i - 1]) || 1);
  S.x = w.pts[i - 1][0] + (w.pts[i][0] - w.pts[i - 1][0]) * f;
  S.z = w.pts[i - 1][1] + (w.pts[i][1] - w.pts[i - 1][1]) * f;
  S.yaw = w.y0 + w.dy * k;
  S.pitch = w.p0 + (w.p1 - w.p0) * k;
  if (w.t >= 1) { S.tw = null; w.res(); }
}
function cancelTween() { if (S.tw) { const r = S.tw.res; S.tw = null; r(); } }
const lookYaw = (fx, fz, tx, tz) => Math.atan2(-(tx - fx), -(tz - fz));

function goRoom(i) {
  const s = station(i);
  closeInfo();
  return travel(s.x, s.z, s.yaw, s.pitch);
}
function walkTo(x, z) {
  [x, z] = allowed(x, z, x, z);
  const d = Math.hypot(x - S.x, z - S.z);
  const yaw = d > 0.8 ? lookYaw(S.x, S.z, x, z) : S.yaw;
  return travel(x, z, yaw, -0.05, { speed: 1.2 });
}

/* ---------- focus + info panel ---------- */
let current = null;
function viewFor(item) {
  const c = item.center;
  let n = item.normal;
  if (item.dynamic) { n = V3(S.x - c.x, 0, S.z - c.z); if (n.lengthSq() < 0.01) n.set(0, 0, 1); n.normalize(); }
  const narrow = innerWidth <= 720;
  const vis = narrow ? 0.52 : 1;
  const vf = THREE.MathUtils.degToRad(camera.fov), hf = 2 * Math.atan(Math.tan(vf / 2) * camera.aspect);
  const usableW = narrow ? 1 : Math.max(0.5, 1 - 440 / innerWidth);
  let d = Math.max((item.h + 1.0) / (2 * Math.tan(vf / 2) * vis), (item.w + 1.0) / (2 * Math.tan(hf / 2) * usableW), 1.7);
  let [tx, tz] = allowed(c.x + n.x * d, c.z + n.z * d, c.x + n.x * d, c.z + n.z * d);
  const dist = Math.hypot(c.x - tx, c.z - tz);
  let yaw = lookYaw(tx, tz, c.x, c.z);
  let pitch = Math.atan2(c.y - EYE, dist);
  if (narrow) pitch -= Math.atan(Math.tan(vf / 2) * 0.46);
  else yaw -= Math.atan(Math.tan(hf / 2) * (220 / (innerWidth / 2)));
  return [tx, tz, yaw, clamp(pitch, -0.9, 0.9)];
}
async function focus(item, { fromTour = false } = {}) {
  if (!fromTour) stopTour();
  if (item.kind === "link") { openLink(item); return; }
  if (item.kind === "room") { goRoom(item.room); return; }
  openInfo(item);
  const [x, z, yaw, pitch] = viewFor(item);
  await travel(x, z, yaw, pitch);
}
function openLink(it) {
  if (it.download) { const a = document.createElement("a"); a.href = it.href; a.download = ""; document.body.appendChild(a); a.click(); a.remove(); return; }
  if (it.self) location.href = it.href; else window.open(it.href, "_blank", "noopener");
}
const info = $("#info");
function openInfo(item) {
  current = item;
  const d = item.info || {};
  $("#infoKicker").textContent = d.kicker || "";
  $("#infoTitle").textContent = d.title || item.label;
  $("#infoMeta").textContent = d.meta || "";
  $("#infoBody").innerHTML = d.body || "";
  const acts = $("#infoActions"); acts.innerHTML = "";
  (d.actions || []).forEach(a => {
    const el = document.createElement(a.room != null ? "button" : "a");
    el.className = "btn " + (a.primary ? "primary" : "ghost");
    el.textContent = a.label;
    if (a.room != null) el.addEventListener("click", () => goRoom(a.room));
    else { el.href = a.href; if (a.download) el.setAttribute("download", ""); else if (!a.self) { el.target = "_blank"; el.rel = "noopener"; } }
    acts.appendChild(el);
  });
  const peers = items.filter(i => i.room === item.room && i.info);
  const idx = peers.indexOf(item);
  $("#infoCount").textContent = `${idx + 1} of ${peers.length} in ${ROOMS[item.room].name}`;
  $(".info .step").hidden = peers.length < 2;
  info.hidden = false;
  info.scrollTop = 0;
}
function closeInfo() { info.hidden = true; current = null; }
function stepInfo(dir) {
  if (!current) return;
  const peers = items.filter(i => i.room === current.room && i.info);
  const next = peers[(peers.indexOf(current) + dir + peers.length) % peers.length];
  focus(next);
}
$("#infoClose").addEventListener("click", closeInfo);
$("#infoPrev").addEventListener("click", () => stepInfo(-1));
$("#infoNext").addEventListener("click", () => stepInfo(1));

/* ---------- guided tour ---------- */
const TOUR = [
  { room: 0, hold: 2.2 }, { item: "about" }, { item: "world:2" },
  { room: 1, hold: 1.6 }, { item: "art:police-brutality-1" }, { item: "art:the-naira" }, { item: "art:eye-study" },
  { room: 2, hold: 1.6 }, { item: "prod:picks" }, { item: "prod:signals" }, { item: "prod:alphascanner" }, { item: "holo" },
  { room: 3, hold: 1.6 }, { item: "exp:0" }, { item: "exp:1" }, { item: "exp:4" },
  { room: 4, hold: 1.6 }, { item: "grill" }, { item: "farm" },
  { room: 5, hold: 1.4 }, { item: "cv" },
];
let touring = false, tourRun = 0;
const tourBtn = $("#tourBtn");
const wait = s => new Promise(r => setTimeout(r, s * 1000));
async function startTour(from = 0) {
  touring = true; const run = ++tourRun;
  tourBtn.setAttribute("aria-pressed", "true");
  toast("Guided tour · tap anywhere to take over");
  for (let i = from; i < TOUR.length; i++) {
    if (!touring || run !== tourRun) return;
    const s = TOUR[i];
    if (s.room != null) { await goRoom(s.room); await wait(s.hold); }
    else { const it = items.find(x => x.id === s.item); if (it) { await focus(it, { fromTour: true }); await wait(4.2); } }
  }
  if (run === tourRun) { stopTour(); toast("That's the tour. Keep exploring, or grab my CV."); }
}
function stopTour() {
  if (!touring) return;
  touring = false; tourRun++;
  tourBtn.setAttribute("aria-pressed", "false");
}
tourBtn.addEventListener("click", () => { if (touring) { stopTour(); cancelTween(); } else startTour(); });

/* ---------- HUD ---------- */
const roomsEl = $("#rooms"), dotEl = $("#dot");
function buildTrack() {
  ROOMS.forEach((r, i) => {
    const b = document.createElement("button");
    b.innerHTML = `<span class="long">${r.name}</span><span class="short">${r.short}</span>`;
    b.addEventListener("click", () => { stopTour(); goRoom(i); });
    roomsEl.insertBefore(b, dotEl);
  });
}
let shownRoom = -1;
function updateHud() {
  const r = roomAt(S.z);
  if (r !== shownRoom) {
    shownRoom = r;
    $("#roomNum").textContent = String(r + 1).padStart(2, "0");
    $("#roomName").textContent = ROOMS[r].name;
    [...roomsEl.querySelectorAll("button")].forEach((b, i) => b.classList.toggle("on", i === r));
    if (location.hash !== "#" + ROOMS[r].id) history.replaceState(null, "", "#" + ROOMS[r].id);
  }
  const f = clamp((FRONT_Z - S.z) / (FRONT_Z - BACK_Z), 0, 1);
  dotEl.style.left = (f * 100).toFixed(2) + "%";
}
let toastT = 0;
function toast(msg, s = 3.6) {
  const el = $("#toast"); el.textContent = msg; el.classList.add("on");
  clearTimeout(toastT); toastT = setTimeout(() => el.classList.remove("on"), s * 1000);
}
$("#helpBtn").addEventListener("click", () => toast(coarse ? "Drag to look · tap the floor to walk · tap anything to open it" : "Drag to look · click the floor to walk · WASD, arrows or scroll to move", 5));

/* ---------- input ---------- */
const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
let hovered = null, pointer = null, lastMove = null;
function pick(cx, cy) {
  const r = canvas.getBoundingClientRect();
  ndc.set(((cx - r.left) / r.width) * 2 - 1, -((cy - r.top) / r.height) * 2 + 1);
  ray.setFromCamera(ndc, camera);
  const hits = ray.intersectObjects([...clickables, floor, ...solids], false);
  for (const h of hits) {
    if (h.object.userData.item) return { item: h.object.userData.item };
    if (h.object === floor) return { floor: h.point };
    return null;
  }
  return null;
}
const tip = $("#tip");
function hover(cx, cy) {
  const h = pick(cx, cy);
  const it = h?.item || null;
  if (it !== hovered) {
    hovered = it;
    canvas.classList.toggle("hover", !!it);
    if (it) tip.innerHTML = `${it.label}<small>${it.sub || "Tap to open"}</small>`;
    tip.classList.toggle("on", !!it);
  }
  if (it) tip.style.transform = `translate(${Math.min(cx + 16, innerWidth - tip.offsetWidth - 8)}px, ${cy + 18}px)`;
  if (h?.floor) {
    const [x, z] = allowed(h.floor.x, h.floor.z, h.floor.x, h.floor.z);
    cursorRing.position.set(x, 0.01, z); cursorRing.visible = true;
  } else cursorRing.visible = false;
}
function bindInput() {
  canvas.addEventListener("pointerdown", e => {
    if (e.button !== 0 && e.pointerType === "mouse") return;
    canvas.setPointerCapture(e.pointerId);
    pointer = { id: e.pointerId, x: e.clientX, y: e.clientY, sx: e.clientX, sy: e.clientY, t: performance.now(), drag: false };
    stopTour();
  });
  canvas.addEventListener("pointermove", e => {
    if (pointer && e.pointerId === pointer.id) {
      const dx = e.clientX - pointer.x, dy = e.clientY - pointer.y;
      if (!pointer.drag && Math.hypot(e.clientX - pointer.sx, e.clientY - pointer.sy) > 6) { pointer.drag = true; canvas.classList.add("dragging"); cancelTween(); tip.classList.remove("on"); cursorRing.visible = false; }
      if (pointer.drag) {
        const k = coarse ? 0.0055 : 0.0038;
        S.yaw += dx * k;
        S.pitch = clamp(S.pitch + dy * k, -0.8, 0.8);
      }
      pointer.x = e.clientX; pointer.y = e.clientY;
    } else if (e.pointerType === "mouse") lastMove = [e.clientX, e.clientY];
  });
  const up = e => {
    if (!pointer || e.pointerId !== pointer.id) return;
    const wasDrag = pointer.drag;
    pointer = null; canvas.classList.remove("dragging");
    if (wasDrag || e.type === "pointercancel") return;
    const h = pick(e.clientX, e.clientY);
    if (h?.item) focus(h.item);
    else if (h?.floor) { closeInfo(); walkTo(h.floor.x, h.floor.z); }
  };
  canvas.addEventListener("pointerup", up);
  canvas.addEventListener("pointercancel", up);
  canvas.addEventListener("pointerleave", () => { if (!pointer) { tip.classList.remove("on"); cursorRing.visible = false; hovered = null; } });
  canvas.addEventListener("wheel", e => { e.preventDefault(); stopTour(); cancelTween(); S.walkV = clamp(S.walkV - Math.sign(e.deltaY) * Math.min(Math.abs(e.deltaY), 120) * 0.008, -7, 7); }, { passive: false });
  addEventListener("keydown", e => {
    if (e.target.closest && e.target.closest("input, textarea")) return;
    if (e.key === "Escape") { closeInfo(); stopTour(); return; }
    const k = e.key.toLowerCase();
    if (["w", "a", "s", "d", "arrowup", "arrowdown", "arrowleft", "arrowright", "q", "e"].includes(k)) {
      e.preventDefault(); S.keys.add(k); stopTour(); cancelTween();
    }
  });
  addEventListener("keyup", e => S.keys.delete(e.key.toLowerCase()));
  addEventListener("blur", () => S.keys.clear());
}
function keyMove(dt) {
  const K = S.keys;
  let f = 0, s = 0, turn = 0;
  if (K.has("w") || K.has("arrowup")) f += 1;
  if (K.has("s") || K.has("arrowdown")) f -= 1;
  if (K.has("a")) s -= 1;
  if (K.has("d")) s += 1;
  if (K.has("arrowleft") || K.has("q")) turn += 1;
  if (K.has("arrowright") || K.has("e")) turn -= 1;
  S.yaw += turn * dt * 1.7;
  const speed = 3.2;
  let fwd = f * speed + S.walkV;
  S.walkV *= Math.pow(0.08, dt);
  if (Math.abs(S.walkV) < 0.02) S.walkV = 0;
  if (!fwd && !s) return false;
  const sx = -Math.sin(S.yaw), sz = -Math.cos(S.yaw);
  const nx = S.x + (sx * fwd + -sz * s * speed) * dt, nz = S.z + (sz * fwd + sx * s * speed) * dt;
  [S.x, S.z] = allowed(nx, nz, S.x, S.z);
  return true;
}

/* ---------- loop ---------- */
const clock = new THREE.Clock();
function frame() {
  requestAnimationFrame(frame);
  const dt = Math.min(clock.getDelta(), 0.05), t = clock.elapsedTime;
  let moving = false;
  if (S.tw) { stepTween(dt); moving = true; }
  else moving = keyMove(dt);
  S.bob = moving && !reduce ? S.bob + dt * 9 : S.bob * 0.9;
  camera.position.set(S.x, EYE + (moving ? Math.sin(S.bob) * 0.018 : 0), S.z);
  camera.rotation.set(S.pitch, S.yaw, 0, "YXZ");

  if (portrait) { portrait.rotation.y = reduce ? 0.3 : t * 0.45; portrait.position.y = 2.0 + Math.sin(t * 1.3) * 0.04; }
  if (holo && !reduce) {
    holo.children[0].rotation.set(t * 0.3, t * 0.45, 0);
    holo.children.slice(3, 6).forEach((r, i) => { r.rotation.z = t * (0.4 + i * 0.25) * (i % 2 ? -1 : 1); });
    holo.children[2].lookAt(camera.position);
    holo.position.y = 2.25 + Math.sin(t * 1.1) * 0.06;
  }
  if (life.embers && !reduce) {
    life.embers.color.setHSL(0.05 + Math.sin(t * 7) * 0.012, 1, 0.5 + Math.sin(t * 11) * 0.06 + Math.sin(t * 3.1) * 0.04);
    life.fire.material.opacity = 0.45 + Math.sin(t * 9) * 0.08; life.fire.lookAt(camera.position);
    life.smoke.forEach(sp => {
      const k = (sp.userData.t + t * 0.12) % 1;
      sp.position.set(Math.sin(k * 6 + sp.userData.t * 20) * 0.12 * k, 1.0 + k * 2.2, Math.cos(k * 5) * 0.1 * k);
      sp.scale.setScalar(0.25 + k * 0.9); sp.material.opacity = 0.14 * Math.sin(k * Math.PI);
    });
    life.fish.forEach(f => {
      const u = f.userData, a = u.o + t * u.s;
      f.position.set(Math.cos(a) * u.r, u.y + Math.sin(t * 2 + u.o) * 0.015, Math.sin(a) * u.r);
      f.rotation.y = -a + (u.s > 0 ? Math.PI : 0);
    });
    life.ripples.forEach(rp => {
      const k = (rp.userData.t + t * 0.25) % 1;
      rp.scale.setScalar(1 + k * 4); rp.material.opacity = 0.3 * (1 - k);
    });
  }
  if (!reduce) dust.rotation.y = Math.sin(t * 0.05) * 0.02, dust.position.y = Math.sin(t * 0.2) * 0.08;
  if (cursorRing.visible) { const s = 1 + Math.sin(t * 5) * 0.08; cursorRing.scale.set(s, s, s); }
  for (const it of items) {
    if (!it.obj || !it.base) continue;
    const target = hovered === it || current === it ? 1 : 0;
    it.hl += (target - it.hl) * Math.min(1, dt * 10);
    it.obj.position.copy(it.base).addScaledVector(it.normal, it.hl * 0.05);
  }
  if (lastMove && !pointer) { hover(lastMove[0], lastMove[1]); lastMove = null; }
  updateHud();
  renderer.render(scene, camera);
}

function resize() {
  const w = innerWidth, h = innerHeight;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.fov = w / h < 0.8 ? 74 : 62;
  camera.updateProjectionMatrix();
}

/* ---------- boot ---------- */
const startHash = location.hash.slice(1);
const gate = $("#gate"), tourStart = $("#tourStart"), enterBtn = $("#enter"), loadBar = $("#load");
function fail(msg) {
  gate.classList.add("nogl");
  $("#gateMsg").textContent = msg;
  tourStart.disabled = enterBtn.disabled = true;
}
async function fontsReady() {
  const list = ['400 40px "Instrument Serif"', 'italic 400 40px "Instrument Serif"', '400 20px "Inter Tight"', '500 20px "Inter Tight"', '600 20px "Inter Tight"', '700 20px "Inter Tight"'];
  try { await Promise.race([Promise.all(list.map(f => document.fonts.load(f))), wait(4)]); } catch {}
}
function ready() {
  loadBar.style.width = "100%";
  tourStart.disabled = enterBtn.disabled = false;
  tourStart.textContent = "Start the guided tour";
}
function enter(tour) {
  gate.classList.add("gone");
  canvas.focus({ preventScroll: true });
  const idx = ROOMS.findIndex(r => r.id === startHash);
  if (tour) startTour();
  else {
    if (idx > 0) goRoom(idx);
    toast(coarse ? "Drag to look · tap the floor to walk · tap anything to open it" : "Drag to look · click the floor to walk · click anything to open it", 5);
  }
}
tourStart.addEventListener("click", () => enter(true));
enterBtn.addEventListener("click", () => enter(false));

async function init() {
  const probe = document.createElement("canvas");
  if (!(probe.getContext("webgl2") || probe.getContext("webgl"))) { fail("Your browser can't show 3D here. The classic portfolio has everything too."); return; }
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: "high-performance" });
  renderer.setPixelRatio(Math.min(devicePixelRatio, coarse ? 1.6 : 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  maxAniso = Math.min(8, renderer.capabilities.getMaxAnisotropy());
  scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0x000000, 10, 40);
  camera = new THREE.PerspectiveCamera(62, innerWidth / innerHeight, 0.05, 140);
  canvas.tabIndex = 0;

  manager.onProgress = (_, done, total) => { loadBar.style.width = Math.round((done / total) * 92) + "%"; };
  let loaded = false;
  manager.onLoad = () => { loaded = true; ready(); };
  setTimeout(() => { if (!loaded) ready(); }, 15000);

  const [art] = await Promise.all([fetch(A("assets/art/art.json")).then(r => r.json()), fontsReady()]);
  makeMaterials();
  buildShell(); buildLobby(); buildArt(art); buildBuilds(); buildJourney(); buildLife(); buildCV();
  buildTrack(); bindInput();
  applyTheme();
  addEventListener("themechange", applyTheme);
  resize(); addEventListener("resize", resize);
  frame();
  if (new URLSearchParams(location.search).has("debug")) window.__tour = { S, items, goRoom, focus: id => focus(items.find(i => i.id === id)), enter };
}
init().catch(err => { console.error(err); fail("Something went wrong loading the 3D tour. The classic portfolio has everything too."); });
