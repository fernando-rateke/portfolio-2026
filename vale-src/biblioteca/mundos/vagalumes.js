/* Mundo de Ciências Humanas: Túmulo dos Vaga-lumes. O abrigo cavado na encosta ao lado do lago, como o do filme: as duas portas de madeira com telhado de zinco, a tina de lavar encostada no barranco,
   o balde, a panela tombada, a tigela, o guarda-chuva de papel rasgado e o balanço pendurado na árvore.
   Uma menina balança e o irmão empurra (personagens originais). Cada objeto guarda uma atividade da matéria; clicar nele aproxima a
   câmera e abre o livro. O mosquiteiro, lá dentro do abrigo, faz a noite cair: os vaga-lumes acendem sobre o
   capim e na água, e o mosquiteiro brilha como no filme. Tudo é desenhado por código: terreno, árvores,
   capim, água com reflexo de verdade, personagens e sons (cigarras de dia, grilos e sapos à noite). */
(() => {
  window.MUNDOS = window.MUNDOS || {};
  window.MUNDOS.vagalumes = (ctx) => {
    const T = ctx.T, V3 = (x, y, z) => new T.Vector3(x, y, z), V2 = (x, y) => new T.Vector2(x, y), small = ctx.small;
    let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    const keep = []; const K = (o) => { keep.push(o); return o; };
    const scene = new T.Scene();
    const camera = new T.PerspectiveCamera(50, ctx.aspect(), 0.05, 600);
    const PR = Math.min(window.devicePixelRatio || 1, 1.75);
    const sm = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
    const hsh = (x, z) => { const s = Math.sin(x * 127.1 + z * 311.7) * 43758.5453; return s - Math.floor(s); };
    const vn = (x, z) => { const xi = Math.floor(x), zi = Math.floor(z), xf = x - xi, zf = z - zi, u = xf * xf * (3 - 2 * xf), v = zf * zf * (3 - 2 * zf); const a = hsh(xi, zi), b = hsh(xi + 1, zi), c = hsh(xi, zi + 1), d = hsh(xi + 1, zi + 1); return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v; };

    /* ---------------- o terreno: o lago à esquerda, o caminho, e o barranco do abrigo à direita ---------------- */
    const hillX = (z) => 4.0 + 0.05 * z + 0.35 * Math.sin(z * 0.3 + 1);
    const pondX = (z) => hillX(z) - 3.3 + 0.3 * Math.sin(z * 0.4);
    const pathX = (z) => hillX(z) - 1.25;
    const DOORS = [{ z: -0.6, hw: 0.56, h: 2.0 }, { z: -7.6, hw: 0.46, h: 1.75 }];
    function H(x, z) {
      let h = 0.28 + (vn(x * 0.25, z * 0.25) - 0.5) * 0.12;
      const d = x - hillX(z);
      let k = 0; for (const D of DOORS) k = Math.max(k, sm(D.hw + 1.1, D.hw + 0.45, Math.abs(z - D.z)));
      const foot = sm(0.05, 1.5, d) * (1 - k) + sm(0.0, 0.42, d) * k; // perto das portas o barranco vira um corte reto
      h += foot * 3.6 + Math.max(0, d - 1.5) * 0.22 + (vn(x * 0.3 + 7, z * 0.3) - 0.5) * 1.4 * sm(1.0, 4.0, d);
      const p = pondX(z) - x;
      h += 0.16 * Math.exp(-((p + 0.4) ** 2) / 0.06);
      h += (-1.15 - h) * sm(0.0, 1.0, p);
      h += (0.6 + 2.0 * vn(z * 0.08, 5) - h) * sm(-23, -27, x);
      h += (0.45 - h) * sm(2.6, 1.4, Math.hypot(x + 9, (z + 14) * 0.8)); // a ilhota da árvore torta
      return h;
    }
    for (const D of DOORS) { D.xf = hillX(D.z) + 0.02; D.y0 = H(D.xf - 0.35, D.z); }
    const slope = (x, z) => Math.hypot(H(x + 0.1, z) - H(x - 0.1, z), H(x, z + 0.1) - H(x, z - 0.1)) / 0.2;
    const OVERP = V3(-0.45, 1.65, 9.8), OVERT = V3(3.1, 1.15, -1.0);

    /* ---------------- luz, neblina e o dia virando noite: tudo num só lugar ---------------- */
    const SUN = V3(-0.45, 0.62, 0.35).normalize();
    const U = {
      uT: { value: 0 }, uNight: { value: 0 }, uClip: { value: 0 }, uRS: { value: 1 }, uPS: { value: 800 },
      uSun: { value: SUN }, uPL: { value: V3() }, uPLC: { value: new T.Color(0.75, 1.0, 0.4) },
      uFogDay: { value: new T.Color("#ab9774") }, uFogNight: { value: new T.Color("#0a1220") }, uFogD: { value: 0.03 },
    };
    const COM = `uniform float uT, uNight, uClip, uFogD; uniform vec3 uSun, uPL, uPLC, uFogDay, uFogNight;
      float hs(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      float vnoise(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f); return mix(mix(hs(i), hs(i + vec2(1, 0)), f.x), mix(hs(i + vec2(0, 1)), hs(i + vec2(1, 1)), f.x), f.y); }
      void clipW(vec3 W){ if (uClip > 0.5 && W.y < -0.01) discard; }
      vec3 fogIt(vec3 c, vec3 W){ float d = length(W - cameraPosition) * uFogD; return mix(c, mix(uFogDay, uFogNight, uNight), clamp(1.0 - exp(-d * d), 0.0, 1.0)); }
      vec3 lightAt(vec3 N, vec3 W, float toon){
        float w = dot(N, normalize(uSun)) * 0.5 + 0.5;
        float lit = mix(smoothstep(0.12, 0.95, w), smoothstep(0.46, 0.56, w) * 0.72 + 0.28 * w, toon);
        vec3 sunC = mix(vec3(1.0, 0.84, 0.62), vec3(0.3, 0.36, 0.55) * 0.5, uNight);
        vec3 skyC = mix(vec3(0.62, 0.57, 0.47), vec3(0.06, 0.08, 0.15), uNight);
        vec3 gC = mix(vec3(0.36, 0.32, 0.22), vec3(0.02, 0.03, 0.04), uNight);
        vec3 c = mix(gC, skyC, N.y * 0.5 + 0.5) * 0.85 + sunC * lit * 0.72;
        vec3 L = uPL - W; float d = length(L); c += uPLC * (max(dot(N, L / max(d, 1e-3)), 0.0) * 0.75 + 0.25) / (1.0 + d * d * 0.9) * uNight * 1.6;
        return c; }
    `;
    const VS_STD = `varying vec3 vW, vN; varying vec2 vU; void main(){ vU = uv; vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; vN = normalize(mat3(modelMatrix) * normal); gl_Position = projectionMatrix * viewMatrix * w; }`;
    const shader = (vs, fs, own, o = {}) => K(new T.ShaderMaterial(Object.assign({ uniforms: Object.assign({}, U, own || {}), vertexShader: "uniform float uT, uNight, uClip;\n" + vs, fragmentShader: COM + fs }, o)));
    const TOON_FS = `uniform vec3 uCol; uniform sampler2D uMap; uniform float uHasMap, uHot, uToon; varying vec3 vW, vN; varying vec2 vU;
      void main(){ clipW(vW); vec3 N = normalize(vN); if (!gl_FrontFacing) N = -N; vec3 base = uCol;
        if (uHasMap > 0.5) { vec4 tx = texture2D(uMap, vU); if (tx.a < 0.4) discard; base *= tx.rgb; }
        vec3 V = normalize(cameraPosition - vW); float rim = pow(1.0 - max(dot(N, V), 0.0), 3.0);
        vec3 c = base * lightAt(N, vW, uToon) + rim * mix(vec3(0.22, 0.26, 0.2), vec3(0.08, 0.12, 0.08), uNight) * 0.5;
        c += uHot * (base * 0.3 + vec3(1.0, 0.85, 0.45) * rim * 0.9);
        gl_FragColor = vec4(fogIt(c, vW), 1.0); }`;
    const toon = (col, o = {}) => shader(VS_STD, TOON_FS, { uCol: { value: new T.Color(col) }, uMap: { value: o.map || null }, uHasMap: { value: o.map ? 1 : 0 }, uHot: { value: 0 }, uToon: { value: o.toon == null ? 1 : o.toon } }, { side: o.side || T.FrontSide });
    const OUTM = shader(`uniform float uOW; varying vec3 vW; void main(){ vec4 w = modelMatrix * vec4(position + normal * uOW, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,
      `varying vec3 vW; void main(){ clipW(vW); gl_FragColor = vec4(fogIt(mix(vec3(0.17, 0.12, 0.1), vec3(0.02, 0.03, 0.05), uNight), vW), 1.0); }`, { uOW: { value: 0.0065 } }, { side: T.BackSide });
    const outline = (m) => { const o = new T.Mesh(m.geometry, OUTM); m.add(o); return m; };
    const mesh = (geo, mat, parent, x = 0, y = 0, z = 0, ol = false) => { const m = new T.Mesh(K(geo), mat); m.position.set(x, y, z); (parent || scene).add(m); if (ol) outline(m); return m; };

    /* ---------------- o céu: neblina clara de verão de dia, estrelas e lua à noite ---------------- */
    const MOON = V3(-0.12, 0.3, -1).normalize();
    const sky = new T.Mesh(K(new T.SphereGeometry(450, 48, 24)), shader("varying vec3 vD; void main(){ vD = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }",
      `uniform vec3 uM; varying vec3 vD; void main(){ vec3 d = normalize(vD); float h = d.y;
        vec3 day = mix(vec3(0.74, 0.64, 0.47), vec3(0.5, 0.45, 0.38), smoothstep(0.0, 0.7, h));
        vec2 sp = d.xz / max(h + 0.15, 0.05); float cl = vnoise(sp * 1.2 + vec2(uT * 0.012, 0.0)) * 0.6 + vnoise(sp * 3.3 - uT * 0.02) * 0.4;
        day = mix(day, vec3(0.3, 0.26, 0.22), smoothstep(0.45, 0.85, cl) * 0.7 * smoothstep(0.0, 0.25, h));
        vec3 sd = normalize(vec3(0.35, 0.22, -0.9)); float sm2 = dot(d, sd); day += vec3(1.0, 0.55, 0.22) * (smoothstep(0.9985, 0.9992, sm2) * 0.6 + pow(max(sm2, 0.0), 40.0) * 0.35);
        vec3 night = mix(vec3(0.06, 0.09, 0.17), vec3(0.01, 0.015, 0.045), smoothstep(-0.05, 0.6, h));
        for (int L = 0; L < 2; L++) { float sc = 220.0 + float(L) * 160.0; vec3 q = d * sc, i = floor(q); float s = hs(i.xy + i.z * 7.0 + float(L) * 9.0);
          vec2 o = vec2(hs(i.xz + 2.1), hs(i.yz + 5.3)) * 0.6 + 0.2; float tw = 0.6 + 0.4 * sin(uT * (1.0 + s * 2.0) + s * 40.0);
          night += vec3(0.85, 0.9, 1.0) * step(0.985, s) * smoothstep(0.1, 0.0, length(fract(q.xy) - o)) * tw * step(0.03, h); }
        float m = dot(d, uM); night += vec3(1.0, 0.97, 0.88) * smoothstep(0.9993, 0.9996, m) + vec3(0.3, 0.34, 0.45) * pow(max(m, 0.0), 30.0) * 0.6;
        vec2 fx = normalize(vec2(0.8, -0.55)); float fire = pow(max(dot(normalize(d.xz + 1e-4), fx), 0.0), 6.0) * exp(-max(h, 0.0) * 9.0) * smoothstep(-0.04, 0.02, h);
        night += vec3(0.6, 0.16, 0.05) * fire * (0.55 + 0.1 * sin(uT * 0.8));
        gl_FragColor = vec4(mix(day, night, uNight), 1.0); }`, { uM: { value: MOON } }, { side: T.BackSide, depthWrite: false }));
    scene.add(sky);

    /* ---------------- o chão ---------------- */
    const TX0 = -34, TX1 = 30, TZ0 = -44, TZ1 = 20, SEG = small ? 200 : 320;
    const tg = K(new T.PlaneGeometry(TX1 - TX0, TZ1 - TZ0, SEG, SEG)); tg.rotateX(-Math.PI / 2); tg.translate((TX0 + TX1) / 2, 0, (TZ0 + TZ1) / 2);
    { const pa = tg.attributes.position, aM = new Float32Array(pa.count * 2);
      for (let i = 0; i < pa.count; i++) { const x = pa.getX(i), z = pa.getZ(i); pa.setY(i, H(x, z)); aM[i * 2] = sm(0.95, 0.35, Math.abs(x - pathX(z))) * (0.7 + 0.3 * vn(x * 2, z * 2));
        for (const D of DOORS) aM[i * 2 + 1] = Math.max(aM[i * 2 + 1], sm(1.5, 0.5, Math.hypot((x - (D.xf - 0.7)) * 0.8, (z - D.z) * 0.7))); }
      tg.setAttribute("aM", new T.BufferAttribute(aM, 2)); tg.computeVertexNormals(); }
    const ground = new T.Mesh(tg, shader(`attribute vec2 aM; varying vec2 vM; varying vec3 vW, vN; void main(){ vM = aM; vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; vN = normal; gl_Position = projectionMatrix * viewMatrix * w; }`,
      `uniform vec4 uDoor[2]; varying vec2 vM; varying vec3 vW, vN;
      void main(){ clipW(vW);
        for (int i = 0; i < 2; i++) { vec4 d = uDoor[i]; if (vW.x > d.x - 0.03 && vW.x < d.x + 3.3 && abs(vW.z - d.y) < d.z && vW.y < d.w) discard; }
        vec3 N = normalize(vN); float sl = 1.0 - N.y; float n = vnoise(vW.xz * 0.9), n2 = vnoise(vW.xz * 5.0 + 3.0), n3 = vnoise(vW.xz * 0.25 + 9.0);
        vec3 g = mix(vec3(0.36, 0.4, 0.2), vec3(0.58, 0.56, 0.3), n * 0.7 + n3 * 0.3); g = mix(g, vec3(0.42, 0.55, 0.36), smoothstep(0.6, 0.9, n2) * 0.3);
        vec3 earth = mix(vec3(0.5, 0.38, 0.27), vec3(0.68, 0.55, 0.4), n2); earth *= 0.82 + 0.3 * vnoise(vec2(vW.x * 3.0 + vW.z * 3.0, vW.y * 0.8)); earth = mix(earth, vec3(0.34, 0.46, 0.24), smoothstep(0.55, 0.85, vnoise(vW.xz * 1.7 + vW.y * 1.3)) * 0.65);
        vec3 path = mix(vec3(0.68, 0.64, 0.46), vec3(0.52, 0.57, 0.35), n * 0.6);
        vec3 base = mix(g, earth, clamp(smoothstep(0.3, 0.55, sl + (n2 - 0.5) * 0.25) + vM.y * 0.6, 0.0, 1.0)); base = mix(base, path, vM.x);
        base = mix(base, vec3(0.15, 0.23, 0.19), smoothstep(0.05, -0.6, vW.y) * 0.85);
        gl_FragColor = vec4(fogIt(base * lightAt(N, vW, 0.0), vW), 1.0); }`,
      { uDoor: { value: DOORS.map((D) => new T.Vector4(D.xf, D.z, D.hw, D.y0 + D.h)) } }));
    scene.add(ground);

    /* ---------------- a água: reflexo de verdade (a cena desenhada de novo, espelhada) ---------------- */
    const DB = [-36, -48, 50, 72], DN = 160, dd = new Uint8Array(DN * DN * 4);
    for (let j = 0; j < DN; j++) for (let i = 0; i < DN; i++) { const v = Math.max(0, Math.min(1, -H(DB[0] + (i + 0.5) / DN * DB[2], DB[1] + (j + 0.5) / DN * DB[3]) / 2)); dd.set([v * 255, 0, 0, 255], (j * DN + i) * 4); }
    const depthTex = K(new T.DataTexture(dd, DN, DN)); depthTex.magFilter = depthTex.minFilter = T.LinearFilter; depthTex.needsUpdate = true;
    let rt = null; const rtS = small ? 0.4 : 0.62; const RM = new T.Matrix4();
    const wg = K(new T.PlaneGeometry(64, 90)); wg.rotateX(-Math.PI / 2); wg.translate(-12, 0, -12);
    const water = new T.Mesh(wg, shader("varying vec3 vW; void main(){ vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }",
      `uniform sampler2D tR, tD; uniform mat4 uRM; uniform vec4 uDB; varying vec3 vW;
      void main(){ vec3 V = normalize(cameraPosition - vW); vec2 p = vW.xz;
        float n1 = vnoise(p * 1.3 + vec2(uT * 0.22, uT * 0.15)), n2 = vnoise(p * 3.1 - vec2(uT * 0.3, -uT * 0.25));
        vec4 rp = uRM * vec4(vW, 1.0); rp.xy += (vec2(n1, n2) - 0.5) * 0.05 * rp.w;
        vec3 refl = texture2DProj(tR, rp).rgb;
        float depth = texture2D(tD, (p - uDB.xy) / uDB.zw).r * 2.0;
        float fr = 0.5 + 0.45 * pow(1.0 - max(V.y, 0.0), 2.0);
        vec3 deep = mix(vec3(0.27, 0.29, 0.22), vec3(0.01, 0.015, 0.03), uNight);
        vec3 c = mix(deep, refl * mix(vec3(0.86, 0.8, 0.68), vec3(1.0), uNight), fr);
        c += vec3(0.9, 0.95, 0.9) * pow(max(n1 - 0.62, 0.0), 2.0) * 0.6 * (1.0 - uNight);
        gl_FragColor = vec4(fogIt(c, vW), mix(0.3, 0.97, smoothstep(0.0, 0.55, depth))); }`,
      { tR: { value: null }, tD: { value: depthTex }, uRM: { value: RM }, uDB: { value: new T.Vector4(...DB) } }, { transparent: true, depthWrite: false }));
    water.renderOrder = 5; scene.add(water);
    const mirror = new T.PerspectiveCamera(); const _t = V3(), _u = V3();
    function updMirror() {
      camera.updateMatrixWorld(); const cp = camera.position; mirror.position.set(cp.x, -cp.y, cp.z);
      _t.set(0, 0, -1).applyQuaternion(camera.quaternion).add(cp); _t.y = -_t.y; _u.set(0, 1, 0).applyQuaternion(camera.quaternion); _u.y = -_u.y;
      mirror.up.copy(_u); mirror.lookAt(_t); mirror.projectionMatrix.copy(camera.projectionMatrix); mirror.updateMatrixWorld(); mirror.matrixWorldInverse.copy(mirror.matrixWorld).invert();
      RM.set(0.5, 0, 0, 0.5, 0, 0.5, 0, 0.5, 0, 0, 0.5, 0.5, 0, 0, 0, 1).multiply(mirror.projectionMatrix).multiply(mirror.matrixWorldInverse);
    }

    /* ---------------- o capim, as flores e as folhas grandes da frente ---------------- */
    const avoid = (x, z) => {
      if (Math.hypot(x - OVERP.x, z - OVERP.z) < 2.6) return true;
      for (const D of DOORS) if (Math.abs(z - D.z) < D.hw + 0.25 && x > D.xf - 0.9 && x < D.xf + 3.4) return true;
      if (Math.abs(x - 1.25) < 0.7 && Math.abs(z - 2.8) < 1.9) return true; // o chão batido do balanço
      return false;
    };
    { const N = small ? 7000 : 16000, blade = K(new T.PlaneGeometry(0.06, 0.6, 1, 3)); blade.translate(0, 0.3, 0);
      { const p = blade.attributes.position; for (let i = 0; i < p.count; i++) p.setX(i, p.getX(i) * (1 - p.getY(i) / 0.6 * 0.85)); }
      const im = new T.InstancedMesh(blade, shader(`attribute vec3 aC; uniform float uRS; varying vec3 vC, vW; varying float vH;
          void main(){ vec4 w = modelMatrix * instanceMatrix * vec4(position, 1.0); vec3 b = (modelMatrix * instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0)).xyz; float k = uv.y; vH = k;
            float wind = sin(uT * 1.2 + b.x * 0.4 + b.z * 0.3) * 0.6 + sin(uT * 2.3 + b.z * 0.9) * 0.25; w.x += wind * k * k * 0.12; w.z += wind * k * k * 0.08; vW = w.xyz; vC = aC; gl_Position = projectionMatrix * viewMatrix * w; }`,
        `varying vec3 vC, vW; varying float vH; void main(){ clipW(vW); vec3 c = vC * mix(0.42, 1.2, vH) * lightAt(normalize(vec3(-0.3, 1.0, 0.2)), vW, 0.0); gl_FragColor = vec4(fogIt(c, vW), 1.0); }`, {}, { side: T.DoubleSide }), N);
      const aC = new Float32Array(N * 3), m = new T.Matrix4(), q = new T.Quaternion(); let k = 0, tries = 0;
      while (k < N && tries++ < N * 8) {
        const far = rnd() < 0.25, x = far ? -10 + rnd() * 32 : -2 + rnd() * 12, z = far ? -34 + rnd() * 50 : -16 + rnd() * 28;
        const y = H(x, z); if (y < 0.03 || avoid(x, z)) continue; const sl = slope(x, z); if (sl > 1.3 && rnd() < 0.6) continue;
        const pm = sm(0.95, 0.35, Math.abs(x - pathX(z))); if (pm > 0.4 && rnd() < 0.9) continue;
        const nearPond = sm(1.2, 0.2, Math.abs(x - pondX(z) - 0.4)); let tall = 0.45 + rnd() * 0.6 + nearPond * 0.6; if (sl > 1.3) tall *= 0.6;
        for (const D of DOORS) if (Math.abs(z - D.z) < 2.8 && x > D.xf - 2.6 && x < D.xf + 0.2) tall *= 0.32; if (x > pondX(z) + 0.9 && x < hillX(z) + 0.1) tall *= 0.38; tall *= 0.45 + 0.55 * sm(2.6, 6.5, Math.hypot(x - OVERP.x, z - OVERP.z));
        q.setFromEuler(new T.Euler((rnd() - 0.5) * 0.35, rnd() * Math.PI, (rnd() - 0.5) * 0.35)); m.compose(V3(x, y - 0.03, z), q, V3(0.8 + rnd() * 0.8, tall, 1)); im.setMatrixAt(k, m);
        const g = rnd(); aC.set([0.4 + g * 0.24 + pm * 0.1, 0.45 + g * 0.16, 0.2 + g * 0.06], k * 3); k++;
      }
      im.count = k; im.geometry.setAttribute("aC", new T.InstancedBufferAttribute(aC, 3)); im.frustumCulled = false; scene.add(im);
      // folhas largas bem na frente da câmera, como no quadro do filme
      const big = K(new T.PlaneGeometry(0.11, 1.2, 1, 5)); big.translate(0, 0.6, 0); { const p = big.attributes.position; for (let i = 0; i < p.count; i++) p.setX(i, p.getX(i) * (1 - p.getY(i) / 1.2 * 0.9)); }
      big.setAttribute("aC", new T.InstancedBufferAttribute(new Float32Array(18 * 3).map((_, i) => [0.36, 0.6, 0.24][i % 3] * (0.85 + rnd() * 0.3)), 3));
      const bm = new T.InstancedMesh(big, im.material, 18); for (let i = 0; i < 18; i++) { const x = OVERP.x - 0.9 - rnd() * 1.3, z = OVERP.z - 1.6 - rnd() * 1.2; q.setFromEuler(new T.Euler((rnd() - 0.5) * 0.9, rnd() * 3, (rnd() - 0.5) * 0.9)); m.compose(V3(x, Math.max(H(x, z), -0.2) - 0.05, z), q, V3(0.8, 0.5 + rnd() * 0.5, 0.8)); bm.setMatrixAt(i, m); }
      bm.frustumCulled = false; scene.add(bm); }
    { const N = small ? 150 : 300, fp = new Float32Array(N * 3), fc = new Float32Array(N * 3); let k = 0, tries = 0;
      while (k < N && tries++ < N * 10) { const x = -1 + rnd() * 10, z = -14 + rnd() * 22, y = H(x, z); if (y < 0.05 || avoid(x, z) || sm(0.95, 0.35, Math.abs(x - pathX(z))) > 0.3) continue; fp.set([x, y + 0.15 + rnd() * 0.35, z], k * 3); fc.set(rnd() < 0.6 ? [0.78, 0.74, 0.66] : [0.75, 0.62, 0.3], k * 3); k++; }
      const g = K(new T.BufferGeometry()); g.setAttribute("position", new T.BufferAttribute(fp.slice(0, k * 3), 3)); g.setAttribute("aC", new T.BufferAttribute(fc.slice(0, k * 3), 3));
      const fl = new T.Points(g, shader(`attribute vec3 aC; uniform float uPS, uRS; varying vec3 vC, vW; void main(){ vC = aC; vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; vec4 mv = viewMatrix * w; gl_PointSize = clamp(uPS * uRS * 0.05 / -mv.z, 1.0, 14.0); gl_Position = projectionMatrix * mv; }`,
        `varying vec3 vC, vW; void main(){ clipW(vW); if (length(gl_PointCoord - 0.5) > 0.5) discard; gl_FragColor = vec4(fogIt(vC * lightAt(vec3(0.0, 1.0, 0.0), vW, 0.0) * 1.15, vW), 1.0); }`));
      fl.frustumCulled = false; scene.add(fl); }

    /* ---------------- as árvores: troncos com casca e copas feitas de cachos de folhas ---------------- */
    const leafTex = (() => { const c = document.createElement("canvas"); c.width = c.height = 128; const g = c.getContext("2d");
      for (let i = 0; i < 90; i++) { const a = rnd() * 6.28, r = Math.sqrt(rnd()) * 50, x = 64 + Math.cos(a) * r, y = 64 + Math.sin(a) * r * 0.9, v = 110 + Math.floor(rnd() * 145); g.fillStyle = `rgb(${v},${v},${v})`; g.save(); g.translate(x, y); g.rotate(rnd() * 6.28); g.beginPath(); g.ellipse(0, 0, 9, 4, 0, 0, 7); g.fill(); g.restore(); }
      return K(new T.CanvasTexture(c)); })();
    const cards = [];
    function canopy(c, R, n, tint, scale = 1) { for (let i = 0; i < n; i++) { const a = rnd() * 6.28, b = Math.acos(2 * rnd() - 1), r = Math.cbrt(rnd()) * R; const p = V3(Math.sin(b) * Math.cos(a) * r, Math.cos(b) * r * 0.7, Math.sin(b) * Math.sin(a) * r).add(c); const nn = p.clone().sub(c).add(V3(0, R * 0.5, 0)).normalize(); const v = 0.85 + rnd() * 0.3; cards.push([p, (0.9 + rnd() * 0.9) * scale, [tint[0] * v, tint[1] * v, tint[2] * v], nn, rnd() * 6.28]); } }
    const barkM = shader(VS_STD, `varying vec3 vW, vN; varying vec2 vU; void main(){ clipW(vW); vec3 N = normalize(vN); float s = vnoise(vec2(vU.y * 9.0, vU.x * 40.0));
      vec3 b = mix(vec3(0.27, 0.24, 0.2), vec3(0.5, 0.48, 0.42), s); b = mix(b, vec3(0.32, 0.42, 0.22), smoothstep(0.35, 0.85, N.y + vnoise(vU * 20.0) * 0.4) * 0.6);
      gl_FragColor = vec4(fogIt(b * lightAt(N, vW, 0.0), vW), 1.0); }`);
    function limbTube(pts, r0, r1) { const curve = new T.CatmullRomCurve3(pts), TS = 20, RS = 8, g = K(new T.TubeGeometry(curve, TS, 1, RS, false)); const p = g.attributes.position;
      for (let i = 0; i <= TS; i++) { const c = curve.getPointAt(i / TS), r = r0 + (r1 - r0) * Math.pow(i / TS, 0.8); for (let j = 0; j <= RS; j++) { const k = i * (RS + 1) + j; p.setXYZ(k, c.x + (p.getX(k) - c.x) * r, c.y + (p.getY(k) - c.y) * r, c.z + (p.getZ(k) - c.z) * r); } }
      g.computeVertexNormals(); scene.add(new T.Mesh(g, barkM)); return curve; }
    function tree(x, z, h, lean, R, tint, extra) {
      const b = V3(x, H(x, z) - 0.3, z), top = b.clone().add(V3(lean.x, h, lean.z));
      const trunk = limbTube([b, b.clone().lerp(top, 0.35).add(V3(lean.x * 0.15, 0, lean.z * 0.1)), b.clone().lerp(top, 0.7).add(V3(-lean.x * 0.08, 0, 0)), top], 0.08 + h * 0.022, 0.05);
      canopy(top.clone().add(V3(0, 0.4, 0)), R, 55, tint);
      for (let i = 0; i < 4; i++) { const s = trunk.getPointAt(0.55 + i * 0.1), a = rnd() * 6.28, L = 1.4 + rnd() * 1.6, e = s.clone().add(V3(Math.cos(a) * L, 0.6 + rnd() * 1.2, Math.sin(a) * L)); limbTube([s, s.clone().lerp(e, 0.5).add(V3(0, 0.25, 0)), e], 0.05 + h * 0.008, 0.02); canopy(e, R * 0.65, 28, tint); }
      if (extra) extra(trunk);
      return trunk;
    }
    const G1 = [0.4, 0.48, 0.27], G2 = [0.48, 0.53, 0.29], G3 = [0.33, 0.4, 0.29];
    // a árvore do balanço, no alto do barranco, com um galho comprido por cima do caminho
    const SW = { x: 1.25, z: 3.7, py: 4.35 };
    tree(hillX(4.6) + 1.9, 4.6, 7.5, V3(-0.9, 0, 0.2), 1.9, G2, (trunk) => { const s = trunk.getPointAt(0.62), e = V3(SW.x - 1.0, SW.py + 0.35, SW.z - 0.1); limbTube([s, s.clone().lerp(e, 0.4).add(V3(0, 0.5, 0)), V3(SW.x + 0.6, SW.py + 0.25, SW.z), e], 0.13, 0.04); canopy(e.clone().add(V3(0, 0.6, 0)), 1.3, 36, G1); canopy(V3(SW.x + 1.2, SW.py + 1.0, SW.z), 1.2, 30, G2); });
    tree(hillX(-4) + 2.4, -4.2, 9.5, V3(-1.2, 0, 0.3), 2.3, G1);
    tree(hillX(-11) + 2.0, -11, 10.5, V3(-1.6, 0, -0.4), 2.5, G3);
    tree(hillX(6.5) + 2.6, 6.5, 8.5, V3(-1.0, 0, 0.6), 2.2, G1);
    tree(hillX(-17) + 1.5, -17, 9, V3(-0.8, 0, 0), 2.2, G2);
    tree(-9, -14, 6.5, V3(1.0, 0, 0.4), 2.0, G3); // a árvore torta do outro lado da água
    for (let i = 0; i < 26; i++) { const z = -42 + i * 2.4 + rnd() * 1.5, x = -27 - rnd() * 6; tree(x, z, 7 + rnd() * 6, V3((rnd() - 0.5) * 1.5, 0, 0), 2.2 + rnd(), [G3[0] * 0.9, G3[1] * 0.95, G3[2]]); }
    for (let i = 0; i < 14; i++) { const z = -38 + i * 4.2, x = hillX(z) + 6 + rnd() * 8; tree(x, z, 9 + rnd() * 5, V3(-1, 0, 0), 2.6, G1); }
    // moitas de capim alto em cima e na beira do barranco
    for (let i = 0; i < (small ? 70 : 140); i++) { const z = -24 + rnd() * 34, x = hillX(z) + 0.2 + rnd() * 3.5; if (avoid(x, z)) continue; canopy(V3(x, H(x, z) + 0.25, z), 0.6 + rnd() * 0.6, 10, rnd() < 0.5 ? G2 : G1, 0.55); }
    { const n = cards.length, geo = K(new T.PlaneGeometry(1, 1)); const aC = new Float32Array(n * 3), aN = new Float32Array(n * 3), aR = new Float32Array(n);
      const leaves = new T.InstancedMesh(geo, shader(`attribute vec3 aC, aN; attribute float aR; varying vec3 vC, vN, vW; varying vec2 vU;
          void main(){ vec3 c = (modelMatrix * instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0)).xyz; float s = length(instanceMatrix[0].xyz);
            c += vec3(sin(uT * 0.8 + c.x * 0.3 + c.z * 0.2), sin(uT * 1.1 + c.z * 0.4) * 0.4, cos(uT * 0.7 + c.z * 0.3)) * 0.04 * s;
            float cs = cos(aR), sn = sin(aR); vec2 p = mat2(cs, sn, -sn, cs) * position.xy; vU = uv; vC = aC; vN = aN; vW = c;
            vec4 mv = viewMatrix * vec4(c, 1.0); mv.xy += p * s; gl_Position = projectionMatrix * mv; }`,
        `uniform sampler2D uLeaf; varying vec3 vC, vN, vW; varying vec2 vU; void main(){ clipW(vW); vec4 t = texture2D(uLeaf, vU); if (t.a < 0.5) discard; vec3 c = vC * (0.55 + 0.6 * t.r) * lightAt(normalize(vN), vW, 0.0); gl_FragColor = vec4(fogIt(c, vW), 1.0); }`,
        { uLeaf: { value: leafTex } }, { side: T.DoubleSide }), n);
      const m = new T.Matrix4(), q = new T.Quaternion(); cards.forEach(([p, s, c, nn, r], i) => { m.compose(p, q, V3(s, s, s)); leaves.setMatrixAt(i, m); aC.set(c, i * 3); aN.set([nn.x, nn.y, nn.z], i * 3); aR[i] = r; });
      geo.setAttribute("aC", new T.InstancedBufferAttribute(aC, 3)); geo.setAttribute("aN", new T.InstancedBufferAttribute(aN, 3)); geo.setAttribute("aR", new T.InstancedBufferAttribute(aR, 1)); leaves.frustumCulled = false; scene.add(leaves); }

    /* ---------------- a guerra ao redor: casas queimadas, postes tortos e os aviões passando ---------------- */
    const charM = toon("#1f1914", { toon: 0.3 }), charL = toon("#3a2e24", { toon: 0.3 }), rubM = toon("#5a4e44", { toon: 0.3 });
    const zincM = shader(VS_STD, `varying vec3 vW, vN; varying vec2 vU; void main(){ clipW(vW); vec3 N = normalize(vN); if (!gl_FrontFacing) N = -N; float rib = 0.7 + 0.3 * sin(vU.x * 90.0); vec3 b = mix(vec3(0.35, 0.3, 0.27), vec3(0.5, 0.24, 0.12), vnoise(vU * 8.0)) * rib; gl_FragColor = vec4(fogIt(b * lightAt(N, vW, 0.3), vW), 1.0); }`, {}, { side: T.DoubleSide });
    function ruin(x, z, sc, rot) {
      const g = new T.Group(); g.position.set(x, H(x, z) - 0.05, z); g.rotation.y = rot; g.scale.setScalar(sc); scene.add(g);
      const posts = [[-2, -1.5, 2.6], [2, -1.5, 1.4], [-2, 1.5, 1.9], [2, 1.5, 2.8], [0, -1.5, 1.1], [0, 1.5, 2.2]];
      for (const [px, pz, h] of posts) { const m = mesh(new T.BoxGeometry(0.16, h, 0.16), charM, g, px, h / 2, pz); m.rotation.set((rnd() - 0.5) * 0.25, 0, (rnd() - 0.5) * 0.25); }
      const beam = mesh(new T.BoxGeometry(4.4, 0.14, 0.16), charM, g, 0, 2.2, -1.5); beam.rotation.z = -0.32;
      const beam2 = mesh(new T.BoxGeometry(0.14, 0.14, 3.4), charL, g, -2, 1.6, 0); beam2.rotation.x = 0.5;
      for (let i = 0; i < 3; i++) { const sh = mesh(new T.PlaneGeometry(1.8, 1.2), zincM, g, (rnd() - 0.5) * 3, 0.35 + rnd() * 0.5, (rnd() - 0.5) * 2.4); sh.rotation.set(-Math.PI / 2 + (rnd() - 0.5) * 0.9, rnd() * 3, (rnd() - 0.5) * 0.5); }
      for (let i = 0; i < 14; i++) { const r = mesh(new T.DodecahedronGeometry(0.15 + rnd() * 0.35, 0), rnd() < 0.5 ? rubM : charL, g, (rnd() - 0.5) * 4.4, 0.05, (rnd() - 0.5) * 3.4); r.scale.y = 0.5; r.rotation.set(rnd() * 3, rnd() * 3, 0); }
      const chim = mesh(new T.BoxGeometry(0.5, 3.6, 0.5), rubM, g, 1.2, 1.8, 0.4); chim.rotation.z = 0.06; // a chaminé que sobrou de pé
    }
    ruin(-25, -6, 1.0, 0.3); ruin(-26.5, -16, 1.15, -0.4); ruin(-24.5, 4, 0.9, 1.2); ruin(-27, -28, 1.2, 0.1); ruin(hillX(-26) + 0.5, -26, 0.9, 0.8); ruin(-20, -36, 1.3, -0.7);
    // postes de luz tortos com os fios caídos, como no pôster
    { const poles = []; for (let i = 0; i < 7; i++) { const x = -23 + (rnd() - 0.5) * 2, z = -34 + i * 7.5, b = V3(x, H(x, z) - 0.2, z), lean = V3((rnd() - 0.5) * 0.9, 0, (rnd() - 0.5) * 0.6), top = b.clone().add(V3(lean.x, 7.5, lean.z));
        const pole = new T.Mesh(K(new T.CylinderGeometry(0.09, 0.13, 7.6, 6)), charM); pole.position.copy(b).lerp(top, 0.5); pole.quaternion.setFromUnitVectors(V3(0, 1, 0), top.clone().sub(b).normalize()); scene.add(pole);
        const bar = mesh(new T.BoxGeometry(1.4, 0.1, 0.1), charM, null, top.x, top.y - 0.6, top.z); bar.rotation.z = (rnd() - 0.5) * 0.4; poles.push(top.clone().add(V3(0, -0.6, 0))); }
      const wm = K(new T.LineBasicMaterial({ color: "#1a1512" }));
      for (let i = 0; i < poles.length - 1; i++) for (const off of [-0.6, 0.6]) { const a = poles[i].clone().add(V3(off, 0, 0)), b = poles[i + 1].clone().add(V3(off, 0, 0)), pts = []; const sag = 1.2 + rnd() * (i % 3 === 0 ? 4 : 1.2); for (let k = 0; k <= 16; k++) { const t = k / 16; pts.push(a.clone().lerp(b, t).add(V3(0, -Math.sin(t * Math.PI) * sag, 0))); } scene.add(new T.Line(K(new T.BufferGeometry().setFromPoints(pts)), wm)); } }
    // os bombardeiros: silhuetas lá no alto, de vez em quando, e o ronco grave
    const bombers = new T.Group(); scene.add(bombers); bombers.visible = false;
    { const bm = K(new T.MeshBasicMaterial({ color: "#2e2a26", fog: false, transparent: true, opacity: 0.75 }));
      for (const [dx, dz] of [[0, 0], [-9, 7], [9, 7], [-18, 14], [18, 14]]) { const p = new T.Group(); p.position.set(dx, (rnd() - 0.5) * 2, dz); bombers.add(p);
        mesh(new T.CylinderGeometry(0.5, 0.35, 9, 8), bm, p).rotation.x = Math.PI / 2; mesh(new T.BoxGeometry(14, 0.12, 1.6), bm, p, 0, 0, -0.6); mesh(new T.BoxGeometry(4.4, 0.1, 0.9), bm, p, 0, 0.1, 4.0); mesh(new T.BoxGeometry(0.1, 1.8, 1.2), bm, p, 0, 0.9, 4.0); } }
    let bombT = 14;
    /* ---------------- o abrigo: portas de madeira, telhado de zinco e o túnel escuro ---------------- */
    const woodM = toon("#8d7c66", { toon: 0.5 }), woodD = toon("#6b5a48", { toon: 0.5 });
    const roofM = shader(VS_STD, `varying vec3 vW, vN; varying vec2 vU; void main(){ clipW(vW); vec3 N = normalize(vN); if (!gl_FrontFacing) N = -N; float n = vnoise(vU * vec2(6.0, 14.0)), rib = 0.72 + 0.28 * sin(vU.y * 120.0);
      vec3 b = mix(vec3(0.42, 0.38, 0.36), vec3(0.62, 0.3, 0.17), smoothstep(0.35, 0.75, n)) * rib; gl_FragColor = vec4(fogIt(b * lightAt(N, vW, 0.4), vW), 1.0); }`, {}, { side: T.DoubleSide });
    const tunnelM = (x0) => shader(VS_STD, `uniform float uX0; varying vec3 vW, vN; varying vec2 vU; void main(){ clipW(vW); vec3 N = normalize(vN); if (!gl_FrontFacing) N = -N; float k = smoothstep(0.1, 2.6, vW.x - uX0);
      vec3 b = mix(vec3(0.36, 0.28, 0.2), vec3(0.5, 0.4, 0.29), vnoise(vW.yz * 6.0 + vW.x)); vec3 c = b * lightAt(N, vW, 0.0) * mix(0.55, 0.05, k); gl_FragColor = vec4(fogIt(c, vW), 1.0); }`, { uX0: { value: x0 } }, { side: T.BackSide });
    for (const D of DOORS) {
      const { xf, y0, hw, h, z } = D;
      for (const s of [-1, 1]) { mesh(new T.BoxGeometry(0.11, h + 0.12, 0.11), woodM, null, xf, y0 + (h + 0.12) / 2, z + s * (hw + 0.055)); mesh(new T.BoxGeometry(1.1, 0.08, 0.08), woodD, null, xf + 0.55, y0 + h + 0.14, z + s * (hw + 0.06)); }
      mesh(new T.BoxGeometry(0.15, 0.13, hw * 2 + 0.34), woodM, null, xf, y0 + h + 0.08, z); mesh(new T.BoxGeometry(0.14, 0.05, hw * 2), woodD, null, xf - 0.02, y0 + 0.02, z);
      const rf = K(new T.PlaneGeometry(1.6, hw * 2 + 0.8, 1, 1)); rf.rotateX(-Math.PI / 2); const roof = new T.Mesh(rf, roofM); roof.position.set(xf + 0.45, y0 + h + 0.36, z); roof.rotation.z = 0.3; scene.add(roof);
      const tb = new T.Mesh(K(new T.BoxGeometry(3.25, h, hw * 2)), tunnelM(xf)); tb.position.set(xf + 1.62, y0 + h / 2, z); scene.add(tb);
    }
    const D0 = DOORS[0];
    // o pano pendurado na porta do abrigo
    { const cl = mesh(new T.PlaneGeometry(0.46, 0.78, 6, 8), toon("#d8ccae", { toon: 0.5, side: T.DoubleSide }), null, D0.xf + 0.22, D0.y0 + D0.h - 0.45, D0.z + 0.2); cl.rotation.y = -Math.PI / 2;
      const p = cl.geometry.attributes.position; for (let i = 0; i < p.count; i++) p.setZ(i, Math.sin(p.getX(i) * 22) * 0.025 * (0.6 - p.getY(i))); cl.geometry.computeVertexNormals(); }
    // lá dentro: o mosquiteiro e o futon; à noite os vaga-lumes ficam presos nele
    const NET = V3(D0.xf + 1.3, D0.y0 + 0.44, D0.z);
    mesh(new T.BoxGeometry(1.25, 0.08, 0.86), toon("#e9e2d2", { toon: 0.5 }), null, NET.x, D0.y0 + 0.04, NET.z);
    const net = mesh(new T.BoxGeometry(1.4, 0.86, 0.98), shader(VS_STD, `varying vec3 vW, vN; varying vec2 vU; void main(){ clipW(vW); float g = max(step(0.86, fract(vU.x * 34.0)), step(0.86, fract(vU.y * 26.0)));
      vec3 c = mix(vec3(0.72, 0.78, 0.7), vec3(0.75, 1.0, 0.45) * 1.6, uNight); gl_FragColor = vec4(fogIt(c, vW), 0.07 + g * 0.22 + uNight * 0.22); }`, {}, { transparent: true, depthWrite: false, side: T.DoubleSide }), null, NET.x, NET.y, NET.z);
    U.uPL.value.copy(NET).add(V3(-0.6, 0.3, 0));
    const netGlow = new T.Sprite(K(new T.SpriteMaterial({ map: ctx.glowTex, color: 0xc8ff70, transparent: true, opacity: 0, depthWrite: false, blending: T.AdditiveBlending }))); netGlow.scale.set(2.6, 1.8, 1); netGlow.position.copy(NET).add(V3(-0.5, 0.1, 0)); scene.add(netGlow);

    /* ---------------- os objetos do abrigo (cada um guarda uma atividade) ---------------- */
    const at = (x, z, dy = 0) => V3(x, H(x, z) + dy, z);
    const canvasTex = (w, h, draw) => { const c = document.createElement("canvas"); c.width = w; c.height = h; draw(c.getContext("2d"), w, h); const t = new T.CanvasTexture(c); t.anisotropy = 4; return K(t); };
    function lathe(pts, mat, parent) { const m = new T.Mesh(K(new T.LatheGeometry(pts.map(([a, b]) => V2(a, b)), 28)), mat); (parent || scene).add(m); return m; }
    const OBJ = {};
    // a lata de balas de frutas, em cima de uma pedra chata
    { const g = new T.Group(); g.position.copy(at(D0.xf - 0.5, D0.z + 1.5)); scene.add(g);
      mesh(new T.SphereGeometry(0.22, 14, 8), toon("#8f8c84", { toon: 0.5 }), g, 0, 0.02, 0).scale.set(1, 0.32, 0.85);
      const lab = canvasTex(256, 128, (c, w, h) => { c.fillStyle = "#c6352b"; c.fillRect(0, 0, w, h); const cols = ["#f4c542", "#6fbf4a", "#f3eee2", "#f08a3c", "#c94f8a", "#7fc1e8"]; for (let i = 0; i < 26; i++) { c.fillStyle = cols[i % cols.length]; c.beginPath(); c.arc(8 + (i * 37) % w, 34 + ((i * 53) % 70), 8, 0, 7); c.fill(); } c.fillStyle = "#f3e6c8"; c.fillRect(0, 0, w, 12); c.fillRect(0, h - 12, w, 12); c.fillStyle = "#fff"; c.font = "700 30px sans-serif"; c.textAlign = "center"; c.fillText("ドロップ", w * 0.25, 76); c.fillText("ドロップ", w * 0.75, 76); });
      const tin = new T.Mesh(K(new T.CylinderGeometry(0.06, 0.06, 0.15, 24)), [toon("#ffffff", { map: lab, toon: 0.6 }), toon("#cfc8b8", { toon: 0.6 }), toon("#cfc8b8", { toon: 0.6 })]); tin.position.y = 0.15; tin.rotation.y = 0.7; g.add(tin); outline(tin);
      OBJ.lata = { root: g, name: "a lata de balas", h: 0.4 }; }
    // o guarda-chuva de papel, rasgado, caído de lado na frente da porta
    { const g = new T.Group(); g.position.copy(at(D0.xf - 1.25, D0.z + 0.8)); scene.add(g); const u = new T.Group(); u.position.y = 0.42; u.rotation.set(0.15, -0.9, 1.75); g.add(u);
      const paper = canvasTex(512, 128, (c, w, h) => { c.fillStyle = "#e7b467"; c.fillRect(0, 0, w, h); for (let i = 0; i < 32; i++) { c.fillStyle = "rgba(120,70,30,0.5)"; c.fillRect(i * w / 32, 0, 2, h); } c.fillStyle = "rgba(160,90,40,0.25)"; c.fillRect(0, 0, w, 18); c.fillStyle = "#4a3a6a"; c.fillRect(0, 0, w, 10);
        c.globalCompositeOperation = "destination-out"; for (let i = 0; i < 9; i++) { const x = rnd() * w, y = 30 + rnd() * 80; c.beginPath(); c.moveTo(x, y); for (let k = 0; k < 6; k++) c.lineTo(x + (rnd() - 0.4) * 60, y + (rnd() - 0.5) * 40); c.fill(); } });
      const cone = new T.Mesh(K(new T.ConeGeometry(0.55, 0.26, 32, 1, true)), toon("#ffffff", { map: paper, toon: 0.6, side: T.DoubleSide })); u.add(cone);
      mesh(new T.CylinderGeometry(0.012, 0.012, 0.9, 6), woodD, u, 0, -0.32, 0); mesh(new T.CylinderGeometry(0.03, 0.04, 0.07, 10), toon("#3a2c5a", { toon: 0.6 }), u, 0, 0.12, 0);
      OBJ.guarda = { root: g, name: "o guarda-chuva", h: 0.95 }; }
    // a tina de madeira encostada no barranco
    { const g = new T.Group(); g.position.copy(at(D0.xf - 0.2, D0.z - 1.95)); scene.add(g); const t = new T.Group(); t.position.y = 0.36; t.rotation.set(0.0, 0.25, 1.25); g.add(t);
      const stave = canvasTex(256, 32, (c, w, h) => { c.fillStyle = "#b89a72"; c.fillRect(0, 0, w, h); for (let i = 0; i < 24; i++) { c.fillStyle = i % 2 ? "rgba(90,60,30,0.18)" : "rgba(255,240,210,0.12)"; c.fillRect(i * w / 24, 0, w / 24, h); c.fillStyle = "rgba(60,40,20,0.6)"; c.fillRect(i * w / 24, 0, 1.5, h); } });
      lathe([[0, 0.03], [0.34, 0.03], [0.35, 0.0], [0.38, 0.28], [0.36, 0.28], [0.335, 0.05], [0, 0.05]], toon("#ffffff", { map: stave, toon: 0.5, side: T.DoubleSide }), t);
      for (const y of [0.07, 0.22]) { const r = mesh(new T.TorusGeometry(0.36 + y * 0.1, 0.012, 6, 32), toon("#3d3a36", { toon: 0.5 }), t, 0, y, 0); r.rotation.x = Math.PI / 2; }
      for (let i = 0; i < 9; i++) mesh(new T.BoxGeometry(0.5, 0.012, 0.025), toon("#c9b28c", { toon: 0.5 }), t, 0, 0.07, -0.2 + i * 0.05); // a tábua de lavar dentro
      OBJ.tina = { root: g, name: "a tina de lavar", h: 0.9 }; }
    // o balde branco
    { const g = new T.Group(); g.position.copy(at(D0.xf - 1.05, D0.z - 1.7)); scene.add(g); const b = lathe([[0, 0], [0.13, 0], [0.135, 0.012], [0.165, 0.26], [0.172, 0.27], [0.16, 0.27], [0.128, 0.02], [0, 0.02]], toon("#ece7da", { toon: 0.6, side: T.DoubleSide }), g); outline(b);
      OBJ.balde = { root: g, name: "o balde", h: 0.55 }; }
    // a panela tombada e a tigela
    { const g = new T.Group(); g.position.copy(at(D0.xf - 0.7, D0.z - 1.12)); scene.add(g); const p = new T.Group(); p.position.set(0, 0.17, 0); p.rotation.set(0.15, 0.6, 1.5); g.add(p);
      const pm = toon("#b9bdc2", { toon: 0.6, side: T.DoubleSide }); lathe([[0, 0], [0.15, 0], [0.165, 0.02], [0.165, 0.17], [0.178, 0.18], [0.162, 0.18], [0.152, 0.02], [0, 0.02]], pm, p);
      const bail = mesh(new T.TorusGeometry(0.165, 0.007, 5, 20, Math.PI), pm, p, 0, 0.18, 0); bail.rotation.y = Math.PI / 2;
      const bowl = lathe([[0, 0], [0.07, 0], [0.16, 0.06], [0.17, 0.068], [0.158, 0.068], [0.066, 0.012], [0, 0.012]], toon("#efe9dc", { toon: 0.6, side: T.DoubleSide }), g); bowl.position.set(0.32, 0, 0.34); outline(bowl);
      OBJ.panela = { root: g, name: "a panela e a tigela", h: 0.5 }; }
    // as pedras do fogareiro, com lenha queimada
    { const c = at(D0.xf - 1.9, D0.z + 2.3); for (let i = 0; i < 7; i++) { const a = i / 7 * 6.28; mesh(new T.DodecahedronGeometry(0.09 + rnd() * 0.04, 0), toon("#8a877e", { toon: 0.5 }), null, c.x + Math.cos(a) * 0.26, c.y + 0.05, c.z + Math.sin(a) * 0.26); }
      for (let i = 0; i < 3; i++) { const s = mesh(new T.CylinderGeometry(0.025, 0.03, 0.42, 6), toon("#2c241e", { toon: 0.5 }), null, c.x, c.y + 0.06, c.z); s.rotation.set(Math.PI / 2, 0, i * 1.1); } }

    /* ---------------- as duas crianças (personagens originais) ---------------- */
    function makeGirl() { const p = ctx.person({ h: 0.95, skin: "#f2d4ba", hair: "#5a3a26", hairStyle: "trancas", ribbon: "#e8c24a", top: "#9ac48a", bottom: "#9ac48a", skirt: true, socks: "#f2ece0", shoes: "#8a4a2a", blush: true });
      p.sit(); p.arms.forEach((a, i) => { a.sh.rotation.x = Math.PI * 0.92; a.sh.rotation.z = (i ? -1 : 1) * 0.12; a.el.rotation.x = 0; }); return { g: p.g, knees: p.legs.map((l) => l.knee), head: p.head, hipY: p.hipY }; }
    function makeBoy() { const p = ctx.person({ h: 1.5, skin: "#e8c8a8", hair: "#3a2a1e", hairStyle: "curto", top: "#e8e6e0", bottom: "#5a6a7a", shoes: "#3a2a20" }); return { g: p.g, shoulders: p.arms.map((a) => a.sh), head: p.head }; }
    // o balanço: duas cordas no galho, a tábua, e a menina sentada
    const swing = new T.Group(); swing.position.set(SW.x, SW.py, SW.z); scene.add(swing); const RL = SW.py - H(SW.x, SW.z) - 0.55;
    const rope = toon("#b6a27e", { toon: 0.5 }); for (const s of [-1, 1]) mesh(new T.CylinderGeometry(0.01, 0.01, RL, 5), rope, swing, s * 0.21, -RL / 2, 0);
    mesh(new T.BoxGeometry(0.5, 0.04, 0.17), woodM, swing, 0, -RL, 0, true);
    const SE = makeGirl(); SE.g.visible = false; SE.g.position.set(0, -RL + 0.03 - SE.hipY, 0); swing.add(SE.g);
    const SI = makeBoy(); SI.g.visible = false; SI.g.position.copy(at(SW.x, SW.z - 1.8)); scene.add(SI.g);
    // luz de preenchimento nas crianças, para não virarem silhueta no contraluz
    const kidHemi = new T.HemisphereLight("#ffe8c8", "#5a4a30", 1.3); scene.add(kidHemi); const kidSun = new T.DirectionalLight("#ffd8a0", 1.0); kidSun.position.set(SW.x - 6, 10, SW.z + 8); kidSun.target = SI.g; scene.add(kidSun);
    const swHit = mesh(new T.BoxGeometry(0.9, 1.5, 2.4), new T.MeshBasicMaterial(), null, SW.x, H(SW.x, SW.z) + 0.95, SW.z - 0.5); swHit.visible = false; // alvo parado: o balanço se mexe
    OBJ.balanco = { root: swing, hit: swHit, name: "o balanço", h: 0, mark: V3(SW.x + 0.55, H(SW.x, SW.z) + 1.35, SW.z + 0.2), pose: V3(SW.x, H(SW.x, SW.z) + 0.8, SW.z) };

    /* ---------------- vaga-lumes: à noite, por todo lado, e presos no mosquiteiro ---------------- */
    const FF_VS = `attribute vec3 aS; attribute vec3 aB; uniform float uPS, uRS; varying float vA; varying vec3 vW;
      void main(){ vec3 p = position; float t = uT * 0.22 + aS.x * 30.0;
        p += vec3(sin(t * 1.3 + aS.y * 6.0) * 1.0 + sin(t * 0.37 + aS.z) * 1.6, sin(t * 0.9 + aS.z * 5.0) * 0.3, cos(t * 1.1 + aS.x * 7.0) * 1.0 + cos(t * 0.29 + aS.y) * 1.6) * aB.x;
        p = clamp(p, position - aB.yzy, position + aB.yzy); p.y = max(p.y, 0.1);
        float bl = smoothstep(0.42, 1.0, sin(uT * (1.1 + aS.y * 1.7) + aS.z * 40.0) * 0.5 + 0.5); vA = bl * uNight;
        vec4 w = modelMatrix * vec4(p, 1.0); vW = w.xyz; vec4 mv = viewMatrix * w; gl_PointSize = clamp(uPS * uRS * (0.11 + aS.x * 0.08) / -mv.z, 1.0, 56.0) * (0.3 + 0.7 * bl); gl_Position = projectionMatrix * mv; }`;
    const FF_FS = `varying float vA; varying vec3 vW; void main(){ vec2 d = gl_PointCoord - 0.5; float r = length(d); float a = smoothstep(0.5, 0.0, r), core = smoothstep(0.12, 0.0, r);
      gl_FragColor = vec4((vec3(0.75, 1.0, 0.36) * a * a + vec3(1.0, 1.0, 0.85) * core) * vA * 1.4, 1.0); }`;
    function swarm(list) { const n = list.length, g = K(new T.BufferGeometry()), p = new Float32Array(n * 3), s = new Float32Array(n * 3), b = new Float32Array(n * 3);
      list.forEach(([x, y, z, amp, bx, by], i) => { p.set([x, y, z], i * 3); s.set([rnd(), rnd(), rnd()], i * 3); b.set([amp, bx, by], i * 3); });
      g.setAttribute("position", new T.BufferAttribute(p, 3)); g.setAttribute("aS", new T.BufferAttribute(s, 3)); g.setAttribute("aB", new T.BufferAttribute(b, 3));
      const pts = new T.Points(g, shader(FF_VS, FF_FS, {}, { transparent: true, depthWrite: false, blending: T.AdditiveBlending })); pts.frustumCulled = false; scene.add(pts); return pts; }
    { const L = []; for (let i = 0; i < (small ? 1100 : 2200); i++) { const x = -9 + rnd() * 18, z = -16 + rnd() * 26; const y = Math.max(H(x, z), 0) + 0.25 + Math.pow(rnd(), 1.7) * 3.2; L.push([x, y, z, 1, 9, 9]); } swarm(L); }
    { const L = []; for (let i = 0; i < 130; i++) L.push([NET.x + (rnd() - 0.5) * 1.2, D0.y0 + 0.15 + rnd() * 0.7, NET.z + (rnd() - 0.5) * 0.8, 0.12, 0.62, 0.36]); swarm(L); }
    // cinzas caindo devagar, de dia e de noite
    { const n = small ? 500 : 1000, g = K(new T.BufferGeometry()), p = new Float32Array(n * 3); for (let i = 0; i < n; i++) p.set([-6 + rnd() * 16, rnd() * 5, -10 + rnd() * 20], i * 3); g.setAttribute("position", new T.BufferAttribute(p, 3));
      const ash = new T.Points(g, shader(`uniform float uPS, uRS; varying float vA, vR; varying vec3 vW; void main(){ vec3 p = position; p.y = mod(position.y - uT * (0.12 + fract(position.x * 7.3) * 0.1), 5.0) + 0.1; p.x += sin(uT * 0.5 + position.z * 3.0) * 0.4; p.z += cos(uT * 0.4 + position.x * 2.0) * 0.3;
          vec4 w = modelMatrix * vec4(p, 1.0); vW = w.xyz; vec4 mv = viewMatrix * w; vA = smoothstep(0.1, 0.6, p.y) * smoothstep(5.1, 4.2, p.y) * mix(0.75, 0.45, uNight); vR = uT * (fract(position.z * 9.1) - 0.5) * 3.0 + position.x; gl_PointSize = clamp(uPS * uRS * 0.04 / -mv.z, 1.0, 10.0); gl_Position = projectionMatrix * mv; }`,
        `varying float vA, vR; varying vec3 vW; void main(){ vec2 q = gl_PointCoord - 0.5; float c = cos(vR), s = sin(vR); q = mat2(c, -s, s, c) * q; if (length(q * vec2(1.0, 2.2)) > 0.45) discard; gl_FragColor = vec4(fogIt(mix(vec3(0.42, 0.4, 0.38), vec3(0.12, 0.11, 0.12), uNight), vW), vA); }`, {}, { transparent: true, depthWrite: false })); ash.frustumCulled = false; scene.add(ash); }
    // colunas de fumaça no horizonte: a cidade bombardeada
    for (let i = 0; i < 6; i++) { const a = -0.9 + i * 0.5 + rnd() * 0.2, r = 70 + rnd() * 40; const m = new T.Mesh(K(new T.PlaneGeometry(14 + rnd() * 8, 60)), shader("varying vec2 vU; varying vec3 vW; void main(){ vU = uv; vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }",
        `uniform float uSeed; varying vec2 vU; varying vec3 vW; void main(){ vec2 p = vec2((vU.x - 0.5) * (1.0 + vU.y * 2.2), vU.y); float n = vnoise(vec2(p.x * 3.0 + uSeed, p.y * 4.0 - uT * 0.06)) * 0.6 + vnoise(vec2(p.x * 7.0, p.y * 9.0 - uT * 0.1 + uSeed)) * 0.4;
          float a = smoothstep(0.5, 0.05, abs(p.x) + (n - 0.5) * 0.35) * smoothstep(0.0, 0.08, vU.y) * smoothstep(1.0, 0.55, vU.y) * (0.45 + n * 0.5);
          vec3 c = mix(vec3(0.18, 0.15, 0.13), vec3(0.42, 0.36, 0.3), n); c = mix(c, vec3(0.7, 0.25, 0.08), smoothstep(0.12, 0.0, vU.y) * 0.6);
          gl_FragColor = vec4(mix(c, vec3(0.1, 0.07, 0.07), uNight * 0.7), a * mix(0.8, 0.55, uNight)); }`, { uSeed: { value: rnd() * 20 } }, { transparent: true, depthWrite: false, side: T.DoubleSide }));
      m.position.set(Math.cos(a) * r - 10, 26, -Math.abs(Math.sin(a)) * r - 30); m.lookAt(OVERP.x, 26, OVERP.z); scene.add(m); }
    // feixes de luz atravessando as copas, de dia
    for (let i = 0; i < 4; i++) { const m = new T.Mesh(K(new T.PlaneGeometry(1.6 + rnd(), 13)), shader("varying vec2 vU; void main(){ vU = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }",
      `varying vec2 vU; void main(){ float a = smoothstep(0.0, 0.35, vU.x) * smoothstep(1.0, 0.65, vU.x) * smoothstep(0.0, 0.5, vU.y) * smoothstep(1.0, 0.75, vU.y); gl_FragColor = vec4(vec3(1.0, 0.82, 0.55), a * 0.11 * (1.0 - uNight) * (1.0 - uClip)); }`, {}, { transparent: true, depthWrite: false, blending: T.AdditiveBlending, side: T.DoubleSide }));
      m.position.set(0.8 + i * 1.5, 5.5, -3.5 - i * 2.2); m.rotation.set(0, -0.55, -0.55); scene.add(m); }

    /* ---------------- marcadores: um vaga-lume parado em cima de cada objeto que abre ---------------- */
    const sub = ctx.subjects().find((s) => s.name === "Ciências Humanas") || { name: "Ciências Humanas", acts: [] };
    const ORDER = ["lata", "guarda", "tina", "balanco", "balde", "panela"];
    const items = [], rootOf = new Map();
    ORDER.forEach((key, i) => { const o = OBJ[key], a = sub.acts[i]; if (!o || !a) return;
      const wp = o.root.getWorldPosition(V3()), mk = o.mark || wp.clone().add(V3(0, o.h + 0.25, 0));
      const halo = new T.Sprite(K(new T.SpriteMaterial({ map: ctx.glowTex, color: 0xfff0a0, transparent: true, opacity: 0.5, depthWrite: false, blending: T.AdditiveBlending }))); halo.scale.set(0.55, 0.55, 1); halo.position.copy(mk); scene.add(halo);
      const core = new T.Sprite(K(new T.SpriteMaterial({ map: ctx.glowTex, color: 0xfffbe0, transparent: true, opacity: 0.95, depthWrite: false }))); core.scale.set(0.13, 0.13, 1); core.position.copy(mk); scene.add(core);
      const it = { kind: "act", i, a, o, halo, core, mk: mk.clone(), hot: 0, mats: [], focus: o.pose || wp.clone().add(V3(0, o.h * 0.5, 0)) };
      o.root.traverse((m) => { const ms = Array.isArray(m.material) ? m.material : m.material ? [m.material] : []; ms.forEach((x) => { if (x.uniforms && x.uniforms.uHot && it.mats.indexOf(x) < 0) it.mats.push(x); }); });
      items.push(it); rootOf.set(o.root, it); if (o.hit) rootOf.set(o.hit, it); rootOf.set(core, it); rootOf.set(halo, it); });
    const netItem = { kind: "net", hot: 0, mats: [], focus: NET.clone() }; rootOf.set(net, netItem);
    const pickables = [...rootOf.keys()];

    /* ---------------- o som: cigarras e passarinhos de dia, grilos e sapos à noite ---------------- */
    let audio = null;
    try {
      const ac = new (window.AudioContext || window.webkitAudioContext)(), out = ac.createGain(); out.gain.value = 0; out.connect(ac.destination);
      const dayG = ac.createGain(), nightG = ac.createGain(); dayG.gain.value = 1; nightG.gain.value = 0; dayG.connect(out); nightG.connect(out);
      const nb = ac.createBuffer(1, ac.sampleRate * 2, ac.sampleRate), d = nb.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
      const noise = (dest, type, f, q, g) => { const s = ac.createBufferSource(); s.buffer = nb; s.loop = true; const bq = ac.createBiquadFilter(); bq.type = type; bq.frequency.value = f; bq.Q.value = q; const gg = ac.createGain(); gg.gain.value = g; s.connect(bq).connect(gg).connect(dest); s.start(); return { s, gg }; };
      const nodes = [];
      nodes.push(noise(out, "lowpass", 420, 0.7, 0.05).s);
      // cigarras: um chiado agudo que cresce e some
      for (let k = 0; k < 2; k++) { const c = noise(dayG, "bandpass", 4300 + k * 900, 7, 0.0); nodes.push(c.s); const lfo = ac.createOscillator(), lg = ac.createGain(); lfo.frequency.value = 6 + k * 2.3; lg.gain.value = 0.012; lfo.connect(lg).connect(c.gg.gain); lfo.start(); nodes.push(lfo);
        const swell = () => { if (!audio) return; const t0 = ac.currentTime; c.gg.gain.cancelScheduledValues(t0); c.gg.gain.setValueAtTime(0.0, t0); c.gg.gain.linearRampToValueAtTime(0.03, t0 + 2.5); c.gg.gain.setValueAtTime(0.03, t0 + 5); c.gg.gain.linearRampToValueAtTime(0.0, t0 + 7.5); setTimeout(swell, 8000 + Math.random() * 6000); }; setTimeout(swell, 400 + k * 3000); }
      const bird = () => { if (!audio) return; const t0 = ac.currentTime, o = ac.createOscillator(), g = ac.createGain(); o.type = "sine"; const f = 2400 + Math.random() * 1200; for (let i = 0; i < 3; i++) { o.frequency.setValueAtTime(f, t0 + i * 0.16); o.frequency.exponentialRampToValueAtTime(f * 1.35, t0 + i * 0.16 + 0.09); } g.gain.setValueAtTime(0.0001, t0); for (let i = 0; i < 3; i++) { g.gain.exponentialRampToValueAtTime(0.03, t0 + i * 0.16 + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t0 + i * 0.16 + 0.12); } o.connect(g).connect(dayG); o.start(t0); o.stop(t0 + 0.6); setTimeout(bird, 2500 + Math.random() * 5000); }; setTimeout(bird, 1500);
      for (let k = 0; k < 4; k++) { const o = ac.createOscillator(), g = ac.createGain(), am = ac.createOscillator(), ag = ac.createGain(); o.frequency.value = 4100 + k * 230; am.type = "square"; am.frequency.value = 14 + k * 3.1; ag.gain.value = 0.5; g.gain.value = 0; am.connect(ag).connect(g.gain); o.connect(g).connect(nightG); o.start(); am.start(); nodes.push(o, am);
        const chirp = () => { if (!audio) return; const t0 = ac.currentTime; g.gain.cancelScheduledValues(t0); g.gain.setValueAtTime(0, t0); g.gain.linearRampToValueAtTime(0.012, t0 + 0.05); g.gain.setValueAtTime(0.012, t0 + 0.35 + Math.random() * 0.5); g.gain.linearRampToValueAtTime(0, t0 + 0.9); setTimeout(chirp, 900 + Math.random() * 2600); }; setTimeout(chirp, 300 + k * 700); }
      const frog = () => { if (!audio) return; const t0 = ac.currentTime, o = ac.createOscillator(), g = ac.createGain(), f = ac.createBiquadFilter(); o.type = "sawtooth"; o.frequency.setValueAtTime(150 + Math.random() * 40, t0); o.frequency.linearRampToValueAtTime(110, t0 + 0.22); f.type = "lowpass"; f.frequency.value = 600; o.connect(f).connect(g).connect(nightG); g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(0.05, t0 + 0.03); g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.28); o.start(t0); o.stop(t0 + 0.3); setTimeout(frog, 2500 + Math.random() * 6000); }; setTimeout(frog, 1800);
      out.gain.linearRampToValueAtTime(0.8, ac.currentTime + 2.5);
      const drone = () => { const t0 = ac.currentTime, g = ac.createGain(), f = ac.createBiquadFilter(); f.type = "lowpass"; f.frequency.value = 320; g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(0.09, t0 + 9); g.gain.setValueAtTime(0.09, t0 + 15); g.gain.exponentialRampToValueAtTime(0.0001, t0 + 26); f.connect(g).connect(dayG);
        for (const fr of [58, 61.5, 87, 117]) { const o = ac.createOscillator(); o.type = "sawtooth"; o.frequency.value = fr; const og = ac.createGain(); og.gain.value = fr > 100 ? 0.25 : 0.5; o.connect(og).connect(f); o.start(t0); o.stop(t0 + 26.5); } };
      audio = { ac, out, dayG, nightG, nodes, last: -1, drone };
    } catch (e) { audio = null; }

    /* ---------------- câmera ---------------- */
    const OVER = { pos: OVERP.clone(), tgt: OVERT.clone() };
    const cam = { pos: OVER.pos.clone(), tgt: OVER.tgt.clone(), yaw: 0, pitch: 0, yawT: 0, pitchT: 0 };
    let glide = null, focus = null, hot = null, nightT = 0;
    const smoother = (x) => x * x * x * (x * (x * 6 - 15) + 10);
    function to(pose, dur = 2.0) { if (ctx.reduce) { cam.pos.copy(pose.pos); cam.tgt.copy(pose.tgt); return; } glide = { p0: cam.pos.clone(), t0: cam.tgt.clone(), p1: pose.pos.clone(), t1: pose.tgt.clone(), u: 0, dur }; cam.yawT = cam.pitchT = 0; }
    function poseFor(p, dist = 2.3, up = 0.9) { const dir = V3(OVERP.x - p.x, 0, OVERP.z - p.z).normalize(); return { pos: p.clone().addScaledVector(dir, dist).add(V3(0, up, 0)), tgt: p.clone() }; }
    function openItem(it) { focus = it; const sw = it.o === OBJ.balanco; to(poseFor(it.focus, sw ? 3.2 : 2.3, sw ? 0.6 : 1.25)); setTimeout(() => { if (focus === it) ctx.openAct(sub.name, it.i); }, ctx.reduce ? 0 : 1500); }
    function toggleNight() { nightT = nightT > 0.5 ? 0 : 1; focus = netItem; to({ pos: V3(D0.xf - 2.3, D0.y0 + 1.3, D0.z - 0.15), tgt: NET.clone().add(V3(0, 0.05, 0)) }, 2.2); }
    setTimeout(() => { try { ctx.toast("Túmulo dos Vaga-lumes", "O abrigo do lago", "Cada objeto marcado com um vaga-lume guarda uma atividade. O mosquiteiro, lá dentro, espera a noite."); } catch (e) { /* sem aviso */ } }, 900);

    const ray = new T.Raycaster();
    const fx = ctx.fantasy(scene, { center: V3(1.5, 1.6, 0), radius: 7, height: 2, colors: ["#d8ffb0", "#a8e0ff", "#ffd8a0"], count: 0, power: 0, lights: false, dim: 1, motes: 0, moteSize: 0.016 });
    const api = {
      name: "O abrigo do lago", sub: "Ciências Humanas", scene,
      update(dt, t) {
        fx.update(t);
        if (glide) { glide.u = Math.min(1, glide.u + dt / glide.dur); const e = smoother(glide.u); cam.pos.lerpVectors(glide.p0, glide.p1, e); cam.tgt.lerpVectors(glide.t0, glide.t1, e); if (glide.u >= 1) glide = null; }
        const k = 1 - Math.exp(-dt * 3.5); cam.yaw += (cam.yawT - cam.yaw) * k; cam.pitch += (cam.pitchT - cam.pitch) * k;
        const d = cam.tgt.clone().sub(cam.pos), r = d.length(), yw = Math.atan2(d.z, d.x) + cam.yaw, pt = Math.asin(Math.max(-0.99, Math.min(0.99, d.y / r))) + cam.pitch;
        camera.position.copy(cam.pos).add(V3(0, Math.sin(t * 0.45) * 0.012, 0)); camera.lookAt(cam.pos.x + Math.cos(yw) * Math.cos(pt), cam.pos.y + Math.sin(pt), cam.pos.z + Math.sin(yw) * Math.cos(pt));
        U.uT.value = t; const n0 = U.uNight.value; U.uNight.value += (nightT - n0) * Math.min(1, dt * (ctx.reduce ? 60 : 0.45)); const n = U.uNight.value; kidHemi.intensity = 1.3 * (1 - n) + 0.25 * n; kidSun.intensity = 1.0 * (1 - n);
        U.uFogD.value = 0.038 - n * 0.004; U.uPLC.value.setRGB(0.75, 1.0, 0.4).multiplyScalar(1.0 + 0.15 * Math.sin(t * 3.1) + 0.1 * Math.sin(t * 7.3));
        netGlow.material.opacity = n * (0.55 + 0.1 * Math.sin(t * 2.7));
        // o balanço vai e volta; o irmão empurra quando ele volta
        const sw = Math.sin(t * 1.62); swing.rotation.x = 0.33 * sw; SE.knees.forEach((kn) => (kn.rotation.x = -0.25 - 0.45 * Math.cos(t * 1.62))); SE.head.rotation.x = -0.12 * sw;
        const push = sm(0.35, 0.95, sw); SI.shoulders.forEach((s) => (s.rotation.x = -0.25 - push * 1.15)); SI.g.rotation.x = 0.06 * push; SI.head.rotation.x = 0.1 - 0.12 * push; SI.head.rotation.y = 0.15 * Math.sin(t * 0.3);
        for (const it of [...items, netItem]) { it.hot += ((hot === it || focus === it ? 1 : 0) - it.hot) * Math.min(1, dt * 6); it.mats.forEach((m) => (m.uniforms.uHot.value = it.hot * 0.8)); }
        for (const it of items) { const b = Math.sin(t * 1.3 + it.i) * 0.05; it.halo.position.copy(it.mk).add(V3(Math.sin(t * 0.7 + it.i) * 0.04, b, 0)); it.core.position.copy(it.halo.position); it.halo.material.opacity = (0.35 + 0.25 * Math.sin(t * 2.4 + it.i * 2)) * (1 + it.hot) + n * 0.3; it.halo.scale.setScalar(0.55 + it.hot * 0.35 + n * 0.25); }
        bombT -= dt; if (bombT < 0) { bombT = 55 + Math.random() * 30; bombers.visible = n < 0.5; bombers.userData.t = 0; if (audio && bombers.visible) audio.drone(); }
        if (bombers.visible) { const bt = (bombers.userData.t += dt), u = bt / 26; bombers.position.set(70 - u * 150, 95, -60 + u * 30); bombers.rotation.y = Math.atan2(-150, 30); if (u > 1) bombers.visible = false; }
        if (audio && Math.abs(audio.last - n) > 0.02) { audio.last = n; const tt = audio.ac.currentTime; audio.dayG.gain.setTargetAtTime(1 - n, tt, 0.4); audio.nightG.gain.setTargetAtTime(n, tt, 0.4); }
      },
      render(renderer) {
        if (!rt) api.resize(innerWidth, innerHeight);
        updMirror(); U.uClip.value = 1; U.uRS.value = rtS; water.visible = false; renderer.setRenderTarget(rt); renderer.clear(); renderer.render(scene, mirror);
        water.visible = true; U.uClip.value = 0; U.uRS.value = 1; water.material.uniforms.tR.value = rt.texture;
        renderer.setRenderTarget(null); renderer.render(scene, camera);
      },
      resize(w, h) {
        const tall = w / h < 0.8; camera.aspect = w / h; camera.fov = tall ? 66 : 50; camera.updateProjectionMatrix();
        U.uPS.value = h * PR / (2 * Math.tan(camera.fov * Math.PI / 360));
        OVER.pos.copy(tall ? V3(0.2, 2.2, 13.5) : OVERP); OVER.tgt.copy(tall ? V3(2.4, 1.0, -1.0) : OVERT); if (!focus && !glide) { cam.pos.copy(OVER.pos); cam.tgt.copy(OVER.tgt); }
        const rw = Math.max(64, Math.round(w * PR * rtS)), rh = Math.max(64, Math.round(h * PR * rtS)); if (!rt) rt = new T.WebGLRenderTarget(rw, rh); else rt.setSize(rw, rh);
      },
      pick(ndc) {
        ray.setFromCamera(ndc, camera); const hits = ray.intersectObjects(pickables, true); let it = null;
        let fb = null; for (const h of hits) { if (h.distance > 30) break; if (h.object === swHit) { fb = fb || rootOf.get(swHit); continue; } let o = h.object; while (o && !rootOf.has(o)) o = o.parent; if (o) { it = rootOf.get(o); break; } } it = it || fb;
        hot = it;
        if (!it) return null;
        if (it.kind === "net") return { label: ["O mosquiteiro", nightT > 0.5 ? "esperar o dia" : "esperar a noite"], go: toggleNight };
        return { label: [it.a.t, it.o.name], go: () => openItem(it) };
      },
      look(dx, dy) { if (glide) return; cam.yawT = Math.max(-0.9, Math.min(0.9, cam.yawT - dx * 0.003)); cam.pitchT = Math.max(-0.3, Math.min(0.4, cam.pitchT - dy * 0.003)); },
      back() { if (focus) { focus = null; to(OVER); return true; } return false; },
      night(v) { nightT = v ? 1 : 0; if (ctx.reduce) U.uNight.value = nightT; },
      dispose() {
        if (audio) { const a = audio; audio = null; try { a.out.gain.cancelScheduledValues(a.ac.currentTime); a.out.gain.setValueAtTime(a.out.gain.value, a.ac.currentTime); a.out.gain.linearRampToValueAtTime(0, a.ac.currentTime + 0.6); setTimeout(() => { a.nodes.forEach((x) => { try { x.stop(); } catch (e) { /* já parou */ } }); a.ac.close(); }, 800); } catch (e) { /* sem som */ } }
        if (rt) rt.dispose(); keep.forEach((o) => o.dispose && o.dispose());
      },
    };
    return api;
  };
})();
