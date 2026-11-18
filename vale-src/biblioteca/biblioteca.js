/* Biblioteca Infinita: salas hexagonais que se repetem sem fim, para os lados, para cima e para baixo.
   Tudo é gerado aqui (sem modelos): a sala é uma geometria só, repetida por instâncias; os livros das
   estantes são desenhados no shader; os livros das atividades são objetos de verdade, que brilham e abrem.
   Controles: teclado/mouse, toque (joystick + arrastar) e window.biblioteca (para o controle pelo celular). */
(() => {
  const T = window.THREE;
  if (!T) return;
  const $ = (id) => document.getElementById(id);
  const canvas = $("lib");
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const small = matchMedia("(max-width: 760px)").matches || (navigator.hardwareConcurrency || 8) <= 4;
  const coarse = matchMedia("(pointer: coarse)").matches;

  let renderer;
  try { renderer = new T.WebGLRenderer({ canvas, antialias: !small, powerPreference: "high-performance" }); }
  catch (e) { $("fade").innerHTML = "<p>Este navegador não abre a biblioteca em 3D</p>"; return; }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, small ? 1.4 : 2));
  renderer.setClearColor(0x07080c);
  const scene = new T.Scene();
  const camera = new T.PerspectiveCamera(72, 1, 0.05, 240);

  /* ---------------- medidas da sala ---------------- */
  const R = 7;                       // lado do hexágono (= raio)
  const A = R * Math.sqrt(3) / 2;    // apótema: do centro até a parede
  const C = 2.4;                     // corredor entre duas salas
  const D = 2 * A + C;               // distância entre centros de salas
  const H = 5.4;                     // de um andar ao outro
  const CEIL = 5.0;                  // teto
  const RS = 2.3, RSA = RS * Math.sqrt(3) / 2; // poço central (lado e apótema)
  const DOOR = 1.1, DOORH = 3.2;     // meia largura e altura das portas
  const SHELF_TOP = 4.6;             // até onde vão as estantes
  const ROW = 0.6, BASE = 0.25;      // altura de cada prateleira e do rodapé
  const NR = small ? 3 : 4, NF = small ? 3 : 4; // salas e andares desenhados para cada lado

  const U = {
    uTime: { value: 0 }, uD: { value: D }, uH: { value: H },
    uFog: { value: new T.Color("#080a10") }, uFogD: { value: 0.026 },
  };

  /* luz comum: dois lampiões por sala, a luz fria do poço e a névoa que esconde o fim */
  const COMMON = `
    uniform float uTime, uD, uH, uFogD; uniform vec3 uFog;
    vec3 roomLocal(vec3 w){ return vec3(mod(w.x + uD * 0.5, uD) - uD * 0.5, mod(w.y, uH), w.z); }
    float hexD(vec2 p){ p = abs(p); return max(p.x, dot(p, vec2(0.5, 0.8660254))); }
    vec3 lamps(vec3 w, vec3 n){
      vec3 l = roomLocal(w); vec3 acc = vec3(0.0);
      for (int i = 0; i < 2; i++) {
        vec3 lp = vec3(0.0, 4.05, i == 0 ? 3.75 : -3.75);
        vec3 d = lp - l; float dist = length(d);
        float ndl = max(dot(n, d / dist), 0.0) * 0.7 + 0.3;
        float flick = 0.94 + 0.06 * sin(uTime * 7.0 + float(i) * 2.0 + floor(w.x / uD) * 1.7);
        acc += vec3(1.0, 0.70, 0.40) * ndl * flick * 2.1 / (1.0 + dist * dist * 0.11);
      }
      float r = length(l.xz);
      acc += vec3(0.42, 0.54, 0.78) * 0.32 * exp(-r * 0.55) * (0.6 + 0.4 * n.y * n.y);
      return acc + vec3(0.050, 0.046, 0.055);
    }
    vec3 band(vec3 light){ return mix(light, floor(light * 6.0 + 0.5) / 6.0, 0.28); }
    vec3 fogIt(vec3 c, vec3 w){ float d = length(w - cameraPosition); float f = 1.0 - exp(-pow(d * uFogD, 1.55)); return mix(c, uFog, f); }
    float h1(float n){ return fract(sin(n) * 43758.5453123); }
    float h2(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123); }
  `;
  const INST_VS = (extraDecl, extraBody) => `
    attribute vec3 aCol; attribute float aKind; ${extraDecl}
    varying vec3 vW; varying vec3 vN; varying vec3 vC; varying float vK; varying vec3 vO;
    void main(){
      mat4 m = modelMatrix;
      #ifdef USE_INSTANCING
        m = modelMatrix * instanceMatrix;
      #endif
      vec4 w = m * vec4(position, 1.0);
      vW = w.xyz; vN = normalize(mat3(m) * normal); vC = aCol; vK = aKind; vO = (m * vec4(0.0, 0.0, 0.0, 1.0)).xyz;
      ${extraBody}
      gl_Position = projectionMatrix * viewMatrix * w;
    }`;

  /* ---------------- estrutura: piso, tapete, teto, guarda-corpo, portas, corredor ---------------- */
  const STRUCT_FS = `${COMMON}
    varying vec3 vW; varying vec3 vN; varying vec3 vC; varying float vK; varying vec3 vO;
    void main(){
      vec3 n = normalize(vN); vec3 c = vC; vec3 l = roomLocal(vW);
      if (vK > 2.5) { // lampião: brilha sozinho
        gl_FragColor = vec4(fogIt(c * 1.6, vW), 1.0); return;
      }
      if (vK > 0.5 && vK < 1.5) { // piso de tábuas e um tapete hexagonal em volta do poço
        float pz = vW.z / 0.24; float row = floor(pz); float px = (vW.x + h1(row) * 3.0) / 1.9;
        float seam = smoothstep(0.0, 0.05, fract(pz)) * smoothstep(0.0, 0.02, fract(px));
        c *= (0.82 + 0.3 * h2(vec2(row, floor(px)))) * (0.55 + 0.45 * seam);
        float hd = hexD(l.zx);
        float rug = smoothstep(2.62, 2.66, hd) * (1.0 - smoothstep(4.34, 4.38, hd));
        float border = (1.0 - smoothstep(0.03, 0.05, abs(hd - 2.82))) + (1.0 - smoothstep(0.03, 0.05, abs(hd - 4.18)));
        float motif = step(0.5, fract((atan(l.z, l.x) * 6.0 / 3.14159) * 2.0)) * (1.0 - smoothstep(0.08, 0.12, abs(hd - 3.5)));
        vec3 rugC = mix(vec3(0.36, 0.09, 0.08), vec3(0.24, 0.06, 0.06), motif);
        rugC = mix(rugC, vec3(0.78, 0.58, 0.26), clamp(border, 0.0, 1.0));
        c = mix(c, rugC, rug);
      } else if (vK > 1.5) { // teto em caixotões
        vec2 q = fract(vec2(vW.x, vW.z) / 1.4); float e = min(min(q.x, 1.0 - q.x), min(q.y, 1.0 - q.y));
        c *= 0.62 + 0.38 * smoothstep(0.02, 0.09, e);
      }
      vec3 lit = band(lamps(vW, n));
      gl_FragColor = vec4(fogIt(c * lit, vW), 1.0);
    }`;

  /* ---------------- estantes: os livros são desenhados aqui ---------------- */
  const BOOK_FS = `${COMMON}
    varying vec3 vW; varying vec3 vN; varying vec3 vC; varying float vK; varying vec3 vO; varying vec2 vUv; varying float vTop;
    vec3 pal(float t){
      vec3 c = vec3(0.47, 0.16, 0.13);
      if (t > 0.10) c = vec3(0.34, 0.11, 0.10);
      if (t > 0.20) c = vec3(0.17, 0.28, 0.20);
      if (t > 0.30) c = vec3(0.14, 0.22, 0.34);
      if (t > 0.40) c = vec3(0.63, 0.45, 0.18);
      if (t > 0.50) c = vec3(0.40, 0.28, 0.17);
      if (t > 0.60) c = vec3(0.17, 0.34, 0.34);
      if (t > 0.70) c = vec3(0.29, 0.17, 0.27);
      if (t > 0.80) c = vec3(0.76, 0.68, 0.52);
      if (t > 0.90) c = vec3(0.12, 0.11, 0.10);
      return c;
    }
    void main(){
      vec3 n = normalize(vN); float u = vUv.x, v = vUv.y;
      float seed = vK * 3.17 + floor(vO.x / uD + 0.5) * 13.1 + floor(vO.y / uH + 0.5) * 7.7;
      vec3 wood = vec3(0.30, 0.19, 0.12), woodD = vec3(0.16, 0.10, 0.07);
      vec3 c; float spec = 0.0;
      float post = 1.0 - smoothstep(0.035, 0.045, abs(fract(u / 1.25 + 0.5) - 0.5) * 1.25);
      if (v < BASE_) { c = woodD * (0.8 + 0.2 * smoothstep(0.0, 0.06, BASE_ - v)); }
      else if (v > vTop) { // painel de madeira acima das estantes, com moldura
        c = wood * (0.85 + 0.15 * smoothstep(0.02, 0.06, v - vTop));
        c *= 0.8 + 0.2 * step(0.5, fract(u / 1.25)) * 0.3;
      } else {
        float rv = v - BASE_; float row = floor(rv / ROW_); rv -= row * ROW_;
        float board = 1.0 - smoothstep(0.035, 0.045, rv);
        float cell = 0.034; float ci = floor(u / cell);
        float rs = row + seed * 7.0;
        float st = ci; for (int k = 0; k < 6; k++) { if (h2(vec2(st, rs)) > 0.58) break; st -= 1.0; }
        float en = ci + 1.0; for (int k = 0; k < 6; k++) { if (h2(vec2(en, rs)) > 0.58) break; en += 1.0; }
        float bid = st + rs * 131.0;
        float bx = (u - st * cell) / ((en - st) * cell);
        float bh = ROW_ * (0.58 + 0.33 * h1(bid * 1.7));
        bool empty = h1(bid * 5.31) < 0.05;
        vec3 back = woodD * 0.42 * (0.6 + 0.4 * smoothstep(0.0, ROW_, rv));
        if (rv < 0.045) { c = wood * 1.05; spec = 0.25; }
        else if (empty || rv > bh) { c = back; if (rv > bh && rv < bh + 0.03 && !empty) c *= 0.6; }
        else {
          vec3 bc = pal(h1(bid * 2.3));
          bc *= 0.78 + 0.32 * h1(bid * 9.1);
          float sh = 0.62 + 0.38 * sin(clamp(bx, 0.0, 1.0) * 3.14159);
          float gap = smoothstep(0.0, 0.07, bx) * smoothstep(0.0, 0.07, 1.0 - bx);
          float rel = (rv - 0.045) / (bh - 0.045);
          float gold = 0.0;
          if (h1(bid * 3.1) > 0.35) gold += (1.0 - smoothstep(0.006, 0.012, abs(rel - 0.12))) + (1.0 - smoothstep(0.006, 0.012, abs(rel - 0.88)));
          if (h1(bid * 4.7) > 0.7) gold += (1.0 - smoothstep(0.004, 0.009, abs(rel - 0.2)));
          float label = step(0.62, rel) * step(rel, 0.74) * step(0.18, bx) * step(bx, 0.82) * step(0.55, h1(bid * 6.2));
          bc = mix(bc, vec3(0.84, 0.77, 0.6), label * 0.85);
          bc = mix(bc, vec3(0.86, 0.64, 0.28), clamp(gold, 0.0, 1.0) * 0.9);
          spec = clamp(gold, 0.0, 1.0) * 0.6;
          c = bc * sh * (0.35 + 0.65 * gap);
          c *= 0.82 + 0.18 * smoothstep(0.0, 0.08, rel); // sombra do livro de cima/prateleira
        }
        c = mix(c, wood * 0.9, post);
        // de longe, troca o detalhe pela média (sem chiado)
        float aa = clamp(fwidth(u) / cell - 0.6, 0.0, 1.0);
        c = mix(c, mix(vec3(0.24, 0.15, 0.11), wood, board), aa);
      }
      vec3 lit = band(lamps(vW, n));
      vec3 V = normalize(cameraPosition - vW);
      vec3 col = c * lit + spec * vec3(1.0, 0.8, 0.5) * pow(max(dot(n, V), 0.0), 2.0) * lit * 0.35;
      gl_FragColor = vec4(fogIt(col, vW), 1.0);
    }`.replace(/BASE_/g, BASE.toFixed(3)).replace(/ROW_/g, ROW.toFixed(3));

  const mkMat = (fs, vsDecl = "", vsBody = "") => {
    const m = new T.ShaderMaterial({ uniforms: U, vertexShader: INST_VS(vsDecl, vsBody), fragmentShader: fs, side: T.DoubleSide });
    m.extensions = { derivatives: true };
    return m;
  };
  const structMat = mkMat(STRUCT_FS);
  const bookMat = mkMat(BOOK_FS, "attribute vec2 aUv; attribute float aTop; varying vec2 vUv; varying float vTop;", "vUv = aUv; vTop = aTop;");

  /* ---------------- construtores ---------------- */
  const M = (x = 0, y = 0, z = 0, ry = 0, sx = 1, sy = 1, sz = 1) => new T.Matrix4().compose(new T.Vector3(x, y, z), new T.Quaternion().setFromEuler(new T.Euler(0, ry, 0)), new T.Vector3(sx, sy, sz));
  const alignX = (dx, dz) => Math.atan2(-dz, dx);     // gira para o eixo x local apontar para (dx, dz)
  function Builder() {
    const P = [], N = [], Cc = [], K = [], UV = [], TOP = [];
    return {
      add(geo, m, color, kind = 0) {
        const g = (geo.index ? geo.toNonIndexed() : geo.clone()); g.applyMatrix4(m);
        const p = g.attributes.position, n = g.attributes.normal, c = new T.Color(color);
        for (let i = 0; i < p.count; i++) { P.push(p.getX(i), p.getY(i), p.getZ(i)); N.push(n.getX(i), n.getY(i), n.getZ(i)); Cc.push(c.r, c.g, c.b); K.push(kind); UV.push(0, 0); TOP.push(0); }
      },
      // um retângulo de estante: começa em (x0,z0), corre na direção (tx,tz) por len metros, de y0 a y1, virado para (nx,nz)
      wall(x0, z0, tx, tz, nx, nz, len, y0, y1, u0, seed, top) {
        const q = [[0, y0], [len, y0], [len, y1], [0, y0], [len, y1], [0, y1]];
        // ordem dos vértices conforme o lado para o qual a face aponta
        const cross = tx * nz - tz * nx; const order = cross > 0 ? [0, 2, 1, 3, 5, 4] : [0, 1, 2, 3, 4, 5];
        for (const k of order) { const [s, y] = q[k]; P.push(x0 + tx * s, y, z0 + tz * s); N.push(nx, 0, nz); Cc.push(1, 1, 1); K.push(seed); UV.push(u0 + s, y); TOP.push(top); }
      },
      build() {
        const g = new T.BufferGeometry();
        g.setAttribute("position", new T.Float32BufferAttribute(P, 3));
        g.setAttribute("normal", new T.Float32BufferAttribute(N, 3));
        g.setAttribute("aCol", new T.Float32BufferAttribute(Cc, 3));
        g.setAttribute("aKind", new T.Float32BufferAttribute(K, 1));
        g.setAttribute("aUv", new T.Float32BufferAttribute(UV, 2));
        g.setAttribute("aTop", new T.Float32BufferAttribute(TOP, 1));
        g.computeBoundingSphere(); return g;
      },
    };
  }
  const hexShape = (r) => { const s = new T.Shape(); for (let k = 0; k < 6; k++) { const a = Math.PI / 6 + k * Math.PI / 3; const x = r * Math.cos(a), y = r * Math.sin(a); if (k) s.lineTo(x, y); else s.moveTo(x, y); } s.closePath(); return s; };
  const SIDES = [0, 1, 2, 3, 4, 5].map((k) => { const th = k * Math.PI / 3; return { k, th, c: Math.cos(th), s: Math.sin(th) }; });

  const WOOD = "#5A3A26", WOOD_D = "#3A251A", GOLD = "#C89A4A", FLOOR = "#6B4A33", CEILC = "#3B2A20";
  const S = Builder(), W = Builder();
  {
    // piso (com o buraco do poço) e teto
    const ring = new T.Shape(); hexShape(R + 0.08).getPoints().forEach((p, i) => (i ? ring.lineTo(p.x, p.y) : ring.moveTo(p.x, p.y)));
    ring.holes.push(new T.Path(hexShape(RS).getPoints()));
    const floorG = new T.ShapeGeometry(ring); floorG.rotateX(-Math.PI / 2);
    S.add(floorG, M(), FLOOR, 1);
    const ceilG = new T.ShapeGeometry(ring); ceilG.rotateX(Math.PI / 2);
    S.add(ceilG, M(0, CEIL, 0), CEILC, 2);
    // a borda da laje em volta do poço, entre o teto e o piso de cima
    for (const sd of SIDES) {
      const nx = -sd.c, nz = -sd.s, cx = RSA * sd.c, cz = RSA * sd.s;
      S.add(new T.PlaneGeometry(RS + 0.02, H - CEIL + 0.02), M(cx, (CEIL + H) / 2, cz, Math.atan2(nx, nz)), WOOD_D, 0);
      S.add(new T.PlaneGeometry(RS + 0.02, 0.06), M(cx + nx * 0.01, CEIL + 0.06, cz + nz * 0.01, Math.atan2(nx, nz)), GOLD, 0);
      // guarda-corpo: corrimão, travessa de baixo e balaústres
      const tx = -sd.s, tz = sd.c, ry = alignX(tx, tz), rr = RSA + 0.06;
      S.add(new T.BoxGeometry(RS + 0.08, 0.08, 0.12), M(rr * sd.c, 1.0, rr * sd.s, ry), WOOD, 0);
      S.add(new T.BoxGeometry(RS + 0.08, 0.02, 0.13), M(rr * sd.c, 1.045, rr * sd.s, ry), GOLD, 0);
      S.add(new T.BoxGeometry(RS, 0.06, 0.08), M(rr * sd.c, 0.12, rr * sd.s, ry), WOOD, 0);
      for (let b = 0; b <= 8; b++) { const t = -RS / 2 + RS * b / 8; S.add(new T.BoxGeometry(0.035, 0.86, 0.035), M(rr * sd.c + tx * t, 0.57, rr * sd.s + tz * t), WOOD_D, 0); }
      S.add(new T.BoxGeometry(0.11, 1.15, 0.11), M(rr * sd.c + tx * RS / 2, 0.58, rr * sd.s + tz * RS / 2), WOOD, 0);
    }
    // as estantes: quatro paredes inteiras e as duas paredes das portas dos lados
    for (const sd of SIDES) {
      const nx = -sd.c, nz = -sd.s, tx = -sd.s, tz = sd.c;
      const cx = (A - 0.01) * sd.c, cz = (A - 0.01) * sd.s;
      const x0 = cx - tx * R / 2, z0 = cz - tz * R / 2;
      if (sd.k === 0 || sd.k === 3) {
        const seg = R / 2 - DOOR - 0.16;
        W.wall(x0, z0, tx, tz, nx, nz, seg, 0, CEIL, 0, sd.k + 0.5, SHELF_TOP);
        W.wall(x0 + tx * (R - seg), z0 + tz * (R - seg), tx, tz, nx, nz, seg, 0, CEIL, R - seg, sd.k + 0.7, SHELF_TOP);
        // painel de madeira acima da porta e a moldura da porta
        S.add(new T.PlaneGeometry(2 * DOOR + 0.34, CEIL - DOORH), M(cx, (CEIL + DOORH) / 2, cz, Math.atan2(nx, nz)), WOOD_D, 0);
        for (const sgn of [-1, 1]) S.add(new T.BoxGeometry(0.3, DOORH + 0.25, 0.5), M(cx + tx * sgn * (DOOR + 0.12), (DOORH + 0.25) / 2, cz + tz * sgn * (DOOR + 0.12), alignX(tx, tz)), WOOD, 0);
        S.add(new T.BoxGeometry(2 * DOOR + 0.6, 0.3, 0.52), M(cx, DOORH + 0.12, cz, alignX(tx, tz)), WOOD, 0);
        S.add(new T.BoxGeometry(2 * DOOR + 0.62, 0.04, 0.54), M(cx, DOORH + 0.29, cz, alignX(tx, tz)), GOLD, 0);
      } else {
        W.wall(x0, z0, tx, tz, nx, nz, R, 0, CEIL, 0, sd.k + 0.5, SHELF_TOP);
        // pilastras nos cantos
        S.add(new T.BoxGeometry(0.34, CEIL, 0.34), M(x0 + nx * 0.06, CEIL / 2, z0 + nz * 0.06), WOOD_D, 0);
      }
      // cornija contínua no alto das estantes
      S.add(new T.BoxGeometry(R + 0.1, 0.12, 0.32), M(cx + nx * 0.12, SHELF_TOP + 0.06, cz + nz * 0.12, alignX(tx, tz)), WOOD, 0);
      S.add(new T.BoxGeometry(R + 0.1, 0.025, 0.34), M(cx + nx * 0.12, SHELF_TOP + 0.13, cz + nz * 0.12, alignX(tx, tz)), GOLD, 0);
    }
    // corredor até a próxima sala (do lado +x): piso, teto e estantes dos dois lados
    const cx0 = A, cx1 = A + C;
    const corrFloor = new T.PlaneGeometry(C + 0.1, 2 * DOOR); corrFloor.rotateX(-Math.PI / 2);
    S.add(corrFloor, M((cx0 + cx1) / 2, 0.001, 0), FLOOR, 1);
    const corrCeil = new T.PlaneGeometry(C + 0.1, 2 * DOOR); corrCeil.rotateX(Math.PI / 2);
    S.add(corrCeil, M((cx0 + cx1) / 2, DOORH, 0), CEILC, 2);
    W.wall(cx0 - 0.05, -DOOR, 1, 0, 0, 1, C + 0.1, 0, DOORH, 0, 9.5, DOORH - 0.3);
    W.wall(cx0 - 0.05, DOOR, 1, 0, 0, -1, C + 0.1, 0, DOORH, 0, 10.5, DOORH - 0.3);
    // lampiões: esfera pendurada numa corrente
    for (const z of [3.75, -3.75]) {
      S.add(new T.SphereGeometry(0.22, 14, 10), M(0, 4.05, z), "#FFC77A", 3);
      S.add(new T.CylinderGeometry(0.1, 0.16, 0.08, 10), M(0, 4.28, z), GOLD, 0);
      S.add(new T.CylinderGeometry(0.012, 0.012, CEIL - 4.3, 4), M(0, (CEIL + 4.3) / 2, z), WOOD_D, 0);
    }
  }
  const structGeo = S.build(), wallGeo = W.build();
  const N_INST = (2 * NR + 1) * (2 * NF + 1);
  const structMesh = new T.InstancedMesh(structGeo, structMat, N_INST);
  const wallMesh = new T.InstancedMesh(wallGeo, bookMat, N_INST);
  [structMesh, wallMesh].forEach((m) => { m.frustumCulled = false; scene.add(m); });

  /* brilho dos lampiões (pontos que sempre olham para a câmera) */
  const glowTex = (() => {
    const c = document.createElement("canvas"); c.width = c.height = 64; const g = c.getContext("2d");
    const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, "rgba(255,255,255,1)"); gr.addColorStop(0.2, "rgba(255,255,255,0.5)"); gr.addColorStop(1, "rgba(255,255,255,0)");
    g.fillStyle = gr; g.fillRect(0, 0, 64, 64); return new T.CanvasTexture(c);
  })();
  const haloGeo = new T.BufferGeometry(); haloGeo.setAttribute("position", new T.Float32BufferAttribute(new Float32Array(N_INST * 2 * 3), 3));
  const halos = new T.Points(haloGeo, new T.PointsMaterial({ map: glowTex, color: 0xffb35c, size: 2.6, transparent: true, opacity: 0.55, depthWrite: false, blending: T.AdditiveBlending, fog: false }));
  halos.frustumCulled = false; scene.add(halos);

  /* poeira dourada no ar, perto de quem anda */
  const DUST = small ? 220 : 420;
  const dustGeo = new T.BufferGeometry(); const dp = new Float32Array(DUST * 3), ds = new Float32Array(DUST);
  for (let i = 0; i < DUST; i++) { dp.set([(Math.random() - 0.5) * 16, Math.random() * CEIL, (Math.random() - 0.5) * 16], i * 3); ds[i] = Math.random(); }
  dustGeo.setAttribute("position", new T.BufferAttribute(dp, 3));
  const dust = new T.Points(dustGeo, new T.PointsMaterial({ map: glowTex, color: 0xffd9a0, size: 0.05, transparent: true, opacity: 0.55, depthWrite: false, blending: T.AdditiveBlending }));
  dust.frustumCulled = false; scene.add(dust);

  let centerRoom = null;
  const tmpM = new T.Matrix4();
  function placeRooms(i0) {
    if (i0 === centerRoom) return; centerRoom = i0; let n = 0; const hp = haloGeo.attributes.position.array;
    for (let di = -NR; di <= NR; di++) for (let f = -NF; f <= NF; f++) {
      const x = (i0 + di) * D, y = f * H; tmpM.makeTranslation(x, y, 0);
      structMesh.setMatrixAt(n, tmpM); wallMesh.setMatrixAt(n, tmpM);
      hp.set([x, y + 4.05, 3.75, x, y + 4.05, -3.75], n * 6); n++;
    }
    structMesh.instanceMatrix.needsUpdate = wallMesh.instanceMatrix.needsUpdate = true; haloGeo.attributes.position.needsUpdate = true;
  }

  /* ---------------- a entrada: um atril com o livro aberto ---------------- */
  function pageTexture() {
    const c = document.createElement("canvas"); c.width = 1024; c.height = 640; const g = c.getContext("2d");
    const paper = (x) => { const gr = g.createLinearGradient(x, 0, x + 512, 0); gr.addColorStop(0, "#E9DDC2"); gr.addColorStop(0.92, "#F2E8D2"); gr.addColorStop(1, "#CDBE9F"); return gr; };
    g.fillStyle = paper(0); g.fillRect(0, 0, 512, 640); g.save(); g.translate(1024, 0); g.scale(-1, 1); g.fillStyle = paper(0); g.fillRect(0, 0, 512, 640); g.restore();
    g.fillStyle = "rgba(60,40,20,0.25)"; g.fillRect(506, 0, 12, 640);
    g.textAlign = "center"; g.fillStyle = "#2A211A";
    g.font = "600 22px 'Geist Mono', monospace"; g.fillText("PORTFÓLIO 2026", 256, 140);
    g.font = "600 64px 'Shippori Mincho', serif"; g.fillText("Fernando", 256, 260); g.fillText("Rateke", 256, 336);
    g.fillStyle = "#C22026"; g.fillRect(196, 372, 120, 4);
    g.fillStyle = "#4A3C2E"; g.font = "italic 500 30px 'Cormorant Garamond', serif"; g.fillText("A jornada é o que", 256, 450); g.fillText("dá forma ao mundo.", 256, 488);
    g.fillStyle = "#2A211A"; g.font = "500 30px 'Cormorant Garamond', serif";
    ["Esta biblioteca não tem fim.", "Em cada sala, as estantes", "guardam o que eu fiz.", "", "Os livros que brilham", "são as atividades:", "abra qualquer um."].forEach((t, i) => g.fillText(t, 768, 190 + i * 44));
    g.font = "500 18px 'Geist Mono', monospace"; g.fillStyle = "#7E6A4E"; g.fillText("→ siga pela porta da frente", 768, 540);
    const tex = new T.CanvasTexture(c); tex.anisotropy = 4; return tex;
  }
  const lectern = new T.Group(); lectern.position.set(-3.1, 0, 0); scene.add(lectern);
  {
    const LB = Builder();
    LB.add(new T.CylinderGeometry(0.34, 0.46, 0.12, 8), M(0, 0.06, 0), WOOD_D, 0);
    LB.add(new T.CylinderGeometry(0.09, 0.12, 1.05, 8), M(0, 0.6, 0), WOOD, 0);
    LB.add(new T.BoxGeometry(0.6, 0.06, 0.82), new T.Matrix4().compose(new T.Vector3(0, 1.14, 0), new T.Quaternion().setFromEuler(new T.Euler(0, 0, 0.42)), new T.Vector3(1, 1, 1)), WOOD, 0);
    lectern.add(new T.Mesh(LB.build(), structMat));
    let pages = null;
    const mkPages = () => {
      if (pages) lectern.remove(pages);
      pages = new T.Mesh(new T.PlaneGeometry(0.78, 0.49), new T.ShaderMaterial({
        uniforms: Object.assign({ map: { value: pageTexture() } }, U),
        vertexShader: `varying vec2 vUv; varying vec3 vW; void main(){ vUv = uv; vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,
        fragmentShader: `${COMMON} uniform sampler2D map; varying vec2 vUv; varying vec3 vW; void main(){ vec3 c = texture2D(map, vUv).rgb; vec3 l = band(lamps(vW, vec3(-0.4, 0.9, 0.0))); gl_FragColor = vec4(fogIt(c * (0.55 + l * 0.75), vW), 1.0); }`,
      }));
      // a página fica deitada na tábua inclinada, virada para quem chega pela porta (-x)
      const sn = Math.sin(0.42), cs = Math.cos(0.42);
      pages.quaternion.setFromRotationMatrix(new T.Matrix4().makeBasis(new T.Vector3(0, 0, 1), new T.Vector3(cs, sn, 0), new T.Vector3(-sn, cs, 0)));
      pages.position.set(-sn * 0.036, 1.14 + cs * 0.036, 0); lectern.add(pages);
    };
    mkPages(); if (document.fonts) document.fonts.ready.then(mkPages);
  }

  /* ---------------- as atividades: livros de verdade, que brilham e abrem ---------------- */
  const COLORS = ["#2E7D5B", "#9C4A2F", "#7A3E8E", "#2E5E9C", "#3A8C8C", "#B07A2A", "#A8435A", "#4E8A3A", "#5A5AA8", "#8C6A3A"];
  const books = [], bookHits = [];
  let subjects = [];
  function spineTexture(title, color) {
    const c = document.createElement("canvas"); c.width = 96; c.height = 320; const g = c.getContext("2d");
    g.fillStyle = color; g.fillRect(0, 0, 96, 320);
    const gr = g.createLinearGradient(0, 0, 96, 0); gr.addColorStop(0, "rgba(0,0,0,0.35)"); gr.addColorStop(0.5, "rgba(255,255,255,0.08)"); gr.addColorStop(1, "rgba(0,0,0,0.35)"); g.fillStyle = gr; g.fillRect(0, 0, 96, 320);
    g.fillStyle = "#E2B25A"; [18, 26, 294, 302].forEach((y) => g.fillRect(6, y, 84, 3));
    g.save(); g.translate(48, 160); g.rotate(-Math.PI / 2); g.fillStyle = "#F4E9D2"; g.textAlign = "center"; g.textBaseline = "middle";
    let fs = 26; g.font = `600 ${fs}px 'Shippori Mincho', serif`; const t = title.length > 34 ? title.slice(0, 32) + "…" : title;
    while (g.measureText(t).width > 250 && fs > 12) { fs -= 1; g.font = `600 ${fs}px 'Shippori Mincho', serif`; }
    g.fillText(t, 0, 0); g.restore();
    const tex = new T.CanvasTexture(c); tex.anisotropy = 4; return tex;
  }
  const BOOK_VS = `varying vec3 vW; varying vec3 vN; varying vec2 vUv; void main(){ vUv = uv; vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; vN = normalize(mat3(modelMatrix) * normal); gl_Position = projectionMatrix * viewMatrix * w; }`;
  const actMat = (color, map, kind) => new T.ShaderMaterial({
    uniforms: Object.assign({ uColor: { value: new T.Color(color) }, map: { value: map || null }, uHot: { value: 0 }, uMatch: { value: 0 }, uKind: { value: kind } }, U),
    vertexShader: BOOK_VS,
    fragmentShader: `${COMMON} uniform vec3 uColor; uniform sampler2D map; uniform float uHot, uMatch, uKind; varying vec3 vW; varying vec3 vN; varying vec2 vUv;
      void main(){
        vec3 n = normalize(vN); vec3 c = uColor;
        if (uKind > 1.5) c = texture2D(map, vUv).rgb;                       // lombada com o título
        else if (uKind > 0.5) c = mix(vec3(0.92, 0.86, 0.72), vec3(0.78, 0.7, 0.56), step(0.5, fract(vUv.y * 40.0))); // folhas
        float e = min(min(vUv.x, 1.0 - vUv.x), min(vUv.y, 1.0 - vUv.y));
        float edge = 1.0 - smoothstep(0.0, 0.06, e);
        float pulse = 0.55 + 0.45 * sin(uTime * 2.2 + vW.x * 0.7);
        vec3 lit = band(lamps(vW, n));
        // um livro especial, não uma lâmpada: o douradinho nas bordas pulsa devagar e acende quando apontado
        vec3 col = c * (lit * 0.9 + 0.12) + vec3(1.0, 0.76, 0.38) * edge * (0.12 + 0.16 * pulse + uHot * 0.55);
        col += vec3(1.0, 0.85, 0.6) * (0.03 * pulse + uHot * 0.1) * (1.0 - edge);
        col = mix(col, col + vec3(0.9, 0.95, 1.0) * 0.5 * (0.5 + 0.5 * sin(uTime * 6.0)), uMatch);
        gl_FragColor = vec4(fogIt(col, vW), 1.0);
      }`,
  });
  function addActivityBooks(list) {
    subjects = list;
    list.forEach((sub, si) => {
      const room = si + 1, color = COLORS[si % COLORS.length];
      sub.room = room; sub.color = color;
      // placa com o nome da matéria, em cima da porta por onde se entra na sala
      plaque(room, sub.name, sub.cat === "curso-tecnico" ? "Curso técnico" : "Ensino médio", color);
      sub.acts.forEach((a, ai) => {
        const wall = ai < 4 ? 1 : 5; // paredes da frente (60° e 300°)
        const sd = SIDES[wall]; const slot = ai % 4; const nPer = Math.min(4, ai < 4 ? sub.acts.length : sub.acts.length - 4);
        const u = (slot - (nPer - 1) / 2) * 1.15;
        const nx = -sd.c, nz = -sd.s, tx = -sd.s, tz = sd.c;
        const g = new T.Group();
        const bx = room * D + A * sd.c + tx * u + nx * 0.2, bz = A * sd.s + tz * u + nz * 0.2;
        g.position.set(bx, BASE + ROW * 2 + 0.045, bz); g.rotation.y = Math.atan2(nx, nz);
        const spine = spineTexture(a.t, color);
        const mats = [actMat(color, null, 0), actMat(color, null, 0), actMat(color, null, 1), actMat(color, null, 0), actMat(color, spine, 2), actMat(color, null, 0)];
        const body = new T.Mesh(new T.BoxGeometry(0.12, 0.38, 0.27), mats); body.position.y = 0.19; g.add(body);
        const halo = new T.Sprite(new T.SpriteMaterial({ map: glowTex, color: new T.Color(color).lerp(new T.Color("#ffd28a"), 0.5), transparent: true, opacity: 0.5, depthWrite: false, blending: T.AdditiveBlending }));
        halo.scale.set(0.75, 0.75, 1); halo.position.set(0, 0.2, 0.18); g.add(halo);
        scene.add(g);
        const b = { a, sub, g, body, halo, mats, nx, nz, room, hot: 0, out: 0, match: 0, id: `${si}-${ai}` };
        body.userData.book = b; books.push(b); bookHits.push(body);
      });
    });
  }
  function plaque(room, name, sub, color) {
    const c = document.createElement("canvas"); c.width = 640; c.height = 160; const g = c.getContext("2d");
    g.fillStyle = "#2A1C14"; g.fillRect(0, 0, 640, 160); g.strokeStyle = "#C89A4A"; g.lineWidth = 4; g.strokeRect(10, 10, 620, 140);
    g.fillStyle = color; g.fillRect(24, 72, 10, 16);
    g.fillStyle = "#F1E6CF"; g.textAlign = "center"; g.font = "600 46px 'Shippori Mincho', serif";
    let fs = 46; while (g.measureText(name).width > 560 && fs > 24) { fs -= 2; g.font = `600 ${fs}px 'Shippori Mincho', serif`; }
    g.fillText(name, 320, 92); g.fillStyle = "#B9A98A"; g.font = "500 18px 'Geist Mono', monospace"; g.fillText(sub.toUpperCase() + "  ·  SALA " + room, 320, 130);
    const tex = new T.CanvasTexture(c); tex.anisotropy = 4;
    const m = new T.Mesh(new T.PlaneGeometry(2.4, 0.6), new T.ShaderMaterial({ uniforms: Object.assign({ map: { value: tex } }, U), vertexShader: BOOK_VS,
      fragmentShader: `${COMMON} uniform sampler2D map; varying vec3 vW; varying vec3 vN; varying vec2 vUv; void main(){ vec3 c = texture2D(map, vUv).rgb; vec3 l = band(lamps(vW, normalize(vN))); gl_FragColor = vec4(fogIt(c * (0.45 + l * 0.9), vW), 1.0); }` }));
    // uma placa em cima da porta da sala anterior (vista de quem vem) e outra dentro da própria sala
    m.position.set((room - 1) * D + A - 0.04, DOORH + 0.78, 0); m.rotation.y = -Math.PI / 2; scene.add(m);
    const m2 = m.clone(); m2.position.set(room * D - A + 0.04, DOORH + 0.78, 0); m2.rotation.y = Math.PI / 2; scene.add(m2);
  }

  /* ---------------- quem anda: posição, olhar, colisão ---------------- */
  const me = { x: -5.3, z: 0, yaw: 0, pitch: -0.06, vx: 0, vz: 0 };
  const EYE = 1.62;
  function valid(x, z) {
    const i = Math.round(x / D), lx = x - i * D, lz = z;
    if (Math.abs(lx) > A - 0.3) return Math.abs(lz) < DOOR - 0.3;
    for (const sd of SIDES) { const d = lx * sd.c + lz * sd.s; if (d > A - 0.42) { if ((sd.k === 0 || sd.k === 3) && Math.abs(lz) < DOOR - 0.3) continue; return false; } }
    let sh = 0; for (const sd of SIDES) sh = Math.max(sh, lx * sd.c + lz * sd.s);
    if (sh < RSA + 0.42) return false;
    const lect = Math.hypot(lx - (-3.1), lz); if (i === 0 && lect < 0.55) return false;
    return true;
  }
  function moveBy(dx, dz) {
    if (valid(me.x + dx, me.z + dz)) { me.x += dx; me.z += dz; return; }
    if (valid(me.x + dx, me.z)) me.x += dx; else if (valid(me.x, me.z + dz)) me.z += dz;
  }

  /* ---------------- entradas: teclado, mouse, toque e o controle externo ---------------- */
  const input = { keys: new Set(), joy: { x: 0, y: 0 }, ext: { x: 0, y: 0, t: 0 } };
  let auto = null; // caminhada automática até um livro
  addEventListener("keydown", (e) => {
    if (e.target && e.target.tagName === "INPUT") { if (e.key === "Escape") e.target.blur(); return; }
    if (e.key === "/") { e.preventDefault(); $("busca").focus(); return; }
    if (e.key === "Escape") { closePanel(); return; }
    input.keys.add(e.key.toLowerCase()); if (auto && /^(w|a|s|d|arrow)/.test(e.key.toLowerCase())) auto = null; firstMove();
  });
  addEventListener("keyup", (e) => input.keys.delete(e.key.toLowerCase()));
  addEventListener("blur", () => input.keys.clear());
  let drag = null; const ptr = new T.Vector2(); let hot = null;
  canvas.addEventListener("pointerdown", (e) => {
    if (e.pointerType === "touch" && joyPointer === e.pointerId) return;
    drag = { id: e.pointerId, x: e.clientX, y: e.clientY, moved: 0 }; canvas.setPointerCapture(e.pointerId); canvas.classList.add("drag");
  });
  canvas.addEventListener("pointermove", (e) => {
    ptr.set(e.clientX / innerWidth * 2 - 1, -(e.clientY / innerHeight) * 2 + 1);
    if (drag && drag.id === e.pointerId) {
      const dx = e.clientX - drag.x, dy = e.clientY - drag.y; drag.x = e.clientX; drag.y = e.clientY; drag.moved += Math.abs(dx) + Math.abs(dy);
      look(dx, dy); if (drag.moved > 6) firstMove();
    } else if (e.pointerType === "mouse") hover();
  });
  const endDrag = (e) => {
    if (!drag || drag.id !== e.pointerId) return;
    canvas.classList.remove("drag");
    if (drag.moved < 6) { ptr.set(e.clientX / innerWidth * 2 - 1, -(e.clientY / innerHeight) * 2 + 1); clickAt(ptr); }
    drag = null;
  };
  canvas.addEventListener("pointerup", endDrag); canvas.addEventListener("pointercancel", () => { drag = null; canvas.classList.remove("drag"); });
  function look(dx, dy) { const k = coarse ? 0.0055 : 0.0042; me.yaw += dx * k; me.pitch = Math.max(-1.25, Math.min(1.25, me.pitch - dy * k)); if (auto && auto.facing) auto = null; }

  // joystick na tela (celular)
  const joyEl = $("joy"), knob = joyEl.querySelector("i"); let joyPointer = null;
  joyEl.addEventListener("pointerdown", (e) => { joyPointer = e.pointerId; joyEl.setPointerCapture(e.pointerId); joyMove(e); firstMove(); auto = null; });
  joyEl.addEventListener("pointermove", (e) => { if (e.pointerId === joyPointer) joyMove(e); });
  const joyEnd = (e) => { if (e.pointerId !== joyPointer) return; joyPointer = null; input.joy.x = input.joy.y = 0; knob.style.transform = ""; };
  joyEl.addEventListener("pointerup", joyEnd); joyEl.addEventListener("pointercancel", joyEnd);
  function joyMove(e) {
    const r = joyEl.getBoundingClientRect(); let x = (e.clientX - r.left) / r.width * 2 - 1, y = (e.clientY - r.top) / r.height * 2 - 1;
    const L = Math.hypot(x, y); if (L > 1) { x /= L; y /= L; }
    input.joy.x = x; input.joy.y = -y; knob.style.transform = `translate(${x * 36}px, ${y * 36}px)`;
  }

  const ray = new T.Raycaster();
  function pick(p) { ray.setFromCamera(p, camera); const h = ray.intersectObjects(bookHits, false)[0]; return h && h.distance < 14 ? h.object.userData.book : null; }
  function hover() { const b = pick(ptr); if (b !== hot) { hot = b; canvas.classList.toggle("hot", !!b); } }
  function clickAt(p) { const b = pick(p); if (b) openBook(b); }

  let hinted = false;
  function firstMove() { if (hinted) return; hinted = true; setTimeout(() => $("dica").classList.add("off"), 3500); }

  /* ---------------- abrir um livro ---------------- */
  const panel = $("painel"); let openB = null;
  const esc = (s) => String(s || "").replace(/[&<>"]/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[ch]));
  function openBook(b) {
    openB = b; books.forEach((o) => (o.open = o === b));
    $("pKick").textContent = `${b.sub.name} · ${b.a.s || ""}`;
    $("pTitulo").textContent = b.a.t;
    const k = (b.a.k || []).map(([code, txt]) => `<li><b>${esc(code)}</b>${esc(txt)}</li>`).join("");
    const l = (b.a.l || []).map(([txt, url]) => `<a href="${esc(url)}" target="_blank" rel="noopener">${esc(txt)}</a>`).join("");
    $("pCorpo").innerHTML = (b.a.img ? `<img src="${esc(/^https?:/.test(b.a.img) ? b.a.img : "/vale/" + b.a.img)}" alt="" loading="lazy">` : "") + `<p>${esc(b.a.r)}</p>` + (k ? `<h3>Competências</h3><ul class="k">${k}</ul>` : "") + (l ? `<h3>Ver</h3><div class="links">${l}</div>` : "");
    panel.classList.add("open"); panel.setAttribute("aria-hidden", "false"); $("pFechar").focus({ preventScroll: true });
  }
  function closePanel() { if (!openB) return; openB = null; books.forEach((o) => (o.open = false)); panel.classList.remove("open"); panel.setAttribute("aria-hidden", "true"); canvas.focus && canvas.focus(); }
  $("pFechar").addEventListener("click", closePanel);

  /* ---------------- caminhar sozinho até um livro (busca e controle) ---------------- */
  const ringPt = (room, a, r = 4.25) => new T.Vector3(room * D + r * Math.cos(a), 0, r * Math.sin(a));
  function pathTo(b) {
    const V = (x, z) => new T.Vector3(x, 0, z);
    const pts = [V(me.x, me.z)];
    let room = Math.round(me.x / D); const target = b.room; const side = b.nz > 0 ? 1 : -1;
    const ang = (p, rm) => Math.atan2(p.z, p.x - rm * D);
    const around = (rm, a0, a1) => {
      let d = a1 - a0; while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI;
      if (Math.abs(Math.abs(d) - Math.PI) < 0.25) d = side * Math.abs(d); // meia volta: pelo lado do livro
      const n = Math.max(1, Math.ceil(Math.abs(d) / 0.35)); for (let k = 1; k <= n; k++) pts.push(ringPt(rm, a0 + d * k / n));
    };
    let a;
    const lx = me.x - room * D;
    if (Math.abs(lx) > A - 0.3) { const sg = Math.sign(lx) || 1; pts.push(V(room * D + sg * (A - 0.2), 0)); a = sg > 0 ? 0 : Math.PI; }
    else a = ang(pts[0], room);
    pts.push(ringPt(room, a));
    while (room !== target) {
      const dir = Math.sign(target - room); around(room, a, dir > 0 ? 0 : Math.PI);
      pts.push(V(room * D + dir * (A - 0.2), 0)); room += dir; pts.push(V(room * D - dir * (A - 0.2), 0));
      a = dir > 0 ? Math.PI : 0; pts.push(ringPt(room, a));
    }
    const stand = V(b.g.position.x + b.nx * 1.25, b.g.position.z + b.nz * 1.25);
    around(room, a, ang(stand, room)); pts.push(stand);
    const clean = [pts[0]]; for (const p of pts) if (p.distanceTo(clean[clean.length - 1]) > 0.2) clean.push(p);
    return clean;
  }
  function walkTo(b, open = true) {
    closePanel();
    if (reduce) { const p = pathTo(b).pop(); me.x = p.x; me.z = p.z; faceBook(b, true); if (open) openBook(b); return; }
    const pts = pathTo(b); if (pts.length < 2) { faceBook(b, false); if (open) openBook(b); return; }
    const curve = new T.CatmullRomCurve3(pts, false, "centripetal", 0.3);
    auto = { curve, len: curve.getLength(), s: 0, b, open, facing: false };
  }
  function faceBook(b, snap) {
    const dx = b.g.position.x - me.x, dz = b.g.position.z - me.z; const ty = Math.atan2(dz, dx), tp = Math.atan2(BASE + ROW * 2 + 0.2 - EYE, Math.hypot(dx, dz));
    if (snap) { me.yaw = ty; me.pitch = tp; } return { ty, tp };
  }

  /* ---------------- busca ---------------- */
  const norm = (s) => String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
  const busca = $("busca"), res = $("resultados");
  busca.addEventListener("input", () => {
    const q = norm(busca.value.trim()); books.forEach((b) => (b.match = 0));
    if (!q) { res.hidden = true; res.innerHTML = ""; return; }
    const found = books.filter((b) => norm(b.a.t + " " + b.sub.name + " " + (b.a.s || "") + " " + (b.a.r || "")).includes(q));
    found.forEach((b) => (b.match = 1));
    res.innerHTML = found.length ? found.slice(0, 10).map((b) => `<li><button type="button" data-id="${b.id}"><b>${esc(b.a.t)}</b><span>${esc(b.sub.name)} · sala ${b.room}</span></button></li>`).join("") : `<li class="none">Nenhum livro com isso nas estantes.</li>`;
    res.hidden = false;
  });
  res.addEventListener("click", (e) => { const bt = e.target.closest("button[data-id]"); if (!bt) return; const b = books.find((o) => o.id === bt.dataset.id); if (b) { res.hidden = true; busca.blur(); walkTo(b); } });
  busca.addEventListener("keydown", (e) => { if (e.key === "Enter") { const f = res.querySelector("button[data-id]"); if (f) f.click(); } });

  /* ---------------- controle externo (o celular vai falar por aqui) ---------------- */
  window.biblioteca = {
    move(x, y) { input.ext.x = x; input.ext.y = y; input.ext.t = performance.now(); if (x || y) { auto = null; firstMove(); } },
    look(dx, dy) { look(dx, dy); },
    click(nx, ny) { clickAt(new T.Vector2(nx, ny)); },
    walkTo(id) { const b = books.find((o) => o.id === id || o.a.t === id); if (b) walkTo(b); return !!b; },
    close: closePanel,
    books: () => books.map((b) => ({ id: b.id, t: b.a.t, sub: b.sub.name, room: b.room, x: b.g.position.x, z: b.g.position.z, nx: b.nx, nz: b.nz })),
    state: () => ({ x: me.x, z: me.z, yaw: me.yaw, pitch: me.pitch, room: Math.round(me.x / D), open: openB ? openB.id : null }),
    set(s) { Object.assign(me, s); },
  };

  /* ---------------- sala atual ---------------- */
  let lastRoom = null;
  function roomLabel(i) {
    if (i === lastRoom) return; lastRoom = i;
    const sub = subjects.find((s) => s.room === i);
    $("salaN").textContent = `Sala ${i}`;
    $("salaT").textContent = i === 0 ? "Entrada" : sub ? sub.name : (Math.abs(i) > 40 ? "Muito longe da entrada" : "Estantes sem catálogo");
  }

  /* ---------------- laço ---------------- */
  function resize() { const w = innerWidth, h = innerHeight; renderer.setSize(w, h, false); camera.aspect = w / h; camera.fov = w / h < 0.8 ? 80 : 70; camera.updateProjectionMatrix(); }
  addEventListener("resize", resize); resize();
  const clock = new T.Clock(); let t = 0; const fwd = new T.Vector3();
  function frame() {
    const dt = Math.min(0.05, clock.getDelta()); t += dt; U.uTime.value = t;
    // movimento
    let mx = 0, my = 0; const k = input.keys;
    if (k.has("w") || k.has("arrowup")) my += 1; if (k.has("s") || k.has("arrowdown")) my -= 1;
    if (k.has("d") || k.has("arrowright")) mx += 1; if (k.has("a") || k.has("arrowleft")) mx -= 1;
    if (k.has("q")) me.yaw -= dt * 1.6; if (k.has("e")) me.yaw += dt * 1.6;
    mx += input.joy.x; my += input.joy.y;
    if (performance.now() - input.ext.t < 400) { mx += input.ext.x; my += input.ext.y; }
    const L = Math.hypot(mx, my); if (L > 1) { mx /= L; my /= L; }
    const speed = k.has("shift") ? 6.2 : 3.3;
    const cy = Math.cos(me.yaw), sy = Math.sin(me.yaw);
    const tvx = (cy * my - sy * mx) * speed, tvz = (sy * my + cy * mx) * speed;
    me.vx += (tvx - me.vx) * Math.min(1, dt * 9); me.vz += (tvz - me.vz) * Math.min(1, dt * 9);
    if (auto) {
      const sp = 4.6; auto.s = Math.min(auto.len, auto.s + sp * dt);
      const u = auto.s / auto.len, p = auto.curve.getPointAt(u), q = auto.curve.getPointAt(Math.min(1, u + 0.02));
      me.x = p.x; me.z = p.z; me.vx = me.vz = 0;
      const ty = u < 0.97 ? Math.atan2(q.z - p.z, q.x - p.x) : faceBook(auto.b).ty;
      let dy = ty - me.yaw; while (dy > Math.PI) dy -= 2 * Math.PI; while (dy < -Math.PI) dy += 2 * Math.PI;
      me.yaw += dy * Math.min(1, dt * 5);
      me.pitch += ((u < 0.97 ? -0.05 : faceBook(auto.b).tp) - me.pitch) * Math.min(1, dt * 4);
      if (auto.s >= auto.len) { auto.facing = true; auto.hold = (auto.hold || 0) + dt; if (auto.hold > 0.6) { const b = auto.b, o = auto.open; auto = null; if (o) openBook(b); } }
    } else if (Math.abs(me.vx) + Math.abs(me.vz) > 0.001) moveBy(me.vx * dt, me.vz * dt);
    const bob = reduce ? 0 : Math.sin(t * 9) * Math.min(0.03, Math.hypot(me.vx, me.vz) * 0.008);
    camera.position.set(me.x, EYE + bob, me.z);
    fwd.set(Math.cos(me.yaw) * Math.cos(me.pitch), Math.sin(me.pitch), Math.sin(me.yaw) * Math.cos(me.pitch));
    camera.lookAt(camera.position.x + fwd.x, camera.position.y + fwd.y, camera.position.z + fwd.z);
    const i0 = Math.round(me.x / D); placeRooms(i0); roomLabel(i0);
    // poeira acompanha quem anda
    const P = dustGeo.attributes.position.array;
    for (let i = 0; i < DUST; i++) {
      let x = P[i * 3], y = P[i * 3 + 1], z = P[i * 3 + 2];
      y += dt * (0.05 + ds[i] * 0.08) * (reduce ? 0 : 1); x += Math.sin(t * 0.3 + i) * dt * 0.05;
      if (y > CEIL) y = 0.1; if (x - me.x > 8) x -= 16; if (x - me.x < -8) x += 16; if (z - me.z > 8) z -= 16; if (z - me.z < -8) z += 16;
      P[i * 3] = x; P[i * 3 + 1] = y; P[i * 3 + 2] = z;
    }
    dustGeo.attributes.position.needsUpdate = true;
    // livros: brilho, puxar para fora quando abertos ou apontados
    for (const b of books) {
      const target = b.open ? 1 : b === hot ? 0.4 : 0; b.out += (target - b.out) * Math.min(1, dt * 6);
      b.body.position.set(0, 0.19 + b.out * 0.05, b.out * 0.16); b.body.rotation.x = -b.out * 0.12;
      b.mats.forEach((m) => { m.uniforms.uHot.value = b.out; m.uniforms.uMatch.value = b.match; });
      b.halo.material.opacity = 0.14 + 0.1 * Math.sin(t * 2.2 + b.g.position.x) + b.out * 0.25 + b.match * 0.45;
    }
    renderer.render(scene, camera);
    requestAnimationFrame(frame);
  }

  /* ---------------- dados e abertura ---------------- */
  const fontsReady = document.fonts ? document.fonts.ready.catch(() => null) : Promise.resolve();
  fetch("atividades.json").then((r) => (r.ok ? r.json() : [])).catch(() => []).then((list) => fontsReady.then(() => list)).then((list) => {
    try { addActivityBooks(list || []); } catch (e) { console.warn("livros", e); }
  });
  placeRooms(0);
  requestAnimationFrame(frame);
  setTimeout(() => $("fade").classList.add("gone"), 350);
})();
