/* La berline W203 en 3D : carrosserie galbée, habillage dessiné par shader, organes cliquables.
   Code original, entièrement procédural ; rendu par three.js (MIT). */
import { THREE, createStage, cssVar, reduced, merge, at } from './kit.js';

/* Cotes en décimètres : longueur 45,3 · largeur 17,3 · hauteur 14,3 · empattement 27,15. Avant vers +x, droite vers +z. */
const FA = 14.7, RA = -12.45, WR = 3.16, TRACK = 7.45, X0 = -22.65, X1 = 22.6;
const SYS = [
  ['m112', 'Moteur', [15.2, 7.4, 0]], ['boite', 'Boîte et transmission', [4, 4.2, 0]], ['freinage', 'Freins', [FA, 3.2, 8.2]],
  ['suspension', 'Trains roulants', [RA, 6.6, 7]], ['direction', 'Direction', [6.2, 9.6, -3.8]], ['elec-w203', 'Électricité', [11.6, 7.6, 5.2]],
  ['clim', 'Climatisation', [20.4, 5.4, -3]], ['carrosserie', 'Carrosserie', [-3, 14.4, 0]]
];

/* Interpolation monotone (pas de dépassement entre deux points de contrôle). */
function curve(pts) {
  const n = pts.length, xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1]), d = [], m = [];
  for (let i = 0; i < n - 1; i++) d.push((ys[i + 1] - ys[i]) / (xs[i + 1] - xs[i]));
  m.push(d[0]); for (let i = 1; i < n - 1; i++) m.push(d[i - 1] * d[i] <= 0 ? 0 : 2 * d[i - 1] * d[i] / (d[i - 1] + d[i])); m.push(d[n - 2]);
  return (x) => {
    if (x <= xs[0]) return ys[0]; if (x >= xs[n - 1]) return ys[n - 1];
    let i = 0; while (x > xs[i + 1]) i++;
    const h = xs[i + 1] - xs[i], t = (x - xs[i]) / h, t2 = t * t, t3 = t2 * t;
    return (2 * t3 - 3 * t2 + 1) * ys[i] + (t3 - 2 * t2 + t) * h * m[i] + (-2 * t3 + 3 * t2) * ys[i + 1] + (t3 - t2) * h * m[i + 1];
  };
}
/* Lignes de la berline, de l'arrière vers l'avant. */
const TOP = curve([[X0, 8.9], [-22.2, 10], [-19, 10.55], [-14.8, 10.75], [-11.5, 12.3], [-7.5, 13.75], [-2, 14.26], [2.6, 13.9], [5.6, 12.5], [10.4, 9.6], [16, 8.7], [20.5, 7.7], [22, 7.05], [X1, 6.3]]);
const BOT = curve([[X0, 3.6], [-22, 2.6], [-20, 2.2], [-17, 1.9], [-8, 1.7], [10, 1.7], [18.5, 1.8], [21, 1.9], [22.1, 2.3], [X1, 3]]);
const WID = curve([[X0, 5.6], [-22.2, 6.9], [-21, 7.9], [-18, 8.45], [-12.5, 8.64], [0, 8.64], [14.7, 8.6], [19, 8.3], [21, 7.7], [22.1, 6.6], [X1, 5]]);
const BELT = curve([[X0, 8.3], [-22, 9.3], [-20, 9.95], [-14.8, 10.05], [-8, 9.9], [0, 9.65], [9.5, 9.3], [16, 8.4], [20.5, 7.3], [22, 6.7], [X1, 6]]);
const RAILW = curve([[X0, 3.6], [-22, 5.4], [-20, 6.9], [-14.8, 7.15], [-11.5, 6.3], [-7.5, 5.75], [-2, 5.75], [2.6, 5.85], [5.6, 6.5], [10.4, 7.35], [16, 7.2], [20.5, 6.4], [22, 5.2], [X1, 3.6]]);
const smooth = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const bow = (x, z) => (-1.7 * smooth(13, X1, x) + 1.1 * smooth(-13, X0, x)) * (z / 8.64) * (z / 8.64);

