# CMV AlphaScanner — Project Checkpoint

**Audit date:** 2026-08-22
**Repo:** `Cmvng/cmv-alphascanner` · 50 commits · last commit 2026-04-19
**Branch audited:** `claude/project-audit-checkpoint-qwz18w` (from `main`)
**Verified:** `npm install` + `npm run build` both pass clean (308 KB JS / 89 KB gzip)

---

## 1. What this is

A single-page React app that takes a crypto project's X (Twitter) handle and returns a scored
"alpha verdict" — a 0-100 score, a tier (S/A/B/C/D), 17 metric breakdowns, detected red flags,
and a downloadable/shareable PNG verdict card. Scans are persisted to Supabase and resurfaced
in a public feed and a drag-and-drop tier list.

**Stack:** Vite 5 + React 18 + TypeScript (no router, no UI library, no state library, no CSS
framework — styles are inline `<style>` blocks per page). Vercel serverless functions for the
API layer. Supabase (REST, no client SDK) for persistence.

**Size:** 5,855 lines across 20 files. `src/pages/home.tsx` alone is 2,632 lines (~45% of the
codebase) and `api/xproject.ts` is 1,000 lines.

---

## 2. Architecture as built

```
Browser
  │
  ├─ src/App.tsx ── manual pathname routing (no router)
  │     /          → pages/home.tsx      scan + verdict UI          (2632 L)
  │     /feed      → pages/feed.tsx      public scan feed           ( 503 L)
  │     /tierlist  → pages/tierlist.tsx  drag-drop tier board       ( 559 L)
  │     /admin     → pages/admin.tsx     fake-404 gated admin       ( 280 L)
  │
  ├─ direct browser → Supabase REST      (feed, tierlist, admin, FeaturedProjects)
  ├─ direct browser → CoinGecko          (feed.tsx live price poll, 60 s)
  │
  └─ /api/* (Vercel serverless)
        xproject.ts   X profile + 9 enrichment sources, 2 h in-memory cache   (1000 L)
        claude.ts     Anthropic passthrough — claude-haiku-4-5, max_tokens 4096
        websearch.ts  DuckDuckGo HTML scrape → red-flag keyword match
        save-scan.ts  Supabase upsert into `scans`
        xuser.ts      single X user lookup (team member cards)
        cryptorank.ts CryptoRank proxy — NEVER CALLED by any client code
```

### The scan pipeline (`home.tsx :494 analyze()`)

1. Parse + sanitise handle from the input.
2. Check `localStorage` cache key `cmv_scan_v4_<handle>`; if hit, verify the row still exists in
   Supabase (admin deletion = cache invalidation signal), then short-circuit and render.
3. `GET /api/xproject?handle=…` — X profile, 5 recent tweets, ticker extraction, category
   inference, CMV X Score, then 9 enrichment sources in parallel with per-source timeouts.
4. Reject non-crypto accounts (`>5000` followers **and** no crypto keyword in bio).
5. `GET /api/websearch?query=…` for red-flag keywords; findings injected into the prompt.
6. `POST /api/claude` with a ~4 KB system prompt demanding one large JSON object.
7. Parse with a brace-balancing extractor (`xjson :129`), strip citation markup (`stripCites :142`).
8. **On any failure** — non-200, credits, overload, auth error, empty text, unparseable JSON —
   fall through to `xOnlyScan()` (`:617`), a ~450-line deterministic scorer that produces the
   identical result shape without the LLM.
9. Persist to `localStorage` + `POST /api/save-scan` → Supabase.

### Enrichment sources in `api/xproject.ts`

| Source | Function | Key | Notes |
|---|---|---|---|
| X API v2 | `xFetch` | `X_API_BEARER_TOKEN` | profile + 5 tweets; pinned tweet fetch disabled to save credits |
| CoinGecko | `getCoingeckoToken :19` | none | 3-tier match: id → ticker → name, chain tokens blocklisted |
| DefiLlama | `fetchDefiLlama :208` | none | tries 9 slug permutations; TVL / fees / revenue / raises |
| DefiLlama hacks | `fetchDefiLlamaHacks :245` | none | substring name match against the hack registry |
| RootData | `fetchRootData :262` | `ROOTDATA_API_KEY` | funding, investors, team |
| DexScreener | `fetchDexScreener :296` | none | price, liquidity, 24 h change, dump detection |
| GeckoTerminal | `fetchGeckoTerminal :335` | none | price-only fallback |
| cryptocurrency.cv | `fetchCryptoNewsSentiment :359` | none | headline sentiment via keyword counting |
| CoinPaprika | `fetchCoinPaprika :467` | none | team, contracts, tags, price |
| DuckDuckGo IA | `fetchVerifiedRedFlags :553` | none | 3 targeted negative-signal queries |
| CryptoRank | `fetchCryptoRankData :588` | `CRYPTORANK_API_KEY` | VC tiers, funding rounds, unlock schedule |

