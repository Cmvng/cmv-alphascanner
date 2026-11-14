# STRATO's two vaults (14 Nov 2026): the owner's written script, read by Lara, acted out step by step

**The brief (14 Nov):** two screenshots of STRATO's vault pages (ETH Yield Vault, wBTC Carry Vault) and their written
script: "I want to create an illustrative video on this my written content... Clean motions and references". The
owner chose Lara (about 1,450 credits).

**Concept:** two vaults that look alike, with two different engines. ETH or BTC opens the video. The two real vault
cards meet at a ≠, and the title lands on the music's drop. Each vault is then built in the order the script tells it,
and the two engines finish side by side: STAKING YIELD against CARRY TRADE, with the gap opening between what the
stablecoins pay and what the loan costs.

## Moves and the samples they come from (STYLE-LIBRARY.md)
- The product acted out, one step on each line, a camera that pushes in on the named box (S6, S5).
- Real screens with each number ringed on its word, and a small reference chip with source and date (S3).
- Bars to show a gap, labelled "illustration", with no numbers on them (S3).
- One canvas that changes state, the panels splitting into two engines (S5).
- A stamp on the risk line (S2); the owner's reaction stickers, three, both sets (S7).

Different from the last Lara explainer (the Nvidia story, CONFIRMED vs ALLEGED type): no big-type layout here; this
one is diagrams built from the project's own coins and screens.

## Files
| File | What |
|---|---|
| `script.txt` | the owner's words, with symbols spelled out for speech (W S T ETH, U S D S T, "By the way") |
| `mix.sh` | the take with a 0.6 s pause for the drop at 7.04 s, over "New Bass 01" (720), ducked, -14 LUFS |
| `strato.html` | the page (`window.render(t)`), 1920×1080; scenes s1 to s13 and the end card |
| `caps.py` | the captions as the page times them → caps.json (with the spoken words) and the .srt |
| `hearback.py` | each caption against what is heard in the final mix (small.en) |
| `cover.html`, `cover.mjs` | upright cover, its middle square for X, the wide thumbnail |
| `sources.md`, `post-kit.md` | the dated sources; the post text and what to tell the owner |

## Make it
```bash
S=<scratch>/strato; K=$S/work; P=$S/page; T=video/templates/explainer/strato-vaults-2026-11-14
bash $T/mix.sh $K $S/take/lara.mp3 $S/mus/720.mp3
# word times: takewords.py + align_words.py → $P/words.js (293 script words)
node video/templates/art-series/unveil/render.mjs $P/strato.html $K/plan.json --stills 0,7.05,24.5 $S/st
bash video/templates/art-series/unveil/render_par.sh $P/strato.html $K/plan.json video/out/strato-vaults/strato-vaults.mp4 3 16
python3 -I $T/caps.py $T/strato.html $P/words.js $T/script.txt $K strato-vaults
python3 -I $T/hearback.py $K/caps.json $K/final16.wav
node $T/cover.mjs $P/cover.html video/out/strato-vaults/strato-vaults
```

## Learned on this one
- `T(6.84)` is past the drop because of the `>=` in T(): use the drop's own time (`DROP = 7.04`) for the scene cut.
- A scene change where the new scene fades in while the old one is still at full strength gives one muddled frame
  (46.2 s here). The old scene now leaves over its last 0.24 s and the new one arrives over its first 0.24 s; the drop
  is a hard cut.
- Rings are blue. Red stays for what means a loss (the borrow cost, HITS IT HARDER).
- A reference chip needs about 2 s on screen: bring it in with the thing it names, not at the end of the line.
- The first frame: elements that sit there from the start take `show(id, t, -1)`, so frame 0 is a whole picture.
