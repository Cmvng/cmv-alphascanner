// Primus "The Bouncer": the thumbnail is the closing frame (it carries the two lines); the cover sets the whole ID
// against the one-line proof. Stills are clean frames of the video (stage.html#nocap) at 9.0, 36.9 and 75.25 s.
window.COVER = {
  t: { img: 'still_75.25.png', at: [78, 318], lines: [], chip: 'Primus Labs · explained', chipbg: '#FD4C00' },
  v: { bg: '#cfe4ff', img: 'still_9.00.png', frame: [40, 560, 1000, 562], radius: 40, tag: 'Before: the whole ID', tagbg: '#C8102E',
       more: [{ img: 'still_36.90.png', frame: [40, 1160, 1000, 562], tag: 'With Primus: one line', tagbg: '#12824a' }],
       at: [0, 120], center: 1, kick: 'Primus Labs · explained', kickc: '#FD4C00',
       lines: [['Prove the fact.', '#0B1F44'], ['Keep the file.', '#FD4C00']], size: 150, foot: '@Cmv_ng', footy: 78 },
}
