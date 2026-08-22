# Wallet Intelligence & Mint Radar — Research Findings

**Date:** 2026-08-22 · Informs Master Spec §10 (smart money), §11 (clustering), §12 (mint radar).
Research only — nothing implemented.

> **Verification note.** Every vendor pricing/doc domain was blocked by this sandbox's egress proxy;
> only GitHub loaded. Figures below are attributed to official pages via search extracts, not pages
> loaded directly. `VERIFIED` = provider statement + ≥2 independent corroborations (used mainly for
> shutdowns and chain facts). **Re-verify the four load-bearing numbers from real egress before
> committing budget:** Birdeye Lite $39/2.5M CU · Helius free-tier credits (currently UNKNOWN) ·
> Alchemy free 30M CU / 5 webhooks · OpenSea's actual token-bucket limits.

---

## 🔴 Four named data sources are dead

This reshapes both modules and **corrects an error in `ALPHA_ENGINE_SPEC.md`**, which listed
Reservoir as an NFT rebuild source.

| Service | Status | Date | Level |
|---|---|---|---|
| **Reservoir** (NFT API) | **SHUT DOWN** | 2025-10-15 | ✅ VERIFIED |
| **SimpleHash** | **SHUT DOWN** as standalone (acquired by Phantom) | 2025-03-27 | ✅ VERIFIED |
| **Zapper API** | **SHUT DOWN** | **2026-08-03 — 19 days ago** | ✅ VERIFIED |
| **Sim by Dune** (realtime wallet API) | **SHUT DOWN** | 2026-08-01 | ✅ VERIFIED |

**Consequence:** there is no longer a cheap cross-marketplace NFT aggregation API (Reservoir was
that), and no cheap unified multichain wallet-activity API (Sim was that). Both modules must be
built closer to the metal — RPC logs plus a few survivors. Zapper's own migration recommendation
was **Zerion**; Reservoir's migration partners were **Alchemy and Sequence**.

---

## The architectural principle: discovery free, enrichment metered

**Polling loses on both cost and latency.** Polling N wallets at interval T costs N/T req/s and
gives T/2 average latency. 5,000 wallets on a 60s poll ≈ **83 req/s sustained** — above every free
tier here, and still 30 seconds late.

**Webhooks invert this: you pay per *event*, not per *wallet*.**

| Mechanism | Addresses/hook | Hooks (free) | Free capacity |
|---|---|---|---|
| **Helius** (Solana) | **100,000** | 1 | 100k addresses |
| **Alchemy Address Activity** (EVM) | **100,000** | 5 | **500k address-slots** |
| Alchemy PAYG | 100,000 | 50 | 5M |

**The convergence signal is therefore free.** k trusted wallets hitting one target inside window w
— the heart of the whole engine — is a counter over the webhook stream with **zero per-wallet API
cost**. Paid credits get spent only on targets that already tripped a threshold: two to three
orders of magnitude fewer calls than profiling everything.

**Pipeline:**
1. Register the whole tracked-wallet set into webhooks *(free)*
2. On each event, check the token against a locally-stored seen-set *(free — this **is** the
   "brand-new token" test)*
3. Resolve token age for candidates only — GeckoTerminal pool-creation time *(free)*
4. Enrich survivors with Birdeye PnL / Nansen labels *(metered)*
5. Convergence counter falls out of step 2 *(free)*

⚠️ **The seen-set cannot live in a module-level `Map`.** Per-lambda state on Vercel means false
re-fires on every cold start (`CLAUDE.md` trap 5). It belongs in Supabase.

⚠️ **The webhook receiver is a new `/api/*` route that writes data.** It needs signature
verification from the outset — it must not join the existing unauthenticated-endpoint debt.

---

## Module 1 — Recommended wallet stack: **$39/month**

