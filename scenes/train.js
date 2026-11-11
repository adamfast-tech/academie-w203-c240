/* Train avant W203 (roue avant gauche) : trois bras et jambe McPherson, débattement, braquage, usures.
   Maquette pédagogique procédurale, code original ; rendu par three.js (MIT). Cotes en centimètres, approximatives :
   les positions exactes diffèrent sur la voiture. Avant vers +x, haut vers +y, extérieur vers +z. */
import { THREE, createStage, cssVar, reduced, merge, at, seg, tube, nameAt } from './kit.js';

const V3 = (x, y, z) => new THREE.Vector3(x, y, z);
/* Points d'articulation à hauteur de caisse normale. */
const TOP = V3(-1.5, 58, -14), A_IN = V3(0, -5.5, -42), L0 = V3(0, -12, -6), W0 = V3(0, 0, 4), E_IN = V3(38, -8, -30), B0 = V3(3, -11, -7), S0 = V3(-13, -4, -8), R0 = V3(-13, -3, -40), N_PIV = V3(22, -5, -20), N0 = V3(8, -3, -20);
const ARM = L0.distanceTo(A_IN), TIE = S0.distanceTo(R0), TIR = B0.distanceTo(E_IN), RW = 31.6;

function texts(nm, s) {
  return {
    bras: ['Bras transversal inférieur', 'Guide la roue latéralement. Usure typique : rotule et silentbloc. Écrou du bras sur le porte-moyeu : ' + nm('80 N·m') + ' ' + s('wis') + '.'],
    tirant: ['Tirant', 'Guide la roue longitudinalement et encaisse le freinage. Usure typique : silentbloc côté berceau, rotule côté moyeu. Écrou sur berceau : ' + nm('150 N·m') + ' ' + s('chk') + ', serrage à hauteur de caisse.'],
    jambe: ['Jambe McPherson', 'Ressort et amortisseur réunis. Elle guide le haut du porte-moyeu et tourne avec la roue au braquage. Usure typique : amortisseur, coupelle et roulement de coupelle.'],
    stab: ['Barre stabilisatrice et biellette', 'La biellette relie la barre à la jambe. Usure typique : rotules qui claquent. Écrous M10 de biellette : ' + nm('60 N·m') + ' ; palier de barre sur berceau : ' + nm('40 N·m') + ' ' + s('wis') + '.'],
    direction: ['Biellette de direction', 'Relie la crémaillère au porte-moyeu : c’est elle qui fait pivoter la roue. Usure typique : rotule axiale et rotule extérieure.'],
    portemoyeu: ['Porte-moyeu', 'Il porte le roulement, le disque et l’étrier. Les trois bras et la jambe s’y rejoignent.'],
    berceau: ['Berceau', 'Châssis auxiliaire fixé à la caisse. Les bras, la barre stabilisatrice et la crémaillère s’y articulent.']
  };
}
const WEAR = {
  rotule: ['Rotule de bras', 'Du jeu à la rotule du bras transversal : la roue n’est plus tenue latéralement avec précision. Regarde-la se déplacer à chaque inversion du débattement.'],
  tirant: ['Silentbloc de tirant', 'Silentbloc du tirant fatigué côté berceau : au freinage, la roue recule au lieu de rester en place.'],
  biellette: ['Biellette de stabilisateur', 'Rotules de biellette usées : la biellette flotte et claque sur les bosses.']
};

function ui(el, P) {
  el.querySelector('[data-ui]').innerHTML = `
    <div class="viz-read"><div><small class="viz-note">Débattement</small><br><b class="mono tnum" data-h></b></div><div><small class="viz-note">Carrossage</small><br><b class="mono tnum" data-c></b></div><div><small class="viz-note">Ressort</small><br><b class="mono tnum" data-s></b></div><div><small class="viz-note">Crémaillère</small><br><b class="mono tnum" data-r></b></div></div>
    <label class="vrange r3"><span style="text-align:left">Roue</span><input type="range" min="-80" max="80" step="1" value="0" data-travel aria-label="Débattement de la roue"><span class="mono tnum" data-travelv></span></label>
    <label class="vrange r3"><span style="text-align:left">Volant</span><input type="range" min="-35" max="35" step="1" value="0" data-steer aria-label="Braquage"><span class="mono tnum" data-steerv></span></label>
    <div class="vchips"><label class="vtoggle"><input type="checkbox" data-road><span class="vtrack" aria-hidden="true"></span>Route bosselée</label><label class="vtoggle"><input type="checkbox" data-wheel checked><span class="vtrack" aria-hidden="true"></span>Afficher la roue</label></div>
    <div class="vchips" role="group" aria-label="Pièces du train avant">${Object.keys(P).map((k) => `<button class="vbtn sm" type="button" data-part="${k}" aria-pressed="false">${P[k][0]}</button>`).join('')}</div>
    <p class="viz-desc" data-desc aria-live="polite"></p>
    <div class="vchips" role="group" aria-label="Simuler une usure"><span class="viz-note">Simuler une usure</span>${Object.keys(WEAR).map((k) => `<button class="vbtn sm" type="button" data-wear="${k}" aria-pressed="false">${WEAR[k][0]}</button>`).join('')}</div>
    <p class="viz-note">Maquette de principe : les positions et les jeux sont exagérés pour être lisibles. Vérifie les couples dans WIS avant serrage.</p>`;
}

