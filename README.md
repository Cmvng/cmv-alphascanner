# CMV AlphaScanner

Two halves of one question about a crypto project.

**Discovery** watches chains for things that just started moving and scores them as **Heat**
(0–100, decaying). **Judgement** takes an X handle and returns an **Alpha Score** (0–100, with a
tier, 17 metric breakdowns, red flags and a shareable verdict card).

Neither half is useful alone. A heat-ranked list is a momentum screener; an alpha-ranked list
requires you to already know what to type in. Together they answer *"what just started moving,
and is it worth anything?"* — which is what the [`/grid`](#pages) view plots.

Live at **cmv-alphascanner.vercel.app** (scanner) — the engine deploys to Railway.

---

## Quick start

```bash
npm install
cp .env.example .env          # fill in X_API_BEARER_TOKEN at minimum
npm run build                 # tsc + tsc -p tsconfig.api.json + vite build
npm run dev                   # frontend only, on :5173
```

To run the whole thing — SPA, API handlers, engine routes and the scheduler — as it runs in
production:

```bash
cd server && npm install && npm start   # :3000, serves ../dist
```

The server needs `DATABASE_URL` for anything engine-related. Without it the app still runs: the
scanner works and every engine route reports `database_unavailable` rather than returning an
empty list, because an empty radar and a disconnected radar are different answers.

Migrations in `db/migrations/` are applied automatically at boot, in filename order, and are
written to be safe to re-run.

---

## Pages

| Path | What it is |
|---|---|
| `/` | **Radar** — what just started moving, ranked by priority rather than raw heat |
| `/grid` | **Heat × Alpha** — the two-axis view; unjudged targets are listed, never plotted |
| `/target/:id` | **Evidence** — heat components, risk checks, and the raw signal timeline |
| `/scan` | The original scanner: paste an X handle, get a score and a verdict card |
| `/feed` | Public feed of past scans |
| `/tierlist` | Drag-and-drop tier board, browser-local |
| `/admin` | Fake-404 gated admin |

---

## How the engine works

```
ingest ─→ enrich ─→ heat ─→ risk ─→ alpha scan ─→ rank ─→ alert
                      │                                     │
                      └────── outcomes ─→ trust ────────────┘
```

Nine jobs run in-process on a scheduler (`server/src/index.ts`), each guarded by a Postgres
advisory lock so two instances cannot double-run one job:

| Job | Every | What it does |
|---|---|---|
| `ingest-onchain` | 10m | Asks every provider what is new; writes normalized events |
| `enrich-targets` | 10m | Fills in market cap and the X handle — the only join to the scanner |
| `compute-heat` | 10m | Recomputes heat for anything with recent evidence |
| `assess-risk` | 12m | Contract risk indicators, independently of heat and alpha |
| `assess-provenance` | 45m | Domain age and certificate history |
| `check-sources` | 15m | Probes every provider so degradation is visible |
| `run-alpha-scans` | 15m | The only automatic spender — heavily gated (see below) |
| `track-outcomes` | 20m | Snapshots detection state, then measures forward |
| `update-trust` | 60m | Moves source weights based on what actually happened |
| `dispatch-alerts` | 5m | Telegram, graded by band, deduped per rule |
| `flush-meter` | 5m | Writes buffered per-provider call counts |

### Heat

`server/src/lib/heat.ts` is pure and tested. Heat is a **convergence** score: how many
*independent* sources touched the same target inside a decaying window.

- **Per-type half-lives** — a new pool decays in 3h, a paid promotion in 6h.
- **Geometric independence** — the *n*th event from a source already counted contributes
  `0.25ⁿ`. One source repeating twenty times can never outweigh three that agree, which is the
  entire point of measuring convergence rather than volume.
- **Obscurity bonus** — a small unknown target scores higher than a large known one for the same
  evidence. Discovery that only surfaces things you already know about is not discovery.
- **Trust weighting** — per-source, learned from recorded outcomes rather than asserted.

All of it is deterministic code. **No LLM ever computes a score** — models summarise, classify
and explain; they never do arithmetic that has to be reproducible.

### Cost control

`run-alpha-scans` is the only job that spends money automatically, and it is gated four ways: a
heat threshold, a rising edge (a target already scanned cannot re-trigger), a per-run ceiling, and
a 24-hour re-scan cooldown. Every provider call is metered; `/api/costs` reports spend per
provider and, more usefully, cost per qualified signal.

