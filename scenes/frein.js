/* Frein à disque avant à étrier flottant : fonctionnement, usure et démontage pas à pas.
   Maquette pédagogique procédurale, code original ; rendu par three.js (MIT). Cotes en centimètres, approximatives. */
import { THREE, createStage, cssVar, reduced, merge, at, seg, tube, nameAt } from './kit.js';

const RO = 15, RI = 8.6, HALF = 1.25, GAP = 0.15, BACK = 0.55, PAD_NEW = 1.2, PAD_MIN = 0.2;
const PARTS = {
  disque: ['Disque ventilé', 'Deux pistes séparées par des ailettes : l’air circule entre elles et évacue la chaleur. Il tourne avec la roue ; c’est lui que les plaquettes pincent.'],
  plaquettes: ['Plaquettes', 'Une garniture collée sur un support en acier, de chaque côté du disque. La garniture s’use : quand il n’en reste presque plus, le témoin touche le disque.'],
  etrier: ['Étrier flottant', 'Il coulisse sur deux vis de guidage. Le piston pousse la plaquette intérieure ; par réaction, l’étrier recule et tire la plaquette extérieure contre le disque.'],
  piston: ['Piston', 'Le liquide de frein sous pression le pousse hors de l’étrier. Plus les plaquettes s’usent, plus il reste sorti : c’est pour cela que le niveau baisse dans le réservoir.'],
  support: ['Support d’étrier', 'Fixé au porte-moyeu par deux vis. Il porte les plaquettes et encaisse l’effort de freinage ; l’étrier, lui, ne fait que serrer.'],
  guidage: ['Vis de guidage', 'Deux colonnettes sur lesquelles l’étrier coulisse, protégées par des soufflets. Grippées, elles font user une plaquette plus vite que l’autre.'],
  moyeu: ['Moyeu et porte-moyeu', 'Le disque est plaqué sur la face du moyeu. Une croûte de rouille sur cette face suffit à faire voiler un disque neuf.'],
  hydraulique: ['Flexible et purge', 'Le flexible amène le liquide de frein à l’étrier. La vis de purge, au point haut, sert à chasser l’air du circuit.'],
  temoin: ['Témoin d’usure', 'Une sonde clipsée dans la plaquette. Quand la garniture est usée, elle touche le disque et allume le voyant au tableau de bord.']
};

function ui(el, nm) {
  const parts = Object.keys(PARTS).map((k) => `<button class="vbtn sm" type="button" data-part="${k}" aria-pressed="false">${PARTS[k][0]}</button>`).join('');
  el.querySelector('[data-ui]').innerHTML = `
    <div class="viz-read"><div><small class="viz-note">Vitesse</small><br><b class="mono tnum" data-v></b></div><div><small class="viz-note">Disque</small><br><b class="mono tnum" data-t></b></div><div><small class="viz-note">Piston sorti de</small><br><b class="mono tnum" data-p></b></div><div><small class="viz-note">Garniture</small><br><b class="mono tnum" data-g></b></div></div>
    <label class="vrange"><span style="text-align:left;min-width:0">Pédale</span><input type="range" min="0" max="100" step="1" value="0" data-pedal aria-label="Effort sur la pédale de frein"><span class="mono tnum" data-pedalv></span></label>
    <label class="vrange"><span style="text-align:left;min-width:0">Usure</span><input type="range" min="0" max="100" step="1" value="0" data-wear aria-label="Usure des plaquettes"><span class="mono tnum" data-wearv></span></label>
    <div class="vchips" role="group" aria-label="Pièces du frein">${parts}</div>
    <p class="viz-desc" data-desc aria-live="polite">Appuie sur la pédale : le piston sort, l’étrier coulisse et les deux plaquettes pincent le disque.</p>
    <div class="vchips"><label class="vtoggle"><input type="checkbox" data-cut><span class="vtrack" aria-hidden="true"></span>Étrier en coupe</label>
      <span class="viz-note" style="margin-left:8px">Démontage</span><button class="vbtn sm" type="button" data-prev aria-label="Étape précédente">←</button><span class="vchip on" data-stepn></span><button class="vbtn sm" type="button" data-next aria-label="Étape suivante">→</button></div>
    <p class="viz-desc" data-step aria-live="polite"></p>
    <p class="viz-note">Maquette simplifiée : jeux et course du piston sont exagérés pour être visibles. Les couples sont ceux de la leçon ; vérifie-les avant serrage.</p>`;
  return [
    ['Monté', 'Frein en état de marche. Fais tourner, freine, use les plaquettes, puis démonte étape par étape.'],
    ['Vis de guidage', 'Roue déposée, voiture sur chandelles. Dépose les caches et les deux vis de guidage. Au remontage : ' + nm('25 N·m') + '.'],
    ['Étrier', 'Sors l’étrier et suspends-le à un crochet ou un fil. Jamais par le flexible.'],
    ['Plaquettes', 'Sors les plaquettes. Au remontage : graisse spéciale freins sur les zones de glissement, jamais sur les garnitures.'],
    ['Support d’étrier', 'Deux vis sur le porte-moyeu. Au remontage : ' + nm('115 N·m') + '.'],
    ['Disque', 'Petite vis de maintien, puis le disque. Brosse la face du moyeu jusqu’au métal propre avant de poser le disque neuf, dégraissé.']
  ];
}

