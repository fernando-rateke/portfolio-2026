/* Ato 2: o Pavilhão SESI SENAI. Um salão branco e redondo (modelo pronto: "White round exhibition gallery", de
   Christy Hsu, CC BY) sobre um espelho d'água, na hora azul. A câmera chega do céu da porta e desce pelo círculo aberto do
   teto; as linhas do prédio se acendem em azul e laranja (as cores do SESI SENAI) e o prédio se materializa.
   Lá dentro, cinco salas em volta do centro, uma por matéria, cada uma com exatamente duas atividades em painéis de luz
   (os dados ficam em atividades.json). A planta, embaixo à esquerda, leva de uma sala a outra; o celular também.
   Da sala do Técnico, "Entrar na tela" leva ao Ato 3 (a cidade neon). Leve: poucas luzes, nada é desenhado enquanto
   carrega, shaders compilados em paralelo. */
(() => {
  const T = THREE, Q = new URLSearchParams(location.search);
  const M2 = (window.PAVILHAO = {}); // para testes e para o controle
  const V3 = (x, y, z) => new T.Vector3(x, y, z);
  const canvas = document.getElementById("c");
  const renderer = new T.WebGLRenderer({ canvas, antialias: true, powerPreference: "high-performance" });
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1)); renderer.outputEncoding = T.sRGBEncoding;
  renderer.toneMapping = T.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05; renderer.debug.checkShaderErrors = Q.has("debug");
  const scene = new T.Scene(), camera = new T.PerspectiveCamera(52, 1, 0.1, 900);
  const resize = () => { renderer.setSize(innerWidth, innerHeight, false); camera.aspect = innerWidth / innerHeight; camera.fov = camera.aspect < 0.8 ? 68 : 52; camera.updateProjectionMatrix(); };
  addEventListener("resize", resize); resize();
  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const tex = (w, h, fn) => { const c = document.createElement("canvas"); c.width = w; c.height = h; fn(c.getContext("2d"), w, h); const t = new T.CanvasTexture(c); t.encoding = T.sRGBEncoding; t.anisotropy = 4; return t; };
  const AZUL = "#0a84ff", LARANJA = "#ff8a1c";
  const U = { uT: { value: 0 } };

  /* ---------- o céu da hora azul (o mesmo da porta) e o reflexo dele em tudo ---------- */
  const ceu = tex(2048, 1024, (c, w, h) => {
    const g = c.createLinearGradient(0, 0, 0, h); g.addColorStop(0, "#070a22"); g.addColorStop(0.28, "#1c2464"); g.addColorStop(0.43, "#5a5cb8"); g.addColorStop(0.49, "#d77a8a");
    g.addColorStop(0.5, "#ff9a5a"); g.addColorStop(0.52, "#6a4a78"); g.addColorStop(1, "#05060f"); c.fillStyle = g; c.fillRect(0, 0, w, h);
    let s = 7; const r = () => (s = (s * 16807) % 2147483647) / 2147483647;
    for (let i = 0; i < 900; i++) { const y = r() * h * 0.36; c.fillStyle = `rgba(255,255,255,${0.2 + r() * 0.7})`; c.fillRect(r() * w, y, 1.2, 1.2); }
    // um mar de nuvens logo abaixo do horizonte, iluminado de laranja
    for (let i = 0; i < 260; i++) { const x = r() * w, y = h * (0.5 + r() * 0.035), rr = 30 + r() * 90; const gr = c.createRadialGradient(x, y, 0, x, y, rr);
      gr.addColorStop(0, `rgba(255,${170 + (r() * 50) | 0},${140 + (r() * 40) | 0},0.32)`); gr.addColorStop(1, "rgba(255,180,150,0)"); c.fillStyle = gr; c.fillRect(x - rr, y - rr, rr * 2, rr * 2); } });
  ceu.mapping = T.EquirectangularReflectionMapping; scene.background = ceu;
  const pm = new T.PMREMGenerator(renderer); scene.environment = pm.fromEquirectangular(ceu).texture;
  scene.fog = new T.FogExp2("#2a2c68", 0.0042);
  const hemi = new T.HemisphereLight("#cfd8ff", "#40304a", 0.9); scene.add(hemi);
  const sol = new T.DirectionalLight("#ffc89a", 0.9); sol.position.set(-40, 30, 60); scene.add(sol);

  /* ---------- o espelho d'água em volta do prédio ---------- */
  const ondas = tex(512, 512, (c, w, h) => { const d = c.createImageData(w, h); for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const i = (y * w + x) * 4;
      const a = Math.sin(x * 0.07 + Math.sin(y * 0.05) * 2) * 0.5 + Math.sin((x + y) * 0.11) * 0.3 + Math.sin(y * 0.19 - x * 0.03) * 0.2;
      const b = Math.cos(y * 0.06 + Math.sin(x * 0.04) * 2) * 0.5 + Math.cos((x - y) * 0.09) * 0.3;
      d.data[i] = 128 + a * 50; d.data[i + 1] = 128 + b * 50; d.data[i + 2] = 255; d.data[i + 3] = 255; } c.putImageData(d, 0, 0); });
  ondas.encoding = T.LinearEncoding; ondas.wrapS = ondas.wrapT = T.RepeatWrapping; ondas.repeat.set(30, 30);
  const agua = new T.Mesh(new T.CircleGeometry(420, 64), new T.MeshStandardMaterial({ color: "#151a3a", metalness: 0.9, roughness: 0.08, normalMap: ondas, normalScale: new T.Vector2(0.35, 0.35), envMapIntensity: 1.1 }));
  agua.rotation.x = -Math.PI / 2; scene.add(agua);

  /* ---------- carregamento: a página abre já no céu da porta; nada é desenhado até estar tudo pronto ---------- */
  const veu = document.getElementById("veu"), barra = veu.querySelector(".linha i");
  T.DefaultLoadingManager.onProgress = (u, a, b) => { barra.style.width = ((a / Math.max(b, 1)) * 100).toFixed(0) + "%"; };
  const loader = new T.GLTFLoader(); if (window.MeshoptDecoder) loader.setMeshoptDecoder(window.MeshoptDecoder);
  const carregar = (u) => new Promise((ok) => loader.load(u, (g) => ok(g.scene), undefined, () => ok(null)));
  let pronto = false;

  /* ---------- o prédio e as cinco salas ---------- */
  const salas = [], alvos = [], linhas = [], solidos = [];
  let chao = 0, raioParede = 18, centro = V3(0, 0, 0);
  async function montar() {
    const [g, dados] = await Promise.all([carregar("/pavilhao/modelos/galeria.glb"), fetch("/pavilhao/atividades.json").then((r) => r.json()).catch(() => ({ materias: [] }))]);
    if (g) {
      g.updateMatrixWorld(true);
      g.traverse((o) => { if (!o.isMesh) return; const m = o.material; const lum = m.emissive && m.emissive.r > 0.5;
        o.material = lum ? new T.MeshBasicMaterial({ color: "#fff6ea", transparent: true }) : new T.MeshStandardMaterial({ color: "#f4f4f6", roughness: 0.38, metalness: 0, envMapIntensity: 0.9, transparent: true });
        solidos.push(o.material);
        // as linhas do prédio que se acendem na chegada, antes de ele se materializar
        const ln = new T.LineSegments(new T.EdgesGeometry(o.geometry, 24), new T.LineBasicMaterial({ color: linhas.length % 2 ? AZUL : LARANJA, transparent: true, opacity: 0, fog: false }));
        o.add(ln); linhas.push(ln.material); });
      scene.add(g);
      // o chão e a parede: medidos no próprio modelo
      const rc = new T.Raycaster(); // (o raio sai de dentro do salão, abaixo do teto, e desce até o piso)
      const bb = new T.Box3().setFromObject(g); rc.set(V3(8, bb.min.y + 4, 0), V3(0, -1, 0)); const hc = rc.intersectObject(g, true).find((h) => h.face && h.face.normal.y > 0.3); chao = hc ? hc.point.y : bb.min.y;
      // a parede: o primeiro obstáculo a mais de 10 m do centro (as colunas do meio não contam)
      const rs = []; for (const ang of [0, 1.3, 2.6, 3.9, 5.2]) { rc.set(V3(0, chao + 2, 0), V3(Math.cos(ang), 0, Math.sin(ang))); const hp = rc.intersectObject(g, true).find((h) => h.distance > 10); if (hp) rs.push(hp.distance); }
      raioParede = rs.length ? Math.min(...rs) : Math.max(12, (bb.max.x - bb.min.x) / 2 - 2);
      console.log("pavilhao: chao", chao.toFixed(2), "parede", raioParede.toFixed(2));
      agua.position.y = new T.Box3().setFromObject(g).min.y - 0.02;
    }
    centro.set(0, chao, 0);
    // o centro: um espelho d'água redondo e a escultura de luz (bastões que ondulam devagar, num desenho só)
    const espelho = new T.Mesh(new T.CircleGeometry(4.2, 64), new T.MeshStandardMaterial({ color: "#0d1430", metalness: 1, roughness: 0.05, normalMap: ondas, normalScale: new T.Vector2(0.12, 0.12), envMapIntensity: 1.3 }));
    espelho.rotation.x = -Math.PI / 2; espelho.position.set(0, chao + 0.03, 0); scene.add(espelho);
    const borda = new T.Mesh(new T.TorusGeometry(4.25, 0.05, 8, 96), new T.MeshBasicMaterial({ color: AZUL })); borda.rotation.x = Math.PI / 2; borda.position.set(0, chao + 0.06, 0); scene.add(borda);
    { const N = 180, geo = new T.BoxGeometry(0.035, 1, 0.035); geo.translate(0, -0.5, 0);
      const m = new T.MeshBasicMaterial({ color: "#ffffff", fog: false }); const cor = new T.Color();
      m.onBeforeCompile = (sh) => { sh.uniforms.uT = U.uT; sh.vertexShader = "uniform float uT;\n" + sh.vertexShader.replace("#include <begin_vertex>", `#include <begin_vertex>
        vec4 b = instanceMatrix * vec4(0., 0., 0., 1.); float a = atan(b.z, b.x); transformed.y *= 1. + 0.35 * sin(uT * 0.9 + a * 3.) ;`); };
      const im = new T.InstancedMesh(geo, m, N), M4 = new T.Matrix4();
      for (let i = 0; i < N; i++) { const a = (i / N) * Math.PI * 2, r = 2.6 + (i % 3) * 0.45, L = 2.2 + Math.sin(a * 5) * 0.8;
        M4.makeScale(1, L, 1).setPosition(Math.cos(a) * r, chao + 9.5, Math.sin(a) * r); im.setMatrixAt(i, M4); im.setColorAt(i, cor.set(i % 4 === 0 ? LARANJA : i % 4 === 2 ? AZUL : "#ffffff")); }
      scene.add(im); }
    // as salas: cinco nichos em volta, de frente para o centro
    const mats = (dados.materias || []).slice(0, 5);
    mats.forEach((mat, k) => salas.push(sala(mat, k, mats.length)));
    await Promise.all(salas.map((s) => s.pronta));
  }
  function sala(mat, k, n) {
    const a = -Math.PI / 2 + (k / n) * Math.PI * 2, R = raioParede - 0.9, cor = mat.cor || AZUL;
    const grp = new T.Group(); grp.position.set(Math.cos(a) * R, chao, Math.sin(a) * R); grp.lookAt(0, chao, 0); scene.add(grp);
    // o fundo curvo, a faixa de luz na cor da sala e o nome
    // (no grupo, +z aponta para o centro do salão: o fundo é um pedaço de cilindro em volta do centro, visto por dentro)
    const arco = 7.6 / R, fundo = new T.Mesh(new T.CylinderGeometry(R + 0.35, R + 0.35, 4.6, 32, 1, true, Math.PI - arco / 2, arco), new T.MeshStandardMaterial({ color: "#fbfbfd", roughness: 0.6, side: T.BackSide }));
    fundo.position.set(0, 2.3, R); grp.add(fundo);
    for (const y of [0.05, 4.62]) { const f = new T.Mesh(new T.BoxGeometry(7.4, 0.05, 0.05), new T.MeshBasicMaterial({ color: cor })); f.position.set(0, y, 0.12); grp.add(f); }
    const brilho = new T.Mesh(new T.PlaneGeometry(7.6, 2.2), new T.MeshBasicMaterial({ map: tex(16, 128, (c, w, h) => { const g = c.createLinearGradient(0, h, 0, 0); g.addColorStop(0, cor); g.addColorStop(1, "rgba(0,0,0,0)"); c.fillStyle = g; c.fillRect(0, 0, w, h); }),
      transparent: true, opacity: 0.35, blending: T.AdditiveBlending, depthWrite: false, fog: false })); brilho.position.set(0, 1.1, 0.08); grp.add(brilho);
    const titulo = new T.Mesh(new T.PlaneGeometry(6, 1.0), new T.MeshBasicMaterial({ transparent: true, map: tex(1200, 200, (c, w, h) => {
      c.fillStyle = cor; c.font = "700 46px 'Geist Mono', ui-monospace, monospace"; c.fillText(String(k + 1).padStart(2, "0") + " · " + (mat.sigla || ""), 8, 52);
      c.fillStyle = "#1a2040"; c.font = "800 104px 'Archivo', 'Inter', system-ui, sans-serif"; c.fillText(mat.nome || "", 4, 170); }), depthWrite: false }));
    titulo.position.set(0, 3.95, 0.1); grp.add(titulo);
    // as duas atividades: painéis de luz que flutuam um pouco à frente do fundo
    const acts = (mat.atividades || []).slice(0, 2), paineis = [];
    const pronta = Promise.all(acts.map((at, j) => new Promise((ok) => {
      const p = new T.Group(); p.position.set(j ? 1.95 : -1.95, 2.0, 0.95); p.rotation.y = j ? -0.12 : 0.12; grp.add(p);
      const moldura = new T.Mesh(new T.PlaneGeometry(3.25, 2.12), new T.MeshBasicMaterial({ color: cor, transparent: true, opacity: 0.9 })); moldura.position.z = -0.01; p.add(moldura);
      const tela = new T.Mesh(new T.PlaneGeometry(3.15, 2.02), new T.MeshBasicMaterial({ color: "#ffffff", toneMapped: false })); p.add(tela);
      const desenhar = (img) => tex(960, 616, (c, w, h) => { c.fillStyle = "#0c1230"; c.fillRect(0, 0, w, h);
        if (img) { const s = Math.max(w / img.width, (h - 120) / img.height), iw = img.width * s, ih = img.height * s; c.drawImage(img, (w - iw) / 2, (h - 120 - ih) / 2, iw, ih); }
        else { const g = c.createLinearGradient(0, 0, w, h); g.addColorStop(0, "#101a4a"); g.addColorStop(1, cor); c.fillStyle = g; c.globalAlpha = 0.55; c.fillRect(0, 0, w, h - 120); c.globalAlpha = 1;
          c.strokeStyle = "rgba(255,255,255,.16)"; c.lineWidth = 2; for (let x = 0; x < w; x += 48) { c.beginPath(); c.moveTo(x, 0); c.lineTo(x, h - 120); c.stroke(); } for (let y = 0; y < h - 120; y += 48) { c.beginPath(); c.moveTo(0, y); c.lineTo(w, y); c.stroke(); } }
        c.fillStyle = "rgba(8,12,34,.92)"; c.fillRect(0, h - 120, w, 120); c.fillStyle = cor; c.fillRect(0, h - 120, w, 6);
        c.fillStyle = "#ffffff"; c.font = "800 40px 'Archivo', system-ui, sans-serif"; let t = at.titulo || ""; while (c.measureText(t).width > w - 60 && t.length > 4) t = t.slice(0, -2); c.fillText(t === at.titulo ? t : t + "…", 30, h - 64);
        c.fillStyle = "rgba(255,255,255,.65)"; c.font = "500 24px 'Geist Mono', monospace"; c.fillText((at.subtitulo || mat.nome || "").slice(0, 60), 30, h - 26); });
      const pronto = (t) => { tela.material.map = t; tela.material.needsUpdate = true; ok(); };
      if (at.imagem) { const im = new Image(); im.crossOrigin = "anonymous"; im.onload = () => pronto(desenhar(im)); im.onerror = () => pronto(desenhar(null)); im.src = at.imagem; } else pronto(desenhar(null));
      const alvo = { obj: p, mat, at, k, j, nome: at.titulo }; alvos.push(alvo); paineis.push({ p, y0: 2.0, fase: k * 1.3 + j * 2.1 });
    })));
    // de onde a câmera olha a sala: no meio do caminho entre o centro e o fundo, um pouco de lado do centro
    const olho = V3(Math.cos(a) * (R - 6.8), chao + 1.68, Math.sin(a) * (R - 6.8)), mira = V3(Math.cos(a) * R, chao + 2.0, Math.sin(a) * R);
    return { mat, k, a, grp, olho, mira, paineis, pronta };
  }

  /* ---------- a câmera: chegada pelo céu, voltas em arco entre as salas ---------- */
  let modo = "chegada", aqui = -1, mov = null, t0 = 0, mx = 0, my = 0;
  const ponto = { o: V3(), m: V3() };
  addEventListener("pointermove", (e) => { if (e.pointerType === "mouse") { mx = e.clientX / innerWidth - 0.5; my = e.clientY / innerHeight - 0.5; } });
  function irSala(k) { if (!salas[k] || mov || modo === "chegada") return; fechar(); const s = salas[k];
    const de = { o: camera.position.clone(), m: ponto.m.clone() }, para = { o: s.olho, m: s.mira };
    // anda em arco por perto do centro, sem atravessar o espelho d'água
    const ra = Math.atan2(de.o.z, de.o.x), rb = s.a; let da = rb - ra; while (da > Math.PI) da -= Math.PI * 2; while (da < -Math.PI) da += Math.PI * 2;
    const r0 = Math.hypot(de.o.x, de.o.z), r1 = Math.hypot(para.o.x, para.o.z);
    mov = { de, para, ra, da, r0, r1, t: null, dur: 1.6 + Math.abs(da) * 0.9, fim: () => { aqui = k; ui(); } }; modo = "andando"; }
  M2.irSala = irSala;
  const suave = (u) => (u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2);
  function tick(t) {
    if (modo === "chegada") {
      // descendo do céu pelo círculo aberto do teto, olhando para baixo e depois para a primeira sala
      const u = Math.min(1, (t - t0) / 8.5), e = suave(u), s0 = salas[0];
      const alto = V3(0, chao + 95, 30), dentro = V3(0, chao + 6, 0), fim = s0 ? s0.olho : V3(0, chao + 1.7, 5);
      const p = u < 0.62 ? alto.clone().lerp(dentro, suave(u / 0.62)) : dentro.clone().lerp(fim, suave((u - 0.62) / 0.38));
      const alvo = u < 0.55 ? V3(0, chao, 0) : V3(0, chao, 0).lerp(s0 ? s0.mira : V3(0, chao + 2, -10), suave((u - 0.55) / 0.45));
      camera.position.copy(p); camera.lookAt(alvo); ponto.m.copy(alvo);
      // as linhas se acendem primeiro; o prédio sólido aparece depois
      const lv = Math.min(1, u / 0.25) * (1 - Math.max(0, (u - 0.55) / 0.3)); for (const m of linhas) m.opacity = Math.max(0, lv) * 0.9;
      const sv = Math.max(0, Math.min(1, (u - 0.28) / 0.3)); for (const m of solidos) m.opacity = sv;
      if (u >= 1) { for (const m of solidos) { m.transparent = false; m.opacity = 1; m.needsUpdate = true; } for (const m of linhas) m.opacity = 0; modo = "sala"; aqui = 0; ui(); }
    } else if (mov) {
      if (mov.t == null) mov.t = t; const u = Math.min(1, (t - mov.t) / mov.dur), e = suave(u);
      const ang = mov.ra + mov.da * e, r = mov.r0 + (mov.r1 - mov.r0) * e - Math.sin(e * Math.PI) * 2.2;
      camera.position.set(Math.cos(ang) * r, chao + 1.68 + Math.sin(e * Math.PI) * 0.6, Math.sin(ang) * r);
      ponto.m.copy(mov.de.m).lerp(mov.para.m, e); camera.lookAt(ponto.m);
      if (u >= 1) { const f = mov.fim; mov = null; modo = "sala"; f(); }
    } else if (aqui >= 0) {
      const s = salas[aqui]; camera.position.copy(s.olho); camera.position.y += Math.sin(t * 0.4) * 0.02;
      const d = s.mira.clone().sub(s.olho); d.applyAxisAngle(V3(0, 1, 0), -mx * 0.3); d.y -= my * 0.18 * d.length(); ponto.m.copy(s.olho).add(d); camera.lookAt(ponto.m);
    }
    U.uT.value = t; ondas.offset.set(t * 0.004, t * 0.003);
    for (const s of salas) for (const p of s.paineis) p.p.position.y = p.y0 + Math.sin(t * 0.8 + p.fase) * 0.05;
    rotulos();
  }

  /* ---------- os nomes em cima dos painéis, a planta e o painel da atividade ---------- */
  const camada = document.getElementById("rotulos"), pv = new T.Vector3();
  const rots = []; function criarRotulos() { for (const a of alvos) { const b = document.createElement("button"); b.type = "button"; b.className = "rot"; b.textContent = "Abrir";  b.setAttribute("aria-label", "Abrir: " + a.nome); b.addEventListener("click", () => abrir(a)); camada.appendChild(b); rots.push({ a, b }); } }
  function rotulos() { for (const r of rots) { r.a.obj.getWorldPosition(pv); pv.y -= 1.28; // embaixo do painel (em cima ficaria por cima do nome da sala) const d = pv.distanceTo(camera.position); pv.project(camera);
      const ver = modo === "sala" && aqui === r.a.k && pv.z < 1 && Math.abs(pv.x) < 1 && Math.abs(pv.y) < 1 && d < 16 && !aberto;
      r.b.style.transform = `translate(${((pv.x * 0.5 + 0.5) * innerWidth).toFixed(1)}px, ${((-pv.y * 0.5 + 0.5) * innerHeight).toFixed(1)}px) translate(-50%, 0)`; r.b.classList.toggle("on", ver); } }
  const planta = document.getElementById("planta"), nomeSala = document.getElementById("sala"), telaBtn = document.getElementById("tela");
  function desenharPlanta() {
    const n = salas.length, R = 44, svg = [`<svg viewBox="-60 -60 120 120" aria-hidden="true"><circle r="52" fill="none" stroke="rgba(160,190,255,.35)" stroke-width="1"/><circle r="12" fill="none" stroke="rgba(160,190,255,.55)" stroke-width="1"/>`];
    salas.forEach((s, k) => { const x = Math.cos(s.a) * R, y = Math.sin(s.a) * R; svg.push(`<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="7" class="pt" data-k="${k}"/>`); });
    svg.push("</svg>");
    planta.innerHTML = svg.join("") + `<div class="nomes">${salas.map((s, k) => `<button type="button" data-k="${k}"><i>${String(k + 1).padStart(2, "0")}</i>${esc(s.mat.nome)}</button>`).join("")}</div>`;
    planta.querySelectorAll("[data-k]").forEach((el) => el.addEventListener("click", () => irSala(+el.dataset.k)));
  }
  function ui() { const s = salas[aqui];
    nomeSala.innerHTML = s ? `<small>${String(aqui + 1).padStart(2, "0")} de ${salas.length} · ${esc(s.mat.sigla || "")}</small>${esc(s.mat.nome)}` : "";
    nomeSala.style.setProperty("--cor", s ? s.mat.cor : AZUL);
    planta.querySelectorAll("[data-k]").forEach((el) => el.classList.toggle("on", +el.dataset.k === aqui));
    telaBtn.classList.toggle("on", !!s && s.mat.id === "tecnico" && modo === "sala");
    document.body.classList.toggle("chegando", modo === "chegada"); }
  // o painel: um vidro claro, com a cor da sala; campos vazios aparecem como "em breve"
  const painel = document.getElementById("painel"); let aberto = null;
  function abrir(a) { aberto = a; const at = a.at, cor = a.mat.cor || AZUL, vazio = `<p class="breve">Em breve.</p>`;
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
  addEventListener("keydown", (e) => { if (e.key === "Escape") return fechar(); if (aberto || modo === "chegada") return;
    if (["ArrowRight", "ArrowDown", "PageDown"].includes(e.key)) irSala((aqui + 1) % salas.length); else if (["ArrowLeft", "ArrowUp", "PageUp"].includes(e.key)) irSala((aqui - 1 + salas.length) % salas.length); });
  // tocar num painel de luz abre a atividade
  const rc = new T.Raycaster(), pt = new T.Vector2(); let down = null;
  canvas.addEventListener("pointerdown", (e) => { down = [e.clientX, e.clientY]; });
  canvas.addEventListener("pointerup", (e) => { if (!down || Math.hypot(e.clientX - down[0], e.clientY - down[1]) > 10 || modo !== "sala") return; pt.set((e.clientX / innerWidth) * 2 - 1, -(e.clientY / innerHeight) * 2 + 1); rc.setFromCamera(pt, camera);
    let melhor = null, dm = 1e9; for (const a of alvos) { const h = rc.intersectObject(a.obj, true)[0]; if (h && h.distance < dm) { dm = h.distance; melhor = a; } } if (melhor) { if (melhor.k !== aqui) irSala(melhor.k); else abrir(melhor); } });

  /* ---------- da sala do Técnico para a cidade neon: a câmera entra na tela ---------- */
  const pix = document.getElementById("pixels");
  function entrarNaTela() { if (modo !== "sala" || !salas[aqui] || salas[aqui].mat.id !== "tecnico") return; fechar(); modo = "saindo"; ui();
    const s = salas[aqui], alvo = s.paineis[1] || s.paineis[0], w = new T.Vector3(); alvo.p.getWorldPosition(w);
    const de = camera.position.clone(), para = w.clone().lerp(s.olho, 0.12); let ti = null;
    const voar = (t) => { if (ti == null) ti = t; const u = Math.min(1, (t - ti) / 2.4), e = suave(u); camera.position.copy(de).lerp(para, e); camera.lookAt(w); if (u > 0.7) pix.classList.add("on"); if (u >= 1) { chuva(); return true; } };
    saida = voar; }
  let saida = null;
  // os pixels da tela se desfazem e caem como chuva; quando assenta, a página da cidade neon abre
  function chuva() { const c = pix.querySelector("canvas"), g = c.getContext("2d"); c.width = innerWidth; c.height = innerHeight; const cols = Math.ceil(innerWidth / 14), ys = Array.from({ length: cols }, () => -Math.random() * innerHeight);
    let n = 0; const passo = () => { g.fillStyle = "rgba(6,4,18,.18)"; g.fillRect(0, 0, c.width, c.height);
      for (let i = 0; i < cols; i++) { const cor = i % 5 === 0 ? "#ff3ea5" : i % 3 === 0 ? "#3ee8ff" : "#7a8cff"; g.fillStyle = cor; g.fillRect(i * 14, ys[i], 3, 18); ys[i] += 18 + (i % 7) * 3; if (ys[i] > c.height) ys[i] = -Math.random() * 200; }
      if (++n < 120) requestAnimationFrame(passo); else location.href = "/neon/?de=pavilhao"; };
    passo(); }
  telaBtn.addEventListener("click", entrarNaTela);

  /* ---------- o controle pelo celular ---------- */
  function estado() { const s = salas[aqui]; const ac = salas.map((x, k) => ({ id: "sala:" + k, t: x.mat.nome, sub: k === aqui ? "você está aqui" : "" }));
    if (s) s.paineis.forEach((p, j) => { const a = alvos.find((x) => x.k === aqui && x.j === j); if (a) ac.unshift({ id: "abrir:" + aqui + ":" + j, t: a.nome, sub: "abrir a atividade" }); });
    if (s && s.mat.id === "tecnico") ac.push({ id: "tela", t: "Entrar na tela", sub: "vai para o futuro" });
    return { id: s ? s.mat.id : "pavilhao", title: s ? s.mat.nome : "O Pavilhão", sub: "Pavilhão", g: "O Pavilhão", panel: !!aberto, acoes: modo === "chegada" ? [] : ac }; }
  function fazer(id) { const [k, a, b] = id.split(":"); if (k === "sala") irSala(+a); else if (k === "abrir") { const al = alvos.find((x) => x.k === +a && x.j === +b); if (al) abrir(al); } else if (k === "tela") entrarNaTela(); }
  M2.fazer = fazer; M2.estado = estado;

  /* ---------- começar ---------- */
  const folga = () => new Promise((r) => setTimeout(r, 0));
  async function prepararGPU() { const tx = new Set(); scene.traverse((o) => { for (const m of [].concat(o.material || [])) for (const k in m) { const v = m[k]; if (v && v.isTexture && v.image) tx.add(v); } });
    let n = 0; for (const t of tx) { try { renderer.initTexture(t); } catch (e) { /* segue */ } if (++n % 3 === 0) await folga(); }
    try { renderer.compile(scene, camera); } catch (e) { /* segue */ }
    const gl = renderer.getContext(), ext = gl.getExtension("KHR_parallel_shader_compile");
    if (ext) { const t1 = performance.now(); while (performance.now() - t1 < 20000 && renderer.info.programs.some((p) => !gl.getProgramParameter(p.program, ext.COMPLETION_STATUS_KHR))) await new Promise((r) => setTimeout(r, 40)); } }
  const clock = new T.Clock();
  (async () => {
    await montar(); criarRotulos(); desenharPlanta();
    camera.position.set(0, chao + 95, 30); camera.lookAt(0, chao, 0);
    await prepararGPU(); pronto = true; window.pavilhaoPronto = true;
    t0 = clock.getElapsedTime(); if (Q.has("sala")) { modo = "sala"; aqui = Math.max(0, Math.min(salas.length - 1, +Q.get("sala") || 0)); for (const m of solidos) { m.transparent = false; m.opacity = 1; m.needsUpdate = true; } }
    ui(); veu.classList.add("fim");
    if (window.Ponte) Ponte.iniciar({ estado, fazer, fechar, rolar: (dy) => { const c = painel.querySelector(".corpo"); if (c) c.scrollBy(0, dy); } });
  })();
  function frame() { const t = clock.getElapsedTime(); if (pronto) { if (saida) { if (saida(t)) saida = null; } else tick(t); renderer.render(scene, camera); } requestAnimationFrame(frame); }
  frame();
})();
