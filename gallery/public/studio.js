(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const TOKEN_KEY = "cmvng-studio-token";
  const MAX_BYTES = 30 * 1024 * 1024;
  const MAX_FULL = 2400;
  const MAX_THUMB = 900;

  const loginView = $("[data-login]");
  const studioView = $("[data-studio]");
  const form = $("[data-upload-form]");
  const fileInput = $("[data-file]");
  const drop = $("[data-drop]");

  let token = null;
  let prepared = null;

  const store = {
    get() { try { return localStorage.getItem(TOKEN_KEY); } catch { return null; } },
    set(v) { try { v ? localStorage.setItem(TOKEN_KEY, v) : localStorage.removeItem(TOKEN_KEY); } catch {} },
  };

  /* ---------- Toast ---------- */
  const toastEl = $("[data-toast]");
  let toastTimer;
  function toast(msg, isError = false) {
    toastEl.textContent = msg;
    toastEl.classList.toggle("error", isError);
    toastEl.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toastEl.classList.remove("show"), 3200);
  }

  /* ---------- API ---------- */
  async function api(path, opts = {}) {
    const r = await fetch(path, {
      ...opts,
      headers: { ...(opts.headers || {}), ...(token ? { authorization: `Bearer ${token}` } : {}) },
    });
    const data = await r.json().catch(() => ({}));
    if (r.status === 401 && path !== "/api/login") { signOut(); throw new Error("Please sign in again."); }
    if (!r.ok) throw new Error(data.error || `Something went wrong (${r.status})`);
    return data;
  }

  /* ---------- Sign in / out ---------- */
  function showLogin() {
    studioView.hidden = true;
    loginView.hidden = false;
    $("[data-login-form] input").focus();
  }
  function showStudio() {
    loginView.hidden = true;
    studioView.hidden = false;
    loadMine();
  }
  function signOut() {
    token = null;
    store.set(null);
    showLogin();
  }

  $("[data-login-form]").addEventListener("submit", async e => {
    e.preventDefault();
    const err = $("[data-login-error]");
    const btn = e.target.querySelector("button");
    err.textContent = "";
    btn.disabled = true;
    try {
      const { token: t } = await api("/api/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ password: e.target.password.value }),
      });
      token = t;
      store.set(t);
      e.target.reset();
      showStudio();
    } catch (ex) {
      err.textContent = ex.message;
    } finally {
      btn.disabled = false;
    }
  });
  $("[data-logout]").addEventListener("click", signOut);

  /* ---------- Image picking ---------- */
  function loadBitmap(file) {
    if ("createImageBitmap" in window) return createImageBitmap(file);
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = URL.createObjectURL(file);
    });
  }
  function draw(src, max) {
    const w0 = src.width, h0 = src.height;
    const k = Math.min(1, max / Math.max(w0, h0));
    const w = Math.round(w0 * k), h = Math.round(h0 * k);
    const c = document.createElement("canvas");
    c.width = w;
    c.height = h;
    const ctx = c.getContext("2d");
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, w, h);
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(src, 0, 0, w, h);
    return { canvas: c, w, h };
  }
  const toBlob = (canvas, q) => new Promise((res, rej) => canvas.toBlob(b => (b ? res(b) : rej(new Error("Could not process image"))), "image/jpeg", q));

  // Big phone photos get resized to 2400px so uploads stay quick; small files and GIFs go up untouched.
  async function prepare(file) {
    let src;
    try { src = await loadBitmap(file); }
    catch { throw new Error("This browser can't open that image. Try a JPG, PNG or WebP."); }
    const out = { image: file, name: file.name, width: src.width, height: src.height };
    const web = /^image\/(jpeg|png|webp|gif|avif)$/.test(file.type);
    const isGif = file.type === "image/gif";
    if (!isGif && (!web || file.size > 8 * 1024 * 1024 || Math.max(src.width, src.height) > MAX_FULL)) {
      const full = draw(src, MAX_FULL);
      out.image = await toBlob(full.canvas, 0.92);
      out.name = file.name.replace(/\.[^.]+$/, "") + ".jpg";
      out.width = full.w;
      out.height = full.h;
    }
    if (isGif && file.size > MAX_BYTES) throw new Error("That GIF is over 30 MB.");
    out.thumb = await toBlob(draw(src, MAX_THUMB).canvas, 0.85);
    return out;
  }

  async function pick(file) {
    if (!file) return;
    if (!file.type.startsWith("image/")) return toast("That file isn't an image.", true);
    const text = $("[data-progress-text]");
    text.textContent = "Preparing image…";
    try {
      prepared = await prepare(file);
    } catch (ex) {
      prepared = null;
      text.textContent = "";
      fileInput.value = "";
      return toast(ex.message, true);
    }
    text.textContent = "";
    $("[data-preview-img]").src = URL.createObjectURL(prepared.thumb);
    $("[data-preview-name]").textContent = file.name;
    $("[data-preview]").hidden = false;
    $("[data-drop-empty]").hidden = true;
    drop.classList.add("has-file");
    if (!form.title.value) form.title.value = file.name.replace(/\.[^.]+$/, "").replace(/[_-]+/g, " ").trim().slice(0, 120);
  }

  fileInput.addEventListener("change", () => pick(fileInput.files[0]));
  ["dragenter", "dragover"].forEach(t => drop.addEventListener(t, () => drop.classList.add("over")));
  ["dragleave", "drop"].forEach(t => drop.addEventListener(t, () => drop.classList.remove("over")));

  function resetForm() {
    form.reset();
    prepared = null;
    $("[data-preview]").hidden = true;
    $("[data-drop-empty]").hidden = false;
    drop.classList.remove("has-file");
    $("[data-year]").value = new Date().getFullYear();
  }

  /* ---------- Upload ---------- */
  form.addEventListener("submit", e => {
    e.preventDefault();
    if (!prepared) return toast("Choose an image first.", true);
    if (!form.title.value.trim()) { form.title.focus(); return toast("Give the work a title.", true); }

    const fd = new FormData();
    for (const k of ["title", "series", "year", "medium", "description"]) fd.append(k, form[k].value.trim());
    fd.append("status", form.status.value);
    fd.append("width", prepared.width);
    fd.append("height", prepared.height);
    fd.append("image", prepared.image, prepared.name);
    fd.append("thumb", prepared.thumb, "thumb.jpg");

    const btn = $("[data-submit]");
    const bar = $("[data-bar]");
    const progress = $("[data-progress]");
    const text = $("[data-progress-text]");
    btn.disabled = true;
    progress.hidden = false;
    bar.style.width = "0%";
    text.textContent = "Uploading…";

    const xhr = new XMLHttpRequest();
    xhr.open("POST", "/api/works");
    xhr.setRequestHeader("authorization", `Bearer ${token}`);
    xhr.upload.onprogress = ev => {
      if (!ev.lengthComputable) return;
      const p = Math.round((ev.loaded / ev.total) * 100);
      bar.style.width = p + "%";
      text.textContent = p < 100 ? `Uploading… ${p}%` : "Saving…";
    };
    xhr.onload = () => {
      btn.disabled = false;
      progress.hidden = true;
      let data = {};
      try { data = JSON.parse(xhr.responseText); } catch {}
      if (xhr.status === 401) { text.textContent = ""; signOut(); return toast("Please sign in again.", true); }
      if (xhr.status !== 201) { text.textContent = ""; return toast(data.error || `Upload failed (${xhr.status})`, true); }
      text.textContent = "";
      const w = data.work;
      resetForm();
      toast(`"${w.title}" is live on the gallery.`);
      loadMine();
    };
    xhr.onerror = () => {
      btn.disabled = false;
      progress.hidden = true;
      text.textContent = "";
      toast("Upload failed. Check your connection and try again.", true);
    };
    xhr.send(fd);
  });

  /* ---------- Your uploads ---------- */
  async function loadMine() {
    let works = [];
    try {
      works = (await api("/api/works")).works || [];
    } catch (ex) {
      return toast(ex.message, true);
    }
    const series = [...new Set(works.map(w => w.series).filter(Boolean))];
    const dl = $("[data-series-list]");
    dl.textContent = "";
    for (const s of ["New Works", ...series.filter(s => s !== "New Works")]) {
      const o = document.createElement("option");
      o.value = s;
      dl.append(o);
    }

    const mine = works.filter(w => w.source === "studio");
    const list = $("[data-list]");
    list.textContent = "";
    list.hidden = !mine.length;
    $("[data-nothing]").hidden = !!mine.length;

    for (const w of mine) {
      const li = document.createElement("li");
      li.className = "item";
      const img = document.createElement("img");
      img.src = w.thumb;
      img.alt = "";
      img.loading = "lazy";
      const text = document.createElement("div");
      const t = document.createElement("div");
      t.className = "t";
      t.textContent = w.title;
      const s = document.createElement("div");
      s.className = "s";
      s.textContent = [w.series, w.status === "wip" ? "In progress" : "Finished", new Date(w.createdAt).toLocaleDateString()].join(" · ");
      text.append(t, s);

      const controls = document.createElement("div");
      controls.className = "controls";
      const toggle = document.createElement("button");
      toggle.type = "button";
      toggle.className = "btn btn-line btn-sm";
      toggle.textContent = w.status === "wip" ? "Mark finished" : "Mark in progress";
      toggle.addEventListener("click", async () => {
        toggle.disabled = true;
        try {
          await api(`/api/works/${w.id}`, {
            method: "PATCH",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ status: w.status === "wip" ? "finished" : "wip" }),
          });
          toast(w.status === "wip" ? `"${w.title}" marked finished.` : `"${w.title}" marked in progress.`);
          loadMine();
        } catch (ex) {
          toggle.disabled = false;
          toast(ex.message, true);
        }
      });
      const view = document.createElement("a");
      view.className = "btn btn-line btn-sm";
      view.href = `/#work=${encodeURIComponent(w.id)}`;
      view.textContent = "View";
      const del = document.createElement("button");
      del.type = "button";
      del.className = "btn btn-danger btn-sm";
      del.textContent = "Delete";
      del.addEventListener("click", async () => {
        if (!confirm(`Delete "${w.title}" from the gallery? This can't be undone.`)) return;
        del.disabled = true;
        try {
          await api(`/api/works/${w.id}`, { method: "DELETE" });
          toast(`"${w.title}" deleted.`);
          loadMine();
        } catch (ex) {
          del.disabled = false;
          toast(ex.message, true);
        }
      });
      controls.append(toggle, view, del);
      li.append(img, text, controls);
      list.append(li);
    }
  }

  /* ---------- Start ---------- */
  $("[data-year]").value = new Date().getFullYear();
  token = store.get();
  if (!token) return showLogin();
  api("/api/session").then(showStudio, () => { if (studioView.hidden) showLogin(); });
})();
