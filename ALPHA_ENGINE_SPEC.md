# Alpha Engine — Product Spec

**Drafted:** 2026-08-22 · Companion to `CHECKPOINT.md` (audit) and `CLAUDE.md` (memory).
**Goal:** turn AlphaScanner from an on-demand single-project scanner into an always-on
discovery engine — "never miss alpha again."

Visual blueprint: <https://claude.ai/code/artifact/77f5eac3-6c7a-469c-9543-ce54379ea98f>

---

## 1. The problem with the app as built

AlphaScanner is **pull-based**: paste a handle → fan out to 11 sources → verdict. Every scan
starts with you already knowing the handle, so the app can only *judge* alpha you already found.
By the time a project is memorable enough to type in, the edge is gone.

Every reference tool is the opposite — **push-based, always-on, many entities at once**. They
answer "what just started moving?", not "is this good?"

Those are different architectures. Vercel request/response functions cannot do the second one.
This spec adds the missing half: a scheduler, an event store, a scoring loop, and push delivery.

---

## 2. Reference tools, decoded

| Tool | What it surfaces | Capability | Rebuild from |
|---|---|---|---|
| `purealpha.app` | New follows across a curated signal network; "hot rank" = follow convergence + recency | Social convergence | X API following lists (metered) |
| `leak.me` | **Unverified** — unreachable | Curated leak feed | TBD — need a screenshot |
| `985monitor.xyz` | **Unverified** — no public footprint | Monitor | TBD |
| `wind.jokkimon.club` | **Unverified** | Monitor | TBD |
| `j7tracker.io` | **Unverified** | Tracker | TBD |
| `mintgo.fun` · `guap.wtf` · `alphatrack.xyz` · `waypoint.tools` | Mint discovery, collection dashboards, mint scanning | NFT mint radar (one module) | Magic Eden (120 QPM free) · OpenSea (free tier) · Reservoir |
| `app.moni.ai` | Smart followers, mindshare, KOL scoring — 30k scored accounts, data to 2021 | Social graph quality | **Moni API** — real, documented, B2B (`b2b@getmoni.io`) |
| `alphagate.io` | Emerging-project tracking, account history, scam flags, X extension | Project discovery | **docs.alphagate.io** — public docs exist, verify |

**Constraint:** none of these can be scraped or proxied. No public APIs (except Moni and
Alphagate), and scraping breaches ToS and breaks on markup changes. Everything else gets rebuilt
from the *public sources they themselves use* — X follow graph, onchain events, mint contracts.

---

## 3. The unifying primitive: convergence

All five "live feed" tools compute one thing:

> **k independent trusted entities touched the same target inside a window w.**

- **Entities:** KOL X accounts · smart-money wallets · VC wallets · dev wallets
- **Targets:** X account · token contract · NFT collection
- **Events:** followed · bought · minted · deployed · funded

One smart wallet buying a token is noise. Nine within four hours is signal — and it fires hours
before the first thread. Swap the entity and event types and the *same engine* becomes a wallet
tracker, a mint radar, or a follow tracker. That is why this is one app and not eleven tabs.

### Heat formula

```
heat(target) = 100 * sigmoid(
      Σ trust_weight(e) * decay(t_now - t_event)     // convergence, weighted
    * obscurity_multiplier(target)                    // the important term
)

decay(Δt)                = 0.5 ^ (Δt / HALF_LIFE)     // HALF_LIFE = 6h
obscurity_multiplier(x)  = clamp(1.0 .. 3.0, log10(50_000 / audience(x)))
trust_weight(e)          = 0.1 .. 1.0, learned from acted-on hits
```

`obscurity_multiplier` is what separates this from a trending list. Trending ranks by **size**;
this ranks by **surprise**. Nine wallets buying ETH scores near zero. Nine wallets buying
something with 1,200 followers scores near the top.

Implement in `src/lib/heat.ts` as **pure functions, no I/O**, so they are testable.

---

## 4. The payoff: Heat × Alpha

Two independent axes on the same object:

- **Heat** 0-100 — velocity right now, from the signal engine, decays hourly
- **Alpha Score** 0-100 — depth verdict, from the existing scanner, static per scan

| | Low Heat | High Heat |
|---|---|---|
| **High Alpha** | **ACCUMULATE** — good, not moving yet. Best asymmetry. | **ACT NOW** — good and moving. This is the only push-worthy alert. |
| **Low Alpha** | **IGNORE** | **TRAP** — moving on nothing. Pump, or farm the volatility knowingly. |

The discovery tools give you the x-axis. Your scanner already gives you the y-axis. Nobody runs
both on the same object at the same moment — that is the product.

---

## 5. Architecture

### New Supabase tables

```sql
-- the curated network doing the signalling
signal_entities(
  id, kind ('x_account'|'wallet'|'vc_wallet'), identifier, chain,
  label, trust_weight numeric default 0.5, active bool, added_at
)

-- raw ingested events, append-only
signal_events(
  id, entity_id fk, target_id fk, event_type ('follow'|'buy'|'mint'|'deploy'|'fund'),
  source text, occurred_at timestamptz, raw jsonb,
  unique(entity_id, target_id, event_type, occurred_at)
)

-- deduped discovered things
targets(
  id, kind ('x_account'|'token'|'nft_collection'),
  x_handle, contract_address, chain, name,
  audience_size int, first_seen_at, last_event_at,
  heat numeric, alpha_score int,          -- alpha_score fk-ish to scans.handle
  status ('new'|'scanned'|'muted'), unique(kind, coalesce(contract_address, x_handle))
)

-- time series for sparklines
heat_history(target_id fk, heat numeric, computed_at timestamptz)

-- per-user alert rules
alert_rules(id, user_ref, min_heat, min_alpha, chains text[], kinds text[], channel, destination)
```

