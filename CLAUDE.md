# CMV AlphaScanner — Project Memory

Persistent context for AI assistants working in this repo. Companion docs: `CHECKPOINT.md`
(codebase audit + work log), `ALPHA_ENGINE_SPEC.md` (product direction), and
**`AUDIT_AND_PHASE1_PLAN.md` (current — blockers, verified research, Phase 1 file plan; wins
where the others conflict)**. Update this file when the facts below stop being true.

---

## What it is

Two halves of one question. **Judgement**: paste a crypto project's X handle → 0-100 alpha score,
S/A/B/C/D tier, 17 metric breakdowns, red flags, shareable PNG verdict card. **Discovery**: an
always-on engine that watches chains for things that just started moving and scores them as Heat
(0-100, decaying). `/grid` plots the two against each other — that pairing is the product thesis.

Owner: `Cmvng` · scanner on Vercel (`cmv-alphascanner.vercel.app`) · engine on Railway.

## Stack

Vite 5 · React 18 · TypeScript · Express + `pg` on Railway (run directly via `tsx`) ·
Railway Postgres for the engine · Supabase REST for the legacy `scans` table.
**No** router, UI kit, state library, CSS framework, or linter. Styling is inline `<style>` blocks
per page. Routing is `window.location.pathname` in `src/App.tsx`. Tests are vitest, on pure
functions only (`cd server && npm test`).

## Layout

```
src/App.tsx              pathname router
src/pages/radar.tsx      the front door — what just started moving
src/pages/grid.tsx       Heat × Alpha quadrant plot
src/pages/target.tsx     evidence view: heat components, risk checks, signal timeline
src/pages/home.tsx      ~2400 L — the scanner: scan pipeline, canvas card, all UI
src/pages/feed.tsx       public scan feed (grid + tier views)
src/pages/tierlist.tsx   drag-drop tier board, localStorage-backed
src/pages/admin.tsx      fake-404 gated admin
src/lib/verdicts.ts      the ONE verdict vocabulary — see trap 2
src/lib/session.ts       admin token in sessionStorage, shared across pages
src/lib/xapi.ts          thin /api/xproject wrapper

api/xproject.ts          X profile + 11 enrichment sources
api/claude.ts            Anthropic call — builds the system prompt server-side
api/admin.ts             login + delete, HMAC session token
api/websearch.ts         DuckDuckGo HTML scrape -> red-flag keywords
api/save-scan.ts         Supabase upsert on `handle`
api/xuser.ts             single X user lookup (team cards)
api/_lib/                untrusted.ts · prompt.ts · guard.ts · admin-auth.ts

server/src/index.ts      Express: SPA + api/* adapter + engine routes + scheduler
server/src/lib/          heat.ts (pure, tested) · net · meter · health · dedupe · admin
server/src/providers/    geckoterminal · dexscreener · goplus · mintlogs · provenance
server/src/jobs/         one file per scheduled job (11 of them)
server/src/routes/       radar · target · performance · costs · watchlist
db/migrations/           0001..0009, applied in filename order at boot
```

## Conventions to follow

- Match the existing style: inline styles + a per-page `<style>` block, CSS custom properties
  (`--green`, `--text-1`, `--mono`…). Don't introduce Tailwind or a CSS-in-JS library.
- No new runtime dependencies without asking. Frontend deps are React + ReactDOM only; the
  server adds express, pg and tsx and nothing else.
- All third-party API calls go through `api/*` serverless functions, never straight from the
  browser — **except** the existing Supabase reads and `feed.tsx`'s CoinGecko price poll, which
  predate that rule.
- Every enrichment source is optional and wrapped: `withTimeout(...)` inside `Promise.allSettled`,
  returning `null` on any failure. Never let one source break a scan.
- `npm run build` (= `tsc && tsc -p tsconfig.api.json && vite build`) must stay clean, and so
  must `cd server && npx tsc --noEmit` — the server is a separate compilation unit.

## Non-obvious things that will bite you

