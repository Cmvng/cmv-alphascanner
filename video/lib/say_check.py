# Pronunciation check, before the voice is recorded: every unusual word in the script, spelled the way the voice will
# actually say it, with the stressed syllable in capitals ("Ethereum  ee-thur-REE-um" was the 6 Oct mistake; it should
# read "ih-THIH-ree-um"). Speech-to-text can't catch a wrong stress: it writes "Ethereum" either way. So read this list
# and fix any word that looks wrong with an IPA entry in SAY_IPA (lib/narration.mjs).
#
# usage: python3 video/lib/say_check.py <sentences.json> [models_dir]   (make-video.mjs --say-check runs it for you)
import json, os, re, sys

COMMON = set('''a about after again all also always an and another any anyone are as at back be because been before
being best between big both but by came can come comes could day did do does doesn't don't down each even ever every
first five for four from get gets go goes going good got had has have he her here him his how i if in into is it its
it's just know last let like look looks made make many may me mean means more most much must my never new next no not
now nobody of off on one only open or other our out over own people plus put read right said same say says see sees
seen she should show side small so some still such take than that that's the their them then there these they thing
think this those three through time to today too two under until up us use used very want was way we well were what
when where which while who why will with without would yes yet you your'''.split())
STRESS = 'ˈˌ'
VOWELS = ['eɪ', 'aɪ', 'ɔɪ', 'aʊ', 'oʊ', 'iː', 'uː', 'ɑː', 'ɔː', 'ɜː', 'ɪə', 'ɛə', 'ʊə', 'ɚ', 'ə', 'ɐ', 'ᵻ', 'ɪ', 'ɛ',
          'æ', 'ʌ', 'ʊ', 'i', 'u', 'ɑ', 'ɔ', 'o', 'e', 'a', 'ɜ']
SPELL_V = {'eɪ': 'ay', 'aɪ': 'eye', 'ɔɪ': 'oy', 'aʊ': 'ow', 'oʊ': 'oh', 'iː': 'ee', 'i': 'ee', 'uː': 'oo', 'u': 'oo',
           'ɑː': 'ah', 'ɑ': 'ah', 'ɔː': 'aw', 'ɔ': 'aw', 'ɜː': 'ur', 'ɜ': 'ur', 'ɚ': 'er', 'ə': 'uh', 'ɐ': 'uh', 'ᵻ': 'ih',
           'ɪ': 'ih', 'ɛ': 'eh', 'æ': 'a', 'ʌ': 'u', 'ʊ': 'uu', 'ɪə': 'eer', 'ɛə': 'air', 'ʊə': 'oor', 'o': 'oh', 'e': 'eh',
           'a': 'a'}
SPELL_C = {'tʃ': 'ch', 'dʒ': 'j', 'θ': 'th', 'ð': 'dh', 'ʃ': 'sh', 'ʒ': 'zh', 'ŋ': 'ng', 'ɹ': 'r', 'ɾ': 't', 'j': 'y',
           'ɡ': 'g', 'ʔ': '', 'ɬ': 'l', 'x': 'kh', 'ç': 'h', 'ɲ': 'ny', 'ʎ': 'ly', 'ɫ': 'l', 'ː': '', 'ʲ': ''}


def respell(ipa):
    """IPA -> 'ih-THIH-ree-um': one chunk per vowel, the stressed one in capitals."""
    toks, i, s = [], 0, ipa.replace('ˑ', '')
    while i < len(s):
        if s[i] in STRESS: toks.append(('S', s[i])); i += 1; continue
        v = next((v for v in VOWELS if s.startswith(v, i)), None)
        if v: toks.append(('V', v)); i += len(v); continue
        c = next((c for c in ('tʃ', 'dʒ') if s.startswith(c, i)), s[i])
        if c.strip(): toks.append(('C', c))
        i += len(c)
    syl, cur, stress, pend = [], [], None, None
    for k, t in toks:
        if k == 'S': pend = t; continue
        if k == 'V':
            cur.append(t); syl.append((cur, pend)); cur, pend = [], None
        else:
            cur.append(t)
    if cur:
        if syl: syl[-1][0].extend(cur)
        else: syl.append((cur, pend))
    # move the consonant just before each vowel to that vowel's syllable start (it already is: onsets come first)
    out = []
    for parts, st in syl:
        txt = ''.join(SPELL_V.get(p) or SPELL_C.get(p, p) for p in parts)
        out.append(txt.upper() if st == 'ˈ' else txt)
    return '-'.join(out)


def main():
    src = sys.argv[1]
    models = sys.argv[2] if len(sys.argv) > 2 else os.path.join(os.path.dirname(__file__), '..', '.cache', 'kokoro')
    from kokoro_onnx import Kokoro
    k = Kokoro(os.path.join(models, 'kokoro-v1.0.onnx'), os.path.join(models, 'voices-v1.0.bin'))
    items = json.load(open(src))
    seen, fixed, guessed = set(), [], []
    for it in items:
        t = it['text']
        for m in re.finditer(r'\[([^\]]+)\]\(/([^/)]+)/\)', t):          # words with an exact pronunciation
            if m.group(1) not in seen: seen.add(m.group(1)); fixed.append((m.group(1), m.group(2)))
        plain = re.sub(r'\[([^\]]+)\]\(/[^/)]+/\)', ' ', t)
        for w in re.findall(r"[A-Za-zÀ-ÿ][A-Za-zÀ-ÿ'’.-]*[A-Za-zÀ-ÿ]|[A-Z]", plain):
            w = w.strip("'’.-")
            if not w or w in seen or w.lower() in COMMON: continue
            unusual = (w[0].isupper() and len(w) > 1) or w.isupper() or len(w) >= 9 or not w.isascii() or re.search(r'[-.]', w)
            if not unusual: continue
            seen.add(w); guessed.append((w, k.tokenizer.phonemize(w, 'en-us').strip()))
    print('PRONUNCIATION CHECK (stressed syllable in CAPITALS; fix a wrong one with SAY_IPA in lib/narration.mjs)')
    print('\n  Set by hand (SAY_IPA):')
    for w, p in sorted(fixed, key=lambda x: x[0].lower()): print(f'    {w:22s} {respell(p):28s} /{p}/')
    print('\n  Guessed by the voice (check each one):')
    for w, p in sorted(guessed, key=lambda x: x[0].lower()): print(f'    {w:22s} {respell(p):28s} /{p}/')


if __name__ == '__main__':
    main()
