/* Boîte automatique 722.6 : vue en coupe de principe et train épicycloïdal à manipuler.
   Maquette pédagogique procédurale, code original ; rendu par three.js (MIT).
   Les vitesses du train épicycloïdal suivent la relation de Willis, exacte. L'enchaînement réel des embrayages de la 722.6 n'est pas représenté. */
import { THREE, createStage, cssVar, reduced, merge, at, tube, nameAt } from './kit.js';

const TAU = Math.PI * 2;
/* Rapports indicatifs : la prise directe (4e) et la surmultipliée (5e) sont le principe de la boîte ; les autres valeurs sont à vérifier selon la version. */
const RATIO = { 1: 3.93, 2: 2.41, 3: 1.49, 4: 1, 5: 0.83, R: -3.1 };
const PARTS = {
  convertisseur: ['Convertisseur de couple', 'Liaison hydraulique entre le moteur et la boîte. La pompe, entraînée par le moteur, projette l’ATF sur la turbine qui entraîne la boîte : à l’arrêt, il patine et la voiture ne cale pas.'],
  pontage: ['Embrayage de pontage', 'À vitesse stable, il solidarise la turbine et le carter du convertisseur : plus de glissement, donc moins de consommation et d’échauffement.'],
  trains: ['Trains épicycloïdaux', 'Trois trains d’engrenages en série. Selon l’élément qu’on bloque ou qu’on solidarise dans chacun, on obtient une réduction, la prise directe, une surmultiplication ou la marche arrière.'],
  embrayages: ['Embrayages et freins multidisques', 'Des empilements de disques serrés par la pression d’ATF. Un embrayage relie deux éléments qui tournent ; un frein immobilise un élément contre le carter.'],
  bloc: ['Bloc hydraulique', 'Le « valve body » : un labyrinthe de canaux et de tiroirs qui distribue la pression d’ATF vers les embrayages et les freins.'],
  plaque: ['Plaque conductrice', 'Posée sur le bloc hydraulique, elle relie les électrovannes et porte les capteurs de vitesse et de température d’ATF. Ses capteurs de vitesse finissent par lâcher : mode dégradé.'],
  connecteur: ['Connecteur 13 broches', 'Il traverse le carter côté droit et relie la plaque conductrice au faisceau. Ses joints toriques durcissent : l’ATF suinte et peut remonter le faisceau jusqu’au calculateur de boîte.'],
  carter: ['Carter d’huile et filtre', 'Réserve d’ATF, avec le filtre qui alimente la pompe. On le dépose pour changer le filtre : c’est le moment d’inspecter l’adaptateur 13 broches.'],
  sortie: ['Arbre de sortie et verrou de parking', 'L’arbre de sortie entraîne l’arbre de transmission. En position P, un cliquet s’engage dans une roue dentée et bloque la sortie.']
};
const MODES = [
  ['Réduction', 'Couronne bloquée, le planétaire entraîne, le porte-satellites sort', 'r', 's', 'c'],
  ['Prise directe', 'Deux éléments solidaires : tout tourne en bloc', null, 's', 'c'],
  ['Surmultiplication', 'Planétaire bloqué, le porte-satellites entraîne, la couronne sort', 's', 'c', 'r'],
  ['Marche arrière', 'Porte-satellites bloqué, le planétaire entraîne, la couronne sort à l’envers', 'c', 's', 'r']
];