1. **Two independent scorers produce the same output shape.** The LLM path
   (`/api/claude` → `xjson()` parse) and the deterministic fallback `xOnlyScan()`
   (`home.tsx:617`). *Any* Claude failure — HTTP error, credits, overload, auth, empty text,
   unparseable JSON — silently routes to `xOnlyScan`. Nothing in the UI or the persisted row
   records which path ran. Change scoring in one place and the two drift further apart.

2. **Verdict vocabulary is inconsistent across pages — this is a live bug.**
   `home.tsx` emits `ALPHA PLAY / FARM IT / ENGAGE / OBSERVE / AVOID`.
   `feed.tsx`, `tierlist.tsx`, `admin.tsx`, and `FeaturedProjects` still expect
   `FARM IT / CREATE CONTENT / WATCH / SKIP`. The feed's tier view drops any scan whose verdict
   isn't in the old list. Supabase holds a mix of both. Fix = one shared constant + a data
   migration. See CHECKPOINT #6.

3. **Four different score scales are in play.** `overall_score` 0-100 (the headline);
   `computeCMVAlphaScore()` 0-1000 (only its *penalty* is ever rendered, and it isn't actually
   subtracted from the displayed score); `cmv_score` 0-1000 (X-account quality, its own tile);
   per-metric scores 0-100. Check which one you're touching.

4. **Red-flag logic lives in three places** and must be edited in all three, or rules apply
   inconsistently depending on which path ran: `detectFUDSignals()` in `api/xproject.ts:400`,
   the inline IIFE in `xOnlyScan` (`home.tsx:~800-940`), and the unused
   `src/lib/enrichment-engine.ts`.

5. **The `xproject` cache is a module-level `Map`** — per-lambda-instance on Vercel, so hit rate
   is unpredictable. TTL 2 h. `?nocache=true` bypasses it. It deliberately refuses to cache
   responses with zero followers/tweets so failed X lookups don't stick.

6. **localStorage cache keys are versioned:** `cmv_scan_v4_<handle>`, with fallback reads of
   `v3`/`v2`. **Bump to `v5` whenever the result shape changes** — several places read and
   several places clear these keys (`home.tsx:394,504`, `admin.tsx:41,59,76`).

7. **The system prompt forbids naming data sources** (DefiLlama, RootData, CryptoRank,
   DexScreener, CoinGecko, CoinPaprika, DuckDuckGo…) in *any* model output. It says so three
   times. Keep that constraint if you edit `buildSystemPrompt` (`home.tsx:191`).

8. **`getTier()` thresholds are 95 / 85 / 60 / 35** on the 0-100 scale — used for both the
   headline tier and per-metric colouring. The `range` strings in the `T` table
   ("950-1000" etc.) are stale leftovers and unused.

9. **Token price cascade** (`xproject.ts:~870`): DexScreener → GeckoTerminal → CoinGecko →
   CoinPaprika, with a guard rejecting a DEX price >10× off the CoinGecko price, and a
   `CHAIN_TOKENS` blocklist so a project isn't matched to the L1 it deploys on. Don't simplify
   this without understanding why each branch exists.

10. **~~Vercel Hobby caps cron jobs at ONCE PER DAY~~ — RESOLVED, see trap 20.** Kept for context: Per-project count limits were lifted to
    100 on all plans in Jan 2026, but the *cadence* cap remains — any expression firing more than
    daily **fails at deploy time** on Hobby. Pro allows per-minute. The discovery loop needs
    10-minute ingestion, so it needs Pro or an external scheduler (GitHub Actions works and is
    free). Verify the plan before writing any `crons` key into `vercel.json`.

11. **The X API cannot cheaply do follow-convergence.** `GET /2/users/:id/following` is reported
    at **100 requests / 24 hours**, and X rate limits do **not** lift with spend. The free tier is
    gone; legacy Basic was deprecated and migrated to pay-per-use on 1 June 2026. Follow-graph
    signals realistically need a third-party public-data provider (SocialData ~$0.0002/item,
    TwitterAPI.io ~$0.00015/read) — and the cost swings 20× on whether the endpoint returns
    newest-first. Verify that before designing anything social.

