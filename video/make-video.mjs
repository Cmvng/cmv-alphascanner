#!/usr/bin/env node
// cmvng picks / results video maker.
//
//   node video/make-video.mjs video/templates/picks.example.json
//   node video/make-video.mjs my-picks.csv --no-voice
//   node video/make-video.mjs my-picks.json --stills 2,8,15     (quick preview images, no video)
//
// Options: --out <file.mp4>  --fps 30  --workers 3  --no-voice  --stills t1,t2,...
// Needs: Node 18+, Playwright (Chromium), ffmpeg, python3 with numpy + kokoro-onnx (the voice).

import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { spawn, execSync } from 'node:child_process'
import { createRequire } from 'node:module'
import { loadInput } from './lib/input.mjs'
import { resolveBadge, isCountry } from './lib/badges.mjs'
import { resolveStadium } from './lib/stadium.mjs'
import { resolvePlayers } from './lib/players.mjs'
import { resolvePerson } from './lib/people.mjs'
import { resolveTeamPhotos } from './lib/teamphotos.mjs'
import { buildScenes } from './lib/narration.mjs'

const DIR = path.dirname(new URL(import.meta.url).pathname)
const argv = process.argv.slice(2)
const flag = (n, d) => { const i = argv.indexOf(`--${n}`); return i < 0 ? d : (argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[i + 1] : true) }
const input = argv.find(a => !a.startsWith('--') && /\.(json|csv)$/i.test(a))
if (!input) { console.log('Usage: node video/make-video.mjs <picks.json|picks.csv> [--out file.mp4] [--no-voice] [--stills 2,8]'); process.exit(1) }
const FPS = Number(flag('fps', 30))
const WORKERS = Number(flag('workers', Math.max(1, Math.min(4, os.cpus().length - 1))))
const PY = process.env.PYTHON || 'python3'
const FF = process.env.FFMPEG || 'ffmpeg'

// Built-in music (Mixkit Stock Music Free License: free for videos, including commercial use). Downloaded once.
// start = where the beat drops, so the video opens on energy.
const TRACKS = {
  picks: { url: 'https://assets.mixkit.co/music/739/739.mp3', start: 20.4, credit: 'Music: "Never Going Broke" (Mixkit)' },
  results: { url: 'https://assets.mixkit.co/music/1183/1183.mp3', start: 12.7, credit: 'Music: "K.O." (Mixkit)' },
}

function run(cmd, args, opts = {}) {
  return new Promise((res, rej) => {
    const p = spawn(cmd, args, { stdio: ['ignore', 'inherit', 'inherit'], ...opts })
    p.on('close', c => c === 0 ? res() : rej(new Error(`${cmd} exited with ${c}`)))
  })
}
async function download(url, file) {
  if (fs.existsSync(file)) return file
  fs.mkdirSync(path.dirname(file), { recursive: true })
  const r = await fetch(url, { headers: { 'User-Agent': 'cmvng-video/1.0 (https://cmvngpicks.com)' } })
  if (!r.ok) throw new Error(`download failed (${r.status}) ${url}`)
  fs.writeFileSync(file + '.part', Buffer.from(await r.arrayBuffer())); fs.renameSync(file + '.part', file)
  return file
}
function loadPlaywright() {
  const req = createRequire(import.meta.url)
  for (const p of [process.env.PLAYWRIGHT_PATH, 'playwright', path.join(execSync('npm root -g').toString().trim(), 'playwright')]) {
    if (!p) continue
    try { return req(p) } catch {}
  }
  throw new Error('Playwright not found. Run: npm i -D playwright && npx playwright install chromium')
}

