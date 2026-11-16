# Sources (checked 16 Nov 2026; times UTC unless marked)

The brief is the owner's own (pasted 16 Nov). The script is ours, written from it after a fact-check, and the owner
approved it before Lara read it (one take, 1,660 credits, 1:47.6).

## 1. Kava Lend exploit
- **The Block,** 14 Nov 18:07 EST: theblock.co/news/defi/2026-11-14-kava-lend-loses-roughly-3-8-million-to-hack-sending-kava-token-down-nearly-40-440350.
  The page shows a bot check, so it was not captured. Its facts come from the fact-check's reading:
  - about 55.2M KAVA drained, roughly $3.76M at the pre-attack $0.068;
  - deposit value inflated about 243,000x in a dormant, nearly empty BUSD market, then 127 borrows;
  - Kava on X, quoted by The Block: "This is not an infinite mint. The event is isolated and contained within Kava Lend."
- **Bitquery via CryptoTicker,** 15 Nov: the same 55.2M gross.
- **Upbit** (its own notice is behind a bot check, so the Korean press):
  - deposits and withdrawals stopped at 19:36 KST on 14 Nov (Economy Block, 14 Nov 19:37 KST; CoinReaders, 14 Nov);
  - KAVA/KRW and KAVA/BTC made a trading caution item from 14:00 KST on 16 Nov (Economy Block, 16 Nov);
  - Coinone and Bithumb took the same steps.
- **Price, on screen:** KuCoin's public API, KAVA-USDT, 1-hour candles, fetched 16 Nov 05:53 UTC.
  - 14 Nov 10:00 open $0.0678; 11:00 low $0.0337, close $0.03596.
  - Checked against Kraken KAVAUSD (10:00 low $0.0438, 11:00 low $0.0344) and CoinGecko (last $0.0331, 16 Nov 05:52 UTC).
  - The script says "from almost seven cents to three and a half, in two hours".
- **Differs from the brief:** "about 40%" was the figure on 14 Nov. On the candles the fall reached about 50%.

## 2. Coinone breach
- **Coinone's own notice:** coinone.co.kr/info/notice/5950, posted 14 Nov 23:00 UTC (15 Nov 08:00 KST), captured and
  shown whole.
  - Its support contractor MetaM was breached at about 04:00 KST on 12 Nov.
  - Items that may be exposed: name, phone, email, birth date, bank account number, password, resident registration
    number, ID issue date, address, wallet address, TXID (our translation).
  - Account, trading and wallet systems run separately, and no direct intrusion has been confirmed "so far".
- **Second sources:** BeInCrypto on X, 15 Nov 13:22; Digital Today, 15 Nov; crypto.news, 15 Nov.
- **Not disclosed:** how many users are affected.

## 3. Luxor Commander
- **CoreX Hosting on X,** 15 Nov 03:08: miners pointed at @ocean_mining, at a BTC address (x.com/CoreX_Hosting/status/2121802488898863443).
- **Luxor on X,** 15 Nov 17:25: "unauthorized redirect of hashrate through Commander… just over a dozen client accounts"
  (x.com/luxor/status/2122018094914601464).
- **Luxor's CEO Nick Hansen on X,** 15 Nov 17:17: "a sophisticated AI-enabled vector" (x.com/hash_bender/status/2122016210628096216).
- **Patched within two hours, clients paid in full:** Luxor, quoted by news.bitcoin.com (15 Nov) and by Everything
  Crypto on X (16 Nov 04:00); Cointelegraph (16 Nov).
- **About 13 EH/s:** CoreX and Bitcoin News (WuBlockchain, 15 Nov). Luxor has not confirmed it, so it is labelled
  "by outside reports" and "not confirmed by Luxor".
- **The time on the pin:** the attack began about 01:00 UTC on 15 Nov (6 p.m. PDT on 14 Nov, per the CEO).

## 4. $mihao scam
- **The example post:** @Fjord_Cut, 15 Nov 23:16, "$mihao Airdrop Claim Is LIVE". Its link (mihao-airdrop.fun) is
  hidden by us in the video and was not opened.
- **What $mihao is:** "ni hao cat", a pump.fun memecoin on Solana (DexScreener, 16 Nov).
- **No airdrop found:** its official site mihao.fun has no airdrop or claim content (checked 16 Nov), and no coverage of
  any airdrop was found. The video says "there is no official claim".

## 5. Solflare Private Mode
- **Solflare on X,** 15 Nov 20:09: "PRIVATE MODE. ON." **Solana on X,** 15 Nov 20:19: "Solflare Private Mode, powered by
  @helius. Private balances and payments, 100% self-custodial" (shown, x.com/solana/status/2122062031985721691).
- **solflare.com/private-mode/,** read 16 Nov by the fact-check. It refuses automated visits from here, so it is not
  shown.
  - It hides balance, holdings and payment amounts.
  - "Sender and recipient stay visible on-chain."
  - Private payments work only to Solflare users who have set up Private Mode.

## 6. Meteora
- **Meteora on X,** 15 Nov 21:03: "Introducing the Dynamic Liquidity Exchange…" (shown).
- **DLMM Pro and Project Hypernova** (ChainThink, 16 Nov; a KuCoin flash citing it):
  - DLMM Pro beta, "rolled out in batches";
  - Project Hypernova, a "roadmap" for the next generation of founders and creators on Solana.
- **Breakpoint 2026:** 15–17 Nov, Olympia London (solana.com/breakpoint). Meteora's post does not mention Breakpoint;
  the script says "as Breakpoint opened", which is the timing.

## 7. Pump.fun
- **Alon on X,** 15 Nov 22:44: the update was pushed "a few days ago" to show more clearly how Callout Rewards are
  calculated for the Degen and Diamond pots. His screenshot shows Daily pots of $356,533 and $118,841.
- **Crypto Briefing,** 10 Oct: Alon is a co-founder.

## Voice, music, reactions
- **Voice:** ElevenLabs "Lara" (vChnJZ1Cu89g2XXumPfT, eleven_v4), one take, 1,660 credits. The owner approved the script
  and the cost.
- **Music:** "New Bass 01", Mixkit 720, which the owner approved on explainers. Mixkit Stock Music Free License.
  - Its drop (22.941 s, video/lib/beats.py) lands after the hook.
  - Its full section is extended by whole 4-bar cycles joined on matching downbeats (`extend_music.py`).
- **Reactions:** the owner's own sticker clips: Shook (shirtless) on KAVA's fall, Side-Eye (grey) on the $mihao claim,
  The Grin (grey) on the sign-off.