`scans` (existing) is unchanged; link it to `targets` by `handle`.

### New serverless functions

| File | Cadence | Job |
|---|---|---|
| `api/cron/ingest-onchain.ts` | 10 min | DexScreener new/boosted + GeckoTerminal `/new_pools` → `signal_events` |
| `api/cron/ingest-social.ts` | 6 h | Diff following lists for `signal_entities` → `signal_events` |
| `api/cron/compute-heat.ts` | 10 min | Recompute heat, upsert `targets`, append `heat_history` |
| `api/cron/dispatch-alerts.ts` | 10 min | Match `targets` against `alert_rules`, send |
| `api/radar.ts` | on demand | Read endpoint for the radar UI |

Wire via Vercel Cron in `vercel.json`. Every ingest source wrapped in `withTimeout` inside
`Promise.allSettled`, same discipline as `api/xproject.ts` — one dead source must never break a
cron run.

### New routes

`/radar` (new home) · `/scan` (today's home, moved) · `/watchlist` · `/mints`.
`/feed` and `/tierlist` unchanged.

---

## 6. Data sources and cost

| Source | Gives | Limit | Cost |
|---|---|---|---|
| DexScreener | new pairs, boosted tokens, liquidity, price — **no key** | 300/min (pairs), 60/min (token) | **free** |
| GeckoTerminal | `/networks/{n}/new_pools` — freshest deploys, **no key** | 30/min | **free** |
| DefiLlama | raises, TVL, hacks — already wired in | generous | **free** |
| Magic Eden | collections, mints, holders, activity | 120 QPM public reads | **free** |
| OpenSea | events, collections, mint activity | keyed | free tier |
| X API | follow graph — the purealpha signal | 2M reads/mo cap | **metered** |
| Moni | smart accounts, mindshare, KOL scores | B2B | quote |

### ⚠️ The one thing that could sink this

X API pricing changed in **February 2026**: free tier discontinued for new developers, default is
now **pay-per-use ≈ $0.005 per post read, capped 2M reads/month**. Legacy Basic ($200/mo) and Pro
($5,000/mo) survive **for existing subscribers only**.

The codebase already shows the strain — pinned-tweet fetch disabled, tweets cut 20 → 5, both with
"save credits" comments.

**Cost math to verify before Phase 2:** follow-graph convergence requires polling
`GET /2/users/:id/following` per signal account. 300 accounts hourly ≈ 7,200 calls/day ≈
216,000/month. Whether those bill as "reads" at $0.005 is **the single most important unknown
here** — worst case four figures a month, best case negligible.

**Mitigation, and why the phases are ordered as they are:** the onchain half is free and the
social half is not. Phase 1 uses onchain only and costs $0. Phase 2 starts at 50 accounts on a
slow cadence and gets measured for a week before widening. If metering is hostile, buy Moni
instead of rebuilding it.

---

## 7. Build phases

Genuinely sequential — each depends on the last.

### P0 — Close the security holes *(blocks everything)*
The four P0 items in `CHECKPOINT.md`: open `/api/claude` proxy, client-side admin password,
anon-key deletes, unauthenticated `/api/save-scan`. Blast radius is small today only because
traffic is small; everything below increases traffic.

### P1 — Signal engine + onchain radar *($0 to run — the milestone)*
Schema, `ingest-onchain`, `heat.ts`, `compute-heat`, `/radar` as new home, auto-scan hook at
heat ≥ 70 so the Heat × Alpha grid populates itself. Ships a working discovery feed on free data.

### P2 — Social convergence *(the purealpha replication — cost risk)*
Seed 50 trusted accounts, poll following lists slowly, diff for new follows, feed the same
scorer. Measure X spend for a week before widening. Moni is the fallback.

### P3 — Alerts *(where "never miss alpha" stops being a slogan)*
A radar you have to visit is still pull-based. Telegram bot first — it is where CT lives, it is
free, delivery is instant. Web push second. Rules: heat threshold, chain, category, min alpha.

### P4 — Mint radar + wallet tracking
`/mints` from Magic Eden + OpenSea, scored by the same engine with wallets as entities and mints
as events. Then smart-money buy tracking — same code again. No new maths.

---

## 8. Open questions

1. **What do `leak.me`, `985monitor.xyz`, `wind.jokkimon.club`, `j7tracker.io` actually show?**
   All unreachable from here. One screenshot each confirms whether they are the same convergence
   engine with different inputs (suspected) or something genuinely different.
2. **Which X API tier is `X_API_BEARER_TOKEN` on?** Decides whether P2 is viable at all.
3. **Who is in the signal network?** 30–50 accounts whose calls have actually been early beats
   300 big names. The engine is only as good as the seed list.
4. **Private terminal or public product?** Very different answers on auth, rate limits, and cost
   ceilings.
5. **Which chains matter?** Solana / Base / Ethereum / Hyperliquid — scopes the onchain ingest.
