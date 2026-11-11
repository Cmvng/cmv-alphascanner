# Sources: Primus Labs, "The groundnut test" (11 Nov 2026)

Everything on screen that is not the owner's own words, and where it came from. Read-only; nothing was signed in to.

## Real, as published by Primus
- **The docs page** in the last third of the video is `docs.primuslabs.xyz/implementation-scenarios/proof-of-assets/`,
  captured on 11 Nov 2026 as served, at phone width (500 px, scale 2). It scrolls inside its frame; nothing in it is
  redrawn. Ours are the two blue outlines:
  - "leveraging the power of zkTLS" (as the owner says "what they call zkTLS");
  - "She can leverage Primus to prove to the protocol that she possesses over 10,000 USDT in her CEX account", which
    is Primus' own version of the owner's example: a loan against a proof of what is in an exchange account.
- **The Primus logo:** Primus' own file (`Logo-orange.svg`, from their site, saved 9 Nov 2026).

## The owner's example, and how it sits against Primus' docs
| In the video | Source |
|---|---|
| The shop "uses the Primus zkTLS to verify proofs" | The owner's example. zkTLS "verifies the authenticity of TLS data while preserving privacy, all without requiring modifications to the data source servers" (docs, tech intro, redeployed 21 Oct 2026) |
| "I simply log in on my Binance app through the tech" | Docs, proof of assets: users "prove ownership of their off-chain assets to attestors while leveraging the power of zkTLS" |
| The diagram's "node · witnesses the locked session" | Docs, tech intro: in MPC mode "the attestor and the client collaboratively execute a secure multi-party computation protocol" to set up the TLS session; in Proxy mode the attestor forwards the TLS traffic and "records all ciphertexts" |
| "They check that I have the money"; the shop sees only YES | Primus on BNB Chain (23 Jun 2026): a proof can say "My account balance exceeds a specified threshold"; apps "verify facts rather than collect data" |
| "I'm going to pay it forward" / "I took the loan" | Docs, proof of assets: Alice proves her exchange balance "to demonstrate her credit and qualify for the loan" |
| "It only works on platforms that use the tech" | The owner's own caution, and true: a shop would have to build it in. No supermarket does this today |

## Made up for the example (and labelled so)
- **The supermarket, the receipt and the till.** An illustration, ours.
- **"Binance was hacked… they paused withdrawals."** The owner's example, not news. The receipt row carries an
  "example" tag, Binance appears in words only (no logo), and the end card says "The supermarket and the hack are
  made up."
- **"1000x more than the required amount."** The owner's words; no balance or price is shown anywhere.

## Things the owner says that the captions tidy
- The owner says "the Primus Tech Lab"; the captions give the project its name, **Primus Labs**.
- "to verify proofs on the encrypted node": kept as said. Primus' word for the node is "attestor".

## The camera picture (fifth version)
- The owner's recording itself: the kept frames of the raw file, at its own 60 frames a second, flipped left to right
  (the phone recorded it mirrored: the Chelsea crest and the Nike tick read backwards in the recording) and encoded
  once. No blur, no regrade, no shade, no denoise, no zoom, no crop.
- Graphics sit behind the owner in five stretches (the title, the glass chips, the Primus logo plate, "1000x", the
  ring of tiles). The owner is not cut out: their outline (Robust Video Matting, made at 60 frames a second from the
  raw frames) only hides the part of a graphic that falls behind them.

## Sound (fifth version)
- Voice: the owner's own track, as recorded (44.1 kHz), cut at real pauses with 8 ms fades. Nothing else: no echo or
  noise removal, no filter, no compressor, no limiter. The whole mix is raised by one plain gain to -1 dBTP.
- Music: "New Bass 01", Lily J (Mixkit 720, free licence), approved by the owner on explainers. About 15 dB under
  the voice while they speak, its highs shelved down 8 dB above 4 kHz, the bass in on the first cut. No made sounds.

## The icons (third and fourth versions)
- Microsoft Fluent Emoji, 3D set (MIT licence), fetched 11 Nov 2026 from
  `cdn.jsdelivr.net/gh/microsoft/fluentui-emoji@main/assets/<Name>/3D/<name>_3d.png`, shown at or under their own
  256 px. They stand for the things the owner names (cash, a bank, a card, a coin, a lock, a shop); none is a brand's
  logo or interface. The follow pill on the sign-off is our own drawing, not a copy of any app's button.

## Left out of the cut
- The opening "So, basically today,".
- The stumble over the name ("The Primus Tech Lab's tech. What am I saying?…") and the second introduction after it.
- A repeated "I'm trying to buy this." and an "And, um,".
- The second telling of the story near the end ("But in this type of situation…" to "I took the loan to buy the
  groundnuts."), about 19 seconds. The caution before it and the garri sign-off after it are kept.