// ---------------------------------------------------------------- 1. data, badges, stadiums
const { cfg, picks, recap } = loadInput(input)
// the approved edit (owner, 3 Oct 2026) is the default for analysis, post-match and explainer videos (not tips videos):
// recorded cinematic sound and voice A; with a cold open, the music's drop lands on the cut right after it
if (['preview', 'review', 'explainer'].includes(cfg.mode) && cfg.tips !== true) {
  cfg.sound ??= 'cinematic'; cfg.voice_fx ??= 'deep'
  const cold = cfg.mode === 'preview' ? !!cfg.analysis?.cold : (cfg.mode === 'review' ? cfg.review?.beats : cfg.explainer?.beats || []).some(b => /(^|_)cold$/.test(b.type || ''))
  if (cold) cfg.music_drop ??= 'after_cold'
}
// --short: the 60-second cut for Shorts / Reels (main match only: no round-up, no tactics screen)
const SHORT = !!flag('short', false)
const slug = path.basename(input).replace(/\.(json|csv)$/i, '') + (SHORT ? '_short' : '')
const OUT = path.join(DIR, 'out', slug), CACHE = path.join(DIR, '.cache')
// a stills check keeps the finished video, its review and its voice (6 Oct: a stills run wiped the final render)
if (flag('stills', false) || flag('say-check', false)) fs.rmSync(path.join(OUT, 'stills'), { recursive: true, force: true })     // checks keep the finished render
else fs.rmSync(OUT, { recursive: true, force: true })
// two venue names are the same ground when they share a distinctive word ("Shahid Vatani Stadium" = "Vatani Stadium")
const VSTOP = new Set(['stadium', 'stadionul', 'stadion', 'stade', 'estadio', 'stadio', 'arena', 'sports', 'sport', 'national', 'city', 'the', 'park', 'ground', 'municipal', 'olympic', 'dr', 'of', 'de', 'del', 'la'])
const vTok = s => new Set(String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').split(' ').filter(w => w.length > 2 && !VSTOP.has(w)))
const sameVenue = (a, b) => { const A = vTok(a), B = vTok(b); return [...A].some(w => B.has(w)) }
fs.mkdirSync(OUT, { recursive: true })
// photos picked by hand for this video (stadiums, players, coaches) live outside out/, which a full render wipes:
// cfg.media_dir (relative to the repo's video/ folder) is copied into the render folder
if (cfg.media_dir) fs.cpSync(path.resolve(DIR, cfg.media_dir), OUT, { recursive: true })
console.log(`\n${cfg.title} · ${cfg.competition} · ${cfg.date}`)
for (const p of picks) {
  p.bh = await resolveBadge(p.home, p.crest_home, CACHE, OUT)
  p.ba = await resolveBadge(p.away, p.crest_away, CACHE, OUT)
  const own = typeof p.stadium === 'string' ? p.stadium : null
  p.stadium = cfg.stadiums === false ? null
    : await resolveStadium(p.home, { national: isCountry(p.home), country: p.country, cacheDir: CACHE, outDir: OUT, own, ownCredit: p.stadium_credit })
  // The photo must be the team's own ground (the owner, 8 Oct: "The stadiums have to be the stadiums of the teams").
  // Wikidata can be wrong (Blacks Power → Mandela National Stadium; they play at Hoima City Stadium), so when the pick
  // carries the researched `venue`, a photo of any other ground is dropped. Better no photo than the wrong stadium.
  if (p.stadium && p.venue && !own && !sameVenue(p.venue, p.stadium.venue)) { console.log(`  ! ${p.home}: the photo found is ${p.stadium.venue}, but they play at ${p.venue}. Photo dropped: put the right one in "stadium".`); p.stadium = null }
  if (cfg.style === 'players') p.players = await resolvePlayers(p.home, { national: isCountry(p.home), country: p.country, cacheDir: CACHE, outDir: OUT })
  if (cfg.mode === 'preview' || cfg.mode === 'review') { console.log(`  ${p.home} v ${p.away}  ${p.stadium ? '📷 ' + p.stadium.venue : '(no stadium photo)'}`); continue }
  console.log(`  ${(p.home + ' v ' + p.away).padEnd(28)} ${p.pick.padEnd(26)} @${p.odds.toFixed(2)}  model ${p.model}%  book ${p.market.toFixed(0)}%  edge ${(p.edge * 100).toFixed(1).padStart(5)}%  → ${p.signal} bar${p.signal > 1 ? 's' : ' '} (${cfg.currency}${p.stake})  ${p.stadium ? '📷 ' + p.stadium.venue : '(no stadium photo)'}`)
}

// match analysis: a free photo of each player to watch (else the card shows the crest)
for (const x of cfg.analysis?.players || []) x.photo = x.photo === false ? null : await resolvePerson(x.name, { cacheDir: CACHE, outDir: OUT })
// cold-open steps can name a player who isn't one of the four to watch (e.g. a star who is out tonight)
for (const st of cfg.analysis?.cold?.steps || []) if (st.player && st.photo !== false && !(cfg.analysis.players || []).some(x => x.name === st.player)) st.photo = await resolvePerson(st.player, { cacheDir: CACHE, outDir: OUT })
// post-match review: the player in each moment
for (const b of cfg.review?.beats || []) if (b.player && b.photo !== false) b.photo = await resolvePerson(b.player, { cacheDir: CACHE, outDir: OUT })
for (const b of cfg.review?.beats || []) for (const it of b.items || []) if (it.player && it.photo !== false) it.photo = await resolvePerson(it.player, { cacheDir: CACHE, outDir: OUT })
// reaction videos: real photos of the teams (2026 World Cup, Wikimedia) as a beat-cut montage, plus named players
const SQUADS = JSON.parse(fs.readFileSync(path.join(DIR, 'lib', 'squads.json'), 'utf8')).squads
for (const b of cfg.review?.beats || []) if (b.teams || b.people) {
  b.photos = []
  for (const tm of b.teams || []) b.photos.push(...await resolveTeamPhotos(tm, { names: SQUADS[tm] || [], cacheDir: CACHE, outDir: OUT, count: 7 }))
  for (const n of b.people || []) { const ph = await resolvePerson(n, { cacheDir: CACHE, outDir: OUT }); if (ph) b.photos.push(ph) }
  if (b.start_at) b.photos = [...b.photos.slice(b.start_at), ...b.photos.slice(0, b.start_at)]   // vary which photo leads
  if (!b.photos.length) delete b.photos
}

// team colours from each crest or flag (the broadcast style's panels, the glows behind the badges)
const imgs = picks.flatMap(p => [p.bh, p.ba]).filter(b => b.src)
if (imgs.length) {
  try {
    const cols = JSON.parse(execSync(`"${PY}" "${path.join(DIR, 'audio.py')}" colour ${imgs.map(b => JSON.stringify(path.join(OUT, b.src))).join(' ')}`).toString())
    imgs.forEach((b, i) => { if (cols[i]) b.colour = cols[i] })
  } catch (e) { console.warn(`  ! team colours: ${e.message.split('\n')[0]}`) }
}
if (cfg.style === 'players') console.log(`Players style: ${picks.filter(p => p.players?.length).length}/${picks.length} matches have recent photos (the rest use the stadium)`)

// ---------------------------------------------------------------- 2. music (needed first: cuts land on its beat)
// A different track for every video: from lib/music.json (Mixkit free licence), never one of the last six used,
// matched to the video's mood (analysis → groove first; tips, reactions, results → hype first).
// A re-render of the same file keeps its track (--new-music picks another).
function pickTrack() {
  // retired tracks (the old defaults the owner found repetitive) never come back in rotation
  const all = JSON.parse(fs.readFileSync(path.join(DIR, 'lib', 'music.json'), 'utf8')).tracks
  // a track asked for by id (music_track): e.g. a "drop" track whose drop lands on a chosen cut
  const want = cfg.music_track && all.find(t => t.id === +cfg.music_track)
  // retired tracks (the old defaults the owner found repetitive) never come back in rotation; "drop" tracks only by id,
  // or in rotation for a video that opens on a drop (music_drop), optionally narrowed by music_vibe ("dark trap", ...)
  const vibes = cfg.music_vibe ? [].concat(cfg.music_vibe) : null
  // candidates (measured, not yet played to the owner) only by id
  const lib = cfg.music_drop ? all.filter(t => !t.retired && !t.candidate && t.drop != null && (!vibes || vibes.includes(t.vibe)))
    : all.filter(t => !t.retired && !t.candidate && t.mood !== 'drop')
  const hist = path.join(CACHE, 'music', 'history.json')
  let h = { used: [], by: {} }
  try { const j = JSON.parse(fs.readFileSync(hist, 'utf8')); h = Array.isArray(j) ? { used: j, by: {} } : j } catch {}
  const asTrack = t => ({ url: `https://assets.mixkit.co/music/${t.id}/${t.id}.mp3`, start: t.start, drop: t.drop, loop: t.loop, credit: `Music: "${t.name}"${t.artist && t.artist !== 'Mixkit' ? ' by ' + t.artist : ''} (Mixkit)` })
  // a track chosen by id still counts in the rotation, so the next videos don't repeat it
  if (want) {
    if (!flag('stills', false) && h.by[slug] !== want.id) { fs.mkdirSync(path.dirname(hist), { recursive: true }); fs.writeFileSync(hist, JSON.stringify({ used: [...h.used, want.id].slice(-30), by: { ...h.by, [slug]: want.id } })) }
    return asTrack(want)
  }
  const again = !flag('new-music', false) && lib.find(t => t.id === h.by[slug])
  if (again) return asTrack(again)
  const moods = cfg.music_mood ? [].concat(cfg.music_mood) : cfg.mode === 'preview' ? ['groove', 'cinematic'] : ['hype', 'groove']
  const recent = [...h.used.slice(-6), h.by[slug]]
  let pool = lib.filter(t => (cfg.music_drop || moods.includes(t.mood)) && !recent.includes(t.id))
  if (!pool.length) pool = lib.filter(t => !h.used.slice(-3).includes(t.id))
  // analysis and post-match: only the soundtracks that wow (the owner, 4-6 Oct: a quiet build and a hard drop, like
  // "A New Life"; lib/music.json marks them "wow"). Never one of the last six if possible, else the least recently used
  const wow = all.filter(t => t.wow && !t.retired)
  if (['preview', 'review'].includes(cfg.mode) && cfg.tips !== true && cfg.music_wow !== false && wow.length) {
    const fresh = wow.filter(t => !recent.includes(t.id)), last = id => h.used.lastIndexOf(id)
    pool = fresh.length ? fresh : [...wow].sort((x, y) => last(x.id) - last(y.id)).slice(0, 1)
  }
  const seed = [...slug].reduce((a, ch) => (a * 31 + ch.charCodeAt(0)) >>> 0, 7)
  const t = pool[seed % pool.length]
  if (!flag('stills', false)) {
    fs.mkdirSync(path.dirname(hist), { recursive: true })
    fs.writeFileSync(hist, JSON.stringify({ used: [...h.used, t.id].slice(-30), by: { ...h.by, [slug]: t.id } }))
  }
  return asTrack(t)
}
const stills = flag('stills', false)
let music = null
if (cfg.music !== false) {
  try {
    const track = typeof cfg.music === 'string' && cfg.music !== 'auto' ? { file: cfg.music, start: cfg.music_start ?? 0, credit: '' } : pickTrack()
    if (track.url) track.file = await download(track.url, path.join(CACHE, 'music', path.basename(track.url)))
    const bj = path.join(OUT, 'beats.json')
    await run(PY, [path.join(DIR, 'audio.py'), 'beats', track.file, String(track.start), bj])
    music = { ...track, ...JSON.parse(fs.readFileSync(bj, 'utf8')) }
    console.log(`Music: ${path.basename(track.file)} from ${music.start.toFixed(2)}s · ${music.bpm.toFixed(1)} bpm`)
  } catch (e) { console.warn(`  ! Music unavailable (${e.message}).`) }
}

// ---------------------------------------------------------------- 3. voiceover
if (SHORT) { cfg.skip = [...(cfg.skip || []), ...(cfg.short_skip || ['pv_round', 'pv_tactics'])]; cfg.script = { ...(cfg.script || {}), ...(cfg.script_short || {}) } }
const scenes = buildScenes(cfg, picks, recap)
// never the same video twice (the owner, 5 Oct: "the social media algo doesn't like it", "not generic"): a new video
// whose run of screens is within two changes of one of the last three of its kind, in the same look, stops here.
// Adding one screen to yesterday's video is not different enough: change the order and the format, not one detail
{
  const base = x => x.replace(/_short$/, ''), runOf = sc => sc.filter((t, i) => t !== sc[i - 1])     // pv_round ×3 counts once
  const types = runOf(scenes.map(s => s.type)), sig = [cfg.mode, cfg.style || '', types.join('>')].join(' | ')
  const dist = (a, b) => { const d = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]); for (let j = 1; j <= b.length; j++) d[0][j] = j
    for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++) d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)); return d[a.length][b.length] }
  const vh = path.join(CACHE, 'variety', 'history.json')
  let vlog = []; try { vlog = JSON.parse(fs.readFileSync(vh, 'utf8')) } catch {}
  const near = vlog.filter(v => base(v.slug) !== base(slug) && v.mode === cfg.mode && !!v.short === SHORT).slice(-3)
    .map(v => ({ ...v, d: v.style === (cfg.style || '') ? dist(v.types || [], types) : 99 })).find(v => v.d <= 2)
  if (near && !flag('allow-same', false)) {
    console.error(`\n✋ Too close to ${near.slug} (${near.date}): ${near.d === 0 ? 'the same' : 'only ' + near.d + ' screen change' + (near.d > 1 ? 's' : '') + ' from'} its run of screens, in the same look.\n   this: ${sig}\n   that: ${near.sig}\n   Make it different: another order and format of screens, new screens, another style. See "Never generic" in the skill.`)
    process.exit(1)
  }
  if (!flag('stills', false)) { fs.mkdirSync(path.dirname(vh), { recursive: true }); fs.writeFileSync(vh, JSON.stringify([...vlog.filter(v => v.slug !== slug), { slug, mode: cfg.mode, short: SHORT, style: cfg.style || '', date: cfg.date || '', types, sig }].slice(-60), null, 1)) }
}
const spoken = x => typeof x === 'string' ? x : x.say, shown = x => typeof x === 'string' ? x : x.show
const sentences = scenes.flatMap((s, k) => s.say.map((x, j) => ({ id: `s${k}_${j}`, text: spoken(x), k })))
fs.writeFileSync(path.join(OUT, 'script.txt'), scenes.map(s => s.say.map(shown).join(' ')).join('\n\n') + '\n')
// pronunciation check: every unusual word as the voice will say it, stressed syllable in capitals (speech-to-text can't
// hear a wrong stress: "Ethereum" came out ee-thur-REE-um on 6 Oct). Read it; fix wrong ones in SAY_IPA. --say-check stops here
if (!stills && cfg.voice !== false && ['preview', 'review', 'explainer'].includes(cfg.mode)) {
  fs.writeFileSync(path.join(OUT, 'sentences.json'), JSON.stringify(sentences))
  try {
    const rep = execSync(`"${PY}" "${path.join(DIR, 'lib', 'say_check.py')}" "${path.join(OUT, 'sentences.json')}" "${path.join(CACHE, 'kokoro')}" 2>/dev/null`).toString()
    fs.writeFileSync(path.join(OUT, 'say-check.txt'), rep); console.log(rep)
  } catch (e) { console.warn(`  ! pronunciation check unavailable (${e.message.split('\n')[0]})`) }
  if (flag('say-check', false)) process.exit(0)
}
let durs = null, wordTimes = null
const voiceOn = !flag('no-voice', false) && !stills && cfg.voice !== false
if (voiceOn) {
  try {
    let voice = cfg.voice
    const models = path.join(CACHE, 'kokoro')
    if (voice.endsWith('.onnx')) {
      if (!fs.existsSync(voice)) throw new Error(`voice file not found: ${voice}`)
    } else {
      console.log('Getting the voice model (one time, ~350 MB)…')
      for (const f of ['kokoro-v1.0.onnx', 'voices-v1.0.bin']) await download(`https://huggingface.co/fastrtc/kokoro-onnx/resolve/main/${f}`, path.join(models, f))
    }
    fs.writeFileSync(path.join(OUT, 'sentences.json'), JSON.stringify(sentences))
    console.log(`Recording the voiceover (${voice})…`)
    await run(PY, [path.join(DIR, 'audio.py'), 'speak', path.join(OUT, 'sentences.json'), voice, path.join(OUT, 'voice'), String(cfg.voice_speed), models, ...(cfg.voice_fx ? [cfg.voice_fx] : [])])
    durs = JSON.parse(fs.readFileSync(path.join(OUT, 'voice', 'durations.json'), 'utf8'))
    // real word timings for the captions (whisper on each recorded line), mapped onto the words shown on screen
    if (cfg.word_timing !== false && ['preview', 'review', 'explainer'].includes(cfg.mode)) {
      try {
        const cap = Object.fromEntries(scenes.flatMap((s, k) => s.say.map((x, j) => [`s${k}_${j}`, typeof x === 'string' ? x : x.show])))
        fs.writeFileSync(path.join(OUT, 'captext.json'), JSON.stringify(cap))
        await run(PY, [path.join(DIR, 'lib', 'word_times.py'), path.join(OUT, 'captext.json'), path.join(OUT, 'voice')])
        wordTimes = JSON.parse(fs.readFileSync(path.join(OUT, 'voice', 'words.json'), 'utf8'))
      } catch (e) { console.warn(`  ! word timings unavailable (${e.message.split('\n')[0]}); captions use estimates`) }
    }
  } catch (e) {
    console.warn(`  ! Voice unavailable (${e.message}). Making the video with captions only.`)
  }
}
const est = s => s.split(/\s+/).length / (2.7 * cfg.voice_speed) + 0.2 // seconds, when there's no voice

