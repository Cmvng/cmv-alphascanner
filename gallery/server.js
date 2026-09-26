// CMVNG Art Gallery server: static site + a small JSON API for studio uploads.
// Uploaded images and their details live on the Railway volume (RAILWAY_VOLUME_MOUNT_PATH).
import http from "node:http";
import crypto from "node:crypto";
import { readFile, writeFile, rename, mkdir, unlink } from "node:fs/promises";
import { extname, join, normalize, sep } from "node:path";
import { fileURLToPath } from "node:url";
import busboy from "busboy";

const HERE = fileURLToPath(new URL(".", import.meta.url));
const PUBLIC = join(HERE, "public");
const DATA = process.env.RAILWAY_VOLUME_MOUNT_PATH || process.env.DATA_DIR || join(HERE, "data");
const UPLOADS = join(DATA, "uploads");
const MANIFEST = join(DATA, "works.json");
const PORT = Number(process.env.PORT) || 3000;
const PASSWORD = process.env.ADMIN_PASSWORD || "";
const MAX_FILE = 30 * 1024 * 1024;
const TOKEN_DAYS = 30;

const SEED = JSON.parse(await readFile(join(HERE, "works.json"), "utf8"));
await mkdir(UPLOADS, { recursive: true });

const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".avif": "image/avif",
  ".ico": "image/x-icon",
  ".txt": "text/plain; charset=utf-8",
};

const PAGES = { "/": "index.html", "/upload": "upload.html", "/studio": "upload.html" };

/* ---------- helpers ---------- */

function send(res, status, body, type = TYPES[".json"], extra = {}) {
  res.writeHead(status, {
    "content-type": type,
    "x-content-type-options": "nosniff",
    "referrer-policy": "strict-origin-when-cross-origin",
    ...extra,
  });
  res.end(body);
}
const json = (res, status, obj) => send(res, status, JSON.stringify(obj), TYPES[".json"], { "cache-control": "no-store" });

async function readJson(req, limit = 64 * 1024) {
  let size = 0;
  const chunks = [];
  for await (const c of req) {
    size += c.length;
    if (size > limit) throw Object.assign(new Error("Body too large"), { status: 413 });
    chunks.push(c);
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}");
  } catch {
    throw Object.assign(new Error("Invalid JSON"), { status: 400 });
  }
}

