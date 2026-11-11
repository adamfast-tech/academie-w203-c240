/* Circuit de refroidissement du M112 : circulation, thermostat, ventilateur, pannes typiques.
   Maquette pédagogique procédurale, code original ; rendu par three.js (MIT).
   Modèle thermique simplifié et accéléré : il montre les tendances, pas des valeurs de réglage. */
import { THREE, createStage, cssVar, reduced, merge, at, tube, nameAt } from './kit.js';

const PARTS = {
  pompe: ['Pompe à eau', 'Entraînée par la courroie, elle fait circuler le liquide. Traces de liquide séché sous la pompe ou goutte au trou témoin : le joint interne fuit, elle se remplace.'],
  thermostat: ['Thermostat', 'Une vanne fermée à froid, pour que le moteur chauffe vite, puis qui s’ouvre et envoie le liquide au radiateur. Sur la W203, il reste souvent ouvert : il se remplace avec son boîtier.'],
  radiateur: ['Radiateur', 'Le liquide chaud le traverse et cède sa chaleur à l’air. À l’arrêt, il n’y a pas de vent de marche : c’est le ventilateur qui prend le relais.'],
  ventilateur: ['Ventilateur électrique', 'Aspirant, derrière le radiateur, avec son électronique de commande intégrée. Clim en marche, il doit tourner. S’il ne tourne jamais : fusible, connecteur, module.'],
  vase: ['Vase d’expansion et bouchon', 'Le circuit est pressurisé, ce qui repousse l’ébullition au-dessus de 100 °C. Le bouchon porte la pression d’ouverture : fatigué, il fait bouillir le circuit.'],
  durites: ['Durites', 'Elles relient le moteur au radiateur et au chauffage. Gonflées, molles ou craquelées : à remplacer.'],
  chauffage: ['Radiateur de chauffage', 'Le chauffage de l’habitacle récupère la chaleur du moteur. En cas de surchauffe, le mettre à fond évacue un peu de chaleur.'],
  moteur: ['Moteur', 'Les chambres d’eau entourent les cylindres et les culasses. Une culasse en aluminium se déforme vite en cas de surchauffe.']
};
const FAULTS = {
  thermo: ['Thermostat bloqué ouvert', 'Le liquide passe en permanence par le radiateur : le moteur peine à dépasser 80 °C, surtout sur route par temps froid. Chauffage tiède, consommation en hausse, code P0128.'],
  fan: ['Ventilateur en panne', 'Sur route, le vent de marche suffit. Au ralenti ou dans les bouchons, plus rien ne refroidit le radiateur : la température monte.'],
  pump: ['Fuite de pompe à eau', 'Le joint interne fuit par le trou témoin. Le niveau baisse dans le vase ; quand il n’y a plus assez de liquide, le moteur surchauffe.'],
  cap: ['Bouchon fatigué', 'Le circuit ne tient plus sa pression : le liquide bout plus tôt et le vase déborde.']
};
const MODES = [['Ralenti', 0.2, 0, 750], ['Route', 0.3, 1, 2500], ['Montée chargée', 0.85, 0.55, 3800]];

