# Primus, three new Proof of Creation tasks, 17 Nov 2026: the owner's cartoon presents their post (1:00, 16:9)

**The brief (17 Nov):** "I want to create a video with this new sample illustrations on this video." It came with
their post on Primus's three new tasks and two screenshots of their points page.
- "This new sample illustrations" is their own cartoon (their seven poses; `video/assets/characters/cmv/`).
- The voice: they asked for "my own voice or a male voice" and chose Olawale (ElevenLabs).
  - The take failed: the account had 96 credits left of the 786 needed.
  - They then chose "A free male voice": Kokoro am_fenrir, made here (`tools/kok.py`).
  - Its pitch is 140 Hz, the same as the owner's recordings. A 12 s sample was sent first.
- Every claim was checked (`sources.md`). Primus's own announcement post and Kaito's own dates could not be found.

## Moves and the samples they come from (STYLE-LIBRARY.md)
- **The talking character beside the real pages** (S10):
  - a pose per line, a hard cut and a small pop;
  - mouths drawn by us (`video/templates/characters/talking/`), on the voice 15 times a second.
- **Icons over the head on their names:** Hailuo, CapCut and Dreamina, as Primus's own task icons (S2).
- **Real screens ringed on the words** (S3):
  - the owner's points page (Proof of Creation, the three cards, Verify your video creation count, the path, the Verify Now buttons, the reputation score);
  - the live site's Connect Wallet;
  - the store's verified publisher, version and update date;
  - the docs' fee sentence.
- **Close-ups cut from the same real pages** on the named thing (the store's Details, the docs' step 5) (S3).
- **Push-ins on the owner's screenshots** (about 1.45–1.6x, the named region drifting toward the middle) for the
  three cards, the path, the Verify Now buttons and the reputation score. The screenshots are 1200 px, so a push-in
  enlarges them slightly past their pixels; this was chosen so the owner can "actually see" the thing named (17 Nov).
- **The layout after the owner's note (17 Nov):**
  - the character at 0.8, right at the screen's edge;
  - screens 1200–1300 px wide;
  - the pointing pose lined up on the feet;
  - a dip and spring on every pose change (`../../characters/talking/README.md`).
- **Giant words** (S4):
  - "zkTLS", then "NOT SCREENSHOTS" struck through;
  - "A LITTLE ETH ON BASE";
  - "≈ 0.000035 ETH + GAS";
  - "KAITO EPOCH 2".
- **One canvas that changes state** (S5): the four steps as a list, then a numbered badge springing onto each step's own screen.
- **Stamps** (S2): 3 NEW TASKS, REFUNDED IF THE TASK FAILS, SEPARATE CAMPAIGN.
- No stickers: the cartoon is the presenter.

## Files
| File | What |
|---|---|
| `script.txt` | the owner's post, spoken (137 words); `tts.txt` adds the pronunciations (Hailuo, Ara, gas, Kaito, epoch) |
| `tools/kok.py` | the free voice: Kokoro, one voice, a 0.45 s breath between paragraphs, speed 1.05 |
| `mix_poc.sh` | the mix over "New Bass 01" (the bed +7 dB and its highs eased, measured against the voice) |
| `poc.html`, `timing.js` | the page and its word indices, poses and captions (needs `words.js`, `mouth.js`, `img/`) |
| `cover.html` | the upright cover (its middle square for X) and the wide thumbnail, made by `../prospect-2026-11-16/cover.mjs` |
| `tools/shotfind.cjs` | captures a public page at 2x and gives the box of each text to ring (`CLICKS=` walks a menu, `TOP=1` keeps the top; it closes the "Switch to Chrome" pop-up in its frame) |
| `tools/logos.cjs`, `peek.cjs`, `links.cjs` | logo captures at 4x, a quick look at a page and its images, a page's links |
| `tools/srt.py` | subtitles from the page's own captions |

## Make it
```bash
S=<scratch>/poc; K=$S/work; P=$S/page; T=video/templates/explainer/primus-proof-of-creation-2026-11-17
python3 -I $T/tools/kok.py am_fenrir $T/tts.txt $S/kok/take_fenrir.wav 1.05
ffmpeg -i $S/kok/take_fenrir.wav -ar 16000 -ac 1 $K/take16.wav
python3 -I <strato tools>/takewords.py $K $T/script.txt && python3 -I video/lib/align_words.py $K/take16.wav $K/words_script.json $K/words_ctc.json
bash $T/mix_poc.sh $K $S/kok/take_fenrir.wav <scratch>/mus/720.mp3
python3 -I video/templates/characters/talking/mouthtrack.py $K/voice.wav $P/words.js 60.5 $P/mouth.js 30 0.2,4.0,0.05
node video/lib/determinism.mjs $P/poc.html
MBLUR=32 bash video/templates/art-series/unveil/render_par.sh $P/poc.html $P/plan.json video/out/primus-proof-of-creation-2026-11-17/primus-proof-of-creation.mp4 3 16
python3 -I $T/tools/srt.py $P video/out/primus-proof-of-creation-2026-11-17/primus-proof-of-creation.srt
node video/templates/explainer/prospect-2026-11-16/cover.mjs $S/cover/cover.html video/out/primus-proof-of-creation-2026-11-17/primus-proof-of-creation
```
