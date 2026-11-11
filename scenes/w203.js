/* La berline W203 en 3D : carrosserie galbée, habillage dessiné par shader, organes cliquables.
   Code original, entièrement procédural ; rendu par three.js (MIT). */
import { THREE, createStage, cssVar, reduced, merge, at, seg, tube, nameAt } from './kit.js';

/* Cotes en décimètres : longueur 45,3 · largeur 17,3 · hauteur 14,3 · empattement 27,15. Avant vers +x, droite vers +z. */
const FA = 14.7, RA = -12.45, WR = 3.16, TRACK = 7.45, X0 = -22.65, X1 = 22.6;
const PAINTS = [['Argent brillant', 0xd3d8de, 0.62, 0.3], ['Noir obsidienne', 0x0c0d10, 0.55, 0.22], ['Bleu nuit', 0x14284a, 0.6, 0.26], ['Vert aventurine', 0x1d3a30, 0.6, 0.28], ['Rouge', 0x7a1418, 0.45, 0.25], ['Blanc', 0xe9ebec, 0.1, 0.35]];
/* Maquettes détaillées accessibles depuis chaque système : [titre, leçon]. */
const MAQ = { m112: [['Le V6 en 3D', 'm112-archi'], ['Le refroidissement en 3D', 'refroid-m112']], boite: [['La boîte 722.6 en 3D', 'b7226']], freinage: [['Le frein à disque en 3D', 'freins-av']], suspension: [['Le train avant en 3D', 'train-av']] };
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
uniform float uLamp; uniform float uPanel; uniform float uSide; uniform vec4 uOpen;
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
/* Ouvrants : 1 capot, 2 coffre, 3 porte avant, 4 porte arrière. */
float panelId(vec3 p, float u, float v, float wr){
  float az = abs(p.z);
  if (v > VRAIL - .06 && az < wr) { if (u > 10.7 && u < 21.3) return 1.; if (u < -14.95 && u > -22.2) return 2.; }
  if (u <= -22.2 && p.y > 6.3 && az < 6.4) return 2.;
  if (v > VSILL && v < VRAIL - .02 && p.y > 2.72) {
    if (u < 8.3 && u > -1.6) return 3.;
    if (u <= -1.6 && u > -9.3 && length(vec2(u - RA, p.y - 3.15)) > 4.55) return 4.;
  }
  return 0.;
}
bool panelCut(vec3 p, float u, float v, float wr){
  float id = panelId(p, u, v, wr);
  if (uPanel < .5) return id > .5 && (id < 1.5 ? uOpen.x : id < 2.5 ? uOpen.y : id < 3.5 ? uOpen.z : uOpen.w) > .5;
  return abs(id - uPanel) > .5 || p.z * uSide < 0.;
}
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
    sh.uniforms.uLamp = mat.userData.uLamp; sh.uniforms.uPanel = mat.userData.uPanel; sh.uniforms.uSide = mat.userData.uSide; sh.uniforms.uOpen = mat.userData.uOpen;
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nattribute float aU; attribute float aV; attribute float aR; varying vec3 vObj; varying float vU; varying float vV; varying float vR;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvObj = position; vU = aU; vV = aV; vR = aR;');
    let f = sh.fragmentShader.replace('#include <common>', '#include <common>\n' + GLSL_HEAD);
    f = isGlass
      ? f.replace('#include <color_fragment>', '#include <color_fragment>\nLV lv = livery(vObj, vU, vV, vR, diffuseColor.rgb, roughness, metalness); if (lv.glass < .5 || lv.hole > .5 || panelCut(vObj, vU, vV, vR)) discard;')
      : f.replace('#include <color_fragment>', '#include <color_fragment>\nLV lv = livery(vObj, vU, vV, vR, diffuseColor.rgb, roughness, metalness); if (lv.glass > .5 || lv.hole > .5 || panelCut(vObj, vU, vV, vR)) discard; diffuseColor.rgb = lv.col;')
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
  const st = createStage(host, { target: [0, 5.6, 0], radius: 78, fov: 24, az: 0.72, el: 0.2, minEl: 0.02, maxEl: 1.4, zoom: [0.4, 1.5], fit: 1.55, label: 'Maquette 3D de la Mercedes C 240 W203' });
  const { scene } = st;
  const accent = new THREE.Color(cssVar('--accent', '#1C5797')).lerp(new THREE.Color(0x4da3ff), 0.35);
  const std = (color, o) => new THREE.MeshStandardMaterial(Object.assign({ color, metalness: 0.7, roughness: 0.4 }, o || {}));
  const sysM = () => new THREE.MeshStandardMaterial({ color: 0xffffff, vertexColors: true, metalness: 0.55, roughness: 0.45 });
  const uLamp = { value: 0.9 };
  const M_ = {
    paint: dress(new THREE.MeshPhysicalMaterial({ color: 0xd3d8de, metalness: 0.62, roughness: 0.3, clearcoat: 1, clearcoatRoughness: 0.05, side: THREE.DoubleSide }), false),
    glass: dress(new THREE.MeshPhysicalMaterial({ color: 0x1a2a30, metalness: 0, roughness: 0.03, transparent: true, opacity: 0.42, depthWrite: false, side: THREE.DoubleSide, envMapIntensity: 1.6 }), true),
    plain: new THREE.MeshPhysicalMaterial({ color: 0xd3d8de, metalness: 0.62, roughness: 0.3, clearcoat: 1, clearcoatRoughness: 0.05 }),
    black: std(0x0b0c0e, { metalness: 0.1, roughness: 0.75 }), chrome: std(0xe2e6ea, { metalness: 1, roughness: 0.08 }),
    tire: std(0x111315, { metalness: 0, roughness: 0.9 }), alloy: std(0xcfd5db, { metalness: 0.95, roughness: 0.22 }), disc: std(0x9aa1a9, { metalness: 0.9, roughness: 0.38 }),
    cabin: std(0x23272d, { metalness: 0.05, roughness: 0.85 }), seat: std(0x3a3f47, { metalness: 0, roughness: 0.9 }),
    m112: sysM(), boite: sysM(), freinage: sysM(), suspension: sysM(), direction: sysM(), 'elec-w203': sysM(), clim: sysM()
  };
  const uPanel = { value: 0 }, uSide = { value: 0 }, uOpen = { value: new THREE.Vector4(0, 0, 0, 0) };
  [M_.paint, M_.glass].forEach((m) => Object.assign(m.userData, { uLamp, uPanel, uSide, uOpen }));
  const HI = { m112: [M_.m112], boite: [M_.boite], freinage: [M_.freinage, M_.disc], suspension: [M_.suspension], direction: [M_.direction], 'elec-w203': [M_['elec-w203']], clim: [M_.clim], carrosserie: [M_.paint, M_.plain] };
  const car = new THREE.Group(); scene.add(car);
  const put = (geo, mat, part, order) => { const m = new THREE.Mesh(geo, mat); if (part) m.userData.part = part; if (order) m.renderOrder = order; car.add(m); return m; };
  const box = (w, h, d) => new THREE.BoxGeometry(w, h, d), cz = (r, len, seg, r2) => new THREE.CylinderGeometry(r2 == null ? r : r2, r, len, seg || 20).rotateX(Math.PI / 2), cx = (r, len, seg, r2) => new THREE.CylinderGeometry(r2 == null ? r : r2, r, len, seg || 20).rotateZ(Math.PI / 2), cy = (r, len, seg) => new THREE.CylinderGeometry(r, r, len, seg || 12);

  /* ---- Carrosserie et vitrages : une seule surface, deux matériaux complémentaires ---- */
  const bodyGeo = bodyGeometry();
  const body = put(bodyGeo, M_.paint, 'carrosserie', 4), glass = put(bodyGeo, M_.glass, 'carrosserie', 5);
  /* Ouvrants : la même surface, redessinée par panneau autour de sa charnière. */
  const panels = [];
  const panel = (id, side, hx, hy, hz, axis, angle, key) => {
    const g = new THREE.Group(); g.position.set(hx, hy, hz); car.add(g);
    [[M_.paint, 4], [M_.glass, 5]].forEach(([m, order]) => { if (m === M_.glass && id < 3) return; const mesh = new THREE.Mesh(bodyGeo, m); mesh.position.set(-hx, -hy, -hz); mesh.userData.part = 'carrosserie'; mesh.userData.name = key; mesh.renderOrder = order; mesh.frustumCulled = false;
      mesh.onBeforeRender = () => { uPanel.value = id; uSide.value = side; m.uniformsNeedUpdate = true; }; mesh.onAfterRender = () => { uPanel.value = 0; uSide.value = 0; m.uniformsNeedUpdate = true; }; mesh.visible = false; g.add(mesh); });
    panels.push({ g, id, axis, angle, t: 0, v: 0, h: [hx, hy, hz] });
  };
  panel(1, 0, 10.7, TOP(10.7) - 0.1, 0, 'z', 0.92, 'Capot'); panel(2, 0, -14.95, TOP(-14.95) - 0.1, 0, 'z', -1.15, 'Malle de coffre');
  [-1, 1].forEach((sd) => { panel(3, sd, 8.3, 0, sd * flank(8.3, 6), 'y', sd * 1.05, 'Porte avant'); panel(4, sd, -1.6, 0, sd * flank(-1.6, 6), 'y', sd * 1.0, 'Porte arrière'); });
  [body, glass].forEach((mesh) => { const m = mesh.material; mesh.onBeforeRender = () => { uPanel.value = 0; uSide.value = 0; m.uniformsNeedUpdate = true; }; });
  /* Accessoires de carrosserie : rétroviseurs, poignées, lèvres d'aile, étoile, sortie d'échappement. */
  const trimP = [], trimC = [], trimB = [];
  [-1, 1].forEach((s) => {
    trimP.push([new THREE.SphereGeometry(1, 18, 12), at(8.8, 9.9, s * (flank(8.6, 9.6) + 0.8), 0, s * 0.25, 0, 0.36, 0.56, 0.85)]);
    trimB.push([box(0.5, 0.3, 0.7), at(8.9, 9.6, s * (flank(8.6, 9.5) + 0.25))]);
    [[-0.1, 8.9], [-8.0, 9.05]].forEach(([x, y], i) => { const pn = panels[(s < 0 ? 2 : 4) + i], hd = new THREE.Mesh(box(1.25, 0.2, 0.2), M_.chrome); hd.position.set(x - pn.h[0], y - pn.h[1], s * (flank(x, y) + 0.06) - pn.h[2]); pn.g.add(hd); });
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
    [box(9.4, 2.9, 3.3), at(3.6, 4.2, 0)], [box(3.6, 0.4, 13.4), at(-13.4, 9.85, 0)], [box(0.5, 6.4, 14), at(-11.6, 6.2, 0, 0, 0, 0.35)], [box(7.4, 0.3, 12.6), at(-18, 4.9, 0)], [box(0.3, 3.6, 12.6), at(-21.6, 6.6, 0)], [box(0.5, 6.6, 14.4), at(10.4, 5.6, 0)]
  ]), M_.cabin, null, 1);

  /* ---- Organes : chaque pièce est nommée ; un seul maillage par système ---- */
  const WP = wheelParts(), wheels = [], steerPv = [];
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
    const front = x > 0, w = new THREE.Group(), pv = new THREE.Group(); pv.position.set(x, WR, s * TRACK); w.scale.z = s; pv.add(w); car.add(pv); wheels.push(w); if (front) steerPv.push(pv);
    w.add(new THREE.Mesh(WP.tire, M_.tire), new THREE.Mesh(WP.rim, M_.alloy), new THREE.Mesh(WP.dark, M_.black));
    const d = new THREE.Mesh(WP.disc, M_.disc); d.userData.part = 'freinage'; d.userData.name = front ? 'Disque de frein avant (ventilé)' : 'Disque de frein arrière'; w.add(d);
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
  Object.keys(S).forEach((k) => put(merge(S[k]), M_[k], k));
  /* Ombre au sol */
  const sh = document.createElement('canvas'); sh.width = 256; sh.height = 128; const g2 = sh.getContext('2d'); g2.filter = 'blur(14px)'; g2.fillStyle = 'rgba(0,0,0,.6)'; g2.beginPath(); g2.roundRect(34, 34, 188, 60, 26); g2.fill();
  const shadow = new THREE.Mesh(new THREE.PlaneGeometry(64, 32), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(sh), transparent: true, depthWrite: false })); shadow.rotation.x = -Math.PI / 2; shadow.position.y = 0.01; car.add(shadow);

  /* ---- Repères cliquables et commandes ---- */
  const mods = (window.W203 && window.W203.modules) || [], ui = el.querySelector('[data-ui]'), layer = document.createElement('div'); layer.className = 'hot3d'; host.appendChild(layer);
  const dots = SYS.map(([id, label, pos]) => { const b = document.createElement('button'); b.type = 'button'; b.className = 'hot3d-dot'; b.dataset.sys = id; b.setAttribute('aria-label', label); b.innerHTML = `<span>${label}</span>`; layer.appendChild(b); b.addEventListener('click', () => choose(id)); return { id, b, v: new THREE.Vector3(...pos) }; });
  const more = '<div class="vchips"><span class="viz-note">Maquettes détaillées</span>' + Object.keys(MAQ).flatMap((k) => MAQ[k]).map(([t, l]) => `<a class="vchip" href="#l-${l}">${t.replace(' en 3D', '')}</a>`).join('') + '<a class="vchip" href="#ref-schemas">Toutes</a></div>';
  const hint = '<p class="viz-note">Glisse pour tourner la voiture, pince pour zoomer. Touche un système : la carrosserie devient transparente. Touche ensuite une pièce pour connaître son nom.</p>';
  ui.innerHTML = `<div class="vchips" role="group" aria-label="Systèmes de la voiture">${SYS.map(([id, label]) => `<button class="vbtn sm" type="button" data-sys="${id}" aria-pressed="false">${label}</button>`).join('')}<label class="vtoggle"><input type="checkbox" data-xray><span class="vtrack" aria-hidden="true"></span>Radiographie</label></div><div class="vchips"><span class="viz-note">Ouvrir</span>${[['0', 'Capot'], ['d', 'Portes'], ['1', 'Coffre']].map(([k, t]) => `<label class="vtoggle"><input type="checkbox" data-open="${k}"><span class="vtrack" aria-hidden="true"></span>${t}</label>`).join('')}<span class="viz-note" style="margin-left:8px">Teinte</span>${PAINTS.map(([n, c], i) => `<button type="button" class="swatch3d${i ? '' : ' sel'}" data-paint="${i}" style="--c:#${c.toString(16).padStart(6, '0')}" aria-label="${n}" title="${n}"></button>`).join('')}</div><div class="hot3d-card" data-card aria-live="polite">${hint}</div>${more}`;
  ui.querySelectorAll('.vbtn[data-sys]').forEach((b) => b.addEventListener('click', () => choose(b.dataset.sys)));
  const xr = ui.querySelector('[data-xray]');
  ui.querySelectorAll('[data-open]').forEach((c) => c.addEventListener('change', () => { const k = c.dataset.open, on = c.checked ? 1 : 0; spin = false; if (k === 'd') panels.slice(2).forEach((pn) => { pn.t = on; }); else panels[+k].t = on; if (on) st.view(k === '1' ? 2.5 : 0.85, 0.42); st.refresh(); }));
  const setPaint = (i) => { const [, c, mt, r] = PAINTS[i] || PAINTS[0]; [M_.paint, M_.plain].forEach((m) => { m.color.setHex(c); m.metalness = mt; m.roughness = r; }); ui.querySelectorAll('[data-paint]').forEach((b) => b.classList.toggle('sel', +b.dataset.paint === i)); try { localStorage.setItem('w203-teinte', String(i)); } catch (e) { /* ignoré */ } st.refresh(); };
  ui.querySelectorAll('[data-paint]').forEach((b) => b.addEventListener('click', () => setPaint(+b.dataset.paint)));
  try { const sv = +localStorage.getItem('w203-teinte'); if (sv > 0 && PAINTS[sv]) setPaint(sv); } catch (e) { /* ignoré */ }
  let steer = 0;
  let sel = null, spin = !reduced(), pulse = 0, xray = 0, xrayT = 0, manual = false;
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
  st.onTap((ndc) => { ray.setFromCamera(ndc, st.camera); const hits = ray.intersectObjects(car.children, true).filter((h) => h.object.userData.part); if (!hits.length) return; const h = (xray > 0.5 && hits.find((x) => x.object.userData.part !== 'carrosserie')) || hits[0]; const o = h.object, piece = o.userData.name || nameAt(o.geometry, h.faceIndex); if (o.userData.part !== sel) choose(o.userData.part); const pc = ui.querySelector('[data-piece]'); if (pc) pc.innerHTML = piece ? 'Pièce touchée : <strong>' + piece + '</strong>' : ''; });
  st.canvas.addEventListener('pointerdown', () => { spin = false; });
  const p = new THREE.Vector3(); let wasSolid = null;
  st.onFrame((dt, real) => {
    if (spin) { st.orbit.taz += dt * 0.14; st.orbit.az = st.orbit.taz; wheels.forEach((w) => { w.rotation.z -= dt * 1.1 * w.scale.z; }); }
    pulse += real || 0.016;
    xray += (xrayT - xray) * (1 - Math.pow(0.003, real || 0.016)); if (Math.abs(xrayT - xray) < 0.004) xray = xrayT; if (reduced()) xray = xrayT;
    let moving = false; const kk = 1 - Math.pow(0.004, real || 0.016);
    panels.forEach((pn) => { pn.v += (pn.t - pn.v) * kk; if (Math.abs(pn.t - pn.v) < 0.003) pn.v = pn.t; else moving = true; if (reduced()) pn.v = pn.t; pn.g.rotation[pn.axis] = pn.angle * pn.v; const open = pn.v > 0.001; pn.g.children.forEach((ch) => { if (ch.onBeforeRender && ch.geometry === bodyGeo) ch.visible = open; }); });
    uOpen.value.set(panels[0].v > 0.001 ? 1 : 0, panels[1].v > 0.001 ? 1 : 0, panels[2].v > 0.001 ? 1 : 0, panels[3].v > 0.001 ? 1 : 0);
    const stT = sel === 'direction' && !reduced() ? 0.45 * Math.sin(pulse * 1.3) : 0; steer += (stT - steer) * kk; steerPv.forEach((pv) => { pv.rotation.y = steer; });
    const solid = xray < 0.01;
    if (solid !== wasSolid) { wasSolid = solid; M_.paint.transparent = !solid; M_.paint.depthWrite = solid; M_.paint.needsUpdate = true; [M_.cabin, M_.seat, M_.plain].forEach((m) => { m.transparent = !solid; m.depthWrite = solid; m.needsUpdate = true; }); body.renderOrder = solid ? 0 : 4; }
    M_.paint.opacity = 1 - 0.8 * xray; M_.glass.opacity = 0.42 - 0.3 * xray; M_.plain.opacity = 1 - 0.7 * xray; wells.visible = xray < 0.5; layer.style.opacity = xray.toFixed(2); layer.style.visibility = xray > 0.02 ? 'visible' : 'hidden';
    M_.cabin.opacity = M_.seat.opacity = 1 - 0.9 * xray;
    Object.keys(HI).forEach((k) => HI[k].forEach((m) => { if (k === sel) m.emissive.copy(accent).multiplyScalar((k === 'carrosserie' ? 0.16 : 0.3) + 0.14 * Math.sin(pulse * 4) * (k === 'carrosserie' ? 0.5 : 1)); else m.emissive.setHex(0); }));
    const w = host.clientWidth, h = host.clientHeight;
    dots.forEach((d) => { d.b.classList.toggle('sel', d.id === sel); p.copy(d.v).project(st.camera); d.b.style.transform = `translate(${((p.x + 1) / 2 * w).toFixed(1)}px,${((1 - p.y) / 2 * h).toFixed(1)}px)`; });
    return !!sel || xray !== xrayT || moving || Math.abs(steer) > 0.002;
  });
  st.refresh();
  return st;
}
