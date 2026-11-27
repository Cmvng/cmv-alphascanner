# Gambit (the owner's script, 27 Nov 2026): Lara, 1:10, 16:9

The owner sent a seven-scene script about Gambit (gambitmarkets.com), "the line you say and the official image to show
behind it", with eight official Gambit images:
- the banner and the logo;
- a live market page;
- copy agents;
- the weekly tournament;
- two creator cards;
- Robinhood Chain deposits.

Asked who should voice it, they answered "I have credits now on eleven labs", so Lara narrates (the one option that
used ElevenLabs), with no cartoon. Out folder: `video/out/gambit-2026-11-27/`.

## The idea
**Four ways in, one needs $0.**
- The hook's giant "$0 MONEY DOWN" (lime with the ink outline of Gambit's own logo) comes back the same way on "no
  capital needed".
- Between the two, a rail on the left lights up the four ways in one by one, each with what it takes: trade, copy an
  agent, build an agent, create.
- At the end, the last one is stamped $0.
- Each line sits on the official image the owner chose for it, or on Gambit's real page, with the spoken words
  ringed.

## The moves, and the sample each is from (`../../STYLE-LIBRARY.md`)
| Move | Sample | Where |
|---|---|---|
| Gambit's banner whole, then a giant $0 MONEY DOWN slams in; the music drops on the wordmark | S4 (the hook number), S3 (brand cold open) | 0:00 |
| The four-ways rail, lighting one by one; the last stamped $0 (new) | S1 (a checklist), S5 (one canvas that changes state) | 0:04 onwards |
| The live market image, Yes and No ringed; the real markets page, Sports, Politics, Crypto, More ringed on the words | S3 | 0:06 |
| Gambit's docs, "(e.g. Polymarket, Kalshi)" ringed; the real Analyze menu, AI Insights ringed | S3 | 0:11 |
| The copy-agents card, each row ringed on its words; the mirror: THE AGENT OPENS / YOU TAKE THE SAME SIDE (new) | S3, S6 (the product acted out) | 0:19 |
| The tournament card, $250 and the leader ringed, chips building; the real leaderboard with "3+ trades" and "$100+ volume" ringed | S3 | 0:28 |
| $0 again, the same way (new) | S4 | 0:42 |
| The spice_bets card: "Trade the pick" ringed, a giant 1%; the Creator tag ringed; 1,000 points and a 50% referral share, sourced | S3, S4 | 0:43 |
| Robinhood Chain ringed on the official image; a CONNECT chip | S3 | 0:54 |
| $GAMBIT struck through; a NO OFFICIAL CONTRACT stamp, with its source | S2 | 0:58 |
| Two stickers: The Grin (grey T-shirt) on "the part I like", The Stare (shirtless) on "don't buy" | S7 | 0:39, 1:00 |
| End card: FOUR WAYS IN. ONE NEEDS $0., Follow @i_am_vickyd on X | S2 | 1:05 |

## Build
```bash
G=<scratch>/gb; T=video/templates/explainer/gambit-2026-11-27
# Lara: eleven_v4, voice vChnJZ1Cu89g2XXumPfT, one generation of $T/tts.txt (numbers written as words, acronyms spaced)
ffmpeg -i take.mp3 -ar 16000 -ac 1 $G/work/take16.wav
python3 -I $T/tools/takewords.py $G/work $T/script.txt          # the hear-back + every script word timed
python3 -I video/lib/align_words.py $G/work/take16.wav $G/work/words_script.json $G/work/words.json
# video time = take time + 0.2 s (+ 0.6 s after the 3.50 s cut): timing.js
BEDDB=12 bash $T/tools/mix_gb.sh $G/work take.mp3 <370.mp3>     # bed 12.8 dB under the voice (preflight, measured before the render)
(cd $G/cap && CLICKS="Skip" BOXES=mk.json node $T/tools/cap.cjs https://app.gambitmarkets.com/markets mk.png 760 450 Sports Politics Crypto "More (6)")
#   the same for the liquidity docs (SCROLLTO=Kalshi BLOCK=center OFF=0), the Analyze menu (CLICKS="Skip|Analyze"), the leaderboard (760 x 560)
node video/lib/determinism.mjs $G/page/gb.html
MBLUR=32 bash video/templates/art-series/unveil/render_par.sh $G/page/gb.html $G/page/plan.json video/out/gambit-2026-11-27/gambit.mp4 3 14
node video/templates/explainer/prospect-2026-11-16/cover.mjs $T/cover.html video/out/gambit-2026-11-27/gambit
```

## What this video taught
- **Ask the voice once, then read the answer as given.** "I have credits now on eleven labs" answered the question
  with the one ElevenLabs option (Lara). No second question.
- **The official images can be older than the site.** The live-market image shows a "Generate Insights" button; the
  site now has an Analyze menu with "AI Insights", and the panel's button reads "Run research". The real page is what
  carries the claim on screen.
- **A docs page can scroll inside its own frame.** `window.scrollBy` did nothing on Gambit's docs; scrolling the line
  into the middle of its own box (`BLOCK=center`) framed it.
- **A push-in must keep the ringed words whole.** On the first stills the zoom on the category bar pushed Sports off
  the card, and the zoom on the docs cut the ringed line at both ends. The categories have no zoom now, and the docs
  zoom is 1.18.
