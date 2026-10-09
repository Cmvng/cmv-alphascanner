// Writes the voiceover from the picks data, the way a presenter would say it. Every number comes from
// the data; nothing is invented. No "sure", "banker", "guaranteed" or "fixed": predictions, not promises.
// Each line is { say, show }: what the voice says and what the caption shows (digits, the web address).

const WORDS = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten']
const word = n => WORDS[n] ?? String(n)
const Cap = s => s[0].toUpperCase() + s.slice(1)
const odds = v => v.toFixed(2)
const DIG = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine']
const TEENS = ['ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen']
const TENS = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety']
const num = n => n < 10 ? DIG[n] : n < 20 ? TEENS[n - 10] : TENS[Math.floor(n / 10)] + (n % 10 ? '-' + DIG[n % 10] : '')
// 1.28 → "one point two eight" (the voice reads digits after a point one by one, like punters do)
const oddsSay = v => { const [a, b] = v.toFixed(2).split('.'); return `${num(+a)} point ${DIG[+b[0]]}${b[1] !== '0' ? ' ' + DIG[+b[1]] : ''}` }
const money = v => Math.round(v).toLocaleString('en-US')
const pct = v => Math.round(v)
// how the voice should say names it gets wrong (captions keep the real spelling). Add to this as you find them;
// a pick can also carry "say_home" / "say_away".
const SAY_NAMES = {
  Ikorodu: 'Eekorodoo', Remo: 'Raymo', Kano: 'Kahno', Lobi: 'Lobee', Leicester: 'Lester',
  Platense: 'Plaht-en-seh', Estudiantes: 'Estoo-dee-antes', CONCACAF: 'Konkakaff',
  Tzolis: 'Tzo-lis', Toumba: 'Toom-ba', Xavi: 'Shah-vee', 'Mörschel': 'Mer-shel', 'Badía': 'Ba-dee-ah', Cozzani: 'Koh-zah-nee', Mainero: 'My-neh-ro',
  'Højlund': 'Hoy-lund', Damsgaard: 'Dams-gore', 'Gonçalo': 'Gon-sah-lo', 'Leão': 'Lay-ow', 'Jürgen': 'Yurgen', Vitinha: 'Vee-teen-ya', Haaland: 'Hah-land', 'Ødegaard': 'Oh-deh-gord', 'Vlahović': 'Vla-ho-vitch', 'Musiala': 'Moo-see-ah-la', 'Atlético': 'Atleteeko', Gaich: 'Gaheech', 'Martínez': 'Mar-teen-ez', Veiga: 'Vay-ga', Reijnders: 'Rye-nders', 'Türkiye': 'Tur-kee-yeh', Polymarket: 'Polly-market',
  'Džeko': 'Jecko', 'Gyökeres': 'Yerkeress', Sergej: 'Ser-gay', Barbarez: 'Bar-bah-rez', 'Bîrligea': 'Beer-lee-jah', Gheorghe: 'George-eh', Hagi: 'Hah-jee',
  Romelu: 'Ro-meh-loo', Lukaku: 'Loo-kah-koo', 'Barış Alper Yılmaz': 'Bah-rish Al-per Yil-maz', 'Liège': 'Lee-ezh', Sclessin: 'Skleh-san', Zenica: 'Zeh-nitsa',
  Zinedine: 'Zee-neh-deen', Olise: 'Oh-leese', 'Pio Esposito': 'Pee-yo Esposeeto', Esposito: 'Esposeeto', Meazza: 'Meh-atza', 'Doué': 'Doo-ay', Cherki: 'Sher-kee',
  'Çalhanoğlu': 'Chal-han-oh-loo', 'Kökçü': 'Kerk-choo',
  USDC: 'U S D C', PvP: 'P V P',   Rijeka: 'Ree-yeh-ka', 'Modrić': 'Mod-ritch', 'Kovačić': 'Ko-va-chitch', Xhaka: 'Jah-ka', Gvardiol: 'Gvar-dee-ol', 'Šulc': 'Shults', Oviedo: 'Oh-vee-ay-doh',
  Rivne: 'Reev-neh', Kudrivka: 'Koo-driv-ka', 'Lanús': 'Lah-noos', Czechia: 'Check-ee-a', Justicia: 'Hoos-tee-see-a',   'Alajbegović': 'Ala-ee-beh-go-vitch', 'Adžić': 'Ad-jitch', Kakoullis: 'Ka-koo-lis', Konomis: 'Ko-no-mis', 'De Bruyne': 'De Broyne', 'Zieliński': 'Jeh-lin-ski', 'Drăgușin': 'Dra-goo-sheen', Kerkez: 'Ker-kez', Upamecano: 'Oo-pa-meh-cano', Zirkzee: 'Zirk-zay', Ajer: 'Ah-yer',
  Tielemans: 'Tee-luh-mahns', Godts: 'Gots', Sikan: 'See-kan', Trnava: 'Turn-ava',
  'Saint-Denis': 'San Deh-nee', 'Lukébakio': 'Loo-keh-bah-kee-oh', Calafiori: 'Kala-fee-oh-ree', Yaremchuk: 'Yah-rem-chook',
}
// exact pronunciations (IPA, as the voice's phonemizer writes it): spoken as written, one stress per name. Respellings with
// hyphens stress every syllable ("Doo-ay" came out doo-EYE), so names the phonemizer gets wrong go here
const SAY_IPA = {
  Olise: 'oʊlˈiːz', Cherki: 'ʃɛɹkˈiː', Rayan: 'ɹɑːjˈɑːn', 'Doué': 'dwˈeɪ', 'Désiré': 'dˌeɪziɹˈeɪ', Zidane: 'ziːdˈɑːn',
  'Zinédine': 'zˌiːnədˈiːn', 'Lukébakio': 'lˌuːkeɪbˈɑːkioʊ', Calafiori: 'kˌɑːləfjˈɔːɹi', Esposito: 'ɛspˈɔːzitoʊ',
  'Gyökeres': 'jˈøːkɛɹɛʃ', 'Saint-Denis': 'sˈæn dənˈiː', Trnava: 'tˈɜːɹnəvə', 'Türkiye': 'tˈʊɹkiːjɛ', Yaremchuk: 'jˌɑːɹɛmtʃˈuːk',
  Csinger: 'tʃˈɪŋɡɛɹ', Vandevoordt: 'vˌɑːndəvˈoːɹt',
  Vitinho: 'viːtʃˈiːnjuː', Diniz: 'dʒiːnˈiːs', Imanol: 'iːmˈɑːnoʊl', Baz: 'bˈɑːz', Bandez: 'bˈɑːndɛs', Tapia: 'tˈɑːpjə', 'Luís': 'luːˈiːs', Chile: 'tʃˈiːleɪ', KuPS: 'kˈuːps', Atef: 'ˈɑːtɛf', 'André': 'ɑːndɹˈɛ',
  'Modrić': 'mˈɔːdɹɪtʃ', Budimir: 'bˈuːdɪmiːɹ', 'Smolčić': 'smˈɔːltʃɪtʃ', 'Bilić': 'bˈiːlɪtʃ', Poljud: 'pˈɔːljuːd', Lamine: 'lɐmˈiːn',
  Yamal: 'jɐmˈɑːl', 'Krejčí': 'kɹˈeɪtʃiː', Czechia: 'tʃˈɛkiə', Ante: 'ˈɑːnteɪ',
  Cluj: 'klˈuːʒ', Cordea: 'kɔːɹdˈeɪɑː', 'Drăzić': 'dɹˈʌzɪtʃ', Universitatea: 'uːnˌiːvɛɹsiːtˈɑːtjɑː', "Universitatea's": 'uːnˌiːvɛɹsiːtˈɑːtjɑːz', Thimphu: 'tˈɪmpuː', Paro: 'pˈɑːɹoʊ',
  Nassaji: 'nɑːsˈɑːdʒi', Zob: 'zˈoʊb', Ahan: 'ɑːhˈɑːn', Daghighi: 'dɑːɡiːɡˈiː', Saeid: 'sɑːˈiːd', Farshid: 'fɑːɹʃˈiːd', Esmaeili: 'ɛsmɑːiːlˈiː',
  ES: 'ˌiːˈɛs', Iran: 'ɪɹˈɑːn',
  'Ivić': 'ˈiːvɪtʃ', 'Lukić': 'lˈuːkɪtʃ', 'Al-Hourani': 'ˌælhuːɹˈɑːni', Mulongo: 'muːlˈɔŋɡoʊ', Usama: 'uːsˈɑːmɑː', Houssine: 'huːsˈiːn',
  Rahimi: 'ɹɑːhˈiːmi', Issouf: 'iːsˈuːf', Macalou: 'mɑːkɑːlˈuː', Oucasse: 'uːkˈɑːs', Baldeh: 'bˈɑːldɛ', Karisa: 'kɑːɹˈiːsɑː',
  Ghoddos: 'ɡoʊdˈɔːs', Jafari: 'dʒæfɑːɹˈiː', Abdollah: 'æbdɔːlˈɑː', Lukindo: 'luːkˈiːndoʊ', Hadi: 'hˈɑːdi', Saman: 'sɑːmˈɑːn',
  Burcă: 'bˈuːɹkə', Ovidiu: 'oʊvˈiːdjuː', Częstochowa: 'tʃɛnstɔhˈoʊvɑː', Tripić: 'tɹˈiːpɪtʃ', Wisła: 'vˈiːswɑː', Płock: 'pwˈɔtsk', Wieczysta: 'vjɛtʃˈɪstɑː', Zlín: 'zlˈiːn', Zlatko: 'zlˈɑːtkoʊ', Kraków: 'kɹˈɑːkuːf', Raków: 'ɹˈɑːkuːf', Katowice: 'kɑːtɔvˈiːtsɛ', Koulouris: 'kuːlˈuːɹɪs', Efthymis: 'ɛfθˈiːmɪs', Shkurin: 'ʃkˈuːɹɪn', Ilya: 'ˈɪljɑː', "Bosz's": 'bˈɔsɪz', Bosz: 'bˈɔs', Bergen: 'bˈɛɹɡən', Bodø: 'bˈuːdɜː', Brann: 'bɹˈɑːn', Heerenveen: 'hˈɛɹənveɪn', Eindhoven: 'ˈaɪnthoʊvən', Lens: 'lˈɑːns', Lyon: 'liːˈɔːn', Bollaert: 'bɔlˈɑːɹ', "Cahuzac's": 'kɑːuːzˈæks', "Fonseca's": 'fɔnsˈɛkəz', Espanyol: 'ɛspænjˈɔl', "Espanyol's": 'ɛspænjˈɔlz', Málaga: 'mˈɑːlɑːɡɑː', Fernández: 'fɛɹnˈɑːndɛs', Roberto: 'ɹoʊbˈɛɹtoʊ', Rodrigo: 'ɹoʊdɹˈiːɡoʊ', Zalazar: 'sɑːlɑːsˈɑːɹ', Suárez: 'swˈɑːɹɛs', Luis: 'luːˈiːs', "Lage's": 'lˈɑːʒɪz', Lage: 'lˈɑːʒ', Nassr: 'nˈɑːsɚ', Riyadh: 'ɹiːjˈɑːd', Diriyah: 'dɪɹˈiːjɑː', Dinamo: 'diːnˈɑːmoʊ', Instituto: 'iːnstiːtˈuːtoʊ', Córdoba: 'kˈɔːɹdoʊbɑː', Kempes: 'kˈɛmpɛs', Valencia: 'vɑːlˈɛnsiɑː', Yannick: 'jɑːnˈiːk', Paulo: 'pˈaʊloʊ',
  TRA: 'tˌiːɑːɹˈeɪ', Namungo: 'nɑːmˈuːŋɡoʊ', Ruangwa: 'ɹuːˈɑːŋɡwɑː', Tabora: 'tɑːbˈɔːɹɑː', 'Sétif': 'seɪtˈiːf', Oran: 'ɔːɹˈɑːn', Hoima: 'hˈɔɪmɑː', Bergodi: 'bɛɹɡˈoʊdi',
  Zamalek: 'zˈæməlɛk', Ibadan: 'iːbˈɑːdɑːn', Belouizdad: 'bɛluːizdˈæd', Khenchela: 'kɛnʃˈɛlə', Etouga: 'ɛtˈuːɡɑː', Gnistan: 'ɡnˈiːstɑːn', Mirassol: 'mˌiːɹəsˈɔːl',
  Paulista: 'paʊlˈiːstə', Universidad: 'uːnˌiːvɛɹsiːdˈɑːd', Antofagasta: 'ˌɑːntoʊfəɡˈɑːstə', Cartagena: 'kˌɑːɹtəhˈeɪnə', Murcia: 'mˈɜːsiə',
  Inter: 'ˈɪntɚ', Internacional: 'ˌɪntɚnˌæsiːoʊnˈɑːl', Alberto: 'ɑːlbˈɛɹtoʊ', Baptista: 'bæptˈiːstə', Musa: 'mˈuːsə', Ahmed: 'ˈɑːmɛd', Alegre: 'ɐlˈɛɡɹɪ',
  IK: 'ˌaɪkˈeɪ', Niger: 'niːʒˈɛɹ', Montserrat: 'mˌɑːntsəɹˈæt',
  'Perišić': 'pˈɛɹɪʃɪtʃ', Merino: 'mɛɹˈiːnoʊ', Mikel: 'mˈiːkɛl', Zubimendi: 'zˌuːbiːmˈɛndi', Coufal: 'tsˈoʊfɑːl', 'Simón': 'siːmˈoʊn', Unai: 'uːnˈaɪ',
  Raufoss: 'ɹˈaʊfɔs', 'Trollhättan': 'tɹˈɔlhɛtən', 'Mjällby': 'mjˈɛlbi', 'Hložek': 'hlˈɔʒɛk', Neghiz: 'nɛɡˈiːz', Kazakhstan: 'kˌæzəkstˈæn',
  // crypto words the phonemizer gets wrong (checked 6 Oct: it said "ee-ther-REE-um", dropped the s in "NFTs",
  // "MEM-i-coin", "VY-ta-lik", "duh-fy", and read ERC and FHEVM as words)
  Ethereum: 'ɪθˈɪɹiəm', NFTs: 'ˌɛnˌɛftˈiːz', homomorphic: 'hˌoʊmoʊmˈɔːɹfɪk', memecoin: 'mˈiːmkɔɪn',
  memecoins: 'mˈiːmkɔɪnz', Vitalik: 'vɪtˈɑːlɪk', DeFi: 'dˈiːfaɪ', FHEVM: 'ˌɛfˌeɪtʃˌiːvˌiːˈɛm', ERC: 'ˌiːˌɑːɹsˈiː',
  Binance: 'bˈaɪnæns', Lido: 'lˈiːdoʊ', Aave: 'ˈɑːveɪ', Nakamoto: 'nˌɑːkəmˈoʊtoʊ', Satoshi: 'sətˈoʊʃi',
  // Axis (Robotics): the plain /ˈæksɪs/ was heard as "Access" three times out of three (9 Oct); a reduced second vowel fixes it
  Axis: 'ˈæksᵻs',
  // "datasets" with a flapped t (DAY-ruh-sets) was heard as "deer sets" through the deep voice (9 Oct); a hard t is clear
  datasets: 'dˈeɪtəsˌɛts', dataset: 'dˈeɪtəsˌɛt',
  // 9 Oct post-match ("As-Built"): the phonemizer said a-ZBILT, KOW-awl-kzik, NOH-ak, BAR-tahsz, PAS-kyoo-ul, KOH-mun
  'As-Built': 'æz bˈɪlt', Ayaosi: 'ˌɑːjɑːˈoʊsi', Bartosz: 'bˈɑːɹtɔʃ', Borja: 'bˈɔːɹhɑː', Christiansen: 'kɹˈɪstʃənsən',
  Coman: 'kɔːmˈɑːn', 'Galán': 'ɡɑːlˈɑːn', Kowalczyk: 'kɔvˈɑːltʃɪk', 'Lukáš': 'lˈuːkɑːʃ', 'Martín': 'mɑːɹtˈiːn',
  Mateusz: 'mɑːtˈɛuːʃ', Nowak: 'nˈɔvɑːk', Pascual: 'pɑːskwˈɑːl', 'Piazón': 'piːɑːzˈoʊn', 'Samú': 'sɑːmˈuː',
  Semedo: 'sɛmˈɛdu', Askildsen: 'ˈɑːskɪlsən', Guus: 'ɡˈuːs', VAR: 'vˌiːˌeɪˈɑːɹ',
  Thauvin: 'toʊvˈæn', Sotoca: 'soʊtˈoʊkɑː', Udol: 'uːdˈɔːl', Matthieu: 'mætjˈɜː',
}
const IPA_RE = new RegExp(`(?<!\\p{L})(${Object.keys(SAY_IPA).join('|')})(['’]s)?(?!\\p{L})`, 'gu')
// letter-aware edges: \b treats accented letters as non-letters, so "Doué" or "Çalhanoğlu" would never match
const NAME_RE = new RegExp(`(?<!\\p{L})(${Object.keys(SAY_NAMES).join('|')})(?!\\p{L})`, 'gu')
const IPA_KEYS = Object.keys(SAY_IPA)
// a possessive keeps its sound: "Czechia's" was read "Czechia… es" (6 Oct), so the 's joins the IPA (s, z or ɪz by the last sound)
const possessive = ipa => /(s|z|ʃ|ʒ|tʃ|dʒ)$/.test(ipa) ? ipa + 'ᵻz' : /(p|t|k|f|θ)$/.test(ipa) ? ipa + 's' : ipa + 'z'
const speakNames = t => t.replace(IPA_RE, (w, name, s) => `\u0000${IPA_KEYS.indexOf(name)}${s ? 's' : ''}\u0001`).replace(NAME_RE, w => SAY_NAMES[w])
  .replace(/\u0000(\d+)(s?)\u0001/g, (_, j, s) => `[${IPA_KEYS[+j]}${s ? "'s" : ''}](/${s ? possessive(SAY_IPA[IPA_KEYS[+j]]) : SAY_IPA[IPA_KEYS[+j]]}/)`)
