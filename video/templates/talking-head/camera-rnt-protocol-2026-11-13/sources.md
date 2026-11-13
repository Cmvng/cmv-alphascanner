# Sources: "RNT Protocol explained" (the owner's recording, 13 Nov 2026)

Everything on screen, where it comes from, and its date. The real screens were captured by `capture.mjs` on
13 Nov 2026 between 07:47 and 07:49 UTC, as served, without a wallet.

## The project
- RNT Protocol (rnt.finance), the Reental ecosystem on Polygon: "Where real estate becomes liquid capital" (its
  homepage, 13 Nov 2026; shown whole). Whitepaper (Aug 2026): a shared layer for tokenized real estate; RNT Lend is
  its lending market (formerly Reenlever), "based on AAVE's architecture"; "Loans of up to 75%... in USDT"; the
  borrower keeps collecting the monthly rent; lenders supply stablecoins and earn the interest.
- RNT Lend is a white-label Aave V3 market for Reental (Aave governance, ARFC posted 26 Jun 2024, Snapshot passed
  Jul 2024: https://governance.aave.com/t/arfc-deploy-whitelabel-aave-v3-market-reental/18080).
- @rntprotocol post, 7 Oct 2026: "$30M+ total market size - $9M+ borrowed... 100+ real estate assets listed - 12% APY
  for USDT suppliers, variable... 75% max LTV" (https://x.com/rntprotocol/status/2107883367194612214). Not on screen.

## The numbers in the owner's example (all three confirmed on the real app)
- Max LTV 75%, liquidation threshold 80%, liquidation penalty 10%: RNT Lend, property token "Costa Mediterranea 1"
  (Reental-CME-1), its own page, 13 Nov 2026 (shown whole, the three boxes ringed on the owner's words).
  https://lend.rnt.finance/reserve-overview/?underlyingAsset=0x243e4bacc4b4d61b87816c945544286eb29125c6&marketName=reental_polygon_v3
- That token's price: $110.61 (oracle price in the header shown, 13 Nov 2026).
- USDT supply APY 10.74% (the owner: "10% or 10.5%"), borrow APY 12.88%: RNT Lend's API, 13 Nov 2026 07:30 UTC
  (fetch_data.py) and the USDT0 page (shown whole, the APY ringed). Over the last week it moved between 10.06% and
  15.34% (7-day average shown on the page: 10.29%). The project calls it variable.
- Derived on screen, labelled: interest on $7,500 at 12.88% ≈ $2.65 a day; $10,000 supplied at 10.74% ≈ $1,074 in
  a year "if the rate stayed where it is today".
- The market: total market size $31.24M, total value locked $21.69M, total borrowed $9.55M (RNT Lend home, 13 Nov
  2026, shown whole; the same TVL and borrowed figures on DefiLlama, https://defillama.com/protocol/rnt-lend).

## Not on screen, for the message
- No published audit found; DefiLlama lists "audits: 0". The RNT token: Polygon, 200M fixed supply, Reental is its
  largest holder (whitepaper); CoinGecko price about $0.36 (13 Nov 2026).
- An independent critique (Daniil Kozin, 1 Jun 2026; one source, the author sells a competing service): in Spain the
  holder gets a participatory loan, not the property itself; the largest wallet holds 26.8% of RNT.
- The website links to @RNT_token; the account the owner sent is @rntprotocol (its own post describes RNT Lend).
