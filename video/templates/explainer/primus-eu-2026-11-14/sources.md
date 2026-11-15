# Sources (checked 14 Nov 2026)

The script is the owner's own post, voiced as written. The only changes are for speech: "$eU" is read as "E U", "$U" as
"U", "1:1" as "one to one", and "@primus_labs" as "Primus Labs". A stray "j primus labs on this" in the first paste was
left out. The captions carry their spelling: $eU, $U, 1:1, @primus_labs.

## The real screens in the video, all captured 14 Nov 2026
- **BscTrace, United Stables (U):** bsctrace.com/token/0xcE24439F2D9C6a2289F741120FE202248B666666. NodeReal's BNB Chain
  explorer; BscScan answers automated visits with a bot check, so BscTrace is used instead.
  - What the page shows: BEP-20, decimals 18, 80,752 holders, 50,200,689 transfers, price $0.9996 at capture.
  - The transfers list shows every amount, for example 6793.11001499 and 299.85001499 from one address (0xed9a…c18771)
    in the same block. This backs "the vendor gets paid… what you have left… what you do with it after". The rings fall
    on the payment, the payer's address and the same address's next transfer.
- **BscTrace, Confidential U (eU):** bsctrace.com/token/0x3EcB7d91C98ca4B4924e0CC5Eca7472b21F06800.
  - What the page shows: BEP-20, decimals 6, 647 transfers, holders "-", price "-".
  - Its transfers list shows From and To in full and **Value 0** on the eU transfers. The eU contract's transfer events
    carry an encrypted handle and no plain amount: 4 topics, empty data, read from BNB Chain through bsc-rpc.publicnode.com.
  - This backs "the explorer shows a transfer, but not the amount" and "wallet addresses are still public, only the
    amounts are hidden".
- **BscTrace, the vault contract:** bsctrace.com/address/0xe9E8573Bb351da16c6EE7dDaC0cBC70b7f9784AE. Its address
  comes from the Primus app's own configuration, served at dapp.primuslabs.xyz.
  - "In" transactions keep coming; the newest was 17 min before the capture (23:33 UTC). This backs "the money moves".
- **Primus docs, Privacy Vault in DeFi:** docs.primuslabs.xyz/fhe/use-cases/privacy-vault/ (the trailing slash
  matters). It describes a confidential stablecoin and a confidential vault: "the exact same lending strategy as an
  established, publicly visible vault… but with deposit sizes kept encrypted"; "deposit it into the confidential vault,
  and earn yield". This is ringed on "confidential vault", "earn yield" and "position size encrypted".
- **The Primus app's landing page as served without a wallet:** dapp.primuslabs.xyz. It reads "Confidential Finance /
  Encrypted Yield. Hold, transfer, and earn yield privately on encrypted assets", with the chips Non-custodial,
  Encrypted Balances and Hidden Transactions. "Encrypted Balances" is ringed on "your figures stay private".
- **Logos:**
  - the U token logo, from Trust Wallet's public assets (blockchains/smartchain/assets/0xcE24…6666/logo.png), the same
    logo BscTrace shows;
  - Primus's own logo.

## What could not be checked, said in the message, not on screen
- **A wallet-to-wallet eU send:** none was found in the eU contract's history (about 19 days of logs read from the
  chain). The recent eU transfers are between the eU contract and the vault's deposit contract (0xedcd…e5dd24).
  - The send in the video is an illustration.
  - The explorer row is a real eU transfer (Value 0), but not a send between two people's wallets.
  - A screen recording of the owner's own send would need their wallet.
- **Wrapping and unwrapping show amounts.** Moving U into eU and back shows the amount on the eU page (for example
  550000000000000 in, and the same out), because U itself is public. Only eU transfers and vault positions read 0.
- **"At 1:1"** is in the owner's script. The docs describe "convert a standard stablecoin into its confidential form
  in one transaction", and the wrap and unwrap rows show the same raw amount in and out. I did not find a Primus page
  that says "1:1" in those words.
- **Secondary reports, kept off screen:** the vault yield comes from Unitas, about $1M was deposited in the first 24 h,
  and deposits are batched every 8 h. None of these were confirmed on a Primus page.
- **Holders:** BscTrace shows "-" for eU holders, so the number of people using it is not shown.

## Illustrations (ours)
The receipts, the payment and savings cards, the "rest of my account" panels, the two wallets, the eU coin (the U logo
with our lock), the vault card. Every example number on them is tagged EXAMPLE.

## Voice, music, reactions
- **Voice:** ElevenLabs "Lara" (vChnJZ1Cu89g2XXumPfT, eleven_v4), one take, 756 credits, 47.7 s. The owner chose her.
- **Music:** "A New Life", Mixkit 543 (the owner's named favourite), under the Mixkit Stock Music Free License. Its drop
  (24.683 s into the track, found by `video/lib/beats.py`) lands on the cut after the hook.
- **Reactions:** the owner's own sticker clips: Hmm (shirtless set) on "I don't think a payment or a savings position…";
  The Grin (grey set) on the sign-off.
