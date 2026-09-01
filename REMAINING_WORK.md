# Remaining Work — honest scoreboard

**Updated:** 2026-08-22. Measured against the Master Build Spec, not against my own summaries.

## Phases (§45)

| Phase | State |
|---|---|
| **P0 — security + architecture** | ✅ Done. 4 P0s closed, `api/` typechecked, `.env.example` + README added. |
| **P1 — free on-chain radar** | ✅ Built. ⚠️ **Never seen live data** — this sandbox cannot reach the providers. |
| **P2 — wallet intelligence** | ❌ Not started — **blocked**, needs an Alchemy or Helius key |
| **P3 — social convergence** | ❌ Not started — **blocked**, needs the X API cost question answered |
| **P4 — NFT / mint radar** | 🟡 Mint-log detection built (`Transfer` from `0x0`); no collection-level view |
| **P5 — alerts** | ✅ Telegram, graded by band, deduped per rule |
| **P6 — feedback + learning** | ✅ Watchlist + operator feedback + derived trust |
| **P7 — advanced intelligence** | ❌ Not started |

## Definition of done (§60) — 15 conditions

| # | Condition | State |
|---|---|---|
| 1 | Discovers targets without user input | ✅ built, unverified live |
| 2 | Multiple independent sources create signals | ✅ 3 discovery providers + 2 risk sources |
| 3 | Signals normalized into one event model | ✅ |
| 4 | Duplicate / correlated signals controlled | ✅ dedupe key + geometric independence |
| 5 | Heat changes over time | ✅ decay + history |
| 6 | Scanner automatically evaluates promising targets | ✅ `run-alpha-scans`, gated four ways |
| 7 | Risk independently evaluated | ✅ contract analysis + domain provenance, checked/unchecked distinguished |
| 8 | Evidence visible | ✅ `/target/:id` — timeline with source links |
| 9 | Every score explainable | 🟡 heat fully; alpha shows its score but not its reasoning |
| 10 | Alerts deliverable | ✅ Telegram, graded by band, deduped per rule |
| 11 | Provider failure doesn't kill pipeline | ✅ allSettled + breaker + `check-sources` health probe |
| 12 | API costs observable | ✅ `provider_calls` + `/api/costs` with cost-per-qualified-signal |
| 13 | Historical outcomes measurable | ✅ immutable detection snapshot + 5 forward horizons |
| 14 | Trust scores can evolve | ✅ derived from outcomes, blended, sample-gated |
| 15 | Can prove discoveries were useful | 🟡 `/api/performance` built; needs live data to say anything |

**14 of 15** (13 complete, 2 partial). Both partials need live data or an alpha-reasoning
payload, not new architecture.

## Schema: 16 of 24 tables (§37)

Built: `signal_sources` · `signal_config` · `targets` · `signal_events` · `heat_history` ·
`cron_runs` · `risk_assessments` · `alert_rules` · `alert_deliveries` · `signal_outcomes` ·
`signal_entities` · `trust_scores` · `provider_calls` · `watchlist` · `target_feedback` ·
`mint` signals (folded into `signal_events` rather than a separate table)

Missing: `canonical_entities` · `entity_aliases` · `target_aliases` · `alpha_scores` ·
`wallet_profiles` · `wallet_events` · `social_profiles` · `social_events` · `audit_logs`

Most of what is missing belongs to the two blocked families (wallet, social) or to entity
resolution (§5), which has no consumer yet.

## Whole sections of the spec still untouched

§5 entity resolution · §6 signal network · §10 smart money · §11 wallet clustering ·
§13 social velocity · §17 explicit cross-source score · §50 historical replay

**Closed since the last update:** §20 Heat×Alpha grid · §22 scam/LARP (as provenance) ·
§27 watchlist · §44 cost control

## Original audit: 13 of 26 issues fixed

**Signal families: 2 of 4** (on-chain price, mint logs · missing wallet, social)

**Fixed:** open Claude proxy · prompt injection · admin password · anon-key deletes ·
orphan `cryptorank.ts` · `api/` untypechecked · missing `.env.example` · verdict drift ·
radar drill-down · decorative FUD penalty · dead feed-click auto-scan ·
`enrichment-engine.ts` deleted · **no README**

**Still open — highest value first:**
1. **`home.tsx` is ~2,400 lines** — prompt and dead scoring gone, but canvas + CSS + JSX remain.
2. Red-flag logic still duplicated in 2 places.
3. `cryptocurrency.cv` news source unverified; DefiLlama `/hacks` may be Pro-locked.
4. Stale global CSS + missing favicon.
5. Alpha score has no stored reasoning, so §60 #9 stays partial.

## The honest summary

The full loop runs: **discover → normalize → score heat → assess risk → check provenance → scan →
rank → alert → record outcome → measure forward → adjust trust**, with operator feedback feeding
a separate, deliberately un-averaged channel.

**Signal diversity is still the weak point.** Three discovery providers, but two of them are price
feeds — mint logs are the only family that is structurally different. Convergence means what the
spec intends only once wallet and social land, and both are blocked on an external decision
rather than on work:

- **Wallet intelligence** (§10–§11) needs an Alchemy or Helius key. Both have free tiers; one
  webhook covers 100,000 addresses.
- **Social convergence** (§13) needs the X API cost question answered. `GET /2/users/:id/following`
  is ~100 requests / 24h and rate limits do not lift with spend, so this realistically needs a
  third-party public-data provider — and the cost swings 20× on whether the endpoint returns
  newest-first, which must be verified before designing anything.

**The schema and every job query now boot and run against a real PostgreSQL 16** (local cluster,
Session 6): 10 migrations apply idempotently, 15 tables, /healthz db:true, all read routes and all
job SQL exercised against seeded data. What is still unseen is the engine against **live provider
APIs and the Railway database** — the sandbox egress proxy blocks every provider domain and the
Railway domain, and four Railway dashboard actions remain 2FA-blocked (see `DEPLOYMENT_STATE.md`).
A full-repo adversarial audit (Session 6) found and fixed ~40 bugs including two criticals (a
self-recursive `json()` that silently killed all enrichment, and a migration that failed the whole
chain at boot); details in `CHECKPOINT.md`.
