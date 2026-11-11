/* Socle commun des scènes 3D de l'Académie W203 : rendu, orbite, pause hors écran, nettoyage. */
import * as THREE from '../vendor/three-0.170.0.module.min.js';
export { THREE };

const RM = matchMedia('(prefers-reduced-motion: reduce)');
export const reduced = () => RM.matches;
export const cssVar = (n, fb) => (getComputedStyle(document.documentElement).getPropertyValue(n).trim() || fb);

/* Fusionne des géométries (avec leur matrice) en une seule : un seul appel de dessin par matériau. */
export function merge(list) {
  const pos = [], nor = [], col = [], names = []; let tri = 0, tinted = false; const c = new THREE.Color();
  list.forEach((it) => {
    const src = Array.isArray(it) ? it[0] : it, mat = Array.isArray(it) ? it[1] : null, name = Array.isArray(it) ? it[2] : null, hex = Array.isArray(it) ? it[3] : null;
    const g = src.index ? src.toNonIndexed() : src.clone(); if (mat) g.applyMatrix4(mat);
    if (!g.attributes.normal) g.computeVertexNormals();
    const n = g.attributes.position.count; pos.push(g.attributes.position.array); nor.push(g.attributes.normal.array);
    c.set(hex == null ? 0xffffff : hex); if (hex != null) tinted = true; const ca = new Float32Array(n * 3); for (let i = 0; i < n; i++) { ca[i * 3] = c.r; ca[i * 3 + 1] = c.g; ca[i * 3 + 2] = c.b; } col.push(ca);
    tri += n / 3; if (name) names.push([tri, name]); else if (names.length) names.push([tri, null]);
    g.dispose(); if (src !== g) src.dispose();
  });
  const cat = (arrs) => { const n = arrs.reduce((a, x) => a + x.length, 0), out = new Float32Array(n); let o = 0; arrs.forEach((x) => { out.set(x, o); o += x.length; }); return out; };
  const out = new THREE.BufferGeometry(); out.setAttribute('position', new THREE.BufferAttribute(cat(pos), 3)); out.setAttribute('normal', new THREE.BufferAttribute(cat(nor), 3));
  if (tinted) out.setAttribute('color', new THREE.BufferAttribute(cat(col), 3));
  out.userData.names = names; return out;
}
/* Nom de la pièce touchée dans une géométrie fusionnée (d'après l'indice du triangle). */
export function nameAt(geo, face) { const n = geo.userData.names || []; for (let i = 0; i < n.length; i++) if (face < n[i][0]) return n[i][1]; return null; }
/* Barre ou tuyau droit entre deux points. */
export function seg(a, b, r, sides) {
  const A = new THREE.Vector3(...a), B = new THREE.Vector3(...b), d = B.clone().sub(A), len = d.length();
  const m = new THREE.Matrix4().compose(A.clone().add(B).multiplyScalar(0.5), new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize()), new THREE.Vector3(1, 1, 1));
  return [new THREE.CylinderGeometry(r, r, len, sides || 8), m];
}
/* Tuyau courbe passant par des points. */
export function tube(pts, r, closed) { const c = new THREE.CatmullRomCurve3(pts.map((p) => new THREE.Vector3(...p)), !!closed, 'centripetal'); return new THREE.TubeGeometry(c, Math.max(8, pts.length * 7), r, 7, !!closed); }
/* Matrice de pose : position, rotation (Euler XYZ), échelle. */
export function at(x, y, z, rx, ry, rz, sx, sy, sz) { return new THREE.Matrix4().compose(new THREE.Vector3(x || 0, y || 0, z || 0), new THREE.Quaternion().setFromEuler(new THREE.Euler(rx || 0, ry || 0, rz || 0)), new THREE.Vector3(sx == null ? 1 : sx, sy == null ? (sx == null ? 1 : sx) : sy, sz == null ? (sx == null ? 1 : sx) : sz)); }

