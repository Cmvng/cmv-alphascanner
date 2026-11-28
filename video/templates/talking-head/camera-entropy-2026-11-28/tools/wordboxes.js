// in the page: every word's box, in CSS px from the document's top-left
(() => {
  const out = [], w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT)
  let n; while ((n = w.nextNode())) {
    const s = n.textContent; const re = /\S+/g; let m
    while ((m = re.exec(s))) {
      const r = document.createRange(); r.setStart(n, m.index); r.setEnd(n, m.index + m[0].length)
      const b = r.getBoundingClientRect(); if (b.width < 1 || b.height < 1) continue
      out.push([m[0], +(b.left + scrollX).toFixed(1), +(b.top + scrollY).toFixed(1), +(b.right + scrollX).toFixed(1), +(b.bottom + scrollY).toFixed(1)])
    }
  }
  return out
})()
