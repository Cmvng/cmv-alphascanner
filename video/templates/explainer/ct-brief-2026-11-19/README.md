# CT and Web3 brief, Thursday 19 Nov 2026: the owner's cartoon presents their brief (2:14, 16:9)

**The brief (19 Nov):** "I need a clean illustration motion video for this content", with their eight-item brief.
- "Illustration" was read as their cartoon. Their last two requests were the character video ("this new sample
  illustrations", 17 Nov) and more poses for it ("More video characters", 19 Nov).
- The voice is the free male voice they chose on 17 Nov: Kokoro am_fenrir, at the owner's pitch. ElevenLabs had too
  few credits on 17 Nov.
- Every story was checked (`sources.md`). Four details changed; they are listed at the end of `sources.md`.

## Concept: eight chapters, one real post each, one illustrated move each
- The eight stories are numbered chapters along the top. The current one is blue; the finished ones are ticked.
- Each story shows its real X post, captured through X's embed widget at 2x and shown at its own pixels (1096 px wide).
  The spoken words are ringed on it, using boxes measured from the embed's own text (`tools/postbox.cjs`).
- Each story also gets one move that acts out its number:
  - the drain as bars to scale ($955K, the first report's $454K, ×2);
  - $49M sliding away, red, then back, green;
  - +2 MORE EXPLOITS, with the counting pose's two fingers;
  - LUKSO's three numbers as panels, with LYX's price;
  - Bubblemaps' own wallet map;
  - the subscription cap filling to 500M, then CLOSED stamped on it;
  - Michigan's real outline with the four names struck and the 25 NOV card;
  - COURT ORDER · ABU DHABI and a giant $6.3B;
  - Variational's own card with $1.5B and Bain Capital Crypto, then STOCK · INDEX · COMMODITY · FX;
  - Pancake's new banner and "PancakeSwap" losing its "Swap".
- At the end the eight chapters fold down into a recap board, with the follow line under it.

## Moves and the samples they come from (STYLE-LIBRARY.md)
- **The talking character beside the real pages** (S10): all ten poses, mouths drawn by us, 15 a second. The three new
  poses (Explaining, Surprised, Thumbs Up) are used for the first time.
- **Real posts ringed on the words, bars to scale, source chips on every screen** (S3).
- **One strip that changes state:** the chapters light one by one, then become the recap (S5, S1 checklist).
- **Giant numbers:** $49M, ~$955K, $6.3B (S4).
- **Stamps:** ×2, TAKEN, BACK IN ~2 HOURS, UNCONFIRMED, CLOSED, COURT ORDER (S2).
- No stickers: the cartoon is the presenter.
- **Different from the last brief (16 Nov):** no timeline or playhead, no REWIND, no stickers. Different from the last
  character video (17 Nov): chapters and a recap instead of a step list, and no icons over the head.

## Layout (the owner's 17 Nov note: what the character shows must be clear and right beside it)
- The character is drawn at 0.8, its feet at y 1050.
- Every screen starts at x 600, so the pointing hand reaches its edge.
- The posts are shown at 1:1 (2x captures, text about 30 px high).
- The poses are lined up with FEET and HX from `../../characters/talking/poses.tsv`.
- Each pose change is a dip and a spring.

## Files
| File | What |
|---|---|
| `script.txt`, `tts.txt` | the spoken script (341 words) and the same with the pronunciations (Binance, Anthropic, xStocks, USDC) |
| `tools/kok.py` | the free voice: Kokoro, one voice, a 0.35 s breath between paragraphs, speed 1.05 |
| `tools/posts.cjs`, `tools/postbox.cjs` | the X posts through X's embed widget at 2x; their text and the boxes of the phrases to ring (`postboxes.json`) |
| `tools/mi.py` | Michigan's outline from the US Census boundaries (us-atlas states-10m.json, decoded here) |
| `tools/extend_543.py`, `tools/mix_b19.sh` | "A New Life" extended on its own loop points (24.642 → 69.677 s, 24 bars); the mix: the bed +5 dB, measured 14 dB under the voice while it speaks (after ducking), -14.5 LUFS |
| `brief.html`, `timing.js` | the page; it needs `words.js`, `mouth.js`, `postboxes.js` (`window.POSTBOXES=` + postboxes.json) and `img/` beside it |
| `tools/stills.cjs` | stills of the page at given times (checked before the render) |
| `tools/srt.py` | subtitles from the page's own captions |
| `cover.html` | the upright cover (its middle square for X) and the wide thumbnail, made by `../prospect-2026-11-16/cover.mjs` |
| `sources.md`, `post-kit.md` | the dated sources and what changed from the brief; the post text |

## Make it
```bash
S=<scratch>/b19; K=$S/work; P=$S/page; T=video/templates/explainer/ct-brief-2026-11-19
node $T/tools/postbox.cjs $S/posts                   # posts + boxes; crop each to its text above the media -> $P/img/<name>_t.png
python3 -I $T/tools/kok.py am_fenrir $T/tts.txt $S/kok/take.wav 1.05
ffmpeg -i $S/kok/take.wav -ar 16000 -ac 1 $K/take16.wav
python3 -I <strato tools>/takewords.py $K $T/script.txt && python3 -I video/lib/align_words.py $K/take16.wav $K/words_script.json $K/words_ctc.json
bash $T/tools/mix_b19.sh $K $S/kok/take.wav <scratch>/mus/543.mp3 $T/tools
python3 -I video/templates/characters/talking/mouthtrack.py $K/voice.wav $P/words.js 134.1 $P/mouth.js 30 0.2,9.2,0.25
node video/lib/determinism.mjs $P/brief.html
MBLUR=32 bash video/templates/art-series/unveil/render_par.sh $P/brief.html $P/plan.json video/out/ct-brief-2026-11-19/ct-brief.mp4 3 16
python3 -I $T/tools/srt.py $P video/out/ct-brief-2026-11-19/ct-brief.srt
node video/templates/explainer/prospect-2026-11-16/cover.mjs $S/cover/cover.html video/out/ct-brief-2026-11-19/ct-brief
```
