/* La berline W203 en 3D : carrosserie issue d'un modèle sous licence CC BY 4.0 (voir models/LICENSE.txt),
   organes procéduraux cliquables et nommés (code original) ; rendu par three.js (MIT). */
import { THREE, createStage, cssVar, reduced, merge, at, seg, tube, nameAt } from './kit.js';
import { GLTFLoader } from '../vendor/three-GLTFLoader.js';
import { MeshoptDecoder } from '../vendor/meshopt_decoder.module.js';

/* Cotes en décimètres : empattement 27,15. Avant vers +x, haut vers +y, droite vers +z. */
const FA = 14.7, RA = -12.45, WR = 3.16, TRACK = 7.45;
/* Le modèle est en centimètres, essieu avant à 148,5 cm de son origine, empattement 269 cm : on l'aligne sur les organes. */
const M_SCALE = 0.1 * 27.15 / 26.9, M_DX = FA - 14.85 * 27.15 / 26.9;
const PAINTS = [['Argent brillant', 0xd3d8de, 0.62, 0.3], ['Noir obsidienne', 0x0c0d10, 0.55, 0.22], ['Bleu nuit', 0x14284a, 0.6, 0.26], ['Vert aventurine', 0x1d3a30, 0.6, 0.28], ['Rouge', 0x7a1418, 0.45, 0.25], ['Blanc', 0xe9ebec, 0.1, 0.35]];
/* Maquettes détaillées accessibles depuis chaque système : [titre, leçon]. */
const MAQ = { m112: [['Le V6 en 3D', 'm112-archi'], ['Le refroidissement en 3D', 'refroid-m112']], boite: [['La boîte 722.6 en 3D', 'b7226']], freinage: [['Le frein à disque en 3D', 'freins-av']], suspension: [['Le train avant en 3D', 'train-av']] };
const SYS = [
  ['m112', 'Moteur', [15.2, 7.4, 0]], ['boite', 'Boîte et transmission', [4, 4.2, 0]], ['freinage', 'Freins', [FA, 3.2, 8.2]],
  ['suspension', 'Trains roulants', [RA, 6.6, 7]], ['direction', 'Direction', [6.2, 9.6, -3.8]], ['elec-w203', 'Électricité', [11.6, 7.6, 5.2]],
  ['clim', 'Climatisation', [20.4, 5.4, -3]], ['carrosserie', 'Carrosserie', [-3, 14.4, 0]]
];

