/* Mundo de Ciências Humanas: o lago dos vaga-lumes. Uma noite de verão na beira de um lago: milhares de
   vaga-lumes piscando sobre o capim e refletidos na água, um píer de madeira, um vidro cheio de luz,
   árvores escuras no horizonte e a lua baixa. Cada atividade da matéria é uma lanterna de papel boiando;
   clicar nela aproxima a câmera e abre o livro. Grilos, sapos e água são feitos na hora pelo navegador.
   Tudo aqui é desenhado por código, sem modelos. */
(() => {
  window.MUNDOS = window.MUNDOS || {};
  window.MUNDOS.vagalumes = (ctx) => {
    const T = ctx.T, V3 = (x, y, z) => new T.Vector3(x, y, z), small = ctx.small;
    const rnd = (() => { let s = 21; return () => (s = (s * 16807) % 2147483647) / 2147483647; })();
    const scene = new T.Scene(); scene.background = new T.Color("#050913"); scene.fog = new T.FogExp2("#070c18", 0.022);
    const camera = new T.PerspectiveCamera(54, ctx.aspect(), 0.05, 400);
    const keep = []; const K = (o) => { keep.push(o); return o; };
    let hot = null;
    const PR = Math.min(window.devicePixelRatio || 1, 1.75);
    const MOON = V3(-0.35, 0.16, -1).normalize();
    const PONDR = 13, OVERP = V3(0.0, 1.55, 15.2);

    /* ---------------- o céu: degradê, estrelas e a lua ---------------- */
    const sky = new T.Mesh(K(new T.SphereGeometry(300, 48, 24)), K(new T.ShaderMaterial({ side: T.BackSide, depthWrite: false, fog: false, uniforms: { uT: { value: 0 }, uM: { value: MOON } },
      vertexShader: "varying vec3 vD; void main(){ vD = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }",
      fragmentShader: `varying vec3 vD; uniform float uT; uniform vec3 uM;
        float hs(vec3 p){ return fract(sin(dot(p, vec3(12.99, 78.23, 37.71))) * 43758.55); }
        void main(){ vec3 d = normalize(vD); float h = d.y;
          vec3 c = mix(vec3(0.07, 0.1, 0.2), vec3(0.012, 0.018, 0.05), smoothstep(-0.05, 0.6, h));
          c += vec3(0.2, 0.16, 0.22) * exp(-max(h, 0.0) * 9.0) * 0.5;
          vec2 fx = normalize(vec2(0.75, -0.66)); float fire = pow(max(dot(normalize(d.xz + 1e-4), fx), 0.0), 10.0) * exp(-max(h, 0.0) * 7.0) * smoothstep(-0.03, 0.03, h); c += vec3(0.55, 0.16, 0.05) * fire * (0.42 + 0.06 * sin(uT * 0.7)); float m = dot(d, uM); c += vec3(0.35, 0.38, 0.5) * pow(max(m, 0.0), 24.0) * 0.6;
          for (int L = 0; L < 2; L++) { float sc = 220.0 + float(L) * 160.0; vec3 q = d * sc, i = floor(q); float s = hs(i + float(L) * 9.0);
            vec3 o = vec3(hs(i + 2.1), hs(i + 5.3), hs(i + 8.7)) * 0.6 + 0.2; float tw = 0.6 + 0.4 * sin(uT * (1.0 + s * 2.0) + s * 40.0);
            c += vec3(0.85, 0.9, 1.0) * step(0.984, s) * smoothstep(0.08, 0.0, length(fract(q) - o)) * tw * step(0.02, h) * (1.3 - float(L) * 0.5); }
          gl_FragColor = vec4(c, 1.0); }` })));
    scene.add(sky);
    const moon = new T.Mesh(K(new T.CircleGeometry(7, 48)), K(new T.ShaderMaterial({ fog: false, transparent: true, depthWrite: false, uniforms: {},
      vertexShader: "varying vec2 vU; void main(){ vU = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }",
      fragmentShader: `varying vec2 vU; float h(vec2 p){ return fract(sin(dot(p, vec2(12.9, 78.2))) * 43758.5); }
        void main(){ vec2 p = vU - 0.5; float r = length(p) * 2.0, cr = 0.0; for (int i = 0; i < 8; i++) { vec2 c = vec2(h(vec2(float(i), 3.0)), h(vec2(float(i), 4.0))) - 0.5; cr += smoothstep(0.13, 0.0, length(p - c * 0.7)) * 0.16; }
          gl_FragColor = vec4(vec3(1.0, 0.96, 0.86) * (1.0 - cr), smoothstep(1.0, 0.95, r)); }` })));
    moon.position.copy(MOON).multiplyScalar(220); moon.lookAt(0, 0, 0); scene.add(moon);
    const mglow = new T.Sprite(K(new T.SpriteMaterial({ map: ctx.glowTex, color: 0xb8c4e6, transparent: true, opacity: 0.55, depthWrite: false, blending: T.AdditiveBlending, fog: false }))); mglow.scale.set(90, 90, 1); mglow.position.copy(moon.position); scene.add(mglow);

    /* ---------------- o chão: margem, morros baixos e árvores escuras no horizonte ---------------- */
    const ground = new T.Mesh(K(new T.RingGeometry(PONDR - 0.4, 140, 96, 16)), K(new T.ShaderMaterial({ fog: true, uniforms: Object.assign({ uT: { value: 0 } }, T.UniformsLib.fog),
      vertexShader: `varying vec3 vW; 
${T.ShaderChunk.fog_pars_vertex}

        float h(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
        float n(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f); return mix(mix(h(i), h(i + vec2(1, 0)), f.x), mix(h(i + vec2(0, 1)), h(i + vec2(1, 1)), f.x), f.y); }
        void main(){ vec3 p = position; vec3 w0 = (modelMatrix * vec4(p, 1.0)).xyz; float d = length(w0.xz);
          float hill = smoothstep(PONDR_ + 2.0, 60.0, d) * (n(w0.xz * 0.04) * 9.0 + n(w0.xz * 0.11) * 2.5);
          float bank = smoothstep(PONDR_ - 0.4, PONDR_ + 1.8, d) * 0.35;
          vec4 w = modelMatrix * vec4(p, 1.0); w.y += hill + bank - 0.15; vW = w.xyz; vec4 mvPosition = viewMatrix * w; gl_Position = projectionMatrix * mvPosition; 
${T.ShaderChunk.fog_vertex}
 }`,
      fragmentShader: `varying vec3 vW; 
${T.ShaderChunk.fog_pars_fragment}

        void main(){ float d = length(vW.xz); vec3 c = mix(vec3(0.04, 0.07, 0.05), vec3(0.02, 0.035, 0.04), smoothstep(14.0, 60.0, d));
          c += vec3(0.05, 0.07, 0.12) * smoothstep(0.0, 6.0, vW.y) * 0.6; gl_FragColor = vec4(c, 1.0); 
${T.ShaderChunk.fog_fragment}
 }`.replace(/PONDR_/g, PONDR.toFixed(1)) })));
    ground.material.vertexShader = ground.material.vertexShader.replace(/PONDR_/g, PONDR.toFixed(1));
    ground.rotation.x = -Math.PI / 2; scene.add(ground);
    // árvores: silhuetas em camadas, mais escuras que o céu
    { const mat = K(new T.MeshBasicMaterial({ color: "#03060a" })), cone = K(new T.ConeGeometry(1, 1, 7));
      const n = small ? 90 : 170, im = new T.InstancedMesh(cone, mat, n), m = new T.Matrix4();
      let c = 0; for (let i = 0; i < n; i++) { const a = rnd() * Math.PI * 2, r = 34 + rnd() * 55, hgt = 5 + rnd() * 11, w = hgt * (0.28 + rnd() * 0.12); if (Math.abs(((a - Math.atan2(MOON.z, MOON.x)) + Math.PI * 3) % (Math.PI * 2) - Math.PI) < 0.18) continue; m.compose(V3(Math.cos(a) * r, hgt / 2 + 1.5 + rnd() * 2, Math.sin(a) * r), new T.Quaternion(), V3(w, hgt, w)); im.setMatrixAt(c++, m); } im.count = c;
      scene.add(im); }

    /* ---------------- a água: escura, refletindo o céu, a lua e tudo que brilha ---------------- */
    const water = new T.Mesh(K(new T.CircleGeometry(PONDR + 0.2, 96)), K(new T.ShaderMaterial({ transparent: true, depthWrite: false, uniforms: { uT: { value: 0 }, uM: { value: MOON } },
      vertexShader: "varying vec3 vW; void main(){ vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }",
      fragmentShader: `varying vec3 vW; uniform float uT; uniform vec3 uM;
        float h(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
        float n(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f); return mix(mix(h(i), h(i + vec2(1, 0)), f.x), mix(h(i + vec2(0, 1)), h(i + vec2(1, 1)), f.x), f.y); }
        void main(){ vec3 V = normalize(cameraPosition - vW); vec2 p = vW.xz;
          float rip = n(p * 1.6 + vec2(uT * 0.25, uT * 0.18)) * 0.6 + n(p * 4.0 - vec2(uT * 0.4, -uT * 0.3)) * 0.4;
          vec3 N = normalize(vec3((rip - 0.5) * 0.18, 1.0, (n(p * 1.6 + 7.0 + uT * 0.2) - 0.5) * 0.18));
          vec3 R = reflect(-V, N); float fr = pow(1.0 - max(V.y, 0.0), 3.0) * 0.85 + 0.1;
          vec3 skyc = mix(vec3(0.07, 0.1, 0.2), vec3(0.015, 0.02, 0.05), smoothstep(0.0, 0.6, R.y));
          float glint = pow(max(dot(R, uM), 0.0), 260.0) * 1.6 + pow(max(dot(R, uM), 0.0), 22.0) * 0.12;
          vec3 c = mix(vec3(0.004, 0.01, 0.02), skyc, fr) + vec3(1.0, 0.95, 0.85) * glint;
          float edge = smoothstep(${PONDR.toFixed(1)} + 0.2, ${PONDR.toFixed(1)} - 1.2, length(p));
          gl_FragColor = vec4(c, mix(0.98, 0.72, fr) * edge + (1.0 - edge) * 0.0); }` })));
    water.rotation.x = -Math.PI / 2; water.position.y = 0.0; water.renderOrder = 5; scene.add(water);
    // um fundo bem escuro embaixo da água (onde ficam os reflexos)
    { const bed = new T.Mesh(K(new T.CircleGeometry(PONDR + 0.4, 64)), K(new T.MeshBasicMaterial({ color: "#020407" }))); bed.rotation.x = -Math.PI / 2; bed.position.y = -6; scene.add(bed); const wall = new T.Mesh(K(new T.CylinderGeometry(PONDR + 0.4, PONDR + 0.4, 6.3, 64, 1, true)), bed.material); wall.material.side = T.DoubleSide; wall.position.y = -2.95; scene.add(wall); }

    /* ---------------- o capim: milhares de folhas balançando no vento ---------------- */
    { const N = small ? 5000 : 11000, blade = new T.PlaneGeometry(0.05, 0.75, 1, 4); blade.translate(0, 0.375, 0);
      const mat = K(new T.ShaderMaterial({ side: T.DoubleSide, fog: true, uniforms: Object.assign({ uT: { value: 0 } }, T.UniformsLib.fog),
        vertexShader: `uniform float uT; varying float vH; varying vec3 vW; 
${T.ShaderChunk.fog_pars_vertex}

          void main(){ vec4 w = modelMatrix * instanceMatrix * vec4(position, 1.0); vec3 base = (modelMatrix * instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0)).xyz; float k = position.y / 0.75; vH = k;
            float wind = sin(uT * 1.3 + base.x * 0.35 + base.z * 0.22) * 0.5 + sin(uT * 2.7 + base.x * 1.1) * 0.18;
            w.x += wind * k * k * 0.22; w.z += wind * k * k * 0.12; vW = w.xyz; vec4 mvPosition = viewMatrix * w; gl_Position = projectionMatrix * mvPosition; 
${T.ShaderChunk.fog_vertex}
 }`,
        fragmentShader: `varying float vH; varying vec3 vW; 
${T.ShaderChunk.fog_pars_fragment}

          void main(){ vec3 c = mix(vec3(0.01, 0.025, 0.015), vec3(0.06, 0.14, 0.09), vH); c += vec3(0.08, 0.1, 0.16) * vH * vH * 0.6; gl_FragColor = vec4(c, 1.0); 
${T.ShaderChunk.fog_fragment}
 }` }));
      const im = new T.InstancedMesh(blade, mat, N), m = new T.Matrix4(), q = new T.Quaternion(); let k = 0;
      while (k < N) { const a = rnd() * Math.PI * 2, r = PONDR - 0.2 + Math.pow(rnd(), 1.6) * 22; const x = Math.cos(a) * r, z = Math.sin(a) * r; if (z > 8 && Math.abs(x) < 1.2 + (z - 8) * 0.9) continue; q.setFromAxisAngle(V3(0, 1, 0), rnd() * Math.PI); const s = 0.6 + rnd() * 0.9; m.compose(V3(x, 0.2 + Math.max(0, (r - PONDR) * 0.03), z), q, V3(1, s, 1)); im.setMatrixAt(k++, m); }
      im.frustumCulled = false; scene.add(im); keep.push(mat); }
    // juncos altos na beira da água
    { const N = small ? 300 : 650, reed = new T.CylinderGeometry(0.012, 0.02, 1.6, 4); reed.translate(0, 0.8, 0); const mat = K(new T.MeshBasicMaterial({ color: "#0b1a12" }));
      const im = new T.InstancedMesh(reed, mat, N), m = new T.Matrix4(); for (let i = 0; i < N; i++) { const a = rnd() * Math.PI * 2, r = PONDR - 1.2 + rnd() * 2.2; if (Math.sin(a) > 0.55 && Math.abs(Math.cos(a)) < 0.7) { i--; continue; } const tilt = new T.Quaternion().setFromEuler(new T.Euler((rnd() - 0.5) * 0.25, rnd() * 3, (rnd() - 0.5) * 0.25)); m.compose(V3(Math.cos(a) * r, -0.1, Math.sin(a) * r), tilt, V3(1, 0.7 + rnd() * 0.8, 1)); im.setMatrixAt(i, m); } scene.add(im); }

    /* ---------------- o píer, o banco e o vidro cheio de vaga-lumes ---------------- */
    const wood = K(new T.MeshStandardMaterial({ color: "#3a2a1e", roughness: 0.9 })), woodD = K(new T.MeshStandardMaterial({ color: "#241810", roughness: 0.9 }));
    const dock = new T.Group(); scene.add(dock);
    for (let i = 0; i < 18; i++) { const b = new T.Mesh(K(new T.BoxGeometry(1.6, 0.06, 0.22)), wood); b.position.set((rnd() - 0.5) * 0.04, 0.42, 14.2 - i * 0.26); b.rotation.y = (rnd() - 0.5) * 0.03; dock.add(b); }
    for (const z of [14, 12.4, 10.8, 9.9]) for (const x of [-0.72, 0.72]) { const p = new T.Mesh(K(new T.CylinderGeometry(0.07, 0.08, 1.4, 8)), woodD); p.position.set(x, -0.2, z); dock.add(p); }
    for (const x of [-0.82, 0.82]) { const rail = new T.Mesh(K(new T.BoxGeometry(0.06, 0.06, 4.4)), woodD); rail.position.set(x, 0.62, 12.0); dock.add(rail); }
    { const jar = new T.Group(); const glass = new T.Mesh(K(new T.CylinderGeometry(0.11, 0.12, 0.28, 18, 1, true)), K(new T.MeshBasicMaterial({ color: "#a9d8c0", transparent: true, opacity: 0.18, side: T.DoubleSide, depthWrite: false })));
      glass.position.y = 0.14; jar.add(glass); const lid = new T.Mesh(K(new T.CylinderGeometry(0.115, 0.115, 0.03, 18)), K(new T.MeshStandardMaterial({ color: "#5a4a3a", roughness: 0.6, metalness: 0.4 }))); lid.position.y = 0.29; jar.add(lid);
      jar.position.set(0.55, 0.45, 10.6); scene.add(jar);
      const jl = new T.PointLight("#c8ff7a", 0.9, 3.5, 2); jl.position.set(0.55, 0.62, 10.6); scene.add(jl); }
    // a latinha de balas de frutas, esquecida no píer ao lado do vidro
    { const c = document.createElement("canvas"); c.width = 256; c.height = 128; const g = c.getContext("2d"); g.fillStyle = "#b8322a"; g.fillRect(0, 0, 256, 128);
      const cols = ["#f4c542", "#6fbf4a", "#e8e0d0", "#f08a3c", "#c94f8a"]; for (let i = 0; i < 18; i++) { g.fillStyle = cols[i % cols.length]; g.beginPath(); g.arc(12 + i * 14, 64 + Math.sin(i * 1.7) * 26, 9, 0, 7); g.fill(); }
      g.fillStyle = "#f3e6c8"; g.fillRect(0, 0, 256, 14); g.fillRect(0, 114, 256, 14);
      const tin = new T.Mesh(K(new T.CylinderGeometry(0.06, 0.06, 0.15, 20)), [K(new T.MeshStandardMaterial({ map: K(new T.CanvasTexture(c)), roughness: 0.45, metalness: 0.5 })), K(new T.MeshStandardMaterial({ color: "#c9c1b0", roughness: 0.3, metalness: 0.8 })), K(new T.MeshStandardMaterial({ color: "#c9c1b0", roughness: 0.3, metalness: 0.8 }))]);
      tin.position.set(0.3, 0.525, 10.75); tin.rotation.y = 0.6; scene.add(tin); }
    // o abrigo na encosta: uma boca de caverna escura, um mosquiteiro dentro, e vaga-lumes presos nele
    const SH = V3(-8.6, 0, -11.6), SHD = V3(SH.x - OVERP.x, 0, SH.z - OVERP.z).normalize();
    { const hill = new T.Mesh(K(new T.SphereGeometry(1, 40, 20, 0, Math.PI * 2, 0, Math.PI / 2)), K(new T.MeshStandardMaterial({ color: "#0d1610", roughness: 1 }))); hill.scale.set(4.2, 3.3, 3.4); hill.position.copy(SH).addScaledVector(SHD, 3.5).setY(-0.3); scene.add(hill);
      const mouth = new T.Mesh(K(new T.CircleGeometry(1.35, 28, 0, Math.PI)), K(new T.MeshBasicMaterial({ color: "#010203" }))); mouth.position.copy(SH).addScaledVector(SHD, 0.25).setY(0.05); mouth.lookAt(OVERP); mouth.scale.set(1, 1.25, 1); scene.add(mouth);
      const net = new T.Mesh(K(new T.BoxGeometry(1.1, 0.8, 0.9)), K(new T.MeshBasicMaterial({ color: "#a8d8a0", transparent: true, opacity: 0.08, depthWrite: false, side: T.DoubleSide }))); net.position.copy(SH).addScaledVector(SHD, -0.35).setY(0.45); net.lookAt(OVERP.clone().setY(net.position.y)); scene.add(net);
      const nl = new T.PointLight("#bfff6a", 1.4, 6, 2); nl.position.copy(SH).addScaledVector(SHD, -0.8).setY(0.7); scene.add(nl);
      const glow = new T.Sprite(K(new T.SpriteMaterial({ map: ctx.glowTex, color: 0xb8ff70, transparent: true, opacity: 0.35, depthWrite: false, blending: T.AdditiveBlending }))); glow.scale.set(4.5, 3.2, 1); glow.position.copy(SH).addScaledVector(SHD, -0.6).setY(0.6); scene.add(glow); }
    scene.add(new T.AmbientLight("#1a2440", 0.9)); const ml = new T.DirectionalLight("#8ea0d0", 0.55); ml.position.copy(MOON).multiplyScalar(50); scene.add(ml);

    /* ---------------- os vaga-lumes (e o reflexo deles na água) ---------------- */
    const FF_VS = `attribute vec3 aS; uniform float uT, uMir, uPR; varying float vA;
      void main(){ vec3 p = position; float t = uT * 0.22 + aS.x * 30.0;
        p += vec3(sin(t * 1.3 + aS.y * 6.0) * 1.1 + sin(t * 0.37 + aS.z) * 2.0, sin(t * 0.9 + aS.z * 5.0) * 0.35, cos(t * 1.1 + aS.x * 7.0) * 1.1 + cos(t * 0.29 + aS.y) * 2.0);
        p.y = max(p.y, 0.15); if (uMir > 0.5) p.y = -p.y;
        float bl = sin(uT * (1.1 + aS.y * 1.7) + aS.z * 40.0) * 0.5 + 0.5; bl = smoothstep(0.45, 1.0, bl);
        vA = bl * (uMir > 0.5 ? 0.38 : 1.0);
        vec4 mv = modelViewMatrix * vec4(p, 1.0); gl_PointSize = min(64.0, uPR * (70.0 + aS.x * 60.0) / max(0.5, -mv.z) * (0.3 + 0.7 * bl)); gl_Position = projectionMatrix * mv; }`;
    const FF_FS = `varying float vA; void main(){ vec2 d = gl_PointCoord - 0.5; float r = length(d); float a = smoothstep(0.5, 0.0, r); float core = smoothstep(0.14, 0.0, r);
      gl_FragColor = vec4((vec3(0.78, 1.0, 0.38) * a * a + vec3(1.0, 1.0, 0.85) * core) * vA * 1.4, (a * a + core) * vA); }`;
    const NF = small ? 1800 : 3600, ffG = new T.BufferGeometry(), fp = new Float32Array(NF * 3), fs = new Float32Array(NF * 3);
    for (let i = 0; i < NF; i++) { const a = rnd() * Math.PI * 2, r = Math.pow(rnd(), 0.7) * 30, near = rnd() < 0.35; const x = near ? (rnd() - 0.5) * 12 : Math.cos(a) * r, z = near ? 2 + rnd() * 12 : Math.sin(a) * r; fp.set([x, 0.3 + Math.pow(rnd(), 1.8) * 3.6, z], i * 3); fs.set([rnd(), rnd(), rnd()], i * 3); }
    ffG.setAttribute("position", new T.BufferAttribute(fp, 3)); ffG.setAttribute("aS", new T.BufferAttribute(fs, 3)); keep.push(ffG);
    const ffMat = (mir) => K(new T.ShaderMaterial({ uniforms: { uT: { value: 0 }, uMir: { value: mir }, uPR: { value: PR * (innerHeight / 800) } }, vertexShader: FF_VS, fragmentShader: FF_FS, transparent: true, depthWrite: false, blending: T.AdditiveBlending }));
    const flies = new T.Points(ffG, ffMat(0)), fliesR = new T.Points(ffG, ffMat(1)); flies.frustumCulled = fliesR.frustumCulled = false; scene.add(flies, fliesR);
    // os do vidro: um enxame pequeno preso lá dentro
    const NJ = 40, NN = 70, jarG = new T.BufferGeometry(), jp = new Float32Array((NJ + NN) * 3), js = new Float32Array((NJ + NN) * 3); for (let i = 0; i < NJ + NN; i++) { const inJar = i < NJ; jp.set(inJar ? [0.55 + (rnd() - 0.5) * 0.12, 0.52 + rnd() * 0.18, 10.6 + (rnd() - 0.5) * 0.12] : [SH.x - SHD.x * 0.35 + (rnd() - 0.5) * 1.0, 0.15 + rnd() * 0.7, SH.z - SHD.z * 0.35 + (rnd() - 0.5) * 0.8], i * 3); js.set([rnd(), rnd(), inJar ? rnd() : 2 + rnd()], i * 3); }
    jarG.setAttribute("position", new T.BufferAttribute(jp, 3)); jarG.setAttribute("aS", new T.BufferAttribute(js, 3));
    const jarFF = new T.Points(jarG, K(new T.ShaderMaterial({ uniforms: { uT: { value: 0 }, uPR: { value: PR * (innerHeight / 800) } }, transparent: true, depthWrite: false, blending: T.AdditiveBlending,
      vertexShader: `attribute vec3 aS; uniform float uT, uPR; varying float vA; void main(){ vec3 p = position + vec3(sin(uT * 2.0 + aS.x * 9.0), sin(uT * 1.6 + aS.y * 7.0), cos(uT * 1.8 + aS.z * 8.0)) * (aS.z > 1.5 ? 0.2 : 0.035); float bl = smoothstep(0.3, 1.0, sin(uT * (2.0 + aS.y) + aS.z * 20.0) * 0.5 + 0.5); vA = bl; vec4 mv = modelViewMatrix * vec4(p, 1.0); gl_PointSize = min(40.0, uPR * 30.0 / max(0.3, -mv.z) * (0.4 + bl)); gl_Position = projectionMatrix * mv; }`, fragmentShader: FF_FS })));
    jarFF.frustumCulled = false; scene.add(jarFF);

    /* ---------------- as lanternas de papel: uma atividade em cada ---------------- */
    const sub = ctx.subjects().find((s) => s.name === "Ciências Humanas") || { name: "Ciências Humanas", acts: [] };
    function paperTex(title, i) {
      const c = document.createElement("canvas"); c.width = 256; c.height = 256; const g = c.getContext("2d");
      const gr = g.createLinearGradient(0, 0, 0, 256); gr.addColorStop(0, "#ffd9a0"); gr.addColorStop(0.5, "#ffe9c4"); gr.addColorStop(1, "#f2a85a"); g.fillStyle = gr; g.fillRect(0, 0, 256, 256);
      g.strokeStyle = "rgba(140,70,20,0.35)"; g.lineWidth = 2; for (let y = 22; y < 256; y += 36) { g.beginPath(); g.moveTo(0, y); g.lineTo(256, y); g.stroke(); }
      g.fillStyle = "#5a2a0e"; g.textAlign = "center"; g.font = "700 26px 'Cormorant Garamond', serif";
      const words = title.split(/\s+/), lines = []; let line = ""; for (const w of words) { const tt = line ? line + " " + w : w; if (g.measureText(tt).width > 200 && line) { lines.push(line); line = w; } else line = tt; } if (line) lines.push(line);
      lines.slice(0, 4).forEach((l, k) => g.fillText(l, 128, 128 - (Math.min(4, lines.length) - 1) * 15 + k * 30));
      g.font = "500 13px 'Geist Mono', monospace"; g.fillStyle = "rgba(90,42,14,0.7)"; g.fillText(String(i + 1).padStart(2, "0"), 128, 232);
      return K(new T.CanvasTexture(c));
    }
    const lanterns = [];
    const LP = sub.acts.map((a, i) => { const n = sub.acts.length, k = (i - (n - 1) / 2) / Math.max(1, (n - 1) / 2); return V3(k * 4.2, 0, 6.6 - Math.abs(k) * 1.6 - (i % 2) * 1.4); });
    sub.acts.forEach((a, i) => {
      const g = new T.Group(); const paper = new T.Mesh(K(new T.CylinderGeometry(0.34, 0.3, 0.62, 20, 1, true)), K(new T.MeshBasicMaterial({ map: paperTex(a.t, i), side: T.DoubleSide, transparent: true, opacity: 0.95 })));
      paper.position.y = 0.42; g.add(paper);
      const capM = K(new T.MeshStandardMaterial({ color: "#2a1a10", roughness: 0.8 })); const top = new T.Mesh(K(new T.CylinderGeometry(0.2, 0.36, 0.06, 20)), capM); top.position.y = 0.76; g.add(top); const base = new T.Mesh(K(new T.CylinderGeometry(0.33, 0.3, 0.07, 20)), capM); base.position.y = 0.1; g.add(base);
      const raft = new T.Mesh(K(new T.BoxGeometry(0.72, 0.06, 0.72)), wood); raft.position.y = 0.04; g.add(raft);
      const glow = new T.Sprite(K(new T.SpriteMaterial({ map: ctx.glowTex, color: 0xffb060, transparent: true, opacity: 0.7, depthWrite: false, blending: T.AdditiveBlending }))); glow.scale.set(2.6, 2.6, 1); glow.position.y = 0.45; g.add(glow);
      const light = new T.PointLight("#ffb060", 0.9, 5, 2); light.position.y = 0.5; g.add(light);
      g.position.copy(LP[i]); scene.add(g);
      // o reflexo: a mesma lanterna de cabeça para baixo, embaixo da água
      const rg = g.clone(true); rg.scale.y = -1; rg.traverse((o) => { if (o.isPointLight) o.intensity = 0; if (o.material && o.material.opacity != null && o.isSprite) { o.material = o.material.clone(); o.material.opacity = 0.35; } }); scene.add(rg);
      lanterns.push({ g, rg, paper, glow, a, i, ph: rnd() * 6, home: LP[i].clone(), hot: 0 });
    });

    /* ---------------- o som da noite ---------------- */
    let audio = null;
    try {
      const ac = new (window.AudioContext || window.webkitAudioContext)(), out = ac.createGain(); out.gain.value = 0; out.connect(ac.destination);
      const nb = ac.createBuffer(1, ac.sampleRate * 2, ac.sampleRate), d = nb.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
      const water = ac.createBufferSource(); water.buffer = nb; water.loop = true; const wl = ac.createBiquadFilter(); wl.type = "lowpass"; wl.frequency.value = 380; const wg = ac.createGain(); wg.gain.value = 0.05; water.connect(wl).connect(wg).connect(out); water.start();
      const nodes = [water];
      // grilos: tons agudos ligados e desligados em pulsos
      for (let k = 0; k < 4; k++) { const o = ac.createOscillator(), g = ac.createGain(), am = ac.createOscillator(), ag = ac.createGain(), pan = ac.createStereoPanner ? ac.createStereoPanner() : null;
        o.frequency.value = 4100 + k * 230; am.type = "square"; am.frequency.value = 14 + k * 3.1; ag.gain.value = 0.5; g.gain.value = 0.0; am.connect(ag).connect(g.gain); o.connect(g); if (pan) { pan.pan.value = [-0.7, 0.6, -0.2, 0.9][k]; g.connect(pan).connect(out); } else g.connect(out); o.start(); am.start(); nodes.push(o, am);
        const chirp = () => { if (!audio) return; const t0 = ac.currentTime; g.gain.cancelScheduledValues(t0); g.gain.setValueAtTime(0.0, t0); g.gain.linearRampToValueAtTime(0.012, t0 + 0.05); g.gain.setValueAtTime(0.012, t0 + 0.35 + Math.random() * 0.5); g.gain.linearRampToValueAtTime(0.0, t0 + 0.9); setTimeout(chirp, 900 + Math.random() * 2600); };
        setTimeout(chirp, 300 + k * 700); }
      // sapos: um coaxar grave de vez em quando
      const frog = () => { if (!audio) return; const t0 = ac.currentTime, o = ac.createOscillator(), g = ac.createGain(), f = ac.createBiquadFilter(); o.type = "sawtooth"; o.frequency.setValueAtTime(150 + Math.random() * 40, t0); o.frequency.linearRampToValueAtTime(110, t0 + 0.22); f.type = "lowpass"; f.frequency.value = 600; o.connect(f).connect(g).connect(out); g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(0.05, t0 + 0.03); g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.28); o.start(t0); o.stop(t0 + 0.3); setTimeout(frog, 2500 + Math.random() * 6000); };
      setTimeout(frog, 1800);
      out.gain.linearRampToValueAtTime(0.8, ac.currentTime + 2.5);
      audio = { ac, out, nodes };
    } catch (e) { audio = null; }

    /* ---------------- câmera ---------------- */
    const OVER = { pos: OVERP.clone(), tgt: V3(0.0, 1.1, 0.0) };
    const cam = { pos: OVER.pos.clone(), tgt: OVER.tgt.clone(), yaw: 0, pitch: 0, yawT: 0, pitchT: 0 };
    let glide = null, focus = null;
    const smoother = (x) => x * x * x * (x * (x * 6 - 15) + 10);
    function to(pose, dur = 2.0) { if (ctx.reduce) { cam.pos.copy(pose.pos); cam.tgt.copy(pose.tgt); return; } glide = { p0: cam.pos.clone(), t0: cam.tgt.clone(), p1: pose.pos.clone(), t1: pose.tgt.clone(), u: 0, dur }; cam.yawT = cam.pitchT = 0; }
    function openLantern(l) {
      focus = l; const p = l.g.position, dir = V3(OVER.pos.x - p.x, 0, OVER.pos.z - p.z).normalize();
      to({ pos: p.clone().addScaledVector(dir, 2.1).add(V3(innerWidth > 760 ? -0.55 : 0, 0.75, 0)), tgt: p.clone().add(V3(innerWidth > 760 ? 0.45 : 0, 0.45, 0)) });
      setTimeout(() => { if (focus === l) ctx.openAct(sub.name, l.i); }, ctx.reduce ? 0 : 1500);
    }

    const ray = new T.Raycaster();
    return {
      name: "O lago dos vaga-lumes", sub: "Ciências Humanas", scene,
      update(dt, t) {
        if (glide) { glide.u = Math.min(1, glide.u + dt / glide.dur); const e = smoother(glide.u); cam.pos.lerpVectors(glide.p0, glide.p1, e); cam.tgt.lerpVectors(glide.t0, glide.t1, e); if (glide.u >= 1) glide = null; }
        const k = 1 - Math.exp(-dt * 3.5); cam.yaw += (cam.yawT - cam.yaw) * k; cam.pitch += (cam.pitchT - cam.pitch) * k;
        const d = cam.tgt.clone().sub(cam.pos), r = d.length(), yw = Math.atan2(d.z, d.x) + cam.yaw, pt = Math.asin(Math.max(-0.99, Math.min(0.99, d.y / r))) + cam.pitch;
        camera.position.copy(cam.pos).add(V3(0, Math.sin(t * 0.45) * 0.015, 0)); camera.lookAt(cam.pos.x + Math.cos(yw) * Math.cos(pt), cam.pos.y + Math.sin(pt), cam.pos.z + Math.sin(yw) * Math.cos(pt));
        sky.material.uniforms.uT.value = t; water.material.uniforms.uT.value = t; flies.material.uniforms.uT.value = t; fliesR.material.uniforms.uT.value = t; jarFF.material.uniforms.uT.value = t;
        scene.traverse((o) => { if (o.isInstancedMesh && o.material.uniforms && o.material.uniforms.uT) o.material.uniforms.uT.value = t; });
        for (const l of lanterns) {
          l.hot += ((hot === l || focus === l ? 1 : 0) - l.hot) * Math.min(1, dt * 5);
          const bob = Math.sin(t * 0.9 + l.ph) * 0.03, drift = V3(Math.sin(t * 0.11 + l.ph) * 0.25, 0, Math.cos(t * 0.09 + l.ph) * 0.18);
          l.g.position.copy(l.home).add(drift).setY(bob); l.g.rotation.set(Math.sin(t * 0.7 + l.ph) * 0.03, t * 0.05 + l.ph, Math.cos(t * 0.6 + l.ph) * 0.03);
          l.rg.position.copy(l.g.position).setY(-bob); l.rg.rotation.copy(l.g.rotation);
          l.glow.material.opacity = 0.55 + 0.15 * Math.sin(t * 2.3 + l.ph) + l.hot * 0.35; l.glow.scale.setScalar(2.6 + l.hot * 0.8);
        }
      },
      render(renderer) { renderer.setRenderTarget(null); renderer.render(scene, camera); },
      resize(w, h) { camera.aspect = w / h; camera.fov = w / h < 0.8 ? 66 : 54; camera.updateProjectionMatrix(); const tall = w / h < 0.8; OVER.pos.set(0, tall ? 3.4 : 1.55, tall ? 21.5 : 15.2); OVER.tgt.set(0, tall ? 0.6 : 1.1, tall ? 2.0 : 0); if (!focus && !glide) { cam.pos.copy(OVER.pos); cam.tgt.copy(OVER.tgt); } const pr = PR * (h / 800); flies.material.uniforms.uPR.value = fliesR.material.uniforms.uPR.value = jarFF.material.uniforms.uPR.value = pr; },
      pick(ndc) { ray.setFromCamera(ndc, camera); const hits = ray.intersectObjects(lanterns.map((l) => l.paper), false); const l = hits[0] && lanterns.find((x) => x.paper === hits[0].object); hot = l || null; return l ? { label: [l.a.t, "abrir a lanterna"], go: () => openLantern(l) } : null; },
      look(dx, dy) { if (glide) return; cam.yawT = Math.max(-0.9, Math.min(0.9, cam.yawT - dx * 0.003)); cam.pitchT = Math.max(-0.3, Math.min(0.4, cam.pitchT - dy * 0.003)); },
      back() { if (focus) { focus = null; to(OVER); return true; } return false; },
      dispose() { if (audio) { const a = audio; audio = null; try { a.out.gain.cancelScheduledValues(a.ac.currentTime); a.out.gain.setValueAtTime(a.out.gain.value, a.ac.currentTime); a.out.gain.linearRampToValueAtTime(0, a.ac.currentTime + 0.6); setTimeout(() => { a.nodes.forEach((n) => { try { n.stop(); } catch (e) { /* já parou */ } }); a.ac.close(); }, 800); } catch (e) { /* sem som */ } } keep.forEach((o) => o.dispose && o.dispose()); },
    };
  };
})();