const L = (say, show = say) => ({ say: speakNames(say), show })

// A written script uses digits like a person would ("at 1.57", "under 1.5 goals", "68%"); this turns them
// into what the voice should say ("at one point five seven", "under one and a half goals", "68 percent").
export function speakify(t) {
  return t
    .replace(/\b(over|under)\s+(\d)\.5\b/gi, (_, ou, n) => `${ou} ${n === '0' ? 'half a' : num(+n) + ' and a half'}`)
    .replace(/\b(\d)\.5 goals\b/gi, (_, n) => `${num(+n)} and a half goals`)
    .replace(/\b(\d+)\.(\d\d?)\b/g, (_, a, b) => { const d = b.replace(/0+$/, ''); return d ? `${num(+a)} point ${[...d].map(x => DIG[+x]).join(' ')}` : num(+a) })   // 2.0 → two
    .replace(/(\d)\s?%/g, '$1 percent')
    .replace(/₦\s?([\d,]+)/g, '$1 naira').replace(/\$\s?([\d,]+(?:\.\d+)?)/g, '$1 dollars')
    .replace(/\b(\d)-(\d)-(\d)(?:-(\d))?\b/g, (...m) => m.slice(1, 5).filter(Boolean).map(d => DIG[+d]).join(' '))   // formations: 4-4-2 → four four two
    .replace(/\bxG\b/g, 'expected goals').replace(/\s*&\s*/g, ' and ').replace(/\b(\d+)\s*[-–]\s*(\d+)\b/g, (_, x, y) => +x === +y ? `${+x === 0 ? 'nil' : num(+x)} all` : `${num(+x)} ${+y === 0 ? 'nil' : num(+y)}`)
}
const W = line => L(speakify(line), line)
const WS = x => typeof x === 'string' ? W(x) : L(speakify(x.say), x.show)      // a line, or { say, show }

