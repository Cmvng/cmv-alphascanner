// Bagel, "my top picks for today" (7 Nov 2026): every time is in TAKE seconds (the house-voice take, CTC-aligned words in
// words.js); the page maps them to video time with T(s) = s + vo + (s >= cut ? gap : 0). Screenshot boxes are in the
// owner's screenshot pixels (968 x 2174).
window.PLAN = {
  vo: 0.2, cut: 51.6, gap: 0.6,
  cost: 2.84, pay: 31.23, x: '11.0x',
  hookA: 0.18, hookB: [2.92, 4.9], revealT: 13.62,
  teams: [
    { name: 'Fulham', color: '#111111', sub: 'v Newcastle United · 16:00 WAT', slam: 8.62, lit: [[18.82, 26.4], [44.04, 45.1]] },
    { name: 'Tottenham Hotspur', color: '#132257', sub: 'at Leeds United · 13:30 WAT', slam: 9.56, lit: [[26.44, 30.3], [44.04, 45.1]] },
    { name: 'Arsenal', color: '#EF0107', sub: 'v Hull City · 16:00 WAT', slam: 11.08, lit: [[30.9, 35.7], [44.04, 45.1]] },
    { name: 'Manchester City', color: '#6CABDD', sub: 'at Nottingham Forest · 18:30 WAT', slam: 12.10, lit: [[36.4, 41.8], [44.04, 45.1]] },
  ],
  steps: [
    [54.70, 'Download <b>Bagel</b>,<br>then tap <b>Add Funds</b>'],
    [57.14, 'Open a match,<br>tap <b>Yes</b> on your team'],
    [60.08, 'Add more games:<br>the <b>multiplier</b> climbs'],
    [63.60, 'Check <b>Cost</b> and <b>Max payout</b>,<br>then place it'],
  ],
  warnT: 67.22,
  warnHtml: '<b>All four must win.</b> One loss and the combo pays $0. Only stake what you can afford to lose.<br><span style="font-size:26px;letter-spacing:.08em;color:rgba(11,31,68,.62)">18+ · ONLY WHERE BAGEL IS AVAILABLE · NOT FINANCIAL ADVICE</span>',
  rings: [
    { t: [17.74, 18.70], box: [39, 1276, 381, 56] },     // "Combo 4 picks"
    { t: [19.00, 26.30], box: [109, 1405, 812, 131] },   // Fulham
    { t: [26.60, 30.30], box: [109, 1558, 812, 167] },   // Tottenham Hotspur
    { t: [31.00, 35.70], box: [109, 1747, 812, 131] },   // Arsenal
    { t: [36.50, 41.80], box: [109, 1900, 812, 132] },   // Manchester City
    { t: [44.00, 47.40], box: [100, 1395, 830, 645] },   // all four have to win
    { t: [48.20, 51.40], box: [40, 2076, 888, 88] },     // Cost / Max payout
    { t: [55.80, 57.00], box: [84, 489, 392, 98] },      // Add Funds
    { t: [58.30, 59.60], box: [127, 1472, 66, 47] },     // Yes
    { t: [61.30, 63.00], box: [795, 840, 105, 48] },     // 5.37x on the 3-pick combo
    { t: [63.90, 66.60], box: [40, 2076, 888, 88] },     // Cost / Max payout
  ],
  cam: [
    [0, null],
    [16.72, [484, 1700, 1.963]],
    [18.82, [515, 1470, 2.1]], [26.44, [515, 1641, 2.1]], [30.90, [515, 1812, 2.1]], [36.40, [515, 1966, 2.1]],
    [42.26, [484, 1700, 1.963]], [47.88, [484, 2174, 1.963]],
    [51.92, null], [55.40, [484, 450, 1.963]], [57.14, [484, 1700, 1.963]], [60.08, [484, 900, 1.963]], [63.60, [484, 2174, 1.963]],
    [67.00, null],
  ],
  scenes: { hook: [0, 5.5], intro: [6.0, 8.35], slip: [15.0, 73.3], steps: [51.92, 73.3], end: [73.3, 999] },
  sroot: 'file:///home/user/cmv-alphascanner/video/out/reactions/',
  // the owner as a character: listens from behind the left edge of his slip, grins at his brave pick, is intrigued by
  // Forest's home record, goes "uh-oh" at "all four have to win", ducks out for the how-to, smiles on the end card
  flow: {
    width: 400, idle: { id: 'stare', a: 40, b: 110, speed: 0.7 },
    segments: [{
      from: 15.6, to: 51.6,
      anchor: t => ({ x: 44, y: 900, rot: 0, hide: [380, 12] }),
      lean: 2,
      looks: [{ at: 'real slip', deg: 4, dur: 1.2 }],
      beats: [
        { at: 'brave one', id: 'crackup', kind: 'soft', away: -1, from: 0, to: 20, tail: 14, hold: 1.5 },
        { at: 'goal at home', id: 'hmm', kind: 'soft', away: -1, hold: 1.0 },
        { at: 'have to win', id: 'nervous', kind: 'hard', away: -1, from: 0, to: 60, tail: 30, hold: 2.6 },
      ],
    }],
  },
  flowEnd: {
    width: 400, idle: { id: 'stare', a: 40, b: 110, speed: 0.7 },
    segments: [{
      from: 73.5, to: null,
      anchor: t => ({ x: 1450, y: 1080, rot: 0, hide: [0, 470], z: 20 }),
      lean: -2,
      beats: [{ at: 'chain holds', id: 'wince', kind: 'soft', away: 1, from: 0, to: 24, tail: 12, hold: 3.5 }],
    }],
  },
}
window.PLAN.caps = [[0.18, 5.94, "<b>$2.84</b> could turn into <b>$31.23</b> today."], [6.04, 7.56, "These are my top picks,"], [7.58, 8.6, "on <b>Bagel.</b>"], [8.62, 9.54, "<b>Fulham.</b>"], [9.56, 11.06, "<b>Tottenham</b> <b>Hotspur.</b>"], [11.08, 12.08, "<b>Arsenal.</b>"], [12.1, 13.6, "<b>Manchester</b> <b>City.</b>"], [13.62, 14.92, "All four to win."], [15.08, 16.56, "Here's my real slip."], [16.72, 17.72, "Four picks,"], [17.74, 18.8, "one combo."], [18.82, 19.34, "<b>Fulham,</b>"], [19.36, 21.22, "at home to Newcastle United,"], [21.24, 22.48, "is my <b>brave</b> one."], [22.6, 23.6, "<b>Unbeaten</b> in three,"], [23.62, 24.82, "and Newcastle have lost"], [24.84, 26.42, "three of their last four."], [26.44, 27.22, "<b>Tottenham,</b>"], [27.24, 28.94, "away at Leeds United."], [29.02, 30.86, "<b>Three</b> league wins in a row."], [30.9, 31.42, "<b>Arsenal,</b>"], [31.44, 32.92, "at home to Hull <b>City.</b>"], [32.94, 33.94, "Top of the league,"], [33.96, 35.34, "and they've won <b>every</b> home game"], [35.36, 36.38, "this season."], [36.4, 39.28, "<b>Manchester</b> <b>City,</b> away at Nottingham Forest."], [39.3, 40.4, "Forest haven't scored"], [40.42, 42.24, "a <b>single</b> league goal at home."], [42.26, 44.02, "But a combo is a <b>chain.</b>"], [44.04, 45.64, "All four have to win."], [45.68, 46.26, "One draw,"], [46.28, 47.86, "and the slip pays <b>nothing.</b>"], [47.88, 49.36, "Paying <b>11</b> times"], [49.38, 51.9, "means it's roughly a <b>1 in 11</b> shot."], [51.92, 52.54, "If you're new,"], [52.56, 54.68, "here's how anyone can do the same."], [54.7, 57.12, "Download <b>Bagel,</b> and add <b>funds.</b>"], [57.14, 58.04, "Open a match,"], [58.06, 60.06, "and tap <b>Yes</b> on the team you back."], [60.08, 61.12, "Add more games,"], [61.14, 63.58, "and the <b>multiplier</b> climbs with <b>every</b> pick."], [63.6, 64.72, "Then check the <b>cost</b>"], [64.74, 66.06, "and the <b>max payout,</b>"], [66.08, 67.16, "and place it."], [67.22, 69.78, "Only stake what you can afford to <b>lose.</b>"], [69.88, 71.04, "<b>18</b> and over,"], [71.06, 73.26, "and only where <b>Bagel</b> is available."], [73.4, 75.12, "My link is in the <b>post.</b>"], [75.14, 76.34, "Let's see if the chain <b>holds.</b>"]]
