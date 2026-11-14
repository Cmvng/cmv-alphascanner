# Primus, the hiring use case (14 Nov 2026): a summary of the owner's post, read by Lara, 0:59, 16:9

**The brief (14 Nov):** ten pictures and the owner's post about @primus_labs: "I want to create a video on primus labs...
But I want you to use the summary of the idea of the video.. Not like you taking all the contents on the video word for
word". So the script (`script.txt`, 877 characters) is their idea in about half the words, keeping their lines ("this
credential, true", "one limit though", "That's all for now"). The owner saw the summary and chose Lara before the take
(AskUserQuestion with the text as preview).

**Concept: one line, not your whole file.** The whole file goes into the team's folder and spills what was never
asked; then zkTLS redacts a record down to one line, and that line is the proof the hiring app gets.

## Moves and the samples they come from (STYLE-LIBRARY.md)
- The example acted out step by step with simple objects (documents into a folder, a record redacted line by line)
  (S6, S5).
- Real pages with each claim ringed on its word, and a quote card with its source (S3).
- Stamps: NEVER PART OF THE QUESTION, AS THE SITE SHOWED IT, NOT PROVEN (S2).
- The owner's reaction stickers, three, both sets (S7).

Different from the last Primus videos (the dealt cards, 5 Nov; the 3D Bouncer, 9 Nov; glass, 14 Oct) and from the last
explainer (STRATO, flows of coins): documents and redaction, Primus's docs as the proof, "Sparta" not "New Bass 01".

## Files
| File | What |
|---|---|
| `script.txt` | the summary, with letters spelled for speech (C V, I D, Z K T L S) |
| `mix.sh` | the take with a 0.6 s pause after the hook (take 4.56 s), "Sparta" (370) with its drop at 4.76 s, about 12 dB under the voice, full on the end card; -14 LUFS; also writes the voice-only track |
| `primus.html` | the page (`window.render(t)`), 1920×1080; scenes s1 to s9 and the end card |
| `caps.py`, `hearback.py` | captions → caps.json and .srt; each caption against the final mix |
| `cover.html`, `cover.mjs` | upright cover, its middle square for X, the wide thumbnail |
| `sources.md`, `post-kit.md` | the dated sources; the post text and what to tell the owner |

## Make it
```bash
S=<scratch>/primus14; K=$S/work; P=$S/page; T=video/templates/explainer/primus-hiring-2026-11-14
bash $T/mix.sh $K $S/take/lara.mp3 <scratch>/mus/370.mp3
python3 -I <strato tools>/takewords.py $K $T/script.txt && python3 -I video/lib/align_words.py $K/take16.wav $K/words_script.json $K/words_ctc.json
# words_ctc.json -> $P/words.js (window.WORDS = [[s, e, w], ...], 164 words); img/: home, mpc, hiring, hiring_strip, devhub, primus-logo, primus-icon
bash video/templates/art-series/unveil/render_par.sh $P/primus.html $K/plan.json video/out/primus-hiring/primus-hiring.mp4 3 16
python3 -I $T/caps.py $T/primus.html $P/words.js $T/script.txt $K primus-hiring
python3 -I $T/hearback.py $K/caps.json $K/final16.wav
node $T/cover.mjs $P/cover.html video/out/primus-hiring/primus-hiring
```
The docs pages need their trailing slash (`.../hiring-dating/`); without it they answer 404.