/* Environnement de reflets : un studio à boîtes à lumière, sans fichier externe. */
function studioEnv(renderer) {
  const sc = new THREE.Scene();
  sc.add(new THREE.Mesh(new THREE.BoxGeometry(60, 40, 60), new THREE.MeshBasicMaterial({ color: 0x737b86, side: THREE.BackSide })));
  const panel = (x, y, z, w, h, c, k) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: new THREE.Color(c).multiplyScalar(k || 1), side: THREE.DoubleSide })); m.position.set(x, y, z); m.lookAt(0, 0, 0); sc.add(m); };
  panel(0, 19.5, 0, 34, 12, 0xffffff, 3.2); panel(0, 19.5, 16, 40, 5, 0xffffff, 2.2); panel(0, 19.5, -16, 40, 5, 0xffffff, 2.2);
  panel(-29, 6, 0, 30, 9, 0xe4edf8, 1.6); panel(29, 6, 0, 30, 9, 0xfff3e2, 1.6); panel(0, 5, 29, 30, 8, 0xdfe6ee, 1.2); panel(0, 5, -29, 30, 8, 0xdfe6ee, 1.2);
  panel(0, -19.5, 0, 60, 60, 0x1c2026, 1);
  const pm = new THREE.PMREMGenerator(renderer); const tex = pm.fromScene(sc, 0.02).texture; pm.dispose();
  sc.traverse((o) => { if (o.geometry) o.geometry.dispose(); if (o.material) o.material.dispose(); });
  return tex;
}

