// pinta um sculpt cinza com cores por vértice, por regiões em coordenadas normalizadas (0..1 na caixa do modelo)
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
const [, , input, output, which] = process.argv;
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);
const doc = await io.read(input); const root = doc.getRoot();
const hex = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16) / 255);
const ell = (u, v, cx, cy, rx, ry) => ((u - cx) / rx) ** 2 + ((v - cy) / ry) ** 2 < 1;
const PAINT = {
  totoro(u, n) {
    const front = n[2] > 0.12 && u[2] > 0.45;
    // olhos: branco com pupila preta
    for (const cx of [0.33, 0.655]) {
      if (front && ell(u[0], u[1], cx, 0.785, 0.024, 0.024)) return '#141416';
      if (front && ell(u[0], u[1], cx, 0.785, 0.055, 0.04)) return '#F4F1E8';
    }
    if (front && ell(u[0], u[1], 0.5, 0.832, 0.035, 0.014)) return '#1A1A1E'; // nariz
    if (u[1] > 0.875 && u[0] > 0.36 && u[0] < 0.62) return '#6E9A4C'; // a folha na cabeça
    // barriga clara com as marcas em V
    if (front && ell(u[0], u[1], 0.5, 0.3, 0.37, 0.34)) {
      const rows = [[0.585, [0.265, 0.43, 0.6, 0.765]], [0.485, [0.175, 0.335, 0.5, 0.665, 0.83]]];
      for (const [cy, xs] of rows) for (const cx of xs) { const dx = u[0] - cx; if (Math.abs(dx) < 0.07) { const y = cy + 0.018 - 3.2 * dx * dx; if (Math.abs(u[1] - y) < 0.016) return '#5C6370'; } }
      return '#E4DBC2';
    }
    if (u[1] < 0.035) return '#D9D0BA'; // garras dos pés
    return '#727B89';
  },
  // o mesmo Totoro, dormindo: pálpebras na cor do corpo (o risco do olho fechado é desenhado no vale)
  totoroDorme(u, n, p, c) {
    const front = n[2] > 0.12 && u[2] > 0.45;
    for (const cx of [0.33, 0.655]) {
      const dx = u[0] - cx;
      if (front && ell(u[0], u[1], cx, 0.785, 0.06, 0.045)) return '#6A7381';
    }
    return PAINT.totoro(u, n, p, c);
  },
  jiji(u, n) {
    const front = n[2] > 0.15;
    const jiji = u[0] < 0.36 || (u[0] < 0.4 && u[1] < 0.6);
    if (jiji) {
      for (const cx of [0.105, 0.275]) {
        if (front && ell(u[0], u[1], cx + 0.008, 0.733, 0.014, 0.03)) return '#101012';
        if (front && ell(u[0], u[1], cx, 0.735, 0.05, 0.046)) return '#F6F4EE';
      }
      return '#26262E';
    }
    for (const [cx, cy] of [[0.488, 0.648], [0.665, 0.635]]) {
      if (front && ell(u[0], u[1], cx, cy, 0.018, 0.026)) return '#141418';
      if (front && ell(u[0], u[1], cx, cy, 0.042, 0.048)) return '#6FA6D8';
    }
    if (front && ell(u[0], u[1], 0.585, 0.56, 0.022, 0.014)) return '#E49AA2'; // nariz
    if (front && (ell(u[0], u[1], 0.425, 0.73, 0.03, 0.05) || ell(u[0], u[1], 0.725, 0.755, 0.03, 0.05))) return '#EDB4B8'; // dentro das orelhas
    return '#F2EFE9';
  },
  catbus(u, n, p, c) {
    // u.z ~ 1 é a cabeça; olhos amarelos (faróis)
    const front = u[2] > 0.62;
    for (const [cx, cy, r] of [[0.13, 0.27, 0.06], [0.37, 0.355, 0.05]]) {
      if (front && n[2] > -0.2 && ell(u[0], u[1], cx, cy, r * 0.3, r * 0.45)) return '#1C140C';
      if (front && n[2] > -0.2 && ell(u[0], u[1], cx, cy, r, r * 1.1)) return '#FFD34E';
    }
    // por dentro das janelas: o interior escuro e peludo
    const out = [p[0] - c[0], 0, p[2] - c[2]]; const inward = (n[0] * out[0] + n[2] * out[2]) < 0;
    if (u[1] > 0.5 && u[1] < 0.84 && inward && Math.abs(n[1]) < 0.6) return '#6A4126';
    if (n[1] < -0.35 && u[1] < 0.5) return '#EBC98E'; // barriga
    if (u[1] < 0.06) return '#E8CFA0'; // patas
    // listras de gato malhado no dorso e no rabo
    const s = Math.sin(u[2] * 46 + u[1] * 6);
    if (n[1] > 0.2 && s > 0.55) return '#8C5A2A';
    return '#D39243';
  },
};
const fn = PAINT[which];
for (const node of root.listNodes()) {
  const mesh = node.getMesh(); if (!mesh) continue; const M = node.getWorldMatrix();
  const W = (a) => [M[0]*a[0]+M[4]*a[1]+M[8]*a[2]+M[12], M[1]*a[0]+M[5]*a[1]+M[9]*a[2]+M[13], M[2]*a[0]+M[6]*a[1]+M[10]*a[2]+M[14]];
  const Wn = (a) => { const v = [M[0]*a[0]+M[4]*a[1]+M[8]*a[2], M[1]*a[0]+M[5]*a[1]+M[9]*a[2], M[2]*a[0]+M[6]*a[1]+M[10]*a[2]]; const l = Math.hypot(...v) || 1; return v.map((x) => x / l); };
  // caixa do modelo inteiro
  const mn = [1e9, 1e9, 1e9], mx = [-1e9, -1e9, -1e9];
  for (const pr of mesh.listPrimitives()) { const P = pr.getAttribute('POSITION'), a = []; for (let i = 0; i < P.getCount(); i++) { const w = W(P.getElement(i, a)); for (let k = 0; k < 3; k++) { mn[k] = Math.min(mn[k], w[k]); mx[k] = Math.max(mx[k], w[k]); } } }
  const c = mn.map((v, k) => (v + mx[k]) / 2);
  for (const pr of mesh.listPrimitives()) {
    const P = pr.getAttribute('POSITION'), N = pr.getAttribute('NORMAL'), cnt = P.getCount(), col = new Uint8Array(cnt * 3), a = [], b = [];
    for (let i = 0; i < cnt; i++) {
      const p = W(P.getElement(i, a)), n = Wn(N.getElement(i, b)), u = p.map((v, k) => (v - mn[k]) / (mx[k] - mn[k]));
      const rgb = hex(fn(u, n, p, c)); // o vale lê a cor como está (mesmo espaço das cores do resto do vale)
      col.set(rgb.map((v) => Math.round(v * 255)), i * 3);
    }
    pr.setAttribute('COLOR_0', doc.createAccessor().setType("VEC3").setArray(col).setNormalized(true).setBuffer(root.listBuffers()[0]));
    const m = pr.getMaterial(); if (m) m.setBaseColorFactor([1, 1, 1, 1]).setRoughnessFactor(1).setMetallicFactor(0);
  }
}
await io.write(output, doc); console.log('ok', output);
