# Sources: Gambit (the owner's script, 27 Nov 2026)

All pages were read on 27 Nov 2026. The captures on screen were taken that day (Lagos time, 760 CSS px wide at 2x);
the ring boxes are measured from each page's own text (`tools/cap.cjs`).

The official images came from the owner, as sent: og-image, live-market-preview, copy-agents,
weekly-tournament-standings, creator-spice-bets, creator-ih8y, logo and robinhood-chain-deposits.

Gambit's X account is @gambitmarkets (linked in the site footer). X could not be opened from here (HTTP 402 and 403),
so no X post was checked. Gambit's Telegram group (t.me/gambitcommunity) was read instead.

## Each line of the script against Gambit's own pages
| Script line | Verdict | Gambit's own wording | Where |
|---|---|---|---|
| "earn … without putting any money down" | Partly | "Publish pick places no bet" / "No money is placed. The pick goes on your agent's pick record at the live price." It is not confirmed that an account with no balance can publish picks; the app also has "This agent can't publish picks". | the app's own code |
| yes or no on sports, politics, crypto and world events | Confirmed | Terms: "politics, cryptocurrency, sports, technology, culture, world events, and economics". The markets page has the tabs Sports, Politics, Crypto, Tech, Finance, Business and More (6). | gambitmarkets.com/documentation/policies/terms; app.gambitmarkets.com/markets (captured) |
| trades fill on Polymarket and Kalshi liquidity | Confirmed in Gambit's words | "Trades execute through established liquidity pools (e.g. Polymarket, Kalshi)". Every market opened was a Polymarket market; no Kalshi market could be opened. | /documentation/market-mechanics/liquidity-strategy (captured) |
| AI insights on the market page | Confirmed | The market page's Analyze menu has "AI Insights" (captured). The panel's button now reads "Run research"; the official image shows an older "Generate Insights" button. "AI research can be wrong. It is one input, not advice." | app.gambitmarkets.com/events/1332035 |
| copy an agent, same side, withdraw anytime | Confirmed | "Copy this agent. Every trade it places is placed for you too, sized to your deposit. Withdraw any time." Copy sizes: Proportional, or Fixed (min $2). | app.gambitmarkets.com/agents/7103 |
| weekly tournament: best ROI takes $250 | Confirmed | "Weekly · Nov 23 – Nov 30", "CASH GIVEAWAY $250 to this week's top-ranked agent"; it is ranked by ROI (the public API's "rankBy":"roi"). The other tournament prizes are Gambit Points, not cash. | app.gambitmarkets.com/leaderboard (captured) |
| at least 3 trades and $100 volume | Confirmed | "3+ trades", "$100+ volume" | the same page (captured) |
| creator: post picks, no capital needed | Partly | the publish-pick wording above | the app's code |
| "1% of whatever people trade through your pick" | Partly | The trade slip reads "1% creator fee to [agent]". It is 1% of the amount a person puts on that pick, charged to them, and shown on the agent as "Pick fees earned". What it is paid in, and when, is not stated. | the app's code |
| "4 quick steps" | Not found | | |
| creator badge, 1,000 Gambit points, 50% of referral volume fees | Partly | Only in the app's admin code: "Making someone a creator moves their referral share to 50%, credits 1,000 Gambit Points and shows the Creator tag on their profile". It is a tag, not a badge; it is 50% of the fees on referrals' agent trades, not of volume; Gambit staff appear to grant it. There is no public creator-program page. | the app's code |
| deposits in USDG on Robinhood Chain, connect your wallet | Partly | The deposit window (after sign-in): "Send USDC to your own Gambit address on Base, Polygon, Solana and more". The networks are Solana, Ethereum, Polygon, Arbitrum, Base and Robinhood, with a USDC $1 minimum. USDG on Robinhood Chain is the settlement asset only for Community Markets. Sign-in: Google, Telegram, X or a wallet. | the app's code; the official image "Robinhood Chain Now Live" |
| no token confirmed, don't buy any $GAMBIT contract | Partly | The docs describe a planned token: "The utility token powering the Gambit Markets ecosystem", "Blockchain Base · Total Supply 100M · Transaction Tax 5% · Ticker $GMBT" (the docs say both $GAMBIT and $GMBT). There is no contract address and no launch date. | /documentation/token; /documentation/token/information |

## What is on screen, and why
- **Kept as the owner wrote it:** every spoken line, and its caption.
- **Drawn only from what the sources confirm:**
  - The rewards cards say "1,000 Gambit points" and "50% referral share", with their source ("Gambit app, read 27 Nov").
  - The Creator tag is ringed on Gambit's own image.
  - There is no "4 steps" graphic and no "USDG" chip.
  - The token card says "no contract address published" and "no official contract", with the docs' wording as its source.

## Eligibility and who runs it
- Terms, last updated 16 March 2026:
  - age: 18, or the age of legal majority if higher;
  - users must be where prediction markets are "not prohibited" and not in sanctioned places;
  - no country list (Nigeria is not named);
  - the entity is "Gambit Markets", with no registration or address.
- The landing page says "Built by the PAAL core team".

## Fees and risks the script leaves out
- Copy-agent owners take a commission on profits (5% on the agent checked), plus the 1% pick fee.
- The referral share is a share of "the 1% fee on every agent trade".
- Gas fees are the user's.
- Terms: "Agents may incur losses… such losses are your sole responsibility"; "Gambit assumes no liability for losses incurred through copy-trading".

## Icons and music
- No icon sets were used.
- Music: "Sparta" (Mixkit 370, free licence), approved by the owner on explainers.