// ---------------------------------------------------------------- 4. timeline + captions
const MIN = { hook: 4.2, pick: 7.0, slate: 5.0, cta: 4.4, rhook: 5.4, result: 4.6, rtotal: 6.2, pv_hook: 5.0, pv_form: 6.0, pv_stats: 7.0, pv_model: 7.5, pv_score: 5.5, pv_cta: 4.5, pv_stake: 6.0, pv_players: 8.0, pv_tactics: 8.0, pv_expect: 7.0, pv_round: 6.0,
  rv_hook: 4.0, rv_moment: 3.6, rv_meme: 3.0, rv_stats: 5.0, rv_read: 5.0, rv_table: 4.8, rv_ratings: 5.0, rv_quote: 4.5, rv_cta: 3.6, rx_intro: 3.0, rx_take: 4.0, rx_reveal: 3.4, rx_outro: 3.6, pm_hook: 3.4, pm_pick: 5.0, pm_tip: 5.0, pm_pass: 4.4, pm_slate: 4.6, pm_outro: 3.8 }
const LEAD = { hook: 0.2, rhook: 0.2, rv_hook: 0.75, rv_meme: 0.2, rv_moment: 0.25, rx_intro: 0.6, rx_take: 0.45, rx_reveal: 0.25, pm_hook: 0.6, pm_pick: 0.45, pm_tip: 0.45, pm_pass: 0.45, ex_cold: 0.35, ex_hook: 0.06, pv_cold: 0.35, rx_cold: 0.35, np_cold: 0.35, np_front: 0.8, np_timeline: 0.55, np_bench: 0.55, bp_cold: 0.35, bp_title: 0.9, ex_kh_cold: 0.35, ex_kh_seal: 0.9, ex_kh_peek: 0.85, ex_pt_cold: 0.35, ex_pt_title: 0.9, vr_cold: 0.35, vr_title: 0.9, gl_cold: 0.35, gl_title: 0.9, gl_match: 0.85, ar_cold: 0.35, ar_title: 0.9, ar_flight: 0.75, ar_board: 0.6, ar_end: 0.6, ex_nd_cold: 0.6, ex_nd_title: 0.9, ex_nd_whale: 0.5, ex_nd_bot: 0.5, ex_nd_crowd: 0.5, ex_nd_makers: 0.5, ex_nd_holder: 0.5, ex_nd_end: 0.5, ex_hy_cold: 0, ex_hy_reel: 0, ex_vx_cold: 0, ex_vx_reel: 0, en_cold: 0.35, en_title: 0.9, en_game: 0.7, en_end: 0.6, en_res: 0.9, en_board: 0.7, dw_cold: 0.35, dw_title: 0.9, dw_game: 1.0, dw_end: 0.6, dw_res: 0.9, dw_board: 0.7, ex_ax_cold: 0.35, ex_ax_title: 1.25, ex_ax_gap: 0.6, ex_ax_loop: 0.6, ex_ax_axes: 0.6, ex_ax_crowd: 0.6, ex_ax_proof: 0.6, ex_ax_sg: 0.6, ex_ax_lotus: 0.6, ex_ax_net: 0.6, ex_ax_end: 0.6 }, GAP = 0.12, TAIL = 0.3
const BEAT = music?.beat || null
let t = 0
const captions = []
scenes.forEach((sc, k) => {
  sc.start = t
  let st = t + (LEAD[sc.type] ?? (/^(np|bp|vr|gl|ar|en|dw)_/.test(sc.type) ? 0.5 : 0.32))      // newspaper, blueprint and review-room pages: the voice waits for the page to land
  sc.sentences = sc.say.map((x, j) => {
    const id = `s${k}_${j}`, text = shown(x), d = durs?.[id] ?? est(spoken(x))
    const s = { id, text, start: st, dur: d, wav: durs ? path.join(OUT, 'voice', `${id}.wav`) : null }
    // word timings: share the sentence by word length; captions of ≤5 words, broken at punctuation
    const words = text.split(/\s+/), weights = words.map(w => w.length + 2), W = weights.reduce((a, b) => a + b, 0)
    const wt = wordTimes?.[id]?.length === words.length ? wordTimes[id] : null      // measured on the recording, else shared by length
    let tw = st; const timed = words.map((w, i) => { if (wt) return { w, t0: st + wt[i][0], t1: st + wt[i][1] }; const t0 = tw; tw += d * weights[i] / W; return { w, t0, t1: tw } })
    let chunk = []
    timed.forEach((w, i) => {
      chunk.push(w)
      const end = i === timed.length - 1, brk = /[,.;:?!]$/.test(w.w) && chunk.length >= 2
      if (end || chunk.length >= 5 || brk) { captions.push({ start: chunk[0].t0, end: chunk.at(-1).t1, words: chunk }); chunk = [] }
    })
    st += d + GAP + (sc.data?.pauses?.[j] ?? 0)          // a beat can hold a dramatic pause after a line
    return s
  })
  let end = Math.max(t + (sc.hold ?? MIN[sc.type] ?? 4), st - GAP - (sc.data?.pauses?.[sc.say.length - 1] ?? 0) + (sc.data?.tail ?? TAIL))
  if (BEAT) end = Math.ceil((end - 0.02) / BEAT) * BEAT          // every cut lands on the beat
  sc.dur = end - t
  sc.lines = sc.sentences.map(s => [s.start - sc.start, s.dur])
  t = end
})
captions.forEach((c, i) => { const n = captions[i + 1]; c.end = n && n.start - c.end < 0.5 ? n.start : c.end + 0.3 })
const DURATION = t + 0.4
// a "drop" track: its drop lands on the cut into the scene `music_drop` names (cuts are on the beat, so the grid stays
// in phase), and the music stops just after the last line before it, so the drop hits out of silence
if (music?.drop != null && cfg.music_drop) {
  const k = cfg.music_drop === 'after_cold' ? scenes.findIndex(s => /_cold$/.test(s.type)) + 1 : scenes.findIndex(s => s.type === cfg.music_drop || s.type === 'ex_' + cfg.music_drop)
  if (k > 0) {
    music.start = music.drop - scenes[k].start
    const last = scenes[k - 1].sentences.at(-1)
    music.cuts = last ? [[last.start + last.dur + 0.03, scenes[k].start]] : cfg.music_gap ? [[scenes[k].start - cfg.music_gap, scenes[k].start]] : []     // no voice: a set gap of silence before the drop
    music.muffleUntil = scenes[k].start
    console.log(`Music drop at ${scenes[k].start.toFixed(2)}s (start of "${scenes[k].type}"), track from ${music.start.toFixed(2)}s`)
  }
}
console.log(`Video length: ${DURATION.toFixed(1)}s, ${captions.length} caption lines`)

