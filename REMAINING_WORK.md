# Remaining Work — honest scoreboard

**Updated:** 2026-08-22. Measured against the Master Build Spec, not against my own summaries.

## Phases (§45)

| Phase | State |
|---|---|
| **P0 — security + architecture** | ✅ Done. 4 P0s closed, `api/` typechecked, `.env.example` added. |
| **P1 — free on-chain radar** | ✅ Built. ⚠️ **Never seen live data** — this sandbox cannot reach the providers. |
| **P2 — wallet intelligence** | ❌ Not started |
| **P3 — social convergence** | ❌ Not started |
| **P4 — NFT / mint radar** | ❌ Not started |
| **P5 — alerts** | ❌ Not started |
| **P6 — feedback + learning** | ❌ Not started |
| **P7 — advanced intelligence** | ❌ Not started |

## Definition of done (§60) — 15 conditions

| # | Condition | State |
|---|---|---|
| 1 | Discovers targets without user input | ✅ built, unverified live |
| 2 | Multiple independent sources create signals | ✅ 2 providers |
| 3 | Signals normalized into one event model | ✅ |
| 4 | Duplicate / correlated signals controlled | ✅ dedupe key + geometric independence |
| 5 | Heat changes over time | ✅ decay + history |
| 6 | Scanner automatically evaluates promising targets | ✅ **just built** (`run-alpha-scans`) |
| 7 | Risk independently evaluated | ✅ GoPlus, ~15 indicators, checked/unchecked distinguished |
| 8 | Evidence visible | ✅ `/target/:id` — timeline with source links |
| 9 | Every score explainable | 🟡 heat fully; alpha shows its score but not its reasoning |
| 10 | Alerts deliverable | ✅ Telegram, graded by band, deduped per rule |
| 11 | Provider failure doesn't kill pipeline | ✅ allSettled + breaker |
| 12 | API costs observable | ❌ no cost table/dashboard |
| 13 | Historical outcomes measurable | ✅ immutable detection snapshot + 5 forward horizons |
| 14 | Trust scores can evolve | ❌ |
| 15 | Can prove discoveries were useful | 🟡 `/api/performance` built; needs live data to say anything |

**10.5 of 15.**

## Schema: 11 of 24 tables (§37)

Built: `signal_sources` · `signal_config` · `targets` · `signal_events` · `heat_history` ·
`cron_runs` · `risk_assessments` · `alert_rules` · `alert_deliveries` · `signal_outcomes`

Missing: `signal_entities` · `canonical_entities` · `entity_aliases` · `target_aliases` ·
`target_signals` · `alpha_scores` · `wallet_profiles` · `wallet_events` ·
`social_profiles` · `social_events` · `mint_events` · `source_providers` · `watchlists` · `user_feedback` · `signal_outcomes` · `signal_performance` ·
`trust_scores` · `audit_logs`

## Whole sections of the spec untouched

§5 entity resolution · §6 signal network · §10 smart money · §11 wallet clustering ·
§12 mint radar · §13 social velocity · §17 explicit cross-source score · §20 Heat×Alpha grid UI ·
§22 scam/LARP · §27 watchlist ·
§30 trust engine · §44 cost control · §50 historical replay

## Original audit: 12 of 26 issues fixed

**Fixed:** open Claude proxy · prompt injection · admin password · anon-key deletes ·
orphan `cryptorank.ts` · `api/` untypechecked · missing `.env.example` · **verdict drift**

**Also fixed since:** radar drill-down · decorative FUD penalty · dead feed-click auto-scan ·
`enrichment-engine.ts` deleted

**Still open — highest value first:**
1. **`home.tsx` is ~2,400 lines** — prompt and dead scoring gone, but canvas + CSS + JSX remain.
2. **No README.**
7. Red-flag logic still duplicated in 2 places.
8. `cryptocurrency.cv` news source unverified; DefiLlama `/hacks` may be Pro-locked.
9. Stale global CSS + missing favicon.

## The honest summary

The full loop now runs: **discover → normalize → score heat → assess risk → scan → rank → alert →
record outcome → measure forward.** Nine of the twelve steps in §59 execute. What closes the loop
but does not yet exist is **trust evolution** (§30) — outcomes are recorded but nothing feeds them
back into source weighting yet.

**The real limitation is signal diversity, not plumbing.** Convergence is currently measured
across two on-chain providers. Wallet intelligence (§10-§11), social convergence (§13) and the
mint radar (§12) are three of the four signal families and none exist, so "k independent entities"
today means "two APIs agreed" rather than genuinely different kinds of evidence. That is the
single highest-value thing left to build.

**And nothing has seen live data.** Every number above describes code that typechecks and passes
tests, not a system observed working.