| Layer | Provider | Cost | Role |
|---|---|---|---|
| Realtime trigger, Solana | **Helius free** | $0 | 1 webhook × 100k addresses; parsed transactions |
| Realtime trigger, EVM | **Alchemy free** | $0 | 5 webhooks × 100k; 30M CU/mo; `getAssetTransfers` |
| **Wallet PnL + trade history** | **Birdeye Lite** | **$39** | 2.5M CU; realized + unrealized PnL; **PnL-multiple takes 50 wallets × 1 token** — exactly the query for "which of my wallets are in this?" |
| PnL on ETH/Polygon/Base | **Moralis free** | $0 | 40k CU/day; also ships *top-profitable-wallets-for-a-token* — a free smart-money discovery primitive |
| First-funder / clustering | **Etherscan V2** + Alchemy | $0 | earliest inbound transfer — avoids Helius `funded-by` at 100 credits/call |
| Cohort backfill | **Dune free** | $0 | 2,500 credits/mo; weekly offline win-rate job |
| Token age | **GeckoTerminal** | $0 | pool creation time |

**Watch items.** Birdeye's wallet endpoints carry a separate **30 req/min cap independent of plan
RPS** — that, not CU, is the real ceiling; batch via the 50-at-a-time endpoints. Moralis PnL covers
**only Ethereum, Polygon and Base** — no Solana. Helius free-tier monthly credits are **UNKNOWN**
(sources say 100k / 500k / 1M — measure on a real key).

**$0 variant:** drop Birdeye. Keeps full realtime detection and EVM PnL; loses Solana PnL, which
given Solana's share of new-token activity is a real loss. The $39 is worth it.

**At ~$100:** Cielo Builder ($89, 100k credits, all endpoints) is the best *product fit* surveyed —
its Trading Stats endpoint (30 credits) approximates the entire wallet-profile object across 30+
chains in one call.

**Excluded:** Arkham (gated, cost UNKNOWN, not self-serve) · Zapper & Sim (dead) · Solscan Pro
(price UNKNOWN, beaten by Birdeye on the same chain) · GoldRush (no free tier; $10 too thin, next
step $250) · Nansen (excellent labels, but 2,000 credits/mo can't support discovery — revisit as a
$49 add-on).

---

## Module 1d — Wallet clustering

Usable public signals, descending strength:
1. ~~Common-input-ownership~~ — UTXO only, **does not transfer to EVM/Solana**
2. **Shared first funder** ("star heuristic") — highest-signal, cheapest heuristic on account-model
   chains; the documented basis of Sybil detection
3. **Synchronized trades** — strength comes from *repetition*; one coincidence is noise, ten is not
4. **Common counterparties** — shared unusual contracts, routers, bridges
5. **Behavioural fingerprints** — gas preferences, timing-of-day, round-number amounts

**The step naive implementations skip:** weight each shared-funder edge by **inverse frequency of
the funder**. A CEX hot wallet funds millions of addresses and carries ~zero information; a fresh
wallet that funded exactly four addresses is a very strong edge. This is what separates a useful
cluster signal from garbage.

### 🔴 Hard output constraint (§11)

Ship `{ possible_cluster: true, confidence: 0.0–1.0, signals: [...], evidence_tx: [...] }` —
**never** an `identity`, `owner`, or `is_same_person` field. *If the field doesn't exist in the
schema, no downstream page can accidentally render an accusation.* Confidence must be a function of
how many **independent signal families** agree, not any single signal's strength; one shared funder
alone must never exceed low confidence. Define the confidence bands as **one shared constant** from
day one — the verdict-vocabulary drift (`CLAUDE.md` trap 2) is the cautionary precedent.

---

## Module 2 — Recommended mint stack: **$0/month**

**Reservoir's death means mint radar is now an RPC-indexing problem, not an API-subscription
problem.** That is good news: raw-log indexing is free, has no limit beyond your RPC, gives
sub-block latency, and works on chains no NFT API covers.