// ---------------------------------------------------------------- 4b. reaction clips (post-match videos)
// Free Mixkit stock video (licence: free for commercial use, no credit needed; never broadcast match footage), cut to
// each screen's exact length as an image sequence the page shows frame by frame. fit "cover" fills the screen,
// "panel" is the 16:9 box under a meme caption. speed < 1 is slow motion.
if (cfg.mode === 'review') {
  const CLIPS = JSON.parse(fs.readFileSync(path.join(DIR, 'lib', 'clips.json'), 'utf8')).clips
  for (const [k, sc] of scenes.entries()) {
    const c = sc.data?.clip
    if (!c) continue
    const id = String(c.id ?? c), fit = c.fit || (sc.type === 'rv_meme' && sc.data.style !== 'pov' ? 'panel' : 'cover')
    if (!CLIPS.some(x => String(x.id) === id)) { console.error(`✗ Clip ${id} isn't in video/lib/clips.json. Only clips whose Mixkit page says "Stock Video Free License" may be used (check it, then add it).`); process.exit(3) }
    const src = await download(`https://assets.mixkit.co/videos/${id}/${id}-1080.mp4`, path.join(CACHE, 'clips', `${id}.mp4`))
    const dir = path.join(OUT, 'clips', `s${k}`); fs.mkdirSync(dir, { recursive: true })
    const [w, h] = fit === 'panel' ? [1080, 640] : [1080, 1920]
    const vf = `setpts=PTS/${c.speed || 1},fps=${FPS},scale=${w}:${h}:force_original_aspect_ratio=increase,crop=${w}:${h}`
    await run(FF, ['-y', '-loglevel', 'error', '-stream_loop', '-1', '-ss', String(c.from || 0), '-i', src, '-vf', vf, '-t', (sc.dur + 0.2).toFixed(2), '-q:v', '4', path.join(dir, '%04d.jpg')])
    sc.clip = { dir: `clips/s${k}`, n: fs.readdirSync(dir).length, fit }
  }
  console.log(`Reaction clips: ${scenes.filter(s => s.clip).length} screens`)
  // the presenter: a green-screen clip, keyed to transparent frames, bottom of the screen (the owner's own recording, or a
  // licensed stand-in). Each screen takes a different stretch of the clip so it never visibly repeats.
  const pc = cfg.presenter
  if (pc?.photo) {
    // a still photo of the presenter (already cut out, transparent background): the page adds breathing and a small
    // bounce on each spoken word
    const still = 'pres_photo' + path.extname(pc.photo)
    fs.copyFileSync(pc.photo, path.join(OUT, still))
    for (const sc of scenes) if (/^(rx|pm)_/.test(sc.type) && !/_cold$/.test(sc.type) && sc.data?.presenter !== false) sc.pres = { still }
  } else if (pc) {
    // one clip, or several angles of the same shoot (`clips`), used in turn screen by screen. `box: true` shows an unkeyed
    // studio clip in a framed "studio cam" panel instead of a green-screen cut-out.
    const cams = []
    for (const c of pc.clips || [pc]) {
      const src = /^\d+$/.test(String(c.id ?? '')) ? await download(`https://assets.mixkit.co/videos/${c.id}/${c.id}-1080.mp4`, path.join(CACHE, 'clips', `${c.id}.mp4`)) : c.file
      const len = Number(String(execSync(`"${FF}" -i "${src}" 2>&1 || true`)).match(/Duration: (\d+):(\d+):([\d.]+)/)?.slice(1).reduce((a, v, i) => a + v * [3600, 60, 1][i], 0) || 10)
      cams.push({ ...c, src, len, off: c.from || 0 })
    }
    let j = 0
    for (const [k, sc] of scenes.entries()) {
      if (!/^(rx|pm)_/.test(sc.type) || /_cold$/.test(sc.type) || sc.data?.presenter === false) continue     // no presenter in a cold open
      const c = cams[j++ % cams.length]
      if (c.off + sc.dur > c.len - 0.2) c.off = c.from || 0
      const dir = path.join(OUT, 'pres', `s${k}`); fs.mkdirSync(dir, { recursive: true })
      const vf = pc.box ? `${c.crop ? `crop=${c.crop},` : ''}scale=960:540,fps=${FPS}`
        : `${c.crop ? `crop=${c.crop},` : ''}scale=1080:-2,fps=${FPS},chromakey=${c.key || pc.key || '0x6CF514:0.14:0.06'},despill=type=green`
      await run(FF, ['-y', '-loglevel', 'error', '-ss', c.off.toFixed(2), '-i', c.src, '-t', (sc.dur + 0.1).toFixed(2), '-vf', vf, '-c:v', 'libwebp', '-quality', pc.box ? '82' : '75', path.join(dir, '%04d.webp')])
      sc.pres = { dir: `pres/s${k}`, n: fs.readdirSync(dir).length }
      c.off += sc.dur + 0.5
    }
  }
}

