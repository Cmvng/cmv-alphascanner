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

## The camera picture
- The owner's recording, in the studio look (`video/lib/portrait_pro_long.py`): the room replaced by a clean backdrop,
  the face lit, the framing steady. The picture is flipped left to right, because the phone recorded it mirrored (the
  Chelsea crest and the Nike tick on the shirt read backwards in the recording).

## Sound
- Voice: the owner's recording, de-clipped, room echo out (WPE), then DeepFilterNet3. No pitch or tempo change.
- Music: "A New Life", Eugenio Mininni (Mixkit 543, free licence), the owner's approved track: about 12 dB under the
  voice while they speak, the drop on the first cut (5 s), full level on the end card. No made sounds.

## Left out of the cut
- The opening "So, basically today,".
- The stumble over the name ("The Primus Tech Lab's tech. What am I saying?…") and the second introduction after it.
- A repeated "I'm trying to buy this." and an "And, um,".
- The second telling of the story near the end ("But in this type of situation…" to "I took the loan to buy the
  groundnuts."), about 19 seconds. The caution before it and the garri sign-off after it are kept.
