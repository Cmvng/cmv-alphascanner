# Alpha Engine — Repository Audit & Phase 1 Implementation Plan

**Date:** 2026-08-22 · **Status:** AWAITING APPROVAL — no implementation started.
Responds to the Master Build Spec §56 (deliverables A–M) and §61 (items 1–21).
Supersedes cost/mechanism claims in `ALPHA_ENGINE_SPEC.md` where they conflict.

---

# ⛔ THREE BLOCKERS FOUND BEFORE ANY CODE

## ✅ BLOCKER 1 — RESOLVED: all-Railway, and Phase 1 needs **zero secrets**

**Updated 2026-08-22 after the owner confirmed they no longer use Vercel for this project.**
The earlier hybrid split is superseded — everything moves to Railway.

### Provisioned so far

| Resource | ID |
|---|---|
| Project `cmv-alpha-engine` | `512878a1-8f45-40aa-99e0-6adfd532622d` |
| Environment `production` | `43dbefc1-db4f-4f05-84c0-1e0f5a085f0a` |
| **Postgres** (managed template, `postgres-ssl:18`) | `573e9a60-fbc4-4ac2-a18c-580c3c9cf7cb` |
| Persistent volume at `/var/lib/postgresql/data` | `dc65671a-12c4-422a-ad4e-76653585d00d` |

### 🔑 Why no Supabase service-role key is needed

Railway's managed Postgres **auto-exposes** `DATABASE_URL`, `PGHOST`, `PGPORT`, `PGUSER`,
`PGPASSWORD`, `PGDATABASE`. Services consume it as a **reference variable**:

```
DATABASE_URL=${{Postgres.DATABASE_URL}}
```

Nothing is pasted, nothing is fetched, and a credential rotation propagates to every consumer
automatically. **The Alpha Engine owns its own database outright**, so:

- Phase 1 writes go to Railway Postgres → **no Supabase write access needed**
- Phase 1 reads come from Railway Postgres → **no Supabase read access needed**
- The existing `scans` table stays in Supabase, read by the frontend with the **anon key that is
  public by design and already in the build**

**Net: Phase 1 requires no new credential from the owner at all.** That also sidesteps security
issue #4 entirely — there is no anon-key write path to abuse, because the engine's data never
touches Supabase.

### Data topology

| Store | Holds | Written by | Read by |
|---|---|---|---|
| **Railway Postgres** *(new)* | `targets`, `signal_events`, `heat_history`, `signal_sources`, `signal_config`, `cron_runs` | worker only, over private networking | `api/radar` |
| **Supabase** *(existing, unchanged)* | `scans` | the scan pipeline | feed · tierlist · admin · FeaturedProjects |

**End state (not Phase 1):** fold `scans` into Railway Postgres and retire Supabase. That kills
the anon-key-delete hole permanently and leaves one database. It needs a data export only the
owner can run, so it is a deliberate follow-up, not a Phase 1 risk.

### Services to create (once Phase 1 code exists)

| Service | Type | Role |
|---|---|---|
| `web` | Static (Caddy) | the Vite SPA from `dist/` |
| `api` | Node | the ported `api/*` handlers + `api/radar` |
| `worker` | Node, always-on | subscriptions, in-process scheduler, webhook receiver |
| `Postgres` | ✅ created | engine state |

### Migration off Vercel

- Delete `vercel.json`; drop `@vercel/node`.
- The `api/*` handlers use `VercelRequest`/`VercelResponse`, which are structurally
  `IncomingMessage`/`ServerResponse` — **a ~30-line adapter lets every existing handler run
  unchanged under a Node server.** No rewrite of scan logic.
- ⚠️ **Open question:** is `cmv-alphascanner.vercel.app` still serving today? That decides whether
  this is a live migration (needs a DNS/domain cutover plan) or a fresh deploy.

---

## Superseded: the original hybrid reasoning

*Kept because the WebSocket argument is the load-bearing one and still applies.*

### First, a correction

The session was **not** connected to Vercel. No Vercel CLI, no `VERCEL_*` token, no Vercel MCP
tooling. It **is** authenticated to **Railway** as `cmvng`. So the choice was not "Vercel or
Railway" — Railway was the only platform actually reachable from here.

### The decision is not about cron limits — it is about WebSockets

Hobby's once-per-day cron cadence was the *presenting* problem. The real one is deeper, and the
research in `WALLET_MINT_RESEARCH.md` made it unavoidable. The correct architecture needs
**persistent WebSocket connections**:

