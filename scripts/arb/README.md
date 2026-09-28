# Football arbitrage scanner: Nigerian bookmakers vs Limitless

Compares bookmaker 1X2 odds (SportyBet and others) with the live order books of Limitless Exchange's football
markets, and against each other. Standalone: nothing in `src/` or `api/` uses it.

```bash
npm run arb                                        # breakeven sheet for every upcoming Limitless match
npm run arb -- --odds scripts/arb/odds.json        # check real bookmaker odds you typed in / exported
npm run arb -- --sportybet                         # pull SportyBet live (run from a Nigerian / home connection)
npm run arb -- --match "spain vs croatia" --within 24
```

Flags: `--match <text>` · `--within <hours>` · `--include-live` · `--no-fee` · `--fee-scale <0..1>` · `--min-margin <pct>` · `--json`

Behind a proxy (e.g. cloud sandboxes) prefix with `NODE_USE_ENV_PROXY=1`.

## Odds file

One entry per bookmaker per match (`odds.example.json`). Any number of bookmakers; home/away order does not matter.
`dc` (double chance) is optional. Team names are matched after normalising accents and a few aliases
(`ALIASES` in `arb.mjs`); add to it if a match doesn't pair up.

```json
{ "bookmaker": "Bet9ja", "home": "Belgium", "away": "France", "odds": { "H": 3.3, "D": 3.7, "A": 2.2 },
  "dc": { "1X": 1.55, "X2": 1.4, "12": 1.3 } }
```

## What it checks (all per $1 of payout; arb if the total cost is under $1)

| Check | Legs | Cost |
|---|---|---|
| Bookmakers 3-way | best odds for Home, Draw, Away across bookmakers | Σ 1/odds |
| 3-way incl. Limitless | as above, but Limitless YES where it is cheaper | mixed |
| Bookie + Limitless NO | back outcome *i* at a bookmaker, buy *i* NO on Limitless | 1/odds + NO ask |
| Limitless YES + bookie DC | buy *i* YES on Limitless, back "not *i*" double chance at a bookmaker | YES ask + 1/DC odds |
| Limitless 3xYES / 3xNO | internal consistency of Limitless (3 YES pay $1, 3 NO pay $2) | Σ asks / Σ NO asks |

A Limitless NO buy at price `1 − p` fills against a YES bid at `p`, so the bid/ask spread is what you pay to be on the
"other side". Margins are computed at top of book, then the scanner walks the book to find the stake size with the
most profit.

## Assumptions and limits

- **Limitless fees:** taker buys pay 0.4-3% depending on price, deducted from shares received (curve from
  docs.limitless.exchange/user-guide/fees). The scanner applies the full published curve, so real fees may be lower
  (loyalty discounts). Limit orders that rest in the book pay no fee, but may not fill.
- **Book depth** comes from the live order book. Bookmaker stake limits, odds caps and bet delays are *not* modelled.
- **Not modelled:** bookmaker withdrawal/deposit costs, Nigerian gaming taxes, USDC on/off-ramp costs, price moves
  between placing the two legs. On pre-match arbs under about 1% these usually decide the outcome.
- **Settlement rules must match.** Both sides need to resolve on the same 90-minute result. Check the Limitless
  market description for postponement/void terms.
- **Verified from the build sandbox:** Limitless listing, order books and maths. **Not verified:** `sportybet.mjs`,
  because SportyBet, Bet9ja, BetKing and NairaBet all return 403 to datacenter IPs. Run bookmaker fetches from a
  Nigerian or home connection. Bookmakers can throttle scrapers and limit accounts that only take arbs.