/* Roue dentée : profil trapézoïdal, intérieur ou extérieur. Une dent est centrée sur l'angle 0 (extérieur) ; un creux sur l'angle 0 (intérieur). */
function gear(Z, m, w, internal, bore) {
  const r = m * Z / 2, p = TAU / Z, a = m * 0.9, d = m * 1.1, pts = [];
  for (let i = 0; i < Z; i++) { const t = i * p + (internal ? p / 2 : 0), ro = internal ? r + d : r - d, ti = internal ? r - a : r + a; [[ro, -0.3], [ti, -0.15], [ti, 0.15], [ro, 0.3]].forEach(([rr, k]) => pts.push(new THREE.Vector2(rr * Math.cos(t + k * p), rr * Math.sin(t + k * p)))); }
  let s;
  if (internal) { s = new THREE.Shape(); s.absarc(0, 0, r + d + m * 2.2, 0, TAU, false); s.holes.push(new THREE.Path(pts.reverse())); }
  else { s = new THREE.Shape(pts); if (bore) { const h = new THREE.Path(); h.absarc(0, 0, bore, 0, TAU, true); s.holes.push(h); } }
  return new THREE.ExtrudeGeometry(s, { depth: w, bevelEnabled: false, curveSegments: 24 }).translate(0, 0, -w / 2);
}
/* Train épicycloïdal complet : renvoie le groupe et une fonction de pose (angles du planétaire, du porte-satellites, de la couronne). */
function planetSet(Zs, Zr, N, m, w, mats) {
  const Zp = (Zr - Zs) / 2, g = new THREE.Group(), rc = m * (Zs + Zp) / 2;
  const sun = new THREE.Mesh(gear(Zs, m, w, false, m * 2), mats.s), ring = new THREE.Mesh(gear(Zr, m, w, true), mats.r), car = new THREE.Group(), planets = [];
  const arms = [[new THREE.CylinderGeometry(m * 3.2, m * 3.2, w * 0.25, 24).rotateX(Math.PI / 2), at(0, 0, -w * 0.85)]];
  for (let k = 0; k < N; k++) { const f = k * TAU / N, pl = new THREE.Mesh(gear(Zp, m, w, false, m * 1.2), mats.p); pl.position.set(rc * Math.cos(f), rc * Math.sin(f), 0); pl.userData.f = f; car.add(pl); planets.push(pl);
    arms.push([new THREE.BoxGeometry(rc, m * 2.6, w * 0.25), at(rc / 2 * Math.cos(f), rc / 2 * Math.sin(f), -w * 0.85, 0, 0, f)], [new THREE.CylinderGeometry(m * 1.15, m * 1.15, w * 1.9, 14).rotateX(Math.PI / 2), at(rc * Math.cos(f), rc * Math.sin(f), -w * 0.1)], [new THREE.CylinderGeometry(m * 2.2, m * 2.2, w * 0.25, 18).rotateX(Math.PI / 2), at(rc * Math.cos(f), rc * Math.sin(f), -w * 0.85)]); }
  const carM = new THREE.Mesh(merge(arms), mats.c); car.add(carM);
  sun.userData.name = 'Planétaire (pignon central)'; ring.userData.name = 'Couronne'; carM.userData.name = 'Porte-satellites'; planets.forEach((p) => { p.userData.name = 'Satellite'; });
  g.add(sun, ring, car);
  return { g, sun, ring, car, carM, planets, Zs, Zr, Zp, pose(as, ac) { const ar = ac - (as - ac) * Zs / Zr; sun.rotation.z = as; car.rotation.z = ac; ring.rotation.z = ar; planets.forEach((p) => { p.rotation.z = p.userData.f - (as - ac) * Zs / Zp; }); return ar; } };
}

