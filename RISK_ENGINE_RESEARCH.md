# Risk & Scam Detection — Research Findings

**Date:** 2026-08-22 · Informs Master Spec §21 (risk engine) and §22 (scam/LARP detection).
Research only — nothing implemented.

> **Verification note.** Every vendor doc host was blocked by this sandbox's egress proxy, and
> direct API calls returned 403 at the proxy. What *did* work was GitHub code search — so the
> highest-confidence evidence below is **real production client code calling these APIs**, not
> vendor marketing. `VERIFIED` means endpoint strings and response field names were read in
> source. Confirm pricing and rate limits from real egress before committing.

---

## 🔴 The one rule that must not be broken

**"No indicator found" and "not checked" are different answers, and conflating them is dangerous.**

The existing enrichment pattern — `withTimeout(...)` inside `Promise.allSettled`, returning `null`
on failure — is correct for enrichment: a missing TVL figure is just a missing figure. It is
**wrong for risk**. A risk source that times out and returns `null` renders to the user as *"no
risk found"*, which is a clean bill of health the system never actually issued.

Every risk check must therefore carry its own status:

```ts
{ indicator, severity, observation, implication, source, observed_at,
  checked: boolean, reason?: 'source_unavailable' | 'chain_unsupported' | 'not_applicable' }
```

and the UI must render `checked: false` distinctly from `checked: true, severity: none`. This is
the single most important honesty property of the whole engine, and it is the one place the risk
engine **must** diverge from how enrichment currently degrades.

**Second rule: never aggregate into a verdict word.** "Risk indicators: 3 HIGH, 1 MEDIUM" is
defensible. "SCAM" is not. Ban *scam, rug, fraud, fake, LARP, thief, steal* from user-facing
strings — internal enum names only. Per §54 and the existing verdict-vocabulary drift
(`CLAUDE.md` trap 2), do not introduce a second vocabulary that carries legal exposure.

---

## Good news: the inputs already exist

`api/xproject.ts:299-329` already resolves `chainId` and a pair URL from DexScreener, and `:523`
pulls `contracts[]` (chain + address) from CoinPaprika. **The risk engine needs `(chain,
tokenAddress)` and the scanner already produces both** — no entity-resolution step required. That
materially lowers the build cost of everything below.

---

## The five best checks per unit of effort

### 1. GoPlus `token_security` — ~15 indicators, one call, free, both chain families
`https://api.gopluslabs.io/api/v1/token_security/{chainId}` (EVM) ·
`/api/v1/solana/token_security` (Solana). **No auth. ~30 calls/min free.**

Covers in a single request: `owner_address` (empty ⇒ renounced), `can_take_back_ownership`,
`hidden_owner`, `is_proxy`, `is_mintable`, `is_honeypot`, `cannot_sell_all`, `transfer_pausable`,
`is_blacklisted`, `slippage_modifiable`, `buy_tax`/`sell_tax`, `lp_holders[]` with `is_locked` +
`tag` (names the locker) + `locked_detail.end_time`, `holders[]` with `percent`/`is_contract`,
`creator_percent`. Solana variant gives `mintable{status,authority[]}`, `freezable{…}`,
`transfer_fee`, `non_transferable`, `closable`.

Nothing else comes close on indicators-per-integration-hour. **~half a day.**
✅ VERIFIED (fields read in Sushiswap and two other production clients).

### 2. RugCheck — Solana, free, and it ships the insider graph
`https://api.rugcheck.xyz/v1/tokens/{mint}/report/summary` for scanning,
`/report` on drill-down. Unauthenticated reads, **~1 req/s**.

Returns `score_normalised` (0-100), `risks[] {name, description, level, score}`, `mintAuthority`,
`freezeAuthority`, `lpLockedPct`, `markets[]`, `totalHolders`, `transferFee`, and critically
**`topHolders[].insider`**, `graphInsidersDetected` and `insiderNetworks`.

That insider graph is the closest thing to **free deployer/cluster analysis that exists** — see
the negative result below for why that matters. **~2 hours.**
✅ VERIFIED (fields read in two independent client implementations).

⚠️ **Polarity trap:** RugCheck's score is *higher = riskier*. Solsniffer's "Snifscore" is *higher =
safer*. Our alpha score is *higher = better*. Three scales, three directions — normalise at the
adapter boundary or this will produce an inverted verdict at some point.

### 3. Honeypot.is — the only free *behavioural* check in the landscape
`https://api.honeypot.is/v2/IsHoneypot?address={0x…}` — no key needed today.

Every other honeypot signal is **static inference**; this one **actually simulates a buy and a
sell**. That is why it is the single check where a `CRITICAL` severity is defensible — it is a
behavioural result, not an inference. Returns `honeypotResult.isHoneypot`, `summary.risk`,
`simulationResult.{buyTax,sellTax,transferTax}`, `contractCode.openSource`.

Ethereum, BSC and Base only. Accept the gap rather than paying to close it. **~1 hour.**
✅ VERIFIED (endpoint + fields) · 🟡 chains/no-key inferred.

### 4. Domain age — RDAP + crt.sh — the best ratio in the whole scam layer
Two free, keyless HTTP calls:
- `https://rdap.org/domain/{domain}` → registration event date
- `https://crt.sh/?q={domain}&output=json` → min `not_before` (first certificate)

**A project claiming a multi-year history on a domain registered eleven days ago is the
highest-precision LARP signal available, and it costs nothing.** crt.sh covers the RDAP-privacy
case *and* separately catches the "aged domain, freshly certificated" pattern. **~2 hours for
both.** 🟡 STRONGLY INFERRED.