| Layer | Provider | Cost | Role |
|---|---|---|---|
| Realtime marketplace events | **OpenSea Stream API** | $0 | WebSocket; **does not consume REST rate limit**; only API covering both exotic chains |
| Collection + event REST | **OpenSea v2** | $0 | ⚠️ instant free key **expires in 7 days** — get a portal key before shipping |
| **Upcoming mints** | **Magic Eden `/launchpad/collections`** | $0 | only free structured feed of *scheduled* launches; 120 QPM Solana / 180 EVM, no key |
| **Mint velocity, any EVM chain** | **Own RPC log subscription** | $0 | `Transfer` where `from == 0x0` — the entire primitive |
| Supply ratio | Same RPC | $0 | `totalSupply()`/`maxSupply()`, polled only for live-velocity contracts |
| Backfill | **NFTScan free** | $0 | 10,000 calls/day, ~20 chains |

### Detecting live vs finished

No API gives mint progress — compute it. Rolling counters per contract (mints in 1m/5m/60m, plus
*unique minters* per window):

| State | Signature |
|---|---|
| **Live and hot** | high mints/min, rising or flat; unique minters ≈ mints |
| **Live but slow** | low non-zero mints/min sustained across many blocks |
| **Finished (sold out)** | velocity → 0 **and** `totalSupply() == maxSupply` |
| **Finished (died)** | velocity → 0 **while** `totalSupply() ≪ maxSupply` |
| **Bot-dominated** | high mints/min but **unique minters ≪ mints**, minters sharing a funder |

**Sold-out and died both look like "velocity → 0" — only the supply read separates them, and
scoring must never conflate them.** Percent-minted + mints/min gives the actually-actionable
number: *"73% minted, 40/min, ~4 min to sellout."*

Velocity must come from your own event stream, **not polling** — a 4,444-piece free mint can
complete in under two minutes.

⚠️ `maxSupply` naming is not standardised (`MAX_SUPPLY`, `collectionSize`…) — probe several, fall
back gracefully.

---

## The two exotic chains — and why those tools chose them

### Robinhood Chain
EVM **L2 on Arbitrum Orbit**, settling to Ethereum. **Chain ID 4663**, ETH gas, ~100ms blocks.
Testnet 2026-02-10, **mainnet 2026-07-01**. By early Aug 2026: 100M+ cumulative transactions,
~$775M TVL at its 2026-08-06 ATH. Standard Ethereum JSON-RPC — "tooling built for Ethereum or
Arbitrum works with no protocol-level changes."
**Free public RPC: UNKNOWN** — every concrete endpoint found was commercial (Chainstack, Dwellir).
**OpenSea: fully supported** ✅. Alchemy lists it at RPC level (NFT-API level UNKNOWN). Magic Eden
and NFTScan: no.
*Real mint venue:* StonkBrokers (4,444, free mint 2026-07-17) reached ~13 ETH floor within a month.

### Stable
EVM **L1 for stablecoin payments**, **USDT0 as native gas token**, Bitfinex/Tether-backed (~$28M).
**Chain ID 988**, ~0.7s blocks. **Mainnet 2025-12-08.**
**Public RPC: `https://rpc.stable.xyz`** ✅ · explorer `stablescan.xyz`.
**OpenSea: supported** ✅. Magic Eden, NFTScan, Alchemy: no evidence.
*Real mint venue:* Stable Punks (10,000 fully on-chain ERC-721, 0.5 USDT each).

### The strategic read

Both are standard EVM with JSON-RPC — **you do not need an NFT API to cover them.** A
`Transfer`-from-zero subscription against `rpc.stable.xyz` gives complete Stable mint coverage for
**$0**, and the same code covers Robinhood Chain.

**This is almost certainly why J7Tracker and MintGo both chose these chains.** They are new, they
have real mint activity, and the incumbent providers (Magic Eden, NFTScan, and the now-dead
Reservoir/SimpleHash) don't cover them — so a small team doing raw log indexing holds a genuine,
defensible coverage advantage over anyone reselling an aggregator. **OpenSea is the only major API
reaching both, and its Stream API is free.**

That is a real competitive opening, and it costs nothing to take.

---

## Do not build against

**Reservoir · SimpleHash · Zapper · Sim by Dune** — all dead.
**Blur** — no official public API or SDK; Ethereum-only and pro-trader focused, not a mint venue.
Its absence costs a mint radar nothing.