/* createStage(host, opts) → { scene, camera, renderer, orbit, onFrame, onTap, play, pause, on, view } */
export function createStage(host, opts) {
  const o = Object.assign({ fov: 32, target: [0, 0, 0], radius: 100, az: 0.6, el: 0.35, minEl: -0.2, maxEl: 1.45, autoplay: true, zoom: [0.6, 1.6] }, opts || {});
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
  renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.15;
  const cv = renderer.domElement; cv.className = 'stage3d-canvas'; cv.setAttribute('role', 'img'); if (o.label) cv.setAttribute('aria-label', o.label);
  host.appendChild(cv);
  const scene = new THREE.Scene(); scene.environment = studioEnv(renderer);
  const camera = new THREE.PerspectiveCamera(o.fov, 1, 1, 2000);
  const key = new THREE.DirectionalLight(0xffffff, 1.6); key.position.set(40, 80, 60); scene.add(key);
  scene.add(new THREE.HemisphereLight(0xffffff, 0x2a3038, 0.55));

  const orbit = { az: o.az, el: o.el, zoom: 1, taz: o.az, tel: o.el, tzoom: 1, target: new THREE.Vector3(...o.target) };
  const place = () => {
    const r = o.radius * orbit.zoom * (camera.aspect < 1 ? Math.min(1.9, 1 / camera.aspect) : 1), ce = Math.cos(orbit.el);
    camera.position.set(orbit.target.x + r * ce * Math.sin(orbit.az), orbit.target.y + r * Math.sin(orbit.el), orbit.target.z + r * ce * Math.cos(orbit.az));
    camera.lookAt(orbit.target);
  };
  const clampEl = (v) => Math.max(o.minEl, Math.min(o.maxEl, v));
  const view = (az, el, zoom) => { let d = az - orbit.az; d = ((d + Math.PI) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI) - Math.PI; orbit.taz = orbit.az + d; orbit.tel = clampEl(el); if (zoom) orbit.tzoom = zoom; dirty = true; kick(); };

  /* Orbite : la souris tourne sur deux axes ; au doigt, le glissement horizontal tourne et le vertical laisse défiler la page. */
  let drag = null, moved = 0, dirty = true; const taps = [], frames = [];
  const pts = new Map();
  cv.addEventListener('pointerdown', (e) => { pts.set(e.pointerId, [e.clientX, e.clientY]); drag = [e.clientX, e.clientY]; moved = 0; try { cv.setPointerCapture(e.pointerId); } catch (x) { /* ignoré */ } });
  cv.addEventListener('pointermove', (e) => {
    if (!pts.has(e.pointerId)) return;
    if (pts.size === 2) {
      const a = [...pts.values()], d0 = Math.hypot(a[0][0] - a[1][0], a[0][1] - a[1][1]); pts.set(e.pointerId, [e.clientX, e.clientY]);
      const b = [...pts.values()], d1 = Math.hypot(b[0][0] - b[1][0], b[0][1] - b[1][1]);
      if (d0 > 0) orbit.tzoom = Math.max(o.zoom[0], Math.min(o.zoom[1], orbit.tzoom * d0 / d1)); moved = 99; dirty = true; kick(); return;
    }
    const dx = e.clientX - drag[0], dy = e.clientY - drag[1]; drag = [e.clientX, e.clientY]; pts.set(e.pointerId, drag); moved += Math.abs(dx) + Math.abs(dy);
    orbit.taz -= dx * 0.008; if (e.pointerType === 'mouse') orbit.tel = clampEl(orbit.tel + dy * 0.006); dirty = true; kick();
  });
  const up = (e) => { if (!pts.has(e.pointerId)) return; pts.delete(e.pointerId); if (e.type === 'pointerup' && moved < 6) { const r = cv.getBoundingClientRect(); const ndc = new THREE.Vector2(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1); taps.forEach((f) => f(ndc)); } };
  cv.addEventListener('pointerup', up); cv.addEventListener('pointercancel', up);
  cv.addEventListener('wheel', (e) => { if (!e.ctrlKey && !e.metaKey) return; e.preventDefault(); orbit.tzoom = Math.max(o.zoom[0], Math.min(o.zoom[1], orbit.tzoom * (1 + e.deltaY * 0.002))); dirty = true; kick(); }, { passive: false });
  cv.tabIndex = 0;
  cv.addEventListener('keydown', (e) => { const k = e.key; if (k === 'ArrowLeft') orbit.taz -= 0.2; else if (k === 'ArrowRight') orbit.taz += 0.2; else if (k === 'ArrowUp') orbit.tel = clampEl(orbit.tel + 0.12); else if (k === 'ArrowDown') orbit.tel = clampEl(orbit.tel - 0.12); else if (k === '+' || k === '=') orbit.tzoom = Math.max(o.zoom[0], orbit.tzoom * 0.9); else if (k === '-') orbit.tzoom = Math.min(o.zoom[1], orbit.tzoom * 1.1); else return; e.preventDefault(); dirty = true; kick(); });

  const size = () => { const w = host.clientWidth || 1, h = host.clientHeight || 1; renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix(); dirty = true; kick(); };
  const ro = new ResizeObserver(size); ro.observe(host);

  let raf = 0, vis = true, on = !!o.autoplay && !reduced(), last = 0, dead = false;
  const tick = (now) => {
    raf = 0; if (dead) return;
    if (!host.isConnected) { dispose(); return; }
    const dt = last ? Math.min(0.05, (now - last) / 1000) : 0; last = now;
    const k = 1 - Math.pow(0.001, dt || 0.016);
    orbit.az += (orbit.taz - orbit.az) * k; orbit.el += (orbit.tel - orbit.el) * k; orbit.zoom += (orbit.tzoom - orbit.zoom) * k;
    const settling = Math.abs(orbit.taz - orbit.az) + Math.abs(orbit.tel - orbit.el) + Math.abs(orbit.tzoom - orbit.zoom) > 0.0005;
    let busy = false; frames.forEach((f) => { if (f(on ? dt : 0, dt) === true) busy = true; });
    place(); renderer.render(scene, camera); dirty = false;
    if (vis && (on || settling || busy || dirty)) raf = requestAnimationFrame(tick); else last = 0;
  };
  function kick() { if (!raf && vis && !dead) raf = requestAnimationFrame(tick); }
  const io = new IntersectionObserver((es) => { if (!host.isConnected) { dispose(); return; } vis = es[0].isIntersecting; kick(); }); io.observe(host);
  function dispose() {
    if (dead) return; dead = true; io.disconnect(); ro.disconnect();
    scene.traverse((ob) => { if (ob.geometry) ob.geometry.dispose(); const m = ob.material; if (m) (Array.isArray(m) ? m : [m]).forEach((x) => { if (x.map) x.map.dispose(); x.dispose(); }); });
    if (scene.environment) scene.environment.dispose(); renderer.dispose(); renderer.forceContextLoss(); cv.remove();
  }
  size();
  return {
    THREE, scene, camera, renderer, orbit, canvas: cv, view, dispose,
    onFrame(f) { frames.push(f); }, onTap(f) { taps.push(f); },
    refresh() { dirty = true; kick(); },
    play() { on = true; kick(); }, pause() { on = false; }, get on() { return on; }
  };
}