/* Demi-section à l'abscisse x : du dessous (axe) jusqu'au faîte (axe), repères fixes pour le shader. */
const NB = 5, NC = 3, N1 = 4, N2 = 6, N3 = 8, N4 = 12, M = 1 + NB + NC + N1 + N2 + N3 + N4, I_SILL = NB + NC, I_BELT = I_SILL + N1 + N2, I_RAIL = I_BELT + N3;
function half(x) {
  const top = TOP(x), bot = BOT(x), w = WID(x), wr = Math.min(RAILW(x), w - 0.5);
  const rail = Math.max(Math.min(BELT(x), top - 0.3) + 0.08, top - 0.4), belt = Math.min(BELT(x), rail - 0.08), wb = w - 0.2, waist = bot + (belt - bot) * 0.45;
  const P = [[0, bot]], lerp = (a, b, t) => a + (b - a) * t;
  for (let i = 1; i <= NB; i++) P.push([(w - 1) * i / NB, bot]);
  for (let i = 1; i <= NC; i++) { const a = (i / NC) * Math.PI / 2; P.push([w - 1 + 0.85 * Math.sin(a), bot + 0.85 * (1 - Math.cos(a))]); }
  for (let i = 1; i <= N1; i++) { const t = i / N1; P.push([lerp(w - 0.15, w, t), lerp(bot + 0.85, waist, t)]); }
  for (let i = 1; i <= N2; i++) { const t = i / N2; P.push([lerp(w, wb, t * t), lerp(waist, belt, t)]); }
  for (let i = 1; i <= N3; i++) { const t = i / N3; P.push([lerp(wb, wr, t) + 0.14 * Math.sin(Math.PI * t), lerp(belt, rail, t)]); }
  for (let i = 1; i <= N4; i++) { const z = wr * Math.cos((i / N4) * Math.PI / 2); P.push([z, rail + (top - rail) * (1 - Math.pow(z / wr, 2.4))]); }
  return { P, wr };
}
/* Point de la carrosserie à l'abscisse x et à la hauteur y, côté flanc. */
function flank(x, y) { const P = half(x).P; for (let i = I_SILL; i < I_RAIL; i++) if (P[i][1] <= y && P[i + 1][1] >= y) { const t = (y - P[i][1]) / (P[i + 1][1] - P[i][1] || 1); return P[i][0] + (P[i + 1][0] - P[i][0]) * t; } return WID(x); }

function bodyGeometry() {
  const xs = []; for (let x = X0; x < X0 + 2; x += 0.14) xs.push(x); for (let x = X0 + 2; x < X1 - 2; x += 0.42) xs.push(x); for (let x = X1 - 2; x < X1; x += 0.14) xs.push(x); xs.push(X1);
  const N = 2 * M - 2, pos = [], aU = [], aV = [], aR = [], idx = [];
  xs.forEach((x) => {
    const { P, wr } = half(x), ring = P.map((p, j) => [p[0], p[1], j]).concat(P.slice(1, M - 1).reverse().map((p, k) => [-p[0], p[1], M - 2 - k]));
    ring.forEach(([z, y, j]) => { pos.push(x + bow(x, z), y, z); aU.push(x); aV.push(j / (M - 1)); aR.push(wr); });
  });
  for (let s = 0; s < xs.length - 1; s++) for (let k = 0; k < N; k++) { const a = s * N + k, b = s * N + (k + 1) % N, c = a + N, d = b + N; idx.push(a, b, d, a, d, c); }
  [[0, X0], [xs.length - 1, X1]].forEach(([s, x]) => { const c = pos.length / 3; pos.push(x, (TOP(x) + BOT(x)) / 2, 0); aU.push(x); aV.push(0.3); aR.push(0); for (let k = 0; k < N; k++) idx.push(c, s * N + k, s * N + (k + 1) % N); });
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('aU', new THREE.Float32BufferAttribute(aU, 1)); g.setAttribute('aV', new THREE.Float32BufferAttribute(aV, 1)); g.setAttribute('aR', new THREE.Float32BufferAttribute(aR, 1));
  g.setIndex(idx); g.computeVertexNormals(); return g;
}

