# Monday crypto brief (16 Nov 2026): the owner's news brief as a video, Lara, 1:51, 16:9

**The brief (16 Nov):** "Make me a video on this recent news", with their seven-item brief.
- A fact-check (`sources.md`) changed four details.
- The script (`script.txt`) covers all seven stories, the security ones first.
- The owner approved the script and Lara's cost (1,660 credits) in one question before the take.

**Concept: the weekend feed.** A timeline strip of the weekend runs under everything: Sat 14 Nov 06:00 to Mon 16 Nov
08:00 UTC, with a SECURITY lane and a SHIPPED lane. Each story has a pin at the real time it broke. The playhead
travels to each pin and the story opens above it. For "what shipped" it rewinds to Sunday evening; at the end every pin
is lit.

## Moves and the samples they come from (STYLE-LIBRARY.md)
- **A timeline with a playhead,** a pin per story, and the hook's three numbers stamped on their words (S1, S4).
- **Real evidence ringed on the words** (S3):
  - X posts as X's embed renders them;
  - Coinone's own notice, pushed in;
  - KAVA's real candles;
  - facts cards with sources and dates that build with the voice.
- **"REWIND" before the second half** (S3).
- **Stamps** (EXPLOIT, BREACH, HIJACK, SCAM, LIVE, LAUNCH, UPDATE; EXPECT PHISHING, NO OFFICIAL CLAIM) and post cards
  sliding in one after another (S2).
- **The owner's stickers,** three, both sets (S7).

## Motion craft
- `motion.js` throughout:
  - springs and squash on the stamps;
  - one decaying shake on the drop;
  - draw-on rings;
  - candles printing left to right;
  - a perceptual zoom on the notice;
  - the playhead's travel timed by distance.
- **`determinism.mjs`: all frames match.**
  - The first run flagged the active pin: it was pulsed with `transform: scale` and its edge re-rastered by draw
    order.
  - It now pulses with a halo (box-shadow), and the dot itself is never scaled.
- Rendered with `MBLUR=32`.

## Music
New Bass 01 (720) is 96 s, and its music ends near 84 s. `extend_music.py` keeps the drop after the hook, then repeats
the full section's 4-bar cycle three times. The joins are at downbeats 76.278 → 61.045, whose band energies match
within 0.03, with a 30 ms equal-power crossfade. The track then runs to the end of the video, where a 1.6 s fade closes
it. The joins were checked: no clicks, and bar levels match the original.

## Files
| File | What |
|---|---|
| `script.txt` | the approved script (letters spelled for speech: B U S D, I D, A I, D L M M, "mee-how" for $mihao) |
| `extend_music.py`, `mix.sh` | the extended bed; the mix (0.6 s pause after the hook at take 5.42 s, about 12 dB under the voice, -14 LUFS) |
| `brief.html` | the page; needs `words.js`, `candles.js` (KuCoin KAVA-USDT 1h) and `img/` beside it |
| `caps.py`, `hearback.py` | captions → caps.json and .srt; each caption checked against the final mix |
| `cover.html`, `cover.mjs` | the upright cover (its middle square for X) and the wide thumbnail; the chart and timeline are frames of the video |
| `sources.md`, `post-kit.md` | the dated sources and the differences from the brief; the post text |

## Make it
```bash
S=<scratch>/news; K=$S/work; P=$S/page; T=video/templates/explainer/crypto-brief-2026-11-16
bash $T/mix.sh $K $S/take/lara.mp3 <scratch>/mus/720.mp3
python3 -I <strato tools>/takewords.py $K $T/script.txt && python3 -I video/lib/align_words.py $K/take16.wav $K/words_script.json $K/words_ctc.json
# words -> $P/words.js; the aligner dropped "An", "Then", "so", "trading," (zero-length whisper times): placed just before the next word
# posts: X's embed widget (platform.twitter.com/embed/Tweet.html?id=...), captured at DPR 2, cropped to the text where the media is decorative
node video/lib/determinism.mjs $P/brief.html
MBLUR=32 bash video/templates/art-series/unveil/render_par.sh $P/brief.html $K/plan.json video/out/crypto-brief-2026-11-16/crypto-brief.mp4 3 16
python3 -I $T/caps.py $T/brief.html $P/words.js $T/script.txt video/out/crypto-brief-2026-11-16 crypto-brief
node $T/cover.mjs $P/cover.html video/out/crypto-brief-2026-11-16/crypto-brief
```