// cfg.script (written for the day) replaces the template lines, scene by scene. Pick and result lines map to
// the beats: line 1 = the match, line 2 = the pick (the card slams in), line 3 = the numbers (the bars light).
function applyScript(cfg, scenes) {
  const sc = cfg.script
  if (!sc) return scenes
  let pi = 0, ri = 0, oi = 0
  for (const s of scenes) {
    const lines = s.type === 'pick' ? sc.picks?.[pi++] : s.type === 'result' ? sc.results?.[ri++] : s.type === 'pv_round' ? sc.pv_round?.[oi++] : sc[s.type]
    if (Array.isArray(lines) && lines.length) s.say = lines.map(WS)
  }
  return scenes
}
const pick = (i, arr) => arr[i % arr.length]

// "Over 1.5 Goals" → "over one and a half goals"; "Double Chance: Draw or Norway" → "Norway or the draw"
export function spokenPick(p) {
  if (p.say) return p.say
  let s = p.pick.replace(/\s+/g, ' ').trim()
  const halves = { '0.5': 'half a', '1.5': 'one and a half', '2.5': 'two and a half', '3.5': 'three and a half', '4.5': 'four and a half' }
  s = s.replace(/\b(over|under)\s+(\d\.5)\b/gi, (_, ou, n) => `${ou.toLowerCase()} ${halves[n] || n}`)
  s = s.replace(/^double chance:?\s*draw or (.+)$/i, '$1 or the draw').replace(/^double chance:?\s*(.+) or draw$/i, '$1 or the draw')
  s = s.replace(/^draw$/i, 'the draw').replace(/\bbtts\b/i, 'both teams to score').replace(/\bdnb\b/i, 'draw no bet')
  return s.replace(/ to Win$/i, ' to win').replace(/ Goals$/i, ' goals').replace(/\s*&\s*/g, ' and ')
}
// what the caption shows: the same short label as the pick card ("Norway or Draw", not "Double Chance: Draw or Norway")
const shownPick = p => {
  const s = p.pick.trim()
  const m = s.match(/^double chance:?\s*draw or (.+)$/i) || s.match(/^double chance:?\s*(.+) or draw$/i)
  if (m) return `${m[1]} or the draw`
  return /^draw$/i.test(s) ? 'the draw' : s.replace(/ to Win$/i, ' to win').replace(/^(Over|Under) /, (_, w) => w.toLowerCase() + ' ').replace(/ Goals$/, ' goals')
}

