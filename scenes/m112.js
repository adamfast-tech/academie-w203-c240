/* Le V6 M112 en 3D : maquette pédagogique procédurale. Code original ; rendu par three.js (MIT). */
import { THREE, createStage, cssVar, reduced, merge, at, tube } from './kit.js';

const D = Math.PI / 180;
/* Cotes en centimètres. Alésage et course du M112.912 (2 597 cm³) ; le reste est approximatif. */
const BORE = 8.99, STROKE = 6.82, R = STROKE / 2, ROD = 15.4, PITCH = 10.6, STAG = 1.2, DECK = 22.2, CROWN = 2.9;
const ORDER = [1, 4, 3, 6, 2, 5];
/* Banc droit (cylindres 1 à 3) côté x négatif, banc gauche (4 à 6) côté x positif, avant du moteur vers +z. */
const CYL = [1, 2, 3, 4, 5, 6].map((n) => {
  const right = n <= 3, row = (n - 1) % 3, bank = (right ? -45 : 45) * D, fire = ORDER.indexOf(n) * 120 * D;
  return { n, right, bank, fire, alpha: bank - fire, z: (1 - row) * PITCH + (right ? STAG : -STAG), inner: right ? 1 : -1 };
});
const PHASES = [['Détente', 0xf97316], ['Échappement', 0x7d8794], ['Admission', 0x3b82f6], ['Compression', 0x8b5cf6]];

const PARTS = {
  bloc: ['Bloc', 'Bloc en alliage d’aluminium, V ouvert à 90°. Les cylindres sont chemisés en alliage aluminium-silicium : pas de réalésage classique, un bloc usé se remplace.'],
  vilebrequin: ['Vilebrequin', 'Trois coudes, deux bielles par coude. Les manetons de chaque coude sont décalés de 30° : c’est ce qui donne une combustion tous les 120° malgré le V à 90°.'],
  pistons: ['Pistons et bielles', 'Six pistons de 89,9 mm pour 68,2 mm de course, bielles en acier forgé. La couleur du gaz montre le temps en cours dans chaque cylindre.'],
  culasses: ['Culasses et soupapes', 'Trois soupapes par cylindre : deux d’admission côté intérieur du V (bleu), une seule d’échappement côté extérieur (orange), pour garder des gaz chauds vers les catalyseurs.'],
  distribution: ['Distribution', 'Un seul arbre à cames en tête par banc, entraîné par chaîne depuis le vilebrequin. Il tourne deux fois moins vite que lui : un tour d’arbre à cames pour un cycle complet.'],
  equilibrage: ['Arbre d’équilibrage', 'Logé au creux du V, il tourne à la vitesse du vilebrequin, en sens inverse. Il compense le balancement propre à un V6 à 90°.'],
  injection: ['Injection', 'Injection séquentielle multipoint : un injecteur par cylindre pulvérise l’essence dans le conduit d’admission, au moment où les soupapes vont s’ouvrir. Le brouillard bleu clair montre chaque injection.'],
  allumage: ['Double allumage', 'Deux bougies par cylindre, douze au total, alimentées par six bobines à double sortie. Ordre d’allumage : 1-4-3-6-2-5.']
};

