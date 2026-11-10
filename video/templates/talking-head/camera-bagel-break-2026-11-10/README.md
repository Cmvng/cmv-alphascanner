# Bagel and the international break (10 Nov 2026, upright, 1:40)

Final: 99.6 s, 2,988 frames, 1080×1920. -14.0 LUFS, true peak -3.1 dBTP. Out folder: `video/out/bagel-break/`.

The owner's 1:47 selfie recording about the international break and what is still on Bagel. The brief: "a clean
video about bagel and the app interface and all I was talking about", then, mid-work: "professionally done. The
background, every single thing."

**Concept:** the owner talks to camera the whole way; when the talk turns to the app, a phone with Bagel's real screen
rises in front of the lens and the camera goes soft behind it, like showing someone your phone.

## What is in it
- **The owner, in the studio look** (`video/lib/portrait_pro_long.py`, the 9 Nov "pro" look made to run on a whole
  recording): matted out of the room; the wall, tape marks and curtain become a smooth blue backdrop with a soft
  glow behind the head; a soft key light on the face; the framing rides a smoothed track of the head.
- **Cards above the head**, each landing on the word that names it:
  1. the hook: INTERNATIONAL BREAK, four club leagues struck out, "International teams: still on";
  2. this week's fixtures for the teams the owner names, with dates (ESPN and Polymarket, see `sources.md`);
  3. "Built on Polymarket's markets": one market under both names, "Same markets. Same liquidity.";
  4. LONG (green) and SHORT (red), "on other platforms".
- **Three phone moments**, all Bagel's own store art:
  1. Build a Combo: outlines on the Basketball and Esports tabs, an "MMA · UFC 334 · Sat 14 Nov" tag;
  2. the category wheel: Sports ("My specialty"), then Crypto ("I'd love to… but");
  3. Build a Combo again: two picks numbered and chained, "2 picks · 1 combo".
- **Captions** in the owner's words, one clause at a time, fillers left out.
- **End card:** Bagel's logo and tagline, the five things named in the video lit up, the stores, "Video by @Cmv_ng",
  and the risk line.
- **No reaction stickers:** the owner is on camera throughout.

## The cut
`plan.py`: 1:47 to 1:36 of speech. Out: the opening "So, basically, like,", an "And", a "Like, basically, like, you
could still", one hesitation, and the middle of six long pauses. Every cut is in a real silence of the cleaned voice
(all edges under -47 dB) and on the frame grid. Each cut, and five sentence starts, switch between the base framing
and a 5% punch-in.

## Build
```bash
K=<work dir>; RAW=<raw.mp4>; LIB=video/lib
ffmpeg -i $RAW -vn -ac 1 -ar 48000 $K/raw48m.wav            # then adeclip, dereverb.py (WPE), df_enhance.py -> $K/src_df3.wav
python3 -I plan.py $K                                       # plan.json, plan.js, segs.json (needs words_ctc.json)
python3 -I $LIB/portrait_pro_long.py prep $RAW $K           # 30 fps working copy, 1224x2176
python3 -I $LIB/portrait_pro_long.py matte $K <rvm.onnx>    # about 15 min for 107 s
python3 -I $LIB/portrait_pro_long.py preview $K $K/segs.json <dir> 0.5,22,50,80   # look at these at full size first
python3 -I $LIB/portrait_pro_long.py render $K $K/segs.json $K/cam_pro.mp4 4
python3 -I build_av.py $K $K/cam_pro.mp4 <558.mp3>          # base.mp4 (soft behind the phones), voice, bed, mix
node render.mjs <page>/break.html $K <out.mp4>              # the page dir holds break.html, plan.js and img/
python3 -I review.py $K <out.mp4> && python3 -P -E hearback.py $K && python3 -I srt.py $K <out.srt>
```
`<page>/img/` holds Bagel's two phone cut-outs (from the store art, as in the 8 Nov film) and its logo; they are not
committed.

## Checks before sending
- `review.py`: every half second on ten sheets; look at every one (the first frame, the focus change before each phone,
  every card while it fills).
- `hearback.py`: every caption against the final sound.
- Four full-size frames with hands at the face, for the cut-out's edge.

## Lessons from this build
- An ffmpeg `blend` with a time expression is evaluated for every pixel; the soft-focus step took minutes per second
  of video. A blurred copy faded in over the sharp one with `fade=alpha=1` does the same in real time.
- An overlay whose second input starts late makes ffmpeg hold the first input's frames in memory until it arrives.
  With three late overlays on 1080x1920 the build was killed for memory. Every overlay input now runs the full length.
- The first frame is the poster frame on most platforms: the title card is whole at t = 0, nothing animates in.
- A card grows with its rows; it is never shown with an empty band.
- torchaudio has no build for this torch; a 20-line stand-in that reads and writes with soundfile is enough for
  DeepFilterNet's file handling (`video/lib/tastub/`; run `df_enhance.py` with `PYTHONPATH=video/lib/tastub`).
