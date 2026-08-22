# CMV AlphaScanner — Project Memory

Persistent context for AI assistants working in this repo. Companion doc: `CHECKPOINT.md`
(full audit, dated 2026-08-22). Update this file when the facts below stop being true.

---

## What it is

Paste a crypto project's X handle → get a 0-100 alpha score, S/A/B/C/D tier, 17 metric
breakdowns, red flags, and a shareable PNG verdict card. Scans persist to Supabase and feed a
public feed + a drag-and-drop tier list.

Owner: `Cmvng` · deployed on Vercel · `cmv-alphascanner.vercel.app`

## Stack

Vite 5 · React 18 · TypeScript · Vercel serverless functions · Supabase REST.
**No** router, UI kit, state library, CSS framework, test runner, or linter. Styling is inline
`<style>` blocks per page. Routing is `window.location.pathname` in `src/App.tsx`.

## Layout

```
src/App.tsx              pathname router
src/pages/home.tsx       2632 L — scan pipeline, prompt, canvas card, all UI
src/pages/feed.tsx        503 L — public scan feed (grid + tier views)
src/pages/tierlist.tsx    559 L — drag-drop tier board, localStorage-backed
src/pages/admin.tsx       280 L — fake-404 gated admin
src/lib/xapi.ts            18 L — thin /api/xproject wrapper
src/lib/enrichment-engine.ts  384 L — UNUSED, never imported
api/xproject.ts          1000 L — X profile + 11 enrichment sources
api/claude.ts              37 L — Anthropic passthrough (claude-haiku-4-5, max_tokens 4096)
api/websearch.ts          106 L — DuckDuckGo HTML scrape → red-flag keywords
api/save-scan.ts           86 L — Supabase upsert on `handle`
api/xuser.ts               40 L — single X user lookup (team cards)
api/cryptorank.ts          44 L — ORPHAN, no client calls it
```

## Conventions to follow

- Match the existing style: inline styles + a per-page `<style>` block, CSS custom properties
  (`--green`, `--text-1`, `--mono`…). Don't introduce Tailwind or a CSS-in-JS library.
- No new runtime dependencies without asking. Current deps are React + ReactDOM only.
- All third-party API calls go through `api/*` serverless functions, never straight from the
  browser — **except** the existing Supabase reads and `feed.tsx`'s CoinGecko price poll, which
  predate that rule.
- Every enrichment source is optional and wrapped: `withTimeout(...)` inside `Promise.allSettled`,
  returning `null` on any failure. Never let one source break a scan.
- `npm run build` (= `tsc && vite build`) must stay clean. Note it typechecks `src` only.

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

Never add a new unauthenticated `/api/*` route that spends money or writes data.

## Current state

Build passes. All four pages render. The scan pipeline works end-to-end including graceful
degradation. Blocking issues are the four P0 security items and the verdict-vocabulary drift.
Full list, with file:line references and a suggested order of work, in `CHECKPOINT.md`.