// Sniff the real image type from the file's first bytes, never trust the client's label.
function sniff(buf) {
  if (buf.length < 12) return null;
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return ".jpg";
  if (buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return ".png";
  if (buf.subarray(0, 4).toString("latin1") === "GIF8") return ".gif";
  if (buf.subarray(0, 4).toString("latin1") === "RIFF" && buf.subarray(8, 12).toString("latin1") === "WEBP") return ".webp";
  if (buf.subarray(4, 8).toString("latin1") === "ftyp" && /^avi[fs]/.test(buf.subarray(8, 12).toString("latin1"))) return ".avif";
  return null;
}

const clean = (v, max = 200) => (typeof v === "string" ? v.replace(/[\u0000-\u001f\u007f]/g, " ").trim().slice(0, max) : "");
const cleanText = (v, max = 2000) => (typeof v === "string" ? v.replace(/\r\n?/g, "\n").replace(/[\u0000-\u0009\u000b-\u001f\u007f]/g, "").trim().slice(0, max) : "");
const STATUSES = new Set(["finished", "wip"]);

/* ---------- auth ---------- */

function sign(payload) {
  return crypto.createHmac("sha256", PASSWORD).update(payload).digest("base64url");
}
function makeToken() {
  const exp = String(Date.now() + TOKEN_DAYS * 864e5);
  return `${exp}.${sign("studio:" + exp)}`;
}
function authed(req) {
  if (!PASSWORD) return false;
  const m = /^Bearer (\d+)\.([\w-]+)$/.exec(req.headers.authorization || "");
  if (!m || Number(m[1]) < Date.now()) return false;
  const a = Buffer.from(m[2]);
  const b = Buffer.from(sign("studio:" + m[1]));
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}
function passwordMatches(input) {
  const a = crypto.createHash("sha256").update(String(input)).digest();
  const b = crypto.createHash("sha256").update(PASSWORD).digest();
  return crypto.timingSafeEqual(a, b);
}

// Slow down password guessing: 8 misses per IP per 15 minutes.
const misses = new Map();
const clientIp = req => (req.headers["x-forwarded-for"] || "").split(",")[0].trim() || req.socket.remoteAddress || "?";
function tooManyMisses(ip) {
  const m = misses.get(ip);
  if (!m || m.reset < Date.now()) return false;
  return m.count >= 8;
}
function recordMiss(ip) {
  const m = misses.get(ip);
  if (!m || m.reset < Date.now()) misses.set(ip, { count: 1, reset: Date.now() + 15 * 60e3 });
  else m.count++;
}

/* ---------- studio works (stored on the volume) ---------- */

let lock = Promise.resolve();
function withLock(fn) {
  const run = lock.then(fn);
  lock = run.catch(() => {});
  return run;
}
async function loadStudio() {
  try {
    return JSON.parse(await readFile(MANIFEST, "utf8"));
  } catch (err) {
    if (err.code === "ENOENT") return [];
    throw err;
  }
}
async function saveStudio(list) {
  const tmp = MANIFEST + ".tmp";
  await writeFile(tmp, JSON.stringify(list, null, 2));
  await rename(tmp, MANIFEST);
}

function parseUpload(req) {
  return new Promise((resolve, reject) => {
    let bb;
    try {
      bb = busboy({ headers: req.headers, limits: { fileSize: MAX_FILE, files: 2, fields: 20, fieldSize: 8000 } });
    } catch {
      return reject(Object.assign(new Error("Expected a multipart form upload"), { status: 400 }));
    }
    const fields = {};
    const files = {};
    const pending = [];
    let tooBig = false;
    bb.on("field", (name, val) => (fields[name] = val));
    bb.on("file", (name, stream) => {
      const chunks = [];
      stream.on("data", c => chunks.push(c));
      stream.on("limit", () => (tooBig = true));
      pending.push(new Promise(done => stream.on("end", () => { files[name] = Buffer.concat(chunks); done(); })));
    });
    bb.on("error", err => reject(Object.assign(err, { status: 400 })));
    bb.on("close", async () => {
      await Promise.all(pending);
      if (tooBig) return reject(Object.assign(new Error("Image is larger than 30 MB"), { status: 413 }));
      resolve({ fields, files });
    });
    req.pipe(bb);
  });
}

async function createWork(req) {
  const { fields, files } = await parseUpload(req);
  const title = clean(fields.title, 120);
  if (!title) throw Object.assign(new Error("Give the work a title"), { status: 400 });
  if (!files.image?.length) throw Object.assign(new Error("Choose an image to upload"), { status: 400 });
  const ext = sniff(files.image);
  if (!ext) throw Object.assign(new Error("That file isn't a JPG, PNG, WebP, GIF or AVIF image"), { status: 415 });

  const id = Date.now().toString(36) + crypto.randomBytes(4).toString("hex");
  const imageName = id + ext;
  await writeFile(join(UPLOADS, imageName), files.image);
  let thumbName = imageName;
  const thumbExt = files.thumb?.length ? sniff(files.thumb) : null;
  if (thumbExt) {
    thumbName = `${id}-thumb${thumbExt}`;
    await writeFile(join(UPLOADS, thumbName), files.thumb);
  }

  const work = {
    id,
    title,
    description: cleanText(fields.description),
    series: clean(fields.series, 80) || "New Works",
    status: STATUSES.has(fields.status) ? fields.status : "finished",
    year: clean(fields.year, 12),
    medium: clean(fields.medium, 80),
    image: `/uploads/${imageName}`,
    thumb: `/uploads/${thumbName}`,
    width: Math.max(1, Math.min(20000, parseInt(fields.width, 10) || 1000)),
    height: Math.max(1, Math.min(20000, parseInt(fields.height, 10) || 1000)),
    createdAt: new Date().toISOString(),
    source: "studio",
  };
  await withLock(async () => {
    const list = await loadStudio();
    list.unshift(work);
    await saveStudio(list);
  });
  return work;
}

async function updateWork(id, patch) {
  return withLock(async () => {
    const list = await loadStudio();
    const work = list.find(w => w.id === id);
    if (!work) return null;
    if ("title" in patch) work.title = clean(patch.title, 120) || work.title;
    if ("description" in patch) work.description = cleanText(patch.description);
    if ("series" in patch) work.series = clean(patch.series, 80) || "New Works";
    if ("year" in patch) work.year = clean(patch.year, 12);
    if ("medium" in patch) work.medium = clean(patch.medium, 80);
    if (STATUSES.has(patch.status)) work.status = patch.status;
    work.updatedAt = new Date().toISOString();
    await saveStudio(list);
    return work;
  });
}

async function deleteWork(id) {
  return withLock(async () => {
    const list = await loadStudio();
    const i = list.findIndex(w => w.id === id);
    if (i === -1) return false;
    const [work] = list.splice(i, 1);
    await saveStudio(list);
    for (const url of new Set([work.image, work.thumb])) {
      await unlink(join(UPLOADS, url.replace("/uploads/", ""))).catch(() => {});
    }
    return true;
  });
}

/* ---------- static files ---------- */

async function serveFile(res, root, rel, head, cache) {
  const file = normalize(join(root, rel));
  if (!file.startsWith(root + sep)) return false;
  try {
    const body = await readFile(file);
    const type = TYPES[extname(file).toLowerCase()] || "application/octet-stream";
    send(res, 200, head ? undefined : body, type, { "cache-control": type.startsWith("text/html") ? "no-cache" : cache });
    return true;
  } catch {
    return false;
  }
}

/* ---------- router ---------- */

async function handle(req, res) {
  let path;
  try {
    path = decodeURIComponent(new URL(req.url, "http://localhost").pathname);
  } catch {
    return json(res, 400, { error: "Bad request" });
  }
  const method = req.method;
  const head = method === "HEAD";

  if (path === "/health") return send(res, 200, "ok", TYPES[".txt"]);

  if (path.startsWith("/api/")) {
    if (path === "/api/works" && method === "GET") {
      const studio = await loadStudio();
      return json(res, 200, { works: [...studio, ...SEED] });
    }

    if (path === "/api/login" && method === "POST") {
      if (!PASSWORD) return json(res, 503, { error: "Uploads are switched off: set ADMIN_PASSWORD on the server." });
      const ip = clientIp(req);
      if (tooManyMisses(ip)) return json(res, 429, { error: "Too many wrong passwords. Try again in 15 minutes." });
      const body = await readJson(req);
      if (!passwordMatches(body.password || "")) {
        recordMiss(ip);
        return json(res, 401, { error: "That password isn't right." });
      }
      misses.delete(ip);
      return json(res, 200, { token: makeToken() });
    }

    if (!authed(req)) return json(res, 401, { error: "Please sign in to the studio again." });

    if (path === "/api/session" && method === "GET") return json(res, 200, { ok: true });
    if (path === "/api/works" && method === "POST") return json(res, 201, { work: await createWork(req) });

    const m = /^\/api\/works\/([a-z0-9]+)$/.exec(path);
    if (m && method === "PATCH") {
      const work = await updateWork(m[1], await readJson(req));
      return work ? json(res, 200, { work }) : json(res, 404, { error: "Work not found" });
    }
    if (m && method === "DELETE") {
      return (await deleteWork(m[1])) ? json(res, 200, { ok: true }) : json(res, 404, { error: "Work not found" });
    }
    return json(res, 404, { error: "Not found" });
  }

  if (method !== "GET" && !head) return send(res, 405, "Method not allowed", TYPES[".txt"]);

  if (path.startsWith("/uploads/")) {
    if (await serveFile(res, UPLOADS, path.slice("/uploads/".length), head, "public, max-age=31536000, immutable")) return;
    return send(res, 404, "Not found", TYPES[".txt"]);
  }

  const rel = PAGES[path.replace(/\/+$/, "") || "/"] || path;
  const cache = path.startsWith("/art/") ? "public, max-age=604800" : "public, max-age=3600";
  if (await serveFile(res, PUBLIC, rel, head, cache)) return;

  const body = await readFile(join(PUBLIC, "index.html"));
  send(res, 404, head ? undefined : body, TYPES[".html"], { "cache-control": "no-cache" });
}

http
  .createServer((req, res) => {
    handle(req, res).catch(err => {
      if (!err.status) console.error(err);
      if (!res.headersSent) json(res, err.status || 500, { error: err.status ? err.message : "Something went wrong" });
      else res.end();
    });
  })
  .listen(PORT, () => {
    console.log(`CMVNG Art Gallery on port ${PORT}; uploads stored in ${UPLOADS}`);
    if (!PASSWORD) console.warn("ADMIN_PASSWORD is not set, so the studio upload page is locked.");
  });