/* Habillage : vitrages, joints, passages de roue, calandre, optiques, ouvrants. Tout est calculé au pixel, sans texture. */
const GLSL_HEAD = `
varying vec3 vObj; varying float vU; varying float vV; varying float vR;
uniform float uLamp;
#define FA ${FA.toFixed(2)}
#define RA ${RA.toFixed(2)}
#define VSILL ${(I_SILL / (M - 1)).toFixed(4)}
#define VBELT ${(I_BELT / (M - 1)).toFixed(4)}
#define VRAIL ${(I_RAIL / (M - 1)).toFixed(4)}
#define KV 21.0
struct LV { vec3 col; float rough; float metal; vec3 emis; float glass; float hole; };
float sdBox(vec2 p, vec2 c, vec2 h, float r){ vec2 q = abs(p - c) - h + r; return length(max(q, 0.)) + min(max(q.x, q.y), 0.) - r; }
float sdEll(vec2 p, vec2 c, vec2 r){ return (length((p - c) / r) - 1.) * min(r.x, r.y); }
float aa(float d){ return clamp(.5 - d / max(fwidth(d), 1e-4), 0., 1.); }
float ln(float d, float w){ return aa(abs(d) - w); }
void over(inout LV o, vec3 c, float r, float m, float a){ o.col = mix(o.col, c, a); o.rough = mix(o.rough, r, a); o.metal = mix(o.metal, m, a); }
LV livery(vec3 p, float u, float v, float wr, vec3 paint, float rough, float metal){
  LV o; o.col = paint; o.rough = rough; o.metal = metal; o.emis = vec3(0.); o.glass = 0.; o.hole = 0.;
  float az = abs(p.z); vec2 f = vec2(az, p.y);
  float dF = length(vec2(u - FA, p.y - 3.15)), dR = length(vec2(u - RA, p.y - 3.15));
  if (v < VBELT && min(dF, dR) < 3.78 && az > 4.7) o.hole = 1.;
  /* Vitrages */
  float gv = max(VBELT + .014 - v, v - (VRAIL - .016)) * KV;
  float gs = max(max(gv, u - 8.9), (-11.3 + (p.y - 10.) * .9) - u);
  gs = max(gs, .42 - abs(u + 1.6));
  float tz = max(az - (wr - .34), (VRAIL - v) * KV);
  float gw = max(max(tz, u - 9.95), 3.15 - u), gr = max(max(tz, u + 8.35), -14.25 - u);
  float gd = min(gs, min(gw, gr));
  o.glass = step(gd, 0.);
  /* Joints d'ouvrants */
  float L = 0., W = .03;
  if (v > VSILL && v < VBELT) {
    L = max(L, ln(u - 8.3, W)); L = max(L, ln(u + 1.6, W));
    L = max(L, p.y > 6.4 ? ln(u + 9.3, W) : ln(dR - 4.55, W) * step(RA, u));
    L = max(L, ln(p.y - 2.72, W) * step(RA + 4.4, u) * step(u, FA - 3.9));
    if (p.y < 6.2) { L = max(L, ln(u - 19.3, W)); L = max(L, ln(u + 19.5, W)); }
    if (p.z > 0.) L = max(L, ln(sdBox(vec2(u, p.y), vec2(-17.1, 8.55), vec2(.7, .6), .25), W));
    over(o, paint * .82, rough, metal, aa(abs(p.y - 5.35) - .16) * step(u, 10.3) * step(-9.2, u) * step(.1, abs(u + 1.6)));
  }
  if (v > VRAIL - .05) {
    if (u > 10.7 && u < 21.3) L = max(L, ln(az - wr, W));
    if (u < -14.95 && u > -22.3) L = max(L, ln(az - wr, W));
  }
  if (v > VRAIL && az < wr) { L = max(L, ln(u - 21.3, W)); L = max(L, ln(u + 14.95, W)); }
  if (u < -22.2) L = max(L, ln(p.y - 6.3, W) * step(az, 6.4));
  over(o, vec3(.015), .7, 0., L * .88);
  /* Joints de vitres, montant central, grille d'auvent */
  float trim = aa(gd - .17);
  trim = max(trim, aa(max(gv, abs(u + 1.6) - .6)));
  trim = max(trim, aa(max(max(tz + .3, u - 10.75), 9.9 - u)));
  over(o, vec3(.012), .42, 0., trim);
  vec3 chrome = vec3(.86, .88, .9);
  over(o, chrome, .12, 1., ln(gv + .014 * KV - .05, .045) * step(u, 8.9) * step(-11., u) * step(VBELT, v) * (1. - o.glass) * step(.62, abs(u + 1.6)));
  /* Face avant : optiques doubles, calandre, entrées d'air, plaque */
  if (u > 19.) {
    float ho = sdEll(f, vec2(6.05, 6.3), vec2(1.7, 1.)), hi = sdEll(f, vec2(3.95, 6.38), vec2(1.2, .86)), hd = min(ho, hi);
    over(o, vec3(.02), .3, 0., aa(hd - .06));
    over(o, chrome * .8, .1, 1., aa(hd));
    float pr = min(length(f - vec2(6.05, 6.3)) - .58, length(f - vec2(3.95, 6.38)) - .46), rg = min(abs(pr) - .05, 9.);
    over(o, vec3(.05), .2, 1., aa(rg));
    over(o, vec3(.9, .93, 1.), .04, 0., aa(pr + .1)); o.emis += vec3(1., .94, .8) * aa(pr + .1) * uLamp;
    over(o, vec3(.9, .45, .05), .2, 0., aa(sdEll(f, vec2(7.3, 6.25), vec2(.22, .4))) * aa(hd + .05));
    float fg = length(f - vec2(6.2, 3.15)) - .42; over(o, vec3(.02), .4, 0., aa(fg - .12)); over(o, chrome, .08, 1., aa(fg));
  }
  if (u > 21.) {
    float g = sdBox(f, vec2(0., 6.02), vec2(2.95, .95), .42), gi = g + .17;
    over(o, chrome, .1, 1., aa(g));
    over(o, vec3(.015), .6, 0., aa(gi));
    float sl = abs(fract((p.y - 5.02) * 1.75) - .5);
    over(o, chrome, .14, 1., aa(gi) * max(smoothstep(.33, .38, sl), aa(az - .11)));
    float it = sdBox(f, vec2(0., 2.95), vec2(4.5, .5), .3); over(o, vec3(.015), .7, 0., aa(it));
    over(o, chrome * .5, .3, 1., aa(it) * smoothstep(.3, .4, abs(fract(p.y * 3.2) - .5)));
    float pl = sdBox(f, vec2(0., 4.3), vec2(2.6, .55), .06); over(o, vec3(.02), .5, 0., aa(pl - .05)); over(o, vec3(.93), .5, 0., aa(pl));
  }
  /* Face arrière : feux, plaque, jonc chromé */
  if (u < -20.) {
    float tl = sdBox(f, vec2(6.35, 8.6), vec2(2.15, .9), .5);
    over(o, vec3(.02), .3, 0., aa(tl - .08)); over(o, vec3(.5, .015, .02), .1, 0., aa(tl)); o.emis += vec3(.5, .02, .02) * aa(tl) * uLamp * .6;
    over(o, vec3(.75, .2, .02), .1, 0., aa(tl) * aa(abs(p.y - 9.05) - .2));
    over(o, vec3(.92), .1, 0., aa(sdBox(f, vec2(4.95, 8.3), vec2(.5, .28), .12)));
  }
  if (u < -22.2) {
    float pl = sdBox(f, vec2(0., 7.35), vec2(2.6, .55), .06); over(o, vec3(.02), .5, 0., aa(pl - .25)); over(o, vec3(.93), .5, 0., aa(pl));
    over(o, chrome, .1, 1., aa(sdBox(f, vec2(0., 8.25), vec2(3.4, .1), .1)));
    over(o, vec3(.02), .6, 0., aa(sdBox(f, vec2(0., 4.2), vec2(5.6, .28), .2)));
  }
  return o;
}`;
function dress(mat, isGlass) {
  mat.onBeforeCompile = (sh) => {
    sh.uniforms.uLamp = mat.userData.uLamp;
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nattribute float aU; attribute float aV; attribute float aR; varying vec3 vObj; varying float vU; varying float vV; varying float vR;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvObj = position; vU = aU; vV = aV; vR = aR;');
    let f = sh.fragmentShader.replace('#include <common>', '#include <common>\n' + GLSL_HEAD);
    f = isGlass
      ? f.replace('#include <color_fragment>', '#include <color_fragment>\nLV lv = livery(vObj, vU, vV, vR, diffuseColor.rgb, roughness, metalness); if (lv.glass < .5 || lv.hole > .5) discard;')
      : f.replace('#include <color_fragment>', '#include <color_fragment>\nLV lv = livery(vObj, vU, vV, vR, diffuseColor.rgb, roughness, metalness); if (lv.glass > .5 || lv.hole > .5) discard; diffuseColor.rgb = lv.col;')
        .replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\nroughnessFactor = lv.rough;').replace('#include <metalnessmap_fragment>', '#include <metalnessmap_fragment>\nmetalnessFactor = lv.metal;')
        .replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\ntotalEmissiveRadiance += lv.emis;');
    sh.fragmentShader = f;
  };
  return mat;
}

