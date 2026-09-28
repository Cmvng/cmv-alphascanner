// Light/dark switch shared by every page. The <head> sets the first theme before paint.
(() => {
  const root = document.documentElement;
  const meta = document.querySelector('meta[name="theme-color"]');
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const stored = () => { try { return localStorage.getItem("theme"); } catch { return null; } };

  function paint(t) {
    root.dataset.theme = t;
    if (meta) meta.content = t === "light" ? "#F5F3EE" : "#07080B";
    document.querySelectorAll("[data-theme-btn]").forEach(b => {
      b.setAttribute("aria-label", t === "light" ? "Switch to dark mode" : "Switch to light mode");
      b.setAttribute("aria-pressed", String(t === "light"));
    });
    dispatchEvent(new CustomEvent("themechange", { detail: t }));
  }

  function set(t, x = innerWidth / 2, y = 0) {
    try { localStorage.setItem("theme", t); } catch {}
    if (!document.startViewTransition || reduce) {
      root.classList.add("theme-fade");
      paint(t);
      setTimeout(() => root.classList.remove("theme-fade"), 500);
      return;
    }
    // circular wipe from the button
    const r = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));
    const vt = document.startViewTransition(() => paint(t));
    vt.ready.then(() => root.animate(
      { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${r}px at ${x}px ${y}px)`] },
      { duration: 750, easing: "cubic-bezier(.2,.8,.2,1)", pseudoElement: "::view-transition-new(root)" }
    )).catch(() => {});
  }

  paint(root.dataset.theme === "light" ? "light" : "dark");
  document.addEventListener("click", e => {
    const b = e.target.closest("[data-theme-btn]");
    if (!b) return;
    const r = b.getBoundingClientRect();
    set(root.dataset.theme === "light" ? "dark" : "light", r.left + r.width / 2, r.top + r.height / 2);
  });
  matchMedia("(prefers-color-scheme: light)").addEventListener("change", e => {
    if (!stored()) paint(e.matches ? "light" : "dark");
  });
})();
