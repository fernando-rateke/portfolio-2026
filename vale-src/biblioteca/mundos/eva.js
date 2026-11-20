/* Mundo de Matemática: Evangelion. Tokyo-3 no fim da tarde: a passagem de nível com as luzes vermelhas, os
   postes com fios até perder de vista, as cigarras, o lago que cobriu a cidade velha, prédios baixos e os que
   sobem do chão. Lá longe o Guardião (um robô gigante original) de pé, e uma criatura de monólitos girando em volta de um
   núcleo vermelho sobre a cidade; de vez em quando o campo de força acende em hexágonos. As três atividades estão no banco com o toca-fitas, na máquina de bebidas e na
   passagem de nível. Tudo desenhado aqui. */
(() => {
  window.MUNDOS = window.MUNDOS || {};
  window.MUNDOS.eva = (ctx) => {
    const T = ctx.T, V3 = (x, y, z) => new T.Vector3(x, y, z), small = ctx.small;
    let seed = 17; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    const keep = []; const K = (o) => { keep.push(o); return o; };
    const scene = new T.Scene(); scene.fog = new T.FogExp2("#c87a58", 0.012);
    const camera = new T.PerspectiveCamera(50, ctx.aspect(), 0.05, 900);
    const OVERP = V3(-0.6, 1.75, 11.5), OVERT = V3(0.6, 3.6, -12);
    const uT = { value: 0 }, uAT = { value: 0 };
    const std = (col, o = {}) => K(new T.MeshStandardMaterial(Object.assign({ color: col, roughness: 0.8 }, o)));
    const add = (geo, mat, x, y, z, ry = 0, rx = 0, rz = 0, parent) => { const m = new T.Mesh(K(geo), mat); m.position.set(x, y, z); m.rotation.set(rx, ry, rz); (parent || scene).add(m); return m; };
    const SUN = V3(0.35, 0.12, -1).normalize();

    /* ---------------- o céu do entardecer ---------------- */
    scene.add(new T.Mesh(K(new T.SphereGeometry(800, 40, 20)), K(new T.ShaderMaterial({ side: T.BackSide, depthWrite: false, fog: false, uniforms: { uT, uS: { value: SUN } },
      vertexShader: "varying vec3 vD; void main(){ vD = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }",
      fragmentShader: `uniform float uT; uniform vec3 uS; varying vec3 vD; float h(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
        float n(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f); return mix(mix(h(i), h(i + vec2(1, 0)), f.x), mix(h(i + vec2(0, 1)), h(i + vec2(1, 1)), f.x), f.y); }
        void main(){ vec3 d = normalize(vD); float y = d.y; vec3 c = mix(vec3(1.0, 0.6, 0.35), vec3(0.95, 0.45, 0.35), smoothstep(0.0, 0.15, y)); c = mix(c, vec3(0.35, 0.3, 0.55), smoothstep(0.12, 0.6, y));
          float s = max(dot(d, uS), 0.0); c += vec3(1.0, 0.75, 0.4) * pow(s, 12.0) * 0.8 + vec3(1.0, 0.95, 0.8) * smoothstep(0.9975, 0.999, s);
          vec2 q = d.xz / max(y + 0.1, 0.05); float cl = n(q * 1.2 + vec2(uT * 0.005, 0.0)) * 0.6 + n(q * 3.0) * 0.4; c = mix(c, mix(vec3(1.0, 0.7, 0.55), vec3(0.6, 0.35, 0.45), smoothstep(0.0, 0.4, y)), smoothstep(0.55, 0.8, cl) * smoothstep(0.02, 0.15, y) * 0.75);
          gl_FragColor = vec4(c, 1.0); }` }))));
    scene.add(new T.HemisphereLight("#ffb890", "#3a2a3a", 0.9)); const sun = new T.DirectionalLight("#ffb070", 1.3); sun.position.copy(SUN).multiplyScalar(100); scene.add(sun);

    /* ---------------- chão, estrada, trilho e o lago ---------------- */
    add(new T.PlaneGeometry(600, 600), std("#5a4a3a"), 0, 0, 0, 0, -Math.PI / 2);
    add(new T.PlaneGeometry(6, 300), std("#3a3638", { roughness: 0.6 }), 0, 0.01, -120, 0, -Math.PI / 2); // a estrada indo para longe
    for (let z = 6; z > -240; z -= 6) add(new T.PlaneGeometry(0.15, 2.5), std("#d8d2b8"), 0, 0.02, z, 0, -Math.PI / 2);
    // o trilho cruzando a estrada
    const RZ = 2.0; for (let x = -80; x < 80; x += 0.7) add(new T.BoxGeometry(0.2, 0.08, 2.4), std("#3a2a20"), x, 0.04, RZ); for (const dz of [-0.72, 0.72]) add(new T.BoxGeometry(160, 0.1, 0.08), std("#8a8a90", { metalness: 0.7, roughness: 0.3 }), 0, 0.12, RZ + dz);
    // o lago com a cidade velha afundada
    const lake = add(new T.PlaneGeometry(300, 160), K(new T.ShaderMaterial({ uniforms: { uT, uS: { value: SUN } }, vertexShader: "varying vec3 vW; void main(){ vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }",
      fragmentShader: "uniform float uT; uniform vec3 uS; varying vec3 vW; void main(){ vec3 V = normalize(cameraPosition - vW); vec3 R = reflect(-V, vec3(0, 1, 0)); float s = pow(max(dot(R, uS), 0.0), 60.0); float w = sin(vW.x * 0.3 + uT) * sin(vW.z * 0.5 - uT * 0.7); vec3 c = mix(vec3(0.6, 0.35, 0.35), vec3(0.95, 0.6, 0.4), pow(1.0 - V.y, 3.0)) + vec3(1.0, 0.8, 0.5) * s * (1.5 + w); gl_FragColor = vec4(c, 1.0); }" })), -40, 0.03, -140, 0, -Math.PI / 2);
    // prédios afundados no lago e a cidade de pé atrás
    const bldM = [std("#6a5a6a"), std("#5a5060"), std("#7a6a6a")], winM = K(new T.MeshBasicMaterial({ color: "#ffd8a0" }));
    for (let i = 0; i < 26; i++) { const x = -120 + rnd() * 100, z = -120 - rnd() * 60, h = 6 + rnd() * 18; add(new T.BoxGeometry(5 + rnd() * 6, h, 5 + rnd() * 6), bldM[i % 3], x, h / 2 - 4, z, rnd()); }
    for (let i = 0; i < 70; i++) { const x = (rnd() < 0.5 ? 1 : -1) * (22 + rnd() * 140), z = -70 - rnd() * 200, h = 8 + rnd() * 34; if (x < -10 && z > -150) continue; const b = add(new T.BoxGeometry(8 + rnd() * 10, h, 8 + rnd() * 10), bldM[i % 3], x, h / 2, z); if (rnd() < 0.6) for (let k = 0; k < 6; k++) add(new T.PlaneGeometry(1.2, 0.8), winM, x + (rnd() - 0.5) * 6, 3 + rnd() * (h - 6), z + 5.2); void b; }
    // morros ao longe
    for (let i = 0; i < 9; i++) add(new T.SphereGeometry(1, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2), std("#4a3a4a"), -300 + i * 75, -2, -400, 0, 0, 0).scale.set(70, 30 + (i % 3) * 14, 40);

    /* ---------------- os postes e os fios, até perder de vista ---------------- */
    const poleM = std("#2a2224"), wireM = K(new T.LineBasicMaterial({ color: "#1a1416" }));
    const poleTops = [[], []];
    for (const side of [-1, 1]) for (let k = 0; k < 16; k++) { const x = side * 4.2, z = 4 - k * 14, h = 9;
      add(new T.CylinderGeometry(0.12, 0.17, h, 8), poleM, x, h / 2, z); for (const [y, w] of [[h - 0.4, 2.4], [h - 1.1, 1.8], [h - 1.8, 1.4]]) add(new T.BoxGeometry(w, 0.1, 0.1), poleM, x, y, z);
      add(new T.CylinderGeometry(0.22, 0.22, 0.6, 10), std("#5a5a60", { metalness: 0.5 }), x - side * 0.4, h - 2.6, z); poleTops[side < 0 ? 0 : 1].push(V3(x, h, z)); }
    for (const tops of poleTops) for (let i = 0; i < tops.length - 1; i++) for (const [dx, dy] of [[-1.1, -0.4], [-0.5, -0.4], [0.5, -0.4], [1.1, -0.4], [-0.8, -1.1], [0.8, -1.1], [-0.6, -1.8], [0.6, -1.8]]) { const a = tops[i].clone().add(V3(dx, dy, 0)), b = tops[i + 1].clone().add(V3(dx, dy, 0)), pts = []; for (let k = 0; k <= 12; k++) { const t = k / 12; pts.push(a.clone().lerp(b, t).add(V3(0, -Math.sin(t * Math.PI) * 0.9, 0))); } scene.add(new T.Line(K(new T.BufferGeometry().setFromPoints(pts)), wireM)); }

    /* ---------------- a passagem de nível ---------------- */
    const XG = V3(3.3, 0, RZ + 1.6);
    const crossing = new T.Group(); crossing.position.copy(XG); scene.add(crossing);
    const stripe = (() => { const c = document.createElement("canvas"); c.width = 64; c.height = 256; const g = c.getContext("2d"); for (let y = 0; y < 256; y += 32) { g.fillStyle = (y / 32) % 2 ? "#1a1a1a" : "#f2d22a"; g.fillRect(0, y, 64, 32); } return K(new T.CanvasTexture(c)); })();
    add(new T.CylinderGeometry(0.07, 0.07, 3.4, 10), std("#ffffff", { map: stripe }), 0, 1.7, 0, 0, 0, 0, crossing);
    const xs = (() => { const c = document.createElement("canvas"); c.width = 256; c.height = 256; const g = c.getContext("2d"); g.fillStyle = "#f2d22a"; g.translate(128, 128); for (const r of [0.78, -0.78]) { g.save(); g.rotate(r); g.fillRect(-120, -18, 240, 36); g.fillStyle = "#1a1a1a"; for (let x = -120; x < 120; x += 40) g.fillRect(x, -18, 20, 36); g.restore(); g.fillStyle = "#f2d22a"; } return K(new T.CanvasTexture(c)); })();
    add(new T.PlaneGeometry(1.1, 1.1), K(new T.MeshStandardMaterial({ map: xs, transparent: true, alphaTest: 0.3, side: T.DoubleSide })), 0, 3.15, 0.1, -0.5, 0, 0, crossing);
    const redM = [0, 1].map(() => K(new T.MeshBasicMaterial({ color: "#3a0808" }))), reds = [];
    for (const [i, x] of [[0, -0.32], [1, 0.32]]) { add(new T.CylinderGeometry(0.17, 0.17, 0.08, 18), std("#1a1a1a"), x, 2.45, 0.08, -0.5, Math.PI / 2, 0, crossing); const l = add(new T.CircleGeometry(0.12, 18), redM[i], x, 2.45, 0.13, -0.5, 0, 0, crossing); const gl = new T.Sprite(K(new T.SpriteMaterial({ map: ctx.glowTex, color: 0xff2a1a, transparent: true, opacity: 0, depthWrite: false, blending: T.AdditiveBlending }))); gl.scale.set(0.9, 0.9, 1); gl.position.set(x, 2.45, 0.2); crossing.add(gl); reds.push({ l, gl, m: redM[i] }); void l; }
    const arm = new T.Group(); arm.position.set(-0.15, 1.0, 0); crossing.add(arm); add(new T.BoxGeometry(5.2, 0.09, 0.09), std("#ffffff", { map: stripe }), -2.6, 0, 0, 0, 0, Math.PI / 2, arm).rotation.set(0, 0, 0);
    arm.rotation.z = Math.PI / 2 - 0.05;

    /* ---------------- a máquina de bebidas e o banco com o toca-fitas ---------------- */
    const vend = new T.Group(); vend.position.set(-3.7, 0, 6.2); vend.rotation.y = 0.6; scene.add(vend);
    add(new T.BoxGeometry(1.0, 1.85, 0.75), std("#e8e8ea", { roughness: 0.4 }), 0, 0.93, 0, 0, 0, 0, vend);
    const vt = (() => { const c = document.createElement("canvas"); c.width = 128; c.height = 128; const g = c.getContext("2d"); g.fillStyle = "#1a2a4a"; g.fillRect(0, 0, 128, 128); for (let r = 0; r < 3; r++) for (let k = 0; k < 5; k++) { g.fillStyle = ["#e83a2a", "#2a8ae8", "#f2c22a", "#3ac85a", "#e8e8e8"][(r + k) % 5]; g.fillRect(8 + k * 24, 10 + r * 40, 14, 26); } return K(new T.CanvasTexture(c)); })();
    add(new T.PlaneGeometry(0.8, 0.8), K(new T.MeshBasicMaterial({ map: vt })), 0, 1.25, 0.38, 0, 0, 0, vend); const vl = new T.PointLight("#c8dcff", 0.9, 4, 2); vl.position.set(0, 1.3, 0.8); vend.add(vl);
    const bench = new T.Group(); bench.position.set(-2.2, 0, 5.6); bench.rotation.y = 0.25; scene.add(bench);
    add(new T.BoxGeometry(1.6, 0.06, 0.45), std("#6a4a30"), 0, 0.45, 0, 0, 0, 0, bench); for (const x of [-0.7, 0.7]) add(new T.BoxGeometry(0.06, 0.45, 0.4), std("#3a3a3e", { metalness: 0.6 }), x, 0.22, 0, 0, 0, 0, bench);
    const sdat = new T.Group(); sdat.position.set(0.25, 0.49, 0.02); bench.add(sdat); add(new T.BoxGeometry(0.11, 0.025, 0.08), std("#3a3a42", { metalness: 0.5, roughness: 0.3 }), 0, 0, 0, 0, 0, 0, sdat);
    { const cord = []; for (let k = 0; k <= 14; k++) { const t = k / 14; cord.push(V3(0.05 + t * 0.25, 0.01 + Math.sin(t * Math.PI) * 0.02, Math.sin(t * 6) * 0.05)); } sdat.add(new T.Line(K(new T.BufferGeometry().setFromPoints(cord)), K(new T.LineBasicMaterial({ color: "#eeeeee" })))); add(new T.SphereGeometry(0.018, 8, 6), std("#eee"), 0.3, 0.012, 0.03, 0, 0, 0, sdat); add(new T.SphereGeometry(0.018, 8, 6), std("#eee"), 0.31, 0.012, -0.03, 0, 0, 0, sdat); }
    const sdatScreen = add(new T.PlaneGeometry(0.06, 0.02), K(new T.MeshBasicMaterial({ color: "#7aff9a" })), 0, 0.014, 0.012, 0, -Math.PI / 2, 0, sdat);

    /* ---------------- o Guardião: um robô gigante original, branco e verde-água, de visor laranja ---------------- */
    function makeMech() {
      const g = new T.Group(), wh = std("#e8e6e0", { roughness: 0.45, metalness: 0.25 }), tl = std("#2a8a8a", { roughness: 0.5, metalness: 0.3 }), dk = std("#2a2e34", { roughness: 0.6 }), vis = K(new T.MeshBasicMaterial({ color: "#ffa040", fog: false }));
      const P = (geo, m, x, y, z, rx = 0, ry = 0, rz = 0, sx = 1, sy = 1, sz = 1) => { const o = add(geo, m, x, y, z, ry, rx, rz, g); o.scale.set(sx, sy, sz); return o; };
      P(new T.SphereGeometry(2.0, 20, 14), wh, 0, 10.6, 0, 0, 0, 0, 1.15, 1.25, 0.9); P(new T.CylinderGeometry(1.2, 1.5, 2.2, 14), dk, 0, 8.2, 0); P(new T.BoxGeometry(2.6, 1.4, 1.8), tl, 0, 7.0, 0); // peito redondo, cintura, quadril
      P(new T.BoxGeometry(1.8, 2.4, 1.2), dk, 0, 11.0, -1.6); for (const s of [-1, 1]) P(new T.CylinderGeometry(0.35, 0.45, 1.6, 10), tl, s * 0.6, 12.4, -1.9, 0, 0, 0); // mochila com dois exaustores
      for (const s of [-1, 1]) { P(new T.SphereGeometry(1.3, 16, 12), wh, s * 2.6, 11.6, 0, 0, 0, 0, 1, 0.85, 1); P(new T.TorusGeometry(1.0, 0.18, 8, 20), tl, s * 2.6, 11.4, 0, 0, Math.PI / 2, 0);
        P(new T.CapsuleGeometry(0.55, 2.6, 5, 10), dk, s * 3.1, 9.0, 0.2, 0, 0, s * 0.08); P(new T.CylinderGeometry(0.75, 0.6, 2.6, 12), wh, s * 3.3, 6.4, 0.5, -0.2, 0, s * 0.04); P(new T.BoxGeometry(0.9, 0.9, 1.0), dk, s * 3.35, 4.9, 0.8);
        P(new T.CylinderGeometry(0.85, 0.75, 3.4, 12), wh, s * 1.0, 4.6, 0); P(new T.CapsuleGeometry(0.6, 2.4, 5, 10), dk, s * 1.0, 2.2, 0.1); P(new T.BoxGeometry(1.5, 0.8, 2.4), wh, s * 1.0, 0.4, 0.4); P(new T.BoxGeometry(0.2, 2.2, 0.2), tl, s * 1.0, 4.6, 0.86); }
      const head = new T.Group(); head.position.set(0, 13.4, 0.2); g.add(head);
      add(new T.SphereGeometry(1.0, 20, 14), wh, 0, 0, 0, 0, 0, 0, head).scale.set(1, 0.85, 1); add(new T.BoxGeometry(1.5, 0.22, 0.4), vis, 0, 0.05, 0.85, 0, 0, 0, head);
      for (const s of [-1, 1]) { const fin = add(new T.BoxGeometry(0.12, 0.9, 0.5), tl, s * 0.95, 0.45, -0.1, 0, 0, -s * 0.5, head); void fin; }
      const vg = new T.Sprite(K(new T.SpriteMaterial({ map: ctx.glowTex, color: 0xffa040, transparent: true, opacity: 0.7, depthWrite: false, blending: T.AdditiveBlending, fog: false }))); vg.scale.set(3.2, 1.2, 1); vg.position.set(0, 0.05, 1.0); head.add(vg);
      g.userData.head = head; return g;
    }
    const eva = makeMech(); eva.position.set(-24, 0, -78); eva.rotation.y = 0.45; eva.scale.setScalar(1.7); scene.add(eva); eva.traverse((o) => { if (o.material && o.material.isMeshStandardMaterial) o.material.fog = false; });
    { const rim = new T.DirectionalLight("#ffb070", 0.9); rim.position.set(-10, 40, -160); rim.target = eva; scene.add(rim); }
    // a criatura no céu: um anel de monólitos brancos girando em volta de um núcleo vermelho (original)
    const ramiel = new T.Group(); ramiel.position.set(30, 52, -210); scene.add(ramiel);
    { const mono = K(new T.MeshStandardMaterial({ color: "#f0eee8", roughness: 0.3, metalness: 0.2, emissive: new T.Color("#3a3a40"), fog: false }));
      for (let k = 0; k < 12; k++) { const a = k / 12 * Math.PI * 2; const m = add(new T.BoxGeometry(2.2, 9, 2.2), mono, Math.cos(a) * 14, 0, Math.sin(a) * 14, -a, 0, 0, ramiel); m.rotation.z = 0.3; }
      const core = add(new T.IcosahedronGeometry(4, 1), K(new T.MeshStandardMaterial({ color: "#c81a1a", roughness: 0.2, emissive: new T.Color("#801010"), emissiveIntensity: 1.2, fog: false })), 0, 0, 0, 0, 0, 0, ramiel); void core;
      const cg = new T.Sprite(K(new T.SpriteMaterial({ map: ctx.glowTex, color: 0xff3a2a, transparent: true, opacity: 0.6, depthWrite: false, blending: T.AdditiveBlending, fog: false }))); cg.scale.setScalar(22); ramiel.add(cg); }
    // o campo de força: hexágonos que acendem em volta do Guardião
    const at = new T.Mesh(K(new T.PlaneGeometry(60, 60)), K(new T.ShaderMaterial({ transparent: true, depthWrite: false, blending: T.AdditiveBlending, side: T.DoubleSide, uniforms: { uAT, uT },
      vertexShader: "varying vec2 vU; void main(){ vU = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }",
      fragmentShader: `uniform float uAT, uT; varying vec2 vU; vec2 hx(vec2 p){ vec2 r = vec2(1.0, 1.732), h = r * 0.5; vec2 a = mod(p, r) - h, b = mod(p - h, r) - h; return dot(a, a) < dot(b, b) ? a : b; }
        void main(){ vec2 p = (vU - 0.5) * 2.0; float d = length(p); vec2 g = hx(p * 9.0); float e = smoothstep(0.42, 0.47, max(abs(g.x) * 0.866 + abs(g.y) * 0.5, abs(g.y))); float ring = smoothstep(0.08, 0.0, abs(d - uAT * 1.1)) + smoothstep(1.0, 0.0, d) * 0.25;
          float a = e * ring * (1.0 - uAT) * step(0.001, uAT); gl_FragColor = vec4(vec3(1.0, 0.55, 0.15) * a * 1.5, a); }` })));
    at.position.set(-22, 15, -74); at.lookAt(OVERP); scene.add(at);

    /* ---------------- um trem que passa de vez em quando ---------------- */
    const train = new T.Group(); train.visible = false; scene.add(train);
    for (let k = 0; k < 4; k++) { add(new T.BoxGeometry(19, 3.2, 2.9), std(k ? "#d8d8d0" : "#c8c8c0", { roughness: 0.5 }), k * 20, 1.9, 0, 0, 0, 0, train); add(new T.BoxGeometry(19, 0.4, 2.95), std("#2a8a4a"), k * 20, 2.3, 0, 0, 0, 0, train); for (let w = 0; w < 6; w++) add(new T.PlaneGeometry(1.6, 0.9), K(new T.MeshBasicMaterial({ color: "#ffe0b0" })), k * 20 - 7 + w * 2.8, 2.7, 1.48, 0, 0, 0, train); }
    train.position.set(-200, 0, RZ);

    /* ---------------- a jaula: o hangar subterrâneo, com o Guardião mergulhado no líquido laranja ---------------- */
    const sceneH = new T.Scene(); sceneH.background = new T.Color("#050608"); sceneH.fog = new T.FogExp2("#1a0e08", 0.018);
    const addH = (geo, mat, x, y, z, ry = 0, rx = 0, rz = 0, parent) => add(geo, mat, x, y, z, ry, rx, rz, parent || sceneH);
    sceneH.add(new T.HemisphereLight("#6a5040", "#1a0a04", 0.6));
    { const room = addH(new T.BoxGeometry(60, 40, 60), std("#24262a", { side: T.BackSide, roughness: 0.9 }), 0, 10, 0); void room;
      for (let k = -5; k <= 5; k++) { addH(new T.BoxGeometry(0.8, 40, 1.2), std("#33363c"), k * 5.5, 10, -29.4); addH(new T.BoxGeometry(1.2, 40, 0.8), std("#33363c"), -29.4, 10, k * 5.5); addH(new T.BoxGeometry(1.2, 40, 0.8), std("#33363c"), 29.4, 10, k * 5.5); }
      for (let y = 4; y < 30; y += 6) addH(new T.BoxGeometry(60, 0.5, 0.6), std("#3a3d44"), 0, y, -29.2);
      // faixas de aviso amarelas e pretas nas paredes
      const warn = (() => { const c = document.createElement("canvas"); c.width = 256; c.height = 32; const g = c.getContext("2d"); for (let x = -32; x < 288; x += 32) { g.fillStyle = "#f2c22a"; g.beginPath(); g.moveTo(x, 0); g.lineTo(x + 16, 0); g.lineTo(x + 32, 32); g.lineTo(x + 16, 32); g.fill(); } const t = K(new T.CanvasTexture(c)); t.wrapS = T.RepeatWrapping; t.repeat.set(12, 1); return t; })();
      addH(new T.PlaneGeometry(58, 1.2), K(new T.MeshStandardMaterial({ map: warn, transparent: true })), 0, 1.4, -28.9); addH(new T.PlaneGeometry(58, 1.2), K(new T.MeshStandardMaterial({ map: warn, transparent: true })), -28.9, 1.4, 0, Math.PI / 2); }
    // o líquido laranja que enche a jaula
    const coolant = addH(new T.PlaneGeometry(60, 60), K(new T.ShaderMaterial({ uniforms: { uT }, vertexShader: "varying vec3 vW; void main(){ vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }",
      fragmentShader: "uniform float uT; varying vec3 vW; void main(){ vec2 p = vW.xz; float r = sin(p.x * 0.6 + uT * 0.8) * sin(p.y * 0.5 - uT * 0.6) * 0.5 + 0.5; vec3 V = normalize(cameraPosition - vW); float fr = pow(1.0 - max(V.y, 0.0), 3.0); vec3 c = mix(vec3(0.75, 0.3, 0.05), vec3(1.0, 0.55, 0.15), r * 0.6) + vec3(1.0, 0.8, 0.4) * fr * 0.4; float d = length(p) / 30.0; c *= 1.0 - d * 0.5; gl_FragColor = vec4(c, 1.0); }" })), 0, 0, 0, 0, -Math.PI / 2);
    const glowL = new T.PointLight("#ff8a2a", 1.2, 30, 1.4); glowL.position.set(0, 1.5, 4); sceneH.add(glowL);
    // o Guardião até o peito no líquido, preso pelas travas nos ombros
    const mechH = makeMech(); mechH.scale.setScalar(1.4); mechH.position.set(0, -8.0 * 1.4, 0); sceneH.add(mechH);
    for (const sd of [-1, 1]) { addH(new T.BoxGeometry(6, 1.4, 2.4), std("#4a4e56", { metalness: 0.6, roughness: 0.4 }), sd * 7.0, 4.6, 0.2); addH(new T.BoxGeometry(1.6, 3, 2.6), std("#3a3e46", { metalness: 0.6 }), sd * 4.4, 4.2, 0.2); addH(new T.BoxGeometry(1.0, 14, 1.0), std("#3a3e46"), sd * 10, 4, 0); }
    const headL = new T.SpotLight("#fff0d8", 1.6, 40, 0.3, 0.6, 1.2); headL.position.set(0, 24, 14); headL.target.position.set(0, 7, 0); sceneH.add(headL, headL.target);
    // a passarela que vai até a frente do rosto, e o painel
    addH(new T.BoxGeometry(2.4, 0.2, 14), std("#5a5e66", { metalness: 0.6, roughness: 0.4 }), 0, 6.0, 10); for (const sd of [-1, 1]) { addH(new T.BoxGeometry(0.06, 0.06, 14), std("#f2c22a"), sd * 1.15, 7.0, 10); for (let z = 3.5; z < 17; z += 1.5) addH(new T.BoxGeometry(0.05, 1.0, 0.05), std("#8a8e96"), sd * 1.15, 6.5, z); }
    const consoleH = new T.Group(); consoleH.position.set(1.0, 6.1, 12.5); consoleH.rotation.y = -0.6; sceneH.add(consoleH); add(new T.BoxGeometry(0.8, 1.0, 0.5), std("#2a2e34"), 0, 0.5, 0, 0, 0, 0, consoleH);
    const scrTex = (() => { const c = document.createElement("canvas"); c.width = 256; c.height = 160; const g = c.getContext("2d"); g.fillStyle = "#0a1a10"; g.fillRect(0, 0, 256, 160); g.strokeStyle = "#3aff7a"; g.lineWidth = 2; for (let k = 0; k < 6; k++) { g.beginPath(); g.moveTo(10, 30 + k * 20); for (let x = 10; x < 246; x += 8) g.lineTo(x, 30 + k * 20 + Math.sin(x * 0.1 + k) * 6); g.stroke(); } g.fillStyle = "#ff9a3a"; g.font = "700 18px monospace"; g.fillText("SINCRONIA 41,3%", 12, 152); return K(new T.CanvasTexture(c)); })();
    add(new T.PlaneGeometry(0.7, 0.44), K(new T.MeshBasicMaterial({ map: scrTex })), 0, 1.05, 0.12, 0, -0.5, 0, consoleH);
    const doorH = addH(new T.BoxGeometry(2.2, 3.0, 0.3), std("#4a4e56", { metalness: 0.5 }), 0, 7.6, 17.2); const doorSign = addH(new T.PlaneGeometry(1.4, 0.4), K(new T.MeshBasicMaterial({ color: "#3aff7a" })), 0, 9.4, 17.0, Math.PI); void doorSign;
    // giroflex vermelhos girando no teto
    const beacons = []; for (const [x, z] of [[-12, -6], [12, -6], [-12, 14], [12, 14]]) { const bl = new T.SpotLight("#ff2a1a", 3, 30, 0.4, 0.6, 1.2); bl.position.set(x, 22, z); sceneH.add(bl, bl.target); const bulb = addH(new T.SphereGeometry(0.4, 12, 8), K(new T.MeshBasicMaterial({ color: "#ff3a2a" })), x, 22, z); beacons.push({ bl, bulb, x, z }); }
    const OVER_H = { pos: V3(-0.5, 8.0, 16.2), tgt: V3(0, 7.6, 0) };
    // na cidade, a cabine do elevador que desce até a jaula
    const kiosk = new T.Group(); kiosk.position.set(2.6, 0, -3.5); kiosk.rotation.y = -0.3; scene.add(kiosk);
    add(new T.BoxGeometry(1.6, 2.6, 1.6), std("#d8d8d0", { roughness: 0.5 }), 0, 1.3, 0, 0, 0, 0, kiosk); add(new T.BoxGeometry(1.0, 2.0, 0.05), std("#3a3e46", { metalness: 0.6 }), 0, 1.0, 0.81, 0, 0, 0, kiosk);
    add(new T.BoxGeometry(1.7, 0.3, 1.7), std("#c83a2a"), 0, 2.75, 0, 0, 0, 0, kiosk); const kl = new T.PointLight("#3aff7a", 0.8, 4, 2); kl.position.set(0, 2.2, 1.2); kiosk.add(kl);

    /* ---------------- a escola: a sala de aula ao entardecer (o modelo que o Fernando mandou) ---------------- */
    const sceneS = new T.Scene(); sceneS.background = new T.Color("#e8b890");
    sceneS.add(new T.HemisphereLight("#fff0e0", "#8a6a50", 1.0)); { const sl = new T.DirectionalLight("#ffc890", 1.1); sl.position.set(20, 12, 6); sceneS.add(sl); }
    let board = null;
    new T.GLTFLoader().load(ctx.base + "eva/sala.glb", (gl) => { sceneS.add(gl.scene); gl.scene.traverse((o) => { if (o.isMesh) { o.frustumCulled = false; if (/Cube\.001/.test(o.name)) board = o; } }); });
    const OVER_S = { pos: V3(-2, 3.2, -4.5), tgt: V3(-2, 2.2, 18) };
    // o portão da escola, na beira da estrada
    const gate = new T.Group(); gate.position.set(-5.6, 0, -1.5); gate.rotation.y = 0.5; scene.add(gate);
    for (const sd of [-1, 1]) add(new T.BoxGeometry(0.5, 2.0, 0.5), std("#b8b0a0"), sd * 1.4, 1.0, 0, 0, 0, 0, gate);
    add(new T.BoxGeometry(2.6, 0.08, 0.08), std("#6a6a70", { metalness: 0.6 }), 0, 1.2, 0, 0, 0, 0, gate);
    { const c = document.createElement("canvas"); c.width = 256; c.height = 96; const g = c.getContext("2d"); g.fillStyle = "#e8e4d8"; g.fillRect(0, 0, 256, 96); g.fillStyle = "#2a2a2a"; g.font = "700 30px 'Shippori Mincho', serif"; g.textAlign = "center"; g.fillText("市立中学校", 128, 46); g.font = "500 16px sans-serif"; g.fillText("ESCOLA · 1º ANO", 128, 78);
      add(new T.PlaneGeometry(0.7, 0.26), K(new T.MeshStandardMaterial({ map: K(new T.CanvasTexture(c)) })), -1.4, 1.5, 0.26, 0, 0, 0, gate); }
    const gateItem = { kind: "escola", hit: gate, name: "entrar na escola" };

    /* ---------------- as atividades ---------------- */
    const sub = ctx.subjects().find((s) => s.name === "Área de Matemática") || { name: "Área de Matemática", acts: [] };
    const spots = [{ o: bench, name: "o toca-fitas no banco", at: V3(-2.2, 0.6, 5.6), r: 0.9 }, { o: vend, name: "a máquina de bebidas", at: V3(-3.7, 1.0, 6.2), r: 1.0 }, { o: crossing, name: "a passagem de nível", at: V3(XG.x, 1.6, XG.z), r: 0.8 }];
    const hangarItems = [{ kind: "painel", hit: consoleH, name: "o painel da jaula" }, { kind: "subir", hit: doorH, name: "subir para Tokyo-3" }]; const kioskItem = { kind: "descer", hit: kiosk, name: "descer à jaula" };
    const items = sub.acts.slice(0, 3).map((a, i) => { const s = spots[i]; const hit = add(new T.CylinderGeometry(s.r, s.r, 2.4, 10), K(new T.MeshBasicMaterial()), s.at.x, s.at.y, s.at.z); hit.visible = false;
      const mk = new T.Sprite(K(new T.SpriteMaterial({ map: ctx.glowTex, color: 0xffa040, transparent: true, opacity: 0.6, depthWrite: false, blending: T.AdditiveBlending }))); mk.scale.set(0.5, 0.5, 1); mk.position.copy(s.at).add(V3(0, i === 2 ? 2.4 : 1.2, 0)); scene.add(mk);
      return { a, i, hit, mk, s, hot: 0 }; });

    /* ---------------- o som: cigarras, o sino da passagem ---------------- */
    let audio = null;
    try {
      const ac = new (window.AudioContext || window.webkitAudioContext)(), out = ac.createGain(); out.gain.value = 0; out.connect(ac.destination); const nodes = [];
      const nb = ac.createBuffer(1, ac.sampleRate * 2, ac.sampleRate), d = nb.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
      for (let k = 0; k < 3; k++) { const s = ac.createBufferSource(); s.buffer = nb; s.loop = true; const bq = ac.createBiquadFilter(); bq.type = "bandpass"; bq.frequency.value = 4200 + k * 700; bq.Q.value = 8; const g = ac.createGain(); g.gain.value = 0.0; const lfo = ac.createOscillator(), lg = ac.createGain(); lfo.frequency.value = 7 + k * 3; lg.gain.value = 0.02; lfo.connect(lg).connect(g.gain); s.connect(bq).connect(g).connect(out); s.start(); lfo.start(); nodes.push(s, lfo);
        const swell = () => { if (!audio) return; const t0 = ac.currentTime; g.gain.cancelScheduledValues(t0); g.gain.setValueAtTime(0.0, t0); g.gain.linearRampToValueAtTime(0.045, t0 + 2); g.gain.setValueAtTime(0.045, t0 + 5); g.gain.linearRampToValueAtTime(0.005, t0 + 7); setTimeout(swell, 7000 + Math.random() * 4000); }; setTimeout(swell, k * 1500); }
      const bell = (n) => { if (!audio) return; const t0 = ac.currentTime; for (let i = 0; i < n; i++) for (const f of [740, 1110]) { const o = ac.createOscillator(), g = ac.createGain(); o.frequency.value = f; g.gain.setValueAtTime(0.0001, t0 + i * 0.5); g.gain.exponentialRampToValueAtTime(0.06, t0 + i * 0.5 + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t0 + i * 0.5 + 0.45); o.connect(g).connect(out); o.start(t0 + i * 0.5); o.stop(t0 + i * 0.5 + 0.5); } };
      const alarm = () => { const t0 = ac.currentTime; for (let i = 0; i < 4; i++) { const o = ac.createOscillator(), g = ac.createGain(); o.type = "square"; o.frequency.setValueAtTime(880, t0 + i * 0.7); o.frequency.linearRampToValueAtTime(660, t0 + i * 0.7 + 0.35); g.gain.setValueAtTime(0.0001, t0 + i * 0.7); g.gain.exponentialRampToValueAtTime(0.03, t0 + i * 0.7 + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t0 + i * 0.7 + 0.6); o.connect(g).connect(out); o.start(t0 + i * 0.7); o.stop(t0 + i * 0.7 + 0.65); } };
      out.gain.linearRampToValueAtTime(0.75, ac.currentTime + 2); audio = { ac, out, nodes, bell, alarm };
    } catch (e) { audio = null; }

    /* ---------------- câmera ---------------- */
    const OVER = { pos: OVERP.clone(), tgt: OVERT.clone() };
    const cam = { pos: OVER.pos.clone(), tgt: OVER.tgt.clone(), yaw: 0, pitch: 0, yawT: 0, pitchT: 0 };
    let glide = null, focus = null, hot = null, trainT = 8, atT = 5, bellOn = 0, area = "cidade";
    function goArea(a) { area = a; focus = null; glide = null; const pose = a === "jaula" ? OVER_H : a === "escola" ? OVER_S : OVER; cam.pos.copy(pose.pos); cam.tgt.copy(pose.tgt); cam.yaw = cam.pitch = cam.yawT = cam.pitchT = 0; if (audio && audio.alarm && a === "jaula") audio.alarm(); }
    const smoother = (x) => x * x * x * (x * (x * 6 - 15) + 10);
    function to(pose, dur = 2.0) { if (ctx.reduce) { cam.pos.copy(pose.pos); cam.tgt.copy(pose.tgt); return; } glide = { p0: cam.pos.clone(), t0: cam.tgt.clone(), p1: pose.pos.clone(), t1: pose.tgt.clone(), u: 0, dur }; cam.yawT = cam.pitchT = 0; }
    function openItem(it) { focus = it; const p = it.s.at; const dir = V3(OVERP.x - p.x, 0, OVERP.z - p.z).normalize(); to({ pos: p.clone().addScaledVector(dir, it.i === 2 ? 4.2 : 2.6).add(V3(0, 0.7, 0)), tgt: p.clone().add(V3(0, it.i === 2 ? 0.8 : 0, 0)) }); if (it.i === 2 && audio) { bellOn = 4; audio.bell(6); }
      setTimeout(() => { if (focus === it) ctx.openAct(sub.name, it.i); }, ctx.reduce ? 0 : 1500); }
    setTimeout(() => { try { ctx.toast("Evangelion", "Tokyo-3", "As atividades estão no banco, na máquina de bebidas e na passagem de nível. A cabine do elevador desce até a jaula e o portão leva à escola."); } catch (e) { /* sem aviso */ } }, 900);

    const ray = new T.Raycaster();
    const fxH = ctx.fantasy(sceneH, { center: V3(0, 8, 6), radius: 9, height: 4, colors: ["#ff8a2a", "#ffd070", "#ff4a3a"], count: 0, power: 1.5, dim: 0.8, motes: 0, moteSize: 0.03 });
    const fxS = ctx.fantasy(sceneS, { center: V3(-2, 3, 6), radius: 7, height: 2, colors: ["#ffd8a0", "#ffb0c8", "#a8d8ff"], count: 0, power: 0.8, dim: 0.85, motes: 0, moteSize: 0.02 });
    const fx = ctx.fantasy(scene, { center: V3(0, 3.2, 1), radius: 8, height: 4, colors: ["#ffb050", "#5ae8d8", "#ff6aa0"], count: 0, power: 1.4, dim: 0.75, motes: 0, moteSize: 0.04, size: 1.7, glow: 0.8 });
    return {
      name: "Tokyo-3", sub: "Matemática",
      update(dt, t) {
        fx.update(t); fxH.update(t); fxS.update(t);
        uT.value = t;
        if (glide) { glide.u = Math.min(1, glide.u + dt / glide.dur); const e = smoother(glide.u); cam.pos.lerpVectors(glide.p0, glide.p1, e); cam.tgt.lerpVectors(glide.t0, glide.t1, e); if (glide.u >= 1) glide = null; }
        const k = 1 - Math.exp(-dt * 3.5); cam.yaw += (cam.yawT - cam.yaw) * k; cam.pitch += (cam.pitchT - cam.pitch) * k;
        const d = cam.tgt.clone().sub(cam.pos), r = d.length(), yw = Math.atan2(d.z, d.x) + cam.yaw, pt = Math.asin(Math.max(-0.99, Math.min(0.99, d.y / r))) + cam.pitch;
        camera.position.copy(cam.pos).add(V3(0, Math.sin(t * 0.45) * 0.01, 0)); camera.lookAt(cam.pos.x + Math.cos(yw) * Math.cos(pt), cam.pos.y + Math.sin(pt), cam.pos.z + Math.sin(yw) * Math.cos(pt));
        ramiel.rotation.y = t * 0.15; ramiel.rotation.x = Math.sin(t * 0.2) * 0.2; ramiel.position.y = 52 + Math.sin(t * 0.4) * 1.5;
        if (eva.userData.head) eva.userData.head.rotation.y = Math.sin(t * 0.15) * 0.3;
        atT -= dt; if (atT < 0) { atT = 9 + Math.random() * 8; uAT.value = 0.001; } if (uAT.value > 0) { uAT.value += dt * 0.6; if (uAT.value > 1) uAT.value = 0; }
        // o trem passa: o sino toca, as luzes piscam e a cancela desce
        trainT -= dt; if (trainT < 0 && !train.visible) { train.visible = true; train.position.x = -220; bellOn = 9; if (audio) audio.bell(14); }
        if (train.visible) { train.position.x += dt * 34; if (train.position.x > 180) { train.visible = false; trainT = 30 + Math.random() * 20; } }
        bellOn = Math.max(0, bellOn - dt); const blink = bellOn > 0 ? Math.floor(t * 2.6) % 2 : -1;
        reds.forEach((rl, i) => { const on = blink === i; rl.m.color.set(on ? "#ff2a1a" : "#3a0808"); rl.gl.material.opacity = on ? 0.9 : 0; });
        arm.rotation.z += ((bellOn > 0 ? 0 : Math.PI / 2 - 0.05) - arm.rotation.z) * Math.min(1, dt * 1.5);
        sdatScreen.material.color.setHSL(0.36, 1, 0.4 + 0.1 * Math.sin(t * 3));
        if (area === "jaula") { beacons.forEach((b, i) => { const a = t * 2.4 + i * 1.6; b.bl.target.position.set(b.x + Math.cos(a) * 14, 0, b.z + Math.sin(a) * 14); b.bl.target.updateMatrixWorld(); }); mechH.position.y = -8.0 * 1.4 + Math.sin(t * 0.5) * 0.06; if (mechH.userData.head) mechH.userData.head.rotation.y = Math.sin(t * 0.2) * 0.08; glowL.intensity = 1.2 + Math.sin(t * 1.3) * 0.15; }
        for (const it of items) { it.hot += ((hot === it || focus === it ? 1 : 0) - it.hot) * Math.min(1, dt * 6); it.mk.material.opacity = 0.45 + 0.2 * Math.sin(t * 2 + it.i) + it.hot * 0.4; it.mk.scale.setScalar(0.5 + it.hot * 0.25); }
      },
      render(renderer) { renderer.setRenderTarget(null); renderer.render(area === "jaula" ? sceneH : area === "escola" ? sceneS : scene, camera); },
      resize(w, h) { camera.aspect = w / h; const tall = w / h < 0.8; camera.fov = tall ? 72 : 50; camera.updateProjectionMatrix(); OVER.pos.copy(tall ? V3(-1.4, 1.8, 9.5) : OVERP); if (!focus && !glide) cam.pos.copy(OVER.pos); },
      pick(ndc) { ray.setFromCamera(ndc, camera);
        const find = (list) => { const hits = ray.intersectObjects(list.map((x) => x.hit), true); for (const h of hits) { let o = h.object; while (o) { const it = list.find((x) => x.hit === o); if (it) return it; o = o.parent; } } return null; };
        if (area === "jaula") { const it = find(hangarItems); hot = null; if (!it) return null; if (it.kind === "subir") return { label: ["O elevador", it.name], go: () => goArea("cidade") }; const a = sub.acts[0]; return a ? { label: [a.t, it.name], go: () => { focus = it; to({ pos: V3(-0.3, 7.5, 14.4), tgt: V3(1.0, 7.1, 12.5) }); setTimeout(() => { if (focus === it) ctx.openAct(sub.name, 0); }, ctx.reduce ? 0 : 1500); } } : null; }
        if (area === "escola") { hot = null; if (!board) return null; const h = ray.intersectObject(board, false)[0]; const a = sub.acts[2] || sub.acts[0]; return h && a ? { label: [a.t, "o quadro"], go: () => { focus = { kind: "quadro" }; to({ pos: V3(-2, 2.8, 9), tgt: V3(-2, 2.8, 18.8) }); setTimeout(() => ctx.openAct(sub.name, sub.acts.indexOf(a)), ctx.reduce ? 0 : 1500); } } : null; }
        const k = find([kioskItem]); if (k) { hot = null; return { label: ["O elevador", k.name], go: () => goArea("jaula") }; }
        const gi = find([gateItem]); if (gi) { hot = null; return { label: ["A escola", gi.name], go: () => goArea("escola") }; }
        const it = find(items); hot = it || null; return it ? { label: [it.a.t, it.s.name], go: () => openItem(it) } : null; },
      look(dx, dy) { if (glide) return; cam.yawT = Math.max(-1.0, Math.min(1.0, cam.yawT - dx * 0.003)); cam.pitchT = Math.max(-0.3, Math.min(0.5, cam.pitchT - dy * 0.003)); },
      back() { if (focus) { focus = null; to(area === "jaula" ? OVER_H : area === "escola" ? OVER_S : OVER); return true; } if (area !== "cidade") { goArea("cidade"); return true; } return false; },
      dispose() { if (audio) { const a = audio; audio = null; try { a.out.gain.linearRampToValueAtTime(0, a.ac.currentTime + 0.5); setTimeout(() => { a.nodes.forEach((n) => { try { n.stop(); } catch (e) { /* já parou */ } }); a.ac.close(); }, 700); } catch (e) { /* sem som */ } } keep.forEach((o) => o.dispose && o.dispose()); },
    };
  };
})();
