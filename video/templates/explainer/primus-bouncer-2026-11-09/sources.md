# Primus Labs, "The Bouncer" (9 Nov 2026): sources

Every line of the video and where it comes from. All pages were read on 9 Nov 2026; the three screens in the video were
captured that day (the Unitas page at 20:10 UTC).

## Sources
| Key | Source | Date |
|---|---|---|
| P1 | [Primus docs, home](https://docs.primuslabs.xyz/) | docs redeployed 21 Oct 2026 |
| P2 | [Primus docs, tech intro (zkTLS, MPC and Proxy modes)](https://docs.primuslabs.xyz/primus-network/tech-intro/) | 21 Oct 2026 |
| P3 | [Primus docs, verification logic](https://docs.primuslabs.xyz/build/op/) | 21 Oct 2026 |
| P4 | [Primus docs, zkTLS SDK overview](https://docs.primuslabs.xyz/enterprise/zk-tls-sdk/overview/) | 21 Oct 2026 |
| P6 | [Primus docs, AlphaNet tutorial](https://docs.primuslabs.xyz/primus-network/alphanet/tutorials/) and [FAQ](https://docs.primuslabs.xyz/primus-network/alphanet/faq/) | 21 Oct 2026 |
| P11 | [primuslabs.xyz](https://primuslabs.xyz) | redeployed 26 Oct 2026 |
| P12 | [Unitas proof of reserves, on Primus](https://por.primuslabs.xyz/unitas) | live page, captured 9 Nov 2026, 20:10 UTC |
| P13 | [Primus AlphaNet launch post](https://medium.com/@primuslabs/primus-alphanet-launch-bffd37234e61) | 16 Oct 2025 |
| P14 | [Bringing verifiable data to BNB Chain with Primus zkTLS](https://medium.com/@primuslabs/bringing-verifiable-data-to-bnb-chain-with-primus-zktls-faa3b6e1d66b) | 23 Jun 2026 |
| P15 | [Xiang Xie (Primus Labs), Real World Crypto 2025 slides](https://iacr.org/submit/files/slides/2025/rwc/rwc2025/5/5_slides.pdf) | 2025 |
| P17 | [Primus on the Chrome Web Store](https://chromewebstore.google.com/detail/primus/oeiomhmbaapihbilkfkhmlajkeegnjhe) | read 9 Nov 2026 |
| P22 | [Primus docs, lending scenario](https://docs.primuslabs.xyz/implementation-scenarios/lending/) | 21 Oct 2026 |
| B1 | [BNB Chain: ZKredit](https://www.bnbchain.org/en/blog/zkredit-bringing-real-world-credit-identity-onchain-privately) | 25 Mar 2026 |

## Line by line
| In the video | Source |
|---|---|
| The club door: to prove you are over 18 you hand over the whole ID | An illustration, ours |
| A blockchain can't see your bank, your exchange or your payslip | P1: "The most valuable off-chain data is also the most sensitive, and today it can't be both used and protected." |
| Most on-chain loans demand collateral | P22: "most on-chain loans require collateral from users" |
| Apps ask you to upload everything | P14: "This allows applications to verify facts rather than collect data" |
| You log in to the real site, in your own browser | P2 (no change to the data source's servers), P11 (data "stored locally on your device") |
| A Primus node witnesses the encrypted session | P2 (MPC mode: node and browser build the session keys together; Proxy mode: the node relays the encrypted traffic) |
| A signed proof of one line: balance over a thousand dollars, true | P14: "My account balance exceeds a specified threshold." The $1,000 and the $2,480.15 on the cards are examples |
| The app checks the proof, not your statement | P14; B1: "The original data never leaves the user. Only the proof goes onchain." |
| Unitas runs its proof of reserves on it: nearly $50 million against $47.5 million in supply | P12, the real page: Total Reserves $49,881,681.19, Total USDu Supply $47,493,300.49, ratio 1.0503, verified 20:10:21 UTC, "Live" |
| Anyone can open that page | P12 (no login) |
| One: it proves where the data came from, not that the data is right | P12, on the page itself: "Primus does not independently audit the accuracy of baseline data, nor does it provide certification…" P15 lists the assumptions (trust the TLS server; no collusion between client and verifier) |
| Two: by default the app still sees the one thing it asked for | P4: "By default, the SDK retrieves a plaintext verification result." P3: the app can ask for a hash or a true/false instead |
| Three: it's early | P13: "Primus AlphaNet marks the early stage of Primus Mainnet" |
| There's no official token | No token is named on the site, the docs or the apps (read 9 Nov 2026). "$PRIM" appears only in third-party posts |
| Points are a reputation score | P6 FAQ: "reputation score on the AlphaNet is a different type of points from the legacy XPs" |
| You use it through a browser extension | P17, the real page: 60,000 users, 3.5 from 75 ratings |
| A proof costs a tiny fee on Base | P6 FAQ, the real page: "approximately 0.000035 ETH… plus a very small amount of gas fee on the Base chain" |

## Left out, and why
- Kaito campaign and "$PRIM": third-party posts only.
- The 540K extension users from Primus's 2025 slides: the store shows 60,000 today, the figure on screen.
- ZKredit, Trendle, agents: announced or in development, not live.