### 5. Deployer age + sanctioned-counterparty screen
- **Deployer age** — EVM: Etherscan V2 `getcontractcreation` + creator's first tx (free key,
  5 calls/s, 100k/day). Solana: `getSignaturesForAddress` oldest signature.
- **Sanctions** — Chainalysis's **free public oracle**, `isSanctioned(address) → bool`. A plain
  gas-free `eth_call`, **no account or customer relationship required**, on 10 EVM chains
  (`0x40C57923924B5c5c5455c48D93317139ADDaC8fb`; Base uses
  `0x3A91A31cB3dC49b4db9Ce721F50a9D076c8D739B`). Backed by GoPlus `/address_security` for the
  broader SlowMist / BlockSec / OFAC / Chainabuse aggregate.

**~1 day.** 🟡 STRONGLY INFERRED.

---

## The important negative result

**Two checks have no free, mechanical, one-call answer:**

1. **Deployer rug history** ("has this deployer shipped rugs before?") — self-building it means
   recursively re-scanning every prior deployment by that address. That is real infrastructure,
   not a weekend. Commercial one-call answers exist (ChainAware, GetBlock) with undisclosed
   pricing. **RugCheck's insider graph is the closest free proxy on Solana** — which is a strong
   argument for treating Solana as the first chain.
2. **Multi-hop mixer tracing** — commercial only (TRM, Chainalysis, MistTrack). One-hop
   ("was the deployer's first inbound transfer from a known mixer?") is self-buildable against a
   maintained address list; beyond that, don't pretend.

Everything else in §21 is available free today.

---

## Deliberately *not* recommended

| Check | Why not |
|---|---|
| Birdeye `token_security` | Paid tier only, and GoPlus + RugCheck already cover its fields |
| Fuzzy bytecode similarity | CFG extraction + embeddings + FAISS is a project. Exact keccak matching catches only the laziest copies (compiler drift breaks it) |
| Coordinated-posting detection | Method is sound (n-gram TF-IDF, cross-account, hourly buckets) but needs a mention-stream we don't collect and X quota we'd have to buy |
| Copied-website detection | No free API; self-built MinHash needs a corpus that only exists after months of scanning |
| Free-SSL-only as a signal | Nearly every legitimate small project uses Let's Encrypt. **Compounding factor only, never standalone** |

---

## Suggested neutral wording

The rule: **every output describes an observable on-chain or public-record property and its
consequence. No output names an actor, asserts intent, or predicts an outcome.**

| Indicator | Severity | Observation → Implication |
|---|---|---|
| Mint authority not revoked | HIGH | "The mint authority is still assigned to an address." → "The holder is able to create additional supply at any time, diluting existing holders." |
| LP tokens not locked or burned | HIGH | "0% of LP tokens are held by a recognized locker contract or burn address." → "Liquidity can be withdrawn at any time by the LP token holders." *(State the limitation: an unrecognized locker reads as unlocked.)* |
| Simulated sell did not complete | CRITICAL | "A simulated buy succeeded; a simulated sell of the same amount did not complete." → "Under the conditions simulated, this token may not be sellable. Simulation reflects current contract state and can change." |
| Concentrated token supply | MED–HIGH | "The top 10 addresses hold 84% of supply." → "A small number of addresses can move a large share of supply. **Concentration alone is expected in early-stage and recently-launched tokens.**" |
| Ownership retained / upgradeable | MED–HIGH | "The contract matches a known upgradeable proxy pattern." → "Contract logic can be changed after deployment. **Upgradeability is also a normal, deliberate design choice for many established projects.**" |

Two of those five carry an explicit mitigating clause. That is not softening — concentration and
upgradeability are the two checks that produce the most false alarms, and the caveat is what keeps
the output honest.

**When a check passes, say so.** "Mint authority revoked" is information; silently omitting the
row is not. Absence of a warning must never be the only signal that something was fine.

---

## Provider reference

| Provider | Chains | Auth | Limit | Cost | Level |
|---|---|---|---|---|---|
| **GoPlus** | Broad EVM + Solana + Sui | none | ~30/min | free | ✅ endpoints · 🟡 limits |
| **RugCheck** | Solana | none (optional key) | ~1 req/s | free | ✅ endpoints |
| **Honeypot.is** | ETH, BSC, Base | none | — | free | ✅ endpoints |
| **Chainalysis oracle** | 10 EVM | none | — | free | 🟡 |
| **crt.sh / RDAP** | n/a | none | none published | free | 🟡 |
| **Etherscan V2** | EVM | free key | 5/s, 100k/day | free | 🟡 ⚠️ 2026 free tier cut: ~90% chain coverage, records/request 10k→1k |
| Token Sniffer | EVM | key | 500/day Pro | price UNKNOWN | 🟡 |
| Solsniffer | Solana | key | batch 100 | price UNKNOWN | 🟡 |
| QuickIntel | **58+ chains** | provisioned | — | price UNKNOWN | 🟡 |
| De.Fi Scanner | multi | key by request | credit-metered | **UNKNOWN — "free for early adopters" claim is old, unconfirmed** | ⚪ |

---

## Recommendation for phasing

Risk was scoped to a later phase, but **GoPlus alone is one free call returning ~15 indicators, and
the scanner already produces `(chain, address)`**. A minimal risk panel is roughly half a day of
work with no new cost.

**Option to consider:** fold GoPlus + RugCheck into Phase 1 so every discovered target carries a
risk read from day one. Master Spec §60 item 7 ("risk is independently evaluated") is a
definition-of-done condition, and §9 warns a token must not become hot on price alone — a cheap
risk read is the natural counterweight.

**This is a scope decision, not mine to make.** Phase 1 as planned does not include it.