// ---------------------------------------------------------------- 4d. the owner's own screen recording in an explainer
// A beat's `rec: { file, from, to?, speed?, w? }` plays that stretch of the recording (slowed when speed < 1; the file is
// relative to the config) as an image sequence the page shows frame by frame (sc.rec). Frames are kept only while rendering.
if (cfg.mode === 'explainer') for (const [k, sc] of scenes.entries()) {
  const r = sc.data?.rec; if (!r?.file) continue
  const dir = path.join(OUT, 'rec', `s${k}`); fs.mkdirSync(dir, { recursive: true })
  const sp = r.speed || 1, from = r.from || 0, len = Math.min(sc.dur + 0.3, ((r.to ?? from + 1e4) - from) / sp)
  await run(FF, ['-y', '-loglevel', 'error', '-ss', String(from), '-i', path.resolve(path.dirname(path.resolve(input)), r.file), '-t', (len * sp).toFixed(2),
    '-vf', `setpts=PTS/${sp},fps=${FPS},scale=${r.w || 540}:-2`, '-c:v', 'libwebp', '-quality', '85', path.join(dir, '%04d.webp')])
  sc.rec = { dir: `rec/s${k}`, n: fs.readdirSync(dir).length }
}

// ---------------------------------------------------------------- 5. page
fs.cpSync(path.join(DIR, 'assets'), path.join(OUT, 'assets'), { recursive: true })
cfg.when_word ||= cfg.when === 'tonight' ? 'Tonight' : 'Today'
const DATA = { cfg, picks, recap, beat: BEAT, scenes: scenes.map(({ type, i, start, dur, lines, data, clip, pres, rec }) => ({ type, i, start, dur, lines, data, clip, pres, rec })), captions, duration: DURATION }
const page = fs.readFileSync(path.join(DIR, cfg.mode === 'review' ? 'review.html' : cfg.mode === 'explainer' ? 'explainer.html' : 'scene.html'), 'utf8')
  .replace('<script>\nconst D = window.DATA', `${scenes.some(s => /^ex_(vx|ax)_/.test(s.type)) ? '<script src="assets/three/three.min.js"></script>\n' : ''}${scenes.some(s => /^ex_ax_/.test(s.type)) ? '<script src="assets/geo/landdots.js"></script>\n' : ''}${scenes.some(s => /^gl_/.test(s.type)) ? ['d3-array.min.js', 'd3-geo.min.js', 'topojson-client.min.js', 'land-50m.js', 'countries-110m.js'].map(f => `<script src="assets/geo/${f}"></script>`).join('\n') + '\n' : ''}<script>window.DATA=${JSON.stringify(DATA).replace(/</g, '\\u003c')}</script>\n<script>\nconst D = window.DATA`)
