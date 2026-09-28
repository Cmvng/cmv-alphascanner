(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const touch = matchMedia("(hover: none)").matches;
  $("#year").textContent = new Date().getFullYear();

  /* ---------- nav ---------- */
  const nav = $("#nav");
  const onScroll = () => nav.classList.toggle("solid", scrollY > 40);
  addEventListener("scroll", onScroll, { passive: true });
  onScroll();
  const menuBtn = $("#menuBtn");
  menuBtn.addEventListener("click", () => {
    const open = nav.classList.toggle("open");
    menuBtn.setAttribute("aria-expanded", String(open));
  });
  $$("#links a").forEach(a => a.addEventListener("click", () => { nav.classList.remove("open"); menuBtn.setAttribute("aria-expanded", "false"); }));

  /* ---------- rotating verb ---------- */
  const verbs = ["draw", "trade", "build", "sell", "farm", "grill", "create"];
  const verbEl = $("#verb");
  if (!reduce) {
    let vi = 0;
    setInterval(() => {
      vi = (vi + 1) % verbs.length;
      verbEl.animate([{ opacity: 1, transform: "none" }, { opacity: 0, transform: "translateY(-8px)" }], { duration: 220, easing: "ease-in" }).onfinish = () => {
        verbEl.textContent = verbs[vi];
        verbEl.animate([{ opacity: 0, transform: "translateY(8px)" }, { opacity: 1, transform: "none" }], { duration: 300, easing: "ease-out" });
      };
    }, 2000);
  }

  /* ---------- reveal on scroll ---------- */
  const io = new IntersectionObserver(entries => entries.forEach(e => {
    if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); }
  }), { threshold: 0.12, rootMargin: "0px 0px -40px 0px" });
  $$(".reveal").forEach(el => io.observe(el));

  /* ---------- 3D tilt cards ---------- */
  if (!touch && !reduce) {
    $$(".tilt").forEach(card => {
      card.addEventListener("pointermove", e => {
        const r = card.getBoundingClientRect();
        const x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
        card.style.transform = `rotateX(${(0.5 - y) * 10}deg) rotateY(${(x - 0.5) * 12}deg) translateZ(0)`;
        card.style.setProperty("--mx", `${x * 100}%`);
        card.style.setProperty("--my", `${y * 100}%`);
      });
      card.addEventListener("pointerleave", () => { card.style.transform = ""; });
    });
    const pw = $("#portraits");
    if (pw) {
      pw.addEventListener("pointermove", e => {
        const r = pw.getBoundingClientRect();
        const x = (e.clientX - r.left) / r.width - 0.5, y = (e.clientY - r.top) / r.height - 0.5;
        $$(".p", pw).forEach(p => {
          const d = Number(p.dataset.depth);
          p.style.transform = `rotateY(${x * 14 * d}deg) rotateX(${-y * 10 * d}deg) translate3d(${x * 16 * d}px, ${y * 12 * d}px, 0)`;
        });
      });
      pw.addEventListener("pointerleave", () => $$(".p", pw).forEach(p => (p.style.transform = "")));
    }
  }

  /* ---------- product rigs: scroll-linked 3D turn + hover tilt ---------- */
  const rigs = $$(".stage").map(stage => ({ stage, rig: $(".rig", stage), flip: stage.closest(".product").classList.contains("flip"), hx: 0, hy: 0 }));
  if (!touch && !reduce) {
    rigs.forEach(r => {
      r.stage.addEventListener("pointermove", e => {
        const b = r.stage.getBoundingClientRect();
        r.hx = (e.clientX - b.left) / b.width - 0.5;
        r.hy = (e.clientY - b.top) / b.height - 0.5;
      });
      r.stage.addEventListener("pointerleave", () => { r.hx = 0; r.hy = 0; });
    });
  }
  function rigFrame() {
    rigs.forEach(r => {
      const b = r.stage.getBoundingClientRect();
      const p = Math.max(-1, Math.min(1, (b.top + b.height / 2 - innerHeight / 2) / innerHeight));
      const side = r.flip ? -1 : 1;
      const ry = reduce ? side * -10 : side * (-14 + p * 12) + r.hx * 10;
      const rx = reduce ? 6 : 8 + p * 6 - r.hy * 8;
      r.rig.style.transform = `rotateY(${ry}deg) rotateX(${rx}deg)`;
    });
    requestAnimationFrame(rigFrame);
  }
  requestAnimationFrame(rigFrame);

  /* ---------- art carousel ---------- */
  const ring = $("#ring"), carousel = $("#carousel");
  fetch("assets/art/art.json").then(r => r.json()).then(art => {
    const pick = ["eye-study", "police-brutality-1", "the-naira", "breath-in-the-dark", "quincy", "untitled-2022", "desolation-1", "soulical-realm-i", "the-faced-man", "memories", "usd1-gbp1", "pirates-2", "mindless", "alpamale-1", "spongbob-pirates", "why"];
    const items = pick.map(id => art.find(a => a.id === id)).filter(Boolean);
    const n = items.length;
    const itemW = innerWidth < 640 ? 160 : 220;
    const radius = Math.round((itemW / 2 + 26) / Math.tan(Math.PI / n));
    items.forEach((a, i) => {
      const f = document.createElement("figure");
      f.className = "item";
      f.style.transform = `rotateY(${(360 / n) * i}deg) translateZ(${radius}px)`;
      f.innerHTML = `<div class="fr"><img src="${a.src}" alt="${a.title.replace(/"/g, "&quot;")}" loading="lazy" draggable="false"></div><figcaption></figcaption>`;
      f.querySelector("figcaption").textContent = a.title;
      ring.appendChild(f);
    });
    let angle = 0, vel = reduce ? 0 : -0.08, dragging = false, lastX = 0;
    const tiltX = -6;
    const push = -radius;
    function frame() {
      if (!dragging) { angle += vel; vel += ((reduce ? 0 : -0.08) - vel) * 0.02; }
      ring.style.transform = `translateZ(${push}px) rotateX(${tiltX}deg) rotateY(${angle}deg)`;
      requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
    carousel.addEventListener("pointerdown", e => { dragging = true; lastX = e.clientX; carousel.setPointerCapture(e.pointerId); });
    carousel.addEventListener("pointermove", e => {
      if (!dragging) return;
      const dx = e.clientX - lastX; lastX = e.clientX;
      angle += dx * 0.25; vel = dx * 0.25;
    });
    const end = () => { dragging = false; };
    carousel.addEventListener("pointerup", end);
    carousel.addEventListener("pointercancel", end);
  });

  /* ---------- counters ---------- */
  const cio = new IntersectionObserver(entries => entries.forEach(e => {
    if (!e.isIntersecting) return;
    cio.unobserve(e.target);
    $$("[data-count]", e.target).forEach(el => {
      const to = Number(el.dataset.count), plain = el.hasAttribute("data-plain");
      const from = plain ? to - 12 : 0;
      if (reduce) { el.textContent = to; return; }
      const t0 = performance.now(), dur = 1400;
      const step = t => {
        const k = Math.min(1, (t - t0) / dur), v = from + (to - from) * (1 - Math.pow(1 - k, 3));
        el.textContent = Math.round(v);
        if (k < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    });
  }), { threshold: 0.4 });
  $$(".stats").forEach(s => cio.observe(s));
})();