export function mount(el) {
  const host = el.querySelector('[data-stage]'); host.innerHTML = '';
  const st = createStage(host, { target: [0, 5.6, 0], radius: 78, fov: 24, az: 0.72, el: 0.2, minEl: 0.02, maxEl: 1.4, zoom: [0.4, 1.5], fit: 1.55, label: 'Maquette 3D de la Mercedes C 240 W203' });
  const { scene } = st;
  const accent = new THREE.Color(cssVar('--accent', '#1C5797')).lerp(new THREE.Color(0x4da3ff), 0.35);
  const std = (color, o) => new THREE.MeshStandardMaterial(Object.assign({ color, metalness: 0.7, roughness: 0.4 }, o || {}));
  const sysM = () => new THREE.MeshStandardMaterial({ color: 0xffffff, vertexColors: true, metalness: 0.55, roughness: 0.45 });
  const glassM = (color, op, o) => new THREE.MeshPhysicalMaterial(Object.assign({ color, metalness: 0, roughness: 0.05, transparent: true, opacity: op, depthWrite: false, side: THREE.DoubleSide, envMapIntensity: 1.5 }, o || {}));
  const M_ = { paint: new THREE.MeshPhysicalMaterial({ color: 0xd3d8de, metalness: 0.62, roughness: 0.3, clearcoat: 1, clearcoatRoughness: 0.05 }), disc: std(0x9aa1a9, { metalness: 0.9, roughness: 0.38 }),
    m112: sysM(), boite: sysM(), freinage: sysM(), suspension: sysM(), direction: sysM(), 'elec-w203': sysM(), clim: sysM() };
  /* Matériaux de la carrosserie : [matériau, nom de la pièce, opacité normale, opacité en radiographie]. */
  const SKIN = {
    carpaint: [M_.paint, 'Carrosserie', 1, 0.2], chrome: [std(0xe6e9ec, { metalness: 1, roughness: 0.08 }), 'Chromes et calandre', 1, 0.25], mirror: [std(0xdfe5ea, { metalness: 1, roughness: 0.03 }), 'Miroir de rétroviseur', 1, 0.3],
    black: [std(0x0e0f11, { metalness: 0.1, roughness: 0.8 }), 'Joints, grilles et soubassement', 1, 0.1], interior: [std(0x3b4048, { metalness: 0, roughness: 0.9 }), 'Habitacle', 1, 0.1],
    material: [std(0xc4cad1, { metalness: 0.95, roughness: 0.25 }), 'Jante en alliage', 1, 1], tire: [std(0x121416, { metalness: 0, roughness: 0.9 }), 'Roue', 1, 1],
    windowglass: [glassM(0x14222a, 0.5), 'Vitrage', 0.5, 0.12], clearglass: [glassM(0xe9f1f8, 0.32), 'Optique', 0.32, 0.12],
    orangeglass: [glassM(0xe8820e, 0.85, { emissive: 0x6a3200 }), 'Clignotant', 0.85, 0.3], redglass: [glassM(0xb01212, 0.85, { emissive: 0x5a0606 }), 'Feu arrière', 0.85, 0.3]
  };
  const skins = Object.keys(SKIN).map((k) => SKIN[k]), dark = [std(0x0e0f11, { metalness: 0.2, roughness: 0.6 }), 'Plaque et monogramme', 1, 0.15]; const plate = [std(0xe9ebee, { metalness: 0, roughness: 0.6 }), 'Plaque d’immatriculation', 1, 0.25]; skins.push(dark, plate);
  const HI = { m112: [M_.m112], boite: [M_.boite], freinage: [M_.freinage, M_.disc], suspension: [M_.suspension], direction: [M_.direction], 'elec-w203': [M_['elec-w203']], clim: [M_.clim], carrosserie: [M_.paint] };
  const car = new THREE.Group(); scene.add(car);
  const put = (geo, mat, part, order) => { const m = new THREE.Mesh(geo, mat); if (part) m.userData.part = part; if (order) m.renderOrder = order; car.add(m); return m; };
  const box = (w, h, d) => new THREE.BoxGeometry(w, h, d), cz = (r, len, seg, r2) => new THREE.CylinderGeometry(r2 == null ? r : r2, r, len, seg || 20).rotateX(Math.PI / 2), cx = (r, len, seg, r2) => new THREE.CylinderGeometry(r2 == null ? r : r2, r, len, seg || 20).rotateZ(Math.PI / 2), cy = (r, len, seg) => new THREE.CylinderGeometry(r, r, len, seg || 12);

  /* ---- Carrosserie : modèle allégé, chargé après les organes ---- */
  const wait = document.createElement('p'); wait.className = 'viz-note load3d'; wait.textContent = 'Chargement de la carrosserie…'; host.appendChild(wait);
  let bodyReady = false;
  new GLTFLoader().setMeshoptDecoder(MeshoptDecoder).load(new URL('../models/w203.glb', import.meta.url).href, (g) => {
    const body = new THREE.Group(); body.scale.setScalar(M_SCALE); body.position.x = M_DX; body.add(g.scene);
    g.scene.traverse((o) => { if (!o.isMesh) return; const sk = SKIN[o.material.name] || (o.material.name === 'Material__3' ? plate : dark); o.material.dispose(); o.material = sk[0]; o.userData.part = 'carrosserie'; o.userData.name = sk[1]; o.userData.skin = true; o.renderOrder = sk[2] < 1 ? 6 : 4; });
    car.add(body); bodyReady = true; wait.remove(); wasSolid = null; st.refresh();
  }, undefined, () => { wait.textContent = 'Carrosserie indisponible hors ligne : les organes restent consultables.'; xrayT = 1; manual = true; st.refresh(); });

  /* ---- Organes : chaque pièce est nommée ; un seul maillage par système ---- */
  const discGeo = merge([new THREE.LatheGeometry([[0.75, -0.25], [1.42, -0.25], [1.42, -0.02], [0.8, -0.02], [0.72, 0.3], [0.3, 0.3]].map((q) => new THREE.Vector2(q[0], q[1])), 40).rotateX(Math.PI / 2)]);
  const helix = (r, h, turns) => { const P = []; for (let i = 0; i <= turns * 12; i++) { const a = i / 12 * 2 * Math.PI; P.push(new THREE.Vector3(r * Math.cos(a), h * i / (turns * 12), r * Math.sin(a))); } return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(P), turns * 16, 0.14, 6); };
  const S = { m112: [], boite: [], freinage: [], suspension: [], direction: [], 'elec-w203': [], clim: [] };
  const C = { alu: 0xc2c9d0, cast: 0x8d959e, steel: 0x6c747d, dark: 0x2a2e34, rubber: 0x17191c, exh: 0x9a8f80, hot: 0x7d6f62, mag: 0x555c65, cu: 0xb58a4c, plastic: 0x3a4048, white: 0xdfe3e6, red: 0xa83a2c, blue: 0x5f86a6, gold: 0xa8935a, yellow: 0xc9a13c };
  const add = (sys, name, color, geo, m) => { if (Array.isArray(geo)) { m = geo[1]; geo = geo[0]; } S[sys].push([geo, m || null, name, color]); };
  const cone = (r1, r2, len) => new THREE.CylinderGeometry(r2, r1, len, 16).rotateX(Math.PI / 2);

  /* Moteur M112 : V6 longitudinal, vilebrequin dans l'axe de la voiture */
  const EX = 15.2, EY = 3.75, Q = Math.PI / 4, bank = (d, s) => [EY + d * Math.cos(Q), s * d * Math.sin(Q)];
  add('m112', 'Bloc-cylindres en aluminium', C.alu, box(6.2, 2.5, 3.4), at(EX, EY + 0.1, 0));
  add('m112', 'Carter d’huile', C.cast, box(3.2, 1.25, 2.6), at(13.9, 2.55, 0)); add('m112', 'Carter d’huile', C.cast, box(2.8, 0.5, 2.6), at(16.8, 2.95, 0));
  add('m112', 'Poulie de vilebrequin (damper)', C.steel, cx(0.85, 0.45, 24), at(18.55, EY, 0));
  [-1, 1].forEach((s) => {
    const side = s > 0 ? 'droit' : 'gauche', [by, bz] = bank(2.2, s), [hy, hz] = bank(3.75, s), [cy2, cz2] = bank(4.55, s), [ey, ez] = bank(3.3, s);
    add('m112', 'Bloc-cylindres en aluminium', C.alu, box(6, 2.4, 2.3), at(EX, by, bz, s * Q));
    add('m112', 'Culasse ' + side + ' (3 soupapes par cylindre)', C.cast, box(6.1, 1.25, 2.5), at(EX, hy, hz, s * Q));
    add('m112', 'Couvre-culasse ' + side, C.dark, box(6.15, 0.55, 2.3), at(EX, cy2, cz2, s * Q));
    for (let i = -1; i <= 1; i++) {
      add('m112', 'Bobine d’allumage à double sortie', C.plastic, box(0.75, 0.35, 0.9), at(EX + i * 1.95, cy2 + 0.3, cz2 + s * 0.3, s * Q));
      add('m112', 'Conduit du collecteur d’admission', C.mag, seg([EX + i * 1.9, 7.05, s * 0.9], [EX + i * 1.9, hy + 0.35, hz - s * 0.75], 0.36, 10));
      add('m112', 'Collecteur d’échappement ' + side, C.hot, tube([[EX + i * 1.9, ey - 0.5, ez + s * 0.95], [EX + i * 1.9 - 0.3, ey - 1, ez + s * 1.45], [13.2 - i * 0.1, 3.5, s * 3.1], [12.2, 3.05, s * 2.2]], 0.2));
    }
    add('m112', 'Catalyseur ' + side, C.exh, cx(0.72, 2.6, 16), at(10.4, 2.75, s * 1.75)); add('m112', 'Catalyseur ' + side, C.exh, tube([[12.2, 3.05, s * 2.2], [11.9, 2.85, s * 1.9], [11.7, 2.75, s * 1.75]], 0.3));
    add('m112', 'Sonde lambda', C.gold, seg([11.6, 2.9, s * 1.9], [11.5, 3.5, s * 2.3], 0.08, 6));
    add('m112', 'Ligne d’échappement', C.exh, tube([[9.1, 2.75, s * 1.75], [6, 2.5, s * 1.6], [-2, 2.5, s * 1.5], [-4.2, 2.6, s * 0.7]], 0.26));
    add('m112', 'Réservoir de carburant', C.plastic, box(4.4, 1.5, 4.2), at(-8.9, 3.6, s * 3.5));
  });
  add('m112', 'Collecteur d’admission en magnésium', C.mag, box(5.2, 0.95, 2.1), at(EX - 0.1, 7.2, 0)); add('m112', 'Réservoir de carburant', C.plastic, box(4.4, 0.5, 3), at(-8.9, 4.4, 0));
  add('m112', 'Boîtier papillon', C.alu, cx(0.5, 0.7, 16), at(18.05, 7.1, 0));
  add('m112', 'Conduit d’air et débitmètre', C.rubber, tube([[18.4, 7.1, 0], [19.3, 7.05, 1.2], [19.5, 6.7, 3.4], [19, 6.4, 4.6]], 0.42)); add('m112', 'Boîtier de filtre à air', C.plastic, box(2.4, 1.5, 2.2), at(18.5, 6.2, 5.4));
  add('m112', 'Filtre à huile', C.dark, cy(0.42, 1.3, 14), at(17.7, 6.3, -1.45));
  add('m112', 'Courroie d’accessoires', C.rubber, tube([[18.75, EY - 0.85, 0], [18.75, 3.0, -2.2], [18.75, 4.0, -3.3], [18.75, 5.6, -3.2], [18.75, 6.5, -1.2], [18.75, 6.4, 1.2], [18.75, 5.5, 3.3], [18.75, 4.3, 3.2], [18.75, 3.4, 1.4]], 0.07, true));
  add('m112', 'Silencieux central', C.exh, cx(1, 4.6, 18), at(-6.4, 2.7, 0, 0, 0, 0, 1, 0.6, 2.1));
  add('m112', 'Ligne d’échappement', C.exh, tube([[-8.7, 2.7, 0], [-10.4, 2.6, -1.6], [-12.6, 2.45, -2.6], [-15, 2.9, -3.2], [-16.2, 3.2, -3.4]], 0.3));
  add('m112', 'Silencieux arrière', C.exh, cx(1.15, 5, 18), at(-18.6, 3.3, -3.6, 0, 0, 0, 1, 0.72, 1.8)); add('m112', 'Sortie d’échappement', C.white, cx(0.42, 1.1, 16), at(-21.9, 2.8, -4.6, 0, 0, 0, 1, 0.75, 1));
  add('m112', 'Radiateur', C.alu, box(0.42, 4.2, 10.6), at(19.95, 5, 0)); add('m112', 'Ventilateur électrique', C.dark, cx(1.95, 0.35, 28), at(19.45, 5, 0)); for (let i = 0; i < 7; i++) add('m112', 'Ventilateur électrique', C.plastic, box(0.1, 1.5, 0.5), at(19.25, 5, 0, i * 0.8976 + 0.3, 0, 0, 1, 1, 1));
  add('m112', 'Durite supérieure', C.rubber, tube([[19.7, 6.7, -2.6], [19.1, 6.8, -2.4], [18.5, 6.4, -1.2], [18.3, 5.9, -0.6]], 0.24)); add('m112', 'Durite inférieure', C.rubber, tube([[19.7, 3.4, 2.8], [18.9, 3.2, 2.2], [18.6, 3.5, 1.2]], 0.24));
  add('m112', 'Vase d’expansion', C.white, new THREE.SphereGeometry(0.95, 16, 12), at(18.9, 6.5, -5.3, 0, 0, 0, 1.15, 0.85, 1));

  /* Boîte 722.6 et transmission */
  add('boite', 'Carter de convertisseur de couple', C.alu, new THREE.CylinderGeometry(1.2, 2.05, 1.7, 28).rotateZ(Math.PI / 2), at(11.2, EY + 0.1, 0));
  add('boite', 'Boîte automatique 722.6 (5 rapports)', C.alu, new THREE.CylinderGeometry(0.95, 1.5, 5.4, 24).rotateZ(Math.PI / 2), at(7.7, EY + 0.05, 0));
  for (let i = 0; i < 6; i++) add('boite', 'Boîte automatique 722.6 (5 rapports)', C.cast, box(4.6, 0.1, 0.1), at(7.9, EY + 0.05, 0, i * Math.PI / 3 + 0.3, 0, 0).multiply(at(0, 1.26, 0, 0, 0, 0.1)));
  add('boite', 'Carter d’huile de boîte (ATF)', C.steel, box(3.6, 0.45, 2.5), at(8.4, 2.55, 0)); add('boite', 'Prise électrique de boîte (platine)', C.plastic, cz(0.28, 0.5, 10), at(9.3, 3.2, 1.45));
  add('boite', 'Traverse de boîte', C.steel, box(0.9, 0.4, 8.2), at(5.6, 2.75, 0));
  add('boite', 'Flector avant', C.rubber, cx(0.62, 0.35, 16), at(4.85, 3.85, 0)); add('boite', 'Arbre de transmission', C.steel, cx(0.34, 7.4, 14), at(1, 3.85, 0)); add('boite', 'Palier central d’arbre', C.rubber, cx(0.55, 0.5, 14), at(-2.9, 3.85, 0));
  add('boite', 'Arbre de transmission', C.steel, cx(0.34, 7.2, 14), at(-6.7, 3.8, 0)); add('boite', 'Flector arrière', C.rubber, cx(0.62, 0.35, 16), at(-10.45, 3.75, 0));
  add('boite', 'Pont arrière (différentiel)', C.cast, new THREE.SphereGeometry(1.35, 20, 14), at(RA + 0.4, 3.6, 0, 0, 0, 0, 1.25, 1, 1.15)); add('boite', 'Pont arrière (différentiel)', C.cast, cx(0.7, 1.2, 16), at(RA + 1.9, 3.7, 0));
  [-1, 1].forEach((s) => { add('boite', 'Demi-arbre de roue', C.steel, seg([RA, 3.5, s * 1.5], [RA, WR, s * 6.1], 0.24, 10)); add('boite', 'Soufflet de cardan', C.rubber, cone(0.62, 0.3, 1), at(RA, 3.45, s * 2.1, 0, s > 0 ? 0 : Math.PI, 0)); add('boite', 'Soufflet de cardan', C.rubber, cone(0.3, 0.62, 1), at(RA, WR + 0.05, s * 5.5, 0, s > 0 ? 0 : Math.PI, 0)); });

  /* Roues, freins, trains roulants */
  [[FA, 1], [FA, -1], [RA, 1], [RA, -1]].forEach(([x, s]) => {
    const front = x > 0, d = new THREE.Mesh(discGeo, M_.disc); d.position.set(x, WR, s * TRACK); d.scale.z = s; d.userData.part = 'freinage'; d.userData.name = front ? 'Disque de frein avant (ventilé)' : 'Disque de frein arrière'; car.add(d);
    const zc = s * (TRACK - 0.14), ax = x + (front ? -1.2 : 1.2), ay = WR + 0.35, rz = front ? 0.3 : -0.3, nm = front ? 'avant' : 'arrière';
    add('freinage', 'Étrier de frein ' + nm, C.cast, box(1.5, 1.15, 0.36), at(ax, ay, zc + s * 0.38, 0, 0, rz)); add('freinage', 'Étrier de frein ' + nm, C.cast, box(1.5, 1.15, 0.3), at(ax, ay, zc - s * 0.36, 0, 0, rz)); add('freinage', 'Étrier de frein ' + nm, C.cast, box(0.5, 1.25, 0.9), at(ax + (front ? -0.5 : 0.5), ay + (front ? 0.16 : 0.16), zc, 0, 0, rz));
    add('freinage', 'Plaquettes de frein', C.gold, box(1.2, 0.8, 0.14), at(ax + (front ? 0.08 : -0.08), ay - 0.03, zc + s * 0.2, 0, 0, rz)); add('freinage', 'Plaquettes de frein', C.gold, box(1.2, 0.8, 0.14), at(ax + (front ? 0.08 : -0.08), ay - 0.03, zc - s * 0.19, 0, 0, rz));
    add('freinage', 'Flexible de frein', C.rubber, tube([[ax, ay + 0.5, zc - s * 0.5], [ax + 0.1, ay + 1.2, zc - s * 1.3], [x + (front ? -1.6 : 1.4), 4.2, s * 5]], 0.07));
    add('suspension', 'Porte-fusée ' + nm, C.cast, box(0.9, 2.3, 0.6), at(x, WR + 0.1, s * (TRACK - 1.15))); add('suspension', 'Roulement de roue', C.steel, cz(0.62, 0.9, 16), at(x, WR, s * (TRACK - 0.75)));
    if (front) {
      const zt = s * 5.75;
      add('suspension', 'Amortisseur avant (jambe de force)', C.dark, seg([x - 0.1, 3.4, s * 6.05], [x - 0.35, 6.2, zt], 0.34, 12)); add('suspension', 'Amortisseur avant (jambe de force)', C.white, seg([x - 0.35, 6.2, zt], [x - 0.5, 8.05, s * 5.6], 0.13, 8));
      add('suspension', 'Ressort avant', C.blue, helix(0.78, 2.5, 5), at(x - 0.36, 5.5, s * 5.72, s * -0.1, 0, 0.1)); add('suspension', 'Coupelle et butée de jambe de force', C.rubber, cy(0.95, 0.3, 18), at(x - 0.5, 8.1, s * 5.6));
      add('suspension', 'Bras inférieur avant (tirant)', C.steel, seg([x + 0.1, 2.2, s * 6.3], [x + 0.3, 2.35, s * 2.9], 0.2, 8)); add('suspension', 'Bras de poussée avant', C.steel, seg([x - 0.1, 2.25, s * 6.2], [x + 3.3, 2.5, s * 3.3], 0.2, 8));
      add('suspension', 'Rotule de suspension', C.dark, new THREE.SphereGeometry(0.3, 10, 8), at(x, 2.25, s * 6.3));
      add('suspension', 'Biellette de barre stabilisatrice', C.steel, seg([x + 1.0, 2.9, s * 5.7], [x + 0.3, 5.1, s * 5.9], 0.09, 6));
      add('direction', 'Biellette de direction', C.steel, seg([16.5, 2.45, s * 4.7], [x + 1.1, 2.75, s * 6.35], 0.11, 8)); add('direction', 'Rotule de direction', C.dark, new THREE.SphereGeometry(0.24, 10, 8), at(x + 1.1, 2.75, s * 6.35));
      add('direction', 'Soufflet de crémaillère', C.rubber, cone(0.5, 0.2, 1.3), at(16.5, 2.45, s * 4.1, 0, s > 0 ? 0 : Math.PI, 0));
    } else {
      add('suspension', 'Ressort arrière', C.blue, helix(0.85, 2.6, 5), at(x + 0.25, 2.75, s * 4.7)); add('suspension', 'Amortisseur arrière', C.dark, seg([x - 1.0, 2.7, s * 5.9], [x - 1.2, 5.6, s * 5.5], 0.3, 12)); add('suspension', 'Amortisseur arrière', C.white, seg([x - 1.2, 5.6, s * 5.5], [x - 1.35, 7.5, s * 5.25], 0.12, 8));
      [[1.7, 2.3, 2.4, 'Bras inférieur arrière (support de ressort)', 0.34], [-1.6, 2.5, 2.7, 'Bras de carrossage arrière', 0.15], [1.5, 4.3, 3.9, 'Bras supérieur arrière', 0.15], [-1.5, 4.2, 3.9, 'Bras supérieur arrière', 0.15], [-2.3, 3.2, 3.2, 'Bras de pincement arrière', 0.13]].forEach(([dx, y, y2, n, r]) => add('suspension', n, C.steel, seg([x + dx * 0.25, y2, s * 6.2], [x + dx, y, s * 2.9], r, 8)));
    }
  });
  add('suspension', 'Barre stabilisatrice avant', C.steel, tube([[FA + 1, 2.9, -5.7], [FA + 2.5, 2.7, -5.2], [FA + 2.9, 2.65, -3.6], [FA + 2.9, 2.65, 3.6], [FA + 2.5, 2.7, 5.2], [FA + 1, 2.9, 5.7]], 0.12));
  add('suspension', 'Barre stabilisatrice arrière', C.steel, tube([[RA - 1, 3, -5.2], [RA - 2.3, 2.9, -4.6], [RA - 2.6, 2.9, -3], [RA - 2.6, 2.9, 3], [RA - 2.3, 2.9, 4.6], [RA - 1, 3, 5.2]], 0.1));
  [[FA, 'Berceau avant', 3.2, 3.1], [RA, 'Berceau arrière', 2.3, 2.9]].forEach(([x, n, a, hz]) => { [-1, 1].forEach((s) => { add('suspension', n, C.dark, box(a * 2 + 0.6, 0.45, 0.6), at(x + 0.6, 2.2, s * hz)); add('suspension', n, C.dark, box(0.6, 0.45, hz * 2), at(x + 0.6 + s * a, 2.2, 0)); }); });

  /* Freinage : commande hydraulique */
  add('freinage', 'Servofrein', C.dark, cx(1.3, 0.85, 24), at(11.1, 7, -4.1)); add('freinage', 'Maître-cylindre', C.alu, cx(0.26, 1.5, 12), at(12.2, 7, -4.1)); add('freinage', 'Réservoir de liquide de frein', C.white, box(1, 0.6, 0.9), at(12.3, 7.5, -4.1));
  add('freinage', 'Bloc hydraulique ABS / ESP', C.alu, box(1.2, 1.1, 1.3), at(17.6, 6, -5.4)); add('freinage', 'Bloc hydraulique ABS / ESP', C.dark, box(0.9, 0.9, 1), at(16.7, 6, -5.4));
  [[[12.9, 6.9, -4.1], [15, 6.6, -5], [17, 6.2, -5.4]], [[17.6, 5.4, -5.4], [15.8, 4.4, -5.2], [FA - 1.6, 4.2, -5]], [[17.4, 5.4, -5], [18.6, 3.4, -2], [18.4, 3.2, 3], [16, 4, 4.9], [FA - 1.6, 4.2, 5]], [[17, 5.4, -5.4], [12, 2.5, -5.2], [0, 2.25, -5], [-9, 2.4, -4.6], [RA + 1.4, 4.2, -5]], [[-9, 2.4, -4.6], [-10.5, 4.6, -2], [-10.5, 4.6, 3], [RA + 1.4, 4.2, 5]]].forEach((pts) => add('freinage', 'Canalisation de frein', C.cu, tube(pts, 0.05)));
  add('freinage', 'Câble de frein de stationnement', C.dark, tube([[2.5, 3.3, -0.4], [-6, 3, -1.5], [-10.5, 3.2, -3.4], [RA + 0.6, 3.4, -5.6]], 0.045)); add('freinage', 'Câble de frein de stationnement', C.dark, tube([[-6, 3, -1.5], [-9, 3.1, 1.6], [-10.5, 3.2, 3.4], [RA + 0.6, 3.4, 5.6]], 0.045));

  /* Direction */
  add('direction', 'Crémaillère de direction assistée', C.alu, cz(0.36, 7.2, 14), at(16.5, 2.45, 0)); add('direction', 'Boîtier de pignon et distributeur', C.cast, cy(0.42, 1.2, 12), at(16.5, 2.9, -2.4, 0, 0, 0.5));
  add('direction', 'Colonne de direction', C.steel, seg([16.3, 3.4, -2.5], [12.4, 5.6, -3.8], 0.13, 8)); add('direction', 'Cardan de colonne', C.dark, new THREE.SphereGeometry(0.26, 10, 8), at(12.4, 5.6, -3.8)); add('direction', 'Colonne de direction', C.steel, seg([12.4, 5.6, -3.8], [5.4, 9.05, -3.8], 0.16, 8));
  add('direction', 'Volant', C.dark, new THREE.TorusGeometry(1.45, 0.17, 8, 30).rotateY(Math.PI / 2), at(5.3, 9.1, -3.8, 0, 0, -0.46)); add('direction', 'Volant', C.dark, box(0.3, 0.5, 2.7), at(5.3, 9.1, -3.8, 0, 0, -0.46)); add('direction', 'Volant', C.dark, box(0.3, 1.4, 0.5), at(5.2, 8.5, -3.8, 0, 0, -0.46));
  add('direction', 'Pompe de direction assistée', C.alu, cx(0.6, 1.3, 16), at(18, 5.6, -3.2)); add('direction', 'Réservoir de liquide de direction', C.plastic, cy(0.4, 0.9, 12), at(17.7, 6.5, -3.2));
  add('direction', 'Conduite haute pression', C.rubber, tube([[17.5, 5.4, -3.2], [17.2, 4, -3.5], [16.7, 3, -2.9]], 0.08));

  /* Électricité */
  add('elec-w203', 'Batterie 12 V', C.dark, box(2.6, 1.8, 1.7), at(11.6, 6.6, 5.2)); add('elec-w203', 'Borne positive', C.red, cy(0.14, 0.3, 8), at(12.4, 7.6, 5.5)); add('elec-w203', 'Borne négative', C.white, cy(0.14, 0.3, 8), at(10.8, 7.6, 5.5));
  add('elec-w203', 'Alternateur', C.alu, cx(0.78, 1.5, 18), at(17.9, 5.5, 3.3)); add('elec-w203', 'Démarreur', C.cast, cx(0.45, 1.9, 14), at(12.3, 3.3, 2.5)); add('elec-w203', 'Démarreur', C.cast, cx(0.28, 1.2, 10), at(12.5, 3.95, 2.7));
  add('elec-w203', 'Câble de démarreur', C.red, tube([[12.4, 7.6, 5.5], [12.9, 6, 4.4], [12.6, 4.4, 3]], 0.09)); add('elec-w203', 'Tresse de masse', C.cu, tube([[10.8, 7.6, 5.5], [10.6, 6.6, 6.4], [10.9, 5.6, 6.6]], 0.08));
  add('elec-w203', 'SAM avant (fusibles et relais)', C.plastic, box(1.9, 1.1, 2.3), at(12.1, 6.9, -5.6)); add('elec-w203', 'Calculateur moteur ME', C.alu, box(1.5, 1.2, 0.5), at(11.3, 6.6, 2.4));
  add('elec-w203', 'SAM arrière (coffre)', C.plastic, box(1.8, 1.4, 0.6), at(-17.8, 5.6, 6.6)); add('elec-w203', 'Capteur de vilebrequin', C.yellow, cy(0.12, 0.5, 8), at(12.5, 4.9, -1.5));
  add('elec-w203', 'Capteur d’arbre à cames', C.yellow, cy(0.12, 0.45, 8), at(18.2, 6.5, 2.2)); 
  [-1, 1].forEach((s) => add('elec-w203', 'Faisceau principal', C.yellow, tube([[11.5, 6.4, s * 5.9], [9.6, 4, s * 6.6], [6, 2.95, s * 6.7], [-8, 2.95, s * 6.6], [-14, 4.2, s * 6.4], [-18, 5.2, s * 6.7], [-21.4, 7.4, s * 6]], 0.1)));
  add('elec-w203', 'Faisceau moteur', C.yellow, tube([[12.1, 6.9, -5], [12, 7.3, -2], [13, 7.75, 0], [16.5, 7.75, 0.4], [18.1, 6.6, 2.2]], 0.09));

  /* Climatisation et chauffage */
  add('clim', 'Condenseur', C.blue, box(0.25, 3.7, 10.2), at(20.55, 5, 0)); add('clim', 'Compresseur de climatisation', C.alu, cx(0.72, 1.9, 18), at(17.8, 3.6, -2.9)); add('clim', 'Bouteille déshydratante', C.alu, cy(0.4, 2.6, 12), at(20.4, 5, 5.6));
  add('clim', 'Évaporateur et bloc de chauffage', C.plastic, box(1.9, 2.4, 6.4), at(9.2, 5.9, 0.6)); add('clim', 'Filtre d’habitacle', C.white, box(1.1, 0.45, 2.6), at(10.9, 8, 3.6)); add('clim', 'Pulseur d’air', C.dark, cz(0.95, 1.3, 18), at(9.3, 6.1, 4.6));
  add('clim', 'Conduite haute pression', C.red, tube([[18.6, 3.8, -2.9], [19.9, 4, -4.4], [20.3, 4.6, -5]], 0.09)); add('clim', 'Conduite haute pression', C.red, tube([[20.4, 6.3, 5.6], [19, 7.2, 6], [13, 7.3, 6.6], [10.4, 6.6, 3.6]], 0.08));
  add('clim', 'Conduite basse pression', C.blue, tube([[10.3, 6.2, -1.6], [11.6, 7.4, -3], [15, 7, -4.6], [17.2, 4.6, -3.6], [17.6, 4.1, -3.1]], 0.13));
  add('clim', 'Radiateur de chauffage', C.cu, box(0.5, 1.6, 2.6), at(8.5, 5, 0.6)); add('clim', 'Durites de chauffage', C.rubber, tube([[12.3, 6.4, -0.5], [10.9, 6, 0], [9.6, 5.2, 0.4]], 0.14));
  const organs = Object.keys(S).map((k) => put(merge(S[k]), M_[k], k)); car.children.forEach((o) => { if (o.isMesh && o.material === M_.disc) organs.push(o); });
  /* Ombre au sol */
  const sh = document.createElement('canvas'); sh.width = 256; sh.height = 128; const g2 = sh.getContext('2d'); g2.filter = 'blur(14px)'; g2.fillStyle = 'rgba(0,0,0,.6)'; g2.beginPath(); g2.roundRect(34, 34, 188, 60, 26); g2.fill();
  const shadow = new THREE.Mesh(new THREE.PlaneGeometry(64, 32), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(sh), transparent: true, depthWrite: false })); shadow.rotation.x = -Math.PI / 2; shadow.position.y = 0.01; car.add(shadow);

  /* ---- Repères cliquables et commandes ---- */
  const mods = (window.W203 && window.W203.modules) || [], ui = el.querySelector('[data-ui]'), layer = document.createElement('div'); layer.className = 'hot3d'; host.appendChild(layer);
  const dots = SYS.map(([id, label, pos]) => { const b = document.createElement('button'); b.type = 'button'; b.className = 'hot3d-dot'; b.dataset.sys = id; b.setAttribute('aria-label', label); b.innerHTML = `<span>${label}</span>`; layer.appendChild(b); b.addEventListener('click', () => choose(id)); return { id, b, v: new THREE.Vector3(...pos) }; });
  const more = '<div class="vchips"><span class="viz-note">Maquettes détaillées</span>' + Object.keys(MAQ).flatMap((k) => MAQ[k]).map(([t, l]) => `<a class="vchip" href="#l-${l}">${t.replace(' en 3D', '')}</a>`).join('') + '<a class="vchip" href="#ref-schemas">Toutes</a></div>';
  const hint = '<p class="viz-note">Glisse pour tourner la voiture, pince pour zoomer. Touche un système : la carrosserie devient transparente. Touche ensuite une pièce pour connaître son nom.</p>';
  const credit = '<p class="viz-note">Carrosserie : « 2000 Mercedes C-class W203 » par <a href="https://sketchfab.com/Resinnnn" target="_blank" rel="noopener">RES1N</a>, licence <a href="http://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noopener">CC BY 4.0</a>, compressée et rematérialisée. Organes : maquette de principe de l’Académie.</p>';
  ui.innerHTML = `<div class="vchips" role="group" aria-label="Systèmes de la voiture">${SYS.map(([id, label]) => `<button class="vbtn sm" type="button" data-sys="${id}" aria-pressed="false">${label}</button>`).join('')}<label class="vtoggle"><input type="checkbox" data-xray><span class="vtrack" aria-hidden="true"></span>Radiographie</label></div><div class="vchips"><span class="viz-note">Teinte</span>${PAINTS.map(([n, c], i) => `<button type="button" class="swatch3d${i ? '' : ' sel'}" data-paint="${i}" style="--c:#${c.toString(16).padStart(6, '0')}" aria-label="${n}" title="${n}"></button>`).join('')}</div><div class="hot3d-card" data-card aria-live="polite">${hint}</div>${more}${credit}`;
  ui.querySelectorAll('.vbtn[data-sys]').forEach((b) => b.addEventListener('click', () => choose(b.dataset.sys)));
  const xr = ui.querySelector('[data-xray]');
  const setPaint = (i) => { const [, c, mt, r] = PAINTS[i] || PAINTS[0]; M_.paint.color.setHex(c); M_.paint.metalness = mt; M_.paint.roughness = r; ui.querySelectorAll('[data-paint]').forEach((b) => b.classList.toggle('sel', +b.dataset.paint === i)); try { localStorage.setItem('w203-teinte', String(i)); } catch (e) { /* ignoré */ } st.refresh(); };
  ui.querySelectorAll('[data-paint]').forEach((b) => b.addEventListener('click', () => setPaint(+b.dataset.paint)));
  try { const sv = +localStorage.getItem('w203-teinte'); if (sv > 0 && PAINTS[sv]) setPaint(sv); } catch (e) { /* ignoré */ }
  let sel = null, spin = !reduced(), pulse = 0, xray = 0, xrayT = 0, manual = false, wasSolid = null;
  xr.addEventListener('change', () => { manual = xr.checked; xrayT = manual || (sel && sel !== 'carrosserie') ? 1 : 0; st.refresh(); });
  function choose(id) {
    sel = sel === id ? null : id; spin = false;
    el.querySelectorAll('[data-sys]').forEach((b) => { const on = b.dataset.sys === sel; b.classList.toggle('sel', on); if (b.hasAttribute('aria-pressed')) b.setAttribute('aria-pressed', on ? 'true' : 'false'); });
    const m = mods.find((x) => x.id === sel), card = ui.querySelector('[data-card]');
    card.innerHTML = m ? `<div><p class="eyebrow">${m.code} · ${m.lessons.length} leçons</p><b>${m.title}</b><p>${m.desc}</p><p class="piece" data-piece></p></div><div class="row" style="gap:8px;flex-wrap:wrap">${(MAQ[m.id] || []).map(([t, l]) => `<a class="btn small" href="#l-${l}">${t}</a>`).join('')}<a class="btn small quiet" href="#m-${m.id}">Ouvrir le module</a></div>` : hint;
    xrayT = manual || (sel && sel !== 'carrosserie') ? 1 : 0; xr.checked = xrayT === 1;
    st.refresh();
  }
  const ray = new THREE.Raycaster();
  st.onTap((ndc) => { ray.setFromCamera(ndc, st.camera); const hits = ray.intersectObjects(car.children, true).filter((h) => h.object.userData.part); if (!hits.length) return; const h = (xray > 0.5 && hits.find((x) => !x.object.userData.skin)) || hits[0]; const o = h.object, piece = o.userData.name || nameAt(o.geometry, h.faceIndex); if (o.userData.part !== sel) choose(o.userData.part); const pc = ui.querySelector('[data-piece]'); if (pc) pc.innerHTML = piece ? 'Pièce touchée : <strong>' + piece + '</strong>' : ''; });
  st.canvas.addEventListener('pointerdown', () => { spin = false; });
  const p = new THREE.Vector3();
  st.onFrame((dt, real) => {
    if (spin) { st.orbit.taz += dt * 0.14; st.orbit.az = st.orbit.taz; }
    pulse += real || 0.016;
    xray += (xrayT - xray) * (1 - Math.pow(0.003, real || 0.016)); if (Math.abs(xrayT - xray) < 0.004) xray = xrayT; if (reduced()) xray = xrayT;
    const solid = xray < 0.01;
    if (solid !== wasSolid) { wasSolid = solid; skins.forEach(([m, , op, xo]) => { if (xo >= 1) return; const tr = !solid || op < 1; m.transparent = tr; m.depthWrite = !tr; m.needsUpdate = true; }); }
    skins.forEach(([m, , op, xo]) => { m.opacity = op + (xo - op) * xray; });
    const show = xray > 0.02 || !bodyReady; organs.forEach((o) => { o.visible = show; });
    layer.style.opacity = xray.toFixed(2); layer.style.visibility = xray > 0.02 ? 'visible' : 'hidden';
    Object.keys(HI).forEach((k) => HI[k].forEach((m) => { if (k === sel) m.emissive.copy(accent).multiplyScalar((k === 'carrosserie' ? 0.16 : 0.3) + 0.14 * Math.sin(pulse * 4) * (k === 'carrosserie' ? 0.5 : 1)); else m.emissive.setHex(0); }));
    const w = host.clientWidth, h = host.clientHeight;
    dots.forEach((d) => { d.b.classList.toggle('sel', d.id === sel); p.copy(d.v).project(st.camera); d.b.style.transform = `translate(${((p.x + 1) / 2 * w).toFixed(1)}px,${((1 - p.y) / 2 * h).toFixed(1)}px)`; });
    return !!sel || xray !== xrayT;
  });
  st.refresh();
  return st;
}