fs.writeFileSync(path.join(OUT, 'index.html'), page)
const credits = [...(cfg.analysis?.players || []).map(x => x.photo?.credit), ...(cfg.analysis?.cold?.steps || []).map(x => x.photo?.credit), ...(cfg.review?.beats || []).map(b => b.photo?.credit), ...(cfg.review?.beats || []).flatMap(b => (b.items || []).map(it => it.photo?.credit)), ...new Set((cfg.review?.beats || []).flatMap(b => (b.photos || []).map(x => x.credit))), ...new Set(picks.flatMap(p => cfg.style === 'broadcast' ? [] : cfg.style === 'players' && p.players?.length ? p.players.map(x => x.credit) : [p.stadium?.credit]).filter(Boolean)), music?.credit, scenes.some(s => s.clip) ? 'Reaction clips: Mixkit (free licence)' : null, cfg.presenter?.credit || null].filter((c, i, all) => c && all.indexOf(c) === i)      // each credit once
fs.writeFileSync(path.join(OUT, 'credits.txt'), credits.join('\n') + '\n')

const { chromium } = loadPlaywright()
async function openPage() {
  const browser = await chromium.launch({ args: ['--allow-file-access-from-files', '--force-color-profile=srgb'] })
  const pg = await browser.newPage({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 1 })
  pg.on('pageerror', e => console.error('  page error:', e.message))
  await pg.goto('file://' + path.join(OUT, 'index.html'))
  await pg.evaluate(() => window.ready)
  const cdp = await pg.context().newCDPSession(pg)
  const shot = async () => Buffer.from((await cdp.send('Page.captureScreenshot', { format: 'png', optimizeForSpeed: true })).data, 'base64')
  return { browser, pg, shot }
}