Every threshold in the system lives in the `signal_config` table, not in a constant — the right
threshold is regime-dependent and should be tunable without a deploy.

---

## The rules this codebase is built on

These are not style preferences. Breaking one produces output that is confidently wrong, which is
worse than no output.

1. **"Not checked" is not "nothing found."** Every risk check carries `checked: boolean` and a
   reason. A timed-out check that rendered as a clean bill of health would be a lie the reader
   cannot detect. The same rule governs the UI: an unjudged target is never plotted at zero, and
   unknown liquidity renders hollow rather than small.

2. **Risk is never aggregated into a verdict word.** Counts by severity, and a coarse rollup for
   list views where `null` means *not assessed*. No output names an actor, asserts intent, or
   predicts an outcome.

3. **Every external string is data, never instructions.** Bios, tweets, token names, READMEs and
   API responses all reach the model wrapped in explicit boundaries (`api/_lib/untrusted.ts`).

4. **No unauthenticated route may spend money or write data.** The scanner's Anthropic call is
   origin-gated and rate-limited; admin writes are HMAC-token gated; the watchlist is
   owner-scoped.

5. **Scoring is deterministic.** Heat, decay, convergence, dedupe and thresholds are pure
   functions. This keeps cost bounded and results reproducible.

6. **Never present simulated numbers as live intelligence.** Every route reports unavailability
   rather than returning a plausible empty result.

---

## Layout

```
src/pages/          radar · grid · target · home (scanner) · feed · tierlist · admin
src/lib/            verdicts, session token, X API wrapper
api/                Vercel-style handlers — xproject, claude, save-scan, websearch, admin
api/_lib/           untrusted-text boundary, system prompt, request guard, admin auth
server/src/
  index.ts          Express app: SPA + api/* adapter + engine routes + scheduler
  lib/              heat (pure, tested) · net · meter · health · dedupe · admin
  providers/        geckoterminal · dexscreener · goplus · mintlogs · provenance
  jobs/             one file per scheduled job
  routes/           radar · target · performance · costs · watchlist
db/migrations/      applied in filename order at boot
```

---

## Provider notes

Free and keyless unless stated. Several widely-recommended alternatives are dead — Reservoir
(2025-10), SimpleHash (2025-03), Zapper (2026-08) and Sim by Dune (2026-08) — so do not design
against them.

- **GeckoTerminal** — the only free purpose-built *new pool* feed. DexScreener's
  `token-profiles`/`token-boosts` are **promotion** feeds: a token appears there because someone
  paid, not because it was deployed. Do not swap these roles.
- **DexScreener** — enrichment and the X-handle/website join.
- **GoPlus** — ~15 contract risk indicators across EVM and Solana in one call.
- **Mint logs** — raw `Transfer` from `0x0` over public RPC. One log filter covers any EVM chain
  for nothing, including chains no NFT API covers. The first signal family that is not a price
  API, which is what makes convergence mean *different kinds of evidence agreed*.
- **RDAP + crt.sh** — domain age and certificate history for provenance.

---

## Testing

```bash
cd server && npm test   # pure functions: heat scoring, domain extraction (34 tests)
npm run build           # must stay clean; typechecks src/ and api/
npm run typecheck       # same, without emitting
```

Only pure functions are tested, deliberately. The provider adapters are thin wrappers around
network calls whose value is in behaviour under failure, which a mock would assert nothing useful
about — the circuit breakers and `checked/unchecked` handling are what carry that weight.

---

## Further reading

| Document | What it covers |
|---|---|
| `CLAUDE.md` | Project memory — the numbered traps that will bite you |
| `CHECKPOINT.md` | Codebase audit, issue list with file:line refs, work log |
| `ALPHA_ENGINE_SPEC.md` | Product direction |
| `AUDIT_AND_PHASE1_PLAN.md` | Verified research, provider matrix, Phase 1 file plan |
| `REMAINING_WORK.md` | Honest scoreboard of what is and is not built |
| `DEPLOYMENT_STATE.md` | Live Railway state and the actions still blocked |
| `RISK_ENGINE_RESEARCH.md` | Risk sources, neutral wording, the checked/unchecked rule |
| `WALLET_MINT_RESEARCH.md` | Wallet and mint sources, dead providers |