export function mount(el) {
  const host = el.querySelector('[data-stage]'); host.innerHTML = '';
  const st = createStage(host, { target: [3, 0, -1], radius: 86, fov: 28, az: 0.95, el: 0.22, minEl: -0.6, maxEl: 1.3, fit: 1.25, label: 'Maquette 3D d’un frein à disque avant' });
  const nmChip = (window.W203 && window.W203.h && window.W203.h.nm) || ((t) => `<strong>${t}</strong>`);
  const STEPS = ui(el, nmChip);
  const { scene } = st;
  const vc = (o) => new THREE.MeshStandardMaterial(Object.assign({ color: 0xffffff, vertexColors: true, metalness: 0.7, roughness: 0.42 }, o || {}));
  const M = { disque: vc({ metalness: 0.95, roughness: 0.3 }), plaquettes: vc({ metalness: 0.3, roughness: 0.7 }), garn: new THREE.MeshStandardMaterial({ color: 0x3b3630, metalness: 0.1, roughness: 0.95 }),
    etrier: vc({ metalness: 0.6, roughness: 0.5 }), piston: vc({ metalness: 0.95, roughness: 0.22 }), support: vc(), guidage: vc(), moyeu: vc({ roughness: 0.6 }), hydraulique: vc({ metalness: 0.3, roughness: 0.6 }), temoin: vc({ metalness: 0.2, roughness: 0.6 }),
    fluid: new THREE.MeshStandardMaterial({ color: 0xd9a233, transparent: true, opacity: 0.75, roughness: 0.2, metalness: 0, emissive: 0x3a2600 }) };
  M.garn.userData.part = 'plaquettes';
  const C = { steel: 0xbfc6cd, iron: 0x6f7780, dark: 0x2c3036, rust: 0x7a4a2c, rubber: 0x16181b, zinc: 0xc9c2a4, gold: 0xb6903c, red: 0xa63528, alu: 0xd0d5da, cap: 0x1d6fb5 };
  const root = new THREE.Group(); scene.add(root);
  const put = (list, mat, part, parent) => { const m = new THREE.Mesh(merge(list), mat); m.userData.part = part; (parent || root).add(m); return m; };
  const cz = (r, len, n, r2) => new THREE.CylinderGeometry(r2 == null ? r : r2, r, len, n || 20).rotateX(Math.PI / 2), box = (w, h, d) => new THREE.BoxGeometry(w, h, d);
  const lathe = (pts, n, a0, a1) => new THREE.LatheGeometry(pts.map((p) => new THREE.Vector2(p[0], p[1])), n || 64, a0 || 0, a1 == null ? Math.PI * 2 : a1).rotateX(Math.PI / 2);

  /* ---- Disque ventilé et moyeu (tournent ensemble) ---- */
  const spin = new THREE.Group(); root.add(spin);
  const dl = [[lathe([[RI, -HALF], [RO, -HALF], [RO, -HALF + 0.8], [RI, -HALF + 0.8], [RI, -HALF]]), null, 'Piste de freinage intérieure', C.steel], [lathe([[RI, HALF - 0.8], [RO, HALF - 0.8], [RO, HALF], [RI - 0.9, HALF], [RI - 0.9, HALF - 0.8], [RI, HALF - 0.8]]), null, 'Piste de freinage extérieure', C.steel]];
  for (let i = 0; i < 40; i++) dl.push([box(RO - RI - 0.5, 0.32, 0.92), at(0, 0, 0, 0, 0, i * Math.PI / 20).multiply(at((RO + RI) / 2, 0, 0, 0, 0, 0.35)), 'Ailettes de ventilation', C.iron]);
  dl.push([lathe([[RI - 0.9, HALF], [7.4, 4.3], [7.6, 4.9], [3.5, 4.9], [3.5, 4.3], [6.8, 4.3], [RI - 1.6, HALF]]), null, 'Bol du disque', C.iron]);
  for (let i = 0; i < 5; i++) dl.push([cz(0.72, 0.1, 14), at(5.6 * Math.cos(i * 1.2566 + 0.3), 5.6 * Math.sin(i * 1.2566 + 0.3), 4.92), 'Passage de vis de roue', C.dark]);
  const disc = put(dl, M.disque, 'disque', spin);
  const screw = put([[cz(0.42, 0.5, 6), at(5.6 * Math.cos(0.3 + 0.63), 5.6 * Math.sin(0.3 + 0.63), 5.05), 'Vis de maintien du disque', C.zinc]], M.guidage, 'disque', spin);
  const hub = put([[cz(7, 0.7, 40), at(0, 0, 3.9), 'Face d’appui du moyeu', C.rust], [cz(3.4, 2.6, 28), at(0, 0, 5), 'Centrage de roue', C.iron], [cz(4.4, 5.6, 28), at(0, 0, 0.8), 'Moyeu et roulement', C.iron]].concat([0, 1, 2, 3, 4].map((i) => [cz(0.6, 0.2, 12), at(5.6 * Math.cos(i * 1.2566 + 0.3), 5.6 * Math.sin(i * 1.2566 + 0.3), 4.2), 'Taraudage de vis de roue', C.dark])), M.moyeu, 'moyeu', spin);
  /* Porte-moyeu et tôle de protection (fixes) */
  put([[lathe([[5, -2.6], [15.6, -2.6], [15.9, -2.2], [15.6, -2.45], [5, -2.45]], 48, Math.PI * 0.62, Math.PI * 1.55), null, 'Tôle de protection', C.dark], [cz(5.6, 3.4, 28), at(0, 0, -4.4), 'Porte-moyeu', C.iron], [box(7, 16, 3), at(-1, 9.5, -4.6, 0, 0, 0.12), 'Porte-moyeu', C.iron], [box(6, 11, 3), at(-0.5, -8, -4.6, 0, 0, -0.1), 'Porte-moyeu', C.iron], [box(9, 4.6, 3), at(8.2, 0, -4.9), 'Porte-moyeu', C.iron],
    [cz(1.5, 3.4, 16), at(-2, 17.5, -4.6), 'Fixation de jambe de force', C.iron], [new THREE.SphereGeometry(1.7, 14, 10), at(0, -14.4, -4.6), 'Rotule inférieure', C.dark], [box(6, 1.6, 2), at(-6.5, -3, -5.2), 'Levier de direction', C.iron], [cz(0.7, 2.6, 10), at(-4.2, 5.2, -3.4), 'Capteur ABS', C.dark]], M.moyeu, 'moyeu');

  /* ---- Plaquettes : support acier + garniture d'épaisseur variable ---- */
  const sector = (r1, r2, a) => { const s = new THREE.Shape(); s.absarc(0, 0, r2, -a, a, false); s.absarc(0, 0, r1, a, -a, true); s.closePath(); return s; };
  const garnGeo = new THREE.ExtrudeGeometry(sector(9.5, 14.75, 0.4), { depth: 1, bevelEnabled: false, curveSegments: 20 });
  const backGeo = () => new THREE.ExtrudeGeometry(sector(9.2, 15.05, 0.44), { depth: BACK, bevelEnabled: false, curveSegments: 20 });
  const pad = (out) => { const g = new THREE.Group(); root.add(g); const b = put([[backGeo(), null, 'Support de plaquette', C.iron], [box(1.1, 1.6, BACK), at(12.4 * Math.cos(0.5), 12.4 * Math.sin(0.5), BACK / 2), 'Oreille de plaquette', C.iron], [box(1.1, 1.6, BACK), at(12.4 * Math.cos(0.5), -12.4 * Math.sin(0.5), BACK / 2), 'Oreille de plaquette', C.iron]], M.plaquettes, 'plaquettes', g);
    const f = new THREE.Mesh(garnGeo, M.garn); f.userData.part = 'plaquettes'; f.userData.name = 'Garniture de friction'; g.add(f); return { g, b, f, out }; };
  const padIn = pad(false), padOut = pad(true);

  /* ---- Support d'étrier (fixe) ---- */
  const sl = []; [-1, 1].forEach((s) => { const y = s * 6.9;
    sl.push([box(8.6, 1.9, 1.5), at(13, y, -3.3), 'Support d’étrier', C.iron], [box(6.4, 1.9, 1.2), at(12.2, y, 3), 'Support d’étrier', C.iron], [box(1.9, 1.9, 7.8), at(16.4, y, -0.2), 'Pont du support', C.iron],
      [cz(0.75, 0.8, 6), at(9.6, s * 5.4, -6.8), 'Vis de support d’étrier', C.zinc], [cz(0.5, 3.4, 10), at(9.6, s * 5.4, -5), 'Vis de support d’étrier', C.zinc]); });
  sl.push([box(2.4, 13.6, 1.6), at(9.6, 0, -3.5), 'Support d’étrier', C.iron]);
  const carrier = put(sl, M.support, 'support');

  /* ---- Étrier flottant, piston, liquide, vis de guidage ---- */
  const cal = new THREE.Group(); root.add(cal);
  const cl = [[lathe([[3.05, -8.2], [4.1, -8.2], [4.1, -3], [3.05, -3], [3.05, -8.2]], 40), at(12.2, 0, 0), 'Corps d’étrier (cylindre)', C.iron], [cz(4.1, 0.9, 40), at(12.2, 0, -8.6), 'Fond du cylindre', C.iron],
    [box(2.3, 10.2, 8), at(16.9, 0, -0.4), 'Pont d’étrier', C.iron], [box(2.3, 5, 4), at(15.6, 0, -5.6), 'Corps d’étrier', C.iron]];
  [-1, 1].forEach((s) => { cl.push([box(6.4, 3.3, 1.1), at(12.9, s * 2.7, 3.72), 'Griffes de l’étrier', C.iron], [box(3, 2.2, 1.5), at(13.6, s * 6.4, -5.2), 'Oreille de guidage', C.iron]); });
  const calBody = put(cl, M.etrier, 'etrier', cal);
  const lip = put([[lathe([[2.9, -3], [3.5, -2.75], [3.3, -2.5], [2.9, -2.6]], 32), at(12.2, 0, 0), 'Cache-poussière du piston', C.rubber]], M.guidage, 'piston', cal);
  put([[cz(0.42, 1.4, 8), at(14.6, 0, -8.7, 0, 0.5, 0), 'Vis de purge', C.zinc], [cz(0.5, 0.7, 10), at(15, 0, -9.3, 0, 0.5, 0), 'Capuchon de purge', C.cap], [cz(0.8, 0.7, 6), at(12.2, 2.6, -9.3), 'Raccord de flexible (banjo)', C.zinc],
    [tube([[12.2, 2.6, -9.6], [11, 5, -11.5], [6, 9.5, -12], [1, 12.5, -10.5]], 0.5), null, 'Flexible de frein', C.rubber], [cz(0.75, 1.6, 10), at(0.6, 12.8, -10.2, 0, 0.6, 0), 'Raccord de flexible', C.zinc]], M.hydraulique, 'hydraulique', cal);
  const piston = put([[lathe([[0, -0.01], [2.85, -0.01], [2.85, -4.4], [2.3, -4.4], [2.3, -0.5], [0, -0.5]], 36), at(12.2, 0, 0), 'Piston', C.alu]], M.piston, 'piston', cal);
  const fluid = new THREE.Mesh(cz(2.95, 1, 32), M.fluid); fluid.userData.part = 'hydraulique'; fluid.userData.name = 'Liquide de frein sous pression'; fluid.position.set(12.2, 0, 0); cal.add(fluid);
  const pins = put([-1, 1].flatMap((s) => [[cz(0.42, 6.2, 12), at(13.6, s * 6.4, -3.6), 'Vis de guidage', C.steel], [cz(0.72, 0.7, 6), at(13.6, s * 6.4, -6.5), 'Vis de guidage', C.zinc], [cz(0.75, 1.3, 14, 0.55), at(13.6, s * 6.4, -4.2), 'Soufflet de guidage', C.rubber]]), M.guidage, 'guidage');
  const sensor = put([[box(1, 0.7, 0.9), at(11.2, 2.4, 0.3), 'Sonde d’usure', C.red], [tube([[11.2, 2.4, -0.2], [10.5, 3.5, -3], [8, 8, -8], [3, 11.5, -9.6]], 0.14), null, 'Fil du témoin d’usure', C.dark]], M.temoin, 'temoin');

  /* ---- État et simulation ---- */
  const q = (s) => el.querySelector(s), desc = q('[data-desc]'), stepEl = q('[data-step]'), stepN = q('[data-stepn]');
  const accent = new THREE.Color(cssVar('--accent', '#1C5797')).lerp(new THREE.Color(0x4da3ff), 0.4), hot = new THREE.Color(0xff3d0c);
  let pedal = 0, wear = 0, omega = 0, ang = 0, temp = 0, sel = null, pulse = 0, step = 0, cut = false, cutV = 0;
  const off = { pins: new THREE.Vector3(), cal: new THREE.Vector3(), padIn: new THREE.Vector3(), padOut: new THREE.Vector3(), car: new THREE.Vector3(), disc: new THREE.Vector3() }, tgt = { pins: [0, 0, 0], cal: [0, 0, 0], padIn: [0, 0, 0], padOut: [0, 0, 0], car: [0, 0, 0], disc: [0, 0, 0] };
  const setStep = (n) => { step = Math.max(0, Math.min(STEPS.length - 1, n));
    tgt.pins = step >= 1 ? [0, 0, -8] : [0, 0, 0]; tgt.cal = step >= 2 ? [7, 13, -4] : [0, 0, 0]; if (step >= 2) tgt.pins = [7, 13, -12];
    tgt.padIn = step >= 3 ? [9, -13, -6] : [0, 0, 0]; tgt.padOut = step >= 3 ? [9, -13, 6] : [0, 0, 0]; tgt.car = step >= 4 ? [15, 0, -5] : [0, 0, 0]; tgt.disc = step >= 5 ? [0, 0, 15] : [0, 0, 0];
    stepN.textContent = step + ' / ' + (STEPS.length - 1) + ' · ' + STEPS[step][0]; stepEl.innerHTML = STEPS[step][1]; q('[data-prev]').disabled = step === 0; q('[data-next]').disabled = step === STEPS.length - 1;
    if (step > 0) { q('[data-pedal]').value = 0; pedal = 0; q('[data-pedalv]').textContent = '0 %'; } q('[data-pedal]').disabled = step > 0;
    st.orbit.tzoom = step >= 2 ? 1.25 : 1; st.refresh(); };
  const fr = (v) => v.toFixed(1).replace('.', ',');
  function frame(dt, real) {
    const d = real || 0.016, k = 1 - Math.pow(0.004, d); pulse += d;
    const t = PAD_NEW - (PAD_NEW - PAD_MIN) * wear, close = Math.min(1, pedal / 0.25), gap = GAP * (1 - close), grip = Math.max(0, (pedal - 0.25) / 0.75);
    /* Rotation, freinage, échauffement */
    const cruise = step === 0 ? 11 : 0; omega += ((pedal > 0.02 ? omega : cruise) - omega) * (1 - Math.pow(0.3, dt)); omega = Math.max(0, omega - (close >= 1 ? (3 + 26 * grip) * dt : 0)); if (step > 0) omega *= Math.pow(0.02, d);
    ang -= omega * dt; spin.rotation.z = ang;
    temp = Math.max(0, temp + (close >= 1 ? grip * omega * 0.05 * dt : 0) - temp * 0.16 * dt); const glow = Math.min(1, temp);
    /* Positions : la plaquette intérieure suit le piston, l'étrier coulisse et tire l'extérieure */
    const zo = HALF + gap + t + BACK, zi = -(HALF + gap + t + BACK), calZ = zo - (HALF + GAP + PAD_NEW + BACK);
    Object.keys(off).forEach((n) => { off[n].lerp(new THREE.Vector3(...tgt[n]), k); });
    padOut.g.position.set(off.padOut.x, off.padOut.y, zo - BACK + off.padOut.z); padOut.f.scale.z = t; padOut.f.position.z = -t;
    padIn.g.position.set(off.padIn.x, off.padIn.y, zi + off.padIn.z); padIn.f.scale.z = t; padIn.f.position.z = BACK;
    cal.position.set(off.cal.x, off.cal.y, calZ + off.cal.z); pins.position.set(off.pins.x, off.pins.y, calZ + off.pins.z); carrier.position.copy(off.car);
    disc.position.copy(off.disc); screw.position.set(0, 0, off.disc.z * 1.25);
    const pz = zi - calZ; piston.position.z = pz; const back = -7.9, len = Math.max(0.05, (pz - 4.4) - back); fluid.scale.z = len; fluid.position.z = back + len / 2;
    sensor.position.set(off.padIn.x, off.padIn.y, zi + BACK + off.padIn.z);
    /* Affichages */
    const worn = t <= PAD_MIN + 0.06;
    q('[data-v]').textContent = Math.round(omega / 11 * 90) + ' km/h'; q('[data-t]').textContent = Math.round(30 + glow * 520) + ' °C';
    q('[data-p]').textContent = fr(((PAD_NEW - t) * 2 + (GAP - gap) * 2 * 0.2) * 10) + ' mm'; const g = q('[data-g]'); g.textContent = fr(t * 10) + ' mm' + (worn ? ' · témoin allumé' : ''); g.className = 'mono tnum ' + (worn ? 'bad' : t < 0.5 ? 'warn' : 'good');
    /* Matériaux : échauffement, pièce choisie, coupe */
    cutV += ((cut ? 1 : 0) - cutV) * k; M.etrier.transparent = cutV > 0.01; M.etrier.opacity = 1 - 0.78 * cutV; M.etrier.depthWrite = cutV < 0.5; fluid.visible = cutV > 0.05; M.fluid.opacity = 0.75 * cutV; M.fluid.emissiveIntensity = 0.4 + 2 * pedal;
    Object.keys(PARTS).forEach((n) => { const m = M[n]; if (n === sel) m.emissive.copy(accent).multiplyScalar(0.28 + 0.14 * Math.sin(pulse * 4)); else m.emissive.setHex(0); });
    if (sel !== 'disque') M.disque.emissive.copy(hot).multiplyScalar(glow * 0.75); if (worn && sel !== 'temoin') M.temoin.emissive.setHex(0xff2a1a).multiplyScalar(0.4 + 0.3 * Math.sin(pulse * 6));
    if (step === 5 && sel !== 'moyeu') M.moyeu.emissive.setHex(0xff9a2a).multiplyScalar(0.05 + 0.04 * Math.sin(pulse * 3));
    let moving = false; Object.keys(off).forEach((n) => { if (off[n].distanceToSquared(new THREE.Vector3(...tgt[n])) > 0.0004) moving = true; });
    return moving || !!sel || omega > 0.01 || temp > 0.005 || Math.abs((cut ? 1 : 0) - cutV) > 0.005 || worn || step === 5;
  }
  st.onFrame(frame);

  /* ---- Commandes ---- */
  function choose(k, piece) {
    sel = sel === k && !piece ? null : k;
    el.querySelectorAll('[data-part]').forEach((b) => { const on = b.dataset.part === sel; b.classList.toggle('sel', on); b.setAttribute('aria-pressed', on ? 'true' : 'false'); });
    desc.innerHTML = sel ? `<strong>${piece || PARTS[sel][0]}.</strong> ${PARTS[sel][1]}` : 'Appuie sur la pédale : le piston sort, l’étrier coulisse et les deux plaquettes pincent le disque.';
    st.refresh();
  }
  el.querySelectorAll('[data-part]').forEach((b) => b.addEventListener('click', () => choose(b.dataset.part)));
  const ray = new THREE.Raycaster();
  st.onTap((ndc) => { ray.setFromCamera(ndc, st.camera); const h = ray.intersectObjects(root.children, true).find((x) => x.object.userData.part && x.object.visible && !(x.object === calBody && cutV > 0.5)); if (!h) return; choose(h.object.userData.part, h.object.userData.name || nameAt(h.object.geometry, h.faceIndex)); });
  const pe = q('[data-pedal]'), we = q('[data-wear]');
  pe.addEventListener('input', () => { pedal = pe.value / 100; q('[data-pedalv]').textContent = pe.value + ' %'; st.play(); st.refresh(); });
  we.addEventListener('input', () => { wear = we.value / 100; q('[data-wearv]').textContent = we.value + ' %'; st.refresh(); });
  q('[data-pedalv]').textContent = '0 %'; q('[data-wearv]').textContent = '0 %';
  q('[data-cut]').addEventListener('change', (e) => { cut = e.target.checked; st.refresh(); });
  q('[data-prev]').addEventListener('click', () => setStep(step - 1)); q('[data-next]').addEventListener('click', () => setStep(step + 1));
  const pb = q('[data-k="play"]'); if (pb) { const sync = () => { pb.textContent = st.on ? 'Pause' : 'Lecture'; }; pb.addEventListener('click', () => { st.on ? st.pause() : st.play(); sync(); }); sync(); }
  setStep(0); frame(0, 0.016); st.refresh();
  return st;
}
