/* Ato 2: o Pavilhão SESI SENAI, uma feira de ciências. Um galpão de exposição ("Warehouse", de Nicholas-3D, CC BY)
   com um estande por matéria ("EXHIBITION STAND_221001", de fasih.lisan, CC BY, recolorido nas cores do SESI SENAI) e,
   no fundo, o estande maior da Iniciação Científica ("3d exhibition stand 014", de fasih.lisan, CC BY). Banners com os
   logos (SESI e SENAI 2024, Wikimedia Commons, CC BY-SA), tapete azul no corredor e gente visitando ("Lowpoly People 2",
   de Loïc Norgeot, CC BY).
   A chegada é um vídeo (chegada.webm/mp4, gravado desta cena com ?filme): do céu da porta até a frente do pavilhão, pela
   porta, até o primeiro estande; a cena ao vivo assume no mesmo enquadramento.
   Paradas: os cinco estandes (Linguagens, Matemática, Ciências Humanas, Ciências da Natureza, Técnico, alternando os
   lados) e a Iniciação Científica. Da Iniciação, "Entrar na tela" leva ao Ato 3 (a cidade neon). */
(() => {
  const T = THREE, Q = new URLSearchParams(location.search);
  const M2 = (window.PAVILHAO = {});
  const FILME = Q.has("filme");
  const V3 = (x, y, z) => new T.Vector3(x, y, z);
  const canvas = document.getElementById("c");
  const renderer = new T.WebGLRenderer({ canvas, antialias: true, powerPreference: "high-performance", preserveDrawingBuffer: FILME });
  renderer.setPixelRatio(FILME ? 1 : Math.min(devicePixelRatio || 1, 1)); renderer.outputEncoding = T.sRGBEncoding;
  renderer.toneMapping = T.ACESFilmicToneMapping; renderer.toneMappingExposure = 0.92; renderer.debug.checkShaderErrors = Q.has("debug");
  const scene = new T.Scene(), camera = new T.PerspectiveCamera(50, 16 / 9, 0.05, 1500); camera.rotation.order = "YXZ";
  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const tex = (w, h, fn) => { const c = document.createElement("canvas"); c.width = w; c.height = h; fn(c.getContext("2d"), w, h); const t = new T.CanvasTexture(c); t.encoding = T.sRGBEncoding; t.anisotropy = 8; return t; };
  const suave = (u) => (u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2);
  const cl = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
  let semente = 9; const rnd = () => (semente = (semente * 16807) % 2147483647) / 2147483647;
  const U = { uT: { value: 0 }, uDia: { value: 1 } };

  /* ---------- as cores da marca (tiradas dos próprios logos de 2024) ---------- */
  const AZUL = "#0e4194", VERDE = "#68b42d", LARANJA = "#e8490f", CINZA = "#575656";
  const CORES = [LARANJA, AZUL, VERDE, AZUL, LARANJA];

  /* ---------- a planta da feira (o galpão tem 16 m por 46 m; o portão fica em z = 0) ---------- */
  const HX = 8, HL = 46.2, OLHO = 1.6;
  const ESTANDES = [{ lado: -1, z: -8 }, { lado: 1, z: -14 }, { lado: -1, z: -20 }, { lado: 1, z: -26 }, { lado: -1, z: -32 }];
  const IC_Z = -41.4;

  /* ---------- o céu lá fora: começa no céu da porta (noite e horizonte dourado) e vira um fim de tarde ---------- */
  const ceu = new T.Mesh(new T.SphereGeometry(900, 48, 24), new T.ShaderMaterial({ side: T.BackSide, depthWrite: false, fog: false, uniforms: { uT: U.uT, uDia: U.uDia },
    vertexShader: `varying vec3 vD; void main(){ vD = normalize(position); vec4 p = projectionMatrix * modelViewMatrix * vec4(position, 1.); gl_Position = p.xyww; }`,
    fragmentShader: `uniform float uT, uDia; varying vec3 vD; float h(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      void main(){ vec3 d = normalize(vD); float k = clamp(d.y / .75, 0., 1.);
        vec3 n = mix(vec3(1., .86, .63), vec3(.79, .64, .43), smoothstep(0., .08, k)); n = mix(n, vec3(.165, .184, .416), smoothstep(.08, .36, k)); n = mix(n, vec3(.043, .063, .188), smoothstep(.36, .72, k)); n = mix(n, vec3(.02, .03, .086), smoothstep(.72, 1., k));
        vec3 m = mix(vec3(1., .78, .55), vec3(.95, .62, .5), smoothstep(0., .07, k)); m = mix(m, vec3(.42, .45, .72), smoothstep(.07, .4, k)); m = mix(m, vec3(.12, .16, .38), smoothstep(.4, 1., k));
        vec3 c = mix(n, m, uDia);
        vec2 g = vec2(atan(d.z, d.x) * 180., asin(clamp(d.y, -1., 1.)) * 180.); c += step(.9965, h(floor(g))) * smoothstep(.05, .35, d.y) * (1. - uDia * .7) * vec3(.9);
        c = mix(c, vec3(.32, .26, .3), smoothstep(0., -.05, d.y));
        gl_FragColor = vec4(c, 1.); }` }));
  ceu.renderOrder = -10; ceu.frustumCulled = false; scene.add(ceu);
  scene.fog = new T.Fog("#6a5a78", 80, 520);

  /* ---------- luz: o galpão bem iluminado, como uma feira ---------- */
  const hemi = new T.HemisphereLight("#f4f6ff", "#6a6a72", 0.8); scene.add(hemi);
  const sol = new T.DirectionalLight("#ffd8b0", 0.7); sol.position.set(-30, 25, 40); scene.add(sol);
  { const env = new T.Scene(); env.background = new T.Color("#b8bcc4"); const cx = (cor, x, y, z, w, h, d) => { const m = new T.Mesh(new T.BoxGeometry(w, h, d), new T.MeshBasicMaterial({ color: cor })); m.position.set(x, y, z); env.add(m); };
    for (let z = -20; z <= 20; z += 8) cx("#ffffff", 0, 6, z, 12, 0.3, 1); cx("#4a4a52", 0, -4, 0, 40, 0.2, 40);
    const pm = new T.PMREMGenerator(renderer); scene.environment = pm.fromScene(env, 0.02).texture; }

  /* ---------- carregamento ---------- */
  const veu = document.getElementById("veu"), barra = veu.querySelector(".linha i");
  T.DefaultLoadingManager.onProgress = (u, a, b) => { barra.style.width = ((a / Math.max(b, 1)) * 100).toFixed(0) + "%"; };
  const loader = new T.GLTFLoader(); if (window.MeshoptDecoder) loader.setMeshoptDecoder(window.MeshoptDecoder);
  const carregar = (u) => new Promise((ok) => loader.load(u, (g) => ok(g.scene), undefined, () => ok(null)));
  const imagem = (u) => new Promise((ok) => { const im = new Image(); im.onload = () => ok(im); im.onerror = () => ok(null); im.src = u; });
  // troca o vermelho de uma textura por outra cor, mantendo o claro e o escuro (os estandes vêm vermelhos)
  function recolorir(t, cor) { if (!t || !t.image) return t; const im = t.image, c = document.createElement("canvas"); c.width = im.width; c.height = im.height; const g = c.getContext("2d"); g.drawImage(im, 0, 0);
    const d = g.getImageData(0, 0, c.width, c.height), a = d.data, k = new T.Color(cor);
    for (let i = 0; i < a.length; i += 4) { const r = a[i], gg = a[i + 1], b = a[i + 2]; const ver = r - Math.max(gg, b); if (ver > 40) { const f = Math.min(1, ver / 120), l = r / 255; a[i] = a[i] * (1 - f) + k.r * 255 * l * f * 1.1; a[i + 1] = gg * (1 - f) + k.g * 255 * l * f * 1.1; a[i + 2] = b * (1 - f) + k.b * 255 * l * f * 1.1; } }
    g.putImageData(d, 0, 0); const nt = new T.CanvasTexture(c); nt.encoding = T.sRGBEncoding; nt.flipY = t.flipY; nt.wrapS = t.wrapS; nt.wrapT = t.wrapT; nt.repeat.copy(t.repeat); nt.offset.copy(t.offset); nt.anisotropy = 8; return nt; }

  /* ---------- os textos da Iniciação Científica: as palavras do Fernando (do texto de agradecimentos) ---------- */
  function textosIC() { const ag = (window.TEXTOS_NEON && window.TEXTOS_NEON.agradecimentos) || []; const out = { ic: [], wagner: "", equipe: [] };
    let dentro = false; for (const [k, v] of ag) { if (k === "h") { dentro = /Inicia/.test(v); continue; } if (/^Ao professor Wagner/.test(v)) out.wagner = v; if (dentro) (/^(Um agradecimento|Também gostaria)/.test(v) ? out.equipe : out.ic).push(v); }
    return out; }

  /* ---------- peças desenhadas no canvas: faixas, placas, cartazes ---------- */
  let LOGO = { sesi: null, senai: null };
  const logoEm = (c, im, x, y, h) => { if (!im) return 0; const w = (im.width / im.height) * h; c.drawImage(im, x, y, w, h); return w; };
  function faixaTopo(nome, num, cor) { return tex(2400, 132, (c, w, h) => { c.fillStyle = "#ffffff"; c.fillRect(0, 0, w, h); c.fillStyle = cor; c.fillRect(0, h - 12, w, 12);
      logoEm(c, LOGO.sesi, 30, 14, h - 36); const ws = LOGO.senai ? (LOGO.senai.width / LOGO.senai.height) * (h - 36) : 0; logoEm(c, LOGO.senai, w - 30 - ws, 14, h - 36);
      c.textAlign = "center"; c.textBaseline = "middle"; c.fillStyle = cor; c.font = "800 70px Archivo, sans-serif"; c.fillText(nome.toUpperCase(), w / 2, h / 2 - 4);
      const larg = c.measureText(nome.toUpperCase()).width; c.fillStyle = CINZA; c.font = "600 34px Archivo, sans-serif"; c.textAlign = "right"; c.fillText(num, w / 2 - larg / 2 - 30, h / 2 - 2); }); }
  function balcao(nome, sigla, cor) { return tex(600, 220, (c, w, h) => { c.fillStyle = cor; c.fillRect(0, 0, w, h); c.fillStyle = "#ffffff"; c.textAlign = "center"; c.textBaseline = "middle";
      c.font = "800 64px Archivo, sans-serif"; c.fillText(sigla, w / 2, h * 0.42); c.font = "600 28px Archivo, sans-serif"; c.fillText(nome, w / 2, h * 0.75); }); }
  function placaSuspensa(nome, num, cor) { return tex(1024, 300, (c, w, h) => { c.fillStyle = cor; c.fillRect(0, 0, w, h); c.fillStyle = "#ffffff"; c.textAlign = "center"; c.textBaseline = "middle";
      c.font = "600 40px Archivo, sans-serif"; c.fillText(num, w / 2, 70); c.font = "800 104px Archivo, sans-serif"; let fs = 104; while (c.measureText(nome).width > w - 60 && fs > 40) { fs -= 6; c.font = `800 ${fs}px Archivo, sans-serif`; } c.fillText(nome, w / 2, 180); }); }
  function quebrar(c, t, max) { const ps = String(t).split(/\s+/), out = []; let l = ""; for (const p of ps) { const x = l ? l + " " + p : p; if (c.measureText(x).width > max && l) { out.push(l); l = p; } else l = x; } if (l) out.push(l); return out; }
  // o cartaz de uma atividade: a imagem à esquerda (ou uma forma na cor da matéria) e o título à direita
  function cartaz(mat, at, j, cor, img) { return tex(1380, 570, (c, w, h) => { c.fillStyle = "#ffffff"; c.fillRect(0, 0, w, h);
      const iw = Math.round(w * 0.46);
      if (img) { const s = Math.max(iw / img.width, h / img.height); c.save(); c.beginPath(); c.rect(0, 0, iw, h); c.clip(); c.drawImage(img, (iw - img.width * s) / 2, (h - img.height * s) / 2, img.width * s, img.height * s); c.restore(); }
      else { c.fillStyle = cor; c.fillRect(0, 0, iw, h); c.fillStyle = "rgba(255,255,255,.18)"; for (let i = 0; i < 6; i++) { c.beginPath(); c.arc(iw * (0.2 + (i % 3) * 0.3), h * (0.3 + Math.floor(i / 3) * 0.4), 40 + i * 12, 0, 7); c.fill(); }
        c.fillStyle = "#ffffff"; c.font = "800 150px Archivo, sans-serif"; c.textAlign = "center"; c.textBaseline = "middle"; c.fillText(String(j + 1).padStart(2, "0"), iw / 2, h / 2); c.textAlign = "left"; }
      c.fillStyle = cor; c.fillRect(iw, 0, 14, h);
      c.fillStyle = CINZA; c.font = "600 30px Archivo, sans-serif"; c.textBaseline = "alphabetic"; c.fillText(`${(mat.nome || "").toUpperCase()} · ATIVIDADE ${j + 1}`, iw + 60, 90);
      let fs = 74; c.font = `800 ${fs}px Archivo, sans-serif`; let ls = quebrar(c, at.titulo || "", w - iw - 110); while (ls.length > 3 && fs > 40) { fs -= 6; c.font = `800 ${fs}px Archivo, sans-serif`; ls = quebrar(c, at.titulo || "", w - iw - 110); }
      c.fillStyle = "#16203f"; ls.slice(0, 3).forEach((l, i) => c.fillText(l, iw + 60, 190 + i * fs * 1.05));
      if (at.subtitulo) { c.fillStyle = CINZA; c.font = "500 32px Archivo, sans-serif"; quebrar(c, at.subtitulo, w - iw - 110).slice(0, 2).forEach((l, i) => c.fillText(l, iw + 60, 200 + ls.slice(0, 3).length * fs * 1.05 + i * 40)); }
      c.fillStyle = cor; c.font = "700 30px Archivo, sans-serif"; c.fillText("Toque para abrir  →", iw + 60, h - 50); }); }
  function banner(txt) { return tex(1800, 330, (c, w, h) => { c.fillStyle = "#ffffff"; c.fillRect(0, 0, w, h); c.fillStyle = AZUL; c.fillRect(0, 0, w, 16); c.fillStyle = VERDE; c.fillRect(0, h - 16, w * 0.5, 16); c.fillStyle = LARANJA; c.fillRect(w * 0.5, h - 16, w * 0.5, 16);
      const hl = 120, ws = logoEm(c, LOGO.sesi, 60, (h - hl) / 2, hl); const wn = LOGO.senai ? (LOGO.senai.width / LOGO.senai.height) * hl : 0; logoEm(c, LOGO.senai, w - 60 - wn, (h - hl) / 2, hl);
      const livre = w - 120 - ws - wn - 80; let fs = 76; c.font = `800 ${fs}px Archivo, sans-serif`; while (c.measureText(txt).width > livre && fs > 30) { fs -= 4; c.font = `800 ${fs}px Archivo, sans-serif`; }
      c.fillStyle = AZUL; c.textAlign = "center"; c.textBaseline = "middle"; c.fillText(txt, (60 + ws + w - 60 - wn) / 2, h / 2 + 4); }); }

  /* ---------- montar a feira ---------- */
  const alvos = [], paradas = [], telas = [];
  let telaIC = null, dados = { materias: [] }, IC = textosIC();
  async function montar() {
    const [galpao, est, icm, gente, d, sesi, senai] = await Promise.all([carregar("/pavilhao/feira/galpao.glb"), carregar("/pavilhao/feira/estande.glb"), carregar("/pavilhao/feira/ic.glb"), carregar("/pavilhao/feira/gente.glb"),
      fetch("/pavilhao/atividades.json").then((r) => r.json()).catch(() => ({ materias: [] })), imagem("/pavilhao/img/sesi.png"), imagem("/pavilhao/img/senai.png"),
      document.fonts ? Promise.all(["800 80px Archivo", "700 40px Archivo", "500 30px Archivo"].map((f) => document.fonts.load(f).catch(() => 0))) : 0]);
    dados = d || dados; LOGO = { sesi, senai }; IC = textosIC();
    // o galpão: estrutura clara, piso de feira, luzes acesas
    if (galpao) { galpao.position.set(-HX, 0, 0); galpao.traverse((o) => { if (!o.isMesh) return; const n = o.material.name;
        if (n === "Metal") { o.material = new T.MeshStandardMaterial({ color: "#c9ced6", roughness: 0.55, metalness: 0.3, map: o.material.map || null }); }
        if (n === "Emissive") { o.material = new T.MeshBasicMaterial({ color: new T.Color(2.2, 2.2, 2.1) }); }
        if (n === "WetConcrete") { o.material = new T.MeshStandardMaterial({ color: "#868a92", roughness: 0.4, metalness: 0.0, envMapIntensity: 0.45 }); } });
      scene.add(galpao); }
    // o tapete do corredor (azul, com as bordas verde e laranja da marca) e o chão lá fora
    const tapete = new T.Mesh(new T.PlaneGeometry(3.4, HL - 4), new T.MeshStandardMaterial({ map: tex(128, 2048, (c, w, h) => { c.fillStyle = "#123a7e"; c.fillRect(0, 0, w, h); for (let i = 0; i < 9000; i++) { c.fillStyle = `rgba(255,255,255,${Math.random() * 0.05})`; c.fillRect(Math.random() * w, Math.random() * h, 1, 2); } c.fillStyle = VERDE; c.fillRect(0, 0, 5, h); c.fillStyle = LARANJA; c.fillRect(w - 5, 0, 5, h); }), color: "#c8d0e0", roughness: 1 }));
    tapete.rotation.x = -Math.PI / 2; tapete.position.set(0, 0.006, -HL / 2 + 1); scene.add(tapete);
    const praca = new T.Mesh(new T.PlaneGeometry(400, 400), new T.MeshStandardMaterial({ color: "#1c1c22", roughness: 0.8, envMapIntensity: 0.2 })); praca.rotation.x = -Math.PI / 2; praca.position.set(0, -0.02, 150); scene.add(praca);
    // os cinco estandes
    const mats = (dados.materias || []).slice(0, 5);
    for (const [k, mat] of mats.entries()) await estande(est, mat, k);
    // a Iniciação Científica
    await estandeIC(icm);
    // banners suspensos sobre o corredor, bandeiras e o totem da entrada
    for (const z of [-4, -17, -30]) for (const s of [1, -1]) { const b = new T.Mesh(new T.PlaneGeometry(6, 1.1), new T.MeshBasicMaterial({ map: banner("Pavilhão SESI SENAI"), toneMapped: true, side: T.FrontSide })); b.position.set(0, 4.15, z - s * 0.01); b.rotation.y = s > 0 ? 0 : Math.PI; scene.add(b); }
    for (const [x, z, cor] of [[-2.2, -2, AZUL], [2.2, -2, VERDE], [-4.4, -36.5, LARANJA], [4.4, -36.5, AZUL]]) { const g = new T.Group(); const pau = new T.Mesh(new T.CylinderGeometry(0.03, 0.03, 3.1, 8), new T.MeshStandardMaterial({ color: "#9aa0a8", metalness: 0.7, roughness: 0.4 })); pau.position.y = 1.55; g.add(pau);
      const pano = new T.Mesh(new T.PlaneGeometry(0.75, 2.4), new T.MeshStandardMaterial({ map: tex(240, 768, (c, w, h) => { c.fillStyle = cor; c.fillRect(0, 0, w, h); c.fillStyle = "#ffffff"; c.fillRect(16, 30, w - 32, 140); logoEm(c, x < 0 ? LOGO.sesi : LOGO.senai, 24, 64, 60); c.save(); c.translate(w / 2, h * 0.62); c.rotate(-Math.PI / 2); c.fillStyle = "#ffffff"; c.font = "800 70px Archivo, sans-serif"; c.textAlign = "center"; c.textBaseline = "middle"; c.fillText(x < 0 ? "SESI" : "SENAI", 0, 0); c.restore(); }), side: T.DoubleSide, roughness: 0.9 }));
      pano.position.set(0.39, 1.85, 0); g.add(pano); g.position.set(x, 0, z); g.rotation.y = x < 0 ? -0.5 : Math.PI + 0.5; scene.add(g); }
    // a fachada: o nome do pavilhão em cima do portão, os logos e luzes
    { const f = new T.Mesh(new T.PlaneGeometry(11, 2.0), new T.MeshBasicMaterial({ map: banner("Pavilhão SESI SENAI"), toneMapped: false, color: new T.Color(1.15, 1.15, 1.15) })); f.position.set(0, 4.05, 0.08); scene.add(f);
      for (const x of [-6.6, 6.6]) { const p = new T.PointLight("#ffe2c0", 1.4, 14, 2); p.position.set(x, 3.5, 2.5); scene.add(p); } }
    // gente visitando a feira
    if (gente) pessoas(gente);
  }
  async function estande(modelo, mat, k) {
    if (!modelo) return; const E = ESTANDES[k], cor = CORES[k], g = modelo.clone(true);
    g.traverse((o) => { if (!o.isMesh) return; const n = o.material.name;
      if (/Text00|web_panel|panel_poster/.test(n)) { o.visible = false; return; }
      if (/white_contruction|Floor_red|backwall_image|MH_lamp|led_strip/.test(n)) { const m = o.material.clone(); if (m.map) m.map = recolorir(m.map, cor); if (m.emissiveMap) m.emissiveMap = recolorir(m.emissiveMap, cor); if (/Floor_red/.test(n)) { m.map = null; m.emissiveMap = null; m.color = new T.Color(cor).multiplyScalar(0.55); m.roughness = 0.95; } o.material = m; }
      if (n === "material") o.userData.tela = true; });
    const x = E.lado * (HX - 1.75); g.position.set(x, 0, E.z); g.rotation.y = -E.lado * Math.PI / 2; scene.add(g);
    const st = { mat, k, E, cor, quadros: [], grupo: g }; paradas[k] = st; mat.cor = cor;
    const em = (obj, lx, ly, lz) => { obj.position.set(lx, ly, lz); g.add(obj); return obj; };
    // a faixa de cima com os logos e o nome, o balcão e a placa suspensa
    em(new T.Mesh(new T.PlaneGeometry(9.4, 0.52), new T.MeshBasicMaterial({ map: faixaTopo(mat.nome || "", String(k + 1).padStart(2, "0"), cor), toneMapped: false })), 0, 3.42, -1.405);
    em(new T.Mesh(new T.PlaneGeometry(1.5, 0.55), new T.MeshBasicMaterial({ map: balcao(mat.nome || "", mat.sigla || "", cor) })), 0, 0.62, 1.645);
    { const pl = new T.Mesh(new T.BoxGeometry(3.2, 0.95, 0.12), new T.MeshBasicMaterial({ map: placaSuspensa(mat.nome || "", String(k + 1).padStart(2, "0") + " · " + (mat.sigla || ""), cor) })); em(pl, 0, 4.55, 0.2);
      for (const s of [-1, 1]) { const fio = new T.Mesh(new T.CylinderGeometry(0.006, 0.006, 0.6, 4), new T.MeshBasicMaterial({ color: "#555" })); em(fio, s * 1.3, 5.2, 0.2); } }
    // os dois cartazes das atividades, na parede do fundo
    const acts = (mat.atividades || []).slice(0, 2);
    for (const [j, at] of acts.entries()) { const img = at.imagem ? await imagem(at.imagem) : null;
      const p = new T.Mesh(new T.PlaneGeometry(2.7, 1.12), new T.MeshBasicMaterial({ map: cartaz(mat, at, j, cor, img) })); em(p, j ? 2.65 : -2.65, 2.5, -1.4);
      const a = { obj: p, mat, at, k, j, nome: at.titulo, img }; alvos.push(a); st.quadros[j] = a; }
    // a TV do meio alterna as duas atividades
    let telaM = null; g.traverse((o) => { if (o.userData.tela) telaM = o; });
    if (telaM) { const ims = st.quadros.map((a) => (a.img ? cartazTV(a.img) : cartazTV(null, mat, a.j, cor))); telaM.material = new T.MeshBasicMaterial({ map: ims[0], toneMapped: false }); telas.push({ m: telaM.material, ims, fase: k * 1.7 }); }
  }
  const cartazTV = (img, mat, j, cor) => tex(640, 420, (c, w, h) => { c.fillStyle = "#0b1230"; c.fillRect(0, 0, w, h);
    if (img) { const s = Math.max(w / img.width, h / img.height); c.drawImage(img, (w - img.width * s) / 2, (h - img.height * s) / 2, img.width * s, img.height * s); }
    else { c.fillStyle = cor; c.fillRect(0, 0, w, h); c.fillStyle = "#fff"; c.textAlign = "center"; c.textBaseline = "middle"; c.font = "800 120px Archivo, sans-serif"; c.fillText(mat.sigla || "", w / 2, h * 0.42); c.font = "600 44px Archivo, sans-serif"; c.fillText("atividade " + (j + 1), w / 2, h * 0.72); } });
  async function estandeIC(modelo) {
    const st = { mat: { id: "iniciacao", nome: "Iniciação Científica", sigla: "IC", cor: AZUL }, k: 5, ic: true, quadros: [] }; paradas[5] = st;
    if (modelo) { modelo.scale.setScalar(0.0125); modelo.position.set(-0.6, 0, IC_Z); scene.add(modelo);
      modelo.traverse((o) => { if (!o.isMesh) return; const n = o.material.name; if (/illuminate_logo|cropping_logo|croopping_logo|Object002|poster_mtl/.test(n)) o.visible = false; if (/Object174/.test(n)) telaIC = o; }); }
    const g = new T.Group(); g.position.set(0, 0, IC_Z); scene.add(g);
    // o título grande, por cima do estande
    const tit = new T.Mesh(new T.PlaneGeometry(6.4, 1.35), new T.MeshBasicMaterial({ map: tex(2328, 491, (c, w, h) => { c.fillStyle = AZUL; c.fillRect(0, 0, w, h); c.fillStyle = VERDE; c.fillRect(0, h - 22, w, 22);
        c.fillStyle = "#ffffff"; c.textAlign = "center"; c.textBaseline = "middle"; c.font = "800 120px Archivo, sans-serif"; c.font = "800 150px Archivo, sans-serif"; c.fillText("INICIAÇÃO CIENTÍFICA", w / 2, h * 0.42, w - 60); c.font = "600 50px Archivo, sans-serif"; c.fillText("em Matemática · Colégio SESI de Florianópolis", w / 2, h * 0.8); }), toneMapped: false }));
    tit.position.set(-1.0, 4.05, 1.48); g.add(tit);
    // o painel grande com as palavras do Fernando sobre o que a Iniciação significou
    const frase = (IC.ic[0] || "").split(/(?<=\.)\s+/).slice(0, 2).join(" ");
    const painelIC = new T.Mesh(new T.PlaneGeometry(4.3, 2.5), new T.MeshBasicMaterial({ map: tex(1720, 1000, (c, w, h) => { c.fillStyle = "#ffffff"; c.fillRect(0, 0, w, h); c.fillStyle = AZUL; c.fillRect(0, 0, 18, h);
        logoEm(c, LOGO.sesi, 70, 50, 90); c.fillStyle = VERDE; c.font = "700 40px Archivo, sans-serif"; c.textBaseline = "alphabetic"; c.fillText("O QUE A INICIAÇÃO CIENTÍFICA SIGNIFICOU PARA MIM", 70, 210);
        c.fillStyle = "#16203f"; c.font = "500 60px Archivo, sans-serif"; quebrar(c, frase, w - 140).slice(0, 8).forEach((l, i) => c.fillText(l, 70, 300 + i * 78));
        c.fillStyle = AZUL; c.font = "700 38px Archivo, sans-serif"; c.fillText("Toque para ler tudo  →", 70, h - 50); }) }));
    painelIC.position.set(-1.45, 1.9, -1.3); g.add(painelIC);
    // o logo do SENAI na torre, em cima da TV (cobre o logo de exemplo do modelo)
    { const lg = new T.Mesh(new T.PlaneGeometry(1.5, 0.42), new T.MeshBasicMaterial({ map: tex(600, 168, (c, w, h) => { c.fillStyle = "#ffffff"; c.fillRect(0, 0, w, h); logoEm(c, LOGO.senai, 20, 14, h - 28); }) })); lg.position.set(2.15, 3.0, 0.14); g.add(lg); }
    const a = { obj: painelIC, mat: st.mat, at: { titulo: "Iniciação Científica em Matemática" }, k: 5, j: 0, nome: "Iniciação Científica", ic: true }; alvos.push(a); st.quadros[0] = a;
    // a tela da TV: é por ela que se entra no futuro
    if (telaIC) telaIC.material = new T.MeshBasicMaterial({ map: tex(640, 400, (c, w, h) => { const gr = c.createLinearGradient(0, 0, w, h); gr.addColorStop(0, "#1a0640"); gr.addColorStop(1, "#0b3a7a"); c.fillStyle = gr; c.fillRect(0, 0, w, h);
      c.fillStyle = "#5fe3ff"; c.font = "800 72px Archivo, sans-serif"; c.textAlign = "center"; c.textBaseline = "middle"; c.fillText("O FUTURO", w / 2, h * 0.45); c.fillStyle = "#ff4fb0"; c.font = "600 34px Archivo, sans-serif"; c.fillText("entrar na tela →", w / 2, h * 0.72); }), toneMapped: false });
  }
  // gente: as seis pessoas do pacote (as versões com textura), espalhadas diante dos estandes e no corredor
  function pessoas(pack) {
    pack.updateMatrixWorld(true); const tipos = new Map();
    pack.traverse((o) => { if (!o.isMesh || !o.material.map) return; const id = o.name.slice(0, 2); if (tipos.has(id)) return; const bb = new T.Box3().setFromObject(o); tipos.set(id, { o, bb }); });
    const lista = [...tipos.values()]; if (!lista.length) return;
    const pos = []; for (const [k, E] of ESTANDES.entries()) for (let i = 0; i < 4; i++) { const lado = i % 2 ? 1 : -1, dz = lado * (2.2 + rnd() * 2.4), olha = rnd() < 0.75;
      pos.push([E.lado * (3.6 + rnd() * 1.6), E.z + dz, olha ? (E.lado < 0 ? -Math.PI / 2 : Math.PI / 2) + (rnd() - 0.5) * 0.9 : rnd() * Math.PI * 2]); }
    for (let i = 0; i < 5; i++) { const lado = i % 2 ? 1 : -1; pos.push([lado * (3.4 + rnd() * 1.3), IC_Z + 2.6 + rnd() * 2.5, Math.PI + (rnd() - 0.5) * 0.9]); }
    for (const [i, [x, z, ry]] of pos.entries()) { if (Math.abs(x) < 1.3) continue; const t = lista[(i * 5 + 2) % lista.length], c = t.bb.getCenter(new T.Vector3()), s = (1.6 + rnd() * 0.25) / (t.bb.max.y - t.bb.min.y);
      const p = new T.Mesh(t.o.geometry, t.o.material); p.matrixAutoUpdate = false; const M = new T.Matrix4().makeTranslation(-c.x, -t.bb.min.y, -c.z).premultiply(new T.Matrix4().makeScale(s, s, s)).premultiply(new T.Matrix4().makeRotationY(ry)).premultiply(new T.Matrix4().makeTranslation(x, 0, z));
      p.matrix.copy(M.multiply(t.o.matrixWorld)); scene.add(p); }
  }

  /* ---------- a câmera: no corredor; de um estande ao outro, gira e anda poucos metros ---------- */
  function pose(k) { const hf = 2 * Math.atan(Math.tan((camera.fov * Math.PI) / 360) * camera.aspect);
    if (k === 5) { const d = cl(12.5 / (2 * Math.tan(hf / 2)), 7.4, 16); return { p: V3(-0.4, OLHO, IC_Z + 1.5 + d), yaw: 0, pitch: 0.07 }; }
    const E = ESTANDES[k], fundo = E.lado * (HX - 1.75 - 1.47), d = cl(10 / (2 * Math.tan(hf / 2)), 6.2, 13); return { p: V3(fundo - E.lado * d, OLHO, E.z), yaw: -E.lado * Math.PI / 2, pitch: 0.03 }; }
  let modo = "chegada", aqui = -1, mov = null, mx = 0, my = 0;
  const cam = { p: V3(), yaw: 0, pitch: 0 };
  const aplicar = (c) => { camera.position.copy(c.p); camera.rotation.set(c.pitch, c.yaw, 0); };
  addEventListener("pointermove", (e) => { if (e.pointerType === "mouse") { mx = e.clientX / innerWidth - 0.5; my = e.clientY / innerHeight - 0.5; } });
  function irSala(k) { if (!paradas[k] || mov || modo !== "sala" || k === aqui) return; fechar(); const de = { p: cam.p.clone(), yaw: cam.yaw, pitch: cam.pitch }, para = pose(k);
    // o giro passa por "olhando o corredor" (giro 0), como quem anda pela feira
    let dy = para.yaw - de.yaw; if (Math.abs(dy) > Math.PI * 0.75) dy = para.yaw - de.yaw;
    const meio = de.p.clone().lerp(para.p, 0.5); meio.x *= 0.3;
    mov = { de, para, dy, curva: new T.QuadraticBezierCurve3(de.p, meio, para.p), t: null, dur: 1.0 + Math.min(0.8, de.p.distanceTo(para.p) * 0.09) + Math.abs(dy) * 0.22, fim: () => { aqui = k; ui(); } }; modo = "andando"; ui(); }
  M2.irSala = irSala;
  M2.olhar = (x, y, z, yaw, pitch) => { modo = "teste"; cam.p.set(x, y, z); cam.yaw = yaw; cam.pitch = pitch; aplicar(cam); ui(); }; // para os testes
  function tick(t, dt) {
    if (mov) { if (mov.t == null) mov.t = t; const u = Math.min(1, (t - mov.t) / mov.dur), e = 0.5 - 0.5 * Math.cos(Math.PI * u);
      mov.curva.getPoint(e, cam.p); cam.yaw = mov.de.yaw + mov.dy * e; cam.pitch = mov.de.pitch + (mov.para.pitch - mov.de.pitch) * e;
      if (u >= 1) { const f = mov.fim; mov = null; modo = "sala"; f(); } aplicar(cam); }
    else if (modo === "sala" && aqui >= 0) { const p = pose(aqui), k = 1 - Math.exp(-dt * 3); cam.p.lerp(p.p, k); cam.yaw += (p.yaw - mx * 0.06 - cam.yaw) * k; cam.pitch += (p.pitch - my * 0.04 - cam.pitch) * k; aplicar(cam); }
    U.uT.value = t;
    for (const tv of telas) { const i = Math.floor((t + tv.fase) / 4.5) % tv.ims.length; if (tv.m.map !== tv.ims[i]) { tv.m.map = tv.ims[i]; tv.m.needsUpdate = true; } }
    rotulos();
  }

  /* ---------- a chegada (é o que o vídeo mostra): do céu da porta até a frente do pavilhão e pela porta ---------- */
  const DUR = 5.4;
  const QUADROS = [ // tempo, posição, giro, inclinação, dia
    [0.0, V3(0, 34, 70), 0, 0.46, 0],
    [1.2, V3(0, 30, 62), 0, 0.05, 0.35],
    [2.5, V3(0.6, 10, 26), 0, -0.22, 0.9],
    [3.6, V3(0, 2.4, 4.5), 0, -0.02, 1],
    [4.3, V3(0.3, 1.8, -2.5), 0.4, -0.03, 1],
    [5.4, null, null, null, 1],
  ];
  let curvaChegada = null; const suaveLeve = (u) => u * u * (3 - 2 * u) * 0.5 + u * 0.5;
  function chegada(t) { const fim = pose(0); const qs = QUADROS.map((q) => (q[1] ? q : [q[0], fim.p, fim.yaw, fim.pitch, q[4]]));
    if (!curvaChegada) curvaChegada = new T.CatmullRomCurve3(qs.map((q) => q[1].clone()), false, "centripetal");
    let i = 0; while (i < qs.length - 2 && t > qs[i + 1][0]) i++; const a = qs[i], b = qs[i + 1], u = cl((t - a[0]) / (b[0] - a[0])), e = suave(u);
    curvaChegada.getPoint(cl((i + suaveLeve(u)) / (qs.length - 1)), cam.p); cam.yaw = a[2] + (b[2] - a[2]) * e; cam.pitch = a[3] + (b[3] - a[3]) * e; U.uDia.value = a[4] + (b[4] - a[4]) * e; aplicar(cam); }
  M2.DUR = DUR;
  // passar pelo portão fechado: bem perto dele, um plano de corte tira a parede da frente
  const corte = new T.Plane(V3(0, 0, -1), -0.2);
  function cortar() { const z = camera.position.z; renderer.clippingPlanes = z < 1.6 && z > -0.3 ? [corte] : []; }

  /* ---------- os botões "Abrir", o índice e o painel ---------- */
  const camada = document.getElementById("rotulos"), pv = new T.Vector3();
  const rots = []; function criarRotulos() { for (const a of alvos) { const b = document.createElement("button"); b.type = "button"; b.className = "rot"; b.textContent = a.ic ? "Ler" : "Abrir"; b.setAttribute("aria-label", "Abrir: " + a.nome); b.addEventListener("click", () => abrir(a)); camada.appendChild(b); rots.push({ a, b }); } }
  function rotulos() { for (const r of rots) { const h = r.a.obj.geometry.parameters.height; r.a.obj.localToWorld(pv.set(0, -h / 2 - 0.08, 0)); pv.project(camera);
      const ver = modo === "sala" && aqui === r.a.k && !mov && pv.z < 1 && Math.abs(pv.x) < 1 && Math.abs(pv.y) < 1 && !aberto;
      r.b.style.transform = `translate(${((pv.x * 0.5 + 0.5) * innerWidth).toFixed(1)}px, ${((-pv.y * 0.5 + 0.5) * innerHeight).toFixed(1)}px) translate(-50%, 0)`; r.b.classList.toggle("on", ver); } }
  const planta = document.getElementById("planta"), nomeSala = document.getElementById("sala"), telaBtn = document.getElementById("tela");
  function desenharPlanta() {
    planta.innerHTML = `<span class="tit">Pavilhão SESI SENAI</span><ol>${paradas.map((s, k) => `<li><button type="button" data-k="${k}" style="--cor:${esc(s.mat.cor || AZUL)}"><i>${String(k + 1).padStart(2, "0")}</i>${esc(s.mat.nome)}</button></li>`).join("")}</ol>`;
    planta.querySelectorAll("[data-k]").forEach((el) => el.addEventListener("click", () => irSala(+el.dataset.k)));
  }
  function ui() { const s = paradas[aqui];
    nomeSala.textContent = s ? `${s.mat.nome}, ${aqui + 1} de ${paradas.length}` : "";
    planta.querySelectorAll("[data-k]").forEach((el) => el.classList.toggle("on", +el.dataset.k === aqui));
    telaBtn.classList.toggle("on", !!s && !!s.ic && modo === "sala");
    if (s && (s.ic || aqui >= 4) && !ui.pre) { ui.pre = true; for (const u of ["/neon/", "/neon/neon.js", "/neon/modelos/rua.glb", "/neon/modelos/torres.glb"]) { const l = document.createElement("link"); l.rel = "prefetch"; l.href = u; document.head.appendChild(l); } }
    document.body.classList.toggle("chegando", modo === "chegada" || modo === "saindo"); }
  const painel = document.getElementById("painel"); let aberto = null;
  function abrir(a) { if (modo !== "sala") return; aberto = a; const at = a.at, cor = a.mat.cor || AZUL, vazio = `<p class="breve">Em breve.</p>`;
    painel.style.setProperty("--cor", cor);
    if (a.ic) { const ps = (v) => v.map((x) => `<p>${esc(x)}</p>`).join("");
      painel.querySelector(".vidro").innerHTML = `<button class="x" type="button" aria-label="Fechar">×</button>
        <div class="cab"><span>06 · Pavilhão SESI SENAI</span><h2>Iniciação Científica em Matemática</h2><p class="sub">Colégio SESI de Florianópolis</p></div>
        <div class="corpo"><h4>O que a Iniciação significou para mim</h4>${ps(IC.ic) || vazio}<h4>O que aprendi com o professor Wagner</h4>${IC.wagner ? `<p>${esc(IC.wagner)}</p>` : vazio}<h4>A equipe</h4>${ps(IC.equipe) || vazio}</div>`; }
    else { const sec = (t, v) => `<h4>${t}</h4>${v ? `<p>${esc(v)}</p>` : vazio}`;
      const comp = (at.competencias || []).map(([c, d]) => `<li><b>${esc(c)}</b>${esc(d)}</li>`).join("");
      const links = (at.links || []).map(([n, u]) => `<a href="${esc(/^https?:\/\//.test(u) ? u : "#")}" target="_blank" rel="noopener">${esc(n)}</a>`).join("");
      painel.querySelector(".vidro").innerHTML = `<button class="x" type="button" aria-label="Fechar">×</button>
        <div class="cab"><span>${String(a.k + 1).padStart(2, "0")} · ${esc(a.mat.nome)} · atividade ${a.j + 1} de 2</span><h2>${esc(at.titulo)}</h2>${at.subtitulo ? `<p class="sub">${esc(at.subtitulo)}</p>` : ""}</div>
        <div class="corpo">${at.imagem ? `<img src="${esc(at.imagem)}" alt="">` : ""}${sec("Contexto", at.contexto)}${sec("O que aprendi", at.aprendizagens)}${sec("Por que é importante", at.importancia)}
        <h4>Competências</h4>${comp ? `<ul>${comp}</ul>` : vazio}${links ? `<div class="links">${links}</div>` : ""}${at.creditos ? `<p class="cred">${esc(at.creditos)}</p>` : ""}</div>`; }
    painel.querySelector(".x").onclick = fechar; painel.classList.add("on"); painel.setAttribute("aria-hidden", "false"); setTimeout(() => painel.querySelector(".x").focus({ preventScroll: true }), 50); }
  function fechar() { if (!aberto) return; aberto = null; painel.classList.remove("on"); painel.setAttribute("aria-hidden", "true"); }
  painel.addEventListener("click", (e) => { if (e.target === painel) fechar(); });
  addEventListener("keydown", (e) => { if (e.key === "Escape") return fechar(); if (aberto || modo !== "sala") return; const n = paradas.length;
    if (["ArrowRight", "ArrowDown", "PageDown"].includes(e.key)) irSala(Math.min(n - 1, aqui + 1)); else if (["ArrowLeft", "ArrowUp", "PageUp"].includes(e.key)) irSala(Math.max(0, aqui - 1)); });
  const rc = new T.Raycaster(), pt = new T.Vector2(); let down = null;
  const acertar = (e) => { pt.set((e.clientX / innerWidth) * 2 - 1, -(e.clientY / innerHeight) * 2 + 1); rc.setFromCamera(pt, camera); let melhor = null, dm = 1e9;
    for (const a of alvos) { const h = rc.intersectObject(a.obj, true)[0]; if (h && h.distance < dm) { dm = h.distance; melhor = a; } } return melhor; };
  canvas.addEventListener("pointerdown", (e) => { down = [e.clientX, e.clientY]; });
  canvas.addEventListener("pointermove", (e) => { if (e.pointerType === "mouse" && modo === "sala") canvas.style.cursor = acertar(e) ? "pointer" : ""; });
  canvas.addEventListener("pointerup", (e) => { if (!down || Math.hypot(e.clientX - down[0], e.clientY - down[1]) > 10 || modo !== "sala") return; const a = acertar(e); if (a) { if (a.k !== aqui) irSala(a.k); else abrir(a); } });

  /* ---------- da Iniciação para o futuro: a câmera entra na tela e os pixels caem ---------- */
  const pix = document.getElementById("pixels"); let saida = null;
  function atravessar() { if (modo !== "sala" || !paradas[aqui] || !paradas[aqui].ic) return; fechar(); modo = "saindo"; ui(); for (const r of rots) r.b.classList.remove("on");
    const alvo = V3(); if (telaIC) { telaIC.updateMatrixWorld(true); new T.Box3().setFromObject(telaIC).getCenter(alvo); } else alvo.set(1.6, 1.8, IC_Z);
    const de = cam.p.clone(), y0 = cam.yaw, p0 = cam.pitch, para = alvo.clone().add(V3(0, 0, 0.35)); let acc = 0;
    saida = (t, dt) => { acc += Math.min(dt, 0.05); const u = Math.min(1, acc / 2.4), e = suave(u);
      cam.p.copy(de).lerp(para, e); const dx = alvo.x - cam.p.x, dz = alvo.z - cam.p.z; const yw = Math.atan2(-dx, -dz); cam.yaw = y0 + (yw - y0) * Math.min(1, e * 1.6); cam.pitch = p0 + (Math.atan2(alvo.y - cam.p.y, Math.hypot(dx, dz)) - p0) * Math.min(1, e * 1.6); aplicar(cam);
      if (u > 0.72) pix.classList.add("on"); if (u >= 1) { chuva(); return true; } }; }
  function chuva() { const c = pix.querySelector("canvas"), g = c.getContext("2d"); c.width = innerWidth; c.height = innerHeight; const cols = Math.ceil(innerWidth / 14), ys = Array.from({ length: cols }, () => -Math.random() * innerHeight);
    let n = 0; const passo = () => { g.fillStyle = "rgba(6,4,18,.18)"; g.fillRect(0, 0, c.width, c.height);
      for (let i = 0; i < cols; i++) { g.fillStyle = i % 5 === 0 ? "#ff3ea5" : i % 3 === 0 ? "#3ee8ff" : "#7a8cff"; g.fillRect(i * 14, ys[i], 3, 18); ys[i] += 18 + (i % 7) * 3; if (ys[i] > c.height) ys[i] = -Math.random() * 200; }
      if (++n < 70) requestAnimationFrame(passo); else location.href = "/neon/?de=pavilhao"; };
    passo(); }
  telaBtn.addEventListener("click", atravessar);

  /* ---------- o controle pelo celular ---------- */
  function estado() { const s = paradas[aqui]; const ac = paradas.map((x, k) => ({ id: "sala:" + k, t: x.mat.nome, sub: k === aqui ? "você está aqui" : "" }));
    if (s) [...s.quadros].reverse().forEach((a) => a && ac.unshift({ id: "abrir:" + a.k + ":" + a.j, t: a.ic ? "Ler: Iniciação Científica" : a.nome, sub: a.ic ? "o que significou" : "abrir a atividade" }));
    if (s && s.ic) ac.push({ id: "tela", t: "Entrar na tela", sub: "vai para o futuro" });
    return { id: s ? s.mat.id : "pavilhao", title: s ? s.mat.nome : "Pavilhão SESI SENAI", sub: "Pavilhão", g: "Pavilhão SESI SENAI", panel: !!aberto, acoes: modo === "sala" ? ac : [] }; }
  function fazer(id) { const [k, a, b] = id.split(":"); if (k === "sala") irSala(+a); else if (k === "abrir") { const al = alvos.find((x) => x.k === +a && x.j === +b); if (al) abrir(al); } else if (k === "tela") atravessar(); }
  M2.fazer = fazer; M2.estado = estado;

  /* ---------- tamanho da tela ---------- */
  function resize() { const w = FILME ? 1920 : innerWidth, h = FILME ? 1080 : innerHeight; renderer.setSize(w, h, false); camera.aspect = w / h; camera.fov = camera.aspect < 0.8 ? 66 : 50; camera.updateProjectionMatrix(); curvaChegada = null; }
  addEventListener("resize", resize);

  /* ---------- começar ---------- */
  const folga = () => new Promise((r) => setTimeout(r, 0));
  async function prepararGPU() { const tx = new Set(); scene.traverse((o) => { for (const m of [].concat(o.material || [])) for (const k in m) { const v = m[k]; if (v && v.isTexture && v.image) tx.add(v); } });
    let n = 0; for (const t of tx) { try { renderer.initTexture(t); } catch (e) { /* segue */ } if (++n % 2 === 0) await folga(); }
    try { renderer.compile(scene, camera); } catch (e) { /* segue */ }
    const gl = renderer.getContext(), ext = gl.getExtension("KHR_parallel_shader_compile");
    if (ext) { const t1 = performance.now(); while (performance.now() - t1 < 20000 && renderer.info.programs.some((p) => !gl.getProgramParameter(p.program, ext.COMPLETION_STATUS_KHR))) await new Promise((r) => setTimeout(r, 40)); } }
  const desenhar = () => { cortar(); renderer.render(scene, camera); };
  const filme = document.getElementById("filme");
  const clock = new T.Clock(); let pronto = false, last = 0;
  function comecarSala(k) { modo = "sala"; aqui = k; const p = pose(k); cam.p.copy(p.p); cam.yaw = p.yaw; cam.pitch = p.pitch; aplicar(cam); ui();
    if (window.Ponte) Ponte.iniciar({ estado, fazer, fechar, rolar: (dy) => { const c = painel.querySelector(".corpo"); if (c) c.scrollBy(0, dy); } }); }
  (async () => {
    resize();
    let videoAcabou = !filme || FILME || Q.has("sala");
    if (filme && !videoAcabou) {
      const fimVideo = () => { videoAcabou = true; };
      filme.addEventListener("ended", fimVideo); filme.addEventListener("error", fimVideo); const ult = filme.querySelector("source:last-of-type"); if (ult) ult.addEventListener("error", fimVideo);
      const tocar = () => filme.play().then(() => { filme.classList.add("on"); setTimeout(() => veu.classList.add("fim"), 60); }).catch(fimVideo);
      if (filme.readyState >= 3) tocar(); else filme.addEventListener("canplay", tocar, { once: true });
      setTimeout(() => { if (!filme.classList.contains("on")) fimVideo(); }, 6000);
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
    if (pronto) { if (saida) { U.uT.value = t; if (saida(t, dt)) saida = null; } else tick(t, dt); desenhar(); } requestAnimationFrame(frame); }
  if (!FILME) frame();
})();
