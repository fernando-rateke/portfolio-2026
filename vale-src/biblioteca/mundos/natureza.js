/* Mundo de Ciências da Natureza, no clima de Meu Amigo Totoro e Ponyo. O ponto de ônibus no meio da floresta,
   à noite, na chuva: o guardião da mata (um espírito de cervo coberto de musgo, com lanternas nos chifres)
   espera debaixo da lâmpada do poste, a grande cânfora fica atrás com cogumelos acesos nas raízes, e um velho
   ônibus de madeira passa de vez em quando com os faróis acesos. Na beira da estrada, um laguinho com um balde
   verde soltando bolhas. Cada atividade é uma bolota plantada na grama: clicar nela faz a muda crescer,
   aproxima a câmera e abre o livro. Personagens originais; o balde vem do vale; o resto é desenhado aqui. */
(() => {
  window.MUNDOS = window.MUNDOS || {};
  window.MUNDOS.natureza = (ctx) => {
    const T = ctx.T, V3 = (x, y, z) => new T.Vector3(x, y, z), small = ctx.small;
    let seed = 11; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    const sm = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
    const keep = []; const K = (o) => { keep.push(o); return o; };
    const scene = new T.Scene(); scene.background = new T.Color("#0a1519"); scene.fog = new T.FogExp2("#0d1b20", 0.05);
    const camera = new T.PerspectiveCamera(52, ctx.aspect(), 0.05, 300);
    const OVERP = V3(1.2, 1.65, 8.2), OVERT = V3(0.2, 1.55, -2.2);
    const uT = { value: 0 };

    /* ---------------- luz ---------------- */
    scene.add(new T.HemisphereLight("#3a5a6a", "#0c140e", 0.9));
    const moon = new T.DirectionalLight("#7a9ac0", 0.35); moon.position.set(-6, 10, 4); scene.add(moon);
    const LAMP = V3(3.1, 4.05, -2.35);
    const lamp = new T.PointLight("#ffd08a", 2.6, 14, 1.6); lamp.position.copy(LAMP).add(V3(0, -0.2, 0)); scene.add(lamp);

    /* ---------------- o chão: estrada de terra molhada, poças, grama ---------------- */
    const ground = new T.Mesh(K(new T.PlaneGeometry(120, 120, 1, 1)), K(new T.ShaderMaterial({ fog: true, uniforms: Object.assign({ uT, uL: { value: LAMP } }, T.UniformsLib.fog),
      vertexShader: `varying vec3 vW; ${"\n" + T.ShaderChunk.fog_pars_vertex + "\n"} void main(){ vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; vec4 mvPosition = viewMatrix * w; gl_Position = projectionMatrix * mvPosition; ${"\n" + T.ShaderChunk.fog_vertex + "\n"} }`,
      fragmentShader: `uniform float uT; uniform vec3 uL; varying vec3 vW; ${"\n" + T.ShaderChunk.fog_pars_fragment + "\n"}
        float h(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
        float n(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f); return mix(mix(h(i), h(i + vec2(1, 0)), f.x), mix(h(i + vec2(0, 1)), h(i + vec2(1, 1)), f.x), f.y); }
        void main(){ vec2 p = vW.xz; float road = smoothstep(1.9, 1.4, abs(p.y + sin(p.x * 0.08) * 0.6));
          vec3 grass = mix(vec3(0.05, 0.1, 0.06), vec3(0.09, 0.16, 0.08), n(p * 0.6));
          vec3 dirt = mix(vec3(0.16, 0.12, 0.09), vec3(0.22, 0.17, 0.12), n(p * 2.0));
          float rut = smoothstep(0.25, 0.05, abs(abs(p.y + sin(p.x * 0.08) * 0.6) - 0.75)) * 0.4; dirt *= 1.0 - rut * 0.4;
          vec3 c = mix(grass, dirt, road);
          float puddle = smoothstep(0.62, 0.7, n(p * 0.7 + 3.0)) * road;
          vec3 L = uL - vW; float d = length(L); float lit = 1.0 / (1.0 + d * d * 0.06);
          c *= 0.55 + lit * vec3(1.6, 1.3, 0.9);
          // poças: refletem a lâmpada, com anéis de chuva
          vec2 cell = floor(p * 3.0), fp = fract(p * 3.0) - 0.5; float ph = fract(uT * 0.9 + h(cell)); float ring = smoothstep(0.05, 0.0, abs(length(fp) - ph * 0.45)) * (1.0 - ph);
          vec3 V = normalize(cameraPosition - vW); vec3 R = reflect(-V, vec3(0, 1, 0)); float spec = pow(max(dot(R, normalize(uL - vW)), 0.0), 60.0);
          c = mix(c, vec3(0.03, 0.05, 0.07) + vec3(1.0, 0.8, 0.5) * spec * 2.5 + vec3(0.5, 0.6, 0.7) * ring * 0.35, puddle * 0.85);
          c += vec3(0.4, 0.5, 0.6) * ring * 0.12 * road;
          gl_FragColor = vec4(c, 1.0); ${"\n" + T.ShaderChunk.fog_fragment + "\n"} }` })));
    ground.rotation.x = -Math.PI / 2; scene.add(ground);
    const roadZ = (x) => -Math.sin(x * 0.08) * 0.6;

    /* ---------------- capim ---------------- */
    { const N = small ? 5000 : 11000, blade = K(new T.PlaneGeometry(0.06, 0.55, 1, 3)); blade.translate(0, 0.27, 0);
      const mat = K(new T.ShaderMaterial({ side: T.DoubleSide, fog: true, uniforms: Object.assign({ uT, uL: { value: LAMP } }, T.UniformsLib.fog),
        vertexShader: `uniform float uT; varying float vH; varying vec3 vW; ${"\n" + T.ShaderChunk.fog_pars_vertex + "\n"} void main(){ vec4 w = modelMatrix * instanceMatrix * vec4(position, 1.0); vec3 b = (modelMatrix * instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0)).xyz; vH = uv.y; float k = uv.y; w.x += sin(uT * 1.4 + b.x * 0.5 + b.z * 0.3) * 0.08 * k * k; w.z += cos(uT * 1.1 + b.z * 0.6) * 0.05 * k * k; vW = w.xyz; vec4 mvPosition = viewMatrix * w; gl_Position = projectionMatrix * mvPosition; ${"\n" + T.ShaderChunk.fog_vertex + "\n"} }`,
        fragmentShader: `uniform vec3 uL; varying float vH; varying vec3 vW; ${"\n" + T.ShaderChunk.fog_pars_fragment + "\n"} void main(){ float d = length(uL - vW); vec3 c = mix(vec3(0.02, 0.05, 0.03), vec3(0.12, 0.24, 0.12), vH) * (0.7 + vec3(1.4, 1.2, 0.8) / (1.0 + d * d * 0.07)); gl_FragColor = vec4(c, 1.0); ${"\n" + T.ShaderChunk.fog_fragment + "\n"} }` }));
      const im = new T.InstancedMesh(blade, mat, N), m = new T.Matrix4(), q = new T.Quaternion(); let k = 0;
      while (k < N) { const x = (rnd() - 0.5) * 44, z = -16 + rnd() * 28; if (Math.abs(z - roadZ(x)) < 1.9) continue; if (Math.hypot(x - OVERP.x, z - OVERP.z) < 2.2) continue; q.setFromAxisAngle(V3(0, 1, 0), rnd() * 3.14); m.compose(V3(x, 0, z), q, V3(1, 0.6 + rnd() * 1.1, 1)); im.setMatrixAt(k++, m); }
      im.frustumCulled = false; scene.add(im); }

    /* ---------------- a floresta e a grande cânfora ---------------- */
    const leafTex = (() => { const c = document.createElement("canvas"); c.width = c.height = 128; const g = c.getContext("2d");
      for (let i = 0; i < 90; i++) { const a = rnd() * 6.28, r = Math.sqrt(rnd()) * 50, v = 110 + Math.floor(rnd() * 145); g.fillStyle = `rgb(${v},${v},${v})`; g.save(); g.translate(64 + Math.cos(a) * r, 64 + Math.sin(a) * r * 0.9); g.rotate(rnd() * 6.28); g.beginPath(); g.ellipse(0, 0, 9, 4, 0, 0, 7); g.fill(); g.restore(); }
      return K(new T.CanvasTexture(c)); })();
    const cards = [];
    const canopy = (c, R, n, tint, s = 1) => { for (let i = 0; i < n; i++) { const a = rnd() * 6.28, b = Math.acos(2 * rnd() - 1), r = Math.cbrt(rnd()) * R; const p = V3(Math.sin(b) * Math.cos(a) * r, Math.cos(b) * r * 0.65, Math.sin(b) * Math.sin(a) * r).add(c); const v = 0.8 + rnd() * 0.4; cards.push([p, (1.2 + rnd() * 1.4) * s, [tint[0] * v, tint[1] * v, tint[2] * v], p.y - c.y]); } };
    const barkM = K(new T.MeshLambertMaterial({ color: "#2a2620" }));
    const trunk = (pts, r0, r1) => { const curve = new T.CatmullRomCurve3(pts), g = K(new T.TubeGeometry(curve, 24, 1, 10, false)), p = g.attributes.position; for (let i = 0; i <= 24; i++) { const c = curve.getPointAt(i / 24), r = r0 + (r1 - r0) * Math.pow(i / 24, 0.7); for (let j = 0; j <= 10; j++) { const k = i * 11 + j; p.setXYZ(k, c.x + (p.getX(k) - c.x) * r, c.y + (p.getY(k) - c.y) * r, c.z + (p.getZ(k) - c.z) * r); } } g.computeVertexNormals(); scene.add(new T.Mesh(g, barkM)); return curve; };
    // a cânfora: tronco enorme, galhos abertos, copa que some na névoa
    const TREE = V3(-7, 0, -13);
    { const c = trunk([TREE.clone(), TREE.clone().add(V3(0.4, 6, 0.3)), TREE.clone().add(V3(-0.3, 12, 0)), TREE.clone().add(V3(0.2, 17, -0.4))], 2.3, 0.8);
      for (const [dx, dy, dz] of [[7, 4, 2], [-7, 5, 1], [3, 6, -6], [-4, 6, -5], [5, 5, 6], [0, 7, 4]]) { const s = c.getPointAt(0.65), e = s.clone().add(V3(dx, dy, dz)); trunk([s, s.clone().lerp(e, 0.5).add(V3(0, 1.2, 0)), e], 0.7, 0.2); canopy(e, 4.2, 60, [0.1, 0.2, 0.12]); }
      canopy(TREE.clone().add(V3(0, 19, 0)), 6, 110, [0.09, 0.18, 0.11]);
      for (let i = 0; i < 9; i++) { const a = i / 9 * 6.28 + 0.2, e = TREE.clone().add(V3(Math.cos(a) * 4.5, 0.05, Math.sin(a) * 4.5)); trunk([TREE.clone().add(V3(Math.cos(a) * 1.4, 2.2, Math.sin(a) * 1.4)), TREE.clone().add(V3(Math.cos(a) * 2.8, 0.7, Math.sin(a) * 2.8)), e], 0.55, 0.12); } }
    // o resto da mata: árvores escuras em volta
    for (let i = 0; i < (small ? 26 : 46); i++) { const a = rnd() * 6.28, r = 12 + rnd() * 22, x = Math.cos(a) * r, z = Math.sin(a) * r - 4; if (Math.abs(z - roadZ(x)) < 3 || z > 9) continue; const h = 7 + rnd() * 7; const c = trunk([V3(x, 0, z), V3(x + (rnd() - 0.5), h * 0.6, z), V3(x + (rnd() - 0.5) * 1.5, h, z)], 0.35 + rnd() * 0.2, 0.12); canopy(V3(x, h + 1, z), 3 + rnd() * 1.5, 40, [0.08, 0.16, 0.1]); }
    { const n = cards.length, geo = K(new T.PlaneGeometry(1, 1)); const aC = new Float32Array(n * 3), aR = new Float32Array(n), aY = new Float32Array(n);
      const mat = K(new T.ShaderMaterial({ side: T.DoubleSide, fog: true, uniforms: Object.assign({ uT, uLeaf: { value: leafTex }, uL: { value: LAMP } }, T.UniformsLib.fog),
        vertexShader: `uniform float uT; attribute vec3 aC; attribute float aR, aY; varying vec3 vC, vW; varying vec2 vU; varying float vY; ${"\n" + T.ShaderChunk.fog_pars_vertex + "\n"}
          void main(){ vec3 c = (modelMatrix * instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0)).xyz; float s = length(instanceMatrix[0].xyz); c.x += sin(uT * 0.6 + c.z * 0.2) * 0.05 * s; float cs = cos(aR), sn = sin(aR);
            vec2 p = mat2(cs, sn, -sn, cs) * position.xy; vU = uv; vC = aC; vW = c; vY = aY; vec4 mvPosition = viewMatrix * vec4(c, 1.0); mvPosition.xy += p * s; gl_Position = projectionMatrix * mvPosition; ${"\n" + T.ShaderChunk.fog_vertex + "\n"} }`,
        fragmentShader: `uniform sampler2D uLeaf; uniform vec3 uL; varying vec3 vC, vW; varying vec2 vU; varying float vY; ${"\n" + T.ShaderChunk.fog_pars_fragment + "\n"}
          void main(){ vec4 t = texture2D(uLeaf, vU); if (t.a < 0.5) discard; float d = length(uL - vW); vec3 c = vC * (0.5 + 0.7 * t.r) * (0.8 + clamp(vY * 0.15, -0.4, 0.4)) * (0.8 + vec3(1.6, 1.3, 0.8) / (1.0 + d * d * 0.04)); gl_FragColor = vec4(c, 1.0); ${"\n" + T.ShaderChunk.fog_fragment + "\n"} }` }));
      const im = new T.InstancedMesh(geo, mat, n), m = new T.Matrix4(), q = new T.Quaternion(); cards.forEach(([p, s, c, y], i) => { m.compose(p, q, V3(s, s, s)); im.setMatrixAt(i, m); aC.set(c, i * 3); aR[i] = rnd() * 6.28; aY[i] = y; });
      geo.setAttribute("aC", new T.InstancedBufferAttribute(aC, 3)); geo.setAttribute("aR", new T.InstancedBufferAttribute(aR, 1)); geo.setAttribute("aY", new T.InstancedBufferAttribute(aY, 1)); im.frustumCulled = false; scene.add(im); }

    /* ---------------- o ponto de ônibus e o poste ---------------- */
    const wood = K(new T.MeshLambertMaterial({ color: "#5a4632" })), iron = K(new T.MeshLambertMaterial({ color: "#2a2c2e" }));
    const add = (geo, mat, x, y, z, rx = 0, ry = 0, rz = 0) => { const o = new T.Mesh(K(geo), mat); o.position.set(x, y, z); o.rotation.set(rx, ry, rz); scene.add(o); return o; };
    const STOP = V3(1.3, 0, -2.25);
    add(new T.CylinderGeometry(0.035, 0.045, 2.5, 8), iron, STOP.x, 1.25, STOP.z);
    { const c = document.createElement("canvas"); c.width = c.height = 256; const g = c.getContext("2d"); g.fillStyle = "#e8e2d0"; g.beginPath(); g.arc(128, 128, 120, 0, 7); g.fill(); g.lineWidth = 16; g.strokeStyle = "#b8302a"; g.stroke();
      g.fillStyle = "#1a1a1a"; g.font = "700 62px 'Shippori Mincho', serif"; g.textAlign = "center"; g.fillText("稲荷前", 128, 140); g.font = "500 26px sans-serif"; g.fillText("バス停", 128, 190);
      const tex = K(new T.CanvasTexture(c)); add(new T.CircleGeometry(0.32, 32), K(new T.MeshLambertMaterial({ map: tex, side: T.DoubleSide })), STOP.x, 2.4, STOP.z + 0.04); }
    add(new T.BoxGeometry(0.34, 0.46, 0.02), K(new T.MeshLambertMaterial({ color: "#d8d2c0" })), STOP.x, 1.55, STOP.z + 0.05);
    add(new T.CylinderGeometry(0.06, 0.08, 4.1, 8), wood, LAMP.x, 2.05, LAMP.z); add(new T.BoxGeometry(0.9, 0.06, 0.06), wood, LAMP.x - 0.35, 4.0, LAMP.z);
    add(new T.ConeGeometry(0.28, 0.16, 16, 1, true), iron, LAMP.x - 0.7, 3.95, LAMP.z); add(new T.SphereGeometry(0.08, 12, 8), K(new T.MeshBasicMaterial({ color: "#fff0c0" })), LAMP.x - 0.7, 3.88, LAMP.z);
    lamp.position.set(LAMP.x - 0.7, 3.8, LAMP.z);
    const lampGlow = new T.Sprite(K(new T.SpriteMaterial({ map: ctx.glowTex, color: 0xffd08a, transparent: true, opacity: 0.75, depthWrite: false, blending: T.AdditiveBlending }))); lampGlow.scale.set(2.2, 2.2, 1); lampGlow.position.set(LAMP.x - 0.7, 3.85, LAMP.z); scene.add(lampGlow);
    // o cone de luz da lâmpada, onde a chuva aparece
    const cone = new T.Mesh(K(new T.ConeGeometry(2.6, 3.8, 32, 1, true)), K(new T.ShaderMaterial({ transparent: true, depthWrite: false, blending: T.AdditiveBlending, side: T.DoubleSide, uniforms: { uT },
      vertexShader: "varying vec2 vU; varying vec3 vN, vV; void main(){ vU = uv; vN = normalize(normalMatrix * normal); vec4 mv = modelViewMatrix * vec4(position, 1.0); vV = normalize(-mv.xyz); gl_Position = projectionMatrix * mv; }",
      fragmentShader: "uniform float uT; varying vec2 vU; varying vec3 vN, vV; void main(){ float edge = pow(abs(dot(vN, vV)), 1.5); float a = edge * smoothstep(0.0, 0.9, vU.y) * 0.11 * (0.92 + 0.08 * sin(uT * 13.0)); gl_FragColor = vec4(vec3(1.0, 0.82, 0.55) * a, a); }" })));
    cone.position.set(LAMP.x - 0.7, 1.95, LAMP.z); scene.add(cone);

    /* ---------------- modelos do vale ---------------- */
    const loader = new T.GLTFLoader();
    const load = (f) => new Promise((ok) => loader.load("/vale/modelos/" + f, (g) => ok(g.scene), undefined, () => ok(null)));
    const fit = (m, size, axis = "y") => { const box = new T.Box3().setFromObject(m), sz = box.getSize(V3()), s = size / sz[axis]; m.scale.setScalar(s); m.position.set(-((box.min.x + box.max.x) / 2) * s, -box.min.y * s, -((box.min.z + box.max.z) / 2) * s); return s; };
    const prep = (m, o = {}) => { m.traverse((x) => { if (!x.isMesh) return; const nm = ((x.material && x.material.name) || "").toLowerCase(); if (nm.includes("outline") || nm.includes("contour")) { x.material = K(new T.MeshBasicMaterial({ color: o.line || "#141214", side: x.material.side })); return; }
      const src = x.material; const mm = K(new T.MeshLambertMaterial({ map: src.map || null, color: src.color ? src.color.clone() : new T.Color(1, 1, 1), side: src.side, transparent: !!src.transparent && !src.map, opacity: src.opacity, vertexColors: !!x.geometry.attributes.color }));
      if (src.map) src.map.encoding = T.LinearEncoding;
      if (o.glow && o.glow[src.name] != null) { mm.emissive = new T.Color(o.glowC || "#7aff9a"); mm.emissiveIntensity = o.glow[src.name]; } x.material = mm; }); return m; };
    // o guardião da mata: um espírito alto de cervo, coberto de musgo, com lanternas penduradas nos chifres (personagem original)
    const toto = new T.Group(); toto.position.set(-0.4, 0, -2.6); toto.rotation.y = 0.2; scene.add(toto);
    const umb = new T.Group(); toto.add(umb);
    { const moss = K(new T.MeshLambertMaterial({ color: "#3a5a3a" })), bark = K(new T.MeshLambertMaterial({ color: "#5a4a36" })), mask = K(new T.MeshLambertMaterial({ color: "#e8e2d2" }));
      const P = (geo, m, x, y, z, rx = 0, ry = 0, rz = 0, sx = 1, sy = 1, sz = 1) => { const o = new T.Mesh(K(geo), m); o.position.set(x, y, z); o.rotation.set(rx, ry, rz); o.scale.set(sx, sy, sz); toto.add(o); return o; };
      P(new T.CapsuleGeometry(0.42, 0.9, 8, 16), moss, 0, 1.45, 0, 0.15, 0, 0, 1, 1, 0.8); // tronco musgoso
      for (const sd of [-1, 1]) { P(new T.CapsuleGeometry(0.1, 1.0, 6, 10), bark, sd * 0.22, 0.55, 0.05); P(new T.CapsuleGeometry(0.07, 0.9, 6, 10), bark, sd * 0.5, 1.2, 0.15, -0.15, 0, sd * 0.12); }
      P(new T.CapsuleGeometry(0.12, 0.45, 6, 10), moss, 0, 2.2, 0.2, 0.5, 0, 0); // pescoço
      const head = P(new T.SphereGeometry(0.2, 18, 14), mask, 0, 2.48, 0.38, 0, 0, 0, 0.8, 0.9, 1.3); void head; // máscara de osso alongada
      for (const sd of [-1, 1]) { const e = new T.Sprite(K(new T.SpriteMaterial({ map: ctx.glowTex, color: 0xbfff9a, transparent: true, opacity: 0.85, depthWrite: false, blending: T.AdditiveBlending }))); e.scale.setScalar(0.12); e.position.set(sd * 0.07, 2.52, 0.6); toto.add(e); }
      // chifres galhados, com lanterninhas penduradas
      for (const sd of [-1, 1]) { const pts = [V3(sd * 0.08, 2.62, 0.3), V3(sd * 0.3, 3.0, 0.2), V3(sd * 0.45, 3.35, 0.05), V3(sd * 0.65, 3.6, -0.05)]; const c = new T.CatmullRomCurve3(pts); toto.add(new T.Mesh(K(new T.TubeGeometry(c, 12, 0.03, 6)), bark));
        for (const u of [0.45, 0.75]) { const p = c.getPointAt(u), q = p.clone().add(V3(sd * 0.25, 0.22, 0)); toto.add(new T.Mesh(K(new T.TubeGeometry(new T.CatmullRomCurve3([p, q]), 4, 0.018, 5)), bark));
          const ln = new T.Mesh(K(new T.SphereGeometry(0.05, 10, 8)), K(new T.MeshBasicMaterial({ color: "#ffd890" }))); ln.position.copy(q).add(V3(0, -0.1, 0)); toto.add(ln); const lg = new T.Sprite(K(new T.SpriteMaterial({ map: ctx.glowTex, color: 0xffc870, transparent: true, opacity: 0.7, depthWrite: false, blending: T.AdditiveBlending }))); lg.scale.setScalar(0.4); lg.position.copy(ln.position); toto.add(lg); } }
      const gl = new T.PointLight("#ffd08a", 0.8, 4, 2); gl.position.set(0, 3.2, 0.2); toto.add(gl); }
    // cogumelos que brilham nas raízes da cânfora
    const soots = [];
    for (let i = 0; i < 14; i++) { const a = 0.7 + i * 0.22, r = 2.6 + rnd() * 1.6; const g = new T.Group(); g.position.copy(TREE).add(V3(Math.cos(a) * r, 0, Math.sin(a) * r)); scene.add(g);
      const h = 0.12 + rnd() * 0.2; const st = new T.Mesh(K(new T.CylinderGeometry(0.02, 0.03, h, 8)), K(new T.MeshLambertMaterial({ color: "#d8d0c0" }))); st.position.y = h / 2; g.add(st);
      const cap = new T.Mesh(K(new T.SphereGeometry(0.08 + rnd() * 0.05, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2)), K(new T.MeshBasicMaterial({ color: "#7affd8" }))); cap.position.y = h; g.add(cap);
      const gs = new T.Sprite(K(new T.SpriteMaterial({ map: ctx.glowTex, color: 0x7affd8, transparent: true, opacity: 0.5, depthWrite: false, blending: T.AdditiveBlending }))); gs.scale.setScalar(0.5); gs.position.y = h; g.add(gs); soots.push({ g, ph: rnd() * 6, base: g.position.clone(), gs }); }
    // o laguinho na beira da estrada, com o balde da Ponyo
    const POND = V3(-3.6, 0, 3.4);
    const pond = add(new T.CircleGeometry(1.6, 40), K(new T.ShaderMaterial({ transparent: true, uniforms: { uT },
      vertexShader: "varying vec2 vU; void main(){ vU = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }",
      fragmentShader: "uniform float uT; varying vec2 vU; void main(){ vec2 p = vU - 0.5; float r = length(p) * 2.0; float rings = 0.0; for (int i = 0; i < 5; i++) { vec2 c = vec2(fract(sin(float(i) * 12.9) * 43.7), fract(sin(float(i) * 7.3) * 91.1)) - 0.5; float ph = fract(uT * 0.7 + float(i) * 0.21); rings += smoothstep(0.02, 0.0, abs(length(p - c * 0.6) - ph * 0.25)) * (1.0 - ph); } vec3 c = vec3(0.02, 0.06, 0.07) + vec3(0.2, 0.9, 0.5) * 0.08 * (1.0 - r) + vec3(0.6, 0.8, 0.9) * rings * 0.4; gl_FragColor = vec4(c, smoothstep(1.0, 0.92, r)); }" })), POND.x, 0.02, POND.z, -Math.PI / 2);
    for (let i = 0; i < 12; i++) { const a = i / 12 * 6.28; add(new T.DodecahedronGeometry(0.16 + rnd() * 0.1, 0), K(new T.MeshLambertMaterial({ color: "#4a4a46" })), POND.x + Math.cos(a) * 1.65, 0.05, POND.z + Math.sin(a) * 1.65); }
    const bucket = new T.Group(); bucket.position.set(POND.x + 1.25, 0.02, POND.z - 0.7); bucket.rotation.y = 0.6; scene.add(bucket);
    const bucketLight = new T.PointLight("#7aff9a", 0.9, 4, 2); bucketLight.position.set(POND.x + 1.25, 0.6, POND.z - 0.7); scene.add(bucketLight);
    load("balde.glb").then((m) => { if (!m) return; prep(m, { glow: { green_light: 1.2 } }); fit(m, 0.6); bucket.add(m); });
    // bolhas subindo do balde
    const bub = []; for (let i = 0; i < 10; i++) { const b = new T.Mesh(K(new T.SphereGeometry(0.025 + rnd() * 0.02, 10, 8)), K(new T.MeshBasicMaterial({ color: "#bfffe0", transparent: true, opacity: 0.5 }))); scene.add(b); bub.push({ b, ph: rnd() }); }
    // o ônibus da roça: velho, de madeira, com os faróis acesos (original)
    const bus = new T.Group(); bus.visible = false; scene.add(bus); const busEyes = []; let busReady = true;
    { const body = K(new T.MeshLambertMaterial({ color: "#6a8a6a" })), cream = K(new T.MeshLambertMaterial({ color: "#e8dcc0" })), dark = K(new T.MeshLambertMaterial({ color: "#2a2a2a" })), win = K(new T.MeshBasicMaterial({ color: "#ffd8a0" }));
      const P = (geo, m, x, y, z) => { const o = new T.Mesh(K(geo), m); o.position.set(x, y, z); bus.add(o); return o; };
      P(new T.BoxGeometry(2.2, 1.5, 5.6), body, 0, 1.25, 0); P(new T.BoxGeometry(2.24, 0.5, 5.64), cream, 0, 0.75, 0); P(new T.BoxGeometry(2.1, 0.22, 5.5), cream, 0, 2.08, 0); P(new T.BoxGeometry(1.4, 0.18, 2.0), body, 0, 2.27, -0.6);
      P(new T.BoxGeometry(2.0, 0.9, 1.0), body, 0, 0.95, 3.2); for (const z of [-1.8, -0.6, 0.6, 1.8]) for (const sx of [-1, 1]) P(new T.PlaneGeometry(0.8, 0.55), win, sx * 1.13, 1.55, z).rotation.y = sx * Math.PI / 2;
      for (const [x, z] of [[-1, -1.8], [1, -1.8], [-1, 2.4], [1, 2.4]]) P(new T.CylinderGeometry(0.4, 0.4, 0.3, 14), dark, x, 0.4, z).rotation.z = Math.PI / 2;
      for (const sx of [-0.65, 0.65]) { P(new T.SphereGeometry(0.14, 12, 8), win, sx, 0.95, 3.72); const e = new T.Sprite(K(new T.SpriteMaterial({ map: ctx.glowTex, color: 0xffe07a, transparent: true, opacity: 0.9, depthWrite: false, blending: T.AdditiveBlending }))); e.scale.set(1.4, 1.4, 1); e.position.set(sx, 0.95, 3.85); bus.add(e); busEyes.push(e); }
      const hl = new T.SpotLight("#ffe07a", 3, 18, 0.5, 0.6, 1.4); hl.position.set(0, 1.0, 3.8); hl.target.position.set(0, 0, 12); bus.add(hl, hl.target); }

    /* ---------------- a chuva ---------------- */
    const RN = small ? 900 : 1800, rp = new Float32Array(RN * 6), rs = new Float32Array(RN);
    for (let i = 0; i < RN; i++) { rs[i] = rnd(); const x = (rnd() - 0.5) * 26, z = -10 + rnd() * 20, y = rnd() * 9; rp.set([x, y, z, x - 0.04, y - 0.45, z], i * 6); }
    const rg = K(new T.BufferGeometry()); rg.setAttribute("position", new T.BufferAttribute(rp, 3));
    const rain = new T.LineSegments(rg, K(new T.LineBasicMaterial({ color: "#9fb4c8", transparent: true, opacity: 0.4, depthWrite: false }))); rain.frustumCulled = false; scene.add(rain);

    /* ---------------- as bolotas das atividades ---------------- */
    const sub = ctx.subjects().find((s) => s.name === "Ciências da Natureza") || { name: "Ciências da Natureza", acts: [] };
    const seeds = [], leafM = K(new T.MeshLambertMaterial({ color: "#4a9a4a", side: T.DoubleSide, emissive: new T.Color("#1a4a1a") }));
    sub.acts.forEach((a, i) => {
      const n = sub.acts.length, k = n > 1 ? i / (n - 1) : 0.5, x = -2.6 + k * 6.4, z = 3.0 + Math.sin(k * Math.PI) * 0.8 - (i % 2) * 0.45;
      const g = new T.Group(); g.position.set(x, 0, z); scene.add(g);
      const acorn = new T.Group(); g.add(acorn); const nut = new T.Mesh(K(new T.SphereGeometry(0.09, 16, 12)), K(new T.MeshLambertMaterial({ color: "#8a5a2a", emissive: new T.Color("#2a1408") }))); nut.scale.y = 1.25; nut.position.y = 0.11; acorn.add(nut);
      const cap = new T.Mesh(K(new T.SphereGeometry(0.095, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2)), K(new T.MeshLambertMaterial({ color: "#5a3a1a" }))); cap.position.y = 0.17; acorn.add(cap); const stalk = new T.Mesh(K(new T.CylinderGeometry(0.008, 0.008, 0.05, 5)), cap.material); stalk.position.y = 0.27; acorn.add(stalk);
      const sprout = new T.Group(); g.add(sprout); sprout.scale.setScalar(0.25);
      const stem = new T.Mesh(K(new T.CylinderGeometry(0.012, 0.02, 0.9, 6)), leafM); stem.position.y = 0.45; sprout.add(stem);
      for (let j = 0; j < 4; j++) { const lf = new T.Mesh(K(new T.CircleGeometry(0.13, 10)), leafM); lf.scale.set(1, 0.55, 1); lf.position.set(Math.cos(j * 1.7) * 0.1, 0.5 + j * 0.13, Math.sin(j * 1.7) * 0.1); lf.rotation.set(-0.7, j * 1.7, 0.3); sprout.add(lf); }
      const glow = new T.Sprite(K(new T.SpriteMaterial({ map: ctx.glowTex, color: 0xd8ff9a, transparent: true, opacity: 0.6, depthWrite: false, blending: T.AdditiveBlending }))); glow.scale.set(0.9, 0.9, 1); glow.position.y = 0.3; g.add(glow);
      const hit = new T.Mesh(K(new T.CylinderGeometry(0.35, 0.35, 1.2, 8)), K(new T.MeshBasicMaterial())); hit.position.y = 0.5; hit.visible = false; g.add(hit);
      seeds.push({ g, sprout, glow, hit, a, i, grow: 0.25, want: 0.25, hot: 0, ph: rnd() * 6 });
    });

    /* ---------------- o som: chuva, pingos no guarda-chuva e sapos ---------------- */
    let audio = null;
    try {
      const ac = new (window.AudioContext || window.webkitAudioContext)(), out = ac.createGain(); out.gain.value = 0; out.connect(ac.destination);
      const nb = ac.createBuffer(1, ac.sampleRate * 2, ac.sampleRate), d = nb.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
      const nodes = [];
      for (const [f, q, gv] of [[1800, 0.5, 0.07], [6000, 0.7, 0.025], [400, 0.6, 0.03]]) { const s = ac.createBufferSource(); s.buffer = nb; s.loop = true; const bq = ac.createBiquadFilter(); bq.type = "bandpass"; bq.frequency.value = f; bq.Q.value = q; const g = ac.createGain(); g.gain.value = gv; s.connect(bq).connect(g).connect(out); s.start(); nodes.push(s); }
      const drip = () => { if (!audio) return; const t0 = ac.currentTime, o = ac.createOscillator(), g = ac.createGain(); o.frequency.setValueAtTime(900 + Math.random() * 900, t0); o.frequency.exponentialRampToValueAtTime(300, t0 + 0.05); g.gain.setValueAtTime(0.04, t0); g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.08); o.connect(g).connect(out); o.start(t0); o.stop(t0 + 0.1); setTimeout(drip, 120 + Math.random() * 600); }; setTimeout(drip, 500);
      const frog = () => { if (!audio) return; const t0 = ac.currentTime; for (let k = 0; k < 2; k++) { const o = ac.createOscillator(), g = ac.createGain(), f = ac.createBiquadFilter(); o.type = "sawtooth"; o.frequency.setValueAtTime(170 + Math.random() * 30, t0 + k * 0.25); o.frequency.linearRampToValueAtTime(120, t0 + k * 0.25 + 0.18); f.type = "lowpass"; f.frequency.value = 700; o.connect(f).connect(g).connect(out); g.gain.setValueAtTime(0.0001, t0 + k * 0.25); g.gain.exponentialRampToValueAtTime(0.05, t0 + k * 0.25 + 0.03); g.gain.exponentialRampToValueAtTime(0.0001, t0 + k * 0.25 + 0.22); o.start(t0 + k * 0.25); o.stop(t0 + k * 0.25 + 0.25); } setTimeout(frog, 3000 + Math.random() * 6000); }; setTimeout(frog, 2000);
      out.gain.linearRampToValueAtTime(0.8, ac.currentTime + 2.5);
      audio = { ac, out, nodes };
    } catch (e) { audio = null; }

    /* ---------------- câmera ---------------- */
    const OVER = { pos: OVERP.clone(), tgt: OVERT.clone() };
    const cam = { pos: OVER.pos.clone(), tgt: OVER.tgt.clone(), yaw: 0, pitch: 0, yawT: 0, pitchT: 0 };
    let glide = null, focus = null, hot = null;
    const smoother = (x) => x * x * x * (x * (x * 6 - 15) + 10);
    function to(pose, dur = 2.0) { if (ctx.reduce) { cam.pos.copy(pose.pos); cam.tgt.copy(pose.tgt); return; } glide = { p0: cam.pos.clone(), t0: cam.tgt.clone(), p1: pose.pos.clone(), t1: pose.tgt.clone(), u: 0, dur }; cam.yawT = cam.pitchT = 0; }
    function openSeed(s) { focus = s; s.want = 1; const p = s.g.position, dir = V3(OVERP.x - p.x, 0, OVERP.z - p.z).normalize(); to({ pos: p.clone().addScaledVector(dir, 2.0).add(V3(0, 1.1, 0)), tgt: p.clone().add(V3(0, 0.45, 0)) }); setTimeout(() => { if (focus === s) ctx.openAct(sub.name, s.i); }, ctx.reduce ? 0 : 1500); }
    setTimeout(() => { try { ctx.toast("Meu Amigo Totoro e Ponyo", "O ponto de ônibus", "Cada bolota plantada na grama guarda uma atividade. O velho ônibus passa de vez em quando."); } catch (e) { /* sem aviso */ } }, 900);

    const ray = new T.Raycaster(); let busT = 6;
    return {
      name: "O ponto de ônibus", sub: "Ciências da Natureza",
      update(dt, t) {
        uT.value = t;
        if (glide) { glide.u = Math.min(1, glide.u + dt / glide.dur); const e = smoother(glide.u); cam.pos.lerpVectors(glide.p0, glide.p1, e); cam.tgt.lerpVectors(glide.t0, glide.t1, e); if (glide.u >= 1) glide = null; }
        const k = 1 - Math.exp(-dt * 3.5); cam.yaw += (cam.yawT - cam.yaw) * k; cam.pitch += (cam.pitchT - cam.pitch) * k;
        const d = cam.tgt.clone().sub(cam.pos), r = d.length(), yw = Math.atan2(d.z, d.x) + cam.yaw, pt = Math.asin(Math.max(-0.99, Math.min(0.99, d.y / r))) + cam.pitch;
        camera.position.copy(cam.pos).add(V3(0, Math.sin(t * 0.45) * 0.012, 0)); camera.lookAt(cam.pos.x + Math.cos(yw) * Math.cos(pt), cam.pos.y + Math.sin(pt), cam.pos.z + Math.sin(yw) * Math.cos(pt));
        // chuva
        const P = rg.attributes.position.array; for (let i = 0; i < RN; i++) { let y = P[i * 6 + 1] - dt * (9 + rs[i] * 4); if (y < 0) { y += 9; } P[i * 6 + 1] = y; P[i * 6 + 4] = y - 0.45; } rg.attributes.position.needsUpdate = true;
        // o guardião respira e olha em volta
        toto.scale.set(1, 1 + Math.sin(t * 1.3) * 0.01, 1); toto.rotation.y = 0.2 + Math.sin(t * 0.3) * 0.08;
        lampGlow.material.opacity = 0.7 + 0.06 * Math.sin(t * 17); lamp.intensity = 2.6 * (0.96 + 0.04 * Math.sin(t * 23));
        // os cogumelos pulsam
        for (const s of soots) s.gs.material.opacity = 0.35 + 0.2 * Math.sin(t * 1.4 + s.ph);
        // Ponyo
        bucketLight.intensity = 0.8 + 0.2 * Math.sin(t * 2.0);
        for (const b of bub) { const q = (t * 0.35 + b.ph) % 1; b.b.position.set(bucket.position.x + Math.sin(q * 9 + b.ph * 6) * 0.08, 0.6 + q * 1.4, bucket.position.z + Math.cos(q * 7) * 0.06); b.b.material.opacity = 0.5 * (1 - q); }
        // o ônibus
        if (busReady) { busT += dt; const c = busT % 46; let x = null, face = -Math.PI / 2, run = true;
          if (c < 7) x = 40 + (STOP.x + 6.0 - 40) * smoother(c / 7); else if (c < 19) { x = STOP.x + 6.0; run = false; } else if (c < 27) { x = STOP.x + 6.0 + (-40 - STOP.x - 6.0) * smoother((c - 19) / 8); }
          bus.visible = x !== null; if (bus.visible) { bus.position.set(x, run ? Math.abs(Math.sin(t * 14)) * 0.03 : 0, roadZ(x) - 0.45); bus.rotation.set(0, face, run ? Math.sin(t * 9) * 0.01 : 0); }
          busEyes.forEach((e, i) => (e.material.opacity = 0.85 + Math.sin(t * 7 + i) * 0.08)); }
        // as mudas
        for (const s of seeds) { s.hot += ((hot === s || focus === s ? 1 : 0) - s.hot) * Math.min(1, dt * 6); s.grow += (s.want - s.grow) * Math.min(1, dt * 2.2); s.sprout.scale.setScalar(s.grow); s.sprout.rotation.y = Math.sin(t * 0.8 + s.ph) * 0.2; s.glow.material.opacity = 0.45 + 0.2 * Math.sin(t * 2 + s.ph) + s.hot * 0.4; s.glow.position.y = 0.3 + s.grow * 0.6; }
      },
      render(renderer) { renderer.setRenderTarget(null); renderer.render(scene, camera); },
      resize(w, h) { camera.aspect = w / h; const tall = w / h < 0.8; camera.fov = tall ? 70 : 52; camera.updateProjectionMatrix(); OVER.pos.copy(tall ? V3(0.6, 2.1, 11.5) : OVERP); if (!focus && !glide) cam.pos.copy(OVER.pos); },
      pick(ndc) { ray.setFromCamera(ndc, camera); const hits = ray.intersectObjects(seeds.map((s) => s.hit), false); const s = hits[0] && seeds.find((x) => x.hit === hits[0].object); hot = s || null; return s ? { label: [s.a.t, "plantar a bolota"], go: () => openSeed(s) } : null; },
      look(dx, dy) { if (glide) return; cam.yawT = Math.max(-0.9, Math.min(0.9, cam.yawT - dx * 0.003)); cam.pitchT = Math.max(-0.3, Math.min(0.45, cam.pitchT - dy * 0.003)); },
      back() { if (focus) { focus = null; to(OVER); return true; } return false; },
      dispose() { if (audio) { const a = audio; audio = null; try { a.out.gain.linearRampToValueAtTime(0, a.ac.currentTime + 0.5); setTimeout(() => { a.nodes.forEach((n) => { try { n.stop(); } catch (e) { /* já parou */ } }); a.ac.close(); }, 700); } catch (e) { /* sem som */ } } keep.forEach((o) => o.dispose && o.dispose()); },
    };
  };
})();