export function mount(el) {
  const host = el.querySelector('[data-stage]'); host.innerHTML = '';
  const st = createStage(host, { target: [6, 17, -18], radius: 238, fov: 28, az: 0.75, el: 0.2, minEl: -0.4, maxEl: 1.3, fit: 1.1, label: 'Maquette 3D du train avant gauche de la W203' });
  const H = (window.W203 && window.W203.h) || {}, nm = H.nm || ((t) => `<strong>${t}</strong>`), src = H.s || (() => '');
  const P = texts(nm, src); ui(el, P);
  const { scene } = st, q = (s) => el.querySelector(s);
  const vc = (o) => new THREE.MeshStandardMaterial(Object.assign({ color: 0xffffff, vertexColors: true, metalness: 0.6, roughness: 0.45 }, o || {}));
  const M = { bras: vc(), tirant: vc(), jambe: vc(), stab: vc(), direction: vc(), portemoyeu: vc({ roughness: 0.55 }), berceau: vc({ roughness: 0.6 }),
    tire: new THREE.MeshStandardMaterial({ color: 0x111315, roughness: 0.9, metalness: 0, transparent: true, opacity: 0.3, depthWrite: false }), rim: new THREE.MeshStandardMaterial({ color: 0xcfd5db, roughness: 0.25, metalness: 0.9, transparent: true, opacity: 0.3, depthWrite: false }),
    body: new THREE.MeshStandardMaterial({ color: 0x9aa4ae, roughness: 0.5, metalness: 0.4, transparent: true, opacity: 0.22, depthWrite: false, side: THREE.DoubleSide }), road: new THREE.MeshStandardMaterial({ color: 0x4a5058, roughness: 0.95, metalness: 0 }) };
  const C = { steel: 0x8a929b, cast: 0x6f7780, dark: 0x4b525b, rubber: 0x15171a, blue: 0x5f86a6, white: 0xdfe3e6, alu: 0xc4cbd2, zinc: 0xc9c2a4, gold: 0xb6903c };
  const root = new THREE.Group(); scene.add(root);
  const put = (list, mat, part, parent) => { const m = new THREE.Mesh(merge(list), mat); m.userData.part = part; (parent || root).add(m); return m; };
  const cyl = (r, h, n) => new THREE.CylinderGeometry(r, r, h, n || 14), cz = (r, len, n) => new THREE.CylinderGeometry(r, r, len, n || 16).rotateX(Math.PI / 2), cx = (r, len, n) => new THREE.CylinderGeometry(r, r, len, n || 16).rotateZ(Math.PI / 2), box = (w, h, d) => new THREE.BoxGeometry(w, h, d), ball = (r) => new THREE.SphereGeometry(r, 14, 10);
  const A = (v) => [v.x, v.y, v.z];
  /* Barre articulée : géométrie de longueur 1 le long de y, étirée entre deux points à chaque image. */
  const UP = V3(0, 1, 0), dv = V3();
  const link = (list, mat, part) => { const m = put(list, mat, part); m.userData.link = true; return m; };
  const setLink = (m, a, b) => { dv.subVectors(b, a); const len = dv.length(); m.position.copy(a); m.quaternion.setFromUnitVectors(UP, dv.normalize()); m.scale.set(1, len, 1); };
  const rod = (r, name, col, extra) => [[cyl(r, 1, 12).translate(0, 0.5, 0), null, name, col]].concat(extra || []);

  /* ---- Fixe : berceau, caisse, crémaillère, paliers ---- */
  put([[box(66, 5, 7), at(14, -12.5, -45), 'Longeron du berceau', C.dark], [box(7, 5, 30), at(-2, -12.5, -58), 'Traverse du berceau', C.dark], [box(7, 5, 30), at(40, -12.5, -58), 'Traverse du berceau', C.dark],
    [cx(3.6, 6, 18), at(0, -5.5, -42), 'Silentbloc du bras transversal', C.rubber], [box(6, 7, 5), at(0, -8.5, -45), 'Chape du bras transversal', C.dark], [cz(3.8, 7, 18), at(38, -8, -30), 'Silentbloc du tirant', C.rubber], [box(8, 6, 10), at(38, -10, -38), 'Support du tirant', C.dark],
    [cz(2.6, 5, 14), at(22, -5, -34), 'Palier de barre stabilisatrice', C.rubber], [box(5, 4, 6), at(22, -8.5, -38), 'Palier de barre stabilisatrice', C.dark]], M.berceau, 'berceau');
  put([[cz(3.4, 34, 18), at(-13, -3, -62), 'Crémaillère de direction', C.alu], [box(6, 5, 8), at(-13, -8, -52), 'Fixation de crémaillère', C.dark]], M.direction, 'direction');
  put([[new THREE.CylinderGeometry(11, 13, 4, 28, 1, true), at(TOP.x, TOP.y + 1, TOP.z)], [new THREE.CylinderGeometry(13, 26, 30, 28, 1, true, 0.6, 4.2), at(TOP.x, TOP.y - 16, TOP.z + 4)]], M.body, null).userData.name = 'Passage de roue (caisse)';
  put([[cyl(7.2, 2.4, 24), at(TOP.x, TOP.y, TOP.z), 'Coupelle et roulement de jambe', C.rubber], [cyl(1.2, 3, 8), at(TOP.x, TOP.y + 2.4, TOP.z), 'Écrou de tige d’amortisseur', C.zinc]], M.jambe, 'jambe');
  const bar = put([[tube([[22, -5, -70], [22, -5, -26], [21, -5, -21.5]], 1.25), null, 'Barre stabilisatrice', C.steel]], M.stab, 'stab');

  /* ---- Porte-moyeu : suit le bas (rotule du bras), s'aligne sur la jambe, pivote au braquage ---- */
  const outer = new THREE.Group(), steerG = new THREE.Group(), inner = new THREE.Group(); root.add(outer); outer.add(steerG); steerG.add(inner);
  const K0 = TOP.clone().sub(L0).normalize(), Q0 = new THREE.Quaternion().setFromUnitVectors(UP, K0), Q0i = Q0.clone().invert();
  inner.quaternion.copy(Q0i); inner.position.copy(L0.clone().negate().applyQuaternion(Q0i));
  put([[...seg(A(L0), A(L0.clone().addScaledVector(K0, 17)), 3, 12), 'Porte-moyeu', C.cast], [cz(6.4, 7, 24), at(W0.x, W0.y, W0.z - 7.5), 'Logement du roulement', C.cast], [...seg([0, -2, -4], A(S0), 1.7, 10), 'Levier de direction', C.cast], [...seg([0, -8, -5], A(B0), 2, 10), 'Porte-moyeu', C.cast],
    [ball(2.4), at(L0.x, L0.y, L0.z), 'Rotule du bras transversal', C.dark], [ball(2), at(B0.x, B0.y, B0.z), 'Rotule du tirant', C.dark], [ball(1.7), at(S0.x, S0.y, S0.z), 'Rotule de direction extérieure', C.dark]], M.portemoyeu, 'portemoyeu', inner);
  const spin = new THREE.Group(); spin.position.copy(W0); inner.add(spin);
  const lathe = (pts, n) => new THREE.LatheGeometry(pts.map((p) => new THREE.Vector2(p[0], p[1])), n || 48).rotateX(Math.PI / 2);
  const hubL = [[lathe([[8.6, -4.6], [15, -4.6], [15, -2.1], [8.6, -2.1], [8.6, -4.6]]), null, 'Disque de frein', C.steel], [lathe([[7.8, -2.1], [7.6, 1.2], [3.4, 1.2], [3.4, 0.6], [7, 0.6], [7.2, -2.1]]), null, 'Disque de frein', C.cast], [cz(3.3, 6, 20), at(0, 0, -1), 'Moyeu', C.cast]];
  put(hubL, M.portemoyeu, 'portemoyeu', spin);
  put([[box(7, 13, 8), at(-13.5, 0, -3.4), 'Étrier de frein', C.cast]], M.portemoyeu, 'portemoyeu', inner).position.copy(W0);
  const wheel = new THREE.Group(); spin.add(wheel);
  wheel.add(new THREE.Mesh(lathe([[20.2, -9.8], [22, -10.7], [27.2, -11], [30, -10], [31.3, -8.2], [RW, -6], [RW, 6], [31.3, 8.2], [30, 10], [27.2, 11], [22, 10.7], [20.2, 9.8]], 56), M.tire));
  const rimL = [[lathe([[20.6, -10], [19, -8], [18.6, 2], [19, 8.6], [20.8, 10.2]], 56), null], [lathe([[0, 6], [5.5, 5.8], [7.6, 4.6]], 24), null]]; for (let i = 0; i < 7; i++) rimL.push([box(3.6, 13.5, 1.8), at(0, 0, 5, 0, 0, i * 2 * Math.PI / 7).multiply(at(0, 12.4, 0))]);
  wheel.add(new THREE.Mesh(merge(rimL), M.rim)); wheel.children.forEach((m) => { m.userData.name = 'Roue'; m.renderOrder = 3; });
  /* Jambe : corps solidaire du porte-moyeu (dans le repère de la jambe), tige et ressort jusqu'à la coupelle */
  put([[cyl(2.7, 30, 18), at(0, 31, 0), 'Corps d’amortisseur', C.dark], [cyl(7, 1.2, 24), at(0, 33, 0), 'Coupelle inférieure de ressort', C.dark], [box(5, 6, 3), at(3.2, 26, 0), 'Patte de biellette sur la jambe', C.dark], [box(7, 9, 7), at(0, 17, 0), 'Bride de jambe sur porte-moyeu', C.cast]], M.jambe, 'jambe', steerG);
  const rodM = new THREE.Mesh(cyl(1.1, 1, 12).translate(0, 0.5, 0), M.jambe); rodM.geometry = merge([[rodM.geometry, null, 'Tige d’amortisseur', C.white]]); rodM.userData.part = 'jambe'; rodM.position.y = 44; outer.add(rodM);
  const helix = (() => { const pts = []; for (let i = 0; i <= 72; i++) { const a = i / 12 * 2 * Math.PI; pts.push(V3(6.4 * Math.cos(a), 35 * i / 72, 6.4 * Math.sin(a))); } return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 110, 0.75, 7); })();
  const spring = new THREE.Mesh(merge([[helix, null, 'Ressort hélicoïdal', C.blue]]), M.jambe); spring.userData.part = 'jambe'; spring.position.y = 33.6; outer.add(spring);
  const boot = new THREE.Mesh(merge([[new THREE.CylinderGeometry(3.4, 2.9, 1, 16, 1, true).translate(0, 0.5, 0), null, 'Soufflet et butée', C.rubber]]), M.jambe); boot.userData.part = 'jambe'; boot.position.y = 46; outer.add(boot);

  /* ---- Bras articulés ---- */
  const armM = link(rod(2.1, 'Bras transversal inférieur', C.cast, [[box(6, 0.36, 3), at(0, 0.5, 0), 'Bras transversal inférieur', C.cast]]), M.bras, 'bras');
  const tirM = link(rod(1.9, 'Tirant', C.cast), M.tirant, 'tirant');
  const tieM = link(rod(1.05, 'Biellette de direction', C.steel, [[cyl(1.5, 0.12, 6).translate(0, 0.82, 0), null, 'Contre-écrou de réglage du parallélisme', C.zinc]]), M.direction, 'direction');
  const rackEnd = put([[cz(1.5, 26, 14), at(0, 0, -13), 'Tige de crémaillère', C.steel], [new THREE.CylinderGeometry(1.3, 3.3, 12, 16, 6).rotateX(-Math.PI / 2), at(0, 0, -7), 'Soufflet de crémaillère', C.rubber], [ball(1.8), null, 'Rotule axiale', C.dark]], M.direction, 'direction');
  const stabArm = link(rod(1.25, 'Barre stabilisatrice', C.steel), M.stab, 'stab'), stabLink = link(rod(0.7, 'Biellette de barre stabilisatrice', C.zinc), M.stab, 'stab');
  const jA = put([[ball(1.5), null, 'Rotule de biellette', C.dark]], M.stab, 'stab'), jB = put([[ball(1.5), null, 'Rotule de biellette', C.dark]], M.stab, 'stab');
  const flag = new THREE.Mesh(ball(3.4), new THREE.MeshBasicMaterial({ color: 0xff3b2f, transparent: true, opacity: 0.55, depthTest: false })); flag.renderOrder = 9; flag.visible = false; root.add(flag);
  const road = new THREE.Mesh(box(120, 3, 44), M.road); road.userData.name = 'Chaussée'; root.add(road);

  /* ---- État et cinématique ---- */
  const accent = new THREE.Color(cssVar('--accent', '#1C5797')).lerp(new THREE.Color(0x4da3ff), 0.4);
  let h = 0, hT = 0, steer = 0, steerT = 0, roadOn = false, sel = null, wear = null, pulse = 0, prevH = 0, playZ = 0, roll = 0;
  const Lp = V3(), K = V3(), Qk = new THREE.Quaternion(), Sw = V3(), Bw = V3(), Ew = V3(), Nw = V3(), Kw = V3(), Rw = V3(), ax = V3(), tmp = V3();
  const fr = (v, d) => v.toFixed(d == null ? 1 : d).replace('.', ',').replace('-', '−');
  function frame(dt, real) {
    const d = real || 0.016, k = 1 - Math.pow(0.002, d); pulse += d;
    if (roadOn && dt) { hT = 5.5 * Math.sin(pulse * 3.1) + 2.2 * Math.sin(pulse * 7.3); roll += dt * 5; }
    h += (hT - h) * k; steer += (steerT - steer) * k;
    const dh = h - prevH; prevH = h;
    /* Jeux simulés */
    if (wear === 'rotule') { if (Math.abs(dh) > 0.002) playZ += ((dh > 0 ? 1.3 : -1.3) - playZ) * 0.35; } else playZ *= 0.8;
    const brake = wear === 'tirant' ? Math.pow(Math.max(0, Math.sin(pulse * 1.6)), 3) : 0;
    /* Bas du porte-moyeu : au bout du bras transversal, qui pivote sur le berceau */
    Lp.set(-2.2 * brake, L0.y + h, 0); Lp.z = A_IN.z + Math.sqrt(Math.max(1, ARM * ARM - (Lp.y - A_IN.y) * (Lp.y - A_IN.y))) + playZ;
    K.subVectors(TOP, Lp); const D = K.length(); K.normalize(); Qk.setFromUnitVectors(UP, K);
    outer.position.copy(Lp); outer.quaternion.copy(Qk); steerG.rotation.y = steer; outer.updateMatrixWorld(true);
    rodM.scale.y = Math.max(1, D - 44); boot.scale.y = Math.max(1, D - 47.5); spring.scale.y = Math.max(4, D - 2 - 33.6) / 35;
    spin.rotation.z = -roll;
    /* Bras, tirant, direction, stabilisatrice */
    tmp.copy(Lp); tmp.z -= playZ; setLink(armM, A_IN, tmp);
    inner.localToWorld(Bw.copy(B0)); dv.subVectors(E_IN, Bw).normalize(); Ew.copy(Bw).addScaledVector(dv, TIR); setLink(tirM, Bw, Ew);
    inner.localToWorld(Sw.copy(S0)); const dx = Sw.x - R0.x, dy = Sw.y - R0.y; Rw.set(R0.x, R0.y, Sw.z - Math.sqrt(Math.max(1, TIE * TIE - dx * dx - dy * dy))); setLink(tieM, Rw, Sw); rackEnd.position.copy(Rw);
    const loose = wear === 'biellette' ? 1.6 * Math.sin(pulse * 23) * Math.min(1, Math.abs(dh) * 40 + (roadOn ? 0.5 : 0)) : 0;
    Nw.set(N0.x, N0.y + h * 0.9, N0.z); setLink(stabArm, N_PIV, Nw); steerG.localToWorld(Kw.set(3.2, 26, 0)); tmp.copy(Nw); tmp.y += loose; setLink(stabLink, tmp, Kw); jA.position.copy(tmp); jB.position.copy(Kw);
    bar.rotation.z = 0;
    inner.localToWorld(tmp.copy(W0)); road.position.set(tmp.x * 0.2 + 6, tmp.y - RW - 1.5, 4);
    /* Mesures */
    ax.set(0, 0, 1).applyQuaternion(Q0i).applyAxisAngle(UP, steer).applyQuaternion(Qk);
    q('[data-h]').textContent = fr(h * 10, 0) + ' mm'; q('[data-c]').textContent = fr(-Math.asin(Math.max(-1, Math.min(1, ax.y / Math.hypot(ax.y, ax.z)))) * 180 / Math.PI) + ' °';
    q('[data-s]').textContent = fr((D - 2 - 33.6) * 10, 0) + ' mm'; q('[data-r]').textContent = fr((Rw.z - R0.z) * 10, 0) + ' mm';
    /* Mise en évidence */
    Object.keys(P).forEach((n) => { if (n === sel) M[n].emissive.copy(accent).multiplyScalar(0.3 + 0.15 * Math.sin(pulse * 4)); else M[n].emissive.setHex(0); });
    flag.visible = !!wear; if (wear) { flag.position.copy(wear === 'rotule' ? Lp : wear === 'tirant' ? E_IN : tmp.copy(Nw)); flag.material.opacity = 0.35 + 0.25 * Math.sin(pulse * 6); }
    return roadOn || !!sel || !!wear || Math.abs(hT - h) > 0.01 || Math.abs(steerT - steer) > 0.001;
  }
  st.onFrame(frame);

  /* ---- Commandes ---- */
  const descEl = q('[data-desc]'), base = 'Bouge la roue et le volant : le bras transversal décrit un arc, la jambe se comprime, et la biellette de direction, de longueur fixe, fait pivoter le porte-moyeu.';
  const descSync = (piece) => { descEl.innerHTML = wear && !sel ? `<strong>${WEAR[wear][0]}.</strong> ${WEAR[wear][1]}` : sel ? `<strong>${piece || P[sel][0]}.</strong> ${P[sel][1]}` : base; };
  function choose(kk, piece) { sel = sel === kk && !piece ? null : kk; el.querySelectorAll('[data-part]').forEach((b) => { const on = b.dataset.part === sel; b.classList.toggle('sel', on); b.setAttribute('aria-pressed', on ? 'true' : 'false'); }); descSync(piece); st.refresh(); }
  el.querySelectorAll('[data-part]').forEach((b) => b.addEventListener('click', () => choose(b.dataset.part)));
  el.querySelectorAll('[data-wear]').forEach((b) => b.addEventListener('click', () => { wear = wear === b.dataset.wear ? null : b.dataset.wear; sel = null; el.querySelectorAll('[data-part]').forEach((x) => { x.classList.remove('sel'); x.setAttribute('aria-pressed', 'false'); });
    el.querySelectorAll('[data-wear]').forEach((x) => { const on = x.dataset.wear === wear; x.classList.toggle('sel', on); x.setAttribute('aria-pressed', on ? 'true' : 'false'); }); descSync(); st.play(); st.refresh(); }));
  const ray = new THREE.Raycaster();
  st.onTap((ndc) => { ray.setFromCamera(ndc, st.camera); const hit = ray.intersectObjects(root.children, true).find((x) => x.object.userData.part && x.object.visible); if (!hit) return; choose(hit.object.userData.part, hit.object.userData.name || nameAt(hit.object.geometry, hit.faceIndex)); });
  const tv = q('[data-travel]'), sv = q('[data-steer]');
  const showT = () => { q('[data-travelv]').textContent = fr(+tv.value, 0) + ' mm'; }, showS = () => { q('[data-steerv]').textContent = fr(+sv.value, 0) + ' °'; };
  tv.addEventListener('input', () => { hT = tv.value / 10; showT(); st.refresh(); }); sv.addEventListener('input', () => { steerT = -sv.value * Math.PI / 180; showS(); st.refresh(); }); showT(); showS();
  q('[data-road]').addEventListener('change', (e) => { roadOn = e.target.checked; tv.disabled = roadOn; if (!roadOn) { hT = tv.value / 10; } else st.play(); st.refresh(); });
  q('[data-wheel]').addEventListener('change', (e) => { wheel.visible = e.target.checked; st.refresh(); });
  const pb = q('[data-k="play"]'); if (pb) { const sync = () => { pb.textContent = st.on ? 'Pause' : 'Lecture'; }; pb.addEventListener('click', () => { st.on ? st.pause() : st.play(); sync(); }); sync(); }
  if (!reduced()) { roadOn = true; q('[data-road]').checked = true; tv.disabled = true; }
  descSync(); frame(0, 0.016); st.refresh();
  return st;
}