function ui(el, chk) {
  const parts = Object.keys(PARTS).map((k) => `<button class="vbtn sm" type="button" data-part="${k}" aria-pressed="false">${PARTS[k][0]}</button>`).join('');
  el.querySelector('[data-ui]').innerHTML = `
    <div class="vchips" role="group" aria-label="Vue"><button class="vbtn sm sel" type="button" data-view="box">Boîte en coupe</button><button class="vbtn sm" type="button" data-view="set">Principe : un train épicycloïdal</button></div>
    <div data-pane="box" class="stack" style="gap:10px">
      <div class="viz-read"><div><small class="viz-note">Moteur</small><br><b class="mono tnum" data-e></b></div><div><small class="viz-note">Turbine</small><br><b class="mono tnum" data-tb></b></div><div><small class="viz-note">Glissement</small><br><b class="mono tnum" data-sl></b></div><div><small class="viz-note">Sortie de boîte</small><br><b class="mono tnum" data-o></b></div></div>
      <div class="vchips" role="group" aria-label="Levier"><span class="viz-note">Levier</span>${['P', 'R', 'N', 'D'].map((k) => `<button class="vbtn sm${k === 'D' ? ' sel' : ''}" type="button" data-lev="${k}">${k}</button>`).join('')}<span class="viz-note" style="margin-left:8px">Rapport</span>${[1, 2, 3, 4, 5].map((k) => `<button class="vbtn sm${k === 1 ? ' sel' : ''}" type="button" data-gear="${k}">${k}</button>`).join('')}<span class="vchip" data-ratio></span></div>
      <label class="vrange r3"><span style="text-align:left">Régime</span><input type="range" min="700" max="5000" step="50" value="1800" data-rpm aria-label="Régime moteur"><span class="mono tnum" data-rpmv></span></label>
      <div class="vchips" role="group" aria-label="Organes de la boîte">${parts}</div>
      <p class="viz-desc" data-desc aria-live="polite"></p>
      <label class="vtoggle"><input type="checkbox" data-leak><span class="vtrack" aria-hidden="true"></span>Simuler la fuite du connecteur 13 broches</label>
      <p class="viz-note">Schéma de principe : les trois trains tournent selon le rapport choisi, mais l’enchaînement exact des embrayages et des freins de la 722.6 n’est pas représenté. Rapports indicatifs ${chk}.</p>
    </div>
    <div data-pane="set" class="stack" style="gap:10px" hidden>
      <div class="vchips" role="group" aria-label="Montage du train">${MODES.map((m, i) => `<button class="vbtn sm${i ? '' : ' sel'}" type="button" data-mode="${i}">${m[0]}</button>`).join('')}</div>
      <p class="viz-desc" data-mdesc aria-live="polite"></p>
      <div class="viz-read"><div><small class="viz-note">Entrée</small><br><b class="mono tnum" data-mi></b></div><div><small class="viz-note">Sortie</small><br><b class="mono tnum" data-mo></b></div><div><small class="viz-note">Rapport de ce train</small><br><b class="mono tnum" data-mr></b></div></div>
      <div class="vchips" aria-hidden="true"><span class="lg3d"><i style="background:#2f9e62"></i>Entrée</span><span class="lg3d"><i style="background:#2f7fd6"></i>Sortie</span><span class="lg3d"><i style="background:#c8402f"></i>Bloqué</span></div>
      <p class="viz-note">Train d’exemple : planétaire de 30 dents, couronne de 72 dents, trois satellites de 21 dents. Ce ne sont pas les dentures de la 722.6 : c’est le principe qui compte.</p>
    </div>`;
}

