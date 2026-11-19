/* A torre (v4): o portfólio é uma torre-biblioteca redonda, com um vão no meio e uma escada em espiral que
   flutua e sobe meia volta por andar. Cada andar é uma parte da apresentação, em ordem (térreo, a jornada, o
   ensino médio, o curso técnico, os certificados, agradecimentos e futuro, o topo); cada parte mora num nicho
   da parede, com seu portal para o mundo dela e os livros das atividades flutuando na frente. Para baixo a
   torre continua sem fim; em cima, o céu. A câmera vai de cena em cena já enquadrada: pelo anel no mesmo
   andar, pela escada de um andar ao outro. O controle pelo celular fala com window.biblioteca. */
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

  /* ---------------- medidas da torre ---------------- */
  const FH = 8.5, RO = 15, RI = 6.2, NSEG = 72, SLAB = 0.6, SHELF = 6.9; // altura do andar, raio da parede, raio do vão
  const AW = 6.4, AD = 6.0, AH = 6.6;                                     // nicho: largura, fundo, altura
  const SR = 4.6, SW = 2.6, NSTEPS = 26, TURN = 0.5;                       // escada em espiral: raio, largura, degraus, voltas por andar
  const EYE = 1.7, ROW = 0.6, BASE = 0.25;
  const NFLOORS = 7, NBELOW = small ? 3 : 6;                               // andares de verdade, e os de baixo que só somem na névoa
  const FLOORS = [
    { f: 0, t: "Térreo", sub: "a entrada e o escritório" }, { f: 1, t: "A jornada", sub: "quem sou, 1º e 2º ano" },
    { f: 2, t: "Ensino médio", sub: "as quatro áreas" }, { f: 3, t: "Curso técnico", sub: "desenvolvimento de sistemas" },
    { f: 4, t: "Certificados", sub: "feiras e iniciação científica" }, { f: 5, t: "Agradecimentos e futuro", sub: "o que vem depois" },
    { f: 6, t: "O topo", sub: "o fim" },
  ];

  const NL = 16;
  const U = {
    uTime: { value: 0 }, uWave: { value: -1e5 }, // abaixo de uWave a torre está apagada (só no final; normalmente fica lá embaixo, tudo aceso)
    uFog: { value: new T.Color("#0b0806") }, uFogD: { value: small ? 0.04 : 0.036 },
    uAmb: { value: new T.Vector3(0.17, 0.14, 0.11) },
    uLP: { value: Array.from({ length: NL }, () => new T.Vector3(0, -999, 0)) },
    uLC: { value: Array.from({ length: NL }, () => new T.Vector3()) },
  };

  /* luz e névoa comuns a tudo */
  const COMMON = `
    uniform float uTime, uFogD, uWave; uniform vec3 uFog, uAmb;
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
      { float r = length(w.xz); acc += vec3(0.30, 0.36, 0.50) * 0.2 * exp(-r * 0.2) * (0.5 + 0.5 * n.y * n.y); } // a luz fria que desce pelo vão
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
      if (vK > 2.5) { gl_FragColor = vec4(fogIt(c * 1.7 * (vW.y > uWave ? 1.0 : 0.05), vW), 1.0); return; }
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
      vec3 col = c * lit * (1.0 + uHot * 0.16) + c * uEmitC * uEmit * (vW.y > uWave ? 1.0 : 0.04) + rim * scat * 0.05 + vec3(1.0, 0.8, 0.45) * rim * uHot * 0.4;
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


  /* ---------------- a torre ---------------- */
  // um anel de chão em cada andar, em volta de um vão redondo; a parede de fora é estante do chão ao teto,
  // aberta em nichos (um para cada parte); no vão, uma escada em espiral que flutua e sobe meia volta por andar
  const ALC = [ // nichos: andar, ângulo (graus), fundo, o que tem
    { id: "lareira", f: 0, a: 90, d: 2.6, kind: "lareira" },
    { id: "porta", f: 0, a: 270, d: 1.4, kind: "porta" }, { id: "alquimia", f: 0, a: 180, d: 4.2, kind: "alquimia" },
    { id: "quemsou", f: 1, a: 210, world: 0 }, { id: "trem", f: 1, a: 330, world: 6 },
    { id: "linguagens", f: 2, a: 45, world: 1, subj: "Área de Linguagens" }, { id: "matematica", f: 2, a: 135, world: 2, subj: "Área de Matemática" },
    { id: "natureza", f: 2, a: 225, world: 3, subj: "Ciências da Natureza" }, { id: "humanas", f: 2, a: 315, world: 4, subj: "Ciências Humanas" },
    { id: "tecnica", f: 3, a: 270, world: 5 }, { id: "modelagem", f: 3, a: 330, subj: "Modelagem de Sistemas" }, { id: "desenvolvimento", f: 3, a: 30, subj: "Desenvolvimento de Sistemas" },
    { id: "banco", f: 3, a: 90, subj: "Banco de Dados" }, { id: "aplicativos", f: 3, a: 150, subj: "Programação de Aplicativos" }, { id: "iot", f: 3, a: 210, subj: "IoT - Internet das Coisas" },
    { id: "certificados", f: 4, a: 90, kind: "certs" },
    { id: "agradecimentos", f: 5, a: 30, world: 9 }, { id: "futuro", f: 5, a: 150, world: 8 },
  ];
  ALC.forEach((al) => { al.d = al.d || AD; al.r = al.a * Math.PI / 180; al.y = al.f * FH; al.u = V3(Math.cos(al.r), 0, Math.sin(al.r)); al.tv = V3(-Math.sin(al.r), 0, Math.cos(al.r)); });
  // coordenadas dentro de um nicho: x ao longo da parede, z para fora (0 = boca do nicho), y a partir do chão do andar
  const AL = (al, x, y, z) => V3(RO * al.u.x + al.tv.x * x + al.u.x * z, al.y + y, RO * al.u.z + al.tv.z * x + al.u.z * z);
  const landA = (f) => (270 + f * TURN * 360) * Math.PI / 180; // onde a escada encosta em cada andar
  const ring = (rIn, rOut, seg = 96) => { const s = new T.Shape(); s.absarc(0, 0, rOut, 0, Math.PI * 2, false); const h = new T.Path(); h.absarc(0, 0, rIn, 0, Math.PI * 2, true); s.holes.push(h); const g = new T.ShapeGeometry(s, seg); return g; };
  function floorGeo(S, W, y0, alcs, opt = {}) {
    const top = !!opt.top;
    const fg = ring(RI, RO + 0.05); fg.rotateX(-Math.PI / 2); S.add(fg, M(0, y0, 0), FLOOR, 1);
    const ug = ring(RI, RO + 0.05); ug.rotateX(Math.PI / 2); S.add(ug, M(0, y0 - SLAB, 0), CEILC, 2);
    S.add(new T.CylinderGeometry(RI, RI, SLAB, 96, 1, true), M(0, y0 - SLAB / 2, 0), WOOD_D, 0);
    { const tg = new T.TorusGeometry(RI, 0.06, 8, 120); tg.rotateX(Math.PI / 2); S.add(tg, M(0, y0 - SLAB, 0), GOLD, 0); }
    // a parede de fora: estante em gomos, pulando as bocas dos nichos
    const isOpen = (phi) => alcs.some((al) => { let d = Math.abs(((phi - al.r) % (2 * Math.PI) + 3 * Math.PI) % (2 * Math.PI) - Math.PI); return d < Math.atan((AW / 2 + 0.55) / RO); });
    const wallTop = top ? 1.25 : FH - SLAB;
    for (let k = 0; k < NSEG; k++) {
      const a0 = k / NSEG * Math.PI * 2, a1 = (k + 1) / NSEG * Math.PI * 2, am = (a0 + a1) / 2;
      if (isOpen(am)) continue;
      const x0 = RO * Math.cos(a0), z0 = RO * Math.sin(a0), x1 = RO * Math.cos(a1), z1 = RO * Math.sin(a1), len = Math.hypot(x1 - x0, z1 - z0), tx = (x1 - x0) / len, tz = (z1 - z0) / len;
      if (top) { S.add(new T.BoxGeometry(len + 0.02, wallTop, 0.5), M((x0 + x1) / 2, y0 + wallTop / 2, (z0 + z1) / 2, alignX(tx, tz)), "#5C5049", 0); if (k % 2 === 0) S.add(new T.BoxGeometry(len * 0.5, 0.45, 0.55), M((x0 + x1) / 2, y0 + wallTop + 0.22, (z0 + z1) / 2, alignX(tx, tz)), "#5C5049", 0); continue; }
      W.wall(x0, z0, tx, tz, -Math.cos(am), -Math.sin(am), len, y0, y0 + SHELF, k * len, 50 + k * 0.37 + y0 * 0.11, SHELF - 0.45, y0);
      S.add(new T.PlaneGeometry(len + 0.02, wallTop - SHELF), M((x0 + x1) / 2, y0 + (SHELF + wallTop) / 2, (z0 + z1) / 2, Math.atan2(-Math.cos(am), -Math.sin(am))), WOOD_D, 0);
      S.add(new T.BoxGeometry(len + 0.03, 0.18, 0.4), M((x0 + x1) / 2 - Math.cos(am) * 0.18, y0 + SHELF + 0.09, (z0 + z1) / 2 - Math.sin(am) * 0.18, alignX(tx, tz)), WOOD, 0);
      S.add(new T.BoxGeometry(len + 0.03, 0.035, 0.42), M((x0 + x1) / 2 - Math.cos(am) * 0.18, y0 + SHELF + 0.2, (z0 + z1) / 2 - Math.sin(am) * 0.18, alignX(tx, tz)), GOLD, 0);
      if (k % 6 === 0) { // colunas, e uma arandela em colunas alternadas
        const cx = (RO - 0.28) * Math.cos(a0), cz = (RO - 0.28) * Math.sin(a0);
        S.add(new T.BoxGeometry(0.55, wallTop, 0.55), M(cx, y0 + wallTop / 2, cz, -a0), WOOD_D, 0);
        S.add(new T.BoxGeometry(0.72, 0.22, 0.72), M(cx, y0 + SHELF + 0.05, cz, -a0), GOLD, 0);
        if (k % 12 === 0) { const lx = (RO - 0.75) * Math.cos(a0), lz = (RO - 0.75) * Math.sin(a0); S.add(new T.SphereGeometry(0.16, 12, 8), M(lx, y0 + 3.2, lz), "#FFC06A", 3); S.add(new T.CylinderGeometry(0.09, 0.14, 0.07, 10), M(lx, y0 + 3.42, lz), GOLD, 0); opt.lamps && opt.lamps.push(V3(lx, y0 + 3.2, lz)); }
      }
    }
    // o guarda-corpo do vão, com o vão da escada aberto
    const la = landA(Math.round(y0 / FH)), la2 = landA(Math.round(y0 / FH) - 1) + Math.PI * 2 * TURN;
    const gap = (phi) => [la, la2].some((g) => Math.abs(((phi - g) % (2 * Math.PI) + 3 * Math.PI) % (2 * Math.PI) - Math.PI) < 0.24);
    const NB = 120;
    for (let k = 0; k < NB; k++) {
      const a0 = k / NB * Math.PI * 2, a1 = (k + 1) / NB * Math.PI * 2, am = (a0 + a1) / 2; if (gap(am)) continue;
      const r = RI + 0.12, x0 = r * Math.cos(a0), z0 = r * Math.sin(a0), x1 = r * Math.cos(a1), z1 = r * Math.sin(a1), len = Math.hypot(x1 - x0, z1 - z0), ry = alignX((x1 - x0) / len, (z1 - z0) / len);
      S.add(new T.BoxGeometry(len + 0.01, 0.08, 0.14), M((x0 + x1) / 2, y0 + 1.02, (z0 + z1) / 2, ry), WOOD, 0);
      S.add(new T.BoxGeometry(len + 0.01, 0.02, 0.15), M((x0 + x1) / 2, y0 + 1.07, (z0 + z1) / 2, ry), GOLD, 0);
      S.add(new T.BoxGeometry(len + 0.01, 0.06, 0.1), M((x0 + x1) / 2, y0 + 0.1, (z0 + z1) / 2, ry), WOOD, 0);
      if (k % 2 === 0) S.add(new T.CylinderGeometry(0.022, 0.03, 0.9, 6), M(x0, y0 + 0.56, z0), WOOD_D, 0);
    }
    // os nichos
    for (const al of alcs) {
      const d = al.d, hw = AW / 2;
      const flo = new T.PlaneGeometry(AW + 1.0, d + 0.9); flo.rotateX(-Math.PI / 2); S.add(flo, M(AL(al, 0, 0.003, d / 2 - 0.45).x, y0 + 0.003, AL(al, 0, 0, d / 2 - 0.45).z, -al.r + Math.PI / 2), FLOOR, 1);
      const cei = new T.PlaneGeometry(AW + 1.0, d + 0.9); cei.rotateX(Math.PI / 2); const cp = AL(al, 0, AH, d / 2 - 0.45); S.add(cei, M(cp.x, cp.y, cp.z, -al.r + Math.PI / 2), CEILC, 2);
      // paredes dos lados (estantes) e do fundo
      for (const sg of [-1, 1]) { const a = AL(al, sg * hw, 0, -0.9), b = AL(al, sg * hw, 0, d); const len = a.distanceTo(b), tx = (b.x - a.x) / len, tz = (b.z - a.z) / len; W.wall(a.x, a.z, tx, tz, -sg * al.tv.x, -sg * al.tv.z, len, y0, y0 + AH, 0, 70 + al.a * 0.01 + sg, AH - 0.5, y0); }
      { const a = AL(al, -hw, 0, d), b = AL(al, hw, 0, d), len = a.distanceTo(b), tx = (b.x - a.x) / len, tz = (b.z - a.z) / len;
        if (al.kind === "porta") { /* atrás da porta não tem parede: lá fora fica a fachada */ }
        else if (al.world != null || al.kind === "lareira") S.add(new T.PlaneGeometry(len, AH), M((a.x + b.x) / 2, y0 + AH / 2, (a.z + b.z) / 2, Math.atan2(-al.u.x, -al.u.z)), "#3E342E", 0);
        else W.wall(a.x, a.z, tx, tz, -al.u.x, -al.u.z, len, y0, y0 + AH, 0, 80 + al.a * 0.01, AH - 0.5, y0); }
      // a boca do nicho: pilastras, lintel com friso dourado e o painel até o teto
      const ry = Math.atan2(al.tv.x, al.tv.z) - Math.PI / 2;
      for (const sg of [-1, 1]) { const p = AL(al, sg * (hw + 0.42), 0, -0.5); S.add(new T.BoxGeometry(0.9, AH + 0.4, 1.0), M(p.x, y0 + (AH + 0.4) / 2, p.z, ry), WOOD, 0); S.add(new T.BoxGeometry(1.04, 0.24, 1.12), M(p.x, y0 + AH + 0.36, p.z, ry), GOLD, 0); S.add(new T.BoxGeometry(1.04, 0.3, 1.12), M(p.x, y0 + 0.15, p.z, ry), WOOD_D, 0); }
      { const p = AL(al, 0, 0, -0.5); S.add(new T.BoxGeometry(AW + 1.9, 0.5, 1.0), M(p.x, y0 + AH + 0.25, p.z, ry), WOOD, 0); S.add(new T.BoxGeometry(AW + 1.95, 0.05, 1.04), M(p.x, y0 + AH + 0.52, p.z, ry), GOLD, 0);
        if (!top) { const q = AL(al, 0, 0, -0.02); S.add(new T.PlaneGeometry(AW + 1.9, wallTop - AH - 0.5), M(q.x, y0 + (AH + 0.5 + wallTop) / 2, q.z, Math.atan2(-al.u.x, -al.u.z)), WOOD_D, 0); } }
    }
    // a escada deste andar até o de cima: degraus soltos no ar, cada um com um fio de luz embaixo
    if (!top && !opt.noStairs) {
      const f = Math.round(y0 / FH), a0 = landA(f);
      const land = (a, y) => { const lp = V3((SR + 0.5) * Math.cos(a), 0, (SR + 0.5) * Math.sin(a)); S.add(new T.BoxGeometry(SW + 1.4, 0.16, 1.6), M(lp.x, y - 0.08, lp.z, -a), FLOOR, 1); };
      land(a0, y0);
      for (let s = 0; s < NSTEPS; s++) {
        const a = a0 + (s + 0.5) / NSTEPS * TURN * Math.PI * 2, y = y0 + (s + 1) * FH / NSTEPS;
        S.add(new T.BoxGeometry(SW, 0.14, 0.9), M(SR * Math.cos(a), y - 0.07, SR * Math.sin(a), -a), FLOOR, 1);
        S.add(new T.BoxGeometry(SW, 0.03, 0.06), M(SR * Math.cos(a), y - 0.155, SR * Math.sin(a), -a), "#FFC977", 3);
      }
    }
  }
  const TB = Builder(), TW = Builder(), TLAMPS = [];
  for (let f = 0; f < NFLOORS; f++) floorGeo(TB, TW, f * FH, ALC.filter((al) => al.f === f), { top: f === NFLOORS - 1, lamps: TLAMPS });
  scene.add(new T.Mesh(TB.build(), structMat), new T.Mesh(TW.build(), bookMat));
  // para baixo, a torre continua sem fim: o mesmo andar vazio, repetido até sumir na névoa
  { const GB = Builder(), GW = Builder(); floorGeo(GB, GW, 0, [], {});
    const gs = new T.InstancedMesh(GB.build(), structMat, NBELOW), gw = new T.InstancedMesh(GW.build(), bookMat, NBELOW);
    for (let k = 0; k < NBELOW; k++) { const m = new T.Matrix4().compose(V3(0, -(k + 1) * FH, 0), new T.Quaternion().setFromAxisAngle(V3(0, 1, 0), (k + 1) * Math.PI), new T.Vector3(1, 1, 1)); gs.setMatrixAt(k, m); gw.setMatrixAt(k, m); }
    gs.frustumCulled = gw.frustumCulled = false; scene.add(gs, gw); }
  // o topo: plataforma no meio do vão, e o céu
  const TOPY = (NFLOORS - 1) * FH;
  { const P = Builder(); const disc = new T.CircleGeometry(SR - 1.0, 64); disc.rotateX(-Math.PI / 2); P.add(disc, M(0, TOPY + 0.004, 0), FLOOR, 1);
    const und = new T.CircleGeometry(SR - 1.0, 64); und.rotateX(Math.PI / 2); P.add(und, M(0, TOPY - 0.5, 0), CEILC, 2);
    P.add(new T.CylinderGeometry(SR - 1.0, SR - 1.0, 0.5, 64, 1, true), M(0, TOPY - 0.25, 0), WOOD_D, 0);
    const tg = new T.TorusGeometry(SR - 1.0, 0.07, 8, 96); tg.rotateX(Math.PI / 2); P.add(tg, M(0, TOPY + 0.03, 0), GOLD, 0);
    P.add(new T.CylinderGeometry(0.55, 0.75, 1.0, 8), M(0, TOPY + 0.5, 0), "#5C5049", 0); P.add(new T.CylinderGeometry(0.7, 0.7, 0.08, 8), M(0, TOPY + 1.04, 0), GOLD, 0);
    // a ponte da plataforma até onde a escada chega
    const la = landA(NFLOORS - 1); P.add(new T.BoxGeometry(SR + 1.4, 0.16, 1.8), M((SR - 0.3) / 2 * Math.cos(la), TOPY - 0.08, (SR - 0.3) / 2 * Math.sin(la), -la), FLOOR, 1);
    scene.add(new T.Mesh(P.build(), structMat)); }
  const SKY_FS = `varying vec3 vP; uniform float uTime;
    float hs(vec3 p){ return fract(sin(dot(p, vec3(12.9898, 78.233, 37.719))) * 43758.5453); }
    void main(){ vec3 d = normalize(vP); float h = max(d.y, 0.0);
      vec3 c = mix(vec3(0.02, 0.025, 0.06), vec3(0.006, 0.008, 0.02), pow(h, 0.6));
      for (int L = 0; L < 3; L++) { float sc = 180.0 + float(L) * 170.0; vec3 q = d * sc; vec3 i = floor(q); float s = hs(i + float(L) * 17.0);
        vec3 o = vec3(hs(i + 3.1), hs(i + 7.7), hs(i + 1.3)) * 0.6 + 0.2; float dd = length(fract(q) - o);
        float tw = 0.65 + 0.35 * sin(uTime * (0.8 + s * 2.5) + s * 50.0);
        c += vec3(0.85, 0.9, 1.0) * step(0.985 - float(L) * 0.004, s) * smoothstep(0.09, 0.0, dd) * tw * (1.6 - float(L) * 0.4); }
      float band = exp(-pow(dot(d, normalize(vec3(0.3, 0.55, -0.78))) * 3.0, 2.0)); c += vec3(0.13, 0.11, 0.2) * band;
      gl_FragColor = vec4(c, 1.0); }`;
  const sky = new T.Mesh(new T.SphereGeometry(190, 48, 24), new T.ShaderMaterial({ uniforms: { uTime: U.uTime }, vertexShader: "varying vec3 vP; void main(){ vP = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }", fragmentShader: SKY_FS, side: T.BackSide, depthWrite: false, fog: false }));
  sky.position.set(0, TOPY, 0); sky.renderOrder = -1; scene.add(sky);
  /* ---------------- luzes ---------------- */
  const LIGHTS = []; // { p, c (Color), i, flick, ph }
  const addLight = (x, y, z, color, i, flick = 0) => { const L = { p: new T.Vector3(x, y, z), c: new T.Color(color), i, i0: i, flick, ph: Math.random() * 10 }; LIGHTS.push(L); return L; };
  const lightAt = (p, color, i, flick = 0) => addLight(p.x, p.y, p.z, color, i, flick);
  const lampC = new T.Color("#FFB45E");
  const lampList = [];
  const lightTmp = [];
  function updateLights(t) {
    lightTmp.length = 0; const cp = camera.position;
    for (const L of LIGHTS) { if (L.flick) L.i = L.i0 * (1 - L.flick + L.flick * (0.6 + 0.4 * Math.sin(t * 11 + L.ph) * Math.sin(t * 7.3 + L.ph * 2))); else L.i = L.i0; if (L.p.y < U.uWave.value) L.i *= 0.03; L.s = L.i / (1 + L.p.distanceToSquared(cp) * 0.02); lightTmp.push(L); }
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
  const halos = pts(TLAMPS.length + 4, 1.15, 0xffb35c, 0.32);
  { const hp = halos.geometry.attributes.position.array; TLAMPS.forEach((p, i) => hp.set([p.x, p.y, p.z], i * 3)); for (let i = TLAMPS.length; i < TLAMPS.length + 4; i++) hp.set([0, -999, 0], i * 3); }
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


  /* ---------------- o que mora na torre ---------------- */
  const clickables = []; // { mesh, kind, data, hot }
  const propHot = [];    // objetos clicáveis que brilham de leve e acendem com o cursor
  const clickable = (g, kind, data, label) => {
    const c = { g, kind, data, hot: 0, label };
    if (label) { c.mats = ownMats(g); propHot.push(c); }
    g.traverse((o) => { if (o.isMesh && o.visible) { o.userData.click = c; clickables.push(o); } }); return c;
  };
  const faceTo = (x, z, tx, tz) => Math.atan2(tx - x, tz - z);
  const alc = (id) => ALC.find((a) => a.id === id);
  const polarY = (a, r, y) => V3(r * Math.cos(a), y, r * Math.sin(a));
  const lookIn = (p) => faceTo(p.x, p.z, 0, 0); // +z local virado para o vão
  TLAMPS.forEach((p) => addLight(p.x, p.y, p.z, "#FFB868", 1.1, 0.06));
  // um lustre pendurado no meio do vão em cada andar, e a luz quente dele
  for (let f = 0; f < NFLOORS - 1; f++) addLight(0, f * FH + 5.4, 0, "#FFB25A", 6.0, 0.03);
  // luz de preenchimento quente em volta do anel de cada andar (sem ela o térreo da entrada ficava quase preto)
  for (let f = 0; f < NFLOORS; f++) for (let k = 0; k < 8; k++) { const a = (k + 0.5) / 8 * Math.PI * 2; addLight(Math.cos(a) * 11, f * FH + 4.6, Math.sin(a) * 11, "#FFB868", 1.9, 0.02); }
  addLight(0, 2.2, -9.5, "#FFC27A", 2.6, 0.03); addLight(-4, 2.4, -4, "#FFC27A", 1.8, 0.03); addLight(4, 2.4, -4, "#FFC27A", 1.8, 0.03); // a entrada e o pé da escada
  prop("lustre", (m) => { for (let f = 0; f < NFLOORS - 2; f++) { const g = place(m.clone(true), { at: V3(0, f * FH + 4.4, 0), h: 2.6, emit: 0.35 }); const ch = new T.Mesh(new T.CylinderGeometry(0.02, 0.02, FH - 2.6, 4), structMat); ch.position.y = 2.6 + (FH - 2.6) / 2; g.add(ch); } }, 2);
  // placas: o nome de cada nicho em cima da boca, e o de cada andar ao lado da escada
  const signMat = (tex) => new T.ShaderMaterial({ uniforms: Object.assign({ map: { value: tex } }, U), vertexShader: PROP_VS, fragmentShader: `${COMMON} uniform sampler2D map; varying vec3 vW; varying vec3 vN; varying vec2 vUv; void main(){ vec4 c = texture2D(map, vUv); if (c.a < 0.1) discard; vec3 l = band(lights(vW, normalize(vN))); gl_FragColor = vec4(fogIt(c.rgb * (0.55 + l * 0.75), vW), 1.0); }` });
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
  FLOORS.forEach((fl) => { if (fl.f === 0) return; const a = landA(fl.f) + 0.42, p = polarY(a, RI + 0.35, fl.f * FH + 1.9); sign(p, lookIn(p) + Math.PI, fl.t, fl.sub, "#C8A04A", 2.5, 0.6); });

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
      a *= vW.y > uWave ? 1.0 : 0.0; gl_FragColor = vec4(col * a * 1.5, a);
    }`;

  // o Escritório, no térreo: a lareira no nicho de trás, as poltronas, a mesa, o gramofone, a cômoda, o piano
  const LA = alc("lareira");
  const FIRE = AL(LA, 0, 0.12, LA.d - 0.62), FIREN = LA.u.clone().negate(), FIRET = LA.tv.clone();
  const fireGroup = new T.Group(); fireGroup.position.copy(FIRE); scene.add(fireGroup);
  [[0.95, 0.95, 0, 0], [0.7, 0.72, -0.22, 3.1], [0.62, 0.66, 0.24, 7.7]].forEach(([w, h, dz, seed]) => {
    const geo = new T.PlaneGeometry(w, h); geo.translate(dz, h / 2, 0);
    const m = new T.Mesh(geo, new T.ShaderMaterial({ uniforms: Object.assign({ uSeed: { value: seed } }, U), vertexShader: PROP_VS, fragmentShader: FIRE_FS, transparent: true, depthWrite: false, blending: T.AdditiveBlending, side: T.DoubleSide }));
    m.renderOrder = 3; fireGroup.add(m);
  });
  { const logs = new T.Group(), lm = new T.MeshBasicMaterial({ color: "#2B1A10" });
    [[0, 0.06, 0, 0.35], [0.05, 0.06, 0.02, -0.4], [-0.06, 0.16, 0, 0.05]].forEach(([dx, y, dz, r]) => { const c = new T.Mesh(new T.CylinderGeometry(0.065, 0.075, 0.78, 10), lm); c.rotation.set(Math.PI / 2, r, 0); c.position.set(dx, y, dz); logs.add(c); });
    propize(logs, { emit: 0.55, emitC: "#FF5A1A" }); logs.position.copy(FIRE).setY(0.08); logs.rotation.y = lookIn(FIRE) + Math.PI / 2; scene.add(logs);
    const glow = new T.Mesh(new T.PlaneGeometry(1.6, 1.4), new T.MeshBasicMaterial({ map: glowTex, color: 0xff7a2a, transparent: true, opacity: 0.55, depthWrite: false, blending: T.AdditiveBlending }));
    glow.rotation.x = -Math.PI / 2; glow.position.copy(FIRE).addScaledVector(FIREN, 0.55).setY(0.02); scene.add(glow); }
  lightAt(FIRE.clone().addScaledVector(FIREN, 0.7).setY(0.75), "#FF7A2A", 5.2, 0.28);
  prop("lareira", (m) => place(m, { at: AL(LA, 0, 0, LA.d - 0.4), h: 3.0, ry: lookIn(AL(LA, 0, 0, LA.d)) }), 1);
  prop("candelabro", (m) => { for (const x of [-1.9, 1.9]) { place(m.clone(true), { at: AL(LA, x, 0, LA.d - 0.6), h: 1.84, emit: 0.18 }); lightAt(AL(LA, x, 1.95, LA.d - 0.7), "#FFB060", 0.7, 0.14); } }, 3);
  prop("utensilios", (m) => place(m, { at: AL(LA, -1.3, 0, LA.d - 1.1), h: 0.95, drop: (o) => o.name !== "pCylinder162" }), 3);
  for (const x of [-1.35, 1.35]) { const p = AL(LA, x, 0, -0.9); armchair(p.x, p.z, faceTo(p.x, p.z, FIRE.x, FIRE.z), 0); }
  prop("velas", (m) => { place(m.clone(true), { at: AL(LA, 1.2, 2.62, LA.d - 0.25), size: 0.32, emit: 0.5 }); place(m, { at: AL(LA, -1.2, 2.62, LA.d - 0.25), size: 0.32, emit: 0.5 }); }, 3);
  // a parede da lareira: papel de parede, lambri de madeira, o quadro da torre, dois estandartes e a rosácea no alto
  { const ryW = Math.atan2(-LA.u.x, -LA.u.z), zW = LA.d - 0.02;
    const cv = (w, h, draw) => { const c = document.createElement("canvas"); c.width = w; c.height = h; draw(c.getContext("2d"), w, h); const t = new T.CanvasTexture(c); t.anisotropy = 4; return t; };
    const panel = (tex, w, h, x, y, z, o = {}) => { const g = new T.PlaneGeometry(w, h, o.seg || 1, o.seg || 1); if (o.rep) { const uv = g.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * o.rep[0], uv.getY(i) * o.rep[1]); } if (o.wave) { const ps = g.attributes.position; for (let i = 0; i < ps.count; i++) ps.setZ(i, Math.sin(ps.getX(i) * 9 + ps.getY(i) * 2) * 0.02 * (0.5 - ps.getY(i) / h)); g.computeVertexNormals(); }
      const m = new T.Mesh(g, new T.MeshBasicMaterial({ map: tex, transparent: !!o.cut, alphaTest: o.cut ? 0.5 : 0 })); propize(m, { emit: o.emit || 0, emitC: o.emitC || "#ffffff" }); m.position.copy(AL(LA, x, y, z)); m.rotation.y = ryW; scene.add(m); return m; };
    const box = (w, h, d, x, y, z, col, emit = 0) => { const m = new T.Mesh(new T.BoxGeometry(w, h, d), new T.MeshBasicMaterial({ color: col })); propize(m, { emit, emitC: col }); m.position.copy(AL(LA, x, y, z)); m.rotation.y = ryW; scene.add(m); return m; };
    // papel de parede verde-escuro com arabescos dourados
    const damask = cv(256, 256, (g, w, h) => { g.fillStyle = "#1f3a30"; g.fillRect(0, 0, w, h); g.strokeStyle = "rgba(196,150,74,0.4)"; g.lineWidth = 2;
      g.beginPath(); g.moveTo(0, h / 2); g.lineTo(w / 2, 0); g.lineTo(w, h / 2); g.lineTo(w / 2, h); g.closePath(); g.stroke(); // treliça em losango
      g.fillStyle = "rgba(196,150,74,0.34)";
      for (const [cx, cy] of [[w / 2, h / 2], [0, 0], [w, 0], [0, h], [w, h]]) { g.beginPath(); g.ellipse(cx, cy, 22, 34, 0, 0, 7); g.fill(); g.fillStyle = "#1f3a30"; g.beginPath(); g.ellipse(cx, cy, 13, 22, 0, 0, 7); g.fill(); g.fillStyle = "rgba(196,150,74,0.45)"; g.beginPath(); g.arc(cx, cy, 6, 0, 7); g.fill(); g.fillStyle = "rgba(196,150,74,0.34)"; }
      for (const [cx, cy] of [[w / 2, 0], [0, h / 2], [w, h / 2], [w / 2, h]]) for (const [dx, dy] of [[0, -9], [9, 0], [0, 9], [-9, 0]]) { g.beginPath(); g.arc(cx + dx, cy + dy, 6, 0, 7); g.fill(); }
      g.fillStyle = "rgba(0,0,0,0.12)"; for (let i = 0; i < 1200; i++) g.fillRect(Math.random() * w, Math.random() * h, 1, 1); });
    damask.wrapS = damask.wrapT = T.RepeatWrapping;
    panel(damask, AW, AH - 1.35, 0, 1.35 + (AH - 1.35) / 2, zW, { rep: [AW / 1.1, (AH - 1.35) / 1.1] });
    // lambri: painéis de madeira com molduras e um friso dourado em cima
    box(AW, 1.35, 0.05, 0, 0.675, zW - 0.02, WOOD_D);
    for (let i = 0; i < 6; i++) { const x = -AW / 2 + 0.55 + i * ((AW - 1.1) / 5); box(0.78, 0.86, 0.04, x, 0.7, zW - 0.05, WOOD); box(0.62, 0.7, 0.03, x, 0.7, zW - 0.08, "#4a2e1e"); }
    box(AW, 0.1, 0.1, 0, 1.36, zW - 0.05, WOOD); box(AW, 0.03, 0.11, 0, 1.42, zW - 0.05, GOLD, 0.15);
    // o quadro: a torre numa noite estrelada, sobre o vale
    const art = cv(640, 420, (g, w, h) => {
      const sky = g.createLinearGradient(0, 0, 0, h * 0.7); sky.addColorStop(0, "#0b1030"); sky.addColorStop(0.55, "#2a2a5e"); sky.addColorStop(1, "#7a4a6a"); g.fillStyle = sky; g.fillRect(0, 0, w, h);
      for (let i = 0; i < 220; i++) { g.fillStyle = `rgba(255,250,230,${0.3 + Math.random() * 0.7})`; g.fillRect(Math.random() * w, Math.random() * h * 0.6, 1.5, 1.5); }
      for (let k = 0; k < 3; k++) { g.strokeStyle = `rgba(140,220,200,${0.12 - k * 0.03})`; g.lineWidth = 26 - k * 7; g.beginPath(); g.moveTo(0, 110 + k * 14); g.bezierCurveTo(200, 40, 420, 170, w, 70 + k * 10); g.stroke(); }
      const mg = g.createRadialGradient(500, 90, 4, 500, 90, 80); mg.addColorStop(0, "rgba(255,244,214,1)"); mg.addColorStop(0.25, "rgba(255,240,200,0.9)"); mg.addColorStop(0.3, "rgba(255,230,190,0.3)"); mg.addColorStop(1, "rgba(255,230,190,0)"); g.fillStyle = mg; g.fillRect(380, 0, 240, 200);
      const hills = (y0, amp, col, f) => { g.fillStyle = col; g.beginPath(); g.moveTo(0, h); for (let x = 0; x <= w; x += 8) g.lineTo(x, y0 - Math.sin(x * f) * amp - Math.sin(x * f * 2.7 + 1) * amp * 0.4); g.lineTo(w, h); g.fill(); };
      hills(270, 40, "#23234a", 0.012); hills(305, 26, "#1a1a36", 0.02);
      g.fillStyle = "#3a4a7a"; g.fillRect(0, 330, w, 90); for (let i = 0; i < 40; i++) { g.fillStyle = `rgba(255,236,190,${Math.random() * 0.35})`; g.fillRect(470 + (Math.random() - 0.5) * 70, 336 + Math.random() * 70, 30 + Math.random() * 30, 2); }
      hills(345, 10, "#10122a", 0.03);
      g.fillStyle = "#14122a"; g.fillRect(270, 120, 54, 215); g.beginPath(); g.moveTo(262, 122); g.lineTo(297, 70); g.lineTo(332, 122); g.fill(); g.fillRect(258, 160, 78, 8); g.fillRect(258, 230, 78, 8);
      g.fillStyle = "#ffcf7a"; for (let r = 0; r < 7; r++) for (let c = 0; c < 3; c++) if (Math.random() < 0.7) g.fillRect(278 + c * 15, 132 + r * 28, 6, 10);
      const tg = g.createRadialGradient(297, 74, 2, 297, 74, 40); tg.addColorStop(0, "rgba(255,220,150,0.9)"); tg.addColorStop(1, "rgba(255,220,150,0)"); g.fillStyle = tg; g.fillRect(250, 30, 94, 90);
      for (let i = 0; i < 5000; i++) { const x = Math.random() * w, y = Math.random() * h, d = g.getImageData ? 0 : 0; g.fillStyle = `rgba(${Math.random() < 0.5 ? "255,255,255" : "0,0,0"},0.05)`; g.fillRect(x, y, 5 + Math.random() * 5, 1.5); }
    });
    panel(art, 2.36, 1.55, 0, 4.05, zW - 0.1, { emit: 0.35 });
    const fw = 2.36 + 0.24, fh = 1.55 + 0.24; for (const [w, h, x, y] of [[fw, 0.12, 0, 4.05 + fh / 2 - 0.06], [fw, 0.12, 0, 4.05 - fh / 2 + 0.06], [0.12, fh, -fw / 2 + 0.06, 4.05], [0.12, fh, fw / 2 - 0.06, 4.05]]) box(w, h, 0.1, x, y, zW - 0.1, GOLD, 0.2);
    box(1.0, 0.16, 0.03, 0, 4.05 - fh / 2 - 0.14, zW - 0.08, "#2a1a10"); // a plaquinha
    // os estandartes, com o selo
    const ban = cv(160, 512, (g, w, h) => { g.clearRect(0, 0, w, h); g.fillStyle = "#7a1c1c"; g.beginPath(); g.moveTo(0, 0); g.lineTo(w, 0); g.lineTo(w, h); g.lineTo(w / 2, h - 60); g.lineTo(0, h); g.closePath(); g.fill();
      g.strokeStyle = "#c8964a"; g.lineWidth = 6; g.beginPath(); g.moveTo(10, 10); g.lineTo(w - 10, 10); g.lineTo(w - 10, h - 18); g.lineTo(w / 2, h - 74); g.lineTo(10, h - 18); g.closePath(); g.stroke();
      g.fillStyle = "#d9a85a"; g.font = "700 64px 'Shippori Mincho', serif"; g.textAlign = "center"; ["ラ", "テ", "ケ"].forEach((ch, i) => g.fillText(ch, w / 2, 130 + i * 92));
      g.beginPath(); g.arc(w / 2, 52, 18, 0, 7); g.stroke(); });
    for (const x of [-2.4, 2.4]) { panel(ban, 0.7, 2.24, x, 4.3, zW - 0.12, { cut: true, wave: true, seg: 8, emit: 0.12, emitC: "#ff9a6a" }); box(0.9, 0.05, 0.05, x, 5.44, zW - 0.12, GOLD, 0.2); }
    // a rosácea de vitral, acesa por dentro
    const rose = cv(512, 512, (g, w, h) => { const cx = w / 2, cy = h / 2, R = 250, cols = ["#c0392b", "#2e5fa8", "#d9a82b", "#2a8a6a", "#8a3aa8", "#d96a2b"]; g.fillStyle = "#120c08"; g.fillRect(0, 0, w, h);
      for (let i = 0; i < 12; i++) { const a0 = i / 12 * Math.PI * 2, a1 = a0 + Math.PI * 2 / 12; g.fillStyle = cols[i % 6]; g.beginPath(); g.moveTo(cx, cy); g.arc(cx, cy, R - 12, a0 + 0.03, a1 - 0.03); g.closePath(); g.fill(); g.fillStyle = cols[(i + 3) % 6]; g.beginPath(); g.arc(cx + Math.cos(a0 + 0.26) * 175, cy + Math.sin(a0 + 0.26) * 175, 34, 0, 7); g.fill(); }
      g.strokeStyle = "#120c08"; g.lineWidth = 9; for (let r = 60; r < R; r += 64) { g.beginPath(); g.arc(cx, cy, r, 0, 7); g.stroke(); }
      g.fillStyle = "#f3d48a"; g.beginPath(); g.arc(cx, cy, 50, 0, 7); g.fill(); g.fillStyle = "#7a1c1c"; g.font = "700 46px 'Shippori Mincho', serif"; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText("ラ", cx, cy + 2);
      const v = g.createRadialGradient(cx, cy, R * 0.7, cx, cy, R); v.addColorStop(0, "rgba(0,0,0,0)"); v.addColorStop(1, "rgba(0,0,0,0.5)"); g.fillStyle = v; g.fillRect(0, 0, w, h); g.globalCompositeOperation = "destination-in"; g.fillStyle = "#000"; g.beginPath(); g.arc(cx, cy, R, 0, 7); g.fill(); });
    const rw = new T.Mesh(new T.CircleGeometry(0.62, 48), new T.MeshBasicMaterial({ map: rose, transparent: true, alphaTest: 0.5 })); propize(rw, { emit: 1.1, emitC: "#ffffff" }); rw.position.copy(AL(LA, 0, 5.78, zW - 0.04)); rw.rotation.y = ryW; scene.add(rw);
    const ring = new T.Mesh(new T.TorusGeometry(0.64, 0.06, 8, 48), new T.MeshBasicMaterial({ color: GOLD })); propize(ring, { emit: 0.25, emitC: GOLD }); ring.position.copy(rw.position); ring.rotation.y = ryW; scene.add(ring);
    const rg = new T.Sprite(new T.SpriteMaterial({ map: glowTex, color: 0xffc8a0, transparent: true, opacity: 0.35, depthWrite: false, blending: T.AdditiveBlending })); rg.scale.set(3.2, 3.2, 1); rg.position.copy(AL(LA, 0, 5.78, zW - 0.3)); scene.add(rg);
    lightAt(AL(LA, 0, 5.4, zW - 1.2), "#ffb890", 1.0, 0.1); }
  // a mesa de trabalho (num grupo próprio: o que fica em cima é posto em coordenadas da mesa)
  const DESKY = 0.82, DESKA = 62 * Math.PI / 180;
  const deskG = new T.Group(); deskG.position.copy(polarY(DESKA, 11.4, 0)); deskG.rotation.y = Math.PI - DESKA; scene.add(deskG); deskG.updateMatrixWorld(true);
  const onDesk = (dx, dz) => V3(dx, DESKY, dz);
  const inDesk = (o) => Object.assign({ parent: deskG }, o);
  prop("mesa", (m) => {
    clickable(place(m.clone(true), inDesk({ at: V3(0, 0, 0), h: DESKY, ry: Math.PI / 2, stretch: [1.5, 1, 1.45] })), "mesa", null, ["A mesa de trabalho", "Chegar perto"]);
    const p = polarY(118 * Math.PI / 180, 12.2, 0); place(m.clone(true), { at: p, h: 0.68, ry: lookIn(p) + Math.PI / 2, stretch: [0.62, 1, 0.9] });
  }, 1);
  prop("maquina", (m) => clickable(place(m, inDesk({ at: onDesk(0.18, 0.0), size: 0.46, ry: Math.PI / 2 })), "recado", null, ["Máquina de escrever", "Deixar um recado"]), 2);
  prop("lampiao", (m) => place(m, inDesk({ at: onDesk(-0.1, 0.8), h: 0.42, emit: 0.5 })), 2);
  prop("mapa", (m) => clickable(place(m, inDesk({ at: onDesk(-0.14, 0.24), size: 0.4, rot: [0, 0, Math.PI / 2], ry: 0 })), "indice", null, ["Mapa", "Ver todos os lugares"]), 2);
  prop("lupa", (m) => clickable(place(m, inDesk({ at: onDesk(0.3, -0.56), size: 0.34, ry: Math.PI / 2 + 0.35 })), "busca", null, ["Lupa", "Procurar uma atividade"]), 2);
  prop("telefone", (m) => clickable(place(m, inDesk({ at: onDesk(-0.1, -0.74), size: 0.36, ry: Math.PI / 2 + 0.35 })), "contato", null, ["Telefone", "Falar comigo"]), 2);
  prop("tinteiro", (m) => place(m, inDesk({ at: onDesk(-0.08, 0.5), size: 0.19, ry: 2.2 })), 3);
  prop("pergaminho", (m) => place(m, inDesk({ at: onDesk(0.3, 0.5), size: 0.4, ry: Math.PI / 2 })), 3);
  prop("livros-gastos", (m) => place(m, inDesk({ at: onDesk(0.14, -0.9), size: 0.32, ry: Math.PI / 2 })), 3);
  prop("papeis", (m) => place(m, inDesk({ at: onDesk(0.3, -0.56), h: 0.03, stretch: [2.2, 1, 2.2], ry: Math.PI / 2 + 0.06 })), 3);
  prop("bussola", (m) => clickable(place(m, inDesk({ at: onDesk(-0.1, -0.36), size: 0.2, ry: 0.4 })), "mundos", null, ["Bússola", "Ver os mundos"]), 3);
  prop("caneca", (m) => place(m, inDesk({ at: onDesk(0.3, 0.86), h: 0.11, ry: 2.4 })), 3);
  prop("cadeira", (m) => place(m, inDesk({ at: V3(0.98, 0, -0.95), h: 1.25, ry: faceTo(0.98, -0.95, 0, -0.2) })), 3);
  prop("globo", (m) => {
    const g = place(m, inDesk({ at: V3(-0.55, 0, 1.85), h: 1.08, ry: -0.6, drop: (o) => !/Line001/.test(o.name) && !/Line001/.test(o.parent && o.parent.name || "") }));
    const s0 = g.userData.size.y / 85.81, C = new T.Vector3(0, 56.54, -0.59);
    g.updateMatrixWorld(true); m.localToWorld(C);
    const gm = new T.ShaderMaterial({ uniforms: Object.assign({ uC: { value: C }, uR: { value: 21.57 * s0 }, uHot: { value: 0 } }, U), vertexShader: PROP_VS, fragmentShader: GLOBE_FS, side: T.DoubleSide });
    g.traverse((o) => { if (o.isMesh && o.visible) o.material = gm; });
    clickable(g, "mundos", null, ["Globo", "Ver os mundos"]);
  }, 2);
  lightAt(deskG.localToWorld(V3(-0.3, 1.25, 0.72)), "#FFC070", 1.0, 0.05);
  { const p = polarY(118 * Math.PI / 180, 12.2, 0.68); prop("gramofone", (m) => clickable(place(m, { at: p, h: 0.85, ry: lookIn(p) }), "musica", null, ["Gramofone", "Ligar ou desligar a música"]), 3); }
  { const p = polarY(132 * Math.PI / 180, 14.2, 0);
    prop("comoda", (c) => {
      const g = place(c, { at: p, h: 0.86, ry: lookIn(p) });
      prop("livros-vela", (k) => place(k, { at: on(g, p.clone().add(V3(0.1, 0, -0.1))), size: 0.34, ry: 1.2, emit: 0.1 }), 4);
      prop("livro-couro", (k) => clickable(place(k, { at: on(g, p.clone().add(V3(-0.15, 0, 0.12))), size: 0.3, ry: 1.9 }), "sobre", null, ["Livro de couro", "Sobre esta biblioteca"]), 4);
      lightAt(p.clone().setY(1.35), "#FFB060", 0.45, 0.15);
    }, 3); }
  { const p = polarY(45 * Math.PI / 180, 13.9, 0); prop("piano", (m) => { const g = place(m, { at: p, h: 1.32, ry: lookIn(p) - Math.PI / 2 }); prop("disco", (d) => place(d, { at: on(g, p), size: 0.55, ry: lookIn(p) }), 5); }, 3); }
  { const p = polarY(100 * Math.PI / 180, 9.0, 0);
    prop("atril", (m) => { place(m, { at: p, h: 1.25, ry: lookIn(p) }); prop("livro-magico", (b) => clickable(place(b, { at: p.clone().setY(1.26), size: 0.62, ry: lookIn(p), emit: 0.15, emitC: "#FFD9A0" }), "sobre", null, ["O livro aberto", "Sobre esta biblioteca"]), 2); }, 2); }
  // a entrada: a porta de madeira, de folha dupla, num nicho raso
  const PA = alc("porta");
  const doorL = new T.Group(), doorR = new T.Group();
  { const plank = new T.MeshBasicMaterial({ color: "#4A2E1C" }), iron = new T.MeshBasicMaterial({ color: "#26201C" }), ring = new T.MeshBasicMaterial({ color: "#8A6A3A" });
    [[doorL, -1], [doorR, 1]].forEach(([g, sg]) => {
      const leaf = new T.Group();
      for (let k = 0; k < 5; k++) { const b = new T.Mesh(new T.BoxGeometry(0.29, 4.3, 0.12), plank); b.position.set(sg * (0.16 + k * 0.3), 2.15, 0); b.scale.y = 0.97 + (k % 2) * 0.02; leaf.add(b); }
      for (const y of [0.7, 2.15, 3.6]) { const b = new T.Mesh(new T.BoxGeometry(1.48, 0.12, 0.16), iron); b.position.set(sg * 0.76, y, 0.02); leaf.add(b); for (let k = 0; k < 6; k++) { const s = new T.Mesh(new T.SphereGeometry(0.03, 6, 4), ring); s.position.set(sg * (0.12 + k * 0.26), y, 0.1); leaf.add(s); } }
      const rg = new T.Mesh(new T.TorusGeometry(0.12, 0.02, 6, 18), ring); rg.position.set(sg * 0.32, 1.9, 0.12); leaf.add(rg);
      propize(leaf); g.add(leaf); g.position.copy(AL(PA, -sg * 1.52, 0, PA.d - 0.2)); g.rotation.y = lookIn(g.position); scene.add(g);
    }); }

  /* ---------------- portais: um arco de pedra com runas e um redemoinho que puxa faíscas ---------------- */
  const WORLDS = [
    { t: "Quem sou", s: "Tokyo Ghoul", c: "#C0303A" }, { t: "Linguagens", s: "Death Note", c: "#D8D2C2" },
    { t: "Matemática", s: "Evangelion", c: "#8A4FC0" }, { t: "Ciências da Natureza", s: "Ponyo e Totoro", c: "#45B079" },
    { t: "Ciências Humanas", s: "Túmulo dos Vaga-lumes", c: "#E8A848" }, { t: "Área técnica", s: "Lain", c: "#5CC8D8" },
    { t: "1º e 2º ano", s: "O trem", c: "#7A9AD8" }, { t: "Certificados", s: "Frieren", c: "#A8D0F0" },
    { t: "Objetivos e futuro", s: "Attack on Titan", c: "#D8955A" }, { t: "Agradecimentos", s: "Frieren", c: "#F0DEA8" },
  ];
  const PW = 2.9, PJ = 2.7; // largura da abertura, altura até o começo do arco
  const VORTEX_FS = `${COMMON} uniform vec3 uRC; uniform float uHot, uSeed; varying vec3 vW; varying vec3 vN; varying vec2 vUv;
    void main(){
      vec2 p = vec2((vUv.x - 0.5) * ${PW.toFixed(2)}, vUv.y * ${(PJ + PW / 2).toFixed(2)} - ${((PJ + PW / 2) * 0.48).toFixed(2)});
      float r = length(p), a = atan(p.y, p.x), t = uTime * (0.55 + uHot * 0.5) + uSeed;
      float sw = a * 3.0 + 3.2 / (r + 0.25) - t * 2.4;
      float n = vnoise(vec3(cos(sw) * 1.6, sin(sw) * 1.6, r * 2.5 - t * 0.7)) * 0.65 + vnoise(vec3(p * 4.0, t * 0.6)) * 0.35;
      float arms = 0.5 + 0.5 * sin(sw * 2.0 + n * 3.0);
      float core = exp(-r * 4.2) * (1.0 + uHot);
      float a2 = smoothstep(0.35, 0.95, arms * n * 1.4);
      vec3 col = mix(vec3(0.015, 0.012, 0.02), uRC * 1.5, a2) + uRC * 0.25 * n + vec3(1.0, 0.95, 0.85) * core * 0.75;
      col += uRC * 0.6 * smoothstep(0.55, 0.0, abs(fract(r * 3.0 - t * 0.9) - 0.5)) * (0.3 + 0.7 * n) * 0.35;
      col *= 0.65 + 0.35 * smoothstep(1.8, 0.4, r);
      gl_FragColor = vec4(col * (1.0 + uHot * 0.5), 1.0);
    }`;
  const RUNE_FS = `${COMMON} uniform vec3 uRC; uniform float uHot, uSeed; uniform sampler2D map; varying vec3 vW; varying vec3 vN; varying vec2 vUv;
    void main(){ vec4 m = texture2D(map, vec2(vUv.x * 6.0 + uSeed, vUv.y)); float pulse = 0.55 + 0.45 * sin(uTime * 1.6 - vUv.x * 18.0 + uSeed);
      vec3 stone = vec3(0.36, 0.31, 0.28) * band(lights(vW, normalize(vN)));
      vec3 col = mix(stone, uRC * (1.2 + uHot * 1.4) + 0.2, m.r * (0.35 + 0.65 * pulse) * (0.6 + uHot * 0.6));
      gl_FragColor = vec4(fogIt(col, vW), 1.0); }`;
  const runeTex = (() => { const c = document.createElement("canvas"); c.width = 512; c.height = 64; const g = c.getContext("2d"); g.fillStyle = "#000"; g.fillRect(0, 0, 512, 64); g.strokeStyle = "#fff"; g.lineWidth = 3; g.lineCap = "round";
    let s = 3; const r = () => (s = (s * 16807) % 2147483647) / 2147483647;
    for (let k = 0; k < 16; k++) { const x = 8 + k * 32; g.beginPath(); for (let j = 0; j < 3 + Math.floor(r() * 3); j++) { const x0 = x + r() * 20, y0 = 12 + r() * 40, x1 = x + r() * 20, y1 = 12 + r() * 40; g.moveTo(x0, y0); g.lineTo(x1, y1); } g.stroke(); if (r() < 0.5) { g.beginPath(); g.arc(x + 10, 32, 5 + r() * 5, 0, Math.PI * 2); g.stroke(); } }
    const t = new T.CanvasTexture(c); t.wrapS = T.RepeatWrapping; return t; })();
  const archShape = (w, j) => { const s = new T.Shape(); s.moveTo(-w / 2, 0); s.lineTo(w / 2, 0); s.lineTo(w / 2, j); s.absarc(0, j, w / 2, 0, Math.PI, false); s.lineTo(-w / 2, 0); return s; };
  // o que cada fenda deixa escapar para dentro da torre: cada mundo solta o seu tipo de partícula
  const SPILL = {
    0: { m: 0, a: "#ff2a2a", b: "#ff9a5a", add: 1, n: 90, s: 0.09, v: 0.5 },   // brasas vermelhas
    1: { m: 2, a: "#0c0c10", b: "#2a2a30", add: 0, n: 55, s: 0.2, v: -0.7 },   // penas pretas caindo
    2: { m: 3, a: "#ff8a2a", b: "#8a4fc0", add: 1, n: 50, s: 0.17, v: 0.15 },  // hexágonos de campo AT
    3: { m: 5, a: "#9ef0e0", b: "#45b079", add: 1, n: 80, s: 0.14, v: 0.6 },   // bolhas subindo
    4: { m: 0, a: "#c8ff6a", b: "#ffe08a", add: 1, n: 90, s: 0.08, v: 0.15 },  // vaga-lumes
    5: { m: 4, a: "#5ce8f8", b: "#ffffff", add: 1, n: 110, s: 0.07, v: 0.05 }, // pixels
    6: { m: 6, a: "#0a0808", b: "#ffffff", add: 0, n: 40, s: 0.17, v: 0.1 },   // fuligem
    7: { m: 1, a: "#cfe6ff", b: "#ffffff", add: 1, n: 80, s: 0.12, v: -0.35 },
    8: { m: 7, a: "#e8e2da", b: "#d8955a", add: 0, n: 50, s: 0.5, v: 0.7 },    // vapor
    9: { m: 1, a: "#9ec8ff", b: "#fff4d0", add: 1, n: 90, s: 0.12, v: -0.3 },  // pétalas
  };
  const SPILL_VS = `uniform float uTime, uWave, uSize, uMode, uV, uPx; attribute vec4 aS; varying float vA, vR, vM; varying vec3 vC;
    void main(){ float life = fract(uTime * (0.05 + aS.w * 0.05) + aS.x); vM = uMode;
      vec3 p = vec3((aS.y - 0.5) * 2.5, 0.3 + aS.z * 3.3, 0.15 + life * 3.8);
      float sw = sin(life * 7.0 + aS.x * 30.0), sw2 = cos(life * 5.0 + aS.y * 20.0);
      p.y += uV * life * 1.6; p.x += sw * (uMode == 1.0 || uMode == 2.0 ? 0.45 : 0.18); p.y += sw2 * 0.12;
      if (uMode == 4.0) { p = floor(p * 8.0) / 8.0; }
      if (uMode == 0.0 && uV < 0.3) { p += vec3(sin(uTime * 0.7 + aS.x * 40.0), sin(uTime * 0.9 + aS.y * 30.0) * 0.5, cos(uTime * 0.6 + aS.z * 20.0)) * 0.35; }
      vec4 w = modelMatrix * vec4(p, 1.0);
      vA = smoothstep(0.0, 0.12, life) * smoothstep(1.0, 0.55, life) * (w.y > uWave ? 1.0 : 0.0);
      if (uMode == 0.0 && uV < 0.3) vA *= smoothstep(0.35, 1.0, sin(uTime * (1.5 + aS.w * 2.0) + aS.x * 50.0) * 0.5 + 0.5);
      if (uMode == 4.0) vA *= step(0.35, fract(sin(floor(uTime * 6.0 + aS.x * 20.0) * 12.9898) * 43758.5));
      vR = aS.x * 6.28 + uTime * (aS.w - 0.5) * 2.0 + life * 3.0; vC = vec3(aS.w);
      vec4 mv = viewMatrix * w; float grow = uMode == 3.0 ? (0.5 + life * 1.2) : uMode == 7.0 ? (0.4 + life * 1.6) : 1.0;
      gl_PointSize = uPx * uSize * grow * (0.7 + aS.z * 0.6) / max(0.3, -mv.z); gl_Position = projectionMatrix * mv; }`;
  const SPILL_FS = `uniform vec3 uA, uB; uniform float uAdd; varying float vA, vR, vM; varying vec3 vC;
    void main(){ vec2 q = gl_PointCoord - 0.5; float c = cos(vR), s = sin(vR); vec2 r = mat2(c, -s, s, c) * q; float d = length(q), a = 0.0; vec3 col = mix(uA, uB, vC.x);
      if (vM == 0.0) { a = pow(smoothstep(0.5, 0.0, d), 2.0); col += vec3(1.0) * smoothstep(0.12, 0.0, d) * 0.6; }
      else if (vM == 1.0) { a = smoothstep(0.22, 0.12, length(r * vec2(2.4, 1.0))); }
      else if (vM == 2.0) { float e = length(r * vec2(5.5, 1.05)); a = smoothstep(0.5, 0.38, e) * (0.75 + 0.25 * step(0.02, abs(r.x))); }
      else if (vM == 3.0) { vec2 h = abs(r); float hx = max(h.x * 0.866 + h.y * 0.5, h.y); a = smoothstep(0.06, 0.0, abs(hx - 0.38)); }
      else if (vM == 4.0) { a = step(max(abs(q.x), abs(q.y)), 0.34); }
      else if (vM == 5.0) { a = smoothstep(0.05, 0.0, abs(d - 0.42)) * 0.9 + smoothstep(0.12, 0.0, length(q - vec2(-0.16, 0.16))) * 0.8 + smoothstep(0.42, 0.2, d) * 0.08; }
      else if (vM == 6.0) { float fz = 0.36 + 0.07 * sin(atan(q.y, q.x) * 13.0 + vR * 3.0); a = smoothstep(fz, fz - 0.07, d); vec2 e1 = q - vec2(-0.1, 0.04), e2 = q - vec2(0.1, 0.04); float eye = max(smoothstep(0.08, 0.06, length(e1)), smoothstep(0.08, 0.06, length(e2))); float pup = max(smoothstep(0.035, 0.02, length(e1)), smoothstep(0.035, 0.02, length(e2))); col = mix(col, vec3(1.0), eye); col = mix(col, vec3(0.0), pup); }
      else { a = smoothstep(0.5, 0.05, d) * 0.45; }
      a *= vA; if (a < 0.01) discard;
      gl_FragColor = uAdd > 0.5 ? vec4(col * a * 1.6, 1.0) : vec4(col, a); }`;
  const portals = [];
  ALC.filter((al) => al.world != null).forEach((al) => {
    const w = Object.assign({}, WORLDS[al.world]); w.k = al.world; w.al = al;
    const g = new T.Group(); g.position.copy(AL(al, 0, 0, al.d - 0.08)); g.rotation.y = lookIn(g.position); scene.add(g);
    // o arco: pedras em volta da abertura, a faixa de runas e a chave dourada no topo
    const S = Builder(); const sc = "#6E625A";
    for (const sg of [-1, 1]) { S.add(new T.BoxGeometry(0.5, PJ, 0.5), M(sg * (PW / 2 + 0.25), PJ / 2, 0.1), sc, 0); S.add(new T.BoxGeometry(0.72, 0.28, 0.62), M(sg * (PW / 2 + 0.25), 0.14, 0.12), "#4E443E", 0); }
    const NV = 13; for (let k = 0; k < NV; k++) { const a0 = k / NV * Math.PI, a1 = (k + 1) / NV * Math.PI, am = (a0 + a1) / 2, rr = PW / 2 + 0.25; const L = 2 * rr * Math.sin((a1 - a0) / 2) + 0.03; S.add(new T.BoxGeometry(L, 0.5, 0.5), M(rr * Math.cos(am), PJ + rr * Math.sin(am), 0.1, 0, 1, 1, 1, 0, am + Math.PI / 2), k === (NV - 1) / 2 ? GOLD : sc, 0); }
    const arch = new T.Mesh(S.build(), structMat); g.add(arch);
    const rm = new T.ShaderMaterial({ uniforms: Object.assign({ uRC: { value: new T.Color(w.c) }, uHot: { value: 0 }, uSeed: { value: al.world * 1.7 }, map: { value: runeTex } }, U), vertexShader: PROP_VS, fragmentShader: RUNE_FS });
    const outer = archShape(PW + 0.98, PJ); outer.holes.push(new T.Path(archShape(PW + 0.02, PJ).getPoints(32)));
    const band = new T.Mesh(new T.ShapeGeometry(outer, 32), rm); band.position.z = 0.36; g.add(band);
    { const uv = band.geometry.attributes.uv, pos = band.geometry.attributes.position, R = PW / 2 + 0.25;
      for (let i = 0; i < uv.count; i++) { const x = pos.getX(i), y = pos.getY(i);
        const u = y < PJ ? (x < 0 ? y : 2 * PJ + Math.PI * R - y) : PJ + (Math.PI - Math.atan2(y - PJ, x)) * R;
        const d = y < PJ ? Math.abs(x) : Math.hypot(x, y - PJ); uv.setXY(i, u / 3.0, Math.max(0, Math.min(1, (d - PW / 2 - 0.01) / 0.48))); }
      uv.needsUpdate = true; }
    // o redemoinho
    const vm = new T.ShaderMaterial({ uniforms: Object.assign({ uRC: { value: new T.Color(w.c) }, uHot: { value: 0 }, uSeed: { value: al.world * 2.3 } }, U), vertexShader: PROP_VS, fragmentShader: VORTEX_FS });
    const vg = new T.ShapeGeometry(archShape(PW, PJ), 32); { const p = vg.attributes.position, uv = vg.attributes.uv; for (let i = 0; i < p.count; i++) uv.setXY(i, p.getX(i) / PW + 0.5, p.getY(i) / (PJ + PW / 2)); uv.needsUpdate = true; }
    const vortex = new T.Mesh(vg, vm); vortex.position.z = 0.02; g.add(vortex);
    const halo = new T.Sprite(new T.SpriteMaterial({ map: glowTex, color: new T.Color(w.c), transparent: true, opacity: 0.5, depthWrite: false, blending: T.AdditiveBlending })); halo.scale.set(PW * 2.4, (PJ + PW / 2) * 1.9, 1); halo.position.set(0, (PJ + PW / 2) * 0.5, 0.4); g.add(halo);
    // faíscas sendo sugadas para o centro
    const NSP = 70, sp = new Float32Array(NSP * 3), ss = new Float32Array(NSP).map(() => Math.random());
    const spg = new T.BufferGeometry(); spg.setAttribute("position", new T.BufferAttribute(sp, 3));
    const sparks = new T.Points(spg, new T.PointsMaterial({ map: glowTex, color: new T.Color(w.c).lerp(new T.Color("#ffffff"), 0.4), size: 0.09, transparent: true, opacity: 0.9, depthWrite: false, blending: T.AdditiveBlending })); sparks.frustumCulled = false; g.add(sparks);
    { const cfg = SPILL[al.world] || SPILL[4], n = small ? Math.round(cfg.n * 0.6) : cfg.n, sg = new T.BufferGeometry(), seeds = new Float32Array(n * 4).map(() => Math.random());
      sg.setAttribute("position", new T.BufferAttribute(new Float32Array(n * 3), 3)); sg.setAttribute("aS", new T.BufferAttribute(seeds, 4));
      const sm2 = new T.ShaderMaterial({ uniforms: Object.assign({ uSize: { value: cfg.s }, uMode: { value: cfg.m }, uV: { value: cfg.v }, uPx: { value: innerHeight * Math.min(devicePixelRatio || 1, 2) * 1.1 }, uA: { value: new T.Color(cfg.a) }, uB: { value: new T.Color(cfg.b) }, uAdd: { value: cfg.add } }, U), vertexShader: SPILL_VS, fragmentShader: SPILL_FS, transparent: true, depthWrite: false, blending: cfg.add ? T.AdditiveBlending : T.NormalBlending });
      const spill = new T.Points(sg, sm2); spill.frustumCulled = false; g.add(spill);
      const fl = new T.Mesh(new T.PlaneGeometry(PW * 2.2, 3.6), new T.MeshBasicMaterial({ map: glowTex, color: new T.Color(w.c), transparent: true, opacity: 0.5, depthWrite: false, blending: T.AdditiveBlending })); fl.rotation.x = -Math.PI / 2; fl.position.set(0, 0.02, 1.4); g.add(fl); w.floorGlow = fl; }
    lightAt(AL(al, 0, 1.8, al.d - 1.0), w.c, 3.2, 0.12); lightAt(AL(al, 0, 0.6, al.d - 3.0), w.c, 1.4, 0.2);
    sign(AL(al, 0, AH + 0.92, -1.02), lookIn(AL(al, 0, 0, -1.02)), w.t, w.s, w.c, 2.6, 0.6);
    Object.assign(w, { g, vm, rm, halo, sparks, ss, hot: 0, pos: AL(al, 0, 1.9, al.d - 0.1), nx: -al.u.x, nz: -al.u.z, room: { c: AL(al, 0, 0, al.d / 2) } });
    portals.push(w); clickable(vortex, "mundo", w); clickable(arch, "mundo", w);
  });
  const rifts = portals; // os mundos usam este nome


  /* ---------------- do lado de fora: a fachada de pedra, o caminho e as lanternas da porta ---------------- */
  const stoneTex = (() => { const c = document.createElement("canvas"); c.width = 512; c.height = 512; const g = c.getContext("2d"); g.fillStyle = "#2a2522"; g.fillRect(0, 0, 512, 512);
    let s = 11; const r = () => (s = (s * 16807) % 2147483647) / 2147483647;
    for (let y = 0, row = 0; y < 512; y += 42, row++) for (let x = -((row % 2) * 40); x < 512; x += 80) { const v = 70 + r() * 40; g.fillStyle = `rgb(${v},${v * 0.9},${v * 0.82})`; g.fillRect(x + 2, y + 2, 76, 38); for (let k = 0; k < 18; k++) { g.fillStyle = `rgba(0,0,0,${(r() * 0.12).toFixed(2)})`; g.fillRect(x + r() * 70, y + r() * 34, 4 + r() * 10, 2 + r() * 5); } }
    const t = new T.CanvasTexture(c); t.wrapS = t.wrapT = T.RepeatWrapping; return t; })();
  const OUT = PA.d + 0.02, DOOR_W = 1.56, DOOR_H = 4.4;
  { const fac = new T.Group(); const mk = (w, h, x, y) => { const tex = stoneTex.clone(); tex.needsUpdate = true; tex.repeat.set(w / 3.2, h / 3.2); const m = new T.Mesh(new T.PlaneGeometry(w, h), new T.MeshBasicMaterial({ map: tex, color: "#c9b8a6" })); m.position.set(x, y, 0); fac.add(m); };
    mk(13, 14, -DOOR_W - 6.5, 7); mk(13, 14, DOOR_W + 6.5, 7); mk(DOOR_W * 2, 14 - DOOR_H, 0, DOOR_H + (14 - DOOR_H) / 2);
    const archS = Builder(); const NV = 11; for (let k = 0; k < NV; k++) { const a0 = k / NV * Math.PI, a1 = (k + 1) / NV * Math.PI, am = (a0 + a1) / 2, rr = DOOR_W + 0.3; archS.add(new T.BoxGeometry(2 * rr * Math.sin((a1 - a0) / 2) + 0.03, 0.6, 0.5), M(rr * Math.cos(am), DOOR_H - 0.6 + rr * 0.55 * Math.sin(am), 0.25, 0, 1, 1, 1, 0, am + Math.PI / 2), k === 5 ? GOLD : "#6E625A", 0); }
    for (const sg of [-1, 1]) archS.add(new T.BoxGeometry(0.6, DOOR_H - 0.6, 0.5), M(sg * (DOOR_W + 0.3), (DOOR_H - 0.6) / 2, 0.25), "#6E625A", 0);
    fac.add(new T.Mesh(archS.build(), structMat));
    propize(fac); fac.position.copy(AL(PA, 0, 0, OUT)); fac.rotation.y = lookIn(fac.position) + Math.PI; scene.add(fac);
    const path = new T.Mesh(new T.PlaneGeometry(3.2, 14), new T.MeshBasicMaterial({ map: (() => { const t = stoneTex.clone(); t.needsUpdate = true; t.repeat.set(1.2, 5); return t; })(), color: "#8a7c70" }));
    path.rotation.x = -Math.PI / 2; propize(path); const pg = new T.Group(); pg.add(path); pg.position.copy(AL(PA, 0, 0.01, OUT + 7)); pg.rotation.y = lookIn(pg.position); scene.add(pg);
    const grass = new T.Mesh(new T.PlaneGeometry(40, 30), new T.MeshBasicMaterial({ color: "#1d2418" })); grass.rotation.x = -Math.PI / 2; propize(grass); const gg = new T.Group(); gg.add(grass); gg.position.copy(AL(PA, 0, -0.01, OUT + 15)); gg.rotation.y = lookIn(gg.position); scene.add(gg);
    for (const sg of [-1, 1]) { const p = AL(PA, sg * (DOOR_W + 1.25), 3.1, OUT + 0.35); const ln = new T.Mesh(new T.BoxGeometry(0.26, 0.42, 0.26), new T.MeshBasicMaterial({ color: "#FFC877" })); propize(ln, { emit: 1.2, emitC: "#FFB050" }); ln.position.copy(p); scene.add(ln);
      const hs = new T.Sprite(new T.SpriteMaterial({ map: glowTex, color: 0xffb35c, transparent: true, opacity: 0.8, depthWrite: false, blending: T.AdditiveBlending })); hs.scale.set(1.6, 1.6, 1); hs.position.copy(p); scene.add(hs);
      lightAt(AL(PA, sg * (DOOR_W + 1.25), 3.0, OUT + 0.8), "#FFB060", 1.3, 0.1); } }
  addLight(AL(PA, 0, 3.2, -2.6).x, 3.2, AL(PA, 0, 3.2, -2.6).z, "#FFB868", 2.2, 0.04); // luz quente logo depois da porta
  const doorOpen = { v: 0, to: 0 };
  const doorBase = [doorL.rotation.y, doorR.rotation.y];

  /* ---------------- a bancada de alquimia: as poções, o caldeirão borbulhando ---------------- */
  const AQ = alc("alquimia"), potions = [], bubbleSrc = [];
  prop("mesa-alquimista", (m) => { const p = AL(AQ, 0.3, 0, AQ.d - 0.95); place(m, { at: p, h: 1.84, ry: lookIn(p) + Math.PI / 2 }); }, 3);
  const POT = [
    { f: "pocoes", t: "Poções azuis", c: "#4FA8FF", size: 0.55 }, { f: "pocao-magica", t: "Poção mágica", c: "#FF6AD8", h: 0.36 },
    { f: "pocao-caveira", t: "Poção da caveira", c: "#7CFF6A", size: 0.42 }, { f: "especiarias", t: "Frasco de especiarias", c: "#FFB04A", h: 0.36 },
    { f: "garrafa-hera", t: "Garrafa de hera", c: "#6AFFB0", h: 0.42 }, { f: "frasco", t: "Frasco escuro", c: "#A06AFF", h: 0.24 }, { f: "tubos", t: "Tubos de ensaio", c: "#FF5A4A", size: 0.36 },
  ];
  prop("mesa-longa", (t) => {
    const p = AL(AQ, -2.3, 0, AQ.d / 2 + 0.05), g = place(t, { at: p, h: 0.8, ry: lookIn(p) });
    POT.forEach((o, i) => {
      const z = 0.75 + i * (AQ.d - 1.4) / (POT.length - 1), q = AL(AQ, -2.3 + (i % 2 ? 0.12 : -0.12), 0, z);
      prop(o.f, (k) => { const y = topOf(g, q.x, q.z); const pg = place(k, { at: V3(q.x, y, q.z), size: o.size, h: o.h, ry: lookIn(q) + i, emit: 0.35, emitC: o.c }); const c = clickable(pg, "pocao", o, [o.t, "beber um gole"]); potions.push(c); bubbleSrc.push({ p: V3(q.x, y + (o.h || o.size || 0.3) * 0.9, q.z), c: new T.Color(o.c) }); }, 3);
    });
    lightAt(AL(AQ, -1.8, 1.6, AQ.d / 2), "#B07AFF", 1.2, 0.08);
  }, 3);
  // o caldeirão: ferro torneado, três pés, um líquido que se mexe e solta vapor
  const CAUL = AL(AQ, 1.75, 0, AQ.d - 2.05);
  { const prof = [[0.0, 0.18], [0.32, 0.2], [0.52, 0.34], [0.6, 0.55], [0.57, 0.78], [0.5, 0.88], [0.55, 0.93], [0.5, 0.95]].map(([r, y]) => new T.Vector2(r, y));
    const pot = new T.Mesh(new T.LatheGeometry(prof, 36), new T.MeshBasicMaterial({ color: "#232020" })); const g = new T.Group(); g.add(pot);
    for (let k = 0; k < 3; k++) { const a = k / 3 * Math.PI * 2, leg = new T.Mesh(new T.CylinderGeometry(0.04, 0.06, 0.26, 6), new T.MeshBasicMaterial({ color: "#1a1818" })); leg.position.set(Math.cos(a) * 0.38, 0.13, Math.sin(a) * 0.38); g.add(leg); }
    propize(g); g.position.copy(CAUL); scene.add(g);
    const liq = new T.Mesh(new T.CircleGeometry(0.48, 40), new T.ShaderMaterial({ uniforms: Object.assign({ uC: { value: new T.Color("#5CFF8A") } }, U), vertexShader: PROP_VS,
      fragmentShader: `${COMMON} uniform vec3 uC; varying vec3 vW; varying vec3 vN; varying vec2 vUv;
        void main(){ vec2 p = vUv - 0.5; float r = length(p), a = atan(p.y, p.x);
          float n = vnoise(vec3(p * 9.0 + vec2(sin(uTime * 0.7), cos(uTime * 0.6)), uTime * 0.8)) * 0.6 + vnoise(vec3(cos(a * 3.0 + uTime) * r * 6.0, sin(a * 3.0 + uTime) * r * 6.0, uTime)) * 0.4;
          float bub = smoothstep(0.82, 0.9, vnoise(vec3(p * 22.0, uTime * 2.2)));
          vec3 col = uC * (0.45 + 0.9 * n) + vec3(0.9, 1.0, 0.9) * bub * 0.8;
          gl_FragColor = vec4(col * (1.0 - smoothstep(0.42, 0.5, r) * 0.6), 1.0); }` }));
    liq.rotation.x = -Math.PI / 2; liq.position.copy(CAUL).add(V3(0, 0.84, 0)); scene.add(liq);
    const cg = new T.Sprite(new T.SpriteMaterial({ map: glowTex, color: 0x5cff8a, transparent: true, opacity: 0.5, depthWrite: false, blending: T.AdditiveBlending })); cg.scale.set(2.2, 1.6, 1); cg.position.copy(CAUL).add(V3(0, 1.1, 0)); scene.add(cg);
    lightAt(CAUL.clone().add(V3(0, 1.3, 0)), "#5CFF8A", 1.6, 0.12);
    clickable(pot, "pocao", { t: "O caldeirão", c: "#5CFF8A" }, ["O caldeirão", "mexer"]); }
  { const al = AQ; sign(AL(al, 0, AH + 0.92, -1.02), lookIn(AL(al, 0, 0, -1.02)), "Alquimia", "As poções", "#7CFF6A", 2.6, 0.6); }
  // bolhas e vapor: sobem do caldeirão e das poções, cada uma na cor dela
  const NBUB = 160, bub = new T.BufferGeometry(), bubP = new Float32Array(NBUB * 3), bubC = new Float32Array(NBUB * 3), bubS = new Float32Array(NBUB).map(() => Math.random());
  bub.setAttribute("position", new T.BufferAttribute(bubP, 3)); bub.setAttribute("color", new T.BufferAttribute(bubC, 3));
  const bubbles = new T.Points(bub, new T.PointsMaterial({ map: glowTex, size: 0.07, vertexColors: true, transparent: true, opacity: 0.85, depthWrite: false, blending: T.AdditiveBlending })); bubbles.frustumCulled = false; scene.add(bubbles);
  // a poção muda a cor da torre por alguns segundos
  const AMB0 = U.uAmb.value.clone(), FOG0 = U.uFog.value.clone(); let brewC = null, brewT = 0;
  function brew(o) { brewC = new T.Color(o.c); brewT = 7; toast("Alquimia", o.t, o.t === "O caldeirão" ? "O caldeirão borbulhou e a torre ficou verde." : "Um gole, e a torre inteira mudou de cor."); }

  /* ---------------- livros que voam pelo vão, batendo as capas ---------------- */
  const flyers = [];
  { const cols = ["#7A2A24", "#2E4A7A", "#2F5A3A", "#6B4A2E", "#5A3A7A", "#8C6A3A"];
    for (let f = 0; f < NFLOORS; f++) for (let k = 0; k < 3; k++) {
      const g = new T.Group(), c = cols[(f * 3 + k) % cols.length], cover = new T.MeshBasicMaterial({ color: c }), pages = new T.MeshBasicMaterial({ color: "#E8DCC0" });
      const L = new T.Group(), R = new T.Group();
      const cl = new T.Mesh(new T.BoxGeometry(0.2, 0.012, 0.28), cover); cl.position.x = -0.1; L.add(cl); const pl = new T.Mesh(new T.BoxGeometry(0.18, 0.03, 0.26), pages); pl.position.set(-0.095, 0.02, 0); L.add(pl);
      const cr = new T.Mesh(new T.BoxGeometry(0.2, 0.012, 0.28), cover); cr.position.x = 0.1; R.add(cr); const pr = new T.Mesh(new T.BoxGeometry(0.18, 0.03, 0.26), pages); pr.position.set(0.095, 0.02, 0); R.add(pr);
      g.add(L, R); propize(g, { emit: 0.15, emitC: "#FFD9A0" }); g.scale.setScalar(1.6); scene.add(g);
      flyers.push({ g, L, R, f, r: 1.2 + Math.random() * 1.7, h: 3.2 + Math.random() * 3.6, sp: (0.18 + Math.random() * 0.2) * (Math.random() < 0.5 ? 1 : -1), ph: Math.random() * 6.28, fl: 5 + Math.random() * 3 });
    } }

  /* ---------------- velas flutuando sobre o anel ---------------- */
  const candles = [];
  { const body = new T.MeshBasicMaterial({ color: "#EFE3C8" }), geo = new T.CylinderGeometry(0.035, 0.04, 0.24, 8);
    for (let f = 0; f < NFLOORS; f++) for (let k = 0; k < 11; k++) {
      const a = Math.random() * Math.PI * 2, r = 7.3 + Math.random() * 5.6, y = f * FH + 4.2 + Math.random() * 1.8;
      const m = new T.Mesh(geo, body); propize(m, { emit: 0.5, emitC: "#FFD9A0" }); m.position.set(r * Math.cos(a), y, r * Math.sin(a)); scene.add(m);
      candles.push({ m, y, ph: Math.random() * 6.28 });
    }
    const n = candles.length, fg = new T.BufferGeometry(); fg.setAttribute("position", new T.BufferAttribute(new Float32Array(n * 3), 3));
    candles.flames = new T.Points(fg, new T.PointsMaterial({ map: glowTex, color: 0xffbf66, size: 0.28, transparent: true, opacity: 0.95, depthWrite: false, blending: T.AdditiveBlending })); candles.flames.frustumCulled = false; scene.add(candles.flames); }

  /* ---------------- círculos de runas no chão, na boca de cada nicho: acendem quando a câmera chega ---------------- */
  const RUNEC_FS = `uniform sampler2D map; uniform float uTime, uOn; uniform vec3 uRC; varying vec2 vUv;
    void main(){ vec2 p = vUv - 0.5; float r = length(p) * 2.0, a = atan(p.y, p.x);
      float ring = smoothstep(0.03, 0.0, abs(r - 0.96)) + smoothstep(0.02, 0.0, abs(r - 0.62)) + smoothstep(0.015, 0.0, abs(r - 0.3));
      float glyph = 0.0; if (r > 0.68 && r < 0.92) glyph = texture2D(map, vec2(a / 6.2832 * 3.0 + uTime * 0.02, (r - 0.68) / 0.24)).r;
      float spokes = smoothstep(0.03, 0.0, abs(sin(a * 3.0 + uTime * 0.1)) * r) * step(0.3, r) * step(r, 0.62);
      float star = 0.0; for (int i = 0; i < 6; i++) { float t = float(i) * 1.0472 + uTime * 0.05; vec2 d = vec2(cos(t), sin(t)); star += smoothstep(0.012, 0.0, abs(dot(p * 2.0, vec2(-d.y, d.x))) ) * step(r, 0.62) * step(0.3, r) * 0.3; }
      float v = (ring + glyph + spokes + star) * step(r, 1.0);
      float lvl = 0.12 + uOn * (0.75 + 0.25 * sin(uTime * 2.0));
      gl_FragColor = vec4(uRC * v * lvl * 1.6, v * lvl); }`;
  const runeCircles = [];
  ALC.filter((al) => al.kind !== "porta").forEach((al) => {
    const col = al.world != null ? WORLDS[al.world].c : al.kind === "alquimia" ? "#7CFF6A" : "#FFC27A";
    const m = new T.Mesh(new T.PlaneGeometry(3.4, 3.4), new T.ShaderMaterial({ uniforms: { map: { value: runeTex }, uTime: U.uTime, uOn: { value: 0 }, uRC: { value: new T.Color(col) } }, vertexShader: "varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }", fragmentShader: RUNEC_FS, transparent: true, depthWrite: false, blending: T.AdditiveBlending }));
    m.rotation.x = -Math.PI / 2; m.position.copy(AL(al, 0, 0.02, 0.6)); scene.add(m); runeCircles.push({ m, al, on: 0 });
  });

  /* ---------------- as atividades: livros que flutuam na frente do portal de cada nicho ---------------- */
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

  function bookAt(al, x, y, z, title, color, sub) {
    const g = new T.Group(); g.position.copy(AL(al, x, y, z)); g.rotation.y = lookIn(g.position);
    const mats = [actMat(color, null, 0), actMat(color, null, 0), actMat(color, null, 1), actMat(color, null, 0), actMat(color, spineTexture(title, color, sub), 2), actMat(color, null, 0)];
    const body = new T.Mesh(new T.BoxGeometry(0.12, 0.38, 0.27), mats); body.position.y = 0.19; g.add(body);
    const halo = new T.Sprite(new T.SpriteMaterial({ map: glowTex, color: new T.Color(color).lerp(new T.Color("#ffd28a"), 0.5), transparent: true, opacity: 0.3, depthWrite: false, blending: T.AdditiveBlending })); halo.scale.set(0.8, 0.8, 1); halo.position.set(0, 0.2, 0.05); g.add(halo);
    g.scale.setScalar(1.7); scene.add(g);
    return { g, body, halo, mats, home: g.position.clone(), homeR: g.rotation.y, nx: -al.u.x, nz: -al.u.z, room: al, al, out: 0, match: 0, fly: 0, ph: Math.random() * 6 };
  }
  // os livros de um nicho ficam de pé num móvel baixo de madeira, entre a câmera e o portal, presos por dois apoios de latão
  function shelfRow(al, list, make) {
    const n = list.length, z = al.world != null ? al.d - 2.2 : al.d - 1.8, gap = 0.3, TOP = 0.8, W = n * gap + 0.7;
    const c = AL(al, 0, 0, z), ry = lookIn(c);
    const G = new T.Group(); G.position.copy(c); G.rotation.y = ry; scene.add(G);
    const piece = (w, h, d, x, y, dz, col, emit = 0) => { const m = new T.Mesh(new T.BoxGeometry(w, h, d), new T.MeshBasicMaterial({ color: col })); propize(m, { emit, emitC: col }); m.position.set(x, y, dz); G.add(m); return m; };
    piece(W, TOP - 0.1, 0.62, 0, (TOP - 0.1) / 2 + 0.05, 0, WOOD); piece(W + 0.1, 0.06, 0.7, 0, TOP - 0.03, 0, WOOD_D); piece(W + 0.12, 0.02, 0.72, 0, TOP, 0, GOLD, 0.2); piece(W + 0.06, 0.1, 0.66, 0, 0.05, 0, WOOD_D);
    for (let k = 0; k < Math.max(2, Math.round(W / 0.8)); k++) { const nk = Math.max(2, Math.round(W / 0.8)), x = -W / 2 + (k + 0.5) * W / nk; piece(W / nk - 0.12, TOP - 0.34, 0.02, x, (TOP - 0.1) / 2 + 0.05, 0.32, "#4a2e1e"); piece(0.05, 0.05, 0.03, x, TOP * 0.6, 0.34, GOLD, 0.3); }
    for (const sg of [-1, 1]) { const x = sg * (n * gap / 2 + 0.1); piece(0.03, 0.5, 0.36, x, TOP + 0.25, 0, GOLD, 0.25); piece(0.16, 0.03, 0.36, x - sg * 0.07, TOP + 0.015, 0, GOLD, 0.25); }
    lightAt(AL(al, 0, 1.9, z - 0.6), "#FFC890", 0.55, 0.05);
    return list.map((it, i) => { const x = (i - (n - 1) / 2) * gap, b = make(it, i, x, TOP + 0.005, z); b.shelf = true; return b; });
  }
  function addActivityBooks(list) {
    subjects = list;
    list.forEach((sub, si) => {
      const al = ALC.find((x) => x.subj === sub.name); if (!al) return;
      const color = COLORS[si % COLORS.length]; sub.color = color;
      if (al.world == null) sign(AL(al, 0, AH + 0.92, -1.02), lookIn(AL(al, 0, 0, -1.02)), sub.name, sub.cat === "curso-tecnico" ? "Curso técnico" : "Ensino médio", color, 2.6, 0.6);
      shelfRow(al, sub.acts, (a, ai, x, y, z) => { const b = bookAt(al, x, y, z, a.t, color); Object.assign(b, { a, sub, id: `${si}-${ai}` }); books.push(b); clickable(b.body, "livro", b); return b; });
    });
    buildPlaces(); renderIndex(); if (!hist.length && !fly && !intro.on) go(placeIdx, true); else if (!intro.on) label();
  }
  // o nicho do Quem sou: os textos do perfil viram livros também
  const PERFIL = [
    { t: "Quem sou", s: "Fernando Rateke Neto", r: "Desenvolvedor de sistemas em formação, em Florianópolis (SC). Ensino Médio integrado ao Técnico em Análise e Desenvolvimento de Sistemas no SESI SENAI, turma 3B, 2026.\\n\\nDesde cedo tive afinidade com as exatas, principalmente matemática, biologia e programação. Gosto de desafios de lógica, de interfaces que se explicam sozinhas e de soluções que funcionam bem. Além do código, levo comigo a pesquisa científica pela Iniciação Científica.", img: "perfil/retrato.jpg" },
    { t: "Interesses", s: "o que eu gosto", r: "Studio Ghibli (O Castelo Animado, A Viagem de Chihiro, Meu Amigo Totoro), animes (Frieren, Attack on Titan, Tokyo Ghoul), cultura japonesa e caligrafia, jogar e criar mundos." },
  ];
  { const al = alc("quemsou"); shelfRow(al, PERFIL, (a, i, x, y, z) => { const b = bookAt(al, x, y, z, a.t, ["#8E2A24", "#2E4A7A"][i % 2]); Object.assign(b, { a: Object.assign({ k: [], l: [] }, a, { r: a.r.replace(/\\n/g, "\n") }), sub: { name: "Quem sou", acts: PERFIL }, id: "perfil-" + i }); books.push(b); clickable(b.body, "livro", b); return b; }); }

  /* certificados: um em cada redoma, em arco dentro do nicho */
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
    const al = alc("certificados");
    CERTS.forEach((cf, k) => {
      const x = (k - 2.5) * 0.98, z = al.d - 1.6 - Math.abs(x) * 0.28, p = AL(al, x, 0, z);
      const g = place(m.clone(true), { at: p, h: 1.6, ry: lookIn(p) });
      const card = new T.Mesh(new T.PlaneGeometry(0.3, 0.4), new T.MeshBasicMaterial({ map: certTexture(cf) }));
      card.position.copy(p).setY(al.y + 1.38); card.rotation.y = lookIn(p); scene.add(card);
      lightAt(AL(al, x, 1.95, z - 0.4), "#FFD08A", 0.45, 0.02);
      const it = { cf, g, card, pos: p.clone().setY(al.y + 1.4), nx: -al.u.x, nz: -al.u.z }; certItems.push(it); clickable(g, "cert", it); clickable(card, "cert", it);
    });
  }, 6);
  { const al = alc("certificados"); sign(AL(al, 0, AH + 0.92, -1.02), lookIn(AL(al, 0, 0, -1.02)), "Certificados", "Feiras e Iniciação Científica", "#C8A04A", 2.6, 0.6); }

  /* o topo: o selo flutuando no meio, os livros dos visitantes em órbita, o tinteiro para deixar o seu */
  const sealTex = (() => { const c = document.createElement("canvas"); c.width = c.height = 256; const g = c.getContext("2d"); g.fillStyle = "#C22026"; g.beginPath(); g.roundRect ? g.roundRect(8, 8, 240, 240, 46) : g.rect(8, 8, 240, 240); g.fill(); g.fillStyle = "#fff"; g.textAlign = "center"; g.font = "800 62px 'Shippori Mincho', serif"; ["ラ", "テ", "ケ"].forEach((ch, i) => g.fillText(ch, 128, 74 + i * 66)); return new T.CanvasTexture(c); })();
  const seal = new T.Mesh(new T.BoxGeometry(0.9, 0.9, 0.14), [0, 0, 0, 0, 0, 0].map((_, i) => (i === 4 || i === 5 ? new T.MeshBasicMaterial({ map: sealTex }) : new T.MeshBasicMaterial({ color: "#8E161B" }))));
  seal.position.set(0, TOPY + 2.1, 0); scene.add(seal);
  const sealHalo = new T.Sprite(new T.SpriteMaterial({ map: glowTex, color: 0xff5a4a, transparent: true, opacity: 0.55, depthWrite: false, blending: T.AdditiveBlending })); sealHalo.scale.set(3.2, 3.2, 1); sealHalo.position.copy(seal.position); scene.add(sealHalo);
  lightAt(V3(0, TOPY + 2.4, 0), "#FF8A6A", 1.6, 0.05);
  const sealC = clickable(seal, "fim", null, ["O selo", "Terminar"]);
  prop("tinteiro", (m) => clickable(place(m, { at: V3(0.25, TOPY + 1.08, 0.1), size: 0.24 }), "recado", null, ["Tinteiro", "Deixar um livro na estante"]), 7);
  const visitorBooks = [];
  const VCOL = { madeira: "#6B4A2E", vermelho: "#8E2A24", azul: "#2E4A7A", verde: "#2F5A3A" };
  function addVisitors(list) {
    lanList = list.slice(0, 40); if (fin.stage === "infinito") buildLanterns();
    visitorBooks.forEach((b) => scene.remove(b.g)); visitorBooks.length = 0;
    const fake = { u: V3(1, 0, 0), tv: V3(0, 0, 1), y: TOPY, d: 0 };
    list.slice(0, 18).forEach((e, k) => {
      const g = new T.Group(); const mats = [0, 1, 2, 3, 4, 5].map((i) => actMat(VCOL[e.cor] || VCOL.madeira, i === 4 ? spineTexture(e.nome || "Visitante", VCOL[e.cor] || VCOL.madeira, new Date(e.criado_em || Date.now()).toLocaleDateString("pt-BR")) : null, i === 4 ? 2 : i === 2 ? 1 : 0));
      const body = new T.Mesh(new T.BoxGeometry(0.12, 0.38, 0.27), mats); body.position.y = 0.19; g.add(body);
      const halo = new T.Sprite(new T.SpriteMaterial({ map: glowTex, color: 0xffd28a, transparent: true, opacity: 0.25, depthWrite: false, blending: T.AdditiveBlending })); halo.scale.set(0.7, 0.7, 1); halo.position.set(0, 0.2, 0.05); g.add(halo);
      g.scale.setScalar(1.4); scene.add(g);
      const b = { g, body, halo, mats, visitor: e, orbit: k, out: 0, match: 0, fly: 0, ph: k * 0.7, nx: 0, nz: 0, home: V3(), homeR: 0, al: fake };
      visitorBooks.push(b); clickable(body, "visitante", b);
    });
  }
  function loadVisitors() {
    fetch("/api/ema", { cache: "no-store" }).then((r) => (r.ok ? r.json() : null)).then((d) => {
      let list = d && d.ok ? d.emas || [] : [];
      try { const mine = JSON.parse(localStorage.getItem("biblioteca-meus") || "[]"); list = mine.concat(list.filter((e) => !mine.some((m) => m.id === e.id))); } catch (e) { /* sem storage */ }
      addVisitors(list);
    }).catch(() => { try { addVisitors(JSON.parse(localStorage.getItem("biblioteca-meus") || "[]")); } catch (e) { /* nada */ } });
  }


  /* ---------------- os lugares: cada um é uma cena já enquadrada ---------------- */
  let places = [], placeIdx = 0;
  const alcPose = (al) => ({ pos: AL(al, 0, 1.95, 0.35), tgt: AL(al, 0, 1.7, al.d) });
  function buildPlaces() {
    const F = (f) => FLOORS[f].t, P = [];
    const A = (id, t, sub) => { const al = alc(id); P.push({ id, g: F(al.f), t, sub: sub || "", f: al.f, room: al, pose: alcPose(al) }); };
    P.push({ id: "entrada", g: F(0), t: "A entrada", sub: "o vão da torre", f: 0, room: PA, pose: { pos: AL(PA, 0, 2.0, -2.2), tgt: polarY(PA.r + Math.PI, 3.0, 4.2) } });
    P.push({ id: "escritorio", g: F(0), t: "O Escritório", sub: "a lareira, a mesa e o piano", f: 0, room: LA, pose: { pos: polarY(LA.r, 8.6, 2.15), tgt: AL(LA, 0, 1.35, LA.d) } });
    P.push({ id: "alquimia", g: F(0), t: "A bancada de alquimia", sub: "as poções", f: 0, room: alc("alquimia"), pose: { pos: AL(alc("alquimia"), 0.1, 2.15, -1.9), tgt: AL(alc("alquimia"), -0.2, 1.05, alc("alquimia").d - 0.6) } });
    P.push({ id: "mesa", g: F(0), t: "A mesa de trabalho", sub: "o recado, a busca e o contato", f: 0, room: LA, pose: { pos: deskG.localToWorld(V3(1.85, 1.62, 0.62)), tgt: deskG.localToWorld(V3(-0.35, 0.92, -0.05)) } });
    A("quemsou", "Quem sou", "interesses e valores"); A("trem", "1º e 2º ano", "o que veio antes");
    for (const id of ["linguagens", "matematica", "natureza", "humanas"]) A(id, alc(id).subj);
    A("tecnica", "Área técnica", "o curso");
    for (const id of ["modelagem", "desenvolvimento", "aplicativos", "iot", "banco"]) A(id, alc(id).subj);
    A("certificados", "Certificados", "feiras e iniciação científica");
    A("agradecimentos", "Agradecimentos"); A("futuro", "Perspectivas para o futuro");
    const ta = landA(NFLOORS - 1) + Math.PI * 0.62;
    P.push({ id: "topo", g: F(NFLOORS - 1), t: "O topo", sub: "o fim", f: NFLOORS - 1, room: null, pose: { pos: polarY(ta, 8.6, TOPY + 2.5), tgt: V3(0, TOPY + 2.6, 0) } });
    places = P;
  }
  buildPlaces();

  /* ---------------- câmera: deslizar devagar pelo anel, e pela escada de um andar ao outro ---------------- */
  const cam = { pos: V3(0, EYE, 0), tgt: V3(0, EYE, 5), yaw: 0, pitch: 0, yawT: 0, pitchT: 0 };
  let fly = null, focus = null, lookReady = false; const lookS = V3();
  const smoother = (x) => x * x * x * (x * (x * 6 - 15) + 10);
  const sstep = (a, b, x) => { const v = Math.max(0, Math.min(1, (x - a) / (b - a))); return v * v * (3 - 2 * v); };
  function glide(pts, tgt, done, minDur = 2.2, speed = 4.8) {
    const end = pts[pts.length - 1];
    if (reduce) { cam.pos.copy(end); cam.tgt.copy(tgt); lookReady = false; if (done) done(); return; }
    const clean = [pts[0].clone()]; for (const p of pts.slice(1)) if (p.distanceTo(clean[clean.length - 1]) > 0.3) clean.push(p.clone());
    let curve = null, len = 0;
    if (clean.length >= 2) { curve = new T.CatmullRomCurve3(clean, false, "centripetal", 0.5); len = curve.getLength(); }
    if (Math.abs(cam.yaw) > 1e-3 || Math.abs(cam.pitch) > 1e-3) { const d = cam.tgt.clone().sub(cam.pos), r = d.length(), yw = Math.atan2(d.z, d.x) + cam.yaw, pt = Math.asin(Math.max(-0.99, Math.min(0.99, d.y / r))) + cam.pitch; cam.tgt.set(cam.pos.x + Math.cos(yw) * Math.cos(pt) * r, cam.pos.y + Math.sin(pt) * r, cam.pos.z + Math.sin(yw) * Math.cos(pt) * r); }
    cam.yaw = cam.pitch = cam.yawT = cam.pitchT = 0;
    const d0 = cam.tgt.clone().sub(cam.pos).normalize();
    fly = { curve, len, u: 0, dur: curve ? Math.min(8.5, Math.max(minDur, len / speed)) : 1.4, d0, t1: tgt.clone(), done };
    document.body.classList.add("flying");
  }
  const RW = 9.6; // raio do caminho no anel
  const angOf = (p) => Math.atan2(p.z, p.x);
  function arcPts(f, a0, a1, r = RW) { let d = a1 - a0; while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI; const n = Math.max(1, Math.ceil(Math.abs(d) / 0.35)), out = []; for (let k = 0; k <= n; k++) out.push(polarY(a0 + d * k / n, r, f * FH + EYE + 0.2)); return out; }
  function helixPts(f0, f1) {
    const out = [], dir = Math.sign(f1 - f0);
    for (let f = f0; f !== f1; f += dir) { const base = dir > 0 ? f : f - 1, a0 = landA(base); for (let k = 0; k <= 8; k++) { const s = dir > 0 ? k / 8 : 1 - k / 8; out.push(polarY(a0 + s * TURN * 2 * Math.PI, SR, base * FH + s * FH + EYE + 0.15)); } }
    return out;
  }
  function travel(from, to, done) {
    const f0 = from.f, f1 = to.f, a0 = angOf(cam.pos), a1 = angOf(to.pose.pos);
    if (f0 === f1) {
      if (cam.pos.distanceTo(to.pose.pos) < 5) { glide([cam.pos.clone(), to.pose.pos], to.pose.tgt, done, 1.8); return; }
      glide([cam.pos.clone(), ...arcPts(f0, a0, a1), to.pose.pos], to.pose.tgt, done, 2.4); return;
    }
    const pts = [cam.pos.clone(), ...arcPts(f0, a0, landA(f0)), polarY(landA(f0), SR + 0.6, f0 * FH + EYE + 0.15), ...helixPts(f0, f1), polarY(landA(f1), SR + 0.6, f1 * FH + EYE + 0.15), ...arcPts(f1, landA(f1), a1), to.pose.pos];
    glide(pts, to.pose.tgt, done, 3.0, 5 + 2.6 * Math.abs(f1 - f0));
  }
  const veil = $("dobra");
  function fold(p, done) { // usado só quando a câmera já está no meio de um voo
    if (reduce) { cam.pos.copy(p.pose.pos); cam.tgt.copy(p.pose.tgt); lookReady = false; if (done) done(); return; }
    fly = { hold: true }; veil.classList.add("on"); document.body.classList.add("flying");
    setTimeout(() => { cam.pos.copy(p.pose.pos); cam.tgt.copy(p.pose.tgt); lookReady = false; cam.yaw = cam.pitch = 0; fly = null; document.body.classList.remove("flying"); veil.classList.remove("on"); if (done) done(); }, 700);
  }

  /* ---------------- os mundos: cada fenda abre uma cena própria, baixada só quando a pessoa entra ---------------- */
  const WORLD_FILE = { 3: "natureza", 4: "vagalumes", 5: "fios", 6: "trem" };
  let world = null, worldOf = null; const worldLoads = {};
  function loadWorld(id) {
    if (window.MUNDOS && window.MUNDOS[id]) return Promise.resolve(window.MUNDOS[id]);
    return worldLoads[id] || (worldLoads[id] = new Promise((ok, no) => { const el = document.createElement("script"); el.src = "/biblioteca/mundos/" + id + ".js"; el.onload = () => (window.MUNDOS && window.MUNDOS[id] ? ok(window.MUNDOS[id]) : no()); el.onerror = no; document.head.appendChild(el); }));
  }
  const worldCtx = () => ({ T, base: "/biblioteca/mundos/", reduce, small, glowTex, esc, showPanel, closePanel, toast, aspect: () => innerWidth / innerHeight, subjects: () => subjects, openPages: (sub, i) => { if (sub && sub.acts[i]) showBook({ a: sub.acts[i], sub }); }, openAct: (name, i) => { const sub = subjects.find((x) => x.name === name); if (!sub || !sub.acts[i]) return; const b = books.find((x) => x.sub === sub && x.a === sub.acts[i]) || { a: sub.acts[i], sub }; showBook(b); } });
  const riftFront = (w) => w.pos.clone().addScaledVector(V3(w.nx, 0, w.nz), 1.6).setY(w.room.c.y + 1.75);
  function enterWorld(w) {
    const id = WORLD_FILE[w.k];
    if (!id) { toast(w.s, w.t, "Este mundo ainda está sendo construído. A fenda já está aberta, falta o outro lado."); return; }
    if (world || (fly && !fly.hold)) return;
    closePanel(true); const ld = loadWorld(id);
    glide([cam.pos.clone(), riftFront(w)], w.pos.clone(), () => {
      veil.style.setProperty("--wc", w.c); veil.classList.add("on", "mundo"); document.body.classList.add("flying");
      Promise.all([ld, new Promise((r) => setTimeout(r, reduce ? 0 : 750))]).then(([make]) => {
        try { world = make(worldCtx()); } catch (e) { console.warn("mundo", e); world = null; }
        if (world) { worldOf = w; world.resize(innerWidth, innerHeight); document.body.classList.add("no-mundo"); if (music && !music.paused) fadeTo(0, 900, () => music.pause()); }
        document.body.classList.remove("flying"); veil.classList.remove("on"); setTimeout(() => veil.classList.remove("mundo"), 700); label();
      }).catch(() => { veil.classList.remove("on", "mundo"); document.body.classList.remove("flying"); toast(w.s, w.t, "Não deu para abrir este mundo agora."); });
    }, 1.6);
  }
  function exitWorld(then) {
    if (!world) { if (then) then(); return; }
    closePanel(true); veil.style.setProperty("--wc", worldOf.c); veil.classList.add("on", "mundo");
    setTimeout(() => {
      try { world.dispose(); } catch (e) { /* nada */ }
      const w = worldOf; world = null; worldOf = null; document.body.classList.remove("no-mundo"); hotC = null; rotulo.classList.remove("on");
      cam.pos.copy(riftFront(w)); cam.tgt.copy(w.pos); cam.yaw = cam.pitch = cam.yawT = cam.pitchT = 0; lookReady = false;
      veil.classList.remove("on"); setTimeout(() => veil.classList.remove("mundo"), 700); label(); if (musicWant) musicOn();
      if (then) then(); else glide([cam.pos.clone(), cur().pose.pos], cur().pose.tgt, null, 2.0);
    }, reduce ? 0 : 650);
  }

  /* ---------------- navegação ---------------- */
  const cur = () => places[placeIdx];
  const hist = []; let quietT = 0;
  function label() {
    if (world) { $("aquiK").textContent = "Mundo · " + (worldOf ? worldOf.s : ""); $("aquiT").textContent = world.name; $("voltar").hidden = false; }
    else { $("aquiK").textContent = cur().g; $("aquiT").textContent = cur().t; $("voltar").hidden = !hist.length; }
    const nav = $("nav"); nav.classList.remove("quiet"); clearTimeout(quietT); quietT = setTimeout(() => nav.classList.add("quiet"), 4200);
  }
  function go(i, instant = false, fromBack = false, done) {
    if (typeof i === "string") i = places.findIndex((p) => p.id === i);
    if (i < 0 || i >= places.length) return;
    if (world) { closeIndex(); exitWorld(() => go(i, instant, fromBack, done)); return; }
    if (endIntro()) { fly = null; instant = instant || false; }
    if (fin.stage && fin.stage !== "clarear") restoreAll(); teleOn = false; constel.on = false;
    closePanel(true); closeIndex(); focus = null; hotC = null; canvas.classList.remove("hot"); rotulo.classList.remove("on");
    const from = cur(), to = places[i];
    if (!fromBack && !instant && i !== placeIdx) { hist.push(placeIdx); if (hist.length > 30) hist.shift(); }
    placeIdx = i; visited.add(to.f);
    if (instant) { cam.pos.copy(to.pose.pos); cam.tgt.copy(to.pose.tgt); lookReady = false; if (done) done(); }
    else if (fly) fold(to, done); else travel(from, to, done);
    label(); renderIndex(); hint();
  }
  function back() { if (closeLivro()) return; if (teleOn) { teleOn = false; constel.on = false; glide([cam.pos.clone(), cur().pose.pos], cur().pose.tgt, null, 1.8); return; } if (fin.stage) return; if (panel.classList.contains("open")) { closePanel(); return; } if (world) { if (!world.back()) exitWorld(); return; } const i = hist.pop(); if (i != null) go(i, false, true); $("voltar").hidden = !hist.length; }
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
  function closePanel(silent) { if (!panel.classList.contains("open")) return; panel.classList.remove("open"); panel.setAttribute("aria-hidden", "true"); openThing = null; if (world && !silent && !panelStack) world.back(); books.concat(visitorBooks).forEach((b) => (b.open = false)); if (focus) { focus = null; if (!silent) glide([cam.pos.clone(), cur().pose.pos], cur().pose.tgt, null, 1.8); } }
  $("pFechar").addEventListener("click", () => closePanel());
  $("pCorpo").addEventListener("click", (e) => {
    const a = e.target.closest("[data-go], [data-ativ], [data-sala]"); if (!a) return; e.preventDefault();
    if (a.dataset.go) go(a.dataset.go);
    else if (a.dataset.ativ) { const [name, i] = a.dataset.ativ.split("|"); const b = books.find((x) => x.sub.name === name && x.sub.acts.indexOf(x.a) === +i); if (b) showBook(b); }
    else if (a.dataset.sala) { const sj = subjects.find((x) => x.name === a.dataset.sala); if (sj) showPanel(sj.cat === "curso-tecnico" ? "Curso técnico" : "Ensino médio", sj.name, `<p>${esc(sj.desc || "")}</p><div class="links">${sj.acts.map((x, i) => `<a href="#" data-ativ="${esc(sj.name)}|${i}">${esc(x.t)}</a>`).join("")}</div>`); }
  });
  let toastT = 0;
  function toast(k, t, s) { $("avisoK").textContent = k; $("avisoT").textContent = t; $("avisoS").textContent = s || ""; const el = $("aviso"); el.classList.add("on"); clearTimeout(toastT); toastT = setTimeout(() => el.classList.remove("on"), 3600); }
  /* ---------------- o livro aberto: cada atividade em duas páginas de tamanho fixo ---------------- */
  // o livro 3D sai do ar, vem até a câmera, e o livro de papel abre por cima
  let panelStack = false;
  const livro = $("livro"); let livroB = null;
  const imgSrc = (u) => (!u ? "" : /^https?:|^\//.test(u) ? u : "/vale/" + u);
  function sections(a) { // Contexto, O que aprendi e Importância: o texto original dividido, sem nada a mais
    if (a.ctx || a.apr || a.imp) return [["Contexto", a.ctx], ["O que aprendi", a.apr], ["Importância", a.imp]].filter((x) => x[1]);
    return [["Sobre", a.r]];
  }
  function fillLivro(b) {
    const a = b.a; livroB = b;
    $("lvKick").textContent = b.sub.name + (a.s ? " · " + a.s : "");
    $("lvTitulo").textContent = a.t;
    const src = imgSrc(a.img);
    $("lvImg").innerHTML = src ? `<img src="${esc(src)}" alt="" onerror="this.replaceWith(Object.assign(document.createElement('span'),{className:'lv-sem',textContent:'ラテケ'}))">` : `<span class="lv-sem">ラテケ</span>`;
    $("lvTexto").innerHTML = sections(a).map(([h, t]) => `<h3>${esc(h)}</h3>` + String(t || "").split(/\n+/).map((x) => `<p>${esc(x)}</p>`).join("")).join("") + (a.nota ? `<p class="lv-nota">${esc(a.nota.replace(/^Nota:\s*/, ""))}</p>` : "");
    const k = a.k || [];
    $("lvSelos").innerHTML = k.length ? `<h3>Competências</h3><div class="selos">${k.map(([c, t]) => `<button type="button" class="selo" data-t="${esc(t)}" title="${esc(t)}"><b>${esc(c)}</b></button>`).join("")}</div><p class="selo-txt" id="seloTxt">Toque num selo para ler a competência.</p>` : "";
    $("lvFitas").innerHTML = (a.l || []).map(([t, u]) => `<a class="fita" href="${esc(u)}" target="_blank" rel="noopener">${esc(t)}</a>`).join("");
    const sib = (b.sub && b.sub.acts) || [], i = sib.indexOf(a);
    $("lvPrev").hidden = i <= 0; $("lvNext").hidden = i < 0 || i >= sib.length - 1;
    $("lvPos").textContent = sib.length > 1 && i >= 0 ? `${i + 1} / ${sib.length}` : "";
    $("lvTexto").scrollTop = 0;
  }
  function showBook(b) {
    books.forEach((o) => (o.open = o === b)); fillLivro(b);
    closePanel(true); livro.classList.add("on"); livro.setAttribute("aria-hidden", "false"); document.body.classList.add("lendo");
  }
  function openBook(b) { if (livro.classList.contains("on")) return; b.open = true; setTimeout(() => { if (b.open) showBook(b); }, reduce ? 0 : 560); }
  function closeLivro() { if (!livro.classList.contains("on")) { books.forEach((o) => (o.open = false)); return false; } livro.classList.remove("on"); livro.setAttribute("aria-hidden", "true"); document.body.classList.remove("lendo"); books.forEach((o) => (o.open = false)); if (world && world.back) world.back(); return true; }
  function turn(dir) {
    const b = livroB; if (!b || !b.sub) return; const sib = b.sub.acts, i = sib.indexOf(b.a) + dir; if (i < 0 || i >= sib.length) return;
    const nb = books.find((x) => x.sub === b.sub && x.a === sib[i]) || { a: sib[i], sub: b.sub };
    const pg = $("lvPaginas"); pg.classList.remove("vira-e", "vira-d"); void pg.offsetWidth; pg.classList.add(dir > 0 ? "vira-d" : "vira-e");
    setTimeout(() => { fillLivro(nb); books.forEach((o) => (o.open = o === nb)); }, reduce ? 0 : 230);
  }
  $("lvPrev").addEventListener("click", () => turn(-1)); $("lvNext").addEventListener("click", () => turn(1)); $("lvFechar").addEventListener("click", () => closeLivro());
  livro.addEventListener("click", (e) => { if (e.target === livro) closeLivro(); });
  $("lvSelos").addEventListener("click", (e) => { const s0 = e.target.closest(".selo"); if (!s0) return; $("lvSelos").querySelectorAll(".selo").forEach((x) => x.classList.toggle("on", x === s0)); $("seloTxt").textContent = s0.dataset.t; });
  { let sx = null; livro.addEventListener("touchstart", (e) => { sx = e.touches[0].clientX; }, { passive: true }); livro.addEventListener("touchend", (e) => { if (sx == null) return; const dx = e.changedTouches[0].clientX - sx; if (Math.abs(dx) > 60) turn(dx < 0 ? 1 : -1); sx = null; }); }
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
        if (!fin.stage) go("topo");
      }).catch(() => { $("fNota").textContent = "Sem conexão com a estante agora."; });
    });
  }
  /* o tema da biblioteca: começa no primeiro toque ou clique (o navegador não deixa antes), em loop;
     o arquivo toca como veio, só o volume sobe devagar. O botão de som e o gramofone ligam e desligam. */
  let music = null, musicWant = true, fadeT = 0;
  try { musicWant = localStorage.getItem("biblioteca-som") !== "0"; } catch (e) { /* sem storage */ }
  const somBtn = $("som");
  function setSomBtn() { somBtn.setAttribute("aria-pressed", String(!!(music && !music.paused))); somBtn.title = music && !music.paused ? "Desligar a música" : "Ligar a música"; }
  function fadeTo(v, ms, then) { clearInterval(fadeT); const v0 = music.volume, t0 = performance.now(); fadeT = setInterval(() => { const k = Math.min(1, (performance.now() - t0) / ms); music.volume = v0 + (v - v0) * k; if (k >= 1) { clearInterval(fadeT); if (then) then(); } }, 50); }
  function musicOn() {
    if (!music) { music = new Audio("/biblioteca/audio/tema.mp3"); music.loop = true; music.volume = 0; music.addEventListener("play", setSomBtn); music.addEventListener("pause", setSomBtn); }
    if (!music.paused) return; music.play().then(() => fadeTo(0.5, 3000)).catch(() => {});
  }
  function musicOff() { if (music && !music.paused) fadeTo(0, 700, () => music.pause()); }
  function toggleMusic() {
    musicWant = !(music && !music.paused); try { localStorage.setItem("biblioteca-som", musicWant ? "1" : "0"); } catch (e) { /* sem storage */ }
    if (musicWant) musicOn(); else musicOff();
  }
  somBtn.addEventListener("click", (e) => { e.stopPropagation(); toggleMusic(); });
  const firstTouch = () => { removeEventListener("pointerdown", firstTouch, true); removeEventListener("keydown", firstTouch, true); if (musicWant && !world) musicOn(); };
  addEventListener("pointerdown", firstTouch, true); addEventListener("keydown", firstTouch, true);
  function activate(c) {
    switch (c.kind) {
      case "livro": openBook(c.data); break;
      case "mundo": enterWorld(c.data); break;
      case "w": c.go(); break;
      case "fim": finale(); break;
      case "pocao": brew(c.data); break;
      case "andar": { const i = places.findIndex((q) => q.f === c.data.f); if (i >= 0) go(i); break; }
      case "telescopio": lookTele(); break;
      case "recado": formRecado(); break;
      case "busca": openIndex(); setTimeout(() => busca.focus(), 350); break;
      case "indice": openIndex(); break;
      case "mundos": showPanel("Os mundos", "Dez fendas, dez mundos", `<p>Cada parte do portfólio tem uma fenda para um mundo, numa porta da sala dela. Escolha uma para ir até lá.</p><div class="links">${rifts.map((w) => `<a href="#" data-go="${w.al.id}">${esc(w.t)} · ${esc(w.s)}</a>`).join("")}</div>`); break;
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
    else if (e.key === "Escape") { if (!closeLivro()) { closePanel(); closeIndex(); } }
    else if (livro.classList.contains("on") && e.key === "ArrowRight") turn(1);
    else if (livro.classList.contains("on") && e.key === "ArrowLeft") turn(-1);
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
  function look(dx, dy) { if (world) { world.look(dx, dy); return; } if (fly) return; cam.yawT -= dx * 0.0032; cam.pitchT = Math.max(-0.3, Math.min(0.3, cam.pitchT - dy * 0.003)); }
  const rc = new T.Raycaster();
  function pick(p) {
    if (fin.stage === "infinito") { rc.setFromCamera(p, camera); const h = rc.intersectObjects([qrPlate].concat(lanterns.map((l) => l.m)), false)[0]; if (!h) return null; if (h.object === qrPlate) return { kind: "qr", label: ["Deixe um recado", "escrever o seu"] }; const l = lanterns.find((x) => x.m === h.object); return l ? { kind: "lan", data: l, label: [l.e ? l.e.nome || "Visitante" : "Uma lanterna", l.e ? "ler o recado" : ""] } : null; }
    if (fin.stage) return null;
    if (world) { const it = world.pick(p); return it ? { kind: "w", label: it.label, go: it.go } : null; } rc.setFromCamera(p, camera); const hs = rc.intersectObjects(clickables, false); const sh = hs.find((x) => x.object === seal); const h = sh || hs[0]; return h && h.distance < 30 ? h.object.userData.click : null; } // o selo tem prioridade sobre o que passa na frente dele
  const rotulo = $("rotulo");
  function labelOf(c) {
    if (c.label) return c.label;
    const d = c.data || {};
    if (c.kind === "livro") return [d.a && d.a.t || "Atividade", "Abrir"];
    if (c.kind === "andar") return [FLOORS[d.f].t, visited.has(d.f) ? "já passou por aqui" : "ainda não visitado"];
    if (c.kind === "mundo") return [d.t, d.s + (WORLD_FILE[d.k] ? " · entrar" : " · em construção")];
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
  function clickAt(p) { if (intro.on) { enter(); return; } if (fin.stage === "infinito") { finClick(p); return; } if (fin.stage) return; const c = pick(p); if (c) activate(c); }

  /* ---------------- o controle pelo celular fala por aqui ---------------- */
  window.biblioteca = {
    enter: (k) => { const w = rifts.find((x) => x.k === k); if (w) enterWorld(w); }, leave: () => exitWorld(),
    go, back, places: () => places.map((p, i) => ({ i, id: p.id, t: p.t, g: p.g, sub: p.sub || "" })),
    view: (p, t) => glide([cam.pos.clone(), V3(...p)], V3(...t)),
    screen: (what) => { const o = what === "selo" ? seal : (books.find((b) => b.id === what) || {}).body || (portals.find((w) => w.al.id === what) || {}).g; if (!o) return null; const v = o.getWorldPosition(new T.Vector3()).project(camera); return { x: Math.round((v.x * 0.5 + 0.5) * innerWidth), y: Math.round((-v.y * 0.5 + 0.5) * innerHeight), front: v.z < 1 && Math.abs(v.x) < 1 && Math.abs(v.y) < 1 }; },
    look, pointer: (nx, ny) => { ptr.set(nx, ny); hover(ptr); return !!hotC; }, click: (nx, ny) => clickAt(new T.Vector2(nx, ny)),
    close: () => { closePanel(); closeIndex(); }, books: () => books.map((b) => ({ id: b.id, t: b.a.t, room: b.room.id })), livro: () => livro.classList.contains("on"),
    openBook: (id) => { const b = books.find((o) => o.id === id); if (b) openBook(b); },
    worldObj: () => world, _dbg: () => ({ deskG, T, scene }),
    state: () => ({ place: placeIdx, id: cur().id, fim: fin.stage, fimT: +fin.t.toFixed(2), voltas, intro: intro.on, world: world ? world.name : null, flying: !!fly, u: fly && fly.u != null ? fly.u : null, panel: panel.classList.contains("open") }),
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
      try { if (!window.qrcode) await loadScript("/biblioteca/vendor/qrcode.min.js"); const q = window.qrcode(0, "M"); q.addData(url); q.make(); $("qr").innerHTML = q.createImgTag(6, 0, "QR code do controle"); }
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
      const img = (livro.classList.contains("on") && $("lvImg").querySelector("img")) || (panel.classList.contains("open") && $("pCorpo").querySelector("img"));
      if (onZ && img) { $("lightImg").src = img.src; light.classList.add("on"); return; }
      if (!onZ) light.classList.remove("on");
      zoomT = onZ ? 0.45 : 1;
    }
    function scroll(dy) {
      if (livro.classList.contains("on")) $("lvTexto").scrollBy(0, dy);
      else if (panel.classList.contains("open")) $("pCorpo").scrollBy(0, dy);
      else if (idx.classList.contains("open")) idx.scrollBy(0, dy);
      else look(0, dy * 0.6);
    }
    function sendState() {
      if (!phone) return;
      const st = { t: "state", phone, fin: fin.stage || (cur().id === "topo" ? "topo" : ""), place: placeIdx, id: cur().id, title: cur().t, sub: cur().sub || "", g: cur().g, back: hist.length > 0, panel: panel.classList.contains("open"), music: !!(music && !music.paused), places: places.map((p, i) => ({ i, id: p.id, t: p.t, g: p.g, sub: p.sub || "" })) };
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
        case "fim": if (fin.stage === "infinito") startFall(); else if (!fin.stage && cur().id === "topo") finale(); break;
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
    uniforms: { tDiff: { value: rt.texture }, uRes: { value: new T.Vector2(1, 1) }, uTime: U.uTime, uStreak: { value: 0 }, uFlash: { value: new T.Vector3() }, uBlack: { value: 0 } }, depthTest: false, depthWrite: false,
    vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`,
    fragmentShader: `uniform sampler2D tDiff; uniform vec2 uRes; uniform float uTime; varying vec2 vUv;
      float hh(vec2 p){ return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
      uniform float uStreak, uBlack; uniform vec3 uFlash;
      void main(){
        vec3 c = texture2D(tDiff, vUv).rgb; vec2 px = 1.0 / uRes;
        if (uStreak > 0.001) { vec2 dc = (vUv - 0.5) * uStreak * 0.09; vec3 acc = c; for (int i = 1; i < 8; i++) acc += texture2D(tDiff, vUv - dc * float(i) / 7.0).rgb; c = acc / 8.0; } // o rastro da queda
        ${small ? "" : `vec3 b = vec3(0.0);
        for (int i = 0; i < 12; i++) { float a = float(i) * 0.5236; vec2 o = vec2(cos(a), sin(a));
          b += max(texture2D(tDiff, vUv + o * px * 7.0).rgb - 0.55, 0.0) + max(texture2D(tDiff, vUv + o * px * 18.0).rgb - 0.6, 0.0) * 0.7; }
        c += b * 0.075;`}
        c = pow(max(c, 0.0), vec3(0.97, 1.0, 1.07)) * vec3(1.04, 1.0, 0.93);
        float l = dot(c, vec3(0.3, 0.59, 0.11)); c = mix(vec3(l), c, 0.9);
        c = c * 1.2 + vec3(0.016, 0.011, 0.006);
        vec2 q = vUv - 0.5; float vig = smoothstep(0.85, 0.2, length(q * vec2(1.0, 0.85)) * 1.25); c *= mix(0.55, 1.0, vig);
        c += (hh(vUv * uRes + fract(uTime * 7.0) * 100.0) - 0.5) * 0.04;
        c += uFlash * (1.0 - vig * 0.6); c *= 1.0 - uBlack;
        gl_FragColor = vec4(c, 1.0);
      }`,
  }));
  const postScene = new T.Scene(); postScene.add(post); const postCam = new T.OrthographicCamera(-1, 1, 1, -1, 0, 1);

  /* ---------------- laço ---------------- */
  let baseFov = 62;
  function resize() { const w = innerWidth, h = innerHeight; renderer.setSize(w, h, false); rt.setSize(Math.floor(w * DPR), Math.floor(h * DPR)); post.material.uniforms.uRes.value.set(w * DPR, h * DPR); camera.aspect = w / h; baseFov = w / h < 0.8 ? 78 : 62; camera.fov = baseFov * zoomK; camera.updateProjectionMatrix(); if (world) world.resize(w, h); }
  addEventListener("resize", resize); resize();
  const clock = new T.Clock(); let clockT = 0; const tmp = new T.Vector3(), tmp2 = new T.Vector3(), la = new T.Vector3(), dirv = new T.Vector3();
  function frame() {
    const dt = Math.min(0.05, clock.getDelta()); clockT += dt; const t = clockT; U.uTime.value = t;
    if (world) { world.update(dt, t); world.render(renderer); requestAnimationFrame(frame); return; }
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
    updateLights(t);
    // poeira acompanha a câmera
    const P = dust.geometry.attributes.position.array;
    for (let i = 0; i < DUST; i++) { let x = P[i * 3], y = P[i * 3 + 1], z = P[i * 3 + 2]; y += dt * (0.04 + ds[i] * 0.07); x += Math.sin(t * 0.3 + i) * dt * 0.06; const cx = cam.pos.x, cz = cam.pos.z, cy = cam.pos.y;
      if (y > cy + 5) y = cy - 3; if (y < cy - 4) y = cy + 4; if (x - cx > 11) x -= 22; if (x - cx < -11) x += 22; if (z - cz > 11) z -= 22; if (z - cz < -11) z += 22; P[i * 3] = x; P[i * 3 + 1] = y; P[i * 3 + 2] = z; }
    dust.geometry.attributes.position.needsUpdate = true;
    // brasas da lareira: sobem do fogo, algumas escapam um pouco para a sala
    const E = embers.geometry.attributes.position.array;
    for (let i = 0; i < EMB; i++) { const q = (t * (0.25 + es[i] * 0.3) + es[i]) % 1, out = es[i] > 0.8 ? 0.9 : 0.12, side = (es[i] - 0.5) * 0.8 + Math.sin(t * 1.3 + i) * 0.1, fw = 0.05 + q * out + Math.sin(t * 2 + i) * 0.04;
      E[i * 3] = FIRE.x + FIREN.x * fw + FIRET.x * side; E[i * 3 + 1] = 0.25 + q * (es[i] > 0.8 ? 1.6 : 1.0); E[i * 3 + 2] = FIRE.z + FIREN.z * fw + FIRET.z * side; }
    embers.geometry.attributes.position.needsUpdate = true; embers.material.opacity = 0.75 + 0.25 * Math.sin(t * 9);
    fireGroup.rotation.y = Math.atan2(camera.position.x - FIRE.x, camera.position.z - FIRE.z);
    for (let i = 0; i < propHot.length; i++) { const c = propHot[i]; c.hot += ((hotC === c ? 1 : 0) - c.hot) * Math.min(1, dt * 7); const v = 0.04 + 0.04 * Math.sin(t * 2.1 + i * 1.7) + c.hot * 0.9; for (const m of c.mats) m.uniforms.uHot.value = v; }
    if (fly && hotC) { hotC = null; canvas.classList.remove("hot"); rotulo.classList.remove("on"); }
    // livros, fendas, certificados
    camera.getWorldDirection(tmp2);
    for (const b of books) {
      const target = b.open ? 1 : hotC && hotC.data === b ? 0.35 : 0; b.out += (target - b.out) * Math.min(1, dt * 6);
      const fl = b.open ? 1 : 0; b.fly += (fl - b.fly) * Math.min(1, dt * (b.open ? 3.2 : 2.4)); const e = b.fly * b.fly * (3 - 2 * b.fly);
      if (e > 0.002) { la.copy(camera.position).addScaledVector(tmp2, 1.3).add(V3(0, -0.28, 0)); b.g.position.lerpVectors(b.home, la, e); b.g.rotation.y = b.homeR + (faceTo(b.g.position.x, b.g.position.z, camera.position.x, camera.position.z) - b.homeR) * e; }
      else if (b.shelf) { b.g.position.copy(b.home).add(V3(b.nx * b.out * 0.28, b.out * 0.05, b.nz * b.out * 0.28)); b.g.rotation.y = b.homeR; }
      else { b.g.position.copy(b.home).add(V3(0, Math.sin(t * 1.3 + b.ph) * 0.05 + b.out * 0.12, 0)); b.g.rotation.y = b.homeR + Math.sin(t * 0.7 + b.ph) * 0.06; }
      b.body.rotation.x = -b.out * 0.12 + Math.sin(t * 0.9 + b.ph) * 0.03;
      b.mats.forEach((m) => { m.uniforms.uHot.value = Math.max(b.out, e); m.uniforms.uMatch.value = b.match; });
      b.halo.material.opacity = 0.3 + 0.14 * Math.sin(t * 2.2 + b.ph) + b.out * 0.3 + b.match * 0.45;
    }
    for (let k = 0; k < visitorBooks.length; k++) { const b = visitorBooks[k], n = visitorBooks.length, a = t * 0.12 + k / n * Math.PI * 2, hv = hotC && hotC.data === b ? 1 : 0; b.out += (hv - b.out) * Math.min(1, dt * 6);
      b.g.position.set(Math.cos(a) * 2.7, TOPY + 1.7 + Math.sin(t * 0.8 + k) * 0.18 + b.out * 0.15, Math.sin(a) * 2.7); b.g.rotation.y = faceTo(b.g.position.x, b.g.position.z, camera.position.x, camera.position.z); b.mats.forEach((m) => (m.uniforms.uHot.value = b.out)); }
    seal.rotation.y = t * 0.45; seal.position.y = TOPY + 2.1 + Math.sin(t * 0.9) * 0.08; sealHalo.position.copy(seal.position); sealHalo.material.opacity = 0.45 + 0.15 * Math.sin(t * 1.4) + (hotC && hotC.kind === "fim" ? 0.3 : 0);
    // livros voando pelo vão
    for (const b of flyers) { const a = b.ph + t * b.sp, y = b.f * FH + b.h + Math.sin(t * 0.6 + b.ph) * 0.4; b.g.position.set(Math.cos(a) * b.r, y, Math.sin(a) * b.r); b.g.rotation.set(0.25 * Math.sin(t + b.ph), -a + (b.sp > 0 ? 0 : Math.PI), 0.2 * Math.sin(t * 0.8 + b.ph)); const fl = 0.35 + 0.55 * (0.5 + 0.5 * Math.sin(t * b.fl + b.ph)); b.L.rotation.z = fl; b.R.rotation.z = -fl; }
    // velas flutuando
    { const P = candles.flames.geometry.attributes.position.array; for (let i = 0; i < candles.length; i++) { const c = candles[i]; c.m.position.y = c.y + Math.sin(t * 0.7 + c.ph) * 0.08; P[i * 3] = c.m.position.x; P[i * 3 + 1] = c.m.position.y + 0.17 + Math.sin(t * 13 + c.ph) * 0.006; P[i * 3 + 2] = c.m.position.z; } candles.flames.geometry.attributes.position.needsUpdate = true; candles.flames.material.size = 0.26 + 0.03 * Math.sin(t * 17); }
    // runas: acendem perto da câmera
    for (const rc of runeCircles) { const near = camera.position.distanceTo(rc.m.position) < 9 && Math.abs(camera.position.y - rc.al.y - 1.8) < 3 ? 1 : 0; rc.on += (near - rc.on) * Math.min(1, dt * 2); rc.m.material.uniforms.uOn.value = rc.on; rc.m.rotation.z = t * 0.05; }
    // bolhas e vapor da alquimia
    if (bubbleSrc.length && camera.position.distanceTo(CAUL) < 22) { const P = bubbles.geometry.attributes.position.array, C = bubbles.geometry.attributes.color.array, srcs = [{ p: CAUL.clone().add(V3(0, 0.85, 0)), c: new T.Color("#5CFF8A"), w: 0.4 }].concat(bubbleSrc);
      for (let i = 0; i < NBUB; i++) { const sI = i % srcs.length, sr = srcs[sI], q = (t * (0.25 + bubS[i] * 0.35) + bubS[i]) % 1, w = sr.w || 0.05; P[i * 3] = sr.p.x + Math.sin(bubS[i] * 40 + t) * w * (0.4 + q); P[i * 3 + 1] = sr.p.y + q * (sI === 0 ? 1.4 : 0.6); P[i * 3 + 2] = sr.p.z + Math.cos(bubS[i] * 33 + t) * w * (0.4 + q); C[i * 3] = sr.c.r * (1 - q); C[i * 3 + 1] = sr.c.g * (1 - q); C[i * 3 + 2] = sr.c.b * (1 - q); }
      bubbles.geometry.attributes.position.needsUpdate = true; bubbles.geometry.attributes.color.needsUpdate = true; }
    // a poção bebida tinge a torre, e depois volta
    if (brewT > 0) brewT = Math.max(0, brewT - dt);
    { const k = brewC ? Math.min(1, brewT / 1.2) * Math.min(1, (7 - brewT) / 0.8) : 0; U.uAmb.value.copy(AMB0); U.uFog.value.copy(FOG0); if (k > 0) { U.uAmb.value.add(V3(brewC.r, brewC.g, brewC.b).multiplyScalar(0.3 * k)); U.uFog.value.lerp(new T.Color(brewC.r * 0.32, brewC.g * 0.32, brewC.b * 0.32), k * 0.85); } }
    // a porta
    doorOpen.v += (doorOpen.to - doorOpen.v) * Math.min(1, dt * 1.6); doorL.rotation.y = doorBase[0] + doorOpen.v * 1.45; doorR.rotation.y = doorBase[1] - doorOpen.v * 1.45;
    // os portais: o redemoinho, as runas e as faíscas sendo sugadas
    for (const w of portals) {
      if (camera.position.distanceTo(w.pos) > 34) continue;
      const h = hotC && hotC.data === w ? 1 : 0; w.hot += (h - w.hot) * Math.min(1, dt * 5);
      w.vm.uniforms.uHot.value = w.hot; w.rm.uniforms.uHot.value = w.hot; w.halo.material.opacity = 0.55 + 0.12 * Math.sin(t * 1.7 + w.k) + w.hot * 0.35; if (w.floorGlow) w.floorGlow.material.opacity = (0.4 + 0.12 * Math.sin(t * 1.3 + w.k * 2) + w.hot * 0.3) * (w.g.position.y > U.uWave.value ? 1 : 0.05);
      const P = w.sparks.geometry.attributes.position.array, n = w.ss.length;
      for (let i = 0; i < n; i++) { const q = (t * (0.16 + w.ss[i] * 0.2) * (1 + w.hot) + w.ss[i]) % 1, ang = w.ss[i] * 40 + q * 7, rr = (1 - q) * (PW * 0.8); P[i * 3] = Math.cos(ang) * rr; P[i * 3 + 1] = (PJ + PW / 2) * 0.5 + Math.sin(ang) * rr * 1.15; P[i * 3 + 2] = 0.12 + (1 - q) * 0.9; }
      w.sparks.geometry.attributes.position.needsUpdate = true;
    }
    finUpdate(dt, t);
    renderer.setRenderTarget(rt); renderer.render(scene, camera); renderer.setRenderTarget(null); renderer.render(postScene, postCam);
    requestAnimationFrame(frame);
  }

  /* ---------------- a chegada: do lado de fora, a porta fechada; um toque abre e a câmera entra ---------------- */
  const OUTSIDE = { pos: AL(PA, 0, 1.75, OUT + 6.4), tgt: AL(PA, 0, 2.35, OUT - 0.5) };
  const intro = { on: false };
  function showIntro() { intro.on = true; document.body.classList.add("intro"); doorOpen.to = 0; doorOpen.v = 0; cam.pos.copy(OUTSIDE.pos); cam.tgt.copy(OUTSIDE.tgt); cam.yaw = cam.pitch = cam.yawT = cam.pitchT = 0; lookReady = false; fly = null; $("entrar").classList.add("on"); }
  function endIntro() { if (!intro.on) return false; intro.on = false; doorOpen.to = 1; $("entrar").classList.remove("on"); document.body.classList.remove("intro"); return true; }
  function enter() {
    if (!endIntro()) return;
    placeIdx = 0; hist.length = 0; visited.add(0); if (music && !music.paused) fadeTo(0.5, 2000);
    if (reduce) { doorOpen.v = 1; cam.pos.copy(places[0].pose.pos); cam.tgt.copy(places[0].pose.tgt); lookReady = false; label(); renderIndex(); return; }
    fly = { hold: true };
    setTimeout(() => { fly = null; glide([cam.pos.clone(), AL(PA, 0, 1.85, OUT + 1.8), AL(PA, 0, 1.9, PA.d - 0.6), AL(PA, 0, 1.95, -1.4), places[0].pose.pos], places[0].pose.tgt, null, 4.6, 3.0); }, 1050);
    setTimeout(() => { label(); renderIndex(); hint(); }, 1400);
  }
  $("entrar").addEventListener("click", (e) => { e.stopPropagation(); enter(); });
  addEventListener("keydown", (e) => { if (intro.on && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); enter(); } });


  /* ================= o topo e o final ================= */

  /* sons feitos na hora pelo navegador (a música continua sendo o arquivo enviado, intacto) */
  const SFX = (() => {
    let ac = null, out = null, nb = null, wind = null;
    const A = () => { if (!ac) { try { ac = new (window.AudioContext || window.webkitAudioContext)(); out = ac.createGain(); out.gain.value = 0.8; out.connect(ac.destination); } catch (e) { ac = null; } } if (ac && ac.state === "suspended") ac.resume(); return ac; };
    const noise = () => { if (!nb) { nb = ac.createBuffer(1, ac.sampleRate * 2, ac.sampleRate); const d = nb.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; } const s = ac.createBufferSource(); s.buffer = nb; s.loop = true; return s; };
    const env = (g, t0, a, peak, d) => { g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(peak, t0 + a); g.gain.exponentialRampToValueAtTime(0.0001, t0 + a + d); };
    const tone = (f, type, a, peak, d, f2) => { if (!A()) return; const t0 = ac.currentTime, o = ac.createOscillator(), g = ac.createGain(); o.type = type; o.frequency.setValueAtTime(f, t0); if (f2) o.frequency.exponentialRampToValueAtTime(f2, t0 + a + d); o.connect(g).connect(out); env(g, t0, a, peak, d); o.start(t0); o.stop(t0 + a + d + 0.05); };
    const burst = (type, freq, q, a, peak, d, f2) => { if (!A()) return; const t0 = ac.currentTime, s = noise(), f = ac.createBiquadFilter(), g = ac.createGain(); f.type = type; f.frequency.setValueAtTime(freq, t0); if (f2) f.frequency.exponentialRampToValueAtTime(f2, t0 + a + d); f.Q.value = q; s.connect(f).connect(g).connect(out); env(g, t0, a, peak, d); s.start(t0); s.stop(t0 + a + d + 0.05); };
    return {
      puff: () => burst("lowpass", 900, 0.7, 0.01, 0.14, 0.32, 300),
      crack: () => { burst("highpass", 3200, 0.8, 0.003, 0.2, 0.18); tone(1500, "sine", 0.005, 0.05, 0.5, 220); },
      close: () => { tone(600, "sine", 0.01, 0.05, 0.4, 90); burst("bandpass", 1800, 2, 0.005, 0.06, 0.25); },
      chord: () => { [110, 164.8, 220, 277.2].forEach((f, i) => tone(f, "sine", 0.6 + i * 0.1, 0.05, 4.5)); },
      bell: () => { tone(880, "sine", 0.005, 0.05, 2.8); tone(1318.5, "sine", 0.005, 0.025, 2.2); },
      whoosh: () => burst("bandpass", 380, 1.2, 0.05, 0.16, 0.45, 1700),
      thud: () => { tone(62, "sine", 0.008, 0.55, 1.3, 28); burst("lowpass", 220, 0.8, 0.005, 0.3, 0.6); },
      creak: () => { if (!A()) return; const t0 = ac.currentTime, o = ac.createOscillator(), f = ac.createBiquadFilter(), g = ac.createGain(), l = ac.createOscillator(), lg = ac.createGain(); o.type = "sawtooth"; o.frequency.value = 85; l.frequency.value = 7; lg.gain.value = 22; l.connect(lg).connect(o.frequency); f.type = "bandpass"; f.frequency.value = 650; f.Q.value = 4; o.connect(f).connect(g).connect(out); env(g, t0, 0.15, 0.06, 1.4); o.start(t0); l.start(t0); o.stop(t0 + 1.7); l.stop(t0 + 1.7); },
      owl: () => { setTimeout(() => tone(420, "sine", 0.05, 0.04, 0.35, 380), 400); setTimeout(() => tone(400, "sine", 0.05, 0.035, 0.5, 360), 950); },
      wind: (v) => { if (!A()) return; if (!wind) { const s = noise(), f = ac.createBiquadFilter(), g = ac.createGain(); f.type = "bandpass"; f.Q.value = 0.6; g.gain.value = 0; s.connect(f).connect(g).connect(out); s.start(); wind = { s, f, g }; } const t0 = ac.currentTime; wind.g.gain.setTargetAtTime(Math.max(0, v) * 0.3, t0, 0.2); wind.f.frequency.setTargetAtTime(260 + Math.max(0, v) * 1500, t0, 0.2); },
    };
  })();

  /* ---------------- o topo: acima das nuvens ---------------- */
  const FCOL = ["#FFC27A", "#C0303A", "#45B079", "#5CC8D8", "#A8D0F0", "#F0DEA8", "#FFFFFF"];
  // o mar de nuvens em volta da torre, iluminado pela lua
  const clouds = new T.Mesh(new T.RingGeometry(RO + 2, 185, 96, 1), new T.ShaderMaterial({ uniforms: { uTime: U.uTime }, transparent: true, depthWrite: false, fog: false,
    vertexShader: "varying vec3 vP; void main(){ vP = (modelMatrix * vec4(position, 1.0)).xyz; gl_Position = projectionMatrix * viewMatrix * vec4(vP, 1.0); }",
    fragmentShader: `uniform float uTime; varying vec3 vP;
      float h(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      float n(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f); return mix(mix(h(i), h(i + vec2(1, 0)), f.x), mix(h(i + vec2(0, 1)), h(i + vec2(1, 1)), f.x), f.y); }
      void main(){ vec2 p = vP.xz * 0.035 + vec2(uTime * 0.012, uTime * 0.006); float v = n(p) * 0.5 + n(p * 2.1) * 0.3 + n(p * 4.3) * 0.2;
        float d = length(vP.xz); float a = smoothstep(0.38, 0.75, v) * smoothstep(185.0, 90.0, d) * smoothstep(RO_ + 2.0, RO_ + 9.0, d);
        vec3 c = mix(vec3(0.08, 0.1, 0.17), vec3(0.42, 0.46, 0.6), smoothstep(0.5, 0.95, v));
        gl_FragColor = vec4(c, a * 0.92); }`.replace(/RO_/g, RO.toFixed(1)) }));
  clouds.rotation.x = -Math.PI / 2; clouds.position.y = TOPY - 6.5; clouds.renderOrder = 1; scene.add(clouds);
  // a lua, grande e baixa
  const MOONDIR = V3(Math.cos(200 * Math.PI / 180), 0.2, Math.sin(200 * Math.PI / 180)).normalize();
  const moon = new T.Mesh(new T.CircleGeometry(9, 48), new T.ShaderMaterial({ fog: false, depthWrite: false, uniforms: {}, vertexShader: "varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }",
    fragmentShader: `varying vec2 vUv; float h(vec2 p){ return fract(sin(dot(p, vec2(12.9, 78.2))) * 43758.5); }
      void main(){ vec2 p = vUv - 0.5; float r = length(p) * 2.0; float cr = 0.0; for (int i = 0; i < 9; i++) { vec2 c = vec2(h(vec2(float(i), 1.0)), h(vec2(float(i), 2.0))) - 0.5; cr += smoothstep(0.12, 0.0, length(p - c * 0.7)) * 0.18; }
        vec3 col = vec3(0.92, 0.9, 0.84) * (1.0 - cr) * (0.82 + 0.18 * smoothstep(1.0, 0.0, r)); gl_FragColor = vec4(col, smoothstep(1.0, 0.96, r)); }`, transparent: true }));
  moon.position.copy(MOONDIR).multiplyScalar(150).add(V3(0, TOPY, 0)); moon.lookAt(0, TOPY, 0); scene.add(moon);
  { const mh = new T.Sprite(new T.SpriteMaterial({ map: glowTex, color: 0xb8c6e8, transparent: true, opacity: 0.5, depthWrite: false, blending: T.AdditiveBlending, fog: false })); mh.scale.set(70, 70, 1); mh.position.copy(moon.position); scene.add(mh); }
  // a esfera armilar em volta do selo: anéis de latão girando, cada um num eixo
  const armil = new T.Group(); armil.position.copy(seal.position); scene.add(armil);
  const rings = [1.25, 1.5, 1.78].map((r, i) => { const g = new T.Group(); const m = new T.Mesh(new T.TorusGeometry(r, 0.022, 8, 96), new T.MeshBasicMaterial({ color: "#C9A867" })); g.add(m); for (let k = 0; k < 2 + i; k++) { const b = new T.Mesh(new T.SphereGeometry(0.06 + 0.02 * i, 12, 8), new T.MeshBasicMaterial({ color: ["#FFD9A0", "#A8C8FF", "#FFB0A0"][i] })); const a = k / (2 + i) * Math.PI * 2; b.position.set(Math.cos(a) * r, Math.sin(a) * r, 0); g.add(b); } propize(g, { emit: 0.35, emitC: "#FFD9A0" }); armil.add(g); return g; });
  // as sete esferas dos andares, orbitando o selo; as visitadas brilham
  const visited = new Set();
  const orbs = FLOORS.map((fl, k) => {
    const m = new T.Mesh(new T.SphereGeometry(0.17, 16, 12), new T.MeshBasicMaterial({ color: FCOL[k] })); scene.add(m);
    const h = new T.Sprite(new T.SpriteMaterial({ map: glowTex, color: new T.Color(FCOL[k]), transparent: true, opacity: 0.6, depthWrite: false, blending: T.AdditiveBlending })); h.scale.set(0.62, 0.62, 1); m.add(h);
    const o = { m, h, f: k, hot: 0 }; clickable(m, "andar", o); return o;
  });
  // o telescópio de latão no parapeito, e a constelação que ele mostra
  const TELA = landA(NFLOORS - 1) + Math.PI * 0.95, TELP = polarY(TELA, RO - 1.3, TOPY);
  const tele = new T.Group(); { const brass = new T.MeshBasicMaterial({ color: "#A8823E" }), wood = new T.MeshBasicMaterial({ color: "#3A251A" });
    for (let k = 0; k < 3; k++) { const a = k / 3 * Math.PI * 2, leg = new T.Mesh(new T.CylinderGeometry(0.025, 0.03, 1.35, 6), wood); leg.position.set(Math.cos(a) * 0.28, 0.62, Math.sin(a) * 0.28); leg.rotation.set(Math.sin(a) * 0.22, 0, -Math.cos(a) * 0.22); tele.add(leg); }
    const tube = new T.Group(); const t1 = new T.Mesh(new T.CylinderGeometry(0.09, 0.07, 1.5, 16), brass); t1.rotation.z = Math.PI / 2; tube.add(t1); const t2 = new T.Mesh(new T.CylinderGeometry(0.11, 0.11, 0.08, 16), brass); t2.rotation.z = Math.PI / 2; t2.position.x = 0.76; tube.add(t2);
    tube.position.y = 1.35; tube.rotation.z = 0.6; tele.add(tube); propize(tele, { emit: 0.12, emitC: "#FFD9A0" }); }
  tele.position.copy(TELP); tele.rotation.y = -TELA + Math.PI; scene.add(tele); clickable(tele, "telescopio", null, ["O telescópio", "Olhar o céu"]);
  const CONSTD = V3(-Math.cos(TELA) * 0.45, 0.89, -Math.sin(TELA) * 0.45).normalize();
  const constel = (() => { const c = document.createElement("canvas"); c.width = 96; c.height = 256; const g = c.getContext("2d"); g.fillStyle = "#000"; g.fillRect(0, 0, 96, 256); g.fillStyle = "#fff"; g.textAlign = "center"; g.font = "800 72px 'Shippori Mincho', serif"; ["ラ", "テ", "ケ"].forEach((ch, i) => g.fillText(ch, 48, 72 + i * 80));
    const d = g.getImageData(0, 0, 96, 256).data, pts = []; for (let y = 0; y < 256; y += 5) for (let x = 0; x < 96; x += 5) if (d[(y * 96 + x) * 4] > 140 && Math.random() < 0.55) pts.push([x / 96 - 0.5, 0.5 - y / 256]);
    const geo = new T.BufferGeometry(), P = new Float32Array(pts.length * 3), side = V3().crossVectors(CONSTD, V3(0, 1, 0)).normalize(), up = V3().crossVectors(side, CONSTD).normalize(), ctr = CONSTD.clone().multiplyScalar(80).add(V3(0, TOPY, 0));
    pts.forEach(([x, y], i) => { const p = ctr.clone().addScaledVector(side, x * 28).addScaledVector(up, y * 64); P.set([p.x, p.y, p.z], i * 3); }); geo.setAttribute("position", new T.BufferAttribute(P, 3)); geo.setDrawRange(0, 0);
    const m = new T.Points(geo, new T.PointsMaterial({ map: glowTex, color: 0xcfe0ff, size: 1.4, transparent: true, opacity: 0.95, depthWrite: false, blending: T.AdditiveBlending, fog: false })); m.frustumCulled = false; scene.add(m); return { m, n: pts.length, v: 0, on: false }; })();
  let teleOn = false;
  function lookTele() { teleOn = true; constel.on = true; closePanel(true); glide([cam.pos.clone(), tele.position.clone().add(V3(0, 1.62, 0)).addScaledVector(CONSTD.clone().setY(0).normalize(), -0.4)], tele.position.clone().add(V3(0, 1.62, 0)).addScaledVector(CONSTD, 40), null, 2.0); toast("O telescópio", "Uma constelação", "Lá em cima, as estrelas escrevem o selo."); }
  // estrelas cadentes, de vez em quando
  const meteor = new T.Mesh(new T.PlaneGeometry(14, 0.16), new T.MeshBasicMaterial({ map: (() => { const c = document.createElement("canvas"); c.width = 256; c.height = 8; const g = c.getContext("2d"); const gr = g.createLinearGradient(0, 0, 256, 0); gr.addColorStop(0, "rgba(255,255,255,0)"); gr.addColorStop(0.85, "rgba(220,235,255,0.9)"); gr.addColorStop(1, "rgba(255,255,255,1)"); g.fillStyle = gr; g.fillRect(0, 0, 256, 8); return new T.CanvasTexture(c); })(), transparent: true, depthWrite: false, blending: T.AdditiveBlending, fog: false }));
  meteor.visible = false; scene.add(meteor); const met = { t: 4 + Math.random() * 6, run: -1, a: V3(), b: V3() };
  // uma estrela nova bem em cima da torre a cada volta completa (guardado só neste navegador)
  let voltas = 0; try { voltas = +localStorage.getItem("biblioteca-voltas") || 0; } catch (e) { /* sem storage */ }
  const loopStars = [];
  function addLoopStar(i) { const s = new T.Sprite(new T.SpriteMaterial({ map: glowTex, color: 0xdfe8ff, transparent: true, opacity: 0.95, depthWrite: false, blending: T.AdditiveBlending, fog: false })); const a = i * 2.4, r = 6 + i * 3.5; s.position.set(Math.cos(a) * r, TOPY + 150, Math.sin(a) * r); s.scale.set(5, 5, 1); scene.add(s); loopStars.push(s); }
  for (let i = 0; i < Math.min(30, voltas); i++) addLoopStar(i);

  /* ---------------- o final ---------------- */
  const fin = { stage: null, t: 0, ask: 0, wf: NFLOORS, shown: -1 };
  const NOW = () => performance.now();
  function finale() {
    if (fin.stage) return;
    if (NOW() - fin.ask > 5000) { fin.ask = NOW(); SFX.bell(); toast("O topo", "Terminar a visita?", "Toque no selo de novo para terminar."); return; }
    fin.ask = 0; startFinale();
  }
  function startFinale() {
    closeLivro(); closePanel(true); closeIndex(); teleOn = false; constel.on = false;
    fin.stage = "apagar"; fin.t = 0; fin.wf = -NBELOW - 1; document.body.classList.add("fim"); hotC = null; rotulo.classList.remove("on");
    SFX.crack(); SFX.chord(); if (music && !music.paused) fadeTo(0.28, 2500);
  }
  // as lanternas da tela infinita: um recado em cada (no máximo 40)
  const lanG = new T.Group(); lanG.visible = false; scene.add(lanG); const lanterns = []; let lanList = [];
  function wrap(g, text, w) { const words = String(text || "").split(/\s+/), out = []; let line = ""; for (const wd of words) { const t = line ? line + " " + wd : wd; if (g.measureText(t).width > w && line) { out.push(line); line = wd; } else line = t; } if (line) out.push(line); return out; }
  function lanternTex(e) {
    const c = document.createElement("canvas"); c.width = 256; c.height = 320; const g = c.getContext("2d");
    const gr = g.createRadialGradient(128, 160, 20, 128, 160, 170); gr.addColorStop(0, "rgba(255,226,170,1)"); gr.addColorStop(0.7, "rgba(240,150,70,0.95)"); gr.addColorStop(1, "rgba(160,60,20,0.9)");
    g.fillStyle = gr; g.beginPath(); g.moveTo(40, 34); g.quadraticCurveTo(10, 160, 40, 286); g.lineTo(216, 286); g.quadraticCurveTo(246, 160, 216, 34); g.closePath(); g.fill();
    g.strokeStyle = "rgba(120,50,20,0.35)"; g.lineWidth = 2; for (let k = 1; k < 6; k++) { const y = 34 + k * 42; g.beginPath(); g.moveTo(22, y); g.lineTo(234, y); g.stroke(); }
    g.fillStyle = "#4a2410"; g.fillRect(36, 22, 184, 14); g.fillRect(36, 284, 184, 14);
    if (e) { g.fillStyle = "#3a1a08"; g.textAlign = "center"; g.font = "700 24px 'Cormorant Garamond', serif"; g.fillText((e.nome || "Visitante").slice(0, 18), 128, 76); g.font = "500 18px 'Cormorant Garamond', serif"; wrap(g, e.recado, 170).slice(0, 7).forEach((l, i) => g.fillText(l, 128, 108 + i * 24)); }
    const t = new T.CanvasTexture(c); return t;
  }
  function buildLanterns() {
    lanterns.forEach((l) => { lanG.remove(l.m); l.m.material.map.dispose(); l.m.material.dispose(); }); lanterns.length = 0;
    const list = lanList.length ? lanList.slice(0, 40) : new Array(12).fill(null);
    list.forEach((e, i) => {
      const m = new T.Mesh(new T.PlaneGeometry(1.5, 1.88), new T.MeshBasicMaterial({ map: lanternTex(e), transparent: true, depthWrite: false, fog: false }));
      const glow = new T.Sprite(new T.SpriteMaterial({ map: glowTex, color: 0xffa050, transparent: true, opacity: 0.55, depthWrite: false, blending: T.AdditiveBlending, fog: false })); glow.scale.set(3.4, 3.4, 1); m.add(glow);
      lanG.add(m); lanterns.push({ m, e, a: (Math.random() - 0.5) * 2.4, r: 6 + Math.random() * 13, y: -6 + Math.random() * 30, sp: 0.35 + Math.random() * 0.4, ph: Math.random() * 6, hot: 0 });
    });
  }
  // a placa do QR: estrelas se juntam e formam a placa com o código para deixar um recado
  const qrUrl = () => location.origin + "/biblioteca#recado";
  const qrCanvas = document.createElement("canvas"); qrCanvas.width = 512; qrCanvas.height = 640; const qrTex = new T.CanvasTexture(qrCanvas);
  function drawQR() {
    const g = qrCanvas.getContext("2d"); g.clearRect(0, 0, 512, 640);
    const gr = g.createRadialGradient(256, 300, 60, 256, 300, 380); gr.addColorStop(0, "rgba(255,246,226,1)"); gr.addColorStop(1, "rgba(236,214,170,1)");
    g.fillStyle = gr; g.beginPath(); g.roundRect ? g.roundRect(16, 16, 480, 608, 28) : g.rect(16, 16, 480, 608); g.fill();
    g.strokeStyle = "#B88A40"; g.lineWidth = 5; g.stroke();
    g.fillStyle = "#3A2412"; g.textAlign = "center"; g.font = "600 40px 'Shippori Mincho', serif"; g.fillText("Deixe um recado", 256, 86);
    g.font = "500 17px 'Geist Mono', monospace"; g.fillStyle = "#7A5A30"; g.fillText("aponte a câmera do celular", 256, 118);
    const draw = () => { try { const q = window.qrcode(0, "M"); q.addData(qrUrl()); q.make(); const n = q.getModuleCount(), S = 340, cs = S / n, x0 = 256 - S / 2, y0 = 148; g.fillStyle = "#fff"; g.fillRect(x0 - 14, y0 - 14, S + 28, S + 28); g.fillStyle = "#1A120A"; for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (q.isDark(r, c)) g.fillRect(x0 + c * cs, y0 + r * cs, cs + 0.5, cs + 0.5); } catch (e) { g.font = "500 20px 'Geist Mono', monospace"; g.fillStyle = "#3A2412"; g.fillText(location.host + "/biblioteca#recado", 256, 320); } qrTex.needsUpdate = true; };
    g.font = "500 16px 'Geist Mono', monospace"; g.fillStyle = "#7A5A30"; g.fillText(location.host + "/biblioteca#recado", 256, 540);
    g.font = "italic 600 22px 'Cormorant Garamond', serif"; g.fillStyle = "#5A3A20"; g.fillText("Fernando Rateke · Portfólio 2026", 256, 588);
    if (window.qrcode) draw(); else { const el = document.createElement("script"); el.src = "/biblioteca/vendor/qrcode.min.js"; el.onload = draw; el.onerror = draw; document.head.appendChild(el); }
    qrTex.needsUpdate = true;
  }
  const qrPlate = new T.Mesh(new T.PlaneGeometry(2.0, 2.5), new T.MeshBasicMaterial({ map: qrTex, transparent: true, opacity: 0, depthWrite: false, fog: false })); qrPlate.visible = false; qrPlate.renderOrder = 6; scene.add(qrPlate);
  const qrGlow = new T.Sprite(new T.SpriteMaterial({ map: glowTex, color: 0xffd9a0, transparent: true, opacity: 0, depthWrite: false, blending: T.AdditiveBlending, fog: false })); qrGlow.scale.set(5.5, 6.5, 1); qrPlate.add(qrGlow); qrGlow.position.z = -0.05;
  const NQS = 420, qsGeo = new T.BufferGeometry(), qsP = new Float32Array(NQS * 3), qsFrom = [], qsTo = [];
  for (let i = 0; i < NQS; i++) { const u = Math.random(), v = Math.random(); qsTo.push(V3((u - 0.5) * 2.0, (v - 0.5) * 2.5, 0)); const d = V3(Math.random() - 0.5, Math.random() * 0.8 + 0.1, Math.random() - 0.5).normalize().multiplyScalar(40 + Math.random() * 30); qsFrom.push(d); }
  qsGeo.setAttribute("position", new T.BufferAttribute(qsP, 3)); const qStars = new T.Points(qsGeo, new T.PointsMaterial({ map: glowTex, color: 0xfff0d0, size: 0.16, transparent: true, opacity: 0, depthWrite: false, blending: T.AdditiveBlending, fog: false })); qStars.frustumCulled = false; qStars.visible = false; scene.add(qStars);
  // páginas soltas no vão: só aparecem na queda, e parecem subir porque a câmera cai mais rápido
  const pages = []; { const mat = new T.MeshBasicMaterial({ color: "#E8DCC0", side: T.DoubleSide }); for (let i = 0; i < 46; i++) { const m = new T.Mesh(new T.PlaneGeometry(0.24, 0.32), mat); const a = Math.random() * Math.PI * 2, r = 0.8 + Math.random() * 2.6; m.position.set(Math.cos(a) * r, -NBELOW * FH + Math.random() * (TOPY + NBELOW * FH + 10), Math.sin(a) * r); m.visible = false; scene.add(m); pages.push({ m, ph: Math.random() * 6 }); } }
  const credEl = $("creditos"), nomeEl = $("quedaNome");
  const CREDITOS = ["Fernando Rateke · Portfólio 2026", "Música: Dawn of the Doors", "Modelos 3D: dos autores dos pacotes usados, adaptados para a torre", "Obrigado por subir até aqui"];
  let credI = 0, credT = 0;
  function startInfinite() {
    fin.stage = "infinito"; fin.t = 0; lanG.visible = true; buildLanterns(); drawQR(); qrPlate.visible = true; qStars.visible = true; SFX.wind(0.12);
    credEl.classList.add("on"); credI = 0; credT = 0; credEl.textContent = CREDITOS[0];
  }
  function startFall() {
    if (fin.stage !== "infinito") return;
    fin.stage = "queda"; fin.t = 0; fin.shown = NFLOORS; U.uWave.value = -1e5; lanG.visible = false; qrPlate.visible = false; qStars.visible = false; credEl.classList.remove("on");
    pages.forEach((p) => (p.m.visible = true)); fin.y0 = cam.pos.y; { const hp = halos.geometry.attributes.position.array; TLAMPS.forEach((q, i) => hp.set([q.x, q.y, q.z], i * 3)); halos.geometry.attributes.position.needsUpdate = true; } if (music && !music.paused) fadeTo(0.12, 3000); SFX.whoosh();
  }
  function restoreAll() {
    U.uWave.value = -1e5; portals.forEach((w) => w.g.scale.setScalar(1)); flyers.forEach((b) => (b.back = 0)); pages.forEach((p) => (p.m.visible = false));
    lanG.visible = false; qrPlate.visible = false; qStars.visible = false; credEl.classList.remove("on"); nomeEl.classList.remove("on");
    camera.up.set(0, 1, 0); post.material.uniforms.uStreak.value = 0; post.material.uniforms.uFlash.value.set(0, 0, 0); camera.fov = baseFov * zoomK; camera.updateProjectionMatrix();
    { const hp = halos.geometry.attributes.position.array; TLAMPS.forEach((p, i) => hp.set([p.x, p.y, p.z], i * 3)); halos.geometry.attributes.position.needsUpdate = true; }
    visited.clear(); document.body.classList.remove("fim"); fin.stage = null; hotC = null; SFX.wind(0);
  }
  function wake() { // a volta: no escuro, a porta range; a imagem volta do lado de fora
    voltas++; try { localStorage.setItem("biblioteca-voltas", String(voltas)); } catch (e) { /* sem storage */ }
    if (loopStars.length < 30) addLoopStar(loopStars.length);
    restoreAll(); hist.length = 0; placeIdx = 0; showIntro(); fin.stage = "clarear"; fin.t = 0; SFX.creak(); SFX.owl(); if (music && !music.paused) fadeTo(0.32, 2500);
  }
  function finClick(p) { // na tela infinita: lanterna lê, a placa abre o recado, o resto recomeça
    rc.setFromCamera(p, camera);
    const h = rc.intersectObjects([qrPlate].concat(lanterns.map((l) => l.m)), false)[0];
    if (h && h.object === qrPlate) { formRecado(); return; }
    if (h) { const l = lanterns.find((x) => x.m === h.object); if (l && l.e) { toast("Recado", l.e.nome || "Visitante", l.e.recado || ""); return; } }
    startFall();
  }
  function finUpdate(dt, t) {
    // o topo vive mesmo fora do final
    armil.position.copy(seal.position); rings[0].rotation.set(t * 0.21, t * 0.13, 0); rings[1].rotation.set(Math.PI / 2 + t * 0.09, 0, t * 0.17); rings[2].rotation.set(0.6, t * 0.07, Math.PI / 3 + t * 0.11);
    orbs.forEach((o, k) => { const a = t * 0.18 + k / orbs.length * Math.PI * 2, hv = hotC && hotC.data === o ? 1 : 0; o.hot += (hv - o.hot) * Math.min(1, dt * 6); o.m.position.set(Math.cos(a) * 3.9, TOPY + 3.5 + Math.sin(t * 0.7 + k) * 0.15, Math.sin(a) * 3.9); const lit = visited.has(k) ? 1 : 0.22; o.h.material.opacity = (0.18 + 0.4 * lit) * (1 + o.hot * 0.6); o.m.scale.setScalar(1 + o.hot * 0.35 + lit * 0.15); });
    if (constel.on) constel.v = Math.min(constel.n, constel.v + dt * constel.n / 4); else constel.v = Math.max(0, constel.v - dt * constel.n / 1.5); constel.m.geometry.setDrawRange(0, Math.floor(constel.v));
    met.t -= dt; if (met.t <= 0 && met.run < 0 && camera.position.y > TOPY - 4) { met.run = 0; met.t = 5 + Math.random() * 8; const a = Math.random() * Math.PI * 2; met.a.set(Math.cos(a) * 120, TOPY + 60 + Math.random() * 50, Math.sin(a) * 120); met.b.copy(met.a).add(V3(Math.cos(a + 1.9) * 70, -30, Math.sin(a + 1.9) * 70)); meteor.visible = true; }
    if (met.run >= 0) { met.run += dt / 0.9; meteor.position.lerpVectors(met.a, met.b, met.run); meteor.lookAt(camera.position); const d = V3().subVectors(met.b, met.a).project(camera); meteor.material.opacity = Math.sin(Math.min(1, met.run) * Math.PI); if (met.run >= 1) { met.run = -1; meteor.visible = false; } }
    loopStars.forEach((s, i) => (s.material.opacity = 0.7 + 0.3 * Math.sin(t * 1.3 + i)));
    if (!fin.stage) return;
    fin.t += dt;
    const PU = post.material.uniforms;
    if (fin.stage === "apagar") {
      // a onda de escuro sobe pelo vão, andar por andar; os portais fecham, os livros voltam para as estantes
      const h = -NBELOW * FH + (TOPY + 1 + NBELOW * FH) * sstep(0, 5, fin.t); U.uWave.value = h;
      const f = Math.floor((h - 3) / FH); if (f > fin.wf) { fin.wf = f; if (f >= 0 && f < NFLOORS) SFX.puff(); }
      for (const w of portals) { const k = Math.max(0, Math.min(1, (h - w.al.y - 1.5) / 3)); if (k > 0 && w.g.scale.x > 0.999 && !w.closing) { w.closing = 1; SFX.close(); } w.g.scale.setScalar(Math.max(0.001, 1 - k)); if (k <= 0) w.closing = 0; }
      for (const b of flyers) { if (b.g.position.y < h) b.back = Math.min(1, (b.back || 0) + dt * 0.9); }
      { const hp = halos.geometry.attributes.position.array; TLAMPS.forEach((p, i) => { if (p.y < h) hp[i * 3 + 1] = -999; }); halos.geometry.attributes.position.needsUpdate = true; }
      sealHalo.material.opacity = 0.7 + 0.3 * Math.sin(t * 6); seal.scale.setScalar(1 + 0.05 * Math.sin(t * 9));
      if (fin.t > 5.2) { fin.stage = "subir"; fin.t = 0; seal.scale.setScalar(1);
        glide([cam.pos.clone(), V3(5, TOPY + 6, 5), V3(3, TOPY + 11, 3)], V3(0, TOPY - 14, 0), () => { glide([cam.pos.clone(), V3(0.5, TOPY + 12, 0.5)], V3(0, TOPY + 34, 22), () => startInfinite(), 3.2); }, 3.2); }
    }
    if (fin.stage === "infinito") {
      // o céu desliza devagar; as lanternas sobem; as estrelas viram a placa do QR
      const d = V3().subVectors(cam.tgt, cam.pos); d.applyAxisAngle(V3(0, 1, 0), dt * 0.025); cam.tgt.copy(cam.pos).add(d);
      camera.getWorldDirection(tmp2); const up = V3(0, 1, 0).applyQuaternion(camera.quaternion);
      for (const l of lanterns) { const hv = hotC && hotC.data === l ? 1 : 0; l.hot += (hv - l.hot) * Math.min(1, dt * 5); l.y += l.sp * dt * (1 - l.hot); if (l.y > 24) { l.y = -6; l.a = (Math.random() - 0.5) * 2.4; } const yw = Math.atan2(tmp2.z, tmp2.x) + l.a; l.m.position.set(cam.pos.x + Math.cos(yw) * l.r, cam.pos.y + l.y + Math.sin(t * 0.6 + l.ph) * 0.2, cam.pos.z + Math.sin(yw) * l.r); l.m.lookAt(camera.position); l.m.scale.setScalar(1 + l.hot * 0.5); }
      const ctr = camera.position.clone().addScaledVector(tmp2, 6).addScaledVector(up, 0.15); qrPlate.position.copy(ctr); qrPlate.quaternion.copy(camera.quaternion);
      const pg = sstep(0.4, 4.5, fin.t), P = qsGeo.attributes.position.array;
      for (let i = 0; i < NQS; i++) { const tp = qsTo[i].clone().applyQuaternion(camera.quaternion).add(ctr), fp = qsFrom[i].clone().add(camera.position), e = pg * pg * (3 - 2 * pg); P[i * 3] = fp.x + (tp.x - fp.x) * e; P[i * 3 + 1] = fp.y + (tp.y - fp.y) * e; P[i * 3 + 2] = fp.z + (tp.z - fp.z) * e; }
      qsGeo.attributes.position.needsUpdate = true; qStars.material.opacity = Math.min(1, fin.t * 0.8) * (1 - sstep(4.2, 5.6, fin.t));
      qrPlate.material.opacity = sstep(3.8, 5.4, fin.t); qrGlow.material.opacity = 0.35 * sstep(3.8, 5.4, fin.t);
      credT += dt; if (credT > 6) { credT = 0; credI = (credI + 1) % CREDITOS.length; credEl.classList.remove("on"); setTimeout(() => { credEl.textContent = CREDITOS[credI]; if (fin.stage === "infinito") credEl.classList.add("on"); }, 900); }
    }
    if (fin.stage === "queda") {
      // a queda, de costas, olhando para cima: a abertura do topo encolhendo lá em cima
      const TF = 13, u = Math.min(1, fin.t / TF), yEnd = -NBELOW * FH - 6, dip = fin.t < 0.7 ? Math.sin(fin.t / 0.7 * Math.PI) * 0.6 : 0;
      const y = fin.y0 - (fin.y0 - yEnd) * Math.pow(u, 2.15) - dip, prevY = cam.pos.y, sp = Math.max(0, (prevY - y) / Math.max(dt, 1e-3));
      const r = 2.3, ang = fin.t * 0.22, sh = Math.min(0.06, sp * 0.0016);
      cam.pos.set(Math.cos(ang) * r + (Math.random() - 0.5) * sh, y, Math.sin(ang) * r + (Math.random() - 0.5) * sh);
      const roll = fin.t * 0.32 + Math.sin(fin.t * 1.3) * 0.15; camera.up.set(Math.cos(roll), 0.0001, Math.sin(roll));
      camera.position.copy(cam.pos); camera.lookAt(cam.pos.x * 0.6, cam.pos.y + 20, cam.pos.z * 0.6);
      camera.fov = baseFov + Math.min(30, sp * 0.85); camera.updateProjectionMatrix();
      PU.uStreak.value = Math.min(1, sp / 26); SFX.wind(Math.min(1, sp / 28));
      const f = Math.floor((y - 2) / FH); if (f < fin.shown && f >= 0 && f < NFLOORS) { fin.shown = f; nomeEl.textContent = FLOORS[f].t; nomeEl.classList.remove("on"); void nomeEl.offsetWidth; nomeEl.classList.add("on"); const c = new T.Color(FCOL[f]); PU.uFlash.value.set(c.r, c.g, c.b).multiplyScalar(0.16); SFX.whoosh(); }
      PU.uFlash.value.multiplyScalar(Math.max(0, 1 - dt * 2.5));
      for (const pg of pages) { pg.m.rotation.set(t * 1.3 + pg.ph, t * 0.9 + pg.ph, Math.sin(t * 2 + pg.ph)); }
      PU.uBlack.value = sstep(0.8, 1.0, u);
      if (u >= 1) { fin.stage = "preto"; fin.t = 0; SFX.thud(); SFX.wind(0); PU.uStreak.value = 0; nomeEl.classList.remove("on"); }
    }
    if (fin.stage === "preto") { PU.uBlack.value = 1; if (fin.t > 1.5) wake(); }
    if (fin.stage === "clarear") { PU.uBlack.value = 1 - sstep(0, 2.4, fin.t); if (fin.t > 2.4) { PU.uBlack.value = 0; fin.stage = null; } }
    // livros voltando para as estantes durante a onda
    for (const b of flyers) if (b.back > 0) { const a = Math.atan2(b.g.position.z, b.g.position.x); b.g.position.lerp(V3(Math.cos(a) * (RO - 0.5), b.g.position.y, Math.sin(a) * (RO - 0.5)), b.back); b.g.scale.setScalar(1.6 * (1 - b.back)); }
    { const P = candles.flames.geometry.attributes.position.array; for (let i = 0; i < candles.length; i++) if (candles[i].y < U.uWave.value) P[i * 3 + 1] = -999; candles.flames.geometry.attributes.position.needsUpdate = true; }
  }

  /* ---------------- abertura ---------------- */
  const fontsReady = document.fonts ? document.fonts.ready.catch(() => null) : Promise.resolve();
  fetch("/biblioteca/atividades.json").then((r) => (r.ok ? r.json() : [])).catch(() => []).then((list) => fontsReady.then(() => list)).then((list) => {
    try { addActivityBooks(list || []); } catch (e) { console.warn("livros", e); }
    loadVisitors();
  });
  renderIndex(); go(0, true); showIntro();
  if (location.hash === "#recado") setTimeout(() => formRecado(), 600);
  requestAnimationFrame(frame);
  setTimeout(() => $("fade").classList.add("gone"), 500);
})();
