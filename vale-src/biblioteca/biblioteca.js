/* Biblioteca Infinita (v3): o tesseract. Salas octogonais numa malha que não acaba, em todas as direções.
   Cada parede tem uma porta: as das quinas dão em corredores na diagonal; as das faces, em rampas que sobem
   ou descem meio andar até outra sala, que tem mais corredores. O piso de vidro no meio mostra as salas de
   baixo, e o óculo do teto, as de cima. Dezesseis salas guardam o portfólio (as matérias, o curso técnico,
   a jornada, os certificados e o fim); o resto é biblioteca sem fim, sumindo na névoa.
   A câmera desliza devagar pelos corredores e quase nada fica por cima da tela.
   O controle pelo celular fala com window.biblioteca. */
(() => {
  const T = window.THREE;
  if (!T) return;
  const $ = (id) => document.getElementById(id);
  const canvas = $("lib");
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const small = matchMedia("(max-width: 760px)").matches || (navigator.hardwareConcurrency || 8) <= 4;

  let renderer;
  try { renderer = new T.WebGLRenderer({ canvas, antialias: false, powerPreference: "high-performance" }); }
  catch (e) { $("fade").innerHTML = "<p>Este navegador não abre a biblioteca em 3D</p>"; return; }
  const DPR = Math.min(window.devicePixelRatio || 1, small ? 1.25 : 1.75);
  renderer.setPixelRatio(DPR);
  const scene = new T.Scene();
  scene.background = new T.Color("#070504");
  const camera = new T.PerspectiveCamera(62, 1, 0.05, 220);

  /* ---------------- medidas do tesseract ---------------- */
  const LS = 22, HS = 3.5;                              // malha: distância entre salas no plano, e meio andar
  const AP = 7, RH = 6, OC = 2.0;                        // sala octogonal: apótema, altura, raio do óculo de vidro
  const FS = 2 * AP * Math.tan(Math.PI / 8);             // lado do octógono
  const DW = 2.6, DH = 3.2, CW = 2.8, CH = 3.2;          // porta e corredor
  const LD = LS * Math.SQRT2 - 2 * AP, LR = LS - 2 * AP;  // corredor diagonal; rampa (medida no chão)
  const EYE = 1.7, ROW = 0.6, BASE = 0.25;
  const NRH = small ? 1 : 2, NV = small ? 2 : 3;          // quantas salas em volta ficam montadas
  const NL = 16;
  const U = {
    uTime: { value: 0 }, uS: { value: LS },
    uFog: { value: new T.Color("#0b0806") }, uFogD: { value: small ? 0.04 : 0.036 },
    uAmb: { value: new T.Vector3(0.05, 0.042, 0.034) },
    uLP: { value: Array.from({ length: NL }, () => new T.Vector3(0, -999, 0)) },
    uLC: { value: Array.from({ length: NL }, () => new T.Vector3()) },
  };

  /* luz e névoa comuns a tudo */
  const COMMON = `
    uniform float uTime, uS, uFogD; uniform vec3 uFog, uAmb;
    uniform vec3 uLP[${NL}]; uniform vec3 uLC[${NL}];
    float h1(float n){ return fract(sin(n) * 43758.5453123); }
    float h2(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123); }
    float h3(vec3 p){ return fract(sin(dot(p, vec3(17.1, 113.3, 57.7))) * 43758.5453); }
    float vnoise(vec3 p){ vec3 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
      return mix(mix(mix(h3(i), h3(i + vec3(1,0,0)), f.x), mix(h3(i + vec3(0,1,0)), h3(i + vec3(1,1,0)), f.x), f.y),
                 mix(mix(h3(i + vec3(0,0,1)), h3(i + vec3(1,0,1)), f.x), mix(h3(i + vec3(0,1,1)), h3(i + vec3(1,1,1)), f.x), f.y), f.z); }
    vec3 scat;
    vec3 lights(vec3 w, vec3 n){
      vec3 acc = uAmb; scat = vec3(0.0);
      for (int i = 0; i < ${NL}; i++) {
        vec3 d = uLP[i] - w; float dd = dot(d, d) + 0.05; float inv = inversesqrt(dd);
        float ndl = max(dot(n, d * inv), 0.0) * 0.8 + 0.2;
        acc += uLC[i] * ndl / (1.0 + dd * 0.16);
        scat += uLC[i] / (1.0 + dd * 0.045);
      }
      { vec2 l = mod(w.xz + uS * 0.5, uS) - uS * 0.5; float r = length(l); acc += vec3(0.30, 0.36, 0.50) * 0.24 * exp(-r * 0.5) * (0.5 + 0.5 * n.y * n.y); } // a luz fria que desce pelos óculos
      return acc;
    }
    vec3 band(vec3 l){ return mix(l, floor(l * 7.0 + 0.5) / 7.0, 0.18); }
    vec3 fogIt(vec3 c, vec3 w){
      float d = length(w - cameraPosition);
      float hf = 0.6 + 0.8 * exp(-max(w.y, 0.0) * 0.08);
      float nz = vnoise(w * 0.13 + vec3(uTime * 0.035, -uTime * 0.02, uTime * 0.028));
      float f = 1.0 - exp(-pow(d * uFogD * hf * (0.7 + 0.6 * nz), 1.22));
      return mix(c, uFog + scat * 0.03, f);
    }`;
  const VS = (decl = "", body = "") => `
    attribute vec3 aCol; attribute float aKind; ${decl}
    varying vec3 vW; varying vec3 vN; varying vec3 vC; varying float vK; varying vec3 vO;
    void main(){
      mat4 m = modelMatrix;
      #ifdef USE_INSTANCING
        m = modelMatrix * instanceMatrix;
      #endif
      vec4 w = m * vec4(position, 1.0); vW = w.xyz; vN = normalize(mat3(m) * normal); vC = aCol; vK = aKind; vO = (m * vec4(0.0, 0.0, 0.0, 1.0)).xyz;
      ${body}
      gl_Position = projectionMatrix * viewMatrix * w;
    }`;

  /* estrutura: madeira, piso de tábuas, tapete nas salas, teto em caixotões, lâmpadas */
  const STRUCT_FS = `${COMMON}
    varying vec3 vW; varying vec3 vN; varying vec3 vC; varying float vK; varying vec3 vO;
    void main(){
      vec3 n = normalize(vN); vec3 c = vC;
      if (vK > 2.5) { gl_FragColor = vec4(fogIt(c * 1.7, vW), 1.0); return; }
      if (vK > 0.5 && vK < 1.5) {
        float pz = vW.z / 0.24; float row = floor(pz); float px = (vW.x + h1(row) * 3.0) / 1.9;
        float seam = smoothstep(0.0, 0.05, fract(pz)) * smoothstep(0.0, 0.02, fract(px));
        c *= (0.8 + 0.3 * h2(vec2(row, floor(px)))) * (0.55 + 0.45 * seam);
      } else if (vK > 1.5) {
        vec2 q = fract(vec2(vW.x, vW.z) / 1.4); float e = min(min(q.x, 1.0 - q.x), min(q.y, 1.0 - q.y));
        c *= 0.6 + 0.4 * smoothstep(0.02, 0.09, e);
      }
      vec3 lit = band(lights(vW, n));
      gl_FragColor = vec4(fogIt(c * lit, vW), 1.0);
    }`;

  /* estantes: os livros desenhados no shader */
  const BOOK_FS = `${COMMON}
    varying vec3 vW; varying vec3 vN; varying vec3 vC; varying float vK; varying vec3 vO; varying vec2 vUv; varying float vTop;
    vec3 pal(float t){
      vec3 c = vec3(0.47, 0.16, 0.13);
      if (t > 0.10) c = vec3(0.34, 0.11, 0.10); if (t > 0.20) c = vec3(0.17, 0.28, 0.20); if (t > 0.30) c = vec3(0.14, 0.22, 0.34);
      if (t > 0.40) c = vec3(0.63, 0.45, 0.18); if (t > 0.50) c = vec3(0.40, 0.28, 0.17); if (t > 0.60) c = vec3(0.17, 0.34, 0.34);
      if (t > 0.70) c = vec3(0.29, 0.17, 0.27); if (t > 0.80) c = vec3(0.76, 0.68, 0.52); if (t > 0.90) c = vec3(0.12, 0.11, 0.10);
      return c;
    }
    void main(){
      vec3 n = normalize(vN); float u = vUv.x, v = vUv.y;
      float seed = vK * 3.17 + h3(floor(vO / 3.5 + 0.5)) * 97.0;
      vec3 wood = vec3(0.30, 0.19, 0.12), woodD = vec3(0.16, 0.10, 0.07);
      vec3 c; float spec = 0.0;
      float post = 1.0 - smoothstep(0.035, 0.045, abs(fract(u / 1.25 + 0.5) - 0.5) * 1.25);
      if (v < BASE_) c = woodD * (0.8 + 0.2 * smoothstep(0.0, 0.06, BASE_ - v));
      else if (v > vTop) c = wood * (0.78 + 0.15 * smoothstep(0.02, 0.06, v - vTop)) * (0.9 + 0.1 * step(0.5, fract(u / 1.25)));
      else {
        float rv = v - BASE_; float row = floor(rv / ROW_); rv -= row * ROW_;
        float board = 1.0 - smoothstep(0.035, 0.045, rv);
        float cell = 0.034; float ci = floor(u / cell); float rs = row + seed * 7.0;
        float st = ci; for (int k = 0; k < 6; k++) { if (h2(vec2(st, rs)) > 0.58) break; st -= 1.0; }
        float en = ci + 1.0; for (int k = 0; k < 6; k++) { if (h2(vec2(en, rs)) > 0.58) break; en += 1.0; }
        float bid = st + rs * 131.0; float bx = (u - st * cell) / ((en - st) * cell);
        float bh = ROW_ * (0.58 + 0.33 * h1(bid * 1.7)); bool empty = h1(bid * 5.31) < 0.05;
        vec3 back = woodD * 0.38 * (0.6 + 0.4 * smoothstep(0.0, ROW_, rv));
        if (rv < 0.045) { c = wood * 1.05; spec = 0.25; }
        else if (empty || rv > bh) { c = back; if (rv > bh && rv < bh + 0.03 && !empty) c *= 0.6; }
        else {
          vec3 bc = pal(h1(bid * 2.3)) * (0.78 + 0.32 * h1(bid * 9.1));
          float sh = 0.62 + 0.38 * sin(clamp(bx, 0.0, 1.0) * 3.14159);
          float gap = smoothstep(0.0, 0.07, bx) * smoothstep(0.0, 0.07, 1.0 - bx);
          float rel = (rv - 0.045) / (bh - 0.045); float gold = 0.0;
          if (h1(bid * 3.1) > 0.35) gold += (1.0 - smoothstep(0.006, 0.012, abs(rel - 0.12))) + (1.0 - smoothstep(0.006, 0.012, abs(rel - 0.88)));
          if (h1(bid * 4.7) > 0.7) gold += (1.0 - smoothstep(0.004, 0.009, abs(rel - 0.2)));
          float label = step(0.62, rel) * step(rel, 0.74) * step(0.18, bx) * step(bx, 0.82) * step(0.55, h1(bid * 6.2));
          bc = mix(bc, vec3(0.84, 0.77, 0.6), label * 0.85); bc = mix(bc, vec3(0.86, 0.64, 0.28), clamp(gold, 0.0, 1.0) * 0.9);
          spec = clamp(gold, 0.0, 1.0) * 0.6; c = bc * sh * (0.35 + 0.65 * gap) * (0.82 + 0.18 * smoothstep(0.0, 0.08, rel));
        }
        c = mix(c, wood * 0.9, post);
        float aa = clamp(fwidth(u) / cell - 0.6, 0.0, 1.0);
        c = mix(c, mix(vec3(0.24, 0.15, 0.11), wood, board), aa);
      }
      vec3 lit = band(lights(vW, n)); vec3 V = normalize(cameraPosition - vW);
      vec3 col = c * lit + spec * vec3(1.0, 0.8, 0.5) * pow(max(dot(n, V), 0.0), 2.0) * lit * 0.35;
      gl_FragColor = vec4(fogIt(col, vW), 1.0);
    }`.replace(/BASE_/g, BASE.toFixed(3)).replace(/ROW_/g, ROW.toFixed(3));

  const mkMat = (fs, decl = "", body = "") => { const m = new T.ShaderMaterial({ uniforms: U, vertexShader: VS(decl, body), fragmentShader: fs, side: T.DoubleSide }); m.extensions = { derivatives: true }; return m; };
  const structMat = mkMat(STRUCT_FS);
  const bookMat = mkMat(BOOK_FS, "attribute vec2 aUv; attribute float aTop; varying vec2 vUv; varying float vTop;", "vUv = aUv; vTop = aTop;");
  /* objetos (GLB): textura + as mesmas luzes e névoa */
  const PROP_VS = `varying vec3 vW; varying vec3 vN; varying vec2 vUv; void main(){ vUv = uv; vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; vN = normalize(mat3(modelMatrix) * normal); gl_Position = projectionMatrix * viewMatrix * w; }`;
  const PROP_FS = `${COMMON} uniform sampler2D map; uniform float uHasMap, uEmit, uHot, uCut, uAlpha; uniform vec3 uTint, uEmitC; varying vec3 vW; varying vec3 vN; varying vec2 vUv;
    void main(){
      vec4 tx = uHasMap > 0.5 ? texture2D(map, vUv) : vec4(1.0);
      if (tx.a < uCut) discard;
      vec3 n = normalize(vN); if (!gl_FrontFacing) n = -n;
      vec3 c = tx.rgb * uTint;
      vec3 lit = band(lights(vW, n));
      vec3 V = normalize(cameraPosition - vW); float rim = pow(1.0 - max(dot(n, V), 0.0), 3.0);
      vec3 col = c * lit * (1.0 + uHot * 0.16) + c * uEmitC * uEmit + rim * scat * 0.05 + vec3(1.0, 0.8, 0.45) * rim * uHot * 0.7;
      float al = uAlpha;
      if (uAlpha < 0.99) { col = c * lit * 0.35 + vec3(1.0, 0.85, 0.6) * rim * 0.35; al = uAlpha * 0.45 + rim * 0.4; } // vidro: quase transparente, brilha nas bordas
      gl_FragColor = vec4(fogIt(col, vW), al);
    }`;
  const propMats = new Map();
  function propize(root, o = {}) {
    root.traverse((m) => {
      if (!m.isMesh) return;
      if (!m.geometry.attributes.normal) m.geometry.computeVertexNormals(); // alguns modelos vieram sem normais (ficavam pretos)
      const src = m.material, key = src.uuid + JSON.stringify(o);
      let mm = propMats.get(key);
      if (!mm) {
        if (src.map) src.map.encoding = T.LinearEncoding;
        mm = new T.ShaderMaterial({
          uniforms: Object.assign({ map: { value: src.map || null }, uHasMap: { value: src.map ? 1 : 0 }, uTint: { value: new T.Color(o.tint || "#ffffff").multiply(src.color || new T.Color(1, 1, 1)) },
            uEmit: { value: o.emit || 0 }, uEmitC: { value: new T.Color(o.emitC || "#ffb060") }, uHot: { value: 0 }, uCut: { value: src.alphaTest || (src.transparent && src.map ? 0.45 : 0) }, uAlpha: { value: src.transparent && !src.map ? Math.max(0.12, src.opacity) : 1 } }, U),
          vertexShader: PROP_VS, fragmentShader: PROP_FS, side: T.DoubleSide,
        });
        if (src.transparent && !src.map) { mm.transparent = true; mm.depthWrite = false; }
        mm.extensions = { derivatives: true };
        propMats.set(key, mm);
      }
      m.material = mm;
    });
    return root;
  }
  const loader = T.GLTFLoader ? new T.GLTFLoader() : null;
  const queue = []; let busy = 0; const cache = new Map();
  function prop(file, cb, prio = 5) { if (!loader) return; queue.push({ file, cb, prio }); queue.sort((a, b) => a.prio - b.prio); setTimeout(pump, 0); }
  // três downloads ao mesmo tempo; o mesmo arquivo pedido duas vezes baixa uma vez só
  function pump() {
    while (busy < 3 && queue.length) {
      const { file, cb } = queue.shift(); busy++;
      if (!cache.has(file)) cache.set(file, new Promise((ok) => loader.load("/biblioteca/modelos/" + file + ".glb", (g) => ok(g.scene), undefined, () => ok(null))));
      cache.get(file).then((sc) => { if (sc) { try { cb(sc.clone(true)); } catch (e) { console.warn("objeto", file, e); } } busy--; pump(); });
    }
  }
  // coloca um objeto: escala pela maior medida (ou altura), apoia no chão, centraliza
  function place(root, { at, h, size, ry = 0, rx = 0, tint, emit, emitC, parent = scene, axis = "y", rot, stretch, drop }) {
    if (drop) root.traverse((o) => { if (o.isMesh && drop(o)) o.visible = false; });
    propize(root, { tint, emit, emitC });
    if (rot) root.rotation.set(rot[0], rot[1], rot[2]);
    root.updateMatrixWorld(true);
    const box = new T.Box3(); root.traverse((o) => { if (o.isMesh && o.visible) { o.geometry.computeBoundingBox(); box.union(o.geometry.boundingBox.clone().applyMatrix4(o.matrixWorld)); } });
    const sz = box.getSize(new T.Vector3());
    const s = h ? h / sz[axis] : size ? size / Math.max(sz.x, sz.y, sz.z) : 1;
    const g = new T.Group(); root.scale.multiplyScalar(s); root.position.set(-(box.min.x + box.max.x) / 2 * s, -box.min.y * s, -(box.min.z + box.max.z) / 2 * s);
    g.add(root); g.position.copy(at); g.rotation.set(rx, ry, 0); if (stretch) g.scale.set(stretch[0], stretch[1], stretch[2]); parent.add(g); g.userData.size = sz.multiplyScalar(s); return g;
  }
  // um material só deste objeto (para brilhar quando o cursor passa por cima sem acender os outros)
  function ownMats(g) {
    const list = [];
    g.traverse((o) => { if (!o.isMesh || !o.material.uniforms || !o.material.uniforms.uHot) return; const m = o.material, un = {};
      for (const k in m.uniforms) { const v = m.uniforms[k].value; un[k] = k in U ? U[k] : { value: v && v.clone && !v.isTexture ? v.clone() : v }; }
      const nm = new T.ShaderMaterial({ uniforms: un, vertexShader: m.vertexShader, fragmentShader: m.fragmentShader, side: m.side, transparent: m.transparent }); nm.extensions = m.extensions; o.material = nm; list.push(nm); });
    return list;
  }

  const M = (x = 0, y = 0, z = 0, ry = 0, sx = 1, sy = 1, sz = 1, rx = 0, rz = 0) => new T.Matrix4().compose(new T.Vector3(x, y, z), new T.Quaternion().setFromEuler(new T.Euler(rx, ry, rz)), new T.Vector3(sx, sy, sz));
  const alignX = (dx, dz) => Math.atan2(-dz, dx);
  function Builder() {
    const P = [], N = [], Cc = [], K = [], UV = [], TOP = [];
    return {
      add(geo, m, color, kind = 0) {
        const g = geo.index ? geo.toNonIndexed() : geo.clone(); g.applyMatrix4(m);
        const p = g.attributes.position, n = g.attributes.normal, c = new T.Color(color);
        for (let i = 0; i < p.count; i++) { P.push(p.getX(i), p.getY(i), p.getZ(i)); N.push(n.getX(i), n.getY(i), n.getZ(i)); Cc.push(c.r, c.g, c.b); K.push(kind); UV.push(0, 0); TOP.push(0); }
      },
      // estante: de (x0,z0) na direção (tx,tz), virada para (nx,nz); y0 é o chão daquele andar
      wall(x0, z0, tx, tz, nx, nz, len, y0, y1, u0, seed, top, yb = 0) {
        const q = [[0, y0], [len, y0], [len, y1], [0, y0], [len, y1], [0, y1]];
        for (const [s, y] of q) { P.push(x0 + tx * s, y, z0 + tz * s); N.push(nx, 0, nz); Cc.push(1, 1, 1); K.push(seed); UV.push(u0 + s, y - yb); TOP.push(top); }
      },
      build() {
        const g = new T.BufferGeometry();
        g.setAttribute("position", new T.Float32BufferAttribute(P, 3)); g.setAttribute("normal", new T.Float32BufferAttribute(N, 3));
        g.setAttribute("aCol", new T.Float32BufferAttribute(Cc, 3)); g.setAttribute("aKind", new T.Float32BufferAttribute(K, 1));
        g.setAttribute("aUv", new T.Float32BufferAttribute(UV, 2)); g.setAttribute("aTop", new T.Float32BufferAttribute(TOP, 1));
        g.computeBoundingSphere(); return g;
      },
    };
  }
  const WOOD = "#5A3A26", WOOD_D = "#3A251A", GOLD = "#B88A40", FLOOR = "#5E412D", CEILC = "#36261C";
  const V3 = (x, y, z) => new T.Vector3(x, y, z);

  /* ---------------- a malha ---------------- */
  // oito faces: as pares (0, 2, 4, 6) são rampas (0 e 2 sobem, 4 e 6 descem); as ímpares, corredores na diagonal
  const FACE = [0, 1, 2, 3, 4, 5, 6, 7].map((m) => { const a = m * Math.PI / 4, c = Math.cos(a), s = Math.sin(a); return { m, a, c, s, tx: -s, tz: c, ramp: m % 2 === 0, up: m === 0 || m === 2 }; });
  const STEP = [[1, 1, 0], [1, 0, 1], [0, 1, 1], [-1, 0, 1], [-1, -1, 0], [-1, 0, -1], [0, -1, -1], [1, 0, -1]];
  const par = (i, j, k) => ((((i + j + k) % 2) + 2) % 2) === 0;
  const key = (n) => n.join(",");
  const nodePos = (n) => V3(n[0] * LS, n[1] * HS, n[2] * LS);
  const neighbor = (n, m) => [n[0] + STEP[m][0], n[1] + STEP[m][1], n[2] + STEP[m][2]];
  const faceDir = (m) => V3(FACE[m].c, 0, FACE[m].s);
  const ryFront = (m) => Math.atan2(-FACE[m].c, -FACE[m].s);   // +z local olhando para dentro da sala
  const ryX = (m) => Math.atan2(FACE[m].s, -FACE[m].c);        // +x local olhando para dentro da sala
  const faceTo = (x, z, tx, tz) => Math.atan2(tx - x, tz - z);

  // a sala: chão e teto com o óculo, estantes nas oito faces, uma porta em cada, colunas e lâmpadas nas quinas
  const oct = (rIn) => { const s = new T.Shape(), R = rIn / Math.cos(Math.PI / 8); for (let k = 0; k < 8; k++) { const a = (k + 0.5) * Math.PI / 4, x = R * Math.cos(a), y = R * Math.sin(a); if (k) s.lineTo(x, y); else s.moveTo(x, y); } s.closePath(); return s; };
  const RB = Builder(), RWb = Builder(), LAMPS = [];
  {
    const ring = oct(AP + 0.05), hole = new T.Path(); hole.absarc(0, 0, OC, 0, Math.PI * 2, true); ring.holes.push(hole);
    const fg = new T.ShapeGeometry(ring, 40); fg.rotateX(-Math.PI / 2); RB.add(fg, M(), FLOOR, 1);
    const cg = new T.ShapeGeometry(ring, 40); cg.rotateX(Math.PI / 2); RB.add(cg, M(0, RH, 0), CEILC, 2);
    RB.add(new T.CylinderGeometry(OC, OC, 2 * HS - RH, 40, 1, true), M(0, (RH + 2 * HS) / 2, 0), WOOD_D, 0);
    for (const y of [0.02, RH - 0.02]) { const tg = new T.TorusGeometry(OC, 0.05, 8, 56); tg.rotateX(Math.PI / 2); RB.add(tg, M(0, y, 0), GOLD, 0); }
    for (const f of FACE) {
      const cx = AP * f.c, cz = AP * f.s, nx = -f.c, nz = -f.s, tx = f.tx, tz = f.tz, ry = alignX(tx, tz);
      const half = DW / 2 + 0.14, seg = FS / 2 - half;
      RWb.wall(cx - tx * FS / 2, cz - tz * FS / 2, tx, tz, nx, nz, seg, 0, RH, 0, f.m + 0.5, RH - 0.55);
      RWb.wall(cx + tx * half, cz + tz * half, tx, tz, nx, nz, seg, 0, RH, FS - seg, f.m + 0.7, RH - 0.55);
      RWb.wall(cx - tx * half, cz - tz * half, tx, tz, nx, nz, 2 * half, DH + 0.34, RH, seg, f.m + 0.9, RH - 0.55 - DH - 0.34, DH + 0.34);
      for (const sg of [-1, 1]) RB.add(new T.BoxGeometry(0.26, DH + 0.34, 0.56), M(cx + tx * sg * (DW / 2 + 0.07), (DH + 0.34) / 2, cz + tz * sg * (DW / 2 + 0.07), ry), WOOD, 0);
      RB.add(new T.BoxGeometry(DW + 0.54, 0.32, 0.58), M(cx, DH + 0.16, cz, ry), WOOD, 0);
      RB.add(new T.BoxGeometry(DW + 0.56, 0.04, 0.6), M(cx, DH + 0.33, cz, ry), GOLD, 0);
      RB.add(new T.BoxGeometry(FS + 0.12, 0.16, 0.32), M(cx + nx * 0.14, RH - 0.5, cz + nz * 0.14, ry), WOOD, 0);
      RB.add(new T.BoxGeometry(FS + 0.12, 0.03, 0.34), M(cx + nx * 0.14, RH - 0.41, cz + nz * 0.14, ry), GOLD, 0);
      const va = f.a + Math.PI / 8, vr = AP / Math.cos(Math.PI / 8) - 0.2, vx = vr * Math.cos(va), vz = vr * Math.sin(va);
      RB.add(new T.BoxGeometry(0.44, RH, 0.44), M(vx, RH / 2, vz, -va), WOOD_D, 0);
      RB.add(new T.BoxGeometry(0.58, 0.18, 0.58), M(vx, RH - 0.22, vz, -va), GOLD, 0);
      if (f.m % 2 === 0) {
        const lr = vr - 0.45; LAMPS.push(V3(lr * Math.cos(va), 3.7, lr * Math.sin(va)));
        RB.add(new T.SphereGeometry(0.17, 12, 8), M(lr * Math.cos(va), 3.7, lr * Math.sin(va)), "#FFC06A", 3);
        RB.add(new T.CylinderGeometry(0.09, 0.14, 0.07, 10), M(lr * Math.cos(va), 3.9, lr * Math.sin(va)), GOLD, 0);
        RB.add(new T.BoxGeometry(0.42, 0.05, 0.05), M((vr - 0.24) * Math.cos(va), 3.92, (vr - 0.24) * Math.sin(va), -va), GOLD, 0);
      }
    }
  }
  // o corredor na diagonal (ao longo de +x local, da porta de uma sala à porta da outra)
  const DB = Builder(), DWb = Builder();
  {
    const fl = new T.PlaneGeometry(LD, CW); fl.rotateX(-Math.PI / 2); DB.add(fl, M(LD / 2, 0.003, 0), FLOOR, 1);
    const ce = new T.PlaneGeometry(LD, CW); ce.rotateX(Math.PI / 2); DB.add(ce, M(LD / 2, CH, 0), CEILC, 2);
    DWb.wall(0, -CW / 2, 1, 0, 0, 1, LD, 0, CH, 0, 11.5, CH - 0.45);
    DWb.wall(0, CW / 2, 1, 0, 0, -1, LD, 0, CH, 0, 12.5, CH - 0.45);
    const n = Math.round(LD / 3.4);
    for (let q = 1; q < n; q++) { const x = LD * q / n; for (const sz of [-1, 1]) DB.add(new T.BoxGeometry(0.22, CH, 0.2), M(x, CH / 2, sz * (CW / 2 - 0.07)), WOOD_D, 0); DB.add(new T.BoxGeometry(0.24, 0.24, CW), M(x, CH - 0.12, 0), WOOD, 0); DB.add(new T.BoxGeometry(0.25, 0.03, CW), M(x, CH - 0.25, 0), GOLD, 0); }
    DB.add(new T.SphereGeometry(0.15, 12, 8), M(LD / 2, CH - 0.42, 0), "#FFC06A", 3);
    DB.add(new T.CylinderGeometry(0.012, 0.012, 0.3, 4), M(LD / 2, CH - 0.2, 0), WOOD_D, 0);
  }
  // a rampa (degraus), subindo meio andar ao longo de +x local; as estantes sobem em degraus junto
  const PB = Builder(), PWb = Builder(), NSTEP = 10, RUN = LR / NSTEP, RISE = HS / NSTEP;
  {
    for (let q = 0; q < NSTEP; q++) {
      PB.add(new T.BoxGeometry(RUN + 0.01, RISE * (q + 1), CW), M(RUN * (q + 0.5), RISE * (q + 1) / 2, 0), FLOOR, 1);
      const y0 = RISE * (q + 1);
      PWb.wall(RUN * q, -CW / 2, 1, 0, 0, 1, RUN, y0, y0 + CH + RISE, RUN * q, 13.5, CH - 0.45, y0);
      PWb.wall(RUN * q, CW / 2, 1, 0, 0, -1, RUN, y0, y0 + CH + RISE, RUN * q, 14.5, CH - 0.45, y0);
      if (q % 3 === 1) { for (const sz of [-1, 1]) PB.add(new T.BoxGeometry(0.22, CH, 0.2), M(RUN * (q + 0.5), y0 + CH / 2, sz * (CW / 2 - 0.07)), WOOD_D, 0); }
    }
    const cl = Math.hypot(LR, HS), pg = new T.PlaneGeometry(cl, CW); pg.rotateX(Math.PI / 2);
    PB.add(pg, M(LR / 2, CH + HS / 2, 0, 0, 1, 1, 1, 0, Math.atan2(HS, LR)), CEILC, 2);
    PB.add(new T.SphereGeometry(0.15, 12, 8), M(LR / 2, HS / 2 + CH - 0.4, 0), "#FFC06A", 3);
  }
  const lampDiag = V3(LD / 2, CH - 0.42, 0), lampRamp = V3(LR / 2, HS / 2 + CH - 0.4, 0);

  // o vidro do óculo: quase invisível, com uma rosa dos ventos gravada em ouro
  const GLASS_FS = `${COMMON}
    varying vec3 vW; varying vec3 vN; varying vec3 vC; varying float vK; varying vec3 vO;
    void main(){
      vec3 V = normalize(cameraPosition - vW); float fr = pow(1.0 - abs(dot(normalize(vN), V)), 2.0);
      vec2 l = vW.xz - vO.xz; float r = length(l), a = atan(l.y, l.x);
      float ring = 0.0; for (int i = 0; i < 3; i++) { float rr = 0.7 + float(i) * 0.6; ring += 1.0 - smoothstep(0.006, 0.018, abs(r - rr)); }
      float rad = (1.0 - smoothstep(0.004, 0.016, abs(sin(a * 4.0)) * r)) * step(0.25, r);
      float e = clamp(ring + rad * 0.7, 0.0, 1.0);
      vec3 lit = lights(vW, vec3(0.0, 1.0, 0.0));
      vec3 col = vec3(0.55, 0.68, 0.82) * (0.04 + fr * 0.3) + vec3(1.0, 0.78, 0.42) * e * (0.25 + lit * 0.3);
      gl_FragColor = vec4(fogIt(col, vW), 0.06 + fr * 0.3 + e * 0.4);
    }`;
  const glassMat = new T.ShaderMaterial({ uniforms: U, vertexShader: VS(), fragmentShader: GLASS_FS, transparent: true, depthWrite: false, side: T.DoubleSide });
  const glassGeo = new T.CircleGeometry(OC, 56); glassGeo.rotateX(-Math.PI / 2); glassGeo.translate(0, 0.01, 0);

  const NMAX = (2 * NRH + 1) * (2 * NRH + 1) * (2 * NV + 1);
  const inst = (geo, mat, n) => { const m = new T.InstancedMesh(geo, mat, n); m.frustumCulled = false; m.count = 0; scene.add(m); return m; };
  const roomS = inst(RB.build(), structMat, NMAX), roomW = inst(RWb.build(), bookMat, NMAX);
  const diagS = inst(DB.build(), structMat, 2 * NMAX), diagW = inst(DWb.build(), bookMat, 2 * NMAX);
  const rampS = inst(PB.build(), structMat, 2 * NMAX), rampW = inst(PWb.build(), bookMat, 2 * NMAX);
  const glassI = inst(glassGeo, glassMat, NMAX); glassI.renderOrder = 2;

  /* ---------------- luzes ---------------- */
  const LIGHTS = []; // { p, c (Color), i, flick, ph }
  const addLight = (x, y, z, color, i, flick = 0) => { const L = { p: new T.Vector3(x, y, z), c: new T.Color(color), i, i0: i, flick, ph: Math.random() * 10 }; LIGHTS.push(L); return L; };
  const lightAt = (p, color, i, flick = 0) => addLight(p.x, p.y, p.z, color, i, flick);
  const lampC = new T.Color("#FFB45E");
  let lampList = [];
  const lightTmp = [];
  function updateLights(t) {
    lightTmp.length = 0; const cp = camera.position;
    for (const L of LIGHTS) { if (L.flick) L.i = L.i0 * (1 - L.flick + L.flick * (0.6 + 0.4 * Math.sin(t * 11 + L.ph) * Math.sin(t * 7.3 + L.ph * 2))); L.s = L.i / (1 + L.p.distanceToSquared(cp) * 0.02); lightTmp.push(L); }
    for (const L of lampList) { const d2 = L.p.distanceToSquared(cp); if (d2 > 1300) continue; L.i = L.i0 * (0.95 + 0.05 * Math.sin(t * 6 + L.ph)); L.s = L.i / (1 + d2 * 0.02); lightTmp.push(L); }
    lightTmp.sort((a, b) => b.s - a.s);
    for (let k = 0; k < NL; k++) {
      const L = lightTmp[k];
      if (L) { U.uLP.value[k].copy(L.p); U.uLC.value[k].set(L.c.r * L.i, L.c.g * L.i, L.c.b * L.i); } else { U.uLP.value[k].set(0, -999, 0); U.uLC.value[k].set(0, 0, 0); }
    }
  }

  /* brilho das lâmpadas, poeira, brasas e feixes */
  const glowTex = (() => { const c = document.createElement("canvas"); c.width = c.height = 64; const g = c.getContext("2d"); const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, "rgba(255,255,255,1)"); gr.addColorStop(0.2, "rgba(255,255,255,0.5)"); gr.addColorStop(1, "rgba(255,255,255,0)"); g.fillStyle = gr; g.fillRect(0, 0, 64, 64); return new T.CanvasTexture(c); })();
  const pts = (n, size, color, op) => { const g = new T.BufferGeometry(); g.setAttribute("position", new T.BufferAttribute(new Float32Array(n * 3), 3)); const p = new T.Points(g, new T.PointsMaterial({ map: glowTex, color, size, transparent: true, opacity: op, depthWrite: false, blending: T.AdditiveBlending })); p.frustumCulled = false; scene.add(p); return p; };
  const HMAX = NMAX * 8; const halos = pts(HMAX, 1.15, 0xffb35c, 0.32);
  const DUST = small ? 360 : 900; const dust = pts(DUST, 0.045, 0xffd9a0, 0.6); const ds = new Float32Array(DUST).map(() => Math.random());
  { const P = dust.geometry.attributes.position.array; for (let i = 0; i < DUST; i++) P.set([(Math.random() - 0.5) * 22, Math.random() * 9, (Math.random() - 0.5) * 22], i * 3); }
  const EMB = 70; const embers = pts(EMB, 0.07, 0xff8a3a, 0.9); const es = new Float32Array(EMB).map(() => Math.random());
  const RAY_FS = `${COMMON} uniform float uK; uniform vec3 uRC; varying vec3 vW; varying vec3 vN; varying vec2 vUv;
    void main(){ vec3 V = normalize(cameraPosition - vW); float edge = pow(abs(dot(normalize(vN), V)), 1.6);
      float n = vnoise(vW * 0.35 + vec3(0.0, -uTime * 0.12, uTime * 0.05)) * 0.6 + vnoise(vW * 1.1 - vec3(uTime * 0.07)) * 0.4;
      float a = uK * edge * smoothstep(0.0, 0.25, vUv.y) * smoothstep(1.0, 0.55, vUv.y) * (0.35 + 0.9 * n);
      gl_FragColor = vec4(uRC * a, a); }`;
  const rayMat = (color, k) => new T.ShaderMaterial({ uniforms: Object.assign({ uK: { value: k }, uRC: { value: new T.Color(color) } }, U), vertexShader: PROP_VS, fragmentShader: RAY_FS, transparent: true, depthWrite: false, blending: T.AdditiveBlending, side: T.DoubleSide });
  const ray = (from, to, r0, r1, color, k) => {
    const dir = new T.Vector3().subVectors(to, from), len = dir.length();
    const g = new T.CylinderGeometry(r0, r1, len, 24, 1, true); g.translate(0, -len / 2, 0);
    const m = new T.Mesh(g, rayMat(color, k)); m.position.copy(from); m.quaternion.setFromUnitVectors(new T.Vector3(0, -1, 0), dir.normalize()); scene.add(m); return m;
  };

  /* ---------------- as salas montadas em volta da câmera ---------------- */
  let latKey = "";
  const mtx = new T.Matrix4(), qY = new T.Quaternion(), eu = new T.Euler(), one = new T.Vector3(1, 1, 1);
  const compose = (p, ry) => mtx.compose(p, qY.setFromEuler(eu.set(0, ry, 0)), one);
  function placeLattice(force) {
    const ci = Math.round(cam.pos.x / LS), ck = Math.round(cam.pos.z / LS), cj = Math.round((cam.pos.y - EYE) / HS);
    const kk = ci + "," + cj + "," + ck; if (kk === latKey && !force) return; latKey = kk;
    let nr = 0, nd = 0, np = 0, hi = 0; lampList = [];
    const hp = halos.geometry.attributes.position.array;
    const lamp = (p, i, ph) => { lampList.push({ p, c: lampC, i0: i, i, ph }); if (hi < HMAX) { hp[hi * 3] = p.x; hp[hi * 3 + 1] = p.y; hp[hi * 3 + 2] = p.z; hi++; } };
    for (let i = ci - NRH; i <= ci + NRH; i++) for (let k = ck - NRH; k <= ck + NRH; k++) for (let j = cj - NV; j <= cj + NV; j++) {
      if (!par(i, j, k)) continue;
      const p = nodePos([i, j, k]);
      compose(p, 0); roomS.setMatrixAt(nr, mtx); roomW.setMatrixAt(nr, mtx); glassI.setMatrixAt(nr, mtx); nr++;
      for (const L of LAMPS) lamp(p.clone().add(L), 1.5, i * 3.1 + j * 7.7 + k);
      for (const [m, ry] of [[1, -Math.PI / 4], [7, Math.PI / 4]]) {
        const s = p.clone().add(V3(AP * FACE[m].c, 0, AP * FACE[m].s)); compose(s, ry); diagS.setMatrixAt(nd, mtx); diagW.setMatrixAt(nd, mtx); nd++;
        lamp(s.clone().add(V3(lampDiag.x * FACE[m].c, lampDiag.y, lampDiag.x * FACE[m].s)), 0.9, nd);
      }
      for (const [m, ry] of [[0, 0], [2, -Math.PI / 2]]) {
        const s = p.clone().add(V3(AP * FACE[m].c, 0, AP * FACE[m].s)); compose(s, ry); rampS.setMatrixAt(np, mtx); rampW.setMatrixAt(np, mtx); np++;
        lamp(s.clone().add(V3(lampRamp.x * FACE[m].c, lampRamp.y, lampRamp.x * FACE[m].s)), 0.9, np + 50);
      }
    }
    roomS.count = roomW.count = glassI.count = nr; diagS.count = diagW.count = nd; rampS.count = rampW.count = np;
    for (const m of [roomS, roomW, glassI, diagS, diagW, rampS, rampW]) m.instanceMatrix.needsUpdate = true;
    for (let k = hi; k < HMAX; k++) { hp[k * 3] = 0; hp[k * 3 + 1] = -999; hp[k * 3 + 2] = 0; }
    halos.geometry.attributes.position.needsUpdate = true;
  }

  /* ---------------- as salas do portfólio ---------------- */
  // cada uma num nó da malha; as que são vizinhas ficam ligadas por um corredor (diagonal ou rampa)
  const ROOMS = [
    { id: "escritorio", n: [0, 0, 0], g: "O centro", t: "O Escritório", sub: "a lareira, a mesa e o piano", focus: 2, extra: 6 },
    { id: "linguagens", n: [1, 0, 1], g: "Ensino médio", subj: "Área de Linguagens", world: 1 },
    { id: "matematica", n: [1, 0, -1], g: "Ensino médio", subj: "Área de Matemática", world: 2 },
    { id: "natureza", n: [-1, 0, 1], g: "Ensino médio", subj: "Ciências da Natureza", world: 3 },
    { id: "humanas", n: [-1, 0, -1], g: "Ensino médio", subj: "Ciências Humanas", world: 4 },
    { id: "tecnica", n: [-1, -1, 0], g: "Curso técnico", t: "Área técnica", sub: "a entrada do curso", world: 5 },
    { id: "modelagem", n: [0, -1, 1], g: "Curso técnico", subj: "Modelagem de Sistemas" },
    { id: "desenvolvimento", n: [-2, -1, 1], g: "Curso técnico", subj: "Desenvolvimento de Sistemas" },
    { id: "aplicativos", n: [-2, -1, -1], g: "Curso técnico", subj: "Programação de Aplicativos" },
    { id: "iot", n: [-2, -2, 0], g: "Curso técnico", subj: "IoT - Internet das Coisas" },
    { id: "banco", n: [-3, -2, 1], g: "Curso técnico", subj: "Banco de Dados" },
    { id: "quemsou", n: [1, 1, 0], g: "A jornada", t: "Quem sou", sub: "interesses e valores", world: 0 },
    { id: "trem", n: [0, 1, -1], g: "A jornada", t: "1º e 2º ano", sub: "o que veio antes", world: 6 },
    { id: "certificados", n: [2, 1, -1], g: "A jornada", t: "Certificados", sub: "feiras e iniciação científica", world: 7 },
    { id: "objetivos", n: [2, 2, 0], g: "A jornada", t: "Objetivos e futuro", sub: "para onde eu vou", world: 8 },
    { id: "fim", n: [2, 3, 1], g: "A jornada", t: "Sala de Leitura", sub: "o fim, e a Estante dos Visitantes", world: 9 },
  ];
  const roomByKey = new Map();
  ROOMS.forEach((r, ri) => { r.ri = ri; r.c = nodePos(r.n); r.t = r.t || r.subj; roomByKey.set(key(r.n), r); });
  ROOMS.forEach((r) => { r.links = []; for (const f of FACE) { const nb = roomByKey.get(key(neighbor(r.n, f.m))); if (nb) r.links.push({ m: f.m, to: nb }); } });
  { const q = [ROOMS[0]]; ROOMS[0].depth = 0; while (q.length) { const r = q.shift(); for (const l of r.links) if (l.to.depth == null) { l.to.depth = r.depth + 1; l.to.parentM = (l.m + 4) % 8; q.push(l.to); } } }
  const mdist = (a, b) => { const d = Math.abs(a - b) % 8; return Math.min(d, 8 - d); };
  ROOMS.forEach((r) => {
    const linked = new Set(r.links.map((l) => l.m)), free = [0, 1, 2, 3, 4, 5, 6, 7].filter((m) => !linked.has(m));
    const ent = r.parentM != null ? r.parentM : 6;
    if (r.focus == null) r.focus = free.slice().sort((a, b) => mdist(b, ent) - mdist(a, ent) || (a % 2) - (b % 2))[0];
    const rest = free.filter((m) => m !== r.focus).sort((a, b) => mdist(a, r.focus) - mdist(b, r.focus));
    if (r.extra == null) { r.rift = rest[0]; r.extra = rest[1]; } else r.rift = null;
    r.fa = r.focus * Math.PI / 4;
  });
  const polar = (r, a, rad, y = 0) => V3(r.c.x + rad * Math.cos(a), r.c.y + y, r.c.z + rad * Math.sin(a));
  const facePt = (r, m, inset = 0, y = 0, u = 0) => V3(r.c.x + (AP - inset) * FACE[m].c + FACE[m].tx * u, r.c.y + y, r.c.z + (AP - inset) * FACE[m].s + FACE[m].tz * u);
  const rel = (r, deg, rad, y = 0) => polar(r, r.fa + deg * Math.PI / 180, rad, y);
  const lookC = (r, p) => faceTo(p.x, p.z, r.c.x, r.c.z);

  // portas fechadas por estantes (onde ficam os livros, a lareira, o piano e as fendas)
  const CB = Builder(), CWb = Builder();
  function plug(r, m, depth = 0) {
    const f = FACE[m], half = DW / 2 + 0.14, cx = r.c.x + (AP + depth) * f.c, cz = r.c.z + (AP + depth) * f.s;
    CWb.wall(cx - f.tx * half, cz - f.tz * half, f.tx, f.tz, -f.c, -f.s, 2 * half, r.c.y, r.c.y + DH + 0.34, 0, 30 + r.ri * 1.3 + m * 0.1, DH - 0.25, r.c.y);
    if (depth > 0.05) for (const sg of [-1, 1]) CWb.wall(cx + f.tx * sg * half, cz + f.tz * sg * half, f.c, f.s, f.tx * -sg, f.tz * -sg, depth, r.c.y, r.c.y + DH + 0.34, 0, 40 + m, DH - 0.25, r.c.y);
  }
  ROOMS.forEach((r) => { plug(r, r.focus, r.id === "escritorio" ? 0.8 : 0); if (r.rift != null) plug(r, r.rift); if (r.id === "escritorio") plug(r, r.extra, 0.2); });

  /* ---------------- placas: o nome da sala e, em cima de cada porta, para onde ela leva ---------------- */
  const signMat = (tex) => new T.ShaderMaterial({ uniforms: Object.assign({ map: { value: tex } }, U), vertexShader: PROP_VS, fragmentShader: `${COMMON} uniform sampler2D map; varying vec3 vW; varying vec3 vN; varying vec2 vUv; void main(){ vec4 c = texture2D(map, vUv); if (c.a < 0.1) discard; vec3 l = band(lights(vW, normalize(vN))); gl_FragColor = vec4(fogIt(c.rgb * (0.45 + l * 0.8), vW), 1.0); }`, transparent: false });
  function signTex(name, sub, color, w = 640, h = 150) {
    const c = document.createElement("canvas"); c.width = w; c.height = h; const g = c.getContext("2d");
    g.fillStyle = "#22160E"; g.fillRect(0, 0, w, h); g.strokeStyle = "#B88A40"; g.lineWidth = 4; g.strokeRect(9, 9, w - 18, h - 18);
    g.fillStyle = color; g.fillRect(26, h / 2 - 10, 9, 14); g.fillRect(w - 35, h / 2 - 10, 9, 14);
    g.fillStyle = "#F1E6CF"; g.textAlign = "center"; let fs = 46; g.font = `600 ${fs}px 'Shippori Mincho', serif`;
    while (g.measureText(name).width > w - 110 && fs > 22) { fs -= 2; g.font = `600 ${fs}px 'Shippori Mincho', serif`; }
    g.fillText(name, w / 2, sub ? h / 2 + 4 : h / 2 + fs / 3);
    if (sub) { g.fillStyle = "#C9A867"; g.font = "500 19px 'Geist Mono', monospace"; g.fillText(sub.toUpperCase(), w / 2, h - 30); }
    const t = new T.CanvasTexture(c); t.anisotropy = 4; return t;
  }
  function sign(pos, ry, name, sub, color, w = 2.3, h = 0.54) { const m = new T.Mesh(new T.PlaneGeometry(w, h), signMat(signTex(name, sub, color))); m.position.copy(pos); m.rotation.y = ry; scene.add(m); return m; }

  /* ---------------- portas: clicar numa leva pelo corredor até a sala do outro lado ---------------- */
  const clickables = []; // { mesh, kind, data, hot }
  const propHot = [];    // objetos clicáveis que brilham de leve e acendem com o cursor
  const clickable = (g, kind, data, label) => {
    const c = { g, kind, data, hot: 0, label };
    if (label) { c.mats = ownMats(g); propHot.push(c); }
    g.traverse((o) => { if (o.isMesh && o.visible) { o.userData.click = c; clickables.push(o); } }); return c;
  };
  const doorTex = (() => { const c = document.createElement("canvas"); c.width = 64; c.height = 128; const g = c.getContext("2d"); const gr = g.createLinearGradient(0, 128, 0, 0); gr.addColorStop(0, "rgba(255,200,120,0.9)"); gr.addColorStop(0.55, "rgba(255,190,110,0.35)"); gr.addColorStop(1, "rgba(255,190,110,0)"); g.fillStyle = gr; g.fillRect(0, 0, 64, 128); const gx = g.createLinearGradient(0, 0, 64, 0); gx.addColorStop(0, "rgba(0,0,0,1)"); gx.addColorStop(0.2, "rgba(0,0,0,0)"); gx.addColorStop(0.8, "rgba(0,0,0,0)"); gx.addColorStop(1, "rgba(0,0,0,1)"); g.globalCompositeOperation = "destination-out"; g.fillStyle = gx; g.fillRect(0, 0, 64, 128); return new T.CanvasTexture(c); })();
  const doors = [];
  const wayWord = (m) => (FACE[m].ramp ? (FACE[m].up ? "sobe a rampa" : "desce a rampa") : "segue o corredor");
  ROOMS.forEach((r) => {
    for (const l of r.links) {
      const p = facePt(r, l.m, -0.08, DH / 2);
      const mat = new T.MeshBasicMaterial({ map: doorTex, color: 0xffc27a, transparent: true, opacity: 0.1, depthWrite: false, blending: T.AdditiveBlending, side: T.DoubleSide });
      const mesh = new T.Mesh(new T.PlaneGeometry(DW - 0.1, DH - 0.05), mat); mesh.position.copy(p); mesh.rotation.y = ryFront(l.m); mesh.renderOrder = 4; scene.add(mesh);
      const d = { r, m: l.m, to: l.to, mesh, hot: 0 }; doors.push(d); clickable(mesh, "porta", d);
      sign(facePt(r, l.m, 0.31, DH + 0.66), ryFront(l.m), l.to.t, wayWord(l.m), "#C8A04A", 2.2, 0.5);
    }
  });

  /* ---------------- a mobília (os modelos que você mandou), sala por sala ---------------- */
  const GLOBE_FS = `${COMMON} uniform vec3 uC; uniform float uR, uHot; varying vec3 vW; varying vec3 vN; varying vec2 vUv;
    void main(){
      vec3 n = normalize(vN); if (!gl_FrontFacing) n = -n;
      vec3 d = vW - uC; float r = length(d); vec3 u = d / max(r, 1e-4); vec3 c;
      if (abs(r - uR) < uR * 0.055) {
        float a = uTime * 0.04; u.xz = mat2(cos(a), -sin(a), sin(a), cos(a)) * u.xz;
        float land = vnoise(u * 2.1 + 3.7) * 0.62 + vnoise(u * 4.7 + 1.3) * 0.28 + vnoise(u * 10.0) * 0.1;
        vec3 sea = mix(vec3(0.20, 0.33, 0.33), vec3(0.28, 0.42, 0.40), vnoise(u * 6.0));
        vec3 ground = mix(vec3(0.62, 0.48, 0.26), vec3(0.47, 0.42, 0.22), vnoise(u * 8.0 + 2.0));
        c = mix(sea, ground, smoothstep(0.505, 0.52, land));
        c *= 0.55 + 0.45 * smoothstep(0.0, 0.012, abs(land - 0.512));
        float lat = asin(clamp(u.y, -1.0, 1.0)) / 0.2618, lon = atan(u.z, u.x) / 0.2618;
        float g = min(abs(fract(lat + 0.5) - 0.5), abs(fract(lon + 0.5) - 0.5));
        c = mix(c * 0.62, c, smoothstep(0.0, 0.035, g));
        c *= 0.82 + 0.28 * vnoise(u * 22.0);
        c = mix(c, vec3(0.75, 0.62, 0.40), 0.18);
      } else c = mix(vec3(0.50, 0.34, 0.14), vec3(0.72, 0.52, 0.22), vnoise(vW * 40.0));
      vec3 lit = band(lights(vW, n));
      vec3 V = normalize(cameraPosition - vW); float rim = pow(1.0 - max(dot(n, V), 0.0), 3.0);
      vec3 col = c * lit * (1.0 + uHot * 0.16) + rim * scat * 0.05 + vec3(1.0, 0.8, 0.45) * rim * uHot * 0.7;
      gl_FragColor = vec4(fogIt(col, vW), 1.0);
    }`;
  /* poltronas de couro, feitas de caixas arredondadas */
  function rbox(w, h, d, r) {
    const b = Math.min(r, w / 2 - 0.005, h / 2 - 0.005, d / 2 - 0.005), sh = new T.Shape(), x = (w - 2 * b) / 2, y = (h - 2 * b) / 2;
    sh.moveTo(-x, -y); sh.lineTo(x, -y); sh.lineTo(x, y); sh.lineTo(-x, y); sh.closePath();
    const g = new T.ExtrudeGeometry(sh, { depth: d - 2 * b, bevelEnabled: true, bevelThickness: b, bevelSize: b, bevelSegments: 4, curveSegments: 4 });
    g.translate(0, 0, -(d - 2 * b) / 2); g.computeVertexNormals(); return g;
  }
  function armchair(x, z, ry, y = 0, color = "#5E2219") {
    const g = new T.Group(), leather = new T.MeshBasicMaterial({ color }), wood = new T.MeshBasicMaterial({ color: "#24160C" }), cushion = new T.MeshBasicMaterial({ color: new T.Color(color).multiplyScalar(1.12) });
    const add = (geo, mat, px, py, pz, rx = 0) => { const m = new T.Mesh(geo, mat); m.position.set(px, py, pz); m.rotation.x = rx; g.add(m); };
    add(rbox(0.92, 0.3, 0.86, 0.06), leather, 0, 0.3, 0);                // base
    add(rbox(0.66, 0.13, 0.7, 0.05), cushion, 0, 0.5, 0.06);             // assento
    add(rbox(0.92, 0.74, 0.2, 0.07), leather, 0, 0.78, -0.34, -0.14);    // encosto
    add(rbox(0.62, 0.46, 0.1, 0.05), cushion, 0, 0.82, -0.22, -0.14);    // almofada do encosto
    for (const sx of [-1, 1]) { add(rbox(0.16, 0.5, 0.86, 0.06), leather, sx * 0.38, 0.4, 0); add(rbox(0.2, 0.08, 0.9, 0.04), leather, sx * 0.38, 0.66, 0.01); }
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) add(new T.CylinderGeometry(0.03, 0.022, 0.16, 8), wood, sx * 0.38, 0.08, sz * 0.36);
    propize(g); g.position.set(x, y, z); g.rotation.y = ry; scene.add(g); return g;
  }
  /* tudo apoiado de verdade: mede o tampo de cada móvel antes de pôr algo em cima */
  const rcDown = new T.Raycaster();
  function topOf(g, x, z) { g.updateMatrixWorld(true); rcDown.set(V3(x, g.position.y + 30, z), V3(0, -1, 0)); const h = rcDown.intersectObject(g, true).find((i) => i.object.visible); return h ? h.point.y : g.position.y; }
  const on = (g, p) => V3(p.x, topOf(g, p.x, p.z), p.z);
  const FIRE_FS = `${COMMON} uniform float uSeed; varying vec3 vW; varying vec3 vN; varying vec2 vUv;
    void main(){
      vec2 p = vUv; float t = uTime + uSeed;
      float n = vnoise(vec3(p.x * 4.0, p.y * 3.0 - t * 2.3, uSeed)) * 0.65 + vnoise(vec3(p.x * 10.0, p.y * 8.0 - t * 3.6, uSeed + 5.0)) * 0.35;
      float x = (p.x - 0.5) + (n - 0.5) * 0.32 * p.y;
      float w = 0.44 * pow(1.0 - p.y, 0.9) * (0.7 + 0.3 * n);
      float a = smoothstep(w, w * 0.15, abs(x)) * smoothstep(1.0, 0.2, p.y + (n - 0.5) * 0.55) * smoothstep(0.0, 0.08, p.y);
      vec3 col = mix(vec3(0.85, 0.16, 0.02), vec3(1.0, 0.58, 0.14), smoothstep(0.1, 0.55, a));
      col = mix(col, vec3(1.0, 0.9, 0.62), smoothstep(0.7, 1.0, a));
      gl_FragColor = vec4(col * a * 1.5, a);
    }`;
  const R0 = ROOMS[0];
  // o Escritório: a lareira na face de trás, poltronas, a mesa de trabalho, o gramofone e o piano
  const FIRE = facePt(R0, R0.focus, 0.15 - 0.23, 0.12), FIREN = faceDir(R0.focus).negate(), FIRET = V3(FACE[R0.focus].tx, 0, FACE[R0.focus].tz);
  const fireGroup = new T.Group(); fireGroup.position.copy(FIRE); scene.add(fireGroup);
  [[0.95, 0.95, 0, 0], [0.7, 0.72, -0.22, 3.1], [0.62, 0.66, 0.24, 7.7]].forEach(([w, h, dz, seed]) => {
    const geo = new T.PlaneGeometry(w, h); geo.translate(dz, h / 2, 0);
    const m = new T.Mesh(geo, new T.ShaderMaterial({ uniforms: Object.assign({ uSeed: { value: seed } }, U), vertexShader: PROP_VS, fragmentShader: FIRE_FS, transparent: true, depthWrite: false, blending: T.AdditiveBlending, side: T.DoubleSide }));
    m.renderOrder = 3; fireGroup.add(m);
  });
  { const logs = new T.Group(), lm = new T.MeshBasicMaterial({ color: "#2B1A10" });
    [[0, 0.06, 0, 0.35], [0.05, 0.06, 0.02, -0.4], [-0.06, 0.16, 0, 0.05]].forEach(([dx, y, dz, r]) => { const c = new T.Mesh(new T.CylinderGeometry(0.065, 0.075, 0.78, 10), lm); c.rotation.set(Math.PI / 2, r, 0); c.position.set(dx, y, dz); logs.add(c); });
    propize(logs, { emit: 0.55, emitC: "#FF5A1A" }); logs.position.copy(FIRE).setY(R0.c.y + 0.08); logs.rotation.y = ryFront(R0.focus) + Math.PI / 2; scene.add(logs);
    const glow = new T.Mesh(new T.PlaneGeometry(1.6, 1.4), new T.MeshBasicMaterial({ map: glowTex, color: 0xff7a2a, transparent: true, opacity: 0.55, depthWrite: false, blending: T.AdditiveBlending }));
    glow.rotation.x = -Math.PI / 2; glow.position.copy(FIRE).addScaledVector(FIREN, 0.55).setY(R0.c.y + 0.02); scene.add(glow); }
  lightAt(FIRE.clone().addScaledVector(FIREN, 0.7).setY(R0.c.y + 0.75), "#FF7A2A", 5.2, 0.28);
  prop("lareira", (m) => place(m, { at: facePt(R0, R0.focus, 0.15), h: 3.0, ry: ryFront(R0.focus) }), 1);
  prop("candelabro", (m) => { for (const u of [-1.95, 1.95]) { place(m.clone(true), { at: facePt(R0, R0.focus, 0.55, 0, u), h: 1.84, emit: 0.18 }); lightAt(facePt(R0, R0.focus, 0.6, 1.95, u), "#FFB060", 0.7, 0.14); } }, 3);
  prop("utensilios", (m) => place(m, { at: facePt(R0, R0.focus, 0.95, 0, -1.35), h: 0.95, drop: (o) => o.name !== "pCylinder162" }), 3);
  for (const s of [-1, 1]) { const p = rel(R0, s * 27, 4.2); armchair(p.x, p.z, faceTo(p.x, p.z, FIRE.x, FIRE.z), p.y); }
  prop("velas", (m) => { place(m.clone(true), { at: facePt(R0, R0.focus, 0.5, 2.62, 1.3), size: 0.32, emit: 0.5 }); place(m, { at: facePt(R0, R0.focus, 0.5, 2.62, -1.3), size: 0.32, emit: 0.5 }); }, 3);
  // a mesa de trabalho (num grupo próprio: tudo em cima dela é posto em coordenadas da mesa)
  const DESKA = 22.5 * Math.PI / 180, DESKY = 0.82;
  const deskG = new T.Group(); deskG.position.copy(polar(R0, DESKA, 4.35)); deskG.rotation.y = Math.PI - DESKA; scene.add(deskG); deskG.updateMatrixWorld(true);
  const onDesk = (dx, dz) => V3(dx, DESKY, dz);
  const inDesk = (o) => Object.assign({ parent: deskG }, o);
  prop("mesa", (m) => {
    clickable(place(m.clone(true), inDesk({ at: V3(0, 0, 0), h: DESKY, ry: Math.PI / 2, stretch: [1.5, 1, 1.45] })), "mesa", null, ["A mesa de trabalho", "Chegar perto"]);
    for (const r of ROOMS.filter((x) => x.id === "fim")) prop("lampiao", (k) => place(k, { at: on(place(m.clone(true), { at: rel(r, 70, 4.1), h: DESKY, ry: 0.5 }), rel(r, 70, 3.8)), h: 0.55, emit: 0.4 }), 7);
  }, 1);
  prop("maquina", (m) => clickable(place(m, inDesk({ at: onDesk(0.12, 0.02), size: 0.46, ry: Math.PI / 2 })), "recado", null, ["Máquina de escrever", "Deixar um recado"]), 2);
  prop("lampiao", (m) => place(m, inDesk({ at: onDesk(-0.3, 0.72), h: 0.5, emit: 0.5 })), 2);
  prop("mapa", (m) => clickable(place(m, inDesk({ at: onDesk(0.16, 0.6), size: 0.44, rot: [0, 0, Math.PI / 2], ry: 0.18 })), "indice", null, ["Mapa", "Ver todos os lugares"]), 2);
  prop("lupa", (m) => clickable(place(m, inDesk({ at: onDesk(0.27, -0.47), size: 0.4, ry: Math.PI / 2 + 0.25 })), "busca", null, ["Lupa", "Procurar uma atividade"]), 2);
  prop("telefone", (m) => clickable(place(m, inDesk({ at: onDesk(-0.3, -0.62), size: 0.4, ry: Math.PI / 2 + 0.6 })), "contato", null, ["Telefone", "Falar comigo"]), 2);
  prop("tinteiro", (m) => place(m, inDesk({ at: onDesk(-0.1, 0.36), size: 0.19, ry: 2.2 })), 3);
  prop("pergaminho", (m) => place(m, inDesk({ at: onDesk(-0.42, 0.06), size: 0.5, ry: Math.PI / 2 + 0.12 })), 3);
  prop("livros-gastos", (m) => place(m, inDesk({ at: onDesk(-0.34, -0.98), size: 0.4, ry: Math.PI / 2 + 0.15 })), 3);
  prop("papeis", (m) => place(m, inDesk({ at: onDesk(0.22, -0.92), h: 0.08, stretch: [3.5, 1, 3.5], ry: 0.25 })), 3);
  prop("bussola", (m) => clickable(place(m, inDesk({ at: onDesk(-0.06, -0.36), size: 0.22, ry: 0.4 })), "mundos", null, ["Bússola", "Ver os mundos"]), 3);
  prop("caneca", (m) => place(m, inDesk({ at: onDesk(0.16, 0.98), h: 0.11, ry: 2.4 })), 3);
  prop("cadeira", (m) => place(m, inDesk({ at: V3(0.98, 0, -0.95), h: 1.25, ry: faceTo(0.98, -0.95, 0, -0.2) })), 3);
  prop("globo", (m) => {
    const g = place(m, inDesk({ at: V3(-0.55, 0, 1.85), h: 1.08, ry: -0.6, drop: (o) => !/Line001/.test(o.name) && !/Line001/.test(o.parent && o.parent.name || "") }));
    const s0 = g.userData.size.y / 85.81, C = new T.Vector3(0, 56.54, -0.59);
    g.updateMatrixWorld(true); m.localToWorld(C);
    const gm = new T.ShaderMaterial({ uniforms: Object.assign({ uC: { value: C }, uR: { value: 21.57 * s0 }, uHot: { value: 0 } }, U), vertexShader: PROP_VS, fragmentShader: GLOBE_FS, side: T.DoubleSide });
    g.traverse((o) => { if (o.isMesh && o.visible) o.material = gm; });
    clickable(g, "mundos", null, ["Globo", "Ver os mundos"]);
  }, 2);
  lightAt(deskG.localToWorld(V3(-0.3, 1.25, 0.72)), "#FFC070", 1.6, 0.05);
  // gramofone na mesinha, a cômoda com livros, o atril com o livro aberto, o piano na porta da frente
  { const p = polar(R0, 202.5 * Math.PI / 180, 4.7), ry = lookC(R0, p);
    prop("mesa", (m) => place(m, { at: p, h: 0.68, ry: ry + Math.PI / 2, stretch: [0.62, 1, 0.9] }), 3);
    prop("gramofone", (m) => clickable(place(m, { at: p.clone().setY(R0.c.y + 0.68), h: 0.85, ry: ry + Math.PI }), "musica", null, ["Gramofone", "Tocar ou pausar a música"]), 3); }
  { const p = polar(R0, 157.5 * Math.PI / 180, 5.55);
    prop("comoda", (c) => {
      const g = place(c, { at: p, h: 0.86, ry: lookC(R0, p) });
      prop("livros-vela", (k) => place(k, { at: on(g, p.clone().add(V3(0.12, 0, -0.1))), size: 0.34, ry: 1.2, emit: 0.1 }), 4);
      prop("livro-couro", (k) => clickable(place(k, { at: on(g, p.clone().add(V3(-0.15, 0, 0.15))), size: 0.3, ry: 1.9 }), "sobre", null, ["Livro de couro", "Sobre esta biblioteca"]), 4);
      lightAt(p.clone().setY(R0.c.y + 1.35), "#FFB060", 0.45, 0.15);
    }, 3); }
  { const p = polar(R0, 247.5 * Math.PI / 180, 4.3);
    prop("atril", (m) => { place(m, { at: p, h: 1.25, ry: lookC(R0, p) + Math.PI }); prop("livro-magico", (b) => clickable(place(b, { at: p.clone().setY(R0.c.y + 1.26), size: 0.62, ry: lookC(R0, p) + Math.PI, emit: 0.15, emitC: "#FFD9A0" }), "sobre", null, ["O livro aberto", "Sobre esta biblioteca"]), 2); }, 2); }
  prop("piano", (m) => { const g = place(m, { at: facePt(R0, R0.extra, 0.55), h: 1.32, ry: ryX(R0.extra) }); prop("disco", (d) => place(d, { at: on(g, facePt(R0, R0.extra, 0.6)), size: 0.55, ry: ryX(R0.extra) }), 5); }, 3);

  // as outras salas: um móvel de cada, do lado oposto ao da fenda
  const furnSide = (r) => (r.rift != null && mdist(r.rift, (r.focus + 1) % 8) === 0 ? -1 : 1);
  const spot = (r, deg = 67.5, rad = 4.5) => rel(r, furnSide(r) * deg, rad);
  const room = (id) => ROOMS.find((r) => r.id === id);
  { const r = room("linguagens"), p = spot(r, 67.5, 5.6); prop("mesa-leitura", (m) => place(m, { at: p, h: 1.05, ry: lookC(r, p) }), 5); }
  { const r = room("iot"), p = spot(r, 67.5, 5.6); prop("mesa-leitura", (m) => place(m, { at: p, h: 1.05, ry: lookC(r, p) }), 6); }
  { const r = room("matematica"), p = spot(r, 67.5, 5.5);
    prop("mesa-longa", (t) => { const g = place(t, { at: p, h: 0.78, ry: lookC(r, p) + Math.PI / 2 });
      prop("tubos", (k) => place(k, { at: on(g, p.clone().add(V3(0.25, 0, 0.25))), size: 0.36, ry: lookC(r, p) }), 5);
      prop("frasco", (k) => place(k, { at: on(g, p.clone().add(V3(-0.3, 0, -0.25))), h: 0.2 }), 5); }, 5); }
  { const r = room("natureza"), p = spot(r, 67.5, 5.5); prop("mesa-alquimista", (m) => { place(m, { at: p, h: 1.84, ry: lookC(r, p) + Math.PI / 2 }); lightAt(p.clone().setY(r.c.y + 1.9), "#FFB868", 0.9, 0.14); }, 5);
    const q = spot(r, 112.5, 4.6); prop("garrafa-hera", (m) => place(m, { at: q, h: 0.55, ry: 0.6 }), 6); }
  { const r = room("humanas"), p = spot(r, 67.5, 5.4);
    prop("vitrine", (m) => { const g = place(m, { at: p, h: 2.2, ry: lookC(r, p) });
      g.updateMatrixWorld(true); rcDown.set(V3(p.x, r.c.y + 30, p.z), V3(0, -1, 0));
      const fl = rcDown.intersectObject(g, true).map((i) => i.point.y).filter((y) => y < r.c.y + 1.2).sort((a, b) => b - a)[0] || r.c.y + 0.3;
      prop("pocoes", (k) => place(k, { at: V3(p.x, fl + 0.02, p.z), size: 0.95, ry: 0.3, emit: 0.35, emitC: "#B0E0FF" }), 6);
      lightAt(p.clone().setY(r.c.y + 1.6), "#CFE6FF", 1.1, 0.02); }, 5); }
  { const r = room("tecnica"), p = spot(r, 67.5, 5.7);
    prop("balcao", (m) => { const g = place(m, { at: p, h: 2.1, ry: lookC(r, p) + Math.PI });
      prop("castical", (k) => { const y = topOf(g, p.x, p.z); place(k, { at: V3(p.x, y, p.z), h: 0.3, emit: 0.3 }); addLight(p.x, y + 0.45, p.z, "#FFB060", 0.6, 0.15); }, 5);
      prop("moedas", (k) => place(k, { at: on(g, p.clone().add(V3(0.4, 0, 0.3))), size: 0.3 }), 6); }, 5);
    const q = spot(r, -112.5, 5.6); prop("relogio", (m) => place(m, { at: q, h: 2.3, ry: lookC(r, q) }), 5); }
  { const r = room("quemsou"), p = spot(r, 67.5, 5.4); prop("espelho", (m) => place(m, { at: p, h: 2.1, ry: lookC(r, p), tint: "#9aa6ad" }), 5);
    const q = spot(r, 112.5, 5.6); prop("armario", (m) => place(m, { at: q, h: 1.81, ry: lookC(r, q) }), 6); }
  { const r = room("trem"), p = spot(r, 67.5, 5.2);
    prop("comoda", (c) => { const g = place(c, { at: p, h: 0.86, ry: lookC(r, p) }); prop("castical", (k) => { const y = topOf(g, p.x, p.z); place(k, { at: V3(p.x, y, p.z), h: 0.3, emit: 0.3 }); addLight(p.x, y + 0.45, p.z, "#FFB060", 0.6, 0.15); }, 6); }, 6);
    const q = spot(r, 112.5, 4.4); armchair(q.x, q.z, lookC(r, q), q.y); }
  { const r = room("objetivos");
    prop("janela", (m) => place(m, { at: facePt(r, r.focus, 0.05, 0.25), h: 3.0, ry: ryFront(r.focus), emit: 0.3, emitC: "#8FA6CC" }), 5);
    prop("cortinas", (m) => place(m, { at: facePt(r, r.focus, 0.25, 0.1), h: 3.3, ry: ryFront(r.focus), tint: "#7A2A24" }), 6);
    const q = rel(r, 180, 2.8); armchair(q.x, q.z, faceTo(q.x, q.z, facePt(r, r.focus).x, facePt(r, r.focus).z), q.y); }
  for (const id of ["modelagem", "desenvolvimento", "aplicativos", "banco"]) { const r = room(id), p = spot(r, 67.5, 4.3); prop("atril", (m) => place(m, { at: p, h: 1.25, ry: lookC(r, p) + Math.PI }), 6); }
  { const r = room("fim"), p = rel(r, 110, 4.2); armchair(p.x, p.z, lookC(r, p), p.y);
    prop("tinteiro", (m) => clickable(place(m, { at: rel(r, 70, 4.35, DESKY), size: 0.24 }), "recado", null, ["Tinteiro", "Deixar um livro na estante"]), 7);
    prop("pergaminho", (m) => clickable(place(m, { at: rel(r, 74, 3.95, DESKY), size: 0.36, ry: 0.4 }), "recado", null, ["Pergaminho", "Deixar um livro na estante"]), 7);
    lightAt(rel(r, 70, 4.0, 1.4), "#FFC070", 1.2, 0.05); }
  // a luz fria que desce pelos óculos das salas do portfólio
  for (const r of ROOMS) ray(V3(r.c.x, r.c.y + 4 * HS + 4, r.c.z), V3(r.c.x, r.c.y, r.c.z), OC * 0.75, OC * 1.05, "#9DB4D8", 0.07);

  /* ---------------- as fendas: cada mundo numa porta da sala dele ---------------- */
  const WORLDS = [
    { t: "Quem sou", s: "Tokyo Ghoul", c: "#C0303A" }, { t: "Linguagens", s: "Death Note", c: "#D8D2C2" },
    { t: "Matemática", s: "Evangelion", c: "#8A4FC0" }, { t: "Ciências da Natureza", s: "Ponyo e Totoro", c: "#45B079" },
    { t: "Ciências Humanas", s: "Túmulo dos Vaga-lumes", c: "#E8A848" }, { t: "Área técnica", s: "Lain", c: "#5CC8D8" },
    { t: "1º e 2º ano", s: "O trem", c: "#7A9AD8" }, { t: "Certificados", s: "Frieren", c: "#A8D0F0" },
    { t: "Objetivos e futuro", s: "Attack on Titan", c: "#D8955A" }, { t: "Agradecimentos", s: "Frieren", c: "#F0DEA8" },
  ];
  const PORTAL_FS = `${COMMON} uniform vec3 uRC; uniform float uHot; varying vec3 vW; varying vec3 vN; varying vec2 vUv;
    void main(){ float n = vnoise(vW * 2.2 + vec3(0.0, uTime * 0.6, 0.0)) * 0.6 + vnoise(vW * 6.0 - vec3(uTime * 0.9)) * 0.4;
      float swirl = 0.5 + 0.5 * sin(vW.y * 6.0 + n * 6.0 - uTime * 2.0);
      vec3 col = mix(uRC * 0.35, uRC * 2.2 + vec3(0.35), swirl * n) * (1.0 + uHot * 0.8);
      gl_FragColor = vec4(fogIt(col, vW), 1.0); }`;
  const rifts = [];
  ROOMS.forEach((r) => {
    if (r.world == null || r.rift == null) return;
    const w = Object.assign({}, WORLDS[r.world]); w.room = r; w.m = r.rift; w.k = r.world;
    w.pos = facePt(r, r.rift, 0.3, 1.7); w.nx = -FACE[r.rift].c; w.nz = -FACE[r.rift].s;
    lightAt(facePt(r, r.rift, 0.9, 1.7), w.c, 0.9, 0.15);
    sign(facePt(r, r.rift, 0.31, DH + 0.66), ryFront(r.rift), w.t, w.s, w.c, 2.2, 0.5);
    rifts.push(w);
  });
  prop("fenda", (m) => {
    for (const w of rifts) {
      const g = place(m.clone(true), { at: facePt(w.room, w.m, 0.22, 0.1), h: 3.0, ry: ryX(w.m) });
      const mat = new T.ShaderMaterial({ uniforms: Object.assign({ uRC: { value: new T.Color(w.c) }, uHot: { value: 0 } }, U), vertexShader: PROP_VS, fragmentShader: PORTAL_FS, side: T.DoubleSide });
      g.traverse((o) => { if (o.isMesh) o.material = mat; }); w.mat = mat;
      const halo = new T.Sprite(new T.SpriteMaterial({ map: glowTex, color: new T.Color(w.c), transparent: true, opacity: 0.35, depthWrite: false, blending: T.AdditiveBlending })); halo.scale.set(3.0, 4.2, 1); halo.position.copy(facePt(w.room, w.m, 0.5, 1.7)); scene.add(halo); w.halo = halo;
      clickable(g, "mundo", w);
    }
  }, 2);

  /* ---------------- as atividades: livros de verdade na estante de cada sala ---------------- */
  const COLORS = ["#2E7D5B", "#9C4A2F", "#7A3E8E", "#2E5E9C", "#3A8C8C", "#B07A2A", "#A8435A", "#4E8A3A", "#5A5AA8", "#8C6A3A"];
  const books = []; let subjects = [];
  function spineTexture(title, color, sub) {
    const c = document.createElement("canvas"); c.width = 96; c.height = 320; const g = c.getContext("2d");
    g.fillStyle = color; g.fillRect(0, 0, 96, 320);
    const gr = g.createLinearGradient(0, 0, 96, 0); gr.addColorStop(0, "rgba(0,0,0,0.4)"); gr.addColorStop(0.5, "rgba(255,255,255,0.08)"); gr.addColorStop(1, "rgba(0,0,0,0.4)"); g.fillStyle = gr; g.fillRect(0, 0, 96, 320);
    g.fillStyle = "#E2B25A"; [18, 26, 294, 302].forEach((y) => g.fillRect(6, y, 84, 3));
    g.save(); g.translate(48, 160); g.rotate(-Math.PI / 2); g.fillStyle = "#F4E9D2"; g.textAlign = "center"; g.textBaseline = "middle";
    let fs = 26; const t = title.length > 34 ? title.slice(0, 32) + "…" : title; g.font = `600 ${fs}px 'Shippori Mincho', serif`;
    while (g.measureText(t).width > 250 && fs > 12) { fs -= 1; g.font = `600 ${fs}px 'Shippori Mincho', serif`; }
    g.fillText(t, 0, sub ? -10 : 0); if (sub) { g.font = "500 14px 'Geist Mono', monospace"; g.fillStyle = "#E2B25A"; g.fillText(sub, 0, 20); } g.restore();
    const tex = new T.CanvasTexture(c); tex.anisotropy = 4; return tex;
  }
  const actMat = (color, map, kind) => new T.ShaderMaterial({
    uniforms: Object.assign({ uColor: { value: new T.Color(color) }, map: { value: map || null }, uHot: { value: 0 }, uMatch: { value: 0 }, uKind: { value: kind } }, U),
    vertexShader: PROP_VS,
    fragmentShader: `${COMMON} uniform vec3 uColor; uniform sampler2D map; uniform float uHot, uMatch, uKind; varying vec3 vW; varying vec3 vN; varying vec2 vUv;
      void main(){
        vec3 n = normalize(vN); vec3 c = uColor;
        if (uKind > 1.5) c = texture2D(map, vUv).rgb; else if (uKind > 0.5) c = mix(vec3(0.92, 0.86, 0.72), vec3(0.78, 0.7, 0.56), step(0.5, fract(vUv.y * 40.0)));
        float e = min(min(vUv.x, 1.0 - vUv.x), min(vUv.y, 1.0 - vUv.y)); float edge = 1.0 - smoothstep(0.0, 0.06, e);
        float pulse = 0.55 + 0.45 * sin(uTime * 2.2 + vW.x * 0.7); vec3 lit = band(lights(vW, n));
        vec3 col = c * (lit * 0.9 + 0.1) + vec3(1.0, 0.76, 0.38) * edge * (0.12 + 0.16 * pulse + uHot * 0.55) + vec3(1.0, 0.85, 0.6) * (0.03 * pulse + uHot * 0.1) * (1.0 - edge);
        col = mix(col, col + vec3(0.9, 0.95, 1.0) * 0.5 * (0.5 + 0.5 * sin(uTime * 6.0)), uMatch);
        gl_FragColor = vec4(fogIt(col, vW), 1.0);
      }`,
  });
  // um livro na estante da face m da sala r: u é a posição ao longo da parede, row a prateleira
  function bookAt(r, m, u, row, title, color, sub) {
    const f = FACE[m], nx = -f.c, nz = -f.s, g = new T.Group();
    g.position.set(r.c.x + (AP - 0.2) * f.c + f.tx * u, r.c.y + BASE + ROW * row + 0.045, r.c.z + (AP - 0.2) * f.s + f.tz * u); g.rotation.y = Math.atan2(nx, nz);
    const mats = [actMat(color, null, 0), actMat(color, null, 0), actMat(color, null, 1), actMat(color, null, 0), actMat(color, spineTexture(title, color, sub), 2), actMat(color, null, 0)];
    const body = new T.Mesh(new T.BoxGeometry(0.12, 0.38, 0.27), mats); body.position.y = 0.19; g.add(body);
    const halo = new T.Sprite(new T.SpriteMaterial({ map: glowTex, color: new T.Color(color).lerp(new T.Color("#ffd28a"), 0.5), transparent: true, opacity: 0.2, depthWrite: false, blending: T.AdditiveBlending })); halo.scale.set(0.75, 0.75, 1); halo.position.set(0, 0.2, 0.18); g.add(halo);
    g.scale.setScalar(1.5); scene.add(g); return { g, body, halo, mats, nx, nz, room: r, out: 0, match: 0 };
  }
  const SLOT = (k, n) => (k - (n - 1) / 2) * 1.25;
  function addActivityBooks(list) {
    subjects = list;
    list.forEach((sub, si) => {
      const r = ROOMS.find((x) => x.subj === sub.name); if (!r) return;
      const color = COLORS[si % COLORS.length]; sub.color = color; r.sub = r.sub || (sub.cat === "curso-tecnico" ? "curso técnico" : "ensino médio");
      sign(facePt(r, r.focus, 0.24, DH + 0.85), ryFront(r.focus), sub.name, sub.cat === "curso-tecnico" ? "Curso técnico" : "Ensino médio", color, 2.6, 0.62);
      sub.acts.forEach((a, ai) => {
        const row = ai < 4 ? 2 : 3, nPer = ai < 4 ? Math.min(4, sub.acts.length) : sub.acts.length - 4;
        const b = bookAt(r, r.focus, SLOT(ai % 4, nPer), row, a.t, color); Object.assign(b, { a, sub, id: `${si}-${ai}` });
        books.push(b); clickable(b.body, "livro", b);
      });
    });
    for (const r of ROOMS) if (!r.subj && r.id !== "escritorio" && r.id !== "objetivos") sign(facePt(r, r.focus, 0.24, DH + 0.85), ryFront(r.focus), r.t, r.sub, "#C8A04A", 2.6, 0.62);
    buildPlaces(); renderIndex(); if (!hist.length && !fly) go(placeIdx, true); else label();
  }

  /* certificados: um em cada redoma, em roda do óculo */
  const CERTS = [
    { t: "Infomatrix 2025", s: "Credencial para a MILSET Expo 2026, em Fortaleza", p: "AcousticBuild" },
    { t: "XI FEBIC 2026", s: "2º lugar em Ciências Exatas e da Terra e credencial para a FoCiTeCu 2027, na Argentina", p: "AcousticBuild" },
    { t: "FEBRACE 2026", s: "Participação na Feira Brasileira de Ciências e Engenharia", p: "AcousticBuild" },
    { t: "DUAL International Fair 2025", s: "Participação", p: "AcousticBuild" },
    { t: "DUAL International Fair 2026", s: "Participação", p: "AcousticBuild" },
    { t: "Iniciação Científica", s: "Pesquisa das normas EN 12354 e do cálculo de ruído", p: "SESI SENAI" },
  ];
  function certTexture(cf) {
    const c = document.createElement("canvas"); c.width = 384; c.height = 512; const g = c.getContext("2d");
    g.fillStyle = "#EFE3C6"; g.fillRect(0, 0, 384, 512); g.strokeStyle = "#B88A40"; g.lineWidth = 8; g.strokeRect(16, 16, 352, 480); g.lineWidth = 2; g.strokeRect(30, 30, 324, 452);
    g.fillStyle = "#8A6A2E"; g.textAlign = "center"; g.font = "500 15px 'Geist Mono', monospace"; g.fillText("CERTIFICADO", 192, 90);
    g.fillStyle = "#2A211A"; let fs = 34; g.font = `600 ${fs}px 'Shippori Mincho', serif`; while (g.measureText(cf.t).width > 300 && fs > 18) { fs -= 2; g.font = `600 ${fs}px 'Shippori Mincho', serif`; } g.fillText(cf.t, 192, 160);
    g.font = "italic 500 22px 'Cormorant Garamond', serif"; g.fillStyle = "#4A3C2E"; g.fillText("Fernando Rateke", 192, 220); g.fillText(cf.p, 192, 252);
    g.beginPath(); g.arc(192, 380, 46, 0, Math.PI * 2); g.fillStyle = "#C22026"; g.fill(); g.fillStyle = "#F4E9D2"; g.font = "800 26px 'Shippori Mincho', serif"; g.fillText("証", 192, 390);
    return new T.CanvasTexture(c);
  }
  const certItems = [];
  prop("redoma", (m) => {
    const r = room("certificados");
    CERTS.forEach((cf, k) => {
      const deg = [-22.5, 22.5, -67.5, 67.5, -112.5, 112.5][k], p = rel(r, deg, 4.4), a = r.fa + deg * Math.PI / 180;
      const g = place(m.clone(true), { at: p, h: 1.6, ry: lookC(r, p) });
      const card = new T.Mesh(new T.PlaneGeometry(0.3, 0.4), new T.MeshBasicMaterial({ map: certTexture(cf) }));
      card.position.copy(p).setY(r.c.y + 1.38); card.lookAt(r.c.x, r.c.y + 1.38, r.c.z); scene.add(card);
      lightAt(p.clone().setY(r.c.y + 1.9).lerp(r.c.clone().setY(r.c.y + 1.9), 0.08), "#FFD08A", 0.45, 0.02);
      const it = { cf, g, card, pos: p.clone().setY(r.c.y + 1.4), nx: -Math.cos(a), nz: -Math.sin(a) }; certItems.push(it); clickable(g, "cert", it); clickable(card, "cert", it);
    });
  }, 6);

  /* a Estante dos Visitantes, na Sala de Leitura */
  const visitorBooks = [];
  const VCOL = { madeira: "#6B4A2E", vermelho: "#8E2A24", azul: "#2E4A7A", verde: "#2F5A3A" };
  function addVisitors(list) {
    visitorBooks.forEach((b) => scene.remove(b.g)); visitorBooks.length = 0;
    const r = room("fim");
    list.slice(0, 16).forEach((e, k) => {
      const row = 1 + Math.floor(k / 4), slot = k % 4;
      const b = bookAt(r, r.focus, SLOT(slot, 4), row, e.nome || "Visitante", VCOL[e.cor] || VCOL.madeira, new Date(e.criado_em || Date.now()).toLocaleDateString("pt-BR"));
      b.visitor = e; visitorBooks.push(b); clickable(b.body, "visitante", b);
    });
  }
  function loadVisitors() {
    fetch("/api/ema", { cache: "no-store" }).then((r) => (r.ok ? r.json() : null)).then((d) => {
      let list = d && d.ok ? d.emas || [] : [];
      try { const mine = JSON.parse(localStorage.getItem("biblioteca-meus") || "[]"); list = mine.concat(list.filter((e) => !mine.some((m) => m.id === e.id))); } catch (e) { /* sem storage */ }
      addVisitors(list);
    }).catch(() => { try { addVisitors(JSON.parse(localStorage.getItem("biblioteca-meus") || "[]")); } catch (e) { /* nada */ } });
  }
  // as estantes que fecham as portas e as que contornam a lareira
  scene.add(new T.Mesh(CB.build(), structMat), new T.Mesh(CWb.build(), bookMat));

  /* ---------------- os lugares ---------------- */
  let places = [], placeIdx = 0;
  function roomPose(r) {
    const fd = faceDir(r.focus);
    if (r.id === "escritorio") return { pos: r.c.clone().addScaledVector(fd, -4.5).setY(r.c.y + 2.05), tgt: r.c.clone().addScaledVector(fd, AP).setY(r.c.y + 1.45) };
    let side = V3();
    if (r.rift != null) { const rd = faceDir(r.rift); side = rd.sub(fd.clone().multiplyScalar(rd.dot(fd))); if (side.length() > 0.1) side.normalize(); else side.set(0, 0, 0); }
    return { pos: r.c.clone().addScaledVector(fd, -2.7).addScaledVector(side, -0.8).setY(r.c.y + 2.0), tgt: r.c.clone().addScaledVector(fd, AP).addScaledVector(side, 1.4).setY(r.c.y + 1.75) };
  }
  function buildPlaces() {
    places = ROOMS.map((r) => ({ id: r.id, g: r.g, t: r.t, sub: r.sub || "", room: r, pose: roomPose(r) }));
    places.splice(1, 0, { id: "mesa", g: "O centro", t: "A mesa de trabalho", sub: "o recado, a busca e o contato", room: R0, pose: { pos: deskG.localToWorld(V3(1.85, 1.62, 0.62)), tgt: deskG.localToWorld(V3(-0.35, 0.92, -0.05)) } });
  }
  buildPlaces();

  /* ---------------- câmera: deslizar devagar, pelos corredores ---------------- */
  const cam = { pos: V3(0, EYE, 0), tgt: V3(0, EYE, 5), yaw: 0, pitch: 0, yawT: 0, pitchT: 0 };
  let fly = null, focus = null, lookReady = false; const lookS = V3();
  const smoother = (x) => x * x * x * (x * (x * 6 - 15) + 10);
  const sstep = (a, b, x) => { const v = Math.max(0, Math.min(1, (x - a) / (b - a))); return v * v * (3 - 2 * v); };
  function glide(pts, tgt, done, minDur = 2.2) {
    const end = pts[pts.length - 1];
    if (reduce) { cam.pos.copy(end); cam.tgt.copy(tgt); lookReady = false; if (done) done(); return; }
    const clean = [pts[0].clone()]; for (const p of pts.slice(1)) if (p.distanceTo(clean[clean.length - 1]) > 0.3) clean.push(p.clone());
    let curve = null, len = 0;
    if (clean.length >= 2) { curve = new T.CatmullRomCurve3(clean, false, "centripetal", 0.5); len = curve.getLength(); }
    if (Math.abs(cam.yaw) > 1e-3 || Math.abs(cam.pitch) > 1e-3) { const d = cam.tgt.clone().sub(cam.pos), r = d.length(), yw = Math.atan2(d.z, d.x) + cam.yaw, pt = Math.asin(Math.max(-0.99, Math.min(0.99, d.y / r))) + cam.pitch; cam.tgt.set(cam.pos.x + Math.cos(yw) * Math.cos(pt) * r, cam.pos.y + Math.sin(pt) * r, cam.pos.z + Math.sin(yw) * Math.cos(pt) * r); }
    cam.yaw = cam.pitch = cam.yawT = cam.pitchT = 0;
    const d0 = cam.tgt.clone().sub(cam.pos).normalize();
    fly = { curve, len, u: 0, dur: curve ? Math.min(9, Math.max(minDur, len / 4.6)) : 1.4, d0, t1: tgt.clone(), done };
    document.body.classList.add("flying");
  }
  const linkFace = (A, B) => { const l = A.links.find((x) => x.to === B); return l ? l.m : -1; };
  function corridorPts(A, m) {
    const B = A.links.find((x) => x.m === m).to, d = faceDir(m), y0 = A.c.y + EYE, y1 = B.c.y + EYE, sl = FACE[m].ramp ? (y1 - y0) / LR : 0;
    return [A.c.clone().addScaledVector(d, AP - 2.4).setY(y0), A.c.clone().addScaledVector(d, AP + 0.9).setY(y0 + sl * 0.9),
      B.c.clone().addScaledVector(d, -(AP + 0.9)).setY(y1 - sl * 0.9), B.c.clone().addScaledVector(d, -(AP - 2.4)).setY(y1)];
  }
  // longe demais para um corredor só: a biblioteca se dobra e a câmera aparece do outro lado
  const veil = $("dobra");
  function fold(p, done) {
    if (reduce) { cam.pos.copy(p.pose.pos); cam.tgt.copy(p.pose.tgt); lookReady = false; latKey = ""; if (done) done(); return; }
    fly = { hold: true }; veil.classList.add("on"); document.body.classList.add("flying");
    setTimeout(() => {
      const back = p.pose.pos.clone().sub(p.pose.tgt).setY(0).normalize();
      cam.pos.copy(p.pose.pos).addScaledVector(back, 1.8).add(V3(0, 0.3, 0)); cam.tgt.copy(p.pose.tgt); lookReady = false; cam.yaw = cam.pitch = 0;
      fly = null; glide([cam.pos.clone(), p.pose.pos.clone()], p.pose.tgt, done, 2.4);
      veil.classList.remove("on");
    }, 700);
  }
  function travel(A, p, done) {
    const B = p.room;
    if (A === B) { const mid = cam.pos.clone().lerp(p.pose.pos, 0.5); mid.y = Math.max(cam.pos.y, p.pose.pos.y) + 0.15; glide([cam.pos.clone(), mid, p.pose.pos], p.pose.tgt, done); return; }
    const m = linkFace(A, B);
    if (m >= 0) { const mid = A.c.clone().addScaledVector(faceDir(m), 1.2).setY(A.c.y + 1.85); glide([cam.pos.clone(), mid, ...corridorPts(A, m), p.pose.pos], p.pose.tgt, done, 3.2); return; } // passa pelo meio da sala, longe dos móveis
    fold(p, done);
  }

  /* ---------------- navegação ---------------- */
  const cur = () => places[placeIdx];
  const hist = []; let quietT = 0;
  function label() {
    $("aquiK").textContent = cur().g; $("aquiT").textContent = cur().t; $("voltar").hidden = !hist.length;
    const nav = $("nav"); nav.classList.remove("quiet"); clearTimeout(quietT); quietT = setTimeout(() => nav.classList.add("quiet"), 4200);
  }
  function go(i, instant = false, fromBack = false, done) {
    if (typeof i === "string") i = places.findIndex((p) => p.id === i);
    if (i < 0 || i >= places.length) return;
    closePanel(true); closeIndex(); focus = null; hotC = null; canvas.classList.remove("hot"); rotulo.classList.remove("on");
    const from = cur(), to = places[i];
    if (!fromBack && !instant && i !== placeIdx) { hist.push(placeIdx); if (hist.length > 30) hist.shift(); }
    placeIdx = i;
    if (instant) { cam.pos.copy(to.pose.pos); cam.tgt.copy(to.pose.tgt); lookReady = false; if (done) done(); }
    else if (fly) fold(to, done); else travel(from.room, to, done);
    label(); renderIndex(); hint();
  }
  function back() { if (panel.classList.contains("open")) { closePanel(); return; } const i = hist.pop(); if (i != null) go(i, false, true); $("voltar").hidden = !hist.length; }
  $("voltar").addEventListener("click", back);
  function renderIndex() {
    const groups = []; places.forEach((p, i) => { let g = groups.find((x) => x.g === p.g); if (!g) groups.push(g = { g: p.g, items: [] }); g.items.push([p, i]); });
    $("listaLugares").innerHTML = groups.map((g) => `<li class="grp">${esc(g.g)}</li>` + g.items.map(([p, i]) => `<li><button type="button" data-i="${i}" ${i === placeIdx ? 'aria-current="true"' : ""}><b>${esc(p.t)}</b><span>${esc(p.sub || "")}</span></button></li>`).join("")).join("");
  }
  const idx = $("indice");
  const openIndex = () => { idx.classList.add("open"); idx.setAttribute("aria-hidden", "false"); };
  const closeIndex = () => { idx.classList.remove("open"); idx.setAttribute("aria-hidden", "true"); };
  $("abrirIndice").addEventListener("click", openIndex); $("fecharIndice").addEventListener("click", closeIndex);
  $("aqui").addEventListener("click", openIndex); $("aqui").addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); openIndex(); } });
  $("listaLugares").addEventListener("click", (e) => { const b = e.target.closest("button[data-i]"); if (b) go(+b.dataset.i); });
  let hinted = false; function hint() { if (hinted) return; hinted = true; setTimeout(() => $("dica").classList.add("off"), 7000); }

  /* ---------------- painel, avisos e o recado ---------------- */
  const panel = $("painel"); let openThing = null;
  const esc = (s) => String(s || "").replace(/[&<>"]/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[ch]));
  function showPanel(kick, title, html, thing) {
    openThing = thing || null; $("pKick").textContent = kick; $("pTitulo").textContent = title; $("pCorpo").innerHTML = html;
    panel.classList.add("open"); panel.setAttribute("aria-hidden", "false");
  }
  function closePanel(silent) { if (!panel.classList.contains("open")) return; panel.classList.remove("open"); panel.setAttribute("aria-hidden", "true"); openThing = null; books.concat(visitorBooks).forEach((b) => (b.open = false)); if (focus) { focus = null; if (!silent) glide([cam.pos.clone(), cur().pose.pos], cur().pose.tgt, null, 1.8); } }
  $("pFechar").addEventListener("click", () => closePanel());
  $("pCorpo").addEventListener("click", (e) => { const a = e.target.closest("[data-go]"); if (a) { e.preventDefault(); go(a.dataset.go); } });
  let toastT = 0;
  function toast(k, t, s) { $("avisoK").textContent = k; $("avisoT").textContent = t; $("avisoS").textContent = s || ""; const el = $("aviso"); el.classList.add("on"); clearTimeout(toastT); toastT = setTimeout(() => el.classList.remove("on"), 3600); }
  function openBook(b) {
    books.forEach((o) => (o.open = o === b));
    const k = (b.a.k || []).map(([code, txt]) => `<li><b>${esc(code)}</b>${esc(txt)}</li>`).join("");
    const l = (b.a.l || []).map(([txt, url]) => `<a href="${esc(url)}" target="_blank" rel="noopener">${esc(txt)}</a>`).join("");
    const img = b.a.img ? `<img src="${esc(/^https?:/.test(b.a.img) ? b.a.img : "/vale/" + b.a.img)}" alt="" loading="lazy">` : "";
    showPanel(`${b.sub.name} · ${b.a.s || ""}`, b.a.t, img + `<p>${esc(b.a.r)}</p>` + (k ? `<h3>Competências</h3><ul class="k">${k}</ul>` : "") + (l ? `<h3>Ver</h3><div class="links">${l}</div>` : ""), b);
    focusOn(b.g.position, b.nx, b.nz, 1.35);
  }
  function focusOn(p, nx, nz, dist) { focus = { pos: V3(p.x + nx * dist, p.y + 0.14, p.z + nz * dist), tgt: V3(p.x, p.y + 0.15, p.z) }; glide([cam.pos.clone(), focus.pos], focus.tgt, null, 1.8); }
  function formRecado() {
    const nome = (window.visitante && window.visitante.nome && window.visitante.nome()) || "";
    showPanel("A Estante dos Visitantes", "Deixe um livro na estante", `<p>Escreva um recado. Ele vira um livro na Estante dos Visitantes, na Sala de Leitura, e fica lá para quem vier depois.</p>
      <form id="fRecado"><label>Seu nome<input name="nome" maxlength="30" value="${esc(nome)}" required></label><label>Recado<textarea name="recado" rows="4" maxlength="140" required></textarea></label>
      <input class="trap" name="site" tabindex="-1" autocomplete="off"><button class="btn" type="submit">Pôr na estante</button><p class="note" id="fNota">Até 140 letras. Os recados aparecem para todos depois de lidos e aprovados.</p></form>`);
    $("fRecado").addEventListener("submit", (e) => {
      e.preventDefault(); const f = e.target, body = { nome: f.nome.value, recado: f.recado.value, cor: ["madeira", "vermelho", "azul", "verde"][Math.floor(Math.random() * 4)], site: f.site.value };
      $("fNota").textContent = "Levando o livro até a estante…";
      fetch("/api/ema", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }).then((r) => r.json().then((d) => ({ ok: r.ok, d }))).then(({ ok, d }) => {
        if (!ok || !d.ok) { $("fNota").textContent = d && d.motivo === "espere" ? "Calma: um recado a cada 30 segundos." : d && d.motivo === "filtro" ? "Esse recado não passou no filtro (sem links nem palavrões)." : "Não deu para guardar agora. Tente de novo daqui a pouco."; return; }
        const mine = { id: d.ema && d.ema.id, nome: body.nome, recado: body.recado, cor: body.cor, criado_em: new Date().toISOString(), meu: true };
        try { const arr = JSON.parse(localStorage.getItem("biblioteca-meus") || "[]"); arr.unshift(mine); localStorage.setItem("biblioteca-meus", JSON.stringify(arr.slice(0, 6))); } catch (er) { /* sem storage */ }
        loadVisitors(); closePanel(); toast("Estante dos Visitantes", "Seu livro está na estante", d.moderado ? "Os outros visitantes vão vê-lo assim que for aprovado." : "");
        go("fim");
      }).catch(() => { $("fNota").textContent = "Sem conexão com a estante agora."; });
    });
  }
  let music = null;
  function toggleMusic() {
    if (!music) { music = new Audio("/vale/audio/trem.mp3"); music.loop = true; music.volume = 0.6; }
    if (music.paused) { music.play().then(() => toast("Gramofone", "Tocando", "Toque de novo no gramofone para parar.")).catch(() => {}); } else { music.pause(); toast("Gramofone", "Parado", ""); }
  }
  function activate(c) {
    switch (c.kind) {
      case "livro": openBook(c.data); break;
      case "mundo": toast(c.data.s, c.data.t, "Este mundo ainda está sendo construído. A fenda já está aberta, falta o outro lado."); break;
      case "recado": formRecado(); break;
      case "busca": openIndex(); setTimeout(() => busca.focus(), 350); break;
      case "indice": openIndex(); break;
      case "mundos": showPanel("Os mundos", "Dez fendas, dez mundos", `<p>Cada parte do portfólio tem uma fenda para um mundo, numa porta da sala dela. Escolha uma para ir até lá.</p><div class="links">${rifts.map((w) => `<a href="#" data-go="${w.room.id}">${esc(w.t)} · ${esc(w.s)}</a>`).join("")}</div>`); break;
      case "mesa": go("mesa"); break;
      case "porta": go(places.findIndex((p) => p.room === c.data.to && p.id !== "mesa")); break;
      case "musica": toggleMusic(); break;
      case "contato": showPanel("Contato", "Fernando Rateke", `<p>Estudante do Ensino Médio integrado ao Técnico em Análise e Desenvolvimento de Sistemas, no SESI SENAI, em Florianópolis.</p><div class="links"><a href="mailto:fernando_rateke-n@estudante.sesisenai.org.br">E-mail</a><a href="https://github.com/fernando-rateke" target="_blank" rel="noopener">GitHub</a></div>`); break;
      case "sobre": showPanel("Rateke", "Fernando Rateke · Portfólio 2026", `<p>Esta biblioteca não tem fim: cada sala tem oito portas, e cada porta dá num corredor que segue na diagonal ou numa rampa que sobe ou desce até outra sala, com mais portas. Dezesseis delas guardam este portfólio; o resto continua para sempre.</p><p>Clique numa porta para seguir pelo corredor. A placa em cima diz para onde ela leva. O Mapa leva a qualquer sala.</p>`); break;
      case "cert": showPanel("Certificado", c.data.cf.t, `<p>${esc(c.data.cf.s)}</p><p class="note">${esc(c.data.cf.p)}</p>`); focusOn(c.data.pos, c.data.nx, c.data.nz, 1.4); break;
      case "visitante": c.data.open = true; showPanel(`Estante dos Visitantes · ${new Date(c.data.visitor.criado_em || Date.now()).toLocaleDateString("pt-BR")}`, c.data.visitor.nome || "Visitante", `<p>${esc(c.data.visitor.recado)}</p>` + (c.data.visitor.meu ? `<p class="note">Este é o seu. Ele aparece para todos depois de aprovado.</p>` : "")); focusOn(c.data.g.position, c.data.nx, c.data.nz, 1.35); break;
    }
  }

  /* ---------------- busca (dentro do mapa) ---------------- */
  const norm = (s) => String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
  const busca = $("busca"), res = $("resultados");
  busca.addEventListener("input", () => {
    const q = norm(busca.value.trim()); books.forEach((b) => (b.match = 0));
    if (!q) { res.hidden = true; res.innerHTML = ""; return; }
    const found = books.filter((b) => norm(b.a.t + " " + b.sub.name + " " + (b.a.s || "") + " " + (b.a.r || "")).includes(q)); found.forEach((b) => (b.match = 1));
    res.innerHTML = found.length ? found.slice(0, 10).map((b) => `<li><button type="button" data-id="${b.id}"><b>${esc(b.a.t)}</b><span>${esc(b.sub.name)}</span></button></li>`).join("") : `<li class="none">Nenhum livro com isso nas estantes.</li>`;
    res.hidden = false;
  });
  res.addEventListener("click", (e) => { const bt = e.target.closest("button[data-id]"); if (!bt) return; const b = books.find((o) => o.id === bt.dataset.id); if (!b) return; res.hidden = true; busca.value = ""; books.forEach((o) => (o.match = 0)); busca.blur(); closeIndex(); const pi = places.findIndex((p) => p.room === b.room && p.id !== "mesa"); if (pi === placeIdx || pi < 0) openBook(b); else go(pi, false, false, () => openBook(b)); });
  busca.addEventListener("keydown", (e) => { if (e.key === "Enter") { const f = res.querySelector("button[data-id]"); if (f) f.click(); } });

  /* ---------------- entradas: teclado, arrastar para olhar, clicar ---------------- */
  addEventListener("keydown", (e) => {
    if (e.target && /INPUT|TEXTAREA/.test(e.target.tagName)) { if (e.key === "Escape") e.target.blur(); return; }
    if (e.key === "Backspace") { e.preventDefault(); back(); }
    else if (e.key === "Escape") { closePanel(); closeIndex(); }
    else if (e.key === "/") { e.preventDefault(); openIndex(); setTimeout(() => busca.focus(), 350); }
    else if (e.key.toLowerCase() === "m") openIndex();
  });
  const ptr = new T.Vector2(); let drag = null, hotC = null;
  canvas.addEventListener("pointerdown", (e) => { drag = { id: e.pointerId, x: e.clientX, y: e.clientY, moved: 0 }; canvas.setPointerCapture(e.pointerId); canvas.classList.add("drag"); });
  canvas.addEventListener("pointermove", (e) => {
    ptr.set(e.clientX / innerWidth * 2 - 1, -(e.clientY / innerHeight) * 2 + 1);
    if (drag && drag.id === e.pointerId) { const dx = e.clientX - drag.x, dy = e.clientY - drag.y; drag.x = e.clientX; drag.y = e.clientY; drag.moved += Math.abs(dx) + Math.abs(dy); look(dx, dy); }
    else if (e.pointerType === "mouse") hover(ptr);
  });
  canvas.addEventListener("pointerup", (e) => { if (!drag || drag.id !== e.pointerId) return; canvas.classList.remove("drag"); if (drag.moved < 7) { ptr.set(e.clientX / innerWidth * 2 - 1, -(e.clientY / innerHeight) * 2 + 1); clickAt(ptr); } drag = null; });
  canvas.addEventListener("pointercancel", () => { drag = null; canvas.classList.remove("drag"); });
  function look(dx, dy) { if (fly) return; cam.yawT -= dx * 0.0032; cam.pitchT = Math.max(-0.3, Math.min(0.3, cam.pitchT - dy * 0.003)); }
  const rc = new T.Raycaster();
  function pick(p) { rc.setFromCamera(p, camera); const h = rc.intersectObjects(clickables, false)[0]; return h && h.distance < 30 ? h.object.userData.click : null; }
  const rotulo = $("rotulo");
  function labelOf(c) {
    if (c.label) return c.label;
    const d = c.data || {};
    if (c.kind === "livro") return [d.a && d.a.t || "Atividade", "Abrir"];
    if (c.kind === "mundo") return [d.t, d.s + " · em construção"];
    if (c.kind === "porta") return [d.to.t, FACE[d.m].ramp ? (FACE[d.m].up ? "subir a rampa" : "descer a rampa") : "seguir pelo corredor"];
    if (c.kind === "cert") return ["Certificado", d.cf && d.cf.t || "Ver de perto"];
    if (c.kind === "visitante") return [d.visitor && d.visitor.nome || "Visitante", "Ler o recado"];
    return [c.kind, ""];
  }
  function hover(p) {
    const c = fly || panel.classList.contains("open") ? null : pick(p);
    if (c !== hotC) { hotC = c; canvas.classList.toggle("hot", !!c);
      if (c) { const [t, sub] = labelOf(c); rotulo.innerHTML = `<b>${esc(t)}</b>${sub ? `<span>${esc(sub)}</span>` : ""}`; }
      rotulo.classList.toggle("on", !!c); }
    if (c) { const x = (p.x * 0.5 + 0.5) * innerWidth, y = (-p.y * 0.5 + 0.5) * innerHeight, w = rotulo.offsetWidth;
      rotulo.style.transform = `translate(${Math.min(innerWidth - w - 10, x + 18)}px, ${Math.max(10, y - 46)}px)`; }
  }
  function clickAt(p) { const c = pick(p); if (c) activate(c); }

  /* ---------------- o controle pelo celular fala por aqui ---------------- */
  window.biblioteca = {
    go, back, places: () => places.map((p, i) => ({ i, id: p.id, t: p.t, g: p.g, sub: p.sub || "" })),
    view: (p, t) => glide([cam.pos.clone(), V3(...p)], V3(...t)),
    doors: () => doors.filter((d) => d.r === cur().room).map((d) => { const v = d.mesh.position.clone().project(camera); return { to: d.to.id, x: Math.round((v.x * 0.5 + 0.5) * innerWidth), y: Math.round((-v.y * 0.5 + 0.5) * innerHeight), front: v.z < 1 && Math.abs(v.x) < 1 && Math.abs(v.y) < 1 }; }),
    look, pointer: (nx, ny) => { ptr.set(nx, ny); hover(ptr); return !!hotC; }, click: (nx, ny) => clickAt(new T.Vector2(nx, ny)),
    close: () => { closePanel(); closeIndex(); }, books: () => books.map((b) => ({ id: b.id, t: b.a.t, room: b.room.id })),
    openBook: (id) => { const b = books.find((o) => o.id === id); if (b) openBook(b); },
    state: () => ({ place: placeIdx, id: cur().id, flying: !!fly, u: fly && fly.u != null ? fly.u : null, panel: panel.classList.contains("open") }),
    time: (v) => { if (v != null) clockT = v; return clockT; },
  };

  /* ---------------- modo apresentação: o controle pelo celular ---------------- */
  // O computador mostra um QR; o primeiro celular que entra vira o controle. A conversa passa por um canal
  // em tempo real do Supabase (chave pública, nada é gravado); sem ele, por BroadcastChannel (mesmo navegador).
  let zoomT = 1, zoomK = 1;
  const Remote = (() => {
    const veu = $("veu"), cursorEl = $("cursor"), spot = $("lanterna"), light = $("lightbox"), chip = $("ctl");
    let code = null, phone = null, ch = null, bc = null, lastSeen = 0, lastState = "", on = false;
    const pos = { x: innerWidth / 2, y: innerHeight / 2 };
    const loadScript = (src) => new Promise((res, rej) => { const el = document.createElement("script"); el.src = src; el.onload = res; el.onerror = rej; document.head.appendChild(el); });
    const send = (m) => { m.code = code; try { if (ch) ch.send({ type: "broadcast", event: "m", payload: m }); if (bc) bc.postMessage(m); } catch (e) { /* sem canal */ } };
    async function connect() {
      if (ch || bc) return;
      let cfg = null; try { const r = await fetch("/api/config", { cache: "no-store" }); if (r.ok) cfg = await r.json(); } catch (e) { /* sem rota */ }
      if (cfg && cfg.ok) {
        try {
          if (!window.supabase) await loadScript("https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/dist/umd/supabase.min.js");
          const sb = window.supabase.createClient(cfg.url, cfg.key, { auth: { persistSession: false } });
          ch = sb.channel("controle-" + code, { config: { broadcast: { self: false } } });
          ch.on("broadcast", { event: "m" }, ({ payload }) => onMsg(payload)).subscribe();
        } catch (e) { ch = null; }
      }
      if (!ch && "BroadcastChannel" in window) { bc = new BroadcastChannel("controle-" + code); bc.onmessage = (e) => onMsg(e.data); }
    }
    async function open() {
      if (!code) code = Array.from(crypto.getRandomValues(new Uint8Array(6)), (b) => "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"[b % 32]).join("");
      $("veuCode").textContent = code; veu.classList.remove("lift"); veu.classList.add("on"); veu.setAttribute("aria-hidden", "false");
      const url = location.origin + "/controle#" + code;
      try { if (!window.qrcode) await loadScript("https://cdn.jsdelivr.net/npm/qrcode-generator@1.4.4/qrcode.min.js"); const q = window.qrcode(0, "M"); q.addData(url); q.make(); $("qr").innerHTML = q.createImgTag(6, 0, "QR code do controle"); }
      catch (e) { $("qr").innerHTML = `<div class="alt">Sem QR agora. No celular, abra<br><b>${esc(location.host)}/controle</b><br>e digite o código abaixo.</div>`; }
      $("qr").dataset.url = url;
      await connect();
    }
    function close() { if (phone) { veu.classList.add("lift"); } else { veu.classList.remove("on"); } veu.setAttribute("aria-hidden", "true"); }
    function paired() {
      on = true; veu.classList.add("lift"); veu.setAttribute("aria-hidden", "true"); document.body.classList.add("apresentando");
      cursorEl.classList.add("on"); chip.hidden = false; moveTo(innerWidth / 2, innerHeight / 2); lastState = ""; sendState(); closeIndex();
    }
    function unpair() { phone = null; on = false; document.body.classList.remove("apresentando"); cursorEl.classList.remove("on"); spot.classList.remove("on"); chip.hidden = true; }
    function moveTo(x, y) {
      pos.x = Math.max(0, Math.min(innerWidth - 1, x)); pos.y = Math.max(0, Math.min(innerHeight - 1, y));
      cursorEl.style.transform = `translate(${pos.x}px, ${pos.y}px)`; spot.style.setProperty("--x", pos.x + "px"); spot.style.setProperty("--y", pos.y + "px");
      const el = document.elementFromPoint(pos.x, pos.y); let hot = false;
      if (el === canvas) { ptr.set(pos.x / innerWidth * 2 - 1, -(pos.y / innerHeight) * 2 + 1); hover(ptr); hot = !!hotC; }
      else if (el && el.closest && el.closest("button, a, input, textarea, [role=button]")) hot = true;
      cursorEl.classList.toggle("hot", hot);
    }
    function clickHere() {
      cursorEl.classList.remove("tap"); void cursorEl.offsetWidth; cursorEl.classList.add("tap");
      if (light.classList.contains("on")) { light.classList.remove("on"); return; }
      const el = document.elementFromPoint(pos.x, pos.y);
      if (!el || el === canvas) { clickAt(new T.Vector2(pos.x / innerWidth * 2 - 1, -(pos.y / innerHeight) * 2 + 1)); return; }
      const t = el.closest("button, a, input, textarea, [role=button], li") || el;
      if (/INPUT|TEXTAREA/.test(t.tagName)) t.focus(); else t.click();
    }
    function zoom(onZ) {
      const img = panel.classList.contains("open") && $("pCorpo").querySelector("img");
      if (onZ && img) { $("lightImg").src = img.src; light.classList.add("on"); return; }
      if (!onZ) light.classList.remove("on");
      zoomT = onZ ? 0.45 : 1;
    }
    function scroll(dy) {
      if (panel.classList.contains("open")) $("pCorpo").scrollBy(0, dy);
      else if (idx.classList.contains("open")) idx.scrollBy(0, dy);
      else look(0, dy * 0.6);
    }
    function sendState() {
      if (!phone) return;
      const st = { t: "state", phone, place: placeIdx, id: cur().id, title: cur().t, sub: cur().sub || "", g: cur().g, back: hist.length > 0, panel: panel.classList.contains("open"), music: !!(music && !music.paused), places: places.map((p, i) => ({ i, id: p.id, t: p.t, g: p.g, sub: p.sub || "" })) };
      const js = JSON.stringify(st); if (js === lastState) return; lastState = js; send(st);
    }
    setInterval(() => { if (phone) { sendState(); if (performance.now() - lastSeen > 20000) chip.querySelector("span").textContent = "Controle sem sinal"; else chip.querySelector("span").textContent = "Controle conectado"; } }, 400);
    setInterval(() => { if (phone) { lastState = ""; sendState(); } }, 5000); // reenvia de vez em quando, caso algo se perca
    function onMsg(m) {
      if (!m || m.code !== code) return;
      if (m.t === "hello") {
        if (!phone || phone === m.phone || performance.now() - lastSeen > 20000) { phone = m.phone; lastSeen = performance.now(); paired(); send({ t: "paired", phone }); }
        else send({ t: "busy", phone: m.phone });
        return;
      }
      if (m.phone !== phone) return; lastSeen = performance.now();
      switch (m.t) {
        case "move": moveTo(pos.x + m.dx * innerWidth, pos.y + m.dy * innerWidth); break;
        case "click": clickHere(); break;
        case "look": look(m.dx, m.dy); break;
        case "scroll": scroll(m.dy); break;
        case "back": back(); break;
        case "go": go(m.i); break;
        case "close": closePanel(); closeIndex(); light.classList.remove("on"); zoomT = 1; break;
        case "zoom": zoom(!!m.on); break;
        case "spot": spot.classList.toggle("on", !!m.on); break;
        case "music": toggleMusic(); break;
        case "home": go(0); break;
        case "bye": unpair(); break;
      }
      sendState();
    }
    $("apresentar").addEventListener("click", open); $("veuFechar").addEventListener("click", close);
    addEventListener("keydown", (e) => { if (e.target && /INPUT|TEXTAREA/.test(e.target.tagName)) return; if (e.key.toLowerCase() === "p") { if (veu.classList.contains("on") && !veu.classList.contains("lift")) close(); else open(); } else if (e.key === "Escape" && veu.classList.contains("on") && !phone) close(); });
    return { open, close, state: () => ({ code, phone, on, pos: { ...pos } }) };
  })();
  window.biblioteca.remote = Remote;

  /* ---------------- acabamento de imagem ---------------- */
  const rt = new T.WebGLRenderTarget(2, 2, { depthBuffer: true });
  const post = new T.Mesh(new T.PlaneGeometry(2, 2), new T.ShaderMaterial({
    uniforms: { tDiff: { value: rt.texture }, uRes: { value: new T.Vector2(1, 1) }, uTime: U.uTime }, depthTest: false, depthWrite: false,
    vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`,
    fragmentShader: `uniform sampler2D tDiff; uniform vec2 uRes; uniform float uTime; varying vec2 vUv;
      float hh(vec2 p){ return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
      void main(){
        vec3 c = texture2D(tDiff, vUv).rgb; vec2 px = 1.0 / uRes;
        ${small ? "" : `vec3 b = vec3(0.0);
        for (int i = 0; i < 12; i++) { float a = float(i) * 0.5236; vec2 o = vec2(cos(a), sin(a));
          b += max(texture2D(tDiff, vUv + o * px * 7.0).rgb - 0.55, 0.0) + max(texture2D(tDiff, vUv + o * px * 18.0).rgb - 0.6, 0.0) * 0.7; }
        c += b * 0.075;`}
        c = pow(max(c, 0.0), vec3(0.97, 1.0, 1.07)) * vec3(1.04, 1.0, 0.93);
        float l = dot(c, vec3(0.3, 0.59, 0.11)); c = mix(vec3(l), c, 0.9);
        c = c * 1.06 + vec3(0.012, 0.008, 0.004);
        vec2 q = vUv - 0.5; float vig = smoothstep(0.85, 0.2, length(q * vec2(1.0, 0.85)) * 1.25); c *= mix(0.32, 1.0, vig);
        c += (hh(vUv * uRes + fract(uTime * 7.0) * 100.0) - 0.5) * 0.04;
        gl_FragColor = vec4(c, 1.0);
      }`,
  }));
  const postScene = new T.Scene(); postScene.add(post); const postCam = new T.OrthographicCamera(-1, 1, 1, -1, 0, 1);

  /* ---------------- laço ---------------- */
  let baseFov = 62;
  function resize() { const w = innerWidth, h = innerHeight; renderer.setSize(w, h, false); rt.setSize(Math.floor(w * DPR), Math.floor(h * DPR)); post.material.uniforms.uRes.value.set(w * DPR, h * DPR); camera.aspect = w / h; baseFov = w / h < 0.8 ? 78 : 62; camera.fov = baseFov * zoomK; camera.updateProjectionMatrix(); }
  addEventListener("resize", resize); resize();
  const clock = new T.Clock(); let clockT = 0; const tmp = new T.Vector3(), tmp2 = new T.Vector3(), la = new T.Vector3(), dirv = new T.Vector3();
  function frame() {
    const dt = Math.min(0.05, clock.getDelta()); clockT += dt; const t = clockT; U.uTime.value = t;
    if (fly && !fly.hold) {
      fly.u = Math.min(1, fly.u + dt / fly.dur); const e = smoother(fly.u);
      if (fly.curve) { fly.curve.getPointAt(e, cam.pos); fly.curve.getPointAt(Math.min(1, e + 3.5 / Math.max(fly.len, 0.01)), la); } else la.copy(cam.pos).add(fly.d0);
      const dPath = tmp.copy(la).sub(cam.pos); if (dPath.lengthSq() < 1e-6) dPath.copy(fly.d0); dPath.normalize(); dPath.y = Math.max(-0.35, Math.min(0.35, dPath.y)); dPath.normalize();
      const dEnd = tmp2.copy(fly.t1).sub(cam.pos).normalize();
      const a = fly.curve ? sstep(0, 0.3, fly.u) : 0, b = fly.curve ? sstep(0.55, 1, fly.u) : smoother(fly.u);
      dirv.copy(fly.d0).lerp(dPath, a).lerp(dEnd, b).normalize();
      cam.tgt.copy(cam.pos).addScaledVector(dirv, Math.max(1, 6 + (fly.t1.distanceTo(cam.pos) - 6) * b));
      if (fly.u >= 1) { cam.tgt.copy(fly.t1); const d = fly.done; fly = null; document.body.classList.remove("flying"); if (d) d(); }
    }
    const k = 1 - Math.exp(-dt * 3.5); cam.yaw += (cam.yawT - cam.yaw) * k; cam.pitch += (cam.pitchT - cam.pitch) * k;
    const br = reduce ? 0 : Math.sin(t * 0.5) * 0.012;
    camera.position.copy(cam.pos); camera.position.y += br;
    const dir = tmp.subVectors(cam.tgt, cam.pos).normalize();
    const yaw = Math.atan2(dir.z, dir.x) + cam.yaw, pitch = Math.asin(Math.max(-0.99, Math.min(0.99, dir.y))) + cam.pitch;
    la.set(cam.pos.x + Math.cos(yaw) * Math.cos(pitch) * 8, cam.pos.y + Math.sin(pitch) * 8, cam.pos.z + Math.sin(yaw) * Math.cos(pitch) * 8);
    if (!lookReady) { lookS.copy(la); lookReady = true; } else lookS.lerp(la, 1 - Math.exp(-dt * 9));
    camera.lookAt(lookS);
    if (Math.abs(zoomT - zoomK) > 0.001) { zoomK += (zoomT - zoomK) * Math.min(1, dt * 3); camera.fov = baseFov * zoomK; camera.updateProjectionMatrix(); }
    placeLattice(); updateLights(t);
    // poeira acompanha a câmera
    const P = dust.geometry.attributes.position.array;
    for (let i = 0; i < DUST; i++) { let x = P[i * 3], y = P[i * 3 + 1], z = P[i * 3 + 2]; y += dt * (0.04 + ds[i] * 0.07); x += Math.sin(t * 0.3 + i) * dt * 0.06; const cx = cam.pos.x, cz = cam.pos.z, cy = cam.pos.y;
      if (y > cy + 5) y = cy - 3; if (y < cy - 4) y = cy + 4; if (x - cx > 11) x -= 22; if (x - cx < -11) x += 22; if (z - cz > 11) z -= 22; if (z - cz < -11) z += 22; P[i * 3] = x; P[i * 3 + 1] = y; P[i * 3 + 2] = z; }
    dust.geometry.attributes.position.needsUpdate = true;
    // brasas da lareira: sobem do fogo, algumas escapam um pouco para a sala
    const E = embers.geometry.attributes.position.array;
    for (let i = 0; i < EMB; i++) { const q = (t * (0.25 + es[i] * 0.3) + es[i]) % 1, out = es[i] > 0.8 ? 0.9 : 0.12, side = (es[i] - 0.5) * 0.8 + Math.sin(t * 1.3 + i) * 0.1, fw = 0.05 + q * out + Math.sin(t * 2 + i) * 0.04;
      E[i * 3] = FIRE.x + FIREN.x * fw + FIRET.x * side; E[i * 3 + 1] = R0.c.y + 0.25 + q * (es[i] > 0.8 ? 1.6 : 1.0); E[i * 3 + 2] = FIRE.z + FIREN.z * fw + FIRET.z * side; }
    embers.geometry.attributes.position.needsUpdate = true; embers.material.opacity = 0.75 + 0.25 * Math.sin(t * 9);
    fireGroup.rotation.y = Math.atan2(camera.position.x - FIRE.x, camera.position.z - FIRE.z);
    for (let i = 0; i < propHot.length; i++) { const c = propHot[i]; c.hot += ((hotC === c ? 1 : 0) - c.hot) * Math.min(1, dt * 7); const v = 0.1 + 0.1 * Math.sin(t * 2.1 + i * 1.7) + c.hot * 1.1; for (const m of c.mats) m.uniforms.uHot.value = v; }
    if (fly && hotC) { hotC = null; canvas.classList.remove("hot"); rotulo.classList.remove("on"); }
    for (const d of doors) { const h = hotC && hotC.data === d ? 1 : 0; d.hot += (h - d.hot) * Math.min(1, dt * 6); d.mesh.material.opacity = 0.07 + 0.035 * Math.sin(t * 1.6 + d.m) + d.hot * 0.32; }
    // livros, fendas, certificados
    for (const b of books.concat(visitorBooks)) {
      const target = b.open ? 1 : hotC && hotC.data === b ? 0.4 : 0; b.out += (target - b.out) * Math.min(1, dt * 6);
      b.body.position.set(0, 0.19 + b.out * 0.05, b.out * 0.16); b.body.rotation.x = -b.out * 0.12;
      b.mats.forEach((m) => { m.uniforms.uHot.value = b.out; m.uniforms.uMatch.value = b.match; });
      b.halo.material.opacity = 0.3 + 0.14 * Math.sin(t * 2.2 + b.g.position.x) + b.out * 0.25 + b.match * 0.45;
    }
    for (const w of rifts) if (w.mat) { const h = hotC && hotC.data === w ? 1 : 0; w.mat.uniforms.uHot.value += (h - w.mat.uniforms.uHot.value) * Math.min(1, dt * 6); w.halo.material.opacity = 0.28 + 0.08 * Math.sin(t * 1.7 + w.k) + w.mat.uniforms.uHot.value * 0.3; }
    renderer.setRenderTarget(rt); renderer.render(scene, camera); renderer.setRenderTarget(null); renderer.render(postScene, postCam);
    requestAnimationFrame(frame);
  }

  /* ---------------- abertura ---------------- */
  const fontsReady = document.fonts ? document.fonts.ready.catch(() => null) : Promise.resolve();
  fetch("/biblioteca/atividades.json").then((r) => (r.ok ? r.json() : [])).catch(() => []).then((list) => fontsReady.then(() => list)).then((list) => {
    try { addActivityBooks(list || []); } catch (e) { console.warn("livros", e); }
    loadVisitors();
  });
  renderIndex(); go(0, true); placeLattice(true);
  requestAnimationFrame(frame);
  setTimeout(() => $("fade").classList.add("gone"), 500);
})();
