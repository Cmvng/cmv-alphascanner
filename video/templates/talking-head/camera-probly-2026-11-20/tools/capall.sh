#!/usr/bin/env bash
# All the Probly captures for the 20 Nov video, each with the boxes of the words to ring (same scroll as the picture).
C=$1
HSCROLL=Crypto BOXES=homeN.json timeout 100 node $C "https://www.probly.com/en" homeN.png 480 900 "Sports" "Politics" "Crypto" "Esports" "Elections" "Pop-Culture" "Next CEO of NVIDIA?"
BOXES=sn.json timeout 100 node $C "https://www.probly.com/en/safety-net" sn.png 480 900 "Safety Net" "Your losses on us" "Trade" "\$50" "+ across" "days. End the campaign with a net loss and we return up to" "\$25" "of it as a trading bonus." "Nov 12, 2026 - Nov 24, 2026 (12:00 UTC)" "Campaign Ends in"
SCROLLTO="How it works" BOXES=snH.json timeout 100 node $C "https://www.probly.com/en/safety-net" snH.png 480 1280 "Join" "the campaign" "Trade" "\$50+" "different days" "Get up to" "\$25" "back on losses" "End the campaign with a realised net loss and we" "return up to \$25 of it as a trading bonus."
BOXES=bayL.json timeout 100 node $C "https://www.probly.com/en/sports/soccer/bun-bay-koe-2026-11-20" bayL.png 480 900 "Bayern vs Köln" "8:30 PM" "BAY" "KOE" "November 20" "91%"
BOXES=arsL.json timeout 100 node $C "https://www.probly.com/en/sports/soccer/epl-new-ars-2026-11-21" arsL.png 480 900 "Newcastle vs Arsenal" "6:30 PM" "ARS" "NEW" "November 21" "63%"
SCROLLTO="Any required conversion" BOXES=conv.json timeout 100 node $C "https://docs.probly.com/get-started/deposits-and-withdrawals" conv.png 480 800 "three crypto deposit methods" "Connected Wallet" "Any required conversion is handled automatically." "send any of the supported crypto" "Click on Deposit"
SCROLLTO="Arbitrum" BOXES=net.json timeout 100 node $C "https://docs.probly.com/get-started/deposits-and-withdrawals" net.png 480 1000 "Withdrawals" "Arbitrum" "Base" "Solana" "Polygon" "Ethereum"