function ui(el) {
  el.querySelector('[data-ui]').innerHTML = `
    <div class="viz-read"><div><small class="viz-note">Moteur</small><br><b class="mono tnum" data-te></b></div><div><small class="viz-note">Thermostat</small><br><b class="mono tnum" data-th></b></div><div><small class="viz-note">Sortie radiateur</small><br><b class="mono tnum" data-tr></b></div><div><small class="viz-note">Ventilateur</small><br><b class="mono tnum" data-fan></b></div><div><small class="viz-note">Niveau du vase</small><br><b class="mono tnum" data-lv></b></div></div>
    <div class="vchips" role="group" aria-label="Conduite"><span class="viz-note">Conduite</span>${MODES.map((m, i) => `<button class="vbtn sm${i ? '' : ' sel'}" type="button" data-mode="${i}">${m[0]}</button>`).join('')}<label class="vtoggle"><input type="checkbox" data-ac><span class="vtrack" aria-hidden="true"></span>Clim</label><button class="vbtn sm" type="button" data-cold>Démarrage à froid</button></div>
    <label class="vrange r3"><span style="text-align:left">Dehors</span><input type="range" min="-10" max="38" step="1" value="12" data-ta aria-label="Température extérieure"><span class="mono tnum" data-tav></span></label>
    <label class="vrange r3"><span style="text-align:left">Chauffage</span><input type="range" min="0" max="100" step="5" value="30" data-heat aria-label="Chauffage de l’habitacle"><span class="mono tnum" data-heatv></span></label>
    <div class="vchips" role="group" aria-label="Organes du circuit">${Object.keys(PARTS).map((k) => `<button class="vbtn sm" type="button" data-part="${k}" aria-pressed="false">${PARTS[k][0]}</button>`).join('')}</div>
    <p class="viz-desc" data-desc aria-live="polite"></p>
    <div class="vchips" role="group" aria-label="Simuler une panne"><span class="viz-note">Simuler une panne</span>${Object.keys(FAULTS).map((k) => `<button class="vbtn sm" type="button" data-fault="${k}" aria-pressed="false">${FAULTS[k][0]}</button>`).join('')}</div>
    <div class="callout danger" data-alert hidden><p></p></div>
    <p class="viz-note">Le temps est accéléré et le modèle simplifié : il montre comment le circuit réagit, pas des valeurs à contrôler. La couleur du liquide indique sa température, du bleu (froid) au rouge (très chaud).</p>`;
}

