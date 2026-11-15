# Primus $eU: the receipt (14 Nov 2026): the owner's script, read by Lara, 0:51, 16:9

**The brief (14 Nov):** the owner's own post about @primus_labs and $eU on BNB Chain, voiced as written. Through
AskUserQuestion they chose "Use the public screens" (no wallet screens) and Lara (756 credits).

**Concept: the receipt.** Their own picture is the device: a receipt flips to show the balance printed on its back.
The real explorers show what a vendor can see with U and what they can't with eU. At the end the same receipt
comes back with its back encrypted.

## Moves and the samples they come from (STYLE-LIBRARY.md)
- The example acted out with simple objects: the receipt flipping in 3D, the "rest of my account" panels sliding out
  and crossed, a locked coin flying between two wallets (S6, S5).
- Real explorer and docs pages, whole, then pushed in, with each claim ringed on its word (the rings draw on). A card
  beside each screen builds with the voice, its source and date under the screen (S3).
- An agenda that ticks: big in its own scene, then shrunk into the corner, ticking as each part ends (S1).
- Whisper and shout: "YOUR FIGURES STAY PRIVATE." shown twice the same way (s8, then the end card), and the receipt
  shown in the hook and again at the end (S4).
- The owner's reaction stickers, two, both sets (S7).

**Two main moves differ from the last explainer** (Primus hiring, 14 Nov: documents into a folder, a record redacted
to one line, docs pages): the receipt flip with its rhyme at the end, and the moving, ticking agenda. Real
block-explorer screens are new as the main evidence, and the music is "A New Life", not "Sparta".

## Motion craft (MOTION-STUDY.md), applied
- `motion.js` for every move:
  - entrances ease out and exits ease in, never by opacity alone;
  - springs for pops, a squash on the stamps;
  - one decaying shake, on the drop;
  - scene changes with depth;
  - a perceptual zoom in the camera on every real screen.
- Three layers: the thing named; its parts following 0.1 s later (rows, chips, the coin line); and ambient life (the
  grid drifting, the receipt floating).
- **Determinism:** `determinism.mjs` found one frame (24.4 s) that differs when drawn after a jump back from a scaled
  sticker frame.
  - That cannot happen in our render: each chunk starts in a fresh page and only moves forward.
  - A fresh frame and a forward frame were compared at both chunk joins (17.17 s, 34.33 s): identical, within 1 level.
  - The U logo has a file for each size it is shown at (440, 240, 92 px).
- Rendered with `MBLUR=32`, for the coin's flight, the receipt flip and the push-ins.

## Files
| File | What |
|---|---|
| `script.txt` | the owner's words with the tickers spelled for speech (E U, one to one) |
| `mix.sh` | the take with a 0.6 s pause after the hook (take 5.87 s); "A New Life" (543) with its drop (24.683 s into the track) on the pause, about 12 dB under the voice, full on the end card; -14 LUFS; also writes the voice-only track |
| `primus-eu.html` | the page (`window.render(t)`), 1920×1080: scenes s1 to s9, the end card, and the shared agenda `#ag` |
| `caps.py`, `hearback.py` | captions → caps.json and .srt; each caption checked against the final mix |
| `cover.html`, `cover.mjs` | upright cover, its middle square for X, the wide thumbnail |
| `sources.md`, `post-kit.md` | the dated sources and what could not be checked; the post text |

## Make it
```bash
S=<scratch>/eu; K=$S/work; P=$S/page; T=video/templates/explainer/primus-eu-2026-11-14
bash $T/mix.sh $K $S/take/lara.mp3 <scratch>/mus/543.mp3
python3 -I <strato tools>/takewords.py $K $T/script.txt && python3 -I video/lib/align_words.py $K/take16.wav $K/words_script.json $K/words_ctc.json
# words -> $P/words.js (141 words; "Wallet addresses" restored by hand at take 43.76-44.58, the aligner dropped "Wallet")
# img/: u_page, eu_page, vault_page (BscTrace, 3200x1800), docs (3200x2240 crop), dapp (1920x1080), chips, ulogo(_m,_s), eu_strip, primus-logo
node video/lib/determinism.mjs $P/primus-eu.html
MBLUR=32 bash video/templates/art-series/unveil/render_par.sh $P/primus-eu.html $K/plan.json video/out/primus-eu/primus-eu.mp4 3 16
python3 -I $T/caps.py $T/primus-eu.html $P/words.js $T/script.txt video/out/primus-eu primus-eu
python3 -I $T/hearback.py video/out/primus-eu/caps.json <final 16 kHz wav>
node $T/cover.mjs $P/cover.html video/out/primus-eu/primus-eu
```
- BscScan answers automated visits with a bot check: use BscTrace.
- The chain itself: `bsc-rpc.publicnode.com` (eth_getLogs in 2000 to 5000-block ranges).
- The docs URLs need their trailing slash.