function context(p) {
  if (p.home_win !== undefined) {
    const fav = p.home_win >= p.away_win ? p.home : p.away, fp = Math.max(p.home_win, p.away_win)
    if (fp >= 65) return `and our model makes ${fav} big favourites`
    if (p.draw >= Math.max(p.home_win, p.away_win)) return `and our model sees a tight one`
    if (fp - Math.min(p.home_win, p.away_win) >= 10) return `and our model leans ${fav}`
  }
  if (p.xg_home !== undefined && p.xg_home + p.xg_away >= 2.9) return `and our model expects goals`
  if (p.form_home) {
    const w = (s = '') => (s.match(/W/g) || []).length
    if (w(p.form_home) >= 4) return `with ${p.home} on ${word(w(p.form_home))} wins from five`
    if (w(p.form_away) >= 4) return `with ${p.away} on ${word(w(p.form_away))} wins from five`
  }
  return ''
}

function opener(i, n, p) {
  const ctx = context(p)
  const vs = pick(i, [`${p.home} host ${p.away}`, `${p.home} against ${p.away}`, `${p.home} versus ${p.away}`])
  const head = i === 0 ? `Pick one: ${vs}` : i === n - 1 ? `And the last one: ${vs}` : `Pick ${word(i + 1)}: ${vs}`
  return L(`${head}${ctx ? ', ' + ctx : ''}.`)
}