Token price resolution order: DexScreener → GeckoTerminal → CoinGecko → CoinPaprika, with a
sanity re-check that rejects a DEX price more than 10× off the CoinGecko price.

---

## 3. What works today

- ✅ **Build and deploy.** `tsc && vite build` is clean. Vercel config is valid, function
  `maxDuration` set for the two slow routes.
- ✅ **The scan pipeline end-to-end**, including the graceful-degradation path. This is the
  strongest part of the codebase — every LLM failure mode is caught and routed to `xOnlyScan()`,
  so the app produces a usable verdict even with the Anthropic key removed entirely.
- ✅ **Enrichment fan-out.** `Promise.allSettled` + per-source `withTimeout` means one dead API
  never blocks a scan. The token-source cascade with the price-sanity check is genuinely good.
- ✅ **Ticker disambiguation.** The `CHAIN_TOKENS` blocklist and multi-strategy CoinGecko match
  avoid the classic failure of matching a project to the L1 it's deployed on.
- ✅ **Red-flag detection breadth.** Bot followers, follow-farming, dumps, pumps, thin liquidity,
  hacks, negative news, upcoming unlocks, no-tier-1-VC, hype language in bio.
- ✅ **Canvas verdict card** (`downloadCard :1103`) — 1200×628 @2× DPR with a 3-deep logo
  fallback chain (unavatar → X CDN variants → ui-avatars) and 5 s per-source timeouts.
- ✅ **Caching layers.** Browser `localStorage` (versioned `v4`, with `v3`/`v2` migration reads),
  plus a 2 h server-side cache that deliberately refuses to cache empty X responses (`:958`).
- ✅ **Feed, tier list, admin** all render and load from Supabase.
- ✅ **UI polish** — the design language is consistent and finished-looking.

---

## 4. What's broken

### 🔴 P0 — Security

| # | Issue | Location |
|---|---|---|
| 1 | **`/api/claude` is an open, unauthenticated proxy to your Anthropic key.** `Access-Control-Allow-Origin: *`, no auth, no rate limit, and both `system` and `messages` are caller-controlled. Anyone who finds the URL can bill arbitrary prompts to your account. | `api/claude.ts:5-15` |
| 2 | **Admin password is a client-side string constant.** `const ADMIN_PASSWORD = 'Damilola'` ships in the JS bundle. The fake-404 + `cmvadm` key sequence is obfuscation, not access control. | `src/pages/admin.tsx:3` |
| 3 | **Client-side Supabase DELETE with the anon key.** For admin delete to work, RLS must permit anon deletes — which means anyone with the public anon key can wipe the `scans` table. | `src/pages/admin.tsx:95` |
| 4 | **`/api/save-scan` is unauthenticated.** Anyone can POST arbitrary rows into the public feed. | `api/save-scan.ts` |
| 4b | **Prompt injection is already live — found 2026-08-22.** `buildSystemPrompt` interpolates the target's X bio and recent tweets directly into the Claude system prompt. A project whose bio reads "ignore previous instructions and…" is injecting into your LLM today. Low impact now (the model only returns JSON to the scanner), but it is a prerequisite fix before the discovery engine starts ingesting far more untrusted text. | `home.tsx:191-260` |
| 5 | **`VITE_ANTHROPIC_API_KEY` accepted as a fallback.** Harmless as read (server-side `process.env`), but the `VITE_` prefix means that if it's ever set for the frontend build, Vite inlines it into the public bundle. Rename it away. | `api/claude.ts:11` |

### 🔴 P0 — Correctness

