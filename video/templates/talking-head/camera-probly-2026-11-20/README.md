# Probly (the owner's recording, 20 Nov 2026, upright, 1:37): illustrations around what they say

The owner's 1:33 car selfie about Probly, a prediction market:
- you can predict sports, politics, anything;
- a trading bonus up to $25; trade $50; deposit from Solana, Base, any chain;
- their play: $50 on Bayern tonight, the $25 on Arsenal, withdraw; the offer ends 24 Nov;
- "the link is on this post"; the weekend, burger, pizza, movies.

The brief: "I want to create a illustration video on this prediction market I mention in this video… Here is the
project https://x.com/ProblyHQ". Out folder: `video/out/probly-2026-11-20/`.

**How the brief was read, and corrected by the owner.** "Illustration video" was first read as the cartoon (their 17
and 19 Nov format), in their recorded voice. Then the build was stopped to ask about the facts. The owner: "What are
you doing.. I made my video I said create an illustration around what I am talking about". So it is their own picture
and sound, untouched, with the illustrations built around their words (now in the checkpoint). The facts that do not
match Probly's page go in the message, not in the edit (`sources.md`).

Built the way their recordings are built since 11 Nov:
- their frames and voice untouched (60 fps, not mirrored, no cut at all: the take as they made it);
- graphics on top, one encode;
- measured against the raw recording.

## The idea
**The play, acted out on Probly's own pages.**
- Each line lands on the real page it is about, captured at phone width (2x):
  - the front page's category bar;
  - the Safety Net page and its "how it works" steps;
  - the deposit docs and the network list;
  - the Bayern v Köln and Newcastle v Arsenal market pages, in Lagos time.
- The words they say are ringed on each page.
- A $50 coin follows their example in their order. The $25 is a green coin, the same every time they say it.

## The moves, and the sample each is from (`../../STYLE-LIBRARY.md`)
| Move | Sample | Where |
|---|---|---|
| A PREDICTION MARKET behind the head, the handle pill; Probly's own wordmark on "Probly" | S1, S3, S4 | 0:00 |
| The real front page, Sports / Politics / "Next CEO of NVIDIA?" ringed on "sports, politics, any other thing" | S3 | 0:07 |
| The Safety Net page, "trading bonus" and "$25" ringed; the $25 coin | S3, S4 | 0:15 |
| The page's steps, "Trade $50+ on 3 different days" ringed; the $50 coin | S3, S5 | 0:23 |
| The deposit docs and the network list, Solana and Base ringed on their words; the coin drops into "Click on Deposit" | S3, S6 | 0:29 |
| **The coin lands on Bayern** on the real market page; "November 20, 8:30 PM" ringed on "this evening" (new) | S6, S3 | 0:36 |
| "Get up to $25 back on losses" ringed on "$25"; "3 different days" on "3 days" | S3, S4 | 0:43 |
| **Five days light up, 20 to 24 NOV**, beside the page's own dates ringed (new) | S1 | 0:52 |
| Bayern again, their tick, the $25 coin; it flies onto Arsenal; two ticks; WITHDRAW | S6, S1, S2 | 0:55 |
| Everybody's happy; the Safety Net shield from its page; "the link is on this post" with a pointing hand | S2 | 1:08 |
| Three numbered steps: go to Probly, make your predictions, use the bonus, be happy | S5 | 1:15 |
| WEEKEND behind the head; Friday; burger, pizza, movies, three hearts, a smile, each on its word | S1, S4, S2 | 1:21 |
| Word-by-word captions, eight big phrases | S2, S3, S4 | throughout |

New against the 13 Nov recordings:
- real market pages in their viewers' time zone;
- the coin that carries the money from page to page;
- the days row;
- no dustbin, dots, checklist or timeline.

Kept: type behind the head, captions, real pages ringed.

## Build
```bash
S=<scratch>; K=$S/work; RAW=$S/dl/rec.mp4; T=video/templates/talking-head/camera-probly-2026-11-20; F=video/templates/talking-head/camera-flop-xo-2026-11-13
ffmpeg -i $RAW -vn -ac 1 -ar 16000 $K/rec16.wav
# words: faster-whisper small.en (twice: plain, and with the names as a prompt) + a wav2vec2 greedy read for the unclear
# ones ("BAM Nick" = Bayern Munich, "ask not" = Arsenal, "smell" = smile); the owner's words in $T/words_said.txt
python3 -I video/lib/align_words.py $K/rec16.wav $K/words_said_rough.json $K/words.json
python3 -I $T/tools/plan_pb.py $K && python3 -I $F/tokens.py $K          # no cut; 31 captions
python3 -P -E $T/tools/hearback.py $K                                    # after review.py: every caption against what is heard
python3 -I video/templates/explainer/crypto-brief-2026-11-16/extend_music.py <720.mp3> $K/bed_src.wav 17.961 96.583
python3 -I $T/tools/mix_pb.py $K $RAW $K/bed_src.wav 0 92.783 0 96.583 4.98 10 3 && cp $K/mix.wav $K/mix_raw.wav && cp $K/voice.wav $K/mix_raw_voice.wav
python3 -I $F/matte60.py $K $RAW <rvm.onnx> 0-8.6,81.2-86.6 && python3 -I $F/clean_alpha.py $K
(cd $PAGE/img/cap && bash $T/tools/capall.sh $T/tools/cap.cjs)          # the pages + ring boxes; boxes.js = window.BOXES={name: json}
ALPHA=$K/alpha60c.mkv node $F/render_raw.mjs $PAGE/pb.html $K $RAW <dir> --stills <times>
CRF=18 ALPHA=$K/alpha60c.mkv node $F/render_raw.mjs $PAGE/pb.html $K $RAW video/out/probly-2026-11-20/probly.mp4
node $F/cover.mjs $COVER/cover.html video/out/probly-2026-11-20/probly
```
The page folder holds `pb.html`, `plan.js`, `tok.js`, `boxes.js`, `img/cap/*.png|json`, `img/probly_logo.svg` (the
wordmark SVG from probly.com's header, `tools/logo.cjs`) and `img/e/` (the icons). None of these are committed.

## What this recording taught
- **"An illustration video" of a recording they filmed is their video with illustrations.** Asking about the cartoon
  and about the facts mid-build cost a round and annoyed them ("Or didn't you read what I said you should do"). The
  rule is now in the checkpoint: build on their video; the doubts go in the message.
- **Capture market pages in the viewers' time zone.** The headless browser runs in UTC, so Probly's "Local Time" read
  7:30 PM. With `timezoneId: 'Africa/Lagos'` it reads 8:30 PM, the time their viewers will see.
- **A coin must not cover the thing it lands on.** Full-size coins hid the Bayern and Arsenal crests. They now land at
  62% size on the crest's lower corner, and the coins that go with a ring sit in the margin, off the page's text.
- **An empty card again, and doubled pictures at scene changes.** The full check every half second found the steps
  card arriving half a second before its first step, and the outgoing and incoming items fading over each other.
  Step 1 now comes with the card. Every scene change is staggered: the old item leaves 0.06 s early, and the new one
  arrives 0.12 s late (`BND` in `pb.html`).
- **Score a doubtful caption against the sound before the final render.** The hear-back flagged "All you simply need
  to do is to". Scored on the CTC posteriors, "All you're simply needing to do is to" fits far better (-117 against
  -142). The caption follows the sound.
- **Type behind the head must actually go behind it.** At y 620 the bottom of MARKET only touched the hair. At y 680
  (and WEEKEND at 770) it tucks behind it, and at full size the hair edge was clean (no halo).