function thePick(i, p) {
  const form = (s, o) => pick(i, [`We're backing ${s}, at ${o}.`, `The pick: ${s}, at ${o}.`, `We're on ${s}, priced at ${o}.`])
  return L(form(spokenPick(p), oddsSay(p.odds)), form(shownPick(p), odds(p.odds)))
}

function numbers(i, p) {
  const book = pct(p.market), ours = pct(p.model)
  if (p.signal === 3) return L(pick(i, [`Bookies say ${book} percent, our model ${ours}. Three bars.`, `Bookies: ${book} percent. Our model: ${ours}. Three bars.`]))
  if (p.signal === 2) return L(pick(i, [`Bookies say ${book} percent, our model ${ours}. Two bars.`, `Bookies: ${book} percent. Us: ${ours}. Two bars.`]))
  return L(`Bookies say ${book} percent, we say ${ours}. One bar, keep it light.`)
}

function scoreLine(p) {
  const m = String(p.score || '').match(/(\d+)\s*[-–:]\s*(\d+)/)
  if (!m) return null
  const [h, a] = [+m[1], +m[2]], hi = Math.max(h, a), lo = Math.min(h, a)
  const g = n => n === 0 ? 'nil' : num(n)              // football says "three nil"
  const H = p.say_home || p.home, A = p.say_away || p.away
  if (h > a) return L(`${H} beat ${A} ${g(hi)} ${g(lo)}.`, `${p.home} beat ${p.away} ${hi}–${lo}.`)
  if (h < a) return L(`${A} beat ${H} ${g(hi)} ${g(lo)}, away from home.`, `${p.away} beat ${p.home} ${hi}–${lo}, away from home.`)
  if (h === 0) return L(`${H} and ${A} played out a goalless draw.`, `${p.home} and ${p.away} played out a goalless draw.`)
  return L(`${H} and ${A} drew ${num(h)} all.`, `${p.home} and ${p.away} drew ${h}–${a}.`)
}

