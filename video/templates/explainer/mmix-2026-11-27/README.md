# MMIX (the owner's post, 27 Nov 2026): Lara, 1:22, 16:9

The owner sent a written post about MMIX (@MMIX_io, mmix.io), "a layer 1 where every project gets vetted before it
launches", with four screenshots of MMIX's pages:
- the red hero;
- "Not everyone gets in";
- the ecosystem cards;
- the hub.mmix.io points program.

Lara narrates the post as written (the voice they chose for Gambit the same day, "I have credits now on eleven labs"),
with no cartoon. Out folder: `video/out/mmix-2026-11-27/`.

## The idea
**THE GATE: an open chain against a vetted one.**
- The hook: a real asset hovers above a chain of unknown tiles ("???", addresses, a RUG) and will not step on.
- The middle: companies, asset issuers and validators pass a gold gate one by one onto the MMIX chain.
- The payoff: the same chain comes back on "instead of a tokenized property sitting on the same chain as the next
  rug". The asset drops in beside the RUG, the RUG falls off, every tile is checked, and the chain turns burgundy.

## MMIX's terms shaped the build
- **Terms §3:** no scrapers or automated tools other than standard browsers. So there are no captures of mmix.io, and
  only the owner's four screenshots are on screen. What they do not show is carried by MMIX's own sentences on quote
  cards, each with its page and date.
- **Terms §5:** the name and logo are reserved. So there is no logo plate: the logo is seen only inside the owner's
  screenshots, and "MMIX" is set in type on the end card and the cover.
- **The hub leaderboard** shows other people's wallets and usernames, so it is cropped off (`img/hub_crop.png`, x 0 to
  930).
- **The /ecosystem, /technology and /legal pages** are lorem-ipsum placeholders, so nothing from them is used.

## The moves, and the sample each is from (`../../STYLE-LIBRARY.md`)
| Move | Sample | Where |
|---|---|---|
| The open chain: a real asset hovers and will not step on; question marks pop on "sharing" (new) | S4 (the hook picture), S5 (one canvas that changes state) | 0:00 |
| MMIX's red hero, the title and "Every company vetted" ringed in gold | S3 | 0:06 |
| The gate: COMPANIES, ASSET ISSUERS, VALIDATORS arrive on their words and pass one by one onto THE MMIX CHAIN, each checked; ANYONE CAN USE THE APPS (new) | S6 (the product acted out), S1 | 0:11 |
| The ecosystem cards: real estate, money that moves (the EU neobank), loyalty ringed; NO FREE-FOR-ALL stamp | S3, S2 | 0:20 |
| MMIX's own EVM sentence as a quote card; EVM, SOLIDITY, ETHEREUM TOOLS chips on the words | S3 | 0:26 |
| "Known validators" ringed; the FAQ quote, three validator shields, blocks with 2–3 s between | S3, S6 | 0:31 |
| "Compliance built in" ringed; the registry card builds row by row (KYC tiers / issuer permissions / transfer rules) with both sources | S3 | 0:38 |
| One MMIX Coin (a drawn disc, not their art) flies to the real estate, neobank and checkout cards as each is ringed (new) | S6 | 0:45 |
| The open chain again: the property drops in beside the RUG, the RUG glows, falls off, every tile checked, CHECKED FIRST (new) | S4 (the rhyme), S2 | 0:52 |
| The hub (leaderboard cropped), the title and the three steps ringed; a numbered three-step panel beside it | S3, S5 | 0:59 |
| YOU NEED TO KNOW: mainnet 2027, apps getting ready, points no promise of a return; NOT GUARANTEED stamp | S1, S2 | 1:08 |
| MMIX's line "Not everyone gets in. That's the point." | S3 | 1:17 |
| Two stickers: Side-Eye (grey T-shirt) on "the next rug", Nervous (shirtless) on "points don't guarantee an airdrop" | S7 | 0:55, 1:15 |
| End card: MMIX in type, EVERY PROJECT VETTED BEFORE IT LAUNCHES, four chips, Follow @i_am_vickyd on X | S2 | 1:18 |

## Build
```bash
M=<scratch>/mx; T=video/templates/explainer/mmix-2026-11-27
# Lara: eleven_v4, voice vChnJZ1Cu89g2XXumPfT, one generation of $T/tts.txt ("Em-Mix", numbers as words, acronyms spaced)
ffmpeg -i take.mp3 -ar 16000 -ac 1 $M/work/take16.wav
python3 -I $T/tools/takewords.py $M/work $T/script.txt          # the hear-back + every script word timed
python3 -I video/lib/align_words.py $M/work/take16.wav $M/work/words_script.json $M/work/words.json
#   align_words dropped "Companies," and "issuer" (zero length): put back by hand from the hear-back times
# video time = take time + 0.2 s (+ 0.6 s after the 5.50 s cut): timing.js
BEDDB=10.5 bash $T/tools/mix_mx.sh $M/work take.mp3 <720.mp3>   # bed 12.8 dB under the voice, -14.5 LUFS, -1.5 dBTP at 256k
node video/lib/determinism.mjs $M/page/mx.html
MBLUR=32 bash video/templates/art-series/unveil/render_par.sh $M/page/mx.html $M/page/plan.json video/out/mmix-2026-11-27/mmix.mp4 3 14
python3 -I $T/tools/srt_mx.py $M/page/mx.html $M/page/timing.js video/out/mmix-2026-11-27/mmix.srt
node video/templates/explainer/prospect-2026-11-16/cover.mjs $T/cover.html video/out/mmix-2026-11-27/mmix
```
The page reads `img/` (the four screenshots, `hub_crop.png`, and Fluent 3D icons in `img/e/`) next to it; the
screenshots are the owner's and are not committed.

## What this video taught
- **Read a site's terms before capturing it.** MMIX's terms ban automated tools and reserve the logo. The owner's own
  screenshots plus MMIX's sentences quoted with their source carried the whole video, with no capture.
- **A card that is shown only inside an `if (scene is on)` block stays on screen when frames are drawn out of
  order.** The FAQ quote card sat inside the validators block. In the backward order it stayed over every later
  scene. The determinism check caught it (22 of 24 frames). A card that is not a child of the scene's own container
  is set on every frame.
- **Things that fly to the same row must not cross each other.** The first one through the gate now goes furthest.
- **A list that builds on the words never starts as an empty card.** On the first render the registry, the hub steps
  and "You need to know" sat empty for 1.5 to 4 s. Their rows are now there from the start, faded, and light up on
  their words (`lit()`).
- **Small text in a 1x screenshot cannot be pushed in.** On the hub, the three steps (about 13 px) are ringed where
  they are and written out large in a numbered panel beside the screenshot.