function ui(el) {
  const chips = ORDER.map((n) => `<span class="vchip" data-fire="${n}">${n}</span>`).join('');
  const parts = Object.keys(PARTS).map((k) => `<button class="vbtn sm" type="button" data-part="${k}" aria-pressed="false">${PARTS[k][0]}</button>`).join('');
  const tg = (k, label, on) => `<label class="vtoggle"><input type="checkbox" data-t="${k}"${on ? ' checked' : ''}><span class="vtrack" aria-hidden="true"></span>${label}</label>`;
  const legend = PHASES.slice(2).concat(PHASES.slice(0, 2)).map(([t, c]) => `<span class="lg3d"><i style="background:#${c.toString(16).padStart(6, '0')}"></i>${t}</span>`).join('');
  el.querySelector('[data-ui]').innerHTML = `
    <div class="vchips" aria-hidden="true"><span class="viz-note">Ordre d’allumage</span>${chips}<span class="viz-note" data-rpm></span><span class="vchip on" data-ph style="margin-left:auto"></span></div>
    <div class="vchips" role="group" aria-label="Pièces du moteur">${parts}</div>
    <p class="viz-desc" data-desc aria-live="polite">Touche une pièce, dans la scène ou dans la liste, pour savoir ce qu’elle fait.</p>
    <div class="vchips">${tg('skin', 'Carters', false)}${tg('boom', 'Vue éclatée', false)}</div>
    <div class="vchips" role="group" aria-label="Angle de vue"><span class="viz-note">Vue</span>
      <button class="vbtn sm" type="button" data-view="0,0.08">Face</button><button class="vbtn sm" type="button" data-view="0.65,0.36">3/4</button><button class="vbtn sm" type="button" data-view="1.5708,0.1">Côté</button><button class="vbtn sm" type="button" data-view="0,1.4">Dessus</button>
    </div>
    <div class="vchips"><button class="vbtn sm" type="button" data-step>Pas à pas : + 30°</button><span class="viz-note">Mets en pause, puis avance le vilebrequin cran par cran.</span></div>
    <label class="vrange"><span style="text-align:left;min-width:0">Vitesse</span><input type="range" min="4" max="90" step="1" value="24" data-speed aria-label="Vitesse de rotation de la maquette"><span class="mono tnum" data-speedv></span></label>
    <div class="vchips" aria-hidden="true">${legend}</div>
    <p class="viz-note">Maquette simplifiée, proportions approximatives : elle montre le principe, pas les cotes. Glisse pour tourner, pince ou Ctrl + molette pour zoomer.</p>`;
}