/* ---- Roue : pneu profilé, jante alliage à 7 branches, disque et étrier ---- */
function wheelParts() {
  const lathe = (pts, seg) => new THREE.LatheGeometry(pts.map((p) => new THREE.Vector2(p[0], p[1])), seg || 48).rotateX(Math.PI / 2);
  const tire = lathe([[2.02, -0.98], [2.2, -1.07], [2.72, -1.1], [3.0, -1.0], [3.13, -0.82], [3.16, -0.62], [3.16, -0.5], [3.1, -0.47], [3.1, -0.4], [3.16, -0.37], [3.16, -0.06], [3.1, -0.03], [3.1, 0.03], [3.16, 0.06], [3.16, 0.37], [3.1, 0.4], [3.1, 0.47], [3.16, 0.5], [3.16, 0.62], [3.13, 0.82], [3.0, 1.0], [2.72, 1.1], [2.2, 1.07], [2.02, 0.98]], 56);
  const rim = [lathe([[2.06, -1], [2.0, -0.92], [1.9, -0.8], [1.86, 0.2], [1.9, 0.86], [2.0, 0.95], [2.08, 1.02], [2.02, 1.04], [1.84, 0.9], [1.78, 0.2]], 56)];
  const sp = new THREE.Shape(); sp.moveTo(-0.3, 0.45); sp.lineTo(-0.17, 1.88); sp.lineTo(0.17, 1.88); sp.lineTo(0.3, 0.45); sp.closePath();
  const spoke = new THREE.ExtrudeGeometry(sp, { depth: 0.16, bevelEnabled: true, bevelThickness: 0.07, bevelSize: 0.07, bevelSegments: 2 });
  for (let i = 0; i < 7; i++) rim.push([spoke, at(0, 0, 0.55, 0, 0, i * 2 * Math.PI / 7)]);
  rim.push([lathe([[0, 0.9], [0.5, 0.88], [0.72, 0.78], [0.78, 0.5], [0.7, 0.3]], 28), null]);
  const bolt = new THREE.CylinderGeometry(0.075, 0.075, 0.1, 8).rotateX(Math.PI / 2);
  const dark = [[lathe([[0, 0.93], [0.3, 0.92], [0.34, 0.86]], 20), null]]; for (let i = 0; i < 5; i++) dark.push([bolt, at(0.53 * Math.cos(i * 1.2566), 0.53 * Math.sin(i * 1.2566), 0.86)]);
  const disc = merge([lathe([[0.75, -0.25], [1.52, -0.25], [1.52, -0.02], [0.8, -0.02], [0.72, 0.3], [0.3, 0.3]], 40)]);
  return { tire, rim: merge(rim), dark: merge(dark), disc };
}