// ---------------------------------------------------------------- monetisation check (match previews for X / YouTube)
// Every word on screen and in the voiceover is read; any betting term stops the render.
const BANNED = /\b(odds|bets?|betting|bettors?|bookies?|bookmakers?|stakes?|staking|wagers?|tips|tipsters?|picks|value bets?|booking codes?|bet ?slips?|accumulators?|accas?|bankers?|sure (?:win|bet)|guaranteed?|fixed match(?:es)?|sportybet|bet9ja|1xbet|betway|bet365|naira|cmvngpicks(?:\.com)?|payouts?|risk[- ]free|handicap|over\/under)\b|₦/gi
async function complianceCheck() {
  const { browser, pg } = await openPage()
  const seen = new Set()
  for (const sc of scenes) {
    await pg.evaluate(x => window.renderAt(x), sc.start + Math.max(0.1, sc.dur - 0.35))
    for (const line of (await pg.evaluate(() => document.getElementById('stage').innerText)).split('\n')) seen.add(line.trim())
  }
  await browser.close()
  for (const x of sentences) seen.add(x.text)
  for (const sc of scenes) for (const x of sc.say) seen.add(shown(x))
  const hits = [...seen].filter(Boolean).flatMap(t => [...t.matchAll(BANNED)].map(m => `"${m[0]}" in: ${t.slice(0, 90)}`))
  // house style: it's "the analysis", never "the AI Analyst" (the owner finds it cringe and low effort)
  const style = [...seen].filter(t => /\bA\.?I\.?\s+analysts?\b|\bA\.?I\.?\s+analysts?'s?\b/i.test(t || ''))
  if (style.length) {
    console.error(`\n✗ House style: don't call it "AI Analyst". Say "the analysis" instead:\n  - ${style.map(t => t.slice(0, 90)).join('\n  - ')}`)
    process.exit(3)
  }
  if (hits.length && !flag('allow-words', false)) {
    console.error(`\n✗ Not monetisation-safe: betting words found in the preview\n  - ${[...new Set(hits)].join('\n  - ')}\nReword the script/analysis (or pass --allow-words to render anyway).`)
    process.exit(3)
  }
  console.log(`Monetisation check: passed (${seen.size} lines of on-screen text and voiceover, no betting terms)`)
}
// tips videos ("tips": true) aren't for monetised X / YouTube, so they skip the betting-word check
if (['preview', 'review', 'explainer'].includes(cfg.mode) && cfg.tips !== true) await complianceCheck()

// ---------------------------------------------------------------- stills (preview)
if (stills) {
  const { browser, pg, shot } = await openPage()
  fs.mkdirSync(path.join(OUT, 'stills'), { recursive: true })
  const times = stills === true ? scenes.map(s => s.start + s.dur - 0.25) : String(stills).split(',').map(Number)
  for (const tt of times) {
    await pg.evaluate(x => window.renderAt(x), tt)
    fs.writeFileSync(path.join(OUT, 'stills', `t_${tt.toFixed(2)}.png`), await shot())
  }
  await browser.close()
  console.log(`Stills saved in ${path.join(OUT, 'stills')}`)
  console.log(scenes.map(s => `  ${s.type.padEnd(7)} ${s.start.toFixed(2)}–${(s.start + s.dur).toFixed(2)}`).join('\n'))
  process.exit(0)
}

// ---------------------------------------------------------------- 6. render frames in parallel
const FRAMES = Math.ceil(DURATION * FPS)
const per = Math.ceil(FRAMES / WORKERS)
const t0 = Date.now()
let done = 0, fx = []
console.log(`Rendering ${FRAMES} frames with ${WORKERS} workers…`)
await Promise.all(Array.from({ length: WORKERS }, async (_, w) => {
  const a = w * per, b = Math.min(FRAMES, a + per)
  if (a >= b) return
  let p = await openPage(), since = 0
  if (w === 0) fx = await p.pg.evaluate(() => window.fxEvents())
  const ff = spawn(FF, ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(FPS), '-i', '-',
    '-c:v', 'libx264', '-preset', 'medium', '-crf', '20', '-maxrate', '12M', '-bufsize', '24M', '-pix_fmt', 'yuv420p', '-r', String(FPS), path.join(OUT, `seg_${w}.mp4`)], { stdio: ['pipe', 'inherit', 'inherit'] })
  // Headless Chromium's compositor can crash after a few hundred frames of heavy filters (6 Oct, the newspaper
  // review): open a fresh browser every 400 frames, and on a crash relaunch and retry the frame (twice at most).
  for (let f = a; f < b; f++) {
    let png
    for (let tries = 0; !png; tries++) {
      try {
        if (since >= 400) { await p.browser.close().catch(() => {}); p = await openPage(); since = 0 }
        await p.pg.evaluate(x => window.renderAt(x), f / FPS)
        png = await p.shot(); since++
      } catch (e) {
        if (tries >= 2) throw new Error(`frame ${f} (${(f / FPS).toFixed(2)}s) keeps crashing the browser: ${e.message}`)
        console.log(`  browser crashed at ${(f / FPS).toFixed(2)}s (${e.message.split('\n')[0]}); relaunching`)
        await p.browser.close().catch(() => {}); p = await openPage(); since = 0
      }
    }
    if (!ff.stdin.write(png)) await new Promise(r => ff.stdin.once('drain', r))
    if (++done % 300 === 0) console.log(`  ${done}/${FRAMES} frames · ${((Date.now() - t0) / 1000).toFixed(0)}s`)
  }
  ff.stdin.end(); await new Promise(r => ff.on('close', r)); await p.browser.close()
}))