| Signal | Mechanism |
|---|---|
| Mint detection, any EVM chain | RPC log subscription — `Transfer` where `from == 0x0` |
| Marketplace events | OpenSea **Stream API** (WebSocket, free, doesn't consume REST limit) |
| Solana realtime | Helius LaserStream / `transactionSubscribe` |

Vercel's own guidance is explicit:

> *"If your project involves background jobs, long-running processes, WebSocket connections, queue
> processing, file handling, or anything that needs persistent state between requests, Vercel
> serverless functions are not the right environment."*

That is a verbatim description of the Alpha Engine. Vercel added native WebSocket support in
public beta (June 2026), but connections are **pinned to a function's max duration** with no
cross-instance broadcast — useless for holding an indefinite log subscription. Forcing it onto
Vercel means falling back to polling, which the research already ruled out: *a 4,444-piece free
mint can complete in under two minutes.*

### The split

| Runs where | What | Why |
|---|---|---|
| **Vercel** *(unchanged, stays Hobby)* | The Vite SPA, `/api/xproject`, `/api/claude`, `/api/save-scan`, `/api/xuser`, `/api/websearch` | It works, it is deployed, it is request/response — exactly what serverless is good at. **Zero migration risk.** |
| **Railway** *(new)* | `alpha-engine` worker: WebSocket subscriptions, in-process scheduler, webhook receiver | Long-lived process. No platform cron cap, no function timeout, holds connections indefinitely. |
| **Supabase** *(shared)* | `targets`, `signal_events`, `heat_history`, … | Already the natural seam between the two halves. |

### Why not migrate everything to Railway

The frontend and scan API work today on a live domain with analytics attached. Moving them buys
nothing and risks a working product. Supabase already sits between the two halves, so the split
costs no extra plumbing.

### Cost — the hybrid is *cheaper* than the Vercel-only fix

| Option | Monthly | Verdict |
|---|---|---|
| Vercel Pro (to unlock cron) | **$20** | Still cannot hold WebSockets. Wrong architecture, higher price. |
| **Vercel Hobby + Railway Hobby** | **~$5** | Railway Hobby is $5/mo *including* $5 of usage; a small Node worker fits inside it. |

**Blocker 1 is closed. No Vercel Pro upgrade needed, no `crons` key in `vercel.json`, and the
scheduler moves in-process where it has no cadence limit at all.**

## BLOCKER 2 — The X API almost certainly cannot do follow-convergence

Per §33 I did not reuse the earlier document's numbers. Current findings:

- The **free tier is discontinued** for new developers; default is **pay-per-use** (~$0.005/post
  read, 2M reads/mo cap).
- **Legacy Basic was deprecated entirely and its subscribers migrated to pay-per-use after
  1 June 2026.** Legacy Pro ($5,000/mo) persists for existing subscribers.
- `GET /2/users/:id/following` is reported at **100 requests / 24 hours**. *(STRONGLY INFERRED —
  `docs.x.com` is unreachable from this sandbox; verify directly.)*
- Critically: **rate limits are separate from credits. Spending more does not lift them.**

At 100 requests/day you cannot poll 50 KOLs' following lists at any useful cadence — leak.me
offers 15-minute resolution. **The native X API is the wrong tool for this signal.**

Third-party public-data providers price this per item and have no such cap:

| Provider | Price | Shape |
|---|---|---|
| TwitterAPI.io | $0.00015 / read (~$0.15 per 1k) | REST + WebSocket |
| SocialData | $0.0002 / item (~$0.20 per 1k) | No dev account needed |
| Netrows | 50 credits / 200 profiles | 26 endpoints incl. following |

## BLOCKER 3 — One unknown swings Phase 3 cost by 20×

**Does the following-list endpoint return newest-first?**

- **If yes** → poll only the first page (~100 entries) per KOL to catch new follows.
  50 KOLs × 100 items = 5,000 items/sweep ≈ **$1.00/sweep** (SocialData).
  → 6h cadence ≈ **$120/mo** · 1h cadence ≈ **$720/mo**
- **If no** → you must pull each KOL's *entire* following list and diff it.
  50 KOLs × ~2,000 = 100,000 items/sweep ≈ **$20/sweep** → 6h ≈ **$2,400/mo**. Not viable.

This is the single most important number in the project and it is cheap to test: one API call
against one provider. **I will not design Phase 3 until it is answered.**

### Cheaper Phase 3 alternative (the Uxento model)

Uxento does **mention** convergence, not **follow** convergence: it watches alpha groups and X
for contract addresses and flags Silver at 3+ mentions, Gold at 8+. Polling an **X List
timeline** for posts is far cheaper than sweeping follow graphs and gives better cadence. The
signal is slightly later than a follow but an order of magnitude cheaper. Worth doing first.

---

# E. REFERENCE TOOL RESEARCH MATRIX

Per §2 and §57. Verification levels are honest — `UNKNOWN` means I could not observe it, not
that it does not exist. Several domains are blocked by this sandbox's egress proxy.

| Tool | Verification | Observed function | Signals used | Our equivalent |
|---|---|---|---|---|
| **leak.me** | ✅ **VERIFIED** | Tracks the *followings* of a large set of X KOLs to spot early alpha. Timeframes **15m / 30m / 1h / 2h**. Public example: "20 KOLs followed an account in the last 24h". 24h data free. | KOL follow events; windowed distinct-follower count | Social convergence engine (§7) |
| **SilentAlpha** | ✅ **VERIFIED** | Telegram bot alerting when tracked influencers follow new accounts. Explicitly values *"a fresh account with few followers and a recent creation date"*. Tiers: 5 / 50 / 100 tracked accounts. | Follow + obscurity + account novelty | Same engine + Telegram delivery (§26) |
| **Uxento** | ✅ **VERIFIED** | CA tracker (contract addresses posted in sourced alpha groups), CT tracker (X mentions/sentiment realtime), DEX tracker, Streamflow lock tracker, Truth Social tracker, Telegram tracker, news feed. **Silver = 3+ mentions, Gold = 8+ mentions.** AIO mode, 6 alert sounds, per-account notifications. | Mention convergence with explicit thresholds | Mention convergence + tiered badges |
| **J7Tracker** | ✅ **VERIFIED** | "Fastest deployer and social tracker." Wallet activity across **Ethereum, Robinhood Chain, Solana**; Solana rug/scam scanning; news; voice AI assistant. Read-only, custodies nothing. | Deployer history, wallet events, contract risk | Wallet engine (§10) + risk engine (§21) |
| **MintGo** (`mintgo.fun`) | ✅ **VERIFIED** | Real-time NFT mint intelligence across **Ethereum, Robinhood, Stable**. Live activity, trending collections, minting tools. | Mint events, mint velocity | Mint radar (§12) |
| **purealpha.app** | 🟡 **STRONGLY INFERRED** | Tracks newly-followed crypto accounts across a handpicked signal network. "Hot ranks" described as follow **convergence + recency**; "New catches" = freshest per sweep. *(Site egress-blocked; from search index.)* | Follow convergence + recency decay | Heat score = their "hot rank" |
| **Waypoint MintScan** | 🟡 **STRONGLY INFERRED** | View collection details; verify contract, team and mint details before transacting. | Pre-mint verification | Mint risk panel |
| **app.moni.ai** | ✅ **VERIFIED** | Smart accounts, mindshare, narrative signals, KOL scoring. 20k+ projects, 30k+ scored smart accounts, 300M+ smart mentions since 2021, 100k+ events/day, 2TB+ history. **Documented commercial API** (`b2b@getmoni.io`). | Social graph quality, mindshare | **Buy-vs-build decision** — they have solved Phase 3 |
| **alphagate.io** | 🟡 **STRONGLY INFERRED** | Emerging-project discovery and tracking; account history, followers/followings, social links, scam spotting. Chrome extension overlaying X / Photon / BullX. `docs.alphagate.io` exists. *(Egress-blocked.)* | Account history, risk flags | Possible provider adapter |
| **985monitor.xyz** | ✅ **VERIFIED**¹ | **The most instructive tool on the list.** Chrome extension overlaying `gmgn.ai` and `pro.xxyy.io` wallet panels; fires when **N wallets buy the same token within X minutes** — *both N and the window are user-set*. **4-tier graded audio escalation** (not binary). **De-duplicates by contract address.** Plus: "Smart Money Catcher" tracking wallets holding **≥1M** on Pump.fun/Four.meme, classifying **new position / add / reduce**, watchlist gated at **$1M market cap**, refresh **5 min**. FOMO leaderboard ranking KOL wallets by **realized profit over 24h/7d/30d/all-time**, refreshed **hourly**. Chinese-language, HK-hosted. | **Wallet convergence — validates the whole design** |
| **Redacted Systems** | 🟡 **STRONGLY INFERRED** | Telegram bot `@redactedsystemsbot`; self-describes as *"the fastest social media monitor bot on the market"* with *"custom personalized monitors"*. Independently catalogued as an X social monitor. **X account is protected**, no website resolves — which is why nothing else is public. All feature specifics UNKNOWN. | Social monitor (unspecified) |
| `wind.jokkimon.club` | ⚪ **UNKNOWN** | **Host is live behind Cloudflare** (apex `jokkimon.club` too) — a deliberately configured property, not a parked name. **Zero index presence.** | — |
| `guap.wtf` | ⚪ **UNKNOWN** | **Host is live** (`156.67.104.212`, no CDN). Zero index presence. No NFT/mint function established — the domain name is not evidence. | — |
| `alphatrack.xyz` | ⚪ **UNKNOWN** | **Host is live** (AWS `us-east-1`). Zero index presence. ⚠️ **Do not conflate** with `alphatrace.xyz` (real DEX PnL/wallet tracker), `alphatrack.cc`, or `alphatrack.app` (HR software) — all unrelated. | — |
| **JustLarps** | ⚪ **UNKNOWN** | `justlarps.com` / `.xyz` **do not resolve**. No X, Telegram, GitHub or listing found. Existence unestablished. ⚠️ Unrelated near-names in this niche: LarpBot, larpscanner.fun, `@LARPbot3000`. Note "LARP wallet" tools *generate* fake screenshots — opposite category. | Scam/LARP layer (§22) |

¹ 985monitor's own pages (`/home/`, `/terminal/`, `/wallet/`, `/fomo/`, `/smartmoney/`) were read via the
search index rather than loaded directly — the domain is egress-blocked here. Primary-source
self-description, indirectly retrieved, consistent across six independent queries.

### ⚠️ The competitive set is substantially private

Three of the four undocumented tools are **live hosts with zero search-index presence**, two behind
Cloudflare. That is the signature of invite-only, word-of-mouth tooling. Any market-sizing or
feature-gap claim built on these names would rest on a single well-documented example. Treat the
mechanism findings as drawn from 985monitor plus adjacent tools, and don't over-generalise.

### What the verified set proves

Five of six verified tools compute **convergence over a curated entity set**, and two publish
their thresholds outright (leak.me: 20 KOLs/24h · Uxento: 3+ / 8+ mentions). SilentAlpha states
the obscurity and novelty terms explicitly. **The design in §7/§14/§15 is confirmed by observed
product behaviour, not inferred.**

The differentiators none of them appear to have: **independence weighting** (§18 — a repost is
not a second discovery), **cross-source confirmation** (§17), and **outcome backtesting** (§28).
Those are where this product can be genuinely better rather than merely equivalent.

### Three design lessons that change Phase 1

985monitor is a working implementation of the exact primitive in §7, and three of its choices are
better than what I had planned:

1. **Thresholds must be configuration, not constants.** 985monitor lets the user set both `k`
   (wallet count) and `w` (window). That is a tacit admission that **the correct threshold is
   regime-dependent** — what signals in a hot market is noise in a dead one. My `heat.ts` design
   had these as constants. **Changed:** they become per-signal-type config rows, tunable without
   a deploy.
2. **Grade the alert, don't gate it.** Their escalation is **4 tiers of increasing urgency**, not
   a binary fire/don't-fire. Uxento does the same thing (Silver 3+ / Gold 8+). **Changed:** heat
   bands drive alert *severity*, and the §26 alert engine sends tiered notifications rather than
   one threshold crossing.
3. **Qualify entities *before* computing convergence.** They only track wallets holding **≥1M**
   and only admit tokens above **$1M market cap**. This is a cheap pre-filter that collapses the
   search space — and it is *why* a 5-minute refresh is affordable at all. **Changed:** Phase 1
   ingestion applies a configurable liquidity/market-cap floor at write time, so `signal_events`
   never fills with dust. This is the single most useful cost-control lever found in the research.

A fourth lesson lands on **§30 (trust engine)**: their trusted-entity set is not hand-curated, it
is **derived hourly from realized PnL over 24h/7d/30d/all-time windows**. The leaderboard *is* the
signal network. That is the right long-term shape — a curated seed list is a Phase-3 bootstrap,
not the destination.

Finally, 985monitor **builds none of its own data** — it overlays existing indexers and reads
Pump.fun / Four.meme / Bonk / BAGS. That directly validates the Phase 1 bet: the discovery half
can be onchain-only and near-free by riding indexers that already exist.

---

# §61 ITEMS 1–21 — CURRENT STATE AUDIT

## 1. Existing architecture
Vite 5 + React 18 + TypeScript SPA on Vercel. No router (manual `window.location.pathname` in
`src/App.tsx`), no state library, no CSS framework, no test runner, no linter. Runtime deps are
**React + ReactDOM only**. 5,855 lines across 20 files. Node 22, npm 10. `npm run build`
(`tsc && vite build`) passes clean.

## 2. Existing scanner pipeline
`src/pages/home.tsx:494 analyze()` — ~600 lines:
1. Parse/sanitise handle → 2. `localStorage` cache (`cmv_scan_v4_*`) with a Supabase existence
check → 3. `GET /api/xproject` (X profile + 5 tweets + 11 enrichment sources in
`Promise.allSettled` with per-source `withTimeout`) → 4. non-crypto rejection gate →
5. `GET /api/websearch` → 6. `POST /api/claude` → 7. brace-balancing JSON parse (`xjson:129`) →
8. **any** failure falls through to `xOnlyScan():617`, a ~450-line deterministic scorer →
9. persist to `localStorage` + `POST /api/save-scan`.

**Reusable as the judgement engine with near-zero modification.** This is the strongest asset in
the repo.

## 3. Existing database
Supabase, accessed by **raw REST only** (no `@supabase/supabase-js`). One table, `scans`:
`id`, `handle` (unique upsert key), `project_name`, `verdict`, `score`, `ticker`, `token_price`,
`market_cap_str`, `category`, `profile_image_url`, `good_highlights[]`, `red_flag_count`,
`full_result` (jsonb), `scanned_at`.
**Unknown:** actual RLS policies, indexes, whether a service-role key exists. Needs your input.

## 4. Existing API routes
`api/xproject.ts` (1000 L) · `api/claude.ts` (37 L) · `api/websearch.ts` (106 L) ·
`api/save-scan.ts` (86 L) · `api/xuser.ts` (40 L) · `api/cryptorank.ts` (44 L, **orphan — no
caller**).

## 5. Existing authentication
**None anywhere.** No user accounts, no sessions, no API auth. Admin is a client-side string
constant plus a fake-404 and a `cmvadm` keystroke sequence.

## 6. Security vulnerabilities *(deliverable C)*
| # | Severity | Issue |
|---|---|---|
| 1 | 🔴 CRITICAL | `/api/claude` is an **open unauthenticated proxy to the Anthropic key** — `CORS: *`, no auth, no rate limit, caller-controlled `system` **and** `messages`. Anyone can bill arbitrary prompts to your account. |
| 2 | 🔴 CRITICAL | **Prompt injection is already live.** `buildSystemPrompt` (`home.tsx:191`) interpolates the target's X bio and recent tweets straight into the system prompt. A project whose bio says "ignore previous instructions…" is injecting into your LLM today. Directly contra §42 — and the discovery engine ingests *far* more untrusted text. |
| 3 | 🔴 HIGH | Admin password is a client-side constant (`admin.tsx:3`), shipped in the bundle. |
| 4 | 🔴 HIGH | Admin deletes call Supabase directly with the **anon key** → RLS must permit anon `DELETE` → anyone with the public key can wipe `scans`. |
| 5 | 🟠 MED | `/api/save-scan` unauthenticated — anyone can write to the public feed. |
| 6 | 🟠 MED | `api/cryptorank.ts` is a live unauthenticated proxy burning your CryptoRank key, called by nothing. |
| 7 | 🟡 LOW | `VITE_ANTHROPIC_API_KEY` accepted as fallback (`claude.ts:11`) — the `VITE_` prefix invites bundling it publicly. |
| 8 | 🟡 LOW | `api/**` excluded from `tsconfig.json` → two implicit-`any` errors unreported (`xproject.ts:387`, `:710`). |

No SSRF found: no route fetches a caller-supplied URL. `websearch.ts` builds DDG URLs from a
query param — bounded, but the response is untrusted text fed toward an LLM (see #2).

## 7. Deployment configuration
`vercel.json`: `buildCommand: npm run build`, output `dist`, framework `vite`, `maxDuration` 60s
for `api/claude.ts` and 30s for `api/xproject.ts`, SPA rewrites. **No `crons` key.**

## 8. Existing cron capabilities
**None.** No cron config, no scheduler, no queue, no background worker. See Blocker 1.

## 9. Existing external APIs
X API v2 · Anthropic · Supabase REST · CoinGecko · DefiLlama (+hacks) · RootData · DexScreener ·
GeckoTerminal · CoinPaprika · CryptoRank · cryptocurrency.cv (news, **unverified/possibly dead**)
· DuckDuckGo (Instant Answer + HTML scrape, **fragile from datacenter IPs**).

## 10. Existing scoring logic
Four scales coexist: `overall_score` 0-100 (headline) · `computeCMVAlphaScore()` 0-1000 (only its
*penalty* is displayed, and it is **not** subtracted from the displayed score — a live bug) ·
`cmv_score` 0-1000 (X-account quality) · per-metric 0-100. `getTier()` thresholds 95/85/60/35.
Red-flag logic is duplicated in **three** places (`xproject.ts:400`, `home.tsx:~800-940`, and the
entirely unused `src/lib/enrichment-engine.ts`).

## 11. Existing UI routes
`/` home/scan · `/feed` · `/tierlist` · `/admin`. Styling is inline `<style>` per page with CSS
custom properties (`--green #16a34a`, `--text-1 #0f1a12`, `--mono`), Outfit + JetBrains Mono.

## 12. What can be reused
The whole `xproject` enrichment fan-out and its `withTimeout`/`allSettled` discipline (§31 asks
for exactly this — it already exists) · the scan pipeline as judgement engine · `xOnlyScan` as the
LLM-free fallback (§43-aligned) · the Supabase REST access pattern · the design system · the
token-price cascade with its 10× sanity guard and `CHAIN_TOKENS` blocklist.

## 13. What must be changed
Security items 1–5 · verdict vocabulary drift (`home.tsx` emits `ALPHA PLAY/FARM IT/ENGAGE/
OBSERVE/AVOID`; `feed`/`tierlist`/`admin` still expect `FARM IT/CREATE CONTENT/WATCH/SKIP`, so
the feed's tier view silently drops most scans) · `api/**` into a tsconfig · `/` becomes `/radar`,
scan moves to `/scan`.

## 14. What must NOT be changed
`api/xproject.ts` enrichment logic · `xOnlyScan()` scoring · the `scans` table shape · the visual
language · `feed.tsx` / `tierlist.tsx` beyond the verdict-constant fix. **No new runtime
dependencies** without your approval (per `CLAUDE.md`).

## 15. Exact files to modify — Phase 1
| File | Change |
|---|---|
| `api/claude.ts` | Origin allowlist + `INTERNAL_API_SECRET` + rate limit; drop `VITE_` fallback |
| `api/save-scan.ts` | Same auth guard |
| `api/cryptorank.ts` | **Delete** (orphan, leaks key) |
| `src/pages/admin.tsx` | Remove client-side password; route privileged ops server-side |
| `src/App.tsx` | Add `/radar` (new home) and `/scan`; keep `/feed`, `/tierlist`, `/admin` |
| `vercel.json` | `maxDuration` for `api/radar.ts`. **No `crons` key** — scheduling moved to Railway |
| `tsconfig.json` | Reference new `tsconfig.api.json` |
| `package.json` | Build runs both tsconfigs; **vitest as devDependency — needs approval** |
| `src/pages/home.tsx` | Extract shared verdict constants only; scoring untouched |
| `CLAUDE.md` | Document the new architecture |

## 16. Exact new files — Phase 1
```
supabase/migrations/0001_alpha_engine.sql   schema (you run it — I will not migrate blind)
src/lib/providers/types.ts                  DiscoveryProvider, SignalEvent, Target, HealthStatus
src/lib/providers/dexscreener.ts            adapter
src/lib/providers/geckoterminal.ts          adapter
src/lib/providers/registry.ts               registration + health roll-up
src/lib/heat.ts                             PURE scoring — no I/O, fully testable
src/lib/heat.test.ts                        unit tests per §49
src/lib/dedupe.ts                           deterministic idempotency keys (§39)
src/lib/ratelimit.ts                        token bucket + circuit breaker (§40)
src/lib/verdicts.ts                         shared verdict constants (fixes the drift bug)
api/radar.ts                                ranked read endpoint (Vercel — reads only)

worker/                                     ← NEW, deploys to Railway
  src/index.ts                              worker entrypoint + graceful shutdown
  src/scheduler.ts                          in-process schedule (no platform cron cap)
  src/jobs/ingest-onchain.ts                GeckoTerminal + DexScreener → signal_events
  src/jobs/compute-heat.ts                  recompute heat → targets + heat_history
  src/subscriptions/                        WebSocket holders (Phase 4 mint logs, OpenSea Stream)
  src/lib/supabase-admin.ts                 service-role client
  Dockerfile / railway.json                 build + deploy config
src/pages/radar.tsx                         the radar UI
.env.example                                all 12 env vars documented
tsconfig.api.json                           typechecks api/**
```

## 17. Database migrations required *(deliverable F)*
Phase 1 subset of the §37 table list — I am **not** creating all 24 tables up front. Columns
abbreviated; full DDL ships with the migration.

```sql
create table signal_sources (            -- provider health, §31
  id text primary key, display_name text, status text, last_ok_at timestamptz,
  error_rate numeric, latency_ms int, rate_limit_per_min int, notes text
);

create table targets (                   -- canonical discovered things, §5
  id uuid primary key default gen_random_uuid(),
  kind text not null,                    -- 'token' | 'x_account' | 'nft_collection'
  chain text, contract_address text, x_handle text, name text, symbol text,
  audience_size bigint, liquidity_usd numeric, market_cap_usd numeric,
  first_seen_at timestamptz not null default now(), last_event_at timestamptz,
  heat numeric default 0, heat_components jsonb,   -- §15 explainability
  alpha_score int, risk_level text, confidence numeric,
  status text default 'new'
);
create unique index on targets (kind, chain, lower(contract_address))
  where contract_address is not null;
create unique index on targets (kind, lower(x_handle))
  where x_handle is not null;
create index on targets (heat desc, last_event_at desc);

create table signal_events (             -- normalized event bus, §4
  id uuid primary key default gen_random_uuid(),
  target_id uuid references targets(id) on delete cascade,
  entity_id uuid,                        -- null in Phase 1 (no social entities yet)
  source text not null references signal_sources(id),
  event_type text not null,              -- 'new_pool' | 'volume_spike' | 'liquidity_spike' …
  occurred_at timestamptz not null, ingested_at timestamptz default now(),
  confidence numeric default 0.5, dedupe_key text not null unique,   -- §39
  raw jsonb, raw_reference text          -- §36 provenance
);
create index on signal_events (target_id, occurred_at desc);
create index on signal_events (source, occurred_at desc);

create table heat_history (              -- §25 time series
  target_id uuid references targets(id) on delete cascade,
  heat numeric not null, components jsonb, computed_at timestamptz default now(),
  primary key (target_id, computed_at)
);

create table signal_config (             -- thresholds are DATA, not constants (985monitor lesson)
  key text primary key,                  -- 'half_life.new_pool' | 'floor.liquidity_usd' | 'k.wallet_buy' …
  value numeric not null, unit text, description text, updated_at timestamptz default now()
);
-- seeded with: per-event half-lives, the k/w convergence params, and the
-- liquidity + market-cap qualification floors. Tunable without a deploy.

create table cron_runs (                 -- §38 observability + locking
  id uuid primary key default gen_random_uuid(),
  job text not null, started_at timestamptz default now(), finished_at timestamptz,
  status text, events_written int, errors jsonb, lock_key text unique
);
```
RLS: `anon` gets `SELECT` on `targets`/`heat_history` only. All writes require the service-role
key, server-side. This also fixes vulnerability #4.

## 18. Provider integrations *(deliverable D)*

### ⚠️ Correction to the earlier plan

**DexScreener has no true new-pairs endpoint.** Its `token-profiles` and `token-boosts` feeds are
**promotion** signals, not **creation** signals — a token appears there because someone paid to
boost it, not because it was just deployed. My earlier plan treated it as a co-primary discovery
source. That was wrong.

**GeckoTerminal is the only free provider with a purpose-built new-pool feed.** Roles corrected:

| Provider | Role | Key endpoints | Auth | Rate limit | Cost |
|---|---|---|---|---|---|
| **GeckoTerminal** | **PRIMARY discovery** | `/networks/new_pools` (global sweep) · `/networks/{n}/new_pools` | none | **30/min** | $0 |
| **DexScreener** | **Enrichment + failover** | `/token-pairs/v1/{chain}/{token}` · `/latest/dex/search` · `/tokens/v1/…` | none | **60/min** (profile/boost) · **300/min** (pairs) | $0 |

One global GeckoTerminal call per minute plus a few per-chain calls stays well inside 30/min and
surfaces pools within a minute or two of creation — the right resolution for a convergence engine.
DexScreener then enriches every candidate with liquidity, volume and socials on a separate 300/min
budget. **Different vendors, independent buckets** — a genuine failover pair, not a shared failure
mode.

**Two build-time caveats:**
- GeckoTerminal is officially **Beta and subject to change**. Pin `Accept: application/json;version=…`
  — but the long-quoted `20230302` token **could not be re-verified**; confirm the current value
  before shipping.
- Solana public RPC: docs now show `https://api.mainnet.solana.com`, while the ecosystem still
  widely uses `api.mainnet-beta.solana.com`. **Verify which host answers before hard-coding.**
  Base public RPC is **HTTP only — no `eth_subscribe`/log subscriptions**, so Base needs polling
  or a provider.

### Later-phase providers (verified, informs Phases 2 and 4)

| Provider | Role | Free tier | Verification |
|---|---|---|---|
| **Alchemy** | **Push infra for EVM** — Address Activity webhooks (**up to 100k addresses each**), NFT Activity webhooks (mints = transfer from `0x0`), Custom webhooks on contract creation | **30M CU/mo, 500 CU/s, 5 apps, 5 webhooks**. PAYG $0.45/1M CU | ✅ **VERIFIED** from Alchemy's official docs source repo |
| **Helius** | **Push infra for Solana** — parsed swaps/mints, DAS | **1M credits/mo, 10 RPC req/s, 2 DAS req/s, 1 webhook (up to 100k addresses)** | 🟡 inferred |
| **Birdeye** | Solana wallet PnL / smart-money depth | 30k CU/mo (burns in days); wallet APIs capped 5 rps everywhere | 🟡 inferred |
| **OpenSea v2** | EVM NFT marketplace context | Self-serve key, **600 reads/hour**, and **keys expire** | 🟡 inferred |
| **Magic Eden** | Solana NFT only | 120 QPM Solana | 🟡 inferred |

### 🔴 Magic Eden contracted hard in 2026 — do not build on it

Magic Eden **shut its Bitcoin Ordinals and EVM marketplaces in early March 2026**; the Bitcoin API
and backend were fully shut down on **27 March 2026**, and the multi-chain wallet closed in April.
The company stated it would provide **no migration tooling, no alternative-infrastructure
recommendations, and no developer support**. Solana survives. Treat the whole surface as
strategically unstable.

**Consequence for Phase 4:** the mint radar's primary becomes **Alchemy**, not Magic Eden — its
NFT Activity webhook is push-based, multi-chain EVM, and free. OpenSea's `event_type=mint` is a
poll-only supplement at 600 reads/hour with expiring keys. Magic Eden is Solana-only context.

**Consequence for Phase 2:** wallet convergence should be **push, not polled**. One Alchemy Address
Activity webhook carries up to 100,000 tracked addresses on the free tier; Helius does the same for
Solana. That is faster *and* cheaper than any cron sweep, and it means Phase 2 may not need paid
data at all.

### 🟠 A live risk to the existing scanner

DefiLlama's official SDK now marks **`getRaises()` and `getHacks()` as Pro-locked** ($300/mo),
while third-party code still calls them keylessly. `api/xproject.ts` calls `api.llama.fi/hacks`
**keylessly today** — so the hack-detection red flag may already be silently returning nothing.
Also, CoinGecko keyless is **~10–30/min, dynamic and explicitly not guaranteed**; a free Demo key
lifts that to a reliable 30/min and 10k/month. Both are cheap fixes worth folding into Phase 1.
*(Probe both from real egress — this sandbox cannot reach them.)*

## 19. Testing strategy *(deliverable K)*
Needs **vitest** (devDependency — approval required). Every §49 case:
`heat.test.ts` — 5 independent entities → convergence rises · 1 entity repeated 20× → **does
not** equal 20 signals · event at exactly one half-life → ~50% contribution · large-audience
target → obscurity bonus suppressed · `dedupe.test.ts` — identical event twice → one row ·
`providers.test.ts` — provider throws → pipeline continues, `source_health` marked degraded.
Fixtures are synthetic; **no live network in tests**.

## 20. Estimated API costs *(deliverable L)*
| Phase | Monthly |
|---|---|
| **Phase 1** | **$0 providers** + $0–20 hosting (Blocker 1) |
| Phase 2 wallets | $0–50 (public RPCs / free tiers) |
| Phase 3 social | **$120–720** (Blocker 3) — or Moni licence |
| Phase 4 mints | $0 (Magic Eden 120 QPM free, OpenSea free tier) |
| Anthropic | Only on heat-threshold crossings, not per event (§43). At ~20 auto-scans/day on Haiku ≈ **$3–8/mo** |

Phase 1 is genuinely $0 in provider spend. That is the point of sequencing it first.

## 21. Unknowns requiring verification *(deliverable M)*
| # | Unknown | Impact | How to resolve |
|---|---|---|---|
| 1 | **Vercel plan** | Blocks all crons | Check dashboard |
| 2 | **Following-list ordering** | 20× Phase 3 cost | One API call to SocialData |
| 3 | X tier on `X_API_BEARER_TOKEN` | Phase 3 viability | X developer portal |
| 4 | Supabase RLS + service-role key | Blocks secure writes | Supabase dashboard |
| 5 | `docs.alphagate.io` contents | Possible free provider | Egress-blocked here — you check |
| 6 | Moni API pricing | Buy-vs-build on Phase 3 | Email `b2b@getmoni.io` |
| 7 | What 985monitor / jokkimon / j7tracker-beyond-search / guap / alphatrack / Redacted / JustLarps actually show | Feature gaps | One screenshot each |
| 8 | `cryptocurrency.cv` alive? | Dead enrichment source | Curl from your network |
| 9 | Target chains | Scopes ingestion | Your call — note J7Tracker and MintGo both cover **Robinhood Chain** |

---

# PHASE 1 IMPLEMENTATION PLAN

**Goal:** a working always-on discovery feed at **$0 provider cost**, no X API, no LLM in the
scoring path.

**Definition of done (subset of §60):** targets appear with no user input · two independent
providers create events · events normalized into one model · duplicate events collapse ·
heat changes over time and is inspectable component-by-component · a provider failure leaves the
pipeline running · every score explainable in the UI · no fake data anywhere (§48).

### Step 1 — P0 security *(must land first)*
Auth on `/api/claude` and `/api/save-scan`; delete `api/cryptorank.ts`; move admin server-side;
**wrap all externally-sourced text in explicit data boundaries before it reaches the LLM** (§42) —
this fixes the live injection hole and is prerequisite to ingesting far more untrusted text.

### Step 2 — Schema
Deliver `0001_alpha_engine.sql`. **You run it.** I do not migrate a database I cannot inspect.

### Step 3 — Provider abstraction (§32)
`DiscoveryProvider` interface — `discoverTargets()`, `getEvents()`, `healthCheck()`,
`rateLimit()`, `sourceMetadata()`. DexScreener and GeckoTerminal adapters behind it. No provider
name appears outside its own adapter file.

### Step 4 — Heat engine (§15, §16, §43)
`src/lib/heat.ts`, pure functions, no I/O:
```
heat = 100 * calibrate(
    Σ_events [ trust(source) · decay(Δt, halfLifeFor(event_type)) · independence(event) ]
    · obscurity(target)
)
```
Per-type half-lives per §16 (`new_liquidity` 3h · `wallet_purchase` 4h · `social_follow` 6h ·
`funding` 24h) — **read from `signal_config`, not hard-coded**, per the 985monitor lesson. Every
component persisted to `targets.heat_components` so the UI answers "why?". Integer 0-100 output —
no fake precision (§15). Output maps to **four graded bands** rather than one threshold, so the
alert engine can escalate by severity instead of firing binary.

**Qualification floor.** Ingestion applies a configurable liquidity / market-cap minimum at
write time so `signal_events` never fills with dust. This is what makes a 10-minute cadence
affordable, and it is the highest-value cost lever the research surfaced.

### Step 5 — Scheduler + subscriptions on the Railway worker (§38, §39)
`ingest-onchain` and `compute-heat` run as **in-process scheduled jobs on the Railway worker**, not
Vercel crons — no cadence cap, so 10 minutes (or 1) is free. Each job stays independently
observable and advisory-locked through `cron_runs.lock_key` for idempotency, exactly as if it were
a separate cron. The worker also holds the WebSocket subscriptions that Vercel could not.

### Step 6 — `/radar` + `api/radar.ts`
Ranked feed (§52 — not `ORDER BY heat DESC`), filters, per-card heat sparkline from
`heat_history`, and a plain-language "why it is showing" line built from `heat_components`.
`/` → radar; today's home → `/scan`, unchanged.

### Step 7 — Auto-scan hook
Target crosses heat ≥ 70 → enqueue the existing scan pipeline → write `alpha_score` back to
`targets` → the Heat × Alpha grid populates itself. Rate-capped to control Anthropic spend.

**Explicitly NOT in Phase 1:** wallets, social, mints, alerts, feedback, backtesting, trust
learning. Those are Phases 2–7 and each needs its own plan.

---

# DECISIONS I NEED FROM YOU

1. ~~**Vercel plan**~~ — ✅ **RESOLVED.** Hybrid Vercel + Railway; project created; no Pro needed.
2. **vitest as a devDependency?** §49 mandates unit tests; there is no test runner today and
   `CLAUDE.md` says no new deps without asking. Build-time only, ships nothing to users.
3. **Supabase service-role key** — does one exist, and can you add it to Vercel env?
4. **Chains for Phase 1** — Solana / Base / Ethereum / Hyperliquid / Robinhood Chain?
5. **Admin auth** — Supabase Auth, or a simple server-side password check for now?

**Now only 3 and 4 block me** — the Supabase service-role key and the chain list. Both are inputs
only you have. 2 and 5 can follow.