export function mount(el) {
  const host = el.querySelector('[data-stage]');
  host.innerHTML = '';
  const st = createStage(host, { target: [0, 13, 0], radius: 102, az: 0.65, el: 0.36, minEl: -0.35, label: 'Maquette 3D du V6 M112 en fonctionnement' });
  ui(el);
  const { scene } = st;
  const std = (color, o) => new THREE.MeshStandardMaterial(Object.assign({ color, metalness: 0.75, roughness: 0.38 }, o || {}));
  const glass = (color, op) => new THREE.MeshStandardMaterial({ color, metalness: 0.3, roughness: 0.35, transparent: true, opacity: op, depthWrite: false, side: THREE.DoubleSide });
  const M = {
    bloc: glass(0xaab4c0, 0.16), sleeve: glass(0xcfd6de, 0.22), head: glass(0xb7c0cb, 0.2),
    crank: std(0x8d949d, { roughness: 0.3 }), piston: std(0xd6dbe1, { roughness: 0.45 }), rod: std(0x6f7781),
    cam: std(0xa9b0b8, { roughness: 0.3 }), vin: std(0x3b82f6, { metalness: 0.5 }), vex: std(0xf97316, { metalness: 0.5 }),
    plug: new THREE.MeshStandardMaterial({ color: 0xffffff, vertexColors: true, metalness: 0.3, roughness: 0.45 }), inj: std(0x2f6f4f, { metalness: 0.3, roughness: 0.5 }), exh: std(0x8a7f72, { roughness: 0.55 }), plugTip: std(0x30353b), bal: std(0xc9a14a, { roughness: 0.35 }),
    chain: std(0x4b525b, { roughness: 0.5 }), cover: std(0x2b3037, { metalness: 0.4, roughness: 0.55 }), alu: std(0xb9c1ca, { roughness: 0.5 }), mag: std(0x565d66, { metalness: 0.3, roughness: 0.7 })
  };
  const GROUPS = { bloc: [M.bloc, M.sleeve], vilebrequin: [M.crank], pistons: [M.piston, M.rod], culasses: [M.head, M.vin, M.vex], distribution: [M.cam, M.chain], equilibrage: [M.bal], allumage: [M.plug], injection: [M.inj] };
  const NAMES = new Map([[M.bloc, 'Bloc-cylindres'], [M.sleeve, 'Chemise aluminium-silicium'], [M.head, 'Culasse'], [M.crank, 'Vilebrequin'], [M.piston, 'Piston'], [M.rod, 'Bielle'], [M.cam, 'Arbre à cames'], [M.vin, 'Soupape d’admission'], [M.vex, 'Soupape d’échappement'], [M.plug, 'Bougie d’allumage'], [M.bal, 'Arbre d’équilibrage'], [M.chain, 'Chaîne et pignons de distribution'], [M.inj, 'Injecteur'], [M.alu, 'Poulie de vilebrequin']]);
  const mesh = (geo, mat, part, parent) => { const m = new THREE.Mesh(geo, mat); if (part) m.userData.part = part; (parent || scene).add(m); return m; };
  const cylZ = (r, len, seg) => new THREE.CylinderGeometry(r, r, len, seg || 28).rotateX(Math.PI / 2);

  /* ---- Bas moteur ---- */
  const engine = new THREE.Group(); scene.add(engine);
  mesh(new THREE.BoxGeometry(19, 15, 35), M.bloc, 'bloc', engine).position.set(0, 0.5, 0);
  const crank = new THREE.Group(); engine.add(crank);
  const cw = new THREE.CylinderGeometry(6.6, 6.6, 1.1, 24, 1, false, Math.PI * 0.5, Math.PI).rotateX(Math.PI / 2);
  const ck = [[cylZ(2.5, 44, 24), at(0, 0, 1)], [cylZ(12.5, 1.6, 48), at(0, 0, -20.5)], [new THREE.TorusGeometry(12.5, 0.5, 6, 72), at(0, 0, -20.5)]];
  CYL.forEach((c) => {
    const rot = () => at(0, 0, 0, 0, 0, -c.alpha), zw = c.z + (c.right ? 1 : -1) * 1.75;
    ck.push([cylZ(2.25, 2.3, 22), rot().multiply(at(0, R, c.z))], [new THREE.BoxGeometry(4.6, R + 4.4, 1.1), rot().multiply(at(0, R / 2, zw))], [cw.clone(), rot().multiply(at(0, -0.6, zw, 0, 0, Math.PI / 2))]);
  });
  mesh(merge(ck), M.crank, 'vilebrequin', crank);
  mesh(cylZ(5.2, 1.8, 36), M.alu, 'vilebrequin', crank).position.z = 22;
  mesh(cylZ(2.6, 1, 20), M.chain, 'distribution', crank).position.z = 18.6;

  /* ---- Bancs ---- */
  const banks = {}, parts = [];
  [true, false].forEach((right) => {
    const b = new THREE.Group(); b.rotation.z = right ? 45 * D : -45 * D; engine.add(b);
    mesh(new THREE.BoxGeometry(11.6, 13.4, 35), M.bloc, 'bloc', b).position.set(0, DECK - 6.7, 0);
    const head = new THREE.Group(); b.add(head);
    mesh(new THREE.BoxGeometry(12.4, 7.2, 35.6), M.head, 'culasses', head).position.set(0, DECK + 3.9, 0);
    const top = new THREE.Group(); head.add(top);
    const inner = right ? 1 : -1;
    const cam = new THREE.Group(); cam.position.set(inner * 0.6, DECK + 9.4, 0); top.add(cam);
    mesh(cylZ(1, 39, 16), M.cam, 'distribution', cam).position.z = 1.2;
    const sprocket = new THREE.Group(); sprocket.position.set(inner * 0.6, DECK + 9.4, 18.6); b.add(sprocket);
    mesh(cylZ(5, 0.9, 40), M.chain, 'distribution', sprocket);
    for (let i = 0; i < 5; i++) { const h = mesh(cylZ(0.9, 1, 12), M.cover, 'distribution', sprocket); h.position.set(3.1 * Math.cos(i * 1.2566), 3.1 * Math.sin(i * 1.2566), 0); }
    const skin = new THREE.Group(); b.add(skin);
    const cov = mesh(new THREE.BoxGeometry(12.8, 4.6, 36), M.cover, 'culasses', skin); cov.position.set(0, DECK + 12.4, 0);
    banks[right] = { b, head, top, cam, sprocket, skin, lobes: [] };
    for (let i = -1; i <= 1; i++) mesh(tube([[-inner * 6.3, DECK + 3.4, i * PITCH + (right ? STAG : -STAG)], [-inner * 8.2, DECK + 2.6, i * PITCH - 1], [-inner * 9.2, DECK + 0.4, i * PITCH - 3 - (i + 1) * 1.5], [-inner * 9.4, DECK - 2.5, -17]], 1.25), M.exh, null, skin).userData.name = 'Collecteur d’échappement';
  });

  const rodGeo = merge([[new THREE.BoxGeometry(1.3, ROD - 3.8, 0.9), null], [new THREE.BoxGeometry(2.1, ROD - 3.8, 0.34), null], [cylZ(3.15, 1.7, 28), at(0, -ROD / 2, 0)], [cylZ(1.5, 1.7, 20), at(0, ROD / 2, 0)]]);
  const pistonGeo = merge([[new THREE.CylinderGeometry(BORE / 2 - 0.05, BORE / 2 - 0.05, 2.4, 36), at(0, CROWN - 1.2, 0)], [new THREE.CylinderGeometry(BORE / 2 - 0.25, BORE / 2 - 0.25, 2.8, 36, 1, true), at(0, CROWN - 3.8, 0)], [new THREE.CylinderGeometry(2.6, 2.6, 0.2, 24), at(0, CROWN + 0.02, 0)]]);
  const ringGeo = merge([0, 1, 2].map((i) => [new THREE.TorusGeometry(BORE / 2 - 0.02, 0.12, 6, 40).rotateX(Math.PI / 2), at(0, CROWN - 0.6 - i * 0.55, 0)]).concat([[cylZ(1, 6.4, 14), null]]));
  const valveGeo = {}, vGeo = (r) => valveGeo[r] || (valveGeo[r] = merge([[new THREE.CylinderGeometry(r, r * 0.5, 0.55, 24), null], [new THREE.CylinderGeometry(0.28, 0.28, 7.6, 10), at(0, 4, 0)], [new THREE.CylinderGeometry(0.75, 0.75, 0.3, 14), at(0, 7.3, 0)]]));
  const springGeo = (() => { const P = []; for (let i = 0; i <= 60; i++) { const a = i / 12 * 2 * Math.PI; P.push(new THREE.Vector3(0.62 * Math.cos(a), i / 60, 0.62 * Math.sin(a))); } return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(P), 80, 0.09, 5); })();
  const plugGeo = merge([[new THREE.CylinderGeometry(0.3, 0.3, 1.6, 10), at(0, 0.8, 0), null, 0x30353b], [new THREE.CylinderGeometry(0.55, 0.55, 0.7, 6), at(0, 1.9, 0), null, 0xa9b0b8], [new THREE.CylinderGeometry(0.45, 0.5, 3.4, 14), at(0, 3.9, 0), null, 0xf2f0e8], [new THREE.CylinderGeometry(0.62, 0.62, 2.2, 14), at(0, 6.6, 0), null, 0x22262b]]);
  const sparkGeo = new THREE.SphereGeometry(0.5, 10, 8), sparkMat = new THREE.MeshBasicMaterial({ color: 0xfff1a8 });
  const injGeo = merge([[new THREE.CylinderGeometry(0.5, 0.42, 2.6, 12), null], [new THREE.CylinderGeometry(0.22, 0.22, 0.9, 8), at(0, -1.7, 0)], [new THREE.BoxGeometry(0.9, 0.7, 0.7), at(0.5, 1.1, 0)]]);
  const sprayGeo = new THREE.ConeGeometry(1.25, 3, 14, 1, true).translate(0, -3.6, 0);
  CYL.forEach((c) => {
    const k = banks[c.right], inner = c.inner;
    mesh(new THREE.CylinderGeometry(BORE / 2 + 0.25, BORE / 2 + 0.25, 12.6, 36, 1, true), M.sleeve, 'bloc', k.b).position.set(0, DECK - 6.3, c.z);
    const piston = new THREE.Group(); k.b.add(piston);
    mesh(pistonGeo, M.piston, 'pistons', piston); mesh(ringGeo, M.rod, 'pistons', piston);
    const rod = mesh(rodGeo, M.rod, 'pistons', k.b);
    const gasMat = new THREE.MeshStandardMaterial({ color: 0x3b82f6, transparent: true, opacity: 0.5, depthWrite: false, roughness: 1, metalness: 0, emissive: 0x000000 });
    const gas = mesh(new THREE.CylinderGeometry(BORE / 2 - 0.15, BORE / 2 - 0.15, 1, 28), gasMat, null, k.b);
    /* Soupapes : deux d'admission côté V, une d'échappement côté extérieur. */
    const valve = (x, z, r, mat) => {
      const g = new THREE.Group(); g.position.set(x, DECK + 0.25, z); g.rotation.z = -Math.sign(x) * 0.18; k.head.add(g);
      const mv = mesh(vGeo(r), mat, 'culasses', g), sp = mesh(springGeo, M.cam, 'culasses', g); sp.position.y = 3.6; sp.userData.name = 'Ressort de soupape';
      return { mv, sp };
    };
    const sparks = [];
    const vin = [valve(inner * 2.1, c.z - 2.15, 1.85, M.vin), valve(inner * 2.1, c.z + 2.15, 1.85, M.vin)];
    const vex = [valve(-inner * 2.2, c.z, 2.1, M.vex)];
    [-1, 1].forEach((sgn) => {
      const p = new THREE.Group(); p.position.set(-inner * 2.9, DECK + 0.5, c.z + sgn * 3.3); p.rotation.z = inner * 0.42; k.top.add(p);
      mesh(plugGeo, M.plug, 'allumage', p); const sk = new THREE.Mesh(sparkGeo, sparkMat); sk.visible = false; p.add(sk); sparks.push(sk);
    });
    const ij = new THREE.Group(); ij.position.set(inner * 4.7, DECK + 5.4, c.z); ij.rotation.z = -inner * 0.45; k.top.add(ij);
    mesh(injGeo, M.inj, 'injection', ij);
    const sprayMat = new THREE.MeshBasicMaterial({ color: 0x9fd4ff, transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide }), spray = new THREE.Mesh(sprayGeo, sprayMat); ij.add(spray);
    /* Cames : deux d'admission, une d'échappement, calées sur le cycle du cylindre. */
    const lobe = (z, open) => k.lobes.push([cylZ(1.25, 1.1, 18), at(0.55 * Math.sin((open - c.fire) / 2), -0.55 * Math.cos((open - c.fire) / 2), z)]);
    lobe(c.z - 2.15, 460 * D); lobe(c.z + 2.15, 460 * D); lobe(c.z, 260 * D);
    /* Repère du cylindre */
    const cv = document.createElement('canvas'); cv.width = cv.height = 96; const x = cv.getContext('2d');
    x.fillStyle = '#fff'; x.beginPath(); x.arc(48, 48, 44, 0, 7); x.fill(); x.fillStyle = '#000'; x.font = '600 58px system-ui,sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(String(c.n), 48, 52);
    const tx = new THREE.CanvasTexture(cv); tx.colorSpace = THREE.SRGBColorSpace;
    const tag = new THREE.Sprite(new THREE.SpriteMaterial({ map: tx, depthTest: false, transparent: true, opacity: 0.92 })); tag.scale.set(4.4, 4.4, 1); tag.position.set(-inner * 9.5, DECK + 13, c.z); tag.renderOrder = 5; k.b.add(tag);
    parts.push({ c, piston, rod, gas, gasMat, vin, vex, sparks, spray, sprayMat, tag, chip: el.querySelector(`[data-fire="${c.n}"]`), lit: 0 });
  });

  [true, false].forEach((r) => mesh(merge(banks[r].lobes), M.cam, 'distribution', banks[r].cam));

  /* ---- Arbre d'équilibrage, chaîne, carters ---- */
  const BAL_Y = 12.5;
  const bal = new THREE.Group(); bal.position.y = BAL_Y; engine.add(bal);
  mesh(cylZ(0.95, 39, 16), M.bal, 'equilibrage', bal).position.z = 1.2;
  const bw = new THREE.CylinderGeometry(2.6, 2.6, 4.5, 20, 1, false, 0, Math.PI).rotateX(Math.PI / 2);
  mesh(bw, M.bal, 'equilibrage', bal).position.z = 10.6; const bw2 = mesh(bw, M.bal, 'equilibrage', bal); bw2.position.z = -10.6; bw2.rotation.z = Math.PI;
  mesh(cylZ(2.6, 0.9, 24), M.chain, 'distribution', bal).position.z = 18.6;

  const timing = new THREE.Group(); engine.add(timing);
  const camXY = (right) => { const a = right ? 45 * D : -45 * D, lx = (right ? 1 : -1) * 0.6, ly = DECK + 9.4; return [lx * Math.cos(a) - ly * Math.sin(a), lx * Math.sin(a) + ly * Math.cos(a)]; };
  const [cx, cy] = camXY(false), P = [];
  const arc = (ox, oy, r, a0, a1, n) => { for (let i = 0; i <= n; i++) { const a = (a0 + (a1 - a0) * i / n) * D; P.push(new THREE.Vector3(ox + r * Math.cos(a), oy + r * Math.sin(a), 18.6)); } };
  arc(0, 0, 2.9, 330, 210, 4); arc(-cx, cy, 5.3, 215, 30, 6); arc(0, BAL_Y, 2.9, 210, 330, 3); arc(cx, cy, 5.3, 150, -35, 6);
  const path = new THREE.CatmullRomCurve3(P, true, 'centripetal');
  const NL = 110, links = new THREE.InstancedMesh(new THREE.BoxGeometry(0.95, 0.55, 1.1), M.chain, NL); links.userData.part = 'distribution'; timing.add(links);
  const chainLen = path.getLength(), dummy = new THREE.Object3D(), tan = new THREE.Vector3();
  const layChain = (off) => { for (let i = 0; i < NL; i++) { const u = ((i / NL + off) % 1 + 1) % 1; path.getPointAt(u, dummy.position); path.getTangentAt(u, tan); dummy.rotation.set(0, 0, Math.atan2(tan.y, tan.x)); dummy.updateMatrix(); links.setMatrixAt(i, dummy.matrix); } links.instanceMatrix.needsUpdate = true; };

  const skin = new THREE.Group(); engine.add(skin);
  mesh(new THREE.BoxGeometry(18, 7, 34), M.cover, null, skin).position.set(0, -10.6, 0);
  const mani = new THREE.Group(); mani.position.y = 27; skin.add(mani);
  mesh(new THREE.BoxGeometry(17, 7.5, 27), M.mag, null, mani).position.y = 2;
  for (let i = -1; i <= 1; i++) [-1, 1].forEach((sx) => { const r = mesh(new THREE.TorusGeometry(5.6, 1.7, 10, 20, Math.PI * 0.62), M.mag, null, mani); r.position.set(sx * 7.5, -2.2, i * PITCH); r.scale.x = sx; r.rotation.z = -0.3 * sx; });
  mesh(cylZ(3.4, 5, 24), M.alu, null, mani).position.set(0, 2.4, 16);
  skin.visible = false; banks[true].skin.visible = banks[false].skin.visible = false;

  /* ---- Mouvement ---- */
  let ph1 = -1; const phEl = el.querySelector('[data-ph]');
  let theta = 0, rpm = 24, boom = 0, boomT = 0, sel = null, pulse = 0, covered = false;
  const accent = new THREE.Color(cssVar('--accent', '#1C5797')).lerp(new THREE.Color(0x4da3ff), 0.45);
  const up = new THREE.Vector3(0, 1, 0), dir = new THREE.Vector3(), col = new THREE.Color();
  const lift = (psi, a, b) => { if (psi < a || psi > b) return 0; const s = Math.sin(Math.PI * (psi - a) / (b - a)); return s * s; };
  const TAU = 2 * Math.PI;
  function pose(dt) {
    crank.rotation.z = -theta; bal.rotation.z = theta;
    banks[true].cam.rotation.z = banks[false].cam.rotation.z = -theta / 2;
    banks[true].sprocket.rotation.z = banks[false].sprocket.rotation.z = -theta / 2;
    layChain(-(theta * 2.9) / chainLen);
    parts.forEach((p) => {
      const c = p.c, a = theta + c.alpha - c.bank, px = R * Math.sin(a), py = R * Math.cos(a);
      const d = py + Math.sqrt(ROD * ROD - px * px);
      p.piston.position.set(0, d, c.z);
      dir.set(-px, d - py, 0).normalize(); p.rod.quaternion.setFromUnitVectors(up, dir); p.rod.position.set(px / 2, (d + py) / 2, c.z);
      const psi = (((theta - c.fire) % (2 * TAU)) + 2 * TAU) % (2 * TAU) / D, ph = Math.min(3, Math.floor(psi / 180));
      const h = Math.max(0.05, DECK - (d + CROWN)); p.gas.scale.y = h; p.gas.position.set(0, d + CROWN + h / 2, c.z);
      const burn = ph === 0 ? Math.max(0, 1 - psi / 70) : 0;
      col.setHex(PHASES[ph][1]); p.gasMat.color.copy(col); p.gasMat.emissive.setHex(0xff7a1a).multiplyScalar(burn * 2.4);
      p.gasMat.opacity = ph === 3 ? 0.35 + 0.4 * (psi - 540) / 180 : (ph === 0 ? 0.75 - 0.3 * psi / 180 : 0.42);
      const li = lift(psi, 345, 585) * 0.95, le = lift(psi, 135, 375) * 0.95;
      p.vin.forEach((v) => { v.mv.position.y = -li; v.sp.scale.y = 3.6 - li; }); p.vex.forEach((v) => { v.mv.position.y = -le; v.sp.scale.y = 3.6 - le; });
      const fire = psi < 24; p.sparks.forEach((sk) => { sk.visible = fire; if (fire) sk.scale.setScalar(0.6 + 0.7 * Math.abs(Math.sin(psi * 0.9))); });
      const inj = lift(psi, 325, 430); p.spray.visible = inj > 0.01; p.sprayMat.opacity = 0.55 * inj;
      if (c.n === 1 && ph !== ph1) { ph1 = ph; if (phEl) phEl.textContent = 'Cylindre 1 : ' + PHASES[ph][0].toLowerCase(); }
      const lit = psi < 110; if (lit !== !!p.lit) { p.lit = lit ? 1 : 0; if (p.chip) p.chip.classList.toggle('on', lit); p.tag.material.color.setHex(lit ? 0xffb347 : 0xffffff); }
    });
    /* Vue éclatée */
    boom += (boomT - boom) * (1 - Math.pow(0.002, dt || 0.016)); if (Math.abs(boomT - boom) < 0.001) boom = boomT;
    [true, false].forEach((r) => { const k = banks[r]; k.head.position.y = boom * 9; k.top.position.y = boom * 8; k.skin.position.y = boom * 26; });
    bal.position.y = BAL_Y + boom * 15; timing.position.z = boom * 13; mani.position.y = 27 + boom * 30;
    banks[true].sprocket.position.z = banks[false].sprocket.position.z = 18.6 + boom * 13;
    /* Mise en évidence de la pièce choisie */
    pulse += dt || 0.016;
    Object.keys(GROUPS).forEach((g) => GROUPS[g].forEach((m) => { if (g === sel) m.emissive.copy(accent).multiplyScalar(0.45 + 0.25 * Math.sin(pulse * 4)); else m.emissive.setHex(0); }));
    const see = covered ? 0.92 : 0;
    M.bloc.opacity = see || (sel === 'bloc' ? 0.5 : 0.16); M.sleeve.opacity = sel === 'bloc' ? 0.55 : 0.22; M.head.opacity = see || (sel === 'culasses' ? 0.5 : 0.2);
    M.bloc.depthWrite = M.head.depthWrite = covered;
    return Math.abs(boomT - boom) > 0 || !!sel;
  }
  st.onFrame((dt, real) => { theta = (theta + dt * rpm / 60 * TAU) % (2 * TAU); return pose(real); });

  /* ---- Commandes ---- */
  const q = (s) => el.querySelector(s), desc = q('[data-desc]');
  function choose(k) {
    sel = sel === k ? null : k;
    el.querySelectorAll('[data-part]').forEach((b) => { const on = b.dataset.part === sel; b.classList.toggle('sel', on); b.setAttribute('aria-pressed', on ? 'true' : 'false'); });
    desc.innerHTML = sel ? `<strong>${PARTS[sel][0]}.</strong> ${PARTS[sel][1]}` : 'Touche une pièce, dans la scène ou dans la liste, pour savoir ce qu’elle fait.';
    st.refresh();
  }
  el.querySelectorAll('[data-part]').forEach((b) => b.addEventListener('click', () => choose(b.dataset.part)));
  const ray = new THREE.Raycaster();
  st.onTap((ndc) => {
    ray.setFromCamera(ndc, st.camera);
    const hits = ray.intersectObjects(engine.children, true).filter((h) => h.object.userData.part && h.object.visible);
    if (!hits.length) return;
    const hit = covered ? hits[0] : (hits.find((h) => !/^(bloc|culasses)$/.test(h.object.userData.part) || h.object.material === M.vin || h.object.material === M.vex) || hits[0]);
    const k = hit.object.userData.part; if (k !== sel) choose(k); const nm = hit.object.userData.name || NAMES.get(hit.object.material); if (nm) desc.innerHTML = `<strong>${nm}.</strong> ${PARTS[k][1]}`;
  });
  q('[data-t="skin"]').addEventListener('change', (e) => { covered = e.target.checked; skin.visible = banks[true].skin.visible = banks[false].skin.visible = covered; st.refresh(); });
  q('[data-t="boom"]').addEventListener('change', (e) => { boomT = e.target.checked ? 1 : 0; st.orbit.tzoom = boomT ? 1.5 : 1; if (reduced()) boom = boomT; st.refresh(); });
  el.querySelectorAll('[data-view]').forEach((b) => b.addEventListener('click', () => { const [a, e] = b.dataset.view.split(',').map(Number); st.view(a, e); }));
  const sp = q('[data-speed]'), spv = q('[data-speedv]');
  const setSpeed = () => { rpm = +sp.value; spv.textContent = rpm + ' tr/min'; }; sp.addEventListener('input', setSpeed); setSpeed();
  q('[data-rpm]').textContent = '· une combustion tous les 120°';
  const pb = q('[data-k="play"]');
  if (pb) { const sync = () => { pb.textContent = st.on ? 'Pause' : 'Lecture'; }; pb.addEventListener('click', () => { st.on ? st.pause() : st.play(); sync(); }); sync(); }
  q('[data-step]').addEventListener('click', () => { if (st.on) { st.pause(); if (pb) pb.textContent = 'Lecture'; } theta = (theta + 30 * D) % (2 * TAU); pose(0.016); st.refresh(); });
  theta = 40 * D; pose(0); st.refresh();
  return st;
}
