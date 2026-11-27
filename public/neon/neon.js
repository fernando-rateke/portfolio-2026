/* Ato 3: o futuro. Uma rua estreita de uma cidade do futuro, à noite, com chuva, como nas referências do Fernando:
   letreiros por toda parte, chão molhado espelhando as cores e, onde não há nada, neblina.
   Modelos prontos (Sketchfab, CC BY): "Japanese street at night" (afx_cgmotion) é a rua; "Cyberpunk City - #1"
   (born2012) é o horizonte ao fundo. Feitos aqui: o céu, as torres de janelas acesas acima dos telhados, os
   letreiros, o telão do Nós, as camadas de neblina, a chuva, o chão molhado (reflexo de verdade, esticado na
   vertical como no asfalto) e o brilho do néon (bloom).
   Três paradas: o futuro (olhando a rua), os agradecimentos (alguns passos à frente) e os créditos (olhando para o céu).
   A chuva de pixels do Pavilhão continua na chegada e assenta na rua. */
(() => {
  const T = THREE, Q = new URLSearchParams(location.search);
  const N3 = (window.NEON = {});
  const V3 = (x, y, z) => new T.Vector3(x, y, z);
  const cl = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const TX = window.TEXTOS_NEON || { futuro: [], agradecimentos: [] };
  const canvas = document.getElementById("c");
  const renderer = new T.WebGLRenderer({ canvas, antialias: false, powerPreference: "high-performance" });
  let PR = Math.min(devicePixelRatio || 1, 1); // baixa sozinho se o computador não der conta (ver frame())
  renderer.setPixelRatio(PR); renderer.outputEncoding = T.sRGBEncoding; renderer.toneMapping = T.ACESFilmicToneMapping; renderer.toneMappingExposure = 0.85; renderer.debug.checkShaderErrors = Q.has("debug");
  const scene = new T.Scene(), camera = new T.PerspectiveCamera(60, 16 / 9, 0.05, 900); camera.rotation.order = "YXZ";
  const U = { uT: { value: 0 } };
  const tex = (w, h, fn) => { const c = document.createElement("canvas"); c.width = w; c.height = h; fn(c.getContext("2d"), w, h); const t = new T.CanvasTexture(c); t.encoding = T.sRGBEncoding; return t; };
  let semente = 5; const rnd = () => (semente = (semente * 16807) % 2147483647) / 2147483647;
  const NEON = ["#ff2f8e", "#36e2ff", "#ff6a2a", "#b04dff", "#ffd24a", "#ff3b3b", "#4dffb8"];
  scene.fog = new T.FogExp2("#1d0f33", 0.011);

  /* ---------- o céu: roxo, com a luz da cidade subindo das ruas e nuvens baixas acesas por baixo ---------- */
  const ceu = new T.Mesh(new T.SphereGeometry(800, 48, 24), new T.ShaderMaterial({ side: T.BackSide, depthWrite: false, fog: false, uniforms: { uT: U.uT },
    vertexShader: `varying vec3 vD; void main(){ vD = normalize(position); vec4 p = projectionMatrix * modelViewMatrix * vec4(position, 1.); gl_Position = p.xyww; }`,
    fragmentShader: `uniform float uT; varying vec3 vD;
      float h(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      float n(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3. - 2. * f); return mix(mix(h(i), h(i + vec2(1, 0)), f.x), mix(h(i + vec2(0, 1)), h(i + vec2(1, 1)), f.x), f.y); }
      float fbm(vec2 p){ float s = 0., a = .5; for (int k = 0; k < 5; k++) { s += a * n(p); p *= 2.03; a *= .5; } return s; }
      void main(){ vec3 d = normalize(vD); float e = max(d.y, 0.);
        vec3 c = mix(vec3(.42, .12, .38), vec3(.16, .06, .26), smoothstep(0., .25, e)); c = mix(c, vec3(.03, .02, .07), smoothstep(.2, .85, e));
        vec2 p = d.xz / (d.y + .25) * 1.4 + vec2(uT * .01, 0.); float nv = fbm(p);
        c += vec3(.55, .2, .5) * smoothstep(.45, .8, nv) * (1. - smoothstep(.1, .7, e)) * .55;
        c += vec3(.2, .35, .6) * smoothstep(.55, .85, fbm(p * 1.7 + 3.)) * smoothstep(.15, .6, e) * .25;
        gl_FragColor = vec4(c, 1.); }` }));
  ceu.frustumCulled = false; ceu.renderOrder = -10; scene.add(ceu);

  /* ---------- luz: quase nada do céu; o que ilumina a rua são os letreiros ---------- */
  scene.add(new T.HemisphereLight("#4a3a8a", "#100816", 0.28));
  const luzes = [["#ff2f8e", -0.9, 3.1, -1.5, 0.9], ["#36e2ff", 0.9, 2.6, -5.6, 0.9], ["#ff6a2a", -0.6, 2.4, -8.8, 0.8], ["#b04dff", 0.5, 3.6, 1.2, 0.6]];
  for (const [c, x, y, z, i] of luzes) { const l = new T.PointLight(c, i, 6, 2); l.position.set(x, y, z); scene.add(l); }

  /* ---------- carregamento ---------- */
  const loader = new T.GLTFLoader(); if (window.MeshoptDecoder) loader.setMeshoptDecoder(window.MeshoptDecoder);
  const carregar = (u) => new Promise((ok) => loader.load(u, (g) => ok(g.scene), undefined, () => ok(null)));

  /* ---------- o chão molhado: reflexo de verdade, esticado na vertical, poças e ondinhas da chuva ---------- */
  const rtR = new T.WebGLRenderTarget(512, 512, { type: T.HalfFloatType });
  const virt = new T.PerspectiveCamera(), texM = new T.Matrix4(); let chao = null;
  const molhado = (mapa) => new T.ShaderMaterial({ fog: true, uniforms: T.UniformsUtils.merge([T.UniformsLib.fog, { tR: { value: null }, mapa: { value: null }, texM: { value: null }, uT: { value: 0 } }]),
    vertexShader: `uniform mat4 texM; varying vec4 vP; varying vec3 vW; varying vec2 vU;
      #include <fog_pars_vertex>
      void main(){ vU = uv; vec4 w = modelMatrix * vec4(position, 1.); vP = texM * w; vW = w.xyz; vec4 mvPosition = viewMatrix * w; gl_Position = projectionMatrix * mvPosition;
        #include <fog_vertex>
      }`,
    fragmentShader: `uniform sampler2D tR, mapa; uniform float uT; varying vec4 vP; varying vec3 vW; varying vec2 vU;
      #include <fog_pars_fragment>
      float h(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      float n(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3. - 2. * f); return mix(mix(h(i), h(i + vec2(1, 0)), f.x), mix(h(i + vec2(0, 1)), h(i + vec2(1, 1)), f.x), f.y); }
      void main(){ float poca = smoothstep(.42, .62, n(vW.xz * 1.3) * .65 + n(vW.xz * 4.1) * .35);
        // ondinhas: anéis que se abrem onde as gotas caem
        vec2 cel = floor(vW.xz * 2.5), f = fract(vW.xz * 2.5) - .5; float fase = fract(uT * .8 + h(cel)); float an = smoothstep(.06, 0., abs(length(f) - fase * .45)) * (1. - fase);
        vec2 uv = vP.xy / vP.w + vec2(an * .006, an * .01) + (n(vW.xz * 9.) - .5) * .004 * (1. - poca);
        vec3 r = vec3(0.); float tot = 0.;
        for (int k = 0; k < 9; k++) { float o = float(k) / 8.; float w = 1. - o * .7; r += texture2D(tR, uv + vec2(0., (o - .15) * mix(.06, .012, poca))).rgb * w; tot += w; } r /= tot;
        vec3 base = texture2D(mapa, vU).rgb * .16;
        vec3 v = normalize(cameraPosition - vW); float fr = mix(.35, .95, pow(1. - max(v.y, 0.), 2.));
        vec3 c = base * (1. - poca * .7) + r * fr * mix(.45, 1., poca);
        gl_FragColor = vec4(c, 1.);
        #include <fog_fragment>
      }` });
  const _n = V3(0, 1, 0), _p = new T.Vector3(), _c = new T.Vector3(), _a = new T.Vector3(), _r = new T.Matrix4(), _pl = new T.Plane(), _q = new T.Vector4(), _cp = new T.Vector4();
  function refletir() {
    if (!chao) return;
    _p.set(0, 0.002, 0); _c.setFromMatrixPosition(camera.matrixWorld);
    const vista = _p.clone().sub(_c); vista.reflect(_n).negate().add(_p); vista.x = _c.x; vista.z = _c.z; vista.y = 2 * _p.y - _c.y;
    _r.extractRotation(camera.matrixWorld); _a.set(0, 0, -1).applyMatrix4(_r).add(_c);
    const alvo = _a.clone(); alvo.y = 2 * _p.y - _a.y;
    virt.position.copy(vista); virt.up.set(0, 1, 0).applyMatrix4(_r).reflect(_n); virt.lookAt(alvo);
    virt.far = camera.far; virt.updateMatrixWorld(); virt.projectionMatrix.copy(camera.projectionMatrix);
    texM.set(0.5, 0, 0, 0.5, 0, 0.5, 0, 0.5, 0, 0, 0.5, 0.5, 0, 0, 0, 1); texM.multiply(virt.projectionMatrix); texM.multiply(virt.matrixWorldInverse);
    _pl.setFromNormalAndCoplanarPoint(_n, _p); _pl.applyMatrix4(virt.matrixWorldInverse); _cp.set(_pl.normal.x, _pl.normal.y, _pl.normal.z, _pl.constant);
    const pe = virt.projectionMatrix.elements;
    _q.x = (Math.sign(_cp.x) + pe[8]) / pe[0]; _q.y = (Math.sign(_cp.y) + pe[9]) / pe[5]; _q.z = -1; _q.w = (1 + pe[10]) / pe[14];
    _cp.multiplyScalar(2 / _cp.dot(_q)); pe[2] = _cp.x; pe[6] = _cp.y; pe[10] = _cp.z + 1 - 0.003; pe[14] = _cp.w;
    chao.visible = false; chuva.visible = false; respingos.visible = false;
    renderer.setRenderTarget(rtR); renderer.clear(); renderer.render(scene, virt);
    chao.visible = true; chuva.visible = true; respingos.visible = true;
  }

  /* ---------- as torres acima dos telhados: janelas acesas, faixas de néon e neblina entre elas ---------- */
  function torres() {
    const geo = new T.BoxGeometry(1, 1, 1); geo.translate(0, 0.5, 0);
    const mat = new T.ShaderMaterial({ fog: true, uniforms: T.UniformsUtils.merge([T.UniformsLib.fog, { uT: { value: 0 } }]),
      vertexShader: `attribute vec4 cor; varying vec3 vL; varying vec3 vN; varying vec4 vC; varying vec3 vS;
        #include <fog_pars_vertex>
        void main(){ vL = position; vN = normal; vC = cor; vS = vec3(length(instanceMatrix[0].xyz), length(instanceMatrix[1].xyz), length(instanceMatrix[2].xyz));
          vec4 mvPosition = modelViewMatrix * instanceMatrix * vec4(position, 1.); gl_Position = projectionMatrix * mvPosition;
          #include <fog_vertex>
        }`,
      fragmentShader: `uniform float uT; varying vec3 vL; varying vec3 vN; varying vec4 vC; varying vec3 vS;
        #include <fog_pars_fragment>
        float h(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
        void main(){ vec3 c = vec3(.012, .01, .025);
          if (abs(vN.y) < .5) { vec2 f = vec2((abs(vN.x) > .5 ? vL.z * vS.z : vL.x * vS.x), vL.y * vS.y);
            vec2 cel = floor(f / vec2(1.6, 3.2)), g = fract(f / vec2(1.6, 3.2)); float jan = step(.18, g.x) * step(g.x, .82) * step(.3, g.y) * step(g.y, .78);
            float acesa = step(.62, h(cel + vC.w * 17.)); vec3 cj = mix(vec3(1., .7, .4), vec3(.5, .8, 1.), step(.6, h(cel * 1.7 + 4.)));
            c += jan * acesa * cj * .55;
            // faixas de néon nas quinas e no topo
            float q = 1. - smoothstep(.0, .012, min(abs(vL.x * 2.) - .985 > 0. ? 0. : .5 - abs(vL.x), .5 - abs(vL.z)));
            float fx = step(.97, fract(vL.y * vS.y / 22. + vC.w)); c += vC.rgb * (q * 1.6 + fx * .9);
            c += vC.rgb * smoothstep(.985, 1., vL.y) * 1.2; }
          gl_FragColor = vec4(c, 1.);
          #include <fog_fragment>
        }` });
    const lista = [];
    for (let i = 0; i < 70; i++) { const lado = i % 2 ? 1 : -1; const x = lado * (6 + rnd() * 55), z = -12 - rnd() * 150, w = 8 + rnd() * 16, d = 8 + rnd() * 16, hgt = 22 + Math.pow(rnd(), 0.7) * 120;
      if (Math.abs(x) < 9 && z > -30) continue; lista.push([x, z, w, d, hgt]); }
    // algumas logo atrás do fim da rua, para encher o vão do céu
    for (const [x, z, w, d, hgt] of [[-2, -26, 12, 10, 48], [7, -38, 14, 12, 82], [-9, -44, 12, 12, 64], [1, -70, 18, 16, 128], [-14, -90, 16, 14, 110]]) lista.push([x, z, w, d, hgt]);
    const im = new T.InstancedMesh(geo, mat, lista.length), M4 = new T.Matrix4(), cor = new Float32Array(lista.length * 4), c = new T.Color();
    lista.forEach(([x, z, w, d, hgt], k) => { M4.makeScale(w, hgt, d).setPosition(x, -2, z); im.setMatrixAt(k, M4); c.set(NEON[k % NEON.length]); cor.set([c.r, c.g, c.b, rnd()], k * 4); });
    geo.setAttribute("cor", new T.InstancedBufferAttribute(cor, 4)); im.frustumCulled = false; scene.add(im);
    return lista;
  }

  /* ---------- letreiros: texto com brilho desenhado no canvas, linhas de varredura e falhas de vez em quando ---------- */
  const holoMat = (map, k = 1) => new T.ShaderMaterial({ transparent: true, depthWrite: false, blending: T.AdditiveBlending, side: T.DoubleSide, fog: false, uniforms: { map: { value: map }, uT: U.uT, uA: { value: k }, uS: { value: rnd() * 10 } },
    vertexShader: `varying vec2 vU; void main(){ vU = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }`,
    fragmentShader: `uniform sampler2D map; uniform float uT, uA, uS; varying vec2 vU; float h(float x){ return fract(sin(x * 91.7) * 43758.5); }
      void main(){ float g = step(.988, h(floor(uT * 7. + uS))); vec2 u = vU + vec2(g * (h(floor(vU.y * 30.) + uT) - .5) * .03, 0.);
        vec4 c = texture2D(map, u); float sl = .86 + .14 * sin(vU.y * 300. - uT * 3.); float fl = .94 + .06 * sin(uT * 11. + uS) - g * .35;
        gl_FragColor = vec4(c.rgb * c.a * sl * fl * uA * .95, 1.); }` });
  const claro = (c) => "#" + new T.Color(c).lerp(new T.Color("#ffffff"), 0.55).getHexString();
  // linhas: [[texto, tamanho, peso, cor?]]; vertical: um caractere por linha (como os letreiros japoneses)
  function placa(linhas, cor, w, h, larg, k) {
    const PX = 320, W = Math.round(w * PX), H = Math.round(h * PX);
    const t = tex(W, H, (c) => { c.textAlign = "center"; c.textBaseline = "middle";
      // cada linha cabe na placa: o tamanho pedido é o máximo (em px a 200 px/m); diminui se não couber na largura ou na altura
      const fonte = (tam, peso) => `${peso || 800} ${tam}px Archivo, "Noto Sans JP", sans-serif`;
      let ls = linhas.map(([txt, tam, peso, cr]) => { let t2 = tam * PX / 200; c.font = fonte(t2, peso); if (larg) c.letterSpacing = larg; const mw = c.measureText(txt).width; if (mw > W * 0.86) t2 *= (W * 0.86) / mw; return [txt, t2, peso, cr]; });
      const alto = ls.reduce((s, l) => s + l[1] * 1.12, 0); if (alto > H * 0.86) ls = ls.map((l) => [l[0], l[1] * (H * 0.86) / alto, l[2], l[3]]);
      const tot = ls.reduce((s, l) => s + l[1] * 1.12, 0); let y = (H - tot) / 2;
      for (const [txt, tam, peso, cr] of ls) { c.font = fonte(tam, peso); if (larg) c.letterSpacing = larg;
        const yy = y + tam * 0.58; for (const [blur, a] of [[tam * 0.22, 0.6], [tam * 0.08, 0.85], [0, 1]]) { c.shadowColor = cr || cor; c.shadowBlur = blur; c.fillStyle = blur ? (cr || cor) : claro(cr || cor); c.globalAlpha = a; c.fillText(txt, W / 2, yy); }
        c.globalAlpha = 1; c.shadowBlur = 0; y += tam * 1.12; } });
    return new T.Mesh(new T.PlaneGeometry(w, h), holoMat(t, k == null ? 1 : k));
  }
  const vertical = (txt, cor, h, k) => { const ch = [...txt]; const tam = 150; return placa(ch.map((x) => [x, tam, 800]), cor, 0.9, h, null, k); };
  // uma moldura de néon (tubo fino) em volta de uma placa
  function moldura(w, h, cor) { const g = new T.Group(); const m = new T.MeshBasicMaterial({ color: cor, fog: false, transparent: true }); m.color.multiplyScalar(1.3); g.userData.m = m;
    for (const [x, y, ww, hh] of [[0, h / 2, w, 0.012], [0, -h / 2, w, 0.012], [w / 2, 0, 0.012, h], [-w / 2, 0, 0.012, h]]) { const b = new T.Mesh(new T.BoxGeometry(ww, hh, 0.01), m); b.position.set(x, y, 0); g.add(b); } return g; }
  const todas = [];
  function fundoEscuro(m) { const w = m.geometry.parameters.width, h = m.geometry.parameters.height; const b = new T.Mesh(new T.PlaneGeometry(w, h), new T.MeshBasicMaterial({ color: "#07040f", transparent: true, opacity: 0.62, depthWrite: false, fog: false }));
    b.position.copy(m.position); b.rotation.copy(m.rotation); b.translateZ(-0.008); b.renderOrder = 1; m.renderOrder = 2; scene.add(b); m.userData.fundo = b; }
  function por(m, x, y, z, ry = 0) { m.position.set(x, y, z); m.rotation.y = ry; scene.add(m); todas.push(m); return m; }

  /* ---------- a neblina: camadas que passam devagar e enchem os vazios (o fundo da rua, entre as torres, o céu baixo) ---------- */
  const nevoaMat = (cor, forca) => new T.ShaderMaterial({ transparent: true, depthWrite: false, blending: T.AdditiveBlending, side: T.DoubleSide, fog: false, uniforms: { uT: U.uT, uC: { value: new T.Color(cor) }, uK: { value: forca }, uS: { value: rnd() * 50 } },
    vertexShader: `varying vec2 vU; varying float vD; void main(){ vU = uv; vec4 mv = modelViewMatrix * vec4(position, 1.); vD = -mv.z; gl_Position = projectionMatrix * mv; }`,
    fragmentShader: `uniform float uT, uK, uS; uniform vec3 uC; varying vec2 vU; varying float vD; float h(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      float n(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3. - 2. * f); return mix(mix(h(i), h(i + vec2(1, 0)), f.x), mix(h(i + vec2(0, 1)), h(i + vec2(1, 1)), f.x), f.y); }
      void main(){ vec2 p = vU * vec2(4., 2.) + vec2(uT * .025 + uS, uT * .004); float f = n(p) * .55 + n(p * 2.2 + 7.) * .3 + n(p * 5.1) * .15;
        float borda = smoothstep(0., .25, vU.x) * smoothstep(1., .75, vU.x) * smoothstep(0., .35, vU.y) * smoothstep(1., .55, vU.y);
        float perto = smoothstep(.5, 3., vD); gl_FragColor = vec4(uC * f * borda * uK * perto, 1.); }` });
  function nevoa(x, y, z, w, h, cor, k, ry = 0) { const m = new T.Mesh(new T.PlaneGeometry(w, h), nevoaMat(cor, k)); m.position.set(x, y, z); m.rotation.y = ry; scene.add(m); return m; }

  /* ---------- a chuva e os respingos ---------- */
  let chuva, respingos;
  { const N = 3400, pos = new Float32Array(N * 2 * 3), sem = new Float32Array(N * 2 * 4);
    for (let i = 0; i < N; i++) { const x = (rnd() - 0.5) * 7, z = 3 - rnd() * 20, y0 = rnd() * 14, vel = 8 + rnd() * 4, L = 0.25 + rnd() * 0.3;
      for (let k = 0; k < 2; k++) { const j = i * 2 + k; pos.set([x, 0, z], j * 3); sem.set([y0, vel, k * L, 0], j * 4); } }
    const g = new T.BufferGeometry(); g.setAttribute("position", new T.BufferAttribute(pos, 3)); g.setAttribute("sem", new T.BufferAttribute(sem, 4));
    const m = new T.ShaderMaterial({ transparent: true, depthWrite: false, blending: T.AdditiveBlending, fog: false, uniforms: { uT: U.uT },
      vertexShader: `attribute vec4 sem; uniform float uT; varying float vA; void main(){ vec3 p = position; float y = mod(sem.x - uT * sem.y, 14.); p.y = y + sem.z; p.x += sem.z * .12 + y * .03;
        vec4 mv = modelViewMatrix * vec4(p, 1.); vA = (sem.z > 0. ? .15 : 1.) * smoothstep(.3, 1.5, -mv.z) * (1. - smoothstep(9., 18., -mv.z)); gl_Position = projectionMatrix * mv; }`,
      fragmentShader: `varying float vA; void main(){ gl_FragColor = vec4(vec3(.75, .8, 1.) * vA * .42, 1.); }` });
    chuva = new T.LineSegments(g, m); chuva.frustumCulled = false; scene.add(chuva); }
  { const N = 90, geo = new T.PlaneGeometry(1, 1); geo.rotateX(-Math.PI / 2);
    const m = new T.ShaderMaterial({ transparent: true, depthWrite: false, blending: T.AdditiveBlending, fog: false, uniforms: { uT: U.uT },
      vertexShader: `attribute float fase; uniform float uT; varying vec2 vU; varying float vF; void main(){ vU = uv; vF = fract(uT * 1.1 + fase); vec4 p = instanceMatrix * vec4(position * (.06 + vF * .22), 1.); gl_Position = projectionMatrix * modelViewMatrix * p; }`,
      fragmentShader: `varying vec2 vU; varying float vF; void main(){ float r = length(vU - .5) * 2.; float a = smoothstep(.14, 0., abs(r - .8)) * (1. - vF) * (1. - step(1., r)); gl_FragColor = vec4(vec3(.7, .8, 1.) * a * .35, 1.); }` });
    respingos = new T.InstancedMesh(geo, m, N); const M4 = new T.Matrix4(), fase = new Float32Array(N);
    for (let i = 0; i < N; i++) { M4.makeTranslation((rnd() - 0.5) * 2.2, 0.012, 2.5 - rnd() * 12.5); respingos.setMatrixAt(i, M4); fase[i] = rnd(); }
    geo.setAttribute("fase", new T.InstancedBufferAttribute(fase, 1)); respingos.frustumCulled = false; scene.add(respingos); }

  /* ---------- montar: a rua, as torres, o horizonte, os letreiros e o conteúdo ---------- */
  const PARADAS = [
    { id: "futuro", nome: "O futuro", cor: "#36e2ff", p: V3(0, 1.55, 2.3), yaw: 0, pitch: 0.16, fov: 62, texto: "futuro", titulo: "O futuro" },
    { id: "agradecimentos", nome: "Agradecimentos", cor: "#ff2f8e", p: V3(0, 1.6, -2.9), yaw: 0, pitch: 0.12, fov: 58, texto: "agradecimentos", titulo: "Agradecimentos" },
    { id: "creditos", nome: "Créditos", cor: "#ffd24a", p: V3(0, 1.45, -0.6), yaw: 0, pitch: 0.36, fov: 64 },
  ];
  async function montar() {
    const [rua, horizonte] = await Promise.all([carregar("/neon/modelos/rua.glb"), carregar("/neon/modelos/torres.glb"),
      document.fonts ? Promise.all(["800 120px Archivo", "500 60px Archivo", "600 40px Archivo"].map((f) => document.fonts.load(f).catch(() => 0))) : 0]);
    if (rua) { rua.traverse((o) => { if (!o.isMesh) return; const m = o.material;
        if (m.name === "ground") { const mt = molhado(); mt.uniforms.mapa.value = m.map; mt.uniforms.tR.value = rtR.texture; mt.uniforms.texM.value = texM; mt.uniforms.uT = U.uT; o.material = mt; chao = o; return; }
        if (m.emissiveMap || (m.emissive && m.emissive.r + m.emissive.g + m.emissive.b > 0.5)) m.emissiveIntensity = 1.5; // letreiros e máquinas acesos
        m.envMapIntensity = 0; });
      scene.add(rua); }
    if (horizonte) { horizonte.scale.setScalar(26); horizonte.position.set(10, -6, -230); horizonte.traverse((o) => { if (o.isMesh && o.material.emissive && o.material.emissive.r + o.material.emissive.g + o.material.emissive.b > 0.3) o.material.emissiveIntensity = 3; }); scene.add(horizonte); }
    const tl = torres();
    // letreiros verticais nas fachadas acima da rua (palavras de verdade: futuro, sonho, jogo, gratidão, o nome)
    const vs = [["未来", "#36e2ff", -1.16, 5.2, -2.2, Math.PI / 2], ["夢", "#ff2f8e", 1.16, 5.6, -0.6, -Math.PI / 2], ["ゲーム", "#ffd24a", -1.16, 6.2, -6.3, Math.PI / 2], ["ラテケ", "#ff6a2a", 1.16, 6.0, -4.8, -Math.PI / 2],
      ["感謝", "#b04dff", -1.16, 5.0, -9.0, Math.PI / 2], ["二〇二七", "#4dffb8", 1.16, 6.4, -8.3, -Math.PI / 2]];
    for (const [t, c, x, y, z, ry] of vs) { const h = [...t].length * 0.95 + 0.3; const m = por(vertical(t, c, h), x, y, z, ry); m.renderOrder = 3; }
    // letreiros grandes nas torres (sem marcas): formas e palavras curtas
    tl.slice(0, 26).forEach(([x, z, w, d, hgt], k) => { const c = NEON[(k * 3) % NEON.length]; const lado = x > 0 ? -1 : 1, fx = x + lado * (w / 2 + 0.2);
      const pal = ["NEO", "2027", "ARCADE", "LIVE", "HOTEL", "24H", "METRO", "DATA", "SKY", "CODE", "PLAY", "NOVA"][k % 12];
      const m = placa([[pal, 220, 800]], c, Math.max(6, w * 0.8), 3.2, "12px", 0.9); m.position.set(fx, hgt * (0.45 + rnd() * 0.4), z); m.rotation.y = lado * Math.PI / 2; scene.add(m); });
    // o telão do Nós, numa torre logo atrás do fim da rua
    const nos = await new Promise((ok) => new T.TextureLoader().load("/vale/nos/capa.jpg", ok, undefined, () => ok(null)));
    if (nos) { nos.encoding = T.sRGBEncoding; const tv = new T.Mesh(new T.PlaneGeometry(9, 9 * (nos.image.height / nos.image.width)), new T.MeshBasicMaterial({ map: nos, fog: false, toneMapped: false, color: new T.Color(1.4, 1.4, 1.4) }));
      tv.position.set(-2, 30, -20.9); scene.add(tv); const mo = moldura(9.3, 9 * (nos.image.height / nos.image.width) + 0.3, "#ff2f8e"); mo.position.copy(tv.position); mo.position.z += 0.02; scene.add(mo); }
    // a neblina: no fim da rua, entre as torres, acima dos telhados e no céu baixo
    nevoa(0, 3.5, -11.5, 9, 7, "#7a4cff", 0.22); nevoa(0, 9, -14, 30, 14, "#ff4fb0", 0.25); nevoa(0, 18, -24, 60, 30, "#6a5cff", 0.4); nevoa(5, 30, -45, 120, 50, "#ff5fa8", 0.3);
    nevoa(-10, 45, -80, 200, 80, "#7d6cff", 0.32); nevoa(0, 20, -140, 400, 90, "#ff6ab4", 0.28); nevoa(0, 8, -200, 600, 60, "#a070ff", 0.3);
    nevoa(0, 2.6, -7, 2.4, 3, "#36e2ff", 0.07, 0);
    // o conteúdo: o futuro em três letreiros pendurados sobre a rua (do texto futuro.md), cada um mais longe
    const f = PARADAS[0];
    // o futuro: um holograma no meio da rua, à altura dos olhos (o ano, o lugar e a carreira, do texto futuro.md)
    f.placas = [por(placa([["2027", 100, 800], ["transição e preparação", 24, 500]], "#36e2ff", 0.6, 0.4), -0.64, 1.9, 0.45, 0.22),
      por(placa([["ESTADOS UNIDOS", 56, 800], ["universidade", 24, 500]], "#ff2f8e", 0.62, 0.4), 0, 1.84, 0.3, 0),
      por(placa([["JOGOS", 80, 800], ["a carreira", 24, 500]], "#ffd24a", 0.6, 0.4), 0.64, 1.9, 0.45, -0.22)];
    f.placas.forEach(fundoEscuro);
    f.placas.forEach((m, i) => { const mo = moldura(m.geometry.parameters.width + 0.04, m.geometry.parameters.height + 0.04, ["#36e2ff", "#ff2f8e", "#ffd24a"][i]); mo.position.copy(m.position); mo.rotation.copy(m.rotation); mo.translateZ(-0.005); scene.add(mo); m.userData.mo = mo; });
    // os agradecimentos: um holograma grande, alguns passos à frente
    const a = PARADAS[1];
    a.placas = [por(placa([["OBRIGADO", 150, 800], ["a quem veio junto", 40, 500]], "#ff2f8e", 1.25, 0.55, "5px"), 0, 1.98, -4.75),
      por(placa([["família · professores · iniciação científica · amigos", 30, 600]], "#36e2ff", 1.3, 0.15), 0, 1.64, -4.75)];
    a.placas.forEach(fundoEscuro);
    { const mo = moldura(1.32, 0.82, "#ff2f8e"); mo.position.set(0, 1.88, -4.76); scene.add(mo); a.placas[0].userData.mo = mo; }
    PARADAS[2].placas = [];
  }

  /* ---------- o brilho do néon (bloom): a cena vai para uma imagem, o que é claro vaza um pouco em volta ---------- */
  let rtCena = null, rtA = null, rtB = null, rtC = null, rtD = null, quad = null, qScene = null, qCam = null, mBright, mBlur, mFinal;
  function montarBrilho() {
    const gl2 = renderer.capabilities.isWebGL2; const op = { type: T.HalfFloatType };
    rtCena = new T.WebGLRenderTarget(4, 4, { ...op, samples: gl2 ? 4 : 0 }); rtA = new T.WebGLRenderTarget(4, 4, op); rtB = new T.WebGLRenderTarget(4, 4, op); rtC = new T.WebGLRenderTarget(4, 4, op); rtD = new T.WebGLRenderTarget(4, 4, op);
    qCam = new T.OrthographicCamera(-1, 1, 1, -1, 0, 1); qScene = new T.Scene(); quad = new T.Mesh(new T.PlaneGeometry(2, 2)); qScene.add(quad);
    const vs = `varying vec2 vU; void main(){ vU = uv; gl_Position = vec4(position.xy, 0., 1.); }`;
    mBright = new T.ShaderMaterial({ uniforms: { t: { value: null } }, vertexShader: vs, toneMapped: false, fragmentShader: `uniform sampler2D t; varying vec2 vU; void main(){ vec3 c = texture2D(t, vU).rgb; float l = max(c.r, max(c.g, c.b)); gl_FragColor = vec4(c * smoothstep(.85, 2.2, l), 1.); }` });
    mBlur = new T.ShaderMaterial({ uniforms: { t: { value: null }, d: { value: new T.Vector2() } }, vertexShader: vs, toneMapped: false,
      fragmentShader: `uniform sampler2D t; uniform vec2 d; varying vec2 vU; void main(){ vec3 c = texture2D(t, vU).rgb * .227; c += (texture2D(t, vU + d * 1.385).rgb + texture2D(t, vU - d * 1.385).rgb) * .316; c += (texture2D(t, vU + d * 3.231).rgb + texture2D(t, vU - d * 3.231).rgb) * .07; gl_FragColor = vec4(c, 1.); }` });
    mFinal = new T.ShaderMaterial({ uniforms: { t: { value: null }, b1: { value: null }, b2: { value: null }, uT: U.uT }, vertexShader: vs,
      fragmentShader: `uniform sampler2D t, b1, b2; uniform float uT; varying vec2 vU; float h(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
        void main(){ vec3 c = texture2D(t, vU).rgb + texture2D(b1, vU).rgb * .55 + texture2D(b2, vU).rgb * .7;
          c += (h(vU * 900. + uT) - .5) * .012; gl_FragColor = vec4(c, 1.);
          #include <tonemapping_fragment>
          #include <encodings_fragment>
        }` });
  }
  function tamBrilho(w, h) { if (!rtCena) return; rtCena.setSize(w, h); rtA.setSize(w >> 2, h >> 2); rtB.setSize(w >> 2, h >> 2); rtC.setSize(w >> 3, h >> 3); rtD.setSize(w >> 3, h >> 3); }
  const passe = (mat, alvo) => { quad.material = mat; renderer.setRenderTarget(alvo); renderer.render(qScene, qCam); };
  function desenhar() {
    refletir();
    if (!rtCena) { renderer.setRenderTarget(null); renderer.render(scene, camera); return; }
    renderer.setRenderTarget(rtCena); renderer.render(scene, camera);
    mBright.uniforms.t.value = rtCena.texture; passe(mBright, rtA);
    mBlur.uniforms.t.value = rtA.texture; mBlur.uniforms.d.value.set(1 / rtA.width, 0); passe(mBlur, rtB); mBlur.uniforms.t.value = rtB.texture; mBlur.uniforms.d.value.set(0, 1 / rtA.height); passe(mBlur, rtA);
    mBlur.uniforms.t.value = rtA.texture; mBlur.uniforms.d.value.set(1 / rtC.width, 0); passe(mBlur, rtD); mBlur.uniforms.t.value = rtD.texture; mBlur.uniforms.d.value.set(0, 1 / rtC.height); passe(mBlur, rtC);
    mFinal.uniforms.t.value = rtCena.texture; mFinal.uniforms.b1.value = rtA.texture; mFinal.uniforms.b2.value = rtC.texture; passe(mFinal, null);
  }

  /* ---------- a câmera: poucos passos pela rua e um olhar para cima; começa e termina devagar ---------- */
  const cam = { p: V3(0, 1.55, 2.3), yaw: 0, pitch: 1.0, fov: 66 };
  let modo = "chegada", aqui = -1, mov = null, mx = 0, my = 0;
  const pose = (k) => { const P = PARADAS[k]; const av = P.id === "creditos" && credT != null ? (credT < 0 ? 1 : cl((performance.now() - credT) / 1000 / DUR_C)) : 0; return { p: P.p.clone().add(V3(0, 0, -1.6 * av)), yaw: P.yaw, pitch: P.pitch, fov: camera.aspect < 0.8 ? P.fov + 16 : P.fov }; };
  const aplicar = () => { camera.position.copy(cam.p); camera.rotation.set(cam.pitch, cam.yaw, 0); if (Math.abs(camera.fov - cam.fov) > 0.01) { camera.fov = cam.fov; camera.updateProjectionMatrix(); } };
  addEventListener("pointermove", (e) => { if (e.pointerType === "mouse") { mx = e.clientX / innerWidth - 0.5; my = e.clientY / innerHeight - 0.5; } });
  function ir(k, dur) { if (!PARADAS[k] || mov || (modo !== "parada" && modo !== "chegada") || (k === aqui && modo === "parada")) return; fecharTexto(); if (aqui === 2 && k !== 2) pararCreditos();
    const de = { p: cam.p.clone(), yaw: cam.yaw, pitch: cam.pitch, fov: cam.fov }, para = pose(k);
    mov = { de, para, t: null, dur: dur || 1.0 + de.p.distanceTo(para.p) * 0.22 + Math.abs(para.pitch - de.pitch) * 0.45, fim: () => { aqui = k; modo = "parada"; ui(); if (PARADAS[k].id === "creditos") comecarCreditos(); } };
    modo = "andando"; aqui = k; ui(); }
  N3.ir = ir;
  function tick(t, dt) {
    if (mov) { if (mov.t == null) mov.t = t; const u = cl((t - mov.t) / mov.dur), e = 0.5 - 0.5 * Math.cos(Math.PI * u);
      cam.p.copy(mov.de.p).lerp(mov.para.p, e); cam.p.y += Math.sin(e * Math.PI) * 0.03; cam.yaw = mov.de.yaw + (mov.para.yaw - mov.de.yaw) * e; cam.pitch = mov.de.pitch + (mov.para.pitch - mov.de.pitch) * e; cam.fov = mov.de.fov + (mov.para.fov - mov.de.fov) * e;
      if (u >= 1) { const f = mov.fim; mov = null; f(); } }
    else if (modo === "parada" && aqui >= 0) { const p = pose(aqui), k = 1 - Math.exp(-dt * 2.5);
      cam.p.lerp(p.p, k); cam.yaw += (p.yaw - mx * 0.07 + Math.sin(t * 0.13) * 0.01 - cam.yaw) * k; cam.pitch += (p.pitch - my * 0.05 + Math.sin(t * 0.17) * 0.005 - cam.pitch) * k; cam.fov += (p.fov - cam.fov) * k; }
    aplicar(); U.uT.value = t;
    for (const [k, P] of PARADAS.entries()) for (const m of P.placas || []) { const alvo = aqui === k || (modo === "chegada" && k === 0) ? 1 : 0.12; const un = m.material.uniforms.uA; un.value += (alvo - un.value) * Math.min(1, dt * 2); if (m.userData.mo) m.userData.mo.userData.m.opacity = cl(un.value); if (m.userData.fundo) m.userData.fundo.material.opacity = 0.62 * cl(un.value * 1.4); }
  }

  /* ---------- o índice, o botão de ler e a coluna de texto ---------- */
  const indice = document.getElementById("indice"), lerBtn = document.getElementById("ler"), texto = document.getElementById("texto");
  indice.innerHTML = `<span class="tit">O futuro</span><ol>${PARADAS.map((p, k) => `<li><button type="button" data-k="${k}" style="--cor:${p.cor}"><i>${String(k + 1).padStart(2, "0")}</i>${esc(p.nome)}</button></li>`).join("")}</ol>`;
  indice.querySelectorAll("[data-k]").forEach((el) => el.addEventListener("click", () => ir(+el.dataset.k)));
  function ui() { indice.querySelectorAll("[data-k]").forEach((el) => el.classList.toggle("on", +el.dataset.k === aqui));
    const P = PARADAS[aqui]; lerBtn.classList.toggle("on", !!P && !!P.texto && modo === "parada" && !aberto);
    document.body.classList.toggle("chegando", modo === "chegada"); document.body.classList.toggle("creditos", !!P && P.id === "creditos" && modo === "parada"); }
  let aberto = null;
  function abrirTexto() { const P = PARADAS[aqui]; if (!P || !P.texto || modo !== "parada") return; aberto = P.texto;
    const corpo = (TX[P.texto] || []).map(([k, v]) => (k === "h" ? `<h3>${esc(v)}</h3>` : `<p>${esc(v)}</p>`)).join("");
    texto.style.setProperty("--cor", P.cor);
    texto.innerHTML = `<button class="x" type="button" aria-label="Fechar">×</button><div class="cab"><span>${String(aqui + 1).padStart(2, "0")} · ${esc(P.nome)}</span><h2>${esc(P.titulo)}</h2></div><div class="corpo">${corpo}</div>`;
    texto.querySelector(".x").onclick = fecharTexto; texto.classList.add("on"); texto.setAttribute("aria-hidden", "false"); ui(); setTimeout(() => texto.querySelector(".x").focus({ preventScroll: true }), 50); }
  function fecharTexto() { if (!aberto) return; aberto = null; texto.classList.remove("on"); texto.setAttribute("aria-hidden", "true"); ui(); }
  lerBtn.addEventListener("click", abrirTexto);
  addEventListener("keydown", (e) => { if (e.key === "Escape") { if (aberto) fecharTexto(); return; }
    if (aberto || modo !== "parada") return; const n = PARADAS.length;
    if (e.key === "Enter" && PARADAS[aqui] && PARADAS[aqui].texto) { e.preventDefault(); abrirTexto(); }
    else if (["ArrowRight", "ArrowDown", "PageDown"].includes(e.key)) ir(Math.min(n - 1, aqui + 1)); else if (["ArrowLeft", "ArrowUp", "PageUp"].includes(e.key)) ir(Math.max(0, aqui - 1)); });
  const rc = new T.Raycaster(), pt = new T.Vector2(); let down = null;
  canvas.addEventListener("pointerdown", (e) => { down = [e.clientX, e.clientY]; });
  canvas.addEventListener("pointerup", (e) => { if (!down || Math.hypot(e.clientX - down[0], e.clientY - down[1]) > 10 || modo !== "parada") return; pt.set((e.clientX / innerWidth) * 2 - 1, -(e.clientY / innerHeight) * 2 + 1); rc.setFromCamera(pt, camera);
    for (const [k, P] of PARADAS.entries()) if ((P.placas || []).some((m) => rc.intersectObject(m).length)) { if (k === aqui) abrirTexto(); else ir(k); return; } });

  /* ---------- os créditos, como num jogo: olhando para o céu, os nomes sobem; no fim, a logo e o nome ---------- */
  const BLOCOS = [
    { t: "Família", itens: [["Avós", "Mary Land Rateke", "Fernando Rateke"], ["Tias", "Fernanda Rateke", "Caroline Rateke"], ["Tios", "Levi Galvão", "Daphne Binder"], ["Pais", "Meu pai e minha mãe"], ["Irmãs", "Yasmim De Jesus", "Raquel Rateke"]] },
    { t: "Professores", itens: [["Linguagens", "Natali da Silva Rego"], ["Matemática e orientação da Iniciação Científica", "Wagner de Sousa Santos"], ["e todos os professores do", "Colégio SESI de Florianópolis"]] },
    { t: "Equipe do AcousticBuild", itens: [["", "Maria Eduarda Tessari", "Julia Veríssimo", "Sara Rotenski Pereira"]] },
    { t: "Iniciação Científica em Matemática", itens: [["", "Ana Maria Clara Alves Bittencourt", "Naiara Alicia Broering Rech Farrell", "Lucas Ferrari", "Maria Eduarda dos Santos Bernardo", "Larissa Miranda Medeiros", "Vitor Cunha de Souza"]] },
    { t: "Amigos", itens: [["", "Cauã Canova", "Ana Maria Clara Alves Bittencourt", "Luana Lupi Vergara"]] },
    { t: "Arte do jogo Nós", itens: [["", "Luana Lupi Vergara"]] },
    { t: "Modelos, texturas e imagens", itens: [["Ato 1, o Japão", "Poly Haven (CC0)"], ["Ato 2, a feira", "“Warehouse”, de Nicholas-3D (CC BY)", "estandes de fasih.lisan (CC BY)", "pessoas de Loïc Norgeot (CC BY)", "logos SESI e SENAI: Wikimedia Commons (CC BY-SA)"], ["Ato 3, a rua", "“Japanese street at night”, de afx_cgmotion (CC BY)", "“Cyberpunk City - #1”, de born2012 (CC BY)"], ["", "Modelos da Sketchfab, sob licença Creative Commons Atribuição 4.0"]] },
  ];
  const cred = document.getElementById("cred");
  cred.innerHTML = `<div class="faixa"></div><div class="rolo"><div class="abre"></div>${BLOCOS.map((b) => `<section><h3>${esc(b.t)}</h3>${b.itens.map(([papel, ...nomes]) => `<div class="it">${papel ? `<small>${esc(papel)}</small>` : ""}${nomes.map((n) => `<span${n.length > 40 ? ' class="mini"' : ""}>${esc(n)}</span>`).join("")}</div>`).join("")}</section>`).join("")}<div style="height:40vh"></div></div>
    <div class="fim" role="status"><div class="marca"><img src="/rateke-icone.svg" alt="">Fernando Rateke Neto</div><small>Portfólio · 3º ano · Colégio SESI</small><a href="/">Voltar ao começo</a></div>
    <button class="pular" type="button">Pular</button>`;
  const rolo = cred.querySelector(".rolo"), fimC = cred.querySelector(".fim");
  let credT = null; const DUR_C = Q.has("rapido") ? 6 : 36;
  function comecarCreditos() { cred.classList.add("on"); cred.classList.remove("acabou"); fimC.classList.remove("on"); cred.querySelector(".faixa").style.opacity = 1; credT = performance.now(); }
  function pararCreditos() { credT = null; cred.classList.remove("on"); fimC.classList.remove("on"); }
  function acabarCreditos() { credT = -1; cred.classList.add("acabou"); fimC.classList.add("on"); rolo.style.transform = `translate(-50%, ${-rolo.offsetHeight}px)`; cred.querySelector(".faixa").style.opacity = 0.4; }
  cred.querySelector(".pular").addEventListener("click", acabarCreditos);
  function rolarCreditos() { if (credT == null || credT < 0) return; const u = (performance.now() - credT) / 1000 / DUR_C; rolo.style.transform = `translate(-50%, ${(-u * (rolo.offsetHeight - innerHeight * 0.3)).toFixed(1)}px)`; if (u >= 1) acabarCreditos(); }

  /* ---------- o controle pelo celular ---------- */
  function estado() { const P = PARADAS[aqui]; const ac = PARADAS.map((p, k) => ({ id: "ir:" + k, t: p.nome, sub: k === aqui ? "você está aqui" : "" }));
    if (P && P.texto && !aberto) ac.unshift({ id: "ler", t: "Ler o texto", sub: P.nome });
    if (P && P.id === "creditos" && credT != null && credT >= 0) ac.unshift({ id: "pular", t: "Pular para o fim", sub: "créditos" });
    return { id: P ? P.id : "neon", title: P ? P.nome : "O futuro", sub: "Ato 3", g: "O futuro", panel: !!aberto, acoes: modo === "parada" ? ac : [] }; }
  function fazer(id) { const [k, a] = id.split(":"); if (k === "ir") ir(+a); else if (k === "ler") abrirTexto(); else if (k === "pular") acabarCreditos(); }
  N3.fazer = fazer; N3.estado = estado; N3.abrirTexto = abrirTexto;

  /* ---------- a chegada: a chuva de pixels do Pavilhão continua enquanto a rua carrega ---------- */
  const pix = document.getElementById("pixels"), pc = pix.querySelector("canvas"), pg = pc.getContext("2d");
  let pixAtivo = true; { pc.width = innerWidth; pc.height = innerHeight; const cols = Math.ceil(innerWidth / 14), ys = Array.from({ length: cols }, () => Math.random() * innerHeight);
    const passo = () => { if (!pixAtivo) return; pg.fillStyle = "rgba(6,4,18,.2)"; pg.fillRect(0, 0, pc.width, pc.height);
      for (let i = 0; i < cols; i++) { pg.fillStyle = i % 5 === 0 ? "#ff3ea5" : i % 3 === 0 ? "#3ee8ff" : "#7a8cff"; pg.fillRect(i * 14, ys[i], 3, 18); ys[i] += 18 + (i % 7) * 3; if (ys[i] > pc.height) ys[i] = -Math.random() * 200; }
      requestAnimationFrame(passo); };
    passo(); }

  function resize() { const w = innerWidth, h = innerHeight; renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix();
    rtR.setSize(Math.round((w * PR) / 2), Math.round((h * PR) / 2)); tamBrilho(Math.round(w * PR), Math.round(h * PR)); }
  addEventListener("resize", resize);
  const clock = new T.Clock(); let pronto = false, last = 0;
  const folga = () => new Promise((r) => setTimeout(r, 0));
  (async () => {
    if (!Q.has("semBrilho")) montarBrilho(); resize();
    await montar();
    // texturas aos poucos e shaders em paralelo, sem travar
    const tx = new Set(); scene.traverse((o) => { for (const m of [].concat(o.material || [])) for (const k in m) { const v = m[k]; if (v && v.isTexture && v.image) tx.add(v); } });
    let n = 0; for (const t of tx) { try { renderer.initTexture(t); } catch (e) { /* segue */ } if (++n % 3 === 0) await folga(); }
    aplicar(); try { renderer.compile(scene, camera); } catch (e) { /* segue */ }
    const gl = renderer.getContext(), ext = gl.getExtension("KHR_parallel_shader_compile");
    if (ext) { const t1 = performance.now(); while (performance.now() - t1 < 15000 && renderer.info.programs.some((p) => !gl.getProgramParameter(p.program, ext.COMPLETION_STATUS_KHR))) await new Promise((r) => setTimeout(r, 40)); }
    desenhar();
    pronto = true; window.neonPronto = true; last = clock.getElapsedTime();
    const k0 = Q.has("parada") ? cl(+Q.get("parada") || 0, 0, PARADAS.length - 1) : 0;
    // os pixels param e se apagam; a rua aparece olhando para o céu e a câmera desce o olhar até a primeira parada
    setTimeout(() => { pix.classList.add("fim"); setTimeout(() => { pixAtivo = false; }, 1100); }, Q.has("de") ? 400 : 0);
    if (Q.has("parada")) { const p = pose(k0); cam.p.copy(p.p); cam.yaw = p.yaw; cam.pitch = p.pitch; cam.fov = p.fov; aqui = k0; modo = "parada"; ui(); if (PARADAS[k0].id === "creditos") comecarCreditos(); }
    else setTimeout(() => ir(0, 2.6), Q.has("de") ? 600 : 200);
    if (window.Ponte) Ponte.iniciar({ estado, fazer, fechar: fecharTexto, rolar: (dy) => { const c = texto.querySelector(".corpo"); if (c) c.scrollBy(0, dy); } });
  })();
  // resolução automática: se a média de dois segundos passar de 30 ms por quadro, desenha com menos pixels
  let soma = 0, nq = 0, ajustes = 0;
  function frame() { const t = clock.getElapsedTime(), dt = Math.min(0.1, t - last); last = t;
    if (pronto) { tick(t, dt); rolarCreditos(); desenhar(); soma += dt; nq++;
      if (soma > 2) { const med = soma / nq; soma = 0; nq = 0; if (med > 0.03 && ajustes < 3 && !Q.has("filme")) { ajustes++; PR = Math.max(0.5, PR * 0.8); renderer.setPixelRatio(PR); resize(); } } }
    requestAnimationFrame(frame); }
  frame();
})();