12. **Untrusted external text already reaches the LLM.** `buildSystemPrompt` interpolates the
    target's X bio and recent tweets into the system prompt. Treat every bio, tweet, README,
    token name and API response as **data, never instructions** — wrap it in explicit boundaries.
    This matters much more once discovery starts ingesting the open web.

13. **Scoring must stay deterministic.** Heat, decay, convergence, dedupe and thresholds are pure
    functions in code — never an LLM call. LLMs are for summarising, classifying and explaining
    only. This keeps cost bounded and results reproducible.

14. **Provider facts that are easy to get wrong** (verified Aug 2026):
    - **DexScreener has no new-pairs endpoint.** `token-profiles` / `token-boosts` are *promotion*
      feeds, not *creation* feeds. **GeckoTerminal `/networks/new_pools` is the only free
      purpose-built new-pool source.** Don't swap these roles.
    - GeckoTerminal is officially **Beta**; pin the `Accept: …;version=` header, and re-verify the
      version token — the long-quoted `20230302` is unconfirmed.
    - **Magic Eden shut its EVM and Bitcoin marketplaces in March 2026**, no migration support.
      Solana only. Use **Alchemy** for EVM NFT/mint work (free: 30M CU/mo, 5 webhooks, NFT
      Activity webhook fires on mints as transfers from `0x0`).
    - **Prefer webhooks over cron polling** where they exist: one Alchemy Address Activity webhook
      tracks up to **100,000 addresses** free; Helius does the same for Solana on 1 webhook.
    - **DefiLlama `/hacks` and `/raises` may be Pro-locked now** ($300/mo) though `xproject.ts`
      still calls them keylessly — verify before trusting the hack red flag.
    - **CoinGecko keyless is ~10–30/min and not guaranteed.** A free Demo key gives a reliable
      30/min + 10k/month. Get one.

15. **Four data sources people still recommend are dead** (verified Aug 2026): **Reservoir**
    (2025-10-15), **SimpleHash** (2025-03-27), **Zapper** (2026-08-03), **Sim by Dune**
    (2026-08-01). Never design against them. There is no longer a cheap cross-marketplace NFT
    aggregator or a cheap unified multichain wallet-activity API.

16. **Mint detection is an RPC problem, not an API problem.** Every ERC-721/1155 mint emits
    `Transfer` with `from == 0x0`. One log subscription covers **any** EVM chain for $0 —
    including **Robinhood Chain** (ID 4663) and **Stable** (ID 988, public RPC
    `https://rpc.stable.xyz`), which most NFT APIs don't cover and where real mint activity is
    happening. Compute velocity from your own stream; polling is slower than the phenomenon.
    Distinguish **sold out** (`totalSupply == maxSupply`) from **died** (`≪ maxSupply`) — both
    look like velocity → 0.

17. **Prefer webhooks over polling for wallet tracking — you pay per event, not per wallet.**
    Free capacity: Helius 1 webhook × 100k addresses (Solana), Alchemy 5 × 100k (EVM). The
    convergence counter then costs nothing; meter only the threshold-crossers. **The "already
    seen" set must live in Supabase, not a module-level `Map`** (see trap 5). Any webhook
    receiver is a new `/api/*` route that *writes* — it needs signature verification from day one.

18. **Risk output must distinguish "no indicator found" from "not checked."** The
    `allSettled` + `null` pattern is right for enrichment but **wrong for risk** — a timed-out
    check would render as a clean bill of health. Carry `checked: boolean` + `reason` per check
    and render them differently. Never aggregate risk into a verdict word, and never let a
    clustering result carry an `identity`/`owner` field — only `possible_cluster` + confidence.

19. **Score polarity differs between sources.** RugCheck: higher = *riskier*. Solsniffer: higher =
    *safer*. Our alpha score: higher = *better*. Normalise at the adapter boundary.