export function mount(el) {
  const host = el.querySelector('[data-stage]'); host.innerHTML = '';
  const st = createStage(host, { target: [0, 5.6, 0], radius: 78, fov: 24, az: 0.72, el: 0.2, minEl: 0.02, maxEl: 1.4, zoom: [0.5, 1.5], label: 'Maquette 3D de la Mercedes C 240 W203' });
  const { scene } = st;
  const accent = new THREE.Color(cssVar('--accent', '#1C5797')).lerp(new THREE.Color(0x4da3ff), 0.35);
  const std = (color, o) => new THREE.MeshStandardMaterial(Object.assign({ color, metalness: 0.7, roughness: 0.4 }, o || {}));
  const uLamp = { value: 0.9 };
  const M_ = {
    paint: dress(new THREE.MeshPhysicalMaterial({ color: 0xd3d8de, metalness: 0.62, roughness: 0.3, clearcoat: 1, clearcoatRoughness: 0.05, side: THREE.DoubleSide }), false),
    glass: dress(new THREE.MeshPhysicalMaterial({ color: 0x1a2a30, metalness: 0, roughness: 0.03, transparent: true, opacity: 0.42, depthWrite: false, side: THREE.DoubleSide, envMapIntensity: 1.6 }), true),
    plain: new THREE.MeshPhysicalMaterial({ color: 0xd3d8de, metalness: 0.62, roughness: 0.3, clearcoat: 1, clearcoatRoughness: 0.05 }),
    black: std(0x0b0c0e, { metalness: 0.1, roughness: 0.75 }), chrome: std(0xe2e6ea, { metalness: 1, roughness: 0.08 }),
    tire: std(0x111315, { metalness: 0, roughness: 0.9 }), alloy: std(0xcfd5db, { metalness: 0.95, roughness: 0.22 }), disc: std(0x9aa1a9, { metalness: 0.9, roughness: 0.38 }),
    cabin: std(0x23272d, { metalness: 0.05, roughness: 0.85 }), seat: std(0x3a3f47, { metalness: 0, roughness: 0.9 }),
    m112: std(0x9aa3ad), boite: std(0x7f8892), freinage: std(0xb23a2a, { metalness: 0.4 }),
    suspension: std(0x59626c), direction: std(0x8a7a4a), 'elec-w203': std(0x2f3a48, { metalness: 0.3 }), clim: std(0x6f8fa8, { metalness: 0.5 })
  };
  M_.paint.userData.uLamp = M_.glass.userData.uLamp = uLamp;
  const HI = { m112: [M_.m112], boite: [M_.boite], freinage: [M_.freinage, M_.disc], suspension: [M_.suspension], direction: [M_.direction], 'elec-w203': [M_['elec-w203']], clim: [M_.clim], carrosserie: [M_.paint, M_.plain] };
  const car = new THREE.Group(); scene.add(car);
  const put = (geo, mat, part, order) => { const m = new THREE.Mesh(geo, mat); if (part) m.userData.part = part; if (order) m.renderOrder = order; car.add(m); return m; };
  const box = (w, h, d) => new THREE.BoxGeometry(w, h, d), cz = (r, len, seg, r2) => new THREE.CylinderGeometry(r2 == null ? r : r2, r, len, seg || 20).rotateX(Math.PI / 2), cx = (r, len, seg, r2) => new THREE.CylinderGeometry(r2 == null ? r : r2, r, len, seg || 20).rotateZ(Math.PI / 2), cy = (r, len, seg) => new THREE.CylinderGeometry(r, r, len, seg || 12);

  /* ---- Carrosserie et vitrages : une seule surface, deux matériaux complémentaires ---- */
  const bodyGeo = bodyGeometry();
  const body = put(bodyGeo, M_.paint, 'carrosserie', 4), glass = put(bodyGeo, M_.glass, 'carrosserie', 5);
  /* Accessoires de carrosserie : rétroviseurs, poignées, lèvres d'aile, étoile, sortie d'échappement. */
  const trimP = [], trimC = [], trimB = [];
  [-1, 1].forEach((s) => {
    trimP.push([new THREE.SphereGeometry(1, 18, 12), at(8.8, 9.9, s * (flank(8.6, 9.6) + 0.8), 0, s * 0.25, 0, 0.36, 0.56, 0.85)]);
    trimB.push([box(0.5, 0.3, 0.7), at(8.9, 9.6, s * (flank(8.6, 9.5) + 0.25))]);
    [[-0.1, 8.9], [-8.0, 9.05]].forEach(([x, y]) => trimC.push([box(1.25, 0.2, 0.2), at(x, y, s * (flank(x, y) + 0.06))]));
    [FA, RA].forEach((x) => trimP.push([new THREE.TorusGeometry(3.8, 0.055, 6, 40, Math.PI * 1.06), at(x, 3.15, s * (WID(x) - 0.06), 0, 0, -0.09)]));
    [FA, RA].forEach((x) => { const len = WID(x) - 4.9; trimB.push([new THREE.CylinderGeometry(3.82, 3.82, len, 28, 1, true).rotateX(Math.PI / 2), at(x, 3.15, s * (4.75 + len / 2 - 0.12))], [new THREE.CircleGeometry(3.82, 28), at(x, 3.15, s * 4.66)]); });
  });
  trimC.push([new THREE.TorusGeometry(0.2, 0.025, 6, 24), at(21.55, TOP(21.55) + 0.3, 0, 0, Math.PI / 2, 0)], [cy(0.05, 0.14, 8), at(21.55, TOP(21.55) + 0.05, 0)]);
  for (let i = 0; i < 3; i++) trimC.push([box(0.025, 0.2, 0.035).translate(0, 0.1, 0), at(21.55, TOP(21.55) + 0.3, 0, i * 2.0944, 0, 0)]);
  trimC.push([cx(0.42, 1.1, 16), at(-22.2, 2.75, -4.6, 0, 0, 0, 1, 0.75, 1)]);
  trimB.push([box(0.12, 0.12, 5.2), at(10.2, TOP(10.2) + 0.12, -1.4, 0, 0.22, 0)], [box(0.12, 0.12, 5), at(10.3, TOP(10.3) + 0.1, 3.4, 0, 0.22, 0)]);
  put(merge(trimP), M_.plain, 'carrosserie', 4); put(merge(trimC), M_.chrome, 'carrosserie', 4);
  const wells = put(merge(trimB), M_.black, null, 1); wells.material = M_.black.clone(); wells.material.side = THREE.DoubleSide;

  /* ---- Habitacle ---- */
  const seatShape = new THREE.Shape(); seatShape.moveTo(-2.3, 0); seatShape.lineTo(2.2, 0.2); seatShape.quadraticCurveTo(2.7, 0.9, 2.2, 1.3); seatShape.lineTo(-0.9, 1.2); seatShape.lineTo(-2.2, 6.3); seatShape.quadraticCurveTo(-2.9, 6.9, -3.3, 6.2); seatShape.lineTo(-2.6, 0.6); seatShape.closePath();
  const seat = (w) => new THREE.ExtrudeGeometry(seatShape, { depth: w - 0.6, bevelEnabled: true, bevelThickness: 0.3, bevelSize: 0.3, bevelSegments: 3, curveSegments: 6 }).translate(0, 0, -(w - 0.6) / 2);
  const seats = [[seat(4.6), at(1.2, 3.4, -3.7)], [seat(4.6), at(1.2, 3.4, 3.7)], [seat(12.4), at(-8.3, 3.6, 0)]];
  [-3.7, 3.7].forEach((z) => seats.push([box(0.9, 1.5, 2.4), at(-2.2, 10.7, z, 0, 0, 0.2)])); [-4, 0, 4].forEach((z) => seats.push([box(0.8, 1.1, 2.2), at(-11.7, 10.7, z, 0, 0, 0.2)]));
  const seatsM = put(merge(seats), M_.seat, null, 1);
  const dashS = new THREE.Shape(); dashS.moveTo(0, 0); dashS.lineTo(2.6, 0); dashS.lineTo(2.9, 4.6); dashS.quadraticCurveTo(1.6, 5.4, 0.2, 4.7); dashS.lineTo(0.5, 2.6); dashS.closePath();
  put(merge([
    [box(25, 0.6, 14.2), at(-2, 2.6, 0)], [new THREE.ExtrudeGeometry(dashS, { depth: 14, bevelEnabled: false }).translate(0, 0, -7), at(7.2, 4.3, 0)],
    [box(8, 2.3, 1.9), at(2.6, 3.9, 0)], [box(3.6, 0.4, 13.4), at(-13.4, 9.85, 0)], [box(0.5, 6.4, 14), at(-11.6, 6.2, 0, 0, 0, 0.35)], [box(0.5, 6.6, 14.4), at(10.4, 5.6, 0)]
  ]), M_.cabin, null, 1);

  /* ---- Roues, freins, trains ---- */
  const WP = wheelParts(), wheels = [], helix = (r, h, turns) => { const P = []; for (let i = 0; i <= turns * 12; i++) { const a = i / 12 * 2 * Math.PI; P.push(new THREE.Vector3(r * Math.cos(a), h * i / (turns * 12), r * Math.sin(a))); } return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(P), turns * 16, 0.15, 6); };
  const susp = [], brake = [];
  [[FA, 1], [FA, -1], [RA, 1], [RA, -1]].forEach(([x, s]) => {
    const w = new THREE.Group(); w.position.set(x, WR, s * TRACK); w.scale.z = s; car.add(w); wheels.push(w);
    w.add(new THREE.Mesh(WP.tire, M_.tire), new THREE.Mesh(WP.rim, M_.alloy), new THREE.Mesh(WP.dark, M_.black));
    const d = new THREE.Mesh(WP.disc, M_.disc); d.userData.part = 'freinage'; w.add(d);
    brake.push([box(1.5, 1.25, 0.95), at(x + (x > 0 ? -1.25 : 1.25), WR + 0.5, s * (TRACK - 0.2), 0, 0, x > 0 ? 0.4 : -0.4)]);
    susp.push([helix(0.72, 3.4, 5), at(x, WR + 1.5, s * (TRACK - 2.2))], [cy(0.26, 4.6), at(x, WR + 3.2, s * (TRACK - 2.2))], [cy(0.42, 1.8), at(x, WR + 1.6, s * (TRACK - 2.2))],
      [box(0.5, 0.35, 4.4), at(x, WR - 0.95, s * (TRACK - 3.1), s * 0.08)], [box(3.4, 0.35, 0.5), at(x - 1.4, WR - 0.95, s * (TRACK - 4.3), 0, s * 0.5)], [cz(0.5, 1.2, 12), at(x, WR, s * (TRACK - 1.4))]);
  });
  susp.push([cz(0.22, TRACK * 2 - 3.2, 8), at(FA + 2.6, 2.7, 0)], [cz(0.2, TRACK * 2 - 3.2, 8), at(RA - 2.4, 2.8, 0)], [box(5.4, 0.5, 9.6), at(FA, 2.3, 0)], [box(5.6, 0.5, 9), at(RA, 2.6, 0)]);
  put(merge(susp), M_.suspension, 'suspension'); put(merge(brake), M_.freinage, 'freinage');

  /* ---- Groupe motopropulseur : V6 longitudinal, boîte, arbre, pont ---- */
  const eng = [[box(6.2, 2.6, 3.6), at(15.2, 3.9, 0)], [box(4.4, 1.1, 2.8), at(15, 7.25, 0)], [cx(1, 0.5), at(18.6, 3.8, 0)], [box(5.6, 1, 2.8), at(15.4, 2.5, 0)]];
  [-1, 1].forEach((s) => { eng.push([box(6, 3.2, 2.2), at(15.2, 5.8, s * 1.75, s * Math.PI / 4)], [cx(0.42, 6.2, 12), at(15, 4.6, s * 3.7)], [cx(0.36, 20, 10), at(1.8, 2.7, s * 1.5)], [cx(0.75, 3.2, 14), at(8.6, 2.75, s * 1.5)]); });
  eng.push([cx(1, 4.6, 16), at(-6.4, 2.75, 0, 0, 0, 0, 1, 0.7, 2.2)], [cx(1.15, 5.4, 16), at(-18.6, 3.3, -3.4, 0, 0, 0, 1, 0.75, 1.9)], [cx(0.34, 10, 10), at(-12.6, 2.9, -2.2, 0, -0.16, 0)]);
  put(merge(eng), M_.m112, 'm112');
  const covers = []; [-1, 1].forEach((s) => covers.push([box(6.1, 0.7, 2.4), at(15.2, 7.05, s * 3.0, s * Math.PI / 4)])); covers.push([box(9, 1.9, 11.6), at(-7.6, 3.1, 0)]); put(merge(covers), M_.cabin, 'm112');
  put(merge([[cx(2.1, 1.6, 24), at(11.3, 4.4, 0)], [cx(1.9, 5.2, 24, 1.05), at(7.9, 4.3, 0)], [box(3.4, 0.5, 2.6), at(8.6, 2.9, 0)], [cx(0.36, 15.6, 12), at(-2.6, 3.9, 0)], [cx(0.6, 0.4, 14), at(4.9, 3.9, 0)], [cx(0.6, 0.4, 14), at(-10.2, 3.9, 0)],
    [new THREE.SphereGeometry(1.5, 20, 14), at(RA + 0.6, 3.6, 0, 0, 0, 0, 1.2, 1, 1.1)], [cz(0.3, TRACK * 2 - 2.4, 10), at(RA, WR, 0)]]), M_.boite, 'boite');
  /* ---- Direction, électricité, climatisation, refroidissement ---- */
  put(merge([[cz(0.4, 11.4, 12), at(FA - 1.9, 3, 0)], [cy(0.2, 9.4, 8), at(9.2, 6.8, -3.8, 0, 0, 1.05)], [new THREE.TorusGeometry(1.45, 0.2, 8, 28), at(5.1, 9.2, -3.8, 0, Math.PI / 2, 0)], [box(0.25, 0.25, 2.6), at(5.1, 9.2, -3.8)], [cx(0.5, 1.6, 12), at(17.4, 5.2, -2.9)]]), M_.direction, 'direction');
  put(merge([[box(2.6, 1.8, 1.7), at(11.6, 6.6, 5.2)], [cx(0.8, 1.6, 16), at(17.6, 5.6, 2.6)], [box(1.8, 1.2, 2.4), at(12, 6.9, -5.2)], [box(0.5, 0.5, 9), at(11.4, 6.6, 0)], [box(26, 0.22, 0.22), at(-2, 3.05, 5.9)]]), M_['elec-w203'], 'elec-w203');
  put(merge([[box(0.3, 3.6, 10.6), at(20.5, 5, 0)], [cx(0.75, 1.9, 16), at(17.8, 3.6, -2.6)], [box(2, 2.2, 6), at(8.6, 6.6, 1.2)], [cx(0.14, 9, 8), at(13.6, 6.2, -4.4)]]), M_.clim, 'clim');
  put(merge([[box(0.45, 4, 10.6), at(19.9, 5, 0)], [cx(1.9, 0.5, 20), at(19.4, 5, 0)]]), M_.disc, 'm112');
  /* Ombre au sol */
  const sh = document.createElement('canvas'); sh.width = 256; sh.height = 128; const g2 = sh.getContext('2d'); g2.filter = 'blur(14px)'; g2.fillStyle = 'rgba(0,0,0,.6)'; g2.beginPath(); g2.roundRect(34, 34, 188, 60, 26); g2.fill();
  const shadow = new THREE.Mesh(new THREE.PlaneGeometry(64, 32), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(sh), transparent: true, depthWrite: false })); shadow.rotation.x = -Math.PI / 2; shadow.position.y = 0.01; car.add(shadow);

  /* ---- Repères cliquables et commandes ---- */
  const mods = (window.W203 && window.W203.modules) || [], ui = el.querySelector('[data-ui]'), layer = document.createElement('div'); layer.className = 'hot3d'; host.appendChild(layer);
  const dots = SYS.map(([id, label, pos]) => { const b = document.createElement('button'); b.type = 'button'; b.className = 'hot3d-dot'; b.dataset.sys = id; b.setAttribute('aria-label', label); b.innerHTML = `<span>${label}</span>`; layer.appendChild(b); b.addEventListener('click', () => choose(id)); return { id, b, v: new THREE.Vector3(...pos) }; });
  const hint = '<p class="viz-note">Glisse pour tourner la voiture, pince pour zoomer. Touche un repère ou un système : la carrosserie devient transparente et le module s’affiche.</p>';
  ui.innerHTML = `<div class="vchips" role="group" aria-label="Systèmes de la voiture">${SYS.map(([id, label]) => `<button class="vbtn sm" type="button" data-sys="${id}" aria-pressed="false">${label}</button>`).join('')}<label class="vtoggle"><input type="checkbox" data-xray><span class="vtrack" aria-hidden="true"></span>Radiographie</label></div><div class="hot3d-card" data-card aria-live="polite">${hint}</div>`;
  ui.querySelectorAll('.vbtn[data-sys]').forEach((b) => b.addEventListener('click', () => choose(b.dataset.sys)));
  const xr = ui.querySelector('[data-xray]');
  let sel = null, spin = !reduced(), pulse = 0, xray = 0, xrayT = 0, manual = false;
  xr.addEventListener('change', () => { manual = xr.checked; xrayT = manual || (sel && sel !== 'carrosserie') ? 1 : 0; st.refresh(); });
  function choose(id) {
    sel = sel === id ? null : id; spin = false;
    el.querySelectorAll('[data-sys]').forEach((b) => { const on = b.dataset.sys === sel; b.classList.toggle('sel', on); if (b.hasAttribute('aria-pressed')) b.setAttribute('aria-pressed', on ? 'true' : 'false'); });
    const m = mods.find((x) => x.id === sel), card = ui.querySelector('[data-card]');
    card.innerHTML = m ? `<div><p class="eyebrow">${m.code} · ${m.lessons.length} leçons</p><b>${m.title}</b><p>${m.desc}</p></div><a class="btn small" href="#m-${m.id}">Ouvrir le module</a>` : hint;
    xrayT = manual || (sel && sel !== 'carrosserie') ? 1 : 0; xr.checked = xrayT === 1;
    st.refresh();
  }
  const ray = new THREE.Raycaster();
  st.onTap((ndc) => { ray.setFromCamera(ndc, st.camera); const hits = ray.intersectObjects(car.children, true).filter((h) => h.object.userData.part); if (!hits.length) return; const h = (xray > 0.5 && hits.find((x) => x.object.userData.part !== 'carrosserie')) || hits[0]; if (h.object.userData.part !== sel) choose(h.object.userData.part); });
  st.canvas.addEventListener('pointerdown', () => { spin = false; });
  const p = new THREE.Vector3(); let wasSolid = null;
  st.onFrame((dt, real) => {
    if (spin) { st.orbit.taz += dt * 0.14; st.orbit.az = st.orbit.taz; wheels.forEach((w) => { w.rotation.z -= dt * 1.1 * w.scale.z; }); }
    pulse += real || 0.016;
    xray += (xrayT - xray) * (1 - Math.pow(0.003, real || 0.016)); if (Math.abs(xrayT - xray) < 0.004) xray = xrayT; if (reduced()) xray = xrayT;
    const solid = xray < 0.01;
    if (solid !== wasSolid) { wasSolid = solid; M_.paint.transparent = !solid; M_.paint.depthWrite = solid; M_.paint.needsUpdate = true; body.renderOrder = solid ? 0 : 4; }
    M_.paint.opacity = 1 - 0.8 * xray; M_.glass.opacity = 0.42 - 0.3 * xray; M_.plain.transparent = !solid; M_.plain.opacity = 1 - 0.7 * xray; wells.visible = xray < 0.5; layer.style.opacity = xray.toFixed(2); layer.style.visibility = xray > 0.02 ? 'visible' : 'hidden';
    [M_.cabin, M_.seat].forEach((m) => { m.transparent = !solid; m.depthWrite = solid; m.opacity = 1 - 0.9 * xray; });
    Object.keys(HI).forEach((k) => HI[k].forEach((m) => { if (k === sel) m.emissive.copy(accent).multiplyScalar((k === 'carrosserie' ? 0.16 : 0.55) + 0.25 * Math.sin(pulse * 4) * (k === 'carrosserie' ? 0.3 : 1)); else m.emissive.setHex(0); }));
    const w = host.clientWidth, h = host.clientHeight;
    dots.forEach((d) => { d.b.classList.toggle('sel', d.id === sel); p.copy(d.v).project(st.camera); d.b.style.transform = `translate(${((p.x + 1) / 2 * w).toFixed(1)}px,${((1 - p.y) / 2 * h).toFixed(1)}px)`; });
    return !!sel || xray !== xrayT;
  });
  st.refresh();
  return st;
}
