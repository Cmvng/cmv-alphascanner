# Prospect Markets (#ad), 16 Nov 2026: the owner's post, Lara, 1:18, 16:9

**The brief (16 Nov):** "I want to make a video on this project … Make sure you do your proper research … Here is the
content I am going to post". It came with their sponsored post on @prospectmarkets.
- Every claim was checked (`sources.md`); all hold.
- The script is the post itself, adapted only for speech (`script.txt`).
- The owner approved the script and Lara's cost (1,199 credits) in one question before the take.

**Concept: a dollar, split by the market.** A contract pays $1 if its outcome happens, so the two prices of a game
split one dollar.
- The cold open (navy): Prospect's real 15 Nov price card (Panthers 50¢ / Saints 50¢) beside a $1 bar in the teams' colours, split down the middle; the ¢ flips to %.
- The navy lifts away on the drop.
- The same bar returns, the same way, for "say a contract is priced at fifty percent", then shrinks aside for Prospect's live price chart.

## Moves and the samples they come from (STYLE-LIBRARY.md)
- **The cold open** with the punchline (the owner's favourite) and a **giant number shown the same way twice**: "50%" on the bar in the hook and again in the body (S4).
- **A split bar** ("every $1") as the throughline (S3).
- **Real evidence ringed on the words** (S3):
  - Prospect's posts and release;
  - its order book read as "other traders selling / buying";
  - the market panel and the play-by-play;
  - the CFTC's own pages;
  - the eligibility line.
- **A canvas that changes state:** the chain traders → Prospect Brokerage → Crypto.com FCM → CDNA, lighting on the words (S5, S1).
- **Stamps** (LIVE · 12 NOV; U.S. RESIDENTS, 18+, NOT IN ALL STATES) and a checkbox that ticks on "check that first" (S2, S1).
- **The closing question** as two real screens side by side, PRICE or PLAY-BY-PLAY (S3 verdict card).
- **The owner's stickers,** three, both sets: No Way! and Hmm (shirtless), The Grin (grey) (S7).

## Motion craft
- `motion.js`:
  - the curtain lift with a decaying shake on each drop;
  - halves that fill from the divider;
  - the ¢→% flip (scaleY on the symbol only, 0.36 s);
  - springs and squash on the stamps;
  - draw-on rings and arrows.
- Prospect's frames swap per video frame: the chart at half speed (15 fps), the play-by-play feed at real speed.
- **`determinism.mjs`: all 31 frames match** forward, backward and shuffled (edge noise of 4 levels or less).
- Rendered with `MBLUR=32`.

## Music
"Sparta" (370), approved by the owner on explainers:
- its drop (31.997 s) lands on the 0.6 s pause after the hook;
- its second drop (80 s) lands on "It is aimed at U S traders";
- its own ending plays under the end card, with a 1.2 s fade.

No extension was needed.

## Files
| File | What |
|---|---|
| `script.txt` | the approved script (letters spelled for speech: C D N A, C F T C, U S) |
| `mix.sh` | the mix (0.6 s pause after the hook at take 8.36 s, about 12 dB under the voice, -14 LUFS) |
| `prospect.html` | the page; needs `words.js` and `img/` beside it (made by `tools/prep.py`) |
| `caps.py`, `hearback.py` | captions → caps.json and .srt (the spoken risk line in the .srt only); each caption checked against the final mix |
| `cover.html`, `cover.mjs` | the upright cover (its middle square for X) and the wide thumbnail |
| `tools/` | `cap.cjs` (X posts via the embed), `prcrop.cjs` (the release's paragraphs by element), `shot.cjs`, `stills.cjs`, `prep.py` |
| `sources.md`, `post-kit.md` | the dated sources and the checks; the post text and what to know before posting |

## Make it
```bash
S=<scratch>/pm; K=$S/work; P=$S/page; T=video/templates/explainer/prospect-2026-11-16
bash $T/mix.sh $K $S/take/lara.mp3 <scratch>/mus/370.mp3
python3 -I <strato tools>/takewords.py $K $T/script.txt && python3 -I video/lib/align_words.py $K/take16.wav $K/words_script.json $K/words_ctc.json
# "Contracts" was dropped by the aligner (zero-length whisper time): put back at its measured 45.85-46.33 s -> words.js
# media: Prospect's X timeline through syndication.twitter.com (their posts, the 15 Nov pictures, the launch video mp4)
node $T/tools/cap.cjs $S/shots && node $T/tools/prcrop.cjs $S/shots && python3 -I $T/tools/prep.py $S
node video/lib/determinism.mjs $P/prospect.html
MBLUR=32 bash video/templates/art-series/unveil/render_par.sh $P/prospect.html $K/plan.json video/out/prospect-2026-11-16/prospect.mp4 3 16
python3 -I $T/caps.py $P/prospect.html $P/words.js $T/script.txt video/out/prospect-2026-11-16 prospect
node $T/cover.mjs $P/cover.html video/out/prospect-2026-11-16/prospect
```