export function mount(el) {
  const host = el.querySelector('[data-stage]'); host.innerHTML = '';
  const st = createStage(host, { target: [4, 3, 0], radius: 168, fov: 28, az: -0.55, el: 0.36, minEl: -0.3, maxEl: 1.35, fit: 1.35, label: 'Maquette 3D du circuit de refroidissement' });
  ui(el);
  const { scene } = st, q = (s) => el.querySelector(s);
  const vc = (o) => new THREE.MeshStandardMaterial(Object.assign({ color: 0xffffff, vertexColors: true, metalness: 0.5, roughness: 0.5 }, o || {}));
  const glass = (c, op) => new THREE.MeshStandardMaterial({ color: c, metalness: 0.1, roughness: 0.35, transparent: true, opacity: op, depthWrite: false, side: THREE.DoubleSide });
  const M = { pompe: vc(), thermostat: glass(0xc9d0d8, 0.35), valve: vc({ metalness: 0.8 }), radiateur: vc({ metalness: 0.7, roughness: 0.4 }), ventilateur: vc({ metalness: 0.2, roughness: 0.6 }), vase: glass(0xf2f1ea, 0.4), cap: vc(),
    durites: glass(0x24282d, 0.42), chauffage: vc({ metalness: 0.7 }), moteur: glass(0xaab4c0, 0.26), liquid: new THREE.MeshStandardMaterial({ color: 0x2f9ed6, transparent: true, opacity: 0.7, roughness: 0.2, metalness: 0, depthWrite: false }) };
  const HI = { pompe: [M.pompe], thermostat: [M.thermostat, M.valve], radiateur: [M.radiateur], ventilateur: [M.ventilateur], vase: [M.vase, M.cap], durites: [M.durites], chauffage: [M.chauffage], moteur: [M.moteur] };
  const C = { alu: 0xc4cbd2, dark: 0x2a2e34, steel: 0x8a929b, black: 0x15171a, blue: 0x1d6fb5, brass: 0xb6903c, plastic: 0x3a4048, white: 0xe6e8ea };
  const root = new THREE.Group(); scene.add(root);
  const put = (list, mat, part, order) => { const m = new THREE.Mesh(merge(list), mat); m.userData.part = part; if (order) m.renderOrder = order; root.add(m); return m; };
  const box = (w, h, d) => new THREE.BoxGeometry(w, h, d), cx = (r, len, n) => new THREE.CylinderGeometry(r, r, len, n || 20).rotateZ(Math.PI / 2), cy = (r, len, n) => new THREE.CylinderGeometry(r, r, len, n || 16);

  /* ---- Trajets du liquide ---- */
  const path = (pts, closed) => new THREE.CatmullRomCurve3(pts.map((p) => new THREE.Vector3(...p)), !!closed, 'centripetal');
  const P_BY = path([[17, -1, 0], [10, -2, 6], [-8, 0, 7], [-11, 6, 0], [-4, 9, -6], [10, 10, -6], [17, 9, -5], [19, 4, -3]], true);
  const P_UP = [[17, 9, -5], [22, 13, -8], [29, 15, -20], [34, 13, -29]], P_CORE = [[34, 13, -29], [34, 9, -20], [34, 0, 0], [34, -9, 20], [34, -13, 29]], P_LOW = [[34, -13, 29], [28, -13, 22], [22, -8, 10], [17, -1, 0]];
  const P_RAD = path(P_UP.concat(P_CORE.slice(1), P_LOW.slice(1)));
  const P_H1 = [[-12, 6, 4], [-22, 8, 7], [-32, 8, 9]], P_H2 = [[-32, 8, -9], [-22, 4, -7], [-6, -4, -10], [12, -3, -5], [17, -1, 0]];
  const P_HT = path(P_H1.concat([[-32, 8, 0]], P_H2));
  /* Repères le long du trajet du radiateur (fraction de longueur) : entrée et sortie du faisceau. */
  const lenOf = (pts) => path(pts).getLength(), lu = lenOf(P_UP), lc = lenOf(P_CORE), ll = lenOf(P_LOW), U1 = lu / (lu + lc + ll), U2 = (lu + lc) / (lu + lc + ll);

  /* ---- Moteur, pompe, thermostat ---- */
  put([[box(28, 9, 13), at(0, -3, 0)], [box(27, 12, 9), at(0, 5, 7.5, Math.PI / 4)], [box(27, 12, 9), at(0, 5, -7.5, -Math.PI / 4)], [box(26, 3, 11), at(0, -9.5, 0)]], M.moteur, 'moteur', 2).userData.name = 'Bloc et culasses (chambres d’eau)';
  const pulley = new THREE.Group(); pulley.position.set(19.6, -1, 0); root.add(pulley);
  const pl = new THREE.Mesh(merge([[cx(4.2, 1.2, 28), null, 'Poulie de pompe à eau', C.steel]].concat([0, 1, 2, 3].map((i) => [cx(0.9, 1.3, 10), at(0, 2.4 * Math.cos(i * 1.5708), 2.4 * Math.sin(i * 1.5708)), 'Poulie de pompe à eau', C.dark]))), M.pompe); pl.userData.part = 'pompe'; pulley.add(pl);
  put([[cx(5, 3.4, 28), at(17.2, -1, 0), 'Corps de pompe à eau', C.alu], [cx(1.1, 3, 10), at(17, -6.6, 0, 0, 0, Math.PI / 2), 'Trou témoin de la pompe', C.dark], [tube([[20.2, 3.2, 0], [20.2, 8, 9], [20.2, -2, 15], [20.2, -5.2, 0], [20.2, -1, -9]], 0.3, true), null, 'Courroie d’accessoires', C.black]], M.pompe, 'pompe');
  put([[cy(3.4, 6, 24), at(17, 9.5, -5, 0, 0, 0.5)]], M.thermostat, 'thermostat', 3).userData.name = 'Boîtier de thermostat';
  const valve = put([[cy(2.5, 0.5, 20), null, 'Clapet du thermostat', C.brass], [cy(0.5, 3.4, 8), at(0, -1.6, 0), 'Capsule de cire du thermostat', C.brass]], M.valve, 'thermostat'); valve.position.set(17, 9.5, -5); valve.rotation.z = 0.5;
  put([[cy(0.7, 2.6, 10), at(9, 12.6, -7), 'Sonde de température de liquide', C.brass]], M.valve, 'moteur');

  /* ---- Radiateur, ventilateur, condenseur ---- */
  const rl = [[box(2.6, 30, 5), at(34, 0, -31), 'Boîte à eau du radiateur', C.black], [box(2.6, 30, 5), at(34, 0, 31), 'Boîte à eau du radiateur', C.black]];
  for (let i = 0; i < 15; i++) rl.push([box(2.2, 0.55, 57), at(34, -13.3 + i * 1.9, 0), 'Faisceau du radiateur', C.alu]); for (let i = 0; i < 28; i++) rl.push([box(2, 28, 0.16), at(34, 0, -27 + i * 2), 'Ailettes du radiateur', C.steel]);
  put(rl, M.radiateur, 'radiateur');
  const fan = new THREE.Group(); fan.position.set(28.6, 0, 0); root.add(fan);
  const fb = [[cx(2.6, 2, 20), null, 'Moteur du ventilateur', C.dark]]; for (let i = 0; i < 7; i++) fb.push([box(0.3, 10.5, 4), at(0, 0, 0, i * 2 * Math.PI / 7, 0, 0).multiply(at(0, 7.4, 0, 0, 0.5, 0)), 'Pales du ventilateur', C.plastic]);
  const fanM = new THREE.Mesh(merge(fb), M.ventilateur); fanM.userData.part = 'ventilateur'; fan.add(fanM);
  put([[new THREE.TorusGeometry(13.6, 0.9, 8, 48).rotateY(Math.PI / 2), at(28.6, 0, 0), 'Buse du ventilateur', C.plastic], [box(0.8, 1, 27), at(27.4, 0, 0), 'Support du ventilateur', C.plastic], [box(0.8, 27, 1), at(27.4, 0, 0), 'Support du ventilateur', C.plastic], [box(1.6, 5, 7), at(27.4, -11, 12), 'Module de commande du ventilateur', C.dark]], M.ventilateur, 'ventilateur');

  /* ---- Durites, chauffage, vase ---- */
  put([[tube(P_UP, 1.9), null, 'Durite supérieure (vers le radiateur)'], [tube(P_LOW, 1.9), null, 'Durite inférieure (retour du radiateur)'], [tube([[17, 9, -5], [19, 4, -3], [17.5, 0.5, -1]], 1.2), null, 'Circuit court (thermostat fermé)'], [tube(P_H1, 1.15), null, 'Durite de chauffage (aller)'], [tube(P_H2, 1.15), null, 'Durite de chauffage (retour)'],
    [tube([[34, 14.5, -30], [30, 20, -10], [26, 22, 18], [24, 21, 24]], 0.55), null, 'Durite de dégazage'], [tube([[24, 12, 27], [22, 4, 20], [20, -3, 6]], 0.8), null, 'Durite du vase vers la pompe']], M.durites, 'durites', 3);
  const hl = [[box(3, 9, 20), at(-32, 8, 0), 'Radiateur de chauffage', C.alu]]; for (let i = 0; i < 12; i++) hl.push([box(3.3, 8.4, 0.2), at(-32, 8, -8.5 + i * 1.55), 'Radiateur de chauffage', C.steel]);
  put(hl, M.chauffage, 'chauffage');
  put([[box(11, 9, 12), at(24, 16.5, 27)]], M.vase, 'vase', 3).userData.name = 'Vase d’expansion';
  put([[cy(2.2, 1.6, 20), at(24, 21.8, 27), 'Bouchon du vase (taré en pression)', C.blue]], M.cap, 'vase');
  const level = new THREE.Mesh(box(10.4, 1, 11.4), M.liquid); level.userData.part = 'vase'; level.userData.name = 'Liquide de refroidissement'; level.renderOrder = 2; root.add(level);

  /* ---- Liquide en mouvement : billes colorées selon la température locale ---- */
  const N = 230, flow = new THREE.InstancedMesh(new THREE.SphereGeometry(0.62, 8, 6), new THREE.MeshBasicMaterial({ color: 0xffffff }), N), parts = [], dummy = new THREE.Object3D(), col = new THREE.Color(), pos = new THREE.Vector3();
  for (let i = 0; i < N; i++) { const k = i < 60 ? 0 : i < 170 ? 1 : 2, n = k === 0 ? 60 : k === 1 ? 110 : 60, j = k === 0 ? i : k === 1 ? i - 60 : i - 170; parts.push({ k, u: j / n, jx: (Math.random() - 0.5) * 0.9, jy: (Math.random() - 0.5) * 0.9 }); flow.setColorAt(i, col.set(0x2f7fd6)); }
  flow.frustumCulled = false; flow.renderOrder = 1; root.add(flow);
  const drops = Array.from({ length: 4 }, (_, i) => { const d = new THREE.Mesh(new THREE.SphereGeometry(0.5, 8, 6), M.liquid); d.userData.o = i / 4; d.visible = false; root.add(d); return d; });
  const steam = Array.from({ length: 6 }, (_, i) => { const d = new THREE.Mesh(new THREE.SphereGeometry(1.1, 8, 6), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.5, depthWrite: false })); d.userData.o = i / 6; d.visible = false; root.add(d); return d; });
  const STOPS = [[0, 0x2f6fd6], [45, 0x2fb6c8], [75, 0x58c070], [92, 0xe8b23a], [108, 0xe8702a], [125, 0xd62a1e]].map(([t, c]) => [t, new THREE.Color(c)]);
  const heat = (t, out) => { let i = 0; while (i < STOPS.length - 2 && t > STOPS[i + 1][0]) i++; const a = STOPS[i], b = STOPS[i + 1]; return out.copy(a[1]).lerp(b[1], Math.max(0, Math.min(1, (t - a[0]) / (b[0] - a[0])))); };

  /* ---- Modèle thermique ---- */
  const accent = new THREE.Color(cssVar('--accent', '#1C5797')).lerp(new THREE.Color(0x4da3ff), 0.4);
  let mode = 0, Ta = 12, heater = 0.3, ac = false, fault = null, sel = null, pulse = 0;
  let Te = Ta, Tup = Ta, Tout = Ta, Theat = Ta, open = 0, fanS = 0, lvl = 1, below = 0, fanA = 0, pumpA = 0;
  const cold = () => { Te = Tup = Tout = Theat = Ta; lvl = 1; below = 0; open = 0; };
  const alertEl = q('[data-alert]'), descEl = q('[data-desc]'), base = 'À froid, le thermostat est fermé : le liquide tourne en circuit court et le moteur chauffe vite. Il s’ouvre ensuite et le radiateur entre en jeu.';
  function frame(dt, real) {
    const d = real || 0.016; pulse += d; const [, load, speed, rpm] = MODES[mode], sim = dt * 14;
    const boil = fault === 'cap' ? 104 : 126, pumpEff = Math.max(0.12, Math.min(1, (lvl - 0.25) / 0.45)), q0 = (0.35 + rpm / 3000) * pumpEff;
    open = fault === 'thermo' ? Math.max(0.5, Math.min(1, (Te - 87) / 13)) : open + (Math.max(0, Math.min(1, (Te - 87) / 13)) - open) * Math.min(1, sim * 0.6);
    const want = fault === 'fan' ? 0 : Math.max(ac ? 0.45 : 0, Te > 107 ? 1 : Te > 100 ? 0.6 : (fanS > 0.5 && Te > 95 ? 0.6 : 0)); fanS += (want - fanS) * Math.min(1, d * 2);
    const air = 0.1 + speed * 1.1 + fanS * 0.95, qr = q0 * open, ntu = qr > 0.01 ? Math.min(4, 1.5 * air / qr) : 4;
    Tup += ((qr > 0.02 ? Te : Ta) - Tup) * Math.min(1, sim * (qr > 0.02 ? 0.5 * qr + 0.05 : 0.012));
    Tout += ((Ta + (Tup - Ta) * Math.exp(-ntu)) - Tout) * Math.min(1, sim * 0.3);
    Theat += ((heater > 0.03 ? Te - 8 * heater : Ta + 8) - Theat) * Math.min(1, sim * 0.2);
    const Qin = 3 * load + 0.5 + (ac ? 0.25 : 0), Qrad = 0.008 * qr * (Te - Tout) * 3.2, Qh = 0.012 * heater * q0 * Math.max(0, Te - 20), loss = 0.002 * (Te - Ta) * (1 + speed);
    Te += (Qin - Qrad - Qh - loss) * sim * 0.2; if (Te > boil) Te = boil + (Te - boil) * 0.5; Te = Math.min(Te, 132);
    if (fault === 'pump') lvl = Math.max(0.12, lvl - sim * 0.0018); if (Te >= boil - 0.5) lvl = Math.max(0.12, lvl - sim * 0.004);
    below = fault === 'thermo' && mode > 0 && Te < 80 ? below + sim : 0;
    /* Mouvement */
    pumpA += rpm / 60 * d * 0.9; pulley.rotation.x = pumpA; fanA += fanS * d * 26; fan.rotation.x = fanA;
    valve.position.set(17 + Math.sin(0.5) * -2.2 * open, 9.5 + Math.cos(0.5) * 2.2 * open, -5);
    const sp = [q0 * (1 - 0.75 * open) * 0.16, qr * 0.11, q0 * heater * 0.1];
    for (let i = 0; i < N; i++) {
      const p = parts[i]; p.u = (p.u + sp[p.k] * dt) % 1; const c = p.k === 0 ? P_BY : p.k === 1 ? P_RAD : P_HT; c.getPointAt(p.u, pos);
      dummy.position.set(pos.x + p.jx * 0.5, pos.y + p.jy, pos.z + p.jx); dummy.updateMatrix(); flow.setMatrixAt(i, dummy.matrix);
      const t = p.k === 0 ? Te : p.k === 1 ? (p.u < U1 ? Tup : p.u < U2 ? Tup + (Tout - Tup) * (p.u - U1) / (U2 - U1) : Tout) : (p.u < 0.42 ? Te + (Theat - Te) * p.u / 0.42 : Theat);
      flow.setColorAt(i, heat(t, col));
    }
    flow.instanceMatrix.needsUpdate = true; flow.instanceColor.needsUpdate = true;
    level.scale.y = 0.6 + 7.4 * lvl; level.position.set(24, 12.2 + level.scale.y / 2, 27); heat(Te * 0.7 + 10, M.liquid.color);
    drops.forEach((dp) => { dp.visible = fault === 'pump'; if (dp.visible) { const u = (pulse * 0.7 + dp.userData.o) % 1; dp.position.set(17, -8.2 - u * u * 12, 0.4 * Math.sin(dp.userData.o * 9)); } });
    const boiling = Te >= boil - 0.5; steam.forEach((s) => { s.visible = boiling; if (boiling) { const u = (pulse * 0.5 + s.userData.o) % 1; s.position.set(24 + 2 * Math.sin(s.userData.o * 7 + u * 3), 23 + u * 14, 27 + 2 * Math.cos(s.userData.o * 5)); s.scale.setScalar(0.6 + u * 1.8); s.material.opacity = 0.5 * (1 - u); } });
    /* Affichages */
    const te = q('[data-te]'); te.textContent = Math.round(Te) + ' °C'; te.className = 'mono tnum ' + (Te > 112 ? 'bad' : Te < 78 ? 'warn' : 'good');
    q('[data-th]').textContent = open < 0.03 ? 'fermé' : Math.round(open * 100) + ' % ouvert'; q('[data-tr]').textContent = Math.round(Tout) + ' °C';
    q('[data-fan]').textContent = fault === 'fan' ? 'en panne' : fanS < 0.05 ? 'arrêté' : fanS > 0.8 ? 'à fond' : 'en marche'; const lv = q('[data-lv]'); lv.textContent = Math.round(lvl * 100) + ' %'; lv.className = 'mono tnum ' + (lvl < 0.4 ? 'bad' : lvl < 0.7 ? 'warn' : 'good');
    const msg = Te > 112 || boiling ? 'Surchauffe : coupe la clim, mets le chauffage à fond, arrête-toi dès que possible. N’ouvre pas le vase à chaud.' : below > 60 ? 'Le moteur n’atteint pas sa température : code P0128 probable.' : '';
    if (alertEl.dataset.m !== msg) { alertEl.dataset.m = msg; alertEl.hidden = !msg; alertEl.className = 'callout ' + (msg && below > 60 && Te < 100 ? 'warn' : 'danger'); alertEl.firstElementChild.textContent = msg; }
    heat(Te, col); M.moteur.emissive.copy(col).multiplyScalar(0.22);
    Object.keys(HI).forEach((k) => HI[k].forEach((m) => { if (k === sel) m.emissive.copy(accent).multiplyScalar(0.32 + 0.16 * Math.sin(pulse * 4)); else if (m !== M.moteur) m.emissive.setHex(0); }));
    return st.on || !!sel;
  }
  st.onFrame(frame);

  /* ---- Commandes ---- */
  const descSync = (piece) => { descEl.innerHTML = sel ? `<strong>${piece || PARTS[sel][0]}.</strong> ${PARTS[sel][1]}` : fault ? `<strong>${FAULTS[fault][0]}.</strong> ${FAULTS[fault][1]}` : base; };
  function choose(k, piece) { sel = sel === k && !piece ? null : k; el.querySelectorAll('[data-part]').forEach((b) => { const on = b.dataset.part === sel; b.classList.toggle('sel', on); b.setAttribute('aria-pressed', on ? 'true' : 'false'); }); descSync(piece); st.refresh(); }
  el.querySelectorAll('[data-part]').forEach((b) => b.addEventListener('click', () => choose(b.dataset.part)));
  el.querySelectorAll('[data-fault]').forEach((b) => b.addEventListener('click', () => { fault = fault === b.dataset.fault ? null : b.dataset.fault; sel = null; if (fault !== 'pump' && lvl < 1 && Te < 100) lvl = 1;
    el.querySelectorAll('[data-part]').forEach((x) => { x.classList.remove('sel'); x.setAttribute('aria-pressed', 'false'); }); el.querySelectorAll('[data-fault]').forEach((x) => { const on = x.dataset.fault === fault; x.classList.toggle('sel', on); x.setAttribute('aria-pressed', on ? 'true' : 'false'); }); descSync(); st.refresh(); }));
  el.querySelectorAll('[data-mode]').forEach((b) => b.addEventListener('click', () => { mode = +b.dataset.mode; el.querySelectorAll('[data-mode]').forEach((x) => x.classList.toggle('sel', x === b)); st.refresh(); }));
  const ta = q('[data-ta]'), he = q('[data-heat]');
  ta.addEventListener('input', () => { Ta = +ta.value; q('[data-tav]').textContent = String(Ta).replace('-', '−') + ' °C'; st.refresh(); }); q('[data-tav]').textContent = Ta + ' °C';
  he.addEventListener('input', () => { heater = he.value / 100; q('[data-heatv]').textContent = he.value + ' %'; st.refresh(); }); q('[data-heatv]').textContent = he.value + ' %';
  q('[data-ac]').addEventListener('change', (e) => { ac = e.target.checked; st.refresh(); });
  q('[data-cold]').addEventListener('click', () => { cold(); st.play(); st.refresh(); });
  const ray = new THREE.Raycaster();
  st.onTap((ndc) => { ray.setFromCamera(ndc, st.camera); const hits = ray.intersectObjects(root.children, true).filter((x) => x.object.userData.part && x.object.visible); if (!hits.length) return; const h = hits.find((x) => x.object.material !== M.moteur) || hits[0]; choose(h.object.userData.part, h.object.userData.name || nameAt(h.object.geometry, h.faceIndex)); });
  const pb = q('[data-k="play"]'); if (pb) { const sync = () => { pb.textContent = st.on ? 'Pause' : 'Lecture'; }; pb.addEventListener('click', () => { st.on ? st.pause() : st.play(); sync(); }); sync(); }
  descSync(); frame(0, 0.016); st.refresh();
  return st;
}
