# "Bitcoin after the Binance hack" (the owner's recording, 13 Nov 2026, upright, 2:58)

The owner's 3:22 selfie take: Bitcoin fell 25% over the weeks after the Bybit hack (Feb 2025); the Binance hack is far
bigger, so expect at least as much; the mood (Nvidia, the midterms, inflation, rate hikes) is bearish; "bearish,
bearish, bearish on Bitcoin till the new year". The brief: "attach real chart, show the current price. Make sure it's
well highlighted about everything I say... Showing the decline of bitcoin during the bybit hack and what could
possibly happen since the binance hack is 4.5x bigger". Out folder: `video/out/btc-after-the-binance-hack/`.

Built the way the fifth Primus version was (the checkpoint): the owner's own frames and voice, untouched; cuts,
graphics and quiet music on top; one encode; measured against the raw. Tools from the 12 Nov meme coin template.

## The moves, and the sample each is from (`../../STYLE-LIBRARY.md`)
| Move | Sample | Where |
|---|---|---|
| Bitcoin's real chart since Sep 2025 drawing itself BEHIND the head, the live price pill over the shirt | S1, S3 | 0:00 |
| A real candle chart that prints its candles on the words ("red candle after red candle"), marks on "91", "76", "bottom", the −25% bracket | S3 | 0:14 |
| Data cards that build with the voice, each line with its source (how Bybit filled the hole, how Binance covered it, what is frozen) | S3 | 0:42, 0:54, 1:23 |
| Money as bundles (half a billion each): 3 for Bybit, 13 for Binance; on "frozen" six turn to ice and drop out on "so" | S1 (objects acting the words) | 0:50, 1:12 |
| Both hacks on one chart from each hack day's high; the owner's "same amount, 25%, 45 days" as a dashed line with a question mark | S3 (split view) | 1:39 |
| A gauge whose needle swings to today's Fear & Greed reading; four chips land on "Nvidia", "midterms", "inflation", "rate hikes" | S3 | 2:10 |
| A bar from the top: the −50% mark on "minus 50%", then it falls to today | S3 | 2:20 |
| The two charts side by side on "check the charts", each lit on its word | S3 | 2:32 |
| Three BEARISH stamps on the three words; TILL THE NEW YEAR behind the head; the follow click on "anyways" | S2, S4 | 2:46 |
New against the 12 Nov video: the price pill, candles printing on the words, the bundles, the overlay with the owner's
scenario, the gauge, the stamps. Kept: cards with sources, type behind the head, captions, follow click.

## What is real
Every price comes from Binance's public market data (`fetch_data.py`, pulled on the day; the live price is the last
1-minute close before the render). The hack facts, frozen amounts, Nvidia, midterms, CPI and Fed lines each carry
their source on screen; `sources.md` lists each with its date. The dashed line is the owner's own scenario, labelled
"if it repeats"/with a question mark, never a forecast of ours.

## Build
```bash
K=<work dir>; RAW=<raw.mp4>; T=video/templates/talking-head/camera-btc-binance-2026-11-13; PAGE=<page dir>
ffmpeg -i $RAW -vn -ac 1 -ar 16000 $K/src16.wav
# words: faster-whisper medium.en -> words_in.json; misheard words fixed by hand ("act" -> "hacked") -> words_fixed.json
python3 -I video/lib/align_words.py $K/src16.wav $K/words_fixed.json $K/words_ctc.json
python3 -I $T/plan.py $K                          # the cut from the real silences, the captions
python3 -I $T/tokens.py $K
python3 -I $T/mix_raw.py $K $RAW <720.mp3> 22.906 22.906 83.81 10 5
python3 -I $T/matte60.py $K $RAW <rvm.onnx> 0-10.0,168.4-174.4 && python3 -I $T/clean_alpha.py $K
python3 -I $T/fetch_data.py <data dir> $PAGE      # run again right before the final render: the price is live
# $PAGE holds btc.html, cover.html (links), plan.js, tok.js, data.js, img/e/*.png, img/logo/*, img/still.png
ALPHA=$K/alpha60c.mkv node $T/render_raw.mjs $PAGE/btc.html $K $RAW <dir> --stills <times>
CRF=14 ALPHA=$K/alpha60c.mkv node $T/render_raw.mjs $PAGE/btc.html $K $RAW <out.mp4>      # 7 to 8 minutes
python3 -I video/lib/versus_quality.py $RAW <out.mp4> $K/segs.json --voice $K/mix_raw_voice.wav
node $T/cover.mjs $PAGE/cover.html <out prefix>   # cover, its middle square for X, the wide thumbnail
```

## What this recording taught
- **Check the owner's numbers against the reports and say so, never on screen.** $6.5B was $6.3B; 49 days was 45;
  "1.5 or 2 billion frozen" was about $3B. The captions keep his words; the graphics show the reported figures
  without contradicting a number he says; the message lists each.
- **A card arrives with its first line.** The first render had four cards sitting empty for a second (a card timed
  to its sentence, its first row to a later word). The half-second sheets caught it. Now the card comes 0.33 s before
  its first line and the previous card stays until then, leaving 0.16 s before the next arrives.
- **A cover cut for the 16:9 middle too.** Words on the left, face on the right, all inside y 656 to 1263, so even a
  wide crop keeps both (the 12 Nov rule only covered the square).
- **Labels on a chart get a white halo** and sit off the candles; a legend beats labels on crossing lines.