function buildResultScenes(cfg, picks, recap) {
  const n = picks.length, cw = cfg.currency_word, cur = cfg.currency
  const { won } = recap
  const lead = won === n ? `All ${word(n)} landed!` : won / n >= 0.6 ? `${Cap(word(won))} from ${word(n)}!`
    : won === 0 ? `A bad day: none of the ${word(n)} landed.`
      : recap.profit >= 0 ? `Only ${word(won)} from ${word(n)}, but the prices paid.` : `A tough one: ${word(won)} from ${word(n)}.`
  const back = recap.profit >= 0
    ? L(`${money(cfg.stake_example)} ${cw}, split by the bars, came back as ${money(recap.returned)}.`, `${cur}${money(cfg.stake_example)} split by the bars came back as ${cur}${money(recap.returned)}.`)
    : L(`${money(cfg.stake_example)} ${cw}, split by the bars, came back as ${money(recap.returned)}. Here's every result.`, `${cur}${money(cfg.stake_example)} split by the bars came back as ${cur}${money(recap.returned)}. Here's every result.`)
  const scenes = [{ type: 'rhook', say: [L(lead), back] }]
  picks.forEach((p, i) => {
    const s = spokenPick(p)
    const verdict = p.result === 'won' ? L(`${Cap(s)}: landed, at ${oddsSay(p.odds)}.`, `${Cap(shownPick(p))}: landed, at ${odds(p.odds)}.`)
      : p.result === 'void' ? L(`${Cap(s)} was void, so the stake comes back.`, `${Cap(shownPick(p))} was void, so the stake comes back.`)
        : L(`${Cap(s)} didn't come in.`, `${Cap(shownPick(p))} didn't come in.`)
    scenes.push({ type: 'result', i, say: [scoreLine(p) || L(`${p.home} against ${p.away}.`), verdict] })
  })
  const roi = Math.round(recap.profit / recap.total * 100)
  scenes.push({
    type: 'rtotal', say: [
      L(`On the day: ${money(recap.total)} staked, ${money(recap.returned)} back.`, `On the day: ${cur}${money(recap.total)} staked, ${cur}${money(recap.returned)} back.`),
      recap.profit >= 0 ? L(`That's ${money(recap.profit)} ${cw} up, ${roi} percent on the stakes.`, `That's ${cur}${money(recap.profit)} up, ${roi}% on the stakes.`)
        : L(`That's ${money(-recap.profit)} ${cw} down. We post every result, wins and losses.`, `That's ${cur}${money(-recap.profit)} down. We post every result, wins and losses.`),
    ],
  })
  scenes.push({ type: 'cta', say: [L(`Next picks ${cfg.next_when}. Follow so you catch them.`), L('Predictions, not guarantees. Eighteen plus.', 'Predictions, not guarantees. 18+.')] })
  return scenes
}