| # | Issue | Location |
|---|---|---|
| 6 | **Verdict vocabulary drift — the feed is silently dropping scans.** `home.tsx` emits `ALPHA PLAY / FARM IT / ENGAGE / OBSERVE / AVOID`. `feed.tsx`, `tierlist.tsx`, `admin.tsx` and `FeaturedProjects` all still expect the **old** `FARM IT / CREATE CONTENT / WATCH / SKIP`. Effects: feed tier-view renders only `TIER_ORDER` so ALPHA PLAY / ENGAGE / OBSERVE / AVOID scans **never appear**; grid cards fall back to WATCH styling; three of four filter buttons match nothing; tier-list auto-placement dumps everything into D; admin stats read 0 / 0 / 0. | `feed.tsx:4-10,434,477` · `tierlist.tsx:48-50,259-261` · `admin.tsx:27-31,107` · `home.tsx:319` |
| 7 | **Feed-click auto-scan is dead.** The mount effect calls `setXUrl(...)` then `analyze()` in the same tick. `analyze()` closes over the pre-update `xUrl` (`''`) and bails on `if (!url) return`. Clicking an unscanned project from the feed does nothing. | `home.tsx:378-443` vs `:494-497` |
| 8 | **The displayed FUD penalty is decorative.** The UI shows `-{fudPen} PENALTY` from `computeCMVAlphaScore()` (0-1000 scale), but `overall_score` comes straight from Claude or from `xOnlyScan`'s own separate penalty math (0-100 scale). The number shown was never subtracted from the score shown. | `home.tsx:94-124,1389-1390,2262` |
| 9 | **Dead pinned-tweet check.** `detectFUDSignals` reads `u.pinned_tweet_text` for the paid-campaign flag, but the pinned-tweet fetch was disabled to save X credits and the X API never returns that field anyway. Flag can never fire. | `api/xproject.ts:433` vs `:762` |

### 🟠 P1 — Reliability

| # | Issue | Location |
|---|---|---|
| 10 | **Server-side cache is per-lambda-instance.** A module-level `Map` on Vercel means each cold instance has its own; hit rate is unpredictable and the "saves X API credits" goal is only partly met. Needs Redis / Vercel KV / Supabase. | `api/xproject.ts:3` |
| 11 | **`max_tokens: 4096` vs a very large required JSON.** 17 metrics × (score + detail + signal) plus team, risks, opportunities, flags and an 8-point trend array. Truncation → unparseable JSON → silent fall-through to `xOnlyScan`. Users never learn the LLM path failed. | `api/claude.ts:26` |
| 12 | **DuckDuckGo HTML scraping from serverless IPs.** `websearch.ts` regex-parses DDG's HTML — blocked and rate-limited from datacenter ranges, and the markup changes without notice. It already has a fallback regex, which is a tell that the first one broke once. | `api/websearch.ts:37-63` |
| 13 | **`withTimeout` doesn't abort the underlying fetch.** `Promise.race` against a `setTimeout` that is never cleared; no `AbortController`. Timers stay pending. | `api/xproject.ts:14-18` |
| 14 | **Unthrottled CoinGecko polling from the browser.** `feed.tsx` fires one search + one price request per unique ticker every 60 s, from every open tab. Public CoinGecko will 429. | `src/pages/feed.tsx:23,122-136` |
| 14b | **DefiLlama `/hacks` and `/raises` may now be Pro-locked ($300/mo)** — DefiLlama's own SDK marks both as Pro, while `api/xproject.ts` still calls `api.llama.fi/hacks` keylessly. If they have moved behind the key, the hack-detection red flag is silently returning nothing and no error is surfaced. **Probe both from real egress.** | `api/xproject.ts:245` |
| 14c | **CoinGecko keyless is ~10–30 req/min, dynamic, and explicitly "not guaranteed"** — documented as unsuitable for production. The scanner and `feed.tsx`'s price poll both use it keylessly. A free Demo key raises this to a reliable 30/min and 10k/month at zero cost. | `xproject.ts:19` · `feed.tsx:23` |
| 15 | **`cryptocurrency.cv` news API is unverified.** Obscure endpoint, no key, no docs. Needs a live check — sentiment scoring silently no-ops if it's dead. | `api/xproject.ts:361` |
| 16 | **Admin "Rescan all" is a 50-minute foreground loop.** 30 s `setTimeout` between projects, in the browser tab, no resume. And it only refreshes `xproject` — it never re-runs Claude or rewrites Supabase, so the log message "refreshed" overstates what happened. | `src/pages/admin.tsx:48-70` |

### 🟡 P2 — Maintainability

