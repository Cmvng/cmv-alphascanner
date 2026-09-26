// Tiny zero-dependency static server for the $BROG site (Railway runs `node server.js`).
import http from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, normalize, sep } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(fileURLToPath(new URL(".", import.meta.url)), "public");
const PORT = Number(process.env.PORT) || 3000;

const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".txt": "text/plain; charset=utf-8",
  ".svg": "image/svg+xml",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
};

const BASE_HEADERS = {
  "x-content-type-options": "nosniff",
  "referrer-policy": "strict-origin-when-cross-origin",
};

// Cache the ZEC price so every visitor isn't hitting CoinGecko's rate limit.
const PRICE_URL = "https://api.coingecko.com/api/v3/simple/price?ids=zcash&vs_currencies=usd&include_24hr_change=true";
let priceCache = { at: 0, body: null };

async function zecPrice() {
  if (priceCache.body && Date.now() - priceCache.at < 60_000) return priceCache.body;
  try {
    const r = await fetch(PRICE_URL, { signal: AbortSignal.timeout(8000) });
    if (!r.ok) throw new Error(`CoinGecko ${r.status}`);
    const body = JSON.stringify(await r.json());
    priceCache = { at: Date.now(), body };
    return body;
  } catch (err) {
    if (priceCache.body) return priceCache.body; // stale beats nothing
    throw err;
  }
}

function send(res, status, type, body, extra = {}) {
  res.writeHead(status, { ...BASE_HEADERS, "content-type": type, ...extra });
  res.end(body);
}

http
  .createServer(async (req, res) => {
    let pathname;
    try {
      pathname = decodeURIComponent(new URL(req.url, "http://localhost").pathname);
    } catch {
      return send(res, 400, "text/plain; charset=utf-8", "Bad request");
    }

    if (pathname === "/health") return send(res, 200, "text/plain; charset=utf-8", "ok");
    if (pathname === "/api/zec") {
      try {
        return send(res, 200, TYPES[".json"], await zecPrice(), { "cache-control": "public, max-age=30" });
      } catch {
        return send(res, 502, TYPES[".json"], JSON.stringify({ error: "price unavailable" }));
      }
    }
    if (pathname.endsWith("/")) pathname += "index.html";

    const file = normalize(join(ROOT, pathname));
    if (!file.startsWith(ROOT + sep)) return send(res, 403, "text/plain; charset=utf-8", "Forbidden");

    const head = req.method === "HEAD";
    try {
      const body = await readFile(file);
      const type = TYPES[extname(file).toLowerCase()] || "application/octet-stream";
      const cache = type.startsWith("text/html") ? "no-cache" : "public, max-age=86400";
      send(res, 200, type, head ? undefined : body, { "cache-control": cache });
    } catch {
      // Unknown paths get the homepage so shared links never dead-end.
      const body = await readFile(join(ROOT, "index.html"));
      send(res, 404, TYPES[".html"], head ? undefined : body, { "cache-control": "no-cache" });
    }
  })
  .listen(PORT, () => console.log(`Brog is watching on port ${PORT}`));