20. **Deployment is all-Railway. Vercel is being retired for this project.**
    Project `cmv-alpha-engine` (`512878a1-8f45-40aa-99e0-6adfd532622d`), env `production`.
    Services: `web` (static SPA) · `api` (ported handlers) · `worker` (always-on) ·
    **`Postgres`** (`573e9a60-fbc4-4ac2-a18c-580c3c9cf7cb`, managed template, persistent volume).

    **Why not Vercel:** serverless cannot hold persistent WebSocket connections — its own docs say
    so — and the engine needs them for RPC `Transfer`-from-`0x0` log subscriptions, the OpenSea
    Stream API and Helius LaserStream. The June-2026 WebSocket beta pins connections to a
    function's max duration. **Never put a long-lived connection, a queue, or a scheduler in
    `api/`** — it belongs in `worker/`, where there is also no cron cadence cap.

21. **Never paste a database credential — use Railway reference variables.**
    `DATABASE_URL=${{Postgres.DATABASE_URL}}`. Railway's managed Postgres exposes `DATABASE_URL`,
    `PGHOST`, `PGPORT`, `PGUSER`, `PGPASSWORD`, `PGDATABASE` automatically, and rotation
    propagates to every consumer. **The Alpha Engine's tables live in Railway Postgres, not
    Supabase**, so no Supabase service-role key is required. Supabase keeps only the existing
    `scans` table, read from the frontend with the anon key that is public by design.

22. **`risk_assessments` is keyed on `(target_id, source)`, not `target_id`.** Two independent
    risk sources write there (contract analysis, domain provenance). `targets.risk_level` is
    **derived** by `recomputeRiskLevel()` in `server/src/jobs/risk-rollup.ts` from *every* source —
    never write it directly from a job, or a clean result from one source will overwrite a
    critical finding from another purely on which job ran last. A row whose `checked_count` is 0
    carries no information and must not produce a `low`.

23. **The engine has TWO auth surfaces that must stay one implementation.** `api/_lib/admin-auth.ts`
    is the only verifier; `server/src/lib/admin.ts` reaches it through a dynamic absolute import
    because the server's `tsconfig` sets `rootDir: src`. Under `tsx` both resolve to the same file
    URL and therefore the same module instance — which matters, because with `ADMIN_SECRET` unset
    the module mints an *ephemeral* secret and two instances would sign with different keys. Never
    reimplement token verification; the more permissive copy would be the bug.

24. **Charts obey the checked/unchecked rule too.** `/grid` excludes targets with a null
    `alpha_score` rather than plotting them at 0 — an unjudged target at the bottom of the axis
    reads as "scored badly", which is a claim the viewer cannot detect as false. Same reasoning:
    unknown liquidity renders as a hollow dot, not a small one. If you add a visualisation, decide
    what "unknown" looks like *before* you decide what the axes are.

25. **Feedback and trust measure different things and must not be averaged.** `target_feedback`
    records whether *surfacing* a target was worth the operator's attention; `signal_entities.
    trust_weight` records what the market did after that source's signals. `/api/feedback/summary`
    reports the first beside the second deliberately. Folding one into the other would make both
    unreadable, and the feedback question would quietly become a price prediction.

26. **`extractWebsite` filters social and aggregator hosts, and that filter is load-bearing.**
    A token's "website" in DexScreener metadata is very often a Telegram invite. Running a domain
    age check on `t.me` would report Telegram's 2013 registration as the project's history — a
    confidently wrong answer, worse than no answer. `registrableDomain()` also mis-splits
    multi-part suffixes (`project.co.uk` → `co.uk`); that is asserted in tests and fails safe,
    because RDAP has no registration for `co.uk` so the check reports itself unrun.

27. **Server-to-server calls must not send an `Origin` header.** `api/_lib/guard.ts` allowlists
    origins for the spending routes, and a loopback address is not on it. `run-alpha-scans` used
    to forge `Origin: http://127.0.0.1:3000` and got 403 on every call — silently, because
    `scanHandle` returns null on any failure and the caller stamps `alpha_scanned_at` anyway.
    `!origin` already passes the guard. The allowlist derives the deployed origin from
    `RAILWAY_PUBLIC_DOMAIN` / `PUBLIC_URL`; if you add a domain, add it there, not in a constant.