| # | Issue | Location |
|---|---|---|
| 17 | **`src/lib/enrichment-engine.ts` (384 lines) is entirely unused.** Never imported. It's a third implementation of red-flag logic that already exists in `detectFUDSignals` and in `xOnlyScan`'s inline IIFE. | `src/lib/enrichment-engine.ts` |
| 18 | **`api/cryptorank.ts` is an orphan endpoint.** No client calls it; `xproject.ts` talks to CryptoRank directly. It's a live, unauthenticated proxy burning your CryptoRank key. | `api/cryptorank.ts` |
| 19 | **Red-flag logic exists in 3 places** that must be kept in sync by hand. Any new rule needs writing three times or it applies inconsistently depending on which path ran. | `xproject.ts:400` · `home.tsx:800-940` · `enrichment-engine.ts` |
| 20 | **`api/` is outside `tsconfig.json`'s `include`.** `npm run build` typechecks `src` only. Two real errors are sitting unreported: implicit `any` at `xproject.ts:387` and `:710`. | `tsconfig.json:19` |
| 21 | **`home.tsx` is 2,632 lines** — prompt, scoring, canvas rendering, ~650 lines of inline CSS and all JSX in one file. `analyze()` alone is ~600 lines. | `src/pages/home.tsx` |
| 22 | **No README, no `.env.example`, no tests, no linter, no CI.** Nine env vars are required and none are documented anywhere in the repo. | repo root |
| 23 | Dead code: `computeCombinedScore :89`, `tsq :125`, `T[].range`, `xd.pinned_tweet`. | `src/pages/home.tsx` |
| 24 | **Stale global CSS.** `index.css` sets a blue `#f0f4ff` body and Plus Jakarta Sans; every page overrides with a green `#f8faf8` and Outfit/JetBrains Mono. Fonts are `@import`-ed inline in 4 separate files (render-blocking, duplicated) *and* preloaded in `index.html` for a family nothing uses. | `src/index.css` · `index.html:8-10` |
| 25 | `index.html` references `/vite.svg` — not in `public/`. Favicon 404s. | `index.html:5` |
| 26 | Prompt fragility: the system prompt bans naming data sources 3 separate times in ALL CAPS, then names them itself in the instruction text. Signals the model kept leaking source names. | `home.tsx:191-260` |

---

## 5. Two scoring systems that disagree

This is worth calling out on its own, because it will confuse any future change to scoring.

| | LLM path | `xOnlyScan` fallback |
|---|---|---|
| Score source | Claude returns `overall_score` 0-100 | 8 weighted sub-scores → `rawScore` |
| Blend | none | `rawScore × 0.6 + (cmv_score/10) × 0.4` |
| Penalty | prompt-guided only | explicit `fudPenalty`, capped 400, ÷10 |
| Hard caps | none | hack → ≤30, dump → ≤40, bot+farm → ≤45 |
| Metric details | prose from the model | templated strings |

Both then run through the same `getTier()` (95 / 85 / 60 / 35). Two scans of the same project can
land in different tiers depending on whether the Anthropic call succeeded — with **no indication
in the UI** of which path produced the result. Persisted rows don't record it either.

