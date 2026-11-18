/* Biblioteca Infinita (v2): um portfólio de lugares, como o vale. A câmera voa de um lugar ao outro;
   ninguém anda. O Grande Salão (galerias de estantes subindo até sumirem na névoa, lareira, mesa de
   trabalho e as fendas para os mundos) leva, pela porta de madeira, às salas das matérias, aos
   certificados e, no fim, à sala de leitura com a Estante dos Visitantes, onde se fica para sempre.
   Atmosfera: luz amarela de verdade (as 16 luzes mais próximas), neblina que se mexe, feixes de luz,
   brasas, poeira e um acabamento de imagem (brilho, vinheta, grão).
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
  const camera = new T.PerspectiveCamera(58, 1, 0.05, 260);

  /* ---------------- medidas ---------------- */
  const R = 7, A = R * Math.sqrt(3) / 2, C = 2.4, D = 2 * A + C, H = 5.4, CEIL = 5.0;
  const RS = 2.3, RSA = RS * Math.sqrt(3) / 2, DOOR = 1.1, DOORH = 3.2, SHELF_TOP = 4.6, ROW = 0.6, BASE = 0.25;
  const XE = -A, HL = 30, XW = XE - HL, HZ = 11, BD = 2.6, LV = small ? 5 : 7; // o salão
  const CERT = 10, FIM = 11;                         // salas especiais da ala das matérias
  const NR = small ? 2 : 3, NF = small ? 2 : 3;
  const EYE = 1.72;

  const NL = 16;
  const U = {
    uTime: { value: 0 }, uD: { value: D }, uH: { value: H }, uXE: { value: XE },
    uFog: { value: new T.Color("#0b0806") }, uFogD: { value: small ? 0.04 : 0.036 },
    uAmb: { value: new T.Vector3(0.05, 0.042, 0.034) },
    uLP: { value: Array.from({ length: NL }, () => new T.Vector3(0, -999, 0)) },
    uLC: { value: Array.from({ length: NL }, () => new T.Vector3()) },
  };

  /* luz e névoa comuns a tudo */
  const COMMON = `
    uniform float uTime, uD, uH, uXE, uFogD; uniform vec3 uFog, uAmb;
    uniform vec3 uLP[${NL}]; uniform vec3 uLC[${NL}];
    float h1(float n){ return fract(sin(n) * 43758.5453123); }
    float h2(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123); }
    float h3(vec3 p){ return fract(sin(dot(p, vec3(17.1, 113.3, 57.7))) * 43758.5453); }
    float vnoise(vec3 p){ vec3 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
      return mix(mix(mix(h3(i), h3(i + vec3(1,0,0)), f.x), mix(h3(i + vec3(0,1,0)), h3(i + vec3(1,1,0)), f.x), f.y),
                 mix(mix(h3(i + vec3(0,0,1)), h3(i + vec3(1,0,1)), f.x), mix(h3(i + vec3(0,1,1)), h3(i + vec3(1,1,1)), f.x), f.y), f.z); }
    float hexD(vec2 p){ p = abs(p); return max(p.x, dot(p, vec2(0.5, 0.8660254))); }
    vec3 roomLocal(vec3 w){ return vec3(mod(w.x + uD * 0.5, uD) - uD * 0.5, mod(w.y, uH), w.z); }
    vec3 scat;
    vec3 lights(vec3 w, vec3 n){
      vec3 acc = uAmb; scat = vec3(0.0);
      for (int i = 0; i < ${NL}; i++) {
        vec3 d = uLP[i] - w; float dd = dot(d, d) + 0.05; float inv = inversesqrt(dd);
        float ndl = max(dot(n, d * inv), 0.0) * 0.8 + 0.2;
        acc += uLC[i] * ndl / (1.0 + dd * 0.16);
        scat += uLC[i] / (1.0 + dd * 0.045);
      }
      if (w.x > uXE - 0.2) { vec3 l = roomLocal(w); float r = length(l.xz); acc += vec3(0.30, 0.36, 0.50) * 0.2 * exp(-r * 0.6) * (0.5 + 0.5 * n.y * n.y); }
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
        if (vW.x > uXE) {
          vec3 l = roomLocal(vW); float hd = hexD(l.zx);
          float rug = smoothstep(2.62, 2.66, hd) * (1.0 - smoothstep(4.34, 4.38, hd));
          float border = (1.0 - smoothstep(0.03, 0.05, abs(hd - 2.82))) + (1.0 - smoothstep(0.03, 0.05, abs(hd - 4.18)));
          float motif = step(0.5, fract((atan(l.z, l.x) * 6.0 / 3.14159) * 2.0)) * (1.0 - smoothstep(0.08, 0.12, abs(hd - 3.5)));
          vec3 rugC = mix(vec3(0.34, 0.08, 0.07), vec3(0.22, 0.05, 0.05), motif);
          rugC = mix(rugC, vec3(0.72, 0.52, 0.22), clamp(border, 0.0, 1.0)); c = mix(c, rugC, rug);
        }
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
      float seed = vK * 3.17 + floor(vO.x / uD + 0.5) * 13.1 + floor(vO.y / uH + 0.5) * 7.7;
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
  const PROP_FS = `${COMMON} uniform sampler2D map; uniform float uHasMap, uEmit, uHot, uCut; uniform vec3 uTint, uEmitC; varying vec3 vW; varying vec3 vN; varying vec2 vUv;
    void main(){
      vec4 tx = uHasMap > 0.5 ? texture2D(map, vUv) : vec4(1.0);
      if (tx.a < uCut) discard;
      vec3 n = normalize(vN); if (!gl_FrontFacing) n = -n;
      vec3 c = tx.rgb * uTint;
      vec3 lit = band(lights(vW, n));
      vec3 V = normalize(cameraPosition - vW); float rim = pow(1.0 - max(dot(n, V), 0.0), 3.0);
      vec3 col = c * lit + c * uEmitC * uEmit + rim * scat * 0.05 + vec3(1.0, 0.8, 0.45) * rim * uHot * 0.6;
      gl_FragColor = vec4(fogIt(col, vW), 1.0);
    }`;
  const propMats = new Map();
  function propize(root, o = {}) {
    root.traverse((m) => {
      if (!m.isMesh) return;
      const src = m.material, key = src.uuid + JSON.stringify(o);
      let mm = propMats.get(key);
      if (!mm) {
        if (src.map) src.map.encoding = T.LinearEncoding;
        mm = new T.ShaderMaterial({
          uniforms: Object.assign({ map: { value: src.map || null }, uHasMap: { value: src.map ? 1 : 0 }, uTint: { value: new T.Color(o.tint || "#ffffff").multiply(src.color || new T.Color(1, 1, 1)) },
            uEmit: { value: o.emit || 0 }, uEmitC: { value: new T.Color(o.emitC || "#ffb060") }, uHot: { value: 0 }, uCut: { value: src.alphaTest || (src.transparent && src.map ? 0.45 : 0) } }, U),
          vertexShader: PROP_VS, fragmentShader: PROP_FS, side: T.DoubleSide,
        });
        mm.extensions = { derivatives: true };
        propMats.set(key, mm);
      }
      m.material = mm;
    });
    return root;
  }
  const loader = T.GLTFLoader ? new T.GLTFLoader() : null;
  const queue = []; let busy = false;
  function prop(file, cb, prio = 5) { if (!loader) return; queue.push({ file, cb, prio }); queue.sort((a, b) => a.prio - b.prio); pump(); }
  function pump() {
    if (busy || !queue.length) return; busy = true; const { file, cb } = queue.shift();
    loader.load("/biblioteca/modelos/" + file + ".glb", (g) => { try { cb(g.scene); } catch (e) { console.warn("objeto", file, e); } busy = false; pump(); }, undefined, () => { busy = false; pump(); });
  }
  // coloca um objeto: escala pela maior medida (ou altura), apoia no chão, centraliza
  function place(root, { at, h, size, ry = 0, rx = 0, tint, emit, emitC, parent = scene, axis = "y" }) {
    propize(root, { tint, emit, emitC });
    const box = new T.Box3().setFromObject(root), sz = box.getSize(new T.Vector3());
    const s = h ? h / sz[axis] : size ? size / Math.max(sz.x, sz.y, sz.z) : 1;
    const g = new T.Group(); root.scale.setScalar(s); root.position.set(-(box.min.x + box.max.x) / 2 * s, -box.min.y * s, -(box.min.z + box.max.z) / 2 * s);
    g.add(root); g.position.copy(at); g.rotation.set(rx, ry, 0); parent.add(g); return g;
  }

  /* ---------------- construtor de geometria ---------------- */
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
  const hexShape = (r) => { const s = new T.Shape(); for (let k = 0; k < 6; k++) { const a = Math.PI / 6 + k * Math.PI / 3; const x = r * Math.cos(a), y = r * Math.sin(a); if (k) s.lineTo(x, y); else s.moveTo(x, y); } s.closePath(); return s; };
  const SIDES = [0, 1, 2, 3, 4, 5].map((k) => { const th = k * Math.PI / 3; return { k, th, c: Math.cos(th), s: Math.sin(th) }; });
  const WOOD = "#5A3A26", WOOD_D = "#3A251A", GOLD = "#B88A40", FLOOR = "#5E412D", CEILC = "#36261C";

  /* ---------------- a sala hexagonal (repetida sem fim na ala das matérias) ---------------- */
  const S = Builder(), W = Builder();
  {
    const ring = new T.Shape(); hexShape(R + 0.08).getPoints().forEach((p, i) => (i ? ring.lineTo(p.x, p.y) : ring.moveTo(p.x, p.y)));
    ring.holes.push(new T.Path(hexShape(RS).getPoints()));
    const fg = new T.ShapeGeometry(ring); fg.rotateX(-Math.PI / 2); S.add(fg, M(), FLOOR, 1);
    const cg = new T.ShapeGeometry(ring); cg.rotateX(Math.PI / 2); S.add(cg, M(0, CEIL, 0), CEILC, 2);
    for (const sd of SIDES) {
      const nx = -sd.c, nz = -sd.s, cx = RSA * sd.c, cz = RSA * sd.s;
      S.add(new T.PlaneGeometry(RS + 0.02, H - CEIL + 0.02), M(cx, (CEIL + H) / 2, cz, Math.atan2(nx, nz)), WOOD_D, 0);
      const tx = -sd.s, tz = sd.c, ry = alignX(tx, tz), rr = RSA + 0.06;
      S.add(new T.BoxGeometry(RS + 0.08, 0.08, 0.12), M(rr * sd.c, 1.0, rr * sd.s, ry), WOOD, 0);
      S.add(new T.BoxGeometry(RS + 0.08, 0.02, 0.13), M(rr * sd.c, 1.045, rr * sd.s, ry), GOLD, 0);
      S.add(new T.BoxGeometry(RS, 0.06, 0.08), M(rr * sd.c, 0.12, rr * sd.s, ry), WOOD, 0);
      for (let b = 0; b <= 8; b++) { const t = -RS / 2 + RS * b / 8; S.add(new T.BoxGeometry(0.035, 0.86, 0.035), M(rr * sd.c + tx * t, 0.57, rr * sd.s + tz * t), WOOD_D, 0); }
      S.add(new T.BoxGeometry(0.11, 1.15, 0.11), M(rr * sd.c + tx * RS / 2, 0.58, rr * sd.s + tz * RS / 2), WOOD, 0);
    }
    for (const sd of SIDES) {
      const nx = -sd.c, nz = -sd.s, tx = -sd.s, tz = sd.c, cx = (A - 0.01) * sd.c, cz = (A - 0.01) * sd.s, x0 = cx - tx * R / 2, z0 = cz - tz * R / 2;
      if (sd.k === 0 || sd.k === 3) {
        const seg = R / 2 - DOOR - 0.16;
        W.wall(x0, z0, tx, tz, nx, nz, seg, 0, CEIL, 0, sd.k + 0.5, SHELF_TOP);
        W.wall(x0 + tx * (R - seg), z0 + tz * (R - seg), tx, tz, nx, nz, seg, 0, CEIL, R - seg, sd.k + 0.7, SHELF_TOP);
        S.add(new T.PlaneGeometry(2 * DOOR + 0.34, CEIL - DOORH), M(cx, (CEIL + DOORH) / 2, cz, Math.atan2(nx, nz)), WOOD_D, 0);
        for (const sg of [-1, 1]) S.add(new T.BoxGeometry(0.3, DOORH + 0.25, 0.5), M(cx + tx * sg * (DOOR + 0.12), (DOORH + 0.25) / 2, cz + tz * sg * (DOOR + 0.12), alignX(tx, tz)), WOOD, 0);
        S.add(new T.BoxGeometry(2 * DOOR + 0.6, 0.3, 0.52), M(cx, DOORH + 0.12, cz, alignX(tx, tz)), WOOD, 0);
        S.add(new T.BoxGeometry(2 * DOOR + 0.62, 0.04, 0.54), M(cx, DOORH + 0.29, cz, alignX(tx, tz)), GOLD, 0);
      } else {
        W.wall(x0, z0, tx, tz, nx, nz, R, 0, CEIL, 0, sd.k + 0.5, SHELF_TOP);
        S.add(new T.BoxGeometry(0.34, CEIL, 0.34), M(x0 + nx * 0.06, CEIL / 2, z0 + nz * 0.06), WOOD_D, 0);
      }
      S.add(new T.BoxGeometry(R + 0.1, 0.12, 0.32), M(cx + nx * 0.12, SHELF_TOP + 0.06, cz + nz * 0.12, alignX(tx, tz)), WOOD, 0);
      S.add(new T.BoxGeometry(R + 0.1, 0.025, 0.34), M(cx + nx * 0.12, SHELF_TOP + 0.13, cz + nz * 0.12, alignX(tx, tz)), GOLD, 0);
    }
    const cf = new T.PlaneGeometry(C + 0.1, 2 * DOOR); cf.rotateX(-Math.PI / 2); S.add(cf, M(A + C / 2, 0.001, 0), FLOOR, 1);
    const cc = new T.PlaneGeometry(C + 0.1, 2 * DOOR); cc.rotateX(Math.PI / 2); S.add(cc, M(A + C / 2, DOORH, 0), CEILC, 2);
    W.wall(A - 0.05, -DOOR, 1, 0, 0, 1, C + 0.1, 0, DOORH, 0, 9.5, DOORH - 0.3);
    W.wall(A - 0.05, DOOR, 1, 0, 0, -1, C + 0.1, 0, DOORH, 0, 10.5, DOORH - 0.3);
    for (const z of [3.75, -3.75]) {
      S.add(new T.SphereGeometry(0.2, 14, 10), M(0, 4.05, z), "#FFC06A", 3);
      S.add(new T.CylinderGeometry(0.1, 0.16, 0.08, 10), M(0, 4.26, z), GOLD, 0);
      S.add(new T.CylinderGeometry(0.012, 0.012, CEIL - 4.3, 4), M(0, (CEIL + 4.3) / 2, z), WOOD_D, 0);
    }
  }
  const N_INST = (2 * NR + 1) * (2 * NF + 1);
  const roomS = new T.InstancedMesh(S.build(), structMat, N_INST), roomW = new T.InstancedMesh(W.build(), bookMat, N_INST);
  [roomS, roomW].forEach((m) => { m.frustumCulled = false; scene.add(m); });

  /* ---------------- o Grande Salão ---------------- */
  const HB = Builder(), HW = Builder();
  {
    const X0 = XW, X1 = XE, Z0 = -HZ, Z1 = HZ, IX0 = XW + BD, IX1 = XE - BD, IZ0 = -HZ + BD, IZ1 = HZ - BD;
    // chão
    const fl = new T.PlaneGeometry(HL, 2 * HZ); fl.rotateX(-Math.PI / 2); HB.add(fl, M((X0 + X1) / 2, 0, 0), FLOOR, 1);
    for (let L = 0; L < LV; L++) {
      const y0 = L * H, wh = L === 0 ? H - 0.4 : H - 0.4;
      // estantes nas quatro paredes, com as aberturas do térreo e da janela
      const wall = (x0, z0, tx, tz, nx, nz, len, seed, cuts = [], back = null) => {
        // cuts: [início, fim, até-altura]
        let s = 0; const segs = []; cuts.sort((a, b) => a[0] - b[0]);
        for (const [a, b, h] of cuts) { if (a > s) segs.push([s, a, wh]); segs.push([a, b, h, true]); s = b; } if (s < len) segs.push([s, len, wh]);
        for (const [a, b, hh, cut] of segs) {
          if (!cut) HW.wall(x0 + tx * a, z0 + tz * a, tx, tz, nx, nz, b - a, y0, y0 + wh, a, seed + L * 1.7, SHELF_TOP, y0);
          else {
            if (hh < wh) HB.add(new T.PlaneGeometry(b - a, wh - hh), M(x0 + tx * (a + b) / 2, y0 + (hh + wh) / 2, z0 + tz * (a + b) / 2, Math.atan2(nx, nz)), WOOD_D, 0);
            if (back) HB.add(new T.PlaneGeometry(b - a, hh), M(x0 + tx * (a + b) / 2 - nx * 0.06, y0 + hh / 2, z0 + tz * (a + b) / 2 - nz * 0.06, Math.atan2(nx, nz)), back[0], back[1]);
          }
        }
      };
      wall(X0, Z0 + 0.01, 1, 0, 0, 1, HL, 21.5);                         // norte
      wall(X0, Z1 - 0.01, 1, 0, 0, -1, HL, 22.5);                        // sul
      wall(X0 + 0.01, Z0, 0, 1, 1, 0, 2 * HZ, 23.5, L === 0 ? [[HZ - 2.1, HZ + 2.1, 3.1]] : L === 1 ? [[HZ - 2.3, HZ + 2.3, 4.6]] : [], L === 0 ? ["#3A2E28", 0] : L === 1 ? ["#3A5070", 3] : null); // oeste: lareira (pedra) e janela (a noite lá fora)
      wall(X1 - 0.01, Z0, 0, 1, -1, 0, 2 * HZ, 24.5, L === 0 ? [[HZ - 1.6, HZ + 1.6, 3.6]] : []); // leste: a porta
      // painel de madeira em cima das estantes de cada andar
      if (L > 0) {
        // galerias: piso em volta, guarda-corpo na borda de dentro, colunas
        const slab = (cx, cz, sx, sz) => { HB.add(new T.BoxGeometry(sx, 0.4, sz), M(cx, y0 - 0.2, cz), WOOD_D, 0); const p = new T.PlaneGeometry(sx, sz); p.rotateX(-Math.PI / 2); HB.add(p, M(cx, y0 + 0.003, cz), FLOOR, 1); };
        slab((X0 + X1) / 2, (Z0 + IZ0) / 2, HL, BD); slab((X0 + X1) / 2, (Z1 + IZ1) / 2, HL, BD);
        slab((X0 + IX0) / 2, 0, BD, IZ1 - IZ0); slab((X1 + IX1) / 2, 0, BD, IZ1 - IZ0);
        const rail = (xa, za, xb, zb) => {
          const len = Math.hypot(xb - xa, zb - za), tx = (xb - xa) / len, tz = (zb - za) / len, ry = alignX(tx, tz), cx = (xa + xb) / 2, cz = (za + zb) / 2;
          HB.add(new T.BoxGeometry(len, 0.08, 0.14), M(cx, y0 + 1.02, cz, ry), WOOD, 0);
          HB.add(new T.BoxGeometry(len, 0.02, 0.15), M(cx, y0 + 1.07, cz, ry), GOLD, 0);
          HB.add(new T.BoxGeometry(len, 0.06, 0.1), M(cx, y0 + 0.12, cz, ry), WOOD, 0);
          HB.add(new T.BoxGeometry(len, 0.4, 0.06), M(cx, y0 - 0.2, cz, ry), GOLD, 0);
          const nb = Math.floor(len / 0.4); for (let b = 0; b <= nb; b++) HB.add(new T.BoxGeometry(0.04, 0.88, 0.04), M(xa + tx * b * len / nb, y0 + 0.58, za + tz * b * len / nb), WOOD_D, 0);
        };
        rail(IX0, IZ0, IX1, IZ0); rail(IX0, IZ1, IX1, IZ1); rail(IX0, IZ0, IX0, IZ1); rail(IX1, IZ0, IX1, IZ1);
      }
      // colunas na borda das galerias, do chão do andar ao de cima
      const cols = []; for (let k = 0; k <= 5; k++) { const x = IX0 + (IX1 - IX0) * k / 5; cols.push([x, IZ0], [x, IZ1]); } if (L > 0) cols.push([IX0, 0], [IX1, 0]); // no térreo elas ficariam na frente da porta e da lareira
      for (const [x, z] of cols) { HB.add(new T.BoxGeometry(0.46, H, 0.46), M(x, y0 + H / 2 - 0.2, z), WOOD_D, 0); HB.add(new T.BoxGeometry(0.6, 0.18, 0.6), M(x, y0 + H - 0.5, z), GOLD, 0); }
      // cornija contínua no alto das estantes
      for (const [cx, cz, len, ry] of [[(X0 + X1) / 2, Z0 + 0.14, HL, 0], [(X0 + X1) / 2, Z1 - 0.14, HL, 0], [X0 + 0.14, 0, 2 * HZ, Math.PI / 2], [X1 - 0.14, 0, 2 * HZ, Math.PI / 2]]) {
        HB.add(new T.BoxGeometry(len, 0.14, 0.3), M(cx, y0 + SHELF_TOP + 0.07, cz, ry), WOOD, 0);
        HB.add(new T.BoxGeometry(len, 0.03, 0.32), M(cx, y0 + SHELF_TOP + 0.15, cz, ry), GOLD, 0);
      }
    }
    // a moldura da porta de madeira e a da lareira
    HB.add(new T.BoxGeometry(0.5, 3.9, 0.5), M(X1 - 0.2, 1.95, -1.85), WOOD, 0); HB.add(new T.BoxGeometry(0.5, 3.9, 0.5), M(X1 - 0.2, 1.95, 1.85), WOOD, 0);
    HB.add(new T.BoxGeometry(0.55, 0.45, 4.2), M(X1 - 0.2, 3.85, 0), WOOD, 0); HB.add(new T.BoxGeometry(0.57, 0.05, 4.24), M(X1 - 0.2, 4.1, 0), GOLD, 0);
  }
  const hallS = new T.Mesh(HB.build(), structMat), hallW = new T.Mesh(HW.build(), bookMat);
  scene.add(hallS, hallW);

  /* ---------------- luzes ---------------- */
  const LIGHTS = []; // { p, c (Color), i, flick, ph }
  const addLight = (x, y, z, color, i, flick = 0) => { const L = { p: new T.Vector3(x, y, z), c: new T.Color(color), i, i0: i, flick, ph: Math.random() * 10 }; LIGHTS.push(L); return L; };
  const chand = [XW + 7.5, XW + 15, XW + 22.5].map((x, k) => addLight(x, 7.2 + (k === 1 ? 0.6 : 0), 0, "#FFB25A", 3.2, 0.03));
  const fire = addLight(XW + 1.2, 1.0, 0, "#FF7A2A", 4.6, 0.25);
  const desk = addLight(XW + 8.4, 1.45, -0.55, "#FFC070", 1.4, 0.04);
  addLight(XW + 0.6, 2.9, 1.3, "#FFB060", 0.5, 0.12); addLight(XW + 0.6, 2.9, -1.3, "#FFB060", 0.5, 0.12); // velas na lareira
  // arandelas nas colunas, em todos os andares (as mais próximas acendem de verdade)
  const sconces = [];
  for (let L = 0; L < LV; L++) for (let k = 0; k <= 5; k += (L === 0 ? 1 : 2)) for (const z of [-HZ + BD - 0.32, HZ - BD + 0.32]) {
    const x = XW + BD + (HL - 2 * BD) * k / 5; sconces.push([x, L * H + 2.4, z, z < 0 ? 0 : Math.PI]); addLight(x, L * H + 2.4, z + (z < 0 ? 0.25 : -0.25), "#FFB868", 0.55, 0.06);
  }
  const roomLamp = []; // luzes das salas perto da câmera (preenchidas por quadro)
  const lightTmp = [];
  function updateLights(t) {
    lightTmp.length = 0;
    for (const L of LIGHTS) { if (L.flick) L.i = L.i0 * (1 - L.flick + L.flick * (0.6 + 0.4 * Math.sin(t * 11 + L.ph) * Math.sin(t * 7.3 + L.ph * 2))); lightTmp.push(L); }
    const i0 = Math.round(camera.position.x / D);
    roomLamp.length = 0;
    for (let i = Math.max(0, i0 - 2); i <= i0 + 2; i++) for (const z of [3.75, -3.75]) roomLamp.push({ p: new T.Vector3(i * D, 4.05, z), c: new T.Color("#FFB45E"), i: 1.6 * (0.94 + 0.06 * Math.sin(t * 7 + i)) });
    lightTmp.push(...roomLamp);
    const cp = camera.position;
    lightTmp.sort((a, b) => (b.i / (1 + b.p.distanceToSquared(cp) * 0.02)) - (a.i / (1 + a.p.distanceToSquared(cp) * 0.02)));
    for (let k = 0; k < NL; k++) {
      const L = lightTmp[k];
      if (L) { U.uLP.value[k].copy(L.p); U.uLC.value[k].set(L.c.r * L.i, L.c.g * L.i, L.c.b * L.i); } else { U.uLP.value[k].set(0, -999, 0); U.uLC.value[k].set(0, 0, 0); }
    }
  }

  /* brilho das lâmpadas, poeira, brasas e feixes */
  const glowTex = (() => { const c = document.createElement("canvas"); c.width = c.height = 64; const g = c.getContext("2d"); const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, "rgba(255,255,255,1)"); gr.addColorStop(0.2, "rgba(255,255,255,0.5)"); gr.addColorStop(1, "rgba(255,255,255,0)"); g.fillStyle = gr; g.fillRect(0, 0, 64, 64); return new T.CanvasTexture(c); })();
  const pts = (n, size, color, op) => { const g = new T.BufferGeometry(); g.setAttribute("position", new T.BufferAttribute(new Float32Array(n * 3), 3)); const p = new T.Points(g, new T.PointsMaterial({ map: glowTex, color, size, transparent: true, opacity: op, depthWrite: false, blending: T.AdditiveBlending })); p.frustumCulled = false; scene.add(p); return p; };
  const halos = pts(N_INST * 2 + 64, 2.4, 0xffb35c, 0.5);
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
  ray(new T.Vector3(XW + 15, LV * H + 6, 0), new T.Vector3(XW + 15, 0, 0), 2.2, 5.6, "#9DB4D8", 0.11);           // a luz fria que desce do alto
  for (const z of [-1.4, 0, 1.4]) ray(new T.Vector3(XW + 0.4, H + 2.6, z * 0.9), new T.Vector3(XW + 11, 0, z * 2.4), 0.5, 1.9, "#C8D4EA", 0.07); // da janela
  for (const L of chand) ray(new T.Vector3(L.p.x, L.p.y + 0.2, 0), new T.Vector3(L.p.x, 0, 0), 0.5, 3.4, "#FFB860", 0.06);

  /* ---------------- cômodos instanciados ---------------- */
  let centerRoom = null; const tmpM = new T.Matrix4(), zero = new T.Matrix4().makeScale(0, 0, 0);
  function placeRooms(i0) {
    if (i0 === centerRoom) return; centerRoom = i0; let n = 0; const hp = halos.geometry.attributes.position.array; hp.fill(0); hp.fill(-999, 1, 2);
    let hi = 0;
    for (let di = -NR; di <= NR; di++) for (let f = -NF; f <= NF; f++) {
      const i = i0 + di;
      if (i < 0) { roomS.setMatrixAt(n, zero); roomW.setMatrixAt(n, zero); n++; continue; }
      const x = i * D, y = f * H; tmpM.makeTranslation(x, y, 0); roomS.setMatrixAt(n, tmpM); roomW.setMatrixAt(n, tmpM);
      hp.set([x, y + 4.05, 3.75, x, y + 4.05, -3.75], hi * 3); hi += 2; n++;
    }
    for (const L of chand) { hp.set([L.p.x, L.p.y, 0], hi * 3); hi++; }
    for (let k = hi; k < hp.length / 3; k++) hp.set([0, -999, 0], k * 3);
    roomS.instanceMatrix.needsUpdate = roomW.instanceMatrix.needsUpdate = true; halos.geometry.attributes.position.needsUpdate = true;
  }

  /* ---------------- objetos do salão ---------------- */
  const clickables = []; // { mesh, kind, data, hot }
  const clickable = (g, kind, data) => { const c = { g, kind, data, hot: 0 }; g.traverse((o) => { if (o.isMesh) { o.userData.click = c; clickables.push(o); } }); return c; };
  const V3 = (x, y, z) => new T.Vector3(x, y, z);
  const DESKX = XW + 8.2, DESKY = 0.82;
  prop("porta", (m) => place(m, { at: V3(XE - 0.05, 0, 0), h: 3.55, ry: -Math.PI / 2 }), 1);
  prop("lareira", (m) => place(m, { at: V3(XW + 0.45, 0, 0), h: 3.0, ry: Math.PI / 2 }), 1);
  prop("tapete", (m) => place(m, { at: V3(XW + 16, 0.012, 0), size: 15, ry: Math.PI / 2 }), 1);
  prop("mesa", (m) => { place(m.clone(true), { at: V3(DESKX, 0, 0), h: DESKY, ry: Math.PI / 2 }); place(m.clone(true), { at: V3(XW + 6.6, 0, HZ - 1.2), h: DESKY }); place(m, { at: V3(FIM * D - 4.2, 0, -2.6), h: DESKY, ry: 0.5 }); }, 2);
  prop("lustre", (m) => { for (const L of chand) { const g = place(m.clone(true), { at: V3(L.p.x, L.p.y - 1.2, 0), h: 3.0 }); g.add(new T.Mesh(new T.CylinderGeometry(0.02, 0.02, 30, 4), structMat)); g.children[1].position.y = 17; } }, 2);
  prop("maquina", (m) => clickable(place(m, { at: V3(DESKX + 0.1, DESKY, 0.05), size: 0.5, ry: Math.PI / 2 }), "recado"), 3);
  prop("lampiao", (m) => place(m, { at: V3(DESKX - 0.15, DESKY, -0.62), h: 0.55, emit: 0.4 }), 3);
  prop("tinteiro", (m) => place(m, { at: V3(DESKX + 0.18, DESKY, 0.55), size: 0.24, ry: 0.5 }), 3);
  prop("lupa", (m) => clickable(place(m, { at: V3(DESKX + 0.3, DESKY, -0.32), size: 0.3, ry: 1.2 }), "busca"), 3);
  prop("mapa", (m) => clickable(place(m, { at: V3(DESKX - 0.25, DESKY + 0.02, 0.38), size: 0.5, ry: 0.3, rx: 0 }), "indice"), 3);
  prop("telefone", (m) => clickable(place(m, { at: V3(DESKX - 0.3, DESKY, -0.25), size: 0.28, ry: Math.PI / 2 + 0.4 }), "contato"), 3);
  prop("bussola", (m) => clickable(place(m, { at: V3(DESKX + 0.35, DESKY, 0.25), size: 0.13 }), "mundos"), 4);
  prop("pergaminho", (m) => place(m, { at: V3(DESKX + 0.05, DESKY, 0.78), size: 0.36, ry: 0.2 }), 4);
  prop("livros-gastos", (m) => place(m, { at: V3(DESKX - 0.2, DESKY, 0.8), size: 0.3 }), 4);
  prop("globo", (m) => clickable(place(m, { at: V3(DESKX + 1.1, 0, -1.1), h: 1.05, tint: "#C9A66B" }), "mundos"), 4);
  prop("papeis", (m) => place(m, { at: V3(DESKX - 0.05, DESKY, -0.85), h: 0.16 }), 5);
  prop("velas", (m) => { place(m.clone(true), { at: V3(XW + 0.55, 2.62, 1.3), size: 0.32, emit: 0.5 }); place(m, { at: V3(XW + 0.55, 2.62, -1.3), size: 0.32, emit: 0.5 }); }, 4);
  prop("relogio", (m) => place(m, { at: V3(XE - 1.0, 0, -3.2), h: 2.3, ry: -Math.PI / 2 }), 4);
  prop("piano", (m) => place(m, { at: V3(XW + 2.6, 0, -HZ + 1.6), size: 2.0, ry: 0 }), 5);
  prop("gramofone", (m) => clickable(place(m, { at: V3(XW + 4.6, 0, -HZ + 1.5), h: 1.0, ry: 0.4 }), "musica"), 4);
  prop("poltrona", (m) => place(m, { at: V3(XW + 3.4, 0, 3.2), h: 1.15, ry: -Math.PI / 2 - 0.6 }), 5);
  prop("espelho", (m) => place(m, { at: V3(XW + 1.0, 0, HZ - 1.4), h: 2.1, ry: Math.PI / 2 + 0.5, tint: "#9aa6ad" }), 6);
  prop("janela", (m) => place(m, { at: V3(XW + 0.12, H + 0.5, 0), h: 4.0, ry: Math.PI / 2, emit: 0.25, emitC: "#8FA6CC" }), 5);
  prop("cortinas", (m) => place(m, { at: V3(XW + 0.4, H + 0.2, 0), h: 4.6, ry: Math.PI / 2, tint: "#7A2A24" }), 6);
  prop("arandela", (m) => { for (const [x, y, z, ry] of sconces) place(m.clone(true), { at: V3(x, y - 0.25, z), h: 0.45, ry, emit: 0.35 }); }, 4);
  // a mesa de alquimia, encostada na estante do sul
  prop("pocoes", (m) => place(m, { at: V3(XW + 6.2, DESKY, HZ - 1.25), size: 0.7, ry: Math.PI }), 7);
  prop("tubos", (m) => place(m, { at: V3(XW + 7.05, DESKY, HZ - 1.3), size: 0.36, ry: Math.PI }), 7);
  prop("calice", (m) => place(m, { at: V3(XW + 5.6, DESKY, HZ - 1.15), h: 0.24 }), 7);
  prop("moedas", (m) => place(m, { at: V3(XW + 6.7, DESKY + 0.005, HZ - 0.95), size: 0.3 }), 8);
  prop("castical", (m) => place(m, { at: V3(XW + 7.35, DESKY, HZ - 1.0), h: 0.3, emit: 0.3 }), 8);
  prop("atril", (m) => { const g = place(m, { at: V3(XW + 21, 0, 0), h: 1.25, ry: -Math.PI / 2 }); prop("livro-magico", (b) => clickable(place(b, { at: V3(XW + 21, 1.26, 0), size: 0.62, ry: -Math.PI / 2, emit: 0.15, emitC: "#FFD9A0" }), "sobre"), 2); }, 2);

  /* as fendas: uma para cada mundo, rasgando as estantes do térreo */
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
  WORLDS.forEach((w, k) => {
    const north = k < 5, x = XW + 5 + (k % 5) * 5, z = north ? -HZ + 0.32 : HZ - 0.32;
    w.pos = V3(x, 1.9, z); w.n = north ? 1 : -1; w.k = k;
    addLight(x, 1.9, z + w.n * 0.6, w.c, 0.9, 0.15);
    const label = (() => { const c = document.createElement("canvas"); c.width = 512; c.height = 128; const g = c.getContext("2d"); g.fillStyle = "rgba(0,0,0,0)"; g.fillRect(0, 0, 512, 128); g.textAlign = "center"; g.fillStyle = "#F1E6CF"; g.font = "600 44px 'Shippori Mincho', serif"; g.fillText(w.t, 256, 58); g.fillStyle = w.c; g.font = "500 22px 'Geist Mono', monospace"; g.fillText(w.s.toUpperCase(), 256, 100); const t = new T.CanvasTexture(c); return t; })();
    const lm = new T.Mesh(new T.PlaneGeometry(3.4, 0.85), new T.MeshBasicMaterial({ map: label, transparent: true, depthWrite: false, color: new T.Color(1.35, 1.3, 1.2) }));
    lm.position.set(x, 4.05, z + w.n * 0.05); lm.rotation.y = north ? 0 : Math.PI; scene.add(lm); w.label = lm;
    rifts.push(w);
  });
  prop("fenda", (m) => {
    for (const w of rifts) {
      const g = place(m.clone(true), { at: V3(w.pos.x, 0.15, w.pos.z), h: 3.6, ry: w.n > 0 ? -Math.PI / 2 : Math.PI / 2 });
      const mat = new T.ShaderMaterial({ uniforms: Object.assign({ uRC: { value: new T.Color(w.c) }, uHot: { value: 0 } }, U), vertexShader: PROP_VS, fragmentShader: PORTAL_FS, side: T.DoubleSide });
      g.traverse((o) => { if (o.isMesh) o.material = mat; }); w.mat = mat;
      const halo = new T.Sprite(new T.SpriteMaterial({ map: glowTex, color: new T.Color(w.c), transparent: true, opacity: 0.35, depthWrite: false, blending: T.AdditiveBlending })); halo.scale.set(3.4, 5, 1); halo.position.set(w.pos.x, 2, w.pos.z + w.n * 0.2); scene.add(halo); w.halo = halo;
      clickable(g, "mundo", w);
    }
  }, 2);

  /* ---------------- as atividades: livros de verdade nas salas ---------------- */
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
  function shelfBook(room, wall, slot, nPer, row, title, color, sub) {
    const sd = SIDES[wall], u = (slot - (nPer - 1) / 2) * 1.15, nx = -sd.c, nz = -sd.s, tx = -sd.s, tz = sd.c;
    const g = new T.Group(); g.position.set(room * D + A * sd.c + tx * u + nx * 0.2, BASE + ROW * row + 0.045, A * sd.s + tz * u + nz * 0.2); g.rotation.y = Math.atan2(nx, nz);
    const mats = [actMat(color, null, 0), actMat(color, null, 0), actMat(color, null, 1), actMat(color, null, 0), actMat(color, spineTexture(title, color, sub), 2), actMat(color, null, 0)];
    const body = new T.Mesh(new T.BoxGeometry(0.12, 0.38, 0.27), mats); body.position.y = 0.19; g.add(body);
    const halo = new T.Sprite(new T.SpriteMaterial({ map: glowTex, color: new T.Color(color).lerp(new T.Color("#ffd28a"), 0.5), transparent: true, opacity: 0.2, depthWrite: false, blending: T.AdditiveBlending })); halo.scale.set(0.75, 0.75, 1); halo.position.set(0, 0.2, 0.18); g.add(halo);
    scene.add(g); return { g, body, halo, mats, nx, nz, room, out: 0, match: 0 };
  }
  function addActivityBooks(list) {
    subjects = list;
    list.forEach((sub, si) => {
      const room = si + 1, color = COLORS[si % COLORS.length]; sub.room = room; sub.color = color;
      plaque(room, sub.name, sub.cat === "curso-tecnico" ? "Curso técnico" : "Ensino médio", color);
      sub.acts.forEach((a, ai) => {
        const wall = ai < 4 ? 1 : 5, nPer = Math.min(4, ai < 4 ? sub.acts.length : sub.acts.length - 4);
        const b = shelfBook(room, wall, ai % 4, nPer, 2, a.t, color); Object.assign(b, { a, sub, id: `${si}-${ai}`, wall });
        books.push(b); clickable(b.body, "livro", b);
      });
    });
    plaque(CERT, "Certificados", "Feiras e Iniciação Científica", "#C8A04A");
    plaque(FIM, "Sala de Leitura", "A Estante dos Visitantes", "#C22026");
    buildPlaces(); buildMarkers(); renderIndex(); go(placeIdx, true);
  }
  function plaque(room, name, sub, color) {
    const c = document.createElement("canvas"); c.width = 640; c.height = 160; const g = c.getContext("2d");
    g.fillStyle = "#24170F"; g.fillRect(0, 0, 640, 160); g.strokeStyle = "#B88A40"; g.lineWidth = 4; g.strokeRect(10, 10, 620, 140);
    g.fillStyle = color; g.fillRect(24, 72, 10, 16); g.fillStyle = "#F1E6CF"; g.textAlign = "center";
    let fs = 46; g.font = `600 ${fs}px 'Shippori Mincho', serif`; while (g.measureText(name).width > 560 && fs > 24) { fs -= 2; g.font = `600 ${fs}px 'Shippori Mincho', serif`; }
    g.fillText(name, 320, 92); g.fillStyle = "#BBA986"; g.font = "500 18px 'Geist Mono', monospace"; g.fillText(sub.toUpperCase() + "  ·  SALA " + room, 320, 130);
    const tex = new T.CanvasTexture(c); tex.anisotropy = 4;
    const mat = new T.ShaderMaterial({ uniforms: Object.assign({ map: { value: tex } }, U), vertexShader: PROP_VS, fragmentShader: `${COMMON} uniform sampler2D map; varying vec3 vW; varying vec3 vN; varying vec2 vUv; void main(){ vec3 c = texture2D(map, vUv).rgb; vec3 l = band(lights(vW, normalize(vN))); gl_FragColor = vec4(fogIt(c * (0.4 + l * 0.9), vW), 1.0); }` });
    const m = new T.Mesh(new T.PlaneGeometry(2.4, 0.6), mat); m.position.set((room - 1) * D + A - 0.04, DOORH + 0.78, 0); m.rotation.y = -Math.PI / 2; scene.add(m);
    const m2 = m.clone(); m2.position.set(room * D - A + 0.04, DOORH + 0.78, 0); m2.rotation.y = Math.PI / 2; scene.add(m2);
  }

  /* certificados: um em cada redoma */
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
    CERTS.forEach((cf, k) => {
      const a = [0.75, 1.55, 2.35, 3.93, 4.71, 5.5][k], r = 5.0, x = CERT * D + r * Math.cos(a), z = r * Math.sin(a);
      const g = place(m.clone(true), { at: V3(x, 0, z), h: 1.6, ry: -a - Math.PI / 2 });
      const card = new T.Mesh(new T.PlaneGeometry(0.3, 0.4), new T.MeshBasicMaterial({ map: certTexture(cf) }));
      card.position.set(x, 1.38, z); card.lookAt(CERT * D, 1.38, 0); scene.add(card);
      addLight(x - Math.cos(a) * 0.4, 1.9, z - Math.sin(a) * 0.4, "#FFD08A", 0.45, 0.02);
      const it = { cf, g, card, pos: V3(x, 1.4, z), nx: -Math.cos(a), nz: -Math.sin(a) }; certItems.push(it); clickable(g, "cert", it); clickable(card, "cert", it);
    });
  }, 6);

  /* sala de leitura: poltrona, mesa, lampião e a Estante dos Visitantes */
  prop("poltrona", (m) => place(m, { at: V3(FIM * D - 3.6, 0, 3.0), h: 1.15, ry: 2.4 }), 7);
  prop("lampiao", (m) => place(m, { at: V3(FIM * D - 4.3, DESKY, -2.5), h: 0.55, emit: 0.4 }), 7);
  prop("tinteiro", (m) => clickable(place(m, { at: V3(FIM * D - 4.0, DESKY, -2.85), size: 0.24 }), "recado"), 7);
  prop("pergaminho", (m) => clickable(place(m, { at: V3(FIM * D - 4.45, DESKY, -2.9), size: 0.36, ry: 0.4 }), "recado"), 7);
  addLight(FIM * D - 4.3, 1.4, -2.5, "#FFC070", 1.2, 0.05);
  const visitorBooks = [];
  const VCOL = { madeira: "#6B4A2E", vermelho: "#8E2A24", azul: "#2E4A7A", verde: "#2F5A3A" };
  function addVisitors(list) {
    visitorBooks.forEach((b) => scene.remove(b.g)); visitorBooks.length = 0;
    list.slice(0, 24).forEach((e, k) => {
      const wall = k < 12 ? 1 : 5, kk = k % 12, row = 1 + Math.floor(kk / 4), slot = kk % 4;
      const b = shelfBook(FIM, wall, slot, 4, row, e.nome || "Visitante", VCOL[e.cor] || VCOL.madeira, new Date(e.criado_em || Date.now()).toLocaleDateString("pt-BR"));
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

  /* ---------------- os lugares ---------------- */
  let places = [], placeIdx = 0;
  const wallView = (room, wall, dist = 3.0) => { const sd = SIDES[wall], cx = room * D + A * sd.c, cz = A * sd.s; return { pos: V3(cx - sd.c * dist, EYE, cz - sd.s * dist), tgt: V3(cx, 1.62, cz) }; };
  let extraMarks = [], marks = [];
  function buildPlaces() {
    const wallAnchor = (room, wall) => { const sd = SIDES[wall]; return V3(room * D + (A - 0.6) * sd.c, 3.15, (A - 0.6) * sd.s); };
    const P = (o) => Object.assign({ area: o.room != null ? o.room : -1 }, o);
    places = [
      P({ id: "salao", g: "O Grande Salão", t: "Entrada", pose: { pos: V3(XE - 2.4, 2.05, 0.2), tgt: V3(XW + 12, 3.0, 0) }, anchor: V3(XW + 21, 2.4, 0) }),
      P({ id: "mesa", g: "O Grande Salão", t: "A mesa de trabalho", pose: { pos: V3(DESKX + 2.2, 1.85, 0.9), tgt: V3(DESKX, 0.95, 0) }, anchor: V3(DESKX, 1.75, 0) }),
      P({ id: "mundos-n", g: "O Grande Salão", t: "Os mundos", sub: "fendas do norte", pose: { pos: V3(XW + 15, 3.4, 5.2), tgt: V3(XW + 15, 2.0, -HZ) }, anchor: V3(XW + 15, 5.0, -HZ + 1.2) }),
      P({ id: "mundos-s", g: "O Grande Salão", t: "Os mundos", sub: "fendas do sul", pose: { pos: V3(XW + 15, 3.4, -5.2), tgt: V3(XW + 15, 2.0, HZ) }, anchor: V3(XW + 15, 5.0, HZ - 1.2) }),
      ...subjects.flatMap((sj) => [
        P({ id: "sala" + sj.room, g: "Salas das matérias", t: sj.name, sub: `sala ${sj.room}`, room: sj.room, pose: wallView(sj.room, 1), anchor: wallAnchor(sj.room, 1) }),
        ...(sj.acts.length > 4 ? [P({ id: "sala" + sj.room + "b", g: "Salas das matérias", t: sj.name, sub: "a outra estante", room: sj.room, pose: wallView(sj.room, 5), anchor: wallAnchor(sj.room, 5), minor: true })] : []),
      ]),
      P({ id: "certificados", g: "Mais adiante", t: "Certificados", sub: `sala ${CERT}`, room: CERT, pose: { pos: V3(CERT * D - 4.9, 2.1, 0.4), tgt: V3(CERT * D + 2.5, 1.2, 0) }, anchor: V3(CERT * D, 3.2, 0) }),
      P({ id: "fim", g: "Mais adiante", t: "Sala de Leitura", sub: "o fim", room: FIM, pose: { pos: V3(FIM * D - 4.9, 1.85, 0.5), tgt: V3(FIM * D + A + 8, 1.7, 0) }, anchor: V3(FIM * D, 3.2, 0) }),
      P({ id: "estante", g: "Mais adiante", t: "Estante dos Visitantes", sub: "deixe um livro", room: FIM, pose: wallView(FIM, 1, 2.8), anchor: wallAnchor(FIM, 1), minor: true }),
    ];
    // atalhos que não são lugares: a porta do salão leva à primeira sala
    extraMarks = subjects.length ? [{ id: "porta", t: "As salas das matérias", sub: "pela porta", area: -1, anchor: V3(XE - 0.4, 4.35, 0), to: "sala1" }] : [];
  }
  buildPlaces();

  /* ---------------- câmera: voar de um lugar ao outro ---------------- */
  const cam = { pos: V3(XE - 2.4, 2.05, 0.2), tgt: V3(XW + 12, 3.0, 0), yaw: 0, pitch: 0, yawT: 0, pitchT: 0 };
  let fly = null, focus = null;
  const areaOf = (p) => (p.x < XE - 0.2 ? -1 : Math.round(p.x / D));
  const ringPt = (room, a, r = 4.25) => V3(room * D + r * Math.cos(a), EYE, r * Math.sin(a));
  function route(a, b) {
    const pts = [a.clone()]; let ar = areaOf(a); const br = areaOf(b);
    const around = (rm, a0, a1) => { let d = a1 - a0; while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI; if (Math.abs(Math.abs(d) - Math.PI) < 0.25) d = Math.abs(d); const n = Math.max(1, Math.ceil(Math.abs(d) / 0.4)); for (let k = 1; k <= n; k++) pts.push(ringPt(rm, a0 + d * k / n)); };
    const ang = (p, rm) => Math.atan2(p.z, p.x - rm * D);
    if (ar === br) {
      if (ar >= 0) { const a0 = ang(a, ar), a1 = ang(b, ar); if (Math.abs(a0 - a1) > 0.8) { pts.push(ringPt(ar, a0)); around(ar, a0, a1); } }
      else pts.push(a.clone().lerp(b, 0.5).setY(Math.max(a.y, b.y) + 0.5));
      pts.push(b.clone()); return pts;
    }
    let angle;
    if (ar < 0) { pts.push(V3(XE - 1.4, EYE, 0)); pts.push(V3(-A + 0.7, EYE, 0)); ar = 0; angle = Math.PI; pts.push(ringPt(0, angle)); }
    else { angle = ang(a, ar); if (Math.hypot(a.x - ar * D, a.z) > 3.2) pts.push(ringPt(ar, angle)); }
    const target = br < 0 ? 0 : br;
    while (ar !== target) { const dir = Math.sign(target - ar); around(ar, angle, dir > 0 ? 0 : Math.PI); pts.push(V3(ar * D + dir * (A - 0.3), EYE, 0)); ar += dir; pts.push(V3(ar * D - dir * (A - 0.3), EYE, 0)); angle = dir > 0 ? Math.PI : 0; pts.push(ringPt(ar, angle)); }
    if (br < 0) { around(0, angle, Math.PI); pts.push(V3(-A + 0.7, EYE, 0)); pts.push(V3(XE - 1.4, EYE, 0)); }
    else around(br, angle, ang(b, br));
    pts.push(b.clone());
    const clean = [pts[0]]; for (const p of pts) if (p.distanceTo(clean[clean.length - 1]) > 0.25) clean.push(p);
    return clean;
  }
  function flyTo(pose, done) {
    const pts = route(cam.pos, pose.pos);
    if (reduce || pts.length < 2) { cam.pos.copy(pose.pos); cam.tgt.copy(pose.tgt); if (done) done(); return; }
    const curve = new T.CatmullRomCurve3(pts, false, "centripetal", 0.4); const len = curve.getLength();
    fly = { curve, len, u: 0, dur: Math.min(7.5, Math.max(1.4, len / 7)), t0: cam.tgt.clone(), t1: pose.tgt.clone(), done };
    cam.yawT = cam.pitchT = 0; document.body.classList.add("flying");
  }
  const ease = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);

  /* ---------------- navegação ---------------- */
  const cur = () => places[placeIdx];
  const hist = [];
  function go(i, instant = false, fromBack = false) {
    if (typeof i === "string") i = places.findIndex((p) => p.id === i);
    if (i < 0 || i >= places.length) return;
    closePanel(); closeIndex(); focus = null;
    if (!fromBack && !instant && i !== placeIdx) { hist.push(placeIdx); if (hist.length > 30) hist.shift(); }
    placeIdx = i; const pose = cur().pose;
    if (instant) { cam.pos.copy(pose.pos); cam.tgt.copy(pose.tgt); } else flyTo(pose);
    $("aquiK").textContent = cur().g; $("aquiT").textContent = cur().t + (cur().sub ? " · " + cur().sub : "");
    $("voltar").hidden = !hist.length;
    renderIndex(); hint(); if (!instant) $("hero").classList.add("off");
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

  /* marcadores no espaço: etiquetas sobre os lugares; clicar leva até lá */
  function buildMarkers() {
    const box = $("marcas"); box.innerHTML = ""; marks = [];
    for (const m of places.map((p, i) => ({ ...p, to: i })).concat(extraMarks)) {
      const b = document.createElement("button"); b.type = "button"; b.className = "mk" + (m.minor ? " minor" : "");
      b.innerHTML = `<i></i><span><b>${esc(m.t)}</b>${m.sub ? `<small>${esc(m.sub)}</small>` : ""}</span>`;
      b.addEventListener("click", (e) => { e.stopPropagation(); go(m.to); });
      box.appendChild(b); marks.push({ el: b, m, shown: false });
    }
  }
  const mv = new T.Vector3(), mc = new T.Vector3();
  function updateMarkers() {
    const ca = areaOf(cam.pos), W = innerWidth, Hh = innerHeight, small = W < 640, edges = [];
    for (const k of marks) {
      const m = k.m, here = typeof m.to === "number" && m.to === placeIdx;
      const near = m.area === ca || (ca >= 0 && m.area >= 0 && Math.abs(m.area - ca) <= 1) || (ca === -1 && m.area <= 1) || (ca <= 1 && m.area === -1);
      const dist = camera.position.distanceTo(m.anchor);
      let vis = !fly && !here && near && dist < 34 && dist > 1.2 && !(ca >= 0 && m.area === -1 && m.id !== "salao"), edge = false, x = 0, y = 0;
      if (vis) {
        mc.copy(m.anchor).applyMatrix4(camera.matrixWorldInverse); mv.copy(m.anchor).project(camera);
        const inFront = mc.z < -0.2, onScreen = inFront && Math.abs(mv.x) < 0.94 && Math.abs(mv.y) < 0.86;
        if (onScreen) { x = mv.x; y = mv.y; }
        else if (m.minor && m.area !== ca || ca === -1 && m.area >= 0) vis = false; // na borda, só o que importa
        else {
          edge = true; let dx = mc.x, dy = mc.y * 0.35; if (!inFront && Math.abs(dx) < 0.01) dx = 1;
          const sx = (small ? 0.80 : 0.88) / Math.max(1e-4, Math.abs(dx)), sy = 0.62 / Math.max(1e-4, Math.abs(dy)), sc = Math.min(sx, sy);
          x = dx * sc; y = Math.max(-0.62, Math.min(0.62, dy * sc));
          if (!inFront) { x = Math.sign(dx) * (small ? 0.80 : 0.88); y = Math.max(-0.5, Math.min(0.5, mc.y * 0.1)); } // atrás: vai para o lado mais perto
        }
      }
      k.sx = (x * 0.5 + 0.5) * W; k.sy = (-y * 0.5 + 0.5) * Hh;
      if (vis && edge) edges.push(k);
      else if (vis) {
        k.el.style.transform = `translate(${k.sx}px, ${k.sy}px) translate(-50%, -100%)`;
        k.el.style.opacity = String(Math.max(0.4, 1 - dist / 38));
      }
      if (vis && edge) k.el.style.opacity = "0.92";
      if (edge !== k.edge) { k.edge = edge; k.el.classList.toggle("edge", edge); }
      if (vis !== k.shown) { k.shown = vis; k.el.classList.toggle("on", vis); k.el.tabIndex = vis ? 0 : -1; if (!vis) k.el.style.opacity = "0"; }
    }
    for (const side of [-1, 1]) {
      const g = edges.filter((k) => Math.sign(k.sx - W / 2 || 1) === side).sort((p, q) => p.sy - q.sy);
      for (let j = 1; j < g.length; j++) if (g[j].sy - g[j - 1].sy < 50) g[j].sy = g[j - 1].sy + 50;
      const over = g.length ? g[g.length - 1].sy - (Hh - 120) : 0; if (over > 0) g.forEach((k) => (k.sy -= over));
      const fixed = marks.filter((k) => k.shown && !k.edge).map((k) => ({ x: k.sx, y: k.sy - 22, w: (k.el.offsetWidth || 160) / 2 + 8 }));
      for (const k of g) { k.el.classList.toggle("left", side < 0); const w = k.el.offsetWidth || 160, xx = Math.min(W - 14 - w / 2, Math.max(14 + w / 2, k.sx));
        for (let n = 0; n < 6 && fixed.some((f) => Math.abs(f.x - xx) < f.w + w / 2 && Math.abs(f.y - k.sy) < 46); n++) k.sy += 46;
        k.el.style.transform = `translate(${xx}px, ${k.sy}px) translate(-50%, -50%)`; }
    }
  }

  let hinted = false; function hint() { if (hinted) return; hinted = true; setTimeout(() => $("dica").classList.add("off"), 6000); }

  /* ---------------- painel, avisos e o recado ---------------- */
  const panel = $("painel"); let openThing = null;
  const esc = (s) => String(s || "").replace(/[&<>"]/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[ch]));
  function showPanel(kick, title, html, thing) {
    openThing = thing || null; $("pKick").textContent = kick; $("pTitulo").textContent = title; $("pCorpo").innerHTML = html;
    panel.classList.add("open"); panel.setAttribute("aria-hidden", "false");
  }
  function closePanel() { if (!panel.classList.contains("open")) return; panel.classList.remove("open"); panel.setAttribute("aria-hidden", "true"); openThing = null; books.concat(visitorBooks).forEach((b) => (b.open = false)); if (focus) { focus = null; flyTo(cur().pose); } }
  $("pFechar").addEventListener("click", closePanel);
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
  function focusOn(p, nx, nz, dist) { focus = { pos: V3(p.x + nx * dist, EYE - 0.05, p.z + nz * dist), tgt: V3(p.x, p.y + 0.15, p.z) }; flyTo(focus); }
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
        go("estante");
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
      case "busca": $("busca").focus(); break;
      case "indice": openIndex(); break;
      case "mundos": go("mundos-n"); break;
      case "musica": toggleMusic(); break;
      case "contato": showPanel("Contato", "Fernando Rateke", `<p>Estudante do Ensino Médio integrado ao Técnico em Análise e Desenvolvimento de Sistemas, no SESI SENAI, em Florianópolis.</p><div class="links"><a href="mailto:fernando_rateke-n@estudante.sesisenai.org.br">E-mail</a><a href="https://github.com/fernando-rateke" target="_blank" rel="noopener">GitHub</a></div>`); break;
      case "sobre": showPanel("O Grande Salão", "Fernando Rateke · Portfólio 2026", `<p><i>A jornada é o que dá forma ao mundo.</i></p><p>Esta biblioteca não tem fim. As fendas nas estantes levam aos mundos; a porta de madeira leva às salas das matérias, aos certificados e, no fim, à Sala de Leitura, onde fica a Estante dos Visitantes.</p><p>Clique nas etiquetas douradas para ir até um lugar, ou abra o Mapa e escolha para onde ir.</p>`); break;
      case "cert": showPanel("Certificado", c.data.cf.t, `<p>${esc(c.data.cf.s)}</p><p class="note">${esc(c.data.cf.p)}</p>`); focusOn(c.data.pos, c.data.nx, c.data.nz, 1.4); break;
      case "visitante": c.data.open = true; showPanel(`Estante dos Visitantes · ${new Date(c.data.visitor.criado_em || Date.now()).toLocaleDateString("pt-BR")}`, c.data.visitor.nome || "Visitante", `<p>${esc(c.data.visitor.recado)}</p>` + (c.data.visitor.meu ? `<p class="note">Este é o seu. Ele aparece para todos depois de aprovado.</p>` : "")); focusOn(c.data.g.position, c.data.nx, c.data.nz, 1.35); break;
    }
  }

  /* ---------------- busca ---------------- */
  const norm = (s) => String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
  const busca = $("busca"), res = $("resultados");
  busca.addEventListener("input", () => {
    const q = norm(busca.value.trim()); books.forEach((b) => (b.match = 0));
    if (!q) { res.hidden = true; res.innerHTML = ""; return; }
    const found = books.filter((b) => norm(b.a.t + " " + b.sub.name + " " + (b.a.s || "") + " " + (b.a.r || "")).includes(q)); found.forEach((b) => (b.match = 1));
    res.innerHTML = found.length ? found.slice(0, 10).map((b) => `<li><button type="button" data-id="${b.id}"><b>${esc(b.a.t)}</b><span>${esc(b.sub.name)} · sala ${b.room}</span></button></li>`).join("") : `<li class="none">Nenhum livro com isso nas estantes.</li>`;
    res.hidden = false;
  });
  res.addEventListener("click", (e) => { const bt = e.target.closest("button[data-id]"); if (!bt) return; const b = books.find((o) => o.id === bt.dataset.id); if (!b) return; res.hidden = true; busca.blur(); const pi = places.findIndex((p) => p.id === "sala" + b.room + (b.wall === 5 ? "b" : "")); if (pi >= 0) { if (pi !== placeIdx) hist.push(placeIdx); placeIdx = pi; $("aquiK").textContent = cur().g; $("aquiT").textContent = cur().t + (cur().sub ? " · " + cur().sub : ""); $("voltar").hidden = !hist.length; renderIndex(); } openBook(b); });
  busca.addEventListener("keydown", (e) => { if (e.key === "Enter") { const f = res.querySelector("button[data-id]"); if (f) f.click(); } });

  /* ---------------- entradas: teclado, arrastar para olhar, clicar ---------------- */
  addEventListener("keydown", (e) => {
    if (e.target && /INPUT|TEXTAREA/.test(e.target.tagName)) { if (e.key === "Escape") e.target.blur(); return; }
    if (e.key === "Backspace") { e.preventDefault(); back(); }
    else if (e.key === "Escape") { closePanel(); closeIndex(); }
    else if (e.key === "/") { e.preventDefault(); busca.focus(); }
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
  function look(dx, dy) { cam.yawT = Math.max(-0.75, Math.min(0.75, cam.yawT - dx * 0.0035)); cam.pitchT = Math.max(-0.45, Math.min(0.45, cam.pitchT - dy * 0.0035)); }
  const rc = new T.Raycaster();
  function pick(p) { rc.setFromCamera(p, camera); const h = rc.intersectObjects(clickables, false)[0]; return h && h.distance < 30 ? h.object.userData.click : null; }
  function hover(p) { const c = pick(p); if (c !== hotC) { hotC = c; canvas.classList.toggle("hot", !!c); } }
  function clickAt(p) { const c = pick(p); if (c) activate(c); }

  /* ---------------- o controle pelo celular fala por aqui ---------------- */
  window.biblioteca = {
    go, back, marks: () => marks.filter((k) => k.shown).map((k) => ({ t: k.m.t, id: k.m.id, edge: !!k.edge, x: Math.round(k.sx), y: Math.round(k.sy) })),
    places: () => places.map((p, i) => ({ i, id: p.id, t: p.t, g: p.g, sub: p.sub || "" })),
    look, pointer: (nx, ny) => { ptr.set(nx, ny); hover(ptr); return !!hotC; }, click: (nx, ny) => clickAt(new T.Vector2(nx, ny)),
    close: () => { closePanel(); closeIndex(); }, books: () => books.map((b) => ({ id: b.id, t: b.a.t, room: b.room })),
    openBook: (id) => { const b = books.find((o) => o.id === id); if (b) openBook(b); },
    state: () => ({ place: placeIdx, id: cur().id, flying: !!fly, panel: panel.classList.contains("open") }),
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
      $("hero").classList.add("off");
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
  let baseFov = 58;
  function resize() { const w = innerWidth, h = innerHeight; renderer.setSize(w, h, false); rt.setSize(Math.floor(w * DPR), Math.floor(h * DPR)); post.material.uniforms.uRes.value.set(w * DPR, h * DPR); camera.aspect = w / h; baseFov = w / h < 0.8 ? 72 : 58; camera.fov = baseFov * zoomK; camera.updateProjectionMatrix(); }
  addEventListener("resize", resize); resize();
  const clock = new T.Clock(); let clockT = 0; const tmp = new T.Vector3(), la = new T.Vector3();
  function frame() {
    const dt = Math.min(0.05, clock.getDelta()); clockT += dt; const t = clockT; U.uTime.value = t;
    if (fly) {
      fly.u = Math.min(1, fly.u + dt / fly.dur); const e = ease(fly.u);
      fly.curve.getPointAt(e, cam.pos); fly.curve.getPointAt(Math.min(1, e + 0.06), la); la.y = Math.max(la.y, 1.2);
      const look = tmp.copy(la).add(V3(0, -0.05, 0));
      const a = Math.min(1, fly.u / 0.18), b = Math.max(0, (fly.u - 0.62) / 0.38);
      cam.tgt.copy(fly.t0).lerp(look, a).lerp(fly.t1, b * b * (3 - 2 * b));
      if (fly.u >= 1) { const d = fly.done; fly = null; document.body.classList.remove("flying"); if (d) d(); }
    }
    cam.yaw += (cam.yawT - cam.yaw) * Math.min(1, dt * 5); cam.pitch += (cam.pitchT - cam.pitch) * Math.min(1, dt * 5);
    // um respiro de câmera parada, e o olhar em volta somado à pose do lugar
    const br = reduce ? 0 : Math.sin(t * 0.6) * 0.02;
    camera.position.copy(cam.pos).add(V3(0, br, 0));
    const dir = tmp.subVectors(cam.tgt, cam.pos); const dist = dir.length(); dir.normalize();
    const yaw = Math.atan2(dir.z, dir.x) + cam.yaw, pitch = Math.asin(Math.max(-0.99, Math.min(0.99, dir.y))) + cam.pitch;
    la.set(cam.pos.x + Math.cos(yaw) * Math.cos(pitch) * dist, cam.pos.y + Math.sin(pitch) * dist, cam.pos.z + Math.sin(yaw) * Math.cos(pitch) * dist);
    camera.lookAt(la);
    if (Math.abs(zoomT - zoomK) > 0.001) { zoomK += (zoomT - zoomK) * Math.min(1, dt * 4); camera.fov = baseFov * zoomK; camera.updateProjectionMatrix(); }
    placeRooms(Math.max(0, Math.round(cam.pos.x / D)));
    updateLights(t); updateMarkers();
    // poeira acompanha a câmera
    const P = dust.geometry.attributes.position.array;
    for (let i = 0; i < DUST; i++) { let x = P[i * 3], y = P[i * 3 + 1], z = P[i * 3 + 2]; y += dt * (0.04 + ds[i] * 0.07); x += Math.sin(t * 0.3 + i) * dt * 0.06; const cx = cam.pos.x, cz = cam.pos.z, cy = cam.pos.y;
      if (y > cy + 5) y = cy - 3; if (x - cx > 11) x -= 22; if (x - cx < -11) x += 22; if (z - cz > 11) z -= 22; if (z - cz < -11) z += 22; P[i * 3] = x; P[i * 3 + 1] = y; P[i * 3 + 2] = z; }
    dust.geometry.attributes.position.needsUpdate = true;
    // brasas da lareira
    const E = embers.geometry.attributes.position.array;
    for (let i = 0; i < EMB; i++) { const k = (t * (0.25 + es[i] * 0.3) + es[i]) % 1; E.set([XW + 0.9 + k * 0.5 + Math.sin(t * 2 + i) * 0.08, 0.5 + k * 2.6, (es[i] - 0.5) * 1.6 + Math.sin(t * 1.3 + i) * 0.15], i * 3); }
    embers.geometry.attributes.position.needsUpdate = true; embers.material.opacity = 0.75 + 0.25 * Math.sin(t * 9);
    // livros, fendas, certificados
    for (const b of books.concat(visitorBooks)) {
      const target = b.open ? 1 : hotC && hotC.data === b ? 0.4 : 0; b.out += (target - b.out) * Math.min(1, dt * 6);
      b.body.position.set(0, 0.19 + b.out * 0.05, b.out * 0.16); b.body.rotation.x = -b.out * 0.12;
      b.mats.forEach((m) => { m.uniforms.uHot.value = b.out; m.uniforms.uMatch.value = b.match; });
      b.halo.material.opacity = 0.14 + 0.1 * Math.sin(t * 2.2 + b.g.position.x) + b.out * 0.25 + b.match * 0.45;
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
  buildMarkers(); renderIndex(); go(0, true);
  requestAnimationFrame(frame);
  setTimeout(() => $("fade").classList.add("gone"), 500);
})();
