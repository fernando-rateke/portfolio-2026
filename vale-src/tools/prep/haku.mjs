// Separa do haku.glb só o que o Haku animado reaproveita: a cabeça (cortada do corpo no pescoço,
// com olhos, orelhas e chifres) e uma pata. O corpo, a crina e os bigodes são feitos à mão no vale.
// Uso (de dentro de tools/prep): node haku.mjs ../../modelos-fonte/haku.glb ../../../public/vale/modelos/haku-partes.glb
// Saída: nós "cabeca" (origem no centro do pescoço, focinho para +z) e "pata" (origem no ombro,
// braço para -y), em unidades do vale, cor por vértice em byte sem gama (o vale lê crua).
import { NodeIO, Document } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
const [src, dst] = process.argv.slice(2);
const doc = await new NodeIO().registerExtensions(ALL_EXTENSIONS).read(src);
const S = 38; // mesma escala do Haku antigo (15 de altura)
const tris = {}; // nome do nó -> lista de triângulos [{p,n}x3, cor]
for (const node of doc.getRoot().listNodes()) {
  const mesh = node.getMesh(); if (!mesh) continue; const M = node.getWorldMatrix(), out = (tris[node.getName()] = []);
  for (const pr of mesh.listPrimitives()) {
    const P = pr.getAttribute('POSITION'), N = pr.getAttribute('NORMAL'), I = pr.getIndices(), c = pr.getMaterial().getBaseColorFactor().slice(0, 3), a = [], n = [];
    const vert = (i) => { P.getElement(i, a); N.getElement(i, n);
      const nn = [M[0]*n[0]+M[4]*n[1]+M[8]*n[2], M[1]*n[0]+M[5]*n[1]+M[9]*n[2], M[2]*n[0]+M[6]*n[1]+M[10]*n[2]], l = Math.hypot(...nn) || 1;
      return { p: [M[0]*a[0]+M[4]*a[1]+M[8]*a[2]+M[12], M[1]*a[0]+M[5]*a[1]+M[9]*a[2]+M[13], M[2]*a[0]+M[6]*a[1]+M[10]*a[2]+M[14]], n: nn.map((v) => v / l) }; };
    const count = I ? I.getCount() : P.getCount();
    for (let k = 0; k < count; k += 3) out.push({ v: [0, 1, 2].map((j) => vert(I ? I.getScalar(k + j) : k + j)), c });
  }
}
const lerpV = (A, B, t) => { const n = A.n.map((v, i) => v + (B.n[i] - v) * t), l = Math.hypot(...n) || 1; return { p: A.p.map((v, i) => v + (B.p[i] - v) * t), n: n.map((v) => v / l) }; };
// corta os triângulos pelo meio-espaço f(p) >= 0
function clip(list, f) {
  const out = [];
  for (const t of list) {
    const d = t.v.map((v) => f(v.p)), poly = [];
    for (let i = 0; i < 3; i++) { const j = (i + 1) % 3; if (d[i] >= 0) poly.push(t.v[i]); if ((d[i] >= 0) !== (d[j] >= 0)) poly.push(lerpV(t.v[i], t.v[j], d[i] / (d[i] - d[j]))); }
    for (let i = 1; i + 1 < poly.length; i++) out.push({ v: [poly[0], poly[i], poly[i + 1]], c: t.c });
  }
  return out;
}
// componente ligado (por posição soldada) que contém o vértice que maximiza score
function component(list, score) {
  const key = (p) => p.map((v) => Math.round(v * 2e4)).join(','), id = new Map(), par = [];
  const find = (x) => { while (par[x] !== x) x = par[x] = par[par[x]]; return x; };
  const vid = (p) => { const k = key(p); if (!id.has(k)) { id.set(k, par.length); par.push(par.length); } return id.get(k); };
  let best = -1e9, seed = 0;
  const ids = list.map((t) => t.v.map((v) => { const i = vid(v.p), s = score(v.p); if (s > best) { best = s; seed = i; } return i; }));
  ids.forEach(([a, b, c]) => { par[find(a)] = find(b); par[find(c)] = find(b); });
  const root = find(seed); return list.filter((_, i) => find(ids[i][0]) === root);
}
/* ---- cabeça ---- */
const ZC = -0.046; // plano do pescoço (o focinho aponta para +z)
let head = component(clip(tris.polySurface4, (p) => p[2] - ZC), (p) => (p[1] > 0.18 ? p[2] : -1));
// borda do corte: centro do pescoço
const ring = []; head.forEach((t) => t.v.forEach((v) => { if (Math.abs(v.p[2] - ZC) < 1e-5) ring.push(v.p); }));
const cen = [0, 1, 2].map((i) => ring.reduce((s, p) => s + p[i], 0) / ring.length);
const rad = ring.reduce((s, p) => s + Math.hypot(p[0] - cen[0], p[1] - cen[1]), 0) / ring.length;
console.log('pescoço: centro', cen.map((v) => v.toFixed(4)), 'raio', (rad * S).toFixed(3), 'triângulos da cabeça', head.length);
for (const n of ['pSphere2', 'pSphere3', 'pCube3', 'pCube4', 'pCylinder2', 'pCylinder3']) head = head.concat(tris[n]);
const PITCH = +(process.env.PITCH || 0.7); // levanta o focinho (no modelo ele olha para baixo)
const cs = Math.cos(PITCH), sn = Math.sin(PITCH);
const rotX = (q) => [q[0], q[1] * cs + q[2] * sn, -q[1] * sn + q[2] * cs];
const headOut = head.map((t) => ({ c: t.c, v: t.v.map((v) => ({ p: rotX(v.p.map((x, i) => (x - cen[i]) * S)), n: rotX(v.n) })) }));
/* ---- pata: braço alinhado a -y, mão puxada para +z ---- */
function leg(name) {
  const L = tris[name], white = L.filter((t) => t.c[0] > 0.9), hand = L.filter((t) => t.c[0] <= 0.9);
  const mean = (l) => { const s = [0, 0, 0]; let n = 0; l.forEach((t) => t.v.forEach((v) => { s[0] += v.p[0]; s[1] += v.p[1]; s[2] += v.p[2]; n++; })); return s.map((v) => v / n); };
  const cw = mean(white), ch = mean(hand); let ax = ch.map((v, i) => v - cw[i]); const l = Math.hypot(...ax); ax = ax.map((v) => v / l);
  // ombro: ponto do braço mais longe da mão, ao longo do eixo
  let mn = 1e9; white.forEach((t) => t.v.forEach((v) => { const d = v.p.reduce((s, x, i) => s + (x - cw[i]) * ax[i], 0); if (d < mn) mn = d; }));
  const sh = cw.map((v, i) => v + ax[i] * mn);
  // base: y = -eixo; z = direção dos dedos (ponta mais distante da mão) tirando a parte do eixo
  let far = null, fd = -1; hand.forEach((t) => t.v.forEach((v) => { const r = v.p.map((x, i) => x - ch[i]), a = r.reduce((s, x, i) => s + x * ax[i], 0), per = r.map((x, i) => x - ax[i] * a), d = Math.hypot(...per); if (d > fd) { fd = d; far = per.map((x) => x / d); } }));
  const Y = ax.map((v) => -v), Z = far, X = [Y[1]*Z[2]-Y[2]*Z[1], Y[2]*Z[0]-Y[0]*Z[2], Y[0]*Z[1]-Y[1]*Z[0]];
  const tf = (q) => [q[0]*X[0]+q[1]*X[1]+q[2]*X[2], q[0]*Y[0]+q[1]*Y[1]+q[2]*Y[2], q[0]*Z[0]+q[1]*Z[1]+q[2]*Z[2]];
  return L.map((t) => ({ c: t.c, v: t.v.map((v) => ({ p: tf(v.p.map((x, i) => (x - sh[i]) * S)), n: tf(v.n) })) }));
}
/* ---- grava ---- */
const out = new Document(), buf = out.createBuffer(), mat = out.createMaterial('haku').setBaseColorFactor([1, 1, 1, 1]).setRoughnessFactor(1).setMetallicFactor(0), scene = out.createScene();
function put(name, list) {
  const n = list.length * 3, P = new Float32Array(n * 3), N = new Float32Array(n * 3), C = new Uint8Array(n * 3); let k = 0;
  for (const t of list) for (const v of t.v) { P.set(v.p, k * 3); N.set(v.n, k * 3); C.set(t.c.map((x) => Math.round(Math.min(1, x) * 255)), k * 3); k++; }
  const prim = out.createPrimitive().setMaterial(mat)
    .setAttribute('POSITION', out.createAccessor().setType('VEC3').setArray(P).setBuffer(buf))
    .setAttribute('NORMAL', out.createAccessor().setType('VEC3').setArray(N).setBuffer(buf))
    .setAttribute('COLOR_0', out.createAccessor().setType('VEC3').setArray(C).setNormalized(true).setBuffer(buf));
  scene.addChild(out.createNode(name).setMesh(out.createMesh(name).addPrimitive(prim)));
  console.log(name, list.length, 'triângulos');
}
put('cabeca', headOut);
put('pata', leg(process.env.LEG || 'pCube7'));
const { weld, quantize } = await import('@gltf-transform/functions');
await out.transform(weld(), quantize({ quantizePosition: 14, quantizeNormal: 8 }));
await new NodeIO().registerExtensions(ALL_EXTENSIONS).write(dst, out);
