// Hero: Victor's artworks as framed pieces spiralling through a dark studio.
import * as THREE from "three";

const canvas = document.getElementById("scene");
const hero = canvas.closest(".hero");
const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;

function supportsWebGL() {
  try { const c = document.createElement("canvas"); return !!(c.getContext("webgl2") || c.getContext("webgl")); } catch { return false; }
}

async function start() {
  if (!supportsWebGL()) { document.documentElement.classList.add("no-webgl"); return; }
  const art = await (await fetch("assets/art/art.json")).json();

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false, powerPreference: "high-performance" });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.setClearColor(0x07080b, 1);

  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0x07080b, 9, 20);
  const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 60);
  camera.position.set(0, 0, 11);

  const helix = new THREE.Group();
  scene.add(helix);
  const loader = new THREE.TextureLoader();
  const matMat = new THREE.MeshBasicMaterial({ color: 0xf2efe9 });
  const backMat = new THREE.MeshBasicMaterial({ color: 0x0c0e13 });

  const N = art.length;
  const R = 3.7;
  const frames = [];
  art.forEach((a, i) => {
    const h = 1.55, w = h * (a.w / a.h);
    const g = new THREE.Group();
    const mat = new THREE.Mesh(new THREE.PlaneGeometry(w + 0.18, h + 0.18), matMat);
    const back = new THREE.Mesh(new THREE.PlaneGeometry(w + 0.18, h + 0.18), backMat);
    back.rotation.y = Math.PI; back.position.z = -0.01;
    const tex = loader.load(a.src);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 4;
    const pic = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: tex }));
    pic.position.z = 0.006;
    g.add(back, mat, pic);
    const ang = i * (Math.PI * 2 / 6.3);
    g.position.set(Math.sin(ang) * R, (i - (N - 1) / 2) * 0.62, Math.cos(ang) * R);
    g.lookAt(0, g.position.y, 0);
    g.rotateY(Math.PI);
    helix.add(g);
    frames.push(g);
  });

  // drifting dust in the studio light
  const P = 900, pos = new Float32Array(P * 3);
  for (let i = 0; i < P; i++) {
    pos[i * 3] = (Math.random() - 0.5) * 26;
    pos[i * 3 + 1] = (Math.random() - 0.5) * 18;
    pos[i * 3 + 2] = (Math.random() - 0.5) * 16 - 2;
  }
  const dustGeo = new THREE.BufferGeometry();
  dustGeo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  const dust = new THREE.Points(dustGeo, new THREE.PointsMaterial({ color: 0x7cc4f8, size: 0.035, transparent: true, opacity: 0.55, depthWrite: false }));
  scene.add(dust);

  // a soft halo ring behind the helix
  const ring = new THREE.Mesh(new THREE.RingGeometry(4.6, 4.64, 128), new THREE.MeshBasicMaterial({ color: 0x4c84f0, transparent: true, opacity: 0.18, side: THREE.DoubleSide }));
  ring.rotation.x = Math.PI / 2.25;
  helix.add(ring);

  let mobile = false;
  function resize() {
    const w = hero.clientWidth, h = hero.clientHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    mobile = w < 900;
    helix.position.set(mobile ? 0 : 4.8, mobile ? -0.4 : 0, mobile ? -3.5 : -0.5);
    helix.scale.setScalar(mobile ? 0.9 : 0.88);
  }
  resize();
  addEventListener("resize", resize);

  const mouse = { x: 0, y: 0, tx: 0, ty: 0 };
  addEventListener("pointermove", e => { mouse.tx = e.clientX / innerWidth - 0.5; mouse.ty = e.clientY / innerHeight - 0.5; }, { passive: true });

  let visible = true;
  new IntersectionObserver(([en]) => { visible = en.isIntersecting; if (visible) tick(); }, { threshold: 0 }).observe(hero);

  const clock = new THREE.Clock();
  let spin = 0, raf = 0;
  function tick() {
    cancelAnimationFrame(raf);
    if (!visible) return;
    raf = requestAnimationFrame(tick);
    const dt = Math.min(clock.getDelta(), 0.05);
    const scroll = Math.min(1, scrollY / innerHeight);
    spin += dt * (reduce ? 0 : 0.16 + scroll * 0.5);
    helix.rotation.y = spin;
    helix.position.y = (mobile ? -0.4 : 0) + scroll * 3.2;
    mouse.x += (mouse.tx - mouse.x) * 0.05;
    mouse.y += (mouse.ty - mouse.y) * 0.05;
    camera.position.x = mouse.x * 1.6;
    camera.position.y = -mouse.y * 1.1;
    camera.lookAt(helix.position.x * 0.55, helix.position.y * 0.4, 0);
    dust.rotation.y += dt * 0.02;
    dust.position.y = Math.sin(clock.elapsedTime * 0.2) * 0.3;
    // gentle bob on each frame
    frames.forEach((f, i) => { f.children[2].position.z = 0.006 + Math.sin(clock.elapsedTime * 1.2 + i) * 0.002; });
    renderer.render(scene, camera);
  }
  tick();
}

start().catch(() => document.documentElement.classList.add("no-webgl"));
