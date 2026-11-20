# MagicMarkets referral (#ad), 20 Nov 2026: the owner's sponsored post, the free house voice, 1:32, 16:9

**The brief (20 Nov):** "I want to create a video on this content but the regular type of videos without the
illustration … do your own research too and get images from the website … This is just a rough content of mine…
your job is to research and get a proper content video."
- **Format:** the regular explainer: narrator, real screens, motion graphics, stickers, no cartoon.
- **Voice:** ElevenLabs had 96 credits left until 23 Nov, and Lara needed about 1,000. The owner chose "Free female
  voice today": the house voice (Kokoro af_heart with the measured delivery, `video/lib/voice/house_voice.py`), at
  its natural pitch. A 10-second sample was sent first.
- **Research:** a research agent checked every claim (`sources.md`), and the pages were captured here.
  - The binding Referral Terms make the dividend a discretionary monthly pool. MagicMarkets' partner page says
    partners don't advertise a rate. Their traders' docs (16 Nov) say 10 bps.
  - The script keeps the owner's points, worded to match the pages, and adds the fine print. The owner is told to
    confirm "10 bps" with MagicMarkets before posting.

## Concept: the 10 bps meter
Two counters, THEY TRADE and YOU EARN, run at a thousand to one. They appear three times, the same way each time (S4
rhyme, S3 count-up):
- in the hook (climbing to $10M → $10K);
- on "every thousand dollars" ($1,000 → $1);
- on the hypothetical, with HYPOTHETICAL stamped.

## Moves and the samples they come from (STYLE-LIBRARY.md)
- **The meter** as the throughline, a giant number shown the same way three times (S4); count-ups (S3).
- **Real pages ringed on the words**, with push-ins onto the named line (S3):
  - the live site;
  - the docs (book, fees, referrals, getting your link, licence);
  - the Referral Terms §3.1, §3.2 and §3.8;
  - Polymarket's referral page.
- **A two-column verdict card**, Polymarket against MagicMarkets (S3).
- **Stamps:** FLAT RATE / NO TIERS · NO CAP LISTED / NO NEED TO TRADE YOURSELF, HYPOTHETICAL, NO GUARANTEED MINIMUM,
  18+ (S2). Also WIN ✓ PAYS / LOSE ✓ PAYS chips (S1).
- **Three numbered steps** to the link (S5).
- **Stickers, three, both sets** (S7): Jaw Drop (grey) on "$10,000 a month", The Stare (shirtless) on "the fine
  print", The Grin (grey) on the end card.
- **#AD · PAID PARTNERSHIP** stays on screen from the first frame. The end card carries the owner's disclosure line.

## Files
| File | What |
|---|---|
| `script.txt`, `tts.txt` | the spoken script (236 words); `tts.txt` marks the stressed words for the house voice |
| `mm.html` | the page; it needs `words.js` (the house voice's own word times, CTC median error −0.01 s) and `img/` (the captures, `mm_logo.png`) |
| `tools/peek.cjs` | a public page at 2x, its text and links; rings measured with `../primus-proof-of-creation-2026-11-17/tools/shotfind.cjs` |
| `tools/mix_mm.sh` | the mix over "New Bass 01", extended with `../crypto-brief-2026-11-16/extend_music.py`. BEDDB=9.5 was set by preflight before the render (13.5 dB under the voice) |
| `cover.html` | the upright cover (its middle square for X) and the wide thumbnail, made by `../prospect-2026-11-16/cover.mjs` |
| `sources.md`, `post-kit.md` | the dated sources and what changed from the draft; the post text and what to check before posting |

## Make it
```bash
S=<scratch>/mm; K=$S/work; P=$S/page; T=video/templates/explainer/magicmarkets-referral-2026-11-20
python3 video/lib/voice/house_voice.py --text $T/tts.txt --out $S/voice/take.wav --voice af_heart --project "MagicMarkets,Polymarket"
ffmpeg -i $S/voice/take.wav -ar 16000 -ac 1 $K/take16.wav && python3 -I <strato tools>/takewords.py $K $T/script.txt   # the hear-back
BEDDB=9.5 bash $T/tools/mix_mm.sh $K $S/voice/take.wav <scratch>/mus/720.mp3 video/templates/explainer/crypto-brief-2026-11-16/extend_music.py
# check the level before the render: a still-image video with mix.wav through preflight (--bed ducked.wav)
node video/lib/determinism.mjs $P/mm.html
MBLUR=32 bash video/templates/art-series/unveil/render_par.sh $P/mm.html $P/plan.json video/out/magicmarkets-referral-2026-11-20/magicmarkets-referral.mp4 3 16
node video/templates/explainer/prospect-2026-11-16/cover.mjs $S/cover/cover.html video/out/magicmarkets-referral-2026-11-20/magicmarkets-referral
```
