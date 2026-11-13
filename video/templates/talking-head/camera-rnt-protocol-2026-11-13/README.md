# "RNT Protocol explained" (the owner's recording, 13 Nov 2026, upright, 2:00)

The owner's 2:32 selfie take explaining RNT Protocol as "the DeFi of rentals" with two people: Mr A owns a $10,000
rental-property token, borrows up to 75% against it, pays interest every day, and at 80% the token is sold on the open
market with a 10% fine; Mr B puts his spare cash in the pool and earns an APY ("10% or 10.5%"). The brief: "I want to
create a video explaining that project Rnt protocol..... Do an extensive research and make sure the video is 10/10",
with a link to @rntprotocol on X. Out folder: `video/out/rnt-protocol-explained/`.

Built the way the fifth Primus version was (the checkpoint): the owner's own frames and voice, untouched; cuts,
graphics and quiet music on top; one encode; measured against the raw. Tools from the 13 Nov Bitcoin template.

## The idea
Their example, acted out in the order they tell it, and checked on the real app as they say each number. Mr A's loan is a
meter that fills to 75% on "7,500", crawls with daily interest, turns red at 80% and sends the token to the open market
with a −10% bite; then RNT Lend's own page with the same 75% / 80% / 10% ringed on their three words. Mr B's cash flows
into the pool and out as Mr A's loan; what he earns is ringed on the real USDT page, then counted up.

## The moves, and the sample each is from (`../../STYLE-LIBRARY.md`)
| Move | Sample | Where |
|---|---|---|
| RNT / PROTOCOL as giant type behind the head, the logo pill, the two cast chips | S1, S3, S4 | 0:00 |
| The real homepage in a card on "RNT Protocol is" | S3 | 0:12 |
| Mr A as a 3D tile, his token as a coin landing on "token", then a real one (Costa Mediterranea 1's header on RNT Lend) | S1 (objects acting the words), S3 | 0:19 |
| **The loan meter** (new): fills to 75% on "7,500", the interest crawl on "every single day", the 80% line on "80%", red on "sold", the coin slides to the open market, "−10% penalty" on "fine" | S1, S3 (a card that builds with the voice) | 0:34 |
| The real page with max LTV 75%, liquidation 80%, penalty 10%, each ringed on its word | S3 (a real page, the line outlined) | 1:00 |
| **The flow** (new): Mr A, the pool, Mr B as tiles; cash chips on "$10,000" and "$15,000"; the pipe from Mr B fills on "supplier", the pipe to Mr A on "for Mr A", a lock on Mr A's side | S1 (widgets round the head), S2 (an icon per noun) | 1:12 |
| HE EARNS APY card, then the real USDT page with the APY ringed on "10.5% APY" | S3 | 1:25 |
| $10,000 → $1,074 a year counting up, "if the rate stayed where it is today" | S3, S4 (a number that pays off) | 1:36 |
| The real market page with $31.24M ringed on "the DeFi of rental properties" | S3 | 1:43 |
| RNT / PROTOCOL behind the head again, the "DeFi of rentals" pill, the follow click on "means" | S2, S4 | 1:49 |
| Word-by-word captions, seven big phrases | S2, S3, S4 | throughout |
New against the 13 Nov Bitcoin video: the meter, the flow, the coin and cast tiles, the count-up, the real pages ringed
on their words. Kept: type behind the head, captions, follow click. No price pill, candles, gauge or stamps.

## What is real
Every number on screen is from RNT Lend's own pages or its public API, on the day (`capture.mjs`, `fetch_data.py`):
the 75 / 80 / 10 on the Costa Mediterranea 1 page; the USDT supply APY (10.74%) and borrow APY (12.88%) from
`lend.rnt.finance/api/reserve-history` (liquidityRate in ray, APY = (1 + r/365)^365 − 1); the $31.24M market.
Each card names its source and date. `sources.md` lists everything with its date.

## Build
```bash
K=<work dir>; RAW=<raw.mp4>; T=video/templates/talking-head/camera-rnt-protocol-2026-11-13; PAGE=<page dir>
ffmpeg -i $RAW -vn -ac 1 -ar 16000 $K/src16.wav
# words: faster-whisper medium.en -> words_in.json; "sued" -> "sold" by hand -> words_fixed.json
python3 -I video/lib/align_words.py $K/src16.wav $K/words_fixed.json $K/words_ctc.json
python3 -I $T/plan.py $K                          # the cut from the real silences (three drops), the captions
python3 -I $T/tokens.py $K
python3 -I $T/mix_raw.py $K $RAW <720.mp3> 22.906 22.906 83.81 10 5
python3 -I $T/matte60.py $K $RAW <rvm.onnx> 0-12.4,108.9-116.8 && python3 -I $T/clean_alpha.py $K   # OUTPUT times
node $T/capture.mjs $PAGE/img/shot                # the real pages, DPR 2, cookie banner declined
python3 -I $T/fetch_data.py <data dir> $PAGE      # the rates; run again right before the final render
# $PAGE holds rnt.html, cover.html (links), plan.js, tok.js, data.js, img/shot/*, img/e/*.png, img/logo/*, img/still.png
ALPHA=$K/alpha60c.mkv node $T/render_raw.mjs $PAGE/rnt.html $K $RAW <dir> --stills <times>
CRF=14 ALPHA=$K/alpha60c.mkv node $T/render_raw.mjs $PAGE/rnt.html $K $RAW <out.mp4>      # 5 minutes
python3 -I video/lib/versus_quality.py $RAW <out.mp4> $K/segs.json --voice $K/mix_raw_voice.wav
python3 -I $T/review.py $K <out.mp4> && python3 -P -E $T/hearback.py $K
node $T/cover.mjs $PAGE/cover.html <out prefix>   # cover, its middle square for X, the wide thumbnail
```

## What this recording taught
- **The outline's spans are in finished-video time, not source time.** The first matte run used source times and
  outlined 382 frames, most of them the wrong ones; the right spans gave 608. `matte60.py` reads `segs.json`.
- **A real screen at its real size first, then decide.** The header and market screens captured at 1280 wide were
  unreadable at 760 in the frame; captured at a 760 viewport they read at feed size.
- **A meter's labels go under the bar,** value right-aligned above it, the end ("$10,000 his token") shown from the
  start so the card is never an empty box.
- **The owner's words stay, the doubt goes to the message:** "a fixed APY" is a variable rate on RNT Lend
  (10.06% to 15.34% that week). The captions keep "fixed"; the card shows today's rate with its date.
- **The hear-back flags "DeFi" in a short clip** ("define or properties rent to"); the full-recording transcription
  and the alignment both have "the DeFi of rental properties", and the same phrase at 0:14 passed at 100%.
