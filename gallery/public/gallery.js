(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const grid = $("[data-grid]");
  const filtersEl = $("[data-filters]");
  const emptyEl = $("[data-empty]");
  const viewer = $("[data-viewer]");

  let works = [];
  let filter = "all";
  let shown = [];
  let current = -1;
  let columns = 0;

  $("[data-year]").textContent = new Date().getFullYear();

  /* ---------- Data ---------- */
  async function load() {
    emptyEl.hidden = false;
    try {
      const r = await fetch("/api/works", { cache: "no-store" });
      if (!r.ok) throw new Error(r.status);
      works = (await r.json()).works || [];
    } catch {
      emptyEl.textContent = "The gallery couldn't load just now. Refresh to try again.";
      return;
    }
    $("[data-total]").textContent = `${works.length} works`;
    $("[data-count-line]").textContent = `Online gallery · ${works.length} works`;
    buildFilters();
    render();
    openFromHash();
  }

  /* ---------- Filters ---------- */
  function buildFilters() {
    const counts = new Map();
    for (const w of works) counts.set(w.series, (counts.get(w.series) || 0) + 1);
    const wip = works.filter(w => w.status === "wip").length;
    const options = [["all", "All", works.length], ...[...counts].map(([s, n]) => ["series:" + s, s, n])];
    if (wip) options.push(["wip", "In progress", wip]);
    if (!options.some(o => o[0] === filter)) filter = "all";

    filtersEl.textContent = "";
    for (const [key, label, n] of options) {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "chip";
      b.setAttribute("aria-pressed", String(key === filter));
      b.append(label);
      const c = document.createElement("span");
      c.textContent = n;
      b.append(c);
      b.addEventListener("click", () => {
        filter = key;
        filtersEl.querySelectorAll(".chip").forEach(x => x.setAttribute("aria-pressed", String(x === b)));
        render();
      });
      filtersEl.append(b);
    }
  }

  function matches(w) {
    if (filter === "all") return true;
    if (filter === "wip") return w.status === "wip";
    return "series:" + w.series === filter;
  }

  /* ---------- Grid (row-first masonry so the newest work sits top-left) ---------- */
  const colCount = () => (innerWidth >= 1024 ? 3 : innerWidth >= 560 ? 2 : 1);

  function card(w, index) {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "card";
    b.addEventListener("click", () => open(index));

    const frame = document.createElement("div");
    frame.className = "frame";
    const img = document.createElement("img");
    img.src = w.thumb || w.image;
    img.alt = w.title;
    img.width = w.width || 1000;
    img.height = w.height || 1000;
    img.loading = index < 6 ? "eager" : "lazy";
    img.decoding = "async";
    img.addEventListener("load", () => img.classList.add("loaded"));
    if (img.complete) img.classList.add("loaded");
    frame.append(img);

    const cap = document.createElement("div");
    cap.className = "cap";
    const text = document.createElement("div");
    const t = document.createElement("div");
    t.className = "t";
    t.textContent = w.title;
    const s = document.createElement("div");
    s.className = "s";
    s.textContent = [w.series, w.year].filter(Boolean).join(" · ");
    text.append(t, s);
    cap.append(text);
    if (w.status === "wip") {
      const badge = document.createElement("span");
      badge.className = "badge";
      badge.textContent = "In progress";
      cap.append(badge);
    }
    b.append(frame, cap);
    return b;
  }

  function render() {
    shown = works.filter(matches);
    columns = colCount();
    grid.textContent = "";
    emptyEl.hidden = shown.length > 0;
    if (!shown.length) { emptyEl.textContent = "Nothing here yet."; return; }

    const cols = Array.from({ length: columns }, () => {
      const c = document.createElement("div");
      c.className = "col";
      grid.append(c);
      return { el: c, h: 0 };
    });
    shown.forEach((w, i) => {
      const target = cols.reduce((a, b) => (b.h < a.h - 0.05 ? b : a));
      target.el.append(card(w, i));
      target.h += (w.height || 1) / (w.width || 1) + 0.28;
    });
  }

  let resizeTimer;
  addEventListener("resize", () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => { if (colCount() !== columns) render(); }, 150);
  });

  /* ---------- Viewer ---------- */
  const vImg = $("[data-v-img]");

  function fill() {
    const w = shown[current];
    vImg.src = w.image;
    vImg.alt = w.title;
    $("[data-v-series]").textContent = w.series || "";
    $("[data-v-title]").textContent = w.title;
    $("[data-v-meta]").textContent = [w.medium, w.year].filter(Boolean).join(" · ");
    $("[data-v-wip]").hidden = w.status !== "wip";
    $("[data-v-desc]").textContent = w.description || "";
    const links = $("[data-v-links]");
    links.textContent = "";
    if (w.link) {
      const a = document.createElement("a");
      a.className = "btn btn-sm";
      a.href = w.link;
      a.target = "_blank";
      a.rel = "noopener";
      a.textContent = "View on OpenSea ↗";
      links.append(a);
    }
    const share = document.createElement("button");
    share.type = "button";
    share.className = "btn btn-line btn-sm";
    share.textContent = "Copy link";
    share.addEventListener("click", async () => {
      const url = `${location.origin}/#work=${encodeURIComponent(w.id)}`;
      try { await navigator.clipboard.writeText(url); toast("Link copied"); } catch { toast(url); }
    });
    links.append(share);
    $("[data-v-count]").textContent = `${current + 1} of ${shown.length}`;
    const many = shown.length > 1;
    $("[data-prev]").hidden = !many;
    $("[data-next]").hidden = !many;
    history.replaceState(null, "", `#work=${encodeURIComponent(w.id)}`);
    // warm the neighbours so arrowing feels instant
    for (const d of [1, -1]) {
      const n = shown[(current + d + shown.length) % shown.length];
      if (n) new Image().src = n.image;
    }
  }

  function open(i) {
    current = i;
    fill();
    if (!viewer.open) viewer.showModal();
  }
  const step = d => { current = (current + d + shown.length) % shown.length; fill(); };
  function close() { viewer.close(); }

  viewer.addEventListener("close", () => history.replaceState(null, "", location.pathname + location.search));
  $("[data-close]").addEventListener("click", close);
  $("[data-prev]").addEventListener("click", () => step(-1));
  $("[data-next]").addEventListener("click", () => step(1));
  viewer.addEventListener("click", e => { if (e.target === $("[data-stage]")) close(); });
  viewer.addEventListener("keydown", e => {
    if (e.key === "ArrowLeft") step(-1);
    if (e.key === "ArrowRight") step(1);
  });

  // swipe left/right on phones
  let x0 = null;
  const stage = $("[data-stage]");
  stage.addEventListener("pointerdown", e => { if (e.pointerType !== "mouse") x0 = e.clientX; });
  stage.addEventListener("pointerup", e => {
    if (x0 === null) return;
    const dx = e.clientX - x0;
    x0 = null;
    if (Math.abs(dx) > 50 && shown.length > 1) step(dx < 0 ? 1 : -1);
  });

  document.querySelectorAll("[data-open]").forEach(el => el.addEventListener("click", () => openById(el.dataset.open)));

  function openById(id) {
    let i = shown.findIndex(w => w.id === id);
    if (i === -1 && works.some(w => w.id === id)) {
      filter = "all";
      buildFilters();
      render();
      i = shown.findIndex(w => w.id === id);
    }
    if (i !== -1) open(i);
  }
  function openFromHash() {
    const m = /^#work=(.+)$/.exec(location.hash);
    if (m) openById(decodeURIComponent(m[1]));
  }

  /* ---------- Toast ---------- */
  const toastEl = $("[data-toast]");
  let toastTimer;
  function toast(msg) {
    // the viewer sits in the top layer, so the toast has to live inside it while it's open
    (viewer.open ? viewer : document.body).append(toastEl);
    toastEl.textContent = msg;
    toastEl.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toastEl.classList.remove("show"), 2200);
  }

  load();
})();