export function buildScenes(cfg, picks, recap) {
  const build = cfg.mode === 'results' ? buildResultScenes : cfg.mode === 'preview' ? buildPreviewScenes : cfg.mode === 'review' ? buildReviewScenes : cfg.mode === 'explainer' ? buildExplainerScenes : buildPickScenes
  // cfg.skip: leave screens out, e.g. ["pv_form"] when the app's numbers clash with confirmed recent results
  const scenes = applyScript(cfg, build(cfg, picks, recap).filter(s => !(cfg.skip || []).includes(s.type)))
  // after a cold open, the next screen lands on the music's drop
  const c = scenes.findIndex(s => /_cold$/.test(s.type))
  if (c >= 0 && scenes[c + 1]) scenes[c + 1].data = { ...(scenes[c + 1].data || {}), drop: true }
  return scenes
}

// Post-match review / reaction: every screen is a beat written for this match (cfg.review.beats), so no two videos
// run the same way. A beat: { type: hook|moment|meme|stats|read|table|ratings|cta, say: [lines], clip, sticker, burst, … }
function buildReviewScenes(cfg) {
  return (cfg.review?.beats || []).map(b => ({ type: (/^(rx|pm|np|bp|vr|gl|ar|en|dw)_/.test(b.type) ? '' : 'rv_') + b.type, i: b.match ?? 0, say: (b.say || []).map(WS), data: b, hold: b.hold }))
}

// Motion-graphics explainer (any topic, e.g. how a product works): every screen is a beat in cfg.explainer.beats,
// drawn by explainer.html. A beat: { type: hook|stack|rule|start|buy|track|custom|pvp|numbers|smart|outro, say: [lines], … }
function buildExplainerScenes(cfg) {
  // a line is a string, or { say, show } when the voice should say it differently from the captions ("$172" on screen)
  return (cfg.explainer?.beats || []).map(b => ({ type: 'ex_' + b.type.replace(/^ex_/, ''), i: 0, say: (b.say || []).map(x => typeof x === 'string' ? W(x) : L(speakify(x.say), x.show)), data: b, hold: b.hold }))
}