// ---------------------------------------------------------------- 7. sound + final file
const segs = Array.from({ length: WORKERS }, (_, w) => path.join(OUT, `seg_${w}.mp4`)).filter(f => fs.existsSync(f))
fs.writeFileSync(path.join(OUT, 'segments.txt'), segs.map(f => `file '${f}'`).join('\n'))
const final = flag('out', null) || path.join(OUT, `${slug}.mp4`)
fs.writeFileSync(path.join(OUT, 'timeline.json'), JSON.stringify({
  duration: DURATION, sentences: durs ? scenes.flatMap(s => s.sentences) : [], fx,
  music: music ? { file: music.file, start: music.start, ...(music.drop != null ? { ref: 'loud', duck: cfg.music_duck ?? 8, level: cfg.music_level ?? 0, cuts: music.cuts || [], loop: music.loop } : {}),
    ...(cfg.music_muffle && music.muffleUntil ? { muffle: { until: music.muffleUntil, hz: cfg.music_muffle.hz ?? 700, db: cfg.music_muffle.db ?? 0 } } : {}) } : null,     // the build sounds far away until the drop
  ...(cfg.sound === 'cinematic' ? { limiter: 'peak' } : {}),
}))
await run(PY, [path.join(DIR, 'audio.py'), 'mix', path.join(OUT, 'timeline.json'), path.join(OUT, 'mix.wav')])
// the master: loudness, band-limit, then a limiter at -5 dBFS (sharp hits made the AAC encoder overshoot to +5 dBTP on 6 Oct)
await run(FF, ['-y', '-loglevel', 'error', '-i', path.join(OUT, 'mix.wav'), '-af', 'loudnorm=I=-14:TP=-1.5:LRA=9,aresample=48000,lowpass=f=16000:poles=2,alimiter=limit=0.56:level=0',
  '-c:a', 'pcm_f32le', path.join(OUT, 'master.wav')])
await run(FF, ['-y', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', path.join(OUT, 'segments.txt'), '-i', path.join(OUT, 'master.wav'), '-map', '0:v', '-map', '1:a',
  '-c:v', 'copy', '-c:a', 'aac', '-b:a', '192k', '-ar', '48000', '-ac', '2', '-t', DURATION.toFixed(2), '-movflags', '+faststart', final])
// the AAC encoder can still overshoot on one frame of hard, clipped music (+4 dBTP on 8 Oct): measure, and re-encode until under -1
await run(PY, [path.join(DIR, 'lib', 'fix_tp.py'), final, path.join(OUT, 'master.wav'), '192'])
for (const f of segs) fs.rmSync(f)
fs.rmSync(path.join(OUT, 'clips'), { recursive: true, force: true })      // clip frames are only needed while rendering
fs.rmSync(path.join(OUT, 'pres'), { recursive: true, force: true })
fs.rmSync(path.join(OUT, 'rec'), { recursive: true, force: true })
// subtitles (.srt) for YouTube / X: the caption text (real names and digits, not the voice's respellings), timed to the voice
if (durs) {
  const ts = t => { const ms = Math.round(t * 1000), h = Math.floor(ms / 3600000), m = Math.floor(ms / 60000) % 60, s = Math.floor(ms / 1000) % 60
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')},${String(ms % 1000).padStart(3, '0')}` }
  const cards = []
  scenes.forEach(sc => (sc.sentences || []).forEach((se, j) => {
    const text = shown(sc.say[j] ?? '').trim(); if (!text || se.start == null) return
    const chunks = []; let cur = []
    for (const w of text.split(/\s+/)) { cur.push(w); if (cur.join(' ').length > 42 && (/[,.:;!?]$/.test(w) || cur.length >= 8)) { chunks.push(cur.join(' ')); cur = [] } }
    if (cur.length) chunks.push(cur.join(' '))
    const total = chunks.reduce((a, c) => a + c.length, 0); let t = se.start
    for (const c of chunks) { const d = se.dur * c.length / total; cards.push(`${cards.length + 1}\n${ts(t)} --> ${ts(t + d)}\n${c}\n`); t += d }
  }))
  fs.writeFileSync(final.replace(/\.mp4$/, '.srt'), cards.join('\n'))
}
// cover image for the YouTube / X thumbnail: the opening screen once everything has landed
const cover = final.replace(/\.mp4$/, '_cover.jpg')
await run(FF, ['-y', '-loglevel', 'error', '-ss', Math.max(0, scenes[0].start + scenes[0].dur - 0.4).toFixed(2), '-i', final, '-frames:v', '1', '-q:v', '2', cover]).catch(() => {})
console.log(`\nDone in ${((Date.now() - t0) / 1000).toFixed(0)}s → ${final}`)
console.log(`Post caption (the voiceover script): ${path.join(OUT, 'script.txt')}`)
console.log(`Credits to paste in the post: ${path.join(OUT, 'credits.txt')}`)
if (fs.existsSync(final.replace(/\.mp4$/, '.srt'))) console.log(`Subtitles: ${final.replace(/\.mp4$/, '.srt')}`)
if (fs.existsSync(cover)) console.log(`Cover image (thumbnail): ${cover}`)