28. **Advisory locks are session-scoped and `client.release()` does not release them.** In
    `scheduler.ts` the unlock must stay in the outermost `finally` covering everything after the
    lock is taken. It previously sat beside the job body, so a throw in between held the lock for
    the life of the process and that job never ran again.

29. **Heat has to be reset explicitly.** `compute-heat` inner-joins `signal_events` in a 7-day
    window, so a target with no recent evidence is not in the result and its `heat` column keeps
    its last value forever. Decay only happens for targets that are still being scored — the ones
    that stopped are updated by a separate statement in the same job. Don't remove it.

30. **A failed alert must stay retryable.** `alert_deliveries` doubles as the dedupe key, so the
    dispatcher's `NOT EXISTS` has to test `delivered_at`, not just row existence — otherwise every
    alert attempted while Telegram is unreachable is recorded as handled and lost. Retries are
    capped by `alerts.max_attempts`, re-alerting by `alerts.recheck_hours`.

31. **Ingest must not report provider health.** Every provider swallows its own HTTP errors and
    returns `[]` — that is what stops one dead source breaking a run — so a resolved `discover()`
    says nothing about whether the API answered. Health comes only from the `check-sources` probe,
    which actually calls the API. Writing `ok` from ingest marked dead providers green.

32. **No user-facing string may name intent or predict price.** Not "rug pull", not "go all in",
    not "stay away until price stabilizes". State the observation and its consequence — low
    liquidity means large trades move the price, an anonymous team means no named recourse. This
    applies to the shared verdict card most of all, since it travels furthest. Reporting that a
    *search result* contains the word "scam" is fine; asserting the scam is not.

33. **`api/xproject.ts`'s `json()` helper must call `r.json()`, not itself.** It was
    `return json(r)` — infinite recursion — so all 11 enrichment sources threw and every scan ran
    on X data alone, rendering a live, hacked token as "not launched, no hacks". Invisible because
    the sandbox blocks provider egress, so the line never ran. The whole enrichment layer depends
    on this one call.

34. **Keyword red-flag scans must match on word boundaries.** `'security'.includes('sec')` is
    true, so a bare-substring scan turns any "security"/"section" into a lawsuit flag, and
    KNOWN_TICKERS lets a project *mentioning* "hyperliquid" adopt $HYPE. Use `hasWord()`. Same
    class: DefiLlama-hacks `nameLower.includes(h.name || '')` matches every project against a
    nameless hack row (`includes('')` is always true).

35. **A failed X lookup must not fabricate and publish a stub.** `home.tsx` returns on `!xd` now;
    it used to build a zero-follower stub, score it AVOID via `xOnlyScan`, and POST it to the
    public feed — a transient outage became a permanent verdict on an innocent project. Relatedly,
    the shareable card and the LLM prompt are held to §32: the prompt forbids advice/price
    prediction on every field, not just the deterministic strings.

36. **GoPlus omits a field it could not determine; `truthy(absent)` is false but that is NOT
    "clear".** The binary EVM checks must emit `unchecked(no_data)` when the field is absent
    (use `present()`), or "could not analyse" renders as "checked, clean" on exactly the
    unverified contracts most likely to be dangerous. Ownership must also honour `hidden_owner` /
    `can_take_back_ownership` even when the owner looks renounced.

37. **Chain aliases must be canonicalised before the target key.** `canonicalChain()` collapses
    'ethereum' → 'eth'; without it the `(kind, chain, address)` unique index treats the two
    spellings as different targets and the providers' evidence never converges.

