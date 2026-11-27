/* Ato 2: o Pavilhão. Uma galeria de verdade (modelo pronto: "Vr Studio Gallery", de R-LAB, CC BY), de manhã cedo,
   pousada num mar de nuvens. A chegada é um vídeo (chegada.mp4, feito desta mesma cena com ?filme): a câmera sai do céu
   da porta, o sol nasce, ela desce até o telhado e entra pela claraboia; o vídeo termina exatamente onde a cena ao vivo
   começa, e a troca é um esmaecer curto. Enquanto o vídeo passa, a galeria carrega por trás.
   Lá dentro, cinco paradas, uma por matéria, cada uma com os seus dois quadros (os dados ficam em atividades.json):
   paredes da esquerda e da direita, e por último a parede da porta, onde fica o Técnico. Dali, a porta se abre para o
   Ato 3 (a cidade neon). O piso é um espelho escuro (reflexo de verdade, em meia resolução). */
(() => {
  const T = THREE, Q = new URLSearchParams(location.search);
  const M2 = (window.PAVILHAO = {}); // para testes, para o filme e para o controle
  const FILME = Q.has("filme");
  const V3 = (x, y, z) => new T.Vector3(x, y, z);
  const canvas = document.getElementById("c");
  const renderer = new T.WebGLRenderer({ canvas, antialias: true, powerPreference: "high-performance", preserveDrawingBuffer: FILME });
  renderer.setPixelRatio(FILME ? 1 : Math.min(devicePixelRatio || 1, 1)); renderer.outputEncoding = T.sRGBEncoding;
  renderer.toneMapping = T.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.0; renderer.debug.checkShaderErrors = Q.has("debug");
  const scene = new T.Scene(), camera = new T.PerspectiveCamera(50, 16 / 9, 0.05, 1500); camera.rotation.order = "YXZ";
  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const tex = (w, h, fn) => { const c = document.createElement("canvas"); c.width = w; c.height = h; fn(c.getContext("2d"), w, h); const t = new T.CanvasTexture(c); t.encoding = T.sRGBEncoding; t.anisotropy = 8; return t; };
  const suave = (u) => (u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2);
  const cl = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
  const U = { uT: { value: 0 }, uDia: { value: 1 } };

  /* ---------- as medidas da galeria (tiradas do próprio modelo) ---------- */
  const PISO = -1.647, OLHO = PISO + 1.55, MEIO_QUADRO = -0.175, LADO_Q = 1.84, ALT_Q = 1.85;
  const PAREDE_X = 4.05, PAREDE_PORTA = -7.67, PORTA_Z = -7.952;
  const CLARABOIAS = [-5.65, -3.45, -0.6, 2.37, 5.32];
  // os quadros, na ordem em que o visitante os vê (da esquerda para a direita na tela)
  const PARADAS = [
    { lado: -1, z: 2.49, q: [3.86, 1.12] },   // Linguagens: parede da esquerda, perto da janela
    { lado: 1, z: 2.49, q: [1.12, 3.86] },    // Matemática: parede da direita
    { lado: -1, z: -2.47, q: [-1.095, -3.83] }, // Ciências Humanas
    { lado: 1, z: -2.47, q: [-3.83, -1.095] },  // Ciências da Natureza
    { porta: true, q: [-2.335, 2.325] },        // Técnico: os dois quadros ao lado da porta
  ];

  /* ---------- o céu: o mesmo da porta no começo (noite e horizonte dourado), e o nascer do sol ---------- */
  const SOL = V3(0.18, 0.1, 1).normalize();
  const ceu = new T.Mesh(new T.SphereGeometry(1200, 48, 24), new T.ShaderMaterial({ side: T.BackSide, depthWrite: false, fog: false, uniforms: { uT: U.uT, uDia: U.uDia, uSol: { value: SOL } },
    vertexShader: `varying vec3 vD; void main(){ vD = normalize(position); vec4 p = projectionMatrix * modelViewMatrix * vec4(position, 1.); gl_Position = p.xyww; }`,
    fragmentShader: `uniform float uT, uDia; uniform vec3 uSol; varying vec3 vD;
      float h(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      void main(){ vec3 d = normalize(vD); float e = d.y;
        float k = clamp(e / .75, 0., 1.);
        // a noite do outro lado da porta: as mesmas cores do véu (#ffdca0, #c9a46e, #2a2f6a, #0b1030, #050816)
        vec3 n = mix(vec3(1., .86, .63), vec3(.79, .64, .43), smoothstep(0., .08, k));
        n = mix(n, vec3(.165, .184, .416), smoothstep(.08, .36, k)); n = mix(n, vec3(.043, .063, .188), smoothstep(.36, .72, k)); n = mix(n, vec3(.02, .03, .086), smoothstep(.72, 1., k));
        // a manhã: horizonte pêssego, céu azul limpo em cima
        vec3 m = mix(vec3(1., .82, .6), vec3(.98, .72, .55), smoothstep(0., .06, k)); m = mix(m, vec3(.56, .68, .9), smoothstep(.06, .4, k)); m = mix(m, vec3(.25, .42, .78), smoothstep(.4, 1., k));
        vec3 c = mix(n, m, uDia);
        float s = max(dot(d, uSol), 0.); c += vec3(1., .74, .42) * (pow(s, 12.) * .5 + pow(s, 300.) * 3.) * (.35 + uDia * .65);
        // estrelas (somem com o sol)
        vec2 g = vec2(atan(d.z, d.x) * 180., asin(clamp(e, -1., 1.)) * 180.);
        float st = step(.9965, h(floor(g))) * smoothstep(.05, .35, e) * (.6 + .4 * sin(uT * 2. + g.x));
        c += st * (1. - uDia) * vec3(.9, .92, 1.);
        // abaixo do horizonte: o mar de nuvens ao longe
        c = mix(c, mix(vec3(.85, .66, .52), vec3(1., .9, .78), uDia), smoothstep(0., -.04, e));
        gl_FragColor = vec4(c, 1.); }` }));
  ceu.renderOrder = -10; ceu.frustumCulled = false; scene.add(ceu);
  // o mar de nuvens embaixo da galeria: um tapete de ruído iluminado pelo sol, mais tufos em volta da base
  const nuvemTex = tex(256, 256, (c, w, h) => { const g = c.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2); g.addColorStop(0, "rgba(255,255,255,1)"); g.addColorStop(0.45, "rgba(255,255,255,.55)"); g.addColorStop(1, "rgba(255,255,255,0)"); c.fillStyle = g; c.fillRect(0, 0, w, h); });
  const mar = new T.Mesh(new T.PlaneGeometry(2400, 2400, 1, 1), new T.ShaderMaterial({ transparent: true, depthWrite: false, fog: false, uniforms: { uT: U.uT, uDia: U.uDia, uSol: { value: SOL } },
    vertexShader: `varying vec3 vW; void main(){ vec4 w = modelMatrix * vec4(position, 1.); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,
    fragmentShader: `uniform float uT, uDia; uniform vec3 uSol; varying vec3 vW;
      float h(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      float n(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3. - 2. * f); return mix(mix(h(i), h(i + vec2(1, 0)), f.x), mix(h(i + vec2(0, 1)), h(i + vec2(1, 1)), f.x), f.y); }
      float fbm(vec2 p){ float s = 0., a = .5; for (int k = 0; k < 6; k++) { s += a * n(p); p = p * 2.02 + vec2(1.7, 9.2); a *= .5; } return s; }
      void main(){ vec2 p = vW.xz * .012 + vec2(uT * .004, uT * .002); float f = fbm(p), f2 = fbm(p + vec2(.03, .02));
        float luz = clamp((f - f2) * 9. + .55, 0., 1.);
        vec3 sombra = mix(vec3(.42, .36, .48), vec3(.78, .66, .66), uDia), sol = mix(vec3(1., .82, .62), vec3(1., .95, .88), uDia);
        vec3 c = mix(sombra, sol, luz * .8 + f * .3);
        float d = length(vW.xz - cameraPosition.xz); vec3 lo = mix(vec3(.85, .66, .52), vec3(1., .9, .78), uDia);
        c = mix(c, lo, smoothstep(150., 900., d));
        gl_FragColor = vec4(c, clamp(smoothstep(.25, .5, f) * .96 + smoothstep(300., 700., d), 0., 1.)); }` }));
  mar.rotation.x = -Math.PI / 2; mar.position.y = PISO - 2.4; mar.renderOrder = -5; scene.add(mar);
  const tufos = new T.Group(); scene.add(tufos);
  { let s = 11; const r = () => (s = (s * 16807) % 2147483647) / 2147483647;
    for (let i = 0; i < 150; i++) { const a = r() * Math.PI * 2, d = 7 + r() * 90, sc = 5 + r() * 16;
      const sp = new T.Sprite(new T.SpriteMaterial({ map: nuvemTex, color: "#fff3e6", transparent: true, opacity: 0.55 + r() * 0.35, depthWrite: false, fog: false }));
      sp.position.set(Math.cos(a) * d, PISO - 2.6 + r() * 1.8, Math.sin(a) * d * 1.3); sp.scale.set(sc, sc * 0.45, 1); tufos.add(sp); } }

  /* ---------- luz: manhã cedo, sol baixo do lado da janela ---------- */
  const hemi = new T.HemisphereLight("#fff6ea", "#6d6470", 0.95); scene.add(hemi);
  const sol = new T.DirectionalLight("#ffd7a8", 0.55); sol.position.copy(SOL).multiplyScalar(30); scene.add(sol);
  { const env = new T.Scene(); env.background = new T.Color("#9a9aa2");
    const caixa = (cor, x, y, z, w, h, d) => { const m = new T.Mesh(new T.BoxGeometry(w, h, d), new T.MeshBasicMaterial({ color: cor })); m.position.set(x, y, z); env.add(m); };
    for (const z of CLARABOIAS) caixa("#ffffff", 0, 6, z * 1.2, 4, 0.2, 1.4); caixa("#ffd9b0", 0, 1, 12, 7, 3, 0.2); caixa("#3a3640", 0, -6, 0, 30, 0.2, 30);
    const pm = new T.PMREMGenerator(renderer); scene.environment = pm.fromScene(env, 0.02).texture; }

  /* ---------- carregamento ---------- */
  const veu = document.getElementById("veu"), barra = veu.querySelector(".linha i");
  T.DefaultLoadingManager.onProgress = (u, a, b) => { barra.style.width = ((a / Math.max(b, 1)) * 100).toFixed(0) + "%"; };
  const loader = new T.GLTFLoader(); if (window.MeshoptDecoder) loader.setMeshoptDecoder(window.MeshoptDecoder);
  const carregar = (u) => new Promise((ok) => loader.load(u, (g) => ok(g.scene), undefined, () => ok(null)));

  /* ---------- o piso: um espelho escuro ---------- */
  let espelho = null;
  const rt = new T.WebGLRenderTarget(512, 512);
  const virt = new T.PerspectiveCamera(), texM = new T.Matrix4();
  function montarPiso() {
    espelho = new T.Mesh(new T.PlaneGeometry(8.14, 15.6), new T.ShaderMaterial({ uniforms: { tR: { value: rt.texture }, texM: { value: texM }, uPx: { value: new T.Vector2(1 / 512, 1 / 512) } },
      vertexShader: `uniform mat4 texM; varying vec4 vP; varying vec3 vW; void main(){ vP = texM * vec4(position, 1.); vec4 w = modelMatrix * vec4(position, 1.); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,
      fragmentShader: `uniform sampler2D tR; uniform vec2 uPx; varying vec4 vP; varying vec3 vW;
        void main(){ vec2 uv = vP.xy / vP.w; vec3 r = vec3(0.);
          for (int i = -2; i <= 2; i++) for (int j = -1; j <= 1; j++) r += texture2D(tR, uv + vec2(float(i), float(j)) * uPx * 1.4).rgb; r /= 15.;
          vec3 v = normalize(cameraPosition - vW); float fr = .22 + .4 * pow(1. - max(v.y, 0.), 3.);
          // placas de pedra escura, com juntas finas
          vec2 q = abs(fract(vW.xz / vec2(1.36, 1.3)) - .5); float junta = smoothstep(.494, .5, max(q.x, q.y));
          vec3 base = vec3(.018, .017, .02) + junta * .012;
          gl_FragColor = vec4(base + r * fr * (1. - junta * .6), 1.);
          #include <tonemapping_fragment>
          #include <encodings_fragment>
        }` }));
    espelho.rotation.x = -Math.PI / 2; espelho.position.set(0, PISO + 0.003, 0.1); scene.add(espelho);
  }
  const _n = V3(0, 1, 0), _p = new T.Vector3(), _c = new T.Vector3(), _a = new T.Vector3(), _r = new T.Matrix4(), _pl = new T.Plane(), _q = new T.Vector4(), _cp = new T.Vector4();
  function refletir() {
    if (!espelho || camera.position.y < PISO + 0.05 || camera.position.y > PISO + 6) return;
    // a câmera virtual do outro lado do piso (como o Reflector dos exemplos do three.js)
    _p.setFromMatrixPosition(espelho.matrixWorld); _c.setFromMatrixPosition(camera.matrixWorld);
    const vista = _p.clone().sub(_c); vista.reflect(_n).negate().add(_p);
    _r.extractRotation(camera.matrixWorld); _a.set(0, 0, -1).applyMatrix4(_r).add(_c);
    const alvo = _p.clone().sub(_a); alvo.reflect(_n).negate().add(_p);
    virt.position.copy(vista); virt.up.set(0, 1, 0).applyMatrix4(_r).reflect(_n); virt.lookAt(alvo);
    virt.far = camera.far; virt.updateMatrixWorld(); virt.projectionMatrix.copy(camera.projectionMatrix);
    texM.set(0.5, 0, 0, 0.5, 0, 0.5, 0, 0.5, 0, 0, 0.5, 0.5, 0, 0, 0, 1); texM.multiply(virt.projectionMatrix); texM.multiply(virt.matrixWorldInverse); texM.multiply(espelho.matrixWorld);
    _pl.setFromNormalAndCoplanarPoint(_n, _p); _pl.applyMatrix4(virt.matrixWorldInverse); _cp.set(_pl.normal.x, _pl.normal.y, _pl.normal.z, _pl.constant);
    const pe = virt.projectionMatrix.elements;
    _q.x = (Math.sign(_cp.x) + pe[8]) / pe[0]; _q.y = (Math.sign(_cp.y) + pe[9]) / pe[5]; _q.z = -1; _q.w = (1 + pe[10]) / pe[14];
    _cp.multiplyScalar(2 / _cp.dot(_q)); pe[2] = _cp.x; pe[6] = _cp.y; pe[10] = _cp.z + 1 - 0.003; pe[14] = _cp.w;
    espelho.visible = false; tufos.visible = false; for (const f of feixes) f.visible = false;
    renderer.setRenderTarget(rt); renderer.clear(); renderer.render(scene, virt); renderer.setRenderTarget(null);
    espelho.visible = true; tufos.visible = true; for (const f of feixes) f.visible = true;
  }

  /* ---------- a galeria, os feixes de sol das claraboias e os quadros ---------- */
  const alvos = [], feixes = [], paradas = [];
  let porta = null, portal = null, dados = { materias: [] };
  // de longe, as claraboias brilham mornas; chegando perto, o brilho some e aparece o salão lá dentro
  const vidroCima = new T.MeshBasicMaterial({ color: "#ffe2b8", transparent: true, opacity: 0.55, depthWrite: false, fog: false });
  async function montar() {
    const [g, d] = await Promise.all([carregar("/pavilhao/modelos/salao.glb"), fetch("/pavilhao/atividades.json").then((r) => r.json()).catch(() => ({ materias: [] })),
      document.fonts ? Promise.all(["800 80px Archivo", "700 40px Archivo", "500 30px 'Geist Mono'"].map((f) => document.fonts.load(f).catch(() => 0))) : 0]);
    dados = d || dados;
    if (g) {
      g.traverse((o) => { if (!o.isMesh) return; const m = o.material; m.envMapIntensity = 0.55;
        if (m.name === "1003") o.material = new T.MeshBasicMaterial({ color: "#fff4e4", transparent: true, opacity: 0.16, depthWrite: false, fog: false }); // o vidro das claraboias e da janela
        if (m.name === "1002") { m.metalness = 0; m.roughness = 0.9; } // teto (o piso fica por baixo do espelho)
        if (o.name === "defaultMaterial_46") porta = o; });
      scene.add(g);
    }
    montarPiso();
    // os feixes de sol: cortinas de luz que descem das claraboias, inclinadas para longe da janela
    const fx = new T.ShaderMaterial({ transparent: true, depthWrite: false, blending: T.AdditiveBlending, side: T.DoubleSide, fog: false, uniforms: { uT: U.uT },
      vertexShader: `varying vec2 vU; void main(){ vU = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }`,
      fragmentShader: `uniform float uT; varying vec2 vU; void main(){ float a = smoothstep(0., .35, vU.y) * (1. - smoothstep(.9, 1., vU.y)) * smoothstep(0., .2, vU.x) * smoothstep(1., .8, vU.x);
        a *= .55 + .45 * sin(vU.x * 9. + uT * .3) * sin(vU.x * 23. - uT * .2); gl_FragColor = vec4(vec3(1., .86, .66) * a * .05, 1.); }` });
    for (const z of CLARABOIAS) { const v = new T.Mesh(new T.PlaneGeometry(4.2, 1.36), vidroCima); v.rotation.x = -Math.PI / 2; v.position.set(0.02, 1.68, z); scene.add(v); }
    for (const z of CLARABOIAS) for (let i = 0; i < 3; i++) { const f = new T.Mesh(new T.PlaneGeometry(4.1, 3.3), fx); f.position.set((i - 1) * 0.05, -0.05, z - 0.55 - i * 0.15); f.rotation.x = 0.34; f.rotation.y = i * 0.02; scene.add(f); feixes.push(f); }
    // as paradas e os quadros
    const mats = (dados.materias || []).slice(0, 5);
    await Promise.all(mats.map((mat, k) => parada(mat, k)));
    // o portal atrás da porta: a cidade neon, que acende quando a porta se abre
    portal = new T.Mesh(new T.PlaneGeometry(2.24, 2.62), new T.ShaderMaterial({ transparent: true, depthWrite: false, fog: false, toneMapped: false, uniforms: { uT: U.uT, uA: { value: 0 } },
      vertexShader: `varying vec2 vU; void main(){ vU = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }`,
      fragmentShader: `uniform float uT, uA; varying vec2 vU; float h(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
        void main(){ vec2 u = vU; vec2 a = vec2((u.x - .5) * 2.24, u.y * 2.62 - 1.5); float arco = a.y < 0. ? 1. : 1. - smoothstep(1.08, 1.12, length(a));
          float col = floor(u.x * 46.), vel = .6 + h(vec2(col, 1.)) * 1.2, y = fract(u.y * 1.4 + uT * vel * .35 + h(vec2(col, 7.)));
          float gota = smoothstep(.0, .02, y) * (1. - smoothstep(.02, .22, y)); vec3 cor = h(vec2(col, 3.)) > .5 ? vec3(1., .24, .65) : vec3(.24, .9, 1.);
          vec3 c = mix(vec3(.05, .02, .12), vec3(.16, .05, .3), u.y) + cor * gota * 1.6 + vec3(.9, .3, 1.) * exp(-pow((u.y - .3) * 5., 2.)) * .25;
          gl_FragColor = vec4(c, arco * uA); }` }));
    portal.position.set(0, PISO + 1.31, PORTA_Z + 0.012); scene.add(portal);
  }

  const haloTex = tex(256, 256, (c, w, h) => { const g = c.createRadialGradient(w / 2, h * 0.3, 0, w / 2, h * 0.42, w * 0.5); g.addColorStop(0, "rgba(255,226,186,.55)"); g.addColorStop(0.5, "rgba(255,214,170,.22)"); g.addColorStop(1, "rgba(255,210,160,0)"); c.fillStyle = g; c.fillRect(0, 0, w, h); });
  function parada(mat, k) {
    const P = PARADAS[k], cor = mat.cor || "#0072ce", acts = (mat.atividades || []).slice(0, 2);
    const st = { mat, k, P, quadros: [] }; paradas[k] = st;
    return Promise.all(acts.map((at, j) => new Promise((ok) => {
      const largo = (P.porta ? 1.39 : LADO_Q) - 0.16, alto = ALT_Q - 0.16; // a moldura escura do modelo fica à mostra
      const g = new T.Group();
      if (P.porta) g.position.set(P.q[j], MEIO_QUADRO, PAREDE_PORTA + 0.004);
      else { g.position.set(P.lado > 0 ? 4.04 - 0.004 : -4.05 + 0.004, MEIO_QUADRO, P.q[j]); g.rotation.y = -P.lado * Math.PI / 2; }
      scene.add(g);
      // a luz do trilho sobre o quadro: um halo morno na parede
      const halo = new T.Mesh(new T.PlaneGeometry(largo + 1.6, alto + 1.4), new T.MeshBasicMaterial({ map: haloTex, transparent: true, opacity: 0.55, blending: T.AdditiveBlending, depthWrite: false, fog: false }));
      halo.position.set(0, 0.25, -0.001); g.add(halo);
      const tela = new T.Mesh(new T.PlaneGeometry(largo, alto), new T.MeshBasicMaterial({ color: "#f3f0ea", toneMapped: false })); g.add(tela);
      // a etiqueta do museu, ao lado do quadro
      const et = new T.Mesh(new T.PlaneGeometry(0.4, 0.235), new T.MeshBasicMaterial({ map: etiqueta(mat, at, j, cor), toneMapped: false }));
      et.position.set(largo / 2 + 0.36, -0.6, 0.002); g.add(et);
      const pronto = (img) => { tela.material.map = arte(mat, at, j, cor, img, largo / alto); tela.material.color.set("#ffffff"); tela.material.needsUpdate = true; ok(); };
      if (at.imagem) { const im = new Image(); im.onload = () => pronto(im); im.onerror = () => pronto(null); im.src = at.imagem; } else pronto(null);
      const alvo = { obj: g, mat, at, k, j, nome: at.titulo }; alvos.push(alvo); st.quadros[j] = alvo;
    })));
  }
  // o quadro: passe-partout claro e, dentro, a imagem da atividade; sem imagem, um cartaz geométrico na cor da matéria
  function arte(mat, at, j, cor, img, prop) {
    const H = 1400, W = Math.round(H * prop);
    return tex(W, H, (c, w, h) => {
      c.fillStyle = "#f4f1ea"; c.fillRect(0, 0, w, h);
      const m = Math.round(w * 0.09), iw = w - m * 2, ih = h - m * 2;
      if (img) { // a imagem inteira (sem cortar), sobre um fundo feito dela mesma, borrado
        const s = Math.min(iw / img.width, ih / img.height), dw = img.width * s, dh = img.height * s, sf = Math.max(iw / img.width, ih / img.height);
        c.save(); c.beginPath(); c.rect(m, m, iw, ih); c.clip(); c.filter = "blur(28px) brightness(.55)"; c.drawImage(img, m + (iw - img.width * sf) / 2, m + (ih - img.height * sf) / 2, img.width * sf, img.height * sf);
        c.filter = "none"; c.drawImage(img, m + (iw - dw) / 2, m + (ih - dh) / 2, dw, dh); c.restore();
        c.strokeStyle = "rgba(0,0,0,.18)"; c.lineWidth = 3; c.strokeRect(m, m, iw, ih); return; }
      // o cartaz: formas simples (cada atividade com a sua), o título grande e a matéria
      c.save(); c.beginPath(); c.rect(m, m, iw, ih); c.clip(); c.fillStyle = "#ebe6dc"; c.fillRect(m, m, iw, ih);
      c.fillStyle = cor; const n = mat.id.length + j * 3;
      if (n % 3 === 0) { c.beginPath(); c.arc(m + iw * 0.72, m + ih * 0.3, iw * 0.42, 0, Math.PI * 2); c.fill(); c.fillStyle = "#1b1e2b"; c.fillRect(m, m + ih * 0.52, iw * 0.55, ih * 0.04); }
      else if (n % 3 === 1) { for (let i = 0; i < 6; i++) { c.globalAlpha = 1 - i * 0.14; c.fillRect(m, m + ih * (0.06 + i * 0.075), iw * (0.9 - i * 0.12), ih * 0.045); } c.globalAlpha = 1; }
      else { c.beginPath(); c.moveTo(m, m + ih * 0.62); c.lineTo(m + iw, m); c.lineTo(m + iw, m + ih * 0.3); c.closePath(); c.fill(); c.fillStyle = "#1b1e2b"; c.beginPath(); c.arc(m + iw * 0.22, m + ih * 0.2, iw * 0.09, 0, Math.PI * 2); c.fill(); }
      c.restore();
      c.fillStyle = "#1b1e2b"; c.font = `500 ${Math.round(w * 0.034)}px 'Geist Mono', monospace`; c.fillText(`${(mat.sigla || "").toUpperCase()} · ${String(j + 1).padStart(2, "0")}`, m + iw * 0.07, m + ih * 0.7);
      let fs = Math.round(w * 0.088); c.font = `800 ${fs}px Archivo, sans-serif`;
      let linhas = quebrar(c, at.titulo || "", iw * 0.86); while (linhas.length > 3 && fs > 30) { fs -= 4; c.font = `800 ${fs}px Archivo, sans-serif`; linhas = quebrar(c, at.titulo || "", iw * 0.86); }
      linhas.slice(0, 3).forEach((l, i) => c.fillText(l, m + iw * 0.07, m + ih * 0.79 + i * fs * 1.02));
    });
  }
  function quebrar(c, t, max) { const ps = String(t).split(/\s+/), out = []; let l = ""; for (const p of ps) { const x = l ? l + " " + p : p; if (c.measureText(x).width > max && l) { out.push(l); l = p; } else l = x; } if (l) out.push(l); return out; }
  function etiqueta(mat, at, j, cor) {
    return tex(680, 400, (c, w, h) => { c.fillStyle = "#fbfaf7"; c.fillRect(0, 0, w, h); c.fillStyle = cor; c.fillRect(0, 0, 10, h);
      c.fillStyle = "#1b1e2b"; c.font = "800 44px Archivo, sans-serif"; quebrar(c, at.titulo || "", w - 80).slice(0, 2).forEach((l, i) => c.fillText(l, 40, 78 + i * 50));
      c.fillStyle = "#5b6070"; c.font = "500 26px 'Geist Mono', monospace"; c.fillText((mat.nome || "").toUpperCase(), 40, h - 92);
      c.fillText(at.subtitulo ? at.subtitulo.slice(0, 34) : `atividade ${j + 1} de 2`, 40, h - 50); });
  }

  /* ---------- a câmera: cada parada tem a sua pose; entre elas, um passo para o meio do salão ---------- */
  function pose(k) { const P = PARADAS[k]; const hf = 2 * Math.atan(Math.tan((camera.fov * Math.PI) / 360) * camera.aspect);
    if (P.porta) { const d = cl(7.6 / (2 * Math.tan(hf / 2)), 3.2, 12); return { p: V3(0, OLHO, PAREDE_PORTA + d), yaw: 0, pitch: Math.atan2(MEIO_QUADRO - OLHO, d) }; }
    const d = cl(7.2 / (2 * Math.tan(hf / 2)), 3, 7.4); return { p: V3(P.lado * (PAREDE_X - d), OLHO, P.z), yaw: -P.lado * Math.PI / 2, pitch: Math.atan2(MEIO_QUADRO - OLHO, d) }; }
  let modo = "chegada", aqui = -1, mov = null, mx = 0, my = 0;
  const cam = { p: V3(), yaw: 0, pitch: 0 };
  const aplicar = (c) => { camera.position.copy(c.p); camera.rotation.set(c.pitch, c.yaw, 0); };
  addEventListener("pointermove", (e) => { if (e.pointerType === "mouse") { mx = e.clientX / innerWidth - 0.5; my = e.clientY / innerHeight - 0.5; } });
  function irSala(k) { if (!paradas[k] || mov || modo !== "sala" || k === aqui) return; fechar(); const de = { p: cam.p.clone(), yaw: cam.yaw, pitch: cam.pitch }, para = pose(k);
    const meio = de.p.clone().lerp(para.p, 0.5); meio.x *= 0.2; meio.z += 0.5;
    const curva = new T.QuadraticBezierCurve3(de.p, meio, para.p);
    mov = { de, para, curva, t: null, dur: 1.5 + Math.min(1.4, de.p.distanceTo(para.p) * 0.16) + Math.abs(para.yaw - de.yaw) * 0.25, fim: () => { aqui = k; ui(); } }; modo = "andando"; ui(); }
  M2.irSala = irSala;
  function tick(t, dt) {
    if (mov) { if (mov.t == null) mov.t = t; const u = Math.min(1, (t - mov.t) / mov.dur), e = suave(u);
      mov.curva.getPoint(e, cam.p); cam.p.y += Math.sin(e * Math.PI) * 0.06; cam.yaw = mov.de.yaw + (mov.para.yaw - mov.de.yaw) * e; cam.pitch = mov.de.pitch + (mov.para.pitch - mov.de.pitch) * e;
      if (u >= 1) { const f = mov.fim; mov = null; modo = "sala"; f(); } aplicar(cam); }
    else if (modo === "sala" && aqui >= 0) { const p = pose(aqui), k = 1 - Math.exp(-dt * 3); cam.p.lerp(p.p, k); cam.yaw += (p.yaw - mx * 0.06 - cam.yaw) * k; cam.pitch += (p.pitch - my * 0.04 - cam.pitch) * k;
      aplicar(cam); camera.position.y += Math.sin(t * 0.5) * 0.008; }
    U.uT.value = t; rotulos();
  }

  /* ---------- a chegada (é o que o vídeo mostra): do céu da porta até a primeira parada ---------- */
  const DUR = 7.4;
  const QUADROS = [ // tempo, posição, giro, inclinação, dia (0 = a noite da porta, 1 = manhã)
    [0.0, V3(0, 46, 118), 0, 0.46, 0],
    [1.4, V3(0, 42, 100), 0, 0.3, 0.05],
    [3.0, V3(1.2, 24, 50), 0, -0.32, 0.75],
    [4.6, V3(0.3, 12, 10), 0, -1.05, 1],
    [5.5, V3(0, 4.4, 2.42), 0, -1.53, 1],
    [6.1, V3(0, 0.9, 2.42), 0.05, -1.25, 1],
    [6.7, V3(-0.4, 0.05, 2.5), 1.25, -0.3, 1],
    [7.4, null, null, null, 1],
  ];
  let curvaChegada = null;
  const suaveLeve = (u) => u * u * (3 - 2 * u) * 0.5 + u * 0.5;
  function chegada(t) { const fim = pose(0); const qs = QUADROS.map((q) => (q[1] ? q : [q[0], fim.p, fim.yaw, fim.pitch, q[4]]));
    if (!curvaChegada) curvaChegada = new T.CatmullRomCurve3(qs.map((q) => q[1].clone()), false, "centripetal");
    let i = 0; while (i < qs.length - 2 && t > qs[i + 1][0]) i++; const a = qs[i], b = qs[i + 1], u = cl((t - a[0]) / (b[0] - a[0])), e = suave(u);
    // cada ponto da curva cai no seu tempo; ângulos e luz do dia vão por trechos suavizados
    curvaChegada.getPoint(cl((i + suaveLeve(u)) / (qs.length - 1)), cam.p);
    cam.yaw = a[2] + (b[2] - a[2]) * e; cam.pitch = a[3] + (b[3] - a[3]) * e; U.uDia.value = a[4] + (b[4] - a[4]) * e;
    aplicar(cam); }
  M2.DUR = DUR;

  /* ---------- os botões "Abrir" embaixo dos quadros, a planta e o painel da atividade ---------- */
  const camada = document.getElementById("rotulos"), pv = new T.Vector3();
  const rots = []; function criarRotulos() { for (const a of alvos) { const b = document.createElement("button"); b.type = "button"; b.className = "rot"; b.textContent = "Abrir"; b.setAttribute("aria-label", "Abrir: " + a.nome); b.addEventListener("click", () => abrir(a)); camada.appendChild(b); rots.push({ a, b }); } }
  function rotulos() { for (const r of rots) { r.a.obj.localToWorld(pv.set(0, -ALT_Q / 2 - 0.12, 0)); pv.project(camera);
      const ver = modo === "sala" && aqui === r.a.k && !mov && pv.z < 1 && Math.abs(pv.x) < 1 && Math.abs(pv.y) < 1 && !aberto;
      r.b.style.transform = `translate(${((pv.x * 0.5 + 0.5) * innerWidth).toFixed(1)}px, ${((-pv.y * 0.5 + 0.5) * innerHeight).toFixed(1)}px) translate(-50%, 0)`; r.b.classList.toggle("on", ver); } }
  const planta = document.getElementById("planta"), nomeSala = document.getElementById("sala"), telaBtn = document.getElementById("tela");
  function desenharPlanta() {
    // a galeria vista de cima: a janela em cima, a porta embaixo; um ponto em cada parada
    const px = (x) => (x / 4.1) * 26, pz = (z) => (-z / 7.9) * 50, svg = [`<svg viewBox="-34 -58 68 116" aria-hidden="true"><rect x="-27" y="-51" width="54" height="102" rx="2" fill="none" stroke="rgba(160,190,255,.45)"/>
      <line x1="-10" y1="-51" x2="10" y2="-51" stroke="#ffd59a" stroke-width="3"/><path d="M-6 51 v-6 a6 6 0 0 1 12 0 v6" fill="none" stroke="rgba(255,255,255,.7)"/>`];
    paradas.forEach((s, k) => { const P = PARADAS[k], x = P.porta ? 0 : px(P.lado * 3.5), y = P.porta ? pz(-6.6) : pz(P.z); svg.push(`<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="5.5" class="pt" data-k="${k}"/>`); });
    svg.push("</svg>");
    planta.innerHTML = svg.join("") + `<div class="nomes">${paradas.map((s, k) => `<button type="button" data-k="${k}"><i>${String(k + 1).padStart(2, "0")}</i>${esc(s.mat.nome)}</button>`).join("")}</div>`;
    planta.querySelectorAll("[data-k]").forEach((el) => el.addEventListener("click", () => irSala(+el.dataset.k)));
  }
  function ui() { const s = paradas[aqui];
    nomeSala.innerHTML = s ? `<small>${String(aqui + 1).padStart(2, "0")} de ${paradas.length} · ${esc(s.mat.sigla || "")}</small>${esc(s.mat.nome)}` : "";
    nomeSala.style.setProperty("--cor", s ? s.mat.cor : "#0072ce");
    planta.querySelectorAll("[data-k]").forEach((el) => el.classList.toggle("on", +el.dataset.k === aqui));
    telaBtn.classList.toggle("on", !!s && !!PARADAS[aqui].porta && modo === "sala");
    document.body.classList.toggle("chegando", modo === "chegada" || modo === "saindo"); }
  const painel = document.getElementById("painel"); let aberto = null;
  function abrir(a) { if (modo !== "sala") return; aberto = a; const at = a.at, cor = a.mat.cor || "#0072ce", vazio = `<p class="breve">Em breve.</p>`;
    const sec = (t, v) => `<h4>${t}</h4>${v ? `<p>${esc(v)}</p>` : vazio}`;
    const comp = (at.competencias || []).map(([c, d]) => `<li><b>${esc(c)}</b>${esc(d)}</li>`).join("");
    const links = (at.links || []).map(([n, u]) => `<a href="${esc(/^https?:\/\//.test(u) ? u : "#")}" target="_blank" rel="noopener">${esc(n)}</a>`).join("");
    painel.style.setProperty("--cor", cor);
    painel.querySelector(".vidro").innerHTML = `<button class="x" type="button" aria-label="Fechar">×</button>
      <div class="cab"><span>${String(a.k + 1).padStart(2, "0")} · ${esc(a.mat.nome)} · atividade ${a.j + 1} de 2</span><h2>${esc(at.titulo)}</h2>${at.subtitulo ? `<p class="sub">${esc(at.subtitulo)}</p>` : ""}</div>
      <div class="corpo">${at.imagem ? `<img src="${esc(at.imagem)}" alt="">` : ""}${sec("Contexto", at.contexto)}${sec("O que aprendi", at.aprendizagens)}${sec("Por que é importante", at.importancia)}
      <h4>Competências</h4>${comp ? `<ul>${comp}</ul>` : vazio}${links ? `<div class="links">${links}</div>` : ""}${at.creditos ? `<p class="cred">${esc(at.creditos)}</p>` : ""}</div>`;
    painel.querySelector(".x").onclick = fechar; painel.classList.add("on"); painel.setAttribute("aria-hidden", "false"); setTimeout(() => painel.querySelector(".x").focus({ preventScroll: true }), 50); }
  function fechar() { if (!aberto) return; aberto = null; painel.classList.remove("on"); painel.setAttribute("aria-hidden", "true"); }
  painel.addEventListener("click", (e) => { if (e.target === painel) fechar(); });
  addEventListener("keydown", (e) => { if (e.key === "Escape") return fechar(); if (aberto || modo !== "sala") return; const n = paradas.length;
    if (["ArrowRight", "ArrowDown", "PageDown"].includes(e.key)) irSala((aqui + 1) % n); else if (["ArrowLeft", "ArrowUp", "PageUp"].includes(e.key)) irSala((aqui - 1 + n) % n); });
  const rc = new T.Raycaster(), pt = new T.Vector2(); let down = null;
  const acertar = (e) => { pt.set((e.clientX / innerWidth) * 2 - 1, -(e.clientY / innerHeight) * 2 + 1); rc.setFromCamera(pt, camera); let melhor = null, dm = 1e9;
    for (const a of alvos) { const h = rc.intersectObject(a.obj, true)[0]; if (h && h.distance < dm) { dm = h.distance; melhor = a; } } return melhor; };
  canvas.addEventListener("pointerdown", (e) => { down = [e.clientX, e.clientY]; });
  canvas.addEventListener("pointermove", (e) => { if (e.pointerType === "mouse" && modo === "sala") canvas.style.cursor = acertar(e) ? "pointer" : ""; });
  canvas.addEventListener("pointerup", (e) => { if (!down || Math.hypot(e.clientX - down[0], e.clientY - down[1]) > 10 || modo !== "sala") return; const a = acertar(e); if (a) { if (a.k !== aqui) irSala(a.k); else abrir(a); } });

  /* ---------- a porta se abre para o futuro: a cidade neon aparece no vão e a câmera entra ---------- */
  const pix = document.getElementById("pixels"); let saida = null;
  function atravessar() { if (modo !== "sala" || !PARADAS[aqui] || !PARADAS[aqui].porta) return; fechar(); modo = "saindo"; ui();
    const de = cam.p.clone(), para = V3(0, PISO + 1.25, PORTA_Z + 0.25), y0 = cam.yaw, p0 = cam.pitch; let ti = null;
    if (porta) { porta.material = porta.material.clone(); porta.material.transparent = true; }
    saida = (t) => { if (ti == null) ti = t; const u = Math.min(1, (t - ti) / 3.4), e = suave(cl((u - 0.25) / 0.75));
      portal.material.uniforms.uA.value = cl(u / 0.3); if (porta) porta.material.opacity = 1 - cl(u / 0.3);
      cam.p.copy(de).lerp(para, e); cam.yaw = y0 * (1 - e); cam.pitch = p0 + (0.02 - p0) * e; aplicar(cam);
      if (u > 0.78) pix.classList.add("on"); if (u >= 1) { chuva(); return true; } }; }
  function chuva() { const c = pix.querySelector("canvas"), g = c.getContext("2d"); c.width = innerWidth; c.height = innerHeight; const cols = Math.ceil(innerWidth / 14), ys = Array.from({ length: cols }, () => -Math.random() * innerHeight);
    let n = 0; const passo = () => { g.fillStyle = "rgba(6,4,18,.18)"; g.fillRect(0, 0, c.width, c.height);
      for (let i = 0; i < cols; i++) { g.fillStyle = i % 5 === 0 ? "#ff3ea5" : i % 3 === 0 ? "#3ee8ff" : "#7a8cff"; g.fillRect(i * 14, ys[i], 3, 18); ys[i] += 18 + (i % 7) * 3; if (ys[i] > c.height) ys[i] = -Math.random() * 200; }
      if (++n < 100) requestAnimationFrame(passo); else location.href = "/neon/?de=pavilhao"; };
    passo(); }
  telaBtn.addEventListener("click", atravessar);

  /* ---------- o controle pelo celular ---------- */
  function estado() { const s = paradas[aqui]; const ac = paradas.map((x, k) => ({ id: "sala:" + k, t: x.mat.nome, sub: k === aqui ? "você está aqui" : "" }));
    if (s) [...s.quadros].reverse().forEach((a) => a && ac.unshift({ id: "abrir:" + a.k + ":" + a.j, t: a.nome, sub: "abrir a atividade" }));
    if (s && PARADAS[aqui].porta) ac.push({ id: "tela", t: "Atravessar a porta", sub: "vai para o futuro" });
    return { id: s ? s.mat.id : "pavilhao", title: s ? s.mat.nome : "O Pavilhão", sub: "Pavilhão", g: "O Pavilhão", panel: !!aberto, acoes: modo === "sala" ? ac : [] }; }
  function fazer(id) { const [k, a, b] = id.split(":"); if (k === "sala") irSala(+a); else if (k === "abrir") { const al = alvos.find((x) => x.k === +a && x.j === +b); if (al) abrir(al); } else if (k === "tela") atravessar(); }
  M2.fazer = fazer; M2.estado = estado;

  /* ---------- tamanho da tela ---------- */
  function resize() { const w = FILME ? 1920 : innerWidth, h = FILME ? 1080 : innerHeight; renderer.setSize(w, h, false); camera.aspect = w / h; camera.fov = camera.aspect < 0.8 ? 66 : 50; camera.updateProjectionMatrix();
    const pr = renderer.getPixelRatio(); rt.setSize(Math.round((w * pr) / 2), Math.round((h * pr) / 2)); if (espelho) espelho.material.uniforms.uPx.value.set(2 / (w * pr), 2 / (h * pr)); curvaChegada = null; }
  addEventListener("resize", resize);

  /* ---------- começar ---------- */
  const folga = () => new Promise((r) => setTimeout(r, 0));
  async function prepararGPU() { const tx = new Set(); scene.traverse((o) => { for (const m of [].concat(o.material || [])) for (const k in m) { const v = m[k]; if (v && v.isTexture && v.image) tx.add(v); } });
    let n = 0; for (const t of tx) { try { renderer.initTexture(t); } catch (e) { /* segue */ } if (++n % 2 === 0) await folga(); }
    try { renderer.compile(scene, camera); } catch (e) { /* segue */ }
    const gl = renderer.getContext(), ext = gl.getExtension("KHR_parallel_shader_compile");
    if (ext) { const t1 = performance.now(); while (performance.now() - t1 < 20000 && renderer.info.programs.some((p) => !gl.getProgramParameter(p.program, ext.COMPLETION_STATUS_KHR))) await new Promise((r) => setTimeout(r, 40)); } }
  const desenhar = () => { vidroCima.opacity = 0.6 * cl((camera.position.y - 4) / 8); vidroCima.visible = vidroCima.opacity > 0.01; refletir(); renderer.render(scene, camera); };
  const filme = document.getElementById("filme");
  const clock = new T.Clock(); let pronto = false, last = 0;
  function comecarSala(k) { modo = "sala"; aqui = k; const p = pose(k); cam.p.copy(p.p); cam.yaw = p.yaw; cam.pitch = p.pitch; aplicar(cam); ui();
    if (window.Ponte) Ponte.iniciar({ estado, fazer, fechar, rolar: (dy) => { const c = painel.querySelector(".corpo"); if (c) c.scrollBy(0, dy); } }); }
  (async () => {
    resize();
    // o vídeo da chegada começa assim que puder; a galeria carrega por trás
    let videoAcabou = !filme || FILME || Q.has("sala");
    if (filme && !videoAcabou) {
      const fimVideo = () => { videoAcabou = true; };
      filme.addEventListener("ended", fimVideo); filme.addEventListener("error", fimVideo); const ult = filme.querySelector("source:last-of-type"); if (ult) ult.addEventListener("error", fimVideo);
      const tocar = () => filme.play().then(() => { filme.classList.add("on"); setTimeout(() => veu.classList.add("fim"), 60); }).catch(fimVideo);
      if (filme.readyState >= 3) tocar(); else filme.addEventListener("canplay", tocar, { once: true });
      setTimeout(() => { if (!filme.classList.contains("on")) fimVideo(); }, 6000); // se o vídeo não vier, segue sem ele
    }
    await montar(); criarRotulos(); desenharPlanta(); resize();
    chegada(FILME ? 0 : DUR); await prepararGPU(); desenhar();
    if (FILME) { document.body.classList.add("filme"); veu.style.display = "none"; M2.quadro = (t) => { U.uT.value = t; chegada(t); desenhar(); }; window.pavilhaoPronto = true; return; }
    while (!videoAcabou) await new Promise((r) => setTimeout(r, 50));
    comecarSala(Q.has("sala") ? cl(+Q.get("sala") || 0, 0, paradas.length - 1) : 0);
    pronto = true; window.pavilhaoPronto = true; last = clock.getElapsedTime();
    veu.classList.add("fim"); if (filme) { filme.classList.remove("on"); filme.classList.add("sai"); setTimeout(() => filme.remove(), 1200); }
  })();
  function frame() { const t = clock.getElapsedTime(), dt = Math.min(0.1, t - last); last = t;
    if (pronto) { if (saida) { U.uT.value = t; if (saida(t)) saida = null; } else tick(t, dt); desenhar(); } requestAnimationFrame(frame); }
  if (!FILME) frame();
})();
