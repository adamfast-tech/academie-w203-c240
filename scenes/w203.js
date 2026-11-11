/* La berline W203 en « radiographie » : carrosserie translucide, organes cliquables. Code original ; rendu par three.js (MIT). */
import { THREE, createStage, cssVar, reduced } from './kit.js';

/* Cotes en décimètres : longueur 45,3 · largeur 17,3 · hauteur 14,3 · empattement 27,15. Avant vers +x, gauche vers -z. */
const FA = 14.7, RA = -12.45, WR = 3.16, TRACK = 7.5, HW = 8.65;
const SYS = [
  ['m112', 'Moteur', [15.2, 9.6, 0]], ['boite', 'Boîte et transmission', [4, 4.6, 0]], ['freinage', 'Freins', [FA, 3.4, 9.2]],
  ['suspension', 'Trains roulants', [RA, 7.4, 8]], ['direction', 'Direction', [6.2, 10.4, -3.8]], ['elec-w203', 'Électricité', [9.6, 9.2, 5.6]],
  ['clim', 'Climatisation', [21.6, 6.4, -3]], ['carrosserie', 'Carrosserie', [-4, 14.6, 0]]
];

export function mount(el) {
  const host = el.querySelector('[data-stage]'); host.innerHTML = '';
  const st = createStage(host, { target: [0, 6.2, 0], radius: 74, fov: 24, az: 0.75, el: 0.24, minEl: 0.02, maxEl: 1.4, label: 'Maquette 3D de la Mercedes C 240 W203, carrosserie transparente' });
  const { scene } = st;
  const ink = new THREE.Color(cssVar('--ink', '#13181E')), accent = new THREE.Color(cssVar('--accent', '#1C5797')).lerp(new THREE.Color(0x4da3ff), 0.35);
  const std = (color, o) => new THREE.MeshStandardMaterial(Object.assign({ color, metalness: 0.7, roughness: 0.4 }, o || {}));
  const M = {
    body: new THREE.MeshStandardMaterial({ color: 0xc3ccd6, metalness: 0.85, roughness: 0.25, transparent: true, opacity: 0.3, depthWrite: false, side: THREE.DoubleSide }),
    glass: new THREE.MeshStandardMaterial({ color: 0x8fb4d8, metalness: 0.2, roughness: 0.1, transparent: true, opacity: 0.16, depthWrite: false, side: THREE.DoubleSide }),
    line: new THREE.LineBasicMaterial({ color: ink, transparent: true, opacity: 0.55 }),
    tire: std(0x16191d, { metalness: 0.1, roughness: 0.85 }), rim: std(0xc9d0d8, { roughness: 0.3 }),
    m112: std(0x9aa3ad), boite: std(0x7f8892), freinage: std(0xb9412f, { metalness: 0.4 }), disc: std(0xaeb5bd, { roughness: 0.35 }),
    suspension: std(0x5d6670), direction: std(0x8a7a4a), 'elec-w203': std(0x2f3a48, { metalness: 0.3 }), clim: std(0x6f8fa8, { metalness: 0.5 }), lamp: std(0xfff3c4, { emissive: 0xffd66b, emissiveIntensity: 0.5, metalness: 0.1 })
  };
  const HI = { m112: [M.m112], boite: [M.boite], freinage: [M.freinage, M.disc], suspension: [M.suspension], direction: [M.direction], 'elec-w203': [M['elec-w203'], M.lamp], clim: [M.clim], carrosserie: [M.body] };
  const car = new THREE.Group(); scene.add(car);
  const add = (geo, mat, part, x, y, z) => { const m = new THREE.Mesh(geo, mat); m.position.set(x || 0, y || 0, z || 0); if (part) m.userData.part = part; car.add(m); return m; };
  const cz = (r, len, seg, r2) => new THREE.CylinderGeometry(r2 == null ? r : r2, r, len, seg || 24).rotateX(Math.PI / 2);
  const cx = (r, len, seg, r2) => new THREE.CylinderGeometry(r2 == null ? r : r2, r, len, seg || 24).rotateZ(Math.PI / 2);

  /* ---- Carrosserie : profil extrudé, avec arêtes façon plan ---- */
  const lower = new THREE.Shape();
  lower.moveTo(18.5, 2); lower.lineTo(21.6, 2); lower.quadraticCurveTo(22.7, 2.3, 22.65, 4.4); lower.quadraticCurveTo(22.6, 6.4, 21.6, 7); 
  lower.quadraticCurveTo(15, 8.9, 9.4, 9.5); lower.lineTo(-15.2, 10.4); lower.quadraticCurveTo(-20, 10.5, -22.2, 10.1); lower.quadraticCurveTo(-22.8, 8, -22.6, 4.6); lower.quadraticCurveTo(-22.5, 2.3, -21.4, 2);
  lower.lineTo(RA - 3.8, 2); lower.absarc(RA, 3.15, 3.95, Math.PI + 0.3, -0.3, true); lower.lineTo(FA - 3.8, 2); lower.absarc(FA, 3.15, 3.95, Math.PI + 0.3, -0.3, true); lower.lineTo(18.5, 2);
  const cabin = new THREE.Shape();
  cabin.moveTo(9.4, 9.5); cabin.quadraticCurveTo(5.4, 12.6, 2.2, 13.8); cabin.quadraticCurveTo(-2.5, 14.5, -8.2, 13.7); cabin.quadraticCurveTo(-12.4, 12.4, -15.2, 10.4); cabin.lineTo(9.4, 9.5);
  const ext = (shape, w, bevel) => { const g = new THREE.ExtrudeGeometry(shape, { depth: w - 2 * bevel, bevelEnabled: true, bevelThickness: bevel, bevelSize: bevel * 0.8, bevelSegments: 3, curveSegments: 18 }); g.translate(0, 0, -(w - 2 * bevel) / 2); return g; };
  const shell = (geo, mat) => { const m = add(geo, mat, 'carrosserie'); m.renderOrder = 2; const e = new THREE.LineSegments(new THREE.EdgesGeometry(geo, 28), M.line); e.renderOrder = 3; car.add(e); return m; };
  shell(ext(lower, HW * 2, 1.1), M.body); shell(ext(cabin, 14.6, 1.3), M.glass);
  [-1, 1].forEach((s) => { add(new THREE.SphereGeometry(0.75, 14, 10).scale(0.5, 0.8, 1.7), M.lamp, 'elec-w203', 22.1, 6.2, s * 6.1); add(new THREE.BoxGeometry(0.3, 1.5, 3), std(0xc0392b, { emissive: 0x7a1408, metalness: 0.1 }), 'elec-w203', -22.5, 8.6, s * 6.4); });

  /* ---- Roues, freins, trains ---- */
  const helix = (r, h, turns) => { const P = []; for (let i = 0; i <= turns * 14; i++) { const a = i / 14 * 2 * Math.PI; P.push(new THREE.Vector3(r * Math.cos(a), h * i / (turns * 14), r * Math.sin(a))); } return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(P), turns * 20, 0.16, 6); };
  const wheels = [];
  [[FA, 1], [FA, -1], [RA, 1], [RA, -1]].forEach(([x, s]) => {
    const w = new THREE.Group(); w.position.set(x, WR, s * TRACK); car.add(w); wheels.push(w);
    const t = new THREE.Mesh(new THREE.TorusGeometry(WR - 0.75, 0.78, 14, 40).scale(1, 1, 1.35), M.tire); w.add(t);
    const r = new THREE.Mesh(cz(2.05, 1.5, 32), M.rim); r.material = M.rim; w.add(r);
    for (let i = 0; i < 5; i++) { const sp = new THREE.Mesh(new THREE.BoxGeometry(0.5, 2.3, 0.3), M.rim); sp.position.set(1.15 * Math.sin(i * 1.2566), 1.15 * Math.cos(i * 1.2566), s * 0.8); sp.rotation.z = -i * 1.2566; w.add(sp); }
    const d = new THREE.Mesh(cz(1.9, 0.28, 32), M.disc); d.position.z = -s * 1.1; d.userData.part = 'freinage'; w.add(d);
    add(new THREE.BoxGeometry(1.5, 1.2, 0.9), M.freinage, 'freinage', x + (x > 0 ? -1.5 : 1.5), WR + 0.4, s * (TRACK - 1.1));
    add(helix(0.75, 3.6, 5), M.suspension, 'suspension', x, WR + 1.6, s * (TRACK - 2.3));
    add(new THREE.CylinderGeometry(0.28, 0.28, 4.6, 10), M.suspension, 'suspension', x, WR + 3.4, s * (TRACK - 2.3));
    const arm = add(new THREE.BoxGeometry(0.5, 0.35, 4.6), M.suspension, 'suspension', x, WR - 0.9, s * (TRACK - 3.2)); arm.rotation.x = s * 0.08;
    const arm2 = add(new THREE.BoxGeometry(3.4, 0.35, 0.5), M.suspension, 'suspension', x - 1.4, WR - 0.9, s * (TRACK - 4.4)); arm2.rotation.y = s * 0.5;
  });
  add(cz(0.28, TRACK * 2 - 3, 8), M.suspension, 'suspension', FA + 2.6, 2.6, 0); add(cz(0.25, TRACK * 2 - 3, 8), M.suspension, 'suspension', RA - 2.4, 2.8, 0);

  /* ---- Groupe motopropulseur : V6 longitudinal, boîte, arbre, pont ---- */
  add(new THREE.BoxGeometry(6.2, 2.6, 3.6), M.m112, 'm112', 15.2, 4.3, 0);
  [-1, 1].forEach((s) => { const b = add(new THREE.BoxGeometry(6, 3.6, 2.3), M.m112, 'm112', 15.2, 6.5, s * 1.9); b.rotation.x = s * Math.PI / 4; const c = add(new THREE.BoxGeometry(6.1, 0.8, 2.5), std(0x2b3037, { metalness: 0.4 }), 'm112', 15.2, 7.95, s * 3.35); c.rotation.x = s * Math.PI / 4; });
  add(new THREE.BoxGeometry(4.6, 1.4, 3), std(0x4a515a, { metalness: 0.3, roughness: 0.7 }), 'm112', 15, 8.4, 0);
  add(cx(1, 0.5, 20), M.m112, 'm112', 18.6, 4.2, 0);
  add(cx(2.1, 1.6, 24), M.boite, 'boite', 11.3, 4.4, 0); add(cx(1.9, 5.2, 24, 1.05), M.boite, 'boite', 7.9, 4.3, 0); add(new THREE.BoxGeometry(3.4, 0.5, 2.6), M.boite, 'boite', 8.6, 2.9, 0);
  add(cx(0.36, 15.6, 12), M.boite, 'boite', -2.6, 3.9, 0); add(new THREE.SphereGeometry(1.5, 20, 14).scale(1.2, 1, 1.1), M.boite, 'boite', RA + 0.6, 3.6, 0);
  add(cz(0.3, TRACK * 2 - 2.4, 10), M.boite, 'boite', RA, WR, 0);
  /* ---- Direction, électricité, climatisation ---- */
  add(cz(0.4, 11.4, 12), M.direction, 'direction', FA - 1.9, 3, 0);
  const col = add(new THREE.CylinderGeometry(0.2, 0.2, 9.4, 8), M.direction, 'direction', 9.2, 6.8, -3.8); col.rotation.z = 1.05;
  const sw = add(new THREE.TorusGeometry(1.45, 0.2, 8, 28), M.direction, 'direction', 5.1, 9.2, -3.8); sw.rotation.y = Math.PI / 2; sw.rotation.z = 0; sw.rotation.x = 0; sw.rotateZ(-0.45);
  add(new THREE.BoxGeometry(2.6, 1.8, 1.7), M['elec-w203'], 'elec-w203', 10.2, 7.3, 5.4); add(cz(0.16, 0.5, 8), M.lamp, 'elec-w203', 10.8, 8.3, 5.4);
  add(cx(0.8, 1.6, 16), M['elec-w203'], 'elec-w203', 17.6, 5.6, 2.6);
  add(new THREE.BoxGeometry(0.35, 3.6, 11.5), M.clim, 'clim', 21, 5, 0); add(cx(0.75, 1.9, 16), M.clim, 'clim', 17.8, 3.6, -2.6);
  add(new THREE.BoxGeometry(2, 2.2, 6), M.clim, 'clim', 8, 7.6, 1.2);
  /* Sol : ombre douce */
  const sh = document.createElement('canvas'); sh.width = sh.height = 128; const g2 = sh.getContext('2d'), gr = g2.createRadialGradient(64, 64, 8, 64, 64, 64); gr.addColorStop(0, 'rgba(0,0,0,.34)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); g2.fillStyle = gr; g2.fillRect(0, 0, 128, 128);
  const shadow = new THREE.Mesh(new THREE.PlaneGeometry(62, 30), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(sh), transparent: true, depthWrite: false })); shadow.rotation.x = -Math.PI / 2; shadow.position.y = 0.02; car.add(shadow);

  /* ---- Repères cliquables ---- */
  const mods = (window.W203 && window.W203.modules) || [], ui = el.querySelector('[data-ui]'), layer = document.createElement('div'); layer.className = 'hot3d'; host.appendChild(layer);
  const dots = SYS.map(([id, label, pos]) => { const b = document.createElement('button'); b.type = 'button'; b.className = 'hot3d-dot'; b.dataset.sys = id; b.setAttribute('aria-label', label); b.innerHTML = `<span>${label}</span>`; layer.appendChild(b); b.addEventListener('click', () => choose(id)); return { id, b, v: new THREE.Vector3(...pos) }; });
  ui.innerHTML = `<div class="vchips" role="group" aria-label="Systèmes de la voiture">${SYS.map(([id, label]) => `<button class="vbtn sm" type="button" data-sys="${id}" aria-pressed="false">${label}</button>`).join('')}</div><div class="hot3d-card" data-card aria-live="polite"><p class="viz-note">Glisse pour tourner la voiture. Touche un organe ou un repère pour ouvrir son module.</p></div>`;
  ui.querySelectorAll('[data-sys]').forEach((b) => b.addEventListener('click', () => choose(b.dataset.sys)));
  let sel = null, spin = !reduced(), pulse = 0, idle = 0;
  function choose(id) {
    sel = sel === id ? null : id; spin = false;
    el.querySelectorAll('[data-sys]').forEach((b) => { const on = b.dataset.sys === sel; b.classList.toggle('sel', on); if (b.hasAttribute('aria-pressed')) b.setAttribute('aria-pressed', on ? 'true' : 'false'); });
    const m = mods.find((x) => x.id === sel), card = ui.querySelector('[data-card]');
    card.innerHTML = m ? `<div><p class="eyebrow">${m.code} · ${m.lessons.length} leçons</p><b>${m.title}</b><p>${m.desc}</p></div><a class="btn small" href="#m-${m.id}">Ouvrir le module</a>` : '<p class="viz-note">Glisse pour tourner la voiture. Touche un organe ou un repère pour ouvrir son module.</p>';
    st.refresh();
  }
  const ray = new THREE.Raycaster();
  st.onTap((ndc) => { ray.setFromCamera(ndc, st.camera); const hits = ray.intersectObjects(car.children, true).filter((h) => h.object.userData.part); if (!hits.length) return; const h = hits.find((x) => x.object.userData.part !== 'carrosserie') || hits[0]; if (h.object.userData.part !== sel) choose(h.object.userData.part); });
  st.canvas.addEventListener('pointerdown', () => { spin = false; });
  const p = new THREE.Vector3();
  st.onFrame((dt, real) => {
    if (spin) { st.orbit.taz += dt * 0.16; st.orbit.az = st.orbit.taz; }
    wheels.forEach((w) => { w.rotation.z -= dt * (spin ? 1.2 : 0); });
    pulse += real || 0.016;
    Object.keys(HI).forEach((k) => HI[k].forEach((m) => { if (k === sel) m.emissive.copy(accent).multiplyScalar(0.55 + 0.3 * Math.sin(pulse * 4)); else if (m !== M.lamp) m.emissive.setHex(0); else m.emissive.setHex(0xffd66b); }));
    M.body.opacity = sel === 'carrosserie' ? 0.7 : 0.3;
    const w = host.clientWidth, h = host.clientHeight;
    dots.forEach((d) => { d.b.classList.toggle('sel', d.id === sel); p.copy(d.v).project(st.camera); d.b.style.transform = `translate(${((p.x + 1) / 2 * w).toFixed(1)}px,${((1 - p.y) / 2 * h).toFixed(1)}px)`; d.b.style.zIndex = String(1000 - Math.round(p.z * 1000) + 10); });
    return !!sel;
  });
  st.refresh();
  return st;
}