A third scorer, `computeCMVAlphaScore()`, operates on a 0-1000 scale and only its penalty output
is ever displayed (see issue #8). A fourth, `cmv_score` in `xproject.ts:790-805`, scores the X
account itself 0-1000 and is shown as a separate "CMV X" tile.

---

## 6. Environment variables

None documented in-repo. Full set in use:

**Server (Vercel functions)**
| Var | Used by | Required? |
|---|---|---|
| `X_API_BEARER_TOKEN` | `xproject.ts`, `xuser.ts` | **yes** — no fallback |
| `ANTHROPIC_API_KEY` | `claude.ts` | no — falls back to `xOnlyScan` |
| `SUPABASE_URL` | `save-scan.ts` | yes, for persistence |
| `SUPABASE_ANON_KEY` | `save-scan.ts` | yes, for persistence |
| `CRYPTORANK_API_KEY` | `xproject.ts`, `cryptorank.ts` | optional — enrichment skipped if absent |
| `ROOTDATA_API_KEY` | `xproject.ts` | optional — enrichment skipped if absent |
| `VITE_ANTHROPIC_API_KEY` | `claude.ts` fallback | **remove** — see security #5 |

**Client (bundled into public JS)**
| Var | Used by |
|---|---|
| `VITE_SUPABASE_URL` | `home.tsx`, `feed.tsx`, `tierlist.tsx`, `admin.tsx` |
| `VITE_SUPABASE_ANON_KEY` | same |

**Supabase `scans` table columns** (inferred from `save-scan.ts` + read sites):
`id`, `handle` (unique — upsert key), `project_name`, `verdict`, `score`, `ticker`,
`token_price`, `market_cap_str`, `category`, `profile_image_url`, `good_highlights` (array),
`red_flag_count`, `full_result` (jsonb), `scanned_at`.

---

## 7. Suggested order of work

**Before anything else — the security items.** #1 (open Claude proxy) is the urgent one: it's a
live, unmetered spend path against your API key.

1. **Lock down the API layer.** Origin allowlist + a shared secret or signed request on
   `/api/claude` and `/api/save-scan`; ideally a per-IP rate limit. Delete `api/cryptorank.ts`.
2. **Move admin auth server-side.** Supabase Auth, or a serverless `/api/admin/*` guarded by a
   server-only env var. Then tighten RLS so anon can `SELECT` but not `DELETE`.
3. **Unify the verdict vocabulary** (#6). One exported constant consumed by all four pages, plus
   a one-time migration for existing Supabase rows. This is the single highest-visibility bug.
4. **Fix the feed-click auto-scan** (#7) — pass the handle into `analyze(handle?)` instead of
   relying on state, or trigger from an effect on `xUrl`.
5. **Make the score honest** (#8, and the §5 divergence). Either apply the displayed penalty or
   stop displaying it; persist a `scan_mode: 'llm' | 'heuristic'` field and surface it.
6. **Extract shared logic.** One `src/lib/scoring.ts` and one `src/lib/red-flags.ts` used by both
   paths; delete `enrichment-engine.ts` or make it the single source of truth.
7. **Durable cache** (#10) — Vercel KV or a Supabase `x_cache` table.
8. **Raise `max_tokens`** and log/surface parse failures instead of silently degrading (#11).
9. **Housekeeping**: add `api/**` to a tsconfig, fix the two `any`s, add `README.md` +
   `.env.example`, drop the dead code, fix the favicon, consolidate fonts and global CSS.
10. **Split `home.tsx`** into `lib/prompt.ts`, `lib/share-card.ts`, `styles/home.css` and
    per-section components.

---

## 8. Open questions for the next session

- Is the deployed Vercel project live, and are `ROOTDATA_API_KEY` / `CRYPTORANK_API_KEY` actually
  set there? Both enrichment paths silently no-op without them and half the funding/VC-tier data
  disappears.
- Is `cryptocurrency.cv` still up? (Could not verify — this audit ran in a sandbox with no
  outbound access to these hosts.)
- What are the current Supabase RLS policies on `scans`?
- Was the verdict vocabulary change (#6) intentional, and should existing rows be migrated or
  re-scanned?
- Is the X API tier paid? The code comments about "saving credits" (pinned tweet disabled,
  5 tweets instead of 20) suggest a tight budget that constrains what enrichment is possible.

---

## 9. Work log

Every session's changes, so the next one can pick up cold.

### 2026-08-22 · Session 1 — audit
- Full read of all 20 source files. Verified `npm install` + `npm run build` pass clean.
- Catalogued 26 issues with `file:line` refs, graded P0→P2. Wrote this file and `CLAUDE.md`.
- Committed `package-lock.json` (generated from the existing `package.json`; no version changes).
- **No application code touched.**

### 2026-08-22 · Session 2 — Alpha Engine direction
- Researched the 11 reference tools the owner uses. Identified the shared primitive:
  convergence (k trusted entities touching one target inside a window w).
- Wrote `ALPHA_ENGINE_SPEC.md` — the first-pass direction document.
- **No application code touched.**

### 2026-08-22 · Session 3 — master spec audit + Phase 1 plan
Responding to the owner's Master Build Spec (§56 deliverables A–M, §61 items 1–21).
- Re-researched all 15 reference tools with explicit verification levels, **not** reusing
  session 2's claims. 6 now VERIFIED, 3 STRONGLY INFERRED, 6 UNKNOWN.
- **Found 3 blockers that change the plan** — see `AUDIT_AND_PHASE1_PLAN.md`:
  1. Vercel **Hobby caps crons at once per day**; a 10-minute loop fails at deploy time.
  2. `GET /2/users/:id/following` is reported at **100 req/24h**, and rate limits do not lift
     with spend — the native X API likely cannot do follow-convergence at useful resolution.
  3. Whether the following endpoint returns newest-first swings social cost by **20×**.
- **Found a new P0**: prompt injection via X bio → system prompt (item 4b above).
- Corrected a session-2 attribution: **leak.me** is the clearest verified example of KOL
  follow-tracking (15m/30m/1h/2h timeframes); session 2 credited purealpha first.
- Wrote `AUDIT_AND_PHASE1_PLAN.md` — full audit, research matrix, provider matrix, schema,
  exact file plan, cost model, and the decisions needed before implementation.
- **No application code touched. Phase 1 awaits owner approval per §61.**

### 2026-08-22 · Session 3b — parallel research agents
Four background agents dispatched to close research gaps. Findings folded into
`AUDIT_AND_PHASE1_PLAN.md`:
- **985monitor.xyz established** — a working wallet-graph implementation of our convergence
  primitive. Three design lessons adopted: thresholds become config not constants; alerts grade
  into tiers rather than firing binary; entities are qualified by a liquidity/mcap floor *before*
  convergence is computed (the best cost lever found).
- **Corrected a Phase 1 error**: DexScreener has **no true new-pairs endpoint** — its profile and
  boost feeds are *promotion* signals, not *creation* signals. GeckoTerminal is the only free
  purpose-built new-pool feed. Roles swapped: GeckoTerminal primary, DexScreener enrichment.
- **Magic Eden shut EVM + Bitcoin in March 2026** with no migration support. Phase 4's mint
  primary becomes Alchemy (verified free tier: 30M CU/mo, NFT Activity webhooks).
- **Phase 2 should be push, not polled** — one Alchemy webhook carries 100k addresses free;
  Helius does the same for Solana. May remove the need for paid data entirely.
- Found two live risks to the *existing* scanner (items 14b, 14c above).

### 2026-08-22 · Session 3c — risk, wallet and mint research
- **Four named data sources are dead**: Reservoir (2025-10-15), SimpleHash (2025-03-27),
  **Zapper (2026-08-03 — 19 days ago)**, Sim by Dune (2026-08-01). `ALPHA_ENGINE_SPEC.md` named
  Reservoir and has been corrected in place.
- **Mint radar is an RPC-indexing problem, not an API-subscription problem.** A `Transfer`-from-
  `0x0` log subscription covers any EVM chain for $0 — including **Robinhood Chain** (ID 4663,
  Arbitrum Orbit L2, mainnet 2026-07-01) and **Stable** (ID 988, public RPC `rpc.stable.xyz`,
  mainnet 2025-12-08), which most NFT APIs don't cover. That is very likely why J7Tracker and
  MintGo chose them, and it is a free competitive opening.
- **Wallet convergence should be webhook-driven, not polled** — you pay per *event*, not per
  *wallet*. Free capacity: Helius 100k addresses, Alchemy 500k address-slots. The convergence
  counter then costs nothing; only threshold-crossers get metered enrichment.
- Wallet stack costs **$39/mo** (Birdeye Lite) or $0 without Solana PnL. Mint stack costs **$0**.
- **Risk engine is cheaper than assumed**: GoPlus is one free call returning ~15 indicators across
  EVM + Solana, and `xproject.ts` already produces the `(chain, address)` it needs.
- Wrote `RISK_ENGINE_RESEARCH.md` and `WALLET_MINT_RESEARCH.md`.
- **No application code touched.**

---

## 10. Planning documents

| Doc | Purpose |
|---|---|
| `CHECKPOINT.md` | This file — state of the codebase, issue list, work log |
| `CLAUDE.md` | Persistent memory: conventions and traps |
| `ALPHA_ENGINE_SPEC.md` | Product direction — the convergence thesis and Heat × Alpha model |
| `AUDIT_AND_PHASE1_PLAN.md` | **Current** — blockers, research matrix, schema, Phase 1 file plan |
| `RISK_ENGINE_RESEARCH.md` | Risk + scam detection sources, neutral wording, the checked/unchecked rule |
| `WALLET_MINT_RESEARCH.md` | Wallet intelligence + mint radar sources, dead providers, the two exotic chains |

Where these conflict, `AUDIT_AND_PHASE1_PLAN.md` wins — it is the most recently verified.
