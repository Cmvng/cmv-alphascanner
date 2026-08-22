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
| 7 | Risk independently evaluated | ❌ **not built** |
| 8 | Evidence visible | 🟡 counts + "why" line; no evidence drill-down |
| 9 | Every score explainable | 🟡 heat yes, alpha no |
| 10 | Alerts deliverable | ❌ |
| 11 | Provider failure doesn't kill pipeline | ✅ allSettled + breaker |
| 12 | API costs observable | ❌ no cost table/dashboard |
| 13 | Historical outcomes measurable | ❌ |
| 14 | Trust scores can evolve | ❌ |
| 15 | Can prove discoveries were useful | ❌ |

**6 of 15.**

## Schema: 7 of 24 tables (§37)

Built: `signal_sources` · `signal_config` · `targets` · `signal_events` · `heat_history` · `cron_runs`

Missing: `signal_entities` · `canonical_entities` · `entity_aliases` · `target_aliases` ·
`target_signals` · `alpha_scores` · `risk_scores` · `wallet_profiles` · `wallet_events` ·
`social_profiles` · `social_events` · `mint_events` · `source_providers` · `alerts` ·
`alert_deliveries` · `watchlists` · `user_feedback` · `signal_outcomes` · `signal_performance` ·
`trust_scores` · `audit_logs`

## Whole sections of the spec untouched

§5 entity resolution · §6 signal network · §10 smart money · §11 wallet clustering ·
§12 mint radar · §13 social velocity · §17 explicit cross-source score · §20 Heat×Alpha grid UI ·
§21 risk engine · §22 scam/LARP · §23 project intelligence page · §26 alerts · §27 watchlist ·
§28 backtest · §29 signal performance · §30 trust engine · §44 cost control · §50 no-look-ahead
backtesting · §51 evaluation metrics

## Original audit: 8 of 26 issues fixed

**Fixed:** open Claude proxy · prompt injection · admin password · anon-key deletes ·
orphan `cryptorank.ts` · `api/` untypechecked · missing `.env.example` · **verdict drift**

**Still open — highest value first:**
1. **`/radar` rows aren't clickable** — no target detail page (§23). Discovery with no drill-down.
2. **Decorative FUD penalty** — UI shows `-N PENALTY` that is never subtracted from the score.
3. **Feed-click auto-scan is dead** — `analyze()` reads `xUrl` before `setXUrl` lands.
4. **`src/lib/enrichment-engine.ts`** — 384 lines, zero imports, third copy of red-flag logic.
5. **`home.tsx` is 2,510 lines** — prompt gone, but canvas + CSS + JSX still one file.
6. **No README.**
7. Red-flag logic still duplicated in 2 places.
8. `cryptocurrency.cv` news source unverified; DefiLlama `/hacks` may be Pro-locked.
9. Stale global CSS + missing favicon.

## The honest summary

Phase 1 is a working skeleton of the discovery half. **The judgement half, the risk half, the
social half, the wallet half, alerts, and every learning/feedback loop do not exist.** The spec
describes a system where the product IS the loop (§59); right now three of its twelve steps run.