export function mount(el) {
  const host = el.querySelector('[data-stage]'); host.innerHTML = '';
  const st = createStage(host, { target: [-10, -3, 0], radius: 108, fov: 28, az: 0.5, el: 0.22, minEl: -0.5, maxEl: 1.3, fit: 1.5, label: 'Maquette 3D de la boîte automatique 722.6' });
  const chk = (window.W203 && window.W203.h && window.W203.h.s) ? window.W203.h.s('chk') : '(à vérifier)';
  ui(el, chk);
  const { scene } = st, q = (s) => el.querySelector(s);
  const std = (c, o) => new THREE.MeshStandardMaterial(Object.assign({ color: c, metalness: 0.8, roughness: 0.38 }, o || {}));
  const vc = (o) => new THREE.MeshStandardMaterial(Object.assign({ color: 0xffffff, vertexColors: true, metalness: 0.6, roughness: 0.45 }, o || {}));
  const M = { case: std(0xc3cad1, { side: THREE.DoubleSide, roughness: 0.55, metalness: 0.5 }), convertisseur: vc({ side: THREE.DoubleSide }), pontage: std(0xb9772e, { side: THREE.DoubleSide }), embrayages: vc(), bloc: std(0xaab2ba, { roughness: 0.5 }), plaque: vc({ metalness: 0.2, roughness: 0.6 }), connecteur: vc({ metalness: 0.2, roughness: 0.55 }),
    carter: new THREE.MeshStandardMaterial({ color: 0x9aa2ab, metalness: 0.5, roughness: 0.4, transparent: true, opacity: 0.32, depthWrite: false, side: THREE.DoubleSide }), atf: new THREE.MeshStandardMaterial({ color: 0xb3261e, transparent: true, opacity: 0.55, roughness: 0.15, metalness: 0, depthWrite: false }), sortie: vc(),
    s: std(0xc9a14a), p: std(0xaeb6be), r: std(0x555c65, { roughness: 0.5 }), c: std(0x6f8fb0, { roughness: 0.5 }), filter: std(0x2a2e34, { metalness: 0.2, roughness: 0.8 }) };
  const C = { steel: 0xaab2ba, dark: 0x30353b, gold: 0xc9a14a, fr: 0x6a4a2e, black: 0x15171a, yellow: 0xd2a93a, red: 0xb3261e, white: 0xe2e5e8, green: 0x2e7d55 };
  const HI = { convertisseur: [M.convertisseur], pontage: [M.pontage], trains: [M.s, M.p, M.r, M.c], embrayages: [M.embrayages], bloc: [M.bloc], plaque: [M.plaque], connecteur: [M.connecteur], carter: [M.carter, M.filter], sortie: [M.sortie] };
  const cx = (r, len, n, r2) => new THREE.CylinderGeometry(r2 == null ? r : r2, r, len, n || 24).rotateZ(Math.PI / 2), cz = (r, len, n) => new THREE.CylinderGeometry(r, r, len, n || 16).rotateX(Math.PI / 2), box = (w, h, d) => new THREE.BoxGeometry(w, h, d);
  /* Pièce de révolution d'axe x, ouverte sur un quart pour voir l'intérieur. */
  const rev = (pts, cut) => new THREE.LatheGeometry(pts.map((p) => new THREE.Vector2(p[0], p[1])), 56, 0, cut ? Math.PI * 1.5 : TAU).rotateZ(-Math.PI / 2);

  /* ================= Vue 1 : la boîte en coupe ================= */
  const boxV = new THREE.Group(); scene.add(boxV);
  const add = (geo, mat, part, name, parent) => { const m = new THREE.Mesh(geo, mat); m.userData.part = part; if (name) m.userData.name = name; (parent || boxV).add(m); return m; };
  add(rev([[15.2, 14], [15.2, 12.5], [14.6, 7], [10.6, 4.5], [10.2, -6], [9.4, -26], [6.4, -29], [5, -37], [4.4, -38]], true), M.case, 'carter', 'Carter de boîte (en coupe)');
  /* Convertisseur : carter et pompe (régime moteur), turbine (vers la boîte), stator, pontage */
  const pump = new THREE.Group(), turb = new THREE.Group(); boxV.add(pump, turb);
  const blades = (r1, r2, a, n, col, name) => Array.from({ length: n }, (_, i) => [box(1.6, r2 - r1, 0.14), at(0, 0, 0, i * TAU / n, 0, 0).multiply(at(a, (r1 + r2) / 2, 0, 0, 0.5, 0)), name, col]);
  add(merge([[rev([[4, 13.2], [12.6, 13.2], [13.6, 11.6], [13.6, 8.4], [12, 6.4], [4.6, 6.4], [4.6, 7], [11.6, 7], [13, 8.8], [13, 11.4], [12.2, 12.6], [4, 12.6]], true), null, 'Carter du convertisseur (tourne avec le moteur)', C.dark]].concat(blades(6.2, 12.4, 8.1, 22, C.steel, 'Aubes de pompe'))), M.convertisseur, 'convertisseur', null, pump);
  add(merge([[rev([[5.4, 11.4], [11.8, 11.4], [12.4, 10.2], [5.4, 10.2]], true), null, 'Turbine (entraîne la boîte)', C.gold]].concat(blades(6.2, 11.8, 10.8, 22, C.gold, 'Aubes de turbine'), [[cx(1.2, 17, 16), at(4, 0, 0), 'Arbre d’entrée de boîte', C.steel]])), M.convertisseur, 'convertisseur', null, turb);
  add(merge([[rev([[2.6, 10], [5.6, 10], [5.6, 8.8], [2.6, 8.8]], false), null, 'Stator (réacteur)', C.white]].concat(blades(3, 5.6, 9.4, 12, C.white, 'Stator (réacteur)'))), M.convertisseur, 'convertisseur');
  const lock = add(rev([[5, 12.15], [12, 12.15], [12, 11.95], [5, 11.95]], true), M.pontage, 'pontage', 'Disque de pontage', turb);
  add(merge([[rev([[2, 5.6], [9.6, 5.6], [9.6, 4.6], [2, 4.6]], true), null, 'Pompe à huile', C.steel]]), M.embrayages, 'bloc', 'Pompe à huile');
  /* Trois trains et leurs empilements de disques */
  const gm = { s: M.s, p: M.p, r: M.r, c: M.c }, sets = [-3, -11.5, -20].map((x) => { const ps = planetSet(20, 48, 4, 0.27, 2.6, gm); ps.g.rotation.y = Math.PI / 2; ps.g.position.x = x; boxV.add(ps.g); [ps.sun, ps.ring, ps.carM].concat(ps.planets).forEach((m) => { m.userData.part = 'trains'; }); return ps; });
  const packs = []; [1.6, -7.2, -15.8, -24].forEach((x) => { for (let i = 0; i < 7; i++) packs.push([rev([[6, x + i * 0.42], [8.6, x + i * 0.42], [8.6, x + i * 0.42 - 0.26], [6, x + i * 0.42 - 0.26]], true), null, i % 2 ? 'Disque garni' : 'Disque acier', i % 2 ? C.fr : C.steel]); packs.push([rev([[5.6, x - 0.5], [8.6, x - 0.5], [8.6, x - 1.4], [5.6, x - 1.4]], true), null, 'Piston hydraulique', C.white]); });
  add(merge(packs), M.embrayages, 'embrayages');
  /* Sortie et verrou de parking */
  const out = new THREE.Group(); boxV.add(out);
  add(merge([[cx(1.3, 20, 16), at(-30, 0, 0), 'Arbre de sortie', C.steel], [cx(3.6, 0.9, 6), at(-39.6, 0, 0), 'Bride vers l’arbre de transmission', C.dark], [gear(14, 0.62, 1.4, false, 1.3).rotateY(Math.PI / 2), at(-27.5, 0, 0), 'Roue de parking', C.gold]]), M.sortie, 'sortie', null, out);
  const pawl = add(merge([[box(1.2, 3.4, 1.6), at(0, 1.2, 0), 'Cliquet de parking', C.red], [cz(0.5, 2, 10), at(0, 2.8, 0), 'Cliquet de parking', C.dark]]), M.sortie, 'sortie'); pawl.position.set(-27.5, 5.6, 0);
  /* Bloc hydraulique, plaque conductrice, connecteur, carter et filtre */
  const vb = [[box(22, 1.9, 12), at(-9, -11.4, 0)]]; for (let i = 0; i < 9; i++) vb.push([box(20.5, 0.25, 0.5), at(-9, -10.35, -5 + i * 1.25)]); for (let i = 0; i < 5; i++) vb.push([cx(0.55, 4, 10), at(-17 + i * 3.8, -10.3, 4.4, 0, Math.PI / 2 + 0.0, 0)]);
  add(merge(vb), M.bloc, 'bloc', 'Bloc hydraulique');
  const cp = [[box(20, 0.4, 1.2), at(-9, -9.9, -4.6), 'Plaque conductrice', C.black], [box(20, 0.4, 1.2), at(-9, -9.9, 3.2), 'Plaque conductrice', C.black], [box(1.2, 0.4, 9), at(-18.4, -9.9, -0.7), 'Plaque conductrice', C.black], [box(1.2, 0.4, 9), at(0.4, -9.9, -0.7), 'Plaque conductrice', C.black], [box(1.2, 0.4, 9), at(-9, -9.9, -0.7), 'Plaque conductrice', C.black]];
  for (let i = 0; i < 6; i++) cp.push([cz(0.85, 2.4, 14), at(-17.4 + i * 2.6, -9.2, -4.3), 'Électrovanne', C.steel], [cz(0.6, 0.5, 12), at(-17.4 + i * 2.6, -9.2, -5.7), 'Électrovanne', C.green]);
  cp.push([box(1.1, 1.3, 1.1), at(-4.5, -9.1, 3.2), 'Capteur de vitesse', C.yellow], [box(1.1, 1.3, 1.1), at(-13, -9.1, 3.2), 'Capteur de vitesse', C.yellow], [box(0.8, 0.7, 0.8), at(-9, -9.4, 3.2), 'Sonde de température d’ATF', C.white]);
  add(merge(cp), M.plaque, 'plaque');
  const cab = tube([[1.4, -9.2, 11.6], [3, -7, 13.5], [8, -2, 14.5], [16, 3, 14]], 0.5);
  add(merge([[cz(1.35, 5.2, 20), at(1.4, -9.2, 7.4), 'Adaptateur 13 broches', C.white], [new THREE.TorusGeometry(1.4, 0.2, 8, 24), at(1.4, -9.2, 6.9), 'Joint torique', C.red], [new THREE.TorusGeometry(1.4, 0.2, 8, 24), at(1.4, -9.2, 7.9), 'Joint torique', C.red], [cz(1.75, 2.6, 20), at(1.4, -9.2, 10.6), 'Fiche du faisceau', C.black], [cz(1.9, 0.6, 20), at(1.4, -9.2, 9.4), 'Bague de verrouillage', C.dark]]), M.connecteur, 'connecteur');
  const cable = add(cab, std(0x1b1d21, { metalness: 0.1, roughness: 0.7 }), 'connecteur', 'Faisceau vers le calculateur de boîte');
  add(merge([[box(24, 0.3, 13.6), at(-9, -15.4, 0)], [box(24, 3.4, 0.3), at(-9, -13.8, 6.8)], [box(24, 3.4, 0.3), at(-9, -13.8, -6.8)], [box(0.3, 3.4, 13.6), at(-21, -13.8, 0)], [box(0.3, 3.4, 13.6), at(3, -13.8, 0)]]), M.carter, 'carter', 'Carter d’huile');
  add(merge([[box(15, 0.9, 9), at(-9, -13.2, 0)], [cz(1, 1.2, 14), at(-14, -12.4, 0, Math.PI / 2, 0, 0)]]), M.filter, 'carter', 'Filtre d’ATF');
  add(merge([[cz(0.7, 0.6, 6), at(-17, -15.75, 0, Math.PI / 2, 0, 0)]]), M.bloc, 'carter', 'Bouchon de vidange');
  const atf = add(box(23.6, 2, 13.2), M.atf, 'carter', 'ATF'); atf.position.set(-9, -14.25, 0); atf.renderOrder = 2;
  const dropGeo = new THREE.SphereGeometry(0.34, 8, 6), drops = Array.from({ length: 5 }, (_, i) => { const d = new THREE.Mesh(dropGeo, M.atf); d.userData.o = i / 5; d.visible = false; boxV.add(d); return d; });

  /* ================= Vue 2 : un train épicycloïdal ================= */
  const setV = new THREE.Group(); setV.visible = false; scene.add(setV);
  const dm = { s: std(0xc9a14a), p: std(0xb6bec6), r: std(0x555c65, { roughness: 0.5 }), c: std(0x8a929b, { roughness: 0.5 }) };
  const demo = planetSet(30, 72, 3, 1, 5, dm); setV.add(demo.g); demo.carM.position.z = 0;
  const IN = new THREE.Color(0x2f9e62), OUT = new THREE.Color(0x2f7fd6), HOLD = new THREE.Color(0xc8402f);

  /* ---- État ---- */
  const accent = new THREE.Color(cssVar('--accent', '#1C5797')).lerp(new THREE.Color(0x4da3ff), 0.4);
  let view = 'box', lever = 'D', gearN = 1, rpm = 1800, turbine = 0, outRpm = 0, locked = false, steady = 0, sel = null, pulse = 0, leak = false, leakV = 0, mode = 0;
  const A = { e: 0, t: 0, o: 0, s: 0, c: 0 };
  const descEl = q('[data-desc]'), base = 'Choisis un rapport et un régime : regarde le convertisseur patiner au démarrage, puis se ponter à vitesse stable.';
  const VIS = 0.012;
  function frame(dt, real) {
    const d = real || 0.016; pulse += d;
    if (view === 'box') {
      const drive = lever === 'D' ? RATIO[gearN] : lever === 'R' ? RATIO.R : 0;
      if (drive) { const target = rpm * (locked ? 1 : 0.94) / drive; outRpm += (target - outRpm) * (1 - Math.pow(0.35, dt)); turbine = outRpm * drive; }
      else { outRpm += (0 - outRpm) * (1 - Math.pow(lever === 'P' ? 0.001 : 0.5, dt)); turbine += (rpm * 0.97 - turbine) * (1 - Math.pow(0.1, dt)); }
      const slip = Math.max(0, (rpm - turbine) / rpm);
      steady = slip < 0.1 && lever === 'D' && gearN >= 3 ? steady + dt : 0; const was = locked; locked = steady > 1.2; if (locked) turbine = rpm; if (was !== locked) descSync();
      A.e += rpm * VIS * dt; A.t += turbine * VIS * dt; A.o += outRpm * VIS * dt;
      pump.rotation.x = A.e; turb.rotation.x = A.t; out.rotation.x = A.o; lock.position.x += ((locked ? 0.42 : 0) - lock.position.x) * (1 - Math.pow(0.002, d));
      sets.forEach((ps, i) => ps.pose(A.t + (A.o - A.t) * i / 3, A.t + (A.o - A.t) * (i + 1) / 3));
      pawl.position.y += ((lever === 'P' ? 4.5 : 5.9) - pawl.position.y) * (1 - Math.pow(0.002, d));
      q('[data-e]').textContent = Math.round(rpm) + ' tr/min'; q('[data-tb]').textContent = Math.round(turbine) + ' tr/min';
      const se = q('[data-sl]'); se.textContent = locked ? '0 % · ponté' : Math.round(slip * 100) + ' %'; se.className = 'mono tnum ' + (locked ? 'good' : slip > 0.3 ? 'warn' : '');
      q('[data-o]').textContent = Math.round(outRpm) + ' tr/min'; q('[data-ratio]').textContent = drive ? (drive < 0 ? '−' : '') + Math.abs(drive).toFixed(2).replace('.', ',') + ' : 1' : 'aucun rapport engagé';
      leakV += ((leak ? 1 : 0) - leakV) * (1 - Math.pow(0.6, d)); cable.material.color.setHex(0x1b1d21).lerp(new THREE.Color(0xb3261e), leakV * 0.85); atf.scale.y = 1 - 0.45 * leakV; atf.position.y = -15.25 + atf.scale.y;
      drops.forEach((dp) => { dp.visible = leak; if (leak) { const u = (pulse * 0.6 + dp.userData.o) % 1; dp.position.set(1.4 + 0.3 * Math.sin(dp.userData.o * 9), -10.6 - u * u * 9, 8.4 + dp.userData.o); } });
    } else {
      const m = MODES[mode], w = 1.1 * dt * (st.on ? 1 : 0), Zs = demo.Zs, Zr = demo.Zr; let ws = 0, wc = 0;
      if (mode === 0) { ws = w; wc = w * Zs / (Zs + Zr); } else if (mode === 1) { ws = w; wc = w; } else if (mode === 2) { wc = w; ws = 0; } else { ws = w; wc = 0; }
      A.s += ws * 3; A.c += wc * 3; demo.pose(A.s, A.c);
      const col = (k) => (k === m[2] ? HOLD : k === m[3] ? IN : k === m[4] ? OUT : null);
      [['s', dm.s], ['c', dm.c], ['r', dm.r]].forEach(([k, mat]) => { const c = col(k); if (c) mat.emissive.copy(c).multiplyScalar(0.55); else mat.emissive.setHex(mode === 1 && k === 'r' ? 0x2f7fd6 : 0).multiplyScalar(0.3); });
    }
    Object.keys(HI).forEach((k) => HI[k].forEach((mt) => { if (k === sel) mt.emissive.copy(accent).multiplyScalar(0.3 + 0.15 * Math.sin(pulse * 4)); else mt.emissive.setHex(0); }));
    if (leak && sel !== 'connecteur') M.connecteur.emissive.setHex(0xff2a1a).multiplyScalar(0.25 + 0.2 * Math.sin(pulse * 5));
    return st.on || !!sel || leak || Math.abs(leakV) > 0.01;
  }
  st.onFrame(frame);

  /* ---- Commandes ---- */
  function descSync() { descEl.innerHTML = sel ? `<strong>${PARTS[sel][0]}.</strong> ${PARTS[sel][1]}` : (leak ? 'Les joints toriques ont durci : l’ATF suinte autour du connecteur, le niveau baisse, et l’huile remonte dans le faisceau vers le calculateur de boîte. Remède : adaptateur neuf et faisceau nettoyé.' : (locked ? 'Vitesse stable : l’embrayage de pontage est serré, la turbine tourne exactement au régime du moteur.' : base)); }
  function choose(k, piece) { sel = sel === k && !piece ? null : k; el.querySelectorAll('[data-part]').forEach((b) => { const on = b.dataset.part === sel; b.classList.toggle('sel', on); b.setAttribute('aria-pressed', on ? 'true' : 'false'); }); descSync(); if (sel && piece) descEl.innerHTML = `<strong>${piece}.</strong> ${PARTS[sel][1]}`; st.refresh(); }
  el.querySelectorAll('[data-part]').forEach((b) => b.addEventListener('click', () => choose(b.dataset.part)));
  const ray = new THREE.Raycaster();
  st.onTap((ndc) => { ray.setFromCamera(ndc, st.camera); const grp = view === 'box' ? boxV : setV, hits = ray.intersectObjects(grp.children, true).filter((x) => x.object.visible && (x.object.userData.part || view === 'set')); if (!hits.length) return;
    const h = hits.find((x) => x.object.material !== M.case && x.object.material !== M.carter && x.object.material !== M.atf) || hits[0], nm = h.object.userData.name || nameAt(h.object.geometry, h.faceIndex);
    if (view === 'box') choose(h.object.userData.part, nm); else if (nm) q('[data-mdesc]').innerHTML = `<strong>${nm}.</strong> ${MODES[mode][1]}.`; });
  const setLever = (k) => { lever = k; el.querySelectorAll('[data-lev]').forEach((b) => b.classList.toggle('sel', b.dataset.lev === k)); el.querySelectorAll('[data-gear]').forEach((b) => { b.disabled = k !== 'D'; }); steady = 0; st.refresh(); };
  el.querySelectorAll('[data-lev]').forEach((b) => b.addEventListener('click', () => setLever(b.dataset.lev)));
  el.querySelectorAll('[data-gear]').forEach((b) => b.addEventListener('click', () => { gearN = +b.dataset.gear; steady = 0; el.querySelectorAll('[data-gear]').forEach((x) => x.classList.toggle('sel', x === b)); }));
  const rp = q('[data-rpm]'); rp.addEventListener('input', () => { rpm = +rp.value; q('[data-rpmv]').textContent = rpm + ' tr/min'; st.refresh(); }); q('[data-rpmv]').textContent = rpm + ' tr/min';
  q('[data-leak]').addEventListener('change', (e) => { leak = e.target.checked; descSync(); st.refresh(); });
  const setMode = (i) => { mode = i; const m = MODES[i], Zs = demo.Zs, Zr = demo.Zr, r = [1 + Zr / Zs, 1, Zr / (Zs + Zr), -Zr / Zs][i];
    el.querySelectorAll('[data-mode]').forEach((b) => b.classList.toggle('sel', +b.dataset.mode === i)); q('[data-mdesc]').innerHTML = `<strong>${m[0]}.</strong> ${m[1]}.`;
    q('[data-mi]').textContent = '1 000 tr/min'; q('[data-mo]').textContent = (r < 0 ? '−' : '') + Math.round(1000 / Math.abs(r)).toLocaleString('fr-FR') + ' tr/min'; q('[data-mr]').textContent = (r < 0 ? '−' : '') + Math.abs(r).toFixed(2).replace('.', ',') + ' : 1'; st.refresh(); };
  el.querySelectorAll('[data-mode]').forEach((b) => b.addEventListener('click', () => setMode(+b.dataset.mode)));
  const setView = (v) => { view = v; boxV.visible = v === 'box'; setV.visible = v === 'set'; el.querySelectorAll('[data-view]').forEach((b) => b.classList.toggle('sel', b.dataset.view === v)); el.querySelectorAll('[data-pane]').forEach((p) => { p.hidden = p.dataset.pane !== v; });
    if (v === 'box') { st.orbit.target.set(-10, -3, 0); st.view(0.5, 0.22, 1); } else { st.orbit.target.set(0, 0, 0); st.view(0.35, 0.25, 1.35); } st.refresh(); };
  el.querySelectorAll('[data-view]').forEach((b) => b.addEventListener('click', () => setView(b.dataset.view)));
  const pb = q('[data-k="play"]'); if (pb) { const sync = () => { pb.textContent = st.on ? 'Pause' : 'Lecture'; }; pb.addEventListener('click', () => { st.on ? st.pause() : st.play(); sync(); }); sync(); }
  setLever('D'); setMode(0); descSync(); frame(0, 0.016); st.refresh();
  return st;
}