// Match preview: football analysis only. No odds, prices, stakes, picks or betting words (X / YouTube monetisation).
function buildPreviewScenes(cfg, [p, ...others]) {
  const H = p.home, A = p.away, f1 = v => (v + 1e-9).toFixed(1)
  const scenes = [{ type: 'pv_hook', i: 0, say: [W(`${H} against ${A}${p.competition ? ` in the ${p.competition}` : ''}.`), W(`Here's what the numbers say.`)] }]
  if (p.record_home && p.record_away) {
    const line = (t, [w, d, l], g) => l === 0 ? `${t} are unbeaten in ${word(g)}: ${word(w)} wins and ${word(d)} draws.` : `${t} have won ${word(w)} of their last ${word(g)}.`
    scenes.push({ type: 'pv_form', i: 0, say: [W(`Form first. ${line(H, p.record_home, p.games_home || 10)}`), W(line(A, p.record_away, p.games_away || 10))] })
  }
  if (p.scored_home !== undefined) {
    const say = [W(`${H} score ${f1(p.scored_home)} a game and concede ${f1(p.conceded_home)}. ${A} score ${f1(p.scored_away)} and concede ${f1(p.conceded_away)}.`)]
    if (p.sot_home !== undefined) say.push(W(`Shots on target: ${A} ${f1(p.sot_away)} a game, ${H} ${f1(p.sot_home)}.`))
    scenes.push({ type: 'pv_stats', i: 0, say })
  }
  if (p.home_win !== undefined) {
    const fav = p.home_win >= p.away_win ? [H, p.home_win, A, p.away_win] : [A, p.away_win, H, p.home_win]
    scenes.push({ type: 'pv_model', i: 0, say: [
      W(`Our model expects ${f1(p.xg_home)} goals from ${H} and ${f1(p.xg_away)} from ${A}.`),
      W(`That makes it ${Math.round(fav[1])}% ${fav[0]}, ${Math.round(p.draw)}% the draw and ${Math.round(fav[3])}% ${fav[2]}.`)] })
  }
  const an = cfg.analysis
  if (an) {   // the match analysis version: researched stakes, players, tactics and a verdict around the app's numbers
    // insert after the first of `after` that exists (so the story runs: context → form → players → tactics → numbers)
    const at = (type, after, say) => { const k = [].concat(after).map(a => scenes.findIndex(x => x.type === a)).find(i => i >= 0) ?? -1; scenes.splice(k < 0 ? scenes.length : k + 1, 0, { type, i: 0, say }) }
    if (an.stakes?.length || an.table?.length) at('pv_stake', 'pv_hook', (an.stakes || []).slice(0, 2).map(W))
    if (an.players?.length) {
      const nm = side => an.players.filter(x => x.team === side).map(x => x.name).join(' and ')
      at('pv_players', ['pv_form', 'pv_stake', 'pv_hook'], [W(`Players to watch: ${nm('home')} for ${H}.`), W(`For ${A}, ${nm('away')}.`)])
    }
    if (an.tactics) at('pv_tactics', ['pv_players', 'pv_form', 'pv_stake', 'pv_hook'], [W(`${H} set up in a ${an.tactics.home?.formation || ''}.`), W(`${A} in a ${an.tactics.away?.formation || ''}.`)])
    // the number (analysis.big): one full-screen stat that explains the model, just before the model screen
    if (an.big) at('pv_big', ['pv_tactics', 'pv_players', 'pv_stake', 'pv_hook'], [W(an.big.label || '')])
    if (an.expect?.length) scenes.push({ type: 'pv_expect', i: 0, say: an.expect.slice(0, 3).map(W) })
  }
  if (p.top_scores?.length && !an?.expect?.length) {
    const [a, b] = p.top_scores, sc = x => `${x[0]}-${x[1]}`
    scenes.push({ type: 'pv_score', i: 0, say: [W(b && Math.abs(a[2] - b[2]) < 1 ? `The most likely scores are ${sc(a)} and ${sc(b)}, each about ${Math.round(a[2])}%.` : `The single most likely score is ${sc(a)}, at ${Math.round(a[2])}%.`)] })
  }
  // the round-up: tonight's other matches (picks 2, 3, …), one screen each with the app's numbers and a researched note
  others.forEach((r, j) => {
    // without the app's numbers, a round-up screen still runs when it carries a researched note and our read (the script's lines)
    if (r.home_win === undefined) { if (r.round?.read) scenes.push({ type: 'pv_round', i: j + 1, say: [W(`${j ? 'And' : 'Elsewhere,'} ${r.home} against ${r.away}. ${r.round.read}.`)] }); return }
    const fav = r.home_win >= r.away_win ? [r.home, r.home_win] : [r.away, r.away_win]
    scenes.push({ type: 'pv_round', i: j + 1, say: [W(`${j ? 'And' : 'Elsewhere,'} ${r.home} against ${r.away}. Our model makes ${fav[0]} favourites, at ${Math.round(fav[1])}%.`)] })
  })
  scenes.push({ type: 'pv_cta', i: 0, say: [W(`That's the preview. Follow for more football, by the numbers.`)] })
  // cinematic opening (analysis.cold): a dark teaser of big numbers before the title, which lands on the music's drop
  const cold = an?.cold
  if (cold) { scenes[0].data = { ...(scenes[0].data || {}), drop: true }; scenes.unshift({ type: 'pv_cold', i: 0, say: (cold.say || []).map(WS), data: cold }) }
  return scenes
}

function buildPickScenes(cfg, picks, recap) {
  const n = picks.length
  const best = [...picks].sort((a, b) => (b.signal - a.signal) || (b.model - a.model))[0]
  const comp = cfg.competition ? ` ${cfg.competition}` : ''
  const when = cfg.when || 'today'
  const scenes = [{
    type: 'hook', say: [
      L(`${Cap(word(n))}${comp} picks ${when}, and one of them our model rates at ${pct(best.model)} percent.`),
    ],
  }]
  picks.forEach((p, i) => scenes.push({ type: 'pick', i, say: [opener(i, n, p), thePick(i, p), numbers(i, p)] }))
  scenes.push({
    type: 'slate', say: [
      L(`That's the slate. Staking ${money(cfg.stake_example)} ${cfg.currency_word}? Split it by the bars.`,
        `That's the slate. Staking ${cfg.currency}${money(cfg.stake_example)}? Split it by the bars.`),
    ],
  })
  scenes.push({ type: 'cta', say: [L(`Results ${cfg.results_when}. Follow so you don't miss them.`), L('Predictions, not guarantees. Eighteen plus.', 'Predictions, not guarantees. 18+.')] })
  return scenes
}