38. **The scanner cache must not store an incomplete result.** `xproject` refuses to cache when
    the (separately rate-limited) tweets fetch failed, or a token-less answer for a live project
    sticks for 2h. And a GET route that spends the X bearer token (`xproject`, `xuser`) carries
    `guardRead`'s per-IP bucket, keyed on the proxy-appended XFF entry (`TRUSTED_PROXY_HOPS` from
    the right), never the spoofable leftmost one.

39. **The migration chain and every job query are now verified against a real Postgres.** A local
    PG16 cluster runs the full boot + seeded-data smoke test (see `CHECKPOINT.md`). `db.ts` skips
    SSL for railway.internal / localhost / socket URLs so a local DB boots; keep that when editing
    the SSL logic. Migration 0005's identity uniqueness is a `create unique index`, never a table
    `unique(...)` constraint — PostgreSQL forbids `lower()`/`coalesce()` expressions there and it
    failed the entire chain at boot, taking 0006–0010 down silently.

## Environment variables

Server: `X_API_BEARER_TOKEN` (required, no fallback) · `ANTHROPIC_API_KEY` (optional — absence
degrades to `xOnlyScan`) · `SUPABASE_URL` · `SUPABASE_ANON_KEY` · `CRYPTORANK_API_KEY` (optional)
· `ROOTDATA_API_KEY` (optional).
Client: `VITE_SUPABASE_URL` · `VITE_SUPABASE_ANON_KEY`.

`VITE_ANTHROPIC_API_KEY` is accepted as a fallback in `api/claude.ts:11` — **do not set it**;
the `VITE_` prefix means Vite would inline it into the public bundle if it were ever used for
the frontend build. Remove that fallback when convenient.

There is no `.env.example`. Nothing in the repo documents these except `CHECKPOINT.md`.

## Supabase `scans` table

`id`, `handle` (unique, upsert key, lowercased), `project_name`, `verdict`, `score`, `ticker`,
`token_price`, `market_cap_str`, `category`, `profile_image_url`, `good_highlights` (array),
`red_flag_count`, `full_result` (jsonb — `{result, cgData, xData}`), `scanned_at`.

`save-scan.ts` retries without `full_result` if the payload is rejected as too large.

## Known security debt — do not add to it

- `/api/claude` is an **open unauthenticated proxy** to the Anthropic key (`CORS: *`,
  caller-controlled `system` and `messages`). Highest-priority fix.
- `/api/save-scan` is unauthenticated — anyone can write to the public feed.
- The admin password is a client-side constant in `admin.tsx:3`; the fake-404 + `cmvadm` key
  sequence is obfuscation only.
- Admin deletes hit Supabase directly with the anon key, which implies permissive RLS.
- Prompt injection via X bio → system prompt (see trap 12). Fix before widening ingestion.

Never add a new unauthenticated `/api/*` route that spends money or writes data.

## Where this is going

`ALPHA_ENGINE_SPEC.md` is the agreed direction: keep the scanner as the *judgement* stage and add
a discovery half in front of it — a cron-driven signal engine that detects **convergence** (k
trusted entities touching the same target inside a window w), scores it as **Heat** 0-100 with a
recency decay and an obscurity bonus, and pairs it with the existing Alpha Score on a two-axis
grid. Phase 1 is onchain-only and free to run; the social half is metered and must be cost-tested
before it is widened. Read that spec before starting any discovery/radar work.

## Current state

Build passes; 34 tests pass; both typechecks are clean. All seven pages render. The full engine
loop is written — discover → normalize → heat → risk → provenance → scan → rank → alert → outcome
→ trust — with cost metering and an owner-scoped watchlist/feedback channel.

**Nothing has been observed against live data.** The sandbox egress proxy blocks every provider
domain and the Railway domain, so every claim above describes code that compiles and passes
tests, not a system seen working.

Two signal families are still missing and both are blocked on an external decision, not on work:
wallet intelligence needs an Alchemy or Helius key; social convergence needs the X API cost
question answered. Four Railway dashboard actions remain 2FA-gated.

Honest scoreboard in `REMAINING_WORK.md`; per-session detail in `CHECKPOINT.md`.
